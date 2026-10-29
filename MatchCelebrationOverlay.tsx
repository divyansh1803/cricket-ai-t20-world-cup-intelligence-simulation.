import React, { useEffect, useState } from 'react';
import { animationScheduler, AnimationTask } from '../../utils/animationScheduler';
import { cricketAudio } from '../../utils/audioSystem';
import { Trophy, Sparkles, Flame, AlertTriangle } from 'lucide-react';

interface MatchCelebrationOverlayProps {
  currentEvent: 'SIX' | 'FOUR' | 'WICKET' | 'FIFTY' | 'CENTURY' | 'VICTORY' | null;
  winnerName?: string;
  onDismiss: () => void;
}

export const MatchCelebrationOverlay: React.FC<MatchCelebrationOverlayProps> = ({
  currentEvent,
  winnerName = 'India',
  onDismiss,
}) => {
  const [activeType, setActiveType] = useState<MatchCelebrationOverlayProps['currentEvent']>(null);

  useEffect(() => {
    if (!currentEvent) {
      setActiveType(null);
      return;
    }

    const priorityMap = {
      VICTORY: 'VICTORY' as const,
      CENTURY: 'CENTURY' as const,
      FIFTY: 'MILESTONE' as const,
      WICKET: 'WICKET' as const,
      SIX: 'SIX' as const,
      FOUR: 'FOUR' as const,
    };

    const task: AnimationTask = {
      id: `${currentEvent}-${Date.now()}`,
      priority: priorityMap[currentEvent],
      durationMs: currentEvent === 'VICTORY' ? 3200 : currentEvent === 'SIX' || currentEvent === 'WICKET' ? 1400 : 900,
      onStart: () => {
        setActiveType(currentEvent);
        if (currentEvent === 'VICTORY') {
          cricketAudio.playVictory();
        } else if (currentEvent === 'SIX') {
          cricketAudio.playSix();
        } else if (currentEvent === 'WICKET') {
          cricketAudio.playWicket();
        } else if (currentEvent === 'FOUR') {
          cricketAudio.playFour();
        } else if (currentEvent === 'FIFTY' || currentEvent === 'CENTURY') {
          cricketAudio.playMilestoneFifty();
        }
      },
      onComplete: () => {
        setActiveType(null);
        onDismiss();
      },
    };

    animationScheduler.schedule(task);
  }, [currentEvent, onDismiss]);

  if (!activeType) return null;

  return (
    <div className="fixed inset-0 z-50 pointer-events-none flex items-center justify-center p-4">
      {/* Event: SIX */}
      {activeType === 'SIX' && (
        <div className="rounded-3xl border-2 border-sky-400 bg-slate-950/90 p-8 text-center shadow-[0_0_80px_rgba(56,189,248,0.6)] backdrop-blur-md animate-in zoom-in-75 duration-200">
          <div className="flex items-center justify-center gap-2 text-sky-400 font-mono text-xs font-bold tracking-widest mb-1">
            <Sparkles className="h-4 w-4" />
            <span>HUGE MAXIMUM INTO THE STANDS</span>
          </div>
          <h2 className="text-6xl sm:text-7xl font-black text-white tracking-tighter">
            SIX!
          </h2>
          <p className="text-xs font-mono text-sky-300 mt-2">102 METERS · BALL TRAVELS OVER THE ROPES</p>
        </div>
      )}

      {/* Event: FOUR */}
      {activeType === 'FOUR' && (
        <div className="rounded-3xl border-2 border-emerald-400 bg-slate-950/90 p-6 text-center shadow-[0_0_60px_rgba(52,211,153,0.5)] backdrop-blur-md animate-in zoom-in-75 duration-200">
          <span className="text-xs font-mono text-emerald-400 font-bold tracking-widest block mb-1">
            SURGICAL INFIELD PIERCING
          </span>
          <h2 className="text-5xl sm:text-6xl font-black text-white tracking-tight">
            FOUR!
          </h2>
        </div>
      )}

      {/* Event: WICKET */}
      {activeType === 'WICKET' && (
        <div className="rounded-3xl border-2 border-rose-500 bg-slate-950/95 p-8 text-center shadow-[0_0_80px_rgba(244,63,94,0.7)] backdrop-blur-md animate-in zoom-in-75 duration-200">
          <div className="flex items-center justify-center gap-2 text-rose-400 font-mono text-xs font-bold tracking-widest mb-1">
            <AlertTriangle className="h-4 w-4" />
            <span>TIMBER! STUMPS SHATTERED</span>
          </div>
          <h2 className="text-5xl sm:text-7xl font-black text-rose-400 tracking-tight">
            WICKET!
          </h2>
          <p className="text-xs font-mono text-slate-300 mt-2">BREAKTHROUGH · SET BATTER DEPARTS</p>
        </div>
      )}

      {/* Event: FIFTY */}
      {activeType === 'FIFTY' && (
        <div className="rounded-3xl border-2 border-amber-400 bg-slate-950/90 p-8 text-center shadow-[0_0_80px_rgba(251,191,36,0.6)] backdrop-blur-md animate-in zoom-in-75 duration-200">
          <span className="text-xs font-mono text-amber-400 font-bold tracking-widest block mb-1">
            TOURNAMENT MILESTONE
          </span>
          <h2 className="text-6xl sm:text-7xl font-black text-amber-300 tracking-tight">
            FIFTY!
          </h2>
          <p className="text-xs font-mono text-white mt-1">50 RUNS OF PURE DOMINANCE</p>
        </div>
      )}

      {/* Event: VICTORY */}
      {activeType === 'VICTORY' && (
        <div className="rounded-3xl border-2 border-amber-400 bg-gradient-to-b from-amber-500/20 to-slate-950 p-10 text-center shadow-[0_0_120px_rgba(251,191,36,0.8)] backdrop-blur-md animate-in zoom-in-90 duration-300 pointer-events-auto">
          <Trophy className="h-16 w-16 text-amber-400 mx-auto animate-bounce mb-3" />
          <span className="text-xs font-mono text-amber-400 font-bold tracking-widest block mb-1">
            WORLD CUP VICTORY CONFIRMED
          </span>
          <h2 className="text-4xl sm:text-6xl font-black text-white tracking-tight">
            {winnerName} WINS!
          </h2>
          <p className="text-xs font-mono text-slate-300 mt-3">
            POST-MATCH AI INTELLIGENCE SUMMARY AVAILABLE BELOW
          </p>
        </div>
      )}
    </div>
  );
};
