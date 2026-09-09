"use client";
import { useState } from "react";
import type { StageState } from "@/lib/types";

const ICON: Record<string, string> = {
  pending: "○",
  active: "●",
  done: "✓",
  retrying: "↻",
  warning: "⚠",
  error: "✕",
};

const ICON_COLOR: Record<string, string> = {
  pending: "text-muted",
  active: "text-accent pulse-dot",
  done: "text-pass",
  retrying: "text-review pulse-dot",
  warning: "text-review",
  error: "text-fail",
};

function StageRow({ stage }: { stage: StageState }) {
  const [open, setOpen] = useState(false);
  const expandable = Boolean(stage.message || stage.notes?.length || stage.warnings.length);

  return (
    <div className="border-b border-border last:border-b-0">
      <button
        type="button"
        disabled={!expandable}
        onClick={() => setOpen(!open)}
        className="flex w-full items-center gap-3 px-4 py-3 text-left disabled:cursor-default"
      >
        <span className={`w-4 text-center font-mono text-base ${ICON_COLOR[stage.status]}`}>{ICON[stage.status]}</span>
        <span className="flex-1 text-sm font-medium">{stage.name}</span>
        {stage.message && <span className="text-xs text-muted">{stage.message}</span>}
        {expandable && <span className="text-xs text-muted">{open ? "▲" : "▼"}</span>}
      </button>
      {open && (
        <div className="fade-in space-y-1 px-4 pb-3 pl-11 text-xs text-muted">
          {stage.notes?.map((n, i) => (
            <p key={i}>· {n}</p>
          ))}
          {stage.warnings.map((w, i) => (
            <p key={i} className="text-review">
              ⚠ {w}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}

export default function Timeline({ stages, collapsed }: { stages: StageState[]; collapsed?: boolean }) {
  if (collapsed) return null;
  return (
    <div className="mx-auto max-w-2xl rounded-xl border border-border bg-white shadow-sm">
      {stages.map((s) => (
        <StageRow key={s.name} stage={s} />
      ))}
    </div>
  );
}
