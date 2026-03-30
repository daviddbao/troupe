'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'

export async function createTrip(formData: FormData) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  
  if (authError || !user) {
    redirect('/login')
  }

  const name = formData.get('name') as string
  const destination = formData.get('destination') as string | null
  const description = formData.get('description') as string | null

  if (!name?.trim()) {
    return { error: 'Trip name is required' }
  }

  const { data: trip, error: tripErr } = await supabase
    .from('trips')
    .insert({
      name: name.trim(),
      destination: destination?.trim() || null,
      description: description?.trim() || null,
      created_by: user.id,
    })
    .select()
    .single()

  if (tripErr || !trip) {
    console.error('Trip creation error:', tripErr)
    return { error: tripErr?.message ?? 'Failed to create trip' }
  }

  const { error: memberErr } = await supabase
    .from('trip_members')
    .insert({
      trip_id: trip.id,
      user_id: user.id,
      role: 'organizer',
    })

  if (memberErr) {
    console.error('Member insert error:', memberErr)
    await supabase.from('trips').delete().eq('id', trip.id)
    return { error: 'Failed to set up trip membership: ' + memberErr.message }
  }

  revalidatePath('/dashboard')
  redirect(`/trips/${trip.id}`)
}
