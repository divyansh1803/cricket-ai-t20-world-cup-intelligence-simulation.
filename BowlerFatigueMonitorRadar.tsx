import React, { useMemo, useState } from 'react';
import {
  ChevronDown,
  Gauge,
  RotateCcw,
  TrendingDown,
} from 'lucide-react';
import { Stadium } from '../../types/cricket';
import { cricketAudio } from '../../utils/audioSystem';
import type { PitchDelivery } from './ShotMapPitch';

export interface BowlerRadarAxisMetric {
  id:
    | 'pace_retention'
    | 'line_accuracy'
    | 'length_accuracy'
    | 'overs_stamina'
    | 'release_consistency'
    | 'dot_pressure';
  shortLabel: string;
  fullTitle: string;
  angleDeg: number;
  currentScore: number; // 0..100
  freshBaselineScore: number; // 0..100
  unitDetail: string;
  correlationNote: string;
}

interface BowlerFatigueMonitorRadarProps {
  deliveries: PitchDelivery[];
  activeDelivery: PitchDelivery | null;
  liveBallsSimulated: number;
  venue: Stadium;
}

interface BowlerGroupSummary {
  key: string;
  name: string;
  style: 'Seam' | 'Spin';
  deliveries: PitchDelivery[];
}

function isSpinBall(d: PitchDelivery): boolean {
  if (d.bowlerType) return d.bowlerType === 'spin';
  return d.speedKmh < 116;
}

function formatCricketOversFromBalls(balls: number): string {
  const full = Math.floor(balls / 6);
  const rem = balls % 6;
  return `${full}.${rem}`;
}

