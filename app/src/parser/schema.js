const { z } = require('zod');

// Individual place/activity schema
const PlaceSchema = z.object({
  id: z.string().describe('Unique identifier for the place'),
  name: z.string().describe('Name of the place or activity'),
  type: z.enum(['dining', 'restaurant', 'activity', 'accommodation', 'shopping', 'other']).describe('Category of the place'),
  description: z.string().nullish().describe('Brief description of the place'),
  url: z.string().url().nullish().describe('Website URL if available'),
  address: z.string().optional().describe('Physical address'),
  mapsLink: z.string().url().optional().describe('Google Maps link'),
  phone: z.string().optional().describe('Phone number'),
  priceRange: z.enum(['$', '$$', '$$$', '$$$$']).optional().describe('Price range indicator'),
  rating: z.number().min(0).max(5).optional().describe('Rating out of 5'),
  hours: z.union([
    z.string(),
    z.array(z.string())
  ]).optional().describe('Operating hours'),
  notes: z.string().nullish().describe('Additional notes or recommendations'),
  tags: z.array(z.string()).optional().describe('Tags for categorization and search'),
  coordinates: z.object({
    lat: z.number(),
    lng: z.number()
  }).optional().describe('GPS coordinates'),
  origText: z.string().describe('Original text from the document for this place'),
  category: z.string().describe('Document section/category where this place was found'),
  googlePlacesTypes: z.array(z.string()).optional().describe('Google Places API types for this place'),
  enrichmentStatus: z.object({
    enriched: z.boolean().default(false),
    enrichedAt: z.string().datetime().optional(),
    enrichmentVersion: z.string().optional()
  }).optional().describe('Tracking information for enrichment status')
});

// Complete output schema
const OutputSchema = z.object({
  metadata: z.object({
    generatedAt: z.string().datetime(),
    totalPlaces: z.number(),
    sourceDocId: z.string(),
    parserVersion: z.string()
  }),
  places: z.array(PlaceSchema)
});

// Schema validation functions
const validatePlace = (data) => PlaceSchema.parse(data);
const validateOutput = (data) => OutputSchema.parse(data);

module.exports = {
  PlaceSchema,
  OutputSchema,
  validatePlace,
  validateOutput
}; 