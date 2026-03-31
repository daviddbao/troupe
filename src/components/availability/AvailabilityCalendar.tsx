'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { AvailabilityBlock, AvailabilityType } from '@/lib/types'
import { format, startOfMonth, endOfMonth, eachDayOfInterval, getDay, isToday } from 'date-fns'
import { ArrowRight, Sparkles } from 'lucide-react'

interface Props {
  tripId: string
  userId: string
  existingBlocks: AvailabilityBlock[]
  members: unknown[]
}

const US_FEDERAL_HOLIDAYS: Record<number, string[]> = {
  2025: [
    '2025-01-01','2025-01-20','2025-02-17','2025-05-26','2025-06-19',
    '2025-07-04','2025-09-01','2025-10-13','2025-11-11','2025-11-27','2025-12-25'
  ],
  2026: [
    '2026-01-01','2026-01-19','2026-02-16','2026-05-25','2026-06-19',
    '2026-07-03','2026-09-07','2026-10-12','2026-11-11','2026-11-26','2026-12-25'
  ]
}

const TYPE_COLORS: Record<AvailabilityType, string> = {
  available: 'bg-green-200 text-green-800',
  preferred: 'bg-blue-200 text-blue-800',
  unavailable: 'bg-red-100 text-red-400 line-through',
}

function isUSTimezone(): boolean {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone
    return tz.startsWith('America/')
  } catch {
    return false
  }
}

