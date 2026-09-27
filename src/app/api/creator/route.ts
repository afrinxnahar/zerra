import type { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/lib/store";
import { getUser, unauthorized } from "@/lib/auth";
import { VOICES } from "@/lib/pipeline/templates";

const Body = z.object({
  name: z.string().min(1).max(80),
  niche: z.string().max(200),
  style_notes: z.string().max(600),
  channel_url: z.string().max(300).nullable().optional(),
  voice: z.enum(VOICES),
  aspect: z.enum(["9:16", "16:9"]),
});

/** Save the signed-in creator's profile. */
export async function POST(req: NextRequest) {
  const user = await getUser();
  if (!user?.creator_id) return unauthorized();
  const parsed = Body.safeParse(await req.json());
  if (!parsed.success) return Response.json({ error: parsed.error.message }, { status: 400 });
  const c = parsed.data;
  return Response.json(
    await db().upsertCreator({ ...c, id: user.creator_id, channel_url: c.channel_url?.trim() || null }),
  );
}
