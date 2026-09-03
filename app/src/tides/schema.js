const { z } = require('zod');

const StationSchema = z.object({
  id: z.string(),
  name: z.string(),
  state: z.string(),
  lat: z.number(),
  lng: z.number(),
  type: z.string(),
  referenceStationId: z.string(),
  referenceStationName: z.string(),
  correction: z.object({
    timeOffsetMinutes: z.number(),
    heightFactor: z.number(),
    appliedBy: z.string(),
  }),
});

const AnomalySchema = z.object({
  date: z.string(),
  kind: z.string(),
  slot: z.string(),
  kept: z.string(),
  dropped: z.string(),
  note: z.string(),
});

const PredictionSchema = z.object({
  t: z.string(),
  v: z.string(),
  type: z.enum(['H', 'L']),
});

const MoonPhaseSchema = z.object({
  date: z.string(),
  phase: z.string(),
  utc: z.string(),
});

const TideCacheSchema = z.object({
  metadata: z.object({
    generatedAt: z.string().datetime(),
    syncVersion: z.string(),
    source: z.string(),
    station: StationSchema,
    datum: z.string(),
    units: z.string(),
    timeZone: z.string(),
    coverage: z.object({
      start: z.string(),
      end: z.string(),
      days: z.number(),
      events: z.number(),
    }),
    moonPhaseSource: z.string(),
    anomalies: z.array(AnomalySchema),
  }),
  predictions: z.array(PredictionSchema),
  moonPhases: z.array(MoonPhaseSchema),
});

const validateTideCache = (data) => TideCacheSchema.parse(data);

module.exports = {
  StationSchema,
  AnomalySchema,
  PredictionSchema,
  MoonPhaseSchema,
  TideCacheSchema,
  validateTideCache,
};
