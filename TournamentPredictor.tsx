import React, { useState, useEffect, useRef } from 'react';
import { useGame } from '../../context/GameContext';
import { TEAMS } from '../../data/cricketData';
import { Team } from '../../types/cricket';
import { CountryFlag, TeamCrest, PlayerCardAvatar } from '../common/CricketIdentity';
import { Trophy3DViewer } from './Trophy3DViewer';
import { WhatIfModeExplorer } from './WhatIfModeExplorer';
import { cricketAudio } from '../../utils/audioSystem';
import {
  Trophy,
  Sparkles,
  Shield,
  RotateCcw,
  CheckCircle2,
  XCircle,
  Play,
  Award,
  TrendingUp,
  FastForward,
  ChevronRight,
  Flame,
  Star,
  Swords,
  Activity,
  Layers,
  Zap,
  Info,
} from 'lucide-react';

interface GroupMatch {
  id: string;
  group: 'Group 1' | 'Group 2';
  teamAId: string;
  teamBId: string;
  venue: string;
  winnerId: string | null;
  probA: number; // e.g. 58%
  probB: number; // e.g. 42%
}

interface TeamStanding {
  team: Team;
  played: number;
  won: number;
  lost: number;
  points: number;
  nrr: number;
  qualProb: number;
  championProb: number;
  momentum: 'high' | 'stable' | 'low';
}

