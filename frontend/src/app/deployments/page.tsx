"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import type { DeploymentSummary, WebhookDelivery } from "@/lib/types";
import { PageHelp } from "@/components/help/PageHelp";
import { RotateCw, Rocket } from "lucide-react";

export default function DeploymentsPage() {
  const [deployments, setDeployments] = useState<DeploymentSummary[]>([]);
  const [deliveries, setDeliveries] = useState<WebhookDelivery[]>([]);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function load() {
    try {
      const [nextDeployments, nextDeliveries] = await Promise.all([
        api.workflows.deployments(),
        api.webhooks.deliveries(),
      ]);
      setDeployments(nextDeployments);
      setDeliveries(nextDeliveries);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load deployments");
    }
  }

  useEffect(() => {
    let isActive = true;
    Promise.all([api.workflows.deployments(), api.webhooks.deliveries()])
      .then(([nextDeployments, nextDeliveries]) => {
        if (!isActive) return;
        setDeployments(nextDeployments);
        setDeliveries(nextDeliveries);
      })
      .catch((err) => {
        if (!isActive) return;
        setError(err instanceof Error ? err.message : "Could not load deployments");
      });
    return () => {
      isActive = false;
    };
  }, []);

  async function retry(deliveryId: string) {
    setMessage("");
    await api.webhooks.retry(deliveryId);
    setMessage("Delivery replay requested.");
    await load();
  }

  async function retryDue() {
    const retried = await api.webhooks.retryPending();
    setMessage(`Replayed ${retried.length} due deliveries.`);
    await load();
  }

  return (
    <div className="max-w-7xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Deployments</h2>
          <p className="mt-1 text-sm text-slate-500">Production workflow versions and webhook delivery status.</p>
        </div>
        <Link href="/admin" className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700">
          Configure webhooks
        </Link>
      </div>

      <PageHelp
        title="Use this page to monitor production workflow delivery."
        description="Deployments shows production workflow versions and the webhook delivery status that keeps downstream systems in sync."
        steps={[
          "Review each production workflow for current version, risk, run count, and webhook status.",
          "Open workflows that show unexpected risk or usage before changing their production status.",
          "Check delivery history when an endpoint did not receive a deployment event.",
          "Replay due or failed deliveries after confirming the webhook endpoint is healthy.",
        ]}
      />

      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      {message && <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{message}</p>}

      {deployments.length === 0 ? (
        <div className="rounded-lg border border-slate-200 bg-white p-10 text-center text-slate-500">
          <Rocket className="mx-auto mb-3 h-8 w-8 text-slate-400" />
          No production workflows deployed yet.
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {deployments.map((deployment) => (
            <Link key={deployment.prompt_id} href={`/prompts/${deployment.prompt_id}`} className="rounded-lg border border-slate-200 bg-white p-5 transition-shadow hover:shadow-md">
              <p className="font-semibold text-slate-900">{deployment.workflow_name}</p>
              <p className="mt-1 text-sm text-slate-500">Production v{deployment.current_version || "unknown"}</p>
              <div className="mt-4 grid grid-cols-3 gap-3 text-xs">
                <Metric label="Risk" value={deployment.risk_level} />
                <Metric label="Runs" value={String(deployment.run_count)} />
                <Metric label="Webhook" value={deployment.webhook_delivery_status} />
              </div>
              {deployment.failed_deliveries > 0 && <p className="mt-3 text-sm font-medium text-red-700">{deployment.failed_deliveries} failed deliveries need attention.</p>}
            </Link>
          ))}
        </div>
      )}

      <section className="rounded-lg border border-slate-200 bg-white">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
          <h3 className="font-semibold text-slate-900">Delivery history</h3>
          <button onClick={retryDue} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700">
            <RotateCw className="h-4 w-4" />
            Replay due
          </button>
        </div>
        {deliveries.length === 0 ? (
          <p className="p-5 text-sm text-slate-500">No webhook deliveries yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Event</th>
                  <th className="px-4 py-3">Attempts</th>
                  <th className="px-4 py-3">HTTP</th>
                  <th className="px-4 py-3">Error</th>
                  <th className="px-4 py-3">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {deliveries.map((delivery) => (
                  <tr key={delivery.delivery_id}>
                    <td className="px-4 py-3 font-semibold text-slate-900">{delivery.status}</td>
                    <td className="px-4 py-3 text-slate-600">{delivery.event_type}</td>
                    <td className="px-4 py-3 text-slate-600">{delivery.attempt_count}/{delivery.max_attempts}</td>
                    <td className="px-4 py-3 text-slate-600">{delivery.last_status_code ?? "-"}</td>
                    <td className="max-w-md px-4 py-3 text-slate-500">{delivery.last_error ?? "-"}</td>
                    <td className="px-4 py-3">
                      <button onClick={() => retry(delivery.delivery_id)} disabled={delivery.status === "Delivered"} className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 disabled:opacity-50">
                        Replay
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-slate-50 p-3">
      <p className="truncate font-semibold text-slate-900">{value}</p>
      <p className="mt-1 text-slate-500">{label}</p>
    </div>
  );
}
