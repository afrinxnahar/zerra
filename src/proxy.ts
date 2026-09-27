import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { env, hasSupabaseAuth } from "@/lib/env";

/**
 * Refreshes the Supabase session cookie on every request so Server Components see a valid token.
 * Authorization lives in the layouts, route handlers and server actions, not here.
 */
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });
  if (!hasSupabaseAuth()) return response;

  const supabase = createServerClient(env.supabaseUrl, env.supabasePublishableKey, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(cookiesToSet, headers) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        Object.entries(headers).forEach(([k, v]) => response.headers.set(k, v));
      },
    },
  });
  // nothing between createServerClient and getClaims: it's what triggers the refresh
  await supabase.auth.getClaims();
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|brands/|mock/|api/media/|.*\.(?:png|jpg|jpeg|svg|webp|mp4)$).*)"],
};
