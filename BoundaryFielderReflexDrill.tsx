import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { CricketIntelligenceEngine } from '../../engine/simulationEngine';
import { cricketAudio } from '../../utils/audioSystem';
import { useGame } from '../../context/GameContext';
import {
  Target,
  Zap,
  Shield,
  Play,
  RotateCcw,
  Trophy,
  Flame,
  Activity,
  CheckCircle2,
  Crosshair,
  Gauge,
  Sliders,
  ChevronRight,
  Sparkles,
} from 'lucide-react';

export const BoundaryFielderReflexDrill: React.FC = () => {
  const { addXp } = useGame();
  const scenarios = useMemo(() => CricketIntelligenceEngine.getBoundaryReflexScenarios(), []);
  const [selectedScenarioIndex, setSelectedScenarioIndex] = useState<number>(0);
  const activeScenario = scenarios[selectedScenarioIndex];

  // Drill State Machine: 'idle' | 'chasing' | 'cutoff_window' | 'aiming_throw' | 'throw_in_flight' | 'result'
  const [drillStage, setDrillStage] = useState<
    'idle' | 'chasing' | 'cutoff_window' | 'aiming_throw' | 'throw_in_flight' | 'result'
  >('idle');

  // Interactive Timing & Precision Metrics
  const [cutoffTimingDeltaMs, setCutoffTimingDeltaMs] = useState<number>(0);
  const [cutoffRating, setCutoffRating] = useState<'PERFECT' | 'EXCELLENT' | 'DECENT' | 'LATE_BOUNDARY' | null>(null);
  const [throwAimAngle, setThrowAimAngle] = useState<number>(0); // -25 to +25 deg offset
  const [throwPower, setThrowPower] = useState<number>(85); // %
  const [throwOutcome, setThrowOutcome] = useState<{
    isDirectHit: boolean;
    throwSpeedKmh: number;
    runsSaved: number;
    explanation: string;
    xpEarned: number;
  } | null>(null);

  // Stats & Streaks
  const [streak, setStreak] = useState<number>(0);
  const [bestStreak, setBestStreak] = useState<number>(0);
  const [drillsCompleted, setDrillsCompleted] = useState<number>(0);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animFrameRef = useRef<number | null>(null);

  // Time references for cutoff window
  const chaseStartTimeRef = useRef<number>(0);
  const cutoffTargetTimeRef = useRef<number>(0);

  // Start the high-speed drill
  const handleStartDrill = () => {
    setDrillStage('chasing');
    setCutoffRating(null);
    setThrowOutcome(null);
    setCutoffTimingDeltaMs(0);
    setThrowAimAngle(0);

    cricketAudio.playBatHit();

    const now = performance.now();
    chaseStartTimeRef.current = now;
    // Ball reaches cutoff zone in 1600ms
    cutoffTargetTimeRef.current = now + 1600;
  };

  // User hits "CUTOFF / DIVE" button or presses Spacebar
  const handleCutoffAction = useCallback(() => {
    if (drillStage !== 'chasing' && drillStage !== 'cutoff_window') return;

    const now = performance.now();
    const target = cutoffTargetTimeRef.current;
    const deltaMs = Math.round(now - target);
    setCutoffTimingDeltaMs(deltaMs);

    const absDelta = Math.abs(deltaMs);
    let rating: 'PERFECT' | 'EXCELLENT' | 'DECENT' | 'LATE_BOUNDARY';

    if (absDelta <= 35) {
      rating = 'PERFECT';
      cricketAudio.playBatHit();
    } else if (absDelta <= 75) {
      rating = 'EXCELLENT';
      cricketAudio.playBatHit();
    } else if (absDelta <= 130) {
      rating = 'DECENT';
    } else {
      rating = 'LATE_BOUNDARY';
      cricketAudio.playBoundary();
    }

    setCutoffRating(rating);

    if (rating === 'LATE_BOUNDARY') {
      // Ball crosses rope - drill over with 0 runs saved
      setDrillStage('result');
      setStreak(0);
      setThrowOutcome({
        isDirectHit: false,
        throwSpeedKmh: 0,
        runsSaved: 0,
        explanation: 'Fielder dived late! Ball grazed the boundary foam cushions for FOUR.',
        xpEarned: 25,
      });
      addXp(25, 'Boundary Drill: Late Dive (Boundary Conceded)');
    } else {
      // Clean cutoff! Advance to Phase 2: Aiming throw
      setDrillStage('aiming_throw');
    }
  }, [drillStage, addXp]);

  // Spacebar listener for rapid reflexes
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault();
        if (drillStage === 'chasing' || drillStage === 'cutoff_window') {
          handleCutoffAction();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [drillStage, handleCutoffAction]);

  // User releases relay throw
  const handleExecuteThrow = () => {
    if (drillStage !== 'aiming_throw') return;

    setDrillStage('throw_in_flight');
    cricketAudio.playBatHit();

    // Calculate throw physics
    setTimeout(() => {
      const precisionError = Math.abs(throwAimAngle); // degrees from bullseye
      const isDirectHit = precisionError <= 4 && throwPower >= 75;
      const throwSpeedKmh = Math.round(activeScenario.optimalThrowSpeedKmh * (throwPower / 100));

      let runsSaved = 2;
      let xpEarned = 100;
      let explanation = '';

      if (isDirectHit) {
        runsSaved = 4;
        xpEarned = 250;
        explanation = `DIRECT HIT! Bullseye on ${activeScenario.targetStumps} stumps at ${throwSpeedKmh} km/h! Run-out confirmed by third umpire!`;
        cricketAudio.playVictory();
        setStreak((prev) => {
          const next = prev + 1;
          setBestStreak((b) => Math.max(b, next));
          return next;
        });
      } else if (precisionError <= 10) {
        runsSaved = 3;
        xpEarned = 150;
        explanation = `Flat rocket throw to keeper gloves on 1 bounce (${throwSpeedKmh} km/h). Prevented the batter second run!`;
        cricketAudio.playBoundary();
        setStreak((prev) => {
          const next = prev + 1;
          setBestStreak((b) => Math.max(b, next));
          return next;
        });
      } else {
        runsSaved = 1;
        xpEarned = 60;
        explanation = `Throw slightly offline (${throwAimAngle > 0 ? '+' : ''}${throwAimAngle}° error). Backup fielder collected at mid-off.`;
        setStreak(0);
      }

      setDrillsCompleted((d) => d + 1);
      setThrowOutcome({
        isDirectHit,
        throwSpeedKmh,
        runsSaved,
        explanation,
        xpEarned,
      });

      setDrillStage('result');
      addXp(xpEarned, `Boundary Reflex Drill: ${runsSaved} Runs Saved (${explanation})`);
    }, 1200);
  };

  // 2D Canvas Outfield & Fielder Kinematics Animation Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let startTime = performance.now();

    const render = () => {
      const now = performance.now();
      const elapsed = (now - startTime) / 1000;
      const width = canvas.width;
      const height = canvas.height;

      ctx.clearRect(0, 0, width, height);

      // 1. Lush Outfield Turf with Mower Stripes
      const grassGrad = ctx.createLinearGradient(0, 0, 0, height);
      grassGrad.addColorStop(0, '#062817');
      grassGrad.addColorStop(0.5, '#041f12');
      grassGrad.addColorStop(1, '#02120a');
      ctx.fillStyle = grassGrad;
      ctx.fillRect(0, 0, width, height);

      // Outfield radial mower rings
      ctx.save();
      ctx.lineWidth = 14;
      ctx.strokeStyle = 'rgba(16, 185, 129, 0.05)';
      for (let r = 50; r < width * 0.9; r += 45) {
        ctx.beginPath();
        ctx.arc(width * 0.5, height * 0.95, r, Math.PI, 0);
        ctx.stroke();
      }
      ctx.restore();

      // 2. Boundary Foam Cushions (Curved rope at top)
      const ropeY = height * 0.22;
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(30, ropeY);
      ctx.quadraticCurveTo(width * 0.5, ropeY - 20, width - 30, ropeY);
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 6;
      ctx.shadowColor = '#ffffff';
      ctx.shadowBlur = 8;
      ctx.stroke();

      // Neon LED advertising boundary boards
      ctx.beginPath();
      ctx.moveTo(30, ropeY - 6);
      ctx.quadraticCurveTo(width * 0.5, ropeY - 26, width - 30, ropeY - 6);
      ctx.strokeStyle = '#06b6d4';
      ctx.lineWidth = 4;
      ctx.shadowColor = '#06b6d4';
      ctx.shadowBlur = 12;
      ctx.stroke();
      ctx.restore();

      // 3. Stumps at bottom center (Relay target)
      const stumpsX = width * 0.5;
      const stumpsY = height * 0.88;
      ctx.save();
      ctx.fillStyle = '#f59e0b';
      // 3 Stumps
      for (let s = -1; s <= 1; s++) {
        ctx.fillRect(stumpsX + s * 6 - 1.5, stumpsY - 18, 3, 18);
      }
      // Bails
      ctx.fillRect(stumpsX - 8, stumpsY - 20, 16, 2.5);

      // Popping crease
      ctx.beginPath();
      ctx.moveTo(stumpsX - 60, stumpsY + 4);
      ctx.lineTo(stumpsX + 60, stumpsY + 4);
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.restore();

      // 4. Ball & Fielder Kinematics
      const ballOriginX = stumpsX;
      const ballOriginY = stumpsY;
      const ropeTargetX = width * 0.72;
      const ropeTargetY = ropeY;

      if (drillStage === 'chasing' || drillStage === 'cutoff_window') {
        const chaseProgress = Math.min(1, (now - chaseStartTimeRef.current) / 1600);

        // Ball rolling toward the rope
        const ballX = ballOriginX + (ropeTargetX - ballOriginX) * chaseProgress;
        const ballY = ballOriginY + (ropeTargetY - ballOriginY) * chaseProgress;

        // Fielder sprinting from mid-wicket to intercept
        const fielderStartX = width * 0.35;
        const fielderStartY = height * 0.45;
        const fielderEndX = ropeTargetX - 25;
        const fielderEndY = ropeTargetY + 15;

        const fielderX = fielderStartX + (fielderEndX - fielderStartX) * chaseProgress;
        const fielderY = fielderStartY + (fielderEndY - fielderStartY) * chaseProgress;

        // Draw ball trail
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(ballOriginX, ballOriginY);
        ctx.lineTo(ballX, ballY);
        ctx.strokeStyle = 'rgba(239, 68, 68, 0.4)';
        ctx.lineWidth = 2;
        ctx.setLineDash([4, 4]);
        ctx.stroke();

        // Draw rolling ball
        ctx.beginPath();
        ctx.arc(ballX, ballY, 5, 0, Math.PI * 2);
        ctx.fillStyle = '#ef4444';
        ctx.shadowColor = '#ef4444';
        ctx.shadowBlur = 10;
        ctx.fill();
        ctx.restore();

        // Draw sprinting/sliding fielder
        ctx.save();
        ctx.beginPath();
        ctx.arc(fielderX, fielderY, 9, 0, Math.PI * 2);
        ctx.fillStyle = '#06b6d4';
        ctx.shadowColor = '#06b6d4';
        ctx.shadowBlur = 14;
        ctx.fill();

        // Fielder direction arm
        ctx.beginPath();
        ctx.moveTo(fielderX, fielderY);
        ctx.lineTo(ballX, ballY);
        ctx.strokeStyle = 'rgba(6, 182, 212, 0.5)';
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.restore();

        // Cutoff Target Ring at interception zone
        if (chaseProgress >= 0.7) {
          ctx.save();
          const pulse = Math.sin(elapsed * 12) * 4 + 18;
          ctx.beginPath();
          ctx.arc(ropeTargetX - 20, ropeTargetY + 10, pulse, 0, Math.PI * 2);
          ctx.strokeStyle = '#f59e0b';
          ctx.lineWidth = 2.5;
          ctx.shadowColor = '#f59e0b';
          ctx.shadowBlur = 15;
          ctx.stroke();
          ctx.restore();
        }
      } else if (drillStage === 'aiming_throw') {
        // Fielder gathered at boundary, aiming throw to stumps
        const gatherX = ropeTargetX - 20;
        const gatherY = ropeTargetY + 10;

        ctx.save();
        // Fielder node
        ctx.beginPath();
        ctx.arc(gatherX, gatherY, 10, 0, Math.PI * 2);
        ctx.fillStyle = '#10b981';
        ctx.shadowColor = '#10b981';
        ctx.shadowBlur = 12;
        ctx.fill();

        // Aiming guideline with user angle offset
        const baseAngle = Math.atan2(stumpsY - gatherY, stumpsX - gatherX);
        const userAngle = baseAngle + (throwAimAngle * Math.PI) / 180;
        const targetLen = Math.hypot(stumpsX - gatherX, stumpsY - gatherY);
        const aimEndX = gatherX + Math.cos(userAngle) * targetLen;
        const aimEndY = gatherY + Math.sin(userAngle) * targetLen;

        ctx.beginPath();
        ctx.moveTo(gatherX, gatherY);
        ctx.lineTo(aimEndX, aimEndY);
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 2;
        ctx.setLineDash([6, 4]);
        ctx.stroke();

        // Target Reticle
        ctx.beginPath();
        ctx.arc(aimEndX, aimEndY, 14, 0, Math.PI * 2);
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.restore();
      } else if (drillStage === 'throw_in_flight') {
        // Parabolic high-speed throw back to stumps
        const gatherX = ropeTargetX - 20;
        const gatherY = ropeTargetY + 10;
        const progress = (now % 1200) / 1200;

        const curX = gatherX + (stumpsX - gatherX) * progress;
        const linearY = gatherY + (stumpsY - gatherY) * progress;
        const arc = Math.sin(progress * Math.PI) * 40;
        const curY = linearY - arc;

        ctx.save();
        // Flight trail
        ctx.beginPath();
        ctx.moveTo(gatherX, gatherY);
        ctx.lineTo(curX, curY);
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.6)';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Glowing ball in air
        ctx.beginPath();
        ctx.arc(curX, curY, 6, 0, Math.PI * 2);
        ctx.fillStyle = '#ffffff';
        ctx.shadowColor = '#38bdf8';
        ctx.shadowBlur = 16;
        ctx.fill();
        ctx.restore();
      }

      animFrameRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [drillStage, throwAimAngle]);

  return (
    <div className="space-y-6">
      {/* Top Drill Eyebrow & Badges */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-purple-500/20 pb-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-purple-400 font-bold uppercase tracking-wider">
            <Zap className="h-4 w-4 text-purple-400 animate-pulse" />
            <span>STRATEGIC DRILLS LAB · SPECIALIZED FIELDING MODULE</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-white mt-1">
            Boundary Fielder Reflex & Bullet Relay Throw Challenge
          </h2>
          <p className="text-xs text-slate-400 mt-0.5 max-w-2xl">
            Simulate realistic high-speed outfield relay throws from the deep rope. Calibrate diving cutoff timing, slide mechanics, and bullseye throwing precision to save critical boundary runs.
          </p>
        </div>

        {/* Streak Counter & Accuracy Badges */}
        <div className="flex items-center gap-3 bg-slate-900/90 border border-slate-800 p-2 rounded-2xl text-xs font-mono">
          <div className="flex items-center gap-1.5 px-2">
            <Flame className="h-4 w-4 text-amber-400 animate-bounce" />
            <div>
              <span className="text-[9px] text-slate-500 block uppercase">STREAK</span>
              <span className="font-bold text-amber-300 text-xs">{streak} Saves</span>
            </div>
          </div>
          <div className="border-l border-slate-800 pl-3 pr-2">
            <span className="text-[9px] text-slate-500 block uppercase">BEST RECORD</span>
            <span className="font-bold text-emerald-400 text-xs">{bestStreak} Direct Hits</span>
          </div>
        </div>
      </div>

      {/* Scenario Selection Tabs */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-mono text-slate-400 font-bold uppercase mr-1">SCENARIOS:</span>
        {scenarios.map((sc, idx) => (
          <button
            key={sc.id}
            onClick={() => {
              setSelectedScenarioIndex(idx);
              setDrillStage('idle');
              setCutoffRating(null);
              setThrowOutcome(null);
              cricketAudio.playBatHit();
            }}
            className={`rounded-xl px-3 py-1.5 text-xs font-mono transition-all cursor-pointer ${
              selectedScenarioIndex === idx
                ? 'bg-purple-600 text-white font-bold shadow-md shadow-purple-600/30 border border-purple-400'
                : 'bg-slate-900/80 border border-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            <span>{sc.batterName} ({sc.shotType.split(' ')[0]})</span>
          </button>
        ))}
      </div>

      {/* Main Interactive Arena */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: 2D Outfield Simulation Canvas */}
        <div className="lg:col-span-8 space-y-3">
          <div className="relative rounded-2xl border border-purple-500/30 bg-slate-950 overflow-hidden shadow-2xl">
            <canvas
              ref={canvasRef}
              width={720}
              height={380}
              className="w-full h-80 sm:h-96 object-cover block cursor-crosshair"
            />

            {/* In-Game Active Scenario HUD Overlay */}
            <div className="absolute top-3 left-3 rounded-xl bg-slate-950/90 border border-slate-800 p-2.5 text-xs font-mono space-y-1 backdrop-blur-md">
              <span className="text-[10px] text-purple-400 font-bold block uppercase">
                {activeScenario.title}
              </span>
              <div className="flex items-center gap-2 text-[11px] text-slate-300">
                <span>Batter: <strong className="text-white">{activeScenario.batterName}</strong></span>
                <span>·</span>
                <span>Gun Fielder: <strong className="text-cyan-300">{activeScenario.fielderName}</strong></span>
              </div>
              <div className="flex items-center gap-3 text-[10px] text-slate-400 pt-0.5">
                <span>Exit: <strong className="text-amber-400">{activeScenario.exitSpeedKmh} km/h</strong></span>
                <span>Dist: <strong className="text-slate-200">{activeScenario.boundaryDistanceMeters}m</strong></span>
                <span>Target: <strong className="text-cyan-400 uppercase">{activeScenario.targetStumps} stumps</strong></span>
              </div>
            </div>

            {/* Cutoff Timing Quality Banner */}
            {cutoffRating && (
              <div className="absolute top-3 right-3 animate-in zoom-in-95 duration-200">
                <span
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-mono font-black uppercase shadow-lg ${
                    cutoffRating === 'PERFECT'
                      ? 'bg-emerald-500 text-slate-950 border border-emerald-300 shadow-emerald-500/30 animate-bounce'
                      : cutoffRating === 'EXCELLENT'
                      ? 'bg-cyan-500 text-slate-950 border border-cyan-300'
                      : cutoffRating === 'DECENT'
                      ? 'bg-amber-500 text-slate-950 border border-amber-300'
                      : 'bg-rose-500 text-white border border-rose-400'
                  }`}
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  <span>{cutoffRating.replace('_', ' ')} · {cutoffTimingDeltaMs > 0 ? `+${cutoffTimingDeltaMs}` : cutoffTimingDeltaMs}ms</span>
                </span>
              </div>
            )}

            {/* Big Interactive Action Button Bar (Bottom of canvas) */}
            <div className="absolute bottom-4 inset-x-4 sm:inset-x-8 flex items-center justify-center">
              {drillStage === 'idle' && (
                <button
                  onClick={handleStartDrill}
                  className="rounded-2xl bg-gradient-to-r from-purple-600 via-indigo-600 to-cyan-600 hover:from-purple-500 hover:to-cyan-500 text-white font-mono font-black text-sm px-8 py-3.5 shadow-2xl shadow-purple-600/50 flex items-center gap-2 cursor-pointer transition-all hover:scale-105"
                >
                  <Play className="h-5 w-5 fill-white" />
                  <span>START BOUNDARY RELAY DRILL (+250 XP)</span>
                </button>
              )}

              {(drillStage === 'chasing' || drillStage === 'cutoff_window') && (
                <button
                  onClick={handleCutoffAction}
                  className="w-full sm:w-auto rounded-2xl bg-gradient-to-r from-amber-500 to-rose-500 hover:from-amber-400 hover:to-rose-400 text-slate-950 font-mono font-black text-sm sm:text-base px-8 py-4 shadow-2xl shadow-amber-500/60 flex items-center justify-center gap-3 cursor-pointer animate-pulse transition-all"
                >
                  <Crosshair className="h-6 w-6 text-slate-950" />
                  <span>PRESS SPACE OR CLICK: SLIDE & CUTOFF!</span>
                </button>
              )}

              {drillStage === 'aiming_throw' && (
                <div className="w-full bg-slate-950/95 border border-cyan-500/40 rounded-2xl p-3 backdrop-blur-md flex flex-col sm:flex-row items-center justify-between gap-3 shadow-2xl">
                  <div className="flex items-center gap-2 text-xs font-mono text-cyan-300">
                    <Crosshair className="h-4 w-4 text-cyan-400 animate-spin" />
                    <span>PHASE 2: CALIBRATE RELAY THROW TRAJECTORY</span>
                  </div>

                  <button
                    onClick={handleExecuteThrow}
                    className="w-full sm:w-auto rounded-xl bg-gradient-to-r from-cyan-500 to-emerald-500 hover:from-cyan-400 hover:to-emerald-400 text-slate-950 font-mono font-black text-xs sm:text-sm px-6 py-2.5 shadow-lg shadow-cyan-500/30 flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Zap className="h-4 w-4" />
                    <span>FIRE BULLET THROW ({throwPower}%)</span>
                  </button>
                </div>
              )}

              {drillStage === 'result' && (
                <button
                  onClick={handleStartDrill}
                  className="rounded-2xl bg-slate-900 border border-slate-700 hover:border-purple-400 text-white font-mono font-bold text-xs sm:text-sm px-6 py-3 shadow-xl flex items-center gap-2 cursor-pointer transition-all hover:bg-slate-800"
                >
                  <RotateCcw className="h-4 w-4 text-purple-400" />
                  <span>REPLAY DRILL WITH NEXT DELIVERY</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Right: Telemetry & Throw Precision Calibration Controls */}
        <div className="lg:col-span-4 space-y-4">
          {/* Throw Aiming & Power Controls */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4 space-y-3.5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="text-xs font-mono font-bold text-cyan-400 uppercase tracking-wider flex items-center gap-1.5">
                <Sliders className="h-4 w-4" />
                <span>THROW CALIBRATION</span>
              </span>
              <span className="text-[10px] font-mono text-slate-400">
                Target: {activeScenario.targetStumps}
              </span>
            </div>

            {/* Throw Trajectory Angle Slider */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-mono">
                <span className="text-slate-400">Angle Offset:</span>
                <span className={`font-bold ${throwAimAngle === 0 ? 'text-emerald-400' : 'text-cyan-300'}`}>
                  {throwAimAngle > 0 ? `+${throwAimAngle}°` : `${throwAimAngle}°`} (0° is Bullseye)
                </span>
              </div>
              <input
                type="range"
                min="-20"
                max="20"
                step="1"
                value={throwAimAngle}
                onChange={(e) => setThrowAimAngle(parseInt(e.target.value, 10))}
                className="w-full accent-cyan-400 h-2 bg-slate-800 rounded-lg cursor-pointer"
              />
              <div className="flex justify-between text-[10px] font-mono text-slate-500">
                <span>Left Side (-20°)</span>
                <span>Direct Hit (0°)</span>
                <span>Right Side (+20°)</span>
              </div>
            </div>

            {/* Throw Arm Velocity / Power */}
            <div className="space-y-1.5 pt-1 border-t border-slate-800/80">
              <div className="flex justify-between text-xs font-mono">
                <span className="text-slate-400">Arm Velocity / Power:</span>
                <span className="font-bold text-amber-400">
                  {throwPower}% ({Math.round(activeScenario.optimalThrowSpeedKmh * (throwPower / 100))} km/h)
                </span>
              </div>
              <input
                type="range"
                min="50"
                max="100"
                step="2"
                value={throwPower}
                onChange={(e) => setThrowPower(parseInt(e.target.value, 10))}
                className="w-full accent-amber-400 h-2 bg-slate-800 rounded-lg cursor-pointer"
              />
              <div className="flex justify-between text-[10px] font-mono text-slate-500">
                <span>Lobbed Take (50%)</span>
                <span>Flat Bullet (100%)</span>
              </div>
            </div>
          </div>

          {/* Drill Telemetry Results Card */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4 space-y-3">
            <span className="text-xs font-mono font-bold text-purple-400 uppercase tracking-wider block border-b border-slate-800 pb-2">
              SIMULATION KINEMATICS & TELEMETRY
            </span>

            <div className="grid grid-cols-2 gap-2 text-xs font-mono">
              <div className="rounded-xl border border-slate-800 bg-slate-950/80 p-2">
                <span className="text-[9px] text-slate-500 block uppercase">SPRINT SPEED</span>
                <span className="font-bold text-white text-xs">{activeScenario.fielderSprintSpeedKmh} km/h</span>
              </div>
              <div className="rounded-xl border border-slate-800 bg-slate-950/80 p-2">
                <span className="text-[9px] text-slate-500 block uppercase">THROW DISTANCE</span>
                <span className="font-bold text-cyan-300 text-xs">{activeScenario.throwDistanceMeters}m</span>
              </div>
              <div className="rounded-xl border border-slate-800 bg-slate-950/80 p-2">
                <span className="text-[9px] text-slate-500 block uppercase">CUTOFF WINDOW</span>
                <span className="font-bold text-amber-300 text-xs">±{activeScenario.cutoffWindowMs}ms</span>
              </div>
              <div className="rounded-xl border border-slate-800 bg-slate-950/80 p-2">
                <span className="text-[9px] text-slate-500 block uppercase">DRILLS LOGGED</span>
                <span className="font-bold text-emerald-400 text-xs">{drillsCompleted} Completed</span>
              </div>
            </div>

            {/* Latest Execution Report */}
            {throwOutcome ? (
              <div className="rounded-xl border border-emerald-500/30 bg-emerald-950/20 p-3 space-y-1.5 animate-in fade-in">
                <div className="flex items-center justify-between text-xs font-mono font-bold text-emerald-400">
                  <span>OUTCOME: {throwOutcome.runsSaved} RUNS SAVED</span>
                  <span>+{throwOutcome.xpEarned} XP</span>
                </div>
                <p className="text-[11px] text-slate-200 font-sans leading-tight">
                  {throwOutcome.explanation}
                </p>
              </div>
            ) : (
              <div className="rounded-xl border border-slate-800/80 bg-slate-950/40 p-3 text-center text-xs font-mono text-slate-500">
                Hit START to trigger the high-speed delivery. Timing the slide cutoff precisely stops the ball before the foam cushions.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
