import React, { useState } from 'react';
import {
  BarChart3,
  TrendingUp,
  Activity,
  Zap,
  Target,
  Flame,
  Layers,
  Sparkles,
  Shield,
  Compass,
  Sliders,
  ChevronRight,
  HelpCircle,
  Clock,
} from 'lucide-react';
import {
  ResponsiveContainer,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  ZAxis,
  Tooltip,
  Cell,
  LineChart,
  Line,
  CartesianGrid,
  Legend,
  BarChart,
  Bar,
  AreaChart,
  Area,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
} from 'recharts';
import { CountryFlag } from '../common/CricketIdentity';
import { cricketAudio } from '../../utils/audioSystem';
import { triggerHaptic, HAPTIC_PATTERNS } from '../../utils/haptics';

// 1. DATA: Strike Rate vs Pace & Spin Scatter
const SCATTER_BATTERS_DATA = [
  { name: 'Rohit Sharma', country: 'IND', srPace: 168.4, srSpin: 142.0, avg: 32.5, role: 'Opener' },
  { name: 'Virat Kohli', country: 'IND', srPace: 136.2, srSpin: 131.8, avg: 48.7, role: 'Anchor' },
  { name: 'Suryakumar Yadav', country: 'IND', srPace: 182.5, srSpin: 164.0, avg: 42.1, role: '360° Finisher' },
  { name: 'Travis Head', country: 'AUS', srPace: 174.2, srSpin: 148.5, avg: 36.4, role: 'Powerplay Enforcer' },
  { name: 'Jos Buttler', country: 'ENG', srPace: 158.0, srSpin: 149.2, avg: 35.8, role: 'Wicketkeeper Opener' },
  { name: 'Heinrich Klaasen', country: 'SA', srPace: 162.0, srSpin: 194.5, avg: 38.2, role: 'Spin Destroyer' },
  { name: 'Glenn Maxwell', country: 'AUS', srPace: 156.4, srSpin: 172.0, avg: 30.6, role: 'All-Rounder' },
  { name: 'Nicholas Pooran', country: 'WI', srPace: 154.2, srSpin: 168.0, avg: 33.1, role: 'Power Striker' },
  { name: 'Babar Azam', country: 'PAK', srPace: 129.5, srSpin: 126.0, avg: 41.2, role: 'Accumulator' },
  { name: 'Hardik Pandya', country: 'IND', srPace: 162.8, srSpin: 138.4, avg: 31.8, role: 'Clutch Finisher' },
];

// 2. DATA: Death Overs Economy Heatmap (Overs 16 to 20)
const DEATH_BOWLERS_HEATMAP = [
  { bowler: 'Jasprit Bumrah', country: 'IND', ov16: 6.2, ov17: 6.8, ov18: 5.9, ov19: 5.4, ov20: 7.1, overallEcon: 6.28 },
  { bowler: 'Arshdeep Singh', country: 'IND', ov16: 7.8, ov17: 8.2, ov18: 7.4, ov19: 6.1, ov20: 8.4, overallEcon: 7.58 },
  { bowler: 'Anrich Nortje', country: 'SA', ov16: 8.1, ov17: 7.6, ov18: 8.4, ov19: 7.9, ov20: 9.2, overallEcon: 8.24 },
  { bowler: 'Pat Cummins', country: 'AUS', ov16: 7.9, ov17: 8.5, ov18: 8.2, ov19: 8.8, ov20: 9.6, overallEcon: 8.60 },
  { bowler: 'Jofra Archer', country: 'ENG', ov16: 7.2, ov17: 8.0, ov18: 7.5, ov19: 8.2, ov20: 8.9, overallEcon: 7.96 },
  { bowler: 'Shaheen Afridi', country: 'PAK', ov16: 8.4, ov17: 7.8, ov18: 8.6, ov19: 8.1, ov20: 9.8, overallEcon: 8.54 },
];

