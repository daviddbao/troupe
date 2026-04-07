'use client'
import { useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { UserPlus, Trash2 } from 'lucide-react'

interface Member {
  id: string
  user_id: string
  role: string
  joined_at: string
  profile: {
    id: string
    full_name: string | null
    avatar_url: string | null
    email: string | null
  } | null
}

interface Props {
  tripId: string
  currentUserId: string
  members: Member[]
  isOrganizer: boolean
}

function getInitials(name: string | null, email: string | null): string {
  if (name) {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
  }
  if (email) {
    return email[0].toUpperCase()
  }
  return '?'
}

export default function MembersView({ tripId, currentUserId, members: initialMembers, isOrganizer }: Props) {
  const [members, setMembers] = useState<Member[]>(initialMembers)
  const [removing, setRemoving] = useState<string | null>(null)

  const removeMember = useCallback(async (userId: string) => {
    if (userId === currentUserId) return
    if (!isOrganizer) return

    setRemoving(userId)
    const supabase = createClient()
    
    const { error } = await supabase
      .from('trip_members')
      .delete()
      .eq('trip_id', tripId)
      .eq('user_id', userId)

    if (!error) {
      setMembers(prev => prev.filter(m => m.user_id !== userId))
    }
    setRemoving(null)
  }, [tripId, currentUserId, isOrganizer])

  return (
    <div className="space-y-3">
      {members.length === 0 ? (
        <div className="text-center py-12 text-stone-400">
          <UserPlus size={32} className="mx-auto mb-2 opacity-50" />
          <p className="text-sm">No members yet</p>
        </div>
      ) : (
        members.map(member => {
          const displayName = member.profile?.full_name || member.profile?.email || 'Unknown'
          const email = member.profile?.email || ''
          const initials = getInitials(member.profile?.full_name, email)
          const isAdmin = member.role === 'organizer'
          const isCurrentUser = member.user_id === currentUserId
          const canRemove = isOrganizer && !isCurrentUser && !isAdmin

          return (
            <div
              key={member.user_id}
              className="bg-white border border-stone-200 rounded-lg px-4 py-3 flex items-center justify-between hover:border-stone-300 transition"
            >
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className="w-10 h-10 rounded-full bg-stone-200 text-stone-700 flex items-center justify-center text-sm font-semibold flex-shrink-0">
                  {initials}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-sm">
                    {displayName}
                    {isCurrentUser && (
                      <span className="ml-2 text-xs text-stone-400">(you)</span>
                    )}
                  </p>
                  <p className="text-xs text-stone-400 truncate">{email}</p>
                </div>
              </div>
              
              <div className="flex items-center gap-3 ml-4 flex-shrink-0">
                {isAdmin && (
                  <span className="text-xs font-medium px-2 py-1 rounded bg-stone-100 text-stone-600">
                    Admin
                  </span>
                )}
                {canRemove && (
                  <button
                    onClick={() => {
                      if (window.confirm(`Remove ${displayName} from this trip?`)) {
                        removeMember(member.user_id)
                      }
                    }}
                    disabled={removing === member.user_id}
                    className="p-2 text-stone-300 hover:text-red-400 transition disabled:opacity-50"
                    title="Remove member"
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
            </div>
          )
        })
      )}
    </div>
  )
}
