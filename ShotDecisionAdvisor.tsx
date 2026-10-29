import React, { useState, useMemo } from 'react';
import {
  Shield,
  Zap,
  Target,
  Gauge,
  Activity,
  ChevronRight,
  Sparkles,
  RotateCcw,
  Sliders,
  CheckCircle2,
  AlertTriangle,
  Info,
  Maximize2,
  Minimize2,
} from 'lucide-react';
import { Player, Stadium, BallEvent } from '../../types/cricket';
import { cricketAudio } from '../../utils/audioSystem';

export interface ShotDecisionData {
  defenseProb: number; // e.g. 38%
  attackProb: number;  // e.g. 62%
  optimalShot: {
    name: string;
    intent: 'Attack' | 'Defense' | 'Counter';
    riskLevel: 'Low' | 'Medium' | 'High';
    successRate: number; // e.g. 82%
    recommendedStance: string;
    footwork: string;
    sweetSpotWindowMs: number;
    impactHeightMeters: number;
    wagonZone: string;
    rationale: string;
  };
  alternativeShots: Array<{
    name: string;
    intent: 'Attack' | 'Defense' | 'Counter';
    successRate: number;
    risk: 'Low' | 'Medium' | 'High';
    zone: string;
    keyTradeoff: string;
  }>;
  hazardNotice: string;
  metrics: {
    speedKmh: number;
    bouncePercent: number;
    estimatedBounceMeters: number;
    reactionTimeSeconds: number;
    length: string;
  };
}

/**
 * Tactical calculation engine for optimal batting shot based on
 * current bowler delivery speed and pitch bounce metrics.
 */
