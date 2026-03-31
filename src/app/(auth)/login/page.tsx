'use client'
import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Suspense } from 'react'

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const inviteCode = searchParams.get('invite')

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setError(error.message)
      setLoading(false)
    } else if (inviteCode) {
      router.push(`/join/${inviteCode}`)
    } else {
      router.push('/dashboard')
    }
  }

  return (
    <form onSubmit={handleLogin} className="bg-white rounded-2xl shadow-sm border border-stone-200 p-8 space-y-4">
      <div className="text-center mb-2">
        <h2 className="text-xl font-bold">Sign in</h2>
        {inviteCode && <p className="text-sm text-stone-500 mt-1">Sign in to join the trip.</p>}
      </div>
      {error && <p className="text-red-500 text-sm">{error}</p>}
      <div>
        <label className="block text-sm font-medium mb-1">Email</label>
        <input
          type="email" value={email} onChange={e => setEmail(e.target.value)}
          className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-stone-400"
          required
        />
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">Password</label>
        <input
          type="password" value={password} onChange={e => setPassword(e.target.value)}
          className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-stone-400"
          required
        />
      </div>
      <button
        type="submit" disabled={loading}
        className="w-full bg-stone-900 text-white rounded-lg py-2 text-sm font-medium hover:bg-stone-700 transition disabled:opacity-50"
      >
        {loading ? 'Signing in...' : 'Sign in'}
      </button>
      <p className="text-center text-sm text-stone-500">
        No account?{' '}
        <Link href={inviteCode ? `/signup?invite=${inviteCode}` : '/signup'} className="text-stone-900 font-medium hover:underline">Sign up</Link>
      </p>
    </form>
  )
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  )
}
