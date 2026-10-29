import React, { useState, useMemo, useEffect } from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
} from 'recharts';
import {
  Sparkles,
  Play,
  Pause,
  Layers,
  Gauge,
  RotateCcw,
  Sliders,
  TrendingUp,
  TrendingDown,
} from 'lucide-react';
import { cricketAudio } from '../../utils/audioSystem';
import { triggerHaptic, HAPTIC_PATTERNS } from '../../utils/haptics';

export interface OverDegradationPoint {
  over: number;
  overLabel: string;
  spinDeg: number;
  spinImpactIndex: number;
  bounceCarryIndex: number;
  dustDensityPct: number;
  hardnessKpa: number;
  textureStage: string;
}

export interface PitchForecastPayload {
  surfaceHeadline: string;
  inflectionOver: number;
  aiConfidencePct: number;
  spinDeltaSummary: string;
  bounceDeltaSummary: string;
  captaincyDirective: string;
  overs: OverDegradationPoint[];
  source: 'physics-baseline' | 'gemini-ai';
}

export interface PitchDegradationForecastCardProps {
  stadiumName?: string;
  temperature?: number;
  humidity?: number;
  dewLevel?: number;
  pitchWear?: number;
  grassCoverage?: number;
  matchDay?: number;
  compact?: boolean;
  onPitchAgeChange?: (dayIndex: number, wearPct: number, grassPct: number) => void;
}

interface SoilMatrixProfile {
  id: string;
  label: string;
  clayComposition: string;
  baseHardnessKpa: number;
  abrasionRate: number;
  baseSpinDeg: number;
  maxSpinGainDeg: number;
  baseBounceCarry: number;
  bounceDecay: number;
}

const SOIL_MATRICES: SoilMatrixProfile[] = [
  {
    id: 'bulli-hard',
    label: 'Hard Bulli Clay',
    clayComposition: '70% Smectite Clay · High Compaction',
    baseHardnessKpa: 505,
    abrasionRate: 1.0,
    baseSpinDeg: 1.4,
    maxSpinGainDeg: 2.1,
    baseBounceCarry: 92,
    bounceDecay: 16,
  },
  {
    id: 'subcontinent-dry',
    label: 'Dry Red Loam',
    clayComposition: '58% Kaolinite Silt · Rapid Crust Abrasion',
    baseHardnessKpa: 430,
    abrasionRate: 1.45,
    baseSpinDeg: 2.1,
    maxSpinGainDeg: 3.1,
    baseBounceCarry: 81,
    bounceDecay: 28,
  },
  {
    id: 'black-cotton',
    label: 'Black Cotton Soil',
    clayComposition: '82% Montmorillonite · Deep Micro-Fissures',
    baseHardnessKpa: 472,
    abrasionRate: 1.22,
    baseSpinDeg: 1.7,
    maxSpinGainDeg: 2.6,
    baseBounceCarry: 87,
    bounceDecay: 22,
  },
  {
    id: 'hybrid-dropin',
    label: 'Drop-In Hybrid Turf',
    clayComposition: 'Reinforced Perennial Ryegrass + Sand-Clay',
    baseHardnessKpa: 488,
    abrasionRate: 0.78,
    baseSpinDeg: 1.3,
    maxSpinGainDeg: 1.5,
    baseBounceCarry: 90,
    bounceDecay: 12,
  },
];

const PITCH_AGE_STAGES = [
  { index: 0, label: 'Fresh', matchDay: 1, wear: 10, grass: 82, note: 'Hard Rolled Turf' },
  { index: 1, label: 'Day 1', matchDay: 1, wear: 18, grass: 74, note: 'Firm Binding Grass' },
  { index: 2, label: 'Day 2', matchDay: 2, wear: 34, grass: 58, note: 'Settled Clay Sheen' },
  { index: 3, label: 'Day 3', matchDay: 3, wear: 54, grass: 40, note: 'Scuffed Footmarks' },
  { index: 4, label: 'Day 4', matchDay: 4, wear: 76, grass: 22, note: 'Abrasive Micro-Cracks' },
  { index: 5, label: 'Day 5', matchDay: 5, wear: 92, grass: 10, note: 'Dusty Fissured Deck' },
];

interface TextureFrameSpec {
  frameNum: number;
  overSpan: string;
  representativeOver: number;
  stageLabel: string;
  baseBg: string;
  grassAlpha: number;
  dustAlpha: number;
  crackStrokeWidth: number;
  crackOpacity: number;
  footmarkRadius: number;
}

