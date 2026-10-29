import React, { useState } from 'react';
import { Player } from '../../types/cricket';
import { CountryFlag, PlayerCardAvatar } from '../common/CricketIdentity';
import {
  Zap,
  Shield,
  Target,
  Flame,
  Sparkles,
  Activity,
  Layers,
  ArrowUpRight,
  Radar,
  Sliders,
  CheckCircle2,
  Info,
  Scale
} from 'lucide-react';

export interface PlayerDnaMetrics {
  power: number; // 0-100
  timing: number; // 0-100
  consistency: number; // 0-100
  pressureHandling: number; // 0-100
  paceAttack: number;
  spinAttack: number;
  archetype: string;
  archetypeColor: string;
  archetypeSummary: string;
}

export function computePlayerDnaMetrics(player: Player): PlayerDnaMetrics {
  const isBowler = player.role.includes('Bowler');
  const isAllRounder = player.role.includes('All-Rounder');
  const stats = player.stats;

  let power: number;
  let timing: number;
  let consistency: number;
  let pressureHandling: number;
  let paceAttack: number;
  let spinAttack: number;
  let archetype = 'Tactical Specialist';
  let archetypeColor = '#38bdf8';
  let archetypeSummary = 'Balanced profile with situational strength across middle overs.';

  if (isBowler) {
    power = Math.min(99, Math.max(52, Math.round(stats.wickets * 1.4 + (10 - (stats.economy || 7.5)) * 6.5 + (stats.strikeRate > 100 ? 12 : 0) + 32)));
    timing = Math.min(99, Math.max(55, Math.round(player.rating * 0.94 + (stats.economy < 7.2 ? 6 : 0))));
    consistency = Math.min(99, Math.max(55, Math.round(stats.dotBallPercent ? stats.dotBallPercent * 1.55 : (10 - (stats.economy || 7.8)) * 12 + 35)));
    pressureHandling = player.rating >= 93 ? 95 : player.rating >= 88 ? 88 : 77;
    paceAttack = player.bowlingStyle.includes('fast') ? 95 : 76;
    spinAttack = player.bowlingStyle.includes('spin') ? 95 : 78;

    if (player.bowlingStyle.includes('fast') && player.rating >= 90) {
      archetype = 'Express Enforcer';
      archetypeColor = '#f43f5e';
      archetypeSummary = '145+ km/h strike bowling with steep bounce, yorker execution, and wicket-taking hostility.';
    } else if (player.bowlingStyle.includes('spin')) {
      archetype = 'Mystery Spin Wizard';
      archetypeColor = '#a855f7';
      archetypeSummary = 'Gripping variations, deceiving googlies, and high-economy containment through middle overs.';
    } else {
      archetype = 'Metronomic Seam Operator';
      archetypeColor = '#06b6d4';
      archetypeSummary = 'Upright seam presentation, continuous channel probing, and minimal loose deliveries.';
    }
  } else {
    power = Math.min(99, Math.max(52, Math.round((stats.strikeRate / 175) * 72 + (stats.boundaryPercent || 20) * 1.15)));
    timing = Math.min(99, Math.max(55, Math.round(stats.average * 1.1 + (stats.strikeRate / 160) * 44 + player.rating * 0.1)));
    consistency = Math.min(99, Math.max(50, Math.round(stats.average * 2.15 + (100 - (stats.dotBallPercent || 33)) * 0.18)));
    const chasing = stats.chasingAvg || stats.average;
    const death = stats.deathSR || stats.strikeRate;
    pressureHandling = Math.min(99, Math.max(55, Math.round((chasing / 45) * 50 + (death / 200) * 45)));
    paceAttack = Math.min(99, Math.max(50, Math.round((stats.paceSR || 145) / 1.7)));
    spinAttack = Math.min(99, Math.max(50, Math.round((stats.spinSR || 140) / 1.7)));

    if (death >= 195 || (stats.boundaryPercent && stats.boundaryPercent >= 24 && stats.strikeRate >= 160)) {
      archetype = '360° Lethal Finisher';
      archetypeColor = '#06b6d4';
      archetypeSummary = 'All-ground boundary elevation, unorthodox scoop mastery, and devastating death overs strike rates.';
    } else if (stats.average >= 38 && stats.strikeRate >= 135) {
      archetype = 'Masterclass Anchor';
      archetypeColor = '#10b981';
      archetypeSummary = 'Deep-innings anchor with strike rotation, controlled boundary bursts, and chase pacing.';
    } else if (power >= 88) {
      archetype = 'Maximum Impact Power Hitter';
      archetypeColor = '#f59e0b';
      archetypeSummary = 'Clean bat swing, muscle acceleration, and long-boundary clears targeting 100m+ maximums.';
    } else if (isAllRounder) {
      archetype = 'Two-Way Match Winner';
      archetypeColor = '#8b5cf6';
      archetypeSummary = 'Dual threat delivering lower-order counter-attacks and critical partnership-breaking overs.';
    } else {
      archetype = 'Precision Stroke Maker';
      archetypeColor = '#38bdf8';
      archetypeSummary = 'Orthodox timing, high-percentage cover drives, and flawless powerplay field manipulation.';
    }
  }

  return {
    power,
    timing,
    consistency,
    pressureHandling,
    paceAttack,
    spinAttack,
    archetype,
    archetypeColor,
    archetypeSummary,
  };
}

