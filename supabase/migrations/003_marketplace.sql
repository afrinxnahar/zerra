-- Self-serve brands, creator categories, and brand -> creator pitch requests.

-- Brands now sign up and fill in their own profile, so a new row starts mostly empty.
alter table brands alter column category set default '';
alter table brands alter column website set default '';
alter table brands alter column product_name set default '';
alter table brands alter column product_url set default '';
alter table brands alter column product_image_url set default '';
alter table brands alter column cutout_path set default '';
alter table brands add column if not exists description text not null default '';
alter table brands add column if not exists socials jsonb not null default '{}';
alter table brands add column if not exists published boolean not null default false;
-- the seeded demo brands are complete
update brands set published = true where cutout_url is not null;
create index if not exists brands_published_idx on brands (published);

alter table creators add column if not exists categories text[] not null default '{}';

create table if not exists pitch_requests (
  id uuid primary key default gen_random_uuid(),
  brand_id text not null references brands(id) on delete cascade,
  creator_id uuid not null references creators(id) on delete cascade,
  brief text not null default '',
  budget_usd numeric,
  status text not null default 'open' check (status in ('open', 'accepted', 'declined')),
  created_at timestamptz not null default now()
);
create index if not exists pitch_requests_brand_idx on pitch_requests (brand_id);
create index if not exists pitch_requests_creator_idx on pitch_requests (creator_id, status);
alter table pitch_requests enable row level security;

alter table pitches add column if not exists rate_usd numeric;
alter table pitches add column if not exists request_id uuid references pitch_requests(id) on delete set null;
