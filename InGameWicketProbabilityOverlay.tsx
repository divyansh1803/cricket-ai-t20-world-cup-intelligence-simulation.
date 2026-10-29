import React, { useState, useEffect, useMemo } from 'react';
import { Player, BallEvent } from '../../types/cricket';
import {
  AlertTriangle,
  Flame,
  Target,
  ShieldAlert,
  Zap,
  Activity,
  X,
  Gauge,
  Radio,
  Sparkles,
} from 'lucide-react';
import { cricketAudio } from '../../utils/audioSystem';

export interface InGameWicketProbabilityProps {
  batter: Player;
  bowler: Player;
  pressureIndex?: number; // 0-100
  pitchPrecision?: number; // 0-100
  currentOver?: number | string;
  requiredRR?: number;
  recentBalls?: BallEvent[];
  onDismiss?: () => void;
  autoDismissMs?: number;
  isOpen?: boolean;
}

/**
 * Calculates in-game batter Pressure Index (0-100) from match context:
 * Dot ball streaks, required run rate pressure, wickets down, and player DNA.
 */
export function calculateBatterPressure(
  batter: Player,
  recentBalls: BallEvent[] = [],
  requiredRR: number = 8.5
): number {
  let score = 45;

  // 1. Batter DNA sensitivity
  if (batter?.dna?.pressureScore) {
    score = batter.dna.pressureScore * 0.6;
  }

  // 2. Dot balls in recent deliveries
  const lastBalls = recentBalls.slice(-6);
  const dotCount = lastBalls.filter((b) => b && b.runsScored === 0 && !b.isWicket).length;
  score += dotCount * 6; // up to +36 for consecutive dots

  // 3. Required Run Rate pressure
  if (requiredRR > 12.0) score += 20;
  else if (requiredRR > 9.5) score += 12;
  else if (requiredRR < 6.0) score -= 10;

  return Math.min(98, Math.max(15, Math.round(score)));
}

/**
 * Calculates bowler Pitch Precision (0-100) from bowler quality,
 * economy suppression, and dot ball execution.
 */
export function calculateBowlerPrecision(
  bowler: Player,
  recentBalls: BallEvent[] = []
): number {
  let score = 55;

  if (bowler?.rating) {
    score = bowler.rating * 0.75;
  }

  // Dot ball efficiency in recent deliveries
  const lastBalls = recentBalls.slice(-6);
  const dots = lastBalls.filter((b) => b && b.runsScored === 0).length;
  score += dots * 4;

  if (bowler?.stats?.economy && bowler.stats.economy < 7.0) {
    score += 8;
  }

  return Math.min(96, Math.max(25, Math.round(score)));
}

