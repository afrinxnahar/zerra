import { env } from "./env";
import { enqueue } from "./queue";
import { ANGLES } from "./pipeline/templates";
import { db, type NewPitch } from "./store";

/** One pitch with N variants, each running the full generation chain. Brand must be published. */
export async function startPitch(input: Omit<NewPitch, "angles">) {
  const [brand, creator] = await Promise.all([db().getBrand(input.brand_id), db().getCreator(input.creator_id)]);
  if (!brand?.published || !creator) throw new Error("unknown brand or creator");
  const angles = ANGLES.slice(0, Math.max(1, Math.min(3, env.variantsPerPitch))).map((a) => a.key);
  const pitch = await db().createPitch({ ...input, angles });
  await Promise.all(pitch.variants.map((v) => enqueue(v.id, "script")));
  return pitch;
}
