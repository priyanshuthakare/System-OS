-- Progression engine Supabase tables
-- Run this migration against your Supabase project to enable remote sync and multi-user leaderboard

-- Leaderboard snapshots (pushed from local after each task completion)
create table if not exists public.leaderboard_snapshots (
    id text primary key,
    user_id uuid not null references auth.users(id) on delete cascade,
    username text,
    rank_label text,
    level integer default 1,
    score numeric default 0,
    weekly_score numeric default 0,
    monthly_score numeric default 0,
    captured_at timestamptz not null default now(),
    board_type text default 'global',
    board_scope text default 'global'
);

create index if not exists idx_leaderboard_user on public.leaderboard_snapshots(user_id);
create index if not exists idx_leaderboard_captured on public.leaderboard_snapshots(captured_at desc);
create index if not exists idx_leaderboard_board on public.leaderboard_snapshots(board_type, captured_at desc);

alter table public.leaderboard_snapshots enable row level security;

create policy "Users can insert own snapshots"
    on public.leaderboard_snapshots for insert
    with check (auth.uid() = user_id);

create policy "Users can update own snapshots"
    on public.leaderboard_snapshots for update
    using (auth.uid() = user_id);

create policy "All authenticated users can read leaderboard"
    on public.leaderboard_snapshots for select
    using (auth.role() = 'authenticated');


-- Task logs (pushed from local for cross-device sync)
create table if not exists public.task_logs (
    id text primary key,
    user_id uuid not null references auth.users(id) on delete cascade,
    task_id text not null,
    completed_at timestamptz not null default now(),
    day_key text not null,
    xp_awarded numeric default 0,
    repetition_count_same_day integer default 0,
    bonus_applied jsonb
);

create index if not exists idx_task_logs_user on public.task_logs(user_id);
create index if not exists idx_task_logs_day on public.task_logs(user_id, day_key);

alter table public.task_logs enable row level security;

create policy "Users can insert own task logs"
    on public.task_logs for insert
    with check (auth.uid() = user_id);

create policy "Users can read own task logs"
    on public.task_logs for select
    using (auth.uid() = user_id);


-- Titles (pushed from local on unlock)
create table if not exists public.titles (
    id text primary key,
    user_id uuid not null references auth.users(id) on delete cascade,
    name text not null,
    unlock_condition jsonb,
    unlocked_at timestamptz not null default now()
);

create index if not exists idx_titles_user on public.titles(user_id);

alter table public.titles enable row level security;

create policy "Users can insert own titles"
    on public.titles for insert
    with check (auth.uid() = user_id);

create policy "Users can read own titles"
    on public.titles for select
    using (auth.uid() = user_id);


-- Boss attempts (pushed from local on completion)
create table if not exists public.boss_attempts (
    id text primary key,
    user_id uuid not null references auth.users(id) on delete cascade,
    boss_id text not null,
    status text default 'in_progress',
    reward_xp numeric default 0,
    reward_rank_boost numeric default 0,
    started_at timestamptz,
    completed_at timestamptz
);

create index if not exists idx_boss_attempts_user on public.boss_attempts(user_id);

alter table public.boss_attempts enable row level security;

create policy "Users can insert own boss attempts"
    on public.boss_attempts for insert
    with check (auth.uid() = user_id);

create policy "Users can update own boss attempts"
    on public.boss_attempts for update
    using (auth.uid() = user_id);

create policy "Users can read own boss attempts"
    on public.boss_attempts for select
    using (auth.uid() = user_id);
