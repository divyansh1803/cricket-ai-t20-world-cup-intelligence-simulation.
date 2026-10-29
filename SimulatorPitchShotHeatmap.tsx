import React, { useMemo, useState } from 'react';
import { BallEvent, Player, Stadium, Team } from '../../types/cricket';
import { PlayerCardAvatar, TeamFlag } from '../common/CricketIdentity';
import { Crosshair, Filter, Flame, Layers, RotateCcw, Sparkles, Target } from 'lucide-react';

export type HeatmapInningsScope = 'active' | 'inn1' | 'inn2' | 'all';
export type HeatmapBowlerFilter = 'all' | 'pace' | 'spin';
export type HeatmapMetricMode = 'density' | 'runs' | 'control';

interface SimulatorPitchShotHeatmapProps {
  innings1Events: BallEvent[];
  innings2Events: BallEvent[];
  superOver1Events?: BallEvent[];
  superOver2Events?: BallEvent[];
  innings1BattingTeam: Team;
  innings2BattingTeam: Team;
  liveInningsNumber: 1 | 2 | 3 | 4;
  currentStriker: Player;
  currentNonStriker?: Player;
  currentBowler: Player;
  activeBattingTeam: Team;
  stadium: Stadium;
  surfaceCondition?: string;
  onInspectPlayer?: (player: Player) => void;
}

type LengthBandId = 'bouncer' | 'short_length' | 'good_length' | 'full' | 'yorker';
type LineChannelId = 'wide_off' | 'channel_off' | 'stumps' | 'middle_leg' | 'leg_body';
type FieldSectorId =
  | 'Third Man'
  | 'Point'
  | 'Covers'
  | 'Long Off'
  | 'Long On'
  | 'Mid-Wicket'
  | 'Square Leg'
  | 'Fine Leg';

type ShotCategoryId =
  | 'cover_drive'
  | 'straight_loft'
  | 'pull_hook'
  | 'flick_whip'
  | 'cut_carve'
  | 'leg_glance'
  | 'sweep_ramp'
  | 'defense_leave';

interface LengthBandMeta {
  id: LengthBandId;
  label: string;
  shortLabel: string;
  metersLabel: string;
  rowIndex: number; // 0 = top (Short/Bouncer near bowler), 4 = bottom (Yorker near striker)
  yMinPct: number;
  yMaxPct: number;
}

interface LineChannelMeta {
  id: LineChannelId;
  label: string;
  shortLabel: string;
  colIndex: number; // normalized 0..4 from Off-Side -> Leg-Side
}

interface ShotCategoryMeta {
  id: ShotCategoryId;
  label: string;
  shortLabel: string;
  typicalZone: string;
  accentHex: string;
}

interface MappedPitchShotBall {
  id: string;
  seq: number;
  overLabel: string;
  batterId: string;
  batterName: string;
  batterHand: 'Right-hand' | 'Left-hand';
  bowlerName: string;
  bowlerType: 'pace' | 'spin';
  speedKmh: number;
  deliveryType: string;
  rawShot: string;
  shotCategory: ShotCategoryId;
  fieldSector: FieldSectorId;
  fieldSide: 'off' | 'straight' | 'leg';
  lengthBand: LengthBandId;
  lineChannel: LineChannelId;
  rowIndex: number;
  colIndex: number; // normalized 0..4 (0 = Wide Off, 4 = Leg/Body)
  svgColIndex: number; // physical SVG column 0..4 (flips for LHB)
  pitchX: number; // 0..100 physical pitch width (50 = middle stump)
  pitchY: number; // 0..100 physical pitch length (0 = bowler crease, 100 = striker crease)
  batterRuns: number;
  totalRuns: number;
  isBoundaryFour: boolean;
  isBoundarySix: boolean;
  isDot: boolean;
  isWicket: boolean;
  wicketType?: string;
  extraType?: string | null;
  outcomeBadge: string;
  isLatest: boolean;
}

const LENGTH_BANDS: LengthBandMeta[] = [
  {
    id: 'bouncer',
    label: 'Short / Bouncer',
    shortLabel: 'SHORT',
    metersLabel: '9.8m+',
    rowIndex: 0,
    yMinPct: 8,
    yMaxPct: 26,
  },
  {
    id: 'short_length',
    label: 'Back of Length',
    shortLabel: 'BACK LEN',
    metersLabel: '7.5–9.8m',
    rowIndex: 1,
    yMinPct: 26,
    yMaxPct: 45,
  },
  {
    id: 'good_length',
    label: 'Good Length',
    shortLabel: 'GOOD LEN',
    metersLabel: '4.8–7.5m',
    rowIndex: 2,
    yMinPct: 45,
    yMaxPct: 66,
  },
  {
    id: 'full',
    label: 'Full / Driving Slot',
    shortLabel: 'FULL',
    metersLabel: '2.4–4.8m',
    rowIndex: 3,
    yMinPct: 66,
    yMaxPct: 84,
  },
  {
    id: 'yorker',
    label: 'Yorker / Blockhole',
    shortLabel: 'YORKER',
    metersLabel: '0–2.4m',
    rowIndex: 4,
    yMinPct: 84,
    yMaxPct: 98,
  },
];

const LINE_CHANNELS: LineChannelMeta[] = [
  { id: 'wide_off', label: 'Wide Outside Off', shortLabel: 'Wide Off', colIndex: 0 },
  { id: 'channel_off', label: '4th–5th Stump Channel', shortLabel: '4th Stump', colIndex: 1 },
  { id: 'stumps', label: 'Stump Corridor', shortLabel: 'Stumps', colIndex: 2 },
  { id: 'middle_leg', label: 'Middle & Leg', shortLabel: 'Mid/Leg', colIndex: 3 },
  { id: 'leg_body', label: 'Leg Stump / Ribcage', shortLabel: 'Leg/Body', colIndex: 4 },
];

const SHOT_CATEGORIES: Record<ShotCategoryId, ShotCategoryMeta> = {
  cover_drive: {
    id: 'cover_drive',
    label: 'Cover & Extra-Cover Drive',
    shortLabel: 'Cover Drive',
    typicalZone: 'Covers',
    accentHex: '#10b981',
  },
  straight_loft: {
    id: 'straight_loft',
    label: 'Straight & Lofted Drive',
    shortLabel: 'Lofted / Straight',
    typicalZone: 'Long Off · Long On',
    accentHex: '#f59e0b',
  },
  pull_hook: {
    id: 'pull_hook',
    label: 'Pull & Swivel Hook',
    shortLabel: 'Pull / Hook',
    typicalZone: 'Deep Mid-Wicket · Square',
    accentHex: '#fb7185',
  },
  flick_whip: {
    id: 'flick_whip',
    label: 'Wristy Flick & On-Side Work',
    shortLabel: 'Flick / Mid-Wicket',
    typicalZone: 'Mid-Wicket',
    accentHex: '#38bdf8',
  },
  cut_carve: {
    id: 'cut_carve',
    label: 'Square Cut & Late Carve',
    shortLabel: 'Cut / Point Carve',
    typicalZone: 'Point · Third Man',
    accentHex: '#2dd4bf',
  },
  leg_glance: {
    id: 'leg_glance',
    label: 'Clip & Fine Leg Glance',
    shortLabel: 'Clip / Fine Glance',
    typicalZone: 'Square · Fine Leg',
    accentHex: '#818cf8',
  },
  sweep_ramp: {
    id: 'sweep_ramp',
    label: 'Sweep, Slog-Sweep & Ramp',
    shortLabel: 'Sweep / Ramp',
    typicalZone: 'Behind Square',
    accentHex: '#c084fc',
  },
  defense_leave: {
    id: 'defense_leave',
    label: 'Solid Defense, Block & Leave',
    shortLabel: 'Defense / Block',
    typicalZone: 'Infield Ring',
    accentHex: '#64748b',
  },
};

const FIELD_SECTORS_ORDER: Array<{
  id: FieldSectorId;
  short: string;
  angleDegRHB: number; // 0 = top (behind keeper), clockwise for RHB (right side = Leg, left side = Off when viewed from bowler, or standard wagon: top=straight? Standard cricket Wagon Wheel has Straight at Bottom or Top — we clearly label Straight Down Ground at Bottom & Keeper at Top!)
  side: 'off' | 'straight' | 'leg';
}> = [
  { id: 'Third Man', short: '3rd Man', angleDegRHB: 315, side: 'off' },
  { id: 'Point', short: 'Point', angleDegRHB: 270, side: 'off' },
  { id: 'Covers', short: 'Covers', angleDegRHB: 225, side: 'off' },
  { id: 'Long Off', short: 'Long Off', angleDegRHB: 192, side: 'straight' },
  { id: 'Long On', short: 'Long On', angleDegRHB: 168, side: 'straight' },
  { id: 'Mid-Wicket', short: 'Mid-Wkt', angleDegRHB: 135, side: 'leg' },
  { id: 'Square Leg', short: 'Sq Leg', angleDegRHB: 90, side: 'leg' },
  { id: 'Fine Leg', short: 'Fine Leg', angleDegRHB: 45, side: 'leg' },
];

function deterministicHash(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i += 1) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

function isSpinnerEvent(ev: BallEvent): boolean {
  const role = ev.bowler?.role || '';
  const style = (ev.bowler?.bowlingStyle || '').toLowerCase();
  return (
    role === 'Spin Bowler' ||
    style.includes('spin') ||
    style.includes('slow') ||
    style.includes('wrist') ||
    style.includes('orth') ||
    (ev.speedKmh > 0 && ev.speedKmh < 108)
  );
}

