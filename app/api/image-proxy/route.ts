import { NextRequest, NextResponse } from "next/server";
import { FALLBACK_IMAGE } from "@/lib/utils";

const ALLOWED_REFERER_ORIGIN = "https://nationwidefd.com";

function isAllowedNationwideFdUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:") return false;
    const host = parsed.hostname.toLowerCase();
    return host === "nationwidefd.com" || host === "www.nationwidefd.com";
  } catch {
    return false;
  }
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const rawUrl = searchParams.get("url") ?? "";

  if (!rawUrl) {
    return NextResponse.json(
      { error: "Missing url query parameter" },
      { status: 400 }
    );
  }

  // Encode bare spaces so paths like "Beds Only/B901 BED.jpg" don't
  // throw "URL is malformed". split/join avoids double-encoding %20.
  const safeUrl = rawUrl.split(" ").join("%20");

  // Validate well-formedness before any further checks
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(safeUrl);
  } catch {
    return NextResponse.json(
      { error: "Invalid image URL", url: safeUrl },
      { status: 400 }
    );
  }

  if (parsedUrl.protocol !== "https:") {
    return new Response("Invalid URL", { status: 400 });
  }

  if (!isAllowedNationwideFdUrl(safeUrl)) {
    return new Response("Forbidden", { status: 403 });
  }

  try {
    const res = await fetch(safeUrl, {
      headers: {
        Referer: ALLOWED_REFERER_ORIGIN,
        "User-Agent": "Mozilla/5.0",
      },
    });

    if (!res.ok) {
      return NextResponse.redirect(FALLBACK_IMAGE, 302);
    }

    const contentType = res.headers.get("content-type") ?? "image/jpeg";
    const body = res.body;

    if (!body) {
      return NextResponse.redirect(FALLBACK_IMAGE, 302);
    }

    return new NextResponse(body, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=86400",
      },
    });
  } catch {
    return NextResponse.redirect(FALLBACK_IMAGE, 302);
  }
}
