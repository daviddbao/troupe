import { NextResponse } from 'next/server'
import { Client } from 'pg'

export async function GET() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  })

  try {
    await client.connect()

    await client.query(`
      CREATE OR REPLACE FUNCTION public.is_trip_member(p_trip_id uuid, p_user_id uuid)
      RETURNS boolean
      LANGUAGE sql
      SECURITY DEFINER
      STABLE
      AS $func$
        SELECT EXISTS (
          SELECT 1 FROM trip_members
          WHERE trip_id = p_trip_id AND user_id = p_user_id
        );
      $func$;
    `)

    await client.query(`
      CREATE OR REPLACE FUNCTION public.is_trip_organizer(p_trip_id uuid, p_user_id uuid)
      RETURNS boolean
      LANGUAGE sql
      SECURITY DEFINER
      STABLE
      AS $func$
        SELECT EXISTS (
          SELECT 1 FROM trip_members
          WHERE trip_id = p_trip_id AND user_id = p_user_id AND role = 'organizer'
        );
      $func$;
    `)

    await client.query(`DROP POLICY IF EXISTS "Members can view trip members" ON trip_members;`)
    await client.query(`DROP POLICY IF EXISTS "Organizers can manage members" ON trip_members;`)
    await client.query(`DROP POLICY IF EXISTS "Members can view their trips" ON trips;`)
    await client.query(`DROP POLICY IF EXISTS "Organizers can update trips" ON trips;`)

    await client.query(`
      CREATE POLICY "Members can view trip members"
        ON trip_members FOR SELECT
        USING (public.is_trip_member(trip_id, auth.uid()));
    `)

    await client.query(`
      CREATE POLICY "Organizers can manage members"
        ON trip_members FOR INSERT
        WITH CHECK (
          public.is_trip_organizer(trip_id, auth.uid())
          OR auth.uid() = user_id
        );
    `)

    await client.query(`
      CREATE POLICY "Members can view their trips"
        ON trips FOR SELECT
        USING (public.is_trip_member(id, auth.uid()));
    `)

    await client.query(`
      CREATE POLICY "Organizers can update trips"
        ON trips FOR UPDATE
        USING (public.is_trip_organizer(id, auth.uid()));
    `)

    await client.end()
    return NextResponse.json({ success: true, message: 'Migration applied successfully' })
  } catch (err) {
    await client.end().catch(() => {})
    return NextResponse.json({ success: false, error: String(err) }, { status: 500 })
  }
}
