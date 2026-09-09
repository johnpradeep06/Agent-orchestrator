"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import HomePage from "@/components/HomePage";
import UploadForm from "@/components/UploadForm";
import OrchestrationGraph from "@/components/OrchestrationGraph";
import NodeDetailsPanel from "@/components/NodeDetailsPanel";
import HistoricalDocuments from "@/components/HistoricalDocuments";
import ReportView from "@/components/ReportView";
import { API_BASE, fetchDocumentStats, fetchRun, submitRun } from "@/lib/api";
import type { DealResult, Risk, RuleResult, StageState, StreamEvent, Term } from "@/lib/types";

const STAGE_ORDER = ["Document Ingestion", "Term Extraction", "Compliance Review", "Risk & Summary"];

function initialStages(): StageState[] {
  return STAGE_ORDER.map((name) => ({ name, status: "pending", warnings: [] }));
}

type ViewState = "home" | "upload" | "processing" | "completed" | "history" | "run_error";

interface LiveDataState {
  sample_clauses: { id: string; text: string }[];
  notes: string[];
  terms: Term[];
  keywords: string[];
  rule_results: RuleResult[];
  risks: Risk[];
  executive_summary: string;
  follow_up_actions: string[];
  escalations: string[];
}

const initialLiveData: LiveDataState = {
  sample_clauses: [],
  notes: [],
  terms: [],
  keywords: [],
  rule_results: [],
  risks: [],
  executive_summary: "",
  follow_up_actions: [],
  escalations: [],
};

