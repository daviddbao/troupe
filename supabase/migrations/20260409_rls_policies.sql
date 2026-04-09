-- RLS Policies for all Troupe tables
-- Applied: 2026-04-09

-- ─────────────────────────────────────────
-- POLICIES: trips table
-- ─────────────────────────────────────────

-- Allow authenticated users to SELECT trips they're a member of
create policy "Members can select their trips"
  on public.trips for select
  using (
    id in (
      select trip_id from public.trip_members where user_id = auth.uid()
    )
  );

-- Allow authenticated users to INSERT new trips (become creator)
create policy "Authenticated users can create trips"
  on public.trips for insert
  with check (
    auth.uid() = created_by
  );

-- Allow trip admins/creators to UPDATE trips
create policy "Trip admins can update trips"
  on public.trips for update
  using (
    id in (
      select trip_id from public.trip_members
      where user_id = auth.uid() and role = 'organizer'
    )
  );

-- Allow trip admins/creators to DELETE trips
create policy "Trip admins can delete trips"
  on public.trips for delete
  using (
    id in (
      select trip_id from public.trip_members
      where user_id = auth.uid() and role = 'organizer'
    )
  );

-- ─────────────────────────────────────────
-- POLICIES: trip_members table
-- ─────────────────────────────────────────

-- Allow authenticated users who are members to SELECT other members in the same trip
create policy "Trip members can view members"
  on public.trip_members for select
  using (
    trip_id in (
      select trip_id from public.trip_members where user_id = auth.uid()
    )
  );

-- Allow authenticated users to INSERT themselves, OR trip admin can insert others
create policy "Users can join trips or admin can add members"
  on public.trip_members for insert
  with check (
    auth.uid() = user_id  -- User joins themselves
    or
    trip_id in (
      select trip_id from public.trip_members
      where user_id = auth.uid() and role = 'organizer'
    )  -- Admin adds someone
  );

-- Allow trip admin to remove others; users can remove themselves
create policy "Trip admins can remove members"
  on public.trip_members for delete
  using (
    auth.uid() = user_id  -- User removes themselves
    or
    trip_id in (
      select trip_id from public.trip_members
      where user_id = auth.uid() and role = 'organizer'
    )  -- Admin removes someone
  );

-- ─────────────────────────────────────────
-- POLICIES: availability_blocks table
-- ─────────────────────────────────────────

-- Allow authenticated trip members to SELECT availability blocks for their trip
create policy "Trip members can view availability"
  on public.availability_blocks for select
  using (
    trip_id in (
      select trip_id from public.trip_members where user_id = auth.uid()
    )
  );

-- Allow authenticated trip members to INSERT their own availability
create policy "Trip members can add availability"
  on public.availability_blocks for insert
  with check (
    trip_id in (
      select trip_id from public.trip_members where user_id = auth.uid()
    )
    and auth.uid() = user_id
  );

-- Allow only the user themselves to UPDATE/DELETE their availability
create policy "Users can update their own availability"
  on public.availability_blocks for update
  using (
    auth.uid() = user_id
  );

create policy "Users can delete their own availability"
  on public.availability_blocks for delete
  using (
    auth.uid() = user_id
  );

-- ─────────────────────────────────────────
-- POLICIES: itinerary_items table
-- ─────────────────────────────────────────

-- Allow authenticated trip members to SELECT itinerary items
create policy "Trip members can view itinerary"
  on public.itinerary_items for select
  using (
    trip_id in (
      select trip_id from public.trip_members where user_id = auth.uid()
    )
  );

-- Allow authenticated trip members to INSERT itinerary items
create policy "Trip members can add itinerary items"
  on public.itinerary_items for insert
  with check (
    trip_id in (
      select trip_id from public.trip_members where user_id = auth.uid()
    )
  );

-- Allow creator OR trip admin to UPDATE itinerary items
create policy "Creator or admin can update itinerary"
  on public.itinerary_items for update
  using (
    created_by = auth.uid()
    or
    trip_id in (
      select trip_id from public.trip_members
      where user_id = auth.uid() and role = 'organizer'
    )
  );

-- Allow creator OR trip admin to DELETE itinerary items
create policy "Creator or admin can delete itinerary"
  on public.itinerary_items for delete
  using (
    created_by = auth.uid()
    or
    trip_id in (
      select trip_id from public.trip_members
      where user_id = auth.uid() and role = 'organizer'
    )
  );

-- ─────────────────────────────────────────
-- POLICIES: profiles table
-- ─────────────────────────────────────────

-- Allow any authenticated user to SELECT profiles
create policy "Authenticated users can view all profiles"
  on public.profiles for select
  using (
    auth.role() = 'authenticated'
  );

-- Allow users to UPDATE only their own profile
create policy "Users can update their own profile"
  on public.profiles for update
  using (
    auth.uid() = id
  );

-- ─────────────────────────────────────────
-- POLICIES: trip_invites table
-- ─────────────────────────────────────────

-- Allow trip members to VIEW invites for their trip
create policy "Trip members can view invites"
  on public.trip_invites for select
  using (
    trip_id in (
      select trip_id from public.trip_members where user_id = auth.uid()
    )
  );

-- Allow trip admins to CREATE invites
create policy "Trip admins can create invites"
  on public.trip_invites for insert
  with check (
    trip_id in (
      select trip_id from public.trip_members
      where user_id = auth.uid() and role = 'organizer'
    )
  );
