"use client";

import { useState } from "react";
import type { PitchWithDetails } from "@/lib/types";
import { AdPlayer } from "./AdPlayer";

/** The brand side: pitches arrive as playable spec ads, not paragraphs. */
export function Inbox({ pitches }: { pitches: PitchWithDetails[] }) {
  if (pitches.length === 0) {
    return (
      <div className="card px-6 py-16 text-center text-muted">
        No pitches yet. When a creator sends you a spec ad, it lands here.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {pitches.map((p) => {
        const v = p.variants.find((x) => x.id === p.selected_variant_id) || p.variants.find((x) => x.status === "done");
        const vertical = p.creator.aspect === "9:16";
        return (
          <article key={p.id} className="card grid gap-6 p-4 sm:p-5 md:grid-cols-[auto_1fr]">
            <div className={vertical ? "mx-auto w-full max-w-[300px] md:w-[300px]" : "w-full md:w-[520px]"}>
              {v?.video_url && (
                <div className={`overflow-hidden rounded-xl bg-black ${vertical ? "aspect-[9/16]" : "aspect-video"}`}>
                  <AdPlayer v={v} brand={p.brand} aspect={p.creator.aspect} />
                </div>
              )}
            </div>
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="grid h-11 w-11 place-items-center rounded-full bg-text text-lg font-semibold text-bg">
                  {p.creator.name.slice(0, 1)}
                </div>
                <div>
                  <div className="font-medium">{p.creator.name}</div>
                  <div className="text-xs text-muted">{p.creator.niche}</div>
                </div>
              </div>
              {p.message && <p className="rounded-xl bg-panel-2 p-4 text-sm leading-relaxed">“{p.message}”</p>}
              <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-line bg-line text-sm">
                <Fact label="Product">{p.brand.product_name}</Fact>
                <Fact label="Format">
                  {p.creator.aspect} · {v?.duration_sec}s
                </Fact>
                <Fact label="Angle">{v?.assets.angle}</Fact>
                <Fact label="Received">{p.sent_at ? new Date(p.sent_at).toLocaleString() : ""}</Fact>
              </dl>
              <div className="flex flex-wrap gap-2">
                <InterestedButton />
                {p.creator.channel_url && (
                  <a className="btn btn-ghost" href={p.creator.channel_url} target="_blank" rel="noreferrer">
                    View channel ↗
                  </a>
                )}
              </div>
            </div>
          </article>
        );
      })}
    </div>
  );
}

function Fact({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="bg-panel p-3">
      <dt className="eyebrow !text-[10px]">{label}</dt>
      <dd className="mt-1">{children}</dd>
    </div>
  );
}

function InterestedButton() {
  const [on, setOn] = useState(false);
  return (
    <button className={`btn ${on ? "btn-ghost text-ok" : "btn-primary"}`} onClick={() => setOn(true)}>
      {on ? "Marked interested ✓" : "Interested"}
    </button>
  );
}
