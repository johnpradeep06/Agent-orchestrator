# Deal Review Report

**Overall Assessment:** 🟡 HUMAN REVIEW REQUIRED

## ⚠ Escalations — Human Review Required

- Compliance rule 'POL-01' FAILED (high): Loan principal must not exceed the delegated authority limit of $5,000,000.
- Compliance rule 'POL-02' FAILED (critical): Minimum Debt Service Coverage Ratio (DSCR) of 1.25x is required.
- Compliance rule 'POL-04' FAILED (high): Maximum leverage (Debt/EBITDA) covenant must not exceed 3.5x.
- Compliance rule 'POL-05' FAILED (critical): Interest rate structure (fixed or floating) must be unambiguous and internally consistent.
- Compliance rule 'POL-06' FAILED (high): Collateral must be explicitly identified and sufficiently described (asset type, location/identifier). — check: A collateral clause exists and names a specific, identifiable asset.
- Compliance rule 'POL-03' needs human review: The document does not provide any LTV information.
- Compliance rule 'POL-09' needs human review: The document does not contain any clause specifying the frequency or type of financial reporting required from the Borrower.
- Compliance rule 'POL-11' needs human review: Automated compliance check failed due to a system error (Error code: 429 - {'error': {'message': 'Rate limit reached for model `openai/gpt-oss-120b` in organization `org_01jmqcc8bwfgg8bkdnp6tewjxw` service tier `on_demand` on tokens per minute (TPM): Limit 8000, Used 6963, Requested 5013. Please try again in 29.82s. Need more tokens? Upgrade to Dev Tier today at https://console.groq.com/settings/billing', 'type': 'tokens', 'code': 'rate_limit_exceeded'}}); review manually.
- Compliance rule 'POL-12' needs human review: Automated compliance check failed due to a system error (Error code: 429 - {'error': {'message': 'Rate limit reached for model `openai/gpt-oss-120b` in organization `org_01jmqcc8bwfgg8bkdnp6tewjxw` service tier `on_demand` on tokens per minute (TPM): Limit 8000, Used 6963, Requested 5013. Please try again in 29.82s. Need more tokens? Upgrade to Dev Tier today at https://console.groq.com/settings/billing', 'type': 'tokens', 'code': 'rate_limit_exceeded'}}); review manually.
- Compliance rule 'POL-13' needs human review: Automated compliance check failed due to a system error (Error code: 429 - {'error': {'message': 'Rate limit reached for model `openai/gpt-oss-120b` in organization `org_01jmqcc8bwfgg8bkdnp6tewjxw` service tier `on_demand` on tokens per minute (TPM): Limit 8000, Used 6963, Requested 5013. Please try again in 29.82s. Need more tokens? Upgrade to Dev Tier today at https://console.groq.com/settings/billing', 'type': 'tokens', 'code': 'rate_limit_exceeded'}}); review manually.
- Compliance rule 'POL-14' needs human review: Automated compliance check failed due to a system error (Error code: 429 - {'error': {'message': 'Rate limit reached for model `openai/gpt-oss-120b` in organization `org_01jmqcc8bwfgg8bkdnp6tewjxw` service tier `on_demand` on tokens per minute (TPM): Limit 8000, Used 6963, Requested 5013. Please try again in 29.82s. Need more tokens? Upgrade to Dev Tier today at https://console.groq.com/settings/billing', 'type': 'tokens', 'code': 'rate_limit_exceeded'}}); review manually.
- Compliance rule 'POL-15' needs human review: Automated compliance check failed due to a system error (Error code: 429 - {'error': {'message': 'Rate limit reached for model `openai/gpt-oss-120b` in organization `org_01jmqcc8bwfgg8bkdnp6tewjxw` service tier `on_demand` on tokens per minute (TPM): Limit 8000, Used 6963, Requested 5013. Please try again in 29.82s. Need more tokens? Upgrade to Dev Tier today at https://console.groq.com/settings/billing', 'type': 'tokens', 'code': 'rate_limit_exceeded'}}); review manually.
- Critical risk: Insufficient Debt Service Coverage Ratio
- Critical risk: Undefined Rate Reset Event leading to ambiguous interest terms
- Missing/ambiguous information: Exact maturity date not specified
- Missing/ambiguous information: Detailed collateral description not provided
- Missing/ambiguous information: Definition of Rate Reset Event not provided
- Missing/ambiguous information: Lender's legal name not specified

