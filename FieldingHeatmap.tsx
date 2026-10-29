import React, { useMemo, useState } from 'react';
import { Crosshair, Eye, Shield, Target, Users } from 'lucide-react';
import { Player } from '../../types/cricket';
import { TEAMS } from '../../data/cricketData';
import { PlayerCardAvatar, TeamFlag } from './CricketIdentity';

export interface FieldingHeatmapProps {
  initialBatter?: Player;
  venueName?: string;
  onClose?: () => void;
}

type MatchPhase = 'powerplay' | 'middle' | 'death';

interface SectorProfile {
  id: string;
  name: string;
  rhbAngleDeg: number; // 0 deg = straight down ground (top), clockwise for RHB (off-side = left [200..340], leg-side = right [20..160])
  runsSharePct: number;
  strikeRate: number;
  boundaryPct: number;
  heatLevel: number; // 0..1
}

interface DynamicFielderPin {
  id: string;
  code: string;
  roleLabel: string;
  sectorName: string;
  isBoundaryRider: boolean;
  x: number;
  y: number;
  saveProbPct: number;
  sectorSharePct: number;
}

const CANONICAL_SECTORS: Array<{ id: string; name: string; rhbAngleDeg: number }> = [
  { id: 'straight', name: 'Straight / Long-Off', rhbAngleDeg: 348 },
  { id: 'extra_cover', name: 'Extra Cover', rhbAngleDeg: 305 },
  { id: 'cover_point', name: 'Cover / Point', rhbAngleDeg: 268 },
  { id: 'third_man', name: 'Third Man', rhbAngleDeg: 222 },
  { id: 'fine_leg', name: 'Fine Leg', rhbAngleDeg: 138 },
  { id: 'square_leg', name: 'Square Leg', rhbAngleDeg: 92 },
  { id: 'mid_wicket', name: 'Mid Wicket', rhbAngleDeg: 52 },
  { id: 'long_on', name: 'Long-On', rhbAngleDeg: 14 },
];

function mapZoneNameToSectorId(zoneName: string): string {
  const z = zoneName.toLowerCase();
  if (z.includes('fine')) return 'fine_leg';
  if (z.includes('square')) return 'square_leg';
  if (z.includes('mid wicket') || z.includes('mid-wicket') || z.includes('cow')) return 'mid_wicket';
  if (z.includes('long on') || z.includes('long-on')) return 'long_on';
  if (z.includes('third')) return 'third_man';
  if (z.includes('point')) return 'cover_point';
  if (z.includes('extra')) return 'extra_cover';
  if (z.includes('cover')) return 'cover_point';
  return 'straight';
}

export function computeBatterSectorDistribution(batter: Player): SectorProfile[] {
  const isLeftHand = batter.battingHand === 'Left-hand';
  const baseSR = batter.stats.strikeRate || 132;
  const baseBnd = batter.stats.boundaryPercent || 14;

  // Deterministic seed from batter id so distributions are stable and player-authentic
  let hash = 0;
  for (let i = 0; i < batter.id.length; i++) {
    hash = (hash * 31 + batter.id.charCodeAt(i)) % 997;
  }

  const weights: Record<string, { runs: number; sr: number; bnd: number }> = {};
  CANONICAL_SECTORS.forEach((sec, idx) => {
    const jitter = ((hash + idx * 37) % 19) - 9;
    const defaultRuns =
      sec.id === 'mid_wicket'
        ? 165
        : sec.id === 'cover_point'
        ? 155
        : sec.id === 'extra_cover'
        ? 130
        : sec.id === 'long_on'
        ? 125
        : sec.id === 'square_leg'
        ? 115
        : sec.id === 'straight'
        ? 110
        : 95;
    weights[sec.id] = {
      runs: Math.max(45, defaultRuns + jitter * 3),
      sr: Math.max(95, Math.round(baseSR + jitter * 1.4)),
      bnd: Math.max(6, Number((baseBnd + jitter * 0.35).toFixed(1))),
    };
  });

  // Override / amplify using actual recorded shotZones on the Player record
  for (const sz of batter.shotZones || []) {
    const targetId = mapZoneNameToSectorId(sz.zone);
    if (weights[targetId]) {
      weights[targetId] = {
        runs: weights[targetId].runs + sz.runs * 0.65,
        sr: Math.round((weights[targetId].sr + sz.strikeRate) / 2),
        bnd: Number(Math.max(weights[targetId].bnd, sz.boundaryPercent).toFixed(1)),
      };
    }
    // If Cover is heavy, also boost Extra Cover proportionally
    if (sz.zone.toLowerCase() === 'cover') {
      weights.extra_cover.runs += sz.runs * 0.35;
      weights.extra_cover.sr = Math.max(weights.extra_cover.sr, Math.round(sz.strikeRate * 0.97));
    }
  }

  const totalRunsWeight = Object.values(weights).reduce((acc, w) => acc + w.runs, 0) || 1;
  const rawShares = CANONICAL_SECTORS.map((sec) => (weights[sec.id].runs / totalRunsWeight) * 100);
  const maxShare = Math.max(...rawShares, 18);
  const minShare = Math.min(...rawShares, 6);

  return CANONICAL_SECTORS.map((sec, idx) => {
    // Mirror horizontally around vertical pitch axis (0/180 deg) for Left-Handed Batters
    const effectiveAngle = isLeftHand
      ? (360 - sec.rhbAngleDeg) % 360
      : sec.rhbAngleDeg;
    const share = Number(rawShares[idx].toFixed(1));
    const heatLevel = Math.min(
      1,
      Math.max(0.12, (share - minShare) / Math.max(4, maxShare - minShare))
    );

    return {
      id: sec.id,
      name: sec.name,
      rhbAngleDeg: effectiveAngle,
      runsSharePct: share,
      strikeRate: weights[sec.id].sr,
      boundaryPct: weights[sec.id].bnd,
      heatLevel,
    };
  });
}

