import { BallEvent, Stadium } from '../types/cricket';

export type BattingAggressionSetting =
  | 'Anchor'
  | 'Balanced'
  | 'Aggressive'
  | 'Maximum Risk';

export interface ShotTrajectoryArcData {
  id: string;
  overLabel: string;
  batterName: string;
  bowlerName: string;
  shotText: string;
  runs: number;
  batterRuns: number;
  isWicket: boolean;
  wicketType?: string;
  isBoundaryFour: boolean;
  isBoundarySix: boolean;
  isLatest: boolean;
  /** 0..100 composite tactical aggression of the stroke */
  aggressionScore: number;
  aggressionLabel: 'Defensive' | 'Controlled' | 'Positive' | 'Aggressive' | 'Maximum Assault';
  /** Estimated carry + roll distance in meters (2m .. 106m) */
  distanceMeters: number;
  /** Estimated bat exit speed in km/h */
  exitVelocityKmh: number;
  /** Launch elevation angle in degrees */
  launchAngleDeg: number;
  /** Combined 0..1 index blending shot aggression & resulting distance */
  heatIndex: number;
  /** Compass angle on ground: 0 = straight down ground (top), 90 = right, 180 = behind keeper (bottom), 270 = left */
  groundAngleDeg: number;
  /** Normalized landing target on stadium SVG (0..100 coordinate space, striker at ~50, 58) */
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  /** Parabolic quadratic bezier control point creating 3D lofted arc illusion */
  ctrlX: number;
  ctrlY: number;
  /** Primary stroke hex color shifted by aggression + distance (e.g. green for singles, deep red for sixes) */
  strokeColor: string;
  /** Brighter highlight/start gradient color */
  glowColor: string;
  /** Darker terminal/tip color (especially rich deep red for big sixes) */
  tipColor: string;
  /** Stroke width in SVG user units */
  strokeWidth: number;
}

function hashString(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * Math.max(0, Math.min(1, t));
}

function rgbToHex(r: number, g: number, b: number): string {
  const clamp = (v: number) => Math.max(0, Math.min(255, Math.round(v)));
  return `#${[clamp(r), clamp(g), clamp(b)]
    .map((n) => n.toString(16).padStart(2, '0'))
    .join('')}`;
}

interface ColorStop {
  at: number;
  r: number;
  g: number;
  b: number;
}

/**
 * Continuous multi-stop color ramp driven by Shot Aggression + Resulting Distance:
 * - 0.00 (Defensive / Short Dot): Cool Slate-Teal (#475569 -> #14b8a6)
 * - 0.28 (Controlled Single ~22-35m): Emerald / Turf Green (#16a34a / #22c55e)
 * - 0.50 (Positive 2s & 3s ~45-62m): Chartreuse-Lime -> Warm Gold (#84cc16 -> #eab308)
 * - 0.74 (Aggressive Four ~66-78m): Blaze Orange -> Vermilion (#f97316 -> #dc2626)
 * - 1.00 (Towering Six ~82-105m): Deep Crimson / Deep Red (#b91c1c -> #7f1d1d)
 */
const AGGRESSION_DISTANCE_STOPS: ColorStop[] = [
  { at: 0.0, r: 100, g: 116, b: 139 }, // #64748b cool slate (blocked dot)
  { at: 0.14, r: 20, g: 184, b: 166 }, // #14b8a6 controlled teal-green
  { at: 0.28, r: 22, g: 163, b: 74 },  // #16a34a rich green (singles)
  { at: 0.40, r: 34, g: 197, b: 94 },  // #22c55e vibrant green (hard single / quick 2)
  { at: 0.54, r: 234, g: 179, b: 8 },  // #eab308 golden amber (driven 2s / 3s)
  { at: 0.72, r: 249, g: 115, b: 22 }, // #f97316 fiery orange (boundaries / 4s)
  { at: 0.86, r: 220, g: 38, b: 38 },  // #dc2626 crimson red (flat six / power 4)
  { at: 1.0, r: 136, g: 19, b: 28 },   // #88131c deep red (massive 95m+ six)
];

