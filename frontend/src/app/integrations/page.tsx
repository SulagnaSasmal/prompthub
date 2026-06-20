"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import type { IntegrationCapability } from "@/lib/types";
import { Cable, Github, UploadCloud } from "lucide-react";

export default function IntegrationsPage() {
  const [integrations, setIntegrations] = useState<IntegrationCapability[]>([]);
  const [source, setSource] = useState("github");
  const [locator, setLocator] = useState("");
  const [content, setContent] = useState("");
  const [result, setResult] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    api.workflows
      .integrations()
      .then(setIntegrations)
      .catch((err) => setError(err instanceof Error ? err.message : "Could not load integrations"));
  }, []);

  async function fetchSource(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    setResult("");
    try {
      const fetched = await api.workflows.fetchSource(source, { locator, content });
      setResult(`${fetched.reference}\n\n${fetched.content}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not fetch source");
    }
  }

  return (
    <div className="max-w-6xl space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Integrations</h2>
        <p className="mt-1 text-sm text-slate-500">Read-only source inputs for workflow runs.</p>
      </div>

      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

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
    </div>
  );
}
