import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { ArrowLeft } from 'lucide-react'
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

  return (
    <div className="min-h-screen bg-stone-50">
      <nav className="bg-white border-b border-stone-200 px-6 py-4 flex items-center gap-4">
        <Link href={`/trips/${id}`} className="text-stone-400 hover:text-stone-900 transition">
          <ArrowLeft size={20} />
        </Link>
        <div>
          <h1 className="font-semibold">{trip.name}</h1>
          <p className="text-xs text-stone-400">Availability</p>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-6 py-10">
        <div className="mb-8">
          <h2 className="text-2xl font-semibold mb-1">When can everyone go?</h2>
          <p className="text-stone-500 text-sm">
            Mark your available dates. Once everyone responds, we&apos;ll show the best windows.
          </p>
        </div>

        {/* Overlap windows */}
        {windows.length > 0 && (
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

        {/* Calendar component (client) */}
        <AvailabilityCalendar
          tripId={id}
          userId={user.id}
          existingBlocks={blocks ?? []}
          members={members ?? []}
        />
      </main>
    </div>
  )
}
