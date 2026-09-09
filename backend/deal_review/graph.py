"""Orchestrator: wires the agent nodes into a LangGraph StateGraph.

extract_terms -> [retry_extraction?] -> fan out one call per rule batch (compliance_batch)
             -> risk_summary (join) -> escalation_gate -> END
"""
from langgraph.graph import END, START, StateGraph
from langgraph.types import RetryPolicy, Send

from .config import get_llm
from .prompts import compliance_prompt, extraction_prompt, risk_prompt
from .state import DealState, Rule, RuleBatchResult, RuleResult, RiskSummary, TermList
from .verify import compute_escalations, needs_extraction_retry, verify_evidence, verify_terms

RULE_BATCH_SIZE = 5
MAX_EXTRACTION_RETRIES = 1
LLM_RETRY = RetryPolicy(max_attempts=3, initial_interval=1.0, backoff_factor=2.0)

# Groq's per-minute token quota is charged against max_tokens, not actual output length — size
# each call to what it actually needs so 3 parallel compliance batches don't reserve 3x more
# than they'll use and starve the shared budget.
EXTRACTION_MAX_TOKENS = 5000
COMPLIANCE_MAX_TOKENS = 2800
RISK_MAX_TOKENS = 3200


def _make_rule_batches(rules: list[Rule]) -> list[list[Rule]]:
    return [rules[i : i + RULE_BATCH_SIZE] for i in range(0, len(rules), RULE_BATCH_SIZE)]


def _terms_text(terms) -> str:
    return "\n".join(
        f"- {t.name} ({t.category}): {t.value} [clause {t.evidence.clause_id}, "
        f"verified={t.evidence.verified}]"
        for t in terms
    ) or "No terms extracted."


# ---- nodes -----------------------------------------------------------------


def extract_terms_node(state: DealState) -> dict:
    llm = get_llm(max_tokens=EXTRACTION_MAX_TOKENS).with_structured_output(TermList)
    prompt = extraction_prompt(state["clause_index"])
    try:
        result: TermList = llm.invoke(prompt)
    except Exception as e:
        return {"errors": [f"extraction_failed: {e}"], "terms": [], "extraction_gaps": []}
    verified = verify_terms(result.terms, state["clause_index"], state.get("page_map", {}))
    return {"terms": verified, "extraction_gaps": result.gaps}


def retry_extraction_node(state: DealState) -> dict:
    failed = [t for t in state.get("terms", []) if not t.evidence.verified]
    llm = get_llm(max_tokens=EXTRACTION_MAX_TOKENS).with_structured_output(TermList)
    if failed:
        failed_desc = "\n".join(
            f"- {t.name}: cited clause {t.evidence.clause_id}, quote \"{t.evidence.quote}\" "
            "was NOT found verbatim in that clause"
            for t in failed
        )
        prompt = (
            extraction_prompt(state["clause_index"])
            + "\n\nYour previous attempt cited quotes that do not appear verbatim in the cited clause. "
            f"Correct these specifically, copying exact text from the clause:\n{failed_desc}"
        )
    else:
        # Hard failure (API/parse error) rather than a verification miss — just retry cleanly.
        prompt = extraction_prompt(state["clause_index"])
    try:
        result: TermList = llm.invoke(prompt)
    except Exception as e:
        return {"errors": [f"extraction_retry_failed: {e}"], "retry_count": state.get("retry_count", 0) + 1}
    verified = verify_terms(result.terms, state["clause_index"], state.get("page_map", {}))
    return {
        "terms": verified,
        "extraction_gaps": result.gaps,
        "retry_count": state.get("retry_count", 0) + 1,
    }


def _route_to_compliance(state: DealState):
    batches = _make_rule_batches(state["rules"])
    if not batches:
        return "risk_summary"
    return [
        Send(
            "compliance_batch",
            {
                "rules": batch,
                "terms": state["terms"],
                "clause_index": state["clause_index"],
                "page_map": state.get("page_map", {}),
            },
        )
        for batch in batches
    ]


def _extraction_hard_failed(state: DealState) -> bool:
    # extract_terms_node caught an exception (API error, truncated/unparseable JSON, etc.) and
    # returned no terms at all — distinct from "the document legitimately has few/no terms".
    return not state.get("terms") and any("extraction_failed" in e for e in state.get("errors", []))


