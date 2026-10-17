-- =====================================================================
-- Full-Swing Tennis Academy - bookings platform schema
-- Run this whole file in Supabase: SQL Editor -> New query -> Run.
-- =====================================================================

create extension if not exists btree_gist;
create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------
-- Settings (single row, id = 1)
-- ---------------------------------------------------------------------
create table if not exists public.settings (
  id                     smallint primary key default 1 check (id = 1),
  business_name          text not null default 'Full-Swing Tennis Academy',
  venue_name             text not null default 'St Francis Bay Tennis Court',
  venue_address          text not null default 'St Francis Bay, Eastern Cape',
  contact_email          text,
  contact_phone          text,
  timezone               text not null default 'Africa/Johannesburg',
  cancellation_hours     int  not null default 24 check (cancellation_hours >= 0),
  min_notice_hours       int  not null default 12 check (min_notice_hours >= 0),
  booking_horizon_days   int  not null default 60 check (booking_horizon_days between 1 and 365),
  slot_interval_minutes  int  not null default 30 check (slot_interval_minutes in (15, 30, 60)),
  buffer_minutes         int  not null default 0  check (buffer_minutes between 0 and 120),
  google_calendar_id     text not null default 'primary',
  google_connected_email text,
  updated_at             timestamptz not null default now()
);
insert into public.settings (id) values (1) on conflict (id) do nothing;

