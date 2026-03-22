'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { ItineraryItem, ItineraryCategory } from '@/lib/types'
import { Plus, MapPin, Clock, Trash2 } from 'lucide-react'
import { format, addDays, parseISO, differenceInDays } from 'date-fns'

interface Props {
  tripId: string
  userId: string
  items: ItineraryItem[]
  startDate: string | null
  endDate: string | null
}

const CATEGORY_COLORS: Record<ItineraryCategory, string> = {
  transport: 'bg-purple-100 text-purple-700',
  accommodation: 'bg-blue-100 text-blue-700',
  activity: 'bg-green-100 text-green-700',
  food: 'bg-amber-100 text-amber-700',
  other: 'bg-stone-100 text-stone-600',
}

const CATEGORY_EMOJI: Record<ItineraryCategory, string> = {
  transport: '✈️',
  accommodation: '🏨',
  activity: '🎯',
  food: '🍽️',
  other: '📌',
}

export default function ItineraryView({ tripId, userId, items: initialItems, startDate, endDate }: Props) {
  const [items, setItems] = useState<ItineraryItem[]>(initialItems)
  const [addingToDay, setAddingToDay] = useState<number | null>(null)
  const [form, setForm] = useState({ title: '', description: '', location: '', start_time: '', category: 'activity' as ItineraryCategory })
  const [saving, setSaving] = useState(false)

  const tripDays = startDate && endDate
    ? differenceInDays(parseISO(endDate), parseISO(startDate)) + 1
    : Math.max(...items.map(i => i.day_index), 6) + 1

  const dayNumbers = Array.from({ length: Math.max(tripDays, 1) }, (_, i) => i)

  async function addItem(dayIndex: number) {
    if (!form.title.trim()) return
    setSaving(true)
    const supabase = createClient()
    const { data, error } = await supabase
      .from('itinerary_items')
      .insert({
        trip_id: tripId,
        user_id: userId,
        day_index: dayIndex,
        title: form.title,
        description: form.description || null,
        location: form.location || null,
        start_time: form.start_time || null,
        category: form.category,
        created_by: userId,
      })
      .select()
      .single()

    if (!error && data) {
      setItems(prev => [...prev, data].sort((a, b) => a.day_index - b.day_index || (a.start_time ?? '').localeCompare(b.start_time ?? '')))
    }
    setForm({ title: '', description: '', location: '', start_time: '', category: 'activity' })
    setAddingToDay(null)
    setSaving(false)
  }

  async function deleteItem(id: string) {
    const supabase = createClient()
    await supabase.from('itinerary_items').delete().eq('id', id)
    setItems(prev => prev.filter(i => i.id !== id))
  }

  return (
    <div className="space-y-8">
      {dayNumbers.map(dayIndex => {
        const dayItems = items.filter(i => i.day_index === dayIndex)
        const dayLabel = startDate
          ? format(addDays(parseISO(startDate), dayIndex), 'EEE, MMM d')
          : `Day ${dayIndex + 1}`

        return (
          <div key={dayIndex}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-stone-700">
                <span className="text-stone-400 text-sm mr-2">Day {dayIndex + 1}</span>
                {dayLabel}
              </h3>
              <button
                onClick={() => setAddingToDay(addingToDay === dayIndex ? null : dayIndex)}
                className="flex items-center gap-1 text-xs text-stone-500 hover:text-stone-900 transition"
              >
                <Plus size={14} /> Add item
              </button>
            </div>

            {/* Items */}
            <div className="space-y-2">
              {dayItems.map(item => (
                <div key={item.id} className="bg-white border border-stone-200 rounded-xl px-4 py-3 flex items-start gap-3 group">
                  <span className="text-lg">{CATEGORY_EMOJI[item.category]}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-sm">{item.title}</p>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${CATEGORY_COLORS[item.category]}`}>
                        {item.category}
                      </span>
                    </div>
                    {item.start_time && (
                      <p className="text-xs text-stone-400 flex items-center gap-1 mt-0.5">
                        <Clock size={10} /> {item.start_time.slice(0, 5)}
                      </p>
                    )}
                    {item.location && (
                      <p className="text-xs text-stone-400 flex items-center gap-1">
                        <MapPin size={10} /> {item.location}
                      </p>
                    )}
                    {item.description && (
                      <p className="text-xs text-stone-500 mt-1">{item.description}</p>
                    )}
                  </div>
                  {item.created_by === userId && (
                    <button
                      onClick={() => deleteItem(item.id)}
                      className="opacity-0 group-hover:opacity-100 text-stone-300 hover:text-red-400 transition"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              ))}

              {dayItems.length === 0 && addingToDay !== dayIndex && (
                <p className="text-xs text-stone-400 italic pl-1">Nothing planned yet</p>
              )}
            </div>

            {/* Add form */}
            {addingToDay === dayIndex && (
              <div className="mt-3 bg-white border border-stone-300 rounded-xl p-4 space-y-3">
                <input
                  placeholder="Title *"
                  value={form.title}
                  onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-stone-400"
                />
                <div className="grid grid-cols-2 gap-2">
                  <input
                    placeholder="Location"
                    value={form.location}
                    onChange={e => setForm(f => ({ ...f, location: e.target.value }))}
                    className="border border-stone-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-stone-400"
                  />
                  <input
                    type="time"
                    value={form.start_time}
                    onChange={e => setForm(f => ({ ...f, start_time: e.target.value }))}
                    className="border border-stone-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-stone-400"
                  />
                </div>
                <select
                  value={form.category}
                  onChange={e => setForm(f => ({ ...f, category: e.target.value as ItineraryCategory }))}
                  className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-stone-400"
                >
                  {(['activity', 'food', 'transport', 'accommodation', 'other'] as ItineraryCategory[]).map(c => (
                    <option key={c} value={c}>{CATEGORY_EMOJI[c]} {c.charAt(0).toUpperCase() + c.slice(1)}</option>
                  ))}
                </select>
                <textarea
                  placeholder="Notes (optional)"
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  rows={2}
                  className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-stone-400 resize-none"
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => addItem(dayIndex)}
                    disabled={saving || !form.title.trim()}
                    className="flex-1 bg-stone-900 text-white rounded-lg py-2 text-sm font-medium hover:bg-stone-700 transition disabled:opacity-50"
                  >
                    {saving ? 'Adding...' : 'Add item'}
                  </button>
                  <button
                    onClick={() => setAddingToDay(null)}
                    className="px-4 border border-stone-200 rounded-lg text-sm text-stone-600 hover:bg-stone-50 transition"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
