import clsx from "clsx";
import type { RiskLevel } from "@/lib/types";

const COLOR: Record<RiskLevel, string> = {
  Low: "bg-green-100 text-green-800",
  Medium: "bg-yellow-100 text-yellow-800",
  High: "bg-red-100 text-red-800",
};

export function RiskBadge({ risk }: { risk: RiskLevel }) {
  return (
    <span className={clsx("px-2 py-0.5 rounded-full text-xs font-semibold", COLOR[risk])}>
      {risk} risk
    </span>
  );
}
