import React, { useEffect, useMemo, useRef, useState } from 'react';
import * as d3 from 'd3';
import { BallEvent, Player, Stadium, Team } from '../../types/cricket';
import { SimulatorSurfaceCondition } from './WeatherPitchConditionsModule';
import { TeamFlag } from '../common/CricketIdentity';
import { cricketAudio } from '../../utils/audioSystem';
import {
  Activity,
  ArrowDownRight,
  ArrowUpRight,
  Check,
  Crosshair,
  RotateCcw,
  Sliders,
  Zap,
} from 'lucide-react';

export type BattingAggressionMode = 'Anchor' | 'Balanced' | 'Aggressive' | 'Maximum Risk';
export type BowlingLineMode =
  | 'Stump-to-stump'
  | 'Wide Yorker'
  | 'Hard Deck Bouncer'
  | 'Slower Variation';
export type FieldPresetMode =
  | 'Aggressive Slips'
  | 'Balanced Ring'
  | 'Deep Boundary Defense';

export interface SimulatorTacticalConfig {
  battingAggression: BattingAggressionMode;
  bowlingLine: BowlingLineMode;
  fieldPreset: FieldPresetMode;
}

export interface EvaluatedBallShiftPoint {
  step: number;
  ballLabel: string;
  overFloat: number;
  deltaWp: number;
  rollingEmaDelta: number;
  cumulativeWpa: number;
  postWinProb: number;
  leverageIndex: number;
  outcomeToken: string;
  runsScored: number;
  isWicket: boolean;
  isBoundary: boolean;
  isSimulatedBaseline: boolean;
  batterName: string;
  bowlerName: string;
  deliverySummary: string;
  shotName: string;
  scoreLabel: string;
  verdictTier:
    | 'BATTING_SURGE'
    | 'BATTING_EDGE'
    | 'EQUILIBRIUM'
    | 'BOWLING_SQUEEZE'
    | 'BOWLING_BREAKTHROUGH';
  verdictLabel: string;
  tacticalEvaluation: string;
}

interface TacticalDecisionEnginePanelProps {
  battingTeam: Team;
  bowlingTeam: Team;
  striker: Player;
  nonStriker: Player;
  bowler: Player;
  events: BallEvent[];
  winProbHistory: number[];
  liveWinProb: number;
  runs: number;
  wickets: number;
  legalBalls: number;
  maxOvers: number;
  targetRuns: number;
  inningsNumber: 1 | 2 | 3 | 4;
  stadium: Stadium;
  surfaceCondition: SimulatorSurfaceCondition;
  dewActive: boolean;
  currentTactics: SimulatorTacticalConfig;
  onApplyTactics: (next: SimulatorTacticalConfig) => void;
}

type SplineMetricMode = 'per_ball_shift' | 'cumulative_wpa';
type EventHighlightFilter = 'all' | 'pivotal' | 'boundaries_wickets';

function classifyShiftVerdict(delta: number, isWicket: boolean): {
  tier: EvaluatedBallShiftPoint['verdictTier'];
  label: string;
} {
  if (isWicket || delta <= -2.5) {
    return { tier: 'BOWLING_BREAKTHROUGH', label: 'Bowling Breakthrough' };
  }
  if (delta <= -0.35) {
    return { tier: 'BOWLING_SQUEEZE', label: 'Bowling Pressure Squeeze' };
  }
  if (delta >= 2.5) {
    return { tier: 'BATTING_SURGE', label: 'Batting Momentum Surge' };
  }
  if (delta >= 0.35) {
    return { tier: 'BATTING_EDGE', label: 'Batting Positive Edge' };
  }
  return { tier: 'EQUILIBRIUM', label: 'Tactical Equilibrium' };
}

