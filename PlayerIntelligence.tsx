import React, { useState, useMemo } from 'react';
import { useGame } from '../../context/GameContext';
import { TEAMS } from '../../data/cricketData';
import { Player } from '../../types/cricket';
import { CountryFlag, PlayerCardAvatar } from '../common/CricketIdentity';
import { PlayerDnaCard, computePlayerDnaMetrics } from './PlayerDnaCard';
import { CaptainImageCard } from '../common/CaptainImageCard';
import { ShotMapPitch } from '../common/ShotMapPitch';
import { MatchMvpBadgeSystem } from './MatchMvpBadgeSystem';
import {
  Zap,
  Shield,
  Target,
  Flame,
  Sparkles,
  Layers,
  Search,
  SlidersHorizontal,
  Swords,
  Scale,
  ArrowUpDown,
  Filter,
  CheckCircle2,
  TrendingUp,
  Activity,
  Crown,
  Award,
} from 'lucide-react';
import { cricketAudio } from '../../utils/audioSystem';

export const PlayerIntelligence: React.FC = () => {
  const { selectedPlayerId, setSelectedPlayerId, setActiveModalPlayer } = useGame();

  // All players pool with canonical teamId attached
  const allPlayers = useMemo(
    () => TEAMS.flatMap((t) => t.squad.map((p) => ({ ...p, teamId: t.id }))),
    []
  );
  const activePlayer = allPlayers.find((p) => p.id === selectedPlayerId) || allPlayers[0];

  // Rival comparison player for active DNA card overlay
  const [comparisonPlayerId, setComparisonPlayerId] = useState<string>('head');
  const comparisonPlayer = allPlayers.find((p) => p.id === comparisonPlayerId) || null;

  // View mode tab for the DNA Showcase section
  const [showcaseTab, setShowcaseTab] = useState<'marquee' | 'matrix' | 'clash' | 'captains' | 'mvp_badges'>('marquee');

  // Filtering & Sorting State for DNA Matrix
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTeam, setSelectedTeam] = useState<string>('all');
  const [selectedRole, setSelectedRole] = useState<'all' | 'Batter' | 'Bowler' | 'All-Rounder'>('all');
  const [selectedArchetype, setSelectedArchetype] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'dna' | 'power' | 'timing' | 'consistency' | 'pressure' | 'rating'>('dna');
  const [showAllMatrix, setShowAllMatrix] = useState<boolean>(false);

  // Dual Clash state
  const [clashPlayer1Id, setClashPlayer1Id] = useState<string>(activePlayer.id);
  const [clashPlayer2Id, setClashPlayer2Id] = useState<string>('bumrah');

  const clashPlayer1 = allPlayers.find((p) => p.id === clashPlayer1Id) || allPlayers[0];
  const clashPlayer2 = allPlayers.find((p) => p.id === clashPlayer2Id) || allPlayers[1];

  // Head to Head Battle state
  const [battleBatterId, setBattleBatterId] = useState<string>('sky');
  const [battleBowlerId, setBattleBowlerId] = useState<string>('starc');
  const [selectedShotZone, setSelectedShotZone] = useState<string>('Fine Leg');

  const batter = allPlayers.find((p) => p.id === battleBatterId) || allPlayers[0];
  const bowler = allPlayers.find((p) => p.id === battleBowlerId) || allPlayers[1];

  const currentZoneData = activePlayer.shotZones?.find((z) => z.zone === selectedShotZone) || {
    zone: selectedShotZone,
    runs: 380,
    strikeRate: 172,
    boundaryPercent: 26,
    dismissals: 4,
  };

  // Marquee featured players for the DNA Comparison Showcase
  const featuredDnaPlayerIds = ['sky', 'bumrah', 'head', 'klaasen', 'buttler', 'rashid', 'hasaranga', 'phillips'];
  const featuredDnaPlayers = useMemo(
    () =>
      featuredDnaPlayerIds
        .map((id) => allPlayers.find((p) => p.id === id))
        .filter((p): p is (typeof allPlayers)[number] => p !== undefined),
    [allPlayers]
  );

  // Filtered & Sorted players for Matrix view
  const filteredPlayers = useMemo(() => {
    return allPlayers
      .filter((p) => {
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchName = p.name.toLowerCase().includes(q);
          const matchCountry = p.country.toLowerCase().includes(q);
          if (!matchName && !matchCountry) return false;
        }

        if (selectedTeam !== 'all') {
          if (
            p.teamId.toLowerCase() !== selectedTeam.toLowerCase() &&
            p.countryCode.toLowerCase() !== selectedTeam.toLowerCase()
          ) {
            return false;
          }
        }

        if (selectedRole !== 'all') {
          if (!p.role.includes(selectedRole)) return false;
        }

        if (selectedArchetype !== 'all') {
          const metrics = computePlayerDnaMetrics(p);
          if (metrics.archetype !== selectedArchetype) return false;
        }

        return true;
      })
      .sort((a, b) => {
        const dnaA = computePlayerDnaMetrics(a);
        const dnaB = computePlayerDnaMetrics(b);

        if (sortBy === 'power') return dnaB.power - dnaA.power;
        if (sortBy === 'timing') return dnaB.timing - dnaA.timing;
        if (sortBy === 'consistency') return dnaB.consistency - dnaA.consistency;
        if (sortBy === 'pressure') return dnaB.pressureHandling - dnaA.pressureHandling;
        if (sortBy === 'rating') return b.rating - a.rating;

        // Default 'dna' overall score
        const scoreA = (dnaA.power + dnaA.timing + dnaA.consistency + dnaA.pressureHandling) / 4;
        const scoreB = (dnaB.power + dnaB.timing + dnaB.consistency + dnaB.pressureHandling) / 4;
        return scoreB - scoreA;
      });
  }, [allPlayers, searchQuery, selectedTeam, selectedRole, selectedArchetype, sortBy]);

  // Unique list of archetypes
  const availableArchetypes = useMemo(() => {
    const set = new Set<string>();
    allPlayers.forEach((p) => {
      set.add(computePlayerDnaMetrics(p).archetype);
    });
    return Array.from(set);
  }, [allPlayers]);

  const p1Dna = computePlayerDnaMetrics(clashPlayer1);
  const p2Dna = computePlayerDnaMetrics(clashPlayer2);

  return (
    <div className="max-w-7xl mx-auto space-y-12 pb-24 text-slate-100">
      {/* Title & Section Eyebrow */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-6">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-cyan-400 font-semibold tracking-wider uppercase">
            <Sparkles className="h-4 w-4 text-cyan-400 animate-pulse" />
            <span>PLAYER INTELLIGENCE & BIOMECHANICAL DNA SUITE</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight mt-1">
            Player DNA Telemetry & Scouting
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-2xl">
            Glowing glassmorphic Player DNA cards with animated radar charts measuring Power, Timing, Consistency, and Pressure Handling calibrated to international T20 telemetry.
          </p>
        </div>

        {/* Global Player Selector */}
        <div className="flex items-center gap-2">
          <label className="text-xs font-mono text-slate-400 whitespace-nowrap">Focus Player:</label>
          <select
            value={activePlayer.id}
            onChange={(e) => {
              setSelectedPlayerId(e.target.value);
              setClashPlayer1Id(e.target.value);
            }}
            className="rounded-xl border border-cyan-500/40 bg-slate-950 px-4 py-2.5 text-xs font-bold text-white focus:border-cyan-400 focus:outline-none focus:ring-1 focus:ring-cyan-400 cursor-pointer shadow-md"
          >
            {allPlayers.map((p) => (
              <option key={`${p.teamId}-${p.id}`} value={p.id}>
                {p.name} ({p.country} · {p.role})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* =========================================================================
          SECTION 1: ACTIVE PLAYER DNA CARD WITH ANIMATED RADAR CHART
          ========================================================================= */}
      <section className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
            <span className="flex h-2.5 w-2.5 rounded-full bg-cyan-400 shadow-[0_0_8px_#00F0FF]" />
            <span className="font-bold text-white uppercase tracking-wider">
              {activePlayer.name} · Biomechanical DNA Telemetry
            </span>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 text-xs font-mono">
              <label className="text-slate-400">Compare With:</label>
              <select
                value={comparisonPlayerId}
                onChange={(e) => setComparisonPlayerId(e.target.value)}
                className="rounded-lg border border-slate-700 bg-slate-950 px-2.5 py-1 text-xs font-semibold text-cyan-300 focus:border-cyan-400 cursor-pointer"
              >
                {allPlayers
                  .filter((p) => p.id !== activePlayer.id)
                  .map((p) => (
                    <option key={`${p.teamId}-${p.id}`} value={p.id}>
                      {p.name} ({p.country})
                    </option>
                  ))}
              </select>
            </div>

            <button
              onClick={() => setActiveModalPlayer(activePlayer)}
              className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-blue-600 via-sky-500 to-cyan-500 px-3.5 py-1.5 text-xs font-mono font-bold text-white shadow-[0_0_15px_rgba(6,182,212,0.4)] hover:shadow-[0_0_25px_rgba(6,182,212,0.7)] hover:scale-[1.02] transition-all cursor-pointer whitespace-nowrap"
            >
              <Target className="h-3.5 w-3.5 text-cyan-200" />
              <span>360° Wagon Wheel & Form →</span>
            </button>
          </div>
        </div>

        {/* The Headline Glowing Glassmorphic Player DNA Card */}
        <PlayerDnaCard
          player={activePlayer}
          comparisonPlayer={comparisonPlayer}
          onSelectPlayer={(id) => setSelectedPlayerId(id)}
        />
      </section>

      {/* =========================================================================
          SECTION 2: DNA SQUAD SHOWCASE, MATRIX & CLASH
          ========================================================================= */}
      <section className="space-y-6">
        <div className="space-y-3.5 border-b border-slate-800/80 pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2.5">
                <Layers className="h-5 w-5 text-cyan-400 shrink-0" />
                <span>International Player DNA Scouting Matrix</span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Explore animated 4-axis radar profiles across tournament stars with instant archetype and metric filtering.
              </p>
            </div>
            <span className="text-xs font-mono text-slate-400 tabular-nums shrink-0">
              {allPlayers.length} Indexed Players
            </span>
          </div>

          {/* Aligned 5-Column View Mode Tabs */}
          <div
            role="tablist"
            aria-label="Player Scouting Views"
            className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-1.5 rounded-xl bg-slate-950 p-1.5 border border-slate-800"
          >
            <button
              type="button"
              role="tab"
              aria-selected={showcaseTab === 'marquee'}
              onClick={() => {
                cricketAudio.playUiClick();
                setShowcaseTab('marquee');
              }}
              className={`h-9 rounded-lg px-3 text-xs font-mono font-bold transition-colors cursor-pointer inline-flex items-center justify-center whitespace-nowrap ${
                showcaseTab === 'marquee'
                  ? 'bg-cyan-500 text-slate-950'
                  : 'text-slate-400 hover:text-white hover:bg-slate-900'
              }`}
            >
              Marquee Stars
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={showcaseTab === 'matrix'}
              onClick={() => {
                cricketAudio.playUiClick();
                setShowcaseTab('matrix');
              }}
              className={`h-9 rounded-lg px-3 text-xs font-mono font-bold transition-colors cursor-pointer inline-flex items-center justify-center whitespace-nowrap tabular-nums ${
                showcaseTab === 'matrix'
                  ? 'bg-cyan-500 text-slate-950'
                  : 'text-slate-400 hover:text-white hover:bg-slate-900'
              }`}
            >
              Full Squad Matrix ({filteredPlayers.length})
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={showcaseTab === 'clash'}
              onClick={() => {
                cricketAudio.playUiClick();
                setShowcaseTab('clash');
              }}
              className={`h-9 rounded-lg px-3 text-xs font-mono font-bold transition-colors cursor-pointer inline-flex items-center justify-center whitespace-nowrap ${
                showcaseTab === 'clash'
                  ? 'bg-cyan-500 text-slate-950'
                  : 'text-slate-400 hover:text-white hover:bg-slate-900'
              }`}
            >
              Dual Radar Clash
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={showcaseTab === 'captains'}
              onClick={() => {
                cricketAudio.playUiClick();
                setShowcaseTab('captains');
              }}
              className={`h-9 rounded-lg px-3 text-xs font-mono font-bold transition-colors cursor-pointer inline-flex items-center justify-center gap-1.5 whitespace-nowrap ${
                showcaseTab === 'captains'
                  ? 'bg-amber-400 text-slate-950'
                  : 'text-slate-400 hover:text-white hover:bg-slate-900'
              }`}
            >
              <Crown className="w-3.5 h-3.5 shrink-0" />
              <span>National Skippers (12)</span>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={showcaseTab === 'mvp_badges'}
              onClick={() => {
                cricketAudio.playUiClick();
                setShowcaseTab('mvp_badges');
              }}
              className={`col-span-2 sm:col-span-1 h-9 rounded-lg px-3 text-xs font-mono font-bold transition-colors cursor-pointer inline-flex items-center justify-center gap-1.5 whitespace-nowrap ${
                showcaseTab === 'mvp_badges'
                  ? 'bg-amber-400 text-slate-950'
                  : 'text-slate-400 hover:text-white hover:bg-slate-900'
              }`}
            >
              <Award className="w-3.5 h-3.5 shrink-0" />
              <span>Match MVP Badges</span>
            </button>
          </div>
        </div>

        {/* TAB 1: MARQUEE SHOWCASE */}
        {showcaseTab === 'marquee' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {featuredDnaPlayers.map((p) => (
              <div
                key={p.id}
                className={`transition-all ${
                  p.id === activePlayer.id
                    ? 'ring-2 ring-cyan-400 rounded-2xl shadow-[0_0_20px_rgba(6,182,212,0.35)]'
                    : ''
                }`}
              >
                <PlayerDnaCard
                  player={p}
                  isCompact={true}
                  onSelectPlayer={(id) => {
                    setSelectedPlayerId(id);
                    setClashPlayer1Id(id);
                  }}
                />
              </div>
            ))}
          </div>
        )}

        {/* TAB 2: FULL SQUAD MATRIX WITH FILTERING */}
        {showcaseTab === 'matrix' && (
          <div className="space-y-6">
            {/* Filter Bar */}
            <div className="rounded-2xl border border-slate-800 bg-slate-950/80 p-4 space-y-3.5 backdrop-blur-xl">
              <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
                {/* Search */}
                <div className="md:col-span-4 relative">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search player or country..."
                    className="w-full rounded-xl border border-slate-700 bg-slate-900/90 pl-10 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:border-cyan-400 focus:outline-none"
                  />
                </div>

                {/* Role Filter */}
                <div className="md:col-span-3">
                  <select
                    value={selectedRole}
                    onChange={(e) => setSelectedRole(e.target.value as any)}
                    className="w-full rounded-xl border border-slate-700 bg-slate-900/90 px-3 py-2 text-xs font-semibold text-white focus:border-cyan-400 cursor-pointer"
                  >
                    <option value="all">All Roles (Batters, Bowlers, All-Rounders)</option>
                    <option value="Batter">Batters Only</option>
                    <option value="Bowler">Bowlers Only</option>
                    <option value="All-Rounder">All-Rounders Only</option>
                  </select>
                </div>

                {/* Archetype Filter */}
                <div className="md:col-span-3">
                  <select
                    value={selectedArchetype}
                    onChange={(e) => setSelectedArchetype(e.target.value)}
                    className="w-full rounded-xl border border-slate-700 bg-slate-900/90 px-3 py-2 text-xs font-semibold text-white focus:border-cyan-400 cursor-pointer"
                  >
                    <option value="all">All Archetypes</option>
                    {availableArchetypes.map((arch) => (
                      <option key={arch} value={arch}>
                        {arch}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Sort By */}
                <div className="md:col-span-2">
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as any)}
                    className="w-full rounded-xl border border-cyan-500/40 bg-slate-900/90 px-3 py-2 text-xs font-bold text-cyan-300 focus:border-cyan-400 cursor-pointer"
                  >
                    <option value="dna">Sort: Overall DNA</option>
                    <option value="power">Sort: Power</option>
                    <option value="timing">Sort: Timing</option>
                    <option value="consistency">Sort: Consistency</option>
                    <option value="pressure">Sort: Pressure</option>
                    <option value="rating">Sort: ICC Rating</option>
                  </select>
                </div>
              </div>
              {/* 12-Nation Flag Filter Strip */}
              <div className="flex items-center gap-1.5 overflow-x-auto pt-2 border-t border-slate-800/80 pb-1 scrollbar-none">
                <button
                  type="button"
                  onClick={() => setSelectedTeam('all')}
                  className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[11px] font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    selectedTeam === 'all'
                      ? 'bg-cyan-500 text-slate-950 font-bold'
                      : 'bg-slate-900 text-slate-300 border border-slate-800 hover:border-slate-700 hover:text-white'
                  }`}
                >
                  <span>All Nations ({allPlayers.length})</span>
                </button>
                {TEAMS.map((t) => {
                  const isActiveTeam = selectedTeam === t.id;
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setSelectedTeam(t.id)}
                      className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[11px] font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                        isActiveTeam
                          ? 'bg-cyan-500 text-slate-950 font-bold'
                          : 'bg-slate-900 text-slate-300 border border-slate-800 hover:border-slate-700 hover:text-white'
                      }`}
                    >
                      <CountryFlag countryCode={t.id} size="xs" />
                      <span>{t.name}</span>
                      <span className={`font-mono text-[10px] ${isActiveTeam ? 'text-slate-900' : 'text-slate-500'}`}>
                        ({t.squad.length})
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Matrix Cards Grid */}
            {(() => {
              const hasActiveFilter =
                selectedTeam !== 'all' ||
                searchQuery.trim() !== '' ||
                selectedRole !== 'all' ||
                selectedArchetype !== 'all' ||
                showAllMatrix;
              const displayedMatrixPlayers = hasActiveFilter
                ? filteredPlayers
                : filteredPlayers.slice(0, 24);

              return (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {displayedMatrixPlayers.map((p) => (
                      <div
                        key={`${p.teamId}-${p.id}`}
                        className={`transition-all ${
                          p.id === activePlayer.id
                            ? 'ring-2 ring-cyan-400 rounded-2xl shadow-[0_0_20px_rgba(6,182,212,0.35)]'
                            : ''
                        }`}
                      >
                        <PlayerDnaCard
                          player={p}
                          isCompact={true}
                          onSelectPlayer={(id) => {
                            setSelectedPlayerId(id);
                            setClashPlayer1Id(id);
                          }}
                        />
                      </div>
                    ))}
                  </div>

                  {filteredPlayers.length > 24 &&
                    selectedTeam === 'all' &&
                    !searchQuery.trim() &&
                    selectedRole === 'all' &&
                    selectedArchetype === 'all' && (
                      <div className="flex justify-center pt-2">
                        <button
                          type="button"
                          onClick={() => setShowAllMatrix((prev) => !prev)}
                          className="rounded-xl border border-cyan-500/40 bg-slate-900/90 px-5 py-2.5 text-xs font-mono font-bold text-cyan-300 hover:bg-cyan-500/15 hover:text-white transition-colors cursor-pointer"
                        >
                          {showAllMatrix
                            ? 'Collapse Matrix to Top 24 ↑'
                            : `Show All ${filteredPlayers.length} International Squad Players ↓`}
                        </button>
                      </div>
                    )}
                </>
              );
            })()}

            {filteredPlayers.length === 0 && (
              <div className="text-center py-12 text-slate-400 text-sm font-mono">
                No players match your search filter criteria.
              </div>
            )}
          </div>
        )}

        {/* TAB 3: DUAL RADAR CLASH ARENA */}
        {showcaseTab === 'clash' && (
          <div className="rounded-3xl border border-cyan-500/30 bg-gradient-to-br from-slate-900/90 via-slate-950 to-blue-950/70 p-6 sm:p-8 backdrop-blur-2xl shadow-[0_0_50px_rgba(6,182,212,0.15)] space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-cyan-500/20 pb-4">
              <div className="flex items-center gap-2">
                <Swords className="h-5 w-5 text-cyan-400" />
                <h3 className="text-xl font-black text-white">Dual DNA Radar Clash Arena</h3>
              </div>
              <span className="text-xs font-mono text-slate-400">
                Direct head-to-head metric differentials
              </span>
            </div>

            {/* Select Both Players */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="rounded-xl border border-cyan-500/40 bg-slate-950 p-3 space-y-1">
                <label className="text-[11px] font-mono text-cyan-400 block font-bold">
                  PLAYER 1 (CYAN RADAR)
                </label>
                <select
                  value={clashPlayer1Id}
                  onChange={(e) => setClashPlayer1Id(e.target.value)}
                  className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs font-bold text-white focus:border-cyan-400 cursor-pointer"
                >
                  {allPlayers.map((p) => (
                    <option key={`${p.teamId}-${p.id}`} value={p.id}>
                      {p.name} ({p.country} · {p.role})
                    </option>
                  ))}
                </select>
              </div>

              <div className="rounded-xl border border-amber-500/40 bg-slate-950 p-3 space-y-1">
                <label className="text-[11px] font-mono text-amber-400 block font-bold">
                  PLAYER 2 (GOLD RADAR)
                </label>
                <select
                  value={clashPlayer2Id}
                  onChange={(e) => setClashPlayer2Id(e.target.value)}
                  className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs font-bold text-white focus:border-amber-400 cursor-pointer"
                >
                  {allPlayers.map((p) => (
                    <option key={`${p.teamId}-${p.id}`} value={p.id}>
                      {p.name} ({p.country} · {p.role})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Side-by-Side Dual Radar Cards */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs font-mono px-2">
                  <span className="font-bold text-cyan-400">{clashPlayer1.name} DNA Profile</span>
                  <span className="text-slate-400">{clashPlayer1.role}</span>
                </div>
                <PlayerDnaCard
                  player={clashPlayer1}
                  comparisonPlayer={clashPlayer2}
                  onSelectPlayer={(id) => setSelectedPlayerId(id)}
                />
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs font-mono px-2">
                  <span className="font-bold text-amber-400">{clashPlayer2.name} DNA Profile</span>
                  <span className="text-slate-400">{clashPlayer2.role}</span>
                </div>
                <PlayerDnaCard
                  player={clashPlayer2}
                  comparisonPlayer={clashPlayer1}
                  onSelectPlayer={(id) => setSelectedPlayerId(id)}
                />
              </div>
            </div>

            {/* Clash Delta Comparative Summary Bar */}
            <div className="rounded-2xl border border-slate-800 bg-slate-950/80 p-5 space-y-3">
              <h4 className="text-xs font-mono font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <Scale className="h-4 w-4 text-cyan-400" />
                <span>Head-to-Head Metric Advantage Summary</span>
              </h4>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
                {[
                  {
                    name: 'Power',
                    val1: p1Dna.power,
                    val2: p2Dna.power,
                    diff: p1Dna.power - p2Dna.power,
                    color: '#f43f5e',
                  },
                  {
                    name: 'Timing',
                    val1: p1Dna.timing,
                    val2: p2Dna.timing,
                    diff: p1Dna.timing - p2Dna.timing,
                    color: '#06b6d4',
                  },
                  {
                    name: 'Consistency',
                    val1: p1Dna.consistency,
                    val2: p2Dna.consistency,
                    diff: p1Dna.consistency - p2Dna.consistency,
                    color: '#10b981',
                  },
                  {
                    name: 'Pressure Handling',
                    val1: p1Dna.pressureHandling,
                    val2: p2Dna.pressureHandling,
                    diff: p1Dna.pressureHandling - p2Dna.pressureHandling,
                    color: '#a855f7',
                  },
                ].map((m) => {
                  const p1Lead = m.diff > 0;
                  const tie = m.diff === 0;

                  return (
                    <div
                      key={m.name}
                      className="rounded-xl border border-slate-800 bg-slate-900/80 p-3 space-y-1.5"
                    >
                      <div className="flex items-center justify-between text-slate-400">
                        <span>{m.name}</span>
                        <span
                          className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                            tie
                              ? 'bg-slate-800 text-slate-300'
                              : p1Lead
                              ? 'bg-cyan-500/20 text-cyan-300'
                              : 'bg-amber-500/20 text-amber-300'
                          }`}
                        >
                          {tie ? 'EQUAL' : p1Lead ? `+${m.diff} ${clashPlayer1.name.split(' ')[0]}` : `+${Math.abs(m.diff)} ${clashPlayer2.name.split(' ')[0]}`}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-sm font-black">
                        <span className="text-cyan-400">{m.val1}</span>
                        <span className="text-slate-600">vs</span>
                        <span className="text-amber-400">{m.val2}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: NATIONAL CAPTAINS & LEADERS SHOWCASE */}
        {showcaseTab === 'captains' && (
          <div className="space-y-6">
            <div className="rounded-2xl border border-amber-500/30 bg-gradient-to-r from-amber-950/30 via-slate-950 to-slate-900/80 p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xl">
              <div>
                <span className="text-[10px] font-mono font-bold text-amber-400 uppercase tracking-widest block">
                  OFFICIAL LEADERSHIP MATRIX
                </span>
                <h3 className="text-xl sm:text-2xl font-black text-white mt-0.5">
                  12 ICC Full-Member Skippers & Captaincy DNA
                </h3>
                <p className="text-xs text-slate-400 mt-0.5 max-w-xl">
                  Real photos, tactical mindsets, win rates, and instant 360° Wagon Wheel analytics for every team captain.
                </p>
              </div>

              <div className="flex items-center gap-2 text-xs font-mono text-amber-300 bg-amber-950/40 border border-amber-500/30 px-3.5 py-2 rounded-xl">
                <Crown className="w-4 h-4 text-amber-400 shrink-0" />
                <span>Click any card for full 360° Wagon Wheel</span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {TEAMS.map((team) => (
                <CaptainImageCard
                  key={team.id}
                  team={team}
                  variant="card"
                  onInspect={(p) => setActiveModalPlayer(p)}
                />
              ))}
            </div>
          </div>
        )}

        {/* TAB 5: MATCH MVP BADGE SYSTEM & HALL OF DISTINCTION */}
        {showcaseTab === 'mvp_badges' && (
          <div className="space-y-6">
            <MatchMvpBadgeSystem player={activePlayer} showAllCatalog={true} />
          </div>
        )}
      </section>

      {/* =========================================================================
          SECTION 3: CAREER METRICS, TACTICAL DOSSIER & FULL-WIDTH PITCH SHOT MAP
          ========================================================================= */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
        {/* Main Career Dashboard Card */}
        <div className="lg:col-span-2 rounded-3xl border border-slate-800 bg-slate-900/70 p-6 sm:p-7 space-y-6 backdrop-blur-xl flex flex-col justify-between">
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
              <div className="flex items-center gap-4">
                <div
                  onClick={() => setActiveModalPlayer(activePlayer)}
                  className="cursor-pointer hover:scale-105 transition-transform"
                  title="Click for full profile"
                >
                  <PlayerCardAvatar
                    playerId={activePlayer.id}
                    name={activePlayer.name}
                    countryCode={activePlayer.teamId || activePlayer.countryCode}
                    jerseyNumber={activePlayer.jerseyNumber || 18}
                    imageUrl={activePlayer.imageUrl}
                    size="lg"
                  />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-xl sm:text-2xl font-black text-white">{activePlayer.name}</h3>
                    <CountryFlag countryCode={activePlayer.teamId || activePlayer.countryCode} size="sm" />
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {activePlayer.country} · {activePlayer.role} · {activePlayer.battingHand} · {activePlayer.bowlingStyle}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-5 text-right">
                <div>
                  <span className="text-xs text-slate-500 font-mono block">Rating</span>
                  <span className="text-2xl font-black text-cyan-400 tabular-nums">{activePlayer.rating}</span>
                </div>
                <div>
                  <span className="text-xs text-slate-500 font-mono block">Impact</span>
                  <span className="text-2xl font-black text-emerald-400 tabular-nums">
                    {activePlayer.stats.impactScore}/100
                  </span>
                </div>
              </div>
            </div>

            {/* Core Career Metrics Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
              <div className="rounded-xl border border-slate-800 bg-slate-950 p-3.5">
                <span className="text-slate-500 block mb-1">Matches</span>
                <span className="text-base font-bold text-white tabular-nums">{activePlayer.stats.matches}</span>
              </div>
              <div className="rounded-xl border border-slate-800 bg-slate-950 p-3.5">
                <span className="text-slate-500 block mb-1">Strike Rate</span>
                <span className="text-base font-bold text-cyan-400 tabular-nums">{activePlayer.stats.strikeRate}</span>
              </div>
              <div className="rounded-xl border border-slate-800 bg-slate-950 p-3.5">
                <span className="text-slate-500 block mb-1">Average</span>
                <span className="text-base font-bold text-white tabular-nums">{activePlayer.stats.average}</span>
              </div>
              <div className="rounded-xl border border-slate-800 bg-slate-950 p-3.5">
                <span className="text-slate-500 block mb-1">Boundary %</span>
                <span className="text-base font-bold text-amber-400 tabular-nums">{activePlayer.stats.boundaryPercent}%</span>
              </div>
            </div>
          </div>

          {/* Phase & Matchup Splits */}
          <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4.5 space-y-3">
            <h4 className="text-xs font-mono font-bold text-slate-200 tracking-wide">
              Phase & Delivery Intelligence Splits
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs font-mono">
              <div className="rounded-xl bg-slate-900/90 border border-slate-800 p-3">
                <span className="text-slate-400 block text-[11px]">Powerplay (1-6)</span>
                <span className="text-sm font-bold text-white tabular-nums">{activePlayer.stats.powerplaySR || 135.0} SR</span>
              </div>
              <div className="rounded-xl bg-slate-900/90 border border-slate-800 p-3">
                <span className="text-slate-400 block text-[11px]">Middle Overs (7-15)</span>
                <span className="text-sm font-bold text-white tabular-nums">{activePlayer.stats.middleSR || 148.0} SR</span>
              </div>
              <div className="rounded-xl bg-slate-900/90 border border-slate-800 p-3">
                <span className="text-slate-400 block text-[11px]">Death Overs (16-20)</span>
                <span className="text-sm font-bold text-cyan-400 tabular-nums">{activePlayer.stats.deathSR || 188.0} SR</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs font-mono pt-1">
              <div className="rounded-xl bg-slate-900/90 border border-slate-800 p-3 flex items-center justify-between">
                <span className="text-slate-400">vs Seam / Pace</span>
                <span className="font-bold text-white tabular-nums">{activePlayer.stats.paceSR || 152.0} SR</span>
              </div>
              <div className="rounded-xl bg-slate-900/90 border border-slate-800 p-3 flex items-center justify-between">
                <span className="text-slate-400">vs Spin Bowling</span>
                <span className="font-bold text-white tabular-nums">{activePlayer.stats.spinSR || 146.0} SR</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Tactical Strengths, Vulnerability & Selected Zone Telemetry */}
        <div className="lg:col-span-1 rounded-3xl border border-slate-800 bg-slate-900/70 p-6 space-y-4 backdrop-blur-xl flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <span className="text-xs font-mono text-cyan-400 font-bold tracking-wide">
                Scouting & Zone Dossier
              </span>
              <span className="text-xs text-slate-400 font-mono">{selectedShotZone}</span>
            </div>

            <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-4 space-y-2 text-xs">
              <span className="font-bold text-emerald-400 block font-mono">
                Tactical Strengths
              </span>
              <ul className="space-y-1.5 text-slate-300 list-disc list-inside leading-relaxed">
                {activePlayer.aiStrengths?.map((str, idx) => (
                  <li key={idx}>{str}</li>
                ))}
              </ul>
            </div>

            <div className="rounded-2xl border border-rose-500/20 bg-rose-500/5 p-4 space-y-2 text-xs">
              <span className="font-bold text-rose-400 block font-mono">
                Vulnerability Assessment
              </span>
              <p className="text-slate-300 leading-relaxed">{activePlayer.aiWeakness}</p>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4 space-y-2 text-xs font-mono tabular-nums">
            <div className="flex items-center justify-between text-slate-400">
              <span>Selected Sector: {currentZoneData.zone}</span>
              <span className="text-cyan-400 font-bold">{currentZoneData.strikeRate} SR</span>
            </div>
            <div className="grid grid-cols-3 gap-2 pt-1 text-[11px]">
              <div>
                <span className="text-slate-500 block">Runs</span>
                <strong className="text-white">{currentZoneData.runs}</strong>
              </div>
              <div>
                <span className="text-slate-500 block">Boundary</span>
                <strong className="text-amber-400">{currentZoneData.boundaryPercent}%</strong>
              </div>
              <div>
                <span className="text-slate-500 block">Outs</span>
                <strong className="text-rose-400">{currentZoneData.dismissals}</strong>
              </div>
            </div>
          </div>
        </div>

        {/* Full-Width 22-Yard Pitch Spin vs. Seam Impact Heatmap, Trajectory & Venue Legend Studio */}
        <div className="lg:col-span-3 rounded-3xl border border-slate-800 bg-slate-900/70 p-6 sm:p-7 space-y-4 backdrop-blur-xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-4">
            <div>
              <h3 className="text-base sm:text-lg font-bold text-white">
                22-Yard Spin vs. Seam Pitch Impact Heatmap &amp; Trajectory Studio
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Filter delivery lengths, toggle Match-to-Date vs. Historical Venue Average, inspect Ghost Trajectory variations, and listen to seam/spin turf impact audio
              </p>
            </div>
            <span className="text-xs text-slate-400 font-mono shrink-0">
              Simulated &amp; Historical Venue Telemetry
            </span>
          </div>

          <ShotMapPitch
            player={activePlayer}
            selectedZone={selectedShotZone}
            onSelectZone={(z) => setSelectedShotZone(z)}
            initialHeatmapActive={true}
          />
        </div>
      </section>

      {/* =========================================================================
          SECTION 4: BATTER VS BOWLER HEAD-TO-HEAD BATTLE ARENA
          ========================================================================= */}
      <section className="rounded-3xl border border-slate-800 bg-slate-900/70 p-6 sm:p-7 space-y-6 backdrop-blur-xl shadow-xl">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div className="flex items-center gap-2">
            <Swords className="h-5 w-5 text-rose-400" />
            <h2 className="text-lg font-bold text-white">Batter vs Bowler Tactical Battle</h2>
          </div>
          <span className="text-xs text-slate-400 font-mono">Head-to-head matchup modeling</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Select Batter */}
          <div>
            <label className="text-xs font-mono text-slate-400 block mb-1">SELECT BATTER</label>
            <select
              value={battleBatterId}
              onChange={(e) => setBattleBatterId(e.target.value)}
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-2.5 text-xs font-bold text-white focus:border-cyan-400 cursor-pointer"
            >
              {allPlayers
                .filter((p) => p.role.includes('Batter') || p.role.includes('All-Rounder'))
                .map((p) => (
                  <option key={`${p.teamId}-${p.id}`} value={p.id}>
                    {p.name} ({p.country}) · SR: {p.stats.strikeRate}
                  </option>
                ))}
            </select>
          </div>

          {/* Select Bowler */}
          <div>
            <label className="text-xs font-mono text-slate-400 block mb-1">SELECT BOWLER</label>
            <select
              value={battleBowlerId}
              onChange={(e) => setBattleBowlerId(e.target.value)}
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-2.5 text-xs font-bold text-white focus:border-rose-400 cursor-pointer"
            >
              {allPlayers
                .filter((p) => p.role.includes('Bowler') || p.role.includes('All-Rounder'))
                .map((p) => (
                  <option key={`${p.teamId}-${p.id}`} value={p.id}>
                    {p.name} ({p.country}) · Econ: {p.stats.economy || 7.5}
                  </option>
                ))}
            </select>
          </div>
        </div>

        {/* Head-to-Head Comparison Card */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-center text-xs">
          <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4.5 space-y-1">
            <span className="text-slate-500 font-mono">{batter.role}</span>
            <h3 className="text-base font-bold text-white">{batter.name}</h3>
            <p className="text-cyan-400 font-mono font-bold">{batter.stats.strikeRate} SR · {batter.stats.average} Avg</p>
          </div>

          <div className="rounded-2xl border border-purple-500/30 bg-purple-500/10 p-4.5 text-center space-y-1">
            <span className="text-[10px] font-mono text-purple-300 font-bold block uppercase tracking-wider">
              AI MATCHUP VERDICT
            </span>
            <p className="text-sm font-black text-white">
              {batter.stats.strikeRate > 155
                ? `${batter.name.split(' ')[0]} holds 58% edge`
                : `${bowler.name.split(' ')[0]} holds 62% suppression edge`}
            </p>
            <p className="text-[11px] text-slate-300">
              Optimal line: Wide outside-off yorker or cross-seam back-of-hand variation.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4.5 space-y-1 text-right">
            <span className="text-slate-500 font-mono">{bowler.role}</span>
            <h3 className="text-base font-bold text-white">{bowler.name}</h3>
            <p className="text-rose-400 font-mono font-bold">{bowler.stats.economy} Econ · {bowler.rating} Rating</p>
          </div>
        </div>
      </section>
    </div>
  );
};
