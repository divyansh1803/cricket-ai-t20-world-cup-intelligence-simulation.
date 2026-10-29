import React, { useState, useRef, useEffect } from 'react';
import {
  Compass,
  Play,
  Save,
  RotateCcw,
  Sparkles,
  Shield,
  Zap,
  Target,
  Sliders,
  CheckCircle2,
  Move,
  Layers,
  Flame,
} from 'lucide-react';
import { cricketAudio } from '../../utils/audioSystem';

export interface CustomFielder {
  id: string;
  name: string;
  x: number; // 0 to 100 relative to field
  y: number; // 0 to 100 relative to field
  isCatchingPosition: boolean;
}

export interface CustomDrillConfig {
  title: string;
  category: 'Yorker Defense' | 'Powerplay Attack' | 'Spin Combat' | 'Death Slog';
  difficulty: 'Rookie' | 'Pro' | 'World Class';
  batterPosition: {
    creaseDepthCm: number; // -15 (deep) to +30 (charged)
    guard: 'Leg' | 'Middle' | 'Off';
    stance: 'Side-on' | 'Open' | 'Closed';
  };
  ballTrajectory: {
    line: 'Wide Off' | '4th Stump' | 'Middle' | 'Leg Stump';
    length: 'Yorker' | 'Full' | 'Good Length' | 'Short' | 'Bouncer';
    speedKmh: number;
    deviationDeg: number; // negative = in-swing, positive = out-swing/turn
  };
  fielders: CustomFielder[];
}

const DEFAULT_FIELDERS: CustomFielder[] = [
  { id: 'f1', name: 'Wicketkeeper', x: 50, y: 76, isCatchingPosition: true },
  { id: 'f2', name: '1st Slip', x: 58, y: 77, isCatchingPosition: true },
  { id: 'f3', name: 'Point', x: 80, y: 55, isCatchingPosition: false },
  { id: 'f4', name: 'Cover', x: 82, y: 35, isCatchingPosition: false },
  { id: 'f5', name: 'Mid-Off', x: 65, y: 22, isCatchingPosition: false },
  { id: 'f6', name: 'Bowler', x: 50, y: 28, isCatchingPosition: false },
  { id: 'f7', name: 'Mid-On', x: 35, y: 22, isCatchingPosition: false },
  { id: 'f8', name: 'Mid-Wicket', x: 20, y: 38, isCatchingPosition: false },
  { id: 'f9', name: 'Square Leg', x: 18, y: 56, isCatchingPosition: false },
  { id: 'f10', name: 'Deep Backward Point', x: 88, y: 72, isCatchingPosition: false },
  { id: 'f11', name: 'Deep Mid-Wicket', x: 12, y: 28, isCatchingPosition: false },
];

