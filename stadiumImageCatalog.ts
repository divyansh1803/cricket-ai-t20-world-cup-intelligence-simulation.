export const STADIUM_FALLBACK_IMAGE = '/images/hero_cricket_stadium.jpg';

export interface StadiumImageEntry {
  id: string;
  name: string;
  city: string;
  country: string;
  imageUrl: string;
  landmarkCaption: string;
  aliases: string[];
}

export const STADIUM_IMAGE_CATALOG: Record<string, StadiumImageEntry> = {
  ahmedabad: {
    id: 'ahmedabad',
    name: 'Narendra Modi Stadium',
    city: 'Ahmedabad',
    country: 'India',
    imageUrl: '/images/stadiums/ahmedabad.jpg',
    landmarkCaption: '132,000-seat twin-tier bowl & LED roof ring · Motera, Ahmedabad',
    aliases: ['narendra modi', 'motera', 'ahmedabad'],
  },
  kensington: {
    id: 'kensington',
    name: 'Kensington Oval',
    city: 'Bridgetown',
    country: 'Barbados',
    imageUrl: '/images/stadiums/kensington.jpg',
    landmarkCaption: 'Worrell, Weekes & Walcott Stand & Party Mound · Bridgetown, Barbados',
    aliases: ['kensington', 'kensington oval', 'bridgetown', 'barbados'],
  },
  mcg: {
    id: 'mcg',
    name: 'Melbourne Cricket Ground',
    city: 'Melbourne',
    country: 'Australia',
    imageUrl: '/images/stadiums/mcg.jpg',
    landmarkCaption: '100,024-seat Great Southern Stand & light towers · Yarra Park, Melbourne',
    aliases: ['mcg', 'melbourne cricket ground', 'melbourne'],
  },
  eden: {
    id: 'eden',
    name: 'Eden Gardens',
    city: 'Kolkata',
    country: 'India',
    imageUrl: '/images/stadiums/eden.jpg',
    landmarkCaption: 'Iconic cantilevered canopy & B.C. Roy Clubhouse · Kolkata',
    aliases: ['eden gardens', 'kolkata', 'calcutta'],
  },
  wankhede: {
    id: 'wankhede',
    name: 'Wankhede Stadium',
    city: 'Mumbai',
    country: 'India',
    imageUrl: '/images/stadiums/wankhede.jpg',
    landmarkCaption: 'Arabian Sea coastal amphitheatre & Sachin Tendulkar Stand · Marine Drive, Mumbai',
    aliases: ['wankhede', 'mumbai'],
  },
  premadasa: {
    id: 'premadasa',
    name: 'R. Premadasa Stadium',
    city: 'Colombo',
    country: 'Sri Lanka',
    imageUrl: '/images/stadiums/premadasa.jpg',
    landmarkCaption: 'Khettarama floodlit bowl · Colombo, Sri Lanka',
    aliases: ['premadasa', 'r. premadasa', 'khettarama', 'colombo'],
  },
  lords: {
    id: 'lords',
    name: "Lord's Cricket Ground",
    city: 'London',
    country: 'England',
    imageUrl: '/images/stadiums/lords.jpg',
    landmarkCaption: 'Victorian Pavilion, J.P. Morgan Media Centre & famous 2.5m slope · St John’s Wood, London',
    aliases: ['lords', "lord's", 'lords cricket ground', 'st johns wood', 'london'],
  },
  scg: {
    id: 'scg',
    name: 'Sydney Cricket Ground',
    city: 'Sydney',
    country: 'Australia',
    imageUrl: '/images/stadiums/scg.jpg',
    landmarkCaption: 'Heritage Members Pavilion & Victor Trumper Stand · Moore Park, Sydney',
    aliases: ['scg', 'sydney cricket ground', 'sydney'],
  },
  dubai: {
    id: 'dubai',
    name: 'Dubai International Cricket Stadium',
    city: 'Dubai',
    country: 'UAE',
    imageUrl: '/images/stadiums/dubai.jpg',
    landmarkCaption: '350-floodlight Ring of Fire canopy · Dubai Sports City',
    aliases: ['dubai', 'dubai international', 'ring of fire', 'uae'],
  },
  newlands: {
    id: 'newlands',
    name: 'Newlands Cricket Ground',
    city: 'Cape Town',
    country: 'South Africa',
    imageUrl: '/images/stadiums/newlands.jpg',
    landmarkCaption: 'Table Mountain & Devil’s Peak backdrop · Newlands, Cape Town',
    aliases: ['newlands', 'cape town', 'table mountain'],
  },
  karachi: {
    id: 'karachi',
    name: 'National Stadium Karachi',
    city: 'Karachi',
    country: 'Pakistan',
    imageUrl: '/images/stadiums/karachi.jpg',
    landmarkCaption: 'Tensile fabric roof enclosures & Fazal Mahmood Stand · Karachi',
    aliases: ['karachi', 'national stadium karachi', 'national bank cricket arena'],
  },
  eden_park: {
    id: 'eden_park',
    name: 'Eden Park',
    city: 'Auckland',
    country: 'New Zealand',
    imageUrl: '/images/stadiums/eden_park.jpg',
    landmarkCaption: 'South Stand translucent facade & short straight boundaries · Kingsland, Auckland',
    aliases: ['eden_park', 'eden park', 'auckland'],
  },
  dhaka: {
    id: 'dhaka',
    name: 'Sher-e-Bangla National Cricket Stadium, Dhaka',
    city: 'Dhaka',
    country: 'Bangladesh',
    imageUrl: '/images/stadiums/dhaka.jpg',
    landmarkCaption: 'Home of Cricket in Mirpur · Dhaka, Bangladesh',
    aliases: ['dhaka', 'sher-e-bangla', 'shere bangla', 'mirpur'],
  },
  chennai: {
    id: 'chennai',
    name: 'M. A. Chidambaram Stadium',
    city: 'Chennai',
    country: 'India',
    imageUrl: '/images/stadiums/chennai.jpg',
    landmarkCaption: 'Chepauk coastal spin cauldron & Anna Pavilion · Marina Beach, Chennai',
    aliases: ['chennai', 'chidambaram', 'chepauk', 'm. a. chidambaram', 'ma chidambaram'],
  },
  malahide: {
    id: 'malahide',
    name: 'Malahide Cricket Club Ground',
    city: 'Dublin',
    country: 'Ireland',
    imageUrl: '/images/stadiums/malahide.jpg',
    landmarkCaption: 'The Village parkland arena adjacent to Malahide Castle · Dublin, Ireland',
    aliases: ['malahide', 'dublin', 'the village'],
  },
  harare: {
    id: 'harare',
    name: 'Harare Sports Club',
    city: 'Harare',
    country: 'Zimbabwe',
    imageUrl: '/images/stadiums/harare.jpg',
    landmarkCaption: 'Jacaranda-lined highveld ground & colonial pavilion · Harare, Zimbabwe',
    aliases: ['harare', 'harare sports club', 'salisbury'],
  },
};

