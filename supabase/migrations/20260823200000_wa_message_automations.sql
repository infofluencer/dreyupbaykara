-- Otomatik WhatsApp hatırlatmaları: kurallar, gönderim logu, opt-out.

create table if not exists public.message_rules (
  key text primary key,
  label text not null,
  enabled boolean not null default false,
  template_name text not null,
  language text not null default 'tr',
  -- Dakika cinsinden starts_at'ten geriye (0 = randevu günü / saat kuralı)
  offset_minutes integer not null default 0,
  -- Ameliyat günü gibi: Istanbul yerel saati (HH:MM). offset_minutes=0 iken kullanılır.
  send_at_local_time time null,
  appointment_types text[] not null default array[
    'consultation',
    'control',
    'online',
    'other'
  ],
  appointment_statuses text[] not null default array['scheduled', 'confirmed'],
  -- body {{1}} ad, {{2}} tarih, {{3}} saat — Meta şablonunda aynı sıra olmalı
  include_body_params boolean not null default true,
  sort_order integer not null default 0,
  updated_at timestamptz not null default now()
);

create trigger message_rules_updated_at
  before update on public.message_rules
  for each row execute function public.set_updated_at();

create table if not exists public.message_dispatches (
  id uuid primary key default gen_random_uuid(),
  appointment_id uuid not null references public.appointments (id) on delete cascade,
  rule_key text not null references public.message_rules (key) on delete cascade,
  contact_id uuid references public.contacts (id) on delete set null,
  phone text,
  template_name text not null,
  wa_message_id text,
  status text not null check (status in ('sent', 'failed', 'skipped')),
  error text,
  sent_at timestamptz not null default now(),
  unique (appointment_id, rule_key)
);

create index if not exists message_dispatches_sent_at_idx
  on public.message_dispatches (sent_at desc);

create index if not exists message_dispatches_rule_key_idx
  on public.message_dispatches (rule_key);

-- Opt-out / kara liste (DUR yazan veya manuel eklenen numaralar)
create table if not exists public.wa_message_opt_outs (
  phone text primary key,
  reason text,
  created_at timestamptz not null default now()
);

insert into public.message_rules (
  key,
  label,
  enabled,
  template_name,
  offset_minutes,
  send_at_local_time,
  appointment_types,
  sort_order
)
values
  (
    'appt_1d',
    'Randevu — 1 gün önce',
    false,
    'randevu_1_gun',
    1440,
    null,
    array['consultation', 'control', 'online', 'other'],
    10
  ),
  (
    'appt_1h',
    'Randevu — 1 saat önce',
    false,
    'randevu_1_saat',
    60,
    null,
    array['consultation', 'control', 'online', 'other'],
    20
  ),
  (
    'surgery_day',
    'Ameliyat günü (sabah 08:00)',
    false,
    'ameliyat_gunu',
    0,
    '08:00',
    array['procedure'],
    30
  )
on conflict (key) do nothing;

alter table public.message_rules enable row level security;
alter table public.message_dispatches enable row level security;
alter table public.wa_message_opt_outs enable row level security;

create policy "message_rules_staff_select"
  on public.message_rules for select to authenticated
  using (public.current_role() in ('admin', 'doctor', 'assistant', 'editor'));

create policy "message_rules_admin_update"
  on public.message_rules for update to authenticated
  using (public.current_role() = 'admin')
  with check (public.current_role() = 'admin');

create policy "message_dispatches_staff_select"
  on public.message_dispatches for select to authenticated
  using (public.current_role() in ('admin', 'doctor', 'assistant'));

create policy "wa_opt_outs_staff_select"
  on public.wa_message_opt_outs for select to authenticated
  using (public.current_role() in ('admin', 'doctor', 'assistant'));

create policy "wa_opt_outs_admin_all"
  on public.wa_message_opt_outs for all to authenticated
  using (public.current_role() = 'admin')
  with check (public.current_role() = 'admin');

comment on table public.message_rules is
  'WhatsApp otomatik hatırlatma kuralları. Meta’da template_name onaylı olmalı.';
comment on table public.message_dispatches is
  'Kural başına bir kez gönderim (idempotent).';
comment on table public.wa_message_opt_outs is
  'Otomatik mesaj istemeyen numaralar (normalize digits).';
