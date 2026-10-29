import React from 'react';
import { Team } from '../../types/cricket';
import { CountryFlag, TeamCrest, getTeamFlagUrl } from '../common/CricketIdentity';
import { cricketAudio } from '../../utils/audioSystem';
import { Shield, Clock, CheckCircle2, Play, ChevronRight, Trophy } from 'lucide-react';

export interface InningsScoreData {
  team: Team;
  runs: number;
  wickets: number;
  overs: string;
  totalOvers: number;
  status: 'live' | 'completed' | 'upcoming';
  target?: number;
}

export interface InningsSwitcherProps {
  currentViewInnings: 1 | 2;
  liveMatchInnings: 1 | 2;
  firstInnings: InningsScoreData;
  secondInnings: InningsScoreData;
  onSelectInnings: (innings: 1 | 2) => void;
  className?: string;
}

export const InningsSwitcher: React.FC<InningsSwitcherProps> = ({
  currentViewInnings,
  liveMatchInnings,
  firstInnings,
  secondInnings,
  onSelectInnings,
  className = '',
}) => {
  const handleSwitch = (innings: 1 | 2) => {
    cricketAudio.playBatHit();
    onSelectInnings(innings);
  };

  return (
    <div
      className={`rounded-2xl border border-cyan-500/30 bg-[#02071a]/90 p-2 sm:p-2.5 backdrop-blur-xl shadow-lg ring-1 ring-cyan-500/20 ${className}`}
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {/* =========================================================================
            1ST INNINGS PANEL
            ========================================================================= */}
        <button
          type="button"
          onClick={() => handleSwitch(1)}
          className={`relative rounded-xl p-3 text-left transition-all cursor-pointer overflow-hidden ${
            currentViewInnings === 1
              ? 'border-2 border-cyan-400 bg-gradient-to-r from-cyan-950/70 via-blue-950/60 to-slate-900/80 shadow-[0_0_20px_rgba(6,182,212,0.3)] ring-1 ring-cyan-400/50'
              : 'border border-slate-800/80 bg-slate-950/60 hover:bg-slate-900/60 hover:border-slate-700 opacity-80 hover:opacity-100'
          }`}
        >
          {/* Active selection glow accent */}
          {currentViewInnings === 1 && (
            <div className="absolute top-0 right-0 h-10 w-10 bg-cyan-400/20 rounded-bl-full blur-sm pointer-events-none" />
          )}

          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono font-bold tracking-wider uppercase text-slate-400">
                1ST INNINGS
              </span>
              {firstInnings.status === 'completed' && (
                <span className="rounded-md bg-emerald-500/20 border border-emerald-500/40 px-1.5 py-0.5 text-[9px] font-mono font-bold text-emerald-300 flex items-center gap-1">
                  <CheckCircle2 className="h-2.5 w-2.5" />
                  <span>COMPLETED</span>
                </span>
              )}
              {firstInnings.status === 'live' && (
                <span className="rounded-md bg-cyan-500/20 border border-cyan-500/40 px-1.5 py-0.5 text-[9px] font-mono font-bold text-cyan-300 animate-pulse flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-cyan-400" />
                  <span>LIVE</span>
                </span>
              )}
            </div>

            {currentViewInnings === 1 && (
              <span className="text-[10px] font-mono font-bold text-cyan-300 bg-cyan-500/20 px-2 py-0.5 rounded-full border border-cyan-400/40">
                VIEWING
              </span>
            )}
          </div>

          {/* Team Name, Flag & Score */}
          <div className="mt-2 flex items-center justify-between gap-2 min-w-0">
            <div className="flex items-center gap-2.5 min-w-0">
              <img
                src={getTeamFlagUrl(firstInnings.team.id)}
                alt={`${firstInnings.team.name} flag`}
                className="h-4 w-6 rounded-[3px] object-cover border border-white/20 shrink-0"
              />
              <div className="min-w-0">
                <span className="text-sm font-black text-white block leading-tight truncate">
                  {firstInnings.team.name}
                </span>
                <span className="text-[10px] font-mono text-slate-400 block truncate">
                  1st Innings Batting
                </span>
              </div>
            </div>

            <div className="text-right font-mono">
              <span className="text-lg font-black text-white tabular-nums tracking-tight">
                {firstInnings.runs}/{firstInnings.wickets}
              </span>
              <span className="text-[10px] text-slate-400 block">
                ({firstInnings.overs} ov)
              </span>
            </div>
          </div>
        </button>

        {/* =========================================================================
            2ND INNINGS PANEL
            ========================================================================= */}
        <button
          type="button"
          onClick={() => handleSwitch(2)}
          className={`relative rounded-xl p-3 text-left transition-all cursor-pointer overflow-hidden ${
            currentViewInnings === 2
              ? 'border-2 border-cyan-400 bg-gradient-to-r from-cyan-950/70 via-blue-950/60 to-slate-900/80 shadow-[0_0_20px_rgba(6,182,212,0.3)] ring-1 ring-cyan-400/50'
              : 'border border-slate-800/80 bg-slate-950/60 hover:bg-slate-900/60 hover:border-slate-700 opacity-80 hover:opacity-100'
          }`}
        >
          {/* Active selection glow accent */}
          {currentViewInnings === 2 && (
            <div className="absolute top-0 right-0 h-10 w-10 bg-cyan-400/20 rounded-bl-full blur-sm pointer-events-none" />
          )}

          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono font-bold tracking-wider uppercase text-slate-400">
                2ND INNINGS
              </span>
              {secondInnings.status === 'live' && (
                <span className="rounded-md bg-amber-500/20 border border-amber-500/40 px-1.5 py-0.5 text-[9px] font-mono font-bold text-amber-300 animate-pulse flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
                  <span>LIVE CHASE</span>
                </span>
              )}
              {secondInnings.status === 'upcoming' && (
                <span className="rounded-md bg-slate-800 border border-slate-700 px-1.5 py-0.5 text-[9px] font-mono font-bold text-slate-400">
                  UPCOMING
                </span>
              )}
              {secondInnings.status === 'completed' && (
                <span className="rounded-md bg-emerald-500/20 border border-emerald-500/40 px-1.5 py-0.5 text-[9px] font-mono font-bold text-emerald-300 flex items-center gap-1">
                  <CheckCircle2 className="h-2.5 w-2.5" />
                  <span>COMPLETED</span>
                </span>
              )}
            </div>

            {currentViewInnings === 2 && (
              <span className="text-[10px] font-mono font-bold text-cyan-300 bg-cyan-500/20 px-2 py-0.5 rounded-full border border-cyan-400/40">
                VIEWING
              </span>
            )}
          </div>

          {/* Team Name, Flag & Score */}
          <div className="mt-2 flex items-center justify-between gap-2 min-w-0">
            <div className="flex items-center gap-2.5 min-w-0">
              <img
                src={getTeamFlagUrl(secondInnings.team.id)}
                alt={`${secondInnings.team.name} flag`}
                className="h-4 w-6 rounded-[3px] object-cover border border-white/20 shrink-0"
              />
              <div className="min-w-0">
                <span className="text-sm font-black text-white block leading-tight truncate">
                  {secondInnings.team.name}
                </span>
                <span className="text-[10px] font-mono text-slate-400 block truncate">
                  2nd Innings Run Chase
                </span>
              </div>
            </div>

            <div className="text-right font-mono">
              {secondInnings.status === 'upcoming' ? (
                <div>
                  <span className="text-xs font-bold text-slate-400 block">
                    Target: {secondInnings.target || 'TBD'}
                  </span>
                  <span className="text-[9px] text-slate-500 block">Yet to bat</span>
                </div>
              ) : (
                <div>
                  <span className="text-lg font-black text-cyan-300 tabular-nums tracking-tight">
                    {secondInnings.runs}/{secondInnings.wickets}
                  </span>
                  <span className="text-[10px] text-slate-400 block">
                    ({secondInnings.overs} ov)
                  </span>
                </div>
              )}
            </div>
          </div>
        </button>
      </div>
    </div>
  );
};
