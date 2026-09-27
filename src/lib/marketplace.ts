"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getUser } from "./auth";
import { productCutout } from "./livepeer/generate";
import { startPitch } from "./pitches";
import { db } from "./store";
import { CATEGORIES, type Socials } from "./types";

export type FormState = { error?: string; notice?: string } | undefined;

const link = z
  .string()
  .trim()
  .max(300)
  .refine((v) => v === "" || /^https?:\/\/\S+$/.test(v), "Links must be full URLs starting with https://");

const BrandFields = z.object({
  name: z.string().trim().min(1, "Add your brand name.").max(80),
  tagline: z.string().trim().max(120),
  description: z.string().trim().min(1, "Describe your brand in a sentence or two.").max(1000),
  category: z.enum(CATEGORIES, { error: "Pick a category." }),
  website: link,
  instagram: link,
  tiktok: link,
  youtube: link,
  x: link,
  product_name: z.string().trim().min(1, "Name the product creators will feature.").max(80),
  spoken_name: z.string().trim().max(80),
  product_url: link,
  product_description: z.string().trim().max(600),
  product_facts: z
    .string()
    .transform((s) => s.split("\n").map((l) => l.trim()).filter(Boolean))
    .pipe(z.array(z.string().max(160, "Keep each fact under 160 characters.")).min(1, "Add at least one product fact.").max(5, "Up to 5 product facts.")),
  scene_avoid: z.string().trim().max(200),
  accent: z.string().regex(/^#[0-9a-f]{6}$/i).catch("#888888"),
  published: z.string().optional().transform((v) => v === "on"),
});

async function myBrandId() {
  const user = await getUser();
  if (user?.role !== "brand" || !user.brand_id) redirect("/login");
  return user.brand_id;
}

export async function saveBrand(_: FormState, form: FormData): Promise<FormState> {
  const id = await myBrandId();
  const parsed = BrandFields.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const { instagram, tiktok, youtube, x, ...b } = parsed.data;

  const current = await db().getBrand(id);
  // the pipeline composites this cutout into every ad, so no photo means nothing to pitch
  if (b.published && !current?.cutout_url) return { error: "Upload a product photo before publishing." };

  const socials: Socials = Object.fromEntries(Object.entries({ instagram, tiktok, youtube, x }).filter(([, v]) => v));
  await db().updateBrand(id, { ...b, socials, spoken_name: b.spoken_name || b.product_name });
  revalidatePath("/brand", "layout");
  return { notice: b.published ? "Saved. Your brand is live for creators." : "Saved as a draft." };
}

// the browser resizes before upload, this is just a guard (Vercel caps request bodies at 4.5 MB)
const MAX_PHOTO = 4 * 1024 * 1024;

/** Product photo -> background removed, trimmed, hosted cutout on the brand. */
export async function uploadProductPhoto(_: FormState, form: FormData): Promise<FormState> {
  const id = await myBrandId();
  const file = form.get("photo");
  if (!(file instanceof File) || !file.size) return { error: "Choose a photo first." };
  if (!/^image\/(png|jpeg|webp)$/.test(file.type)) return { error: "Use a PNG, JPG or WebP image." };
  if (file.size > MAX_PHOTO) return { error: "That image is too large, keep it under 4 MB." };

  try {
    const c = await productCutout(Buffer.from(await file.arrayBuffer()), file.type);
    await db().updateBrand(id, {
      product_image_url: c.photo_url,
      cutout_url: c.cutout_url,
      cutout_path: c.cutout_url,
      cutout_aspect: c.aspect,
    });
  } catch (e) {
    console.error("[product photo]", e);
    return { error: "Couldn't process that photo, try another one." };
  }
  revalidatePath("/brand", "layout");
  return { notice: "Product cutout ready." };
}

const RequestFields = z.object({
  creator_id: z.string().min(1),
  brief: z.string().trim().min(10, "Tell the creator what you're after (at least 10 characters).").max(1000),
  budget_usd: z
    .string()
    .transform((v) => (v.trim() === "" ? null : Number(v)))
    .pipe(z.number().min(0, "Budget can't be negative.").max(1_000_000).nullable()),
});

/** Brand -> creator: "make us a spec ad". */
export async function requestPitch(_: FormState, form: FormData): Promise<FormState> {
  const brand_id = await myBrandId();
  const parsed = RequestFields.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const { creator_id, brief, budget_usd } = parsed.data;

  const [brand, creator, mine] = await Promise.all([
    db().getBrand(brand_id),
    db().getCreator(creator_id),
    db().listRequests({ brand_id }),
  ]);
  if (!brand?.published) return { error: "Publish your brand profile first, creators need it to make the ad." };
  if (!creator) return { error: "That creator no longer exists." };
  if (mine.some((r) => r.creator_id === creator_id && r.status === "open")) {
    return { error: "You already have an open request with this creator." };
  }
  await db().createRequest({ brand_id, creator_id, brief, budget_usd });
  revalidatePath("/brand/creators");
  return { notice: `Request sent to ${creator.name}.` };
}

async function myOpenRequest(form: FormData) {
  const user = await getUser();
  if (user?.role !== "creator" || !user.creator_id) redirect("/login");
  const request = await db().getRequest(String(form.get("request_id")));
  if (!request || request.creator_id !== user.creator_id || request.status !== "open") return null;
  return request;
}

const Accept = z.object({
  rate_usd: z.coerce.number({ error: "Add your rate." }).min(0, "Rate can't be negative.").max(1_000_000),
  note: z.string().trim().max(500),
});

/** Creator answers a request: their rate + note, and the spec ad starts generating. */
export async function acceptRequest(_: FormState, form: FormData): Promise<FormState> {
  const request = await myOpenRequest(form);
  if (!request) return { error: "This request is no longer open." };
  const parsed = Accept.safeParse({ rate_usd: form.get("rate_usd") || undefined, note: form.get("note") || "" });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  try {
    await startPitch({
      brand_id: request.brand_id,
      creator_id: request.creator_id,
      rate_usd: parsed.data.rate_usd,
      message: parsed.data.note || null,
      request_id: request.id,
    });
  } catch {
    return { error: "This brand isn't accepting pitches right now." };
  }
  await db().updateRequest(request.id, { status: "accepted" });
  redirect("/creator/pitches");
}

export async function declineRequest(form: FormData) {
  const request = await myOpenRequest(form);
  if (request) await db().updateRequest(request.id, { status: "declined" });
  revalidatePath("/creator/requests");
}
