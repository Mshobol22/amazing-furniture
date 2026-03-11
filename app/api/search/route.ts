import { NextRequest } from "next/server";
import { searchProducts } from "@/lib/supabase/products";

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q");
  if (!q?.trim()) {
    return Response.json([]);
  }
  const products = await searchProducts(q);
  return Response.json(products);
}
