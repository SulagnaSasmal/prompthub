"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";

interface DiffOut {
  version_a: string;
  version_b: string;
  text_a: string;
  text_b: string;
  diff_lines: string[];
}

export function VersionDiff({ versionId, otherId }: { versionId: string; otherId: string }) {
  const [diff, setDiff] = useState<DiffOut | null>(null);
  const [view, setView] = useState<"unified" | "split">("split");

  useEffect(() => {
    api.versions.diff(versionId, otherId).then((d) => setDiff(d as unknown as DiffOut));
  }, [versionId, otherId]);

  if (!diff) return <div className="animate-pulse h-48 bg-white rounded-lg border border-slate-200" />;

  return (
    <div className="bg-white rounded-lg border border-slate-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-slate-800">
          Diff: v{diff.version_a} vs v{diff.version_b}
        </h3>
        <div className="flex gap-2">
          {(["unified", "split"] as const).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`px-3 py-1 rounded text-xs font-medium capitalize ${
                view === v ? "bg-brand-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {v}
            </button>
          ))}
        </div>
      </div>

      {view === "unified" ? (
        <pre className="text-xs bg-slate-50 rounded-lg p-4 overflow-x-auto">
          {diff.diff_lines.map((line, i) => (
            <div
              key={i}
              className={
                line.startsWith("+")
                  ? "bg-green-50 text-green-800"
                  : line.startsWith("-")
                  ? "bg-red-50 text-red-800"
                  : "text-slate-600"
              }
            >
              {line}
            </div>
          ))}
        </pre>
      ) : (
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs font-medium text-slate-500 mb-2">v{diff.version_a}</p>
            <pre className="text-xs bg-red-50 rounded-lg p-4 overflow-x-auto whitespace-pre-wrap leading-relaxed">
              {diff.text_a}
            </pre>
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500 mb-2">v{diff.version_b}</p>
            <pre className="text-xs bg-green-50 rounded-lg p-4 overflow-x-auto whitespace-pre-wrap leading-relaxed">
              {diff.text_b}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}
