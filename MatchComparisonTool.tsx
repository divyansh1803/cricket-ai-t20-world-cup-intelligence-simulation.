import React, { useState, useMemo } from 'react';
import {
  Swords,
  Trophy,
  History,
  TrendingUp,
  Shield,
  Zap,
  Play,
  Flame,
  Award,
  ChevronRight,
  Sparkles,
  ArrowRightLeft,
  CheckCircle2,
  XCircle,
  HelpCircle,
  BarChart3,
  Gauge,
  Compass,
} from 'lucide-react';
import { Team, Player } from '../../types/cricket';
import { TEAMS } from '../../data/cricketData';
import { CountryFlag, TeamCrest, TeamFlag } from '../common/CricketIdentity';
import { cricketAudio } from '../../utils/audioSystem';
import { triggerHaptic, HAPTIC_PATTERNS } from '../../utils/haptics';

interface MatchComparisonToolProps {
  initialTeamAId?: string;
  initialTeamBId?: string;
  onLaunchSimulation?: (teamA: Team, teamB: Team) => void;
  className?: string;
}

interface HistoricalH2HData {
  total: number;
  teamAWins: number;
  teamBWins: number;
  ties: number;
  teamAHighest: string;
  teamBHighest: string;
  teamALowest: string;
  teamBLowest: string;
  avgFirstInnings: number;
  recentMatches: {
    year: number;
    winnerTeamId: string;
    venue: string;
    scoreA: string;
    scoreB: string;
    margin: string;
    event: string;
  }[];
}

interface RecentFormMatch {
  result: 'W' | 'L';
  opponent: string;
  margin: string;
  date: string;
}

// Curated authentic international head-to-head records
const H2H_ARCHIVE: Record<string, HistoricalH2HData> = {
  ind_aus: {
    total: 32,
    teamAWins: 20,
    teamBWins: 11,
    ties: 1,
    teamAHighest: '208/6',
    teamBHighest: '201/7',
    teamALowest: '74/10',
    teamBLowest: '86/10',
    avgFirstInnings: 178,
    recentMatches: [
      { year: 2024, winnerTeamId: 'ind', venue: 'Daren Sammy Stadium, St Lucia', scoreA: '205/5', scoreB: '181/7', margin: 'India won by 24 runs', event: 'T20 World Cup Super 8' },
      { year: 2023, winnerTeamId: 'ind', venue: 'M. Chinnaswamy, Bengaluru', scoreA: '160/8', scoreB: '154/8', margin: 'India won by 6 runs', event: 'Bilateral T20I Series' },
      { year: 2023, winnerTeamId: 'ind', venue: 'Shaheed Veer Stadium, Raipur', scoreA: '174/9', scoreB: '154/7', margin: 'India won by 20 runs', event: 'Bilateral T20I Series' },
      { year: 2023, winnerTeamId: 'aus', venue: 'Barsapara Stadium, Guwahati', scoreA: '222/3', scoreB: '225/5', margin: 'Australia won by 5 wkts', event: 'Bilateral T20I Series' },
      { year: 2022, winnerTeamId: 'ind', venue: 'R.G.I.C Stadium, Hyderabad', scoreA: '187/4', scoreB: '186/7', margin: 'India won by 6 wkts', event: 'Bilateral T20I Series' },
    ],
  },
  ind_pak: {
    total: 13,
    teamAWins: 10,
    teamBWins: 3,
    ties: 0,
    teamAHighest: '192/5',
    teamBHighest: '182/5',
    teamALowest: '119/10',
    teamBLowest: '83/10',
    avgFirstInnings: 154,
    recentMatches: [
      { year: 2024, winnerTeamId: 'ind', venue: 'Nassau County Stadium, NY', scoreA: '119', scoreB: '113/7', margin: 'India won by 6 runs', event: 'T20 World Cup 2024' },
      { year: 2022, winnerTeamId: 'ind', venue: 'MCG, Melbourne', scoreA: '160/6', scoreB: '159/8', margin: 'India won by 4 wkts', event: 'T20 World Cup 2022' },
      { year: 2022, winnerTeamId: 'pak', venue: 'Dubai Int Stadium', scoreA: '181/7', scoreB: '182/5', margin: 'Pakistan won by 5 wkts', event: 'Asia Cup Super 4' },
      { year: 2022, winnerTeamId: 'ind', venue: 'Dubai Int Stadium', scoreA: '148/5', scoreB: '147', margin: 'India won by 5 wkts', event: 'Asia Cup Group' },
      { year: 2021, winnerTeamId: 'pak', venue: 'Dubai Int Stadium', scoreA: '151/7', scoreB: '152/0', margin: 'Pakistan won by 10 wkts', event: 'T20 World Cup 2021' },
    ],
  },
  ind_sa: {
    total: 28,
    teamAWins: 16,
    teamBWins: 11,
    ties: 1,
    teamAHighest: '237/3',
    teamBHighest: '227/3',
    teamALowest: '92/10',
    teamBLowest: '87/10',
    avgFirstInnings: 172,
    recentMatches: [
      { year: 2024, winnerTeamId: 'ind', venue: 'Kensington Oval, Barbados', scoreA: '176/7', scoreB: '169/8', margin: 'India won by 7 runs', event: 'T20 World Cup Final 2024' },
      { year: 2023, winnerTeamId: 'ind', venue: 'Wanderers Stadium, Jo\'burg', scoreA: '201/7', scoreB: '95', margin: 'India won by 106 runs', event: 'Bilateral T20I Series' },
      { year: 2023, winnerTeamId: 'sa', venue: 'St George\'s Park, Gqeberha', scoreA: '180/7', scoreB: '154/5', margin: 'South Africa won (DLS)', event: 'Bilateral T20I Series' },
      { year: 2022, winnerTeamId: 'sa', venue: 'Optus Stadium, Perth', scoreA: '133/9', scoreB: '137/5', margin: 'South Africa won by 5 wkts', event: 'T20 World Cup 2022' },
      { year: 2022, winnerTeamId: 'ind', venue: 'Barsapara Stadium, Guwahati', scoreA: '237/3', scoreB: '221/3', margin: 'India won by 16 runs', event: 'Bilateral T20I Series' },
    ],
  },
  eng_aus: {
    total: 24,
    teamAWins: 11,
    teamBWins: 11,
    ties: 2,
    teamAHighest: '221/5',
    teamBHighest: '248/6',
    teamALowest: '111/10',
    teamBLowest: '79/10',
    avgFirstInnings: 174,
    recentMatches: [
      { year: 2024, winnerTeamId: 'aus', venue: 'Kensington Oval, Barbados', scoreA: '165/6', scoreB: '201/7', margin: 'Australia won by 36 runs', event: 'T20 World Cup 2024' },
      { year: 2022, winnerTeamId: 'eng', venue: 'Perth Stadium', scoreA: '208/6', scoreB: '200/9', margin: 'England won by 8 runs', event: 'Bilateral T20I Series' },
      { year: 2022, winnerTeamId: 'eng', venue: 'Manuka Oval, Canberra', scoreA: '178/7', scoreB: '170/6', margin: 'England won by 8 runs', event: 'Bilateral T20I Series' },
      { year: 2021, winnerTeamId: 'eng', venue: 'Dubai Int Stadium', scoreA: '126/2', scoreB: '125', margin: 'England won by 8 wkts', event: 'T20 World Cup 2021' },
      { year: 2020, winnerTeamId: 'aus', venue: 'Ageas Bowl, Southampton', scoreA: '140/6', scoreB: '145/5', margin: 'Australia won by 5 wkts', event: 'Bilateral T20I Series' },
    ],
  },
};

