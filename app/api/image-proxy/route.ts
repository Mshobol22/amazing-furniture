import { NextRequest, NextResponse } from "next/server";

const ALLOWED_ORIGIN = "https://nationwidefd.com";

export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get("url");

  if (!url) {
    return NextResponse.json(
      { error: "Missing url query parameter" },
      { status: 400 }
    );
  }

  try {
    const parsed = new URL(url);
    if (!parsed.origin.startsWith(ALLOWED_ORIGIN)) {
      return NextResponse.json(
        { error: "URL must be from nationwidefd.com" },
        { status: 400 }
      );
    }
  } catch {
    return NextResponse.json({ error: "Invalid URL" }, { status: 400 });
  }

  try {
    const res = await fetch(url, {
      headers: {
        Referer: ALLOWED_ORIGIN,
        "User-Agent": "Mozilla/5.0",
      },
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: "Upstream fetch failed" },
        { status: 502 }
      );
    }

    const contentType = res.headers.get("content-type") ?? "image/jpeg";
    const body = res.body;

    if (!body) {
      return NextResponse.json(
        { error: "No response body" },
        { status: 502 }
      );
    }

    return new NextResponse(body, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=86400",
      },
    });
  } catch {
    return NextResponse.json(
      { error: "Upstream fetch failed" },
      { status: 502 }
    );
  }
}
