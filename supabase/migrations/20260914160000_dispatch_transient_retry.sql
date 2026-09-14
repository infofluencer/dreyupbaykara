-- Geçici Meta hatalarında sınırlı tekrar deneme.
--
-- Arka plan: teslim hatasında gönderim "sent" bırakılıyordu, çünkü eskiden
-- koşulsuz tekrar deneme hastaya aynı hatırlatmayı 4-5 kez gönderiyordu.
-- Artık yalnızca "Meta hiç teslim etmedi" anlamına gelen geçici kodlarda
-- (ödeme uygunluğu, hız limiti) tekrar deniyoruz; retry_count üst sınır koyar.

alter table public.message_dispatches
  add column if not exists retry_count integer not null default 0;

comment on column public.message_dispatches.retry_count is
  'Geçici Meta hatası sonrası yeniden açılma sayısı. Üst sınır kodda (MAX_DISPATCH_RETRIES).';
