import React, { useState, useRef, useEffect } from 'react';
import { Target, Zap, Shield, Play, RotateCcw, Filter, Trophy, CheckCircle, Flame, Activity, Crosshair, Sparkles } from 'lucide-react';
import { cricketAudio } from '../../utils/audioSystem';
import { useGame } from '../../context/GameContext';
import { BoundaryFielderReflexDrill } from './BoundaryFielderReflexDrill';

export interface DrillRoutine {
  id: string;
  name: string;
  category: 'bowling' | 'batting' | 'spin' | 'death' | 'fielding';
  difficulty: 1 | 2 | 3 | 4 | 5;
  difficultyLabel: 'Foundation' | 'Club Pro' | 'First Class' | 'International' | 'Masterclass';
  focusZone: string;
  objective: string;
  benchmarkTarget: string;
  targetCoords: { x: number; y: number; radius: number }; // Relative coordinates on pitch (0-1)
  deliverySpeed: string;
  color: string;
  executionSteps: string[];
}

const DRILL_ROUTINES: DrillRoutine[] = [
  {
    id: 'boundary_fielder_reflex',
    name: 'Boundary Fielder Reflex: Slide & Bullet Relay',
    category: 'fielding',
    difficulty: 5,
    difficultyLabel: 'Masterclass',
    focusZone: 'Boundary Foam Cushions & Deep Outfield Relay Corridor (68m - 78m)',
    objective: 'Intercept high-speed drives racing to the deep rope with sliding cutoff precision and fire 140+ km/h relay throws to shatter the stumps.',
    benchmarkTarget: 'Direct Hit or Saved 2+ Runs (90%+ Accuracy)',
    targetCoords: { x: 0.72, y: 0.22, radius: 0.1 },
    deliverySpeed: '144 - 154 km/h Exit Velocity',
    color: '#10b981',
    executionSteps: [
      'Sprint at 30+ km/h on an angled cutoff vector towards the rope',
      'Execute timed slide within ±35ms sweet spot before the ball touches cushions',
      'Gather cleanly, twist hips, and release flat rocket throw at striker/non-striker stumps',
    ],
  },
  {
    id: 'yorker_precision',
    name: 'Yorker Precision Death Lock',
    category: 'bowling',
    difficulty: 5,
    difficultyLabel: 'Masterclass',
    focusZone: 'Toe-Crusher & Base of Stumps (0.3m from crease)',
    objective: 'Land 5 consecutive deliveries within a 15cm circle at the base of off and middle stump to shut down death-over boundary hitting.',
    benchmarkTarget: '85%+ Pitch-in-Zone Accuracy',
    targetCoords: { x: 0.5, y: 0.88, radius: 0.08 },
    deliverySpeed: '138 - 145 km/h',
    color: '#06b6d4',
    executionSteps: [
      'Lock eyes on base of off-stump from bowler gather point',
      'Maintain high front-arm elevation for vertical release',
      'Follow through fully through the crease without shortening stride',
    ],
  },
  {
    id: 'powerplay_aggression',
    name: 'Powerplay Aggression: Lofted Extra Cover',
    category: 'batting',
    difficulty: 4,
    difficultyLabel: 'International',
    focusZone: 'V-Arc & Over Infield (30-yard circle clearance)',
    objective: 'Clear the 30-yard ring through extra-cover against pace bowling in overs 1-6 with minimal risk of edge.',
    benchmarkTarget: 'Strike Rate > 185 against Pace',
    targetCoords: { x: 0.3, y: 0.55, radius: 0.12 },
    deliverySpeed: '135 - 142 km/h',
    color: '#f59e0b',
    executionSteps: [
      'Press forward onto front toe to meet ball on the half-volley',
      'Present full face of the blade with high elbow extension',
      'Transfer weight cleanly towards mid-off corridor',
    ],
  },
  {
    id: 'spin_traps',
    name: 'Spin-Traps: Rough Patch Drifting Off-Break',
    category: 'spin',
    difficulty: 4,
    difficultyLabel: 'International',
    focusZone: 'Corridor of Uncertainty on Bowler Footmarks (4.5m length)',
    objective: 'Extract 4.2° turn and natural drift into the right-hander’s rib cage from bowler footmarks to induce bat-pad catches.',
    benchmarkTarget: '3.8°+ Average Turn with Dip',
    targetCoords: { x: 0.65, y: 0.62, radius: 0.1 },
    deliverySpeed: '84 - 92 km/h',
    color: '#a855f7',
    executionSteps: [
      'Impart 2,300+ RPM revolutions via index finger snap',
      'Flight ball above batter eye-line before dipping onto rough patch',
      'Position leg slip and short leg in catching web',
    ],
  },
  {
    id: 'wide_yorker_lock',
    name: 'Wide Tramline Yorker Lockdown',
    category: 'death',
    difficulty: 5,
    difficultyLabel: 'Masterclass',
    focusZone: '5th Stump Line (Within 10cm of Wide Return Line)',
    objective: 'Deny the batter legal hitting arc by pinning deliveries just inside the wide crease line without conceding extras.',
    benchmarkTarget: 'Zero Wides with < 5.5 ER',
    targetCoords: { x: 0.78, y: 0.86, radius: 0.07 },
    deliverySpeed: '136 - 144 km/h',
    color: '#10b981',
    executionSteps: [
      'Angle run-up slightly wide of the bowling crease',
      'Wrist cocked at 15° outward angle on delivery stride',
      'Target wide chalk mark with flat skid bounce',
    ],
  },
  {
    id: 'bouncer_defense_hook',
    name: 'Bouncer Defense & Upper Cut Telemetry',
    category: 'batting',
    difficulty: 4,
    difficultyLabel: 'International',
    focusZone: 'Shoulder to Helmet Grille Zone (8.0m - 9.5m length)',
    objective: 'Sway beneath short balls or safely direct steep bounce over third man using the open-blade upper cut.',
    benchmarkTarget: '0% Top-Edge Dismissals',
    targetCoords: { x: 0.5, y: 0.38, radius: 0.11 },
    deliverySpeed: '142 - 148 km/h',
    color: '#ef4444',
    executionSteps: [
      'Early weight transfer back and across towards off-stump',
      'Keep eyes level through point of ball impact',
      'Roll wrists over the ball or glide deliberately over slips',
    ],
  },
  {
    id: 'reverse_sweep_spin',
    name: 'Reverse Sweep & Switch-Hit Protocol',
    category: 'batting',
    difficulty: 3,
    difficultyLabel: 'First Class',
    focusZone: 'Point & Backward Point Vacant Corridor',
    objective: 'Manipulate orthodox field setups by reversing stance to exploit vacant third-man boundaries against turning ball.',
    benchmarkTarget: '90%+ Clean Middle Contact',
    targetCoords: { x: 0.25, y: 0.72, radius: 0.09 },
    deliverySpeed: '82 - 90 km/h',
    color: '#ec4899',
    executionSteps: [
      'Drop down early on back knee as bowler releases ball',
      'Change grip seamlessly without delaying downswing',
      'Maintain stable head position through contact',
    ],
  },
];

