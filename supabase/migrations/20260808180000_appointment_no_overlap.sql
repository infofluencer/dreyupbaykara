-- Prevent overlapping active appointments (single clinic calendar).
-- Cancelled rows are ignored. Adjacent slots are allowed ([) ranges).
-- Run in Supabase SQL Editor. Safe to re-run.
-- Existing non-cancelled overlaps must be resolved first.

create extension if not exists btree_gist;

-- tstzrange(...) is STABLE; EXCLUDE/GiST needs IMMUTABLE.
create or replace function public.appointment_time_range(
  starts_at timestamptz,
  ends_at timestamptz
)
returns tstzrange
language sql
immutable
parallel safe
as $$
  select tstzrange(
    starts_at,
    coalesce(ends_at, starts_at + interval '30 minutes'),
    '[)'
  );
$$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'appointments_no_overlap'
  ) then
    alter table public.appointments
      add constraint appointments_no_overlap
      exclude using gist (
        public.appointment_time_range(starts_at, ends_at) with &&
      )
      where (status is distinct from 'cancelled');
  end if;
end $$;
