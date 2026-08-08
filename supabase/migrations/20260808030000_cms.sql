-- Site content management (CMS) and public media storage
-- Run after:
--   1) 20260807180000_crm_init.sql
--   2) 20260807181500_lead_sources.sql

create type public.content_status as enum ('draft', 'published', 'archived');
create type public.content_page_type as enum (
  'page',
  'home',
  'treatment',
  'blog',
  'experience'
);

-- One record per route/content entry.
create table public.content_pages (
  id uuid primary key default gen_random_uuid(),
  slug text not null,
  page_type public.content_page_type not null default 'page',
  title text not null,
  excerpt text,
  status public.content_status not null default 'draft',
  featured_image_path text,
  featured_image_alt text,
  seo_title text,
  seo_description text,
  canonical_url text,
  published_at timestamptz,
  created_by uuid references public.profiles (id) on delete set null,
  updated_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint content_pages_slug_format check (
    slug = '/'
    or slug ~ '^/[a-z0-9]+(?:-[a-z0-9]+)*(?:/[a-z0-9]+(?:-[a-z0-9]+)*)*$'
  ),
  constraint content_pages_slug_unique unique (slug)
);

create index content_pages_status_idx
  on public.content_pages (status, published_at desc);

create index content_pages_type_idx
  on public.content_pages (page_type, status);

-- Editable page blocks. content is structured JSON rendered by known components;
-- arbitrary executable HTML or scripts must not be accepted by the admin UI.
create table public.content_sections (
  id uuid primary key default gen_random_uuid(),
  page_id uuid not null references public.content_pages (id) on delete cascade,
  section_key text not null,
  section_type text not null,
  title text,
  content jsonb not null default '{}'::jsonb,
  sort_order integer not null default 0,
  is_visible boolean not null default true,
  created_by uuid references public.profiles (id) on delete set null,
  updated_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint content_sections_key_format check (
    section_key ~ '^[a-z0-9]+(?:_[a-z0-9]+)*$'
  ),
  constraint content_sections_page_key_unique unique (page_id, section_key)
);

create index content_sections_page_sort_idx
  on public.content_sections (page_id, sort_order);

-- Metadata for files stored in the site-media Supabase Storage bucket.
create table public.media_assets (
  id uuid primary key default gen_random_uuid(),
  bucket_id text not null default 'site-media',
  object_path text not null,
  file_name text not null,
  mime_type text not null,
  size_bytes bigint,
  width integer,
  height integer,
  alt_text text,
  caption text,
  uploaded_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  constraint media_assets_size_positive check (
    size_bytes is null or size_bytes >= 0
  ),
  constraint media_assets_dimensions_positive check (
    (width is null or width > 0)
    and (height is null or height > 0)
  ),
  constraint media_assets_object_unique unique (bucket_id, object_path)
);

create index media_assets_created_at_idx
  on public.media_assets (created_at desc);

-- Site-wide values such as phone, email, address and social links.
create table public.site_settings (
  setting_key text primary key,
  value jsonb not null,
  is_public boolean not null default true,
  updated_by uuid references public.profiles (id) on delete set null,
  updated_at timestamptz not null default now(),
  constraint site_settings_key_format check (
    setting_key ~ '^[a-z0-9]+(?:[._-][a-z0-9]+)*$'
  )
);

