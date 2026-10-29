import React, { useState, useMemo } from 'react';
import { useGame } from '../../context/GameContext';
import { TEAMS, STADIUMS } from '../../data/cricketData';
import { CountryFlag, TeamCrest, PlayerCardAvatar, TeamFlag } from '../common/CricketIdentity';
import { Team, Player, Stadium } from '../../types/cricket';
import { cricketAudio } from '../../utils/audioSystem';
import {
  Users,
  Shield,
  Search,
  Filter,
  Swords,
  ChevronRight,
  Sparkles,
  TrendingUp,
  MapPin,
  Flame,
  Award,
  Play,
  ArrowRightLeft,
  Sliders,
  CheckCircle2,
  XCircle,
  Eye,
  Zap,
} from 'lucide-react';

export const InteractiveTeamPlayerHub: React.FC = () => {
  const { setActiveModalPlayer, setActiveView, setSelectedPlayerId, launchSimMatch } = useGame();

  const [activeTab, setActiveTab] = useState<'teams' | 'players' | 'predict'>('teams');

  // -------------------------------------------------------------
  // TEAMS EXPLORER & COMPARISON STATE
  // -------------------------------------------------------------
  const [selectedTeamFilter, setSelectedTeamFilter] = useState<'ALL' | 'CHAMPIONS' | 'TOP4'>('ALL');
  const [compareTeamAId, setCompareTeamAId] = useState<string>('ind');
  const [compareTeamBId, setCompareTeamBId] = useState<string>('aus');
  const [isComparingTeams, setIsComparingTeams] = useState<boolean>(false);

  const teamA = TEAMS.find((t) => t.id === compareTeamAId) || TEAMS[0];
  const teamB = TEAMS.find((t) => t.id === compareTeamBId) || TEAMS[1];

  const filteredTeams = useMemo(() => {
    if (selectedTeamFilter === 'CHAMPIONS') {
      return TEAMS.filter((t) => t.worldCupTitles > 0);
    }
    if (selectedTeamFilter === 'TOP4') {
      return TEAMS.filter((t) => t.ranking <= 4);
    }
    return TEAMS;
  }, [selectedTeamFilter]);

  // -------------------------------------------------------------
  // PLAYERS EXPLORER STATE
  // -------------------------------------------------------------
  const [playerSearchQuery, setPlayerSearchQuery] = useState('');
  const [playerRoleFilter, setPlayerRoleFilter] = useState<string>('ALL');
  const [playerTeamFilter, setPlayerTeamFilter] = useState<string>('ALL');
  const [showAllPlayers, setShowAllPlayers] = useState<boolean>(false);

  const allSquadPlayers = useMemo(() => {
    return TEAMS.flatMap((t) =>
      t.squad.map((p) => ({
        ...p,
        teamId: t.id,
        teamName: t.name,
        teamShortName: t.shortName,
      }))
    );
  }, []);

  const filteredPlayers = useMemo(() => {
    const q = playerSearchQuery.toLowerCase().trim();
    return allSquadPlayers.filter((p) => {
      const matchesSearch =
        !q ||
        p.name.toLowerCase().includes(q) ||
        p.country.toLowerCase().includes(q) ||
        p.teamName.toLowerCase().includes(q) ||
        p.role.toLowerCase().includes(q);
      const matchesRole =
        playerRoleFilter === 'ALL' ||
        (playerRoleFilter === 'BATTER' && (p.role.toLowerCase().includes('batter') || p.role.toLowerCase().includes('opening'))) ||
        (playerRoleFilter === 'BOWLER' && (p.role.toLowerCase().includes('bowler') || p.role.toLowerCase().includes('pacer') || p.role.toLowerCase().includes('spin'))) ||
        (playerRoleFilter === 'ALLROUNDER' && p.role.toLowerCase().includes('all-rounder')) ||
        (playerRoleFilter === 'WK' && p.role.toLowerCase().includes('keeper'));
      const matchesTeam =
        playerTeamFilter === 'ALL' ||
        p.teamId.toLowerCase() === playerTeamFilter.toLowerCase() ||
        p.countryCode.toLowerCase() === playerTeamFilter.toLowerCase();
      return matchesSearch && matchesRole && matchesTeam;
    });
  }, [allSquadPlayers, playerSearchQuery, playerRoleFilter, playerTeamFilter]);

  const displayedPlayers = useMemo(() => {
    if (showAllPlayers || playerTeamFilter !== 'ALL' || playerSearchQuery.trim().length > 0) {
      return filteredPlayers;
    }
    return filteredPlayers.slice(0, 32);
  }, [filteredPlayers, showAllPlayers, playerTeamFilter, playerSearchQuery]);

  // -------------------------------------------------------------
  // MATCH PREDICTOR STATE
  // -------------------------------------------------------------
  const [predTeamAId, setPredTeamAId] = useState<string>('ind');
  const [predTeamBId, setPredTeamBId] = useState<string>('sa');
  const [predStadiumId, setPredStadiumId] = useState<string>('barbados');
  const [predPitchType, setPredPitchType] = useState<'flat' | 'turner' | 'green' | 'slow'>('flat');
  const [predDew, setPredDew] = useState<boolean>(true);

  const predTeamA = TEAMS.find((t) => t.id === predTeamAId) || TEAMS[0];
  const predTeamB = TEAMS.find((t) => t.id === predTeamBId) || TEAMS[2];
  const predStadium = STADIUMS.find((s) => s.id === predStadiumId) || STADIUMS[1];

  // Calculate prediction percentages
  const predStats = useMemo(() => {
    let scoreA = predTeamA.ratings.overall * 1.6 + predTeamA.ratings.batting + predTeamA.ratings.bowling;
    let scoreB = predTeamB.ratings.overall * 1.6 + predTeamB.ratings.batting + predTeamB.ratings.bowling;

    // Pitch modifiers
    if (predPitchType === 'turner') {
      scoreA += (predTeamA.ratings.middleOvers - 90) * 1.5;
      scoreB += (predTeamB.ratings.middleOvers - 90) * 1.5;
    } else if (predPitchType === 'green') {
      scoreA += (predTeamA.ratings.powerplay - 90) * 1.8;
      scoreB += (predTeamB.ratings.powerplay - 90) * 1.8;
    }

    if (predDew) {
      // Chasing boost
      scoreA += 4;
    }

    const diff = (scoreA - scoreB) / 4.0;
    let probA = Math.round(50 + diff * 2.8);
    probA = Math.max(22, Math.min(78, probA));
    const probB = 100 - probA;

    const projectedA = Math.round(160 + (predTeamA.ratings.batting - 85) * 1.8);
    const projectedB = Math.round(160 + (predTeamB.ratings.batting - 85) * 1.8);

    return { probA, probB, projectedA, projectedB };
  }, [predTeamA, predTeamB, predPitchType, predDew]);

  const handleOpenPlayer = (player: Player) => {
    cricketAudio.playBatHit();
    setActiveModalPlayer(player);
  };

  const handleSwapCompareTeams = () => {
    const temp = compareTeamAId;
    setCompareTeamAId(compareTeamBId);
    setCompareTeamBId(temp);
    cricketAudio.playBatHit();
  };

  return (
    <section className="relative rounded-3xl border border-slate-800 bg-slate-950 p-6 sm:p-8 space-y-6 shadow-xl">
      {/* Top Header & Interactive Segmented Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-5">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono font-bold uppercase tracking-wider text-cyan-400">
            <Users className="h-4 w-4 text-cyan-400" />
            <span>CRICKET UNIVERSE EXPLORER</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight mt-1">
            Teams, Super-Stars & Tactical Matchups
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Browse international squads, inspect head-to-head metrics, and model tactical scenarios.
          </p>
        </div>

        {/* Tab Controls */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-900 rounded-xl border border-slate-800">
          <button
            onClick={() => {
              setActiveTab('teams');
              cricketAudio.playBatHit();
            }}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
              activeTab === 'teams'
                ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Shield className="h-3.5 w-3.5" />
            <span>Team Explorer</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('players');
              cricketAudio.playBatHit();
            }}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
              activeTab === 'players'
                ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Users className="h-3.5 w-3.5" />
            <span>Player Explorer ({allSquadPlayers.length})</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('predict');
              cricketAudio.playBatHit();
            }}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
              activeTab === 'predict'
                ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <TrendingUp className="h-3.5 w-3.5" />
            <span>Match Predictor</span>
          </button>
        </div>
      </div>

      {/* =========================================================================
          TAB 1: TEAM EXPLORER & HEAD-TO-HEAD COMPARISON
          ========================================================================= */}
      {activeTab === 'teams' && (
        <div className="space-y-6 animate-in fade-in duration-300">
          {/* Head-to-Head Compare Toggle Bar */}
          <div className="rounded-2xl border border-cyan-500/30 bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 p-5 shadow-lg">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <span className="text-xs font-mono font-bold text-cyan-400 uppercase">
                  HEAD-TO-HEAD DUEL ENGINE
                </span>
                <h3 className="text-lg font-black text-white">Compare Any Two Nations</h3>
              </div>

              <button
                onClick={() => setIsComparingTeams((prev) => !prev)}
                className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all cursor-pointer ${
                  isComparingTeams
                    ? 'border border-cyan-400 bg-cyan-500/20 text-cyan-300'
                    : 'bg-cyan-500 text-slate-950 hover:bg-cyan-400 shadow-md shadow-cyan-500/20'
                }`}
              >
                <Swords className="h-4 w-4" />
                <span>{isComparingTeams ? 'Hide Comparison Matrix ▲' : 'Open Head-to-Head Duel ▼'}</span>
              </button>
            </div>

            {/* Expandable Comparison Matrix */}
            {isComparingTeams && (
              <div className="mt-5 border-t border-slate-800 pt-5 space-y-6 animate-in fade-in duration-300">
                {/* Selectors */}
                <div className="grid grid-cols-1 sm:grid-cols-11 gap-3 items-center">
                  <div className="sm:col-span-5">
                    <label className="text-[11px] font-mono text-cyan-300 font-bold block mb-1">TEAM 1</label>
                    <select
                      value={compareTeamAId}
                      onChange={(e) => setCompareTeamAId(e.target.value)}
                      className="w-full rounded-xl border border-cyan-500/50 bg-slate-950 px-3 py-2 text-xs font-bold text-white cursor-pointer"
                    >
                      {TEAMS.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.name} (Rank #{t.ranking})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="sm:col-span-1 flex justify-center">
                    <button
                      onClick={handleSwapCompareTeams}
                      title="Swap teams"
                      className="h-9 w-9 rounded-xl border border-slate-700 bg-slate-800 flex items-center justify-center text-slate-300 hover:text-white cursor-pointer"
                    >
                      <ArrowRightLeft className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="sm:col-span-5">
                    <label className="text-[11px] font-mono text-amber-300 font-bold block mb-1">TEAM 2</label>
                    <select
                      value={compareTeamBId}
                      onChange={(e) => setCompareTeamBId(e.target.value)}
                      className="w-full rounded-xl border border-amber-500/50 bg-slate-950 px-3 py-2 text-xs font-bold text-white cursor-pointer"
                    >
                      {TEAMS.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.name} (Rank #{t.ranking})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Side-by-side Comparison Matrix */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Team A Card */}
                  <div className="rounded-xl border border-cyan-500/40 bg-cyan-950/20 p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <TeamCrest teamId={teamA.id} size={32} />
                        <CountryFlag countryCode={teamA.id} size="md" />
                        <div>
                          <h4 className="text-lg font-black text-white">{teamA.name}</h4>
                          <span className="text-xs font-mono text-cyan-400">Rank #{teamA.ranking} · {teamA.worldCupTitles} World Cups</span>
                        </div>
                      </div>
                      <span className="text-2xl font-black font-mono text-cyan-300">{teamA.ratings.overall}</span>
                    </div>

                    <div className="space-y-2 text-xs font-mono pt-2 border-t border-cyan-500/20">
                      <div className="flex justify-between">
                        <span className="text-slate-400">Batting Power:</span>
                        <span className="font-bold text-white">{teamA.ratings.batting}/100</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Bowling Depth:</span>
                        <span className="font-bold text-white">{teamA.ratings.bowling}/100</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Powerplay Execution:</span>
                        <span className="font-bold text-cyan-300">{teamA.ratings.powerplay}/100</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Death Overs Finishing:</span>
                        <span className="font-bold text-cyan-300">{teamA.ratings.deathOvers}/100</span>
                      </div>
                    </div>
                  </div>

                  {/* Team B Card */}
                  <div className="rounded-xl border border-amber-500/40 bg-amber-950/20 p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <TeamCrest teamId={teamB.id} size={32} />
                        <CountryFlag countryCode={teamB.id} size="md" />
                        <div>
                          <h4 className="text-lg font-black text-white">{teamB.name}</h4>
                          <span className="text-xs font-mono text-amber-400">Rank #{teamB.ranking} · {teamB.worldCupTitles} World Cups</span>
                        </div>
                      </div>
                      <span className="text-2xl font-black font-mono text-amber-300">{teamB.ratings.overall}</span>
                    </div>

                    <div className="space-y-2 text-xs font-mono pt-2 border-t border-amber-500/20">
                      <div className="flex justify-between">
                        <span className="text-slate-400">Batting Power:</span>
                        <span className="font-bold text-white">{teamB.ratings.batting}/100</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Bowling Depth:</span>
                        <span className="font-bold text-white">{teamB.ratings.bowling}/100</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Powerplay Execution:</span>
                        <span className="font-bold text-amber-300">{teamB.ratings.powerplay}/100</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Death Overs Finishing:</span>
                        <span className="font-bold text-amber-300">{teamB.ratings.deathOvers}/100</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end">
                  <button
                    onClick={() => launchSimMatch(teamA.id, teamB.id, 'ahmedabad')}
                    className="flex items-center gap-2 rounded-xl bg-cyan-500 px-5 py-2.5 text-xs font-black text-slate-950 hover:bg-cyan-400 transition-all cursor-pointer shadow-md shadow-cyan-500/20"
                  >
                    <Play className="h-4 w-4 fill-current" />
                    <span>Launch Match Simulation</span>
                    <TeamFlag code={teamA.id} size="xs" />
                    <span>vs</span>
                    <TeamFlag code={teamB.id} size="xs" />
                    <span>→</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-slate-500">Filter Nations:</span>
            <button
              onClick={() => setSelectedTeamFilter('ALL')}
              className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-all cursor-pointer ${
                selectedTeamFilter === 'ALL'
                  ? 'bg-slate-800 text-white border border-slate-700'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              All Teams ({TEAMS.length})
            </button>
            <button
              onClick={() => setSelectedTeamFilter('CHAMPIONS')}
              className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-all cursor-pointer ${
                selectedTeamFilter === 'CHAMPIONS'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              🏆 World Cup Champions
            </button>
            <button
              onClick={() => setSelectedTeamFilter('TOP4')}
              className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-all cursor-pointer ${
                selectedTeamFilter === 'TOP4'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Top 4 Ranked
            </button>
          </div>

          {/* Teams Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredTeams.map((team) => (
              <div
                key={team.id}
                className="group rounded-2xl border border-slate-800 bg-slate-900/50 p-5 space-y-4 hover:border-cyan-500/50 hover:bg-slate-900/80 transition-all shadow-md"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <TeamCrest teamId={team.id} size={36} />
                    <CountryFlag countryCode={team.id} size="md" />
                    <div>
                      <h4 className="text-base font-black text-white group-hover:text-cyan-300 transition-colors">
                        {team.name}
                      </h4>
                      <span className="text-xs font-mono text-slate-400">
                        ICC Rank #{team.ranking} · {team.squad.length} Squad Players
                      </span>
                    </div>
                  </div>

                  <span className="rounded-lg bg-slate-800 border border-slate-700 px-2.5 py-1 text-xs font-mono font-black text-cyan-300">
                    {team.ratings.overall}
                  </span>
                </div>

                {/* Rating Gauges */}
                <div className="space-y-2 text-xs font-mono">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Batting</span>
                    <span className="text-white font-bold">{team.ratings.batting}/100</span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-slate-800 overflow-hidden">
                    <div className="h-full bg-cyan-400" style={{ width: `${team.ratings.batting}%` }} />
                  </div>

                  <div className="flex justify-between pt-1">
                    <span className="text-slate-400">Bowling</span>
                    <span className="text-white font-bold">{team.ratings.bowling}/100</span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-slate-800 overflow-hidden">
                    <div className="h-full bg-blue-500" style={{ width: `${team.ratings.bowling}%` }} />
                  </div>
                </div>

                {/* Form & Squad Preview */}
                <div className="flex items-center justify-between border-t border-slate-800/80 pt-3 text-xs">
                  <div className="flex items-center gap-1">
                    <span className="text-slate-500 font-mono">Form:</span>
                    {team.recentForm.map((f, i) => (
                      <span
                        key={i}
                        className={`h-4 w-4 rounded flex items-center justify-center text-[10px] font-bold font-mono ${
                          f === 'W' ? 'bg-emerald-950 text-emerald-400' : 'bg-rose-950 text-rose-400'
                        }`}
                      >
                        {f}
                      </span>
                    ))}
                  </div>

                  <button
                    onClick={() => {
                      setPlayerTeamFilter(team.id);
                      setActiveTab('players');
                      cricketAudio.playBatHit();
                    }}
                    className="text-xs font-bold text-cyan-400 hover:text-cyan-300 transition-colors cursor-pointer"
                  >
                    View Roster ({team.squad.length}) →
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 2: PLAYER EXPLORER & SUPER-STAR ROSTER
          ========================================================================= */}
      {activeTab === 'players' && (
        <div className="space-y-6 animate-in fade-in duration-300">
          {/* Search & Filter Bar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
              <input
                type="text"
                placeholder="Search super-stars (e.g. Jasprit Bumrah, Suryakumar, Head, Klaasen)..."
                value={playerSearchQuery}
                onChange={(e) => setPlayerSearchQuery(e.target.value)}
                className="w-full rounded-xl border border-slate-800 bg-slate-900/80 pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 transition-colors"
              />
            </div>

            <div className="flex items-center gap-2">
              <select
                value={playerRoleFilter}
                onChange={(e) => setPlayerRoleFilter(e.target.value)}
                className="rounded-xl border border-slate-800 bg-slate-900 px-3 py-2.5 text-xs font-semibold text-slate-300 cursor-pointer focus:outline-none focus:border-cyan-400"
              >
                <option value="ALL">All Roles</option>
                <option value="BATTER">Batters</option>
                <option value="BOWLER">Bowlers</option>
                <option value="ALLROUNDER">All-Rounders</option>
                <option value="WK">Wicketkeepers</option>
              </select>

              <select
                value={playerTeamFilter}
                onChange={(e) => setPlayerTeamFilter(e.target.value)}
                className="rounded-xl border border-slate-800 bg-slate-900 px-3 py-2.5 text-xs font-semibold text-slate-300 cursor-pointer focus:outline-none focus:border-cyan-400"
              >
                <option value="ALL">All Nations ({allSquadPlayers.length})</option>
                {TEAMS.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} ({t.squad.length})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Interactive Nation Flag Filter Strip */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1.5 scrollbar-none">
            <button
              onClick={() => setPlayerTeamFilter('ALL')}
              className={`shrink-0 rounded-xl px-3 py-1.5 text-xs font-bold transition-all cursor-pointer border ${
                playerTeamFilter === 'ALL'
                  ? 'border-cyan-400 bg-cyan-500/20 text-white'
                  : 'border-slate-800 bg-slate-900/60 text-slate-400 hover:text-white'
              }`}
            >
              All ({allSquadPlayers.length})
            </button>
            {TEAMS.map((t) => (
              <button
                key={t.id}
                onClick={() => setPlayerTeamFilter(t.id)}
                className={`shrink-0 flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition-all cursor-pointer border ${
                  playerTeamFilter === t.id
                    ? 'border-cyan-400 bg-cyan-500/20 text-white shadow-sm'
                    : 'border-slate-800 bg-slate-900/60 text-slate-400 hover:text-white hover:border-slate-700'
                }`}
              >
                <TeamFlag code={t.id} size="xs" />
                <span>{t.name}</span>
                <span className="text-[10px] font-mono text-cyan-400">({t.squad.length})</span>
              </button>
            ))}
          </div>

          {/* Players Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {displayedPlayers.map((player) => (
              <div
                key={`${player.teamId}-${player.id}`}
                onClick={() => handleOpenPlayer(player)}
                className="group rounded-2xl border border-slate-800 bg-slate-900/60 p-4 space-y-3 hover:border-cyan-500/50 hover:bg-slate-900/90 transition-all cursor-pointer shadow-md"
              >
                <div className="flex items-start gap-3">
                  <PlayerCardAvatar
                    playerId={player.id}
                    name={player.name}
                    countryCode={player.teamId || player.countryCode}
                    jerseyNumber={player.jerseyNumber}
                    size="md"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <h4 className="text-sm font-bold text-white truncate group-hover:text-cyan-300 transition-colors">
                        {player.name}
                      </h4>
                      <CountryFlag countryCode={player.teamId || player.countryCode} size="sm" />
                    </div>
                    <span className="text-[11px] text-slate-400 block truncate">
                      {player.teamName} · {player.role}
                    </span>
                    <span className="text-[10px] font-mono text-cyan-400 font-bold block mt-0.5 tabular-nums">
                      Rating: {player.rating}/100
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-1.5 text-center text-xs font-mono tabular-nums border-t border-slate-800/80 pt-2.5">
                  <div className="rounded-lg border border-slate-800/80 bg-slate-950 p-1.5">
                    <span className="text-[9px] text-slate-500 block">MATCHES</span>
                    <span className="font-bold text-white">{player.stats.matches}</span>
                  </div>
                  <div className="rounded-lg border border-slate-800/80 bg-slate-950 p-1.5">
                    <span className="text-[9px] text-slate-500 block">
                      {player.stats.wickets > 5 && player.stats.runs < 350 ? 'WICKETS' : 'RUNS'}
                    </span>
                    <span className="font-bold text-amber-300">
                      {player.stats.wickets > 5 && player.stats.runs < 350 ? player.stats.wickets : player.stats.runs}
                    </span>
                  </div>
                  <div className="rounded-lg border border-slate-800/80 bg-slate-950 p-1.5">
                    <span className="text-[9px] text-slate-500 block">
                      {player.stats.wickets > 5 && player.stats.runs < 350 ? 'ECON' : 'SR'}
                    </span>
                    <span className="font-bold text-cyan-300">
                      {player.stats.wickets > 5 && player.stats.runs < 350 ? player.stats.economy : player.stats.strikeRate}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
                  <span>Impact: <strong className="text-white tabular-nums">{player.stats.impactScore || 90}</strong></span>
                  <span className="text-cyan-400 font-semibold group-hover:translate-x-1 transition-transform">
                    Inspect DNA →
                  </span>
                </div>
              </div>
            ))}
          </div>

          {filteredPlayers.length > displayedPlayers.length && (
            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              <button
                onClick={() => setShowAllPlayers(true)}
                className="rounded-xl bg-cyan-500 px-6 py-2.5 text-xs font-black text-slate-950 hover:bg-cyan-400 transition-colors cursor-pointer shadow-md shadow-cyan-500/20"
              >
                Show All {filteredPlayers.length} Squad Players Here ↓
              </button>
              <button
                onClick={() => setActiveView('players')}
                className="rounded-xl border border-slate-800 bg-slate-900 px-6 py-2.5 text-xs font-bold text-cyan-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              >
                Open Cricket Universe →
              </button>
            </div>
          )}
        </div>
      )}

      {/* =========================================================================
          TAB 3: INTERACTIVE MATCH PREDICTOR
          ========================================================================= */}
      {activeTab === 'predict' && (
        <div className="space-y-6 animate-in fade-in duration-300">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left Controls */}
            <div className="lg:col-span-5 rounded-2xl border border-slate-800 bg-slate-900/60 p-5 space-y-4">
              <span className="text-xs font-mono font-bold text-cyan-400 uppercase">
                SCENARIO CONFIGURATION
              </span>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="text-slate-400 font-mono block mb-1">TEAM A (Batting 1st)</label>
                  <select
                    value={predTeamAId}
                    onChange={(e) => setPredTeamAId(e.target.value)}
                    className="w-full rounded-xl border border-cyan-500/50 bg-slate-950 px-3 py-2 font-bold text-white cursor-pointer"
                  >
                    {TEAMS.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name} (Rank #{t.ranking})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-slate-400 font-mono block mb-1">TEAM B (Chasing)</label>
                  <select
                    value={predTeamBId}
                    onChange={(e) => setPredTeamBId(e.target.value)}
                    className="w-full rounded-xl border border-amber-500/50 bg-slate-950 px-3 py-2 font-bold text-white cursor-pointer"
                  >
                    {TEAMS.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name} (Rank #{t.ranking})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-slate-400 font-mono block mb-1">VENUE</label>
                  <select
                    value={predStadiumId}
                    onChange={(e) => setPredStadiumId(e.target.value)}
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 font-semibold text-slate-200 cursor-pointer"
                  >
                    {STADIUMS.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.city})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="text-slate-400 font-mono block mb-1">PITCH TYPE</label>
                    <select
                      value={predPitchType}
                      onChange={(e) => setPredPitchType(e.target.value as any)}
                      className="w-full rounded-xl border border-slate-700 bg-slate-950 px-2.5 py-2 font-semibold text-slate-200 cursor-pointer"
                    >
                      <option value="flat">Flat Batting Deck</option>
                      <option value="turner">Dry Turner (Spin)</option>
                      <option value="green">Green Seamer (Pace)</option>
                      <option value="slow">Slow & Two-Paced</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-slate-400 font-mono block mb-1">EVENING DEW</label>
                    <button
                      type="button"
                      onClick={() => setPredDew((prev) => !prev)}
                      className={`w-full rounded-xl border px-2.5 py-2 font-bold transition-all cursor-pointer ${
                        predDew
                          ? 'border-cyan-400 bg-cyan-500/20 text-cyan-300'
                          : 'border-slate-700 bg-slate-950 text-slate-400'
                      }`}
                    >
                      {predDew ? 'Dew Present (+4% Chase)' : 'Dry Outfield'}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Predicted Output */}
            <div className="lg:col-span-7 rounded-2xl border border-cyan-500/30 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-6 flex flex-col justify-between space-y-6 shadow-xl">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="rounded-md bg-cyan-500/20 border border-cyan-400/40 px-2.5 py-0.5 text-xs font-mono font-bold text-cyan-300">
                    5,000 MONTE CARLO SIMULATIONS
                  </span>
                  <span className="text-xs font-mono text-slate-400">Confidence: 84%</span>
                </div>

                {/* Big Probability Display */}
                <div className="grid grid-cols-2 gap-4 text-center font-mono">
                  <div className="rounded-xl border border-cyan-500/30 bg-cyan-950/20 p-4">
                    <CountryFlag countryCode={predTeamA.id} size="md" className="mx-auto mb-2" />
                    <span className="text-xs text-slate-400 block">{predTeamA.name}</span>
                    <span className="text-3xl font-black text-cyan-400">{predStats.probA}%</span>
                    <span className="text-[10px] text-slate-500 block mt-1">Projected: {predStats.projectedA}</span>
                  </div>

                  <div className="rounded-xl border border-amber-500/30 bg-amber-950/20 p-4">
                    <CountryFlag countryCode={predTeamB.id} size="md" className="mx-auto mb-2" />
                    <span className="text-xs text-slate-400 block">{predTeamB.name}</span>
                    <span className="text-3xl font-black text-amber-400">{predStats.probB}%</span>
                    <span className="text-[10px] text-slate-500 block mt-1">Projected: {predStats.projectedB}</span>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="h-3 w-full overflow-hidden rounded-full bg-slate-900 border border-slate-800 flex">
                  <div
                    className="h-full bg-gradient-to-r from-blue-600 to-cyan-400 transition-all duration-500 shadow-[0_0_12px_rgba(6,182,212,0.8)]"
                    style={{ width: `${predStats.probA}%` }}
                  />
                  <div
                    className="h-full bg-gradient-to-r from-amber-400 to-amber-600 transition-all duration-500 shadow-[0_0_12px_rgba(245,158,11,0.6)]"
                    style={{ width: `${predStats.probB}%` }}
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-3">
                <button
                  onClick={() => launchSimMatch(predTeamA.id, predTeamB.id, predStadium.id)}
                  className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-cyan-500 px-4 py-3 text-xs font-black text-slate-950 hover:bg-cyan-400 transition-all cursor-pointer shadow-md shadow-cyan-500/20"
                >
                  <Play className="h-4 w-4 fill-current" />
                  <span>Launch Live 3D Simulation Match</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