export function calculateShotDecision(
  speedKmh: number,
  bouncePercent: number,
  lengthOption: string = 'Good Length',
  requiredRR: number = 8.5,
  wicketsLost: number = 3,
  bowlerRole?: string
): ShotDecisionData {
  const isPacer = !bowlerRole || !bowlerRole.toLowerCase().includes('spin');
  const bounceMeters = Number(((bouncePercent / 100) * 1.85).toFixed(2));
  
  // Aerodynamic reaction time (20.12m pitch with deceleration)
  const effectiveSpeedMs = (speedKmh * 1000) / 3600;
  const reactionTime = Number((20.12 / effectiveSpeedMs).toFixed(2));

  // Base Attack Probability (0-100)
  let attackScore = 52;

  // 1. Bowler Speed Factor
  if (speedKmh >= 148) {
    attackScore -= 18; // Express thunderbolt forces compact defense
  } else if (speedKmh >= 140) {
    attackScore -= 10; // Rapid pace narrows reaction margins
  } else if (speedKmh <= 90) {
    attackScore += 18; // Spin offers time for premeditated attack
  } else if (speedKmh <= 120) {
    attackScore += 10; // Medium pace allows full swing through line
  }

  // 2. Pitch Bounce Factor
  if (bouncePercent >= 90) {
    // Steep bounce carries uncontrolled top-edge hazard
    attackScore -= 10;
  } else if (bouncePercent >= 78 && bouncePercent <= 88) {
    // True sporting deck — optimal contact corridor
    attackScore += 12;
  } else if (bouncePercent <= 68) {
    // Low, skidding deck — danger of being trapped LBW / bowled
    attackScore -= 12;
  }

  // 3. Length Factor
  if (lengthOption === 'Yorker') {
    attackScore -= 24; // Jam out blockhole
  } else if (lengthOption === 'Full' || lengthOption === 'Overpitched') {
    attackScore += 22; // Half volley invite
  } else if (lengthOption === 'Bouncer' || lengthOption === 'Short') {
    if (bouncePercent > 85) attackScore -= 8; // Steep bouncer difficult to control
    else attackScore += 12; // Pullable short ball
  }

  // 4. Match Situation Context
  if (requiredRR > 11.0) {
    attackScore += 16; // Chase urgency overrides conservative play
  } else if (requiredRR < 5.5 && wicketsLost >= 6) {
    attackScore -= 14; // Protect tail with defensive solidity
  }

  // Clamped probabilities
  const attackProb = Math.min(94, Math.max(8, Math.round(attackScore)));
  const defenseProb = 100 - attackProb;

  // Recommended Optimal Shot Determination
  let optimalShot: ShotDecisionData['optimalShot'];
  let alternativeShots: ShotDecisionData['alternativeShots'];
  let hazardNotice: string;

  if (lengthOption === 'Yorker') {
    optimalShot = {
      name: speedKmh > 140 ? 'Orthodox Blockhole Dig-Out' : 'Steer & Squeeze Past Gutter',
      intent: 'Defense',
      riskLevel: 'Medium',
      successRate: 88,
      recommendedStance: 'Drop hands low, compact base with eyes over the toe',
      footwork: 'Front foot jammed straight without lunging',
      sweetSpotWindowMs: 14,
      impactHeightMeters: 0.18,
      wagonZone: 'Mid-Off / Straight',
      rationale: `At ${speedKmh} km/h on the toes, swinging across risks clean timber. A straight bat drop-and-run safely neutralizes the delivery.`,
    };
    alternativeShots = [
      { name: 'Helicopter Whip', intent: 'Attack', successRate: 58, risk: 'High', zone: 'Deep Mid-Wicket', keyTradeoff: 'High boundary upside but extreme LBW hazard' },
      { name: 'Late Squeeze to Third Man', intent: 'Defense', successRate: 79, risk: 'Low', zone: 'Third Man', keyTradeoff: 'Low-risk single with open face' },
    ];
    hazardNotice = 'Extreme threat of stumps being uprooted if front pad crosses line of ball.';
  } else if (bouncePercent >= 88 && (lengthOption === 'Bouncer' || lengthOption === 'Short of Length' || lengthOption === 'Good Length')) {
    if (speedKmh >= 138) {
      optimalShot = {
        name: 'Upper Cut Over Third-Man',
        intent: 'Attack',
        riskLevel: 'Medium',
        successRate: 78,
        recommendedStance: 'Arched back, open blade face to utilize bowler pace',
        footwork: 'Shift weight to back-foot, ride the steep bounce',
        sweetSpotWindowMs: 19,
        impactHeightMeters: 1.54,
        wagonZone: 'Third Man / Fly Slip',
        rationale: `Hard-deck bounce (${bouncePercent}%) at ${speedKmh} km/h carries over the keeper. Using the bowler’s own kinetic velocity clears the backward ropes effortlessly.`,
      };
      alternativeShots = [
        { name: 'High-Elbow Sway & Leave', intent: 'Defense', successRate: 94, risk: 'Low', zone: 'Keeper Gloves', keyTradeoff: 'Guarantees survival against steep lift' },
        { name: 'Back-Foot Defensive Drop', intent: 'Defense', successRate: 83, risk: 'Low', zone: 'Gully Gap', keyTradeoff: 'Soft hands absorb impact on throat corridor' },
      ];
      hazardNotice = 'Avoid horizontal cross-bat pull; top edge likely to balloon to fine leg.';
    } else {
      optimalShot = {
        name: 'Horizontal-Bat Swivel Pull',
        intent: 'Attack',
        riskLevel: 'Low',
        successRate: 85,
        recommendedStance: 'Square-on stance, high backlift ready for roll of wrists',
        footwork: 'Quick back-and-across shuffle onto the back leg',
        sweetSpotWindowMs: 28,
        impactHeightMeters: 1.38,
        wagonZone: 'Deep Square Leg / Mid-Wicket',
        rationale: `Moderate pace (${speedKmh} km/h) with predictable high bounce gives ample setup time to roll wrists along the trajectory for 4 runs.`,
      };
      alternativeShots = [
        { name: 'Back-Foot Punch', intent: 'Attack', successRate: 81, risk: 'Medium', zone: 'Extra Cover', keyTradeoff: 'Pierces off-side ring if width provided' },
        { name: 'Duck & Evade', intent: 'Defense', successRate: 98, risk: 'Low', zone: 'None', keyTradeoff: 'Zero run opportunity but complete safety' },
      ];
      hazardNotice = 'Ensure head stays still; rolling wrists keeps ball safely along ground.';
    }
  } else if (bouncePercent <= 70) {
    // Low, Skidding Pitch
    optimalShot = {
      name: 'Solid Front-Foot Low Block',
      intent: 'Defense',
      riskLevel: 'Low',
      successRate: 89,
      recommendedStance: 'Deep knee flex, bat held strictly in front of pad',
      footwork: 'Positive stride forward to smother the low bounce early',
      sweetSpotWindowMs: 22,
      impactHeightMeters: 0.42,
      wagonZone: 'Silly Mid-On / Mid-Off',
      rationale: `Low deck bounce (${bouncePercent}%) means deliveries slide under horizontal shots. Smothering the ball at pitch point eliminates LBW risk.`,
    };
    alternativeShots = [
      { name: 'Flick Off Pads', intent: 'Attack', successRate: 74, risk: 'Medium', zone: 'Deep Mid-Wicket', keyTradeoff: 'High scoring if line is on leg-stump' },
      { name: 'Straight Punch Drive', intent: 'Attack', successRate: 68, risk: 'High', zone: 'Long-Off', keyTradeoff: 'Requires immaculate timing on variable low roll' },
    ];
    hazardNotice = 'Never play back on a low bounce deck; ball shoots under the bat toe.';
  } else if (!isPacer || speedKmh < 100) {
    // Spin Bowler
    if (attackProb >= 55) {
      optimalShot = {
        name: 'Step-Out Inside-Out Lofted Drive',
        intent: 'Attack',
        riskLevel: 'Medium',
        successRate: 82,
        recommendedStance: 'Light on balls of feet, high bat-swing arc',
        footwork: 'Two quick dynamic paces down the wicket to pitch of spin',
        sweetSpotWindowMs: 34,
        impactHeightMeters: 0.88,
        wagonZone: 'Extra Cover / Long-Off',
        rationale: `At ${speedKmh} km/h, taking the aerial route inside-out eliminates turn off the deck and lofts over the infield 30-yard ring.`,
      };
      alternativeShots = [
        { name: 'Controlled Paddle Sweep', intent: 'Attack', successRate: 80, risk: 'Low', zone: 'Fine Leg', keyTradeoff: 'Uses pace behind square with minimal risk' },
        { name: 'Orthodox Forward Defense', intent: 'Defense', successRate: 92, risk: 'Low', zone: 'Bat-Pad', keyTradeoff: 'Dead-bats turn with soft hands' },
      ];
      hazardNotice = 'If spinner bowls flat seam arm-ball, stepping out risks stumping dismissal.';
    } else {
      optimalShot = {
        name: 'Soft-Hands Forward Defense',
        intent: 'Defense',
        riskLevel: 'Low',
        successRate: 91,
        recommendedStance: 'Relaxed bottom hand, head aligned with off-stump',
        footwork: 'Long stride towards ball with bat-pad tightly glued',
        sweetSpotWindowMs: 32,
        impactHeightMeters: 0.65,
        wagonZone: 'Cover Point',
        rationale: `Grip on the ${bouncePercent}% deck threatens outside edge. Playing with soft hands ensures edges drop well short of slips.`,
      };
      alternativeShots = [
        { name: 'Square Cut on Back-Foot', intent: 'Attack', successRate: 75, risk: 'Medium', zone: 'Backward Point', keyTradeoff: 'Capitalizes if spinner errs short outside off' },
        { name: 'Nudge to Mid-Wicket', intent: 'Defense', successRate: 86, risk: 'Low', zone: 'Square Leg', keyTradeoff: 'Rotates strike without aerial exposure' },
      ];
      hazardNotice = 'Hard hands will carry thick edges to slip or silly point.';
    }
  } else {
    // True Deck Pace Bowler (125 - 145 km/h, 75 - 88% bounce)
    if (attackProb >= 50) {
      optimalShot = {
        name: 'Front-Foot High-Elbow Cover Drive',
        intent: 'Attack',
        riskLevel: 'Low',
        successRate: 86,
        recommendedStance: 'Weight transferred cleanly through bent front knee, high leading elbow',
        footwork: 'Decisive forward press into the line of the swinging ball',
        sweetSpotWindowMs: 24,
        impactHeightMeters: 0.92,
        wagonZone: 'Cover / Extra Cover Boundary',
        rationale: `With true ${bouncePercent}% bounce and ${speedKmh} km/h delivery, hitting on the up with full face gives 100% kinetic energy transfer into the ropes.`,
      };
      alternativeShots = [
        { name: 'Back-Foot Punch Past Point', intent: 'Attack', successRate: 81, risk: 'Medium', zone: 'Cover Point', keyTradeoff: 'Exploits back-of-length deliveries cleanly' },
        { name: 'Orthodox Forward Defense', intent: 'Defense', successRate: 93, risk: 'Low', zone: 'Mid-Off', keyTradeoff: 'Guarantees dot ball with zero wicket risk' },
      ];
      hazardNotice = 'Do not flash at outswinger without moving feet; keep head over contact point.';
    } else {
      optimalShot = {
        name: 'Compact Orthodox Forward Defense',
        intent: 'Defense',
        riskLevel: 'Low',
        successRate: 92,
        recommendedStance: 'High top-hand dominance, relaxed grip, eyes straight over pitch',
        footwork: 'Balanced forward step alongside the line, protecting off-stump',
        sweetSpotWindowMs: 26,
        impactHeightMeters: 0.72,
        wagonZone: 'Mid-On / Bowler',
        rationale: `High bowling accuracy and swing at ${speedKmh} km/h requires respect. A compact straight presentation blunts the threat completely.`,
      };
      alternativeShots = [
        { name: 'Straight Punch for Single', intent: 'Counter', successRate: 78, risk: 'Medium', zone: 'Mid-On', keyTradeoff: 'Rotates strike off the front foot' },
        { name: 'Late Dab to Third Man', intent: 'Counter', successRate: 76, risk: 'Medium', zone: 'Deep Third', keyTradeoff: 'Guides pace with angled blade' },
      ];
      hazardNotice = 'Avoid pushing with rigid hands away from body to prevent edge to keeper.';
    }
  }

  return {
    defenseProb,
    attackProb,
    optimalShot,
    alternativeShots,
    hazardNotice,
    metrics: {
      speedKmh,
      bouncePercent,
      estimatedBounceMeters: bounceMeters,
      reactionTimeSeconds: reactionTime,
      length: lengthOption,
    },
  };
}

