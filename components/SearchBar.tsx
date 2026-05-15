'use client'

import { useState, useEffect, useRef, FormEvent, KeyboardEvent } from 'react'
import { useRouter } from 'next/navigation'

type Suggestion = {
  placeId: string
  mainText: string
  secondaryText: string
}

interface SearchBarProps {
  defaultValue?: string
  variant?: 'hero' | 'page'
  buttonLabel?: string
  size?: 'lg' | 'md'
  radiusKm?: number
}

export default function SearchBar({
  defaultValue = '',
  variant = 'hero',
  buttonLabel = 'Find Courts',
  size = 'lg',
  radiusKm = 10,
}: SearchBarProps = {}) {
  const [query, setQuery] = useState(defaultValue)
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const [open, setOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)
  const [resolving, setResolving] = useState(false)
  const router = useRouter()
  const containerRef = useRef<HTMLDivElement>(null)
  const skipNextFetchRef = useRef(false)

  useEffect(() => {
    const q = query.trim()
    if (skipNextFetchRef.current) {
      skipNextFetchRef.current = false
      return
    }
    if (q.length < 2) {
      setSuggestions([])
      return
    }
    const controller = new AbortController()
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/suggestions?q=${encodeURIComponent(q)}`, {
          signal: controller.signal,
        })
        if (!res.ok) return
        const data: Suggestion[] = await res.json()
        setSuggestions(data)
        setActiveIndex(-1)
      } catch {
        // ignore aborts and network errors
      }
    }, 200)
    return () => {
      controller.abort()
      clearTimeout(timer)
    }
  }, [query])

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [])

  function navigateToSearch(label: string, lat?: number, lng?: number) {
    const params = new URLSearchParams({ q: label })
    if (lat != null && lng != null) {
      params.set('lat', String(lat))
      params.set('lng', String(lng))
      params.set('radius', String(radiusKm))
    }
    setOpen(false)
    router.push(`/search?${params.toString()}`)
  }

  async function selectSuggestion(s: Suggestion) {
    const label = s.secondaryText
      ? `${s.mainText}, ${s.secondaryText}`
      : s.mainText
    skipNextFetchRef.current = true
    setQuery(s.mainText)
    setSuggestions([])
    setResolving(true)
    try {
      const res = await fetch(`/api/place-details?placeId=${encodeURIComponent(s.placeId)}`)
      if (res.ok) {
        const data = (await res.json()) as { lat?: number; lng?: number }
        navigateToSearch(label, data.lat, data.lng)
        return
      }
    } catch {
      // fall through to text-only search
    } finally {
      setResolving(false)
    }
    navigateToSearch(label)
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (open && activeIndex >= 0 && suggestions[activeIndex]) {
      selectSuggestion(suggestions[activeIndex])
      return
    }
    const v = query.trim()
    if (!v) return
    navigateToSearch(v)
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (!open || suggestions.length === 0) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIndex((i) => (i + 1) % suggestions.length)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIndex((i) => (i <= 0 ? suggestions.length - 1 : i - 1))
    } else if (e.key === 'Escape') {
      setOpen(false)
    }
  }

  const showDropdown = open && suggestions.length > 0

  const inputClasses =
    variant === 'hero'
      ? 'w-full rounded-xl bg-white/10 border border-white/20 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent'
      : 'w-full rounded-xl bg-white border border-slate-300 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent'

  const sizeInputClasses = size === 'lg' ? 'px-5 py-4 text-base' : 'px-5 py-3'
  const sizeButtonClasses = size === 'lg' ? 'px-8 py-4' : 'px-7 py-3'

  return (
    <div ref={containerRef} className="relative">
      <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <input
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value)
              setOpen(true)
            }}
            onFocus={() => setOpen(true)}
            onKeyDown={handleKeyDown}
            placeholder="Enter suburb or postcode..."
            autoComplete="off"
            role="combobox"
            aria-expanded={showDropdown}
            aria-autocomplete="list"
            disabled={resolving}
            className={`${inputClasses} ${sizeInputClasses}`}
          />
          {showDropdown && (
            <ul
              role="listbox"
              className="absolute left-0 right-0 top-full mt-2 z-20 bg-white rounded-xl border border-slate-200 shadow-lg overflow-hidden"
            >
              {suggestions.map((s, i) => (
                <li
                  key={s.placeId}
                  role="option"
                  aria-selected={i === activeIndex}
                  onMouseDown={(e) => {
                    e.preventDefault()
                    selectSuggestion(s)
                  }}
                  onMouseEnter={() => setActiveIndex(i)}
                  className={`px-5 py-3 cursor-pointer flex items-center justify-between gap-3 ${
                    i === activeIndex ? 'bg-orange-50' : 'bg-white'
                  }`}
                >
                  <span className="text-slate-900 font-medium truncate">{s.mainText}</span>
                  {s.secondaryText && (
                    <span className="text-slate-500 text-sm truncate">{s.secondaryText}</span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
        <button
          type="submit"
          disabled={resolving}
          className={`${sizeButtonClasses} bg-orange-500 hover:bg-orange-400 disabled:opacity-60 text-white font-semibold rounded-xl transition-colors whitespace-nowrap`}
        >
          {buttonLabel}
        </button>
      </form>
    </div>
  )
}
