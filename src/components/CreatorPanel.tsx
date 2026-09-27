"use client";

import { useState } from "react";
import type { Creator } from "@/lib/types";
import { api } from "./api";

const VOICES = ["Tessa (en)", "Celeste (en)", "Pippa (en)", "Evelyn (en)", "Liam (en)", "Callum (en)", "Hank (en)"];

export function CreatorPanel({ creator }: { creator: Creator }) {
  const [c, setC] = useState(creator);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const set = (k: keyof Creator) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setSaved(false);
    setC({ ...c, [k]: e.target.value });
  };

  async function save() {
    setSaving(true);
    try {
      setC(await api.saveCreator(c));
      setSaved(true);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="card space-y-4 p-5 sm:p-6">
      <div className="flex items-center gap-3">
        <div className="grid h-11 w-11 place-items-center rounded-full bg-text text-lg font-semibold text-bg">
          {c.name.slice(0, 1).toUpperCase()}
        </div>
        <div>
          <div className="eyebrow">Creator profile</div>
          <div className="font-medium">{c.name}</div>
        </div>
      </div>
      <label className="block space-y-1.5 text-xs text-muted">
        Channel name
        <input className="input" value={c.name} onChange={set("name")} />
      </label>
      <label className="block space-y-1.5 text-xs text-muted">
        Niche
        <input className="input" value={c.niche} onChange={set("niche")} placeholder="tech and productivity" />
      </label>
      <label className="block space-y-1.5 text-xs text-muted">
        Style notes (how you talk, your vibe)
        <textarea className="input min-h-24" value={c.style_notes} onChange={set("style_notes")} />
      </label>
      <label className="block space-y-1.5 text-xs text-muted">
        Channel link (latest thumbnail opens the ad)
        <input className="input" value={c.channel_url || ""} onChange={set("channel_url")} placeholder="https://youtube.com/@you" />
      </label>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block space-y-1.5 text-xs text-muted">
          Voice
          <select className="input" value={c.voice} onChange={set("voice")}>
            {VOICES.map((v) => (
              <option key={v}>{v}</option>
            ))}
          </select>
        </label>
        <label className="block space-y-1.5 text-xs text-muted">
          Format
          <select className="input" value={c.aspect} onChange={set("aspect")}>
            <option value="9:16">9:16 Shorts</option>
            <option value="16:9">16:9 YouTube</option>
          </select>
        </label>
      </div>
      <button className="btn btn-primary w-full sm:w-auto" onClick={save} disabled={saving}>
        {saving ? "Saving…" : saved ? "Saved ✓" : "Save profile"}
      </button>
    </div>
  );
}
