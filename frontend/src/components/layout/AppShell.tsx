"use client";

import { usePathname } from "next/navigation";
import { AuthProvider } from "@/components/layout/AuthProvider";
import { FirstRunOnboarding } from "@/components/onboarding/FirstRunOnboarding";
import { Sidebar } from "@/components/layout/Sidebar";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isPublicRoute = pathname === "/" || pathname === "/login";

  return (
    <AuthProvider>
      <div className="min-h-screen bg-slate-50">
        {!isPublicRoute && <Sidebar />}
        <main className={isPublicRoute ? "min-h-screen" : "min-h-screen p-4 md:ml-64 md:p-8"}>
          {children}
        </main>
        {!isPublicRoute && <FirstRunOnboarding />}
      </div>
    </AuthProvider>
  );
}
