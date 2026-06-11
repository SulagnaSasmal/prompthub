"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import type { Prompt } from "@/lib/types";
import { PromptCard } from "@/components/prompts/PromptCard";

const CATEGORIES = ["All", "Documentation", "Support", "Product Management", "Compliance"];
const STATUSES = ["All", "Draft", "In Review", "Testing", "Approved", "Production", "Retired"];
const RISKS = ["All", "Low", "Medium", "High"];

export default function LibraryPage() {
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [category, setCategory] = useState("All");
  const [status, setStatus] = useState("All");
  const [risk, setRisk] = useState("All");
  const [search, setSearch] = useState("");

  useEffect(() => {
    const params: Record<string, string> = {};
    if (category !== "All") params.category = category;
    if (status !== "All") params.status = status;
    if (risk !== "All") params.risk_level = risk;

    setLoading(true);
    api.prompts
      .list(params)
      .then(setPrompts)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [category, status, risk]);

  const filtered = prompts.filter(
    (p) =>
      !search ||
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.description.toLowerCase().includes(search.toLowerCase()) ||
      p.tags.some((t) => t.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Prompt Library</h2>
          <p className="text-sm text-slate-500 mt-0.5">{filtered.length} prompts</p>
        </div>
        <a
          href="/prompts/new"
          className="bg-brand-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-brand-700 transition-colors"
        >
          + New Prompt
        </a>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        <input
          type="search"
          placeholder="Search prompts..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="border border-slate-200 rounded-lg px-3 py-2 text-sm w-56 focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
        <Select label="Category" value={category} options={CATEGORIES} onChange={setCategory} />
        <Select label="Status" value={status} options={STATUSES} onChange={setStatus} />
        <Select label="Risk" value={risk} options={RISKS} onChange={setRisk} />
      </div>

      {error && <p className="text-sm text-red-600 mb-4">{error}</p>}

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-white rounded-xl border border-slate-200 p-5 animate-pulse h-40" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 text-slate-400">
          <p className="text-lg font-medium">No prompts found</p>
          <p className="text-sm mt-1">Try adjusting your filters or create a new prompt.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((p) => (
            <PromptCard key={p.prompt_id} prompt={p} />
          ))}
        </div>
      )}
    </div>
  );
}

function Select({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (v: string) => void;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
    >
      {options.map((o) => (
        <option key={o} value={o}>
          {o === "All" ? `All ${label}s` : o}
        </option>
      ))}
    </select>
  );
}
