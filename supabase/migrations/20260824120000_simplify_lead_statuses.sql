-- Lead durumları: 9 → 4 (yeni, arandi, randevulu, bitti)
-- Supabase SQL Editor'da elle çalıştırılabilir; idempotent.
-- leads.status text + CHECK (Postgres enum değil).

-- ── needs_followup: ulasilamadi ayrımı (ayrı durum değil) ──────────────────
alter table public.leads
  add column if not exists needs_followup boolean not null default false;

comment on column public.leads.needs_followup is
  'true = arandi ama ulasilamadi / tekrar aranacak; status ayri degil';

-- lost_reason zaten var (kapanis_sebebi). Yeniden ekleme.

-- ── Veri esleme (once constraint kaldir) ───────────────────────────────────
alter table public.leads
  drop constraint if exists leads_status_check;

-- ulasilamadi → arandi + takip bayragi
update public.leads
set
  needs_followup = true,
  status = 'arandi'
where status = 'ulasilamadi';

-- kayip / iptal → bitti; sebep yoksa eski durum adi
update public.leads
set
  lost_reason = coalesce(nullif(trim(lost_reason), ''), status),
  status = 'bitti'
where status in ('kayip', 'iptal');

-- diger eski durumlar
update public.leads
set status = case status
  when 'muayene_randevusu' then 'randevulu'
  when 'muayeneye_geldi' then 'bitti'
  when 'ameliyat_karari' then 'bitti'
  when 'ameliyat_oldu' then 'bitti'
  when 'donustu' then 'bitti'
  else status
end
where status not in ('yeni', 'arandi', 'randevulu', 'bitti');

-- Guvenlik agi: bilinmeyen / null
update public.leads
set status = 'yeni'
where status is null
   or status not in ('yeni', 'arandi', 'randevulu', 'bitti');

-- History satirlari (gosterim / rapor)
update public.lead_status_history
set from_status = case from_status
  when 'ulasilamadi' then 'arandi'
  when 'muayene_randevusu' then 'randevulu'
  when 'muayeneye_geldi' then 'bitti'
  when 'ameliyat_karari' then 'bitti'
  when 'ameliyat_oldu' then 'bitti'
  when 'donustu' then 'bitti'
  when 'kayip' then 'bitti'
  when 'iptal' then 'bitti'
  else from_status
end
where from_status is not null
  and from_status not in ('yeni', 'arandi', 'randevulu', 'bitti');

update public.lead_status_history
set to_status = case to_status
  when 'ulasilamadi' then 'arandi'
  when 'muayene_randevusu' then 'randevulu'
  when 'muayeneye_geldi' then 'bitti'
  when 'ameliyat_karari' then 'bitti'
  when 'ameliyat_oldu' then 'bitti'
  when 'donustu' then 'bitti'
  when 'kayip' then 'bitti'
  when 'iptal' then 'bitti'
  else to_status
end
where to_status is not null
  and to_status not in ('yeni', 'arandi', 'randevulu', 'bitti');

alter table public.leads
  add constraint leads_status_check
  check (status in ('yeni', 'arandi', 'randevulu', 'bitti'));

-- ── Trigger: bitti + lost_reason not olarak ────────────────────────────────
create or replace function public.log_lead_pipeline_status()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'UPDATE' and new.status is distinct from old.status then
    insert into public.lead_status_history (
      lead_id,
      from_stage,
      to_stage,
      from_status,
      to_status,
      changed_by,
      note
    )
    values (
      new.id,
      old.stage,
      new.stage,
      old.status,
      new.status,
      auth.uid(),
      case
        when new.status = 'bitti' and new.lost_reason is not null
          then new.lost_reason
        else null
      end
    );
  end if;
  return new;
end;
$$;

-- ═══════════════════════════════════════════════════════════════════════════
-- ROLLBACK (elle; gerekirse asagidaki blogu calistir)
-- ═══════════════════════════════════════════════════════════════════════════
--
-- alter table public.leads drop constraint if exists leads_status_check;
--
-- -- Not: 4→9 geri donus kayip/iptal ayrimini ve ulasilamadi'yi geri getirmez.
-- -- needs_followup=true olanlari ulasilamadi yapabilirsin:
-- update public.leads set status = 'ulasilamadi' where status = 'arandi' and needs_followup;
-- update public.leads set status = 'muayene_randevusu' where status = 'randevulu';
-- -- bitti kalanlari ameliyat_oldu'ya cek (kaba):
-- update public.leads set status = 'ameliyat_oldu' where status = 'bitti';
--
-- alter table public.leads
--   add constraint leads_status_check
--   check (status in (
--     'yeni', 'arandi', 'ulasilamadi', 'muayene_randevusu',
--     'muayeneye_geldi', 'ameliyat_karari', 'ameliyat_oldu', 'kayip', 'iptal'
--   ));
--
-- -- Trigger'i eski kayip/iptal mantigina cevirmek icin
-- -- 20260818120000_lead_status_machine.sql icindeki fonksiyonu yeniden uygula.
--
-- alter table public.leads drop column if exists needs_followup;
