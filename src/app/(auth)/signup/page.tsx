'use client'
import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Suspense } from 'react'

function SignupForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const inviteCode = searchParams.get('invite')

  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const supabase = createClient()
    const { error } = await supabase.auth.signUp({
      email, password,
      options: { data: { full_name: fullName } }
    })
    if (error) {
      setError(error.message)
      setLoading(false)
    } else if (inviteCode) {
      router.push(`/join/${inviteCode}`)
    } else {
      router.push('/trips/new')
    }
  }

  return (
    <form onSubmit={handleSignup} className="bg-white rounded-2xl shadow-sm border border-stone-200 p-8 space-y-4">
      <div className="text-center mb-2">
        <h2 className="text-xl font-bold">Create your account</h2>
        {inviteCode && <p className="text-sm text-stone-500 mt-1">You&apos;ll be added to the trip after signing up.</p>}
      </div>
      {error && <p className="text-red-500 text-sm">{error}</p>}
      <div>
        <label className="block text-sm font-medium mb-1">Full name</label>
        <input
          type="text" value={fullName} onChange={e => setFullName(e.target.value)}
          className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-stone-400"
          required
        />
      </div>
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
          minLength={8} required
        />
      </div>
      <button
        type="submit" disabled={loading}
        className="w-full bg-stone-900 text-white rounded-lg py-2 text-sm font-medium hover:bg-stone-700 transition disabled:opacity-50"
      >
        {loading ? 'Creating account...' : 'Create account'}
      </button>
      <p className="text-center text-sm text-stone-500">
        Have an account?{' '}
        <Link href={inviteCode ? `/login?invite=${inviteCode}` : '/login'} className="text-stone-900 font-medium hover:underline">Sign in</Link>
      </p>
    </form>
  )
}

export default function SignupPage() {
  return (
    <Suspense>
      <SignupForm />
    </Suspense>
  )
}
