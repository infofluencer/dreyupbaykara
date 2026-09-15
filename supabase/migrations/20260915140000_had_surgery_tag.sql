-- Ameliyat edildi etiketi: durum "bitti" olsa bile hastanın ameliyat olduğu görünsün.
-- Postop mesajlar gittikten sonra lead otomatik "bitti"ye alınır (kod tarafı).
--
-- 20260915120000_remove_randevulu_surgery_calendar.sql ile çakışmaz;
-- yalnızca leads.had_surgery kolonu ekler.

alter table public.leads
  add column if not exists had_surgery boolean not null default false;

comment on column public.leads.had_surgery is
  'Ameliyat edildi etiketi. Durum bitti olsa bile panoda / listede gösterilir.';

-- Geçmişte ameliyat_edildi olan veya şu an o durumda olanlar
update public.leads
set had_surgery = true
where had_surgery = false
  and (
    status = 'ameliyat_edildi'
    or id in (
      select distinct lead_id
      from public.lead_status_history
      where to_status = 'ameliyat_edildi'
    )
  );