-- Immutable snapshots created automatically before content changes.
create table public.content_revisions (
  id bigint generated always as identity primary key,
  page_id uuid not null references public.content_pages (id) on delete cascade,
  section_id uuid references public.content_sections (id) on delete set null,
  entity_type text not null check (entity_type in ('page', 'section')),
  snapshot jsonb not null,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

create index content_revisions_page_created_idx
  on public.content_revisions (page_id, created_at desc);

-- Reuse the updated_at helper created by the CRM migration.
create trigger content_pages_updated_at
  before update on public.content_pages
  for each row execute function public.set_updated_at();

create trigger content_sections_updated_at
  before update on public.content_sections
  for each row execute function public.set_updated_at();

create trigger site_settings_updated_at
  before update on public.site_settings
  for each row execute function public.set_updated_at();

create or replace function public.save_content_revision()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_table_name = 'content_pages' then
    insert into public.content_revisions (
      page_id,
      section_id,
      entity_type,
      snapshot,
      created_by
    )
    values (
      old.id,
      null,
      'page',
      to_jsonb(old),
      auth.uid()
    );
  elsif tg_table_name = 'content_sections' then
    insert into public.content_revisions (
      page_id,
      section_id,
      entity_type,
      snapshot,
      created_by
    )
    values (
      old.page_id,
      old.id,
      'section',
      to_jsonb(old),
      auth.uid()
    );
  end if;

  return new;
end;
$$;

create trigger content_pages_revision
  before update on public.content_pages
  for each row execute function public.save_content_revision();

create trigger content_sections_revision
  before update on public.content_sections
  for each row execute function public.save_content_revision();

-- Public media bucket. Files are readable by the website, but only content
-- managers may upload, update or delete objects.
insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'site-media',
  'site-media',
  true,
  10485760,
  array[
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/avif',
    'image/gif'
  ]
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- RLS
alter table public.content_pages enable row level security;
alter table public.content_sections enable row level security;
alter table public.media_assets enable row level security;
alter table public.site_settings enable row level security;
alter table public.content_revisions enable row level security;

create policy "content_pages_public_or_staff_select"
  on public.content_pages for select
  using (
    status = 'published'
    or public.current_role() in ('admin', 'editor', 'agency')
  );

create policy "content_pages_managers_insert"
  on public.content_pages for insert to authenticated
  with check (public.current_role() in ('admin', 'editor', 'agency'));

create policy "content_pages_managers_update"
  on public.content_pages for update to authenticated
  using (public.current_role() in ('admin', 'editor', 'agency'))
  with check (public.current_role() in ('admin', 'editor', 'agency'));

create policy "content_pages_admin_delete"
  on public.content_pages for delete to authenticated
  using (public.current_role() = 'admin');

create policy "content_sections_public_or_staff_select"
  on public.content_sections for select
  using (
    (
      is_visible
      and exists (
        select 1
        from public.content_pages
        where content_pages.id = content_sections.page_id
          and content_pages.status = 'published'
      )
    )
    or public.current_role() in ('admin', 'editor', 'agency')
  );

create policy "content_sections_managers_insert"
  on public.content_sections for insert to authenticated
  with check (public.current_role() in ('admin', 'editor', 'agency'));

create policy "content_sections_managers_update"
  on public.content_sections for update to authenticated
  using (public.current_role() in ('admin', 'editor', 'agency'))
  with check (public.current_role() in ('admin', 'editor', 'agency'));

create policy "content_sections_managers_delete"
  on public.content_sections for delete to authenticated
  using (public.current_role() in ('admin', 'editor'));

create policy "media_assets_public_select"
  on public.media_assets for select
  using (true);

create policy "media_assets_managers_insert"
  on public.media_assets for insert to authenticated
  with check (public.current_role() in ('admin', 'editor', 'agency'));

create policy "media_assets_managers_update"
  on public.media_assets for update to authenticated
  using (public.current_role() in ('admin', 'editor', 'agency'))
  with check (public.current_role() in ('admin', 'editor', 'agency'));

create policy "media_assets_managers_delete"
  on public.media_assets for delete to authenticated
  using (public.current_role() in ('admin', 'editor'));

create policy "site_settings_public_or_staff_select"
  on public.site_settings for select
  using (
    is_public
    or public.current_role() in ('admin', 'editor', 'agency')
  );

create policy "site_settings_managers_insert"
  on public.site_settings for insert to authenticated
  with check (public.current_role() in ('admin', 'editor'));

create policy "site_settings_managers_update"
  on public.site_settings for update to authenticated
  using (public.current_role() in ('admin', 'editor'))
  with check (public.current_role() in ('admin', 'editor'));

create policy "site_settings_admin_delete"
  on public.site_settings for delete to authenticated
  using (public.current_role() = 'admin');

create policy "content_revisions_managers_select"
  on public.content_revisions for select to authenticated
  using (public.current_role() in ('admin', 'editor', 'agency'));

create policy "site_media_public_select"
  on storage.objects for select
  using (bucket_id = 'site-media');

create policy "site_media_managers_insert"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'site-media'
    and public.current_role() in ('admin', 'editor', 'agency')
  );

create policy "site_media_managers_update"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'site-media'
    and public.current_role() in ('admin', 'editor', 'agency')
  )
  with check (
    bucket_id = 'site-media'
    and public.current_role() in ('admin', 'editor', 'agency')
  );

create policy "site_media_managers_delete"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'site-media'
    and public.current_role() in ('admin', 'editor')
  );

-- Initial global values; editable later from /admin/content/settings.
insert into public.site_settings (setting_key, value, is_public)
values
  ('contact.phone', '"05307837224"'::jsonb, true),
  ('contact.email', '"info@endospineistanbul.com"'::jsonb, true),
  (
    'contact.clinic',
    '{"name":"Özel Silivri Anadolu Hastanesi","city":"Silivri / İstanbul"}'::jsonb,
    true
  )
on conflict (setting_key) do nothing;
