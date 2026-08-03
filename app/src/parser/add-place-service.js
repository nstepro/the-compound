const fs = require('fs');
const path = require('path');
const { config } = require('./config');
const { logger } = require('./logger');
const { googleDocsService } = require('./google-docs');
const { openaiService } = require('./openai-service');
const { webEnrichmentService } = require('./web-enrichment-service');
const { googleCloudStorageService } = require('./google-cloud-storage');
const { validatePlace } = require('./schema');
const { parser } = require('./parser');
const { normalizeName, findDuplicate, buildMapsLink } = require('./add-place-utils');

const MAX_TEXT_LENGTH = 500;
const MAX_NOTES_LENGTH = 500;

function generatePlaceId(name) {
  return parser.generatePlaceId(name);
}

function matchSectionTitle(requested, available) {
  if (!requested || available.length === 0) {
    return available[0] || 'Activities';
  }
  const norm = requested.trim().toLowerCase();
  const exact = available.find((s) => s.trim().toLowerCase() === norm);
  if (exact) {
    return exact;
  }
  const partial = available.find(
    (s) => s.toLowerCase().includes(norm) || norm.includes(s.toLowerCase())
  );
  return partial || available[0];
}

function docContainsName(docContent, normalizedName) {
  if (!docContent || !normalizedName) {
    return false;
  }
  return normalizeName(docContent).includes(normalizedName);
}

function formatPlaceSummary(place) {
  const lines = [
    `**${place.name}**`,
    `Category: ${place.category}`,
    `Type: ${place.type}`,
  ];
  if (place.description) {
    lines.push(`Description: ${place.description}`);
  }
  if (place.address) {
    lines.push(`Address: ${place.address}`);
  }
  if (place.tags?.length) {
    lines.push(`Tags: ${place.tags.join(', ')}`);
  }
  if (place.hours) {
    const hoursStr = Array.isArray(place.hours) ? place.hours.join('; ') : place.hours;
    lines.push(`Hours: ${hoursStr}`);
  }
  if (place.notes) {
    lines.push(`Notes: ${place.notes}`);
  }
  if (place.mapsLink) {
    lines.push(`Maps: ${place.mapsLink}`);
  }
  return lines.join('\n');
}

function mapSearchCandidate(result) {
  return {
    placeId: result.place_id,
    name: result.name,
    address: result.formatted_address || null,
    rating: result.rating ?? null,
    mapsLink: buildMapsLink(result.place_id),
  };
}

async function loadExistingOutput() {
  try {
    if (config.googleCloudStorage.enabled) {
      const content = await googleCloudStorageService.downloadFile();
      if (content) {
        return content;
      }
    } else {
      const appRoot = path.join(__dirname, '../..');
      const outputPath = path.join(appRoot, 'src', 'parser', 'output', parser.outputFilename);
      const publicPath = path.join(appRoot, 'public', 'compound-places.json');

      for (const filePath of [outputPath, publicPath]) {
        if (fs.existsSync(filePath)) {
          return JSON.parse(fs.readFileSync(filePath, 'utf8'));
        }
      }
    }
  } catch (error) {
    logger.warn('Failed to load existing output:', error);
  }

  return {
    metadata: {
      generatedAt: new Date().toISOString(),
      totalPlaces: 0,
      sourceDocId: config.google.docId,
      parserVersion: '1.0.0',
    },
    places: [],
  };
}

async function enrichSinglePlace(stub) {
  const enriched = await webEnrichmentService.enrichPlace(stub);
  const tags = await webEnrichmentService.generateTags(enriched);
  let hours = enriched.hours;
  if (enriched.rawHours && !hours) {
    hours = await webEnrichmentService.summarizeHours(enriched.rawHours);
  }

  const mapsLink =
    enriched.mapsLink ||
    (enriched.enrichmentStatus?.place_id
      ? buildMapsLink(enriched.enrichmentStatus.place_id)
      : undefined);

  return {
    ...enriched,
    tags,
    ...(hours && { hours }),
    ...(mapsLink && { mapsLink }),
  };
}

