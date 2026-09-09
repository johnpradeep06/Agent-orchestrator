const STYLES: Record<string, string> = {
  pass: "bg-pass/10 text-pass border-pass/40 shadow-glow-pass",
  fail: "bg-fail/10 text-fail border-fail/40 shadow-glow-fail",
  human_review: "bg-review/10 text-review border-review/40 shadow-glow-amber",
  needs_human_review: "bg-review/10 text-review border-review/40 shadow-glow-amber",
};

const LABELS: Record<string, string> = {
  pass: "PASS",
  fail: "FAIL",
  human_review: "HUMAN REVIEW",
  needs_human_review: "HUMAN REVIEW",
};

export default function StatusBadge({ status, size = "md" }: { status: string; size?: "sm" | "md" | "lg" }) {
  const sizeCls = size === "lg" ? "text-sm px-3.5 py-1.5" : size === "sm" ? "text-[10px] px-1.5 py-0.5" : "text-xs px-2.5 py-1";
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border font-semibold tracking-wide ${sizeCls} ${
        STYLES[status] || "bg-surface2 text-muted border-border"
      }`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {LABELS[status] || status.toUpperCase()}
    </span>
  );
}
