import React, { useMemo, useState } from 'react';
import { Activity, Droplets, Gauge, Layers, Sliders, Thermometer } from 'lucide-react';

export interface DynamicSurfaceInteractionProps {
  temperature: number;
  humidity: number;
  dewLevel: number;
  pitchWear: number;
  grassCoverage: number;
  venueName: string;
  pitchType?: string;
  onChangeTemperature: (temp: number) => void;
  onChangeHumidity: (humidity: number) => void;
  showFieldingHeatmap?: boolean;
  onToggleFieldingHeatmap?: () => void;
}

type PitchLengthZoneId = 'yorker_full' | 'good_length' | 'back_length' | 'short_bouncer';

interface PitchLengthZone {
  id: PitchLengthZoneId;
  label: string;
  shortLabel: string;
  meterRange: string;
  svgXStart: number;
  svgWidth: number;
  frictionOffset: number;
  bounceMultiplier: number;
  meanBounceMm: number;
  description: string;
}

const PITCH_LENGTH_ZONES: PitchLengthZone[] = [
  {
    id: 'short_bouncer',
    label: 'Short / Bouncer Deck',
    shortLabel: 'SHORT (12–16m)',
    meterRange: '12.0m – 16.5m',
    svgXStart: 150,
    svgWidth: 145,
    frictionOffset: -0.03,
    bounceMultiplier: 1.08,
    meanBounceMm: 1180,
    description: 'Rolled centre clay; steep shoulder-high climb with cross-seam variation.',
  },
  {
    id: 'back_length',
    label: 'Back of a Length',
    shortLabel: 'BACK LENGTH (8–12m)',
    meterRange: '8.0m – 12.0m',
    svgXStart: 295,
    svgWidth: 145,
    frictionOffset: -0.01,
    bounceMultiplier: 1.24,
    meanBounceMm: 890,
    description: 'High-leverage splice zone; micro-cracks create sharp vertical lift variance.',
  },
  {
    id: 'good_length',
    label: 'Good Length Channel',
    shortLabel: 'GOOD LENGTH (4–8m)',
    meterRange: '4.0m – 8.0m',
    svgXStart: 440,
    svgWidth: 150,
    frictionOffset: 0.04,
    bounceMultiplier: 1.18,
    meanBounceMm: 715,
    description: 'Primary seam & spin landing zone; bowler footmarks maximize surface bite.',
  },
  {
    id: 'yorker_full',
    label: 'Full / Blockhole',
    shortLabel: 'FULL / YORKER (0–4m)',
    meterRange: '0.0m – 4.0m',
    svgXStart: 590,
    svgWidth: 130,
    frictionOffset: 0.02,
    bounceMultiplier: 0.64,
    meanBounceMm: 240,
    description: 'Popping-crease scuffed clay; minimal vertical bounce window before bat contact.',
  },
];

