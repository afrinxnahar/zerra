"use client";
import type { Creator, PitchWithDetails } from "@/lib/types";

async function j<T>(res: Response): Promise<T> {
  const body = await res.json();
  if (!res.ok) throw new Error(body?.error || res.statusText);
  return body as T;
}

export const api = {
  saveCreator: (c: Partial<Creator>) =>
    fetch("/api/creator", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(c) }).then(
      (r) => j<Creator>(r),
    ),
  /** the signed-in user's pitches (creator: their own, brand: sent to them) */
  pitches: () => fetch("/api/pitches").then((r) => j<PitchWithDetails[]>(r)),
  createPitch: (brand_id: string) =>
    fetch("/api/pitches", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ brand_id }),
    }).then((r) => j<PitchWithDetails>(r)),
  send: (pitchId: string, variant_id: string, message: string) =>
    fetch(`/api/pitches/${pitchId}/send`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ variant_id, message }),
    }).then((r) => j<PitchWithDetails>(r)),
  retry: (variantId: string) => fetch(`/api/variants/${variantId}/retry`, { method: "POST" }).then((r) => j(r)),
  status: () =>
    fetch("/api/status").then((r) =>
      j<{ mode: string; store: string; queue: string; keyed: boolean; credits: string | null }>(r),
    ),
};
