import type { NextRequest } from "next/server";
import { db } from "@/lib/store";
import { getUser, unauthorized } from "@/lib/auth";

export async function GET(_req: NextRequest, ctx: RouteContext<"/api/pitches/[id]">) {
  const user = await getUser();
  if (!user) return unauthorized();
  const { id } = await ctx.params;
  const p = await db().getPitch(id);
  const mine = p && (p.creator_id === user.creator_id || (p.brand_id === user.brand_id && p.status === "sent"));
  return mine ? Response.json(p) : Response.json({ error: "not found" }, { status: 404 });
}
