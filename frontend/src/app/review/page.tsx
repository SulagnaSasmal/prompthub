"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";
import type { ReviewQueueItem } from "@/lib/types";
import { PageHelp } from "@/components/help/PageHelp";
import { AlertTriangle, CheckCircle2, ClipboardCheck } from "lucide-react";

const SECTIONS = [
  "Needs Review",
  "Needs Tests",
  "Needs Examples",
  "Failed Governance",
  "Low Formal Score",
  "Low Field Quality",
  "High-Risk Escalated",
  "Ready for Approval",
];

export default function ReviewQueuePage() {
  const [items, setItems] = useState<ReviewQueueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [section, setSection] = useState("All");

  async function load() {
    const nextItems = await api.workflows.reviewQueue();
    setItems(nextItems);
  }

  useEffect(() => {
    let isActive = true;

    api.workflows
      .reviewQueue()
      .then((nextItems) => {
        if (isActive) setItems(nextItems);
      })
      .catch((err) => {
        if (isActive) setError(err instanceof Error ? err.message : "Could not load review queue");
      })
      .finally(() => {
        if (isActive) setLoading(false);
      });

    return () => {
      isActive = false;
    };
  }, []);

  async function transition(item: ReviewQueueItem, toStatus: string) {
    setError("");
    setMessage("");
    try {
      await api.versions.transition(item.version_id, toStatus, `Review Queue action: ${item.status} to ${toStatus}`);
      setMessage(`${item.workflow_name} moved to ${toStatus}.`);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not transition workflow");
    }
  }

  function nextStatus(item: ReviewQueueItem): string | null {
    if (item.status === "In Review") return "Testing";
    if (item.status === "Testing") return "Approved";
    if (item.status === "Approved") return "Production";
    return null;
  }

  function returnStatus(item: ReviewQueueItem): string | null {
    if (item.status === "In Review") return "Draft";
    if (item.status === "Testing") return "In Review";
    if (item.status === "Approved") return "Testing";
    return null;
  }

  const filtered = useMemo(
    () => (section === "All" ? items : items.filter((item) => item.queue_section === section)),
    [items, section]
  );

  const counts = useMemo(
    () =>
      SECTIONS.reduce<Record<string, number>>((acc, name) => {
        acc[name] = items.filter((item) => item.queue_section === name).length;
        return acc;
      }, {}),
    [items]
  );

  return (
    <div className="max-w-7xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Review Queue</h2>
          <p className="mt-1 text-sm text-slate-500">Focused work for workflow versions that need review, tests, examples, or approval.</p>
        </div>
        <select value={section} onChange={(event) => setSection(event.target.value)} className="rounded-lg border border-slate-200 px-3 py-2 text-sm">
          <option>All</option>
          {SECTIONS.map((name) => <option key={name}>{name}</option>)}
        </select>
      </div>

      <PageHelp
        title="Use this page to move workflows through review."
        description="The queue groups workflow versions by the next missing quality, test, example, governance, or approval action."
        steps={[
          "Select a queue section or use All to see every item waiting for action.",
          "Open a workflow to inspect examples, evaluations, governance checks, and comments.",
          "Use the primary action only after the missing requirements are resolved.",
          "Return a workflow to the previous status when it needs author changes.",
        ]}
      />

      <div className="grid gap-3 md:grid-cols-4">
        {SECTIONS.map((name) => (
          <button
            key={name}
            onClick={() => setSection(name)}
            className={`rounded-lg border p-4 text-left ${section === name ? "border-brand-500 bg-brand-50" : "border-slate-200 bg-white"}`}
          >
            <p className="text-xs font-medium text-slate-500">{name}</p>
            <p className="mt-1 text-2xl font-bold text-slate-900">{counts[name] || 0}</p>
          </button>
        ))}
      </div>

      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      {message && <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{message}</p>}

      {loading ? (
        <div className="h-56 animate-pulse rounded-lg border border-slate-200 bg-white" />
      ) : filtered.length === 0 ? (
        <div className="rounded-lg border border-slate-200 bg-white p-10 text-center text-slate-500">
          <ClipboardCheck className="mx-auto mb-3 h-8 w-8 text-slate-400" />
          No review items in this section.
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">Workflow</th>
                <th className="px-4 py-3">Section</th>
                <th className="px-4 py-3">Risk</th>
                <th className="px-4 py-3">Missing</th>
                <th className="px-4 py-3">Last Activity</th>
                <th className="px-4 py-3">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((item) => (
                <tr key={item.version_id}>
                  <td className="px-4 py-3">
                    <p className="font-semibold text-slate-900">{item.workflow_name}</p>
                    <p className="text-xs text-slate-500">v{item.version_number} - {item.status}</p>
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700">
                      {item.queue_section === "Ready for Approval" ? <CheckCircle2 className="h-3.5 w-3.5" /> : <AlertTriangle className="h-3.5 w-3.5" />}
                      {item.queue_section}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{item.risk_level}</td>
                  <td className="max-w-sm px-4 py-3 text-slate-600">{item.missing_requirements.join(", ") || "None"}</td>
                  <td className="px-4 py-3 text-slate-500">{new Date(item.last_activity).toLocaleString()}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-2">
                      <Link href={`/prompts/${item.prompt_id}`} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700">
                        Open
                      </Link>
                      {nextStatus(item) && (
                        <button onClick={() => transition(item, nextStatus(item)!)} className="rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white">
                          {item.primary_action}
                        </button>
                      )}
                      {returnStatus(item) && (
                        <button onClick={() => transition(item, returnStatus(item)!)} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700">
                          Return
                        </button>
                      )}
                    </div>
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