export default function AvailabilityCalendar({ tripId, userId, existingBlocks }: Props) {
  const router = useRouter()
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [blocks, setBlocks] = useState<AvailabilityBlock[]>(existingBlocks)
  const [selectedType, setSelectedType] = useState<AvailabilityType>('available')
  const [rangeStart, setRangeStart] = useState<Date | null>(null)
  const [saving, setSaving] = useState(false)
  const [justSaved, setJustSaved] = useState(false)
  const [holidayDates, setHolidayDates] = useState<string[]>([])
  const [holidaysVisible, setHolidaysVisible] = useState(false)
  const [savingHolidays, setSavingHolidays] = useState(false)
  const isUS = isUSTimezone()

  const myBlocks = blocks.filter(b => b.user_id === userId)

  function getDateStatus(date: Date): AvailabilityType | null {
    const dateStr = format(date, 'yyyy-MM-dd')
    const block = myBlocks.find(b => dateStr >= b.start_date && dateStr <= b.end_date)
    return block?.type ?? null
  }

  function isHoliday(date: Date): boolean {
    return holidayDates.includes(format(date, 'yyyy-MM-dd'))
  }

  function handleShowHolidays() {
    const year = currentMonth.getFullYear()
    const dates = US_FEDERAL_HOLIDAYS[year] ?? US_FEDERAL_HOLIDAYS[2026]
    setHolidayDates(dates)
    setHolidaysVisible(true)
  }

  async function handleSaveHolidays() {
    setSavingHolidays(true)
    const supabase = createClient()
    const insertions = holidayDates.map(date => ({
      trip_id: tripId,
      user_id: userId,
      start_date: date,
      end_date: date,
      type: 'unavailable' as AvailabilityType,
      note: 'Federal holiday',
    }))
    const { data, error } = await supabase
      .from('availability_blocks')
      .insert(insertions)
      .select()
    if (!error && data) {
      setBlocks(prev => [...prev, ...data])
    }
    setHolidaysVisible(false)
    setHolidayDates([])
    setSavingHolidays(false)
    setJustSaved(true)
  }

  async function handleDateClick(date: Date) {
    if (!rangeStart) {
      setRangeStart(date)
      return
    }

    const start = rangeStart <= date ? rangeStart : date
    const end = rangeStart <= date ? date : rangeStart
    setRangeStart(null)
    setSaving(true)

    const supabase = createClient()
    const { data, error } = await supabase
      .from('availability_blocks')
      .insert({
        trip_id: tripId,
        user_id: userId,
        start_date: format(start, 'yyyy-MM-dd'),
        end_date: format(end, 'yyyy-MM-dd'),
        type: selectedType,
      })
      .select()
      .single()

    if (!error && data) {
      setBlocks(prev => [...prev, data])
      setJustSaved(true)
    }
    setSaving(false)
  }

  const monthStart = startOfMonth(currentMonth)
  const monthEnd = endOfMonth(currentMonth)
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd })
  const startPad = getDay(monthStart)

  return (
    <div className="space-y-4">
      <div className="bg-white border border-stone-200 rounded-2xl p-6">
        {/* Holiday suggestion */}
        {isUS && !holidaysVisible && (
          <button
            onClick={handleShowHolidays}
            className="flex items-center gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 px-3 py-2 rounded-lg mb-5 hover:bg-amber-100 transition"
          >
            <Sparkles size={12} />
            Include US federal holidays as unavailable
          </button>
        )}
        {holidaysVisible && (
          <div className="flex items-center justify-between bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 mb-5">
            <span className="text-xs text-amber-800 font-medium">
              {holidayDates.length} federal holidays highlighted in orange
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => { setHolidaysVisible(false); setHolidayDates([]) }}
                className="text-xs text-stone-500 hover:text-stone-900"
              >
                Dismiss
              </button>
              <button
                onClick={handleSaveHolidays}
                disabled={savingHolidays}
                className="text-xs bg-amber-600 text-white px-3 py-1 rounded-lg hover:bg-amber-700 transition disabled:opacity-50"
              >
                {savingHolidays ? 'Saving...' : 'Save as unavailable'}
              </button>
            </div>
          </div>
        )}

        {/* Type selector */}
        <div className="flex gap-2 mb-6 flex-wrap">
          {(['available', 'preferred', 'unavailable'] as AvailabilityType[]).map(type => (
            <button
              key={type}
              onClick={() => setSelectedType(type)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition ${
                selectedType === type ? 'border-stone-900 bg-stone-900 text-white' : 'border-stone-200 text-stone-600 hover:border-stone-400'
              }`}
            >
              {type.charAt(0).toUpperCase() + type.slice(1)}
            </button>
          ))}
          <span className="ml-auto text-xs text-stone-400 self-center">
            {rangeStart ? 'Now click the end date' : 'Click a start date'}
          </span>
        </div>

        {/* Month nav */}
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={() => setCurrentMonth(d => new Date(d.getFullYear(), d.getMonth() - 1))}
            className="text-stone-400 hover:text-stone-900 transition px-2 py-1 text-lg"
          >←</button>
          <h3 className="font-semibold">{format(currentMonth, 'MMMM yyyy')}</h3>
          <button
            onClick={() => setCurrentMonth(d => new Date(d.getFullYear(), d.getMonth() + 1))}
            className="text-stone-400 hover:text-stone-900 transition px-2 py-1 text-lg"
          >→</button>
        </div>

        {/* Day labels */}
        <div className="grid grid-cols-7 gap-1 mb-2">
          {['Su','Mo','Tu','We','Th','Fr','Sa'].map(d => (
            <div key={d} className="text-center text-xs text-stone-400 font-medium py-1">{d}</div>
          ))}
        </div>

        {/* Days grid */}
        <div className="grid grid-cols-7 gap-1">
          {Array.from({ length: startPad }).map((_, i) => <div key={`pad-${i}`} />)}
          {days.map(day => {
            const status = getDateStatus(day)
            const holiday = isHoliday(day)
            const isStart = rangeStart && format(day, 'yyyy-MM-dd') === format(rangeStart, 'yyyy-MM-dd')
            return (
              <button
                key={day.toISOString()}
                onClick={() => handleDateClick(day)}
                className={`
                  aspect-square rounded-lg text-sm flex items-center justify-center transition font-medium
                  ${isToday(day) ? 'ring-2 ring-stone-400' : ''}
                  ${isStart ? 'ring-2 ring-blue-500' : ''}
                  ${status ? TYPE_COLORS[status] :
                    holiday ? 'bg-amber-100 text-amber-700' :
                    'hover:bg-stone-100 text-stone-700'}
                `}
                title={holiday ? 'Federal holiday' : undefined}
              >
                {format(day, 'd')}
              </button>
            )
          })}
        </div>

        {saving && <p className="text-xs text-stone-400 mt-4 text-center">Saving...</p>}

        {/* Legend */}
        <div className="flex flex-wrap gap-4 mt-6 pt-4 border-t border-stone-100">
          <div className="flex items-center gap-1.5 text-xs text-stone-500">
            <div className="w-3 h-3 rounded bg-green-200" /> Available
          </div>
          <div className="flex items-center gap-1.5 text-xs text-stone-500">
            <div className="w-3 h-3 rounded bg-blue-200" /> Preferred
          </div>
          <div className="flex items-center gap-1.5 text-xs text-stone-500">
            <div className="w-3 h-3 rounded bg-red-100" /> Unavailable
          </div>
          {(holidaysVisible || holidayDates.length > 0) && (
            <div className="flex items-center gap-1.5 text-xs text-stone-500">
              <div className="w-3 h-3 rounded bg-amber-100" /> Holiday
            </div>
          )}
        </div>
      </div>

      {/* Post-save CTA */}
      {justSaved && (
        <div className="bg-green-50 border border-green-200 rounded-2xl p-5 flex items-center justify-between">
          <div>
            <p className="font-semibold text-green-800 text-sm">✓ Availability saved!</p>
            <p className="text-xs text-green-600 mt-0.5">Ready to see group overlap and next steps?</p>
          </div>
          <button
            onClick={() => router.push(`/trips/${tripId}`)}
            className="flex items-center gap-1.5 bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-800 transition"
          >
            View overlap <ArrowRight size={14} />
          </button>
        </div>
      )}
    </div>
  )
}
