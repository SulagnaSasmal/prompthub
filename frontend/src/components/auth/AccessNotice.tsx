"use client";

import { LockKeyhole, ShieldCheck } from "lucide-react";
import { useAuth } from "@/components/layout/AuthProvider";

type AccessNoticeProps = {
  title: string;
  allowedRoles: string[];
  description: string;
};

export function AccessNotice({ title, allowedRoles, description }: AccessNoticeProps) {
  const { user } = useAuth();
  const userRoles = new Set((user?.roles || "").split(",").map((role) => role.trim()).filter(Boolean));
  const hasAccess = allowedRoles.some((role) => userRoles.has(role));

  return (
    <section className={`rounded-lg border px-4 py-3 text-sm ${hasAccess ? "border-emerald-200 bg-emerald-50" : "border-amber-200 bg-amber-50"}`}>
      <div className="flex items-start gap-3">
        {hasAccess ? (
          <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
        ) : (
          <LockKeyhole className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" />
        )}
        <div>
          <p className={hasAccess ? "font-semibold text-emerald-950" : "font-semibold text-amber-950"}>{title}</p>
          <p className={hasAccess ? "mt-1 text-emerald-800" : "mt-1 text-amber-800"}>{description}</p>
          <p className={hasAccess ? "mt-1 text-xs text-emerald-700" : "mt-1 text-xs text-amber-700"}>
            Required role: {allowedRoles.join(", ")}. Your role: {user?.roles || "not signed in"}.
          </p>
        </div>
      </div>
    </section>
  );
}
