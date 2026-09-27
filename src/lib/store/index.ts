import { hasSupabase } from "../env";
import type { Brand, Creator, Pitch, PitchRequest, PitchRequestWithDetails, PitchWithDetails, User, Variant } from "../types";
import { localStore } from "./local";
import { supabaseStore } from "./supabase";

export type NewPitch = {
  creator_id: string;
  brand_id: string;
  angles: string[];
  rate_usd?: number | null;
  message?: string | null;
  request_id?: string | null;
};

export interface Store {
  listBrands(filter?: { published?: boolean }): Promise<Brand[]>;
  getBrand(id: string): Promise<Brand | null>;
  /** a new, unpublished brand with the signup basics; the owner fills in the rest in brand settings */
  createBrand(input: Pick<Brand, "name" | "category" | "website" | "description">): Promise<Brand>;
  updateBrand(id: string, patch: Partial<Brand>): Promise<Brand>;
  getCreator(id: string): Promise<Creator | null>;
  listCreators(): Promise<Creator[]>;
  upsertCreator(c: Partial<Creator> & { name: string }): Promise<Creator>;
  createPitch(input: NewPitch): Promise<PitchWithDetails>;
  getPitch(id: string): Promise<PitchWithDetails | null>;
  listPitches(filter: { brand_id?: string; creator_id?: string; sent_only?: boolean }): Promise<PitchWithDetails[]>;
  updatePitch(id: string, patch: Partial<Pitch>): Promise<void>;
  getVariant(id: string): Promise<Variant | null>;
  updateVariant(id: string, patch: Partial<Variant>): Promise<Variant>;
  getUser(id: string): Promise<User | null>;
  /** throws "profile exists" if this auth user already has a profile */
  createUser(u: Omit<User, "created_at">): Promise<User>;
  createRequest(r: Pick<PitchRequest, "brand_id" | "creator_id" | "brief" | "budget_usd">): Promise<PitchRequest>;
  getRequest(id: string): Promise<PitchRequest | null>;
  listRequests(filter: { brand_id?: string; creator_id?: string }): Promise<PitchRequestWithDetails[]>;
  updateRequest(id: string, patch: Partial<PitchRequest>): Promise<void>;
}

let store: Store | null = null;
export function db(): Store {
  if (!store) store = hasSupabase() ? supabaseStore() : localStore();
  return store;
}

/** URL-safe, unique enough id for a self-serve brand: "glow-co-3f9a". */
export function brandSlug(name: string) {
  const base = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40) || "brand";
  return `${base}-${Math.random().toString(16).slice(2, 6)}`;
}
