import React, { useState, useEffect, useRef } from 'react';
import { Layers, RotateCcw } from 'lucide-react';
import { cricketAudio } from '../../utils/audioSystem';

interface PitchSurfaceWearProps {
  initialWear?: number; // 0-100%
  onWearChanged?: (newWear: number, stageName: string) => void;
}

export interface PitchWearStage {
  name: string;
  description: string;
  bounceFactor: number;
  turnDeg: number;
  color: string;
  gaugeGradient: string;
  hazardNotice: string;
}

export const getPitchWearStage = (wearPercentage: number): PitchWearStage => {
  if (wearPercentage < 20) {
    return {
      name: 'PRISTINE HARD CLAY',
      description: 'Virgin compacted Bulli clay with tight grass binding. Consistent true bounce and minimal seam friction.',
      bounceFactor: 92,
      turnDeg: 1.2,
      color: '#10b981',
      gaugeGradient: 'from-emerald-400 to-teal-500',
      hazardNotice: 'High batting paradise; zero puffing dust.',
    };
  } else if (wearPercentage < 50) {
    return {
      name: 'SETTLED & ABRASIVE',
      description: 'Spikes have begun to break the top glaze. New ball begins to lose shine rapidly after 6 overs.',
      bounceFactor: 86,
      turnDeg: 2.2,
      color: '#38bdf8',
      gaugeGradient: 'from-sky-400 to-cyan-500',
      hazardNotice: 'Reverse swing window opens for pacers.',
    };
  } else if (wearPercentage < 80) {
    return {
      name: 'FOOTMARK EROSION',
      description: 'Deep scuffs outside right and left-hander off stump. Finger spinners extract sharp bite and dip.',
      bounceFactor: 78,
      turnDeg: 3.6,
      color: '#f59e0b',
      gaugeGradient: 'from-amber-400 to-orange-500',
      hazardNotice: 'Variable bounce on good length; keeper stands back.',
    };
  } else {
    return {
      name: 'DUSTY & CRACKED MINEFIELD',
      description: 'Severe surface fissuring across the landing corridor. Ball puffs plumes of dust on impact with dramatic turn.',
      bounceFactor: 68,
      turnDeg: 4.9,
      color: '#ef4444',
      gaugeGradient: 'from-rose-500 to-red-600',
      hazardNotice: 'Batting nightmare; shooters and unplayable spitters.',
    };
  }
};

