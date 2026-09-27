import type { NextRequest } from "next/server";
import { db } from "@/lib/store";
import { getUser, unauthorized } from "@/lib/auth";
import { enqueue } from "@/lib/queue";
import type { Step } from "@/lib/types";

/** Re-run a failed variant from the step that failed (earlier assets are kept). */
export async function POST(_req: NextRequest, ctx: RouteContext<"/api/variants/[id]/retry">) {
  const user = await getUser();
  if (!user?.creator_id) return unauthorized();
  const { id } = await ctx.params;
  const v = await db().getVariant(id);
  const owner = v && (await db().getPitch(v.pitch_id))?.creator_id;
  if (!v || owner !== user.creator_id) return Response.json({ error: "not found" }, { status: 404 });
  if (v.status !== "failed") return Response.json({ error: "only failed variants can be retried" }, { status: 400 });
  const step: Step = v.step || "script";
  await db().updateVariant(id, { status: "queued", error: null, step });
  await db().updatePitch(v.pitch_id, { status: "generating" });
  await enqueue(id, step);
  return Response.json({ ok: true, step });
}
