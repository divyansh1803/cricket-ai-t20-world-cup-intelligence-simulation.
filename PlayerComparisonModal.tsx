import React, { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Player } from '../../types/cricket';
import { TEAMS } from '../../data/cricketData';
import { CountryFlag, PlayerCardAvatar } from '../common/CricketIdentity';
import { getPlayerDNA } from '../../utils/playerAnalytics';
import {
  X,
  Swords,
  Sparkles,
  TrendingUp,
  Award,
  Zap,
  Shield,
  Target,
  Flame,
  CheckCircle2,
  ChevronDown,
  RotateCcw,
} from 'lucide-react';

interface PlayerComparisonModalProps {
  playerA?: Player | null;
  playerB?: Player | null;
  isOpen: boolean;
  onClose: () => void;
  onInspectPlayer?: (player: Player) => void;
}

interface RadarMetric {
  key: string;
  label: string;
  shortLabel: string;
  getRawA: (p: Player) => number;
  getRawB: (p: Player) => number;
  // Normalized 0-100 score for radar chart geometry
  getNormA: (p: Player) => number;
  getNormB: (p: Player) => number;
  formatRaw: (val: number) => string;
  unit: string;
  higherIsBetter: boolean;
}

export const PlayerComparisonModal: React.FC<PlayerComparisonModalProps> = ({
  playerA: initialPlayerA,
  playerB: initialPlayerB,
  isOpen,
  onClose,
  onInspectPlayer,
}) => {
  // All players flat list from official teams
  const allPlayers = useMemo(() => TEAMS.flatMap((t) => t.squad), []);

  const [selectedPlayerAId, setSelectedPlayerAId] = useState<string>(
    initialPlayerA?.id || 'sky'
  );
  const [selectedPlayerBId, setSelectedPlayerBId] = useState<string>(
    initialPlayerB?.id || 'head'
  );

  // Sync if initial props change when opening
  React.useEffect(() => {
    if (initialPlayerA) setSelectedPlayerAId(initialPlayerA.id);
    if (initialPlayerB) setSelectedPlayerBId(initialPlayerB.id);
  }, [initialPlayerA, initialPlayerB]);

  const playerA = useMemo(
    () => allPlayers.find((p) => p.id === selectedPlayerAId) || allPlayers[0],
    [allPlayers, selectedPlayerAId]
  );

  const playerB = useMemo(
    () => allPlayers.find((p) => p.id === selectedPlayerBId) || allPlayers[1],
    [allPlayers, selectedPlayerBId]
  );

  const dnaA = useMemo(() => getPlayerDNA(playerA), [playerA]);
  const dnaB = useMemo(() => getPlayerDNA(playerB), [playerB]);

  // Core Key Attributes explicitly requested:
  // 1. Batting Average
  // 2. Strike Rate
  // 3. Bowling Economy (inverted so lower econ = higher score)
  // 4. Match-Winning Impact
  // 5. Boundary %
  // 6. Pressure Handling
  const metrics: RadarMetric[] = useMemo(
    () => [
      {
        key: 'average',
        label: 'Batting Average',
        shortLabel: 'Bat Avg',
        getRawA: (p) => p.stats.average,
        getRawB: (p) => p.stats.average,
        getNormA: (p) => Math.min(100, Math.max(15, Math.round((p.stats.average / 55) * 100))),
        getNormB: (p) => Math.min(100, Math.max(15, Math.round((p.stats.average / 55) * 100))),
        formatRaw: (val) => val.toFixed(1),
        unit: 'runs/inns',
        higherIsBetter: true,
      },
      {
        key: 'strikeRate',
        label: 'Strike Rate',
        shortLabel: 'Strike Rate',
        getRawA: (p) => p.stats.strikeRate,
        getRawB: (p) => p.stats.strikeRate,
        getNormA: (p) => Math.min(100, Math.max(20, Math.round((p.stats.strikeRate / 185) * 100))),
        getNormB: (p) => Math.min(100, Math.max(20, Math.round((p.stats.strikeRate / 185) * 100))),
        formatRaw: (val) => val.toFixed(1),
        unit: 'per 100 balls',
        higherIsBetter: true,
      },
      {
        key: 'economy',
        label: 'Bowling Economy',
        shortLabel: 'Economy',
        getRawA: (p) => p.stats.economy || (p.role.includes('Bowler') ? 7.5 : 9.0),
        getRawB: (p) => p.stats.economy || (p.role.includes('Bowler') ? 7.5 : 9.0),
        // For economy, lower raw is better. Map 5.5 (elite) -> 98, 11.0 (expensive) -> 35
        getNormA: (p) => {
          const raw = p.stats.economy || 9.0;
          return Math.min(100, Math.max(25, Math.round((12 - raw) * 12.5)));
        },
        getNormB: (p) => {
          const raw = p.stats.economy || 9.0;
          return Math.min(100, Math.max(25, Math.round((12 - raw) * 12.5)));
        },
        formatRaw: (val) => val.toFixed(2),
        unit: 'rpo',
        higherIsBetter: false,
      },
      {
        key: 'impact',
        label: 'Match-Winning Impact',
        shortLabel: 'Impact',
        getRawA: (p) => p.stats.impactScore,
        getRawB: (p) => p.stats.impactScore,
        getNormA: (p) => Math.min(100, Math.max(20, p.stats.impactScore)),
        getNormB: (p) => Math.min(100, Math.max(20, p.stats.impactScore)),
        formatRaw: (val) => `${val}`,
        unit: '/100',
        higherIsBetter: true,
      },
      {
        key: 'boundary',
        label: 'Boundary %',
        shortLabel: 'Boundary %',
        getRawA: (p) => p.stats.boundaryPercent,
        getRawB: (p) => p.stats.boundaryPercent,
        getNormA: (p) => Math.min(100, Math.max(20, Math.round((p.stats.boundaryPercent / 28) * 100))),
        getNormB: (p) => Math.min(100, Math.max(20, Math.round((p.stats.boundaryPercent / 28) * 100))),
        formatRaw: (val) => `${val.toFixed(1)}%`,
        unit: 'of balls',
        higherIsBetter: true,
      },
      {
        key: 'pressure',
        label: 'Pressure Handling',
        shortLabel: 'Pressure',
        getRawA: () => dnaA.pressureScore,
        getRawB: () => dnaB.pressureScore,
        getNormA: () => dnaA.pressureScore,
        getNormB: () => dnaB.pressureScore,
        formatRaw: (val) => `${val}`,
        unit: '/100',
        higherIsBetter: true,
      },
    ],
    [dnaA, dnaB]
  );

  // Quick preset duels
  const rivalDuels = [
    { label: 'SKY vs Travis Head', a: 'sky', b: 'head' },
    { label: 'Virat Kohli vs Steve Smith', a: 'vkohli', b: 'smith' },
    { label: 'Rohit Sharma vs Jos Buttler', a: 'rohit', b: 'buttler' },
    { label: 'Bumrah vs Cummins', a: 'bumrah', b: 'cummins' },
    { label: 'Rashid Khan vs Hasaranga', a: 'rashid', b: 'hasaranga' },
    { label: 'Klaasen vs Maxwell', a: 'klaasen', b: 'maxwell' },
  ];

  if (!isOpen) return null;

  // Radar geometry calculations
  const size = 380;
  const center = size / 2;
  const radius = (size / 2) * 0.72;
  const total = metrics.length;
  const rings = [0.25, 0.5, 0.75, 1.0];

  const getCoordinates = (value: number, index: number, maxRadius: number) => {
    const angle = (Math.PI * 2 / total) * index - Math.PI / 2;
    const r = (value / 100) * maxRadius;
    const x = center + r * Math.cos(angle);
    const y = center + r * Math.sin(angle);
    return { x, y };
  };

  const pointsA = metrics
    .map((m, i) => {
      const { x, y } = getCoordinates(m.getNormA(playerA), i, radius);
      return `${x},${y}`;
    })
    .join(' ');

  const pointsB = metrics
    .map((m, i) => {
      const { x, y } = getCoordinates(m.getNormB(playerB), i, radius);
      return `${x},${y}`;
    })
    .join(' ');

  // Calculate overall advantage score
  let winsA = 0;
  let winsB = 0;
  metrics.forEach((m) => {
    const rawA = m.getRawA(playerA);
    const rawB = m.getRawB(playerB);
    if (m.higherIsBetter) {
      if (rawA > rawB) winsA++;
      else if (rawB > rawA) winsB++;
    } else {
      if (rawA < rawB) winsA++;
      else if (rawB < rawA) winsB++;
    }
  });

  // Lock background scroll and listen for escape key
  useEffect(() => {
    if (!isOpen) return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/85 p-2 sm:p-4 md:p-6 backdrop-blur-xl overflow-y-auto animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {/* Modal Card with Electric Cyan / Amber Glowing Border */}
      <div className="relative w-full max-w-5xl rounded-3xl border-2 border-cyan-500/70 bg-gradient-to-b from-[#050D1A] via-[#040812] to-[#02050A] p-5 sm:p-7 md:p-8 shadow-[0_0_60px_rgba(6,182,212,0.35)] ring-1 ring-cyan-400/40 text-slate-100 max-h-[94vh] overflow-y-auto space-y-6">
        
        {/* Ambient Stadium Lighting Glow */}
        <div className="absolute -top-24 -left-24 w-80 h-80 bg-cyan-500/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-1/3 -right-24 w-72 h-72 bg-amber-500/15 rounded-full blur-3xl pointer-events-none" />

        {/* Modal Header Bar */}
        <div className="relative z-10 flex items-start sm:items-center justify-between gap-4 border-b border-cyan-500/20 pb-5">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-tr from-cyan-600 via-sky-500 to-amber-500 text-slate-950 shadow-[0_0_20px_rgba(6,182,212,0.5)]">
              <Swords className="h-6 w-6 stroke-[2.2]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono font-bold tracking-widest text-cyan-400 uppercase">
                  RADAR ANALYTICS ENGINE
                </span>
                <span className="rounded-full bg-cyan-500/15 border border-cyan-400/40 px-2 py-0.5 text-[9px] font-mono font-bold text-cyan-300">
                  HEAD-TO-HEAD
                </span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2">
                Player Comparison Radar
              </h2>
            </div>
          </div>

          <button
            onClick={onClose}
            className="rounded-xl border border-slate-800 bg-slate-900/80 p-2 text-slate-400 hover:text-white hover:border-slate-700 transition-colors cursor-pointer"
            title="Close comparison modal"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Preset Quick Rivalries */}
        <div className="relative z-10 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-mono text-slate-400 text-[11px] font-bold flex items-center gap-1.5">
              <Sparkles className="h-3 w-3 text-cyan-400" />
              QUICK RIVALRY SHOWDOWNS:
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {rivalDuels.map((duel, idx) => (
              <button
                key={idx}
                onClick={() => {
                  setSelectedPlayerAId(duel.a);
                  setSelectedPlayerBId(duel.b);
                }}
                className={`rounded-xl px-3 py-1.5 text-xs font-mono font-bold transition-all cursor-pointer border ${
                  selectedPlayerAId === duel.a && selectedPlayerBId === duel.b
                    ? 'bg-cyan-500 text-slate-950 border-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.4)]'
                    : 'bg-slate-900/90 border-slate-800 text-slate-300 hover:border-slate-700 hover:text-white'
                }`}
              >
                {duel.label}
              </button>
            ))}
          </div>
        </div>

        {/* Player Selectors & Badges (Side-by-Side) */}
        <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Player A Selection (Cyan Accent) */}
          <div className="rounded-2xl border-2 border-cyan-500/60 bg-gradient-to-br from-cyan-950/40 via-slate-900/80 to-slate-950 p-4 space-y-3 shadow-lg">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono font-black text-cyan-400 tracking-wider flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-cyan-400 shadow-[0_0_8px_#22d3ee]" />
                CONTENDER A (CYAN)
              </span>
              <span className="text-xs font-mono font-bold text-slate-400">
                Rating: <strong className="text-cyan-400 font-black">{playerA.rating}/100</strong>
              </span>
            </div>

            <div className="relative">
              <select
                value={selectedPlayerAId}
                onChange={(e) => setSelectedPlayerAId(e.target.value)}
                className="w-full appearance-none rounded-xl border border-cyan-500/40 bg-slate-950/90 px-3.5 py-2.5 text-xs sm:text-sm font-bold text-white focus:outline-none focus:border-cyan-400 cursor-pointer"
              >
                {allPlayers.map((p) => (
                  <option key={p.id} value={p.id} className="bg-slate-900 text-white">
                    {p.name} ({p.country} · {p.role})
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-3 h-4 w-4 text-slate-400 pointer-events-none" />
            </div>

            <div className="flex items-center gap-3 pt-1">
              <PlayerCardAvatar
                playerId={playerA.id}
                name={playerA.name}
                countryCode={playerA.countryCode}
                jerseyNumber={playerA.jerseyNumber || 18}
                imageUrl={playerA.imageUrl}
                size="md"
              />
              <div className="min-w-0 flex-1">
                <h3 className="text-base font-black text-white truncate">{playerA.name}</h3>
                <p className="text-xs text-cyan-300 font-mono flex items-center gap-1.5">
                  <CountryFlag countryCode={playerA.countryCode} size="sm" />
                  <span>{playerA.country}</span>
                  <span>·</span>
                  <span>{playerA.role}</span>
                </p>
              </div>
              {onInspectPlayer && (
                <button
                  onClick={() => onInspectPlayer(playerA)}
                  className="rounded-lg bg-cyan-500/20 border border-cyan-500/40 px-2.5 py-1 text-[11px] font-mono font-bold text-cyan-300 hover:bg-cyan-500/30 transition-colors cursor-pointer"
                >
                  360° Analytics
                </button>
              )}
            </div>
          </div>

          {/* Player B Selection (Amber Accent) */}
          <div className="rounded-2xl border-2 border-amber-500/60 bg-gradient-to-br from-amber-950/40 via-slate-900/80 to-slate-950 p-4 space-y-3 shadow-lg">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono font-black text-amber-400 tracking-wider flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-amber-400 shadow-[0_0_8px_#f59e0b]" />
                CONTENDER B (AMBER)
              </span>
              <span className="text-xs font-mono font-bold text-slate-400">
                Rating: <strong className="text-amber-400 font-black">{playerB.rating}/100</strong>
              </span>
            </div>

            <div className="relative">
              <select
                value={selectedPlayerBId}
                onChange={(e) => setSelectedPlayerBId(e.target.value)}
                className="w-full appearance-none rounded-xl border border-amber-500/40 bg-slate-950/90 px-3.5 py-2.5 text-xs sm:text-sm font-bold text-white focus:outline-none focus:border-amber-400 cursor-pointer"
              >
                {allPlayers.map((p) => (
                  <option key={p.id} value={p.id} className="bg-slate-900 text-white">
                    {p.name} ({p.country} · {p.role})
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-3 h-4 w-4 text-slate-400 pointer-events-none" />
            </div>

            <div className="flex items-center gap-3 pt-1">
              <PlayerCardAvatar
                playerId={playerB.id}
                name={playerB.name}
                countryCode={playerB.countryCode}
                jerseyNumber={playerB.jerseyNumber || 18}
                imageUrl={playerB.imageUrl}
                size="md"
              />
              <div className="min-w-0 flex-1">
                <h3 className="text-base font-black text-white truncate">{playerB.name}</h3>
                <p className="text-xs text-amber-300 font-mono flex items-center gap-1.5">
                  <CountryFlag countryCode={playerB.countryCode} size="sm" />
                  <span>{playerB.country}</span>
                  <span>·</span>
                  <span>{playerB.role}</span>
                </p>
              </div>
              {onInspectPlayer && (
                <button
                  onClick={() => onInspectPlayer(playerB)}
                  className="rounded-lg bg-amber-500/20 border border-amber-500/40 px-2.5 py-1 text-[11px] font-mono font-bold text-amber-300 hover:bg-amber-500/30 transition-colors cursor-pointer"
                >
                  360° Analytics
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Centerpiece: Radar Chart & Attribute Metrics Matrix */}
        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
          
          {/* LEFT / CENTER: Dual-Layer Radar Chart (7 Cols) */}
          <div className="lg:col-span-6 flex flex-col items-center justify-center rounded-3xl border border-slate-800 bg-slate-950/80 p-5 shadow-inner">
            <div className="flex items-center justify-between w-full mb-2">
              <span className="text-[11px] font-mono font-bold text-slate-400 flex items-center gap-1.5">
                <Target className="h-3.5 w-3.5 text-cyan-400" />
                ATTRIBUTE RADAR PROFILE
              </span>
              <div className="flex items-center gap-3 text-xs font-mono">
                <div className="flex items-center gap-1.5 text-cyan-400">
                  <span className="h-2 w-2 rounded-full bg-cyan-400 shadow-[0_0_6px_#22d3ee]" />
                  <span>{playerA.name.split(' ').pop()}</span>
                </div>
                <span className="text-slate-600">vs</span>
                <div className="flex items-center gap-1.5 text-amber-400">
                  <span className="h-2 w-2 rounded-full bg-amber-400 shadow-[0_0_6px_#f59e0b]" />
                  <span>{playerB.name.split(' ').pop()}</span>
                </div>
              </div>
            </div>

            {/* SVG Dual Radar Visualization */}
            <div className="relative flex items-center justify-center my-2">
              <svg width={size} height={size} className="overflow-visible max-w-full h-auto">
                {/* Background Concentric Rings (25%, 50%, 75%, 100%) */}
                {rings.map((factor, rIdx) => {
                  const ringPoints = metrics
                    .map((_, i) => {
                      const { x, y } = getCoordinates(100, i, radius * factor);
                      return `${x},${y}`;
                    })
                    .join(' ');

                  return (
                    <polygon
                      key={rIdx}
                      points={ringPoints}
                      fill="none"
                      stroke="#1e293b"
                      strokeWidth="1.2"
                      strokeDasharray={factor < 1 ? '3 3' : undefined}
                    />
                  );
                })}

                {/* Spokes from center to edge with glowing radial ticks */}
                {metrics.map((_, i) => {
                  const { x, y } = getCoordinates(100, i, radius);
                  return (
                    <line
                      key={i}
                      x1={center}
                      y1={center}
                      x2={x}
                      y2={y}
                      stroke="#334155"
                      strokeWidth="1"
                      strokeOpacity="0.6"
                    />
                  );
                })}

                {/* Player B Radar Area (Amber) */}
                <polygon
                  points={pointsB}
                  fill="rgba(245, 158, 11, 0.22)"
                  stroke="#f59e0b"
                  strokeWidth="2.5"
                  className="transition-all duration-500 ease-out drop-shadow-[0_0_12px_rgba(245,158,11,0.4)]"
                />

                {/* Player A Radar Area (Cyan) */}
                <polygon
                  points={pointsA}
                  fill="rgba(6, 182, 212, 0.26)"
                  stroke="#06b6d4"
                  strokeWidth="2.5"
                  className="transition-all duration-500 ease-out drop-shadow-[0_0_12px_rgba(6,182,212,0.5)]"
                />

                {/* Player B Dots */}
                {metrics.map((m, i) => {
                  const { x, y } = getCoordinates(m.getNormB(playerB), i, radius);
                  return (
                    <circle
                      key={`b-${i}`}
                      cx={x}
                      cy={y}
                      r="4"
                      fill="#f59e0b"
                      stroke="#0f172a"
                      strokeWidth="1.5"
                    />
                  );
                })}

                {/* Player A Dots */}
                {metrics.map((m, i) => {
                  const { x, y } = getCoordinates(m.getNormA(playerA), i, radius);
                  return (
                    <circle
                      key={`a-${i}`}
                      cx={x}
                      cy={y}
                      r="4"
                      fill="#06b6d4"
                      stroke="#0f172a"
                      strokeWidth="1.5"
                    />
                  );
                })}

                {/* Metric Labels positioned around radar perimeter */}
                {metrics.map((m, i) => {
                  const labelDistance = radius + 24;
                  const angle = (Math.PI * 2 / total) * i - Math.PI / 2;
                  const lx = center + labelDistance * Math.cos(angle);
                  const ly = center + labelDistance * Math.sin(angle);

                  return (
                    <text
                      key={`lbl-${i}`}
                      x={lx}
                      y={ly}
                      textAnchor="middle"
                      dominantBaseline="central"
                      className="text-[11px] font-mono font-bold fill-slate-300 select-none tracking-tight"
                    >
                      {m.shortLabel}
                    </text>
                  );
                })}
              </svg>
            </div>

            {/* Verdict Summary Pill */}
            <div className="w-full mt-2 rounded-xl border border-slate-800 bg-slate-900/90 p-2.5 flex items-center justify-between text-xs font-mono">
              <span className="text-slate-400">RADAR ADVANTAGE:</span>
              <div className="flex items-center gap-2">
                <span className={`font-bold ${winsA >= winsB ? 'text-cyan-400' : 'text-slate-400'}`}>
                  {playerA.name.split(' ').pop()}: {winsA}
                </span>
                <span className="text-slate-600">·</span>
                <span className={`font-bold ${winsB >= winsA ? 'text-amber-400' : 'text-slate-400'}`}>
                  {playerB.name.split(' ').pop()}: {winsB}
                </span>
              </div>
            </div>
          </div>

          {/* RIGHT: Detailed Head-to-Head Attributes Breakdown (6 Cols) */}
          <div className="lg:col-span-6 space-y-3 font-mono">
            <div className="flex items-center justify-between text-xs border-b border-slate-800 pb-2">
              <span className="text-cyan-400 font-bold">{playerA.name}</span>
              <span className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">
                HEAD-TO-HEAD METRIC
              </span>
              <span className="text-amber-400 font-bold">{playerB.name}</span>
            </div>

            <div className="space-y-2.5">
              {metrics.map((m) => {
                const rawA = m.getRawA(playerA);
                const rawB = m.getRawB(playerB);
                const normA = m.getNormA(playerA);
                const normB = m.getNormB(playerB);

                const aWins = m.higherIsBetter ? rawA > rawB : rawA < rawB;
                const bWins = m.higherIsBetter ? rawB > rawA : rawB < rawA;
                const tie = rawA === rawB;

                return (
                  <div
                    key={m.key}
                    className="rounded-xl border border-slate-800/90 bg-slate-900/70 p-3 space-y-1.5 hover:border-slate-700 transition-colors"
                  >
                    <div className="flex items-center justify-between text-xs">
                      {/* Contender A Score */}
                      <div className="flex items-center gap-1.5 min-w-[70px]">
                        <span
                          className={`font-black ${
                            aWins ? 'text-cyan-400' : 'text-slate-400'
                          }`}
                        >
                          {m.formatRaw(rawA)}
                        </span>
                        {aWins && (
                          <span className="rounded bg-cyan-500/20 px-1 py-0.2 text-[9px] font-bold text-cyan-300">
                            LEAD
                          </span>
                        )}
                      </div>

                      {/* Metric Name */}
                      <div className="text-center">
                        <span className="text-[11px] font-bold text-white block">
                          {m.label}
                        </span>
                        <span className="text-[9px] text-slate-500 block">
                          {m.unit}
                        </span>
                      </div>

                      {/* Contender B Score */}
                      <div className="flex items-center justify-end gap-1.5 min-w-[70px]">
                        {bWins && (
                          <span className="rounded bg-amber-500/20 px-1 py-0.2 text-[9px] font-bold text-amber-300">
                            LEAD
                          </span>
                        )}
                        <span
                          className={`font-black ${
                            bWins ? 'text-amber-400' : 'text-slate-400'
                          }`}
                        >
                          {m.formatRaw(rawB)}
                        </span>
                      </div>
                    </div>

                    {/* Dual Comparative Progress Bar */}
                    <div className="flex h-2 w-full rounded-full bg-slate-950 overflow-hidden gap-1 p-0.5 border border-slate-850">
                      <div
                        className="h-full bg-gradient-to-r from-cyan-600 to-cyan-400 rounded-full transition-all duration-500 shadow-[0_0_8px_rgba(6,182,212,0.4)]"
                        style={{
                          width: `${(normA / (normA + normB || 1)) * 100}%`,
                        }}
                      />
                      <div
                        className="h-full bg-gradient-to-r from-amber-400 to-amber-600 rounded-full transition-all duration-500 shadow-[0_0_8px_rgba(245,158,11,0.4)]"
                        style={{
                          width: `${(normB / (normA + normB || 1)) * 100}%`,
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Tactical AI Conclusion Box */}
            <div className="rounded-2xl border border-cyan-500/30 bg-cyan-950/20 p-3.5 flex items-start gap-3">
              <Sparkles className="h-4 w-4 text-cyan-400 shrink-0 mt-0.5" />
              <div className="text-xs space-y-1">
                <p className="font-bold text-white">AI Scout Analysis Verdict</p>
                <p className="text-[11px] text-slate-300 font-sans leading-relaxed">
                  {winsA > winsB
                    ? `${playerA.name} demonstrates superior overall match parameters (${winsA}/${metrics.length} metrics), driven by elevated scoring tempo and impact execution.`
                    : winsB > winsA
                    ? `${playerB.name} commands tactical advantage across ${winsB}/${metrics.length} metrics, exhibiting tighter pressure absorption and higher execution reliability.`
                    : `${playerA.name} and ${playerB.name} stand deadlocked across key metrics—a premier balanced matchup dictated by match phase and pitch conditions.`}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer Controls */}
        <div className="relative z-10 flex flex-wrap items-center justify-between gap-3 border-t border-slate-800 pt-4">
          <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
            <span className="flex h-2 w-2 rounded-full bg-cyan-400" />
            <span>Attributes calibrated from verified T20 World Cup dataset</span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                // Swap players
                const temp = selectedPlayerAId;
                setSelectedPlayerAId(selectedPlayerBId);
                setSelectedPlayerBId(temp);
              }}
              className="flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-900 px-3.5 py-2 text-xs font-mono font-bold text-slate-300 hover:text-white hover:border-slate-600 transition-colors cursor-pointer"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>Swap Sides</span>
            </button>

            <button
              onClick={onClose}
              className="rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 px-5 py-2 text-xs font-black text-slate-950 hover:brightness-110 shadow-[0_0_15px_rgba(6,182,212,0.4)] transition-all cursor-pointer"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};
