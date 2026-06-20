import Link from "next/link";
import type { ReactNode } from "react";
import { BookOpen, CheckCircle2, ClipboardList, Play, ShieldCheck } from "lucide-react";

const quickStart = [
  "Sign in with an account that has the right role for your work.",
  "Open Working Library and choose a workflow by task type, status, or risk.",
  "Open the workflow, review examples, fill the required inputs, and run it.",
  "Copy or export the output, then rate it so the field-quality score improves.",
  "Save strong outputs as examples or tests when you have author or reviewer access.",
];

const roles = [
  { name: "Writer or Consumer", work: "Finds approved workflows, runs them, exports drafts, and rates output." },
  { name: "Author", work: "Creates workflows, versions, template variables, examples, and improvement drafts." },
  { name: "Reviewer", work: "Uses Review Queue to complete tests, evaluations, comments, and governance checks." },
  { name: "Approver", work: "Promotes approved versions to Production and watches deployment webhook delivery." },
  { name: "Admin", work: "Configures webhook endpoints, users, model settings, and operational controls." },
];

export default function HelpPage() {
  return (
    <div className="max-w-6xl space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">PromptHub Manual</h2>
        <p className="mt-1 text-sm text-slate-500">A practical guide for working with governed writing workflows.</p>
      </div>

      <section className="grid gap-4 md:grid-cols-4">
        <ManualLink href="/library" icon={<BookOpen className="h-5 w-5" />} title="Find Workflows" text="Browse approved writing tasks." />
        <ManualLink href="/runs" icon={<Play className="h-5 w-5" />} title="Review Runs" text="Inspect generated outputs." />
        <ManualLink href="/review" icon={<ClipboardList className="h-5 w-5" />} title="Process Review" text="Finish tests and approvals." />
        <ManualLink href="/style-profiles" icon={<ShieldCheck className="h-5 w-5" />} title="Check Style" text="Enforce terminology rules." />
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-6">
        <h3 className="font-semibold text-slate-900">Quick start</h3>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {quickStart.map((step, index) => (
            <div key={step} className="flex gap-3 rounded-lg bg-slate-50 p-4">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-600 text-sm font-bold text-white">{index + 1}</div>
              <p className="text-sm text-slate-700">{step}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-6">
        <h3 className="font-semibold text-slate-900">Role guide</h3>
        <div className="mt-4 divide-y divide-slate-100">
          {roles.map((role) => (
            <div key={role.name} className="grid gap-2 py-3 md:grid-cols-[180px_1fr]">
              <p className="font-medium text-slate-900">{role.name}</p>
              <p className="text-sm text-slate-600">{role.work}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <GuideCard title="Create a workflow" items={[
          "Use New Workflow from the Working Library.",
          "Add metadata, risk level, task type, and tags.",
          "Create a version with a template such as {{source_text}}.",
          "Define matching variables and add at least one good example.",
        ]} />
        <GuideCard title="Run a workflow" items={[
          "Open an Approved or Production workflow.",
          "Paste Markdown or fetch source from GitHub, Jira, or OpenAPI.",
          "Run through the server-side gateway.",
          "Copy, export Markdown, rate, or promote the output.",
        ]} />
        <GuideCard title="Approve safely" items={[
          "Use Review Queue to find missing tests and examples.",
          "Complete evaluation and governance checks.",
          "Promote only when tests pass and risk gates are clear.",
          "Watch Deployments for webhook delivery status.",
        ]} />
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-6">
        <h3 className="font-semibold text-slate-900">Good workflow checklist</h3>
        <div className="mt-4 grid gap-2 md:grid-cols-2">
          {[
            "The purpose is clear from the workflow name and description.",
            "The prompt uses declared variables and no hidden inputs.",
            "At least one example shows good input and good output.",
            "Tests cover normal, edge, and high-risk cases.",
            "Style profile rules match the team terminology.",
            "Production versions have deployment delivery visibility.",
          ].map((item) => (
            <p key={item} className="flex gap-2 text-sm text-slate-700">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
              {item}
            </p>
          ))}
        </div>
      </section>
    </div>
  );
}

function ManualLink({ href, icon, title, text }: { href: string; icon: ReactNode; title: string; text: string }) {
  return (
    <Link href={href} className="rounded-lg border border-slate-200 bg-white p-4 transition-shadow hover:shadow-md">
      <div className="text-brand-600">{icon}</div>
      <p className="mt-3 font-semibold text-slate-900">{title}</p>
      <p className="mt-1 text-sm text-slate-500">{text}</p>
    </Link>
  );
}

function GuideCard({ title, items }: { title: string; items: string[] }) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5">
      <h3 className="font-semibold text-slate-900">{title}</h3>
      <ul className="mt-3 space-y-2 text-sm text-slate-600">
        {items.map((item) => <li key={item}>{item}</li>)}
      </ul>
    </section>
  );
}