export default function Home() {
  const [view, setView] = useState<ViewState>("home");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [stages, setStages] = useState<StageState[]>(initialStages());
  const [selectedNode, setSelectedNode] = useState<string>("orchestrator");
  const [liveData, setLiveData] = useState<LiveDataState>(initialLiveData);
  const [reportMarkdown, setReportMarkdown] = useState<string | null>(null);
  const [showFullReportView, setShowFullReportView] = useState(false);
  const [result, setResult] = useState<DealResult | null>(null);
  const [runId, setRunId] = useState<string | null>(null);
  const [activeFilename, setActiveFilename] = useState<string | null>(null);
  const [docCount, setDocCount] = useState<number | null>(null);
  const [fatalError, setFatalError] = useState<string | null>(null);
  const esRef = useRef<EventSource | null>(null);

  // Load document count for header badge
  useEffect(() => {
    fetchDocumentStats()
      .then((s) => setDocCount(s.total_documents))
      .catch(() => {});
  }, [view]);

  const applyEvent = useCallback((evt: StreamEvent) => {
    if (evt.stage === "Report" && evt.status === "done") {
      if (evt.report_markdown) setReportMarkdown(evt.report_markdown);
      if (evt.escalations) {
        setLiveData((prev) => ({ ...prev, escalations: evt.escalations || [] }));
      }
      return;
    }

    if (evt.stage === "System") {
      setStages((prev) => {
        const idx = [...prev].reverse().findIndex((s) => s.status === "active" || s.status === "retrying");
        if (idx === -1) return prev;
        const realIdx = prev.length - 1 - idx;
        const next = [...prev];
        next[realIdx] = {
          ...next[realIdx],
          warnings: [...next[realIdx].warnings, evt.message || "Unknown issue"],
        };
        return next;
      });
      return;
    }

    // Accumulate live intermediate structured payloads
    setLiveData((prev) => {
      const updated = { ...prev };
      if (evt.sample_clauses?.length) updated.sample_clauses = evt.sample_clauses;
      if (evt.notes?.length) updated.notes = evt.notes;
      if (evt.terms?.length) {
        updated.terms = evt.terms;
        updated.keywords = evt.keywords || Array.from(new Set(evt.terms.map((t) => t.name)));
      }
      if (evt.rule_results?.length) updated.rule_results = evt.rule_results;
      if (evt.risks?.length) updated.risks = evt.risks;
      if (evt.executive_summary) updated.executive_summary = evt.executive_summary;
      if (evt.follow_up_actions?.length) updated.follow_up_actions = evt.follow_up_actions;
      if (evt.escalations?.length) updated.escalations = evt.escalations;
      return updated;
    });

    // Auto-focus selectedNode to the active agent if user hasn't explicitly selected another
    if (evt.status === "active" || evt.status === "retrying") {
      setSelectedNode(evt.stage);
    }

    setStages((prev) =>
      prev.map((s) =>
        s.name === evt.stage
          ? {
              ...s,
              status: (evt.status as StageState["status"]) || s.status,
              message: evt.message ?? s.message,
              notes: evt.notes ?? s.notes,
              clause_count: evt.clause_count ?? s.clause_count,
              sample_clauses: evt.sample_clauses ?? s.sample_clauses,
              terms: evt.terms ?? s.terms,
              keywords: evt.keywords ?? s.keywords,
              rule_results: evt.rule_results ?? s.rule_results,
              passed_count: evt.passed_count ?? s.passed_count,
              failed_count: evt.failed_count ?? s.failed_count,
              review_count: evt.review_count ?? s.review_count,
              risks: evt.risks ?? s.risks,
              executive_summary: evt.executive_summary ?? s.executive_summary,
              follow_up_actions: evt.follow_up_actions ?? s.follow_up_actions,
            }
          : s
      )
    );
  }, []);

  async function handleSubmit(file: File, rulesFile: File | null) {
    setSubmitting(true);
    setSubmitError(null);
    setActiveFilename(file.name);
    try {
      const id = await submitRun(file, rulesFile);
      setRunId(id);
      setStages(initialStages());
      setLiveData(initialLiveData);
      setReportMarkdown(null);
      setShowFullReportView(false);
      setSelectedNode("Document Ingestion");
      setView("processing");

      const es = new EventSource(`${API_BASE}/runs/${id}/events`);
      esRef.current = es;

      es.onmessage = async (e) => {
        const evt: StreamEvent = JSON.parse(e.data);
        if (evt.stage === "Report" && evt.status === "done") {
          try {
            const run = await fetchRun(id);
            setResult(run.result as DealResult);
            if (run.report_markdown) setReportMarkdown(run.report_markdown);
            setView("completed");
          } catch {
            setFatalError("Pipeline finished but the report could not be loaded.");
            setView("run_error");
          }
          return;
        }
        if (evt.stage === "System" && evt.status === "error") {
          setFatalError(evt.message || "The pipeline encountered a system error.");
        }
        applyEvent(evt);
      };

      es.addEventListener("done", () => {
        es.close();
      });

      es.onerror = () => {
        es.close();
      };
    } catch (err: any) {
      setSubmitError(err.message || "Upload failed");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleOpenHistoricalRun(id: string) {
    try {
      setRunId(id);
      const data = await fetchRun(id);
      setActiveFilename(data.filename || "Historical Document");
      if (data.result) {
        const terms: Term[] = data.result.terms || [];
        const rule_results: RuleResult[] = data.result.rule_results || [];
        const risks: Risk[] = data.result.risks || [];
        const keywords: string[] = Array.from(new Set(terms.map((t) => t.name)));

        setResult(data.result as DealResult);
        setStages([
          {
            name: "Document Ingestion",
            status: "done",
            warnings: [],
            message: "Indexed & processed",
            clause_count: data.result.clause_count || 14,
          },
          {
            name: "Term Extraction",
            status: "done",
            warnings: [],
            terms,
            keywords,
            message: `${terms.length} terms extracted`,
          },
          {
            name: "Compliance Review",
            status: "done",
            warnings: [],
            rule_results,
            passed_count: rule_results.filter((r: any) => r.status === "pass").length,
            failed_count: rule_results.filter((r: any) => r.status === "fail").length,
            review_count: rule_results.filter((r: any) => r.status === "needs_human_review").length,
            message: `${rule_results.length} rules evaluated`,
          },
          {
            name: "Risk & Summary",
            status: "done",
            warnings: [],
            risks,
            message: `${risks.length} risks identified`,
          },
        ]);
        setLiveData({
          terms,
          keywords,
          rule_results,
          risks,
          executive_summary: data.result.executive_summary || "",
          follow_up_actions: data.result.follow_up_actions || [],
          escalations: data.result.escalations || [],
          notes: [],
          sample_clauses: [],
        });
        setReportMarkdown(data.report_markdown || null);
        setSelectedNode("orchestrator");
        setShowFullReportView(false);
        setView("completed");
      } else {
        alert("This historical document analysis has no result record or failed.");
      }
    } catch (err: any) {
      alert(`Failed to load document analysis: ${err.message}`);
    }
  }

  function reset() {
    esRef.current?.close();
    setView("home");
    setResult(null);
    setRunId(null);
    setActiveFilename(null);
    setFatalError(null);
    setStages(initialStages());
    setLiveData(initialLiveData);
    setReportMarkdown(null);
    setShowFullReportView(false);
  }

  return (
    <main className="min-h-screen">
      {/* Sticky Header */}
      <header className="sticky top-0 z-20 border-b border-border bg-bg/85 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-3.5">
          <button
            onClick={reset}
            className="flex items-center gap-2.5 text-sm font-semibold tracking-tight text-ink transition-colors hover:text-accent2"
          >
            <span className="h-2 w-2 rounded-full bg-accent shadow-glow-accent" />
            <span>Deal Review — AI Orchestrator</span>
          </button>

          <div className="flex items-center gap-3">
            {/* View Historical Documents button */}
            <button
              onClick={() => setView("history")}
              className={`flex items-center gap-2 rounded-xl px-3 py-1.5 text-xs font-semibold transition-all ${
                view === "history"
                  ? "bg-surface2 text-ink ring-1 ring-border"
                  : "text-muted hover:text-ink hover:bg-surface2/60"
              }`}
            >
              <span>Historical Documents</span>
              {docCount !== null && (
                <span className="rounded-full bg-surface3 px-2 py-0.5 text-[10px] font-bold text-accent2">
                  {docCount}
                </span>
              )}
            </button>

            {view !== "home" && (
              <button
                onClick={() => setView("upload")}
                className="rounded-xl bg-accent px-3.5 py-1.5 text-xs font-semibold text-white shadow-glow-accent hover:scale-[1.02] transition-transform"
              >
                + New Review
              </button>
            )}
          </div>
        </div>
      </header>

      {/* 1. HOME VIEW */}
      {view === "home" && (
        <HomePage
          onGetStarted={() => setView("upload")}
          onViewHistory={() => setView("history")}
        />
      )}

      {/* 2. UPLOAD VIEW */}
      {view === "upload" && (
        <div className="px-6 py-16">
          <UploadForm onSubmit={handleSubmit} submitting={submitting} errorMessage={submitError} />
        </div>
      )}

      {/* 3. HISTORICAL DOCUMENTS REPOSITORY VIEW */}
      {view === "history" && (
        <HistoricalDocuments
          onSelectRun={handleOpenHistoricalRun}
          onNewUpload={() => setView("upload")}
          onBackToHome={() => setView("home")}
        />
      )}

      {/* 4. PROCESSING & COMPLETED DUAL-VIEW (SIMULTANEOUS GRAPH + NODE DETAILS) */}
      {(view === "processing" || view === "completed" || view === "run_error") && (
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
          {/* Breadcrumb and Document Meta Header */}
          <div className="mb-6 flex flex-wrap items-center justify-between gap-4 border-b border-border/60 pb-4">
            <div className="flex items-center gap-3">
              <span className="rounded-xl border border-border bg-surface2 px-3 py-1 text-xs font-mono text-muted">
                {activeFilename || "Deal Document"}
              </span>
              <span className="text-xs text-dim">·</span>
              <span
                className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider ${
                  view === "completed"
                    ? "bg-pass/15 text-pass border border-pass/30"
                    : view === "run_error"
                    ? "bg-fail/20 text-fail"
                    : "bg-accent/15 text-accent2 border border-accent/30 animate-pulse"
                }`}
              >
                {view === "completed" ? "Analysis Ready" : view === "run_error" ? "Pipeline Error" : "Live Processing"}
              </span>
            </div>

            {/* View Mode Toggle when Completed */}
            {view === "completed" && result && (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowFullReportView(!showFullReportView)}
                  className="rounded-xl border border-border bg-surface px-3.5 py-1.5 text-xs font-semibold text-ink hover:border-accent2 transition-colors"
                >
                  {showFullReportView ? "← Back to Dual Graph View" : "View Full Structured Report →"}
                </button>
              </div>
            )}
          </div>

          {/* Fatal Error Callout */}
          {fatalError && (
            <div className="mb-6 rounded-2xl border border-fail/40 bg-fail/10 p-4 text-center text-sm text-fail">
              {fatalError}
            </div>
          )}

          {/* Full Report View Toggle (if user prefers the traditional comprehensive report) */}
          {showFullReportView && result ? (
            <div className="space-y-6">
              <ReportView result={result} onShowTrace={() => setShowFullReportView(false)} />
            </div>
          ) : (
            /* SIMULTANEOUS DUAL-VIEW LAYOUT:
               Both the Live Orchestration Graph AND the Node Details Panel
               remain visible and usable concurrently! */
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 items-start">
              {/* Left Column: Live Agent Orchestration Graph */}
              <div className="lg:col-span-6 xl:col-span-6 space-y-4">
                <OrchestrationGraph
                  stages={stages}
                  selectedNode={selectedNode}
                  onSelectNode={(nodeKey) => setSelectedNode(nodeKey)}
                />
              </div>

              {/* Right Column: Interactive Node Details Panel */}
              <div className="lg:col-span-6 xl:col-span-6">
                <div className="min-h-[580px] lg:sticky lg:top-20">
                  <NodeDetailsPanel
                    selectedNode={selectedNode}
                    onSelectNode={(nodeKey) => setSelectedNode(nodeKey)}
                    stages={stages}
                    result={result}
                    liveTerms={liveData.terms}
                    liveKeywords={liveData.keywords}
                    liveRuleResults={liveData.rule_results}
                    liveRisks={liveData.risks}
                    liveSummary={liveData.executive_summary}
                    liveFollowUps={liveData.follow_up_actions}
                    liveEscalations={liveData.escalations}
                    liveClauses={liveData.sample_clauses}
                    liveNotes={liveData.notes}
                    reportMarkdown={reportMarkdown}
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </main>
  );
}

