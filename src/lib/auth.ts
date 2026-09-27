import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createServerClient } from "@supabase/ssr";
import { z } from "zod";
import { env, hasSupabaseAuth } from "./env";
import { db } from "./store";
import type { Role, User } from "./types";

/**
 * Supabase Auth owns identity (email/password + OAuth). Zerra keeps one profile row per
 * auth user in `users` that says whether they're a creator or a brand.
 */
export async function authClient() {
  if (!hasSupabaseAuth()) throw new Error("Supabase Auth isn't configured: set SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY");
  const cookieStore = await cookies();
  return createServerClient(env.supabaseUrl, env.supabasePublishableKey, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // called from a Server Component: proxy.ts already refreshed the session
        }
      },
    },
  });
}

/** The verified Supabase Auth identity for this request, or null. */
export const getAuthUser = cache(async (): Promise<{ id: string; email: string } | null> => {
  if (!hasSupabaseAuth()) return null;
  const { data } = await (await authClient()).auth.getClaims();
  const c = data?.claims;
  return c ? { id: c.sub, email: String(c.email ?? "") } : null;
});

/** The signed-in user's Zerra profile, or null (signed out, or signed in but not onboarded). */
export const getUser = cache(async (): Promise<User | null> => {
  const a = await getAuthUser();
  return a ? db().getUser(a.id) : null;
});

/** For pages: the signed-in user with this role, otherwise off to the right place. */
export async function requireRole(role: Role): Promise<User> {
  const user = await getUser();
  if (!user) redirect((await getAuthUser()) ? "/onboarding" : "/login");
  if (user.role !== role) redirect(homeFor(user));
  return user;
}

export const homeFor = (u: Pick<User, "role">) => (u.role === "creator" ? "/creator" : "/brand");

/** For route handlers. */
export const unauthorized = () => Response.json({ error: "sign in required" }, { status: 401 });

export const ProfileInput = z.discriminatedUnion("role", [
  z.object({ role: z.literal("creator"), name: z.string().trim().min(1, "Add your channel name.").max(80) }),
  z.object({ role: z.literal("brand"), brand_id: z.string().min(1, "Pick your brand.") }),
]);

/** Creates the profile (and the creator row for creators). Returns null if the brand doesn't exist. */
export async function createProfile(id: string, email: string, input: z.infer<typeof ProfileInput>) {
  if (input.role === "brand" && !(await db().getBrand(input.brand_id))) return null;
  const creator_id = input.role === "creator" ? (await db().upsertCreator({ name: input.name })).id : null;
  try {
    return await db().createUser({
      id,
      email,
      role: input.role,
      creator_id,
      brand_id: input.role === "brand" ? input.brand_id : null,
    });
  } catch (e) {
    // two sign-in callbacks raced: keep the first profile
    if (e instanceof Error && e.message === "profile exists") return db().getUser(id);
    throw e;
  }
}

/**
 * After any successful sign-in (password, OAuth, email confirmation): make sure a profile exists.
 * Email signups carry their role in user_metadata; OAuth users pick one on /onboarding.
 */
export async function finishSignIn(u: { id: string; email?: string; user_metadata?: Record<string, unknown> }) {
  const existing = await db().getUser(u.id);
  if (existing) return homeFor(existing);
  const meta = ProfileInput.safeParse(u.user_metadata);
  const created = meta.success ? await createProfile(u.id, u.email ?? "", meta.data) : null;
  return created ? homeFor(created) : "/onboarding";
}
