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
      if (result?.error) setError(result.error)
    })
  }

  return (
    <div className="min-h-screen bg-stone-50 flex flex-col items-center justify-center px-6">
      <div className="w-full max-w-md">
        <Link href="/dashboard" className="inline-flex items-center gap-2 text-stone-400 hover:text-stone-900 transition text-sm mb-8">
          <ArrowLeft size={16} /> Back to trips
        </Link>

        <h1 className="text-3xl font-bold mb-2">Name your trip</h1>
        <p className="text-stone-500 text-sm mb-8">You can add details like destination and dates after.</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <input
            name="name"
            placeholder="e.g. Japan 2026, Cabo Summer Trip"
            autoFocus
            className="w-full border border-stone-300 rounded-xl px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-stone-400"
            required
          />
          <button
            type="submit"
            disabled={isPending}
            className="w-full bg-stone-900 text-white rounded-xl py-3 text-sm font-semibold hover:bg-stone-700 transition disabled:opacity-50"
          >
            {isPending ? 'Creating...' : 'Create trip →'}
          </button>
        </form>
      </div>
    </div>
  )
}
