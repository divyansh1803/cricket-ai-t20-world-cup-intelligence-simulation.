import React, { useState, useMemo } from 'react';
import {
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Tooltip,
} from 'recharts';
import { Award, TrendingUp, TrendingDown } from 'lucide-react';
import { TEAMS } from '../../data/cricketData';
import { Player } from '../../types/cricket';
import { getTeamFlagUrl, PlayerCardAvatar } from '../common/CricketIdentity';
import { cricketAudio } from '../../utils/audioSystem';
import { triggerHaptic, HAPTIC_PATTERNS } from '../../utils/haptics';

interface MvpAxisMetric {
  axis: string;
  score: number;
  last5: number[]; // M-5 to M-1
}

interface MvpContributorProfile {
  playerId: string;
  fallbackName: string;
  countryCode: string;
  roleTag: string;
  matchSummaryLine: string;
  mvpScore: number;
  metrics: MvpAxisMetric[];
}

const MVP_CONTRIBUTORS: MvpContributorProfile[] = [
  {
    playerId: 'sky',
    fallbackName: 'Suryakumar Yadav',
    countryCode: 'IND',
    roleTag: '360° Strike Batter',
    matchSummaryLine: '68 (34b) · 6×4, 4×6 · 2 catches in deep',
    mvpScore: 96,
    metrics: [
      { axis: 'Striking', score: 97, last5: [84, 88, 91, 94, 97] },
      { axis: 'Bowling', score: 28, last5: [25, 25, 26, 28, 28] },
      { axis: 'Fielding', score: 92, last5: [85, 86, 89, 95, 92] },
      { axis: 'Clutch', score: 94, last5: [82, 86, 90, 91, 94] },
      { axis: 'Tempo', score: 96, last5: [88, 90, 89, 94, 96] },
      { axis: 'Game Impact', score: 96, last5: [85, 89, 92, 93, 96] },
    ],
  },
  {
    playerId: 'bumrah',
    fallbackName: 'Jasprit Bumrah',
    countryCode: 'IND',
    roleTag: 'Express Strike Spearhead',
    matchSummaryLine: '4.0-0-18-3 · 16 dot balls · Death Econ 4.50',
    mvpScore: 98,
    metrics: [
      { axis: 'Striking', score: 34, last5: [30, 32, 31, 35, 34] },
      { axis: 'Bowling', score: 99, last5: [93, 95, 96, 98, 99] },
      { axis: 'Fielding', score: 82, last5: [78, 80, 81, 80, 82] },
      { axis: 'Clutch', score: 99, last5: [94, 95, 97, 98, 99] },
      { axis: 'Tempo', score: 95, last5: [90, 91, 93, 94, 95] },
      { axis: 'Game Impact', score: 98, last5: [92, 94, 96, 97, 98] },
    ],
  },
  {
    playerId: 'hardik',
    fallbackName: 'Hardik Pandya',
    countryCode: 'IND',
    roleTag: 'Pace All-Rounder',
    matchSummaryLine: '38* (19b) & 3/20 (3.0 ov) · Final over defense',
    mvpScore: 95,
    metrics: [
      { axis: 'Striking', score: 90, last5: [79, 83, 86, 88, 90] },
      { axis: 'Bowling', score: 89, last5: [80, 82, 85, 87, 89] },
      { axis: 'Fielding', score: 91, last5: [88, 89, 90, 90, 91] },
      { axis: 'Clutch', score: 96, last5: [85, 88, 92, 94, 96] },
      { axis: 'Tempo', score: 91, last5: [84, 85, 88, 89, 91] },
      { axis: 'Game Impact', score: 95, last5: [83, 87, 90, 93, 95] },
    ],
  },
  {
    playerId: 'head',
    fallbackName: 'Travis Head',
    countryCode: 'AUS',
    roleTag: 'Powerplay Enforcer',
    matchSummaryLine: '76 (43b) · 9×4, 4×6 · SR 176.7',
    mvpScore: 94,
    metrics: [
      { axis: 'Striking', score: 96, last5: [91, 88, 94, 92, 96] },
      { axis: 'Bowling', score: 54, last5: [48, 52, 50, 55, 54] },
      { axis: 'Fielding', score: 86, last5: [82, 84, 85, 84, 86] },
      { axis: 'Clutch', score: 93, last5: [89, 87, 91, 90, 93] },
      { axis: 'Tempo', score: 95, last5: [92, 89, 93, 94, 95] },
      { axis: 'Game Impact', score: 94, last5: [88, 86, 91, 92, 94] },
    ],
  },
  {
    playerId: 'rashid',
    fallbackName: 'Rashid Khan',
    countryCode: 'AFG',
    roleTag: 'Wrist-Spin All-Rounder',
    matchSummaryLine: '4.0-0-14-4 & 19* (10b) · 15 dot balls',
    mvpScore: 95,
    metrics: [
      { axis: 'Striking', score: 78, last5: [72, 75, 74, 80, 78] },
      { axis: 'Bowling', score: 97, last5: [91, 93, 94, 96, 97] },
      { axis: 'Fielding', score: 90, last5: [86, 88, 89, 89, 90] },
      { axis: 'Clutch', score: 94, last5: [88, 90, 91, 93, 94] },
      { axis: 'Tempo', score: 92, last5: [87, 89, 90, 91, 92] },
      { axis: 'Game Impact', score: 95, last5: [89, 91, 92, 94, 95] },
    ],
  },
];

