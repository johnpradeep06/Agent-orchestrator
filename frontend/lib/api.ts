// NEXT_PUBLIC_API_BASE (set in Vercel project settings) always wins. Without it, default to
// the deployed Railway backend unless we're actually running on localhost.
const PROD_API_BASE = "https://backend-production-0fd49.up.railway.app";

export const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE ||
  (typeof window !== "undefined" && window.location.hostname !== "localhost" ? PROD_API_BASE : "http://localhost:8000");

export async function submitRun(file: File, rulesFile: File | null): Promise<string> {
  const form = new FormData();
  form.append("file", file);
  if (rulesFile) form.append("rules_file", rulesFile);
  const res = await fetch(`${API_BASE}/runs`, { method: "POST", body: form });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.detail || `Upload failed (${res.status})`);
  }
  const data = await res.json();
  return data.run_id as string;
}

export async function fetchRun(runId: string) {
  const res = await fetch(`${API_BASE}/runs/${runId}`);
  if (!res.ok) throw new Error(`Failed to fetch run ${runId}`);
  return res.json();
}
