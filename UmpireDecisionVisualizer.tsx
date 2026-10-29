import React, { useState, useEffect } from 'react';
import { Play, Sparkles, CheckCircle2, RotateCcw } from 'lucide-react';
import { cricketAudio } from '../../utils/audioSystem';

export type UmpireSignalType = 'out' | 'not_out' | 'four' | 'six' | 'wide' | 'no_ball' | 'drs';

interface UmpireDecisionVisualizerProps {
  currentSignal?: UmpireSignalType;
  autoSignal?: boolean;
  onSignalComplete?: (signal: UmpireSignalType) => void;
}

interface SignalConfig {
  type: UmpireSignalType;
  label: string;
  description: string;
  color: string;
  soundFn: () => void;
}

const SIGNALS: SignalConfig[] = [
  {
    type: 'out',
    label: 'OUT! (Index Finger Raised)',
    description: 'The slow, deliberate death sentence. Umpire elevates right index finger vertically to the heavens.',
    color: '#ef4444',
    soundFn: () => cricketAudio.playWicket(),
  },
  {
    type: 'not_out',
    label: 'NOT OUT (Hands Swept Flat)',
    description: 'Appeal turned down. Umpire sweeps hands across knees horizontally with a calm head shake.',
    color: '#10b981',
    soundFn: () => cricketAudio.playBatHit(),
  },
  {
    type: 'four',
    label: 'FOUR RUNS (Waistline Wave)',
    description: 'Boundary rope breached. Arm waved back and forth across the waistline.',
    color: '#38bdf8',
    soundFn: () => cricketAudio.playBoundary(),
  },
  {
    type: 'six',
    label: 'SIX! (Dual Arms Raised)',
    description: 'Maximum cleared over the ropes. Both arms raised high above the head.',
    color: '#a855f7',
    soundFn: () => cricketAudio.playSix(),
  },
  {
    type: 'drs',
    label: 'TV UMPIRE REVIEW (Box Signal)',
    description: 'Challenged on field. Umpire signals TV screen rectangle to the third umpire broadcast booth.',
    color: '#06b6d4',
    soundFn: () => cricketAudio.playVictory(),
  },
  {
    type: 'wide',
    label: 'WIDE BALL (Arms Extended)',
    description: 'Delivery outside batsman reach. Both arms extended horizontally like an aircraft.',
    color: '#f59e0b',
    soundFn: () => cricketAudio.playBatHit(),
  },
];

