"use client";
/* eslint-disable @next/next/no-img-element */
import { useState } from "react";
import type { Brand, PitchWithDetails, Variant } from "@/lib/types";
import { STEPS } from "@/lib/types";
import { api } from "./api";
import { AdPlayer } from "./AdPlayer";
import { usd } from "./Form";

const STEP_LABEL: Record<string, string> = {
  script: "Script",
  visuals: "Shots",
  audio: "Voice + music",
  motion: "Motion",
  mux: "Final cut",
};

export function PitchCard({ pitch, onChange }: { pitch: PitchWithDetails; onChange: () => void }) {
  const [pick, setPick] = useState<string | null>(pitch.selected_variant_id);
  const [message, setMessage] = useState(pitch.message || "");
  const [rate, setRate] = useState(pitch.rate_usd?.toString() ?? "");
  const [sending, setSending] = useState(false);
  const sent = pitch.status === "sent";
  const ready = pitch.variants.filter((v) => v.status === "done");

  async function send() {
    if (!pick) return;
    setSending(true);
    try {
      await api.send(pitch.id, pick, message, rate.trim() === "" ? null : Number(rate));
      onChange();
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="card overflow-hidden">
      <div className="flex items-center gap-3 border-b border-line px-4 py-3">
        <img src={pitch.brand.cutout_path} alt="" className="h-9 w-9 object-contain" />
        <div className="flex-1">
          <div className="font-semibold">
            {pitch.brand.name} <span className="font-normal text-muted">· {pitch.brand.product_name}</span>
          </div>
          <div className="text-xs text-muted">
            {new Date(pitch.created_at).toLocaleString()}
            {pitch.request && <span className="ml-2 rounded-full bg-panel-2 px-2 py-0.5 text-text">Requested by brand</span>}
          </div>
        </div>
        <StatusPill status={pitch.status} />
      </div>

      {pitch.request && (
        <p className="border-b border-line px-4 py-3 text-sm text-muted">
          <span className="eyebrow mr-2">Brief</span>
          {pitch.request.brief}
          {pitch.request.budget_usd != null && <span className="text-text"> · budget {usd(pitch.request.budget_usd)}</span>}
        </p>
      )}
      <div className="grid grid-cols-1 gap-4 p-4 md:grid-cols-3">
        {pitch.variants.map((v) => (
          <VariantTile
            key={v.id}
            v={v}
            brand={pitch.brand}
            aspect={pitch.creator.aspect}
            picked={pick === v.id}
            locked={sent}
            onPick={() => setPick(v.id)}
            onRetry={async () => {
              await api.retry(v.id);
              onChange();
            }}
          />
        ))}
      </div>

      {!sent && ready.length > 0 && (
        <div className="flex flex-col gap-2 border-t border-line p-4 sm:flex-row">
          <input
            className="input flex-1"
            placeholder={`A short note to ${pitch.brand.name} (optional)`}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
          />
          <input
            className="input sm:w-36"
            type="number"
            min={0}
            step={1}
            inputMode="numeric"
            placeholder="Rate (USD)"
            aria-label="Your rate in USD"
            value={rate}
            onChange={(e) => setRate(e.target.value)}
          />
          <button className="btn btn-primary" disabled={!pick || sending} onClick={send}>
            {sending ? "Sending…" : pick ? "Send this take to the brand" : "Pick your best take"}
          </button>
        </div>
      )}
      {sent && (
        <div className="border-t border-line px-4 py-3 text-sm text-ok">
          Sent to {pitch.brand.name}&apos;s inbox{pitch.rate_usd != null ? ` at ${usd(pitch.rate_usd)}` : ""}
          {pitch.message ? `: “${pitch.message}”` : ""}
        </div>
      )}
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const map: Record<string, string> = {
    generating: "bg-accent-2/15 text-accent-2",
    ready: "bg-ok/15 text-ok",
    sent: "bg-accent/15 text-accent",
    failed: "bg-bad/15 text-bad",
  };
  return <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${map[status] || ""}`}>{status}</span>;
}

function VariantTile({
  v,
  brand,
  aspect,
  picked,
  locked,
  onPick,
  onRetry,
}: {
  v: Variant;
  brand: Brand;
  aspect: "9:16" | "16:9";
  picked: boolean;
  locked: boolean;
  onPick: () => void;
  onRetry: () => void;
}) {
  const ratio = aspect === "9:16" ? "aspect-[9/16]" : "aspect-video";
  const idx = v.step ? STEPS.indexOf(v.step) : v.status === "done" ? STEPS.length : 0;
  const beats = v.assets.beats || [];

  return (
    <div
      className={`rounded-2xl border p-2 transition ${
        picked ? "border-accent bg-accent/5" : "border-line"
      } ${v.status === "done" && !locked ? "cursor-pointer" : ""}`}
      onClick={() => v.status === "done" && !locked && onPick()}
    >
      <div className={`relative ${ratio} max-h-[460px] w-full overflow-hidden rounded-xl bg-panel-2`}>
        {v.status === "done" && v.video_url ? (
          <AdPlayer v={v} brand={brand} aspect={aspect} />
        ) : v.status === "failed" ? (
          <div className="grid h-full place-items-center p-4 text-center text-xs text-bad">
            <div className="space-y-3">
              <div>{v.error}</div>
              <button
                className="btn btn-ghost text-text"
                onClick={(e) => {
                  e.stopPropagation();
                  onRetry();
                }}
              >
                Retry from {v.step || "start"}
              </button>
            </div>
          </div>
        ) : (
          <>
            {beats[0]?.frame_url ? (
              <div className="grid h-full grid-cols-2 grid-rows-2 gap-0.5 opacity-70">
                {beats.map((b, i) =>
                  b.frame_url ? <img key={i} src={b.frame_url} alt="" className="h-full w-full object-cover" /> : null,
                )}
              </div>
            ) : (
              <div className="shimmer h-full w-full" />
            )}
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 to-transparent p-3 pt-10">
              <div className="mb-2 text-xs font-medium">{v.step ? `${STEP_LABEL[v.step]}…` : "Queued"}</div>
              <div className="flex gap-1">
                {STEPS.map((s, i) => (
                  <div key={s} className={`h-1 flex-1 rounded-full ${i < idx ? "bg-ok" : i === idx ? "shimmer" : "bg-white/15"}`} />
                ))}
              </div>
            </div>
          </>
        )}
      </div>
      <div className="flex items-center justify-between px-1 pt-2 text-xs">
        <span className="font-medium">{v.assets.angle || v.angle}</span>
        <span className="text-muted">
          {v.duration_sec ? `${v.duration_sec}s` : ""}
          {v.assets.cost_usd ? ` · $${v.assets.cost_usd.toFixed(2)}` : ""}
        </span>
      </div>
      {beats.length > 0 && (
        <details className="px-1 pt-1 text-xs text-muted" onClick={(e) => e.stopPropagation()}>
          <summary className="cursor-pointer select-none">Script</summary>
          <ol className="mt-1 space-y-1">
            {beats.map((b) => (
              <li key={b.slot}>
                <span className="uppercase text-text/60">{b.slot}</span> {b.vo}
              </li>
            ))}
          </ol>
        </details>
      )}
    </div>
  );
}
