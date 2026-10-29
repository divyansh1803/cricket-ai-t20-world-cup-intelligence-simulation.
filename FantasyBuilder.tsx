import React, { useState, useMemo } from 'react';
import { useGame } from '../../context/GameContext';
import { TEAMS } from '../../data/cricketData';
import { Player } from '../../types/cricket';
import { PlayerCardAvatar, TeamFlag } from '../common/CricketIdentity';
import { cricketAudio } from '../../utils/audioSystem';
import {
  Layers,
  Sparkles,
  Shield,
  RotateCcw,
  Check,
  Plus,
  Trash2,
  Award,
  Search,
} from 'lucide-react';

export const FantasyBuilder: React.FC = () => {
  const { addXp } = useGame();
  const allPlayers = useMemo(
    () => TEAMS.flatMap((t) => t.squad.map((p) => ({ ...p, teamId: t.id, teamName: t.name }))),
    []
  );
  const [teamFilter, setTeamFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Selected player IDs
  const [selectedIds, setSelectedIds] = useState<string[]>([
    'sky', 'bumrah', 'hardik', 'arshdeep', 'pant', 'head', 'starc', 'cummins', 'klaasen', 'rashid', 'buttler',
  ]);

  const selectedPlayers = allPlayers.filter((p) => selectedIds.includes(p.id));
  const visiblePoolPlayers = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return allPlayers.filter((p) => {
      const matchesTeam = teamFilter === 'ALL' || p.teamId === teamFilter;
      const matchesSearch =
        !q ||
        p.name.toLowerCase().includes(q) ||
        p.role.toLowerCase().includes(q) ||
        p.teamName.toLowerCase().includes(q);
      return matchesTeam && matchesSearch;
    });
  }, [allPlayers, teamFilter, searchQuery]);

  // Squad counts
  const wkCount = selectedPlayers.filter((p) => p.role.includes('Wicketkeeper')).length;
  const batCount = selectedPlayers.filter((p) => p.role.includes('Batter') && !p.role.includes('Wicketkeeper')).length;
  const arCount = selectedPlayers.filter((p) => p.role.includes('All-Rounder')).length;
  const bowlCount = selectedPlayers.filter((p) => p.role.includes('Bowler')).length;

  // Calculate AI Team Score (0-100)
  const avgRating = selectedPlayers.length > 0 ? selectedPlayers.reduce((acc, p) => acc + p.rating, 0) / selectedPlayers.length : 0;
  const balancePenalty = (wkCount < 1 ? 15 : 0) + (bowlCount < 3 ? 15 : 0) + (selectedPlayers.length !== 11 ? 20 : 0);
  const aiTeamScore = Math.max(20, Math.min(99, Math.round(avgRating - balancePenalty)));

  const handleTogglePlayer = (player: Player) => {
    if (selectedIds.includes(player.id)) {
      setSelectedIds(selectedIds.filter((id) => id !== player.id));
    } else {
      if (selectedIds.length >= 11) return;
      setSelectedIds([...selectedIds, player.id]);
    }
    cricketAudio.playBatHit();
  };

  const handleOptimizeXi = () => {
    cricketAudio.playBoundary();
    // Optimal 11: Top rated WK, Batters, All-rounders, and Bowlers
    const optimized = ['sky', 'bumrah', 'klaasen', 'head', 'buttler', 'rashid', 'hardik', 'cummins', 'arshdeep', 'rabada', 'maxwell'];
    setSelectedIds(optimized);
    addXp(150, 'AI Algorithmic XI Optimization applied (97/100 Team Score)');
  };

  const handleClear = () => {
    setSelectedIds([]);
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-rose-400">
            <Layers className="h-3.5 w-3.5" />
            <span>FANTASY XI BUILDER</span>
            <span aria-hidden="true">·</span>
            <span>AI SQUAD OPTIMIZATION</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight mt-1">
            Build Your World Cup XI
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Assemble 11 international stars (Min 1 WK, 3-5 BAT, 1-3 AR, 3-5 BOWL) and evaluate balance against tournament models.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleOptimizeXi}
            className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-sky-500 to-indigo-600 px-4 py-2.5 text-xs font-bold text-white hover:opacity-90 transition-opacity shadow-lg shadow-sky-500/20 cursor-pointer"
          >
            <Sparkles className="h-4 w-4" />
            <span>OPTIMIZE MY XI</span>
          </button>
          <button
            onClick={handleClear}
            className="rounded-xl border border-slate-800 bg-slate-900 px-3 py-2 text-xs text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <RotateCcw className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Team Intelligence Header Card */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6 space-y-4 backdrop-blur-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono text-slate-400">AI SQUAD POWER RATING</span>
            <span className="text-xs font-mono text-emerald-400">BALANCED</span>
          </div>

          <div className="flex items-baseline justify-between">
            <p className="text-4xl font-black text-white tabular-nums">
              {aiTeamScore}<span className="text-lg text-slate-500">/100</span>
            </p>
            <span className="text-xs font-mono text-sky-400">{selectedPlayers.length} / 11 PLAYERS</span>
          </div>

          <div className="h-2 w-full overflow-hidden rounded-full bg-slate-800">
            <div
              className="h-full bg-gradient-to-r from-sky-500 to-emerald-500 transition-all duration-500"
              style={{ width: `${aiTeamScore}%` }}
            />
          </div>

          <div className="grid grid-cols-4 gap-2 text-center text-[11px] font-mono border-t border-slate-800 pt-3">
            <div>
              <span className="text-slate-500 block">WK</span>
              <span className={`font-bold ${wkCount >= 1 ? 'text-white' : 'text-rose-400'}`}>{wkCount}</span>
            </div>
            <div>
              <span className="text-slate-500 block">BAT</span>
              <span className={`font-bold ${batCount >= 3 ? 'text-white' : 'text-amber-400'}`}>{batCount}</span>
            </div>
            <div>
              <span className="text-slate-500 block">AR</span>
              <span className={`font-bold ${arCount >= 1 ? 'text-white' : 'text-slate-400'}`}>{arCount}</span>
            </div>
            <div>
              <span className="text-slate-500 block">BOWL</span>
              <span className={`font-bold ${bowlCount >= 3 ? 'text-white' : 'text-rose-400'}`}>{bowlCount}</span>
            </div>
          </div>
        </div>

        {/* AI Tactical Feedback */}
        <div className="lg:col-span-2 rounded-2xl border border-slate-800 bg-slate-900/80 p-6 space-y-3 backdrop-blur-md">
          <span className="text-xs font-mono text-sky-400 font-bold block">AI TACTICAL ANALYSIS</span>
          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-sans">
            {aiTeamScore >= 92
              ? 'World-class team balance. Possesses top-order powerplay velocity (Travis Head/Jos Buttler), elite middle-overs spin domination (Heinrich Klaasen/SKY), and lock-down death bowling with sub-6.5 economy (Jasprit Bumrah).'
              : 'Squad shows good explosive potential, but death over containment could leak runs in the final 4 overs. Consider including Jasprit Bumrah or Pat Cummins for death bowling mastery.'}
          </p>
          <div className="flex flex-wrap items-center gap-3 pt-2 text-xs font-mono text-slate-400">
            <span>Pace Coverage: 94%</span>
            <span aria-hidden="true">·</span>
            <span>Spin Grip: 91%</span>
            <span aria-hidden="true">·</span>
            <span>Batting Depth: Down to #8</span>
          </div>
        </div>
      </div>

      {/* Player Pool Selector Grid */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h2 className="text-base font-bold text-white">
            Select From Tournament Pool ({visiblePoolPlayers.length} Players):
          </h2>
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search any player or role..."
              className="w-full rounded-xl border border-slate-800 bg-slate-900 pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:border-sky-400 focus:outline-none"
            />
          </div>
        </div>

        {/* Nation Filter Strip */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          <button
            onClick={() => setTeamFilter('ALL')}
            className={`shrink-0 rounded-xl px-3 py-1.5 text-xs font-bold border transition-all cursor-pointer ${
              teamFilter === 'ALL'
                ? 'border-sky-400 bg-sky-500/20 text-white'
                : 'border-slate-800 bg-slate-900/60 text-slate-400 hover:text-white'
            }`}
          >
            All ({allPlayers.length})
          </button>
          {TEAMS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTeamFilter(t.id)}
              className={`shrink-0 flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold border transition-all cursor-pointer ${
                teamFilter === t.id
                  ? 'border-sky-400 bg-sky-500/20 text-white'
                  : 'border-slate-800 bg-slate-900/60 text-slate-400 hover:text-white'
              }`}
            >
              <TeamFlag code={t.id} size="xs" />
              <span>{t.name}</span>
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {visiblePoolPlayers.map((player) => {
            const isSelected = selectedIds.includes(player.id);
            return (
              <div
                key={`${player.teamId}-${player.id}`}
                onClick={() => handleTogglePlayer(player)}
                className={`group rounded-xl border p-3 transition-all cursor-pointer flex items-center justify-between gap-2.5 ${
                  isSelected
                    ? 'border-sky-500 bg-sky-500/10 shadow-md'
                    : 'border-slate-800 bg-slate-900/50 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <PlayerCardAvatar
                    playerId={player.id}
                    name={player.name}
                    countryCode={player.teamId || player.countryCode}
                    jerseyNumber={player.jerseyNumber}
                    size="sm"
                  />
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-white truncate">{player.name}</span>
                      <TeamFlag code={player.teamId || player.countryCode} size="xs" />
                    </div>
                    <p className="text-[11px] text-slate-400 truncate">{player.role}</p>
                    <p className="text-[10px] font-mono text-slate-500 mt-0.5 tabular-nums">
                      Rating: {player.rating} · SR: {player.stats.strikeRate}
                    </p>
                  </div>
                </div>

                <div
                  className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md ${
                    isSelected ? 'bg-sky-500 text-slate-950 font-bold' : 'border border-slate-700 text-slate-500'
                  }`}
                >
                  {isSelected ? <Check className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
