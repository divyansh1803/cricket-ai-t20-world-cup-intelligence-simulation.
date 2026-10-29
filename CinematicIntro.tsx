import React, { useState, useEffect } from 'react';
import { cricketAudio } from '../../utils/audioSystem';
import { Sparkles, Play, FastForward } from 'lucide-react';

interface CinematicIntroProps {
  onComplete: () => void;
}

export const CinematicIntro: React.FC<CinematicIntroProps> = ({ onComplete }) => {
  // Step sequence:
  // 0: Darkness / Ambient
  // 1: Floodlights ignite
  // 2: Ball trajectory & impact
  // 3: Logo & Tagline revelation
  // 4: Smooth fadeout to dashboard
  const [step, setStep] = useState<number>(0);

  useEffect(() => {
    // Stage 1: Floodlights illuminate
    const t1 = setTimeout(() => {
      setStep(1);
    }, 400);

    // Stage 2: Ball trajectory & strike
    const t2 = setTimeout(() => {
      setStep(2);
      cricketAudio.playBatHit();
    }, 1600);

    // Stage 3: Logo & Taglines appear
    const t3 = setTimeout(() => {
      setStep(3);
      cricketAudio.playFour();
    }, 2800);

    // Stage 4: Transition to app
    const t4 = setTimeout(() => {
      onComplete();
    }, 5600);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
    };
  }, [onComplete]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950 overflow-hidden font-sans select-none">
      {/* Skip button in top right */}
      <button
        onClick={onComplete}
        className="absolute top-6 right-6 z-50 flex items-center gap-1.5 rounded-full border border-slate-700 bg-slate-900/80 px-4 py-2 text-xs font-mono font-bold text-slate-300 hover:border-sky-400 hover:text-white transition-all backdrop-blur-md cursor-pointer"
      >
        <span>SKIP INTRO</span>
        <FastForward className="h-3.5 w-3.5" />
      </button>

      {/* Stadium Floodlights & Ambient Glow */}
      <div
        className={`absolute inset-0 transition-opacity duration-1000 ${
          step >= 1 ? 'opacity-100' : 'opacity-0'
        }`}
      >
        {/* Stadium backdrop image */}
        <img
          src="/images/hero_cricket_stadium.jpg"
          alt="Stadium floodlights"
          className="h-full w-full object-cover opacity-20 filter blur-xs"
        />

        {/* Floodlight beams */}
        <div className="absolute top-0 left-1/4 h-full w-96 -rotate-12 bg-gradient-to-b from-sky-400/20 via-sky-500/5 to-transparent blur-2xl" />
        <div className="absolute top-0 right-1/4 h-full w-96 rotate-12 bg-gradient-to-b from-amber-300/20 via-amber-400/5 to-transparent blur-2xl" />
        <div className="absolute inset-0 bg-radial from-transparent via-slate-950/70 to-slate-950" />
      </div>

      {/* Cricket Ball Trajectory Animation */}
      {step === 2 && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="relative h-12 w-12 rounded-full bg-rose-600 shadow-[0_0_50px_rgba(225,29,72,0.9)] animate-ping" />
        </div>
      )}

      {/* Centerpiece Reveal */}
      <div className="relative z-10 max-w-xl text-center px-6 space-y-6">
        {step >= 3 ? (
          <div className="space-y-4 animate-in fade-in zoom-in-95 duration-700">
            <div className="inline-flex items-center gap-2 rounded-full border border-sky-500/40 bg-sky-500/10 px-4 py-1 text-xs font-mono font-bold text-sky-400 tracking-widest">
              <Sparkles className="h-3.5 w-3.5" />
              <span>THE INTELLIGENCE BEHIND T20 CRICKET</span>
            </div>

            <h1 className="text-5xl sm:text-7xl font-black tracking-tight text-white">
              CRICKET <span className="text-sky-400">AI</span>
            </h1>

            <div className="space-y-1 text-sm sm:text-base font-mono font-medium text-slate-300 tracking-wider">
              <p className="animate-in fade-in slide-in-from-bottom-2 duration-500 delay-100">
                SEE THE GAME.
              </p>
              <p className="animate-in fade-in slide-in-from-bottom-2 duration-500 delay-300 text-sky-300">
                UNDERSTAND THE GAME.
              </p>
              <p className="animate-in fade-in slide-in-from-bottom-2 duration-500 delay-500 text-amber-300 font-bold">
                CHANGE THE GAME.
              </p>
            </div>

            <div className="pt-4">
              <button
                onClick={onComplete}
                className="inline-flex items-center gap-2 rounded-xl bg-sky-500 px-6 py-3 text-xs font-bold text-slate-950 hover:bg-sky-400 transition-all shadow-xl shadow-sky-500/30 cursor-pointer"
              >
                <Play className="h-3.5 w-3.5 fill-current" />
                <span>ENTER INTELLIGENCE HUB</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="h-1 w-24 mx-auto rounded-full bg-slate-800 overflow-hidden">
              <div className="h-full bg-sky-500 animate-pulse w-full" />
            </div>
            <p className="text-xs font-mono text-slate-500">STADIUM FLOODLIGHTS IGNITING...</p>
          </div>
        )}
      </div>
    </div>
  );
};
