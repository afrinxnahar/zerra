import { AsyncLocalStorage } from "node:async_hooks";
import { env } from "../env";
import { runCapability, uploadBytes } from "./client";

/**
 * Every media operation the pipeline needs, as one function each.
 * Real mode calls Livepeer Agent capabilities. Mock mode returns canned assets
 * from /public/mock instantly so the whole app can be built without spending credits.
 *
 * Capability params below were probed against the live network (Sep 2026).
 */

const isMock = () => env.livepeerMode === "mock";
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const mockDelay = () => sleep(300 + Math.random() * 500);

export type Dir = "in" | "out" | "left" | "right";

// Per-step spend meter (AsyncLocalStorage so parallel variants don't mix their costs).
const meter = new AsyncLocalStorage<{ usd: number }>();
export async function metered<T>(fn: () => Promise<T>): Promise<{ result: T; usd: number }> {
  const box = { usd: 0 };
  const result = await meter.run(box, fn);
  return { result, usd: box.usd };
}
// Two small concurrency gates: the free ffmpeg tools and the paid models.
// Too many calls at once just earns "no capacity" rejections from the network.
function gate(slots: number) {
  let busy = 0;
  const waiters: (() => void)[] = [];
  return async <T>(fn: () => Promise<T>): Promise<T> => {
    while (busy >= slots) await new Promise<void>((r) => waiters.push(r));
    busy++;
    try {
      return await fn();
    } finally {
      busy--;
      waiters.shift()?.();
    }
  };
}
const toolGate = gate(Number(process.env.LIVEPEER_TOOL_CONCURRENCY || 3));
const modelGate = gate(Number(process.env.LIVEPEER_MODEL_CONCURRENCY || 4));

// Rejected before any provider ran: safe to retry for every capability.
const NOT_DISPATCHED = /no capacity|No orchestrator available|HTTP 50[234]|ECONNRESET|fetch failed/i;
// Cut off mid-render: only safe to retry for the free tools (a paid model may bill twice).
const TIMED_OUT = /aborted|timed out|timeout/i;

async function run(cap: string, opts: Parameters<typeof runCapability>[1]) {
  const isTool = cap.startsWith("ffmpeg-");
  const g = isTool ? toolGate : modelGate;
  let r;
  for (let attempt = 1; ; attempt++) {
    try {
      r = await g(() => runCapability(cap, opts));
      break;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      const retry = NOT_DISPATCHED.test(msg) || (isTool && TIMED_OUT.test(msg));
      if (!retry || attempt >= 4) throw e;
      await sleep(4000 * attempt);
    }
  }
  const box = meter.getStore();
  if (box) box.usd += r.cost || 0;
  return r;
}
function needUrl(r: { url?: string }, what: string) {
  if (!r.url) throw new Error(`${what}: no url returned`);
  return r.url;
}

export async function llm(prompt: string): Promise<string> {
  if (isMock()) {
    await mockDelay();
    return JSON.stringify(MOCK_SCRIPT);
  }
  const r = await run("gemini-text", { prompt, timeout: 40 });
  if (!r.text) throw new Error("gemini-text returned no text");
  return r.text;
}

export async function image(prompt: string, aspect: "9:16" | "16:9", i = 0): Promise<string> {
  if (isMock()) {
    await mockDelay();
    return `/mock/frame-${i % 4}.jpg`;
  }
  const r = await run("flux-dev", {
    prompt,
    inputs: { image_size: aspect === "9:16" ? "portrait_16_9" : "landscape_16_9" },
    timeout: 40,
  });
  return needUrl(r, "flux-dev");
}

export async function tts(text: string, voice: string): Promise<{ url: string; sec: number }> {
  if (isMock()) {
    await mockDelay();
    return { url: "", sec: estimateSpeech(text) };
  }
  const r = await run("inworld-tts", { prompt: text, inputs: { voice }, timeout: 40 });
  const url = needUrl(r, "inworld-tts");
  return { url, sec: (await wavDuration(url)) ?? estimateSpeech(text) };
}

export async function kenburns(src: string, sec: number, dir: Dir, aspect: "9:16" | "16:9"): Promise<string> {
  if (isMock()) {
    await mockDelay();
    return src;
  }
  const [width, height] = aspect === "9:16" ? [1080, 1920] : [1920, 1080];
  const r = await run("ffmpeg-kenburns", {
    source_url: src,
    inputs: { duration_sec: +sec.toFixed(2), width, height, direction: dir, fps: 30 },
    timeout: 150,
  });
  return needUrl(r, "ffmpeg-kenburns");
}

/** Optional real motion for one hero shot (costs ~$0.07 per second). */
export async function animate(src: string, prompt: string, sec: number): Promise<string> {
  if (isMock()) {
    await mockDelay();
    return src;
  }
  const r = await run("pixverse-i2v", {
    source_url: src,
    prompt,
    inputs: { duration: Math.max(1, Math.min(15, Math.round(sec))) },
    timeout: 240,
  });
  return needUrl(r, "pixverse-i2v");
}

