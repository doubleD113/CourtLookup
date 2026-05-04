export interface Court {
  id: string;
  name: string;
  address: string;
  suburb: string;
  state: string;
  postcode: string;
  latitude: number;
  longitude: number;
  type: 'indoor' | 'outdoor';
  facilityType: 'dedicated_court' | 'gym';
  bookingUrl: string;
  sourceWebsite: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CourtAvailability {
  id: string;
  courtId: string;
  date: Date;
  timeSlot: string;
  isAvailable: boolean;
  scrapedAt: Date;
}

export interface CourtSearchParams {
  location?: string;
  latitude?: number;
  longitude?: number;
  radius?: number; // in kilometers
  type?: 'indoor' | 'outdoor' | 'all';
  facilityType?: 'dedicated_court' | 'gym' | 'all';
}

export interface CourtSearchResult extends Court {
  distance?: number; // in kilometers
  availability?: CourtAvailability[];
}
