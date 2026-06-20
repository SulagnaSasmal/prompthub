"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { api } from "@/lib/api";
import type {
  Comment,
  Evaluation,
  Example,
  FieldQuality,
  GovernanceCheck,
  Prompt,
  Run,
  StyleFlag,
  StyleProfile,
  TestCase,
  Variable,
  Version,
} from "@/lib/types";
import { StatusBadge } from "@/components/prompts/StatusBadge";
import { RiskBadge } from "@/components/prompts/RiskBadge";
import { ScoreCard } from "@/components/evaluation/ScoreCard";
import { VersionDiff } from "@/components/prompts/VersionDiff";
import { CheckCircle2, Copy, Download, MessageSquare, Play, Save, ShieldCheck, Sparkles } from "lucide-react";

const RATING_TAGS = ["Useful", "Inaccurate", "Too verbose", "Wrong tone", "Missing details", "Hallucinated content"];

export default function PromptDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [prompt, setPrompt] = useState<Prompt | null>(null);
  const [versions, setVersions] = useState<Version[]>([]);
  const [selectedVersion, setSelectedVersion] = useState<Version | null>(null);
  const [variables, setVariables] = useState<Variable[]>([]);
  const [examples, setExamples] = useState<Example[]>([]);
  const [evaluations, setEvaluations] = useState<Evaluation[]>([]);
  const [fieldQuality, setFieldQuality] = useState<FieldQuality | null>(null);
  const [testCases, setTestCases] = useState<TestCase[]>([]);
  const [govChecks, setGovChecks] = useState<GovernanceCheck[]>([]);
  const [styleProfiles, setStyleProfiles] = useState<StyleProfile[]>([]);
  const [styleFlags, setStyleFlags] = useState<StyleFlag[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [inputs, setInputs] = useState<Record<string, string>>({});
  const [run, setRun] = useState<Run | null>(null);
  const [ratingTags, setRatingTags] = useState<string[]>([]);
  const [commentText, setCommentText] = useState("");
  const [integrationSource, setIntegrationSource] = useState("markdown");
  const [integrationLocator, setIntegrationLocator] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [running, setRunning] = useState(false);
  const [tab, setTab] = useState<"run" | "governance" | "tests" | "evaluations" | "comments" | "history">("run");
  const [diffWith, setDiffWith] = useState("");

  useEffect(() => {
    api.prompts.get(id).then(setPrompt).catch((e) => setError(e.message));
    api.versions.list(id).then((vs) => {
      setVersions(vs);
      const current = vs.find((v) => v.status === "Production") || vs[0] || null;
      setSelectedVersion(current);
    });
    api.workflows.styleProfiles().then(setStyleProfiles).catch(() => setStyleProfiles([]));
  }, [id]);

  useEffect(() => {
    if (!selectedVersion) return;
    Promise.all([
      api.workflows.variables(selectedVersion.version_id),
      api.workflows.examples(selectedVersion.version_id),
      api.evaluations.list(selectedVersion.version_id),
      api.tests.list(selectedVersion.version_id),
      api.governance.list(selectedVersion.version_id),
      api.workflows.fieldQuality(selectedVersion.version_id),
      api.workflows.comments("version", selectedVersion.version_id),
    ])
      .then(([vars, ex, ev, tests, checks, quality, versionComments]) => {
        setVariables(vars);
        setExamples(ex);
        setEvaluations(ev);
        setTestCases(tests);
        setGovChecks(checks);
        setFieldQuality(quality);
        setComments(versionComments);
        const firstExample = ex[0]?.input_payload || {};
        setInputs(
          Object.fromEntries(
            vars.map((v) => [v.name, String(firstExample[v.name] ?? v.default_value ?? v.example_value ?? "")])
          )
        );
      })
      .catch((e) => setError(e.message));
  }, [selectedVersion]);

  const meanScore = useMemo(
    () => (evaluations.length ? evaluations.reduce((sum, e) => sum + Number(e.overall_score), 0) / evaluations.length : null),
    [evaluations]
  );

  async function handleRun() {
    if (!selectedVersion) return;
    setError("");
    setMessage("");
    setRunning(true);
    try {
      const result = await api.workflows.run(selectedVersion.version_id, inputs, true);
      setRun(result);
      setStyleFlags([]);
      setMessage(result.governance_result === "Blocked" ? "Run blocked and logged." : "Output generated through the server-side gateway.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Run failed");
    } finally {
      setRunning(false);
    }
  }

  async function rateRun() {
    if (!run || !selectedVersion) return;
    await api.workflows.rate(run.run_id, { tags: ratingTags, comment: commentText });
    setFieldQuality(await api.workflows.fieldQuality(selectedVersion.version_id));
    setMessage("Rating saved to the field-quality signal.");
  }

  async function promote(kind: "example" | "test") {
    if (!run) return;
    if (kind === "example") {
      const example = await api.workflows.promoteExample(run.run_id, "Promoted from a highly rated writer run.");
      setExamples((prev) => [example, ...prev]);
      setMessage("Run promoted to an example.");
    } else {
      const testCase = await api.workflows.promoteTest(run.run_id, "Expected characteristics captured from the writer run.");
      setTestCases((prev) => [testCase, ...prev]);
      setMessage("Run promoted to a test case.");
    }
  }

  async function exportMarkdown() {
    if (!run) return;
    const exported = await api.workflows.exportRun(run.run_id);
    const blob = new Blob([exported.content], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = exported.filename;
    link.click();
    URL.revokeObjectURL(url);
    setMessage("Markdown export downloaded.");
  }

  async function fetchSource() {
    const fetched = await api.workflows.fetchSource(integrationSource, {
      locator: integrationLocator,
      content: integrationLocator,
    });
    const target = variables.find((v) => v.var_type === "source-reference") || variables[0];
    if (target) setInputs((prev) => ({ ...prev, [target.name]: fetched.content }));
    setMessage(`Fetched ${fetched.source} content as read-only input.`);
  }

  async function checkStyle() {
    const profileId = prompt?.style_profile_id || styleProfiles[0]?.style_profile_id;
    if (!profileId || !run?.output_text) return;
    const result = await api.workflows.styleCheck(profileId, run.output_text);
    setStyleFlags(result.flags);
    setMessage(result.flags.length ? "Style check found flagged spans." : "Style check passed.");
  }

  async function createAndAttachStyle() {
    const profile = await api.workflows.createStyleProfile({
      name: "Docs House Style",
      status: "Approved",
      rules: [
        { rule_type: "banned_phrase", pattern: "leverage", message: "Use a more direct verb.", severity: "warning" },
        { rule_type: "terminology", pattern: "end-user", message: "Use customer or user, depending on context.", severity: "warning" },
      ],
    });
    await api.workflows.attachStyleProfile(id, profile.style_profile_id);
    setStyleProfiles((prev) => [profile, ...prev]);
    setPrompt((prev) => (prev ? { ...prev, style_profile_id: profile.style_profile_id } : prev));
    setMessage("Approved style profile attached for runtime injection and style checks.");
  }

  async function addComment() {
    if (!selectedVersion || !commentText.trim()) return;
    const created = await api.workflows.createComment({
      target_type: "version",
      target_id: selectedVersion.version_id,
      body: commentText,
    });
    setComments((prev) => [...prev, created]);
    setCommentText("");
  }

  if (!prompt) return <div className="h-64 animate-pulse rounded-lg border border-slate-200 bg-white" />;

  return (
    <div className="max-w-6xl">
      <div className="mb-4 rounded-lg border border-slate-200 bg-white p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <h2 className="text-xl font-bold text-slate-900">{prompt.name}</h2>
              <StatusBadge status={prompt.status} />
              <RiskBadge risk={prompt.risk_level} />
            </div>
            <p className="max-w-3xl text-sm text-slate-600">{prompt.description}</p>
            <div className="mt-3 flex flex-wrap gap-4 text-xs text-slate-500">
              <span>{prompt.task_type}</span>
              <span>Model: {prompt.target_model}</span>
              <span>Owner: {prompt.owner_id.slice(0, 8)}</span>
              <span>{prompt.run_count} runs</span>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 text-center">
            <Metric label="Formal" value={meanScore === null ? "New" : `${meanScore.toFixed(1)}%`} />
            <Metric label="Field" value={fieldQuality ? `${fieldQuality.useful_rate}%` : "0%"} />
          </div>
        </div>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <select
          value={selectedVersion?.version_id ?? ""}
          onChange={(e) => setSelectedVersion(versions.find((v) => v.version_id === e.target.value) || null)}
          className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
        >
          {versions.map((v) => (
            <option key={v.version_id} value={v.version_id}>
              v{v.version_number} - {v.status}
            </option>
          ))}
        </select>
        {(["run", "governance", "tests", "evaluations", "comments", "history"] as const).map((item) => (
          <button
            key={item}
            onClick={() => setTab(item)}
            className={`rounded-lg px-3 py-2 text-sm font-medium capitalize ${
              tab === item ? "bg-slate-900 text-white" : "border border-slate-200 bg-white text-slate-600"
            }`}
          >
            {item}
          </button>
        ))}
      </div>

      {error && <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      {message && <p className="mb-3 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{message}</p>}

      {tab === "run" && selectedVersion && (
        <div className="grid gap-4 lg:grid-cols-[380px_1fr]">
          <section className="space-y-4">
            <div className="rounded-lg border border-slate-200 bg-white p-5">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="font-semibold text-slate-900">Inputs</h3>
                <button onClick={handleRun} disabled={running} className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-3 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60">
                  <Play className="h-4 w-4" />
                  {running ? "Running" : "Run"}
                </button>
              </div>
              {variables.length === 0 ? (
                <p className="text-sm text-slate-500">Metadata only. Add template variables before this workflow is runnable.</p>
              ) : (
                <div className="space-y-3">
                  {variables.map((variable) => (
                    <label key={variable.variable_id} className="block">
                      <span className="text-xs font-semibold text-slate-700">
                        {variable.label}{variable.required ? " *" : ""}
                      </span>
                      {variable.var_type === "select" ? (
                        <select
                          value={inputs[variable.name] || ""}
                          onChange={(e) => setInputs((prev) => ({ ...prev, [variable.name]: e.target.value }))}
                          className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                        >
                          <option value="">Select</option>
                          {variable.options.map((option) => <option key={option}>{option}</option>)}
                        </select>
                      ) : (
                        <textarea
                          value={inputs[variable.name] || ""}
                          onChange={(e) => setInputs((prev) => ({ ...prev, [variable.name]: e.target.value }))}
                          className="mt-1 min-h-24 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                          placeholder={variable.help_text || variable.example_value || ""}
                        />
                      )}
                    </label>
                  ))}
                </div>
              )}
            </div>

            <div className="rounded-lg border border-slate-200 bg-white p-5">
              <h3 className="mb-3 font-semibold text-slate-900">Source</h3>
              <div className="flex gap-2">
                <select value={integrationSource} onChange={(e) => setIntegrationSource(e.target.value)} className="rounded-lg border border-slate-200 px-2 py-2 text-sm">
                  <option value="markdown">Markdown</option>
                  <option value="github">GitHub</option>
                  <option value="jira">Jira</option>
                  <option value="openapi">OpenAPI</option>
                </select>
                <button onClick={fetchSource} className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700">Fetch</button>
              </div>
              <textarea value={integrationLocator} onChange={(e) => setIntegrationLocator(e.target.value)} className="mt-2 min-h-20 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" placeholder="Paste Markdown or enter a Jira key, GitHub URL, or OpenAPI reference" />
            </div>

            <div className="rounded-lg border border-slate-200 bg-white p-5">
              <div className="mb-3 flex items-center justify-between gap-2">
                <h3 className="font-semibold text-slate-900">Examples</h3>
                <span className="text-xs text-slate-500">{examples.length}</span>
              </div>
              <div className="space-y-3">
                {examples.slice(0, 2).map((example) => (
                  <div key={example.example_id} className="rounded-lg bg-slate-50 p-3 text-xs text-slate-600">
                    <p className="font-medium text-slate-800">{example.note || "Good output example"}</p>
                    <p className="mt-1 line-clamp-3">{example.output_text}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="rounded-lg border border-slate-200 bg-white p-5">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <h3 className="font-semibold text-slate-900">Result</h3>
              <div className="flex flex-wrap gap-2">
                <button onClick={() => navigator.clipboard.writeText(run?.output_text || "")} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700">
                  <Copy className="h-4 w-4" /> Copy
                </button>
                <button onClick={exportMarkdown} disabled={!run} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 disabled:opacity-50">
                  <Download className="h-4 w-4" /> Markdown
                </button>
                <button onClick={() => promote("example")} disabled={!run?.output_text} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 disabled:opacity-50">
                  <Save className="h-4 w-4" /> Example
                </button>
                <button onClick={() => promote("test")} disabled={!run?.output_text} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 disabled:opacity-50">
                  <CheckCircle2 className="h-4 w-4" /> Test
                </button>
                <button onClick={checkStyle} disabled={!run?.output_text} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 disabled:opacity-50">
                  <ShieldCheck className="h-4 w-4" /> Style
                </button>
              </div>
            </div>
            <pre className="min-h-72 whitespace-pre-wrap rounded-lg bg-slate-950 p-4 text-sm leading-relaxed text-slate-50">
              {run?.blocked_reason || run?.output_text || "Run the workflow to generate output."}
            </pre>
            <div className="mt-4 flex flex-wrap gap-2">
              {RATING_TAGS.map((tag) => (
                <button
                  key={tag}
                  onClick={() => setRatingTags((prev) => prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag])}
                  className={`rounded-full px-3 py-1.5 text-xs font-medium ${ratingTags.includes(tag) ? "bg-brand-600 text-white" : "bg-slate-100 text-slate-600"}`}
                >
                  {tag}
                </button>
              ))}
              <button onClick={rateRun} disabled={!run || ratingTags.length === 0} className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50">
                Rate
              </button>
            </div>
            {styleFlags.length > 0 && (
              <div className="mt-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-800">
                {styleFlags.map((flag) => <p key={`${flag.rule_id}-${flag.start}`}>{flag.matched_text}: {flag.message}</p>)}
              </div>
            )}
            {!prompt.style_profile_id && (
              <button onClick={createAndAttachStyle} className="mt-4 inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700">
                <Sparkles className="h-4 w-4" /> Attach house style
              </button>
            )}
          </section>
        </div>
      )}

      {tab === "governance" && <List items={govChecks.map((g) => `${g.check_type}: ${g.result}${g.notes ? ` - ${g.notes}` : ""}`)} empty="No governance checks recorded yet." />}
      {tab === "tests" && <List items={testCases.map((t) => `${t.name}: ${t.result} - ${t.expected_behavior}`)} empty="No test cases yet." />}
      {tab === "evaluations" && <div className="space-y-4">{evaluations.map((ev) => <ScoreCard key={ev.evaluation_id} evaluation={ev} />)}</div>}
      {tab === "comments" && selectedVersion && (
        <div className="rounded-lg border border-slate-200 bg-white p-5">
          <div className="space-y-3">
            {comments.map((comment) => <p key={comment.comment_id} className="rounded-lg bg-slate-50 p-3 text-sm text-slate-700">{comment.body}</p>)}
          </div>
          <div className="mt-4 flex gap-2">
            <input value={commentText} onChange={(e) => setCommentText(e.target.value)} className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm" placeholder="@mention an owner or reviewer" />
            <button onClick={addComment} className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-2 text-sm font-semibold text-white">
              <MessageSquare className="h-4 w-4" /> Comment
            </button>
          </div>
        </div>
      )}
      {tab === "history" && selectedVersion && (
        <div className="space-y-4">
          {versions.length > 1 && (
            <select value={diffWith} onChange={(e) => setDiffWith(e.target.value)} className="rounded-lg border border-slate-200 px-3 py-2 text-sm">
              <option value="">Compare version</option>
              {versions.filter((v) => v.version_id !== selectedVersion.version_id).map((v) => <option key={v.version_id} value={v.version_id}>v{v.version_number}</option>)}
            </select>
          )}
          {diffWith ? <VersionDiff versionId={selectedVersion.version_id} otherId={diffWith} /> : <List items={versions.map((v) => `v${v.version_number}: ${v.status} - ${v.change_summary}`)} empty="No version history." />}
        </div>
      )}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-slate-50 px-4 py-3">
      <div className="text-lg font-bold text-slate-900">{value}</div>
      <div className="text-xs text-slate-500">{label}</div>
    </div>
  );
}

function List({ items, empty }: { items: string[]; empty: string }) {
  if (!items.length) return <p className="rounded-lg border border-slate-200 bg-white p-5 text-sm text-slate-500">{empty}</p>;
  return (
    <div className="space-y-3">
      {items.map((item, index) => (
        <p key={`${item}-${index}`} className="rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-700">{item}</p>
      ))}
    </div>
  );
}
