-- Ameliyat öncesi hatırlatma: Durum Panosu'nda "ameliyat_olacak" + procedure
-- randevusuna 48 saat kala teyit mesajı. Meta şablon adı Dualhook'ta
-- "ameliyat_2_gun" olarak oluşturulmalı ({{1}} ad · {{2}} tarih — saat yok).
--
-- 20260915120000_remove_randevulu_surgery_calendar.sql SONRA uygulanır;
-- randevulu kullanmaz, yalnızca ameliyat_olacak + procedure.

insert into public.message_rules (
  key,
  label,
  enabled,
  template_name,
  language,
  offset_minutes,
  send_at_local_time,
  timing_mode,
  appointment_types,
  appointment_statuses,
  lead_statuses,
  include_body_params,
  sort_order
)
values (
  'surgery_2d',
  'Ameliyat — 2 gün önce (teyit)',
  true,
  'ameliyat_2_gun',
  'tr',
  2880,
  null,
  'before_start',
  array['procedure']::text[],
  array['scheduled', 'confirmed']::text[],
  array['ameliyat_olacak']::text[],
  true,
  25
)
on conflict (key) do update
set
  label = excluded.label,
  template_name = excluded.template_name,
  language = excluded.language,
  offset_minutes = excluded.offset_minutes,
  send_at_local_time = excluded.send_at_local_time,
  timing_mode = excluded.timing_mode,
  appointment_types = excluded.appointment_types,
  appointment_statuses = excluded.appointment_statuses,
  lead_statuses = excluded.lead_statuses,
  include_body_params = excluded.include_body_params,
  sort_order = excluded.sort_order,
  updated_at = now();
