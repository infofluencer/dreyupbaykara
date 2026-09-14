-- Gelen kutusu dönem filtresi: last_message_at >= cutoff
-- order by last_message_at desc. Mevcut (status, last_message_at)
-- bileşik indeksi status süzmeden bu taramayı karşılamaz.
create index if not exists conversations_last_message_at_idx
  on public.conversations (last_message_at desc nulls last);
