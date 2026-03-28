"use client";

import { useEffect, useState } from "react";
import { Search, X } from "lucide-react";

interface SmartSearchBarProps {
  placeholder: string;
  /** Uncontrolled: debounced callback (default 400ms). */
  onSearch?: (query: string) => void;
  /** Controlled: parent owns value; no internal debounce. */
  value?: string;
  onValueChange?: (value: string) => void;
  debounceMs?: number;
  className?: string;
}

export default function SmartSearchBar({
  placeholder,
  onSearch,
  value: controlledValue,
  onValueChange,
  debounceMs = 400,
  className,
}: SmartSearchBarProps) {
  const isControlled = controlledValue !== undefined && onValueChange !== undefined;
  const [internalValue, setInternalValue] = useState("");

  useEffect(() => {
    if (isControlled || !onSearch) return;
    const timer = window.setTimeout(() => {
      onSearch(internalValue.trim());
    }, debounceMs);
    return () => window.clearTimeout(timer);
  }, [internalValue, debounceMs, isControlled, onSearch]);

  const displayValue = isControlled ? controlledValue : internalValue;

  const setValue = (next: string) => {
    if (isControlled) onValueChange!(next);
    else setInternalValue(next);
  };

  return (
    <div className={className}>
      <div className="relative w-full">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#1C1C1C]/50"
          aria-hidden="true"
        />
        <input
          type="text"
          value={displayValue}
          onChange={(e) => setValue(e.target.value)}
          placeholder={placeholder}
          className="w-full rounded-xl border border-[#1C1C1C]/15 bg-white py-2.5 pl-10 pr-10 text-sm text-[#1C1C1C] outline-none ring-0 transition focus:border-[#2D4A3E] focus:ring-2 focus:ring-[#2D4A3E]/30"
        />
        {displayValue ? (
          <button
            type="button"
            onClick={() => {
              setValue("");
              if (!isControlled && onSearch) onSearch("");
            }}
            className="absolute right-2 top-1/2 inline-flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-md text-[#1C1C1C]/60 hover:text-[#1C1C1C]"
            aria-label="Clear search"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        ) : null}
      </div>
    </div>
  );
}
