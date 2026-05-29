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

interface CityConfig {
  slug: string
  label: string
  state: string
  center: { latitude: number; longitude: number }
  radiusMeters: number
  extraExcludePatterns?: RegExp[]
}

const CITIES: Record<string, CityConfig> = {
  melbourne: {
    slug: 'melbourne',
    label: 'Greater Melbourne',
    state: 'VIC',
    center: { latitude: -37.8136, longitude: 144.9631 },
    radiusMeters: 40_000,
    extraExcludePatterns: [
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
    ],
  },
  sydney: {
    slug: 'sydney',
    label: 'Greater Sydney',
    state: 'NSW',
    center: { latitude: -33.8688, longitude: 151.2093 },
    radiusMeters: 50_000,
    extraExcludePatterns: [
      /qudos bank arena/i,
      /\bken rosewall arena\b/i,
      /accor stadium/i,
      /allianz stadium/i,
      /\bcommbank stadium\b/i,
      /\bscg\b/i,
      /sydney cricket ground/i,
      /sydney showground stadium/i,
      /qantas credit union arena/i,
      /aware super theatre/i,
      /the star event centre/i,
      /\bicc sydney\b/i,
    ],
  },
  brisbane: {
    slug: 'brisbane',
    label: 'Greater Brisbane',
    state: 'QLD',
    center: { latitude: -27.4698, longitude: 153.0251 },
    radiusMeters: 45_000,
    extraExcludePatterns: [
      /suncorp stadium/i,
      /\bthe gabba\b/i,
      /brisbane cricket ground/i,
      /queensland country bank stadium/i,
      /brisbane entertainment centre/i,
      /\bbcec\b/i,
      /brisbane convention/i,
      /\brna showgrounds\b/i,
      /\bcbus super stadium\b/i,
    ],
  },
}

const QUERIES = [
  'indoor basketball court',
  'basketball stadium',
  'basketball gym',
  'recreation centre basketball',
] as const

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
  city: CityConfig,
  textQuery: string,
  pageToken?: string,
): Promise<SearchTextResponse> {
  const body: Record<string, unknown> = {
    textQuery,
    locationBias: {
      circle: { center: city.center, radius: city.radiusMeters },
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

async function searchAllPages(
  city: CityConfig,
  textQuery: string,
): Promise<PlaceResult[]> {
  const all: PlaceResult[] = []
  let pageToken: string | undefined
  for (let page = 0; page < MAX_PAGES_PER_QUERY; page++) {
    if (page > 0) await sleep(PAGE_DELAY_MS)
    const res = await searchTextPage(city, textQuery, pageToken)
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

function isExcluded(name: string, city: CityConfig): boolean {
  if (city.extraExcludePatterns?.some((re) => re.test(name))) return true
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

type DropReason = 'wrong_state' | 'missing_fields' | 'excluded'

function derive(
  place: PlaceResult,
  city: CityConfig,
  matchedQueries: string[],
): DerivedCourt | DropReason {
  if (!place.id || !place.location || !place.addressComponents) return 'missing_fields'

  const state = pickComponent(place.addressComponents, 'administrative_area_level_1')
  if (state?.shortText !== city.state) return 'wrong_state'

  const suburb = pickComponent(place.addressComponents, 'locality')
  const postcode = pickComponent(place.addressComponents, 'postal_code')
  if (!suburb || !postcode) return 'missing_fields'

  const name = place.displayName?.text ?? ''
  const types = place.types ?? []

  if (isExcluded(name, city)) return 'excluded'

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
  const cityArg = process.argv[2]?.toLowerCase()
  if (!cityArg || !CITIES[cityArg]) {
    console.error('Usage: tsx scripts/seed-city.ts <melbourne|sydney|brisbane>')
    console.error(`Available cities: ${Object.keys(CITIES).join(', ')}`)
    process.exit(1)
  }

  const city = CITIES[cityArg]
  console.log(`Querying Places API (New) — ${city.label}, ${city.radiusMeters / 1000}km radius`)
  const byPlaceId = new Map<string, PlaceResult>()
  const queriesByPlaceId = new Map<string, Set<string>>()

  for (const query of QUERIES) {
    process.stdout.write(`  • "${query}" ... `)
    const places = await searchAllPages(city, query)
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
  let droppedWrongState = 0
  let droppedMissing = 0
  let droppedExcluded = 0

  for (const [id, place] of byPlaceId) {
    const matched = [...(queriesByPlaceId.get(id) ?? [])]
    const result = derive(place, city, matched)
    if (typeof result === 'string') {
      if (result === 'wrong_state') droppedWrongState++
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
    city: city.slug,
    label: city.label,
    state: city.state,
    queries: QUERIES,
    center: city.center,
    radiusMeters: city.radiusMeters,
    totalUnique,
    droppedWrongState,
    droppedMissing,
    droppedExcluded,
    excludedNames,
    kept: courts.length,
    courts,
  }

  const outPath = resolve(process.cwd(), `seed-output-${city.slug}.json`)
  await writeFile(outPath, JSON.stringify(output, null, 2))

  console.log()
  console.log(`Total unique places (across all queries): ${totalUnique}`)
  console.log(`Dropped — outside ${city.state}: ${droppedWrongState}`)
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
