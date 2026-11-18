-- Behavioural checks for RLS and the server-side write path. Every check raises on failure.
\set ON_ERROR_STOP on
insert into auth.users values ('00000000-0000-0000-0000-000000000001'), ('00000000-0000-0000-0000-000000000002');
set role service_role;
select public.bootstrap_player('00000000-0000-0000-0000-000000000001', 'NeonRunner', '{"character":"char_masked"}', '{}');
select public.bootstrap_player('00000000-0000-0000-0000-000000000002', 'GhostRush', '{"character":"char_cyan"}', '{}');
insert into game_sessions(id, user_id, city_id, seed) values ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'tokyo', 42);
insert into tournaments(id, name, kind, starts_at, ends_at) values ('daily-test', 'Daily Dash', 'daily', now() - interval '1 hour', now() + interval '1 hour');

-- 1. A validated run is applied atomically
select public.apply_player_update('00000000-0000-0000-0000-000000000001', '{
  "coins": {"balance": 120, "expected_version": 0},
  "stats": {"xp": 300, "level": 2, "games_played": 1, "total_distance": 1500, "total_coins": 120, "total_score": 4000, "high_score": 4000,
            "powerups_used": 1, "jumps": 10, "slides": 5, "dodges": 40, "longest_run_ms": 90000, "missions_completed": 1, "city_stats": {"tokyo": {"games": 1}}},
  "ledger": [{"amount": 120, "reason": "run", "ref": "s1"}],
  "missions": [{"mission_id": "d_games_3", "period_key": "2026-11-18", "progress": 1}],
  "achievements": [{"achievement_id": "first_run", "unlocked_at": "2026-11-18T00:00:00Z"}],
  "session": {"id": "10000000-0000-0000-0000-000000000001", "status": "finished"},
  "score": {"session_id": "10000000-0000-0000-0000-000000000001", "city_id": "tokyo", "score": 4000, "distance": 1500, "coins": 120, "duration_ms": 90000},
  "tournaments": [{"tournament_id": "daily-test", "score": 4000}]
}'::jsonb);
do $$ begin
  if (select balance from coin_balances where user_id = '00000000-0000-0000-0000-000000000001') <> 120 then raise exception 'balance not applied'; end if;
  if (select count(*) from scores) <> 1 then raise exception 'score not inserted'; end if;
  if (select status from game_sessions where id = '10000000-0000-0000-0000-000000000001') <> 'finished' then raise exception 'session not finished'; end if;
end $$;

-- 2. Stale version is rejected (optimistic locking)
do $$ begin
  perform public.apply_player_update('00000000-0000-0000-0000-000000000001', '{"coins": {"balance": 999999, "expected_version": 0}}'::jsonb);
  raise exception 'stale version was accepted';
exception when serialization_failure then null; end $$;

-- 3. A session can only be finished once (no replaying a run for double rewards)
do $$ begin
  perform public.apply_player_update('00000000-0000-0000-0000-000000000001', '{"coins": {"balance": 240, "expected_version": 1},
    "session": {"id": "10000000-0000-0000-0000-000000000001", "status": "finished"}}'::jsonb);
  raise exception 'finished session was replayed';
exception when raise_exception then
  if sqlerrm <> 'session_not_active' then raise; end if;
end $$;

-- 4. Daily reward cannot be claimed twice on the same day
select public.apply_player_update('00000000-0000-0000-0000-000000000001', '{"coins": {"balance": 220, "expected_version": 1},
  "daily_claim": {"claimed_on": "2026-11-18", "day_index": 1, "coins": 100}}'::jsonb);
do $$ begin
  perform public.apply_player_update('00000000-0000-0000-0000-000000000001', '{"coins": {"balance": 320, "expected_version": 2},
    "daily_claim": {"claimed_on": "2026-11-18", "day_index": 2, "coins": 150}}'::jsonb);
  raise exception 'double daily claim accepted';
exception when unique_violation then null; end $$;
do $$ begin
  if (select balance from coin_balances where user_id = '00000000-0000-0000-0000-000000000001') <> 220 then raise exception 'failed claim leaked coins'; end if;
end $$;

-- 5. Negative balances are impossible
do $$ begin
  perform public.apply_player_update('00000000-0000-0000-0000-000000000002', '{"coins": {"balance": -5, "expected_version": 0}}'::jsonb);
  raise exception 'negative balance accepted';
exception when check_violation then null; end $$;

reset role;

-- 6. Players cannot write their own scores or coins, nor call the privileged functions
set role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000002', false);
do $$ begin
  insert into scores(user_id, session_id, city_id, score, distance, coins, duration_ms)
  values ('00000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001', 'tokyo', 99999999, 1, 1, 1);
  raise exception 'client inserted a score';
exception when insufficient_privilege then null; end $$;
do $$ begin
  update coin_balances set balance = 1000000 where user_id = '00000000-0000-0000-0000-000000000002';
  raise exception 'client updated coins';
exception when insufficient_privilege then null; end $$;
do $$ begin
  perform public.apply_player_update('00000000-0000-0000-0000-000000000002', '{"coins": {"balance": 1000000, "expected_version": 0}}'::jsonb);
  raise exception 'client called apply_player_update';
exception when insufficient_privilege then null; end $$;

-- 7. RLS: own private rows only; leaderboard data is public
do $$ begin
  if (select count(*) from coin_balances) <> 1 then raise exception 'saw other players balances'; end if;
  if (select count(*) from coin_transactions) <> 0 then raise exception 'saw other players transactions'; end if;
  if (select count(*) from profiles) <> 2 then raise exception 'profiles should be public'; end if;
end $$;
select * from public.leaderboard('alltime', null, 10);
select * from public.leaderboard_rank('00000000-0000-0000-0000-000000000001', 'daily', null);
select * from public.tournament_summary(array['daily-test'], '00000000-0000-0000-0000-000000000001');
reset role;
select 'ALL SCENARIOS PASSED' as result;
