"""Deterministic grounding layer — no LLM. This is what makes citations trustworthy
instead of merely plausible-looking."""
import difflib
import re

from .state import DealState, Evidence, Term

FUZZY_THRESHOLD = 0.90
RETRY_TRIGGER_RATIO = 0.20  # if >20% of terms fail verification, retry extraction once


def _normalize(s: str) -> str:
    return re.sub(r"\s+", " ", s).strip().lower()


def verify_evidence(ev: Evidence, clause_index: dict[str, str], page_map: dict[str, int]) -> Evidence:
    clause_text = clause_index.get(ev.clause_id)
    if clause_text is None:
        return ev.model_copy(update={"verified": False, "verification_method": "unverified"})

    quote_norm = _normalize(ev.quote)
    clause_norm = _normalize(clause_text)

    if quote_norm and quote_norm in clause_norm:
        return ev.model_copy(
            update={"verified": True, "verification_method": "exact", "page": page_map.get(ev.clause_id, ev.page)}
        )

    # Fuzzy fallback for minor paraphrasing/whitespace differences from the model.
    ratio = difflib.SequenceMatcher(None, quote_norm, clause_norm).ratio()
    # Also check best-matching substring window, since the quote is usually shorter than the clause.
    best_ratio = ratio
    if quote_norm:
        window = len(quote_norm)
        for i in range(0, max(len(clause_norm) - window, 0) + 1, max(window // 4, 1)):
            chunk = clause_norm[i : i + window]
            r = difflib.SequenceMatcher(None, quote_norm, chunk).ratio()
            best_ratio = max(best_ratio, r)

    if best_ratio >= FUZZY_THRESHOLD:
        return ev.model_copy(
            update={"verified": True, "verification_method": "fuzzy", "page": page_map.get(ev.clause_id, ev.page)}
        )

    return ev.model_copy(update={"verified": False, "verification_method": "unverified"})


def verify_terms(terms: list[Term], clause_index: dict[str, str], page_map: dict[str, int]) -> list[Term]:
    out = []
    for t in terms:
        ev = verify_evidence(t.evidence, clause_index, page_map)
        confidence = t.confidence if ev.verified else min(t.confidence, 0.4)
        out.append(t.model_copy(update={"evidence": ev, "confidence": confidence}))
    return out


def needs_extraction_retry(terms: list[Term]) -> bool:
    if not terms:
        return False
    unverified = sum(1 for t in terms if not t.evidence.verified)
    return (unverified / len(terms)) > RETRY_TRIGGER_RATIO


def compute_escalations(state: DealState) -> tuple[list[str], str]:
    """Pure-rule escalation gate. Returns (escalation messages, overall_status)."""
    escalations: list[str] = []

    for t in state.get("terms", []):
        if not t.evidence.verified:
            escalations.append(
                f"Unverified evidence for term '{t.name}' (cites clause {t.evidence.clause_id}, "
                "quote not found in source document)."
            )
        elif t.confidence < 0.6:
            escalations.append(f"Low-confidence term '{t.name}' ({t.confidence:.0%}) — verify manually.")

    failed_high_sev = [
        r for r in state.get("rule_results", [])
        if r.status == "fail" and r.severity in ("critical", "high")
    ]
    for r in failed_high_sev:
        escalations.append(f"Compliance rule '{r.rule_id}' FAILED ({r.severity}): {r.rule_description}")

    for r in state.get("rule_results", []):
        if r.status == "needs_human_review":
            escalations.append(f"Compliance rule '{r.rule_id}' needs human review: {r.rationale}")

    for risk in state.get("risks", []):
        if risk.severity == "critical":
            escalations.append(f"Critical risk: {risk.title}")

    for gap in state.get("extraction_gaps", []):
        escalations.append(f"Missing/ambiguous information: {gap}")

    any_fail = any(r.status == "fail" for r in state.get("rule_results", []))
    if escalations or any_fail:
        overall = "human_review" if escalations and not any_fail else ("fail" if any_fail else "human_review")
    else:
        overall = "pass"

    # fail takes priority in the banner only if there's no escalation-worthy ambiguity riding along it
    if any_fail and not escalations:
        overall = "fail"
    elif escalations:
        overall = "human_review"
    else:
        overall = "pass"

    return escalations, overall
