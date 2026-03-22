import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { ArrowLeft } from 'lucide-react'
import ItineraryView from '@/components/itinerary/ItineraryView'

export default async function ItineraryPage({ params }: { params: { id: string } }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: trip } = await supabase
    .from('trips').select('*').eq('id', params.id).single()
  if (!trip) notFound()

  const { data: membership } = await supabase
    .from('trip_members').select('role').eq('trip_id', params.id).eq('user_id', user.id).single()
  if (!membership) redirect('/dashboard')

  const { data: items } = await supabase
    .from('itinerary_items')
    .select('*')
    .eq('trip_id', params.id)
    .order('day_index', { ascending: true })
    .order('start_time', { ascending: true })

  return (
    <div className="min-h-screen bg-stone-50">
      <nav className="bg-white border-b border-stone-200 px-6 py-4 flex items-center gap-4">
        <Link href={`/trips/${params.id}`} className="text-stone-400 hover:text-stone-900 transition">
          <ArrowLeft size={20} />
        </Link>
        <div>
          <h1 className="font-semibold">{trip.name}</h1>
          <p className="text-xs text-stone-400">Itinerary</p>
        </div>
      </nav>

      <main className="max-w-3xl mx-auto px-6 py-10">
        <div className="mb-8">
          <h2 className="text-2xl font-semibold mb-1">Trip itinerary</h2>
          <p className="text-stone-500 text-sm">
            {trip.start_date
              ? `${new Date(trip.start_date).toLocaleDateString('en-US', { month: 'long', day: 'numeric' })} — ${new Date(trip.end_date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}`
              : 'Dates not confirmed yet — add items by day'}
          </p>
        </div>

        <ItineraryView
          tripId={params.id}
          userId={user.id}
          items={items ?? []}
          startDate={trip.start_date}
          endDate={trip.end_date}
        />
      </main>
    </div>
  )
}