function polarToSvg(cx: number, cy: number, radius: number, angleDeg: number) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return {
    x: Number((cx + radius * Math.cos(rad)).toFixed(1)),
    y: Number((cy + radius * Math.sin(rad)).toFixed(1)),
  };
}

function describeSectorWedge(
  cx: number,
  cy: number,
  innerR: number,
  outerR: number,
  centerAngleDeg: number,
  halfSpanDeg: number
): string {
  const startAngle = centerAngleDeg - halfSpanDeg;
  const endAngle = centerAngleDeg + halfSpanDeg;
  const p1 = polarToSvg(cx, cy, outerR, startAngle);
  const p2 = polarToSvg(cx, cy, outerR, endAngle);
  const p3 = polarToSvg(cx, cy, innerR, endAngle);
  const p4 = polarToSvg(cx, cy, innerR, startAngle);
  return `M ${p4.x} ${p4.y} L ${p1.x} ${p1.y} A ${outerR} ${outerR} 0 0 1 ${p2.x} ${p2.y} L ${p3.x} ${p3.y} A ${innerR} ${innerR} 0 0 0 ${p4.x} ${p4.y} Z`;
}

export const FieldingHeatmap: React.FC<FieldingHeatmapProps> = ({
  initialBatter,
  venueName = 'Active Pitch Canvas',
}) => {
  // Gather batters & all-rounders with strong batting records across all 12 teams
  const allBatters = useMemo(() => {
    return TEAMS.flatMap((team) =>
      team.squad
        .filter((p) => p.stats.runs >= 180 || p.role.includes('Batter') || p.role === 'All-Rounder')
        .map((p) => ({ player: p, team }))
    );
  }, []);

  const [selectedTeamId, setSelectedTeamId] = useState<string>(() => {
    if (initialBatter) {
      const found = TEAMS.find((t) => t.squad.some((p) => p.id === initialBatter.id));
      if (found) return found.id;
    }
    return 'ind';
  });

  const teamBatters = useMemo(() => {
    const filtered = allBatters.filter((entry) => entry.team.id === selectedTeamId);
    return filtered.length > 0 ? filtered : allBatters.slice(0, 8);
  }, [allBatters, selectedTeamId]);

  const [selectedBatterId, setSelectedBatterId] = useState<string>(
    () => initialBatter?.id || teamBatters[0]?.player.id || 'sky'
  );
  const [phase, setPhase] = useState<MatchPhase>('middle');
  const [showHeatSectors, setShowHeatSectors] = useState<boolean>(true);
  const [showVectors, setShowVectors] = useState<boolean>(true);
  const [selectedPinId, setSelectedPinId] = useState<string | null>(null);

  const activeBatterEntry = useMemo(() => {
    return (
      allBatters.find((b) => b.player.id === selectedBatterId) ||
      teamBatters[0] ||
      allBatters[0]
    );
  }, [allBatters, teamBatters, selectedBatterId]);

  const batter = activeBatterEntry.player;

  const sectorProfiles = useMemo(() => computeBatterSectorDistribution(batter), [batter]);

  // Dynamically compute all 11 fielder positions on the 520x520 pitch & ground canvas
  const fielders = useMemo<DynamicFielderPin[]>(() => {
    const cx = 260;
    const cy = 260;
    const maxBoundaryRiders = phase === 'powerplay' ? 2 : phase === 'middle' ? 4 : 5;

    // Rank sectors by combined scoring + boundary danger
    const ranked = [...sectorProfiles].sort(
      (a, b) =>
        b.runsSharePct * 0.65 +
        b.boundaryPct * 0.55 -
        (a.runsSharePct * 0.65 + a.boundaryPct * 0.55)
    );

    const pins: DynamicFielderPin[] = [
      {
        id: 'wk',
        code: 'WK',
        roleLabel: 'Wicketkeeper',
        sectorName: 'Behind Stumps',
        isBoundaryRider: false,
        x: cx,
        y: cy + 56,
        saveProbPct: 94,
        sectorSharePct: 4.5,
      },
      {
        id: 'bowl',
        code: 'BWL',
        roleLabel: 'Bowler Follow-Through',
        sectorName: 'Pitch Corridor',
        isBoundaryRider: false,
        x: cx,
        y: cy - 54,
        saveProbPct: 68,
        sectorSharePct: 5.0,
      },
    ];

    // Place Deep Boundary Riders in the top N hottest boundary sectors
    const riderSectors = ranked.slice(0, maxBoundaryRiders);
    riderSectors.forEach((sec, idx) => {
      const radius = 206 - (idx % 2) * 8;
      const pos = polarToSvg(cx, cy, radius, sec.rhbAngleDeg);
      pins.push({
        id: `deep-${sec.id}`,
        code: `D${idx + 1}`,
        roleLabel: `Deep ${sec.name.split('/')[0].trim()} Sweeper`,
        sectorName: sec.name,
        isBoundaryRider: true,
        x: pos.x,
        y: pos.y,
        saveProbPct: Math.min(92, Math.round(68 + sec.heatLevel * 22)),
        sectorSharePct: sec.runsSharePct,
      });
    });

    // Place remaining (9 - maxBoundaryRiders) ring fielders to plug top single/gap zones & double-teamed hot zones
    const remainingCount = 9 - maxBoundaryRiders;
    const nonRiderSectors = ranked.slice(maxBoundaryRiders);
    const ringCandidates: Array<{ sec: SectorProfile; angleOffset: number; radius: number }> = [];

    nonRiderSectors.forEach((sec, idx) => {
      ringCandidates.push({
        sec,
        angleOffset: 0,
        radius: 108 + (idx % 2) * 12,
      });
    });

    // Double-plug the hottest 1-3 sectors inside the 30-yard circle as well!
    ranked.slice(0, 4).forEach((sec, idx) => {
      ringCandidates.push({
        sec,
        angleOffset: idx % 2 === 0 ? 14 : -14,
        radius: phase === 'powerplay' ? 96 : 114,
      });
    });

    ringCandidates.slice(0, remainingCount).forEach((cand, idx) => {
      const pos = polarToSvg(
        cx,
        cy,
        cand.radius,
        (cand.sec.rhbAngleDeg + cand.angleOffset + 360) % 360
      );
      pins.push({
        id: `ring-${cand.sec.id}-${idx}`,
        code: `R${idx + 1}`,
        roleLabel: `30yd ${cand.sec.name.split('/')[0].trim()} Blocker`,
        sectorName: cand.sec.name,
        isBoundaryRider: false,
        x: pos.x,
        y: pos.y,
        saveProbPct: Math.min(89, Math.round(62 + cand.sec.heatLevel * 24)),
        sectorSharePct: cand.sec.runsSharePct,
      });
    });

    return pins;
  }, [sectorProfiles, phase]);

  const activePin = useMemo(
    () => fielders.find((f) => f.id === selectedPinId) || fielders[2],
    [fielders, selectedPinId]
  );

  const topTwoZones = useMemo(
    () => [...sectorProfiles].sort((a, b) => b.runsSharePct - a.runsSharePct).slice(0, 2),
    [sectorProfiles]
  );

  return (
    <section className="rounded-2xl border border-emerald-500/30 bg-slate-950/90 p-5 sm:p-6 space-y-5 animate-in fade-in duration-200">
      {/* Header & Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-800/80 pb-4">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2 text-xs font-mono text-slate-400">
            <span className="text-emerald-400 font-semibold">Fielding Heatmap Overlay</span>
            <span aria-hidden="true">·</span>
            <span>{venueName}</span>
            <span aria-hidden="true">·</span>
            <span>Dynamic 11-Fielder Solver</span>
          </div>
          <h3 className="text-lg sm:text-xl font-bold text-white tracking-tight">
            Batter Scoring Heatmap &amp; Adaptive Fielder Placement Canvas
          </h3>
        </div>

        {/* Phase Restriction Segmented Control */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-lg border border-slate-800 text-xs font-mono">
            {(
              [
                { id: 'powerplay', label: 'Powerplay (2 Deep)' },
                { id: 'middle', label: 'Middle (4 Deep)' },
                { id: 'death', label: 'Death (5 Deep)' },
              ] as const
            ).map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setPhase(p.id)}
                className={`px-3 py-1.5 rounded-md transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                  phase === p.id
                    ? 'bg-emerald-500 text-slate-950 font-bold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Batter Selector Bar */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center bg-slate-900/50 p-3.5 rounded-xl border border-slate-800/80">
        <div className="md:col-span-4 flex items-center gap-2.5">
          <TeamFlag code={activeBatterEntry.team.id} size="sm" />
          <select
            value={selectedTeamId}
            onChange={(e) => {
              const nextTeamId = e.target.value;
              setSelectedTeamId(nextTeamId);
              const nextTeamPlayers = allBatters.filter((b) => b.team.id === nextTeamId);
              if (nextTeamPlayers[0]) {
                setSelectedBatterId(nextTeamPlayers[0].player.id);
              }
            }}
            aria-label="Select team for batter heatmap"
            className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white font-medium cursor-pointer"
          >
            {TEAMS.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name} ({t.shortName})
              </option>
            ))}
          </select>
        </div>

        <div className="md:col-span-4">
          <select
            value={batter.id}
            onChange={(e) => setSelectedBatterId(e.target.value)}
            aria-label="Select batter for scoring heatmap"
            className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white font-medium cursor-pointer"
          >
            {teamBatters.map(({ player }) => (
              <option key={player.id} value={player.id}>
                {player.name} · {player.battingHand} (SR {player.stats.strikeRate})
              </option>
            ))}
          </select>
        </div>

        <div className="md:col-span-4 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={() => setShowHeatSectors((v) => !v)}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono border transition-colors cursor-pointer whitespace-nowrap ${
              showHeatSectors
                ? 'border-amber-400/50 bg-amber-500/15 text-amber-200'
                : 'border-slate-800 bg-slate-950 text-slate-400 hover:text-white'
            }`}
          >
            <Eye className="h-3.5 w-3.5 inline mr-1.5" />
            Heat Zones
          </button>
          <button
            type="button"
            onClick={() => setShowVectors((v) => !v)}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono border transition-colors cursor-pointer whitespace-nowrap ${
              showVectors
                ? 'border-cyan-400/50 bg-cyan-500/15 text-cyan-200'
                : 'border-slate-800 bg-slate-950 text-slate-400 hover:text-white'
            }`}
          >
            <Crosshair className="h-3.5 w-3.5 inline mr-1.5" />
            Shot Vectors
          </button>
        </div>
      </div>

      {/* Main Split: Ground Pitch Heatmap Canvas + Sector Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Left 7 Cols: Interactive SVG Pitch & Outfield Canvas */}
        <div className="lg:col-span-7 rounded-xl border border-slate-800 bg-[#051811] p-4 flex flex-col items-center justify-center relative">
          <div className="w-full flex items-center justify-between text-[11px] font-mono text-slate-400 mb-2">
            <span>
              {batter.battingHand === 'Left-hand'
                ? 'LEFT-HAND BATTER (LEG ← | → OFF)'
                : 'RIGHT-HAND BATTER (OFF ← | → LEG)'}
            </span>
            <span className="text-emerald-400 tabular-nums">
              11 Fielders Active · Click Pin to Inspect
            </span>
          </div>

          <svg
            viewBox="0 0 520 520"
            className="w-full max-w-[490px] h-auto select-none"
            role="img"
            aria-label={`Fielding heatmap overlay for ${batter.name}`}
          >
            <defs>
              <radialGradient id="stadiumGrassRad" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#0f3d29" />
                <stop offset="65%" stopColor="#09291c" />
                <stop offset="100%" stopColor="#04150e" />
              </radialGradient>
            </defs>

            {/* Outfield Turf */}
            <circle
              cx="260"
              cy="260"
              r="242"
              fill="url(#stadiumGrassRad)"
              stroke="#1e293b"
              strokeWidth="2"
            />

            {/* Boundary Rope */}
            <circle
              cx="260"
              cy="260"
              r="224"
              fill="none"
              stroke="#e2e8f0"
              strokeOpacity="0.65"
              strokeWidth="2"
              strokeDasharray="6 4"
            />

            {/* 8 Scoring Heatmap Wedges */}
            {showHeatSectors &&
              sectorProfiles.map((sec) => {
                const wedgePath = describeSectorWedge(
                  260,
                  260,
                  36,
                  222,
                  sec.rhbAngleDeg,
                  21.5
                );
                const fillHex =
                  sec.heatLevel >= 0.72
                    ? '#f43f5e'
                    : sec.heatLevel >= 0.45
                    ? '#f59e0b'
                    : '#06b6d4';
                const labelPos = polarToSvg(260, 260, 166, sec.rhbAngleDeg);
                return (
                  <g key={sec.id}>
                    <path
                      d={wedgePath}
                      fill={fillHex}
                      fillOpacity={0.08 + sec.heatLevel * 0.28}
                      stroke={fillHex}
                      strokeOpacity={0.28}
                      strokeWidth="1"
                    />
                    <text
                      x={labelPos.x}
                      y={labelPos.y}
                      textAnchor="middle"
                      fill="#f8fafc"
                      fillOpacity="0.82"
                      fontSize="9.5"
                      fontFamily="monospace"
                      fontWeight="700"
                    >
                      {sec.runsSharePct}%
                    </text>
                  </g>
                );
              })}

            {/* 30-Yard Fielding Restriction Circle */}
            <circle
              cx="260"
              cy="260"
              r="122"
              fill="none"
              stroke="#ffffff"
              strokeOpacity="0.55"
              strokeWidth="1.5"
              strokeDasharray="4 4"
            />

            {/* Batter Wagon-Wheel Scoring Vectors from Striker Crease (260, 294) */}
            {showVectors &&
              sectorProfiles.map((sec) => {
                const vectorLen = 85 + sec.heatLevel * 128;
                const endPos = polarToSvg(260, 260, vectorLen, sec.rhbAngleDeg);
                return (
                  <line
                    key={`vec-${sec.id}`}
                    x1="260"
                    y1="292"
                    x2={endPos.x}
                    y2={endPos.y}
                    stroke={sec.heatLevel >= 0.68 ? '#fda4af' : '#fde68a'}
                    strokeOpacity={0.35 + sec.heatLevel * 0.45}
                    strokeWidth={1.2 + sec.heatLevel * 2.2}
                    strokeLinecap="round"
                  />
                );
              })}

            {/* Central 22-Yard Pitch Canvas */}
            <rect
              x="246"
              y="218"
              width="28"
              height="84"
              rx="3"
              fill="#b08d63"
              stroke="#e2e8f0"
              strokeOpacity="0.7"
              strokeWidth="1.2"
            />
            <line x1="246" y1="230" x2="274" y2="230" stroke="#ffffff" strokeWidth="1.2" />
            <line x1="246" y1="290" x2="274" y2="290" stroke="#ffffff" strokeWidth="1.2" />
            {/* Striker Marker */}
            <circle cx="260" cy="290" r="4" fill="#fde047" stroke="#0f172a" strokeWidth="1" />

            {/* 11 Dynamic Fielder Nodes */}
            {fielders.map((pin) => {
              const isSelected = activePin?.id === pin.id;
              const nodeColor =
                pin.code === 'WK' || pin.code === 'BWL'
                  ? '#38bdf8'
                  : pin.isBoundaryRider
                  ? '#10b981'
                  : '#f59e0b';
              return (
                <g
                  key={pin.id}
                  onClick={() => setSelectedPinId(pin.id)}
                  className="cursor-pointer transition-all duration-300"
                >
                  {isSelected && (
                    <circle
                      cx={pin.x}
                      cy={pin.y}
                      r="22"
                      fill={nodeColor}
                      fillOpacity="0.2"
                      stroke={nodeColor}
                      strokeWidth="1.4"
                      strokeDasharray="3 2"
                    />
                  )}
                  <circle
                    cx={pin.x}
                    cy={pin.y}
                    r={isSelected ? 11.5 : 9.5}
                    fill="#020617"
                    stroke={nodeColor}
                    strokeWidth={isSelected ? 2.6 : 2}
                  />
                  <text
                    x={pin.x}
                    y={pin.y + 3}
                    textAnchor="middle"
                    fill="#ffffff"
                    fontSize="7.5"
                    fontFamily="monospace"
                    fontWeight="800"
                  >
                    {pin.code}
                  </text>
                </g>
              );
            })}
          </svg>

          {/* Legend */}
          <div className="w-full flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-800/70 text-[11px] font-mono text-slate-400">
            <span>D1–D5: Boundary Sweepers</span>
            <span>R1–R7: 30-Yard Ring Blockers</span>
            <span>Red Wedge: Primary Scoring Zone</span>
          </div>
        </div>

        {/* Right 5 Cols: Batter Scoring Profile & Active Fielder Telemetry */}
        <div className="lg:col-span-5 flex flex-col justify-between gap-4">
          {/* Batter Card Header */}
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 space-y-3">
            <div className="flex items-center gap-3">
              <PlayerCardAvatar
                playerId={batter.id}
                name={batter.name}
                countryCode={batter.countryCode || activeBatterEntry.team.id}
                jerseyNumber={batter.jerseyNumber || 18}
                imageUrl={batter.imageUrl}
                size="md"
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-bold text-white truncate">{batter.name}</h4>
                  <TeamFlag code={activeBatterEntry.team.id} size="xs" />
                </div>
                <p className="text-xs text-slate-400 font-mono">
                  {batter.battingHand} · SR {batter.stats.strikeRate} · Boundary{' '}
                  {batter.stats.boundaryPercent}%
                </p>
              </div>
            </div>

            <div className="text-xs text-slate-300 leading-relaxed border-t border-slate-800/80 pt-2.5">
              <strong className="text-emerald-300 font-mono">Primary Hot Zones:</strong>{' '}
              {topTwoZones.map((z) => `${z.name} (${z.runsSharePct}%)`).join(' & ')}. Fielders
              automatically shift to plug high-boundary arcs under {phase} circle rules.
            </div>
          </div>

          {/* 8-Sector Scoring Table */}
          <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-4 space-y-2.5 flex-1">
            <div className="flex items-center justify-between text-xs font-mono text-slate-400 pb-1 border-b border-slate-800">
              <span className="flex items-center gap-1.5 font-semibold text-slate-200">
                <Target className="h-3.5 w-3.5 text-rose-400" />
                <span>360° Wagon-Wheel Scoring Share</span>
              </span>
              <span>RUNS % · SR</span>
            </div>

            <div className="space-y-2">
              {[...sectorProfiles]
                .sort((a, b) => b.runsSharePct - a.runsSharePct)
                .map((sec) => (
                  <div key={sec.id} className="space-y-1">
                    <div className="flex items-center justify-between text-xs font-mono tabular-nums">
                      <span className="text-slate-300 truncate">{sec.name}</span>
                      <span className="text-slate-200 font-semibold">
                        {sec.runsSharePct}% ·{' '}
                        <span className="text-slate-400">SR {sec.strikeRate}</span>
                      </span>
                    </div>
                    <div className="h-1.5 w-full rounded-full bg-slate-800 overflow-hidden">
                      <div
                        className={`h-full rounded-full ${
                          sec.heatLevel >= 0.72
                            ? 'bg-rose-500'
                            : sec.heatLevel >= 0.45
                            ? 'bg-amber-400'
                            : 'bg-cyan-400'
                        }`}
                        style={{ width: `${Math.min(100, sec.runsSharePct * 3.8)}%` }}
                      />
                    </div>
                  </div>
                ))}
            </div>
          </div>

          {/* Selected Fielder Pin Readout */}
          {activePin && (
            <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-3.5 flex items-center justify-between gap-3 text-xs font-mono">
              <div className="space-y-0.5 min-w-0">
                <div className="flex items-center gap-1.5 text-emerald-300 font-bold">
                  <Users className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">
                    [{activePin.code}] {activePin.roleLabel}
                  </span>
                </div>
                <div className="text-slate-400 text-[11px] truncate">
                  Guarding {activePin.sectorName} ({activePin.sectorSharePct}% batter runs)
                </div>
              </div>
              <div className="text-right shrink-0 tabular-nums">
                <span className="text-[10px] text-slate-400 block">Cutoff Rate</span>
                <strong className="text-white text-sm flex items-center gap-1 justify-end">
                  <Shield className="h-3.5 w-3.5 text-cyan-400" />
                  {activePin.saveProbPct}%
                </strong>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
};
