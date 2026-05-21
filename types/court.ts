export type FacilityType = 'dedicated_court' | 'gym' | 'community_centre'
export type CourtSource = 'google_places' | 'scraper' | 'manual'
export type Surface = 'indoor' | 'outdoor' | 'both'

export interface Court {
  id: string
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
  googlePlaceId: string | null
  source: CourtSource
  verifiedAt: Date | null
  surfaceVerifiedAt: Date | null
  hiddenAt: Date | null
  createdAt: Date
  updatedAt: Date
}

export interface CourtSearchParams {
  q?: string
  suburb?: string
  postcode?: string
  state?: string
  latitude?: number
  longitude?: number
  radiusKm?: number
  facilityType?: FacilityType | 'all'
}

export interface CourtSearchResult extends Court {
  distanceKm?: number
}
