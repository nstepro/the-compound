import { z } from 'zod';

// Individual place/activity schema
export const PlaceSchema = z.object({
  id: z.string().describe('Unique identifier for the place'),
  name: z.string().describe('Name of the place or activity'),
  type: z.enum(['restaurant', 'activity', 'attraction', 'accommodation', 'shopping', 'other']).describe('Category of the place'),
  description: z.string().optional().describe('Brief description of the place'),
  url: z.string().url().optional().describe('Website URL if available'),
  address: z.string().optional().describe('Physical address'),
  mapsLink: z.string().url().optional().describe('Google Maps link'),
  phone: z.string().optional().describe('Phone number'),
  priceRange: z.enum(['$', '$$', '$$$', '$$$$']).optional().describe('Price range indicator'),
  rating: z.number().min(0).max(5).optional().describe('Rating out of 5'),
  hours: z.string().optional().describe('Operating hours'),
  notes: z.string().optional().describe('Additional notes or recommendations'),
  tags: z.array(z.string()).optional().describe('Tags for categorization'),
  coordinates: z.object({
    lat: z.number(),
    lng: z.number()
  }).optional().describe('GPS coordinates')
});

// Complete output schema
export const OutputSchema = z.object({
  metadata: z.object({
    generatedAt: z.string().datetime(),
    totalPlaces: z.number(),
    sourceDocId: z.string(),
    parserVersion: z.string()
  }),
  places: z.array(PlaceSchema)
});

// Schema validation functions
export const validatePlace = (data) => PlaceSchema.parse(data);
export const validateOutput = (data) => OutputSchema.parse(data); 