function buildStubFromCandidate(llmPlace, candidate, userText, notes) {
  const name = candidate?.name || llmPlace.name;
  const origText =
    llmPlace.origText ||
    `**${name}**${llmPlace.description ? ` — ${llmPlace.description}` : ''}${notes ? `. ${notes}` : ''}`;

  return {
    name,
    type: llmPlace.type || 'other',
    description: llmPlace.description || null,
    notes: notes || llmPlace.notes || null,
    category: llmPlace.category,
    origText,
    emoji: llmPlace.emoji,
    starred: false,
    id: generatePlaceId(name),
    _selectedPlaceId: candidate?.placeId,
  };
}

class AddPlaceService {
  validateInput(text, notes) {
    if (!text || typeof text !== 'string' || !text.trim()) {
      throw new Error('text is required');
    }
    if (text.length > MAX_TEXT_LENGTH) {
      throw new Error(`text must be at most ${MAX_TEXT_LENGTH} characters`);
    }
    if (notes != null) {
      if (typeof notes !== 'string') {
        throw new Error('notes must be a string');
      }
      if (notes.length > MAX_NOTES_LENGTH) {
        throw new Error(`notes must be at most ${MAX_NOTES_LENGTH} characters`);
      }
    }
  }

  async preview({ text, notes, selectedPlaceId }) {
    this.validateInput(text, notes);

    const docId = config.google.docId;
    const document = await googleDocsService.getDocumentContent(docId);
    const sectionTitles = googleDocsService.listSectionTitles(document);
    const docMarkdown = await googleDocsService.getDocumentAsMarkdown(docId);

    const existingOutput = await loadExistingOutput();
    const existingPlaces = existingOutput.places || [];

    const llmPlace = await openaiService.parseFreeTextPlace(
      text.trim(),
      notes?.trim() || '',
      sectionTitles
    );

    if (llmPlace.needsClarification) {
      return {
        status: 'needs_clarification',
        message: 'Could not identify a specific place from your description. Try including the business name.',
        candidates: [],
      };
    }

    const category = matchSectionTitle(llmPlace.category, sectionTitles);
    llmPlace.category = category;

    const searchQuery = `${llmPlace.name || text} ${category} ${config.location.searchContext}`;
    const searchResults = await webEnrichmentService.searchGooglePlaces(searchQuery, 5);
    const candidates = searchResults.map(mapSearchCandidate);

    let chosen = null;
    if (selectedPlaceId) {
      chosen = searchResults.find((r) => r.place_id === selectedPlaceId) || null;
      if (!chosen && candidates.length > 0) {
        return {
          status: 'needs_clarification',
          message: 'Selected place not found. Please pick from the list.',
          candidates,
        };
      }
    } else if (searchResults.length === 1) {
      chosen = searchResults[0];
    } else if (searchResults.length > 1) {
      return {
        status: 'needs_clarification',
        message: 'Multiple matches found. Which place did you mean?',
        candidates,
        category,
      };
    }

    if (!chosen && searchResults.length === 0) {
      const stub = buildStubFromCandidate(llmPlace, null, text, notes?.trim());
      stub.category = category;
      const enriched = await enrichSinglePlace(stub);
      return this.buildPreviewResult(enriched, existingPlaces, docMarkdown.content, {
        advisoryDocMatch: docContainsName(docMarkdown.content, normalizeName(stub.name)),
      });
    }

    if (!chosen) {
      return {
        status: 'needs_clarification',
        message: 'Multiple matches found. Which place did you mean?',
        candidates,
        category,
      };
    }

    const stub = buildStubFromCandidate(llmPlace, mapSearchCandidate(chosen), text, notes?.trim());
    stub.category = category;
    const enriched = await enrichSinglePlace(stub);

    return this.buildPreviewResult(enriched, existingPlaces, docMarkdown.content, {
      advisoryDocMatch: docContainsName(docMarkdown.content, normalizeName(enriched.name)),
    });
  }

