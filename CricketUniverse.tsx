import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useGame } from '../../context/GameContext';
import { TEAMS, STADIUMS } from '../../data/cricketData';
import { Player, Team, Stadium } from '../../types/cricket';
import { CountryFlag, TeamCrest, PlayerCardAvatar, getTeamFlagUrl } from '../common/CricketIdentity';
import { StadiumPhoto } from '../common/StadiumPhoto';
import {
  resolveStadiumImageUrl,
  resolveStadiumLandmarkCaption,
  verifyStadiumAssetUrl,
} from '../../data/stadiumImageCatalog';
import { VenueDetailModal } from '../common/VenueDetailModal';
import { SurfaceArOverlayModal } from '../common/SurfaceArOverlayModal';
import { TeamDossierBanner } from '../common/TeamDossierBanner';
import { CaptainImageCard } from '../common/CaptainImageCard';
import { RadarChart } from './RadarChart';
import { CommandersDashboard } from '../captains/CommandersDashboard';
import { PlayerComparisonModal } from '../players/PlayerComparisonModal';
import { NeonPlayerAnalyticsModal } from '../players/NeonPlayerAnalyticsModal';
import { VenueConditionsRadar } from '../common/VenueConditionsRadar';
import { PitchIntelligenceView } from '../common/PitchIntelligenceView';
import { VenueBallPhysicsHub } from '../common/VenueBallPhysicsHub';
import { StadiumCommandSuite } from '../common/StadiumCommandSuite';
import { VenueHistoryComparisonChart } from '../common/VenueHistoryComparisonChart';
import { PlayerProfileStatsSuite } from '../players/PlayerProfileStatsSuite';
import { BroadcastBallTrackingCanvas } from '../simulator/BroadcastBallTrackingCanvas';
import { getPlayerDNA, calculateTeamChemistry } from '../../utils/playerAnalytics';
import { cricketAudio } from '../../utils/audioSystem';
import {
  Users,
  Shield,
  MapPin,
  Search,
  Filter,
  ArrowUpDown,
  Sparkles,
  Zap,
  TrendingUp,
  Activity,
  Trophy,
  Swords,
  Layers,
  ChevronRight,
  Flame,
  Award,
  Wind,
  Droplets,
  Thermometer,
  Gauge,
  CheckCircle2,
  XCircle,
  X,
  Compass,
  Shuffle,
  Eye,
  Camera,
} from 'lucide-react';

