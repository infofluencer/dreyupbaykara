-- Hasta ilk kez yazdığında genel bilgilendirme metni + işlem bölgesi görseli
-- otomatik gider. Eski SSS / mesai dışı botu askıya alınır: kod yerinde duruyor,
-- Admin → Bot ekranından faq_enabled ile geri açılabilir.
alter table public.bot_settings
  add column if not exists intro_enabled boolean not null default true,
  add column if not exists faq_enabled boolean not null default false;

-- Konuşma başına tek gönderim kilidi (webhook tekrarında ikinci kez gitmesin).
alter table public.conversations
  add column if not exists intro_sent_at timestamptz;

-- Mevcut konuşmalar bilgilendirilmiş sayılır; eski hastalar tekrar yazınca
-- otomatik bilgilendirme almasın.
update public.conversations c
set intro_sent_at = coalesce(c.last_message_at, now())
where c.intro_sent_at is null
  and exists (
    select 1 from public.messages m where m.conversation_id = c.id
  );

update public.bot_settings
set enabled = true,
    intro_enabled = true,
    faq_enabled = false
where id = true;
