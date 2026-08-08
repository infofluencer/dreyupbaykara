-- Patient identity + clinical notes. Run in Supabase SQL Editor.

alter table public.contacts
  add column if not exists patient_no integer,
  add column if not exists birth_date date,
  add column if not exists national_id text,
  add column if not exists gender text,
  add column if not exists city text,
  add column if not exists address text,
  add column if not exists allergies text,
  add column if not exists summary text;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'contacts_gender_check'
  ) then
    alter table public.contacts
      add constraint contacts_gender_check
      check (
        gender is null
        or gender in ('female', 'male', 'other', 'unspecified')
      );
  end if;
end $$;

create sequence if not exists public.contacts_patient_no_seq;

alter table public.contacts
  alter column patient_no set default nextval('public.contacts_patient_no_seq');

update public.contacts
set patient_no = nextval('public.contacts_patient_no_seq')
where patient_no is null;

select setval(
  'public.contacts_patient_no_seq',
  coalesce((select max(patient_no) from public.contacts), 1),
  true
);

do $$
begin
  if exists (
    select 1
    from public.contacts
    where patient_no is null
  ) then
    raise exception 'contacts.patient_no backfill failed';
  end if;
end $$;

alter table public.contacts
  alter column patient_no set not null;

create unique index if not exists contacts_patient_no_uidx
  on public.contacts (patient_no);

create unique index if not exists contacts_national_id_uidx
  on public.contacts (national_id)
  where national_id is not null and btrim(national_id) <> '';

create table if not exists public.patient_notes (
  id uuid primary key default gen_random_uuid(),
  contact_id uuid not null references public.contacts (id) on delete cascade,
  body text not null,
  kind text not null default 'clinical'
    check (kind in ('clinical', 'admin', 'surgery', 'followup')),
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists patient_notes_contact_idx
  on public.patient_notes (contact_id, created_at desc);

alter table public.patient_notes enable row level security;

drop policy if exists "patient_notes_clinical_staff_all" on public.patient_notes;
create policy "patient_notes_clinical_staff_all"
  on public.patient_notes for all to authenticated
  using (public.current_role() in ('admin', 'doctor', 'assistant'))
  with check (public.current_role() in ('admin', 'doctor', 'assistant'));
