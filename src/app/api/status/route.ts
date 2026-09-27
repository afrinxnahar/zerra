import { env, hasRedis, hasSupabase } from "@/lib/env";
import { spendStatus } from "@/lib/livepeer/client";

export async function GET() {
  let credits: string | null = null;
  if (env.livepeerMode === "real") {
    try {
      credits = await spendStatus();
    } catch (e) {
      credits = `unavailable: ${e instanceof Error ? e.message : e}`;
    }
  }
  return Response.json({
    mode: env.livepeerMode,
    store: hasSupabase() ? "supabase" : "local",
    queue: hasRedis() ? "bullmq" : "inline",
    keyed: Boolean(env.livepeerKey),
    credits,
  });
}
