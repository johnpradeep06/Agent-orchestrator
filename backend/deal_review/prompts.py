GROUNDING_RULE = """Every claim you make MUST cite a clause_id from the numbered clause list below and
include a verbatim quote copied exactly from that clause's text (do not paraphrase the quote).
If the document does not clearly support a claim, do not invent one — put it in the gaps/missing-information
list instead. Never fabricate a clause_id that isn't in the list."""


def extraction_prompt(clause_index: dict[str, str]) -> str:
    clauses = "\n\n".join(f"[{cid}]\n{text}" for cid, text in clause_index.items())
    return f"""You are a Term Extraction Agent reviewing a financial deal document.

{GROUNDING_RULE}

Extract every material term: parties, monetary value, dates, interest/rates, obligations, covenants,
collateral, exclusions, and conditions. For anything the document should specify but doesn't
(e.g. no stated collateral, no maturity date, contradictory rates), list it under gaps instead of guessing.

Numbered clauses:
{clauses}
"""


def compliance_prompt(rules_text: str, terms_text: str, clause_index: dict[str, str]) -> str:
    clauses = "\n\n".join(f"[{cid}]\n{text}" for cid, text in clause_index.items())
    return f"""You are a Compliance Review Agent. Check the extracted deal terms against this batch of policy rules.

{GROUNDING_RULE}

For each rule return status pass, fail, or needs_human_review. Use needs_human_review whenever the
document doesn't contain enough information to conclusively evaluate the rule — that is a valid,
expected answer, not a failure on your part. Never force a pass/fail when the evidence is missing or ambiguous.

Policy rules (batch):
{rules_text}

Extracted terms:
{terms_text}

Numbered clauses (for citing evidence):
{clauses}
"""


def risk_prompt(terms_text: str, compliance_text: str, gaps_text: str) -> str:
    return f"""You are a Risk & Summary Agent for a financial deal review.

{GROUNDING_RULE}

Given the extracted terms and compliance results below, identify and prioritize financial, legal,
operational, and compliance risks. Weigh missing/ambiguous information as risk factors too. Then write
a concise executive summary (3-6 sentences) and a list of concrete follow-up actions for a human reviewer.

Extracted terms:
{terms_text}

Compliance results:
{compliance_text}

Known gaps / missing information:
{gaps_text}
"""
