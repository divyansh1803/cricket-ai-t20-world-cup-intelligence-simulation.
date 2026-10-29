import React, { useState } from 'react';
import {
  BarChart3,
  TrendingUp,
  Activity,
  Zap,
  Shield,
  Target,
  Swords,
  Layers,
  ChevronRight,
  Flame,
  Award,
  Filter,
  Sparkles,
} from 'lucide-react';
import { CountryFlag, TeamCrest } from '../common/CricketIdentity';
import { TEAMS } from '../../data/cricketData';
import { Team, Player } from '../../types/cricket';
import { cricketAudio } from '../../utils/audioSystem';
import { triggerHaptic, HAPTIC_PATTERNS } from '../../utils/haptics';
import { AdvancedAnalyticsHub } from './AdvancedAnalyticsHub';
import { ProMatchAnalysisTenSuite } from './ProMatchAnalysisTenSuite';
import { MatchAnalytics } from '../MatchAnalytics';

export interface PhaseMetrics {
  teamId: string;
  teamName: string;
  countryCode: string;
  powerplayRR: number;
  powerplayBoundaryPct: number;
  middleRR: number;
  middleDotBallPct: number;
  deathRR: number;
  deathBoundaryPct: number;
  deathEcon: number;
  expectedRuns: number;
  expectedWickets: number;
}

export const TOURNAMENT_PHASE_DATA: PhaseMetrics[] = [
  {
    teamId: 'ind',
    teamName: 'India',
    countryCode: 'IND',
    powerplayRR: 9.4,
    powerplayBoundaryPct: 24.5,
    middleRR: 8.6,
    middleDotBallPct: 26.2,
    deathRR: 12.8,
    deathBoundaryPct: 31.0,
    deathEcon: 7.1,
    expectedRuns: 188,
    expectedWickets: 8.4,
  },
  {
    teamId: 'aus',
    teamName: 'Australia',
    countryCode: 'AUS',
    powerplayRR: 9.6,
    powerplayBoundaryPct: 25.8,
    middleRR: 8.3,
    middleDotBallPct: 28.5,
    deathRR: 11.9,
    deathBoundaryPct: 28.5,
    deathEcon: 8.4,
    expectedRuns: 182,
    expectedWickets: 7.8,
  },
  {
    teamId: 'eng',
    teamName: 'England',
    countryCode: 'ENG',
    powerplayRR: 9.2,
    powerplayBoundaryPct: 23.4,
    middleRR: 8.4,
    middleDotBallPct: 29.0,
    deathRR: 11.5,
    deathBoundaryPct: 27.2,
    deathEcon: 8.9,
    expectedRuns: 178,
    expectedWickets: 7.2,
  },
  {
    teamId: 'sa',
    teamName: 'South Africa',
    countryCode: 'SA',
    powerplayRR: 8.8,
    powerplayBoundaryPct: 22.0,
    middleRR: 8.7,
    middleDotBallPct: 27.4,
    deathRR: 12.4,
    deathBoundaryPct: 29.8,
    deathEcon: 7.6,
    expectedRuns: 184,
    expectedWickets: 8.0,
  },
  {
    teamId: 'pak',
    teamName: 'Pakistan',
    countryCode: 'PAK',
    powerplayRR: 8.1,
    powerplayBoundaryPct: 19.8,
    middleRR: 7.9,
    middleDotBallPct: 32.1,
    deathRR: 10.8,
    deathBoundaryPct: 25.4,
    deathEcon: 7.8,
    expectedRuns: 164,
    expectedWickets: 7.5,
  },
  {
    teamId: 'wi',
    teamName: 'West Indies',
    countryCode: 'WI',
    powerplayRR: 8.9,
    powerplayBoundaryPct: 24.1,
    middleRR: 8.2,
    middleDotBallPct: 34.0,
    deathRR: 12.6,
    deathBoundaryPct: 32.5,
    deathEcon: 9.4,
    expectedRuns: 176,
    expectedWickets: 6.9,
  },
  {
    teamId: 'nz',
    teamName: 'New Zealand',
    countryCode: 'NZ',
    powerplayRR: 8.5,
    powerplayBoundaryPct: 21.2,
    middleRR: 8.1,
    middleDotBallPct: 28.0,
    deathRR: 11.2,
    deathBoundaryPct: 26.8,
    deathEcon: 8.1,
    expectedRuns: 172,
    expectedWickets: 7.4,
  },
  {
    teamId: 'afg',
    teamName: 'Afghanistan',
    countryCode: 'AFG',
    powerplayRR: 8.2,
    powerplayBoundaryPct: 20.4,
    middleRR: 7.8,
    middleDotBallPct: 31.5,
    deathRR: 10.5,
    deathBoundaryPct: 24.2,
    deathEcon: 7.4,
    expectedRuns: 162,
    expectedWickets: 8.2,
  },
];

