"use client";
import { useMemo, useState } from "react";
import type { DealResult, Evidence, Risk, RuleResult, Term } from "@/lib/types";
import StatusBadge from "./StatusBadge";
import EvidenceQuote from "./EvidenceQuote";
import CollapsibleSection from "./CollapsibleSection";
import TermsRulesGraph from "./TermsRulesGraph";

const SEVERITY_ORDER: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };
const SEVERITY_COLOR: Record<string, string> = {
  critical: "border-l-fail",
  high: "border-l-review",
  medium: "border-l-accent",
  low: "border-l-border",
};

function ComplianceRow({ r }: { r: RuleResult }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-border last:border-b-0">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="grid w-full grid-cols-[auto_auto_1fr_auto] items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-surface2"
      >
        <span className="font-mono text-xs text-dim">{r.rule_id}</span>
        <span className="text-[10px] font-semibold uppercase text-muted">{r.severity}</span>
        <span className="truncate text-sm text-ink">{r.rule_description}</span>
        <StatusBadge status={r.status} size="sm" />
      </button>
      {open && (
        <div className="fade-in space-y-2 px-4 pb-4 pl-4">
          <p className="text-sm text-ink/80">{r.rationale}</p>
          {r.evidence.length > 0 && (
            <div className="space-y-1.5">
              {r.evidence.map((e, i) => (
                <EvidenceQuote key={i} evidence={e} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function RiskCard({ risk }: { risk: Risk }) {
  const [open, setOpen] = useState(false);
  return (
    <div className={`rounded-xl border border-border border-l-4 bg-surface2 p-4 transition-shadow hover:shadow-glow-accent ${SEVERITY_COLOR[risk.severity]}`}>
      <button type="button" onClick={() => setOpen(!open)} className="flex w-full items-start justify-between gap-3 text-left">
        <div>
          <span className="text-[10px] font-semibold uppercase text-muted">
            {risk.severity} · {risk.category}
          </span>
          <p className="mt-0.5 font-medium text-ink">{risk.title}</p>
        </div>
        <span className="mt-1 text-xs text-dim">{open ? "▲" : "▼"}</span>
      </button>
      {open && (
        <div className="fade-in mt-3 space-y-2 text-sm">
          <p className="text-ink/80">{risk.rationale}</p>
          <p className="text-muted">
            <span className="font-medium text-ink/70">Likelihood:</span> {risk.likelihood}
          </p>
          <p className="text-muted">
            <span className="font-medium text-ink/70">Mitigation:</span> {risk.mitigation}
          </p>
          {risk.evidence.map((e, i) => (
            <EvidenceQuote key={i} evidence={e} />
          ))}
        </div>
      )}
    </div>
  );
}

function TermRow({ t }: { t: Term }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-border last:border-b-0">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="grid w-full grid-cols-[1fr_auto_1fr_auto] items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-surface2"
      >
        <span className="text-sm font-medium text-ink">{t.name}</span>
        <span className="text-[10px] uppercase text-muted">{t.category}</span>
        <span className="truncate text-sm text-ink/80">{t.value}</span>
        <span className={`text-xs ${t.confidence >= 0.7 ? "text-pass" : "text-review"}`}>{Math.round(t.confidence * 100)}%</span>
      </button>
      {open && (
        <div className="fade-in px-4 pb-3 pl-4">
          <EvidenceQuote evidence={t.evidence} />
        </div>
      )}
    </div>
  );
}

export default function ReportView({ result, onShowTrace }: { result: DealResult; onShowTrace: () => void }) {
  const sortedRisks = useMemo(
    () => [...result.risks].sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity]),
    [result.risks]
  );

  const sources = useMemo(() => {
    const map = new Map<string, { evidence: Evidence; refs: Set<string> }>();
    const add = (e: Evidence, ref: string) => {
      const key = `${e.clause_id}::${e.quote}`;
      if (!map.has(key)) map.set(key, { evidence: e, refs: new Set() });
      map.get(key)!.refs.add(ref);
    };
    result.terms.forEach((t) => add(t.evidence, t.name));
    result.rule_results.forEach((r) => r.evidence.forEach((e) => add(e, r.rule_id)));
    result.risks.forEach((r) => r.evidence.forEach((e) => add(e, r.title)));
    return Array.from(map.values()).sort((a, b) => a.evidence.clause_id.localeCompare(b.evidence.clause_id, undefined, { numeric: true }));
  }, [result]);

  return (
    <div className="mx-auto max-w-4xl space-y-5 px-4 pb-20">
      {/* Overall Assessment — always visible */}
      <div className="fade-in flex items-center justify-between rounded-2xl border border-border bg-surface p-6 shadow-card">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">Overall Assessment</p>
          <div className="mt-2">
            <StatusBadge status={result.overall_status} size="lg" />
          </div>
          {result.escalations.length > 0 && (
            <p className="mt-2 text-xs text-muted">{result.escalations.length} item(s) flagged for human review</p>
          )}
        </div>
        <button onClick={onShowTrace} className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-ink transition-all hover:border-accent/50 hover:shadow-glow-accent">
          View activity trace
        </button>
      </div>

      {/* Executive Summary — shown expanded, this is the headline */}
      <div className="fade-in rounded-2xl border border-accent/30 bg-gradient-to-br from-surface to-surface2 p-6 shadow-glow-accent">
        <p className="text-xs font-semibold uppercase tracking-wide text-accent2">Executive Summary</p>
        <p className="mt-3 text-sm leading-relaxed text-ink/90">{result.executive_summary}</p>
        {result.follow_up_actions.length > 0 && (
          <div className="mt-4 border-t border-border/60 pt-4">
            <p className="text-xs font-semibold uppercase text-muted">Follow-up actions</p>
            <ul className="mt-2 list-inside list-disc space-y-1 text-sm text-ink/80">
              {result.follow_up_actions.map((f, i) => (
                <li key={i}>{f}</li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Everything else — collapsed by default */}
      {result.escalations.length > 0 && (
        <CollapsibleSection
          title="Human Review Items"
          subtitle={`${result.escalations.length} flagged`}
          accent="review"
        >
          <div className="space-y-2">
            {result.escalations.map((e, i) => (
              <div key={i} className="flex items-start gap-2 rounded-lg border border-review/30 bg-review/5 px-4 py-2.5 text-sm">
                <span className="text-review">⚠</span>
                <span className="text-ink/90">{e}</span>
              </div>
            ))}
          </div>
        </CollapsibleSection>
      )}

      <CollapsibleSection
        title="Compliance Matrix"
        subtitle={`${result.rule_results.filter((r) => r.status === "pass").length} pass · ${
          result.rule_results.filter((r) => r.status === "fail").length
        } fail · ${result.rule_results.filter((r) => r.status === "needs_human_review").length} review`}
        accent="violet"
      >
        <div className="overflow-hidden rounded-xl border border-border">
          {result.rule_results.length === 0 ? (
            <p className="p-4 text-sm text-muted">No compliance results.</p>
          ) : (
            result.rule_results.map((r) => <ComplianceRow key={r.rule_id} r={r} />)
          )}
        </div>
      </CollapsibleSection>

      <CollapsibleSection title="Risk Register" subtitle={`${sortedRisks.length} identified`} accent="fail">
        {sortedRisks.length === 0 ? (
          <p className="text-sm text-muted">No risks identified.</p>
        ) : (
          <div className="space-y-3">
            {sortedRisks.map((r, i) => (
              <RiskCard key={i} risk={r} />
            ))}
          </div>
        )}
      </CollapsibleSection>

      <CollapsibleSection title="Deal Terms" subtitle={`${result.terms.length} extracted`} accent="indigo">
        <div className="overflow-hidden rounded-xl border border-border">
          {result.terms.length === 0 ? (
            <p className="p-4 text-sm text-muted">No terms extracted.</p>
          ) : (
            result.terms.map((t, i) => <TermRow key={i} t={t} />)
          )}
        </div>
        {result.extraction_gaps.length > 0 && (
          <div className="mt-3 rounded-lg border border-border bg-surface2 p-4 text-sm">
            <p className="mb-1.5 text-xs font-semibold uppercase text-muted">Gaps / missing information</p>
            <ul className="list-inside list-disc space-y-1 text-ink/80">
              {result.extraction_gaps.map((g, i) => (
                <li key={i}>{g}</li>
              ))}
            </ul>
          </div>
        )}
      </CollapsibleSection>

      <CollapsibleSection title="Terms ↔ Rules Graph" subtitle="How evidence connects extraction to compliance" accent="cyan">
        <TermsRulesGraph terms={result.terms} rules={result.rule_results} />
      </CollapsibleSection>

      <CollapsibleSection title="Evidence / Sources" subtitle={`${sources.length} cited clauses`} accent="accent">
        <div className="overflow-hidden rounded-xl border border-border">
          {sources.map(({ evidence, refs }, i) => (
            <div key={i} className="border-b border-border px-4 py-2.5 last:border-b-0">
              <div className="flex items-center justify-between gap-2 text-xs">
                <span className="font-mono text-dim">
                  Clause {evidence.clause_id}
                  {evidence.page ? ` · p.${evidence.page}` : ""}
                </span>
                <span className={evidence.verified ? "text-pass" : "text-fail"}>{evidence.verified ? "✓" : "✗"}</span>
              </div>
              <p className="mt-1 text-sm italic text-ink/80">&ldquo;{evidence.quote}&rdquo;</p>
              <p className="mt-1 text-[11px] text-dim">Cited by: {Array.from(refs).join(", ")}</p>
            </div>
          ))}
        </div>
      </CollapsibleSection>

      {result.errors.length > 0 && (
        <CollapsibleSection title="System Notes" subtitle={`${result.errors.length} degraded gracefully`} accent="review">
          <div className="space-y-1 text-xs text-review">
            {result.errors.map((e, i) => (
              <p key={i}>· {e}</p>
            ))}
          </div>
        </CollapsibleSection>
      )}
    </div>
  );
}
