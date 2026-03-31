import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { ArrowLeft } from 'lucide-react'
import AccountForm from '@/components/account/AccountForm'

export default async function AccountPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, avatar_url')
    .eq('id', user.id)
    .single()

  return (
    <div className="min-h-screen bg-stone-50">
      <nav className="bg-white border-b border-stone-200 px-6 py-4 flex items-center gap-4">
        <Link href="/dashboard" className="text-stone-400 hover:text-stone-900 transition">
          <ArrowLeft size={20} />
        </Link>
        <h1 className="font-semibold">Account</h1>
      </nav>

      <main className="max-w-xl mx-auto px-4 sm:px-6 py-10">
        <h2 className="text-2xl font-bold mb-6">Profile &amp; Settings</h2>
        <AccountForm userId={user.id} initialName={profile?.full_name ?? ''} />
      </main>
    </div>
  )
}
