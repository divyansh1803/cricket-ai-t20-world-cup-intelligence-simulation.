import React, { useState } from 'react';
import {
  HelpCircle,
  Play,
  Pause,
  FastForward,
  Shield,
  Target,
  Sparkles,
  TrendingUp,
  Compass,
  Layers,
  Award,
  CheckCircle2,
  X,
  Zap,
} from 'lucide-react';
import { cricketAudio } from '../../utils/audioSystem';
import { triggerHaptic, HAPTIC_PATTERNS } from '../../utils/haptics';

interface InteractiveMatchGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTryFeature?: (tab: string) => void;
}

export const InteractiveMatchGuideModal: React.FC<InteractiveMatchGuideModalProps> = ({
  isOpen,
  onClose,
  onTryFeature,
}) => {
  const [activeStep, setActiveStep] = useState<number>(0);

  if (!isOpen) return null;

  const guideSteps = [
    {
      title: 'Simulation Playback Modes',
      badge: 'Step 1 of 6',
      icon: Play,
      iconColor: 'text-emerald-400',
      description: 'Control the pace of the broadcast simulation with 3 distinct operational modes:',
      features: [
        { label: 'NEXT BALL', detail: 'Step 1 delivery at a time. Ideal for inspecting individual ball physics, swing curvature, and wagon wheel trajectories.' },
        { label: 'OVER FAST-FORWARD', detail: 'Instantly simulates the remaining deliveries of the current over and rotates bowling ends.' },
        { label: 'AUTOPLAY BROADCAST', detail: 'Streams realistic continuous deliveries with crowd cheers and dynamic camera transitions.' },
      ],
      tip: 'Pro Tip: Tap Next Ball when a key wicket falls to observe how the AI win probability immediately reacts.',
    },
    {
      title: 'Coach & Captaincy Tactical Sliders',
      badge: 'Step 2 of 6',
      icon: Shield,
      iconColor: 'text-cyan-400',
      description: 'You hold managerial command over both innings. Adjust settings to influence real-time ball outcomes:',
      features: [
        { label: 'Batting Aggression', detail: 'Choose Anchor (defend wickets), Balanced (rotate strike), Aggressive (boundary hunting), or Maximum Risk (powerplay blitz).' },
        { label: 'Bowling Delivery Focus', detail: 'Target Wide Yorker traps, Hard Deck bouncers into the ribs, or Slower back-of-hand knuckle variations.' },
        { label: 'Field Preset', detail: 'Deploy Aggressive Slips to induce edges or Deep Fence Defense to starve 4s and 6s.' },
      ],
      tip: 'Noticeable Impact: Shifting to Wide Yorkers in the 19th over cuts boundary frequency by 34%.',
    },
    {
      title: 'Smart Coach Strategy Insights Panel',
      badge: 'Step 3 of 6',
      icon: TrendingUp,
      iconColor: 'text-amber-400',
      description: 'An AI tactical brain that monitors the required run rate (RRR) and match phase every ball:',
      features: [
        { label: 'Match Phase Directives', detail: 'Provides bespoke tactical directives for Powerplay (Overs 1-6), Middle consolidation, and Death clenches.' },
        { label: '1-Click Strategy Apply', detail: 'Tap the green "Apply Strategy Directives" button to synchronize batting and bowling tactics in one touch.' },
        { label: 'Chase Equation Calculator', detail: 'Real-time telemetry showing required boundaries per over needed to win.' },
      ],
      tip: 'Watch the Strategy Panel alert you with urgency flares when RRR crosses 12.00 runs per over!',
    },
    {
      title: 'Hawk-Eye DRS & Snickometer Reviews',
      badge: 'Step 4 of 6',
      icon: Sparkles,
      iconColor: 'text-purple-400',
      description: 'Experience authentic ICC Third Umpire review protocol with multi-angle ball tracking:',
      features: [
        { label: 'Trigger Review Button', detail: 'Challenge close LBW shouts and caught-behind appeals to initiate UltraEdge and Hawk-Eye ball tracking.' },
        { label: 'UltraEdge Snickometer', detail: 'Visual waveform audio spike detection that verifies bat-ball contact.' },
        { label: '3-Point DRS Verification', detail: 'Inspect Pitching Line (In Line), Impact Point, and Stumps Hitting trajectory.' },
      ],
      tip: 'Umpire’s Call preserves the on-field decision while retaining the reviewing team’s DRS review.',
    },
    {
      title: 'Next Ball Predictor (+50 XP)',
      badge: 'Step 5 of 6',
      icon: Zap,
      iconColor: 'text-yellow-400',
      description: 'Gamified cricket intuition rewards! Test your reading of pitch conditions and batter body language:',
      features: [
        { label: 'Make Your Call', detail: 'Select between DOT, RUNS, BOUNDARY (4/6), or WICKET before bowling the next delivery.' },
        { label: 'XP Reward Multiplier', detail: 'Earn +50 XP for every accurate prediction to climb the Analyst Leaderboard.' },
        { label: 'Dynamic Feedback', detail: 'Instant feedback informs you if your tactical read was correct.' },
      ],
      tip: 'Predicting a wicket right after two consecutive dot balls has a 42% statistical hit rate!',
    },
    {
      title: 'Innings Switcher & 360° Wagon Wheel',
      badge: 'Step 6 of 6',
      icon: Compass,
      iconColor: 'text-sky-400',
      description: 'Comprehensive 2-Innings analysis and interactive ground geometry:',
      features: [
        { label: 'Innings 1 vs 2 Switcher', detail: 'Toggle between the completed 1st Innings target-setting scorecard and the live 2nd Innings chase.' },
        { label: '360° Ground Wagon Wheel', detail: 'Visual radial map of all boundary hits and scoring zones across the entire stadium.' },
        { label: 'Complete Bowling Figures', detail: 'Inspect Overs, Maidens, Runs, Wickets, and Economy figures for every bowler.' },
      ],
      tip: 'Check the Bowling Scorecard tab to see which bowler is bowling the most economical dot-ball spells.',
    },
  ];

  const current = guideSteps[activeStep];
  const Icon = current.icon;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/85 backdrop-blur-md overflow-y-auto animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl rounded-3xl border border-cyan-500/40 bg-gradient-to-b from-[#020b18] via-[#03112c] to-[#010712] p-6 sm:p-8 shadow-[0_0_50px_rgba(6,182,212,0.25)] space-y-6">
        {/* Top Header */}
        <div className="flex items-center justify-between border-b border-cyan-500/20 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-cyan-500/20 border border-cyan-400/50 text-cyan-300 shadow-md">
              <HelpCircle className="h-5 w-5" />
            </div>
            <div>
              <span className="text-[10px] font-mono font-bold text-cyan-400 uppercase tracking-widest block">
                INTERACTIVE SPECTATOR & CAPTAINCY MANUAL
              </span>
              <h3 className="text-xl font-black text-white">
                How to Master the Cricket AI Live Match
              </h3>
            </div>
          </div>

          <button
            onClick={() => {
              onClose();
              cricketAudio.playUiClick();
            }}
            className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-700 bg-slate-900 text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Step Indicator Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          {guideSteps.map((step, idx) => (
            <button
              key={idx}
              onClick={() => {
                setActiveStep(idx);
                cricketAudio.playUiClick();
                triggerHaptic(HAPTIC_PATTERNS.TAP);
              }}
              className={`flex-1 min-w-[70px] py-1.5 rounded-lg text-xs font-mono font-bold text-center transition-all cursor-pointer ${
                activeStep === idx
                  ? 'bg-cyan-500 text-slate-950 font-black shadow-sm'
                  : 'bg-slate-900 text-slate-400 hover:text-white'
              }`}
            >
              Step {idx + 1}
            </button>
          ))}
        </div>

        {/* Step Detail Content */}
        <div className="rounded-2xl border border-cyan-500/25 bg-[#030e24] p-5 sm:p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Icon className={`h-6 w-6 ${current.iconColor}`} />
              <h4 className="text-lg font-bold text-white font-sans">{current.title}</h4>
            </div>
            <span className="rounded-full bg-slate-900 border border-slate-700 px-3 py-1 text-xs font-mono font-bold text-cyan-300">
              {current.badge}
            </span>
          </div>

          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-sans">
            {current.description}
          </p>

          <div className="space-y-2.5 pt-1">
            {current.features.map((f, i) => (
              <div key={i} className="rounded-xl border border-slate-800 bg-slate-950/80 p-3 flex items-start gap-3">
                <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <span className="text-xs font-mono font-bold text-white block">{f.label}</span>
                  <span className="text-xs text-slate-400 font-sans leading-relaxed">{f.detail}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Pro Tip Box */}
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs font-sans text-amber-200">
            💡 {current.tip}
          </div>
        </div>

        {/* Footer Navigation Buttons */}
        <div className="flex items-center justify-between pt-2">
          <button
            onClick={() => {
              if (activeStep > 0) setActiveStep(activeStep - 1);
              cricketAudio.playUiClick();
              triggerHaptic(HAPTIC_PATTERNS.TAP);
            }}
            disabled={activeStep === 0}
            className="rounded-xl border border-slate-700 bg-slate-900 px-4 py-2 text-xs font-mono font-bold text-slate-300 hover:text-white disabled:opacity-40 transition-colors cursor-pointer"
          >
            ← Previous
          </button>

          <span className="text-xs font-mono text-slate-400">
            {activeStep + 1} of {guideSteps.length}
          </span>

          {activeStep < guideSteps.length - 1 ? (
            <button
              onClick={() => {
                setActiveStep(activeStep + 1);
                cricketAudio.playUiClick();
                triggerHaptic(HAPTIC_PATTERNS.TAP);
              }}
              className="rounded-xl bg-cyan-500 px-5 py-2 text-xs font-mono font-black text-slate-950 hover:bg-cyan-400 transition-colors cursor-pointer shadow-md shadow-cyan-500/30"
            >
              Next Step →
            </button>
          ) : (
            <button
              onClick={() => {
                onClose();
                cricketAudio.playBatHit();
                triggerHaptic(HAPTIC_PATTERNS.VICTORY_FANFARE);
              }}
              className="rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 px-6 py-2 text-xs font-mono font-black text-slate-950 hover:opacity-90 transition-opacity cursor-pointer shadow-md"
            >
              Got It, Let's Play! 🏏
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
