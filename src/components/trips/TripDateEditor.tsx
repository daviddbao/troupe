'use client'
import { useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Calendar } from 'lucide-react'

interface Props {
  tripId: string
  startDate: string | null
  endDate: string | null
  isAdmin: boolean
}

export default function TripDateEditor({ tripId, startDate, endDate, isAdmin }: Props) {
  const [isEditing, setIsEditing] = useState(false)
  const [newStartDate, setNewStartDate] = useState(startDate || '')
  const [newEndDate, setNewEndDate] = useState(endDate || '')
  const [saving, setSaving] = useState(false)

  const handleSave = useCallback(async () => {
    if (!newStartDate || !newEndDate) return
    if (newStartDate > newEndDate) {
      alert('Start date must be before end date')
      return
    }

    setSaving(true)
    const supabase = createClient()
    const { error } = await supabase
      .from('trips')
      .update({
        start_date: newStartDate,
        end_date: newEndDate,
      })
      .eq('id', tripId)

    if (!error) {
      setIsEditing(false)
      // Refresh page to show updated dates
      window.location.reload()
    }
    setSaving(false)
  }, [tripId, newStartDate, newEndDate])

  const handleCancel = () => {
    setNewStartDate(startDate || '')
    setNewEndDate(endDate || '')
    setIsEditing(false)
  }

  const formatDateDisplay = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  if (isEditing && isAdmin) {
    return (
      <div className="bg-white border border-stone-200 rounded-lg p-4">
        <div className="flex items-center gap-3 mb-4">
          <Calendar size={18} className="text-stone-400" />
          <span className="font-semibold text-sm">Edit Trip Dates</span>
        </div>
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label htmlFor="start" className="block text-xs font-medium text-stone-600 mb-1">
              Start date
            </label>
            <input
              id="start"
              type="date"
              value={newStartDate}
              onChange={(e) => setNewStartDate(e.target.value)}
              className="w-full px-3 py-2 border border-stone-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
          </div>
          <div>
            <label htmlFor="end" className="block text-xs font-medium text-stone-600 mb-1">
              End date
            </label>
            <input
              id="end"
              type="date"
              value={newEndDate}
              onChange={(e) => setNewEndDate(e.target.value)}
              className="w-full px-3 py-2 border border-stone-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleSave}
            disabled={saving || !newStartDate || !newEndDate}
            className="flex-1 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save dates'}
          </button>
          <button
            onClick={handleCancel}
            className="px-4 py-2 border border-stone-200 text-sm font-medium rounded-lg hover:bg-stone-50 transition"
          >
            Cancel
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white border border-stone-200 rounded-lg p-4 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <Calendar size={18} className="text-stone-400" />
        <div>
          {startDate && endDate ? (
            <div>
              <p className="text-sm font-medium">
                {formatDateDisplay(startDate)} – {formatDateDisplay(endDate)}
              </p>
              <p className="text-xs text-stone-500">
                {Math.ceil((new Date(endDate).getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24)) + 1} days
              </p>
            </div>
          ) : (
            <p className="text-sm text-stone-500">Dates not set</p>
          )}
        </div>
      </div>
      {isAdmin && (
        <button
          onClick={() => {
            setNewStartDate(startDate || '')
            setNewEndDate(endDate || '')
            setIsEditing(true)
          }}
          className="text-xs font-medium px-3 py-2 rounded-lg border border-stone-200 hover:bg-stone-50 transition"
        >
          Edit
        </button>
      )}
    </div>
  )
}
