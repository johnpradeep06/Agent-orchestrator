"use client";
import { useRef, useState } from "react";

export default function UploadForm({
  onSubmit,
  submitting,
  errorMessage,
}: {
  onSubmit: (file: File, rulesFile: File | null) => void;
  submitting: boolean;
  errorMessage?: string | null;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [rulesFile, setRulesFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const accept = (f: File) => /\.(pdf|docx|md|txt)$/i.test(f.name);

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files?.[0];
    if (f && accept(f)) setFile(f);
  }

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-8 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">Deal Review</h1>
        <p className="mt-1.5 text-sm text-muted">
          Upload a deal document and a compliance policy for automated multi-agent review.
        </p>
      </div>

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className={`cursor-pointer rounded-xl border-2 border-dashed p-12 text-center transition-colors ${
          dragOver ? "border-accent bg-accent/5" : "border-border bg-white hover:border-accent/40"
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,.docx,.md,.txt"
          className="hidden"
          onChange={(e) => e.target.files?.[0] && setFile(e.target.files[0])}
        />
        {file ? (
          <div>
            <p className="font-medium">{file.name}</p>
            <p className="mt-1 text-xs text-muted">{(file.size / 1024).toFixed(0)} KB — click to replace</p>
          </div>
        ) : (
          <div>
            <p className="font-medium">Drop deal document here, or click to browse</p>
            <p className="mt-1 text-xs text-muted">PDF, DOCX, Markdown, or TXT — scanned pages are OCR&apos;d automatically</p>
          </div>
        )}
      </div>

      <div className="mt-4 flex items-center justify-between rounded-lg border border-border bg-white px-4 py-3 text-sm">
        <div>
          <p className="font-medium">Compliance policy</p>
          <p className="text-xs text-muted">{rulesFile ? rulesFile.name : "Using default lending policy (rules/lending_policy.yaml)"}</p>
        </div>
        <label className="cursor-pointer rounded-md border border-border px-3 py-1.5 text-xs font-medium hover:border-accent/40">
          {rulesFile ? "Change" : "Upload custom (.yaml)"}
          <input
            type="file"
            accept=".yaml,.yml"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && setRulesFile(e.target.files[0])}
          />
        </label>
      </div>

      {errorMessage && (
        <p className="mt-3 rounded-md border border-fail/30 bg-fail/5 px-3 py-2 text-sm text-fail">{errorMessage}</p>
      )}

      <button
        disabled={!file || submitting}
        onClick={() => file && onSubmit(file, rulesFile)}
        className="mt-5 w-full rounded-lg bg-ink py-3 text-sm font-semibold text-white transition-opacity disabled:opacity-30 hover:opacity-90"
      >
        {submitting ? "Uploading…" : "Run Deal Review"}
      </button>
    </div>
  );
}
