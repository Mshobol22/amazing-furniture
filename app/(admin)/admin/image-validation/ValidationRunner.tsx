"use client";

import { useRef, useState } from "react";
import { PlayCircle, Loader2 } from "lucide-react";

interface BatchResult {
  processed: number;
  allValid: number;
  partialFixed: number;
  fullyBroken: number;
  remaining: number;
}

interface ValidationRunnerProps {
  onAfterRun?: () => Promise<unknown> | unknown;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export default function ValidationRunner({ onAfterRun }: ValidationRunnerProps) {
  const [loading, setLoading] = useState(false);
  const [runningAll, setRunningAll] = useState(false);
  const [result, setResult] = useState<BatchResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<string | null>(null);
  const [progress, setProgress] = useState({ validated: 0, approxTotal: 0 });
  const stopAllRef = useRef(false);

  async function runBatch(limit = 200) {
    setLoading(true);
    setSummary(null);
    setError(null);
    setResult(null);

    try {
      const res = await fetch("/api/admin/validate-images", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ limit }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? `Request failed (${res.status})`);
      }

      const data: BatchResult = await res.json();
      setResult(data);
      if (onAfterRun) await onAfterRun();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  async function runAll() {
    if (runningAll) {
      stopAllRef.current = true;
      return;
    }

    setRunningAll(true);
    setLoading(false);
    setSummary(null);
    setError(null);
    setResult(null);
    setProgress({ validated: 0, approxTotal: 0 });
    stopAllRef.current = false;

    let totalAllValid = 0;
    let totalPartialFixed = 0;
    let totalFullyBroken = 0;
    let validated = 0;
    let approxTotal = 0;

    try {
      const statsRes = await fetch("/api/admin/validate-images/stats", {
        method: "GET",
        cache: "no-store",
      });
      if (statsRes.ok) {
        const stats = (await statsRes.json()) as {
          valid: number;
          broken: number;
          unchecked: number;
        };
        approxTotal = Math.max(stats.unchecked, 0);
        setProgress({ validated: 0, approxTotal });
      }

      while (!stopAllRef.current) {
        const res = await fetch("/api/admin/validate-images", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ limit: 500 }),
        });

        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error ?? `Request failed (${res.status})`);
        }

        const data: BatchResult = await res.json();
        setResult(data);

        totalAllValid += data.allValid;
        totalPartialFixed += data.partialFixed;
        totalFullyBroken += data.fullyBroken;
        validated += data.processed;
        setProgress((prev) => ({
          validated,
          approxTotal: prev.approxTotal || approxTotal || validated + data.remaining,
        }));

        if (onAfterRun) await onAfterRun();
        if (data.remaining === 0) break;
        await sleep(500);
      }

      if (stopAllRef.current) {
        setSummary(
          `Stopped. ${totalAllValid} valid, ${totalPartialFixed} partial fixed, ${totalFullyBroken} fully broken.`
        );
      } else {
        setSummary(
          `Done. ${totalAllValid} valid, ${totalPartialFixed} partial fixed, ${totalFullyBroken} fully broken.`
        );
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setRunningAll(false);
      stopAllRef.current = false;
    }
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-gray-900">Run Validation Batch</h2>
          <p className="mt-1 text-sm text-gray-500">
            Run a single batch (200) or process all unchecked products automatically.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => void runBatch(200)}
            disabled={loading || runningAll}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-800 transition-colors hover:border-[#2D4A3E] disabled:opacity-50"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <PlayCircle className="h-4 w-4" />}
            {loading ? "Running…" : "Run Batch (200)"}
          </button>
          <button
            onClick={() => void runAll()}
            className="inline-flex items-center gap-2 rounded-lg bg-[#2D4A3E] px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-[#3B5E4F]"
          >
            {runningAll ? <Loader2 className="h-4 w-4 animate-spin" /> : <PlayCircle className="h-4 w-4" />}
            {runningAll ? "Running... (stop)" : "Validate All"}
          </button>
        </div>
      </div>

      {error && (
        <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {runningAll ? (
        <div className="mt-4 rounded-lg border border-gray-200 bg-gray-50 p-3">
          <p className="text-sm text-gray-700">
            Validated {progress.validated} of ~{progress.approxTotal || progress.validated} products...
          </p>
          <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-gray-200">
            <div
              className="h-full bg-[#2D4A3E] transition-all"
              style={{
                width: `${
                  progress.approxTotal > 0
                    ? Math.min((progress.validated / progress.approxTotal) * 100, 100)
                    : 0
                }%`,
              }}
            />
          </div>
        </div>
      ) : null}

      {summary ? (
        <div className="mt-4 rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-800">
          {summary}
        </div>
      ) : null}

      {result && (
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-5">
          {[
            { label: "Processed", value: result.processed, color: "text-gray-900" },
            { label: "All Valid", value: result.allValid, color: "text-green-700" },
            { label: "Partial Fixed", value: result.partialFixed, color: "text-amber-700" },
            { label: "Fully Broken", value: result.fullyBroken, color: "text-red-600" },
            { label: "Remaining", value: result.remaining, color: "text-gray-500" },
          ].map((stat) => (
            <div
              key={stat.label}
              className="rounded-lg border border-gray-100 bg-gray-50 p-3 text-center"
            >
              <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
              <p className="mt-0.5 text-xs text-gray-500">{stat.label}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
