import React from 'react';
import { useGame } from '../../context/GameContext';
import { Shield, Sparkles } from 'lucide-react';

export const Footer: React.FC = () => {
  const { setActiveView } = useGame();

  return (
    <footer className="border-t border-slate-800/80 bg-slate-950 py-10 text-slate-400">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 pb-8 border-b border-slate-900">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-lg font-black tracking-tight text-white">
                CRICKET <span className="text-sky-400">AI</span>
              </span>
              <span className="text-xs text-slate-500 font-mono">T20 WORLD CUP INTELLIGENCE</span>
            </div>
            <p className="mt-1 text-xs text-slate-400 max-w-lg">
              Advanced sports intelligence engine powering interactive match simulations, Monte Carlo forecasts, player battle metrics, and AI coaching scenarios.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-5 text-xs text-slate-400 font-medium">
            <button onClick={() => setActiveView('arena')} className="hover:text-sky-400 transition-colors cursor-pointer">
              Arena
            </button>
            <button onClick={() => setActiveView('simulator')} className="hover:text-sky-400 transition-colors cursor-pointer">
              Live Simulator
            </button>
            <button onClick={() => setActiveView('predictions')} className="hover:text-sky-400 transition-colors cursor-pointer">
              Predictor
            </button>
            <button onClick={() => setActiveView('whatif')} className="hover:text-sky-400 transition-colors cursor-pointer">
              AI Lab
            </button>
            <button onClick={() => setActiveView('tournament')} className="hover:text-sky-400 transition-colors cursor-pointer">
              Tournament Bracket
            </button>
            <button onClick={() => setActiveView('fantasy')} className="hover:text-sky-400 transition-colors cursor-pointer">
              Fantasy XI
            </button>
          </div>
        </div>

        <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <Shield className="h-3.5 w-3.5 text-slate-400" />
            <span>Data Transparency: Simulated outputs clearly labeled. Real squad benchmarks derived from international T20 match data.</span>
          </div>
          <div className="flex items-center gap-1.5 text-slate-400">
            <Sparkles className="h-3 w-3 text-sky-400" />
            <span>Cricket Decision Engine v2.6 · 2026 World Cup Edition</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
