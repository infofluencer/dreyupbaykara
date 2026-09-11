-- Ameliyat sonrası mesajlar: "ameliyat edildi" durumuna taşınan hastalara.
-- Gönderim zamanı kodda hesaplanır: geçiş günü 16:00, saat geçtiyse hemen.
-- Aday filtresi lead_status_history üzerinden (cron), lead_statuses yalnızca panelde bilgi.

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

-- Randevu hatırlatmaları randevuya bağlıdır; hasta ameliyat olmuş olsa da
-- (ör. 10. gün kontrolü) hatırlatma gitmelidir.
update public.message_rules
set
  lead_statuses = array[
    'randevulu',
    'muayene_edildi',
    'ameliyat_olacak',
    'ameliyat_edildi'
  ]::text[],
  updated_at = now()
where key in ('appt_1d', 'appt_1h');

comment on column public.message_rules.lead_statuses is
  'Durum Panosu filtreleri. surgery_* kuralları ayrıca lead_status_history (ameliyat_edildi geçiş günü) ile sınırlanır.';
