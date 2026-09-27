"use client";

import { useEffect, useState } from "react";
import { api } from "./api";

type Status = Awaited<ReturnType<typeof api.status>>;

export function StatusCard() {
  const [s, setS] = useState<Status | null>(null);
  useEffect(() => {
    api.status().then(setS).catch(() => undefined);
  }, []);

  return (
    <aside className="card h-fit space-y-3 p-5 text-sm">
      <div className="eyebrow">Generation</div>
      {!s ? (
        <div className="shimmer h-12 rounded-lg" />
      ) : (
        <dl className="space-y-2">
          <Row label="Mode">
            <span className={s.mode === "real" ? "text-ok" : "text-accent-2"}>{s.mode}</span>
            {s.mode === "mock" && <span className="text-muted"> · no credits spent</span>}
          </Row>
          <Row label="Data">{s.store}</Row>
          <Row label="Queue">{s.queue}</Row>
          {s.credits && <p className="pt-1 text-xs text-muted">{s.credits}</p>}
        </dl>
      )}
    </aside>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-muted">{label}</dt>
      <dd>{children}</dd>
    </div>
  );
}
