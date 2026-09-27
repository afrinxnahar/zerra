import "../worker/load-env";
import fs from "node:fs";
import path from "node:path";
import brands from "../src/data/brands.json";
import demo from "../supabase/seed/demo.json";
import { supabase, uploadVideo } from "../src/lib/store/supabase";
import { env, hasSupabase } from "../src/lib/env";

/**
 * Pushes all dummy data to the Supabase project in keys.env (run the migrations first):
 * brands, the demo creator, its pitches + generated takes (videos go to Storage), and demo logins.
 * Safe to re-run: everything is upserted by id.
 */
const SEED_DIR = path.join(process.cwd(), "supabase", "seed");

function must<R extends { data: unknown; error: { message: string } | null }>(res: R, what: string): R["data"] {
  if (res.error) throw new Error(`${what}: ${res.error.message}`);
  return res.data;
}

async function main() {
  if (!hasSupabase()) throw new Error("Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in keys.env first.");
  const sb = supabase();
  console.log(`Seeding ${env.supabaseUrl}`);

  must(await sb.from("brands").upsert(brands.map((b) => ({ id: b.slug, ...b }))), "brands");
  console.log(`✓ ${brands.length} brands`);

  if ((await sb.storage.getBucket(env.supabaseBucket)).error) {
    must(await sb.storage.createBucket(env.supabaseBucket, { public: true }), "bucket");
  }

  must(await sb.from("creators").upsert(demo.creators), "creators");
  console.log(`✓ ${demo.creators.length} creator`);

  const variants = [];
  for (const v of demo.variants) {
    let video_url = v.video_url;
    if (video_url?.startsWith("videos/")) {
      video_url = await uploadVideo(v.id, fs.readFileSync(path.join(SEED_DIR, video_url)));
      process.stdout.write(".");
    }
    variants.push({ ...v, video_url });
  }
  // pitches <-> variants reference each other: insert pitches without their pick, then variants, then the pick
  must(await sb.from("pitches").upsert(demo.pitches.map((p) => ({ ...p, selected_variant_id: null }))), "pitches");
  must(await sb.from("pitch_variants").upsert(variants), "variants");
  for (const p of demo.pitches.filter((p) => p.selected_variant_id)) {
    must(await sb.from("pitches").update({ selected_variant_id: p.selected_variant_id }).eq("id", p.id), "pitch pick");
  }
  console.log(`\n✓ ${demo.pitches.length} pitches, ${variants.length} takes (videos in Storage bucket "${env.supabaseBucket}")`);

  const password = process.env.DEMO_PASSWORD;
  if (!password) {
    console.log("• DEMO_PASSWORD not set: skipped demo logins");
    return;
  }
  // ponytail: one page of 1000 auth users is plenty for a demo project
  const existing = must(await sb.auth.admin.listUsers({ perPage: 1000 }), "list users").users;
  for (const a of demo.accounts) {
    let id = existing.find((u) => u.email === a.email)?.id;
    if (id) {
      must(await sb.auth.admin.updateUserById(id, { password }), `update ${a.email}`);
    } else {
      id = must(await sb.auth.admin.createUser({ email: a.email, password, email_confirm: true }), `create ${a.email}`).user!.id;
    }
    const profile = { id, email: a.email, role: a.role, creator_id: a.creator_id ?? null, brand_id: a.brand_id ?? null };
    must(await sb.from("users").upsert(profile), `profile ${a.email}`);
  }
  console.log(`✓ ${demo.accounts.length} demo logins (password = DEMO_PASSWORD):`);
  demo.accounts.forEach((a) => console.log(`   ${a.role.padEnd(8)} ${a.email}`));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
