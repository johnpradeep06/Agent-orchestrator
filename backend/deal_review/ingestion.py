"""Turn an uploaded PDF/DOCX/Markdown/text file into (full_text, clause_index, page_map).

clause_index maps a clause id ("4.2") to its text span, so every downstream
citation can be checked against a real source instead of trusted blindly.
"""
import io
import re
from pathlib import Path

import pymupdf as fitz
import pytesseract
from docx import Document
from PIL import Image

# Matches common contract clause headers: "4.2 Interest Rate", "### 4.2 Interest Rate",
# "Section 4.2", "Article 4", "4.2.1 Sub-clause"
CLAUSE_RE = re.compile(
    r"^\s*#{0,4}\s*(?:(?:Section|Article|Clause)\s+)?(\d+(?:\.\d+){0,3})\b[.\s:-]*(.*)$",
    re.IGNORECASE,
)

MIN_TEXT_CHARS_PER_PAGE = 40  # below this, treat the page as image-only and OCR it
OCR_LOW_CONFIDENCE = 60  # tesseract mean word confidence threshold


def ocr_image(img: Image.Image) -> tuple[str, float]:
    data = pytesseract.image_to_data(img, output_type=pytesseract.Output.DICT)
    words, confs = [], []
    for text, conf in zip(data["text"], data["conf"]):
        text = text.strip()
        if text:
            words.append(text)
            try:
                c = float(conf)
                if c >= 0:
                    confs.append(c)
            except ValueError:
                pass
    mean_conf = sum(confs) / len(confs) if confs else 0.0
    return " ".join(words), mean_conf


def parse_pdf(data: bytes) -> tuple[str, dict[int, int], list[str]]:
    """Returns (full_text, {char_offset_line_index: page_number}, notes)."""
    notes: list[str] = []
    doc = fitz.open(stream=data, filetype="pdf")
    lines: list[str] = []
    line_pages: list[int] = []

    for page_index, page in enumerate(doc, start=1):
        page_text = page.get_text("text")

        if len(page_text.strip()) < MIN_TEXT_CHARS_PER_PAGE:
            # Likely a scanned page with no text layer -> OCR the whole page image.
            pix = page.get_pixmap(dpi=200)
            img = Image.open(io.BytesIO(pix.tobytes("png")))
            ocr_text, conf = ocr_image(img)
            if ocr_text.strip():
                notes.append(f"Page {page_index}: no text layer, OCR'd (confidence {conf:.0f}%).")
                page_text = ocr_text
                if conf < OCR_LOW_CONFIDENCE:
                    notes.append(
                        f"Page {page_index}: OCR confidence below {OCR_LOW_CONFIDENCE}% "
                        "— treat extracted content as low-confidence evidence."
                    )
            else:
                notes.append(f"Page {page_index}: no extractable text (image OCR returned nothing).")

        # OCR any embedded images too (diagrams/stamps/signature blocks that carry clause text).
        for img_index, img_info in enumerate(page.get_images(full=True)):
            try:
                xref = img_info[0]
                base = doc.extract_image(xref)
                img = Image.open(io.BytesIO(base["image"]))
                if img.width < 50 or img.height < 50:
                    continue  # skip icons/logos
                ocr_text, conf = ocr_image(img)
                if ocr_text.strip() and conf >= OCR_LOW_CONFIDENCE:
                    page_text += f"\n[Embedded image OCR, page {page_index}]: {ocr_text}\n"
                    notes.append(f"Page {page_index}: embedded image #{img_index} OCR'd (confidence {conf:.0f}%).")
            except Exception as e:  # pragma: no cover - defensive, malformed image streams
                notes.append(f"Page {page_index}: embedded image #{img_index} failed to OCR ({e}).")

        for line in page_text.splitlines():
            lines.append(line)
            line_pages.append(page_index)

    doc.close()
    return "\n".join(lines), dict(enumerate(line_pages)), notes


def parse_docx(data: bytes) -> tuple[str, list[str]]:
    doc = Document(io.BytesIO(data))
    lines: list[str] = []
    for para in doc.paragraphs:
        if para.text.strip():
            lines.append(para.text)
    for table in doc.tables:
        for row in table.rows:
            lines.append(" | ".join(cell.text.strip() for cell in row.cells))
    return "\n".join(lines), []


def parse_text(data: bytes) -> tuple[str, list[str]]:
    return data.decode("utf-8", errors="replace"), []


def load_document(filename: str, data: bytes) -> tuple[str, dict[int, int], list[str]]:
    suffix = Path(filename).suffix.lower()
    if suffix == ".pdf":
        return parse_pdf(data)
    if suffix == ".docx":
        text, notes = parse_docx(data)
        return text, {}, notes
    if suffix in (".md", ".txt"):
        text, notes = parse_text(data)
        return text, {}, notes
    raise ValueError(f"Unsupported file type: {suffix}. Supported: .pdf, .docx, .md, .txt")


def build_clause_index(
    full_text: str, line_pages: dict[int, int] | None = None
) -> tuple[dict[str, str], dict[str, int]]:
    """Split the document into clauses keyed by their number, e.g. '4.2' -> text."""
    lines = full_text.splitlines()
    line_pages = line_pages or {}

    headers: list[tuple[int, str]] = []  # (line_index, clause_id)
    for i, line in enumerate(lines):
        m = CLAUSE_RE.match(line)
        if not m:
            continue
        # A real clause header starts a new paragraph. A wrapped sentence continuation
        # (e.g. an address split across lines: "...facility\n4400 Industrial Parkway...")
        # does not, so requiring a blank line (or document start) before it filters those out.
        prev_blank = i == 0 or lines[i - 1].strip() == ""
        if not prev_blank:
            continue
        headers.append((i, m.group(1)))

    clause_index: dict[str, str] = {}
    page_map: dict[str, int] = {}

    if not headers:
        # No detectable clause numbering — fall back to one pseudo-clause per paragraph
        # so evidence verification still has something concrete to check against.
        for i, para in enumerate(full_text.split("\n\n")):
            if para.strip():
                cid = f"p{i+1}"
                clause_index[cid] = para.strip()
        return clause_index, page_map

    for idx, (start, cid) in enumerate(headers):
        end = headers[idx + 1][0] if idx + 1 < len(headers) else len(lines)
        text = "\n".join(lines[start:end]).strip()
        # A clause id can repeat (e.g. referenced again later) — keep the longer version.
        if cid not in clause_index or len(text) > len(clause_index[cid]):
            clause_index[cid] = text
            if start in line_pages:
                page_map[cid] = line_pages[start]

    return clause_index, page_map
