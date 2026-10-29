import React, { useState, useEffect, useRef } from 'react';
import {
  Clock,
  Zap,
  Target,
  Flame,
  Activity,
  Layers,
  Sparkles,
  RotateCcw,
  ShieldCheck,
  AlertTriangle,
} from 'lucide-react';
import { Player } from '../../types/cricket';
import { cricketAudio } from '../../utils/audioSystem';

interface BattingTimingProps {
  batter?: Player | null;
  ballsFaced?: number;
  initialPowerplayAggression?: number;
}

interface TimingBin {
  offsetMs: number; // e.g. -50 to +50
  label: string;
  count: number;
  quality: 'sweet_spot' | 'early_danger' | 'late_controlled' | 'late_danger';
  efficiency: number;
}

export const BattingTimingVisualizer: React.FC<BattingTimingProps> = ({
  batter,
  ballsFaced = 34,
  initialPowerplayAggression = 82,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [selectedLength, setSelectedLength] = useState<'all' | 'yorker' | 'good' | 'full' | 'short'>('all');
  const [powerplayAggression, setPowerplayAggression] = useState<number>(initialPowerplayAggression);
  const [hoveredBin, setHoveredBin] = useState<TimingBin | null>(null);

  // Generate temporal timing contact points (-50ms to +50ms)
  const timingBins: TimingBin[] = [
    { offsetMs: -50, label: 'Very Early (-50ms)', count: 2, quality: 'early_danger', efficiency: 18 },
    { offsetMs: -40, label: 'Early Check (-40ms)', count: 3, quality: 'early_danger', efficiency: 32 },
    { offsetMs: -30, label: 'Early Drive (-30ms)', count: 5, quality: 'early_danger', efficiency: 54 },
    { offsetMs: -20, label: 'Slight Early (-20ms)', count: 7, quality: 'sweet_spot', efficiency: 78 },
    { offsetMs: -10, label: 'Front-Foot Crisp (-10ms)', count: 12, quality: 'sweet_spot', efficiency: 94 },
    { offsetMs: 0, label: 'Center Sweet Spot (0ms)', count: 18, quality: 'sweet_spot', efficiency: 100 },
    { offsetMs: 10, label: 'Middle-of-Bat (+10ms)', count: 14, quality: 'sweet_spot', efficiency: 96 },
    { offsetMs: 20, label: 'Late Punch (+20ms)', count: 9, quality: 'late_controlled', efficiency: 86 },
    { offsetMs: 30, label: 'Late Guide/Dab (+30ms)', count: 6, quality: 'late_controlled', efficiency: 72 },
    { offsetMs: 40, label: 'Tardy Jam (+40ms)', count: 3, quality: 'late_danger', efficiency: 42 },
    { offsetMs: 50, label: 'Beaten for Pace (+50ms)', count: 1, quality: 'late_danger', efficiency: 14 },
  ];

  // Draw Canvas Temporal Histogram
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    ctx.clearRect(0, 0, width, height);

    // Padding
    const padX = 50;
    const padY = 40;
    const chartW = width - padX * 2;
    const chartH = height - padY * 2;

    // Background Grid
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
      const y = padY + (chartH / 4) * i;
      ctx.beginPath();
      ctx.moveTo(padX, y);
      ctx.lineTo(padX + chartW, y);
      ctx.stroke();
    }

    // Zero-Line (Optimal Pitch Timing 0ms)
    const zeroX = padX + chartW / 2;
    ctx.strokeStyle = 'rgba(6, 182, 212, 0.6)';
    ctx.lineWidth = 2;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(zeroX, padY);
    ctx.lineTo(zeroX, padY + chartH);
    ctx.stroke();
    ctx.setLineDash([]);

    // Zero line text marker
    ctx.fillStyle = '#06b6d4';
    ctx.font = 'bold 10px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('OPTIMAL SWEET SPOT (0ms)', zeroX, padY - 12);

    // Render Histogram Bars
    const maxCount = 20;
    const binW = chartW / timingBins.length;

    timingBins.forEach((bin, idx) => {
      const x = padX + idx * binW;
      const barH = (bin.count / maxCount) * chartH;
      const y = padY + chartH - barH;

      // Color based on quality
      let fillGrad = ctx.createLinearGradient(x, y, x, padY + chartH);
      if (bin.quality === 'sweet_spot') {
        fillGrad.addColorStop(0, '#10b981');
        fillGrad.addColorStop(1, 'rgba(16, 185, 129, 0.2)');
      } else if (bin.quality === 'late_controlled') {
        fillGrad.addColorStop(0, '#06b6d4');
        fillGrad.addColorStop(1, 'rgba(6, 182, 212, 0.2)');
      } else if (bin.offsetMs < 0) {
        fillGrad.addColorStop(0, '#f59e0b');
        fillGrad.addColorStop(1, 'rgba(245, 158, 11, 0.2)');
      } else {
        fillGrad.addColorStop(0, '#f43f5e');
        fillGrad.addColorStop(1, 'rgba(244, 63, 94, 0.2)');
      }

      ctx.fillStyle = fillGrad;
      ctx.beginPath();
      ctx.roundRect(x + 4, y, binW - 8, barH, [4, 4, 0, 0]);
      ctx.fill();

      // Top Highlight Line
      ctx.strokeStyle = bin.quality === 'sweet_spot' ? '#34d399' : '#38bdf8';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(x + 4, y);
      ctx.lineTo(x + binW - 4, y);
      ctx.stroke();

      // Count above bar
      ctx.fillStyle = '#f8fafc';
      ctx.font = 'bold 10px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(`${bin.count}`, x + binW / 2, y - 5);

      // X Label (Offset in ms)
      ctx.fillStyle = bin.offsetMs === 0 ? '#06b6d4' : '#94a3b8';
      ctx.font = bin.offsetMs === 0 ? 'bold 10px monospace' : '9px monospace';
      ctx.fillText(`${bin.offsetMs > 0 ? '+' : ''}${bin.offsetMs}`, x + binW / 2, padY + chartH + 18);
    });

    // Axis labels
    ctx.fillStyle = '#64748b';
    ctx.font = '10px monospace';
    ctx.textAlign = 'left';
    ctx.fillText('← EARLY LEADING EDGE HAZARD', padX, padY + chartH + 32);
    ctx.textAlign = 'right';
    ctx.fillText('LATE BEATEN FOR PACE HAZARD →', padX + chartW, padY + chartH + 32);
  }, [timingBins, selectedLength]);

  const sweetSpotCount = timingBins
    .filter((b) => b.quality === 'sweet_spot')
    .reduce((acc, b) => acc + b.count, 0);
  const totalContacts = timingBins.reduce((acc, b) => acc + b.count, 0);
  const sweetSpotPercent = Math.round((sweetSpotCount / (totalContacts || 1)) * 100);

  return (
    <div className="rounded-2xl border border-cyan-500/30 bg-gradient-to-b from-[#03091c]/95 to-[#020510]/95 p-5 backdrop-blur-xl shadow-2xl space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-cyan-500/20 pb-3">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono font-bold text-cyan-400 uppercase tracking-wider">
            <Clock className="h-4 w-4 animate-pulse text-cyan-400" />
            <span>BATTING TIMING HISTOGRAM · TEMPORAL CONTACT POINT MATRIX</span>
          </div>
          <h3 className="text-base font-black text-white mt-0.5">
            {batter?.name || 'Opening Striker'}: Millisecond Pitch-Impact Synchronization
          </h3>
        </div>

        {/* Filter for delivery lengths */}
        <div className="flex items-center gap-1.5 rounded-xl border border-slate-800 bg-slate-900/90 p-1 text-xs font-mono">
          {[
            { id: 'all', label: 'All Deliveries' },
            { id: 'full', label: 'Full / Slots' },
            { id: 'good', label: 'Good Length' },
            { id: 'short', label: 'Short Bouncers' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                setSelectedLength(tab.id as any);
                cricketAudio.playBatHit();
              }}
              className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                selectedLength === tab.id
                  ? 'bg-cyan-500 text-slate-950 font-bold shadow-md shadow-cyan-500/20'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Aggression Timing Metrics Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs font-mono">
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-3 space-y-1">
          <span className="text-[10px] text-slate-400 block uppercase">Sweet Spot Precision</span>
          <div className="flex items-baseline justify-between">
            <span className="text-xl font-black text-emerald-400">{sweetSpotPercent}%</span>
            <span className="text-[10px] text-emerald-300 font-bold">±10ms Window</span>
          </div>
          <span className="text-[10px] text-slate-500 block truncate">
            {sweetSpotCount} of {totalContacts} deliveries squared up
          </span>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-3 space-y-1">
          <span className="text-[10px] text-slate-400 block uppercase">Powerplay Aggression Index</span>
          <div className="flex items-baseline justify-between">
            <span className="text-xl font-black text-cyan-400">{powerplayAggression}%</span>
            <span className="text-[10px] text-cyan-300 font-bold">Elite Conversion</span>
          </div>
          <span className="text-[10px] text-slate-500 block truncate">
            Front-foot commitment rate: 84%
          </span>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-3 space-y-1">
          <span className="text-[10px] text-slate-400 block uppercase">Early Leading Edge Risk</span>
          <div className="flex items-baseline justify-between">
            <span className="text-xl font-black text-amber-400">12%</span>
            <span className="text-[10px] text-amber-300 font-bold">Low Risk</span>
          </div>
          <span className="text-[10px] text-slate-500 block truncate">
            Checked drives on slow cutters
          </span>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-3 space-y-1">
          <span className="text-[10px] text-slate-400 block uppercase">Late Reaction Loss</span>
          <div className="flex items-baseline justify-between">
            <span className="text-xl font-black text-rose-400">5.8%</span>
            <span className="text-[10px] text-rose-300 font-bold">148+ km/h Bouncers</span>
          </div>
          <span className="text-[10px] text-slate-500 block truncate">
            Late jam defense against yorkers
          </span>
        </div>
      </div>

      {/* Canvas Temporal Histogram Container */}
      <div className="rounded-xl border border-slate-800 bg-slate-950 p-4 space-y-2">
        <div className="flex items-center justify-between text-xs font-mono text-slate-400">
          <span className="font-bold text-white flex items-center gap-1.5">
            <Activity className="h-4 w-4 text-cyan-400" />
            <span>CONTACT POINT TEMPORAL DISTRIBUTION (MILLISECONDS VS BALL RELEASE)</span>
          </span>
          <span className="text-[10px] text-slate-500">N={totalContacts} Recorded Deliveries</span>
        </div>

        {/* HTML5 Canvas */}
        <canvas
          ref={canvasRef}
          width={640}
          height={240}
          className="w-full h-auto rounded-lg bg-slate-900/40"
        />

        {/* Legend */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-800 text-[10px] font-mono text-slate-400">
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm bg-emerald-400" />
            <span>Optimal Sweet Spot (-10ms to +10ms)</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm bg-cyan-400" />
            <span>Controlled Late Cut (+20ms to +30ms)</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm bg-amber-400" />
            <span>Early Reach Danger (-50ms to -20ms)</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm bg-rose-400" />
            <span>Late Pace Beaten (&gt;+40ms)</span>
          </span>
        </div>
      </div>

      {/* Powerplay Aggression Simulation Slider */}
      <div className="rounded-xl border border-cyan-500/20 bg-slate-900/60 p-4 space-y-2 font-mono text-xs">
        <div className="flex items-center justify-between">
          <span className="text-slate-300 font-bold flex items-center gap-1.5">
            <Flame className="h-4 w-4 text-amber-400" />
            <span>ADJUST POWERPLAY AGGRESSION TEMPO</span>
          </span>
          <span className="text-cyan-400 font-bold">{powerplayAggression}% Aggression Index</span>
        </div>
        <input
          type="range"
          min="40"
          max="98"
          value={powerplayAggression}
          onChange={(e) => setPowerplayAggression(Number(e.target.value))}
          className="w-full accent-cyan-400 cursor-pointer h-2 bg-slate-800 rounded-lg"
        />
        <div className="flex justify-between text-[10px] text-slate-500">
          <span>Conservative (Anchor: 40-60%)</span>
          <span>Calculated Risk (60-80%)</span>
          <span>Ultra-Aggressive Blitz (80-98%)</span>
        </div>
      </div>
    </div>
  );
};
