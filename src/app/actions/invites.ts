'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

function randomCode(len = 8): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789'
  let code = ''
  for (let i = 0; i < len; i++) {
    code += chars[Math.floor(Math.random() * chars.length)]
  }
  return code
}

export async function createInvite(tripId: string): Promise<{ code?: string; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()

  const { data, error } = await supabase
    .from('trip_invites')
    .insert({
      trip_id: tripId,
      invite_code: randomCode(),
      created_by: user.id,
      expires_at: expiresAt,
      max_uses: 50,
      use_count: 0,
    })
    .select('invite_code')
    .single()

  if (error || !data) return { error: error?.message ?? 'Failed to create invite' }
  revalidatePath(`/trips/${tripId}`)
  return { code: data.invite_code }
}

export async function joinViaInvite(code: string): Promise<{ tripId?: string; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { data: invite, error: inviteErr } = await supabase
    .from('trip_invites')
    .select('*')
    .eq('invite_code', code)
    .single()

  if (inviteErr || !invite) return { error: 'Invalid invite link' }
  if (new Date(invite.expires_at) < new Date()) return { error: 'This invite link has expired' }
  if (invite.use_count >= invite.max_uses) return { error: 'This invite link has reached its limit' }

  // Check if already a member
  const { data: existing } = await supabase
    .from('trip_members')
    .select('id')
    .eq('trip_id', invite.trip_id)
    .eq('user_id', user.id)
    .single()

  if (!existing) {
    const { error: joinErr } = await supabase
      .from('trip_members')
      .insert({ trip_id: invite.trip_id, user_id: user.id, role: 'member' })
    if (joinErr) return { error: joinErr.message }

    await supabase
      .from('trip_invites')
      .update({ use_count: invite.use_count + 1 })
      .eq('id', invite.id)
  }

  return { tripId: invite.trip_id }
}
