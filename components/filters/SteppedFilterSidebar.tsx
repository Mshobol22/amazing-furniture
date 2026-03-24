"use client";

export interface ActiveFilters {
  [stepId: string]: string | null;
}

export interface FilterStepOption {
  value: string;
  count: number;
  displayLabel?: string;
}

export interface FilterStep {
  id: string;
  label: string;
  options: FilterStepOption[];
  dependsOn?: string;
  /** When true, multiple options may be selected (stored as comma-separated values). Default false. */
  multiSelect?: boolean;
  /** When step `id` changes, clear any step that lists that id here */
  resetWhen?: string[];
  clearPill?: { label: string };
  colorSwatches?: boolean;
  toggleable?: boolean;
  hideCountsWhenZero?: boolean;
  /** Consecutive steps with the same id render under one heading */
  visualGroupId?: string;
  visualGroupTitle?: string;
}

export interface SteppedFilterSidebarProps {
  steps: FilterStep[];
  /** Current selections; sidebar is controlled. */
  activeFilters: ActiveFilters;
  onChange: (filters: ActiveFilters) => void;
  onClear: () => void;
}

function isLikelyCssColor(value: string): boolean {
  const v = value.trim();
  return /^#[0-9a-fA-F]{3,8}$/.test(v) || /^rgb\(/.test(v) || /^hsl\(/.test(v);
}

function applyStepChange(
  steps: FilterStep[],
  prev: ActiveFilters,
  stepId: string,
  nextValue: string | null
): ActiveFilters {
  const next: ActiveFilters = { ...prev, [stepId]: nextValue };
  for (const s of steps) {
    if (s.resetWhen?.includes(stepId)) {
      next[s.id] = null;
    }
  }
  return next;
}

function stepUnlocked(step: FilterStep, activeFilters: ActiveFilters): boolean {
  if (!step.dependsOn) return true;
  const v = activeFilters[step.dependsOn];
  return v != null && v !== "";
}

function parseMultiValues(value: string | null | undefined): string[] {
  if (value == null || value === "") return [];
  return value.split(",").map((s) => s.trim()).filter(Boolean);
}

function joinMultiValues(values: string[]): string | null {
  return values.length > 0 ? values.join(",") : null;
}

function renderPillOptions(
  step: FilterStep,
  activeFilters: ActiveFilters,
  setForStep: (id: string, val: string | null) => void
) {
  const selected = activeFilters[step.id];
  const hideCounts = step.hideCountsWhenZero;
  const multi = Boolean(step.multiSelect);
  const multiSelected = multi ? parseMultiValues(selected) : [];

  return (
    <div className="flex flex-wrap gap-2">
      {step.clearPill ? (
        <button
          type="button"
          onClick={() => setForStep(step.id, null)}
          className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
            selected === null || selected === undefined || selected === ""
              ? "border-[#2D4A3E] bg-[#2D4A3E] text-[#FAF8F5]"
              : "border-[#1C1C1C]/15 bg-white text-[#1C1C1C] hover:border-[#2D4A3E]"
          }`}
        >
          {step.clearPill.label}
        </button>
      ) : null}
      {step.options.map((item) => {
        const isOn = multi ? multiSelected.includes(item.value) : selected === item.value;
        const label = item.displayLabel ?? item.value;
        const countSuffix = hideCounts ? "" : ` (${item.count})`;
        return (
          <button
            key={item.value}
            type="button"
            onClick={() => {
              if (multi) {
                const next = isOn
                  ? multiSelected.filter((v) => v !== item.value)
                  : [...multiSelected, item.value];
                setForStep(step.id, joinMultiValues(next));
              } else if (step.toggleable && isOn) {
                setForStep(step.id, null);
              } else {
                setForStep(step.id, item.value);
              }
            }}
            className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium transition ${
              isOn
                ? "border-[#2D4A3E] bg-[#2D4A3E] text-[#FAF8F5]"
                : "border-[#1C1C1C]/15 bg-white text-[#1C1C1C] hover:border-[#2D4A3E]"
            }`}
          >
            {step.colorSwatches && isLikelyCssColor(item.value) ? (
              <span
                className="h-3 w-3 rounded-full border border-[#1C1C1C]/20"
                style={{ backgroundColor: item.value }}
              />
            ) : null}
            <span>
              {label}
              {countSuffix}
            </span>
          </button>
        );
      })}
    </div>
  );
}

export default function SteppedFilterSidebar({
  steps,
  activeFilters,
  onChange,
  onClear,
}: SteppedFilterSidebarProps) {
  const setForStep = (stepId: string, nextValue: string | null) => {
    onChange(applyStepChange(steps, activeFilters, stepId, nextValue));
  };

  const chunks: FilterStep[][] = [];
  let i = 0;
  while (i < steps.length) {
    const s = steps[i];
    if (s.visualGroupId) {
      const gid = s.visualGroupId;
      const group: FilterStep[] = [];
      while (i < steps.length && steps[i].visualGroupId === gid) {
        group.push(steps[i]);
        i++;
      }
      chunks.push(group);
    } else {
      chunks.push([s]);
      i++;
    }
  }

  return (
    <div className="space-y-6">
      {chunks.map((groupSteps, chunkIdx) => {
        const first = groupSteps[0];
        const isGroup =
          groupSteps.length > 1 || Boolean(first.visualGroupId && first.visualGroupTitle);

        if (isGroup && first.visualGroupTitle) {
          const groupLocked = !stepUnlocked(first, activeFilters);
          if (groupLocked) return null;
          return (
            <section key={`group-${chunkIdx}-${first.visualGroupId ?? chunkIdx}`} className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-[#1C1C1C]">{first.visualGroupTitle}</h3>
              </div>
              <div className="space-y-4">
                {groupSteps.map((step) => (
                  <div key={step.id}>
                    <p className="mb-2 text-xs font-medium uppercase tracking-wide text-[#1C1C1C]/60">
                      {step.label}
                    </p>
                    {step.options.length === 0 ? (
                      <span className="text-xs text-[#1C1C1C]/55">No options available.</span>
                    ) : (
                      renderPillOptions(step, activeFilters, setForStep)
                    )}
                  </div>
                ))}
              </div>
            </section>
          );
        }

        const step = first;
        const stepLock = !stepUnlocked(step, activeFilters);
        if (stepLock) return null;

        return (
          <section key={step.id} className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-[#1C1C1C]">{step.label}</h3>
            </div>
            {step.options.length === 0 && !step.clearPill ? (
              <div className="rounded-lg border border-dashed border-[#1C1C1C]/20 bg-white/60 p-3 text-xs text-[#1C1C1C]/55">
                No options available.
              </div>
            ) : (
              renderPillOptions(step, activeFilters, setForStep)
            )}
          </section>
        );
      })}

      <button
        type="button"
        onClick={onClear}
        className="w-full rounded-lg border border-[#1C1C1C]/15 bg-white px-3 py-2 text-sm font-medium text-[#1C1C1C] hover:border-[#2D4A3E] hover:text-[#2D4A3E]"
      >
        Clear Filters
      </button>
    </div>
  );
}
