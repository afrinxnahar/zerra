-- Zerra profiles. Identity lives in Supabase Auth (auth.users); this row says whether the
-- account is a creator (owns a creators row) or a brand (reads one brand's inbox).

create table if not exists users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null default '',
  role text not null check (role in ('creator', 'brand')),
  creator_id uuid references creators(id) on delete cascade,
  brand_id text references brands(id) on delete cascade,
  created_at timestamptz not null default now(),
  check ((role = 'creator') = (creator_id is not null)),
  check ((role = 'brand') = (brand_id is not null))
);
create index if not exists users_brand_idx on users (brand_id);

-- Only the server (service role) reads or writes profiles.
alter table users enable row level security;
