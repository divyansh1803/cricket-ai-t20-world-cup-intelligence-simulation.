import React, { useState, useEffect, useRef } from 'react';
import { Target, Layers, RotateCcw, Filter, Activity, Compass } from 'lucide-react';
import { cricketAudio } from '../../utils/audioSystem';

export interface BallLandingPoint {
  id: string;
  over: number;
  ball: number;
  bowlerName: string;
  bowlerType: 'Fast Seam' | 'Off Spin' | 'Leg Spin' | 'Slower Ball';
  length: 'Yorker' | 'Full' | 'Good Length' | 'Short of Good' | 'Short Bouncer';
  line: 'Wide Outside Off' | 'Outside Off' | 'Stumps' | 'Leg Stump' | 'Down Leg';
  speedKmh: number;
  x: number; // 0 (Off) to 1 (Leg) across pitch width
  y: number; // 0 (Bowler) to 1 (Batter Stumps) down pitch length
  outcome: 'Dot' | 'Single' | 'Boundary 4' | 'Six' | 'Wicket';
}

const DEFAULT_LANDING_BALLS: BallLandingPoint[] = [
  // Over 1 (Pace)
  { id: '1.1', over: 1, ball: 1, bowlerName: 'Bumrah', bowlerType: 'Fast Seam', length: 'Good Length', line: 'Outside Off', speedKmh: 141, x: 0.38, y: 0.62, outcome: 'Dot' },
  { id: '1.2', over: 1, ball: 2, bowlerName: 'Bumrah', bowlerType: 'Fast Seam', length: 'Good Length', line: 'Outside Off', speedKmh: 143, x: 0.35, y: 0.58, outcome: 'Dot' },
  { id: '1.3', over: 1, ball: 3, bowlerName: 'Bumrah', bowlerType: 'Fast Seam', length: 'Full', line: 'Stumps', speedKmh: 144, x: 0.50, y: 0.74, outcome: 'Single' },
  { id: '1.4', over: 1, ball: 4, bowlerName: 'Bumrah', bowlerType: 'Fast Seam', length: 'Yorker', line: 'Stumps', speedKmh: 145, x: 0.48, y: 0.88, outcome: 'Wicket' },
  { id: '1.5', over: 1, ball: 5, bowlerName: 'Bumrah', bowlerType: 'Fast Seam', length: 'Good Length', line: 'Outside Off', speedKmh: 142, x: 0.34, y: 0.60, outcome: 'Dot' },
  { id: '1.6', over: 1, ball: 6, bowlerName: 'Bumrah', bowlerType: 'Fast Seam', length: 'Short of Good', line: 'Outside Off', speedKmh: 139, x: 0.32, y: 0.44, outcome: 'Single' },

  // Over 2 (Left-arm Seam)
  { id: '2.1', over: 2, ball: 1, bowlerName: 'Arshdeep', bowlerType: 'Fast Seam', length: 'Full', line: 'Outside Off', speedKmh: 136, x: 0.32, y: 0.72, outcome: 'Boundary 4' },
  { id: '2.2', over: 2, ball: 2, bowlerName: 'Arshdeep', bowlerType: 'Fast Seam', length: 'Good Length', line: 'Outside Off', speedKmh: 137, x: 0.36, y: 0.64, outcome: 'Dot' },
  { id: '2.3', over: 2, ball: 3, bowlerName: 'Arshdeep', bowlerType: 'Fast Seam', length: 'Good Length', line: 'Stumps', speedKmh: 138, x: 0.52, y: 0.66, outcome: 'Single' },
  { id: '2.4', over: 2, ball: 4, bowlerName: 'Arshdeep', bowlerType: 'Fast Seam', length: 'Yorker', line: 'Leg Stump', speedKmh: 140, x: 0.58, y: 0.86, outcome: 'Dot' },
  { id: '2.5', over: 2, ball: 5, bowlerName: 'Arshdeep', bowlerType: 'Fast Seam', length: 'Good Length', line: 'Outside Off', speedKmh: 136, x: 0.36, y: 0.62, outcome: 'Single' },
  { id: '2.6', over: 2, ball: 6, bowlerName: 'Arshdeep', bowlerType: 'Fast Seam', length: 'Short Bouncer', line: 'Stumps', speedKmh: 139, x: 0.50, y: 0.32, outcome: 'Dot' },

  // Over 5 (Spin)
  { id: '5.1', over: 5, ball: 1, bowlerName: 'Axar', bowlerType: 'Off Spin', length: 'Good Length', line: 'Outside Off', speedKmh: 88, x: 0.40, y: 0.65, outcome: 'Single' },
  { id: '5.2', over: 5, ball: 2, bowlerName: 'Axar', bowlerType: 'Off Spin', length: 'Good Length', line: 'Stumps', speedKmh: 91, x: 0.52, y: 0.68, outcome: 'Dot' },
  { id: '5.3', over: 5, ball: 3, bowlerName: 'Axar', bowlerType: 'Off Spin', length: 'Full', line: 'Stumps', speedKmh: 86, x: 0.50, y: 0.78, outcome: 'Wicket' },
  { id: '5.4', over: 5, ball: 4, bowlerName: 'Axar', bowlerType: 'Off Spin', length: 'Good Length', line: 'Outside Off', speedKmh: 89, x: 0.38, y: 0.62, outcome: 'Dot' },
  { id: '5.5', over: 5, ball: 5, bowlerName: 'Axar', bowlerType: 'Off Spin', length: 'Good Length', line: 'Outside Off', speedKmh: 90, x: 0.36, y: 0.64, outcome: 'Single' },
  { id: '5.6', over: 5, ball: 6, bowlerName: 'Axar', bowlerType: 'Off Spin', length: 'Short of Good', line: 'Outside Off', speedKmh: 87, x: 0.34, y: 0.48, outcome: 'Dot' },

  // Over 10 (Death / Middle Pressure)
  { id: '10.1', over: 10, ball: 1, bowlerName: 'Kuldeep', bowlerType: 'Leg Spin', length: 'Good Length', line: 'Outside Off', speedKmh: 84, x: 0.42, y: 0.63, outcome: 'Dot' },
  { id: '10.2', over: 10, ball: 2, bowlerName: 'Kuldeep', bowlerType: 'Leg Spin', length: 'Full', line: 'Outside Off', speedKmh: 82, x: 0.36, y: 0.76, outcome: 'Boundary 4' },
  { id: '10.3', over: 10, ball: 3, bowlerName: 'Kuldeep', bowlerType: 'Leg Spin', length: 'Good Length', line: 'Stumps', speedKmh: 85, x: 0.51, y: 0.66, outcome: 'Wicket' },
  { id: '10.4', over: 10, ball: 4, bowlerName: 'Kuldeep', bowlerType: 'Leg Spin', length: 'Good Length', line: 'Outside Off', speedKmh: 86, x: 0.44, y: 0.60, outcome: 'Dot' },
  { id: '10.5', over: 10, ball: 5, bowlerName: 'Kuldeep', bowlerType: 'Leg Spin', length: 'Short of Good', line: 'Stumps', speedKmh: 88, x: 0.50, y: 0.46, outcome: 'Single' },
  { id: '10.6', over: 10, ball: 6, bowlerName: 'Kuldeep', bowlerType: 'Leg Spin', length: 'Yorker', line: 'Stumps', speedKmh: 92, x: 0.49, y: 0.87, outcome: 'Dot' },
];

