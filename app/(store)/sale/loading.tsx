export default function SaleLoading() {
  return (
    <div className="min-h-screen bg-[#FAF8F5]">
      {/* Banner skeleton */}
      <div className="h-40 animate-pulse bg-[#2D4A3E]/80" />

      {/* Chips skeleton */}
      <div className="border-b border-[#ede8e3] bg-white px-4 py-3">
        <div className="flex gap-2">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-7 w-24 animate-pulse rounded-full bg-gray-200" />
          ))}
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex gap-8">
          {/* Sidebar skeleton */}
          <div className="hidden w-[280px] shrink-0 lg:block">
            <div className="rounded-xl border border-[#ede8e3] bg-white p-5">
              <div className="mb-4 h-3 w-32 animate-pulse rounded bg-gray-200" />
              {[...Array(5)].map((_, i) => (
                <div key={i} className="mb-3 h-4 w-full animate-pulse rounded bg-gray-100" />
              ))}
            </div>
          </div>

          {/* Grid skeleton */}
          <div className="flex-1">
            <div className="mb-4 h-4 w-32 animate-pulse rounded bg-gray-200" />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {[...Array(12)].map((_, i) => (
                <div key={i} className="overflow-hidden rounded-xl border border-[#ede8e3] bg-white">
                  <div className="aspect-[4/3] w-full animate-pulse bg-gray-100" />
                  <div className="p-4">
                    <div className="mb-2 h-4 w-3/4 animate-pulse rounded bg-gray-200" />
                    <div className="h-5 w-24 animate-pulse rounded bg-gray-200" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
