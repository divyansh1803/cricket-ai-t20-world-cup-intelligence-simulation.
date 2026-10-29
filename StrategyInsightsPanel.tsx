import React, { useState, useMemo } from 'react';
import {
  Brain,
  Shield,
  Zap,
  Target,
  ChevronDown,
  ChevronUp,
  Sparkles,
  TrendingUp,
  Flame,
  CheckCircle2,
  Sliders,
  Compass,
} from 'lucide-react';
import { Player, Team } from '../../types/cricket';
import { cricketAudio } from '../../utils/audioSystem';
import { triggerHaptic, HAPTIC_PATTERNS } from '../../utils/haptics';
import { TeamFlag } from '../common/CricketIdentity';

export interface StrategyDirectives {
  battingAggression: 'Anchor' | 'Balanced' | 'Aggressive' | 'Maximum Risk';
  bowlingLine: 'Wide Yorker' | 'Hard Deck Bouncer' | 'Stump-to-stump' | 'Slower Variation';
  fieldPreset: 'Balanced Ring' | 'Aggressive Slips' | 'Deep Boundary Defense';
  strategyName: string;
}

interface StrategyInsightsPanelProps {
  runs: number;
  wickets: number;
  overs: number; // e.g. 14.3
  totalOvers: number;
  targetScore: number;
  currentWinProb: number;
  striker: Player | null;
  bowler: Player | null;
  battingTeam: Team;
  bowlingTeam: Team;
  currentBattingAggression: 'Anchor' | 'Balanced' | 'Aggressive' | 'Maximum Risk';
  currentBowlingLine: 'Wide Yorker' | 'Hard Deck Bouncer' | 'Stump-to-stump' | 'Slower Variation';
  currentFieldPreset: 'Balanced Ring' | 'Aggressive Slips' | 'Deep Boundary Defense';
  onApplyStrategy: (strategy: StrategyDirectives) => void;
  className?: string;
}

