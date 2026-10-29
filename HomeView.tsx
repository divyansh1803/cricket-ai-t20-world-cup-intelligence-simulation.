import React, { useState } from 'react';
import { useGame } from '../../context/GameContext';
import { TEAMS, STADIUMS } from '../../data/cricketData';
import { CountryFlag, TeamCrest, PlayerCardAvatar, getTeamFlagUrl, TeamFlag } from '../common/CricketIdentity';
import { StadiumPhoto } from '../common/StadiumPhoto';
import { resolveStadiumLandmarkCaption } from '../../data/stadiumImageCatalog';
import { Team, Stadium } from '../../types/cricket';
import {
  Play,
  TrendingUp,
  Cpu,
  BarChart3,
  Flame,
  Award,
  ChevronRight,
  Shield,
  Activity,
  Compass,
  Zap,
  Swords,
  Trophy,
  ArrowRightLeft,
  Sliders,
  MapPin,
  Radio,
  Sparkles,
} from 'lucide-react';

import { TEAM_LEADERSHIP_MAP } from '../common/TeamDossierBanner';
import { CaptainImageCard } from '../common/CaptainImageCard';
import { CommandersDashboard } from '../captains/CommandersDashboard';
import { PlayerComparisonModal } from '../players/PlayerComparisonModal';
import { PitchInspector } from '../common/PitchInspector';
import { BroadcastLiveMatchCentre } from './BroadcastLiveMatchCentre';
import { TournamentStatsLeaderboard } from './TournamentStatsLeaderboard';
import { InteractiveTeamPlayerHub } from './InteractiveTeamPlayerHub';
import { MatchComparisonTool } from '../analytics/MatchComparisonTool';
import { ComprehensiveAnalyticsSuite } from '../analytics/ComprehensiveAnalyticsSuite';
import { MatchMvpRadarCard } from './MatchMvpRadarCard';
import { PitchDegradationForecastCard } from '../common/PitchDegradationForecastCard';