export interface BatterBowlerMatchup {
  batterName: string;
  batterTeam: string;
  batterCountryCode: string;
  bowlerName: string;
  bowlerTeam: string;
  bowlerCountryCode: string;
  ballsFaced: number;
  runsScored: number;
  dismissals: number;
  strikeRate: number;
  dotBallPct: number;
  boundaryPct: number;
  aiVerdict: string;
}

export const FAMOUS_MATCHUPS: BatterBowlerMatchup[] = [
  {
    batterName: 'Rohit Sharma',
    batterTeam: 'India',
    batterCountryCode: 'IND',
    bowlerName: 'Mitchell Starc',
    bowlerTeam: 'Australia',
    bowlerCountryCode: 'AUS',
    ballsFaced: 42,
    runsScored: 78,
    dismissals: 1,
    strikeRate: 185.7,
    dotBallPct: 28.5,
    boundaryPct: 33.3,
    aiVerdict: 'Rohit dominates early swing; punished Starc with 29 runs in a single over during the 2024 Super 8s.',
  },
  {
    batterName: 'Virat Kohli',
    batterTeam: 'India',
    batterCountryCode: 'IND',
    bowlerName: 'Shaheen Afridi',
    bowlerTeam: 'Pakistan',
    bowlerCountryCode: 'PAK',
    ballsFaced: 36,
    runsScored: 52,
    dismissals: 1,
    strikeRate: 144.4,
    dotBallPct: 34.2,
    boundaryPct: 19.4,
    aiVerdict: 'Disciplined early leaves followed by aggressive wrist-work against full pitched inswingers.',
  },
  {
    batterName: 'Travis Head',
    batterTeam: 'Australia',
    batterCountryCode: 'AUS',
    bowlerName: 'Jasprit Bumrah',
    bowlerTeam: 'India',
    bowlerCountryCode: 'IND',
    ballsFaced: 31,
    runsScored: 28,
    dismissals: 2,
    strikeRate: 90.3,
    dotBallPct: 54.8,
    boundaryPct: 9.6,
    aiVerdict: 'Bumrah neutralizes Head’s high backlift with tail-in angle from wide of the crease.',
  },
  {
    batterName: 'Heinrich Klaasen',
    batterTeam: 'South Africa',
    batterCountryCode: 'SA',
    bowlerName: 'Rashid Khan',
    bowlerTeam: 'Afghanistan',
    bowlerCountryCode: 'AFG',
    ballsFaced: 28,
    runsScored: 54,
    dismissals: 0,
    strikeRate: 192.8,
    dotBallPct: 21.4,
    boundaryPct: 32.1,
    aiVerdict: 'Elite pickup pulls and sweeping against flatter googlies without getting tied down.',
  },
  {
    batterName: 'Jos Buttler',
    batterTeam: 'England',
    batterCountryCode: 'ENG',
    bowlerName: 'Anrich Nortje',
    bowlerTeam: 'South Africa',
    bowlerCountryCode: 'SA',
    ballsFaced: 34,
    runsScored: 61,
    dismissals: 2,
    strikeRate: 179.4,
    dotBallPct: 29.4,
    boundaryPct: 29.4,
    aiVerdict: 'Explosive high-risk contest; Buttler ramps 150 km/h thunderbolts over fine-leg.',
  },
];

