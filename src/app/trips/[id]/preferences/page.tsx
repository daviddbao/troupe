import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { ArrowLeft } from 'lucide-react'
import PreferencesForm from '@/components/PreferencesForm'

export default async function PreferencesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: trip } = await supabase
    .from('trips').select('*').eq('id', id).single()
  if (!trip) notFound()

  const { data: membership } = await supabase
    .from('trip_members').select('role').eq('trip_id', id).eq('user_id', user.id).single()
  if (!membership) redirect(`/trips/${id}`)

  return (
    <div className="min-h-screen bg-stone-50">
      <nav className="bg-white border-b border-stone-200 px-6 py-4 flex items-center gap-4">
        <Link href={`/trips/${id}`} className="text-stone-400 hover:text-stone-900 transition">
          <ArrowLeft size={20} />
        </Link>
        <h1 className="text-xl font-bold tracking-tight">Troupe</h1>
      </nav>

      <main className="max-w-2xl mx-auto px-4 sm:px-6 py-10">
        <div className="mb-8">
          <h2 className="text-3xl font-bold mb-2">{trip.name}</h2>
          <p className="text-stone-600">Set your trip preferences to help plan the perfect getaway.</p>
        </div>

        <div className="bg-white border border-stone-200 rounded-2xl p-8">
          <PreferencesForm tripId={id} initialPreferences={trip.preferences} />
        </div>
      </main>
    </div>
  )
}
