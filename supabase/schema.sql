create extension if not exists pgcrypto;

create table if not exists public.play_rooms (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  match_target integer not null default 5,
  status text not null default 'open' check (status in ('open', 'playing', 'closed')),
  game_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.play_room_seats (
  room_id uuid not null references public.play_rooms(id) on delete cascade,
  seat text not null check (seat in ('white', 'black')),
  player_id text,
  player_name text,
  ready boolean not null default false,
  updated_at timestamptz not null default now(),
  primary key (room_id, seat)
);

create table if not exists public.online_games (
  id uuid primary key default gen_random_uuid(),
  room_id uuid references public.play_rooms(id) on delete set null,
  state jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists play_rooms_touch_updated_at on public.play_rooms;
create trigger play_rooms_touch_updated_at
before update on public.play_rooms
for each row execute function public.touch_updated_at();

drop trigger if exists play_room_seats_touch_updated_at on public.play_room_seats;
create trigger play_room_seats_touch_updated_at
before update on public.play_room_seats
for each row execute function public.touch_updated_at();

drop trigger if exists online_games_touch_updated_at on public.online_games;
create trigger online_games_touch_updated_at
before update on public.online_games
for each row execute function public.touch_updated_at();

alter table public.play_rooms enable row level security;
alter table public.play_room_seats enable row level security;
alter table public.online_games enable row level security;

drop policy if exists "Public read play rooms" on public.play_rooms;
create policy "Public read play rooms"
on public.play_rooms for select
to anon
using (true);

drop policy if exists "Public update play rooms" on public.play_rooms;
create policy "Public update play rooms"
on public.play_rooms for update
to anon
using (true)
with check (true);

drop policy if exists "Public read seats" on public.play_room_seats;
create policy "Public read seats"
on public.play_room_seats for select
to anon
using (true);

drop policy if exists "Public update seats" on public.play_room_seats;
create policy "Public update seats"
on public.play_room_seats for update
to anon
using (true)
with check (true);

drop policy if exists "Public read online games" on public.online_games;
create policy "Public read online games"
on public.online_games for select
to anon
using (true);

drop policy if exists "Public insert online games" on public.online_games;
create policy "Public insert online games"
on public.online_games for insert
to anon
with check (true);

drop policy if exists "Public update online games" on public.online_games;
create policy "Public update online games"
on public.online_games for update
to anon
using (true)
with check (true);

insert into public.play_rooms (name, match_target)
values
  ('Olive Table', 5),
  ('Walnut Table', 5),
  ('Harbor Table', 3),
  ('Evening Table', 3)
on conflict do nothing;

insert into public.play_room_seats (room_id, seat)
select room.id, seat.value
from public.play_rooms room
cross join (values ('white'), ('black')) as seat(value)
on conflict (room_id, seat) do nothing;

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'play_rooms'
  ) then
    alter publication supabase_realtime add table public.play_rooms;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'play_room_seats'
  ) then
    alter publication supabase_realtime add table public.play_room_seats;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'online_games'
  ) then
    alter publication supabase_realtime add table public.online_games;
  end if;
end $$;