export const UmpireDecisionVisualizer: React.FC<UmpireDecisionVisualizerProps> = ({
  currentSignal = 'out',
  onSignalComplete,
}) => {
  const [activeSignal, setActiveSignal] = useState<UmpireSignalType>(currentSignal);
  const [isAnimating, setIsAnimating] = useState<boolean>(false);
  const [frame, setFrame] = useState<number>(0);

  const activeConfig = SIGNALS.find((s) => s.type === activeSignal) || SIGNALS[0];

  const triggerSignal = (sig: UmpireSignalType) => {
    setActiveSignal(sig);
    setIsAnimating(true);
    setFrame(0);

    const cfg = SIGNALS.find((s) => s.type === sig);
    if (cfg) cfg.soundFn();

    let step = 0;
    const interval = setInterval(() => {
      step++;
      setFrame(step);
      if (step >= 24) {
        clearInterval(interval);
        setIsAnimating(false);
        if (onSignalComplete) onSignalComplete(sig);
      }
    }, 45);
  };

  // Render umpire figure via SVG with animated arm positions based on frame and activeSignal
  const renderUmpireSvg = () => {
    // Animation factor from 0 to 1
    const progress = Math.min(1, frame / 18);

    // Default arm positions
    // Right arm angle, Left arm angle
    let rightArmAngle = 15;
    let leftArmAngle = -15;
    let fingerRaised = false;

    if (activeSignal === 'out') {
      rightArmAngle = 15 + (170 - 15) * progress; // Raises right arm to 170 deg (straight up)
      fingerRaised = progress > 0.6;
    } else if (activeSignal === 'six') {
      rightArmAngle = 15 + (165 - 15) * progress;
      leftArmAngle = -15 - (165 - 15) * progress; // Both arms straight up
    } else if (activeSignal === 'four') {
      // Oscillating sweep across waist
      rightArmAngle = 45 + Math.sin(frame * 0.6) * 35;
    } else if (activeSignal === 'wide') {
      rightArmAngle = 15 + (90 - 15) * progress; // 90 deg horizontal
      leftArmAngle = -15 - (90 - 15) * progress;
    } else if (activeSignal === 'not_out') {
      rightArmAngle = 30 + Math.sin(frame * 0.5) * 20;
      leftArmAngle = -30 - Math.sin(frame * 0.5) * 20;
    } else if (activeSignal === 'drs') {
      rightArmAngle = 70 + Math.sin(frame * 0.4) * 20;
      leftArmAngle = -70 - Math.sin(frame * 0.4) * 20;
    }

    return (
      <svg
        className="w-full h-56"
        viewBox="0 0 300 240"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <radialGradient id="umpireSpotlight" cx="50%" cy="40%" r="55%">
            <stop offset="0%" stopColor={activeConfig.color} stopOpacity="0.25" />
            <stop offset="100%" stopColor="#000000" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Dynamic Background Beam */}
        <circle cx="150" cy="110" r="95" fill="url(#umpireSpotlight)" />

        {/* Pitch crease baseline at bottom */}
        <line x1="40" y1="210" x2="260" y2="210" stroke="#334155" strokeWidth="2" strokeDasharray="4 4" />
        <ellipse cx="150" cy="210" rx="36" ry="8" fill="#000000" opacity="0.4" />

        {/* Umpire Legs (Black Trousers) */}
        <rect x="134" y="150" width="13" height="60" rx="4" fill="#0f172a" stroke="#334155" strokeWidth="1" />
        <rect x="153" y="150" width="13" height="60" rx="4" fill="#0f172a" stroke="#334155" strokeWidth="1" />
        {/* Shoes */}
        <rect x="131" y="206" width="18" height="7" rx="3" fill="#ffffff" />
        <rect x="151" y="206" width="18" height="7" rx="3" fill="#ffffff" />

        {/* Umpire Torso (Official ICC Black & White / Red Jacket) */}
        <path
          d="M 130 90 L 170 90 L 176 150 L 124 150 Z"
          fill="#1e293b"
          stroke="#475569"
          strokeWidth="1.5"
        />
        {/* Vest / Tie */}
        <path d="M 144 90 L 156 90 L 153 145 L 147 145 Z" fill="#ffffff" />
        <path d="M 148 94 L 152 94 L 151 125 L 149 125 Z" fill="#ef4444" />

        {/* Umpire Head */}
        <circle cx="150" cy="68" r="16" fill="#fcd34d" stroke="#d97706" strokeWidth="1" />
        {/* ICC Wide-Brim Sun Hat */}
        <ellipse cx="150" cy="56" rx="28" ry="7" fill="#ffffff" stroke="#cbd5e1" strokeWidth="1.5" />
        <rect x="138" y="44" width="24" height="12" rx="3" fill="#ffffff" stroke="#cbd5e1" strokeWidth="1" />
        <rect x="138" y="52" width="24" height="3" fill="#1e293b" />

        {/* Sunglasses */}
        <rect x="142" y="66" width="7" height="4" rx="1" fill="#0f172a" />
        <rect x="151" y="66" width="7" height="4" rx="1" fill="#0f172a" />
        <line x1="149" y1="68" x2="151" y2="68" stroke="#0f172a" strokeWidth="1" />

        {/* LEFT ARM (User's Left = Umpire's Right or Left) */}
        <g transform={`rotate(${leftArmAngle}, 130, 96)`}>
          <rect x="122" y="96" width="10" height="42" rx="4" fill="#1e293b" stroke="#475569" strokeWidth="1" />
          <circle cx="127" cy="142" r="5" fill="#fcd34d" />
        </g>

        {/* RIGHT ARM */}
        <g transform={`rotate(${-rightArmAngle}, 170, 96)`}>
          <rect x="168" y="96" width="10" height="42" rx="4" fill="#1e293b" stroke="#475569" strokeWidth="1" />
          <circle cx="173" cy="142" r="5" fill="#fcd34d" />
          {/* Extended Index Finger if OUT */}
          {fingerRaised && (
            <line x1="173" y1="142" x2="173" y2="154" stroke="#fcd34d" strokeWidth="3" strokeLinecap="round" />
          )}
        </g>

        {/* DRS Box Overlay Animation if DRS signal */}
        {activeSignal === 'drs' && (
          <rect
            x="110"
            y="70"
            width="80"
            height="55"
            rx="6"
            fill="none"
            stroke="#06b6d4"
            strokeWidth="2.5"
            strokeDasharray="6 4"
            className="animate-pulse"
          />
        )}
      </svg>
    );
  };

  return (
    <div className="rounded-2xl border border-cyan-500/30 bg-gradient-to-b from-[#03091c]/95 to-[#020510]/95 p-5 backdrop-blur-xl shadow-2xl space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-cyan-500/20 pb-3">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono font-bold text-cyan-400 uppercase tracking-wider">
            <Sparkles className="h-4 w-4 animate-pulse" />
            <span>AI UMPIRE DECISION & SIGNAL VISUALIZER</span>
          </div>
          <h3 className="text-base font-black text-white mt-0.5">
            Animated On-Field Umpire Telemetry & Decision Broadcaster
          </h3>
        </div>

        <div className="flex items-center gap-2 text-xs font-mono px-3 py-1.5 rounded-xl border border-slate-800 bg-slate-900/90 text-slate-300">
          <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
          <span>ON-FIELD UMPIRES ACTIVE</span>
        </div>
      </div>

      {/* Main Visualizer Stage */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-center">
        {/* Animated Umpire Display Box (Left) */}
        <div className="md:col-span-5 rounded-2xl border border-slate-800/80 bg-slate-950/80 p-4 relative overflow-hidden flex flex-col items-center justify-between shadow-inner">
          {/* Status Banner */}
          <div className="w-full flex items-center justify-between text-xs font-mono mb-2">
            <span className="text-slate-400">SIGNAL STATUS:</span>
            <span
              className="font-black px-2 py-0.5 rounded text-[11px] uppercase tracking-wider"
              style={{
                backgroundColor: `${activeConfig.color}22`,
                color: activeConfig.color,
                border: `1px solid ${activeConfig.color}55`,
              }}
            >
              {isAnimating ? 'DELIBERATING...' : activeConfig.label.split('(')[0].trim()}
            </span>
          </div>

          {/* Umpire SVG Graphics */}
          {renderUmpireSvg()}

          {/* Caption */}
          <p className="text-xs text-slate-400 font-mono text-center mt-2 px-2">
            {activeConfig.description}
          </p>
        </div>

        {/* Signal Controller Buttons (Right) */}
        <div className="md:col-span-7 space-y-3 font-mono text-xs">
          <span className="text-slate-400 block font-bold uppercase text-[11px]">
            SIMULATE UMPIRE SIGNALS (CLICK TO TRIGGER AUDIO-VISUAL SEQUENCE)
          </span>

          <div className="grid grid-cols-2 gap-2.5">
            {SIGNALS.map((sig) => {
              const isCurrent = activeSignal === sig.type;
              return (
                <button
                  key={sig.type}
                  onClick={() => triggerSignal(sig.type)}
                  className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                    isCurrent
                      ? 'shadow-lg'
                      : 'border-slate-800 bg-slate-900/60 hover:border-slate-700'
                  }`}
                  style={{
                    borderColor: isCurrent ? sig.color : undefined,
                    backgroundColor: isCurrent ? `${sig.color}15` : undefined,
                  }}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-white text-xs">{sig.label.split('(')[0]}</span>
                    {isCurrent && <CheckCircle2 className="h-3.5 w-3.5" style={{ color: sig.color }} />}
                  </div>
                  <span className="text-[10px] text-slate-400 block truncate">
                    {sig.description.split('.')[0]}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-950 p-3 flex items-center justify-between text-xs text-slate-400">
            <span>Synchronized with match ball events</span>
            <button
              onClick={() => triggerSignal(activeSignal)}
              className="text-cyan-400 hover:text-cyan-300 font-bold flex items-center gap-1 cursor-pointer"
            >
              <RotateCcw className="h-3 w-3" />
              <span>Replay Signal</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