function classifyShotAndSector(
  ev: BallEvent,
  spin: boolean,
  seed: number
): {
  shotCategory: ShotCategoryId;
  fieldSector: FieldSectorId;
  fieldSide: 'off' | 'straight' | 'leg';
  preferredLineCol: number;
} {
  const s = (ev.shot || '').toLowerCase();
  const batterRuns =
    typeof ev.batterRuns === 'number'
      ? ev.batterRuns
      : ev.extraType === 'wide' || ev.extraType === 'bye' || ev.extraType === 'legBye'
      ? 0
      : ev.runsScored;

  if (ev.extraType === 'wide') {
    return {
      shotCategory: 'defense_leave',
      fieldSector: 'Third Man',
      fieldSide: 'off',
      preferredLineCol: 0,
    };
  }

  if (s.includes('pull') || s.includes('hook') || (ev.length === 'Bouncer' && batterRuns >= 4)) {
    return {
      shotCategory: 'pull_hook',
      fieldSector: seed % 2 === 0 ? 'Mid-Wicket' : 'Square Leg',
      fieldSide: 'leg',
      preferredLineCol: seed % 3 === 0 ? 4 : 3,
    };
  }

  if (s.includes('sweep') || s.includes('ramp') || s.includes('scoop') || s.includes('stumped')) {
    return {
      shotCategory: 'sweep_ramp',
      fieldSector: seed % 2 === 0 ? 'Fine Leg' : 'Square Leg',
      fieldSide: 'leg',
      preferredLineCol: seed % 2 === 0 ? 2 : 3,
    };
  }

  if (
    s.includes('carved') ||
    s.includes('backward point') ||
    s.includes('cut') ||
    s.includes('slash') ||
    (ev.length === 'Yorker' && batterRuns === 4)
  ) {
    return {
      shotCategory: 'cut_carve',
      fieldSector: seed % 3 === 0 ? 'Third Man' : 'Point',
      fieldSide: 'off',
      preferredLineCol: seed % 2 === 0 ? 0 : 1,
    };
  }

  if (s.includes('cover') || s.includes('extra-cover')) {
    return {
      shotCategory: 'cover_drive',
      fieldSector: 'Covers',
      fieldSide: 'off',
      preferredLineCol: 1,
    };
  }

  if (
    s.includes('sightscreen') ||
    s.includes('lofted') ||
    s.includes('straight') ||
    (batterRuns === 6 && ev.length !== 'Bouncer')
  ) {
    const isLongOn = seed % 2 === 0;
    return {
      shotCategory: 'straight_loft',
      fieldSector: isLongOn ? 'Long On' : 'Long Off',
      fieldSide: 'straight',
      preferredLineCol: isLongOn ? 2 : 1,
    };
  }

  if (s.includes('behind square') || s.includes('fine') || s.includes('thigh pad') || ev.extraType === 'legBye') {
    return {
      shotCategory: 'leg_glance',
      fieldSector: seed % 2 === 0 ? 'Fine Leg' : 'Square Leg',
      fieldSide: 'leg',
      preferredLineCol: 4,
    };
  }

  if (s.includes('mid-wicket') || s.includes('worked') || s.includes('flick') || batterRuns === 1) {
    if (spin && seed % 5 === 0 && batterRuns >= 2) {
      return {
        shotCategory: 'sweep_ramp',
        fieldSector: 'Square Leg',
        fieldSide: 'leg',
        preferredLineCol: 3,
      };
    }
    return {
      shotCategory: 'flick_whip',
      fieldSector: seed % 3 === 0 ? 'Long On' : 'Mid-Wicket',
      fieldSide: 'leg',
      preferredLineCol: seed % 2 === 0 ? 3 : 2,
    };
  }

  if (ev.isWicket) {
    if (ev.wicketType === 'Bowled' || ev.wicketType === 'LBW') {
      return {
        shotCategory: 'defense_leave',
        fieldSector: 'Long On',
        fieldSide: 'straight',
        preferredLineCol: 2,
      };
    }
    if (s.includes('edge') || s.includes('wicketkeeper')) {
      return {
        shotCategory: 'defense_leave',
        fieldSector: 'Third Man',
        fieldSide: 'off',
        preferredLineCol: 1,
      };
    }
  }

  return {
    shotCategory: 'defense_leave',
    fieldSector: seed % 2 === 0 ? 'Point' : 'Covers',
    fieldSide: 'off',
    preferredLineCol: seed % 3 === 0 ? 2 : 1,
  };
}

function mapEventsToPitchShotBalls(events: BallEvent[]): MappedPitchShotBall[] {
  return events.map((ev, idx) => {
    const key = `${ev.eventId || idx}-${ev.inningsNumber || 1}-${ev.overNumber}.${ev.ballInOver}-${ev.speedKmh}`;
    const hash = deterministicHash(key);
    const spin = isSpinnerEvent(ev);
    const batterHand: 'Right-hand' | 'Left-hand' = ev.batter?.battingHand || 'Right-hand';

    // Determine Length Band (rowIndex 0 = Bouncer, 4 = Yorker)
    const rawDel = (ev.deliveryType || '').toLowerCase();
    let lengthBand: LengthBandId = 'good_length';
    if (ev.length === 'Yorker' || rawDel.includes('yorker') || rawDel.includes('full toss')) {
      lengthBand = 'yorker';
    } else if (ev.length === 'Full' || rawDel.includes('full') || rawDel.includes('out-swinger')) {
      lengthBand = 'full';
    } else if (ev.length === 'Bouncer' || rawDel.includes('bouncer')) {
      lengthBand = 'bouncer';
    } else if (ev.length === 'Short of Length' || (ev.length === 'Slower Ball' && hash % 3 === 0)) {
      lengthBand = 'short_length';
    } else {
      lengthBand = 'good_length';
    }

    const bandMeta = LENGTH_BANDS.find((b) => b.id === lengthBand) || LENGTH_BANDS[2];
    const ySpan = Math.max(4, bandMeta.yMaxPct - bandMeta.yMinPct - 3);
    const pitchY = Number((bandMeta.yMinPct + 1.5 + ((hash % 97) / 97) * ySpan).toFixed(1));

    const { shotCategory, fieldSector, fieldSide, preferredLineCol } = classifyShotAndSector(
      ev,
      spin,
      hash
    );

    // Normalized line col (0 = Wide Off .. 4 = Leg/Body) with slight realistic dispersion
    let colIndex = preferredLineCol;
    if (ev.extraType !== 'wide' && !ev.isWicket && hash % 7 === 0) {
      colIndex = Math.max(0, Math.min(4, colIndex + (hash % 2 === 0 ? 1 : -1)));
    }
    const lineMeta = LINE_CHANNELS[colIndex] || LINE_CHANNELS[2];

    // Physical SVG column flips for Left-Hand Batters (viewer looking from Bowler's End toward Striker):
    // For RHB: Off-side is LEFT of screen (col 0..1), Stumps is CENTER (col 2), Leg-side is RIGHT of screen (col 3..4)
    // For LHB: Leg-side is LEFT of screen, Off-side is RIGHT of screen
    const svgColIndex = batterHand === 'Left-hand' ? 4 - colIndex : colIndex;
    const colWidthPct = 15.2; // 5 cols spanning x = 12%..88% (middle stump at 50%)
    const baseColStart = 12 + svgColIndex * colWidthPct;
    const jitterX = 2.1 + (((hash >> 4) % 89) / 89) * (colWidthPct - 4.2);
    const pitchX = Number(Math.max(9, Math.min(91, baseColStart + jitterX)).toFixed(1));

    const batterRuns =
      typeof ev.batterRuns === 'number'
        ? ev.batterRuns
        : ev.extraType === 'wide' || ev.extraType === 'bye' || ev.extraType === 'legBye'
        ? 0
        : ev.runsScored;

    const outcomeBadge = ev.isWicket
      ? 'W'
      : ev.extraType === 'wide'
      ? 'WD'
      : ev.extraType === 'noBall'
      ? batterRuns > 0
        ? `NB+${batterRuns}`
        : 'NB'
      : String(batterRuns);

    return {
      id: ev.eventId || `sim-hm-${idx}`,
      seq: idx + 1,
      overLabel: `${ev.overNumber}.${ev.ballInOver}`,
      batterId: ev.batter?.id || 'batter',
      batterName: ev.batter?.name || 'Batter',
      batterHand,
      bowlerName: ev.bowler?.name || 'Bowler',
      bowlerType: spin ? 'spin' : 'pace',
      speedKmh: Number((ev.speedKmh || (spin ? 89 : 141)).toFixed(1)),
      deliveryType: ev.deliveryType || 'Standard Delivery',
      rawShot: ev.shot || 'Tactical Stroke',
      shotCategory,
      fieldSector,
      fieldSide,
      lengthBand,
      lineChannel: lineMeta.id,
      rowIndex: bandMeta.rowIndex,
      colIndex,
      svgColIndex,
      pitchX,
      pitchY,
      batterRuns,
      totalRuns: ev.runsScored,
      isBoundaryFour: batterRuns === 4,
      isBoundarySix: batterRuns >= 6,
      isDot: !ev.isWicket && ev.runsScored === 0,
      isWicket: ev.isWicket,
      wicketType: ev.wicketType,
      extraType: ev.extraType,
      outcomeBadge,
      isLatest: idx === events.length - 1,
    };
  });
}

/**
 * Generates a deterministic pre-match simulated baseline from the batter's profile & venue DNA
 * when 0 live balls have been bowled yet, clearly labeled as a Pre-Match Tactical Baseline.
 */
function buildProjectedBaselineBalls(
  batter: Player,
  bowler: Player,
  stadium: Stadium
): MappedPitchShotBall[] {
  const sampleSize = 24;
  const sr = batter?.stats?.strikeRate || 140;
  const boundaryPct = batter?.stats?.boundaryPercent || 18;
  const dotPct = batter?.stats?.dotBallPercent || 31;
  const hand: 'Right-hand' | 'Left-hand' = batter?.battingHand || 'Right-hand';
  const spinHeavy = (stadium?.spinWicketPercent || 42) >= 48;

  const synthetic: MappedPitchShotBall[] = [];
  const shotPool: Array<{
    cat: ShotCategoryId;
    sector: FieldSectorId;
    side: 'off' | 'straight' | 'leg';
    len: LengthBandId;
    col: number;
    desc: string;
  }> = [
    {
      cat: 'cover_drive',
      sector: 'Covers',
      side: 'off',
      len: 'full',
      col: 1,
      desc: 'Crisp cover drive through the extra-cover gap',
    },
    {
      cat: 'straight_loft',
      sector: 'Long Off',
      side: 'straight',
      len: 'full',
      col: 2,
      desc: 'Lofted extension straight down the ground',
    },
    {
      cat: 'pull_hook',
      sector: 'Mid-Wicket',
      side: 'leg',
      len: 'bouncer',
      col: 3,
      desc: 'Swivel pull hammered toward deep mid-wicket',
    },
    {
      cat: 'flick_whip',
      sector: 'Mid-Wicket',
      side: 'leg',
      len: 'good_length',
      col: 3,
      desc: 'Worked off the pads into the mid-wicket pocket',
    },
    {
      cat: 'cut_carve',
      sector: 'Point',
      side: 'off',
      len: 'short_length',
      col: 0,
      desc: 'Late square cut carved past backward point',
    },
    {
      cat: 'leg_glance',
      sector: 'Fine Leg',
      side: 'leg',
      len: 'good_length',
      col: 4,
      desc: 'Clipped neatly off the hip behind square',
    },
    {
      cat: 'sweep_ramp',
      sector: 'Square Leg',
      side: 'leg',
      len: 'good_length',
      col: 2,
      desc: 'Proactive sweep / deft angle behind the keeper',
    },
    {
      cat: 'defense_leave',
      sector: 'Point',
      side: 'off',
      len: 'yorker',
      col: 2,
      desc: 'Solidly jammed out from the blockhole',
    },
  ];

  for (let i = 0; i < sampleSize; i += 1) {
    const h = deterministicHash(`${batter.id}-${stadium.id}-proj-${i}`);
    const template = shotPool[(h + i) % shotPool.length];
    const isSpin = spinHeavy ? i % 2 === 0 : i % 3 === 1;
    const bandMeta = LENGTH_BANDS.find((b) => b.id === template.len) || LENGTH_BANDS[2];

    const roll = (h % 100) + (sr - 135) * 0.18;
    let runs = 0;
    let isWicket = false;
    if (i === 19 && h % 2 === 0) {
      isWicket = true;
      runs = 0;
    } else if (roll > 100 - boundaryPct * 0.42 && template.cat !== 'defense_leave') {
      runs = 6;
    } else if (roll > 100 - boundaryPct * 1.15 && template.cat !== 'defense_leave') {
      runs = 4;
    } else if (roll < dotPct || template.cat === 'defense_leave') {
      runs = 0;
    } else if (h % 5 === 0) {
      runs = 2;
    } else {
      runs = 1;
    }

    const colIndex = template.col;
    const svgColIndex = hand === 'Left-hand' ? 4 - colIndex : colIndex;
    const colWidthPct = 15.2;
    const pitchX = Number(
      (12 + svgColIndex * colWidthPct + 2.5 + ((h % 71) / 71) * (colWidthPct - 5)).toFixed(1)
    );
    const pitchY = Number(
      (
        bandMeta.yMinPct +
        2 +
        (((h >> 3) % 83) / 83) * Math.max(4, bandMeta.yMaxPct - bandMeta.yMinPct - 4)
      ).toFixed(1)
    );

    synthetic.push({
      id: `proj-${batter.id}-${i}`,
      seq: i + 1,
      overLabel: `${Math.floor(i / 6)}.${(i % 6) + 1}`,
      batterId: batter.id,
      batterName: batter.name,
      batterHand: hand,
      bowlerName: bowler?.name || 'Opposition Attack',
      bowlerType: isSpin ? 'spin' : 'pace',
      speedKmh: isSpin ? 87 + (h % 9) : 138 + (h % 11),
      deliveryType: isSpin ? 'Projected Spin Matchup' : 'Projected Seam Matchup',
      rawShot: template.desc,
      shotCategory: runs === 0 && !isWicket ? 'defense_leave' : template.cat,
      fieldSector: template.sector,
      fieldSide: template.side,
      lengthBand: bandMeta.id,
      lineChannel: LINE_CHANNELS[colIndex].id,
      rowIndex: bandMeta.rowIndex,
      colIndex,
      svgColIndex,
      pitchX,
      pitchY,
      batterRuns: runs,
      totalRuns: runs,
      isBoundaryFour: runs === 4,
      isBoundarySix: runs === 6,
      isDot: !isWicket && runs === 0,
      isWicket,
      wicketType: isWicket ? 'Caught' : undefined,
      extraType: null,
      outcomeBadge: isWicket ? 'W' : String(runs),
      isLatest: i === sampleSize - 1,
    });
  }

  return synthetic;
}

