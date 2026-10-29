import React, { useState } from 'react';
import { Player, Team } from '../../types/cricket';
import { CountryFlag, PlayerCardAvatar, TeamCrest } from '../common/CricketIdentity';
import { cricketAudio } from '../../utils/audioSystem';
import { ArrowDown, ArrowUp, RotateCcw, Users, X } from 'lucide-react';

interface PlayingXISelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  teamA: Team;
  teamB: Team;
  playingXIA: Player[];
  playingXIB: Player[];
  onUpdatePlayingXIA: (next: Player[]) => void;
  onUpdatePlayingXIB: (next: Player[]) => void;
  onResetDefaultOrders: () => void;
}

export const PlayingXISelectorModal: React.FC<PlayingXISelectorModalProps> = ({
  isOpen,
  onClose,
  teamA,
  teamB,
  playingXIA,
  playingXIB,
  onUpdatePlayingXIA,
  onUpdatePlayingXIB,
  onResetDefaultOrders,
}) => {
  const [selectedSide, setSelectedSide] = useState<'A' | 'B'>('A');

  if (!isOpen) return null;

  const activeTeam = selectedSide === 'A' ? teamA : teamB;
  const activeXI = selectedSide === 'A' ? playingXIA : playingXIB;
  const setActiveXI = selectedSide === 'A' ? onUpdatePlayingXIA : onUpdatePlayingXIB;

  const moveBatter = (idx: number, direction: -1 | 1) => {
    const targetIdx = idx + direction;
    if (targetIdx < 0 || targetIdx >= activeXI.length) return;
    cricketAudio.playUiClick();
    const next = [...activeXI];
    const tmp = next[idx];
    next[idx] = next[targetIdx];
    next[targetIdx] = tmp;
    setActiveXI(next);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-3 sm:p-6 backdrop-blur-xl animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="relative w-full max-w-3xl max-h-[90vh] flex flex-col rounded-3xl border border-slate-800 bg-[#050C1C] shadow-2xl overflow-hidden text-slate-100">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 bg-[#08132B] border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <Users className="h-5 w-5 text-cyan-400" />
            <div>
              <h2 className="text-base sm:text-lg font-black text-white">
                Playing XI & Batting Order Configuration
              </h2>
              <p className="text-xs font-mono text-slate-400">
                Customize batting positions #1–#11 and bowling unit selection before match start
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                cricketAudio.playUiClick();
                onResetDefaultOrders();
              }}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs font-mono font-semibold text-slate-300 hover:text-white transition-colors cursor-pointer"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>Optimal XI</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-800 bg-slate-900 p-2 text-slate-400 hover:text-white transition-colors cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Team Switcher */}
        <div className="grid grid-cols-2 gap-2 p-3 bg-slate-950/80 border-b border-slate-800">
          {[
            { key: 'A' as const, team: teamA, count: playingXIA.length },
            { key: 'B' as const, team: teamB, count: playingXIB.length },
          ].map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => {
                cricketAudio.playUiClick();
                setSelectedSide(item.key);
              }}
              className={`flex items-center justify-between gap-2 rounded-xl border px-3.5 py-2.5 text-left transition-colors cursor-pointer ${
                selectedSide === item.key
                  ? 'border-cyan-400 bg-cyan-950/30 text-white'
                  : 'border-slate-800 bg-slate-900/60 text-slate-400 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <TeamCrest teamId={item.team.id} size={24} />
                <CountryFlag countryCode={item.team.id} size="sm" />
                <span className="font-bold text-xs sm:text-sm truncate">{item.team.name}</span>
              </div>
              <span className="font-mono text-[11px] text-cyan-300 tabular-nums shrink-0">
                {item.count} XI
              </span>
            </button>
          ))}
        </div>

        {/* Batting Order List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {activeXI.map((player, idx) => (
            <div
              key={player.id}
              className="flex items-center justify-between gap-3 rounded-xl border border-slate-800/90 bg-slate-950/80 px-3.5 py-2 hover:border-slate-700 transition-colors"
            >
              <div className="flex items-center gap-3 min-w-0">
                <span className="inline-flex h-7 w-8 items-center justify-center rounded-lg border border-slate-800 bg-slate-900 font-mono text-xs font-black text-cyan-300 tabular-nums shrink-0">
                  #{idx + 1}
                </span>
                <PlayerCardAvatar
                  playerId={player.id}
                  name={player.name}
                  countryCode={player.countryCode || activeTeam.id}
                  imageUrl={player.imageUrl}
                  size="sm"
                />
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs sm:text-sm font-bold text-white truncate">
                      {player.name}
                    </span>
                    {idx <= 1 && (
                      <span className="font-mono text-[10px] text-emerald-400 font-bold">
                        OPENER
                      </span>
                    )}
                    {player.role.includes('Wicketkeeper') && (
                      <span className="font-mono text-[10px] text-amber-300 font-bold">WK</span>
                    )}
                  </div>
                  <p className="text-[11px] font-mono text-slate-400 truncate">
                    {player.role} · {player.battingHand} · Rating {player.rating}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  disabled={idx === 0}
                  onClick={() => moveBatter(idx, -1)}
                  aria-label={`Move ${player.name} up`}
                  className="rounded-lg border border-slate-800 bg-slate-900 p-1.5 text-slate-300 hover:text-white disabled:opacity-30 cursor-pointer"
                >
                  <ArrowUp className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  disabled={idx === activeXI.length - 1}
                  onClick={() => moveBatter(idx, 1)}
                  aria-label={`Move ${player.name} down`}
                  className="rounded-lg border border-slate-800 bg-slate-900 p-1.5 text-slate-300 hover:text-white disabled:opacity-30 cursor-pointer"
                >
                  <ArrowDown className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-3 px-5 py-3.5 bg-[#08132B] border-t border-slate-800">
          <span className="text-xs font-mono text-slate-400">
            Openers: <strong className="text-white">{activeXI[0]?.name}</strong> &{' '}
            <strong className="text-white">{activeXI[1]?.name}</strong>
          </span>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl bg-cyan-500 px-5 py-2 text-xs font-black text-slate-950 hover:bg-cyan-400 transition-colors cursor-pointer"
          >
            Confirm Playing XI
          </button>
        </div>
      </div>
    </div>
  );
};
