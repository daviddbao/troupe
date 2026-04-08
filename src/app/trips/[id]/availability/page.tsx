import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import TroupeHeader from '@/components/layout/TroupeHeader'
import AvailabilityCalendar from '@/components/availability/AvailabilityCalendar'

export default async function AvailabilityPage({ params }: { params: Promise<{ id: string }> }) {
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
    .select('user_id, profile:profiles(full_name)')
    .eq('trip_id', id)

  const { data: blocks } = await supabase
    .from('availability_blocks')
    .select('*')
    .eq('trip_id', id)

  return (
    <div className="min-h-screen bg-stone-50">
      <TroupeHeader
        showBack
        backHref={`/trips/${id}`}
        title={trip.name}
        subtitle="Availability"
      />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-10">
        <div className="mb-8">
          <h2 className="text-2xl font-semibold mb-1">When can everyone go?</h2>
          <p className="text-stone-500 text-sm">
            Mark your available dates. Once everyone responds, we&apos;ll show the best windows.
          </p>
        </div>

        {/* Calendar component (client) */}
        <AvailabilityCalendar
          tripId={id}
          userId={user.id}
          existingBlocks={blocks ?? []}
          members={members ?? []}
          tripStartDate={trip.start_date}
          tripEndDate={trip.end_date}
        />
      </main>
    </div>
  )
}
