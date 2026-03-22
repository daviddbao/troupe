'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { ArrowLeft } from 'lucide-react'

export default function NewTripPage() {
  const router = useRouter()
  const [form, setForm] = useState({ name: '', destination: '', description: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    const { data: trip, error: tripErr } = await supabase
      .from('trips')
      .insert({ name: form.name, destination: form.destination || null, description: form.description || null, created_by: user.id })
      .select()
      .single()

    if (tripErr || !trip) { setError(tripErr?.message ?? 'Failed to create trip'); setLoading(false); return }

    // Add creator as organizer
    await supabase.from('trip_members').insert({ trip_id: trip.id, user_id: user.id, role: 'organizer' })

    router.push(`/trips/${trip.id}`)
  }

  return (
    <div className="min-h-screen bg-stone-50">
      <nav className="bg-white border-b border-stone-200 px-6 py-4 flex items-center gap-4">
        <Link href="/dashboard" className="text-stone-400 hover:text-stone-900 transition">
          <ArrowLeft size={20} />
        </Link>
        <h1 className="font-semibold">New trip</h1>
      </nav>

      <main className="max-w-lg mx-auto px-6 py-10">
        <h2 className="text-2xl font-semibold mb-6">Plan a new trip</h2>
        <form onSubmit={handleCreate} className="bg-white border border-stone-200 rounded-2xl p-8 space-y-5">
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <div>
            <label className="block text-sm font-medium mb-1">Trip name *</label>
            <input
              value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              placeholder="e.g. Japan 2026, Cabo Summer Trip"
              className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-stone-400"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Destination</label>
            <input
              value={form.destination} onChange={e => setForm(f => ({ ...f, destination: e.target.value }))}
              placeholder="e.g. Tokyo, Japan"
              className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-stone-400"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Description</label>
            <textarea
              value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              placeholder="What's the vibe? Any ideas so far?"
              rows={3}
              className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-stone-400 resize-none"
            />
          </div>
          <button
            type="submit" disabled={loading}
            className="w-full bg-stone-900 text-white rounded-lg py-2.5 text-sm font-medium hover:bg-stone-700 transition disabled:opacity-50"
          >
            {loading ? 'Creating...' : 'Create trip'}
          </button>
        </form>
      </main>
    </div>
  )
}
