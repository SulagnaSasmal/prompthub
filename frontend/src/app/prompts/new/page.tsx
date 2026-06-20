"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import type { RiskLevel } from "@/lib/types";
import { PageHelp } from "@/components/help/PageHelp";

const CATEGORIES = ["Documentation", "Support", "Product Management", "Compliance"];
const RISKS: RiskLevel[] = ["Low", "Medium", "High"];
const TASK_TYPES = ["Release Notes", "API Summary", "Migration Guide", "KB Article", "Tone Rewrite", "Style Check", "Documentation Draft", "General Writing"];

export default function NewPromptPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    name: "",
    description: "",
    category: CATEGORIES[0],
    subcategory: "",
    target_model: "GPT-5",
    risk_level: "Medium" as RiskLevel,
    task_type: "General Writing",
    usage_notes: "",
    tags: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function update(field: keyof typeof form, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError("");

    try {
      const prompt = await api.prompts.create({
        ...form,
        subcategory: form.subcategory.trim() || form.category,
        tags: form.tags
          .split(",")
          .map((tag) => tag.trim())
          .filter(Boolean),
      });
      router.push(`/prompts/${prompt.prompt_id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create workflow");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-3xl">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-slate-900">New Workflow</h2>
        <p className="mt-1 text-sm text-slate-500">Create a governed writing workflow for review, testing, and reuse.</p>
      </div>

      <div className="mb-6">
        <PageHelp
          title="Use this page to create the workflow record."
          description="This creates the governed container for a writing task; the prompt template, variables, examples, and tests are managed after creation."
          steps={[
            "Name the workflow for the writing outcome, such as release notes or API summary.",
            "Add a clear description, category, task type, risk level, and tags.",
            "Write usage notes that tell future users when the workflow is appropriate.",
            "Create the workflow, then open it to add versions, variables, examples, and governance checks.",
          ]}
        />
      </div>

      <form onSubmit={handleSubmit} className="space-y-5 bg-white rounded-lg border border-slate-200 p-6">
        <Field label="Name">
          <input
            value={form.name}
            onChange={(event) => update("name", event.target.value)}
            required
            maxLength={120}
            className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </Field>

        <Field label="Description">
          <textarea
            value={form.description}
            onChange={(event) => update("description", event.target.value)}
            required
            rows={4}
            className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </Field>

        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Category">
            <select
              value={form.category}
              onChange={(event) => update("category", event.target.value)}
              className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              {CATEGORIES.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Subcategory">
            <input
              value={form.subcategory}
              onChange={(event) => update("subcategory", event.target.value)}
              placeholder="Release Notes"
              className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </Field>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Task type">
            <select
              value={form.task_type}
              onChange={(event) => update("task_type", event.target.value)}
              className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              {TASK_TYPES.map((taskType) => (
                <option key={taskType} value={taskType}>
                  {taskType}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Target model">
            <input
              value={form.target_model}
              onChange={(event) => update("target_model", event.target.value)}
              required
              className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </Field>

          <Field label="Risk">
            <select
              value={form.risk_level}
              onChange={(event) => update("risk_level", event.target.value)}
              className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              {RISKS.map((risk) => (
                <option key={risk} value={risk}>
                  {risk}
                </option>
              ))}
            </select>
          </Field>
        </div>

        <Field label="Usage notes">
          <textarea
            value={form.usage_notes}
            onChange={(event) => update("usage_notes", event.target.value)}
            rows={3}
            placeholder="When to use this workflow and what source material works best."
            className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </Field>

        <Field label="Tags">
          <input
            value={form.tags}
            onChange={(event) => update("tags", event.target.value)}
            placeholder="docs, release, support"
            className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </Field>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={() => router.push("/library")}
            className="rounded-md border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-700 disabled:opacity-60"
          >
            {loading ? "Creating..." : "Create workflow"}
          </button>
        </div>
      </form>
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
