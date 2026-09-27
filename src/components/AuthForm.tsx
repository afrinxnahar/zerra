"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { login, oauth, onboard, signup, type AuthState } from "@/lib/actions";
import type { Brand, Role } from "@/lib/types";

const PROVIDER_LABEL: Record<string, string> = { google: "Google", github: "GitHub", azure: "Microsoft", apple: "Apple" };

function Field({ label, ...props }: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="block space-y-1.5">
      <span className="eyebrow">{label}</span>
      <input className="input" {...props} />
    </label>
  );
}

function FormMessage({ state }: { state: AuthState }) {
  if (state?.notice) {
    return (
      <p role="status" className="rounded-xl border border-ok/30 bg-ok/10 px-4 py-2.5 text-sm text-ok">
        {state.notice}
      </p>
    );
  }
  return state?.error ? (
    <p role="alert" className="rounded-xl border border-bad/30 bg-bad/10 px-4 py-2.5 text-sm text-bad">
      {state.error}
    </p>
  ) : null;
}

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
function RoleFields({ brands, initialRole, fields }: { brands: Brand[]; initialRole: Role; fields?: Record<string, string> }) {
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
        <label className="block space-y-1.5">
          <span className="eyebrow">Your brand</span>
          {/* keyed: a select only takes defaultValue on mount, and React resets the form after each action */}
          <select key={fields?.brand_id} className="input" name="brand_id" required defaultValue={fields?.brand_id || ""}>
            <option value="" disabled>
              Select your brand
            </option>
            {brands.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </label>
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

export function SignupForm({ brands, initialRole, providers }: { brands: Brand[]; initialRole: Role; providers: string[] }) {
  const [state, action, pending] = useActionState(signup, undefined);
  const f = state?.fields;
  return (
    <>
      <SsoButtons providers={providers} />
      <form action={action} className="space-y-4">
        <RoleFields brands={brands} initialRole={initialRole} fields={f} />
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

export function OnboardingForm({ brands }: { brands: Brand[] }) {
  const [state, action, pending] = useActionState(onboard, undefined);
  return (
    <form action={action} className="space-y-4">
      <RoleFields brands={brands} initialRole="creator" fields={state?.fields} />
      <FormMessage state={state} />
      <button className="btn btn-primary w-full" disabled={pending}>
        {pending ? "Saving…" : "Continue"}
      </button>
    </form>
  );
}
