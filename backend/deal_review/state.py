"""Shared pipeline state. This is the spine the orchestrator passes between every node."""
import operator
from typing import Annotated, Literal, TypedDict

from pydantic import BaseModel, Field, field_validator


class Evidence(BaseModel):
    clause_id: str
    quote: str
    page: int | None = None
    verified: bool = False
    verification_method: Literal["exact", "fuzzy", "unverified"] = "unverified"


class Rule(BaseModel):
    id: str
    description: str
    check: str
    severity: Literal["critical", "high", "medium", "low"] = "medium"


class Term(BaseModel):
    name: str
    value: str
    category: Literal[
        "party", "value", "date", "rate", "obligation",
        "covenant", "collateral", "exclusion", "condition", "other",
    ]
    evidence: Evidence
    confidence: float = Field(ge=0.0, le=1.0, default=0.8)


class RuleResult(BaseModel):
    rule_id: str
    rule_description: str
    status: Literal["pass", "fail", "needs_human_review"]
    rationale: str
    evidence: list[Evidence] = Field(default_factory=list)
    severity: Literal["critical", "high", "medium", "low"] = "medium"


class Risk(BaseModel):
    title: str
    category: Literal["financial", "legal", "operational", "compliance"]
    severity: Literal["critical", "high", "medium", "low"]
    likelihood: Literal["high", "medium", "low"]
    rationale: str
    evidence: list[Evidence] = Field(default_factory=list)
    mitigation: str


class TermList(BaseModel):
    """Structured-output wrapper for the extraction agent."""
    terms: list[Term]
    gaps: list[str] = Field(default_factory=list, description="Material info the document should contain but doesn't")

    @field_validator("gaps", mode="before")
    @classmethod
    def _coerce_gap_strings(cls, v):
        # Some models nest a gap as {"name": ..., "gaps": [...], ...} instead of a plain string
        # despite the schema. Flatten rather than fail the whole extraction over one field.
        if not isinstance(v, list):
            return v
        out = []
        for item in v:
            if isinstance(item, str):
                out.append(item)
            elif isinstance(item, dict):
                nested = item.get("gaps")
                if isinstance(nested, list):
                    out.extend(str(n) for n in nested)
                else:
                    out.append(item.get("name") or item.get("description") or str(item))
            else:
                out.append(str(item))
        return out


class RuleBatchResult(BaseModel):
    """Structured-output wrapper for one compliance batch call."""
    results: list[RuleResult]


class RiskSummary(BaseModel):
    """Structured-output wrapper for the risk & summary agent."""
    risks: list[Risk]
    executive_summary: str
    follow_up_actions: list[str]


def seeded_initial_state(clause_index: dict, page_map: dict, rules: list, document_text: str = "", run_id: str = "") -> "DealState":
    """LangGraph only materializes a reducer field once some node writes to it — a run
    that errors out before reaching a later node would otherwise omit that field
    entirely from the serialized result (e.g. `errors` undefined in the API response).
    Seeding every list field up front means the report/UI can always rely on them."""
    return {
        "run_id": run_id,
        "document_text": document_text,
        "clause_index": clause_index,
        "page_map": page_map,
        "rules": rules,
        "ingestion_notes": [],
        "terms": [],
        "extraction_gaps": [],
        "rule_results": [],
        "risks": [],
        "executive_summary": "",
        "follow_up_actions": [],
        "escalations": [],
        "overall_status": "human_review",
        "errors": [],
        "retry_count": 0,
    }


class DealState(TypedDict, total=False):
    run_id: str
    document_text: str
    clause_index: dict[str, str]
    page_map: dict[str, int]
    ingestion_notes: Annotated[list[str], operator.add]

    rules: list[Rule]

    terms: list[Term]
    extraction_gaps: list[str]

    rule_results: Annotated[list[RuleResult], operator.add]

    risks: list[Risk]
    executive_summary: str
    follow_up_actions: list[str]

    escalations: Annotated[list[str], operator.add]
    overall_status: Literal["pass", "fail", "human_review"]

    errors: Annotated[list[str], operator.add]
    retry_count: int
