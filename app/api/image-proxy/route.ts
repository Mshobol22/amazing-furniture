import { NextRequest, NextResponse } from "next/server";
import { FALLBACK_IMAGE } from "@/lib/utils";

const ALLOWED_REFERER_ORIGIN = "https://nationwidefd.com";

function normalizeProxyUrlParam(rawUrl: string): string {
  // Accept both encoded and unencoded query values.
  let decoded = rawUrl;
  try {
    decoded = decodeURIComponent(rawUrl);
  } catch {
    // Keep raw value when partially encoded/badly escaped.
  }

  // Ensure URL constructor can parse URLs containing bare spaces.
  const withEscapedSpaces = decoded.split(" ").join("%20");

  try {
    const parsed = new URL(withEscapedSpaces);
    // Re-encode pathname safely so upstream fetch never receives bare spaces.
    parsed.pathname = parsed.pathname
      .split("/")
      .map((segment) => encodeURIComponent(decodeURIComponent(segment)))
      .join("/");
    return parsed.toString();
  } catch {
    return withEscapedSpaces;
  }
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

  // Decode + re-encode to normalize mixed encoded/unencoded URLs.
  const safeUrl = normalizeProxyUrlParam(rawUrl);

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
