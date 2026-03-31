import { NextRequest, NextResponse } from "next/server";
import { FALLBACK_IMAGE } from "@/lib/utils";

const ALLOWED_REFERER_ORIGIN = "https://nationwidefd.com";

class MalformedProxyUrlError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MalformedProxyUrlError";
  }
}

/**
 * Before fetch: encode full query value, decode once (avoids inconsistent double-encoding),
 * then parse and re-encode pathname segments only.
 */
function buildFetchableImageUrl(rawQueryParam: string): string {
  const trimmed = rawQueryParam.trim();
  if (!trimmed) {
    throw new MalformedProxyUrlError("Missing or empty url query parameter");
  }

  let encodedFull: string;
  try {
    encodedFull = encodeURIComponent(trimmed);
  } catch {
    throw new MalformedProxyUrlError("url parameter contains invalid characters for encoding");
  }

  let decodedOnce: string;
  try {
    decodedOnce = decodeURIComponent(encodedFull);
  } catch {
    throw new MalformedProxyUrlError(
      "url parameter is still malformed after encoding and decoding; check for invalid % sequences"
    );
  }

  // Literal spaces break `new URL()`; normalize to %20 in the raw string before parsing.
  const spaceSafe = decodedOnce.split(" ").join("%20");

  let parsed: URL;
  try {
    parsed = new URL(spaceSafe);
  } catch {
    throw new MalformedProxyUrlError("url parameter is not a valid absolute URL after normalization");
  }

  // Re-encode only path segments; preserve protocol, host, and query string.
  parsed.pathname = parsed.pathname
    .split("/")
    .map((segment) => {
      if (segment === "") return "";
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
    return host === "nationwidefd.com" || host.endsWith(".nationwidefd.com");
  } catch {
    return false;
  }
}

export async function GET(request: NextRequest) {
  const rawUrl = request.nextUrl.searchParams.get("url") ?? "";

  if (!rawUrl.trim()) {
    return NextResponse.json(
      { error: "Missing url query parameter" },
      { status: 400 }
    );
  }

  let safeUrl: string;
  try {
    safeUrl = buildFetchableImageUrl(rawUrl);
  } catch (e) {
    const message =
      e instanceof MalformedProxyUrlError
        ? e.message
        : "Malformed image URL query parameter";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(safeUrl);
  } catch {
    return NextResponse.json(
      { error: "Could not parse normalized image URL" },
      { status: 400 }
    );
  }

  if (parsedUrl.protocol !== "https:") {
    return NextResponse.json(
      { error: "Only https image URLs are allowed" },
      { status: 400 }
    );
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