export const CustomDrillEditor: React.FC<{ onSaveDrill?: (drill: CustomDrillConfig) => void }> = ({
  onSaveDrill,
}) => {
  const [drillTitle, setDrillTitle] = useState<string>('Custom 4th-Stump Yorker Gauntlet');
  const [drillCategory, setDrillCategory] = useState<'Yorker Defense' | 'Powerplay Attack' | 'Spin Combat' | 'Death Slog'>('Yorker Defense');
  const [creaseDepth, setCreaseDepth] = useState<number>(0);
  const [guard, setGuard] = useState<'Leg' | 'Middle' | 'Off'>('Middle');
  const [stance, setStance] = useState<'Side-on' | 'Open' | 'Closed'>('Side-on');

  // Ball Trajectory Parameters
  const [deliveryLine, setDeliveryLine] = useState<'Wide Off' | '4th Stump' | 'Middle' | 'Leg Stump'>('4th Stump');
  const [deliveryLength, setDeliveryLength] = useState<'Yorker' | 'Full' | 'Good Length' | 'Short' | 'Bouncer'>('Yorker');
  const [deliverySpeed, setDeliverySpeed] = useState<number>(145);
  const [deviation, setDeviation] = useState<number>(2.4);

  // Fielders drag state
  const [fielders, setFielders] = useState<CustomFielder[]>(DEFAULT_FIELDERS);
  const [selectedFielderId, setSelectedFielderId] = useState<string | null>(null);
  const [draggedFielderId, setDraggedFielderId] = useState<string | null>(null);
  const [simulationResult, setSimulationResult] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Canvas Drawing: Field ground, 11 fielders, pitch strip, batter position & ball trajectory
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    ctx.clearRect(0, 0, width, height);

    const cx = width / 2;
    const cy = height / 2;
    const radiusX = width * 0.46;
    const radiusY = height * 0.44;

    // Outfield Base Oval
    const grassGrad = ctx.createRadialGradient(cx, cy, 20, cx, cy, radiusX);
    grassGrad.addColorStop(0, '#042817');
    grassGrad.addColorStop(0.85, '#02180d');
    grassGrad.addColorStop(1, '#010f08');

    ctx.fillStyle = grassGrad;
    ctx.strokeStyle = '#10b981';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(cx, cy, radiusX, radiusY, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // 30-Yard Circle
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.ellipse(cx, cy, radiusX * 0.55, radiusY * 0.55, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);

    // Pitch Strip
    const pitchW = 20;
    const pitchH = 100;
    const pitchX = cx - pitchW / 2;
    const pitchY = cy - pitchH / 2;

    ctx.fillStyle = '#854d0e';
    ctx.strokeStyle = '#ca8a04';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(pitchX, pitchY, pitchW, pitchH, 3);
    ctx.fill();
    ctx.stroke();

    // Stumps & Creases
    // Bowling crease
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(pitchX - 6, pitchY + 12);
    ctx.lineTo(pitchX + pitchW + 6, pitchY + 12);
    ctx.stroke();

    // Batting crease (shifted by batter creaseDepth)
    const batterY = pitchY + pitchH - 12 - creaseDepth * 0.4;
    ctx.beginPath();
    ctx.moveTo(pitchX - 6, batterY);
    ctx.lineTo(pitchX + pitchW + 6, batterY);
    ctx.stroke();

    // Batter Stance Marker
    const batterOffsetX = guard === 'Leg' ? -4 : guard === 'Off' ? 4 : 0;
    const batterX = cx + batterOffsetX;

    ctx.fillStyle = '#38bdf8';
    ctx.beginPath();
    ctx.arc(batterX, batterY, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.stroke();

    // Batter label
    ctx.fillStyle = '#38bdf8';
    ctx.font = 'bold 9px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('BATTER', batterX, batterY + 14);

    // Ball Trajectory Flight Arc
    const startX = cx;
    const startY = pitchY + 10; // Bowler release

    let pitchLengthY = pitchY + 30; // Default Full
    if (deliveryLength === 'Yorker') pitchLengthY = pitchY + pitchH - 18;
    else if (deliveryLength === 'Good Length') pitchLengthY = pitchY + pitchH - 45;
    else if (deliveryLength === 'Short' || deliveryLength === 'Bouncer') pitchLengthY = pitchY + pitchH - 65;

    let targetX = batterX;
    if (deliveryLine === 'Wide Off') targetX = cx + 22;
    else if (deliveryLine === '4th Stump') targetX = cx + 10;
    else if (deliveryLine === 'Leg Stump') targetX = cx - 10;

    // Draw trajectory
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.quadraticCurveTo(startX + deviation * 4, (startY + pitchLengthY) / 2, targetX, pitchLengthY);
    ctx.lineTo(targetX + deviation * 2, batterY);
    ctx.stroke();

    // Pitch Impact Circle
    ctx.fillStyle = '#ef4444';
    ctx.beginPath();
    ctx.arc(targetX, pitchLengthY, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.stroke();

    // Draw 11 Fielders
    fielders.forEach((f) => {
      const fx = (f.x / 100) * width;
      const fy = (f.y / 100) * height;
      const isSelected = selectedFielderId === f.id;

      // Outer glow if selected
      if (isSelected) {
        ctx.fillStyle = 'rgba(6, 182, 212, 0.4)';
        ctx.beginPath();
        ctx.arc(fx, fy, 12, 0, Math.PI * 2);
        ctx.fill();
      }

      // Fielder Dot
      ctx.fillStyle = f.isCatchingPosition ? '#f43f5e' : '#10b981';
      ctx.beginPath();
      ctx.arc(fx, fy, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = isSelected ? '#38bdf8' : '#ffffff';
      ctx.lineWidth = isSelected ? 2 : 1;
      ctx.stroke();

      // Fielder Name
      ctx.fillStyle = isSelected ? '#38bdf8' : '#e2e8f0';
      ctx.font = isSelected ? 'bold 9px monospace' : '8px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(f.name, fx, fy - 9);
    });
  }, [fielders, selectedFielderId, creaseDepth, guard, stance, deliveryLine, deliveryLength, deliverySpeed, deviation]);

  // Handle Dragging Fielders
  const handleCanvasMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    // Check hit on any fielder
    const hit = fielders.find((f) => {
      const fx = (f.x / 100) * canvas.width;
      const fy = (f.y / 100) * canvas.height;
      const dist = Math.hypot(mouseX - fx, mouseY - fy);
      return dist <= 14;
    });

    if (hit) {
      setSelectedFielderId(hit.id);
      setDraggedFielderId(hit.id);
      cricketAudio.playUiClick();
    } else {
      setSelectedFielderId(null);
    }
  };

  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!draggedFielderId) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const newX = Math.min(95, Math.max(5, (mouseX / canvas.width) * 100));
    const newY = Math.min(95, Math.max(5, (mouseY / canvas.height) * 100));

    setFielders((prev) =>
      prev.map((f) => (f.id === draggedFielderId ? { ...f, x: Math.round(newX), y: Math.round(newY) } : f))
    );
  };

  const handleCanvasMouseUp = () => {
    if (draggedFielderId) {
      setDraggedFielderId(null);
      cricketAudio.playBatHit();
    }
  };

  // Run tactical simulation for this drill
  const handleTestSimulate = () => {
    cricketAudio.playBatHit();
    let outcome = '';
    const speedRating = deliverySpeed > 142 ? 'Express Pace' : 'Medium-Fast';

    if (deliveryLength === 'Yorker' && Math.abs(deviation) > 2) {
      outcome = `SUCCESSFUL DEFENSE: Batter blocks late reverse-swinging yorker (${deliverySpeed} km/h) into the covers. Dot ball pressure executed with field ring intact.`;
    } else if (deliveryLength === 'Bouncer') {
      outcome = `AERIAL DISMISSAL: Batter attempts hook against short ball; top edge caught by Deep Square Leg!`;
    } else {
      outcome = `BOUNDARY CRUNCH: Batter drives through wide gap between Cover and Point for FOUR!`;
    }

    setSimulationResult(outcome);
  };

  const handleSave = () => {
    const config: CustomDrillConfig = {
      title: drillTitle,
      category: drillCategory,
      difficulty: deliverySpeed >= 142 || Math.abs(deviation) >= 2.5 ? 'World Class' : 'Pro',
      batterPosition: { creaseDepthCm: creaseDepth, guard, stance },
      ballTrajectory: { line: deliveryLine, length: deliveryLength, speedKmh: deliverySpeed, deviationDeg: deviation },
      fielders,
    };

    if (onSaveDrill) onSaveDrill(config);
    setSaveSuccess(true);
    cricketAudio.playVictory();
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  return (
    <div className="rounded-3xl border border-cyan-500/30 bg-gradient-to-b from-[#03091c]/95 to-[#020510]/95 p-5 sm:p-7 backdrop-blur-xl shadow-2xl space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-cyan-500/20 pb-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono font-bold text-cyan-400 uppercase tracking-wider">
            <Sliders className="h-4 w-4 animate-pulse text-cyan-400" />
            <span>CRICKET AI LAB · CUSTOM TACTICAL DRILL EDITOR</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight mt-1">
            Interactive Field Placer & Trajectory Sandbox
          </h2>
          <p className="text-xs text-slate-400 font-sans mt-0.5">
            Drag and drop 11 fielders, calibrate crease depth, and customize delivery flight arcs to create drills.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setFielders(DEFAULT_FIELDERS)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-800 bg-slate-900 text-xs font-mono text-slate-400 hover:text-white cursor-pointer"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span>Reset Field</span>
          </button>

          <button
            onClick={handleSave}
            className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 px-4 py-2 text-xs font-bold text-slate-950 hover:brightness-110 shadow-lg shadow-cyan-500/20 cursor-pointer transition-all"
          >
            <Save className="h-4 w-4" />
            <span>{saveSuccess ? 'Saved to Drills!' : 'Save Drill'}</span>
          </button>
        </div>
      </div>

      {/* Main Grid: Interactive Canvas Ground (Left) & Trajectory & Batter Controls (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Interactive Field Oval Canvas */}
        <div className="lg:col-span-7 rounded-2xl border border-slate-800 bg-slate-950/80 p-4 space-y-3">
          <div className="flex items-center justify-between text-xs font-mono">
            <span className="text-white font-bold flex items-center gap-1.5">
              <Move className="h-4 w-4 text-cyan-400" />
              <span>DRAG & DROP FIELDERS TO REPOSITION</span>
            </span>
            <span className="text-slate-400 text-[10px]">
              {selectedFielderId ? `Selected: ${fielders.find((f) => f.id === selectedFielderId)?.name}` : 'Click any dot to drag'}
            </span>
          </div>

          <div className="relative flex justify-center">
            <canvas
              ref={canvasRef}
              width={560}
              height={440}
              onMouseDown={handleCanvasMouseDown}
              onMouseMove={handleCanvasMouseMove}
              onMouseUp={handleCanvasMouseUp}
              className="w-full h-auto rounded-xl cursor-crosshair border border-slate-800/80 shadow-inner"
            />
          </div>

          {/* Canvas Guide Footer */}
          <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 pt-1">
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
              <span>Ring / Boundary Fielders</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-rose-400" />
              <span>Cordon / Close Catchers</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-cyan-400" />
              <span>Batter Marker</span>
            </span>
          </div>
        </div>

        {/* Right: Batter Positioning & Ball Trajectory Configuration */}
        <div className="lg:col-span-5 space-y-4">
          {/* Drill Metadata */}
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 space-y-3 text-xs font-mono">
            <span className="text-cyan-400 font-bold uppercase block text-[10px]">1. DRILL SPECIFICATION</span>
            <div>
              <label className="text-slate-400 block mb-1">DRILL NAME</label>
              <input
                type="text"
                value={drillTitle}
                onChange={(e) => setDrillTitle(e.target.value)}
                className="w-full rounded-lg border border-slate-800 bg-slate-950 p-2 text-white focus:border-cyan-400 text-xs"
              />
            </div>
            <div>
              <label className="text-slate-400 block mb-1">CATEGORY</label>
              <select
                value={drillCategory}
                onChange={(e) => setDrillCategory(e.target.value as any)}
                className="w-full rounded-lg border border-slate-800 bg-slate-950 p-2 text-white focus:border-cyan-400 text-xs cursor-pointer"
              >
                <option value="Yorker Defense">Yorker Defense</option>
                <option value="Powerplay Attack">Powerplay Attack</option>
                <option value="Spin Combat">Spin Combat</option>
                <option value="Death Slog">Death Slog</option>
              </select>
            </div>
          </div>

          {/* Batter Positioning Controls */}
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 space-y-3 text-xs font-mono">
            <span className="text-amber-400 font-bold uppercase block text-[10px]">2. BATTER POSITIONING & CREASE DEPTH</span>

            <div>
              <div className="flex justify-between mb-1">
                <span className="text-slate-400">Crease Depth:</span>
                <span className="text-cyan-400 font-bold">
                  {creaseDepth > 0 ? `+${creaseDepth}cm (Charged)` : creaseDepth < 0 ? `${creaseDepth}cm (Deep in Crease)` : 'Crease Line (Normal)'}
                </span>
              </div>
              <input
                type="range"
                min="-15"
                max="30"
                value={creaseDepth}
                onChange={(e) => setCreaseDepth(Number(e.target.value))}
                className="w-full accent-cyan-400 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-slate-400 block mb-1">GUARD</label>
                <select
                  value={guard}
                  onChange={(e) => setGuard(e.target.value as any)}
                  className="w-full rounded-lg border border-slate-800 bg-slate-950 p-1.5 text-white cursor-pointer"
                >
                  <option value="Leg">Leg Stump</option>
                  <option value="Middle">Middle Stump</option>
                  <option value="Off">Off Stump</option>
                </select>
              </div>

              <div>
                <label className="text-slate-400 block mb-1">STANCE</label>
                <select
                  value={stance}
                  onChange={(e) => setStance(e.target.value as any)}
                  className="w-full rounded-lg border border-slate-800 bg-slate-950 p-1.5 text-white cursor-pointer"
                >
                  <option value="Side-on">Standard Side-On</option>
                  <option value="Open">Open (Powerplay)</option>
                  <option value="Closed">Closed Defense</option>
                </select>
              </div>
            </div>
          </div>

          {/* Ball Trajectory Parameters */}
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 space-y-3 text-xs font-mono">
            <span className="text-emerald-400 font-bold uppercase block text-[10px]">3. BALL TRAJECTORY & PACE</span>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-slate-400 block mb-1">DELIVERY LINE</label>
                <select
                  value={deliveryLine}
                  onChange={(e) => setDeliveryLine(e.target.value as any)}
                  className="w-full rounded-lg border border-slate-800 bg-slate-950 p-1.5 text-white cursor-pointer"
                >
                  <option value="Wide Off">Wide Outside Off</option>
                  <option value="4th Stump">4th Stump Corridor</option>
                  <option value="Middle">Middle Stump</option>
                  <option value="Leg Stump">Leg Stump Line</option>
                </select>
              </div>

              <div>
                <label className="text-slate-400 block mb-1">LENGTH</label>
                <select
                  value={deliveryLength}
                  onChange={(e) => setDeliveryLength(e.target.value as any)}
                  className="w-full rounded-lg border border-slate-800 bg-slate-950 p-1.5 text-white cursor-pointer"
                >
                  <option value="Yorker">Yorker (0-1.5m)</option>
                  <option value="Full">Full Slot (1.5-3m)</option>
                  <option value="Good Length">Good Length (3-6m)</option>
                  <option value="Short">Short (6-8m)</option>
                  <option value="Bouncer">Bouncer (8m+)</option>
                </select>
              </div>
            </div>

            <div>
              <div className="flex justify-between mb-1">
                <span className="text-slate-400">Release Velocity:</span>
                <span className="text-rose-400 font-bold">{deliverySpeed} km/h</span>
              </div>
              <input
                type="range"
                min="105"
                max="154"
                value={deliverySpeed}
                onChange={(e) => setDeliverySpeed(Number(e.target.value))}
                className="w-full accent-rose-400 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
              />
            </div>

            <div>
              <div className="flex justify-between mb-1">
                <span className="text-slate-400">Lateral Swing / Turn:</span>
                <span className="text-amber-400 font-bold">
                  {deviation > 0 ? `+${deviation}° Out-swing` : deviation < 0 ? `${deviation}° In-swing` : 'Straight (0°)'}
                </span>
              </div>
              <input
                type="range"
                min="-4.0"
                max="4.0"
                step="0.2"
                value={deviation}
                onChange={(e) => setDeviation(Number(e.target.value))}
                className="w-full accent-amber-400 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
              />
            </div>

            {/* Test Simulation Button */}
            <button
              onClick={handleTestSimulate}
              className="w-full mt-2 flex items-center justify-center gap-2 rounded-xl bg-slate-900 border border-cyan-500/40 p-2.5 text-xs font-bold text-cyan-300 hover:bg-cyan-500/20 hover:text-white transition-all cursor-pointer"
            >
              <Play className="h-4 w-4" />
              <span>TEST SIMULATE DRILL OUTCOME</span>
            </button>
          </div>

          {/* Simulation Output Banner */}
          {simulationResult && (
            <div className="rounded-xl border border-cyan-500/40 bg-slate-900/90 p-4 space-y-2 text-xs font-mono animate-in fade-in duration-200">
              <span className="text-cyan-400 font-bold uppercase block text-[10px]">DRILL EXECUTION SIMULATION</span>
              <p className="text-slate-200 font-sans leading-relaxed text-xs">
                {simulationResult}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
