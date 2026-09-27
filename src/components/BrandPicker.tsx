"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Brand } from "@/lib/types";
import { api } from "./api";
import { BrandCard } from "./BrandCard";

export function BrandPicker({ brands }: { brands: Brand[] }) {
  const router = useRouter();
  const [selected, setSelected] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const brand = brands.find((b) => b.id === selected) || null;

  async function generate() {
    if (!brand) return;
    setBusy(true);
    setErr(null);
    try {
      await api.createPitch(brand.id);
      router.push("/creator/pitches");
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6 pb-28">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        {brands.map((b) => (
          <BrandCard key={b.id} brand={b} selected={b.id === selected} onSelect={() => setSelected(b.id)} />
        ))}
      </div>

      {/* sticky action bar so Generate stays reachable while scrolling the grid */}
      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-bg/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:px-6">
          <div className="min-w-0 flex-1 text-sm">
            {brand ? (
              <>
                <div className="font-medium">
                  {brand.name} · {brand.product_name}
                </div>
                <div className="truncate text-muted">{brand.product_facts.join(" · ")}</div>
              </>
            ) : (
              <span className="text-muted">Select a brand to generate a spec ad.</span>
            )}
            {err && <div className="mt-1 text-bad">{err}</div>}
          </div>
          <button className="btn btn-primary" disabled={!brand || busy} onClick={generate}>
            {busy ? "Starting…" : "Generate spec ad ×3"}
          </button>
        </div>
      </div>
    </div>
  );
}
