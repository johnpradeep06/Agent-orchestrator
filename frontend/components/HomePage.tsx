"use client";
import OrchestrationGraph from "./OrchestrationGraph";

const STEPS = [
  {
    n: "01",
    title: "Upload a deal",
    body: "Drop in a loan agreement or term sheet — PDF, DOCX, Markdown, or TXT. Scanned pages and embedded images are OCR'd automatically.",
    color: "cyan",
  },
  {
    n: "02",
    title: "Watch the agents work",
    body: "Ingestion, Term Extraction, Compliance Review, and Risk & Summary run in sequence with live status — see exactly what each agent is doing as it happens.",
    color: "indigo",
  },
  {
    n: "03",
    title: "Get a grounded report",
    body: "Every claim is checked against the source document before it reaches the report. Unverified evidence gets flagged, not hidden.",
    color: "violet",
  },
  {
    n: "04",
    title: "Review what needs you",
    body: "PASS / FAIL / HUMAN REVIEW is front and center. Drill into the compliance matrix, risk register, and every citation behind them.",
    color: "amber",
  },
];

const COLOR_CLASSES: Record<string, string> = {
  cyan: "text-cyan border-cyan/30 shadow-glow-cyan",
  indigo: "text-indigo border-indigo/30 shadow-glow-indigo",
  violet: "text-violet border-violet/30 shadow-glow-violet",
  amber: "text-amber border-amber/30 shadow-glow-amber",
};

export default function HomePage({
  onGetStarted,
  onViewHistory,
}: {
  onGetStarted: () => void;
  onViewHistory?: () => void;
}) {
  return (
    <div className="relative">
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[600px] bg-grid-glow" />

      {/* Hero */}
      <section className="mx-auto flex max-w-5xl flex-col items-center px-6 pb-20 pt-16 text-center sm:pt-24">
        <span className="fade-in mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-surface px-4 py-1.5 text-xs font-medium text-muted">
          <span className="h-1.5 w-1.5 rounded-full bg-accent shadow-glow-accent" />
          Multi-agent deal review pipeline
        </span>

        <h1 className="fade-in max-w-3xl text-4xl font-bold tracking-tight text-ink sm:text-6xl">
          Deal review, <span className="bg-gradient-to-r from-accent via-accent2 to-cyan bg-clip-text text-transparent">grounded</span> in
          the document
        </h1>

        <p className="fade-in mt-6 max-w-xl text-base leading-relaxed text-muted sm:text-lg">
          Central Orchestrator coordinates specialized agents to extract terms, check compliance, assess risk, and summarize deals —
          every claim traced back to a clause and quote with verifiable evidence.
        </p>

        <div className="fade-in mt-10 flex flex-wrap items-center justify-center gap-3 sm:flex-row">
          <button
            onClick={onGetStarted}
            className="group relative overflow-hidden rounded-xl bg-gradient-to-r from-accent to-accent2 px-8 py-3.5 text-sm font-semibold text-white shadow-glow-accent transition-transform hover:scale-[1.03]"
          >
            <span className="relative">Start Review →</span>
          </button>
          {onViewHistory && (
            <button
              onClick={onViewHistory}
              className="rounded-xl border border-border bg-surface px-6 py-3.5 text-sm font-semibold text-ink transition-all hover:border-accent2 hover:bg-surface2"
            >
              View Document History
            </button>
          )}
          <a
            href="#how-it-works"
            className="rounded-xl border border-border px-6 py-3.5 text-sm font-semibold text-muted transition-all hover:text-ink hover:border-borderHover"
          >
            How it works
          </a>
        </div>

        {/* Hero Interactive Agent Orchestration Graph */}
        <div className="fade-in mt-14 w-full">
          <OrchestrationGraph stages={[]} isHeroDemo={true} />
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="mx-auto max-w-5xl px-6 py-20">
        <div className="mb-12 text-center">
          <h2 className="text-2xl font-bold text-ink sm:text-3xl">How it works</h2>
          <p className="mt-3 text-sm text-muted">Four steps, fully observable — no hidden reasoning.</p>
        </div>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((s) => (
            <div
              key={s.n}
              className={`group rounded-2xl border bg-surface p-5 shadow-card transition-all hover:-translate-y-1 ${COLOR_CLASSES[s.color]}`}
            >
              <span className="text-xs font-mono text-dim">{s.n}</span>
              <h3 className="mt-2 text-sm font-semibold text-ink">{s.title}</h3>
              <p className="mt-2 text-xs leading-relaxed text-muted">{s.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Agent roster */}
      <section className="mx-auto max-w-5xl px-6 pb-24">
        <div className="rounded-3xl border border-border bg-surface p-8 shadow-card sm:p-10">
          <h2 className="text-lg font-semibold text-ink">The agent pipeline</h2>
          <p className="mt-2 max-w-2xl text-sm text-muted">
            An orchestrator coordinates specialized agents, each with a narrow job — the same way a
            real review team would divide the work.
          </p>
          <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { name: "Ingestion", desc: "Parses the document, OCRs scanned pages, builds a clause index.", color: "cyan" },
              { name: "Term Extraction", desc: "Pulls parties, values, covenants — every claim cites a clause.", color: "indigo" },
              { name: "Compliance Review", desc: "Checks terms against your policy: pass, fail, or needs review.", color: "violet" },
              { name: "Risk & Summary", desc: "Prioritizes risk, flags gaps, writes the executive summary.", color: "amber" },
            ].map((a) => (
              <div key={a.name} className={`rounded-xl border bg-bg/40 p-4 ${COLOR_CLASSES[a.color]}`}>
                <p className="text-sm font-semibold text-ink">{a.name}</p>
                <p className="mt-1.5 text-xs leading-relaxed text-muted">{a.desc}</p>
              </div>
            ))}
          </div>
          <div className="mt-8 flex justify-center">
            <button
              onClick={onGetStarted}
              className="rounded-xl bg-gradient-to-r from-accent to-accent2 px-8 py-3 text-sm font-semibold text-white shadow-glow-accent transition-transform hover:scale-[1.03]"
            >
              Start a review →
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
