import React, { useState, useMemo, useEffect } from 'react';
import {
  Gauge,
  RotateCw,
  Compass,
} from 'lucide-react';
import { cricketAudio } from '../../utils/audioSystem';
import { triggerHaptic, HAPTIC_PATTERNS } from '../../utils/haptics';
import { PitchDegradationForecastCard } from './PitchDegradationForecastCard';

export interface PitchSensorAndTossSuiteProps {
  stadiumName: string;
  temperature: number;
  humidity: number;
  windSpeed: number;
  dewLevel: number;
  pitchWear: number;
  grassCoverage: number;
  matchDay: number;
  onPitchAgeChange?: (dayIndex: number, wearPct: number, grassPct: number) => void;
}

interface BowlerRevPreset {
  id: string;
  label: string;
  bowlerExample: string;
  discipline: 'Pace' | 'Spin';
  baseRpm: number;
  seamAngleDeg: number;
  speedKmh: number;
  releaseNote: string;
}

const BOWLER_REV_PRESETS: BowlerRevPreset[] = [
  {
    id: 'pace-outswing',
    label: 'Express Outswinger',
    bowlerExample: 'J. Bumrah / P. Cummins',
    discipline: 'Pace',
    baseRpm: 2420,
    seamAngleDeg: 22,
    speedKmh: 143.8,
    releaseNote: 'Proud upright seam angled toward first slip creates laminar-turbulent pressure differential.',
  },
  {
    id: 'wobble-seam',
    label: 'Wobble-Seam Cutter',
    bowlerExample: 'J. Hazlewood / M. Siraj',
    discipline: 'Pace',
    baseRpm: 1980,
    seamAngleDeg: -14,
    speedKmh: 136.4,
    releaseNote: 'Off-axis seam precesses in flight and bites unpredictably off dry or cracked clay.',
  },
  {
    id: 'wrist-legbreak',
    label: 'Wrist-Spin Leg Break',
    bowlerExample: 'A. Zampa / R. Khan',
    discipline: 'Spin',
    baseRpm: 2760,
    seamAngleDeg: 44,
    speedKmh: 91.2,
    releaseNote: 'High overspin + side-spin RPM generates sharp Magnus dip before gripping the abrasive deck.',
  },
  {
    id: 'finger-offbreak',
    label: 'Finger Off-Break',
    bowlerExample: 'K. Maharaj / M. Santner',
    discipline: 'Spin',
    baseRpm: 2290,
    seamAngleDeg: -36,
    speedKmh: 87.6,
    releaseNote: 'Drifts outside off in crosswind before biting sharply back toward middle and leg stump.',
  },
];

const PITCH_AGE_STAGES = [
  { index: 0, label: 'Fresh', matchDay: 1, wear: 10, grass: 84, texture: 'Hard Rolled Turf' },
  { index: 1, label: 'Day 1', matchDay: 1, wear: 18, grass: 76, texture: 'Firm Binding Grass' },
  { index: 2, label: 'Day 2', matchDay: 2, wear: 34, grass: 60, texture: 'Settled Clay Sheen' },
  { index: 3, label: 'Day 3', matchDay: 3, wear: 54, grass: 42, texture: 'Scuffed Footmarks' },
  { index: 4, label: 'Day 4', matchDay: 4, wear: 76, grass: 24, texture: 'Abrasive Micro-Cracks' },
  { index: 5, label: 'Day 5', matchDay: 5, wear: 92, grass: 11, texture: 'Dusty Fissured Deck' },
];

