import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import TroupeHeader from '@/components/layout/TroupeHeader'
import ItineraryGridView from '@/components/itinerary/ItineraryGridView'

export default async function ItineraryPage({ params }: { params: Promise<{ id: string }> }) {
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

  const { data: items } = await supabase
    .from('itinerary_items')
    .select('*')
    .eq('trip_id', id)
    .order('day_index', { ascending: true })
    .order('start_time', { ascending: true })

  return (
    <div className="min-h-screen bg-stone-50">
      <TroupeHeader
        showBack
        backHref={`/trips/${id}`}
        title={trip.name}
        subtitle="Itinerary"
      />

      <main className="max-w-3xl mx-auto px-6 py-10">
        <div className="mb-8">
          <h2 className="text-2xl font-semibold mb-1">Trip itinerary</h2>
          <p className="text-stone-500 text-sm">
            {trip.start_date && trip.end_date
              ? `${new Date(trip.start_date).toLocaleDateString('en-US', { month: 'long', day: 'numeric' })} — ${new Date(trip.end_date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}`
              : 'Dates not confirmed yet — add items by day'}
          </p>
        </div>

        <ItineraryGridView
          tripId={id}
          userId={user.id}
          items={items ?? []}
          startDate={trip.start_date}
          endDate={trip.end_date}
        />
      </main>
    </div>
  )
}
