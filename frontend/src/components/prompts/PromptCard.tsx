import Link from "next/link";
import type { Prompt } from "@/lib/types";
import { StatusBadge } from "./StatusBadge";
import { RiskBadge } from "./RiskBadge";
import { Play, Search } from "lucide-react";

export function PromptCard({ prompt }: { prompt: Prompt }) {
  const runnable = prompt.status === "Approved" || prompt.status === "Production";

  return (
    <article className="bg-white rounded-lg border border-slate-200 p-5 shadow-sm transition-shadow hover:shadow-md">
      <div className="flex items-start justify-between gap-2">
        <h3 className="font-semibold text-slate-900 text-sm leading-snug">{prompt.name}</h3>
        <StatusBadge status={prompt.status} />
      </div>
      <p className="mt-1.5 text-xs text-slate-500 line-clamp-2">{prompt.description}</p>
      <div className="mt-3 flex items-center gap-2 flex-wrap text-xs">
        <RiskBadge risk={prompt.risk_level} />
        <span className="text-slate-500">{prompt.task_type}</span>
        {prompt.current_version && (
          <span className="text-slate-400">v{prompt.current_version}</span>
        )}
      </div>
      <div className="mt-4 grid grid-cols-3 gap-2 border-t border-slate-100 pt-3 text-xs text-slate-500">
        <div>
          <div className="font-semibold text-slate-900">{prompt.formal_quality_score ? `${prompt.formal_quality_score}%` : "New"}</div>
          <div>Quality</div>
        </div>
        <div>
          <div className="font-semibold text-slate-900">{prompt.run_count}</div>
          <div>Runs</div>
        </div>
        <div>
          <div className="font-semibold text-slate-900 truncate">{prompt.target_model}</div>
          <div>Model</div>
        </div>
      </div>
      <div className="mt-4 flex items-center gap-2">
        <Link
          href={`/prompts/${prompt.prompt_id}`}
          className={`inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${
            runnable
              ? "bg-brand-600 text-white hover:bg-brand-700"
              : "bg-slate-200 text-slate-500"
          }`}
          title={runnable ? "Run workflow" : "Workflow is metadata only until approved and backfilled"}
        >
          <Play className="h-4 w-4" />
          Run
        </Link>
        <Link
          href={`/prompts/${prompt.prompt_id}`}
          className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
        >
          <Search className="h-4 w-4" />
          View
        </Link>
      </div>
    </article>
  );
}
