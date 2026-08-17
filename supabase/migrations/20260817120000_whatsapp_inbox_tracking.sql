-- WhatsApp inbox tracking fields + role-scoped RLS.
-- conversations / messages already exist (crm_init); this evolves them.
-- Hastalar `contacts` tablosunda tutulur → patient_id = contacts.id.
-- Apply in Supabase SQL Editor after reviewing.

-- ── Enum: inbound "received" ───────────────────────────────────────────────
do $$
begin
  if not exists (
    select 1
    from pg_enum e
    join pg_type t on t.oid = e.enumtypid
    where t.typname = 'message_status'
      and e.enumlabel = 'received'
  ) then
    alter type public.message_status add value 'received';
  end if;
end $$;

-- ── conversations: tracking columns ───────────────────────────────────────
alter table public.conversations
  add column if not exists patient_id uuid references public.contacts (id) on delete set null,
  add column if not exists wa_phone text,
  add column if not exists contact_name text,
  add column if not exists status text not null default 'open',
  add column if not exists last_message_preview text,
  add column if not exists last_message_direction text,
  add column if not exists unread_count integer not null default 0;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'conversations_status_check'
  ) then
    alter table public.conversations
      add constraint conversations_status_check
      check (status in ('open', 'pending', 'closed'));
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'conversations_last_direction_check'
  ) then
    alter table public.conversations
      add constraint conversations_last_direction_check
      check (
        last_message_direction is null
        or last_message_direction in ('inbound', 'outbound')
      );
  end if;
end $$;

-- Backfill denormalized phone / name / patient from contacts
update public.conversations c
set
  wa_phone = coalesce(c.wa_phone, ct.phone),
  contact_name = coalesce(c.contact_name, ct.name),
  patient_id = coalesce(c.patient_id, c.contact_id)
from public.contacts ct
where ct.id = c.contact_id
  and (
    c.wa_phone is null
    or c.contact_name is null
    or c.patient_id is null
  );

-- Preview from latest message when missing (JOIN; LATERAL cannot ref UPDATE alias)
update public.conversations c
set
  last_message_preview = left(latest.body, 160),
  last_message_direction = latest.direction::text,
  last_message_at = coalesce(c.last_message_at, latest.created_at)
from (
  select distinct on (conversation_id)
    conversation_id,
    body,
    direction,
    created_at
  from public.messages
  order by conversation_id, created_at desc
) latest
where c.id = latest.conversation_id
  and c.last_message_preview is null
  and latest.body is not null;

create index if not exists conversations_status_last_message_idx
  on public.conversations (status, last_message_at desc nulls last);

create index if not exists conversations_assigned_to_idx
  on public.conversations (assigned_to)
  where assigned_to is not null;

create index if not exists conversations_wa_phone_idx
  on public.conversations (wa_phone);

-- Keep messages(conversation_id, created_at) from crm_init; ensure it exists
create index if not exists messages_conversation_created_idx
  on public.messages (conversation_id, created_at);

-- ── Trigger: keep conversation preview / unread in sync ───────────────────
create or replace function public.touch_conversation_on_message()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.conversations
  set
    last_message_at = new.created_at,
    last_message_preview = left(coalesce(new.body, ''), 160),
    last_message_direction = new.direction::text,
    unread_count = case
      when new.direction = 'inbound' then unread_count + 1
      else unread_count
    end,
    updated_at = now()
  where id = new.conversation_id;
  return new;
end;
$$;

drop trigger if exists messages_touch_conversation on public.messages;
create trigger messages_touch_conversation
  after insert on public.messages
  for each row execute function public.touch_conversation_on_message();

-- ── RLS: admin/assistant all; doctor assigned only; editor none ────────────
drop policy if exists "conversations_staff_all" on public.conversations;
drop policy if exists "conversations_clinical_staff_all" on public.conversations;
drop policy if exists "messages_staff_all" on public.messages;
drop policy if exists "messages_clinical_staff_all" on public.messages;

drop policy if exists "conversations_inbox_select" on public.conversations;
drop policy if exists "conversations_inbox_insert" on public.conversations;
drop policy if exists "conversations_inbox_update" on public.conversations;
drop policy if exists "conversations_inbox_delete" on public.conversations;
drop policy if exists "messages_inbox_select" on public.messages;
drop policy if exists "messages_inbox_insert" on public.messages;
drop policy if exists "messages_inbox_update" on public.messages;
drop policy if exists "messages_inbox_delete" on public.messages;

create policy "conversations_inbox_select"
  on public.conversations for select to authenticated
  using (
    public.current_role() in ('admin', 'assistant')
    or (
      public.current_role() = 'doctor'
      and assigned_to = auth.uid()
    )
  );

create policy "conversations_inbox_insert"
  on public.conversations for insert to authenticated
  with check (
    public.current_role() in ('admin', 'assistant')
    or (
      public.current_role() = 'doctor'
      and assigned_to = auth.uid()
    )
  );

create policy "conversations_inbox_update"
  on public.conversations for update to authenticated
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

create policy "conversations_inbox_delete"
  on public.conversations for delete to authenticated
  using (public.current_role() in ('admin', 'assistant'));

create policy "messages_inbox_select"
  on public.messages for select to authenticated
  using (
    exists (
      select 1
      from public.conversations c
      where c.id = conversation_id
        and (
          public.current_role() in ('admin', 'assistant')
          or (
            public.current_role() = 'doctor'
            and c.assigned_to = auth.uid()
          )
        )
    )
  );

create policy "messages_inbox_insert"
  on public.messages for insert to authenticated
  with check (
    exists (
      select 1
      from public.conversations c
      where c.id = conversation_id
        and (
          public.current_role() in ('admin', 'assistant')
          or (
            public.current_role() = 'doctor'
            and c.assigned_to = auth.uid()
          )
        )
    )
  );

create policy "messages_inbox_update"
  on public.messages for update to authenticated
  using (
    exists (
      select 1
      from public.conversations c
      where c.id = conversation_id
        and (
          public.current_role() in ('admin', 'assistant')
          or (
            public.current_role() = 'doctor'
            and c.assigned_to = auth.uid()
          )
        )
    )
  )
  with check (
    exists (
      select 1
      from public.conversations c
      where c.id = conversation_id
        and (
          public.current_role() in ('admin', 'assistant')
          or (
            public.current_role() = 'doctor'
            and c.assigned_to = auth.uid()
          )
        )
    )
  );

create policy "messages_inbox_delete"
  on public.messages for delete to authenticated
  using (public.current_role() in ('admin', 'assistant'));
