"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import type { Provider } from "@supabase/supabase-js";
import { z } from "zod";
import { authClient, createProfile, finishSignIn, getAuthUser, getUser, homeFor, ProfileInput } from "./auth";
import { env } from "./env";

export type AuthState = { error?: string; notice?: string; fields?: Record<string, string> } | undefined;

const Credentials = z.object({
  email: z.email("Enter a valid email.").trim().toLowerCase(),
  password: z.string().min(8, "Password must be at least 8 characters.").max(200),
});

/** form fields to refill the form after an error, never the password */
function echo(form: FormData) {
  return Object.fromEntries(
    [...form].filter(([k]) => k !== "password" && !k.startsWith("$")).map(([k, v]) => [k, String(v)]),
  );
}

const callbackUrl = async () => `${(await headers()).get("origin") || env.publicBaseUrl}/auth/callback`;

export async function signup(_: AuthState, form: FormData): Promise<AuthState> {
  const fields = echo(form);
  const creds = Credentials.safeParse({ email: form.get("email"), password: form.get("password") });
  const profile = ProfileInput.safeParse(fields);
  if (!creds.success) return { error: creds.error.issues[0].message, fields };
  if (!profile.success) return { error: profile.error.issues[0].message, fields };

  const { data, error } = await (await authClient()).auth.signUp({
    ...creds.data,
    // the profile is created from this metadata once the user is signed in (see finishSignIn)
    options: { data: profile.data, emailRedirectTo: await callbackUrl() },
  });
  if (error) return { error: error.message, fields };
  // email confirmation on: Supabase mails a link that lands on /auth/callback
  if (!data.session || !data.user) return { notice: `Check ${creds.data.email} for a confirmation link.` };
  redirect(await finishSignIn(data.user));
}

export async function login(_: AuthState, form: FormData): Promise<AuthState> {
  const fields = echo(form);
  const email = String(form.get("email") || "").trim().toLowerCase();
  const password = String(form.get("password") || "");
  if (!email || !password) return { error: "Enter your email and password.", fields };

  const { data, error } = await (await authClient()).auth.signInWithPassword({ email, password });
  if (error) {
    const unconfirmed = error.code === "email_not_confirmed";
    return { error: unconfirmed ? "Confirm your email first, the link is in your inbox." : "Wrong email or password.", fields };
  }
  redirect(await finishSignIn(data.user));
}

/** SSO: Google, GitHub, ... whichever providers AUTH_PROVIDERS lists. */
export async function oauth(form: FormData) {
  const provider = String(form.get("provider"));
  if (!env.authProviders.includes(provider)) redirect("/login?error=Unknown%20sign-in%20provider");
  const { data, error } = await (await authClient()).auth.signInWithOAuth({
    provider: provider as Provider,
    options: { redirectTo: await callbackUrl() },
  });
  if (error) redirect(`/login?error=${encodeURIComponent(error.message)}`);
  redirect(data.url);
}

/** First sign-in via OAuth: pick creator or brand. */
export async function onboard(_: AuthState, form: FormData): Promise<AuthState> {
  const fields = echo(form);
  const auth = await getAuthUser();
  if (!auth) redirect("/login");
  const existing = await getUser();
  if (existing) redirect(homeFor(existing));

  const parsed = ProfileInput.safeParse(fields);
  if (!parsed.success) return { error: parsed.error.issues[0].message, fields };
  const user = await createProfile(auth.id, auth.email, parsed.data);
  if (!user) return { error: "Unknown brand.", fields };
  redirect(homeFor(user));
}

export async function logout() {
  await (await authClient()).auth.signOut();
  redirect("/");
}
