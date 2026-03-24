"use client";

type StepOption = { value: string; count: number };
export type SteppedSidebarStep = {
  id: string;
  label: string;
  options: StepOption[];
  dependsOn?: string;
  /** When true, omit the "All [label]" pill for this step (Browse All category). */
  hideAllPill?: boolean;
};

interface SteppedSidebarProps {
  steps: SteppedSidebarStep[];
  activeFilters: Record<string, string | null>;
  onChange: (stepId: string, value: string | null) => void;
  onClear: () => void;
  mobileOpen: boolean;
  onMobileClose: () => void;
  renderInline?: boolean;
}

function cleanLabel(label: string) {
  return label.replace(/^Step\s*\d+\s*:\s*/i, "").trim();
}

function dependencySatisfied(
  dependsOn: string | undefined,
  activeFilters: Record<string, string | null>
): boolean {
  if (!dependsOn) return true;
  const v = activeFilters[dependsOn];
  return v != null && v !== "";
}

export default function SteppedSidebar({
  steps,
  activeFilters,
  onChange,
  onClear,
  mobileOpen,
  onMobileClose,
  renderInline = true,
}: SteppedSidebarProps) {
  function setStep(stepId: string, value: string | null) {
    const index = steps.findIndex((s) => s.id === stepId);
    onChange(stepId, value);
    if (index >= 0) {
      for (let i = index + 1; i < steps.length; i += 1) {
        onChange(steps[i].id, null);
      }
    }
  }

  const visibleSteps = steps.filter((step) => dependencySatisfied(step.dependsOn, activeFilters));

  const content = (
    <div className="space-y-6">
      {visibleSteps.map((step, index) => {
        const selected = activeFilters[step.id] ?? null;
        return (
          <section key={step.id} className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-[#1C1C1C]">
                {step.label.startsWith("Step") ? step.label : `Step ${index + 1}: ${step.label}`}
              </h3>
            </div>
            <div className="flex flex-wrap gap-2">
              {!step.hideAllPill ? (
                <button
                  type="button"
                  onClick={() => setStep(step.id, null)}
                  className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                    selected === null
                      ? "border-[#2D4A3E] bg-[#2D4A3E] text-[#FAF8F5]"
                      : "border-[#1C1C1C]/15 bg-white text-[#1C1C1C]"
                  }`}
                >
                  All {cleanLabel(step.label)}
                </button>
              ) : null}
              {step.options.map((item) => (
                <button
                  key={item.value}
                  type="button"
                  onClick={() => setStep(step.id, item.value)}
                  className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                    selected === item.value
                      ? "border-[#2D4A3E] bg-[#2D4A3E] text-[#FAF8F5]"
                      : "border-[#1C1C1C]/15 bg-white text-[#1C1C1C]"
                  }`}
                >
                  {item.value} ({item.count})
                </button>
              ))}
            </div>
          </section>
        );
      })}

      <button
        type="button"
        onClick={onClear}
        className="w-full rounded-lg border border-[#1C1C1C]/15 bg-white px-3 py-2 text-sm font-medium text-[#1C1C1C] hover:border-[#2D4A3E] hover:text-[#2D4A3E]"
      >
        Clear All Filters
      </button>
    </div>
  );

  return (
    <>
      {renderInline ? content : null}
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
              <h2 className="text-lg font-semibold text-[#1C1C1C]">Filters</h2>
              <button
                type="button"
                className="rounded p-1 text-[#1C1C1C]/70"
                onClick={onMobileClose}
              >
                Close
              </button>
            </div>
            {content}
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
