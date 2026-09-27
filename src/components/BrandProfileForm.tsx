"use client";
/* eslint-disable @next/next/no-img-element */

import { startTransition, useActionState } from "react";
import { saveBrand, uploadProductPhoto } from "@/lib/marketplace";
import { CATEGORIES, type Brand } from "@/lib/types";
import { Field, FormMessage, TextArea } from "./Form";

/** Browser-side resize: keeps uploads well under the 4.5 MB request cap and fast to process. */
async function shrink(file: File, max = 1600): Promise<File> {
  const bmp = await createImageBitmap(file);
  const k = Math.min(1, max / Math.max(bmp.width, bmp.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bmp.width * k);
  canvas.height = Math.round(bmp.height * k);
  canvas.getContext("2d")!.drawImage(bmp, 0, 0, canvas.width, canvas.height);
  const encode = (type: string) => new Promise<Blob>((r) => canvas.toBlob((b) => r(b!), type, 0.9));
  // keep PNG transparency when it fits, JPEG otherwise (background removal handles either)
  let blob = file.type === "image/png" ? await encode("image/png") : null;
  if (!blob || blob.size > 3.5 * 1024 * 1024) blob = await encode("image/jpeg");
  return new File([blob], blob.type === "image/png" ? "product.png" : "product.jpg", { type: blob.type });
}

function ProductPhoto({ brand }: { brand: Brand }) {
  const [state, action, pending] = useActionState(uploadProductPhoto, undefined);

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const fd = new FormData();
    fd.set("photo", await shrink(file));
    startTransition(() => action(fd));
  }

  return (
    <section className="card space-y-4 p-5 sm:p-6">
      <div className="eyebrow">Product photo</div>
      <div
        className="relative grid aspect-square place-items-center overflow-hidden rounded-xl border border-line"
        style={{ background: `radial-gradient(circle at 50% 40%, ${brand.accent}40, transparent 70%), var(--panel-2)` }}
      >
        {pending ? (
          <div className="shimmer absolute inset-0 grid place-items-center text-sm text-muted">Removing background…</div>
        ) : brand.cutout_path ? (
          <img src={brand.cutout_path} alt={brand.product_name} className="absolute inset-[12%] h-[76%] w-[76%] object-contain" />
        ) : (
          <p className="px-8 text-center text-sm text-muted">Upload a clear photo of your product. We cut it out and composite it into every ad.</p>
        )}
      </div>
      <label className={`btn btn-ghost w-full cursor-pointer ${pending ? "pointer-events-none opacity-50" : ""}`}>
        {brand.cutout_path ? "Replace photo" : "Upload photo"}
        <input type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" onChange={onPick} disabled={pending} />
      </label>
      <p className="text-xs text-muted">PNG, JPG or WebP. One product, plain background works best.</p>
      <FormMessage state={state} />
    </section>
  );
}

export function BrandProfileForm({ brand }: { brand: Brand }) {
  const [state, action, pending] = useActionState(saveBrand, undefined);

  // submit via onSubmit, not <form action>: React resets the form after an action,
  // which would throw away everything typed when validation fails
  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startTransition(() => action(fd));
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,360px)_1fr]">
      <div className="space-y-6 lg:sticky lg:top-24 lg:self-start">
        <ProductPhoto brand={brand} />
      </div>

      <form onSubmit={onSubmit} className="space-y-6">
        <section className="card space-y-4 p-5 sm:p-6">
          <div className="eyebrow">Brand</div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Brand name" name="name" required maxLength={80} defaultValue={brand.name} />
            <label className="block space-y-1.5">
              <span className="eyebrow">Category</span>
              <select name="category" required className="input capitalize" defaultValue={brand.category}>
                <option value="" disabled>
                  Pick one
                </option>
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <Field label="Tagline" name="tagline" maxLength={120} placeholder="A new kind of soda" defaultValue={brand.tagline} />
          <TextArea
            label="About the brand"
            name="description"
            required
            maxLength={1000}
            defaultValue={brand.description}
            hint="Creators read this before pitching you."
          />
          <Field label="Website" name="website" type="url" placeholder="https://" defaultValue={brand.website} />
        </section>

        <section className="card space-y-4 p-5 sm:p-6">
          <div className="eyebrow">Socials</div>
          <div className="grid gap-4 sm:grid-cols-2">
            {(["instagram", "tiktok", "youtube", "x"] as const).map((s) => (
              <Field
                key={s}
                label={s === "x" ? "X" : s}
                name={s}
                type="url"
                placeholder={`https://${s === "x" ? "x" : s}.com/…`}
                defaultValue={brand.socials?.[s]}
              />
            ))}
          </div>
        </section>

        <section className="card space-y-4 p-5 sm:p-6">
          <div className="eyebrow">Hero product</div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Product name" name="product_name" required maxLength={80} defaultValue={brand.product_name} />
            <Field
              label="Said out loud as"
              name="spoken_name"
              maxLength={80}
              defaultValue={brand.spoken_name}
              hint="How the voiceover pronounces it. Defaults to the product name."
            />
          </div>
          <Field label="Product page" name="product_url" type="url" placeholder="https://" defaultValue={brand.product_url} />
          <TextArea label="Product description" name="product_description" maxLength={600} defaultValue={brand.product_description} />
          <TextArea
            label="Product facts"
            name="product_facts"
            required
            defaultValue={brand.product_facts.join("\n")}
            hint="One per line, up to 5. These are the only claims a spec ad is allowed to make."
          />
          <div className="grid gap-4 sm:grid-cols-[1fr_auto]">
            <Field
              label="Keep out of scenes"
              name="scene_avoid"
              maxLength={200}
              placeholder="other soda cans, bottles"
              defaultValue={brand.scene_avoid}
              hint="Things that would compete with your product in generated shots."
            />
            <label className="block space-y-1.5">
              <span className="eyebrow">Accent</span>
              <input type="color" name="accent" defaultValue={brand.accent || "#888888"} className="input h-[42px] w-20 cursor-pointer p-1" />
            </label>
          </div>
        </section>

        <section className="card flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:p-6">
          <label className="flex flex-1 cursor-pointer items-start gap-3">
            <input type="checkbox" name="published" defaultChecked={brand.published} className="mt-1 h-4 w-4 accent-white" />
            <span>
              <span className="block font-medium">Published</span>
              <span className="text-sm text-muted">Creators can find your brand and pitch you. Needs a product photo.</span>
            </span>
          </label>
          <button className="btn btn-primary" disabled={pending}>
            {pending ? "Saving…" : "Save"}
          </button>
        </section>
        <FormMessage state={state} />
      </form>
    </div>
  );
}
