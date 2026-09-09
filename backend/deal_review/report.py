"""Render a completed DealState into a human-readable Markdown report."""
from .state import DealState

_STATUS_BADGE = {"pass": "✅ PASS", "fail": "❌ FAIL", "needs_human_review": "🟡 HUMAN REVIEW"}
_OVERALL_BADGE = {"pass": "✅ PASS", "fail": "❌ FAIL", "human_review": "🟡 HUMAN REVIEW REQUIRED"}
_SEVERITY_ORDER = {"critical": 0, "high": 1, "medium": 2, "low": 3}


def _evidence_line(ev) -> str:
    mark = "✓" if ev.verified else "✗ UNVERIFIED"
    page = f", p.{ev.page}" if ev.page else ""
    return f'  > [{ev.clause_id}{page}] "{ev.quote}" {mark}'


def render_markdown(state: DealState) -> str:
    lines: list[str] = []
    overall = state.get("overall_status", "human_review")
    lines.append("# Deal Review Report\n")
    lines.append(f"**Overall Assessment:** {_OVERALL_BADGE.get(overall, overall)}\n")

    escalations = state.get("escalations", [])
    if escalations:
        lines.append("## ⚠ Escalations — Human Review Required\n")
        for e in escalations:
            lines.append(f"- {e}")
        lines.append("")

    lines.append("## Executive Summary\n")
    lines.append(state.get("executive_summary", "_Not generated._") + "\n")

    follow_ups = state.get("follow_up_actions", [])
    if follow_ups:
        lines.append("### Follow-up Actions\n")
        for f in follow_ups:
            lines.append(f"- {f}")
        lines.append("")

    lines.append("## Compliance Matrix\n")
    lines.append("| Rule | Severity | Status | Rationale |")
    lines.append("|---|---|---|---|")
    for r in state.get("rule_results", []):
        lines.append(f"| {r.rule_id} | {r.severity} | {_STATUS_BADGE.get(r.status, r.status)} | {r.rationale} |")
    lines.append("")
    for r in state.get("rule_results", []):
        if r.evidence:
            lines.append(f"**{r.rule_id} evidence:**")
            for ev in r.evidence:
                lines.append(_evidence_line(ev))
    lines.append("")

    lines.append("## Risk Register\n")
    risks = sorted(state.get("risks", []), key=lambda r: _SEVERITY_ORDER.get(r.severity, 9))
    for r in risks:
        lines.append(f"### [{r.severity.upper()}] {r.title} ({r.category})")
        lines.append(f"- **Likelihood:** {r.likelihood}")
        lines.append(f"- **Rationale:** {r.rationale}")
        lines.append(f"- **Mitigation:** {r.mitigation}")
        for ev in r.evidence:
            lines.append(_evidence_line(ev))
        lines.append("")

    lines.append("## Extracted Terms\n")
    lines.append("| Term | Category | Value | Confidence | Evidence |")
    lines.append("|---|---|---|---|---|")
    for t in state.get("terms", []):
        mark = "✓" if t.evidence.verified else "✗"
        cite = f"[{t.evidence.clause_id}] {mark}"
        lines.append(f"| {t.name} | {t.category} | {t.value} | {t.confidence:.0%} | {cite} |")
    lines.append("")

    gaps = state.get("extraction_gaps", [])
    if gaps:
        lines.append("## Gaps / Missing Information\n")
        for g in gaps:
            lines.append(f"- {g}")
        lines.append("")

    errors = state.get("errors", [])
    if errors:
        lines.append("## System Errors (degraded but continued)\n")
        for e in errors:
            lines.append(f"- {e}")
        lines.append("")

    return "\n".join(lines)
