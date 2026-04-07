import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import TroupeHeader from '@/components/layout/TroupeHeader'
import { findOverlapWindows } from '@/lib/availability'
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

  const memberIds = (members ?? []).map((m) => m.user_id)
  const windows = findOverlapWindows(blocks ?? [], memberIds)

  const userHasBlocks = (blocks ?? []).some(b => b.user_id === user.id)

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

        {/* Overlap windows — only meaningful with 2+ members */}
        {windows.length > 0 && memberIds.length >= 2 && (
          <div className="bg-green-50 border border-green-200 rounded-2xl p-6 mb-8">
            <h3 className="font-semibold text-green-800 mb-3">✨ Overlap windows found</h3>
            <div className="space-y-2">
              {windows.slice(0, 5).map((w, i) => (
                <div key={i} className="flex items-center justify-between bg-white rounded-lg px-4 py-3 border border-green-100">
                  <span className="text-sm font-medium">
                    {new Date(w.start).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    {' — '}
                    {new Date(w.end).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </span>
                  <span className="text-xs text-green-600 font-medium">
                    {w.memberCount} of {memberIds.length} available
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* First-time empty state hint */}
        {!userHasBlocks && (
          <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 mb-4 text-sm text-blue-700">
            👋 Tap a start date, then an end date to mark a range. Switch between <strong>Available</strong> / <strong>Busy</strong> using the toggle below.
          </div>
        )}

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
