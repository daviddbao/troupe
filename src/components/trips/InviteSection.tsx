'use client'
import { useState } from 'react'
import { Link2, Copy, Check } from 'lucide-react'
import { createInvite } from '@/app/actions/invites'

interface Props {
  tripId: string
  initialCode?: string | null
}

export default function InviteSection({ tripId, initialCode }: Props) {
  const [code, setCode] = useState<string | null>(initialCode ?? null)
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState('')

  const inviteUrl = code ? `https://troupe-delta.vercel.app/join/${code}` : null

  async function handleGenerate() {
    setLoading(true)
    setError('')
    const result = await createInvite(tripId)
    if (result.error) {
      setError(result.error)
    } else if (result.code) {
      setCode(result.code)
    }
    setLoading(false)
  }

  async function handleCopy() {
    if (!inviteUrl) return
    await navigator.clipboard.writeText(inviteUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="bg-white border border-stone-200 rounded-2xl p-6 mt-4">
      <div className="flex items-center gap-2 mb-3">
        <Link2 size={16} className="text-stone-400" />
        <h3 className="font-semibold text-sm">Invite people</h3>
      </div>

      {!code ? (
        <div>
          <p className="text-stone-500 text-sm mb-3">Generate a link to share with friends.</p>
          <button
            onClick={handleGenerate}
            disabled={loading}
            className="bg-stone-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-stone-700 transition disabled:opacity-50"
          >
            {loading ? 'Generating...' : 'Generate invite link'}
          </button>
          {error && <p className="text-red-500 text-xs mt-2">{error}</p>}
        </div>
      ) : (
        <div>
          <div className="flex gap-2">
            <input
              readOnly
              value={inviteUrl!}
              className="flex-1 border border-stone-200 rounded-lg px-3 py-2 text-xs text-stone-600 bg-stone-50 focus:outline-none"
            />
            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 px-3 py-2 bg-stone-900 text-white rounded-lg text-xs font-medium hover:bg-stone-700 transition"
            >
              {copied ? <Check size={12} /> : <Copy size={12} />}
              {copied ? 'Copied!' : 'Copy'}
            </button>
          </div>
          <p className="text-xs text-stone-400 mt-2">Expires in 7 days · Up to 50 uses</p>
        </div>
      )}
    </div>
  )
}