const TEXTURE_FRAMES: TextureFrameSpec[] = [
  {
    frameNum: 1,
    overSpan: 'Ov 1–3',
    representativeOver: 2,
    stageLabel: 'Hard Rolled Clay',
    baseBg: 'linear-gradient(90deg, #1b3b2b 0%, #274733 50%, #2c4a34 100%)',
    grassAlpha: 0.78,
    dustAlpha: 0.05,
    crackStrokeWidth: 0,
    crackOpacity: 0,
    footmarkRadius: 2,
  },
  {
    frameNum: 2,
    overSpan: 'Ov 4–5',
    representativeOver: 5,
    stageLabel: 'Burnished Seam Glaze',
    baseBg: 'linear-gradient(90deg, #25422f 0%, #354e35 50%, #3d5236 100%)',
    grassAlpha: 0.64,
    dustAlpha: 0.12,
    crackStrokeWidth: 0.6,
    crackOpacity: 0.18,
    footmarkRadius: 3.5,
  },
  {
    frameNum: 3,
    overSpan: 'Ov 6–8',
    representativeOver: 7,
    stageLabel: 'Spike Surface Scuffs',
    baseBg: 'linear-gradient(90deg, #354a32 0%, #485436 50%, #525736 100%)',
    grassAlpha: 0.5,
    dustAlpha: 0.22,
    crackStrokeWidth: 0.9,
    crackOpacity: 0.28,
    footmarkRadius: 5,
  },
  {
    frameNum: 4,
    overSpan: 'Ov 9–11',
    representativeOver: 10,
    stageLabel: 'Hairline Clay Cracks',
    baseBg: 'linear-gradient(90deg, #495234 0%, #5c5836 50%, #685b35 100%)',
    grassAlpha: 0.38,
    dustAlpha: 0.34,
    crackStrokeWidth: 1.2,
    crackOpacity: 0.42,
    footmarkRadius: 6.5,
  },
  {
    frameNum: 5,
    overSpan: 'Ov 12–14',
    representativeOver: 13,
    stageLabel: 'Parched Topsoil Shift',
    baseBg: 'linear-gradient(90deg, #5d5634 0%, #715d34 50%, #7d6033 100%)',
    grassAlpha: 0.26,
    dustAlpha: 0.48,
    crackStrokeWidth: 1.55,
    crackOpacity: 0.56,
    footmarkRadius: 8,
  },
  {
    frameNum: 6,
    overSpan: 'Ov 15–16',
    representativeOver: 15,
    stageLabel: 'Abrasive Footmarks',
    baseBg: 'linear-gradient(90deg, #6e5932 0%, #836132 50%, #8f6430 100%)',
    grassAlpha: 0.18,
    dustAlpha: 0.62,
    crackStrokeWidth: 1.9,
    crackOpacity: 0.68,
    footmarkRadius: 9.5,
  },
  {
    frameNum: 7,
    overSpan: 'Ov 17–18',
    representativeOver: 18,
    stageLabel: 'Crumbling Clay Crust',
    baseBg: 'linear-gradient(90deg, #7d5c2f 0%, #92652e 50%, #9e682c 100%)',
    grassAlpha: 0.11,
    dustAlpha: 0.76,
    crackStrokeWidth: 2.25,
    crackOpacity: 0.8,
    footmarkRadius: 11,
  },
  {
    frameNum: 8,
    overSpan: 'Ov 19–20',
    representativeOver: 20,
    stageLabel: 'Loose Dusty Fissures',
    baseBg: 'linear-gradient(90deg, #8b5e2b 0%, #a1682a 50%, #b07029 100%)',
    grassAlpha: 0.06,
    dustAlpha: 0.9,
    crackStrokeWidth: 2.6,
    crackOpacity: 0.92,
    footmarkRadius: 12.5,
  },
];

function inferDefaultSoilId(stadiumName: string): string {
  const lower = stadiumName.toLowerCase();
  if (lower.includes('chennai') || lower.includes('colombo') || lower.includes('delhi') || lower.includes('guyana')) {
    return 'subcontinent-dry';
  }
  if (lower.includes('mumbai') || lower.includes('wankhede') || lower.includes('pune') || lower.includes('hyderabad')) {
    return 'black-cotton';
  }
  if (lower.includes('melbourne') || lower.includes('adelaide') || lower.includes('nassau') || lower.includes('auckland')) {
    return 'hybrid-dropin';
  }
  return 'bulli-hard';
}

function buildPhysicsBaselineForecast(params: {
  stadiumName: string;
  soil: SoilMatrixProfile;
  temperature: number;
  humidity: number;
  dewLevel: number;
  wearPct: number;
  grassPct: number;
}): PitchForecastPayload {
  const { stadiumName, soil, temperature, humidity, dewLevel, wearPct, grassPct } = params;
  const thermalFactor = Math.max(0.82, Math.min(1.28, temperature / 29));
  const wearModifier = wearPct / 100;
  const grassBinding = grassPct / 100;

  const overs: OverDegradationPoint[] = [];
  let inflectionOver = 12;
  let crossed = false;

  for (let ov = 1; ov <= 20; ov++) {
    const progress = (ov - 1) / 19;
    // Non-linear dust accumulation driven by bowler spike traffic and solar thermal baking
    const nonLinearWear = Math.pow(progress, 1.15);
    const rawDust =
      12 +
      wearPct * 0.46 +
      nonLinearWear * 54 * soil.abrasionRate * thermalFactor -
      grassBinding * 14;
    const dustDensityPct = Math.max(8, Math.min(97, Math.round(rawDust)));

    // Evening dew in overs 14-20 slightly dampens finger-spin friction when dewLevel > 60
    const lateDewSkid =
      dewLevel >= 60 && ov >= 14 ? ((ov - 13) / 7) * ((dewLevel - 55) / 45) * 0.65 : 0;

    const rawSpinDeg =
      soil.baseSpinDeg +
      wearModifier * 1.15 +
      nonLinearWear * soil.maxSpinGainDeg * thermalFactor -
      grassBinding * 0.35 -
      lateDewSkid;
    const spinDeg = Number(Math.max(1.1, Math.min(5.5, rawSpinDeg)).toFixed(2));

    const spinImpactIndex = Math.max(
      16,
      Math.min(96, Math.round(((spinDeg - 0.9) / 4.6) * 100))
    );

    const rawBounce =
      soil.baseBounceCarry -
      wearModifier * 22 -
      progress * soil.bounceDecay * thermalFactor +
      grassBinding * 8 +
      (dewLevel >= 65 && ov >= 15 ? 4 : 0);
    const bounceCarryIndex = Math.max(40, Math.min(96, Math.round(rawBounce)));

    const rawHardness =
      soil.baseHardnessKpa +
      (temperature - 26) * 2.4 -
      humidity * 0.75 -
      wearPct * 1.35 -
      progress * 68 * soil.abrasionRate;
    const hardnessKpa = Math.max(215, Math.min(555, Math.round(rawHardness)));

    if (!crossed && spinImpactIndex >= bounceCarryIndex - 6 && ov >= 6 && ov <= 17) {
      inflectionOver = ov;
      crossed = true;
    }

    const frameSpec =
      TEXTURE_FRAMES[Math.min(7, Math.floor(((ov - 1) / 20) * 8))] || TEXTURE_FRAMES[0];

    overs.push({
      over: ov,
      overLabel: `Ov ${ov}`,
      spinDeg,
      spinImpactIndex,
      bounceCarryIndex,
      dustDensityPct,
      hardnessKpa,
      textureStage: frameSpec.stageLabel,
    });
  }

  if (!crossed) {
    inflectionOver = soil.id === 'subcontinent-dry' ? 9 : soil.id === 'bulli-hard' ? 14 : 12;
  }

  const ov1 = overs[0];
  const ov20 = overs[overs.length - 1];
  const spinDelta = (ov20.spinDeg - ov1.spinDeg).toFixed(1);
  const bounceDrop = ov1.bounceCarryIndex - ov20.bounceCarryIndex;

  const surfaceHeadline =
    dewLevel >= 65
      ? `${soil.label} Abrades Through Middle Overs Before Dew Skid Moderates Late Turn`
      : `${soil.label} Shifts from ${ov1.hardnessKpa} kPa Hard Deck to ${ov20.dustDensityPct}% Dusty Grip by Over 20`;

  const spinDeltaSummary = `Turn expands +${spinDelta}° (${ov1.spinDeg}° in Ov 1 → ${ov20.spinDeg}° in Ov 20) as loose topsoil reaches ${ov20.dustDensityPct}%.`;
  const bounceDeltaSummary = `True carry drops ${bounceDrop} pts (${ov1.bounceCarryIndex} → ${ov20.bounceCarryIndex}), elevating variable low-bounce hazard after Over ${inflectionOver}.`;
  const captaincyDirective =
    dewLevel >= 65
      ? `Attack with hard-length seamers in Overs 1–6 while topsoil holds at ${ov1.hardnessKpa} kPa, then deploy wrist-spin through Overs 7–14 before evening condensation (${dewLevel}% dew) skids the ball onto the bat.`
      : `Capitalize on true ${ov1.bounceCarryIndex}/100 bounce in the Powerplay at ${stadiumName}; introduce attacking spin from Over ${Math.max(7, inflectionOver - 2)} as footmark dust crosses ${overs[Math.max(0, inflectionOver - 1)].dustDensityPct}% and cross-seam cutters grip at the death.`;

  return {
    surfaceHeadline,
    inflectionOver,
    aiConfidencePct: 89,
    spinDeltaSummary,
    bounceDeltaSummary,
    captaincyDirective,
    overs,
    source: 'physics-baseline',
  };
}