export const ComprehensiveAnalyticsSuite: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'match-analysis' | 'telemetry-lab' | 'phases' | 'radar' | 'matchups' | 'sabermetrics' | 'advanced-hub'>('match-analysis');
  const [selectedPhase, setSelectedPhase] = useState<'all' | 'powerplay' | 'middle' | 'death'>('all');
  const [radarTeamAId, setRadarTeamAId] = useState<string>('ind');
  const [radarTeamBId, setRadarTeamBId] = useState<string>('aus');
  const [selectedMatchupIndex, setSelectedMatchupIndex] = useState<number>(0);

  const teamA = TEAMS.find((t) => t.id === radarTeamAId) || TEAMS[0];
  const teamB = TEAMS.find((t) => t.id === radarTeamBId) || TEAMS[1];
  const currentMatchup = FAMOUS_MATCHUPS[selectedMatchupIndex];

  return (
    <section className="space-y-6">
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 border-b border-cyan-500/20 pb-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono font-bold text-cyan-400 tracking-wide mb-1">
            <Activity className="h-4 w-4 text-cyan-400 shrink-0" />
            <span>Advanced Cricket Analytics &amp; Sabermetrics Suite</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            Phase Dominance, Tactical Radar &amp; Matchup Intel
          </h2>
          <p className="text-xs sm:text-sm text-slate-200 mt-1 font-sans">
            Deep mathematical breakdown of T20 World Cup performances, bowler stamina trends, shot selection, and weather pitch telemetry.
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex flex-wrap items-center gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800">
          {[
            { id: 'match-analysis', label: 'Match Analysis', icon: Activity },
            { id: 'telemetry-lab', label: 'Stamina, Shots & Weather', icon: Flame },
            { id: 'advanced-hub', label: '10x Analytics Hub', icon: Sparkles },
            { id: 'phases', label: 'Phase Dominance', icon: BarChart3 },
            { id: 'radar', label: 'Tactical Radar', icon: Target },
            { id: 'matchups', label: 'H2H Battles', icon: Swords },
            { id: 'sabermetrics', label: 'Sabermetrics (xR/xW)', icon: Zap },
          ].map((t) => {
            const Icon = t.icon;
            const isActive = activeTab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => {
                  setActiveTab(t.id as any);
                  cricketAudio.playUiClick();
                  triggerHaptic(HAPTIC_PATTERNS.TAP);
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono font-bold rounded-lg cursor-pointer transition-colors whitespace-nowrap shrink-0 ${
                  isActive
                    ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20 font-black'
                    : 'text-slate-300 hover:text-white hover:bg-slate-900'
                }`}
              >
                <Icon className="h-3.5 w-3.5 shrink-0" />
                <span>{t.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* =========================================================================
          TAB 1: PHASE DOMINANCE (POWERPLAY, MIDDLE, DEATH OVERS)
          ========================================================================= */}
      {activeTab === 'phases' && (
        <div className="space-y-4 animate-in fade-in duration-200">
          {/* Phase Filter Controls */}
          <div className="flex items-center justify-between flex-wrap gap-3">
            <span className="text-xs font-mono text-slate-400">
              Filter by Match Phase Progression:
            </span>
            <div className="flex items-center gap-1.5 bg-slate-900 p-1 rounded-xl border border-slate-800 text-xs font-mono">
              {[
                { id: 'all', label: 'All 20 Overs' },
                { id: 'powerplay', label: 'Powerplay (Overs 1-6)' },
                { id: 'middle', label: 'Middle (Overs 7-15)' },
                { id: 'death', label: 'Death Overs (Overs 16-20)' },
              ].map((p) => (
                <button
                  key={p.id}
                  onClick={() => setSelectedPhase(p.id as any)}
                  className={`px-3 py-1 rounded-lg cursor-pointer transition-all ${
                    selectedPhase === p.id
                      ? 'bg-cyan-500 text-slate-950 font-black shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Table / Grid with National Flags (NO RAW SHORTFORMS) */}
          <div className="rounded-2xl border border-cyan-500/25 bg-[#030e24] overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead className="bg-[#020716] border-b border-cyan-500/20 text-slate-400 uppercase tracking-wider text-[11px]">
                  <tr>
                    <th className="py-3 px-4">National Team</th>
                    <th className="py-3 px-4 text-center">Powerplay RR (Overs 1-6)</th>
                    <th className="py-3 px-4 text-center">Middle RR (Overs 7-15)</th>
                    <th className="py-3 px-4 text-center">Death RR (Overs 16-20)</th>
                    <th className="py-3 px-4 text-center">Death Bowling Econ</th>
                    <th className="py-3 px-4 text-center">Expected Runs (xR)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80">
                  {TOURNAMENT_PHASE_DATA.map((row) => (
                    <tr
                      key={row.teamId}
                      className="hover:bg-slate-900/60 transition-colors"
                    >
                      <td className="py-3 px-4 font-bold text-white flex items-center gap-2.5">
                        <CountryFlag countryCode={row.countryCode} size="md" className="rounded-sm" />
                        <span className="text-sm">{row.teamName}</span>
                      </td>
                      <td className="py-3 px-4 text-center font-bold text-cyan-300 tabular-nums">
                        {row.powerplayRR.toFixed(1)}{' '}
                        <span className="text-[10px] text-slate-400 block font-normal font-sans">
                          {row.powerplayBoundaryPct}% 4s/6s
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center font-bold text-slate-200 tabular-nums">
                        {row.middleRR.toFixed(1)}{' '}
                        <span className="text-[10px] text-slate-400 block font-normal font-sans">
                          {row.middleDotBallPct}% Dots
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center font-bold text-amber-300 tabular-nums">
                        {row.deathRR.toFixed(1)}{' '}
                        <span className="text-[10px] text-slate-400 block font-normal font-sans">
                          {row.deathBoundaryPct}% 4s/6s
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center font-bold text-emerald-400 tabular-nums">
                        {row.deathEcon.toFixed(1)} RPO
                      </td>
                      <td className="py-3 px-4 text-center font-black text-cyan-400 tabular-nums text-sm">
                        {row.expectedRuns}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 2: TACTICAL RADAR COMPARISON (TEAM A VS TEAM B)
          ========================================================================= */}
      {activeTab === 'radar' && (
        <div className="space-y-4 animate-in fade-in duration-200">
          {/* Dual Team Pickers with Flags */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="rounded-2xl border border-cyan-500/30 bg-[#03112c] p-4 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <CountryFlag countryCode={teamA.id} size="lg" className="rounded-md" />
                <div>
                  <span className="text-[10px] font-mono text-cyan-400 uppercase font-bold block">TEAM 1</span>
                  <h3 className="text-lg font-black text-white">{teamA.name}</h3>
                </div>
              </div>
              <select
                value={radarTeamAId}
                onChange={(e) => setRadarTeamAId(e.target.value)}
                className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs font-bold text-white cursor-pointer"
              >
                {TEAMS.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="rounded-2xl border border-amber-500/30 bg-[#03112c] p-4 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <CountryFlag countryCode={teamB.id} size="lg" className="rounded-md" />
                <div>
                  <span className="text-[10px] font-mono text-amber-400 uppercase font-bold block">TEAM 2</span>
                  <h3 className="text-lg font-black text-white">{teamB.name}</h3>
                </div>
              </div>
              <select
                value={radarTeamBId}
                onChange={(e) => setRadarTeamBId(e.target.value)}
                className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs font-bold text-white cursor-pointer"
              >
                {TEAMS.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Metric Comparison Gauges */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {[
              { label: 'Overall Rating', valA: teamA.ratings.overall, valB: teamB.ratings.overall },
              { label: 'Batting Power', valA: teamA.ratings.batting, valB: teamB.ratings.batting },
              { label: 'Bowling Depth', valA: teamA.ratings.bowling, valB: teamB.ratings.bowling },
              { label: 'Powerplay Dominance', valA: teamA.ratings.powerplay, valB: teamB.ratings.powerplay },
              { label: 'Middle Overs Grip', valA: teamA.ratings.middleOvers, valB: teamB.ratings.middleOvers },
              { label: 'Death Overs Clutch', valA: teamA.ratings.deathOvers, valB: teamB.ratings.deathOvers },
            ].map((metric, idx) => {
              const diff = metric.valA - metric.valB;
              return (
                <div key={idx} className="rounded-2xl border border-slate-800 bg-slate-950/80 p-4 space-y-2">
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="text-slate-300 font-bold">{metric.label}</span>
                    <span className={`font-bold ${diff > 0 ? 'text-cyan-400' : diff < 0 ? 'text-amber-400' : 'text-slate-400'}`}>
                      {diff > 0 ? `+${diff} ${teamA.name}` : diff < 0 ? `+${Math.abs(diff)} ${teamB.name}` : 'Equal'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-sm font-black font-mono">
                    <span className="text-cyan-300">{metric.valA}/100</span>
                    <span className="text-amber-300">{metric.valB}/100</span>
                  </div>

                  {/* Dual split bar */}
                  <div className="h-2 w-full rounded-full bg-slate-900 overflow-hidden flex">
                    <div
                      className="h-full bg-cyan-400"
                      style={{ width: `${(metric.valA / (metric.valA + metric.valB)) * 100}%` }}
                    />
                    <div
                      className="h-full bg-amber-400"
                      style={{ width: `${(metric.valB / (metric.valA + metric.valB)) * 100}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 3: BATTER VS BOWLER HEAD-TO-HEAD BATTLES
          ========================================================================= */}
      {activeTab === 'matchups' && (
        <div className="space-y-4 animate-in fade-in duration-200">
          <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
            {FAMOUS_MATCHUPS.map((m, idx) => (
              <button
                key={idx}
                onClick={() => {
                  setSelectedMatchupIndex(idx);
                  cricketAudio.playBatHit();
                  triggerHaptic(HAPTIC_PATTERNS.TAP);
                }}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-mono font-bold whitespace-nowrap transition-all cursor-pointer ${
                  selectedMatchupIndex === idx
                    ? 'border border-cyan-400 bg-cyan-500/20 text-white shadow-md'
                    : 'border border-slate-800 bg-slate-950 text-slate-400 hover:text-white'
                }`}
              >
                <CountryFlag countryCode={m.batterCountryCode} size="sm" />
                <span>{m.batterName}</span>
                <span className="text-slate-500">vs</span>
                <CountryFlag countryCode={m.bowlerCountryCode} size="sm" />
                <span>{m.bowlerName}</span>
              </button>
            ))}
          </div>

          {/* Active Matchup Card */}
          <div className="rounded-3xl border border-cyan-500/30 bg-[#030d24] p-5 sm:p-7 space-y-5 shadow-2xl">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <CountryFlag countryCode={currentMatchup.batterCountryCode} size="lg" className="rounded-md" />
                <div>
                  <span className="text-[10px] font-mono font-bold text-cyan-400 uppercase">BATTER ({currentMatchup.batterTeam})</span>
                  <h3 className="text-xl font-black text-white">{currentMatchup.batterName}</h3>
                </div>
              </div>

              <span className="rounded-full bg-slate-900 border border-slate-700 px-3 py-1 text-xs font-mono font-bold text-amber-300">
                SWORDS CLASH · T20 WORLD CUP ARCHIVE
              </span>

              <div className="flex items-center gap-3">
                <div className="text-right">
                  <span className="text-[10px] font-mono font-bold text-amber-400 uppercase">BOWLER ({currentMatchup.bowlerTeam})</span>
                  <h3 className="text-xl font-black text-white">{currentMatchup.bowlerName}</h3>
                </div>
                <CountryFlag countryCode={currentMatchup.bowlerCountryCode} size="lg" className="rounded-md" />
              </div>
            </div>

            {/* Matchup Telemetry Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center font-mono">
              <div className="rounded-xl border border-slate-800 bg-slate-950 p-3">
                <span className="text-[10px] text-slate-400 block">BALLS FACED</span>
                <strong className="text-lg text-white font-black">{currentMatchup.ballsFaced} Balls</strong>
              </div>
              <div className="rounded-xl border border-slate-800 bg-slate-950 p-3">
                <span className="text-[10px] text-slate-400 block">RUNS CONCEDED</span>
                <strong className="text-lg text-cyan-300 font-black">{currentMatchup.runsScored} Runs</strong>
              </div>
              <div className="rounded-xl border border-slate-800 bg-slate-950 p-3">
                <span className="text-[10px] text-slate-400 block">STRIKE RATE</span>
                <strong className="text-lg text-amber-300 font-black">{currentMatchup.strikeRate.toFixed(1)}</strong>
              </div>
              <div className="rounded-xl border border-slate-800 bg-slate-950 p-3">
                <span className="text-[10px] text-slate-400 block">DISMISSALS</span>
                <strong className="text-lg text-rose-400 font-black">{currentMatchup.dismissals} Times Out</strong>
              </div>
            </div>

            {/* Tactical AI Verdict */}
            <div className="rounded-xl border border-cyan-500/20 bg-cyan-950/20 p-4 space-y-1 text-xs">
              <span className="font-mono font-bold text-cyan-400 uppercase flex items-center gap-1.5">
                <Shield className="h-3.5 w-3.5" />
                <span>Tactical Matchup AI Verdict</span>
              </span>
              <p className="text-slate-300 font-sans leading-relaxed text-sm">
                {currentMatchup.aiVerdict}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 4: SABERMETRICS (EXPECTED RUNS xR & EXPECTED WICKETS xW)
          ========================================================================= */}
      {activeTab === 'sabermetrics' && (
        <div className="space-y-4 animate-in fade-in duration-200">
          <div className="rounded-2xl border border-cyan-500/25 bg-[#03112c] p-5 sm:p-6 space-y-4">
            <span className="text-xs font-mono font-bold text-cyan-400 uppercase block">
              SABERMETRIC MODEL: EXPECTED OUTCOMES BY DELIVERY PRECISION
            </span>
            <p className="text-xs text-slate-300 leading-relaxed font-sans">
              Our Monte Carlo sabermetric engine calculates expected runs (xR) and expected wickets (xW) by tracking delivery release speed, pitch degradation, and historical shot-execution zones.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 text-xs font-mono">
              <div className="rounded-xl border border-slate-800 bg-slate-950 p-4 space-y-1">
                <span className="text-slate-400 text-[10px] uppercase">India Tournament xR</span>
                <p className="text-2xl font-black text-cyan-300 tabular-nums">188.4 Runs</p>
                <span className="text-slate-400 text-[11px] block font-sans">Actual Avg: 191.2 (+2.8 Above Par)</span>
              </div>

              <div className="rounded-xl border border-slate-800 bg-slate-950 p-4 space-y-1">
                <span className="text-slate-400 text-[10px] uppercase">Australia Tournament xR</span>
                <p className="text-2xl font-black text-amber-300 tabular-nums">182.1 Runs</p>
                <span className="text-slate-400 text-[11px] block font-sans">Actual Avg: 184.6 (+2.5 Above Par)</span>
              </div>

              <div className="rounded-xl border border-slate-800 bg-slate-950 p-4 space-y-1">
                <span className="text-slate-400 text-[10px] uppercase">South Africa Tournament xR</span>
                <p className="text-2xl font-black text-emerald-300 tabular-nums">184.0 Runs</p>
                <span className="text-slate-400 text-[11px] block font-sans">Actual Avg: 181.8 (-2.2 Below Par)</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 5: 10x ADVANCED ANALYTICS HUB (SCATTER PLOTS, HEATMAPS, TRAJECTORIES)
          ========================================================================= */}
      {activeTab === 'advanced-hub' && (
        <div className="space-y-4 animate-in fade-in duration-200">
          <AdvancedAnalyticsHub />
        </div>
      )}

      {/* =========================================================================
          TAB 6: PRO MATCH ANALYSIS SUITE (10 PROPER MATCH ANALYTICS MODULES)
          ========================================================================= */}
      {activeTab === 'match-analysis' && (
        <div className="space-y-4 animate-in fade-in duration-200">
          <ProMatchAnalysisTenSuite />
        </div>
      )}

      {/* =========================================================================
          TAB 7: BOWLER STAMINA TREND, SHOT SELECTION & WEATHER PITCH LAB
          ========================================================================= */}
      {activeTab === 'telemetry-lab' && (
        <div className="space-y-4 animate-in fade-in duration-200">
          <MatchAnalytics teamA={teamA} teamB={teamB} />
        </div>
      )}
    </section>
  );
};
