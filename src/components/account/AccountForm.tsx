'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function AccountForm({ userId, initialName }: { userId: string; initialName: string }) {
  const router = useRouter()
  const [name, setName] = useState(initialName)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  async function save() {
    setSaving(true)
    const supabase = createClient()
    await supabase.from('profiles').upsert({ id: userId, full_name: name })
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  async function signOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/')
  }

  return (
    <div className="space-y-6">
      <div className="bg-white border border-stone-200 rounded-2xl p-6 space-y-4">
        <h3 className="font-semibold text-stone-800">Display name</h3>
        <input
          type="text"
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="Your name"
          className="w-full border border-stone-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-stone-300"
        />
        <button
          onClick={save}
          disabled={saving}
          className="bg-stone-900 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-stone-700 transition disabled:opacity-60"
        >
          {saving ? 'Saving…' : saved ? 'Saved ✓' : 'Save changes'}
        </button>
      </div>

      <div className="bg-white border border-stone-200 rounded-2xl p-6">
        <h3 className="font-semibold text-stone-800 mb-1">Sign out</h3>
        <p className="text-sm text-stone-400 mb-4">You will be redirected to the home page.</p>
        <button
          onClick={signOut}
          className="border border-stone-200 text-stone-600 px-5 py-2 rounded-lg text-sm font-medium hover:bg-stone-50 hover:border-stone-400 transition"
        >
          Sign out
        </button>
      </div>
    </div>
  )
}
