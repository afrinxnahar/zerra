import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import seedBrands from "../../data/brands.json";
import type { Brand, Creator, Pitch, PitchWithDetails, User, Variant } from "../types";
import type { Store } from "./index";

/**
 * Zero-setup JSON file store used when Supabase isn't configured.
 * Good for local dev in inline queue mode (single process). Use Supabase
 * for anything shared or when running the separate BullMQ worker.
 */

type DB = { users: User[]; creators: Creator[]; pitches: Pitch[]; variants: Variant[] };
const FILE = path.join(process.cwd(), ".data", "db.json");

const brands: Brand[] = (seedBrands as Omit<Brand, "id">[]).map((b) => ({ ...b, id: b.slug }));

function read(): DB {
  try {
    // users was added after the first db.json files were written
    return { users: [], ...JSON.parse(fs.readFileSync(FILE, "utf8")) };
  } catch {
    return { users: [], creators: [], pitches: [], variants: [] };
  }
}
function write(d: DB) {
  fs.mkdirSync(path.dirname(FILE), { recursive: true });
  const tmp = FILE + "." + process.pid + ".tmp";
  fs.writeFileSync(tmp, JSON.stringify(d, null, 1));
  fs.renameSync(tmp, FILE);
}
// serialize writes within this process
let chain: Promise<unknown> = Promise.resolve();
function mutate<T>(fn: (d: DB) => T): Promise<T> {
  const next = chain.then(() => {
    const d = read();
    const out = fn(d);
    write(d);
    return out;
  });
  chain = next.catch(() => undefined);
  return next;
}

const now = () => new Date().toISOString();

function details(d: DB, p: Pitch): PitchWithDetails {
  return {
    ...p,
    brand: brands.find((b) => b.id === p.brand_id)!,
    creator: d.creators.find((c) => c.id === p.creator_id)!,
    variants: d.variants.filter((v) => v.pitch_id === p.id).sort((a, b) => a.idx - b.idx),
  };
}

export function localStore(): Store {
  return {
    async listBrands() {
      return brands;
    },
    async getBrand(id) {
      return brands.find((b) => b.id === id) || null;
    },
    async getCreator(id) {
      return read().creators.find((c) => c.id === id) || null;
    },
    async listCreators() {
      return read().creators;
    },
    async upsertCreator(c) {
      return mutate((d) => {
        const existing = c.id ? d.creators.find((x) => x.id === c.id) : undefined;
        if (existing) {
          Object.assign(existing, c);
          return existing;
        }
        const created: Creator = {
          id: crypto.randomUUID(),
          niche: "",
          style_notes: "",
          channel_url: null,
          voice: "Tessa (en)",
          aspect: "9:16",
          created_at: now(),
          ...c,
        } as Creator;
        d.creators.push(created);
        return created;
      });
    },
    async createPitch({ creator_id, brand_id, angles }) {
      return mutate((d) => {
        const p: Pitch = {
          id: crypto.randomUUID(),
          creator_id,
          brand_id,
          status: "generating",
          selected_variant_id: null,
          message: null,
          created_at: now(),
          sent_at: null,
        };
        d.pitches.push(p);
        angles.forEach((angle, idx) =>
          d.variants.push({
            id: crypto.randomUUID(),
            pitch_id: p.id,
            idx,
            angle,
            status: "queued",
            step: null,
            assets: {},
            video_url: null,
            thumb_url: null,
            duration_sec: null,
            error: null,
            created_at: now(),
            updated_at: now(),
          }),
        );
        return details(d, p);
      });
    },
    async getPitch(id) {
      const d = read();
      const p = d.pitches.find((x) => x.id === id);
      return p ? details(d, p) : null;
    },
    async listPitches({ brand_id, creator_id, sent_only }) {
      const d = read();
      return d.pitches
        .filter((p) => (!brand_id || p.brand_id === brand_id) && (!creator_id || p.creator_id === creator_id))
        .filter((p) => !sent_only || p.status === "sent")
        .sort((a, b) => (b.sent_at || b.created_at).localeCompare(a.sent_at || a.created_at))
        .map((p) => details(d, p));
    },
    async updatePitch(id, patch) {
      await mutate((d) => {
        const p = d.pitches.find((x) => x.id === id);
        if (p) Object.assign(p, patch);
      });
    },
    async getVariant(id) {
      return read().variants.find((v) => v.id === id) || null;
    },
    async updateVariant(id, patch) {
      return mutate((d) => {
        const v = d.variants.find((x) => x.id === id);
        if (!v) throw new Error("variant not found");
        Object.assign(v, patch, { updated_at: now() });
        return v;
      });
    },
    async getUser(id) {
      return read().users.find((u) => u.id === id) || null;
    },
    async createUser(u) {
      return mutate((d) => {
        if (d.users.some((x) => x.id === u.id)) throw new Error("profile exists");
        const created: User = { ...u, created_at: now() };
        d.users.push(created);
        return created;
      });
    },
  };
}