function getHeatColor(intensity01: number, mode: HeatmapMetricMode): {
  fill: string;
  border: string;
  text: string;
} {
  const t = Math.max(0, Math.min(1, intensity01));
  if (t <= 0.01) {
    return {
      fill: 'rgba(15, 23, 42, 0.28)',
      border: 'rgba(51, 65, 85, 0.32)',
      text: '#64748b',
    };
  }

  if (mode === 'runs') {
    if (t >= 0.75) {
      return {
        fill: 'rgba(245, 158, 11, 0.56)',
        border: 'rgba(251, 191, 36, 0.85)',
        text: '#fef3c7',
      };
    }
    if (t >= 0.45) {
      return {
        fill: 'rgba(16, 185, 129, 0.48)',
        border: 'rgba(52, 211, 153, 0.78)',
        text: '#d1fae5',
      };
    }
    return {
      fill: 'rgba(14, 165, 233, 0.30)',
      border: 'rgba(56, 189, 248, 0.55)',
      text: '#e0f2fe',
    };
  }

  if (mode === 'control') {
    if (t >= 0.7) {
      return {
        fill: 'rgba(244, 63, 94, 0.54)',
        border: 'rgba(251, 113, 133, 0.85)',
        text: '#ffe4e6',
      };
    }
    if (t >= 0.4) {
      return {
        fill: 'rgba(249, 115, 22, 0.42)',
        border: 'rgba(251, 146, 60, 0.72)',
        text: '#ffedd5',
      };
    }
    return {
      fill: 'rgba(20, 184, 166, 0.28)',
      border: 'rgba(45, 212, 191, 0.52)',
      text: '#ccfbf1',
    };
  }

  // Default: 'density' thermal spectrum
  if (t >= 0.75) {
    return {
      fill: 'rgba(244, 63, 94, 0.56)',
      border: 'rgba(251, 113, 133, 0.88)',
      text: '#ffe4e6',
    };
  }
  if (t >= 0.5) {
    return {
      fill: 'rgba(245, 158, 11, 0.48)',
      border: 'rgba(251, 191, 36, 0.80)',
      text: '#fef3c7',
    };
  }
  if (t >= 0.25) {
    return {
      fill: 'rgba(16, 185, 129, 0.40)',
      border: 'rgba(52, 211, 153, 0.70)',
      text: '#d1fae5',
    };
  }
  return {
    fill: 'rgba(6, 182, 212, 0.28)',
    border: 'rgba(34, 211, 238, 0.55)',
    text: '#cffafe',
  };
}

