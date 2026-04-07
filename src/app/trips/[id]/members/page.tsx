import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import TroupeHeader from '@/components/layout/TroupeHeader'
import MembersView from '@/components/trips/MembersView'

export default async function MembersPage({ params }: { params: Promise<{ id: string }> }) {
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
    .select('id, user_id, role, joined_at, profile:profiles(id, full_name, avatar_url, email)')
    .eq('trip_id', id)
    .order('joined_at', { ascending: true })

  return (
    <div className="min-h-screen bg-stone-50">
      <TroupeHeader
        showBack
        backHref={`/trips/${id}`}
        title={trip.name}
        subtitle="Members"
      />

      <main className="max-w-2xl mx-auto px-4 sm:px-6 py-10">
        <div className="mb-8">
          <h2 className="text-2xl font-semibold mb-1">Trip members</h2>
          <p className="text-stone-500 text-sm">
            {members?.length ?? 0} member{(members?.length ?? 0) !== 1 ? 's' : ''} have joined this trip
          </p>
        </div>

        <MembersView
          tripId={id}
          currentUserId={user.id}
          members={members ?? []}
          isOrganizer={membership.role === 'organizer'}
        />
      </main>
    </div>
  )
}
