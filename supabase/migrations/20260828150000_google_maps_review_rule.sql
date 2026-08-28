-- Ameliyat sonrası bilgilendirme (surgery_day) ardından Google Maps yorum isteği.

insert into public.message_rules (
  key,
  label,
  enabled,
  template_name,
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
  'surgery_google_review',
  'Google Maps yorum isteği (16:00)',
  false,
  'google_maps_yorum',
  0,
  '16:00',
  'calendar_day',
  array['procedure']::text[],
  array['scheduled', 'confirmed', 'completed']::text[],
  array['randevulu', 'bitti']::text[],
  false,
  31
)
on conflict (key) do nothing;

comment on table public.message_rules is
  'WhatsApp otomatik hatırlatma kuralları. surgery_google_review, surgery_day gönderildikten sonra aynı cron turunda gider.';
