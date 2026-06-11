"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { api } from "@/lib/api";
import type { Prompt, Version, Evaluation, TestCase, GovernanceCheck } from "@/lib/types";
import { StatusBadge } from "@/components/prompts/StatusBadge";
import { RiskBadge } from "@/components/prompts/RiskBadge";
import { ScoreCard } from "@/components/evaluation/ScoreCard";
import { VersionDiff } from "@/components/prompts/VersionDiff";

export default function PromptDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [prompt, setPrompt] = useState<Prompt | null>(null);
  const [versions, setVersions] = useState<Version[]>([]);
  const [selectedVersion, setSelectedVersion] = useState<Version | null>(null);
  const [evaluations, setEvaluations] = useState<Evaluation[]>([]);
  const [testCases, setTestCases] = useState<TestCase[]>([]);
  const [govChecks, setGovChecks] = useState<GovernanceCheck[]>([]);
  const [diffWith, setDiffWith] = useState<string>("");
  const [tab, setTab] = useState<"overview" | "tests" | "evaluations" | "governance" | "history">("overview");

  useEffect(() => {
    api.prompts.get(id).then(setPrompt);
    api.versions.list(id).then((vs) => {
      setVersions(vs);
      if (vs.length > 0) setSelectedVersion(vs[0]);
    });
  }, [id]);

  useEffect(() => {
    if (!selectedVersion) return;
    api.evaluations.list(selectedVersion.version_id).then(setEvaluations);
    api.tests.list(selectedVersion.version_id).then(setTestCases);
    api.governance.list(selectedVersion.version_id).then(setGovChecks);
  }, [selectedVersion]);

  if (!prompt) {
    return <div className="animate-pulse h-64 bg-white rounded-xl border border-slate-200" />;
  }

  const meanScore =
    evaluations.length > 0
      ? evaluations.reduce((sum, e) => sum + Number(e.overall_score), 0) / evaluations.length
      : null;

  return (
    <div className="max-w-5xl">
      {/* Header */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 mb-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h2 className="text-xl font-bold text-slate-900">{prompt.name}</h2>
              <StatusBadge status={prompt.status} />
              <RiskBadge risk={prompt.risk_level} />
            </div>
            <p className="text-sm text-slate-600">{prompt.description}</p>
            <div className="mt-3 flex flex-wrap gap-4 text-xs text-slate-500">
              <span>Category: {prompt.category} / {prompt.subcategory}</span>
              <span>Model: {prompt.target_model}</span>
              {prompt.current_version && <span>Version: v{prompt.current_version}</span>}
              <span>Views: {prompt.view_count}</span>
            </div>
          </div>
          {meanScore !== null && (
            <div className="text-center">
              <div
                className={`text-3xl font-bold ${
                  meanScore >= 85 ? "text-emerald-600" : meanScore >= 70 ? "text-yellow-600" : "text-red-600"
                }`}
              >
                {meanScore.toFixed(1)}%
              </div>
              <div className="text-xs text-slate-500 mt-0.5">Quality score</div>
            </div>
          )}
        </div>
        <div className="mt-3 flex flex-wrap gap-1">
          {prompt.tags.map((t) => (
            <span key={t} className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-xs">
              {t}
            </span>
          ))}
        </div>
      </div>

      {/* Version selector */}
      {versions.length > 0 && (
        <div className="flex items-center gap-3 mb-4">
          <label className="text-sm font-medium text-slate-700">Version:</label>
          <select
            value={selectedVersion?.version_id ?? ""}
            onChange={(e) => {
              const v = versions.find((v) => v.version_id === e.target.value);
              if (v) setSelectedVersion(v);
            }}
            className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          >
            {versions.map((v) => (
              <option key={v.version_id} value={v.version_id}>
                v{v.version_number} — {v.status}
              </option>
            ))}
          </select>
          {versions.length > 1 && (
            <>
              <span className="text-slate-400 text-sm">Compare with:</span>
              <select
                value={diffWith}
                onChange={(e) => setDiffWith(e.target.value)}
                className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              >
                <option value="">— none —</option>
                {versions
                  .filter((v) => v.version_id !== selectedVersion?.version_id)
                  .map((v) => (
                    <option key={v.version_id} value={v.version_id}>
                      v{v.version_number}
                    </option>
                  ))}
              </select>
            </>
          )}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 mb-4 border-b border-slate-200">
        {(["overview", "tests", "evaluations", "governance", "history"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium capitalize transition-colors ${
              tab === t
                ? "border-b-2 border-brand-600 text-brand-600"
                : "text-slate-500 hover:text-slate-900"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === "overview" && selectedVersion && (
        <div className="space-y-4">
          {diffWith ? (
            <VersionDiff versionId={selectedVersion.version_id} otherId={diffWith} />
          ) : (
            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-slate-800">Prompt Text — v{selectedVersion.version_number}</h3>
                <StatusBadge status={selectedVersion.status} />
              </div>
              <pre className="whitespace-pre-wrap text-sm text-slate-700 bg-slate-50 rounded-lg p-4 leading-relaxed">
                {selectedVersion.prompt_text}
              </pre>
              <p className="mt-3 text-xs text-slate-500">
                Change: {selectedVersion.change_summary}
              </p>
            </div>
          )}
        </div>
      )}

      {tab === "tests" && (
        <div className="space-y-3">
          {testCases.length === 0 ? (
            <p className="text-sm text-slate-400">No test cases yet.</p>
          ) : (
            testCases.map((tc) => (
              <div key={tc.test_case_id} className="bg-white rounded-xl border border-slate-200 p-5">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-sm text-slate-800">{tc.name}</span>
                  <span
                    className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                      tc.result === "Pass"
                        ? "bg-green-100 text-green-700"
                        : tc.result === "Fail"
                        ? "bg-red-100 text-red-700"
                        : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    {tc.result}
                  </span>
                </div>
                <p className="text-xs text-slate-500 mb-1"><strong>Input:</strong> {tc.input}</p>
                <p className="text-xs text-slate-500"><strong>Expected:</strong> {tc.expected_behavior}</p>
                {tc.evidence && (
                  <p className="text-xs text-slate-400 mt-1 italic">Evidence: {tc.evidence}</p>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {tab === "evaluations" && (
        <div className="space-y-4">
          {evaluations.length === 0 ? (
            <p className="text-sm text-slate-400">No evaluations recorded yet.</p>
          ) : (
            evaluations.map((ev) => <ScoreCard key={ev.evaluation_id} evaluation={ev} />)
          )}
        </div>
      )}

      {tab === "governance" && (
        <div className="space-y-3">
          {govChecks.length === 0 ? (
            <p className="text-sm text-slate-400">No governance checks recorded yet.</p>
          ) : (
            govChecks.map((gc) => (
              <div key={gc.check_id} className="bg-white rounded-xl border border-slate-200 p-5">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-sm text-slate-800">{gc.check_type}</span>
                  <span
                    className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                      gc.result === "Pass"
                        ? "bg-green-100 text-green-700"
                        : gc.result === "Flag"
                        ? "bg-yellow-100 text-yellow-700"
                        : "bg-red-100 text-red-700"
                    }`}
                  >
                    {gc.result}
                  </span>
                </div>
                {gc.notes && <p className="mt-2 text-xs text-slate-500">{gc.notes}</p>}
              </div>
            ))
          )}
        </div>
      )}

      {tab === "history" && (
        <div className="space-y-2">
          {versions.map((v) => (
            <div
              key={v.version_id}
              className="bg-white rounded-xl border border-slate-200 p-4 flex items-center justify-between"
            >
              <div>
                <span className="font-semibold text-sm text-slate-800">v{v.version_number}</span>
                <span className="ml-3 text-xs text-slate-500">{v.change_summary}</span>
              </div>
              <div className="flex items-center gap-2">
                <StatusBadge status={v.status} />
                <span className="text-xs text-slate-400">
                  {new Date(v.created_at).toLocaleDateString()}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