export const LandingZoneHeatmap: React.FC = () => {
  const [filterBowlerType, setFilterBowlerType] = useState<string>('all');
  const [selectedPoint, setSelectedPoint] = useState<BallLandingPoint | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const filteredBalls = DEFAULT_LANDING_BALLS.filter((b) => {
    if (filterBowlerType === 'all') return true;
    return b.bowlerType === filterBowlerType;
  });

  // Render Canvas Landing Zone Heatmap
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    ctx.clearRect(0, 0, width, height);

    // 3D Pitch Strip coordinates
    const topW = width * 0.38;
    const bottomW = width * 0.66;
    const topY = height * 0.12;
    const bottomY = height * 0.88;
    const centerX = width * 0.5;

    // Grass outfield
    ctx.fillStyle = '#021810';
    ctx.fillRect(0, 0, width, height);

    // Pitch Strip
    ctx.beginPath();
    ctx.moveTo(centerX - topW / 2, topY);
    ctx.lineTo(centerX + topW / 2, topY);
    ctx.lineTo(centerX + bottomW / 2, bottomY);
    ctx.lineTo(centerX - bottomW / 2, bottomY);
    ctx.closePath();

    const pitchGrad = ctx.createLinearGradient(centerX, topY, centerX, bottomY);
    pitchGrad.addColorStop(0, '#784620');
    pitchGrad.addColorStop(0.5, '#8c5225');
    pitchGrad.addColorStop(1, '#663717');
    ctx.fillStyle = pitchGrad;
    ctx.fill();
    ctx.strokeStyle = '#a2622e';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Creases
    ctx.beginPath();
    ctx.moveTo(centerX - topW * 0.6, topY + 12);
    ctx.lineTo(centerX + topW * 0.6, topY + 12);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(centerX - bottomW * 0.65, bottomY - 22);
    ctx.lineTo(centerX + bottomW * 0.65, bottomY - 22);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2.5;
    ctx.stroke();

    // Stumps at bottom
    ctx.fillStyle = '#f59e0b';
    for (let s = -1; s <= 1; s++) {
      ctx.fillRect(centerX + s * 6 - 1.5, bottomY - 20, 3, 16);
    }

    // Length Guidelines
    const lengths = [
      { label: 'SHORT (8-10m)', factor: 0.35, color: 'rgba(239, 68, 68, 0.25)' },
      { label: 'GOOD LENGTH (6-8m)', factor: 0.60, color: 'rgba(56, 189, 248, 0.25)' },
      { label: 'FULL PITCH (4-6m)', factor: 0.76, color: 'rgba(52, 211, 153, 0.25)' },
      { label: 'YORKER (0-2m)', factor: 0.88, color: 'rgba(245, 158, 11, 0.25)' },
    ];

    lengths.forEach((len) => {
      const curY = topY + (bottomY - topY) * len.factor;
      const curW = topW + (bottomW - topW) * len.factor;
      ctx.beginPath();
      ctx.moveTo(centerX - curW / 2, curY);
      ctx.lineTo(centerX + curW / 2, curY);
      ctx.strokeStyle = len.color;
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);
      ctx.stroke();
      ctx.setLineDash([]);
    });

    // Render Ball Landing Spots with Heat Map Density Glow
    filteredBalls.forEach((b) => {
      const curY = topY + (bottomY - topY) * b.y;
      const curW = topW + (bottomW - topW) * b.y;
      const curX = centerX - curW / 2 + curW * b.x;

      const isSelected = selectedPoint?.id === b.id;

      // Color coding by outcome:
      // Wicket -> Red glow; Dot -> Emerald; Boundary -> Amber
      const color =
        b.outcome === 'Wicket'
          ? '#ef4444'
          : b.outcome.includes('Boundary')
          ? '#f59e0b'
          : b.outcome === 'Six'
          ? '#a855f7'
          : '#10b981';

      // Outer heat halo
      ctx.save();
      ctx.beginPath();
      ctx.arc(curX, curY, isSelected ? 16 : 10, 0, Math.PI * 2);
      ctx.fillStyle = `${color}44`;
      ctx.shadowColor = color;
      ctx.shadowBlur = isSelected ? 20 : 8;
      ctx.fill();

      // Core point
      ctx.beginPath();
      ctx.arc(curX, curY, isSelected ? 5.5 : 4, 0, Math.PI * 2);
      ctx.fillStyle = '#ffffff';
      ctx.fill();
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.restore();
    });
  }, [filteredBalls, selectedPoint]);

  return (
    <div className="rounded-2xl border border-cyan-500/30 bg-slate-950/80 p-5 backdrop-blur-xl shadow-2xl space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-cyan-500/20 pb-3">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono font-bold text-cyan-400 uppercase tracking-wider">
            <Target className="h-4 w-4 animate-pulse" />
            <span>BOWLER LANDING ZONE HEATMAP (LAST 10 OVERS TELEMETRY)</span>
          </div>
          <h3 className="text-base font-black text-white mt-0.5">
            22-Yard Pitch Impact Coordinates & Deviation Margins
          </h3>
        </div>

        {/* Bowler Filter */}
        <div className="flex items-center gap-1.5 rounded-xl bg-slate-900 border border-slate-800 p-1 text-xs font-mono">
          <Filter className="h-3.5 w-3.5 text-slate-400 ml-1.5" />
          {[
            { id: 'all', label: 'All Deliveries' },
            { id: 'Fast Seam', label: 'Pace & Seam' },
            { id: 'Off Spin', label: 'Off Spin' },
            { id: 'Leg Spin', label: 'Leg Spin' },
          ].map((cat) => (
            <button
              key={cat.id}
              onClick={() => {
                setFilterBowlerType(cat.id);
                cricketAudio.playBatHit();
              }}
              className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                filterBowlerType === cat.id
                  ? 'bg-cyan-500 text-slate-950 font-bold shadow-md shadow-cyan-500/20'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main Canvas & Details */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-center">
        {/* Canvas Display (Left) */}
        <div className="md:col-span-7 rounded-2xl overflow-hidden border border-slate-800 bg-slate-950 shadow-inner relative">
          <canvas
            ref={canvasRef}
            width={640}
            height={340}
            className="w-full h-72 sm:h-80 object-cover block cursor-pointer"
          />

          <div className="absolute top-3 left-3 bg-slate-950/85 border border-slate-800 rounded-xl px-3 py-1.5 text-xs font-mono backdrop-blur-md">
            <span className="text-slate-400 block text-[9px]">SAMPLE SIZE:</span>
            <strong className="text-cyan-400">{filteredBalls.length} Tracked Deliveries</strong>
          </div>
        </div>

        {/* Selected / Recent Deliveries Feed (Right) */}
        <div className="md:col-span-5 space-y-3 font-mono text-xs">
          <span className="text-slate-400 font-bold block uppercase text-[11px]">
            DELIVERY TELEMETRY LOG (CLICK TO HIGHLIGHT)
          </span>

          <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
            {filteredBalls.map((b) => {
              const isSelected = selectedPoint?.id === b.id;
              return (
                <div
                  key={b.id}
                  onClick={() => {
                    setSelectedPoint(b);
                    cricketAudio.playBatHit();
                  }}
                  className={`p-2.5 rounded-xl border text-xs transition-all cursor-pointer ${
                    isSelected
                      ? 'border-cyan-400 bg-cyan-500/20 shadow-md shadow-cyan-500/20'
                      : 'border-slate-800 bg-slate-900/60 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-white">
                      Ov {b.id} · {b.bowlerName} ({b.speedKmh} km/h)
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        b.outcome === 'Wicket'
                          ? 'bg-rose-500/20 text-rose-300'
                          : b.outcome.includes('Boundary')
                          ? 'bg-amber-500/20 text-amber-300'
                          : 'bg-emerald-500/20 text-emerald-300'
                      }`}
                    >
                      {b.outcome}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-400 flex justify-between">
                    <span>{b.length}</span>
                    <span className="text-cyan-300">{b.line}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
