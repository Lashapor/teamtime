-- TeamTime — Supabase setup
-- Paste this into your Supabase project's SQL Editor and click Run.
-- This is idempotent: safe on a fresh project AND safe to re-run after a TeamTime release.

-- ============================================================================
-- Migration cleanup (no-ops on fresh installs)
-- ============================================================================

drop function if exists public.get_shared_team(text, text);
drop table if exists public.share_tokens cascade;
alter table if exists public.teams drop constraint if exists teams_owner_id_slug_key;

-- ============================================================================
-- Tables
-- ============================================================================

create table if not exists public.teams (
  id              uuid primary key default gen_random_uuid(),
  owner_id        uuid not null references auth.users(id) on delete cascade,
  slug            text not null unique,
  name            text not null,
  share_enabled   boolean not null default true,
  share_password  text,
  created_at      timestamptz not null default now()
);

-- If the column existed without the unique constraint, add it now.
do $$ begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'teams_slug_key' and conrelid = 'public.teams'::regclass
  ) then
    alter table public.teams add constraint teams_slug_key unique (slug);
  end if;
end $$;

create table if not exists public.team_members (
  id          uuid primary key default gen_random_uuid(),
  team_id     uuid not null references public.teams(id) on delete cascade,
  user_id     uuid references auth.users(id) on delete set null,
  email       text not null,
  name        text not null,
  img_url     text,
  offset_min  int  not null check (offset_min between -720 and 840),
  role        text not null check (role in ('owner','editor','viewer')),
  created_at  timestamptz not null default now()
);
create index if not exists team_members_team_idx  on public.team_members(team_id);
create index if not exists team_members_user_idx  on public.team_members(user_id);
create index if not exists team_members_email_idx on public.team_members(lower(email));

create table if not exists public.shifts (
  id              uuid primary key default gen_random_uuid(),
  team_member_id  uuid not null references public.team_members(id) on delete cascade,
  start_min       int  not null check (start_min between 0 and 1440),
  end_min         int  not null check (end_min   between 0 and 1440),
  ord             int  not null check (ord in (0,1))
);
create index if not exists shifts_member_idx on public.shifts(team_member_id);

-- ============================================================================
-- Auto-link team_members.user_id when a user signs up with a matching email.
-- ============================================================================

create or replace function public.link_team_members_to_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  update public.team_members
     set user_id = new.id
   where user_id is null
     and lower(email) = lower(new.email);
  return new;
end $$;

drop trigger if exists trg_link_team_members_to_user on auth.users;
create trigger trg_link_team_members_to_user
after insert or update of email on auth.users
for each row execute function public.link_team_members_to_user();

update public.team_members tm
   set user_id = u.id
  from auth.users u
 where tm.user_id is null and lower(tm.email) = lower(u.email);

-- ============================================================================
-- Row-level security
-- ============================================================================

alter table public.teams         enable row level security;
alter table public.team_members  enable row level security;
alter table public.shifts        enable row level security;

create or replace function public.is_team_member(t uuid) returns boolean
language sql stable security invoker as $$
  select exists (
    select 1 from public.team_members
    where team_id = t and user_id = auth.uid()
  );
$$;

-- TEAMS
drop policy if exists teams_select_owner  on public.teams;
drop policy if exists teams_select_member on public.teams;
drop policy if exists teams_select_shared on public.teams;
drop policy if exists teams_insert_self   on public.teams;
drop policy if exists teams_update_owner  on public.teams;
drop policy if exists teams_delete_owner  on public.teams;

create policy teams_select_owner  on public.teams for select using (auth.uid() = owner_id);
create policy teams_select_member on public.teams for select using (public.is_team_member(id));
create policy teams_insert_self   on public.teams for insert with check (auth.uid() = owner_id);
create policy teams_update_owner  on public.teams for update using (auth.uid() = owner_id) with check (auth.uid() = owner_id);
create policy teams_delete_owner  on public.teams for delete using (auth.uid() = owner_id);