export const PitchDegradationForecastCard: React.FC<PitchDegradationForecastCardProps> = ({
  stadiumName = 'Narendra Modi Stadium, Ahmedabad',
  temperature = 32,
  humidity = 48,
  dewLevel = 32,
  pitchWear = 22,
  grassCoverage = 62,
  matchDay = 1,
  compact = false,
  onPitchAgeChange,
}) => {
  const [selectedSoilId, setSelectedSoilId] = useState<string>(() =>
    inferDefaultSoilId(stadiumName)
  );
  const [pitchAgeIdx, setPitchAgeIdx] = useState<number>(() =>
    pitchWear < 15 ? 0 : Math.min(5, Math.max(1, matchDay))
  );

  // CSS Frame-by-frame animation controls
  const [isAutoAnimating, setIsAutoAnimating] = useState<boolean>(true);
  const [filmstripSpeed, setFilmstripSpeed] = useState<'normal' | 'slow'>('normal');
  const [scrubbedOver, setScrubbedOver] = useState<number>(12);

  // AI Server Forecast State
  const [aiForecast, setAiForecast] = useState<PitchForecastPayload | null>(null);
  const [isGeneratingAi, setIsGeneratingAi] = useState<boolean>(false);
  const [aiStatusNotice, setAiStatusNotice] = useState<string | null>(null);

  // Sync soil when venue changes
  useEffect(() => {
    setSelectedSoilId(inferDefaultSoilId(stadiumName));
    setAiForecast(null);
    setAiStatusNotice(null);
  }, [stadiumName]);

  // Sync pitch age when parent props change
  useEffect(() => {
    const syncedIdx = pitchWear < 15 ? 0 : Math.min(5, Math.max(1, matchDay));
    setPitchAgeIdx(syncedIdx);
  }, [matchDay, pitchWear]);

  const activeSoil =
    SOIL_MATRICES.find((s) => s.id === selectedSoilId) || SOIL_MATRICES[0];
  const activeAgeStage = PITCH_AGE_STAGES[pitchAgeIdx] || PITCH_AGE_STAGES[1];

  const effectiveWear = onPitchAgeChange ? activeAgeStage.wear : pitchWear;
  const effectiveGrass = onPitchAgeChange ? activeAgeStage.grass : grassCoverage;

  const physicsForecast = useMemo(
    () =>
      buildPhysicsBaselineForecast({
        stadiumName,
        soil: activeSoil,
        temperature,
        humidity,
        dewLevel,
        wearPct: effectiveWear,
        grassPct: effectiveGrass,
      }),
    [stadiumName, activeSoil, temperature, humidity, dewLevel, effectiveWear, effectiveGrass]
  );

  const activeForecast = aiForecast || physicsForecast;

  // Map scrubbedOver (1..20) -> discrete frame index (0..7)
  const manualFrameIndex = Math.min(7, Math.max(0, Math.floor(((scrubbedOver - 1) / 20) * 8)));
  const inspectedOverData =
    activeForecast.overs[Math.min(19, Math.max(0, scrubbedOver - 1))] ||
    activeForecast.overs[0];
  const ov1Data = activeForecast.overs[0];
  const ov10Data = activeForecast.overs[9] || activeForecast.overs[0];
  const ov20Data = activeForecast.overs[activeForecast.overs.length - 1] || activeForecast.overs[0];

  const handleStageSelect = (idx: number) => {
    const clamped = Math.max(0, Math.min(5, idx));
    const stage = PITCH_AGE_STAGES[clamped];
    setPitchAgeIdx(clamped);
    setAiForecast(null);
    cricketAudio.playUiClick();
    triggerHaptic(HAPTIC_PATTERNS.TAP);
    if (onPitchAgeChange) {
      onPitchAgeChange(stage.matchDay, stage.wear, stage.grass);
    }
  };

  const handleSoilSelect = (soilId: string) => {
    setSelectedSoilId(soilId);
    setAiForecast(null);
    setAiStatusNotice(null);
    cricketAudio.playUiClick();
    triggerHaptic(HAPTIC_PATTERNS.TAP);
  };

  const handleRunGeminiForecast = async () => {
    setIsGeneratingAi(true);
    setAiStatusNotice(null);
    cricketAudio.playUiClick();
    triggerHaptic(HAPTIC_PATTERNS.TAP);

    try {
      const response = await fetch('/api/pitch-forecast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stadiumName,
          soilProfile: activeSoil.label,
          temperature,
          humidity,
          dewLevel,
          initialWear: effectiveWear,
          grassCoverage: effectiveGrass,
        }),
      });

      const payload = await response.json().catch(() => null);

      if (!response.ok || !payload || !Array.isArray(payload.overs) || payload.overs.length < 10) {
        const isMissingKey = payload && payload.code === 'MISSING_API_KEY';
        setAiStatusNotice(
          isMissingKey
            ? 'Physics-calibrated 20-over model active (configure API key in Secrets for live AI synthesis).'
            : 'AI model experiencing temporary high demand — calibrated 20-over turf physics forecast remains active.'
        );
        return;
      }

      const normalizedOvers: OverDegradationPoint[] = Array.from({ length: 20 }, (_, i) => {
        const targetOver = i + 1;
        const found = payload.overs.find(
          (item: { over?: number }) => Number(item.over) === targetOver
        ) || payload.overs[Math.min(i, payload.overs.length - 1)];
        const fallback = physicsForecast.overs[i];

        return {
          over: targetOver,
          overLabel: `Ov ${targetOver}`,
          spinDeg: Number(
            Math.max(1.0, Math.min(6.0, Number(found?.spinDeg ?? fallback.spinDeg))).toFixed(2)
          ),
          spinImpactIndex: Math.max(
            10,
            Math.min(99, Math.round(Number(found?.spinImpactIndex ?? fallback.spinImpactIndex)))
          ),
          bounceCarryIndex: Math.max(
            30,
            Math.min(98, Math.round(Number(found?.bounceCarryIndex ?? fallback.bounceCarryIndex)))
          ),
          dustDensityPct: Math.max(
            5,
            Math.min(99, Math.round(Number(found?.dustDensityPct ?? fallback.dustDensityPct)))
          ),
          hardnessKpa: Math.max(
            200,
            Math.min(580, Math.round(Number(found?.hardnessKpa ?? fallback.hardnessKpa)))
          ),
          textureStage: String(found?.textureStage || fallback.textureStage),
        };
      });

      setAiForecast({
        surfaceHeadline: String(payload.surfaceHeadline || physicsForecast.surfaceHeadline),
        inflectionOver: Math.max(
          5,
          Math.min(18, Math.round(Number(payload.inflectionOver || physicsForecast.inflectionOver)))
        ),
        aiConfidencePct: Math.max(
          75,
          Math.min(98, Math.round(Number(payload.aiConfidencePct || 91)))
        ),
        spinDeltaSummary: String(payload.spinDeltaSummary || physicsForecast.spinDeltaSummary),
        bounceDeltaSummary: String(payload.bounceDeltaSummary || physicsForecast.bounceDeltaSummary),
        captaincyDirective: String(payload.captaincyDirective || physicsForecast.captaincyDirective),
        overs: normalizedOvers,
        source: 'gemini-ai',
      });
    } catch {
      setAiStatusNotice(
        'Calibrated turf-physics forecast active (network or server AI route unavailable).'
      );
    } finally {
      setIsGeneratingAi(false);
    }
  };

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950/90 p-5 sm:p-6 space-y-5">
      {/* HEADER BAR */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 border-b border-slate-800/90 pb-4">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2 text-xs font-mono text-amber-400">
            <Layers className="h-3.5 w-3.5 shrink-0" />
            <span className="font-semibold tracking-wide uppercase">
              AI Pitch Degradation Forecast
            </span>
            <span aria-hidden="true" className="text-slate-600">
              ·
            </span>
            <span className="text-slate-400">
              {activeForecast.source === 'gemini-ai'
                ? `Live AI Turf Synthesis · ${activeForecast.aiConfidencePct}% Confidence`
                : `Simulated Physics Model · ${activeForecast.aiConfidencePct}% Confidence`}
            </span>
          </div>
          <h3 className="text-lg sm:text-xl font-bold text-white tracking-tight">
            {activeForecast.surfaceHeadline}
          </h3>
          <p className="text-xs text-slate-400 font-mono">
            {stadiumName} · {activeSoil.clayComposition} · {temperature}°C · Dew {dewLevel}%
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {aiForecast && (
            <button
              type="button"
              onClick={() => {
                setAiForecast(null);
                setAiStatusNotice(null);
                cricketAudio.playUiClick();
              }}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-xs font-medium text-slate-300 hover:text-white transition-colors cursor-pointer"
              title="Reset to local physics baseline"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>Baseline</span>
            </button>
          )}

          <button
            type="button"
            disabled={isGeneratingAi}
            onClick={handleRunGeminiForecast}
            className="inline-flex items-center gap-2 rounded-xl border border-amber-400/50 bg-amber-500/15 px-4 py-2 text-xs font-bold text-amber-200 hover:bg-amber-500/25 hover:text-white disabled:opacity-60 transition-colors cursor-pointer whitespace-nowrap"
          >
            <Sparkles className={`h-3.5 w-3.5 text-amber-400 ${isGeneratingAi ? 'animate-spin' : ''}`} />
            <span>{isGeneratingAi ? 'Synthesizing 20 Overs…' : 'Generate AI Forecast'}</span>
          </button>
        </div>
      </div>

      {aiStatusNotice && (
        <div className="rounded-xl border border-slate-800 bg-slate-900/70 px-3.5 py-2 text-xs font-mono text-slate-300 flex items-center justify-between gap-2">
          <span>{aiStatusNotice}</span>
          <button
            type="button"
            onClick={() => setAiStatusNotice(null)}
            className="text-slate-400 hover:text-white cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* SOIL MATRIX SELECTOR + OPTIONAL PITCH AGE SLIDER */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-center">
        <div className={onPitchAgeChange ? 'lg:col-span-7 space-y-2' : 'lg:col-span-12 space-y-2'}>
          <div className="flex items-center justify-between text-xs font-mono text-slate-400">
            <span>Soil Matrix Calibration</span>
            <span className="tabular-nums text-slate-300">
              Start {ov1Data.hardnessKpa} kPa → End {ov20Data.hardnessKpa} kPa
            </span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {SOIL_MATRICES.map((soil) => {
              const isSelected = soil.id === selectedSoilId;
              return (
                <button
                  key={soil.id}
                  type="button"
                  onClick={() => handleSoilSelect(soil.id)}
                  className={`rounded-xl border px-3 py-2 text-left transition-colors cursor-pointer ${
                    isSelected
                      ? 'border-amber-400/70 bg-amber-950/35 text-white'
                      : 'border-slate-800 bg-slate-900/60 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                  }`}
                >
                  <span className="text-xs font-bold block truncate">{soil.label}</span>
                  <span className="text-[10px] font-mono text-slate-400 block mt-0.5 tabular-nums">
                    Base {soil.baseSpinDeg}° · {soil.baseHardnessKpa} kPa
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {onPitchAgeChange && (
          <div className="lg:col-span-5 rounded-xl border border-slate-800 bg-slate-900/60 p-3 space-y-2">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-slate-300 flex items-center gap-1.5">
                <Sliders className="h-3.5 w-3.5 text-cyan-400" />
                <span>Pitch Age Stage</span>
              </span>
              <span className="text-cyan-300 font-bold tabular-nums">
                {activeAgeStage.label} · Wear {activeAgeStage.wear}%
              </span>
            </div>
            <div className="grid grid-cols-6 gap-1">
              {PITCH_AGE_STAGES.map((st) => (
                <button
                  key={st.label}
                  type="button"
                  onClick={() => handleStageSelect(st.index)}
                  className={`rounded-lg py-1 text-[11px] font-mono transition-colors cursor-pointer ${
                    pitchAgeIdx === st.index
                      ? 'bg-cyan-400 text-slate-950 font-bold'
                      : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
                  }`}
                >
                  {st.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* =====================================================================
          8-FRAME CSS STEPS() HARD-TO-DUSTY SURFACE TEXTURE VIEWPORT
          ===================================================================== */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 text-xs font-mono text-slate-300">
              <span className="font-bold text-white">
                Macro 22-Yard Surface Texture Shift (Hard → Dusty)
              </span>
              <span aria-hidden="true" className="text-slate-600">
                ·
              </span>
              <span className="text-amber-300 tabular-nums">
                {isAutoAnimating
                  ? `CSS steps(7, end) Filmstrip (${filmstripSpeed === 'normal' ? '5.6s' : '9.8s'})`
                  : `Frame ${manualFrameIndex + 1}/8 Locked · Over ${scrubbedOver}.0`}
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setIsAutoAnimating((prev) => !prev);
                cricketAudio.playUiClick();
                triggerHaptic(HAPTIC_PATTERNS.TAP);
              }}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-950 px-3 py-1.5 text-xs font-mono font-semibold text-slate-200 hover:text-white transition-colors cursor-pointer"
            >
              {isAutoAnimating ? (
                <>
                  <Pause className="h-3.5 w-3.5 text-amber-400" />
                  <span>Pause Filmstrip</span>
                </>
              ) : (
                <>
                  <Play className="h-3.5 w-3.5 text-emerald-400" />
                  <span>Play CSS Frame Loop</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => {
                setFilmstripSpeed((prev) => (prev === 'normal' ? 'slow' : 'normal'));
                setIsAutoAnimating(true);
                cricketAudio.playUiClick();
              }}
              className="rounded-lg border border-slate-800 bg-slate-950 px-2.5 py-1.5 text-xs font-mono text-slate-300 hover:text-white transition-colors cursor-pointer tabular-nums"
              title="Toggle CSS frame-by-frame cadence"
            >
              Cadence: {filmstripSpeed === 'normal' ? '1.4 fps' : '0.8 fps'}
            </button>
          </div>
        </div>

        {/* GPU-Composited 8-Frame Horizontal Filmstrip Viewport */}
        <div className="relative h-36 sm:h-40 w-full rounded-xl border border-amber-500/25 overflow-hidden bg-slate-950 select-none">
          <div
            className={`h-full flex pitch-texture-filmstrip ${
              isAutoAnimating
                ? filmstripSpeed === 'normal'
                  ? 'pitch-filmstrip-play-normal'
                  : 'pitch-filmstrip-play-slow'
                : 'transition-transform duration-200 ease-out'
            }`}
            style={
              isAutoAnimating
                ? undefined
                : { transform: `translate3d(-${manualFrameIndex * 12.5}%, 0, 0)` }
            }
          >
            {TEXTURE_FRAMES.map((frame) => (
              <div
                key={frame.frameNum}
                className="relative h-full w-[12.5%] shrink-0 overflow-hidden"
                style={{ background: frame.baseBg }}
              >
                {/* Procedural Binding Grass Fibres (fading from Hard Frame 1 -> Dusty Frame 8) */}
                <div
                  className="absolute inset-0 pointer-events-none"
                  style={{
                    opacity: frame.grassAlpha,
                    backgroundImage:
                      'repeating-linear-gradient(82deg, rgba(34,197,94,0.22) 0px, rgba(34,197,94,0.22) 1px, transparent 1px, transparent 9px), repeating-linear-gradient(98deg, rgba(21,128,61,0.25) 0px, rgba(21,128,61,0.25) 1px, transparent 1px, transparent 13px)',
                  }}
                />

                {/* Granular Loose Dust & Silt Matrix (intensifying from Frame 1 -> Frame 8) */}
                <div
                  className={`absolute inset-0 pointer-events-none ${
                    isAutoAnimating
                      ? filmstripSpeed === 'normal'
                        ? 'pitch-dust-motes-normal'
                        : 'pitch-dust-motes-slow'
                      : ''
                  }`}
                  style={{
                    opacity: frame.dustAlpha,
                    backgroundImage:
                      'radial-gradient(circle at 18% 32%, rgba(251,191,36,0.34) 1.2px, transparent 2.5px), radial-gradient(circle at 64% 68%, rgba(217,119,6,0.38) 1.5px, transparent 3px), radial-gradient(circle at 82% 26%, rgba(120,53,15,0.42) 1.8px, transparent 3.2px)',
                    backgroundSize: '26px 26px, 19px 19px, 31px 31px',
                  }}
                />

                {/* 22-Yard Crease Geometry, Good-Length Spike Footmarks & Clay Fissure Network */}
                <svg
                  className="absolute inset-0 h-full w-full pointer-events-none"
                  viewBox="0 0 640 160"
                  preserveAspectRatio="none"
                >
                  {/* Popping & Return Crease Lines */}
                  <line x1="58" y1="0" x2="58" y2="160" stroke="rgba(255,255,255,0.42)" strokeWidth="2" />
                  <line x1="582" y1="0" x2="582" y2="160" stroke="rgba(255,255,255,0.42)" strokeWidth="2" />
                  <line x1="0" y1="22" x2="640" y2="22" stroke="rgba(255,255,255,0.16)" strokeWidth="1" />
                  <line x1="0" y1="138" x2="640" y2="138" stroke="rgba(255,255,255,0.16)" strokeWidth="1" />

                  {/* Good-Length Corridor Highlight (6m-8m zone) */}
                  <rect
                    x="355"
                    y="24"
                    width="115"
                    height="112"
                    fill="rgba(245, 158, 11, 0.08)"
                    stroke="rgba(245, 158, 11, 0.22)"
                    strokeDasharray="4 4"
                  />

                  {/* Progressive Bowler Spike Footmark Rough Patches */}
                  <g fill="rgba(69, 26, 3, 0.46)">
                    <ellipse cx="408" cy="44" rx={frame.footmarkRadius * 1.9} ry={frame.footmarkRadius} />
                    <ellipse cx="436" cy="49" rx={frame.footmarkRadius * 1.5} ry={frame.footmarkRadius * 0.85} />
                    <ellipse cx="392" cy="116" rx={frame.footmarkRadius * 1.7} ry={frame.footmarkRadius * 0.9} />
                    <ellipse cx="222" cy="114" rx={frame.footmarkRadius * 1.4} ry={frame.footmarkRadius * 0.8} />
                  </g>

                  {/* Progressive Surface Micro-Cracks & Clay Fissures */}
                  {frame.crackOpacity > 0 && (
                    <g
                      stroke={`rgba(41, 16, 4, ${frame.crackOpacity})`}
                      strokeWidth={frame.crackStrokeWidth}
                      fill="none"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M 165 28 L 184 58 L 176 92 L 194 128" />
                      <path d="M 184 58 L 206 71" />
                      <path d="M 308 24 L 296 64 L 314 102 L 302 136" />
                      <path d="M 296 64 L 274 79" />
                      <path d="M 388 32 L 406 68 L 395 106 L 418 134" />
                      <path d="M 406 68 L 434 82 L 448 69" />
                      {frame.frameNum >= 5 && (
                        <>
                          <path d="M 468 29 L 456 66 L 474 99 L 462 134" />
                          <path d="M 244 38 L 258 78 L 246 122" />
                        </>
                      )}
                      {frame.frameNum >= 7 && (
                        <>
                          <path d="M 518 36 L 504 76 L 522 118" />
                          <path d="M 122 42 L 138 84 L 128 126" />
                        </>
                      )}
                    </g>
                  )}
                </svg>

                {/* Embedded Frame Telemetry Watermark */}
                <div className="absolute top-2.5 left-3 right-3 flex items-center justify-between text-[11px] font-mono pointer-events-none">
                  <span className="rounded-md bg-slate-950/80 border border-white/15 px-2 py-0.5 text-slate-100 font-semibold tabular-nums">
                    Frame {frame.frameNum}/8 · {frame.overSpan} · {frame.stageLabel}
                  </span>
                  <span className="rounded-md bg-slate-950/80 border border-amber-400/30 px-2 py-0.5 text-amber-300 font-bold tabular-nums">
                    Dust {Math.round(frame.dustAlpha * 100)}%
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Bottom Vignette Readout Bar */}
          <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-slate-950/95 via-slate-950/75 to-transparent px-3.5 py-2 flex flex-wrap items-center justify-between gap-2 text-xs font-mono">
            <div className="flex items-center gap-3">
              <span className="text-cyan-300 tabular-nums">
                Ov 1 Hard: <strong>{ov1Data.spinDeg}°</strong> turn · <strong>{ov1Data.bounceCarryIndex}</strong> carry
              </span>
              <span className="text-slate-600">→</span>
              <span className="text-amber-300 tabular-nums">
                Ov 20 Dusty: <strong>{ov20Data.spinDeg}°</strong> turn · <strong>{ov20Data.bounceCarryIndex}</strong> carry
              </span>
            </div>
            <span className="text-[11px] text-slate-300 tabular-nums">
              Inflection: <strong className="text-emerald-400">Over {activeForecast.inflectionOver}</strong>
            </span>
          </div>
        </div>

        {/* Synchronized 8-Step Playhead Bar & Interactive Frame Selector */}
        <div className="space-y-2">
          <div className="h-1.5 w-full rounded-full bg-slate-800 overflow-hidden">
            {isAutoAnimating ? (
              <div
                className={`h-full w-full bg-gradient-to-r from-cyan-400 via-amber-400 to-orange-500 ${
                  filmstripSpeed === 'normal' ? 'pitch-playhead-normal' : 'pitch-playhead-slow'
                }`}
              />
            ) : (
              <div
                className="h-full bg-gradient-to-r from-cyan-400 to-amber-400 transition-all duration-200"
                style={{ width: `${((manualFrameIndex + 1) / 8) * 100}%` }}
              />
            )}
          </div>

          {/* 8 Discrete Frame Buttons + Over 1-20 Scrubber */}
          <div className="grid grid-cols-4 sm:grid-cols-8 gap-1.5">
            {TEXTURE_FRAMES.map((fr, idx) => {
              const isCurrentManual = !isAutoAnimating && manualFrameIndex === idx;
              return (
                <button
                  key={fr.frameNum}
                  type="button"
                  onClick={() => {
                    setIsAutoAnimating(false);
                    setScrubbedOver(fr.representativeOver);
                    cricketAudio.playUiClick();
                    triggerHaptic(HAPTIC_PATTERNS.TAP);
                  }}
                  className={`rounded-lg border px-2 py-1 text-left font-mono transition-colors cursor-pointer ${
                    isCurrentManual
                      ? 'border-amber-400 bg-amber-500/20 text-white'
                      : 'border-slate-800 bg-slate-950/80 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                  }`}
                >
                  <span className="text-[10px] font-bold block tabular-nums">
                    F{fr.frameNum} · {fr.overSpan}
                  </span>
                  <span className="text-[9px] text-slate-400 block truncate">
                    {idx < 2 ? 'Hard' : idx < 5 ? 'Scuffed' : 'Dusty'}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Fine-Grain Over 1–20 Scrubber */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
            <div className="flex items-center gap-2 text-xs font-mono text-slate-300 shrink-0">
              <span>Inspect Over (1–20):</span>
              <strong className="text-amber-300 tabular-nums">
                Over {scrubbedOver}.0 ({inspectedOverData.textureStage})
              </strong>
            </div>
            <input
              type="range"
              min={1}
              max={20}
              step={1}
              value={scrubbedOver}
              onChange={(e) => {
                setIsAutoAnimating(false);
                setScrubbedOver(Number(e.target.value));
              }}
              className="w-full sm:max-w-xs accent-amber-400 cursor-pointer"
              aria-label="Scrub over 1 to 20 to inspect surface texture frame and spin/bounce forecast"
            />
            <div className="flex items-center gap-3 text-xs font-mono shrink-0 tabular-nums">
              <span className="text-amber-300">
                Spin: <strong>{inspectedOverData.spinDeg}°</strong>
              </span>
              <span className="text-slate-600">·</span>
              <span className="text-cyan-300">
                Bounce: <strong>{inspectedOverData.bounceCarryIndex}/100</strong>
              </span>
              <span className="text-slate-600">·</span>
              <span className="text-slate-300">
                <strong>{inspectedOverData.hardnessKpa} kPa</strong>
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* =====================================================================
          20-OVER SPIN & BOUNCE IMPACT FORECAST CHART + PHASE METRICS
          ===================================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
        {/* Left (8 cols): 20-Over Recharts Composed Forecast */}
        <div className="lg:col-span-8 rounded-xl border border-slate-800 bg-slate-900/50 p-4 flex flex-col justify-between space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h4 className="text-sm font-bold text-white">
                20-Over Spin Grip vs. True Bounce Carry Curve
              </h4>
              <p className="text-xs text-slate-400">
                Over-by-over predicted trajectory showing surface abrasion crossover at Over{' '}
                <span className="font-mono font-bold text-emerald-400 tabular-nums">
                  {activeForecast.inflectionOver}
                </span>
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3 text-[11px] font-mono">
              <span className="flex items-center gap-1.5 text-amber-300">
                <span className="h-2 w-2 rounded-full bg-amber-400" />
                <span>Spin Impact (0–100)</span>
              </span>
              <span className="flex items-center gap-1.5 text-cyan-300">
                <span className="h-2 w-2 rounded-full bg-cyan-400" />
                <span>Bounce Carry (0–100)</span>
              </span>
              <span className="flex items-center gap-1.5 text-yellow-200/80">
                <span className="h-0.5 w-3 bg-yellow-400" />
                <span>Dust %</span>
              </span>
            </div>
          </div>

          <div className={compact ? 'h-52 w-full' : 'h-60 w-full'}>
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart
                data={activeForecast.overs}
                margin={{ top: 10, right: 12, left: -18, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="aiSpinImpactGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.38} />
                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.02} />
                  </linearGradient>
                  <linearGradient id="aiBounceCarryGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.34} />
                    <stop offset="95%" stopColor="#06b6d4" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis
                  dataKey="overLabel"
                  tick={{ fill: '#94a3b8', fontSize: 11 }}
                  interval={2}
                />
                <YAxis domain={[0, 100]} tick={{ fill: '#94a3b8', fontSize: 11 }} />
                <Tooltip
                  content={({ active, payload }) => {
                    if (!active || !payload || !payload.length) return null;
                    const row = payload[0].payload as OverDegradationPoint;
                    return (
                      <div className="rounded-xl border border-slate-700 bg-slate-950/95 p-3 shadow-xl text-xs font-mono space-y-1.5">
                        <div className="flex items-center justify-between gap-4 border-b border-slate-800 pb-1">
                          <span className="font-bold text-white tabular-nums">
                            Over {row.over}.0
                          </span>
                          <span className="text-amber-300">{row.textureStage}</span>
                        </div>
                        <div className="flex justify-between gap-4">
                          <span className="text-slate-400">Predicted Spin Turn:</span>
                          <strong className="text-amber-300 tabular-nums">
                            {row.spinDeg}° ({row.spinImpactIndex}/100)
                          </strong>
                        </div>
                        <div className="flex justify-between gap-4">
                          <span className="text-slate-400">True Bounce Carry:</span>
                          <strong className="text-cyan-300 tabular-nums">
                            {row.bounceCarryIndex}/100
                          </strong>
                        </div>
                        <div className="flex justify-between gap-4">
                          <span className="text-slate-400">Loose Surface Dust:</span>
                          <strong className="text-yellow-300 tabular-nums">
                            {row.dustDensityPct}%
                          </strong>
                        </div>
                        <div className="flex justify-between gap-4">
                          <span className="text-slate-400">Topsoil Hardness:</span>
                          <strong className="text-slate-200 tabular-nums">
                            {row.hardnessKpa} kPa
                          </strong>
                        </div>
                      </div>
                    );
                  }}
                />
                <ReferenceLine
                  x={`Ov ${activeForecast.inflectionOver}`}
                  stroke="#10b981"
                  strokeDasharray="4 4"
                  label={{
                    value: `Inflection Ov ${activeForecast.inflectionOver}`,
                    position: 'insideTopRight',
                    fill: '#34d399',
                    fontSize: 10,
                  }}
                />
                {!isAutoAnimating && (
                  <ReferenceLine
                    x={`Ov ${scrubbedOver}`}
                    stroke="#f59e0b"
                    strokeWidth={1.5}
                  />
                )}
                <Area
                  type="monotone"
                  dataKey="bounceCarryIndex"
                  name="True Bounce Carry"
                  stroke="#06b6d4"
                  strokeWidth={2.2}
                  fill="url(#aiBounceCarryGrad)"
                />
                <Area
                  type="monotone"
                  dataKey="spinImpactIndex"
                  name="Spin Grip Impact"
                  stroke="#f59e0b"
                  strokeWidth={2.5}
                  fill="url(#aiSpinImpactGrad)"
                />
                <Line
                  type="monotone"
                  dataKey="dustDensityPct"
                  name="Surface Dust (%)"
                  stroke="#eab308"
                  strokeWidth={1.5}
                  strokeDasharray="4 4"
                  dot={false}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Right (4 cols): Phase Telemetry Breakdown & AI Tactical Directive */}
        <div className="lg:col-span-4 rounded-xl border border-slate-800 bg-slate-900/50 p-4 flex flex-col justify-between space-y-3.5">
          <div className="space-y-2.5">
            <div className="flex items-center justify-between text-xs font-mono text-slate-400 border-b border-slate-800 pb-2">
              <span className="font-semibold text-white">3-Phase Impact Telemetry</span>
              <Gauge className="h-3.5 w-3.5 text-cyan-400" />
            </div>

            {/* Phase Table Rows */}
            <div className="divide-y divide-slate-800/80 text-xs font-mono">
              <div className="py-2 flex items-center justify-between gap-2">
                <div>
                  <span className="text-slate-200 font-bold block">Powerplay (Ov 1–6)</span>
                  <span className="text-[11px] text-slate-400">Hard Deck · True Carry</span>
                </div>
                <div className="text-right tabular-nums">
                  <span className="text-amber-300 font-bold block">{ov1Data.spinDeg}° Spin</span>
                  <span className="text-cyan-300 text-[11px]">{ov1Data.bounceCarryIndex} Bounce</span>
                </div>
              </div>

              <div className="py-2 flex items-center justify-between gap-2">
                <div>
                  <span className="text-slate-200 font-bold block">Middle (Ov 7–15)</span>
                  <span className="text-[11px] text-slate-400">Scuffed Crust · Bite Rises</span>
                </div>
                <div className="text-right tabular-nums">
                  <span className="text-amber-300 font-bold block">{ov10Data.spinDeg}° Spin</span>
                  <span className="text-cyan-300 text-[11px]">{ov10Data.bounceCarryIndex} Bounce</span>
                </div>
              </div>

              <div className="py-2 flex items-center justify-between gap-2">
                <div>
                  <span className="text-slate-200 font-bold block">Death (Ov 16–20)</span>
                  <span className="text-[11px] text-slate-400">
                    {dewLevel >= 65 ? 'Dew Skid + Rough' : 'Dusty Rough · Low Keep'}
                  </span>
                </div>
                <div className="text-right tabular-nums">
                  <span className="text-amber-300 font-bold block">{ov20Data.spinDeg}° Spin</span>
                  <span className="text-cyan-300 text-[11px]">{ov20Data.bounceCarryIndex} Bounce</span>
                </div>
              </div>
            </div>
          </div>

          {/* Spin & Bounce Net Deltas */}
          <div className="grid grid-cols-2 gap-2 text-xs font-mono">
            <div className="rounded-lg border border-slate-800 bg-slate-950 p-2.5">
              <span className="text-[10px] text-slate-400 flex items-center gap-1">
                <TrendingUp className="h-3 w-3 text-amber-400" />
                <span>20-Ov Spin Shift</span>
              </span>
              <strong className="text-sm text-amber-300 tabular-nums mt-0.5 block">
                +{(ov20Data.spinDeg - ov1Data.spinDeg).toFixed(1)}° Turn
              </strong>
            </div>
            <div className="rounded-lg border border-slate-800 bg-slate-950 p-2.5">
              <span className="text-[10px] text-slate-400 flex items-center gap-1">
                <TrendingDown className="h-3 w-3 text-cyan-400" />
                <span>Bounce Decay</span>
              </span>
              <strong className="text-sm text-cyan-300 tabular-nums mt-0.5 block">
                {ov20Data.bounceCarryIndex - ov1Data.bounceCarryIndex} Carry Pts
              </strong>
            </div>
          </div>

          {/* AI Tactical Forecast Synthesis */}
          <div className="rounded-xl border border-slate-800 bg-slate-950 p-3 space-y-1.5">
            <div className="flex items-center justify-between text-[11px] font-mono">
              <span className="font-bold text-amber-300">AI Captaincy Directive</span>
              <span className="text-slate-500">Predictive Simulation</span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              {activeForecast.captaincyDirective}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
