"use client";
import { useEffect, useState } from "react";
import type { StageState, StageStatus } from "@/lib/types";

export type AgentNodeDef = {
  key: string;
  label: string;
  shortRole: string;
  description: string;
  color: "cyan" | "indigo" | "violet" | "amber" | "accent";
  iconType: "doc" | "term" | "compliance" | "risk" | "orchestrator";
};

export const SPECIALIZED_AGENTS: AgentNodeDef[] = [
  {
    key: "Document Ingestion",
    label: "Document Ingestion",
    shortRole: "OCR & Clause Indexing",
    description: "Parses PDF/DOCX/MD, handles scanned pages, indexes exact clauses.",
    color: "cyan",
    iconType: "doc",
  },
  {
    key: "Term Extraction",
    label: "Term & Keyword Agent",
    shortRole: "Terms, Keywords & Evidence",
    description: "Extracts loan terms, entities, keywords with verbatim quote citations.",
    color: "indigo",
    iconType: "term",
  },
  {
    key: "Compliance Review",
    label: "Compliance Review Agent",
    shortRole: "Policy & Lending Rules",
    description: "Evaluates terms against lending policy rules in parallel batches.",
    color: "violet",
    iconType: "compliance",
  },
  {
    key: "Risk & Summary",
    label: "Risk & Synthesis Agent",
    shortRole: "Risk Ranking & Escalation",
    description: "Assesses risks, mitigations, executive summary, and escalation gate.",
    color: "amber",
    iconType: "risk",
  },
];

const COLOR_CLASSES = {
  cyan: {
    border: "border-cyan",
    glow: "shadow-glow-cyan",
    bg: "bg-cyan/10",
    text: "text-cyan",
    fill: "#22d3ee",
  },
  indigo: {
    border: "border-indigo",
    glow: "shadow-glow-indigo",
    bg: "bg-indigo/10",
    text: "text-indigo",
    fill: "#6f79ff",
  },
  violet: {
    border: "border-violet",
    glow: "shadow-glow-violet",
    bg: "bg-violet/10",
    text: "text-violet",
    fill: "#c17bff",
  },
  amber: {
    border: "border-amber",
    glow: "shadow-glow-amber",
    bg: "bg-amber/10",
    text: "text-amber",
    fill: "#ffb648",
  },
  accent: {
    border: "border-accent",
    glow: "shadow-glow-accent",
    bg: "bg-accent/15",
    text: "text-accent",
    fill: "#7c5cff",
  },
};

interface OrchestrationGraphProps {
  stages: StageState[];
  selectedNode?: string | null;
  onSelectNode?: (nodeKey: string) => void;
  isHeroDemo?: boolean;
  className?: string;
}

