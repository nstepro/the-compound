import { describe, it, expect } from 'vitest';
import {
  normalizeName,
  generatePlaceIdFromName,
  findDuplicate,
} from './add-place-utils.js';

describe('add-place-service duplicates', () => {
  const existingPlaces = [
    {
      id: 'spark-bagels',
      name: 'Spark Bagels',
      type: 'dining',
      category: 'Restaurants',
      origText: '**Spark Bagels**',
      enrichmentStatus: {
        enriched: true,
        place_id: 'places/ChIJspark123',
      },
    },
    {
      id: 'harbor-grill',
      name: 'Harbor Grill',
      type: 'dining',
      category: 'Restaurants',
      origText: '**Harbor Grill**',
    },
  ];

  it('normalizeName strips punctuation and case', () => {
    expect(normalizeName('Spark Bagels!')).toBe('spark bagels');
  });

  it('generatePlaceIdFromName produces slug ids', () => {
    expect(generatePlaceIdFromName('Spark Bagels')).toBe('spark-bagels');
  });

  it('findDuplicate detects definite match by place_id', () => {
    const result = findDuplicate(existingPlaces, {
      googlePlaceId: 'places/ChIJspark123',
      slugId: 'other-id',
      normalizedName: 'new place',
    });
    expect(result?.tier).toBe('definite');
    expect(result?.existing.name).toBe('Spark Bagels');
  });

  it('findDuplicate detects definite match by slug id', () => {
    const result = findDuplicate(existingPlaces, {
      googlePlaceId: null,
      slugId: 'spark-bagels',
      normalizedName: 'spark bagels',
    });
    expect(result?.tier).toBe('definite');
  });

  it('findDuplicate detects possible match by normalized name', () => {
    const result = findDuplicate(existingPlaces, {
      googlePlaceId: 'places/ChIJnew',
      slugId: 'harbor-grill-2',
      normalizedName: 'harbor grill',
    });
    expect(result?.tier).toBe('possible');
    expect(result?.existing.id).toBe('harbor-grill');
  });

  it('findDuplicate returns null when no match', () => {
    const result = findDuplicate(existingPlaces, {
      googlePlaceId: 'places/ChIJbrandnew',
      slugId: 'brand-new-cafe',
      normalizedName: 'brand new cafe',
    });
    expect(result).toBeNull();
  });
});