export interface StadiumLookupInput {
  id?: string | null;
  name?: string | null;
  city?: string | null;
  image?: string | null;
  imageUrl?: string | null;
}

function normalizeKey(raw: string): string {
  return raw.trim().toLowerCase().replace(/[\u2018\u2019`]/g, "'");
}

export function resolveStadiumCatalogEntry(
  input?: string | StadiumLookupInput | null
): StadiumImageEntry | null {
  if (!input) return null;

  if (typeof input === 'string') {
    const q = normalizeKey(input);
    if (!q) return null;

    if (STADIUM_IMAGE_CATALOG[q]) {
      return STADIUM_IMAGE_CATALOG[q];
    }

    // Check exact alias match first (avoid matching 'eden' before 'eden_park')
    if (q.includes('eden park') || q.includes('eden_park') || q.includes('auckland')) {
      return STADIUM_IMAGE_CATALOG.eden_park;
    }

    for (const entry of Object.values(STADIUM_IMAGE_CATALOG)) {
      if (
        normalizeKey(entry.name) === q ||
        normalizeKey(entry.city) === q ||
        entry.aliases.some((alias) => q === normalizeKey(alias))
      ) {
        return entry;
      }
    }

    for (const entry of Object.values(STADIUM_IMAGE_CATALOG)) {
      if (
        q.includes(normalizeKey(entry.name)) ||
        entry.aliases.some((alias) => q.includes(normalizeKey(alias)))
      ) {
        return entry;
      }
    }

    return null;
  }

  // Object lookup: check id first, then name, then city
  if (input.id) {
    const byId = resolveStadiumCatalogEntry(input.id);
    if (byId) return byId;
  }
  if (input.name) {
    const byName = resolveStadiumCatalogEntry(input.name);
    if (byName) return byName;
  }
  if (input.city) {
    const byCity = resolveStadiumCatalogEntry(input.city);
    if (byCity) return byCity;
  }

  return null;
}

export function resolveStadiumImageUrl(
  input?: string | StadiumLookupInput | null
): string {
  const catalogEntry = resolveStadiumCatalogEntry(input);
  if (catalogEntry) {
    return catalogEntry.imageUrl;
  }

  if (input && typeof input === 'object') {
    const customUrl = input.imageUrl || input.image;
    if (customUrl && customUrl !== STADIUM_FALLBACK_IMAGE) {
      return customUrl;
    }
  }

  return STADIUM_FALLBACK_IMAGE;
}

export function resolveStadiumLandmarkCaption(
  input?: string | StadiumLookupInput | null
): string {
  return resolveStadiumCatalogEntry(input)?.landmarkCaption || 'International Cricket Arena';
}

// ============================================================================
// ASYNCHRONOUS VENUE IMAGE LOADER & SOURCE URL VERIFICATION REGISTRY
// ============================================================================

export type PlaceholderBlueprintVariant =
  | 'bowl'
  | 'aerial'
  | 'pavilion'
  | 'floodlight'
  | 'pitch';

export interface VenueAssetCheckResult {
  url: string;
  ok: boolean;
  width: number;
  height: number;
  checkedAt: number;
}

const verifiedAssetCache = new Map<string, VenueAssetCheckResult>();
const inFlightAssetChecks = new Map<string, Promise<VenueAssetCheckResult>>();

export function getCachedVenueAssetCheck(url?: string | null): VenueAssetCheckResult | null {
  if (!url) return null;
  return verifiedAssetCache.get(url) ?? null;
}

/**
 * Asynchronously verifies that a stadium image URL resolves and decodes to valid pixel dimensions.
 * Memoizes both in-flight checks and completed results to avoid duplicate network fetches.
 */
export function verifyStadiumAssetUrl(
  url?: string | null,
  timeoutMs = 6500
): Promise<VenueAssetCheckResult> {
  const trimmed = (url || '').trim();
  if (!trimmed) {
    return Promise.resolve({
      url: '',
      ok: false,
      width: 0,
      height: 0,
      checkedAt: Date.now(),
    });
  }

  const cached = verifiedAssetCache.get(trimmed);
  if (cached) {
    return Promise.resolve(cached);
  }

  const existingPromise = inFlightAssetChecks.get(trimmed);
  if (existingPromise) {
    return existingPromise;
  }

  if (typeof window === 'undefined' || typeof Image === 'undefined') {
    const ssrResult: VenueAssetCheckResult = {
      url: trimmed,
      ok: true,
      width: 1280,
      height: 720,
      checkedAt: Date.now(),
    };
    return Promise.resolve(ssrResult);
  }

  const checkPromise = new Promise<VenueAssetCheckResult>((resolve) => {
    const img = new Image();
    let settled = false;

    const finalize = (ok: boolean, width = 0, height = 0) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timerId);
      img.onload = null;
      img.onerror = null;
      const result: VenueAssetCheckResult = {
        url: trimmed,
        ok,
        width,
        height,
        checkedAt: Date.now(),
      };
      verifiedAssetCache.set(trimmed, result);
      inFlightAssetChecks.delete(trimmed);
      resolve(result);
    };

    const timerId = window.setTimeout(() => {
      finalize(false, 0, 0);
    }, timeoutMs);

    img.referrerPolicy = 'no-referrer';
    img.decoding = 'async';
    img.onload = () => {
      const valid = img.naturalWidth > 0 && img.naturalHeight > 0;
      finalize(valid, img.naturalWidth, img.naturalHeight);
    };
    img.onerror = () => {
      finalize(false, 0, 0);
    };
    img.src = trimmed;
  });

  inFlightAssetChecks.set(trimmed, checkPromise);
  return checkPromise;
}

/**
 * Walks candidate URLs asynchronously in priority order and returns the first verified asset URL.
 * If all candidates fail verification, returns `verifiedUrl: null` so callers display the High-Fidelity Placeholder.
 */
export async function verifyStadiumCandidateUrls(
  candidates: (string | null | undefined)[]
): Promise<{
  verifiedUrl: string | null;
  width: number;
  height: number;
  attempted: string[];
}> {
  const uniqueUrls = Array.from(
    new Set(candidates.map((c) => (c || '').trim()).filter((c) => c.length > 0))
  );

  for (const candidateUrl of uniqueUrls) {
    const check = await verifyStadiumAssetUrl(candidateUrl);
    if (check.ok) {
      return {
        verifiedUrl: check.url,
        width: check.width,
        height: check.height,
        attempted: uniqueUrls,
      };
    }
  }

  return {
    verifiedUrl: null,
    width: 0,
    height: 0,
    attempted: uniqueUrls,
  };
}

// ============================================================================
// MULTI-ANGLE ARCHITECTURAL CAROUSEL METADATA FOR VENUE DETAIL MODAL
// ============================================================================

export interface StadiumArchitecturalAngle {
  id: string;
  angleCode: string;
  title: string;
  shortLabel: string;
  viewpointTag: string;
  lensSpec: string;
  imageUrl: string;
  architecturalNotes: string;
  placeholderVariant: PlaceholderBlueprintVariant;
}

export interface ArchitecturalStadiumInput extends StadiumLookupInput {
  country?: string;
  capacity?: number;
  elevation?: string;
  pitchType?: string;
  boundarySizeMeters?: { straight: number; square: number };
}

export function getStadiumArchitecturalAngles(
  stadium: ArchitecturalStadiumInput
): StadiumArchitecturalAngle[] {
  const primaryUrl = resolveStadiumImageUrl(stadium);
  const landmark = resolveStadiumLandmarkCaption(stadium);
  const name = stadium.name || 'International Cricket Stadium';
  const city = stadium.city || 'Host City';
  const capacityText = stadium.capacity ? stadium.capacity.toLocaleString() : '50,000';
  const straightM = stadium.boundarySizeMeters?.straight ?? 74;
  const squareM = stadium.boundarySizeMeters?.square ?? 68;
  const pitchProfile = stadium.pitchType || 'Balanced Turf';

  return [
    {
      id: `${stadium.id || 'venue'}-landmark-bowl`,
      angleCode: 'CAM 01',
      title: 'Signature Bowl & Facade Panorama',
      shortLabel: 'Bowl Panorama',
      viewpointTag: 'Primary Architectural Elevation',
      lensSpec: '24mm Wide · Azimuth 028° · Elev 22°',
      imageUrl: primaryUrl,
      architecturalNotes: `${landmark}. Seating bowl engineered for ${capacityText} spectators with ${straightM}m straight and ${squareM}m square playing dimensions.`,
      placeholderVariant: 'bowl',
    },
    {
      id: `${stadium.id || 'venue'}-aerial-geometry`,
      angleCode: 'CAM 02',
      title: 'High-Altitude Roof Ring & Boundary Geometry',
      shortLabel: 'Aerial Geometry',
      viewpointTag: 'Overhead Structural Truss & Outfield',
      lensSpec: '35mm Drone · Nadir 74° · Alt 185m',
      imageUrl: '/images/stadiums/angles/aerial_bowl.jpg',
      architecturalNotes: `Overhead architectural plan of ${name} (${city}) highlighting radial canopy framing, 30-yard fielding restriction circle, and ${straightM}m × ${squareM}m rope symmetry.`,
      placeholderVariant: 'aerial',
    },
    {
      id: `${stadium.id || 'venue'}-pavilion-sightscreen`,
      angleCode: 'CAM 03',
      title: 'Pitch-Level Members Pavilion & Sightscreen',
      shortLabel: 'Pavilion End',
      viewpointTag: '22-Yard Umpire Axis · Sightscreen',
      lensSpec: '50mm Broadcast · Azimuth 180° · Elev 1.8m',
      imageUrl: '/images/stadiums/angles/pavilion_pitch.jpg',
      architecturalNotes: `Ground-level sightline down the ${pitchProfile.toLowerCase()} 22-yard strip toward the black sightscreen, players' viewing balcony, and glass pavilion tiers.`,
      placeholderVariant: 'pavilion',
    },
    {
      id: `${stadium.id || 'venue'}-floodlight-terrace`,
      angleCode: 'CAM 04',
      title: 'Broadcast Terrace & Night Floodlight Array',
      shortLabel: 'Floodlight Canopy',
      viewpointTag: 'Upper Media Deck · Night Illumination',
      lensSpec: '20mm Panavision · Azimuth 215° · 2,400 Lux',
      imageUrl: '/images/stadiums/angles/floodlight_deck.jpg',
      architecturalNotes: `Upper broadcast gantry perspective capturing multi-mast LED illumination across ${name}, minimizing shadow overlap along the batting crease.`,
      placeholderVariant: 'floodlight',
    },
    {
      id: `${stadium.id || 'venue'}-turf-square`,
      angleCode: 'CAM 05',
      title: 'Center Square Clay & Outfield Drainage Cut',
      shortLabel: 'Turf & Square',
      viewpointTag: 'Curator Surface Inspection · 15m',
      lensSpec: '70mm Telephoto · Elev 14° · Turf Macro',
      imageUrl: '/images/cricket_tactical_pitch.jpg',
      architecturalNotes: `Close-range inspection of the center pitch table and manicured outfield drainage gradient (${
        stadium.elevation || 'Sea-level'
      } elevation · ${pitchProfile} preparation).`,
      placeholderVariant: 'pitch',
    },
  ];
}

