import type { Brand, Creator } from "../types";

/**
 * Fixed prompt templates. Nothing open ended goes to a model: the script is
 * slot filled (hook, product, benefit, cta) and every visual prompt is wrapped
 * in the same style frame so the 4 shots look like one world.
 */

export const ANGLES = [
  {
    key: "relatable",
    label: "Relatable moment",
    brief: "Open on a small, very relatable moment from the creator's everyday world, then the product fixes it.",
  },
  {
    key: "value",
    label: "Straight value",
    brief: "Confident and direct. Lead with the most useful product fact, like a quick honest recommendation.",
  },
  {
    key: "playful",
    label: "Playful",
    brief: "Light and funny, a little self aware about doing a sponsor spot, but still sells the product.",
  },
] as const;

export const VOICES = [
  "Tessa (en)",
  "Celeste (en)",
  "Pippa (en)",
  "Evelyn (en)",
  "Liam (en)",
  "Callum (en)",
  "Hank (en)",
] as const;

export function scriptPrompt(brand: Brand, creator: Creator, angle: (typeof ANGLES)[number]) {
  return `You write 15 to 20 second spec ad scripts that a YouTube creator sends to a brand as a sponsorship pitch. Fill the slots exactly. Output JSON only, no markdown.

BRAND: ${brand.name}
PRODUCT: ${brand.product_name} (say it out loud as "${brand.spoken_name}")
PRODUCT FACTS (the only claims you may make):
${brand.product_facts.map((f) => `- ${f}`).join("\n")}
CREATOR: ${creator.name} (${creator.niche})
CREATOR STYLE NOTES: ${creator.style_notes}
ANGLE: ${angle.brief}

RULES
- Voiceover is spoken by the creator in first person, in their style. Plain spoken words only, no stage directions, no emojis, no hashtags.
- Total voiceover 30 to 40 words.
- hook: one punchy line from the creator's world that fits the ANGLE. Do not mention the product yet. Do not start with "Another".
- product: say the brand name and "${brand.spoken_name}" out loud.
- benefit: one concrete fact from the product facts list.
- cta: tell viewers to try ${brand.name} by name, for example link below.
- Never invent claims, prices, discounts or health benefits beyond the facts.
- visual: a scene for an image model. The product must NOT appear (it is composited later). Describe setting, lighting, mood and framing only. No text, no logos, no brand names, no close up faces, and no ${brand.scene_avoid} anywhere in the scene.
- All four visuals must feel like one consistent world that matches the creator's niche, and each needs clear empty space in the lower middle of the frame where the product will sit.

JSON shape:
{"beats":[
 {"slot":"hook","vo":"...","visual":"..."},
 {"slot":"product","vo":"...","visual":"..."},
 {"slot":"benefit","vo":"...","visual":"..."},
 {"slot":"cta","vo":"...","visual":"..."}
],"music":"one line mood for instrumental background music"}`;
}

export function framePrompt(visual: string, aspect: "9:16" | "16:9", avoid = "") {
  return (
    `Cinematic ${aspect === "9:16" ? "vertical" : "widescreen"} photo, 35mm film look, shallow depth of field, soft natural color grade, ` +
    `a clear empty surface in the lower middle of the frame. No text, no logos, no products, no brand names, no watermarks${avoid ? `, no ${avoid}` : ""}. Scene: ${visual}`
  );
}

export function musicPrompt(mood: string) {
  return `${mood}. Instrumental background bed for a short social ad, no vocals, steady and unobtrusive.`;
}

/** Break a line of VO into short caption cues timed across the beat. */
export function captionCues(text: string, start: number, dur: number, maxWords = 5) {
  const words = text.split(/\s+/).filter(Boolean);
  const chunks: string[] = [];
  for (let i = 0; i < words.length; i += maxWords) chunks.push(words.slice(i, i + maxWords).join(" "));
  const per = dur / Math.max(chunks.length, 1);
  return chunks.map((t, i) => ({
    start_sec: +(start + i * per).toFixed(2),
    end_sec: +(start + (i + 1) * per - 0.05).toFixed(2),
    text: t,
  }));
}

export function parseScript(raw: string) {
  const cleaned = raw.replace(/^```(json)?/gm, "").replace(/```$/gm, "").trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  const obj = JSON.parse(cleaned.slice(start, end + 1));
  const slots = ["hook", "product", "benefit", "cta"];
  if (!Array.isArray(obj.beats) || obj.beats.length !== 4) throw new Error("script: expected 4 beats");
  obj.beats.forEach((b: { slot: string; vo: string; visual: string }, i: number) => {
    if (b.slot !== slots[i] || !b.vo || !b.visual) throw new Error(`script: bad beat ${i}`);
    b.vo = b.vo.replace(/[*_#]/g, "").trim();
  });
  return obj as { beats: { slot: "hook" | "product" | "benefit" | "cta"; vo: string; visual: string }[]; music: string };
}