export const PitchSurfaceWearVisualizer: React.FC<PitchSurfaceWearProps> = ({
  initialWear = 35,
  onWearChanged,
}) => {
  // Ball impact count (0 to 240 balls = 40 overs / 2 innings in T20)
  const [impactCount, setImpactCount] = useState<number>(() => Math.round((initialWear / 100) * 240));
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Sync internal impact count when parent initialWear changes externally
  useEffect(() => {
    const targetImpacts = Math.round((initialWear / 100) * 240);
    setImpactCount(targetImpacts);
  }, [initialWear]);

  // Surface wear percentage (0-100%)
  const wearPercentage = Math.min(100, Math.max(0, Math.round((impactCount / 240) * 100)));

  // Determine stage
  const currentStage = getPitchWearStage(wearPercentage);

  // Render 3D Canvas of Pitch Surface Evolution with real cracks and footmarks
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    ctx.clearRect(0, 0, width, height);

    // Isometric 3D pitch coordinates
    const topW = width * 0.35;
    const bottomW = width * 0.65;
    const topY = height * 0.12;
    const bottomY = height * 0.88;
    const centerX = width * 0.5;

    // Outer grass
    ctx.fillStyle = '#02160e';
    ctx.fillRect(0, 0, width, height);

    // Pitch Base Strip
    ctx.beginPath();
    ctx.moveTo(centerX - topW / 2, topY);
    ctx.lineTo(centerX + topW / 2, topY);
    ctx.lineTo(centerX + bottomW / 2, bottomY);
    ctx.lineTo(centerX - bottomW / 2, bottomY);
    ctx.closePath();

    // Pitch color shifts from lush green-ochre to baked brown-grey as wear increases
    const r = Math.min(180, Math.round(90 + (wearPercentage / 100) * 80));
    const g = Math.max(50, Math.round(110 - (wearPercentage / 100) * 55));
    const b = Math.max(25, Math.round(40 - (wearPercentage / 100) * 15));

    const pitchGrad = ctx.createLinearGradient(centerX, topY, centerX, bottomY);
    pitchGrad.addColorStop(0, `rgb(${r - 20}, ${g - 15}, ${b - 10})`);
    pitchGrad.addColorStop(1, `rgb(${r}, ${g}, ${b})`);
    ctx.fillStyle = pitchGrad;
    ctx.fill();

    ctx.strokeStyle = '#3e2311';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Creases
    ctx.beginPath();
    ctx.moveTo(centerX - topW * 0.6, topY + 10);
    ctx.lineTo(centerX + topW * 0.6, topY + 10);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(centerX - bottomW * 0.65, bottomY - 20);
    ctx.lineTo(centerX + bottomW * 0.65, bottomY - 20);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2.5;
    ctx.stroke();

    // Render Scuffs & Bowler Footmarks (Density increases with wear)
    const numFootmarks = Math.floor((wearPercentage / 100) * 28);
    for (let i = 0; i < numFootmarks; i++) {
      const fxRatio = 0.3 + (i % 5) * 0.1;
      const fyRatio = 0.45 + i * 0.018;
      const curY = topY + (bottomY - topY) * fyRatio;
      const curW = topW + (bottomW - topW) * fyRatio;
      const curX = centerX - curW / 2 + curW * fxRatio;

      ctx.beginPath();
      ctx.ellipse(curX, curY, 6, 3, (i * 45 * Math.PI) / 180, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(40, 20, 10, 0.65)';
      ctx.fill();
    }

    // Render Fissure Cracks (Render when wear > 35%)
    if (wearPercentage > 35) {
      const crackIntensity = (wearPercentage - 35) / 65; // 0 to 1
      const numCracks = Math.floor(crackIntensity * 12) + 2;

      ctx.strokeStyle = '#1a0e06';
      ctx.lineWidth = 1.8;

      for (let c = 0; c < numCracks; c++) {
        const startY = topY + (bottomY - topY) * (0.3 + c * 0.05);
        const startW = topW + (bottomW - topW) * (0.3 + c * 0.05);
        const startX = centerX - startW * 0.2 + ((c * 17) % (startW * 0.4));

        ctx.beginPath();
        ctx.moveTo(startX, startY);
        ctx.lineTo(startX + 8, startY + 12);
        ctx.lineTo(startX + 2, startY + 24);
        ctx.lineTo(startX + 12, startY + 36);
        ctx.stroke();
      }
    }

    // Render Dust Puffs if high wear
    if (wearPercentage > 75) {
      ctx.fillStyle = 'rgba(217, 119, 6, 0.25)';
      ctx.beginPath();
      ctx.arc(centerX + 15, bottomY - 50, 18, 0, Math.PI * 2);
      ctx.fill();
    }
  }, [wearPercentage]);

  const addBalls = (count: number) => {
    cricketAudio.playBatHit();
    const nextImpact = Math.min(240, impactCount + count);
    setImpactCount(nextImpact);
    if (onWearChanged) {
      const nextWear = Math.min(100, Math.round((nextImpact / 240) * 100));
      const nextStage = getPitchWearStage(nextWear);
      onWearChanged(nextWear, nextStage.name);
    }
  };

  const handleReset = () => {
    cricketAudio.playBoundary();
    setImpactCount(0);
    if (onWearChanged) {
      onWearChanged(0, 'PRISTINE HARD CLAY');
    }
  };

  return (
    <div className="rounded-2xl border border-cyan-500/30 bg-slate-950/80 p-5 backdrop-blur-xl shadow-2xl space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-cyan-500/20 pb-3">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono font-bold text-cyan-400 uppercase tracking-wider">
            <Layers className="h-4 w-4 animate-pulse" />
            <span>REAL-TIME SURFACE WEAR & CRACK EVOLUTION ENGINE</span>
          </div>
          <h3 className="text-base font-black text-white mt-0.5">
            Dynamic Pitch Deterioration Gauge: Pristine ➔ Settled ➔ Dusty / Cracked
          </h3>
        </div>

        <div className="flex items-center gap-2 text-xs font-mono px-3 py-1.5 rounded-xl border border-slate-800 bg-slate-900/90 text-slate-300">
          <span>Impacts: <strong className="text-white">{impactCount} / 240 Balls</strong></span>
        </div>
      </div>

      {/* Main Grid: Circular Progress Gauge (Left) & 3D Evolving Pitch Model (Right) */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
        {/* Left: Surface Wear Circular Progress Gauge */}
        <div className="md:col-span-5 rounded-2xl border border-slate-800/80 bg-slate-900/60 p-5 flex flex-col items-center justify-center space-y-3">
          <span className="text-xs font-mono font-bold text-slate-400 uppercase tracking-wider">
            SURFACE WEAR PROGRESS
          </span>

          {/* SVG Circular Progress Gauge */}
          <div className="relative h-44 w-44 flex items-center justify-center">
            <svg className="w-full h-full -rotate-90 transform" viewBox="0 0 160 160">
              {/* Background Ring */}
              <circle
                cx="80"
                cy="80"
                r="64"
                fill="none"
                stroke="#1e293b"
                strokeWidth="12"
              />
              {/* Progress Ring: circumference = 2 * PI * 64 = 402.12 */}
              <circle
                cx="80"
                cy="80"
                r="64"
                fill="none"
                stroke={currentStage.color}
                strokeWidth="12"
                strokeDasharray="402"
                strokeDashoffset={402 - (wearPercentage / 100) * 402}
                strokeLinecap="round"
                className="transition-all duration-500 ease-out"
              />
            </svg>

            {/* Inner Center Hub */}
            <div className="absolute flex flex-col items-center justify-center text-center">
              <span className="text-3xl font-black text-white font-mono tracking-tight">
                {wearPercentage}%
              </span>
              <span
                className="text-[10px] font-mono font-bold uppercase mt-0.5 px-2 py-0.5 rounded"
                style={{
                  backgroundColor: `${currentStage.color}22`,
                  color: currentStage.color,
                }}
              >
                {currentStage.name.split(' ')[0]}
              </span>
            </div>
          </div>

          <div className="text-center font-mono text-xs space-y-1">
            <span className="text-white font-bold block">{currentStage.name}</span>
            <span className="text-slate-400 block text-[11px] max-w-xs">{currentStage.hazardNotice}</span>
          </div>
        </div>

        {/* Right: 3D Pitch Model with Canvas Cracks & Controller */}
        <div className="md:col-span-7 space-y-4">
          <div className="relative rounded-2xl overflow-hidden border border-slate-800 bg-slate-950">
            <canvas
              ref={canvasRef}
              width={560}
              height={260}
              className="w-full h-56 object-cover block"
            />

            {/* Stage Tag Overlay */}
            <div className="absolute top-3 left-3 bg-slate-950/90 border border-slate-800 rounded-xl px-3 py-1.5 text-xs font-mono">
              <span className="text-slate-400 block text-[9px]">PITCH TEXTURE STATE:</span>
              <strong style={{ color: currentStage.color }}>{currentStage.name}</strong>
            </div>

            <div className="absolute bottom-3 right-3 bg-slate-950/90 border border-slate-800 rounded-xl px-3 py-1.5 text-xs font-mono text-right">
              <span className="text-slate-400 block text-[9px]">PHYSICS DRIFT:</span>
              <span className="text-cyan-400 font-bold">Turn: ~{currentStage.turnDeg}° · Bounce: {currentStage.bounceFactor}%</span>
            </div>
          </div>

          {/* Interactive Ball Impact Steppers */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-1 font-mono text-xs">
            <span className="text-slate-400">Simulate Ball Impacts:</span>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => addBalls(1)}
                className="rounded-lg bg-slate-800 hover:bg-slate-700 px-2.5 py-1 text-white cursor-pointer transition-colors"
              >
                +1 Ball
              </button>
              <button
                onClick={() => addBalls(6)}
                className="rounded-lg bg-slate-800 hover:bg-slate-700 px-2.5 py-1 text-white cursor-pointer transition-colors"
              >
                +6 Balls (1 Over)
              </button>
              <button
                onClick={() => addBalls(60)}
                className="rounded-lg bg-cyan-600 hover:bg-cyan-500 px-3 py-1 text-white font-bold cursor-pointer transition-colors"
              >
                +60 Balls (10 Overs)
              </button>
              <button
                onClick={handleReset}
                className="rounded-lg bg-slate-900 border border-slate-700 hover:border-slate-500 px-2.5 py-1 text-slate-300 cursor-pointer flex items-center gap-1 transition-colors"
              >
                <RotateCcw className="h-3 w-3" />
                <span>Reset</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