export const InGameWicketProbabilityOverlay: React.FC<InGameWicketProbabilityProps> = ({
  batter,
  bowler,
  pressureIndex,
  pitchPrecision,
  currentOver = '14.2',
  requiredRR = 9.4,
  recentBalls = [],
  onDismiss,
  autoDismissMs = 4500,
  isOpen = true,
}) => {
  const [visible, setVisible] = useState(isOpen);
  const [progressWidth, setProgressWidth] = useState(100);

  // Sync with parent isOpen prop changes
  useEffect(() => {
    setVisible(isOpen);
    if (isOpen) {
      setProgressWidth(100);
    }
  }, [isOpen]);

  // Derived or computed metrics
  const activePressure = useMemo(() => {
    if (typeof pressureIndex === 'number') return pressureIndex;
    return calculateBatterPressure(batter, recentBalls, requiredRR);
  }, [pressureIndex, batter, recentBalls, requiredRR]);

  const activePrecision = useMemo(() => {
    if (typeof pitchPrecision === 'number') return pitchPrecision;
    return calculateBowlerPrecision(bowler, recentBalls);
  }, [pitchPrecision, bowler, recentBalls]);

  // Combined Wicket Probability (0-100)
  const wicketProbability = useMemo(() => {
    const raw = Math.round(activePressure * 0.52 + activePrecision * 0.48);
    return Math.min(96, Math.max(12, raw));
  }, [activePressure, activePrecision]);

  // Hazard classification
  const hazardLevel = useMemo(() => {
    if (wicketProbability >= 80) return { label: 'CRITICAL DISMISSAL HAZARD', color: 'text-rose-400', badge: 'bg-rose-500/20 text-rose-300 border-rose-500/40' };
    if (wicketProbability >= 68) return { label: 'HIGH WICKET RISK DETECTED', color: 'text-amber-400', badge: 'bg-amber-500/20 text-amber-300 border-amber-500/40' };
    return { label: 'ELEVATED PRESSURE ZONE', color: 'text-cyan-400', badge: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40' };
  }, [wicketProbability]);

  // Breakdown of probable dismissal modes
  const dismissalModes = useMemo(() => {
    const isSpinner = bowler?.role?.toLowerCase().includes('spin');
    if (isSpinner) {
      return [
        { mode: 'Stumped / Stepping Out', percent: 38, color: '#F43F5E' },
        { mode: 'Caught in Deep (Mishit)', percent: 32, color: '#FB923C' },
        { mode: 'Trapped LBW on Turn', percent: 20, color: '#FBBF24' },
        { mode: 'Bat-Pad Edge', percent: 10, color: '#38BDF8' },
      ];
    }
    return [
      { mode: 'Outside Edge to Slips/Keeper', percent: 44, color: '#F43F5E' },
      { mode: 'Clean Bowled / Searing Yorker', percent: 26, color: '#FB923C' },
      { mode: 'Trapped LBW in Channel', percent: 20, color: '#FBBF24' },
      { mode: 'Top Edge on Bouncer', percent: 10, color: '#38BDF8' },
    ];
  }, [bowler]);

  // Auto-dismiss countdown timer
  useEffect(() => {
    if (!visible) return;

    // Trigger subtle broadcast audio cue once upon display
    try {
      cricketAudio.playCloseCallGasp('Play & Miss');
    } catch {
      // Audio fallback
    }

    const interval = 50;
    const step = (interval / autoDismissMs) * 100;

    const timer = setInterval(() => {
      setProgressWidth((prev) => {
        if (prev <= step) {
          clearInterval(timer);
          setVisible(false);
          if (onDismiss) onDismiss();
          return 0;
        }
        return prev - step;
      });
    }, interval);

    return () => clearInterval(timer);
  }, [visible, autoDismissMs, onDismiss]);

  if (!visible) return null;

  return (
    <div className="relative w-full max-w-md mx-auto select-none rounded-2xl border-2 border-rose-500/70 bg-gradient-to-b from-[#1A060A] via-[#0E0306] to-[#080204] p-4 sm:p-5 shadow-[0_0_40px_rgba(244,63,94,0.4)] backdrop-blur-xl animate-in zoom-in-95 duration-200">
      {/* Top Animated Progress Drain Bar */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-slate-900 rounded-t-2xl overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-rose-500 to-amber-500 transition-all duration-75 ease-linear"
          style={{ width: `${progressWidth}%` }}
        />
      </div>

      {/* Header */}
      <div className="flex items-center justify-between gap-2 border-b border-rose-500/30 pb-3 mt-1">
        <div className="flex items-center gap-2">
          <span className="flex h-3 w-3 rounded-full bg-rose-500 animate-ping shrink-0" />
          <div className="flex items-center gap-1.5 text-xs font-mono font-bold text-rose-400">
            <Radio className="h-3.5 w-3.5" />
            <span className="tracking-wider">AI PREDICTIVE DISMISSAL RADAR</span>
          </div>
        </div>

        <button
          onClick={() => {
            setVisible(false);
            if (onDismiss) onDismiss();
          }}
          className="rounded-full p-1 text-slate-400 hover:text-white hover:bg-rose-950/40 transition-colors cursor-pointer"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Main Alert Showcase */}
      <div className="pt-3 space-y-3">
        {/* Status Pill & Subtitle */}
        <div className="flex items-center justify-between">
          <span className={`text-[10px] font-mono font-black uppercase px-2 py-0.5 rounded border ${hazardLevel.badge}`}>
            {hazardLevel.label}
          </span>
          <span className="text-[11px] font-mono text-slate-400">Over {currentOver}</span>
        </div>

        {/* Big Wicket Probability Stat */}
        <div className="flex items-baseline justify-between">
          <div>
            <span className="text-[10px] font-mono uppercase text-slate-400 block">Calculated Dismissal Risk</span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-3xl sm:text-4xl font-black font-mono tracking-tight text-white drop-shadow-[0_0_12px_rgba(244,63,94,0.6)]">
                {wicketProbability}%
              </span>
              <span className="text-xs font-mono font-bold text-rose-400 uppercase">Wicket Probability</span>
            </div>
          </div>

          <div className="text-right font-mono text-xs">
            <span className="text-slate-400 block text-[10px]">CORRIDOR:</span>
            <strong className="text-amber-300">5th Stump Channel</strong>
          </div>
        </div>

        {/* Dual Gauges: Batter Pressure vs Bowler Precision */}
        <div className="grid grid-cols-2 gap-2.5 pt-1">
          {/* Batter Pressure Card */}
          <div className="rounded-xl border border-rose-500/30 bg-rose-950/30 p-2.5 space-y-1">
            <div className="flex items-center justify-between text-[11px] font-mono">
              <span className="flex items-center gap-1 text-slate-300 font-bold truncate">
                <Flame className="h-3 w-3 text-rose-400 shrink-0" />
                <span className="truncate">{batter?.name?.split(' ')[0] || 'Batter'}</span>
              </span>
              <strong className="text-rose-400">{activePressure}/100</strong>
            </div>
            <div className="h-1.5 w-full rounded-full bg-slate-900 overflow-hidden">
              <div
                className="h-full bg-rose-500 transition-all duration-300"
                style={{ width: `${activePressure}%` }}
              />
            </div>
            <span className="text-[9px] font-mono text-slate-400 block">Pressure Index</span>
          </div>

          {/* Bowler Pitch Precision Card */}
          <div className="rounded-xl border border-cyan-500/30 bg-cyan-950/30 p-2.5 space-y-1">
            <div className="flex items-center justify-between text-[11px] font-mono">
              <span className="flex items-center gap-1 text-slate-300 font-bold truncate">
                <Target className="h-3 w-3 text-cyan-400 shrink-0" />
                <span className="truncate">{bowler?.name?.split(' ')[0] || 'Bowler'}</span>
              </span>
              <strong className="text-cyan-400">{activePrecision}%</strong>
            </div>
            <div className="h-1.5 w-full rounded-full bg-slate-900 overflow-hidden">
              <div
                className="h-full bg-cyan-500 transition-all duration-300"
                style={{ width: `${activePrecision}%` }}
              />
            </div>
            <span className="text-[9px] font-mono text-slate-400 block">Pitch Precision</span>
          </div>
        </div>

        {/* Likely Dismissal Modes Breakdown */}
        <div className="rounded-xl bg-slate-950/80 border border-slate-800 p-2.5 space-y-2">
          <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider block">
            PREDICTED DISMISSAL MODES:
          </span>
          <div className="space-y-1.5 font-mono text-[11px]">
            {dismissalModes.map((item, idx) => (
              <div key={idx} className="space-y-0.5">
                <div className="flex justify-between text-[10px] text-slate-300">
                  <span>{item.mode}</span>
                  <span className="font-bold text-white">{item.percent}%</span>
                </div>
                <div className="h-1 w-full rounded-full bg-slate-900 overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${item.percent}%`, backgroundColor: item.color }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* AI Tactical Warning Footer */}
        <p className="text-[11px] text-slate-300 font-sans leading-tight">
          <strong className="text-amber-400 font-mono">TACTICAL ALERT:</strong> Escalating pressure and immaculate bowler line creates an imminent risk of edge or mistimed lofted stroke.
        </p>
      </div>
    </div>
  );
};
