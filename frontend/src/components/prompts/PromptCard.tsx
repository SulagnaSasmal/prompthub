import Link from "next/link";
import type { Prompt } from "@/lib/types";
import { StatusBadge } from "./StatusBadge";
import { RiskBadge } from "./RiskBadge";

export function PromptCard({ prompt }: { prompt: Prompt }) {
  return (
    <Link
      href={`/prompts/${prompt.prompt_id}`}
      className="block bg-white rounded-xl border border-slate-200 p-5 hover:shadow-md transition-shadow"
    >
      <div className="flex items-start justify-between gap-2">
        <h3 className="font-semibold text-slate-900 text-sm leading-snug">{prompt.name}</h3>
        <StatusBadge status={prompt.status} />
      </div>
      <p className="mt-1.5 text-xs text-slate-500 line-clamp-2">{prompt.description}</p>
      <div className="mt-3 flex items-center gap-2 flex-wrap">
        <RiskBadge risk={prompt.risk_level} />
        <span className="text-xs text-slate-400">
          {prompt.category} / {prompt.subcategory}
        </span>
        {prompt.current_version && (
          <span className="text-xs text-slate-400">v{prompt.current_version}</span>
        )}
      </div>
      <div className="mt-2 flex flex-wrap gap-1">
        {prompt.tags.slice(0, 4).map((t) => (
          <span key={t} className="px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded text-xs">
            {t}
          </span>
        ))}
      </div>
    </Link>
  );
}
