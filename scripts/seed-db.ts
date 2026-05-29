import { config } from 'dotenv'
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'

config({ path: '.env.local' })

import type { FacilityType, Surface } from '../types/court'

interface SeededCourt {
  googlePlaceId: string
  name: string
  address: string
  suburb: string
  state: string
  postcode: string
  latitude: number
  longitude: number
  facilityType: FacilityType
  surface?: Surface
  courtCount: number | null
  bookingUrl: string | null
  websiteUrl: string | null
  phone: string | null
  openingHours: Record<string, string> | null
  source: 'google_places'
  verifiedAt: string
}

interface SeedOutput {
  courts: SeededCourt[]
}

async function main() {
  const { prisma } = await import('../lib/prisma')

  const cityArg = process.argv[2]?.toLowerCase()
  const fileName = cityArg ? `seed-output-${cityArg}.json` : 'seed-output.json'

  try {
    const path = resolve(process.cwd(), fileName)
    const raw = await readFile(path, 'utf8')
    const { courts } = JSON.parse(raw) as SeedOutput
    console.log(`Loaded ${courts.length} courts from ${path}`)

    let inserted = 0
    let updated = 0

    for (const c of courts) {
      const data = {
        name: c.name,
        address: c.address,
        suburb: c.suburb,
        state: c.state,
        postcode: c.postcode,
        latitude: c.latitude,
        longitude: c.longitude,
        facilityType: c.facilityType,
        surface: c.surface ?? 'indoor',
        courtCount: c.courtCount,
        bookingUrl: c.bookingUrl,
        websiteUrl: c.websiteUrl,
        phone: c.phone,
        openingHours: c.openingHours ?? undefined,
        googlePlaceId: c.googlePlaceId,
        source: c.source,
        verifiedAt: new Date(c.verifiedAt),
      }

      const existing = await prisma.court.findUnique({
        where: { googlePlaceId: c.googlePlaceId },
        select: { id: true },
      })

      await prisma.court.upsert({
        where: { googlePlaceId: c.googlePlaceId },
        create: data,
        update: data,
      })

      if (existing) updated++
      else inserted++
    }

    const total = await prisma.court.count()

    console.log()
    console.log(`Inserted: ${inserted}`)
    console.log(`Updated:  ${updated}`)
    console.log(`Total rows in courts table: ${total}`)
  } finally {
    await prisma.$disconnect()
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
