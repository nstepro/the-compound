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