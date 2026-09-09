"use client";
import { useMemo, useState } from "react";
import type { DealResult, Risk, RuleResult, StageState, Term } from "@/lib/types";

interface NodeDetailsPanelProps {
  selectedNode: string;
  onSelectNode: (nodeKey: string) => void;
  stages: StageState[];
  result: DealResult | null;
  liveTerms?: Term[];
  liveKeywords?: string[];
  liveRuleResults?: RuleResult[];
  liveRisks?: Risk[];
  liveSummary?: string;
  liveFollowUps?: string[];
  liveEscalations?: string[];
  liveClauses?: { id: string; text: string }[];
  liveNotes?: string[];
  reportMarkdown?: string | null;
}

const TABS = [
  { key: "orchestrator", label: "Orchestrator", color: "accent" },
  { key: "Document Ingestion", label: "Ingestion", color: "cyan" },
  { key: "Term Extraction", label: "Terms & Keywords", color: "indigo" },
  { key: "Compliance Review", label: "Compliance", color: "violet" },
  { key: "Risk & Summary", label: "Risk & Synthesis", color: "amber" },
  { key: "Report", label: "Report Markdown", color: "pass" },
];

export default function NodeDetailsPanel({
  selectedNode,
  onSelectNode,
  stages,
  result,
  liveTerms = [],
  liveKeywords = [],
  liveRuleResults = [],
  liveRisks = [],
  liveSummary = "",
  liveFollowUps = [],
  liveEscalations = [],
  liveClauses = [],
  liveNotes = [],
  reportMarkdown = null,
}: NodeDetailsPanelProps) {
  // Filters & interactive state
  const [keywordFilter, setKeywordFilter] = useState<string | null>(null);
  const [termSearch, setTermSearch] = useState<string>("");
  const [termCategoryFilter, setTermCategoryFilter] = useState<string>("All");
  const [complianceFilter, setComplianceFilter] = useState<string>("all");
  const [riskFilter, setRiskFilter] = useState<string>("all");
  const [showKeywordCloud, setShowKeywordCloud] = useState<boolean>(true);
  const [clauseSearch, setClauseSearch] = useState<string>("");

  // Consolidated data: prefer completed `result` when available, fallback to `liveData`
  const terms: Term[] = result?.terms || liveTerms;
  const keywords: string[] = useMemo(() => {
    if (liveKeywords.length > 0) return liveKeywords;
    return Array.from(new Set(terms.map((t) => t.name))).sort();
  }, [liveKeywords, terms]);

  const ruleResults: RuleResult[] = result?.rule_results || liveRuleResults;
  const risks: Risk[] = result?.risks || liveRisks;
  const executiveSummary: string = result?.executive_summary || liveSummary;
  const followUpActions: string[] = result?.follow_up_actions || liveFollowUps;
  const escalations: string[] = result?.escalations || liveEscalations;
  const overallStatus = result?.overall_status;

  // Filtered terms
  const filteredTerms = useMemo(() => {
    return terms.filter((t) => {
      if (keywordFilter && t.name.toLowerCase() !== keywordFilter.toLowerCase()) {
        return false;
      }
      if (termCategoryFilter !== "All" && t.category.toLowerCase() !== termCategoryFilter.toLowerCase()) {
        return false;
      }
      if (termSearch) {
        const q = termSearch.toLowerCase();
        const matchName = t.name.toLowerCase().includes(q);
        const matchVal = t.value.toLowerCase().includes(q);
        const matchQuote = t.evidence?.quote?.toLowerCase().includes(q);
        if (!matchName && !matchVal && !matchQuote) return false;
      }
      return true;
    });
  }, [terms, keywordFilter, termCategoryFilter, termSearch]);

  // Distinct categories
  const categories = useMemo(() => {
    return ["All", ...Array.from(new Set(terms.map((t) => t.category).filter(Boolean)))];
  }, [terms]);

  // Filtered compliance rules
  const filteredRules = useMemo(() => {
    return ruleResults.filter((r) => {
      if (complianceFilter === "all") return true;
      if (complianceFilter === "fail") return r.status === "fail";
      if (complianceFilter === "pass") return r.status === "pass";
      if (complianceFilter === "review") return r.status === "needs_human_review";
      return true;
    });
  }, [ruleResults, complianceFilter]);

  // Filtered risks
  const filteredRisks = useMemo(() => {
    return risks.filter((r) => {
      if (riskFilter === "all") return true;
      return r.severity === riskFilter || r.category === riskFilter;
    });
  }, [risks, riskFilter]);

  // Current active stage state
  const currentStage = stages.find((s) => s.name === selectedNode);

  return (
    <div className="flex h-full flex-col rounded-3xl border border-border bg-surface/90 shadow-card backdrop-blur">
      {/* Top Tabs Selector */}
      <div className="flex flex-wrap items-center gap-1.5 border-b border-border/80 p-3 sm:px-5">
        {TABS.map((tab) => {
          const isSelected = selectedNode === tab.key;
          let countBadge = "";
          if (tab.key === "Term Extraction" && terms.length > 0) countBadge = `${terms.length}`;
          if (tab.key === "Compliance Review" && ruleResults.length > 0) countBadge = `${ruleResults.length}`;
          if (tab.key === "Risk & Summary" && risks.length > 0) countBadge = `${risks.length}`;

          return (
            <button
              key={tab.key}
              onClick={() => onSelectNode(tab.key)}
              className={`flex items-center gap-1.5 whitespace-nowrap rounded-xl px-3 py-2 text-xs font-semibold transition-all ${
                isSelected
                  ? "bg-surface2 text-ink shadow-sm ring-1 ring-border"
                  : "text-muted hover:bg-surface2/50 hover:text-ink"
              }`}
            >
              <span>{tab.label}</span>
              {countBadge && (
                <span className={`rounded-full px-1.5 py-0.2 text-[10px] font-bold ${
                  isSelected ? "bg-accent text-white" : "bg-surface3 text-muted"
                }`}>
                  {countBadge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-5 sm:p-6">
        {/* =========================================================================
            ORCHESTRATOR OVERVIEW
            ========================================================================= */}
        {selectedNode === "orchestrator" && (
          <div className="space-y-6">
            <div className="flex items-center justify-between rounded-2xl border border-accent/30 bg-accent/10 p-4">
              <div>
                <h3 className="text-sm font-bold text-ink">Central Orchestrator Agent</h3>
                <p className="mt-1 text-xs text-muted">
                  Oversees workflow state transitions, citation re-verification loops, and parallel batch dispatches.
                </p>
              </div>
              <span className="rounded-xl border border-accent/40 bg-accent/20 px-3 py-1 text-xs font-semibold text-accent2">
                State Coordinator
              </span>
            </div>

            {/* Pipeline Stage Trace */}
            <div>
              <h4 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted">
                Pipeline Execution Trace
              </h4>
              <div className="space-y-2.5">
                {stages.map((st, i) => {
                  const isActive = st.status === "active" || st.status === "retrying";
                  const isDone = st.status === "done";
                  return (
                    <div
                      key={st.name}
                      onClick={() => onSelectNode(st.name)}
                      className="flex cursor-pointer items-center justify-between rounded-xl border border-border bg-surface2/40 p-3 transition-colors hover:border-accent/40"
                    >
                      <div className="flex items-center gap-3">
                        <span className="font-mono text-xs text-dim">0{i + 1}</span>
                        <div>
                          <p className="text-xs font-semibold text-ink">{st.name}</p>
                          <p className="text-[11px] text-muted">{st.message || "Awaiting execution..."}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${
                            isActive
                              ? "bg-accent/20 text-accent2 animate-pulse"
                              : isDone
                              ? "bg-pass/15 text-pass"
                              : "bg-surface3 text-dim"
                          }`}
                        >
                          {st.status}
                        </span>
                        <span className="text-xs text-dim">→</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Quick Metrics */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="rounded-xl border border-border bg-surface2/30 p-3 text-center">
                <p className="text-[11px] text-muted">Terms Extracted</p>
                <p className="mt-1 text-lg font-bold text-indigo">{terms.length}</p>
              </div>
              <div className="rounded-xl border border-border bg-surface2/30 p-3 text-center">
                <p className="text-[11px] text-muted">Keywords Found</p>
                <p className="mt-1 text-lg font-bold text-cyan">{keywords.length}</p>
              </div>
              <div className="rounded-xl border border-border bg-surface2/30 p-3 text-center">
                <p className="text-[11px] text-muted">Rules Checked</p>
                <p className="mt-1 text-lg font-bold text-violet">{ruleResults.length}</p>
              </div>
              <div className="rounded-xl border border-border bg-surface2/30 p-3 text-center">
                <p className="text-[11px] text-muted">Risks Identified</p>
                <p className="mt-1 text-lg font-bold text-amber">{risks.length}</p>
              </div>
            </div>
          </div>
        )}

        {/* =========================================================================
            TERM & KEYWORD EXTRACTION AGENT
            ========================================================================= */}
        {selectedNode === "Term Extraction" && (
          <div className="space-y-6">
            {/* Header + Interactive Clickable Keyword Badge */}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-bold text-ink">Term & Keyword Extraction</h3>
                <p className="text-xs text-muted">
                  Grounds deal parameters against exact clause text with verbatim citations.
                </p>
              </div>

              {/* Requirement: "Keyword Agent -> 18 Keywords Found (Clickable)" */}
              {keywords.length > 0 && (
                <button
                  type="button"
                  onClick={() => setShowKeywordCloud(!showKeywordCloud)}
                  className="group flex items-center gap-2 rounded-xl border border-indigo/40 bg-indigo/15 px-3.5 py-1.5 text-xs font-semibold text-indigo shadow-glow-indigo/20 transition-all hover:scale-[1.02] hover:bg-indigo/25"
                >
                  <span className="text-sm">🔑</span>
                  <span>
                    Keyword Agent → <strong className="text-white font-bold">{keywords.length} Keywords Found</strong>
                  </span>
                  <span className="text-[10px] text-indigo/70 group-hover:text-white">
                    {showKeywordCloud ? "▲ Hide" : "▼ Explore"}
                  </span>
                </button>
              )}
            </div>

            {/* Clickable Keywords Cloud Filter */}
            {showKeywordCloud && keywords.length > 0 && (
              <div className="fade-in rounded-2xl border border-indigo/20 bg-surface2/50 p-4">
                <div className="mb-2.5 flex items-center justify-between">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-indigo">
                    Interactive Keyword Explorer ({keywords.length})
                  </span>
                  {keywordFilter && (
                    <button
                      onClick={() => setKeywordFilter(null)}
                      className="text-[11px] text-accent2 hover:underline"
                    >
                      Clear filter (showing all)
                    </button>
                  )}
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {keywords.map((kw) => {
                    const isSelected = keywordFilter?.toLowerCase() === kw.toLowerCase();
                    return (
                      <button
                        key={kw}
                        onClick={() => setKeywordFilter(isSelected ? null : kw)}
                        className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-all ${
                          isSelected
                            ? "bg-indigo text-white shadow-glow-indigo scale-105"
                            : "bg-surface3/80 text-muted hover:bg-surface3 hover:text-ink"
                        }`}
                      >
                        #{kw}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Search & Category Filter bar */}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="relative flex-1 min-w-[200px]">
                <input
                  type="text"
                  placeholder="Search extracted terms, values, or clauses..."
                  value={termSearch}
                  onChange={(e) => setTermSearch(e.target.value)}
                  className="w-full rounded-xl border border-border bg-surface2/60 px-3.5 py-2 text-xs text-ink placeholder-dim outline-none focus:border-indigo"
                />
                {termSearch && (
                  <button
                    onClick={() => setTermSearch("")}
                    className="absolute right-3 top-2 text-xs text-dim hover:text-ink"
                  >
                    ✕
                  </button>
                )}
              </div>

              <div className="flex items-center gap-1 overflow-x-auto">
                {categories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setTermCategoryFilter(cat)}
                    className={`whitespace-nowrap rounded-lg px-2.5 py-1 text-[11px] font-medium transition-colors ${
                      termCategoryFilter === cat
                        ? "bg-indigo/20 text-indigo border border-indigo/40"
                        : "text-muted hover:text-ink"
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Terms List */}
            {terms.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border p-8 text-center text-xs text-muted">
                <p className="text-dim">Extraction in progress or awaiting document input...</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredTerms.map((term, i) => {
                  const ev = term.evidence;
                  const isVerified = ev?.verified;
                  return (
                    <div
                      key={`${term.name}-${i}`}
                      className="rounded-2xl border border-border bg-surface2/40 p-4 transition-all hover:border-borderHover"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-bold text-ink">{term.name}</h4>
                          <span className="rounded-md bg-surface3 px-2 py-0.5 text-[10px] font-medium text-dim">
                            {term.category}
                          </span>
                        </div>
                        <span className="rounded-lg border border-indigo/30 bg-indigo/10 px-2.5 py-1 font-mono text-xs font-semibold text-indigo">
                          {term.value}
                        </span>
                      </div>

                      {/* Evidence citation */}
                      {ev && (
                        <div className="mt-3 rounded-xl border border-border/60 bg-surface3/40 p-3">
                          <div className="mb-1.5 flex items-center justify-between">
                            <span className="font-mono text-[11px] text-dim">
                              Clause: <strong className="text-ink">{ev.clause_id}</strong>
                              {ev.page !== null && ` · Page ${ev.page}`}
                            </span>
                            <span
                              className={`flex items-center gap-1 text-[10px] font-semibold uppercase ${
                                isVerified ? "text-pass" : "text-amber"
                              }`}
                            >
                              <span>{isVerified ? "✓" : "⚠"}</span>
                              {ev.verification_method || (isVerified ? "Verified quote" : "Unverified")}
                            </span>
                          </div>
                          <p className="text-xs italic leading-relaxed text-muted">
                            &ldquo;{ev.quote}&rdquo;
                          </p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* =========================================================================
            COMPLIANCE REVIEW AGENT
            ========================================================================= */}
        {selectedNode === "Compliance Review" && (
          <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-bold text-ink">Compliance Review Agent</h3>
                <p className="text-xs text-muted">
                  Evaluates deal terms against credit policy rules and covenants in parallel.
                </p>
              </div>

              {/* Status breakdown pills */}
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setComplianceFilter("all")}
                  className={`rounded-lg px-2.5 py-1 text-xs font-semibold ${
                    complianceFilter === "all" ? "bg-surface3 text-ink" : "text-muted"
                  }`}
                >
                  All ({ruleResults.length})
                </button>
                <button
                  onClick={() => setComplianceFilter("fail")}
                  className={`rounded-lg px-2.5 py-1 text-xs font-semibold ${
                    complianceFilter === "fail" ? "bg-fail/20 text-fail border border-fail/30" : "text-muted"
                  }`}
                >
                  Failed ({ruleResults.filter((r) => r.status === "fail").length})
                </button>
                <button
                  onClick={() => setComplianceFilter("review")}
                  className={`rounded-lg px-2.5 py-1 text-xs font-semibold ${
                    complianceFilter === "review" ? "bg-review/20 text-review border border-review/30" : "text-muted"
                  }`}
                >
                  Review ({ruleResults.filter((r) => r.status === "needs_human_review").length})
                </button>
                <button
                  onClick={() => setComplianceFilter("pass")}
                  className={`rounded-lg px-2.5 py-1 text-xs font-semibold ${
                    complianceFilter === "pass" ? "bg-pass/20 text-pass border border-pass/30" : "text-muted"
                  }`}
                >
                  Passed ({ruleResults.filter((r) => r.status === "pass").length})
                </button>
              </div>
            </div>

            {ruleResults.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border p-8 text-center text-xs text-muted">
                <p className="text-dim">Compliance review awaiting terms extraction...</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredRules.map((rule) => {
                  const isPass = rule.status === "pass";
                  const isFail = rule.status === "fail";
                  const isReview = rule.status === "needs_human_review";

                  return (
                    <div
                      key={rule.rule_id}
                      className={`rounded-2xl border p-4 transition-colors ${
                        isFail
                          ? "border-fail/40 bg-fail/5"
                          : isReview
                          ? "border-review/40 bg-review/5"
                          : "border-border bg-surface2/40"
                      }`}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold text-ink">{rule.rule_id}</span>
                          <span className={`rounded px-1.5 py-0.5 text-[9px] font-bold uppercase ${
                            rule.severity === "critical"
                              ? "bg-fail/20 text-fail"
                              : rule.severity === "high"
                              ? "bg-amber/20 text-amber"
                              : "bg-surface3 text-dim"
                          }`}>
                            {rule.severity}
                          </span>
                        </div>
                        <span
                          className={`rounded-md px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider ${
                            isPass
                              ? "bg-pass/20 text-pass"
                              : isFail
                              ? "bg-fail/20 text-fail shadow-glow-fail/20"
                              : "bg-review/20 text-review"
                          }`}
                        >
                          {isPass ? "PASS" : isFail ? "FAIL" : "NEEDS REVIEW"}
                        </span>
                      </div>

                      <p className="mt-2 text-xs font-semibold text-ink">{rule.rule_description}</p>
                      <p className="mt-1 text-xs leading-relaxed text-muted">{rule.rationale}</p>

                      {/* Cited Evidence */}
                      {rule.evidence && rule.evidence.length > 0 && (
                        <div className="mt-3 space-y-1.5 border-t border-border/50 pt-2.5">
                          {rule.evidence.map((ev, idx) => (
                            <div key={idx} className="flex items-start gap-2 text-[11px] text-muted">
                              <span className="font-mono text-dim">[{ev.clause_id}]</span>
                              <p className="italic">&ldquo;{ev.quote}&rdquo;</p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* =========================================================================
            RISK & SYNTHESIS AGENT
            ========================================================================= */}
        {selectedNode === "Risk & Summary" && (
          <div className="space-y-6">
            <div>
              <h3 className="text-base font-bold text-ink">Risk & Synthesis Agent</h3>
              <p className="text-xs text-muted">
                Synthesizes deal exposures, executive summary, and escalation criteria.
              </p>
            </div>

            {/* Executive Summary Box */}
            {executiveSummary && (
              <div className="rounded-2xl border border-amber/30 bg-amber/5 p-4 sm:p-5">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-amber">
                  Executive Summary
                </span>
                <p className="mt-2 text-xs leading-relaxed text-ink whitespace-pre-line">
                  {executiveSummary}
                </p>
              </div>
            )}

            {/* Escalations Triggered */}
            {escalations.length > 0 && (
              <div className="rounded-2xl border border-fail/40 bg-fail/10 p-4">
                <div className="flex items-center gap-2 text-xs font-bold text-fail">
                  <span>🚨</span> Escalation Triggers ({escalations.length})
                </div>
                <ul className="mt-2 space-y-1 text-xs text-muted">
                  {escalations.map((esc, i) => (
                    <li key={i} className="flex items-start gap-1.5">
                      <span className="text-fail">•</span>
                      <span>{esc}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Risk Register */}
            <div>
              <div className="mb-3 flex items-center justify-between">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-muted">
                  Risk Indicators ({risks.length})
                </h4>
                <div className="flex items-center gap-1 text-[11px]">
                  {["all", "critical", "high", "financial", "legal"].map((rf) => (
                    <button
                      key={rf}
                      onClick={() => setRiskFilter(rf)}
                      className={`rounded px-2 py-0.5 capitalize transition-colors ${
                        riskFilter === rf ? "bg-amber/20 text-amber" : "text-dim hover:text-ink"
                      }`}
                    >
                      {rf}
                    </button>
                  ))}
                </div>
              </div>

              {risks.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-border p-6 text-center text-xs text-muted">
                  <p className="text-dim">Risk synthesis in progress...</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredRisks.map((risk, i) => (
                    <div key={i} className="rounded-2xl border border-border bg-surface2/40 p-4">
                      <div className="flex items-center justify-between gap-2">
                        <h5 className="text-xs font-bold text-ink">{risk.title}</h5>
                        <span className={`rounded-md px-2 py-0.5 text-[10px] font-bold uppercase ${
                          risk.severity === "critical"
                            ? "bg-fail/20 text-fail"
                            : risk.severity === "high"
                            ? "bg-amber/20 text-amber"
                            : "bg-surface3 text-muted"
                        }`}>
                          {risk.severity} severity
                        </span>
                      </div>
                      <p className="mt-1.5 text-xs text-muted">{risk.rationale}</p>
                      {risk.mitigation && (
                        <p className="mt-2 text-[11px] text-cyan">
                          <strong>Mitigation:</strong> {risk.mitigation}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Follow-up actions */}
            {followUpActions.length > 0 && (
              <div>
                <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted">
                  Recommended Actions
                </h4>
                <div className="space-y-1.5">
                  {followUpActions.map((action, i) => (
                    <div key={i} className="flex items-start gap-2 text-xs text-ink">
                      <span className="text-accent">✓</span>
                      <span>{action}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* =========================================================================
            DOCUMENT INGESTION AGENT
            ========================================================================= */}
        {selectedNode === "Document Ingestion" && (
          <div className="space-y-6">
            <div>
              <h3 className="text-base font-bold text-ink">Document Ingestion Agent</h3>
              <p className="text-xs text-muted">
                Extracts raw text, maps pages, and indexes clauses with unique anchors.
              </p>
            </div>

            {liveNotes.length > 0 && (
              <div className="rounded-2xl border border-cyan/30 bg-cyan/10 p-4">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-cyan">
                  Ingestion Notes
                </span>
                <ul className="mt-2 space-y-1 text-xs text-ink">
                  {liveNotes.map((note, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span>•</span>
                      <span>{note}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Clause Explorer */}
            {liveClauses.length > 0 && (
              <div>
                <div className="mb-3 flex items-center justify-between">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-muted">
                    Indexed Clauses Preview ({liveClauses.length})
                  </h4>
                  <input
                    type="text"
                    placeholder="Filter clauses..."
                    value={clauseSearch}
                    onChange={(e) => setClauseSearch(e.target.value)}
                    className="rounded-lg border border-border bg-surface2 px-2.5 py-1 text-xs text-ink outline-none"
                  />
                </div>

                <div className="space-y-2">
                  {liveClauses
                    .filter((c) => !clauseSearch || c.id.includes(clauseSearch) || c.text.includes(clauseSearch))
                    .map((c) => (
                      <div key={c.id} className="rounded-xl border border-border/60 bg-surface2/30 p-3">
                        <span className="font-mono text-[11px] font-bold text-cyan">Clause {c.id}</span>
                        <p className="mt-1 text-xs text-muted font-mono leading-relaxed">{c.text}</p>
                      </div>
                    ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* =========================================================================
            REPORT MARKDOWN
            ========================================================================= */}
        {selectedNode === "Report" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-ink">Audit Report Output</h3>
              {reportMarkdown && (
                <button
                  onClick={() => {
                    const blob = new Blob([reportMarkdown], { type: "text/markdown" });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement("a");
                    a.href = url;
                    a.download = "deal_review_report.md";
                    a.click();
                  }}
                  className="rounded-xl border border-border bg-surface2 px-3 py-1 text-xs font-semibold text-accent2 hover:bg-surface3"
                >
                  Download .md
                </button>
              )}
            </div>

            {reportMarkdown ? (
              <pre className="max-h-[600px] overflow-auto rounded-2xl border border-border bg-surface2/50 p-4 font-mono text-xs text-muted leading-relaxed whitespace-pre-wrap">
                {reportMarkdown}
              </pre>
            ) : (
              <div className="rounded-2xl border border-dashed border-border p-8 text-center text-xs text-muted">
                <p className="text-dim">Report will render once all agents finish synthesis.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
