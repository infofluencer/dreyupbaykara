-- 3 şablon modeli:
-- 1) randevu_1_gun  2) randevu_1_saat  3) ameliyat_sonrasi_bilgi (gün 16:00)
-- calendar_day: randevu günü yerel saatte gönder (randevu başlangıcından sonra da olabilir)

alter table public.message_rules
  add column if not exists timing_mode text not null default 'before_start';

alter table public.message_rules
  drop constraint if exists message_rules_timing_mode_check;

alter table public.message_rules
  add constraint message_rules_timing_mode_check
  check (timing_mode in ('before_start', 'calendar_day'));

comment on column public.message_rules.timing_mode is
  'before_start = starts_at öncesi offset; calendar_day = aynı İstanbul günü send_at_local_time';

-- Ameliyat sabah hatırlatması → ameliyat sonrası bilgilendirme (16:00)
update public.message_rules
set
  label = 'Ameliyat sonrası bilgilendirme (16:00)',
  template_name = 'ameliyat_sonrasi_bilgi',
  offset_minutes = 0,
  send_at_local_time = '16:00',
  timing_mode = 'calendar_day',
  include_body_params = false,
  appointment_types = array['procedure']::text[],
  appointment_statuses = array['scheduled', 'confirmed', 'completed']::text[],
  lead_statuses = array['randevulu', 'bitti']::text[],
  sort_order = 30,
  updated_at = now()
where key = 'surgery_day';

-- Randevu hatırlatmaları: before_start + tipik lead/status
update public.message_rules
set
  timing_mode = 'before_start',
  appointment_statuses = coalesce(
    nullif(appointment_statuses, '{}'::text[]),
    array['scheduled', 'confirmed']::text[]
  ),
  lead_statuses = coalesce(
    nullif(lead_statuses, '{}'::text[]),
    array['randevulu']::text[]
  ),
  updated_at = now()
where key in ('appt_1d', 'appt_1h');
