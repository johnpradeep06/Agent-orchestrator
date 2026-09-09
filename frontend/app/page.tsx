"use client";
import { useCallback, useRef, useState } from "react";
import UploadForm from "@/components/UploadForm";
import Timeline from "@/components/Timeline";
import ReportView from "@/components/ReportView";
import { API_BASE, fetchRun, submitRun } from "@/lib/api";
import type { DealResult, StageState, StreamEvent } from "@/lib/types";

const STAGE_ORDER = ["Document Ingestion", "Term Extraction", "Compliance Review", "Risk & Summary"];

function initialStages(): StageState[] {
  return STAGE_ORDER.map((name) => ({ name, status: "pending", warnings: [] }));
}

type ViewState = "empty" | "processing" | "completed" | "run_error";

export default function Home() {
  const [view, setView] = useState<ViewState>("empty");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [stages, setStages] = useState<StageState[]>(initialStages());
  const [showTrace, setShowTrace] = useState(true);
  const [result, setResult] = useState<DealResult | null>(null);
  const [runId, setRunId] = useState<string | null>(null);
  const [fatalError, setFatalError] = useState<string | null>(null);
  const esRef = useRef<EventSource | null>(null);

  const applyEvent = useCallback((evt: StreamEvent) => {
    if (evt.stage === "Report" && evt.status === "done") {
      return; // handled by caller after fetching the full run
    }
    if (evt.stage === "System") {
      setStages((prev) => {
        const idx = [...prev].reverse().findIndex((s) => s.status === "active" || s.status === "retrying");
        if (idx === -1) return prev;
        const realIdx = prev.length - 1 - idx;
        const next = [...prev];
        next[realIdx] = { ...next[realIdx], warnings: [...next[realIdx].warnings, evt.message || "Unknown issue"] };
        return next;
      });
      return;
    }
    setStages((prev) =>
      prev.map((s) =>
        s.name === evt.stage
          ? { ...s, status: (evt.status as StageState["status"]) || s.status, message: evt.message ?? s.message, notes: evt.notes ?? s.notes }
          : s
      )
    );
  }, []);

  async function handleSubmit(file: File, rulesFile: File | null) {
    setSubmitting(true);
    setSubmitError(null);
    try {
      const id = await submitRun(file, rulesFile);
      setRunId(id);
      setStages(initialStages());
      setShowTrace(true);
      setView("processing");

      const es = new EventSource(`${API_BASE}/runs/${id}/events`);
      esRef.current = es;

      es.onmessage = async (e) => {
        const evt: StreamEvent = JSON.parse(e.data);
        if (evt.stage === "Report" && evt.status === "done") {
          try {
            const run = await fetchRun(id);
            setResult(run.result as DealResult);
            setView("completed");
            setShowTrace(false);
          } catch {
            setFatalError("Pipeline finished but the report could not be loaded.");
            setView("run_error");
          }
          return;
        }
        if (evt.stage === "System" && evt.status === "error") {
          setFatalError(evt.message || "The pipeline failed.");
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

  function reset() {
    esRef.current?.close();
    setView("empty");
    setResult(null);
    setRunId(null);
    setFatalError(null);
    setStages(initialStages());
  }

  return (
    <main className="min-h-screen">
      <header className="border-b border-border bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-3">
          <span className="text-sm font-semibold tracking-tight">Deal Review — AI Analyst</span>
          {view !== "empty" && (
            <button onClick={reset} className="text-xs font-medium text-muted hover:text-ink">
              New review
            </button>
          )}
        </div>
      </header>

      <div className="px-6 py-12">
        {view === "empty" && <UploadForm onSubmit={handleSubmit} submitting={submitting} errorMessage={submitError} />}

        {(view === "processing" || view === "run_error") && (
          <div className="space-y-4">
            <p className="text-center text-xs font-medium uppercase tracking-wide text-muted">
              {view === "run_error" ? "Pipeline error" : "Processing"}
            </p>
            <Timeline stages={stages} />
            {fatalError && (
              <p className="mx-auto max-w-2xl rounded-lg border border-fail/30 bg-fail/5 px-4 py-3 text-center text-sm text-fail">
                {fatalError}
              </p>
            )}
          </div>
        )}

        {view === "completed" && result && (
          <div className="space-y-6">
            {showTrace && (
              <div className="space-y-2">
                <Timeline stages={stages} />
                <p className="text-center">
                  <button onClick={() => setShowTrace(false)} className="text-xs font-medium text-accent hover:underline">
                    Hide activity trace
                  </button>
                </p>
              </div>
            )}
            <ReportView result={result} onShowTrace={() => setShowTrace(true)} />
          </div>
        )}
      </div>
    </main>
  );
}
