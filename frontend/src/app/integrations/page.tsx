"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import type { IntegrationCapability, IntegrationConnection, OpenApiDiff, SourceReference } from "@/lib/types";
import { Cable, Github, UploadCloud } from "lucide-react";

export default function IntegrationsPage() {
  const [integrations, setIntegrations] = useState<IntegrationCapability[]>([]);
  const [connections, setConnections] = useState<IntegrationConnection[]>([]);
  const [sourceReferences, setSourceReferences] = useState<SourceReference[]>([]);
  const [source, setSource] = useState("github");
  const [locator, setLocator] = useState("");
  const [content, setContent] = useState("");
  const [connectionForm, setConnectionForm] = useState({
    provider: "github",
    name: "",
    secret: "",
    status: "Active",
  });
  const [result, setResult] = useState("");
  const [openApiDiff, setOpenApiDiff] = useState<OpenApiDiff | null>(null);
  const [openApiForm, setOpenApiForm] = useState({
    base_locator: "",
    base_content: "",
    head_locator: "",
    head_content: "",
  });
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let isActive = true;
    Promise.all([
      api.workflows.integrations(),
      api.workflows.integrationConnections().catch(() => []),
      api.workflows.sourceReferences().catch(() => []),
    ])
      .then(([nextIntegrations, nextConnections, nextSourceReferences]) => {
        if (!isActive) return;
        setIntegrations(nextIntegrations);
        setConnections(nextConnections);
        setSourceReferences(nextSourceReferences);
      })
      .catch((err) => {
        if (!isActive) return;
        setError(err instanceof Error ? err.message : "Could not load integrations");
      });
    return () => {
      isActive = false;
    };
  }, []);

  async function fetchSource(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    setResult("");
    try {
      const fetched = await api.workflows.fetchSource(source, { locator, content });
      setResult(`${fetched.reference}\n\n${fetched.content}`);
      setSourceReferences(await api.workflows.sourceReferences().catch(() => []));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not fetch source");
    }
  }

  async function saveConnection(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    setMessage("");
    try {
      await api.workflows.createIntegration({
        ...connectionForm,
        config_json: { storage: "reference_only" },
      });
      setConnectionForm({ ...connectionForm, name: "", secret: "" });
      setConnections(await api.workflows.integrationConnections());
      setMessage("Integration connection saved.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save integration connection");
    }
  }

  async function diffOpenApi(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    setOpenApiDiff(null);
    try {
      const diff = await api.workflows.diffOpenApi(openApiForm);
      setOpenApiDiff(diff);
      setResult(diff.diff_markdown);
      setSourceReferences(await api.workflows.sourceReferences().catch(() => []));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not compare OpenAPI specs");
    }
  }

  return (
    <div className="max-w-6xl space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Integrations</h2>
        <p className="mt-1 text-sm text-slate-500">Read-only source inputs for workflow runs.</p>
      </div>

      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      {message && <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{message}</p>}

      <div className="grid gap-4 md:grid-cols-2">
        {integrations.map((integration) => (
          <section key={integration.source} className="rounded-lg border border-slate-200 bg-white p-5">
            <div className="flex items-start gap-3">
              <div className="rounded-lg bg-slate-100 p-2 text-slate-700">
                {integration.source === "github" ? <Github className="h-5 w-5" /> : integration.source === "markdown" ? <UploadCloud className="h-5 w-5" /> : <Cable className="h-5 w-5" />}
              </div>
              <div>
                <h3 className="font-semibold capitalize text-slate-900">{integration.source}</h3>
                <p className="mt-1 text-xs font-medium text-slate-500">{integration.status}</p>
              </div>
            </div>
            <p className="mt-3 text-sm text-slate-600">{integration.guidance}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {integration.capabilities.map((capability) => (
                <span key={capability} className="rounded-full bg-slate-100 px-2 py-1 text-xs text-slate-600">
                  {capability}
                </span>
              ))}
            </div>
          </section>
        ))}
      </div>

      <section className="grid gap-6 lg:grid-cols-[380px_1fr]">
        <form onSubmit={saveConnection} className="rounded-lg border border-slate-200 bg-white p-5">
          <h3 className="font-semibold text-slate-900">Connection</h3>
          <div className="mt-4 space-y-3">
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-slate-700">Provider</span>
              <select value={connectionForm.provider} onChange={(event) => setConnectionForm({ ...connectionForm, provider: event.target.value })} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm">
                <option value="github">GitHub</option>
                <option value="jira">Jira</option>
                <option value="confluence">Confluence</option>
                <option value="openapi">OpenAPI</option>
              </select>
            </label>
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-slate-700">Name</span>
              <input value={connectionForm.name} onChange={(event) => setConnectionForm({ ...connectionForm, name: event.target.value })} required className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
            </label>
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-slate-700">Token or secret</span>
              <input value={connectionForm.secret} onChange={(event) => setConnectionForm({ ...connectionForm, secret: event.target.value })} type="password" className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
            </label>
          </div>
          <button type="submit" className="mt-4 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white">
            Save connection
          </button>
        </form>

        <div className="rounded-lg border border-slate-200 bg-white">
          <div className="border-b border-slate-100 px-5 py-4">
            <h3 className="font-semibold text-slate-900">Configured connections</h3>
          </div>
          {connections.length === 0 ? (
            <p className="p-5 text-sm text-slate-500">No integration connections configured.</p>
          ) : (
            <div className="divide-y divide-slate-100">
              {connections.map((connection) => (
                <div key={connection.connection_id} className="flex flex-wrap items-center justify-between gap-3 p-5">
                  <div>
                    <p className="font-semibold text-slate-900">{connection.name}</p>
                    <p className="mt-1 text-xs text-slate-500">{connection.provider} - {connection.status} - secret {connection.secret_status || "not set"}</p>
                  </div>
                  <span className="rounded-full bg-slate-100 px-2 py-1 text-xs text-slate-600">reference only</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      <form onSubmit={fetchSource} className="rounded-lg border border-slate-200 bg-white p-5">
        <h3 className="font-semibold text-slate-900">Fetch source</h3>
        <div className="mt-4 grid gap-3 md:grid-cols-[180px_1fr]">
          <select value={source} onChange={(event) => setSource(event.target.value)} className="rounded-lg border border-slate-200 px-3 py-2 text-sm">
            <option value="github">GitHub</option>
            <option value="markdown">Markdown</option>
            <option value="jira">Jira</option>
            <option value="openapi">OpenAPI</option>
          </select>
          <input value={locator} onChange={(event) => setLocator(event.target.value)} className="rounded-lg border border-slate-200 px-3 py-2 text-sm" placeholder="GitHub URL, Jira key, OpenAPI URL, or source reference" />
        </div>
        <textarea value={content} onChange={(event) => setContent(event.target.value)} className="mt-3 min-h-28 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" placeholder="Paste Markdown, Jira text, or OpenAPI content when not using a fetchable URL." />
        <button type="submit" className="mt-3 rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white">
          Fetch read-only source
        </button>
        {result && <pre className="mt-4 max-h-96 overflow-auto whitespace-pre-wrap rounded-lg bg-slate-950 p-4 text-sm text-slate-50">{result}</pre>}
      </form>

      <form onSubmit={diffOpenApi} className="rounded-lg border border-slate-200 bg-white p-5">
        <h3 className="font-semibold text-slate-900">OpenAPI diff</h3>
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <div>
            <input value={openApiForm.base_locator} onChange={(event) => setOpenApiForm({ ...openApiForm, base_locator: event.target.value })} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" placeholder="Base spec URL" />
            <textarea value={openApiForm.base_content} onChange={(event) => setOpenApiForm({ ...openApiForm, base_content: event.target.value })} className="mt-2 min-h-40 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" placeholder="Or paste base OpenAPI JSON/YAML" />
          </div>
          <div>
            <input value={openApiForm.head_locator} onChange={(event) => setOpenApiForm({ ...openApiForm, head_locator: event.target.value })} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" placeholder="Head spec URL" />
            <textarea value={openApiForm.head_content} onChange={(event) => setOpenApiForm({ ...openApiForm, head_content: event.target.value })} className="mt-2 min-h-40 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" placeholder="Or paste head OpenAPI JSON/YAML" />
          </div>
        </div>
        <button type="submit" className="mt-3 rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white">
          Compare specs
        </button>
        {openApiDiff && (
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            <Metric label="Added" value={String(openApiDiff.added.length)} />
            <Metric label="Removed" value={String(openApiDiff.removed.length)} />
            <Metric label="Unchanged" value={String(openApiDiff.unchanged_count)} />
          </div>
        )}
      </form>

      <section className="rounded-lg border border-slate-200 bg-white">
        <div className="border-b border-slate-100 px-5 py-4">
          <h3 className="font-semibold text-slate-900">Source references</h3>
        </div>
        {sourceReferences.length === 0 ? (
          <p className="p-5 text-sm text-slate-500">No source references recorded yet.</p>
        ) : (
          <div className="divide-y divide-slate-100">
            {sourceReferences.slice(0, 10).map((reference) => (
              <div key={reference.source_reference_id} className="p-5">
                <p className="font-medium text-slate-900">{reference.provider}</p>
                <p className="mt-1 break-all text-xs text-slate-500">{reference.locator}</p>
                <p className="mt-1 text-xs text-slate-400">{reference.content_hash.slice(0, 16)} - {new Date(reference.created_at).toLocaleString()}</p>
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
    <div className="rounded-lg bg-slate-50 p-3">
      <p className="text-xl font-bold text-slate-900">{value}</p>
      <p className="text-xs text-slate-500">{label}</p>
    </div>
  );
}