-- (No public-read policy on teams. Public reads go through get_shared_team RPC,
--  which uses security-definer to safely return one team's data by slug
--  when share_enabled = true. This prevents anon enumeration of all shared teams.)

-- TEAM_MEMBERS
drop policy if exists team_members_select        on public.team_members;
drop policy if exists team_members_insert_owner  on public.team_members;
drop policy if exists team_members_update        on public.team_members;
drop policy if exists team_members_delete_owner  on public.team_members;

create policy team_members_select on public.team_members for select using (
  auth.uid() = user_id
  or exists (select 1 from public.teams t where t.id = team_id and t.owner_id = auth.uid())
);
create policy team_members_insert_owner on public.team_members for insert with check (
  exists (select 1 from public.teams t where t.id = team_id and t.owner_id = auth.uid())
);
create policy team_members_update on public.team_members for update using (
  auth.uid() = user_id
  or exists (select 1 from public.teams t where t.id = team_id and t.owner_id = auth.uid())
) with check (
  auth.uid() = user_id
  or exists (select 1 from public.teams t where t.id = team_id and t.owner_id = auth.uid())
);
create policy team_members_delete_owner on public.team_members for delete using (
  exists (select 1 from public.teams t where t.id = team_id and t.owner_id = auth.uid())
);

-- SHIFTS
drop policy if exists shifts_select on public.shifts;
drop policy if exists shifts_write  on public.shifts;

create policy shifts_select on public.shifts for select using (
  exists (
    select 1 from public.team_members m
    join public.teams t on t.id = m.team_id
    where m.id = team_member_id and (t.owner_id = auth.uid() or m.user_id = auth.uid())
  )
);
create policy shifts_write on public.shifts for all using (
  exists (
    select 1 from public.team_members m
    join public.teams t on t.id = m.team_id
    where m.id = team_member_id and (t.owner_id = auth.uid() or m.user_id = auth.uid())
  )
) with check (
  exists (
    select 1 from public.team_members m
    join public.teams t on t.id = m.team_id
    where m.id = team_member_id and (t.owner_id = auth.uid() or m.user_id = auth.uid())
  )
);

-- ============================================================================
-- Public read-by-slug RPC (slug is the shared secret)
-- ============================================================================

create or replace function public.get_shared_team(p_slug text)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_team teams;
begin
  if p_slug is null then return null; end if;

  select * into v_team from teams where slug = p_slug and share_enabled limit 1;
  if v_team.id is null then return null; end if;

  return jsonb_build_object(
    'team', jsonb_build_object(
      'id', v_team.id,
      'slug', v_team.slug,
      'name', v_team.name,
      'share_enabled', v_team.share_enabled,
      'share_password', v_team.share_password,
      'owner_id', v_team.owner_id
    ),
    'members', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'id', m.id,
        'email', m.email,
        'name', m.name,
        'img_url', m.img_url,
        'offset_min', m.offset_min,
        'role', m.role,
        'user_id', m.user_id,
        'shifts', (
          select coalesce(jsonb_agg(jsonb_build_object(
            'id', s.id, 'start_min', s.start_min, 'end_min', s.end_min, 'ord', s.ord
          ) order by s.ord), '[]'::jsonb)
          from shifts s where s.team_member_id = m.id
        )
      ) order by m.created_at), '[]'::jsonb)
      from team_members m where m.team_id = v_team.id
    )
  );
end $$;

revoke all on function public.get_shared_team(text) from public;
grant execute on function public.get_shared_team(text) to anon, authenticated;

-- ============================================================================
-- Slug availability check (returns boolean only, no team data leaks)
-- ============================================================================

create or replace function public.is_slug_available(p_slug text)
returns boolean
language sql security definer set search_path = public stable as $$
  select case
    when p_slug is null or length(trim(p_slug)) = 0 then false
    else not exists (select 1 from public.teams where slug = p_slug)
  end;
$$;

revoke all on function public.is_slug_available(text) from public;
grant execute on function public.is_slug_available(text) to authenticated;