export function sampleShotSpectrumColor(heat01: number): {
  strokeColor: string;
  glowColor: string;
  tipColor: string;
} {
  const t = Math.max(0, Math.min(1, heat01));
  let lower = AGGRESSION_DISTANCE_STOPS[0];
  let upper = AGGRESSION_DISTANCE_STOPS[AGGRESSION_DISTANCE_STOPS.length - 1];

  for (let i = 0; i < AGGRESSION_DISTANCE_STOPS.length - 1; i += 1) {
    const a = AGGRESSION_DISTANCE_STOPS[i];
    const b = AGGRESSION_DISTANCE_STOPS[i + 1];
    if (t >= a.at && t <= b.at) {
      lower = a;
      upper = b;
      break;
    }
  }

  const localT =
    upper.at > lower.at ? (t - lower.at) / (upper.at - lower.at) : 0;
  const r = lerp(lower.r, upper.r, localT);
  const g = lerp(lower.g, upper.g, localT);
  const b = lerp(lower.b, upper.b, localT);

  const strokeColor = rgbToHex(r, g, b);
  const glowColor = rgbToHex(
    lerp(r, 255, 0.26),
    lerp(g, t > 0.8 ? 90 : 255, 0.2),
    lerp(b, t > 0.8 ? 90 : 255, 0.2)
  );
  const tipColor = rgbToHex(r * 0.76, g * 0.72, b * 0.74);

  return { strokeColor, glowColor, tipColor };
}

function resolveAggressionModifier(setting?: BattingAggressionSetting): number {
  switch (setting) {
    case 'Maximum Risk':
      return 14;
    case 'Aggressive':
      return 7;
    case 'Anchor':
      return -8;
    case 'Balanced':
    default:
      return 0;
  }
}

/**
 * Resolves the 360-degree ground angle (0 = straight behind bowler, 90 = right side, 180 = keeper, 270 = left side)
 * accounting for shot description & batter handedness.
 */
function resolveGroundAngleDeg(ev: BallEvent, hash: number): number {
  const s = (ev.shot || '').toLowerCase();
  const isLHB = ev.batter?.battingHand === 'Left-hand';
  const jitter = ((hash % 23) - 11) * 1.15;

  // Base angles defined for Right-Handed Batter (Off-side = Left 195..345, Leg-side = Right 15..165)
  let baseRHB = 315;

  if (ev.extraType === 'wide') {
    baseRHB = 178 + ((hash % 15) - 7);
  } else if (s.includes('sightscreen') || s.includes('straight') || s.includes('boots')) {
    baseRHB = (hash % 2 === 0 ? 352 : 10) + jitter * 0.6;
  } else if (s.includes('extra-cover') || s.includes('cover')) {
    baseRHB = 296 + jitter;
  } else if (s.includes('backward point') || s.includes('carved') || s.includes('point') || s.includes('cut')) {
    baseRHB = 262 + jitter;
  } else if (s.includes('edge') || s.includes('wicketkeeper') || s.includes('keeper') || s.includes('byes')) {
    baseRHB = 205 + jitter * 0.7;
  } else if (s.includes('fine') || s.includes('thigh pad') || ev.extraType === 'legBye') {
    baseRHB = 142 + jitter;
  } else if (s.includes('behind square') || s.includes('square-leg') || s.includes('pull')) {
    baseRHB = 104 + jitter;
  } else if (s.includes('mid-wicket') || s.includes('worked')) {
    baseRHB = 64 + jitter;
  } else if (s.includes('lofted') || ev.runsScored >= 6) {
    const sixSectors = [348, 16, 58, 98, 308];
    baseRHB = sixSectors[hash % sixSectors.length] + jitter * 0.7;
  } else if (ev.isWicket) {
    if (ev.wicketType === 'Bowled' || ev.wicketType === 'LBW' || ev.wicketType === 'Stumped') {
      baseRHB = 180 + jitter * 0.4;
    } else {
      baseRHB = (hash % 2 === 0 ? 304 : 68) + jitter;
    }
  } else {
    const fallbackSectors = [292, 66, 258, 112, 336, 34];
    baseRHB = fallbackSectors[hash % fallbackSectors.length] + jitter;
  }

  const normalizedRHB = ((baseRHB % 360) + 360) % 360;
  if (!isLHB) return normalizedRHB;
  // Mirror horizontally across vertical pitch axis (0 / 180) for Left-Handed Batter
  return (360 - normalizedRHB) % 360;
}

