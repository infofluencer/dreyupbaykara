-- Ameliyat sonrası mesajlar: yalnızca ameliyat_edildi lead’lere.
-- Gönderim zamanı kodda status_day (geçiş günü 16:00 / geçtiyse hemen).

update public.message_rules
set
  label = 'Ameliyat sonrası bilgilendirme (ameliyat edildi · 16:00)',
  lead_statuses = array['ameliyat_edildi']::text[],
  appointment_statuses = array['scheduled', 'confirmed', 'completed']::text[],
  appointment_types = array['procedure']::text[],
  send_at_local_time = '16:00',
  timing_mode = 'calendar_day',
  updated_at = now()
where key = 'surgery_day';

update public.message_rules
set
  label = 'Google Maps yorum isteği (ameliyat edildi · 16:00)',
  lead_statuses = array['ameliyat_edildi']::text[],
  appointment_statuses = array['scheduled', 'confirmed', 'completed']::text[],
  appointment_types = array['procedure']::text[],
  send_at_local_time = '16:00',
  timing_mode = 'calendar_day',
  updated_at = now()
where key = 'surgery_google_review';

comment on column public.message_rules.lead_statuses is
  'Durum Panosu filtreleri. surgery_* kuralları: ameliyat_edildi (cron status_day).';
