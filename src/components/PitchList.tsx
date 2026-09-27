"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import type { PitchWithDetails } from "@/lib/types";
import { api } from "./api";
import { PitchCard } from "./PitchCard";

export function PitchList({ initial }: { initial: PitchWithDetails[] }) {
  const [pitches, setPitches] = useState(initial);
  const refresh = useCallback(() => api.pitches().then(setPitches).catch(() => undefined), []);

  // poll only while something is still generating
  const generating = pitches.some((p) => p.status === "generating");
  useEffect(() => {
    if (!generating) return;
    const t = setInterval(refresh, 2500);
    return () => clearInterval(t);
  }, [generating, refresh]);

  if (pitches.length === 0) {
    return (
      <div className="card flex flex-col items-center gap-4 px-6 py-16 text-center">
        <p className="text-muted">No pitches yet. Your generated spec ads show up here.</p>
        <Link href="/creator" className="btn btn-primary">
          Discover brands
        </Link>
      </div>
    );
  }
  return (
    <div className="space-y-6">
      {pitches.map((p) => (
        <PitchCard key={p.id} pitch={p} onChange={refresh} />
      ))}
    </div>
  );
}