// 3. DATA: Long-term Rolling Win Rate (%)
const WIN_RATE_TRENDS = [
  { match: 'M1', IND: 70, AUS: 65, ENG: 58, SA: 55, PAK: 50 },
  { match: 'M2', IND: 74, AUS: 62, ENG: 60, SA: 58, PAK: 48 },
  { match: 'M3', IND: 78, AUS: 68, ENG: 56, SA: 62, PAK: 52 },
  { match: 'M4', IND: 82, AUS: 71, ENG: 54, SA: 68, PAK: 46 },
  { match: 'M5', IND: 86, AUS: 75, ENG: 59, SA: 72, PAK: 49 },
  { match: 'M6', IND: 89, AUS: 78, ENG: 62, SA: 76, PAK: 53 },
  { match: 'M7', IND: 92, AUS: 74, ENG: 65, SA: 80, PAK: 50 },
  { match: 'M8 (Final)', IND: 96, AUS: 70, ENG: 61, SA: 78, PAK: 45 },
];

// 4. DATA: Career Trajectory (5-Year Strike Rate & Average Evolution)
const CAREER_TRAJECTORY_DATA = [
  { year: '2020', rohitSR: 138, rohitAvg: 31, kohliSR: 133, kohliAvg: 50, bumrahEcon: 6.6 },
  { year: '2021', rohitSR: 144, rohitAvg: 33, kohliSR: 137, kohliAvg: 52, bumrahEcon: 6.4 },
  { year: '2022', rohitSR: 148, rohitAvg: 29, kohliSR: 138, kohliAvg: 53, bumrahEcon: 6.5 },
  { year: '2023', rohitSR: 156, rohitAvg: 34, kohliSR: 135, kohliAvg: 49, bumrahEcon: 6.1 },
  { year: '2024 (WC)', rohitSR: 165, rohitAvg: 36, kohliSR: 140, kohliAvg: 48, bumrahEcon: 4.2 },
];

