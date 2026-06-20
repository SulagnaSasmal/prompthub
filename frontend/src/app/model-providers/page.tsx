"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import type { ModelProvider } from "@/lib/types";
import { PageHelp } from "@/components/help/PageHelp";
import { Cpu, Save } from "lucide-react";

export default function ModelProvidersPage() {
  const [providers, setProviders] = useState<ModelProvider[]>([]);
  const [form, setForm] = useState({
    name: "Primary OpenAI Provider",
    provider_type: "openai",
    model_name: "GPT-5",
    endpoint: "",
    credentials: "",
    status: "Active",
  });
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function load() {
    setProviders(await api.workflows.modelProviders());
  }

  useEffect(() => {
    let isActive = true;
    api.workflows
      .modelProviders()
      .then((nextProviders) => {
        if (isActive) setProviders(nextProviders);
      })
      .catch((err) => {
        if (isActive) setError(err instanceof Error ? err.message : "Could not load model providers");
      });
    return () => {
      isActive = false;
    };
  }, []);

  async function saveProvider(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    setMessage("");
    try {
      await api.workflows.createModelProvider({
        name: form.name,
        provider_type: form.provider_type,
        model_name: form.model_name,
        status: form.status,
        credentials: form.credentials,
        config_json: {
          endpoint: form.endpoint || undefined,
          timeout: 60,
          max_tokens: 1200,
          regulated: true,
        },
      });
      setForm({ ...form, credentials: "" });
      setMessage("Model provider saved. Matching workflow runs will use it through the gateway.");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save model provider");
    }
  }

  return (
    <div className="max-w-6xl space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Model Providers</h2>
        <p className="mt-1 text-sm text-slate-500">Server-side provider configuration for governed workflow execution.</p>
      </div>

      <PageHelp
        title="Use this page to configure model gateway providers."
        description="Model provider records tell governed workflow runs which backend model, endpoint, and credential set should execute prompts."
        steps={[
          "Choose the provider type and model name that match your approved execution environment.",
          "Add an endpoint override only when Azure or an internal HTTP gateway requires it.",
          "Save credentials through this form instead of embedding them in workflow prompts.",
          "Confirm the configured provider appears in the provider list with the expected status.",
        ]}
        note="The local governed draft gateway continues to run when no external provider is configured."
      />

      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      {message && <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{message}</p>}

      <section className="grid gap-6 lg:grid-cols-[420px_1fr]">
        <form onSubmit={saveProvider} className="rounded-lg border border-slate-200 bg-white p-5">
          <h3 className="font-semibold text-slate-900">Provider config</h3>
          <div className="mt-4 space-y-3">
            <Field label="Name">
              <input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
            </Field>
            <Field label="Provider type">
              <select value={form.provider_type} onChange={(event) => setForm({ ...form, provider_type: event.target.value })} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm">
                <option value="openai">OpenAI API</option>
                <option value="azure_openai">Azure OpenAI</option>
                <option value="anthropic">Anthropic</option>
                <option value="aws_bedrock">AWS Bedrock</option>
                <option value="internal_http">Internal HTTP endpoint</option>
              </select>
            </Field>
            <Field label="Model name">
              <input value={form.model_name} onChange={(event) => setForm({ ...form, model_name: event.target.value })} required className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
            </Field>
            <Field label="Endpoint override">
              <input value={form.endpoint} onChange={(event) => setForm({ ...form, endpoint: event.target.value })} placeholder="Required for internal HTTP or Azure deployment URL" className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
            </Field>
            <Field label="Credentials">
              <input value={form.credentials} onChange={(event) => setForm({ ...form, credentials: event.target.value })} type="password" className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
            </Field>
          </div>
          <button type="submit" className="mt-4 inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white">
            <Save className="h-4 w-4" />
            Save provider
          </button>
        </form>

        <div className="rounded-lg border border-slate-200 bg-white">
          <div className="border-b border-slate-100 px-5 py-4">
            <h3 className="font-semibold text-slate-900">Configured providers</h3>
          </div>
          {providers.length === 0 ? (
            <p className="p-5 text-sm text-slate-500">No model providers configured. The local governed draft gateway will continue to run.</p>
          ) : (
            <div className="divide-y divide-slate-100">
              {providers.map((provider) => (
                <div key={provider.provider_id} className="p-5">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="font-semibold text-slate-900">{provider.name}</p>
                      <p className="mt-1 text-xs text-slate-500">{provider.provider_type} - {provider.model_name} - {provider.status}</p>
                    </div>
                    <Cpu className="h-5 w-5 text-brand-600" />
                  </div>
                  <p className="mt-2 text-xs text-slate-500">Credentials: {provider.credential_status || "not set"}</p>
                </div>
              ))}
            </div>
          )}
        </div>
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
