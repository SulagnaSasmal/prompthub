"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "./AuthProvider";
import clsx from "clsx";

const nav = [
  { href: "/library", label: "Working Library" },
  { href: "/runs", label: "Run History" },
  { href: "/review", label: "Review Queue" },
  { href: "/style-profiles", label: "Style Profiles" },
  { href: "/integrations", label: "Integrations" },
  { href: "/deployments", label: "Deployments" },
  { href: "/dashboard", label: "Dashboard" },
  { href: "/admin", label: "Admin" },
  { href: "/help", label: "Help" },
];

export function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  return (
    <aside className="fixed left-0 top-0 h-full w-64 bg-slate-900 text-white flex flex-col">
      <div className="px-6 py-5 border-b border-slate-700">
        <h1 className="text-lg font-bold tracking-tight text-white">PromptHub</h1>
        <p className="text-xs text-slate-400 mt-0.5">Governed Writing Workspace</p>
      </div>

      <nav className="flex-1 px-4 py-4 space-y-1">
        {nav.map(({ href, label }) => (
          <Link
            key={href}
            href={href}
            className={clsx(
              "block px-3 py-2 rounded-md text-sm font-medium transition-colors",
              pathname.startsWith(href)
                ? "bg-brand-600 text-white"
                : "text-slate-300 hover:bg-slate-800 hover:text-white"
            )}
          >
            {label}
          </Link>
        ))}
      </nav>

      <div className="px-6 py-4 border-t border-slate-700">
        {user ? (
          <div>
            <p className="text-sm font-medium text-white truncate">{user.username}</p>
            <p className="text-xs text-slate-400 truncate">{user.roles}</p>
            <button
              onClick={logout}
              className="mt-2 text-xs text-slate-400 hover:text-white transition-colors"
            >
              Sign out
            </button>
          </div>
        ) : (
          <Link href="/login" className="text-sm text-brand-400 hover:text-brand-300">
            Sign in
          </Link>
        )}
      </div>
    </aside>
  );
}
