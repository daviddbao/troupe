'use client'
import { useState } from 'react'
import { ChevronDown } from 'lucide-react'

interface Preferences {
  nights?: number
  pto_days?: number
  geography?: string
  weather?: string
  notes?: string
}

interface Props {
  preferences: Preferences | null
}

export default function TripSuggestions({ preferences }: Props) {
  const [isOpen, setIsOpen] = useState(false)

  // Check if any preferences are set
  const hasPreferences = preferences && (preferences.geography || preferences.weather)

  if (!hasPreferences) {
    return null
  }

  // Generate suggestions based on geography and weather
  let suggestions: string[] = []
  const geo = (preferences.geography || '').toLowerCase()
  const weather = (preferences.weather || '').toLowerCase()

  if ((geo.includes('beach') || geo.includes('tropical')) && (weather.includes('warm') || weather.includes('hot'))) {
    suggestions = ['Cancún, Mexico', 'Maui, Hawaii', 'Miami, Florida']
  } else if ((geo.includes('mountain') || geo.includes('ski')) && (weather.includes('cold') || weather.includes('snow'))) {
    suggestions = ['Park City, Utah', 'Aspen, Colorado', 'Lake Tahoe, CA']
  } else if (geo.includes('city') || geo.includes('urban')) {
    suggestions = ['New York City', 'Chicago', 'Austin, TX']
  } else if ((geo.includes('beach') || geo.includes('ocean'))) {
    suggestions = ['San Diego, California', 'Tulum, Mexico', 'Barbados']
  } else if ((geo.includes('mountain') || geo.includes('nature'))) {
    suggestions = ['Moab, Utah', 'Boulder, Colorado', 'Asheville, NC']
  }

  return (
    <div className="bg-gradient-to-br from-stone-50 to-stone-100 border border-stone-200 rounded-lg overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-stone-100 transition group"
      >
        <div className="text-left">
          <p className="text-sm font-semibold text-stone-800">Trip Ideas</p>
          <p className="text-xs text-stone-600 mt-0.5">
            Based on your preferences
          </p>
        </div>
        <ChevronDown
          size={18}
          className={`text-stone-400 transition ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {isOpen && (
        <div className="px-4 py-3 border-t border-stone-200 bg-white">
          <p className="text-xs text-stone-600 mb-3">
            {preferences.nights && `${preferences.nights} night${preferences.nights !== 1 ? 's' : ''}`}
            {preferences.geography && ` • ${preferences.geography}`}
            {preferences.weather && ` • ${preferences.weather} weather`}
          </p>

          {suggestions.length > 0 && (
            <div className="space-y-2">
              {suggestions.map((dest, i) => (
                <div
                  key={i}
                  className="flex items-center gap-2 text-sm text-stone-700 p-2 rounded bg-stone-50 hover:bg-stone-100 transition"
                >
                  <span className="text-lg">✈️</span>
                  <span className="font-medium">{dest}</span>
                </div>
              ))}
            </div>
          )}

          {preferences.notes && (
            <div className="mt-3 pt-3 border-t border-stone-200">
              <p className="text-xs text-stone-500 font-medium mb-1">Notes</p>
              <p className="text-xs text-stone-600">{preferences.notes}</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
