/** Shared by brands (one) and creators (several): it's what matching runs on. */
export const CATEGORIES = [
  "food & drink",
  "beauty",
  "fashion",
  "fitness",
  "tech",
  "gaming",
  "home & kitchen",
  "lifestyle",
  "travel",
  "finance",
  "parenting",
  "pets",
] as const;

export type Socials = { instagram?: string; tiktok?: string; youtube?: string; x?: string };

export type Brand = {
  id: string;
  slug: string;
  name: string;
  category: string;
  tagline: string;
  website: string;
  product_name: string;
  /** how the creator says it out loud in the VO */
  spoken_name: string;
  product_url: string;
  product_description: string;
  product_facts: string[];
  product_image_url: string;
  cutout_path: string;
  cutout_url: string | null;
  /** width / height of the cutout, used to size the composite */
  cutout_aspect: number;
  accent: string;
  /** objects that would compete with the composited product, kept out of generated scenes */
  scene_avoid: string;
  description: string;
  socials: Socials;
  /** only published brands show up for creators */
  published: boolean;
};

export type Creator = {
  id: string;
  name: string;
  niche: string;
  style_notes: string;
  channel_url: string | null;
  voice: string;
  aspect: "9:16" | "16:9";
  /** what brands match on, see CATEGORIES */
  categories: string[];
  created_at?: string;
};

export type PitchStatus = "generating" | "ready" | "sent" | "failed";

export type Pitch = {
  id: string;
  creator_id: string;
  brand_id: string;
  status: PitchStatus;
  selected_variant_id: string | null;
  message: string | null;
  /** the creator's asking rate for running this ad */
  rate_usd: number | null;
  /** set when the pitch answers a brand's request */
  request_id: string | null;
  created_at: string;
  sent_at: string | null;
};

export type RequestStatus = "open" | "accepted" | "declined";

/** A brand asking a creator for a spec ad pitch. */
export type PitchRequest = {
  id: string;
  brand_id: string;
  creator_id: string;
  brief: string;
  budget_usd: number | null;
  status: RequestStatus;
  created_at: string;
};

export type PitchRequestWithDetails = PitchRequest & { brand: Brand; creator: Creator };

// audio runs before motion so every shot is cut to the exact length of its voiceover line
export type Step = "script" | "visuals" | "audio" | "motion" | "mux";
export const STEPS: Step[] = ["script", "visuals", "audio", "motion", "mux"];

export type VariantStatus = "queued" | "running" | "done" | "failed";

export type Beat = {
  slot: "hook" | "product" | "benefit" | "cta";
  vo: string;
  visual: string;
  frame_url?: string;
  vo_url?: string;
  vo_sec?: number;
  clip_url?: string;
  clip_sec?: number;
};

export type VariantAssets = {
  angle?: string;
  beats?: Beat[];
  music_prompt?: string;
  music_url?: string;
  mix_url?: string;
  intro_thumb_url?: string;
  intro_clip_url?: string;
  concat_url?: string;
  overlay_url?: string;
  captioned_url?: string;
  cost_usd?: number;
  log?: string[];
};

export type Variant = {
  id: string;
  pitch_id: string;
  idx: number;
  angle: string;
  status: VariantStatus;
  step: Step | null;
  assets: VariantAssets;
  video_url: string | null;
  thumb_url: string | null;
  duration_sec: number | null;
  error: string | null;
  created_at: string;
  updated_at: string;
};

export type PitchWithDetails = Pitch & {
  brand: Brand;
  creator: Creator;
  request: PitchRequest | null;
  variants: Variant[];
};

export type Role = "creator" | "brand";

/** A Zerra profile. `id` is the Supabase Auth user id (auth.users.id). */
export type User = {
  id: string;
  email: string;
  role: Role;
  /** set for creators: the profile they generate pitches as */
  creator_id: string | null;
  /** set for brands: the seeded brand whose inbox they read */
  brand_id: string | null;
  created_at: string;
};
