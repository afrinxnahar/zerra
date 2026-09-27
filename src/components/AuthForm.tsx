"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { login, oauth, onboard, signup } from "@/lib/actions";
import { CATEGORIES, type Role } from "@/lib/types";
import { Field, FormMessage, TextArea } from "./Form";

const PROVIDER_LABEL: Record<string, string> = { google: "Google", github: "GitHub", azure: "Microsoft", apple: "Apple" };

/** "Continue with Google" etc. Its own form, since forms can't nest. */
function SsoButtons({ providers }: { providers: string[] }) {
  if (!providers.length) return null;
  return (
    <>
      <form action={oauth} className="grid gap-2">
        {providers.map((p) => (
          <button key={p} name="provider" value={p} className="btn btn-ghost w-full">
            Continue with {PROVIDER_LABEL[p] || p}
          </button>
        ))}
      </form>
      <div className="eyebrow my-6 flex items-center gap-3 before:h-px before:flex-1 before:bg-line after:h-px after:flex-1 after:bg-line">
        or with email
      </div>
    </>
  );
}

/** Creator or brand, plus the one field each needs. Shared by signup and onboarding. */
function RoleFields({ initialRole, fields }: { initialRole: Role; fields?: Record<string, string> }) {
  const [role, setRole] = useState<Role>(initialRole);
  return (
    <>
      <fieldset>
        <legend className="eyebrow mb-1.5">I am a</legend>
        <div className="grid grid-cols-2 gap-1 rounded-full bg-panel-2 p-1">
          {(["creator", "brand"] as const).map((r) => (
            <label
              key={r}
              className={`cursor-pointer rounded-full py-2 text-center text-sm font-medium capitalize transition has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-white ${
                role === r ? "bg-text text-bg" : "text-muted hover:text-text"
              }`}
            >
              <input type="radio" name="role" value={r} checked={role === r} onChange={() => setRole(r)} className="sr-only" />
              {r}
            </label>
          ))}
        </div>
      </fieldset>
      {role === "creator" ? (
        <Field label="Channel name" name="name" required maxLength={80} placeholder="Afrin Builds" defaultValue={fields?.name} />
      ) : (
        <>
          <Field label="Brand name" name="brand_name" required maxLength={80} placeholder="Glow Co" defaultValue={fields?.brand_name} />
          <label className="block space-y-1.5">
            <span className="eyebrow">Category</span>
            {/* keyed: a select only takes defaultValue on mount, and React resets the form after each action */}
            <select key={fields?.category} name="category" required className="input capitalize" defaultValue={fields?.category || ""}>
              <option value="" disabled>
                Pick one
              </option>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </label>
          <Field label="Website" name="website" type="url" placeholder="https://" defaultValue={fields?.website} />
          <TextArea
            label="What you make"
            name="description"
            required
            maxLength={280}
            rows={2}
            placeholder="Clean skincare for people who hate routines."
            defaultValue={fields?.description}
            hint="Your product photo, facts and socials come next, in brand settings."
          />
        </>
      )}
    </>
  );
}

export function LoginForm({ providers, error }: { providers: string[]; error?: string }) {
  const [state, action, pending] = useActionState(login, error ? { error } : undefined);
  return (
    <>
      <SsoButtons providers={providers} />
      <form action={action} className="space-y-4">
        <Field label="Email" name="email" type="email" autoComplete="email" required defaultValue={state?.fields?.email} />
        <Field label="Password" name="password" type="password" autoComplete="current-password" required />
        <FormMessage state={state} />
        <button className="btn btn-primary w-full" disabled={pending}>
          {pending ? "Logging in…" : "Log in"}
        </button>
        <p className="text-center text-sm text-muted">
          New to Zerra?{" "}
          <Link href="/signup" className="text-text underline-offset-4 hover:underline">
            Create an account
          </Link>
        </p>
      </form>
    </>
  );
}

export function SignupForm({ initialRole, providers }: { initialRole: Role; providers: string[] }) {
  const [state, action, pending] = useActionState(signup, undefined);
  const f = state?.fields;
  return (
    <>
      <SsoButtons providers={providers} />
      <form action={action} className="space-y-4">
        <RoleFields initialRole={initialRole} fields={f} />
        <Field label="Email" name="email" type="email" autoComplete="email" required defaultValue={f?.email} />
        <Field label="Password" name="password" type="password" autoComplete="new-password" required minLength={8} placeholder="8+ characters" />
        <FormMessage state={state} />
        <button className="btn btn-primary w-full" disabled={pending}>
          {pending ? "Creating account…" : "Create account"}
        </button>
        <p className="text-center text-sm text-muted">
          Already have an account?{" "}
          <Link href="/login" className="text-text underline-offset-4 hover:underline">
            Log in
          </Link>
        </p>
      </form>
    </>
  );
}

export function OnboardingForm() {
  const [state, action, pending] = useActionState(onboard, undefined);
  return (
    <form action={action} className="space-y-4">
      <RoleFields initialRole="creator" fields={state?.fields} />
      <FormMessage state={state} />
      <button className="btn btn-primary w-full" disabled={pending}>
        {pending ? "Saving…" : "Continue"}
      </button>
    </form>
  );
}