export default function OrchestrationGraph({
  stages,
  selectedNode,
  onSelectNode,
  isHeroDemo = false,
  className = "",
}: OrchestrationGraphProps) {
  // Demo auto-stepper for Home Page hero
  const [demoStep, setDemoStep] = useState<number>(1);

  useEffect(() => {
    if (!isHeroDemo) return;
    const timer = setInterval(() => {
      setDemoStep((prev) => (prev % 4) + 1);
    }, 3200);
    return () => clearInterval(timer);
  }, [isHeroDemo]);

  // Derive stage dictionary
  const stageMap: Record<string, StageState> = {};
  for (const s of stages) {
    stageMap[s.name] = s;
  }

  // Determine current active agent & orchestrator status
  let activeAgentKey: string | null = null;
  let orchestratorStateText = "Standing By";
  let orchestratorSubText = "Ready to coordinate analysis pipeline";

  if (isHeroDemo) {
    const demoAgent = SPECIALIZED_AGENTS[demoStep - 1];
    activeAgentKey = demoAgent.key;
    orchestratorStateText = `Routing to ${demoAgent.label}`;
    orchestratorSubText = `Active state coordination · Step ${demoStep} of 4`;
  } else {
    const activeStage = stages.find((s) => s.status === "active" || s.status === "retrying");
    const anyError = stages.some((s) => s.status === "error");
    const allDone = stages.length > 0 && stages.every((s) => s.status === "done");

    if (activeStage) {
      activeAgentKey = activeStage.name;
      if (activeStage.name === "Document Ingestion") {
        orchestratorStateText = "Ingesting & Indexing Clauses";
        orchestratorSubText = "Extracting text and mapping document sections";
      } else if (activeStage.name === "Term Extraction") {
        orchestratorStateText = activeStage.status === "retrying" ? "Re-verifying Citations" : "Extracting Terms & Keywords";
        orchestratorSubText = "Grounding claims against verbatim clause text";
      } else if (activeStage.name === "Compliance Review") {
        orchestratorStateText = "Evaluating Compliance Rules";
        orchestratorSubText = "Fanning out parallel policy verification batches";
      } else if (activeStage.name === "Risk & Summary") {
        orchestratorStateText = "Synthesizing Risk & Escalations";
        orchestratorSubText = "Prioritizing exposures and writing report";
      }
    } else if (allDone) {
      orchestratorStateText = "Review Complete";
      orchestratorSubText = "All agents finished · Report ready for audit";
    } else if (anyError) {
      orchestratorStateText = "Pipeline Halted";
      orchestratorSubText = "An error occurred during agent execution";
    }
  }

  function getAgentStatus(agentKey: string): StageStatus {
    if (isHeroDemo) {
      const idx = SPECIALIZED_AGENTS.findIndex((a) => a.key === agentKey);
      if (idx === demoStep - 1) return "active";
      if (idx < demoStep - 1) return "done";
      return "pending";
    }
    return stageMap[agentKey]?.status || "pending";
  }

  function getAgentDiscoveryBadge(agentKey: string) {
    if (isHeroDemo) {
      if (agentKey === "Document Ingestion") return "142 Clauses Indexed";
      if (agentKey === "Term Extraction") return "18 Keywords · 14 Terms";
      if (agentKey === "Compliance Review") return "15 Rules Evaluated";
      if (agentKey === "Risk & Summary") return "4 Risks · 1 Escalation";
    }
    const stage = stageMap[agentKey];
    if (!stage) return null;
    if (agentKey === "Document Ingestion" && stage.clause_count) {
      return `${stage.clause_count} Clauses`;
    }
    if (agentKey === "Term Extraction" && stage.terms?.length) {
      const kwCount = stage.keywords?.length || stage.terms.length;
      return `${kwCount} Keywords · ${stage.terms.length} Terms`;
    }
    if (agentKey === "Compliance Review" && stage.rule_results?.length) {
      const pass = stage.passed_count ?? 0;
      const fail = stage.failed_count ?? 0;
      return `${stage.rule_results.length} Rules (${pass}P / ${fail}F)`;
    }
    if (agentKey === "Risk & Summary" && stage.risks) {
      return `${stage.risks.length} Risks Identified`;
    }
    if (stage.status === "done" && stage.message) {
      return stage.message;
    }
    return null;
  }

  return (
    <div className={`relative overflow-hidden rounded-3xl border border-border bg-surface/80 p-5 shadow-card backdrop-blur sm:p-8 ${className}`}>
      {/* Background ambient lighting */}
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_50%_40%,rgba(124,92,255,0.08),transparent_70%)]" />

      {/* Top Header bar with live orchestrator status indicator */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 border-b border-border/70 pb-4">
        <div className="flex items-center gap-2.5">
          <div className="relative flex h-3 w-3 items-center justify-center">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-accent" />
          </div>
          <span className="text-xs font-semibold uppercase tracking-wider text-ink">
            {isHeroDemo ? "Live Agent Orchestration Architecture" : "Agent Orchestration Pipeline"}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span className="rounded-full border border-border bg-surface2 px-3 py-1 text-[11px] font-medium text-muted">
            State: <span className="text-accent2 font-semibold">{orchestratorStateText}</span>
          </span>
          {isHeroDemo && (
            <span className="rounded-full border border-cyan/30 bg-cyan/10 px-2.5 py-0.5 text-[10px] font-medium text-cyan">
              Interactive Demo
            </span>
          )}
        </div>
      </div>

      {/* Central Orchestrator & Agents Network */}
      <div className="relative mx-auto flex flex-col items-center">
        {/* Central Orchestrator Node */}
        <div className="relative z-10 mb-8 sm:mb-12">
          <button
            type="button"
            onClick={() => onSelectNode?.("orchestrator")}
            className={`group relative flex flex-col items-center rounded-2xl border-2 bg-surface2/90 px-6 py-4 transition-all duration-300 ${
              selectedNode === "orchestrator"
                ? "border-accent ring-2 ring-accent/50 shadow-glow-accent scale-[1.03]"
                : "border-accent/40 hover:border-accent hover:shadow-glow-accent"
            }`}
          >
            {/* Pulsing halo */}
            <span className="absolute -inset-1 rounded-2xl bg-accent/20 blur-md transition-opacity group-hover:opacity-100" />

            <div className="relative flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-accent text-white shadow-glow-accent">
                {/* Hub/Brain icon */}
                <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="4" y="4" width="16" height="16" rx="4" />
                  <circle cx="12" cy="12" r="3" />
                  <path d="M12 2v2M12 20v2M2 12h2M20 12h2" />
                </svg>
              </div>
              <div className="text-left">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-bold text-ink tracking-tight">Main Orchestrator Agent</p>
                  <span className="rounded-full bg-accent/20 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-accent2">
                    Core Router
                  </span>
                </div>
                <p className="text-xs text-muted">{orchestratorSubText}</p>
              </div>
            </div>

            {/* Active wire animation indicator */}
            {activeAgentKey && (
              <div className="mt-2.5 flex items-center gap-1.5 text-[11px] font-medium text-accent">
                <span className="h-1.5 w-1.5 rounded-full bg-accent animate-pulse" />
                Active dispatch: <span className="font-semibold text-ink">{activeAgentKey}</span>
              </div>
            )}
          </button>
        </div>

        {/* Trunk connector from orchestrator down to the agent grid */}
        <div className="mb-4 h-6 w-px bg-gradient-to-b from-accent/50 to-border" />

        {/* Specialized Agents Grid */}
        <div className={`grid w-full grid-cols-1 gap-3 sm:grid-cols-2 ${isHeroDemo ? "lg:grid-cols-4" : ""}`}>
          {SPECIALIZED_AGENTS.map((agent) => {
            const status = getAgentStatus(agent.key);
            const discoveryBadge = getAgentDiscoveryBadge(agent.key);
            const isSelected = selectedNode === agent.key;
            const isActive = status === "active" || status === "retrying";
            const isDone = status === "done";
            const isError = status === "error";
            const colorMeta = COLOR_CLASSES[agent.color];

            return (
              <div
                key={agent.key}
                onClick={() => onSelectNode?.(agent.key)}
                className={`group relative flex flex-col justify-between rounded-2xl border-2 p-4 cursor-pointer transition-all duration-200 bg-surface/90 hover:-translate-y-0.5 ${
                  isSelected
                    ? `${colorMeta.border} ${colorMeta.glow} ring-2 ring-current bg-surface2/90`
                    : isActive
                    ? `${colorMeta.border} ${colorMeta.glow} bg-surface2/60 glow-breathe`
                    : isDone
                    ? "border-pass/60 bg-surface hover:border-pass hover:shadow-glow-pass"
                    : isError
                    ? "border-fail bg-fail/10"
                    : "border-border hover:border-borderHover bg-surface/50 opacity-85 hover:opacity-100"
                }`}
              >
                {/* Active pulsating beacon */}
                {isActive && (
                  <span className={`absolute -top-1.5 -right-1.5 flex h-3.5 w-3.5 items-center justify-center`}>
                    <span className={`absolute inline-flex h-full w-full animate-ping rounded-full ${colorMeta.text} opacity-75`} />
                    <span className={`relative inline-flex h-2 w-2 rounded-full ${colorMeta.bg}`} />
                  </span>
                )}

                <div>
                  {/* Top card status badge */}
                  <div className="flex items-center justify-between gap-2 mb-2.5">
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${
                      isActive
                        ? `${colorMeta.bg} ${colorMeta.text}`
                        : isDone
                        ? "bg-pass/15 text-pass"
                        : isError
                        ? "bg-fail/20 text-fail"
                        : "bg-surface2 text-dim"
                    }`}>
                      {isActive ? (status === "retrying" ? "Retrying" : "Active") : isDone ? "Completed" : isError ? "Failed" : "Waiting"}
                    </span>

                    {/* Step indicator */}
                    <span className="text-[10px] font-mono text-dim">
                      {isDone ? (
                        <span className="font-bold text-pass">✓</span>
                      ) : isActive ? (
                        <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-transparent border-t-current text-current" />
                      ) : (
                        "○"
                      )}
                    </span>
                  </div>

                  {/* Agent Title & Role */}
                  <h4 className={`text-sm font-bold tracking-tight transition-colors ${
                    isSelected ? colorMeta.text : "text-ink group-hover:text-white"
                  }`}>
                    {agent.label}
                  </h4>
                  <p className="mt-0.5 text-[11px] font-medium text-dim">
                    {agent.shortRole}
                  </p>
                  <p className="mt-2 text-xs leading-relaxed text-muted line-clamp-2">
                    {agent.description}
                  </p>
                </div>

                {/* Discovery Badge / Real-time Output preview */}
                <div className="mt-4 flex flex-col items-start gap-1.5 border-t border-border/60 pt-2.5">
                  {discoveryBadge ? (
                    <>
                      <span className={`inline-flex max-w-full items-center gap-1 rounded-md px-2 py-1 text-[11px] font-semibold ${
                        isDone
                          ? "bg-pass/15 text-pass border border-pass/30"
                          : isActive
                          ? `${colorMeta.bg} ${colorMeta.text} border ${colorMeta.border}`
                          : "bg-surface2 text-muted"
                      }`}>
                        <span className="shrink-0 text-[10px]">⚡</span>
                        <span className="truncate">{discoveryBadge}</span>
                      </span>
                      <span className="text-[10px] text-accent2 group-hover:underline">Inspect →</span>
                    </>
                  ) : (
                    <span className="text-[11px] text-dim">Awaiting data stream...</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Bottom Hint */}
      <div className="mt-6 flex items-center justify-between text-xs text-muted">
        <span className="flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-pass" />
          Click any agent node above to inspect intermediate and completed findings in the details panel.
        </span>
        {selectedNode && (
          <span className="font-medium text-ink">
            Currently inspecting: <span className="text-accent2">{selectedNode}</span>
          </span>
        )}
      </div>
    </div>
  );
}
