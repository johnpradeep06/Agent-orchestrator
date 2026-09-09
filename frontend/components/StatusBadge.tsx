const STYLES: Record<string, string> = {
  pass: "bg-pass/10 text-pass border-pass/30",
  fail: "bg-fail/10 text-fail border-fail/30",
  human_review: "bg-review/10 text-review border-review/30",
  needs_human_review: "bg-review/10 text-review border-review/30",
};

const LABELS: Record<string, string> = {
  pass: "PASS",
  fail: "FAIL",
  human_review: "HUMAN REVIEW",
  needs_human_review: "HUMAN REVIEW",
};

export default function StatusBadge({ status, size = "md" }: { status: string; size?: "sm" | "md" | "lg" }) {
  const sizeCls = size === "lg" ? "text-sm px-3 py-1.5" : size === "sm" ? "text-[10px] px-1.5 py-0.5" : "text-xs px-2 py-1";
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border font-semibold tracking-wide ${sizeCls} ${
        STYLES[status] || "bg-gray-100 text-gray-600 border-gray-300"
      }`}
    >
      {LABELS[status] || status.toUpperCase()}
    </span>
  );
}
