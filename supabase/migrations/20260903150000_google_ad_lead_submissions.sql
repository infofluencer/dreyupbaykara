-- Google Ads Lead Form Extension gönderimleri (bireysel kayıt — CRM lead değil)

create table if not exists public.google_ad_lead_submissions (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.ad_accounts (id) on delete cascade,
  external_submission_id text not null,
  external_campaign_id text,
  campaign_id uuid references public.ad_campaigns (id) on delete set null,
  gclid text,
  submitted_at timestamptz not null,
  form_fields jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint google_ad_lead_submissions_account_external_unique
    unique (account_id, external_submission_id)
);

create index if not exists google_ad_lead_submissions_submitted_at_idx
  on public.google_ad_lead_submissions (submitted_at desc);

create index if not exists google_ad_lead_submissions_campaign_idx
  on public.google_ad_lead_submissions (campaign_id)
  where campaign_id is not null;

alter table public.google_ad_lead_submissions enable row level security;

create policy "google_ad_lead_submissions_staff_select"
  on public.google_ad_lead_submissions for select to authenticated
  using (public.current_role() in ('admin', 'doctor', 'assistant', 'agency'));

-- Dönüşüm aksiyon tanımları (Google hesabında ne sayılıyor?)
create table if not exists public.ad_conversion_actions (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.ad_accounts (id) on delete cascade,
  external_action_id text not null,
  name text not null,
  category text,
  action_type text,
  synced_at timestamptz not null default now(),
  constraint ad_conversion_actions_account_external_unique
    unique (account_id, external_action_id)
);

alter table public.ad_conversion_actions enable row level security;

create policy "ad_conversion_actions_staff_select"
  on public.ad_conversion_actions for select to authenticated
  using (public.current_role() in ('admin', 'doctor', 'assistant', 'agency'));
