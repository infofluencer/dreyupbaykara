-- Rich calendar and scheduling fields.
-- Run after 20260808034500_operations.sql.
-- Safe to re-run.

alter table public.appointments
  add column if not exists appointment_type text not null default 'consultation',
  add column if not exists location text,
  add column if not exists all_day boolean not null default false,
  add column if not exists reminder_minutes_before integer not null default 1440,
  add column if not exists cancelled_at timestamptz,
  add column if not exists cancellation_reason text,
  add column if not exists updated_at timestamptz not null default now();

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'appointments_appointment_type_check'
  ) then
    alter table public.appointments
      add constraint appointments_appointment_type_check
      check (
        appointment_type in (
          'consultation',
          'control',
          'procedure',
          'online',
          'other'
        )
      );
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'appointments_reminder_minutes_before_check'
  ) then
    alter table public.appointments
      add constraint appointments_reminder_minutes_before_check
      check (
        reminder_minutes_before >= 0
        and reminder_minutes_before <= 10080
      );
  end if;
end $$;

drop trigger if exists appointments_updated_at on public.appointments;
create trigger appointments_updated_at
  before update on public.appointments
  for each row execute function public.set_updated_at();

alter table public.tasks
  add column if not exists priority text not null default 'normal',
  add column if not exists updated_at timestamptz not null default now();

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'tasks_priority_check'
  ) then
    alter table public.tasks
      add constraint tasks_priority_check
      check (priority in ('low', 'normal', 'high', 'urgent'));
  end if;
end $$;

drop trigger if exists tasks_updated_at on public.tasks;
create trigger tasks_updated_at
  before update on public.tasks
  for each row execute function public.set_updated_at();

create index if not exists appointments_status_starts_idx
  on public.appointments (status, starts_at);

create index if not exists tasks_priority_due_idx
  on public.tasks (priority, due_at)
  where completed_at is null;
