'use client'
import { useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { ItineraryItem } from '@/lib/types'
import { Plus, X } from 'lucide-react'
import { format, addDays, parseISO, differenceInDays } from 'date-fns'

interface Props {
  tripId: string
  userId: string
  items: ItineraryItem[]
  startDate: string | null
  endDate: string | null
}

const ACTIVITY_TYPES = ['Solo', 'Group', 'Open'] as const
type ActivityType = typeof ACTIVITY_TYPES[number]

const TYPE_COLORS: Record<ActivityType, string> = {
  'Solo': 'bg-blue-100 border-blue-300 text-blue-700',
  'Group': 'bg-green-100 border-green-300 text-green-700',
  'Open': 'bg-amber-100 border-amber-300 text-amber-700',
}

const HOURS = Array.from({ length: 16 }, (_, i) => i + 8) // 8am to 11pm

export default function ItineraryGridView({ tripId, userId, items: initialItems, startDate, endDate }: Props) {
  const [items, setItems] = useState<ItineraryItem[]>(initialItems)
  const [selectedSlot, setSelectedSlot] = useState<{ dayIndex: number; hour: number } | null>(null)
  const [form, setForm] = useState({
    title: '',
    notes: '',
    type: 'Open' as ActivityType,
    startTime: '09:00',
    endTime: '10:00',
  })
  const [saving, setSaving] = useState(false)

  if (!startDate || !endDate) {
    return (
      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-8 text-center">
        <p className="text-amber-800 font-semibold">Set trip dates first</p>
        <p className="text-sm text-amber-700 mt-2">
          Go to Preferences to set your trip start and end dates before planning the itinerary.
        </p>
      </div>
    )
  }

  const tripStartDate = parseISO(startDate)
  const tripEndDate = parseISO(endDate)
  const tripDays = differenceInDays(tripEndDate, tripStartDate) + 1
  const dayIndices = Array.from({ length: tripDays }, (_, i) => i)

  const getItemsForSlot = (dayIndex: number, hour: number) => {
    return items.filter(item => {
      if (item.day_index !== dayIndex) return false
      if (!item.start_time) return false
      const itemHour = parseInt(item.start_time.split(':')[0])
      return itemHour === hour
    })
  }

  const handleAddItem = useCallback(async () => {
    if (!form.title.trim() || selectedSlot === null) return

    setSaving(true)
    const supabase = createClient()
    const currentDate = addDays(tripStartDate, selectedSlot.dayIndex)

    const { data, error } = await supabase
      .from('itinerary_items')
      .insert({
        trip_id: tripId,
        day_index: selectedSlot.dayIndex,
        title: form.title,
        description: form.notes || null,
        location: null,
        start_time: form.startTime,
        end_time: form.endTime,
        category: 'activity',
        created_by: userId,
      })
      .select()
      .single()

    if (!error && data) {
      setItems(prev => [...prev, data])
      setForm({ title: '', notes: '', type: 'Open', startTime: '09:00', endTime: '10:00' })
      setSelectedSlot(null)
    }
    setSaving(false)
  }, [selectedSlot, form, tripId, userId, tripStartDate])

  const handleDeleteItem = useCallback(async (id: string) => {
    const supabase = createClient()
    await supabase.from('itinerary_items').delete().eq('id', id)
    setItems(prev => prev.filter(i => i.id !== id))
  }, [])

  return (
    <div className="space-y-6">
      {/* Day headers and grid */}
      <div className="overflow-x-auto border border-stone-200 rounded-2xl bg-white">
        <div className="inline-block min-w-full">
          {/* Day headers */}
          <div className="flex border-b border-stone-200 sticky top-0 bg-white z-10">
            <div className="w-20 flex-shrink-0 border-r border-stone-200 p-3 text-xs font-semibold text-stone-500">Time</div>
            {dayIndices.map(dayIndex => {
              const date = addDays(tripStartDate, dayIndex)
              return (
                <div
                  key={dayIndex}
                  className="flex-1 min-w-[200px] border-r border-stone-200 p-3 text-center text-sm font-semibold text-stone-700 bg-stone-50"
                >
                  <div className="text-stone-500 text-xs font-medium">{format(date, 'EEE')}</div>
                  <div>{format(date, 'MMM d')}</div>
                </div>
              )
            })}
          </div>

          {/* Time slots grid */}
          {HOURS.map(hour => (
            <div key={hour} className="flex border-b border-stone-100 last:border-0">
              <div className="w-20 flex-shrink-0 border-r border-stone-200 p-3 text-xs text-stone-400 font-medium text-center">
                {hour % 12 === 0 ? 12 : hour % 12}{hour < 12 ? 'am' : 'pm'}
              </div>
              {dayIndices.map(dayIndex => {
                const slotItems = getItemsForSlot(dayIndex, hour)
                return (
                  <div
                    key={`${dayIndex}-${hour}`}
                    className="flex-1 min-w-[200px] border-r border-stone-200 p-2 min-h-[80px] relative bg-stone-50/30 hover:bg-stone-50 transition cursor-pointer"
                    onClick={() => setSelectedSlot({ dayIndex, hour })}
                  >
                    <div className="space-y-1">
                      {slotItems.map(item => (
                        <div
                          key={item.id}
                          className={`rounded px-2 py-1 text-xs font-medium border ${TYPE_COLORS[item.start_time ? 'Open' : 'Solo']} relative group`}
                        >
                          <div className="line-clamp-2">{item.title}</div>
                          {item.created_by === userId && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                handleDeleteItem(item.id)
                              }}
                              className="absolute -top-2 -right-2 opacity-0 group-hover:opacity-100 bg-red-500 text-white rounded-full p-0.5 transition"
                            >
                              <X size={12} />
                            </button>
                          )}
                        </div>
                      ))}
                      {slotItems.length === 0 && (
                        <div className="text-xs text-stone-300 flex items-center justify-center h-full">
                          <Plus size={14} />
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Add activity modal */}
      {selectedSlot && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-lg space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-lg">Add Activity</h3>
              <button
                onClick={() => setSelectedSlot(null)}
                className="text-stone-400 hover:text-stone-900 transition"
              >
                <X size={20} />
              </button>
            </div>

            <div className="text-sm text-stone-600">
              {format(addDays(tripStartDate, selectedSlot.dayIndex), 'EEEE, MMM d')} at {String(selectedSlot.hour).padStart(2, '0')}:00
            </div>

            <input
              type="text"
              placeholder="Activity title *"
              value={form.title}
              onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-stone-400"
            />

            <div className="grid grid-cols-2 gap-2">
              <input
                type="time"
                value={form.startTime}
                onChange={e => setForm(f => ({ ...f, startTime: e.target.value }))}
                className="border border-stone-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-stone-400"
              />
              <input
                type="time"
                value={form.endTime}
                onChange={e => setForm(f => ({ ...f, endTime: e.target.value }))}
                className="border border-stone-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-stone-400"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-stone-700 block mb-2">Type</label>
              <div className="flex gap-2">
                {ACTIVITY_TYPES.map(type => (
                  <button
                    key={type}
                    onClick={() => setForm(f => ({ ...f, type }))}
                    className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition ${
                      form.type === type
                        ? TYPE_COLORS[type]
                        : 'border border-stone-200 text-stone-600 hover:border-stone-400'
                    }`}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>

            <textarea
              placeholder="Notes (optional)"
              value={form.notes}
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              rows={3}
              className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-stone-400 resize-none"
            />

            <div className="flex gap-2">
              <button
                onClick={handleAddItem}
                disabled={saving || !form.title.trim()}
                className="flex-1 bg-stone-900 text-white rounded-lg py-2 text-sm font-medium hover:bg-stone-700 transition disabled:opacity-50"
              >
                {saving ? 'Adding...' : 'Add Activity'}
              </button>
              <button
                onClick={() => setSelectedSlot(null)}
                className="px-4 border border-stone-200 rounded-lg text-sm text-stone-600 hover:bg-stone-50 transition"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
