FROM python:3.12-slim

# tesseract-ocr: OCR for scanned pages / embedded images in PDFs
RUN apt-get update && apt-get install -y --no-install-recommends \
    tesseract-ocr \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY deal_review ./deal_review
COPY rules ./rules
COPY samples ./samples

ENV PORT=8000
EXPOSE 8000
CMD ["sh", "-c", "uvicorn deal_review.main:app --host 0.0.0.0 --port ${PORT}"]
