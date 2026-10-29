import React, { useState } from 'react';
import { useGame } from '../../context/GameContext';
import { TEAMS, STADIUMS } from '../../data/cricketData';
import { CountryFlag, TeamCrest, PlayerCardAvatar, getTeamFlagUrl } from '../common/CricketIdentity';
import { cricketAudio } from '../../utils/audioSystem';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  AreaChart,
  Area,
} from 'recharts';
import {
  Play,
  Activity,
  Flame,
  Shield,
  Zap,
  TrendingUp,
  MapPin,
  Clock,
  Radio,
  ChevronRight,
  Info,
  Maximize2,
  BarChart3,
  Crosshair,
  Gauge,
  Volume2,
} from 'lucide-react';

interface DeliveryDetail {
  ballNumber: string; // e.g. "17.1"
  runs: number;
  isWicket: boolean;
  isBoundary: boolean;
  isSix: boolean;
  batterName: string;
  bowlerName: string;
  speedKmh: number;
  line: string; // "Outside Off", "Stumps", "Pads"
  length: string; // "Yorker", "Good Length", "Short", "Full Toss"
  shotType: string; // "Cover Drive", "Pull", "Scoop", "Defended"
  commentary: string;
  wagonZone: string; // "Long Off", "Fine Leg", "Mid Wicket", etc.
}

interface MatchCentreScenario {
  id: string;
  title: string;
  tagline: string;
  stadiumName: string;
  city: string;
  teamAId: string;
  teamBId: string;
  teamAScore: string; // "164/4"
  teamAOvers: string; // "17.2"
  teamBScore: string; // "201/6"
  teamBOvers: string; // "20.0"
  target: number;
  runsNeeded: number;
  ballsRemaining: number;
  crr: number;
  rrr: number;
  probA: number;
  probB: number;
  partnership: { runs: number; balls: number; rpo: number };
  striker: { name: string; id: string; runs: number; balls: number; fours: number; sixes: number; sr: number };
  nonStriker: { name: string; id: string; runs: number; balls: number; fours: number; sixes: number; sr: number };
  currentBowler: { name: string; id: string; overs: string; maidens: number; runs: number; wickets: number; econ: number; currentSpeed: number };
  recentDeliveries: DeliveryDetail[];
  wormData: { over: number; teamA: number; teamB: number; teamAWickets?: number; teamBWickets?: number }[];
  momentumData: { over: number; winProbA: number; momentum: string }[];
}

