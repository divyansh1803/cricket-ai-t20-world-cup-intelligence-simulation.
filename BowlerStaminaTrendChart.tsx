import React, { useEffect, useMemo, useState } from 'react';
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ReferenceArea,
  ReferenceDot,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  AlertTriangle,
  CheckCircle2,
  Gauge,
  Shield,
  TrendingUp,
} from 'lucide-react';
import { BallEvent, Player, Stadium, Team } from '../../types/cricket';
import { STADIUMS, TEAMS } from '../../data/cricketData';
import { PlayerCardAvatar, TeamFlag } from '../common/CricketIdentity';
import { cricketAudio } from '../../utils/audioSystem';

export type SpellWorkloadProfile = 'straight_four' | 'split_two_two' | 'high_effort_attack';

export interface BowlerStaminaTrendPoint {
  checkpointIndex: number;
  overLabel: string;
  spellBall: number;
  staminaPct: number;
  controlPrecisionPct: number;
  economyRate: number;
  baselineEconomy: number;
  economyDelta: number;
  releaseSpeedKmh: number;
  speedDropKmh: number;
  markerKind: 'none' | 'onset' | 'severe';
  markerHeadline?: string;
  markerSubtext?: string;
}

export interface BowlerStaminaTrendChartProps {
  teamA?: Team;
  teamB?: Team;
  stadium?: Stadium;
  innings1Events?: BallEvent[];
  innings2Events?: BallEvent[];
  activeBowlerOverride?: Player;
}

interface AnnotationLabelProps {
  viewBox?: { x?: number; y?: number };
  headline: string;
  subtext: string;
  variant: 'onset' | 'severe';
}

const DegradationAnnotationLabel: React.FC<AnnotationLabelProps> = ({
  viewBox,
  headline,
  subtext,
  variant,
}) => {
  const cx = viewBox?.x ?? 0;
  const cy = viewBox?.y ?? 0;
  const isSevere = variant === 'severe';
  const boxWidth = 168;
  const boxHeight = 38;
  const offsetX = isSevere ? -boxWidth + 14 : -boxWidth / 2;
  const offsetY = isSevere ? -boxHeight - 14 : -boxHeight - 16;
  const borderStroke = isSevere ? '#f43f5e' : '#f59e0b';
  const titleFill = isSevere ? '#fda4af' : '#fde68a';

  return (
    <g transform={`translate(${cx + offsetX}, ${Math.max(4, cy + offsetY)})`} pointerEvents="none">
      <rect
        x={0}
        y={0}
        width={boxWidth}
        height={boxHeight}
        rx={8}
        fill="rgba(2, 6, 23, 0.94)"
        stroke={borderStroke}
        strokeWidth={1.5}
      />
      <text
        x={boxWidth / 2}
        y={15}
        textAnchor="middle"
        fill={titleFill}
        fontSize={9.5}
        fontFamily="JetBrains Mono, monospace"
        fontWeight={700}
      >
        {headline}
      </text>
      <text
        x={boxWidth / 2}
        y={29}
        textAnchor="middle"
        fill="#f8fafc"
        fontSize={10}
        fontFamily="JetBrains Mono, monospace"
        fontWeight={700}
      >
        {subtext}
      </text>
    </g>
  );
};

