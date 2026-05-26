'use client'

import { useEffect } from 'react'
import { Map, AdvancedMarker, useMap } from '@vis.gl/react-google-maps'
import { useRouter } from 'next/navigation'

const MELBOURNE_CENTER = { lat: -37.8136, lng: 144.9631 }
const MAP_ID = process.env.NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID

export interface MapPreviewCourt {
  id: string
  name: string
  latitude: number
  longitude: number
}

function FitBounds({ courts }: { courts: MapPreviewCourt[] }) {
  const map = useMap()

  useEffect(() => {
    if (!map || courts.length === 0) return
    const bounds = new google.maps.LatLngBounds()
    courts.forEach((c) => bounds.extend({ lat: c.latitude, lng: c.longitude }))
    map.fitBounds(bounds, 48)
  }, [map, courts])

  return null
}

export default function MapPreview({ courts }: { courts: MapPreviewCourt[] }) {
  const router = useRouter()
  const hasApiKey = Boolean(process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY)

  if (!hasApiKey) {
    return (
      <div className="w-full h-[420px] rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center">
        <div className="text-center text-slate-400">
          <div className="text-4xl mb-3">🗺️</div>
          <p className="text-sm">Map preview requires a Google Maps API key</p>
          <p className="text-xs mt-1 text-slate-500">See .env.local.example</p>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full h-[420px] rounded-2xl overflow-hidden border border-slate-700 shadow-2xl">
      <Map
        defaultCenter={MELBOURNE_CENTER}
        defaultZoom={11}
        mapId={MAP_ID}
        disableDefaultUI
        gestureHandling="cooperative"
        className="w-full h-full"
      >
        <FitBounds courts={courts} />
        {MAP_ID &&
          courts.map((court) => (
            <AdvancedMarker
              key={court.id}
              position={{ lat: court.latitude, lng: court.longitude }}
              title={court.name}
              onClick={() => router.push(`/courts/${court.id}`)}
            >
              <div className="w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center shadow-lg text-white text-sm font-bold border-2 border-white cursor-pointer hover:scale-110 transition-transform">
                🏀
              </div>
            </AdvancedMarker>
          ))}
      </Map>
    </div>
  )
}
