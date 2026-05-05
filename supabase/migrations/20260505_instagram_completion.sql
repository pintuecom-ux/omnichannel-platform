alter table public.contacts
  add column if not exists instagram_scoped_id text,
  add column if not exists facebook_scoped_id text;

update public.contacts c
set
  instagram_scoped_id = coalesce(c.instagram_scoped_id, c.facebook_id),
  facebook_scoped_id = coalesce(c.facebook_scoped_id, c.facebook_id)
where c.facebook_id is not null
  and exists (
    select 1
    from public.conversations conv
    where conv.contact_id = c.id
      and conv.platform = 'instagram'
  );

create table if not exists public.scheduled_publications (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  channel_id uuid not null references public.channels(id) on delete cascade,
  platform text not null default 'instagram',
  status text not null default 'draft',
  caption text,
  media_payload jsonb not null default '[]'::jsonb,
  publish_at timestamptz,
  published_at timestamptz,
  timezone text,
  retry_count integer not null default 0,
  last_error text,
  idempotency_key text,
  meta jsonb not null default '{}'::jsonb,
  resulting_media_id text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists scheduled_publications_workspace_idx
  on public.scheduled_publications (workspace_id, status, publish_at);

create table if not exists public.instagram_media (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  channel_id uuid not null references public.channels(id) on delete cascade,
  publication_id uuid references public.scheduled_publications(id) on delete set null,
  instagram_media_id text not null,
  caption text,
  media_type text not null,
  media_product_type text,
  permalink text,
  thumbnail_url text,
  media_url text,
  timestamp timestamptz,
  comment_count integer not null default 0,
  like_count integer not null default 0,
  metrics jsonb not null default '{}'::jsonb,
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (channel_id, instagram_media_id)
);

create index if not exists instagram_media_workspace_idx
  on public.instagram_media (workspace_id, timestamp desc);

create table if not exists public.instagram_analytics_snapshots (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  channel_id uuid not null references public.channels(id) on delete cascade,
  snapshot_at timestamptz not null default now(),
  range_start timestamptz,
  range_end timestamptz,
  account_metrics jsonb not null default '{}'::jsonb,
  content_metrics jsonb not null default '[]'::jsonb,
  operational_metrics jsonb not null default '{}'::jsonb,
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists instagram_analytics_snapshots_workspace_idx
  on public.instagram_analytics_snapshots (workspace_id, snapshot_at desc);