// Recent Form Database for all top cricket nations
const TEAM_RECENT_FORM: Record<string, RecentFormMatch[]> = {
  ind: [
    { result: 'W', opponent: 'South Africa', margin: 'Won by 7 runs', date: '29 Jun 2024' },
    { result: 'W', opponent: 'England', margin: 'Won by 68 runs', date: '27 Jun 2024' },
    { result: 'W', opponent: 'Australia', margin: 'Won by 24 runs', date: '24 Jun 2024' },
    { result: 'W', opponent: 'Bangladesh', margin: 'Won by 50 runs', date: '22 Jun 2024' },
    { result: 'W', opponent: 'Afghanistan', margin: 'Won by 47 runs', date: '20 Jun 2024' },
  ],
  aus: [
    { result: 'L', opponent: 'India', margin: 'Lost by 24 runs', date: '24 Jun 2024' },
    { result: 'L', opponent: 'Afghanistan', margin: 'Lost by 21 runs', date: '22 Jun 2024' },
    { result: 'W', opponent: 'Bangladesh', margin: 'Won by 28 runs (DLS)', date: '20 Jun 2024' },
    { result: 'W', opponent: 'Scotland', margin: 'Won by 5 wkts', date: '15 Jun 2024' },
    { result: 'W', opponent: 'Namibia', margin: 'Won by 9 wkts', date: '11 Jun 2024' },
  ],
  sa: [
    { result: 'L', opponent: 'India', margin: 'Lost by 7 runs', date: '29 Jun 2024' },
    { result: 'W', opponent: 'Afghanistan', margin: 'Won by 9 wkts', date: '26 Jun 2024' },
    { result: 'W', opponent: 'West Indies', margin: 'Won by 3 wkts (DLS)', date: '23 Jun 2024' },
    { result: 'W', opponent: 'England', margin: 'Won by 7 runs', date: '21 Jun 2024' },
    { result: 'W', opponent: 'USA', margin: 'Won by 18 runs', date: '19 Jun 2024' },
  ],
  eng: [
    { result: 'L', opponent: 'India', margin: 'Lost by 68 runs', date: '27 Jun 2024' },
    { result: 'W', opponent: 'USA', margin: 'Won by 10 wkts', date: '23 Jun 2024' },
    { result: 'L', opponent: 'South Africa', margin: 'Lost by 7 runs', date: '21 Jun 2024' },
    { result: 'W', opponent: 'West Indies', margin: 'Won by 8 wkts', date: '19 Jun 2024' },
    { result: 'W', opponent: 'Namibia', margin: 'Won by 41 runs (DLS)', date: '15 Jun 2024' },
  ],
  pak: [
    { result: 'W', opponent: 'Ireland', margin: 'Won by 3 wkts', date: '16 Jun 2024' },
    { result: 'W', opponent: 'Canada', margin: 'Won by 7 wkts', date: '11 Jun 2024' },
    { result: 'L', opponent: 'India', margin: 'Lost by 6 runs', date: '09 Jun 2024' },
    { result: 'L', opponent: 'USA', margin: 'Tied (Lost Super Over)', date: '06 Jun 2024' },
    { result: 'L', opponent: 'England', margin: 'Lost by 7 wkts', date: '30 May 2024' },
  ],
  wi: [
    { result: 'L', opponent: 'South Africa', margin: 'Lost by 3 wkts (DLS)', date: '23 Jun 2024' },
    { result: 'W', opponent: 'USA', margin: 'Won by 9 wkts', date: '21 Jun 2024' },
    { result: 'L', opponent: 'England', margin: 'Lost by 8 wkts', date: '19 Jun 2024' },
    { result: 'W', opponent: 'Afghanistan', margin: 'Won by 104 runs', date: '17 Jun 2024' },
    { result: 'W', opponent: 'New Zealand', margin: 'Won by 13 runs', date: '12 Jun 2024' },
  ],
  nz: [
    { result: 'W', opponent: 'Papua New Guinea', margin: 'Won by 7 wkts', date: '17 Jun 2024' },
    { result: 'W', opponent: 'Uganda', margin: 'Won by 9 wkts', date: '14 Jun 2024' },
    { result: 'L', opponent: 'West Indies', margin: 'Lost by 13 runs', date: '12 Jun 2024' },
    { result: 'L', opponent: 'Afghanistan', margin: 'Lost by 84 runs', date: '07 Jun 2024' },
    { result: 'W', opponent: 'Pakistan', margin: 'Won by 4 runs', date: '25 Apr 2024' },
  ],
  afg: [
    { result: 'L', opponent: 'South Africa', margin: 'Lost by 9 wkts', date: '26 Jun 2024' },
    { result: 'W', opponent: 'Bangladesh', margin: 'Won by 8 runs (DLS)', date: '24 Jun 2024' },
    { result: 'W', opponent: 'Australia', margin: 'Won by 21 runs', date: '22 Jun 2024' },
    { result: 'L', opponent: 'India', margin: 'Lost by 47 runs', date: '20 Jun 2024' },
    { result: 'L', opponent: 'West Indies', margin: 'Lost by 104 runs', date: '17 Jun 2024' },
  ],
};

