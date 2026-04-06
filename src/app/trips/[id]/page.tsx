import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Calendar, Map, Users, ArrowLeft, CheckCircle2, SlidersHorizontal } from 'lucide-react'
import InviteSection from '@/components/trips/InviteSection'

export default async function TripPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: trip } = await supabase
    .from('trips').select('*').eq('id', id).single()
  if (!trip) notFound()

  const { data: membership } = await supabase
    .from('trip_members').select('role').eq('trip_id', id).eq('user_id', user.id).single()
  if (!membership) redirect('/dashboard')

  const { data: members } = await supabase
    .from('trip_members')
    .select('*, profile:profiles(full_name, avatar_url)')
    .eq('trip_id', id)

  const { data: availBlocks } = await supabase
    .from('availability_blocks')
    .select('*')
    .eq('trip_id', id)

  // Fetch existing valid invite
  const { data: existingInvite } = await supabase
    .from('trip_invites')
    .select('invite_code')
    .eq('trip_id', id)
    .gt('expires_at', new Date().toISOString())
    .lt('use_count', 50)
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  const memberCount = members?.length ?? 0
  const respondedCount = new Set(availBlocks?.map(b => b.user_id) ?? []).size
  const userHasAvailability = availBlocks?.some(b => b.user_id === user.id) ?? false

  return (
    <div className="min-h-screen bg-stone-50">
      <nav className="bg-white border-b border-stone-200 px-6 py-4 flex items-center gap-4">
        <Link href="/dashboard" className="text-stone-400 hover:text-stone-900 transition">
          <ArrowLeft size={20} />
        </Link>
        <h1 className="text-xl font-bold tracking-tight">Troupe</h1>
      </nav>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-10">

        {/* Trip header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <span className={`text-xs font-medium px-2 py-1 rounded-full ${
              trip.status === 'confirmed' ? 'bg-green-100 text-green-700' :
              trip.status === 'planning' ? 'bg-amber-100 text-amber-700' :
              'bg-stone-100 text-stone-500'
            }`}>{trip.status}</span>
            {membership.role === 'organizer' && (
              <span className="text-xs text-stone-400">You&apos;re the organizer</span>
            )}
          </div>
          <h2 className="text-3xl font-bold">{trip.name}</h2>
          {trip.destination && (
            <p className="text-stone-500 flex items-center gap-1 mt-1">
              <Map size={14} /> {trip.destination}
            </p>
          )}
          {trip.description && (
            <p className="text-stone-600 mt-3 max-w-xl">{trip.description}</p>
          )}
        </div>

        {/* Status cards */}
        <div className="grid sm:grid-cols-2 gap-4 mb-8">
          <div className="bg-white border border-stone-200 rounded-2xl p-5">
            <div className="flex items-center gap-2 text-stone-400 mb-1">
              <Users size={14} /> <span className="text-xs uppercase tracking-wide">Members & Availability</span>
            </div>
            <p className="text-2xl font-semibold">{memberCount}</p>
            <p className="text-xs text-stone-400 mt-1">{respondedCount} have added availability</p>
          </div>

          <div className="bg-white border border-stone-200 rounded-2xl p-5">
            <div className="flex items-center gap-2 text-stone-400 mb-1">
              <Calendar size={14} /> <span className="text-xs uppercase tracking-wide">Dates</span>
            </div>
            {trip.start_date ? (
              <>
                <p className="text-sm font-semibold">
                  {new Date(trip.start_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  {' — '}
                  {new Date(trip.end_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </p>
                <p className="text-xs text-stone-400 mt-1">Confirmed</p>
              </>
            ) : (
              <p className="text-stone-400 text-sm">TBD — add availability to find windows</p>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="grid sm:grid-cols-3 gap-4 mb-8">
          <Link
            href={`/trips/${trip.id}/availability`}
            className="bg-white border border-stone-200 rounded-2xl p-6 hover:border-stone-400 hover:shadow-sm transition group"
          >
            <Calendar size={24} className="text-stone-400 mb-3" />
            <h3 className="font-semibold">Availability</h3>
            <p className="text-sm text-stone-500 mt-1">
              Mark when you&apos;re free, see group windows
            </p>
          </Link>

          <Link
            href={`/trips/${trip.id}/preferences`}
            className="bg-white border border-stone-200 rounded-2xl p-6 hover:border-stone-400 hover:shadow-sm transition group"
          >
            <SlidersHorizontal size={24} className="text-stone-400 mb-3" />
            <h3 className="font-semibold">Preferences</h3>
            <p className="text-sm text-stone-500 mt-1">
              Set trip length, budget, and vibe
            </p>
          </Link>

          <Link
            href={`/trips/${trip.id}/itinerary`}
            className="bg-white border border-stone-200 rounded-2xl p-6 hover:border-stone-400 hover:shadow-sm transition group"
          >
            <Map size={24} className="text-stone-400 mb-3" />
            <h3 className="font-semibold">Itinerary</h3>
            <p className="text-sm text-stone-500 mt-1">
              Build the day-by-day plan together
            </p>
          </Link>
        </div>

        {/* Invite section */}
        <InviteSection
          tripId={trip.id}
          initialCode={existingInvite?.invite_code ?? null}
        />
      </main>
    </div>
  )
}
