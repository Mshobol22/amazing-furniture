import Link from "next/link";

export default function ProductNotFound() {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center text-center px-4">
      <h1 className="mb-3 font-playfair text-3xl font-semibold text-[#1C1C1C]">
        Product Not Found
      </h1>
      <p className="text-gray-500 mb-8">
        This product may have been removed or the link is incorrect.
      </p>
      <Link
        href="/collections/all"
        className="bg-[#1C1C1C] text-white px-8 py-3 rounded-lg font-medium hover:bg-[#2a2a2a] transition-colors"
      >
        Browse All Products
      </Link>
    </div>
  );
}
