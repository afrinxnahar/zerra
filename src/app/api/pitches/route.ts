import type { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/lib/store";
import { getUser, unauthorized } from "@/lib/auth";
import { startPitch } from "@/lib/pitches";

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

/** Creator picks a brand in Discover -> a pitch with 3 takes. */
export async function POST(req: NextRequest) {
  const user = await getUser();
  if (!user?.creator_id) return unauthorized();
  const parsed = Body.safeParse(await req.json());
  if (!parsed.success) return Response.json({ error: parsed.error.message }, { status: 400 });
  try {
    return Response.json(await startPitch({ brand_id: parsed.data.brand_id, creator_id: user.creator_id }), { status: 201 });
  } catch (e) {
    return Response.json({ error: e instanceof Error ? e.message : String(e) }, { status: 404 });
  }
}
