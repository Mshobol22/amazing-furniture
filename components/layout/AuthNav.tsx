import Link from "next/link";

export default function AuthNav() {
  return (
    <header className="flex h-14 items-center justify-between border-b border-gray-100 bg-[#FAF8F5] px-6">
      <Link
        href="/"
        className="font-display text-lg text-[#1C1C1C] hover:opacity-80"
      >
        Amazing Furniture
      </Link>
      <Link
        href="/"
        className="text-sm text-[#8B6914] hover:underline"
      >
        ← Back to store
      </Link>
    </header>
  );
}
