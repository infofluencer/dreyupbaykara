-- Lead durum panosu: muayene_edildi | ameliyat_olacak | ameliyat_edildi
-- Sıra: yeni → arandi → randevulu → muayene_edildi → ameliyat_olacak → ameliyat_edildi → bitti

alter table public.leads
  drop constraint if exists leads_status_check;

alter table public.leads
  add constraint leads_status_check
  check (
    status in (
      'yeni',
      'arandi',
      'randevulu',
      'muayene_edildi',
      'ameliyat_olacak',
      'ameliyat_edildi',
      'bitti'
    )
  );

comment on column public.message_rules.lead_statuses is
  'Durum Panosu lead status filtreleri (yeni, arandi, randevulu, muayene_edildi, ameliyat_olacak, ameliyat_edildi, bitti). Boş = filtre yok.';