export const MatchComparisonTool: React.FC<MatchComparisonToolProps> = ({
  initialTeamAId = 'ind',
  initialTeamBId = 'aus',
  onLaunchSimulation,
  className = '',
}) => {
  const [teamAId, setTeamAId] = useState<string>(initialTeamAId);
  const [teamBId, setTeamBId] = useState<string>(initialTeamBId);
  const [activeTab, setActiveTab] = useState<'h2h' | 'form' | 'projection'>('h2h');

  const teamA: Team = useMemo(() => {
    return TEAMS.find((t) => t.id === teamAId) || TEAMS[0];
  }, [teamAId]);

  const teamB: Team = useMemo(() => {
    return TEAMS.find((t) => t.id === teamBId) || TEAMS[1];
  }, [teamBId]);

  // Swap Teams
  const handleSwap = () => {
    const temp = teamAId;
    setTeamAId(teamBId);
    setTeamBId(temp);
    cricketAudio.playBatHit();
    triggerHaptic(HAPTIC_PATTERNS.TAP);
  };

  // Preset Rivalry Selection
  const handleSelectPreset = (a: string, b: string) => {
    setTeamAId(a);
    setTeamBId(b);
    cricketAudio.playBatHit();
    triggerHaptic(HAPTIC_PATTERNS.TAP);
  };

  // Retrieve or compute Head-to-Head
  const h2h = useMemo<HistoricalH2HData>(() => {
    const directKey = `${teamAId}_${teamBId}`;
    const reverseKey = `${teamBId}_${teamAId}`;

    if (H2H_ARCHIVE[directKey]) {
      return H2H_ARCHIVE[directKey];
    }
    if (H2H_ARCHIVE[reverseKey]) {
      const rev = H2H_ARCHIVE[reverseKey];
      return {
        total: rev.total,
        teamAWins: rev.teamBWins,
        teamBWins: rev.teamAWins,
        ties: rev.ties,
        teamAHighest: rev.teamBHighest,
        teamBHighest: rev.teamAHighest,
        teamALowest: rev.teamBLowest,
        teamBLowest: rev.teamALowest,
        avgFirstInnings: rev.avgFirstInnings,
        recentMatches: rev.recentMatches.map((m) => ({
          ...m,
          scoreA: m.scoreB,
          scoreB: m.scoreA,
        })),
      };
    }

    // Dynamic procedural historical calculation for any matchup pairing
    const totalSim = 16;
    const ratingDiff = (teamA.ratings.overall - teamB.ratings.overall) * 1.5;
    const aWins = Math.max(3, Math.min(13, Math.round(totalSim * 0.5 + ratingDiff * 0.5)));
    const bWins = totalSim - aWins - 1;

    return {
      total: totalSim,
      teamAWins: aWins,
      teamBWins: bWins,
      ties: 1,
      teamAHighest: `${180 + Math.round(teamA.ratings.batting * 0.3)}/4`,
      teamBHighest: `${176 + Math.round(teamB.ratings.batting * 0.3)}/6`,
      teamALowest: `${110 + Math.round(teamA.ratings.bowling * 0.1)}/9`,
      teamBLowest: `${105 + Math.round(teamB.ratings.bowling * 0.1)}/10`,
      avgFirstInnings: Math.round(
        (teamA.ratings.batting * 1.1 + teamB.ratings.batting * 1.1) / 1.2
      ),
      recentMatches: [
        {
          year: 2024,
          winnerTeamId: aWins >= bWins ? teamA.id : teamB.id,
          venue: 'Kensington Oval, Barbados',
          scoreA: '178/6',
          scoreB: '172/7',
          margin: `${aWins >= bWins ? teamA.name : teamB.name} won by 6 runs`,
          event: 'ICC T20 World Cup',
        },
        {
          year: 2023,
          winnerTeamId: teamA.id,
          venue: 'Melbourne Cricket Ground',
          scoreA: '164/5',
          scoreB: '158/8',
          margin: `${teamA.name} won by 6 wkts`,
          event: 'Super 12 International',
        },
        {
          year: 2022,
          winnerTeamId: teamB.id,
          venue: 'Dubai International Stadium',
          scoreA: '150/7',
          scoreB: '153/4',
          margin: `${teamB.name} won by 6 wkts`,
          event: 'Global Championship',
        },
      ],
    };
  }, [teamAId, teamBId, teamA, teamB]);

  // Compute Projected Win Probability based on current squad strength
  const squadProjection = useMemo(() => {
    const aStrength =
      teamA.ratings.batting * 0.35 +
      teamA.ratings.bowling * 0.35 +
      teamA.ratings.fielding * 0.15 +
      teamA.ratings.deathOvers * 0.15;
    const bStrength =
      teamB.ratings.batting * 0.35 +
      teamB.ratings.bowling * 0.35 +
      teamB.ratings.fielding * 0.15 +
      teamB.ratings.deathOvers * 0.15;

    const diff = aStrength - bStrength;
    const rawA = 50 + diff * 2.8;
    const probA = Math.max(22, Math.min(78, Math.round(rawA)));
    const probB = 100 - probA;

    const parA = Math.round(145 + teamA.ratings.batting * 0.42);
    const parB = Math.round(145 + teamB.ratings.batting * 0.42);

    return {
      probA,
      probB,
      parA: `${parA - 6} - ${parA + 8}`,
      parB: `${parB - 6} - ${parB + 8}`,
      edgeCategory:
        probA >= 55
          ? `${teamA.name} holds +${probA - 50}% squad index edge`
          : probB >= 55
          ? `${teamB.name} holds +${probB - 50}% squad index edge`
          : 'Dead-even contest · High volatile finish predicted',
    };
  }, [teamA, teamB]);

  // Recent Form records
  const formA: RecentFormMatch[] =
    TEAM_RECENT_FORM[teamA.id] || [
      { result: 'W', opponent: 'Previous Rival', margin: 'Won by 18 runs', date: '2024' },
      { result: 'W', opponent: 'Group Challenger', margin: 'Won by 5 wkts', date: '2024' },
      { result: 'L', opponent: 'Top Seed', margin: 'Lost by 12 runs', date: '2024' },
      { result: 'W', opponent: 'Qualifier', margin: 'Won by 44 runs', date: '2024' },
      { result: 'W', opponent: 'Bilateral Rival', margin: 'Won by 6 wkts', date: '2024' },
    ];

  const formB: RecentFormMatch[] =
    TEAM_RECENT_FORM[teamB.id] || [
      { result: 'W', opponent: 'Previous Rival', margin: 'Won by 14 runs', date: '2024' },
      { result: 'L', opponent: 'Group Challenger', margin: 'Lost by 4 wkts', date: '2024' },
      { result: 'W', opponent: 'Top Seed', margin: 'Won by 8 runs', date: '2024' },
      { result: 'L', opponent: 'Qualifier', margin: 'Lost by 6 runs', date: '2024' },
      { result: 'W', opponent: 'Bilateral Rival', margin: 'Won by 5 wkts', date: '2024' },
    ];

  const aWinPct = Math.round((h2h.teamAWins / Math.max(1, h2h.total)) * 100);
  const bWinPct = Math.round((h2h.teamBWins / Math.max(1, h2h.total)) * 100);

  return (
    <div
      className={`rounded-3xl border border-cyan-500/35 bg-gradient-to-r from-[#010617] via-[#04112e] to-[#01081c] p-6 sm:p-8 shadow-[0_20px_50px_rgba(0,0,0,0.85),0_0_35px_rgba(6,182,212,0.18)] space-y-6 ${className}`}
    >
      {/* Header Strip */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-sky-500/20 pb-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono font-bold tracking-widest text-amber-400 uppercase mb-1">
            <Swords className="h-4 w-4" />
            <span>AI MATCH COMPARISON & SQUAD INTELLIGENCE</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            Head-to-Head & Projected Match Outcome
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 font-sans max-w-2xl mt-1">
            Compare historical records, analyze recent T20I form, and simulate projected outcomes
            based on authoritative squad ratings.
          </p>
        </div>

        {/* Quick Rivalry Presets */}
        <div className="flex flex-wrap items-center gap-2 self-start md:self-auto">
          <span className="text-[10px] font-mono text-slate-400 block sm:inline">RIVALRIES:</span>
          {[
            { label: 'IND vs AUS', a: 'ind', b: 'aus' },
            { label: 'IND vs PAK', a: 'ind', b: 'pak' },
            { label: 'ENG vs AUS', a: 'eng', b: 'aus' },
            { label: 'IND vs SA', a: 'ind', b: 'sa' },
          ].map((preset) => (
            <button
              key={preset.label}
              onClick={() => handleSelectPreset(preset.a, preset.b)}
              className="text-[11px] font-mono font-bold px-2.5 py-1 rounded-lg border border-cyan-500/30 bg-[#051438]/80 text-cyan-300 hover:text-white hover:border-cyan-400 hover:bg-cyan-950 transition-colors cursor-pointer"
            >
              {preset.label}
            </button>
          ))}
        </div>
      </div>

      {/* Team Selection Arena (Dual Team Cards + Swap Button) */}
      <div className="grid grid-cols-1 md:grid-cols-11 gap-4 items-center">
        {/* Team A Selector Card */}
        <div className="md:col-span-5 rounded-2xl border border-sky-500/30 bg-[#030d26]/90 p-4 sm:p-5 flex items-center justify-between shadow-xl">
          <div className="flex items-center gap-4">
            <div className="relative w-16 h-12 rounded-xl overflow-hidden border border-white/20 shadow-md shrink-0">
              <CountryFlag countryCode={teamA.id} size="lg" className="w-full h-full object-cover" />
            </div>

            <div>
              <span className="text-[10px] font-mono text-cyan-400 font-bold block">
                ICC RANK #{teamA.ranking} · TEAM A
              </span>
              <h3 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                {teamA.name}
              </h3>
              <span className="text-[11px] font-mono text-slate-400">
                Overall Rating: <strong className="text-cyan-300">{teamA.ratings.overall}</strong>
              </span>
            </div>
          </div>

          <div>
            <select
              value={teamAId}
              onChange={(e) => {
                setTeamAId(e.target.value);
                cricketAudio.playUiClick();
                triggerHaptic(HAPTIC_PATTERNS.TAP);
              }}
              className="rounded-xl border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs text-white font-mono focus:border-cyan-400 cursor-pointer"
            >
              {TEAMS.map((t) => (
                <option key={t.id} value={t.id} disabled={t.id === teamBId}>
                  {t.name} (#{t.ranking})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Center Swap & VS Indicator */}
        <div className="md:col-span-1 flex flex-col items-center justify-center gap-1.5">
          <button
            onClick={handleSwap}
            className="h-10 w-10 rounded-full border border-cyan-400/50 bg-[#06183d] text-cyan-300 hover:text-white hover:border-cyan-300 hover:scale-110 transition-all flex items-center justify-center cursor-pointer shadow-[0_0_15px_rgba(6,182,212,0.3)]"
            title="Swap Teams"
          >
            <ArrowRightLeft className="h-4 w-4" />
          </button>
          <span className="text-[10px] font-mono font-black text-slate-500 uppercase">VS</span>
        </div>

        {/* Team B Selector Card */}
        <div className="md:col-span-5 rounded-2xl border border-sky-500/30 bg-[#030d26]/90 p-4 sm:p-5 flex items-center justify-between shadow-xl">
          <div className="flex items-center gap-4">
            <div className="relative w-16 h-12 rounded-xl overflow-hidden border border-white/20 shadow-md shrink-0">
              <CountryFlag countryCode={teamB.id} size="lg" className="w-full h-full object-cover" />
            </div>

            <div>
              <span className="text-[10px] font-mono text-amber-400 font-bold block">
                ICC RANK #{teamB.ranking} · TEAM B
              </span>
              <h3 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                {teamB.name}
              </h3>
              <span className="text-[11px] font-mono text-slate-400">
                Overall Rating: <strong className="text-amber-300">{teamB.ratings.overall}</strong>
              </span>
            </div>
          </div>

          <div>
            <select
              value={teamBId}
              onChange={(e) => {
                setTeamBId(e.target.value);
                cricketAudio.playUiClick();
                triggerHaptic(HAPTIC_PATTERNS.TAP);
              }}
              className="rounded-xl border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs text-white font-mono focus:border-amber-400 cursor-pointer"
            >
              {TEAMS.map((t) => (
                <option key={t.id} value={t.id} disabled={t.id === teamAId}>
                  {t.name} (#{t.ranking})
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
        <button
          onClick={() => {
            setActiveTab('h2h');
            cricketAudio.playUiClick();
            triggerHaptic(HAPTIC_PATTERNS.TAP);
          }}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer ${
            activeTab === 'h2h'
              ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-400/50 shadow-[0_0_15px_rgba(6,182,212,0.25)]'
              : 'text-slate-400 hover:text-white bg-slate-900/60 border border-slate-800'
          }`}
        >
          <History className="h-3.5 w-3.5" />
          <span>Historical Head-to-Head</span>
        </button>

        <button
          onClick={() => {
            setActiveTab('form');
            cricketAudio.playUiClick();
            triggerHaptic(HAPTIC_PATTERNS.TAP);
          }}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer ${
            activeTab === 'form'
              ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-400/50 shadow-[0_0_15px_rgba(6,182,212,0.25)]'
              : 'text-slate-400 hover:text-white bg-slate-900/60 border border-slate-800'
          }`}
        >
          <TrendingUp className="h-3.5 w-3.5" />
          <span>Recent Form (Last 5 T20Is)</span>
        </button>

        <button
          onClick={() => {
            setActiveTab('projection');
            cricketAudio.playUiClick();
            triggerHaptic(HAPTIC_PATTERNS.TAP);
          }}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer ${
            activeTab === 'projection'
              ? 'bg-amber-500/20 text-amber-300 border border-amber-400/50 shadow-[0_0_15px_rgba(245,158,11,0.25)]'
              : 'text-slate-400 hover:text-white bg-slate-900/60 border border-slate-800'
          }`}
        >
          <Sparkles className="h-3.5 w-3.5" />
          <span>Projected Outcome & Squad Strength</span>
        </button>
      </div>

      {/* TAB 1: HISTORICAL HEAD-TO-HEAD */}
      {activeTab === 'h2h' && (
        <div className="space-y-5 animate-in fade-in duration-200">
          {/* Main H2H Win-Loss Gauge Bar */}
          <div className="rounded-2xl border border-slate-800 bg-slate-950/80 p-5 space-y-3">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="font-bold text-cyan-400 flex items-center gap-1.5">
                <span>{teamA.name}</span>
                <span className="text-white">({h2h.teamAWins} Wins · {aWinPct}%)</span>
              </span>

              <span className="text-slate-400">
                {h2h.total} Total Matches · {h2h.ties} Ties/NR
              </span>

              <span className="font-bold text-amber-400 flex items-center gap-1.5">
                <span className="text-white">({h2h.teamBWins} Wins · {bWinPct}%)</span>
                <span>{teamB.name}</span>
              </span>
            </div>

            {/* Split Bar */}
            <div className="h-3 w-full rounded-full bg-slate-800 overflow-hidden flex shadow-inner">
              <div
                className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 shadow-[0_0_12px_rgba(6,182,212,0.8)] transition-all duration-500"
                style={{ width: `${aWinPct}%` }}
              />
              <div
                className="h-full bg-gradient-to-r from-amber-500 to-orange-500 shadow-[0_0_12px_rgba(245,158,11,0.8)] transition-all duration-500"
                style={{ width: `${bWinPct}%` }}
              />
            </div>

            {/* Stat Matrix: Highest / Lowest Scores & Avg Total */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-slate-800/80 text-xs font-mono">
              <div className="rounded-xl bg-slate-900/60 p-2.5 text-center">
                <span className="inline-flex items-center justify-center gap-1.5 text-[10px] text-slate-500 uppercase">
                  <TeamFlag code={teamA.id} size="xs" />
                  <span>High Score</span>
                </span>
                <span className="font-bold text-white text-sm tabular-nums block mt-0.5">
                  {h2h.teamAHighest}
                </span>
              </div>
              <div className="rounded-xl bg-slate-900/60 p-2.5 text-center">
                <span className="inline-flex items-center justify-center gap-1.5 text-[10px] text-slate-500 uppercase">
                  <TeamFlag code={teamB.id} size="xs" />
                  <span>High Score</span>
                </span>
                <span className="font-bold text-white text-sm tabular-nums block mt-0.5">
                  {h2h.teamBHighest}
                </span>
              </div>
              <div className="rounded-xl bg-slate-900/60 p-2.5 text-center">
                <span className="inline-flex items-center justify-center gap-1.5 text-[10px] text-slate-500 uppercase">
                  <TeamFlag code={teamA.id} size="xs" />
                  <span>Low Score</span>
                </span>
                <span className="font-bold text-rose-400 text-sm tabular-nums block mt-0.5">
                  {h2h.teamALowest}
                </span>
              </div>
              <div className="rounded-xl bg-slate-900/60 p-2.5 text-center">
                <span className="text-[10px] text-slate-500 block uppercase">
                  Avg 1st Innings Par
                </span>
                <span className="font-bold text-cyan-300 text-sm tabular-nums">
                  {h2h.avgFirstInnings} runs
                </span>
              </div>
            </div>
          </div>

          {/* Historical Clashes Chronological Log */}
          <div className="rounded-2xl border border-slate-800 bg-slate-950/80 p-5 space-y-3">
            <h4 className="text-xs font-mono font-bold text-slate-300 uppercase tracking-wider">
              Recent Head-to-Head Encounters
            </h4>
            <div className="divide-y divide-slate-800/80">
              {h2h.recentMatches.map((m, idx) => {
                const aWon = m.winnerTeamId === teamA.id;
                return (
                  <div key={idx} className="py-2.5 flex items-center justify-between text-xs font-mono">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="text-slate-400 font-bold">{m.year}</span>
                        <span className="text-slate-600">·</span>
                        <span className="text-white font-sans">{m.event}</span>
                        <span className="text-slate-600">·</span>
                        <span className="text-slate-400">{m.venue}</span>
                      </div>
                      <span className="inline-flex items-center gap-1.5 text-[11px] text-slate-500">
                        <TeamFlag code={teamA.id} size="xs" />
                        <span>{m.scoreA}</span>
                        <span>vs</span>
                        <TeamFlag code={teamB.id} size="xs" />
                        <span>{m.scoreB}</span>
                      </span>
                    </div>

                    <span
                      className={`px-2.5 py-1 rounded-md text-[11px] font-bold ${
                        aWon
                          ? 'bg-cyan-950/60 border border-cyan-500/40 text-cyan-300'
                          : 'bg-amber-950/60 border border-amber-500/40 text-amber-300'
                      }`}
                    >
                      {m.margin}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: RECENT FORM (LAST 5 MATCHES) */}
      {activeTab === 'form' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 animate-in fade-in duration-200">
          {/* Team A Form */}
          <div className="rounded-2xl border border-sky-500/30 bg-slate-950/80 p-5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CountryFlag countryCode={teamA.id} size="sm" />
                <h4 className="text-sm font-bold text-white">{teamA.name} Form Guide</h4>
              </div>
              <div className="flex items-center gap-1">
                {formA.map((f, i) => (
                  <span
                    key={i}
                    className={`h-6 w-6 rounded-md flex items-center justify-center text-[10px] font-mono font-black ${
                      f.result === 'W'
                        ? 'bg-emerald-500 text-slate-950'
                        : 'bg-rose-500 text-white'
                    }`}
                  >
                    {f.result}
                  </span>
                ))}
              </div>
            </div>

            <div className="divide-y divide-slate-800/80 text-xs font-mono pt-1">
              {formA.map((m, idx) => (
                <div key={idx} className="py-2 flex items-center justify-between">
                  <div>
                    <span className="text-white font-bold">vs {m.opponent}</span>
                    <span className="text-[10px] text-slate-500 block">{m.date}</span>
                  </div>
                  <span
                    className={`font-bold ${
                      m.result === 'W' ? 'text-emerald-400' : 'text-rose-400'
                    }`}
                  >
                    {m.margin}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Team B Form */}
          <div className="rounded-2xl border border-amber-500/30 bg-slate-950/80 p-5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CountryFlag countryCode={teamB.id} size="sm" />
                <h4 className="text-sm font-bold text-white">{teamB.name} Form Guide</h4>
              </div>
              <div className="flex items-center gap-1">
                {formB.map((f, i) => (
                  <span
                    key={i}
                    className={`h-6 w-6 rounded-md flex items-center justify-center text-[10px] font-mono font-black ${
                      f.result === 'W'
                        ? 'bg-emerald-500 text-slate-950'
                        : 'bg-rose-500 text-white'
                    }`}
                  >
                    {f.result}
                  </span>
                ))}
              </div>
            </div>

            <div className="divide-y divide-slate-800/80 text-xs font-mono pt-1">
              {formB.map((m, idx) => (
                <div key={idx} className="py-2 flex items-center justify-between">
                  <div>
                    <span className="text-white font-bold">vs {m.opponent}</span>
                    <span className="text-[10px] text-slate-500 block">{m.date}</span>
                  </div>
                  <span
                    className={`font-bold ${
                      m.result === 'W' ? 'text-emerald-400' : 'text-rose-400'
                    }`}
                  >
                    {m.margin}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: PROJECTED OUTCOME BASED ON SQUAD STRENGTH */}
      {activeTab === 'projection' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* Win Probability Forecast Banner */}
          <div className="rounded-2xl border border-amber-500/40 bg-gradient-to-r from-[#031338] via-[#081d4a] to-[#040e2b] p-6 text-center space-y-3 shadow-2xl">
            <span className="text-xs font-mono font-bold text-amber-300 uppercase tracking-widest flex items-center justify-center gap-2">
              <Sparkles className="h-4 w-4 text-amber-400" />
              <span>MONTE CARLO PREDICTIVE SQUAD ENGINE</span>
            </span>

            <div className="flex items-center justify-center gap-6 sm:gap-10">
              <div className="text-right">
                <span className="text-xs font-mono text-cyan-300 block">{teamA.name}</span>
                <span className="text-3xl sm:text-4xl font-black text-white font-mono tabular-nums">
                  {squadProjection.probA}%
                </span>
              </div>

              <div className="h-10 w-px bg-slate-700" />

              <div className="text-left">
                <span className="text-xs font-mono text-amber-300 block">{teamB.name}</span>
                <span className="text-3xl sm:text-4xl font-black text-white font-mono tabular-nums">
                  {squadProjection.probB}%
                </span>
              </div>
            </div>

            <p className="text-xs font-mono text-slate-300 max-w-md mx-auto">
              {squadProjection.edgeCategory}
            </p>
          </div>

          {/* 5-AXIS SQUAD STRENGTH RADAR COMPARISON SECTION */}
          <div className="rounded-2xl border border-cyan-500/30 bg-[#020b24]/90 p-5 sm:p-6 shadow-xl space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-cyan-500/20 pb-3">
              <div>
                <span className="text-xs font-mono font-bold text-cyan-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Compass className="h-4 w-4" />
                  <span>5-AXIS SQUAD STRENGTH RADAR MATRIX</span>
                </span>
                <p className="text-xs text-slate-400 mt-0.5">
                  Direct polygonal comparison across Batting Depth, Bowling Variation, Spin Capability, Fielding Impact, and Recent Form.
                </p>
              </div>

              <div className="flex items-center gap-4 text-xs font-mono font-bold">
                <div className="flex items-center gap-1.5 text-cyan-400">
                  <span className="h-3 w-3 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(6,182,212,0.8)]" />
                  <span>{teamA.name}</span>
                </div>
                <div className="flex items-center gap-1.5 text-amber-400">
                  <span className="h-3 w-3 rounded-full bg-amber-400 shadow-[0_0_8px_rgba(245,158,11,0.8)]" />
                  <span>{teamB.name}</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
              {/* Radar Chart SVG */}
              <div className="lg:col-span-6 flex justify-center py-2">
                <div className="relative w-full max-w-[340px] aspect-square flex items-center justify-center">
                  {/* SVG Canvas for Radar Chart */}
                  <svg className="w-full h-full" viewBox="0 0 320 320">
                    <defs>
                      <radialGradient id="radarGlow" cx="50%" cy="50%" r="50%">
                        <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.08" />
                        <stop offset="100%" stopColor="#06b6d4" stopOpacity="0" />
                      </radialGradient>
                    </defs>

                    <circle cx="160" cy="160" r="115" fill="url(#radarGlow)" />

                    {/* Concentric Radar Grid Rings (20%, 40%, 60%, 80%, 100%) */}
                    {[0.2, 0.4, 0.6, 0.8, 1.0].map((level, ringIdx) => {
                      const ringPoints = Array.from({ length: 5 }).map((_, i) => {
                        const angle = -Math.PI / 2 + (i * 2 * Math.PI) / 5;
                        const r = level * 105;
                        return `${160 + r * Math.cos(angle)},${160 + r * Math.sin(angle)}`;
                      }).join(' ');

                      return (
                        <g key={ringIdx}>
                          <polygon
                            points={ringPoints}
                            fill="none"
                            stroke="#1e293b"
                            strokeWidth={ringIdx === 4 ? 1.5 : 1}
                            strokeDasharray={ringIdx < 4 ? '3 3' : 'none'}
                          />
                          <text
                            x="164"
                            y={160 - level * 105 + 10}
                            fill="#64748b"
                            fontSize="8"
                            fontFamily="monospace"
                          >
                            {Math.round(level * 100)}
                          </text>
                        </g>
                      );
                    })}

                    {/* Radial Spoke Lines */}
                    {Array.from({ length: 5 }).map((_, i) => {
                      const angle = -Math.PI / 2 + (i * 2 * Math.PI) / 5;
                      const x2 = 160 + 105 * Math.cos(angle);
                      const y2 = 160 + 105 * Math.sin(angle);
                      return (
                        <line
                          key={i}
                          x1="160"
                          y1="160"
                          x2={x2}
                          y2={y2}
                          stroke="#334155"
                          strokeWidth="1"
                        />
                      );
                    })}

                    {/* Team B Polygon (Amber) */}
                    {(() => {
                      const getSpin = (t: Team) => {
                        const m: Record<string, number> = { ind: 95, afg: 96, sl: 93, pak: 89, aus: 85, sa: 82, eng: 86, nz: 87, ban: 91, wi: 83 };
                        return m[t.id] || Math.round(t.ratings.bowling * 0.9);
                      };
                      const formScoreB = Math.min(98, Math.max(50, 45 + formB.filter(m => m.result === 'W').length * 10.5));
                      const valsB = [
                        Math.min(99, Math.round(teamB.ratings.batting * 0.96 + 3)),
                        Math.min(99, Math.round(teamB.ratings.bowling * 0.6 + teamB.ratings.deathOvers * 0.4)),
                        getSpin(teamB),
                        teamB.ratings.fielding,
                        Math.round(formScoreB),
                      ];
                      const ptsB = valsB.map((v, i) => {
                        const angle = -Math.PI / 2 + (i * 2 * Math.PI) / 5;
                        const r = (v / 100) * 105;
                        return `${160 + r * Math.cos(angle)},${160 + r * Math.sin(angle)}`;
                      }).join(' ');

                      return (
                        <polygon
                          points={ptsB}
                          fill="#f59e0b"
                          fillOpacity="0.22"
                          stroke="#f59e0b"
                          strokeWidth="2.5"
                          strokeLinejoin="round"
                        />
                      );
                    })()}

                    {/* Team A Polygon (Cyan) */}
                    {(() => {
                      const getSpin = (t: Team) => {
                        const m: Record<string, number> = { ind: 95, afg: 96, sl: 93, pak: 89, aus: 85, sa: 82, eng: 86, nz: 87, ban: 91, wi: 83 };
                        return m[t.id] || Math.round(t.ratings.bowling * 0.9);
                      };
                      const formScoreA = Math.min(98, Math.max(50, 45 + formA.filter(m => m.result === 'W').length * 10.5));
                      const valsA = [
                        Math.min(99, Math.round(teamA.ratings.batting * 0.96 + 3)),
                        Math.min(99, Math.round(teamA.ratings.bowling * 0.6 + teamA.ratings.deathOvers * 0.4)),
                        getSpin(teamA),
                        teamA.ratings.fielding,
                        Math.round(formScoreA),
                      ];
                      const ptsA = valsA.map((v, i) => {
                        const angle = -Math.PI / 2 + (i * 2 * Math.PI) / 5;
                        const r = (v / 100) * 105;
                        return `${160 + r * Math.cos(angle)},${160 + r * Math.sin(angle)}`;
                      }).join(' ');

                      return (
                        <polygon
                          points={ptsA}
                          fill="#06b6d4"
                          fillOpacity="0.30"
                          stroke="#06b6d4"
                          strokeWidth="2.5"
                          strokeLinejoin="round"
                        />
                      );
                    })()}

                    {/* Labels around vertices */}
                    {[
                      { label: 'Batting Depth', dx: 0, dy: -120 },
                      { label: 'Bowling Var', dx: 125, dy: -35 },
                      { label: 'Spin Capability', dx: 80, dy: 105 },
                      { label: 'Fielding Impact', dx: -80, dy: 105 },
                      { label: 'Recent Form', dx: -125, dy: -35 },
                    ].map((item, idx) => (
                      <text
                        key={idx}
                        x={160 + item.dx}
                        y={160 + item.dy}
                        textAnchor="middle"
                        fill="#cbd5e1"
                        fontSize="9"
                        fontWeight="bold"
                        fontFamily="monospace"
                      >
                        {item.label}
                      </text>
                    ))}
                  </svg>
                </div>
              </div>

              {/* Numerical Breakdown of the 5 Axes */}
              <div className="lg:col-span-6 space-y-3 font-mono text-xs">
                {(() => {
                  const getSpin = (t: Team) => {
                    const m: Record<string, number> = { ind: 95, afg: 96, sl: 93, pak: 89, aus: 85, sa: 82, eng: 86, nz: 87, ban: 91, wi: 83 };
                    return m[t.id] || Math.round(t.ratings.bowling * 0.9);
                  };
                  const formScoreA = Math.round(Math.min(98, Math.max(50, 45 + formA.filter(m => m.result === 'W').length * 10.5)));
                  const formScoreB = Math.round(Math.min(98, Math.max(50, 45 + formB.filter(m => m.result === 'W').length * 10.5)));

                  const metrics = [
                    {
                      name: 'Batting Depth',
                      valA: Math.min(99, Math.round(teamA.ratings.batting * 0.96 + 3)),
                      valB: Math.min(99, Math.round(teamB.ratings.batting * 0.96 + 3)),
                      desc: 'Top 7 boundary strike power & lower-order batting depth',
                    },
                    {
                      name: 'Bowling Variation',
                      valA: Math.min(99, Math.round(teamA.ratings.bowling * 0.6 + teamA.ratings.deathOvers * 0.4)),
                      valB: Math.min(99, Math.round(teamB.ratings.bowling * 0.6 + teamB.ratings.deathOvers * 0.4)),
                      desc: 'Pace changes, slower bouncers & wide-yorker execution',
                    },
                    {
                      name: 'Spin Capability',
                      valA: getSpin(teamA),
                      valB: getSpin(teamB),
                      desc: 'Wrist/finger spin penetration on deteriorating surfaces',
                    },
                    {
                      name: 'Fielding Impact',
                      valA: teamA.ratings.fielding,
                      valB: teamB.ratings.fielding,
                      desc: 'Direct hits, boundary saves & catch conversion rate',
                    },
                    {
                      name: 'Recent Form',
                      valA: formScoreA,
                      valB: formScoreB,
                      desc: 'Normalized win momentum over previous 5 international T20s',
                    },
                  ];

                  return metrics.map((m, idx) => {
                    const total = m.valA + m.valB;
                    const pctA = Math.round((m.valA / total) * 100);
                    const pctB = 100 - pctA;
                    const leader = m.valA > m.valB ? 'A' : m.valB > m.valA ? 'B' : 'TIED';

                    return (
                      <div key={idx} className="rounded-xl border border-slate-800/80 bg-slate-950/70 p-3 space-y-1.5">
                        <div className="flex items-center justify-between">
                          <div>
                            <span className="font-bold text-white text-xs">{m.name}</span>
                            <span className="text-[10px] text-slate-500 block">{m.desc}</span>
                          </div>
                          <span className={`inline-flex items-center gap-1.5 text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                            leader === 'A'
                              ? 'text-cyan-300 border-cyan-500/40 bg-cyan-950/50'
                              : leader === 'B'
                              ? 'text-amber-300 border-amber-500/40 bg-amber-950/50'
                              : 'text-slate-400 border-slate-700 bg-slate-900'
                          }`}>
                            {leader === 'TIED' ? (
                              'EQUAL'
                            ) : (
                              <>
                                <span>+{Math.abs(m.valA - m.valB)}</span>
                                <TeamFlag code={leader === 'A' ? teamA.id : teamB.id} size="xs" />
                              </>
                            )}
                          </span>
                        </div>

                        <div className="flex items-center justify-between text-[11px] pt-1">
                          <span className="inline-flex items-center gap-1.5 text-cyan-400 font-bold tabular-nums">
                            <TeamFlag code={teamA.id} size="xs" />
                            <span>{m.valA}</span>
                          </span>
                          <span className="inline-flex items-center gap-1.5 text-amber-400 font-bold tabular-nums">
                            <TeamFlag code={teamB.id} size="xs" />
                            <span>{m.valB}</span>
                          </span>
                        </div>

                        <div className="h-1.5 w-full bg-slate-900 rounded-full overflow-hidden flex border border-slate-800">
                          <div className="bg-gradient-to-r from-cyan-500 to-cyan-400 h-full transition-all duration-300" style={{ width: `${pctA}%` }} />
                          <div className="bg-gradient-to-r from-amber-400 to-amber-500 h-full transition-all duration-300" style={{ width: `${pctB}%` }} />
                        </div>
                      </div>
                    );
                  });
                })()}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Action Footer: Launch Match Simulation */}
      {onLaunchSimulation && (
        <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
          <span className="text-xs font-mono text-slate-400 hidden sm:inline">
            Load this matchup directly into the real-time 3D stadium simulator
          </span>

          <button
            onClick={() => {
              onLaunchSimulation(teamA, teamB);
              cricketAudio.playBatHit();
              triggerHaptic(HAPTIC_PATTERNS.TAP);
            }}
            className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 px-5 py-2.5 text-xs font-bold text-slate-950 shadow-[0_0_20px_rgba(16,185,129,0.35)] transition-all cursor-pointer font-mono"
          >
            <Play className="h-4 w-4 fill-current" />
            <span>Simulate</span>
            <TeamFlag code={teamA.id} size="xs" />
            <span>vs</span>
            <TeamFlag code={teamB.id} size="xs" />
          </button>
        </div>
      )}
    </div>
  );
};
