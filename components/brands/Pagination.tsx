"use client";

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export default function Pagination({
  currentPage,
  totalPages,
  onPageChange,
}: PaginationProps) {
  if (totalPages <= 1) return null;

  // Build page numbers: first, last, current ±2
  const pages: (number | "...")[] = [];
  const addPage = (p: number) => {
    if (p >= 1 && p <= totalPages && !pages.includes(p)) {
      pages.push(p);
    }
  };

  addPage(1);
  for (let i = currentPage - 2; i <= currentPage + 2; i++) {
    addPage(i);
  }
  addPage(totalPages);

  // Insert ellipses
  const withEllipses: (number | "...")[] = [];
  for (let i = 0; i < pages.length; i++) {
    const p = pages[i] as number;
    if (i > 0 && p - (pages[i - 1] as number) > 1) {
      withEllipses.push("...");
    }
    withEllipses.push(p);
  }

  return (
    <nav className="flex items-center justify-center gap-1 pt-8" aria-label="Pagination">
      <button
        type="button"
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        className="rounded px-3 py-2 text-sm font-medium text-[#1C1C1C] transition-colors hover:bg-[#2D4A3E]/10 disabled:opacity-30 disabled:hover:bg-transparent"
      >
        &larr; Previous
      </button>

      {withEllipses.map((item, i) =>
        item === "..." ? (
          <span key={`ellipsis-${i}`} className="px-2 text-sm text-[#1C1C1C]/40">
            ...
          </span>
        ) : (
          <button
            key={item}
            type="button"
            onClick={() => onPageChange(item)}
            className={`min-w-[36px] rounded px-2 py-2 text-sm font-medium transition-colors ${
              item === currentPage
                ? "bg-[#2D4A3E] text-[#FAF8F5]"
                : "text-[#1C1C1C] hover:bg-[#2D4A3E]/10"
            }`}
          >
            {item}
          </button>
        )
      )}

      <button
        type="button"
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        className="rounded px-3 py-2 text-sm font-medium text-[#1C1C1C] transition-colors hover:bg-[#2D4A3E]/10 disabled:opacity-30 disabled:hover:bg-transparent"
      >
        Next &rarr;
      </button>
    </nav>
  );
}
