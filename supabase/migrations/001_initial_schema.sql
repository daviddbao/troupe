-- Enable UUID generation
create extension if not exists "pgcrypto";

-- ─────────────────────────────────────────
-- USERS (extends Supabase auth.users)
-- ─────────────────────────────────────────
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  avatar_url text,
  timezone text default 'America/Los_Angeles',
  created_at timestamptz default now()
);

alter table public.profiles enable row level security;

create policy "Users can view their own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can update their own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name, avatar_url)
  values (
    new.id,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'avatar_url'
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ─────────────────────────────────────────
-- TRIPS
-- ─────────────────────────────────────────
create table public.trips (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  destination text,
  status text default 'planning' check (status in ('planning', 'confirmed', 'completed', 'cancelled')),
  start_date date,
  end_date date,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.trips enable row level security;

-- ─────────────────────────────────────────
-- TRIP MEMBERS
-- ─────────────────────────────────────────
create table public.trip_members (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid references public.trips(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete cascade,
  role text default 'member' check (role in ('organizer', 'member')),
  joined_at timestamptz default now(),
  unique(trip_id, user_id)
);

alter table public.trip_members enable row level security;

-- RLS: trip members can see their trips
create policy "Members can view their trips"
  on public.trips for select
  using (
    id in (
      select trip_id from public.trip_members where user_id = auth.uid()
    )
  );

create policy "Organizers can update trips"
  on public.trips for update
  using (
    id in (
      select trip_id from public.trip_members
      where user_id = auth.uid() and role = 'organizer'
    )
  );

create policy "Authenticated users can create trips"
  on public.trips for insert
  with check (auth.uid() = created_by);

create policy "Members can view trip members"
  on public.trip_members for select
  using (
    trip_id in (
      select trip_id from public.trip_members where user_id = auth.uid()
    )
  );

create policy "Organizers can manage members"
  on public.trip_members for insert
  with check (
    trip_id in (
      select trip_id from public.trip_members
      where user_id = auth.uid() and role = 'organizer'
    )
    or auth.uid() = user_id  -- allow self-join via invite
  );

-- ─────────────────────────────────────────
-- AVAILABILITY BLOCKS
-- ─────────────────────────────────────────
create table public.availability_blocks (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid references public.trips(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete cascade,
  start_date date not null,
  end_date date not null,
  type text default 'available' check (type in ('available', 'unavailable', 'preferred')),
  note text,
  created_at timestamptz default now()
);

alter table public.availability_blocks enable row level security;

create policy "Members can manage their availability"
  on public.availability_blocks for all
  using (
    trip_id in (
      select trip_id from public.trip_members where user_id = auth.uid()
    )
  );

-- ─────────────────────────────────────────
-- ITINERARY ITEMS
-- ─────────────────────────────────────────
create table public.itinerary_items (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid references public.trips(id) on delete cascade,
  day_index integer not null,  -- 0-based day of the trip
  title text not null,
  description text,
  location text,
  start_time time,
  end_time time,
  category text default 'activity' check (category in ('transport', 'accommodation', 'activity', 'food', 'other')),
  created_by uuid references public.profiles(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.itinerary_items enable row level security;

create policy "Members can view itinerary"
  on public.itinerary_items for select
  using (
    trip_id in (
      select trip_id from public.trip_members where user_id = auth.uid()
    )
  );

create policy "Members can add itinerary items"
  on public.itinerary_items for insert
  with check (
    trip_id in (
      select trip_id from public.trip_members where user_id = auth.uid()
    )
    and auth.uid() = created_by
  );

create policy "Creators and organizers can update items"
  on public.itinerary_items for update
  using (
    created_by = auth.uid()
    or trip_id in (
      select trip_id from public.trip_members
      where user_id = auth.uid() and role = 'organizer'
    )
  );

-- ─────────────────────────────────────────
-- TRIP INVITES
-- ─────────────────────────────────────────
create table public.trip_invites (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid references public.trips(id) on delete cascade,
  invite_code text unique default encode(gen_random_bytes(6), 'hex'),
  created_by uuid references public.profiles(id),
  expires_at timestamptz default (now() + interval '7 days'),
  max_uses integer default 10,
  use_count integer default 0,
  created_at timestamptz default now()
);

alter table public.trip_invites enable row level security;

create policy "Members can view invites"
  on public.trip_invites for select
  using (
    trip_id in (
      select trip_id from public.trip_members where user_id = auth.uid()
    )
  );

create policy "Organizers can create invites"
  on public.trip_invites for insert
  with check (
    trip_id in (
      select trip_id from public.trip_members
      where user_id = auth.uid() and role = 'organizer'
    )
  );

-- Updated_at trigger
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger trips_updated_at before update on public.trips
  for each row execute procedure update_updated_at();

create trigger itinerary_updated_at before update on public.itinerary_items
  for each row execute procedure update_updated_at();