## Executive Summary

The loan agreement presents several high‑risk issues: the principal of $6,800,000 exceeds the $5,000,000 policy cap, the minimum DSCR of 1.15x falls short of the required 1.25x, and the leverage covenant of 4.0x surpasses the allowable 3.5x. Additionally, the interest rate structure is ambiguous because the Rate Reset Event is not defined, and the collateral description is insufficient, referencing only Schedule C without asset details. The lender is identified merely as "Lender" without a legal entity name, and critical information such as LTV metrics, exact maturity date, and financial reporting requirements are missing. These deficiencies create significant financial, legal, operational, and compliance risks that must be addressed before proceeding.

### Follow-up Actions

- Obtain a waiver or reduce the loan amount to meet the $5,000,000 limit (clause 2.1).
- Renegotiate the DSCR covenant to at least 1.25x or improve Borrower cash flow (clause 5.1).
- Adjust the leverage covenant to a maximum of 3.5x or increase equity (clause 5.2).
- Define the Rate Reset Event and reconcile the fixed and floating rate provisions (clauses 3.1, 9.1, 9.2).
- Provide a detailed collateral schedule with asset type, location, and identifiers (clause 6.1).
- Amend clause 1 to specify the Lender's full legal entity name.
- Supply a loan‑to‑value (LTV) analysis and supporting documentation.
- Specify the exact maturity date rather than a relative period (clause 4.1).
- Establish and document the frequency and type of financial reporting required from the Borrower.

## Compliance Matrix

| Rule | Severity | Status | Rationale |
|---|---|---|---|
| POL-01 | high | ❌ FAIL | The loan amount of $6,800,000 exceeds the $5,000,000 limit. |
| POL-02 | critical | ❌ FAIL | The required DSCR is 1.15x, which is below the minimum of 1.25x. |
| POL-03 | high | 🟡 HUMAN REVIEW | The document does not provide any LTV information. |
| POL-04 | high | ❌ FAIL | The leverage covenant of 4.0x exceeds the maximum allowed 3.5x. |
| POL-05 | critical | ❌ FAIL | The agreement references both a fixed rate and a floating rate contingent on an undefined Rate Reset Event, creating ambiguity and inconsistency. |
| POL-06 | high | ❌ FAIL | The collateral clause references Schedule C but does not name a specific asset type, location, or identifier, so the collateral is not explicitly identified and sufficiently described. |
| POL-07 | medium | ❌ FAIL | The Borrower is fully identified, but the Lender is referred to only as "Lender" without a legal entity designation, so parties are not fully and unambiguously identified. |
| POL-08 | medium | ✅ PASS | The maturity term is explicitly stated as 60 months from the agreement date. |
| POL-09 | medium | 🟡 HUMAN REVIEW | The document does not contain any clause specifying the frequency or type of financial reporting required from the Borrower. |
| POL-10 | medium | ✅ PASS | The Events of Default are enumerated in clause 7.1. |
| POL-11 | medium | 🟡 HUMAN REVIEW | Automated compliance check failed due to a system error (Error code: 429 - {'error': {'message': 'Rate limit reached for model `openai/gpt-oss-120b` in organization `org_01jmqcc8bwfgg8bkdnp6tewjxw` service tier `on_demand` on tokens per minute (TPM): Limit 8000, Used 6963, Requested 5013. Please try again in 29.82s. Need more tokens? Upgrade to Dev Tier today at https://console.groq.com/settings/billing', 'type': 'tokens', 'code': 'rate_limit_exceeded'}}); review manually. |
| POL-12 | low | 🟡 HUMAN REVIEW | Automated compliance check failed due to a system error (Error code: 429 - {'error': {'message': 'Rate limit reached for model `openai/gpt-oss-120b` in organization `org_01jmqcc8bwfgg8bkdnp6tewjxw` service tier `on_demand` on tokens per minute (TPM): Limit 8000, Used 6963, Requested 5013. Please try again in 29.82s. Need more tokens? Upgrade to Dev Tier today at https://console.groq.com/settings/billing', 'type': 'tokens', 'code': 'rate_limit_exceeded'}}); review manually. |
| POL-13 | low | 🟡 HUMAN REVIEW | Automated compliance check failed due to a system error (Error code: 429 - {'error': {'message': 'Rate limit reached for model `openai/gpt-oss-120b` in organization `org_01jmqcc8bwfgg8bkdnp6tewjxw` service tier `on_demand` on tokens per minute (TPM): Limit 8000, Used 6963, Requested 5013. Please try again in 29.82s. Need more tokens? Upgrade to Dev Tier today at https://console.groq.com/settings/billing', 'type': 'tokens', 'code': 'rate_limit_exceeded'}}); review manually. |
| POL-14 | low | 🟡 HUMAN REVIEW | Automated compliance check failed due to a system error (Error code: 429 - {'error': {'message': 'Rate limit reached for model `openai/gpt-oss-120b` in organization `org_01jmqcc8bwfgg8bkdnp6tewjxw` service tier `on_demand` on tokens per minute (TPM): Limit 8000, Used 6963, Requested 5013. Please try again in 29.82s. Need more tokens? Upgrade to Dev Tier today at https://console.groq.com/settings/billing', 'type': 'tokens', 'code': 'rate_limit_exceeded'}}); review manually. |
| POL-15 | medium | 🟡 HUMAN REVIEW | Automated compliance check failed due to a system error (Error code: 429 - {'error': {'message': 'Rate limit reached for model `openai/gpt-oss-120b` in organization `org_01jmqcc8bwfgg8bkdnp6tewjxw` service tier `on_demand` on tokens per minute (TPM): Limit 8000, Used 6963, Requested 5013. Please try again in 29.82s. Need more tokens? Upgrade to Dev Tier today at https://console.groq.com/settings/billing', 'type': 'tokens', 'code': 'rate_limit_exceeded'}}); review manually. |

