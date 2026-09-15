-- Ameliyat öncesi 2 gün teyit mesajını aç.
-- 20260915130000 ile kural kapalı gelmişti; cron yalnızca enabled=true kuralları çalıştırır.

update public.message_rules
set
  enabled = true,
  updated_at = now()
where key = 'surgery_2d'
  and enabled is distinct from true;
