import { prisma } from '@/lib/prisma'
import SearchBar from '@/components/SearchBar'
import SearchResults from '@/components/SearchResults'
import Link from 'next/link'
import { Court } from '@/types/court'

interface Props {
  searchParams: Promise<{
    q?: string
    facilityType?: string
    surface?: string
    state?: string
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

async function searchCourtsByText(
  q: string,
  facilityType?: string,
  surface?: string,
  state?: string,
): Promise<Court[]> {
  const isPostcode = /^\d{4}$/.test(q.trim())

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = isPostcode
    ? { postcode: q.trim() }
    : { suburb: { contains: q.trim(), mode: 'insensitive' } }

  where.hiddenAt = null

  if (facilityType && facilityType !== 'all') {
    where.facilityType = facilityType
  }

  if (surface && surface !== 'all') {
    where.surface = surface
  }

  if (state && state !== 'all') {
    where.state = state
  }

  return prisma.court.findMany({ where, orderBy: { name: 'asc' }, take: 100 }) as Promise<Court[]>
}

async function searchCourtsByRadius(
  lat: number,
  lng: number,
  radiusKm: number,
  facilityType?: string,
  surface?: string,
  state?: string,
): Promise<CourtWithDistance[]> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = { hiddenAt: null }
  if (facilityType && facilityType !== 'all') where.facilityType = facilityType
  if (surface && surface !== 'all') where.surface = surface
  if (state && state !== 'all') where.state = state

  const courts = (await prisma.court.findMany({ where, take: 500 })) as Court[]

  return courts
    .map((c) => ({ ...c, distanceKm: haversineKm(lat, lng, c.latitude, c.longitude) }))
    .filter((c) => c.distanceKm <= radiusKm)
    .sort((a, b) => a.distanceKm - b.distanceKm)
}

export default async function SearchPage({ searchParams }: Props) {
  const { q, facilityType, surface, state, lat, lng, radius } = await searchParams
  const query = q?.trim() ?? ''
  const latNum = lat ? parseFloat(lat) : NaN
  const lngNum = lng ? parseFloat(lng) : NaN
  const radiusKm = radius ? parseFloat(radius) : 10
  const hasGeo = Number.isFinite(latNum) && Number.isFinite(lngNum)

  let courts: CourtWithDistance[] = []
  if (hasGeo) {
    courts = await searchCourtsByRadius(latNum, lngNum, radiusKm, facilityType, surface, state)
  } else if (query) {
    courts = await searchCourtsByText(query, facilityType, surface, state)
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

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="mb-8">
          <SearchBar defaultValue={query} variant="page" size="md" buttonLabel="Search" />
        </div>

        <SearchResults
          courts={courts}
          query={query}
          hasGeo={hasGeo}
          lat={hasGeo ? latNum : undefined}
          lng={hasGeo ? lngNum : undefined}
          radiusKm={radiusKm}
          facilityType={facilityType}
          surface={surface}
          state={state}
        />
      </main>
    </div>
  )
}