-- Google OAuth token kept apart from settings; only the server (service role) can read it.
create table if not exists public.google_auth (
  id            smallint primary key default 1 check (id = 1),
  refresh_token text not null,
  updated_at    timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- Private lesson types (managed in admin)
-- ---------------------------------------------------------------------
create table if not exists public.lesson_types (
  id               uuid primary key default gen_random_uuid(),
  name             text not null,
  description      text,
  duration_minutes int  not null check (duration_minutes between 15 and 240),
  price_cents      int  not null check (price_cents >= 0),
  active           boolean not null default true,
  sort_order       int not null default 0,
  created_at       timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- Weekly availability (local time, Africa/Johannesburg)
-- weekday: 0 = Sunday ... 6 = Saturday
-- ---------------------------------------------------------------------
create table if not exists public.availability_rules (
  id         uuid primary key default gen_random_uuid(),
  weekday    smallint not null check (weekday between 0 and 6),
  start_time time not null,
  end_time   time not null,
  created_at timestamptz not null default now(),
  check (end_time > start_time)
);

-- Days off / blocked time
create table if not exists public.blocked_periods (
  id         uuid primary key default gen_random_uuid(),
  starts_at  timestamptz not null,
  ends_at    timestamptz not null,
  reason     text,
  created_at timestamptz not null default now(),
  check (ends_at > starts_at)
);

-- ---------------------------------------------------------------------
-- Group sessions (one-off, created in admin)
-- ---------------------------------------------------------------------
create table if not exists public.group_sessions (
  id              uuid primary key default gen_random_uuid(),
  title           text not null,
  description     text,
  level           text,
  starts_at       timestamptz not null,
  ends_at         timestamptz not null,
  capacity        int not null check (capacity between 1 and 100),
  price_cents     int not null check (price_cents >= 0),
  status          text not null default 'scheduled' check (status in ('scheduled', 'cancelled')),
  google_event_id text,
  created_at      timestamptz not null default now(),
  check (ends_at > starts_at)
);
create index if not exists group_sessions_starts_idx on public.group_sessions (starts_at);

-- ---------------------------------------------------------------------
-- Bookings (private lessons and group spots)
-- ---------------------------------------------------------------------
create table if not exists public.bookings (
  id                 uuid primary key default gen_random_uuid(),
  kind               text not null check (kind in ('private', 'group')),
  lesson_type_id     uuid references public.lesson_types (id) on delete restrict,
  group_session_id   uuid references public.group_sessions (id) on delete restrict,
  starts_at          timestamptz not null,
  ends_at            timestamptz not null,
  spots              int not null default 1 check (spots between 1 and 10),
  title              text not null,
  customer_name      text not null,
  customer_email     text not null,
  customer_phone     text,
  player_name        text,
  notes              text,
  user_id            uuid references auth.users (id) on delete set null,
  status             text not null default 'pending'
                     check (status in ('pending', 'confirmed', 'cancelled', 'expired')),
  amount_cents       int not null check (amount_cents >= 0),
  paystack_reference text unique,
  paid_at            timestamptz,
  refund_status      text not null default 'none'
                     check (refund_status in ('none', 'pending', 'processed', 'failed', 'manual')),
  refund_note        text,
  cancelled_at       timestamptz,
  cancelled_by       text check (cancelled_by in ('client', 'admin', 'system')),
  google_event_id    text,
  reminder_sent_at   timestamptz,
  manage_token       uuid not null default gen_random_uuid() unique,
  created_at         timestamptz not null default now(),
  check (ends_at > starts_at),
  check ((kind = 'private' and lesson_type_id is not null) or (kind = 'group' and group_session_id is not null)),
  -- No two active private lessons may overlap.
  constraint bookings_no_private_overlap exclude using gist (
    tstzrange(starts_at, ends_at, '[)') with &&
  ) where (kind = 'private' and status in ('pending', 'confirmed'))
);
create index if not exists bookings_starts_idx  on public.bookings (starts_at);
create index if not exists bookings_email_idx   on public.bookings (lower(customer_email));
create index if not exists bookings_user_idx    on public.bookings (user_id);
create index if not exists bookings_group_idx   on public.bookings (group_session_id);
create index if not exists bookings_status_idx  on public.bookings (status);

-- ---------------------------------------------------------------------
-- Functions
-- ---------------------------------------------------------------------

-- Pending bookings hold a slot for 20 minutes while the client pays.
create or replace function public.expire_stale_pending()
returns void language sql security definer set search_path = public as $$
  update public.bookings
     set status = 'expired'
   where status = 'pending'
     and created_at < now() - interval '20 minutes';
$$;

-- Book spots in a group session atomically (locks the session row so it can't be oversold).
create or replace function public.book_group_session(
  p_session_id uuid,
  p_spots int,
  p_customer_name text,
  p_customer_email text,
  p_customer_phone text,
  p_player_name text,
  p_notes text,
  p_user_id uuid,
  p_reference text
) returns public.bookings
language plpgsql security definer set search_path = public as $$
declare
  s public.group_sessions;
  taken int;
  b public.bookings;
begin
  perform public.expire_stale_pending();

  select * into s from public.group_sessions where id = p_session_id for update;
  if not found or s.status <> 'scheduled' then
    raise exception 'SESSION_UNAVAILABLE';
  end if;
  if s.starts_at <= now() then
    raise exception 'SESSION_STARTED';
  end if;

  select coalesce(sum(spots), 0) into taken
    from public.bookings
   where group_session_id = p_session_id
     and status in ('pending', 'confirmed');

  if taken + p_spots > s.capacity then
    raise exception 'SESSION_FULL';
  end if;

  insert into public.bookings (
    kind, group_session_id, starts_at, ends_at, spots, title,
    customer_name, customer_email, customer_phone, player_name, notes,
    user_id, amount_cents, paystack_reference
  ) values (
    'group', s.id, s.starts_at, s.ends_at, p_spots, s.title,
    p_customer_name, lower(p_customer_email), p_customer_phone, p_player_name, p_notes,
    p_user_id, s.price_cents * p_spots, p_reference
  ) returning * into b;

  return b;
end;
$$;

-- Spots already taken per group session (confirmed + unexpired pending)
create or replace function public.group_session_taken(p_session_ids uuid[])
returns table (group_session_id uuid, taken bigint)
language sql security definer set search_path = public as $$
  select b.group_session_id, coalesce(sum(b.spots), 0)
    from public.bookings b
   where b.group_session_id = any (p_session_ids)
     and (b.status = 'confirmed'
          or (b.status = 'pending' and b.created_at >= now() - interval '20 minutes'))
   group by b.group_session_id;
$$;

-- Find an existing account id for an email (server use only)
create or replace function public.user_id_for_email(p_email text)
returns uuid language sql security definer set search_path = public, auth as $$
  select id from auth.users
   where lower(email) = lower(p_email) and email_confirmed_at is not null
   limit 1;
$$;

-- When someone creates an account, attach every booking made with that email.
create or replace function public.link_bookings_to_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  -- Only link once the email address is verified, so nobody can claim someone else's bookings.
  if new.email_confirmed_at is null then
    return new;
  end if;
  update public.bookings
     set user_id = new.id
   where user_id is null
     and lower(customer_email) = lower(new.email);
  return new;
end;
$$;

drop trigger if exists on_auth_user_created_link_bookings on auth.users;
create trigger on_auth_user_created_link_bookings
  after insert on auth.users
  for each row execute function public.link_bookings_to_new_user();

-- Also link when a user confirms their email later
drop trigger if exists on_auth_user_confirmed_link_bookings on auth.users;
create trigger on_auth_user_confirmed_link_bookings
  after update of email_confirmed_at, email on auth.users
  for each row execute function public.link_bookings_to_new_user();

-- Lock the server-only functions away from the public API roles
revoke execute on function public.expire_stale_pending() from public, anon, authenticated;
revoke execute on function public.book_group_session(uuid, int, text, text, text, text, text, uuid, text) from public, anon, authenticated;
revoke execute on function public.group_session_taken(uuid[]) from public, anon, authenticated;
revoke execute on function public.user_id_for_email(text) from public, anon, authenticated;
revoke execute on function public.link_bookings_to_new_user() from public, anon, authenticated;

-- ---------------------------------------------------------------------
-- Row Level Security
-- All writes go through the Next.js server using the service role key,
-- which bypasses RLS. Public roles only get the reads below.
-- ---------------------------------------------------------------------
alter table public.settings           enable row level security;
alter table public.google_auth        enable row level security;
alter table public.lesson_types       enable row level security;
alter table public.availability_rules enable row level security;
alter table public.blocked_periods    enable row level security;
alter table public.group_sessions     enable row level security;
alter table public.bookings           enable row level security;

drop policy if exists "Active lesson types are public" on public.lesson_types;
create policy "Active lesson types are public" on public.lesson_types
  for select to anon, authenticated using (active);

drop policy if exists "Scheduled group sessions are public" on public.group_sessions;
create policy "Scheduled group sessions are public" on public.group_sessions
  for select to anon, authenticated using (status = 'scheduled');

drop policy if exists "Clients read their own bookings" on public.bookings;
create policy "Clients read their own bookings" on public.bookings
  for select to authenticated using (user_id = (select auth.uid()));

-- ---------------------------------------------------------------------
-- Starter data (edit or delete from the admin dashboard)
-- ---------------------------------------------------------------------
insert into public.lesson_types (name, description, duration_minutes, price_cents, sort_order)
select * from (values
  ('Private Lesson - 60 min', 'One-on-one coaching tailored to your game.', 60, 45000, 1),
  ('Private Lesson - 30 min', 'A focused half-hour session. Great for juniors.', 30, 25000, 2),
  ('Semi-Private (2 players) - 60 min', 'Share a lesson with a friend or sibling.', 60, 60000, 3)
) as v(name, description, duration_minutes, price_cents, sort_order)
where not exists (select 1 from public.lesson_types);

insert into public.availability_rules (weekday, start_time, end_time)
select * from (values
  (1, time '14:00', time '18:00'),
  (2, time '14:00', time '18:00'),
  (3, time '14:00', time '18:00'),
  (4, time '14:00', time '18:00'),
  (5, time '14:00', time '18:00'),
  (6, time '08:00', time '12:00')
) as v(weekday, start_time, end_time)
where not exists (select 1 from public.availability_rules);
