import { NextRequest, NextResponse } from "next/server";
import { FALLBACK_IMAGE } from "@/lib/utils";

const ALLOWED_REFERER_ORIGIN = "https://nationwidefd.com";

function normalizeProxyUrlParam(rawUrl: string): string {
  // Decode once to handle values that may be double-encoded by upstream callers.
  let decodedUrl = rawUrl;
  try {
    decodedUrl = decodeURIComponent(rawUrl);
  } catch {
    // Keep raw value when malformed encoding is present.
  }

  // Next.js decodes query params before searchParams.get(); e.g. Living%20Room → "Living Room".
  // Literal spaces break `new URL()` and `fetch()`; restore %20 for the path.
  decodedUrl = decodedUrl.split(" ").join("%20");

  const parsed = new URL(decodedUrl);
  // Re-encode only path segments; preserve protocol, host, and query string.
  parsed.pathname = parsed.pathname
    .split("/")
    .map((segment) => {
      try {
        return encodeURIComponent(decodeURIComponent(segment));
      } catch {
        return encodeURIComponent(segment);
      }
    })
    .join("/");

  return parsed.toString();
}

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

  const safeUrlParam = rawUrl.split(" ").join("%20");

  // Decode + re-encode pathname segments before any fetch.
  let safeUrl: string;
  let parsedUrl: URL;
  try {
    safeUrl = normalizeProxyUrlParam(safeUrlParam);
    parsedUrl = new URL(safeUrl);
  } catch {
    return NextResponse.json(
      { error: "Malformed image URL query parameter" },
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
