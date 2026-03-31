'use client'
import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { AvailabilityBlock, AvailabilityType } from '@/lib/types'
import { format, startOfMonth, endOfMonth, eachDayOfInterval, getDay, isToday, isSameDay } from 'date-fns'
import { ArrowRight } from 'lucide-react'

interface Props {
  tripId: string
  userId: string
  existingBlocks: AvailabilityBlock[]
  members: unknown[]
}

// Upcoming US holiday long weekends — only shown for America/* timezones
const HOLIDAY_CHIPS = [
  { label: '\u2744\ufe0f Christmas wknd',   dates: ['2025-12-24','2025-12-25','2025-12-26','2025-12-27','2025-12-28'], desc: 'Dec 24-28' },
  { label: '\u2728 New Years wknd',     dates: ['2025-12-31','2026-01-01','2026-01-02','2026-01-03'],              desc: 'Dec 31-Jan 3' },
  { label: '\u270a MLK wknd',           dates: ['2026-01-17','2026-01-18','2026-01-19'],                           desc: 'Jan 17-19' },
  { label: '\U0001f338 Spring Break',   dates: ['2026-03-14','2026-03-15','2026-03-16','2026-03-17','2026-03-18','2026-03-19','2026-03-20','2026-03-21'], desc: 'Mar 14-21' },
  { label: '\U0001f1fa\U0001f1f8 Memorial Day',  dates: ['2026-05-23','2026-05-24','2026-05-25'],                 desc: 'May 23-25' },
  { label: '\U0001f386 4th of July',    dates: ['2026-07-03','2026-07-04','2026-07-05','2026-07-06'],              desc: 'Jul 3-6' },
  { label: '\U0001f477 Labor Day',      dates: ['2026-09-05','2026-09-06','2026-09-07'],                           desc: 'Sep 5-7' },
  { label: '\U0001f983 Thanksgiving',   dates: ['2026-11-25','2026-11-26','2026-11-27','2026-11-28','2026-11-29'], desc: 'Nov 25-29' },
]

function isUSTimezone(): boolean {
  try { return Intl.DateTimeFormat().resolvedOptions().timeZone.startsWith('America/') }
  catch { return false }
}

