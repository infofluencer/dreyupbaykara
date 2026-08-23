-- WhatsApp ile gelen her numara otomatik "hasta" olmasın.
-- Hasta listesi yalnızca bilinçli kayıt (is_patient = true) gösterir.

alter table public.contacts
  add column if not exists is_patient boolean not null default false;

comment on column public.contacts.is_patient is
  'true: klinik hasta kaydı; false: yalnızca WhatsApp/iletişim stub';

-- Mevcut kayıtlarda gerçek hasta sinyali olanları işaretle
update public.contacts c
set is_patient = true
where c.is_patient = false
  and (
    c.national_id is not null
    or c.birth_date is not null
    or nullif(trim(coalesce(c.summary, '')), '') is not null
    or nullif(trim(coalesce(c.city, '')), '') is not null
    or nullif(trim(coalesce(c.address, '')), '') is not null
    or nullif(trim(coalesce(c.allergies, '')), '') is not null
    or exists (
      select 1 from public.patient_notes pn where pn.contact_id = c.id
    )
    or exists (
      select 1
      from public.leads l
      join public.appointments a on a.lead_id = l.id
      where l.contact_id = c.id
        and a.status is distinct from 'cancelled'
    )
    or exists (
      select 1
      from public.leads l
      where l.contact_id = c.id
        and (
          l.site = 'manual'
          or l.channel in ('manual', 'calendar', 'phone', 'clinic', 'walk_in')
        )
    )
  );

create index if not exists contacts_is_patient_idx
  on public.contacts (is_patient)
  where is_patient = true;
