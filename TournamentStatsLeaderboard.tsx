import React, { useState } from 'react';
import { useGame } from '../../context/GameContext';
import { TEAMS, STADIUMS } from '../../data/cricketData';
import { CountryFlag, TeamCrest, PlayerCardAvatar } from '../common/CricketIdentity';
import { Player } from '../../types/cricket';
import { cricketAudio } from '../../utils/audioSystem';
import {
  Trophy,
  Flame,
  Award,
  Zap,
  TrendingUp,
  MapPin,
  ChevronRight,
  Shield,
  Search,
  Filter,
  Eye,
  Crosshair,
  BarChart2,
} from 'lucide-react';

interface BatterLeaderboardEntry {
  rank: number;
  id: string;
  name: string;
  teamId: string;
  role: string;
  matches: number;
  innings: number;
  runs: number;
  balls: number;
  highestScore: string;
  average: number;
  strikeRate: number;
  fours: number;
  sixes: number;
  fifties: number;
  hundreds: number;
}

interface BowlerLeaderboardEntry {
  rank: number;
  id: string;
  name: string;
  teamId: string;
  role: string;
  matches: number;
  overs: number;
  wickets: number;
  economy: number;
  average: number;
  bestFigures: string;
  dotBallPercent: number;
  strikeRate: number;
}

const ORANGE_CAP_LEADERS: BatterLeaderboardEntry[] = [
  {
    rank: 1,
    id: 'sky',
    name: 'Suryakumar Yadav',
    teamId: 'ind',
    role: 'Middle-Order Batter',
    matches: 8,
    innings: 8,
    runs: 382,
    balls: 227,
    highestScore: '89*',
    average: 54.57,
    strikeRate: 168.28,
    fours: 34,
    sixes: 22,
    fifties: 3,
    hundreds: 0,
  },
  {
    rank: 2,
    id: 'head',
    name: 'Travis Head',
    teamId: 'aus',
    role: 'Opening Batter',
    matches: 8,
    innings: 8,
    runs: 356,
    balls: 218,
    highestScore: '92',
    average: 44.5,
    strikeRate: 163.3,
    fours: 41,
    sixes: 18,
    fifties: 3,
    hundreds: 0,
  },
  {
    rank: 3,
    id: 'buttler',
    name: 'Jos Buttler',
    teamId: 'eng',
    role: 'Wicketkeeper Batter',
    matches: 7,
    innings: 7,
    runs: 324,
    balls: 204,
    highestScore: '83*',
    average: 54.0,
    strikeRate: 158.82,
    fours: 32,
    sixes: 16,
    fifties: 3,
    hundreds: 0,
  },
  {
    rank: 4,
    id: 'klaasen',
    name: 'Heinrich Klaasen',
    teamId: 'sa',
    role: 'Middle-Order Batter',
    matches: 8,
    innings: 8,
    runs: 312,
    balls: 178,
    highestScore: '74',
    average: 44.57,
    strikeRate: 175.28,
    fours: 22,
    sixes: 24,
    fifties: 2,
    hundreds: 0,
  },
  {
    rank: 5,
    id: 'gurbaz',
    name: 'Rahmanullah Gurbaz',
    teamId: 'afg',
    role: 'Opening Batter',
    matches: 8,
    innings: 8,
    runs: 281,
    balls: 226,
    highestScore: '80',
    average: 35.12,
    strikeRate: 124.33,
    fours: 24,
    sixes: 16,
    fifties: 3,
    hundreds: 0,
  },
  {
    rank: 6,
    id: 'rohit',
    name: 'Rohit Sharma',
    teamId: 'ind',
    role: 'Opening Batter',
    matches: 8,
    innings: 8,
    runs: 257,
    balls: 164,
    highestScore: '92',
    average: 36.71,
    strikeRate: 156.7,
    fours: 28,
    sixes: 15,
    fifties: 2,
    hundreds: 0,
  },
];

