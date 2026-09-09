"use client";
import { useEffect, useMemo, useState } from "react";
import { deleteRun, fetchDocumentStats, fetchRuns } from "@/lib/api";
import type { DocumentHistoryItem, DocumentStats } from "@/lib/types";

interface HistoricalDocumentsProps {
  onSelectRun: (runId: string) => void;
  onNewUpload: () => void;
  onBackToHome: () => void;
}

export default function HistoricalDocuments({
  onSelectRun,
  onNewUpload,
  onBackToHome,
}: HistoricalDocumentsProps) {
  const [runs, setRuns] = useState<DocumentHistoryItem[]>([]);
  const [stats, setStats] = useState<DocumentStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function loadData() {
    setLoading(true);
    setError(null);
    try {
      const [runsData, statsData] = await Promise.all([
        fetchRuns(100, 0),
        fetchDocumentStats().catch(() => null),
      ]);
      setRuns(runsData.items || []);
      if (statsData) setStats(statsData);
    } catch (err: any) {
      setError(err.message || "Failed to load document history");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  async function handleDelete(runId: string, e: React.MouseEvent) {
    e.stopPropagation();
    if (!confirm("Are you sure you want to delete this document analysis record?")) return;
    setDeletingId(runId);
    try {
      await deleteRun(runId);
      setRuns((prev) => prev.filter((r) => r.run_id !== runId));
      if (stats) {
        setStats({ ...stats, total_documents: Math.max(0, stats.total_documents - 1) });
      }
    } catch (err: any) {
      alert(`Delete failed: ${err.message}`);
    } finally {
      setDeletingId(null);
    }
  }

  const filteredRuns = useMemo(() => {
    return runs.filter((r) => {
      if (statusFilter === "pass" && r.overall_status !== "pass") return false;
      if (statusFilter === "fail" && r.overall_status !== "fail") return false;
      if (statusFilter === "human_review" && r.overall_status !== "human_review") return false;
      if (statusFilter === "error" && r.status !== "error") return false;
      if (statusFilter === "processing" && r.status !== "processing") return false;

      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const matchName = r.filename.toLowerCase().includes(q);
        const matchRules = r.rules_filename?.toLowerCase().includes(q);
        if (!matchName && !matchRules) return false;
      }
      return true;
    });
  }, [runs, statusFilter, searchQuery]);

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      {/* Top Breadcrumb / Nav */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <button
            onClick={onBackToHome}
            className="text-xs font-medium text-muted hover:text-ink transition-colors"
          >
            ← Home
          </button>
          <span className="text-dim">/</span>
          <h1 className="text-xl font-bold tracking-tight text-ink sm:text-2xl">
            Historical Document Repository
          </h1>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={loadData}
            className="rounded-xl border border-border bg-surface px-3 py-2 text-xs font-semibold text-muted hover:text-ink hover:border-borderHover transition-all"
          >
            ↻ Refresh
          </button>
          <button
            onClick={onNewUpload}
            className="rounded-xl bg-gradient-to-r from-accent to-accent2 px-4 py-2 text-xs font-semibold text-white shadow-glow-accent hover:scale-[1.02] transition-transform"
          >
            + Upload New Document
          </button>
        </div>
      </div>

      {/* Metrics Banner */}
      <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
        <div className="rounded-2xl border border-border bg-surface/80 p-4 shadow-card backdrop-blur">
          <p className="text-xs font-medium text-muted">Total Documents</p>
          <p className="mt-1.5 text-2xl font-bold tracking-tight text-ink">
            {stats ? stats.total_documents : runs.length}
          </p>
          <p className="mt-1 text-[11px] text-dim">Stored in database</p>
        </div>

        <div className="rounded-2xl border border-pass/30 bg-pass/5 p-4 shadow-card backdrop-blur">
          <p className="text-xs font-medium text-pass">Compliant (Pass)</p>
          <p className="mt-1.5 text-2xl font-bold tracking-tight text-pass">
            {stats ? stats.passed : runs.filter((r) => r.overall_status === "pass").length}
          </p>
          <p className="mt-1 text-[11px] text-dim">Zero policy breaches</p>
        </div>

        <div className="rounded-2xl border border-review/30 bg-review/5 p-4 shadow-card backdrop-blur">
          <p className="text-xs font-medium text-review">Human Review</p>
          <p className="mt-1.5 text-2xl font-bold tracking-tight text-review">
            {stats ? stats.human_review : runs.filter((r) => r.overall_status === "human_review").length}
          </p>
          <p className="mt-1 text-[11px] text-dim">Discretionary approval</p>
        </div>

        <div className="rounded-2xl border border-fail/30 bg-fail/5 p-4 shadow-card backdrop-blur">
          <p className="text-xs font-medium text-fail">Breached / Escalated</p>
          <p className="mt-1.5 text-2xl font-bold tracking-tight text-fail">
            {stats ? stats.failed : runs.filter((r) => r.overall_status === "fail").length}
          </p>
          <p className="mt-1 text-[11px] text-dim">Covenant / policy violations</p>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="relative flex-1 min-w-[240px]">
          <input
            type="text"
            placeholder="Search by filename or policy name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-xl border border-border bg-surface/80 px-4 py-2.5 text-xs text-ink placeholder-dim outline-none focus:border-accent"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-2.5 text-xs text-dim hover:text-ink"
            >
              ✕
            </button>
          )}
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          {[
            { id: "all", label: "All" },
            { id: "pass", label: "Passed" },
            { id: "human_review", label: "Needs Review" },
            { id: "fail", label: "Failed" },
            { id: "processing", label: "In Progress" },
            { id: "error", label: "Errors" },
          ].map((f) => (
            <button
              key={f.id}
              onClick={() => setStatusFilter(f.id)}
              className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition-all ${
                statusFilter === f.id
                  ? "bg-surface2 text-ink ring-1 ring-border shadow-sm"
                  : "text-muted hover:text-ink hover:bg-surface2/40"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content / List of Historical Documents */}
      {loading ? (
        <div className="rounded-3xl border border-border bg-surface/50 p-12 text-center">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-transparent" />
          <p className="mt-3 text-xs text-muted">Loading historical documents from database...</p>
        </div>
      ) : error ? (
        <div className="rounded-3xl border border-fail/40 bg-fail/10 p-8 text-center text-sm text-fail">
          {error}
        </div>
      ) : filteredRuns.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-border bg-surface/40 p-12 text-center">
          <p className="text-sm font-semibold text-ink">No documents found</p>
          <p className="mt-1 text-xs text-muted">
            {searchQuery || statusFilter !== "all"
              ? "Try adjusting your search or filters."
              : "Upload your first deal document to get started."}
          </p>
          <button
            onClick={onNewUpload}
            className="mt-4 rounded-xl bg-accent px-4 py-2 text-xs font-semibold text-white shadow-glow-accent hover:scale-[1.02]"
          >
            Upload Document
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredRuns.map((doc) => {
            const isDone = doc.status === "completed";
            const isProcessing = doc.status === "processing";
            const isError = doc.status === "error";

            const formattedDate = doc.created_at
              ? new Date(doc.created_at).toLocaleString(undefined, {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })
              : "Unknown date";

            return (
              <div
                key={doc.run_id}
                onClick={() => onSelectRun(doc.run_id)}
                className="group relative flex flex-col justify-between rounded-2xl border border-border bg-surface/80 p-5 transition-all duration-200 hover:-translate-y-0.5 hover:border-accent/50 hover:shadow-card cursor-pointer sm:flex-row sm:items-center"
              >
                <div className="flex items-start gap-4">
                  {/* File icon */}
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-border bg-surface2 text-accent2 group-hover:border-accent/50 group-hover:shadow-glow-accent/30 transition-all">
                    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                      <polyline points="14 2 14 8 20 8" />
                      <line x1="16" y1="13" x2="8" y2="13" />
                      <line x1="16" y1="17" x2="8" y2="17" />
                      <polyline points="10 9 9 9 8 9" />
                    </svg>
                  </div>

                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-sm font-bold text-ink group-hover:text-accent2 transition-colors">
                        {doc.filename}
                      </h3>

                      {/* Status Badges */}
                      {isDone && doc.overall_status && (
                        <span
                          className={`rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                            doc.overall_status === "pass"
                              ? "bg-pass/20 text-pass border border-pass/30"
                              : doc.overall_status === "fail"
                              ? "bg-fail/20 text-fail border border-fail/30"
                              : "bg-review/20 text-review border border-review/30"
                          }`}
                        >
                          {doc.overall_status === "human_review" ? "HUMAN REVIEW" : doc.overall_status.toUpperCase()}
                        </span>
                      )}

                      {isProcessing && (
                        <span className="flex items-center gap-1 rounded-md bg-accent/20 px-2 py-0.5 text-[10px] font-bold uppercase text-accent2 animate-pulse">
                          <span className="h-1.5 w-1.5 rounded-full bg-accent" />
                          Processing
                        </span>
                      )}

                      {isError && (
                        <span className="rounded-md bg-fail/20 px-2 py-0.5 text-[10px] font-bold uppercase text-fail">
                          Pipeline Error
                        </span>
                      )}
                    </div>

                    <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-muted">
                      <span>{formattedDate}</span>
                      <span>·</span>
                      <span className="font-mono text-[11px] text-dim">Policy: {doc.rules_filename}</span>
                    </div>

                    {/* Discovery Counters */}
                    {isDone && (
                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        <span className="rounded-lg bg-surface2 px-2.5 py-1 text-[11px] font-medium text-indigo border border-indigo/20">
                          {doc.term_count} terms extracted
                        </span>
                        <span className="rounded-lg bg-surface2 px-2.5 py-1 text-[11px] font-medium text-amber border border-amber/20">
                          {doc.risk_count} risks identified
                        </span>
                        <span className="rounded-lg bg-surface2 px-2.5 py-1 text-[11px] font-medium text-cyan border border-cyan/20">
                          {doc.rule_pass_count} passed / {doc.rule_fail_count} failed
                        </span>
                        {doc.escalation_count > 0 && (
                          <span className="rounded-lg bg-fail/15 px-2.5 py-1 text-[11px] font-bold text-fail border border-fail/30">
                            {doc.escalation_count} escalations
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Right Actions */}
                <div className="mt-4 flex items-center justify-end gap-2 sm:mt-0">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectRun(doc.run_id);
                    }}
                    className="rounded-xl border border-border bg-surface2 px-4 py-2 text-xs font-semibold text-ink group-hover:border-accent group-hover:bg-accent group-hover:text-white transition-all shadow-sm"
                  >
                    Open Analysis & Graph →
                  </button>

                  <button
                    type="button"
                    disabled={deletingId === doc.run_id}
                    onClick={(e) => handleDelete(doc.run_id, e)}
                    className="rounded-xl p-2 text-xs text-dim hover:text-fail hover:bg-fail/10 transition-colors"
                    title="Delete record"
                  >
                    🗑
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
