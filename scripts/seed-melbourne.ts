import { config } from 'dotenv'
import { writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'

import type { FacilityType, Surface } from '../types/court'

config({ path: '.env.local' })

const API_KEY = process.env.GOOGLE_PLACES_API_KEY
if (!API_KEY) {
  console.error('GOOGLE_PLACES_API_KEY is missing in .env.local')
  process.exit(1)
}

const QUERIES = [
  'indoor basketball court',
  'basketball stadium',
  'basketball gym',
  'recreation centre basketball',
] as const

const MELBOURNE_CENTER = { latitude: -37.8136, longitude: 144.9631 }
const RADIUS_METERS = 40_000
const PAGE_DELAY_MS = 2_500
const MAX_PAGES_PER_QUERY = 3

const FIELD_MASK = [
  'places.id',
  'places.displayName',
  'places.formattedAddress',
  'places.location',
  'places.addressComponents',
  'places.types',
  'places.regularOpeningHours',
  'places.nationalPhoneNumber',
  'places.websiteUri',
  'places.userRatingCount',
  'places.rating',
  'nextPageToken',
].join(',')

interface PlaceAddressComponent {
  longText: string
  shortText: string
  types: string[]
}

interface PlaceOpeningHours {
  weekdayDescriptions?: string[]
}

interface PlaceResult {
  id: string
  displayName?: { text: string }
  formattedAddress?: string
  location?: { latitude: number; longitude: number }
  addressComponents?: PlaceAddressComponent[]
  types?: string[]
  regularOpeningHours?: PlaceOpeningHours
  nationalPhoneNumber?: string
  websiteUri?: string
  userRatingCount?: number
  rating?: number
}

interface SearchTextResponse {
  places?: PlaceResult[]
  nextPageToken?: string
}

interface DerivedCourt {
  googlePlaceId: string
  name: string
  address: string
  suburb: string
  state: string
  postcode: string
  latitude: number
  longitude: number
  facilityType: FacilityType
  surface: Surface
  courtCount: number | null
  bookingUrl: string | null
  websiteUrl: string | null
  phone: string | null
  openingHours: Record<string, string> | null
  source: 'google_places'
  verifiedAt: string
  rating: number | null
  userRatingCount: number | null
  rawTypes: string[]
  matchedQueries: string[]
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

async function searchTextPage(
  textQuery: string,
  pageToken?: string,
): Promise<SearchTextResponse> {
  const body: Record<string, unknown> = {
    textQuery,
    locationBias: {
      circle: { center: MELBOURNE_CENTER, radius: RADIUS_METERS },
    },
    pageSize: 20,
  }
  if (pageToken) body.pageToken = pageToken

  const res = await fetch('https://places.googleapis.com/v1/places:searchText', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': API_KEY!,
      'X-Goog-FieldMask': FIELD_MASK,
    },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Places API ${res.status}: ${text}`)
  }
  return res.json() as Promise<SearchTextResponse>
}

async function searchAllPages(textQuery: string): Promise<PlaceResult[]> {
  const all: PlaceResult[] = []
  let pageToken: string | undefined
  for (let page = 0; page < MAX_PAGES_PER_QUERY; page++) {
    if (page > 0) await sleep(PAGE_DELAY_MS)
    const res = await searchTextPage(textQuery, pageToken)
    if (res.places) all.push(...res.places)
    if (!res.nextPageToken) break
    pageToken = res.nextPageToken
  }
  return all
}

function pickComponent(
  components: PlaceAddressComponent[] | undefined,
  type: string,
): PlaceAddressComponent | undefined {
  return components?.find((c) => c.types?.includes(type))
}

const EVENT_ARENA_PATTERNS = [
  /rod laver/i,
  /margaret court/i,
  /john cain/i,
  /melbourne park/i,
  /melbourne (and|&) olympic parks/i,
  /marvel stadium/i,
  /\bmcg\b/i,
  /melbourne cricket ground/i,
  /hisense arena/i,
  /aami park/i,
  /etihad stadium/i,
  /docklands stadium/i,
  /kia arena/i,
  /sidney myer music bowl/i,
]

const GENERIC_GYM_PATTERNS = [
  /anytime fitness/i,
  /fitness first/i,
  /\bf45\b/i,
  /goodlife/i,
  /snap fitness/i,
  /plus fitness/i,
  /crunch fitness/i,
  /jetts fitness/i,
  /world gym/i,
  /orangetheory/i,
  /club lime/i,
  /\bgym ?\+/i,
  /pilates/i,
  /\byoga\b/i,
  /crossfit/i,
  /\bf?45 training/i,
  /barre/i,
  /\bems\b/i,
  /reformer/i,
  /\bbjj\b/i,
  /jiu[- ]?jitsu/i,
  /muay thai/i,
  /boxing/i,
  /martial arts/i,
]

const COMMUNITY_PATTERNS = [
  /recreation\s*(centre|center)/i,
  /leisure\s*(centre|center)/i,
  /aquatic\s*(centre|center)/i,
  /community\s*(centre|center)/i,
  /\bYMCA\b/,
  /\bPCYC\b/,
  /belgravia/i,
  /aligned leisure/i,
]

function isExcluded(name: string): boolean {
  if (EVENT_ARENA_PATTERNS.some((re) => re.test(name))) return true
  if (GENERIC_GYM_PATTERNS.some((re) => re.test(name))) return true
  return false
}

function deriveFacilityType(name: string, types: string[]): FacilityType {
  const n = name.toLowerCase()
  const t = new Set(types)
  if (COMMUNITY_PATTERNS.some((re) => re.test(name))) return 'community_centre'
  if (t.has('community_center')) return 'community_centre'
  if (
    n.includes('basketball') ||
    n.includes('stadium') ||
    n.includes('arena') ||
    n.includes('sports centre') ||
    n.includes('sports center') ||
    n.includes('sport centre') ||
    n.includes('sport center')
  ) {
    return 'dedicated_court'
  }
  return 'gym'
}

const DAY_KEYS: Record<string, string> = {
  monday: 'mon',
  tuesday: 'tue',
  wednesday: 'wed',
  thursday: 'thu',
  friday: 'fri',
  saturday: 'sat',
  sunday: 'sun',
}

function deriveOpeningHours(
  hours: PlaceOpeningHours | undefined,
): Record<string, string> | null {
  const desc = hours?.weekdayDescriptions
  if (!desc || desc.length === 0) return null
  const out: Record<string, string> = {}
  for (const line of desc) {
    const [dayRaw, ...rest] = line.split(':')
    if (!dayRaw || rest.length === 0) continue
    const key = DAY_KEYS[dayRaw.trim().toLowerCase()]
    if (!key) continue
    out[key] = rest.join(':').trim()
  }
  return Object.keys(out).length > 0 ? out : null
}

type DropReason = 'non_vic' | 'missing_fields' | 'excluded'

function derive(
  place: PlaceResult,
  matchedQueries: string[],
): DerivedCourt | DropReason {
  if (!place.id || !place.location || !place.addressComponents) return 'missing_fields'

  const state = pickComponent(place.addressComponents, 'administrative_area_level_1')
  if (state?.shortText !== 'VIC') return 'non_vic'

  const suburb = pickComponent(place.addressComponents, 'locality')
  const postcode = pickComponent(place.addressComponents, 'postal_code')
  if (!suburb || !postcode) return 'missing_fields'

  const name = place.displayName?.text ?? ''
  const types = place.types ?? []

  if (isExcluded(name)) return 'excluded'

  return {
    googlePlaceId: place.id,
    name,
    address: place.formattedAddress ?? '',
    suburb: suburb.longText,
    state: state.shortText,
    postcode: postcode.longText,
    latitude: place.location.latitude,
    longitude: place.location.longitude,
    facilityType: deriveFacilityType(name, types),
    surface: 'indoor',
    courtCount: null,
    bookingUrl: null,
    websiteUrl: place.websiteUri ?? null,
    phone: place.nationalPhoneNumber ?? null,
    openingHours: deriveOpeningHours(place.regularOpeningHours),
    source: 'google_places',
    verifiedAt: new Date().toISOString(),
    rating: place.rating ?? null,
    userRatingCount: place.userRatingCount ?? null,
    rawTypes: types,
    matchedQueries,
  }
}

async function main() {
  console.log(`Querying Places API (New) — Greater Melbourne, ${RADIUS_METERS / 1000}km radius`)
  const byPlaceId = new Map<string, PlaceResult>()
  const queriesByPlaceId = new Map<string, Set<string>>()

  for (const query of QUERIES) {
    process.stdout.write(`  • "${query}" ... `)
    const places = await searchAllPages(query)
    console.log(`${places.length} results`)
    for (const p of places) {
      if (!p.id) continue
      if (!byPlaceId.has(p.id)) byPlaceId.set(p.id, p)
      const set = queriesByPlaceId.get(p.id) ?? new Set<string>()
      set.add(query)
      queriesByPlaceId.set(p.id, set)
    }
    await sleep(PAGE_DELAY_MS)
  }

  const totalUnique = byPlaceId.size
  const courts: DerivedCourt[] = []
  const excludedNames: string[] = []
  let droppedNonVic = 0
  let droppedMissing = 0
  let droppedExcluded = 0

  for (const [id, place] of byPlaceId) {
    const matched = [...(queriesByPlaceId.get(id) ?? [])]
    const result = derive(place, matched)
    if (typeof result === 'string') {
      if (result === 'non_vic') droppedNonVic++
      else if (result === 'missing_fields') droppedMissing++
      else if (result === 'excluded') {
        droppedExcluded++
        excludedNames.push(place.displayName?.text ?? '(unnamed)')
      }
      continue
    }
    courts.push(result)
  }

  courts.sort(
    (a, b) => (b.userRatingCount ?? 0) - (a.userRatingCount ?? 0),
  )

  const output = {
    generatedAt: new Date().toISOString(),
    queries: QUERIES,
    melbourneCenter: MELBOURNE_CENTER,
    radiusMeters: RADIUS_METERS,
    totalUnique,
    droppedNonVic,
    droppedMissing,
    droppedExcluded,
    excludedNames,
    kept: courts.length,
    courts,
  }

  const outPath = resolve(process.cwd(), 'seed-output.json')
  await writeFile(outPath, JSON.stringify(output, null, 2))

  console.log()
  console.log(`Total unique places (across all queries): ${totalUnique}`)
  console.log(`Dropped — outside VIC: ${droppedNonVic}`)
  console.log(`Dropped — missing required fields: ${droppedMissing}`)
  console.log(`Dropped — excluded by blocklist: ${droppedExcluded}`)
  console.log(`Kept: ${courts.length}`)
  console.log()
  console.log(`Top 15 by review count:`)
  for (const c of courts.slice(0, 15)) {
    console.log(
      `  ${c.userRatingCount ?? 0} reviews · ${c.facilityType} · ${c.name} (${c.suburb} ${c.postcode})`,
    )
  }
  if (excludedNames.length > 0) {
    console.log()
    console.log(`Excluded venues:`)
    for (const n of excludedNames) console.log(`  · ${n}`)
  }
  console.log()
  console.log(`→ Wrote ${outPath}`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