const PURPLE_CAP_LEADERS: BowlerLeaderboardEntry[] = [
  {
    rank: 1,
    id: 'bumrah',
    name: 'Jasprit Bumrah',
    teamId: 'ind',
    role: 'Express Pace',
    matches: 8,
    overs: 29.4,
    wickets: 15,
    economy: 4.17,
    average: 8.26,
    bestFigures: '3/7',
    dotBallPercent: 62.4,
    strikeRate: 11.8,
  },
  {
    rank: 2,
    id: 'arshdeep',
    name: 'Arshdeep Singh',
    teamId: 'ind',
    role: 'Left-Arm Fast-Medium',
    matches: 8,
    overs: 30.0,
    wickets: 17,
    economy: 7.16,
    average: 12.64,
    bestFigures: '4/9',
    dotBallPercent: 48.2,
    strikeRate: 10.5,
  },
  {
    rank: 3,
    id: 'farooqi',
    name: 'Fazalhaq Farooqi',
    teamId: 'afg',
    role: 'Left-Arm Fast-Medium',
    matches: 8,
    overs: 25.2,
    wickets: 17,
    economy: 6.31,
    average: 9.41,
    bestFigures: '5/9',
    dotBallPercent: 54.8,
    strikeRate: 8.9,
  },
  {
    rank: 4,
    id: 'nortje',
    name: 'Anrich Nortje',
    teamId: 'sa',
    role: 'Right-Arm Express Fast',
    matches: 8,
    overs: 30.2,
    wickets: 15,
    economy: 5.74,
    average: 11.6,
    bestFigures: '4/7',
    dotBallPercent: 56.1,
    strikeRate: 12.1,
  },
  {
    rank: 5,
    id: 'rashid',
    name: 'Rashid Khan',
    teamId: 'afg',
    role: 'Leg-Spin All-Rounder',
    matches: 8,
    overs: 31.0,
    wickets: 14,
    economy: 6.17,
    average: 13.64,
    bestFigures: '4/17',
    dotBallPercent: 52.3,
    strikeRate: 13.2,
  },
  {
    rank: 6,
    id: 'cummins',
    name: 'Pat Cummins',
    teamId: 'aus',
    role: 'Right-Arm Fast',
    matches: 7,
    overs: 26.0,
    wickets: 11,
    economy: 7.34,
    average: 17.36,
    bestFigures: '3/28',
    dotBallPercent: 46.5,
    strikeRate: 14.1,
  },
];

