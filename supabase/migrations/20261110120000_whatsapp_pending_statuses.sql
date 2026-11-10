-- WhatsApp durum (tik) yarışı:
-- Meta "delivered/read" webhook'u, mesaj satırı (panel gönderimi veya
-- telefondan gelen smb_message_echoes) veritabanına yazılmadan önce gelebiliyor.
-- Eskiden update 0 satıra denk gelip durum kayboluyor, mesaj tek tıkta kalıyordu.
-- Ayrıca geç gelen "sent", önceki "read"/"delivered"ı geri alabiliyordu.
--
-- Çözüm:
--  * Durumlar sadece ileri gider (sent < delivered < read; failed ayrı).
--  * Satır henüz yoksa durum whatsapp_pending_statuses'a park edilir,
--    satır insert edilirken trigger ile uygulanır.

create table if not exists public.whatsapp_pending_statuses (
  wa_message_id text primary key,
  status public.message_status not null,
  errors jsonb,
  created_at timestamptz not null default now()
);

alter table public.whatsapp_pending_statuses enable row level security;

create or replace function public.wa_status_rank(s public.message_status)
returns int
language sql
immutable
as $$
  select case s
    when 'pending' then 0
    when 'sent' then 1
    when 'delivered' then 2
    when 'read' then 3
    when 'failed' then 4
    else 0
  end;
$$;

-- Webhook'tan çağrılır. Satır varsa ileri yönde günceller; yoksa park eder.
create or replace function public.apply_whatsapp_status(
  p_wa_message_id text,
  p_status public.message_status,
  p_errors jsonb default null
)
returns table (message_id uuid, raw_payload jsonb, found boolean)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
  v_raw jsonb;
  v_status public.message_status;
begin
  select m.id, m.raw_payload, m.status
    into v_id, v_raw, v_status
  from public.messages m
  where m.wa_message_id = p_wa_message_id
  for update;

  if v_id is null then
    -- Hiç eşleşmeyen eski park kayıtlarını temizle.
    delete from public.whatsapp_pending_statuses
    where created_at < now() - interval '2 days';

    insert into public.whatsapp_pending_statuses as ps (wa_message_id, status, errors)
    values (p_wa_message_id, p_status, p_errors)
    on conflict (wa_message_id) do update
      set status = excluded.status,
          errors = coalesce(excluded.errors, ps.errors)
      where public.wa_status_rank(excluded.status) > public.wa_status_rank(ps.status);

    -- Yarış: mesaj tam bu arada commit edildiyse park edilen durumu hemen uygula.
    select m.id, m.raw_payload into v_id, v_raw
    from public.messages m
    where m.wa_message_id = p_wa_message_id;
    if v_id is null then
      return query select null::uuid, null::jsonb, false;
      return;
    end if;
    delete from public.whatsapp_pending_statuses where wa_message_id = p_wa_message_id;
    select m.status into v_status from public.messages m where m.id = v_id;
  end if;

  if public.wa_status_rank(p_status) > public.wa_status_rank(v_status) then
    update public.messages set status = p_status where id = v_id;
  end if;

  return query select v_id, v_raw, true;
end;
$$;

revoke all on function public.apply_whatsapp_status(text, public.message_status, jsonb) from public, anon, authenticated;
grant execute on function public.apply_whatsapp_status(text, public.message_status, jsonb) to service_role;

-- Mesaj satırı oluşurken bekleyen durumu uygula.
create or replace function public.messages_apply_pending_status()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_pending public.whatsapp_pending_statuses;
begin
  if new.wa_message_id is null then
    return new;
  end if;

  delete from public.whatsapp_pending_statuses
  where wa_message_id = new.wa_message_id
  returning * into v_pending;

  if v_pending.wa_message_id is not null
     and public.wa_status_rank(v_pending.status) > public.wa_status_rank(new.status) then
    new.status := v_pending.status;
    if v_pending.status = 'failed' and v_pending.errors is not null then
      new.raw_payload := coalesce(new.raw_payload, '{}'::jsonb) || jsonb_build_object(
        'delivery_error', coalesce(v_pending.errors->0->>'message', v_pending.errors->0->>'title'),
        'delivery_code', v_pending.errors->0->'code'
      );
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists messages_apply_pending_status on public.messages;
create trigger messages_apply_pending_status
  before insert on public.messages
  for each row execute function public.messages_apply_pending_status();

-- Mevcut tek tıkta kalmış mesajlar için geriye dönük düzeltme yapılamaz
-- (o durum webhook'ları kaybolmuştu); yeni mesajlarda sorun çözülür.
