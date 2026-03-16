"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Subscriber {
  id: string;
  email: string;
  subscribed_at: string;
  source: string;
  is_active: boolean;
}

interface NewsletterTableProps {
  subscribers: Subscriber[];
  totalCount: number;
}

export default function NewsletterTable({
  subscribers,
  totalCount,
}: NewsletterTableProps) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [toggling, setToggling] = useState<string | null>(null);

  const filtered = query.trim()
    ? subscribers.filter((s) =>
        s.email.toLowerCase().includes(query.trim().toLowerCase())
      )
    : subscribers;

  const handleToggle = async (id: string, currentActive: boolean) => {
    setToggling(id);
    try {
      const res = await fetch(`/api/admin/newsletter/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: !currentActive }),
      });
      if (res.ok) {
        router.refresh();
      }
    } finally {
      setToggling(null);
    }
  };

  const handleExport = () => {
    window.location.href = "/api/admin/newsletter/export";
  };

  return (
    <div>
      {/* Stats + actions bar */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm text-warm-gray">
            <span className="text-2xl font-semibold text-charcoal">
              {totalCount}
            </span>{" "}
            total subscriber{totalCount !== 1 ? "s" : ""}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <input
            type="text"
            placeholder="Search by email..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-56 rounded-md border border-gray-200 px-3 py-1.5 text-sm text-charcoal focus:border-walnut focus:outline-none focus:ring-1 focus:ring-walnut"
          />
          <button
            onClick={handleExport}
            className="rounded-md px-4 py-1.5 text-sm font-medium text-white"
            style={{ backgroundColor: "#2D4A3E" }}
          >
            Export CSV
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-warm-gray">Email</th>
              <th className="px-4 py-3 text-left font-medium text-warm-gray">Subscribed</th>
              <th className="px-4 py-3 text-left font-medium text-warm-gray">Source</th>
              <th className="px-4 py-3 text-left font-medium text-warm-gray">Status</th>
              <th className="px-4 py-3 text-right font-medium text-warm-gray">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-warm-gray">
                  {query ? "No subscribers match your search." : "No subscribers yet."}
                </td>
              </tr>
            ) : (
              filtered.map((sub) => (
                <tr key={sub.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-charcoal">
                    {sub.email}
                  </td>
                  <td className="px-4 py-3 text-warm-gray">
                    {new Date(sub.subscribed_at).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    })}
                  </td>
                  <td className="px-4 py-3 text-warm-gray capitalize">
                    {sub.source}
                  </td>
                  <td className="px-4 py-3">
                    {sub.is_active ? (
                      <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800">
                        Active
                      </span>
                    ) : (
                      <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-600">
                        Unsubscribed
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => handleToggle(sub.id, sub.is_active)}
                      disabled={toggling === sub.id}
                      className="text-xs text-warm-gray underline hover:text-charcoal disabled:opacity-50"
                    >
                      {toggling === sub.id
                        ? "Saving..."
                        : sub.is_active
                        ? "Unsubscribe"
                        : "Reactivate"}
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
