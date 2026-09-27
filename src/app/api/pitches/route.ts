import type { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/lib/store";
import { enqueue } from "@/lib/queue";
import { env } from "@/lib/env";
import { getUser, unauthorized } from "@/lib/auth";
import { ANGLES } from "@/lib/pipeline/templates";

/** Creators see their own pitches, brands see what was sent to them. */
export async function GET() {
  const user = await getUser();
  if (!user) return unauthorized();
  const pitches = await db().listPitches(
    user.role === "creator"
      ? { creator_id: user.creator_id! }
      : { brand_id: user.brand_id!, sent_only: true },
  );
  return Response.json(pitches);
}

const Body = z.object({ brand_id: z.string().min(1) });

/** Creator picks a brand -> one pitch with N variants, each running the full generation chain. */
export async function POST(req: NextRequest) {
  const user = await getUser();
  if (!user?.creator_id) return unauthorized();
  const parsed = Body.safeParse(await req.json());
  if (!parsed.success) return Response.json({ error: parsed.error.message }, { status: 400 });
  const { brand_id } = parsed.data;
  const creator_id = user.creator_id;
  const [brand, creator] = await Promise.all([db().getBrand(brand_id), db().getCreator(creator_id)]);
  if (!brand || !creator) return Response.json({ error: "unknown brand or creator" }, { status: 404 });

  const angles = ANGLES.slice(0, Math.max(1, Math.min(3, env.variantsPerPitch))).map((a) => a.key);
  const pitch = await db().createPitch({ brand_id, creator_id, angles });
  await Promise.all(pitch.variants.map((v) => enqueue(v.id, "script")));
  return Response.json(pitch, { status: 201 });
}
