"""End-to-end tests against the real LLM. Skipped automatically without an API key
so `pytest` still passes in CI/without secrets — the deterministic logic is covered
by test_verify.py regardless."""
import os
import sys
from pathlib import Path

import pytest
import yaml

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from deal_review.graph import GRAPH
from deal_review.ingestion import build_clause_index, load_document
from deal_review.state import Rule, seeded_initial_state

ROOT = Path(__file__).resolve().parents[1]
HAS_KEY = bool(
    os.getenv("GEMINI_API_KEY") or os.getenv("GROQ_API_KEY") or os.getenv("OPENROUTER_API_KEY") or os.getenv("ANTHROPIC_API_KEY")
)

pytestmark = pytest.mark.skipif(not HAS_KEY, reason="No LLM API key set")


def _run(doc_name: str):
    doc_path = ROOT / "samples" / doc_name
    full_text, line_pages, _ = load_document(doc_path.name, doc_path.read_bytes())
    clause_index, page_map = build_clause_index(full_text, line_pages)
    rules = [Rule(**r) for r in yaml.safe_load((ROOT / "rules" / "lending_policy.yaml").read_text())]
    return GRAPH.invoke(seeded_initial_state(clause_index, page_map, rules, document_text=full_text))


def test_normal_case_produces_full_report():
    state = _run("normal_loan.md")
    assert len(state["terms"]) > 0
    assert len(state["rule_results"]) == 15
    assert len(state["risks"]) > 0
    assert state["executive_summary"]
    assert state["overall_status"] in ("pass", "fail", "human_review")
    # the normal doc has a deliberate LTV violation
    assert any(r.status == "fail" for r in state["rule_results"])


def test_edge_case_triggers_escalation_and_gaps():
    state = _run("edge_case_loan.md")
    assert len(state["escalations"]) > 0, "edge case (contradictions, missing collateral, dangling schedule ref) should escalate"
    assert len(state.get("extraction_gaps", [])) > 0 or any(
        r.status == "needs_human_review" for r in state["rule_results"]
    )
    assert state["overall_status"] in ("fail", "human_review")
