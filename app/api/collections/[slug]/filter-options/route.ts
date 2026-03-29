import { NextRequest, NextResponse } from "next/server";
import {
  queryColorsForTypesAndManufacturers,
  queryManufacturersForTypes,
} from "@/lib/collections/filter-options-queries";

export const dynamic = "force-dynamic";

const ALLOWED_SLUGS = new Set([
  "bedroom",
  "sofa",
  "chair",
  "table",
  "cabinet",
  "tv-stand",
  "rug",
  "other",
  "all",
]);

const TYPE_RE = /^[a-zA-Z0-9 &\-]+$/;

function parseTypes(param: string | null): string[] {
  if (!param) return [];
  return param
    .split(",")
    .map((t) => t.trim())
    .filter((t) => TYPE_RE.test(t) && t.length > 0);
}

function parseManufacturers(param: string | null): string[] {
  if (!param) return [];
  return param
    .split(",")
    .map((m) => m.trim())
    .filter((m) => m.length > 0);
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  if (!ALLOWED_SLUGS.has(slug)) {
    return NextResponse.json({ error: "Invalid category" }, { status: 404 });
  }

  const url = request.nextUrl.searchParams;
  const types = parseTypes(url.get("type"));

  if (types.length === 0) {
    return NextResponse.json({ error: "type param required" }, { status: 400 });
  }

  const manufacturerParam = url.get("manufacturer");

  try {
    if (manufacturerParam !== null) {
      const manufacturers = parseManufacturers(manufacturerParam);
      if (manufacturers.length === 0) {
        return NextResponse.json({ colors: [] });
      }

      const colors = await queryColorsForTypesAndManufacturers(
        slug,
        types,
        manufacturers
      );
      return NextResponse.json({ colors });
    }

    const manufacturers = await queryManufacturersForTypes(slug, types);
    return NextResponse.json({ manufacturers });
  } catch (err) {
    console.error("filter-options query error:", err);
    return NextResponse.json({ error: "Query failed" }, { status: 500 });
  }
}
