import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from "@/lib/supabase/server"
import { Trip } from '@/lib/types'
import { MapPin, Plus, Settings } from 'lucide-react'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  // Get all trips this user is a member of
  const { data: memberships } = await supabase
    .from('trip_members')
    .select('trip_id, role, trips(*)')
    .eq('user_id', user.id)
    .order('joined_at', { ascending: false })

  const trips = (memberships ?? []).map((m: {trip_id: string; role: string; trips: Trip | Trip[] | null}) => ({
    ...m.trips as Trip,
    myRole: m.role
  }))

  const activeTripCount = trips.filter(t => t.status !== 'completed' && t.status !== 'cancelled').length

  return (
    <div className="min-h-screen bg-stone-50">
      {/* Nav */}
      <nav className="bg-white border-b border-stone-200 px-6 py-4 flex items-center justify-between">
        <h1 className="text-xl font-bold tracking-tight">Troupe</h1>
        <div className="flex items-center gap-4">
          <span className="text-sm text-stone-500">{profile?.full_name ?? user.email}</span>
          <Link href="/account" className="text-stone-400 hover:text-stone-900 transition">
            <Settings size={18} />
          </Link>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-semibold">Your trips</h2>
            <p className="text-stone-500 text-sm mt-1">
              {activeTripCount > 0
                ? `${activeTripCount} trip${activeTripCount !== 1 ? 's' : ''} in planning`
                : 'No trips yet — start one below'}
            </p>
          </div>
          <Link
            href="/trips/new"
            className="flex items-center gap-2 bg-stone-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-stone-700 transition"
          >
            <Plus size={16} /> New trip
          </Link>
        </div>

        {/* Trip grid */}
        {trips.length === 0 ? (
          <div className="text-center py-20 text-stone-400">
            <p className="text-lg">No trips yet.</p>
            <p className="text-sm mt-1">Create one or join via an invite link.</p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {trips.map(trip => (
              <Link
                key={trip.id}
                href={`/trips/${trip.id}`}
                className="bg-white border border-stone-200 rounded-2xl p-6 hover:border-stone-400 hover:shadow-sm transition group"
              >
                <div className="flex items-start justify-between mb-3">
                  <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                    trip.status === 'confirmed' ? 'bg-green-100 text-green-700' :
                    trip.status === 'planning' ? 'bg-amber-100 text-amber-700' :
                    'bg-stone-100 text-stone-500'
                  }`}>
                    {trip.status}
                  </span>
                  {trip.myRole === 'organizer' && (
                    <span className="text-xs text-stone-400">Organizer</span>
                  )}
                </div>
                <h3 className="font-semibold text-lg group-hover:text-stone-700 transition">{trip.name}</h3>
                {trip.destination && (
                  <p className="text-stone-500 text-sm flex items-center gap-1 mt-1">
                    <MapPin size={12} /> {trip.destination}
                  </p>
                )}
                {trip.start_date && trip.end_date && (
                  <p className="text-stone-400 text-xs mt-2">
                    {new Date(trip.start_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    {' — '}
                    {new Date(trip.end_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </p>
                )}
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
