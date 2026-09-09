"use client";
import { useState } from "react";
import type { Evidence } from "@/lib/types";

export default function EvidenceQuote({ evidence }: { evidence: Evidence }) {
  const [open, setOpen] = useState(false);
  return (
    <button
      type="button"
      onClick={() => setOpen(!open)}
      className={`block w-full text-left rounded-md border px-2.5 py-1.5 text-xs transition-colors ${
        evidence.verified
          ? "border-border bg-white hover:border-accent/40"
          : "border-fail/30 bg-fail/5 hover:border-fail/50"
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="font-mono text-muted">
          Clause {evidence.clause_id}
          {evidence.page ? ` · p.${evidence.page}` : ""}
        </span>
        <span className={evidence.verified ? "text-pass" : "text-fail"}>
          {evidence.verified ? "✓ verified" : "✗ unverified"}
        </span>
      </div>
      {open && <p className="mt-1.5 italic text-ink/80">&ldquo;{evidence.quote}&rdquo;</p>}
      {!open && <p className="mt-1 truncate italic text-ink/60">&ldquo;{evidence.quote}&rdquo;</p>}
    </button>
  );
}
