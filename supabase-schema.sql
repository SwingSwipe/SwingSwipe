-- Run this in your Supabase SQL editor

-- Users/Profiles
create table if not exists profiles (
  id uuid references auth.users primary key,
  name text not null,
  username text unique,
  avatar_url text,
  location text,
  home_course text,
  handicap_range text,
  avg_score numeric,
  availability text[],
  pace text,
  cart_or_walk text,
  vibe_tags text[],
  bio_prompt text,
  latitude numeric,
  longitude numeric,
  created_at timestamp default now()
);

-- Round Listings (Groups tab)
create table if not exists round_listings (
  id uuid primary key default gen_random_uuid(),
  host_id uuid references profiles(id),
  course_name text not null,
  date date not null,
  tee_time time not null,
  spots_total int not null,
  spots_filled int default 1,
  vibe text,
  skill_range text,
  notes text,
  latitude numeric,
  longitude numeric,
  is_active boolean default true,
  created_at timestamp default now()
);

-- Round Requests
create table if not exists round_requests (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid references round_listings(id),
  requester_id uuid references profiles(id),
  status text default 'pending',
  created_at timestamp default now()
);

-- Round Chat Messages
create table if not exists round_messages (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid references round_listings(id),
  user_id uuid references profiles(id),
  content text not null,
  created_at timestamp default now()
);

-- Matches (with AI score cache)
create table if not exists matches (
  id uuid primary key default gen_random_uuid(),
  user_1_id uuid references profiles(id),
  user_2_id uuid references profiles(id),
  user_1_swiped text,
  user_2_swiped text,
  is_match boolean default false,
  match_score int,
  match_reason text,
  created_at timestamp default now(),
  unique(user_1_id, user_2_id)
);

-- Friends
create table if not exists friends (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id),
  friend_id uuid references profiles(id),
  created_at timestamp default now(),
  unique(user_id, friend_id)
);

-- Round Logs (Rounds tab)
create table if not exists round_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id),
  course_name text not null,
  date date not null,
  score int not null,
  playing_with uuid references profiles(id),
  notes text,
  created_at timestamp default now()
);

-- Deals (Deals tab)
create table if not exists deals (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  brand text,
  category text,
  price numeric not null,
  original_price numeric,
  discount_pct int,
  source text,
  affiliate_url text not null,
  image_url text,
  condition text,
  is_active boolean default true,
  created_at timestamp default now()
);

-- Enable Row Level Security
alter table profiles enable row level security;
alter table round_listings enable row level security;
alter table round_requests enable row level security;
alter table round_messages enable row level security;
alter table matches enable row level security;
alter table friends enable row level security;
alter table round_logs enable row level security;
alter table deals enable row level security;

-- RLS Policies
create policy "Public profiles are viewable by everyone" on profiles for select using (true);
create policy "Users can insert their own profile" on profiles for insert with check (auth.uid() = id);
create policy "Users can update own profile" on profiles for update using (auth.uid() = id);

create policy "Round listings viewable by all" on round_listings for select using (true);
create policy "Authenticated users can insert listings" on round_listings for insert with check (auth.uid() = host_id);
create policy "Hosts can update their listings" on round_listings for update using (auth.uid() = host_id);

create policy "Round requests viewable by participants" on round_requests for select using (auth.uid() = requester_id or auth.uid() in (select host_id from round_listings where id = listing_id));
create policy "Authenticated users can insert requests" on round_requests for insert with check (auth.uid() = requester_id);
create policy "Hosts can update request status" on round_requests for update using (auth.uid() in (select host_id from round_listings where id = listing_id));

create policy "Messages viewable by all authenticated" on round_messages for select using (auth.uid() is not null);
create policy "Authenticated users can insert messages" on round_messages for insert with check (auth.uid() = user_id);

create policy "Matches viewable by participants" on matches for select using (auth.uid() = user_1_id or auth.uid() = user_2_id);
create policy "Authenticated users can insert matches" on matches for insert with check (auth.uid() = user_1_id);
create policy "Participants can update matches" on matches for update using (auth.uid() = user_1_id or auth.uid() = user_2_id);

create policy "Friends viewable by user" on friends for select using (auth.uid() = user_id);
create policy "Authenticated users can insert friends" on friends for insert with check (auth.uid() = user_id or auth.uid() = friend_id);

