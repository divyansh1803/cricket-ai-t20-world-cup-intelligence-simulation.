import React, { useEffect, useMemo, useRef, useState } from 'react';
import * as d3 from 'd3';
import { Calendar, TrendingDown, RotateCcw, Check, X } from 'lucide-react';
import { Stadium } from '../../types/cricket';
import { cricketAudio } from '../../utils/audioSystem';

export type AnnualSeasonScenario = 'annual_avg' | 'peak_summer' | 'lush_monsoon';

export interface FiveDayWearPoint {
  day: 1 | 2 | 3 | 4 | 5;
  dayLabel: string;
  phaseTitle: string;
  bounceFactor: number; // 0-100 true bounce & carry index (degrades D1 -> D5)
  spinFactor: number; // 0-100 spin grip & rough turn index (rises D1 -> D5)
  surfaceIntegrity: number; // 0-100 overall turf/clay structural integrity (degrades D1 -> D5)
  avgCarryCm: number;
  expectedTurnDeg: number;
  variableBounceMm: number;
  tacticalNote: string;
}

export interface AnnualPitchWearReportD3OverlayProps {
  venue: Stadium;
  conditionMode: 'damp' | 'batting_paradise' | 'dusty' | 'balanced';
  liveMatchWearPct: number;
  onApplyDayWearToPitch?: (day: 1 | 2 | 3 | 4 | 5) => void;
  onClose: () => void;
}