export const TacticalDrillLibrary: React.FC = () => {
  const { addXp } = useGame();
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [activeDrill, setActiveDrill] = useState<DrillRoutine>(DRILL_ROUTINES[0]);
  const [isSimulating, setIsSimulating] = useState<boolean>(false);
  const [simResults, setSimResults] = useState<{
    accuracy: number;
    rating: string;
    xpEarned: number;
    ballsCompleted: number;
  } | null>(null);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Filtered Drills
  const filteredDrills = DRILL_ROUTINES.filter((d) => {
    if (selectedCategory === 'all') return true;
    return d.category === selectedCategory;
  });

  // 3D Canvas Pitch & Drill Focus Zone Preview
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let t = 0;

    const render = () => {
      t += 0.03;
      const width = canvas.width;
      const height = canvas.height;

      ctx.clearRect(0, 0, width, height);

      // Pitch Strip Background in isometric 3D perspective
      // Top Crease (Bowler End) -> Bottom Crease (Batter End)
      const topW = width * 0.32;
      const bottomW = width * 0.58;
      const topY = height * 0.14;
      const bottomY = height * 0.86;
      const centerX = width * 0.5;

      const p1 = { x: centerX - topW / 2, y: topY };
      const p2 = { x: centerX + topW / 2, y: topY };
      const p3 = { x: centerX + bottomW / 2, y: bottomY };
      const p4 = { x: centerX - bottomW / 2, y: bottomY };

      // Grass surrounding pitch
      const grassGrad = ctx.createLinearGradient(0, 0, 0, height);
      grassGrad.addColorStop(0, '#021810');
      grassGrad.addColorStop(0.5, '#042217');
      grassGrad.addColorStop(1, '#02140d');
      ctx.fillStyle = grassGrad;
      ctx.fillRect(0, 0, width, height);

      // Pitch Turf Surface (Hard Clay with shading)
      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.lineTo(p3.x, p3.y);
      ctx.lineTo(p4.x, p4.y);
      ctx.closePath();

      const pitchGrad = ctx.createLinearGradient(centerX, topY, centerX, bottomY);
      pitchGrad.addColorStop(0, '#784620');
      pitchGrad.addColorStop(0.5, '#8c5225');
      pitchGrad.addColorStop(1, '#663717');
      ctx.fillStyle = pitchGrad;
      ctx.fill();

      // Pitch Boundary Edges
      ctx.strokeStyle = '#a2622e';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Crease lines
      // Bowling crease (top)
      ctx.beginPath();
      ctx.moveTo(centerX - topW * 0.6, topY + 12);
      ctx.lineTo(centerX + topW * 0.6, topY + 12);
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Popping crease (bottom)
      ctx.beginPath();
      ctx.moveTo(centerX - bottomW * 0.65, bottomY - 24);
      ctx.lineTo(centerX + bottomW * 0.65, bottomY - 24);
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2.5;
      ctx.stroke();

      // Stumps at striker end (bottom)
      const stumpY = bottomY - 8;
      ctx.fillStyle = '#f59e0b';
      for (let s = -1; s <= 1; s++) {
        ctx.fillRect(centerX + s * 6 - 1.5, stumpY - 14, 3, 14);
      }
      // Bails
      ctx.fillRect(centerX - 9, stumpY - 16, 18, 2);

      // Draw Length Guidelines on Pitch (Good Length, Full, Yorker)
      const lengths = [
        { label: 'SHORT (8-10m)', factor: 0.35, color: 'rgba(239, 68, 68, 0.3)' },
        { label: 'GOOD LENGTH (6-8m)', factor: 0.55, color: 'rgba(56, 189, 248, 0.3)' },
        { label: 'FULL PITCH (4-6m)', factor: 0.72, color: 'rgba(52, 211, 153, 0.3)' },
        { label: 'YORKER / BLOCKHOLE (0-2m)', factor: 0.86, color: 'rgba(245, 158, 11, 0.3)' },
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

      // Target Focus Zone of Active Drill
      const tz = activeDrill.targetCoords;
      const drillY = topY + (bottomY - topY) * tz.y;
      const drillW = topW + (bottomW - topW) * tz.y;
      const drillX = centerX - drillW / 2 + drillW * tz.x;
      const radiusX = tz.radius * drillW * 1.4;
      const radiusY = tz.radius * (bottomY - topY) * 0.7;

      // Pulsing Neon Highlight for Drill Focus Zone
      const pulse = Math.sin(t * 3) * 0.2 + 0.8;
      ctx.save();
      ctx.beginPath();
      ctx.ellipse(drillX, drillY, radiusX * pulse, radiusY * pulse, 0, 0, Math.PI * 2);
      ctx.fillStyle = `${activeDrill.color}33`;
      ctx.fill();
      ctx.strokeStyle = activeDrill.color;
      ctx.lineWidth = 2.5;
      ctx.shadowColor = activeDrill.color;
      ctx.shadowBlur = 15;
      ctx.stroke();
      ctx.restore();

      // Center Bullseye in Focus Zone
      ctx.beginPath();
      ctx.arc(drillX, drillY, 4, 0, Math.PI * 2);
      ctx.fillStyle = '#ffffff';
      ctx.fill();

      // Simulated Delivery Trajectory Arc
      const ballProgress = (t * 0.8) % 1; // 0 to 1
      const startX = centerX;
      const startY = topY + 10;
      const endX = drillX;
      const endY = drillY;

      // Calculate parabolic curve
      const curBallX = startX + (endX - startX) * ballProgress;
      const linearY = startY + (endY - startY) * ballProgress;
      const arcHeight = Math.sin(ballProgress * Math.PI) * 45;
      const curBallY = linearY - arcHeight;

      // Draw trajectory trail
      ctx.beginPath();
      ctx.moveTo(startX, startY);
      ctx.quadraticCurveTo(
        (startX + endX) / 2,
        (startY + endY) / 2 - 50,
        endX,
        endY
      );
      ctx.strokeStyle = `${activeDrill.color}66`;
      ctx.lineWidth = 2;
      ctx.setLineDash([3, 3]);
      ctx.stroke();
      ctx.setLineDash([]);

      // Draw Flying Cricket Ball
      ctx.save();
      ctx.beginPath();
      ctx.arc(curBallX, curBallY, 5, 0, Math.PI * 2);
      ctx.fillStyle = '#ef4444';
      ctx.shadowColor = '#ef4444';
      ctx.shadowBlur = 10;
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.restore();

      // If ball just landed in target, draw impact ring
      if (ballProgress > 0.92) {
        ctx.beginPath();
        ctx.arc(drillX, drillY, 12 * (1 - ballProgress) * 12, 0, Math.PI * 2);
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.stroke();
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [activeDrill]);

  // Handle drill simulation run
  const handleRunDrillSimulation = () => {
    if (isSimulating) return;
    setIsSimulating(true);
    setSimResults(null);
    cricketAudio.playBatHit();

    // 1.8 second realistic simulation sequence
    setTimeout(() => {
      const accuracyScore = Math.floor(Math.random() * 16) + 82; // 82% to 97%
      const earnedXp = accuracyScore >= 90 ? 150 : 90;

      setSimResults({
        accuracy: accuracyScore,
        rating: accuracyScore >= 92 ? 'PINPOINT EXECUTION' : accuracyScore >= 85 ? 'EFFECTIVE EXECUTION' : 'ACCEPTABLE DRILL',
        xpEarned: earnedXp,
        ballsCompleted: 6,
      });

      setIsSimulating(false);
      cricketAudio.playBoundary();
      addXp(earnedXp, `Completed Tactical Drill: ${activeDrill.name} (${accuracyScore}% Accuracy)`);
    }, 1800);
  };

  return (
    <div className="space-y-6">
      {/* Eyebrow & Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-purple-500/20 pb-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-purple-400 font-bold uppercase tracking-wider">
            <Target className="h-4 w-4 text-purple-400 animate-pulse" />
            <span>ELITE TACTICAL DRILL & TRAINING MATRIX</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-white mt-1">
            Professional Practice Routines & 3D Pitch Focus Zones
          </h2>
          <p className="text-xs text-slate-400 mt-0.5 max-w-2xl">
            Simulate and calibrate professional training routines used by international teams. Filter by discipline, inspect 3D focus zones, and test execution benchmarks.
          </p>
        </div>

        {/* Filter Badges */}
        <div className="flex flex-wrap items-center gap-1.5 bg-slate-900/90 border border-slate-800 p-1 rounded-xl text-xs font-mono">
          <Filter className="h-3.5 w-3.5 text-slate-400 ml-1.5" />
          {[
            { id: 'all', label: 'All Routines' },
            { id: 'bowling', label: 'Pace & Yorkers' },
            { id: 'batting', label: 'Batting Arcs' },
            { id: 'spin', label: 'Spin Traps' },
            { id: 'death', label: 'Death Overs' },
          ].map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`rounded-lg px-2.5 py-1 text-xs transition-colors cursor-pointer ${
                selectedCategory === cat.id
                  ? 'bg-purple-600 text-white font-bold shadow-md shadow-purple-600/30'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main Grid: Drill Selector Cards (Left) & 3D Pitch Preview + Telemetry (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Drill Cards List */}
        <div className="lg:col-span-5 space-y-3">
          <span className="text-xs font-mono text-slate-400 font-bold uppercase block">
            AVAILABLE TRAINING ROUTINES ({filteredDrills.length})
          </span>

          <div className="space-y-2.5 max-h-[580px] overflow-y-auto pr-1">
            {filteredDrills.map((drill) => {
              const isSelected = activeDrill.id === drill.id;
              return (
                <div
                  key={drill.id}
                  onClick={() => {
                    setActiveDrill(drill);
                    setSimResults(null);
                    cricketAudio.playBatHit();
                  }}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                    isSelected
                      ? 'border-purple-500 bg-purple-500/15 shadow-lg shadow-purple-500/20'
                      : 'border-slate-800 bg-slate-900/70 hover:border-slate-700 hover:bg-slate-900'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span
                      className="text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded-full"
                      style={{
                        backgroundColor: `${drill.color}22`,
                        color: drill.color,
                        border: `1px solid ${drill.color}44`,
                      }}
                    >
                      {drill.category.toUpperCase()} · {drill.difficultyLabel}
                    </span>

                    {/* Difficulty Stars */}
                    <div className="flex items-center gap-0.5">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <span
                          key={star}
                          className={`text-xs ${
                            star <= drill.difficulty ? 'text-amber-400' : 'text-slate-700'
                          }`}
                        >
                          ★
                        </span>
                      ))}
                    </div>
                  </div>

                  <h3 className="text-sm font-bold text-white">{drill.name}</h3>
                  <p className="text-xs text-slate-300 mt-1 line-clamp-2 leading-relaxed">
                    {drill.objective}
                  </p>

                  <div className="flex items-center justify-between border-t border-slate-800/80 pt-2.5 mt-2.5 text-[11px] font-mono text-slate-400">
                    <span className="flex items-center gap-1">
                      <Target className="h-3 w-3 text-purple-400" />
                      <span>{drill.deliverySpeed}</span>
                    </span>
                    <span className="text-emerald-400 font-bold">{drill.benchmarkTarget}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: 3D Interactive Pitch Preview & Simulator */}
        <div className="lg:col-span-7 space-y-4">
          <div className="rounded-3xl border border-purple-500/30 bg-slate-950/80 p-5 backdrop-blur-xl shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <span className="text-xs font-mono font-bold text-purple-400 flex items-center gap-1.5">
                  <Activity className="h-4 w-4" />
                  <span>3D ISOMETRIC PITCH FOCUS ZONE PREVIEW</span>
                </span>
                <h3 className="text-base font-bold text-white mt-0.5">{activeDrill.name}</h3>
              </div>
              <span className="text-xs font-mono px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 text-slate-300">
                Speed: {activeDrill.deliverySpeed}
              </span>
            </div>

            {/* 3D Pitch Canvas */}
            <div className="relative rounded-2xl overflow-hidden border border-slate-800/80 bg-slate-950 shadow-inner">
              <canvas
                ref={canvasRef}
                width={640}
                height={340}
                className="w-full h-72 sm:h-80 object-cover block"
              />

              {/* Focus Zone Badge Overlay */}
              <div className="absolute top-3 left-3 rounded-xl bg-slate-950/85 border border-slate-800 p-2.5 text-xs font-mono space-y-1 backdrop-blur-md">
                <span className="text-slate-400 block text-[10px]">CALIBRATED FOCUS ZONE:</span>
                <strong className="text-white block text-[11px]" style={{ color: activeDrill.color }}>
                  {activeDrill.focusZone}
                </strong>
                <span className="text-emerald-400 block text-[10px] font-bold">
                  Target: {activeDrill.benchmarkTarget}
                </span>
              </div>

              {/* Simulation Status Badge */}
              {isSimulating && (
                <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm flex flex-col items-center justify-center space-y-3 animate-in fade-in">
                  <div className="h-10 w-10 border-4 border-purple-500 border-t-transparent rounded-full animate-spin" />
                  <span className="text-xs font-mono text-purple-300 font-bold uppercase tracking-wider">
                    CALIBRATING 6-DELIVERY TELEMETRY BURST...
                  </span>
                </div>
              )}
            </div>

            {/* Execution Protocol & Steps */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs font-mono">
              {activeDrill.executionSteps.map((step, idx) => (
                <div
                  key={idx}
                  className="rounded-xl border border-slate-800 bg-slate-900/60 p-3 space-y-1"
                >
                  <span className="text-[10px] text-purple-400 font-bold block">
                    STEP {idx + 1}
                  </span>
                  <p className="text-slate-300 text-[11px] leading-relaxed font-sans">{step}</p>
                </div>
              ))}
            </div>

            {/* Simulator Action & Results */}
            <div className="border-t border-slate-800 pt-4 flex flex-col sm:flex-row items-center justify-between gap-4">
              {simResults ? (
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center">
                    <Trophy className="h-5 w-5 text-emerald-400" />
                  </div>
                  <div>
                    <span className="text-xs font-mono text-emerald-400 font-bold block">
                      {simResults.rating} · {simResults.accuracy}% ACCURACY
                    </span>
                    <span className="text-[11px] text-slate-400 font-mono">
                      Completed {simResults.ballsCompleted} deliveries · +{simResults.xpEarned} XP awarded!
                    </span>
                  </div>
                </div>
              ) : (
                <div className="text-xs text-slate-400 font-mono">
                  Ready to test drill accuracy against target coordinates.
                </div>
              )}

              <button
                onClick={handleRunDrillSimulation}
                disabled={isSimulating}
                className="w-full sm:w-auto flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white px-5 py-2.5 text-xs font-bold font-mono transition-all shadow-lg shadow-purple-600/30 cursor-pointer disabled:opacity-50"
              >
                <Play className="h-4 w-4 fill-white" />
                <span>{isSimulating ? 'Simulating...' : 'Simulate Drill Execution (+150 XP)'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
