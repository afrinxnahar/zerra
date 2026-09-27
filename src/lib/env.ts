// All secrets live in keys.env (loaded by next.config.ts and the worker) and
// are only ever read on the server.
export const env = {
  livepeerUrl: process.env.LIVEPEER_MCP_URL || "https://agent.livepeer.org/api/mcp",
  livepeerKey: process.env.LIVEPEER_AGENT_KEY || "",
  // "mock" returns canned assets instantly (no credits spent), "real" calls Livepeer Agent.
  livepeerMode: (process.env.LIVEPEER_MODE || "mock") as "mock" | "real",
  supabaseUrl: process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  supabaseServiceKey: process.env.SUPABASE_SERVICE_ROLE_KEY || "",
  // publishable (sb_publishable_...) or legacy anon key, used for Supabase Auth
  supabasePublishableKey: process.env.SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY || "",
  // OAuth providers enabled in the Supabase dashboard, e.g. "google,github"
  authProviders: (process.env.AUTH_PROVIDERS || "").split(",").map((s) => s.trim()).filter(Boolean),
  supabaseBucket: process.env.SUPABASE_BUCKET || "pitches",
  redisUrl: process.env.REDIS_URL || "",
  publicBaseUrl: process.env.PUBLIC_BASE_URL || "",
  variantsPerPitch: Number(process.env.VARIANTS_PER_PITCH || 3),
};

export const hasSupabase = () => Boolean(env.supabaseUrl && env.supabaseServiceKey);
export const hasSupabaseAuth = () => Boolean(env.supabaseUrl && env.supabasePublishableKey);
export const hasRedis = () => Boolean(env.redisUrl);
