import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { isAdminUser } from "@/lib/auth/admin-access";

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const pathWithSearch = pathname + request.nextUrl.search;

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-pathname", pathWithSearch);

  let response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options?: object }[]) {
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (pathname === "/login") {
    const url = request.nextUrl.clone();
    url.pathname = "/auth/login";
    return NextResponse.redirect(url);
  }
  if (pathname === "/signup") {
    const url = request.nextUrl.clone();
    url.pathname = "/auth/signup";
    return NextResponse.redirect(url);
  }

  if (pathname.startsWith("/account") && !user) {
    return NextResponse.redirect(
      new URL(
        `/auth/login?redirect=${encodeURIComponent(pathWithSearch)}`,
        request.url
      )
    );
  }

  if (pathname === "/checkout" && !user) {
    return NextResponse.redirect(new URL("/auth/login?redirect=/checkout", request.url));
  }

  if ((pathname === "/auth/login" || pathname === "/auth/signup") && user) {
    const redirectTo = request.nextUrl.searchParams.get("redirect") || "/account";
    return NextResponse.redirect(new URL(redirectTo, request.url));
  }

  if (pathname.startsWith("/admin")) {
    if (!user) {
      return NextResponse.redirect(new URL("/auth/login", request.url));
    }
    const isAdmin = isAdminUser(user);
    if (!isAdmin) {
      return NextResponse.redirect(new URL("/", request.url));
    }
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