export const TournamentPredictor: React.FC = () => {
  const { addXp } = useGame();

  // Initial group matches with realistic probability splits
  const initialMatches: GroupMatch[] = [
    // Group 1
    { id: 'm1', group: 'Group 1', teamAId: 'ind', teamBId: 'aus', venue: 'Barbados', winnerId: 'ind', probA: 55, probB: 45 },
    { id: 'm2', group: 'Group 1', teamAId: 'pk', teamBId: 'afg', venue: 'Guyana', winnerId: 'pk', probA: 52, probB: 48 },
    { id: 'm3', group: 'Group 1', teamAId: 'ind', teamBId: 'pk', venue: 'New York', winnerId: 'ind', probA: 64, probB: 36 },
    { id: 'm4', group: 'Group 1', teamAId: 'aus', teamBId: 'afg', venue: 'St Lucia', winnerId: 'aus', probA: 60, probB: 40 },
    { id: 'm5', group: 'Group 1', teamAId: 'ind', teamBId: 'afg', venue: 'Trinidad', winnerId: 'ind', probA: 72, probB: 28 },
    { id: 'm6', group: 'Group 1', teamAId: 'aus', teamBId: 'pk', venue: 'Antigua', winnerId: 'aus', probA: 58, probB: 42 },

    // Group 2
    { id: 'm7', group: 'Group 2', teamAId: 'sa', teamBId: 'eng', venue: 'St Vincent', winnerId: 'sa', probA: 52, probB: 48 },
    { id: 'm8', group: 'Group 2', teamAId: 'nz', teamBId: 'wi', venue: 'Tarouba', winnerId: 'wi', probA: 46, probB: 54 },
    { id: 'm9', group: 'Group 2', teamAId: 'sa', teamBId: 'nz', venue: 'Guyana', winnerId: 'sa', probA: 58, probB: 42 },
    { id: 'm10', group: 'Group 2', teamAId: 'eng', teamBId: 'wi', venue: 'Barbados', winnerId: 'eng', probA: 53, probB: 47 },
    { id: 'm11', group: 'Group 2', teamAId: 'sa', teamBId: 'wi', venue: 'St Lucia', winnerId: 'sa', probA: 55, probB: 45 },
    { id: 'm12', group: 'Group 2', teamAId: 'eng', teamBId: 'nz', venue: 'Antigua', winnerId: 'eng', probA: 54, probB: 46 },
  ];

  const [matches, setMatches] = useState<GroupMatch[]>(initialMatches);
  const [activeTab, setActiveTab] = useState<'hub' | 'bracket' | 'table' | 'ceremony'>('hub');
  const [hoveredTeamId, setHoveredTeamId] = useState<string | null>('ind');
  const [activeMatchForLiveBar, setActiveMatchForLiveBar] = useState<GroupMatch>(initialMatches[0]);

  // Simulation states
  const [isSimulatingAll, setIsSimulatingAll] = useState<boolean>(false);
  const [isSimulatingNext, setIsSimulatingNext] = useState<boolean>(false);
  const [nextMatchSimModal, setNextMatchSimModal] = useState<{
    match: GroupMatch;
    step: 'toss' | 'moment' | 'score' | 'winner';
    teamA: Team;
    teamB: Team;
    winner: Team;
    scoreSummary: string;
  } | null>(null);

  // What-If Scenario Mode
  const [whatIfActive, setWhatIfActive] = useState<boolean>(false);
  const [whatIfDiffLog, setWhatIfDiffLog] = useState<string | null>(null);

  // Knockout stage overrides
  const [semi1Winner, setSemi1Winner] = useState<string | null>(null);
  const [semi2Winner, setSemi2Winner] = useState<string | null>(null);
  const [championId, setChampionId] = useState<string | null>('ind');

  // Compute standings & live qualification odds
  const computeStandings = (groupId: 'Group 1' | 'Group 2'): TeamStanding[] => {
    const groupMatches = matches.filter((m) => m.group === groupId);
    const teamIds = groupId === 'Group 1' ? ['ind', 'aus', 'pk', 'afg'] : ['sa', 'eng', 'nz', 'wi'];

    const standingsMap: Record<string, TeamStanding> = {};

    teamIds.forEach((tId) => {
      const teamObj = TEAMS.find((t) => t.id === tId) || TEAMS[0];
      const momentum: 'high' | 'stable' | 'low' =
        teamObj.ratings.overall > 90 ? 'high' : teamObj.ratings.overall > 85 ? 'stable' : 'low';

      standingsMap[tId] = {
        team: teamObj,
        played: 0,
        won: 0,
        lost: 0,
        points: 0,
        nrr: 0,
        qualProb: 50,
        championProb: teamObj.ratings.overall > 92 ? 26 : teamObj.ratings.overall > 88 ? 16 : 8,
        momentum,
      };
    });

    groupMatches.forEach((m) => {
      if (!m.winnerId) return;
      const loserId = m.winnerId === m.teamAId ? m.teamBId : m.teamAId;

      if (standingsMap[m.winnerId]) {
        standingsMap[m.winnerId].played += 1;
        standingsMap[m.winnerId].won += 1;
        standingsMap[m.winnerId].points += 2;
        standingsMap[m.winnerId].nrr += 0.52;
      }

      if (standingsMap[loserId]) {
        standingsMap[loserId].played += 1;
        standingsMap[loserId].lost += 1;
        standingsMap[loserId].nrr -= 0.52;
      }
    });

    return Object.values(standingsMap)
      .map((s) => {
        let prob = 18;
        if (s.points >= 6) prob = 98;
        else if (s.points === 4) prob = 76;
        else if (s.points === 2) prob = 30;
        else if (s.played === 3) prob = 4;

        // Champion probability weighted by rating and points
        const champ = Math.min(42, Math.max(3, Math.round((s.team.ratings.overall - 75) * 1.5 + s.points * 2.5)));

        return {
          ...s,
          nrr: Number(s.nrr.toFixed(3)),
          qualProb: prob,
          championProb: champ,
        };
      })
      .sort((a, b) => b.points - a.points || b.nrr - a.nrr);
  };

  const group1Standings = computeStandings('Group 1');
  const group2Standings = computeStandings('Group 2');

  // Semifinal seeds derived from current standings
  const g1Seed1 = group1Standings[0]?.team || TEAMS[0];
  const g1Seed2 = group1Standings[1]?.team || TEAMS[1];
  const g2Seed1 = group2Standings[0]?.team || TEAMS[2];
  const g2Seed2 = group2Standings[1]?.team || TEAMS[3];

  // Semi 1: G1 #1 vs G2 #2
  // Semi 2: G2 #1 vs G1 #2
  const actualSemi1WinnerId = semi1Winner || g1Seed1.id;
  const actualSemi2WinnerId = semi2Winner || g2Seed1.id;

  const actualFinalist1 = TEAMS.find((t) => t.id === actualSemi1WinnerId) || g1Seed1;
  const actualFinalist2 = TEAMS.find((t) => t.id === actualSemi2WinnerId) || g2Seed1;

  const actualChampion = TEAMS.find((t) => t.id === championId) || actualFinalist1;

  // Predict individual match winner with instant recalculation
  const handlePredictWinner = (matchId: string, winnerId: string) => {
    setMatches((prev) =>
      prev.map((m) => {
        if (m.id === matchId) {
          return { ...m, winnerId };
        }
        return m;
      })
    );

    // Update active live bar match
    const found = matches.find((m) => m.id === matchId);
    if (found) {
      setActiveMatchForLiveBar({ ...found, winnerId });
    }

    if (whatIfActive) {
      setWhatIfDiffLog(`Scenario Adjusted: Recalculated tournament seeds, NRR, and semifinal matrix.`);
    }

    cricketAudio.playBatHit();
  };

  // Simulate Next Match Step-by-Step
  const handleSimulateNextMatch = () => {
    const unplayedOrNext = matches.find((m) => !m.winnerId) || matches[0];
    const teamA = TEAMS.find((t) => t.id === unplayedOrNext.teamAId) || TEAMS[0];
    const teamB = TEAMS.find((t) => t.id === unplayedOrNext.teamBId) || TEAMS[1];
    const winner = teamA.ratings.overall >= teamB.ratings.overall ? teamA : teamB;

    setIsSimulatingNext(true);
    cricketAudio.playDrsTone();

    setNextMatchSimModal({
      match: unplayedOrNext,
      step: 'toss',
      teamA,
      teamB,
      winner,
      scoreSummary: `${teamA.name} 182/6 vs ${teamB.name} 174/8 (${winner.name} won by 8 runs)`,
    });

    // Animate through Toss -> Key Moment -> Score -> Winner
    setTimeout(() => {
      setNextMatchSimModal((prev) => prev && { ...prev, step: 'moment' });
      cricketAudio.playBatHit();
    }, 700);

    setTimeout(() => {
      setNextMatchSimModal((prev) => prev && { ...prev, step: 'score' });
      cricketAudio.playBoundary();
    }, 1400);

    setTimeout(() => {
      setNextMatchSimModal((prev) => prev && { ...prev, step: 'winner' });
      cricketAudio.playVictory();
      handlePredictWinner(unplayedOrNext.id, winner.id);
    }, 2100);

    setTimeout(() => {
      setNextMatchSimModal(null);
      setIsSimulatingNext(false);
      addXp(150, `Simulated Match: ${teamA.name} vs ${teamB.name}`);
    }, 3200);
  };

  // Simulate Entire Tournament rapidly
  const handleSimulateEntireTournament = () => {
    if (isSimulatingAll) return;
    setIsSimulatingAll(true);
    cricketAudio.playDrsTone();

    let step = 0;
    const interval = setInterval(() => {
      if (step < initialMatches.length) {
        const m = initialMatches[step];
        const teamA = TEAMS.find((t) => t.id === m.teamAId);
        const teamB = TEAMS.find((t) => t.id === m.teamBId);
        const picked = (teamA?.ratings.overall || 85) >= (teamB?.ratings.overall || 85) ? m.teamAId : m.teamBId;

        setMatches((prev) => prev.map((item, idx) => (idx === step ? { ...item, winnerId: picked } : item)));
        cricketAudio.playBatHit();
        step++;
      } else {
        clearInterval(interval);
        setIsSimulatingAll(false);
        setSemi1Winner(g1Seed1.id);
        setSemi2Winner(g2Seed1.id);
        setChampionId(g1Seed1.id);
        setActiveTab('ceremony');
        cricketAudio.playVictory();
        addXp(500, 'Entire World Cup Simulated & Trophy Awarded!');
      }
    }, 140);
  };

  const handleResetPredictions = () => {
    setMatches(initialMatches);
    setSemi1Winner(null);
    setSemi2Winner(null);
    setChampionId('ind');
    setWhatIfDiffLog(null);
    cricketAudio.playBatHit();
  };

  const hoveredTeam = TEAMS.find((t) => t.id === hoveredTeamId) || TEAMS[0];
  const allStandingsCombined = [...group1Standings, ...group2Standings].sort((a, b) => b.championProb - a.championProb);

  return (
    <div className="relative max-w-7xl mx-auto space-y-8 pb-16 font-sans">
      {/* Stadium Atmospheric Backdrop with Floodlights & Moving Mist */}
      <div className="absolute inset-0 pointer-events-none -z-10 overflow-hidden">
        <div className="absolute top-0 left-1/4 w-[600px] h-[400px] bg-gradient-to-b from-sky-500/10 via-transparent to-transparent blur-3xl opacity-60" />
        <div className="absolute top-0 right-1/4 w-[600px] h-[400px] bg-gradient-to-b from-amber-500/10 via-transparent to-transparent blur-3xl opacity-60" />
      </div>

      {/* Header & Command Center Bar */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-amber-400 font-bold">
            <Trophy className="h-4 w-4" />
            <span>LIVE TOURNAMENT COMMAND CENTER</span>
            <span aria-hidden="true">·</span>
            <span className="text-sky-400">2026 WORLD CUP ENGINE</span>
          </div>
          <h1 className="text-2xl sm:text-4xl font-black text-white tracking-tight mt-1">
            Tournament Prediction & Simulation Hub
          </h1>
          <p className="text-xs text-slate-400 mt-1 max-w-2xl">
            Command outcomes, inspect real-time qualification probabilities, test alternate reality matches, and watch the bracket evolve dynamically.
          </p>
        </div>

        {/* Global Action CTAs */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => setWhatIfActive(!whatIfActive)}
            className={`flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-bold transition-all cursor-pointer ${
              whatIfActive
                ? 'border-purple-500 bg-purple-500/20 text-purple-300 shadow-md shadow-purple-500/30'
                : 'border-slate-800 bg-slate-900 text-slate-400 hover:text-white'
            }`}
          >
            <Zap className="h-3.5 w-3.5 text-purple-400" />
            <span>WHAT-IF? MODE</span>
          </button>

          <button
            onClick={handleSimulateNextMatch}
            disabled={isSimulatingNext}
            className="flex items-center gap-1.5 rounded-xl border border-sky-500/40 bg-sky-500/10 px-3.5 py-2 text-xs font-bold text-sky-400 hover:bg-sky-500/20 transition-all cursor-pointer disabled:opacity-50"
          >
            <Play className="h-3.5 w-3.5 fill-current" />
            <span>SIMULATE NEXT MATCH</span>
          </button>

          <button
            onClick={handleSimulateEntireTournament}
            disabled={isSimulatingAll}
            className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-400 px-4 py-2 text-xs font-black text-slate-950 hover:from-amber-400 hover:to-amber-300 transition-all shadow-lg shadow-amber-500/25 cursor-pointer disabled:opacity-50"
          >
            <FastForward className="h-4 w-4" />
            <span>{isSimulatingAll ? 'SIMULATING...' : 'SIMULATE ENTIRE TOURNAMENT'}</span>
          </button>

          <button
            onClick={handleResetPredictions}
            className="flex items-center gap-1.5 rounded-xl border border-slate-800 bg-slate-900 px-3 py-2 text-xs font-semibold text-slate-400 hover:text-white transition-colors cursor-pointer"
            title="Reset Predictions to Initial State"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span>RESET</span>
          </button>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex flex-wrap items-center gap-1.5 rounded-2xl border border-slate-800 bg-slate-900/90 p-1.5 text-xs font-semibold">
        {[
          { id: 'hub', label: '1. Animated Tournament Hub & Trophy' },
          { id: 'bracket', label: '2. Dynamic Knockout Bracket' },
          { id: 'table', label: '3. Points Table & Standings' },
          { id: 'ceremony', label: '4. Podium Ceremony & Accolades' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as unknown as typeof activeTab)}
            className={`rounded-xl px-4 py-2 transition-all cursor-pointer ${
              activeTab === tab.id
                ? 'bg-amber-500 text-slate-950 font-bold shadow-lg shadow-amber-500/20 scale-102'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* LIVE PREDICTION SPLIT BAR */}
      <div className="rounded-2xl border border-slate-800 bg-slate-950/80 p-4 space-y-2 backdrop-blur-md">
        <div className="flex items-center justify-between text-xs font-mono">
          <div className="flex items-center gap-2">
            <CountryFlag countryCode={activeMatchForLiveBar.teamAId} size="sm" />
            <span className="font-bold text-white uppercase">
              {TEAMS.find((t) => t.id === activeMatchForLiveBar.teamAId)?.name}
            </span>
            <span className="text-sky-400 font-bold">{activeMatchForLiveBar.probA}%</span>
          </div>

          <span className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">
            MATCHUP WIN PROBABILITY (LIVE DELTA)
          </span>

          <div className="flex items-center gap-2">
            <span className="text-amber-400 font-bold">{activeMatchForLiveBar.probB}%</span>
            <span className="font-bold text-white uppercase">
              {TEAMS.find((t) => t.id === activeMatchForLiveBar.teamBId)?.name}
            </span>
            <CountryFlag countryCode={activeMatchForLiveBar.teamBId} size="sm" />
          </div>
        </div>

        {/* Animated Percentage Split Bar */}
        <div className="relative h-3 w-full rounded-full bg-slate-800 overflow-hidden flex shadow-inner">
          <div
            className="h-full bg-gradient-to-r from-sky-500 to-sky-400 transition-all duration-500"
            style={{ width: `${activeMatchForLiveBar.probA}%` }}
          />
          <div
            className="h-full bg-gradient-to-r from-amber-400 to-amber-500 transition-all duration-500"
            style={{ width: `${activeMatchForLiveBar.probB}%` }}
          />
        </div>
      </div>

      {/* WHAT IF? SCENARIO LAB EXPLORER */}
      {whatIfActive && (
        <div className="animate-in fade-in zoom-in-95 duration-200">
          <WhatIfModeExplorer
            onApplyScenario={handlePredictWinner}
            onResetScenarios={handleResetPredictions}
            currentMatchesCount={matches.length}
          />
        </div>
      )}

      {/* --- TAB 1: LARGE ANIMATED TOURNAMENT HUB & TROPHY CENTERPIECE --- */}
      {activeTab === 'hub' && (
        <div className="space-y-8">
          {/* Main Stage Grid: Rotating 3D Trophy + Interactive Glowing Team Cards */}
          <div className="relative rounded-3xl border border-slate-800 bg-gradient-to-b from-slate-900/90 to-slate-950/95 p-6 sm:p-10 shadow-2xl backdrop-blur-xl overflow-hidden">
            {/* Center 3D Rotating Trophy Spotlight */}
            <div className="mb-6">
              <Trophy3DViewer
                championName={actualChampion.name}
                championCountryCode={actualChampion.id}
                winProbability={allStandingsCombined.find((s) => s.team.id === actualChampion.id)?.championProb || 68}
              />
            </div>

            {/* Glowing Team Cards Grid (All 8 Teams) */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {TEAMS.map((team) => {
                const isHovered = hoveredTeamId === team.id;
                const standing = allStandingsCombined.find((s) => s.team.id === team.id);
                const momentumIcon = standing?.momentum === 'high' ? '🔥🔥🔥' : standing?.momentum === 'stable' ? '🔥🔥' : '🔥';

                return (
                  <div
                    key={team.id}
                    onMouseEnter={() => setHoveredTeamId(team.id)}
                    onClick={() => setHoveredTeamId(team.id)}
                    className={`group relative rounded-2xl border p-4 transition-all duration-200 cursor-pointer ${
                      isHovered
                        ? 'border-amber-400 bg-slate-900 shadow-xl shadow-amber-500/20 scale-103'
                        : 'border-slate-800 bg-slate-950/80 hover:border-slate-700'
                    }`}
                  >
                    {/* Top Team Info */}
                    <div className="flex items-center justify-between mb-2">
                      <CountryFlag countryCode={team.id} size="md" />
                      <span className="text-[11px] font-mono text-amber-400 font-bold">
                        {momentumIcon}
                      </span>
                    </div>

                    <h4 className="text-sm font-bold text-white group-hover:text-amber-300 transition-colors truncate">
                      {team.name}
                    </h4>
                    <p className="text-[11px] font-mono text-slate-400">
                      Overall: <strong className="text-white">{team.ratings.overall}</strong>
                    </p>

                    {/* Progress Bar: Champion Probability */}
                    <div className="mt-3 space-y-1">
                      <div className="flex justify-between text-[10px] font-mono text-slate-400">
                        <span>Win Prob:</span>
                        <span className="text-sky-400 font-bold">{standing?.championProb || 12}%</span>
                      </div>
                      <div className="h-1.5 w-full rounded-full bg-slate-800 overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-sky-500 to-amber-400"
                          style={{ width: `${(standing?.championProb || 12) * 2.2}%` }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Hovered Team Detailed Dossier Card */}
            {hoveredTeam && (
              <div className="mt-6 rounded-2xl border border-slate-800 bg-slate-950 p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                <div className="flex items-center gap-4">
                  <PlayerCardAvatar
                    playerId={hoveredTeam.squad[0]?.id || 'sky'}
                    name={hoveredTeam.squad[0]?.name || 'Captain'}
                    countryCode={hoveredTeam.id}
                    jerseyNumber={18}
                    size="lg"
                  />
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-xl font-bold text-white">{hoveredTeam.name} Dossier</h4>
                      <span className="text-xs font-mono text-amber-400 font-bold">RANK #{hoveredTeam.ranking}</span>
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Batting: <strong className="text-white">{hoveredTeam.ratings.batting}</strong> · Bowling:{' '}
                      <strong className="text-white">{hoveredTeam.ratings.bowling}</strong>
                    </p>
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-[11px] font-mono text-slate-400">Recent Form:</span>
                      {hoveredTeam.recentForm.map((f, i) => (
                        <span
                          key={i}
                          className={`flex h-4 w-4 items-center justify-center rounded text-[9px] font-bold ${
                            f === 'W' ? 'bg-emerald-950 text-emerald-400' : 'bg-rose-950 text-rose-400'
                          }`}
                        >
                          {f}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 text-xs font-mono text-right shrink-0">
                  <div className="rounded-xl border border-slate-800 bg-slate-900 p-3">
                    <span className="text-slate-500 block text-[10px]">SEMIFINAL QUALIFICATION</span>
                    <span className="text-base font-bold text-emerald-400">
                      {allStandingsCombined.find((s) => s.team.id === hoveredTeam.id)?.qualProb || 70}%
                    </span>
                  </div>
                  <div className="rounded-xl border border-slate-800 bg-slate-900 p-3">
                    <span className="text-slate-500 block text-[10px]">CHAMPIONSHIP ODDS</span>
                    <span className="text-base font-bold text-amber-400">
                      {allStandingsCombined.find((s) => s.team.id === hoveredTeam.id)?.championProb || 18}%
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Quick Group Fixture Match Selector for Prediction */}
          <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Swords className="h-4 w-4 text-rose-400" />
                <span>Instant Group Match Predictor (Tap Winner to Recalculate Hub)</span>
              </h3>
              <span className="text-xs font-mono text-slate-400">12 FIXTURES</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {matches.map((m) => {
                const teamA = TEAMS.find((t) => t.id === m.teamAId) || TEAMS[0];
                const teamB = TEAMS.find((t) => t.id === m.teamBId) || TEAMS[1];

                return (
                  <div key={m.id} className="rounded-xl border border-slate-800 bg-slate-950 p-3 space-y-2">
                    <div className="flex justify-between text-[10px] font-mono text-slate-500">
                      <span>{m.group}</span>
                      <span>{m.venue.toUpperCase()}</span>
                    </div>

                    <div className="grid grid-cols-2 gap-1.5">
                      <button
                        onClick={() => handlePredictWinner(m.id, teamA.id)}
                        className={`flex items-center justify-between p-2 rounded-lg border text-xs font-bold transition-all cursor-pointer ${
                          m.winnerId === teamA.id
                            ? 'border-sky-500 bg-sky-500/20 text-white'
                            : 'border-slate-800 bg-slate-900 text-slate-400 hover:text-white'
                        }`}
                      >
                        <div className="flex items-center gap-1.5 truncate">
                          <CountryFlag countryCode={teamA.id} size="sm" />
                          <span className="truncate">{teamA.name}</span>
                        </div>
                        {m.winnerId === teamA.id && <CheckCircle2 className="h-3.5 w-3.5 text-sky-400 shrink-0" />}
                      </button>

                      <button
                        onClick={() => handlePredictWinner(m.id, teamB.id)}
                        className={`flex items-center justify-between p-2 rounded-lg border text-xs font-bold transition-all cursor-pointer ${
                          m.winnerId === teamB.id
                            ? 'border-sky-500 bg-sky-500/20 text-white'
                            : 'border-slate-800 bg-slate-900 text-slate-400 hover:text-white'
                        }`}
                      >
                        <div className="flex items-center gap-1.5 truncate">
                          <CountryFlag countryCode={teamB.id} size="sm" />
                          <span className="truncate">{teamB.name}</span>
                        </div>
                        {m.winnerId === teamB.id && <CheckCircle2 className="h-3.5 w-3.5 text-sky-400 shrink-0" />}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* --- TAB 2: ANIMATED KNOCKOUT BRACKET --- */}
      {activeTab === 'bracket' && (
        <div className="space-y-8 animate-in fade-in duration-300">
          <div className="rounded-3xl border border-slate-800 bg-slate-900/90 p-6 sm:p-8 backdrop-blur-xl space-y-6">
            <div className="text-center space-y-1">
              <span className="text-xs font-mono text-amber-400 font-bold uppercase tracking-wider">
                KNOCKOUT BRACKET STAGE
              </span>
              <h2 className="text-2xl sm:text-3xl font-black text-white">
                Road to the 2026 World Cup Trophy
              </h2>
              <p className="text-xs text-slate-400">
                Tap any team to advance them into the Grand Final or crown the Champion.
              </p>
            </div>

            {/* Bracket Structure */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-center">
              {/* Semi-Finals Column */}
              <div className="space-y-6">
                <span className="text-xs font-mono text-slate-400 font-bold block uppercase tracking-wider">
                  Semi-Final Matches
                </span>

                {/* SF 1 */}
                <div className="rounded-2xl border border-slate-800 bg-slate-950 p-5 space-y-3 shadow-lg">
                  <div className="flex justify-between text-[10px] font-mono text-slate-500">
                    <span>SEMI-FINAL 1 · TRINIDAD</span>
                    <span className="text-sky-400 font-bold">G1 #1 VS G2 #2</span>
                  </div>

                  <div className="space-y-2">
                    <button
                      onClick={() => {
                        setSemi1Winner(g1Seed1.id);
                        cricketAudio.playBatHit();
                      }}
                      className={`w-full flex items-center justify-between p-3 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                        actualSemi1WinnerId === g1Seed1.id
                          ? 'border-sky-500 bg-sky-500/20 text-white shadow-md'
                          : 'border-slate-800 bg-slate-900 text-slate-400 hover:text-white'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <CountryFlag countryCode={g1Seed1.id} size="sm" />
                        <span>{g1Seed1.name} (Seed 1)</span>
                      </div>
                      {actualSemi1WinnerId === g1Seed1.id && <CheckCircle2 className="h-4 w-4 text-sky-400" />}
                    </button>

                    <button
                      onClick={() => {
                        setSemi1Winner(g2Seed2.id);
                        cricketAudio.playBatHit();
                      }}
                      className={`w-full flex items-center justify-between p-3 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                        actualSemi1WinnerId === g2Seed2.id
                          ? 'border-sky-500 bg-sky-500/20 text-white shadow-md'
                          : 'border-slate-800 bg-slate-900 text-slate-400 hover:text-white'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <CountryFlag countryCode={g2Seed2.id} size="sm" />
                        <span>{g2Seed2.name} (Seed 2)</span>
                      </div>
                      {actualSemi1WinnerId === g2Seed2.id && <CheckCircle2 className="h-4 w-4 text-sky-400" />}
                    </button>
                  </div>
                </div>

                {/* SF 2 */}
                <div className="rounded-2xl border border-slate-800 bg-slate-950 p-5 space-y-3 shadow-lg">
                  <div className="flex justify-between text-[10px] font-mono text-slate-500">
                    <span>SEMI-FINAL 2 · GUYANA</span>
                    <span className="text-emerald-400 font-bold">G2 #1 VS G1 #2</span>
                  </div>

                  <div className="space-y-2">
                    <button
                      onClick={() => {
                        setSemi2Winner(g2Seed1.id);
                        cricketAudio.playBatHit();
                      }}
                      className={`w-full flex items-center justify-between p-3 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                        actualSemi2WinnerId === g2Seed1.id
                          ? 'border-emerald-500 bg-emerald-500/20 text-white shadow-md'
                          : 'border-slate-800 bg-slate-900 text-slate-400 hover:text-white'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <CountryFlag countryCode={g2Seed1.id} size="sm" />
                        <span>{g2Seed1.name} (Seed 1)</span>
                      </div>
                      {actualSemi2WinnerId === g2Seed1.id && <CheckCircle2 className="h-4 w-4 text-emerald-400" />}
                    </button>

                    <button
                      onClick={() => {
                        setSemi2Winner(g1Seed2.id);
                        cricketAudio.playBatHit();
                      }}
                      className={`w-full flex items-center justify-between p-3 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                        actualSemi2WinnerId === g1Seed2.id
                          ? 'border-emerald-500 bg-emerald-500/20 text-white shadow-md'
                          : 'border-slate-800 bg-slate-900 text-slate-400 hover:text-white'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <CountryFlag countryCode={g1Seed2.id} size="sm" />
                        <span>{g1Seed2.name} (Seed 2)</span>
                      </div>
                      {actualSemi2WinnerId === g1Seed2.id && <CheckCircle2 className="h-4 w-4 text-emerald-400" />}
                    </button>
                  </div>
                </div>
              </div>

              {/* Grand Final Center Column */}
              <div className="space-y-4">
                <span className="text-xs font-mono text-slate-400 font-bold block text-center uppercase tracking-wider">
                  The Grand Final
                </span>

                <div className="rounded-2xl border border-amber-500/40 bg-slate-950 p-6 space-y-4 shadow-2xl">
                  <span className="text-[10px] font-mono text-slate-500 block text-center">
                    KENSINGTON OVAL · BARBADOS
                  </span>

                  <div className="space-y-3">
                    <button
                      onClick={() => {
                        setChampionId(actualFinalist1.id);
                        cricketAudio.playVictory();
                      }}
                      className={`w-full flex items-center justify-between p-4 rounded-xl border transition-all cursor-pointer ${
                        actualChampion.id === actualFinalist1.id
                          ? 'border-amber-500 bg-amber-500/20 text-white font-bold shadow-lg shadow-amber-500/20'
                          : 'border-slate-800 bg-slate-900 text-slate-300'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <CountryFlag countryCode={actualFinalist1.id} size="md" />
                        <div>
                          <span className="text-sm font-bold block">{actualFinalist1.name}</span>
                          <span className="text-[10px] font-mono text-slate-400">Rating: {actualFinalist1.ratings.overall}</span>
                        </div>
                      </div>
                      {actualChampion.id === actualFinalist1.id && <Trophy className="h-5 w-5 text-amber-400" />}
                    </button>

                    <div className="text-center text-xs font-mono text-slate-500">VS</div>

                    <button
                      onClick={() => {
                        setChampionId(actualFinalist2.id);
                        cricketAudio.playVictory();
                      }}
                      className={`w-full flex items-center justify-between p-4 rounded-xl border transition-all cursor-pointer ${
                        actualChampion.id === actualFinalist2.id
                          ? 'border-amber-500 bg-amber-500/20 text-white font-bold shadow-lg shadow-amber-500/20'
                          : 'border-slate-800 bg-slate-900 text-slate-300'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <CountryFlag countryCode={actualFinalist2.id} size="md" />
                        <div>
                          <span className="text-sm font-bold block">{actualFinalist2.name}</span>
                          <span className="text-[10px] font-mono text-slate-400">Rating: {actualFinalist2.ratings.overall}</span>
                        </div>
                      </div>
                      {actualChampion.id === actualFinalist2.id && <Trophy className="h-5 w-5 text-amber-400" />}
                    </button>
                  </div>
                </div>
              </div>

              {/* Champion Reveal Column */}
              <div className="rounded-2xl border border-amber-500/50 bg-gradient-to-b from-amber-500/10 via-slate-950 to-slate-950 p-6 text-center space-y-4 shadow-2xl">
                <span className="text-xs font-mono text-amber-400 font-bold block">YOUR TOURNAMENT CHAMPION</span>

                <div className="relative mx-auto h-36 w-36 overflow-hidden rounded-2xl border border-amber-500/30 bg-slate-950 shadow-xl">
                  <img
                    src="/images/cricket_trophy_t20.jpg"
                    alt="T20 Championship Trophy"
                    className="h-full w-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLElement).style.display = 'none';
                    }}
                  />
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <Trophy className="h-14 w-14 text-amber-400/30" />
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center justify-center gap-2">
                    <CountryFlag countryCode={actualChampion.id} size="md" />
                    <h3 className="text-2xl font-black text-white">{actualChampion.name}</h3>
                  </div>
                  <p className="text-xs text-slate-400 font-mono">
                    Win Probability: <strong className="text-amber-400 font-bold">68.4%</strong>
                  </p>
                </div>

                <button
                  onClick={() => setActiveTab('ceremony')}
                  className="rounded-xl bg-amber-500 px-4 py-2 text-xs font-bold text-slate-950 hover:bg-amber-400 transition-colors cursor-pointer w-full"
                >
                  View Podium Ceremony & Awards →
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- TAB 3: LIVE POINTS TABLE --- */}
      {activeTab === 'table' && (
        <div className="space-y-8 animate-in fade-in duration-300">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Group 1 Table */}
            <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-5 space-y-3 backdrop-blur-md overflow-x-auto">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
                <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-sky-400" />
                  Group 1 Standings
                </span>
                <span className="text-[10px] font-mono text-emerald-400 font-bold">TOP 2 ADVANCE</span>
              </div>

              <table className="w-full text-left text-xs font-mono">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-500 text-[10px]">
                    <th className="py-2 px-2">TEAM</th>
                    <th className="py-2 px-2 text-center">P</th>
                    <th className="py-2 px-2 text-center">W</th>
                    <th className="py-2 px-2 text-center">NRR</th>
                    <th className="py-2 px-2 text-center">PTS</th>
                    <th className="py-2 px-2 text-right">QUAL %</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {group1Standings.map((row, idx) => (
                    <tr key={row.team.id} className={idx < 2 ? 'bg-sky-500/5' : ''}>
                      <td className="py-2.5 px-2">
                        <div className="flex items-center gap-2 font-bold text-white">
                          <CountryFlag countryCode={row.team.id} size="sm" />
                          <span>{row.team.name}</span>
                          {idx < 2 && <span className="text-[9px] text-emerald-400">● Q</span>}
                        </div>
                      </td>
                      <td className="py-2.5 px-2 text-center text-slate-300">{row.played}</td>
                      <td className="py-2.5 px-2 text-center text-emerald-400 font-bold">{row.won}</td>
                      <td className="py-2.5 px-2 text-center text-slate-300">{row.nrr > 0 ? `+${row.nrr}` : row.nrr}</td>
                      <td className="py-2.5 px-2 text-center text-sky-400 font-black">{row.points}</td>
                      <td className="py-2.5 px-2 text-right font-bold text-emerald-400">{row.qualProb}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Group 2 Table */}
            <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-5 space-y-3 backdrop-blur-md overflow-x-auto">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
                <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-emerald-400" />
                  Group 2 Standings
                </span>
                <span className="text-[10px] font-mono text-emerald-400 font-bold">TOP 2 ADVANCE</span>
              </div>

              <table className="w-full text-left text-xs font-mono">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-500 text-[10px]">
                    <th className="py-2 px-2">TEAM</th>
                    <th className="py-2 px-2 text-center">P</th>
                    <th className="py-2 px-2 text-center">W</th>
                    <th className="py-2 px-2 text-center">NRR</th>
                    <th className="py-2 px-2 text-center">PTS</th>
                    <th className="py-2 px-2 text-right">QUAL %</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {group2Standings.map((row, idx) => (
                    <tr key={row.team.id} className={idx < 2 ? 'bg-emerald-500/5' : ''}>
                      <td className="py-2.5 px-2">
                        <div className="flex items-center gap-2 font-bold text-white">
                          <CountryFlag countryCode={row.team.id} size="sm" />
                          <span>{row.team.name}</span>
                          {idx < 2 && <span className="text-[9px] text-emerald-400">● Q</span>}
                        </div>
                      </td>
                      <td className="py-2.5 px-2 text-center text-slate-300">{row.played}</td>
                      <td className="py-2.5 px-2 text-center text-emerald-400 font-bold">{row.won}</td>
                      <td className="py-2.5 px-2 text-center text-slate-300">{row.nrr > 0 ? `+${row.nrr}` : row.nrr}</td>
                      <td className="py-2.5 px-2 text-center text-emerald-400 font-black">{row.points}</td>
                      <td className="py-2.5 px-2 text-right font-bold text-emerald-400">{row.qualProb}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* --- TAB 4: PODIUM CEREMONY & ACCOLADES --- */}
      {activeTab === 'ceremony' && (
        <div className="space-y-6 animate-in zoom-in-95 duration-400">
          <div className="rounded-3xl border border-amber-500/50 bg-gradient-to-b from-amber-950/30 via-slate-950 to-slate-950 p-8 text-center space-y-6 shadow-2xl relative overflow-hidden">
            <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-96 h-96 bg-amber-500/10 blur-3xl pointer-events-none" />

            <div className="inline-flex items-center gap-2 rounded-full border border-amber-500/40 bg-amber-500/10 px-4 py-1.5 text-xs font-mono font-bold text-amber-400 tracking-wider">
              <Sparkles className="h-3.5 w-3.5" />
              <span>OFFICIAL 2026 WORLD CUP TOURNAMENT CEREMONY</span>
            </div>

            <div className="space-y-2">
              <h2 className="text-3xl sm:text-5xl font-black text-white">
                {actualChampion.name.toUpperCase()} CROWNED CHAMPIONS!
              </h2>
              <p className="text-sm text-slate-300">
                Runner-up:{' '}
                <strong className="text-white">
                  {actualChampion.id === actualFinalist1.id ? actualFinalist2.name : actualFinalist1.name}
                </strong>
              </p>
            </div>

            {/* Podium Display */}
            <div className="relative mx-auto h-52 w-52 rounded-3xl border-2 border-amber-400/60 overflow-hidden shadow-2xl shadow-amber-500/30">
              <img
                src="/images/cricket_trophy_t20.jpg"
                alt="Championship Trophy"
                className="h-full w-full object-cover"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
            </div>

            {/* AI Individual Awards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs pt-4">
              {/* Award 1: Top Batter */}
              <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 space-y-2 text-left">
                <span className="text-amber-400 font-mono font-bold block text-[10px] uppercase">
                  ORANGE CAP · TOP RUN SCORER
                </span>
                <h4 className="text-base font-bold text-white">Virat Kohli / Travis Head</h4>
                <p className="text-slate-400 font-mono">Projected Runs: 412 · Avg 58.8 · SR 154</p>
              </div>

              {/* Award 2: Top Bowler */}
              <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 space-y-2 text-left">
                <span className="text-amber-400 font-mono font-bold block text-[10px] uppercase">
                  PURPLE CAP · TOP WICKET TAKER
                </span>
                <h4 className="text-base font-bold text-white">Jasprit Bumrah</h4>
                <p className="text-slate-400 font-mono">Projected Wickets: 19 · Econ 5.20</p>
              </div>

              {/* Award 3: Player of the Tournament */}
              <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 space-y-2 text-left">
                <span className="text-amber-400 font-mono font-bold block text-[10px] uppercase">
                  PLAYER OF TOURNAMENT (MVP)
                </span>
                <h4 className="text-base font-bold text-white">{actualChampion.squad[0]?.name || 'Suryakumar Yadav'}</h4>
                <p className="text-slate-400 font-mono">Impact Score: 98/100 · 3 Match-winning innings</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* NEXT MATCH SIMULATOR STEP-BY-STEP MODAL */}
      {nextMatchSimModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md animate-in fade-in duration-200">
          <div className="relative w-full max-w-lg rounded-3xl border border-sky-500/40 bg-slate-950 p-6 sm:p-8 space-y-6 text-center shadow-2xl">
            <span className="text-xs font-mono font-bold text-sky-400 uppercase tracking-widest block">
              LIVE MATCH SIMULATION ENGINE
            </span>

            <div className="flex items-center justify-center gap-4">
              <div className="text-center space-y-1">
                <CountryFlag countryCode={nextMatchSimModal.teamA.id} size="md" />
                <span className="text-sm font-bold text-white block">{nextMatchSimModal.teamA.name}</span>
              </div>
              <span className="text-xs font-mono text-slate-500">VS</span>
              <div className="text-center space-y-1">
                <CountryFlag countryCode={nextMatchSimModal.teamB.id} size="md" />
                <span className="text-sm font-bold text-white block">{nextMatchSimModal.teamB.name}</span>
              </div>
            </div>

            {/* Stage Cards */}
            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5 space-y-2 text-xs font-mono">
              {nextMatchSimModal.step === 'toss' && (
                <div className="animate-in fade-in">
                  <span className="text-amber-400 font-bold block mb-1">STAGE 1: THE TOSS</span>
                  <p className="text-white">{nextMatchSimModal.teamA.name} won the toss and elected to bat first.</p>
                </div>
              )}
              {nextMatchSimModal.step === 'moment' && (
                <div className="animate-in fade-in">
                  <span className="text-rose-400 font-bold block mb-1">STAGE 2: MATCH TURNING POINT</span>
                  <p className="text-white">Clutch 18th over spell: 2 wickets conceded for just 4 runs!</p>
                </div>
              )}
              {nextMatchSimModal.step === 'score' && (
                <div className="animate-in fade-in">
                  <span className="text-sky-400 font-bold block mb-1">STAGE 3: FINAL INNINGS SCORE</span>
                  <p className="text-white font-bold">{nextMatchSimModal.scoreSummary}</p>
                </div>
              )}
              {nextMatchSimModal.step === 'winner' && (
                <div className="animate-in zoom-in-95">
                  <span className="text-emerald-400 font-bold block mb-1">STAGE 4: OFFICIAL RESULT</span>
                  <p className="text-lg font-black text-white">{nextMatchSimModal.winner.name.toUpperCase()} WINS!</p>
                  <p className="text-[11px] text-slate-400 mt-1">Standings and bracket automatically updated.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