def route_after_extraction(state: DealState):
    should_retry = (
        needs_extraction_retry(state.get("terms", [])) or _extraction_hard_failed(state)
    ) and state.get("retry_count", 0) < MAX_EXTRACTION_RETRIES
    if should_retry:
        return "retry_extraction"
    return _route_to_compliance(state)


def route_after_retry(state: DealState):
    return _route_to_compliance(state)


def compliance_batch_node(state: DealState) -> dict:
    rules: list[Rule] = state["rules"]
    llm = get_llm(max_tokens=COMPLIANCE_MAX_TOKENS).with_structured_output(RuleBatchResult)
    rules_text = "\n".join(f"[{r.id}] ({r.severity}) {r.description} — check: {r.check}" for r in rules)
    prompt = compliance_prompt(rules_text, _terms_text(state["terms"]), state["clause_index"])
    try:
        result: RuleBatchResult = llm.invoke(prompt)
    except Exception as e:
        fallback = [
            RuleResult(
                rule_id=r.id,
                rule_description=r.description,
                status="needs_human_review",
                rationale=f"Automated compliance check failed due to a system error ({e}); review manually.",
                severity=r.severity,
            )
            for r in rules
        ]
        return {"rule_results": fallback, "errors": [f"compliance_batch_failed ({[r.id for r in rules]}): {e}"]}

    verified = []
    for r in result.results:
        ev = [verify_evidence(e, state["clause_index"], state.get("page_map", {})) for e in r.evidence]
        verified.append(r.model_copy(update={"evidence": ev}))
    return {"rule_results": verified}


def risk_summary_node(state: DealState) -> dict:
    llm = get_llm(max_tokens=RISK_MAX_TOKENS).with_structured_output(RiskSummary)
    # Groq caps a single request at prompt + max_tokens <= 8000 — 15 rules' full rationales
    # plus generous max_tokens for the response can blow past that, so keep this compact.
    compliance_text = "\n".join(
        f"- [{r.rule_id}] {r.status} ({r.severity}): {r.rationale[:200]}"
        for r in state.get("rule_results", [])
    ) or "No compliance results."
    gaps_text = "\n".join(state.get("extraction_gaps", [])) or "None noted."
    prompt = risk_prompt(_terms_text(state["terms"]), compliance_text, gaps_text)
    try:
        result: RiskSummary = llm.invoke(prompt)
    except Exception as e:
        return {
            "errors": [f"risk_summary_failed: {e}"],
            "risks": [],
            "executive_summary": "Automated risk analysis failed due to a system error. Manual review required.",
            "follow_up_actions": ["Manually review this deal — automated risk analysis did not complete."],
        }
    verified_risks = []
    for r in result.risks:
        ev = [verify_evidence(e, state["clause_index"], state.get("page_map", {})) for e in r.evidence]
        verified_risks.append(r.model_copy(update={"evidence": ev}))
    return {
        "risks": verified_risks,
        "executive_summary": result.executive_summary,
        "follow_up_actions": result.follow_up_actions,
    }


def escalation_node(state: DealState) -> dict:
    escalations, overall = compute_escalations(state)
    return {"escalations": escalations, "overall_status": overall}


# ---- graph assembly ---------------------------------------------------------


def build_graph():
    g = StateGraph(DealState)

    g.add_node("extract_terms", extract_terms_node, retry_policy=LLM_RETRY)
    g.add_node("retry_extraction", retry_extraction_node, retry_policy=LLM_RETRY)
    g.add_node("compliance_batch", compliance_batch_node, retry_policy=LLM_RETRY)
    g.add_node("risk_summary", risk_summary_node, retry_policy=LLM_RETRY)
    g.add_node("escalation_gate", escalation_node)

    g.add_edge(START, "extract_terms")
    g.add_conditional_edges("extract_terms", route_after_extraction)
    g.add_conditional_edges("retry_extraction", route_after_retry)
    g.add_edge("compliance_batch", "risk_summary")
    g.add_edge("risk_summary", "escalation_gate")
    g.add_edge("escalation_gate", END)

    return g.compile()


GRAPH = build_graph()
