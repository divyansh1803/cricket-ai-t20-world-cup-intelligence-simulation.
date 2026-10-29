import React, { useEffect, useMemo, useRef, useState } from 'react';
import * as d3 from 'd3';
import {
  Activity,
  BarChart3,
  Box,
  Droplets,
  Eye,
  Flame,
  Gauge,
  Layers,
  MapPin,
  Sliders,
  Sun,
  Target,
} from 'lucide-react';
import { STADIUMS } from '../../data/cricketData';
import { Stadium } from '../../types/cricket';
import { cricketAudio } from '../../utils/audioSystem';

export interface PitchIntelligenceAdvancedSuiteProps {
  stadiumName: string;
  temperature: number;
  humidity: number;
  windSpeed: number;
  dewLevel: number;
  pitchWear: number;
  grassCoverage: number;
  matchDay: number;
  showMoistureHardness: boolean;
  onToggleMoistureHardness: () => void;
  show3DCracksCanvas: boolean;
  onToggle3DCracksCanvas: () => void;
}

type MoistureLensMode = 'combined' | 'evaporation' | 'hardness';
type MoistureRatingTier = 'low' | 'medium' | 'high';
type SpinSeamMetricMode = 'wickets_per_over' | 'strike_rate' | 'economy';
type BoundaryPhaseFilter = 'all' | 'powerplay' | 'middle' | 'death';

interface SquareHeatmapCell {
  id: string;
  stripIndex: number;
  stripLabel: string;
  corridorIndex: number;
  corridorLabel: string;
  yardRange: string;
  moistureVwcPct: number;
  evaporationMmHr: number;
  evaporationGm2Hr: number;
  hardnessGmax: number;
  hardnessMpa: number;
  bounceCarryCm: number;
  seamMovementDeg: number;
  heatHex: string;
  regimeTag: string;
}

interface SpinSeamBucket {
  rating: MoistureRatingTier;
  label: string;
  moistureRangeText: string;
  spinWicketsPerOver: number;
  seamWicketsPerOver: number;
  spinStrikeRate: number;
  seamStrikeRate: number;
  spinEconomy: number;
  seamEconomy: number;
  matchesSampled: number;
}

