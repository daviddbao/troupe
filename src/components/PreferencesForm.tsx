'use client'
import { useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Check } from 'lucide-react'

interface PreferencesFormProps {
  tripId: string
  initialPreferences: any
}

const weatherOptions = [
  { emoji: '☀️', label: 'Warm' },
  { emoji: '❄️', label: 'Cold' },
  { emoji: '🌤️', label: 'Mild' },
  { emoji: '🤷', label: 'Any' },
]

export default function PreferencesForm({ tripId, initialPreferences = {} }: PreferencesFormProps) {
  const [nights, setNights] = useState(initialPreferences?.nights ?? 3)
  const [ptoDays, setPtoDays] = useState(initialPreferences?.pto_days ?? 0)
  const [geography, setGeography] = useState(initialPreferences?.geography ?? '')
  const [weather, setWeather] = useState(initialPreferences?.weather ?? 'Any')
  const [notes, setNotes] = useState(initialPreferences?.notes ?? '')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const handleSave = useCallback(async () => {
    setSaving(true)
    const supabase = createClient()
    const { error } = await supabase
      .from('trips')
      .update({
        preferences: {
          nights,
          pto_days: ptoDays,
          geography,
          weather,
          notes,
        }
      })
      .eq('id', tripId)

    if (!error) {
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    }
    setSaving(false)
  }, [tripId, nights, ptoDays, geography, weather, notes])

  return (
    <div className="space-y-6">
      {/* Trip length */}
      <div>
        <label className="block text-sm font-semibold text-stone-900 mb-3">
          How many nights?
        </label>
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => setNights(Math.max(1, nights - 1))}
            className="w-10 h-10 flex items-center justify-center border border-stone-200 rounded-lg hover:bg-stone-50 transition"
          >
            −
          </button>
          <span className="text-2xl font-semibold w-8 text-center">{nights}</span>
          <button
            type="button"
            onClick={() => setNights(Math.min(21, nights + 1))}
            className="w-10 h-10 flex items-center justify-center border border-stone-200 rounded-lg hover:bg-stone-50 transition"
          >
            +
          </button>
        </div>
        <p className="text-xs text-stone-400 mt-2">Range: 1–21 nights</p>
      </div>

      {/* PTO budget */}
      <div>
        <label htmlFor="pto" className="block text-sm font-semibold text-stone-900 mb-3">
          PTO days budget
        </label>
        <input
          id="pto"
          type="number"
          min="0"
          max="30"
          value={ptoDays}
          onChange={(e) => setPtoDays(Math.max(0, Math.min(30, parseInt(e.target.value) || 0)))}
          className="w-full px-4 py-2 border border-stone-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
          placeholder="0–30 days"
        />
      </div>

      {/* Geography */}
      <div>
        <label htmlFor="geography" className="block text-sm font-semibold text-stone-900 mb-3">
          Geography
        </label>
        <input
          id="geography"
          type="text"
          value={geography}
          onChange={(e) => setGeography(e.target.value)}
          className="w-full px-4 py-2 border border-stone-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
          placeholder="beach, Europe, ski resort..."
        />
      </div>

      {/* Weather */}
      <div>
        <label className="block text-sm font-semibold text-stone-900 mb-3">
          Weather
        </label>
        <div className="flex flex-wrap gap-2">
          {weatherOptions.map(opt => (
            <button
              key={opt.label}
              type="button"
              onClick={() => setWeather(opt.label)}
              className={[
                'flex items-center gap-2 px-4 py-2 rounded-lg border transition',
                weather === opt.label
                  ? 'bg-blue-50 border-blue-300 text-blue-900'
                  : 'bg-white border-stone-200 text-stone-700 hover:border-stone-300'
              ].join(' ')}
            >
              {opt.emoji}
              <span className="text-sm font-medium">{opt.label}</span>
              {weather === opt.label && <Check size={16} />}
            </button>
          ))}
        </div>
      </div>

      {/* Notes */}
      <div>
        <label htmlFor="notes" className="block text-sm font-semibold text-stone-900 mb-3">
          Notes
        </label>
        <textarea
          id="notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className="w-full px-4 py-2 border border-stone-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none"
          placeholder="Anything else to consider?"
          rows={4}
        />
      </div>

      {/* Save button */}
      <button
        type="button"
        onClick={handleSave}
        disabled={saving}
        className={[
          'w-full py-2.5 rounded-lg font-medium transition',
          saving
            ? 'bg-stone-100 text-stone-400 cursor-not-allowed'
            : 'bg-blue-600 text-white hover:bg-blue-700'
        ].join(' ')}
      >
        {saving ? 'Saving…' : saved ? '✓ Saved!' : 'Save preferences'}
      </button>

      {/* Toast */}
      {saved && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-stone-900 text-white px-4 py-3 rounded-full text-sm font-medium shadow-lg">
          Preferences saved!
        </div>
      )}
    </div>
  )
}
