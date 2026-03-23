"use client";

import { useSearchParams, useRouter, usePathname } from "next/navigation";

const SORT_OPTIONS = [
  { value: "", label: "Featured" },
  { value: "price_asc", label: "Price: Low to High" },
  { value: "price_desc", label: "Price: High to Low" },
  { value: "newest", label: "Newest" },
  { value: "name_asc", label: "Name A–Z" },
];

export default function SortDropdown() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const currentSort = searchParams.get("sort") ?? "";

  const handleChange = (value: string) => {
    const p = new URLSearchParams(searchParams.toString());
    p.delete("page");
    if (value) p.set("sort", value);
    else p.delete("sort");
    const qs = p.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
  };

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-[#1C1C1C]/60">Sort By:</span>
      <select
        value={currentSort}
        onChange={(e) => handleChange(e.target.value)}
        className="rounded-lg border border-[#1C1C1C]/15 bg-white px-3 py-2 text-sm text-[#1C1C1C] focus:border-[#2D4A3E] focus:outline-none focus:ring-1 focus:ring-[#2D4A3E]"
      >
        {SORT_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}
