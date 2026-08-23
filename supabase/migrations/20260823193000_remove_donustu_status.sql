-- Dönüştü kaldırıldı; mevcut kayıtlar ameliyat_oldu'ya taşınır.

update public.leads
set status = 'ameliyat_oldu'
where status = 'donustu';

update public.lead_status_history
set from_status = 'ameliyat_oldu'
where from_status = 'donustu';

update public.lead_status_history
set to_status = 'ameliyat_oldu'
where to_status = 'donustu';

alter table public.leads
  drop constraint if exists leads_status_check;

alter table public.leads
  add constraint leads_status_check
  check (status in (
    'yeni',
    'arandi',
    'ulasilamadi',
    'muayene_randevusu',
    'muayeneye_geldi',
    'ameliyat_karari',
    'ameliyat_oldu',
    'kayip',
    'iptal'
  ));