export const DynamicSurfaceInteraction: React.FC<DynamicSurfaceInteractionProps> = ({
  temperature,
  humidity,
  dewLevel,
  pitchWear,
  grassCoverage,
  venueName,
  pitchType = 'Balanced Sporting',
  onChangeTemperature,
  onChangeHumidity,
  showFieldingHeatmap = false,
  onToggleFieldingHeatmap,
}) => {
  const [selectedZoneId, setSelectedZoneId] = useState<PitchLengthZoneId>('good_length');
  const [focusedGauge, setFocusedGauge] = useState<'friction' | 'bounce'>('friction');

  const selectedZone = useMemo(
    () => PITCH_LENGTH_ZONES.find((z) => z.id === selectedZoneId) || PITCH_LENGTH_ZONES[2],
    [selectedZoneId]
  );

  // Real-time calculated surface friction (μ) and bounce variance (mm)
  const surfacePhysics = useMemo(() => {
    const pitchTypeFrictionMod =
      pitchType.toLowerCase().includes('spin') || pitchType.toLowerCase().includes('dry')
        ? 0.055
        : pitchType.toLowerCase().includes('pace') || pitchType.toLowerCase().includes('green')
        ? -0.025
        : 0.01;

    // Friction coefficient μ: increases with solar baking & wear, decreases with humidity condensation, dew & grass sheen
    const tempBakingDelta = (temperature - 22) * 0.0068;
    const humidityLubricationDelta = -(humidity - 50) * 0.0031;
    const dewFilmDelta = -dewLevel * 0.0017;
    const wearRoughnessDelta = pitchWear * 0.0019;
    const grassSheenDelta = -grassCoverage * 0.001;

    const rawMu =
      0.51 +
      pitchTypeFrictionMod +
      tempBakingDelta +
      humidityLubricationDelta +
      dewFilmDelta +
      wearRoughnessDelta +
      grassSheenDelta +
      selectedZone.frictionOffset;

    const frictionMu = Math.min(0.86, Math.max(0.22, Number(rawMu.toFixed(2))));

    // Bounce variance (±mm): driven by thermal desiccation cracks (high temp + low RH) OR soft damp patches (very high RH on grass) + pitch wear
    const thermalShrinkageStress = Math.max(
      0,
      (temperature - 20) * 0.62 + (62 - humidity) * 0.25
    );
    const moistureSwellingVariance = Math.max(
      0,
      (humidity - 74) * 0.36 * (0.5 + grassCoverage / 120)
    );
    const wearFissureVariance = pitchWear * 0.27;
    const baseSoilVariance = 5.4;

    const rawBounceVarMm =
      (baseSoilVariance +
        thermalShrinkageStress +
        moistureSwellingVariance +
        wearFissureVariance) *
      selectedZone.bounceMultiplier;

    const bounceVarianceMm = Math.min(
      48.0,
      Math.max(4.2, Number(rawBounceVarMm.toFixed(1)))
    );

    // Derived ball-turf restitution & pace retention %
    const paceRetentionPct = Math.min(
      89,
      Math.max(54, Math.round(91 - frictionMu * 38 + grassCoverage * 0.08))
    );

    const frictionNorm = Math.min(1, Math.max(0, (frictionMu - 0.22) / (0.86 - 0.22)));
    const bounceNorm = Math.min(1, Math.max(0, (bounceVarianceMm - 4.2) / (48.0 - 4.2)));

    const frictionRegime =
      frictionMu >= 0.62
        ? { label: 'High Grip & Bite', tone: 'text-amber-300', hex: '#f59e0b' }
        : frictionMu <= 0.39
        ? { label: 'Skiddy Low-Friction', tone: 'text-cyan-300', hex: '#22d3ee' }
        : { label: 'True Sporting Carry', tone: 'text-emerald-300', hex: '#10b981' };

    const bounceRegime =
      bounceVarianceMm >= 28
        ? { label: 'Variable / Uneven Lift', tone: 'text-rose-300', hex: '#fb7185' }
        : bounceVarianceMm >= 16
        ? { label: 'Moderate Seam Deviation', tone: 'text-amber-300', hex: '#fbbf24' }
        : { label: 'Consistent True Bounce', tone: 'text-emerald-300', hex: '#34d399' };

    const lowStumpMm = Math.max(60, Math.round(selectedZone.meanBounceMm - bounceVarianceMm));
    const highStumpMm = Math.round(selectedZone.meanBounceMm + bounceVarianceMm);

    return {
      frictionMu,
      bounceVarianceMm,
      paceRetentionPct,
      frictionNorm,
      bounceNorm,
      frictionRegime,
      bounceRegime,
      lowStumpMm,
      highStumpMm,
      tempBakingDelta,
      humidityLubricationDelta,
    };
  }, [temperature, humidity, dewLevel, pitchWear, grassCoverage, pitchType, selectedZone]);

  // SVG gauge geometry helper (180-deg semi-circle r=42, circumference half = PI * 42 = 131.95)
  const arcLength = 131.95;
  const frictionDashOffset = arcLength * (1 - surfacePhysics.frictionNorm);
  const bounceDashOffset = arcLength * (1 - surfacePhysics.bounceNorm);

  // Impact X coordinate on the 22-yard SVG canvas
  const impactCx = selectedZone.svgXStart + selectedZone.svgWidth * 0.5;
  const moistureOpacity = Math.min(0.45, Math.max(0.04, (humidity - 20) / 190 + dewLevel / 320));
  const crackOpacity = Math.min(0.75, Math.max(0.08, pitchWear / 120 + Math.max(0, temperature - 26) / 45));
  const grassTintOpacity = Math.min(0.52, Math.max(0.04, grassCoverage / 165));

  return (
    <section className="rounded-2xl border border-slate-800 bg-slate-950/90 p-5 sm:p-6 space-y-5">
      {/* Header Row */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-800/80 pb-4">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400 font-mono">
            <span className="text-cyan-400 font-semibold">Dynamic Surface Interaction</span>
            <span aria-hidden="true">·</span>
            <span>22-Yard (20.12m) Clay-Turf Physics</span>
            <span aria-hidden="true">·</span>
            <span>Simulated Telemetry</span>
          </div>
          <h3 className="text-lg sm:text-xl font-bold text-white tracking-tight">
            Live Pitch Friction (μ) &amp; Bounce Variance (mm) Surface Overlay
          </h3>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          {onToggleFieldingHeatmap && (
            <button
              type="button"
              onClick={onToggleFieldingHeatmap}
              className={`px-3.5 py-2 rounded-lg text-xs font-medium transition-colors flex items-center gap-2 cursor-pointer whitespace-nowrap shrink-0 border ${
                showFieldingHeatmap
                  ? 'bg-emerald-500/20 border-emerald-400/60 text-emerald-200'
                  : 'bg-slate-900 border-slate-700 text-slate-300 hover:text-white hover:border-slate-600'
              }`}
            >
              <Layers className="h-3.5 w-3.5 text-emerald-400" />
              <span>Fielding Heatmap Layer: {showFieldingHeatmap ? 'Active' : 'Off'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Inline Atmosphere Quick-Scrubbers */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
        <div className="md:col-span-4 rounded-xl border border-slate-800 bg-slate-900/60 p-3.5 space-y-2">
          <div className="flex items-center justify-between text-xs font-mono">
            <span className="flex items-center gap-1.5 text-slate-300 font-semibold">
              <Thermometer className="h-3.5 w-3.5 text-rose-400" />
              <span>Ambient Temp</span>
            </span>
            <span className="text-rose-300 font-bold tabular-nums">
              {temperature}°C · {surfacePhysics.tempBakingDelta >= 0 ? '+' : ''}
              {surfacePhysics.tempBakingDelta.toFixed(2)} μ
            </span>
          </div>
          <input
            type="range"
            min={10}
            max={45}
            value={temperature}
            onChange={(e) => onChangeTemperature(Number(e.target.value))}
            aria-label="Pitch surface ambient temperature"
            className="w-full accent-rose-400 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
          />
        </div>

        <div className="md:col-span-4 rounded-xl border border-slate-800 bg-slate-900/60 p-3.5 space-y-2">
          <div className="flex items-center justify-between text-xs font-mono">
            <span className="flex items-center gap-1.5 text-slate-300 font-semibold">
              <Droplets className="h-3.5 w-3.5 text-cyan-400" />
              <span>Relative Humidity</span>
            </span>
            <span className="text-cyan-300 font-bold tabular-nums">
              {humidity}% RH · {surfacePhysics.humidityLubricationDelta >= 0 ? '+' : ''}
              {surfacePhysics.humidityLubricationDelta.toFixed(2)} μ
            </span>
          </div>
          <input
            type="range"
            min={20}
            max={95}
            value={humidity}
            onChange={(e) => onChangeHumidity(Number(e.target.value))}
            aria-label="Pitch surface relative humidity"
            className="w-full accent-cyan-400 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
          />
        </div>

        {/* Length Zone Segmented Control */}
        <div className="md:col-span-4 rounded-xl border border-slate-800 bg-slate-900/60 p-2.5 space-y-1.5">
          <div className="flex items-center justify-between px-1 text-[11px] font-mono text-slate-400">
            <span className="flex items-center gap-1">
              <Sliders className="h-3 w-3 text-amber-400" />
              <span>Pitch Impact Zone</span>
            </span>
            <span className="text-amber-300 tabular-nums">{selectedZone.meterRange}</span>
          </div>
          <div className="grid grid-cols-4 gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800/80">
            {PITCH_LENGTH_ZONES.map((zone) => {
              const active = zone.id === selectedZoneId;
              return (
                <button
                  key={zone.id}
                  type="button"
                  onClick={() => setSelectedZoneId(zone.id)}
                  className={`py-1.5 px-1 rounded text-[10px] font-mono font-semibold transition-colors cursor-pointer whitespace-nowrap truncate ${
                    active
                      ? 'bg-cyan-500 text-slate-950 font-bold'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {zone.id === 'short_bouncer'
                    ? 'Short'
                    : zone.id === 'back_length'
                    ? 'Back'
                    : zone.id === 'good_length'
                    ? 'Good'
                    : 'Full'}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* 22-YARD PITCH SURFACE CANVAS WITH LIVE OVERLAID GAUGES */}
      <div className="relative rounded-xl border border-slate-800 bg-[#071318] overflow-hidden">
        {/* Top Pitch Dimension Ruler */}
        <div className="flex items-center justify-between px-4 py-2 border-b border-slate-800/80 bg-slate-950/70 text-[11px] font-mono text-slate-400 tabular-nums">
          <span>BOWLER END · 20.12m (22 yds)</span>
          <span className="text-slate-300 font-semibold hidden sm:inline">
            {venueName} · Click any pitch zone or surface gauge to inspect
          </span>
          <span>STRIKER END · 0.00m</span>
        </div>

        {/* Interactive SVG 22-Yard Pitch Strip + Overlaid Gauges */}
        <div className="relative w-full overflow-x-auto">
          <svg
            viewBox="0 0 860 330"
            className="w-full min-w-[680px] h-auto block select-none"
            role="img"
            aria-label="22-yard cricket pitch surface with live friction and bounce variance gauges"
          >
            <defs>
              {/* Rolled Clay Deck Base Gradient */}
              <linearGradient id="pitchClayGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#8b6f4e" />
                <stop offset="35%" stopColor="#a68863" />
                <stop offset="70%" stopColor="#9c7c56" />
                <stop offset="100%" stopColor="#856848" />
              </linearGradient>

              {/* Grass Outfield Apron */}
              <linearGradient id="outfieldTurfGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#082219" />
                <stop offset="50%" stopColor="#0d3324" />
                <stop offset="100%" stopColor="#071d15" />
              </linearGradient>

              {/* Atmospheric Moisture / Dew Sheen */}
              <linearGradient id="moistureSheenGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#38bdf8" stopOpacity={moistureOpacity} />
                <stop offset="50%" stopColor="#0ea5e9" stopOpacity={moistureOpacity * 0.45} />
                <stop offset="100%" stopColor="#67e8f9" stopOpacity={moistureOpacity * 0.85} />
              </linearGradient>

              {/* Gauge Gradients */}
              <linearGradient id="muGaugeGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#22d3ee" />
                <stop offset="50%" stopColor="#10b981" />
                <stop offset="100%" stopColor="#f59e0b" />
              </linearGradient>

              <linearGradient id="bounceGaugeGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#34d399" />
                <stop offset="55%" stopColor="#fbbf24" />
                <stop offset="100%" stopColor="#fb7185" />
              </linearGradient>
            </defs>

            {/* Turf Surround */}
            <rect x="0" y="0" width="860" height="330" fill="url(#outfieldTurfGrad)" />

            {/* Subtle Mowed Turf Stripes */}
            {[0, 1, 2, 3, 4, 5, 6, 7].map((idx) => (
              <rect
                key={idx}
                x={idx * 108}
                y="0"
                width="54"
                height="330"
                fill="#10b981"
                fillOpacity="0.025"
              />
            ))}

            {/* 22-Yard Rolled Clay Pitch Strip (x=70 to x=790, y=58 to y=272) */}
            <rect
              x="70"
              y="58"
              width="720"
              height="214"
              rx="6"
              fill="url(#pitchClayGrad)"
              stroke="#cbb089"
              strokeOpacity="0.45"
              strokeWidth="1.5"
            />

            {/* Live Grass Coverage Layer on Pitch */}
            <rect
              x="72"
              y="60"
              width="716"
              height="210"
              rx="5"
              fill="#15803d"
              fillOpacity={grassTintOpacity}
            />

            {/* Atmospheric Humidity & Dew Sheen Layer */}
            <rect
              x="72"
              y="60"
              width="716"
              height="210"
              rx="5"
              fill="url(#moistureSheenGrad)"
            />

            {/* Thermal Desiccation Cracks & Footmark Rough Patches */}
            <g stroke="#3b2818" strokeOpacity={crackOpacity} fill="none" strokeWidth="1.3">
              <path d="M 465 92 L 482 104 L 498 99 L 516 112" />
              <path d="M 520 198 L 542 188 L 558 196 L 575 186" />
              <path d="M 340 135 L 364 143 L 381 137" />
              <path d="M 612 148 L 635 156 L 649 149" />
              <ellipse
                cx="495"
                cy="82"
                rx="34"
                ry="11"
                fill="#4a3320"
                fillOpacity={crackOpacity * 0.45}
                stroke="none"
              />
              <ellipse
                cx="510"
                cy="246"
                rx="38"
                ry="12"
                fill="#4a3320"
                fillOpacity={crackOpacity * 0.4}
                stroke="none"
              />
            </g>

            {/* Clickable Pitch Length Zones */}
            {PITCH_LENGTH_ZONES.map((zone) => {
              const isSelected = zone.id === selectedZoneId;
              return (
                <g
                  key={zone.id}
                  onClick={() => setSelectedZoneId(zone.id)}
                  className="cursor-pointer"
                >
                  <rect
                    x={zone.svgXStart}
                    y="60"
                    width={zone.svgWidth}
                    height="210"
                    fill={isSelected ? '#22d3ee' : '#0f172a'}
                    fillOpacity={isSelected ? 0.17 : 0.08}
                    stroke={isSelected ? '#22d3ee' : '#f8fafc'}
                    strokeOpacity={isSelected ? 0.85 : 0.16}
                    strokeWidth={isSelected ? 2 : 1}
                    strokeDasharray={isSelected ? undefined : '4 4'}
                  />
                  <text
                    x={zone.svgXStart + zone.svgWidth / 2}
                    y="262"
                    textAnchor="middle"
                    fill={isSelected ? '#ecfeff' : '#cbd5e1'}
                    fillOpacity={isSelected ? 0.95 : 0.7}
                    fontSize="9.5"
                    fontFamily="monospace"
                    fontWeight={isSelected ? '700' : '500'}
                  >
                    {zone.shortLabel}
                  </text>
                </g>
              );
            })}

            {/* Crease Markings (White Lime Lines) */}
            <g stroke="#f8fafc" strokeWidth="2" strokeOpacity="0.88">
              {/* Bowler End Creases */}
              <line x1="110" y1="58" x2="110" y2="272" />
              <line x1="150" y1="46" x2="150" y2="284" />
              <line x1="70" y1="78" x2="150" y2="78" />
              <line x1="70" y1="252" x2="150" y2="252" />

              {/* Striker End Creases */}
              <line x1="750" y1="58" x2="750" y2="272" />
              <line x1="720" y1="46" x2="720" y2="284" />
              <line x1="720" y1="78" x2="790" y2="78" />
              <line x1="720" y1="252" x2="790" y2="252" />
            </g>

            {/* Stumps (3 at Bowler End, 3 at Striker End) */}
            {[153, 165, 177].map((sy, idx) => (
              <g key={`stumps-${idx}`}>
                <rect x="106" y={sy - 3} width="9" height="6" rx="2" fill="#fde047" stroke="#713f12" strokeWidth="1" />
                <rect x="746" y={sy - 3} width="9" height="6" rx="2" fill="#fde047" stroke="#713f12" strokeWidth="1" />
              </g>
            ))}

            {/* Ball Delivery Trajectory + Live Surface Bounce Dispersion Cone */}
            <g>
              {/* Incoming Trajectory from Bowler Crease to Pitch Impact Point */}
              <path
                d={`M 115 165 Q ${(115 + impactCx) / 2} 142 ${impactCx} 165`}
                fill="none"
                stroke="#38bdf8"
                strokeWidth="2.5"
                strokeDasharray="6 4"
              />

              {/* Post-Bounce Variance Dispersion Cone to Striker Stumps */}
              <polygon
                points={`${impactCx},165 750,${165 - Math.min(48, surfacePhysics.bounceVarianceMm * 0.95)} 750,${
                  165 + Math.min(48, surfacePhysics.bounceVarianceMm * 0.95)
                }`}
                fill={surfacePhysics.bounceRegime.hex}
                fillOpacity="0.24"
                stroke={surfacePhysics.bounceRegime.hex}
                strokeOpacity="0.75"
                strokeWidth="1.2"
              />

              {/* Mean Post-Bounce Vector */}
              <line
                x1={impactCx}
                y1="165"
                x2="750"
                y2={165 - (surfacePhysics.frictionMu - 0.5) * 32}
                stroke="#f8fafc"
                strokeWidth="2"
              />

              {/* Pitch Impact Puck */}
              <circle
                cx={impactCx}
                cy="165"
                r="11"
                fill={surfacePhysics.frictionRegime.hex}
                fillOpacity="0.28"
                stroke={surfacePhysics.frictionRegime.hex}
                strokeWidth="2"
              />
              <circle cx={impactCx} cy="165" r="4.5" fill="#ef4444" stroke="#ffffff" strokeWidth="1.2" />
            </g>

            {/* =========================================================
                OVERLAID INTERACTIVE GAUGE 1: SURFACE FRICTION (μ)
               ========================================================= */}
            <g
              transform="translate(185, 68)"
              onClick={() => setFocusedGauge('friction')}
              className="cursor-pointer"
            >
              <rect
                x="0"
                y="0"
                width="196"
                height="118"
                rx="12"
                fill="#020617"
                fillOpacity="0.86"
                stroke={focusedGauge === 'friction' ? '#22d3ee' : '#334155'}
                strokeWidth={focusedGauge === 'friction' ? '1.8' : '1'}
              />
              <text
                x="14"
                y="20"
                fill="#94a3b8"
                fontSize="9.5"
                fontFamily="monospace"
                fontWeight="700"
              >
                SURFACE FRICTION (μ)
              </text>
              <text
                x="182"
                y="20"
                textAnchor="end"
                fill={surfacePhysics.frictionRegime.hex}
                fontSize="9"
                fontFamily="monospace"
                fontWeight="700"
              >
                LIVE GAUGE
              </text>

              {/* Semi-Circular Arc Track */}
              <path
                d="M 32 86 A 42 42 0 0 1 116 86"
                fill="none"
                stroke="#1e293b"
                strokeWidth="9"
                strokeLinecap="round"
              />
              {/* Active Friction Arc */}
              <path
                d="M 32 86 A 42 42 0 0 1 116 86"
                fill="none"
                stroke="url(#muGaugeGrad)"
                strokeWidth="9"
                strokeLinecap="round"
                strokeDasharray={arcLength}
                strokeDashoffset={frictionDashOffset}
              />

              {/* Numeric Readout */}
              <text
                x="74"
                y="82"
                textAnchor="middle"
                fill="#ffffff"
                fontSize="20"
                fontFamily="monospace"
                fontWeight="800"
              >
                {surfacePhysics.frictionMu.toFixed(2)}
              </text>
              <text
                x="74"
                y="97"
                textAnchor="middle"
                fill="#94a3b8"
                fontSize="8.5"
                fontFamily="monospace"
              >
                COEFF μ (0.22–0.86)
              </text>

              {/* Right Mini Readout inside Gauge Card */}
              <text x="128" y="54" fill="#cbd5e1" fontSize="9" fontFamily="monospace">
                Pace Kept
              </text>
              <text
                x="128"
                y="70"
                fill="#38bdf8"
                fontSize="14"
                fontFamily="monospace"
                fontWeight="700"
              >
                {surfacePhysics.paceRetentionPct}%
              </text>
              <text
                x="128"
                y="96"
                fill={surfacePhysics.frictionRegime.hex}
                fontSize="8.5"
                fontFamily="monospace"
                fontWeight="700"
              >
                {surfacePhysics.frictionMu >= 0.62
                  ? 'GRIPPING'
                  : surfacePhysics.frictionMu <= 0.39
                  ? 'SKIDDY'
                  : 'BALANCED'}
              </text>
            </g>

            {/* =========================================================
                OVERLAID INTERACTIVE GAUGE 2: BOUNCE VARIANCE (±mm)
               ========================================================= */}
            <g
              transform="translate(476, 68)"
              onClick={() => setFocusedGauge('bounce')}
              className="cursor-pointer"
            >
              <rect
                x="0"
                y="0"
                width="212"
                height="118"
                rx="12"
                fill="#020617"
                fillOpacity="0.86"
                stroke={focusedGauge === 'bounce' ? '#fbbf24' : '#334155'}
                strokeWidth={focusedGauge === 'bounce' ? '1.8' : '1'}
              />
              <text
                x="14"
                y="20"
                fill="#94a3b8"
                fontSize="9.5"
                fontFamily="monospace"
                fontWeight="700"
              >
                BOUNCE VARIANCE (mm)
              </text>
              <text
                x="198"
                y="20"
                textAnchor="end"
                fill={surfacePhysics.bounceRegime.hex}
                fontSize="9"
                fontFamily="monospace"
                fontWeight="700"
              >
                ±σ DISPERSION
              </text>

              {/* Semi-Circular Arc Track */}
              <path
                d="M 32 86 A 42 42 0 0 1 116 86"
                fill="none"
                stroke="#1e293b"
                strokeWidth="9"
                strokeLinecap="round"
              />
              {/* Active Bounce Variance Arc */}
              <path
                d="M 32 86 A 42 42 0 0 1 116 86"
                fill="none"
                stroke="url(#bounceGaugeGrad)"
                strokeWidth="9"
                strokeLinecap="round"
                strokeDasharray={arcLength}
                strokeDashoffset={bounceDashOffset}
              />

              {/* Numeric Readout */}
              <text
                x="74"
                y="82"
                textAnchor="middle"
                fill="#ffffff"
                fontSize="18"
                fontFamily="monospace"
                fontWeight="800"
              >
                ±{surfacePhysics.bounceVarianceMm.toFixed(1)}
              </text>
              <text
                x="74"
                y="97"
                textAnchor="middle"
                fill="#94a3b8"
                fontSize="8.5"
                fontFamily="monospace"
              >
                MILLIMETERS (mm)
              </text>

              {/* Stump Arrival Envelope */}
              <text x="128" y="52" fill="#cbd5e1" fontSize="9" fontFamily="monospace">
                Stump Window
              </text>
              <text
                x="128"
                y="68"
                fill="#fde047"
                fontSize="12"
                fontFamily="monospace"
                fontWeight="700"
              >
                {surfacePhysics.lowStumpMm}–{surfacePhysics.highStumpMm}mm
              </text>
              <text
                x="128"
                y="96"
                fill={surfacePhysics.bounceRegime.hex}
                fontSize="8.5"
                fontFamily="monospace"
                fontWeight="700"
              >
                {surfacePhysics.bounceVarianceMm >= 28
                  ? 'VARIABLE LIFT'
                  : surfacePhysics.bounceVarianceMm >= 16
                  ? 'SEAM NIP'
                  : 'TRUE BOUNCE'}
              </text>
            </g>
          </svg>
        </div>

        {/* Bottom Surface Physics Diagnostic Strip */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 border-t border-slate-800/80 bg-slate-950/85 text-xs">
          <div className="flex items-start gap-2.5">
            <Gauge className="h-4 w-4 text-cyan-400 shrink-0 mt-0.5" />
            <div>
              <div className="font-mono font-semibold text-white tabular-nums">
                Friction {surfacePhysics.frictionMu.toFixed(2)} μ ·{' '}
                <span className={surfacePhysics.frictionRegime.tone}>
                  {surfacePhysics.frictionRegime.label}
                </span>
              </div>
              <p className="text-slate-400 text-[11px] leading-relaxed mt-0.5">
                {surfacePhysics.frictionMu >= 0.6
                  ? 'Dry baked surface grips the seam; off-cutters and wrist-spin extract sharp deceleration.'
                  : surfacePhysics.frictionMu <= 0.4
                  ? 'Atmospheric moisture coats clay granules; deliveries skid swiftly onto the bat.'
                  : 'Balanced leather-clay grip supports both conventional swing carry and clean stroke timing.'}
              </p>
            </div>
          </div>

          <div className="flex items-start gap-2.5">
            <Activity className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <div className="font-mono font-semibold text-white tabular-nums">
                Variance ±{surfacePhysics.bounceVarianceMm.toFixed(1)} mm ·{' '}
                <span className={surfacePhysics.bounceRegime.tone}>
                  {surfacePhysics.bounceRegime.label}
                </span>
              </div>
              <p className="text-slate-400 text-[11px] leading-relaxed mt-0.5">
                Arrival height at popping crease spans {surfacePhysics.lowStumpMm}mm to{' '}
                {surfacePhysics.highStumpMm}mm against 711mm stumps.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-2.5">
            <Sliders className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <div className="font-mono font-semibold text-white">
                {selectedZone.label} ({selectedZone.meterRange})
              </div>
              <p className="text-slate-400 text-[11px] leading-relaxed mt-0.5">
                {selectedZone.description}
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
