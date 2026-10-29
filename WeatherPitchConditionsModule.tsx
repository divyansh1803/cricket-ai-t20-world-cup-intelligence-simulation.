import React from 'react';
import { CloudRain, Flame, Sun, Sparkles } from 'lucide-react';
import { Player, Stadium, Team } from '../../types/cricket';

export type SimulatorSurfaceCondition = 'damp' | 'dusty' | 'batting_paradise';

export interface ConditionAiOutcomeMetrics {
  id: SimulatorSurfaceCondition;
  label: string;
  subtitle: string;
  weatherSummary: string;
  adjustedParScore: number;
  adjustedWinProb: number;
  winProbShiftDelta: number;
  adjustedProjectedScore: number;
  boundaryChancePct: number;
  wicketThreatPct: number;
  dotBallChancePct: number;
  swingDeg: number;
  turnDeg: number;
  aiDirective: string;
}

export function computeSurfaceConditionAiOutcomes(params: {
  condition: SimulatorSurfaceCondition;
  stadium: Stadium;
  baseWinProb: number;
  baseProjectedScore: number;
  inningsNumber: 1 | 2 | 3 | 4;
  wickets: number;
  ballsRemaining: number;
  striker: Player;
  bowler: Player;
  battingTeam: Team;
  bowlingTeam: Team;
}): {
  effectiveStadium: Stadium;
  effectiveDew: boolean;
  metrics: ConditionAiOutcomeMetrics;
} {
  const {
    condition,
    stadium,
    baseWinProb,
    baseProjectedScore,
    inningsNumber,
    wickets,
    ballsRemaining,
    striker,
    bowler,
  } = params;

  const basePar = stadium.avgFirstInningsScore || 178;
  const isSpinner =
    bowler.role === 'Spin Bowler' ||
    bowler.bowlingStyle.toLowerCase().includes('spin') ||
    bowler.bowlingStyle.toLowerCase().includes('slow');
  const remainingOversFrac = Math.max(0, ballsRemaining / 6);

  if (condition === 'damp') {
    const adjustedPar = Math.max(138, basePar - 15);
    const effectiveStadium: Stadium = {
      ...stadium,
      pitchType: 'Pace & Bounce',
      dewFactor: 'Heavy',
      avgFirstInningsScore: adjustedPar,
      chasingWinPercent: Math.min(72, (stadium.chasingWinPercent || 54) + 5),
      paceWicketPercent: Math.min(82, (stadium.paceWicketPercent || 60) + 14),
      spinWicketPercent: Math.max(18, (stadium.spinWicketPercent || 40) - 14),
    };

    const projDelta = -Math.round(remainingOversFrac * 0.85);
    const adjustedProjectedScore = Math.max(runsFloor(baseProjectedScore, projDelta), baseProjectedScore + projDelta);
    // In 1st innings damp seam hurts batting side early (-4.2%), in 2nd innings skiddy damp turf helps chasers slightly if wickets intact (+3.4%)
    const rawShift =
      inningsNumber === 1
        ? -4.4 - wickets * 0.3
        : wickets <= 4
        ? 3.6
        : -2.8;
    const adjustedWinProb = clampProb(baseWinProb + rawShift);

    const strikerPaceBonus = ((striker.stats?.paceSR || 138) - 140) * 0.05;
    const boundaryChancePct = clampStat(14.8 + strikerPaceBonus - (isSpinner ? 0 : 2.4), 8, 32);
    const wicketThreatPct = clampStat(7.8 + (isSpinner ? -0.4 : 2.6), 3.2, 19);
    const dotBallChancePct = clampStat(39.5 + (isSpinner ? -1.5 : 3.5), 22, 56);

    return {
      effectiveStadium,
      effectiveDew: true,
      metrics: {
        id: 'damp',
        label: 'Damp',
        subtitle: 'Overcast · Moist Seam Deck',
        weatherSummary: '21°C · 84% Humidity · Sticky Seam Grip',
        adjustedParScore: adjustedPar,
        adjustedWinProb,
        winProbShiftDelta: Number((adjustedWinProb - baseWinProb).toFixed(1)),
        adjustedProjectedScore,
        boundaryChancePct,
        wicketThreatPct,
        dotBallChancePct,
        swingDeg: 2.4,
        turnDeg: 1.4,
        aiDirective: isSpinner
          ? 'Wet seam reduces finger-spin bite; AI recommends bringing express pace back into the attack to exploit two-paced seam nip.'
          : `${bowler.name} gains +2.4° aerial swing & holding seam off the damp deck; batters must play late under the eyes.`,
      },
    };
  }

  if (condition === 'dusty') {
    const adjustedPar = Math.max(142, basePar - 12);
    const effectiveStadium: Stadium = {
      ...stadium,
      pitchType: 'Dry Spin-Friendly',
      dewFactor: 'Low',
      avgFirstInningsScore: adjustedPar,
      chasingWinPercent: Math.max(32, (stadium.chasingWinPercent || 54) - 9),
      paceWicketPercent: Math.max(24, (stadium.paceWicketPercent || 60) - 18),
      spinWicketPercent: Math.min(76, (stadium.spinWicketPercent || 40) + 18),
    };

    const projDelta = -Math.round(remainingOversFrac * 0.72);
    const adjustedProjectedScore = Math.max(runsFloor(baseProjectedScore, projDelta), baseProjectedScore + projDelta);
    // Dusty crumbling surface penalizes 2nd innings chasers (-6.2%) while boosting 1st innings total value (+3.8%)
    const rawShift = inningsNumber >= 2 ? -6.2 - wickets * 0.35 : 3.8;
    const adjustedWinProb = clampProb(baseWinProb + rawShift);

    const strikerSpinBonus = ((striker.stats?.spinSR || 135) - 138) * 0.06;
    const boundaryChancePct = clampStat(15.6 + strikerSpinBonus - (isSpinner ? 3.1 : 1.1), 8, 32);
    const wicketThreatPct = clampStat(7.4 + (isSpinner ? 3.4 : 0.7), 3.2, 19.5);
    const dotBallChancePct = clampStat(38.0 + (isSpinner ? 4.2 : 1.2), 22, 56);

    return {
      effectiveStadium,
      effectiveDew: false,
      metrics: {
        id: 'dusty',
        label: 'Dusty',
        subtitle: 'Baked Crust · Ragging Turn',
        weatherSummary: '35°C · 34% Humidity · Dry Footmarks',
        adjustedParScore: adjustedPar,
        adjustedWinProb,
        winProbShiftDelta: Number((adjustedWinProb - baseWinProb).toFixed(1)),
        adjustedProjectedScore,
        boundaryChancePct,
        wicketThreatPct,
        dotBallChancePct,
        swingDeg: 0.7,
        turnDeg: 4.6,
        aiDirective: isSpinner
          ? `${bowler.name} extracts 4.6° sharp turn from dry footmarks; pack catching mid-wicket & slip for leading edges.`
          : 'Surface abrasion deadens pace onto the bat; bowl cross-seam slower cutters into the dry pitch.',
      },
    };
  }

  // 'batting_paradise'
  const adjustedPar = basePar + 20;
  const effectiveStadium: Stadium = {
    ...stadium,
    pitchType: 'True Batting',
    dewFactor: 'Moderate',
    avgFirstInningsScore: adjustedPar,
    chasingWinPercent: Math.min(76, (stadium.chasingWinPercent || 54) + 7),
  };

  const projDelta = Math.round(remainingOversFrac * 1.25);
  const adjustedProjectedScore = baseProjectedScore + projDelta;
  const rawShift = inningsNumber >= 2 ? 5.4 : 4.2;
  const adjustedWinProb = clampProb(baseWinProb + rawShift);

  const strikerAggBonus = ((striker.stats?.strikeRate || 142) - 138) * 0.07;
  const boundaryChancePct = clampStat(25.4 + strikerAggBonus, 12, 42);
  const wicketThreatPct = clampStat(4.4 - (striker.stats?.average > 38 ? 0.5 : 0), 2.4, 14);
  const dotBallChancePct = clampStat(26.5, 18, 45);

  return {
    effectiveStadium,
    effectiveDew: true,
    metrics: {
      id: 'batting_paradise',
      label: 'Batting Paradise',
      subtitle: 'Hard Flat Deck · True Carry',
      weatherSummary: '28°C · 52% Humidity · Lightning Outfield',
      adjustedParScore: adjustedPar,
      adjustedWinProb,
      winProbShiftDelta: Number((adjustedWinProb - baseWinProb).toFixed(1)),
      adjustedProjectedScore,
      boundaryChancePct,
      wicketThreatPct,
      dotBallChancePct,
      swingDeg: 0.9,
      turnDeg: 1.6,
      aiDirective: `${striker.name} enjoys true knee-roll bounce and minimal lateral deviation (+25.4% boundary conversion); bowlers must rely on wide yorkers.`,
    },
  };
}

