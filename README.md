# Multi-Agent Deal Review Pipeline

A multi-agent system that reviews a financial deal document against a compliance policy
and produces an evidence-backed report: extracted terms, a compliance matrix, a
prioritized risk register, and an executive summary — with every claim traceable back
to a clause in the source document.

Architecture diagram: [`docs/architecture.svg`](docs/architecture.svg)

## Agents

| Agent | Type | Role |
|---|---|---|
| Ingestion | deterministic | Parses PDF/DOCX/MD/TXT, OCRs scanned pages and embedded images (Tesseract), builds a numbered clause index |
| Term Extraction | LLM | Extracts parties, value, dates, rates, obligations, covenants, collateral, exclusions, conditions — every term cites a clause + verbatim quote |
| Evidence Verification | deterministic | Checks every cited quote actually exists (verbatim or fuzzy-matched) in the cited clause; triggers one extraction retry if too many citations fail |
| Compliance Review | LLM, fanned out | Checks extracted terms against the policy rule set, batched 5 rules per call, run in parallel; returns pass / fail / needs_human_review per rule with rationale + evidence |
| Risk & Summary | LLM | Prioritizes financial/legal/operational/compliance risks, flags gaps, writes the executive summary and follow-up actions |
| Escalation Gate | deterministic | Rule-based: unverified evidence, low confidence, critical risk, high-severity failure, or a declared gap → escalate for human review |
| Orchestrator | LangGraph runtime | Shared state, retries, parallel fan-out/join, error containment, and the live event stream that drives the UI |

## Repo layout

```
backend/            FastAPI + LangGraph pipeline
  deal_review/       agents, orchestration, ingestion, verification, report rendering
  rules/             compliance policy (YAML)
  samples/           synthetic normal + edge-case deal documents
  outputs/           sample run outputs (report.md + result.json)
  tests/             deterministic unit tests + end-to-end tests
frontend/           Next.js UI — upload, live agent timeline, final report
docs/                architecture.svg
```

## Setup

### Backend

```bash
cd backend
python -m venv .venv
.venv/Scripts/activate   # or `source .venv/bin/activate` on macOS/Linux
pip install -r requirements.txt
cp .env.example .env     # fill in GROQ_API_KEY (free, no card: console.groq.com/keys)
```

Tesseract OCR must also be installed on the machine (or use the provided `Dockerfile`,
which installs it): `apt install tesseract-ocr` / `brew install tesseract` / the
[Windows installer](https://github.com/UB-Mannheim/tesseract/wiki).

Run against a sample document from the command line (no server needed):

```bash
python -m deal_review samples/normal_loan.md
python -m deal_review samples/edge_case_loan.md
```

Or run the API server (used by the UI):

```bash
uvicorn deal_review.main:app --reload
```

### Frontend

```bash
cd frontend
npm install
cp .env.local.example .env.local   # point NEXT_PUBLIC_API_BASE at the backend
npm run dev
```

### Tests

```bash
cd backend
pytest                 # deterministic tests always run; LLM end-to-end tests
                        # auto-skip unless GROQ_API_KEY (or another provider key) is set
```

## LLM provider

Provider-agnostic by design — swap with one env var, no code changes:

```
LLM_PROVIDER=groq        # default: no credit card, generous free tier for agentic workloads
LLM_PROVIDER=openrouter  # fallback: many free (":free") models, tighter free-tier rate limits
LLM_PROVIDER=anthropic
LLM_PROVIDER=openai
```

## Assumptions

- Deal documents are contracts with **numbered clauses/sections** (the common case for
  loan/lending agreements). The clause index falls back to one pseudo-clause per
  paragraph when no numbering is detected, so the pipeline still runs — but citations
  are then paragraph-level rather than clause-level.
- All sample data is synthetic. No real financial or customer information is used
  anywhere in this repo.
- Single-tenant, no auth — this is an internal review tool, not a multi-user product.
- A "rule batch" of 5 is a size/latency/isolation tradeoff, not a hard requirement —
  tune `RULE_BATCH_SIZE` in `graph.py` for larger rule sets.

## Failure-handling strategy

- **Every LLM node has a `RetryPolicy`** (3 attempts, exponential backoff) for transient
  API/network failures.
- **A dead LLM node degrades the run instead of killing it**: compliance batches that
  error out are marked `needs_human_review` with the error recorded, not silently
  dropped; the risk/summary node falls back to a clear "manual review required" message
  rather than crashing the whole pipeline.
- **Extraction has one automatic retry**: if more than 20% of cited quotes fail
  verbatim/fuzzy verification against the source, the extraction agent is re-prompted
  once with the specific failed citations named, and continues either way (never
  infinite-loops).
- **The evidence verifier is deterministic Python, not another LLM call** — a citation
  either exists in the document or it doesn't; this is what prevents a plausible-sounding
  hallucination from reaching the report un-flagged.
- **The escalation gate is deterministic rules**, not an LLM judgment call, so the
  PASS/FAIL/HUMAN REVIEW banner is reproducible and auditable.
- Errors are captured into `state["errors"]` and surfaced in both the report and the UI
  as system warnings rather than causing an opaque 500.

## Limitations

- No vector store / RAG — deal documents are read in full into context. Fine for
  typical loan-agreement-length documents; a very long document (100+ pages) would need
  chunking, which is deliberately out of scope here.
- OCR (Tesseract) is used for scanned pages and embedded images; it is not perfect on
  skewed/low-quality scans. OCR'd evidence is flagged in ingestion notes, and low
  verification confidence flows through to the escalation gate — but OCR accuracy
  itself is not independently corrected.
- No authentication/multi-tenancy — not built for handling real confidential deal data
  as-is.
- No human-in-the-loop UI for actually resolving an escalation (approve/reject) — the
  pipeline surfaces what needs review; acting on it is manual today.
- Clause detection is heuristic (numbered-section pattern + blank-line-before-header
  check). It works well on standard contract formatting; a document with no numbering
  and no paragraph breaks would degrade to coarser, paragraph-level citations.

## Sample outputs

See [`backend/outputs/normal_loan/`](backend/outputs/normal_loan/) and
[`backend/outputs/edge_case_loan/`](backend/outputs/edge_case_loan/) for a full report
and structured JSON from each validation case, generated via
`python -m deal_review samples/<file>.md`.
