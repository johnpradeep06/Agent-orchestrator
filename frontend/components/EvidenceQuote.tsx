"use client";
import { useState } from "react";
import type { Evidence } from "@/lib/types";

export default function EvidenceQuote({ evidence }: { evidence: Evidence }) {
  const [open, setOpen] = useState(false);
  return (
    <button
      type="button"
      onClick={() => setOpen(!open)}
      className={`block w-full text-left rounded-lg border px-3 py-2 text-xs transition-all ${
        evidence.verified
          ? "border-border bg-surface2 hover:border-accent/50 hover:shadow-glow-accent"
          : "border-fail/40 bg-fail/5 hover:shadow-glow-fail"
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="font-mono text-dim">
          Clause {evidence.clause_id}
          {evidence.page ? ` · p.${evidence.page}` : ""}
        </span>
        <span className={evidence.verified ? "text-pass" : "text-fail"}>
          {evidence.verified ? "✓ verified" : "✗ unverified"}
        </span>
      </div>
      {open && <p className="mt-1.5 italic text-ink/85">&ldquo;{evidence.quote}&rdquo;</p>}
      {!open && <p className="mt-1 truncate italic text-muted">&ldquo;{evidence.quote}&rdquo;</p>}
    </button>
  );
}
