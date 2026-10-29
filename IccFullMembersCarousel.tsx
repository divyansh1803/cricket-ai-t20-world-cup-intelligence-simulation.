import React, { useRef } from 'react';
import { TEAMS } from '../../data/cricketData';
import { CountryFlag, TeamCrest } from './CricketIdentity';
import { Trophy, ChevronLeft, ChevronRight, Shield, Star, BarChart3, Landmark } from 'lucide-react';

interface IccFullMembersCarouselProps {
  selectedTeamId: string;
  onSelectTeam: (teamId: string) => void;
  onNavigateTab?: (tab: string) => void;
}

export const IccFullMembersCarousel: React.FC<IccFullMembersCarouselProps> = ({
  selectedTeamId,
  onSelectTeam,
  onNavigateTab,
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  const scrollLeft = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ left: -260, behavior: 'smooth' });
    }
  };

  const scrollRight = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ left: 260, behavior: 'smooth' });
    }
  };

  // Full 12 ICC Test Playing / Full Member nations in official ICC ranking order
  const fullMembersOrder = ['ind', 'aus', 'eng', 'sa', 'pak', 'wi', 'nz', 'sl', 'ban', 'afg', 'ire', 'zim'];
  const orderedTeams = fullMembersOrder
    .map((id) => TEAMS.find((t) => t.id === id))
    .filter(Boolean) as typeof TEAMS;

  return (
    <div className="relative w-full overflow-hidden rounded-3xl border border-sky-500/30 bg-gradient-to-b from-[#061129]/95 via-[#030919]/98 to-[#020612] p-4 sm:p-5 lg:p-6 shadow-[0_0_50px_rgba(2,132,199,0.22)] backdrop-blur-2xl space-y-4 select-none">
      {/* Background Stadium Glow & Ambient Beam */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-24 left-1/4 h-48 w-96 rounded-full bg-cyan-500/10 blur-3xl" />
        <div className="absolute -top-24 right-1/4 h-48 w-96 rounded-full bg-blue-600/10 blur-3xl" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-sky-900/10 via-transparent to-transparent" />
      </div>

      {/* -------------------------------------------------------------
          TOP BAR: ICC Logo | INTERNATIONAL CRICKET COUNCIL ... ONE GAME / 12 NATIONS / ENDLESS STORIES
          ------------------------------------------------------------- */}
      <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-sky-500/20 pb-3">
        {/* Left: ICC Official Logo Branding */}
        <div className="flex items-center gap-3">
          {/* ICC Emblem SVG with cyan speed rings */}
          <div className="flex items-center gap-2">
            <svg viewBox="0 0 100 100" className="h-7 w-7 text-cyan-400 drop-shadow-[0_0_8px_rgba(6,182,212,0.8)]" fill="currentColor">
              {/* Three stylized orbital speed crescents */}
              <circle cx="50" cy="50" r="42" fill="none" stroke="currentColor" strokeWidth="6" strokeDasharray="18 10" strokeLinecap="round" />
              <circle cx="50" cy="50" r="28" fill="none" stroke="currentColor" strokeWidth="5" strokeDasharray="12 8" />
              <circle cx="50" cy="50" r="14" fill="currentColor" opacity="0.9" />
            </svg>
            <span className="text-xl font-black italic tracking-tighter text-white">
              ICC
            </span>
          </div>

          <span className="text-slate-600 font-light">|</span>

          <span className="text-[11px] sm:text-xs font-mono font-bold tracking-[0.2em] text-slate-300 uppercase">
            INTERNATIONAL CRICKET COUNCIL
          </span>
        </div>

        {/* Right: Slogan */}
        <div className="text-[10px] sm:text-[11px] font-mono tracking-[0.25em] text-slate-400 uppercase font-semibold">
          ONE GAME <span className="text-slate-600 font-normal mx-1">/</span> 12 NATIONS <span className="text-slate-600 font-normal mx-1">/</span> ENDLESS STORIES
        </div>
      </div>

      {/* -------------------------------------------------------------
          CAROUSEL ROW: < Arrow | 12 NATION CARDS | > Arrow
          ------------------------------------------------------------- */}
      <div className="relative z-10 flex items-center gap-2 sm:gap-3">
        {/* Scroll Left Button */}
        <button
          onClick={scrollLeft}
          aria-label="Scroll nations left"
          className="flex h-9 w-9 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-full border border-sky-500/30 bg-[#06122c]/80 text-slate-300 hover:text-white hover:border-cyan-400 hover:bg-sky-950 transition-all shadow-lg cursor-pointer"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>

        {/* Scrollable Nations Strip */}
        <div
          ref={scrollRef}
          className="flex flex-1 items-center gap-2.5 sm:gap-3 overflow-x-auto py-2 px-1 scrollbar-none scroll-smooth"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {orderedTeams.map((team, index) => {
            const isSelected = team.id === selectedTeamId;
            const rankNumber = index + 1;

            return (
              <div
                key={team.id}
                onClick={() => onSelectTeam(team.id)}
                className={`group relative flex flex-col items-center justify-between rounded-2xl p-2.5 sm:p-3 min-w-[100px] sm:min-w-[112px] h-[126px] sm:h-[134px] transition-all duration-300 cursor-pointer ${
                  isSelected
                    ? 'border-2 border-cyan-400 bg-gradient-to-b from-[#0a235c] via-[#05143a] to-[#020b22] shadow-[0_0_28px_rgba(6,182,212,0.85)] scale-105 z-10 ring-2 ring-cyan-400/40'
                    : 'border border-sky-900/40 bg-[#061025]/85 hover:border-sky-500/60 hover:bg-[#081533] hover:scale-102 shadow-md'
                }`}
              >
                {/* 3D Glossy Crest & Flag Container */}
                <div
                  className={`relative flex items-center justify-center rounded-xl p-1.5 transition-all duration-300 ${
                    isSelected
                      ? 'w-13 h-10 sm:w-14 sm:h-10.5 bg-gradient-to-b from-white/25 via-white/5 to-black/40 border border-white/40 shadow-[0_4px_14px_rgba(0,0,0,0.6)]'
                      : 'w-12 h-9 sm:w-13 sm:h-9.5 bg-[#09142b] border border-slate-700/60 shadow-sm group-hover:border-slate-500'
                  }`}
                >
                  {/* Gloss top-sheen highlight */}
                  <div className="absolute inset-x-0 top-0 h-1/2 rounded-t-xl bg-gradient-to-b from-white/20 to-transparent pointer-events-none" />

                  <div className="w-full h-full flex items-center justify-center">
                    <TeamCrest teamId={team.id} size={28} />
                  </div>
                </div>

                {/* Team Name */}
                <span
                  className={`text-xs sm:text-[13px] font-black tracking-tight text-center truncate w-full transition-colors ${
                    isSelected ? 'text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]' : 'text-slate-200 group-hover:text-white'
                  }`}
                >
                  {team.name}
                </span>

                {/* Rank Badge */}
                {isSelected ? (
                  <div className="flex items-center gap-1 text-[11px] font-mono font-black text-amber-400 tracking-wider">
                    <span>👑</span>
                    <span>#{rankNumber}</span>
                  </div>
                ) : (
                  <span className="rounded-full bg-slate-900/90 border border-slate-800 px-2.5 py-0.5 text-[10px] font-mono font-bold text-slate-400 group-hover:text-slate-200">
                    #{rankNumber}
                  </span>
                )}
              </div>
            );
          })}
        </div>

        {/* Scroll Right Button */}
        <button
          onClick={scrollRight}
          aria-label="Scroll nations right"
          className="flex h-9 w-9 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-full border border-sky-500/30 bg-[#06122c]/80 text-slate-300 hover:text-white hover:border-cyan-400 hover:bg-sky-950 transition-all shadow-lg cursor-pointer"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>

      {/* -------------------------------------------------------------
          BOTTOM FOOTER BAR: ICC FULL MEMBERS (12) | ... Links
          ------------------------------------------------------------- */}
      <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 border-t border-sky-500/20 pt-3">
        {/* Left: Trophy + Title */}
        <div className="flex items-center gap-2.5">
          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-sky-500/20 border border-sky-400/40 text-sky-400 shadow-[0_0_10px_rgba(14,165,233,0.4)]">
            <Trophy className="h-3.5 w-3.5" />
          </div>
          <span className="text-xs font-mono font-black text-white tracking-wider">
            ICC FULL MEMBERS (12)
          </span>
          <span className="text-slate-600 font-light hidden sm:inline">|</span>
          <span className="text-xs text-slate-400 hidden sm:inline">
            The strongest cricket nations in the world
          </span>
        </div>

        {/* Right: Quick Action Navigation Links */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs font-mono text-slate-300">
          <button
            onClick={() => onNavigateTab && onNavigateTab('rankings')}
            className="flex items-center gap-1.5 hover:text-cyan-400 transition-colors cursor-pointer"
          >
            <Shield className="h-3.5 w-3.5 text-sky-400" />
            <span>Live Rankings</span>
          </button>

          <span className="text-slate-700">|</span>

          <button
            onClick={() => onNavigateTab && onNavigateTab('stats')}
            className="flex items-center gap-1.5 hover:text-cyan-400 transition-colors cursor-pointer"
          >
            <Star className="h-3.5 w-3.5 text-amber-400" />
            <span>Team Stats</span>
          </button>

          <span className="text-slate-700">|</span>

          <button
            onClick={() => onNavigateTab && onNavigateTab('squad')}
            className="flex items-center gap-1.5 hover:text-cyan-400 transition-colors cursor-pointer"
          >
            <BarChart3 className="h-3.5 w-3.5 text-emerald-400" />
            <span>Squad & Players</span>
          </button>

          <span className="text-slate-700">|</span>

          <button
            onClick={() => onNavigateTab && onNavigateTab('stadiums')}
            className="flex items-center gap-1.5 hover:text-cyan-400 transition-colors cursor-pointer"
          >
            <Landmark className="h-3.5 w-3.5 text-purple-400" />
            <span>Stadiums</span>
          </button>
        </div>
      </div>
    </div>
  );
};
