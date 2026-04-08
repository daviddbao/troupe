'use client'
import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { AvailabilityBlock, AvailabilityType } from '@/lib/types'
import { format, startOfMonth, endOfMonth, eachDayOfInterval, getDay, isToday, isSameDay, parseISO } from 'date-fns'
import { ArrowRight, ChevronLeft, ChevronRight, Check, Clock } from 'lucide-react'

interface Props {
  tripId: string
  userId: string
  existingBlocks: AvailabilityBlock[]
  members: Array<{ user_id: string; profile: { full_name: string | null } | null }>
  tripStartDate?: string | null
  tripEndDate?: string | null
}

// Member color palette
const MEMBER_COLOR_PALETTE = ['#3B82F6','#F59E0B','#10B981','#8B5CF6','#EF4444','#06B6D4','#F97316','#EC4899']

// US holiday long weekends only — shown for America/* timezones
const HOLIDAY_CHIPS = [
  { label: 'Memorial Day', emoji: '🌸', dates: ['2026-05-23', '2026-05-24', '2026-05-25'] },
  { label: 'Juneteenth', emoji: '🌟', dates: ['2026-06-19', '2026-06-20', '2026-06-21'] },
  { label: '4th of July', emoji: '🎇', dates: ['2026-07-03', '2026-07-04', '2026-07-05', '2026-07-06'] },
  { label: 'Labor Day', emoji: '🔨', dates: ['2026-09-04', '2026-09-05', '2026-09-06', '2026-09-07'] },
  { label: 'Indigenous Peoples Day', emoji: '🧭', dates: ['2026-10-09', '2026-10-10', '2026-10-11', '2026-10-12'] },
  { label: 'Veterans Day', emoji: '🎖️', dates: ['2026-11-11'] },
  { label: 'Thanksgiving', emoji: '🦃', dates: ['2026-11-26', '2026-11-27', '2026-11-28', '2026-11-29'] },
  { label: 'Christmas', emoji: '🎄', dates: ['2026-12-25', '2026-12-26', '2026-12-27', '2026-12-28'] },
]

function isUSTimezone(): boolean {
  try { return Intl.DateTimeFormat().resolvedOptions().timeZone.startsWith('America/') }
  catch { return false }
}

