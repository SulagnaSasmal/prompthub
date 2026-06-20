"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { BookOpen, ClipboardCheck, Library, Play, X } from "lucide-react";
import { useAuth } from "@/components/layout/AuthProvider";

const STORAGE_KEY = "prompthub:first-run-onboarding-dismissed";

export function FirstRunOnboarding() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (localStorage.getItem(STORAGE_KEY)) return;
    const id = window.setTimeout(() => setOpen(true), 350);
    return () => window.clearTimeout(id);
  }, []);

  function dismiss() {
    localStorage.setItem(STORAGE_KEY, "true");
    setOpen(false);
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/35 p-4">
      <section className="relative w-full max-w-2xl rounded-lg border border-slate-200 bg-white p-6 shadow-xl">
        <button
          type="button"
          onClick={dismiss}
          className="absolute right-4 top-4 inline-flex h-8 w-8 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-500"
          aria-label="Close onboarding"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="pr-8">
          <p className="text-xs font-semibold uppercase text-brand-600">First run</p>
          <h2 className="mt-1 text-2xl font-bold text-slate-900">Explore PromptHub with seeded demo workflows</h2>
          <p className="mt-2 text-sm text-slate-600">
            {user
              ? `You are signed in as ${user.username}. Start with the library, run a workflow, then inspect the review and quality signals.`
              : "Sign in with the demo account, then start with the library, run a workflow, and inspect the review and quality signals."}
          </p>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-2">
          <Step icon={<Library className="h-5 w-5" />} title="1. Browse" text="Open the Working Library and filter by task type or risk." />
          <Step icon={<Play className="h-5 w-5" />} title="2. Run" text="Open a production workflow, paste source material, and generate output." />
          <Step icon={<ClipboardCheck className="h-5 w-5" />} title="3. Review" text="Use Review Queue to see tests, examples, approvals, and gaps." />
          <Step icon={<BookOpen className="h-5 w-5" />} title="4. Learn" text="Use the help icon on each page or the full manual for exact steps." />
        </div>

        <div className="mt-5 rounded-lg bg-slate-50 p-4 text-sm text-slate-700">
          <p className="font-semibold text-slate-900">Demo account</p>
          <p className="mt-1">Username <span className="font-mono">admin</span> with password <span className="font-mono">Prompthub2026!</span>.</p>
        </div>

        <div className="mt-5 flex flex-wrap gap-3">
          <Link href={user ? "/library" : "/login"} onClick={dismiss} className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700">
            {user ? "Open library" : "Sign in"}
          </Link>
          <Link href="/help" onClick={dismiss} className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
            Read manual
          </Link>
          <button type="button" onClick={dismiss} className="rounded-lg px-4 py-2 text-sm font-semibold text-slate-500 hover:bg-slate-50">
            Skip
          </button>
        </div>
      </section>
    </div>
  );
}

function Step({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <div className="text-brand-600">{icon}</div>
      <p className="mt-3 font-semibold text-slate-900">{title}</p>
      <p className="mt-1 text-sm text-slate-600">{text}</p>
    </div>
  );
}
