import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { joinViaInvite } from '@/app/actions/invites'

export default async function JoinPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params
  const supabase = await createClient()

  // Look up invite + trip name
  const { data: invite } = await supabase
    .from('trip_invites')
    .select('*, trip:trips(name)')
    .eq('invite_code', code)
    .single()

  const isExpired = invite && new Date(invite.expires_at) < new Date()
  const isMaxed = invite && invite.use_count >= invite.max_uses
  const isInvalid = !invite || isExpired || isMaxed

  const tripName = (invite?.trip as { name?: string } | null)?.name ?? 'a trip'

  // Check auth
  const { data: { user } } = await supabase.auth.getUser()

  if (user && !isInvalid) {
    // Logged in — auto join and redirect
    const result = await joinViaInvite(code)
    if (result.tripId) {
      redirect(`/trips/${result.tripId}`)
    }
  }

  if (isInvalid) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center px-6">
        <div className="max-w-md w-full text-center">
          <div className="text-4xl mb-4">😕</div>
          <h1 className="text-2xl font-bold mb-2">Link unavailable</h1>
          <p className="text-stone-500 text-sm mb-6">
            {!invite ? 'This invite link is invalid.' :
             isExpired ? 'This invite link has expired.' :
             'This invite link has reached its limit.'}
          </p>
          <Link href="/" className="text-sm text-stone-900 font-medium hover:underline">
            Go to Troupe →
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-stone-50 flex items-center justify-center px-6">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">You&apos;re invited!</h1>
          <p className="text-stone-500">
            Join <span className="font-semibold text-stone-900">{tripName}</span> on Troupe
          </p>
        </div>

        <div className="space-y-3">
          <Link
            href={`/signup?invite=${code}`}
            className="block w-full bg-stone-900 text-white text-center py-3 rounded-xl text-sm font-semibold hover:bg-stone-700 transition"
          >
            Create an account
          </Link>
          <Link
            href={`/login?invite=${code}`}
            className="block w-full bg-white border border-stone-200 text-stone-900 text-center py-3 rounded-xl text-sm font-semibold hover:border-stone-400 transition"
          >
            Sign in
          </Link>
        </div>

        <p className="text-center text-xs text-stone-400 mt-6">
          You&apos;ll be added to the trip automatically after signing in.
        </p>
      </div>
    </div>
  )
}