create policy "Users can view own round logs" on round_logs for select using (auth.uid() = user_id);
create policy "Users can insert own round logs" on round_logs for insert with check (auth.uid() = user_id);

create policy "Deals are public" on deals for select using (true);

-- Enable realtime for chat
alter publication supabase_realtime add table round_messages;
alter publication supabase_realtime add table round_listings;

-- Crew Weekly Challenges
create table if not exists public.crew_challenges (
  id uuid primary key default gen_random_uuid(),
  crew_id uuid not null references public.crews(id) on delete cascade,
  created_by uuid not null references public.profiles(id),
  title text not null,
  challenge_type text not null default 'lowest_9',
  status text not null default 'active' check (status in ('active', 'closed')),
  created_at timestamp default now()
);

alter table public.crew_challenges
add column if not exists closed_at timestamp,
add column if not exists awarded_by uuid references public.profiles(id);

alter table public.round_logs
add column if not exists holes int default 18;

create unique index if not exists crew_challenges_one_active_per_crew
on public.crew_challenges (crew_id)
where status = 'active';

create table if not exists public.crew_challenge_points (
  id uuid primary key default gen_random_uuid(),
  challenge_id uuid not null references public.crew_challenges(id) on delete cascade,
  crew_id uuid not null references public.crews(id) on delete cascade,
  user_id uuid not null references public.profiles(id),
  points int not null default 0,
  rank int,
  reason text,
  awarded_at timestamp default now(),
  unique(challenge_id, user_id)
);

alter table public.crew_challenges enable row level security;
alter table public.crew_challenge_points enable row level security;

drop policy if exists "Crew members can view member round logs" on public.round_logs;
create policy "Crew members can view member round logs"
on public.round_logs for select
using (
  auth.uid() = user_id
  or exists (
    select 1
    from public.crew_members viewer
    join public.crew_members player on player.crew_id = viewer.crew_id
    where viewer.user_id = auth.uid()
      and player.user_id = round_logs.user_id
  )
);

drop policy if exists "Crew members can view challenges" on public.crew_challenges;
create policy "Crew members can view challenges"
on public.crew_challenges for select
using (
  exists (
    select 1
    from public.crew_members
    where crew_members.crew_id = crew_challenges.crew_id
      and crew_members.user_id = auth.uid()
  )
);

drop policy if exists "Crew members can create challenges" on public.crew_challenges;
create policy "Crew members can create challenges"
on public.crew_challenges for insert
with check (
  auth.uid() = created_by
  and exists (
    select 1
    from public.crew_members
    where crew_members.crew_id = crew_challenges.crew_id
      and crew_members.user_id = auth.uid()
  )
);

drop policy if exists "Crew members can update challenges" on public.crew_challenges;
create policy "Crew members can update challenges"
on public.crew_challenges for update
using (
  exists (
    select 1
    from public.crew_members
    where crew_members.crew_id = crew_challenges.crew_id
      and crew_members.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.crew_members
    where crew_members.crew_id = crew_challenges.crew_id
      and crew_members.user_id = auth.uid()
  )
);

drop policy if exists "Crew members can view challenge points" on public.crew_challenge_points;
create policy "Crew members can view challenge points"
on public.crew_challenge_points for select
using (
  exists (
    select 1
    from public.crew_members
    where crew_members.crew_id = crew_challenge_points.crew_id
      and crew_members.user_id = auth.uid()
  )
);

drop policy if exists "Crew members can award challenge points" on public.crew_challenge_points;
create policy "Crew members can award challenge points"
on public.crew_challenge_points for insert
with check (
  exists (
    select 1
    from public.crew_members
    where crew_members.crew_id = crew_challenge_points.crew_id
      and crew_members.user_id = auth.uid()
  )
);

drop policy if exists "Crew members can update challenge points" on public.crew_challenge_points;
create policy "Crew members can update challenge points"
on public.crew_challenge_points for update
using (
  exists (
    select 1
    from public.crew_members
    where crew_members.crew_id = crew_challenge_points.crew_id
      and crew_members.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.crew_members
    where crew_members.crew_id = crew_challenge_points.crew_id
      and crew_members.user_id = auth.uid()
  )
);