export interface PlayerDnaCardProps {
  player: Player;
  comparisonPlayer?: Player | null;
  onSelectPlayer?: (playerId: string) => void;
  isCompact?: boolean;
}

export const PlayerDnaCard: React.FC<PlayerDnaCardProps> = ({
  player,
  comparisonPlayer,
  onSelectPlayer,
  isCompact = false,
}) => {
  const [selectedMetricKey, setSelectedMetricKey] = useState<
    'power' | 'timing' | 'consistency' | 'pressureHandling' | null
  >(null);
  const [isSixAxis, setIsSixAxis] = useState(false);
  const [radarScanActive, setRadarScanActive] = useState(true);
  const [benchmarkOverlay, setBenchmarkOverlay] = useState<'none' | 'elite' | 'comparison'>(
    comparisonPlayer ? 'comparison' : 'none'
  );

  const dna = computePlayerDnaMetrics(player);
  const compDna = comparisonPlayer ? computePlayerDnaMetrics(comparisonPlayer) : null;

  // Elite T20 World Cup Benchmark (top 10% international standard)
  const eliteBenchmark = {
    power: 88,
    timing: 87,
    consistency: 85,
    pressureHandling: 89,
    paceAttack: 86,
    spinAttack: 84,
  };

  // Radar chart 4-axis data points:
  // Axis 0: Power (top)
  // Axis 1: Timing (right)
  // Axis 2: Consistency (bottom)
  // Axis 3: Pressure Handling (left)
  const coreMetrics = [
    { key: 'power', label: 'Power', value: dna.power, icon: Flame, color: '#f43f5e', compVal: compDna?.power, eliteVal: eliteBenchmark.power },
    { key: 'timing', label: 'Timing', value: dna.timing, icon: Target, color: '#06b6d4', compVal: compDna?.timing, eliteVal: eliteBenchmark.timing },
    { key: 'consistency', label: 'Consistency', value: dna.consistency, icon: Shield, color: '#10b981', compVal: compDna?.consistency, eliteVal: eliteBenchmark.consistency },
    { key: 'pressureHandling', label: 'Pressure Handling', value: dna.pressureHandling, icon: Zap, color: '#a855f7', compVal: compDna?.pressureHandling, eliteVal: eliteBenchmark.pressureHandling },
  ];

  const sixAxisMetrics = [
    { key: 'power', label: 'Power', value: dna.power, icon: Flame, color: '#f43f5e', compVal: compDna?.power, eliteVal: eliteBenchmark.power },
    { key: 'timing', label: 'Timing', value: dna.timing, icon: Target, color: '#06b6d4', compVal: compDna?.timing, eliteVal: eliteBenchmark.timing },
    { key: 'paceAttack', label: 'Pace Attack', value: dna.paceAttack, icon: Activity, color: '#f59e0b', compVal: compDna?.paceAttack, eliteVal: eliteBenchmark.paceAttack },
    { key: 'consistency', label: 'Consistency', value: dna.consistency, icon: Shield, color: '#10b981', compVal: compDna?.consistency, eliteVal: eliteBenchmark.consistency },
    { key: 'spinAttack', label: 'Spin Attack', value: dna.spinAttack, icon: Layers, color: '#8b5cf6', compVal: compDna?.spinAttack, eliteVal: eliteBenchmark.spinAttack },
    { key: 'pressureHandling', label: 'Pressure Handling', value: dna.pressureHandling, icon: Zap, color: '#a855f7', compVal: compDna?.pressureHandling, eliteVal: eliteBenchmark.pressureHandling },
  ];

  const activeRadarList = isSixAxis ? sixAxisMetrics : coreMetrics;

  // Radar geometry
  const size = isCompact ? 190 : 320;
  const center = size / 2;
  const radius = center * 0.72;
  const totalPoints = activeRadarList.length;

  const getCoordinates = (val: number, idx: number, maxR: number) => {
    const angle = ((Math.PI * 2) / totalPoints) * idx - Math.PI / 2;
    const r = (val / 100) * maxR;
    return {
      x: center + r * Math.cos(angle),
      y: center + r * Math.sin(angle),
    };
  };

  const ringScales = [0.25, 0.5, 0.75, 1.0];

  const primaryPolygon = activeRadarList
    .map((item, idx) => {
      const { x, y } = getCoordinates(item.value, idx, radius);
      return `${x},${y}`;
    })
    .join(' ');

  // Secondary Benchmark Polygon
  const secondaryPolygon = activeRadarList
    .map((item, idx) => {
      const targetVal =
        benchmarkOverlay === 'comparison' && item.compVal !== undefined
          ? item.compVal
          : item.eliteVal;
      const { x, y } = getCoordinates(targetVal, idx, radius);
      return `${x},${y}`;
    })
    .join(' ');

  const overallDnaScore = Math.round(
    (dna.power + dna.timing + dna.consistency + dna.pressureHandling) / 4
  );

  // =========================================================================
  // COMPACT VARIANT: Sleek glowing card for grids/carousels
  // =========================================================================
  if (isCompact) {
    return (
      <div
        onClick={() => onSelectPlayer && onSelectPlayer(player.id)}
        className="group relative cursor-pointer overflow-hidden rounded-2xl border border-cyan-500/25 bg-gradient-to-b from-slate-900/80 via-slate-950/90 to-blue-950/40 p-4.5 backdrop-blur-xl shadow-[0_0_30px_rgba(6,182,212,0.12),inset_0_1px_1px_rgba(255,255,255,0.12)] hover:border-cyan-400 hover:shadow-[0_0_40px_rgba(6,182,212,0.32)] hover:scale-[1.02] transition-all duration-300"
      >
        {/* Specular top sheen */}
        <div className="pointer-events-none absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-cyan-400/50 to-transparent" />

        {/* Ambient neon corner bloom */}
        <div className="absolute -top-10 -right-10 h-24 w-24 rounded-full bg-cyan-500/20 blur-xl group-hover:bg-cyan-400/35 transition-colors" />

        {/* Header */}
        <div className="flex items-center gap-3 mb-2">
          <PlayerCardAvatar
            playerId={player.id}
            name={player.name}
            countryCode={player.countryCode}
            jerseyNumber={player.jerseyNumber || 18}
            imageUrl={player.imageUrl}
            size="md"
          />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <h4 className="truncate text-sm font-black text-white group-hover:text-cyan-300 transition-colors">
                {player.name}
              </h4>
              <CountryFlag countryCode={player.countryCode} size="sm" />
            </div>
            <p className="text-[11px] font-mono text-cyan-400 font-semibold truncate">
              {dna.archetype}
            </p>
          </div>
          <div className="flex flex-col items-end">
            <span className="text-[9px] font-mono text-slate-400 uppercase">DNA</span>
            <span className="text-sm font-black text-white tabular-nums">{overallDnaScore}</span>
          </div>
        </div>

        {/* Compact Animated Radar Chart */}
        <div className="relative mx-auto my-1 flex items-center justify-center">
          <svg width={size} height={size} className="overflow-visible select-none">
            <defs>
              <linearGradient id={`compactGradient-${player.id}`} x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#00F0FF" stopOpacity="0.45" />
                <stop offset="100%" stopColor="#a855f7" stopOpacity="0.25" />
              </linearGradient>
            </defs>

            {/* Background Rings */}
            {ringScales.map((scale, sIdx) => {
              const ringPoints = activeRadarList
                .map((_, i) => {
                  const { x, y } = getCoordinates(100, i, radius * scale);
                  return `${x},${y}`;
                })
                .join(' ');
              return (
                <polygon
                  key={sIdx}
                  points={ringPoints}
                  fill={sIdx === ringScales.length - 1 ? 'rgba(15, 23, 42, 0.45)' : 'none'}
                  stroke="rgba(56, 189, 248, 0.2)"
                  strokeWidth="1"
                  strokeDasharray={scale < 1 ? '2 2' : undefined}
                />
              );
            })}

            {/* Spokes */}
            {activeRadarList.map((_, i) => {
              const { x, y } = getCoordinates(100, i, radius);
              return (
                <line
                  key={i}
                  x1={center}
                  y1={center}
                  x2={x}
                  y2={y}
                  stroke="rgba(56, 189, 248, 0.16)"
                  strokeWidth="1"
                />
              );
            })}

            {/* Rotating Radar Scan Needle */}
            <g className="animate-radar-sweep pointer-events-none" style={{ transformOrigin: `${center}px ${center}px` }}>
              <line
                x1={center}
                y1={center}
                x2={center + radius}
                y2={center}
                stroke="#00F0FF"
                strokeWidth="1.5"
                strokeOpacity="0.7"
                strokeLinecap="round"
              />
            </g>

            {/* Glowing Polygon */}
            <polygon
              points={primaryPolygon}
              fill={`url(#compactGradient-${player.id})`}
              stroke="#00F0FF"
              strokeWidth="2.2"
              className="transition-all duration-500 ease-out drop-shadow-[0_0_10px_rgba(6,182,212,0.65)]"
            />

            {/* Vertices */}
            {activeRadarList.map((item, i) => {
              const { x, y } = getCoordinates(item.value, i, radius);
              return (
                <circle
                  key={i}
                  cx={x}
                  cy={y}
                  r="3.5"
                  fill="#00F0FF"
                  stroke="#020617"
                  strokeWidth="1.5"
                />
              );
            })}

            {/* Metric Labels on Compact view */}
            {activeRadarList.map((item, i) => {
              const labelCoord = getCoordinates(120, i, radius);
              return (
                <text
                  key={i}
                  x={labelCoord.x}
                  y={labelCoord.y + 3}
                  textAnchor="middle"
                  fill="#94a3b8"
                  fontSize="8.5"
                  fontWeight="bold"
                  fontFamily="monospace"
                >
                  {item.label === 'Pressure Handling' ? 'Pressure' : item.label}
                </text>
              );
            })}
          </svg>
        </div>

        {/* 4 Mini Stat Badges */}
        <div className="grid grid-cols-2 gap-1.5 mt-2 text-[10px] font-mono">
          {coreMetrics.map((m) => (
            <div
              key={m.key}
              className="flex items-center justify-between rounded-lg bg-slate-950/70 border border-slate-800/90 px-2 py-1"
            >
              <span className="text-slate-400">{m.label === 'Pressure Handling' ? 'Press:' : `${m.label}:`}</span>
              <span className="font-bold text-white tabular-nums">{m.value}</span>
            </div>
          ))}
        </div>

        {/* Card Footer */}
        <div className="mt-3 flex items-center justify-between text-[11px] font-mono border-t border-slate-800/80 pt-2 text-cyan-400">
          <span className="flex items-center gap-1 text-slate-300">
            <span className="h-1.5 w-1.5 rounded-full bg-cyan-400" />
            Rating: <strong className="text-white">{player.rating}</strong>
          </span>
          <span className="flex items-center gap-0.5 font-bold group-hover:translate-x-1 transition-transform">
            Analyze DNA <ArrowUpRight className="h-3 w-3" />
          </span>
        </div>
      </div>
    );
  }

  // =========================================================================
  // LARGE EXPANDED GLOWING GLASSMORPHIC CARD
  // =========================================================================
  return (
    <div className="relative overflow-hidden rounded-3xl border border-cyan-400/35 bg-gradient-to-br from-slate-900/90 via-slate-950/95 to-blue-950/60 p-6 sm:p-8 backdrop-blur-2xl shadow-[0_0_50px_rgba(6,182,212,0.18),inset_0_1px_1px_rgba(255,255,255,0.2)]">
      {/* Specular Top Shine Line */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[1.5px] bg-gradient-to-r from-transparent via-cyan-400/70 to-transparent" />

      {/* Atmospheric Neon Background Glows */}
      <div className="pointer-events-none absolute -top-28 -left-28 h-72 w-72 rounded-full bg-cyan-500/15 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-28 -right-28 h-72 w-72 rounded-full bg-purple-600/15 blur-3xl" />
      <div className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-96 w-96 rounded-full bg-blue-600/5 blur-3xl" />

      {/* Card Header & Player Identity */}
      <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-5 border-b border-cyan-500/20 pb-6">
        <div className="flex items-center gap-4">
          <PlayerCardAvatar
            playerId={player.id}
            name={player.name}
            countryCode={player.countryCode}
            jerseyNumber={player.jerseyNumber || 18}
            imageUrl={player.imageUrl}
            size="lg"
          />

          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                {player.name}
              </h3>
              <CountryFlag countryCode={player.countryCode} size="md" />
              <span className="rounded-full bg-cyan-500/20 border border-cyan-400/40 px-2.5 py-0.5 text-xs text-cyan-300 font-bold font-mono">
                {dna.archetype}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2 pt-1 text-xs text-slate-300 font-mono">
              <span className="font-bold text-white">{player.country}</span>
              <span className="text-slate-600">·</span>
              <span>{player.role}</span>
              <span className="text-slate-600">·</span>
              <span>{player.battingHand}</span>
              <span className="text-slate-600">·</span>
              <span className="text-cyan-400 font-semibold">{player.bowlingStyle}</span>
            </div>
          </div>
        </div>

        {/* Controls: 4-Axis / 6-Axis & Radar Scan & Benchmarks */}
        <div className="flex flex-wrap items-center gap-2.5 self-start md:self-center">
          {/* Radar Scan Toggle */}
          <button
            onClick={() => setRadarScanActive(!radarScanActive)}
            className={`flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-mono font-bold transition-all cursor-pointer ${
              radarScanActive
                ? 'border-cyan-400/40 bg-cyan-500/10 text-cyan-300 shadow-[0_0_15px_rgba(6,182,212,0.2)]'
                : 'border-slate-800 bg-slate-950/70 text-slate-400 hover:text-white'
            }`}
            title="Toggle animated radar beam sweep"
          >
            <Radar className={`h-3.5 w-3.5 ${radarScanActive ? 'text-cyan-400 animate-spin' : ''}`} style={{ animationDuration: '4s' }} />
            <span>Radar Scan: {radarScanActive ? 'ON' : 'OFF'}</span>
          </button>

          {/* Benchmark Overlay Toggle */}
          <div className="inline-flex rounded-xl bg-slate-950/80 p-1 border border-slate-800">
            <button
              onClick={() => setBenchmarkOverlay('none')}
              className={`rounded-lg px-2.5 py-1 text-xs font-mono font-bold transition-all cursor-pointer ${
                benchmarkOverlay === 'none'
                  ? 'bg-slate-800 text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Solo
            </button>
            <button
              onClick={() => setBenchmarkOverlay('elite')}
              className={`flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-mono font-bold transition-all cursor-pointer ${
                benchmarkOverlay === 'elite'
                  ? 'bg-amber-500/20 border border-amber-400/50 text-amber-300 shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Sparkles className="h-3 w-3 text-amber-400" />
              <span>Elite Benchmark</span>
            </button>
            {comparisonPlayer && (
              <button
                onClick={() => setBenchmarkOverlay('comparison')}
                className={`flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-mono font-bold transition-all cursor-pointer ${
                  benchmarkOverlay === 'comparison'
                    ? 'bg-purple-500/20 border border-purple-400/50 text-purple-300 shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Scale className="h-3 w-3 text-purple-400" />
                <span>vs {comparisonPlayer.name.split(' ')[0]}</span>
              </button>
            )}
          </div>

          {/* 4-Axis / 6-Axis Toggle */}
          <div className="inline-flex rounded-xl bg-slate-950/80 p-1 border border-slate-800">
            <button
              onClick={() => setIsSixAxis(false)}
              className={`rounded-lg px-3 py-1.5 text-xs font-mono font-bold transition-all cursor-pointer ${
                !isSixAxis
                  ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/30'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              4-Axis Core DNA
            </button>
            <button
              onClick={() => setIsSixAxis(true)}
              className={`rounded-lg px-3 py-1.5 text-xs font-mono font-bold transition-all cursor-pointer ${
                isSixAxis
                  ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/30'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              6-Axis Tactical
            </button>
          </div>
        </div>
      </div>

      {/* Main Radar & Metrics Display */}
      <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center pt-6">
        {/* Radar Chart Centerpiece (6 cols) */}
        <div className="lg:col-span-6 flex flex-col items-center justify-center p-5 rounded-2xl border border-cyan-500/20 bg-slate-950/70 shadow-inner relative overflow-hidden">
          {/* Header of radar box */}
          <div className="flex items-center justify-between w-full px-2 mb-2 text-xs font-mono">
            <span className="text-cyan-400 font-bold flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-cyan-400 animate-pulse" />
              <span>ANIMATED BIOMECHANICAL RADAR</span>
            </span>
            <div className="flex items-center gap-2">
              <span className="text-slate-400">
                {isSixAxis ? '6-Point Scouting Mesh' : 'Diamond 4-Metric Grid'}
              </span>
            </div>
          </div>

          {/* Radar Legend when Benchmark is active */}
          {benchmarkOverlay !== 'none' && (
            <div className="flex items-center gap-4 text-[11px] font-mono mb-2">
              <div className="flex items-center gap-1.5 text-cyan-300 font-bold">
                <span className="h-2.5 w-2.5 rounded-full bg-cyan-400 shadow-[0_0_8px_#00F0FF]" />
                <span>{player.name}</span>
              </div>
              <div className="flex items-center gap-1.5 text-amber-300 font-bold">
                <span className="h-2.5 w-2.5 rounded-full bg-amber-400 shadow-[0_0_8px_#f59e0b]" />
                <span>
                  {benchmarkOverlay === 'elite'
                    ? 'T20 Elite Benchmark (Top 10%)'
                    : `Comparison: ${comparisonPlayer?.name}`}
                </span>
              </div>
            </div>
          )}

          {/* The Animated SVG Radar Canvas */}
          <div className="relative py-2">
            <svg width={size} height={size} className="overflow-visible select-none">
              <defs>
                {/* Main Player Neon Gradient */}
                <linearGradient id="dnaRadarGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#00F0FF" stopOpacity="0.45" />
                  <stop offset="50%" stopColor="#38bdf8" stopOpacity="0.25" />
                  <stop offset="100%" stopColor="#a855f7" stopOpacity="0.35" />
                </linearGradient>

                {/* Secondary Benchmark Gradient */}
                <linearGradient id="benchmarkGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.30" />
                  <stop offset="100%" stopColor="#ef4444" stopOpacity="0.15" />
                </linearGradient>

                {/* Radar Sweep Beam Gradient */}
                <linearGradient id="radarBeamGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#00F0FF" stopOpacity="0.0" />
                  <stop offset="60%" stopColor="#00F0FF" stopOpacity="0.6" />
                  <stop offset="100%" stopColor="#00F0FF" stopOpacity="1.0" />
                </linearGradient>

                {/* Neon Glow Filter */}
                <filter id="neonGlowFilter" x="-30%" y="-30%" width="160%" height="160%">
                  <feGaussianBlur stdDeviation="5" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>

              {/* Background Concentric Radar Rings */}
              {ringScales.map((scale, sIdx) => {
                const ringPoints = activeRadarList
                  .map((_, i) => {
                    const { x, y } = getCoordinates(100, i, radius * scale);
                    return `${x},${y}`;
                  })
                  .join(' ');
                return (
                  <polygon
                    key={sIdx}
                    points={ringPoints}
                    fill={sIdx === ringScales.length - 1 ? 'rgba(8, 14, 29, 0.5)' : 'none'}
                    stroke="rgba(56, 189, 248, 0.18)"
                    strokeWidth="1.2"
                    strokeDasharray={scale < 1 ? '3 3' : undefined}
                  />
                );
              })}

              {/* Axis Spokes from Center */}
              {activeRadarList.map((item, i) => {
                const { x, y } = getCoordinates(100, i, radius);
                const isSelected = selectedMetricKey === item.key;
                return (
                  <g key={i}>
                    <line
                      x1={center}
                      y1={center}
                      x2={x}
                      y2={y}
                      stroke={isSelected ? '#00F0FF' : 'rgba(56, 189, 248, 0.22)'}
                      strokeWidth={isSelected ? '2.5' : '1'}
                      className="transition-colors duration-300"
                    />
                  </g>
                );
              })}

              {/* Animated Radar Scanning Beam */}
              {radarScanActive && (
                <g
                  className="animate-radar-sweep pointer-events-none"
                  style={{ transformOrigin: `${center}px ${center}px` }}
                >
                  <line
                    x1={center}
                    y1={center}
                    x2={center + radius * 1.05}
                    y2={center}
                    stroke="url(#radarBeamGradient)"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    className="drop-shadow-[0_0_8px_rgba(6,182,212,0.85)]"
                  />
                  <circle
                    cx={center + radius * 1.05}
                    cy={center}
                    r="3.5"
                    fill="#00F0FF"
                    className="animate-ping"
                  />
                </g>
              )}

              {/* Secondary Benchmark / Comparison Polygon (if enabled) */}
              {benchmarkOverlay !== 'none' && (
                <polygon
                  points={secondaryPolygon}
                  fill="url(#benchmarkGradient)"
                  stroke="#f59e0b"
                  strokeWidth="2"
                  strokeDasharray="4 3"
                  className="transition-all duration-700 ease-out opacity-85"
                />
              )}

              {/* Ambient Glowing Polygon Halo */}
              <polygon
                points={primaryPolygon}
                fill="rgba(6, 182, 212, 0.15)"
                stroke="#06b6d4"
                strokeWidth="4"
                className="animate-radar-pulse opacity-75"
              />

              {/* Primary Glowing Data Polygon with Morphing Animation */}
              <polygon
                points={primaryPolygon}
                fill="url(#dnaRadarGradient)"
                stroke="#00F0FF"
                strokeWidth="2.8"
                filter="url(#neonGlowFilter)"
                className="transition-all duration-700 ease-out cursor-pointer"
              />

              {/* Data Vertices with Glowing Beacon Dots */}
              {activeRadarList.map((item, i) => {
                const { x, y } = getCoordinates(item.value, i, radius);
                const isSelected = selectedMetricKey === item.key;
                return (
                  <g
                    key={i}
                    onClick={() => setSelectedMetricKey(isSelected ? null : (item.key as any))}
                    className="cursor-pointer group/dot"
                  >
                    {/* Pulsing Outer Halo when Selected */}
                    {isSelected && (
                      <circle
                        cx={x}
                        cy={y}
                        r="12"
                        fill="rgba(6, 182, 212, 0.35)"
                        className="animate-ping"
                      />
                    )}
                    <circle
                      cx={x}
                      cy={y}
                      r={isSelected ? '7' : '5'}
                      fill={isSelected ? '#FFFFFF' : '#00F0FF'}
                      stroke="#020617"
                      strokeWidth="2"
                      className="transition-all duration-300 hover:scale-125 drop-shadow-[0_0_8px_#00F0FF]"
                    />
                    <text
                      x={x}
                      y={y - 12}
                      textAnchor="middle"
                      fill="#FFFFFF"
                      fontSize="11"
                      fontWeight="bold"
                      fontFamily="monospace"
                      className="pointer-events-none drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]"
                    >
                      {item.value}
                    </text>
                  </g>
                );
              })}

              {/* Outer Axis Labels */}
              {activeRadarList.map((item, i) => {
                const labelCoord = getCoordinates(124, i, radius);
                const isSelected = selectedMetricKey === item.key;
                return (
                  <text
                    key={i}
                    x={labelCoord.x}
                    y={labelCoord.y + 4}
                    textAnchor="middle"
                    fill={isSelected ? '#00F0FF' : '#94a3b8'}
                    fontSize="11.5"
                    fontWeight={isSelected ? '900' : '700'}
                    fontFamily="monospace"
                    className="cursor-pointer transition-colors duration-200 select-none hover:fill-white"
                    onClick={() => setSelectedMetricKey(isSelected ? null : (item.key as any))}
                  >
                    {item.label}
                  </text>
                );
              })}
            </svg>
          </div>

          <p className="text-[11px] font-mono text-slate-400 mt-2 text-center">
            Click any metric node (Power · Timing · Consistency · Pressure) to expand deep scouting telemetry
          </p>
        </div>

        {/* DNA Metrics Breakdown & Telemetry Bars (6 cols) */}
        <div className="lg:col-span-6 space-y-4">
          <div className="rounded-2xl border border-slate-800/90 bg-slate-950/75 p-5 space-y-3.5 backdrop-blur-md">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-white font-bold tracking-wider uppercase flex items-center gap-1.5">
                <Sliders className="h-3.5 w-3.5 text-cyan-400" />
                <span>CORE PLAYER DNA METRICS</span>
              </span>
              <span className="rounded-md bg-cyan-500/20 border border-cyan-400/30 px-2 py-0.5 text-cyan-300 font-bold font-mono">
                OVERALL DNA: {overallDnaScore}/100
              </span>
            </div>

            {/* Metric Bars */}
            <div className="space-y-3 pt-1">
              {coreMetrics.map((stat) => {
                const Icon = stat.icon;
                const isSelected = selectedMetricKey === stat.key;
                const scoreTier =
                  stat.value >= 92 ? 'ELITE' : stat.value >= 85 ? 'WORLD CLASS' : stat.value >= 75 ? 'HIGH' : 'SOLID';

                return (
                  <div
                    key={stat.key}
                    onClick={() => setSelectedMetricKey(isSelected ? null : (stat.key as any))}
                    className={`rounded-xl border p-3 transition-all cursor-pointer ${
                      isSelected
                        ? 'border-cyan-400 bg-cyan-950/35 shadow-[0_0_20px_rgba(6,182,212,0.25)]'
                        : 'border-slate-800 bg-slate-900/60 hover:border-slate-700 hover:bg-slate-900/90'
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs font-mono mb-1.5">
                      <div className="flex items-center gap-2">
                        <div
                          className="flex h-6 w-6 items-center justify-center rounded-lg shadow-sm"
                          style={{ backgroundColor: `${stat.color}22`, color: stat.color }}
                        >
                          <Icon className="h-3.5 w-3.5" />
                        </div>
                        <span className="font-bold text-white uppercase">{stat.label}</span>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-[10px] rounded px-1.5 py-0.5 bg-slate-800 text-slate-300 font-bold">
                          {scoreTier}
                        </span>
                        <span className="text-sm font-black tabular-nums text-white">
                          {stat.value}
                          <span className="text-[10px] text-slate-500 font-normal">/100</span>
                        </span>
                      </div>
                    </div>

                    {/* Glowing Progress Track */}
                    <div className="h-2 w-full rounded-full bg-slate-950 overflow-hidden relative">
                      <div
                        className="h-full rounded-full transition-all duration-700"
                        style={{
                          width: `${stat.value}%`,
                          backgroundColor: stat.color,
                          boxShadow: `0 0 12px ${stat.color}AA`,
                        }}
                      />
                      {/* Benchmark marker tick */}
                      {benchmarkOverlay === 'elite' && (
                        <div
                          className="absolute top-0 bottom-0 w-1 bg-amber-400 z-10 shadow-[0_0_6px_#f59e0b]"
                          style={{ left: `${stat.eliteVal}%` }}
                          title={`Elite Benchmark: ${stat.eliteVal}`}
                        />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Biomechanical Tactical Archetype Insight Box */}
          <div className="rounded-2xl border border-cyan-500/25 bg-gradient-to-r from-cyan-950/25 to-blue-950/30 p-4.5 space-y-2 backdrop-blur-md">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-cyan-300 flex items-center gap-1.5 font-mono">
                <Activity className="h-3.5 w-3.5 text-cyan-400" />
                <span>AI BIOMECHANICAL DIAGNOSIS</span>
              </span>
              <span className="text-[11px] font-mono text-slate-400">
                Calibrated to T20 World Cup Telemetry
              </span>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              {selectedMetricKey === 'power' && (
                <>
                  <strong className="text-rose-400">Power Index ({dna.power}/100): </strong>
                  Bat speed exceeds 142 km/h through impact zone. Exceptional boundary frequency ({player.stats.boundaryPercent}%) makes them an automatic boundary magnet.
                </>
              )}
              {selectedMetricKey === 'timing' && (
                <>
                  <strong className="text-cyan-300">Timing Index ({dna.timing}/100): </strong>
                  Sweet-spot hit rate ranks in the 94th percentile. Superb balance through transfer allows access to tight field gaps without losing shape.
                </>
              )}
              {selectedMetricKey === 'consistency' && (
                <>
                  <strong className="text-emerald-400">Consistency Index ({dna.consistency}/100): </strong>
                  Maintains an international average of {player.stats.average} with low dot-ball percentage ({player.stats.dotBallPercent || 30}%). Reliable match-to-match run floor.
                </>
              )}
              {selectedMetricKey === 'pressureHandling' && (
                <>
                  <strong className="text-purple-400">Pressure Handling ({dna.pressureHandling}/100): </strong>
                  Death overs strike rate elevates to {player.stats.deathSR || player.stats.strikeRate} under 12+ RRR required rate. Demonstrates supreme composure in clutch finishes.
                </>
              )}
              {!selectedMetricKey && (
                <>
                  <strong className="text-cyan-300">{dna.archetype}: </strong>
                  {dna.archetypeSummary}
                </>
              )}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
