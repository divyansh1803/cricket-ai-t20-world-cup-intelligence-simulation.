import React, { useEffect, useMemo, useRef, useState } from 'react';
import * as d3 from 'd3';
import { BallEvent, Team } from '../../types/cricket';
import { TeamFlag } from '../common/CricketIdentity';
import { TrendingUp, Activity } from 'lucide-react';

export interface WinProbOscillationPoint {
  step: number;
  ballLabel: string;
  overFloat: number;
  winProb: number;
  delta: number;
  scoreLabel: string;
  isWicket: boolean;
  isBoundary: boolean;
  outcomeToken: string;
  batterName: string;
  bowlerName: string;
  conditionNote?: string;
}

interface WinProbabilityD3ChartProps {
  battingTeam: Team;
  bowlingTeam: Team;
  events: BallEvent[];
  winProbHistory: number[];
  liveWinProb: number;
  maxOvers: number;
  inningsNumber: 1 | 2 | 3 | 4;
  conditionLabel?: string;
  compact?: boolean;
}

export const WinProbabilityD3Chart: React.FC<WinProbabilityD3ChartProps> = ({
  battingTeam,
  bowlingTeam,
  events,
  winProbHistory,
  liveWinProb,
  maxOvers,
  inningsNumber,
  conditionLabel = 'Standard',
  compact = false,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [chartWidth, setChartWidth] = useState<number>(620);
  const [hoveredPoint, setHoveredPoint] = useState<WinProbOscillationPoint | null>(null);

  // Measure container width responsively
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const updateSize = () => {
      const w = el.getBoundingClientRect().width;
      if (w > 120) setChartWidth(Math.floor(w));
    };
    updateSize();
    const observer = new ResizeObserver(updateSize);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Build structured oscillation series from ball events + live condition-adjusted endpoint
  const series = useMemo<WinProbOscillationPoint[]>(() => {
    const initialProb = winProbHistory[0] ?? 50;
    const pts: WinProbOscillationPoint[] = [
      {
        step: 0,
        ballLabel: '0.0',
        overFloat: 0,
        winProb: events.length === 0 ? liveWinProb : initialProb,
        delta: 0,
        scoreLabel: '0/0',
        isWicket: false,
        isBoundary: false,
        outcomeToken: 'START',
        batterName: 'Opening Pair',
        bowlerName: 'New Ball',
      },
    ];

    let legalCounter = 0;
    events.forEach((ev, idx) => {
      if (ev.isLegalDelivery !== false) {
        legalCounter += 1;
      }
      const isLast = idx === events.length - 1;
      const rawProb = isLast ? liveWinProb : ev.winProbA ?? winProbHistory[idx + 1] ?? liveWinProb;
      const clampedProb = Math.max(1, Math.min(99, Number(rawProb.toFixed(1))));
      const prevProb = pts[pts.length - 1]?.winProb ?? 50;
      const delta = Number((clampedProb - prevProb).toFixed(1));

      pts.push({
        step: idx + 1,
        ballLabel: `${ev.overNumber}.${ev.ballInOver}`,
        overFloat: Number((legalCounter / 6).toFixed(3)),
        winProb: clampedProb,
        delta,
        scoreLabel: ev.scoreAtBall || '—',
        isWicket: Boolean(ev.isWicket),
        isBoundary: ev.outcome === '4' || ev.outcome === '6' || (ev.batterRuns ?? 0) >= 4,
        outcomeToken: ev.displayToken || ev.outcome,
        batterName: ev.batter?.name || 'Batter',
        bowlerName: ev.bowler?.name || 'Bowler',
      });
    });

    return pts;
  }, [events, winProbHistory, liveWinProb]);

  // Oscillation summary telemetry
  const statsSummary = useMemo(() => {
    const probs = series.map((p) => p.winProb);
    const peak = Math.max(...probs);
    const trough = Math.min(...probs);
    let leadChanges = 0;
    for (let i = 1; i < series.length; i++) {
      const prevAbove = series[i - 1].winProb >= 50;
      const currAbove = series[i].winProb >= 50;
      if (prevAbove !== currAbove) leadChanges += 1;
    }
    const biggestSwing = series.reduce<WinProbOscillationPoint | null>((best, pt) => {
      if (pt.step === 0) return best;
      if (!best || Math.abs(pt.delta) > Math.abs(best.delta)) return pt;
      return best;
    }, null);

    return {
      peak: peak.toFixed(1),
      trough: trough.toFixed(1),
      leadChanges,
      biggestSwing,
    };
  }, [series]);

  const chartHeight = compact ? 185 : 230;

  // Render dynamic D3.js SVG chart
  useEffect(() => {
    const svgEl = svgRef.current;
    if (!svgEl) return;

    const svg = d3.select(svgEl);
    svg.selectAll('*').remove();

    const margin = {
      top: 16,
      right: 18,
      bottom: 28,
      left: 38,
    };
    const innerW = Math.max(100, chartWidth - margin.left - margin.right);
    const innerH = Math.max(80, chartHeight - margin.top - margin.bottom);

    const maxObservedOver = Math.max(
      maxOvers <= 5 ? maxOvers : 6,
      d3.max(series, (d) => d.overFloat) || 1
    );
    const xDomainMax = Math.min(maxOvers, Math.max(maxObservedOver + 0.5, series.length <= 2 ? maxOvers : maxObservedOver));

    const xScale = d3
      .scaleLinear()
      .domain([0, xDomainMax])
      .range([0, innerW]);

    const yScale = d3
      .scaleLinear()
      .domain([0, 100])
      .range([innerH, 0]);

    const defs = svg.append('defs');

    // Gradient above 50% (Batting Team Dominance - Cyan)
    const gradAbove = defs
      .append('linearGradient')
      .attr('id', `win-prob-above-${inningsNumber}-${compact ? 'sm' : 'lg'}`)
      .attr('x1', '0%')
      .attr('y1', '0%')
      .attr('x2', '0%')
      .attr('y2', '100%');
    gradAbove.append('stop').attr('offset', '0%').attr('stop-color', '#22d3ee').attr('stop-opacity', 0.36);
    gradAbove.append('stop').attr('offset', '100%').attr('stop-color', '#22d3ee').attr('stop-opacity', 0.02);

    // Gradient below 50% (Bowling Team Dominance - Amber)
    const gradBelow = defs
      .append('linearGradient')
      .attr('id', `win-prob-below-${inningsNumber}-${compact ? 'sm' : 'lg'}`)
      .attr('x1', '0%')
      .attr('y1', '0%')
      .attr('x2', '0%')
      .attr('y2', '100%');
    gradBelow.append('stop').attr('offset', '0%').attr('stop-color', '#f59e0b').attr('stop-opacity', 0.02);
    gradBelow.append('stop').attr('offset', '100%').attr('stop-color', '#f59e0b').attr('stop-opacity', 0.32);

    // Clip paths split at y = 50%
    const midY = yScale(50);
    defs
      .append('clipPath')
      .attr('id', `clip-above-${inningsNumber}-${compact ? 'sm' : 'lg'}`)
      .append('rect')
      .attr('x', 0)
      .attr('y', 0)
      .attr('width', innerW)
      .attr('height', midY);

    defs
      .append('clipPath')
      .attr('id', `clip-below-${inningsNumber}-${compact ? 'sm' : 'lg'}`)
      .append('rect')
      .attr('x', 0)
      .attr('y', midY)
      .attr('width', innerW)
      .attr('height', innerH - midY);

    const root = svg
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    // Subtle horizontal grid lines (25%, 50%, 75%)
    [25, 50, 75].forEach((tickVal) => {
      root
        .append('line')
        .attr('x1', 0)
        .attr('x2', innerW)
        .attr('y1', yScale(tickVal))
        .attr('y2', yScale(tickVal))
        .attr('stroke', tickVal === 50 ? '#475569' : '#1e293b')
        .attr('stroke-width', tickVal === 50 ? 1.25 : 1)
        .attr('stroke-dasharray', tickVal === 50 ? '4 4' : '2 3');
    });

    // Phase divider lines for T20 (Powerplay 6 ov, Death 15 ov)
    if (maxOvers >= 15) {
      [6, 15].forEach((phaseOv) => {
        if (phaseOv <= xDomainMax) {
          root
            .append('line')
            .attr('x1', xScale(phaseOv))
            .attr('x2', xScale(phaseOv))
            .attr('y1', 0)
            .attr('y2', innerH)
            .attr('stroke', '#1e293b')
            .attr('stroke-width', 1)
            .attr('stroke-dasharray', '3 3');
        }
      });
    }

    // D3 Axes
    const xAxis = d3
      .axisBottom(xScale)
      .ticks(compact ? 5 : 8)
      .tickFormat((d) => `${d} ov`);
    const yAxis = d3
      .axisLeft(yScale)
      .tickValues([0, 25, 50, 75, 100])
      .tickFormat((d) => `${d}%`);

    const gx = root
      .append('g')
      .attr('transform', `translate(0,${innerH})`)
      .call(xAxis);
    gx.selectAll('text')
      .attr('fill', '#94a3b8')
      .attr('font-family', 'monospace')
      .attr('font-size', '9px');
    gx.selectAll('line, path').attr('stroke', '#334155');

    const gy = root.append('g').call(yAxis);
    gy.selectAll('text')
      .attr('fill', '#94a3b8')
      .attr('font-family', 'monospace')
      .attr('font-size', '9px');
    gy.selectAll('line, path').attr('stroke', '#334155');

    // Area & Line Generators using D3 curveMonotoneX
    const areaAboveGen = d3
      .area<WinProbOscillationPoint>()
      .x((d, i) => (series.length === 1 ? innerW * 0.12 : xScale(d.overFloat || i * 0.05)))
      .y0(midY)
      .y1((d) => yScale(d.winProb))
      .curve(d3.curveMonotoneX);

    const lineGen = d3
      .line<WinProbOscillationPoint>()
      .x((d, i) => (series.length === 1 ? innerW * 0.12 : xScale(d.overFloat || i * 0.05)))
      .y((d) => yScale(d.winProb))
      .curve(d3.curveMonotoneX);

    if (series.length > 1) {
      root
        .append('path')
        .datum(series)
        .attr('clip-path', `url(#clip-above-${inningsNumber}-${compact ? 'sm' : 'lg'})`)
        .attr('fill', `url(#win-prob-above-${inningsNumber}-${compact ? 'sm' : 'lg'})`)
        .attr('d', areaAboveGen);

      root
        .append('path')
        .datum(series)
        .attr('clip-path', `url(#clip-below-${inningsNumber}-${compact ? 'sm' : 'lg'})`)
        .attr('fill', `url(#win-prob-below-${inningsNumber}-${compact ? 'sm' : 'lg'})`)
        .attr('d', areaAboveGen);

      root
        .append('path')
        .datum(series)
        .attr('fill', 'none')
        .attr('stroke', '#22d3ee')
        .attr('stroke-width', 2.25)
        .attr('d', lineGen);
    } else {
      // Pre-match / 0-ball projected equilibrium guide line
      const startProbY = yScale(series[0].winProb);
      root
        .append('line')
        .attr('x1', 0)
        .attr('x2', innerW)
        .attr('y1', startProbY)
        .attr('y2', startProbY)
        .attr('stroke', '#22d3ee')
        .attr('stroke-width', 2)
        .attr('stroke-dasharray', '5 4');
    }

    // Wicket & High-Swing Nodes
    const keyPoints = series.filter(
      (d, idx) =>
        idx === series.length - 1 ||
        d.isWicket ||
        Math.abs(d.delta) >= 5
    );

    root
      .selectAll('.osc-node')
      .data(keyPoints)
      .enter()
      .append('circle')
      .attr('class', 'osc-node')
      .attr('cx', (d) => (series.length === 1 ? 0 : xScale(d.overFloat)))
      .attr('cy', (d) => yScale(d.winProb))
      .attr('r', (d, idx) =>
        d.isWicket ? 4.5 : idx === keyPoints.length - 1 ? 4.5 : 3.2
      )
      .attr('fill', (d) =>
        d.isWicket ? '#fb7185' : d.delta >= 5 ? '#34d399' : '#22d3ee'
      )
      .attr('stroke', '#020617')
      .attr('stroke-width', 1.5);

    // Interactive Crosshair Group
    const focusGroup = root.append('g').style('display', 'none');
    const vLine = focusGroup
      .append('line')
      .attr('y1', 0)
      .attr('y2', innerH)
      .attr('stroke', '#94a3b8')
      .attr('stroke-width', 1)
      .attr('stroke-dasharray', '3 3');

    const focusDot = focusGroup
      .append('circle')
      .attr('r', 5)
      .attr('fill', '#ffffff')
      .attr('stroke', '#22d3ee')
      .attr('stroke-width', 2);

    const bisectOver = d3.bisector<WinProbOscillationPoint, number>((d) => d.overFloat).left;

    root
      .append('rect')
      .attr('width', innerW)
      .attr('height', innerH)
      .attr('fill', 'transparent')
      .style('cursor', 'crosshair')
      .on('mousemove', (event) => {
        if (series.length === 0) return;
        const [mx] = d3.pointer(event);
        const hoveredOver = xScale.invert(mx);
        const i = bisectOver(series, hoveredOver, 1);
        const d0 = series[i - 1];
        const d1 = series[i];
        const chosen =
          !d1 || Math.abs(hoveredOver - d0.overFloat) <= Math.abs(d1.overFloat - hoveredOver)
            ? d0
            : d1;

        const cx = series.length === 1 ? 0 : xScale(chosen.overFloat);
        const cy = yScale(chosen.winProb);
        focusGroup.style('display', null);
        vLine.attr('x1', cx).attr('x2', cx);
        focusDot.attr('cx', cx).attr('cy', cy);
        setHoveredPoint(chosen);
      })
      .on('mouseleave', () => {
        focusGroup.style('display', 'none');
        setHoveredPoint(null);
      });
  }, [series, chartWidth, chartHeight, maxOvers, inningsNumber, compact]);

  const displayPoint = hoveredPoint || series[series.length - 1];

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950/95 p-4 space-y-3">
      {/* Header Row */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/80 pb-2.5">
        <div className="flex items-center gap-2 min-w-0">
          <TrendingUp className="h-4 w-4 text-cyan-400 shrink-0" />
          <span className="text-xs font-mono font-bold text-white truncate">
            D3 Win Probability Oscillation
          </span>
          <span className="text-[11px] font-mono text-slate-400 hidden sm:inline">
            · Innings {inningsNumber} · {conditionLabel}
          </span>
        </div>

        <div className="flex items-center gap-3 text-[11px] font-mono tabular-nums shrink-0">
          <span className="inline-flex items-center gap-1.5 text-cyan-300 font-bold">
            <TeamFlag code={battingTeam.id} size="xs" />
            <span>{battingTeam.shortName} {liveWinProb.toFixed(1)}%</span>
          </span>
          <span className="text-slate-600">·</span>
          <span className="inline-flex items-center gap-1.5 text-amber-300 font-bold">
            <span>{bowlingTeam.shortName} {(100 - liveWinProb).toFixed(1)}%</span>
            <TeamFlag code={bowlingTeam.id} size="xs" />
          </span>
        </div>
      </div>

      {/* Responsive D3 SVG Canvas */}
      <div ref={containerRef} className="w-full overflow-hidden">
        <svg
          ref={svgRef}
          width={chartWidth}
          height={chartHeight}
          className="w-full block select-none"
          role="img"
          aria-label={`D3 Win Probability Oscillation chart for ${battingTeam.name} vs ${bowlingTeam.name}`}
        />
      </div>

      {/* Interactive Crosshair Telemetry & Oscillation Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] font-mono tabular-nums border-t border-slate-800/80 pt-2.5">
        <div className="rounded-lg bg-slate-900/80 border border-slate-800/80 px-2.5 py-1.5">
          <span className="text-[9px] text-slate-400 block">
            {hoveredPoint ? `INSPECTED (${displayPoint.ballLabel} OV)` : `CURRENT (${displayPoint.ballLabel} OV)`}
          </span>
          <strong className="text-white text-xs">
            {displayPoint.scoreLabel} · {displayPoint.winProb}%
          </strong>
        </div>

        <div className="rounded-lg bg-slate-900/80 border border-slate-800/80 px-2.5 py-1.5">
          <span className="text-[9px] text-slate-400 block">BALL SWING DELTA</span>
          <strong
            className={`text-xs ${
              displayPoint.delta > 0
                ? 'text-emerald-400'
                : displayPoint.delta < 0
                ? 'text-rose-400'
                : 'text-slate-300'
            }`}
          >
            {displayPoint.delta > 0 ? `+${displayPoint.delta}%` : `${displayPoint.delta}%`} ({displayPoint.outcomeToken})
          </strong>
        </div>

        <div className="rounded-lg bg-slate-900/80 border border-slate-800/80 px-2.5 py-1.5">
          <span className="text-[9px] text-slate-400 block">PEAK / TROUGH</span>
          <strong className="text-cyan-300 text-xs">
            {statsSummary.peak}% / {statsSummary.trough}%
          </strong>
        </div>

        <div className="rounded-lg bg-slate-900/80 border border-slate-800/80 px-2.5 py-1.5">
          <span className="text-[9px] text-slate-400 block">LEAD SWINGS</span>
          <strong className="text-amber-300 text-xs flex items-center gap-1">
            <Activity className="h-3 w-3 text-amber-400 shrink-0" />
            <span>{statsSummary.leadChanges} Crossings</span>
          </strong>
        </div>
      </div>
    </div>
  );
};
