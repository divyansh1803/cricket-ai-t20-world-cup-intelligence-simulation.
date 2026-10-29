import React, { useState, useMemo } from 'react';
import * as d3 from 'd3';
import {
  Compass,
  Droplets,
  Gauge,
  Layers,
  Wind,
  Activity,
  ArrowUpRight,
} from 'lucide-react';
import { cricketAudio } from '../../utils/audioSystem';
import { triggerHaptic, HAPTIC_PATTERNS } from '../../utils/haptics';

export interface SoilTypeProfile {
  id: string;
  name: string;
  regionTag: string;
  clayPct: number;
  siltPct: number;
  sandPct: number;
  baseShearKpa: number; // kPa (40 - 150 scale)
  baseMoisturePct: number; // % volumetric water content (8 - 42%)
  restitutionCoeff: number; // COR (0.42 - 0.68)
  stumpCarryCm: number; // Height at stumps from 6.2m good-length ball (stumps = 71.1cm)
  paceBounceRating: string;
  spinGripCoeff: number;
  color: string;
  accentHex: string;
  summary: string;
}

export const SOIL_PROFILES: SoilTypeProfile[] = [
  {
    id: 'black-cotton',
    name: 'Black Cotton Clay',
    regionTag: 'Western & Central India',
    clayPct: 74,
    siltPct: 18,
    sandPct: 8,
    baseShearKpa: 118,
    baseMoisturePct: 24,
    restitutionCoeff: 0.61,
    stumpCarryCm: 84,
    paceBounceRating: 'True Steep Carry',
    spinGripCoeff: 0.56,
    color: 'text-cyan-300',
    accentHex: '#06b6d4',
    summary:
      'High-smectite montmorillonite clay retains sub-surface moisture longer, producing true elastic rebound and waist-high carry before cracking late on Day 4–5.',
  },
  {
    id: 'bulli-loam',
    name: 'Australian Bulli Loam',
    regionTag: 'MCG · Gabba · Perth',
    clayPct: 82,
    siltPct: 11,
    sandPct: 7,
    baseShearKpa: 136,
    baseMoisturePct: 21,
    restitutionCoeff: 0.66,
    stumpCarryCm: 93,
    paceBounceRating: 'Chest-High Trampoline',
    spinGripCoeff: 0.49,
    color: 'text-emerald-300',
    accentHex: '#10b981',
    summary:
      'Ultra-dense compacted smectite clay delivers maximum soil shear resistance and steep rib-cage bounce for hit-the-deck express fast bowlers.',
  },
  {
    id: 'red-laterite',
    name: 'Red Laterite Soil',
    regionTag: 'Mumbai · Chennai · Galle',
    clayPct: 58,
    siltPct: 24,
    sandPct: 18,
    baseShearKpa: 88,
    baseMoisturePct: 15,
    restitutionCoeff: 0.55,
    stumpCarryCm: 76,
    paceBounceRating: 'Sharp Early · Abrasive Bite',
    spinGripCoeff: 0.74,
    color: 'text-amber-300',
    accentHex: '#f59e0b',
    summary:
      'Iron-oxide granular clay dries rapidly under solar load, loosening top-surface cohesion to give wrist and finger spinners vicious ragging turn.',
  },
  {
    id: 'english-marl',
    name: 'English Heavy Marl',
    regionTag: "Lord's · Edgbaston · Headingley",
    clayPct: 64,
    siltPct: 26,
    sandPct: 10,
    baseShearKpa: 82,
    baseMoisturePct: 31,
    restitutionCoeff: 0.52,
    stumpCarryCm: 74,
    paceBounceRating: 'Seam Indentation & Nibbling Cut',
    spinGripCoeff: 0.53,
    color: 'text-sky-300',
    accentHex: '#38bdf8',
    summary:
      'Cool temperate turf loam with perennial ryegrass roots holds higher capillary moisture, allowing the leather seam to indent and jag laterally.',
  },
  {
    id: 'coastal-silt',
    name: 'Coastal Alluvial Silt',
    regionTag: 'Mirpur · Dubai · Guyana',
    clayPct: 46,
    siltPct: 36,
    sandPct: 18,
    baseShearKpa: 64,
    baseMoisturePct: 18,
    restitutionCoeff: 0.46,
    stumpCarryCm: 63,
    paceBounceRating: 'Low Skiddy Two-Paced',
    spinGripCoeff: 0.69,
    color: 'text-purple-300',
    accentHex: '#a855f7',
    summary:
      'Lower cohesive shear resistance absorbs vertical ball kinetic energy on impact, keeping bounce below stump-top height and rewarding cutters.',
  },
];

interface WindRoseSector {
  direction: string;
  angleDeg: number;
  calmFreq: number; // < 12 km/h (%)
  moderateFreq: number; // 12 - 24 km/h (%)
  strongFreq: number; // > 24 km/h (%)
  totalFreq: number;
}

const COMPASS_SECTORS: { label: string; deg: number }[] = [
  { label: 'N', deg: 0 },
  { label: 'NE', deg: 45 },
  { label: 'E', deg: 90 },
  { label: 'SE', deg: 135 },
  { label: 'S', deg: 180 },
  { label: 'SW', deg: 225 },
  { label: 'W', deg: 270 },
  { label: 'NW', deg: 315 },
];

