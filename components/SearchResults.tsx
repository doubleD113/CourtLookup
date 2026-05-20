'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { Map, AdvancedMarker, useMap } from '@vis.gl/react-google-maps'
import Link from 'next/link'
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
}: Props) {
  const [view, setView] = useState<'list' | 'map'>('list')
  const [activeId, setActiveId] = useState<string | null>(null)
  const cardRefs = useRef<Record<string, HTMLDivElement | null>>({})

  const center = useMemo(() => {
    if (hasGeo && lat !== undefined && lng !== undefined) return { lat, lng }
    if (courts.length > 0) return { lat: courts[0].latitude, lng: courts[0].longitude }
    return MELBOURNE_CENTER
  }, [hasGeo, lat, lng, courts])

  const filterPills = (
    <div className="flex items-center gap-2 flex-wrap">
      {['all', 'dedicated_court', 'community_centre', 'gym'].map((type) => {
        const labels: Record<string, string> = {
          all: 'All types',
          dedicated_court: 'Dedicated courts',
          community_centre: 'Community centres',
          gym: 'Gyms',
        }
        const isActive = (facilityType ?? 'all') === type
        const params = new URLSearchParams()
        if (query) params.set('q', query)
        if (hasGeo && lat !== undefined && lng !== undefined) {
          params.set('lat', String(lat))
          params.set('lng', String(lng))
          params.set('radius', String(radiusKm))
        }
        params.set('facilityType', type)
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

  if (!query && !hasGeo) {
    return <p className="text-slate-500 text-center py-20">Enter a suburb or postcode to find courts.</p>
  }

  if (courts.length === 0) {
    return (
      <>
        <div className="mb-4">{filterPills}</div>
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
      <div className="flex items-center justify-between gap-3 flex-wrap mb-4">
        {filterPills}
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

          <div className="h-[70vh] rounded-2xl overflow-hidden border border-slate-200 sticky top-20 order-1 lg:order-2">
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
      )}
    </>
  )
}
