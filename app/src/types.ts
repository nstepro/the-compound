export interface Place {
  id: string;
  name: string;
  type: string;
  description: string | null;
  website: string | null;
  address: string | null;
  mapsLink: string | null;
  phone: string | null;
  priceRange: string | null;
  rating: number | null;
  hours: string | Record<string, string> | null;
  notes: string | null;
  tags: string[];
  coordinates: {
    lat: number;
    lng: number;
  } | null;
  origText: string;
  category: string;
  enrichmentStatus: {
    enriched: boolean;
    enrichedAt: string;
    enrichmentVersion: string;
  };
  starred?: boolean;
  emoji?: string;
}

export interface PlacesData {
  metadata: {
    generatedAt: string;
    totalPlaces: number;
    sourceDocId: string;
    sourceDocTitle: string;
    parserVersion: string;
    enrichmentVersion: string;
    summary: string;
    categories: string[];
    enrichmentStats: {
      totalPlaces: number;
      enrichedPlaces: number;
      skippedPlaces: number;
    };
  };
  places: Place[];
}

export interface TideEntry {
  time: string;
  ft: string;
  extreme: boolean;
}

export interface TideDay {
  date: string;
  day: number;
  dow: string;
  isWeekend: boolean;
  isToday: boolean;
  highs: { am: TideEntry | null; pm: TideEntry | null };
  lows: { am: TideEntry | null; pm: TideEntry | null };
}

export interface MoonPhase {
  day: number;
  phase: string;
}

export interface NextTide {
  type: 'H' | 'L';
  label: string;
  date: string;
  time: string;
  meridiem: string;
  ft: string;
}

export interface TideMonth {
  success: true;
  month: string;
  monthLabel: string;
  available: { first: string; last: string };
  station: {
    id: string;
    name: string;
    correctionNote: string;
    correctionDetail: string;
    datum: string;
    units: string;
  };
  today: { date: string; inRequestedMonth: boolean };
  nextTides: NextTide[];
  days: TideDay[];
  moonPhases: MoonPhase[];
  footnotes: string[];
  stale: boolean;
  generatedAt: string;
} 