export interface PitchD3AnalyticsSuiteProps {
  stadiumName: string;
  temperature: number;
  humidity: number;
  windSpeed: number;
  windDirectionDeg: number;
  windDirectionLabel: string;
  dewLevel: number;
  pitchWear: number;
  grassCoverage: number;
  matchDay: number;
  onSelectWindDirection?: (deg: number, label: string) => void;
}

export const PitchD3AnalyticsSuite: React.FC<PitchD3AnalyticsSuiteProps> = ({
  stadiumName,
  temperature,
  humidity,
  windSpeed,
  windDirectionDeg,
  windDirectionLabel,
  dewLevel,
  pitchWear,
  grassCoverage,
  matchDay,
  onSelectWindDirection,
}) => {
  const [selectedSoilId, setSelectedSoilId] = useState<string>('black-cotton');
  const [hoveredSector, setHoveredSector] = useState<string | null>(null);
  const [driftMode, setDriftMode] = useState<'both' | 'pace' | 'spin'>('both');

  const activeSoil = useMemo(
    () => SOIL_PROFILES.find((s) => s.id === selectedSoilId) || SOIL_PROFILES[0],
    [selectedSoilId]
  );

  // Real-time adjusted soil shear resistance (kPa) & moisture content (%)
  const soilTelemetry = useMemo(() => {
    // Moisture rises with humidity, dew, and grass; drops with heat, matchDay, and wear
    const envMoistureDelta =
      (humidity - 55) * 0.14 +
      (dewLevel - 30) * 0.12 +
      (grassCoverage - 50) * 0.08 -
      (temperature - 26) * 0.35 -
      (matchDay - 1) * 2.4;

    const moisturePct = Math.round(
      Math.min(44, Math.max(6, activeSoil.baseMoisturePct + envMoistureDelta)) * 10
    ) / 10;

    // Shear resistance peaks at optimal compaction & moderate-low moisture; drops if waterlogged or pulverized
    const moisturePenalty = moisturePct > 28 ? (moisturePct - 28) * 1.45 : (20 - moisturePct) * 0.25;
    const wearPenalty = pitchWear > 65 ? (pitchWear - 65) * 0.45 : 0;
    const grassRootBind = (grassCoverage - 45) * 0.18;

    const shearKpa = Math.round(
      Math.min(150, Math.max(42, activeSoil.baseShearKpa - moisturePenalty - wearPenalty + grassRootBind))
    );

    // Projected bounce carry height at stumps (cm) & COR
    const corAdjusted = Number(
      Math.min(
        0.72,
        Math.max(
          0.41,
          activeSoil.restitutionCoeff + (shearKpa - activeSoil.baseShearKpa) * 0.0018 - (moisturePct - 22) * 0.0022
        )
      ).toFixed(2)
    );

    const projectedCarryCm = Math.round(
      Math.min(108, Math.max(52, activeSoil.stumpCarryCm + (shearKpa - 95) * 0.26 - (moisturePct - 22) * 0.32))
    );

    const spinFriction = Number(
      Math.min(0.88, Math.max(0.35, activeSoil.spinGripCoeff + (pitchWear - 35) * 0.0028 - (dewLevel - 35) * 0.002)).toFixed(2)
    );

    return {
      shearKpa,
      moisturePct,
      corAdjusted,
      projectedCarryCm,
      spinFriction,
    };
  }, [activeSoil, humidity, dewLevel, grassCoverage, temperature, matchDay, pitchWear]);

  // D3 Arc Generators for Circular Dials (-135 deg to +135 deg = 270 deg sweep)
  const dialPaths = useMemo(() => {
    const startAngle = (-135 * Math.PI) / 180;
    const endAngle = (135 * Math.PI) / 180;

    const shearScale = d3.scaleLinear().domain([40, 150]).range([startAngle, endAngle]).clamp(true);
    const moistureScale = d3.scaleLinear().domain([0, 45]).range([startAngle, endAngle]).clamp(true);

    const trackArc = d3
      .arc<unknown>()
      .innerRadius(62)
      .outerRadius(76)
      .startAngle(startAngle)
      .endAngle(endAngle)
      .cornerRadius(7);

    const shearValueAngle = shearScale(soilTelemetry.shearKpa);
    const shearActiveArc = d3
      .arc<unknown>()
      .innerRadius(62)
      .outerRadius(76)
      .startAngle(startAngle)
      .endAngle(shearValueAngle)
      .cornerRadius(7);

    const moistureValueAngle = moistureScale(soilTelemetry.moisturePct);
    const moistureActiveArc = d3
      .arc<unknown>()
      .innerRadius(62)
      .outerRadius(76)
      .startAngle(startAngle)
      .endAngle(moistureValueAngle)
      .cornerRadius(7);

    // Tick marks for dials
    const shearTicks = [40, 65, 95, 125, 150].map((val) => {
      const a = shearScale(val) - Math.PI / 2;
      return {
        val,
        x1: Math.cos(a) * 80,
        y1: Math.sin(a) * 80,
        x2: Math.cos(a) * 86,
        y2: Math.sin(a) * 86,
      };
    });

    const moistureTicks = [0, 12, 24, 34, 45].map((val) => {
      const a = moistureScale(val) - Math.PI / 2;
      return {
        val,
        x1: Math.cos(a) * 80,
        y1: Math.sin(a) * 80,
        x2: Math.cos(a) * 86,
        y2: Math.sin(a) * 86,
      };
    });

    // Bounce trajectory curve using d3.line
    const bounceLineGenerator = d3
      .line<[number, number]>()
      .x((d) => d[0])
      .y((d) => d[1])
      .curve(d3.curveCatmullRom.alpha(0.5));

    // Pitch side-profile coordinates: x from 16 (Bowler release) to 284 (Stumps), y from 12 (top) to 98 (ground)
    const groundY = 96;
    const pitchImpactX = 186;
    // Map cm height (0..115cm) to SVG y (groundY..14)
    const yScaleCm = d3.scaleLinear().domain([0, 115]).range([groundY, 14]).clamp(true);
    const stumpTopY = yScaleCm(71.1);
    const carryEndY = yScaleCm(soilTelemetry.projectedCarryCm);

    const preBouncePath = bounceLineGenerator([
      [18, yScaleCm(108)],
      [108, yScaleCm(54)],
      [pitchImpactX, groundY - 2],
    ]);

    const postBouncePath = bounceLineGenerator([
      [pitchImpactX, groundY - 2],
      [235, yScaleCm(soilTelemetry.projectedCarryCm * 0.68)],
      [286, carryEndY],
    ]);

    return {
      trackPath: trackArc({}) || '',
      shearPath: shearActiveArc({}) || '',
      moisturePath: moistureActiveArc({}) || '',
      shearNeedleDeg: (shearValueAngle * 180) / Math.PI,
      moistureNeedleDeg: (moistureValueAngle * 180) / Math.PI,
      shearTicks,
      moistureTicks,
      groundY,
      pitchImpactX,
      stumpTopY,
      carryEndY,
      preBouncePath: preBouncePath || '',
      postBouncePath: postBouncePath || '',
    };
  }, [soilTelemetry]);

  // Deterministic Venue Historical Wind Rose Data (360-degree 8 sectors)
  const windRoseData: WindRoseSector[] = useMemo(() => {
    let hash = 0;
    for (let i = 0; i < stadiumName.length; i++) {
      hash = (hash * 31 + stadiumName.charCodeAt(i)) % 9973;
    }
    const prevailingIndex = hash % 8;

    const raw = COMPASS_SECTORS.map((sec, idx) => {
      const dist = Math.min(
        Math.abs(idx - prevailingIndex),
        8 - Math.abs(idx - prevailingIndex)
      );
      const weight = dist === 0 ? 2.35 : dist === 1 ? 1.55 : dist === 2 ? 0.95 : 0.55;
      const seed = ((hash + idx * 137) % 100) / 100;

      const calm = Math.round((4.5 + seed * 3.2) * weight * 10) / 10;
      const moderate = Math.round((3.8 + ((1 - seed) * 2.8)) * weight * 10) / 10;
      const strong = Math.round((1.6 + seed * 2.4) * (dist <= 1 ? weight * 1.15 : weight * 0.65) * 10) / 10;
      return {
        direction: sec.label,
        angleDeg: sec.deg,
        calmFreq: calm,
        moderateFreq: moderate,
        strongFreq: strong,
        totalFreq: Number((calm + moderate + strong).toFixed(1)),
      };
    });

    // Normalize so sum of totalFreq === 100%
    const sum = raw.reduce((acc, s) => acc + s.totalFreq, 0) || 100;
    return raw.map((s) => {
      const calmFreq = Number(((s.calmFreq / sum) * 100).toFixed(1));
      const moderateFreq = Number(((s.moderateFreq / sum) * 100).toFixed(1));
      const strongFreq = Number(((s.strongFreq / sum) * 100).toFixed(1));
      return {
        ...s,
        calmFreq,
        moderateFreq,
        strongFreq,
        totalFreq: Number((calmFreq + moderateFreq + strongFreq).toFixed(1)),
      };
    });
  }, [stadiumName]);

  // D3 Polar Stacked Arcs for 360-Degree Wind Rose
  const windRoseVisuals = useMemo(() => {
    const maxSectorFreq = Math.max(24, ...windRoseData.map((d) => d.totalFreq));
    const rScale = d3.scaleLinear().domain([0, maxSectorFreq]).range([18, 96]);
    const sectorSweepRad = ((360 / 8 - 6) * Math.PI) / 180; // 39 deg wedge with 6 deg gap

    const sectors = windRoseData.map((sec) => {
      const centerRad = (sec.angleDeg * Math.PI) / 180;
      const startAngle = centerRad - sectorSweepRad / 2;
      const endAngle = centerRad + sectorSweepRad / 2;

      const r0 = 18;
      const r1 = rScale(sec.calmFreq);
      const r2 = rScale(sec.calmFreq + sec.moderateFreq);
      const r3 = rScale(sec.totalFreq);

      const calmArc = d3.arc<unknown>().innerRadius(r0).outerRadius(r1).startAngle(startAngle).endAngle(endAngle).cornerRadius(2)({}) || '';
      const modArc = d3.arc<unknown>().innerRadius(r1 + 1).outerRadius(r2).startAngle(startAngle).endAngle(endAngle).cornerRadius(2)({}) || '';
      const strongArc = d3.arc<unknown>().innerRadius(r2 + 1).outerRadius(r3).startAngle(startAngle).endAngle(endAngle).cornerRadius(3)({}) || '';

      // Label coordinates
      const labelAngle = centerRad - Math.PI / 2;
      const labelX = Math.cos(labelAngle) * 111;
      const labelY = Math.sin(labelAngle) * 111;

      return {
        ...sec,
        calmArc,
        modArc,
        strongArc,
        labelX,
        labelY,
      };
    });

    const gridRings = [8, 16, 24].filter((v) => v <= maxSectorFreq + 4).map((pct) => ({
      pct,
      r: rScale(pct),
    }));

    return { sectors, gridRings };
  }, [windRoseData]);

  // Predictive Crosswind Drift Model + D3 22-Yard Pitch Drift Paths
  const crosswindModel = useMemo(() => {
    const inspectedSectorObj = hoveredSector
      ? windRoseData.find((s) => s.direction === hoveredSector)
      : null;

    const effectiveDeg = inspectedSectorObj ? inspectedSectorObj.angleDeg : windDirectionDeg;
    const effectiveLabel = inspectedSectorObj ? inspectedSectorObj.direction : windDirectionLabel;

    // Pitch runs North (0 deg) to South (180 deg). Crosswind component = sin(angle)
    const rad = (effectiveDeg * Math.PI) / 180;
    const crossSin = Math.sin(rad); // +1 = East-to-West or West-to-East lateral push
    const headTailCos = Math.cos(rad);

    const crosswindKmh = Number((Math.abs(windSpeed * crossSin)).toFixed(1));
    const humidityFactor = 0.82 + (humidity / 100) * 0.45;

    // Lateral drift over 20.12m pitch in centimeters
    const paceDriftCm = Number(
      ((windSpeed * crossSin * 0.62 * humidityFactor) + (crossSin >= 0 ? 3.2 : -3.2)).toFixed(1)
    );
    const spinDriftCm = Number(
      ((windSpeed * crossSin * 0.94 * humidityFactor) + (crossSin >= 0 ? 4.8 : -4.8)).toFixed(1)
    );

    // Build top-down 22-yard SVG paths (viewBox 0 0 240 300; center stumps x = 120, bowler y = 264, striker y = 36)
    const xScaleCm = d3.scaleLinear().domain([-45, 45]).range([48, 192]).clamp(true);
    const lineGen = d3
      .line<[number, number]>()
      .x((d) => d[0])
      .y((d) => d[1])
      .curve(d3.curveCatmullRom.alpha(0.5));

    const paceMidX = xScaleCm(paceDriftCm * 0.55);
    const paceBounceX = xScaleCm(paceDriftCm * 0.85);
    const paceStumpX = xScaleCm(paceDriftCm + (soilTelemetry.shearKpa > 105 ? (paceDriftCm >= 0 ? 4 : -4) : 0));

    const spinMidX = xScaleCm(spinDriftCm * 0.65);
    const spinBounceX = xScaleCm(spinDriftCm);
    // Spin turns sharply opposite to drift after pitching!
    const spinTurnCm = (spinDriftCm >= 0 ? -1 : 1) * (soilTelemetry.spinFriction * 22);
    const spinStumpX = xScaleCm(spinDriftCm + spinTurnCm);

    const paceCurve =
      lineGen([
        [120, 264],
        [paceMidX, 165],
        [paceBounceX, 94],
        [paceStumpX, 36],
      ]) || '';

    const spinCurve =
      lineGen([
        [120, 264],
        [spinMidX, 158],
        [spinBounceX, 86],
        [spinStumpX, 36],
      ]) || '';

    const corridorTarget =
      Math.abs(paceDriftCm) < 6
        ? 'Attack top of off-stump directly; minimal crosswind compensation needed.'
        : paceDriftCm > 0
        ? `Aim ${Math.abs(Math.round(paceDriftCm))} cm wider on leg/middle; crosswind pushes late outswing toward 1st slip.`
        : `Start on 5th-stump channel; ${Math.abs(Math.round(paceDriftCm))} cm inward crosswind tails back into front pad.`;

    return {
      effectiveDeg,
      effectiveLabel,
      crosswindKmh,
      headTailKmh: Number((windSpeed * headTailCos).toFixed(1)),
      paceDriftCm,
      spinDriftCm,
      paceBounceX,
      paceStumpX,
      spinBounceX,
      spinStumpX,
      paceCurve,
      spinCurve,
      corridorTarget,
      prevailingSector: [...windRoseData].sort((a, b) => b.totalFreq - a.totalFreq)[0],
    };
  }, [hoveredSector, windRoseData, windDirectionDeg, windDirectionLabel, windSpeed, humidity, soilTelemetry]);

  return (
    <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-stretch">
      {/* =====================================================================
          LEFT PANEL (6 COLS): INTERACTIVE SOIL SHEAR & MOISTURE CIRCULAR DIALS
          ===================================================================== */}
      <div className="xl:col-span-6 min-w-0 rounded-2xl border border-cyan-500/25 bg-slate-950/85 p-5 flex flex-col justify-between space-y-5 shadow-xl">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/90 pb-3">
          <div>
            <div className="flex items-center gap-2 text-xs font-mono text-cyan-400 font-semibold">
              <Gauge className="h-4 w-4 text-cyan-400 shrink-0" />
              <span>Turf Mechanics & Sub-Surface Telemetry</span>
            </div>
            <h3 className="text-base sm:text-lg font-bold text-white tracking-tight mt-0.5">
              Soil Shear Resistance & Moisture Dials
            </h3>
          </div>
          <div className="text-xs font-mono text-slate-400 tabular-nums">
            <span>Day {matchDay}</span>
            <span className="mx-1.5 text-slate-600">·</span>
            <span className={activeSoil.color}>{activeSoil.regionTag}</span>
          </div>
        </div>

        {/* Soil Type Selector Segmented Control */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="font-medium text-slate-300">Select Venue Pitch Soil Profile</span>
            <span className="font-mono tabular-nums text-[11px] text-slate-400">
              Clay {activeSoil.clayPct}% · Silt {activeSoil.siltPct}% · Sand {activeSoil.sandPct}%
            </span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5 p-1 rounded-xl bg-slate-900/90 border border-slate-800/80">
            {SOIL_PROFILES.map((soil) => {
              const isSelected = soil.id === selectedSoilId;
              return (
                <button
                  key={soil.id}
                  type="button"
                  onClick={() => {
                    setSelectedSoilId(soil.id);
                    cricketAudio.playBatHit();
                    triggerHaptic(HAPTIC_PATTERNS.TAP);
                  }}
                  className={`rounded-lg px-2.5 py-2 text-xs font-semibold transition-all cursor-pointer truncate ${
                    isSelected
                      ? 'bg-cyan-500 text-slate-950 font-bold shadow-sm'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800/70'
                  }`}
                  title={soil.name}
                >
                  {soil.name.replace('Australian ', '').replace(' Soil', '').replace(' Clay', '')}
                </button>
              );
            })}
          </div>
        </div>

        {/* Dual Circular D3 Arc Dials */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
          {/* DIAL 1: SOIL SHEAR RESISTANCE (kPa) */}
          <div className="rounded-xl border border-slate-800/90 bg-slate-900/50 p-4 flex flex-col items-center">
            <span className="text-xs font-medium text-slate-300 mb-1">Soil Shear Resistance</span>
            <div className="relative h-44 w-44 flex items-center justify-center">
              <svg viewBox="-100 -100 200 200" className="h-full w-full overflow-visible">
                <defs>
                  <linearGradient id="shearDialGrad" x1="0%" y1="100%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#f59e0b" />
                    <stop offset="55%" stopColor="#06b6d4" />
                    <stop offset="100%" stopColor="#10b981" />
                  </linearGradient>
                </defs>

                {/* Background Arc */}
                <path d={dialPaths.trackPath} fill="#1e293b" />

                {/* Active Shear Arc */}
                <path
                  d={dialPaths.shearPath}
                  fill="url(#shearDialGrad)"
                  className="transition-all duration-500 ease-out"
                />

                {/* Ticks */}
                {dialPaths.shearTicks.map((t) => (
                  <line
                    key={t.val}
                    x1={t.x1}
                    y1={t.y1}
                    x2={t.x2}
                    y2={t.y2}
                    stroke="#64748b"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                  />
                ))}

                {/* Needle */}
                <g
                  transform={`rotate(${dialPaths.shearNeedleDeg})`}
                  className="transition-transform duration-500 ease-out"
                >
                  <line
                    x1="0"
                    y1="8"
                    x2="0"
                    y2="-56"
                    stroke={activeSoil.accentHex}
                    strokeWidth="2.5"
                    strokeLinecap="round"
                  />
                  <circle cx="0" cy="0" r="4.5" fill="#e2e8f0" />
                </g>
              </svg>

              {/* Digital Center Readout */}
              <div className="absolute bottom-3 inset-x-0 text-center pointer-events-none">
                <div className="text-2xl font-black font-mono tabular-nums text-white leading-none">
                  {soilTelemetry.shearKpa}
                  <span className="text-xs font-semibold text-cyan-400 ml-1">kPa</span>
                </div>
                <span className="text-[11px] text-slate-400 block mt-1">
                  {soilTelemetry.shearKpa >= 115
                    ? 'High Compaction'
                    : soilTelemetry.shearKpa >= 80
                    ? 'Balanced Binding'
                    : 'Friable Top Crust'}
                </span>
              </div>
            </div>
          </div>

          {/* DIAL 2: VOLUMETRIC MOISTURE CONTENT (%) */}
          <div className="rounded-xl border border-slate-800/90 bg-slate-900/50 p-4 flex flex-col items-center">
            <span className="text-xs font-medium text-slate-300 mb-1">Capillary Moisture Content</span>
            <div className="relative h-44 w-44 flex items-center justify-center">
              <svg viewBox="-100 -100 200 200" className="h-full w-full overflow-visible">
                <defs>
                  <linearGradient id="moistureDialGrad" x1="0%" y1="100%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#f97316" />
                    <stop offset="50%" stopColor="#38bdf8" />
                    <stop offset="100%" stopColor="#06b6d4" />
                  </linearGradient>
                </defs>

                {/* Background Arc */}
                <path d={dialPaths.trackPath} fill="#1e293b" />

                {/* Active Moisture Arc */}
                <path
                  d={dialPaths.moisturePath}
                  fill="url(#moistureDialGrad)"
                  className="transition-all duration-500 ease-out"
                />

                {/* Ticks */}
                {dialPaths.moistureTicks.map((t) => (
                  <line
                    key={t.val}
                    x1={t.x1}
                    y1={t.y1}
                    x2={t.x2}
                    y2={t.y2}
                    stroke="#64748b"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                  />
                ))}

                {/* Needle */}
                <g
                  transform={`rotate(${dialPaths.moistureNeedleDeg})`}
                  className="transition-transform duration-500 ease-out"
                >
                  <line
                    x1="0"
                    y1="8"
                    x2="0"
                    y2="-56"
                    stroke="#38bdf8"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                  />
                  <circle cx="0" cy="0" r="4.5" fill="#e2e8f0" />
                </g>
              </svg>

              {/* Digital Center Readout */}
              <div className="absolute bottom-3 inset-x-0 text-center pointer-events-none">
                <div className="text-2xl font-black font-mono tabular-nums text-white leading-none">
                  {soilTelemetry.moisturePct.toFixed(1)}
                  <span className="text-xs font-semibold text-sky-400 ml-0.5">%</span>
                </div>
                <span className="text-[11px] text-slate-400 block mt-1">
                  {soilTelemetry.moisturePct >= 27
                    ? 'Lush Seam Hydration'
                    : soilTelemetry.moisturePct >= 16
                    ? 'True Sporting Cure'
                    : 'Desiccated Spin Crust'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Projected Bounce Impact Side-Profile Visualizer */}
        <div className="rounded-xl border border-slate-800/90 bg-slate-900/60 p-4 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2">
              <Layers className="h-3.5 w-3.5 text-amber-400" />
              <span className="font-semibold text-white">
                Projected Bounce Impact ({activeSoil.name})
              </span>
            </div>
            <div className="flex items-center gap-2 font-mono tabular-nums text-xs">
              <span className="text-slate-400">
                COR <strong className="text-cyan-300">{soilTelemetry.corAdjusted}</strong>
              </span>
              <span className="text-slate-600">·</span>
              <span className="text-slate-400">
                Stump Carry <strong className="text-amber-300">{soilTelemetry.projectedCarryCm} cm</strong>
              </span>
              <span className="text-slate-600">·</span>
              <span className="text-slate-400">
                Spin μ <strong className="text-emerald-300">{soilTelemetry.spinFriction}</strong>
              </span>
            </div>
          </div>

          {/* D3 Side-Profile Bounce Trajectory SVG */}
          <div className="w-full rounded-lg bg-slate-950/90 border border-slate-800/80 px-3 py-2">
            <svg viewBox="0 0 310 112" className="w-full h-24 overflow-visible">
              {/* Pitch Turf Line */}
              <line
                x1="12"
                y1={dialPaths.groundY}
                x2="298"
                y2={dialPaths.groundY}
                stroke="#475569"
                strokeWidth="2"
              />
              {/* Stump Height Reference Line (71.1 cm) */}
              <line
                x1="12"
                y1={dialPaths.stumpTopY}
                x2="298"
                y2={dialPaths.stumpTopY}
                stroke="#64748b"
                strokeDasharray="3 3"
                strokeWidth="1"
              />
              <text x="16" y={dialPaths.stumpTopY - 4} fill="#94a3b8" fontSize="8.5" fontFamily="monospace">
                Bail Height (71.1 cm)
              </text>

              {/* Pre-bounce Delivery Flight */}
              <path
                d={dialPaths.preBouncePath}
                fill="none"
                stroke="#38bdf8"
                strokeWidth="2.2"
                strokeDasharray="4 2"
              />

              {/* Post-bounce Projected Carry */}
              <path
                d={dialPaths.postBouncePath}
                fill="none"
                stroke={activeSoil.accentHex}
                strokeWidth="3"
                className="transition-all duration-500"
              />

              {/* Impact Marker at Good Length (6.2m) */}
              <circle cx={dialPaths.pitchImpactX} cy={dialPaths.groundY - 2} r="4" fill="#f59e0b" />
              <text
                x={dialPaths.pitchImpactX - 28}
                y={dialPaths.groundY + 11}
                fill="#cbd5e1"
                fontSize="8.5"
                fontFamily="monospace"
              >
                6.2m Pitch Point
              </text>

              {/* Striker Stumps at x = 286 */}
              <line
                x1="286"
                y1={dialPaths.groundY}
                x2="286"
                y2={dialPaths.stumpTopY}
                stroke="#fde68a"
                strokeWidth="3"
                strokeLinecap="round"
              />

              {/* Ball at Popping Crease */}
              <circle
                cx="286"
                cy={dialPaths.carryEndY}
                r="5"
                fill="#f43f5e"
                className="transition-all duration-500"
              />
              <text
                x="232"
                y={Math.max(12, dialPaths.carryEndY - 7)}
                fill="#f8fafc"
                fontSize="9"
                fontWeight="bold"
                fontFamily="monospace"
              >
                {soilTelemetry.projectedCarryCm} cm
              </text>
            </svg>
          </div>

          <p className="text-xs text-slate-300 leading-relaxed">
            <strong className="text-white">{activeSoil.paceBounceRating}:</strong> {activeSoil.summary}
          </p>
        </div>
      </div>

      {/* =====================================================================
          RIGHT PANEL (6 COLS): 360° WIND ROSE RADAR & D3 PITCH DRIFT VECTOR
          ===================================================================== */}
      <div className="xl:col-span-6 min-w-0 rounded-2xl border border-cyan-500/25 bg-slate-950/85 p-5 flex flex-col justify-between space-y-5 shadow-xl">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/90 pb-3">
          <div>
            <div className="flex items-center gap-2 text-xs font-mono text-emerald-400 font-semibold">
              <Compass className="h-4 w-4 text-emerald-400 shrink-0" />
              <span>360° Historical Anemometer & Aerodynamics</span>
            </div>
            <h3 className="text-base sm:text-lg font-bold text-white tracking-tight mt-0.5">
              Venue Wind Rose Radar & Crosswind Drift Model
            </h3>
          </div>
          <div className="text-xs font-mono text-slate-400 tabular-nums">
            <span>Prevailing {crosswindModel.prevailingSector.direction}</span>
            <span className="mx-1.5 text-slate-600">·</span>
            <span className="text-emerald-300">
              Live {windSpeed} km/h {windDirectionLabel}
            </span>
          </div>
        </div>

        {/* Center Split: 360° Polar Wind Rose + D3 22-Yard Lateral Drift Map */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
          {/* 360° Wind Rose SVG */}
          <div className="md:col-span-7 rounded-xl border border-slate-800/90 bg-slate-900/50 p-3.5 flex flex-col items-center">
            <div className="w-full flex items-center justify-between text-[11px] text-slate-400 mb-1">
              <span>Click any compass sector to project wind vector</span>
              <span className="font-mono tabular-nums text-cyan-300">
                {hoveredSector
                  ? `${hoveredSector}: ${windRoseData.find((s) => s.direction === hoveredSector)?.totalFreq}% freq`
                  : `Active: ${windDirectionLabel}`}
              </span>
            </div>

            <svg viewBox="-132 -132 264 264" className="h-60 w-60 overflow-visible">
              {/* Concentric Frequency Reference Rings */}
              {windRoseVisuals.gridRings.map((ring) => (
                <g key={ring.pct}>
                  <circle
                    cx="0"
                    cy="0"
                    r={ring.r}
                    fill="none"
                    stroke="#1e293b"
                    strokeDasharray="3 3"
                    strokeWidth="1"
                  />
                  <text
                    x="3"
                    y={-ring.r + 9}
                    fill="#64748b"
                    fontSize="7.5"
                    fontFamily="monospace"
                  >
                    {ring.pct}%
                  </text>
                </g>
              ))}

              {/* Crosshair Axes */}
              <line x1="-102" y1="0" x2="102" y2="0" stroke="#1e293b" strokeWidth="1" />
              <line x1="0" y1="-102" x2="0" y2="102" stroke="#1e293b" strokeWidth="1" />

              {/* 8 Stacked Frequency Wedges */}
              {windRoseVisuals.sectors.map((sec) => {
                const isActive =
                  hoveredSector === sec.direction ||
                  (!hoveredSector && sec.direction === windDirectionLabel);
                return (
                  <g
                    key={sec.direction}
                    onMouseEnter={() => setHoveredSector(sec.direction)}
                    onMouseLeave={() => setHoveredSector(null)}
                    onClick={() => {
                      if (onSelectWindDirection) {
                        onSelectWindDirection(sec.angleDeg, sec.direction);
                      }
                      cricketAudio.playUiClick();
                      triggerHaptic(HAPTIC_PATTERNS.TAP);
                    }}
                    className="cursor-pointer transition-opacity duration-200"
                    opacity={isActive ? 1 : 0.78}
                  >
                    {/* < 12 km/h Calm Band */}
                    <path d={sec.calmArc} fill="#0ea5e9" />
                    {/* 12 - 24 km/h Moderate Band */}
                    <path d={sec.modArc} fill="#10b981" />
                    {/* > 24 km/h Strong Gust Band */}
                    <path
                      d={sec.strongArc}
                      fill="#f59e0b"
                      stroke={isActive ? '#ffffff' : 'none'}
                      strokeWidth={isActive ? 1 : 0}
                    />
                    <text
                      x={sec.labelX}
                      y={sec.labelY + 3}
                      textAnchor="middle"
                      fill={isActive ? '#38bdf8' : '#cbd5e1'}
                      fontSize={isActive ? '10.5' : '9.5'}
                      fontWeight={isActive ? 'bold' : 'normal'}
                      fontFamily="monospace"
                    >
                      {sec.direction}
                    </text>
                  </g>
                );
              })}

              {/* Center Pitch Orientation Icon */}
              <rect
                x="-5"
                y="-13"
                width="10"
                height="26"
                rx="2"
                fill="#78350f"
                stroke="#f59e0b"
                strokeWidth="1"
              />

              {/* Live / Selected Wind Vector Arrow */}
              <g
                transform={`rotate(${crosswindModel.effectiveDeg})`}
                className="transition-transform duration-500 ease-out pointer-events-none"
              >
                <line
                  x1="0"
                  y1="-98"
                  x2="0"
                  y2="-22"
                  stroke="#22d3ee"
                  strokeWidth="2.2"
                  strokeDasharray="3 2"
                />
                <polygon points="0,-18 -4.5,-28 4.5,-28" fill="#22d3ee" />
              </g>
            </svg>

            {/* Legend */}
            <div className="flex flex-wrap items-center justify-center gap-3 text-[11px] font-mono text-slate-400 mt-1">
              <span className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-sm bg-sky-500 inline-block" />
                <span>&lt;12 km/h</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-sm bg-emerald-500 inline-block" />
                <span>12–24 km/h</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-sm bg-amber-500 inline-block" />
                <span>&gt;24 km/h</span>
              </span>
            </div>
          </div>

          {/* D3 22-Yard Pitch Lateral Drift Vector Overlay */}
          <div className="md:col-span-5 rounded-xl border border-slate-800/90 bg-slate-900/50 p-3.5 flex flex-col items-center justify-between space-y-2">
            <div className="w-full flex items-center justify-between">
              <span className="text-xs font-medium text-slate-200">22-Yard Drift Vector</span>
              <div className="flex items-center gap-1 bg-slate-950 p-0.5 rounded-lg border border-slate-800 text-[10px] font-mono">
                {(['both', 'pace', 'spin'] as const).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setDriftMode(m)}
                    className={`px-2 py-0.5 rounded capitalize cursor-pointer transition-colors ${
                      driftMode === m ? 'bg-cyan-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>

            <svg viewBox="0 0 240 300" className="h-56 w-full max-w-[200px]">
              {/* Turf Strip */}
              <rect
                x="44"
                y="18"
                width="152"
                height="264"
                rx="10"
                fill="#1c2a1e"
                stroke="#334155"
                strokeWidth="1.5"
              />
              {/* Prepared Clay Deck */}
              <rect
                x="72"
                y="28"
                width="96"
                height="244"
                rx="4"
                fill="#3b2c20"
                stroke="#92400e"
                strokeWidth="1"
              />

              {/* Popping & Bowling Creases */}
              <line x1="60" y1="44" x2="180" y2="44" stroke="#cbd5e1" strokeWidth="1.2" opacity="0.65" />
              <line x1="60" y1="256" x2="180" y2="256" stroke="#cbd5e1" strokeWidth="1.2" opacity="0.65" />

              {/* Center Stump-to-Stump Reference Line */}
              <line
                x1="120"
                y1="36"
                x2="120"
                y2="264"
                stroke="#94a3b8"
                strokeDasharray="4 4"
                strokeWidth="1"
                opacity="0.55"
              />

              {/* Striker & Non-Striker Stumps */}
              {[-6, 0, 6].map((dx) => (
                <React.Fragment key={dx}>
                  <circle cx={120 + dx} cy={34} r="2.2" fill="#fde68a" />
                  <circle cx={120 + dx} cy={266} r="2.2" fill="#fde68a" />
                </React.Fragment>
              ))}

              {/* Express Pace Drift Curve */}
              {(driftMode === 'both' || driftMode === 'pace') && (
                <g>
                  <path
                    d={crosswindModel.paceCurve}
                    fill="none"
                    stroke="#06b6d4"
                    strokeWidth="3"
                    className="transition-all duration-500"
                  />
                  <circle cx={crosswindModel.paceBounceX} cy={94} r="3.5" fill="#06b6d4" />
                  <circle cx={crosswindModel.paceStumpX} cy={36} r="4" fill="#22d3ee" />
                </g>
              )}

              {/* Flighted Spin Drift + Turn Curve */}
              {(driftMode === 'both' || driftMode === 'spin') && (
                <g>
                  <path
                    d={crosswindModel.spinCurve}
                    fill="none"
                    stroke="#f59e0b"
                    strokeWidth="2.8"
                    strokeDasharray="5 2"
                    className="transition-all duration-500"
                  />
                  <circle cx={crosswindModel.spinBounceX} cy={86} r="3.5" fill="#f59e0b" />
                  <circle cx={crosswindModel.spinStumpX} cy={36} r="4" fill="#fbbf24" />
                </g>
              )}

              <text x="16" y="38" fill="#94a3b8" fontSize="8.5" fontFamily="monospace">
                Off
              </text>
              <text x="198" y="38" fill="#94a3b8" fontSize="8.5" fontFamily="monospace">
                Leg
              </text>
            </svg>

            <div className="w-full flex items-center justify-between text-[11px] font-mono tabular-nums text-slate-300 border-t border-slate-800/80 pt-2">
              <span className="text-cyan-300">
                Pace: {crosswindModel.paceDriftCm > 0 ? '+' : ''}
                {crosswindModel.paceDriftCm} cm
              </span>
              <span className="text-amber-300">
                Spin: {crosswindModel.spinDriftCm > 0 ? '+' : ''}
                {crosswindModel.spinDriftCm} cm
              </span>
            </div>
          </div>
        </div>

        {/* Predictive Crosswind Drift Model Summary */}
        <div className="rounded-xl border border-slate-800/90 bg-slate-900/60 p-4 space-y-2.5">
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2">
              <Wind className="h-3.5 w-3.5 text-cyan-400" />
              <span className="font-semibold text-white">
                Predictive Crosswind Drift Model ({crosswindModel.effectiveLabel} Vector)
              </span>
            </div>
            <div className="flex items-center gap-2 font-mono tabular-nums text-xs text-slate-400">
              <span>
                Crosswind <strong className="text-emerald-300">{crosswindModel.crosswindKmh} km/h</strong>
              </span>
              <span className="text-slate-600">·</span>
              <span>
                Axial{' '}
                <strong className="text-sky-300">
                  {crosswindModel.headTailKmh >= 0
                    ? `+${crosswindModel.headTailKmh} Tailwind`
                    : `${crosswindModel.headTailKmh} Headwind`}
                </strong>
              </span>
            </div>
          </div>

          <p className="text-xs text-slate-300 leading-relaxed">
            <strong className="text-white">Release Line Calibration:</strong> {crosswindModel.corridorTarget}
          </p>
        </div>
      </div>
    </div>
  );
};
