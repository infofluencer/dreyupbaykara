-- Sohbet geçmişine hızlı erişim.
--
-- 1) /admin/messages?lead=<id> bir talebin konuşmasını arıyor. `lead_id`
--    indekssizdi: her açılışta conversations tam tarama.
create index if not exists conversations_lead_idx
  on public.conversations (lead_id)
  where lead_id is not null;

-- 2) Panel artık sohbetin en yeni mesajlarını çekiyor
--    (order by created_at desc limit N). Mevcut
--    messages_conversation_created_idx (conversation_id, created_at) bu
--    taramayı tersten karşılar; ek indeks gerekmiyor. Planlayıcının güncel
--    seçicilikle çalışması için istatistikleri tazele.
analyze public.conversations;
analyze public.messages;
