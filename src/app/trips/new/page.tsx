'use client'
import { useState, useTransition } from 'react'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { createTrip } from '@/app/actions/trips'

export default function NewTripPage() {
  const [error, setError] = useState('')
  const [isPending, startTransition] = useTransition()

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')
    const formData = new FormData(e.currentTarget)
    
    startTransition(async () => {
      const result = await createTrip(formData)
      if (result?.error) {
        setError(result.error)
      }
    })
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
        <form onSubmit={handleSubmit} className="bg-white border border-stone-200 rounded-2xl p-8 space-y-5">
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <div>
            <label className="block text-sm font-medium mb-1">Trip name *</label>
            <input
              name="name"
              placeholder="e.g. Japan 2026, Cabo Summer Trip"
              className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-stone-400"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Destination</label>
            <input
              name="destination"
              placeholder="e.g. Tokyo, Japan"
              className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-stone-400"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Description</label>
            <textarea
              name="description"
              placeholder="What\'s the vibe? Any ideas so far?"
              rows={3}
              className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-stone-400 resize-none"
            />
          </div>
          <button
            type="submit"
            disabled={isPending}
            className="w-full bg-stone-900 text-white rounded-lg py-2.5 text-sm font-medium hover:bg-stone-700 transition disabled:opacity-50"
          >
            {isPending ? 'Creating...' : 'Create trip'}
          </button>
        </form>
      </main>
    </div>
  )
}
