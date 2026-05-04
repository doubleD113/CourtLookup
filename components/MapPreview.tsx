'use client'

import { Map, AdvancedMarker } from '@vis.gl/react-google-maps'

const MELBOURNE_CENTER = { lat: -37.8136, lng: 144.9631 }

// Sample courts for preview — will be replaced by DB data
const SAMPLE_COURTS = [
  { id: 1, name: 'Melbourne Sports & Aquatic Centre', lat: -37.8374, lng: 144.9605 },
  { id: 2, name: 'Coburg Basketball Stadium', lat: -37.7447, lng: 144.9652 },
  { id: 3, name: 'State Basketball Centre', lat: -37.8786, lng: 145.1316 },
  { id: 4, name: 'Knox Basketball Stadium', lat: -37.8793, lng: 145.2344 },
  { id: 5, name: 'Dandenong Basketball', lat: -37.9876, lng: 145.2156 },
]

const MAP_ID = process.env.NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID

export default function MapPreview() {
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
        gestureHandling="none"
        className="w-full h-full"
      >
        {MAP_ID &&
          SAMPLE_COURTS.map((court) => (
            <AdvancedMarker
              key={court.id}
              position={{ lat: court.lat, lng: court.lng }}
              title={court.name}
            >
              <div className="w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center shadow-lg text-white text-sm font-bold border-2 border-white">
                🏀
              </div>
            </AdvancedMarker>
          ))}
      </Map>
    </div>
  )
}