export const CricketUniverse: React.FC = () => {
  const { setActiveModalPlayer, addXp, setActiveView, setSimStadiumId } = useGame();

  // Flag helper for venues
  const getVenueFlag = (country: string) => {
    const c = country.toLowerCase();
    if (c.includes('barbados') || c.includes('west indies')) return '🇧🇧';
    if (c.includes('india')) return '🇮🇳';
    if (c.includes('australia')) return '🇦🇺';
    if (c.includes('sri lanka')) return '🇱🇰';
    if (c.includes('england')) return '🏴󠁧󠁢󠁥󠁮󠁧󠁿';
    if (c.includes('uae') || c.includes('emirates')) return '🇦🇪';
    if (c.includes('south africa')) return '🇿🇦';
    if (c.includes('pakistan')) return '🇵🇰';
    if (c.includes('new zealand')) return '🇳🇿';
    if (c.includes('bangladesh')) return '🇧🇩';
    if (c.includes('ireland')) return '🇮🇪';
    if (c.includes('zimbabwe')) return '🇿🇼';
    return '🏟️';
  };

  // Top Universe Section Tabs: 'players' | 'teams' | 'venues'
  const [universeTab, setUniverseTab] = useState<'players' | 'teams' | 'venues'>('players');

  // All players flat list with canonical teamId attached
  const allPlayers = useMemo(
    () => TEAMS.flatMap((t) => t.squad.map((p) => ({ ...p, teamId: t.id }))),
    []
  );

  // -------------------------------------------------------------
  // PLAYERS SECTION STATE
  // -------------------------------------------------------------
  const [playerSearchQuery, setPlayerSearchQuery] = useState('');
  const [selectedRoleFilter, setSelectedRoleFilter] = useState<string>('ALL');
  const [selectedTeamFilter, setSelectedTeamFilter] = useState<string>('ALL');
  const [selectedFormFilter, setSelectedFormFilter] = useState<string>('ALL');
  const [playerSortBy, setPlayerSortBy] = useState<'rating' | 'strikeRate' | 'runs' | 'wickets' | 'economy'>('rating');

  // Compare Players state
  const [isCompareMode, setIsCompareMode] = useState(false);
  const [comparePlayerAId, setComparePlayerAId] = useState<string>('sky');
  const [comparePlayerBId, setComparePlayerBId] = useState<string>('head');
  const [isRadarModalOpen, setIsRadarModalOpen] = useState(false);
  const [radarTargetPlayerA, setRadarTargetPlayerA] = useState<Player | null>(null);
  const [radarTargetPlayerB, setRadarTargetPlayerB] = useState<Player | null>(null);

  // Expanded Full-Screen Player Profile
  const [inspectedPlayer, setInspectedPlayer] = useState<Player | null>(null);

  // -------------------------------------------------------------
  // TEAMS SECTION STATE
  // -------------------------------------------------------------
  const [selectedTeamId, setSelectedTeamId] = useState<string>('ind');
  const [teamsViewMode, setTeamsViewMode] = useState<'dossier' | 'all'>('dossier');
  const [isTeamCompareMode, setIsTeamCompareMode] = useState(false);
  const [compareTeamAId, setCompareTeamAId] = useState<string>('ind');
  const [compareTeamBId, setCompareTeamBId] = useState<string>('aus');

  // Custom Playing XI state per team (keyed by team.id)
  const [customPlayingXIs, setCustomPlayingXIs] = useState<Record<string, string[]>>(() => {
    const initial: Record<string, string[]> = {};
    TEAMS.forEach((t) => {
      // Default top 11
      initial[t.id] = t.squad.slice(0, 11).map((p) => p.id);
    });
    return initial;
  });

  const [aiBestXiNotification, setAiBestXiNotification] = useState<string | null>(null);

  // -------------------------------------------------------------
  // VENUES SECTION STATE
  // -------------------------------------------------------------
  const [selectedStadiumId, setSelectedStadiumId] = useState<string>('kensington');
  const [inspectedStadium, setInspectedStadium] = useState<Stadium | null>(null);
  const [venueSearchQuery, setVenueSearchQuery] = useState('');
  const [venueCountryFilter, setVenueCountryFilter] = useState('ALL');
  const [venuePitchFilter, setVenuePitchFilter] = useState('ALL');
  const [venueInspectionView, setVenueInspectionView] = useState<'atmospheric' | 'radar' | 'pitch-map' | 'hawkeye' | 'command-suite'>('atmospheric');
  const [venueMatchDay, setVenueMatchDay] = useState<number>(1);
  const [isVenueArOpen, setIsVenueArOpen] = useState<boolean>(false);
  const [venueAssetAudit, setVenueAssetAudit] = useState<{
    isScanning: boolean;
    verifiedCount: number;
    fallbackCount: number;
  }>({
    isScanning: false,
    verifiedCount: STADIUMS.length,
    fallbackCount: 0,
  });
  const [previewAllPlaceholders, setPreviewAllPlaceholders] = useState<boolean>(false);

  const runAsyncVenueAssetVerification = useCallback(async () => {
    setVenueAssetAudit((prev) => ({ ...prev, isScanning: true }));
    const results = await Promise.all(
      STADIUMS.map((st) => verifyStadiumAssetUrl(resolveStadiumImageUrl(st)))
    );
    const verifiedCount = results.filter((r) => r.ok).length;
    setVenueAssetAudit({
      isScanning: false,
      verifiedCount,
      fallbackCount: STADIUMS.length - verifiedCount,
    });
  }, []);

  useEffect(() => {
    if (universeTab === 'venues') {
      void runAsyncVenueAssetVerification();
    }
  }, [universeTab, runAsyncVenueAssetVerification]);

  // Filtered venues list
  const filteredStadiums = useMemo(() => {
    return STADIUMS.filter((s) => {
      const q = venueSearchQuery.toLowerCase();
      const matchesSearch =
        s.name.toLowerCase().includes(q) ||
        s.city.toLowerCase().includes(q) ||
        s.country.toLowerCase().includes(q);

      const matchesCountry =
        venueCountryFilter === 'ALL' ||
        s.country.toLowerCase().includes(venueCountryFilter.toLowerCase());

      const matchesPitch =
        venuePitchFilter === 'ALL' || s.pitchType === venuePitchFilter;

      return matchesSearch && matchesCountry && matchesPitch;
    });
  }, [venueSearchQuery, venueCountryFilter, venuePitchFilter]);

  // Filtered & Sorted Players
  const filteredPlayers = useMemo(() => {
    return allPlayers.filter((p) => {
      // Search
      const matchesSearch =
        p.name.toLowerCase().includes(playerSearchQuery.toLowerCase()) ||
        p.country.toLowerCase().includes(playerSearchQuery.toLowerCase()) ||
        p.role.toLowerCase().includes(playerSearchQuery.toLowerCase());

      // Role
      const matchesRole =
        selectedRoleFilter === 'ALL' ||
        (selectedRoleFilter === 'BATTER' && p.role.includes('Batter')) ||
        (selectedRoleFilter === 'BOWLER' && p.role.includes('Bowler')) ||
        (selectedRoleFilter === 'ALLROUNDER' && p.role.includes('All-Rounder')) ||
        (selectedRoleFilter === 'WICKETKEEPER' && p.role.includes('Wicketkeeper'));

      // Team
      const matchesTeam =
        selectedTeamFilter === 'ALL' ||
        p.teamId.toLowerCase() === selectedTeamFilter.toLowerCase() ||
        p.countryCode.toLowerCase() === selectedTeamFilter.toLowerCase();

      // Form
      const matchesForm =
        selectedFormFilter === 'ALL' ||
        (selectedFormFilter === 'HOT' && p.formRating >= 92) ||
        (selectedFormFilter === 'CONSISTENT' && p.formRating >= 85 && p.formRating < 92) ||
        (selectedFormFilter === 'SLUMP' && p.formRating < 85);

      return matchesSearch && matchesRole && matchesTeam && matchesForm;
    }).sort((a, b) => {
      if (playerSortBy === 'rating') return b.rating - a.rating;
      if (playerSortBy === 'strikeRate') return b.stats.strikeRate - a.stats.strikeRate;
      if (playerSortBy === 'runs') return b.stats.runs - a.stats.runs;
      if (playerSortBy === 'wickets') return b.stats.wickets - a.stats.wickets;
      if (playerSortBy === 'economy') return (a.stats.economy || 99) - (b.stats.economy || 99);
      return 0;
    });
  }, [allPlayers, playerSearchQuery, selectedRoleFilter, selectedTeamFilter, selectedFormFilter, playerSortBy]);

  // Selected active Team
  const activeTeam = useMemo(() => {
    return TEAMS.find((t) => t.id === selectedTeamId) || TEAMS[0];
  }, [selectedTeamId]);

  // Current Playing XI players
  const currentPlayingXiPlayerIds = customPlayingXIs[activeTeam.id] || activeTeam.squad.slice(0, 11).map((p) => p.id);
  const currentPlayingXi = useMemo(() => {
    return currentPlayingXiPlayerIds
      .map((id) => activeTeam.squad.find((p) => p.id === id))
      .filter((p): p is Player => p !== undefined);
  }, [currentPlayingXiPlayerIds, activeTeam]);

  // Current Bench players
  const currentBench = useMemo(() => {
    return activeTeam.squad.filter((p) => !currentPlayingXiPlayerIds.includes(p.id));
  }, [activeTeam, currentPlayingXiPlayerIds]);

  // Team Chemistry for current Playing XI
  const teamChemistry = useMemo(() => {
    return calculateTeamChemistry(currentPlayingXi);
  }, [currentPlayingXi]);

  // Active stadium
  const activeStadium = useMemo(() => {
    return STADIUMS.find((s) => s.id === selectedStadiumId) || STADIUMS[0];
  }, [selectedStadiumId]);

  // Best XI AI Algorithm
  const handleGenerateBestXI = () => {
    cricketAudio.playVictory();
    addXp(120, `AI Optimized Best XI for ${activeTeam.name}`);

    // Sort squad by strategic role balance
    const squad = [...activeTeam.squad];
    const wk = squad.find((p) => p.role.includes('Wicketkeeper')) || squad[0];
    const pacers = squad.filter((p) => p.role.includes('Pace Bowler')).sort((a, b) => b.rating - a.rating);
    const spinners = squad.filter((p) => p.role.includes('Spin Bowler')).sort((a, b) => b.rating - a.rating);
    const allRounders = squad.filter((p) => p.role.includes('All-Rounder')).sort((a, b) => b.rating - a.rating);
    const batters = squad.filter((p) => p.role.includes('Batter') && !p.role.includes('Wicketkeeper')).sort((a, b) => b.rating - a.rating);

    const selectedIds = new Set<string>();
    selectedIds.add(wk.id);
    batters.slice(0, 3).forEach((p) => selectedIds.add(p.id));
    allRounders.slice(0, 2).forEach((p) => selectedIds.add(p.id));
    pacers.slice(0, 3).forEach((p) => selectedIds.add(p.id));
    spinners.slice(0, 2).forEach((p) => selectedIds.add(p.id));

    // Fill remaining if under 11
    squad.sort((a, b) => b.rating - a.rating);
    for (const p of squad) {
      if (selectedIds.size >= 11) break;
      selectedIds.add(p.id);
    }

    const newXi = Array.from(selectedIds);
    setCustomPlayingXIs((prev) => ({ ...prev, [activeTeam.id]: newXi }));

    setAiBestXiNotification(
      `AI Coach Algorithmic XI Activated: Balanced 1 WK, 3 Specialists Batters, 2 Pace All-Rounders, 3 Express Quick, and 2 Spin Controllers for maximum 94% win probability.`
    );
    setTimeout(() => setAiBestXiNotification(null), 6000);
  };

  // Swap bench player into Playing XI
  const handleSwapPlayer = (benchPlayerId: string, xiPlayerId: string) => {
    cricketAudio.playBatHit();
    setCustomPlayingXIs((prev) => {
      const current = prev[activeTeam.id] || activeTeam.squad.slice(0, 11).map((p) => p.id);
      const updated = current.map((id) => (id === xiPlayerId ? benchPlayerId : id));
      return { ...prev, [activeTeam.id]: updated };
    });
  };

  // Cross interaction helpers
  const handleJumpToTeam = (teamId: string) => {
    setSelectedTeamId(teamId);
    setUniverseTab('teams');
    cricketAudio.playBoundary();
  };

  const handleJumpToPlayer = (playerId: string) => {
    const found = allPlayers.find((p) => p.id === playerId);
    if (found) {
      setInspectedPlayer(found);
      setUniverseTab('players');
      cricketAudio.playBatHit();
    }
  };

  const handleJumpToVenue = (venueId: string) => {
    setSelectedStadiumId(venueId);
    setUniverseTab('venues');
    cricketAudio.playDrsTone();
  };

  const handleSimulateAtVenue = (venueId: string) => {
    setSelectedStadiumId(venueId);
    setSimStadiumId(venueId);
    cricketAudio.playBoundary();
    setActiveView('simulator');
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-20 font-sans">
      {/* Top Header & Universe Navigation */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-5 border-b border-slate-800 pb-6">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono font-bold text-sky-400">
            <Compass className="h-4 w-4" />
            <span>CRICKET UNIVERSE COMMAND CENTER</span>
            <span aria-hidden="true">·</span>
            <span className="text-amber-400">INTELLIGENCE NETWORK</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight mt-1">
            Players, Teams & Stadiums
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-2xl">
            Explore deep player DNA radar telemetry, interactive Playing XI chemistry with AI lineup optimization, and cinematic venue physics.
          </p>
        </div>

        {/* Universe Sub-Hub Switcher */}
        <div className="flex items-center gap-2 rounded-2xl border border-slate-800 bg-slate-900/90 p-1.5 shadow-xl backdrop-blur-md">
          <button
            onClick={() => {
              setUniverseTab('players');
              cricketAudio.playBatHit();
            }}
            className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition-all cursor-pointer ${
              universeTab === 'players'
                ? 'bg-sky-500 text-slate-950 shadow-lg shadow-sky-500/25 scale-102'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Users className="h-4 w-4" />
            <span>Players Hub ({allPlayers.length})</span>
          </button>

          <button
            onClick={() => {
              setUniverseTab('teams');
              cricketAudio.playBoundary();
            }}
            className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition-all cursor-pointer ${
              universeTab === 'teams'
                ? 'bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/25 scale-102'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Shield className="h-4 w-4" />
            <span>Teams & Playing XI ({TEAMS.length})</span>
          </button>

          <button
            onClick={() => {
              setUniverseTab('venues');
              cricketAudio.playDrsTone();
            }}
            className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition-all cursor-pointer ${
              universeTab === 'venues'
                ? 'bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/25 scale-102'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <MapPin className="h-4 w-4" />
            <span>Venues & DNA ({STADIUMS.length})</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SECTION 1: PLAYERS HUB                                                    */}
      {/* ========================================================================= */}
      {universeTab === 'players' && (
        <div className="space-y-6 animate-in fade-in duration-300">
          {/* Controls Bar: Search, Filters, Sorting, Compare Mode */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 space-y-4 backdrop-blur-md">
            <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
              {/* Search input */}
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search player name, team, or bowling style..."
                  value={playerSearchQuery}
                  onChange={(e) => setPlayerSearchQuery(e.target.value)}
                  className="w-full rounded-xl border border-slate-800 bg-slate-950 pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:border-sky-500 focus:outline-none"
                />
                {playerSearchQuery && (
                  <button
                    onClick={() => setPlayerSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white cursor-pointer"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>

              {/* Compare Mode Toggle */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    const pA = allPlayers.find((p) => p.id === comparePlayerAId) || allPlayers[0];
                    const pB = allPlayers.find((p) => p.id === comparePlayerBId) || allPlayers[1];
                    setRadarTargetPlayerA(pA);
                    setRadarTargetPlayerB(pB);
                    setIsRadarModalOpen(true);
                    cricketAudio.playBatHit();
                  }}
                  className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 px-4 py-2.5 text-xs font-black text-slate-950 shadow-[0_0_18px_rgba(6,182,212,0.4)] hover:brightness-110 transition-all cursor-pointer border border-cyan-300"
                >
                  <Swords className="h-4 w-4" />
                  <span>Radar Comparison Modal</span>
                </button>

                <button
                  onClick={() => {
                    setIsCompareMode(!isCompareMode);
                    cricketAudio.playBatHit();
                  }}
                  className={`flex items-center gap-2 rounded-xl px-3.5 py-2.5 text-xs font-bold transition-all cursor-pointer ${
                    isCompareMode
                      ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/25 ring-2 ring-rose-400'
                      : 'border border-slate-800 bg-slate-950 text-slate-300 hover:border-slate-700 hover:text-white'
                  }`}
                >
                  <ArrowUpDown className="h-4 w-4" />
                  <span>{isCompareMode ? 'Hide Inline Duel' : 'Inline Duel'}</span>
                </button>
              </div>
            </div>

            {/* Filter Pills and Dropdowns */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-800/80 pt-3 text-xs">
              {/* Role filter buttons */}
              <div className="flex flex-wrap items-center gap-1.5 font-mono">
                {['ALL', 'BATTER', 'BOWLER', 'ALLROUNDER', 'WICKETKEEPER'].map((role) => (
                  <button
                    key={role}
                    onClick={() => setSelectedRoleFilter(role)}
                    className={`rounded-lg px-3 py-1.5 transition-colors cursor-pointer ${
                      selectedRoleFilter === role
                        ? 'bg-sky-500 text-slate-950 font-bold'
                        : 'bg-slate-950 text-slate-400 hover:text-white'
                    }`}
                  >
                    {role}
                  </button>
                ))}
              </div>

              {/* Team and Form Filter Dropdowns */}
              <div className="flex flex-wrap items-center gap-2">
                <select
                  value={selectedTeamFilter}
                  onChange={(e) => setSelectedTeamFilter(e.target.value)}
                  className="rounded-lg border border-slate-800 bg-slate-950 px-3 py-1.5 text-xs text-slate-200 cursor-pointer"
                >
                  <option value="ALL">All Nations</option>
                  {TEAMS.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>

                <select
                  value={selectedFormFilter}
                  onChange={(e) => setSelectedFormFilter(e.target.value)}
                  className="rounded-lg border border-slate-800 bg-slate-950 px-3 py-1.5 text-xs text-slate-200 cursor-pointer"
                >
                  <option value="ALL">All Form</option>
                  <option value="HOT">🔥 In Hot Form (92%+)</option>
                  <option value="CONSISTENT">⚡ Solid Form (85-91%)</option>
                  <option value="SLUMP">⚠️ In Dip (&lt;85%)</option>
                </select>

                <div className="flex items-center gap-1.5 pl-2 border-l border-slate-800">
                  <span className="text-[11px] font-mono text-slate-500">SORT:</span>
                  <select
                    value={playerSortBy}
                    onChange={(e) => setPlayerSortBy(e.target.value as any)}
                    className="rounded-lg border border-slate-800 bg-slate-950 px-2.5 py-1.5 text-xs font-bold text-sky-400 cursor-pointer"
                  >
                    <option value="rating">Rating (Highest)</option>
                    <option value="strikeRate">Strike Rate</option>
                    <option value="runs">Total Runs</option>
                    <option value="wickets">Wickets</option>
                    <option value="economy">Economy (Lowest)</option>
                  </select>
                </div>
              </div>
            </div>

            {/* 12-Nation Flag Quick Filter Strip */}
            <div className="flex items-center gap-1.5 overflow-x-auto pt-2 border-t border-slate-800/70 pb-1 scrollbar-none">
              <button
                type="button"
                onClick={() => setSelectedTeamFilter('ALL')}
                className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[11px] font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  selectedTeamFilter === 'ALL'
                    ? 'bg-sky-500 text-slate-950 font-bold'
                    : 'bg-slate-950 text-slate-300 border border-slate-800 hover:border-slate-700 hover:text-white'
                }`}
              >
                <span>All Nations ({allPlayers.length})</span>
              </button>
              {TEAMS.map((t) => {
                const isSelected = selectedTeamFilter.toLowerCase() === t.id.toLowerCase();
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setSelectedTeamFilter(t.id)}
                    className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[11px] font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                      isSelected
                        ? 'bg-sky-500 text-slate-950 font-bold'
                        : 'bg-slate-950 text-slate-300 border border-slate-800 hover:border-slate-700 hover:text-white'
                    }`}
                  >
                    <CountryFlag countryCode={t.id} size="xs" />
                    <span>{t.name}</span>
                    <span className={`font-mono text-[10px] ${isSelected ? 'text-slate-900' : 'text-slate-500'}`}>
                      ({t.squad.length})
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* COMPARE PLAYERS VIEW (When active) */}
          {isCompareMode && (
            <div className="rounded-3xl border border-rose-500/40 bg-slate-950 p-6 sm:p-8 space-y-6 shadow-2xl backdrop-blur-xl animate-in zoom-in-95 duration-200">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-rose-500/20 pb-4">
                <div className="flex items-center gap-2 text-rose-400 font-mono font-bold text-xs">
                  <Swords className="h-4 w-4" />
                  <span>HEAD-TO-HEAD DUEL & RADAR COMPARISON</span>
                </div>
                <button
                  onClick={() => setIsCompareMode(false)}
                  className="text-xs text-slate-400 hover:text-white cursor-pointer"
                >
                  Close Comparison ✕
                </button>
              </div>

              {/* Selector Bar for Players A & B */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-4 space-y-2">
                  <span className="text-[10px] font-mono text-sky-400 font-bold block">CONTENDER A</span>
                  <select
                    value={comparePlayerAId}
                    onChange={(e) => setComparePlayerAId(e.target.value)}
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs font-bold text-white cursor-pointer"
                  >
                    {allPlayers.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.country} · {p.role})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-4 space-y-2">
                  <span className="text-[10px] font-mono text-amber-400 font-bold block">CONTENDER B</span>
                  <select
                    value={comparePlayerBId}
                    onChange={(e) => setComparePlayerBId(e.target.value)}
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs font-bold text-white cursor-pointer"
                  >
                    {allPlayers.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.country} · {p.role})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Side-by-Side Comparison Matrix */}
              {(() => {
                const playerA = allPlayers.find((p) => p.id === comparePlayerAId) || allPlayers[0];
                const playerB = allPlayers.find((p) => p.id === comparePlayerBId) || allPlayers[1];
                const dnaA = getPlayerDNA(playerA);
                const dnaB = getPlayerDNA(playerB);

                const metrics = [
                  { label: 'Overall Rating', a: playerA.rating, b: playerB.rating, format: '' },
                  { label: 'Impact Score', a: playerA.stats.impactScore, b: playerB.stats.impactScore, format: '/100' },
                  { label: 'Strike Rate', a: playerA.stats.strikeRate, b: playerB.stats.strikeRate, format: '' },
                  { label: 'Batting Average', a: playerA.stats.average, b: playerB.stats.average, format: '' },
                  { label: 'Pressure Handling', a: dnaA.pressureScore, b: dnaB.pressureScore, format: '/100' },
                  { label: 'Aggression Index', a: dnaA.aggression, b: dnaB.aggression, format: '/100' },
                  { label: 'Death Overs Index', a: dnaA.deathOversIndex, b: dnaB.deathOversIndex, format: '/100' },
                  { label: 'Pace Matchup', a: dnaA.paceMatchup, b: dnaB.paceMatchup, format: '/100' },
                  { label: 'Spin Matchup', a: dnaA.spinMatchup, b: dnaB.spinMatchup, format: '/100' },
                ];

                return (
                  <div className="space-y-6">
                    {/* Contenders Visual Headers */}
                    <div className="grid grid-cols-2 gap-4 text-center">
                      <div className="rounded-2xl border border-sky-500/40 bg-sky-950/20 p-4 space-y-2">
                        <div className="flex justify-center">
                          <PlayerCardAvatar
                            playerId={playerA.id}
                            name={playerA.name}
                            countryCode={playerA.teamId || playerA.countryCode}
                            jerseyNumber={playerA.jerseyNumber || 18}
                            imageUrl={playerA.imageUrl}
                            size="lg"
                          />
                        </div>
                        <h4 className="text-base font-black text-white">{playerA.name}</h4>
                        <p className="text-xs text-sky-400 font-mono">{playerA.country} · {playerA.role}</p>
                      </div>

                      <div className="rounded-2xl border border-amber-500/40 bg-amber-950/20 p-4 space-y-2">
                        <div className="flex justify-center">
                          <PlayerCardAvatar
                            playerId={playerB.id}
                            name={playerB.name}
                            countryCode={playerB.teamId || playerB.countryCode}
                            jerseyNumber={playerB.jerseyNumber || 18}
                            imageUrl={playerB.imageUrl}
                            size="lg"
                          />
                        </div>
                        <h4 className="text-base font-black text-white">{playerB.name}</h4>
                        <p className="text-xs text-amber-400 font-mono">{playerB.country} · {playerB.role}</p>
                      </div>
                    </div>

                    {/* Metric Comparison Bars */}
                    <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 space-y-3 font-mono text-xs">
                      {metrics.map((m, idx) => {
                        const aWins = m.a > m.b;
                        const bWins = m.b > m.a;
                        const maxVal = Math.max(m.a, m.b, 100);

                        return (
                          <div key={idx} className="space-y-1">
                            <div className="flex items-center justify-between">
                              <span className={`font-bold ${aWins ? 'text-sky-400' : 'text-slate-400'}`}>
                                {m.a}{m.format} {aWins && '✓'}
                              </span>
                              <span className="text-[11px] font-bold text-slate-300">{m.label}</span>
                              <span className={`font-bold ${bWins ? 'text-amber-400' : 'text-slate-400'}`}>
                                {bWins && '✓ '} {m.b}{m.format}
                              </span>
                            </div>

                            <div className="flex h-2 w-full rounded-full bg-slate-950 overflow-hidden gap-1">
                              <div
                                className="h-full bg-sky-500 rounded-l transition-all duration-500"
                                style={{ width: `${(m.a / (m.a + m.b || 1)) * 100}%` }}
                              />
                              <div
                                className="h-full bg-amber-500 rounded-r transition-all duration-500"
                                style={{ width: `${(m.b / (m.a + m.b || 1)) * 100}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}
            </div>
          )}

          {/* Players Grid (Animated Premium Cards) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredPlayers.map((player) => {
              const isHot = player.formRating >= 92;
              const isCold = player.formRating < 85;

              return (
                <div
                  key={`${player.teamId}-${player.id}`}
                  onClick={() => {
                    setInspectedPlayer(player);
                    cricketAudio.playBatHit();
                  }}
                  className="group relative rounded-2xl border border-slate-800 bg-slate-900/70 p-5 hover:border-sky-500/60 hover:bg-slate-900 transition-all duration-300 shadow-lg hover:shadow-sky-500/10 hover:-translate-y-1 cursor-pointer flex flex-col justify-between overflow-hidden"
                >
                  {/* Accent team ambient glow on card corner */}
                  <div className="absolute top-0 right-0 w-28 h-28 bg-radial from-sky-500/10 via-transparent to-transparent pointer-events-none" />

                  {/* Top Header: Avatar + National Flag + Rating */}
                  <div className="space-y-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <PlayerCardAvatar
                          playerId={player.id}
                          name={player.name}
                          countryCode={player.teamId || player.countryCode}
                          jerseyNumber={player.jerseyNumber || 18}
                          imageUrl={player.imageUrl}
                          size="md"
                        />
                        <div>
                          <div className="flex items-center gap-1.5">
                            <CountryFlag countryCode={player.teamId || player.countryCode} size="sm" />
                            <span className="text-[11px] font-mono text-slate-400 font-bold uppercase truncate">
                              {player.country}
                            </span>
                          </div>
                          <h3 className="text-sm font-black text-white group-hover:text-sky-300 transition-colors truncate">
                            {player.name}
                          </h3>
                          <span className="text-[10px] text-slate-400 block truncate">{player.role}</span>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <span className="text-lg font-black text-sky-400 font-mono tabular-nums">
                          {player.rating}
                        </span>
                        <span className="text-[9px] text-slate-500 block font-mono">OVR</span>
                      </div>
                    </div>

                    {/* Form indicator ribbon */}
                    <div className="flex items-center justify-between text-[11px] font-mono">
                      <span className="text-slate-400">Current Form:</span>
                      <span
                        className={`font-bold px-2 py-0.5 rounded-full ${
                          isHot
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                            : isCold
                            ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                            : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                        }`}
                      >
                        {isHot ? '🔥 Hot' : isCold ? '⚠️ Dip' : '⚡ Solid'} ({player.formRating}%)
                      </span>
                    </div>

                    {/* 4 Core Stats Grid */}
                    <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                      <div className="rounded-xl border border-slate-800 bg-slate-950 p-2.5">
                        <span className="text-[10px] text-slate-500 block">CAREER RUNS</span>
                        <span className="font-bold text-white tabular-nums">{player.stats.runs.toLocaleString()}</span>
                      </div>
                      <div className="rounded-xl border border-slate-800 bg-slate-950 p-2.5">
                        <span className="text-[10px] text-slate-500 block">STRIKE RATE</span>
                        <span className="font-bold text-sky-400 tabular-nums">{player.stats.strikeRate}</span>
                      </div>
                      <div className="rounded-xl border border-slate-800 bg-slate-950 p-2.5">
                        <span className="text-[10px] text-slate-500 block">WICKETS</span>
                        <span className="font-bold text-emerald-400 tabular-nums">{player.stats.wickets}</span>
                      </div>
                      <div className="rounded-xl border border-slate-800 bg-slate-950 p-2.5">
                        <span className="text-[10px] text-slate-500 block">ECONOMY</span>
                        <span className="font-bold text-amber-400 tabular-nums">{player.stats.economy || 'N/A'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Footer CTAs: View DNA Profile & Jump to Team */}
                  <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between text-xs">
                    <span className="text-sky-400 font-bold group-hover:translate-x-1 transition-transform flex items-center gap-1">
                      <span>Inspect DNA</span>
                      <ChevronRight className="h-3 w-3" />
                    </span>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleJumpToTeam(player.teamId || player.countryCode.toLowerCase());
                      }}
                      className="text-[11px] font-mono text-slate-400 hover:text-white underline cursor-pointer"
                    >
                      Squad →
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {filteredPlayers.length === 0 && (
            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-12 text-center space-y-3">
              <Search className="h-8 w-8 text-slate-600 mx-auto" />
              <p className="text-sm font-bold text-slate-300">No players matched your filter criteria.</p>
              <button
                onClick={() => {
                  setPlayerSearchQuery('');
                  setSelectedRoleFilter('ALL');
                  setSelectedTeamFilter('ALL');
                  setSelectedFormFilter('ALL');
                }}
                className="text-xs text-sky-400 underline cursor-pointer"
              >
                Reset all filters
              </button>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* SECTION 2: TEAMS & PLAYING XI HUB                                        */}
      {/* ========================================================================= */}
      {universeTab === 'teams' && (
        <div className="space-y-8 animate-in fade-in duration-300">

          {/* Teams Header Bar with Mode Toggle */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
            <div>
              <h3 className="text-xl font-black text-white tracking-tight flex items-center gap-2">
                <Shield className="h-5 w-5 text-cyan-400" />
                <span>ICC Full Member Teams Directory</span>
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Explore official national boards, team rankings, leadership analytics, and manage active Playing XIs.
              </p>
            </div>

            <div className="flex items-center gap-2 bg-slate-900/90 border border-slate-800 p-1 rounded-xl self-start sm:self-auto">
              <button
                onClick={() => setTeamsViewMode('dossier')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  teamsViewMode === 'dossier'
                    ? 'bg-cyan-500 text-slate-950 shadow-md font-black'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Active Dossier & XI
              </button>
              <button
                onClick={() => setTeamsViewMode('all')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  teamsViewMode === 'all'
                    ? 'bg-cyan-500 text-slate-950 shadow-md font-black'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                All 12 Teams List
              </button>
            </div>
          </div>

          {/* If in 'all' view mode, display ALL 12 teams in the exact user-requested banner pattern */}
          {teamsViewMode === 'all' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-4">
                {TEAMS.map((team) => (
                  <TeamDossierBanner
                    key={team.id}
                    team={team}
                    interactive
                    isSelected={team.id === selectedTeamId}
                    onSelect={() => {
                      setSelectedTeamId(team.id);
                      setTeamsViewMode('dossier');
                      cricketAudio.playBatHit();
                    }}
                    onInspectCaptain={(_capName, capPlayer) => {
                      if (capPlayer) {
                        setInspectedPlayer(capPlayer);
                        cricketAudio.playBatHit();
                      }
                    }}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Team Quick Selector Row (Horizontal Grid) */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 xl:grid-cols-12 gap-2.5">
            {TEAMS.map((team) => {
              const isSelected = team.id === selectedTeamId;
              return (
                <button
                  key={team.id}
                  onClick={() => {
                    setSelectedTeamId(team.id);
                    setTeamsViewMode('dossier');
                    cricketAudio.playBatHit();
                  }}
                  className={`rounded-2xl border p-2.5 text-center transition-all cursor-pointer flex flex-col items-center gap-2 ${
                    isSelected
                      ? 'border-cyan-400 bg-cyan-950/40 shadow-xl shadow-cyan-500/20 scale-102 ring-1 ring-cyan-400'
                      : 'border-slate-800 bg-slate-900/80 text-slate-400 hover:border-slate-700 hover:text-white'
                  }`}
                >
                  <div className="w-10 h-10 rounded-xl bg-[#0d1629] border border-slate-700/50 p-1 flex items-center justify-center">
                    <TeamCrest teamId={team.id} size={28} />
                  </div>
                  <div className="flex items-center justify-center gap-1.5 w-full min-w-0">
                    <img
                      src={getTeamFlagUrl(team.shortName)}
                      alt={team.name}
                      className="h-3 w-4.5 rounded-[2px] object-cover border border-white/15 shrink-0"
                    />
                    <span className="text-[11px] font-black text-white truncate">{team.name}</span>
                  </div>
                  <span className="text-[10px] font-mono font-bold text-amber-400">Rank #{team.ranking}</span>
                </button>
              );
            })}
          </div>

          {/* Active Team Dossier & Playing XI Manager */}
          {teamsViewMode === 'dossier' && (
            <div className="rounded-3xl border border-slate-800 bg-slate-900/90 p-5 sm:p-7 space-y-7 backdrop-blur-xl shadow-2xl">
              {/* Header: Exact User-Specified Team Dossier Banner */}
              <div className="space-y-4">
                <TeamDossierBanner
                  team={activeTeam}
                  isSelected={true}
                  showStats={true}
                  onInspectCaptain={(_capName, capPlayer) => {
                    if (capPlayer) {
                      setInspectedPlayer(capPlayer);
                      cricketAudio.playBatHit();
                    }
                  }}
                />

                {/* Secondary Action Toolbar: AI Best XI & Team Comparison */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-1 border-t border-slate-800/80">
                  <div className="text-xs text-slate-400 font-mono">
                    <span>Squad Size: <strong className="text-white">{activeTeam.squad.length} Players</strong></span>
                    <span className="mx-2 text-slate-600">·</span>
                    <span>Overall Rating: <strong className="text-cyan-400">{activeTeam.ratings.overall}/100</strong></span>
                  </div>

                  <div className="flex flex-wrap items-center gap-3">
                    <button
                      onClick={handleGenerateBestXI}
                      className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 px-5 py-2.5 text-xs font-black text-slate-950 hover:from-emerald-400 hover:to-teal-300 transition-all shadow-lg shadow-emerald-500/25 cursor-pointer"
                    >
                      <Sparkles className="h-4 w-4" />
                      <span>AI BEST XI ENGINE</span>
                    </button>

                    <button
                      onClick={() => setIsTeamCompareMode(!isTeamCompareMode)}
                      className="flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-950 px-4 py-2.5 text-xs font-bold text-slate-300 hover:text-white cursor-pointer"
                    >
                      <Swords className="h-4 w-4" />
                      <span>Compare Teams</span>
                    </button>
                  </div>
                </div>

                {/* Dedicated National Captain & Leadership Spotlight Card */}
                <div className="pt-2">
                  <CaptainImageCard
                    team={activeTeam}
                    variant="hero"
                    onInspect={(p) => {
                      setInspectedPlayer(p);
                      cricketAudio.playBatHit();
                    }}
                  />
                </div>
              </div>

            {/* AI Notification Banner */}
            {aiBestXiNotification && (
              <div className="rounded-2xl border border-emerald-500/40 bg-emerald-950/30 p-4 text-xs font-mono text-emerald-300 flex items-center gap-3 animate-in fade-in duration-300">
                <Sparkles className="h-5 w-5 text-emerald-400 shrink-0" />
                <span>{aiBestXiNotification}</span>
              </div>
            )}

            {/* TEAM COMPARISON MODAL / DRAWER */}
            {isTeamCompareMode && (
              <div className="rounded-2xl border border-slate-800 bg-slate-950 p-6 space-y-6">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <span className="text-xs font-mono font-bold text-emerald-400">HEAD-TO-HEAD TEAM STRENGTH MATRIX</span>
                  <button onClick={() => setIsTeamCompareMode(false)} className="text-xs text-slate-400 hover:text-white cursor-pointer">
                    Close ✕
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <select
                    value={compareTeamAId}
                    onChange={(e) => setCompareTeamAId(e.target.value)}
                    className="w-full rounded-xl border border-slate-800 bg-slate-900 p-2.5 text-xs font-bold text-white cursor-pointer"
                  >
                    {TEAMS.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </select>

                  <select
                    value={compareTeamBId}
                    onChange={(e) => setCompareTeamBId(e.target.value)}
                    className="w-full rounded-xl border border-slate-800 bg-slate-900 p-2.5 text-xs font-bold text-white cursor-pointer"
                  >
                    {TEAMS.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                </div>

                {(() => {
                  const tA = TEAMS.find((t) => t.id === compareTeamAId) || TEAMS[0];
                  const tB = TEAMS.find((t) => t.id === compareTeamBId) || TEAMS[1];

                  const metrics = [
                    { label: 'Overall Rating', a: tA.ratings.overall, b: tB.ratings.overall },
                    { label: 'Batting Power', a: tA.ratings.batting, b: tB.ratings.batting },
                    { label: 'Bowling Discipline', a: tA.ratings.bowling, b: tB.ratings.bowling },
                    { label: 'Fielding Efficiency', a: tA.ratings.fielding, b: tB.ratings.fielding },
                    { label: 'Powerplay Dominance', a: tA.ratings.powerplay, b: tB.ratings.powerplay },
                    { label: 'Death Overs Clutch', a: tA.ratings.deathOvers, b: tB.ratings.deathOvers },
                  ];

                  return (
                    <div className="space-y-3 font-mono text-xs">
                      {metrics.map((m, idx) => (
                        <div key={idx} className="space-y-1">
                          <div className="flex justify-between items-center gap-2">
                            <span className={`inline-flex items-center gap-1.5 ${m.a >= m.b ? 'text-emerald-400 font-bold' : 'text-slate-400'}`}>
                              <img src={getTeamFlagUrl(tA.shortName)} alt={tA.name} className="h-3.5 w-5 rounded-[2px] object-cover border border-white/15" />
                              <span>{tA.name}: {m.a}</span>
                            </span>
                            <span className="text-white font-bold">{m.label}</span>
                            <span className={`inline-flex items-center gap-1.5 ${m.b >= m.a ? 'text-emerald-400 font-bold' : 'text-slate-400'}`}>
                              <img src={getTeamFlagUrl(tB.shortName)} alt={tB.name} className="h-3.5 w-5 rounded-[2px] object-cover border border-white/15" />
                              <span>{tB.name}: {m.b}</span>
                            </span>
                          </div>
                          <div className="flex h-2 rounded-full bg-slate-900 overflow-hidden gap-1">
                            <div className="bg-emerald-500 rounded-l" style={{ width: `${(m.a / (m.a + m.b)) * 100}%` }} />
                            <div className="bg-sky-500 rounded-r" style={{ width: `${(m.b / (m.a + m.b)) * 100}%` }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </div>
            )}

            {/* Team Chemistry & Balance Gauge */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs font-mono">
              <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4 space-y-2">
                <span className="text-[10px] text-slate-500 uppercase block">PLAYING XI CHEMISTRY</span>
                <span className="text-2xl font-black text-emerald-400">{teamChemistry.overall}/100</span>
                <p className="text-[11px] text-slate-400 font-sans leading-tight">
                  {teamChemistry.keySynergies[0] || 'Balanced squad setup'}
                </p>
              </div>

              <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4 space-y-2">
                <span className="text-[10px] text-slate-500 uppercase block">BATTING DEPTH</span>
                <span className="text-2xl font-black text-sky-400">{teamChemistry.battingBalance}/100</span>
                <p className="text-[11px] text-slate-400 font-sans leading-tight">
                  High boundary potential through overs 1-20.
                </p>
              </div>

              <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4 space-y-2">
                <span className="text-[10px] text-slate-500 uppercase block">BOWLING VARIATION</span>
                <span className="text-2xl font-black text-amber-400">{teamChemistry.bowlingBalance}/100</span>
                <p className="text-[11px] text-slate-400 font-sans leading-tight">
                  {teamChemistry.leftRightBalance >= 80 ? 'Elite LHB/RHB disruption' : 'Balanced attack'}
                </p>
              </div>

              <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4 space-y-2">
                <span className="text-[10px] text-slate-500 uppercase block">RECENT FORM</span>
                <div className="flex gap-1.5 pt-1">
                  {activeTeam.recentForm.map((f, i) => (
                    <span
                      key={i}
                      className={`flex h-6 w-6 items-center justify-center rounded-lg text-xs font-bold ${
                        f === 'W' ? 'bg-emerald-950 text-emerald-400 border border-emerald-500/40' : 'bg-rose-950 text-rose-400'
                      }`}
                    >
                      {f}
                    </span>
                  ))}
                </div>
                <span className="text-[10px] text-slate-500 block">LAST 5 INTERNATIONAL MATCHES</span>
              </div>
            </div>

            {/* PLAYING XI (Interactive Slot Cards) */}
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                  <span>Active Playing XI ({currentPlayingXi.length}/11)</span>
                </h3>
                <span className="text-xs font-mono text-slate-400">Click a bench player to swap in</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                {currentPlayingXi.map((player, idx) => (
                  <div
                    key={player.id}
                    onClick={() => {
                      setInspectedPlayer(player);
                      cricketAudio.playBatHit();
                    }}
                    className="group relative rounded-xl border border-slate-800 bg-slate-950 p-3 hover:border-emerald-500/50 transition-all cursor-pointer flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-mono font-bold text-slate-600 w-4">#{idx + 1}</span>
                      <PlayerCardAvatar
                        playerId={player.id}
                        name={player.name}
                        countryCode={activeTeam.id}
                        jerseyNumber={player.jerseyNumber || idx + 1}
                        imageUrl={player.imageUrl}
                        size="sm"
                      />
                      <div className="truncate">
                        <span className="text-xs font-bold text-white block truncate group-hover:text-emerald-300">
                          {player.name}
                        </span>
                        <span className="text-[10px] text-slate-400 block truncate">{player.role}</span>
                      </div>
                    </div>

                    <div className="text-right font-mono text-xs shrink-0">
                      <span className="font-bold text-emerald-400 block">{player.rating}</span>
                      <span className="text-[9px] text-slate-500">SR {player.stats.strikeRate}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* BENCH PLAYERS (Click to swap into Playing XI) */}
            {currentBench.length > 0 && (
              <div className="space-y-3 pt-4 border-t border-slate-800">
                <h4 className="text-xs font-mono font-bold text-slate-400 uppercase tracking-wider">
                  Tactical Bench & Reserves ({currentBench.length} Players Available)
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-4 gap-2.5">
                  {currentBench.map((benchPlayer) => (
                    <div
                      key={benchPlayer.id}
                      className="rounded-xl border border-slate-800/80 bg-slate-950 p-2.5 flex items-center justify-between"
                    >
                      <div className="flex items-center gap-2 truncate">
                        <PlayerCardAvatar
                          playerId={benchPlayer.id}
                          name={benchPlayer.name}
                          countryCode={activeTeam.id}
                          imageUrl={benchPlayer.imageUrl}
                          size="sm"
                        />
                        <div className="truncate">
                          <span className="text-xs font-bold text-slate-300 block truncate">{benchPlayer.name}</span>
                          <span className="text-[10px] text-slate-500 truncate block">{benchPlayer.role}</span>
                        </div>
                      </div>

                      {/* Swap button */}
                      <button
                        onClick={() => {
                          // Swap with 11th player by default
                          const targetXi = currentPlayingXi[currentPlayingXi.length - 1];
                          if (targetXi) handleSwapPlayer(benchPlayer.id, targetXi.id);
                        }}
                        className="rounded-lg bg-emerald-500/10 border border-emerald-500/30 px-2.5 py-1 text-[10px] font-mono font-bold text-emerald-400 hover:bg-emerald-500/20 cursor-pointer shrink-0"
                      >
                        Swap In
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    )}

      {/* ========================================================================= */}
      {/* SECTION 3: VENUES & STADIUM DNA HUB                                       */}
      {/* ========================================================================= */}
      {universeTab === 'venues' && (
        <div className="space-y-8 animate-in fade-in duration-300">
          {/* 12-Arena Venue Intelligence & Ball Physics Engine */}
          <VenueBallPhysicsHub
            selectedStadiumId={selectedStadiumId}
            onSelectStadium={(id) => {
              setSelectedStadiumId(id);
              const found = STADIUMS.find((s) => s.id === id);
              if (found) setInspectedStadium(found);
            }}
            onApplyToSimulator={({ stadiumId }) => handleSimulateAtVenue(stadiumId)}
          />

          {/* Venues Search & Filter Toolbar */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-4 sm:p-5 backdrop-blur-xl space-y-4">
            <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
              {/* Search Box */}
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  value={venueSearchQuery}
                  onChange={(e) => setVenueSearchQuery(e.target.value)}
                  placeholder="Search stadium, city or nation (e.g. Barbados, MCG, Lord's, Eden...)"
                  className="w-full rounded-xl border border-slate-800 bg-slate-950 pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:border-amber-400 focus:outline-none transition-colors"
                />
                {venueSearchQuery && (
                  <button
                    onClick={() => setVenueSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>

              {/* Pitch Type Selector */}
              <div className="flex items-center gap-2">
                <Filter className="h-3.5 w-3.5 text-amber-400 shrink-0" />
                <select
                  value={venuePitchFilter}
                  onChange={(e) => setVenuePitchFilter(e.target.value)}
                  className="rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-xs font-mono text-slate-300 focus:border-amber-400 focus:outline-none cursor-pointer"
                >
                  <option value="ALL">All Pitch Types</option>
                  <option value="Pace & Bounce">Pace & Bounce</option>
                  <option value="True Batting">True Batting</option>
                  <option value="Slow & Turning">Slow & Turning</option>
                  <option value="Dry Spin-Friendly">Dry Spin-Friendly</option>
                </select>

                <span className="text-[11px] font-mono text-slate-400 whitespace-nowrap hidden sm:inline">
                  {filteredStadiums.length} / {STADIUMS.length} Venues
                </span>
              </div>
            </div>

            {/* Quick Country Flag Filters */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-xs font-mono">
              {[
                { id: 'ALL', label: 'All Grounds', iso: '' },
                { id: 'Barbados', label: 'Barbados', iso: 'BARBADOS' },
                { id: 'India', label: 'India', iso: 'IND' },
                { id: 'Australia', label: 'Australia', iso: 'AUS' },
                { id: 'Sri Lanka', label: 'Sri Lanka', iso: 'SL' },
                { id: 'England', label: 'England', iso: 'ENG' },
                { id: 'UAE', label: 'UAE', iso: 'UAE' },
                { id: 'South Africa', label: 'South Africa', iso: 'SA' },
                { id: 'Pakistan', label: 'Pakistan', iso: 'PAK' },
                { id: 'New Zealand', label: 'New Zealand', iso: 'NZ' },
                { id: 'Bangladesh', label: 'Bangladesh', iso: 'BAN' },
                { id: 'Ireland', label: 'Ireland', iso: 'IRE' },
                { id: 'Zimbabwe', label: 'Zimbabwe', iso: 'ZIM' },
              ].map((c) => (
                <button
                  key={c.id}
                  onClick={() => setVenueCountryFilter(c.id)}
                  className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 transition-all whitespace-nowrap cursor-pointer ${
                    venueCountryFilter === c.id
                      ? 'bg-amber-400 text-slate-950 font-bold shadow-md shadow-amber-500/20'
                      : 'border border-slate-850 bg-slate-950 text-slate-400 hover:text-white hover:border-slate-700'
                  }`}
                >
                  {c.iso && (
                    <img
                      src={getTeamFlagUrl(c.iso)}
                      alt={c.label}
                      className="h-3.5 w-5 rounded-[2px] object-cover border border-white/20 shrink-0"
                    />
                  )}
                  <span>{c.label}</span>
                </button>
              ))}
            </div>

            {/* Asynchronous Venue Asset Loader & Verification Status Bar */}
            <div className="flex flex-wrap items-center justify-between gap-2.5 pt-2 border-t border-slate-800/80 text-xs font-mono tabular-nums">
              <div className="flex flex-wrap items-center gap-2 text-slate-300">
                <span className="text-emerald-400 font-bold">
                  {venueAssetAudit.isScanning
                    ? 'Verifying Stadium Source URLs...'
                    : `Async Asset Loader: ${venueAssetAudit.verifiedCount}/${STADIUMS.length} Source URLs Verified`}
                </span>
                {venueAssetAudit.fallbackCount > 0 && (
                  <span className="text-cyan-300">
                    · {venueAssetAudit.fallbackCount} CAD Fallback Active
                  </span>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    cricketAudio.playUiClick();
                    void runAsyncVenueAssetVerification();
                  }}
                  className="rounded-lg border border-slate-700 bg-slate-950 px-2.5 py-1 text-[11px] font-bold text-slate-200 hover:border-cyan-400 hover:text-white transition-colors cursor-pointer whitespace-nowrap"
                >
                  Re-Verify Source URLs
                </button>

                <button
                  type="button"
                  onClick={() => {
                    cricketAudio.playUiClick();
                    setPreviewAllPlaceholders((prev) => !prev);
                  }}
                  className={`rounded-lg border px-2.5 py-1 text-[11px] font-bold transition-colors cursor-pointer whitespace-nowrap ${
                    previewAllPlaceholders
                      ? 'border-cyan-400 bg-cyan-400 text-slate-950'
                      : 'border-slate-700 bg-slate-950 text-cyan-300 hover:border-cyan-400/60'
                  }`}
                >
                  {previewAllPlaceholders ? 'Restore Verified Photos' : 'Test CAD Placeholder'}
                </button>

                {activeStadium && (
                  <button
                    type="button"
                    onClick={() => {
                      cricketAudio.playBatHit();
                      setInspectedStadium(activeStadium);
                    }}
                    className="rounded-lg bg-amber-400 px-3 py-1 text-[11px] font-black text-slate-950 hover:bg-amber-300 transition-colors cursor-pointer whitespace-nowrap"
                  >
                    Architectural Angles Carousel →
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Venues Grid (Cinematic Stadium Cards) */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredStadiums.map((stadium) => {
              const isSelected = stadium.id === selectedStadiumId;
              const dna = stadium.venueDna || { batting: 80, bowling: 75, pace: 80, spin: 60 };
              const flagUrl = getTeamFlagUrl(stadium.country);

              return (
                <div
                  key={stadium.id}
                  onClick={() => {
                    setSelectedStadiumId(stadium.id);
                    setInspectedStadium(stadium);
                    cricketAudio.playBatHit();
                  }}
                  className={`group relative rounded-3xl border overflow-hidden transition-all duration-300 cursor-pointer flex flex-col justify-between ${
                    isSelected
                      ? 'border-amber-400 bg-slate-900 shadow-2xl shadow-amber-500/20 ring-1 ring-amber-400'
                      : 'border-slate-800 bg-slate-900/80 hover:border-slate-700'
                  }`}
                >
                  {/* Stadium Banner & Atmospheric Overlay */}
                  <div className="relative h-48 w-full overflow-hidden bg-slate-950">
                    <StadiumPhoto
                      stadium={stadium}
                      forcePlaceholder={previewAllPlaceholders}
                      alt={`${stadium.name}, ${stadium.city}`}
                      className="h-full w-full"
                      imgClassName="h-full w-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/55 to-black/15" />

                    {/* Venue Capacity Badge */}
                    <div className="absolute top-3 right-3 rounded-full bg-slate-950/80 border border-slate-700 px-3 py-1 text-[10px] font-mono text-slate-200">
                      Capacity: {stadium.capacity.toLocaleString()}
                    </div>

                    {/* Pitch Type Tag */}
                    <div className="absolute bottom-3 left-4 right-4">
                      <div className="flex items-center gap-2">
                        <span className="rounded-md bg-amber-500 text-slate-950 px-2 py-0.5 text-[10px] font-bold uppercase">
                          {stadium.pitchType}
                        </span>
                        <img
                          src={flagUrl}
                          alt={stadium.country}
                          className="h-3.5 w-5 rounded-[2px] object-cover border border-white/25"
                        />
                      </div>
                      <h3 className="text-lg font-black text-white mt-1 group-hover:text-amber-300 transition-colors">
                        {stadium.name}
                      </h3>
                      <p className="text-xs text-slate-300 font-mono flex items-center gap-1.5">
                        <img
                          src={flagUrl}
                          alt={stadium.country}
                          className="h-3 w-4.5 rounded-[2px] object-cover border border-white/20 shrink-0"
                        />
                        <span>{stadium.city}, {stadium.country}</span>
                      </p>
                    </div>
                  </div>

                  {/* Body Content */}
                  <div className="p-5 space-y-4">
                    {/* Telemetry Metrics */}
                    <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                      <div className="rounded-xl border border-slate-800 bg-slate-950 p-2.5">
                        <span className="text-[10px] text-slate-500 block">AVG 1ST INNINGS</span>
                        <span className="font-bold text-white text-sm">{stadium.avgFirstInningsScore}</span>
                      </div>

                      <div className="rounded-xl border border-slate-800 bg-slate-950 p-2.5">
                        <span className="text-[10px] text-slate-500 block">CHASING WIN %</span>
                        <span className="font-bold text-emerald-400 text-sm">{stadium.chasingWinPercent}%</span>
                      </div>

                      <div className="rounded-xl border border-slate-800 bg-slate-950 p-2.5">
                        <span className="text-[10px] text-slate-500 block">RECORD HIGH</span>
                        <span className="font-bold text-sky-400 text-[11px] truncate block">{stadium.highestScore || '234/4'}</span>
                      </div>

                      <div className="rounded-xl border border-slate-800 bg-slate-950 p-2.5">
                        <span className="text-[10px] text-slate-500 block">PACE / SPIN RATIO</span>
                        <span className="font-bold text-amber-400 text-xs">
                          {stadium.paceWicketPercent}% / {stadium.spinWicketPercent}%
                        </span>
                      </div>
                    </div>

                    {/* Venue DNA Bars */}
                    <div className="space-y-1.5 text-[11px] font-mono">
                      <div className="flex justify-between text-slate-400">
                        <span>Batting Friendly:</span>
                        <span className="text-white font-bold">{dna.batting}%</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-slate-800 overflow-hidden">
                        <div className="h-full bg-sky-400" style={{ width: `${dna.batting}%` }} />
                      </div>

                      <div className="flex justify-between text-slate-400 pt-1">
                        <span>Pace Dominance:</span>
                        <span className="text-amber-400 font-bold">{dna.pace}%</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-slate-800 overflow-hidden">
                        <div className="h-full bg-amber-400" style={{ width: `${dna.pace}%` }} />
                      </div>
                    </div>

                    {/* Live Match Weather Capsule */}
                    {stadium.weather && (
                      <div className="flex items-center justify-between rounded-xl border border-slate-800/80 bg-slate-950 p-2.5 text-[11px] font-mono text-slate-400">
                        <span className="flex items-center gap-1.5 text-white">
                          <Thermometer className="h-3.5 w-3.5 text-rose-400" />
                          <span>{stadium.weather.temp}</span>
                        </span>
                        <span className="flex items-center gap-1 text-sky-400">
                          <Droplets className="h-3.5 w-3.5" />
                          <span>Dew {stadium.weather.dew}</span>
                        </span>
                        <span className="flex items-center gap-1 text-slate-300">
                          <Wind className="h-3.5 w-3.5 text-emerald-400" />
                          <span>{stadium.weather.wind}</span>
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Footer CTAs */}
                  <div className="p-4 border-t border-slate-800/80 flex items-center justify-between text-xs">
                    <span className="text-amber-400 font-bold flex items-center gap-1">
                      <span>Inspect Stadium DNA</span>
                      <ChevronRight className="h-3 w-3" />
                    </span>
                    <span className="text-[10px] font-mono text-slate-500">
                      Boundaries: {stadium.boundarySizeMeters.straight}m x {stadium.boundarySizeMeters.square}m
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* DETAILED VENUE DOSSIER & INTERACTIVE PITCH MAP (For Selected Venue) */}
          {activeStadium && (
            <div className="rounded-3xl border border-slate-800 bg-slate-900/90 p-6 sm:p-8 space-y-6 backdrop-blur-xl shadow-2xl">
              {/* Panoramic Stadium Hero Banner */}
              <div className="relative h-56 sm:h-72 w-full rounded-2xl overflow-hidden border border-slate-800 bg-slate-950">
                <StadiumPhoto
                  stadium={activeStadium}
                  alt={`${activeStadium.name} — ${activeStadium.city}, ${activeStadium.country}`}
                  eager
                  className="h-full w-full"
                  imgClassName="h-full w-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/65 to-slate-950/15" />
                <div className="absolute top-4 left-4 right-4 flex flex-wrap items-center justify-between gap-2 text-xs font-mono text-slate-200">
                  <div className="flex items-center gap-2 bg-slate-950/80 backdrop-blur-md border border-white/10 rounded-lg px-3 py-1.5">
                    <img
                      src={getTeamFlagUrl(activeStadium.country)}
                      alt={activeStadium.country}
                      referrerPolicy="no-referrer"
                      className="h-3.5 w-5 rounded-[2px] object-cover border border-white/25"
                    />
                    <span>{activeStadium.city}, {activeStadium.country}</span>
                    <span aria-hidden="true" className="text-slate-500">·</span>
                    <span className="tabular-nums">Elevation {activeStadium.elevation || '18m'}</span>
                  </div>
                  <div className="bg-slate-950/80 backdrop-blur-md border border-white/10 rounded-lg px-3 py-1.5 tabular-nums">
                    Capacity {activeStadium.capacity.toLocaleString()} · {activeStadium.boundarySizeMeters.straight}m Straight / {activeStadium.boundarySizeMeters.square}m Square
                  </div>
                </div>
                <div className="absolute bottom-4 left-5 right-5 flex flex-col sm:flex-row sm:items-end justify-between gap-3">
                  <div>
                    <p className="text-xs font-mono text-amber-300">
                      {resolveStadiumLandmarkCaption(activeStadium)}
                    </p>
                    <h3 className="text-2xl sm:text-3xl font-black text-white tracking-tight mt-0.5">
                      {activeStadium.name} Comprehensive Dossier
                    </h3>
                    <p className="text-xs sm:text-sm text-slate-200 mt-1 max-w-3xl">
                      {activeStadium.paceSpinAdvantage}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      cricketAudio.playBatHit();
                      setInspectedStadium(activeStadium);
                    }}
                    className="rounded-xl border border-amber-400/70 bg-slate-950/85 backdrop-blur-md px-4 py-2 text-xs font-mono font-bold text-amber-300 hover:bg-amber-400 hover:text-slate-950 transition-colors cursor-pointer whitespace-nowrap shrink-0"
                  >
                    Open 5-Angle Architectural Carousel →
                  </button>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
                <div className="flex items-center gap-2 text-xs font-mono text-slate-300 tabular-nums">
                  <MapPin className="h-4 w-4 text-amber-400 shrink-0" />
                  <span>{activeStadium.pitchType}</span>
                  <span aria-hidden="true" className="text-slate-600">·</span>
                  <span>1st Inn Avg {activeStadium.avgFirstInningsScore}</span>
                  <span aria-hidden="true" className="text-slate-600">·</span>
                  <span>Chasing Win {activeStadium.chasingWinPercent}%</span>
                  <span aria-hidden="true" className="text-slate-600">·</span>
                  <span>Dew {activeStadium.dewFactor}</span>
                </div>

                <div className="flex flex-wrap items-center gap-2.5">
                  {/* Match Day Selector for AR Overlay */}
                  <div className="flex items-center gap-1 rounded-xl border border-slate-800 bg-slate-950 p-1 text-xs font-mono">
                    {[1, 2, 3, 4, 5].map((d) => (
                      <button
                        key={d}
                        type="button"
                        onClick={() => {
                          setVenueMatchDay(d);
                          cricketAudio.playUiClick();
                        }}
                        className={`px-2 py-1 rounded-lg font-bold transition-colors cursor-pointer ${
                          venueMatchDay === d
                            ? 'bg-cyan-500 text-slate-950'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        Day {d}
                      </button>
                    ))}
                  </div>

                  {/* Surface AR Overlay Button */}
                  <button
                    type="button"
                    onClick={() => {
                      setIsVenueArOpen(true);
                      cricketAudio.playBatHit();
                    }}
                    className="flex items-center gap-1.5 rounded-xl border border-cyan-400/80 bg-cyan-500/15 px-3.5 py-2.5 text-xs font-mono font-bold text-cyan-200 hover:bg-cyan-500/25 transition-all cursor-pointer"
                  >
                    <Camera className="h-4 w-4 text-cyan-300" />
                    <span>Surface AR Overlay</span>
                  </button>

                  <button
                    onClick={() => handleSimulateAtVenue(activeStadium.id)}
                    className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-400 px-4 py-2.5 text-xs font-bold text-slate-950 hover:from-amber-400 hover:to-amber-300 shadow-lg shadow-amber-500/20 cursor-pointer transition-all"
                  >
                    <span>Simulate Match at {activeStadium.name} →</span>
                  </button>
                </div>
              </div>

              {/* Venue Sub-View Tab Selector */}
              <div className="flex flex-wrap items-center gap-2 border-b border-slate-800 pb-3">
                {[
                  { id: 'atmospheric', label: '🌪️ Atmospheric Intelligence & Radial Gauge', icon: Gauge },
                  { id: 'command-suite', label: '🏟️ 10-Feature Arena Command Deck', icon: Compass },
                  { id: 'radar', label: '📡 Interactive Conditions Radar', icon: Activity },
                  { id: 'pitch-map', label: '🏟️ 22-Yard Pitch Strip & Team Records', icon: Layers },
                  { id: 'hawkeye', label: '🛰️ Hawkeye 3D Ball Tracking', icon: Sparkles },
                ].map((t) => {
                  const isActive = venueInspectionView === t.id;
                  return (
                    <button
                      key={t.id}
                      onClick={() => {
                        setVenueInspectionView(t.id as any);
                        cricketAudio.playBatHit();
                      }}
                      className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-mono font-bold transition-all cursor-pointer ${
                        isActive
                          ? 'bg-amber-400 text-slate-950 font-black shadow-lg shadow-amber-400/20'
                          : 'border border-slate-800 bg-slate-950/80 text-slate-400 hover:text-white hover:border-slate-700'
                      }`}
                    >
                      <span>{t.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* VIEW 1: ATMOSPHERIC INTELLIGENCE PANEL & RADIAL GAUGE */}
              {venueInspectionView === 'atmospheric' && (
                <div className="animate-in fade-in duration-300">
                  <PitchIntelligenceView
                    stadiumName={`${activeStadium.name} (${activeStadium.city})`}
                    initialTemperature={parseInt(activeStadium.weather?.temp || '28')}
                    initialDewLevel={activeStadium.weather?.dew === 'Heavy' ? 80 : activeStadium.weather?.dew === 'Moderate' ? 50 : 25}
                    initialPitchWear={activeStadium.pitchType.includes('Turn') || activeStadium.pitchType.includes('Spin') ? 68 : 35}
                    initialGrassCoverage={activeStadium.pitchType.includes('Pace') ? 75 : 45}
                  />
                </div>
              )}

              {/* VIEW 2: VENUE CONDITIONS RADAR */}
              {venueInspectionView === 'radar' && (
                <div className="animate-in fade-in duration-300">
                  <VenueConditionsRadar
                    stadiumName={`${activeStadium.name} (${activeStadium.city})`}
                    initialHumidity={72}
                    initialWindSpeed={48}
                    initialDewLevel={activeStadium.weather?.dew === 'Heavy' ? 80 : 35}
                    initialPitchWear={activeStadium.pitchType.includes('Turn') ? 65 : 30}
                    initialGrassCoverage={activeStadium.pitchType.includes('Pace') ? 70 : 40}
                  />
                </div>
              )}

              {/* VIEW 3: 2D PITCH INTERACTIVE MAP + VENUE RECORDS */}
              {venueInspectionView === 'pitch-map' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-in fade-in duration-300">
                  {/* 2D Pitch Physics Visualizer */}
                  <div className="rounded-2xl border border-slate-800 bg-slate-950 p-6 space-y-4">
                    <span className="text-xs font-mono font-bold text-slate-300 block">
                      INTERACTIVE 22-YARD PITCH MAP & WEAR HEATMAP
                    </span>

                    {/* Pitch Strip Diagram */}
                    <div className="relative mx-auto h-40 w-full max-w-md rounded-2xl border-2 border-amber-800/40 bg-gradient-to-b from-amber-950/40 via-amber-900/30 to-amber-950/40 p-3 flex flex-col justify-between overflow-hidden shadow-inner">
                      <div className="flex justify-between text-[10px] font-mono text-slate-400 border-b border-amber-600/30 pb-1">
                        <span>BOWLING CREASE (GOOD LENGTH ZONE)</span>
                        <span className="text-emerald-400">Grass Cover: 6mm</span>
                      </div>

                      {/* Pitch center scars & cracks representation */}
                      <div className="flex items-center justify-around py-3">
                        <div className="h-8 w-12 rounded bg-amber-700/20 border border-amber-600/30 flex items-center justify-center text-[9px] font-mono text-amber-300">
                          Hard Deck
                        </div>
                        <div className="h-10 w-16 rounded bg-amber-800/30 border border-amber-500/40 flex items-center justify-center text-[9px] font-mono text-emerald-300">
                          True Seam
                        </div>
                        <div className="h-8 w-12 rounded bg-amber-700/20 border border-amber-600/30 flex items-center justify-center text-[9px] font-mono text-amber-300">
                          Dry Patch
                        </div>
                      </div>

                      <div className="flex justify-between text-[10px] font-mono text-slate-400 border-t border-amber-600/30 pt-1">
                        <span>POPPING CREASE (STRIKER END)</span>
                        <span className="text-amber-400">True Bounce: 88/100</span>
                      </div>
                    </div>

                    {/* Pace vs Spin Advantage Explainer */}
                    <p className="text-xs text-slate-300 font-sans leading-relaxed">
                      <strong>Tactical Insight:</strong> {activeStadium.paceSpinAdvantage}
                    </p>
                  </div>

                  {/* Team Records & Player Records at this Venue */}
                  <div className="space-y-4">
                    <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4 space-y-3">
                      <span className="text-xs font-mono font-bold text-sky-400 block uppercase">
                        TEAM WIN RATES AT {activeStadium.name.toUpperCase()}
                      </span>

                      <div className="space-y-2 font-mono text-xs">
                        {(activeStadium.teamRecords || []).map((tr, i) => (
                          <div key={i} className="flex items-center justify-between border-b border-slate-850 pb-1.5">
                            <span className="text-white font-bold">{tr.team}</span>
                            <span className="text-slate-400">
                              {tr.played} Matches · {tr.won} Wins ·{' '}
                              <strong className="text-emerald-400 font-bold">{tr.winRate}%</strong>
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4 space-y-2">
                      <span className="text-xs font-mono font-bold text-amber-400 block uppercase">
                        KEY PERFORMERS AT THIS VENUE
                      </span>
                      <div className="space-y-2 font-mono text-xs">
                        {(activeStadium.playerRecords || []).map((pr, i) => {
                          const matchedPlayer = TEAMS.flatMap((t) => t.squad).find(
                            (p) => p.name.toLowerCase() === pr.name.toLowerCase()
                          );
                          return (
                            <div key={i} className="flex items-center justify-between gap-3 text-slate-300">
                              <div className="flex items-center gap-2.5 min-w-0">
                                <PlayerCardAvatar
                                  playerId={matchedPlayer?.id || pr.name.toLowerCase().replace(/[^a-z0-9]/g, '')}
                                  name={pr.name}
                                  countryCode={matchedPlayer?.countryCode || 'INT'}
                                  imageUrl={matchedPlayer?.imageUrl}
                                  size="sm"
                                />
                                <span className="font-bold text-white truncate">{pr.name} ({pr.role}):</span>
                              </div>
                              <span className="text-amber-300 shrink-0 tabular-nums">{pr.stat}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* VIEW 4: BROADCAST HAWKEYE 3D BALL TRACKING */}
              {venueInspectionView === 'hawkeye' && (
                <div className="space-y-4 animate-in fade-in duration-300">
                  <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4">
                    <BroadcastBallTrackingCanvas
                      isOut={true}
                      strikerName="Top Order Batter"
                      bowlerName={`${activeStadium.city} Seamer`}
                      delivery={{
                        speedKmh: 144.2,
                        pitchingLine: 'IN LINE',
                        impactLine: 'IN LINE',
                        wicketsOutcome: 'HITTING',
                        isOut: true,
                        bowlerType: activeStadium.pitchType,
                        description: `Live Hawkeye trajectory projection calibrated for ${activeStadium.name} atmospheric and turf resistance.`,
                      }}
                    />
                  </div>
                </div>
              )}

              {/* VIEW 5: 10-FEATURE STADIUM COMMAND SUITE */}
              {venueInspectionView === 'command-suite' && (
                <div className="animate-in fade-in duration-300">
                  <StadiumCommandSuite
                    stadium={activeStadium}
                    allStadiums={STADIUMS}
                    onSelectStadium={(id) => {
                      setSelectedStadiumId(id);
                      const found = STADIUMS.find((s) => s.id === id);
                      if (found) setInspectedStadium(found);
                    }}
                    onSimulateMatch={(id) => handleSimulateAtVenue(id)}
                  />
                </div>
              )}
            </div>
          )}

          {/* 5-YEAR VENUE HISTORY COMPARISON: DUAL-AXIS BATTING VS BOWLING (AVG & SR) */}
          {activeStadium && (
            <VenueHistoryComparisonChart
              stadium={activeStadium}
              allStadiums={STADIUMS}
              onSelectStadium={(id) => {
                setSelectedStadiumId(id);
                const found = STADIUMS.find((s) => s.id === id);
                if (found) setInspectedStadium(found);
              }}
            />
          )}

          {/* DEDICATED 10-FEATURE STADIUM ENGINEERING & MATCHDAY SUITE */}
          {activeStadium && venueInspectionView !== 'command-suite' && (
            <StadiumCommandSuite
              stadium={activeStadium}
              allStadiums={STADIUMS}
              onSelectStadium={(id) => {
                setSelectedStadiumId(id);
                const found = STADIUMS.find((s) => s.id === id);
                if (found) setInspectedStadium(found);
              }}
              onSimulateMatch={(id) => handleSimulateAtVenue(id)}
            />
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* FULL-SCREEN EXPANDED PLAYER DNA PROFILE MODAL                             */}
      {/* ========================================================================= */}
      {inspectedPlayer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-md overflow-y-auto animate-in fade-in duration-200">
          <div className="relative w-full max-w-4xl rounded-3xl border border-sky-500/40 bg-slate-950 p-6 sm:p-8 shadow-2xl space-y-6 max-h-[92vh] overflow-y-auto">
            {/* Close Button */}
            <button
              onClick={() => setInspectedPlayer(null)}
              className="absolute top-6 right-6 flex h-9 w-9 items-center justify-center rounded-full border border-slate-800 bg-slate-900 text-slate-400 hover:text-white transition-colors cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>

            {/* Profile Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6 border-b border-slate-800 pb-6">
              <PlayerCardAvatar
                playerId={inspectedPlayer.id}
                name={inspectedPlayer.name}
                countryCode={inspectedPlayer.countryCode}
                jerseyNumber={inspectedPlayer.jerseyNumber || 18}
                imageUrl={inspectedPlayer.imageUrl}
                size="xl"
              />

              <div className="space-y-1 flex-1">
                <div className="flex items-center gap-2">
                  <CountryFlag countryCode={inspectedPlayer.countryCode} size="md" />
                  <span className="text-xs font-mono font-bold text-slate-400 uppercase">
                    {inspectedPlayer.country} · #{inspectedPlayer.jerseyNumber || 18}
                  </span>
                </div>
                <h2 className="text-2xl sm:text-3xl font-black text-white">{inspectedPlayer.name}</h2>
                <p className="text-xs sm:text-sm text-slate-300 font-sans">
                  {inspectedPlayer.role} · {inspectedPlayer.battingHand} · {inspectedPlayer.bowlingStyle}
                </p>

                <div className="flex flex-wrap items-center gap-4 text-xs font-mono pt-2">
                  <span>Rating: <strong className="text-sky-400 font-bold">{inspectedPlayer.rating}</strong></span>
                  <span>Impact Score: <strong className="text-emerald-400 font-bold">{inspectedPlayer.stats.impactScore}/100</strong></span>
                  <span>Form: <strong className="text-amber-400 font-bold">{inspectedPlayer.formRating}%</strong></span>
                  <button
                    onClick={() => {
                      const matchedTeam = TEAMS.find(
                        (tm) =>
                          tm.squad.some((sp) => sp.id === inspectedPlayer.id) ||
                          tm.name.toLowerCase() === inspectedPlayer.country.toLowerCase()
                      );
                      setInspectedPlayer(null);
                      handleJumpToTeam(matchedTeam?.id || inspectedPlayer.countryCode.toLowerCase());
                    }}
                    className="text-sky-400 underline cursor-pointer"
                  >
                    View National Team Squad →
                  </button>
                </div>
              </div>
            </div>

            {/* Radar Chart + DNA Breakdown Grid */}
            {(() => {
              const dna = getPlayerDNA(inspectedPlayer);

              const radarData = [
                { label: 'Power', value: dna.aggression },
                { label: 'Timing', value: Math.min(99, Math.round(dna.consistency * 1.05)) },
                { label: 'Consistency', value: dna.consistency },
                { label: 'Pace Attack', value: dna.paceMatchup },
                { label: 'Spin Attack', value: dna.spinMatchup },
                { label: 'Pressure', value: dna.pressureScore },
                { label: 'Finishing', value: dna.finishingAbility },
              ];

              return (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-center">
                  {/* Radar Polygon Visualization */}
                  <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 flex flex-col items-center justify-center">
                    <span className="text-xs font-mono font-bold text-sky-400 mb-2">
                      7-AXIS CRICKET DNA RADAR CHART
                    </span>
                    <RadarChart data={radarData} size={280} color="#38bdf8" />
                  </div>

                  {/* DNA Metrics Bars */}
                  <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 space-y-3 font-mono text-xs">
                    <span className="text-xs font-mono font-bold text-white block">
                      PLAYER DNA ATTRIBUTE BREAKDOWN
                    </span>

                    {radarData.map((d, i) => (
                      <div key={i} className="space-y-1">
                        <div className="flex justify-between">
                          <span className="text-slate-400">{d.label}:</span>
                          <span className="text-sky-400 font-bold">{d.value}/100</span>
                        </div>
                        <div className="h-1.5 rounded-full bg-slate-950 overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-sky-500 to-indigo-500"
                            style={{ width: `${d.value}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}

            {/* Full Multi-Format Career, Bowling, Fielding & Situational Statistics */}
            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 space-y-4">
              <PlayerProfileStatsSuite player={inspectedPlayer} />

              <div className="flex justify-end border-t border-slate-800 pt-3">
                <button
                  type="button"
                  onClick={() => {
                    const targetPlayer = inspectedPlayer;
                    setInspectedPlayer(null);
                    setActiveModalPlayer(targetPlayer);
                  }}
                  className="rounded-xl bg-sky-500 px-4 py-2 text-xs font-mono font-bold text-slate-950 hover:bg-sky-400 transition-colors cursor-pointer"
                >
                  Open 360° Wagon Wheel & Match Logs →
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Side-by-side Player Comparison Modal with Radar Charts */}
      <PlayerComparisonModal
        playerA={radarTargetPlayerA}
        playerB={radarTargetPlayerB}
        isOpen={isRadarModalOpen}
        onClose={() => setIsRadarModalOpen(false)}
        onInspectPlayer={(p) => {
          setIsRadarModalOpen(false);
          setInspectedPlayer(p);
        }}
      />

      {/* Venue Intelligence Surface AR Overlay Modal */}
      <SurfaceArOverlayModal
        isOpen={isVenueArOpen}
        onClose={() => setIsVenueArOpen(false)}
        stadiumName={activeStadium ? `${activeStadium.name}, ${activeStadium.city}` : 'Kensington Oval, Barbados'}
        initialOvers={venueMatchDay * 4}
        activeMatchDay={venueMatchDay}
      />

      {/* Venue Detail Modal with Responsive 5-Angle Lazy-Loaded Architectural Carousel */}
      <VenueDetailModal
        stadium={inspectedStadium}
        onClose={() => setInspectedStadium(null)}
        onSelectStadium={(st) => setSelectedStadiumId(st.id)}
        onSimulateAtVenue={(venueId) => handleSimulateAtVenue(venueId)}
      />
    </div>
  );
};
