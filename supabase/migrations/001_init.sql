-- Spec Ad Pitch schema: creators, brands, pitches (+ their 3 generated variants)

create extension if not exists pgcrypto;

create table if not exists brands (
  id text primary key,                 -- slug, e.g. 'olipop'
  slug text unique not null,
  name text not null,
  category text not null,
  tagline text not null default '',
  website text not null,
  product_name text not null,
  spoken_name text not null default '',
  product_url text not null,
  product_description text not null default '',
  product_facts jsonb not null default '[]',
  product_image_url text not null,     -- the brand's real product photo
  cutout_path text not null,           -- background removed copy shipped in /public/brands
  cutout_url text,                     -- same cutout hosted on Livepeer storage (used for compositing)
  cutout_aspect numeric not null default 0.7,
  accent text not null default '#888888',
  scene_avoid text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists creators (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  niche text not null default '',
  style_notes text not null default '',
  channel_url text,
  voice text not null default 'Tessa (en)',
  aspect text not null default '9:16' check (aspect in ('9:16', '16:9')),
  created_at timestamptz not null default now()
);

create table if not exists pitches (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid not null references creators(id) on delete cascade,
  brand_id text not null references brands(id) on delete cascade,
  status text not null default 'generating' check (status in ('generating', 'ready', 'sent', 'failed')),
  selected_variant_id uuid,
  message text,
  created_at timestamptz not null default now(),
  sent_at timestamptz
);
create index if not exists pitches_brand_idx on pitches (brand_id, status);
create index if not exists pitches_creator_idx on pitches (creator_id);

create table if not exists pitch_variants (
  id uuid primary key default gen_random_uuid(),
  pitch_id uuid not null references pitches(id) on delete cascade,
  idx int not null,
  angle text not null,
  status text not null default 'queued' check (status in ('queued', 'running', 'done', 'failed')),
  step text,                           -- script | visuals | audio | motion | mux
  assets jsonb not null default '{}',  -- script beats, frame/clip/audio urls, cost, log
  video_url text,
  thumb_url text,
  duration_sec numeric,
  error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (pitch_id, idx)
);

-- idempotent so it can be re-run safely if it was pasted into the SQL editor before
alter table pitches drop constraint if exists pitches_selected_variant_fk;
alter table pitches
  add constraint pitches_selected_variant_fk
  foreign key (selected_variant_id) references pitch_variants(id) on delete set null;

-- The app only talks to these tables from the server with the service role key.
alter table brands enable row level security;
alter table creators enable row level security;
alter table pitches enable row level security;
alter table pitch_variants enable row level security;
drop policy if exists "brands are public" on brands;
create policy "brands are public" on brands for select using (true);

-- Public bucket for finished ads
insert into storage.buckets (id, name, public)
values ('pitches', 'pitches', true)
on conflict (id) do nothing;
