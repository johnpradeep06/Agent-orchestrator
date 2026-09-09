export type Evidence = {
  clause_id: string;
  quote: string;
  page: number | null;
  verified: boolean;
  verification_method: "exact" | "fuzzy" | "unverified";
};

export type Term = {
  name: string;
  value: string;
  category: string;
  evidence: Evidence;
  confidence: number;
};

export type RuleResult = {
  rule_id: string;
  rule_description: string;
  status: "pass" | "fail" | "needs_human_review";
  rationale: string;
  evidence: Evidence[];
  severity: "critical" | "high" | "medium" | "low";
};

export type Risk = {
  title: string;
  category: "financial" | "legal" | "operational" | "compliance";
  severity: "critical" | "high" | "medium" | "low";
  likelihood: "high" | "medium" | "low";
  rationale: string;
  evidence: Evidence[];
  mitigation: string;
};

export type DealResult = {
  terms: Term[];
  extraction_gaps: string[];
  rule_results: RuleResult[];
  risks: Risk[];
  executive_summary: string;
  follow_up_actions: string[];
  escalations: string[];
  overall_status: "pass" | "fail" | "human_review";
  errors: string[];
};

export type RunRecord = {
  run_id: string;
  filename: string;
  rules_filename: string;
  status: "processing" | "completed" | "error";
  created_at: string;
  error: string | null;
  result: DealResult | null;
};

export type StageStatus = "pending" | "active" | "done" | "retrying" | "warning" | "error";

export type StageState = {
  name: string;
  status: StageStatus;
  message?: string;
  notes?: string[];
  warnings: string[];
};

export type StreamEvent = {
  stage: string;
  status: string;
  message?: string;
  notes?: string[];
  overall_status?: string;
  escalation_count?: number;
  report_markdown?: string;
  ts: number;
};
