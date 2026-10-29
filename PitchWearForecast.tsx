import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  Layers,
  TrendingDown,
  TrendingUp,
  Droplets,
  Sun,
  Wind,
  Compass,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  Shield,
  Activity,
  Sliders,
  CheckCircle2,
} from 'lucide-react';
import { cricketAudio } from '../../utils/audioSystem';
import { triggerHaptic, HAPTIC_PATTERNS } from '../../utils/haptics';

interface PitchWearForecastProps {
  stadiumName?: string;
  initialDay?: number;
  temperature?: number;
  humidity?: number;
  windSpeed?: number;
}

export const PitchWearForecast: React.FC<PitchWearForecastProps> = ({
  stadiumName = 'Kensington Oval, Barbados',
  initialDay = 1,
  temperature = 29,
  humidity = 68,
  windSpeed = 18,
}) => {
  // Day of match slider (1 to 5)
  const [matchDay, setMatchDay] = useState<number>(initialDay);
  const [ambientTemp, setAmbientTemp] = useState<number>(temperature);
  const [relativeHumidity, setRelativeHumidity] = useState<number>(humidity);
  const [directSunHours, setDirectSunHours] = useState<number>(7.5);
  const [showDewToast, setShowDewToast] = useState<boolean>(true);

  // 3D Stadium Radar wind direction & sweep
  const [radarAngle, setRadarAngle] = useState<number>(0);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Sync ambient conditions if props change
  useEffect(() => {
    setAmbientTemp(temperature);
    setRelativeHumidity(humidity);
  }, [temperature, humidity]);

  // Dew point calculation formula
  const dewPointTemp = useMemo(() => {
    // Magnus-Tetens approximation
    const a = 17.27;
    const b = 237.7;
    const alpha = ((a * ambientTemp) / (b + ambientTemp)) + Math.log(relativeHumidity / 100);
    return Math.round(((b * alpha) / (a - alpha)) * 10) / 10;
  }, [ambientTemp, relativeHumidity]);

  const dewProbability = useMemo(() => {
    // High probability when temp approaches dew point or RH > 60%
    const diff = Math.max(0, ambientTemp - dewPointTemp);
    const prob = Math.round(Math.min(96, Math.max(10, relativeHumidity * 0.95 - diff * 4.5)));
    return prob;
  }, [ambientTemp, dewPointTemp, relativeHumidity]);

  // Day of match wear telemetry
  const dayTelemetry = useMemo(() => {
    switch (matchDay) {
      case 1:
        return {
          title: 'Day 1: Pristine Compacted Turf',
          friction: 0.32,
          bounceConsistency: 95,
          spinCoefficient: 1.05,
          wearPercentage: 12,
          seamMovement: '2.8° Maximum Seam Movement',
          color: '#10b981',
          description: 'Compact Bulli clay matrix bound by perennial grass. Excellent carry through to keeper, predictable true bounce.',
          recommendation: 'Ideal conditions for strokeplay once opening 10 overs are negotiated. Pacers gain conventional lateral deviation.',
        };
      case 2:
        return {
          title: 'Day 2: Settled Deck & Glaze Burn',
          friction: 0.39,
          bounceConsistency: 91,
          spinCoefficient: 1.28,
          wearPercentage: 28,
          seamMovement: '2.2° Steady Movement',
          color: '#06b6d4',
          description: 'Spikes begin abrading the upper soil surface. Ball loses glossy sheen after 12 overs; ball starts scuffing on one side.',
          recommendation: 'Pace bowlers should cultivate one rough side for reverse swing; batters can play through the line with confidence.',
        };
      case 3:
        return {
          title: 'Day 3: Footmark Fissures & Surface Dust',
          friction: 0.48,
          bounceConsistency: 84,
          spinCoefficient: 1.62,
          wearPercentage: 52,
          seamMovement: '1.7° Slight Cut Off Seam',
          color: '#f59e0b',
          description: 'Pronounced indentations outside right-handers off-stump. Finger spinners achieve sharp grip and dipping trajectory.',
          recommendation: 'Target rough patches from around the wicket. Variable bounce begins to manifest on short-of-a-length deliveries.',
        };
      case 4:
        return {
          title: 'Day 4: Abrasive Crust & Micro-Cracks',
          friction: 0.58,
          bounceConsistency: 74,
          spinCoefficient: 2.10,
          wearPercentage: 76,
          seamMovement: '1.2° Surface Grip',
          color: '#f97316',
          description: 'Crust delamination with loosened gravel. Uneven bounce with occasional deliveries keeping low under the bat line.',
          recommendation: 'Twin spinners operating in tandem. Batters must employ sweep and step-out techniques to negate length variation.',
        };
      case 5:
      default:
        return {
          title: 'Day 5: Turning Minefield & Deep Fissures',
          friction: 0.72,
          bounceConsistency: 62,
          spinCoefficient: 2.75,
          wearPercentage: 94,
          seamMovement: '0.8° Low Skid',
          color: '#ef4444',
          description: 'Severe structural breakdown. Deep fissures up to 8mm wide causing erratic spitting bounce and extreme turns up to 5.4°.',
          recommendation: 'Extreme trial for batting units. Close-in catchers (short leg, silly point, slip cordon) in operation throughout.',
        };
    }
  }, [matchDay]);

  // 48-Hour Degradation Projection (9 time intervals from 0h to 48h)
  const projection48h = useMemo(() => {
    const hours = [0, 6, 12, 18, 24, 30, 36, 42, 48];
    const baseFriction = dayTelemetry.friction;
    const baseBounce = dayTelemetry.bounceConsistency;
    const climateDegradation = (ambientTemp / 30) * (directSunHours / 8) * 0.08;

    return hours.map((h) => {
      const prog = h / 48;
      const friction = Math.min(0.85, Number((baseFriction + prog * climateDegradation + (prog * 0.12)).toFixed(2)));
      const bounce = Math.max(50, Math.round(baseBounce - prog * 18 - (ambientTemp > 32 ? prog * 6 : 0)));
      return {
        hour: `+${h}h`,
        hourLabel: h === 0 ? 'Now' : `T+${h}h`,
        friction,
        bounce,
      };
    });
  }, [dayTelemetry, ambientTemp, directSunHours]);

  // Animated 3D Radar Sweep on Canvas
  useEffect(() => {
    let animId: number;
    const renderRadar = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const w = canvas.width;
      const h = canvas.height;
      const cx = w / 2;
      const cy = h / 2;
      const maxR = Math.min(cx, cy) - 20;

      ctx.clearRect(0, 0, w, h);

      // Dark futuristic background
      ctx.fillStyle = '#020617';
      ctx.fillRect(0, 0, w, h);

      // Radar Concentric Circles
      [0.33, 0.66, 1.0].forEach((ratio, idx) => {
        const r = maxR * ratio;
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.strokeStyle = idx === 2 ? 'rgba(6, 182, 212, 0.5)' : 'rgba(30, 41, 59, 0.8)';
        ctx.lineWidth = 1;
        ctx.setLineDash(idx === 2 ? [] : [4, 4]);
        ctx.stroke();
        ctx.setLineDash([]);

        // Label distance
        ctx.fillStyle = '#64748b';
        ctx.font = '9px monospace';
        ctx.fillText(`${Math.round(ratio * 80)}m`, cx + 4, cy - r + 11);
      });

      // Crosshairs
      ctx.beginPath();
      ctx.moveTo(cx - maxR, cy);
      ctx.lineTo(cx + maxR, cy);
      ctx.moveTo(cx, cy - maxR);
      ctx.lineTo(cx, cy + maxR);
      ctx.strokeStyle = 'rgba(51, 65, 85, 0.5)';
      ctx.lineWidth = 1;
      ctx.stroke();

      // Pitch Strip in Center (Green / Tan)
      ctx.save();
      ctx.fillStyle = dayTelemetry.color;
      ctx.shadowColor = dayTelemetry.color;
      ctx.shadowBlur = 8;
      ctx.fillRect(cx - 3, cy - 22, 6, 44);
      ctx.restore();

      // Wind Vector Arrow (Direction NW, approx 315 deg)
      const windAngleRad = ((315 - 90) * Math.PI) / 180;
      const windLen = 50 + (windSpeed / 30) * 35;
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + windLen * Math.cos(windAngleRad), cy + windLen * Math.sin(windAngleRad));
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 2.5;
      ctx.shadowColor = '#0284c7';
      ctx.shadowBlur = 10;
      ctx.stroke();
      ctx.restore();

      // Dynamic Rotating Radar Sweep Line
      setRadarAngle((prev) => (prev + 0.02) % (Math.PI * 2));
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, maxR, radarAngle, radarAngle + 0.35);
      ctx.closePath();
      const sweepGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, maxR);
      sweepGrad.addColorStop(0, 'rgba(6, 182, 212, 0.35)');
      sweepGrad.addColorStop(1, 'rgba(6, 182, 212, 0.0)');
      ctx.fillStyle = sweepGrad;
      ctx.fill();
      ctx.restore();

      // Boundary Target Markers (Straight, Square, Fine Leg, Third Man)
      const boundaries = [
        { name: 'Straight (74m)', angle: -Math.PI / 2, dist: 74 / 80 },
        { name: 'Mid Wkt (68m)', angle: -Math.PI * 0.15, dist: 68 / 80 },
        { name: 'Square Leg (66m)', angle: 0, dist: 66 / 80 },
        { name: 'Fine Leg (62m)', angle: Math.PI * 0.35, dist: 62 / 80 },
        { name: 'Third Man (61m)', angle: Math.PI * 0.75, dist: 61 / 80 },
        { name: 'Cover (67m)', angle: Math.PI, dist: 67 / 80 },
      ];

      boundaries.forEach((b) => {
        const bx = cx + maxR * b.dist * Math.cos(b.angle);
        const by = cy + maxR * b.dist * Math.sin(b.angle);
        ctx.beginPath();
        ctx.arc(bx, by, 3, 0, Math.PI * 2);
        ctx.fillStyle = '#f59e0b';
        ctx.fill();

        ctx.fillStyle = '#94a3b8';
        ctx.font = '8px monospace';
        ctx.fillText(b.name, bx + 5, by + 3);
      });

      animId = requestAnimationFrame(renderRadar);
    };

    animId = requestAnimationFrame(renderRadar);
    return () => cancelAnimationFrame(animId);
  }, [radarAngle, dayTelemetry, windSpeed]);

  return (
    <div className="rounded-3xl border border-cyan-500/35 bg-gradient-to-b from-[#020617] via-[#030e28] to-[#020617] p-6 sm:p-7 space-y-6 shadow-2xl backdrop-blur-2xl text-slate-100">
      {/* 1. Header with Live Status Badges */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-cyan-500/20 pb-5">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono font-bold text-cyan-400 uppercase tracking-widest">
            <Activity className="h-4 w-4 animate-spin-slow" />
            <span>48-HOUR PITCH WEAR FORECAST & MULTI-DAY DEGRADATION</span>
          </div>
          <h3 className="text-xl sm:text-2xl font-black text-white tracking-tight mt-1">
            {stadiumName}
          </h3>
          <p className="text-xs text-slate-400 font-sans mt-0.5 max-w-xl">
            Calculates empirical surface degradation, friction index, bounce decay, and spin deviation across match days.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-xl border border-cyan-500/40 bg-cyan-950/60 px-3 py-1.5 text-xs font-mono font-bold text-cyan-300">
            DAY {matchDay} OF 5
          </span>
          <span className="rounded-xl border border-amber-500/40 bg-amber-950/60 px-3 py-1.5 text-xs font-mono font-bold text-amber-300">
            {dayTelemetry.spinCoefficient}x SPIN FACTOR
          </span>
          <span className="rounded-xl border border-emerald-500/40 bg-emerald-950/60 px-3 py-1.5 text-xs font-mono font-bold text-emerald-300">
            {dayTelemetry.bounceConsistency}% BOUNCE TRUE
          </span>
        </div>
      </div>

      {/* 2. Automated Dew-Point Alert Toast when Probability exceeds 60% */}
      {dewProbability >= 60 && showDewToast && (
        <div className="rounded-2xl border border-amber-500/50 bg-gradient-to-r from-amber-950/90 via-slate-900 to-amber-950/80 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xl shadow-amber-950/40 animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="flex items-start sm:items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-amber-500/20 border border-amber-500/50 flex items-center justify-center shrink-0">
              <AlertTriangle className="h-5 w-5 text-amber-400 animate-bounce" />
            </div>
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-black uppercase text-amber-300 tracking-wider">
                  HIGH DEW-POINT ALERT ({dewProbability}% PROBABILITY)
                </span>
                <span className="bg-amber-500 text-slate-950 text-[10px] font-mono font-black px-1.5 py-0.5 rounded">
                  CRITICAL
                </span>
              </div>
              <p className="text-xs text-slate-200 font-sans">
                Ambient temp ({ambientTemp}°C) is close to Dew Point ({dewPointTemp}°C). Expect severe ball wetness after 20:00. Finger spin grip drops by up to 45%; chasing side gains +14% statistical win advantage.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto font-mono text-xs">
            <button
              onClick={() => {
                setShowDewToast(false);
                cricketAudio.playBatHit();
                triggerHaptic(HAPTIC_PATTERNS.TAP);
              }}
              className="px-3 py-1.5 rounded-xl border border-slate-700 bg-slate-800 text-slate-300 hover:text-white transition-colors cursor-pointer"
            >
              Acknowledge
            </button>
          </div>
        </div>
      )}

      {/* 3. Interactive Day of Match Slider (1 to 5) */}
      <div className="rounded-2xl border border-cyan-500/30 bg-[#030c26]/90 p-5 space-y-4 shadow-lg">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-cyan-500/15 pb-3">
          <div className="flex items-center gap-2">
            <Sliders className="h-4 w-4 text-cyan-400" />
            <span className="text-xs font-mono font-bold text-white uppercase tracking-wider">
              INTERACTIVE MATCH PROGRESSION: DAY {matchDay}
            </span>
          </div>
          <span className="text-xs font-mono font-bold text-cyan-300">
            {dayTelemetry.title}
          </span>
        </div>

        {/* The 5-Day Slider */}
        <div className="space-y-2">
          <input
            type="range"
            min="1"
            max="5"
            step="1"
            value={matchDay}
            onChange={(e) => {
              setMatchDay(parseInt(e.target.value));
              cricketAudio.playUiClick();
              triggerHaptic(HAPTIC_PATTERNS.TAP);
            }}
            className="w-full accent-cyan-400 cursor-pointer h-2 bg-slate-800 rounded-lg"
          />

          <div className="grid grid-cols-5 text-center text-xs font-mono">
            {[1, 2, 3, 4, 5].map((d) => (
              <button
                key={d}
                onClick={() => {
                  setMatchDay(d);
                  cricketAudio.playUiClick();
                  triggerHaptic(HAPTIC_PATTERNS.TAP);
                }}
                className={`py-1 rounded-lg transition-all cursor-pointer ${
                  matchDay === d
                    ? 'text-cyan-300 font-bold bg-cyan-950/60 border border-cyan-500/40'
                    : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                <span>Day {d}</span>
                <span className="block text-[9px] opacity-75">
                  {d === 1 ? 'Pristine' : d === 2 ? 'Settled' : d === 3 ? 'Abrasive' : d === 4 ? 'Cracked' : 'Minefield'}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Dynamic Day Telemetry Matrix */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs font-mono pt-2">
          <div className="rounded-xl border border-slate-800 bg-slate-950/80 p-3">
            <span className="text-slate-400 block text-[10px]">SURFACE FRICTION INDEX</span>
            <strong className="text-white text-base font-bold">{dayTelemetry.friction} µ</strong>
            <span className="text-[10px] text-cyan-400 block mt-0.5">
              {matchDay <= 2 ? 'Low Skid & Slide' : 'High Grip & Deviation'}
            </span>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-950/80 p-3">
            <span className="text-slate-400 block text-[10px]">BOUNCE CONSISTENCY</span>
            <strong className="text-emerald-400 text-base font-bold">{dayTelemetry.bounceConsistency}%</strong>
            <span className="text-[10px] text-slate-400 block mt-0.5">
              {matchDay <= 2 ? 'Head-High True Carry' : 'Variable Knee-Roll'}
            </span>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-950/80 p-3">
            <span className="text-slate-400 block text-[10px]">SPIN TURNING MULTIPLIER</span>
            <strong className="text-amber-400 text-base font-bold">{dayTelemetry.spinCoefficient}x</strong>
            <span className="text-[10px] text-amber-300 block mt-0.5">
              +{(dayTelemetry.spinCoefficient * 1.8).toFixed(1)}° Turn from Footmarks
            </span>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-950/80 p-3">
            <span className="text-slate-400 block text-[10px]">OVERALL SURFACE WEAR</span>
            <strong className="text-rose-400 text-base font-bold">{dayTelemetry.wearPercentage}%</strong>
            <div className="h-1.5 w-full bg-slate-900 rounded-full overflow-hidden mt-1.5">
              <div
                className="h-full bg-gradient-to-r from-emerald-500 via-amber-500 to-rose-500 transition-all duration-300"
                style={{ width: `${dayTelemetry.wearPercentage}%` }}
              />
            </div>
          </div>
        </div>

        <p className="text-xs text-slate-300 font-sans bg-slate-950/60 p-3 rounded-xl border border-slate-800/80">
          <strong className="text-cyan-300 font-mono">Curator Tactic: </strong>
          {dayTelemetry.recommendation}
        </p>
      </div>

      {/* 4. Dual Columns: 48-Hour Forecast Table/Curve + 3D Stadium Radar */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: 48-Hour Statistical Projection */}
        <div className="lg:col-span-7 rounded-2xl border border-cyan-500/25 bg-[#020b22] p-5 space-y-4 shadow-xl">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div>
              <span className="text-xs font-mono font-bold text-cyan-400 uppercase tracking-wider flex items-center gap-1.5">
                <TrendingDown className="h-4 w-4" />
                <span>48-HOUR FRICTION & BOUNCE PROJECTION</span>
              </span>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Statistical projection based on ambient temperature ({ambientTemp}°C) and humidity ({relativeHumidity}% RH).
              </p>
            </div>

            <button
              onClick={() => {
                setMatchDay(1);
                cricketAudio.playUiClick();
              }}
              className="p-1.5 rounded-lg border border-slate-800 bg-slate-900 text-slate-400 hover:text-white"
              title="Reset Forecast"
            >
              <RotateCcw className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Environmental Climate Knobs */}
          <div className="grid grid-cols-3 gap-3 text-xs font-mono">
            <div className="rounded-xl border border-slate-800/80 bg-slate-950/80 p-2.5 space-y-1">
              <div className="flex justify-between">
                <span className="text-slate-400 text-[10px]">TEMP</span>
                <span className="text-rose-400 font-bold">{ambientTemp}°C</span>
              </div>
              <input
                type="range"
                min="18"
                max="42"
                value={ambientTemp}
                onChange={(e) => setAmbientTemp(parseInt(e.target.value))}
                className="w-full accent-rose-400 cursor-pointer h-1 bg-slate-800"
              />
            </div>

            <div className="rounded-xl border border-slate-800/80 bg-slate-950/80 p-2.5 space-y-1">
              <div className="flex justify-between">
                <span className="text-slate-400 text-[10px]">HUMIDITY</span>
                <span className="text-cyan-400 font-bold">{relativeHumidity}%</span>
              </div>
              <input
                type="range"
                min="20"
                max="95"
                value={relativeHumidity}
                onChange={(e) => setRelativeHumidity(parseInt(e.target.value))}
                className="w-full accent-cyan-400 cursor-pointer h-1 bg-slate-800"
              />
            </div>

            <div className="rounded-xl border border-slate-800/80 bg-slate-950/80 p-2.5 space-y-1">
              <div className="flex justify-between">
                <span className="text-slate-400 text-[10px]">SUNLIGHT</span>
                <span className="text-amber-400 font-bold">{directSunHours}h</span>
              </div>
              <input
                type="range"
                min="2"
                max="12"
                step="0.5"
                value={directSunHours}
                onChange={(e) => setDirectSunHours(parseFloat(e.target.value))}
                className="w-full accent-amber-400 cursor-pointer h-1 bg-slate-800"
              />
            </div>
          </div>

          {/* Time Steps Table & Degradation Bars */}
          <div className="space-y-2 pt-1 font-mono text-xs">
            <div className="grid grid-cols-9 text-center text-[10px] text-slate-500 font-bold border-b border-slate-800/60 pb-1">
              {projection48h.map((p, idx) => (
                <div key={idx}>{p.hourLabel}</div>
              ))}
            </div>

            {/* Friction Row */}
            <div className="space-y-1">
              <span className="text-[10px] text-cyan-400 font-bold">Surface Friction Index (µ):</span>
              <div className="grid grid-cols-9 gap-1 text-center">
                {projection48h.map((p, idx) => (
                  <div key={idx} className="bg-slate-900/80 border border-cyan-500/20 rounded py-1 px-0.5">
                    <span className="text-white font-bold text-[11px]">{p.friction}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Bounce Consistency Row */}
            <div className="space-y-1 pt-1">
              <span className="text-[10px] text-emerald-400 font-bold">Bounce Consistency (%):</span>
              <div className="grid grid-cols-9 gap-1 text-center">
                {projection48h.map((p, idx) => (
                  <div key={idx} className="bg-slate-900/80 border border-emerald-500/20 rounded py-1 px-0.5">
                    <span className="text-emerald-300 font-bold text-[11px]">{p.bounce}%</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Right: 3D Stadium Radar Boundary & Wind Vectors Component */}
        <div className="lg:col-span-5 rounded-2xl border border-cyan-500/25 bg-[#020b22] p-5 space-y-4 shadow-xl">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div>
              <span className="text-xs font-mono font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                <Compass className="h-4 w-4" />
                <span>3D STADIUM BOUNDARY RADAR</span>
              </span>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Live wind vector telemetry ({windSpeed} km/h NW) & boundary limits.
              </p>
            </div>
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
          </div>

          {/* Canvas Rendering */}
          <div className="relative w-full aspect-square max-w-[280px] mx-auto rounded-2xl overflow-hidden border border-cyan-500/30 shadow-inner">
            <canvas
              ref={canvasRef}
              width={280}
              height={280}
              className="w-full h-full block"
            />
          </div>

          <div className="grid grid-cols-2 gap-2 text-[11px] font-mono">
            <div className="rounded-xl border border-slate-800 bg-slate-950 p-2.5">
              <span className="text-slate-400 block text-[9px]">AERODYNAMIC ASSIST</span>
              <strong className="text-sky-400 text-xs">+{Math.round((windSpeed / 20) * 6)}m Carry to Fine Leg</strong>
            </div>
            <div className="rounded-xl border border-slate-800 bg-slate-950 p-2.5">
              <span className="text-slate-400 block text-[9px]">WIND VECTOR</span>
              <strong className="text-amber-400 text-xs">{windSpeed} KM/H NW Crosswind</strong>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
