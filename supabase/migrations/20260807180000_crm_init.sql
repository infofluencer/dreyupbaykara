-- CRM MVP schema for Supabase
-- Run in Supabase SQL Editor or: npx supabase db push

create extension if not exists "pgcrypto";

-- Roles
create type public.user_role as enum (
  'admin',
  'doctor',
  'assistant',
  'agency',
  'editor'
);
create type public.lead_stage as enum (
  'new',
  'contacted',
  'qualified',
  'appointment',
  'won',
  'lost',
  'spam'
);
create type public.message_direction as enum ('inbound', 'outbound');
create type public.message_status as enum (
  'pending',
  'sent',
  'delivered',
  'read',
  'failed'
);

-- Profiles (1:1 with auth.users)
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  role public.user_role not null default 'assistant',
  created_at timestamptz not null default now()
);

create table public.contacts (
  id uuid primary key default gen_random_uuid(),
  phone text not null,
  name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint contacts_phone_unique unique (phone)
);

create table public.leads (
  id uuid primary key default gen_random_uuid(),
  contact_id uuid not null references public.contacts (id) on delete cascade,
  stage public.lead_stage not null default 'new',
  assigned_to uuid references public.profiles (id) on delete set null,
  site text,
  channel text,
  campaign text,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  gclid text,
  fbclid text,
  ctwa_clid text,
  lead_ref text unique,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index leads_stage_idx on public.leads (stage);
create index leads_created_at_idx on public.leads (created_at desc);
create index leads_lead_ref_idx on public.leads (lead_ref);

create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  contact_id uuid not null references public.contacts (id) on delete cascade,
  lead_id uuid references public.leads (id) on delete set null,
  wa_conversation_id text,
  last_message_at timestamptz,
  locked_by uuid references public.profiles (id) on delete set null,
  locked_at timestamptz,
  created_at timestamptz not null default now(),
  constraint conversations_contact_unique unique (contact_id)
);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  wa_message_id text unique,
  direction public.message_direction not null,
  body text,
  media_type text,
  media_url text,
  status public.message_status not null default 'pending',
  sent_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

create index messages_conversation_created_idx
  on public.messages (conversation_id, created_at);

create table public.lead_status_history (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.leads (id) on delete cascade,
  from_stage public.lead_stage,
  to_stage public.lead_stage not null,
  changed_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.leads (id) on delete cascade,
  assigned_to uuid references public.profiles (id) on delete set null,
  title text not null,
  due_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.appointments (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.leads (id) on delete cascade,
  starts_at timestamptz not null,
  ends_at timestamptz,
  notes text,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.email),
    'assistant'
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- updated_at helper
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger contacts_updated_at
  before update on public.contacts
  for each row execute function public.set_updated_at();

create trigger leads_updated_at
  before update on public.leads
  for each row execute function public.set_updated_at();

-- RLS
alter table public.profiles enable row level security;
alter table public.contacts enable row level security;
alter table public.leads enable row level security;
alter table public.conversations enable row level security;
alter table public.messages enable row level security;
alter table public.lead_status_history enable row level security;
alter table public.tasks enable row level security;
alter table public.appointments enable row level security;

create or replace function public.current_role()
returns public.user_role
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles where id = auth.uid();
$$;

-- Authenticated staff can read/write CRM tables (agency read limited later)
create policy "profiles_select_own_or_staff"
  on public.profiles for select to authenticated
  using (
    id = auth.uid()
    or public.current_role() in ('admin', 'doctor', 'assistant', 'editor')
  );

create policy "profiles_admin_update"
  on public.profiles for update to authenticated
  using (public.current_role() = 'admin')
  with check (public.current_role() = 'admin');

create policy "contacts_staff_all"
  on public.contacts for all to authenticated
  using (public.current_role() in ('admin', 'doctor', 'assistant'))
  with check (public.current_role() in ('admin', 'doctor', 'assistant'));

create policy "leads_staff_all"
  on public.leads for all to authenticated
  using (public.current_role() in ('admin', 'doctor', 'assistant', 'agency'))
  with check (public.current_role() in ('admin', 'doctor', 'assistant'));

create policy "conversations_staff_all"
  on public.conversations for all to authenticated
  using (public.current_role() in ('admin', 'doctor', 'assistant'))
  with check (public.current_role() in ('admin', 'doctor', 'assistant'));

create policy "messages_staff_all"
  on public.messages for all to authenticated
  using (public.current_role() in ('admin', 'doctor', 'assistant'))
  with check (public.current_role() in ('admin', 'doctor', 'assistant'));

create policy "history_staff_all"
  on public.lead_status_history for all to authenticated
  using (public.current_role() in ('admin', 'doctor', 'assistant', 'agency'))
  with check (public.current_role() in ('admin', 'doctor', 'assistant'));

create policy "tasks_staff_all"
  on public.tasks for all to authenticated
  using (public.current_role() in ('admin', 'doctor', 'assistant'))
  with check (public.current_role() in ('admin', 'doctor', 'assistant'));

create policy "appointments_staff_all"
  on public.appointments for all to authenticated
  using (public.current_role() in ('admin', 'doctor', 'assistant', 'agency'))
  with check (public.current_role() in ('admin', 'doctor', 'assistant'));
