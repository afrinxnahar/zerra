import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { env } from "../env";
import type { Brand, Creator, PitchRequest, PitchRequestWithDetails, PitchWithDetails, User, Variant } from "../types";
import { brandSlug, type Store } from "./index";

let sb: SupabaseClient | null = null;
export function supabase() {
  if (!sb) sb = createClient(env.supabaseUrl, env.supabaseServiceKey, { auth: { persistSession: false } });
  return sb;
}

// pitches <-> pitch_variants have two FKs (pitch_id, selected_variant_id): name the one to embed through
const PITCH_SELECT =
  "*, brand:brands(*), creator:creators(*), request:pitch_requests(*), variants:pitch_variants!pitch_variants_pitch_id_fkey(*)";
const REQUEST_SELECT = "*, brand:brands(*), creator:creators(*)";

function must<T>(res: { data: T | null; error: { message: string } | null }): T {
  if (res.error) throw new Error(res.error.message);
  return res.data as T;
}
function sortVariants(p: PitchWithDetails) {
  p.variants = (p.variants || []).sort((a, b) => a.idx - b.idx);
  return p;
}

export function supabaseStore(): Store {
  const s = () => supabase();
  return {
    async listBrands(filter) {
      let q = s().from("brands").select("*");
      if (filter?.published) q = q.eq("published", true);
      return must(await q.order("name")) as Brand[];
    },
    async getBrand(id) {
      return (must(await s().from("brands").select("*").eq("id", id).maybeSingle()) as Brand | null) || null;
    },
    async createBrand(basics) {
      const slug = brandSlug(basics.name);
      return must(await s().from("brands").insert({ id: slug, slug, ...basics }).select("*").single()) as Brand;
    },
    async updateBrand(id, patch) {
      const rest = { ...patch }; // the id is the slug, it never changes
      delete rest.id;
      delete rest.slug;
      return must(await s().from("brands").update(rest).eq("id", id).select("*").single()) as Brand;
    },
    async getCreator(id) {
      return (must(await s().from("creators").select("*").eq("id", id).maybeSingle()) as Creator | null) || null;
    },
    async listCreators() {
      return must(await s().from("creators").select("*").order("created_at")) as Creator[];
    },
    async upsertCreator(c) {
      const row = must(await s().from("creators").upsert(c).select("*").single());
      return row as unknown as Creator;
    },
    async createPitch({ creator_id, brand_id, angles, rate_usd = null, message = null, request_id = null }) {
      const pitch = must(
        await s()
          .from("pitches")
          .insert({ creator_id, brand_id, status: "generating", rate_usd, message, request_id })
          .select("id")
          .single(),
      ) as { id: string };
      must(
        await s()
          .from("pitch_variants")
          .insert(angles.map((angle, idx) => ({ pitch_id: pitch.id, idx, angle, status: "queued", assets: {} })))
          .select("id"),
      );
      return (await this.getPitch(pitch.id))!;
    },
    async getPitch(id) {
      const p = must(await s().from("pitches").select(PITCH_SELECT).eq("id", id).maybeSingle());
      return p ? sortVariants(p as PitchWithDetails) : null;
    },
    async listPitches({ brand_id, creator_id, sent_only }) {
      let q = s().from("pitches").select(PITCH_SELECT);
      if (brand_id) q = q.eq("brand_id", brand_id);
      if (creator_id) q = q.eq("creator_id", creator_id);
      if (sent_only) q = q.eq("status", "sent");
      const rows = must(await q.order("created_at", { ascending: false })) as PitchWithDetails[];
      return rows.map(sortVariants);
    },
    async updatePitch(id, patch) {
      must(await s().from("pitches").update(patch).eq("id", id).select("id"));
    },
    async getVariant(id) {
      return (must(await s().from("pitch_variants").select("*").eq("id", id).maybeSingle()) as Variant | null) || null;
    },
    async updateVariant(id, patch) {
      const row = must(
        await s()
          .from("pitch_variants")
          .update({ ...patch, updated_at: new Date().toISOString() })
          .eq("id", id)
          .select("*")
          .single(),
      );
      return row as unknown as Variant;
    },
    async getUser(id) {
      return (must(await s().from("users").select("*").eq("id", id).maybeSingle()) as User | null) || null;
    },
    async createUser(u) {
      const res = await s().from("users").insert(u).select("*").single();
      if (res.error?.code === "23505") throw new Error("profile exists"); // unique_violation
      return must(res) as User;
    },
    async createRequest(r) {
      return must(await s().from("pitch_requests").insert(r).select("*").single()) as PitchRequest;
    },
    async getRequest(id) {
      return (must(await s().from("pitch_requests").select("*").eq("id", id).maybeSingle()) as PitchRequest | null) || null;
    },
    async listRequests({ brand_id, creator_id }) {
      let q = s().from("pitch_requests").select(REQUEST_SELECT);
      if (brand_id) q = q.eq("brand_id", brand_id);
      if (creator_id) q = q.eq("creator_id", creator_id);
      return must(await q.order("created_at", { ascending: false })) as PitchRequestWithDetails[];
    },
    async updateRequest(id, patch) {
      must(await s().from("pitch_requests").update(patch).eq("id", id).select("id"));
    },
  };
}

/** Copy the finished mp4 into Supabase Storage so the pitch never depends on a third party URL. */
export async function persistVideo(variantId: string, url: string): Promise<string> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`download ${res.status}`);
  return uploadVideo(variantId, Buffer.from(await res.arrayBuffer()));
}

/** Upload an mp4 to the public pitches bucket, returns its public URL. */
export async function uploadVideo(variantId: string, buf: Buffer): Promise<string> {
  const key = `${variantId}.mp4`;
  const up = await supabase().storage.from(env.supabaseBucket).upload(key, buf, {
    contentType: "video/mp4",
    upsert: true,
  });
  if (up.error) throw new Error(up.error.message);
  return supabase().storage.from(env.supabaseBucket).getPublicUrl(key).data.publicUrl;
}
