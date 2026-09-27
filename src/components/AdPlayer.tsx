"use client";
/* eslint-disable @next/next/no-img-element */
import { useState } from "react";
import type { Brand, Variant } from "@/lib/types";

/**
 * Cover = the product beat's frame with the brand's real cutout on top (same placement as the ad),
 * so the preview sells the product before anyone presses play. Click swaps in the real video.
 */
export function AdPlayer({
  v,
  brand,
  aspect = "9:16",
  className = "",
}: {
  v: Variant;
  brand: Brand;
  aspect?: "9:16" | "16:9";
  className?: string;
}) {
  const a = brand.cutout_aspect || 0.7;
  // mirrors placement() in lib/pipeline/steps.ts
  const heightPct = aspect === "9:16" ? Math.min(36, (86 * 9) / 16 / a) : Math.min(50, (45 * 16) / 9 / a);
  const [playing, setPlaying] = useState(false);
  const frame = v.assets.beats?.[1]?.frame_url || v.thumb_url;
  if (playing || !frame) {
    return <video src={v.video_url || undefined} controls autoPlay playsInline className={`h-full w-full bg-black object-cover ${className}`} />;
  }
  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        setPlaying(true);
      }}
      className={`group relative block h-full w-full overflow-hidden ${className}`}
      aria-label="Play spec ad"
    >
      <img src={frame} alt="" className="absolute inset-0 h-full w-full object-cover" />
      <img
        src={brand.cutout_path}
        alt={brand.product_name}
        className="absolute w-auto -translate-x-1/2 -translate-y-1/2 object-contain"
        style={{ height: `${heightPct}%`, left: aspect === "9:16" ? "50%" : "72%", top: aspect === "9:16" ? "60%" : "58%" }}
      />
      <span className="absolute inset-0 grid place-items-center">
        <span className="grid h-14 w-14 place-items-center rounded-full bg-black/55 text-2xl text-white backdrop-blur transition group-hover:scale-110">
          ▶
        </span>
      </span>
      {v.duration_sec ? (
        <span className="absolute bottom-2 right-2 rounded bg-black/60 px-1.5 py-0.5 text-[11px] text-white">
          {v.duration_sec}s
        </span>
      ) : null}
    </button>
  );
}
