"use client";

import { useEffect, useMemo, useState } from "react";

export interface FilterSection {
  id: string;
  label: string;
  type: "checkbox" | "price_range" | "sort";
  options?: { value: string; count: number; label?: string }[];
  defaultOpen?: boolean;
}

export interface ActiveFilters {
  [sectionId: string]: string | string[] | null | number | undefined;
  priceMin?: number | null;
  priceMax?: number | null;
  sort?: string | null;
}

interface FilterSidebarProps {
  sections: FilterSection[];
  activeFilters: ActiveFilters;
  onChange: (filterId: string, value: string | string[] | null) => void;
  onClear: () => void;
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}

function FilterSidebarContent({
  sections,
  activeFilters,
  onChange,
  onClear,
}: Omit<FilterSidebarProps, "mobileOpen" | "onMobileClose">) {
  const [openMap, setOpenMap] = useState<Record<string, boolean>>({});
  const [pendingMin, setPendingMin] = useState("");
  const [pendingMax, setPendingMax] = useState("");

  useEffect(() => {
    setOpenMap((prev) => {
      const next: Record<string, boolean> = {};
      for (const section of sections) {
        next[section.id] = prev[section.id] ?? Boolean(section.defaultOpen);
      }
      return next;
    });
  }, [sections]);

  useEffect(() => {
    const min = activeFilters.priceMin;
    const max = activeFilters.priceMax;
    setPendingMin(min == null ? "" : String(min));
    setPendingMax(max == null ? "" : String(max));
  }, [activeFilters.priceMin, activeFilters.priceMax]);

  const activeCount = useMemo(() => {
    let count = 0;
    for (const section of sections) {
      if (section.type === "price_range") {
        if (activeFilters.priceMin != null) count += 1;
        if (activeFilters.priceMax != null) count += 1;
        continue;
      }
      const raw = activeFilters[section.id];
      if (Array.isArray(raw)) count += raw.length;
      else if (typeof raw === "string" && raw.trim().length > 0) count += 1;
    }
    return count;
  }, [activeFilters, sections]);

  const toggleSection = (id: string) => {
    setOpenMap((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const applyPrice = () => {
    onChange("priceMin", pendingMin.trim() ? pendingMin.trim() : null);
    onChange("priceMax", pendingMax.trim() ? pendingMax.trim() : null);
  };

  return (
    <div className="space-y-0">
      {activeCount > 0 ? (
        <button
          type="button"
          onClick={onClear}
          className="mb-4 inline-flex text-xs font-medium text-[#2D4A3E] hover:underline"
        >
          Clear all filters ({activeCount})
        </button>
      ) : null}

      {sections.map((section) => {
        const isOpen = openMap[section.id] ?? Boolean(section.defaultOpen);
        const options = section.options ?? [];
        const sectionValue = activeFilters[section.id];
        const isMulti = Array.isArray(sectionValue);
        const selected = Array.isArray(sectionValue)
          ? sectionValue
          : typeof sectionValue === "string" && sectionValue
            ? [sectionValue]
            : [];

        return (
          <div key={section.id} className="border-b border-[#1C1C1C]/10 pb-3">
            <button
              type="button"
              onClick={() => toggleSection(section.id)}
              className="flex w-full items-center justify-between py-2.5 text-sm font-semibold text-[#1C1C1C]"
            >
              {section.label}
              <span className="text-[#1C1C1C]/40">{isOpen ? "−" : "+"}</span>
            </button>

            {isOpen ? (
              <div className="mt-2">
                {section.type === "checkbox" ? (
                  <div className="max-h-[220px] space-y-2 overflow-y-auto">
                    {options.map((item) => {
                      const checked = selected.includes(item.value);
                      return (
                        <label
                          key={item.value}
                          className="flex cursor-pointer items-center justify-between gap-2 text-sm text-[#1C1C1C]/80 hover:text-[#1C1C1C]"
                        >
                          <span className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => {
                                if (isMulti) {
                                  const next = checked
                                    ? selected.filter((v) => v !== item.value)
                                    : [...selected, item.value];
                                  onChange(section.id, next);
                                } else {
                                  onChange(section.id, checked ? null : item.value);
                                }
                              }}
                              className="h-4 w-4 rounded border-[#1C1C1C]/20 text-[#2D4A3E] focus:ring-[#2D4A3E]"
                            />
                            {item.label ?? item.value}
                          </span>
                          <span className="text-xs text-[#1C1C1C]/40">
                            {item.count.toLocaleString()}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                ) : null}

                {section.type === "price_range" ? (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min={0}
                        max={99999}
                        placeholder="Min"
                        value={pendingMin}
                        onChange={(e) => setPendingMin(e.target.value)}
                        className="w-full rounded border border-[#1C1C1C]/15 px-2 py-1.5 text-sm focus:border-[#2D4A3E] focus:outline-none focus:ring-1 focus:ring-[#2D4A3E]"
                      />
                      <span className="text-[#1C1C1C]/40">—</span>
                      <input
                        type="number"
                        min={0}
                        max={99999}
                        placeholder="Max"
                        value={pendingMax}
                        onChange={(e) => setPendingMax(e.target.value)}
                        className="w-full rounded border border-[#1C1C1C]/15 px-2 py-1.5 text-sm focus:border-[#2D4A3E] focus:outline-none focus:ring-1 focus:ring-[#2D4A3E]"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={applyPrice}
                      className="w-full rounded bg-[#2D4A3E] py-1.5 text-xs font-medium text-[#FAF8F5] transition-colors hover:bg-[#3B5E4F]"
                    >
                      Apply
                    </button>
                  </div>
                ) : null}

                {section.type === "sort" ? (
                  <select
                    value={typeof sectionValue === "string" ? sectionValue : ""}
                    onChange={(e) => onChange(section.id, e.target.value || null)}
                    className="w-full rounded border border-[#1C1C1C]/15 bg-white px-3 py-2 text-sm text-[#1C1C1C] focus:border-[#2D4A3E] focus:outline-none focus:ring-1 focus:ring-[#2D4A3E]"
                  >
                    {options.map((item) => (
                      <option key={item.value} value={item.value}>
                        {item.label ?? item.value}
                      </option>
                    ))}
                  </select>
                ) : null}
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

export default function FilterSidebar({
  sections,
  activeFilters,
  onChange,
  onClear,
  mobileOpen = false,
  onMobileClose,
}: FilterSidebarProps) {
  return (
    <>
      <FilterSidebarContent
        sections={sections}
        activeFilters={activeFilters}
        onChange={onChange}
        onClear={onClear}
      />

      {mobileOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-black/40"
            onClick={onMobileClose}
            aria-label="Close filters"
          />
          <div className="absolute bottom-0 left-0 right-0 max-h-[85vh] overflow-y-auto rounded-t-2xl bg-[#FAF8F5] p-4 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-sans text-lg font-semibold text-[#1C1C1C]">Filters</h2>
              <button
                type="button"
                className="rounded p-1 text-[#1C1C1C]/70"
                onClick={onMobileClose}
              >
                Close
              </button>
            </div>
            <FilterSidebarContent
              sections={sections}
              activeFilters={activeFilters}
              onChange={onChange}
              onClear={onClear}
            />
            <button
              type="button"
              className="mt-4 w-full rounded-lg bg-[#2D4A3E] px-4 py-2 text-sm font-medium text-[#FAF8F5]"
              onClick={onMobileClose}
            >
              Show Results
            </button>
          </div>
        </div>
      ) : null}
    </>
  );
}