const FEATURED_MATCHES: MatchCentreScenario[] = [
  {
    id: 'ind-aus-final',
    title: 'ICC Men\'s T20 World Cup · Grand Final Climax',
    tagline: 'High Octane Chase: 37 Runs Needed in 16 Balls',
    stadiumName: 'Narendra Modi Stadium',
    city: 'Ahmedabad',
    teamAId: 'ind',
    teamBId: 'aus',
    teamAScore: '165/4',
    teamAOvers: '17.2',
    teamBScore: '201/6',
    teamBOvers: '20.0',
    target: 202,
    runsNeeded: 37,
    ballsRemaining: 16,
    crr: 9.52,
    rrr: 13.88,
    probA: 54,
    probB: 46,
    partnership: { runs: 58, balls: 31, rpo: 11.22 },
    striker: { name: 'Suryakumar Yadav', id: 'sky', runs: 71, balls: 39, fours: 7, sixes: 4, sr: 182.1 },
    nonStriker: { name: 'Hardik Pandya', id: 'hardik', runs: 28, balls: 16, fours: 2, sixes: 2, sr: 175.0 },
    currentBowler: { name: 'Mitchell Starc', id: 'starc', overs: '3.2', maidens: 0, runs: 34, wickets: 2, econ: 10.2, currentSpeed: 144.6 },
    recentDeliveries: [
      {
        ballNumber: '16.5',
        runs: 1,
        isWicket: false,
        isBoundary: false,
        isSix: false,
        batterName: 'Hardik Pandya',
        bowlerName: 'Pat Cummins',
        speedKmh: 141.2,
        line: 'Stumps',
        length: 'Good Length',
        shotType: 'Glance to Deep Mid-Wicket',
        commentary: 'Tucked off the hip down to deep square for a single. Rotates strike smoothly.',
        wagonZone: 'Deep Square Leg',
      },
      {
        ballNumber: '16.6',
        runs: 4,
        isWicket: false,
        isBoundary: true,
        isSix: false,
        batterName: 'Suryakumar Yadav',
        bowlerName: 'Pat Cummins',
        speedKmh: 139.8,
        line: 'Outside Off',
        length: 'Full',
        shotType: 'Inside-Out Lofted Cover Drive',
        commentary: 'Glorious stroke! Backs away, creates room, and lofts it cleanly over extra cover for FOUR!',
        wagonZone: 'Extra Cover',
      },
      {
        ballNumber: '17.1',
        runs: 6,
        isWicket: false,
        isBoundary: true,
        isSix: true,
        batterName: 'Suryakumar Yadav',
        bowlerName: 'Mitchell Starc',
        speedKmh: 145.4,
        line: 'Outside Off',
        length: 'Full Yorker Candidate',
        shotType: 'Signature Lap Ramp over Third Man',
        commentary: 'SIX! Absolutely breathtaking! SKY scoops 145 km/h over third man into the top deck!',
        wagonZone: 'Third Man',
      },
      {
        ballNumber: '17.2',
        runs: 1,
        isWicket: false,
        isBoundary: false,
        isSix: false,
        batterName: 'Suryakumar Yadav',
        bowlerName: 'Mitchell Starc',
        speedKmh: 143.9,
        line: 'Leg Stump',
        length: 'Hard Yorker',
        shotType: 'Digs out to Long-On',
        commentary: 'Starc fires it fast at the toes; squeezed down to long-on for a hard-fought single.',
        wagonZone: 'Long-On',
      },
    ],
    wormData: [
      { over: 0, teamA: 0, teamB: 0 },
      { over: 2, teamA: 18, teamB: 22 },
      { over: 4, teamA: 39, teamB: 44 },
      { over: 6, teamA: 58, teamB: 62 },
      { over: 8, teamA: 74, teamB: 79 },
      { over: 10, teamA: 92, teamB: 99 },
      { over: 12, teamA: 112, teamB: 120 },
      { over: 14, teamA: 131, teamB: 142 },
      { over: 16, teamA: 151, teamB: 165 },
      { over: 17, teamA: 165, teamB: 176 },
      { over: 18, teamA: 178, teamB: 186 },
      { over: 19, teamA: 192, teamB: 194 },
      { over: 20, teamA: 203, teamB: 201 },
    ],
    momentumData: [
      { over: 6, winProbA: 42, momentum: 'Powerplay slight AUS advantage' },
      { over: 10, winProbA: 38, momentum: 'Wickets slowed India middle overs' },
      { over: 14, winProbA: 44, momentum: 'SKY-Hardik partnership counter-attack' },
      { over: 16, winProbA: 48, momentum: 'Boundary burst off Cummins' },
      { over: 17.2, winProbA: 54, momentum: 'SKY ramp six off Starc swings odds to India' },
    ],
  },
  {
    id: 'ind-pak-derby',
    title: 'ICC T20 World Cup · Subcontinent Blockbuster',
    tagline: 'Defending 119 in New York: Low Scoring Pressure Cooker',
    stadiumName: 'Nassau County International Stadium',
    city: 'New York',
    teamAId: 'pak',
    teamBId: 'ind',
    teamAScore: '102/7',
    teamAOvers: '18.2',
    teamBScore: '119/10',
    teamBOvers: '19.0',
    target: 120,
    runsNeeded: 18,
    ballsRemaining: 10,
    crr: 5.56,
    rrr: 10.8,
    probA: 36,
    probB: 64,
    partnership: { runs: 14, balls: 19, rpo: 4.42 },
    striker: { name: 'Naseem Shah', id: 'naseem', runs: 8, balls: 4, fours: 1, sixes: 0, sr: 200.0 },
    nonStriker: { name: 'Imad Wasim', id: 'imad', runs: 15, balls: 23, fours: 1, sixes: 0, sr: 65.2 },
    currentBowler: { name: 'Jasprit Bumrah', id: 'bumrah', overs: '3.4', maidens: 0, runs: 14, wickets: 3, econ: 3.82, currentSpeed: 142.8 },
    recentDeliveries: [
      {
        ballNumber: '18.0',
        runs: 0,
        isWicket: false,
        isBoundary: false,
        isSix: false,
        batterName: 'Imad Wasim',
        bowlerName: 'Jasprit Bumrah',
        speedKmh: 141.6,
        line: 'Outside Off',
        length: 'Good Length Seam',
        shotType: 'Play and Miss',
        commentary: 'Beaten all ends up! Hard seam movement past the outside edge. Dot ball gold for India.',
        wagonZone: 'Keeper',
      },
      {
        ballNumber: '18.1',
        runs: 0,
        isWicket: true,
        isBoundary: false,
        isSix: false,
        batterName: 'Iftikhar Ahmed',
        bowlerName: 'Jasprit Bumrah',
        speedKmh: 142.9,
        line: 'Stumps',
        length: 'Full Searing Yorker',
        shotType: 'Lofted flick caught at Deep Square Leg',
        commentary: 'OUT! WICKET! Bumrah strikes! Slower ball deception, skied to deep square leg and held!',
        wagonZone: 'Deep Square Leg',
      },
      {
        ballNumber: '18.2',
        runs: 4,
        isWicket: false,
        isBoundary: true,
        isSix: false,
        batterName: 'Naseem Shah',
        bowlerName: 'Jasprit Bumrah',
        speedKmh: 144.2,
        line: 'Outside Off',
        length: 'Full Wide',
        shotType: 'Outside Edge through Third Man',
        commentary: 'FOUR! Slashed hard, outside edge flies past diving slip and races to the rope!',
        wagonZone: 'Third Man',
      },
    ],
    wormData: [
      { over: 0, teamA: 0, teamB: 0 },
      { over: 4, teamA: 26, teamB: 28 },
      { over: 8, teamA: 45, teamB: 50 },
      { over: 12, teamA: 68, teamB: 78 },
      { over: 16, teamA: 88, teamB: 104 },
      { over: 18, teamA: 98, teamB: 114 },
      { over: 20, teamA: 113, teamB: 119 },
    ],
    momentumData: [
      { over: 6, winProbA: 65, momentum: 'Pakistan cruise in early powerplay' },
      { over: 12, winProbA: 72, momentum: 'Rizwan anchoring comfortably' },
      { over: 15, winProbA: 48, momentum: 'Bumrah removes Rizwan; tide turns' },
      { over: 18.2, winProbA: 36, momentum: 'Bumrah death overs squeeze dominance' },
    ],
  },
  {
    id: 'eng-aus-ashes',
    title: 'ICC T20 World Cup · The Ashes T20 Shootout',
    tagline: 'Caribbean Power Hitting: Barbados Boundary Blitz',
    stadiumName: 'Kensington Oval',
    city: 'Bridgetown, Barbados',
    teamAId: 'eng',
    teamBId: 'aus',
    teamAScore: '168/6',
    teamAOvers: '18.0',
    teamBScore: '201/7',
    teamBOvers: '20.0',
    target: 202,
    runsNeeded: 34,
    ballsRemaining: 12,
    crr: 9.33,
    rrr: 17.0,
    probA: 32,
    probB: 68,
    partnership: { runs: 32, balls: 18, rpo: 10.66 },
    striker: { name: 'Liam Livingstone', id: 'livingstone', runs: 36, balls: 19, fours: 2, sixes: 3, sr: 189.4 },
    nonStriker: { name: 'Moeen Ali', id: 'moeen', runs: 22, balls: 14, fours: 3, sixes: 1, sr: 157.1 },
    currentBowler: { name: 'Adam Zampa', id: 'zampa', overs: '3.0', maidens: 0, runs: 28, wickets: 2, econ: 9.33, currentSpeed: 92.4 },
    recentDeliveries: [
      {
        ballNumber: '17.4',
        runs: 6,
        isWicket: false,
        isBoundary: true,
        isSix: true,
        batterName: 'Liam Livingstone',
        bowlerName: 'Josh Hazlewood',
        speedKmh: 136.2,
        line: 'Stumps',
        length: 'Slot Ball',
        shotType: 'Monster Pull into Kensington Stand',
        commentary: 'SIX! 104-meter rocket over deep mid-wicket! High into the Caribbean night sky!',
        wagonZone: 'Deep Mid-Wicket',
      },
      {
        ballNumber: '17.5',
        runs: 2,
        isWicket: false,
        isBoundary: false,
        isSix: false,
        batterName: 'Liam Livingstone',
        bowlerName: 'Josh Hazlewood',
        speedKmh: 138.5,
        line: 'Outside Off',
        length: 'Wide Yorker',
        shotType: 'Driven to Deep Cover',
        commentary: 'Squeezed through point, sprinting back for the second run with elite athleticism.',
        wagonZone: 'Deep Cover',
      },
      {
        ballNumber: '18.0',
        runs: 1,
        isWicket: false,
        isBoundary: false,
        isSix: false,
        batterName: 'Liam Livingstone',
        bowlerName: 'Josh Hazlewood',
        speedKmh: 139.1,
        line: 'Pads',
        length: 'Back of Length',
        shotType: 'Tucked behind square',
        commentary: 'Tucked down to fine leg for a single. Keeps strike for the penultimate over.',
        wagonZone: 'Fine Leg',
      },
    ],
    wormData: [
      { over: 0, teamA: 0, teamB: 0 },
      { over: 5, teamA: 48, teamB: 54 },
      { over: 10, teamA: 84, teamB: 98 },
      { over: 15, teamA: 132, teamB: 155 },
      { over: 18, teamA: 168, teamB: 184 },
      { over: 20, teamA: 194, teamB: 201 },
    ],
    momentumData: [
      { over: 5, winProbA: 45, momentum: 'Both teams fired in powerplay' },
      { over: 10, winProbA: 34, momentum: 'Zampa spin control stifles chase' },
      { over: 15, winProbA: 28, momentum: 'Australia pacers apply squeeze' },
      { over: 18, winProbA: 32, momentum: 'Livingstone maximum breathes hope' },
    ],
  },
];

