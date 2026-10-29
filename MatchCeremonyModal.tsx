import React, { useState, useEffect, useRef } from 'react';
import { Team } from '../../types/cricket';
import { CountryFlag, TeamCrest } from '../common/CricketIdentity';
import { cricketAudio } from '../../utils/audioSystem';

export interface TossDecisionResult {
  winner: Team;
  electedTo: 'bat' | 'field';
  summary: string;
}

interface MatchCeremonyModalProps {
  teamA: Team;
  teamB: Team;
  onCeremonyComplete: (toss?: TossDecisionResult) => void;
  onSkip: () => void;
}

export const MatchCeremonyModal: React.FC<MatchCeremonyModalProps> = ({
  teamA,
  teamB,
  onCeremonyComplete,
  onSkip,
}) => {
  const [stage, setStage] = useState<'TOSS' | 'FORMATION' | 'COUNTDOWN'>('TOSS');
  const [tossData, setTossData] = useState<TossDecisionResult | null>(null);
  const [countdown, setCountdown] = useState<number>(3);
  const tossDataRef = useRef<TossDecisionResult | null>(null);
  const onCeremonyCompleteRef = useRef(onCeremonyComplete);

  useEffect(() => {
    onCeremonyCompleteRef.current = onCeremonyComplete;
  }, [onCeremonyComplete]);

  useEffect(() => {
    cricketAudio.playTossCoin();
    const t1 = setTimeout(() => {
      const winner = Math.random() > 0.5 ? teamA : teamB;
      const electedTo: 'bat' | 'field' = Math.random() > 0.45 ? 'field' : 'bat';
      const result: TossDecisionResult = {
        winner,
        electedTo,
        summary: `${winner.name} won the toss and elected to ${electedTo} first`,
      };
      tossDataRef.current = result;
      setTossData(result);
      cricketAudio.playFour();
    }, 1000);

    const t2 = setTimeout(() => {
      setStage('FORMATION');
    }, 2600);

    const t3 = setTimeout(() => {
      setStage('COUNTDOWN');
    }, 4200);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [teamA, teamB]);

  useEffect(() => {
    if (stage === 'COUNTDOWN') {
      if (countdown > 1) {
        const timer = setTimeout(() => {
          setCountdown((prev) => prev - 1);
          cricketAudio.playBatHit();
        }, 700);
        return () => clearTimeout(timer);
      } else {
        const endTimer = setTimeout(() => {
          cricketAudio.playBatHit();
          onCeremonyCompleteRef.current(tossDataRef.current || undefined);
        }, 700);
        return () => clearTimeout(endTimer);
      }
    }
  }, [stage, countdown]);

  const battingFirstTeam = tossData
    ? tossData.electedTo === 'bat'
      ? tossData.winner
      : tossData.winner.id === teamA.id
      ? teamB
      : teamA
    : teamB;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-md font-sans select-none animate-in fade-in duration-300">
      <div className="relative w-full max-w-xl rounded-3xl border border-slate-800 bg-slate-950 p-6 sm:p-8 text-center space-y-6 shadow-2xl overflow-hidden">
        <button
          type="button"
          onClick={onSkip}
          className="absolute top-5 right-5 text-xs font-mono text-slate-400 hover:text-white transition-colors cursor-pointer"
        >
          SKIP CEREMONY →
        </button>

        {stage === 'TOSS' && (
          <div className="space-y-5 animate-in fade-in zoom-in-95 duration-500">
            <span className="text-xs font-mono text-amber-400 font-bold block tracking-widest">
              OFFICIAL MATCH TOSS
            </span>

            <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full border-4 border-amber-400 bg-gradient-to-br from-amber-300 to-amber-600 text-slate-950 font-black text-2xl shadow-xl shadow-amber-500/30 animate-spin">
              COIN
            </div>

            <div className="space-y-1">
              <h2 className="text-lg font-bold text-white">Flipping the Coin at the Pitch...</h2>
              <p className="text-xs text-cyan-300 font-mono">
                {tossData ? tossData.summary : 'Both captains present at the center...'}
              </p>
            </div>
          </div>
        )}

        {stage === 'FORMATION' && (
          <div className="space-y-5 animate-in fade-in zoom-in-95 duration-500">
            <span className="text-xs font-mono text-sky-400 font-bold block tracking-widest">
              PLAYING XI SQUADS ASSEMBLED
            </span>

            <div className="flex items-center justify-center gap-8 py-2">
              <div className="text-center space-y-2">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-slate-800 bg-slate-900 p-2">
                  <TeamCrest teamId={teamA.id} size={38} />
                </div>
                <div className="flex items-center justify-center gap-1.5">
                  <CountryFlag countryCode={teamA.id} size="sm" />
                  <p className="text-sm font-bold text-white">{teamA.name}</p>
                </div>
                <span className="text-[11px] font-mono text-sky-400">
                  {battingFirstTeam.id === teamA.id ? 'Batting First' : 'Bowling First'}
                </span>
              </div>

              <div className="text-xs font-mono text-slate-500 font-bold">VS</div>

              <div className="text-center space-y-2">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-slate-800 bg-slate-900 p-2">
                  <TeamCrest teamId={teamB.id} size={38} />
                </div>
                <div className="flex items-center justify-center gap-1.5">
                  <CountryFlag countryCode={teamB.id} size="sm" />
                  <p className="text-sm font-bold text-white">{teamB.name}</p>
                </div>
                <span className="text-[11px] font-mono text-amber-400">
                  {battingFirstTeam.id === teamB.id ? 'Batting First' : 'Bowling First'}
                </span>
              </div>
            </div>

            <p className="text-xs text-slate-400 font-mono">
              {tossData?.summary || 'Stadium floodlights at 100% · Umpires walking out to the middle'}
            </p>
          </div>
        )}

        {stage === 'COUNTDOWN' && (
          <div className="space-y-5 animate-in fade-in zoom-in-95 duration-300">
            <span className="text-xs font-mono text-emerald-400 font-bold block tracking-widest">
              LIVE BROADCAST COMMENCING IN
            </span>

            <div className="flex items-center justify-center">
              <span className="text-7xl font-black text-white tabular-nums animate-ping">
                {countdown}
              </span>
            </div>

            <p className="text-xs text-slate-400 font-mono">
              BATTERS AT THE CREASE · BOWLER AT TOP OF MARK
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
