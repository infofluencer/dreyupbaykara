-- İlk mesaj bilgilendirme metni Admin → Bot ekranından düzenlenebilir.
-- Boş (null) kalırsa kod içindeki “Genel bilgilendirme” hazır mesajı gider.
alter table public.bot_settings
  add column if not exists intro_message text;