export const SimulatorPitchShotHeatmap: React.FC<SimulatorPitchShotHeatmapProps> = ({
  innings1Events,
  innings2Events,
  superOver1Events = [],
  superOver2Events = [],
  innings1BattingTeam,
  innings2BattingTeam,
  liveInningsNumber,
  currentStriker,
  currentNonStriker,
  currentBowler,
  activeBattingTeam,
  stadium,
  surfaceCondition = 'standard',
  onInspectPlayer,
}) => {
  const [inningsScope, setInningsScope] = useState<HeatmapInningsScope>('active');
  const [selectedBatterId, setSelectedBatterId] = useState<string>('ALL_BATTERS');
  const [bowlerFilter, setBowlerFilter] = useState<HeatmapBowlerFilter>('all');
  const [metricMode, setMetricMode] = useState<HeatmapMetricMode>('density');
  const [dataSourceMode, setDataSourceMode] = useState<'auto' | 'projected'>('auto');
  const [showBallImpacts, setShowBallImpacts] = useState<boolean>(true);
  const [selectedCell, setSelectedCell] = useState<{ row: number; svgCol: number } | null>(null);
  const [selectedShotCategory, setSelectedShotCategory] = useState<ShotCategoryId | null>(null);
  const [hoveredBall, setHoveredBall] = useState<MappedPitchShotBall | null>(null);

  // Resolve scoped raw BallEvents
  const scopedRawEvents = useMemo(() => {
    if (inningsScope === 'inn1') return innings1Events;
    if (inningsScope === 'inn2') return innings2Events;
    if (inningsScope === 'all') {
      return [
        ...innings1Events,
        ...innings2Events,
        ...superOver1Events,
        ...superOver2Events,
      ];
    }
    if (liveInningsNumber === 4 && superOver2Events.length > 0) return superOver2Events;
    if (liveInningsNumber === 3 && superOver1Events.length > 0) return superOver1Events;
    if (liveInningsNumber === 2) return innings2Events;
    return innings1Events;
  }, [
    inningsScope,
    innings1Events,
    innings2Events,
    superOver1Events,
    superOver2Events,
    liveInningsNumber,
  ]);

  const scopedTeam = useMemo(() => {
    if (inningsScope === 'inn1') return innings1BattingTeam;
    if (inningsScope === 'inn2') return innings2BattingTeam;
    return activeBattingTeam;
  }, [inningsScope, innings1BattingTeam, innings2BattingTeam, activeBattingTeam]);

  // Extract batters who have faced balls in this scope + current striker/non-striker
  const availableBatters = useMemo(() => {
    const map = new Map<
      string,
      { player: Player; runs: number; balls: number }
    >();

    scopedRawEvents.forEach((ev) => {
      if (!ev.batter) return;
      const prev = map.get(ev.batter.id) || {
        player: ev.batter,
        runs: 0,
        balls: 0,
      };
      const bRuns =
        typeof ev.batterRuns === 'number'
          ? ev.batterRuns
          : ev.extraType === 'wide' || ev.extraType === 'bye' || ev.extraType === 'legBye'
          ? 0
          : ev.runsScored;
      prev.runs += bRuns;
      if (ev.extraType !== 'wide') {
        prev.balls += 1;
      }
      map.set(ev.batter.id, prev);
    });

    if (currentStriker && !map.has(currentStriker.id) && inningsScope === 'active') {
      map.set(currentStriker.id, { player: currentStriker, runs: 0, balls: 0 });
    }
    if (currentNonStriker && !map.has(currentNonStriker.id) && inningsScope === 'active') {
      map.set(currentNonStriker.id, { player: currentNonStriker, runs: 0, balls: 0 });
    }

    return Array.from(map.values()).sort((a, b) => b.balls - a.balls || b.runs - a.runs);
  }, [scopedRawEvents, currentStriker, currentNonStriker, inningsScope]);

  const effectiveBatterId = useMemo(() => {
    if (selectedBatterId === 'ALL_BATTERS') return 'ALL_BATTERS';
    if (selectedBatterId === 'CURRENT_STRIKER') return currentStriker?.id || 'ALL_BATTERS';
    if (availableBatters.some((b) => b.player.id === selectedBatterId)) return selectedBatterId;
    return 'ALL_BATTERS';
  }, [selectedBatterId, currentStriker, availableBatters]);

  const focusedPlayer: Player = useMemo(() => {
    if (effectiveBatterId !== 'ALL_BATTERS') {
      const found = availableBatters.find((b) => b.player.id === effectiveBatterId);
      if (found) return found.player;
    }
    return currentStriker;
  }, [effectiveBatterId, availableBatters, currentStriker]);

  // Filter live events by batter & bowler type
  const liveMappedBalls = useMemo(() => {
    const filteredEvents = scopedRawEvents.filter((ev) => {
      if (effectiveBatterId !== 'ALL_BATTERS' && ev.batter?.id !== effectiveBatterId) {
        return false;
      }
      if (bowlerFilter !== 'all') {
        const spin = isSpinnerEvent(ev);
        if (bowlerFilter === 'spin' && !spin) return false;
        if (bowlerFilter === 'pace' && spin) return false;
      }
      return true;
    });
    return mapEventsToPitchShotBalls(filteredEvents);
  }, [scopedRawEvents, effectiveBatterId, bowlerFilter]);

  const isUsingProjectedBaseline =
    dataSourceMode === 'projected' || liveMappedBalls.length === 0;

  const activeBalls: MappedPitchShotBall[] = useMemo(() => {
    if (!isUsingProjectedBaseline) {
      return liveMappedBalls;
    }
    const base = buildProjectedBaselineBalls(focusedPlayer, currentBowler, stadium);
    if (bowlerFilter === 'all') return base;
    return base.filter((b) => b.bowlerType === bowlerFilter);
  }, [isUsingProjectedBaseline, liveMappedBalls, focusedPlayer, currentBowler, stadium, bowlerFilter]);

  // Orientation stance label for the pitch columns
  const referenceHand: 'Right-hand' | 'Left-hand' =
    effectiveBatterId !== 'ALL_BATTERS'
      ? focusedPlayer?.battingHand || 'Right-hand'
      : currentStriker?.battingHand || 'Right-hand';

  // Build 5x5 Pitch Heatmap Grid (row 0..4 = Short..Yorker, svgCol 0..4 = Left..Right on SVG)
  const pitchGrid = useMemo(() => {
    const cells: Array<{
      row: number;
      svgCol: number;
      lengthMeta: LengthBandMeta;
      lineLabel: string;
      balls: MappedPitchShotBall[];
      count: number;
      densityPct: number;
      runs: number;
      strikeRate: number;
      boundaries: number;
      dots: number;
      wickets: number;
      controlPct: number;
      intensity01: number;
    }> = [];

    const totalCount = Math.max(1, activeBalls.length);
    let maxCount = 1;
    let maxRuns = 1;

    const bucketMap = new Map<string, MappedPitchShotBall[]>();
    activeBalls.forEach((b) => {
      if (selectedShotCategory && b.shotCategory !== selectedShotCategory) return;
      const k = `${b.rowIndex}-${b.svgColIndex}`;
      const list = bucketMap.get(k) || [];
      list.push(b);
      bucketMap.set(k, list);
    });

    bucketMap.forEach((list) => {
      if (list.length > maxCount) maxCount = list.length;
      const cellRuns = list.reduce((s, d) => s + d.batterRuns, 0);
      if (cellRuns > maxRuns) maxRuns = cellRuns;
    });

    for (let row = 0; row < 5; row += 1) {
      for (let svgCol = 0; svgCol < 5; svgCol += 1) {
        const list = bucketMap.get(`${row}-${svgCol}`) || [];
        const count = list.length;
        const runs = list.reduce((s, d) => s + d.batterRuns, 0);
        const boundaries = list.filter((d) => d.isBoundaryFour || d.isBoundarySix).length;
        const dots = list.filter((d) => d.isDot).length;
        const wickets = list.filter((d) => d.isWicket).length;
        const legalFaced = Math.max(1, list.filter((d) => d.extraType !== 'wide').length);
        const strikeRate = count > 0 ? (runs / legalFaced) * 100 : 0;
        const densityPct = activeBalls.length > 0 ? (count / totalCount) * 100 : 0;
        const controlPct = count > 0 ? ((dots + wickets * 1.5) / count) * 100 : 0;

        let intensity01 = 0;
        if (count > 0) {
          if (metricMode === 'density') {
            intensity01 = count / maxCount;
          } else if (metricMode === 'runs') {
            intensity01 = Math.min(1, (runs / Math.max(4, maxRuns)) * 0.7 + (strikeRate / 240) * 0.3);
          } else {
            intensity01 = Math.min(1, (dots + wickets * 2) / Math.max(1, count));
          }
        }

        const normCol = referenceHand === 'Left-hand' ? 4 - svgCol : svgCol;
        const lineMeta = LINE_CHANNELS[normCol] || LINE_CHANNELS[2];

        cells.push({
          row,
          svgCol,
          lengthMeta: LENGTH_BANDS[row],
          lineLabel: lineMeta.label,
          balls: list,
          count,
          densityPct,
          runs,
          strikeRate,
          boundaries,
          dots,
          wickets,
          controlPct,
          intensity01,
        });
      }
    }

    return cells;
  }, [activeBalls, selectedShotCategory, metricMode, referenceHand]);

  // Length band horizontal summary (5 bands)
  const lengthSummary = useMemo(() => {
    const total = Math.max(1, activeBalls.length);
    return LENGTH_BANDS.map((band) => {
      const bandBalls = activeBalls.filter(
        (b) =>
          b.rowIndex === band.rowIndex &&
          (!selectedShotCategory || b.shotCategory === selectedShotCategory)
      );
      const runs = bandBalls.reduce((s, b) => s + b.batterRuns, 0);
      const faced = Math.max(1, bandBalls.filter((b) => b.extraType !== 'wide').length);
      return {
        band,
        count: bandBalls.length,
        pct: activeBalls.length > 0 ? Math.round((bandBalls.length / total) * 100) : 0,
        runs,
        sr: bandBalls.length > 0 ? Math.round((runs / faced) * 100) : 0,
      };
    });
  }, [activeBalls, selectedShotCategory]);

  // Balls filtered by clicked pitch cell (for right-side Shot Run Distribution!)
  const zoneFilteredBalls = useMemo(() => {
    if (!selectedCell) return activeBalls;
    return activeBalls.filter(
      (b) => b.rowIndex === selectedCell.row && b.svgColIndex === selectedCell.svgCol
    );
  }, [activeBalls, selectedCell]);

  // Aggregate Batter Shot Run Distribution
  const shotDistribution = useMemo(() => {
    const totalZoneRuns = zoneFilteredBalls.reduce((s, b) => s + b.batterRuns, 0);
    const maxShotRunsRef = { val: 1 };

    const groups = (Object.keys(SHOT_CATEGORIES) as ShotCategoryId[]).map((catId) => {
      const meta = SHOT_CATEGORIES[catId];
      const list = zoneFilteredBalls.filter((b) => b.shotCategory === catId);
      const ballsCount = list.filter((b) => b.extraType !== 'wide').length;
      const runsFromSixes = list.filter((b) => b.isBoundarySix).reduce((s, b) => s + b.batterRuns, 0);
      const runsFromFours = list.filter((b) => b.isBoundaryFour).reduce((s, b) => s + b.batterRuns, 0);
      const runsFromRunning = list
        .filter((b) => !b.isBoundaryFour && !b.isBoundarySix)
        .reduce((s, b) => s + b.batterRuns, 0);
      const totalRuns = runsFromSixes + runsFromFours + runsFromRunning;
      if (totalRuns > maxShotRunsRef.val) maxShotRunsRef.val = totalRuns;

      const dots = list.filter((b) => b.isDot).length;
      const wickets = list.filter((b) => b.isWicket).length;
      const strikeRate = ballsCount > 0 ? (totalRuns / ballsCount) * 100 : 0;
      const runSharePct = totalZoneRuns > 0 ? (totalRuns / totalZoneRuns) * 100 : 0;

      // Dominant length where this shot was played
      const lenCounts = new Map<LengthBandId, number>();
      list.forEach((b) => lenCounts.set(b.lengthBand, (lenCounts.get(b.lengthBand) || 0) + 1));
      let topLen: LengthBandId = 'good_length';
      let topLenMax = 0;
      lenCounts.forEach((c, l) => {
        if (c > topLenMax) {
          topLenMax = c;
          topLen = l;
        }
      });
      const dominantLengthLabel =
        LENGTH_BANDS.find((l) => l.id === topLen)?.shortLabel || 'GOOD LEN';

      return {
        meta,
        ballsCount,
        rawCount: list.length,
        totalRuns,
        runsFromSixes,
        runsFromFours,
        runsFromRunning,
        dots,
        wickets,
        strikeRate,
        runSharePct,
        dominantLengthLabel,
      };
    });

    return {
      maxShotRuns: maxShotRunsRef.val,
      totalZoneRuns,
      rows: groups
        .filter((g) => g.rawCount > 0)
        .sort((a, b) => b.totalRuns - a.totalRuns || b.rawCount - a.rawCount),
    };
  }, [zoneFilteredBalls]);

  // 360° Field Sector & Run-Value Summary
  const fieldAndValueAnalytics = useMemo(() => {
    const balls = selectedShotCategory
      ? zoneFilteredBalls.filter((b) => b.shotCategory === selectedShotCategory)
      : zoneFilteredBalls;

    const totalRuns = balls.reduce((s, b) => s + b.batterRuns, 0);
    const legalFaced = balls.filter((b) => b.extraType !== 'wide').length;
    const singlesRuns = balls.filter((b) => b.batterRuns === 1).length;
    const twoThreeRuns = balls
      .filter((b) => b.batterRuns === 2 || b.batterRuns === 3)
      .reduce((s, b) => s + b.batterRuns, 0);
    const fourRuns = balls.filter((b) => b.isBoundaryFour).length * 4;
    const sixRuns = balls
      .filter((b) => b.isBoundarySix)
      .reduce((s, b) => s + b.batterRuns, 0);
    const dotsCount = balls.filter((b) => b.isDot).length;
    const wicketsCount = balls.filter((b) => b.isWicket).length;

    const offRuns = balls
      .filter((b) => b.fieldSide === 'off')
      .reduce((s, b) => s + b.batterRuns, 0);
    const straightRuns = balls
      .filter((b) => b.fieldSide === 'straight')
      .reduce((s, b) => s + b.batterRuns, 0);
    const legRuns = balls
      .filter((b) => b.fieldSide === 'leg')
      .reduce((s, b) => s + b.batterRuns, 0);

    let maxSectorRuns = 1;
    const sectors = FIELD_SECTORS_ORDER.map((sec) => {
      const secBalls = balls.filter((b) => b.fieldSector === sec.id);
      const runs = secBalls.reduce((s, b) => s + b.batterRuns, 0);
      if (runs > maxSectorRuns) maxSectorRuns = runs;
      const boundaries = secBalls.filter((b) => b.isBoundaryFour || b.isBoundarySix).length;
      const angleDeg =
        referenceHand === 'Left-hand' ? (360 - sec.angleDegRHB) % 360 : sec.angleDegRHB;
      return {
        ...sec,
        angleDeg,
        runs,
        count: secBalls.length,
        boundaries,
        sharePct: totalRuns > 0 ? Math.round((runs / totalRuns) * 100) : 0,
      };
    });

    return {
      totalRuns,
      legalFaced,
      strikeRate: legalFaced > 0 ? ((totalRuns / legalFaced) * 100).toFixed(1) : '0.0',
      boundaryRunSharePct:
        totalRuns > 0 ? Math.round(((fourRuns + sixRuns) / totalRuns) * 100) : 0,
      dotPct: legalFaced > 0 ? Math.round((dotsCount / legalFaced) * 100) : 0,
      singlesRuns,
      twoThreeRuns,
      fourRuns,
      sixRuns,
      wicketsCount,
      offPct: totalRuns > 0 ? Math.round((offRuns / totalRuns) * 100) : 0,
      straightPct: totalRuns > 0 ? Math.round((straightRuns / totalRuns) * 100) : 0,
      legPct: totalRuns > 0 ? Math.round((legRuns / totalRuns) * 100) : 0,
      sectors,
      maxSectorRuns,
    };
  }, [zoneFilteredBalls, selectedShotCategory, referenceHand]);

  // Hottest landing cell & top scoring shot for headline telemetry
  const hottestCell = useMemo(() => {
    const sorted = [...pitchGrid].sort((a, b) => b.count - a.count || b.runs - a.runs);
    return sorted[0] && sorted[0].count > 0 ? sorted[0] : null;
  }, [pitchGrid]);

  const topShot = shotDistribution.rows[0] || null;
  const activeSelectedCellMeta = useMemo(() => {
    if (!selectedCell) return null;
    return (
      pitchGrid.find(
        (c) => c.row === selectedCell.row && c.svgCol === selectedCell.svgCol
      ) || null
    );
  }, [pitchGrid, selectedCell]);

  // SVG Pitch Geometry constants
  const PITCH_X = 76;
  const PITCH_Y = 44;
  const PITCH_W = 228;
  const PITCH_H = 380;
  const CELL_W = PITCH_W / 5;
  const CELL_H = PITCH_H / 5;

  const inspectedBall =
    hoveredBall || (activeBalls.length > 0 ? activeBalls[activeBalls.length - 1] : null);

  return (
    <section
      aria-label="Pitch Landing Heatmap and Batter Shot Run Distribution"
      className="pitch-ui-sans pitch-stage-obsidian rounded-2xl p-4 sm:p-6 space-y-5 text-slate-200"
    >
      {/* Header & Primary Filter Controls */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 border-b border-slate-800/90 pb-4">
        <div className="space-y-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 text-xs text-cyan-400">
            <span className="inline-flex h-5 w-5 items-center justify-center rounded-md bg-amber-500/15 border border-amber-400/30 text-amber-300 shrink-0">
              <Flame className="h-3.5 w-3.5" />
            </span>
            <span className="font-heading font-bold tracking-tight text-slate-100">
              Pitch Ball-Landing Heatmap &amp; Shot Run Distribution
            </span>
            <span className="text-slate-600" aria-hidden="true">
              ·
            </span>
            <span className="text-[11px] text-slate-400">
              {isUsingProjectedBaseline ? (
                'Simulated Profile Baseline'
              ) : (
                <>
                  Live Match Telemetry (
                  <strong className="font-mono tabular-nums text-cyan-300">
                    {activeBalls.length}
                  </strong>{' '}
                  Balls)
                </>
              )}
            </span>
          </div>
          <h3 className="text-base sm:text-lg font-heading font-extrabold text-white tracking-tight">
            Where Every Ball Landed &amp; How{' '}
            {effectiveBatterId === 'ALL_BATTERS'
              ? `${scopedTeam.name} Batters`
              : focusedPlayer.name}{' '}
            Scored
          </h3>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Innings Scope Segmented Control */}
          <div
            role="group"
            aria-label="Innings scope"
            className="inline-flex items-center rounded-xl border border-slate-800 bg-slate-950/95 p-0.5 text-[11px]"
          >
            {(
              [
                { id: 'active', label: `Live Inn (${liveInningsNumber > 2 ? 'SO' : `I${liveInningsNumber}`})` },
                { id: 'inn1', label: `1st (${innings1Events.length})` },
                { id: 'inn2', label: `2nd (${innings2Events.length})` },
                { id: 'all', label: 'Match' },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  setInningsScope(tab.id);
                  setSelectedCell(null);
                }}
                className={`px-2.5 py-1.5 rounded-lg font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                  inningsScope === tab.id
                    ? 'bg-cyan-500 text-slate-950 font-bold shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Pace vs Spin Segmented Control */}
          <div
            role="group"
            aria-label="Bowler type filter"
            className="inline-flex items-center rounded-xl border border-slate-800 bg-slate-950/95 p-0.5 text-[11px]"
          >
            {(
              [
                { id: 'all', label: 'All Bowl' },
                { id: 'pace', label: 'Pace' },
                { id: 'spin', label: 'Spin' },
              ] as const
            ).map((bf) => (
              <button
                key={bf.id}
                type="button"
                onClick={() => setBowlerFilter(bf.id)}
                className={`px-2.5 py-1.5 rounded-lg font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                  bowlerFilter === bf.id
                    ? 'bg-emerald-500 text-slate-950 font-bold shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {bf.label}
              </button>
            ))}
          </div>

          {/* Live vs Baseline Toggle when live balls exist */}
          {liveMappedBalls.length > 0 && (
            <button
              type="button"
              onClick={() =>
                setDataSourceMode((m) => (m === 'projected' ? 'auto' : 'projected'))
              }
              className={`rounded-xl border px-3 py-1.5 text-[11px] font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                dataSourceMode === 'projected'
                  ? 'border-amber-400/70 bg-amber-400/15 text-amber-200'
                  : 'border-slate-800 bg-slate-900 text-slate-300 hover:text-white'
              }`}
            >
              {dataSourceMode === 'projected' ? 'Viewing Baseline' : 'Compare Baseline'}
            </button>
          )}
        </div>
      </div>

      {/* Batter Focus Bar + Headline KPI Strip */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 items-center">
        {/* Interactive Batter Selector */}
        <div className="lg:col-span-5 flex flex-wrap items-center gap-1.5">
          <span className="text-[11px] font-medium text-slate-400 mr-1 inline-flex items-center gap-1">
            <Filter className="h-3 w-3 text-cyan-400" />
            <span>Batter:</span>
          </span>
          <button
            type="button"
            onClick={() => {
              setSelectedBatterId('ALL_BATTERS');
              setSelectedCell(null);
            }}
            className={`rounded-lg border px-2.5 py-1 text-[11px] font-semibold transition-colors cursor-pointer ${
              effectiveBatterId === 'ALL_BATTERS'
                ? 'border-cyan-400 bg-cyan-500/20 text-cyan-200'
                : 'border-slate-800 bg-slate-900/90 text-slate-400 hover:text-white'
            }`}
          >
            All ({scopedTeam.shortName})
          </button>

          {availableBatters.slice(0, 5).map(({ player, runs, balls }) => {
            const isSelected = effectiveBatterId === player.id;
            const lastName = player.name.split(' ').slice(-1)[0];
            return (
              <button
                key={player.id}
                type="button"
                onClick={() => {
                  setSelectedBatterId(player.id);
                  setSelectedCell(null);
                }}
                className={`rounded-lg border px-2.5 py-1 text-[11px] font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                  isSelected
                    ? 'border-cyan-400 bg-cyan-500/20 text-cyan-200'
                    : 'border-slate-800 bg-slate-900/90 text-slate-300 hover:text-white'
                }`}
              >
                <span>{lastName}</span>{' '}
                <span className="font-mono tabular-nums text-[10px] opacity-90">
                  {balls > 0 ? `${runs}(${balls})` : '*'}
                </span>
              </button>
            );
          })}
        </div>

        {/* 4 Compact Tabular KPI Readouts */}
        <div className="lg:col-span-7 grid grid-cols-2 sm:grid-cols-4 gap-2">
          <div className="rounded-xl border border-slate-800/90 bg-slate-950/75 px-3 py-2">
            <span className="block text-[10px] font-medium text-slate-400">Scoring Output</span>
            <strong className="font-mono tabular-nums text-sm font-bold text-white">
              {fieldAndValueAnalytics.totalRuns}{' '}
              <span className="text-xs font-normal text-slate-400">
                ({fieldAndValueAnalytics.legalFaced}b)
              </span>
            </strong>
          </div>
          <div className="rounded-xl border border-slate-800/90 bg-slate-950/75 px-3 py-2">
            <span className="block text-[10px] font-medium text-slate-400">Strike Rate</span>
            <strong className="font-mono tabular-nums text-sm font-bold text-emerald-400">
              {fieldAndValueAnalytics.strikeRate}
            </strong>
          </div>
          <div className="rounded-xl border border-slate-800/90 bg-slate-950/75 px-3 py-2">
            <span className="block text-[10px] font-medium text-slate-400">Boundary Share</span>
            <strong className="font-mono tabular-nums text-sm font-bold text-amber-300">
              {fieldAndValueAnalytics.boundaryRunSharePct}%{' '}
              <span className="font-sans text-[11px] font-normal text-slate-400">of runs</span>
            </strong>
          </div>
          <div className="rounded-xl border border-slate-800/90 bg-slate-950/75 px-3 py-2">
            <span className="block text-[10px] font-medium text-slate-400">Peak Pitch Zone</span>
            <strong className="text-xs font-semibold text-cyan-300 truncate block mt-0.5">
              {hottestCell ? (
                <>
                  {hottestCell.lengthMeta.shortLabel} ·{' '}
                  <span className="font-mono tabular-nums">
                    {Math.round(hottestCell.densityPct)}%
                  </span>
                </>
              ) : (
                'Awaiting Data'
              )}
            </strong>
          </div>
        </div>
      </div>

      {/* Clear Pre-Match Notice when 0 live balls bowled */}
      {isUsingProjectedBaseline && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-amber-500/35 bg-amber-950/20 px-3.5 py-2 text-xs text-amber-200/95">
          <span className="inline-flex items-center gap-2">
            <Sparkles className="h-3.5 w-3.5 text-amber-400 shrink-0" />
            <span>
              Simulated Pre-Match Baseline for <strong>{focusedPlayer.name}</strong> at{' '}
              {stadium.name} ({surfaceCondition.replace(/_/g, ' ')}). Bowl a delivery via{' '}
              <strong>Next Ball</strong> or <strong>Autoplay</strong> to populate live ball-landing
              coordinates.
            </span>
          </span>
          {liveMappedBalls.length > 0 && (
            <button
              type="button"
              onClick={() => setDataSourceMode('auto')}
              className="font-semibold text-cyan-300 hover:text-white underline underline-offset-4 cursor-pointer shrink-0"
            >
              Return to Live Match (
              <span className="font-mono tabular-nums">{liveMappedBalls.length}</span> balls)
            </button>
          )}
        </div>
      )}

      {/* Main Synchronized 2-Column Visual Workspace */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-start">
        {/* =================================================================
            LEFT 6 COLS: 22-YARD PITCH BALL-LANDING HEATMAP
            ================================================================= */}
        <div className="xl:col-span-6 rounded-2xl border border-slate-800/90 bg-slate-950/90 p-4 space-y-3.5 shadow-lg shadow-black/25">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h4 className="text-xs font-heading font-bold tracking-tight text-slate-100">
                22-Yard Pitch Ball-Landing Heatmap
              </h4>
              <p className="text-[11px] text-slate-400">
                Click any pitch cell to isolate shots &amp; runs played from that landing spot
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              <div
                role="group"
                aria-label="Heatmap metric"
                className="inline-flex items-center rounded-lg border border-slate-800 bg-slate-900 p-0.5 text-[10px]"
              >
                {(
                  [
                    { id: 'density', label: 'Landing %' },
                    { id: 'runs', label: 'Run Yield' },
                    { id: 'control', label: 'Dot/Wkt' },
                  ] as const
                ).map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setMetricMode(m.id)}
                    className={`px-2 py-1 rounded-md font-semibold transition-colors cursor-pointer ${
                      metricMode === m.id
                        ? 'bg-sky-500 text-slate-950 font-bold'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>

              <button
                type="button"
                onClick={() => setShowBallImpacts((v) => !v)}
                className={`inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-[10px] font-semibold transition-colors cursor-pointer ${
                  showBallImpacts
                    ? 'border-cyan-500/50 bg-cyan-950/40 text-cyan-300'
                    : 'border-slate-800 bg-slate-900 text-slate-400 hover:text-white'
                }`}
              >
                <Layers className="h-3 w-3" />
                <span>Impacts</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
            {/* SVG 22-Yard Turf Strip + Heatmap Matrix + Ball Impacts */}
            <div className="sm:col-span-8 flex justify-center">
              <div className="pitch-turf-arena-frame w-full max-w-[330px] rounded-xl overflow-hidden">
                <svg
                  viewBox="0 0 360 468"
                  className="w-full h-auto select-none block"
                  role="img"
                  aria-label="Cricket pitch ball landing heatmap"
                >
                  <defs>
                    <linearGradient id="simPitchOutfield" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#042919" />
                      <stop offset="50%" stopColor="#051f17" />
                      <stop offset="100%" stopColor="#03130f" />
                    </linearGradient>
                    <radialGradient id="simFloodlightPool" cx="52%" cy="6%" r="60%">
                      <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.16" />
                      <stop offset="58%" stopColor="#10b981" stopOpacity="0.06" />
                      <stop offset="100%" stopColor="#000000" stopOpacity="0" />
                    </radialGradient>
                    <linearGradient id="simPitchTurf" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#3d3426" />
                      <stop offset="45%" stopColor="#4c4130" />
                      <stop offset="100%" stopColor="#362e22" />
                    </linearGradient>
                    <filter id="simThermalBlur" x="-30%" y="-30%" width="160%" height="160%">
                      <feGaussianBlur stdDeviation="14" />
                    </filter>
                  </defs>

                  {/* Outfield Backdrop */}
                  <rect x="0" y="0" width="360" height="468" fill="url(#simPitchOutfield)" />
                  <rect x="0" y="0" width="360" height="220" fill="url(#simFloodlightPool)" />

                  {/* Subtle Mow Stripes */}
                  {[0, 1, 2, 3, 4, 5].map((stripe) => (
                    <rect
                      key={`mow-${stripe}`}
                      x="0"
                      y={stripe * 78}
                      width="360"
                      height="39"
                      fill="rgba(16, 185, 129, 0.035)"
                    />
                  ))}

                  {/* Bowler Sightscreen + Release End Label */}
                  <rect
                    x={PITCH_X + PITCH_W / 2 - 32}
                    y="4"
                    width="64"
                    height="4.5"
                    rx="1.5"
                    fill="#f8fafc"
                    fillOpacity="0.82"
                  />
                  <text
                    x={PITCH_X + PITCH_W / 2}
                    y="20"
                    textAnchor="middle"
                    fill="#cbd5e1"
                    fontSize="8.8"
                    fontWeight="700"
                    className="pitch-svg-label"
                  >
                    Bowler Release End
                  </text>

                  {/* Cut-Turf Pitch Apron Collar */}
                  <rect
                    x={PITCH_X - 3}
                    y={PITCH_Y - 3}
                    width={PITCH_W + 6}
                    height={PITCH_H + 6}
                    rx="8"
                    fill="#042919"
                    stroke="rgba(16, 185, 129, 0.35)"
                    strokeWidth="1"
                  />

                  {/* 22-Yard Pitch Strip */}
                  <rect
                    x={PITCH_X}
                    y={PITCH_Y}
                    width={PITCH_W}
                    height={PITCH_H}
                    rx="6"
                    fill="url(#simPitchTurf)"
                    stroke="rgba(202, 138, 4, 0.45)"
                    strokeWidth="1.3"
                  />

                {/* Hawk-Eye Stump-to-Stump Reference Corridor */}
                <rect
                  x={PITCH_X + CELL_W * 2 + 6}
                  y={PITCH_Y}
                  width={CELL_W - 12}
                  height={PITCH_H}
                  fill="rgba(56, 189, 248, 0.07)"
                />

                {/* Smooth Radial Thermal Blobs Under Grid */}
                <g filter="url(#simThermalBlur)" pointerEvents="none">
                  {activeBalls
                    .filter(
                      (b) => !selectedShotCategory || b.shotCategory === selectedShotCategory
                    )
                    .map((b) => {
                      const cx = PITCH_X + (b.pitchX / 100) * PITCH_W;
                      const cy = PITCH_Y + (b.pitchY / 100) * PITCH_H;
                      const blobFill =
                        metricMode === 'runs'
                          ? b.batterRuns >= 4
                            ? 'rgba(245, 158, 11, 0.42)'
                            : b.batterRuns > 0
                            ? 'rgba(16, 185, 129, 0.32)'
                            : 'rgba(14, 165, 233, 0.14)'
                          : metricMode === 'control'
                          ? b.isWicket || b.isDot
                            ? 'rgba(244, 63, 94, 0.36)'
                            : 'rgba(20, 184, 166, 0.18)'
                          : 'rgba(245, 158, 11, 0.30)';
                      return (
                        <circle
                          key={`blob-${b.id}`}
                          cx={cx}
                          cy={cy}
                          r={b.batterRuns >= 4 || b.isWicket ? 20 : 15}
                          fill={blobFill}
                        />
                      );
                    })}
                </g>

                {/* Bowler & Striker Crease Lines + Wide Guidelines */}
                <line
                  x1={PITCH_X - 10}
                  y1={PITCH_Y + 14}
                  x2={PITCH_X + PITCH_W + 10}
                  y2={PITCH_Y + 14}
                  stroke="rgba(255,255,255,0.45)"
                  strokeWidth="1.2"
                />
                <line
                  x1={PITCH_X - 10}
                  y1={PITCH_Y + PITCH_H - 14}
                  x2={PITCH_X + PITCH_W + 10}
                  y2={PITCH_Y + PITCH_H - 14}
                  stroke="rgba(255,255,255,0.6)"
                  strokeWidth="1.5"
                />
                {/* Wide Tramlines at Striker End */}
                <line
                  x1={PITCH_X + 18}
                  y1={PITCH_Y + PITCH_H - 34}
                  x2={PITCH_X + 18}
                  y2={PITCH_Y + PITCH_H}
                  stroke="rgba(255,255,255,0.35)"
                  strokeWidth="1"
                />
                <line
                  x1={PITCH_X + PITCH_W - 18}
                  y1={PITCH_Y + PITCH_H - 34}
                  x2={PITCH_X + PITCH_W - 18}
                  y2={PITCH_Y + PITCH_H}
                  stroke="rgba(255,255,255,0.35)"
                  strokeWidth="1"
                />

                {/* 5x5 Interactive Pitch Heatmap Cells */}
                {pitchGrid.map((cell) => {
                  const x = PITCH_X + cell.svgCol * CELL_W;
                  const y = PITCH_Y + cell.row * CELL_H;
                  const isCellSelected =
                    selectedCell?.row === cell.row && selectedCell?.svgCol === cell.svgCol;
                  const heat = getHeatColor(cell.intensity01, metricMode);

                  const primaryText =
                    cell.count === 0
                      ? ''
                      : metricMode === 'density'
                      ? `${Math.round(cell.densityPct)}%`
                      : metricMode === 'runs'
                      ? `${cell.runs}r`
                      : `${Math.round(cell.controlPct)}%`;

                  return (
                    <g
                      key={`cell-${cell.row}-${cell.svgCol}`}
                      onClick={() => {
                        setSelectedCell((prev) =>
                          prev && prev.row === cell.row && prev.svgCol === cell.svgCol
                            ? null
                            : { row: cell.row, svgCol: cell.svgCol }
                        );
                      }}
                      className="cursor-pointer"
                    >
                      <rect
                        x={x + 1}
                        y={y + 1}
                        width={CELL_W - 2}
                        height={CELL_H - 2}
                        rx="4"
                        fill={heat.fill}
                        stroke={isCellSelected ? '#38bdf8' : heat.border}
                        strokeWidth={isCellSelected ? 2.2 : 0.9}
                      />
                      {cell.count > 0 && !showBallImpacts && (
                        <>
                          <text
                            x={x + CELL_W / 2}
                            y={y + CELL_H / 2 - 2}
                            textAnchor="middle"
                            fill={heat.text}
                            fontSize="10"
                            fontWeight="800"
                            className="pitch-svg-num"
                          >
                            {primaryText}
                          </text>
                          <text
                            x={x + CELL_W / 2}
                            y={y + CELL_H / 2 + 11}
                            textAnchor="middle"
                            fill="rgba(226,232,240,0.82)"
                            fontSize="8"
                            className="pitch-svg-num"
                          >
                            {cell.count}b
                          </text>
                        </>
                      )}
                      {cell.count > 0 && showBallImpacts && (
                        <text
                          x={x + CELL_W - 4}
                          y={y + 11}
                          textAnchor="end"
                          fill={heat.text}
                          fontSize="8"
                          fontWeight="700"
                          opacity="0.88"
                          className="pitch-svg-num"
                        >
                          {primaryText}
                        </text>
                      )}
                    </g>
                  );
                })}

                {/* Distance & Length Row Rulers on Left Margin */}
                {LENGTH_BANDS.map((band) => {
                  const yCenter = PITCH_Y + band.rowIndex * CELL_H + CELL_H / 2;
                  return (
                    <g key={`ruler-${band.id}`} pointerEvents="none">
                      <text
                        x={PITCH_X - 7}
                        y={yCenter - 2}
                        textAnchor="end"
                        fill="#e2e8f0"
                        fontSize="8.5"
                        fontWeight="700"
                        className="pitch-svg-label"
                      >
                        {band.shortLabel}
                      </text>
                      <text
                        x={PITCH_X - 7}
                        y={yCenter + 9}
                        textAnchor="end"
                        fill="#94a3b8"
                        fontSize="7.5"
                        className="pitch-svg-num"
                      >
                        {band.metersLabel}
                      </text>
                    </g>
                  );
                })}

                {/* Bowler End 3 Stumps */}
                {[-7, 0, 7].map((dx, idx) => (
                  <rect
                    key={`top-stump-${idx}`}
                    x={PITCH_X + PITCH_W / 2 + dx - 1.5}
                    y={PITCH_Y - 6}
                    width="3"
                    height="9"
                    rx="1"
                    fill="#e2e8f0"
                  />
                ))}

                {/* Striker End 3 Glowing Stumps */}
                {[-8, 0, 8].map((dx, idx) => (
                  <rect
                    key={`bot-stump-${idx}`}
                    x={PITCH_X + PITCH_W / 2 + dx - 1.8}
                    y={PITCH_Y + PITCH_H - 6}
                    width="3.6"
                    height="12"
                    rx="1"
                    fill="#38bdf8"
                  />
                ))}

                {/* Individual Landed Ball Impact Nodes */}
                {showBallImpacts &&
                  activeBalls.map((b) => {
                    const cx = PITCH_X + (b.pitchX / 100) * PITCH_W;
                    const cy = PITCH_Y + (b.pitchY / 100) * PITCH_H;
                    const dimmed =
                      (selectedShotCategory && b.shotCategory !== selectedShotCategory) ||
                      (selectedCell &&
                        (b.rowIndex !== selectedCell.row ||
                          b.svgColIndex !== selectedCell.svgCol));

                    const fill = b.isWicket
                      ? '#f43f5e'
                      : b.isBoundarySix
                      ? '#fbbf24'
                      : b.isBoundaryFour
                      ? '#34d399'
                      : b.batterRuns > 0
                      ? '#38bdf8'
                      : '#94a3b8';

                    const radius = b.isWicket || b.isBoundarySix ? 6.2 : b.isBoundaryFour ? 5.6 : 4.4;

                    return (
                      <g
                        key={`impact-${b.id}`}
                        opacity={dimmed ? 0.16 : 1}
                        className="cursor-pointer transition-opacity duration-200"
                        onMouseEnter={() => setHoveredBall(b)}
                        onMouseLeave={() => setHoveredBall(null)}
                        onClick={(e) => {
                          e.stopPropagation();
                          setHoveredBall(b);
                        }}
                      >
                        {b.isLatest && !dimmed && (
                          <circle
                            cx={cx}
                            cy={cy}
                            r={radius + 5}
                            fill="none"
                            stroke={fill}
                            strokeWidth="1.4"
                            strokeOpacity="0.75"
                          />
                        )}
                        <circle
                          cx={cx}
                          cy={cy}
                          r={radius}
                          fill={fill}
                          stroke="#020617"
                          strokeWidth="1.3"
                        />
                        {(b.isWicket || b.isBoundaryFour || b.isBoundarySix) && (
                          <text
                            x={cx}
                            y={cy + 2.4}
                            textAnchor="middle"
                            fill="#020617"
                            fontSize="6.8"
                            fontWeight="800"
                            className="pitch-svg-num pointer-events-none"
                          >
                            {b.isWicket ? 'W' : b.batterRuns}
                          </text>
                        )}
                      </g>
                    );
                  })}

                  {/* Off-Side / Leg-Side Stance Orientation Labels */}
                  <text
                    x={PITCH_X + 6}
                    y={PITCH_Y + PITCH_H + 20}
                    textAnchor="start"
                    fill="#67e8f9"
                    fontSize="8.5"
                    fontWeight="700"
                    className="pitch-svg-label"
                  >
                    {referenceHand === 'Left-hand' ? 'Leg Side (LHB)' : 'Off Side (RHB)'}
                  </text>
                  <text
                    x={PITCH_X + PITCH_W / 2}
                    y={PITCH_Y + PITCH_H + 34}
                    textAnchor="middle"
                    fill="#cbd5e1"
                    fontSize="8.8"
                    fontWeight="700"
                    className="pitch-svg-label"
                  >
                    Striker Popping Crease
                  </text>
                  <text
                    x={PITCH_X + PITCH_W - 6}
                    y={PITCH_Y + PITCH_H + 20}
                    textAnchor="end"
                    fill="#fcd34d"
                    fontSize="8.5"
                    fontWeight="700"
                    className="pitch-svg-label"
                  >
                    {referenceHand === 'Left-hand' ? 'Off Side (LHB)' : 'Leg Side (RHB)'}
                  </text>
                </svg>
              </div>
            </div>

            {/* Right-of-Pitch Length Band Telemetry Rail + Legend */}
            <div className="sm:col-span-4 space-y-2.5">
              <div className="text-[11px] font-heading font-bold text-slate-300">
                Length Landing Split
              </div>

              <div className="space-y-2">
                {lengthSummary.map((item) => (
                  <div
                    key={item.band.id}
                    className="rounded-xl border border-slate-800/90 bg-slate-900/75 p-2 space-y-1"
                  >
                    <div className="flex items-center justify-between text-[10px]">
                      <span className="font-semibold text-slate-200">{item.band.shortLabel}</span>
                      <span className="font-mono tabular-nums text-cyan-300 font-bold">
                        {item.pct}%
                      </span>
                    </div>
                    <div className="h-1.5 w-full rounded-full bg-slate-950 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-emerald-400 transition-all duration-300"
                        style={{ width: `${Math.max(item.count > 0 ? 6 : 0, item.pct)}%` }}
                      />
                    </div>
                    <div className="flex items-center justify-between text-[10px] font-mono tabular-nums text-slate-400">
                      <span>{item.count}b</span>
                      <span className="text-emerald-300">
                        {item.runs}r · SR {item.sr}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Outcome Marker Legend */}
              <div className="rounded-xl border border-slate-800/80 bg-slate-900/50 p-2.5 space-y-1.5 text-[10px]">
                <span className="text-slate-300 block font-semibold">Impact Key</span>
                <div className="grid grid-cols-2 gap-1.5 text-slate-300">
                  <span className="inline-flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-full bg-amber-400 inline-block" />
                    Six (6)
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-full bg-emerald-400 inline-block" />
                    Four (4)
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-full bg-sky-400 inline-block" />
                    1–3 Runs
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-full bg-rose-500 inline-block" />
                    Wicket
                  </span>
                  <span className="inline-flex items-center gap-1.5 col-span-2">
                    <span className="h-2.5 w-2.5 rounded-full bg-slate-400 inline-block" />
                    Dot Ball (0)
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Docked Ball-Landing Telemetry Inspector */}
          {inspectedBall && (
            <div className="rounded-xl border border-slate-800 bg-slate-900/85 px-3.5 py-2.5 text-xs flex flex-wrap items-center justify-between gap-2">
              <div className="min-w-0 space-y-0.5">
                <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                  <Crosshair className="h-3.5 w-3.5 text-cyan-400 shrink-0" />
                  <span className="font-semibold text-cyan-300">
                    {hoveredBall ? 'Inspected Ball' : 'Latest Landing'} · Ov{' '}
                    <span className="font-mono tabular-nums">{inspectedBall.overLabel}</span>
                  </span>
                  <span className="text-slate-500">·</span>
                  <span className="text-slate-200 truncate">
                    {inspectedBall.bowlerName} to {inspectedBall.batterName}
                  </span>
                  <span className="text-slate-500">·</span>
                  <span className="font-mono tabular-nums text-amber-300 font-semibold">
                    {inspectedBall.speedKmh} km/h
                  </span>
                </div>
                <p className="text-[11px] text-slate-300 truncate">
                  {LENGTH_BANDS.find((l) => l.id === inspectedBall.lengthBand)?.label} (
                  {LINE_CHANNELS[inspectedBall.colIndex]?.shortLabel}) — {inspectedBall.rawShot}
                </p>
              </div>

              <span
                className={`font-mono tabular-nums rounded-lg px-2.5 py-1 text-xs font-bold shrink-0 ${
                  inspectedBall.isWicket
                    ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                    : inspectedBall.isBoundarySix
                    ? 'bg-amber-400/20 text-amber-300 border border-amber-400/40'
                    : inspectedBall.isBoundaryFour
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                    : 'bg-slate-800 text-slate-200 border border-slate-700'
                }`}
              >
                {inspectedBall.isWicket
                  ? `OUT (${inspectedBall.wicketType || 'W'})`
                  : `${inspectedBall.totalRuns} RUN${inspectedBall.totalRuns === 1 ? '' : 'S'}`}
              </span>
            </div>
          )}
        </div>

        {/* =================================================================
            RIGHT 6 COLS: BATTER SHOT RUN DISTRIBUTION & 360° SCORING DIAL
            ================================================================= */}
        <div className="xl:col-span-6 rounded-2xl border border-slate-800/90 bg-slate-950/90 p-4 space-y-4 shadow-[0_14px_34px_rgba(2,6,23,0.45)]">
          {/* Active Batter / Team Header + Cross-Filter Status */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800/80 pb-3">
            <div className="flex items-center gap-3 min-w-0">
              {effectiveBatterId === 'ALL_BATTERS' ? (
                <TeamFlag code={scopedTeam.id} size="lg" />
              ) : (
                <button
                  type="button"
                  onClick={() => onInspectPlayer?.(focusedPlayer)}
                  className="shrink-0 cursor-pointer"
                  title={`Inspect ${focusedPlayer.name}`}
                >
                  <PlayerCardAvatar
                    playerId={focusedPlayer.id}
                    name={focusedPlayer.name}
                    countryCode={focusedPlayer.countryCode}
                    jerseyNumber={focusedPlayer.jerseyNumber}
                    imageUrl={focusedPlayer.imageUrl}
                    size="sm"
                  />
                </button>
              )}
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h4 className="font-heading text-sm font-extrabold tracking-tight text-white truncate">
                    {effectiveBatterId === 'ALL_BATTERS'
                      ? `${scopedTeam.name} — Team Shot Run Distribution`
                      : `${focusedPlayer.name} — Shot Run Distribution`}
                  </h4>
                </div>
                <p className="text-[11px] font-medium text-slate-400 truncate">
                  {effectiveBatterId === 'ALL_BATTERS' ? (
                    <>
                      <span className="font-mono tabular-nums font-semibold text-slate-200">
                        {availableBatters.length}
                      </span>{' '}
                      batters tracked · Top stroke:{' '}
                      {topShot ? (
                        <span className="text-slate-200 font-semibold">
                          {topShot.meta.shortLabel}{' '}
                          <span className="font-mono tabular-nums text-emerald-300">
                            ({topShot.totalRuns}r)
                          </span>
                        </span>
                      ) : (
                        '—'
                      )}
                    </>
                  ) : (
                    <>
                      {focusedPlayer.battingHand} · {focusedPlayer.role} · Favored:{' '}
                      {topShot ? (
                        <span className="text-slate-200 font-semibold">
                          {topShot.meta.shortLabel}{' '}
                          <span className="font-mono tabular-nums text-emerald-300">
                            ({topShot.totalRuns}r)
                          </span>
                        </span>
                      ) : (
                        '—'
                      )}
                    </>
                  )}
                </p>
              </div>
            </div>

            {(selectedCell || selectedShotCategory) && (
              <button
                type="button"
                onClick={() => {
                  setSelectedCell(null);
                  setSelectedShotCategory(null);
                }}
                className="inline-flex items-center gap-1.5 rounded-lg border border-cyan-500/50 bg-cyan-950/40 px-2.5 py-1 text-[11px] font-bold tracking-tight text-cyan-300 hover:text-white cursor-pointer transition-colors"
              >
                <RotateCcw className="h-3 w-3" />
                <span>Reset Filter</span>
              </button>
            )}
          </div>

          {activeSelectedCellMeta && (
            <div className="rounded-xl border border-sky-500/40 bg-sky-950/25 px-3 py-2 text-[11px] font-medium text-sky-200 flex items-center justify-between gap-2">
              <span>
                Filtered to Pitch Zone:{' '}
                <strong className="font-bold text-white">
                  {activeSelectedCellMeta.lengthMeta.label} · {activeSelectedCellMeta.lineLabel}
                </strong>{' '}
                (
                <span className="font-mono tabular-nums font-semibold text-sky-100">
                  {activeSelectedCellMeta.count}
                </span>{' '}
                balls,{' '}
                <span className="font-mono tabular-nums font-semibold text-emerald-300">
                  {activeSelectedCellMeta.runs}
                </span>{' '}
                runs)
              </span>
              <button
                type="button"
                onClick={() => setSelectedCell(null)}
                className="font-semibold text-sky-300 hover:text-white underline cursor-pointer shrink-0"
              >
                Show All Pitch Zones
              </button>
            </div>
          )}

          {/* Top Split: 360° Scoring Wagon Dial + Run Source Composition */}
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3.5 items-center rounded-xl border border-slate-800/80 bg-slate-900/50 p-3">
            {/* 360° 8-Sector Scoring Dial */}
            <div className="sm:col-span-5 flex flex-col items-center">
              <svg
                viewBox="0 0 210 210"
                className="w-full max-w-[184px] h-auto"
                role="img"
                aria-label="360 degree scoring zone run distribution"
              >
                <defs>
                  <radialGradient id="simDialTurfGlow" cx="50%" cy="50%" r="55%">
                    <stop offset="0%" stopColor="#064e3b" stopOpacity="0.65" />
                    <stop offset="70%" stopColor="#042619" stopOpacity="0.92" />
                    <stop offset="100%" stopColor="#02130d" stopOpacity="1" />
                  </radialGradient>
                </defs>
                {/* Outfield & 30-Yard Ring */}
                <circle
                  cx="105"
                  cy="105"
                  r="82"
                  fill="url(#simDialTurfGlow)"
                  stroke="rgba(16, 185, 129, 0.38)"
                  strokeWidth="1.25"
                />
                <circle
                  cx="105"
                  cy="105"
                  r="44"
                  fill="none"
                  stroke="rgba(226, 232, 240, 0.22)"
                  strokeDasharray="3 3"
                  strokeWidth="1"
                />

                {/* 8 Radial Sector Wedges Scaled by Runs */}
                {fieldAndValueAnalytics.sectors.map((sec) => {
                  const rad = ((sec.angleDeg - 90) * Math.PI) / 180;
                  const halfSpan = (20 * Math.PI) / 180;
                  const ratio =
                    sec.runs > 0
                      ? 0.28 + 0.72 * (sec.runs / fieldAndValueAnalytics.maxSectorRuns)
                      : 0.12;
                  const rOuter = 14 + ratio * 65;

                  const x1 = 105 + rOuter * Math.cos(rad - halfSpan);
                  const y1 = 105 + rOuter * Math.sin(rad - halfSpan);
                  const x2 = 105 + rOuter * Math.cos(rad + halfSpan);
                  const y2 = 105 + rOuter * Math.sin(rad + halfSpan);

                  const lx = 105 + 95 * Math.cos(rad);
                  const ly = 105 + 95 * Math.sin(rad);

                  const wedgeColor =
                    sec.runs === 0
                      ? 'rgba(51, 65, 85, 0.28)'
                      : sec.boundaries > 0
                      ? 'rgba(16, 185, 129, 0.58)'
                      : 'rgba(56, 189, 248, 0.48)';

                  return (
                    <g key={`sec-${sec.id}`}>
                      <path
                        d={`M 105 105 L ${x1.toFixed(1)} ${y1.toFixed(1)} A ${rOuter.toFixed(
                          1
                        )} ${rOuter.toFixed(1)} 0 0 1 ${x2.toFixed(1)} ${y2.toFixed(1)} Z`}
                        fill={wedgeColor}
                        stroke={sec.runs > 0 ? 'rgba(52, 211, 153, 0.8)' : 'rgba(71, 85, 105, 0.35)'}
                        strokeWidth="0.95"
                      />
                      <text
                        x={lx}
                        y={ly + 2}
                        textAnchor="middle"
                        className="pitch-svg-label fill-slate-300 text-[7px] font-bold"
                      >
                        {sec.short}
                      </text>
                      {sec.runs > 0 && (
                        <text
                          x={105 + Math.max(26, rOuter * 0.68) * Math.cos(rad)}
                          y={105 + Math.max(26, rOuter * 0.68) * Math.sin(rad) + 2.5}
                          textAnchor="middle"
                          className="pitch-svg-num fill-white text-[7.5px] font-extrabold"
                        >
                          {sec.runs}
                        </text>
                      )}
                    </g>
                  );
                })}

                {/* Center Pitch Rectangle */}
                <rect
                  x="100"
                  y="92"
                  width="10"
                  height="26"
                  rx="2"
                  fill="#574b36"
                  stroke="#cbd5e1"
                  strokeWidth="0.85"
                />
              </svg>
              <span className="text-[10.5px] font-medium text-slate-400">
                Off{' '}
                <strong className="font-mono tabular-nums font-bold text-slate-200">
                  {fieldAndValueAnalytics.offPct}%
                </strong>{' '}
                · Straight{' '}
                <strong className="font-mono tabular-nums font-bold text-slate-200">
                  {fieldAndValueAnalytics.straightPct}%
                </strong>{' '}
                · Leg{' '}
                <strong className="font-mono tabular-nums font-bold text-slate-200">
                  {fieldAndValueAnalytics.legPct}%
                </strong>
              </span>
            </div>

            {/* Run Value Breakdown & Scoring Split */}
            <div className="sm:col-span-7 space-y-3">
              <div className="flex items-center justify-between text-[11px]">
                <span className="font-heading font-extrabold text-slate-100 uppercase tracking-[0.08em]">
                  Run Value Breakdown
                </span>
                <span className="font-medium text-slate-400">
                  Dot Balls:{' '}
                  <strong className="font-mono tabular-nums font-bold text-slate-100">
                    {fieldAndValueAnalytics.dotPct}%
                  </strong>
                </span>
              </div>

              {/* Stacked Total Run Composition Bar */}
              <div className="h-3 w-full rounded-full bg-slate-950 border border-slate-800 overflow-hidden flex">
                {fieldAndValueAnalytics.totalRuns > 0 ? (
                  <>
                    <div
                      className="h-full bg-amber-400 transition-all duration-300"
                      style={{
                        width: `${(fieldAndValueAnalytics.sixRuns / fieldAndValueAnalytics.totalRuns) * 100}%`,
                      }}
                      title={`Sixes: ${fieldAndValueAnalytics.sixRuns} runs`}
                    />
                    <div
                      className="h-full bg-emerald-400 transition-all duration-300"
                      style={{
                        width: `${(fieldAndValueAnalytics.fourRuns / fieldAndValueAnalytics.totalRuns) * 100}%`,
                      }}
                      title={`Fours: ${fieldAndValueAnalytics.fourRuns} runs`}
                    />
                    <div
                      className="h-full bg-cyan-400 transition-all duration-300"
                      style={{
                        width: `${(fieldAndValueAnalytics.twoThreeRuns / fieldAndValueAnalytics.totalRuns) * 100}%`,
                      }}
                      title={`2s & 3s: ${fieldAndValueAnalytics.twoThreeRuns} runs`}
                    />
                    <div
                      className="h-full bg-sky-500 transition-all duration-300"
                      style={{
                        width: `${(fieldAndValueAnalytics.singlesRuns / fieldAndValueAnalytics.totalRuns) * 100}%`,
                      }}
                      title={`Singles: ${fieldAndValueAnalytics.singlesRuns} runs`}
                    />
                  </>
                ) : (
                  <div className="h-full w-full bg-slate-800/60" />
                )}
              </div>

              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <div className="rounded-lg border border-slate-800 bg-slate-950/80 px-2.5 py-1.5 flex items-center justify-between">
                  <span className="inline-flex items-center gap-1.5 font-medium text-slate-300">
                    <span className="h-2 w-2 rounded-full bg-amber-400" />
                    Sixes (6s)
                  </span>
                  <strong className="font-mono tabular-nums font-bold text-amber-300">
                    {fieldAndValueAnalytics.sixRuns}r
                  </strong>
                </div>
                <div className="rounded-lg border border-slate-800 bg-slate-950/80 px-2.5 py-1.5 flex items-center justify-between">
                  <span className="inline-flex items-center gap-1.5 font-medium text-slate-300">
                    <span className="h-2 w-2 rounded-full bg-emerald-400" />
                    Fours (4s)
                  </span>
                  <strong className="font-mono tabular-nums font-bold text-emerald-300">
                    {fieldAndValueAnalytics.fourRuns}r
                  </strong>
                </div>
                <div className="rounded-lg border border-slate-800 bg-slate-950/80 px-2.5 py-1.5 flex items-center justify-between">
                  <span className="inline-flex items-center gap-1.5 font-medium text-slate-300">
                    <span className="h-2 w-2 rounded-full bg-cyan-400" />
                    2s &amp; 3s
                  </span>
                  <strong className="font-mono tabular-nums font-bold text-cyan-300">
                    {fieldAndValueAnalytics.twoThreeRuns}r
                  </strong>
                </div>
                <div className="rounded-lg border border-slate-800 bg-slate-950/80 px-2.5 py-1.5 flex items-center justify-between">
                  <span className="inline-flex items-center gap-1.5 font-medium text-slate-300">
                    <span className="h-2 w-2 rounded-full bg-sky-500" />
                    Singles (1s)
                  </span>
                  <strong className="font-mono tabular-nums font-bold text-sky-300">
                    {fieldAndValueAnalytics.singlesRuns}r
                  </strong>
                </div>
              </div>
            </div>
          </div>

          {/* Ranked Shot-by-Shot Run Distribution Bars */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between text-[11px]">
              <span className="font-heading font-extrabold uppercase tracking-[0.08em] text-slate-100 inline-flex items-center gap-1.5">
                <Target className="h-3.5 w-3.5 text-emerald-400" />
                <span>Runs &amp; Strike Rate by Shot Type</span>
              </span>
              <span className="font-medium text-slate-400">
                Click a shot to highlight pitch landings
              </span>
            </div>

            {shotDistribution.rows.length === 0 ? (
              <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-6 text-center text-xs font-medium text-slate-400">
                No deliveries recorded in this pitch zone yet. Click Reset Filter to view all shots.
              </div>
            ) : (
              <div className="space-y-2">
                {shotDistribution.rows.map((row) => {
                  const isShotSelected = selectedShotCategory === row.meta.id;
                  const barScalePct =
                    row.totalRuns > 0
                      ? Math.max(8, (row.totalRuns / shotDistribution.maxShotRuns) * 100)
                      : 4;
                  const sixSeg =
                    row.totalRuns > 0 ? (row.runsFromSixes / row.totalRuns) * 100 : 0;
                  const fourSeg =
                    row.totalRuns > 0 ? (row.runsFromFours / row.totalRuns) * 100 : 0;
                  const runSeg =
                    row.totalRuns > 0 ? (row.runsFromRunning / row.totalRuns) * 100 : 0;

                  return (
                    <button
                      key={row.meta.id}
                      type="button"
                      onClick={() =>
                        setSelectedShotCategory((prev) =>
                          prev === row.meta.id ? null : row.meta.id
                        )
                      }
                      className={`w-full text-left rounded-xl border p-2.5 transition-all cursor-pointer space-y-1.5 ${
                        isShotSelected
                          ? 'border-cyan-400 bg-cyan-950/30 shadow-[0_0_20px_rgba(34,211,238,0.12)]'
                          : 'border-slate-800/90 bg-slate-900/60 hover:border-slate-700 hover:bg-slate-900'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2 text-xs">
                        <div className="flex items-center gap-2 min-w-0">
                          <span
                            className="h-2.5 w-2.5 rounded-full shrink-0"
                            style={{ backgroundColor: row.meta.accentHex }}
                          />
                          <span className="font-semibold tracking-tight text-slate-100 truncate">
                            {row.meta.label}
                          </span>
                          <span className="text-[10.5px] font-medium text-slate-400 hidden sm:inline shrink-0">
                            · {row.dominantLengthLabel}
                          </span>
                        </div>

                        <div className="flex items-center gap-2.5 font-mono tabular-nums text-[11px] shrink-0">
                          {row.wickets > 0 && (
                            <span className="text-rose-400 font-bold">{row.wickets}W</span>
                          )}
                          <span className="text-slate-400">{row.ballsCount}b</span>
                          <span className="text-emerald-300 font-bold">
                            SR {Math.round(row.strikeRate)}
                          </span>
                          <strong className="text-white text-xs w-14 text-right">
                            {row.totalRuns}r ({Math.round(row.runSharePct)}%)
                          </strong>
                        </div>
                      </div>

                      {/* Stacked Shot Run Composition Bar */}
                      <div className="h-2 w-full rounded-full bg-slate-950 overflow-hidden">
                        {row.totalRuns > 0 ? (
                          <div
                            className="h-full flex rounded-full overflow-hidden transition-all duration-300"
                            style={{ width: `${barScalePct}%` }}
                          >
                            {sixSeg > 0 && (
                              <div
                                className="h-full bg-amber-400"
                                style={{ width: `${sixSeg}%` }}
                              />
                            )}
                            {fourSeg > 0 && (
                              <div
                                className="h-full bg-emerald-400"
                                style={{ width: `${fourSeg}%` }}
                              />
                            )}
                            {runSeg > 0 && (
                              <div
                                className="h-full bg-sky-400"
                                style={{ width: `${runSeg}%` }}
                              />
                            )}
                          </div>
                        ) : (
                          <div
                            className="h-full bg-slate-700/80 rounded-full"
                            style={{ width: `${Math.min(35, row.rawCount * 6)}%` }}
                          />
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};
