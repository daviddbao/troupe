import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'

export default async function Home() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (user) redirect('/dashboard')

  return (
    <div className="min-h-screen bg-stone-50 flex flex-col">
      {/* Nav */}
      <nav className="px-6 py-5 flex items-center justify-between max-w-5xl mx-auto w-full">
        <span className="text-xl font-bold tracking-tight">Troupe</span>
        <Link href="/login" className="text-sm text-stone-500 hover:text-stone-900 transition font-medium">Sign in</Link>
      </nav>

      {/* Hero */}
      <main className="flex-1 flex flex-col items-center justify-center text-center px-6 py-20">
        <div className="max-w-xl">
          <h1 className="text-5xl font-bold tracking-tight text-stone-900 mb-4 leading-tight">
            Plan trips together,<br />stress-free.
          </h1>
          <p className="text-stone-500 text-lg mb-10">
            Troupe helps groups find time, share plans, and travel together — without the chaos.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/signup"
              className="bg-stone-900 text-white px-6 py-3 rounded-xl text-sm font-semibold hover:bg-stone-700 transition"
            >
              Start a trip →
            </Link>
            <Link
              href="/signup"
              className="bg-white border border-stone-200 text-stone-700 px-6 py-3 rounded-xl text-sm font-semibold hover:border-stone-400 transition"
            >
              Join a trip
            </Link>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="px-6 py-6 text-center text-xs text-stone-400">
        © {new Date().getFullYear()} Troupe
      </footer>
    </div>
  )
}