export const TacticalDecisionEnginePanel: React.FC<TacticalDecisionEnginePanelProps> = ({
  battingTeam,
  bowlingTeam,
  striker,
  bowler,
  events,
  winProbHistory,
  liveWinProb,
  runs,
  wickets,
  legalBalls,
  maxOvers,
  targetRuns,
  inningsNumber,
  stadium,
  surfaceCondition,
  dewActive,
  currentTactics,
  onApplyTactics,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const [chartWidth, setChartWidth] = useState<number>(640);
  const [splineMode, setSplineMode] = useState<SplineMetricMode>('per_ball_shift');
  const [highlightFilter, setHighlightFilter] = useState<EventHighlightFilter>('all');
  const [hoveredPoint, setHoveredPoint] = useState<EvaluatedBallShiftPoint | null>(null);
  const [pinnedStep, setPinnedStep] = useState<number | null>(null);

  // Measure container width responsively
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const measure = () => {
      const w = el.getBoundingClientRect().width;
      if (w > 140) setChartWidth(Math.floor(w));
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Reset pinned step if innings resets
  useEffect(() => {
    if (pinnedStep !== null && pinnedStep > events.length) {
      setPinnedStep(null);
    }
  }, [events.length, pinnedStep]);

  // Evaluate ball-by-ball AI win probability shifts across every delivery bowled
  const evaluatedSeries = useMemo<EvaluatedBallShiftPoint[]>(() => {
    const totalMatchBalls = Math.max(6, maxOvers * 6);
    const startProb = winProbHistory[0] ?? 50;

    // Pre-first-ball calibrated opening-over sensitivity baseline (clearly labeled simulated)
    if (events.length === 0) {
      const strikerEdge = ((striker?.rating || 88) - (bowler?.rating || 88)) * 0.12;
      const condBias =
        surfaceCondition === 'batting_paradise'
          ? 0.45
          : surfaceCondition === 'damp'
          ? -0.45
          : -0.25;
      const aggrScale =
        currentTactics.battingAggression === 'Maximum Risk'
          ? 1.35
          : currentTactics.battingAggression === 'Aggressive'
          ? 1.15
          : currentTactics.battingAggression === 'Anchor'
          ? 0.78
          : 1.0;

      const templateOffsets = [-0.8, 1.4, -0.6, 2.9, 0.5, -1.9];
      let runningCum = 0;
      let runningEma = 0;

      return templateOffsets.map((baseVal, idx) => {
        const delta = Number(((baseVal + strikerEdge + condBias) * aggrScale).toFixed(2));
        runningCum = Number((runningCum + delta).toFixed(2));
        runningEma = idx === 0 ? delta : Number((runningEma * 0.55 + delta * 0.45).toFixed(2));
        const postWp = Math.max(5, Math.min(95, Number((liveWinProb + runningCum).toFixed(1))));
        const { tier, label } = classifyShiftVerdict(delta, false);

        return {
          step: idx + 1,
          ballLabel: `0.${idx + 1}`,
          overFloat: Number(((idx + 1) / 6).toFixed(3)),
          deltaWp: delta,
          rollingEmaDelta: runningEma,
          cumulativeWpa: runningCum,
          postWinProb: postWp,
          leverageIndex: 1.15,
          outcomeToken: delta >= 2.2 ? '4' : delta > 0 ? '1' : '0',
          runsScored: delta >= 2.2 ? 4 : delta > 0 ? 1 : 0,
          isWicket: false,
          isBoundary: delta >= 2.2,
          isSimulatedBaseline: true,
          batterName: striker?.name || 'Striker',
          bowlerName: bowler?.name || 'Opening Bowler',
          deliverySummary: `${currentTactics.bowlingLine} · Pre-Innings Sensitivity`,
          shotName: `${currentTactics.battingAggression} Intent`,
          scoreLabel: 'Projected',
          verdictTier: tier,
          verdictLabel: `${label} (Projected)`,
          tacticalEvaluation: `Simulated opening-over sensitivity model for ${striker?.name || 'Striker'} vs ${bowler?.name || 'Bowler'} under ${currentTactics.battingAggression} intent. Bowl Ball 0.1 to stream live shifts.`,
        };
      });
    }

    const pts: EvaluatedBallShiftPoint[] = [];
    let legalCount = 0;
    let prevProb = startProb;
    let ema = 0;
    let cumulative = 0;

    events.forEach((ev, idx) => {
      if (ev.isLegalDelivery !== false) {
        legalCount += 1;
      }
      const isLast = idx === events.length - 1;
      const rawPostProb = isLast
        ? liveWinProb
        : ev.winProbA ?? winProbHistory[idx + 1] ?? prevProb + (ev.winProbDelta || 0);
      const postProb = Math.max(1, Math.min(99, Number(rawPostProb.toFixed(1))));

      // Compute exact ball shift; if rounding flattened a minor middle-overs ball to 0.0, use engine delta or micro-leverage
      let delta = Number((postProb - prevProb).toFixed(2));
      if (Math.abs(delta) < 0.05) {
        if (ev.winProbDelta && Math.abs(ev.winProbDelta) >= 0.05) {
          delta = Number(ev.winProbDelta.toFixed(2));
        } else {
          const micro = ev.isWicket
            ? -6.4
            : ev.runsScored >= 6
            ? 4.2
            : ev.runsScored === 4
            ? 2.6
            : ev.runsScored >= 2
            ? 0.9
            : ev.runsScored === 1
            ? 0.25
            : -0.55;
          delta = Number(micro.toFixed(2));
        }
      }

      prevProb = postProb;
      cumulative = Number((cumulative + delta).toFixed(2));
      ema = idx === 0 ? delta : Number((ema * 0.55 + delta * 0.45).toFixed(2));

      const phaseProgress = legalCount / totalMatchBalls;
      const wicketPressure = 1 + (ev.isWicket ? 0.65 : wickets * 0.06);
      const deathMultiplier = phaseProgress >= 0.75 ? 1.65 : phaseProgress >= 0.35 ? 1.2 : 1.05;
      const leverageIndex = Number(
        Math.min(3.9, Math.max(1.0, deathMultiplier * wicketPressure)).toFixed(2)
      );

      const isBoundary =
        ev.outcome === '4' || ev.outcome === '6' || (ev.batterRuns ?? ev.runsScored) >= 4;
      const outcomeToken = ev.displayToken || ev.outcome;
      const { tier, label } = classifyShiftVerdict(delta, Boolean(ev.isWicket));

      const batterName = ev.batter?.name || 'Batter';
      const bowlerName = ev.bowler?.name || 'Bowler';
      const speedStr = ev.speedKmh ? `${ev.speedKmh.toFixed(1)} km/h` : 'Live';
      const deliverySummary = `${speedStr} · ${ev.length || 'Good Length'}`;

      const tacticalEvaluation = ev.aiExplanation
        ? `${ev.aiExplanation} (${leverageIndex}x leverage)`
        : ev.isWicket
        ? `${bowlerName} executed a ${ev.length.toLowerCase()} breakthrough (${speedStr}), dismissing ${batterName} via ${ev.wicketType || 'wicket'} for a ${delta}% probability swing.`
        : isBoundary
        ? `${batterName} capitalized on ${bowlerName}'s ${ev.length.toLowerCase()} delivery with a ${ev.shot || 'boundary stroke'}, driving a +${Math.abs(delta).toFixed(1)}% shift (${leverageIndex}x leverage).`
        : ev.runsScored === 0
        ? `Dot-ball squeeze by ${bowlerName} (${speedStr} ${ev.length.toLowerCase()}) compressed scoring rate and shifted win probability ${delta > 0 ? `+${delta}` : delta}%.`
        : `Controlled strike rotation (${ev.runsScored} run${ev.runsScored > 1 ? 's' : ''}) via ${ev.shot || 'placement'} nudged win expectancy by ${delta > 0 ? `+${delta}` : delta}%.`;

      pts.push({
        step: idx + 1,
        ballLabel: `${ev.overNumber}.${ev.ballInOver}`,
        overFloat: Number((legalCount / 6).toFixed(3)),
        deltaWp: delta,
        rollingEmaDelta: ema,
        cumulativeWpa: cumulative,
        postWinProb: postProb,
        leverageIndex,
        outcomeToken,
        runsScored: ev.runsScored,
        isWicket: Boolean(ev.isWicket),
        isBoundary,
        isSimulatedBaseline: false,
        batterName,
        bowlerName,
        deliverySummary,
        shotName: ev.shot || 'Tactical Stroke',
        scoreLabel: ev.scoreAtBall || `${runs}/${wickets}`,
        verdictTier: tier,
        verdictLabel: label,
        tacticalEvaluation,
      });
    });

    return pts;
  }, [
    events,
    winProbHistory,
    liveWinProb,
    maxOvers,
    striker,
    bowler,
    surfaceCondition,
    currentTactics.battingAggression,
    currentTactics.bowlingLine,
    wickets,
    runs,
  ]);

  // AI Tactical Decision Engine: Live Next-Ball Recommendation & Expected WP Shift
  const tacticalRecommendation = useMemo(() => {
    const totalBalls = Math.max(6, maxOvers * 6);
    const ballsRem = Math.max(0, totalBalls - legalBalls);
    const oversFloat = legalBalls / 6;
    const isPowerplay = oversFloat < Math.min(6, maxOvers * 0.3);
    const isDeath = oversFloat >= Math.max(1, maxOvers - 5);
    const crr = legalBalls > 0 ? (runs / legalBalls) * 6 : 8.0;
    const rrr =
      inningsNumber >= 2 && targetRuns > 0 && ballsRem > 0
        ? (Math.max(0, targetRuns - runs) / ballsRem) * 6
        : (stadium.avgFirstInningsScore || 178) / maxOvers;

    const recentLive = evaluatedSeries.filter((p) => !p.isSimulatedBaseline).slice(-6);
    const recentNetSwing = recentLive.reduce((acc, p) => acc + p.deltaWp, 0);
    const recentWickets = recentLive.filter((p) => p.isWicket).length;

    let recBatting: BattingAggressionMode = 'Balanced';
    let recBowling: BowlingLineMode = 'Stump-to-stump';
    let recField: FieldPresetMode = 'Balanced Ring';
    let rationale = '';
    let expectedShift = '+1.8%';

    if (wickets >= 7 || (recentWickets >= 2 && rrr < 11.5)) {
      recBatting = 'Anchor';
      recBowling = surfaceCondition === 'damp' ? 'Stump-to-stump' : 'Hard Deck Bouncer';
      recField = 'Aggressive Slips';
      expectedShift = '+2.4% Wicket Preservation';
      rationale = `High dismissal cluster (${wickets} down). Rebuilding crease stability cuts tail exposure while bowling side presses with attacking slips.`;
    } else if (isDeath || rrr >= 11.2) {
      recBatting = rrr >= 13.2 && wickets <= 6 ? 'Maximum Risk' : 'Aggressive';
      recBowling = dewActive ? 'Wide Yorker' : 'Slower Variation';
      recField = 'Deep Boundary Defense';
      expectedShift =
        recBatting === 'Maximum Risk' ? '+3.6% Boundary EV' : '+2.7% Death Leverage';
      rationale = `${isDeath ? 'Death-overs leverage window' : `Elevated ${rrr.toFixed(1)} RRR`} (${ballsRem}b left). Target boundary pockets vs ${dewActive ? 'wide yorkers in dew' : 'cutter variations'}.`;
    } else if (isPowerplay) {
      recBatting = wickets <= 1 ? 'Aggressive' : 'Balanced';
      recBowling =
        surfaceCondition === 'damp' || (stadium.paceWicketPercent ?? 55) >= 60
          ? 'Stump-to-stump'
          : 'Hard Deck Bouncer';
      recField = wickets >= 1 ? 'Aggressive Slips' : 'Balanced Ring';
      expectedShift = '+2.2% Powerplay Swing';
      rationale = `Fielding restrictions active (${oversFloat.toFixed(1)} ov). Lofting over the 30-yard ring maximizes positive ΔWP while seamers hunt early movement.`;
    } else {
      recBatting = crr < rrr - 1.0 ? 'Aggressive' : 'Balanced';
      recBowling =
        surfaceCondition === 'dusty' ? 'Stump-to-stump' : 'Slower Variation';
      recField = recentNetSwing >= 4 ? 'Deep Boundary Defense' : 'Balanced Ring';
      expectedShift = '+1.9% Middle-Phase Edge';
      rationale = `Middle-overs consolidation (6-ball ΔWP ${recentNetSwing >= 0 ? `+${recentNetSwing.toFixed(1)}%` : `${recentNetSwing.toFixed(1)}%`}). Rotate strike cleanly and punish loose lengths.`;
    }

    const isAlreadySynced =
      currentTactics.battingAggression === recBatting &&
      currentTactics.bowlingLine === recBowling &&
      currentTactics.fieldPreset === recField;

    return {
      recommended: {
        battingAggression: recBatting,
        bowlingLine: recBowling,
        fieldPreset: recField,
      },
      rationale,
      expectedShift,
      recentNetSwing: Number(recentNetSwing.toFixed(1)),
      isAlreadySynced,
    };
  }, [
    maxOvers,
    legalBalls,
    runs,
    inningsNumber,
    targetRuns,
    stadium.avgFirstInningsScore,
    stadium.paceWicketPercent,
    evaluatedSeries,
    wickets,
    dewActive,
    surfaceCondition,
    currentTactics,
  ]);

  // Aggregate summary metrics across evaluated deliveries
  const shiftMetrics = useMemo(() => {
    const livePts = evaluatedSeries.filter((p) => !p.isSimulatedBaseline);
    const activePool = livePts.length > 0 ? livePts : evaluatedSeries;
    const positiveBalls = activePool.filter((p) => p.deltaWp > 0.15).length;
    const negativeBalls = activePool.filter((p) => p.deltaWp < -0.15).length;
    const maxPositive = activePool.reduce<EvaluatedBallShiftPoint | null>(
      (best, p) => (!best || p.deltaWp > best.deltaWp ? p : best),
      null
    );
    const maxNegative = activePool.reduce<EvaluatedBallShiftPoint | null>(
      (best, p) => (!best || p.deltaWp < best.deltaWp ? p : best),
      null
    );
    const avgLeverage =
      activePool.reduce((acc, p) => acc + p.leverageIndex, 0) /
      Math.max(1, activePool.length);

    return {
      positiveBalls,
      negativeBalls,
      maxPositive,
      maxNegative,
      avgLeverage: avgLeverage.toFixed(2),
      isBaselineOnly: livePts.length === 0,
    };
  }, [evaluatedSeries]);

  const activeInspectedPoint = useMemo<EvaluatedBallShiftPoint>(() => {
    if (hoveredPoint) return hoveredPoint;
    if (pinnedStep !== null) {
      const found = evaluatedSeries.find((p) => p.step === pinnedStep);
      if (found) return found;
    }
    return evaluatedSeries[evaluatedSeries.length - 1];
  }, [hoveredPoint, pinnedStep, evaluatedSeries]);

  const chartHeight = 232;

  // Render Real-Time D3 Catmull-Rom Spline Chart
  useEffect(() => {
    const svgEl = svgRef.current;
    if (!svgEl || evaluatedSeries.length === 0) return;

    const svg = d3.select(svgEl);
    svg.selectAll('*').remove();

    const margin = { top: 18, right: 20, bottom: 30, left: 44 };
    const innerW = Math.max(120, chartWidth - margin.left - margin.right);
    const innerH = Math.max(90, chartHeight - margin.top - margin.bottom);

    const n = evaluatedSeries.length;
    const xScale = d3
      .scaleLinear()
      .domain([1, Math.max(6, n)])
      .range([0, innerW]);

    const values = evaluatedSeries.map((d) =>
      splineMode === 'per_ball_shift' ? d.deltaWp : d.cumulativeWpa
    );
    const maxAbs = Math.max(
      splineMode === 'per_ball_shift' ? 6 : 10,
      d3.max(values, (v) => Math.abs(v)) || 6
    );
    const yBound = Math.ceil(maxAbs * 1.18);

    const yScale = d3
      .scaleLinear()
      .domain([-yBound, yBound])
      .range([innerH, 0]);

    const zeroY = yScale(0);
    const uid = `tde-${inningsNumber}-${splineMode}`;
    const defs = svg.append('defs');

    // Positive Shift Gradient (Above 0% - Batting Surge Emerald/Cyan)
    const posGrad = defs
      .append('linearGradient')
      .attr('id', `${uid}-pos-grad`)
      .attr('x1', '0%')
      .attr('y1', '0%')
      .attr('x2', '0%')
      .attr('y2', '100%');
    posGrad.append('stop').attr('offset', '0%').attr('stop-color', '#10b981').attr('stop-opacity', 0.36);
    posGrad.append('stop').attr('offset', '100%').attr('stop-color', '#22d3ee').attr('stop-opacity', 0.02);

    // Negative Shift Gradient (Below 0% - Bowling Squeeze Amber/Rose)
    const negGrad = defs
      .append('linearGradient')
      .attr('id', `${uid}-neg-grad`)
      .attr('x1', '0%')
      .attr('y1', '0%')
      .attr('x2', '0%')
      .attr('y2', '100%');
    negGrad.append('stop').attr('offset', '0%').attr('stop-color', '#f59e0b').attr('stop-opacity', 0.02);
    negGrad.append('stop').attr('offset', '100%').attr('stop-color', '#f43f5e').attr('stop-opacity', 0.36);

    // Clip above & below y = 0 equilibrium
    defs
      .append('clipPath')
      .attr('id', `${uid}-clip-pos`)
      .append('rect')
      .attr('x', 0)
      .attr('y', 0)
      .attr('width', innerW)
      .attr('height', Math.max(0, zeroY));

    defs
      .append('clipPath')
      .attr('id', `${uid}-clip-neg`)
      .append('rect')
      .attr('x', 0)
      .attr('y', zeroY)
      .attr('width', innerW)
      .attr('height', Math.max(0, innerH - zeroY));

    const root = svg
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    // Subtle polar zone labels inside canvas corners
    root
      .append('text')
      .attr('x', 6)
      .attr('y', 11)
      .attr('fill', '#34d399')
      .attr('fill-opacity', 0.75)
      .attr('font-size', '9px')
      .attr('font-weight', '600')
      .text(`${battingTeam.shortName} Positive Shift (+ΔWP%)`);

    root
      .append('text')
      .attr('x', 6)
      .attr('y', innerH - 5)
      .attr('fill', '#fb7185')
      .attr('fill-opacity', 0.75)
      .attr('font-size', '9px')
      .attr('font-weight', '600')
      .text(`${bowlingTeam.shortName} Bowling Squeeze (-ΔWP%)`);

    // Horizontal reference grid lines (-yBound/2, 0, +yBound/2)
    const halfTick = Math.round((yBound / 2) * 10) / 10;
    [-yBound, -halfTick, 0, halfTick, yBound].forEach((tickVal) => {
      const isZero = tickVal === 0;
      root
        .append('line')
        .attr('x1', 0)
        .attr('x2', innerW)
        .attr('y1', yScale(tickVal))
        .attr('y2', yScale(tickVal))
        .attr('stroke', isZero ? '#64748b' : '#1e293b')
        .attr('stroke-width', isZero ? 1.35 : 0.9)
        .attr('stroke-dasharray', isZero ? '5 3' : '2 3');
    });

    // Over boundary vertical guide lines every 6 balls (or 12 balls for long innings)
    const stepInterval = n > 48 ? 12 : 6;
    for (let s = stepInterval; s <= Math.max(6, n); s += stepInterval) {
      root
        .append('line')
        .attr('x1', xScale(s))
        .attr('x2', xScale(s))
        .attr('y1', 0)
        .attr('y2', innerH)
        .attr('stroke', '#1e293b')
        .attr('stroke-width', 0.9)
        .attr('stroke-dasharray', '3 3');
    }

    // D3 X & Y Axes
    const tickCount = Math.min(8, Math.max(3, n));
    const xAxis = d3
      .axisBottom(xScale)
      .ticks(tickCount)
      .tickFormat((d) => {
        const idx = Math.round(Number(d)) - 1;
        const pt = evaluatedSeries[idx];
        return pt ? `${pt.ballLabel}` : `${Number(d)}`;
      });

    const yAxis = d3
      .axisLeft(yScale)
      .tickValues([-yBound, -halfTick, 0, halfTick, yBound])
      .tickFormat((d) => {
        const num = Number(d);
        return num > 0 ? `+${num}%` : `${num}%`;
      });

    const gx = root
      .append('g')
      .attr('transform', `translate(0,${innerH})`)
      .call(xAxis);
    gx.selectAll('text')
      .attr('fill', '#94a3b8')
      .attr('font-family', 'JetBrains Mono, monospace')
      .attr('font-size', '9px');
    gx.selectAll('line, path').attr('stroke', '#334155');

    const gy = root.append('g').call(yAxis);
    gy.selectAll('text')
      .attr('fill', '#94a3b8')
      .attr('font-family', 'JetBrains Mono, monospace')
      .attr('font-size', '9px');
    gy.selectAll('line, path').attr('stroke', '#334155');

    const getVal = (d: EvaluatedBallShiftPoint) =>
      splineMode === 'per_ball_shift' ? d.deltaWp : d.cumulativeWpa;

    // Centripetal Catmull-Rom Spline Generators (smooth curves with zero self-intersection)
    const splineArea = d3
      .area<EvaluatedBallShiftPoint>()
      .x((d) => xScale(d.step))
      .y0(zeroY)
      .y1((d) => yScale(getVal(d)))
      .curve(d3.curveCatmullRom.alpha(0.5));

    const splineLine = d3
      .line<EvaluatedBallShiftPoint>()
      .x((d) => xScale(d.step))
      .y((d) => yScale(getVal(d)))
      .curve(d3.curveCatmullRom.alpha(0.5));

    const emaSplineLine = d3
      .line<EvaluatedBallShiftPoint>()
      .x((d) => xScale(d.step))
      .y((d) => yScale(d.rollingEmaDelta))
      .curve(d3.curveCatmullRom.alpha(0.5));

    if (evaluatedSeries.length >= 2) {
      root
        .append('path')
        .datum(evaluatedSeries)
        .attr('clip-path', `url(#${uid}-clip-pos)`)
        .attr('fill', `url(#${uid}-pos-grad)`)
        .attr('d', splineArea);

      root
        .append('path')
        .datum(evaluatedSeries)
        .attr('clip-path', `url(#${uid}-clip-neg)`)
        .attr('fill', `url(#${uid}-neg-grad)`)
        .attr('d', splineArea);

      // 3-Ball Rolling Tactical EMA Spline in Per-Ball Shift Mode
      if (splineMode === 'per_ball_shift') {
        root
          .append('path')
          .datum(evaluatedSeries)
          .attr('fill', 'none')
          .attr('stroke', '#a78bfa')
          .attr('stroke-width', 1.5)
          .attr('stroke-dasharray', '4 3')
          .attr('stroke-opacity', 0.85)
          .attr('d', emaSplineLine);
      }

      // Primary Real-Time D3 Spline Curve
      root
        .append('path')
        .datum(evaluatedSeries)
        .attr('fill', 'none')
        .attr('stroke', shiftMetrics.isBaselineOnly ? '#38bdf8' : '#22d3ee')
        .attr('stroke-width', 2.35)
        .attr('stroke-dasharray', shiftMetrics.isBaselineOnly ? '6 4' : null)
        .attr('d', splineLine);
    } else if (evaluatedSeries.length === 1) {
      const only = evaluatedSeries[0];
      const cx = xScale(only.step);
      const cy = yScale(getVal(only));
      root
        .append('line')
        .attr('x1', cx)
        .attr('x2', cx)
        .attr('y1', zeroY)
        .attr('y2', cy)
        .attr('stroke', getVal(only) >= 0 ? '#34d399' : '#fb7185')
        .attr('stroke-width', 2.5);
    }

    // Filtered Delivery Nodes along the D3 Spline
    const visibleNodes = evaluatedSeries.filter((pt, idx) => {
      if (idx === evaluatedSeries.length - 1 || pt.step === pinnedStep) return true;
      if (highlightFilter === 'pivotal') return Math.abs(pt.deltaWp) >= 2.0 || pt.isWicket;
      if (highlightFilter === 'boundaries_wickets') return pt.isBoundary || pt.isWicket;
      return evaluatedSeries.length <= 36 || pt.isWicket || pt.isBoundary || Math.abs(pt.deltaWp) >= 1.8;
    });

    root
      .selectAll('.tde-spline-node')
      .data(visibleNodes)
      .enter()
      .append('circle')
      .attr('class', 'tde-spline-node')
      .attr('cx', (d) => xScale(d.step))
      .attr('cy', (d) => yScale(getVal(d)))
      .attr('r', (d) =>
        d.step === pinnedStep
          ? 5.4
          : d.isWicket
          ? 4.6
          : d.isBoundary
          ? 4.1
          : 3.1
      )
      .attr('fill', (d) =>
        d.isWicket
          ? '#fb7185'
          : d.isBoundary
          ? '#34d399'
          : d.deltaWp >= 0
          ? '#38bdf8'
          : '#f59e0b'
      )
      .attr('stroke', (d) => (d.step === pinnedStep ? '#ffffff' : '#020617'))
      .attr('stroke-width', (d) => (d.step === pinnedStep ? 2 : 1.4));

    // Interactive Crosshair Probe
    const focusGroup = root.append('g').style('display', 'none');
    const vHairline = focusGroup
      .append('line')
      .attr('y1', 0)
      .attr('y2', innerH)
      .attr('stroke', '#94a3b8')
      .attr('stroke-width', 1)
      .attr('stroke-dasharray', '3 3');

    const hHairline = focusGroup
      .append('line')
      .attr('x1', 0)
      .attr('x2', innerW)
      .attr('stroke', '#64748b')
      .attr('stroke-width', 0.8)
      .attr('stroke-dasharray', '2 3');

    const focusRing = focusGroup
      .append('circle')
      .attr('r', 5.5)
      .attr('fill', '#ffffff')
      .attr('stroke', '#22d3ee')
      .attr('stroke-width', 2);

    const bisectStep = d3.bisector<EvaluatedBallShiftPoint, number>((d) => d.step).left;

    const resolveClosestPoint = (mx: number): EvaluatedBallShiftPoint => {
      const targetStep = xScale.invert(mx);
      const i = bisectStep(evaluatedSeries, targetStep, 1);
      const d0 = evaluatedSeries[Math.max(0, i - 1)];
      const d1 = evaluatedSeries[i];
      if (!d1) return d0;
      return Math.abs(targetStep - d0.step) <= Math.abs(d1.step - targetStep) ? d0 : d1;
    };

    root
      .append('rect')
      .attr('width', innerW)
      .attr('height', innerH)
      .attr('fill', 'transparent')
      .style('cursor', 'crosshair')
      .on('mousemove', (event) => {
        const [mx] = d3.pointer(event);
        const chosen = resolveClosestPoint(mx);
        const cx = xScale(chosen.step);
        const cy = yScale(getVal(chosen));
        focusGroup.style('display', null);
        vHairline.attr('x1', cx).attr('x2', cx);
        hHairline.attr('y1', cy).attr('y2', cy);
        focusRing.attr('cx', cx).attr('cy', cy);
        setHoveredPoint(chosen);
      })
      .on('mouseleave', () => {
        focusGroup.style('display', 'none');
        setHoveredPoint(null);
      })
      .on('click', (event) => {
        const [mx] = d3.pointer(event);
        const chosen = resolveClosestPoint(mx);
        cricketAudio.playUiClick();
        setPinnedStep((prev) => (prev === chosen.step ? null : chosen.step));
      });
  }, [
    evaluatedSeries,
    chartWidth,
    chartHeight,
    splineMode,
    highlightFilter,
    pinnedStep,
    inningsNumber,
    battingTeam.shortName,
    bowlingTeam.shortName,
    shiftMetrics.isBaselineOnly,
  ]);

  const recentEvaluatedBalls = useMemo(
    () => evaluatedSeries.slice(-8).reverse(),
    [evaluatedSeries]
  );

  return (
    <section
      id="tactical-decision-engine-panel"
      aria-label="Tactical Decision Engine Win Probability Shifts"
      className="pitch-ui-sans rounded-2xl border border-slate-800 bg-slate-950/95 p-4 sm:p-5 space-y-4"
    >
      {/* Panel Header & Spline Controls */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3 border-b border-slate-800/90 pb-3.5">
        <div className="space-y-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
            <Crosshair className="h-3.5 w-3.5 text-cyan-400 shrink-0" />
            <span className="font-heading font-bold text-white text-sm">
              Tactical Decision Engine
            </span>
            <span aria-hidden="true">·</span>
            <span>Innings {inningsNumber}</span>
            <span aria-hidden="true">·</span>
            <span className="font-mono tabular-nums text-cyan-300">
              {shiftMetrics.isBaselineOnly
                ? 'Simulated Opening Baseline'
                : `${events.length} Balls Evaluated`}
            </span>
            <span aria-hidden="true">·</span>
            <span>
              Avg Leverage{' '}
              <strong className="font-mono tabular-nums text-slate-200">
                {shiftMetrics.avgLeverage}x
              </strong>
            </span>
          </div>
          <p className="text-xs text-slate-400">
            Evaluates ball-by-ball win probability shifts (ΔWP%) and recommends live tactical adjustments via real-time D3 Catmull-Rom spline interpolation.
          </p>
        </div>

        {/* Interactive Spline Mode & Node Filter Controls */}
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <div
            role="group"
            aria-label="Spline Chart Metric Mode"
            className="inline-flex items-center rounded-xl border border-slate-800 bg-slate-900 p-1 text-[11px]"
          >
            <button
              type="button"
              onClick={() => {
                cricketAudio.playUiClick();
                setSplineMode('per_ball_shift');
              }}
              className={`px-2.5 py-1 rounded-lg font-semibold transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                splineMode === 'per_ball_shift'
                  ? 'bg-cyan-500 text-slate-950 font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Ball Shift (ΔWP%)
            </button>
            <button
              type="button"
              onClick={() => {
                cricketAudio.playUiClick();
                setSplineMode('cumulative_wpa');
              }}
              className={`px-2.5 py-1 rounded-lg font-semibold transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                splineMode === 'cumulative_wpa'
                  ? 'bg-emerald-400 text-slate-950 font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Cumulative WPA
            </button>
          </div>

          <div
            role="group"
            aria-label="Filter Spline Nodes"
            className="inline-flex items-center rounded-xl border border-slate-800 bg-slate-900 p-1 text-[11px]"
          >
            {(
              [
                { id: 'all', label: 'All' },
                { id: 'pivotal', label: 'Swings ≥2%' },
                { id: 'boundaries_wickets', label: '4/6 & W' },
              ] as const
            ).map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => {
                  cricketAudio.playUiClick();
                  setHighlightFilter(opt.id);
                }}
                className={`px-2 py-1 rounded-lg font-semibold transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                  highlightFilter === opt.id
                    ? 'bg-slate-800 text-cyan-300 font-bold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {pinnedStep !== null && (
            <button
              type="button"
              onClick={() => {
                cricketAudio.playUiClick();
                setPinnedStep(null);
              }}
              className="inline-flex items-center gap-1 rounded-xl border border-cyan-500/40 bg-cyan-950/40 px-2.5 py-1.5 text-[11px] font-semibold text-cyan-300 hover:text-white transition-colors cursor-pointer whitespace-nowrap shrink-0"
            >
              <RotateCcw className="h-3 w-3" />
              <span>Follow Live</span>
            </button>
          )}
        </div>
      </div>

      {/* Spline Legend Row */}
      <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-400">
        <div className="flex flex-wrap items-center gap-3">
          <span className="inline-flex items-center gap-1.5 text-slate-300">
            <span className="h-0.5 w-4 bg-cyan-400 inline-block" />
            <span>
              {splineMode === 'per_ball_shift' ? 'Ball ΔWP% Spline' : 'Cumulative WPA% Spline'}
            </span>
          </span>
          {splineMode === 'per_ball_shift' && (
            <span className="inline-flex items-center gap-1.5 text-violet-300">
              <span className="h-0.5 w-4 border-t-2 border-dashed border-violet-400 inline-block" />
              <span>3-Ball Rolling Drift</span>
            </span>
          )}
          <span className="inline-flex items-center gap-1.5 text-emerald-300">
            <span className="h-2 w-2 rounded-full bg-emerald-400 inline-block" />
            <span>Boundary Surge</span>
          </span>
          <span className="inline-flex items-center gap-1.5 text-rose-300">
            <span className="h-2 w-2 rounded-full bg-rose-400 inline-block" />
            <span>Wicket Shock</span>
          </span>
        </div>

        <div className="flex items-center gap-2 font-mono tabular-nums">
          <span className="inline-flex items-center gap-1 text-emerald-300">
            <TeamFlag code={battingTeam.id} size="xs" />
            <span>+{shiftMetrics.positiveBalls}b</span>
          </span>
          <span className="text-slate-600">·</span>
          <span className="inline-flex items-center gap-1 text-amber-300">
            <span>-{shiftMetrics.negativeBalls}b</span>
            <TeamFlag code={bowlingTeam.id} size="xs" />
          </span>
        </div>
      </div>

      {/* Real-Time D3 Spline SVG Stage */}
      <div ref={containerRef} className="w-full overflow-hidden rounded-xl border border-slate-800/80 bg-slate-900/45 py-1">
        <svg
          ref={svgRef}
          width={chartWidth}
          height={chartHeight}
          className="w-full block select-none"
          role="img"
          aria-label="Real-time D3 spline chart of ball-by-ball AI win probability shifts"
        />
      </div>

      {/* Inspected Delivery Tactical Breakdown + Pivotal Swings */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5 pt-0.5">
        {/* Left 7 Cols: Active / Inspected Ball AI Evaluation */}
        <div className="lg:col-span-7 rounded-xl border border-slate-800/90 bg-slate-900/55 p-3.5 space-y-2.5">
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex flex-wrap items-center gap-2 min-w-0">
              <span className="font-mono tabular-nums font-bold text-cyan-300">
                {activeInspectedPoint.ballLabel} ov
              </span>
              <span aria-hidden="true" className="text-slate-600">
                ·
              </span>
              <span className="font-semibold text-white truncate">
                {activeInspectedPoint.bowlerName} to {activeInspectedPoint.batterName}
              </span>
              <span aria-hidden="true" className="text-slate-600">
                ·
              </span>
              <span className="text-slate-400">{activeInspectedPoint.deliverySummary}</span>
            </div>

            <span
              className={`font-mono tabular-nums text-xs font-bold inline-flex items-center gap-0.5 shrink-0 ${
                activeInspectedPoint.deltaWp > 0
                  ? 'text-emerald-400'
                  : activeInspectedPoint.deltaWp < 0
                  ? 'text-rose-400'
                  : 'text-slate-300'
              }`}
            >
              {activeInspectedPoint.deltaWp >= 0 ? (
                <ArrowUpRight className="h-3.5 w-3.5" />
              ) : (
                <ArrowDownRight className="h-3.5 w-3.5" />
              )}
              <span>
                {activeInspectedPoint.deltaWp > 0
                  ? `+${activeInspectedPoint.deltaWp}%`
                  : `${activeInspectedPoint.deltaWp}%`}{' '}
                ({activeInspectedPoint.outcomeToken})
              </span>
            </span>
          </div>

          <p className="text-xs text-slate-300 leading-relaxed">
            {activeInspectedPoint.tacticalEvaluation}
          </p>

          <div className="flex flex-wrap items-center justify-between gap-2 pt-1.5 border-t border-slate-800/80 text-[11px] text-slate-400">
            <span>
              Verdict:{' '}
              <strong
                className={
                  activeInspectedPoint.deltaWp >= 0.35
                    ? 'text-emerald-300'
                    : activeInspectedPoint.deltaWp <= -0.35
                    ? 'text-rose-300'
                    : 'text-slate-200'
                }
              >
                {activeInspectedPoint.verdictLabel}
              </strong>
            </span>
            <span>
              Rolling 3b Drift:{' '}
              <strong className="font-mono tabular-nums text-violet-300">
                {activeInspectedPoint.rollingEmaDelta > 0
                  ? `+${activeInspectedPoint.rollingEmaDelta}%`
                  : `${activeInspectedPoint.rollingEmaDelta}%`}
              </strong>
            </span>
            <span>
              Post-Ball Win %:{' '}
              <strong className="font-mono tabular-nums text-white">
                {activeInspectedPoint.postWinProb}%
              </strong>
            </span>
          </div>
        </div>

        {/* Right 5 Cols: Live Tactical Directive & 1-Click Execution */}
        <div className="lg:col-span-5 rounded-xl border border-slate-800/90 bg-slate-900/55 p-3.5 flex flex-col justify-between gap-3">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between gap-2 text-xs">
              <span className="inline-flex items-center gap-1.5 font-heading font-bold text-white">
                <Sliders className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                <span>Recommended Tactical Shift</span>
              </span>
              <span className="font-mono tabular-nums text-[11px] font-semibold text-emerald-300">
                {tacticalRecommendation.expectedShift}
              </span>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed">
              {tacticalRecommendation.rationale}
            </p>

            <div className="text-[11px] text-slate-300 pt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1">
              <span>
                Bat: <strong className="text-cyan-300">{tacticalRecommendation.recommended.battingAggression}</strong>
              </span>
              <span aria-hidden="true" className="text-slate-600">·</span>
              <span>
                Bowl: <strong className="text-amber-300">{tacticalRecommendation.recommended.bowlingLine}</strong>
              </span>
              <span aria-hidden="true" className="text-slate-600">·</span>
              <span>
                Field: <strong className="text-slate-100">{tacticalRecommendation.recommended.fieldPreset}</strong>
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              cricketAudio.playUiClick();
              onApplyTactics(tacticalRecommendation.recommended);
            }}
            disabled={tacticalRecommendation.isAlreadySynced}
            className={`w-full rounded-xl py-2 px-4 text-xs font-bold transition-colors inline-flex items-center justify-center gap-1.5 whitespace-nowrap cursor-pointer ${
              tacticalRecommendation.isAlreadySynced
                ? 'border border-emerald-500/40 bg-emerald-950/30 text-emerald-300 cursor-default'
                : 'bg-cyan-500 text-slate-950 hover:bg-cyan-400'
            }`}
          >
            {tacticalRecommendation.isAlreadySynced ? (
              <>
                <Check className="h-3.5 w-3.5" />
                <span>Optimal Tactics Active</span>
              </>
            ) : (
              <>
                <Zap className="h-3.5 w-3.5" />
                <span>Apply Recommended Tactics</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Ball-by-Ball Shift Selector Strip (Click any delivery to pin on D3 spline) */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-800/80 text-[11px]">
        <div className="flex items-center gap-2 text-slate-400">
          <Activity className="h-3.5 w-3.5 text-cyan-400 shrink-0" />
          <span>Recent Ball Shifts (click to inspect on spline):</span>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {recentEvaluatedBalls.map((pt) => {
            const isPinned = pinnedStep === pt.step;
            return (
              <button
                key={`tde-chip-${pt.step}-${pt.ballLabel}`}
                type="button"
                onClick={() => {
                  cricketAudio.playUiClick();
                  setPinnedStep((prev) => (prev === pt.step ? null : pt.step));
                }}
                className={`rounded-lg border px-2 py-1 font-mono tabular-nums text-[11px] transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                  isPinned
                    ? 'border-cyan-400 bg-cyan-950/50 text-white font-bold'
                    : pt.isWicket
                    ? 'border-rose-500/40 bg-rose-950/25 text-rose-300 hover:border-rose-400'
                    : pt.deltaWp >= 2.0
                    ? 'border-emerald-500/35 bg-emerald-950/20 text-emerald-300 hover:border-emerald-400'
                    : 'border-slate-800 bg-slate-900/80 text-slate-300 hover:border-slate-700 hover:text-white'
                }`}
              >
                {pt.ballLabel}{' '}
                <span className={pt.deltaWp >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                  {pt.deltaWp > 0 ? `+${pt.deltaWp}%` : `${pt.deltaWp}%`}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
};
