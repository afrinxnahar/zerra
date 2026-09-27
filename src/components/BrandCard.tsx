"use client";
/* eslint-disable @next/next/no-img-element */
import type { Brand } from "@/lib/types";

export function BrandCard({ brand, selected, onSelect }: { brand: Brand; selected: boolean; onSelect: () => void }) {
  return (
    <button
      onClick={onSelect}
      className={`card group overflow-hidden text-left transition ${
        selected ? "ring-2 ring-accent" : "hover:border-muted/50"
      }`}
    >
      <div
        className="relative aspect-[4/3] w-full overflow-hidden"
        style={{ background: `radial-gradient(circle at 50% 35%, ${brand.accent}55, ${brand.accent}14 70%)` }}
      >
        <img
          src={brand.cutout_path}
          alt={brand.product_name}
          className="absolute inset-[11%] h-[78%] w-[78%] object-contain transition group-hover:scale-105"
        />
        <span className="absolute left-2 top-2 rounded-full bg-black/40 px-2 py-0.5 text-[10px] uppercase tracking-wide text-white/80">
          {brand.category}
        </span>
      </div>
      <div className="p-3">
        <div className="text-sm font-semibold">{brand.name}</div>
        <div className="truncate text-xs text-muted">{brand.product_name}</div>
      </div>
    </button>
  );
}