  buildPreviewResult(enriched, existingPlaces, docContent, { advisoryDocMatch }) {
    const googlePlaceId = enriched.enrichmentStatus?.place_id;
    const slugId = enriched.id || generatePlaceId(enriched.name);
    enriched.id = slugId;

    const duplicate = findDuplicate(existingPlaces, {
      googlePlaceId,
      slugId,
      normalizedName: normalizeName(enriched.name),
    });

    const summary = formatPlaceSummary(enriched);
    const docLinePreview = enriched.origText;

    if (duplicate?.tier === 'definite') {
      return {
        status: 'already_exists',
        message: `${duplicate.existing.name} is already in the guide.`,
        existingPlace: duplicate.existing,
        proposedPlace: enriched,
        summary,
        docLinePreview,
      };
    }

    if (duplicate?.tier === 'possible') {
      return {
        status: 'possible_duplicate',
        message: `Something similar already exists: ${duplicate.existing.name}. Is this a different place?`,
        existingPlace: duplicate.existing,
        proposedPlace: enriched,
        summary,
        docLinePreview,
        advisoryDocMatch,
      };
    }

    return {
      status: 'ready',
      message: 'Ready to add this place.',
      proposedPlace: enriched,
      summary,
      docLinePreview,
      advisoryDocMatch,
    };
  }

  async commit({ proposedPlace, forceDuplicate }) {
    if (!proposedPlace || typeof proposedPlace !== 'object') {
      throw new Error('proposedPlace is required');
    }

    const place = { ...proposedPlace };
    delete place._selectedPlaceId;

    place.id = place.id || generatePlaceId(place.name);

    const existingOutput = await loadExistingOutput();
    const existingPlaces = existingOutput.places || [];

    const duplicate = findDuplicate(existingPlaces, {
      googlePlaceId: place.enrichmentStatus?.place_id,
      slugId: place.id,
      normalizedName: normalizeName(place.name),
    });

    if (duplicate?.tier === 'definite') {
      const err = new Error(`${duplicate.existing.name} is already in the guide.`);
      err.code = 'DUPLICATE_PLACE';
      err.statusCode = 409;
      err.existingPlace = duplicate.existing;
      throw err;
    }

    if (duplicate?.tier === 'possible' && !forceDuplicate) {
      const err = new Error(
        `Possible duplicate of "${duplicate.existing.name}". Confirm to add as a new place.`
      );
      err.code = 'POSSIBLE_DUPLICATE';
      err.statusCode = 409;
      err.existingPlace = duplicate.existing;
      throw err;
    }

    const validated = validatePlace(place);

    const docId = config.google.docId;
    let docUpdated = false;
    try {
      await googleDocsService.appendPlaceEntry(
        docId,
        validated.category,
        validated.origText
      );
      docUpdated = true;
    } catch (docError) {
      logger.error('Failed to append to Google Doc:', docError);
      throw new Error(`Failed to update Google Doc: ${docError.message}`);
    }

    try {
      const merged = {
        ...existingOutput,
        metadata: {
          ...existingOutput.metadata,
          generatedAt: new Date().toISOString(),
          totalPlaces: (existingPlaces.length + 1),
          sourceDocId: docId,
          parserVersion: existingOutput.metadata?.parserVersion || '1.0.0',
          categories: [
            ...new Set([...(existingOutput.metadata?.categories || []), validated.category].filter(Boolean)),
          ],
        },
        places: [...existingPlaces, validated],
      };

      await parser.saveOutput(merged);

      if (!config.googleCloudStorage.enabled) {
        const appRoot = path.join(__dirname, '../..');
        const outputPath = path.join(appRoot, 'src', 'parser', 'output', parser.outputFilename);
        const publicPath = path.join(appRoot, 'public', 'compound-places.json');
        if (fs.existsSync(outputPath)) {
          fs.copyFileSync(outputPath, publicPath);
        }
      }

      logger.info(`Add place committed: ${validated.id} (${validated.name})`);

      return {
        success: true,
        place: validated,
        docUpdated,
        jsonUpdated: true,
      };
    } catch (jsonError) {
      logger.error('Doc updated but JSON save failed:', jsonError);
      const err = new Error(
        `Place was added to the Google Doc but saving JSON failed: ${jsonError.message}. Run the parser or retry.`
      );
      err.code = 'PARTIAL_SUCCESS';
      err.statusCode = 500;
      err.docUpdated = docUpdated;
      throw err;
    }
  }
}

const addPlaceService = new AddPlaceService();

module.exports = {
  addPlaceService,
};
