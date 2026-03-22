export type TripStatus = 'planning' | 'confirmed' | 'completed' | 'cancelled'
export type MemberRole = 'organizer' | 'member'
export type AvailabilityType = 'available' | 'unavailable' | 'preferred'
export type ItineraryCategory = 'transport' | 'accommodation' | 'activity' | 'food' | 'other'

export interface Profile {
  id: string
  full_name: string | null
  avatar_url: string | null
  timezone: string
  created_at: string
}

export interface Trip {
  id: string
  name: string
  description: string | null
  destination: string | null
  status: TripStatus
  start_date: string | null
  end_date: string | null
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface TripMember {
  id: string
  trip_id: string
  user_id: string
  role: MemberRole
  joined_at: string
  profile?: Profile
}

export interface AvailabilityBlock {
  id: string
  trip_id: string
  user_id: string
  start_date: string
  end_date: string
  type: AvailabilityType
  note: string | null
  created_at: string
}

export interface ItineraryItem {
  id: string
  trip_id: string
  day_index: number
  title: string
  description: string | null
  location: string | null
  start_time: string | null
  end_time: string | null
  category: ItineraryCategory
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface TripInvite {
  id: string
  trip_id: string
  invite_code: string
  created_by: string | null
  expires_at: string
  max_uses: number
  use_count: number
  created_at: string
}
