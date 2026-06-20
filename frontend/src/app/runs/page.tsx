"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import type { Run, RunComparison } from "@/lib/types";
import { PageHelp } from "@/components/help/PageHelp";
import { AlertTriangle, CheckCircle2, GitCompareArrows, Send } from "lucide-react";

export default function RunsPage() {
  const [runs, setRuns] = useState<Run[]>([]);
  const [selectedRuns, setSelectedRuns] = useState<string[]>([]);
  const [comparison, setComparison] = useState<RunComparison | null>(null);
  const [publishTarget, setPublishTarget] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    api.workflows
      .runs()
      .then(setRuns)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  function toggleRun(runId: string) {
    setSelectedRuns((current) => {
      if (current.includes(runId)) return current.filter((id) => id !== runId);
      return [...current.slice(-1), runId];
    });
  }

  async function compareSelected() {
    if (selectedRuns.length !== 2) return;
    setComparison(await api.workflows.compareRuns(selectedRuns[0], selectedRuns[1]));
  }

  async function publishRun(runId: string) {
    setMessage("");
    const event = await api.workflows.publishRun(runId, {
      target_type: publishTarget ? "github_pr_comment" : "downloadable_run_package",
      target_reference: publishTarget || undefined,
      mode: publishTarget ? "publish" : "draft",
    });
    setMessage(`Publish event saved: ${event.status}`);
  }

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-slate-900">Run History</h2>
        <p className="mt-0.5 text-sm text-slate-500">Your generated outputs and blocked attempts.</p>
      </div>

      <div className="mb-6">
        <PageHelp
          title="Use this page to inspect previous workflow runs."
          description="Run History shows generated outputs, blocked attempts, comparison tools, and publishing/export events."
          steps={[
            "Review each run result, model, latency, timestamp, and output preview.",
            "Select two runs and compare them when you need to choose the stronger output.",
            "Enter a GitHub PR URL when you want a publish event tied to a target review thread.",
            "Open the source workflow from the library when a run reveals a prompt, style, or test gap.",
          ]}
        />
      </div>

      {error && <p className="mb-4 text-sm text-red-600">{error}</p>}
      {message && <p className="mb-4 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{message}</p>}
      {loading ? (
        <div className="h-48 animate-pulse rounded-lg border border-slate-200 bg-white" />
      ) : runs.length === 0 ? (
        <div className="rounded-lg border border-slate-200 bg-white p-10 text-center text-slate-500">
          No runs yet.
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-3 rounded-lg border border-slate-200 bg-white p-4">
            <button onClick={compareSelected} disabled={selectedRuns.length !== 2} className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50">
              <GitCompareArrows className="h-4 w-4" />
              Compare selected
            </button>
            <input value={publishTarget} onChange={(event) => setPublishTarget(event.target.value)} className="min-w-80 rounded-lg border border-slate-200 px-3 py-2 text-sm" placeholder="Optional GitHub PR URL for comment publishing" />
            <p className="text-xs text-slate-500">Select two runs to compare outputs.</p>
          </div>

          {comparison && (
            <pre className="max-h-96 overflow-auto whitespace-pre-wrap rounded-lg bg-slate-950 p-4 text-sm text-slate-50">
              {comparison.diff_lines.join("\n") || "Selected outputs are identical."}
            </pre>
          )}

          <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">Compare</th>
                <th className="px-4 py-3">Result</th>
                <th className="px-4 py-3">Model</th>
                <th className="px-4 py-3">Latency</th>
                <th className="px-4 py-3">Created</th>
                <th className="px-4 py-3">Output</th>
                <th className="px-4 py-3">Publish</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {runs.map((run) => (
                <tr key={run.run_id}>
                  <td className="px-4 py-3">
                    <input type="checkbox" checked={selectedRuns.includes(run.run_id)} onChange={() => toggleRun(run.run_id)} />
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-xs font-semibold ${
                        run.governance_result === "Pass"
                          ? "bg-emerald-50 text-emerald-700"
                          : "bg-red-50 text-red-700"
                      }`}
                    >
                      {run.governance_result === "Pass" ? (
                        <CheckCircle2 className="h-3.5 w-3.5" />
                      ) : (
                        <AlertTriangle className="h-3.5 w-3.5" />
                      )}
                      {run.governance_result}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{run.model}</td>
                  <td className="px-4 py-3 text-slate-600">{run.latency_ms} ms</td>
                  <td className="px-4 py-3 text-slate-500">{new Date(run.created_at).toLocaleString()}</td>
                  <td className="max-w-xl px-4 py-3 text-slate-600">
                    {run.blocked_reason || run.output_text?.slice(0, 180) || "No output"}
                  </td>
                  <td className="px-4 py-3">
                    <button onClick={() => publishRun(run.run_id)} disabled={!run.output_text} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 disabled:opacity-50">
                      <Send className="h-3.5 w-3.5" />
                      Publish
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </div>
      )}
    </div>
  );
}
