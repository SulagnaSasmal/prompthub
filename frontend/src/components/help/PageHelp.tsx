import { CircleHelp, ListChecks } from "lucide-react";

type PageHelpProps = {
  title: string;
  description: string;
  steps: string[];
  note?: string;
};

export function PageHelp({ title, description, steps, note }: PageHelpProps) {
  return (
    <details open className="rounded-lg border border-slate-200 bg-white p-4 text-sm shadow-sm">
      <summary className="flex cursor-pointer list-none items-start gap-3">
        <CircleHelp className="mt-0.5 h-5 w-5 shrink-0 text-brand-600" />
        <span className="min-w-0">
          <span className="block font-semibold text-slate-900">{title}</span>
          <span className="mt-1 block text-slate-600">{description}</span>
        </span>
      </summary>
      <div className="mt-4 border-t border-slate-100 pt-4">
        <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase text-slate-500">
          <ListChecks className="h-4 w-4" />
          Steps
        </div>
        <ol className="space-y-2 pl-5 text-slate-700">
          {steps.map((step) => (
            <li key={step} className="list-decimal">
              {step}
            </li>
          ))}
        </ol>
        {note && <p className="mt-4 rounded-md bg-slate-50 px-3 py-2 text-xs text-slate-600">{note}</p>}
      </div>
    </details>
  );
}