export const BroadcastLiveMatchCentre: React.FC = () => {
  const { setActiveView, launchSimMatch, setActiveModalPlayer, isBroadcastMode } = useGame();
  const [selectedMatchIndex, setSelectedMatchIndex] = useState<number>(0);
  const [activeTab, setActiveTab] = useState<'scorecard' | 'ballbyball' | 'worm' | 'momentum' | 'field'>('scorecard');
  const [selectedBallIndex, setSelectedBallIndex] = useState<number>(0);

  const match = FEATURED_MATCHES[selectedMatchIndex];
  const teamA = TEAMS.find((t) => t.id === match.teamAId) || TEAMS[0];
  const teamB = TEAMS.find((t) => t.id === match.teamBId) || TEAMS[1];

  const handleSelectBall = (idx: number) => {
    setSelectedBallIndex(idx);
    cricketAudio.playBatHit();
  };

  const handleLaunchMatch = () => {
    cricketAudio.playBoundary();
    const stadium = STADIUMS.find((s) => s.name.toLowerCase().includes(match.stadiumName.toLowerCase())) || STADIUMS[0];
    launchSimMatch(teamA.id, teamB.id, stadium.id);
  };

  const activeBall = match.recentDeliveries[selectedBallIndex] || match.recentDeliveries[0];

  return (
    <section className="relative overflow-hidden rounded-3xl border border-slate-800 bg-slate-950 p-6 sm:p-8 shadow-[0_0_50px_rgba(6,182,212,0.12)]">
      {/* Decorative Atmosphere Glow */}
      <div className="absolute top-0 right-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-10 w-80 h-80 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header & Scenario Switcher */}
      <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-800/80 pb-5">
        <div>
          <div className="flex items-center gap-2.5 text-xs font-mono font-bold tracking-wider">
            <span className="flex h-2.5 w-2.5 rounded-full bg-rose-500 animate-ping" />
            <span className="text-rose-400 uppercase">LIVE MATCH BROADCAST CENTRE</span>
            <span aria-hidden="true" className="text-slate-700">·</span>
            <span className="text-slate-400 font-semibold">{match.stadiumName.toUpperCase()}</span>
            <span aria-hidden="true" className="text-slate-700">·</span>
            <span className="text-cyan-400">BALL-BY-BALL TELEMETRY</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight mt-1">
            {match.title}
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            {match.tagline}
          </p>
        </div>

        {/* Match Selectors */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          {FEATURED_MATCHES.map((m, idx) => {
            const isSelected = selectedMatchIndex === idx;
            const tA = TEAMS.find((t) => t.id === m.teamAId);
            const tB = TEAMS.find((t) => t.id === m.teamBId);
            return (
              <button
                key={m.id}
                onClick={() => {
                  setSelectedMatchIndex(idx);
                  setSelectedBallIndex(0);
                  cricketAudio.playBatHit();
                }}
                className={`flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                  isSelected
                    ? 'border border-cyan-400 bg-cyan-500/20 text-cyan-300 shadow-[0_0_15px_rgba(6,182,212,0.3)]'
                    : 'border border-slate-800 bg-slate-900/60 text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                <div className="flex items-center gap-1.5">
                  <img
                    src={getTeamFlagUrl(tA?.shortName || m.teamAId)}
                    alt={tA?.name || 'Team A'}
                    className="h-3.5 w-5 rounded-[2px] object-cover border border-white/20"
                  />
                  <span>{tA?.name || 'Team A'}</span>
                  <span className="text-slate-600">vs</span>
                  <img
                    src={getTeamFlagUrl(tB?.shortName || m.teamBId)}
                    alt={tB?.name || 'Team B'}
                    className="h-3.5 w-5 rounded-[2px] object-cover border border-white/20"
                  />
                  <span>{tB?.name || 'Team B'}</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Broadcast Score Capsule */}
      <div className="relative z-10 mt-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Left Side: Professional 2-Innings Scoreboard */}
        <div
          className={`${
            isBroadcastMode ? 'lg:col-span-12' : 'lg:col-span-8'
          } min-w-0 rounded-2xl border border-slate-800/90 bg-gradient-to-br from-slate-900/90 via-slate-950/95 to-slate-950 p-5 sm:p-6 shadow-xl space-y-6 transition-all duration-300`}
        >
          {/* Top Status & Chase Formula */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800/80 pb-4">
            <div className="flex items-center gap-3">
              <span className="rounded-md bg-emerald-500/20 border border-emerald-500/40 px-2.5 py-1 text-xs font-mono font-bold text-emerald-400 animate-pulse">
                2ND INNINGS · LIVE CHASE
              </span>
              <span className="text-xs text-slate-400 font-mono">
                Target: <strong className="text-white font-bold">{match.target}</strong>
              </span>
            </div>

            <div className="flex items-center gap-4 text-xs font-mono">
              <div className="flex items-center gap-1.5 text-slate-300">
                <span>NEED</span>
                <strong className="text-cyan-400 font-black text-sm">{match.runsNeeded}</strong>
                <span>RUNS IN</span>
                <strong className="text-amber-400 font-black text-sm">{match.ballsRemaining}</strong>
                <span>BALLS</span>
              </div>
              <span className="text-slate-700">|</span>
              <div className="flex items-center gap-1.5 text-slate-400">
                <span>RRR:</span>
                <strong className="text-rose-400 font-black">{match.rrr.toFixed(2)}</strong>
              </div>
            </div>
          </div>

          {/* Side-by-side Score Bars */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Team A (Currently Batting / Chasing) */}
            <div className="rounded-xl border border-cyan-500/40 bg-cyan-950/20 p-4 space-y-3 relative overflow-hidden">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <TeamCrest teamId={teamA.id} size={28} />
                  <CountryFlag countryCode={teamA.id} size="md" />
                  <div>
                    <h3 className="text-base font-black text-white">{teamA.name}</h3>
                    <span className="text-[11px] font-mono font-bold text-cyan-400">BATTING NOW (CHASE)</span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-2xl font-black font-mono text-white tracking-tight">{match.teamAScore}</span>
                  <span className="text-xs font-mono text-slate-400 block">({match.teamAOvers} / 20.0 ov)</span>
                </div>
              </div>

              {/* CRR & Win Chance */}
              <div className="flex items-center justify-between text-xs font-mono border-t border-cyan-500/20 pt-2">
                <span className="text-slate-400">CRR: <strong className="text-white">{match.crr}</strong></span>
                <span className="text-cyan-400 font-bold">{match.probA}% Win Chance</span>
              </div>
            </div>

            {/* Team B (1st Innings Target Setter) */}
            <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <TeamCrest teamId={teamB.id} size={28} />
                  <CountryFlag countryCode={teamB.id} size="md" />
                  <div>
                    <h3 className="text-base font-black text-slate-200">{teamB.name}</h3>
                    <span className="text-[11px] font-mono text-slate-500">1ST INNINGS COMPLETED</span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-2xl font-black font-mono text-slate-300 tracking-tight">{match.teamBScore}</span>
                  <span className="text-xs font-mono text-slate-500 block">(20.0 ov)</span>
                </div>
              </div>

              {/* RR & Win Chance */}
              <div className="flex items-center justify-between text-xs font-mono border-t border-slate-800 pt-2">
                <span className="text-slate-500">Innings RR: <strong className="text-slate-300">10.05</strong></span>
                <span className="text-amber-400 font-bold">{match.probB}% Defend Chance</span>
              </div>
            </div>
          </div>

          {/* Current Batters & Bowler Telemetry Row */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Striker */}
            <div
              onClick={() => {
                const p = teamA.squad.find((pl) => pl.id === match.striker.id);
                if (p) setActiveModalPlayer(p);
              }}
              className="rounded-xl border border-cyan-500/30 bg-slate-900/80 p-3 hover:border-cyan-400 transition-all cursor-pointer group"
            >
              <div className="flex items-center gap-2.5">
                <PlayerCardAvatar
                  playerId={match.striker.id}
                  name={match.striker.name}
                  countryCode={teamA.id}
                  size="sm"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-white truncate">{match.striker.name}</span>
                    <span className="text-[10px] text-cyan-400 font-bold">★</span>
                  </div>
                  <div className="flex items-center justify-between text-xs font-mono mt-0.5">
                    <span className="text-white font-bold">{match.striker.runs}* <span className="text-slate-400 text-[10px]">({match.striker.balls})</span></span>
                    <span className="text-cyan-400 font-bold text-[11px]">SR {match.striker.sr}</span>
                  </div>
                  <div className="flex items-center gap-2 text-[10px] text-slate-500 font-mono mt-0.5">
                    <span>{match.striker.fours}×4</span>
                    <span>·</span>
                    <span>{match.striker.sixes}×6</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Non-Striker */}
            <div
              onClick={() => {
                const p = teamA.squad.find((pl) => pl.id === match.nonStriker.id);
                if (p) setActiveModalPlayer(p);
              }}
              className="rounded-xl border border-slate-800 bg-slate-900/60 p-3 hover:border-slate-700 transition-all cursor-pointer group"
            >
              <div className="flex items-center gap-2.5">
                <PlayerCardAvatar
                  playerId={match.nonStriker.id}
                  name={match.nonStriker.name}
                  countryCode={teamA.id}
                  size="sm"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-slate-300 truncate">{match.nonStriker.name}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs font-mono mt-0.5">
                    <span className="text-slate-200 font-bold">{match.nonStriker.runs}* <span className="text-slate-500 text-[10px]">({match.nonStriker.balls})</span></span>
                    <span className="text-slate-400 font-bold text-[11px]">SR {match.nonStriker.sr}</span>
                  </div>
                  <div className="flex items-center gap-2 text-[10px] text-slate-500 font-mono mt-0.5">
                    <span>{match.nonStriker.fours}×4</span>
                    <span>·</span>
                    <span>{match.nonStriker.sixes}×6</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Current Bowler */}
            <div
              onClick={() => {
                const p = teamB.squad.find((pl) => pl.id === match.currentBowler.id);
                if (p) setActiveModalPlayer(p);
              }}
              className="rounded-xl border border-amber-500/30 bg-slate-900/80 p-3 hover:border-amber-400 transition-all cursor-pointer group"
            >
              <div className="flex items-center gap-2.5">
                <PlayerCardAvatar
                  playerId={match.currentBowler.id}
                  name={match.currentBowler.name}
                  countryCode={teamB.id}
                  size="sm"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-white truncate">{match.currentBowler.name}</span>
                    <span className="text-[10px] text-amber-400 font-mono">⚡ {match.currentBowler.currentSpeed} km/h</span>
                  </div>
                  <div className="flex items-center justify-between text-xs font-mono mt-0.5">
                    <span className="text-amber-400 font-bold">{match.currentBowler.wickets}/{match.currentBowler.runs}</span>
                    <span className="text-slate-400 font-medium text-[11px]">({match.currentBowler.overs} ov)</span>
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono mt-0.5">
                    <span>Econ: {match.currentBowler.econ}</span>
                    <span>Mdns: {match.currentBowler.maidens}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Partnership & Win Prob Gauge Bar */}
          <div className="space-y-2 border-t border-slate-800/80 pt-4">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-slate-400">
                Current Partnership: <strong className="text-white">{match.partnership.runs} runs</strong> off {match.partnership.balls} balls (RR {match.partnership.rpo})
              </span>
              <div className="flex items-center gap-3 tabular-nums">
                <span className="inline-flex items-center gap-1.5 text-cyan-400 font-bold">
                  <img
                    src={getTeamFlagUrl(teamA.shortName)}
                    alt={teamA.name}
                    className="h-3.5 w-5 rounded-[2px] object-cover border border-white/20"
                  />
                  <span>{teamA.name} {match.probA}%</span>
                </span>
                <span className="text-slate-600">vs</span>
                <span className="inline-flex items-center gap-1.5 text-amber-400 font-bold">
                  <img
                    src={getTeamFlagUrl(teamB.shortName)}
                    alt={teamB.name}
                    className="h-3.5 w-5 rounded-[2px] object-cover border border-white/20"
                  />
                  <span>{teamB.name} {match.probB}%</span>
                </span>
              </div>
            </div>

            <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-900 border border-slate-800 flex">
              <div
                className="h-full bg-gradient-to-r from-blue-600 to-cyan-400 transition-all duration-500 shadow-[0_0_12px_rgba(6,182,212,0.8)]"
                style={{ width: `${match.probA}%` }}
              />
              <div
                className="h-full bg-gradient-to-r from-amber-400 to-amber-600 transition-all duration-500 shadow-[0_0_12px_rgba(245,158,11,0.6)]"
                style={{ width: `${match.probB}%` }}
              />
            </div>
          </div>
        </div>

        {/* Right Side: Interactive Action Center & 3D Ground Launcher (Hidden in Broadcast Mode) */}
        {!isBroadcastMode && (
        <div className="lg:col-span-4 rounded-2xl border border-slate-800 bg-gradient-to-b from-slate-900/90 to-slate-950 p-5 flex flex-col justify-between space-y-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono uppercase tracking-wider text-cyan-400 font-bold flex items-center gap-1.5">
                <Radio className="h-3.5 w-3.5 animate-pulse text-cyan-400" />
                <span>BROADCAST COMMAND</span>
              </span>
              <span className="text-xs font-mono text-slate-500">100% REAL SIM</span>
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-950/80 p-3.5 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">Venue Pitch State:</span>
                <span className="text-emerald-400 font-medium">True Bounce · Dew High</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">Boundary Dimensions:</span>
                <span className="text-slate-200 font-mono">Straight 74m · Square 67m</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">Match Atmosphere:</span>
                <span className="text-cyan-300 font-mono">112,000 Capacity Stadium</span>
              </div>
            </div>

            {/* Quick Play vs AI Challenger */}
            <div className="rounded-xl border border-cyan-500/30 bg-cyan-950/20 p-3 space-y-1.5">
              <span className="text-xs font-mono font-bold text-cyan-300 uppercase block">PLAYABLE SCENARIO READY</span>
              <p className="text-xs text-slate-300 leading-relaxed">
                Step into this exact 16-ball chase. Execute strokes or bowl death overs against the AI coach.
              </p>
            </div>
          </div>

          {/* Primary Action Buttons */}
          <div className="space-y-2.5 pt-2">
            <button
              onClick={handleLaunchMatch}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 via-sky-500 to-blue-600 px-4 py-3 text-xs font-black text-slate-950 shadow-[0_0_25px_rgba(6,182,212,0.4)] hover:shadow-[0_0_35px_rgba(6,182,212,0.7)] hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer"
            >
              <Play className="h-4 w-4 fill-current" />
              <span>SIMULATE LIVE IN 3D GROUND →</span>
            </button>

            <button
              onClick={() => setActiveView('you_vs_ai')}
              className="w-full flex items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-900 px-4 py-2.5 text-xs font-bold text-slate-200 hover:text-white hover:border-cyan-400 hover:bg-slate-800 transition-all cursor-pointer"
            >
              <Flame className="h-3.5 w-3.5 text-amber-400" />
              <span>PLAY YOU VS AI CHASE MODE</span>
            </button>
          </div>
        </div>
        )}
      </div>

      {/* Interactive Tabs Header: Scorecard | Ball-by-Ball Timeline | Worm Graph | Momentum | Shot Radar */}
      {!isBroadcastMode && (
      <div className="relative z-10 mt-8 border-t border-slate-800/80 pt-6">
        <div className="flex flex-wrap items-center justify-between gap-4 pb-4">
          <div className="flex items-center gap-2 overflow-x-auto scrollbar-none">
            <button
              onClick={() => setActiveTab('scorecard')}
              className={`flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'scorecard'
                  ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20'
                  : 'bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <BarChart3 className="h-3.5 w-3.5" />
              <span>Full Scorecard</span>
            </button>

            <button
              onClick={() => setActiveTab('ballbyball')}
              className={`flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'ballbyball'
                  ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20'
                  : 'bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Activity className="h-3.5 w-3.5" />
              <span>Ball-by-Ball & Hawkeye</span>
            </button>

            <button
              onClick={() => setActiveTab('worm')}
              className={`flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'worm'
                  ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20'
                  : 'bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <TrendingUp className="h-3.5 w-3.5" />
              <span>Worm Run-Rate Graph</span>
            </button>

            <button
              onClick={() => setActiveTab('momentum')}
              className={`flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'momentum'
                  ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20'
                  : 'bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Zap className="h-3.5 w-3.5" />
              <span>Win Probability Flow</span>
            </button>

            <button
              onClick={() => setActiveTab('field')}
              className={`flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'field'
                  ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20'
                  : 'bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Crosshair className="h-3.5 w-3.5" />
              <span>360° Shot Wagon</span>
            </button>
          </div>

          <span className="text-xs font-mono text-slate-500 hidden sm:inline">
            Click any ball below to inspect Hawkeye trajectory & commentary
          </span>
        </div>

        {/* =========================================================================
            TAB 1: FULL SCORECARD (Batting & Bowling)
            ========================================================================= */}
        {activeTab === 'scorecard' && (
          <div className="space-y-6 animate-in fade-in duration-300">
            {/* 2nd Innings Batting Table */}
            <div className="rounded-2xl border border-slate-800 bg-slate-900/50 overflow-hidden">
              <div className="bg-slate-900/80 px-4 py-3 border-b border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CountryFlag countryCode={teamA.id} size="sm" />
                  <span className="text-xs font-bold text-white uppercase">{teamA.name} 2nd Innings Batting</span>
                </div>
                <span className="text-xs font-mono font-bold text-cyan-400">{match.teamAScore} ({match.teamAOvers} ov)</span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs font-mono">
                  <thead className="bg-slate-950/60 text-slate-400 border-b border-slate-800/80">
                    <tr>
                      <th className="py-2.5 px-4 font-semibold">Batter</th>
                      <th className="py-2.5 px-3 font-semibold">Dismissal</th>
                      <th className="py-2.5 px-3 font-semibold text-right">R</th>
                      <th className="py-2.5 px-3 font-semibold text-right">B</th>
                      <th className="py-2.5 px-3 font-semibold text-right">4s</th>
                      <th className="py-2.5 px-3 font-semibold text-right">6s</th>
                      <th className="py-2.5 px-4 font-semibold text-right">SR</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 text-slate-200">
                    <tr className="hover:bg-slate-800/30">
                      <td className="py-2.5 px-4 font-bold text-white flex items-center gap-2">
                        <PlayerCardAvatar playerId="rohit" name="Rohit Sharma" countryCode={teamA.id} size="sm" />
                        <span>Rohit Sharma (c)</span>
                      </td>
                      <td className="py-2.5 px-3 text-slate-400 font-sans">c Warner b Starc</td>
                      <td className="py-2.5 px-3 font-bold text-right text-white">42</td>
                      <td className="py-2.5 px-3 text-right text-slate-400">24</td>
                      <td className="py-2.5 px-3 text-right">5</td>
                      <td className="py-2.5 px-3 text-right">2</td>
                      <td className="py-2.5 px-4 text-right text-cyan-400 font-bold">175.0</td>
                    </tr>
                    <tr className="hover:bg-slate-800/30">
                      <td className="py-2.5 px-4 font-bold text-white flex items-center gap-2">
                        <PlayerCardAvatar playerId="vkohli" name="Virat Kohli" countryCode={teamA.id} size="sm" />
                        <span>Virat Kohli</span>
                      </td>
                      <td className="py-2.5 px-3 text-slate-400 font-sans">c & b Zampa</td>
                      <td className="py-2.5 px-3 font-bold text-right text-white">24</td>
                      <td className="py-2.5 px-3 text-right text-slate-400">18</td>
                      <td className="py-2.5 px-3 text-right">2</td>
                      <td className="py-2.5 px-3 text-right">1</td>
                      <td className="py-2.5 px-4 text-right text-cyan-400 font-bold">133.3</td>
                    </tr>
                    <tr className="bg-cyan-950/20 hover:bg-cyan-950/30">
                      <td className="py-2.5 px-4 font-bold text-cyan-300 flex items-center gap-2">
                        <PlayerCardAvatar playerId={match.striker.id} name={match.striker.name} countryCode={teamA.id} size="sm" />
                        <span>{match.striker.name} *</span>
                      </td>
                      <td className="py-2.5 px-3 text-emerald-400 font-sans font-bold">Not Out (Striking)</td>
                      <td className="py-2.5 px-3 font-black text-right text-cyan-300">{match.striker.runs}</td>
                      <td className="py-2.5 px-3 text-right text-slate-300">{match.striker.balls}</td>
                      <td className="py-2.5 px-3 text-right">{match.striker.fours}</td>
                      <td className="py-2.5 px-3 text-right">{match.striker.sixes}</td>
                      <td className="py-2.5 px-4 text-right text-cyan-300 font-black">{match.striker.sr}</td>
                    </tr>
                    <tr className="bg-slate-900/60 hover:bg-slate-900/80">
                      <td className="py-2.5 px-4 font-bold text-white flex items-center gap-2">
                        <PlayerCardAvatar playerId={match.nonStriker.id} name={match.nonStriker.name} countryCode={teamA.id} size="sm" />
                        <span>{match.nonStriker.name} *</span>
                      </td>
                      <td className="py-2.5 px-3 text-emerald-400 font-sans font-bold">Not Out</td>
                      <td className="py-2.5 px-3 font-bold text-right text-white">{match.nonStriker.runs}</td>
                      <td className="py-2.5 px-3 text-right text-slate-300">{match.nonStriker.balls}</td>
                      <td className="py-2.5 px-3 text-right">{match.nonStriker.fours}</td>
                      <td className="py-2.5 px-3 text-right">{match.nonStriker.sixes}</td>
                      <td className="py-2.5 px-4 text-right text-cyan-400 font-bold">{match.nonStriker.sr}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* 1st Innings Bowling Figures */}
            <div className="rounded-2xl border border-slate-800 bg-slate-900/50 overflow-hidden">
              <div className="bg-slate-900/80 px-4 py-3 border-b border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CountryFlag countryCode={teamB.id} size="sm" />
                  <span className="text-xs font-bold text-white uppercase">{teamB.name} Bowling Figures</span>
                </div>
                <span className="text-xs font-mono text-slate-400">Target Defended So Far</span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs font-mono">
                  <thead className="bg-slate-950/60 text-slate-400 border-b border-slate-800/80">
                    <tr>
                      <th className="py-2.5 px-4 font-semibold">Bowler</th>
                      <th className="py-2.5 px-3 font-semibold text-right">O</th>
                      <th className="py-2.5 px-3 font-semibold text-right">M</th>
                      <th className="py-2.5 px-3 font-semibold text-right">R</th>
                      <th className="py-2.5 px-3 font-semibold text-right">W</th>
                      <th className="py-2.5 px-3 font-semibold text-right">Econ</th>
                      <th className="py-2.5 px-4 font-semibold text-right">Dots</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 text-slate-200">
                    <tr className="bg-amber-950/20 hover:bg-amber-950/30">
                      <td className="py-2.5 px-4 font-bold text-amber-300 flex items-center gap-2">
                        <PlayerCardAvatar playerId={match.currentBowler.id} name={match.currentBowler.name} countryCode={teamB.id} size="sm" />
                        <span>{match.currentBowler.name} (Active)</span>
                      </td>
                      <td className="py-2.5 px-3 font-bold text-right text-white">{match.currentBowler.overs}</td>
                      <td className="py-2.5 px-3 text-right text-slate-400">{match.currentBowler.maidens}</td>
                      <td className="py-2.5 px-3 text-right text-slate-200">{match.currentBowler.runs}</td>
                      <td className="py-2.5 px-3 font-black text-right text-amber-300">{match.currentBowler.wickets}</td>
                      <td className="py-2.5 px-3 text-right text-amber-300 font-bold">{match.currentBowler.econ}</td>
                      <td className="py-2.5 px-4 text-right text-slate-400">9</td>
                    </tr>
                    <tr className="hover:bg-slate-800/30">
                      <td className="py-2.5 px-4 font-bold text-white flex items-center gap-2">
                        <PlayerCardAvatar playerId="cummins" name="Pat Cummins" countryCode={teamB.id} size="sm" />
                        <span>Pat Cummins</span>
                      </td>
                      <td className="py-2.5 px-3 font-bold text-right text-white">4.0</td>
                      <td className="py-2.5 px-3 text-right text-slate-400">0</td>
                      <td className="py-2.5 px-3 text-right text-slate-200">38</td>
                      <td className="py-2.5 px-3 font-black text-right text-amber-300">1</td>
                      <td className="py-2.5 px-3 text-right text-slate-400 font-bold">9.50</td>
                      <td className="py-2.5 px-4 text-right text-slate-400">11</td>
                    </tr>
                    <tr className="hover:bg-slate-800/30">
                      <td className="py-2.5 px-4 font-bold text-white flex items-center gap-2">
                        <PlayerCardAvatar playerId="zampa" name="Adam Zampa" countryCode={teamB.id} size="sm" />
                        <span>Adam Zampa</span>
                      </td>
                      <td className="py-2.5 px-3 font-bold text-right text-white">4.0</td>
                      <td className="py-2.5 px-3 text-right text-slate-400">0</td>
                      <td className="py-2.5 px-3 text-right text-slate-200">26</td>
                      <td className="py-2.5 px-3 font-black text-right text-amber-300">1</td>
                      <td className="py-2.5 px-3 text-right text-emerald-400 font-bold">6.50</td>
                      <td className="py-2.5 px-4 text-right text-slate-400">14</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* =========================================================================
            TAB 2: BALL-BY-BALL TIMELINE & HAWKEYE TELEMETRY
            ========================================================================= */}
        {activeTab === 'ballbyball' && (
          <div className="space-y-6 animate-in fade-in duration-300">
            {/* Delivery Ticker Pill Buttons */}
            <div className="flex items-center gap-3 overflow-x-auto pb-2 scrollbar-none">
              {match.recentDeliveries.map((del, idx) => {
                const isSelected = selectedBallIndex === idx;
                let bgBadge = 'bg-slate-900 border-slate-800 text-slate-200';
                if (del.isSix) bgBadge = 'bg-purple-950 border-purple-500/50 text-purple-300 font-black';
                else if (del.isBoundary) bgBadge = 'bg-cyan-950 border-cyan-500/50 text-cyan-300 font-black';
                else if (del.isWicket) bgBadge = 'bg-rose-950 border-rose-500/50 text-rose-300 font-black';

                return (
                  <button
                    key={idx}
                    onClick={() => handleSelectBall(idx)}
                    className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-mono border transition-all cursor-pointer ${bgBadge} ${
                      isSelected ? 'ring-2 ring-cyan-400 scale-105 shadow-md shadow-cyan-400/20' : 'hover:scale-102'
                    }`}
                  >
                    <span className="font-bold text-slate-400">{del.ballNumber}</span>
                    <span className="h-3 w-[1px] bg-slate-700" />
                    <span className="font-black text-sm">
                      {del.isWicket ? 'W' : del.runs === 6 ? '6' : del.runs === 4 ? '4' : del.runs}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Selected Ball Hawkeye Card */}
            <div className="rounded-2xl border border-cyan-500/30 bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 p-6 shadow-xl grid grid-cols-1 md:grid-cols-12 gap-6">
              <div className="md:col-span-8 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="rounded-md bg-cyan-500/20 border border-cyan-400/40 px-2.5 py-0.5 text-xs font-mono font-bold text-cyan-300">
                      BALL {activeBall.ballNumber} TELEMETRY
                    </span>
                    <span className="text-xs font-mono text-slate-400">
                      {activeBall.bowlerName} to {activeBall.batterName}
                    </span>
                  </div>
                  <span className="text-sm font-black font-mono text-cyan-400">
                    {activeBall.isWicket ? 'WICKET' : `${activeBall.runs} RUN${activeBall.runs === 1 ? '' : 'S'}`}
                  </span>
                </div>

                <p className="text-sm text-white font-medium leading-relaxed bg-slate-950/80 p-3.5 rounded-xl border border-slate-800">
                  "{activeBall.commentary}"
                </p>

                {/* Hawkeye Specs Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
                  <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-3 text-center">
                    <span className="text-[10px] text-slate-500 block">DELIVERY SPEED</span>
                    <span className="font-black text-cyan-300 text-sm">{activeBall.speedKmh} km/h</span>
                  </div>
                  <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-3 text-center">
                    <span className="text-[10px] text-slate-500 block">PITCH LENGTH</span>
                    <span className="font-bold text-white text-xs">{activeBall.length}</span>
                  </div>
                  <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-3 text-center">
                    <span className="text-[10px] text-slate-500 block">LINE</span>
                    <span className="font-bold text-white text-xs">{activeBall.line}</span>
                  </div>
                  <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-3 text-center">
                    <span className="text-[10px] text-slate-500 block">WAGON ZONE</span>
                    <span className="font-bold text-amber-300 text-xs">{activeBall.wagonZone}</span>
                  </div>
                </div>
              </div>

              {/* Pitch Visual Mini-Canvas */}
              <div className="md:col-span-4 rounded-xl border border-slate-800 bg-slate-950 p-4 flex flex-col justify-between text-center">
                <span className="text-[11px] font-mono font-bold text-slate-400">22-YARD IMPACT TRAJECTORY</span>
                <div className="relative my-3 h-28 w-full rounded-lg bg-gradient-to-b from-[#2a3c24] to-[#1d2b19] border border-emerald-900/50 flex items-center justify-center overflow-hidden">
                  {/* Pitch creases */}
                  <div className="absolute top-2 left-4 right-4 h-0.5 bg-white/40" />
                  <div className="absolute bottom-2 left-4 right-4 h-0.5 bg-white/40" />
                  {/* Stumps */}
                  <div className="absolute top-1 left-1/2 -translate-x-1/2 flex gap-1">
                    <div className="h-2 w-0.5 bg-amber-200" />
                    <div className="h-2 w-0.5 bg-amber-200" />
                    <div className="h-2 w-0.5 bg-amber-200" />
                  </div>
                  {/* Ball impact point */}
                  <div className="relative flex flex-col items-center">
                    <div className="h-4 w-4 rounded-full bg-rose-500 shadow-[0_0_15px_rgba(244,63,94,0.9)] animate-ping" />
                    <span className="text-[10px] font-mono font-bold text-white mt-1">Pitch Point</span>
                  </div>
                </div>
                <span className="text-[10px] font-mono text-emerald-400">Shot: {activeBall.shotType}</span>
              </div>
            </div>
          </div>
        )}

        {/* =========================================================================
            TAB 3: WORM RUN-RATE GRAPH
            ========================================================================= */}
        {activeTab === 'worm' && (
          <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-5 space-y-4 animate-in fade-in duration-300">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs font-mono">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1.5">
                  <div className="h-3 w-3 rounded-full bg-cyan-400" />
                  <span className="text-white font-bold">{teamA.name} ({match.teamAScore})</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="h-3 w-3 rounded-full bg-amber-400" />
                  <span className="text-slate-300">{teamB.name} ({match.teamBScore})</span>
                </div>
              </div>
              <span className="text-slate-500">Cumulative Runs Progression over 20 Overs</span>
            </div>

            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={match.wormData} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="over" stroke="#64748b" tickFormatter={(v) => `Ov ${v}`} fontSize={11} />
                  <YAxis stroke="#64748b" fontSize={11} domain={[0, 220]} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#020617', borderColor: '#334155', borderRadius: '12px', fontSize: '12px' }}
                    labelFormatter={(v) => `End of Over ${v}`}
                  />
                  <Line type="monotone" dataKey="teamA" name={teamA.name} stroke="#06b6d4" strokeWidth={3} dot={{ r: 3, fill: '#06b6d4' }} activeDot={{ r: 6 }} />
                  <Line type="monotone" dataKey="teamB" name={teamB.name} stroke="#f59e0b" strokeWidth={2} strokeDasharray="4 4" dot={{ r: 2, fill: '#f59e0b' }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* =========================================================================
            TAB 4: WIN PROBABILITY MOMENTUM FLOW
            ========================================================================= */}
        {activeTab === 'momentum' && (
          <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-5 space-y-4 animate-in fade-in duration-300">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs font-mono">
              <div className="flex items-center gap-2">
                <span className="text-cyan-400 font-bold">{teamA.name} Live Win Probability: {match.probA}%</span>
              </div>
              <span className="text-slate-500">Calculated by Cricket AI Intelligence Engine</span>
            </div>

            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={match.momentumData} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="winProbGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.6} />
                      <stop offset="95%" stopColor="#06b6d4" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="over" stroke="#64748b" tickFormatter={(v) => `Ov ${v}`} fontSize={11} />
                  <YAxis stroke="#64748b" fontSize={11} domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#020617', borderColor: '#334155', borderRadius: '12px', fontSize: '12px' }}
                    formatter={(v: any) => [`${v}% Win Probability`, teamA.name]}
                  />
                  <Area type="monotone" dataKey="winProbA" stroke="#06b6d4" strokeWidth={3} fillOpacity={1} fill="url(#winProbGrad)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* =========================================================================
            TAB 5: 360° SHOT WAGON WHEEL RADAR
            ========================================================================= */}
        {activeTab === 'field' && (
          <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6 animate-in fade-in duration-300">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
              <div className="md:col-span-6 flex flex-col items-center justify-center">
                {/* Visual Field Wheel */}
                <div className="relative h-60 w-60 rounded-full border-2 border-dashed border-emerald-500/40 bg-emerald-950/20 flex items-center justify-center shadow-[0_0_30px_rgba(16,185,129,0.15)]">
                  {/* Pitch in Center */}
                  <div className="h-14 w-4 rounded bg-amber-700/60 border border-amber-500/40" />

                  {/* Radiating Quadrant Labels */}
                  <span className="absolute top-2 text-[10px] font-mono font-bold text-cyan-300">STRAIGHT (22%)</span>
                  <span className="absolute bottom-2 text-[10px] font-mono font-bold text-purple-300">FINE LEG (32%)</span>
                  <span className="absolute left-2 text-[10px] font-mono font-bold text-emerald-300">COVER (24%)</span>
                  <span className="absolute right-2 text-[10px] font-mono font-bold text-amber-300">MID-WICKET (22%)</span>

                  {/* Shot Lines */}
                  <div className="absolute inset-0 pointer-events-none">
                    <svg viewBox="0 0 240 240" className="w-full h-full">
                      {/* Shot to fine leg */}
                      <line x1="120" y1="120" x2="190" y2="200" stroke="#c084fc" strokeWidth="2.5" strokeDasharray="3 3" />
                      <circle cx="190" cy="200" r="4" fill="#c084fc" />
                      {/* Shot to cover */}
                      <line x1="120" y1="120" x2="40" y2="100" stroke="#34d399" strokeWidth="2.5" />
                      <circle cx="40" cy="100" r="4" fill="#34d399" />
                      {/* Shot to third man */}
                      <line x1="120" y1="120" x2="60" y2="190" stroke="#06b6d4" strokeWidth="2.5" />
                      <circle cx="60" cy="190" r="4" fill="#06b6d4" />
                    </svg>
                  </div>
                </div>
              </div>

              <div className="md:col-span-6 space-y-3">
                <span className="text-xs font-mono font-bold text-cyan-400 uppercase">
                  {match.striker.name} · SCORING MAP
                </span>
                <h4 className="text-lg font-bold text-white">
                  360-Degree Elite Scoring Distribution
                </h4>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Notice the high density of runs executed behind square leg and third man (54% of total boundaries). To counter this, bowlers require wide yorkers outside the 5th stump channel.
                </p>

                <div className="grid grid-cols-2 gap-2 text-xs font-mono pt-2">
                  <div className="rounded-lg border border-slate-800 bg-slate-950 p-2">
                    <span className="text-slate-500 block text-[10px]">Behind Square SR</span>
                    <span className="font-bold text-cyan-300 text-sm">215.8</span>
                  </div>
                  <div className="rounded-lg border border-slate-800 bg-slate-950 p-2">
                    <span className="text-slate-500 block text-[10px]">V-Arc Drive SR</span>
                    <span className="font-bold text-emerald-300 text-sm">168.2</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
      )}
    </section>
  );
};
