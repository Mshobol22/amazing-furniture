"use client";

import { useState } from "react";
import { PlayCircle, Loader2 } from "lucide-react";

interface BatchResult {
  processed: number;
  allValid: number;
  partialFixed: number;
  fullyBroken: number;
  remaining: number;
}

export default function ValidationRunner() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<BatchResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function runBatch() {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch("/api/admin/validate-images", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ limit: 50 }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? `Request failed (${res.status})`);
      }

      const data: BatchResult = await res.json();
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-gray-900">Run Validation Batch</h2>
          <p className="mt-1 text-sm text-gray-500">
            Checks up to 50 unvalidated products per run.
          </p>
        </div>
        <button
          onClick={runBatch}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-lg bg-[#2D4A3E] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#3B5E4F] disabled:opacity-50"
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <PlayCircle className="h-4 w-4" />
          )}
          {loading ? "Running…" : "Run Validation Batch"}
        </button>
      </div>

      {error && (
        <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

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