export const StrategyInsightsPanel: React.FC<StrategyInsightsPanelProps> = ({
  runs,
  wickets,
  overs,
  totalOvers = 20,
  targetScore,
  currentWinProb,
  striker,
  bowler,
  battingTeam,
  bowlingTeam,
  currentBattingAggression,
  currentBowlingLine,
  currentFieldPreset,
  onApplyStrategy,
  className = '',
}) => {
  const [isExpanded, setIsExpanded] = useState<boolean>(true);
  const [appliedNotification, setAppliedNotification] = useState<string | null>(null);

  // Parse overs calculation
  const wholeOvers = Math.floor(overs);
  const fractionBalls = Math.round((overs - wholeOvers) * 10);
  const totalBallsBowled = wholeOvers * 6 + fractionBalls;
  const totalMatchBalls = totalOvers * 6;
  const ballsRemaining = Math.max(0, totalMatchBalls - totalBallsBowled);
  const oversRemainingDecimal = Math.max(0.1, ballsRemaining / 6);
  const oversBowledDecimal = Math.max(0.166, totalBallsBowled / 6);

  const crr = parseFloat((runs / oversBowledDecimal).toFixed(2));
  const runsNeeded = Math.max(0, targetScore - runs);
  const rrr = ballsRemaining > 0 ? parseFloat(((runsNeeded / ballsRemaining) * 6).toFixed(2)) : 0;
  const wicketsInHand = Math.max(0, 10 - wickets);

  // Match Phase Identification
  const phase: 'POWERPLAY' | 'MIDDLE' | 'DEATH' = useMemo(() => {
    if (wholeOvers < 6) return 'POWERPLAY';
    if (wholeOvers < 15) return 'MIDDLE';
    return 'DEATH';
  }, [wholeOvers]);

  // Dynamically generated captaincy insight logic
  const insights = useMemo(() => {
    let battingTitle = '';
    let battingText = '';
    let bowlingTitle = '';
    let bowlingText = '';
    let targetAggression: 'Anchor' | 'Balanced' | 'Aggressive' | 'Maximum Risk' = 'Balanced';
    let targetBowlingLine: 'Wide Yorker' | 'Hard Deck Bouncer' | 'Stump-to-stump' | 'Slower Variation' = 'Stump-to-stump';
    let targetField: 'Balanced Ring' | 'Aggressive Slips' | 'Deep Boundary Defense' = 'Balanced Ring';
    let strategyPresetName = '';

    if (phase === 'DEATH') {
      if (rrr > 11.5) {
        battingTitle = 'All-Out Boundary Assault Required';
        battingText = `RRR is critical at ${rrr.toFixed(1)}. Batter ${striker?.name || 'Striker'} must clear infield off-cutter length and target backward square / midwicket boundary arc every 2-3 deliveries.`;
        targetAggression = 'Maximum Risk';
        bowlingTitle = 'Wide Yorker Blockhole Defense';
        bowlingText = `Defend the boundary ropes. ${bowler?.name || 'Bowler'} should target the tramline with 138+ km/h wide yorkers to deny arc leverage.`;
        targetBowlingLine = 'Wide Yorker';
        targetField = 'Deep Boundary Defense';
        strategyPresetName = 'Death Over Maximum Assault';
      } else if (rrr > 8.0) {
        battingTitle = 'Controlled Death Overs Elevation';
        battingText = `Target boundary off the 2nd and 4th balls of the over. Convert misfields into aggressive doubles while protecting remaining wickets.`;
        targetAggression = 'Aggressive';
        bowlingTitle = 'Slower Cutter & Length Mix';
        bowlingText = `Vary release pace by 12-15 km/h. Keep mid-off and long-on tight against straight lofts.`;
        targetBowlingLine = 'Slower Variation';
        targetField = 'Deep Boundary Defense';
        strategyPresetName = 'High-Tempo Acceleration';
      } else {
        battingTitle = 'Calm Tactical Strike Rotation';
        battingText = `Equation is comfortable (${runsNeeded} runs from ${ballsRemaining} balls). Punish overpitched deliveries into empty sweeper pockets; avoid rash ramp shots.`;
        targetAggression = 'Balanced';
        bowlingTitle = 'Attacking Stumps to Force Errors';
        bowlingText = `Target middle-and-off to challenge pads and induce LBW / bowled dismissals.`;
        targetBowlingLine = 'Stump-to-stump';
        targetField = 'Balanced Ring';
        strategyPresetName = 'Clinical Finish Execution';
      }
    } else if (phase === 'POWERPLAY') {
      if (wickets >= 3) {
        battingTitle = 'Emergency Anchor Protocol';
        battingText = `3 wickets lost in powerplay. Drop risk ceiling immediately. Rebuild partnership to overs 8-10 before attempting lofted boundary shots.`;
        targetAggression = 'Anchor';
        bowlingTitle = 'Throat-Choke Attacking Slips';
        bowlingText = `Capitalize on batting panic! Keep 2 catching slips and aggressive short cover. Bowl hard-deck bouncers into ribcage.`;
        targetBowlingLine = 'Hard Deck Bouncer';
        targetField = 'Aggressive Slips';
        strategyPresetName = 'Damage Control Rebuild';
      } else {
        battingTitle = 'Powerplay Infield Exploitation';
        battingText = `Only 2 fielders outside the ring! Use hard new-ball pace to punch over extra cover and mid-on. Current CRR ${crr.toFixed(1)} is primed for a +2.0 boost.`;
        targetAggression = 'Aggressive';
        bowlingTitle = 'Early Outswing & Seam Hunting';
        bowlingText = `Bowl fuller length (4-5m channel) to encourage drive against lateral deviation. Keep catching gully active.`;
        targetBowlingLine = 'Stump-to-stump';
        targetField = 'Aggressive Slips';
        strategyPresetName = 'Powerplay High-Tempo Attack';
      }
    } else {
      // MIDDLE OVERS
      if (wicketsInHand <= 4) {
        battingTitle = 'Partnership Consolidation Protocol';
        battingText = `Lower middle order exposed. Rotate strike against spinners and wait for loose 5th-bowler deliveries. Preserve wickets for death phase.`;
        targetAggression = 'Anchor';
        bowlingTitle = 'Spin Strangulation in Ring';
        bowlingText = `Pack the 30-yard ring. Prevent easy singles through mid-wicket and point to build dot-ball pressure.`;
        targetBowlingLine = 'Stump-to-stump';
        targetField = 'Balanced Ring';
        strategyPresetName = 'Anchor & Rebuild Stance';
      } else if (rrr > 9.5) {
        battingTitle = 'Middle-Over Acceleration Trigger';
        battingText = `Required rate climbing (${rrr.toFixed(1)}). Identify the weaker bowler and target 14+ runs this over to release pressure before death.`;
        targetAggression = 'Aggressive';
        bowlingTitle = 'Hard Length Bouncers Trap';
        bowlingText = `Dig the ball into the pitch at 8-9 meters. Force batter into high-risk cross-bat pulls into deep square leg.`;
        targetBowlingLine = 'Hard Deck Bouncer';
        targetField = 'Deep Boundary Defense';
        strategyPresetName = 'Counter-Attack Acceleration';
      } else {
        battingTitle = 'Clinical Middle Overs Optimization';
        battingText = `Keep rotating strike at 1.4 runs per ball. Manipulate fielders by nudging into wide long-on and deep third man.`;
        targetAggression = 'Balanced';
        bowlingTitle = 'Pace Variation & Mystery Spin';
        bowlingText = `Alter bowling seam orientation and drop trajectory into the blockhole when batter steps out.`;
        targetBowlingLine = 'Slower Variation';
        targetField = 'Balanced Ring';
        strategyPresetName = 'Proactive Strike Manipulation';
      }
    }

    return {
      phaseLabel: phase,
      battingTitle,
      battingText,
      bowlingTitle,
      bowlingText,
      directives: {
        battingAggression: targetAggression,
        bowlingLine: targetBowlingLine,
        fieldPreset: targetField,
        strategyName: strategyPresetName,
      },
    };
  }, [phase, rrr, crr, runsNeeded, ballsRemaining, wickets, wicketsInHand, striker, bowler]);

  const handleApply = () => {
    onApplyStrategy(insights.directives);
    cricketAudio.playBatHit();
    triggerHaptic(HAPTIC_PATTERNS.TAP);
    setAppliedNotification(insights.directives.strategyName);
    setTimeout(() => {
      setAppliedNotification(null);
    }, 2800);
  };

  return (
    <div
      className={`rounded-2xl border border-cyan-500/35 bg-gradient-to-r from-[#03091e]/98 via-[#040f2e]/95 to-[#020718]/98 backdrop-blur-xl shadow-[0_12px_35px_rgba(0,0,0,0.65),0_0_20px_rgba(6,182,212,0.15)] overflow-hidden transition-all ${className}`}
    >
      {/* Top Header Bar */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-cyan-500/25 bg-[#030b24]/60">
        <div className="flex items-center gap-2.5">
          <div className="h-7 w-7 rounded-lg bg-cyan-500/20 border border-cyan-400/40 flex items-center justify-center text-cyan-300 shadow-[0_0_12px_rgba(6,182,212,0.3)]">
            <Brain className="h-4 w-4" />
          </div>

          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-black text-white tracking-tight">
                SMART COACH: STRATEGY INSIGHTS
              </span>
              <span className="rounded-full bg-cyan-950/80 border border-cyan-400/50 px-2 py-0.5 text-[10px] font-mono font-bold text-cyan-300">
                {insights.phaseLabel} PHASE
              </span>
            </div>
            <span className="inline-flex items-center gap-1.5 text-[10px] font-mono text-slate-400 leading-tight mt-0.5">
              <span>Live Captaincy Telemetry ·</span>
              <TeamFlag code={battingTeam.id} size="xs" />
              <span>vs</span>
              <TeamFlag code={bowlingTeam.id} size="xs" />
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Quick Metrics Badges */}
          <div className="hidden sm:flex items-center gap-2 text-[11px] font-mono font-bold">
            <span className="px-2 py-0.5 rounded-md bg-[#05112e] border border-cyan-500/30 text-cyan-300 tabular-nums">
              CRR: {crr.toFixed(1)}
            </span>
            {targetScore > 0 && (
              <span
                className={`px-2 py-0.5 rounded-md border tabular-nums ${
                  rrr > 10
                    ? 'bg-rose-950/60 border-rose-500/40 text-rose-300'
                    : rrr > 7.5
                    ? 'bg-amber-950/60 border-amber-500/40 text-amber-300'
                    : 'bg-emerald-950/60 border-emerald-500/40 text-emerald-300'
                }`}
              >
                RRR: {rrr.toFixed(1)}
              </span>
            )}
            <span className="px-2 py-0.5 rounded-md bg-slate-900 border border-slate-700 text-slate-300 tabular-nums">
              {wicketsInHand} wkts left
            </span>
          </div>

          {/* Expand/Collapse Toggle */}
          <button
            onClick={() => {
              setIsExpanded(!isExpanded);
              cricketAudio.playUiClick();
              triggerHaptic(HAPTIC_PATTERNS.TAP);
            }}
            className="h-7 w-7 rounded-lg border border-cyan-500/30 bg-slate-900/80 text-cyan-300 hover:text-white hover:border-cyan-400 flex items-center justify-center transition-colors cursor-pointer"
            title={isExpanded ? 'Collapse Insights' : 'Expand Insights'}
          >
            {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {/* Expanded Strategy Body */}
      {isExpanded && (
        <div className="p-4 space-y-3.5 animate-in fade-in duration-200">
          {/* Dual Directives: Batting & Bowling */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {/* 1. Batting Captaincy Directive */}
            <div className="rounded-xl border border-amber-500/25 bg-amber-950/15 p-3.5 space-y-1.5 shadow-inner">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-xs font-bold font-mono text-amber-300 uppercase">
                  <Flame className="h-3.5 w-3.5 text-amber-400" />
                  <span>Batting Captaincy Directive</span>
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/30 text-amber-200">
                  Target: {insights.directives.battingAggression}
                </span>
              </div>
              <h4 className="text-xs font-bold text-white">{insights.battingTitle}</h4>
              <p className="text-[11px] text-slate-300 font-sans leading-relaxed">
                {insights.battingText}
              </p>
            </div>

            {/* 2. Bowling & Field Strategy Directive */}
            <div className="rounded-xl border border-sky-500/25 bg-sky-950/15 p-3.5 space-y-1.5 shadow-inner">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-xs font-bold font-mono text-cyan-300 uppercase">
                  <Shield className="h-3.5 w-3.5 text-cyan-400" />
                  <span>Bowling & Field Directive</span>
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-500/10 border border-cyan-500/30 text-cyan-200">
                  Line: {insights.directives.bowlingLine}
                </span>
              </div>
              <h4 className="text-xs font-bold text-white">{insights.bowlingTitle}</h4>
              <p className="text-[11px] text-slate-300 font-sans leading-relaxed">
                {insights.bowlingText}
              </p>
            </div>
          </div>

          {/* Action Row: Apply Captaincy Directives directly to Match Simulator */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-slate-800/80">
            <div className="flex flex-wrap items-center gap-2 text-[11px] font-mono text-slate-400">
              <span className="text-slate-500 font-bold">PROPOSED SETUP:</span>
              <span className="text-amber-300 font-bold bg-amber-950/40 px-2 py-0.5 rounded border border-amber-500/30">
                {insights.directives.battingAggression} Batting
              </span>
              <span className="text-cyan-300 font-bold bg-cyan-950/40 px-2 py-0.5 rounded border border-cyan-500/30">
                {insights.directives.bowlingLine}
              </span>
              <span className="text-emerald-300 font-bold bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-500/30">
                {insights.directives.fieldPreset}
              </span>
            </div>

            <div className="flex items-center gap-2 self-end sm:self-auto">
              {appliedNotification && (
                <span className="inline-flex items-center gap-1 text-[11px] font-mono font-bold text-emerald-400 animate-in fade-in duration-200">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                  <span>Applied: {appliedNotification}</span>
                </span>
              )}

              <button
                onClick={handleApply}
                className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 px-4 py-2 text-xs font-bold text-white shadow-[0_0_20px_rgba(6,182,212,0.4)] transition-all cursor-pointer active:scale-95"
              >
                <Zap className="h-3.5 w-3.5 fill-current text-amber-300" />
                <span>Apply Strategy</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
