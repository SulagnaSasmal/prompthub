"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import type { WebhookDelivery, WebhookEndpoint } from "@/lib/types";
import { RotateCw, Save, ToggleLeft, ToggleRight } from "lucide-react";

export default function AdminPage() {
  const [webhooks, setWebhooks] = useState<WebhookEndpoint[]>([]);
  const [deliveries, setDeliveries] = useState<WebhookDelivery[]>([]);
  const [form, setForm] = useState({
    name: "",
    url: "",
    secret: "",
    event_type: "prompt.production_deployed",
    is_active: true,
  });
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function load() {
    try {
      const [nextWebhooks, nextDeliveries] = await Promise.all([
        api.webhooks.list(),
        api.webhooks.deliveries(),
      ]);
      setWebhooks(nextWebhooks);
      setDeliveries(nextDeliveries);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load webhook settings");
    }
  }

  useEffect(() => {
    let isActive = true;
    Promise.all([api.webhooks.list(), api.webhooks.deliveries()])
      .then(([nextWebhooks, nextDeliveries]) => {
        if (!isActive) return;
        setWebhooks(nextWebhooks);
        setDeliveries(nextDeliveries);
      })
      .catch((err) => {
        if (!isActive) return;
        setError(err instanceof Error ? err.message : "Could not load webhook settings");
      });
    return () => {
      isActive = false;
    };
  }, []);

  async function createWebhook(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    setMessage("");
    try {
      await api.webhooks.create(form);
      setForm({ ...form, name: "", url: "", secret: "" });
      setMessage("Webhook endpoint saved.");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save webhook");
    }
  }

  async function toggleWebhook(endpoint: WebhookEndpoint) {
    await api.webhooks.update(endpoint.webhook_id, { is_active: !endpoint.is_active });
    await load();
  }

  async function retryDelivery(deliveryId: string) {
    await api.webhooks.retry(deliveryId);
    await load();
  }

  async function retryPending() {
    const retried = await api.webhooks.retryPending();
    setMessage(`Retried ${retried.length} pending deliveries.`);
    await load();
  }

  return (
    <div className="max-w-6xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Admin</h2>
          <p className="mt-1 text-sm text-slate-500">Configure deployment webhooks for production prompt changes.</p>
        </div>
        <Link href="/prompts/new" className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700">
          New prompt
        </Link>
      </div>

      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      {message && <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{message}</p>}

      <section className="grid gap-6 lg:grid-cols-[380px_1fr]">
        <form onSubmit={createWebhook} className="rounded-lg border border-slate-200 bg-white p-5">
          <h3 className="font-semibold text-slate-900">Deployment webhook</h3>
          <div className="mt-4 space-y-3">
            <Field label="Name">
              <input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
            </Field>
            <Field label="URL">
              <input value={form.url} onChange={(event) => setForm({ ...form, url: event.target.value })} required type="url" placeholder="https://example.com/prompthub-webhook" className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
            </Field>
            <Field label="HMAC secret">
              <input value={form.secret} onChange={(event) => setForm({ ...form, secret: event.target.value })} required type="password" className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
            </Field>
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input type="checkbox" checked={form.is_active} onChange={(event) => setForm({ ...form, is_active: event.target.checked })} />
              Active
            </label>
          </div>
          <button type="submit" className="mt-4 inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white">
            <Save className="h-4 w-4" />
            Save webhook
          </button>
        </form>

        <div className="rounded-lg border border-slate-200 bg-white">
          <div className="border-b border-slate-100 px-5 py-4">
            <h3 className="font-semibold text-slate-900">Configured endpoints</h3>
          </div>
          {webhooks.length === 0 ? (
            <p className="p-5 text-sm text-slate-500">No deployment webhooks configured.</p>
          ) : (
            <div className="divide-y divide-slate-100">
              {webhooks.map((endpoint) => (
                <div key={endpoint.webhook_id} className="flex flex-wrap items-center justify-between gap-3 p-5">
                  <div>
                    <p className="font-medium text-slate-900">{endpoint.name}</p>
                    <p className="mt-1 break-all text-xs text-slate-500">{endpoint.url}</p>
                    <p className="mt-1 text-xs text-slate-400">{endpoint.event_type}</p>
                  </div>
                  <button onClick={() => toggleWebhook(endpoint)} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700">
                    {endpoint.is_active ? <ToggleRight className="h-4 w-4 text-emerald-600" /> : <ToggleLeft className="h-4 w-4 text-slate-400" />}
                    {endpoint.is_active ? "Active" : "Paused"}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
          <h3 className="font-semibold text-slate-900">Recent deliveries</h3>
          <button onClick={retryPending} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700">
            <RotateCw className="h-4 w-4" />
            Retry due
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
                  <th className="px-4 py-3">Attempts</th>
                  <th className="px-4 py-3">HTTP</th>
                  <th className="px-4 py-3">Next retry</th>
                  <th className="px-4 py-3">Error</th>
                  <th className="px-4 py-3">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {deliveries.map((delivery) => (
                  <tr key={delivery.delivery_id}>
                    <td className="px-4 py-3 font-medium text-slate-900">{delivery.status}</td>
                    <td className="px-4 py-3 text-slate-600">{delivery.attempt_count}/{delivery.max_attempts}</td>
                    <td className="px-4 py-3 text-slate-600">{delivery.last_status_code ?? "-"}</td>
                    <td className="px-4 py-3 text-slate-500">{delivery.next_retry_at ? new Date(delivery.next_retry_at).toLocaleString() : "-"}</td>
                    <td className="max-w-md px-4 py-3 text-slate-500">{delivery.last_error ?? "-"}</td>
                    <td className="px-4 py-3">
                      <button onClick={() => retryDelivery(delivery.delivery_id)} disabled={delivery.status === "Delivered"} className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 disabled:opacity-50">
                        Retry
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

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-slate-700">{label}</span>
      {children}
    </label>
  );
}
