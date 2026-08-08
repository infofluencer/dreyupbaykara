-- Pending click attribution before WhatsApp first message

create table if not exists public.lead_sources (
  id uuid primary key default gen_random_uuid(),
  lead_ref text not null,
  site text,
  page_path text,
  channel text default 'website',
  campaign text,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  utm_content text,
  utm_term text,
  gclid text,
  fbclid text,
  landing_url text,
  user_agent text,
  form_payload jsonb,
  matched_lead_id uuid references public.leads (id) on delete set null,
  matched_at timestamptz,
  created_at timestamptz not null default now(),
  constraint lead_sources_lead_ref_unique unique (lead_ref)
);

create index if not exists lead_sources_created_at_idx
  on public.lead_sources (created_at desc);

create index if not exists lead_sources_unmatched_idx
  on public.lead_sources (matched_lead_id)
  where matched_lead_id is null;

alter table public.lead_sources enable row level security;

create policy "lead_sources_staff_select"
  on public.lead_sources for select to authenticated
  using (public.current_role() in ('admin', 'doctor', 'assistant', 'agency'));

-- Inserts only via service role (tracking redirect)
