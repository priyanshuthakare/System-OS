-- Requests are visible only to the two participants. Only the recipient can accept.
create table public.friendships (
  sender uuid not null references auth.users(id) on delete cascade,
  recipient uuid not null references auth.users(id) on delete cascade,
  accepted boolean not null default false,
  primary key (sender, recipient),
  check (sender <> recipient)
);
create unique index friendship_pair on public.friendships
  (least(sender,recipient), greatest(sender,recipient));
alter table public.friendships enable row level security;
revoke all on public.friendships from public, anon, authenticated;
grant select, delete, insert(sender,recipient), update(accepted) on public.friendships to authenticated;
create policy participants_read on public.friendships for select to authenticated
  using (auth.uid() in (sender,recipient));
create policy send_request on public.friendships for insert to authenticated
  with check (sender=auth.uid() and not accepted);
create policy accept_request on public.friendships for update to authenticated
  using (recipient=auth.uid() and not accepted) with check (recipient=auth.uid() and accepted);
create policy remove_connection on public.friendships for delete to authenticated
  using (auth.uid() in (sender,recipient));

create index task_logs_week on public.task_logs(completed_at,user_id);
create index leaderboard_name on public.leaderboard_snapshots(user_id,captured_at desc);
create function public.weekly_board(friends_only boolean default false)
returns table(user_id uuid, username text, points numeric, board_rank bigint)
language sql stable security definer set search_path = '' as $$
  with circle as (
    select auth.uid() as id
    union select case when sender=auth.uid() then recipient else sender end
    from public.friendships where accepted and auth.uid() in (sender,recipient)
  ), scores as (
    select t.user_id, sum(t.xp_awarded) as points from public.task_logs t
    where t.completed_at between now() - interval '7 days' and now()
      and (not friends_only or t.user_id in (select id from circle))
    group by t.user_id
  ), members as (
    select s.user_id from scores s union select id from circle where friends_only
  ), ranked as (
    select m.user_id, coalesce(s.points,0) as points,
      rank() over(order by coalesce(s.points,0) desc) as board_rank
    from members m left join scores s using(user_id)
  ), top_rows as (
    select * from ranked order by points desc,user_id limit 10
  ), result as (
    select * from top_rows union select * from ranked where user_id=auth.uid()
  )
  select r.user_id, (select l.username from public.leaderboard_snapshots l
    where l.user_id=r.user_id order by captured_at desc,id desc limit 1),r.points,r.board_rank
  from result r order by r.points desc,r.user_id
$$;
revoke all on function public.weekly_board(boolean) from public, anon;
grant execute on function public.weekly_board(boolean) to authenticated;

