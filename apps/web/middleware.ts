import { type NextRequest, NextResponse } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";

type CookieToSet = { name: string; value: string; options: CookieOptions };

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => req.cookies.getAll(),
        setAll: (toSet: CookieToSet[]) =>
          toSet.forEach(({ name, value, options }) =>
            res.cookies.set(name, value, options),
          ),
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = req.nextUrl.pathname;
  const APP_PREFIXES = [
    "/overview",
    "/scans",
    "/resources",
    "/findings",
    "/reports",
    "/settings",
    "/onboarding",
  ];
  const isApp = APP_PREFIXES.some((p) => path === p || path.startsWith(p + "/"));
  if (isApp && !user) {
    const url = new URL("/login", req.url);
    url.searchParams.set("next", path);
    return NextResponse.redirect(url);
  }
  return res;
}

export const config = {
  matcher: [
    "/overview/:path*",
    "/scans/:path*",
    "/resources/:path*",
    "/findings/:path*",
    "/reports/:path*",
    "/settings/:path*",
    "/onboarding/:path*",
  ],
};
