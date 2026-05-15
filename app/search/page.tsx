import { prisma } from '@/lib/prisma'
import CourtCard from '@/components/CourtCard'
import SearchBar from '@/components/SearchBar'
import Link from 'next/link'
import { Court } from '@/types/court'

interface Props {
  searchParams: Promise<{
    q?: string
    facilityType?: string
    lat?: string
    lng?: string
    radius?: string
  }>
}

type CourtWithDistance = Court & { distanceKm?: number }

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLon = ((lon2 - lon1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

async function searchCourtsByText(q: string, facilityType?: string): Promise<Court[]> {
  const isPostcode = /^\d{4}$/.test(q.trim())

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = isPostcode
    ? { postcode: q.trim() }
    : { suburb: { contains: q.trim(), mode: 'insensitive' } }

  if (facilityType && facilityType !== 'all') {
    where.facilityType = facilityType
  }

  return prisma.court.findMany({ where, orderBy: { name: 'asc' }, take: 100 }) as Promise<Court[]>
}

async function searchCourtsByRadius(
  lat: number,
  lng: number,
  radiusKm: number,
  facilityType?: string,
): Promise<CourtWithDistance[]> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = {}
  if (facilityType && facilityType !== 'all') where.facilityType = facilityType

  const courts = (await prisma.court.findMany({ where, take: 500 })) as Court[]

  return courts
    .map((c) => ({ ...c, distanceKm: haversineKm(lat, lng, c.latitude, c.longitude) }))
    .filter((c) => c.distanceKm <= radiusKm)
    .sort((a, b) => a.distanceKm - b.distanceKm)
}

export default async function SearchPage({ searchParams }: Props) {
  const { q, facilityType, lat, lng, radius } = await searchParams
  const query = q?.trim() ?? ''
  const latNum = lat ? parseFloat(lat) : NaN
  const lngNum = lng ? parseFloat(lng) : NaN
  const radiusKm = radius ? parseFloat(radius) : 10
  const hasGeo = Number.isFinite(latNum) && Number.isFinite(lngNum)

  let courts: CourtWithDistance[] = []
  if (hasGeo) {
    courts = await searchCourtsByRadius(latNum, lngNum, radiusKm, facilityType)
  } else if (query) {
    courts = await searchCourtsByText(query, facilityType)
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Navbar */}
      <nav className="sticky top-0 z-50 bg-slate-900/95 backdrop-blur-sm border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link href="/" className="text-white font-bold text-xl tracking-tight">
              CourtLookup
            </Link>
          </div>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {/* Search header */}
        <div className="mb-8">
          <SearchBar defaultValue={query} variant="page" size="md" buttonLabel="Search" />

          {/* Filter row */}
          {(query || hasGeo) && (
            <div className="flex items-center gap-2 mt-4 flex-wrap">
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
                if (hasGeo) {
                  params.set('lat', String(latNum))
                  params.set('lng', String(lngNum))
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
          )}
        </div>

        {/* Results */}
        {!query && !hasGeo ? (
          <p className="text-slate-500 text-center py-20">Enter a suburb or postcode to find courts.</p>
        ) : courts.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-slate-700 font-medium">
              No courts found{query ? <> for &ldquo;{query}&rdquo;</> : null}
              {hasGeo ? <> within {radiusKm}km</> : null}
            </p>
            <p className="text-slate-500 text-sm mt-2">Try a nearby suburb or a larger area.</p>
          </div>
        ) : (
          <>
            <p className="text-slate-500 text-sm mb-4">
              {courts.length} court{courts.length !== 1 ? 's' : ''} found
              {hasGeo && query ? (
                <> within {radiusKm}km of <span className="font-medium text-slate-700">{query}</span></>
              ) : query ? (
                <> near <span className="font-medium text-slate-700">{query}</span></>
              ) : null}
            </p>
            <div className="flex flex-col gap-3">
              {courts.map((court) => (
                <CourtCard key={court.id} court={court} />
              ))}
            </div>
          </>
        )}
      </main>
    </div>
  )
}