const Sparkline5Match: React.FC<{ values: number[]; positive: boolean }> = ({ values, positive }) => {
  const minVal = Math.min(...values) - 4;
  const maxVal = Math.max(...values) + 4;
  const span = Math.max(1, maxVal - minVal);
  const width = 68;
  const height = 22;

  const points = values
    .map((v, idx) => {
      const x = (idx / Math.max(1, values.length - 1)) * (width - 8) + 4;
      const y = height - 4 - ((v - minVal) / span) * (height - 8);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');

  const lastY =
    height - 4 - ((values[values.length - 1] - minVal) / span) * (height - 8);

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="shrink-0">
      <polyline
        fill="none"
        stroke={positive ? '#34d399' : '#fb7185'}
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={points}
      />
      <circle
        cx={width - 4}
        cy={lastY}
        r="2.5"
        fill={positive ? '#34d399' : '#fb7185'}
      />
    </svg>
  );
};

export interface MatchMvpRadarCardProps {
  onInspectPlayer?: (player: Player) => void;
}

export const MatchMvpRadarCard: React.FC<MatchMvpRadarCardProps> = ({ onInspectPlayer }) => {
  const [selectedId, setSelectedId] = useState<string>('bumrah');
  const [hoveredAxis, setHoveredAxis] = useState<string | null>(null);

  const activeContributor = useMemo(
    () => MVP_CONTRIBUTORS.find((c) => c.playerId === selectedId) || MVP_CONTRIBUTORS[0],
    [selectedId]
  );

  const allPlayers = useMemo<Player[]>(
    () => TEAMS.flatMap((t) => t.squad),
    []
  );

  const matchedPlayer = useMemo<Player>(
    () =>
      allPlayers.find(
        (p) =>
          p.id === activeContributor.playerId ||
          p.name.toLowerCase() === activeContributor.fallbackName.toLowerCase()
      ) || allPlayers[0],
    [activeContributor, allPlayers]
  );

  return (
    <section className="rounded-3xl border border-slate-800 bg-slate-900/65 p-5 sm:p-6 space-y-5">
      {/* Header + Contributor Tabs */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-800/80 pb-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-cyan-400">
            <Award className="h-4 w-4" />
            <span>Match MVP Performance Radar</span>
            <span aria-hidden="true">·</span>
            <span className="text-slate-400">5-Match Historical Form Sparklines</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight mt-0.5">
            Key Match Contributors & Multi-Axis Impact
          </h2>
        </div>

        <div className="flex flex-wrap items-center gap-1.5 rounded-xl bg-slate-950/90 p-1.5 border border-slate-800">
          {MVP_CONTRIBUTORS.map((item) => {
            const isSelected = item.playerId === activeContributor.playerId;
            return (
              <button
                key={item.playerId}
                type="button"
                onClick={() => {
                  setSelectedId(item.playerId);
                  cricketAudio.playUiClick();
                  triggerHaptic(HAPTIC_PATTERNS.TAP);
                }}
                className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-cyan-500 text-slate-950 font-bold shadow-sm'
                    : 'text-slate-300 hover:text-white hover:bg-slate-900'
                }`}
              >
                <img
                  src={getTeamFlagUrl(item.countryCode)}
                  alt={item.countryCode}
                  className="h-3.5 w-5 rounded-[2px] object-cover border border-white/15 shrink-0"
                />
                <span>{item.fallbackName.split(' ').pop()}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main 12-Col Grid: Radar Visualizer + 5-Match Sparkline Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
        {/* Left (6 cols): Player Header + Recharts Multi-Axis Radar */}
        <div className="lg:col-span-6 min-w-0 rounded-2xl border border-slate-800 bg-slate-950/80 p-4 sm:p-5 space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div
                onClick={() => onInspectPlayer && onInspectPlayer(matchedPlayer)}
                className="cursor-pointer shrink-0 hover:scale-105 transition-transform"
                title="Inspect full player dossier"
              >
                <PlayerCardAvatar
                  playerId={matchedPlayer.id}
                  name={activeContributor.fallbackName}
                  countryCode={activeContributor.countryCode}
                  jerseyNumber={matchedPlayer.jerseyNumber || 93}
                  size="md"
                />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-white truncate">
                    {activeContributor.fallbackName}
                  </h3>
                  <img
                    src={getTeamFlagUrl(activeContributor.countryCode)}
                    alt={activeContributor.countryCode}
                    className="h-3.5 w-5 rounded-[2px] object-cover border border-white/15 shrink-0"
                  />
                </div>
                <p className="text-xs text-slate-400 truncate">
                  {activeContributor.roleTag} · {activeContributor.matchSummaryLine}
                </p>
              </div>
            </div>

            <div className="text-right shrink-0 font-mono">
              <span className="text-[10px] text-slate-400 block">MVP INDEX</span>
              <strong className="text-2xl font-black text-cyan-400 tabular-nums">
                {activeContributor.mvpScore}
              </strong>
            </div>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart cx="50%" cy="50%" outerRadius="74%" data={activeContributor.metrics}>
                <PolarGrid stroke="#1e293b" />
                <PolarAngleAxis
                  dataKey="axis"
                  tick={{ fill: '#cbd5e1', fontSize: 11, fontWeight: 600 }}
                />
                <PolarRadiusAxis
                  angle={30}
                  domain={[0, 100]}
                  tick={{ fill: '#64748b', fontSize: 10 }}
                />
                <Radar
                  name={activeContributor.fallbackName}
                  dataKey="score"
                  stroke="#06b6d4"
                  strokeWidth={2.5}
                  fill="#06b6d4"
                  fillOpacity={0.28}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#020617',
                    borderColor: '#1e293b',
                    borderRadius: '12px',
                    fontSize: '12px',
                  }}
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Right (6 cols): Axis-by-Axis 5-Match Historical Form Sparklines */}
        <div className="lg:col-span-6 min-w-0 space-y-2.5">
          <div className="flex items-center justify-between text-xs font-mono text-slate-400 px-1">
            <span>Axis Metric & Current Rating</span>
            <span>5-Match Form Trend (M-5 → M-1)</span>
          </div>

          <div className="space-y-2">
            {activeContributor.metrics.map((m) => {
              const firstVal = m.last5[0];
              const lastVal = m.last5[m.last5.length - 1];
              const delta = lastVal - firstVal;
              const isPositive = delta >= 0;
              const isHighlighted = hoveredAxis === m.axis;

              return (
                <div
                  key={m.axis}
                  onMouseEnter={() => setHoveredAxis(m.axis)}
                  onMouseLeave={() => setHoveredAxis(null)}
                  className={`rounded-xl border px-3.5 py-2.5 flex items-center justify-between gap-3 transition-colors ${
                    isHighlighted
                      ? 'border-cyan-400/60 bg-slate-900'
                      : 'border-slate-800/90 bg-slate-950/75'
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="font-semibold text-slate-200">{m.axis}</span>
                      <strong className="font-mono text-white tabular-nums">{m.score}/100</strong>
                    </div>
                    <div className="h-1.5 w-full rounded-full bg-slate-800 overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-cyan-500 to-sky-400 transition-all duration-500"
                        style={{ width: `${m.score}%` }}
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0 pl-2 border-l border-slate-800">
                    <Sparkline5Match values={m.last5} positive={isPositive} />
                    <span
                      className={`inline-flex items-center gap-0.5 text-xs font-mono font-bold w-14 justify-end tabular-nums ${
                        isPositive ? 'text-emerald-400' : 'text-rose-400'
                      }`}
                    >
                      {isPositive ? (
                        <TrendingUp className="h-3 w-3 shrink-0" />
                      ) : (
                        <TrendingDown className="h-3 w-3 shrink-0" />
                      )}
                      <span>
                        {delta > 0 ? `+${delta}` : delta}%
                      </span>
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
};
