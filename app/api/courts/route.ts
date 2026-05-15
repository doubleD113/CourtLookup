import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

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

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const q = searchParams.get('q')?.trim()
  const lat = searchParams.get('lat')
  const lng = searchParams.get('lng')
  const radiusKm = parseFloat(searchParams.get('radius') ?? '10')
  const facilityType = searchParams.get('facilityType')

  if (!q && (!lat || !lng)) {
    return NextResponse.json({ error: 'Provide q or lat+lng' }, { status: 400 })
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = {}

  if (q) {
    const isPostcode = /^\d{4}$/.test(q)
    if (isPostcode) {
      where.postcode = q
    } else {
      where.suburb = { contains: q, mode: 'insensitive' }
    }
  }

  if (facilityType && facilityType !== 'all') {
    where.facilityType = facilityType
  }

  const courts = await prisma.court.findMany({
    where,
    orderBy: { name: 'asc' },
    take: 100,
  })

  // If lat/lng provided, filter by radius and sort by distance
  if (lat && lng) {
    const userLat = parseFloat(lat)
    const userLng = parseFloat(lng)
    const withDistance = courts
      .map((c) => ({ ...c, distanceKm: haversineKm(userLat, userLng, c.latitude, c.longitude) }))
      .filter((c) => c.distanceKm <= radiusKm)
      .sort((a, b) => a.distanceKm - b.distanceKm)
    return NextResponse.json(withDistance)
  }

  return NextResponse.json(courts)
}
