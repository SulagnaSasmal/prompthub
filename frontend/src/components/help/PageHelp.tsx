"use client";

import { useEffect, useId, useState } from "react";
import { CircleHelp, ListChecks, X } from "lucide-react";

type PageHelpProps = {
  title: string;
  description: string;
  steps: string[];
  note?: string;
};

export function PageHelp({ title, description, steps, note }: PageHelpProps) {
  const [open, setOpen] = useState(false);
  const titleId = useId();

  useEffect(() => {
    if (!open) return;

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 shadow-sm transition-colors hover:border-brand-200 hover:text-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-500"
        aria-label={`Help: ${title}`}
        title="Page help"
      >
        <CircleHelp className="h-4 w-4" />
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4" role="presentation">
          <button
            type="button"
            className="absolute inset-0 cursor-default"
            onClick={() => setOpen(false)}
            aria-label="Close help"
          />
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            className="relative w-full max-w-lg rounded-lg border border-slate-200 bg-white p-5 text-sm shadow-xl"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 id={titleId} className="text-lg font-semibold text-slate-900">
                  {title}
                </h3>
                <p className="mt-2 text-slate-600">{description}</p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-500"
                aria-label="Close help"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-5 border-t border-slate-100 pt-4">
              <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase text-slate-500">
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
          </section>
        </div>
      )}
    </>
  );
}