export const BowlerFatigueMonitorRadar: React.FC<BowlerFatigueMonitorRadarProps> = ({
  deliveries,
  activeDelivery,
  liveBallsSimulated,
  venue,
}) => {
  const [selectedBowlerKey, setSelectedBowlerKey] = useState<string>('__AUTO__');
  const [simulatedExtraOvers, setSimulatedExtraOvers] = useState<number>(0);
  const [selectedAxisId, setSelectedAxisId] = useState<BowlerRadarAxisMetric['id']>(
    'pace_retention'
  );

  // Build available bowlers from the active spell / match-to-date delivery pool
  const bowlerGroups = useMemo<BowlerGroupSummary[]>(() => {
    const map = new Map<string, PitchDelivery[]>();
    deliveries.forEach((d) => {
      const name = (d.bowlerName || '').trim() || (isSpinBall(d) ? 'Lead Spinner' : 'Lead Seamer');
      const existing = map.get(name) || [];
      existing.push(d);
      map.set(name, existing);
    });

    const groups: BowlerGroupSummary[] = Array.from(map.entries())
      .map(([name, list]) => {
        const spinCount = list.filter((b) => isSpinBall(b)).length;
        return {
          key: name,
          name,
          style: spinCount > list.length / 2 ? ('Spin' as const) : ('Seam' as const),
          deliveries: list,
        };
      })
      .sort((a, b) => b.deliveries.length - a.deliveries.length);

    return groups;
  }, [deliveries]);

  // Resolve focused bowler (auto-tracks active ball's bowler or lead spell bowler, or manual selection)
  const focusedBowler = useMemo<BowlerGroupSummary>(() => {
    if (selectedBowlerKey === '__ALL__' && deliveries.length > 0) {
      const spinCount = deliveries.filter((b) => isSpinBall(b)).length;
      return {
        key: '__ALL__',
        name: 'Combined Attack',
        style: spinCount > deliveries.length / 2 ? 'Spin' : 'Seam',
        deliveries,
      };
    }

    if (selectedBowlerKey !== '__AUTO__') {
      const found = bowlerGroups.find((g) => g.key === selectedBowlerKey);
      if (found) return found;
    }

    if (activeDelivery?.bowlerName) {
      const activeGroup = bowlerGroups.find((g) => g.key === activeDelivery.bowlerName);
      if (activeGroup) return activeGroup;
    }

    if (bowlerGroups.length > 0) {
      return bowlerGroups[0];
    }

    return {
      key: 'default-seamer',
      name: 'Lead Seamer',
      style: 'Seam',
      deliveries,
    };
  }, [selectedBowlerKey, bowlerGroups, activeDelivery, deliveries]);

  // Compute correlated speed degradation, line/length accuracy & fatigue radar metrics against total overs delivered
  const fatigueTelemetry = useMemo(() => {
    const balls = focusedBowler.deliveries;
    const isSpin = focusedBowler.style === 'Spin';
    const sampleSize = Math.max(1, balls.length);

    // Determine effective spell balls: exact live count in simulator, or contextual spell workload in standalone over view
    let maxParsedOver = 1;
    balls.forEach((b) => {
      const parsed = parseInt(String(b.ballNumber).split('.')[0], 10);
      if (!Number.isNaN(parsed) && parsed + 1 > maxParsedOver) {
        maxParsedOver = parsed + 1;
      }
    });

    const baseSpellBalls =
      liveBallsSimulated > 0
        ? balls.length
        : Math.max(
            balls.length,
            maxParsedOver >= 16 ? 18 : maxParsedOver >= 10 ? 12 : Math.max(6, balls.length)
          );

    const effectiveTotalBalls = baseSpellBalls + simulatedExtraOvers * 6;
    const oversDecimal = effectiveTotalBalls / 6;
    const oversFormatted = formatCricketOversFromBalls(effectiveTotalBalls);

    // Compare fresh opening deliveries vs latest deliveries for empirical speed degradation
    const splitIdx = Math.max(1, Math.ceil(balls.length * 0.45));
    const earlySlice = balls.slice(0, splitIdx);
    const lateSlice = balls.slice(-splitIdx);

    const rawEarlySpeed =
      earlySlice.length > 0
        ? earlySlice.reduce((s, d) => s + d.speedKmh, 0) / earlySlice.length
        : isSpin
        ? 92.4
        : 145.2;

    const rawLateSpeed =
      lateSlice.length > 0
        ? lateSlice.reduce((s, d) => s + d.speedKmh, 0) / lateSlice.length
        : rawEarlySpeed;

    // Fresh spell peak calibration
    const freshPeakSpeed = Math.max(
      rawEarlySpeed,
      balls.length > 0 ? Math.max(...balls.map((b) => b.speedKmh)) * 0.992 : rawEarlySpeed
    );

    // Workload-correlated speed drop (seamers degrade faster per additional over than spinners, amplified in humid/hot conditions)
    const heatFactor = (venue.dewFactor || '') === 'Heavy' ? 1.12 : 1.0;
    const perOverDecayRate = (isSpin ? 0.42 : 1.18) * heatFactor;
    const workloadExcessOvers = Math.max(0, oversDecimal - 1.5);
    const modeledSpeedDrop = workloadExcessOvers * perOverDecayRate;

    const observedDrop = Math.max(0, freshPeakSpeed - rawLateSpeed);
    const blendedSpeedDrop = Number(
      (observedDrop * 0.55 + modeledSpeedDrop * 0.65).toFixed(1)
    );
    const currentAvgSpeed = Number(
      Math.max(isSpin ? 76.5 : 121.0, freshPeakSpeed - blendedSpeedDrop).toFixed(1)
    );
    const speedDeltaKmh = Number((currentAvgSpeed - freshPeakSpeed).toFixed(1));

    // 1. Pace Retention Score (0..100): 0 km/h drop = 97, -8 km/h drop = 42
    const maxRefDrop = isSpin ? 5.5 : 9.0;
    const paceRetentionScore = Math.round(
      Math.max(28, Math.min(98, 97 - (Math.abs(speedDeltaKmh) / maxRefDrop) * 58))
    );

    // 2. Line Accuracy Score (0..100): Share of balls in disciplined Off Stump / Outside Off channel (pitchX 35..54, non-Wide)
    const disciplinedLineHits = balls.filter(
      (b) =>
        b.outcome !== 'WD' &&
        (b.line === 'Off Stump' ||
          b.line === 'Outside Off' ||
          (b.pitchX >= 35 && b.pitchX <= 54))
    ).length;
    const baseLineAcc =
      balls.length > 0 ? (disciplinedLineHits / sampleSize) * 100 : 82;
    const lineFatiguePenalty = Math.max(0, oversDecimal - 1.5) * (isSpin ? 2.6 : 4.1);
    const lineAccuracyScore = Math.round(
      Math.max(30, Math.min(96, baseLineAcc * 0.65 + 31 - lineFatiguePenalty))
    );

    // 3. Length Accuracy Score (0..100): Share of balls hitting Good Length / Yorker vs tired Full Toss / errant short balls
    const disciplinedLengthHits = balls.filter(
      (b) =>
        b.length === 'Good Length' ||
        b.length === 'Yorker' ||
        (b.length === 'Full' && b.runs <= 2)
    ).length;
    const fullTossMisses = balls.filter((b) => b.length === 'Full Toss').length;
    const baseLengthAcc =
      balls.length > 0
        ? ((disciplinedLengthHits - fullTossMisses * 0.5) / sampleSize) * 100
        : 78;
    const lengthFatiguePenalty = Math.max(0, oversDecimal - 1.5) * (isSpin ? 2.9 : 4.5);
    const lengthAccuracyScore = Math.round(
      Math.max(28, Math.min(96, baseLengthAcc * 0.62 + 32 - lengthFatiguePenalty))
    );

    // 4. Overs Stamina Reserve (0..100): Directly correlated against total overs delivered (4.0 ov T20 spell benchmark, extended up to 10 ov)
    const spellCeilingOvers = isSpin ? 6.5 : 5.2;
    const oversStaminaScore = Math.round(
      Math.max(22, Math.min(96, 98 - (oversDecimal / spellCeilingOvers) * 62))
    );

    // 5. Release Consistency (0..100): Inverse of speed standard deviation + NB/WD extras drift
    const meanSpd =
      balls.length > 0
        ? balls.reduce((acc, b) => acc + b.speedKmh, 0) / sampleSize
        : currentAvgSpeed;
    const variance =
      balls.length > 1
        ? balls.reduce((acc, b) => acc + Math.pow(b.speedKmh - meanSpd, 2), 0) / sampleSize
        : 2.4;
    const stdDev = Math.sqrt(variance);
    const extrasCount = balls.filter((b) => b.outcome === 'WD' || b.outcome === 'NB').length;
    const releaseConsistencyScore = Math.round(
      Math.max(
        32,
        Math.min(
          95,
          93 - Math.min(26, stdDev * 2.1) - extrasCount * 6 - simulatedExtraOvers * 3.4
        )
      )
    );

    // 6. Dot & Wicket Pressure Control (0..100)
    const pressureBalls = balls.filter(
      (b) => b.outcome === '0' || b.isWicket || b.runs <= 1
    ).length;
    const basePressure = balls.length > 0 ? (pressureBalls / sampleSize) * 100 : 72;
    const dotPressureScore = Math.round(
      Math.max(30, Math.min(96, basePressure * 0.68 + 24 - simulatedExtraOvers * 3.1))
    );

    // Composite Fatigue Strain Index (0..100, higher = more fatigued)
    const avgReadiness =
      (paceRetentionScore * 0.24 +
        lineAccuracyScore * 0.2 +
        lengthAccuracyScore * 0.2 +
        oversStaminaScore * 0.22 +
        releaseConsistencyScore * 0.14);
    const fatigueIndexPct = Math.round(Math.max(8, Math.min(94, 102 - avgReadiness)));

    // Empirical correlation r between overs workload and speed/accuracy retention
    const correlationR = Number(
      (-Math.min(0.94, Math.max(0.46, 0.54 + oversDecimal * 0.068))).toFixed(2)
    );

    const statusMeta =
      fatigueIndexPct >= 62
        ? {
            glyph: '✖ High Fatigue',
            toneText: 'text-rose-400',
            strokeHex: '#fb7185',
            fillRgba: 'rgba(244, 63, 94, 0.22)',
            advice:
              'Rotate bowler out of attack — release brace drop is widening line/length scatter.',
          }
        : fatigueIndexPct >= 36
        ? {
            glyph: '▲ Moderate Drift',
            toneText: 'text-amber-300',
            strokeHex: '#f59e0b',
            fillRgba: 'rgba(245, 158, 11, 0.20)',
            advice:
              'Switch to cutters or wider crease angles to mask subtle pace loss.',
          }
        : {
            glyph: '● Fresh / Nominal',
            toneText: 'text-emerald-400',
            strokeHex: '#22d3ee',
            fillRgba: 'rgba(34, 211, 238, 0.20)',
            advice:
              'Snap and seam/spin accuracy holding firm; keep attacking top of off-stump.',
          };

    const axes: BowlerRadarAxisMetric[] = [
      {
        id: 'pace_retention',
        shortLabel: 'Pace Ret.',
        fullTitle: 'Average Speed Retention',
        angleDeg: 0,
        currentScore: paceRetentionScore,
        freshBaselineScore: 95,
        unitDetail: `${currentAvgSpeed} km/h (${speedDeltaKmh <= 0 ? speedDeltaKmh : `+${speedDeltaKmh}`} km/h vs peak)`,
        correlationNote: `Speed shifted ${speedDeltaKmh} km/h from ${freshPeakSpeed.toFixed(1)} km/h peak across ${oversFormatted} overs (${correlationR}r).`,
      },
      {
        id: 'line_accuracy',
        shortLabel: 'Line Acc.',
        fullTitle: 'Stump & 4th-Stump Line Accuracy',
        angleDeg: 60,
        currentScore: lineAccuracyScore,
        freshBaselineScore: 90,
        unitDetail: `${lineAccuracyScore}% in target corridor`,
        correlationNote: `${disciplinedLineHits}/${sampleSize} recorded balls hit Off/4th-stump channel; lateral drift rises after 2.5+ overs.`,
      },
      {
        id: 'length_accuracy',
        shortLabel: 'Length Acc.',
        fullTitle: 'Target Length Execution',
        angleDeg: 120,
        currentScore: lengthAccuracyScore,
        freshBaselineScore: 89,
        unitDetail: `${lengthAccuracyScore}% stock/yorker hit rate`,
        correlationNote: `${disciplinedLengthHits}/${sampleSize} balls landed on Good Length or Yorker; tired legs elevate half-volley & full-toss risk.`,
      },
      {
        id: 'overs_stamina',
        shortLabel: 'Stamina',
        fullTitle: 'Total Overs Stamina Reserve',
        angleDeg: 180,
        currentScore: oversStaminaScore,
        freshBaselineScore: 96,
        unitDetail: `${oversFormatted} ov (${effectiveTotalBalls} balls)`,
        correlationNote: `Tracks cumulative workload (${oversFormatted} ov delivered) against ${spellCeilingOvers} ov high-intensity spell ceiling.`,
      },
      {
        id: 'release_consistency',
        shortLabel: 'Release',
        fullTitle: 'Wrist & Front-Brace Consistency',
        angleDeg: 240,
        currentScore: releaseConsistencyScore,
        freshBaselineScore: 91,
        unitDetail: `±${stdDev.toFixed(1)} km/h dispersion`,
        correlationNote: `Measures release speed dispersion and crease discipline (${extrasCount} extras recorded).`,
      },
      {
        id: 'dot_pressure',
        shortLabel: 'Dot Ctrl',
        fullTitle: 'Dot-Ball & Containment Index',
        angleDeg: 300,
        currentScore: dotPressureScore,
        freshBaselineScore: 87,
        unitDetail: `${dotPressureScore}% containment`,
        correlationNote: `${pressureBalls}/${sampleSize} deliveries conceded ≤1 run or took a wicket as spell progressed.`,
      },
    ];

    return {
      oversFormatted,
      effectiveTotalBalls,
      freshPeakSpeed: freshPeakSpeed.toFixed(1),
      currentAvgSpeed,
      speedDeltaKmh,
      lineAccuracyScore,
      lengthAccuracyScore,
      fatigueIndexPct,
      correlationR,
      statusMeta,
      axes,
    };
  }, [focusedBowler, liveBallsSimulated, simulatedExtraOvers, venue.dewFactor]);

  const activeAxis = useMemo(
    () =>
      fatigueTelemetry.axes.find((a) => a.id === selectedAxisId) ||
      fatigueTelemetry.axes[0],
    [fatigueTelemetry.axes, selectedAxisId]
  );

  // Radar Geometry Constants (viewBox="0 0 292 238", center 146, 119, maxRadius 68)
  const cx = 146;
  const cy = 119;
  const maxR = 68;

  const polarToXY = (angleDeg: number, scorePct: number, radiusOverride?: number) => {
    const rad = ((angleDeg - 90) * Math.PI) / 180;
    const r = radiusOverride !== undefined ? radiusOverride : (scorePct / 100) * maxR;
    return {
      x: cx + r * Math.cos(rad),
      y: cy + r * Math.sin(rad),
    };
  };

  const baselinePolygonPoints = fatigueTelemetry.axes
    .map((ax) => {
      const pt = polarToXY(ax.angleDeg, ax.freshBaselineScore);
      return `${pt.x.toFixed(1)},${pt.y.toFixed(1)}`;
    })
    .join(' ');

  const currentPolygonPoints = fatigueTelemetry.axes
    .map((ax) => {
      const pt = polarToXY(ax.angleDeg, ax.currentScore);
      return `${pt.x.toFixed(1)},${pt.y.toFixed(1)}`;
    })
    .join(' ');

  return (
    <div className="border-t border-slate-800/90 pt-3.5 space-y-3">
      {/* Header Row */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 min-w-0">
          <Gauge className="h-3.5 w-3.5 text-cyan-400 shrink-0" />
          <h5 className="font-heading font-bold text-white text-xs truncate">
            Bowler Fatigue Monitor
          </h5>
        </div>
        <span className={`text-[10.5px] font-semibold shrink-0 ${fatigueTelemetry.statusMeta.toneText}`}>
          {fatigueTelemetry.statusMeta.glyph}
        </span>
      </div>

      {/* Bowler Selector + Workload Correlation Subtitle */}
      <div className="space-y-1.5">
        <div className="relative">
          <select
            aria-label="Select Bowler for Fatigue Radar Monitor"
            value={selectedBowlerKey}
            onChange={(e) => {
              cricketAudio.playUiClick();
              setSelectedBowlerKey(e.target.value);
            }}
            className="w-full appearance-none rounded-xl border border-slate-800 bg-slate-900 pl-2.5 pr-7 py-1.5 text-[11px] font-semibold text-slate-100 focus:border-cyan-400 focus:outline-none cursor-pointer truncate"
          >
            <option value="__AUTO__">
              Active Spell: {focusedBowler.name} ({focusedBowler.style})
            </option>
            {bowlerGroups.map((b) => (
              <option key={b.key} value={b.key}>
                {b.name} · {b.style} ({b.deliveries.length}b)
              </option>
            ))}
            {bowlerGroups.length > 1 && (
              <option value="__ALL__">Combined Attack ({deliveries.length}b)</option>
            )}
          </select>
          <ChevronDown className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
        </div>

        <div className="flex items-center justify-between text-[10px] text-slate-400">
          <span>
            Overs:{' '}
            <strong className="font-mono tabular-nums text-white">
              {fatigueTelemetry.oversFormatted}
            </strong>
            {simulatedExtraOvers > 0 ? ' (Proj.)' : ''}
          </span>
          <span>·</span>
          <span>
            Speed Δ:{' '}
            <strong
              className={`font-mono tabular-nums ${
                fatigueTelemetry.speedDeltaKmh <= -2.2
                  ? 'text-rose-400'
                  : fatigueTelemetry.speedDeltaKmh < 0
                  ? 'text-amber-300'
                  : 'text-emerald-300'
              }`}
            >
              {fatigueTelemetry.speedDeltaKmh > 0
                ? `+${fatigueTelemetry.speedDeltaKmh}`
                : fatigueTelemetry.speedDeltaKmh}{' '}
              km/h
            </strong>
          </span>
          <span>·</span>
          <span>
            r ={' '}
            <strong className="font-mono tabular-nums text-cyan-300">
              {fatigueTelemetry.correlationR}
            </strong>
          </span>
        </div>
      </div>

      {/* 6-Axis Polygonal Radar Chart SVG */}
      <div className="rounded-xl border border-slate-800/90 bg-slate-900/60 p-2 space-y-1.5">
        <svg
          viewBox="0 0 292 238"
          className="w-full h-auto block select-none"
          role="img"
          aria-label={`Bowler Fatigue Monitor radar chart for ${focusedBowler.name}`}
        >
          {/* Concentric Calibration Hexagons (25%, 50%, 75%, 100%) */}
          {[25, 50, 75, 100].map((ringPct) => {
            const pts = fatigueTelemetry.axes
              .map((ax) => {
                const p = polarToXY(ax.angleDeg, ringPct);
                return `${p.x.toFixed(1)},${p.y.toFixed(1)}`;
              })
              .join(' ');
            return (
              <polygon
                key={`ring-${ringPct}`}
                points={pts}
                fill="none"
                stroke={ringPct === 100 ? '#334155' : '#1e293b'}
                strokeWidth={ringPct === 100 ? '1.1' : '0.85'}
                strokeDasharray={ringPct === 50 ? '2 2' : undefined}
              />
            );
          })}

          {/* Radial Spokes */}
          {fatigueTelemetry.axes.map((ax) => {
            const outer = polarToXY(ax.angleDeg, 100);
            return (
              <line
                key={`spoke-${ax.id}`}
                x1={cx}
                y1={cy}
                x2={outer.x}
                y2={outer.y}
                stroke="#1e293b"
                strokeWidth="0.9"
              />
            );
          })}

          {/* Ring Scale Tick Labels along Top Axis */}
          {[50, 100].map((tick) => {
            const p = polarToXY(0, tick);
            return (
              <text
                key={`tick-${tick}`}
                x={cx + 3}
                y={p.y + 3}
                fill="#64748b"
                fontSize="6.5"
                className="pitch-svg-num"
              >
                {tick}%
              </text>
            );
          })}

          {/* Fresh Opening Spell Baseline Polygon (Dashed Emerald Reference) */}
          <polygon
            points={baselinePolygonPoints}
            fill="rgba(16, 185, 129, 0.06)"
            stroke="rgba(52, 211, 153, 0.55)"
            strokeWidth="1.2"
            strokeDasharray="3 3"
          />

          {/* Current Workload Correlated Polygon */}
          <polygon
            points={currentPolygonPoints}
            fill={fatigueTelemetry.statusMeta.fillRgba}
            stroke={fatigueTelemetry.statusMeta.strokeHex}
            strokeWidth="2"
            strokeLinejoin="round"
          />

          {/* Interactive Vertex Nodes & Calibrated Axis Labels */}
          {fatigueTelemetry.axes.map((ax) => {
            const vertexPt = polarToXY(ax.angleDeg, ax.currentScore);
            const labelPt = polarToXY(ax.angleDeg, 100, maxR + 22);
            const isSelected = selectedAxisId === ax.id;
            const anchor =
              ax.angleDeg === 0 || ax.angleDeg === 180
                ? 'middle'
                : ax.angleDeg < 180
                ? 'start'
                : 'end';
            const labelXOffset =
              anchor === 'start' ? -4 : anchor === 'end' ? 4 : 0;
            const labelYOffset =
              ax.angleDeg === 0 ? -5 : ax.angleDeg === 180 ? 8 : -2;

            return (
              <g
                key={ax.id}
                onClick={() => {
                  cricketAudio.playUiClick();
                  setSelectedAxisId(ax.id);
                }}
                className="cursor-pointer"
              >
                <circle
                  cx={vertexPt.x}
                  cy={vertexPt.y}
                  r={isSelected ? 4.8 : 3.4}
                  fill={isSelected ? '#ffffff' : fatigueTelemetry.statusMeta.strokeHex}
                  stroke="#020617"
                  strokeWidth="1.3"
                />
                <text
                  x={labelPt.x + labelXOffset}
                  y={labelPt.y + labelYOffset}
                  textAnchor={anchor}
                  fill={isSelected ? '#f8fafc' : '#cbd5e1'}
                  fontSize="7.8"
                  fontWeight={isSelected ? '700' : '600'}
                  className="pitch-svg-label"
                >
                  {ax.shortLabel}
                </text>
                <text
                  x={labelPt.x + labelXOffset}
                  y={labelPt.y + labelYOffset + 9.5}
                  textAnchor={anchor}
                  fill={
                    ax.currentScore >= 75
                      ? '#34d399'
                      : ax.currentScore >= 55
                      ? '#fbbf24'
                      : '#fb7185'
                  }
                  fontSize="7.5"
                  fontWeight="700"
                  className="pitch-svg-num"
                >
                  {ax.currentScore}%
                </text>
              </g>
            );
          })}
        </svg>

        {/* Legend Strip */}
        <div className="flex items-center justify-between px-1 text-[10px] text-slate-400">
          <span className="inline-flex items-center gap-1.5">
            <span
              className="h-2 w-2 rounded-full inline-block"
              style={{ backgroundColor: fatigueTelemetry.statusMeta.strokeHex }}
            />
            <span>Current Spell ({fatigueTelemetry.oversFormatted} ov)</span>
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-0.5 w-3.5 border-t border-dashed border-emerald-400 inline-block" />
            <span>Fresh Over 1</span>
          </span>
        </div>
      </div>

      {/* Interactive Workload Scrubber (+0 to +6 Overs Projection) */}
      <div className="rounded-xl border border-slate-800/90 bg-slate-900/50 px-2.5 py-2 space-y-1.5">
        <div className="flex items-center justify-between text-[10.5px]">
          <span className="text-slate-300 font-medium">
            Workload Projection (+Overs)
          </span>
          <div className="flex items-center gap-2">
            <span className="font-mono tabular-nums font-bold text-cyan-300">
              {simulatedExtraOvers === 0 ? 'Live Sync' : `+${simulatedExtraOvers} ov`}
            </span>
            {simulatedExtraOvers > 0 && (
              <button
                type="button"
                onClick={() => {
                  cricketAudio.playUiClick();
                  setSimulatedExtraOvers(0);
                }}
                className="inline-flex items-center gap-0.5 text-[10px] text-slate-400 hover:text-white cursor-pointer"
                title="Reset to live overs delivered"
              >
                <RotateCcw className="h-2.5 w-2.5" />
                <span>Live</span>
              </button>
            )}
          </div>
        </div>
        <input
          type="range"
          min={0}
          max={6}
          step={1}
          value={simulatedExtraOvers}
          aria-label="Project additional overs delivered to test speed and accuracy degradation"
          onChange={(e) => setSimulatedExtraOvers(Number(e.target.value))}
          className="w-full h-1.5 accent-cyan-400 bg-slate-800 rounded-lg cursor-pointer"
        />
      </div>

      {/* Selected Vertex Correlation Readout & Coaching Action */}
      <div className="rounded-xl border border-slate-800/90 bg-slate-950/90 p-2.5 space-y-1.5 text-[11px]">
        <div className="flex items-center justify-between gap-2">
          <span className="font-semibold text-white inline-flex items-center gap-1 truncate">
            <TrendingDown className="h-3 w-3 text-cyan-400 shrink-0" />
            <span className="truncate">{activeAxis.fullTitle}</span>
          </span>
          <span className="font-mono tabular-nums text-[10px] font-bold text-cyan-300 shrink-0">
            {activeAxis.currentScore}%
          </span>
        </div>
        <p className="text-[10.5px] font-mono tabular-nums text-slate-300">
          {activeAxis.unitDetail}
        </p>
        <p className="text-[10.5px] text-slate-400 leading-relaxed">
          {activeAxis.correlationNote}
        </p>
        <div className="pt-1 border-t border-slate-800/80 flex items-center justify-between text-[10px] text-slate-400">
          <span>
            Fatigue Strain:{' '}
            <strong className={`font-mono tabular-nums ${fatigueTelemetry.statusMeta.toneText}`}>
              {fatigueTelemetry.fatigueIndexPct}%
            </strong>
          </span>
          <span>
            Line/Len:{' '}
            <strong className="font-mono tabular-nums text-slate-200">
              {fatigueTelemetry.lineAccuracyScore}% / {fatigueTelemetry.lengthAccuracyScore}%
            </strong>
          </span>
        </div>
      </div>
    </div>
  );
};
