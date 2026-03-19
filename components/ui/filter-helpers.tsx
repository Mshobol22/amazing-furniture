"use client";

import { useState } from "react";

// ── Color hex map (shared by CollectionSidebar + BrandFilterSidebar) ─────────
export const COLOR_HEX: Record<string, string> = {
  Grey: "#808080",
  Beige: "#D4C5A9",
  Black: "#1C1C1C",
  Red: "#B22222",
  Navy: "#1B2951",
  Blue: "#2E5090",
  Brown: "#5C3A1E",
  Green: "#2D4A3E",
  Ivory: "#FFFFF0",
  Gold: "#C5A04E",
  Cream: "#FAF8F5",
  Orange: "#CC5500",
  Rust: "#B7410E",
  Teal: "#008080",
  White: "#F5F5F5",
  Yellow: "#D4A017",
  Purple: "#6A0DAD",
  Pink: "#D4657E",
  Silver: "#C0C0C0",
  Charcoal: "#36454F",
  Terracotta: "#C26B4E",
  Multicolor: "conic-gradient(red, orange, yellow, green, blue, purple, red)",
};

// ── FilterSection ─────────────────────────────────────────────────────────────
export function FilterSection({
  title,
  children,
  defaultOpen = true,
}: {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-b border-[#1C1C1C]/10 pb-4">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between py-2 text-sm font-semibold text-[#1C1C1C]"
      >
        {title}
        <span className="text-[#1C1C1C]/40">{open ? "−" : "+"}</span>
      </button>
      {open && <div className="mt-2">{children}</div>}
    </div>
  );
}

// ── CheckboxGroup ─────────────────────────────────────────────────────────────
export function CheckboxGroup({
  options,
  selected,
  onChange,
  labelMap,
  countMap,
}: {
  options: string[];
  selected: string[];
  onChange: (values: string[]) => void;
  labelMap?: Record<string, string>;
  countMap?: Record<string, number>;
}) {
  const toggle = (value: string) => {
    if (selected.includes(value)) {
      onChange(selected.filter((v) => v !== value));
    } else {
      onChange([...selected, value]);
    }
  };

  return (
    <div className="max-h-[220px] space-y-2 overflow-y-auto">
      {options.map((option) => (
        <label
          key={option}
          className="flex cursor-pointer items-center justify-between gap-2 text-sm text-[#1C1C1C]/80 hover:text-[#1C1C1C]"
        >
          <span className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={selected.includes(option)}
              onChange={() => toggle(option)}
              className="h-4 w-4 rounded border-[#1C1C1C]/20 text-[#2D4A3E] focus:ring-[#2D4A3E]"
            />
            {labelMap?.[option] ?? option}
          </span>
          {countMap?.[option] != null && (
            <span className="text-xs text-[#1C1C1C]/40">
              {countMap[option].toLocaleString()}
            </span>
          )}
        </label>
      ))}
    </div>
  );
}

// ── ColorSwatchGrid ───────────────────────────────────────────────────────────
export function ColorSwatchGrid({
  colors,
  selected,
  onChange,
}: {
  colors: string[];
  selected: string[];
  onChange: (values: string[]) => void;
}) {
  const toggle = (color: string) => {
    if (selected.includes(color)) {
      onChange(selected.filter((c) => c !== color));
    } else {
      onChange([...selected, color]);
    }
  };

  // Only render colors that have a known hex mapping — skip unmapped/blank circles
  const renderableColors = colors.filter(
    (c) => COLOR_HEX[c] !== undefined && COLOR_HEX[c] !== ""
  );

  return (
    <div className="grid grid-cols-6 gap-2">
      {renderableColors.map((color) => {
        const hex = COLOR_HEX[color];
        const isSelected = selected.includes(color);
        const isMulticolor = color === "Multicolor";
        return (
          <button
            key={color}
            type="button"
            title={color}
            onClick={() => toggle(color)}
            className={`h-7 w-7 rounded-full border-2 transition-all ${
              isSelected
                ? "border-[#2D4A3E] ring-2 ring-[#2D4A3E]/30"
                : "border-[#1C1C1C]/15 hover:border-[#2D4A3E]/50"
            }`}
            style={{
              background: isMulticolor
                ? "conic-gradient(red, orange, yellow, green, blue, purple, red)"
                : hex,
            }}
          />
        );
      })}
    </div>
  );
}
