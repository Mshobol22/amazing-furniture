export default function ProductCardSkeleton() {
  return (
    <div className="rounded-lg border border-gray-200 bg-white">
      <div className="aspect-[4/3] animate-pulse rounded-t-lg bg-gray-200" />
      <div className="flex flex-col gap-2 p-4">
        <div className="h-3 w-16 animate-pulse rounded bg-gray-200" />
        <div className="h-4 w-full animate-pulse rounded bg-gray-200" />
        <div className="h-4 w-24 animate-pulse rounded bg-gray-200" />
        <div className="mt-2 h-10 w-full animate-pulse rounded bg-gray-200" />
      </div>
    </div>
  );
}