export const PitchSensorAndTossSuite: React.FC<PitchSensorAndTossSuiteProps> = ({
  stadiumName,
  temperature,
  humidity,
  windSpeed,
  dewLevel,
  pitchWear,
  grassCoverage,
  matchDay,
  onPitchAgeChange,
}) => {
  // Pitch Age index (0 = Fresh .. 5 = Day 5)
  const [pitchAgeIdx, setPitchAgeIdx] = useState<number>(() =>
    pitchWear < 15 ? 0 : Math.min(5, Math.max(1, matchDay))
  );
  const [matchOverProgress, setMatchOverProgress] = useState<number>(8);

  // Ball Revolution Tracker controls
  const [selectedRevPresetId, setSelectedRevPresetId] = useState<string>('wrist-legbreak');
  const [rpmOffset, setRpmOffset] = useState<number>(0);
  const [seamAngleOverride, setSeamAngleOverride] = useState<number | null>(null);

  useEffect(() => {
    const syncedIdx = pitchWear < 15 ? 0 : Math.min(5, Math.max(1, matchDay));
    setPitchAgeIdx(syncedIdx);
  }, [matchDay, pitchWear]);

  const activeStage = PITCH_AGE_STAGES[pitchAgeIdx] || PITCH_AGE_STAGES[1];

  // 20-Over Pitch Degradation Forecast Curve
  const degradationSeries = useMemo(() => {
    const points = [1, 4, 8, 12, 16, 20];
    const baseWear = activeStage.wear;
    const heatFactor = Math.max(0.75, temperature / 28);
    const moistureDampener = dewLevel > 65 ? 0.84 : 1.0;

    return points.map((ov) => {
      const overProgress = ov / 20;
      const surfaceDust = Math.min(
        98,
        Math.round(baseWear * 0.72 + overProgress * 28 * heatFactor)
      );
      const spinTurnProb = Math.min(
        96,
        Math.max(
          14,
          Math.round((baseWear * 0.58 + overProgress * 26 * heatFactor) * moistureDampener)
        )
      );
      const bounceCarry = Math.max(
        42,
        Math.min(
          96,
          Math.round(92 - baseWear * 0.34 - overProgress * 12 + grassCoverage * 0.12)
        )
      );

      return {
        over: `Ov ${ov}`,
        overNum: ov,
        spinTurnProb,
        bounceCarry,
        surfaceDust,
      };
    });
  }, [activeStage.wear, temperature, dewLevel, grassCoverage]);

  // Simulated Pitch Surface Sensor Readings: Topsoil Hardness (kPa) & Surface Friction (CoR)
  const sensorReadings = useMemo(() => {
    // Topsoil Hardness ranges ~220 kPa (damp/worn) to 560 kPa (hard baked Bulli clay)
    const rawHardnessKpa =
      465 +
      (temperature - 25) * 3.4 -
      humidity * 1.15 -
      dewLevel * 0.65 -
      activeStage.wear * 0.85 -
      matchOverProgress * 1.6;
    const topsoilHardnessKpa = Math.max(210, Math.min(580, Math.round(rawHardnessKpa)));

    // Surface Friction / Restitution CoR (0.42–0.82)
    const rawFrictionCor =
      0.52 +
      activeStage.wear * 0.0024 +
      matchOverProgress * 0.0035 -
      (dewLevel / 100) * 0.14 +
      (grassCoverage / 100) * 0.04;
    const surfaceFrictionCor = Number(Math.max(0.42, Math.min(0.84, rawFrictionCor)).toFixed(2));

    const hardnessPct = Math.round(((topsoilHardnessKpa - 200) / 380) * 100);
    const corPct = Math.round(((surfaceFrictionCor - 0.4) / 0.45) * 100);

    return {
      topsoilHardnessKpa,
      surfaceFrictionCor,
      hardnessPct: Math.max(6, Math.min(98, hardnessPct)),
      corPct: Math.max(6, Math.min(98, corPct)),
    };
  }, [temperature, humidity, dewLevel, activeStage.wear, matchOverProgress, grassCoverage]);

  // Ball Revolution Tracker calculations
  const activeRevPreset =
    BOWLER_REV_PRESETS.find((p) => p.id === selectedRevPresetId) || BOWLER_REV_PRESETS[2];
  const liveRpm = Math.max(850, Math.min(3100, activeRevPreset.baseRpm + rpmOffset));
  const liveSeamAngle =
    seamAngleOverride !== null ? seamAngleOverride : activeRevPreset.seamAngleDeg;

  const trajectoryMetrics = useMemo(() => {
    const rpmFactor = liveRpm / 2400;
    const angleRad = (liveSeamAngle * Math.PI) / 180;
    const lateralDriftDeg = Number(
      (Math.sin(angleRad) * rpmFactor * (activeRevPreset.discipline === 'Spin' ? 4.6 : 2.4) *
        (1 + windSpeed / 90)).toFixed(1)
    );
    const postPitchBreakDeg = Number(
      (
        Math.sin(angleRad) *
        rpmFactor *
        (activeRevPreset.discipline === 'Spin'
          ? 2.2 + sensorReadings.surfaceFrictionCor * 4.5
          : 1.4 + (grassCoverage / 100) * 1.8)
      ).toFixed(1)
    );
    const magnusDipCm = Number(
      ((liveRpm / 1000) * (activeRevPreset.discipline === 'Spin' ? 5.8 : 2.1)).toFixed(1)
    );

    return {
      lateralDriftDeg,
      postPitchBreakDeg,
      magnusDipCm,
    };
  }, [liveRpm, liveSeamAngle, activeRevPreset.discipline, windSpeed, sensorReadings.surfaceFrictionCor, grassCoverage]);

  // Venue-calibrated Toss Impact Analyzer
  const tossAnalysis = useMemo(() => {
    const lowerVenue = stadiumName.toLowerCase();
    let historicChaseBase = 53;
    if (lowerVenue.includes('ahmedabad') || lowerVenue.includes('wankhede') || lowerVenue.includes('dubai')) {
      historicChaseBase = 58;
    } else if (lowerVenue.includes('kensington') || lowerVenue.includes('barbados') || lowerVenue.includes('colombo')) {
      historicChaseBase = 47;
    } else if (lowerVenue.includes('melbourne') || lowerVenue.includes('lord')) {
      historicChaseBase = 51;
    }

    // Dynamic environmental modifiers
    const dewChaseBoost = dewLevel >= 65 ? 8.5 : dewLevel >= 40 ? 3.5 : -2.0;
    const humiditySwingBoost = humidity >= 75 && grassCoverage >= 55 ? 4.0 : 0;
    const dryWearBatFirstBoost = activeStage.wear >= 60 && dewLevel < 45 ? -9.5 : 0;
    const bakingHeatBoost = temperature >= 35 && dewLevel < 40 ? -4.0 : 0;

    const bowlFirstWinProb = Math.max(
      34,
      Math.min(
        74,
        Math.round(historicChaseBase + dewChaseBoost + humiditySwingBoost + dryWearBatFirstBoost + bakingHeatBoost)
      )
    );
    const batFirstWinProb = 100 - bowlFirstWinProb;
    const optimalDecision = bowlFirstWinProb >= 51 ? 'BOWL FIRST' : 'BAT FIRST';
    const edgePct = Math.abs(bowlFirstWinProb - batFirstWinProb);

    const rationale =
      optimalDecision === 'BOWL FIRST'
        ? dewLevel >= 55
          ? `Evening condensation (${dewLevel}% dew index) will coat the grass in the 2nd innings, reducing finger-spin friction to ${sensorReadings.surfaceFrictionCor} CoR and skidding the ball cleanly onto the bat.`
          : `Fresh grass cover (${grassCoverage}%) and ${humidity}% relative humidity offer early seam movement in Overs 1–6 before flattening out for the chase.`
        : `High surface wear (${activeStage.wear}%) and low evening dew (${dewLevel}%) mean the pitch will crumble into a ${activeStage.texture.toLowerCase()} surface in the 2nd innings, elevating spin turn probability to ${degradationSeries[degradationSeries.length - 1]?.spinTurnProb || 72}%.`;

    return {
      optimalDecision,
      bowlFirstWinProb,
      batFirstWinProb,
      edgePct,
      historicChaseBase,
      rationale,
    };
  }, [
    stadiumName,
    dewLevel,
    humidity,
    grassCoverage,
    activeStage.wear,
    activeStage.texture,
    temperature,
    sensorReadings.surfaceFrictionCor,
    degradationSeries,
  ]);

  return (
    <div className="space-y-6">
      {/* FULL-WIDTH AI-DRIVEN PITCH DEGRADATION FORECAST CARD (8-FRAME CSS STEPS FILMSTRIP + 20-OVER CURVE) */}
      <PitchDegradationForecastCard
        stadiumName={stadiumName}
        temperature={temperature}
        humidity={humidity}
        dewLevel={dewLevel}
        pitchWear={activeStage.wear}
        grassCoverage={activeStage.grass}
        matchDay={activeStage.matchDay}
        compact
        onPitchAgeChange={(dayIdx, wearPct, grassPct) => {
          const matchedStage = PITCH_AGE_STAGES.find((s) => s.wear === wearPct);
          if (matchedStage) {
            setPitchAgeIdx(matchedStage.index);
          }
          if (onPitchAgeChange) {
            onPitchAgeChange(dayIdx, wearPct, grassPct);
          }
        }}
      />

      {/* ROW 2: PITCH SURFACE SENSOR READINGS + TOSS IMPACT ANALYZER */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* LEFT (6 cols): Pitch Surface Sensor Gauges (Topsoil Hardness kPa & Surface Friction CoR) */}
        <div className="lg:col-span-6 min-w-0 rounded-2xl border border-slate-800 bg-slate-950/85 p-5 flex flex-col justify-between space-y-4">
          <div className="border-b border-slate-800/80 pb-3">
            <div className="flex items-center gap-2 text-xs font-mono text-cyan-400">
              <Gauge className="h-3.5 w-3.5" />
              <span>Sub-Surface Turf Telemetry</span>
            </div>
            <h4 className="text-base font-bold text-white mt-0.5">
              Pitch Surface Sensor Readings
            </h4>
            <p className="text-xs text-slate-400 mt-0.5">
              Simulated Clegg-hammer topsoil hardness and ball-turf restitution gauges across match progression.
            </p>
          </div>

          {/* Match Over Scrubber for Live Sensor Progression */}
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-3 space-y-1.5">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-slate-300">Match Over Progression</span>
              <strong className="text-cyan-300 tabular-nums">Over {matchOverProgress}.0 / 20.0</strong>
            </div>
            <input
              type="range"
              min={1}
              max={20}
              value={matchOverProgress}
              onChange={(e) => setMatchOverProgress(Number(e.target.value))}
              className="w-full accent-cyan-400 cursor-pointer"
              aria-label="Simulate match over progression for pitch sensors"
            />
          </div>

          {/* Dual Semi-Circular Sensor Gauges */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Gauge 1: Topsoil Hardness (kPa) */}
            <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-3.5 flex flex-col items-center text-center">
              <span className="text-[11px] font-mono text-slate-400">Topsoil Hardness</span>
              <svg className="w-36 h-24 mt-1" viewBox="0 0 160 95">
                <path
                  d="M 18 82 A 62 62 0 0 1 142 82"
                  fill="none"
                  stroke="#1e293b"
                  strokeWidth="12"
                  strokeLinecap="round"
                />
                <path
                  d="M 18 82 A 62 62 0 0 1 142 82"
                  fill="none"
                  stroke="#06b6d4"
                  strokeWidth="12"
                  strokeLinecap="round"
                  strokeDasharray="195"
                  strokeDashoffset={195 - (sensorReadings.hardnessPct / 100) * 195}
                  className="transition-all duration-500"
                />
                <text
                  x="80"
                  y="70"
                  textAnchor="middle"
                  className="fill-white font-mono font-bold text-xl"
                >
                  {sensorReadings.topsoilHardnessKpa}
                </text>
                <text x="80" y="86" textAnchor="middle" className="fill-cyan-400 font-mono text-[10px]">
                  kPa Clegg Index
                </text>
              </svg>
              <span className="text-[11px] text-slate-300 mt-1">
                {sensorReadings.topsoilHardnessKpa >= 420
                  ? 'High pace carry & steep bounce'
                  : sensorReadings.topsoilHardnessKpa >= 320
                  ? 'Balanced sporting pace'
                  : 'Softened slow-holding turf'}
              </span>
            </div>

            {/* Gauge 2: Surface Friction (CoR) */}
            <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-3.5 flex flex-col items-center text-center">
              <span className="text-[11px] font-mono text-slate-400">Surface Friction (CoR)</span>
              <svg className="w-36 h-24 mt-1" viewBox="0 0 160 95">
                <path
                  d="M 18 82 A 62 62 0 0 1 142 82"
                  fill="none"
                  stroke="#1e293b"
                  strokeWidth="12"
                  strokeLinecap="round"
                />
                <path
                  d="M 18 82 A 62 62 0 0 1 142 82"
                  fill="none"
                  stroke="#f59e0b"
                  strokeWidth="12"
                  strokeLinecap="round"
                  strokeDasharray="195"
                  strokeDashoffset={195 - (sensorReadings.corPct / 100) * 195}
                  className="transition-all duration-500"
                />
                <text
                  x="80"
                  y="70"
                  textAnchor="middle"
                  className="fill-white font-mono font-bold text-xl"
                >
                  {sensorReadings.surfaceFrictionCor}
                </text>
                <text x="80" y="86" textAnchor="middle" className="fill-amber-400 font-mono text-[10px]">
                  CoR Grip Factor
                </text>
              </svg>
              <span className="text-[11px] text-slate-300 mt-1">
                {sensorReadings.surfaceFrictionCor >= 0.68
                  ? 'Aggressive spin bite & hold'
                  : sensorReadings.surfaceFrictionCor >= 0.54
                  ? 'True off-deck traction'
                  : 'Dew-skid low friction'}
              </span>
            </div>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-900/50 px-3.5 py-2.5 text-xs text-slate-300 flex items-center justify-between font-mono">
            <span>Projected Ball Skid vs Bite:</span>
            <strong className="text-cyan-300 tabular-nums">
              {dewLevel > 60 ? `+${Math.round(dewLevel * 0.18)}% Skid` : `+${(sensorReadings.surfaceFrictionCor * 5.2).toFixed(1)}° Grip`}
            </strong>
          </div>
        </div>

        {/* RIGHT (6 cols): Ball Revolution Tracker */}
        <div className="lg:col-span-6 min-w-0 rounded-2xl border border-slate-800 bg-slate-950/85 p-5 space-y-4">
          <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-800/80 pb-3">
            <div>
              <div className="flex items-center gap-2 text-xs font-mono text-cyan-400">
                <RotateCw className="h-3.5 w-3.5" />
                <span>Ball Revolution & Seam Orientation Tracker</span>
              </div>
              <h4 className="text-base font-bold text-white mt-0.5">
                Real-Time Release RPM & Linked 22-Yard Trajectory
              </h4>
            </div>
            <div className="text-right font-mono text-xs">
              <span className="text-amber-300 font-bold tabular-nums">{liveRpm.toLocaleString()} RPM</span>
              <span className="text-slate-500 mx-1.5">·</span>
              <span className="text-cyan-300 font-bold tabular-nums">
                {liveSeamAngle > 0 ? `+${liveSeamAngle}°` : `${liveSeamAngle}°`} Seam
              </span>
            </div>
          </div>

          {/* Bowler Discipline Preset Selector */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {BOWLER_REV_PRESETS.map((preset) => {
              const active = preset.id === selectedRevPresetId;
              return (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => {
                    setSelectedRevPresetId(preset.id);
                    setRpmOffset(0);
                    setSeamAngleOverride(null);
                    cricketAudio.playUiClick();
                    triggerHaptic(HAPTIC_PATTERNS.TAP);
                  }}
                  className={`rounded-xl border p-2.5 text-left transition-all cursor-pointer ${
                    active
                      ? 'border-cyan-400 bg-cyan-950/40 text-white'
                      : 'border-slate-800 bg-slate-900/60 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <span className="text-xs font-bold block truncate">{preset.label}</span>
                  <span className="text-[10px] font-mono text-slate-400 block truncate mt-0.5">
                    {preset.baseRpm} RPM · {preset.speedKmh} km/h
                  </span>
                </button>
              );
            })}
          </div>

          {/* Rotating Seam Axis Visualizer + Linked Trajectory SVG */}
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-center">
            {/* 3D-Styled Cricket Ball & Seam Axis */}
            <div className="sm:col-span-4 flex flex-col items-center justify-center rounded-xl border border-slate-800 bg-slate-900/70 p-4">
              <div className="relative h-24 w-24 rounded-full bg-gradient-to-br from-rose-500 via-red-700 to-rose-950 shadow-[inset_-8px_-8px_18px_rgba(0,0,0,0.65),0_0_20px_rgba(244,63,94,0.25)] flex items-center justify-center overflow-hidden">
                {/* Specular highlight */}
                <div className="absolute top-3 left-4 h-5 w-7 rounded-full bg-white/25 blur-[2px]" />
                {/* Tilted Seam Band */}
                <div
                  className="h-28 w-3 border-x-2 border-dashed border-amber-100/90 bg-rose-950/50 transition-transform duration-300"
                  style={{ transform: `rotate(${liveSeamAngle}deg)` }}
                />
              </div>
              <span className="text-[11px] font-mono text-slate-300 mt-2 tabular-nums">
                {activeRevPreset.bowlerExample}
              </span>
              <span className="text-[10px] font-mono text-cyan-400 tabular-nums">
                Magnus Dip: -{trajectoryMetrics.magnusDipCm} cm
              </span>
            </div>

            {/* Sliders + Linked Ball Flight Path */}
            <div className="sm:col-span-8 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-mono">
                <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-2.5">
                  <div className="flex justify-between mb-1">
                    <span className="text-slate-400">Spin / Seam RPM</span>
                    <strong className="text-amber-300 tabular-nums">{liveRpm} RPM</strong>
                  </div>
                  <input
                    type="range"
                    min={-400}
                    max={400}
                    step={25}
                    value={rpmOffset}
                    onChange={(e) => setRpmOffset(Number(e.target.value))}
                    className="w-full accent-amber-400 cursor-pointer"
                    aria-label="Adjust ball revolutions per minute"
                  />
                </div>

                <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-2.5">
                  <div className="flex justify-between mb-1">
                    <span className="text-slate-400">Seam Tilt Angle</span>
                    <strong className="text-cyan-300 tabular-nums">{liveSeamAngle}°</strong>
                  </div>
                  <input
                    type="range"
                    min={-55}
                    max={55}
                    step={1}
                    value={liveSeamAngle}
                    onChange={(e) => setSeamAngleOverride(Number(e.target.value))}
                    className="w-full accent-cyan-400 cursor-pointer"
                    aria-label="Adjust seam rotation angle in degrees"
                  />
                </div>
              </div>

              {/* Linked 22-Yard Trajectory SVG */}
              <div className="rounded-xl border border-slate-800 bg-slate-950 p-3 space-y-1.5">
                <div className="flex items-center justify-between text-[10px] font-mono text-slate-400">
                  <span>Release ({activeRevPreset.speedKmh} km/h)</span>
                  <span className="text-cyan-300 tabular-nums">
                    Drift: {trajectoryMetrics.lateralDriftDeg > 0 ? '+' : ''}
                    {trajectoryMetrics.lateralDriftDeg}°
                  </span>
                  <span className="text-amber-300 tabular-nums">
                    Break: {trajectoryMetrics.postPitchBreakDeg > 0 ? '+' : ''}
                    {trajectoryMetrics.postPitchBreakDeg}°
                  </span>
                  <span>Stumps</span>
                </div>
                <svg className="w-full h-14" viewBox="0 0 420 56" preserveAspectRatio="none">
                  <line x1="16" y1="28" x2="404" y2="28" stroke="#334155" strokeDasharray="4 4" strokeWidth="1" />
                  <path
                    d={`M 16 28 Q 165 ${28 - trajectoryMetrics.lateralDriftDeg * 3.5} 285 ${
                      28 - trajectoryMetrics.lateralDriftDeg * 1.6
                    } L 404 ${Math.max(6, Math.min(50, 28 + trajectoryMetrics.postPitchBreakDeg * 3.8))}`}
                    fill="none"
                    stroke="#22d3ee"
                    strokeWidth="2.75"
                  />
                  <circle cx="16" cy="28" r="3.5" fill="#38bdf8" />
                  <circle cx="285" cy={28 - trajectoryMetrics.lateralDriftDeg * 1.6} r="4.5" fill="#f59e0b" />
                  <circle
                    cx="404"
                    cy={Math.max(6, Math.min(50, 28 + trajectoryMetrics.postPitchBreakDeg * 3.8))}
                    r="4"
                    fill="#f43f5e"
                  />
                </svg>
                <p className="text-[11px] text-slate-400 leading-snug">{activeRevPreset.releaseNote}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ROW 3: TOSS IMPACT ANALYZER */}
      <div className="rounded-2xl border border-slate-800 bg-slate-950/85 p-5 space-y-4">
        <div className="space-y-4">
          <div className="border-b border-slate-800/80 pb-3">
            <div className="flex items-center gap-2 text-xs font-mono text-emerald-400">
              <Compass className="h-3.5 w-3.5" />
              <span>Toss Impact Analyzer</span>
            </div>
            <h4 className="text-base font-bold text-white mt-0.5">
              Optimal Toss Decision Model
            </h4>
            <p className="text-xs text-slate-400 mt-0.5 truncate">
              Calibrated for {stadiumName}
            </p>
          </div>

          {/* Primary Recommendation Callout */}
          <div className="rounded-xl border border-emerald-500/35 bg-emerald-950/25 p-4 space-y-2">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-slate-300">Recommended Call</span>
              <span className="text-emerald-300 font-bold tabular-nums">
                +{tossAnalysis.edgePct}% Win Expectancy Edge
              </span>
            </div>
            <div className="text-2xl font-black text-white tracking-tight">
              ELECT TO {tossAnalysis.optimalDecision}
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">{tossAnalysis.rationale}</p>
          </div>

          {/* Bat First vs Bowl First Win Split Bar */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-amber-300 font-bold tabular-nums">
                Bat First Win: {tossAnalysis.batFirstWinProb}%
              </span>
              <span className="text-cyan-300 font-bold tabular-nums">
                Bowl First Win: {tossAnalysis.bowlFirstWinProb}%
              </span>
            </div>
            <div className="h-3 w-full rounded-full bg-slate-800 overflow-hidden flex">
              <div
                className="h-full bg-amber-500 transition-all duration-500"
                style={{ width: `${tossAnalysis.batFirstWinProb}%` }}
              />
              <div
                className="h-full bg-cyan-400 transition-all duration-500"
                style={{ width: `${tossAnalysis.bowlFirstWinProb}%` }}
              />
            </div>
          </div>

          {/* Key Environmental Drivers */}
          <div className="grid grid-cols-3 gap-2 text-[11px] font-mono">
            <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-2.5">
              <span className="text-slate-400 block text-[10px]">Historic Chase</span>
              <strong className="text-white tabular-nums">{tossAnalysis.historicChaseBase}%</strong>
            </div>
            <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-2.5">
              <span className="text-slate-400 block text-[10px]">Dew Moisture</span>
              <strong className="text-cyan-300 tabular-nums">{dewLevel}%</strong>
            </div>
            <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-2.5">
              <span className="text-slate-400 block text-[10px]">Humidity / Wind</span>
              <strong className="text-amber-300 tabular-nums">
                {humidity}% · {windSpeed}k
              </strong>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
