'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { Map, AdvancedMarker, useMap } from '@vis.gl/react-google-maps'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import CourtCard from '@/components/CourtCard'
import { Court } from '@/types/court'

type CourtWithDistance = Court & { distanceKm?: number }

interface Props {
  courts: CourtWithDistance[]
  query: string
  hasGeo: boolean
  lat?: number
  lng?: number
  radiusKm: number
  facilityType?: string
  surface?: string
  state?: string
}

const MAP_ID = process.env.NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID
const MELBOURNE_CENTER = { lat: -37.8136, lng: 144.9631 }

function FitBounds({ courts, center }: { courts: CourtWithDistance[]; center?: { lat: number; lng: number } }) {
  const map = useMap()

  useEffect(() => {
    if (!map || courts.length === 0) return
    const bounds = new google.maps.LatLngBounds()
    courts.forEach((c) => bounds.extend({ lat: c.latitude, lng: c.longitude }))
    if (center) bounds.extend(center)
    map.fitBounds(bounds, 64)
  }, [map, courts, center])

  return null
}

export default function SearchResults({
  courts,
  query,
  hasGeo,
  lat,
  lng,
  radiusKm,
  facilityType,
  surface,
  state,
}: Props) {
  const router = useRouter()
  const [view, setView] = useState<'list' | 'map'>('list')
  const [activeId, setActiveId] = useState<string | null>(null)
  const [pendingRadius, setPendingRadius] = useState(radiusKm)
  const hasFacilityFilter = !!facilityType && facilityType !== 'all'
  const hasStateFilter = !!state && state !== 'all'
  const [showMoreFilters, setShowMoreFilters] = useState(hasFacilityFilter || hasStateFilter)
  const cardRefs = useRef<Record<string, HTMLDivElement | null>>({})

  useEffect(() => {
    setPendingRadius(radiusKm)
  }, [radiusKm])

  useEffect(() => {
    if (hasFacilityFilter || hasStateFilter) setShowMoreFilters(true)
  }, [hasFacilityFilter, hasStateFilter])

  const center = useMemo(() => {
    if (hasGeo && lat !== undefined && lng !== undefined) return { lat, lng }
    if (courts.length > 0) return { lat: courts[0].latitude, lng: courts[0].longitude }
    return MELBOURNE_CENTER
  }, [hasGeo, lat, lng, courts])

  const buildParams = (overrides: Record<string, string | undefined>) => {
    const params = new URLSearchParams()
    if (query) params.set('q', query)
    if (hasGeo && lat !== undefined && lng !== undefined) {
      params.set('lat', String(lat))
      params.set('lng', String(lng))
      params.set('radius', String(radiusKm))
    }
    if (facilityType && facilityType !== 'all') params.set('facilityType', facilityType)
    if (surface && surface !== 'all') params.set('surface', surface)
    if (state && state !== 'all') params.set('state', state)
    for (const [k, v] of Object.entries(overrides)) {
      if (v === undefined || v === 'all') params.delete(k)
      else params.set(k, v)
    }
    return params
  }

  const commitRadius = (next: number) => {
    if (!hasGeo) return
    if (next === radiusKm) return
    const params = buildParams({ radius: String(next) })
    router.push(`/search?${params.toString()}`)
  }

  const facilityPills = (
    <div className="flex items-center gap-2 flex-wrap">
      {['all', 'dedicated_court', 'community_centre', 'gym'].map((type) => {
        const labels: Record<string, string> = {
          all: 'All types',
          dedicated_court: 'Dedicated courts',
          community_centre: 'Community centres',
          gym: 'Gyms',
        }
        const isActive = (facilityType ?? 'all') === type
        const params = buildParams({ facilityType: type })
        return (
          <Link
            key={type}
            href={`/search?${params.toString()}`}
            className={`text-sm px-3 py-1.5 rounded-full border transition-colors ${
              isActive
                ? 'bg-orange-500 text-white border-orange-500'
                : 'bg-white text-slate-600 border-slate-300 hover:border-slate-400'
            }`}
          >
            {labels[type]}
          </Link>
        )
      })}
    </div>
  )

  const statePills = (
    <div className="flex items-center gap-2 flex-wrap">
      {['all', 'VIC', 'NSW', 'QLD'].map((s) => {
        const labels: Record<string, string> = {
          all: 'Any state',
          VIC: 'VIC',
          NSW: 'NSW',
          QLD: 'QLD',
        }
        const isActive = (state ?? 'all') === s
        const params = buildParams({ state: s })
        return (
          <Link
            key={s}
            href={`/search?${params.toString()}`}
            className={`text-sm px-3 py-1.5 rounded-full border transition-colors ${
              isActive
                ? 'bg-orange-500 text-white border-orange-500'
                : 'bg-white text-slate-600 border-slate-300 hover:border-slate-400'
            }`}
          >
            {labels[s]}
          </Link>
        )
      })}
    </div>
  )

  const surfacePills = (
    <div className="flex items-center gap-2 flex-wrap">
      {['all', 'indoor', 'outdoor', 'both'].map((s) => {
        const labels: Record<string, string> = {
          all: 'Any surface',
          indoor: 'Indoor',
          outdoor: 'Outdoor',
          both: 'Indoor & Outdoor',
        }
        const isActive = (surface ?? 'all') === s
        const params = buildParams({ surface: s })
        return (
          <Link
            key={s}
            href={`/search?${params.toString()}`}
            className={`text-sm px-3 py-1.5 rounded-full border transition-colors ${
              isActive
                ? 'bg-slate-900 text-white border-slate-900'
                : 'bg-white text-slate-600 border-slate-300 hover:border-slate-400'
            }`}
          >
            {labels[s]}
          </Link>
        )
      })}
    </div>
  )

  const radiusSlider = hasGeo ? (
    <div className="flex items-center gap-3 bg-white border border-slate-300 rounded-full pl-4 pr-2 py-1.5">
      <label htmlFor="radius-slider" className="text-sm text-slate-600 shrink-0">
        Within
      </label>
      <input
        id="radius-slider"
        type="range"
        min={1}
        max={50}
        step={1}
        value={pendingRadius}
        onChange={(e) => setPendingRadius(Number(e.target.value))}
        onMouseUp={(e) => commitRadius(Number((e.target as HTMLInputElement).value))}
        onTouchEnd={(e) => commitRadius(Number((e.target as HTMLInputElement).value))}
        onKeyUp={(e) => commitRadius(Number((e.target as HTMLInputElement).value))}
        className="accent-orange-500 w-32 sm:w-40"
        aria-label="Search radius in kilometres"
      />
      <span className="text-sm font-medium text-slate-700 tabular-nums w-12 text-right pr-2">
        {pendingRadius} km
      </span>
    </div>
  ) : null

  const filters = (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2 flex-wrap">
        {surfacePills}
        <button
          type="button"
          onClick={() => setShowMoreFilters((v) => !v)}
          aria-expanded={showMoreFilters}
          className="text-sm px-3 py-1.5 rounded-full border border-dashed border-slate-300 text-slate-600 hover:border-slate-400 hover:text-slate-700 transition-colors inline-flex items-center gap-1"
        >
          More filters
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
            className={`w-3.5 h-3.5 transition-transform ${showMoreFilters ? 'rotate-180' : ''}`}
            aria-hidden="true"
          >
            <path
              fillRule="evenodd"
              d="M5.23 7.21a.75.75 0 011.06.02L10 11.06l3.71-3.83a.75.75 0 111.08 1.04l-4.25 4.39a.75.75 0 01-1.08 0L5.21 8.27a.75.75 0 01.02-1.06z"
              clipRule="evenodd"
            />
          </svg>
        </button>
      </div>
      {showMoreFilters && (
        <div className="flex flex-col gap-2">
          {facilityPills}
          {statePills}
        </div>
      )}
    </div>
  )

  if (!query && !hasGeo) {
    return <p className="text-slate-500 text-center py-20">Enter a suburb or postcode to find courts.</p>
  }

  if (courts.length === 0) {
    return (
      <>
        <div className="mb-4">{filters}</div>
        <div className="text-center py-20">
          <p className="text-slate-700 font-medium">
            No courts found{query ? <> for &ldquo;{query}&rdquo;</> : null}
            {hasGeo ? <> within {radiusKm}km</> : null}
          </p>
          <p className="text-slate-500 text-sm mt-2">Try a nearby suburb or a larger area.</p>
        </div>
      </>
    )
  }

  return (
    <>
      <div className="flex items-start justify-between gap-3 flex-wrap mb-4">
        {filters}
        <div className="inline-flex rounded-full border border-slate-300 bg-white overflow-hidden text-sm shrink-0">
          <button
            type="button"
            onClick={() => setView('list')}
            className={`px-3 py-1.5 transition-colors ${
              view === 'list' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-50'
            }`}
            aria-pressed={view === 'list'}
          >
            List
          </button>
          <button
            type="button"
            onClick={() => setView('map')}
            className={`px-3 py-1.5 transition-colors ${
              view === 'map' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-50'
            }`}
            aria-pressed={view === 'map'}
          >
            Map
          </button>
        </div>
      </div>

      <p className="text-slate-500 text-sm mb-4">
        {courts.length} court{courts.length !== 1 ? 's' : ''} found
        {hasGeo && query ? (
          <> within {radiusKm}km of <span className="font-medium text-slate-700">{query}</span></>
        ) : query ? (
          <> near <span className="font-medium text-slate-700">{query}</span></>
        ) : null}
      </p>

      {view === 'list' ? (
        <div className="flex flex-col gap-3">
          {courts.map((court) => (
            <CourtCard key={court.id} court={court} />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.2fr] gap-4">
          <div className="flex flex-col gap-3 max-h-[70vh] overflow-y-auto pr-1 order-2 lg:order-1">
            {courts.map((court) => (
              <div
                key={court.id}
                ref={(el) => {
                  cardRefs.current[court.id] = el
                }}
                onMouseEnter={() => setActiveId(court.id)}
                onMouseLeave={() => setActiveId((id) => (id === court.id ? null : id))}
                className={`rounded-2xl transition-shadow ${
                  activeId === court.id ? 'ring-2 ring-orange-500' : ''
                }`}
              >
                <CourtCard court={court} />
              </div>
            ))}
          </div>

          <div className="flex flex-col gap-3 sticky top-20 order-1 lg:order-2">
            {radiusSlider && <div className="flex justify-end">{radiusSlider}</div>}
            <div className="h-[70vh] rounded-2xl overflow-hidden border border-slate-200">
            {process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ? (
              <Map
                defaultCenter={center}
                defaultZoom={11}
                mapId={MAP_ID}
                gestureHandling="greedy"
                disableDefaultUI={false}
                className="w-full h-full"
              >
                <FitBounds courts={courts} center={hasGeo ? center : undefined} />
                {MAP_ID &&
                  courts.map((court) => (
                    <AdvancedMarker
                      key={court.id}
                      position={{ lat: court.latitude, lng: court.longitude }}
                      title={court.name}
                      onClick={() => {
                        setActiveId(court.id)
                        cardRefs.current[court.id]?.scrollIntoView({
                          behavior: 'smooth',
                          block: 'center',
                        })
                      }}
                    >
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center shadow-lg text-white text-sm font-bold border-2 border-white transition-transform ${
                          activeId === court.id
                            ? 'bg-slate-900 scale-125'
                            : 'bg-orange-500'
                        }`}
                      >
                        🏀
                      </div>
                    </AdvancedMarker>
                  ))}
              </Map>
            ) : (
              <div className="w-full h-full bg-slate-100 flex items-center justify-center text-slate-500 text-sm">
                Map requires a Google Maps API key
              </div>
            )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
