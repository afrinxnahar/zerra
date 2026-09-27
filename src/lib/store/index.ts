import { hasSupabase } from "../env";
import type { Brand, Creator, Pitch, PitchWithDetails, User, Variant } from "../types";
import { localStore } from "./local";
import { supabaseStore } from "./supabase";

export interface Store {
  listBrands(): Promise<Brand[]>;
  getBrand(id: string): Promise<Brand | null>;
  getCreator(id: string): Promise<Creator | null>;
  listCreators(): Promise<Creator[]>;
  upsertCreator(c: Partial<Creator> & { name: string }): Promise<Creator>;
  createPitch(input: { creator_id: string; brand_id: string; angles: string[] }): Promise<PitchWithDetails>;
  getPitch(id: string): Promise<PitchWithDetails | null>;
  listPitches(filter: { brand_id?: string; creator_id?: string; sent_only?: boolean }): Promise<PitchWithDetails[]>;
  updatePitch(id: string, patch: Partial<Pitch>): Promise<void>;
  getVariant(id: string): Promise<Variant | null>;
  updateVariant(id: string, patch: Partial<Variant>): Promise<Variant>;
  getUser(id: string): Promise<User | null>;
  /** throws "profile exists" if this auth user already has a profile */
  createUser(u: Omit<User, "created_at">): Promise<User>;
}

let store: Store | null = null;
export function db(): Store {
  if (!store) store = hasSupabase() ? supabaseStore() : localStore();
  return store;
}
