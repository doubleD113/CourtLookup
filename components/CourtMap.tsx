'use client'

import { Map, AdvancedMarker } from '@vis.gl/react-google-maps'

const MAP_ID = process.env.NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID

interface Props {
  name: string
  address: string
  latitude: number
  longitude: number
  googlePlaceId?: string | null
}

function buildGoogleMapsUrl({ name, address, latitude, longitude, googlePlaceId }: Props) {
  if (googlePlaceId) {
    const query = encodeURIComponent(`${name}, ${address}`)
    return `https://www.google.com/maps/search/?api=1&query=${query}&query_place_id=${googlePlaceId}`
  }
  return `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`
}

export default function CourtMap(props: Props) {
  const hasApiKey = Boolean(process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY)
  const mapsUrl = buildGoogleMapsUrl(props)

  if (!hasApiKey) {
    return (
      <div className="rounded-2xl bg-slate-200 h-48 flex items-center justify-center">
        <a
          href={mapsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-orange-600 hover:text-orange-500 font-medium text-sm"
        >
          Open in Google Maps →
        </a>
      </div>
    )
  }

  return (
    <div className="relative rounded-2xl overflow-hidden border border-slate-200 h-64 sm:h-80">
      <Map
        defaultCenter={{ lat: props.latitude, lng: props.longitude }}
        defaultZoom={15}
        mapId={MAP_ID}
        disableDefaultUI
        gestureHandling="cooperative"
        className="w-full h-full"
      >
        {MAP_ID && (
          <AdvancedMarker
            position={{ lat: props.latitude, lng: props.longitude }}
            title={props.name}
          >
            <div className="w-9 h-9 bg-orange-500 rounded-full flex items-center justify-center shadow-lg text-white text-sm border-2 border-white">
              🏀
            </div>
          </AdvancedMarker>
        )}
      </Map>
      <a
        href={mapsUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="absolute top-3 right-3 inline-flex items-center gap-1.5 bg-white/95 hover:bg-white text-slate-700 hover:text-slate-900 text-xs font-medium px-3 py-1.5 rounded-lg shadow-md ring-1 ring-slate-200 transition-colors"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5">
          <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
          <polyline points="15 3 21 3 21 9" />
          <line x1="10" y1="14" x2="21" y2="3" />
        </svg>
        Open in Google Maps
      </a>
    </div>
  )
}
