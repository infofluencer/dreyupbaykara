-- Lead durum makinesi: mevcut leads + lead_status_history üzerine ekler.
-- /admin/leads takvim olarak kalır; bu kolonlar Talepler (/admin/pipeline) içindir.
-- leads.assigned_to zaten var (profiles). leads.stage enum'u korunur.
-- Apply in Supabase SQL Editor after reviewing.

-- ── leads: pipeline columns ────────────────────────────────────────────────
alter table public.leads
  add column if not exists status text,
  add column if not exists last_contacted_at timestamptz,
  add column if not exists next_action_at date,
  add column if not exists next_action_note text,
  add column if not exists lost_reason text;

update public.leads
set status = case stage::text
  when 'contacted' then 'arandi'
  when 'qualified' then 'arandi'
  when 'appointment' then 'muayene_randevusu'
  when 'won' then 'donustu'
  when 'lost' then 'kayip'
  when 'spam' then 'iptal'
  else 'yeni'
end
where status is null;

alter table public.leads
  alter column status set default 'yeni';

update public.leads set status = 'yeni' where status is null;

alter table public.leads
  alter column status set not null;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'leads_status_check'
  ) then
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
        'donustu',
        'kayip',
        'iptal'
      ));
  end if;
end $$;

create index if not exists leads_status_idx
  on public.leads (status);

create index if not exists leads_next_action_at_idx
  on public.leads (next_action_at);

create index if not exists leads_assigned_to_idx
  on public.leads (assigned_to);

-- ── history: Turkish pipeline statuses + note ──────────────────────────────
alter table public.lead_status_history
  add column if not exists from_status text,
  add column if not exists to_status text,
  add column if not exists note text;

-- ── Trigger: log every leads.status change ─────────────────────────────────
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
        when new.status in ('kayip', 'iptal') then new.lost_reason
        else null
      end
    );
  end if;
  return new;
end;
$$;

drop trigger if exists leads_log_pipeline_status on public.leads;
create trigger leads_log_pipeline_status
  after update of status on public.leads
  for each row
  execute function public.log_lead_pipeline_status();

-- ── RLS: admin+assistant all; doctor assigned only; editor none ────────────
drop policy if exists "leads_staff_all" on public.leads;
drop policy if exists "leads_clinical_staff_all" on public.leads;
drop policy if exists "leads_pipeline_select" on public.leads;
drop policy if exists "leads_pipeline_insert" on public.leads;
drop policy if exists "leads_pipeline_update" on public.leads;
drop policy if exists "leads_pipeline_delete" on public.leads;

create policy "leads_pipeline_select"
  on public.leads for select to authenticated
  using (
    public.current_role() in ('admin', 'assistant')
    or (
      public.current_role() = 'doctor'
      and assigned_to = auth.uid()
    )
  );

create policy "leads_pipeline_insert"
  on public.leads for insert to authenticated
  with check (public.current_role() in ('admin', 'assistant', 'doctor'));

create policy "leads_pipeline_update"
  on public.leads for update to authenticated
  using (
    public.current_role() in ('admin', 'assistant')
    or (
      public.current_role() = 'doctor'
      and assigned_to = auth.uid()
    )
  )
  with check (
    public.current_role() in ('admin', 'assistant')
    or (
      public.current_role() = 'doctor'
      and assigned_to = auth.uid()
    )
  );

create policy "leads_pipeline_delete"
  on public.leads for delete to authenticated
  using (public.current_role() in ('admin', 'assistant'));

drop policy if exists "history_staff_all" on public.lead_status_history;
drop policy if exists "history_pipeline_select" on public.lead_status_history;
drop policy if exists "history_pipeline_insert" on public.lead_status_history;

create policy "history_pipeline_select"
  on public.lead_status_history for select to authenticated
  using (
    exists (
      select 1
      from public.leads l
      where l.id = lead_id
        and (
          public.current_role() in ('admin', 'assistant')
          or (
            public.current_role() = 'doctor'
            and l.assigned_to = auth.uid()
          )
        )
    )
  );

-- App + trigger inserts. Trigger is security definer; this covers staff writes.
create policy "history_pipeline_insert"
  on public.lead_status_history for insert to authenticated
  with check (
    public.current_role() in ('admin', 'assistant', 'doctor')
  );
