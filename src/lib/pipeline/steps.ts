import fs from "node:fs/promises";
import path from "node:path";
import { env, hasSupabase } from "../env";
import { db } from "../store";
import { persistVideo } from "../store/supabase";
import type { Beat, Brand, Creator, PitchWithDetails, Step, Variant, VariantAssets } from "../types";
import { STEPS } from "../types";
import * as gen from "../livepeer/generate";
import { ANGLES, captionCues, framePrompt, musicPrompt, parseScript, scriptPrompt } from "./templates";

type Ctx = { variant: Variant; pitch: PitchWithDetails; brand: Brand; creator: Creator };

const GAP = 0.5; // breathing room after each VO line
const DIRS: gen.Dir[] = ["in", "right", "out", "in"];
const INTRO_SEC = 1.6;

async function pool<T, R>(items: T[], n: number, fn: (t: T, i: number) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(n, items.length) }, async () => {
      while (next < items.length) {
        const i = next++;
        out[i] = await fn(items[i], i);
      }
    }),
  );
  return out;
}

const readPublic = (p: string) => fs.readFile(path.join(process.cwd(), "public", p.replace(/^\//, "")));

// ---------------------------------------------------------------------------- steps

async function stepScript({ variant, brand, creator }: Ctx): Promise<VariantAssets> {
  const angle = ANGLES.find((a) => a.key === variant.angle) || ANGLES[0];
  let lastErr: unknown;
  for (let i = 0; i < 3; i++) {
    try {
      const s = parseScript(await gen.llm(scriptPrompt(brand, creator, angle)));
      return { angle: angle.label, beats: s.beats, music_prompt: s.music };
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr;
}

async function stepVisuals({ variant, creator, brand }: Ctx): Promise<VariantAssets> {
  const beats = variant.assets.beats!;
  const frames = await pool(beats, 4, (b, i) => gen.image(framePrompt(b.visual, creator.aspect, brand.scene_avoid), creator.aspect, i));
  const intro_thumb_url = creator.channel_url ? await latestThumbnail(creator.channel_url) : undefined;
  return {
    beats: beats.map((b, i) => ({ ...b, frame_url: frames[i] })),
    ...(intro_thumb_url ? { intro_thumb_url } : {}),
  };
}

async function stepAudio({ variant, creator }: Ctx): Promise<VariantAssets> {
  const beats = variant.assets.beats!;
  const vo = await pool(beats, 4, (b) => gen.tts(b.vo, creator.voice));
  const total = vo.reduce((s, v) => s + v.sec + GAP, 0) + (variant.assets.intro_thumb_url ? INTRO_SEC : 0);
  const music_url = await gen.music(musicPrompt(variant.assets.music_prompt || "Upbeat modern lo-fi"), total);
  return {
    beats: beats.map((b, i) => ({ ...b, vo_url: vo[i].url, vo_sec: +vo[i].sec.toFixed(2) })),
    music_url,
  };
}

async function stepMotion({ variant, creator }: Ctx): Promise<VariantAssets> {
  const beats = variant.assets.beats!;
  const clips = await pool(beats, 2, async (b, i) => {
    const sec = (b.vo_sec || 3) + GAP;
    return { url: await gen.kenburns(b.frame_url!, sec, DIRS[i % DIRS.length], creator.aspect), sec };
  });
  let intro_clip_url: string | undefined;
  if (variant.assets.intro_thumb_url) {
    try {
      intro_clip_url = await gen.kenburns(variant.assets.intro_thumb_url, INTRO_SEC, "in", creator.aspect);
    } catch {
      intro_clip_url = undefined; // the intro is a nice to have, never fail the ad over it
    }
  }
  return {
    beats: beats.map((b, i) => ({ ...b, clip_url: clips[i].url, clip_sec: +clips[i].sec.toFixed(2) })),
    ...(intro_clip_url ? { intro_clip_url } : {}),
  };
}

async function stepMux({ variant, brand, creator }: Ctx): Promise<{ assets: VariantAssets; final: Partial<Variant> }> {
  const a = variant.assets;
  const beats = a.beats as Required<Beat>[];
  const introSec = a.intro_clip_url ? INTRO_SEC : 0;
  const clipUrls = [...(a.intro_clip_url ? [a.intro_clip_url] : []), ...beats.map((b) => b.clip_url)];
  const starts: number[] = [];
  let t = introSec;
  for (const b of beats) {
    starts.push(t);
    t += b.clip_sec;
  }
  const total = t;

  const concat_url = await gen.concat(clipUrls);

  // The real product image is composited on top, from the product beat to the end. Never generated.
  const productImg = await gen.ensurePublic(brand.cutout_url || brand.cutout_path, readPublic);
  const place = placement(brand.cutout_aspect || 0.7, creator.aspect);
  const overlay_url = await gen.overlay(concat_url, productImg, { ...place, start_sec: +starts[1].toFixed(2) });

  const cues = beats.flatMap((b, i) => captionCues(b.vo, starts[i] + 0.15, b.vo_sec));
  const captioned_url = await gen.captions(overlay_url, cues);

  let final = captioned_url;
  let mix_url: string | undefined;
  if (env.livepeerMode === "real") {
    const tracks = [
      ...beats.map((b, i) => ({ url: b.vo_url, volume: 1.6, delay_ms: Math.round((starts[i] + 0.15) * 1000) })),
      ...(a.music_url ? [{ url: a.music_url, volume: 0.2 }] : []),
    ];
    mix_url = await gen.mixAudio(tracks);
    final = await gen.mux(captioned_url, mix_url);
  }

  const video_url = await persist(variant.id, final);
  return {
    assets: { concat_url, overlay_url, captioned_url, mix_url },
    final: { video_url, thumb_url: beats[1]?.frame_url || beats[0].frame_url, duration_sec: +total.toFixed(1) },
  };
}

/** Size the product so tall cans and wide keyboards read at a similar visual weight. */
export function placement(aspect: number, frame: "9:16" | "16:9") {
  const [W, H] = frame === "9:16" ? [1080, 1920] : [1920, 1080];
  const targetH = frame === "9:16" ? 0.36 * H : 0.5 * H;
  const maxW = frame === "9:16" ? 0.86 * W : 0.45 * W;
  const w = Math.min(targetH * aspect, maxW);
  const scale = +(w / W).toFixed(3);
  return frame === "9:16" ? { x: 0.5, y: 0.6, scale } : { x: 0.72, y: 0.58, scale };
}

async function persist(variantId: string, url: string): Promise<string> {
  if (!/^https?:\/\//.test(url)) return url; // mock asset already served from /public
  if (hasSupabase()) {
    try {
      return await persistVideo(variantId, url);
    } catch (e) {
      console.warn("[persist] supabase upload failed, keeping livepeer url", e);
      return url;
    }
  }
  try {
    const res = await fetch(url);
    const buf = Buffer.from(await res.arrayBuffer());
    const dir = path.join(process.cwd(), ".data", "videos");
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(path.join(dir, `${variantId}.mp4`), buf);
    return `/api/media/${variantId}.mp4`;
  } catch {
    return url;
  }
}

/** Best effort: the creator's latest upload thumbnail, used as a 1.6s intro. */
async function latestThumbnail(channelUrl: string): Promise<string | undefined> {
  try {
    const u = channelUrl.startsWith("http") ? channelUrl : `https://www.youtube.com/${channelUrl.replace(/^\//, "")}`;
    if (!/youtube\.com|youtu\.be/.test(u)) return undefined;
    const direct = u.match(/(?:v=|youtu\.be\/|shorts\/)([\w-]{11})/);
    let id = direct?.[1];
    if (!id) {
      const res = await fetch(u.replace(/\/$/, "") + "/videos", {
        headers: { "User-Agent": "Mozilla/5.0", "Accept-Language": "en" },
        signal: AbortSignal.timeout(8000),
      });
      id = (await res.text()).match(/"videoId":"([\w-]{11})"/)?.[1];
    }
    return id ? `https://i.ytimg.com/vi/${id}/hqdefault.jpg` : undefined;
  } catch {
    return undefined;
  }
}

// ---------------------------------------------------------------------------- runner

const HANDLERS: Record<Step, (c: Ctx) => Promise<VariantAssets | { assets: VariantAssets; final: Partial<Variant> }>> = {
  script: stepScript,
  visuals: stepVisuals,
  audio: stepAudio,
  motion: stepMotion,
  mux: stepMux,
};

/** Run one step for one variant. Returns the next step, or null when the variant is finished. */
export async function runStep(variantId: string, step: Step): Promise<Step | null> {
  const store = db();
  const variant = await store.getVariant(variantId);
  if (!variant) throw new Error(`variant ${variantId} not found`);
  if (variant.status === "failed" || variant.status === "done") return null;
  const pitch = (await store.getPitch(variant.pitch_id))!;
  const ctx: Ctx = { variant, pitch, brand: pitch.brand, creator: pitch.creator };

  const log = (msg: string) => [...(variant.assets.log || []), `${new Date().toISOString().slice(11, 19)} ${msg}`];
  await store.updateVariant(variantId, { status: "running", step, assets: { ...variant.assets, log: log(`${step} started`) } });

  try {
    const t0 = Date.now();
    const { result, usd } = await gen.metered(() => HANDLERS[step](ctx));
    const fresh = (await store.getVariant(variantId))!;
    const isFinal = "final" in result;
    const patchAssets = isFinal ? result.assets : result;
    const assets: VariantAssets = {
      ...fresh.assets,
      ...patchAssets,
      cost_usd: +((fresh.assets.cost_usd || 0) + usd).toFixed(4),
      log: [...(fresh.assets.log || []), `${new Date().toISOString().slice(11, 19)} ${step} done in ${((Date.now() - t0) / 1000).toFixed(1)}s ($${usd.toFixed(3)})`],
    };
    const nextIdx = STEPS.indexOf(step) + 1;
    const next = nextIdx < STEPS.length ? STEPS[nextIdx] : null;
    await store.updateVariant(variantId, {
      assets,
      ...(isFinal ? result.final : {}),
      status: next ? "running" : "done",
      step: next,
    });
    if (!next) await settlePitch(variant.pitch_id);
    return next;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error(`[pipeline] ${variantId} ${step} failed:`, msg);
    const fresh = (await store.getVariant(variantId))!;
    await store.updateVariant(variantId, {
      status: "failed",
      error: `${step}: ${msg}`.slice(0, 800),
      assets: { ...fresh.assets, log: [...(fresh.assets.log || []), `${step} failed: ${msg.slice(0, 200)}`] },
    });
    await settlePitch(variant.pitch_id);
    return null;
  }
}

async function settlePitch(pitchId: string) {
  const store = db();
  const p = await store.getPitch(pitchId);
  if (!p || p.status === "sent") return;
  const pending = p.variants.some((v) => v.status === "queued" || v.status === "running");
  if (pending) return;
  await store.updatePitch(pitchId, { status: p.variants.some((v) => v.status === "done") ? "ready" : "failed" });
}
