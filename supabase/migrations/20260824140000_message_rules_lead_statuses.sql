-- Otomasyon kurallarını Durum Panosu hasta durumlarına bağla.
-- Varsayılan: yalnızca "randevulu" hastalara hatırlatma gider.

alter table public.message_rules
  add column if not exists lead_statuses text[] not null default array['randevulu']::text[];

comment on column public.message_rules.lead_statuses is
  'Durum Panosu lead status filtreleri (yeni, arandi, randevulu, bitti). Boş = filtre yok.';

update public.message_rules
set lead_statuses = array['randevulu']::text[]
where lead_statuses is null
   or cardinality(lead_statuses) = 0;
