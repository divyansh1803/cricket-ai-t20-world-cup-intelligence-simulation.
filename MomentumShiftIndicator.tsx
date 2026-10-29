import React, { useState, useMemo } from 'react';
import { Stadium, BallEvent } from '../../types/cricket';
import { CricketIntelligenceEngine } from '../../engine/simulationEngine';
import { cricketAudio } from '../../utils/audioSystem';
import {
  TrendingUp,
  TrendingDown,
  Activity,
  Zap,
  Shield,
  ChevronDown,
  ChevronUp,
  Maximize2,
  Sparkles,
  Award,
  Layers,
  Info,
  X,
  BarChart3,
} from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  CartesianGrid,
  Legend,
  ReferenceArea,
} from 'recharts';

export interface MomentumShiftIndicatorProps {
  history: BallEvent[];
  stadium: Stadium;
  currentRuns: number;
  currentWickets: number;
  currentOvers: string | number;
  targetScore?: number;
  totalOvers?: number;
  isSecondInnings?: boolean;
  className?: string;
  defaultExpanded?: boolean;
  isExpanded?: boolean;
  onToggleExpand?: (expanded: boolean) => void;
  onOpenModal?: () => void;
  isModal?: boolean;
  onCloseModal?: () => void;
}

export const MomentumShiftIndicator: React.FC<MomentumShiftIndicatorProps> = ({
  history,
  stadium,
  currentRuns,
  currentWickets,
  currentOvers,
  targetScore = 180,
  totalOvers = 20,
  isSecondInnings = true,
  className = '',
  defaultExpanded = false,
  isExpanded: isExpandedProp,
  onToggleExpand,
  onOpenModal,
  isModal = false,
  onCloseModal,
}) => {
  const [localExpanded, setLocalExpanded] = useState<boolean>(defaultExpanded);
  const isControlled = isExpandedProp !== undefined;
  const isExpanded = isControlled ? isExpandedProp : localExpanded;

  const [chartViewMode, setChartViewMode] = useState<'svg' | 'recharts'>('svg');
  const [hoveredOver, setHoveredOver] = useState<number | null>(null);

  const toggleExpanded = () => {
    cricketAudio.playBatHit();
    if (onToggleExpand) {
      onToggleExpand(!isExpanded);
    }
    if (!isControlled) {
      setLocalExpanded(!localExpanded);
    }
  };

  // Parse numeric overs
  const parsedOvers = useMemo(() => {
    if (typeof currentOvers === 'number') return currentOvers;
    const parts = currentOvers.split('.');
    if (parts.length === 2) {
      return parseInt(parts[0], 10) + parseInt(parts[1], 10) / 6;
    }
    return parseFloat(currentOvers) || 0;
  }, [currentOvers]);

  // Historical Venue Run Rate Curve from Simulation Engine
  const venueHistoricalCurve = useMemo(() => {
    return CricketIntelligenceEngine.calculateVenueHistoricalRunRateCurve(stadium, totalOvers);
  }, [stadium, totalOvers]);

  // Aggregate live match history over by over
  const chartData = useMemo(() => {
    const ballsByOver: { [over: number]: BallEvent[] } = {};
    history.forEach((ball) => {
      const o = ball.overNumber !== undefined ? ball.overNumber : Math.floor((ball.totalBalls || 0) / 6);
      if (!ballsByOver[o]) ballsByOver[o] = [];
      ballsByOver[o].push(ball);
    });

    const activeMaxOver = Math.max(1, Math.min(totalOvers, Math.ceil(parsedOvers) || 1));
    let accumulatedRuns = 0;
    const points: Array<{
      over: number;
      liveCRR: number;
      historicalAvgRR: number;
      runsInOver: number;
      wicketsInOver: number;
      deltaRR: number;
      phase: 'powerplay' | 'middle' | 'death';
    }> = [];

    for (let o = 1; o <= totalOvers; o++) {
      const venuePoint = venueHistoricalCurve[o - 1] || {
        historicalAvgRR: (stadium?.avgFirstInningsScore || 168) / 20,
        phase: o <= 6 ? 'powerplay' : o <= 15 ? 'middle' : 'death',
      };

      if (o <= activeMaxOver) {
        const overBalls = ballsByOver[o - 1] || [];
        const runsThisOver = overBalls.reduce((acc, b) => acc + (b.runsScored || 0), 0);
        const wktsThisOver = overBalls.filter((b) => b.isWicket).length;
        accumulatedRuns += runsThisOver;

        // If this is the current over, use live currentRuns if accumulated is 0
        const effectiveRuns = accumulatedRuns > 0 ? accumulatedRuns : currentRuns;
        const liveCRR = Number((effectiveRuns / o).toFixed(2));
        const deltaRR = Number((liveCRR - venuePoint.historicalAvgRR).toFixed(2));

        points.push({
          over: o,
          liveCRR,
          historicalAvgRR: venuePoint.historicalAvgRR,
          runsInOver: runsThisOver,
          wicketsInOver: wktsThisOver,
          deltaRR,
          phase: venuePoint.phase,
        });
      } else {
        // Project forward trajectory using current CRR
        const baselineCRR = currentRuns > 0 && parsedOvers > 0 ? currentRuns / parsedOvers : 8.5;
        const projectedCRR = Number(baselineCRR.toFixed(2));
        const deltaRR = Number((projectedCRR - venuePoint.historicalAvgRR).toFixed(2));

        points.push({
          over: o,
          liveCRR: projectedCRR,
          historicalAvgRR: venuePoint.historicalAvgRR,
          runsInOver: 0,
          wicketsInOver: 0,
          deltaRR,
          phase: venuePoint.phase,
        });
      }
    }

    return points;
  }, [history, parsedOvers, totalOvers, currentRuns, venueHistoricalCurve, stadium]);

  // Current Momentum Delta
  const currentOverIndex = Math.min(totalOvers, Math.max(1, Math.ceil(parsedOvers)));
  const currentPoint = chartData[currentOverIndex - 1] || chartData[0];
  const deltaFromVenue = currentPoint ? currentPoint.deltaRR : 0;
  const isAheadOfVenue = deltaFromVenue >= 0;

  // SVG Chart Geometry
  const svgWidth = 440;
  const svgHeight = 160;
  const padding = { top: 20, right: 24, bottom: 28, left: 36 };
  const graphWidth = svgWidth - padding.left - padding.right;
  const graphHeight = svgHeight - padding.top - padding.bottom;

  // Min and Max Run Rates for scaling
  const allRRs = chartData.flatMap((d) => [d.liveCRR, d.historicalAvgRR]);
  const minRR = Math.max(3, Math.floor(Math.min(...allRRs) - 1));
  const maxRR = Math.min(18, Math.ceil(Math.max(...allRRs) + 1.5));

  const getX = (over: number) => padding.left + ((over - 1) / (totalOvers - 1)) * graphWidth;
  const getY = (rr: number) => padding.top + (1 - (rr - minRR) / (maxRR - minRR)) * graphHeight;

  // Build SVG Path strings
  const livePoints = chartData.slice(0, currentOverIndex);
  const livePath = livePoints
    .map((pt, i) => `${i === 0 ? 'M' : 'L'} ${getX(pt.over).toFixed(1)} ${getY(pt.liveCRR).toFixed(1)}`)
    .join(' ');

  // Projected dotted path forward
  const projectedPoints = chartData.slice(currentOverIndex - 1);
  const projectedPath = projectedPoints
    .map((pt, i) => `${i === 0 ? 'M' : 'L'} ${getX(pt.over).toFixed(1)} ${getY(pt.liveCRR).toFixed(1)}`)
    .join(' ');

  const venuePath = chartData
    .map((pt, i) => `${i === 0 ? 'M' : 'L'} ${getX(pt.over).toFixed(1)} ${getY(pt.historicalAvgRR).toFixed(1)}`)
    .join(' ');

  // Area under live path for gradient glow
  const liveAreaPath = livePoints.length > 1
    ? `${livePath} L ${getX(livePoints[livePoints.length - 1].over)} ${padding.top + graphHeight} L ${getX(livePoints[0].over)} ${padding.top + graphHeight} Z`
    : '';

  return (
    <div
      className={`rounded-2xl border border-cyan-500/30 bg-slate-950/92 backdrop-blur-md shadow-2xl transition-all duration-300 ${
        isExpanded ? 'p-4 sm:p-5' : 'p-3'
      } ${className}`}
    >
      {/* Top Banner: Momentum Shift Telemetry Header */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div
            className={`h-7 w-7 rounded-lg flex items-center justify-center border shadow-sm ${
              isAheadOfVenue
                ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400 shadow-emerald-500/20'
                : 'bg-amber-500/20 border-amber-500/40 text-amber-400 shadow-amber-500/20'
            }`}
          >
            {isAheadOfVenue ? (
              <TrendingUp className="h-4 w-4 animate-pulse" />
            ) : (
              <TrendingDown className="h-4 w-4 animate-pulse" />
            )}
          </div>

          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono font-bold tracking-widest text-cyan-400 uppercase">
                MOMENTUM SHIFT INDICATOR
              </span>
              <span className="text-[9px] font-mono px-1.5 py-0.2 rounded-full bg-slate-900 border border-slate-700 text-slate-400">
                {stadium.name}
              </span>
            </div>

            <div className="flex items-baseline gap-2 mt-0.5">
              <span className="text-sm font-black text-white font-mono">
                {currentPoint ? currentPoint.liveCRR : '0.00'}{' '}
                <span className="text-[10px] font-normal text-slate-400">CRR</span>
              </span>
              <span className="text-slate-600 font-mono">vs</span>
              <span className="text-xs font-bold text-amber-400 font-mono">
                {currentPoint ? currentPoint.historicalAvgRR : '0.00'}{' '}
                <span className="text-[10px] font-normal text-amber-300/70">Venue Par</span>
              </span>
              <span
                className={`text-[11px] font-mono font-bold px-1.5 py-0.2 rounded ${
                  isAheadOfVenue
                    ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                    : 'bg-rose-500/15 text-rose-300 border border-rose-500/30'
                }`}
              >
                {isAheadOfVenue ? `+${deltaFromVenue}` : deltaFromVenue} RPO Shift
              </span>
            </div>
          </div>
        </div>

        {/* Action Toggles */}
        <div className="flex items-center gap-1.5">
          {isExpanded && (
            <div className="hidden sm:flex items-center rounded-lg border border-slate-800 bg-slate-900/90 p-0.5 text-[10px] font-mono">
              <button
                type="button"
                onClick={() => {
                  cricketAudio.playBatHit();
                  setChartViewMode('svg');
                }}
                className={`px-2 py-0.5 rounded cursor-pointer transition-colors ${
                  chartViewMode === 'svg'
                    ? 'bg-cyan-500 text-slate-950 font-bold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                SVG Glow
              </button>
              <button
                type="button"
                onClick={() => {
                  cricketAudio.playBatHit();
                  setChartViewMode('recharts');
                }}
                className={`px-2 py-0.5 rounded cursor-pointer transition-colors ${
                  chartViewMode === 'recharts'
                    ? 'bg-cyan-500 text-slate-950 font-bold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Recharts
              </button>
            </div>
          )}

          {onOpenModal && !isModal && (
            <button
              type="button"
              onClick={() => {
                cricketAudio.playBatHit();
                onOpenModal();
              }}
              className="flex items-center justify-center p-1.5 rounded-lg border border-slate-800 bg-slate-900/80 text-slate-400 hover:text-cyan-300 hover:border-cyan-500/50 transition-all cursor-pointer shadow-sm"
              title="Expand full dialog view"
            >
              <Maximize2 className="h-3.5 w-3.5" />
            </button>
          )}

          <button
            type="button"
            onClick={toggleExpanded}
            className="flex items-center gap-1 rounded-lg border border-slate-800 bg-slate-900/80 px-2.5 py-1 text-[11px] font-mono font-bold text-slate-300 hover:text-white hover:border-cyan-500/50 transition-all cursor-pointer shadow-sm"
          >
            <span>{isExpanded ? 'Compact' : 'Dual-Line Chart'}</span>
            {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          </button>

          {isModal && onCloseModal && (
            <button
              type="button"
              onClick={() => {
                cricketAudio.playBatHit();
                onCloseModal();
              }}
              className="flex items-center justify-center p-1.5 rounded-lg border border-slate-800 bg-slate-900/80 text-slate-400 hover:text-rose-400 hover:border-rose-500/50 transition-all cursor-pointer shadow-sm"
              title="Close modal"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Dynamic Summary Strip (When collapsed or expanded) */}
      <div className="mt-2.5 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] font-mono">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5 text-cyan-300">
            <span className="h-2 w-2 rounded-full bg-cyan-400 shadow-[0_0_8px_#38bdf8]" />
            <span>Live Match Trajectory</span>
          </span>
          <span className="flex items-center gap-1.5 text-amber-400">
            <span className="h-1.5 w-3 border-b-2 border-dashed border-amber-400" />
            <span>Historical Venue Avg (1st Inn: {stadium.avgFirstInningsScore})</span>
          </span>
        </div>

        <span
          className={`font-bold ${
            isAheadOfVenue ? 'text-emerald-400' : 'text-amber-300'
          }`}
        >
          {isAheadOfVenue
            ? '🔥 POSITIVE MOMENTUM SURGE'
            : '⚠️ RUN FLOW UNDER PRESSURE'}
        </span>
      </div>

      {/* Expanded Dual-Line SVG Chart */}
      {isExpanded && (
        <div className="mt-3.5 space-y-3 animate-in fade-in duration-200">
          {/* Phase Indicators Ribbon */}
          <div className="grid grid-cols-3 gap-1.5 text-center text-[10px] font-mono">
            <div className="rounded-lg bg-sky-950/40 border border-sky-500/30 p-1.5 text-sky-300">
              <span className="font-bold block">POWERPLAY (OV 1-6)</span>
              <span className="text-[9px] text-slate-400">Restrictions On · 8.4 RPO Avg</span>
            </div>
            <div className="rounded-lg bg-purple-950/40 border border-purple-500/30 p-1.5 text-purple-300">
              <span className="font-bold block">MIDDLE OVERS (OV 7-15)</span>
              <span className="text-[9px] text-slate-400">Spin Strangle · 7.6 RPO Avg</span>
            </div>
            <div className="rounded-lg bg-rose-950/40 border border-rose-500/30 p-1.5 text-rose-300">
              <span className="font-bold block">DEATH SLOG (OV 16-20)</span>
              <span className="text-[9px] text-slate-400">Maximum Risk · 10.8 RPO Avg</span>
            </div>
          </div>

          {/* Dual-Line Chart: SVG Vector or Recharts Mode */}
          <div className="relative rounded-xl border border-slate-800 bg-slate-950/90 p-2 overflow-hidden shadow-inner">
            {chartViewMode === 'recharts' ? (
              <div className="w-full h-52 sm:h-56 pt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData} margin={{ top: 12, right: 16, left: -14, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis
                      dataKey="over"
                      stroke="#64748b"
                      tick={{ fontSize: 10, fill: '#94a3b8', fontFamily: 'monospace' }}
                      tickFormatter={(ov) => `Ov ${ov}`}
                    />
                    <YAxis
                      stroke="#64748b"
                      tick={{ fontSize: 10, fill: '#94a3b8', fontFamily: 'monospace' }}
                      domain={[minRR, maxRR]}
                    />
                    <ReferenceArea
                      x1={1}
                      x2={6}
                      fill="rgba(56, 189, 248, 0.08)"
                      strokeOpacity={0}
                      label={{ value: 'POWERPLAY', fill: '#38bdf8', fontSize: 9, position: 'insideTopLeft' }}
                    />
                    <ReferenceArea
                      x1={6}
                      x2={15}
                      fill="rgba(168, 85, 247, 0.06)"
                      strokeOpacity={0}
                      label={{ value: 'MIDDLE OVERS', fill: '#a855f7', fontSize: 9, position: 'insideTopLeft' }}
                    />
                    <ReferenceArea
                      x1={15}
                      x2={20}
                      fill="rgba(244, 63, 94, 0.08)"
                      strokeOpacity={0}
                      label={{ value: 'DEATH SLOG', fill: '#f43f5e', fontSize: 9, position: 'insideTopLeft' }}
                    />
                    <RechartsTooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const pt = payload[0].payload as any;
                          const delta = pt.deltaRR;
                          return (
                            <div className="rounded-xl border border-cyan-500/40 bg-slate-950/95 p-3 text-xs font-mono space-y-1 shadow-2xl backdrop-blur-md">
                              <div className="flex justify-between items-center gap-4 text-[10px] text-slate-400 border-b border-slate-800 pb-1">
                                <span>OVER {pt.over}</span>
                                <span className="uppercase text-cyan-400 font-bold">{pt.phase}</span>
                              </div>
                              <div className="text-cyan-300 font-bold">
                                Live Match CRR: {pt.liveCRR} RPO
                              </div>
                              <div className="text-amber-400">
                                Venue Historical Par: {pt.historicalAvgRR} RPO
                              </div>
                              <div className={delta >= 0 ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>
                                Momentum Shift: {delta >= 0 ? `+${delta}` : delta} RPO
                              </div>
                              {pt.runsInOver > 0 && (
                                <div className="text-slate-400 text-[10px]">
                                  This Over: {pt.runsInOver} runs {pt.wicketsInOver > 0 ? `· ${pt.wicketsInOver} W` : ''}
                                </div>
                              )}
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: 11, fontFamily: 'monospace', paddingTop: 4 }} />
                    <Line
                      type="monotone"
                      dataKey="liveCRR"
                      name="Live Match CRR"
                      stroke="#06b6d4"
                      strokeWidth={3}
                      dot={{ r: 3, fill: '#06b6d4' }}
                      activeDot={{ r: 6, fill: '#ffffff', stroke: '#06b6d4' }}
                    />
                    <Line
                      type="monotone"
                      dataKey="historicalAvgRR"
                      name={`Historical Venue Par (${stadium.name.split(' ')[0]})`}
                      stroke="#f59e0b"
                      strokeWidth={2}
                      strokeDasharray="4 4"
                      dot={{ r: 2.5, fill: '#f59e0b' }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <>
                <svg
                  viewBox={`0 0 ${svgWidth} ${svgHeight}`}
                  className="w-full h-44 sm:h-48 overflow-visible select-none"
                >
                  <defs>
                    <linearGradient id="liveAreaGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.35" />
                      <stop offset="100%" stopColor="#06b6d4" stopOpacity="0.0" />
                    </linearGradient>

                    <linearGradient id="liveStrokeGradient" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="#06b6d4" />
                      <stop offset="100%" stopColor="#10b981" />
                    </linearGradient>
                  </defs>

                  {/* Phase Background Shading */}
                  <rect
                    x={getX(1)}
                    y={padding.top}
                    width={getX(6) - getX(1)}
                    height={graphHeight}
                    fill="rgba(56, 189, 248, 0.05)"
                  />
                  <rect
                    x={getX(6)}
                    y={padding.top}
                    width={getX(15) - getX(6)}
                    height={graphHeight}
                    fill="rgba(168, 85, 247, 0.05)"
                  />
                  <rect
                    x={getX(15)}
                    y={padding.top}
                    width={getX(20) - getX(15)}
                    height={graphHeight}
                    fill="rgba(244, 63, 94, 0.05)"
                  />

                  {/* Horizontal Gridlines & Y-Axis Labels */}
                  {[minRR, (minRR + maxRR) / 2, maxRR].map((val) => {
                    const y = getY(val);
                    return (
                      <g key={val}>
                        <line
                          x1={padding.left}
                          y1={y}
                          x2={svgWidth - padding.right}
                          y2={y}
                          stroke="#1e293b"
                          strokeWidth={1}
                          strokeDasharray="4 4"
                        />
                        <text
                          x={padding.left - 6}
                          y={y + 3}
                          fill="#64748b"
                          fontSize={9}
                          textAnchor="end"
                          fontFamily="monospace"
                        >
                          {val.toFixed(1)}
                        </text>
                      </g>
                    );
                  })}

                  {/* X-Axis Overs Ticks */}
                  {[1, 6, 10, 15, 20].map((ov) => {
                    const x = getX(ov);
                    return (
                      <g key={ov}>
                        <line
                          x1={x}
                          y1={padding.top}
                          x2={x}
                          y2={padding.top + graphHeight}
                          stroke="#1e293b"
                          strokeWidth={1}
                        />
                        <text
                          x={x}
                          y={padding.top + graphHeight + 16}
                          fill="#94a3b8"
                          fontSize={10}
                          textAnchor="middle"
                          fontFamily="monospace"
                          fontWeight="bold"
                        >
                          Ov {ov}
                        </text>
                      </g>
                    );
                  })}

                  {/* 1. Area fill under live line */}
                  {liveAreaPath && (
                    <path d={liveAreaPath} fill="url(#liveAreaGradient)" />
                  )}

                  {/* 2. Venue Historical Average Line (Golden Amber, Dashed) */}
                  <path
                    d={venuePath}
                    fill="none"
                    stroke="#f59e0b"
                    strokeWidth={2}
                    strokeDasharray="5 4"
                    strokeLinecap="round"
                  />

                  {/* 3. Projected Future Run Rate Line (Dotted Cyan) */}
                  {projectedPath && (
                    <path
                      d={projectedPath}
                      fill="none"
                      stroke="#06b6d4"
                      strokeWidth={2}
                      strokeDasharray="3 3"
                      opacity={0.65}
                    />
                  )}

                  {/* 4. Live Match CRR Line (Solid Neon Cyan-to-Emerald) */}
                  {livePath && (
                    <path
                      d={livePath}
                      fill="none"
                      stroke="url(#liveStrokeGradient)"
                      strokeWidth={3}
                      strokeLinecap="round"
                      filter="drop-shadow(0 0 6px rgba(6, 182, 212, 0.8))"
                    />
                  )}

                  {/* Data Point Nodes for Live Overs */}
                  {chartData.map((pt) => {
                    const x = getX(pt.over);
                    const yLive = getY(pt.liveCRR);
                    const yVenue = getY(pt.historicalAvgRR);
                    const isCurrent = pt.over === currentOverIndex;
                    const isHovered = pt.over === hoveredOver;

                    return (
                      <g key={pt.over} onMouseEnter={() => setHoveredOver(pt.over)} onMouseLeave={() => setHoveredOver(null)}>
                        {/* Venue node */}
                        <circle
                          cx={x}
                          cy={yVenue}
                          r={isHovered ? 4 : 2.5}
                          fill="#f59e0b"
                          stroke="#0f172a"
                          strokeWidth={1.5}
                        />

                        {/* Live node */}
                        {pt.over <= currentOverIndex && (
                          <circle
                            cx={x}
                            cy={yLive}
                            r={isCurrent ? 6 : isHovered ? 5 : 3.5}
                            fill={isCurrent ? '#ffffff' : '#06b6d4'}
                            stroke="#0f172a"
                            strokeWidth={2}
                            className={isCurrent ? 'animate-pulse' : ''}
                          />
                        )}
                      </g>
                    );
                  })}
                </svg>

                {/* Hover Tooltip Overlay */}
                {hoveredOver !== null && chartData[hoveredOver - 1] && (
                  <div
                    className="absolute top-3 right-3 rounded-xl border border-cyan-500/40 bg-slate-900/95 p-2.5 text-xs font-mono shadow-2xl backdrop-blur-md pointer-events-none"
                  >
                    <div className="flex items-center justify-between gap-4 border-b border-slate-800 pb-1 text-[10px] text-slate-400">
                      <span>OVER {hoveredOver}</span>
                      <span className="uppercase text-cyan-400 font-bold">
                        {chartData[hoveredOver - 1].phase}
                      </span>
                    </div>
                    <div className="mt-1.5 space-y-1 text-[11px]">
                      <div className="flex justify-between gap-3 text-cyan-300 font-bold">
                        <span>Live Match CRR:</span>
                        <span>{chartData[hoveredOver - 1].liveCRR} RPO</span>
                      </div>
                      <div className="flex justify-between gap-3 text-amber-300">
                        <span>Venue Historical Par:</span>
                        <span>{chartData[hoveredOver - 1].historicalAvgRR} RPO</span>
                      </div>
                      <div className="flex justify-between gap-3 text-slate-300 border-t border-slate-800/80 pt-1">
                        <span>Momentum Shift:</span>
                        <span
                          className={
                            chartData[hoveredOver - 1].deltaRR >= 0
                              ? 'text-emerald-400 font-bold'
                              : 'text-rose-400 font-bold'
                          }
                        >
                          {chartData[hoveredOver - 1].deltaRR >= 0 ? '+' : ''}
                          {chartData[hoveredOver - 1].deltaRR} RPO
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Tactical Takeaways Bar */}
          <div className="rounded-xl border border-slate-800/90 bg-slate-900/50 p-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs font-mono">
            <div className="space-y-0.5">
              <span className="text-[10px] text-slate-400 block font-bold uppercase">
                HISTORICAL VENUE MATRIX · {stadium.name.toUpperCase()}
              </span>
              <p className="text-[11px] text-slate-300 font-sans leading-relaxed">
                {isAheadOfVenue ? (
                  <>
                    Batting side is tracking{' '}
                    <strong className="text-emerald-400">+{deltaFromVenue} RPO above par</strong>. At this velocity, expected total reaches{' '}
                    <strong className="text-white">
                      {Math.round(currentPoint.liveCRR * 20)} runs
                    </strong>{' '}
                    (historical venue median: {stadium.avgFirstInningsScore}).
                  </>
                ) : (
                  <>
                    Batting side is lagging{' '}
                    <strong className="text-amber-400">{deltaFromVenue} RPO below par</strong>. Historical data indicates a wicket risk surge if boundary frequency is not escalated before over 15.
                  </>
                )}
              </p>
            </div>

            <div className="shrink-0 flex items-center gap-2">
              <span className="text-[10px] px-2 py-1 rounded bg-slate-800 text-slate-300 font-bold">
                Pitch: {stadium.pitchType}
              </span>
              <span className="text-[10px] px-2 py-1 rounded bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 font-bold">
                Boundary: {stadium.boundarySizeMeters ? `${stadium.boundarySizeMeters.straight}m / ${stadium.boundarySizeMeters.square}m` : '70m'}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
