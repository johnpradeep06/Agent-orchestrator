"use client";
import { useState } from "react";
import type { StageState, StageStatus } from "@/lib/types";

type AgentDef = { key: string; label: string; blurb: string; color: "cyan" | "indigo" | "violet" | "amber" };

const AGENTS: AgentDef[] = [
  { key: "Document Ingestion", label: "Ingestion", blurb: "Parsing document, indexing clauses", color: "cyan" },
  { key: "Term Extraction", label: "Extraction", blurb: "Reading terms, citing evidence", color: "indigo" },
  { key: "Compliance Review", label: "Compliance", blurb: "Checking terms against policy", color: "violet" },
  { key: "Risk & Summary", label: "Risk & Summary", blurb: "Prioritizing risk, writing summary", color: "amber" },
];

const COLOR_TEXT: Record<string, string> = { cyan: "text-cyan", indigo: "text-indigo", violet: "text-violet", amber: "text-amber" };
const COLOR_RING: Record<string, string> = {
  cyan: "border-cyan shadow-glow-cyan",
  indigo: "border-indigo shadow-glow-indigo",
  violet: "border-violet shadow-glow-violet",
  amber: "border-amber shadow-glow-amber",
};
const COLOR_BG: Record<string, string> = { cyan: "bg-cyan", indigo: "bg-indigo", violet: "bg-violet", amber: "bg-amber" };

function nodeVisual(status: StageStatus, color: string) {
  if (status === "done") return { ring: "border-pass shadow-glow-pass", icon: "✓", iconColor: "text-pass", pulse: false };
  if (status === "error") return { ring: "border-fail shadow-glow-fail", icon: "✕", iconColor: "text-fail", pulse: false };
  if (status === "warning") return { ring: "border-review shadow-glow-amber", icon: "!", iconColor: "text-review", pulse: true };
  if (status === "active" || status === "retrying")
    return { ring: COLOR_RING[color], icon: null, iconColor: COLOR_TEXT[color], pulse: true };
  return { ring: "border-border", icon: "", iconColor: "text-dim", pulse: false };
}

function Connector({ active }: { active: boolean }) {
  return (
    <div className="hidden flex-1 items-center sm:flex">
      <svg width="100%" height="6" className="overflow-visible">
        <line
          x1="0"
          y1="3"
          x2="100%"
          y2="3"
          stroke={active ? "url(#grad)" : "#212a45"}
          strokeWidth="2"
          className={active ? "dash-flow" : ""}
        />
        <defs>
          <linearGradient id="grad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#7c5cff" />
            <stop offset="100%" stopColor="#22d3ee" />
          </linearGradient>
        </defs>
      </svg>
    </div>
  );
}

function AgentNode({ agent, stage }: { agent: AgentDef; stage: StageState }) {
  const [open, setOpen] = useState(false);
  const v = nodeVisual(stage.status, agent.color);
  const expandable = Boolean(stage.message || stage.notes?.length || stage.warnings.length);
  const isIdle = stage.status === "pending";

  return (
    <div className="flex w-full flex-col items-center sm:w-40">
      <button
        type="button"
        disabled={!expandable}
        onClick={() => setOpen(!open)}
        className="group flex flex-col items-center gap-3 disabled:cursor-default"
      >
        <div className={`relative flex h-16 w-16 items-center justify-center rounded-2xl border-2 bg-surface transition-all ${v.ring} ${isIdle ? "opacity-50" : ""}`}>
          {v.pulse && (
            <span className={`absolute inset-0 rounded-2xl ${COLOR_BG[agent.color]} opacity-20 glow-breathe`} />
          )}
          {(stage.status === "active" || stage.status === "retrying") && (
            <span className={`absolute h-8 w-8 animate-spin rounded-full border-2 border-transparent border-t-current ${v.iconColor}`} />
          )}
          <span className={`relative text-xl font-bold ${v.iconColor}`}>{v.icon}</span>
        </div>
        <div className="text-center">
          <p className={`text-sm font-semibold ${isIdle ? "text-dim" : "text-ink"}`}>{agent.label}</p>
          <p className="mt-0.5 max-w-[9rem] text-[11px] leading-snug text-muted">
            {stage.message || (stage.status === "active" ? agent.blurb : stage.status === "pending" ? "Waiting" : "")}
          </p>
        </div>
        {expandable && (
          <span className="text-[10px] text-dim">{open ? "▲ details" : "▼ details"}</span>
        )}
      </button>

      {open && (
        <div className="fade-in mt-3 w-full max-w-[13rem] rounded-xl border border-border bg-surface2 p-3 text-left text-[11px] text-muted">
          {stage.notes?.map((n, i) => (
            <p key={i} className="mb-1">
              · {n}
            </p>
          ))}
          {stage.warnings.map((w, i) => (
            <p key={i} className="mb-1 text-review">
              ⚠ {w}
            </p>
          ))}
          {!stage.notes?.length && !stage.warnings.length && stage.message && <p>{stage.message}</p>}
        </div>
      )}
    </div>
  );
}

export default function AgentGraph({ stages }: { stages: StageState[] }) {
  const byKey = Object.fromEntries(stages.map((s) => [s.name, s]));

  return (
    <div className="mx-auto max-w-4xl rounded-3xl border border-border bg-surface/60 p-6 shadow-card backdrop-blur sm:p-10">
      <div className="flex flex-col items-stretch gap-6 sm:flex-row sm:items-start sm:gap-2">
        {AGENTS.map((agent, i) => (
          <div key={agent.key} className="flex flex-1 flex-col items-center sm:flex-row">
            <AgentNode agent={agent} stage={byKey[agent.key] ?? { name: agent.key, status: "pending", warnings: [] }} />
            {i < AGENTS.length - 1 && (
              <Connector active={(byKey[agent.key]?.status ?? "pending") === "done"} />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
