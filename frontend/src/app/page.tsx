import Link from "next/link";
import { ArrowRight, CheckCircle2, ClipboardCheck, Library, ShieldCheck, Sparkles } from "lucide-react";

const audiences = [
  "Technical writers building repeatable release notes, API summaries, migration guides, and KB articles.",
  "Documentation managers who need quality scores, review queues, and workflow ownership.",
  "Product, support, and compliance teams that need reusable writing flows with audit trails.",
];

const demoPath = [
  { label: "Browse", text: "Find seeded workflows by category, task type, status, or risk." },
  { label: "Run", text: "Paste source material and generate governed output through the model gateway." },
  { label: "Review", text: "Promote strong outputs into examples, tests, approvals, and production versions." },
];

export default function HomePage() {
  return (
    <div className="min-h-screen bg-white text-slate-900">
      <header className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
        <Link href="/" className="font-bold tracking-tight text-slate-950">PromptHub</Link>
        <nav className="flex items-center gap-3 text-sm">
          <Link href="/help" className="text-slate-600 hover:text-slate-950">Manual</Link>
          <Link href="/login" className="rounded-lg bg-slate-950 px-4 py-2 font-semibold text-white hover:bg-slate-800">Sign in</Link>
        </nav>
      </header>

      <main>
        <section className="relative overflow-hidden bg-slate-950">
          <div className="absolute inset-y-10 left-[42%] hidden w-[760px] opacity-55 lg:block">
            <ProductPreview />
          </div>
          <div className="absolute inset-0 bg-slate-950/80" />
          <div className="relative mx-auto min-h-[560px] max-w-7xl px-6 py-14">
            <p className="text-sm font-semibold uppercase text-brand-500">Governed writing workspace</p>
            <h1 className="mt-4 max-w-3xl text-5xl font-bold leading-tight text-white md:text-6xl">
              PromptHub
            </h1>
            <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-300">
              A reusable prompt library for teams that need technical writing workflows, approval gates, quality signals, and production deployment visibility.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/login" className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-5 py-3 text-sm font-semibold text-white hover:bg-brand-700">
                Try the demo
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link href="/library" className="rounded-lg border border-slate-700 px-5 py-3 text-sm font-semibold text-slate-100 hover:bg-slate-900">
                Open library
              </Link>
            </div>
            <div className="mt-6 rounded-lg border border-slate-800 bg-slate-900 p-4 text-sm text-slate-300">
              Demo account: <span className="font-mono text-white">admin</span> / <span className="font-mono text-white">Prompthub2026!</span>
            </div>
            <div className="mt-8 lg:hidden">
              <ProductPreview />
            </div>
          </div>
        </section>

        <section className="border-y border-slate-200 bg-sky-50">
          <div className="mx-auto grid max-w-7xl gap-6 px-6 py-10 md:grid-cols-3">
            {demoPath.map((item) => (
              <div key={item.label}>
                <p className="text-sm font-semibold text-brand-700">{item.label}</p>
                <p className="mt-2 text-sm leading-6 text-slate-700">{item.text}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mx-auto grid max-w-7xl gap-8 px-6 py-12 lg:grid-cols-[340px_1fr]">
          <div>
            <h2 className="text-2xl font-bold">Who it is for</h2>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              PromptHub is best for teams that already repeat the same writing tasks and need a controlled way to improve them over time.
            </p>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {audiences.map((item) => (
              <div key={item} className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
                <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                <p className="mt-3 text-sm leading-6 text-slate-700">{item}</p>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}

function ProductPreview() {
  return (
    <div className="rounded-lg border border-slate-800 bg-slate-900 p-4 shadow-2xl">
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div>
          <p className="text-sm font-semibold text-white">Working Library</p>
          <p className="text-xs text-slate-400">Seeded demo workflows</p>
        </div>
        <Sparkles className="h-5 w-5 text-brand-500" />
      </div>
      <div className="mt-4 space-y-3">
        <PreviewRow icon={<Library className="h-4 w-4" />} title="Release Note Generator" meta="Production | Low risk | 3 tests" />
        <PreviewRow icon={<ClipboardCheck className="h-4 w-4" />} title="Bug Report to KB Article" meta="Production | Medium risk | review ready" />
        <PreviewRow icon={<ShieldCheck className="h-4 w-4" />} title="Migration Plan Drafter" meta="Production | governance passed" />
      </div>
      <div className="mt-4 rounded-lg bg-slate-950 p-4">
        <p className="text-xs font-semibold uppercase text-slate-500">Workflow output</p>
        <p className="mt-2 text-sm leading-6 text-slate-200">
          Customer-facing draft with source references, style guidance, review status, and export history.
        </p>
      </div>
    </div>
  );
}

function PreviewRow({ icon, title, meta }: { icon: React.ReactNode; title: string; meta: string }) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-slate-800 bg-slate-950 p-3">
      <div className="text-brand-500">{icon}</div>
      <div>
        <p className="text-sm font-semibold text-white">{title}</p>
        <p className="mt-0.5 text-xs text-slate-400">{meta}</p>
      </div>
    </div>
  );
}