export async function music(prompt: string, sec: number): Promise<string> {
  if (isMock()) {
    await mockDelay();
    return "";
  }
  const r = await run("sonilo-t2m", { prompt, inputs: { duration: Math.ceil(sec) + 1 }, timeout: 90 });
  return needUrl(r, "sonilo-t2m");
}

export async function concat(clips: string[]): Promise<string> {
  if (isMock()) {
    await mockDelay();
    return "/mock/sample-ad.mp4";
  }
  const r = await run("ffmpeg-concat", { inputs: { clips, transition: "cut" }, timeout: 60 });
  return needUrl(r, "ffmpeg-concat");
}

export async function overlay(
  video: string,
  img: string,
  o: { x: number; y: number; scale: number; start_sec?: number; end_sec?: number },
): Promise<string> {
  if (isMock()) {
    await mockDelay();
    return video;
  }
  // ffmpeg-overlay's validator and container disagree on key names, so send every alias.
  const r = await run("ffmpeg-overlay", {
    source_url: video,
    inputs: { base_url: video, video_url: video, overlay_url: img, image_url: img, ...o },
    timeout: 120,
  });
  return needUrl(r, "ffmpeg-overlay");
}

export async function captions(
  video: string,
  cues: { start_sec: number; end_sec: number; text: string }[],
): Promise<string> {
  if (isMock()) {
    await mockDelay();
    return video;
  }
  const r = await run("ffmpeg-burn-subtitles", {
    source_url: video,
    inputs: { cues, font_size: 14, position: "bottom" },
    timeout: 90,
  });
  return needUrl(r, "ffmpeg-burn-subtitles");
}

export async function mixAudio(tracks: { url: string; volume?: number; delay_ms?: number }[]): Promise<string> {
  if (isMock()) {
    await mockDelay();
    return "";
  }
  const r = await run("ffmpeg-audio-mix", {
    inputs: { tracks, format: "aac", duration_mode: "longest" },
    timeout: 90,
  });
  return needUrl(r, "ffmpeg-audio-mix");
}

export async function mux(video: string, audio: string): Promise<string> {
  if (isMock()) {
    await mockDelay();
    return video;
  }
  const r = await run("ffmpeg-mux", { source_url: video, inputs: { audio_url: audio, shortest: true }, timeout: 60 });
  return needUrl(r, "ffmpeg-mux");
}

/** Make sure an asset is reachable by the Livepeer network (local paths get uploaded). */
const hosted = new Map<string, string>();
export async function ensurePublic(urlOrPath: string, readLocal: (p: string) => Promise<Buffer>): Promise<string> {
  if (isMock()) return urlOrPath;
  if (/^https:\/\//.test(urlOrPath) && !/localhost|127\.0\.0\.1/.test(urlOrPath)) return urlOrPath;
  const cached = hosted.get(urlOrPath);
  if (cached) return cached;
  const buf = await readLocal(urlOrPath);
  const mime = urlOrPath.endsWith(".png") ? "image/png" : urlOrPath.endsWith(".jpg") ? "image/jpeg" : "application/octet-stream";
  const url = await uploadBytes(buf, mime, urlOrPath.split("/").pop() || "asset");
  hosted.set(urlOrPath, url);
  return url;
}

// ---------------------------------------------------------------------------

export function estimateSpeech(text: string) {
  const words = text.split(/\s+/).filter(Boolean).length;
  return Math.max(1.5, words / 2.6);
}

/** Read the duration straight from a WAV header, no ffprobe needed. */
async function wavDuration(url: string): Promise<number | null> {
  try {
    const res = await fetch(url);
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.toString("ascii", 0, 4) !== "RIFF") return null;
    let off = 12;
    let byteRate = 0;
    while (off + 8 <= buf.length) {
      const id = buf.toString("ascii", off, off + 4);
      const size = buf.readUInt32LE(off + 4);
      if (id === "fmt ") byteRate = buf.readUInt32LE(off + 16);
      if (id === "data" && byteRate) {
        const dataSize = Math.min(size, buf.length - off - 8);
        return dataSize / byteRate;
      }
      off += 8 + size + (size % 2);
    }
    return null;
  } catch {
    return null;
  }
}

const MOCK_SCRIPT = {
  beats: [
    { slot: "hook", vo: "Another late night coding session. My brain is fried.", visual: "dim desk with monitors" },
    { slot: "product", vo: "So I grab this, and honestly it hits different.", visual: "warm lamp over an empty desk" },
    { slot: "benefit", vo: "It keeps me going without the crash.", visual: "morning light on the desk" },
    { slot: "cta", vo: "Try it yourself, link below.", visual: "wide shot of a tidy workspace" },
  ],
  music: "Lo-fi chillhop, relaxed",
};
