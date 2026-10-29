import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Wind,
  Droplets,
  Thermometer,
  Gauge,
  Compass,
  Activity,
  Sparkles,
  RefreshCw,
  Zap,
  Shield,
  Sliders,
  Play,
  Pause,
  ArrowUpRight,
  Sun,
  CloudRain,
  Info,
} from 'lucide-react';
import { cricketAudio } from '../../utils/audioSystem';

export interface AtmosphericIntelligenceProps {
  initialTemperature?: number; // °C
  initialHumidity?: number; // %
  initialWindSpeed?: number; // km/h
  initialWindDirectionDeg?: number; // 0-360 deg
  initialAirPressure?: number; // hPa
  initialDewLevel?: number; // 0-100%
  pitchWear?: number; // 0-100%
  grassCoverage?: number; // 0-100%
  stadiumName?: string;
  onApplyConditions?: (conditions: {
    temperature?: number;
    humidity?: number;
    windSpeed?: number;
    windDirectionDeg?: number;
    airDensity?: number;
    swingImpactIndex: number;
    spinImpactIndex: number;
    compositeImpact: number;
    projectedPar: number;
    tossRecommendation: string;
  }) => void;
}

export const AtmosphericIntelligencePanel: React.FC<AtmosphericIntelligenceProps> = ({
  initialTemperature = 28,
  initialHumidity = 74,
  initialWindSpeed = 22,
  initialWindDirectionDeg = 240,
  initialAirPressure = 1012,
  initialDewLevel = 60,
  pitchWear = 40,
  grassCoverage = 55,
  stadiumName = 'Ahmedabad Stadium',
  onApplyConditions,
}) => {
  // Atmospheric Sensor State
  const [temperature, setTemperature] = useState<number>(initialTemperature);
  const [humidity, setHumidity] = useState<number>(initialHumidity);
  const [windSpeed, setWindSpeed] = useState<number>(initialWindSpeed);
  const [windDirectionDeg, setWindDirectionDeg] = useState<number>(initialWindDirectionDeg);
  const [airPressure, setAirPressure] = useState<number>(initialAirPressure);
  const [dewLevel, setDewLevel] = useState<number>(initialDewLevel);
  const [cloudCover, setCloudCover] = useState<number>(55);
  const [isLiveSimulating, setIsLiveSimulating] = useState<boolean>(true);
  const [simulationTick, setSimulationTick] = useState<number>(0);

  // Canvas Ref for additional particle atmospheric wind field visualization
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Background real-time atmospheric micro-fluctuations (subtle breeze gusts, humidity drift)
  useEffect(() => {
    if (!isLiveSimulating) return;

    const interval = setInterval(() => {
      setSimulationTick((t) => t + 1);

      // Micro-fluctuations within realistic bounds
      setWindSpeed((prev) => {
        const delta = (Math.random() - 0.5) * 1.8;
        return Number(Math.max(2, Math.min(55, prev + delta)).toFixed(1));
      });

      setWindDirectionDeg((prev) => {
        const delta = (Math.random() - 0.5) * 3;
        return Math.round((prev + delta + 360) % 360);
      });

      setHumidity((prev) => {
        const delta = (Math.random() - 0.5) * 0.8;
        return Math.max(15, Math.min(98, Math.round(prev + delta)));
      });
    }, 2000);

    return () => clearInterval(interval);
  }, [isLiveSimulating]);

  // Derived cardinal wind direction
  const windDirectionLabel = useMemo(() => {
    const directions = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
    const idx = Math.round((windDirectionDeg % 360) / 22.5) % 16;
    return directions[idx];
  }, [windDirectionDeg]);

  // Calculated Air Density (kg/m³) using ideal gas equation: rho = P / (R * T)
  const airDensity = useMemo(() => {
    const tempKelvin = temperature + 273.15;
    const density = (airPressure * 100) / (287.058 * tempKelvin);
    return Number(density.toFixed(3));
  }, [airPressure, temperature]);

  // Swing Impact Score (0-100)
  // High humidity + dense air + thick grass coverage + moderate cool temperature = enhanced lateral hoop
  const swingImpactIndex = useMemo(() => {
    const humidityContribution = (humidity / 100) * 44;
    const densityContribution = Math.min(24, Math.max(6, (airDensity - 1.1) * 100));
    const grassContribution = (grassCoverage / 100) * 22;
    const tempOptimal = temperature <= 22 ? 10 : Math.max(0, 10 - (temperature - 22) * 0.7);
    const score = Math.min(99, Math.max(8, Math.round(humidityContribution + densityContribution + grassContribution + tempOptimal)));
    return score;
  }, [humidity, airDensity, grassCoverage, temperature]);

  // Spin Impact Score (0-100)
  // High pitch wear + dry deck (low dew) + high ambient heat = sharp deck purchase & bite
  const spinImpactIndex = useMemo(() => {
    const wearFactor = (pitchWear / 100) * 54;
    const drynessFactor = (1 - dewLevel / 100) * 32;
    const heatExpansion = (temperature / 42) * 14;
    const score = Math.min(99, Math.max(8, Math.round(wearFactor + drynessFactor + heatExpansion)));
    return score;
  }, [pitchWear, dewLevel, temperature]);

  // Composite Swing & Spin Impact Index (0-100)
  const compositeImpactIndex = useMemo(() => {
    const raw = Math.round(swingImpactIndex * 0.52 + spinImpactIndex * 0.48);
    return Math.min(99, Math.max(12, raw));
  }, [swingImpactIndex, spinImpactIndex]);

  // Projected lateral air movement in degrees
  const airSwingDeviationDeg = useMemo(() => {
    return Number(((swingImpactIndex / 100) * 2.8 + 0.35).toFixed(1));
  }, [swingImpactIndex]);

  // Projected turn deviation off pitch in degrees
  const deckTurnDeviationDeg = useMemo(() => {
    return Number(((spinImpactIndex / 100) * 4.6 + 0.5).toFixed(1));
  }, [spinImpactIndex]);

  // Projected Par Score based on friction
  const projectedParScore = useMemo(() => {
    let par = 176;
    if (compositeImpactIndex >= 80) par -= 26;
    else if (compositeImpactIndex >= 65) par -= 15;
    else if (compositeImpactIndex <= 40) par += 20;

    if (dewLevel > 70) par += 14; // Heavy dew aids chasing team
    return par;
  }, [compositeImpactIndex, dewLevel]);

  // Radial Gauge Needle Angle (-120 to +120 degrees for 240 degree sweep)
  const gaugeAngle = useMemo(() => {
    const sweep = 240;
    return -120 + (compositeImpactIndex / 100) * sweep;
  }, [compositeImpactIndex]);

  // Hazard classification & palette
  const assessment = useMemo(() => {
    if (compositeImpactIndex >= 82) {
      return {
        level: 'EXTREME MULTI-THREAT',
        color: 'text-rose-400',
        badge: 'bg-rose-500/20 text-rose-300 border-rose-500/40 shadow-rose-500/20',
        needleColor: '#f43f5e',
        glowColor: 'rgba(244, 63, 94, 0.4)',
        verdict: 'Heavy lateral air hoop combined with violent pitch turn. Batters face extreme jeopardy in powerplay.',
      };
    }
    if (swingImpactIndex >= 70 && spinImpactIndex < 55) {
      return {
        level: 'PACE & SWING CORRIDOR',
        color: 'text-cyan-400',
        badge: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40 shadow-cyan-500/20',
        needleColor: '#06b6d4',
        glowColor: 'rgba(6, 182, 212, 0.4)',
        verdict: 'Dense atmospheric boundary layer favors express outswingers and new-ball wobble seam movement.',
      };
    }
    if (spinImpactIndex >= 70 && swingImpactIndex < 55) {
      return {
        level: 'SPIN MINEFIELD',
        color: 'text-amber-400',
        badge: 'bg-amber-500/20 text-amber-300 border-amber-500/40 shadow-amber-500/20',
        needleColor: '#f59e0b',
        glowColor: 'rgba(245, 158, 11, 0.4)',
        verdict: 'Dry baking surface activates intense finger and wrist spin bite. Batting first is crucial.',
      };
    }
    return {
      level: 'TRUE SPORTING EQUILIBRIUM',
      color: 'text-emerald-400',
      badge: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 shadow-emerald-500/20',
      needleColor: '#10b981',
      glowColor: 'rgba(16, 185, 129, 0.4)',
      verdict: 'Balanced atmospheric conditions; ball comes cleanly onto the bat with predictable bounce and carry.',
    };
  }, [compositeImpactIndex, swingImpactIndex, spinImpactIndex]);

  // Animated Canvas Wind Field
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let width = (canvas.width = canvas.parentElement?.clientWidth || 300);
    let height = (canvas.height = 140);

    const particles: Array<{ x: number; y: number; speed: number; length: number; opacity: number }> = [];
    const count = Math.min(36, Math.floor(windSpeed * 1.2));

    for (let i = 0; i < count; i++) {
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        speed: (windSpeed / 12) + Math.random() * 1.5 + 0.5,
        length: 12 + Math.random() * 20,
        opacity: 0.15 + Math.random() * 0.4,
      });
    }

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      // Convert wind degrees to vector dx, dy
      const rad = ((windDirectionDeg - 90) * Math.PI) / 180;
      const vx = Math.cos(rad);
      const vy = Math.sin(rad);

      ctx.lineWidth = 1.5;

      particles.forEach((p) => {
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(p.x + vx * p.length, p.y + vy * p.length);
        ctx.strokeStyle = `rgba(56, 189, 248, ${p.opacity})`;
        ctx.stroke();

        p.x += vx * p.speed;
        p.y += vy * p.speed;

        // Wrap around borders
        if (p.x < -40) p.x = width + 40;
        if (p.x > width + 40) p.x = -40;
        if (p.y < -40) p.y = height + 40;
        if (p.y > height + 40) p.y = -40;
      });

      animId = requestAnimationFrame(render);
    };

    render();

    return () => cancelAnimationFrame(animId);
  }, [windSpeed, windDirectionDeg]);

  return (
    <div className="relative rounded-3xl border border-cyan-500/30 bg-gradient-to-b from-[#03091e]/90 via-[#020617]/95 to-[#01040f] p-5 sm:p-7 shadow-[0_12px_40px_rgba(0,0,0,0.7)] backdrop-blur-xl space-y-6 select-none animate-in fade-in duration-300">
      {/* Glow highlight effects */}
      <div className="absolute top-0 left-1/4 h-36 w-1/2 bg-cyan-500/10 blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 h-36 w-1/2 bg-blue-600/10 blur-3xl pointer-events-none" />

      {/* Header Bar */}
      <div className="relative z-10 flex flex-wrap items-center justify-between gap-4 border-b border-cyan-500/20 pb-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono font-bold text-cyan-400">
            <span className="flex h-2.5 w-2.5 rounded-full bg-cyan-400 animate-ping" />
            <span className="tracking-widest uppercase">ATMOSPHERIC INTELLIGENCE ENGINE</span>
            <span className="text-slate-600">·</span>
            <span className="text-slate-400">{stadiumName}</span>
          </div>
          <h3 className="text-lg sm:text-xl font-black text-white font-sans tracking-tight mt-1 flex items-center gap-2">
            <span>Real-Time Simulated Micro-Climate & Dynamic Impact Gauge</span>
            <Sparkles className="h-4 w-4 text-cyan-400" />
          </h3>
        </div>

        {/* Live Simulation Stream Toggle & Apply Button */}
        <div className="flex items-center gap-2.5 font-mono text-xs">
          <button
            onClick={() => {
              setIsLiveSimulating((prev) => !prev);
              cricketAudio.playBatHit();
            }}
            className={`flex items-center gap-1.5 rounded-xl border px-3 py-1.5 font-bold transition-all cursor-pointer ${
              isLiveSimulating
                ? 'border-emerald-500/50 bg-emerald-950/60 text-emerald-300 shadow-md shadow-emerald-500/20'
                : 'border-slate-700 bg-slate-900/80 text-slate-400 hover:text-white'
            }`}
          >
            {isLiveSimulating ? (
              <>
                <Pause className="h-3.5 w-3.5 text-emerald-400" />
                <span>LIVE STREAM ACTIVE</span>
              </>
            ) : (
              <>
                <Play className="h-3.5 w-3.5 text-slate-400" />
                <span>PAUSED</span>
              </>
            )}
          </button>

          {onApplyConditions && (
            <button
              onClick={() => {
                onApplyConditions({
                  temperature,
                  humidity,
                  windSpeed,
                  windDirectionDeg,
                  airDensity,
                  swingImpactIndex,
                  spinImpactIndex,
                  compositeImpact: compositeImpactIndex,
                  projectedPar: projectedParScore,
                  tossRecommendation: assessment.verdict,
                });
                cricketAudio.playSix();
              }}
              className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 px-4 py-1.5 font-bold text-slate-950 hover:brightness-110 shadow-lg shadow-cyan-500/25 transition-all cursor-pointer"
            >
              <Zap className="h-3.5 w-3.5" />
              <span>Apply to Simulator</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Grid: Radial Gauge on Left, Sensor Controls & Stream on Right */}
      <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* ========================================================================= */}
        {/* LEFT: CINEMATIC GLASSMORPHISM RADIAL GAUGE (SWING & SPIN IMPACT)          */}
        {/* ========================================================================= */}
        <div className="lg:col-span-5 rounded-2xl border border-cyan-500/25 bg-slate-950/70 p-5 sm:p-6 flex flex-col items-center justify-between shadow-2xl backdrop-blur-md relative overflow-hidden">
          {/* Subtle Ambient Radial Glow */}
          <div
            className="absolute inset-0 opacity-20 pointer-events-none transition-all duration-700"
            style={{
              background: `radial-gradient(circle at 50% 50%, ${assessment.glowColor}, transparent 70%)`,
            }}
          />

          <div className="w-full flex items-center justify-between border-b border-slate-800 pb-3 text-xs font-mono">
            <span className="font-bold text-slate-200 flex items-center gap-1.5">
              <Gauge className="h-4 w-4 text-cyan-400" />
              <span>SWING & SPIN IMPACT GAUGE</span>
            </span>
            <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border ${assessment.badge}`}>
              {assessment.level}
            </span>
          </div>

          {/* DYNAMIC SVG RADIAL GAUGE */}
          <div className="relative my-3 flex items-center justify-center">
            <svg className="w-68 h-68 -rotate-90 transform" viewBox="0 0 260 260">
              <defs>
                {/* Multi-stop Neon Spectrum Gradient */}
                <linearGradient id="impactRadialGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#38bdf8" />
                  <stop offset="35%" stopColor="#10b981" />
                  <stop offset="70%" stopColor="#f59e0b" />
                  <stop offset="100%" stopColor="#f43f5e" />
                </linearGradient>

                {/* Intense Soft Glow Filter */}
                <filter id="radialGlowFilter" x="-30%" y="-30%" width="160%" height="160%">
                  <feGaussianBlur stdDeviation="4" result="blur" />
                  <feComposite in="SourceGraphic" in2="blur" operator="over" />
                </filter>
              </defs>

              {/* Outer Decorative Track Rim */}
              <circle
                cx="130"
                cy="130"
                r="105"
                fill="none"
                stroke="rgba(148, 163, 184, 0.12)"
                strokeWidth="1.5"
                strokeDasharray="4 6"
              />

              {/* Background Arc Track (240-degree sweep, radius = 92, circ = 578.05; 240 deg = 385.37) */}
              <circle
                cx="130"
                cy="130"
                r="92"
                fill="none"
                stroke="#0f172a"
                strokeWidth="16"
                strokeDasharray="385.4 578.1"
                strokeDashoffset="-96.3"
                strokeLinecap="round"
              />

              {/* Active Progress Arc */}
              <circle
                cx="130"
                cy="130"
                r="92"
                fill="none"
                stroke="url(#impactRadialGrad)"
                strokeWidth="16"
                strokeDasharray="385.4 578.1"
                strokeDashoffset={385.4 - (compositeImpactIndex / 100) * 385.4 - 96.3}
                strokeLinecap="round"
                filter="url(#radialGlowFilter)"
                className="transition-all duration-700 ease-out"
              />

              {/* Dial Scale Tick Marks */}
              {[0, 20, 40, 60, 80, 100].map((tick) => {
                const angle = -120 + (tick / 100) * 240;
                const rad = (angle * Math.PI) / 180;
                const x1 = 130 + 78 * Math.cos(rad);
                const y1 = 130 + 78 * Math.sin(rad);
                const x2 = 130 + 70 * Math.cos(rad);
                const y2 = 130 + 70 * Math.sin(rad);
                return (
                  <line
                    key={tick}
                    x1={x1}
                    y1={y1}
                    x2={x2}
                    y2={y2}
                    stroke="#475569"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                );
              })}
            </svg>

            {/* Glowing Needle Pointer */}
            <div
              className="absolute h-26 w-1.5 origin-bottom transition-transform duration-700 ease-out pointer-events-none"
              style={{
                transform: `rotate(${gaugeAngle}deg)`,
                bottom: '50%',
                left: 'calc(50% - 3px)',
              }}
            >
              <div
                className="h-full w-full rounded-t-full shadow-lg"
                style={{
                  backgroundColor: assessment.needleColor,
                  boxShadow: `0 0 16px ${assessment.needleColor}`,
                }}
              />
            </div>

            {/* Center Dial Readout */}
            <div className="absolute flex flex-col items-center justify-center text-center">
              <span className="text-[10px] font-mono uppercase text-slate-400 font-bold tracking-wider">
                IMPACT INDEX
              </span>
              <div className="flex items-baseline">
                <span className="text-4xl sm:text-5xl font-black text-white font-mono tracking-tighter drop-shadow-[0_0_12px_rgba(56,189,248,0.5)]">
                  {compositeImpactIndex}
                </span>
                <span className="text-xs font-mono text-cyan-400 ml-1">/100</span>
              </div>
              <span className={`text-[11px] font-mono font-bold uppercase mt-0.5 ${assessment.color}`}>
                Par: ~{projectedParScore}
              </span>
            </div>
          </div>

          {/* DUAL SUB-GAUGES: SWING VS SPIN BREAKDOWN */}
          <div className="w-full grid grid-cols-2 gap-3 pt-3 border-t border-slate-800">
            {/* Aero Swing Metric Card */}
            <div className="rounded-xl border border-cyan-500/20 bg-slate-900/70 p-3 space-y-1.5">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-cyan-400 font-bold flex items-center gap-1">
                  <Wind className="h-3.5 w-3.5" />
                  <span>Aero Swing</span>
                </span>
                <strong className="text-white">{swingImpactIndex}/100</strong>
              </div>
              <div className="h-2 rounded-full bg-slate-800 overflow-hidden shadow-inner">
                <div
                  className="h-full bg-gradient-to-r from-sky-500 to-blue-500 transition-all duration-500"
                  style={{ width: `${swingImpactIndex}%` }}
                />
              </div>
              <div className="flex justify-between text-[10px] font-mono text-slate-400">
                <span>Curve: ~{airSwingDeviationDeg}°</span>
                <span className="text-cyan-300 font-bold">
                  {swingImpactIndex > 70 ? 'High Swerve' : swingImpactIndex > 45 ? 'Moderate' : 'Gentle'}
                </span>
              </div>
            </div>

            {/* Pitch Grip & Spin Turn Metric Card */}
            <div className="rounded-xl border border-amber-500/20 bg-slate-900/70 p-3 space-y-1.5">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-amber-400 font-bold flex items-center gap-1">
                  <Compass className="h-3.5 w-3.5" />
                  <span>Deck Spin</span>
                </span>
                <strong className="text-white">{spinImpactIndex}/100</strong>
              </div>
              <div className="h-2 rounded-full bg-slate-800 overflow-hidden shadow-inner">
                <div
                  className="h-full bg-gradient-to-r from-amber-500 to-rose-500 transition-all duration-500"
                  style={{ width: `${spinImpactIndex}%` }}
                />
              </div>
              <div className="flex justify-between text-[10px] font-mono text-slate-400">
                <span>Turn: ~{deckTurnDeviationDeg}°</span>
                <span className="text-amber-300 font-bold">
                  {spinImpactIndex > 70 ? 'Sharp Bite' : spinImpactIndex > 45 ? 'True Grip' : 'Slide-on'}
                </span>
              </div>
            </div>
          </div>

          {/* Tactical Verdict Footer */}
          <p className="mt-3 text-xs text-slate-300 font-sans leading-relaxed text-center">
            {assessment.verdict}
          </p>
        </div>

        {/* ========================================================================= */}
        {/* RIGHT: INTERACTIVE ATMOSPHERIC SENSORS & TUNING CONTROLS                  */}
        {/* ========================================================================= */}
        <div className="lg:col-span-7 rounded-2xl border border-cyan-500/25 bg-slate-950/70 p-5 sm:p-6 space-y-5 flex flex-col justify-between backdrop-blur-md">
          {/* Top Sensor Header */}
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <span className="text-xs font-mono font-bold text-slate-200 flex items-center gap-2">
              <Sliders className="h-4 w-4 text-cyan-400" />
              <span>ENVIRONMENTAL SENSOR TUNING & WIND FIELD</span>
            </span>
            <div className="flex items-center gap-2 text-[10px] font-mono text-slate-400">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>AIR DENSITY: <strong className="text-cyan-300">{airDensity} kg/m³</strong></span>
            </div>
          </div>

          {/* Wind Field Particle Canvas */}
          <div className="relative rounded-2xl border border-cyan-500/20 bg-slate-900/60 p-3 overflow-hidden">
            <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 mb-2">
              <span className="flex items-center gap-1.5 text-cyan-300 font-bold">
                <Wind className="h-3.5 w-3.5 text-cyan-400" />
                <span>DYNAMIC WIND VECTOR FIELD: {windSpeed} KM/H ({windDirectionLabel})</span>
              </span>
              <span className="text-slate-500">{windDirectionDeg}° Vector</span>
            </div>
            <div className="relative w-full h-[85px] rounded-xl overflow-hidden bg-slate-950/80 border border-slate-800 flex items-center justify-center">
              <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />
              <div className="relative z-10 flex items-center gap-4 bg-slate-950/80 px-4 py-1.5 rounded-full border border-cyan-500/30 text-xs font-mono text-white">
                <Compass
                  className="h-4 w-4 text-cyan-400 transition-transform duration-500"
                  style={{ transform: `rotate(${windDirectionDeg}deg)` }}
                />
                <span>
                  CROSSWIND DRIFT: <strong className="text-cyan-300">~{((windSpeed / 50) * 1.8).toFixed(1)}°</strong> towards {windDirectionLabel}
                </span>
              </div>
            </div>
          </div>

          {/* Sliders Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-mono">
            {/* Temperature Slider */}
            <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-3.5 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-slate-300 flex items-center gap-1.5 font-bold">
                  <Thermometer className="h-3.5 w-3.5 text-amber-400" />
                  <span>Ambient Temp</span>
                </span>
                <span className="text-amber-400 font-black">{temperature}°C</span>
              </div>
              <input
                type="range"
                min="10"
                max="45"
                step="1"
                value={temperature}
                onChange={(e) => setTemperature(Number(e.target.value))}
                className="w-full accent-amber-400 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-500">
                <span>10°C (Crisp)</span>
                <span>28°C</span>
                <span>45°C (Baking)</span>
              </div>
            </div>

            {/* Relative Humidity Slider */}
            <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-3.5 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-slate-300 flex items-center gap-1.5 font-bold">
                  <Droplets className="h-3.5 w-3.5 text-cyan-400" />
                  <span>Relative Humidity</span>
                </span>
                <span className="text-cyan-400 font-black">{humidity}%</span>
              </div>
              <input
                type="range"
                min="20"
                max="98"
                step="1"
                value={humidity}
                onChange={(e) => setHumidity(Number(e.target.value))}
                className="w-full accent-cyan-400 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-500">
                <span>20% (Dry)</span>
                <span>65%</span>
                <span>98% (Saturated)</span>
              </div>
            </div>

            {/* Wind Velocity Slider */}
            <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-3.5 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-slate-300 flex items-center gap-1.5 font-bold">
                  <Wind className="h-3.5 w-3.5 text-emerald-400" />
                  <span>Wind Velocity</span>
                </span>
                <span className="text-emerald-400 font-black">{windSpeed} km/h</span>
              </div>
              <input
                type="range"
                min="2"
                max="55"
                step="1"
                value={windSpeed}
                onChange={(e) => setWindSpeed(Number(e.target.value))}
                className="w-full accent-emerald-400 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-500">
                <span>Calm (2)</span>
                <span>Moderate (25)</span>
                <span>Gale (55)</span>
              </div>
            </div>

            {/* Wind Direction Dial Slider */}
            <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-3.5 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-slate-300 flex items-center gap-1.5 font-bold">
                  <Compass className="h-3.5 w-3.5 text-blue-400" />
                  <span>Wind Direction</span>
                </span>
                <span className="text-blue-400 font-black">
                  {windDirectionDeg}° ({windDirectionLabel})
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="359"
                step="5"
                value={windDirectionDeg}
                onChange={(e) => setWindDirectionDeg(Number(e.target.value))}
                className="w-full accent-blue-400 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-500">
                <span>N (0°)</span>
                <span>E (90°)</span>
                <span>S (180°)</span>
                <span>W (270°)</span>
              </div>
            </div>
          </div>

          {/* Environmental Telemetry Footer Quick Stats */}
          <div className="grid grid-cols-3 gap-2 text-center text-xs font-mono pt-2 border-t border-slate-800">
            <div className="rounded-lg bg-slate-900/60 p-2 border border-slate-800">
              <span className="text-[10px] text-slate-400 block uppercase">Barometric Pressure</span>
              <strong className="text-white">{airPressure} hPa</strong>
            </div>
            <div className="rounded-lg bg-slate-900/60 p-2 border border-slate-800">
              <span className="text-[10px] text-slate-400 block uppercase">Dew Condensation</span>
              <strong className={dewLevel > 60 ? 'text-cyan-300' : 'text-slate-300'}>{dewLevel}%</strong>
            </div>
            <div className="rounded-lg bg-slate-900/60 p-2 border border-slate-800">
              <span className="text-[10px] text-slate-400 block uppercase">Air Resistance</span>
              <strong className="text-emerald-300">
                {airDensity > 1.22 ? 'High Drag (+8%)' : airDensity < 1.15 ? 'Low Drag (-12%)' : 'Nominal'}
              </strong>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
