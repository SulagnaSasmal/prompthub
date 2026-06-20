"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import type { EnterpriseAuthConfig, RetentionPolicy } from "@/lib/types";
import { KeyRound, Save, Shield } from "lucide-react";

export default function SecurityPage() {
  const [policies, setPolicies] = useState<RetentionPolicy[]>([]);
  const [authConfigs, setAuthConfigs] = useState<EnterpriseAuthConfig[]>([]);
  const [policyForm, setPolicyForm] = useState({
    name: "Default run retention",
    applies_to: "runs",
    retention_days: 365,
    redact_sensitive_inputs: true,
    private_source_storage: "reference_only",
  });
  const [authForm, setAuthForm] = useState({
    provider_type: "oidc",
    name: "Corporate OIDC",
    issuer_url: "",
    client_id: "",
    client_secret: "",
    status: "Draft",
  });
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function load() {
    const [nextPolicies, nextAuthConfigs] = await Promise.all([
      api.workflows.retentionPolicies(),
      api.workflows.authConfigs(),
    ]);
    setPolicies(nextPolicies);
    setAuthConfigs(nextAuthConfigs);
  }

  useEffect(() => {
    let isActive = true;
    Promise.all([
      api.workflows.retentionPolicies(),
      api.workflows.authConfigs(),
    ])
      .then(([nextPolicies, nextAuthConfigs]) => {
        if (!isActive) return;
        setPolicies(nextPolicies);
        setAuthConfigs(nextAuthConfigs);
      })
      .catch((err) => {
        if (isActive) setError(err instanceof Error ? err.message : "Could not load security settings");
      });
    return () => {
      isActive = false;
    };
  }, []);

  async function savePolicy(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    setMessage("");
    try {
      await api.workflows.createRetentionPolicy(policyForm);
      setMessage("Retention policy saved.");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save retention policy");
    }
  }

  async function saveAuthConfig(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    setMessage("");
    try {
      await api.workflows.createAuthConfig(authForm);
      setAuthForm({ ...authForm, client_secret: "" });
      setMessage("Enterprise auth config saved.");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save auth config");
    }
  }

  return (
    <div className="max-w-6xl space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Security</h2>
        <p className="mt-1 text-sm text-slate-500">Retention, private-source storage, and enterprise identity readiness.</p>
      </div>

      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      {message && <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{message}</p>}

      <section className="grid gap-6 lg:grid-cols-2">
        <form onSubmit={savePolicy} className="rounded-lg border border-slate-200 bg-white p-5">
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-brand-600" />
            <h3 className="font-semibold text-slate-900">Retention policy</h3>
          </div>
          <div className="mt-4 space-y-3">
            <Field label="Name">
              <input value={policyForm.name} onChange={(event) => setPolicyForm({ ...policyForm, name: event.target.value })} required className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
            </Field>
            <Field label="Retention days">
              <input value={policyForm.retention_days} onChange={(event) => setPolicyForm({ ...policyForm, retention_days: Number(event.target.value) })} type="number" min={1} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
            </Field>
            <Field label="Private source storage">
              <select value={policyForm.private_source_storage} onChange={(event) => setPolicyForm({ ...policyForm, private_source_storage: event.target.value })} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm">
                <option value="reference_only">Reference only</option>
                <option value="redacted_content">Redacted content</option>
                <option value="full_content">Full content</option>
              </select>
            </Field>
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input type="checkbox" checked={policyForm.redact_sensitive_inputs} onChange={(event) => setPolicyForm({ ...policyForm, redact_sensitive_inputs: event.target.checked })} />
              Redact sensitive inputs
            </label>
          </div>
          <button type="submit" className="mt-4 inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white">
            <Save className="h-4 w-4" />
            Save policy
          </button>
        </form>

        <form onSubmit={saveAuthConfig} className="rounded-lg border border-slate-200 bg-white p-5">
          <div className="flex items-center gap-2">
            <KeyRound className="h-5 w-5 text-brand-600" />
            <h3 className="font-semibold text-slate-900">Enterprise auth</h3>
          </div>
          <div className="mt-4 space-y-3">
            <Field label="Provider type">
              <select value={authForm.provider_type} onChange={(event) => setAuthForm({ ...authForm, provider_type: event.target.value })} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm">
                <option value="oidc">OIDC</option>
                <option value="saml">SAML</option>
              </select>
            </Field>
            <Field label="Name">
              <input value={authForm.name} onChange={(event) => setAuthForm({ ...authForm, name: event.target.value })} required className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
            </Field>
            <Field label="Issuer URL">
              <input value={authForm.issuer_url} onChange={(event) => setAuthForm({ ...authForm, issuer_url: event.target.value })} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
            </Field>
            <Field label="Client ID">
              <input value={authForm.client_id} onChange={(event) => setAuthForm({ ...authForm, client_id: event.target.value })} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
            </Field>
            <Field label="Client secret">
              <input value={authForm.client_secret} onChange={(event) => setAuthForm({ ...authForm, client_secret: event.target.value })} type="password" className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
            </Field>
          </div>
          <button type="submit" className="mt-4 inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white">
            <Save className="h-4 w-4" />
            Save auth config
          </button>
        </form>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <List title="Retention policies" items={policies.map((policy) => `${policy.name}: ${policy.retention_days} days, ${policy.private_source_storage}`)} />
        <List title="Enterprise auth configs" items={authConfigs.map((config) => `${config.name}: ${config.provider_type}, ${config.status}, secret ${config.secret_status || "not set"}`)} />
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

function List({ title, items }: { title: string; items: string[] }) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white">
      <div className="border-b border-slate-100 px-5 py-4">
        <h3 className="font-semibold text-slate-900">{title}</h3>
      </div>
      {items.length === 0 ? (
        <p className="p-5 text-sm text-slate-500">No records yet.</p>
      ) : (
        <div className="divide-y divide-slate-100">
          {items.map((item) => <p key={item} className="p-5 text-sm text-slate-700">{item}</p>)}
        </div>
      )}
    </section>
  );
}