export const AdvancedAnalyticsHub: React.FC = () => {
  const [activeVizId, setActiveVizId] = useState<number>(1);

  const visualizations = [
    { id: 1, title: 'Strike Rate vs Pace / Spin Scatter' },
    { id: 2, title: 'Death Overs Economy Heatmap' },
    { id: 3, title: 'Batter Scoring Zone Efficiency Grid' },
    { id: 4, title: 'Long-term Team Win Probability Trend' },
    { id: 5, title: 'Bowler Release Point Consistency' },
    { id: 6, title: 'Powerplay vs Death Over Efficiency' },
    { id: 7, title: 'Player 5-Year Career Trajectory' },
    { id: 8, title: 'Tactical Win-Probability Critical Over Heatmap' },
    { id: 9, title: 'Boundary Clearance vs Ground Dimensions' },
    { id: 10, title: 'Batting Impact & Dot Ball Pressure Ratio' },
  ];

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-cyan-500/20 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-cyan-400" />
            <span className="text-xs font-mono font-bold text-cyan-400 uppercase tracking-widest">
              ADVANCED CRICKET ANALYTICS HUB · 10 INTERACTIVE VISUALIZATIONS
            </span>
          </div>
          <h2 className="text-2xl font-black text-white mt-1">
            Data Science, Scatter Plots & Advanced Metrics
          </h2>
        </div>

        <span className="text-xs font-mono text-slate-400 bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-xl self-start sm:self-auto">
          10 Dedicated Analytics Views
        </span>
      </div>

      {/* Visualization Tab Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none font-mono text-xs">
        {visualizations.map((viz) => {
          const isActive = activeVizId === viz.id;
          return (
            <button
              key={viz.id}
              onClick={() => {
                setActiveVizId(viz.id);
                cricketAudio.playUiClick();
                triggerHaptic(HAPTIC_PATTERNS.TAP);
              }}
              className={`px-3.5 py-2 rounded-xl shrink-0 font-bold transition-all cursor-pointer border ${
                isActive
                  ? 'bg-cyan-500 text-slate-950 border-cyan-400 shadow-md shadow-cyan-500/25 scale-[1.02]'
                  : 'bg-slate-900/80 border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              <span className="text-[10px] opacity-70 mr-1.5">#{viz.id}</span>
              <span>{viz.title}</span>
            </button>
          );
        })}
      </div>

      {/* =========================================================================
          VIZ 1: STRIKE RATE VS PACE / SPIN SCATTER PLOT
          ========================================================================= */}
      {activeVizId === 1 && (
        <div className="rounded-3xl border border-cyan-500/30 bg-slate-950/90 p-5 sm:p-7 space-y-4 backdrop-blur-md animate-in fade-in duration-200">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
            <div>
              <span className="text-xs font-mono font-bold text-cyan-400 uppercase">
                SCATTER PLOT · STRIKE RATE: 140+ KM/H EXPRESS PACE VS TURNING SPIN
              </span>
              <p className="text-xs text-slate-300 font-sans mt-0.5">
                X-Axis: Strike Rate against Pace bowlers. Y-Axis: Strike Rate against Spin bowlers. Bubble size: Batting Average.
              </p>
            </div>
            <div className="flex items-center gap-2 text-[11px] font-mono">
              <span className="flex items-center gap-1 text-emerald-400">
                <span className="h-2 w-2 rounded-full bg-emerald-400" />
                <span>Spin Destroyer Zone (Upper Left)</span>
              </span>
              <span className="flex items-center gap-1 text-sky-400">
                <span className="h-2 w-2 rounded-full bg-sky-400" />
                <span>Pace Ramp Zone (Bottom Right)</span>
              </span>
            </div>
          </div>

          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis
                  type="number"
                  dataKey="srPace"
                  name="SR vs Pace"
                  unit=""
                  domain={[120, 190]}
                  tick={{ fill: '#94a3b8', fontSize: 11, fontFamily: 'monospace' }}
                  label={{ value: 'Strike Rate vs Pace (km/h)', position: 'insideBottom', offset: -10, fill: '#64748b', fontSize: 11 }}
                />
                <YAxis
                  type="number"
                  dataKey="srSpin"
                  name="SR vs Spin"
                  unit=""
                  domain={[115, 205]}
                  tick={{ fill: '#94a3b8', fontSize: 11, fontFamily: 'monospace' }}
                  label={{ value: 'Strike Rate vs Spin', angle: -90, position: 'insideLeft', fill: '#64748b', fontSize: 11 }}
                />
                <ZAxis type="number" dataKey="avg" range={[60, 400]} name="Batting Avg" />
                <Tooltip
                  cursor={{ strokeDasharray: '3 3' }}
                  content={({ payload }) => {
                    if (!payload || !payload.length) return null;
                    const data = payload[0].payload;
                    return (
                      <div className="rounded-xl border border-cyan-500/50 bg-slate-950 p-3 text-xs font-mono shadow-xl space-y-1">
                        <div className="flex items-center gap-1.5 font-bold text-white">
                          <CountryFlag code={data.country} className="h-3.5 w-3.5 rounded-sm" />
                          <span>{data.name}</span>
                          <span className="text-slate-400">({data.role})</span>
                        </div>
                        <div className="text-sky-300">SR vs Pace: {data.srPace}</div>
                        <div className="text-amber-300">SR vs Spin: {data.srSpin}</div>
                        <div className="text-emerald-400">Career T20 Avg: {data.avg}</div>
                      </div>
                    );
                  }}
                />
                <Scatter name="Batters" data={SCATTER_BATTERS_DATA} fill="#06b6d4">
                  {SCATTER_BATTERS_DATA.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={entry.srSpin > 165 ? '#10b981' : entry.srPace > 165 ? '#38bdf8' : '#f59e0b'}
                    />
                  ))}
                </Scatter>
              </ScatterChart>
            </ResponsiveContainer>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-3 text-xs font-mono text-slate-300 flex items-center justify-between">
            <span>KEY TACTICAL INSIGHT:</span>
            <span className="text-cyan-300 font-bold">
              Heinrich Klaasen boasts world-record 194.5 SR vs Spin; Suryakumar Yadav maintains elite 182+ SR vs 145+ km/h pace.
            </span>
          </div>
        </div>
      )}

      {/* =========================================================================
          VIZ 2: DEATH OVERS ECONOMY HEATMAP
          ========================================================================= */}
      {activeVizId === 2 && (
        <div className="rounded-3xl border border-cyan-500/30 bg-slate-950/90 p-5 sm:p-7 space-y-4 backdrop-blur-md animate-in fade-in duration-200">
          <div className="border-b border-slate-800 pb-3">
            <span className="text-xs font-mono font-bold text-cyan-400 uppercase">
              HEATMAP MATRIX · BOWLER ECONOMY RATE ACROSS DEATH OVERS (16-20)
            </span>
            <p className="text-xs text-slate-300 font-sans mt-0.5">
              Green indicates sub-7.0 lockdown economy. Red highlights vulnerable overs conceded under pressure.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left font-mono text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400">
                  <th className="py-2.5 px-3">PREMIER BOWLER</th>
                  <th className="py-2.5 px-3 text-center">OVER 16</th>
                  <th className="py-2.5 px-3 text-center">OVER 17</th>
                  <th className="py-2.5 px-3 text-center">OVER 18</th>
                  <th className="py-2.5 px-3 text-center">OVER 19</th>
                  <th className="py-2.5 px-3 text-center">OVER 20</th>
                  <th className="py-2.5 px-3 text-right">DEATH ECON</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {DEATH_BOWLERS_HEATMAP.map((b) => {
                  const getBg = (val: number) => {
                    if (val <= 6.5) return 'bg-emerald-500/25 text-emerald-300 border border-emerald-500/40';
                    if (val <= 8.0) return 'bg-cyan-500/20 text-cyan-200 border border-cyan-500/30';
                    if (val <= 9.0) return 'bg-amber-500/20 text-amber-300 border border-amber-500/30';
                    return 'bg-rose-500/25 text-rose-300 border border-rose-500/40';
                  };
                  return (
                    <tr key={b.bowler} className="hover:bg-slate-900/40">
                      <td className="py-3 px-3 font-bold text-white flex items-center gap-2">
                        <CountryFlag code={b.country} className="h-3.5 w-3.5 rounded-sm" />
                        <span>{b.bowler}</span>
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span className={`px-2.5 py-1 rounded-lg font-black inline-block ${getBg(b.ov16)}`}>
                          {b.ov16}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span className={`px-2.5 py-1 rounded-lg font-black inline-block ${getBg(b.ov17)}`}>
                          {b.ov17}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span className={`px-2.5 py-1 rounded-lg font-black inline-block ${getBg(b.ov18)}`}>
                          {b.ov18}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span className={`px-2.5 py-1 rounded-lg font-black inline-block ${getBg(b.ov19)}`}>
                          {b.ov19}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span className={`px-2.5 py-1 rounded-lg font-black inline-block ${getBg(b.ov20)}`}>
                          {b.ov20}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right font-black text-cyan-300 text-sm">
                        {b.overallEcon.toFixed(2)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* =========================================================================
          VIZ 3: BATTER SCORING ZONE EFFICIENCY GRID
          ========================================================================= */}
      {activeVizId === 3 && (
        <div className="rounded-3xl border border-cyan-500/30 bg-slate-950/90 p-5 sm:p-7 space-y-4 backdrop-blur-md animate-in fade-in duration-200">
          <div className="border-b border-slate-800 pb-3">
            <span className="text-xs font-mono font-bold text-cyan-400 uppercase">
              GROUND EFFICIENCY GRID · SCORING DENSITY & BOUNDARY FREQUENCY BY SECTOR
            </span>
            <p className="text-xs text-slate-300 font-sans mt-0.5">
              8-sector spatial breakdown of runs, boundary conversion rates, and dot ball frequencies.
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
            {[
              { sector: 'Third Man / Fly Slip', runs: '18% Runs', sr: '178 SR', bound: '32% 4s/6s', color: 'border-sky-500/30 bg-sky-950/40 text-sky-300' },
              { sector: 'Point & Backward Point', runs: '14% Runs', sr: '146 SR', bound: '24% 4s/6s', color: 'border-cyan-500/30 bg-cyan-950/40 text-cyan-300' },
              { sector: 'Cover & Extra Cover', runs: '22% Runs', sr: '162 SR', bound: '28% 4s/6s', color: 'border-emerald-500/30 bg-emerald-950/40 text-emerald-300' },
              { sector: 'Long-Off & Straight V', runs: '16% Runs', sr: '184 SR', bound: '35% 4s/6s', color: 'border-amber-500/30 bg-amber-950/40 text-amber-300' },
              { sector: 'Long-On & Cow Corner', runs: '20% Runs', sr: '192 SR', bound: '38% 4s/6s', color: 'border-purple-500/30 bg-purple-950/40 text-purple-300' },
              { sector: 'Mid-Wicket & Deep Square', runs: '15% Runs', sr: '170 SR', bound: '30% 4s/6s', color: 'border-rose-500/30 bg-rose-950/40 text-rose-300' },
              { sector: 'Fine Leg & Short Fine', runs: '12% Runs', sr: '168 SR', bound: '26% 4s/6s', color: 'border-teal-500/30 bg-teal-950/40 text-teal-300' },
              { sector: 'Behind Stumps Ramp', runs: '8% Runs', sr: '210 SR', bound: '42% 4s/6s', color: 'border-blue-500/30 bg-blue-950/40 text-blue-300' },
            ].map((zone) => (
              <div key={zone.sector} className={`rounded-2xl border p-4 space-y-2 ${zone.color}`}>
                <span className="font-bold text-white block text-sm">{zone.sector}</span>
                <div className="flex justify-between text-[11px]">
                  <span className="text-slate-400">Run Share:</span>
                  <strong>{zone.runs}</strong>
                </div>
                <div className="flex justify-between text-[11px]">
                  <span className="text-slate-400">Strike Rate:</span>
                  <strong>{zone.sr}</strong>
                </div>
                <div className="flex justify-between text-[11px]">
                  <span className="text-slate-400">Boundary %:</span>
                  <strong>{zone.bound}</strong>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* =========================================================================
          VIZ 4: LONG-TERM TEAM WIN PROBABILITY TREND
          ========================================================================= */}
      {activeVizId === 4 && (
        <div className="rounded-3xl border border-cyan-500/30 bg-slate-950/90 p-5 sm:p-7 space-y-4 backdrop-blur-md animate-in fade-in duration-200">
          <div className="border-b border-slate-800 pb-3">
            <span className="text-xs font-mono font-bold text-cyan-400 uppercase">
              10-MATCH ROLLING WIN-PROBABILITY TRENDLINE ACROSS THE T20 WORLD CUP
            </span>
            <p className="text-xs text-slate-300 font-sans mt-0.5">
              Trajectory showing India's undefeated 8-0 surge versus rivals across tournament match progression.
            </p>
          </div>

          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={WIN_RATE_TRENDS} margin={{ top: 10, right: 20, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="match" tick={{ fill: '#94a3b8', fontSize: 11, fontFamily: 'monospace' }} />
                <YAxis domain={[40, 100]} tick={{ fill: '#94a3b8', fontSize: 11, fontFamily: 'monospace' }} unit="%" />
                <Tooltip
                  contentStyle={{ backgroundColor: '#020617', borderColor: '#06b6d4', borderRadius: 12, fontSize: 12, fontFamily: 'monospace' }}
                />
                <Legend />
                <Line type="monotone" dataKey="IND" stroke="#38bdf8" strokeWidth={3} dot={{ r: 4 }} name="India 🇮🇳" />
                <Line type="monotone" dataKey="AUS" stroke="#facc15" strokeWidth={2} dot={{ r: 3 }} name="Australia 🇦🇺" />
                <Line type="monotone" dataKey="SA" stroke="#10b981" strokeWidth={2} dot={{ r: 3 }} name="South Africa 🇿🇦" />
                <Line type="monotone" dataKey="ENG" stroke="#f43f5e" strokeWidth={2} dot={{ r: 3 }} name="England 🏴󠁧󠁢󠁥󠁮󠁧󠁿" />
                <Line type="monotone" dataKey="PAK" stroke="#22c55e" strokeWidth={2} dot={{ r: 3 }} name="Pakistan 🇵🇰" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* =========================================================================
          VIZ 5: BOWLER RELEASE POINT CONSISTENCY
          ========================================================================= */}
      {activeVizId === 5 && (
        <div className="rounded-3xl border border-cyan-500/30 bg-slate-950/90 p-5 sm:p-7 space-y-4 backdrop-blur-md animate-in fade-in duration-200">
          <div className="border-b border-slate-800 pb-3">
            <span className="text-xs font-mono font-bold text-cyan-400 uppercase">
              BOWLER RELEASE POINT DISPERSION & BIOMECHANICAL CONSISTENCY
            </span>
            <p className="text-xs text-slate-300 font-sans mt-0.5">
              Hawk-Eye 3D sensor tracking showing variance in release height (meters) and crease extension.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs font-mono">
            <div className="rounded-2xl border border-cyan-500/30 bg-cyan-950/30 p-4 space-y-3">
              <div className="flex items-center gap-2">
                <CountryFlag code="IND" className="h-4 w-4 rounded-sm" />
                <span className="font-bold text-white text-sm">Jasprit Bumrah</span>
              </div>
              <div className="text-2xl font-black text-cyan-300">2.14m ± 12mm</div>
              <p className="text-[11px] text-slate-400 font-sans">
                Hyper-consistent release point. 98.4% of balls released within a 2.5cm cluster circle, creating unreadable length deception.
              </p>
              <div className="text-[10px] text-emerald-400 font-bold">RELEASE EXTENSION: 1.84m IN FRONT OF POPPING CREASE</div>
            </div>

            <div className="rounded-2xl border border-amber-500/30 bg-amber-950/30 p-4 space-y-3">
              <div className="flex items-center gap-2">
                <CountryFlag code="AUS" className="h-4 w-4 rounded-sm" />
                <span className="font-bold text-white text-sm">Mitchell Starc</span>
              </div>
              <div className="text-2xl font-black text-amber-300">2.28m ± 22mm</div>
              <p className="text-[11px] text-slate-400 font-sans">
                High-arm catapult release. Trajectory creates steep bounce and late yorker curvature from wide on the crease.
              </p>
              <div className="text-[10px] text-amber-400 font-bold">RELEASE EXTENSION: 1.92m EXTENSION</div>
            </div>

            <div className="rounded-2xl border border-purple-500/30 bg-purple-950/30 p-4 space-y-3">
              <div className="flex items-center gap-2">
                <CountryFlag code="ENG" className="h-4 w-4 rounded-sm" />
                <span className="font-bold text-white text-sm">Jofra Archer</span>
              </div>
              <div className="text-2xl font-black text-purple-300">2.19m ± 15mm</div>
              <p className="text-[11px] text-slate-400 font-sans">
                Effortless whippy action; sudden burst of 148 km/h pace without detectable telegraphing in shoulder rotation.
              </p>
              <div className="text-[10px] text-purple-400 font-bold">RELEASE EXTENSION: 1.76m EXTENSION</div>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          VIZ 6: POWERPLAY VS DEATH OVER EFFICIENCY
          ========================================================================= */}
      {activeVizId === 6 && (
        <div className="rounded-3xl border border-cyan-500/30 bg-slate-950/90 p-5 sm:p-7 space-y-4 backdrop-blur-md animate-in fade-in duration-200">
          <div className="border-b border-slate-800 pb-3">
            <span className="text-xs font-mono font-bold text-cyan-400 uppercase">
              NET RUN RATE DIFFERENTIAL · POWERPLAY (1-6) VS DEATH OVERS (16-20)
            </span>
            <p className="text-xs text-slate-300 font-sans mt-0.5">
              Comparison of batting scoring rate versus bowling economy during high-leverage powerplay and death phases.
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
            {[
              { team: 'India', flag: 'IND', ppNet: '+2.8 RPO', deathNet: '+4.9 RPO', status: 'Dominant (+7.7 Delta)' },
              { team: 'Australia', flag: 'AUS', ppNet: '+2.2 RPO', deathNet: '+2.4 RPO', status: 'Positive (+4.6 Delta)' },
              { team: 'South Africa', flag: 'SA', ppNet: '+1.6 RPO', deathNet: '+3.1 RPO', status: 'Positive (+4.7 Delta)' },
              { team: 'England', flag: 'ENG', ppNet: '+1.4 RPO', deathNet: '+0.8 RPO', status: 'Balanced (+2.2 Delta)' },
            ].map((item) => (
              <div key={item.team} className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4 space-y-2">
                <div className="flex items-center gap-2">
                  <CountryFlag code={item.flag} className="h-4 w-4 rounded-sm" />
                  <span className="font-bold text-white text-sm">{item.team}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Powerplay Net:</span>
                  <strong className="text-sky-300">{item.ppNet}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Death Phase Net:</span>
                  <strong className="text-emerald-400">{item.deathNet}</strong>
                </div>
                <div className="pt-1 border-t border-slate-800 text-[10px] text-cyan-400 font-bold">
                  {item.status}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* =========================================================================
          VIZ 7: PLAYER 5-YEAR CAREER TRAJECTORY
          ========================================================================= */}
      {activeVizId === 7 && (
        <div className="rounded-3xl border border-cyan-500/30 bg-slate-950/90 p-5 sm:p-7 space-y-4 backdrop-blur-md animate-in fade-in duration-200">
          <div className="border-b border-slate-800 pb-3">
            <span className="text-xs font-mono font-bold text-cyan-400 uppercase">
              5-YEAR CAREER TRAJECTORY & EVOLUTION CURVE (2020-2024)
            </span>
            <p className="text-xs text-slate-300 font-sans mt-0.5">
              Historical evolution of batting strike rate, average, and tournament dominance.
            </p>
          </div>

          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={CAREER_TRAJECTORY_DATA} margin={{ top: 10, right: 20, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="year" tick={{ fill: '#94a3b8', fontSize: 11, fontFamily: 'monospace' }} />
                <YAxis domain={[20, 180]} tick={{ fill: '#94a3b8', fontSize: 11, fontFamily: 'monospace' }} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#020617', borderColor: '#06b6d4', borderRadius: 12, fontSize: 12, fontFamily: 'monospace' }}
                />
                <Legend />
                <Line type="monotone" dataKey="rohitSR" stroke="#38bdf8" strokeWidth={3} name="Rohit Sharma SR" />
                <Line type="monotone" dataKey="kohliSR" stroke="#f59e0b" strokeWidth={2} name="Virat Kohli SR" />
                <Line type="monotone" dataKey="kohliAvg" stroke="#10b981" strokeWidth={2} strokeDasharray="4 4" name="Kohli Average" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* =========================================================================
          VIZ 8: TACTICAL WIN-PROBABILITY CRITICAL OVER HEATMAP
          ========================================================================= */}
      {activeVizId === 8 && (
        <div className="rounded-3xl border border-cyan-500/30 bg-slate-950/90 p-5 sm:p-7 space-y-4 backdrop-blur-md animate-in fade-in duration-200">
          <div className="border-b border-slate-800 pb-3">
            <span className="text-xs font-mono font-bold text-cyan-400 uppercase">
              CRITICAL OVER DECISION WINDOW · OVER-BY-OVER MATCH LEVERAGE INDEX
            </span>
            <p className="text-xs text-slate-300 font-sans mt-0.5">
              Historical leverage index overlay highlighting the pivotal overs where 78% of T20 championship outcomes are determined.
            </p>
          </div>

          <div className="grid grid-cols-5 sm:grid-cols-10 gap-2 text-center font-mono text-xs">
            {Array.from({ length: 20 }, (_, i) => {
              const over = i + 1;
              const leverage =
                over <= 3
                  ? 45
                  : over <= 6
                  ? 65
                  : over <= 11
                  ? 40
                  : over <= 15
                  ? 75
                  : over === 16
                  ? 88
                  : over === 17
                  ? 92
                  : over === 18
                  ? 98
                  : over === 19
                  ? 100
                  : 95;
              const isPeak = over >= 16 && over <= 19;
              return (
                <div
                  key={over}
                  className={`rounded-xl p-2.5 border transition-all ${
                    isPeak
                      ? 'border-rose-500 bg-rose-500/20 text-rose-300 font-black shadow-lg shadow-rose-500/20 scale-105'
                      : leverage >= 60
                      ? 'border-amber-500/30 bg-amber-950/30 text-amber-300 font-bold'
                      : 'border-slate-800 bg-slate-900/60 text-slate-400'
                  }`}
                >
                  <span className="text-[10px] block opacity-70">OV {over}</span>
                  <span className="text-sm font-black mt-1 block">{leverage}%</span>
                  <span className="text-[8px] uppercase mt-0.5 block">
                    {isPeak ? 'CRITICAL' : leverage >= 60 ? 'HIGH' : 'STEADY'}
                  </span>
                </div>
              );
            })}
          </div>

          <div className="rounded-xl border border-rose-500/30 bg-rose-950/20 p-3 text-xs font-mono text-rose-200 text-center">
            🔥 CRITICAL OVER WINDOW IDENTIFIED: Overs 16 through 19 deliver a combined 94% leverage index.
          </div>
        </div>
      )}

      {/* =========================================================================
          VIZ 9: BOUNDARY CLEARANCE VS GROUND DIMENSIONS
          ========================================================================= */}
      {activeVizId === 9 && (
        <div className="rounded-3xl border border-cyan-500/30 bg-slate-950/90 p-5 sm:p-7 space-y-4 backdrop-blur-md animate-in fade-in duration-200">
          <div className="border-b border-slate-800 pb-3">
            <span className="text-xs font-mono font-bold text-cyan-400 uppercase">
              LOFTED SHOT TRAJECTORY VS BOUNDARY CLEARANCE MARGIN
            </span>
            <p className="text-xs text-slate-300 font-sans mt-0.5">
              Simulated launch velocity (130-155 km/h exit speed) and launch angle (28°-36°) compared to fence distances.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs font-mono">
            <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4 space-y-2">
              <span className="text-slate-400 block">Kensington Oval (Barbados)</span>
              <div className="text-2xl font-black text-white">76m Straight</div>
              <div className="text-emerald-400 font-bold">Clearance Safety: +8.4m</div>
              <p className="text-[11px] text-slate-400 font-sans">
                Warm humid air allows 145 km/h lofted drives to clear ropes comfortably by 8+ meters.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4 space-y-2">
              <span className="text-slate-400 block">Melbourne Cricket Ground</span>
              <div className="text-2xl font-black text-white">84m Straight</div>
              <div className="text-rose-400 font-bold">Clearance Danger: -2.1m (Boundary Catches)</div>
              <p className="text-[11px] text-slate-400 font-sans">
                Cavernous boundaries; mis-timed lofted shots result in 41% catch rate at deep mid-wicket.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4 space-y-2">
              <span className="text-slate-400 block">Narendra Modi Stadium</span>
              <div className="text-2xl font-black text-white">78m Straight</div>
              <div className="text-amber-400 font-bold">Clearance Safety: +4.2m</div>
              <p className="text-[11px] text-slate-400 font-sans">
                Square boundaries (72m) encourage horizontal pull & sweep shots.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          VIZ 10: BATTING IMPACT & DOT BALL PRESSURE RATIO
          ========================================================================= */}
      {activeVizId === 10 && (
        <div className="rounded-3xl border border-cyan-500/30 bg-slate-950/90 p-5 sm:p-7 space-y-4 backdrop-blur-md animate-in fade-in duration-200">
          <div className="border-b border-slate-800 pb-3">
            <span className="text-xs font-mono font-bold text-cyan-400 uppercase">
              BATTING IMPACT RATIO · BOUNDARY STRIKE VS DOT-BALL CONTAINMENT
            </span>
            <p className="text-xs text-slate-300 font-sans mt-0.5">
              Batting positions 1 through 7 mapped across boundary percentage, strike rotation efficiency, and pressure index.
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5 text-center font-mono text-xs">
            {[
              { pos: '#1 Opener', impact: 88, dotPct: '26% Dots', role: 'Attack Powerplay' },
              { pos: '#2 Opener', impact: 84, dotPct: '28% Dots', role: 'Anchor / Attack' },
              { pos: '#3 Top Order', impact: 91, dotPct: '24% Dots', role: 'Tempo Controller' },
              { pos: '#4 Middle', impact: 94, dotPct: '22% Dots', role: 'Spin Counter' },
              { pos: '#5 Finisher', impact: 96, dotPct: '19% Dots', role: 'High Risk Clout' },
              { pos: '#6 All-Round', impact: 92, dotPct: '21% Dots', role: 'Death Assault' },
              { pos: '#7 Finisher', impact: 86, dotPct: '25% Dots', role: 'Ramp / Yorker Defense' },
            ].map((p) => (
              <div key={p.pos} className="rounded-2xl border border-slate-800 bg-slate-900/60 p-3 space-y-1">
                <span className="text-white font-bold block">{p.pos}</span>
                <span className="text-2xl font-black text-cyan-300 block">{p.impact}</span>
                <span className="text-[10px] text-amber-300 font-bold block">{p.dotPct}</span>
                <span className="text-[9px] text-slate-400 block">{p.role}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
