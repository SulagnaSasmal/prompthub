"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import type { StyleProfile } from "@/lib/types";
import { PageHelp } from "@/components/help/PageHelp";
import { Plus, ShieldCheck } from "lucide-react";

export default function StyleProfilesPage() {
  const [profiles, setProfiles] = useState<StyleProfile[]>([]);
  const [form, setForm] = useState({
    name: "Docs House Style",
    pattern: "",
    message: "",
    rule_type: "banned_phrase",
    severity: "warning",
  });
  const [sample, setSample] = useState("");
  const [selectedProfile, setSelectedProfile] = useState("");
  const [flags, setFlags] = useState<string[]>([]);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function load() {
    try {
      const nextProfiles = await api.workflows.styleProfiles();
      setProfiles(nextProfiles);
      setSelectedProfile((current) => current || nextProfiles[0]?.style_profile_id || "");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load style profiles");
    }
  }

  useEffect(() => {
    let isActive = true;
    api.workflows
      .styleProfiles()
      .then((nextProfiles) => {
        if (!isActive) return;
        setProfiles(nextProfiles);
        setSelectedProfile((current) => current || nextProfiles[0]?.style_profile_id || "");
      })
      .catch((err) => {
        if (!isActive) return;
        setError(err instanceof Error ? err.message : "Could not load style profiles");
      });
    return () => {
      isActive = false;
    };
  }, []);

  async function createProfile(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    setMessage("");
    try {
      await api.workflows.createStyleProfile({
        name: form.name,
        status: "Approved",
        rules: [
          {
            rule_type: form.rule_type,
            pattern: form.pattern,
            message: form.message || `Review "${form.pattern}" before publishing.`,
            severity: form.severity,
          },
        ],
      });
      setForm({ ...form, pattern: "", message: "" });
      setMessage("Style profile saved.");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save style profile");
    }
  }

  async function checkSample() {
    if (!selectedProfile || !sample.trim()) return;
    const result = await api.workflows.styleCheck(selectedProfile, sample);
    setFlags(result.flags.map((flag) => `${flag.matched_text}: ${flag.message}`));
  }

  return (
    <div className="max-w-6xl space-y-6">
      <div>
        <div className="flex items-center gap-2">
          <h2 className="text-2xl font-bold text-slate-900">Style Profiles</h2>
          <PageHelp
            title="Use this page to manage writing style rules."
            description="Style profiles capture banned phrases, preferred terminology, voice guidance, and formatting checks for generated output."
            steps={[
              "Create a profile rule with a pattern, message, rule type, and severity.",
              "Review configured profiles to make sure terminology rules match the team standard.",
              "Paste sample output into the style checker and choose a profile.",
              "Attach approved profiles to workflows from the workflow detail page when runtime checks should apply.",
            ]}
          />
        </div>
        <p className="mt-1 text-sm text-slate-500">Governed terminology, voice, and formatting rules for generated writing.</p>
      </div>

      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      {message && <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{message}</p>}

      <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
        <form onSubmit={createProfile} className="rounded-lg border border-slate-200 bg-white p-5">
          <h3 className="font-semibold text-slate-900">New rule profile</h3>
          <div className="mt-4 space-y-3">
            <Field label="Profile name">
              <input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
            </Field>
            <Field label="Rule type">
              <select value={form.rule_type} onChange={(event) => setForm({ ...form, rule_type: event.target.value })} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm">
                <option value="banned_phrase">Banned phrase</option>
                <option value="preferred_term">Preferred term</option>
                <option value="voice">Voice</option>
                <option value="formatting">Formatting</option>
              </select>
            </Field>
            <Field label="Pattern">
              <input value={form.pattern} onChange={(event) => setForm({ ...form, pattern: event.target.value })} required placeholder="leverage" className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
            </Field>
            <Field label="Message">
              <input value={form.message} onChange={(event) => setForm({ ...form, message: event.target.value })} placeholder="Use a more direct verb." className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
            </Field>
            <Field label="Severity">
              <select value={form.severity} onChange={(event) => setForm({ ...form, severity: event.target.value })} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm">
                <option value="warning">Warning</option>
                <option value="error">Error</option>
              </select>
            </Field>
          </div>
          <button type="submit" className="mt-4 inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white">
            <Plus className="h-4 w-4" />
            Save profile
          </button>
        </form>

        <section className="rounded-lg border border-slate-200 bg-white">
          <div className="border-b border-slate-100 px-5 py-4">
            <h3 className="font-semibold text-slate-900">Configured profiles</h3>
          </div>
          {profiles.length === 0 ? (
            <p className="p-5 text-sm text-slate-500">No style profiles yet.</p>
          ) : (
            <div className="divide-y divide-slate-100">
              {profiles.map((profile) => (
                <div key={profile.style_profile_id} className="p-5">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-semibold text-slate-900">{profile.name}</p>
                      <p className="mt-1 text-xs text-slate-500">v{profile.version_number} - {profile.status} - {profile.rules.length} rules</p>
                    </div>
                    <ShieldCheck className="h-5 w-5 text-emerald-600" />
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {profile.rules.map((rule) => (
                      <span key={rule.rule_id} className="rounded-full bg-slate-100 px-2 py-1 text-xs text-slate-600">
                        {rule.pattern}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      <section className="rounded-lg border border-slate-200 bg-white p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="font-semibold text-slate-900">Try a style check</h3>
          <select value={selectedProfile} onChange={(event) => setSelectedProfile(event.target.value)} className="rounded-lg border border-slate-200 px-3 py-2 text-sm">
            {profiles.map((profile) => <option key={profile.style_profile_id} value={profile.style_profile_id}>{profile.name}</option>)}
          </select>
        </div>
        <textarea value={sample} onChange={(event) => setSample(event.target.value)} className="mt-3 min-h-28 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" placeholder="Paste generated output to check terminology and banned phrases." />
        <button onClick={checkSample} disabled={!selectedProfile || !sample.trim()} className="mt-3 rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
          Check style
        </button>
        {flags.length > 0 && <div className="mt-3 rounded-lg bg-amber-50 p-3 text-sm text-amber-800">{flags.map((flag) => <p key={flag}>{flag}</p>)}</div>}
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
