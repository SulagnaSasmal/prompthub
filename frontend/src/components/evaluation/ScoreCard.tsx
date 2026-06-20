import type { Evaluation } from "@/lib/types";

const METRICS = [
  { key: "accuracy_score", label: "Accuracy", weight: "30%" },
  { key: "completeness_score", label: "Completeness", weight: "25%" },
  { key: "tone_score", label: "Tone Consistency", weight: "15%" },
  { key: "hallucination_score", label: "Hallucination Risk", weight: "20%" },
  { key: "formatting_score", label: "Formatting", weight: "10%" },
] as const;

function scoreColor(score: number): string {
  if (score >= 9) return "text-emerald-600";
  if (score >= 7) return "text-blue-600";
  if (score >= 5) return "text-yellow-600";
  return "text-red-600";
}

export function ScoreCard({ evaluation }: { evaluation: Evaluation }) {
  const overall = Number(evaluation.overall_score);
  const overallColor = overall >= 85 ? "text-emerald-600" : overall >= 70 ? "text-yellow-600" : "text-red-600";

  return (
    <div className="bg-white border border-slate-200 rounded-lg p-5">
      <div className="flex items-center justify-between mb-4">
        <h4 className="font-semibold text-slate-800">Evaluation Run #{evaluation.run_number}</h4>
        <div className={`text-2xl font-bold ${overallColor}`}>{overall.toFixed(1)}%</div>
      </div>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-xs text-slate-500 border-b border-slate-100">
            <th className="text-left pb-2">Metric</th>
            <th className="text-center pb-2">Score</th>
            <th className="text-right pb-2">Weight</th>
          </tr>
        </thead>
        <tbody>
          {METRICS.map(({ key, label, weight }) => (
            <tr key={key} className="border-b border-slate-50">
              <td className="py-1.5 text-slate-700">{label}</td>
              <td className={`py-1.5 text-center font-semibold ${scoreColor(evaluation[key])}`}>
                {evaluation[key]}/10
              </td>
              <td className="py-1.5 text-right text-slate-400">{weight}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
