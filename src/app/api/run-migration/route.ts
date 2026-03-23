import { NextResponse } from 'next/server'
import { Client } from 'pg'

async function tryConnect(config: object) {
  const client = new Client({ ...config, ssl: { rejectUnauthorized: false } })
  await client.connect()
  return client
}

export async function GET() {
  // Try multiple connection options
  const configs = [
    // Session mode pooler
    { host: 'aws-0-us-west-1.pooler.supabase.com', port: 5432, database: 'postgres', user: 'postgres.gnaodiflszwgkfxgidho', password: '4Supasecretproject!' },
    // Transaction mode pooler
    { host: 'aws-0-us-west-1.pooler.supabase.com', port: 6543, database: 'postgres', user: 'postgres.gnaodiflszwgkfxgidho', password: '4Supasecretproject!' },
    // Direct DB
    { host: 'db.gnaodiflszwgkfxgidho.supabase.co', port: 5432, database: 'postgres', user: 'postgres', password: '4Supasecretproject!' },
  ]

  let client = null
  let connectedVia = ''
  for (const [i, cfg] of configs.entries()) {
    try {
      client = await tryConnect(cfg)
      connectedVia = `option${i}`
      break
    } catch (e) {
      // try next
    }
  }

  if (!client) {
    return NextResponse.json({ success: false, error: 'Could not connect to database with any config' }, { status: 500 })
  }

  try {
    await client.query(`
      CREATE OR REPLACE FUNCTION public.is_trip_member(p_trip_id uuid, p_user_id uuid)
      RETURNS boolean LANGUAGE sql SECURITY DEFINER STABLE
      AS $func$
        SELECT EXISTS (SELECT 1 FROM trip_members WHERE trip_id = p_trip_id AND user_id = p_user_id);
      $func$
    `)
    await client.query(`
      CREATE OR REPLACE FUNCTION public.is_trip_organizer(p_trip_id uuid, p_user_id uuid)
      RETURNS boolean LANGUAGE sql SECURITY DEFINER STABLE
      AS $func$
        SELECT EXISTS (SELECT 1 FROM trip_members WHERE trip_id = p_trip_id AND user_id = p_user_id AND role = 'organizer');
      $func$
    `)
    await client.query('DROP POLICY IF EXISTS "Members can view trip members" ON trip_members')
    await client.query('DROP POLICY IF EXISTS "Organizers can manage members" ON trip_members')
    await client.query('DROP POLICY IF EXISTS "Members can view their trips" ON trips')
    await client.query('DROP POLICY IF EXISTS "Organizers can update trips" ON trips')
    await client.query('CREATE POLICY "Members can view trip members" ON trip_members FOR SELECT USING (public.is_trip_member(trip_id, auth.uid()))')
    await client.query('CREATE POLICY "Organizers can manage members" ON trip_members FOR INSERT WITH CHECK (public.is_trip_organizer(trip_id, auth.uid()) OR auth.uid() = user_id)')
    await client.query('CREATE POLICY "Members can view their trips" ON trips FOR SELECT USING (public.is_trip_member(id, auth.uid()))')
    await client.query('CREATE POLICY "Organizers can update trips" ON trips FOR UPDATE USING (public.is_trip_organizer(id, auth.uid()))')

    await client.end()
    return NextResponse.json({ success: true, message: 'Migration applied', via: connectedVia })
  } catch (err) {
    await client.end().catch(() => {})
    return NextResponse.json({ success: false, error: String(err) }, { status: 500 })
  }
}
