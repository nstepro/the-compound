function normalizeName(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function generatePlaceIdFromName(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

function findDuplicate(existingPlaces, { googlePlaceId, slugId, normalizedName }) {
  for (const existing of existingPlaces) {
    if (googlePlaceId && existing.enrichmentStatus?.place_id === googlePlaceId) {
      return { tier: 'definite', existing };
    }
    if (slugId && existing.id === slugId) {
      return { tier: 'definite', existing };
    }
  }

  for (const existing of existingPlaces) {
    if (normalizedName && normalizeName(existing.name) === normalizedName) {
      return { tier: 'possible', existing };
    }
  }

  return null;
}

function buildMapsLink(placeId) {
  if (!placeId) {
    return null;
  }
  const id = placeId.replace(/^places\//, '');
  return `https://www.google.com/maps/search/?api=1&query_place_id=${encodeURIComponent(id)}`;
}

module.exports = {
  normalizeName,
  generatePlaceIdFromName,
  findDuplicate,
  buildMapsLink,
};
