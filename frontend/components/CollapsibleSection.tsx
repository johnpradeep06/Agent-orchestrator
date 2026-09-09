"use client";
import { useState } from "react";

export default function CollapsibleSection({
  title,
  subtitle,
  defaultOpen = false,
  accent = "accent",
  children,
}: {
  title: string;
  subtitle?: string;
  defaultOpen?: boolean;
  accent?: "accent" | "fail" | "review" | "pass" | "violet" | "cyan" | "indigo";
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const glow: Record<string, string> = {
    accent: "hover:shadow-glow-accent",
    fail: "hover:shadow-glow-fail",
    review: "hover:shadow-glow-amber",
    pass: "hover:shadow-glow-pass",
    violet: "hover:shadow-glow-violet",
    cyan: "hover:shadow-glow-cyan",
    indigo: "hover:shadow-glow-indigo",
  };

  return (
    <div className={`overflow-hidden rounded-2xl border border-border bg-surface shadow-card transition-shadow ${glow[accent]}`}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left transition-colors hover:bg-surface2"
      >
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-ink">{title}</h2>
          {subtitle && <p className="mt-0.5 text-xs text-muted">{subtitle}</p>}
        </div>
        <span
          className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-border text-xs text-muted transition-transform ${
            open ? "rotate-180" : ""
          }`}
        >
          ▾
        </span>
      </button>
      <div className={`accordion-content ${open ? "open" : ""}`}>
        <div>
          <div className="border-t border-border px-5 py-4">{children}</div>
        </div>
      </div>
    </div>
  );
}
