"use client";
/* eslint-disable @next/next/no-img-element */

import { useActionState } from "react";
import { acceptRequest, declineRequest } from "@/lib/marketplace";
import type { PitchRequestWithDetails, Socials } from "@/lib/types";
import { Field, FormMessage, usd } from "./Form";

const SOCIAL_LABEL: Record<keyof Socials, string> = { instagram: "Instagram", tiktok: "TikTok", youtube: "YouTube", x: "X" };

export function RequestCard({ request: r }: { request: PitchRequestWithDetails }) {
  const [state, action, pending] = useActionState(acceptRequest, undefined);
  const b = r.brand;
  const links = [
    ...(b.website ? [["Website", b.website]] : []),
    ...Object.entries(b.socials ?? {}).map(([k, v]) => [SOCIAL_LABEL[k as keyof Socials] ?? k, v]),
  ];

  return (
    <article className={`card grid grid-cols-1 gap-5 p-5 md:grid-cols-[160px_1fr] ${r.status === "open" ? "" : "opacity-70"}`}>
      <div
        className="relative aspect-square overflow-hidden rounded-xl border border-line"
        style={{ background: `radial-gradient(circle at 50% 40%, ${b.accent}40, transparent 70%), var(--panel-2)` }}
      >
        {b.cutout_path && <img src={b.cutout_path} alt={b.product_name} className="absolute inset-[12%] h-[76%] w-[76%] object-contain" />}
      </div>

      <div className="min-w-0 space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <div className="eyebrow capitalize">{b.category}</div>
            <h3 className="mt-1 text-xl font-medium tracking-tight">
              {b.name} <span className="text-muted">· {b.product_name}</span>
            </h3>
          </div>
          <span className="rounded-full bg-panel-2 px-2.5 py-1 text-xs capitalize">
            {r.status}
            {r.budget_usd != null && ` · budget ${usd(r.budget_usd)}`}
          </span>
        </div>
        {b.description && <p className="text-sm leading-relaxed text-muted">{b.description}</p>}
        <p className="rounded-xl bg-panel-2 p-4 text-sm leading-relaxed">
          <span className="eyebrow mb-1 block">Their brief</span>
          {r.brief}
        </p>
        {links.length > 0 && (
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
            {links.map(([label, href]) => (
              <a key={label} href={href} target="_blank" rel="noreferrer" className="text-muted underline-offset-4 hover:text-text hover:underline">
                {label} ↗
              </a>
            ))}
          </div>
        )}

        {r.status === "open" && (
          <div className="space-y-3 border-t border-line pt-4">
            <form action={action} className="grid gap-3 sm:grid-cols-[140px_1fr_auto] sm:items-end">
              <input type="hidden" name="request_id" value={r.id} />
              <Field label="Your rate (USD)" name="rate_usd" type="number" required min={0} step={1} inputMode="numeric" />
              <Field label="Note to the brand" name="note" maxLength={500} placeholder="Optional" />
              <button className="btn btn-primary" disabled={pending}>
                {pending ? "Starting…" : "Generate spec ad ×3"}
              </button>
            </form>
            <FormMessage state={state} />
            <form action={declineRequest}>
              <input type="hidden" name="request_id" value={r.id} />
              <button className="text-xs text-muted underline-offset-4 hover:text-text hover:underline">Decline request</button>
            </form>
          </div>
        )}
      </div>
    </article>
  );
}
