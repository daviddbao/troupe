'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { AvailabilityBlock, AvailabilityType } from '@/lib/types'
import { format, startOfMonth, endOfMonth, eachDayOfInterval, getDay, isToday } from 'date-fns'

interface Props {
  tripId: string
  userId: string
  existingBlocks: AvailabilityBlock[]
  members: unknown[]
}

const TYPE_COLORS: Record<AvailabilityType, string> = {
  available: 'bg-green-200 text-green-800',
  preferred: 'bg-blue-200 text-blue-800',
  unavailable: 'bg-red-100 text-red-400 line-through',
}

export default function AvailabilityCalendar({ tripId, userId, existingBlocks }: Props) {
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [blocks, setBlocks] = useState<AvailabilityBlock[]>(existingBlocks)
  const [selectedType, setSelectedType] = useState<AvailabilityType>('available')
  const [rangeStart, setRangeStart] = useState<Date | null>(null)
  const [saving, setSaving] = useState(false)

  const myBlocks = blocks.filter(b => b.user_id === userId)

  function getDateStatus(date: Date): AvailabilityType | null {
    const dateStr = format(date, 'yyyy-MM-dd')
    const block = myBlocks.find(b =>
      dateStr >= b.start_date && dateStr <= b.end_date
    )
    return block?.type ?? null
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
    }
    setSaving(false)
  }

  const monthStart = startOfMonth(currentMonth)
  const monthEnd = endOfMonth(currentMonth)
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd })
  const startPad = getDay(monthStart) // 0=Sun

  return (
    <div className="bg-white border border-stone-200 rounded-2xl p-6">
      {/* Type selector */}
      <div className="flex gap-2 mb-6">
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
          {rangeStart ? 'Click end date' : 'Click to start range'}
        </span>
      </div>

      {/* Month nav */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={() => setCurrentMonth(d => new Date(d.getFullYear(), d.getMonth() - 1))}
          className="text-stone-400 hover:text-stone-900 transition px-2 py-1"
        >←</button>
        <h3 className="font-semibold">
          {format(currentMonth, 'MMMM yyyy')}
        </h3>
        <button
          onClick={() => setCurrentMonth(d => new Date(d.getFullYear(), d.getMonth() + 1))}
          className="text-stone-400 hover:text-stone-900 transition px-2 py-1"
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
          const isStart = rangeStart && format(day, 'yyyy-MM-dd') === format(rangeStart, 'yyyy-MM-dd')
          return (
            <button
              key={day.toISOString()}
              onClick={() => handleDateClick(day)}
              className={`
                aspect-square rounded-lg text-sm flex items-center justify-center transition font-medium
                ${isToday(day) ? 'ring-2 ring-stone-400' : ''}
                ${isStart ? 'ring-2 ring-blue-500' : ''}
                ${status ? TYPE_COLORS[status] : 'hover:bg-stone-100 text-stone-700'}
              `}
            >
              {format(day, 'd')}
            </button>
          )
        })}
      </div>

      {saving && <p className="text-xs text-stone-400 mt-4 text-center">Saving...</p>}

      {/* Legend */}
      <div className="flex gap-4 mt-6 pt-4 border-t border-stone-100">
        <div className="flex items-center gap-1.5 text-xs text-stone-500">
          <div className="w-3 h-3 rounded bg-green-200" /> Available
        </div>
        <div className="flex items-center gap-1.5 text-xs text-stone-500">
          <div className="w-3 h-3 rounded bg-blue-200" /> Preferred
        </div>
        <div className="flex items-center gap-1.5 text-xs text-stone-500">
          <div className="w-3 h-3 rounded bg-red-100" /> Unavailable
        </div>
      </div>
    </div>
  )
}
