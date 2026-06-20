"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import type { Run } from "@/lib/types";
import { AlertTriangle, CheckCircle2 } from "lucide-react";

export default function RunsPage() {
  const [runs, setRuns] = useState<Run[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    api.workflows
      .runs()
      .then(setRuns)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-slate-900">Run History</h2>
        <p className="mt-0.5 text-sm text-slate-500">Your generated outputs and blocked attempts.</p>
      </div>

      {error && <p className="mb-4 text-sm text-red-600">{error}</p>}
      {loading ? (
        <div className="h-48 animate-pulse rounded-lg border border-slate-200 bg-white" />
      ) : runs.length === 0 ? (
        <div className="rounded-lg border border-slate-200 bg-white p-10 text-center text-slate-500">
          No runs yet.
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">Result</th>
                <th className="px-4 py-3">Model</th>
                <th className="px-4 py-3">Latency</th>
                <th className="px-4 py-3">Created</th>
                <th className="px-4 py-3">Output</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {runs.map((run) => (
                <tr key={run.run_id}>
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
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
