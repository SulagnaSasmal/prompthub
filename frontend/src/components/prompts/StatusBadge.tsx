import clsx from "clsx";
import type { Status } from "@/lib/types";

const COLOR: Record<Status, string> = {
  Draft: "bg-slate-100 text-slate-700",
  "In Review": "bg-yellow-100 text-yellow-800",
  Testing: "bg-blue-100 text-blue-800",
  Approved: "bg-green-100 text-green-800",
  Production: "bg-emerald-600 text-white",
  Retired: "bg-red-100 text-red-700",
};

export function StatusBadge({ status }: { status: Status }) {
  return (
    <span className={clsx("px-2 py-0.5 rounded-full text-xs font-semibold", COLOR[status])}>
      {status}
    </span>
  );
}