**POL-01 evidence:**
  > [2.1] "2.1 The Lender agrees to extend a term loan to the Borrower in the principal amount of $6,800,000 (the "Loan")." ✓
**POL-02 evidence:**
  > [5.1] "5.1 Borrower shall maintain a minimum Debt Service Coverage Ratio (DSCR) of 1.15x, tested quarterly." ✓
**POL-04 evidence:**
  > [5.2] "5.2 Borrower shall maintain a maximum leverage ratio (Total Debt / EBITDA) of 4.0x." ✓
**POL-05 evidence:**
  > [3.1] "3.1 The Loan shall bear interest at a fixed rate of 8.5% per annum." ✓
  > [9.1] "9.1 Notwithstanding Section 3.1, for any period following a Rate Reset Event, the Loan shall instead bear interest at a floating rate equal to SOFR plus 325 basis points." ✓
  > [9.2] "9.2 A "Rate Reset Event" is not defined elsewhere in this Agreement." ✓
**POL-06 evidence:**
  > [6.1] "Collateral for this Loan is described in Schedule C attached hereto." ✓
**POL-07 evidence:**
  > [1] "This Term Loan Agreement is entered into between Riverside Holdings ("Borrower") and Lender." ✓
**POL-08 evidence:**
  > [4.1] "The Loan shall mature 60 months from the date of this Agreement." ✓
**POL-10 evidence:**
  > [7.1] "Each of the following constitutes an Event of Default under this Agreement:
(a) failure to pay any principal or interest when due;
(b) breach of any financial covenant in Section 5;
(c) insolvency or bankruptcy filing by Borrower." ✓

## Risk Register

### [CRITICAL] Insufficient Debt Service Coverage Ratio (financial)
- **Likelihood:** high
- **Rationale:** The required DSCR of 1.15x is below the minimum acceptable threshold of 1.25x.
- **Mitigation:** Increase Borrower cash flow, reduce loan size, or raise the DSCR covenant to at least 1.25x.
  > [5.1] "1.15x" ✓

### [CRITICAL] Undefined Rate Reset Event leading to ambiguous interest terms (legal)
- **Likelihood:** high
- **Rationale:** The agreement references both a fixed rate and a floating rate contingent on an undefined event, creating legal uncertainty.
- **Mitigation:** Define the Rate Reset Event and align fixed and floating rate provisions to eliminate ambiguity.
  > [9.2] "Not defined" ✓
  > [3.1] "8.5% per annum" ✓
  > [9.1] "SOFR plus 325 basis points" ✓

