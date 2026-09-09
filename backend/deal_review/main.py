"""FastAPI app: upload a deal doc (+ optional rules), stream the live agent
timeline over SSE, and serve the final structured report."""
import asyncio
import io
import os
import traceback
import uuid
from pathlib import Path

import yaml
from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import PlainTextResponse, StreamingResponse

from . import events
from .db import Run, get_session, init_db
from .graph import GRAPH
from .ingestion import build_clause_index, load_document
from .report import render_markdown
from .state import Rule, seeded_initial_state

BUNDLED_RULES = Path(__file__).parent.parent / "rules" / "lending_policy.yaml"

app = FastAPI(title="Deal Review Pipeline")
app.add_middleware(
    CORSMiddleware,
    allow_origins=os.getenv("FRONTEND_ORIGIN", "*").split(","),
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def _startup():
    init_db()


@app.get("/health")
def health():
    return {"status": "ok"}


def _serialize(state: dict) -> dict:
    out = {}
    for k, v in state.items():
        if isinstance(v, list):
            out[k] = [item.model_dump(mode="json") if hasattr(item, "model_dump") else item for item in v]
        elif hasattr(v, "model_dump"):
            out[k] = v.model_dump(mode="json")
        else:
            out[k] = v
    return out


def _load_rules(data: bytes | None) -> list[Rule]:
    raw = yaml.safe_load(data) if data else yaml.safe_load(BUNDLED_RULES.read_text())
    return [Rule(**r) for r in raw]


def _run_pipeline_sync(loop: asyncio.AbstractEventLoop, run_id: str, filename: str, doc_bytes: bytes, rules: list[Rule]):
    """Runs on a worker thread (see create_run) — GRAPH.stream() makes blocking LLM HTTP calls,
    and running that directly on the asyncio event loop would freeze every other request
    (health checks, status polls, other runs' SSE streams) for the run's whole duration."""
    emit = lambda event: events.emit_threadsafe(loop, run_id, event)  # noqa: E731
    session = get_session()
    try:
        emit({"stage": "Document Ingestion", "status": "active"})
        try:
            full_text, line_pages, notes = load_document(filename, doc_bytes)
            clause_index, page_map = build_clause_index(full_text, line_pages)
        except Exception as e:
            emit({"stage": "Document Ingestion", "status": "error", "message": str(e)})
            run = session.get(Run, run_id)
            run.status = "error"
            run.error = f"Ingestion failed: {e}"
            session.commit()
            events.close_threadsafe(loop, run_id)
            return

        emit(
            {
                "stage": "Document Ingestion",
                "status": "done",
                "message": f"{len(clause_index)} clauses indexed",
                "notes": notes,
            }
        )

        initial_state = seeded_initial_state(clause_index, page_map, rules, document_text=full_text, run_id=run_id)

        emit({"stage": "Term Extraction", "status": "active"})
        seen: set[str] = set()
        final_state: dict = initial_state

        for chunk in GRAPH.stream(initial_state, stream_mode="values"):
            final_state = chunk

            if chunk.get("retry_count", 0) and "retry_count" not in seen:
                seen.add("retry_count")
                emit({"stage": "Term Extraction", "status": "retrying", "message": "Re-verifying unmatched citations"})

            if chunk.get("terms") and "terms" not in seen:
                seen.add("terms")
                emit({"stage": "Term Extraction", "status": "done", "message": f"{len(chunk['terms'])} terms found"})
                emit({"stage": "Compliance Review", "status": "active"})

            if chunk.get("rule_results") and "rule_results" not in seen:
                seen.add("rule_results")
                emit(
                    {
                        "stage": "Compliance Review",
                        "status": "done",
                        "message": f"{len(chunk['rule_results'])}/{len(rules)} rules evaluated",
                    }
                )
                emit({"stage": "Risk & Summary", "status": "active"})

            if chunk.get("executive_summary") and "executive_summary" not in seen:
                seen.add("executive_summary")
                emit(
                    {
                        "stage": "Risk & Summary",
                        "status": "done",
                        "message": f"{len(chunk.get('risks', []))} risks identified",
                    }
                )

            new_errors = [e for e in chunk.get("errors", []) if e not in seen]
            for e in new_errors:
                seen.add(e)
                emit({"stage": "System", "status": "warning", "message": e})

        report_md = render_markdown(final_state)
        run = session.get(Run, run_id)
        run.status = "completed"
        run.result_json = _serialize(final_state)
        run.report_markdown = report_md
        session.commit()

        emit(
            {
                "stage": "Report",
                "status": "done",
                "overall_status": final_state.get("overall_status"),
                "escalation_count": len(final_state.get("escalations", [])),
                "report_markdown": report_md,
            }
        )
    except Exception as e:
        run = session.get(Run, run_id)
        if run:
            run.status = "error"
            run.error = f"{e}\n{traceback.format_exc()}"
            session.commit()
        emit({"stage": "System", "status": "error", "message": str(e)})
    finally:
        events.close_threadsafe(loop, run_id)
        session.close()


@app.post("/runs")
async def create_run(file: UploadFile = File(...), rules_file: UploadFile | None = File(None)):
    if Path(file.filename).suffix.lower() not in (".pdf", ".docx", ".md", ".txt"):
        raise HTTPException(400, "Unsupported file type. Use .pdf, .docx, .md, or .txt")

    doc_bytes = await file.read()
    rules_bytes = await rules_file.read() if rules_file else None
    try:
        rules = _load_rules(rules_bytes)
    except Exception as e:
        raise HTTPException(400, f"Invalid rules file: {e}")

    run_id = str(uuid.uuid4())
    session = get_session()
    session.add(Run(id=run_id, filename=file.filename, rules_filename=rules_file.filename if rules_file else "lending_policy.yaml (default)"))
    session.commit()
    session.close()

    loop = asyncio.get_running_loop()
    asyncio.create_task(
        asyncio.to_thread(_run_pipeline_sync, loop, run_id, file.filename, doc_bytes, rules)
    )
    return {"run_id": run_id}


@app.get("/runs/{run_id}/events")
async def run_events(run_id: str):
    return StreamingResponse(events.stream(run_id), media_type="text/event-stream")


@app.get("/runs/{run_id}")
def get_run(run_id: str):
    session = get_session()
    run = session.get(Run, run_id)
    session.close()
    if not run:
        raise HTTPException(404, "Run not found")
    return {
        "run_id": run.id,
        "filename": run.filename,
        "rules_filename": run.rules_filename,
        "status": run.status,
        "created_at": run.created_at.isoformat(),
        "error": run.error,
        "result": run.result_json,
    }


@app.get("/runs/{run_id}/report.md", response_class=PlainTextResponse)
def get_report_md(run_id: str):
    session = get_session()
    run = session.get(Run, run_id)
    session.close()
    if not run or not run.report_markdown:
        raise HTTPException(404, "Report not ready")
    return run.report_markdown
