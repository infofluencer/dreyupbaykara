-- Gönderim öncesi claim: aynı randevu+kural için yarışta çift mesaj engeli.
-- pending = WhatsApp API çağrısı sürüyor / kilit alındı.

alter table public.message_dispatches
  drop constraint if exists message_dispatches_status_check;

alter table public.message_dispatches
  add constraint message_dispatches_status_check
  check (status in ('pending', 'sent', 'failed', 'skipped'));

comment on table public.message_dispatches is
  'Kural başına bir kez gönderim (idempotent). pending = claim; Meta kabul ettiyse (wa_message_id) tekrar yok.';
