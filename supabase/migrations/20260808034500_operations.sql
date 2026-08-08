-- Operational additions for calendar, WhatsApp inbox and rule-based bot.
-- Run after 20260808030000_cms.sql.

alter table public.tasks
  add column description text,
  add column reminder_sent_at timestamptz;

alter table public.appointments
  add column title text not null default 'Randevu',
  add column status text not null default 'scheduled'
    check (status in ('scheduled', 'confirmed', 'completed', 'cancelled')),
  add column reminder_sent_at timestamptz,
  add constraint appointments_time_order check (
    ends_at is null or ends_at > starts_at
  );

create index appointments_starts_at_idx
  on public.appointments (starts_at);

create index tasks_due_at_idx
  on public.tasks (due_at)
  where completed_at is null;

alter table public.messages
  add column automated boolean not null default false,
  add column raw_payload jsonb;

alter table public.conversations
  add column assigned_to uuid references public.profiles (id) on delete set null,
  add column updated_at timestamptz not null default now();

create trigger conversations_updated_at
  before update on public.conversations
  for each row execute function public.set_updated_at();

-- Public SVG uploads can carry active content when opened directly. Restrict
-- the public media bucket to raster image formats.
update storage.buckets
set allowed_mime_types = array[
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/avif',
  'image/gif'
]
where id = 'site-media';

create table public.bot_settings (
  id boolean primary key default true check (id),
  enabled boolean not null default false,
  timezone text not null default 'Europe/Istanbul',
  business_days smallint[] not null default array[1, 2, 3, 4, 5],
  business_start time not null default '09:00',
  business_end time not null default '18:00',
  welcome_message text not null default
    'Merhaba, mesajınız alındı. Size yardımcı olabilmemiz için kısaca talebinizi yazabilirsiniz.',
  after_hours_message text not null default
    'Merhaba, şu anda mesai saatleri dışındayız. Mesajınız kaydedildi; ekibimiz ilk fırsatta dönüş yapacaktır.',
  fallback_message text not null default
    'Mesajınız alındı. Tıbbi değerlendirme yapmadan önce asistanımız sizinle iletişime geçecektir.',
  updated_by uuid references public.profiles (id) on delete set null,
  updated_at timestamptz not null default now()
);

insert into public.bot_settings (id)
values (true)
on conflict (id) do nothing;

create trigger bot_settings_updated_at
  before update on public.bot_settings
  for each row execute function public.set_updated_at();

create table public.bot_faqs (
  id uuid primary key default gen_random_uuid(),
  question text not null,
  keywords text[] not null default '{}',
  answer text not null,
  enabled boolean not null default true,
  sort_order integer not null default 0,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger bot_faqs_updated_at
  before update on public.bot_faqs
  for each row execute function public.set_updated_at();

alter table public.bot_settings enable row level security;
alter table public.bot_faqs enable row level security;

create policy "bot_settings_staff_select"
  on public.bot_settings for select to authenticated
  using (public.current_role() in ('admin', 'doctor', 'assistant', 'editor'));

create policy "bot_settings_admin_update"
  on public.bot_settings for update to authenticated
  using (public.current_role() = 'admin')
  with check (public.current_role() = 'admin');

create policy "bot_faqs_staff_select"
  on public.bot_faqs for select to authenticated
  using (public.current_role() in ('admin', 'doctor', 'assistant', 'editor'));

create policy "bot_faqs_managers_insert"
  on public.bot_faqs for insert to authenticated
  with check (public.current_role() in ('admin', 'editor'));

create policy "bot_faqs_managers_update"
  on public.bot_faqs for update to authenticated
  using (public.current_role() in ('admin', 'editor'))
  with check (public.current_role() in ('admin', 'editor'));

create policy "bot_faqs_managers_delete"
  on public.bot_faqs for delete to authenticated
  using (public.current_role() in ('admin', 'editor'));

-- Agencies must not read patient/contact notes or form payloads. Provide a
-- source-only reporting view instead.
drop policy if exists "contacts_staff_all" on public.contacts;
create policy "contacts_clinical_staff_all"
  on public.contacts for all to authenticated
  using (public.current_role() in ('admin', 'doctor', 'assistant'))
  with check (public.current_role() in ('admin', 'doctor', 'assistant'));

drop policy if exists "leads_staff_all" on public.leads;
create policy "leads_clinical_staff_all"
  on public.leads for all to authenticated
  using (public.current_role() in ('admin', 'doctor', 'assistant'))
  with check (public.current_role() in ('admin', 'doctor', 'assistant'));

drop policy if exists "lead_sources_staff_select" on public.lead_sources;
create policy "lead_sources_clinical_staff_select"
  on public.lead_sources for select to authenticated
  using (public.current_role() in ('admin', 'doctor', 'assistant'));

create or replace view public.lead_source_report
with (security_invoker = false, security_barrier = true)
as
select
  id,
  lead_ref,
  site,
  page_path,
  channel,
  campaign,
  utm_source,
  utm_medium,
  utm_campaign,
  utm_content,
  utm_term,
  gclid,
  fbclid,
  matched_lead_id,
  matched_at,
  created_at
from public.lead_sources;

revoke all on public.lead_source_report from public, anon;
grant select on public.lead_source_report to authenticated;