// =========================================================================
// 1. FLOATING COMPACT HUD COMPONENT (Renders directly inside Stadium3DGround)
// =========================================================================
export interface ShotDecisionAdvisorHUDProps {
  bowlerSpeed?: number;
  pitchBounce?: number;
  speedKmh?: number;
  bouncePercent?: number;
  lastBall?: BallEvent | null;
  bowler?: Player | null;
  striker?: Player | null;
  requiredRR?: number | string;
  wickets?: number;
  stadium?: Stadium | null;
  onOpenFullAdvisor?: () => void;
  className?: string;
}

export const ShotDecisionAdvisorHUD: React.FC<ShotDecisionAdvisorHUDProps> = ({
  bowlerSpeed,
  pitchBounce,
  speedKmh,
  bouncePercent,
  lastBall,
  bowler,
  striker,
  requiredRR = 8.5,
  wickets = 3,
  stadium,
  onOpenFullAdvisor,
  className = '',
}) => {
  // Infer active speed
  const activeSpeed = useMemo(() => {
    if (speedKmh !== undefined) return speedKmh;
    if (bowlerSpeed !== undefined) return bowlerSpeed;
    if (lastBall?.speedKmh) return lastBall.speedKmh;
    if (lastBall && (lastBall as any).speed) return Math.round((lastBall as any).speed);
    if (bowler?.role?.includes('Spin')) return 88;
    return 141;
  }, [speedKmh, bowlerSpeed, lastBall, bowler]);

  // Infer pitch bounce from stadium or default
  const activeBounce = useMemo(() => {
    if (bouncePercent !== undefined) return bouncePercent;
    if (pitchBounce !== undefined) return pitchBounce;
    if (stadium && (stadium as any).pitchDynamics && (stadium as any).pitchDynamics.bounce) {
      return (stadium as any).pitchDynamics.bounce;
    }
    if (stadium?.pitchType === 'Pace & Bounce') return 92;
    if (stadium?.pitchType === 'True Batting') return 84;
    if (stadium?.pitchType === 'Slow & Turning') return 69;
    if (stadium?.pitchType === 'Dry Spin-Friendly') return 62;
    return 82;
  }, [bouncePercent, pitchBounce, stadium]);

  const activeLength = lastBall?.length || 'Good Length';
  const numericRRR = typeof requiredRR === 'string' ? parseFloat(requiredRR) || 8.5 : requiredRR;

  // Calculate recommendation
  const advice = useMemo(() => {
    return calculateShotDecision(
      activeSpeed,
      activeBounce,
      activeLength,
      numericRRR,
      wickets,
      bowler?.role
    );
  }, [activeSpeed, activeBounce, activeLength, numericRRR, wickets, bowler]);

  const [isHovered, setIsHovered] = useState(false);

  return (
    <div
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="rounded-2xl border border-sky-500/40 bg-slate-950/90 p-3.5 backdrop-blur-md shadow-2xl space-y-2 text-xs select-none transition-all duration-300 hover:border-sky-400"
    >
      {/* HUD Header */}
      <div className="flex items-center justify-between gap-2 border-b border-slate-800/80 pb-2">
        <div className="flex items-center gap-1.5 font-mono font-bold text-sky-400">
          <Target className="h-3.5 w-3.5 text-cyan-400 animate-pulse" />
          <span className="tracking-wide">SHOT DECISION ADVISOR</span>
        </div>

        {/* Live Metrics: Speed & Bounce */}
        <div className="flex items-center gap-2 text-[10px] font-mono">
          <span className="text-slate-400">
            SPEED: <strong className="text-cyan-300">{activeSpeed} km/h</strong>
          </span>
          <span className="text-slate-600">·</span>
          <span className="text-slate-400">
            BOUNCE: <strong className="text-emerald-400">{activeBounce}%</strong>
          </span>
        </div>
      </div>

      {/* Main Recommended Shot Callout */}
      <div className="space-y-1">
        <div className="flex items-center justify-between text-[11px] font-mono">
          <span className="text-slate-400">AI RECOMMENDED SHOT:</span>
          <span
            className={`font-bold px-1.5 py-0.5 rounded text-[10px] uppercase ${
              advice.optimalShot.intent === 'Attack'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                : 'bg-sky-500/20 text-sky-300 border border-sky-500/30'
            }`}
          >
            {advice.optimalShot.intent} ({advice.optimalShot.intent === 'Attack' ? advice.attackProb : advice.defenseProb}%)
          </span>
        </div>

        <div className="text-sm font-black text-white font-sans tracking-tight flex items-center justify-between">
          <span>{advice.optimalShot.name}</span>
          <span className="text-[10px] font-mono font-normal text-slate-400">
            {advice.optimalShot.successRate}% Success
          </span>
        </div>
      </div>

      {/* PROBABILITY SPLIT HUD GAUGE: DEFENSE vs ATTACK */}
      <div className="space-y-1 pt-1">
        <div className="flex items-center justify-between text-[10px] font-mono font-bold">
          <span className="flex items-center gap-1 text-sky-400">
            <Shield className="h-3 w-3" />
            <span>DEFENSE {advice.defenseProb}%</span>
          </span>
          <span className="flex items-center gap-1 text-emerald-400">
            <Zap className="h-3 w-3" />
            <span>ATTACK {advice.attackProb}%</span>
          </span>
        </div>

        {/* Dual-tone Progress Bar */}
        <div className="h-2 w-full rounded-full bg-slate-900 overflow-hidden flex shadow-inner border border-slate-800">
          <div
            className="h-full bg-gradient-to-r from-sky-600 to-cyan-500 transition-all duration-500 ease-out"
            style={{ width: `${advice.defenseProb}%` }}
            title={`Defense Probability: ${advice.defenseProb}%`}
          />
          <div
            className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-500 ease-out"
            style={{ width: `${advice.attackProb}%` }}
            title={`Attack Probability: ${advice.attackProb}%`}
          />
        </div>
      </div>

      {/* Rationale Micro-Snippet */}
      <p className="text-[11px] text-slate-300 leading-tight line-clamp-2 font-sans pt-0.5">
        {advice.optimalShot.rationale}
      </p>

      {/* Interactive Trigger Button */}
      {onOpenFullAdvisor && (
        <button
          onClick={() => {
            cricketAudio.playBatHit();
            onOpenFullAdvisor();
          }}
          className="w-full flex items-center justify-center gap-1.5 rounded-xl border border-sky-500/30 bg-sky-950/40 hover:bg-sky-900/60 py-1.5 text-[10px] font-mono font-bold text-sky-300 hover:text-white transition-all cursor-pointer"
        >
          <Sliders className="h-3 w-3 text-cyan-400" />
          <span>Interactive Scenario Simulator & Shot Lab</span>
          <ChevronRight className="h-3 w-3" />
        </button>
      )}
    </div>
  );
};

