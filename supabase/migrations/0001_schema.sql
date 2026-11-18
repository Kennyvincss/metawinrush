-- METAWIN RUSH schema
-- Security model: players can READ their own private rows (and public leaderboard data) through
-- Row Level Security, but they can never WRITE game data directly. Every write goes through the
-- Next.js API routes, which validate the request and then call public.apply_player_update()
-- with the service-role key. That function is not executable by anon/authenticated users.

create extension if not exists pgcrypto;

-- ── Catalog tables (seeded from src/lib/data via scripts/generate-seed.ts) ───────────────────
create table if not exists public.cities (
  id text primary key,
  name text not null,
  theme text not null,
  unlock_type text not null check (unlock_type in ('free','score','level','missions','coins')),
  unlock_value integer not null default 0,
  sort integer not null default 0
);

-- All cosmetic items. `slot` distinguishes character skins from helmets, trails and effects.
create table if not exists public.characters (
  id text primary key,
  slot text not null check (slot in ('character','helmet','trail','jumpfx','slidefx','emote')),
  name text not null,
  rarity text not null,
  price integer not null default 0 check (price >= 0),
  unlock_level integer,
  reward_only boolean not null default false
);

create table if not exists public.missions (
  id text primary key,
  kind text not null check (kind in ('daily','weekly','special')),
  title text not null,
  description text not null,
  metric text not null,
  target integer not null check (target > 0),
  city_id text references public.cities(id),
  reward_coins integer not null default 0,
  reward_xp integer not null default 0
);

create table if not exists public.achievements (
  id text primary key,
  title text not null,
  description text not null,
  icon text not null,
  target integer not null,
  reward_coins integer not null default 0,
  reward_xp integer not null default 0
);

-- ── Player tables ────────────────────────────────────────────────────────────────────────────
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null unique check (username ~ '^[A-Za-z0-9_]{3,16}$'),
  equipped jsonb not null default '{}'::jsonb,
  settings jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.player_stats (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  xp bigint not null default 0 check (xp >= 0),
  level integer not null default 1,
  games_played integer not null default 0,
  total_distance bigint not null default 0,
  total_coins bigint not null default 0,
  total_score bigint not null default 0,
  high_score bigint not null default 0,
  powerups_used integer not null default 0,
  jumps integer not null default 0,
  slides integer not null default 0,
  dodges integer not null default 0,
  longest_run_ms bigint not null default 0,
  missions_completed integer not null default 0,
  city_stats jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists public.coin_balances (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  balance bigint not null default 0 check (balance >= 0),
  version integer not null default 0,
  updated_at timestamptz not null default now()
);

create table if not exists public.coin_transactions (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  amount bigint not null,
  reason text not null,
  ref text,
  created_at timestamptz not null default now()
);
create index if not exists coin_transactions_user_idx on public.coin_transactions(user_id, created_at desc);

create table if not exists public.game_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  city_id text not null references public.cities(id),
  seed bigint not null,
  status text not null default 'active' check (status in ('active','finished','rejected','expired')),
  reject_reason text,
  started_at timestamptz not null default now(),
  finished_at timestamptz
);
create index if not exists game_sessions_user_idx on public.game_sessions(user_id, started_at desc);

create table if not exists public.scores (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  session_id uuid not null unique references public.game_sessions(id) on delete cascade,
  city_id text not null references public.cities(id),
  score bigint not null check (score >= 0),
  distance integer not null check (distance >= 0),
  coins integer not null check (coins >= 0),
  duration_ms integer not null check (duration_ms >= 0),
  created_at timestamptz not null default now()
);
create index if not exists scores_created_score_idx on public.scores(created_at desc, score desc);
create index if not exists scores_score_idx on public.scores(score desc);
create index if not exists scores_user_idx on public.scores(user_id, score desc);
create index if not exists scores_city_idx on public.scores(city_id, created_at desc, score desc);

create table if not exists public.player_missions (
  user_id uuid not null references public.profiles(id) on delete cascade,
  mission_id text not null references public.missions(id),
  period_key text not null,
  progress integer not null default 0,
  completed_at timestamptz,
  claimed_at timestamptz,
  primary key (user_id, mission_id, period_key)
);

create table if not exists public.unlocked_cities (
  user_id uuid not null references public.profiles(id) on delete cascade,
  city_id text not null references public.cities(id),
  unlocked_at timestamptz not null default now(),
  primary key (user_id, city_id)
);

create table if not exists public.player_inventory (
  user_id uuid not null references public.profiles(id) on delete cascade,
  item_id text not null references public.characters(id),
  acquired_at timestamptz not null default now(),
  primary key (user_id, item_id)
);

create table if not exists public.player_achievements (
  user_id uuid not null references public.profiles(id) on delete cascade,
  achievement_id text not null references public.achievements(id),
  unlocked_at timestamptz not null default now(),
  primary key (user_id, achievement_id)
);