### [HIGH] Loan amount exceeds policy limit (financial)
- **Likelihood:** high
- **Rationale:** The loan amount exceeds the policy‑defined maximum, creating a breach of financial limits.
- **Mitigation:** Reduce the loan amount or obtain a policy waiver to comply with the $5,000,000 limit.
  > [2.1] "$6,800,000" ✓

### [HIGH] Leverage ratio exceeds allowable maximum (financial)
- **Likelihood:** high
- **Rationale:** The leverage covenant of 4.0x exceeds the allowable maximum of 3.5x.
- **Mitigation:** Adjust capital structure to lower leverage or obtain a waiver for the higher ratio.
  > [5.2] "4.0x" ✓

### [HIGH] Insufficient collateral description (operational)
- **Likelihood:** high
- **Rationale:** Collateral is referenced only generically, making it difficult to assess enforceability and value.
- **Mitigation:** Provide a detailed description of the collateral assets, including type, location, and identifiers.
  > [6.1] "described in Schedule C attached hereto" ✓

### [HIGH] Missing Loan‑to‑Value (LTV) information (financial)
- **Likelihood:** high
- **Rationale:** The agreement does not provide any LTV information, preventing assessment of loan risk.
- **Mitigation:** Obtain a loan‑to‑value (LTV) calculation and supporting documentation.

### [MEDIUM] Lender not fully identified (legal)
- **Likelihood:** medium
- **Rationale:** The Lender is identified only as "Lender," which may cause ambiguity in enforcement.
- **Mitigation:** Amend the parties clause to include the Lender's full legal entity name and jurisdiction.
  > [1] "Lender" ✓

### [MEDIUM] Absent financial reporting requirements (operational)
- **Likelihood:** medium
- **Rationale:** No clause defines the Borrower's financial reporting obligations, hindering monitoring.
- **Mitigation:** Specify the required financial reporting frequency, format, and delivery deadlines in the agreement.

### [LOW] Exact maturity date not specified (operational)
- **Likelihood:** medium
- **Rationale:** The maturity is expressed only as a relative period, leaving the precise payoff date ambiguous.
- **Mitigation:** Add an exact maturity date (calendar date) to the agreement.
  > [4.1] "60 months from the date of this Agreement" ✓

## Extracted Terms

| Term | Category | Value | Confidence | Evidence |
|---|---|---|---|---|
| Borrower | party | Riverside Holdings | 80% | [1] ✓ |
| Lender | party | Lender | 80% | [1] ✓ |
| Loan Amount | value | $6,800,000 | 80% | [2.1] ✓ |
| Fixed Interest Rate | rate | 8.5% per annum | 80% | [3.1] ✓ |
| Floating Interest Rate (post reset) | rate | SOFR plus 325 basis points | 80% | [9.1] ✓ |
| Maturity Period | date | 60 months from the date of this Agreement | 80% | [4.1] ✓ |
| Minimum DSCR | covenant | 1.15x | 80% | [5.1] ✓ |
| Maximum Leverage Ratio | covenant | 4.0x | 80% | [5.2] ✓ |
| Reserve Requirement | covenant | reasonable efforts to maintain adequate reserves in excess of the Applicable Reserve Threshold at all times | 80% | [5.3] ✓ |
| Collateral Description | collateral | described in Schedule C attached hereto | 80% | [6.1] ✓ |
| Rate Reset Event Definition | condition | Not defined | 80% | [9.2] ✓ |
| Governing Law | other | State of Delaware | 80% | [8.1] ✓ |
| Events of Default | condition | failure to pay any principal or interest when due; breach of any financial covenant in Section 5; insolvency or bankruptcy filing by Borrower | 80% | [7.1] ✓ |

## Gaps / Missing Information

- Exact maturity date not specified
- Detailed collateral description not provided
- Definition of Rate Reset Event not provided
- Lender's legal name not specified

## System Errors (degraded but continued)

- compliance_batch_failed (['POL-11', 'POL-12', 'POL-13', 'POL-14', 'POL-15']): Error code: 429 - {'error': {'message': 'Rate limit reached for model `openai/gpt-oss-120b` in organization `org_01jmqcc8bwfgg8bkdnp6tewjxw` service tier `on_demand` on tokens per minute (TPM): Limit 8000, Used 6963, Requested 5013. Please try again in 29.82s. Need more tokens? Upgrade to Dev Tier today at https://console.groq.com/settings/billing', 'type': 'tokens', 'code': 'rate_limit_exceeded'}}
