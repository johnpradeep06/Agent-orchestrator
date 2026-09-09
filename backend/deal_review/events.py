"""In-memory per-run pub/sub for the live SSE timeline. A run lives on one process,
so a broker (Redis/etc.) would be solving a problem this deployment doesn't have."""
import asyncio
import json
import time

_queues: dict[str, asyncio.Queue] = {}

# Maps internal LangGraph node names to the four observable stages the UI shows.
STAGE_FOR_NODE = {
    "ingestion": "Document Ingestion",
    "extract_terms": "Term Extraction",
    "retry_extraction": "Term Extraction",
    "compliance_batch": "Compliance Review",
    "risk_summary": "Risk & Summary",
    "escalation_gate": "Risk & Summary",
}
STAGE_ORDER = ["Document Ingestion", "Term Extraction", "Compliance Review", "Risk & Summary"]


def get_queue(run_id: str) -> asyncio.Queue:
    if run_id not in _queues:
        _queues[run_id] = asyncio.Queue()
    return _queues[run_id]


def emit(run_id: str, event: dict):
    event = {**event, "ts": time.time()}
    get_queue(run_id).put_nowait(event)


def close(run_id: str):
    get_queue(run_id).put_nowait(None)  # sentinel


async def stream(run_id: str):
    q = get_queue(run_id)
    while True:
        event = await q.get()
        if event is None:
            yield "event: done\ndata: {}\n\n"
            break
        yield f"data: {json.dumps(event)}\n\n"
    _queues.pop(run_id, None)
