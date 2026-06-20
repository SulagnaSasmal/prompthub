"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import type { DashboardMetrics } from "@/lib/types";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from "recharts";

const RISK_COLORS: Record<string, string> = {
  Low: "#10b981",
  Medium: "#f59e0b",
  High: "#ef4444",
};

function StatCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="bg-white rounded-lg border border-slate-200 p-5">
      <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">{label}</p>
      <p className="mt-1 text-3xl font-bold text-slate-900">{value ?? "—"}</p>
      {sub && <p className="mt-0.5 text-xs text-slate-400">{sub}</p>}
    </div>
  );
}

export default function DashboardPage() {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api.dashboard.metrics().then(setMetrics).catch((e) => setError(e.message));
  }, []);

  if (error) return <p className="text-red-600 text-sm">{error}</p>;
  if (!metrics) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-white rounded-lg border border-slate-200 p-5 h-24 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  const categoryData = Object.entries(metrics.prompts_by_category).map(([name, value]) => ({ name, value }));
  const riskData = Object.entries(metrics.risk_distribution).map(([name, value]) => ({ name, value }));

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-slate-900">Dashboard</h2>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Prompts" value={metrics.total_prompts} sub="excluding retired" />
        <StatCard label="Approved" value={metrics.approved_prompts} sub="approved or production" />
        <StatCard
          label="Avg Quality Score"
          value={metrics.average_quality_score ? `${metrics.average_quality_score}%` : "—"}
          sub="production prompts"
        />
        <StatCard label="Open Flags" value={metrics.open_governance_flags} sub="governance flags" />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg border border-slate-200 p-5">
          <h3 className="font-semibold text-slate-800 mb-4 text-sm">Prompts by Category</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={categoryData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="value" fill="#3b82f6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-lg border border-slate-200 p-5">
          <h3 className="font-semibold text-slate-800 mb-4 text-sm">Risk Distribution</h3>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={riskData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                {riskData.map((entry) => (
                  <Cell key={entry.name} fill={RISK_COLORS[entry.name] ?? "#94a3b8"} />
                ))}
              </Pie>
              <Legend />
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg border border-slate-200 p-5">
          <h3 className="font-semibold text-slate-800 mb-3 text-sm">Most Viewed Prompts</h3>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-slate-500 border-b border-slate-100">
                <th className="text-left pb-2">Name</th>
                <th className="text-right pb-2">Views</th>
              </tr>
            </thead>
            <tbody>
              {metrics.most_viewed.map((p) => (
                <tr key={p.prompt_id} className="border-b border-slate-50">
                  <td className="py-1.5 text-slate-700 truncate max-w-[200px]">
                    <a href={`/prompts/${p.prompt_id}`} className="hover:text-brand-600 transition-colors">
                      {p.name}
                    </a>
                  </td>
                  <td className="py-1.5 text-right text-slate-500">{p.view_count}</td>
                </tr>
              ))}
              {metrics.most_viewed.length === 0 && (
                <tr>
                  <td colSpan={2} className="py-4 text-center text-slate-400 text-xs">
                    No data yet
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="bg-white rounded-lg border border-slate-200 p-5">
          <h3 className="font-semibold text-slate-800 mb-3 text-sm">Library Summary</h3>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-slate-500">Retired prompts</dt>
              <dd className="font-medium text-slate-800">{metrics.retired_prompts}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-500">Failed (last 90 days)</dt>
              <dd className="font-medium text-slate-800">{metrics.failed_prompts_last_90_days}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-500">Open governance flags</dt>
              <dd className={`font-medium ${metrics.open_governance_flags > 0 ? "text-yellow-600" : "text-slate-800"}`}>
                {metrics.open_governance_flags}
              </dd>
            </div>
          </dl>
        </div>
      </div>
    </div>
  );
}