export const BowlerStaminaTrendChart: React.FC<BowlerStaminaTrendChartProps> = ({
  teamA = TEAMS[0],
  teamB = TEAMS[1],
  stadium = STADIUMS[0],
  innings1Events = [],
  innings2Events = [],
  activeBowlerOverride,
}) => {
  const allEvents = useMemo(
    () => [...innings1Events, ...innings2Events],
    [innings1Events, innings2Events]
  );

  // Assemble front-line bowling pool across both match squads (prioritizing bowlers with live deliveries)
  const bowlerPool = useMemo<Player[]>(() => {
    const combined = [...teamA.squad, ...teamB.squad].filter(
      (p) =>
        p.role === 'Pace Bowler' ||
        p.role === 'Spin Bowler' ||
        p.role === 'All-Rounder' ||
        p.stats.wickets >= 5
    );
    const withCounts = combined.map((player) => ({
      player,
      liveBalls: allEvents.filter((ev) => ev.bowler.id === player.id).length,
    }));
    withCounts.sort((a, b) => b.liveBalls - a.liveBalls);
    const ordered = withCounts.map((item) => item.player);
    if (activeBowlerOverride && !ordered.some((p) => p.id === activeBowlerOverride.id)) {
      return [activeBowlerOverride, ...ordered].slice(0, 8);
    }
    return ordered.length > 0 ? ordered.slice(0, 8) : [teamA.squad[0], teamB.squad[0]];
  }, [teamA, teamB, allEvents, activeBowlerOverride]);

  const [selectedBowlerId, setSelectedBowlerId] = useState<string>(
    activeBowlerOverride?.id || bowlerPool[0]?.id || ''
  );
  const [hasManualSelection, setHasManualSelection] = useState(false);
  const [workloadProfile, setWorkloadProfile] = useState<SpellWorkloadProfile>('straight_four');
  const [inspectedIdx, setInspectedIdx] = useState<number | null>(null);

  useEffect(() => {
    if (!hasManualSelection && activeBowlerOverride?.id) {
      setSelectedBowlerId(activeBowlerOverride.id);
    }
  }, [activeBowlerOverride?.id, hasManualSelection]);

  const activeBowler = useMemo(
    () =>
      bowlerPool.find((b) => b.id === selectedBowlerId) ||
      activeBowlerOverride ||
      bowlerPool[0],
    [bowlerPool, selectedBowlerId, activeBowlerOverride]
  );

  const activeBowlerTeam = useMemo(
    () => (teamA.squad.some((p) => p.id === activeBowler.id) ? teamA : teamB),
    [teamA, teamB, activeBowler.id]
  );

  const liveBowlerEvents = useMemo(
    () => allEvents.filter((e) => e.bowler.id === activeBowler.id),
    [allEvents, activeBowler.id]
  );

  // Build 12 two-ball spell checkpoints (Ov 0.2 .. Ov 4.0) with stamina depletion & economy degradation markers
  const spellSeries = useMemo<BowlerStaminaTrendPoint[]>(() => {
    const isSpinner =
      activeBowler.role === 'Spin Bowler' ||
      activeBowler.bowlingStyle.toLowerCase().includes('spin');

    const baseEcon = Number(
      Math.max(5.6, Math.min(8.4, activeBowler.stats.economy || (isSpinner ? 6.75 : 7.25))).toFixed(
        2
      )
    );
    const openingSpeed = isSpinner
      ? 92.8
      : activeBowler.role === 'Pace Bowler'
      ? 145.4
      : 134.6;

    const heatWearFactor =
      stadium.pitchType === 'Pace & Bounce'
        ? 1.06
        : stadium.pitchType === 'Dry Spin-Friendly'
        ? 1.03
        : 1.0;

    const rawPoints: Omit<
      BowlerStaminaTrendPoint,
      'markerKind' | 'markerHeadline' | 'markerSubtext'
    >[] = Array.from({ length: 12 }, (_, idx) => {
      const spellBall = (idx + 1) * 2;
      const completedOvers = Math.floor(spellBall / 6);
      const ballsIntoOver = spellBall % 6;
      const overLabel =
        ballsIntoOver === 0
          ? `Ov ${completedOvers}.0`
          : `Ov ${completedOvers}.${ballsIntoOver}`;

      const stepDrainBase = isSpinner ? 3.85 : 5.65;
      const profileMultiplier =
        workloadProfile === 'high_effort_attack'
          ? 1.24
          : workloadProfile === 'split_two_two'
          ? 0.88
          : 1.0;

      // In split 2+2 spell, bowler receives +15% Cool-Down recovery after Ball 12 (Over 2.0)
      const splitRecoveryBoost = workloadProfile === 'split_two_two' && spellBall > 12 ? 15 : 0;

      const cumulativeLinearDrain = idx * stepDrainBase * profileMultiplier * heatWearFactor;
      const lateSpellLactateDrag =
        idx >= 5
          ? Math.pow(idx - 4, 1.32) *
            (isSpinner ? 1.15 : 1.85) *
            (workloadProfile === 'split_two_two' ? 0.65 : 1.0)
          : 0;

      const staminaPct = Math.max(
        22,
        Math.min(
          100,
          Math.round(99 - cumulativeLinearDrain - lateSpellLactateDrag + splitRecoveryBoost)
        )
      );

      const controlPrecisionPct = Math.max(
        46,
        Math.min(
          97,
          Math.round(95 - (100 - staminaPct) * 0.56 - (staminaPct < 52 ? 6 : 0))
        )
      );

      const speedDropKmh = Number(
        ((100 - staminaPct) * (isSpinner ? 0.055 : 0.115)).toFixed(1)
      );
      const releaseSpeedKmh = Number((openingSpeed - speedDropKmh).toFixed(1));

      const liveSlice = liveBowlerEvents.slice(0, spellBall);
      let economyRate: number;
      if (liveSlice.length >= spellBall) {
        const runs = liveSlice.reduce((sum, ev) => sum + ev.runsScored, 0);
        economyRate = Number(((runs / liveSlice.length) * 6).toFixed(2));
      } else {
        let degradationPenalty = 0;
        if (staminaPct >= 76) {
          degradationPenalty = -0.25 + (100 - staminaPct) * 0.018;
        } else if (staminaPct >= 62) {
          degradationPenalty = 0.35 + (76 - staminaPct) * 0.105;
        } else if (staminaPct >= 48) {
          degradationPenalty = 1.82 + (62 - staminaPct) * 0.145;
        } else {
          degradationPenalty = 3.85 + (48 - staminaPct) * 0.135;
        }

        if (liveSlice.length >= 2) {
          const observedEcon =
            (liveSlice.reduce((sum, ev) => sum + ev.runsScored, 0) / liveSlice.length) * 6;
          economyRate = Number(
            Math.max(4.5, observedEcon * 0.35 + (baseEcon + degradationPenalty) * 0.65).toFixed(2)
          );
        } else {
          economyRate = Number(Math.max(4.6, baseEcon + degradationPenalty).toFixed(2));
        }
      }

      const economyDelta = Number((economyRate - baseEcon).toFixed(2));

      return {
        checkpointIndex: idx,
        overLabel,
        spellBall,
        staminaPct,
        controlPrecisionPct,
        economyRate,
        baselineEconomy: baseEcon,
        economyDelta,
        releaseSpeedKmh,
        speedDropKmh,
      };
    });

    // Pinpoint Marker 1: Economy Degradation Onset
    let onsetIdx = rawPoints.findIndex(
      (pt, i) => i >= 3 && (pt.economyDelta >= 1.15 || pt.staminaPct <= 67)
    );
    if (onsetIdx === -1) onsetIdx = 6;

    // Pinpoint Marker 2: Severe Economy Breakdown (<50% critical stamina or >= +2.85 RPO delta)
    let severeIdx = rawPoints.findIndex(
      (pt, i) => i > onsetIdx + 1 && (pt.staminaPct <= 48 || pt.economyDelta >= 2.85)
    );
    if (severeIdx === -1) severeIdx = rawPoints.length - 2;

    return rawPoints.map((pt, idx) => {
      if (idx === onsetIdx) {
        return {
          ...pt,
          markerKind: 'onset',
          markerHeadline: `ONSET @ ${pt.staminaPct}% STAMINA`,
          markerSubtext: `${pt.economyRate.toFixed(2)} RPO (+${Math.max(
            0.1,
            pt.economyDelta
          ).toFixed(2)} Δ)`,
        };
      }
      if (idx === severeIdx) {
        return {
          ...pt,
          markerKind: 'severe',
          markerHeadline: `BREAKDOWN @ ${pt.staminaPct}%`,
          markerSubtext: `${pt.economyRate.toFixed(2)} RPO (+${Math.max(
            0.2,
            pt.economyDelta
          ).toFixed(2)} Δ)`,
        };
      }
      return {
        ...pt,
        markerKind: 'none',
      };
    });
  }, [activeBowler, stadium.pitchType, workloadProfile, liveBowlerEvents]);

  const onsetPoint = useMemo(
    () => spellSeries.find((p) => p.markerKind === 'onset') || spellSeries[6],
    [spellSeries]
  );
  const severePoint = useMemo(
    () => spellSeries.find((p) => p.markerKind === 'severe') || spellSeries[10],
    [spellSeries]
  );
  const openingPoint = spellSeries[0];
  const closingPoint = spellSeries[spellSeries.length - 1];

  const inspectedPoint =
    inspectedIdx !== null && spellSeries[inspectedIdx] ? spellSeries[inspectedIdx] : onsetPoint;

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-4 sm:p-6 space-y-5">
      {/* Header Row: Bowler Identity + Workload Mode Controls */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div className="flex items-start sm:items-center gap-3.5 min-w-0">
          <PlayerCardAvatar
            playerId={activeBowler.id}
            name={activeBowler.name}
            countryCode={activeBowler.countryCode || activeBowlerTeam.id}
            jerseyNumber={activeBowler.jerseyNumber}
            imageUrl={activeBowler.imageUrl}
            size="md"
          />
          <div className="space-y-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 text-xs text-cyan-300 font-medium">
              <Gauge className="h-3.5 w-3.5 text-cyan-400 shrink-0" />
              <span>Bowler Stamina Trend</span>
              <span aria-hidden="true" className="text-slate-600">
                ·
              </span>
              <TeamFlag code={activeBowlerTeam.id} size="xs" />
              <span className="text-slate-200">{activeBowler.bowlingStyle || activeBowler.role}</span>
              <span aria-hidden="true" className="text-slate-600">
                ·
              </span>
              <span className="font-mono tabular-nums text-emerald-300">
                {liveBowlerEvents.length > 0
                  ? `${liveBowlerEvents.length} Live Deliveries Logged`
                  : '24-Ball Spell Biomechanical Curve'}
              </span>
            </div>
            <h4 className="text-lg sm:text-xl font-black text-white tracking-tight truncate">
              {activeBowler.name} — Spell Stamina Depletion &amp; Economy Degradation
            </h4>
            <p className="text-xs text-slate-300 max-w-3xl">
              Multi-line Recharts graph plotting stamina percentage depletion and execution control
              against rolling economy rate, with annotated markers pinpointing where economy
              degradation accelerates.
            </p>
          </div>
        </div>

        {/* Spell Workload Pacing Selector */}
        <div
          role="group"
          aria-label="Spell Workload Pacing Mode"
          className="inline-flex flex-wrap items-center gap-1 rounded-xl border border-slate-800 bg-slate-950 p-1 text-xs shrink-0"
        >
          {(
            [
              { id: 'straight_four', label: '4-Over Straight Spell' },
              { id: 'split_two_two', label: 'Split 2+2 (Rested +15%)' },
              { id: 'high_effort_attack', label: 'Bouncer / Yorker Heavy' },
            ] as const
          ).map((mode) => (
            <button
              key={mode.id}
              type="button"
              onClick={() => {
                cricketAudio.playUiClick();
                setWorkloadProfile(mode.id);
              }}
              className={`rounded-lg px-3 py-1.5 font-semibold transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                workloadProfile === mode.id
                  ? 'bg-cyan-400 text-slate-950 font-bold'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              {mode.label}
            </button>
          ))}
        </div>
      </div>

      {/* Active Bowler Switcher Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1.5">
          {bowlerPool.map((bowlerItem) => {
            const isSelected = bowlerItem.id === activeBowler.id;
            const bTeam = teamA.squad.some((p) => p.id === bowlerItem.id) ? teamA : teamB;
            return (
              <button
                key={bowlerItem.id}
                type="button"
                onClick={() => {
                  cricketAudio.playUiClick();
                  setHasManualSelection(true);
                  setSelectedBowlerId(bowlerItem.id);
                  setInspectedIdx(null);
                }}
                className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                  isSelected
                    ? 'bg-sky-400 text-slate-950 font-bold'
                    : 'border border-slate-800 bg-slate-950 text-slate-200 hover:border-slate-700 hover:text-white'
                }`}
              >
                <TeamFlag code={bTeam.id} size="xs" />
                <span>{bowlerItem.name}</span>
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-3 text-xs text-slate-300 font-mono tabular-nums">
          <span>
            Baseline Econ:{' '}
            <strong className="text-emerald-300">{openingPoint.baselineEconomy.toFixed(2)} RPO</strong>
          </span>
          <span aria-hidden="true" className="text-slate-600">
            ·
          </span>
          <span>
            Onset Threshold:{' '}
            <strong className="text-amber-300">{onsetPoint.staminaPct}% Stamina</strong>
          </span>
        </div>
      </div>

      {/* Multi-Line Recharts Visualization */}
      <div className="h-[340px] sm:h-[370px] w-full rounded-2xl border border-slate-800 bg-slate-950 p-3 sm:p-4">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={spellSeries}
            margin={{ top: 44, right: 24, left: 4, bottom: 8 }}
            onClick={(state) => {
              if (state && typeof state.activeTooltipIndex === 'number') {
                cricketAudio.playUiClick();
                setInspectedIdx(state.activeTooltipIndex);
              }
            }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.14)" />

            {/* Shaded Economy Degradation Window starting at Onset Marker */}
            <ReferenceArea
              yAxisId="pct"
              x1={onsetPoint.overLabel}
              x2={closingPoint.overLabel}
              y1={0}
              y2={105}
              fill="rgba(244, 63, 94, 0.07)"
              strokeOpacity={0}
            />

            <XAxis
              dataKey="overLabel"
              stroke="#94a3b8"
              tick={{ fill: '#e2e8f0', fontSize: 11, fontFamily: 'JetBrains Mono, monospace' }}
            />

            {/* Left Axis: Stamina (%) & Execution Control (%) */}
            <YAxis
              yAxisId="pct"
              domain={[0, 105]}
              ticks={[0, 25, 50, 75, 100]}
              stroke="#38bdf8"
              tick={{ fill: '#7dd3fc', fontSize: 11, fontFamily: 'JetBrains Mono, monospace' }}
              unit="%"
            />

            {/* Right Axis: Rolling Economy Rate (RPO) */}
            <YAxis
              yAxisId="econ"
              orientation="right"
              domain={[4, 14]}
              stroke="#fb7185"
              tick={{ fill: '#fda4af', fontSize: 11, fontFamily: 'JetBrains Mono, monospace' }}
              unit=" RPO"
            />

            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload || !payload.length) return null;
                const pt = payload[0].payload as BowlerStaminaTrendPoint;
                return (
                  <div className="rounded-xl border border-slate-700 bg-slate-950/95 px-3.5 py-3 shadow-2xl space-y-1.5 text-xs font-mono tabular-nums">
                    <div className="flex items-center justify-between gap-4 border-b border-slate-800 pb-1.5">
                      <strong className="text-white font-sans font-bold">
                        {pt.overLabel} (Delivery #{pt.spellBall})
                      </strong>
                      {pt.markerKind !== 'none' && (
                        <span
                          className={
                            pt.markerKind === 'severe'
                              ? 'text-rose-300 font-bold'
                              : 'text-amber-300 font-bold'
                          }
                        >
                          {pt.markerKind === 'severe' ? 'Severe Surge' : 'Degradation Onset'}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center justify-between gap-5">
                      <span className="text-slate-300">Stamina Remaining:</span>
                      <strong className="text-sky-300">{pt.staminaPct}%</strong>
                    </div>
                    <div className="flex items-center justify-between gap-5">
                      <span className="text-slate-300">Line &amp; Length Control:</span>
                      <strong className="text-emerald-300">{pt.controlPrecisionPct}%</strong>
                    </div>
                    <div className="flex items-center justify-between gap-5">
                      <span className="text-slate-300">Spell Economy Rate:</span>
                      <strong className="text-rose-300">
                        {pt.economyRate.toFixed(2)} RPO ({pt.economyDelta >= 0 ? '+' : ''}
                        {pt.economyDelta.toFixed(2)} Δ)
                      </strong>
                    </div>
                    <div className="flex items-center justify-between gap-5">
                      <span className="text-slate-300">Release Velocity:</span>
                      <strong className="text-slate-100">
                        {pt.releaseSpeedKmh} km/h (-{pt.speedDropKmh} km/h)
                      </strong>
                    </div>
                  </div>
                );
              }}
            />

            <Legend
              wrapperStyle={{
                color: '#e2e8f0',
                fontSize: '12px',
                paddingTop: '8px',
              }}
            />

            {/* Fresh Spell Baseline Economy Reference */}
            <ReferenceLine
              yAxisId="econ"
              y={openingPoint.baselineEconomy}
              stroke="rgba(52, 211, 153, 0.45)"
              strokeDasharray="3 4"
              label={{
                value: `Fresh Par ${openingPoint.baselineEconomy.toFixed(2)} RPO`,
                fill: '#6ee7b7',
                fontSize: 10,
                position: 'insideBottomLeft',
              }}
            />

            {/* Vertical Inflection Connector at Economy Degradation Onset */}
            <ReferenceLine
              yAxisId="pct"
              x={onsetPoint.overLabel}
              stroke="#f59e0b"
              strokeDasharray="4 4"
              strokeWidth={1.5}
            />

            {/* Critical 50% Stamina Floor Reference */}
            <ReferenceLine
              yAxisId="pct"
              y={50}
              stroke="rgba(244, 63, 94, 0.45)"
              strokeDasharray="5 4"
              label={{
                value: '50% Critical Stamina Threshold',
                fill: '#fda4af',
                fontSize: 10,
                position: 'insideTopLeft',
              }}
            />

            {/* Line 1: Stamina Depletion (%) */}
            <Line
              yAxisId="pct"
              type="monotone"
              dataKey="staminaPct"
              name="Stamina Remaining (%)"
              stroke="#38bdf8"
              strokeWidth={3}
              dot={{ r: 3.5, fill: '#38bdf8', strokeWidth: 0 }}
              activeDot={{ r: 6, fill: '#38bdf8', stroke: '#ffffff', strokeWidth: 2 }}
            />

            {/* Line 2: Execution Control (%) */}
            <Line
              yAxisId="pct"
              type="monotone"
              dataKey="controlPrecisionPct"
              name="Execution Control (%)"
              stroke="#34d399"
              strokeWidth={2}
              strokeDasharray="5 3"
              dot={{ r: 2.5, fill: '#34d399', strokeWidth: 0 }}
              activeDot={{ r: 5 }}
            />

            {/* Line 3: Rolling Economy Rate (RPO) */}
            <Line
              yAxisId="econ"
              type="monotone"
              dataKey="economyRate"
              name="Spell Economy Rate (RPO)"
              stroke="#fb7185"
              strokeWidth={3}
              dot={{ r: 4, fill: '#fb7185', strokeWidth: 0 }}
              activeDot={{ r: 6, fill: '#f43f5e', stroke: '#ffffff', strokeWidth: 2 }}
            />

            {/* Paired Stamina Ring at Onset Threshold */}
            <ReferenceDot
              yAxisId="pct"
              x={onsetPoint.overLabel}
              y={onsetPoint.staminaPct}
              r={6}
              fill="#020617"
              stroke="#38bdf8"
              strokeWidth={2.5}
            />

            {/* Annotated Marker 1: Economy Degradation Onset */}
            <ReferenceDot
              yAxisId="econ"
              x={onsetPoint.overLabel}
              y={onsetPoint.economyRate}
              r={7}
              fill="#f59e0b"
              stroke="#ffffff"
              strokeWidth={2}
              label={
                <DegradationAnnotationLabel
                  headline={onsetPoint.markerHeadline || 'DEGRADATION ONSET'}
                  subtext={onsetPoint.markerSubtext || ''}
                  variant="onset"
                />
              }
            />

            {/* Paired Stamina Ring at Severe Breakdown */}
            <ReferenceDot
              yAxisId="pct"
              x={severePoint.overLabel}
              y={severePoint.staminaPct}
              r={6}
              fill="#020617"
              stroke="#f43f5e"
              strokeWidth={2.5}
            />

            {/* Annotated Marker 2: Severe Economy Breakdown */}
            <ReferenceDot
              yAxisId="econ"
              x={severePoint.overLabel}
              y={severePoint.economyRate}
              r={8}
              fill="#f43f5e"
              stroke="#ffffff"
              strokeWidth={2}
              label={
                <DegradationAnnotationLabel
                  headline={severePoint.markerHeadline || 'SEVERE BREAKDOWN'}
                  subtext={severePoint.markerSubtext || ''}
                  variant="severe"
                />
              }
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Annotated Degradation Checkpoints & Captain Rotation Verdict */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
        <button
          type="button"
          onClick={() => {
            cricketAudio.playUiClick();
            setInspectedIdx(0);
          }}
          className={`text-left rounded-xl border p-3.5 transition-colors cursor-pointer space-y-1 ${
            inspectedPoint.checkpointIndex === 0
              ? 'border-emerald-400/60 bg-slate-950'
              : 'border-slate-800 bg-slate-950/80 hover:border-slate-700'
          }`}
        >
          <div className="flex items-center justify-between text-emerald-300 font-semibold">
            <span className="inline-flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
              <span>Fresh Spell Peak ({openingPoint.overLabel})</span>
            </span>
            <span className="font-mono tabular-nums">{openingPoint.staminaPct}% Stamina</span>
          </div>
          <p className="text-base font-mono font-bold text-white tabular-nums">
            {openingPoint.economyRate.toFixed(2)} RPO · {openingPoint.releaseSpeedKmh} km/h
          </p>
          <p className="text-[11px] text-slate-300">
            {openingPoint.controlPrecisionPct}% release control — seam and length hit top of off-stump.
          </p>
        </button>

        <button
          type="button"
          onClick={() => {
            cricketAudio.playUiClick();
            setInspectedIdx(onsetPoint.checkpointIndex);
          }}
          className={`text-left rounded-xl border p-3.5 transition-colors cursor-pointer space-y-1 ${
            inspectedPoint.checkpointIndex === onsetPoint.checkpointIndex
              ? 'border-amber-400/70 bg-slate-950'
              : 'border-amber-500/30 bg-slate-950/80 hover:border-amber-400/50'
          }`}
        >
          <div className="flex items-center justify-between text-amber-300 font-semibold">
            <span className="inline-flex items-center gap-1.5">
              <TrendingUp className="h-3.5 w-3.5 shrink-0" />
              <span>Degradation Onset ({onsetPoint.overLabel})</span>
            </span>
            <span className="font-mono tabular-nums">{onsetPoint.staminaPct}% Stamina</span>
          </div>
          <p className="text-base font-mono font-bold text-white tabular-nums">
            {onsetPoint.economyRate.toFixed(2)} RPO (+{Math.max(0.1, onsetPoint.economyDelta).toFixed(2)} Δ)
          </p>
          <p className="text-[11px] text-slate-300">
            First annotated inflection: pace drops {onsetPoint.speedDropKmh} km/h and length misses
            feed boundary arcs.
          </p>
        </button>

        <button
          type="button"
          onClick={() => {
            cricketAudio.playUiClick();
            setInspectedIdx(severePoint.checkpointIndex);
          }}
          className={`text-left rounded-xl border p-3.5 transition-colors cursor-pointer space-y-1 ${
            inspectedPoint.checkpointIndex === severePoint.checkpointIndex
              ? 'border-rose-400/70 bg-slate-950'
              : 'border-rose-500/35 bg-slate-950/80 hover:border-rose-400/50'
          }`}
        >
          <div className="flex items-center justify-between text-rose-300 font-semibold">
            <span className="inline-flex items-center gap-1.5">
              <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
              <span>Severe Economy Surge ({severePoint.overLabel})</span>
            </span>
            <span className="font-mono tabular-nums">{severePoint.staminaPct}% Stamina</span>
          </div>
          <p className="text-base font-mono font-bold text-white tabular-nums">
            {severePoint.economyRate.toFixed(2)} RPO (+{Math.max(0.2, severePoint.economyDelta).toFixed(2)} Δ)
          </p>
          <p className="text-[11px] text-slate-300">
            Captain advisory: rotate bowler before {onsetPoint.overLabel} for a 2-over Cool-Down (+15%
            recovery).
          </p>
        </button>
      </div>

      {/* Selected Checkpoint Readout Strip */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-800 bg-slate-950/90 px-4 py-2.5 text-xs">
        <div className="flex flex-wrap items-center gap-2 text-slate-200">
          <Shield className="h-3.5 w-3.5 text-cyan-400 shrink-0" />
          <span className="font-semibold text-white">
            Inspected Checkpoint: {inspectedPoint.overLabel} (Ball #{inspectedPoint.spellBall})
          </span>
          <span aria-hidden="true" className="text-slate-600">
            ·
          </span>
          <span className="font-mono tabular-nums">
            Stamina <strong className="text-sky-300">{inspectedPoint.staminaPct}%</strong>
          </span>
          <span aria-hidden="true" className="text-slate-600">
            ·
          </span>
          <span className="font-mono tabular-nums">
            Control <strong className="text-emerald-300">{inspectedPoint.controlPrecisionPct}%</strong>
          </span>
          <span aria-hidden="true" className="text-slate-600">
            ·
          </span>
          <span className="font-mono tabular-nums">
            Econ <strong className="text-rose-300">{inspectedPoint.economyRate.toFixed(2)} RPO</strong>
          </span>
        </div>

        <span className="text-[11px] text-slate-400">
          Click any point along the multi-line graph to inspect delivery-level fatigue impact
        </span>
      </div>
    </div>
  );
};
