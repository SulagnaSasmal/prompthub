"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import type { AuditEvent, ExportEvent } from "@/lib/types";

export default function AuditEventsPage() {
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [exports, setExports] = useState<ExportEvent[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    let isActive = true;
    Promise.all([
      api.workflows.auditEvents(),
      api.workflows.exportEvents().catch(() => []),
    ])
      .then(([nextEvents, nextExports]) => {
        if (!isActive) return;
        setEvents(nextEvents);
        setExports(nextExports);
      })
      .catch((err) => {
        if (isActive) setError(err instanceof Error ? err.message : "Could not load audit events");
      });
    return () => {
      isActive = false;
    };
  }, []);

  return (
    <div className="max-w-7xl space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Audit Events</h2>
        <p className="mt-1 text-sm text-slate-500">Expanded v3 audit trail for runs, exports, providers, integrations, packs, and security settings.</p>
      </div>

      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

      <section className="grid gap-4 md:grid-cols-3">
        <Metric label="Events" value={String(events.length)} />
        <Metric label="Exports and publishes" value={String(exports.length)} />
        <Metric label="Latest" value={events[0] ? new Date(events[0].created_at).toLocaleDateString() : "None"} />
      </section>

      <section className="overflow-hidden rounded-lg border border-slate-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3">Event</th>
              <th className="px-4 py-3">Target</th>
              <th className="px-4 py-3">Actor</th>
              <th className="px-4 py-3">Payload</th>
              <th className="px-4 py-3">Created</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {events.map((event) => (
              <tr key={event.audit_event_id}>
                <td className="px-4 py-3 font-semibold text-slate-900">{event.event_type}</td>
                <td className="px-4 py-3 text-slate-600">{event.target_type}</td>
                <td className="px-4 py-3 text-slate-500">{event.actor_id?.slice(0, 8) || "system"}</td>
                <td className="max-w-xl px-4 py-3 text-xs text-slate-500">{JSON.stringify(event.payload)}</td>
                <td className="px-4 py-3 text-slate-500">{new Date(event.created_at).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {events.length === 0 && <p className="p-5 text-sm text-slate-500">No expanded audit events yet.</p>}
      </section>

      <section className="rounded-lg border border-slate-200 bg-white">
        <div className="border-b border-slate-100 px-5 py-4">
          <h3 className="font-semibold text-slate-900">Export and publish events</h3>
        </div>
        {exports.length === 0 ? (
          <p className="p-5 text-sm text-slate-500">No export events yet.</p>
        ) : (
          <div className="divide-y divide-slate-100">
            {exports.map((event) => (
              <div key={event.export_id} className="p-5">
                <p className="font-medium text-slate-900">{event.target_type} - {event.status}</p>
                <p className="mt-1 break-all text-xs text-slate-500">{event.target_reference || "No target reference"}</p>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <p className="text-2xl font-bold text-slate-900">{value}</p>
      <p className="mt-1 text-sm text-slate-500">{label}</p>
    </div>
  );
}