export default function AvailabilityCalendar({ tripId, userId, existingBlocks }: Props) {
  const router = useRouter()
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [blocks, setBlocks] = useState<AvailabilityBlock[]>(existingBlocks)
  const [mode, setMode] = useState<'available' | 'unavailable'>('available')
  const [rangeStart, setRangeStart] = useState<Date | null>(null)
  const [hoverDate, setHoverDate] = useState<Date | null>(null)
  const [saving, setSaving] = useState(false)
  const [justSaved, setJustSaved] = useState(false)
  const showChips = isUSTimezone()

  const myBlocks = blocks.filter(b => b.user_id === userId)

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

  const saveRange = useCallback(async (start: Date, end: Date, type: AvailabilityType) => {
    setSaving(true)
    const supabase = createClient()
    const s = start <= end ? start : end
    const e = start <= end ? end : start
    const { data, error } = await supabase
      .from('availability_blocks')
      .insert({ trip_id: tripId, user_id: userId, start_date: format(s,'yyyy-MM-dd'), end_date: format(e,'yyyy-MM-dd'), type })
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
    if (status === mode) { removeBlock(date); return }
    if (!rangeStart) { setRangeStart(date); return }
    const start = rangeStart
    setRangeStart(null); setHoverDate(null)
    saveRange(start, date, mode)
  }

  async function handleChip(dates: string[]) {
    setSaving(true)
    const supabase = createClient()
    const rows = dates.map(d => ({ trip_id: tripId, user_id: userId, start_date: d, end_date: d, type: 'available' as AvailabilityType }))
    const { data, error } = await supabase.from('availability_blocks').insert(rows).select()
    if (!error && data) { setBlocks(prev => [...prev, ...data]); setJustSaved(true) }
    setSaving(false)
  }

  const monthStart = startOfMonth(currentMonth)
  const days = eachDayOfInterval({ start: monthStart, end: endOfMonth(currentMonth) })
  const startPad = getDay(monthStart)

  return (
    <div className="space-y-4">

      {/* Holiday chips — US only */}
      {showChips && (
        <div>
          <p className="text-xs text-stone-400 mb-2 font-medium uppercase tracking-wide">Quick-add a holiday weekend</p>
          <div className="flex flex-wrap gap-2">
            {HOLIDAY_CHIPS.map(chip => {
              const added = chip.dates.every(d => myBlocks.some(b => d >= b.start_date && d <= b.end_date && b.type === 'available'))
              return (
                <button key={chip.label} onClick={() => !added && handleChip(chip.dates)} disabled={saving || added}
                  className={[
                    'flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm border transition',
                    added ? 'bg-green-50 border-green-200 text-green-700 cursor-default' : 'bg-white border-stone-200 text-stone-700 hover:border-stone-400 hover:shadow-sm',
                    'disabled:opacity-60'
                  ].join(' ')}>
                  {chip.label}
                  <span className="text-xs text-stone-400">{chip.desc}</span>
                  {added && <span className="text-green-500">\u2713</span>}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Calendar */}
      <div className="bg-white border border-stone-200 rounded-2xl p-6">

        {/* Mode toggle */}
        <div className="flex items-center gap-3 mb-6 flex-wrap">
          <span className="text-xs text-stone-500 font-medium">Marking:</span>
          <div className="flex rounded-lg border border-stone-200 overflow-hidden text-sm">
            <button onClick={() => setMode('available')}
              className={['px-4 py-1.5 font-medium transition', mode === 'available' ? 'bg-green-600 text-white' : 'bg-white text-stone-500 hover:bg-stone-50'].join(' ')}>
              \u2713 Available
            </button>
            <button onClick={() => setMode('unavailable')}
              className={['px-4 py-1.5 font-medium border-l border-stone-200 transition', mode === 'unavailable' ? 'bg-red-500 text-white' : 'bg-white text-stone-500 hover:bg-stone-50'].join(' ')}>
              \u2715 Busy
            </button>
          </div>
          <span className="ml-auto text-xs text-stone-400">{rangeStart ? 'Now click end date' : 'Click start, then end'}</span>
        </div>

        {/* Month nav */}
        <div className="flex items-center justify-between mb-4">
          <button onClick={() => setCurrentMonth(d => new Date(d.getFullYear(), d.getMonth()-1))}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-stone-400 hover:bg-stone-100 transition">\u2190</button>
          <h3 className="font-semibold">{format(currentMonth, 'MMMM yyyy')}</h3>
          <button onClick={() => setCurrentMonth(d => new Date(d.getFullYear(), d.getMonth()+1))}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-stone-400 hover:bg-stone-100 transition">\u2192</button>
        </div>

        {/* Day headers */}
        <div className="grid grid-cols-7 gap-1 mb-1">
          {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d => (
            <div key={d} className="text-center text-xs text-stone-400 font-medium py-1">{d}</div>
          ))}
        </div>

        {/* Days grid */}
        <div className="grid grid-cols-7 gap-1">
          {Array.from({ length: startPad }).map((_,i) => <div key={'p'+i} />)}
          {days.map(day => {
            const status = getStatus(day)
            const preview = isInPreview(day)
            const isStart = rangeStart && isSameDay(day, rangeStart)
            let bg = 'hover:bg-stone-100 text-stone-700'
            if (status === 'available' || status === 'preferred') bg = 'bg-green-200 text-green-900 font-semibold'
            if (status === 'unavailable') bg = 'bg-red-100 text-red-400'
            if (preview && !status) bg = mode === 'available' ? 'bg-green-100 text-green-700' : 'bg-red-50 text-red-400'
            return (
              <button key={day.toISOString()} onClick={() => handleDateClick(day)}
                onMouseEnter={() => rangeStart && setHoverDate(day)}
                onMouseLeave={() => rangeStart && setHoverDate(null)}
                className={['aspect-square rounded-lg text-sm flex items-center justify-center transition',
                  isToday(day) ? 'ring-2 ring-stone-300' : '',
                  isStart ? 'ring-2 ring-blue-400' : '',
                  bg].join(' ')}>
                {format(day, 'd')}
              </button>
            )
          })}
        </div>

        {saving && <p className="text-xs text-stone-400 mt-4 text-center animate-pulse">Saving\u2026</p>}

        {/* Legend */}
        <div className="flex gap-4 mt-5 pt-4 border-t border-stone-100 flex-wrap">
          <div className="flex items-center gap-1.5 text-xs text-stone-500"><div className="w-3 h-3 rounded bg-green-200" /> Available</div>
          <div className="flex items-center gap-1.5 text-xs text-stone-500"><div className="w-3 h-3 rounded bg-red-100" /> Busy</div>
          <div className="flex items-center gap-1.5 text-xs text-stone-500"><div className="w-3 h-3 rounded ring-2 ring-stone-300" /> Today</div>
        </div>
      </div>

      {/* Post-save CTA */}
      {justSaved && (
        <div className="bg-green-50 border border-green-200 rounded-2xl p-4 flex items-center justify-between gap-4">
          <div>
            <p className="font-semibold text-green-800 text-sm">Saved!</p>
            <p className="text-xs text-green-600 mt-0.5">See where everyone overlaps.</p>
          </div>
          <button onClick={() => router.push('/trips/'+tripId)}
            className="flex items-center gap-1.5 bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-800 transition shrink-0">
            View trip <ArrowRight size={14} />
          </button>
        </div>
      )}
    </div>
  )
}
