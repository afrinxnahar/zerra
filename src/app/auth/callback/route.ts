import { NextResponse, type NextRequest } from "next/server";
import { authClient, finishSignIn } from "@/lib/auth";

/** Lands OAuth sign-ins and email confirmation links: trade the code for a session, then route by role. */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  // behind a load balancer the request origin is internal, the forwarded host is what the browser used
  const forwarded = request.headers.get("x-forwarded-host");
  const base = forwarded && process.env.NODE_ENV !== "development" ? `https://${forwarded}` : origin;

  const code = searchParams.get("code");
  if (code) {
    const { data, error } = await (await authClient()).auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(`${base}${await finishSignIn(data.user)}`);
    return NextResponse.redirect(`${base}/login?error=${encodeURIComponent(error.message)}`);
  }
  const reason = searchParams.get("error_description") || "Sign-in link is invalid or expired.";
  return NextResponse.redirect(`${base}/login?error=${encodeURIComponent(reason)}`);
}
