import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from deal_review.ingestion import build_clause_index
from deal_review.state import Evidence, RuleResult, Term
from deal_review.verify import compute_escalations, needs_extraction_retry, verify_evidence


CLAUSE_INDEX = {
    "3.1": "3.1 The Loan shall bear interest at a fixed rate of 7.25% per annum.",
    "6.1": "6.1 Collateral is the manufacturing facility at 4400 Industrial Parkway.",
}


def test_exact_match_verifies():
    ev = Evidence(clause_id="3.1", quote="fixed rate of 7.25% per annum")
    result = verify_evidence(ev, CLAUSE_INDEX, {})
    assert result.verified is True
    assert result.verification_method == "exact"


def test_missing_clause_fails():
    ev = Evidence(clause_id="99.9", quote="anything")
    result = verify_evidence(ev, CLAUSE_INDEX, {})
    assert result.verified is False


def test_fabricated_quote_fails():
    ev = Evidence(clause_id="3.1", quote="floating rate of 12% per annum")
    result = verify_evidence(ev, CLAUSE_INDEX, {})
    assert result.verified is False


def test_fuzzy_paraphrase_still_verifies():
    # minor whitespace/casing difference from the model, not a fabrication
    ev = Evidence(clause_id="3.1", quote="Fixed  rate  of 7.25% per annum.")
    result = verify_evidence(ev, CLAUSE_INDEX, {})
    assert result.verified is True
    assert result.verification_method in ("exact", "fuzzy")


def test_needs_extraction_retry_triggers_over_threshold():
    good = Term(name="A", value="x", category="other", evidence=Evidence(clause_id="3.1", quote="7.25%", verified=True))
    bad = Term(name="B", value="y", category="other", evidence=Evidence(clause_id="3.1", quote="nope", verified=False))
    assert needs_extraction_retry([good, bad, bad]) is True  # 2/3 unverified > 20%


def test_needs_extraction_retry_under_threshold():
    good = Term(name="A", value="x", category="other", evidence=Evidence(clause_id="3.1", quote="7.25%", verified=True))
    assert needs_extraction_retry([good] * 10) is False


def test_escalation_gate_flags_unverified_and_failed_rules():
    state = {
        "terms": [
            Term(
                name="Rate", value="7.25%", category="rate",
                evidence=Evidence(clause_id="3.1", quote="not really there", verified=False),
                confidence=0.9,
            )
        ],
        "rule_results": [
            RuleResult(rule_id="POL-01", rule_description="cap", status="fail", rationale="over limit", severity="high"),
            RuleResult(rule_id="POL-02", rule_description="dscr", status="needs_human_review", rationale="unclear", severity="critical"),
        ],
        "risks": [],
        "extraction_gaps": [],
    }
    escalations, overall = compute_escalations(state)
    assert any("Unverified evidence" in e for e in escalations)
    assert any("POL-01" in e for e in escalations)
    assert any("POL-02" in e for e in escalations)
    assert overall == "human_review"


def test_escalation_gate_clean_pass():
    state = {
        "terms": [
            Term(
                name="Rate", value="7.25%", category="rate",
                evidence=Evidence(clause_id="3.1", quote="fixed rate of 7.25% per annum", verified=True),
                confidence=0.95,
            )
        ],
        "rule_results": [
            RuleResult(rule_id="POL-01", rule_description="cap", status="pass", rationale="within limit", severity="high"),
        ],
        "risks": [],
        "extraction_gaps": [],
    }
    escalations, overall = compute_escalations(state)
    assert escalations == []
    assert overall == "pass"


def test_clause_index_ignores_wrapped_addresses():
    text = (
        "### 6. Collateral\n\n"
        "6.1 Lien on the manufacturing facility\n"
        "located at 4400 Industrial Parkway, Austin, TX 78744.\n"
    )
    clause_index, _ = build_clause_index(text)
    assert "4400" not in clause_index
    assert "6.1" in clause_index
    assert "4400 Industrial Parkway" in clause_index["6.1"]