export const HomeView: React.FC = () => {
  const {
    setActiveView,
    profile,
    addXp,
    setActiveModalPlayer,
    setActiveModalStadium,
    setSelectedPlayerId,
    launchSimMatch,
    isBroadcastMode,
  } = useGame();
  const [dailyClaimed, setDailyClaimed] = useState(false);

  // Broadcast Engine Setup - Team Configuration
  const [teamAId, setTeamAId] = useState<string>('ind'); // India default
  const [teamBId, setTeamBId] = useState<string>('aus'); // Australia default
  const [selectedStadiumId, setSelectedStadiumId] = useState<string>('ahmedabad');
  const [showPitchInspector, setShowPitchInspector] = useState<boolean>(false);

  const teamA: Team = TEAMS.find((t) => t.id === teamAId) || TEAMS[0];
  const teamB: Team = TEAMS.find((t) => t.id === teamBId) || TEAMS[1];
  const currentStadium: Stadium = STADIUMS.find((s) => s.id === selectedStadiumId) || STADIUMS[0];

  // Dynamic Win Probability calculation
  const calculateWinProb = (a: Team, b: Team) => {
    const scoreA = a.ratings.overall * 1.5 + a.ratings.batting + a.ratings.bowling;
    const scoreB = b.ratings.overall * 1.5 + b.ratings.batting + b.ratings.bowling;
    const diff = (scoreA - scoreB) / 3.5;
    let probA = Math.round(50 + diff * 2.8);
    probA = Math.max(25, Math.min(75, probA));
    return { probA, probB: 100 - probA };
  };

  const { probA, probB } = calculateWinProb(teamA, teamB);

  const handleSwapTeams = () => {
    setTeamAId(teamBId);
    setTeamBId(teamAId);
  };

  const handleClaimDaily = () => {
    if (!dailyClaimed) {
      addXp(250, 'Daily Cricket Intelligence Challenge completed');
      setDailyClaimed(true);
    }
  };

  const spotlightPlayer = TEAMS[0].squad[0]; // Suryakumar Yadav
  const leadA = TEAM_LEADERSHIP_MAP[teamA.id.toLowerCase()] || {
    captain: teamA.squad[0]?.name || 'Captain',
    captainPhoto: `/players/${teamA.squad[0]?.id || teamA.id}.svg`,
    coach: 'Head Coach',
    winRate: '56.3%',
    rankBadge: `ICC Rank #${teamA.ranking}`,
    boardEmblem: `/logos/${teamA.id.toLowerCase()}.svg`,
  };
  const leadB = TEAM_LEADERSHIP_MAP[teamB.id.toLowerCase()] || {
    captain: teamB.squad[0]?.name || 'Captain',
    captainPhoto: `/players/${teamB.squad[0]?.id || teamB.id}.svg`,
    coach: 'Head Coach',
    winRate: '50.0%',
    rankBadge: `ICC Rank #${teamB.ranking}`,
    boardEmblem: `/logos/${teamB.id.toLowerCase()}.svg`,
  };

  return (
    <div className={isBroadcastMode ? 'space-y-6 pb-8' : 'space-y-12 pb-20'}>
      {/* =========================================================================
          HERO SECTION: CRICKET AI - T20 WORLD CUP INTELLIGENCE
          ========================================================================= */}
      {!isBroadcastMode && (
      <section className="relative overflow-hidden rounded-3xl border border-slate-800/80 bg-slate-950 p-6 sm:p-10 lg:p-14 shadow-[0_0_50px_rgba(0,180,255,0.12)]">
        {/* Futuristic Stadium Floodlight Glows & Atmospheric Layer */}
        <div className="absolute inset-0 z-0 pointer-events-none">
          <img
            src="/images/hero_cricket_stadium.jpg"
            alt="World Cup Cricket Stadium under floodlights"
            referrerPolicy="no-referrer"
            className="h-full w-full object-cover opacity-20 filter contrast-125 brightness-90"
            onError={(e) => {
              (e.target as HTMLElement).style.display = 'none';
            }}
          />
          {/* Subtle Radial Blue Neon Atmospheric Lighting */}
          <div className="absolute -top-32 -left-32 w-96 h-96 bg-cyan-500/15 rounded-full blur-3xl" />
          <div className="absolute top-1/2 right-0 w-80 h-80 bg-blue-600/15 rounded-full blur-3xl" />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/85 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-r from-slate-950/95 via-slate-950/70 to-transparent" />
        </div>

        {/* Hero Content */}
        <div className="relative z-10 max-w-4xl space-y-6">
          {/* Eyebrow badge */}
          <div className="flex items-center gap-2.5 text-xs text-slate-400 font-mono tracking-wider">
            <span className="flex h-2.5 w-2.5 rounded-full bg-cyan-400 animate-ping" />
            <span className="text-cyan-400 font-bold tracking-widest uppercase">T20 WORLD CUP INTELLIGENCE</span>
            <span aria-hidden="true" className="text-slate-600">·</span>
            <span className="text-slate-300 font-semibold">2026 EDITION</span>
            <span aria-hidden="true" className="text-slate-600">·</span>
            <span className="text-emerald-400 font-medium">BROADCAST ENGINE v3.4</span>
          </div>

          {/* Main Title */}
          <div className="space-y-3">
            <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black tracking-tight text-white leading-none">
              CRICKET <span className="text-cyan-400 drop-shadow-[0_0_28px_rgba(6,182,212,0.7)]">AI</span>
            </h1>
            <p className="text-xl sm:text-2xl font-bold text-slate-100 tracking-tight">
              The Intelligence Behind T20 Cricket.
            </p>
            <p className="text-sm sm:text-base text-slate-400 leading-relaxed max-w-2xl">
              Predict outcomes, command tactical decisions against the AI coach, simulate ball-by-ball matches, and run Monte Carlo scenarios with deep cricket data science.
            </p>
          </div>

          {/* Prominent Rounded CTA Buttons Matching Reference */}
          <div className="flex flex-wrap items-center gap-3 pt-3">
            {/* 1. CRICKET UNIVERSE (Blue gradient) */}
            <button
              onClick={() => setActiveView('players')}
              className="flex items-center gap-2 rounded-full bg-gradient-to-r from-blue-600 via-sky-500 to-blue-600 px-6 py-3.5 text-sm font-black text-white shadow-[0_0_22px_rgba(14,165,233,0.35)] hover:shadow-[0_0_32px_rgba(14,165,233,0.65)] hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer"
            >
              <Compass className="h-4 w-4" />
              <span>CRICKET UNIVERSE</span>
            </button>

            {/* 2. LIVE 3D STADIUM MATCH (Green gradient) */}
            <button
              onClick={() => setActiveView('simulator')}
              className="flex items-center gap-2 rounded-full bg-gradient-to-r from-emerald-600 via-green-500 to-emerald-600 px-6 py-3.5 text-sm font-black text-slate-950 shadow-[0_0_22px_rgba(34,197,94,0.35)] hover:shadow-[0_0_32px_rgba(34,197,94,0.65)] hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer"
            >
              <Activity className="h-4 w-4 text-slate-950" />
              <span>LIVE 3D STADIUM MATCH</span>
            </button>

            {/* 3. TOURNAMENT HUB (Orange gradient) */}
            <button
              onClick={() => setActiveView('tournament')}
              className="flex items-center gap-2 rounded-full bg-gradient-to-r from-amber-600 via-orange-500 to-amber-600 px-6 py-3.5 text-sm font-black text-white shadow-[0_0_22px_rgba(249,115,22,0.35)] hover:shadow-[0_0_32px_rgba(249,115,22,0.65)] hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer"
            >
              <Trophy className="h-4 w-4" />
              <span>TOURNAMENT HUB</span>
            </button>

            {/* 4. ENTER AI LAB (Purple gradient) */}
            <button
              onClick={() => setActiveView('cricket_lab')}
              className="flex items-center gap-2 rounded-full bg-gradient-to-r from-purple-600 via-violet-500 to-purple-600 px-6 py-3.5 text-sm font-black text-white shadow-[0_0_22px_rgba(168,85,247,0.35)] hover:shadow-[0_0_32px_rgba(168,85,247,0.65)] hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer"
            >
              <Cpu className="h-4 w-4" />
              <span>ENTER AI LAB</span>
            </button>

            {/* 5. PLAY VS AI (Dark-blue gradient) */}
            <button
              onClick={() => setActiveView('you_vs_ai')}
              className="flex items-center gap-2 rounded-full bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 border border-blue-500/50 px-6 py-3.5 text-sm font-black text-cyan-300 shadow-[0_0_20px_rgba(59,130,246,0.25)] hover:border-cyan-400 hover:text-white hover:shadow-[0_0_30px_rgba(6,182,212,0.5)] hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer"
            >
              <Play className="h-4 w-4 fill-current" />
              <span>PLAY VS AI</span>
            </button>
          </div>
        </div>

        {/* Live Broadcast Match Centre Ticker */}
        <div className="relative z-10 mt-10 rounded-2xl border border-slate-800 bg-slate-900/80 p-4 sm:p-5 backdrop-blur-md shadow-inner">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="flex h-2.5 w-2.5 rounded-full bg-rose-500 animate-pulse" />
              <span className="text-xs font-bold text-white tracking-wider">LIVE MATCH CENTER</span>
              <span className="text-xs text-slate-400 font-mono">
                {currentStadium.name.toUpperCase()} · FINAL OVER
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-3 text-xs font-mono">
              <span className="text-slate-400">WIN PROBABILITY:</span>
              <span className="inline-flex items-center gap-1.5 text-cyan-400 font-bold">
                <img
                  src={getTeamFlagUrl(teamA.id)}
                  alt={`${teamA.name} flag`}
                  className="h-3.5 w-5 rounded-[2px] object-cover border border-white/20"
                />
                <span>{teamA.name}</span>
                <span className="tabular-nums">{probA}%</span>
              </span>
              <span className="text-slate-600">|</span>
              <span className="inline-flex items-center gap-1.5 text-amber-400 font-bold">
                <img
                  src={getTeamFlagUrl(teamB.id)}
                  alt={`${teamB.name} flag`}
                  className="h-3.5 w-5 rounded-[2px] object-cover border border-white/20"
                />
                <span>{teamB.name}</span>
                <span className="tabular-nums">{probB}%</span>
              </span>
            </div>
          </div>

          <div className="mt-3 flex flex-wrap items-center justify-between gap-4 border-t border-slate-800/80 pt-3">
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <CountryFlag countryCode={teamA.id} size="md" />
                <span className="text-sm font-bold text-white">{teamA.name} <span className="tabular-nums text-cyan-300">164/4</span></span>
                <span className="text-xs text-slate-400 font-mono tabular-nums">(17.2 ov)</span>
              </div>
              <span className="text-xs text-slate-500">vs</span>
              <div className="flex items-center gap-2">
                <CountryFlag countryCode={teamB.id} size="md" />
                <span className="text-sm font-medium text-slate-300">{teamB.name} <span className="tabular-nums">201/6</span></span>
                <span className="text-xs text-slate-400 font-mono tabular-nums">(20.0 ov)</span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-xs text-slate-300">
                Need <strong className="text-cyan-400 font-bold">37</strong> from 16 balls · RRR <strong className="text-amber-400 font-bold">13.87</strong>
              </span>
              <button
                onClick={() => setActiveView('simulator')}
                className="rounded-lg bg-cyan-500/20 border border-cyan-500/40 px-3.5 py-1.5 text-xs font-bold text-cyan-300 hover:bg-cyan-500/30 hover:text-white transition-all cursor-pointer"
              >
                Open Match Centre →
              </button>
            </div>
          </div>
        </div>
      </section>
      )}

      {/* =========================================================================
          BROADCAST LIVE MATCH COMMAND CENTRE & 2-INNINGS SCOREBOARD
          ========================================================================= */}
      <BroadcastLiveMatchCentre />

      {!isBroadcastMode && (
      <>
      {/* =========================================================================
          AI-DRIVEN PITCH DEGRADATION FORECAST (HARD -> DUSTY CSS FILMSTRIP + 20-OV CURVE)
          ========================================================================= */}
      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 text-xs font-mono text-amber-400">
              <MapPin className="h-3.5 w-3.5 text-amber-400" />
              <span>Global Matchday Venues · 16 Verified Arenas</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight mt-0.5">
              World Cricket Stadiums & Pitch Forecast
            </h2>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <select
              value={selectedStadiumId}
              onChange={(e) => setSelectedStadiumId(e.target.value)}
              className="rounded-xl border border-slate-800 bg-slate-900 px-3.5 py-2 text-xs font-semibold text-white focus:outline-none focus:border-amber-400 cursor-pointer"
              aria-label="Select stadium venue for AI Pitch Degradation Forecast"
            >
              {STADIUMS.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.city}, {s.country})
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => setActiveView('cricket_lab')}
              className="text-xs font-mono font-semibold text-cyan-400 hover:text-cyan-300 transition-colors cursor-pointer whitespace-nowrap"
            >
              Open Full Pitch Intelligence Lab →
            </button>
          </div>
        </div>

        {/* Active Stadium Panoramic Banner */}
        <div className="relative h-56 sm:h-72 w-full rounded-2xl overflow-hidden border border-slate-800 bg-slate-950">
          <StadiumPhoto
            stadium={currentStadium}
            alt={`${currentStadium.name} — ${currentStadium.city}, ${currentStadium.country}`}
            eager
            className="h-full w-full"
            imgClassName="h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/55 to-black/15" />

          <div className="absolute top-3.5 left-4 right-4 flex flex-wrap items-center justify-between gap-2 text-xs font-mono text-slate-200">
            <span className="inline-flex items-center gap-2 rounded-lg bg-slate-950/80 backdrop-blur-md border border-white/10 px-3 py-1.5">
              <img
                src={getTeamFlagUrl(currentStadium.country)}
                alt={currentStadium.country}
                referrerPolicy="no-referrer"
                className="h-3.5 w-5 rounded-[2px] object-cover border border-white/25"
              />
              <span>{currentStadium.city}, {currentStadium.country}</span>
              <span aria-hidden="true" className="text-slate-500">·</span>
              <span>{currentStadium.pitchType}</span>
            </span>
            <span className="rounded-lg bg-slate-950/80 backdrop-blur-md border border-white/10 px-3 py-1.5 tabular-nums">
              Capacity {currentStadium.capacity.toLocaleString()} · {currentStadium.boundarySizeMeters.straight}m / {currentStadium.boundarySizeMeters.square}m
            </span>
          </div>

          <div className="absolute bottom-4 left-4 right-4 flex flex-col sm:flex-row sm:items-end justify-between gap-3">
            <div>
              <p className="text-xs font-mono text-amber-300">
                {resolveStadiumLandmarkCaption(currentStadium)}
              </p>
              <h3 className="text-2xl sm:text-3xl font-black text-white tracking-tight mt-0.5">
                {currentStadium.name}
              </h3>
              <p className="text-xs text-slate-200 mt-0.5 max-w-2xl line-clamp-2">
                {currentStadium.paceSpinAdvantage}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setActiveModalStadium(currentStadium)}
                className="rounded-xl border border-white/20 bg-slate-950/85 backdrop-blur-md px-3.5 py-2 text-xs font-bold text-slate-100 hover:border-amber-400 hover:text-amber-300 transition-colors cursor-pointer whitespace-nowrap"
              >
                Architectural Angles
              </button>
              <button
                type="button"
                onClick={() => launchSimMatch(teamAId, teamBId, currentStadium.id)}
                className="rounded-xl bg-amber-400 px-4 py-2 text-xs font-black text-slate-950 hover:bg-amber-300 transition-colors cursor-pointer whitespace-nowrap"
              >
                Simulate Match at {currentStadium.city} →
              </button>
            </div>
          </div>
        </div>

        {/* Interactive 16-Stadium Thumbnail Strip */}
        <div className="flex items-center gap-2.5 overflow-x-auto pb-1.5 scrollbar-none">
          {STADIUMS.map((std) => {
            const isSelected = std.id === currentStadium.id;
            return (
              <button
                key={std.id}
                type="button"
                onClick={() => setSelectedStadiumId(std.id)}
                className={`group relative h-20 w-36 shrink-0 rounded-xl overflow-hidden border text-left transition-all cursor-pointer ${
                  isSelected
                    ? 'border-amber-400 ring-2 ring-amber-400/40 scale-[1.02]'
                    : 'border-slate-800 opacity-80 hover:opacity-100 hover:border-slate-600'
                }`}
              >
                <StadiumPhoto
                  stadium={std}
                  alt={`${std.name}, ${std.city}`}
                  className="h-full w-full"
                  imgClassName="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/35 to-transparent" />
                <div className="absolute top-1.5 right-1.5">
                  <img
                    src={getTeamFlagUrl(std.country)}
                    alt={std.country}
                    referrerPolicy="no-referrer"
                    className="h-3 w-4 rounded-[2px] object-cover border border-white/25"
                  />
                </div>
                <div className="absolute bottom-1.5 left-2 right-2">
                  <span className="block text-[10px] font-mono text-amber-300 truncate leading-tight">
                    {std.city}
                  </span>
                  <span className="block text-[11px] font-bold text-white truncate leading-tight">
                    {std.name}
                  </span>
                </div>
              </button>
            );
          })}
        </div>

        <PitchDegradationForecastCard
          stadiumName={`${currentStadium.name}, ${currentStadium.city}`}
          temperature={currentStadium.country === 'India' || currentStadium.country === 'Sri Lanka' ? 33 : 28}
          humidity={currentStadium.country === 'West Indies' || currentStadium.country === 'Sri Lanka' ? 68 : 49}
          dewLevel={currentStadium.country === 'India' ? 46 : 32}
          pitchWear={
            currentStadium.pitchType === 'Dry Spin-Friendly' || currentStadium.pitchType === 'Slow & Turning'
              ? 46
              : currentStadium.pitchType === 'Pace & Bounce'
              ? 16
              : 26
          }
          grassCoverage={
            currentStadium.pitchType === 'Pace & Bounce'
              ? 72
              : currentStadium.pitchType === 'Dry Spin-Friendly' || currentStadium.pitchType === 'Slow & Turning'
              ? 26
              : 54
          }
          matchDay={1}
        />
      </section>

      {/* =========================================================================
          CRICKET UNIVERSE: TEAMS, PLAYERS & MATCH PREDICTOR
          ========================================================================= */}
      <InteractiveTeamPlayerHub />

      {/* =========================================================================
          TOURNAMENT STATISTICS & OFFICIAL LEADERBOARDS
          ========================================================================= */}
      <TournamentStatsLeaderboard />

      {/* =========================================================================
          COMMANDERS OF THE 10 NATIONS CAPTAIN & COACH DASHBOARD
          ========================================================================= */}
      <section className="space-y-6">
        <CommandersDashboard
          onOpenSquad={(team) => {
            setSelectedPlayerId(team.squad[0]?.id || 'sky');
            setActiveView('players');
          }}
        />
      </section>

      {/* =========================================================================
          MATCH COMPARISON TOOL: HISTORICAL HEAD-TO-HEAD, FORM & SQUAD STRENGTH
          ========================================================================= */}
      <section className="space-y-6">
        <MatchComparisonTool
          initialTeamAId="ind"
          initialTeamBId="aus"
          onLaunchSimulation={(tA, tB) => {
            launchSimMatch(tA.id, tB.id);
            setActiveView('simulator');
          }}
        />
      </section>

      {/* =========================================================================
          DEEP CRICKET ANALYTICS: PHASE DOMINANCE, TACTICAL RADAR & H2H BATTLES
          ========================================================================= */}
      <ComprehensiveAnalyticsSuite />

      {/* =========================================================================
          BROADCAST ENGINE SETUP: MATCH CONFIGURATION SECTION
          ========================================================================= */}
      <section className="space-y-6">
        {/* Section Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 border-b border-slate-800/80 pb-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-mono text-cyan-400 uppercase tracking-widest font-semibold mb-1">
              <Radio className="h-3.5 w-3.5 text-cyan-400 animate-pulse" />
              <span>Broadcast Engine Setup</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Configure Your Cricket Match Simulation
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              Select national sides, inspect leadership analytics, and launch real-time ball physics simulations.
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
            <span className="flex h-2 w-2 rounded-full bg-emerald-400" />
            <span>Venue: <strong className="text-white">{currentStadium.name}</strong></span>
          </div>
        </div>

        {/* Side-by-Side Team Cards Grid */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* -------------------------------------------------------------
              TEAM 1: INDIA (IND) - Glowing Blue Selected Border
              ------------------------------------------------------------- */}
          <div className="relative rounded-2xl border-2 border-cyan-400/90 bg-gradient-to-b from-blue-950/50 via-slate-950/90 to-slate-950 p-6 sm:p-7 shadow-[0_0_35px_rgba(6,182,212,0.25)] ring-1 ring-cyan-400/30 transition-all">
            {/* Top Glowing Indicator Badge */}
            <div className="flex items-center justify-between mb-4 border-b border-cyan-500/20 pb-3">
              <div className="flex items-center gap-2">
                <span className="flex h-2.5 w-2.5 rounded-full bg-cyan-400 animate-pulse" />
                <span className="text-xs font-mono font-bold tracking-wider text-cyan-300 uppercase">
                  YOUR TEAM · ACTIVE SELECTION
                </span>
              </div>
              <span className="rounded-md bg-cyan-500/20 border border-cyan-400/40 px-2.5 py-1 text-[11px] font-mono font-bold text-cyan-300 shadow-[0_0_12px_rgba(6,182,212,0.3)]">
                {leadA.rankBadge}
              </span>
            </div>

            {/* Team Crest, Flag & Identity */}
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="p-1.5 rounded-xl bg-slate-900 border border-cyan-500/40 shadow-md flex items-center gap-2">
                  <TeamCrest teamId={teamA.id} size={36} />
                  <CountryFlag countryCode={teamA.id} size="md" />
                </div>
                <div>
                  <div className="flex items-center gap-2.5">
                    <h3 className="text-2xl font-black text-white tracking-tight">{teamA.name}</h3>
                    <img
                      src={getTeamFlagUrl(teamA.id)}
                      alt={`${teamA.name} flag`}
                      className="h-4 w-6 rounded-[2px] object-cover border border-cyan-400/40"
                    />
                  </div>
                  <div className="flex flex-wrap items-center gap-3 text-xs text-slate-300 mt-1">
                    <span>Captain: <strong className="text-white">{leadA.captain}</strong></span>
                    <span className="text-slate-600">·</span>
                    <span>Coach: <strong className="text-slate-200">{leadA.coach}</strong></span>
                  </div>
                </div>
              </div>

              {/* Squad count */}
              <div className="text-right shrink-0">
                <p className="text-xs font-mono text-slate-400">Squad Size</p>
                <p className="text-sm font-bold font-mono text-cyan-400">{teamA.squad.length} Players</p>
              </div>
            </div>

            {/* Win Probability Banner */}
            <div className="mt-5 rounded-xl border border-cyan-500/30 bg-cyan-950/30 p-3.5 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-mono text-slate-300 font-semibold">MATCH WIN PROBABILITY</span>
                <span className="font-mono font-black text-cyan-300 text-sm tabular-nums">{probA}% WIN CHANCE</span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-slate-900">
                <div
                  className="h-full bg-gradient-to-r from-blue-500 to-cyan-400 shadow-[0_0_12px_rgba(6,182,212,0.8)] transition-all duration-500"
                  style={{ width: `${probA}%` }}
                />
              </div>
            </div>

            {/* Captain Image Card */}
            <div className="mt-4">
              <CaptainImageCard
                team={teamA}
                variant="compact"
                onInspect={(p) => setActiveModalPlayer(p)}
              />
            </div>

            {/* Batting & Bowling Rating Gauges */}
            <div className="mt-5 grid grid-cols-2 gap-4">
              <div className="rounded-xl border border-slate-800/90 bg-slate-900/60 p-3.5 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400 font-medium">Batting Power</span>
                  <span className="font-mono font-bold text-white">{teamA.ratings.batting}/100</span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-slate-800 overflow-hidden">
                  <div className="h-full bg-cyan-400" style={{ width: `${teamA.ratings.batting}%` }} />
                </div>
              </div>

              <div className="rounded-xl border border-slate-800/90 bg-slate-900/60 p-3.5 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400 font-medium">Bowling Depth</span>
                  <span className="font-mono font-bold text-white">{teamA.ratings.bowling}/100</span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-slate-800 overflow-hidden">
                  <div className="h-full bg-blue-500" style={{ width: `${teamA.ratings.bowling}%` }} />
                </div>
              </div>
            </div>

            {/* Phase Stat Boxes */}
            <div className="mt-4 grid grid-cols-4 gap-2 text-center text-xs font-mono">
              <div className="rounded-lg border border-slate-800 bg-slate-950/80 p-2">
                <span className="text-[10px] text-slate-500 block">POWERPLAY</span>
                <span className="font-bold text-slate-200">{teamA.ratings.powerplay}</span>
              </div>
              <div className="rounded-lg border border-slate-800 bg-slate-950/80 p-2">
                <span className="text-[10px] text-slate-500 block">MIDDLE</span>
                <span className="font-bold text-slate-200">{teamA.ratings.middleOvers}</span>
              </div>
              <div className="rounded-lg border border-slate-800 bg-slate-950/80 p-2">
                <span className="text-[10px] text-slate-500 block">DEATH OVERS</span>
                <span className="font-bold text-cyan-300">{teamA.ratings.deathOvers}</span>
              </div>
              <div className="rounded-lg border border-slate-800 bg-slate-950/80 p-2">
                <span className="text-[10px] text-slate-500 block">TITLES</span>
                <span className="font-bold text-amber-400">{teamA.worldCupTitles} 🏆</span>
              </div>
            </div>

            {/* Recent Form */}
            <div className="mt-4 flex items-center justify-between border-t border-slate-800/80 pt-3 text-xs">
              <span className="text-slate-400">Recent Form:</span>
              <div className="flex items-center gap-1.5">
                {teamA.recentForm.map((f, i) => (
                  <span
                    key={i}
                    className={`flex h-5 w-5 items-center justify-center rounded font-mono font-bold text-[11px] ${
                      f === 'W' ? 'bg-emerald-950 border border-emerald-500/40 text-emerald-300' : 'bg-rose-950 border border-rose-500/40 text-rose-300'
                    }`}
                  >
                    {f}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* -------------------------------------------------------------
              TEAM 2: AUSTRALIA (AUS) - Subtle Dark Border
              ------------------------------------------------------------- */}
          <div className="relative rounded-2xl border border-slate-800/90 bg-gradient-to-b from-slate-900/40 via-slate-950/90 to-slate-950 p-6 sm:p-7 hover:border-slate-700/80 transition-all shadow-md">
            {/* Top Indicator Badge */}
            <div className="flex items-center justify-between mb-4 border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <span className="flex h-2.5 w-2.5 rounded-full bg-slate-400" />
                <span className="text-xs font-mono font-bold tracking-wider text-slate-300 uppercase">
                  OPPONENT CHALLENGER
                </span>
              </div>
              <span className="rounded-md bg-slate-800/80 border border-slate-700 px-2.5 py-1 text-[11px] font-mono font-bold text-slate-300">
                {leadB.rankBadge}
              </span>
            </div>

            {/* Team Crest, Flag & Identity */}
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="p-1.5 rounded-xl bg-slate-900 border border-slate-700 shadow-md flex items-center gap-2">
                  <TeamCrest teamId={teamB.id} size={36} />
                  <CountryFlag countryCode={teamB.id} size="md" />
                </div>
                <div>
                  <div className="flex items-center gap-2.5">
                    <h3 className="text-2xl font-black text-white tracking-tight">{teamB.name}</h3>
                    <img
                      src={getTeamFlagUrl(teamB.id)}
                      alt={`${teamB.name} flag`}
                      className="h-4 w-6 rounded-[2px] object-cover border border-slate-600"
                    />
                  </div>
                  <div className="flex flex-wrap items-center gap-3 text-xs text-slate-300 mt-1">
                    <span>Captain: <strong className="text-white">{leadB.captain}</strong></span>
                    <span className="text-slate-600">·</span>
                    <span>Coach: <strong className="text-slate-200">{leadB.coach}</strong></span>
                  </div>
                </div>
              </div>

              {/* Squad count */}
              <div className="text-right shrink-0">
                <p className="text-xs font-mono text-slate-400">Squad Size</p>
                <p className="text-sm font-bold font-mono text-slate-300">{teamB.squad.length} Players</p>
              </div>
            </div>

            {/* Win Probability Banner */}
            <div className="mt-5 rounded-xl border border-slate-800 bg-slate-900/50 p-3.5 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-mono text-slate-400 font-semibold">MATCH WIN PROBABILITY</span>
                <span className="font-mono font-black text-amber-400 text-sm tabular-nums">{probB}% WIN CHANCE</span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-slate-900">
                <div
                  className="h-full bg-gradient-to-r from-amber-600 to-amber-400 shadow-[0_0_12px_rgba(245,158,11,0.5)] transition-all duration-500"
                  style={{ width: `${probB}%` }}
                />
              </div>
            </div>

            {/* Captain Image Card */}
            <div className="mt-4">
              <CaptainImageCard
                team={teamB}
                variant="compact"
                onInspect={(p) => setActiveModalPlayer(p)}
              />
            </div>

            {/* Batting & Bowling Rating Gauges */}
            <div className="mt-5 grid grid-cols-2 gap-4">
              <div className="rounded-xl border border-slate-800/90 bg-slate-900/60 p-3.5 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400 font-medium">Batting Power</span>
                  <span className="font-mono font-bold text-white">{teamB.ratings.batting}/100</span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-slate-800 overflow-hidden">
                  <div className="h-full bg-amber-400" style={{ width: `${teamB.ratings.batting}%` }} />
                </div>
              </div>

              <div className="rounded-xl border border-slate-800/90 bg-slate-900/60 p-3.5 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400 font-medium">Bowling Depth</span>
                  <span className="font-mono font-bold text-white">{teamB.ratings.bowling}/100</span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-slate-800 overflow-hidden">
                  <div className="h-full bg-emerald-500" style={{ width: `${teamB.ratings.bowling}%` }} />
                </div>
              </div>
            </div>

            {/* Phase Stat Boxes */}
            <div className="mt-4 grid grid-cols-4 gap-2 text-center text-xs font-mono">
              <div className="rounded-lg border border-slate-800 bg-slate-950/80 p-2">
                <span className="text-[10px] text-slate-500 block">POWERPLAY</span>
                <span className="font-bold text-slate-200">{teamB.ratings.powerplay}</span>
              </div>
              <div className="rounded-lg border border-slate-800 bg-slate-950/80 p-2">
                <span className="text-[10px] text-slate-500 block">MIDDLE</span>
                <span className="font-bold text-slate-200">{teamB.ratings.middleOvers}</span>
              </div>
              <div className="rounded-lg border border-slate-800 bg-slate-950/80 p-2">
                <span className="text-[10px] text-slate-500 block">DEATH OVERS</span>
                <span className="font-bold text-amber-300">{teamB.ratings.deathOvers}</span>
              </div>
              <div className="rounded-lg border border-slate-800 bg-slate-950/80 p-2">
                <span className="text-[10px] text-slate-500 block">TITLES</span>
                <span className="font-bold text-amber-400">{teamB.worldCupTitles} 🏆</span>
              </div>
            </div>

            {/* Recent Form */}
            <div className="mt-4 flex items-center justify-between border-t border-slate-800/80 pt-3 text-xs">
              <span className="text-slate-400">Recent Form:</span>
              <div className="flex items-center gap-1.5">
                {teamB.recentForm.map((f, i) => (
                  <span
                    key={i}
                    className={`flex h-5 w-5 items-center justify-center rounded font-mono font-bold text-[11px] ${
                      f === 'W' ? 'bg-emerald-950 border border-emerald-500/40 text-emerald-300' : 'bg-rose-950 border border-rose-500/40 text-rose-300'
                    }`}
                  >
                    {f}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Dropdown Team Controls & Launch Action Panel */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 space-y-4 shadow-xl">
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-end">
            {/* Control 1: Change Your Team */}
            <div className="sm:col-span-5 space-y-2">
              <label className="text-xs font-mono font-bold uppercase tracking-wider text-cyan-300 flex items-center gap-1.5">
                <Shield className="h-3.5 w-3.5 text-cyan-400" />
                <span>Change Your Team</span>
              </label>
              <select
                value={teamAId}
                onChange={(e) => setTeamAId(e.target.value)}
                className="w-full rounded-xl border border-cyan-500/50 bg-slate-950 px-4 py-3 text-sm font-bold text-white focus:outline-none focus:ring-2 focus:ring-cyan-400 transition-all cursor-pointer"
              >
                {TEAMS.map((t) => (
                  <option key={t.id} value={t.id} disabled={t.id === teamBId}>
                    {t.name} · Rating: {t.ratings.overall}
                  </option>
                ))}
              </select>
            </div>

            {/* Swap Button */}
            <div className="sm:col-span-2 flex items-center justify-center">
              <button
                type="button"
                onClick={handleSwapTeams}
                title="Swap Your Team and Opponent Team"
                className="flex items-center justify-center h-12 w-12 rounded-xl border border-slate-700 bg-slate-800 text-slate-300 hover:text-white hover:border-cyan-400 hover:bg-slate-700 transition-all cursor-pointer"
              >
                <ArrowRightLeft className="h-4 w-4" />
              </button>
            </div>

            {/* Control 2: Change Opponent Team */}
            <div className="sm:col-span-5 space-y-2">
              <label className="text-xs font-mono font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                <Swords className="h-3.5 w-3.5 text-amber-400" />
                <span>Change Opponent Team</span>
              </label>
              <select
                value={teamBId}
                onChange={(e) => setTeamBId(e.target.value)}
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm font-bold text-white focus:outline-none focus:ring-2 focus:ring-amber-400 transition-all cursor-pointer"
              >
                {TEAMS.map((t) => (
                  <option key={t.id} value={t.id} disabled={t.id === teamAId}>
                    {t.name} · Rating: {t.ratings.overall}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Stadium Venue Selection Bar & Simulation Launch Buttons */}
          <div className="flex flex-wrap items-center justify-between gap-4 border-t border-slate-800 pt-4">
            <div className="flex flex-wrap items-center gap-3">
              <div className="h-11 w-20 rounded-lg overflow-hidden border border-slate-700 bg-slate-950 shrink-0">
                <StadiumPhoto
                  stadium={currentStadium}
                  alt={`${currentStadium.name}, ${currentStadium.city}`}
                  className="h-full w-full"
                  imgClassName="h-full w-full object-cover"
                />
              </div>
              <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
                <MapPin className="h-4 w-4 text-cyan-400" />
                <span>Venue:</span>
              </div>
              <select
                value={selectedStadiumId}
                onChange={(e) => setSelectedStadiumId(e.target.value)}
                className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-1.5 text-xs font-medium text-slate-200 focus:outline-none focus:ring-1 focus:ring-cyan-400 cursor-pointer"
              >
                {STADIUMS.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.city}, {s.country})
                  </option>
                ))}
              </select>

              <button
                type="button"
                onClick={() => setShowPitchInspector((prev) => !prev)}
                className={`rounded-lg border px-3 py-1.5 text-xs font-mono font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-sm ${
                  showPitchInspector
                    ? 'border-cyan-400 bg-cyan-500/20 text-cyan-300'
                    : 'border-cyan-500/30 bg-cyan-950/40 text-cyan-400 hover:bg-cyan-500/20 hover:text-white'
                }`}
              >
                <Compass className="h-3.5 w-3.5 text-cyan-400" />
                <span>{showPitchInspector ? 'Hide 22-Yard Pitch Inspector ▲' : 'Inspect 22-Yard Pitch Dynamics ▼'}</span>
              </button>
            </div>

            {/* Launch Buttons */}
            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={() => setActiveView('predictions')}
                className="rounded-xl border border-slate-700 bg-slate-800 px-4 py-2.5 text-xs font-bold text-slate-200 hover:text-white hover:border-slate-600 transition-all cursor-pointer"
              >
                Run Monte Carlo (5,000 Sim)
              </button>

              <button
                onClick={() => launchSimMatch(teamAId, teamBId, selectedStadiumId)}
                className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 via-sky-500 to-blue-600 px-6 py-2.5 text-xs font-black text-slate-950 shadow-[0_0_20px_rgba(6,182,212,0.4)] hover:shadow-[0_0_30px_rgba(6,182,212,0.7)] hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer"
              >
                <Play className="h-4 w-4 fill-current" />
                <span>LAUNCH BROADCAST MATCH</span>
                <TeamFlag code={teamA.id} size="xs" />
                <span>vs</span>
                <TeamFlag code={teamB.id} size="xs" />
              </button>
            </div>
          </div>

          {/* Expandable 22-Yard Pitch & Venue Inspector Section */}
          {showPitchInspector && (
            <div className="pt-4 border-t border-slate-800 animate-in fade-in duration-300">
              <PitchInspector stadiumName={`${currentStadium.name} (${currentStadium.city})`} />
            </div>
          )}
        </div>
      </section>

      {/* =========================================================================
          ANALYST DASHBOARD HUD & DAILY TACTICAL CHALLENGE
          ========================================================================= */}
      <section className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* User Intelligence Profile */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Award className="h-5 w-5 text-cyan-400" />
              <h2 className="text-sm font-bold text-white">Your Cricket Profile</h2>
            </div>
            <span className="text-xs text-slate-400 font-mono">Rank #{profile.level * 14 + 15}</span>
          </div>

          <div className="space-y-2">
            <div className="flex items-baseline justify-between">
              <div>
                <p className="text-lg font-bold text-white">{profile.rankTitle}</p>
                <p className="text-xs text-slate-400">Level {profile.level} Analyst</p>
              </div>
              <p className="text-xs font-mono text-cyan-400 font-semibold tabular-nums">
                {profile.xp.toLocaleString()} / {profile.nextLevelXp.toLocaleString()} XP
              </p>
            </div>

            {/* XP Progress Bar */}
            <div className="h-2 w-full overflow-hidden rounded-full bg-slate-800">
              <div
                className="h-full bg-gradient-to-r from-cyan-500 to-indigo-500 transition-all duration-500"
                style={{ width: `${Math.min(100, Math.round((profile.xp / profile.nextLevelXp) * 100))}%` }}
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3 border-t border-slate-800 pt-4 text-center">
            <div>
              <p className="text-base font-bold text-white tabular-nums">{profile.predictionAccuracy}%</p>
              <p className="text-xs text-slate-400">Accuracy</p>
            </div>
            <div>
              <p className="text-base font-bold text-cyan-400 tabular-nums">{profile.aiBattlesWon}</p>
              <p className="text-xs text-slate-400">AI Wins</p>
            </div>
            <div>
              <p className="text-base font-bold text-amber-400 tabular-nums">{profile.streakDays}d</p>
              <p className="text-xs text-slate-400">Streak</p>
            </div>
          </div>
        </div>

        {/* Daily Intelligence Challenge */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 space-y-4 lg:col-span-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Flame className="h-5 w-5 text-amber-400" />
              <h2 className="text-sm font-bold text-white">Today's Tactical Challenge</h2>
            </div>
            <span className="text-xs font-mono text-amber-400 font-medium">+250 XP REWARD</span>
          </div>

          <div className="space-y-2">
            <h3 className="text-base font-bold text-slate-100">
              Defend 14 Runs in the 20th Over vs Heinrich Klaasen
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Klaasen has a 184 SR against spin and 154 against pace. Choose between Bumrah's wide yorkers or hard-deck bouncers into the rib cage to seal the victory.
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-800 pt-3">
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <span>Difficulty: High</span>
              <span aria-hidden="true">·</span>
              <span>Time: 2 mins</span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setActiveView('you_vs_ai')}
                className="rounded-lg bg-cyan-500 px-4 py-2 text-xs font-bold text-slate-950 hover:bg-cyan-400 transition-colors cursor-pointer"
              >
                Accept Challenge
              </button>
              {!dailyClaimed ? (
                <button
                  onClick={handleClaimDaily}
                  className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-xs font-medium text-slate-200 hover:text-white transition-colors cursor-pointer"
                >
                  Quick Claim
                </button>
              ) : (
                <span className="text-xs text-emerald-400 font-medium">Claimed ✓</span>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          CRICKET AI ARENA HUB LAUNCHER (6 TACTICAL MODES)
          ========================================================================= */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold tracking-tight text-white">Cricket AI Arena</h2>
            <p className="text-xs text-slate-400">Explore interactive simulation modes, predictive engines, and tactical challenges.</p>
          </div>
          <button
            onClick={() => setActiveView('arena')}
            className="flex items-center gap-1 text-xs font-semibold text-cyan-400 hover:text-cyan-300 transition-colors cursor-pointer"
          >
            <span>View All Modes</span>
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {/* Card 1: You vs AI */}
          <div
            onClick={() => setActiveView('you_vs_ai')}
            className="group relative rounded-2xl border border-slate-800 bg-slate-900/50 p-5 hover:border-cyan-500/50 hover:bg-slate-900/80 transition-all cursor-pointer"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 mb-3 group-hover:scale-110 transition-transform">
              <Cpu className="h-5 w-5" />
            </div>
            <h3 className="text-sm font-bold text-white group-hover:text-cyan-300 transition-colors">You vs AI Mode</h3>
            <p className="mt-1 text-xs text-slate-400 leading-relaxed">
              Step into high-pressure chase situations. Make decisions and see if you outperform the AI Coach.
            </p>
            <div className="mt-4 flex items-center justify-between text-xs font-mono text-slate-500 border-t border-slate-800/80 pt-2.5">
              <span>+250 XP</span>
              <span className="text-cyan-400 font-medium group-hover:translate-x-1 transition-transform">Play →</span>
            </div>
          </div>

          {/* Card 2: Match Simulator */}
          <div
            onClick={() => setActiveView('simulator')}
            className="group relative rounded-2xl border border-slate-800 bg-slate-900/50 p-5 hover:border-emerald-500/50 hover:bg-slate-900/80 transition-all cursor-pointer"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 mb-3 group-hover:scale-110 transition-transform">
              <Play className="h-5 w-5" />
            </div>
            <h3 className="text-sm font-bold text-white group-hover:text-emerald-300 transition-colors">Live Match Simulator</h3>
            <p className="mt-1 text-xs text-slate-400 leading-relaxed">
              Ball-by-ball T20 simulation with TV broadcast DRS, Hawkeye ball tracking, and "Why Did Team Win" AI reports.
            </p>
            <div className="mt-4 flex items-center justify-between text-xs font-mono text-slate-500 border-t border-slate-800/80 pt-2.5">
              <span>DRS + Hawkeye</span>
              <span className="text-emerald-400 font-medium group-hover:translate-x-1 transition-transform">Simulate →</span>
            </div>
          </div>

          {/* Card 3: Match Predictor */}
          <div
            onClick={() => setActiveView('predictions')}
            className="group relative rounded-2xl border border-slate-800 bg-slate-900/50 p-5 hover:border-indigo-500/50 hover:bg-slate-900/80 transition-all cursor-pointer"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 mb-3 group-hover:scale-110 transition-transform">
              <TrendingUp className="h-5 w-5" />
            </div>
            <h3 className="text-sm font-bold text-white group-hover:text-indigo-300 transition-colors">Monte Carlo Predictor</h3>
            <p className="mt-1 text-xs text-slate-400 leading-relaxed">
              5,000 algorithmic simulations analyzing batting power, death bowling, dew, and pitch factors.
            </p>
            <div className="mt-4 flex items-center justify-between text-xs font-mono text-slate-500 border-t border-slate-800/80 pt-2.5">
              <span>82% Confidence</span>
              <span className="text-indigo-400 font-medium group-hover:translate-x-1 transition-transform">Predict →</span>
            </div>
          </div>

          {/* Card 4: What-If Lab */}
          <div
            onClick={() => setActiveView('whatif')}
            className="group relative rounded-2xl border border-slate-800 bg-slate-900/50 p-5 hover:border-purple-500/50 hover:bg-slate-900/80 transition-all cursor-pointer"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-500/10 border border-purple-500/30 text-purple-400 mb-3 group-hover:scale-110 transition-transform">
              <Zap className="h-5 w-5" />
            </div>
            <h3 className="text-sm font-bold text-white group-hover:text-purple-300 transition-colors">What-If Lab</h3>
            <p className="mt-1 text-xs text-slate-400 leading-relaxed">
              Test scenarios: What if Bumrah doesn't play? What if dew is extreme? Compare win percentage deltas.
            </p>
            <div className="mt-4 flex items-center justify-between text-xs font-mono text-slate-500 border-t border-slate-800/80 pt-2.5">
              <span>Scenario Engine</span>
              <span className="text-purple-400 font-medium group-hover:translate-x-1 transition-transform">Experiment →</span>
            </div>
          </div>

          {/* Card 5: Battle Cards */}
          <div
            onClick={() => setActiveView('battle_cards')}
            className="group relative rounded-2xl border border-slate-800 bg-slate-900/50 p-5 hover:border-rose-500/50 hover:bg-slate-900/80 transition-all cursor-pointer"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 mb-3 group-hover:scale-110 transition-transform">
              <Swords className="h-5 w-5" />
            </div>
            <h3 className="text-sm font-bold text-white group-hover:text-rose-300 transition-colors">Cricket Battle Cards</h3>
            <p className="mt-1 text-xs text-slate-400 leading-relaxed">
              Batter vs Bowler head-to-head duels with historical stats, exploited vulnerabilities, and win likelihood.
            </p>
            <div className="mt-4 flex items-center justify-between text-xs font-mono text-slate-500 border-t border-slate-800/80 pt-2.5">
              <span>Batter vs Bowler</span>
              <span className="text-rose-400 font-medium group-hover:translate-x-1 transition-transform">Duel →</span>
            </div>
          </div>

          {/* Card 6: AI Command Lab & Team Chemistry */}
          <div
            onClick={() => setActiveView('cricket_lab')}
            className="group relative rounded-2xl border border-slate-800 bg-slate-900/50 p-5 hover:border-amber-500/50 hover:bg-slate-900/80 transition-all cursor-pointer"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 mb-3 group-hover:scale-110 transition-transform">
              <Award className="h-5 w-5" />
            </div>
            <h3 className="text-sm font-bold text-white group-hover:text-amber-300 transition-colors">Team Chemistry & AI Lab</h3>
            <p className="mt-1 text-xs text-slate-400 leading-relaxed">
              Analyze Team Chemistry Scores (e.g. 🇮🇳 91/100), situational XIs, pitch micro-physics, and coach brains.
            </p>
            <div className="mt-4 flex items-center justify-between text-xs font-mono text-slate-500 border-t border-slate-800/80 pt-2.5">
              <span>91/100 Chemistry</span>
              <span className="text-amber-400 font-medium group-hover:translate-x-1 transition-transform">Enter Lab →</span>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          MATCH MVP MULTI-AXIS RADAR & 5-MATCH HISTORICAL FORM SPARKLINES
          ========================================================================= */}
      <MatchMvpRadarCard onInspectPlayer={(p) => setActiveModalPlayer(p)} />

      {/* =========================================================================
          FEATURED PLAYER INTELLIGENCE & TOURNAMENT POWER RANKINGS
          ========================================================================= */}
      <section className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Spotlight Player: Suryakumar Yadav */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono text-cyan-400 font-semibold">PLAYER INTELLIGENCE SPOTLIGHT</span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setActiveView('intelligence')}
                className="text-xs font-mono font-bold text-cyan-400 hover:text-cyan-300 transition-colors cursor-pointer"
              >
                Launch DNA Radar Suite →
              </button>
              <span className="text-slate-600">·</span>
              <button
                onClick={() => setActiveView('players')}
                className="text-xs text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                Universe
              </button>
            </div>
          </div>

          <div className="flex items-start gap-4">
            <div
              onClick={() => setActiveModalPlayer(spotlightPlayer)}
              className="cursor-pointer hover:scale-105 transition-transform"
              title="Click to view full Player Profile & DNA"
            >
              <PlayerCardAvatar
                playerId={spotlightPlayer.id}
                name={spotlightPlayer.name}
                countryCode={spotlightPlayer.countryCode}
                jerseyNumber={spotlightPlayer.jerseyNumber || 63}
                size="lg"
              />
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-lg font-bold text-white">{spotlightPlayer.name}</span>
                <CountryFlag countryCode={spotlightPlayer.countryCode} size="sm" />
              </div>
              <p className="text-xs text-slate-400">Middle-Order Batter · Impact Score: 96/100</p>
              <div className="flex flex-wrap items-center gap-3 pt-1 text-xs font-mono">
                <span className="text-slate-300">SR: <strong className="text-white">168.4</strong></span>
                <span className="text-slate-600">·</span>
                <span className="text-slate-300">Avg: <strong className="text-white">41.7</strong></span>
                <span className="text-slate-600">·</span>
                <span className="text-slate-300">Death SR: <strong className="text-cyan-400 font-bold">215.8</strong></span>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-slate-800/80 bg-slate-950 p-3.5 space-y-2">
            <p className="text-xs font-bold text-slate-200">AI Tactical Assessment:</p>
            <p className="text-xs text-slate-400 leading-relaxed">
              Unrivaled 360° scoring arc with 32% of death runs scored behind square leg. Superior execution against 140+ km/h pace. Containment strategy requires wide outside-off yorker traps.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={() => {
                setSelectedPlayerId(spotlightPlayer.id);
                setActiveView('intelligence');
              }}
              className="flex-1 rounded-xl border border-cyan-500/50 bg-gradient-to-r from-cyan-500/20 to-blue-500/20 py-2.5 text-xs font-bold text-cyan-300 hover:text-white hover:border-cyan-400 transition-all cursor-pointer shadow-md shadow-cyan-500/10"
            >
              Inspect Animated DNA Radar →
            </button>
            <button
              onClick={() => setActiveModalPlayer(spotlightPlayer)}
              className="rounded-xl border border-slate-800 bg-slate-950 px-4 py-2.5 text-xs font-semibold text-slate-300 hover:text-white transition-colors cursor-pointer"
            >
              Full Profile
            </button>
          </div>
        </div>

        {/* Global Team Ratings */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-white">Tournament Power Rankings</h2>
            <button
              onClick={() => setActiveView('rivalries')}
              className="text-xs text-cyan-400 hover:text-cyan-300 transition-colors cursor-pointer"
            >
              Rivalries & Venues →
            </button>
          </div>

          <div className="space-y-3">
            {TEAMS.slice(0, 4).map((team, idx) => (
              <div
                key={team.id}
                className="flex items-center justify-between rounded-xl border border-slate-800/80 bg-slate-950/60 p-3"
              >
                <div className="flex items-center gap-3">
                  <span className="text-xs font-mono text-slate-500 font-bold w-4">#{idx + 1}</span>
                  <CountryFlag countryCode={team.id} size="md" />
                  <div>
                    <span className="text-xs font-bold text-white">{team.name}</span>
                    <div className="flex items-center gap-1.5 text-xs text-slate-400 font-mono">
                      <span>BAT {team.ratings.batting}</span>
                      <span>·</span>
                      <span>BOWL {team.ratings.bowling}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex gap-1">
                    {team.recentForm.map((f, fIdx) => (
                      <span
                        key={fIdx}
                        className={`flex h-4 w-4 items-center justify-center rounded text-[10px] font-bold ${
                          f === 'W' ? 'bg-emerald-950 text-emerald-400' : 'bg-rose-950 text-rose-400'
                        }`}
                      >
                        {f}
                      </span>
                    ))}
                  </div>
                  <span className="text-sm font-black font-mono text-cyan-400 w-8 text-right">
                    {team.ratings.overall}
                  </span>
                </div>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between text-xs text-slate-400 pt-1">
            <span className="flex items-center gap-1">
              <Shield className="h-3.5 w-3.5 text-slate-500" /> Ratings calibrated to ICC T20 benchmarks
            </span>
            <button
              onClick={() => setActiveView('predictions')}
              className="text-cyan-400 hover:underline cursor-pointer"
            >
              Simulate Matchup →
            </button>
          </div>
        </div>
      </section>
      </>
      )}
    </div>
  );
};