export const AnnualPitchWearReportD3Overlay: React.FC<AnnualPitchWearReportD3OverlayProps> = ({
  venue,
  conditionMode,
  liveMatchWearPct,
  onApplyDayWearToPitch,
  onClose,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);

  const [chartWidth, setChartWidth] = useState<number>(560);
  const [scenario, setScenario] = useState<AnnualSeasonScenario>('annual_avg');
  const [showIntegrityLine, setShowIntegrityLine] = useState<boolean>(true);
  const [selectedDay, setSelectedDay] = useState<1 | 2 | 3 | 4 | 5>(3);
  const [appliedDayToast, setAppliedDayToast] = useState<number | null>(null);

  // Measure chart container responsively
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const measure = () => {
      const w = el.getBoundingClientRect().width;
      if (w > 180) {
        setChartWidth(Math.floor(w));
      }
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Build realistic 5-day degradation dataset calibrated to the chosen venue's soil/pitchType & season scenario
  const fiveDaySeries = useMemo<FiveDayWearPoint[]>(() => {
    const isPaceDeck = venue.pitchType === 'Pace & Bounce';
    const isTrueBatting = venue.pitchType === 'True Batting';
    const isSlowTurning = venue.pitchType === 'Slow & Turning';
    const isDrySpin = venue.pitchType === 'Dry Spin-Friendly';

    const paceWicketShare = venue.paceWicketPercent || 58;
    const spinWicketShare = venue.spinWicketPercent || 42;

    // Day 1 baselines calibrated by surface type
    const baseBounceD1 = isPaceDeck
      ? 93
      : isTrueBatting
      ? 89
      : isSlowTurning
      ? 75
      : 78;

    const baseSpinD1 = isDrySpin
      ? 44
      : isSlowTurning
      ? 39
      : isTrueBatting
      ? 23
      : 26;

    // Daily bounce degradation rate & spin escalation rate
    const scenarioBounceDropMod =
      scenario === 'peak_summer' ? 1.24 : scenario === 'lush_monsoon' ? 0.78 : 1.0;
    const scenarioSpinRiseMod =
      scenario === 'peak_summer' ? 1.25 : scenario === 'lush_monsoon' ? 0.8 : 1.0;

    const condBounceOffset =
      conditionMode === 'damp'
        ? 3
        : conditionMode === 'dusty'
        ? -6
        : conditionMode === 'batting_paradise'
        ? 4
        : 0;
    const condSpinOffset =
      conditionMode === 'dusty'
        ? 8
        : conditionMode === 'damp'
        ? -6
        : conditionMode === 'batting_paradise'
        ? -3
        : 0;

    const clamp = (v: number, min = 8, max = 98) => Math.max(min, Math.min(max, Math.round(v)));

    // Non-linear 5-day cumulative degradation curves (Day 1 -> Day 5)
    const dayDefinitions: {
      day: 1 | 2 | 3 | 4 | 5;
      bounceLossBase: number;
      spinGainBase: number;
      integrityBase: number;
      phaseTitle: string;
    }[] = [
      {
        day: 1,
        bounceLossBase: 0,
        spinGainBase: 0,
        integrityBase: 94,
        phaseTitle: 'Fresh Rolled Grass & Subsurface Moisture',
      },
      {
        day: 2,
        bounceLossBase: 5,
        spinGainBase: 9,
        integrityBase: 84,
        phaseTitle: 'True Settled Pace — Peak Batting Window',
      },
      {
        day: 3,
        bounceLossBase: 15,
        spinGainBase: 23,
        integrityBase: 67,
        phaseTitle: 'Topsoil Desiccation & Emerging Footmarks',
      },
      {
        day: 4,
        bounceLossBase: 28,
        spinGainBase: 39,
        integrityBase: 47,
        phaseTitle: 'Abraded Rough & Widening Seam Fissures',
      },
      {
        day: 5,
        bounceLossBase: 41,
        spinGainBase: 53,
        integrityBase: 31,
        phaseTitle: 'Cracked Dustbowl — Variable Shooters & Sharp Turn',
      },
    ];

    const venueSpinMultiplier = 0.82 + (spinWicketShare / 100) * 0.45;
    const venueBounceRetention = 0.85 + (paceWicketShare / 100) * 0.28;

    return dayDefinitions.map((def) => {
      const bounceLoss =
        def.bounceLossBase * scenarioBounceDropMod * (isDrySpin ? 1.18 : 1 / venueBounceRetention);
      const bounceFactor = clamp(baseBounceD1 + condBounceOffset - bounceLoss, 22, 97);

      const spinGain = def.spinGainBase * scenarioSpinRiseMod * venueSpinMultiplier;
      const spinFactor = clamp(baseSpinD1 + condSpinOffset + spinGain, 16, 98);

      const integrityDrop = (94 - def.integrityBase) * scenarioBounceDropMod;
      const surfaceIntegrity = clamp(94 - integrityDrop + (conditionMode === 'batting_paradise' ? 4 : 0), 18, 96);

      const avgCarryCm = Math.round(44 + bounceFactor * 0.54);
      const expectedTurnDeg = Number((1.1 + spinFactor * 0.058).toFixed(1));
      const variableBounceMm = Math.round(4 + (100 - surfaceIntegrity) * 0.31);

      const tacticalNote =
        def.day === 1
          ? `New ball carries at ${avgCarryCm}cm with brisk seam movement; spinners rely on drift & overspin (${expectedTurnDeg}°).`
          : def.day === 2
          ? `Moisture settles into even compaction — highest scoring day before footmark trenches deepen.`
          : def.day === 3
          ? `Cross-over point: bounce drops ${baseBounceD1 - bounceFactor} pts from Day 1 while bowler rough unlocks ${expectedTurnDeg}° grip.`
          : def.day === 4
          ? `Fissures widen across good length; ±${variableBounceMm}mm variable bounce brings LBW & slip catches into play.`
          : `Severe Day 5 degradation: ${expectedTurnDeg}° ragging turn out of deep spike rough with low skidding bounce (${avgCarryCm}cm).`;

      return {
        day: def.day,
        dayLabel: `Day ${def.day}`,
        phaseTitle: def.phaseTitle,
        bounceFactor,
        spinFactor,
        surfaceIntegrity,
        avgCarryCm,
        expectedTurnDeg,
        variableBounceMm,
        tacticalNote,
      };
    });
  }, [venue, conditionMode, scenario]);

  // Map current live match wear % onto an equivalent 5-Day Fractional Equivalence (1.0 .. 5.0)
  const equivalentMatchDay = useMemo(() => {
    const mapped = 1 + (Math.max(0, Math.min(100, liveMatchWearPct)) / 100) * 4;
    return Number(mapped.toFixed(2));
  }, [liveMatchWearPct]);

  const activeDayPoint = useMemo(
    () => fiveDaySeries.find((d) => d.day === selectedDay) || fiveDaySeries[2],
    [fiveDaySeries, selectedDay]
  );

  // Render D3 multi-line degradation chart (zero inline styles; strictly SVG attributes + classes)
  useEffect(() => {
    const svgEl = svgRef.current;
    if (!svgEl) return;

    const svg = d3.select(svgEl);
    svg.selectAll('*').remove();

    const width = Math.max(300, chartWidth);
    const height = 238;
    const margin = { top: 22, right: 24, bottom: 34, left: 38 };
    const innerW = width - margin.left - margin.right;
    const innerH = height - margin.top - margin.bottom;

    svg.attr('viewBox', `0 0 ${width} ${height}`);

    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // SVG Gradients for Bounce & Spin Area Fills
    const defs = svg.append('defs');

    const bounceGrad = defs
      .append('linearGradient')
      .attr('id', 'd3AnnualBounceGrad')
      .attr('x1', '0%')
      .attr('y1', '0%')
      .attr('x2', '0%')
      .attr('y2', '100%');
    bounceGrad.append('stop').attr('offset', '0%').attr('stop-color', '#38bdf8').attr('stop-opacity', 0.28);
    bounceGrad.append('stop').attr('offset', '100%').attr('stop-color', '#38bdf8').attr('stop-opacity', 0.01);

    const spinGrad = defs
      .append('linearGradient')
      .attr('id', 'd3AnnualSpinGrad')
      .attr('x1', '0%')
      .attr('y1', '0%')
      .attr('x2', '0%')
      .attr('y2', '100%');
    spinGrad.append('stop').attr('offset', '0%').attr('stop-color', '#f59e0b').attr('stop-opacity', 0.28);
    spinGrad.append('stop').attr('offset', '100%').attr('stop-color', '#f59e0b').attr('stop-opacity', 0.01);

    const root = svg
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    const xScale = d3.scaleLinear().domain([1, 5]).range([0, innerW]);
    const yScale = d3.scaleLinear().domain([0, 100]).range([innerH, 0]);

    // Horizontal Reference Gridlines (0, 25, 50, 75, 100)
    const yTicks = [0, 25, 50, 75, 100];
    root
      .append('g')
      .selectAll('line')
      .data(yTicks)
      .join('line')
      .attr('x1', 0)
      .attr('x2', innerW)
      .attr('y1', (d) => yScale(d))
      .attr('y2', (d) => yScale(d))
      .attr('stroke', '#1e293b')
      .attr('stroke-width', 1)
      .attr('stroke-dasharray', (d) => (d === 50 ? '4 3' : '2 3'));

    // Vertical Day Columns & Selected Day Highlight Band
    fiveDaySeries.forEach((pt) => {
      const xPos = xScale(pt.day);
      if (pt.day === selectedDay) {
        root
          .append('rect')
          .attr('x', Math.max(0, xPos - innerW / 10))
          .attr('y', 0)
          .attr('width', Math.min(innerW / 5, innerW - Math.max(0, xPos - innerW / 10)))
          .attr('height', innerH)
          .attr('rx', 6)
          .attr('fill', '#0ea5e9')
          .attr('fill-opacity', 0.08);
      }

      root
        .append('line')
        .attr('x1', xPos)
        .attr('x2', xPos)
        .attr('y1', 0)
        .attr('y2', innerH)
        .attr('stroke', pt.day === selectedDay ? '#38bdf8' : '#1e293b')
        .attr('stroke-opacity', pt.day === selectedDay ? 0.65 : 0.45)
        .attr('stroke-width', pt.day === selectedDay ? 1.3 : 1);
    });

    // Live Match Wear Equivalence Marker Line
    const liveEqX = xScale(equivalentMatchDay);
    root
      .append('line')
      .attr('x1', liveEqX)
      .attr('x2', liveEqX)
      .attr('y1', 0)
      .attr('y2', innerH)
      .attr('stroke', '#fb7185')
      .attr('stroke-width', 1.2)
      .attr('stroke-dasharray', '3 3');

    root
      .append('text')
      .attr('x', Math.max(32, Math.min(innerW - 32, liveEqX)))
      .attr('y', -7)
      .attr('text-anchor', 'middle')
      .attr('fill', '#fda4af')
      .attr('font-size', 8.5)
      .attr('font-weight', '700')
      .attr('class', 'pitch-svg-num')
      .text(`LIVE WEAR ≈ D${equivalentMatchDay}`);

    // Area Generators
    const bounceArea = d3
      .area<FiveDayWearPoint>()
      .x((d) => xScale(d.day))
      .y0(innerH)
      .y1((d) => yScale(d.bounceFactor))
      .curve(d3.curveMonotoneX);

    const spinArea = d3
      .area<FiveDayWearPoint>()
      .x((d) => xScale(d.day))
      .y0(innerH)
      .y1((d) => yScale(d.spinFactor))
      .curve(d3.curveMonotoneX);

    root
      .append('path')
      .datum(fiveDaySeries)
      .attr('fill', 'url(#d3AnnualBounceGrad)')
      .attr('d', bounceArea);

    root
      .append('path')
      .datum(fiveDaySeries)
      .attr('fill', 'url(#d3AnnualSpinGrad)')
      .attr('d', spinArea);

    // Line Generators
    const bounceLine = d3
      .line<FiveDayWearPoint>()
      .x((d) => xScale(d.day))
      .y((d) => yScale(d.bounceFactor))
      .curve(d3.curveMonotoneX);

    const spinLine = d3
      .line<FiveDayWearPoint>()
      .x((d) => xScale(d.day))
      .y((d) => yScale(d.spinFactor))
      .curve(d3.curveMonotoneX);

    const integrityLine = d3
      .line<FiveDayWearPoint>()
      .x((d) => xScale(d.day))
      .y((d) => yScale(d.surfaceIntegrity))
      .curve(d3.curveMonotoneX);

    // Optional Surface Integrity Reference Curve (Emerald Dashed)
    if (showIntegrityLine) {
      root
        .append('path')
        .datum(fiveDaySeries)
        .attr('fill', 'none')
        .attr('stroke', '#34d399')
        .attr('stroke-opacity', 0.78)
        .attr('stroke-width', 1.8)
        .attr('stroke-dasharray', '5 4')
        .attr('d', integrityLine);
    }

    // Bounce Factor Degradation Curve (Cyan Solid)
    const bouncePath = root
      .append('path')
      .datum(fiveDaySeries)
      .attr('fill', 'none')
      .attr('stroke', '#38bdf8')
      .attr('stroke-width', 2.8)
      .attr('stroke-linecap', 'round')
      .attr('d', bounceLine);

    // Spin Factor Escalation Curve (Amber Solid)
    const spinPath = root
      .append('path')
      .datum(fiveDaySeries)
      .attr('fill', 'none')
      .attr('stroke', '#f59e0b')
      .attr('stroke-width', 2.8)
      .attr('stroke-linecap', 'round')
      .attr('d', spinLine);

    if (!prefersReducedMotion) {
      [bouncePath, spinPath].forEach((p) => {
        const node = p.node();
        if (node) {
          const len = node.getTotalLength();
          p.attr('stroke-dasharray', `${len} ${len}`)
            .attr('stroke-dashoffset', len)
            .transition()
            .duration(620)
            .ease(d3.easeCubicOut)
            .attr('stroke-dashoffset', 0);
        }
      });
    }

    // Axes (Rendered cleanly with D3 attributes, no inline styles)
    const xAxisGroup = root
      .append('g')
      .attr('transform', `translate(0,${innerH})`)
      .call(
        d3
          .axisBottom(xScale)
          .tickValues([1, 2, 3, 4, 5])
          .tickFormat((d) => `Day ${d}`)
          .tickSizeOuter(0)
      );
    xAxisGroup.select('.domain').attr('stroke', '#334155');
    xAxisGroup.selectAll('.tick line').attr('stroke', '#334155');
    xAxisGroup
      .selectAll('.tick text')
      .attr('fill', '#cbd5e1')
      .attr('font-size', 10)
      .attr('font-weight', '600')
      .attr('class', 'pitch-svg-label');

    const yAxisGroup = root.append('g').call(
      d3
        .axisLeft(yScale)
        .tickValues(yTicks)
        .tickFormat((d) => `${d}`)
        .tickSizeOuter(0)
    );
    yAxisGroup.select('.domain').attr('stroke', '#334155');
    yAxisGroup.selectAll('.tick line').attr('stroke', '#334155');
    yAxisGroup
      .selectAll('.tick text')
      .attr('fill', '#94a3b8')
      .attr('font-size', 9.5)
      .attr('class', 'pitch-svg-num');

    // Data Point Nodes & Value Labels
    fiveDaySeries.forEach((pt) => {
      const cx = xScale(pt.day);
      const isSel = pt.day === selectedDay;

      if (showIntegrityLine) {
        root
          .append('circle')
          .attr('cx', cx)
          .attr('cy', yScale(pt.surfaceIntegrity))
          .attr('r', isSel ? 4.2 : 3)
          .attr('fill', '#022c22')
          .attr('stroke', '#34d399')
          .attr('stroke-width', 1.5);
      }

      // Bounce Node
      root
        .append('circle')
        .attr('cx', cx)
        .attr('cy', yScale(pt.bounceFactor))
        .attr('r', isSel ? 6 : 4.2)
        .attr('fill', isSel ? '#38bdf8' : '#082f49')
        .attr('stroke', '#e0f2fe')
        .attr('stroke-width', isSel ? 2 : 1.5);

      // Spin Node
      root
        .append('circle')
        .attr('cx', cx)
        .attr('cy', yScale(pt.spinFactor))
        .attr('r', isSel ? 6 : 4.2)
        .attr('fill', isSel ? '#f59e0b' : '#451a03')
        .attr('stroke', '#fef3c7')
        .attr('stroke-width', isSel ? 2 : 1.5);

      if (isSel) {
        const bounceLabelY = Math.max(11, yScale(pt.bounceFactor) - 10);
        const spinLabelY = Math.min(innerH - 6, yScale(pt.spinFactor) + 15);

        root
          .append('text')
          .attr('x', cx)
          .attr('y', bounceLabelY)
          .attr('text-anchor', 'middle')
          .attr('fill', '#7dd3fc')
          .attr('font-size', 9.2)
          .attr('font-weight', '700')
          .attr('class', 'pitch-svg-num')
          .text(`BNC ${pt.bounceFactor}`);

        root
          .append('text')
          .attr('x', cx)
          .attr('y', spinLabelY)
          .attr('text-anchor', 'middle')
          .attr('fill', '#fcd34d')
          .attr('font-size', 9.2)
          .attr('font-weight', '700')
          .attr('class', 'pitch-svg-num')
          .text(`SPN ${pt.spinFactor}`);
      }

      // Interactive Transparent Day Hit-Column for Instant Hover / Click Selection
      root
        .append('rect')
        .attr('x', cx - innerW / 10)
        .attr('y', 0)
        .attr('width', innerW / 5)
        .attr('height', innerH)
        .attr('fill', 'transparent')
        .attr('class', 'cursor-pointer')
        .on('mouseenter', () => {
          setSelectedDay(pt.day);
        })
        .on('click', () => {
          cricketAudio.playUiClick();
          setSelectedDay(pt.day);
        });
    });
  }, [fiveDaySeries, chartWidth, selectedDay, showIntegrityLine, equivalentMatchDay]);

  const day1 = fiveDaySeries[0];
  const day5 = fiveDaySeries[4];
  const fiveDayBounceDelta = day5.bounceFactor - day1.bounceFactor;
  const fiveDaySpinDelta = day5.spinFactor - day1.spinFactor;

  return (
    <section
      aria-label={`Annual 5-Day Pitch Wear Report for ${venue.name}`}
      className="pitch-ui-sans rounded-2xl border border-cyan-500/35 bg-[#050d1d] p-4 space-y-3 shadow-2xl"
    >
      {/* Header Row: Venue Title, Seasonal Scenario Tabs & Close Button */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-2 border-b border-slate-800/90 pb-2.5">
        <div className="flex flex-wrap items-center gap-2 min-w-0">
          <span className="font-heading font-bold text-white text-xs sm:text-sm inline-flex items-center gap-1.5 whitespace-nowrap shrink-0">
            <Calendar className="h-3.5 w-3.5 text-cyan-400 shrink-0" />
            <span>Annual 5-Day Pitch Wear Report</span>
          </span>
          <span aria-hidden="true" className="text-slate-600">
            ·
          </span>
          <span className="text-xs text-cyan-300 font-semibold truncate">
            {venue.name} ({venue.pitchType})
          </span>
          <span aria-hidden="true" className="text-slate-600">
            ·
          </span>
          <span className="text-[11px] text-slate-400 whitespace-nowrap">
            5-Day Shift:{' '}
            <strong className="font-mono tabular-nums text-sky-300">
              Bounce {fiveDayBounceDelta} pts
            </strong>{' '}
            /{' '}
            <strong className="font-mono tabular-nums text-amber-300">
              Spin +{fiveDaySpinDelta} pts
            </strong>
          </span>
          <span aria-hidden="true" className="text-slate-600">
            ·
          </span>
          <span className="text-[11px] text-slate-500 whitespace-nowrap">
            Simulated 5-Day Venue Model
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {(
            [
              { id: 'annual_avg', label: 'Annual Avg' },
              { id: 'peak_summer', label: 'Dry Summer' },
              { id: 'lush_monsoon', label: 'Lush Seam' },
            ] as const
          ).map((sc) => (
            <button
              key={sc.id}
              type="button"
              onClick={() => {
                cricketAudio.playUiClick();
                setScenario(sc.id);
              }}
              className={`h-7 px-2.5 rounded-lg border text-[10px] font-bold transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                scenario === sc.id
                  ? 'border-cyan-400/70 bg-cyan-500/20 text-cyan-100'
                  : 'border-slate-800 bg-slate-900 text-slate-400 hover:text-white'
              }`}
            >
              {sc.label}
            </button>
          ))}

          <button
            type="button"
            onClick={() => {
              cricketAudio.playUiClick();
              setShowIntegrityLine((prev) => !prev);
            }}
            className={`h-7 px-2.5 rounded-lg border text-[10px] font-bold transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
              showIntegrityLine
                ? 'border-emerald-400/60 bg-emerald-500/15 text-emerald-200'
                : 'border-slate-800 bg-slate-900 text-slate-400 hover:text-white'
            }`}
            title="Toggle 5-day structural surface integrity curve"
          >
            Integrity Line
          </button>

          <button
            type="button"
            onClick={() => {
              cricketAudio.playUiClick();
              onClose();
            }}
            className="h-7 px-2.5 rounded-lg border border-slate-700 bg-slate-900 text-[10px] font-bold text-slate-300 hover:text-white transition-colors cursor-pointer inline-flex items-center gap-1 whitespace-nowrap shrink-0"
            title="Close Annual Wear Report overlay"
          >
            <X className="h-3 w-3 shrink-0" />
            <span>Close</span>
          </button>
        </div>
      </div>

      {/* Legend + Day 1..5 Selector Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 text-[11px]">
        <div className="flex flex-wrap items-center gap-3 text-slate-300">
          <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
            <span className="h-0.5 w-3.5 bg-sky-400 inline-block" />
            <span>Bounce &amp; Carry Factor (0–100)</span>
          </span>
          <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
            <span className="h-0.5 w-3.5 bg-amber-400 inline-block" />
            <span>Spin &amp; Rough Factor (0–100)</span>
          </span>
          {showIntegrityLine && (
            <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
              <span className="h-0.5 w-3.5 border-t border-dashed border-emerald-400 inline-block" />
              <span>Surface Integrity (%)</span>
            </span>
          )}
        </div>

        <div className="flex items-center gap-1">
          {fiveDaySeries.map((pt) => (
            <button
              key={pt.day}
              type="button"
              onClick={() => {
                cricketAudio.playUiClick();
                setSelectedDay(pt.day);
              }}
              className={`px-2.5 py-0.5 rounded font-mono tabular-nums font-bold cursor-pointer transition-colors whitespace-nowrap shrink-0 ${
                selectedDay === pt.day
                  ? 'bg-cyan-400 text-slate-950'
                  : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              D{pt.day}
            </button>
          ))}
        </div>
      </div>

      {/* Responsive D3 Line Chart Canvas */}
      <div
        ref={containerRef}
        className="w-full rounded-xl border border-slate-800/80 bg-[#040d1a] px-2 py-1.5 overflow-hidden"
      >
        <svg
          ref={svgRef}
          className="w-full h-auto block select-none"
          role="img"
          aria-label={`D3 line chart of 5-day bounce and spin degradation at ${venue.name}`}
        />
      </div>

      {/* Selected Day Quantitative Breakdown & Apply-to-Pitch Action */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-2.5 border-t border-slate-800/80 pt-2.5 text-[11px]">
        <div className="space-y-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 text-slate-200">
            <span className="font-semibold text-cyan-300 inline-flex items-center gap-1 whitespace-nowrap">
              <TrendingDown className="h-3.5 w-3.5 shrink-0" />
              <span>
                {activeDayPoint.dayLabel}: {activeDayPoint.phaseTitle}
              </span>
            </span>
            <span aria-hidden="true" className="text-slate-600">
              ·
            </span>
            <span>
              Bounce:{' '}
              <strong className="font-mono tabular-nums text-sky-300">
                {activeDayPoint.bounceFactor}/100 ({activeDayPoint.avgCarryCm}cm)
              </strong>
            </span>
            <span aria-hidden="true" className="text-slate-600">
              ·
            </span>
            <span>
              Spin:{' '}
              <strong className="font-mono tabular-nums text-amber-300">
                {activeDayPoint.spinFactor}/100 ({activeDayPoint.expectedTurnDeg}°)
              </strong>
            </span>
            <span aria-hidden="true" className="text-slate-600">
              ·
            </span>
            <span>
              Bounce Var:{' '}
              <strong className="font-mono tabular-nums text-rose-300">
                ±{activeDayPoint.variableBounceMm}mm
              </strong>
            </span>
          </div>
          <p className="text-slate-300 leading-relaxed">{activeDayPoint.tacticalNote}</p>
        </div>

        {onApplyDayWearToPitch && (
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => {
                cricketAudio.playUiClick();
                onApplyDayWearToPitch(activeDayPoint.day);
                setAppliedDayToast(activeDayPoint.day);
              }}
              className="h-8 px-3 rounded-lg border border-cyan-400/60 bg-cyan-500/20 text-[10px] font-bold text-cyan-100 hover:bg-cyan-500/30 transition-colors cursor-pointer inline-flex items-center gap-1.5 whitespace-nowrap shrink-0"
              title="Preview this day's wear stage directly on the 22-yard pitch surface"
            >
              {appliedDayToast === activeDayPoint.day ? (
                <>
                  <Check className="h-3 w-3 text-emerald-300 shrink-0" />
                  <span>Day {activeDayPoint.day} Applied</span>
                </>
              ) : (
                <>
                  <RotateCcw className="h-3 w-3 text-cyan-300 shrink-0" />
                  <span>Preview Day {activeDayPoint.day} on Pitch</span>
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </section>
  );
};
