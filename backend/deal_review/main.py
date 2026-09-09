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

        sample_clauses = [
            {"id": cid, "text": text[:200] + "..." if len(text) > 200 else text}
            for cid, text in list(clause_index.items())[:10]
        ]
        emit(
            {
                "stage": "Document Ingestion",
                "status": "done",
                "message": f"{len(clause_index)} clauses indexed",
                "notes": notes,
                "clause_count": len(clause_index),
                "sample_clauses": sample_clauses,
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
                terms_serialized = [
                    t.model_dump(mode="json") if hasattr(t, "model_dump") else t
                    for t in chunk["terms"]
                ]
                keywords = sorted(list({t.get("name") for t in terms_serialized if t.get("name")}))
                categories = sorted(list({t.get("category") for t in terms_serialized if t.get("category")}))
                emit(
                    {
                        "stage": "Term Extraction",
                        "status": "done",
                        "message": f"{len(terms_serialized)} terms and {len(keywords)} keywords extracted",
                        "terms": terms_serialized,
                        "keywords": keywords,
                        "categories": categories,
                        "extraction_gaps": chunk.get("extraction_gaps", []),
                        "retry_count": chunk.get("retry_count", 0),
                    }
                )
                emit({"stage": "Compliance Review", "status": "active"})

            if chunk.get("rule_results") and "rule_results" not in seen:
                seen.add("rule_results")
                rule_results_serialized = [
                    r.model_dump(mode="json") if hasattr(r, "model_dump") else r
                    for r in chunk["rule_results"]
                ]
                passed_c = len([r for r in rule_results_serialized if r.get("status") == "pass"])
                failed_c = len([r for r in rule_results_serialized if r.get("status") == "fail"])
                review_c = len([r for r in rule_results_serialized if r.get("status") == "needs_human_review"])
                emit(
                    {
                        "stage": "Compliance Review",
                        "status": "done",
                        "message": f"{len(rule_results_serialized)}/{len(rules)} rules evaluated ({passed_c} pass, {failed_c} fail, {review_c} review)",
                        "rule_results": rule_results_serialized,
                        "passed_count": passed_c,
                        "failed_count": failed_c,
                        "review_count": review_c,
                    }
                )
                emit({"stage": "Risk & Summary", "status": "active"})

            if chunk.get("executive_summary") and "executive_summary" not in seen:
                seen.add("executive_summary")
                risks_serialized = [
                    r.model_dump(mode="json") if hasattr(r, "model_dump") else r
                    for r in chunk.get("risks", [])
                ]
                emit(
                    {
                        "stage": "Risk & Summary",
                        "status": "done",
                        "message": f"{len(risks_serialized)} risks identified",
                        "risks": risks_serialized,
                        "executive_summary": chunk.get("executive_summary"),
                        "follow_up_actions": chunk.get("follow_up_actions", []),
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
                "escalations": final_state.get("escalations", []),
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
        "report_markdown": run.report_markdown,
    }


@app.get("/runs/{run_id}/report.md", response_class=PlainTextResponse)
def get_report_md(run_id: str):
    session = get_session()
    run = session.get(Run, run_id)
    session.close()
    if not run or not run.report_markdown:
        raise HTTPException(404, "Report not ready")
    return run.report_markdown


@app.get("/runs")
def list_runs(limit: int = 50, offset: int = 0):
    session = get_session()
    total = session.query(Run).count()
    runs = session.query(Run).order_by(Run.created_at.desc()).offset(offset).limit(limit).all()
    items = []
    for r in runs:
        res = r.result_json or {}
        rule_results = res.get("rule_results", [])
        items.append(
            {
                "run_id": r.id,
                "filename": r.filename,
                "rules_filename": r.rules_filename,
                "status": r.status,
                "created_at": r.created_at.isoformat() if r.created_at else None,
                "error": r.error,
                "overall_status": res.get("overall_status"),
                "term_count": len(res.get("terms", [])),
                "risk_count": len(res.get("risks", [])),
                "escalation_count": len(res.get("escalations", [])),
                "rule_pass_count": len([x for x in rule_results if x.get("status") == "pass"]),
                "rule_fail_count": len([x for x in rule_results if x.get("status") == "fail"]),
                "rule_review_count": len([x for x in rule_results if x.get("status") == "needs_human_review"]),
            }
        )
    session.close()
    return {"total": total, "items": items}


@app.get("/documents/stats")
def get_document_stats():
    session = get_session()
    total = session.query(Run).count()
    completed = session.query(Run).filter(Run.status == "completed").count()
    processing = session.query(Run).filter(Run.status == "processing").count()
    error = session.query(Run).filter(Run.status == "error").count()

    completed_runs = session.query(Run).filter(Run.status == "completed").all()
    passed = sum(1 for r in completed_runs if r.result_json and r.result_json.get("overall_status") == "pass")
    failed = sum(1 for r in completed_runs if r.result_json and r.result_json.get("overall_status") == "fail")
    human_review = sum(1 for r in completed_runs if r.result_json and r.result_json.get("overall_status") == "human_review")

    session.close()
    return {
        "total_documents": total,
        "completed": completed,
        "processing": processing,
        "error": error,
        "passed": passed,
        "failed": failed,
        "human_review": human_review,
    }


@app.delete("/runs/{run_id}")
def delete_run(run_id: str):
    session = get_session()
    run = session.get(Run, run_id)
    if not run:
        session.close()
        raise HTTPException(404, "Run not found")
    session.delete(run)
    session.commit()
    session.close()
    return {"status": "deleted", "run_id": run_id}

