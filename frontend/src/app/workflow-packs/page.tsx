"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import type { WorkflowPack } from "@/lib/types";
import { PackagePlus } from "lucide-react";

export default function WorkflowPacksPage() {
  const [packs, setPacks] = useState<WorkflowPack[]>([]);
  const [form, setForm] = useState({
    name: "Technical Writing Pack",
    source_url: "",
    license: "Internal",
    status: "Draft",
  });
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function load() {
    setPacks(await api.workflows.workflowPacks());
  }

  useEffect(() => {
    let isActive = true;
    api.workflows
      .workflowPacks()
      .then((nextPacks) => {
        if (isActive) setPacks(nextPacks);
      })
      .catch((err) => {
        if (isActive) setError(err instanceof Error ? err.message : "Could not load workflow packs");
      });
    return () => {
      isActive = false;
    };
  }, []);

  async function importPack(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    setMessage("");
    try {
      await api.workflows.importWorkflowPack({
        ...form,
        manifest_json: {
          workflows: [],
          provenance: form.source_url || "internal",
          license: form.license,
          activation: "admin_review_required",
        },
      });
      setMessage("Workflow pack imported as Draft for admin review.");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not import workflow pack");
    }
  }

  return (
    <div className="max-w-6xl space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Workflow Packs</h2>
        <p className="mt-1 text-sm text-slate-500">Importable workflow sets with provenance and license metadata.</p>
      </div>

      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      {message && <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{message}</p>}

      <section className="grid gap-6 lg:grid-cols-[380px_1fr]">
        <form onSubmit={importPack} className="rounded-lg border border-slate-200 bg-white p-5">
          <h3 className="font-semibold text-slate-900">Import pack</h3>
          <div className="mt-4 space-y-3">
            <Field label="Name">
              <input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
            </Field>
            <Field label="Source URL">
              <input value={form.source_url} onChange={(event) => setForm({ ...form, source_url: event.target.value })} placeholder="https://github.com/org/prompt-pack" className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
            </Field>
            <Field label="License">
              <input value={form.license} onChange={(event) => setForm({ ...form, license: event.target.value })} required className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
            </Field>
          </div>
          <button type="submit" className="mt-4 inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white">
            <PackagePlus className="h-4 w-4" />
            Import as draft
          </button>
        </form>

        <div className="rounded-lg border border-slate-200 bg-white">
          <div className="border-b border-slate-100 px-5 py-4">
            <h3 className="font-semibold text-slate-900">Installed packs</h3>
          </div>
          {packs.length === 0 ? (
            <p className="p-5 text-sm text-slate-500">No workflow packs installed yet.</p>
          ) : (
            <div className="divide-y divide-slate-100">
              {packs.map((pack) => (
                <div key={pack.pack_id} className="p-5">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="font-semibold text-slate-900">{pack.name}</p>
                      <p className="mt-1 text-xs text-slate-500">{pack.license} - {pack.status}</p>
                    </div>
                    <span className="rounded-full bg-amber-50 px-2 py-1 text-xs font-medium text-amber-700">admin review</span>
                  </div>
                  {pack.source_url && <p className="mt-2 break-all text-xs text-slate-500">{pack.source_url}</p>}
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