-- One row per claim. The unique constraint makes double-claiming a day impossible.
create table if not exists public.daily_rewards (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  claimed_on date not null,
  day_index integer not null check (day_index between 1 and 7),
  coins integer not null default 0,
  item_id text references public.characters(id),
  created_at timestamptz not null default now(),
  unique (user_id, claimed_on)
);

create table if not exists public.tournaments (
  id text primary key,
  name text not null,
  kind text not null check (kind in ('daily','weekly','city','special')),
  city_id text references public.cities(id),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  created_at timestamptz not null default now(),
  check (ends_at > starts_at)
);
create index if not exists tournaments_window_idx on public.tournaments(ends_at desc);

create table if not exists public.tournament_entries (
  tournament_id text not null references public.tournaments(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  best_score bigint not null default 0,
  runs integer not null default 0,
  updated_at timestamptz not null default now(),
  primary key (tournament_id, user_id)
);
create index if not exists tournament_entries_rank_idx on public.tournament_entries(tournament_id, best_score desc);

-- ── Row Level Security ──────────────────────────────────────────────────────────────────────
alter table public.cities enable row level security;
alter table public.characters enable row level security;
alter table public.missions enable row level security;
alter table public.achievements enable row level security;
alter table public.profiles enable row level security;
alter table public.player_stats enable row level security;
alter table public.coin_balances enable row level security;
alter table public.coin_transactions enable row level security;
alter table public.game_sessions enable row level security;
alter table public.scores enable row level security;
alter table public.player_missions enable row level security;
alter table public.unlocked_cities enable row level security;
alter table public.player_inventory enable row level security;
alter table public.player_achievements enable row level security;
alter table public.daily_rewards enable row level security;
alter table public.tournaments enable row level security;
alter table public.tournament_entries enable row level security;

-- Public read: catalogs, leaderboard data, public profiles.
create policy "catalog readable" on public.cities for select using (true);
create policy "catalog readable" on public.characters for select using (true);
create policy "catalog readable" on public.missions for select using (true);
create policy "catalog readable" on public.achievements for select using (true);
create policy "public profiles" on public.profiles for select using (true);
create policy "public stats" on public.player_stats for select using (true);
create policy "public scores" on public.scores for select using (true);
create policy "public tournaments" on public.tournaments for select using (true);
create policy "public tournament entries" on public.tournament_entries for select using (true);

-- Private read: only the owner.
create policy "own balance" on public.coin_balances for select using (auth.uid() = user_id);
create policy "own transactions" on public.coin_transactions for select using (auth.uid() = user_id);
create policy "own sessions" on public.game_sessions for select using (auth.uid() = user_id);
create policy "own missions" on public.player_missions for select using (auth.uid() = user_id);
create policy "own cities" on public.unlocked_cities for select using (auth.uid() = user_id);
create policy "own inventory" on public.player_inventory for select using (auth.uid() = user_id);
create policy "own achievements" on public.player_achievements for select using (auth.uid() = user_id);
create policy "own daily rewards" on public.daily_rewards for select using (auth.uid() = user_id);

-- No INSERT/UPDATE/DELETE policies exist, so clients cannot write any of these tables.
-- Belt and braces: remove write privileges from the client roles entirely.
do $$
declare t text;
begin
  foreach t in array array['cities','characters','missions','achievements','profiles','player_stats','coin_balances',
    'coin_transactions','game_sessions','scores','player_missions','unlocked_cities','player_inventory',
    'player_achievements','daily_rewards','tournaments','tournament_entries'] loop
    execute format('revoke insert, update, delete, truncate on public.%I from anon, authenticated', t);
  end loop;
end $$;

-- ── Leaderboards ────────────────────────────────────────────────────────────────────────────
create or replace function public.period_start(p_period text) returns timestamptz
language sql stable as $$
  select case p_period
    when 'daily' then date_trunc('day', now() at time zone 'utc') at time zone 'utc'
    when 'weekly' then date_trunc('week', now() at time zone 'utc') at time zone 'utc'
    when 'monthly' then date_trunc('month', now() at time zone 'utc') at time zone 'utc'
    else null end
$$;

create or replace function public.leaderboard(p_period text, p_city text default null, p_limit integer default 50)
returns table (rank bigint, user_id uuid, username text, character_id text, level integer, score bigint)
language sql stable security definer set search_path = public as $$
  with best as (
    select distinct on (s.user_id) s.user_id, s.score, s.created_at
    from scores s
    where (public.period_start(p_period) is null or s.created_at >= public.period_start(p_period))
      and (p_city is null or s.city_id = p_city)
    order by s.user_id, s.score desc, s.created_at asc
  )
  select rank() over (order by b.score desc, b.created_at asc), b.user_id, p.username,
         coalesce(p.equipped->>'character', 'char_masked'), coalesce(st.level, 1), b.score
  from best b
  join profiles p on p.id = b.user_id
  left join player_stats st on st.user_id = b.user_id
  order by b.score desc, b.created_at asc
  limit least(greatest(p_limit, 1), 100)
$$;

create or replace function public.leaderboard_rank(p_user uuid, p_period text, p_city text default null)
returns table (rank bigint, score bigint, total bigint)
language sql stable security definer set search_path = public as $$
  with best as (
    select s.user_id, max(s.score) as score
    from scores s
    where (public.period_start(p_period) is null or s.created_at >= public.period_start(p_period))
      and (p_city is null or s.city_id = p_city)
    group by s.user_id
  )
  select (select count(*) from best b2 where b2.score > b.score) + 1, b.score, (select count(*) from best)
  from best b where b.user_id = p_user
$$;

create or replace function public.tournament_board(p_tournament text, p_limit integer default 50)
returns table (rank bigint, user_id uuid, username text, character_id text, level integer, score bigint)
language sql stable security definer set search_path = public as $$
  select rank() over (order by e.best_score desc, e.updated_at asc), e.user_id, p.username,
         coalesce(p.equipped->>'character', 'char_masked'), coalesce(st.level, 1), e.best_score
  from tournament_entries e
  join profiles p on p.id = e.user_id
  left join player_stats st on st.user_id = e.user_id
  where e.tournament_id = p_tournament
  order by e.best_score desc, e.updated_at asc
  limit least(greatest(p_limit, 1), 100)
$$;

create or replace function public.tournament_summary(p_ids text[], p_user uuid default null)
returns table (tournament_id text, participants bigint, top_score bigint, my_score bigint, my_rank bigint)
language sql stable security definer set search_path = public as $$
  select t.id,
         (select count(*) from tournament_entries e where e.tournament_id = t.id),
         (select max(e.best_score) from tournament_entries e where e.tournament_id = t.id),
         me.best_score,
         case when me.best_score is null then null else
           (select count(*) from tournament_entries e where e.tournament_id = t.id and e.best_score > me.best_score) + 1 end
  from unnest(p_ids) as t(id)
  left join tournament_entries me on me.tournament_id = t.id and me.user_id = p_user
$$;

-- ── Atomic player update (service role only) ────────────────────────────────────────────────
-- The API computes the new player state with the shared TypeScript rules engine, then applies
-- every change here in one transaction. `expected_version` provides optimistic locking so two
-- concurrent requests can't both spend the same coins.
create or replace function public.apply_player_update(p_user uuid, p jsonb)
returns integer
language plpgsql security definer set search_path = public as $$
declare
  v_version integer;
  r jsonb;
begin
  update coin_balances
     set balance = (p->'coins'->>'balance')::bigint,
         version = version + 1,
         updated_at = now()
   where user_id = p_user and version = (p->'coins'->>'expected_version')::integer
  returning version into v_version;
  if v_version is null then
    raise exception 'version_conflict' using errcode = '40001';
  end if;

  if p ? 'profile' and p->'profile' <> 'null'::jsonb then
    update profiles set
      username = coalesce(p->'profile'->>'username', username),
      equipped = coalesce(p->'profile'->'equipped', equipped),
      settings = coalesce(p->'profile'->'settings', settings),
      updated_at = now()
    where id = p_user;
  end if;

  if p ? 'stats' and p->'stats' <> 'null'::jsonb then
    update player_stats set
      xp = (p->'stats'->>'xp')::bigint,
      level = (p->'stats'->>'level')::integer,
      games_played = (p->'stats'->>'games_played')::integer,
      total_distance = (p->'stats'->>'total_distance')::bigint,
      total_coins = (p->'stats'->>'total_coins')::bigint,
      total_score = (p->'stats'->>'total_score')::bigint,
      high_score = (p->'stats'->>'high_score')::bigint,
      powerups_used = (p->'stats'->>'powerups_used')::integer,
      jumps = (p->'stats'->>'jumps')::integer,
      slides = (p->'stats'->>'slides')::integer,
      dodges = (p->'stats'->>'dodges')::integer,
      longest_run_ms = (p->'stats'->>'longest_run_ms')::bigint,
      missions_completed = (p->'stats'->>'missions_completed')::integer,
      city_stats = p->'stats'->'city_stats',
      updated_at = now()
    where user_id = p_user;
  end if;

  for r in select * from jsonb_array_elements(coalesce(p->'ledger', '[]'::jsonb)) loop
    insert into coin_transactions(user_id, amount, reason, ref)
    values (p_user, (r->>'amount')::bigint, r->>'reason', r->>'ref');
  end loop;

  for r in select * from jsonb_array_elements(coalesce(p->'missions', '[]'::jsonb)) loop
    insert into player_missions(user_id, mission_id, period_key, progress, completed_at, claimed_at)
    values (p_user, r->>'mission_id', r->>'period_key', (r->>'progress')::integer,
            (r->>'completed_at')::timestamptz, (r->>'claimed_at')::timestamptz)
    on conflict (user_id, mission_id, period_key) do update set
      progress = excluded.progress, completed_at = excluded.completed_at, claimed_at = excluded.claimed_at;
  end loop;

  for r in select * from jsonb_array_elements(coalesce(p->'achievements', '[]'::jsonb)) loop
    insert into player_achievements(user_id, achievement_id, unlocked_at)
    values (p_user, r->>'achievement_id', (r->>'unlocked_at')::timestamptz)
    on conflict do nothing;
  end loop;

  for r in select * from jsonb_array_elements(coalesce(p->'cities', '[]'::jsonb)) loop
    insert into unlocked_cities(user_id, city_id) values (p_user, r #>> '{}') on conflict do nothing;
  end loop;

  for r in select * from jsonb_array_elements(coalesce(p->'inventory', '[]'::jsonb)) loop
    insert into player_inventory(user_id, item_id) values (p_user, r #>> '{}') on conflict do nothing;
  end loop;

  if p ? 'daily_claim' and p->'daily_claim' <> 'null'::jsonb then
    insert into daily_rewards(user_id, claimed_on, day_index, coins, item_id)
    values (p_user, (p->'daily_claim'->>'claimed_on')::date, (p->'daily_claim'->>'day_index')::integer,
            (p->'daily_claim'->>'coins')::integer, p->'daily_claim'->>'item_id');
  end if;

  if p ? 'session' and p->'session' <> 'null'::jsonb then
    update game_sessions set status = p->'session'->>'status', reject_reason = p->'session'->>'reject_reason', finished_at = now()
    where id = (p->'session'->>'id')::uuid and user_id = p_user and status = 'active';
    if not found then
      raise exception 'session_not_active' using errcode = 'P0001';
    end if;
  end if;

  if p ? 'score' and p->'score' <> 'null'::jsonb then
    insert into scores(user_id, session_id, city_id, score, distance, coins, duration_ms)
    values (p_user, (p->'score'->>'session_id')::uuid, p->'score'->>'city_id', (p->'score'->>'score')::bigint,
            (p->'score'->>'distance')::integer, (p->'score'->>'coins')::integer, (p->'score'->>'duration_ms')::integer);
  end if;

  for r in select * from jsonb_array_elements(coalesce(p->'tournaments', '[]'::jsonb)) loop
    insert into tournament_entries(tournament_id, user_id, best_score, runs, updated_at)
    values (r->>'tournament_id', p_user, (r->>'score')::bigint, 1, now())
    on conflict (tournament_id, user_id) do update set
      best_score = greatest(tournament_entries.best_score, excluded.best_score),
      runs = tournament_entries.runs + 1,
      updated_at = case when excluded.best_score > tournament_entries.best_score then now() else tournament_entries.updated_at end;
  end loop;

  return v_version;
end $$;

-- Creates the profile + stats + balance rows for a new player (called by the API on first load).
create or replace function public.bootstrap_player(p_user uuid, p_username text, p_equipped jsonb, p_settings jsonb)
returns void
language plpgsql security definer set search_path = public as $$
begin
  insert into profiles(id, username, equipped, settings) values (p_user, p_username, p_equipped, p_settings)
  on conflict (id) do nothing;
  insert into player_stats(user_id) values (p_user) on conflict do nothing;
  insert into coin_balances(user_id) values (p_user) on conflict do nothing;
  insert into unlocked_cities(user_id, city_id) values (p_user, 'tokyo') on conflict do nothing;
  insert into player_inventory(user_id, item_id)
    select p_user, id from characters where id in ('char_masked','helm_standard','trail_none','jfx_none','sfx_none','emote_none')
  on conflict do nothing;
end $$;

revoke all on function public.apply_player_update(uuid, jsonb) from public, anon, authenticated;
revoke all on function public.bootstrap_player(uuid, text, jsonb, jsonb) from public, anon, authenticated;
grant execute on function public.apply_player_update(uuid, jsonb) to service_role;
grant execute on function public.bootstrap_player(uuid, text, jsonb, jsonb) to service_role;
grant execute on function public.leaderboard(text, text, integer) to anon, authenticated, service_role;
grant execute on function public.leaderboard_rank(uuid, text, text) to anon, authenticated, service_role;
grant execute on function public.tournament_board(text, integer) to anon, authenticated, service_role;
grant execute on function public.tournament_summary(text[], uuid) to anon, authenticated, service_role;
