"use client";

import { useActionState, useState } from "react";
import { requestPitch } from "@/lib/marketplace";
import type { Creator, PitchRequest } from "@/lib/types";
import { Field, FormMessage, TextArea } from "./Form";

const STATUS: Record<PitchRequest["status"], string> = {
  open: "Requested, waiting on the creator",
  accepted: "Accepted, spec ad in progress",
  declined: "Declined",
};

export function CreatorCard({ creator: c, request, canRequest }: { creator: Creator; request?: PitchRequest; canRequest: boolean }) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState(requestPitch, undefined);
  const sent = state?.notice;
  const waiting = request?.status === "open" || sent;

  return (
    <article className="card flex flex-col gap-4 p-5">
      <div className="flex items-center gap-3">
        <div className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-text text-lg font-semibold text-bg">
          {c.name.slice(0, 1).toUpperCase()}
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate font-medium">{c.name}</div>
          <div className="truncate text-xs text-muted">{c.niche || "Creator"}</div>
        </div>
        <span className="eyebrow shrink-0">{c.aspect === "9:16" ? "Shorts" : "YouTube"}</span>
      </div>

      {(c.categories ?? []).length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {c.categories.map((cat) => (
            <span key={cat} className="rounded-full border border-line px-2.5 py-0.5 text-xs capitalize text-muted">
              {cat}
            </span>
          ))}
        </div>
      )}
      {c.style_notes && <p className="line-clamp-3 text-sm leading-relaxed text-muted">{c.style_notes}</p>}

      <div className="mt-auto flex flex-wrap items-center gap-2 pt-1">
        {c.channel_url && (
          <a href={c.channel_url} target="_blank" rel="noreferrer" className="btn btn-ghost">
            Channel ↗
          </a>
        )}
        {waiting ? (
          <span className="text-sm text-muted">{sent ? "Requested ✓" : STATUS.open}</span>
        ) : (
          <button className="btn btn-primary" disabled={!canRequest} onClick={() => setOpen((o) => !o)} aria-expanded={open}>
            {request ? "Request again" : "Request a pitch"}
          </button>
        )}
        {request && !waiting && <span className="text-xs text-muted">Last request: {STATUS[request.status]}</span>}
      </div>
      {!canRequest && !waiting && <p className="text-xs text-muted">Publish your brand profile to request pitches.</p>}

      {open && !sent && (
        <form action={action} className="space-y-3 border-t border-line pt-4">
          <input type="hidden" name="creator_id" value={c.id} />
          <TextArea
            label="Brief"
            name="brief"
            required
            minLength={10}
            maxLength={1000}
            placeholder="What should the ad focus on? Launch, audience, vibe…"
          />
          <Field label="Budget (USD, optional)" name="budget_usd" type="number" min={0} step={1} inputMode="numeric" />
          <FormMessage state={state} />
          <button className="btn btn-primary w-full" disabled={pending}>
            {pending ? "Sending…" : `Send request to ${c.name}`}
          </button>
        </form>
      )}
    </article>
  );
}
