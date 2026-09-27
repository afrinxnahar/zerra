import type { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/lib/store";
import { getUser, unauthorized } from "@/lib/auth";

const Body = z.object({ variant_id: z.string().min(1), message: z.string().max(500).optional() });

/** Creator picked the best variant: the pitch lands in the brand's inbox. */
export async function POST(req: NextRequest, ctx: RouteContext<"/api/pitches/[id]/send">) {
  const user = await getUser();
  if (!user?.creator_id) return unauthorized();
  const { id } = await ctx.params;
  const parsed = Body.safeParse(await req.json());
  if (!parsed.success) return Response.json({ error: parsed.error.message }, { status: 400 });
  const p = await db().getPitch(id);
  if (!p || p.creator_id !== user.creator_id) return Response.json({ error: "not found" }, { status: 404 });
  const v = p.variants.find((x) => x.id === parsed.data.variant_id);
  if (!v || v.status !== "done") return Response.json({ error: "that variant isn't ready" }, { status: 400 });
  await db().updatePitch(id, {
    status: "sent",
    selected_variant_id: v.id,
    message: parsed.data.message?.trim() || null,
    sent_at: new Date().toISOString(),
  });
  return Response.json(await db().getPitch(id));
}