export default function AvailabilityCalendar({ tripId, userId, existingBlocks, members, tripStartDate, tripEndDate }: Props) {
  const router = useRouter()
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [blocks, setBlocks] = useState<AvailabilityBlock[]>(existingBlocks)
  const [mode, setMode] = useState<'available' | 'unavailable' | 'erase'>('available')
  const [rangeStart, setRangeStart] = useState<Date | null>(null)
  const [hoverDate, setHoverDate] = useState<Date | null>(null)
  const [saving, setSaving] = useState(false)
  const [justSaved, setJustSaved] = useState(false)
  const [tooltipDate, setTooltipDate] = useState<Date | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const showChips = isUSTimezone()

  // Auto-hide toast after 2.5s
  const showToast = useCallback((message: string) => {
    setToast(message)
    const timer = setTimeout(() => setToast(null), 2500)
    return () => clearTimeout(timer)
  }, [])

  const myBlocks = blocks.filter(b => b.user_id === userId)

  // Assign colors to members: current user always gets index 0 (blue)
  const memberColorMap: Record<string, string> = {}
  let colorIndex = 0

  // First assign to current user
  memberColorMap[userId] = MEMBER_COLOR_PALETTE[0]
  colorIndex = 1

  // Then assign to other members
  members.forEach(m => {
    if (m.user_id !== userId && !(m.user_id in memberColorMap)) {
      memberColorMap[m.user_id] = MEMBER_COLOR_PALETTE[colorIndex % MEMBER_COLOR_PALETTE.length]
      colorIndex++
    }
  })

  // Get other members' blocks and member info
  const otherMemberIds = members.filter(m => m.user_id !== userId).map(m => m.user_id)
  const memberNames: Record<string, string> = {}
  members.forEach(m => {
    memberNames[m.user_id] = m.profile?.full_name || m.user_id.slice(0, 8)
  })

  // Check who has responded (has any blocks submitted)
  const respondedMembers = new Set(blocks.map(b => b.user_id))
  const pendingMembers = members.filter(m => !respondedMembers.has(m.user_id))

  function getStatus(date: Date): AvailabilityType | null {
    const ds = format(date, 'yyyy-MM-dd')
    const block = myBlocks.find(b => ds >= b.start_date && ds <= b.end_date)
    return block ? block.type : null
  }

  function isInPreview(date: Date): boolean {
    if (!rangeStart || !hoverDate) return false
    const a = rangeStart <= hoverDate ? rangeStart : hoverDate
    const b = rangeStart <= hoverDate ? hoverDate : rangeStart
    return date >= a && date <= b
  }

  // Get members who marked a specific date as available
  function getAvailableMembersForDate(date: Date): string[] {
    const ds = format(date, 'yyyy-MM-dd')
    return members
      .map(m => m.user_id)
      .filter(uid => blocks.some(b => b.user_id === uid && ds >= b.start_date && ds <= b.end_date && b.type === 'available'))
  }

  // Find overlap windows
  function findOverlapWindows(): Array<{ start: string; end: string; memberCount: number }> {
    if (otherMemberIds.length === 0) return []

    const allDates = new Set<string>()
    blocks.forEach(b => {
      if (b.type === 'available') {
        let current = parseISO(b.start_date)
        const end = parseISO(b.end_date)
        while (current <= end) {
          allDates.add(format(current, 'yyyy-MM-dd'))
          current = new Date(current.getTime() + 86400000)
        }
      }
    })

    if (allDates.size === 0) return []

    const sortedDates = Array.from(allDates).sort()
    const windows: Array<{ start: string; end: string; memberCount: number }> = []
    let windowStart = sortedDates[0]
    let windowEnd = sortedDates[0]

    for (let i = 1; i < sortedDates.length; i++) {
      const current = parseISO(sortedDates[i])
      const prev = parseISO(sortedDates[i - 1])
      const daysDiff = Math.floor((current.getTime() - prev.getTime()) / 86400000)

      if (daysDiff === 1) {
        windowEnd = sortedDates[i]
      } else {
        const availableCounts = []
        let checkDate = parseISO(windowStart)
        const checkEnd = parseISO(windowEnd)
        while (checkDate <= checkEnd) {
          availableCounts.push(getAvailableMembersForDate(checkDate).length)
          checkDate = new Date(checkDate.getTime() + 86400000)
        }
        const minCount = Math.min(...availableCounts)
        if (minCount >= 2) {
          windows.push({ start: windowStart, end: windowEnd, memberCount: minCount })
        }
        windowStart = sortedDates[i]
        windowEnd = sortedDates[i]
      }
    }

    // Handle last window
    const availableCounts = []
    let checkDate = parseISO(windowStart)
    const checkEnd = parseISO(windowEnd)
    while (checkDate <= checkEnd) {
      availableCounts.push(getAvailableMembersForDate(checkDate).length)
      checkDate = new Date(checkDate.getTime() + 86400000)
    }
    const minCount = Math.min(...availableCounts)
    if (minCount >= 2) {
      windows.push({ start: windowStart, end: windowEnd, memberCount: minCount })
    }

    return windows.slice(0, 5)
  }

  const saveRange = useCallback(async (start: Date, end: Date, type: AvailabilityType) => {
    setSaving(true)
    const supabase = createClient()
    const s = start <= end ? start : end
    const e = start <= end ? end : start
    const { data, error } = await supabase
      .from('availability_blocks')
      .insert({ trip_id: tripId, user_id: userId, start_date: format(s, 'yyyy-MM-dd'), end_date: format(e, 'yyyy-MM-dd'), type })
      .select().single()
    if (!error && data) { setBlocks(prev => [...prev, data]); setJustSaved(true) }
    setSaving(false)
  }, [tripId, userId])

  async function removeBlock(date: Date) {
    const ds = format(date, 'yyyy-MM-dd')
    const block = myBlocks.find(b => ds >= b.start_date && ds <= b.end_date)
    if (!block) return
    const supabase = createClient()
    await supabase.from('availability_blocks').delete().eq('id', block.id)
    setBlocks(prev => prev.filter(b => b.id !== block.id))
  }

  function handleDateClick(date: Date) {
    const status = getStatus(date)
    if (mode === 'erase') {
      removeBlock(date)
      return
    }
    if (status === mode) { removeBlock(date); return }
    if (!rangeStart) { setRangeStart(date); return }
    const start = rangeStart
    setRangeStart(null)
    setHoverDate(null)
    saveRange(start, date, mode)
  }

  function prevMonth() {
    setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))
  }

  function nextMonth() {
    setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))
  }

  async function handleChip(dates: string[], label: string) {
    setSaving(true)
    const supabase = createClient()
    const rows = dates.map(d => ({ trip_id: tripId, user_id: userId, start_date: d, end_date: d, type: 'available' as AvailabilityType }))
    const { data, error } = await supabase.from('availability_blocks').insert(rows).select()
    if (!error && data) {
      setBlocks(prev => [...prev, ...data])
      showToast(`Added ${label}`)
    }
    setSaving(false)
  }

  const monthStart = startOfMonth(currentMonth)
  const monthEnd = endOfMonth(currentMonth)
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd })
  const startPad = getDay(monthStart)
  const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

  // Filter holidays based on trip date range or current month
  const today = new Date()
  let tripStart: Date | null = null
  let tripEnd: Date | null = null

  if (tripStartDate && tripEndDate) {
    tripStart = parseISO(tripStartDate)
    tripEnd = parseISO(tripEndDate)
  }

  const futureHolidays = HOLIDAY_CHIPS.filter(chip => {
    // If trip has date range, only show holidays within that range
    if (tripStart && tripEnd) {
      return chip.dates.some(d => {
        const holidayDate = parseISO(d)
        return holidayDate >= tripStart && holidayDate <= tripEnd
      })
    }
    // Otherwise, only show holidays future from today and potentially in current/next month
    const firstDate = new Date(chip.dates[0])
    const lastDate = new Date(chip.dates[chip.dates.length - 1])
    return lastDate >= today && firstDate.getMonth() === currentMonth.getMonth() || lastDate.getMonth() === currentMonth.getMonth()
  })

  const overlapWindows = findOverlapWindows()
  const memberIds = members.map(m => m.user_id)

  return (
    <div className="space-y-6">

      {/* Overlap windows — only meaningful with 2+ members */}
      {overlapWindows.length > 0 && members.length >= 2 && (
        <div className="bg-green-50 border border-green-200 rounded-2xl p-6">
          <h3 className="font-semibold text-green-800 mb-3">✨ Overlap windows found</h3>
          <div className="space-y-2">
            {overlapWindows.map((w, i) => (
              <div key={i} className="flex items-center justify-between bg-white rounded-lg px-4 py-3 border border-green-100">
                <span className="text-sm font-medium">
                  {new Date(w.start).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  {' — '}
                  {new Date(w.end).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </span>
                <span className="text-xs text-green-600 font-medium">
                  {w.memberCount} of {memberIds.length} available
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Holiday chips */}
      {showChips && futureHolidays.length > 0 && (
        <div>
          <p className="text-xs text-stone-400 mb-2 font-medium uppercase tracking-wide">Quick-add a holiday weekend</p>
          <div className="flex flex-nowrap overflow-x-auto sm:flex-wrap gap-2 pb-2 sm:pb-0">
            {futureHolidays.map(chip => {
              const added = chip.dates.every(d =>
                myBlocks.some(b => d >= b.start_date && d <= b.end_date && b.type === 'available')
              )
              return (
                <button
                  key={chip.label}
                  onClick={() => { if (!added) handleChip(chip.dates, chip.label) }}
                  disabled={saving || added}
                  className={[
                    'flex items-center gap-1.5 px-3 py-2 rounded-full text-sm border transition shrink-0',
                    added
                      ? 'bg-green-50 border-green-200 text-green-700 cursor-default'
                      : 'bg-white border-stone-200 text-stone-700 hover:border-stone-400 hover:shadow-sm',
                    'disabled:opacity-60'
                  ].join(' ')}
                >
                  <span>{chip.emoji}</span>
                  <span>{chip.label}</span>
                  {added && <span className="text-green-500 text-xs">✓</span>}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Calendar card */}
      <div className="bg-white border border-stone-200 rounded-2xl p-6">

        {/* Primary instruction */}
        <p className="text-sm text-stone-600 mb-6">
          <strong>Tap a date to mark yourself available.</strong> Tap again to remove.
          {' '}
          <span className="text-stone-400">Or tap start + end date for a range.</span>
        </p>

        {/* Responses section */}
        {members.length > 1 && (
          <div className="mb-6">
            <p className="text-xs text-stone-500 font-medium mb-3">Responses</p>
            <div className="flex flex-wrap gap-2">
              {members.map(m => {
                const hasBlocks = blocks.some(b => b.user_id === m.user_id)
                return (
                  <div
                    key={m.user_id}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg bg-stone-50 border border-stone-200"
                  >
                    <span className="text-sm">{memberNames[m.user_id]}</span>
                    {hasBlocks ? (
                      <Check size={14} className="text-green-600" />
                    ) : (
                      <Clock size={14} className="text-stone-400" />
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Mode toggle */}
        <div className="flex items-center gap-3 mb-6 flex-wrap gap-y-2">
          <span className="text-xs text-stone-500 font-medium">Marking:</span>
          <div className="flex rounded-lg border border-stone-200 overflow-hidden text-sm">
            <button
              type="button"
              onClick={() => setMode('available')}
              className={['px-3 py-1 font-medium transition text-xs', mode === 'available' ? 'bg-green-600 text-white' : 'bg-white text-stone-500 hover:bg-stone-50'].join(' ')}
            >
              ✓ Available
            </button>
            <button
              type="button"
              onClick={() => setMode('unavailable')}
              className={['px-3 py-1 font-medium border-l border-stone-200 transition text-xs', mode === 'unavailable' ? 'bg-red-500 text-white' : 'bg-white text-stone-500 hover:bg-stone-50'].join(' ')}
            >
              ✕ Busy
            </button>
            <button
              type="button"
              onClick={() => setMode('erase')}
              className={['px-3 py-1 font-medium border-l border-stone-200 transition text-xs', mode === 'erase' ? 'bg-slate-600 text-white' : 'bg-white text-stone-500 hover:bg-stone-50'].join(' ')}
            >
              🗑️ Erase
            </button>
          </div>
        </div>

        {/* Month nav */}
        <div className="flex items-center justify-between mb-4">
          <button type="button" onClick={prevMonth}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-stone-400 hover:text-stone-900 hover:bg-stone-100 transition">
            <ChevronLeft size={18} />
          </button>
          <h3 className="font-semibold">{format(currentMonth, 'MMMM yyyy')}</h3>
          <button type="button" onClick={nextMonth}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-stone-400 hover:text-stone-900 hover:bg-stone-100 transition">
            <ChevronRight size={18} />
          </button>
        </div>

        {/* Day headers */}
        <div className="grid grid-cols-7 gap-0.5 mb-0.5">
          {dayLabels.map(label => (
            <div key={label} className="text-center text-xs text-stone-400 font-medium py-0.5">{label}</div>
          ))}
        </div>

        {/* Days grid */}
        <div className="grid grid-cols-7 gap-0.5 overflow-visible">
          {Array.from({ length: startPad }).map((_, i) => <div key={'pad' + i} />)}
          {days.map(day => {
            const status = getStatus(day)
            const inPreview = isInPreview(day)
            const isStart = !!(rangeStart && isSameDay(day, rangeStart))
            const ds = format(day, 'yyyy-MM-dd')

            // Get all members available on this day
            const availableMembers = getAvailableMembersForDate(day)
            const isFullOverlap = availableMembers.length === members.length && members.length >= 2

            // Background based on current user's status
            let bg = 'bg-white hover:bg-stone-50 text-stone-700'
            if (status === 'available' || status === 'preferred') bg = 'bg-green-200 text-green-900 font-semibold'
            if (status === 'unavailable') bg = 'bg-red-100 text-red-400'
            if (inPreview && !status) bg = mode === 'available' ? 'bg-green-100 text-green-700' : mode === 'unavailable' ? 'bg-red-50 text-red-400' : 'bg-white hover:bg-stone-50'

            return (
              <div key={day.toISOString()} className="relative overflow-visible">
                {tooltipDate && isSameDay(day, tooltipDate) && status !== null && !rangeStart && mode !== 'erase' && (
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 z-20 bg-stone-800 text-white text-xs rounded-lg px-2 py-1 whitespace-nowrap shadow-lg pointer-events-none">
                    Click to remove
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => handleDateClick(day)}
                  onMouseEnter={() => {
                    if (rangeStart) setHoverDate(day)
                    if (status !== null && !rangeStart && mode !== 'erase') setTooltipDate(day)
                  }}
                  onMouseLeave={() => {
                    if (rangeStart) setHoverDate(null)
                    setTooltipDate(null)
                  }}
                  className={[
                    'min-h-[2.5rem] w-full rounded-lg text-sm flex flex-col items-center justify-between p-1 transition relative',
                    isToday(day) ? 'ring-2 ring-stone-300' : '',
                    isStart ? 'ring-2 ring-blue-400' : '',
                    isFullOverlap ? 'ring-2 ring-green-500 ring-offset-1' : '',
                    bg
                  ].join(' ')}
                >
                  <span className="relative z-10 text-center w-full">{format(day, 'd')}</span>
                  {/* Colored dots for each member's availability */}
                  {members.length > 1 && availableMembers.length > 0 && (
                    <div className="flex gap-0.5 justify-center mt-0.5">
                      {availableMembers.map(uid => (
                        <div
                          key={uid}
                          className="w-1.5 h-1.5 rounded-full"
                          style={{ backgroundColor: memberColorMap[uid] }}
                          title={memberNames[uid]}
                        />
                      ))}
                    </div>
                  )}
                </button>
              </div>
            )
          })}
        </div>

        {saving && <p className="text-xs text-stone-400 mt-4 text-center animate-pulse">Saving…</p>}

        {/* Always-visible legend */}
        {members.length > 1 && (
          <div className="mt-6 pt-6 border-t border-stone-100">
            <p className="text-xs text-stone-500 font-medium mb-3">Member colors</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {members.map(m => (
                <div key={m.user_id} className="flex items-center gap-2 text-sm text-stone-600">
                  <div
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ backgroundColor: memberColorMap[m.user_id] }}
                  />
                  <span>{memberNames[m.user_id]}{m.user_id === userId ? ' (you)' : ''}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Clear all my dates */}
      {myBlocks.length > 0 && (
        <div className="text-center">
          <button
            type="button"
            onClick={async () => {
              if (!window.confirm('Remove all your availability for this trip?')) return
              setSaving(true)
              const supabase = createClient()
              await supabase.from('availability_blocks').delete().eq('trip_id', tripId).eq('user_id', userId)
              setBlocks(prev => prev.filter(b => b.user_id !== userId))
              setSaving(false)
            }}
            className="text-xs text-stone-400 hover:text-red-500 transition underline"
          >
            Clear all my dates
          </button>
        </div>
      )}

      {/* Post-save CTA */}
      {justSaved && (
        <div className="bg-green-50 border border-green-200 rounded-2xl p-4 flex items-center justify-between gap-4">
          <div>
            <p className="font-semibold text-green-800 text-sm">Saved!</p>
            <p className="text-xs text-green-600 mt-0.5">See where everyone overlaps.</p>
          </div>
          <button
            type="button"
            onClick={() => router.push('/trips/' + tripId)}
            className="flex items-center gap-1.5 bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-800 transition shrink-0"
          >
            View trip <ArrowRight size={14} />
          </button>
        </div>
      )}

      {/* Toast notification */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-stone-900 text-white px-4 py-3 rounded-full text-sm font-medium shadow-lg">
          {toast}
        </div>
      )}
    </div>
  )
}