export const TournamentStatsLeaderboard: React.FC = () => {
  const { setActiveModalPlayer, setActiveView, setSelectedPlayerId } = useGame();
  const [activeLeaderboardTab, setActiveLeaderboardTab] = useState<'orange' | 'purple' | 'sixes' | 'venues'>('orange');
  const [searchQuery, setSearchQuery] = useState('');

  const handleOpenPlayer = (playerId: string) => {
    cricketAudio.playBatHit();
    const team = TEAMS.find((t) => t.squad.some((p) => p.id === playerId));
    const player = team?.squad.find((p) => p.id === playerId);
    if (player) {
      setActiveModalPlayer(player);
    }
  };

  const filteredBatters = ORANGE_CAP_LEADERS.filter((b) =>
    b.name.toLowerCase().includes(searchQuery.toLowerCase()) || b.teamId.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredBowlers = PURPLE_CAP_LEADERS.filter((b) =>
    b.name.toLowerCase().includes(searchQuery.toLowerCase()) || b.teamId.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <section className="relative rounded-3xl border border-slate-800 bg-slate-950 p-6 sm:p-8 space-y-6 shadow-xl">
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-5">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono font-bold uppercase tracking-wider text-amber-400">
            <Trophy className="h-4 w-4 text-amber-400" />
            <span>T20 WORLD CUP OFFICIAL LEADERBOARDS</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight mt-1">
            Tournament Statistics & Power Rankings
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Real tournament performance metrics calibrated to ICC T20 benchmarks with interactive player dossiers.
          </p>
        </div>

        {/* Tab Buttons */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-900 rounded-xl border border-slate-800">
          <button
            onClick={() => {
              setActiveLeaderboardTab('orange');
              cricketAudio.playBatHit();
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
              activeLeaderboardTab === 'orange'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <span>🟠 Orange Cap</span>
          </button>

          <button
            onClick={() => {
              setActiveLeaderboardTab('purple');
              cricketAudio.playBatHit();
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
              activeLeaderboardTab === 'purple'
                ? 'bg-purple-500 text-white shadow-md shadow-purple-500/20'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <span>🟣 Purple Cap</span>
          </button>

          <button
            onClick={() => {
              setActiveLeaderboardTab('venues');
              cricketAudio.playBatHit();
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
              activeLeaderboardTab === 'venues'
                ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <MapPin className="h-3 w-3" />
            <span>🏟️ Venues</span>
          </button>
        </div>
      </div>

      {/* =========================================================================
          TAB 1: ORANGE CAP (Most Runs)
          ========================================================================= */}
      {activeLeaderboardTab === 'orange' && (
        <div className="space-y-4 animate-in fade-in duration-300">
          {/* Top Performer Card Spotlight */}
          <div className="rounded-2xl border border-amber-500/30 bg-gradient-to-r from-amber-950/30 via-slate-950 to-slate-950 p-5 sm:p-6 shadow-xl flex flex-col sm:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="relative">
                <PlayerCardAvatar
                  playerId={ORANGE_CAP_LEADERS[0].id}
                  name={ORANGE_CAP_LEADERS[0].name}
                  countryCode={ORANGE_CAP_LEADERS[0].teamId}
                  size="lg"
                />
                <span className="absolute -top-2 -left-2 flex h-6 w-6 items-center justify-center rounded-full bg-amber-500 text-xs font-black text-slate-950 shadow-md">
                  #1
                </span>
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="rounded-md bg-amber-500/20 border border-amber-500/40 px-2 py-0.5 text-[10px] font-mono font-bold text-amber-300">
                    CURRENT ORANGE CAP HOLDER
                  </span>
                  <CountryFlag countryCode={ORANGE_CAP_LEADERS[0].teamId} size="sm" />
                </div>
                <h3 className="text-xl font-black text-white">{ORANGE_CAP_LEADERS[0].name}</h3>
                <p className="text-xs text-slate-400">
                  {ORANGE_CAP_LEADERS[0].role} · Strike Rate: <strong className="text-amber-400">{ORANGE_CAP_LEADERS[0].strikeRate}</strong>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-6 text-center font-mono">
              <div>
                <span className="text-xs text-slate-500 block">TOTAL RUNS</span>
                <span className="text-3xl font-black text-amber-400 tracking-tight">{ORANGE_CAP_LEADERS[0].runs}</span>
              </div>
              <div className="h-8 w-[1px] bg-slate-800" />
              <div>
                <span className="text-xs text-slate-500 block">AVERAGE</span>
                <span className="text-xl font-bold text-white">{ORANGE_CAP_LEADERS[0].average}</span>
              </div>
              <div className="h-8 w-[1px] bg-slate-800" />
              <div>
                <span className="text-xs text-slate-500 block">BOUNDARIES</span>
                <span className="text-xl font-bold text-cyan-300">{ORANGE_CAP_LEADERS[0].fours + ORANGE_CAP_LEADERS[0].sixes}</span>
              </div>
              <button
                onClick={() => handleOpenPlayer(ORANGE_CAP_LEADERS[0].id)}
                className="hidden lg:flex items-center gap-1.5 rounded-xl bg-amber-500 px-4 py-2 text-xs font-bold text-slate-950 hover:bg-amber-400 transition-colors cursor-pointer ml-4"
              >
                <span>Inspect DNA</span>
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {/* Batting Leaderboard Table */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/40 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead className="bg-slate-950/80 text-slate-400 border-b border-slate-800">
                  <tr>
                    <th className="py-3 px-4 font-semibold w-12 text-center">Rank</th>
                    <th className="py-3 px-4 font-semibold">Batter</th>
                    <th className="py-3 px-3 font-semibold text-center">Team</th>
                    <th className="py-3 px-3 font-semibold text-right">Inns</th>
                    <th className="py-3 px-3 font-semibold text-right">Runs</th>
                    <th className="py-3 px-3 font-semibold text-right">Balls</th>
                    <th className="py-3 px-3 font-semibold text-right">HS</th>
                    <th className="py-3 px-3 font-semibold text-right">Avg</th>
                    <th className="py-3 px-3 font-semibold text-right">SR</th>
                    <th className="py-3 px-3 font-semibold text-right">4s</th>
                    <th className="py-3 px-3 font-semibold text-right">6s</th>
                    <th className="py-3 px-4 font-semibold text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-200">
                  {filteredBatters.map((b) => (
                    <tr
                      key={b.id}
                      onClick={() => handleOpenPlayer(b.id)}
                      className="hover:bg-slate-800/40 transition-colors cursor-pointer group"
                    >
                      <td className="py-3 px-4 text-center font-bold">
                        <span className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs ${
                          b.rank === 1 ? 'bg-amber-500/20 text-amber-400 font-black border border-amber-500/40' : 'text-slate-400'
                        }`}>
                          {b.rank}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-bold text-white flex items-center gap-3">
                        <PlayerCardAvatar playerId={b.id} name={b.name} countryCode={b.teamId} size="sm" />
                        <div>
                          <span className="group-hover:text-amber-400 transition-colors">{b.name}</span>
                          <span className="text-[10px] text-slate-500 block font-normal">{b.role}</span>
                        </div>
                      </td>
                      <td className="py-3 px-3 text-center">
                        <CountryFlag countryCode={b.teamId} size="sm" className="mx-auto" />
                      </td>
                      <td className="py-3 px-3 text-right text-slate-400">{b.innings}</td>
                      <td className="py-3 px-3 text-right font-black text-amber-400 text-sm">{b.runs}</td>
                      <td className="py-3 px-3 text-right text-slate-400">{b.balls}</td>
                      <td className="py-3 px-3 text-right font-bold text-white">{b.highestScore}</td>
                      <td className="py-3 px-3 text-right font-medium text-slate-300">{b.average}</td>
                      <td className="py-3 px-3 text-right font-black text-cyan-400">{b.strikeRate}</td>
                      <td className="py-3 px-3 text-right text-slate-400">{b.fours}</td>
                      <td className="py-3 px-3 text-right text-purple-300 font-bold">{b.sixes}</td>
                      <td className="py-3 px-4 text-center">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenPlayer(b.id);
                          }}
                          className="rounded-lg border border-slate-700 bg-slate-800 px-2.5 py-1 text-[11px] font-bold text-slate-300 hover:text-white hover:border-amber-400 transition-colors cursor-pointer"
                        >
                          View Profile
                        </button>
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
          TAB 2: PURPLE CAP (Most Wickets)
          ========================================================================= */}
      {activeLeaderboardTab === 'purple' && (
        <div className="space-y-4 animate-in fade-in duration-300">
          {/* Top Bowler Card Spotlight */}
          <div className="rounded-2xl border border-purple-500/30 bg-gradient-to-r from-purple-950/30 via-slate-950 to-slate-950 p-5 sm:p-6 shadow-xl flex flex-col sm:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="relative">
                <PlayerCardAvatar
                  playerId={PURPLE_CAP_LEADERS[0].id}
                  name={PURPLE_CAP_LEADERS[0].name}
                  countryCode={PURPLE_CAP_LEADERS[0].teamId}
                  size="lg"
                />
                <span className="absolute -top-2 -left-2 flex h-6 w-6 items-center justify-center rounded-full bg-purple-500 text-xs font-black text-white shadow-md">
                  #1
                </span>
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="rounded-md bg-purple-500/20 border border-purple-500/40 px-2 py-0.5 text-[10px] font-mono font-bold text-purple-300">
                    PLAYER OF THE TOURNAMENT & PURPLE CAP
                  </span>
                  <CountryFlag countryCode={PURPLE_CAP_LEADERS[0].teamId} size="sm" />
                </div>
                <h3 className="text-xl font-black text-white">{PURPLE_CAP_LEADERS[0].name}</h3>
                <p className="text-xs text-slate-400">
                  {PURPLE_CAP_LEADERS[0].role} · Tournament Economy: <strong className="text-emerald-400">{PURPLE_CAP_LEADERS[0].economy}</strong>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-6 text-center font-mono">
              <div>
                <span className="text-xs text-slate-500 block">TOTAL WICKETS</span>
                <span className="text-3xl font-black text-purple-400 tracking-tight">{PURPLE_CAP_LEADERS[0].wickets}</span>
              </div>
              <div className="h-8 w-[1px] bg-slate-800" />
              <div>
                <span className="text-xs text-slate-500 block">ECONOMY</span>
                <span className="text-xl font-bold text-emerald-400">{PURPLE_CAP_LEADERS[0].economy}</span>
              </div>
              <div className="h-8 w-[1px] bg-slate-800" />
              <div>
                <span className="text-xs text-slate-500 block">DOT BALL %</span>
                <span className="text-xl font-bold text-cyan-300">{PURPLE_CAP_LEADERS[0].dotBallPercent}%</span>
              </div>
              <button
                onClick={() => handleOpenPlayer(PURPLE_CAP_LEADERS[0].id)}
                className="hidden lg:flex items-center gap-1.5 rounded-xl bg-purple-500 px-4 py-2 text-xs font-bold text-white hover:bg-purple-400 transition-colors cursor-pointer ml-4"
              >
                <span>Inspect DNA</span>
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {/* Bowling Leaderboard Table */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/40 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead className="bg-slate-950/80 text-slate-400 border-b border-slate-800">
                  <tr>
                    <th className="py-3 px-4 font-semibold w-12 text-center">Rank</th>
                    <th className="py-3 px-4 font-semibold">Bowler</th>
                    <th className="py-3 px-3 font-semibold text-center">Team</th>
                    <th className="py-3 px-3 font-semibold text-right">Overs</th>
                    <th className="py-3 px-3 font-semibold text-right">Wickets</th>
                    <th className="py-3 px-3 font-semibold text-right">Econ</th>
                    <th className="py-3 px-3 font-semibold text-right">Avg</th>
                    <th className="py-3 px-3 font-semibold text-right">BBI</th>
                    <th className="py-3 px-3 font-semibold text-right">Dots %</th>
                    <th className="py-3 px-4 font-semibold text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-200">
                  {filteredBowlers.map((b) => (
                    <tr
                      key={b.id}
                      onClick={() => handleOpenPlayer(b.id)}
                      className="hover:bg-slate-800/40 transition-colors cursor-pointer group"
                    >
                      <td className="py-3 px-4 text-center font-bold">
                        <span className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs ${
                          b.rank === 1 ? 'bg-purple-500/20 text-purple-400 font-black border border-purple-500/40' : 'text-slate-400'
                        }`}>
                          {b.rank}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-bold text-white flex items-center gap-3">
                        <PlayerCardAvatar playerId={b.id} name={b.name} countryCode={b.teamId} size="sm" />
                        <div>
                          <span className="group-hover:text-purple-400 transition-colors">{b.name}</span>
                          <span className="text-[10px] text-slate-500 block font-normal">{b.role}</span>
                        </div>
                      </td>
                      <td className="py-3 px-3 text-center">
                        <CountryFlag countryCode={b.teamId} size="sm" className="mx-auto" />
                      </td>
                      <td className="py-3 px-3 text-right text-slate-400">{b.overs}</td>
                      <td className="py-3 px-3 text-right font-black text-purple-400 text-sm">{b.wickets}</td>
                      <td className="py-3 px-3 text-right font-bold text-emerald-400">{b.economy}</td>
                      <td className="py-3 px-3 text-right text-slate-300 font-medium">{b.average}</td>
                      <td className="py-3 px-3 text-right font-bold text-white">{b.bestFigures}</td>
                      <td className="py-3 px-3 text-right text-cyan-400 font-bold">{b.dotBallPercent}%</td>
                      <td className="py-3 px-4 text-center">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenPlayer(b.id);
                          }}
                          className="rounded-lg border border-slate-700 bg-slate-800 px-2.5 py-1 text-[11px] font-bold text-slate-300 hover:text-white hover:border-purple-400 transition-colors cursor-pointer"
                        >
                          View Profile
                        </button>
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
          TAB 3: VENUES INTEL MATRIX
          ========================================================================= */}
      {activeLeaderboardTab === 'venues' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 animate-in fade-in duration-300">
          {STADIUMS.slice(0, 6).map((s) => (
            <div
              key={s.id}
              className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 space-y-3 hover:border-cyan-500/50 hover:bg-slate-900/80 transition-all cursor-pointer group shadow-md"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-bold text-cyan-400 uppercase tracking-wider">
                  {s.city}, {s.country}
                </span>
                <span className="text-xs font-mono text-slate-500">Cap: {s.capacity.toLocaleString()}</span>
              </div>

              <h4 className="text-base font-bold text-white group-hover:text-cyan-300 transition-colors">
                {s.name}
              </h4>

              <div className="grid grid-cols-2 gap-2 text-xs font-mono border-t border-slate-800/80 pt-2.5">
                <div className="rounded-lg border border-slate-800 bg-slate-950 p-2">
                  <span className="text-[10px] text-slate-500 block">AVG 1ST INNS</span>
                  <span className="font-bold text-white">{s.avgFirstInningsScore} Runs</span>
                </div>
                <div className="rounded-lg border border-slate-800 bg-slate-950 p-2">
                  <span className="text-[10px] text-slate-500 block">CHASING WIN %</span>
                  <span className="font-bold text-amber-300">{s.chasingWinPercent}%</span>
                </div>
              </div>

              <div className="space-y-1.5 pt-1">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-slate-400">Pace vs Spin Wickets:</span>
                  <span className="text-slate-200">{s.paceWicketPercent}% Pace · {s.spinWicketPercent}% Spin</span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-slate-800 overflow-hidden flex">
                  <div className="h-full bg-cyan-500" style={{ width: `${s.paceWicketPercent}%` }} />
                  <div className="h-full bg-purple-500" style={{ width: `${s.spinWicketPercent}%` }} />
                </div>
              </div>

              <div className="flex items-center justify-between text-xs font-mono text-slate-400 border-t border-slate-800/80 pt-2">
                <span>Dew: <strong className="text-white">{s.dewFactor}</strong></span>
                <span className="text-cyan-400 font-bold group-hover:translate-x-1 transition-transform">Inspect Ground →</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
};