function clampProb(v: number): number {
  return Math.max(2, Math.min(98, Number(v.toFixed(1))));
}

function clampStat(v: number, min: number, max: number): number {
  return Number(Math.max(min, Math.min(max, v)).toFixed(1));
}

function runsFloor(base: number, delta: number): number {
  return Math.max(40, base + delta);
}

interface WeatherPitchConditionsModuleProps {
  condition: SimulatorSurfaceCondition;
  onChangeCondition: (next: SimulatorSurfaceCondition) => void;
  metrics: ConditionAiOutcomeMetrics;
  battingTeamShort: string;
}

export const WeatherPitchConditionsModule: React.FC<WeatherPitchConditionsModuleProps> = ({
  condition,
  onChangeCondition,
  metrics,
  battingTeamShort,
}) => {
  const options: {
    id: SimulatorSurfaceCondition;
    label: string;
    tag: string;
    icon: React.ComponentType<{ className?: string }>;
  }[] = [
    { id: 'damp', label: 'Damp', tag: 'Seam & Swing', icon: CloudRain },
    { id: 'dusty', label: 'Dusty', tag: 'Sharp Turn', icon: Flame },
    { id: 'batting_paradise', label: 'Batting Paradise', tag: 'High Scoring', icon: Sun },
  ];

  return (
    <section
      aria-label="Weather and Pitch Conditions AI Simulator"
      className="rounded-2xl border border-slate-800 bg-slate-950/95 p-4 sm:p-5 space-y-4"
    >
      {/* Top Bar: Title + Live Condition Pill Buttons */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3.5">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono font-bold text-cyan-400">
            <Sparkles className="h-3.5 w-3.5 shrink-0" />
            <span>WEATHER & PITCH CONDITIONS</span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            {metrics.subtitle} · {metrics.weatherSummary}
          </p>
        </div>

        {/* 3 Condition Toggle Buttons */}
        <div
          role="group"
          aria-label="Select Weather and Pitch Condition"
          className="grid grid-cols-3 gap-1.5 rounded-xl border border-slate-800 bg-slate-900 p-1 text-xs font-mono shrink-0"
        >
          {options.map((opt) => {
            const Icon = opt.icon;
            const isActive = condition === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => onChangeCondition(opt.id)}
                className={`flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 font-bold transition-colors cursor-pointer whitespace-nowrap ${
                  isActive
                    ? opt.id === 'damp'
                      ? 'bg-sky-400 text-slate-950'
                      : opt.id === 'dusty'
                      ? 'bg-amber-400 text-slate-950'
                      : 'bg-emerald-400 text-slate-950'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/80'
                }`}
              >
                <Icon className="h-3.5 w-3.5 shrink-0" />
                <span>{opt.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Real-Time AI Outcome Updates Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 font-mono text-xs tabular-nums">
        <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-2.5">
          <span className="text-[10px] text-slate-400 block">AI WIN PROB ({battingTeamShort})</span>
          <div className="flex items-baseline gap-1.5 mt-0.5">
            <strong className="text-sm text-cyan-300 font-black">{metrics.adjustedWinProb}%</strong>
            <span
              className={`text-[10px] font-bold ${
                metrics.winProbShiftDelta >= 0 ? 'text-emerald-400' : 'text-rose-400'
              }`}
            >
              {metrics.winProbShiftDelta >= 0
                ? `+${metrics.winProbShiftDelta}%`
                : `${metrics.winProbShiftDelta}%`}
            </span>
          </div>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-2.5">
          <span className="text-[10px] text-slate-400 block">PROJECTED SCORE</span>
          <strong className="text-sm text-white font-black mt-0.5 block">
            {metrics.adjustedProjectedScore} Runs
          </strong>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-2.5">
          <span className="text-[10px] text-slate-400 block">ADJUSTED PAR</span>
          <strong className="text-sm text-amber-300 font-black mt-0.5 block">
            {metrics.adjustedParScore} Runs
          </strong>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-2.5">
          <span className="text-[10px] text-slate-400 block">BOUNDARY 4/6 %</span>
          <strong className="text-sm text-emerald-400 font-black mt-0.5 block">
            {metrics.boundaryChancePct}%
          </strong>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-2.5">
          <span className="text-[10px] text-slate-400 block">WICKET THREAT</span>
          <strong className="text-sm text-rose-400 font-black mt-0.5 block">
            {metrics.wicketThreatPct}%
          </strong>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-2.5">
          <span className="text-[10px] text-slate-400 block">SWING / TURN</span>
          <strong className="text-sm text-sky-300 font-black mt-0.5 block">
            {metrics.swingDeg}° / {metrics.turnDeg}°
          </strong>
        </div>
      </div>

      {/* AI Tactical Surface Verdict */}
      <div className="rounded-xl border border-slate-800/90 bg-slate-900/50 px-3.5 py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
        <p className="text-slate-200 leading-relaxed">
          <strong className="text-cyan-300 font-mono mr-1.5">AI Outcome Assessment:</strong>
          {metrics.aiDirective}
        </p>
        <span className="text-[11px] font-mono text-slate-400 tabular-nums whitespace-nowrap shrink-0">
          Dot Ball Forecast: {metrics.dotBallChancePct}%
        </span>
      </div>
    </section>
  );
};
