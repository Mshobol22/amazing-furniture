"use client";

import { useCallback, useMemo, useState } from "react";
import { CheckCircle, Clock, Loader2, RefreshCw, XCircle } from "lucide-react";
import ValidationRunner from "./ValidationRunner";

type ValidationStats = {
  valid: number;
  broken: number;
  unchecked: number;
};

export default function ValidationDashboardClient({
  initialStats,
}: {
  initialStats: ValidationStats;
}) {
  const [stats, setStats] = useState<ValidationStats>(initialStats);
  const [refreshing, setRefreshing] = useState(false);

  const refreshStats = useCallback(async () => {
    setRefreshing(true);
    try {
      const res = await fetch("/api/admin/validate-images/stats", {
        method: "GET",
        cache: "no-store",
      });
      if (!res.ok) return stats;
      const next = (await res.json()) as ValidationStats;
      setStats(next);
      return next;
    } finally {
      setRefreshing(false);
    }
  }, [stats]);

  const statCards = useMemo(
    () => [
      {
        label: "All Images Valid",
        value: stats.valid,
        icon: CheckCircle,
        iconColor: "text-green-700",
        iconBg: "bg-green-100",
      },
      {
        label: "Fully Broken",
        value: stats.broken,
        icon: XCircle,
        iconColor: stats.broken > 0 ? "text-red-600" : "text-gray-400",
        iconBg: stats.broken > 0 ? "bg-red-100" : "bg-gray-100",
      },
      {
        label: "Not Yet Checked",
        value: stats.unchecked,
        icon: Clock,
        iconColor: stats.unchecked > 0 ? "text-amber-700" : "text-gray-400",
        iconBg: stats.unchecked > 0 ? "bg-amber-100" : "bg-gray-100",
      },
    ],
    [stats]
  );

  return (
    <>
      <div className="mb-6">
        <div className="mb-2 flex items-center justify-between">
          <p className="text-sm text-gray-500">Live stats</p>
          <button
            type="button"
            onClick={() => void refreshStats()}
            className="inline-flex items-center gap-1 text-xs text-gray-500 hover:text-[#2D4A3E]"
          >
            {refreshing ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <RefreshCw className="h-3.5 w-3.5" />
            )}
            Refresh
          </button>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          {statCards.map((card) => (
            <div key={card.label} className="rounded-xl border border-gray-200 bg-white p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="mb-1 text-sm font-medium text-gray-500">{card.label}</p>
                  <p className="text-3xl font-bold text-gray-900">{card.value}</p>
                </div>
                <div className={`rounded-lg p-3 ${card.iconBg}`}>
                  <card.icon className={`h-6 w-6 ${card.iconColor}`} />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="mb-8">
        <ValidationRunner onAfterRun={refreshStats} />
      </div>
    </>
  );
}