export function computeShotTrajectoryArcs(
  events: BallEvent[],
  options?: {
    stadium?: Stadium;
    battingAggression?: BattingAggressionSetting;
    startX?: number;
    startY?: number;
    maxRadiusX?: number;
    maxRadiusY?: number;
  }
): ShotTrajectoryArcData[] {
  const startX = options?.startX ?? 50;
  const startY = options?.startY ?? 59; // Striker's popping crease on 0..100 ground
  const maxRadiusX = options?.maxRadiusX ?? 44;
  const maxRadiusY = options?.maxRadiusY ?? 43;
  const boundaryMeters =
    options?.stadium?.boundarySizeMeters
      ? Math.round(
          (options.stadium.boundarySizeMeters.straight +
            options.stadium.boundarySizeMeters.square) /
            2
        )
      : 72;

  const tacticBoost = resolveAggressionModifier(options?.battingAggression);

  return events.map((ev, idx) => {
    const key = `${ev.eventId || idx}-${ev.overNumber}.${ev.ballInOver}-${ev.runsScored}-${ev.speedKmh}`;
    const hash = hashString(key);
    const s = (ev.shot || '').toLowerCase();

    const batterRuns =
      typeof ev.batterRuns === 'number'
        ? ev.batterRuns
        : ev.extraType === 'wide' || ev.extraType === 'bye' || ev.extraType === 'legBye'
        ? 0
        : ev.runsScored;

    const isSix = batterRuns >= 6 || ev.outcome === '6';
    const isFour = !isSix && (batterRuns === 4 || ev.outcome === '4');

    // 1. Estimate physics distance (meters) & launch angle & aggression score
    let distanceMeters = 12;
    let rawAggression = 28;
    let launchAngleDeg = 7;

    if (isSix) {
      distanceMeters = Math.max(boundaryMeters + 6, 80 + (hash % 25)); // 80m .. 104m
      rawAggression = 88 + (hash % 12);
      launchAngleDeg = 28 + (hash % 13);
    } else if (isFour) {
      distanceMeters = boundaryMeters + (hash % 7) - 1; // ~68m .. 77m
      rawAggression = 72 + (hash % 15);
      launchAngleDeg = s.includes('lofted') || s.includes('carved') ? 19 + (hash % 8) : 9 + (hash % 6);
    } else if (batterRuns === 3) {
      distanceMeters = 56 + (hash % 9); // 56m .. 64m
      rawAggression = 58 + (hash % 12);
      launchAngleDeg = 11 + (hash % 6);
    } else if (batterRuns === 2) {
      distanceMeters = 43 + (hash % 12); // 43m .. 54m
      rawAggression = 48 + (hash % 14);
      launchAngleDeg = 9 + (hash % 7);
    } else if (batterRuns === 1 || (ev.runsScored >= 1 && !ev.isWicket)) {
      distanceMeters = 22 + (hash % 15); // 22m .. 36m (Single -> Green!)
      rawAggression = 34 + (hash % 14);
      launchAngleDeg = 6 + (hash % 6);
    } else if (ev.isWicket) {
      if (s.includes('boundary') || s.includes('lofted')) {
        distanceMeters = boundaryMeters - 8 + (hash % 6);
        rawAggression = 79 + (hash % 12);
        launchAngleDeg = 34 + (hash % 9);
      } else if (s.includes('wicketkeeper') || s.includes('edge')) {
        distanceMeters = 14 + (hash % 6);
        rawAggression = 42 + (hash % 15);
        launchAngleDeg = 8;
      } else {
        distanceMeters = 4 + (hash % 5);
        rawAggression = 26 + (hash % 16);
        launchAngleDeg = 4;
      }
    } else {
      // Dot ball
      distanceMeters = 6 + (hash % 12); // 6m .. 17m
      rawAggression = s.includes('jammed') || s.includes('defended') ? 16 + (hash % 10) : 22 + (hash % 12);
      launchAngleDeg = 4 + (hash % 4);
    }

    // Apply shot-intent & user tactic modifiers to aggression
    if (s.includes('punished') || s.includes('launched') || s.includes('pull')) {
      rawAggression += 6;
    } else if (s.includes('softly') || s.includes('defended') || s.includes('left alone')) {
      rawAggression -= 6;
    }

    const aggressionScore = Math.max(8, Math.min(99, Math.round(rawAggression + tacticBoost * 0.55)));

    const aggressionLabel: ShotTrajectoryArcData['aggressionLabel'] =
      aggressionScore >= 85
        ? 'Maximum Assault'
        : aggressionScore >= 68
        ? 'Aggressive'
        : aggressionScore >= 46
        ? 'Positive'
        : aggressionScore >= 28
        ? 'Controlled'
        : 'Defensive';

    // 2. Compute composite Heat Index (0..1) combining Aggression + Resulting Distance
    // Calibrated so Singles (~28m, ~38 agg) sit right around 0.28-0.36 (Rich Emerald Green)
    // and Sixes (~88m+, ~92 agg) sit at 0.88-1.00 (Deep Red!)
    const distanceNorm = Math.max(0, Math.min(1, (distanceMeters - 5) / 92));
    const aggressionNorm = aggressionScore / 100;
    let heatIndex = distanceNorm * 0.62 + aggressionNorm * 0.38;

    // Enforce clear perceptual separation for key cricket outcomes while keeping smooth intra-band gradients
    if (isSix) {
      heatIndex = Math.max(0.86, Math.min(1, 0.86 + ((distanceMeters - 80) / 26) * 0.14));
    } else if (isFour) {
      heatIndex = Math.max(0.68, Math.min(0.83, heatIndex));
    } else if (batterRuns === 2 || batterRuns === 3) {
      heatIndex = Math.max(0.46, Math.min(0.64, heatIndex));
    } else if (batterRuns === 1 || (!ev.isWicket && ev.runsScored === 1)) {
      heatIndex = Math.max(0.24, Math.min(0.39, heatIndex));
    } else if (!ev.isWicket && ev.runsScored === 0) {
      heatIndex = Math.min(0.18, heatIndex);
    }

    const { strokeColor, glowColor, tipColor } = sampleShotSpectrumColor(heatIndex);

    // 3. Project ground coordinates & parabolic 3D elevation curve
    const groundAngleDeg = resolveGroundAngleDeg(ev, hash);
    const rad = ((groundAngleDeg - 90) * Math.PI) / 180;

    // Scale radius relative to stadium center (50, 50) or striker crease (startX, startY)
    const radialFraction = isSix
      ? Math.min(1.06, 0.92 + ((distanceMeters - 80) / 30) * 0.14)
      : isFour
      ? 0.86
      : Math.max(0.10, Math.min(0.76, (distanceMeters / Math.max(62, boundaryMeters)) * 0.82));

    // Anchor outfield boundary ellipse around center (50, 50) for authentic oval geometry
    const rawTargetX = 50 + Math.cos(rad) * maxRadiusX * radialFraction;
    const rawTargetY = 50 + Math.sin(rad) * maxRadiusY * radialFraction;

    // Blend short shots closer to striker's crease (startX, startY)
    const strikerAnchorWeight = Math.max(0, 1 - radialFraction * 1.35);
    const endX = Number(
      Math.max(4, Math.min(96, lerp(rawTargetX, startX + Math.cos(rad) * 9, strikerAnchorWeight))).toFixed(2)
    );
    const endY = Number(
      Math.max(4, Math.min(95, lerp(rawTargetY, startY + Math.sin(rad) * 9, strikerAnchorWeight))).toFixed(2)
    );

    // Parabolic apex lift (negative Y lifts upward in broadcast camera view!)
    const chordLen = Math.hypot(endX - startX, endY - startY);
    const loftFactor = isSix
      ? 0.42 + (launchAngleDeg / 95) * 0.25
      : isFour
      ? 0.16 + (launchAngleDeg / 120) * 0.16
      : batterRuns >= 2
      ? 0.15
      : batterRuns === 1
      ? 0.11
      : 0.06;

    const apexLiftY = Math.max(2.2, chordLen * loftFactor);
    const midX = (startX + endX) / 2;
    const midY = (startY + endY) / 2;
    // Slight lateral drift on sliced/hooked shots for realistic curve
    const lateralCurveX = ((endX - 50) * 0.08);
    const ctrlX = Number((midX + lateralCurveX).toFixed(2));
    const ctrlY = Number(Math.max(1.5, midY - apexLiftY).toFixed(2));

    const exitVelocityKmh = Number(
      Math.min(
        164,
        Math.max(68, (ev.speedKmh || 132) * (0.55 + aggressionNorm * 0.56))
      ).toFixed(1)
    );

    const strokeWidth = isSix ? 2.6 : isFour ? 2.15 : batterRuns >= 1 ? 1.65 : 1.2;

    return {
      id: ev.eventId || `arc-${idx}`,
      overLabel: `${ev.overNumber}.${ev.ballInOver}`,
      batterName: ev.batter?.name || 'Batter',
      bowlerName: ev.bowler?.name || 'Bowler',
      shotText: ev.shot || 'Tactical Stroke',
      runs: ev.runsScored,
      batterRuns,
      isWicket: ev.isWicket,
      wicketType: ev.wicketType,
      isBoundaryFour: isFour,
      isBoundarySix: isSix,
      isLatest: idx === events.length - 1,
      aggressionScore,
      aggressionLabel,
      distanceMeters,
      exitVelocityKmh,
      launchAngleDeg,
      heatIndex: Number(heatIndex.toFixed(3)),
      groundAngleDeg: Number(groundAngleDeg.toFixed(1)),
      startX,
      startY,
      endX,
      endY,
      ctrlX,
      ctrlY,
      strokeColor,
      glowColor,
      tipColor,
      strokeWidth,
    };
  });
}