// =========================================================================
// 2. FULL INTERACTIVE SHOT ADVISOR DECK & SCENARIO LAB (Tab / Modal / Embedded)
// =========================================================================
export interface ShotDecisionAdvisorProps {
  initialSpeed?: number;
  initialBounce?: number;
  initialLength?: string;
  bowler?: Player;
  striker?: Player;
  stadium?: Stadium;
  requiredRR?: number;
  wickets?: number;
  onApplyTactic?: (tactic: { shot: string; intent: string; aggression: string }) => void;
}

export const ShotDecisionAdvisor: React.FC<ShotDecisionAdvisorProps> = ({
  initialSpeed = 142,
  initialBounce = 84,
  initialLength = 'Good Length',
  bowler,
  striker,
  stadium,
  requiredRR = 8.6,
  wickets = 3,
  onApplyTactic,
}) => {
  // Interactive Simulation Controls
  const [speedKmh, setSpeedKmh] = useState<number>(initialSpeed);
  const [bouncePercent, setBouncePercent] = useState<number>(initialBounce);
  const [deliveryLength, setDeliveryLength] = useState<string>(initialLength);
  const [activeTab, setActiveTab] = useState<'decision' | 'physics' | 'alternatives'>('decision');

  // Compute recommendation
  const advice = useMemo(() => {
    return calculateShotDecision(
      speedKmh,
      bouncePercent,
      deliveryLength,
      requiredRR,
      wickets,
      bowler?.role
    );
  }, [speedKmh, bouncePercent, deliveryLength, requiredRR, wickets, bowler]);

  return (
    <div className="rounded-3xl border border-sky-500/30 bg-slate-950/95 p-5 sm:p-6 backdrop-blur-xl shadow-2xl space-y-6">
      {/* Header Deck */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono font-bold text-sky-400 tracking-wider uppercase">
            <Target className="h-4 w-4 animate-pulse text-cyan-400" />
            <span>AI BATTING SHOT DECISION ADVISOR · BIOMECHANICS & AERODYNAMICS</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-white mt-1">
            Optimal Shot Selection: Pace, Bounce & Risk Calculus
          </h2>
          <p className="text-xs text-slate-400 font-mono mt-0.5">
            {striker ? `Active Striker: ${striker.name}` : 'Batter Model'} vs{' '}
            {bowler ? `${bowler.name} (${bowler.role})` : 'Pace Bowler'} · {stadium ? stadium.name : 'Match Stadium'}
          </p>
        </div>

        {/* Quick Presets Bar */}
        <div className="flex flex-wrap items-center gap-1.5 text-xs font-mono">
          <span className="text-slate-500 text-[11px] mr-1">Presets:</span>
          {[
            { label: 'Express Thunderbolt (148 km/h)', speed: 148, bounce: 90, length: 'Good Length' },
            { label: 'Steep Bouncer (142 km/h)', speed: 142, bounce: 94, length: 'Bouncer' },
            { label: 'Skidding Yorker (140 km/h)', speed: 140, bounce: 65, length: 'Yorker' },
            { label: 'Subcontinent Spin (86 km/h)', speed: 86, bounce: 68, length: 'Good Length' },
            { label: 'Sporting Drive (134 km/h)', speed: 134, bounce: 82, length: 'Full' },
          ].map((preset, idx) => (
            <button
              key={idx}
              onClick={() => {
                setSpeedKmh(preset.speed);
                setBouncePercent(preset.bounce);
                setDeliveryLength(preset.length);
                cricketAudio.playBatHit();
              }}
              className="rounded-lg border border-slate-800 bg-slate-900/80 hover:bg-sky-950/40 hover:border-sky-500/40 px-2.5 py-1 text-slate-300 hover:text-white transition-all cursor-pointer"
            >
              {preset.label.split(' ')[0]} {preset.label.split(' ')[1]}
            </button>
          ))}
        </div>
      </div>

      {/* Top Main Grid: Live Probability Gauge & Optimal Shot Showcase */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Left: Probabilities & Split Meter (5 cols) */}
        <div className="lg:col-span-5 rounded-2xl border border-slate-800 bg-slate-900/60 p-5 flex flex-col justify-between space-y-5">
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-slate-400 uppercase font-bold tracking-wider">
                TACTICAL INTENT PROBABILITY
              </span>
              <span className="text-slate-500">Live AI Estimation</span>
            </div>

            {/* Split Comparison Cards */}
            <div className="grid grid-cols-2 gap-3">
              {/* Defense Card */}
              <div
                className={`rounded-2xl border p-4 text-center transition-all ${
                  advice.defenseProb >= 50
                    ? 'border-sky-500/50 bg-sky-950/30 shadow-lg shadow-sky-500/10'
                    : 'border-slate-800 bg-slate-900/80'
                }`}
              >
                <div className="flex items-center justify-center gap-1.5 text-xs font-mono text-sky-400 font-bold mb-1">
                  <Shield className="h-4 w-4" />
                  <span>DEFENSE</span>
                </div>
                <div className="text-3xl sm:text-4xl font-black font-mono text-white tracking-tight">
                  {advice.defenseProb}%
                </div>
                <span className="text-[10px] text-slate-400 font-mono mt-1 block">
                  {advice.defenseProb >= 50 ? 'Recommended Stance' : 'Controlled Option'}
                </span>
              </div>

              {/* Attack Card */}
              <div
                className={`rounded-2xl border p-4 text-center transition-all ${
                  advice.attackProb > 50
                    ? 'border-emerald-500/50 bg-emerald-950/30 shadow-lg shadow-emerald-500/10'
                    : 'border-slate-800 bg-slate-900/80'
                }`}
              >
                <div className="flex items-center justify-center gap-1.5 text-xs font-mono text-emerald-400 font-bold mb-1">
                  <Zap className="h-4 w-4" />
                  <span>ATTACK</span>
                </div>
                <div className="text-3xl sm:text-4xl font-black font-mono text-white tracking-tight">
                  {advice.attackProb}%
                </div>
                <span className="text-[10px] text-slate-400 font-mono mt-1 block">
                  {advice.attackProb > 50 ? 'Optimal Strike Zone' : 'Higher Risk Window'}
                </span>
              </div>
            </div>

            {/* Visual Probability Bar with Gradient */}
            <div className="space-y-1.5 pt-1">
              <div className="flex items-center justify-between text-xs font-mono text-slate-400">
                <span>Solid Defense</span>
                <span>Calculated Attack</span>
              </div>
              <div className="h-3.5 w-full rounded-full bg-slate-950 overflow-hidden flex shadow-inner border border-slate-800 p-0.5">
                <div
                  className="h-full rounded-l-full bg-gradient-to-r from-sky-600 to-cyan-500 transition-all duration-500"
                  style={{ width: `${advice.defenseProb}%` }}
                />
                <div
                  className="h-full rounded-r-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-500"
                  style={{ width: `${advice.attackProb}%` }}
                />
              </div>
            </div>
          </div>

          {/* Biomechanical Telemetry Chips */}
          <div className="grid grid-cols-2 gap-2 pt-3 border-t border-slate-800 text-[11px] font-mono">
            <div className="rounded-xl bg-slate-950 p-2.5">
              <span className="text-slate-500 block text-[9px] uppercase">Reaction Window</span>
              <strong className="text-white text-xs">{advice.metrics.reactionTimeSeconds}s</strong>
              <span className="text-[9px] text-slate-500 block">Release to bat</span>
            </div>
            <div className="rounded-xl bg-slate-950 p-2.5">
              <span className="text-slate-500 block text-[9px] uppercase">Sweet-Spot Window</span>
              <strong className="text-cyan-400 text-xs">{advice.optimalShot.sweetSpotWindowMs} ms</strong>
              <span className="text-[9px] text-slate-500 block">Margin of error</span>
            </div>
            <div className="rounded-xl bg-slate-950 p-2.5">
              <span className="text-slate-500 block text-[9px] uppercase">Bounce Apex</span>
              <strong className="text-emerald-400 text-xs">{advice.metrics.estimatedBounceMeters} m</strong>
              <span className="text-[9px] text-slate-500 block">Strike height</span>
            </div>
            <div className="rounded-xl bg-slate-950 p-2.5">
              <span className="text-slate-500 block text-[9px] uppercase">Target Zone</span>
              <strong className="text-amber-400 text-xs truncate block">{advice.optimalShot.wagonZone}</strong>
              <span className="text-[9px] text-slate-500 block">Scoring corridor</span>
            </div>
          </div>
        </div>

        {/* Right: Recommended Optimal Shot Card (7 cols) */}
        <div className="lg:col-span-7 rounded-2xl border border-cyan-500/30 bg-gradient-to-br from-slate-900/90 via-slate-950 to-slate-900/90 p-5 sm:p-6 shadow-2xl flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between gap-2 border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-cyan-400 animate-ping" />
                <span className="text-xs font-mono font-bold text-cyan-400 tracking-wider uppercase">
                  RECOMMENDED EXECUTION
                </span>
              </div>
              <span className="text-xs font-mono text-emerald-400 font-bold bg-emerald-950/40 border border-emerald-500/30 px-2.5 py-1 rounded-lg">
                {advice.optimalShot.successRate}% Success Probability
              </span>
            </div>

            <div className="mt-3 space-y-1">
              <span className="text-xs font-mono text-slate-400 uppercase">MOST OPTIMAL BATTING STROKE</span>
              <h3 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                {advice.optimalShot.name}
              </h3>
            </div>

            <p className="text-sm text-slate-200 mt-3 font-sans leading-relaxed">
              {advice.optimalShot.rationale}
            </p>
          </div>

          {/* Footwork & Technical Stance Instruction */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-mono bg-slate-950/80 p-3.5 rounded-xl border border-slate-800">
            <div>
              <span className="text-[10px] text-slate-500 block uppercase font-bold">Stance & Weight Transfer</span>
              <span className="text-slate-200 block mt-0.5">{advice.optimalShot.recommendedStance}</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-500 block uppercase font-bold">Footwork Movement</span>
              <span className="text-slate-200 block mt-0.5">{advice.optimalShot.footwork}</span>
            </div>
          </div>

          {/* Hazard Notice */}
          <div className="rounded-xl border border-amber-500/30 bg-amber-950/30 p-3 flex items-start gap-2.5 text-xs font-sans text-amber-200">
            <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <strong className="font-mono text-[11px] block text-amber-300 uppercase">
                CRITICAL DISMISSAL HAZARD
              </strong>
              <span>{advice.hazardNotice}</span>
            </div>
          </div>

          {/* Action Trigger */}
          {onApplyTactic && (
            <button
              onClick={() => {
                cricketAudio.playBoundary();
                onApplyTactic({
                  shot: advice.optimalShot.name,
                  intent: advice.optimalShot.intent,
                  aggression: advice.attackProb > 60 ? 'Aggressive' : 'Balanced',
                });
              }}
              className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-sky-600 px-4 py-2.5 text-xs font-black text-slate-950 hover:brightness-110 shadow-lg shadow-cyan-500/20 cursor-pointer transition-all"
            >
              <Zap className="h-4 w-4" />
              <span>Apply Shot Recommendation to Striker</span>
            </button>
          )}
        </div>
      </div>

      {/* Interactive Scenario Tuning Sliders Deck */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-slate-800/80 pb-3">
          <div className="flex items-center gap-2 text-xs font-mono font-bold text-slate-300">
            <Sliders className="h-4 w-4 text-sky-400" />
            <span>INTERACTIVE DELIVERY METRICS TUNING</span>
          </div>
          <span className="text-[11px] font-mono text-slate-500">
            Drag sliders to simulate any bowler velocity and pitch bounce profile
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 font-mono text-xs">
          {/* Slider 1: Bowler Speed (km/h) */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-slate-400 font-bold">Bowler Release Velocity</span>
              <strong className="text-cyan-400 text-sm font-black">{speedKmh} km/h</strong>
            </div>
            <input
              type="range"
              min="75"
              max="155"
              step="1"
              value={speedKmh}
              onChange={(e) => setSpeedKmh(Number(e.target.value))}
              className="w-full accent-cyan-400 cursor-pointer h-2 bg-slate-950 rounded-lg"
            />
            <div className="flex justify-between text-[10px] text-slate-500">
              <span>75 km/h (Slow Spin)</span>
              <span>135 (Fast-Med)</span>
              <span>155 (Express)</span>
            </div>
          </div>

          {/* Slider 2: Pitch Bounce (%) */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-slate-400 font-bold">Pitch Bounce Response</span>
              <strong className="text-emerald-400 text-sm font-black">{bouncePercent}%</strong>
            </div>
            <input
              type="range"
              min="50"
              max="100"
              step="1"
              value={bouncePercent}
              onChange={(e) => setBouncePercent(Number(e.target.value))}
              className="w-full accent-emerald-400 cursor-pointer h-2 bg-slate-950 rounded-lg"
            />
            <div className="flex justify-between text-[10px] text-slate-500">
              <span>50% (Low / Skid)</span>
              <span>80% (True Deck)</span>
              <span>100% (Optus Deck)</span>
            </div>
          </div>

          {/* Selector 3: Delivery Length */}
          <div className="space-y-2">
            <span className="text-slate-400 font-bold block">Delivery Pitch Length</span>
            <div className="grid grid-cols-3 gap-1.5">
              {['Yorker', 'Full', 'Good Length', 'Short of Length', 'Bouncer'].map((len) => (
                <button
                  key={len}
                  onClick={() => {
                    setDeliveryLength(len);
                    cricketAudio.playBatHit();
                  }}
                  className={`rounded-lg py-1.5 px-2 text-center text-[10px] font-bold transition-all cursor-pointer ${
                    deliveryLength === len
                      ? 'bg-sky-500 text-slate-950 shadow-md shadow-sky-500/20'
                      : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
                  }`}
                >
                  {len}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Alternative Shot Selection Table */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 space-y-3">
        <div className="flex items-center justify-between text-xs font-mono font-bold text-slate-300">
          <span>SECONDARY SHOT OPTIONS & RISK COMPARISON</span>
          <span className="text-slate-500 text-[11px]">Trade-off Matrix</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs font-mono">
          {advice.alternativeShots.map((shot, idx) => (
            <div
              key={idx}
              className="rounded-xl border border-slate-800/80 bg-slate-950/80 p-3.5 space-y-1.5 hover:border-slate-700 transition-colors"
            >
              <div className="flex items-center justify-between">
                <span className="font-black text-white text-sm">{shot.name}</span>
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                    shot.intent === 'Attack'
                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                      : 'bg-sky-500/10 text-sky-400 border border-sky-500/20'
                  }`}
                >
                  {shot.intent} ({shot.successRate}%)
                </span>
              </div>
              <div className="flex items-center gap-3 text-[11px] text-slate-400">
                <span>Target: <strong className="text-slate-200">{shot.zone}</strong></span>
                <span>·</span>
                <span>Risk: <strong className={shot.risk === 'High' ? 'text-rose-400' : 'text-amber-400'}>{shot.risk}</strong></span>
              </div>
              <p className="text-[11px] text-slate-400 font-sans leading-tight">
                {shot.keyTradeoff}
              </p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs font-mono">
          {advice.alternativeShots.map((shot, idx) => (
            <div
              key={idx}
              className="rounded-xl border border-slate-800/80 bg-slate-950/80 p-3.5 space-y-1.5 hover:border-slate-700 transition-colors"
            >
              <div className="flex items-center justify-between">
                <span className="font-black text-white text-sm">{shot.name}</span>
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                    shot.intent === 'Attack'
                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                      : 'bg-sky-500/10 text-sky-400 border border-sky-500/20'
                  }`}
                >
                  {shot.intent} ({shot.successRate}%)
                </span>
              </div>
              <div className="flex items-center gap-3 text-[11px] text-slate-400">
                <span>Target: <strong className="text-slate-200">{shot.zone}</strong></span>
                <span>·</span>
                <span>Risk: <strong className={shot.risk === 'High' ? 'text-rose-400' : 'text-amber-400'}>{shot.risk}</strong></span>
              </div>
              <p className="text-[11px] text-slate-400 font-sans leading-tight">
                {shot.keyTradeoff}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const LegacyShotDecisionAdvisorHUD: React.FC<any> = ({
  speedKmh,
  bouncePercent,
  lengthOption,
  requiredRR = 8.5,
  wicketsLost,
  wickets,
  bowlerRole,
  lastBall,
  bowler,
  striker,
  stadium,
  onOpenFullAdvisor,
  className = '',
}) => {
  const effectiveSpeed = useMemo(() => {
    if (speedKmh !== undefined) return speedKmh;
    if (lastBall && lastBall.speed) return Math.round(lastBall.speed);
    if (bowler && bowler.role && bowler.role.toLowerCase().includes('spin')) return 88;
    return 142;
  }, [speedKmh, lastBall, bowler]);

  const effectiveBounce = useMemo(() => {
    if (bouncePercent !== undefined) return bouncePercent;
    if (stadium && (stadium as any).pitchDynamics && (stadium as any).pitchDynamics.bounce) {
      return Math.round((stadium as any).pitchDynamics.bounce * 10);
    }
    return 82;
  }, [bouncePercent, stadium]);

  const effectiveLength = lengthOption || (lastBall?.length as string) || 'Good Length';
  const effectiveWickets = wicketsLost ?? wickets ?? 3;
  const numRR = typeof requiredRR === 'string' ? parseFloat(requiredRR) || 8.5 : requiredRR;
  const effectiveBowlerRole = bowlerRole || bowler?.role || (bowler?.bowlingStyle?.includes('spin') ? 'Spin Bowler' : 'Pace Bowler');

  const data = useMemo(
    () => calculateShotDecision(effectiveSpeed, effectiveBounce, effectiveLength, numRR, effectiveWickets, effectiveBowlerRole),
    [effectiveSpeed, effectiveBounce, effectiveLength, numRR, effectiveWickets, effectiveBowlerRole]
  );

  return (
    <div
      className={`rounded-2xl border border-cyan-500/30 bg-gradient-to-br from-[#02071a]/95 via-[#040e29]/90 to-[#020718]/95 p-4 backdrop-blur-xl shadow-lg ring-1 ring-cyan-500/20 text-slate-100 space-y-3 ${className}`}
    >
      {/* Header with optimal shot */}
      <div className="flex items-center justify-between gap-2 border-b border-cyan-500/20 pb-2.5">
        <div className="flex items-center gap-2">
          <span className="flex h-2 w-2 rounded-full bg-cyan-400 animate-pulse" />
          <span className="text-[10px] font-mono font-bold tracking-wider text-cyan-300 uppercase">
            SHOT DECISION ADVISOR
          </span>
        </div>

        {onOpenFullAdvisor && (
          <button
            type="button"
            onClick={() => {
              cricketAudio.playBatHit();
              onOpenFullAdvisor();
            }}
            className="text-[10px] font-mono font-bold text-cyan-400 hover:text-cyan-200 transition-colors flex items-center gap-1 cursor-pointer"
          >
            <span>Telemetry</span>
            <ChevronRight className="h-3 w-3" />
          </button>
        )}
      </div>

      {/* Recommended Shot Card */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <span className="text-[10px] font-mono text-slate-400 uppercase block">RECOMMENDED SHOT</span>
          <h4 className="text-base font-black text-white tracking-tight leading-tight">
            {data.optimalShot.name}
          </h4>
          <span className="text-[11px] font-mono text-slate-400 block mt-0.5">
            Zone: <strong className="text-cyan-300">{data.optimalShot.wagonZone}</strong> · Stance: <strong className="text-slate-300">{data.optimalShot.footwork}</strong>
          </span>
        </div>

        <div className="text-right shrink-0">
          <span
            className={`inline-block px-2.5 py-1 rounded-md text-[10px] font-mono font-bold uppercase ${
              data.optimalShot.intent === 'Attack'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm shadow-emerald-500/20'
                : 'bg-sky-500/20 text-sky-300 border border-sky-500/40'
            }`}
          >
            {data.optimalShot.intent} ({data.optimalShot.successRate}% Success)
          </span>
          <span className="text-[10px] font-mono text-slate-500 block mt-1">
            Window: ±{data.optimalShot.sweetSpotWindowMs}ms
          </span>
        </div>
      </div>

      {/* Defense vs Attack Probability Split Bar */}
      <div className="space-y-1.5 pt-1">
        <div className="flex items-center justify-between text-xs font-mono font-bold">
          <span className="text-sky-300 flex items-center gap-1.5">
            <Shield className="h-3.5 w-3.5 text-sky-400" />
            <span>DEFENSE: {data.defenseProb}%</span>
          </span>
          <span className="text-emerald-400 flex items-center gap-1.5">
            <Zap className="h-3.5 w-3.5 text-emerald-400" />
            <span>ATTACK: {data.attackProb}%</span>
          </span>
        </div>

        {/* Dual Progress Bar */}
        <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-900 border border-slate-800 flex">
          <div
            className="h-full bg-gradient-to-r from-blue-600 to-sky-400 transition-all duration-500 shadow-[0_0_10px_rgba(56,189,248,0.7)]"
            style={{ width: `${data.defenseProb}%` }}
          />
          <div
            className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-500 shadow-[0_0_10px_rgba(52,211,153,0.7)]"
            style={{ width: `${data.attackProb}%` }}
          />
        </div>
      </div>

      {/* Bowler Speed & Pitch Bounce Metrics Footer */}
      <div className="grid grid-cols-3 gap-2 text-center text-xs font-mono border-t border-slate-800/80 pt-2.5">
        <div className="rounded-lg border border-slate-800 bg-slate-950/80 p-1.5">
          <span className="text-[9px] text-slate-500 block">BOWLER SPEED</span>
          <span className="font-bold text-cyan-300 text-[11px]">{data.metrics.speedKmh} km/h</span>
        </div>
        <div className="rounded-lg border border-slate-800 bg-slate-950/80 p-1.5">
          <span className="text-[9px] text-slate-500 block">PITCH BOUNCE</span>
          <span className="font-bold text-amber-300 text-[11px]">{data.metrics.bouncePercent}% ({data.metrics.estimatedBounceMeters}m)</span>
        </div>
        <div className="rounded-lg border border-slate-800 bg-slate-950/80 p-1.5">
          <span className="text-[9px] text-slate-500 block">REACTION TIME</span>
          <span className="font-bold text-white text-[11px]">{data.metrics.reactionTimeSeconds}s</span>
        </div>
      </div>
    </div>
  );
};