function hashSeed(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

/* ============================================================================
 * 1. 3D-EFFECT CANVAS OVERLAY: PITCH CRACKS & DRYNESS (WEATHER-DRIVEN)
 * ============================================================================ */
interface Pitch3DCracksCanvasProps {
  stadiumName: string;
  temperature: number;
  humidity: number;
  windSpeed: number;
  dewLevel: number;
  pitchWear: number;
  grassCoverage: number;
  matchDay: number;
}

const Pitch3DCracksCanvasOverlay: React.FC<Pitch3DCracksCanvasProps> = ({
  stadiumName,
  temperature,
  humidity,
  windSpeed,
  dewLevel,
  pitchWear,
  grassCoverage,
  matchDay,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [cameraTiltDeg, setCameraTiltDeg] = useState<number>(46);
  const [thermalScanMode, setThermalScanMode] = useState<boolean>(false);
  const [probedSpot, setProbedSpot] = useState<{
    yardMark: number;
    fissureWidthMm: number;
    drynessPct: number;
    cor: number;
  }>({
    yardMark: 6.8,
    fissureWidthMm: 3.4,
    drynessPct: 68,
    cor: 0.56,
  });

  // Compute physical dryness & crack intensity from weather metadata
  const surfacePhysics = useMemo(() => {
    const vaporDeficit = Math.max(0, (temperature - 16) * 1.85 + (100 - humidity) * 0.58);
    const windDrying = windSpeed * 0.42;
    const dewDampening = dewLevel * 0.46;
    const dayBake = (matchDay - 1) * 8.5;

    const drynessIndex = Math.max(
      8,
      Math.min(98, Math.round(vaporDeficit * 0.55 + windDrying + pitchWear * 0.42 + dayBake - dewDampening * 0.55))
    );

    const crackSeverity = Math.max(
      5,
      Math.min(99, Math.round(drynessIndex * 0.58 + pitchWear * 0.46 + (matchDay - 1) * 7 - grassCoverage * 0.24))
    );

    const maxFissureMm = Number((0.6 + (crackSeverity / 100) * 7.8).toFixed(1));
    const surfaceMoisturePct = Math.max(6, Math.min(48, Math.round(44 - drynessIndex * 0.36 + dewLevel * 0.14)));

    return {
      drynessIndex,
      crackSeverity,
      maxFissureMm,
      surfaceMoisturePct,
    };
  }, [temperature, humidity, windSpeed, dewLevel, pitchWear, grassCoverage, matchDay]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = typeof window !== 'undefined' ? Math.min(2, window.devicePixelRatio || 1) : 1;
    const logicalW = 720;
    const logicalH = 320;
    canvas.width = logicalW * dpr;
    canvas.height = logicalH * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    // Clear stadium night backdrop
    const bgGrad = ctx.createLinearGradient(0, 0, 0, logicalH);
    bgGrad.addColorStop(0, '#020817');
    bgGrad.addColorStop(0.5, '#07142b');
    bgGrad.addColorStop(1, '#04101f');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, logicalW, logicalH);

    // Subtle stadium floodlight atmospheric beams
    const beamLeft = ctx.createRadialGradient(110, 12, 8, 110, 40, 260);
    beamLeft.addColorStop(0, 'rgba(56, 189, 248, 0.16)');
    beamLeft.addColorStop(1, 'rgba(56, 189, 248, 0)');
    ctx.fillStyle = beamLeft;
    ctx.fillRect(0, 0, logicalW, logicalH);

    const beamRight = ctx.createRadialGradient(logicalW - 110, 12, 8, logicalW - 110, 40, 260);
    beamRight.addColorStop(0, 'rgba(251, 191, 36, 0.12)');
    beamRight.addColorStop(1, 'rgba(251, 191, 36, 0)');
    ctx.fillStyle = beamRight;
    ctx.fillRect(0, 0, logicalW, logicalH);

    // 3D perspective trapezoid projection driven by cameraTiltDeg
    const tiltFactor = (cameraTiltDeg - 28) / (62 - 28); // 0..1
    const topY = 44 + (1 - tiltFactor) * 26;
    const bottomY = 278;
    const topHalfW = 92 + tiltFactor * 26;
    const bottomHalfW = 268;
    const centerX = logicalW / 2;
    const slabThickness = 14 + Math.round((1 - tiltFactor) * 8);

    const projectPoint = (u: number, v: number) => {
      // u: -1..1 across width, v: 0..1 from far bowler end to near striker end
      const perspectiveV = Math.pow(v, 1.18);
      const y = topY + (bottomY - topY) * perspectiveV;
      const halfW = topHalfW + (bottomHalfW - topHalfW) * perspectiveV;
      const x = centerX + u * halfW;
      return { x, y, scale: 0.45 + 0.55 * perspectiveV };
    };

    // Draw 3D soil sub-base front cross-section slab
    ctx.beginPath();
    ctx.moveTo(centerX - bottomHalfW, bottomY);
    ctx.lineTo(centerX + bottomHalfW, bottomY);
    ctx.lineTo(centerX + bottomHalfW, bottomY + slabThickness);
    ctx.lineTo(centerX - bottomHalfW, bottomY + slabThickness);
    ctx.closePath();
    const soilSlabGrad = ctx.createLinearGradient(0, bottomY, 0, bottomY + slabThickness);
    soilSlabGrad.addColorStop(0, '#443322');
    soilSlabGrad.addColorStop(1, '#1c140d');
    ctx.fillStyle = soilSlabGrad;
    ctx.fill();
    ctx.strokeStyle = 'rgba(251, 191, 36, 0.28)';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Draw 22-yard pitch deck surface
    const pTL = projectPoint(-1, 0);
    const pTR = projectPoint(1, 0);
    const pBR = projectPoint(1, 1);
    const pBL = projectPoint(-1, 1);

    ctx.save();
    ctx.beginPath();
    ctx.moveTo(pTL.x, pTL.y);
    ctx.lineTo(pTR.x, pTR.y);
    ctx.lineTo(pBR.x, pBR.y);
    ctx.lineTo(pBL.x, pBL.y);
    ctx.closePath();

    const dryRatio = surfacePhysics.drynessIndex / 100;
    const deckGrad = ctx.createLinearGradient(0, topY, 0, bottomY);
    if (thermalScanMode) {
      deckGrad.addColorStop(0, '#0f172a');
      deckGrad.addColorStop(0.5, '#1e1b4b');
      deckGrad.addColorStop(1, '#172554');
    } else {
      // Shift from dark moist loam to sun-baked pale ochre clay as dryness climbs
      const rTop = Math.round(92 + dryRatio * 96);
      const gTop = Math.round(78 + dryRatio * 74);
      const bTop = Math.round(54 + dryRatio * 42);
      const rBot = Math.round(108 + dryRatio * 102);
      const gBot = Math.round(90 + dryRatio * 80);
      const bBot = Math.round(62 + dryRatio * 48);
      deckGrad.addColorStop(0, `rgb(${rTop}, ${gTop}, ${bTop})`);
      deckGrad.addColorStop(0.55, `rgb(${Math.round((rTop + rBot) / 2)}, ${Math.round((gTop + gBot) / 2)}, ${Math.round((bTop + bBot) / 2)})`);
      deckGrad.addColorStop(1, `rgb(${rBot}, ${gBot}, ${bBot})`);
    }
    ctx.fillStyle = deckGrad;
    ctx.fill();
    ctx.clip();

    // Footmark rough patches at good/full length outside off
    const roughSpots = [
      { u: 0.56, v: 0.64, rx: 46, ry: 26 },
      { u: -0.54, v: 0.28, rx: 32, ry: 16 },
      { u: 0.08, v: 0.56, rx: 52, ry: 30 },
    ];
    roughSpots.forEach((sp) => {
      const pt = projectPoint(sp.u, sp.v);
      const rg = ctx.createRadialGradient(pt.x, pt.y, 2, pt.x, pt.y, sp.rx * pt.scale);
      if (thermalScanMode) {
        rg.addColorStop(0, `rgba(244, 63, 94, ${0.22 + (pitchWear / 100) * 0.45})`);
        rg.addColorStop(1, 'rgba(244, 63, 94, 0)');
      } else {
        rg.addColorStop(0, `rgba(58, 41, 24, ${0.18 + (pitchWear / 100) * 0.42})`);
        rg.addColorStop(1, 'rgba(58, 41, 24, 0)');
      }
      ctx.fillStyle = rg;
      ctx.beginPath();
      ctx.ellipse(pt.x, pt.y, sp.rx * pt.scale, sp.ry * pt.scale, 0, 0, Math.PI * 2);
      ctx.fill();
    });

    // Grass coverage tufts
    const grassCount = Math.round((grassCoverage / 100) * 150);
    const baseSeed = hashSeed(stadiumName);
    for (let i = 0; i < grassCount; i++) {
      const gu = (((baseSeed + i * 73) % 1000) / 500 - 1) * 0.92;
      const gv = ((baseSeed + i * 137) % 1000) / 1000;
      const gp = projectPoint(gu, gv);
      ctx.strokeStyle = thermalScanMode
        ? 'rgba(52, 211, 153, 0.35)'
        : `rgba(58, 125, 52, ${0.25 + (grassCoverage / 100) * 0.38})`;
      ctx.lineWidth = 1.1 * gp.scale;
      ctx.beginPath();
      ctx.moveTo(gp.x, gp.y);
      ctx.lineTo(gp.x + ((i % 3) - 1) * 2.5, gp.y - 5.5 * gp.scale);
      ctx.stroke();
    }

    // Procedural branching 3D pitch cracks driven by crackSeverity
    const crackFamilies = Math.max(4, Math.round((surfacePhysics.crackSeverity / 100) * 28));
    for (let c = 0; c < crackFamilies; c++) {
      const cSeed = baseSeed + c * 313;
      let u = (((cSeed % 1000) / 500 - 1) * 0.78);
      let v = 0.14 + ((cSeed >> 3) % 740) / 1000;
      const segments = 5 + (c % 5);
      const widthScale = (0.6 + (surfacePhysics.crackSeverity / 100) * 2.1);

      // 3D bevel highlight along crack lip
      ctx.beginPath();
      for (let s = 0; s <= segments; s++) {
        const pt = projectPoint(u, v);
        if (s === 0) ctx.moveTo(pt.x + 1.1, pt.y + 0.8);
        else ctx.lineTo(pt.x + 1.1, pt.y + 0.8);

        const stepU = ((((cSeed + s * 41) % 100) - 50) / 500) * 0.55;
        const stepV = 0.028 + ((cSeed + s * 19) % 30) / 1000;
        u = Math.max(-0.92, Math.min(0.92, u + stepU));
        v = Math.min(0.97, v + stepV);
      }
      ctx.strokeStyle = thermalScanMode
        ? 'rgba(251, 191, 36, 0.45)'
        : `rgba(245, 228, 196, ${0.22 + dryRatio * 0.32})`;
      ctx.lineWidth = widthScale * 0.9;
      ctx.stroke();

      // Reset to draw dark fissure core + sub-branches
      u = (((cSeed % 1000) / 500 - 1) * 0.78);
      v = 0.14 + ((cSeed >> 3) % 740) / 1000;
      ctx.beginPath();
      for (let s = 0; s <= segments; s++) {
        const pt = projectPoint(u, v);
        if (s === 0) ctx.moveTo(pt.x, pt.y);
        else ctx.lineTo(pt.x, pt.y);

        // Secondary lateral micro-fissure branch when dryness > 45%
        if (s === 2 && surfacePhysics.crackSeverity > 42) {
          const branchPt = projectPoint(
            Math.max(-0.94, Math.min(0.94, u + (c % 2 === 0 ? 0.14 : -0.14))),
            Math.min(0.96, v + 0.035)
          );
          ctx.moveTo(pt.x, pt.y);
          ctx.lineTo(branchPt.x, branchPt.y);
          ctx.moveTo(pt.x, pt.y);
        }

        const stepU = ((((cSeed + s * 41) % 100) - 50) / 500) * 0.55;
        const stepV = 0.028 + ((cSeed + s * 19) % 30) / 1000;
        u = Math.max(-0.92, Math.min(0.92, u + stepU));
        v = Math.min(0.97, v + stepV);
      }
      ctx.strokeStyle = thermalScanMode
        ? '#fb7185'
        : `rgba(28, 16, 8, ${0.48 + (surfacePhysics.crackSeverity / 100) * 0.46})`;
      ctx.lineWidth = widthScale;
      ctx.stroke();
    }

    // Crease markings & distance yard lines in 3D perspective
    const creaseMarks = [
      { v: 0.08, label: 'Bowler Crease' },
      { v: 0.36, label: 'Short (10m)' },
      { v: 0.62, label: 'Good (7m)' },
      { v: 0.82, label: 'Full (3.5m)' },
      { v: 0.92, label: 'Popping Crease' },
    ];
    creaseMarks.forEach((cm, idx) => {
      const left = projectPoint(-1, cm.v);
      const right = projectPoint(1, cm.v);
      const isPopping = idx === 0 || idx === creaseMarks.length - 1;
      ctx.beginPath();
      ctx.moveTo(left.x, left.y);
      ctx.lineTo(right.x, right.y);
      ctx.strokeStyle = isPopping
        ? 'rgba(255, 255, 255, 0.82)'
        : 'rgba(255, 255, 255, 0.22)';
      ctx.lineWidth = isPopping ? 1.8 : 1;
      if (!isPopping) ctx.setLineDash([5, 5]);
      else ctx.setLineDash([]);
      ctx.stroke();
      ctx.setLineDash([]);
    });

    // Specular evening dew sheen overlay when dewLevel > 15%
    if (dewLevel > 12) {
      const dewSheen = ctx.createLinearGradient(0, topY, logicalW, bottomY);
      const alpha = (dewLevel / 100) * 0.26;
      dewSheen.addColorStop(0, `rgba(56, 189, 248, ${alpha * 0.5})`);
      dewSheen.addColorStop(0.5, `rgba(186, 230, 253, ${alpha})`);
      dewSheen.addColorStop(1, `rgba(14, 165, 233, ${alpha * 0.6})`);
      ctx.fillStyle = dewSheen;
      ctx.fillRect(0, topY, logicalW, bottomY - topY);
    }

    ctx.restore();

    // Pitch deck outer wireframe border
    ctx.beginPath();
    ctx.moveTo(pTL.x, pTL.y);
    ctx.lineTo(pTR.x, pTR.y);
    ctx.lineTo(pBR.x, pBR.y);
    ctx.lineTo(pBL.x, pBL.y);
    ctx.closePath();
    ctx.strokeStyle = thermalScanMode ? 'rgba(34, 211, 238, 0.7)' : 'rgba(226, 232, 240, 0.35)';
    ctx.lineWidth = 1.4;
    ctx.stroke();

    // 3D Stumps at far & near ends
    const drawStumps = (vPos: number, stumpHeight: number) => {
      [-0.07, 0, 0.07].forEach((uOff) => {
        const base = projectPoint(uOff, vPos);
        ctx.beginPath();
        ctx.moveTo(base.x, base.y);
        ctx.lineTo(base.x, base.y - stumpHeight);
        ctx.strokeStyle = '#f8fafc';
        ctx.lineWidth = 2.2 * base.scale;
        ctx.stroke();
      });
    };
    drawStumps(0.05, 18);
    drawStumps(0.95, 34);
  }, [
    stadiumName,
    surfacePhysics,
    grassCoverage,
    pitchWear,
    dewLevel,
    cameraTiltDeg,
    thermalScanMode,
  ]);

  const handleCanvasProbe = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const relY = Math.max(0, Math.min(1, (e.clientY - rect.top) / Math.max(1, rect.height)));
    const yardMark = Number(Math.max(0.5, Math.min(21.5, (1 - relY) * 22)).toFixed(1));
    const goodLengthBoost = yardMark >= 5 && yardMark <= 8.5 ? 1.28 : 0.92;
    const fissureWidthMm = Number(
      Math.max(0.5, surfacePhysics.maxFissureMm * goodLengthBoost * 0.82).toFixed(1)
    );
    const cor = Number(
      Math.max(0.42, Math.min(0.74, 0.51 + (surfacePhysics.drynessIndex / 100) * 0.16)).toFixed(2)
    );
    cricketAudio.playUiClick();
    setProbedSpot({
      yardMark,
      fissureWidthMm,
      drynessPct: surfacePhysics.drynessIndex,
      cor,
    });
  };

  return (
    <div className="rounded-2xl border border-slate-800/90 bg-[#050d1d] p-4 sm:p-5 space-y-4">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-slate-800/80 pb-3.5">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2 text-xs text-amber-300 font-medium">
            <Box className="h-3.5 w-3.5 text-amber-400 shrink-0" />
            <span>3D Perspective Surface Fissure &amp; Desiccation Model</span>
            <span aria-hidden="true" className="text-slate-600">
              ·
            </span>
            <span className="text-slate-400">
              Live Weather Sync ({temperature}°C · {humidity}% RH · Dew {dewLevel}%)
            </span>
          </div>
          <h3 className="font-heading text-base sm:text-lg font-bold text-white tracking-tight">
            3D Pitch Cracks &amp; Surface Dryness Canvas Overlay
          </h3>
        </div>

        <div className="flex flex-wrap items-center gap-3 shrink-0">
          <div className="flex items-center gap-2 text-xs text-slate-300">
            <Sliders className="h-3.5 w-3.5 text-cyan-400 shrink-0" />
            <span>Deck Tilt:</span>
            <input
              type="range"
              min={28}
              max={62}
              value={cameraTiltDeg}
              onChange={(e) => setCameraTiltDeg(Number(e.target.value))}
              aria-label="3D Pitch Camera Tilt Angle"
              className="w-24 accent-cyan-400 cursor-pointer"
            />
            <span className="font-mono font-bold text-cyan-300 tabular-nums w-8">
              {cameraTiltDeg}°
            </span>
          </div>

          <button
            type="button"
            onClick={() => {
              cricketAudio.playUiClick();
              setThermalScanMode((prev) => !prev);
            }}
            className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
              thermalScanMode
                ? 'border-rose-400 bg-rose-500 text-slate-950 font-bold'
                : 'border-slate-700 bg-slate-900 text-slate-300 hover:text-white'
            }`}
          >
            <Eye className="h-3.5 w-3.5 shrink-0" />
            <span>{thermalScanMode ? 'Fissure Stress Scan' : 'Natural Clay View'}</span>
          </button>
        </div>
      </div>

      <div className="relative rounded-xl border border-slate-800/90 bg-slate-950 overflow-hidden">
        <canvas
          ref={canvasRef}
          onClick={handleCanvasProbe}
          className="w-full h-[250px] sm:h-[290px] block cursor-crosshair"
          title="Click anywhere on the 3D pitch surface to probe fissure width and restitution"
        />

        {/* Bottom Scrim Probe Readout */}
        <div className="border-t border-slate-800/90 bg-slate-950/95 px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex flex-wrap items-center gap-3 text-slate-300">
            <span>
              Dryness Crust:{' '}
              <strong className="font-mono text-amber-300 tabular-nums">
                {surfacePhysics.drynessIndex}%
              </strong>
            </span>
            <span aria-hidden="true" className="text-slate-600">
              ·
            </span>
            <span>
              Crack Severity:{' '}
              <strong className="font-mono text-rose-300 tabular-nums">
                {surfacePhysics.crackSeverity}%
              </strong>
            </span>
            <span aria-hidden="true" className="text-slate-600">
              ·
            </span>
            <span>
              Peak Fissure:{' '}
              <strong className="font-mono text-white tabular-nums">
                {surfacePhysics.maxFissureMm} mm
              </strong>
            </span>
            <span aria-hidden="true" className="text-slate-600">
              ·
            </span>
            <span>
              Topsoil Moisture:{' '}
              <strong className="font-mono text-cyan-300 tabular-nums">
                {surfacePhysics.surfaceMoisturePct}% VWC
              </strong>
            </span>
          </div>

          <div className="text-[11px] font-mono text-emerald-300 tabular-nums">
            Probe @ {probedSpot.yardMark}m from stumps: {probedSpot.fissureWidthMm}mm crack · CoR{' '}
            {probedSpot.cor}
          </div>
        </div>
      </div>
    </div>
  );
};

/* ============================================================================
 * 2. D3 SPIN VS. SEAM EFFICACY CHART (LOW / MEDIUM / HIGH MOISTURE)
 * ============================================================================ */
interface SpinVsSeamD3Props {
  buckets: SpinSeamBucket[];
  activeRating: MoistureRatingTier;
  metricMode: SpinSeamMetricMode;
  selectedRating: MoistureRatingTier;
  onSelectRating: (r: MoistureRatingTier) => void;
}

const SpinVsSeamEfficacyD3Chart: React.FC<SpinVsSeamD3Props> = ({
  buckets,
  activeRating,
  metricMode,
  selectedRating,
  onSelectRating,
}) => {
  const svgRef = useRef<SVGSVGElement | null>(null);

  useEffect(() => {
    const svgEl = svgRef.current;
    if (!svgEl) return;

    const svg = d3.select(svgEl);
    svg.selectAll('*').remove();

    const width = 540;
    const height = 236;
    const margin = { top: 26, right: 20, bottom: 42, left: 48 };
    const innerW = width - margin.left - margin.right;
    const innerH = height - margin.top - margin.bottom;

    const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

    const getSpinVal = (b: SpinSeamBucket) =>
      metricMode === 'wickets_per_over'
        ? b.spinWicketsPerOver
        : metricMode === 'strike_rate'
        ? b.spinStrikeRate
        : b.spinEconomy;

    const getSeamVal = (b: SpinSeamBucket) =>
      metricMode === 'wickets_per_over'
        ? b.seamWicketsPerOver
        : metricMode === 'strike_rate'
        ? b.seamStrikeRate
        : b.seamEconomy;

    const maxVal =
      d3.max(buckets, (b) => Math.max(getSpinVal(b), getSeamVal(b))) ??
      (metricMode === 'wickets_per_over' ? 0.36 : 28);

    const x0 = d3
      .scaleBand<MoistureRatingTier>()
      .domain(buckets.map((b) => b.rating))
      .range([0, innerW])
      .paddingInner(0.28)
      .paddingOuter(0.12);

    const x1 = d3
      .scaleBand<'spin' | 'seam'>()
      .domain(['spin', 'seam'])
      .range([0, x0.bandwidth()])
      .padding(0.16);

    const y = d3
      .scaleLinear()
      .domain([0, maxVal * 1.18])
      .range([innerH, 0]);

    // Gridlines
    const yTicks = y.ticks(4);
    g.selectAll('.grid')
      .data(yTicks)
      .enter()
      .append('line')
      .attr('x1', 0)
      .attr('x2', innerW)
      .attr('y1', (d) => y(d))
      .attr('y2', (d) => y(d))
      .attr('stroke', 'rgba(148, 163, 184, 0.14)')
      .attr('stroke-dasharray', '3 3');

    buckets.forEach((bucket) => {
      const gx = x0(bucket.rating) ?? 0;
      const isLiveActive = bucket.rating === activeRating;
      const isSelected = bucket.rating === selectedRating;

      const group = g
        .append('g')
        .attr('transform', `translate(${gx},0)`)
        .style('cursor', 'pointer')
        .on('click', () => {
          cricketAudio.playUiClick();
          onSelectRating(bucket.rating);
        });

      // Highlight column frame for current live weather moisture rating
      if (isLiveActive || isSelected) {
        group
          .append('rect')
          .attr('x', -6)
          .attr('y', -12)
          .attr('width', x0.bandwidth() + 12)
          .attr('height', innerH + 16)
          .attr('rx', 8)
          .attr(
            'fill',
            isLiveActive ? 'rgba(34, 211, 238, 0.08)' : 'rgba(148, 163, 184, 0.06)'
          )
          .attr(
            'stroke',
            isLiveActive ? 'rgba(34, 211, 238, 0.48)' : 'rgba(148, 163, 184, 0.3)'
          )
          .attr('stroke-width', 1);
      }

      if (isLiveActive) {
        group
          .append('text')
          .attr('x', x0.bandwidth() / 2)
          .attr('y', -2)
          .attr('text-anchor', 'middle')
          .attr('fill', '#67e8f9')
          .attr('font-size', '8.5px')
          .attr('font-family', "'Plus Jakarta Sans', sans-serif")
          .attr('font-weight', '700')
          .text('LIVE MOISTURE');
      }

      const spinV = getSpinVal(bucket);
      const seamV = getSeamVal(bucket);

      // Spin bar (Amber)
      group
        .append('rect')
        .attr('x', x1('spin') ?? 0)
        .attr('y', y(spinV))
        .attr('width', x1.bandwidth())
        .attr('height', Math.max(2, innerH - y(spinV)))
        .attr('rx', 4)
        .attr('fill', '#f59e0b');

      group
        .append('text')
        .attr('x', (x1('spin') ?? 0) + x1.bandwidth() / 2)
        .attr('y', y(spinV) - 5)
        .attr('text-anchor', 'middle')
        .attr('fill', '#fde68a')
        .attr('font-size', '9.5px')
        .attr('font-family', "'JetBrains Mono', monospace")
        .attr('font-weight', '700')
        .text(metricMode === 'wickets_per_over' ? spinV.toFixed(2) : spinV.toFixed(1));

      // Seam bar (Cyan)
      group
        .append('rect')
        .attr('x', x1('seam') ?? 0)
        .attr('y', y(seamV))
        .attr('width', x1.bandwidth())
        .attr('height', Math.max(2, innerH - y(seamV)))
        .attr('rx', 4)
        .attr('fill', '#06b6d4');

      group
        .append('text')
        .attr('x', (x1('seam') ?? 0) + x1.bandwidth() / 2)
        .attr('y', y(seamV) - 5)
        .attr('text-anchor', 'middle')
        .attr('fill', '#a5f3fc')
        .attr('font-size', '9.5px')
        .attr('font-family', "'JetBrains Mono', monospace")
        .attr('font-weight', '700')
        .text(metricMode === 'wickets_per_over' ? seamV.toFixed(2) : seamV.toFixed(1));

      // X-axis label
      group
        .append('text')
        .attr('x', x0.bandwidth() / 2)
        .attr('y', innerH + 17)
        .attr('text-anchor', 'middle')
        .attr('fill', '#f8fafc')
        .attr('font-size', '10.5px')
        .attr('font-family', "'Plus Jakarta Sans', sans-serif")
        .attr('font-weight', '600')
        .text(bucket.label);

      group
        .append('text')
        .attr('x', x0.bandwidth() / 2)
        .attr('y', innerH + 31)
        .attr('text-anchor', 'middle')
        .attr('fill', '#94a3b8')
        .attr('font-size', '9px')
        .attr('font-family', "'JetBrains Mono', monospace")
        .text(bucket.moistureRangeText);
    });

    // Y-axis ticks
    yTicks.forEach((tick) => {
      g.append('text')
        .attr('x', -8)
        .attr('y', y(tick) + 3.5)
        .attr('text-anchor', 'end')
        .attr('fill', '#94a3b8')
        .attr('font-size', '9.5px')
        .attr('font-family', "'JetBrains Mono', monospace")
        .text(metricMode === 'wickets_per_over' ? tick.toFixed(2) : tick.toFixed(0));
    });
  }, [buckets, activeRating, metricMode, selectedRating, onSelectRating]);

  return (
    <div className="w-full overflow-hidden">
      <svg
        ref={svgRef}
        viewBox="0 0 540 236"
        className="w-full h-auto select-none"
        role="img"
        aria-label="Spin versus Seam Efficacy D3 Grouped Bar Chart across Low, Medium, and High pitch moisture"
      />
    </div>
  );
};

/* ============================================================================
 * 3. D3 BOUNDARY EFFICIENCY CHART (FILTERED BY SELECTED STADIUM)
 * ============================================================================ */
interface BoundaryPhaseBarItem {
  phaseId: string;
  phaseLabel: string;
  foursRunSharePct: number;
  sixesRunSharePct: number;
  nonBoundarySharePct: number;
  totalBoundaryPct: number;
  globalBenchmarkPct: number;
}

const BoundaryEfficiencyD3Chart: React.FC<{
  items: BoundaryPhaseBarItem[];
  activePhase: BoundaryPhaseFilter;
  onSelectPhase: (p: BoundaryPhaseFilter) => void;
}> = ({ items, activePhase, onSelectPhase }) => {
  const svgRef = useRef<SVGSVGElement | null>(null);

  useEffect(() => {
    const svgEl = svgRef.current;
    if (!svgEl) return;

    const svg = d3.select(svgEl);
    svg.selectAll('*').remove();

    const width = 540;
    const height = 236;
    const margin = { top: 24, right: 20, bottom: 40, left: 44 };
    const innerW = width - margin.left - margin.right;
    const innerH = height - margin.top - margin.bottom;

    const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

    const x = d3
      .scaleBand<string>()
      .domain(items.map((d) => d.phaseId))
      .range([0, innerW])
      .padding(0.32);

    const y = d3.scaleLinear().domain([0, 100]).range([innerH, 0]);

    [0, 25, 50, 75, 100].forEach((tick) => {
      g.append('line')
        .attr('x1', 0)
        .attr('x2', innerW)
        .attr('y1', y(tick))
        .attr('y2', y(tick))
        .attr('stroke', 'rgba(148, 163, 184, 0.14)')
        .attr('stroke-dasharray', '3 3');

      g.append('text')
        .attr('x', -7)
        .attr('y', y(tick) + 3.5)
        .attr('text-anchor', 'end')
        .attr('fill', '#94a3b8')
        .attr('font-size', '9.5px')
        .attr('font-family', "'JetBrains Mono', monospace")
        .text(`${tick}%`);
    });

    items.forEach((item) => {
      const bx = x(item.phaseId) ?? 0;
      const bw = x.bandwidth();
      const isSelected = item.phaseId === activePhase;

      const group = g
        .append('g')
        .style('cursor', 'pointer')
        .on('click', () => {
          cricketAudio.playUiClick();
          onSelectPhase(item.phaseId as BoundaryPhaseFilter);
        });

      if (isSelected) {
        group
          .append('rect')
          .attr('x', bx - 7)
          .attr('y', -10)
          .attr('width', bw + 14)
          .attr('height', innerH + 14)
          .attr('rx', 8)
          .attr('fill', 'rgba(16, 185, 129, 0.08)')
          .attr('stroke', 'rgba(52, 211, 153, 0.45)')
          .attr('stroke-width', 1);
      }

      // Running 1s/2s/3s background full 100% stack
      group
        .append('rect')
        .attr('x', bx)
        .attr('y', y(100))
        .attr('width', bw)
        .attr('height', innerH - y(100))
        .attr('rx', 5)
        .attr('fill', 'rgba(51, 65, 85, 0.55)');

      // Fours share (bottom stack from 0 to foursRunSharePct)
      const h4 = innerH - y(item.foursRunSharePct);
      group
        .append('rect')
        .attr('x', bx)
        .attr('y', y(item.foursRunSharePct))
        .attr('width', bw)
        .attr('height', Math.max(2, h4))
        .attr('rx', 3)
        .attr('fill', '#10b981');

      // Sixes share (stacked above fours up to totalBoundaryPct)
      const h6 = y(item.foursRunSharePct) - y(item.totalBoundaryPct);
      group
        .append('rect')
        .attr('x', bx)
        .attr('y', y(item.totalBoundaryPct))
        .attr('width', bw)
        .attr('height', Math.max(2, h6))
        .attr('rx', 3)
        .attr('fill', '#38bdf8');

      // Global venue benchmark horizontal marker tick
      group
        .append('line')
        .attr('x1', bx - 4)
        .attr('x2', bx + bw + 4)
        .attr('y1', y(item.globalBenchmarkPct))
        .attr('y2', y(item.globalBenchmarkPct))
        .attr('stroke', '#fbbf24')
        .attr('stroke-width', 2);

      // Total Boundary % label
      group
        .append('text')
        .attr('x', bx + bw / 2)
        .attr('y', y(item.totalBoundaryPct) - 6)
        .attr('text-anchor', 'middle')
        .attr('fill', '#ffffff')
        .attr('font-size', '10px')
        .attr('font-family', "'JetBrains Mono', monospace")
        .attr('font-weight', '700')
        .text(`${item.totalBoundaryPct}%`);

      // X-axis label
      group
        .append('text')
        .attr('x', bx + bw / 2)
        .attr('y', innerH + 18)
        .attr('text-anchor', 'middle')
        .attr('fill', isSelected ? '#6ee7b7' : '#cbd5e1')
        .attr('font-size', '10px')
        .attr('font-family', "'Plus Jakarta Sans', sans-serif")
        .attr('font-weight', isSelected ? '700' : '600')
        .text(item.phaseLabel);

      group
        .append('text')
        .attr('x', bx + bw / 2)
        .attr('y', innerH + 31)
        .attr('text-anchor', 'middle')
        .attr('fill', '#94a3b8')
        .attr('font-size', '8.5px')
        .attr('font-family', "'JetBrains Mono', monospace")
        .text(`4s:${item.foursRunSharePct}% 6s:${item.sixesRunSharePct}%`);
    });
  }, [items, activePhase, onSelectPhase]);

  return (
    <div className="w-full overflow-hidden">
      <svg
        ref={svgRef}
        viewBox="0 0 540 236"
        className="w-full h-auto select-none"
        role="img"
        aria-label="Boundary Efficiency D3 Chart showing percentage of runs scored in fours and sixes compared to total runs"
      />
    </div>
  );
};

/* ============================================================================
 * 4. COMPOSITE SUITE EXPORTED FOR PitchIntelligenceView
 * ============================================================================ */
export const PitchIntelligenceAdvancedSuite: React.FC<PitchIntelligenceAdvancedSuiteProps> = ({
  stadiumName,
  temperature,
  humidity,
  windSpeed,
  dewLevel,
  pitchWear,
  grassCoverage,
  matchDay,
  showMoistureHardness,
  onToggleMoistureHardness,
  show3DCracksCanvas,
  onToggle3DCracksCanvas,
}) => {
  const [moistureLens, setMoistureLens] = useState<MoistureLensMode>('combined');
  const [selectedCellId, setSelectedCellId] = useState<string>('strip_3_cor_1');
  const [spinSeamMetric, setSpinSeamMetric] = useState<SpinSeamMetricMode>('wickets_per_over');
  const [selectedBoundaryStadiumId, setSelectedBoundaryStadiumId] = useState<string>(() => {
    const matched = STADIUMS.find(
      (s) =>
        stadiumName.toLowerCase().includes(s.name.toLowerCase()) ||
        s.name.toLowerCase().includes(stadiumName.toLowerCase())
    );
    return matched ? matched.id : STADIUMS[0].id;
  });
  const [boundaryPhase, setBoundaryPhase] = useState<BoundaryPhaseFilter>('all');

  // Keep selectedBoundaryStadiumId synced when parent stadiumName changes
  useEffect(() => {
    const matched = STADIUMS.find(
      (s) =>
        stadiumName.toLowerCase().includes(s.name.toLowerCase()) ||
        s.name.toLowerCase().includes(stadiumName.toLowerCase())
    );
    if (matched) {
      setSelectedBoundaryStadiumId(matched.id);
    }
  }, [stadiumName]);

  const activeStadiumObj: Stadium = useMemo(
    () => STADIUMS.find((s) => s.id === selectedBoundaryStadiumId) || STADIUMS[0],
    [selectedBoundaryStadiumId]
  );

  // Compute real-time cricket square Soil Moisture Evaporation & Pitch Hardness Grid (5 Strips x 4 Corridors)
  const squareGrid = useMemo<SquareHeatmapCell[]>(() => {
    const strips = [
      { idx: 1, label: 'Strip 1 · Outer Green', wearOffset: -18, grassOffset: 16 },
      { idx: 2, label: 'Strip 2 · Practice Seam', wearOffset: -8, grassOffset: 8 },
      { idx: 3, label: 'Strip 3 · Match Centre', wearOffset: 0, grassOffset: 0 },
      { idx: 4, label: 'Strip 4 · Used Clay', wearOffset: 14, grassOffset: -12 },
      { idx: 5, label: 'Strip 5 · Dry Spin Deck', wearOffset: 24, grassOffset: -20 },
    ];
    const corridors = [
      { idx: 0, label: 'Full / Driving', yardRange: '2m–5m', wearMult: 0.92 },
      { idx: 1, label: 'Good Length', yardRange: '5m–8m', wearMult: 1.22 },
      { idx: 2, label: 'Back of Length', yardRange: '8m–11m', wearMult: 1.06 },
      { idx: 3, label: 'Short / Bouncer', yardRange: '11m–15m', wearMult: 0.86 },
    ];

    // Base Penman-inspired evaporation rate in mm/hr
    const baseEvapMmHr = Math.max(
      0.08,
      ((temperature - 10) * 0.018 + (100 - humidity) * 0.0055 + windSpeed * 0.009) *
        (1 - dewLevel / 185)
    );

    const cells: SquareHeatmapCell[] = [];
    strips.forEach((st) => {
      corridors.forEach((cor) => {
        const localWear = Math.max(5, Math.min(98, (pitchWear + st.wearOffset) * cor.wearMult));
        const localGrass = Math.max(2, Math.min(95, grassCoverage + st.grassOffset));

        const evaporationMmHr = Number(
          Math.max(
            0.06,
            Math.min(1.45, baseEvapMmHr * (1 + localWear / 190 - localGrass / 260))
          ).toFixed(2)
        );
        const evaporationGm2Hr = Math.round(evaporationMmHr * 1000);

        const moistureVwcPct = Number(
          Math.max(
            7.5,
            Math.min(
              44.0,
              28 +
                (humidity - 55) * 0.16 +
                dewLevel * 0.14 -
                evaporationMmHr * 14.5 -
                localWear * 0.14 +
                localGrass * 0.09
            )
          ).toFixed(1)
        );

        const hardnessGmax = Math.round(
          Math.max(
            58,
            Math.min(
              142,
              118 - moistureVwcPct * 1.15 + (temperature - 22) * 0.55 - localGrass * 0.12
            )
          )
        );
        const hardnessMpa = Number((hardnessGmax * 0.034).toFixed(2));

        const bounceCarryCm = Math.round(
          Math.max(56, Math.min(118, 52 + hardnessGmax * 0.48 - localWear * 0.14))
        );
        const seamMovementDeg = Number(
          Math.max(
            0.35,
            Math.min(2.85, 0.55 + localGrass * 0.016 + moistureVwcPct * 0.022 + (cor.idx === 1 ? 0.32 : 0))
          ).toFixed(2)
        );

        // Color scale based on active lens
        let heatHex = '#0ea5e9';
        let regimeTag = 'Balanced Carry';
        if (moistureLens === 'evaporation') {
          if (evaporationMmHr >= 0.72) {
            heatHex = '#f43f5e';
            regimeTag = 'Rapid Bake Loss';
          } else if (evaporationMmHr >= 0.45) {
            heatHex = '#f59e0b';
            regimeTag = 'Active Drying';
          } else {
            heatHex = '#06b6d4';
            regimeTag = 'Moisture Retained';
          }
        } else if (moistureLens === 'hardness') {
          if (hardnessGmax >= 104) {
            heatHex = '#10b981';
            regimeTag = 'Rock-Hard Pace';
          } else if (hardnessGmax >= 84) {
            heatHex = '#38bdf8';
            regimeTag = 'True Firm Bounce';
          } else {
            heatHex = '#f59e0b';
            regimeTag = 'Tacky / Two-Paced';
          }
        } else {
          if (hardnessGmax >= 100 && moistureVwcPct <= 18) {
            heatHex = '#f97316';
            regimeTag = 'Hard & Desiccated';
          } else if (moistureVwcPct >= 26) {
            heatHex = '#06b6d4';
            regimeTag = 'Damp Seam Nip';
          } else {
            heatHex = '#10b981';
            regimeTag = 'True Carry & Zip';
          }
        }

        cells.push({
          id: `strip_${st.idx}_cor_${cor.idx}`,
          stripIndex: st.idx,
          stripLabel: st.label,
          corridorIndex: cor.idx,
          corridorLabel: cor.label,
          yardRange: cor.yardRange,
          moistureVwcPct,
          evaporationMmHr,
          evaporationGm2Hr,
          hardnessGmax,
          hardnessMpa,
          bounceCarryCm,
          seamMovementDeg,
          heatHex,
          regimeTag,
        });
      });
    });

    return cells;
  }, [temperature, humidity, windSpeed, dewLevel, pitchWear, grassCoverage, moistureLens]);

  const inspectedCell =
    squareGrid.find((c) => c.id === selectedCellId) || squareGrid[9] || squareGrid[0];

  // Derive active pitch moisture rating ('low' | 'medium' | 'high') from centre strip Good Length cell
  const centreGoodCell =
    squareGrid.find((c) => c.stripIndex === 3 && c.corridorIndex === 1) || inspectedCell;
  const activeMoistureRating: MoistureRatingTier =
    centreGoodCell.moistureVwcPct < 18.5
      ? 'low'
      : centreGoodCell.moistureVwcPct <= 27.5
      ? 'medium'
      : 'high';

  const [inspectedMoistureRating, setInspectedMoistureRating] =
    useState<MoistureRatingTier>(activeMoistureRating);

  useEffect(() => {
    setInspectedMoistureRating(activeMoistureRating);
  }, [activeMoistureRating]);

  // Calibrated historical Spin vs Seam Efficacy dataset for venue
  const spinSeamBuckets = useMemo<SpinSeamBucket[]>(() => {
    const spinBias = activeStadiumObj.spinWicketPercent / 50; // ~0.6..1.35
    const paceBias = activeStadiumObj.paceWicketPercent / 50; // ~0.65..1.4

    return [
      {
        rating: 'low',
        label: 'Low Moisture',
        moistureRangeText: '<18.5% VWC · Dry',
        spinWicketsPerOver: Number((0.29 * (0.82 + spinBias * 0.22)).toFixed(2)),
        seamWicketsPerOver: Number((0.18 * (0.85 + paceBias * 0.16)).toFixed(2)),
        spinStrikeRate: Number((17.8 / (0.86 + spinBias * 0.16)).toFixed(1)),
        seamStrikeRate: Number((24.6 / (0.88 + paceBias * 0.14)).toFixed(1)),
        spinEconomy: Number((6.65 - (spinBias - 1) * 0.45).toFixed(2)),
        seamEconomy: Number((8.45 - (paceBias - 1) * 0.35).toFixed(2)),
        matchesSampled: 34,
      },
      {
        rating: 'medium',
        label: 'Medium Moisture',
        moistureRangeText: '18.5–27.5% VWC',
        spinWicketsPerOver: Number((0.22 * (0.85 + spinBias * 0.18)).toFixed(2)),
        seamWicketsPerOver: Number((0.25 * (0.85 + paceBias * 0.18)).toFixed(2)),
        spinStrikeRate: Number((22.4 / (0.88 + spinBias * 0.14)).toFixed(1)),
        seamStrikeRate: Number((19.8 / (0.88 + paceBias * 0.15)).toFixed(1)),
        spinEconomy: Number((7.35 - (spinBias - 1) * 0.35).toFixed(2)),
        seamEconomy: Number((7.65 - (paceBias - 1) * 0.35).toFixed(2)),
        matchesSampled: 48,
      },
      {
        rating: 'high',
        label: 'High Moisture',
        moistureRangeText: '>27.5% VWC · Lush',
        spinWicketsPerOver: Number((0.14 * (0.88 + spinBias * 0.14)).toFixed(2)),
        seamWicketsPerOver: Number((0.33 * (0.84 + paceBias * 0.22)).toFixed(2)),
        spinStrikeRate: Number((29.2 / (0.9 + spinBias * 0.1)).toFixed(1)),
        seamStrikeRate: Number((15.9 / (0.86 + paceBias * 0.16)).toFixed(1)),
        spinEconomy: Number((8.25 - (spinBias - 1) * 0.25).toFixed(2)),
        seamEconomy: Number((6.82 - (paceBias - 1) * 0.42).toFixed(2)),
        matchesSampled: 29,
      },
    ];
  }, [activeStadiumObj]);

  const activeSpinSeamBucket =
    spinSeamBuckets.find((b) => b.rating === inspectedMoistureRating) || spinSeamBuckets[1];

  // Boundary Efficiency Data filtered by activeStadiumObj
  const boundaryData = useMemo<BoundaryPhaseBarItem[]>(() => {
    const avgStraight = activeStadiumObj.boundarySizeMeters.straight;
    const avgSquare = activeStadiumObj.boundarySizeMeters.square;
    const meanBoundaryM = (avgStraight + avgSquare) / 2; // ~62m..82m
    const parBoost = (activeStadiumObj.avgFirstInningsScore - 168) * 0.28;
    const sizeAdjustment = (71 - meanBoundaryM) * 0.72;

    const baseFours = Math.max(28, Math.min(48, Math.round(37 + sizeAdjustment * 0.45 + parBoost * 0.4)));
    const baseSixes = Math.max(12, Math.min(34, Math.round(21 + sizeAdjustment * 0.62 + parBoost * 0.5)));

    const buildPhase = (
      phaseId: BoundaryPhaseFilter,
      phaseLabel: string,
      fourDelta: number,
      sixDelta: number,
      benchmark: number
    ): BoundaryPhaseBarItem => {
      const foursRunSharePct = Math.max(20, Math.min(54, baseFours + fourDelta));
      const sixesRunSharePct = Math.max(8, Math.min(40, baseSixes + sixDelta));
      const totalBoundaryPct = Math.min(84, foursRunSharePct + sixesRunSharePct);
      return {
        phaseId,
        phaseLabel,
        foursRunSharePct,
        sixesRunSharePct,
        nonBoundarySharePct: 100 - totalBoundaryPct,
        totalBoundaryPct,
        globalBenchmarkPct: benchmark,
      };
    };

    return [
      buildPhase('all', 'All Overs', 0, 0, 58),
      buildPhase('powerplay', 'Powerplay (1–6)', 8, -3, 63),
      buildPhase('middle', 'Middle (7–15)', -7, -2, 49),
      buildPhase('death', 'Death (16–20)', -2, 10, 66),
    ];
  }, [activeStadiumObj]);

  const activeBoundaryRow =
    boundaryData.find((b) => b.phaseId === boundaryPhase) || boundaryData[0];

  return (
    <div className="space-y-6 font-sans">
      {/* =====================================================================
          DEDICATED TOGGLE CONTROL BAR FOR SOIL MOISTURE & 3D CRACKS OVERLAY
          ===================================================================== */}
      <div className="rounded-2xl border border-slate-800/90 bg-slate-950/90 p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="space-y-0.5">
          <h3 className="text-sm sm:text-base font-bold text-white tracking-tight">
            Sub-Surface Physics, Moisture Evaporation &amp; Venue Scoring Analytics
          </h3>
          <p className="text-xs text-slate-400">
            Calibrated historical &amp; physical turf models synced to {stadiumName} weather
            telemetry.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => {
              cricketAudio.playUiClick();
              onToggleMoistureHardness();
            }}
            className={`inline-flex items-center gap-1.5 rounded-xl border px-3.5 py-2 text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
              showMoistureHardness
                ? 'border-cyan-400 bg-cyan-400 text-slate-950 font-bold'
                : 'border-slate-700 bg-slate-900 text-slate-300 hover:text-white'
            }`}
          >
            <Droplets className="h-3.5 w-3.5 shrink-0" />
            <span>
              Soil Moisture &amp; Pitch Hardness: {showMoistureHardness ? 'On' : 'Off'}
            </span>
          </button>

          <button
            type="button"
            onClick={() => {
              cricketAudio.playUiClick();
              onToggle3DCracksCanvas();
            }}
            className={`inline-flex items-center gap-1.5 rounded-xl border px-3.5 py-2 text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
              show3DCracksCanvas
                ? 'border-amber-400 bg-amber-400 text-slate-950 font-bold'
                : 'border-slate-700 bg-slate-900 text-slate-300 hover:text-white'
            }`}
          >
            <Layers className="h-3.5 w-3.5 shrink-0" />
            <span>3D Cracks &amp; Dryness Canvas: {show3DCracksCanvas ? 'On' : 'Off'}</span>
          </button>
        </div>
      </div>

      {/* =====================================================================
          DELIVERABLE 5: SOIL MOISTURE EVAPORATION & PITCH HARDNESS SQUARE HEATMAP
          ===================================================================== */}
      {showMoistureHardness && (
        <section className="rounded-2xl border border-slate-800/90 bg-[#050d1d] p-4 sm:p-5 space-y-4">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-slate-800/80 pb-3.5">
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2 text-xs text-cyan-300 font-medium">
                <Sun className="h-3.5 w-3.5 text-amber-400 shrink-0" />
                <span>Real-Time Square Evaporation &amp; Clegg Hammer Hardness</span>
                <span aria-hidden="true" className="text-slate-600">
                  ·
                </span>
                <span className="text-slate-400">5-Strip Cricket Square Matrix</span>
              </div>
              <h3 className="font-heading text-base sm:text-lg font-bold text-white tracking-tight">
                Soil Moisture Evaporation &amp; Pitch Hardness Heatmap
              </h3>
            </div>

            <div
              role="group"
              aria-label="Moisture and Hardness Heatmap Lens"
              className="inline-flex items-center rounded-xl border border-slate-800 bg-slate-950 p-1 text-xs shrink-0"
            >
              {(
                [
                  { id: 'combined', label: 'Combined Bounce/Seam' },
                  { id: 'evaporation', label: 'Evaporation (mm/hr)' },
                  { id: 'hardness', label: 'Hardness (Gmax)' },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => {
                    cricketAudio.playUiClick();
                    setMoistureLens(tab.id);
                  }}
                  className={`rounded-lg px-2.5 py-1.5 font-semibold transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                    moistureLens === tab.id
                      ? 'bg-cyan-400 text-slate-950 font-bold'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 items-stretch">
            {/* 5-Strip x 4-Corridor Color-Coded Square Heatmap */}
            <div className="xl:col-span-8 rounded-xl border border-slate-800/90 bg-slate-950/85 p-3.5 space-y-2.5 overflow-x-auto">
              <div className="min-w-[540px] space-y-2">
                <div className="grid grid-cols-5 gap-2 text-[11px] font-semibold text-slate-400 px-1">
                  <span>Square Strip</span>
                  <span>Full (2m–5m)</span>
                  <span>Good (5m–8m)</span>
                  <span>Back-Len (8m–11m)</span>
                  <span>Short (11m–15m)</span>
                </div>

                {[1, 2, 3, 4, 5].map((stripIdx) => {
                  const rowCells = squareGrid.filter((c) => c.stripIndex === stripIdx);
                  const stripTitle = rowCells[0]?.stripLabel || `Strip ${stripIdx}`;
                  const isMatchStrip = stripIdx === 3;

                  return (
                    <div
                      key={stripIdx}
                      className={`grid grid-cols-5 gap-2 items-center rounded-xl p-1.5 ${
                        isMatchStrip
                          ? 'border border-cyan-500/35 bg-cyan-950/15'
                          : 'border border-transparent'
                      }`}
                    >
                      <div className="pr-2">
                        <span className="text-xs font-semibold text-white block truncate">
                          {stripTitle}
                        </span>
                        {isMatchStrip && (
                          <span className="text-[10px] text-cyan-300 font-medium">
                            Active Match Pitch
                          </span>
                        )}
                      </div>

                      {rowCells.map((cell) => {
                        const isSelected = cell.id === inspectedCell.id;
                        return (
                          <button
                            key={cell.id}
                            type="button"
                            onClick={() => {
                              cricketAudio.playUiClick();
                              setSelectedCellId(cell.id);
                            }}
                            style={{
                              backgroundColor: `${cell.heatHex}22`,
                              borderColor: isSelected ? '#ffffff' : `${cell.heatHex}66`,
                            }}
                            className="rounded-lg border p-2 text-left transition-transform duration-150 hover:scale-[1.02] cursor-pointer"
                          >
                            <div className="flex items-center justify-between gap-1">
                              <span
                                className="h-2 w-2 rounded-full shrink-0"
                                style={{ backgroundColor: cell.heatHex }}
                              />
                              <span className="text-[11px] font-mono font-bold text-white tabular-nums">
                                {moistureLens === 'evaporation'
                                  ? `${cell.evaporationMmHr} mm/h`
                                  : moistureLens === 'hardness'
                                  ? `${cell.hardnessGmax} Gmax`
                                  : `${cell.moistureVwcPct}% VWC`}
                              </span>
                            </div>
                            <div className="mt-1 flex items-center justify-between text-[10px] font-mono text-slate-300 tabular-nums">
                              <span>{cell.bounceCarryCm}cm</span>
                              <span>±{cell.seamMovementDeg}°</span>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Selected Square Cell Impact Diagnostic */}
            <div className="xl:col-span-4 rounded-xl border border-slate-800/90 bg-slate-900/70 p-4 flex flex-col justify-between space-y-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-2 border-b border-slate-800 pb-2.5">
                  <div>
                    <span className="text-[11px] text-cyan-300 font-medium block">
                      {inspectedCell.stripLabel}
                    </span>
                    <h4 className="text-sm font-bold text-white">
                      {inspectedCell.corridorLabel} ({inspectedCell.yardRange})
                    </h4>
                  </div>
                  <span className="text-xs font-semibold text-amber-300">
                    {inspectedCell.regimeTag}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2.5 text-xs">
                  <div className="rounded-lg border border-slate-800 bg-slate-950/85 p-2.5">
                    <span className="text-[11px] text-slate-400 block">Evaporation Rate</span>
                    <strong className="text-sm font-mono font-bold text-amber-300 tabular-nums mt-0.5 block">
                      {inspectedCell.evaporationMmHr} mm/hr
                    </strong>
                    <span className="text-[10px] font-mono text-slate-500 tabular-nums">
                      {inspectedCell.evaporationGm2Hr} g/m²/hr loss
                    </span>
                  </div>

                  <div className="rounded-lg border border-slate-800 bg-slate-950/85 p-2.5">
                    <span className="text-[11px] text-slate-400 block">Pitch Hardness</span>
                    <strong className="text-sm font-mono font-bold text-emerald-300 tabular-nums mt-0.5 block">
                      {inspectedCell.hardnessGmax} Gmax
                    </strong>
                    <span className="text-[10px] font-mono text-slate-500 tabular-nums">
                      {inspectedCell.hardnessMpa} MPa compressive
                    </span>
                  </div>

                  <div className="rounded-lg border border-slate-800 bg-slate-950/85 p-2.5">
                    <span className="text-[11px] text-slate-400 block">Stump Bounce Carry</span>
                    <strong className="text-sm font-mono font-bold text-white tabular-nums mt-0.5 block">
                      {inspectedCell.bounceCarryCm} cm
                    </strong>
                    <span className="text-[10px] text-slate-500">Hardness-linked rise</span>
                  </div>

                  <div className="rounded-lg border border-slate-800 bg-slate-950/85 p-2.5">
                    <span className="text-[11px] text-slate-400 block">Seam Deviation</span>
                    <strong className="text-sm font-mono font-bold text-cyan-300 tabular-nums mt-0.5 block">
                      ±{inspectedCell.seamMovementDeg}°
                    </strong>
                    <span className="text-[10px] text-slate-500">
                      @ {inspectedCell.moistureVwcPct}% soil VWC
                    </span>
                  </div>
                </div>
              </div>

              <p className="text-xs text-slate-300 leading-relaxed border-t border-slate-800/80 pt-3">
                At <strong className="font-mono tabular-nums">{inspectedCell.evaporationMmHr} mm/hr</strong>{' '}
                evaporation and <strong className="font-mono tabular-nums">{inspectedCell.hardnessGmax} Gmax</strong>{' '}
                surface hardness, deliveries pitching in {inspectedCell.yardRange} carry at{' '}
                <strong className="font-mono tabular-nums">{inspectedCell.bounceCarryCm} cm</strong> with{' '}
                <strong className="font-mono tabular-nums">±{inspectedCell.seamMovementDeg}°</strong>{' '}
                lateral seam nip.
              </p>
            </div>
          </div>
        </section>
      )}

      {/* =====================================================================
          DELIVERABLE 8: 3D-EFFECT PITCH CRACKS & DRYNESS CANVAS OVERLAY
          ===================================================================== */}
      {show3DCracksCanvas && (
        <Pitch3DCracksCanvasOverlay
          stadiumName={stadiumName}
          temperature={temperature}
          humidity={humidity}
          windSpeed={windSpeed}
          dewLevel={dewLevel}
          pitchWear={pitchWear}
          grassCoverage={grassCoverage}
          matchDay={matchDay}
        />
      )}

      {/* =====================================================================
          DELIVERABLES 6 & 7: SPIN VS SEAM EFFICACY + BOUNDARY EFFICIENCY CHARTS
          ===================================================================== */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-stretch">
        {/* DELIVERABLE 6: SPIN VS SEAM EFFICACY ACROSS MOISTURE RATINGS */}
        <section className="xl:col-span-6 rounded-2xl border border-slate-800/90 bg-[#050d1d] p-4 sm:p-5 space-y-4 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-800/80 pb-3.5">
              <div className="space-y-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2 text-xs text-amber-300 font-medium">
                  <Activity className="h-3.5 w-3.5 text-amber-400 shrink-0" />
                  <span>Calibrated Historical Venue Split</span>
                  <span aria-hidden="true" className="text-slate-600">
                    ·
                  </span>
                  <span className="text-cyan-300">
                    Active Moisture: {activeMoistureRating.toUpperCase()}
                  </span>
                </div>
                <h3 className="font-heading text-base sm:text-lg font-bold text-white tracking-tight">
                  Spin vs. Seam Efficacy by Pitch Moisture
                </h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Compares historical wickets-per-over yield for spinners vs. seamers when pitch
                  moisture is rated Low, Medium, or High.
                </p>
              </div>

              <div
                role="group"
                aria-label="Spin vs Seam Metric Selector"
                className="inline-flex items-center rounded-xl border border-slate-800 bg-slate-950 p-1 text-[11px] shrink-0"
              >
                {(
                  [
                    { id: 'wickets_per_over', label: 'Wkts / Over' },
                    { id: 'strike_rate', label: 'Strike Rate' },
                    { id: 'economy', label: 'Economy' },
                  ] as const
                ).map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => {
                      cricketAudio.playUiClick();
                      setSpinSeamMetric(m.id);
                    }}
                    className={`rounded-lg px-2.5 py-1 font-semibold transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                      spinSeamMetric === m.id
                        ? 'bg-amber-400 text-slate-950 font-bold'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded-xl border border-slate-800/90 bg-slate-900/60 p-3 space-y-2.5">
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-4 font-medium">
                  <span className="inline-flex items-center gap-1.5 text-amber-300">
                    <span className="h-2.5 w-2.5 rounded-sm bg-amber-500" />
                    <span>Spinners</span>
                  </span>
                  <span className="inline-flex items-center gap-1.5 text-cyan-300">
                    <span className="h-2.5 w-2.5 rounded-sm bg-cyan-500" />
                    <span>Seamers</span>
                  </span>
                </div>
                <span className="text-[11px] text-slate-400">Click moisture tier to inspect</span>
              </div>

              <SpinVsSeamEfficacyD3Chart
                buckets={spinSeamBuckets}
                activeRating={activeMoistureRating}
                metricMode={spinSeamMetric}
                selectedRating={inspectedMoistureRating}
                onSelectRating={setInspectedMoistureRating}
              />
            </div>
          </div>

          <div className="rounded-xl border border-slate-800/90 bg-slate-950/90 p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
            <div>
              <span className="font-semibold text-white">
                {activeSpinSeamBucket.label} ({activeSpinSeamBucket.matchesSampled} Matches)
              </span>
              <span className="text-slate-500 mx-1.5">·</span>
              <span className="text-slate-400">
                {activeSpinSeamBucket.spinWicketsPerOver > activeSpinSeamBucket.seamWicketsPerOver
                  ? 'Spinners hold higher wicket-per-over strike power'
                  : 'Seamers dominate new-ball & seam-nip wicket ratio'}
              </span>
            </div>
            <div className="flex items-center gap-3 font-mono tabular-nums shrink-0">
              <span className="text-amber-300">
                Spin: <strong>{activeSpinSeamBucket.spinWicketsPerOver} w/ov</strong>
              </span>
              <span className="text-cyan-300">
                Seam: <strong>{activeSpinSeamBucket.seamWicketsPerOver} w/ov</strong>
              </span>
            </div>
          </div>
        </section>

        {/* DELIVERABLE 7: BOUNDARY EFFICIENCY CHART (STADIUM FILTERED) */}
        <section className="xl:col-span-6 rounded-2xl border border-slate-800/90 bg-[#050d1d] p-4 sm:p-5 space-y-4 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-800/80 pb-3.5">
              <div className="space-y-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2 text-xs text-emerald-300 font-medium">
                  <BarChart3 className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                  <span>Venue Boundary Scoring Share (4s &amp; 6s vs Total Runs)</span>
                </div>
                <h3 className="font-heading text-base sm:text-lg font-bold text-white tracking-tight">
                  Boundary Efficiency by Stadium
                </h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Percentage of total runs scored in boundaries (4s and 6s) vs running between
                  wickets, calibrated to {activeStadiumObj.name} dimensions (
                  {activeStadiumObj.boundarySizeMeters.straight}m straight /{' '}
                  {activeStadiumObj.boundarySizeMeters.square}m square).
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <MapPin className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                <select
                  aria-label="Filter Boundary Efficiency by Stadium"
                  value={selectedBoundaryStadiumId}
                  onChange={(e) => {
                    cricketAudio.playUiClick();
                    setSelectedBoundaryStadiumId(e.target.value);
                  }}
                  className="rounded-xl border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white focus:border-emerald-400 focus:outline-none cursor-pointer max-w-[210px] truncate"
                >
                  {STADIUMS.map((st) => (
                    <option key={st.id} value={st.id}>
                      {st.name} ({st.city})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="rounded-xl border border-slate-800/90 bg-slate-900/60 p-3 space-y-2.5">
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                <div className="flex flex-wrap items-center gap-3.5 font-medium">
                  <span className="inline-flex items-center gap-1.5 text-emerald-300">
                    <span className="h-2.5 w-2.5 rounded-sm bg-emerald-500" />
                    <span>Fours Run %</span>
                  </span>
                  <span className="inline-flex items-center gap-1.5 text-sky-300">
                    <span className="h-2.5 w-2.5 rounded-sm bg-sky-400" />
                    <span>Sixes Run %</span>
                  </span>
                  <span className="inline-flex items-center gap-1.5 text-amber-300">
                    <span className="h-0.5 w-3.5 bg-amber-400 inline-block" />
                    <span>Global Par %</span>
                  </span>
                </div>
                <span className="text-[11px] font-mono text-slate-400 tabular-nums">
                  1st Inn Par: {activeStadiumObj.avgFirstInningsScore}
                </span>
              </div>

              <BoundaryEfficiencyD3Chart
                items={boundaryData}
                activePhase={boundaryPhase}
                onSelectPhase={setBoundaryPhase}
              />
            </div>
          </div>

          <div className="rounded-xl border border-slate-800/90 bg-slate-950/90 p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2">
              <Target className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
              <span className="font-semibold text-white">{activeBoundaryRow.phaseLabel}:</span>
              <span className="text-slate-300">
                <strong className="font-mono text-emerald-300 tabular-nums">
                  {activeBoundaryRow.totalBoundaryPct}%
                </strong>{' '}
                of runs via boundaries vs{' '}
                <strong className="font-mono text-slate-200 tabular-nums">
                  {activeBoundaryRow.nonBoundarySharePct}%
                </strong>{' '}
                ones/twos/threes
              </span>
            </div>
            <div className="font-mono tabular-nums text-xs shrink-0 text-amber-300">
              vs {activeBoundaryRow.globalBenchmarkPct}% Tour Avg (
              {activeBoundaryRow.totalBoundaryPct >= activeBoundaryRow.globalBenchmarkPct
                ? `+${activeBoundaryRow.totalBoundaryPct - activeBoundaryRow.globalBenchmarkPct}%`
                : `${activeBoundaryRow.totalBoundaryPct - activeBoundaryRow.globalBenchmarkPct}%`}
              )
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};
