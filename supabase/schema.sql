-- =============================================================================
--  Echoes of the Scale — Supabase Schema (FRESH RESET)
--  Run this in the Supabase SQL Editor:
--  https://supabase.com/dashboard/project/qzgdvefpelcubkstmrcw/sql/new
-- =============================================================================

-- ── Drop Old Tables (Ensures no column conflicts) ────────────────────────────
drop trigger if exists on_auth_user_created on auth.users;
drop table if exists public.dialogue_logs cascade;
drop table if exists public.game_sessions cascade;
drop table if exists public.profiles cascade;

-- ── Extensions ────────────────────────────────────────────────────────────────
create extension if not exists "uuid-ossp";

-- ── profiles ─────────────────────────────────────────────────────────────────
create table public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  username    text not null default '',
  victories   integer not null default 0,
  defeats     integer not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- Auto-create a profile row whenever a new user signs up.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, username)
  values (
    new.id,
    coalesce(
      split_part(new.email, '@', 1),
      'Challenger'
    )
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ── game_sessions ─────────────────────────────────────────────────────────────
create table public.game_sessions (
  id                   uuid primary key default uuid_generate_v4(),
  user_id              uuid not null references auth.users(id) on delete cascade,
  player_health        integer not null default 100,
  shield_charge        integer not null default 0,
  boss_health          integer not null default 500,
  boss_state           text    not null default 'cocky'
                         check (boss_state in ('cocky','irritated','enraged','weakened','defeated')),
  current_riddle_index integer not null default 0,
  turn_count           integer not null default 0,
  outcome              text    check (outcome in ('victory','defeat')),
  is_active            boolean not null default true,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

create index idx_game_sessions_user_active
  on public.game_sessions (user_id, is_active, created_at desc);

-- ── dialogue_logs ─────────────────────────────────────────────────────────────
create table public.dialogue_logs (
  id               uuid primary key default uuid_generate_v4(),
  session_id       uuid not null references public.game_sessions(id) on delete cascade,
  user_id          uuid not null references auth.users(id) on delete cascade,
  speaker          text not null check (speaker in ('player','ignis','system')),
  transcript       text not null,
  boss_state       text check (boss_state in ('cocky','irritated','enraged','weakened','defeated')),
  damage_to_boss   integer not null default 0,
  damage_to_player integer not null default 0,
  created_at       timestamptz not null default now()
);

create index idx_dialogue_logs_session
  on public.dialogue_logs (session_id, created_at asc);

-- ── Row Level Security ────────────────────────────────────────────────────────
alter table public.profiles      enable row level security;
alter table public.game_sessions enable row level security;
alter table public.dialogue_logs enable row level security;

-- profiles
drop policy if exists "profiles_select_all" on public.profiles;
drop policy if exists "profiles_update_own" on public.profiles;
drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_select_all"
  on public.profiles for select using (true);
create policy "profiles_update_own"
  on public.profiles for update using (auth.uid() = id);
create policy "profiles_insert_own"
  on public.profiles for insert with check (auth.uid() = id);

-- game_sessions
drop policy if exists "sessions_select_own" on public.game_sessions;
drop policy if exists "sessions_insert_own" on public.game_sessions;
drop policy if exists "sessions_update_own" on public.game_sessions;
create policy "sessions_select_own"
  on public.game_sessions for select using (auth.uid() = user_id);
create policy "sessions_insert_own"
  on public.game_sessions for insert with check (auth.uid() = user_id);
create policy "sessions_update_own"
  on public.game_sessions for update using (auth.uid() = user_id);

-- dialogue_logs
drop policy if exists "logs_select_own" on public.dialogue_logs;
drop policy if exists "logs_insert_own" on public.dialogue_logs;
create policy "logs_select_own"
  on public.dialogue_logs for select using (auth.uid() = user_id);
create policy "logs_insert_own"
  on public.dialogue_logs for insert with check (auth.uid() = user_id);

-- ── updated_at trigger ────────────────────────────────────────────────────────
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_profiles_updated_at      on public.profiles;
drop trigger if exists set_game_sessions_updated_at  on public.game_sessions;

create trigger set_profiles_updated_at
  before update on public.profiles
  for each row execute procedure public.set_updated_at();

create trigger set_game_sessions_updated_at
  before update on public.game_sessions
  for each row execute procedure public.set_updated_at();
