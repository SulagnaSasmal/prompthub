"use client";

import { usePathname } from "next/navigation";
import { AuthProvider } from "@/components/layout/AuthProvider";
import { Sidebar } from "@/components/layout/Sidebar";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAuthRoute = pathname === "/login";

  return (
    <AuthProvider>
      <div className="min-h-screen bg-slate-50">
        {!isAuthRoute && <Sidebar />}
        <main className={isAuthRoute ? "min-h-screen" : "min-h-screen p-4 md:ml-64 md:p-8"}>
          {children}
        </main>
      </div>
    </AuthProvider>
  );
}
