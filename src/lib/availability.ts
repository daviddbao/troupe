import { AvailabilityBlock } from './types'
import { eachDayOfInterval, format, parseISO } from 'date-fns'

export interface AvailabilityWindow {
  start: string
  end: string
  memberCount: number
  memberIds: string[]
}

/**
 * Given a set of availability blocks for a trip,
 * find date ranges where ALL (or N) members are available.
 */
export function findOverlapWindows(
  blocks: AvailabilityBlock[],
  memberIds: string[],
  minMembers: number = memberIds.length
): AvailabilityWindow[] {
  if (!blocks.length || !memberIds.length) return []

  // Build a map of date -> set of available member IDs
  const dateMap = new Map<string, Set<string>>()

  blocks
    .filter(b => b.type === 'available' || b.type === 'preferred')
    .forEach(block => {
      const days = eachDayOfInterval({
        start: parseISO(block.start_date),
        end: parseISO(block.end_date),
      })
      days.forEach(day => {
        const key = format(day, 'yyyy-MM-dd')
        if (!dateMap.has(key)) dateMap.set(key, new Set())
        dateMap.get(key)!.add(block.user_id)
      })
    })

  // Walk through sorted dates to find contiguous windows
  const sortedDates = Array.from(dateMap.keys()).sort()
  const windows: AvailabilityWindow[] = []
  let windowStart: string | null = null
  let windowMemberIds: string[] = []

  for (let i = 0; i < sortedDates.length; i++) {
    const date = sortedDates[i]
    const available = dateMap.get(date)!
    const availableMembers = memberIds.filter(id => available.has(id))

    if (availableMembers.length >= minMembers) {
      if (!windowStart) {
        windowStart = date
        windowMemberIds = availableMembers
      } else {
        // Keep intersection of members across the window
        windowMemberIds = windowMemberIds.filter(id => availableMembers.includes(id))
      }
    } else {
      if (windowStart) {
        windows.push({
          start: windowStart,
          end: sortedDates[i - 1],
          memberCount: windowMemberIds.length,
          memberIds: windowMemberIds,
        })
        windowStart = null
        windowMemberIds = []
      }
    }
  }

  if (windowStart) {
    windows.push({
      start: windowStart,
      end: sortedDates[sortedDates.length - 1],
      memberCount: windowMemberIds.length,
      memberIds: windowMemberIds,
    })
  }

  return windows.filter(w => w.memberCount >= minMembers)
}
