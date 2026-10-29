import React, { useState, useEffect, useRef, useMemo } from 'react';
import { BallEvent } from '../../types/cricket';
import { cricketAudio } from '../../utils/audioSystem';
import { audioManager } from '../../services/AudioManager';
import {
  Play,
  Pause,
  RotateCcw,
  Activity,
  Target,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  Flame,
  Volume2,
  VolumeX,
  Gauge,
  Sliders,
  ChevronDown,
} from 'lucide-react';

export interface DeliveryPreset {
  id: string;
  name: string;
  bowlerType: 'Fast Seam' | 'In-Swing' | 'Out-Seam' | 'Leg-Spin' | 'Off-Break';
  speedKmh: number;
  seamDeviation: number; // degrees
  bounceHeightMeters: number;
  pitchX: number; // 0-400 coordinate
  pitchY: number;
  impactX: number;
  impactY: number;
  targetStumpX: number; // 200 = middle, 192 = off, 208 = leg, <185 or >215 = missing
  pitchingLine: 'IN LINE' | 'OUTSIDE OFF' | 'OUTSIDE LEG';
  impactLine: 'IN LINE' | 'OUTSIDE OFF';
  wicketsOutcome: 'HITTING' | 'MISSING (OFF)' | 'MISSING (HEIGHT)' | 'CLIPPING BAIL';
  isEdge: boolean;
  isOut: boolean;
  description: string;
}

export const DELIVERY_PRESETS: DeliveryPreset[] = [
  {
    id: 'in_swing_yorker',
    name: '148.4 KM/H · Lethal In-Swinging Yorker',
    bowlerType: 'Fast Seam',
    speedKmh: 148.4,
    seamDeviation: -2.4,
    bounceHeightMeters: 0.22,
    pitchX: 198,
    pitchY: 130, // very full length
    impactX: 199,
    impactY: 82,
    targetStumpX: 200, // dead center middle stump
    pitchingLine: 'IN LINE',
    impactLine: 'IN LINE',
    wicketsOutcome: 'HITTING',
    isEdge: false,
    isOut: true,
    description: 'Rapid late inswing curling underneath the bat toe right into middle and leg base.',
  },
  {
    id: 'snicko_feather_edge',
    name: '139.2 KM/H · 4th-Stump Seamer (Feather Edge)',
    bowlerType: 'Out-Seam',
    speedKmh: 139.2,
    seamDeviation: +1.8,
    bounceHeightMeters: 0.65,
    pitchX: 204,
    pitchY: 165,
    impactX: 212,
    impactY: 96,
    targetStumpX: 226,
    pitchingLine: 'IN LINE',
    impactLine: 'OUTSIDE OFF',
    wicketsOutcome: 'MISSING (OFF)',
    isEdge: true,
    isOut: true,
    description: 'Nips away off the seam to kiss the outside edge through to the wicketkeeper gloves.',
  },
  {
    id: 'good_length_indipper',
    name: '142.6 KM/H · Good Length Nip-Backer (LBW)',
    bowlerType: 'In-Swing',
    speedKmh: 142.6,
    seamDeviation: -1.9,
    bounceHeightMeters: 0.58,
    pitchX: 202,
    pitchY: 160,
    impactX: 198,
    impactY: 94,
    targetStumpX: 194, // top of off
    pitchingLine: 'IN LINE',
    impactLine: 'IN LINE',
    wicketsOutcome: 'HITTING',
    isEdge: false,
    isOut: true,
    description: 'Pitches on 4th stump line and jagged back violently, striking the front kneeroll.',
  },
  {
    id: 'sharp_leg_break',
    name: '89.5 KM/H · Drift & Sharp Turn (Spin DRS)',
    bowlerType: 'Leg-Spin',
    speedKmh: 89.5,
    seamDeviation: +3.8,
    bounceHeightMeters: 0.72,
    pitchX: 194,
    pitchY: 155,
    impactX: 202,
    impactY: 92,
    targetStumpX: 218,
    pitchingLine: 'IN LINE',
    impactLine: 'IN LINE',
    wicketsOutcome: 'MISSING (OFF)',
    isEdge: false,
    isOut: false,
    description: 'Pitches middle and rips past the outside edge; tracking projects missing off-stump by 4.2cm.',
  },
  {
    id: 'throat_bouncer',
    name: '144.8 KM/H · Heavy Deck Throat Bouncer',
    bowlerType: 'Fast Seam',
    speedKmh: 144.8,
    seamDeviation: +0.4,
    bounceHeightMeters: 1.15,
    pitchX: 196,
    pitchY: 200, // short length
    impactX: 198,
    impactY: 95,
    targetStumpX: 200,
    pitchingLine: 'IN LINE',
    impactLine: 'IN LINE',
    wicketsOutcome: 'MISSING (HEIGHT)',
    isEdge: false,
    isOut: false,
    description: 'Pounded into the hard deck; trajectory sails comfortably 18cm over the bails.',
  },
];

interface DrsFieldTelemetryViewProps {
  appealType?: 'LBW' | 'CAUGHT BEHIND' | 'CAUGHT';
  strikerName?: string;
  bowlerName?: string;
  isOut?: boolean;
  deliverySpeed?: number;
  deliveryType?: string;
  ballEvent?: BallEvent | null;
  matchHistory?: BallEvent[];
  onFrameChange?: (frameIndex: number) => void;
  className?: string;
}

export const DrsFieldTelemetryView: React.FC<DrsFieldTelemetryViewProps> = ({
  appealType = 'LBW',
  strikerName = 'Batter',
  bowlerName = 'Bowler',
  isOut = true,
  deliverySpeed = 142.0,
  deliveryType = 'Good Length In-Swinger',
  ballEvent,
  matchHistory = [],
  onFrameChange,
  className = '',
}) => {
  // Preset or custom selection
  const [selectedPresetId, setSelectedPresetId] = useState<string>('good_length_indipper');
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);

  // Active delivery profile
  const activeDelivery = useMemo<DeliveryPreset>(() => {
    // If user explicitly picked a preset
    const preset = DELIVERY_PRESETS.find((p) => p.id === selectedPresetId);
    if (preset) return preset;

    // Fallback to computed from ballEvent
    const speed = ballEvent?.speedKmh || deliverySpeed;
    const isWkt = ballEvent ? ballEvent.isWicket : isOut;
    const isEdge = (ballEvent?.shot || '').toLowerCase().includes('edge') || appealType.includes('CAUGHT');

    return {
      id: 'dynamic_ball',
      name: `${speed.toFixed(1)} KM/H · ${ballEvent?.deliveryType || deliveryType}`,
      bowlerType: speed > 130 ? 'Fast Seam' : 'Leg-Spin',
      speedKmh: speed,
      seamDeviation: isEdge ? 1.8 : isWkt ? -1.9 : -0.4,
      bounceHeightMeters: 0.65,
      pitchX: 198,
      pitchY: 160,
      impactX: isEdge ? 210 : 198,
      impactY: 95,
      targetStumpX: isWkt ? 199 : 222,
      pitchingLine: 'IN LINE',
      impactLine: isEdge ? 'OUTSIDE OFF' : 'IN LINE',
      wicketsOutcome: isWkt ? 'HITTING' : 'MISSING (OFF)',
      isEdge,
      isOut: isWkt,
      description: 'Telemetry calculated dynamically from ball event data.',
    };
  }, [selectedPresetId, ballEvent, deliverySpeed, deliveryType, appealType, isOut]);

  // 60 total frames in replay loop (0: Release -> 26: Bounce -> 40: Impact -> 60: Stumps)
  const TOTAL_FRAMES = 60;
  const BOUNCE_FRAME = 26;
  const IMPACT_FRAME = 40;

  const [currentFrame, setCurrentFrame] = useState<number>(IMPACT_FRAME);
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(0.5);
  const [cameraAngle, setCameraAngle] = useState<'3d_pitch' | 'side_hawkeye' | 'stump_cam' | 'overhead'>('3d_pitch');

  const animationTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastSoundFrameRef = useRef<number>(-1);

  // Sound triggers on frame crossing
  useEffect(() => {
    if (!soundEnabled) return;

    if (currentFrame === BOUNCE_FRAME && lastSoundFrameRef.current !== BOUNCE_FRAME) {
      cricketAudio.playBatHit();
      lastSoundFrameRef.current = BOUNCE_FRAME;
    } else if (currentFrame === IMPACT_FRAME && lastSoundFrameRef.current !== IMPACT_FRAME) {
      if (activeDelivery.isEdge) {
        audioManager.playDrsUltraEdgeSpike(true);
      } else {
        cricketAudio.playBatHit();
      }
      lastSoundFrameRef.current = IMPACT_FRAME;
    } else if (currentFrame === TOTAL_FRAMES && lastSoundFrameRef.current !== TOTAL_FRAMES) {
      if (activeDelivery.wicketsOutcome === 'HITTING') {
        cricketAudio.playWicket();
      }
      lastSoundFrameRef.current = TOTAL_FRAMES;
    }
  }, [currentFrame, soundEnabled, activeDelivery]);

  // Automatic playback ticker
  useEffect(() => {
    if (!isPlaying) {
      if (animationTimerRef.current) clearInterval(animationTimerRef.current);
      return;
    }

    const intervalMs = Math.round(33 / playbackSpeed);
    animationTimerRef.current = setInterval(() => {
      setCurrentFrame((prev) => {
        const next = (prev + 1) % (TOTAL_FRAMES + 1);
        if (onFrameChange) onFrameChange(next);
        return next;
      });
    }, intervalMs);

    return () => {
      if (animationTimerRef.current) clearInterval(animationTimerRef.current);
    };
  }, [isPlaying, playbackSpeed, onFrameChange]);

  const handleFrameSeek = (frame: number) => {
    setIsPlaying(false);
    setCurrentFrame(frame);
    if (onFrameChange) onFrameChange(frame);
  };

  // Interpolated ball coordinates
  const t = currentFrame / TOTAL_FRAMES;
  const { pitchX, pitchY, impactX, impactY, targetStumpX, wicketsOutcome, bounceHeightMeters } = activeDelivery;
  const isHitting = wicketsOutcome === 'HITTING';

  let ballX = 200;
  let ballY = 280;
  let ballSize = 8;
  let ballElevation = 0;

  if (t <= 0.43) {
    const subT = t / 0.43;
    ballX = 200 + (pitchX - 200) * subT;
    ballY = 280 - (280 - pitchY) * subT;
    ballSize = 14 - 4 * subT;
    ballElevation = Math.sin(subT * Math.PI) * (20 + bounceHeightMeters * 8);
  } else if (t <= 0.67) {
    const subT = (t - 0.43) / 0.24;
    ballX = pitchX + (impactX - pitchX) * subT;
    ballY = pitchY - (pitchY - impactY) * subT;
    ballSize = 10 - 2 * subT;
    ballElevation = Math.sin((subT * Math.PI) / 2) * (26 * bounceHeightMeters);
  } else {
    const subT = (t - 0.67) / 0.33;
    ballX = impactX + (targetStumpX - impactX) * subT;
    ballY = impactY - (impactY - 40) * subT;
    ballSize = 8 - 2 * subT;
    const finalElevation = wicketsOutcome === 'MISSING (HEIGHT)' ? 48 : isHitting ? 16 : 22;
    ballElevation = 22 + (finalElevation - 22) * subT;
  }

  // UltraEdge waveform state
  const isNearImpact = Math.abs(currentFrame - IMPACT_FRAME) <= 3;
  const isBounceFrameActive = Math.abs(currentFrame - BOUNCE_FRAME) <= 2;
  const isWicketsHitActive = currentFrame >= 57 && isHitting;

  return (
    <div
      className={`relative rounded-3xl border border-cyan-500/40 bg-gradient-to-b from-[#020717] via-[#041029] to-[#010512] p-4 sm:p-6 shadow-[0_0_60px_rgba(6,182,212,0.25)] text-slate-100 overflow-hidden ${className}`}
    >
      {/* Background Stadium Glow Accents */}
      <div className="absolute top-0 right-0 w-80 h-80 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-80 h-80 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* Top Broadcast Telemetry Bar */}
      <div className="relative z-10 flex flex-wrap items-center justify-between gap-3 border-b border-cyan-500/20 pb-4 mb-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-cyan-500/20 border border-cyan-400 text-cyan-300 shadow-md shadow-cyan-500/20">
            <Target className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono font-black uppercase tracking-widest text-cyan-400">
                HAWK-EYE 3D BROADCAST TELEMETRY ENGINE v5.0
              </span>
              <span className="rounded bg-rose-500/20 border border-rose-500/40 px-2 py-0.5 text-[9px] font-mono font-bold text-rose-300 animate-pulse">
                FRAME SYNC · 300 FPS HIGH-SPEED
              </span>
            </div>
            <h3 className="text-sm sm:text-base font-black text-white tracking-wide">
              {activeDelivery.isEdge ? 'ULTRAEDGE ACOUSTIC & TRAJECTORY REVIEW' : '3D BALL TRACKING & STUMP PROJECTOR'}
            </h3>
          </div>
        </div>

        {/* Camera Perspective Selector & Audio Toggle */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className={`p-1.5 rounded-xl border text-xs transition-colors cursor-pointer ${
              soundEnabled
                ? 'border-cyan-500/50 bg-cyan-500/15 text-cyan-300'
                : 'border-slate-800 bg-slate-900 text-slate-500'
            }`}
            title={soundEnabled ? 'Mute DRS Sound' : 'Enable DRS Sound'}
          >
            {soundEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
          </button>

          <div className="flex items-center gap-1 bg-slate-950/90 p-1 rounded-xl border border-slate-800 text-xs font-mono">
            <button
              onClick={() => setCameraAngle('3d_pitch')}
              className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                cameraAngle === '3d_pitch'
                  ? 'bg-cyan-500 text-slate-950 font-bold shadow-md shadow-cyan-500/30'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              🏟️ 3D Pitch
            </button>
            <button
              onClick={() => setCameraAngle('side_hawkeye')}
              className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                cameraAngle === 'side_hawkeye'
                  ? 'bg-cyan-500 text-slate-950 font-bold shadow-md shadow-cyan-500/30'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              📐 Side Arc
            </button>
            <button
              onClick={() => setCameraAngle('stump_cam')}
              className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                cameraAngle === 'stump_cam'
                  ? 'bg-cyan-500 text-slate-950 font-bold shadow-md shadow-cyan-500/30'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              🎯 Stump Cam
            </button>
            <button
              onClick={() => setCameraAngle('overhead')}
              className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                cameraAngle === 'overhead'
                  ? 'bg-cyan-500 text-slate-950 font-bold shadow-md shadow-cyan-500/30'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              🛰️ Overhead
            </button>
          </div>
        </div>
      </div>

      {/* Delivery Variation Selector (Presets & Match Deliveries) */}
      <div className="relative z-10 mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-800 bg-slate-950/70 p-3">
        <div className="flex items-center gap-2 text-xs font-mono">
          <Sliders className="h-3.5 w-3.5 text-cyan-400" />
          <span className="text-slate-400">Delivery Scenario:</span>
        </div>

        <div className="flex-1 max-w-md">
          <select
            value={selectedPresetId}
            onChange={(e) => {
              setSelectedPresetId(e.target.value);
              setCurrentFrame(IMPACT_FRAME);
              cricketAudio.playBatHit();
            }}
            className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs font-mono font-bold text-white focus:border-cyan-400 focus:outline-none cursor-pointer"
          >
            {DELIVERY_PRESETS.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>

        <p className="text-[11px] font-mono text-cyan-400 max-w-xs truncate">
          {activeDelivery.description}
        </p>
      </div>

      {/* Main Visualizer Canvas / SVG Area */}
      <div className="relative mx-auto w-full max-w-3xl h-84 rounded-2xl border border-cyan-500/30 bg-[#020714] overflow-hidden shadow-inner flex items-center justify-center">
        {/* Subtle Calibration Grid & Laser Lines */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#06b6d408_1px,transparent_1px),linear-gradient(to_bottom,#06b6d408_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none" />

        {/* 1. CAMERA PERSPECTIVE: 3D PITCH VIEW */}
        {cameraAngle === '3d_pitch' && (
          <svg viewBox="0 0 400 320" className="w-full h-full">
            <defs>
              <linearGradient id="pitchGrad" x1="0" y1="1" x2="0" y2="0">
                <stop offset="0%" stopColor="#8d6e63" stopOpacity="0.45" />
                <stop offset="50%" stopColor="#a1887f" stopOpacity="0.55" />
                <stop offset="100%" stopColor="#6d4c41" stopOpacity="0.35" />
              </linearGradient>
              <linearGradient id="laserBeamGrad" x1="0" y1="1" x2="0" y2="0">
                <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.8" />
                <stop offset="50%" stopColor="#38bdf8" stopOpacity="0.85" />
                <stop offset="100%" stopColor={isHitting ? '#f43f5e' : '#10b981'} stopOpacity="0.95" />
              </linearGradient>
            </defs>

            {/* Infield Grass Surface */}
            <polygon points="10,315 390,315 320,15 80,15" fill="#042116" stroke="#065f46" strokeWidth="1" opacity="0.6" />

            {/* Cricket Pitch Strip (Perspectived) */}
            <polygon points="140,305 260,305 224,35 176,35" fill="url(#pitchGrad)" stroke="#06b6d4" strokeWidth="1.2" opacity="0.85" />

            {/* Bowling Crease (Near end) */}
            <line x1="130" y1="280" x2="270" y2="280" stroke="#ffffff" strokeWidth="1.5" opacity="0.75" />
            <text x="275" y="283" fill="#94a3b8" fontSize="8" fontFamily="monospace">BOWLER CREASE</text>

            {/* Popping Crease (Far Batting end) */}
            <line x1="165" y1="80" x2="235" y2="80" stroke="#ffffff" strokeWidth="1.5" opacity="0.8" />
            <text x="240" y="83" fill="#94a3b8" fontSize="8" fontFamily="monospace">POPPING CREASE</text>

            {/* 3 Stumps at Batting End (With Zing LED flash on wicket hit) */}
            <g transform="translate(192, 35)">
              <rect x="0" y="0" width="3.5" height="25" fill={isWicketsHitActive ? '#ef4444' : '#f59e0b'} rx="1" className={isWicketsHitActive ? 'animate-pulse' : ''} />
              <rect x="6.5" y="0" width="3.5" height="25" fill={isWicketsHitActive ? '#ef4444' : '#f59e0b'} rx="1" className={isWicketsHitActive ? 'animate-pulse' : ''} />
              <rect x="13" y="0" width="3.5" height="25" fill={isWicketsHitActive ? '#ef4444' : '#f59e0b'} rx="1" className={isWicketsHitActive ? 'animate-pulse' : ''} />
              {/* Bails: Fly if wicket hit */}
              <rect
                x="-1"
                y={isWicketsHitActive ? -14 : -3}
                width="18"
                height="2.5"
                fill={isWicketsHitActive ? '#fca5a5' : '#fcd34d'}
                rx="1"
                transform={isWicketsHitActive ? 'rotate(-18 8 -10)' : ''}
                className="transition-all duration-300"
              />
            </g>

            {/* Pitch Bounce Marker Circle & Dust Puff */}
            <ellipse cx={pitchX} cy={pitchY} rx="10" ry="4.5" fill="#06b6d4" fillOpacity="0.45" stroke="#22d3ee" strokeWidth="1.5" />
            <text x={pitchX + 14} y={pitchY + 3} fill="#22d3ee" fontSize="8" fontFamily="monospace">
              PITCH: {activeDelivery.pitchingLine}
            </text>

            {isBounceFrameActive && (
              <g transform={`translate(${pitchX}, ${pitchY})`}>
                <circle cx="0" cy="0" r="14" fill="#a1887f" fillOpacity="0.5" className="animate-ping" />
                <circle cx="3" cy="-2" r="6" fill="#8d6e63" fillOpacity="0.7" />
              </g>
            )}

            {/* Pad/Bat Impact Marker Zone */}
            <ellipse
              cx={impactX}
              cy={impactY}
              rx="11"
              ry="5"
              fill={activeDelivery.isEdge ? '#f43f5e' : '#06b6d4'}
              fillOpacity="0.45"
              stroke={activeDelivery.isEdge ? '#fb7185' : '#38bdf8'}
              strokeWidth="1.5"
            />
            <text x={impactX + 14} y={impactY + 3} fill={activeDelivery.isEdge ? '#fb7185' : '#38bdf8'} fontSize="8" fontFamily="monospace">
              {activeDelivery.isEdge ? 'OUTSIDE EDGE NICK' : `IMPACT: ${activeDelivery.impactLine}`}
            </text>

            {/* Projected Laser Trajectory Path */}
            <path
              d={`M 200,280 Q ${(200 + pitchX) / 2},${(280 + pitchY) / 2} ${pitchX},${pitchY} T ${impactX},${impactY} Q ${(impactX + targetStumpX) / 2},${(impactY + 40) / 2} ${targetStumpX},40`}
              fill="none"
              stroke="url(#laserBeamGrad)"
              strokeWidth="3"
              strokeDasharray={t > 0.67 ? '' : '4 3'}
              opacity="0.8"
            />

            {/* Shadow of current ball on pitch */}
            <ellipse cx={ballX} cy={ballY} rx={ballSize * 0.8} ry={ballSize * 0.35} fill="#000000" fillOpacity="0.65" />

            {/* Ball Current Position (with altitude elevation) */}
            <g transform={`translate(${ballX}, ${ballY - ballElevation})`}>
              <circle cx="0" cy="0" r={ballSize} fill="#ef4444" stroke="#ffffff" strokeWidth="1" filter="drop-shadow(0 0 10px rgba(239, 68, 68, 0.9))" />
              <circle cx="-2" cy="-2" r={ballSize * 0.35} fill="#ffffff" fillOpacity="0.6" />
            </g>

            {/* Target Reticle around ball */}
            <g transform={`translate(${ballX}, ${ballY - ballElevation})`}>
              <circle cx="0" cy="0" r={ballSize + 6} fill="none" stroke="#22d3ee" strokeWidth="1" strokeDasharray="3 3" opacity="0.85" />
            </g>
          </svg>
        )}

        {/* 2. CAMERA PERSPECTIVE: SIDE HAWKEYE ARC */}
        {cameraAngle === 'side_hawkeye' && (
          <svg viewBox="0 0 400 320" className="w-full h-full">
            {/* Pitch baseline */}
            <line x1="20" y1="240" x2="380" y2="240" stroke="#06b6d4" strokeWidth="2" />
            <text x="30" y="258" fill="#64748b" fontSize="9" fontFamily="monospace">PITCH SURFACE (22 YARDS)</text>

            {/* Stumps profile at X = 340 */}
            <g transform="translate(340, 160)">
              <rect x="0" y="0" width="7" height="80" fill={isWicketsHitActive ? '#ef4444' : '#f59e0b'} rx="2" />
              <rect x="-2" y={isWicketsHitActive ? -14 : -4} width="11" height="4" fill="#fcd34d" rx="1" />
              <text x="-16" y="-8" fill="#fcd34d" fontSize="9" fontFamily="monospace">STUMPS (0.71M)</text>
            </g>

            {/* Batter position line at X = 300 */}
            <line x1="300" y1="120" x2="300" y2="240" stroke="#94a3b8" strokeWidth="1.5" strokeDasharray="3 3" />
            <text x="260" y="112" fill="#94a3b8" fontSize="8" fontFamily="monospace">BATTER IMPACT (2.14M)</text>

            {/* Ball trajectory arc */}
            <path
              d={`M 50,130 Q 140,160 200,240 T 300,${195 - bounceHeightMeters * 35} Q 320,${isHitting ? 180 : 135} 340,${isHitting ? 175 : 125}`}
              fill="none"
              stroke={isHitting ? '#f43f5e' : '#10b981'}
              strokeWidth="2.5"
            />

            {/* Trajectory points */}
            <circle cx="50" cy="130" r="4" fill="#38bdf8" />
            <circle cx="200" cy="240" r="5" fill="#f59e0b" />
            <circle cx="300" cy={195 - bounceHeightMeters * 35} r="5" fill={activeDelivery.isEdge ? '#f43f5e' : '#38bdf8'} />
            <circle cx="340" cy={isHitting ? 175 : 125} r="6" fill={isHitting ? '#ef4444' : '#10b981'} />

            {/* Frame calibrated ball marker */}
            <g transform={`translate(${50 + t * 290}, ${t <= 0.5 ? 130 + t * 220 : 240 - (t - 0.5) * 120 * bounceHeightMeters})`}>
              <circle cx="0" cy="0" r="7" fill="#ef4444" stroke="#ffffff" strokeWidth="1" filter="drop-shadow(0 0 6px red)" />
            </g>
          </svg>
        )}

        {/* 3. CAMERA PERSPECTIVE: STUMP CAM */}
        {cameraAngle === 'stump_cam' && (
          <svg viewBox="0 0 400 320" className="w-full h-full">
            <defs>
              <radialGradient id="stumpCamGlow" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.25" />
                <stop offset="100%" stopColor="#000000" stopOpacity="0" />
              </radialGradient>
            </defs>
            <rect width="400" height="320" fill="url(#stumpCamGlow)" />

            {/* Pitch Ground Line */}
            <line x1="50" y1="260" x2="350" y2="260" stroke="#64748b" strokeWidth="2" />

            {/* 3 Stumps (Off, Middle, Leg) */}
            <g transform="translate(155, 110)">
              {/* Off Stump */}
              <rect x="0" y="0" width="18" height="150" fill={isWicketsHitActive ? '#ef4444' : '#f59e0b'} stroke="#78350f" strokeWidth="1" rx="4" />
              {/* Middle Stump */}
              <rect x="34" y="0" width="18" height="150" fill={isWicketsHitActive ? '#ef4444' : '#f59e0b'} stroke="#78350f" strokeWidth="1" rx="4" />
              {/* Leg Stump */}
              <rect x="68" y="0" width="18" height="150" fill={isWicketsHitActive ? '#ef4444' : '#f59e0b'} stroke="#78350f" strokeWidth="1" rx="4" />

              {/* Bails */}
              <rect
                x="-4"
                y={isWicketsHitActive ? -25 : -8}
                width="42"
                height="8"
                fill={isWicketsHitActive ? '#fca5a5' : '#fcd34d'}
                rx="2"
                stroke="#b45309"
                transform={isWicketsHitActive ? 'rotate(-25 10 -20)' : ''}
              />
              <rect
                x="44"
                y={isWicketsHitActive ? -25 : -8}
                width="42"
                height="8"
                fill={isWicketsHitActive ? '#fca5a5' : '#fcd34d'}
                rx="2"
                stroke="#b45309"
                transform={isWicketsHitActive ? 'rotate(25 60 -20)' : ''}
              />
            </g>

            {/* Stumps Zone Target Bounding Box */}
            <rect x="145" y="96" width="106" height="164" fill="none" stroke="#22d3ee" strokeWidth="1.2" strokeDasharray="4 4" opacity="0.7" />
            <text x="150" y="88" fill="#22d3ee" fontSize="9" fontFamily="monospace">STUMP ZONE CALIBRATION</text>

            {/* Approaching Ball */}
            <g transform={`translate(${155 + (targetStumpX - 192) * 2.5 + 38}, ${110 + (isHitting ? 65 : 20)})`}>
              <circle cx="0" cy="0" r={Math.max(6, Math.round(t * 24))} fill="#ef4444" stroke="#ffffff" strokeWidth="2" filter="drop-shadow(0 0 14px red)" />
              {isHitting && (
                <text x="-28" y="38" fill="#f43f5e" fontSize="11" fontWeight="bold" fontFamily="monospace">
                  IMPACT: HITTING
                </text>
              )}
              {!isHitting && (
                <text x="-24" y="38" fill="#10b981" fontSize="11" fontWeight="bold" fontFamily="monospace">
                  {wicketsOutcome}
                </text>
              )}
            </g>
          </svg>
        )}

        {/* 4. CAMERA PERSPECTIVE: OVERHEAD 2D RADAR */}
        {cameraAngle === 'overhead' && (
          <svg viewBox="0 0 400 320" className="w-full h-full">
            <rect x="170" y="20" width="60" height="280" fill="#1e293b" stroke="#06b6d4" strokeWidth="1.5" rx="4" />

            {/* Crease lines */}
            <line x1="160" y1="260" x2="240" y2="260" stroke="#ffffff" strokeWidth="1.5" />
            <text x="245" y="264" fill="#64748b" fontSize="8" fontFamily="monospace">BOWLER</text>

            <line x1="160" y1="60" x2="240" y2="60" stroke="#ffffff" strokeWidth="1.5" />
            <text x="245" y="64" fill="#64748b" fontSize="8" fontFamily="monospace">BATTER</text>

            {/* 3 Stumps */}
            <line x1="188" y1="40" x2="212" y2="40" stroke="#f59e0b" strokeWidth="4" />

            {/* Deviation trajectory */}
            <path
              d={`M 200,260 L ${pitchX},170 Q ${pitchX + activeDelivery.seamDeviation * 7},100 ${targetStumpX},40`}
              fill="none"
              stroke={isHitting ? '#f43f5e' : '#10b981'}
              strokeWidth="2.5"
            />

            {/* Current ball indicator */}
            <circle
              cx={200 + (t >= 0.5 ? activeDelivery.seamDeviation * (t - 0.5) * 14 : 0)}
              cy={260 - t * 220}
              r="7"
              fill="#ef4444"
              stroke="#ffffff"
              strokeWidth="1"
            />
          </svg>
        )}

        {/* Floating Telemetry HUD Badges */}
        <div className="absolute top-3 left-3 flex flex-col gap-1.5 pointer-events-none font-mono text-[10px]">
          <div className="rounded-lg bg-slate-950/90 border border-cyan-500/40 px-2.5 py-1 text-cyan-300 shadow">
            BALL SPEED: <strong className="text-white text-xs font-bold">{activeDelivery.speedKmh.toFixed(1)} KM/H</strong>
          </div>
          <div className="rounded-lg bg-slate-950/90 border border-slate-700 px-2.5 py-1 text-slate-300 shadow">
            SEAM DEVIATION: <strong className="text-amber-400 font-bold">{activeDelivery.seamDeviation > 0 ? `+${activeDelivery.seamDeviation}°` : `${activeDelivery.seamDeviation}°`}</strong>
          </div>
          <div className="rounded-lg bg-slate-950/90 border border-slate-700 px-2.5 py-1 text-slate-300 shadow">
            BOUNCE HEIGHT: <strong className="text-emerald-400 font-bold">{activeDelivery.bounceHeightMeters.toFixed(2)}m</strong>
          </div>
        </div>

        {/* Frame index watermark */}
        <div className="absolute top-3 right-3 font-mono text-[10px] text-right pointer-events-none">
          <span className="text-slate-400 block">
            FRAME {currentFrame.toString().padStart(2, '0')} / {TOTAL_FRAMES}
          </span>
          <span className="text-cyan-400 font-bold block">{activeDelivery.bowlerType.toUpperCase()}</span>
        </div>
      </div>

      {/* Frame-by-Frame Scrubbing Controls & Playback Slider */}
      <div className="mt-4 rounded-2xl border border-slate-800 bg-slate-950/90 p-3 sm:p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className="flex items-center gap-1.5 rounded-xl bg-cyan-500 px-3 py-1.5 text-xs font-black text-slate-950 hover:bg-cyan-400 transition-all cursor-pointer shadow-md shadow-cyan-500/20"
            >
              {isPlaying ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5 fill-current" />}
              <span>{isPlaying ? 'PAUSE FRAME' : 'PLAY LOOP'}</span>
            </button>

            <button
              onClick={() => handleFrameSeek(0)}
              className="rounded-lg border border-slate-800 bg-slate-900 px-2.5 py-1.5 text-slate-400 hover:text-white transition-colors cursor-pointer"
              title="Reset to release"
            >
              <RotateCcw className="h-3 w-3" />
            </button>

            <div className="flex items-center gap-1 ml-2">
              <span className="text-[10px] text-slate-500">SPEED:</span>
              {[0.25, 0.5, 1.0].map((spd) => (
                <button
                  key={spd}
                  onClick={() => setPlaybackSpeed(spd)}
                  className={`rounded px-1.5 py-0.5 text-[10px] cursor-pointer ${
                    playbackSpeed === spd
                      ? 'bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/40'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {spd}x
                </button>
              ))}
            </div>
          </div>

          {/* Quick jump to key broadcast moments */}
          <div className="flex items-center gap-1 text-[11px]">
            <button
              onClick={() => handleFrameSeek(0)}
              className="rounded-lg bg-slate-900 border border-slate-800 px-2 py-1 text-slate-300 hover:text-white cursor-pointer"
            >
              Release (F0)
            </button>
            <button
              onClick={() => handleFrameSeek(BOUNCE_FRAME)}
              className="rounded-lg bg-slate-900 border border-slate-800 px-2 py-1 text-cyan-300 hover:text-white cursor-pointer"
            >
              Bounce (F{BOUNCE_FRAME})
            </button>
            <button
              onClick={() => handleFrameSeek(IMPACT_FRAME)}
              className="rounded-lg bg-cyan-950 border border-cyan-500/40 px-2 py-1 text-cyan-300 font-bold hover:text-white cursor-pointer"
            >
              Impact (F{IMPACT_FRAME})
            </button>
            <button
              onClick={() => handleFrameSeek(TOTAL_FRAMES)}
              className="rounded-lg bg-slate-900 border border-slate-800 px-2 py-1 text-slate-300 hover:text-white cursor-pointer"
            >
              Wickets (F{TOTAL_FRAMES})
            </button>
          </div>
        </div>

        {/* Range scrubbing slider with timeline markers */}
        <div className="relative pt-1 pb-1">
          <input
            type="range"
            min={0}
            max={TOTAL_FRAMES}
            value={currentFrame}
            onChange={(e) => handleFrameSeek(Number(e.target.value))}
            className="w-full h-2 rounded-lg bg-slate-800 accent-cyan-400 cursor-pointer"
          />

          <div className="flex justify-between text-[9px] font-mono text-slate-500 mt-1">
            <span>0: Hand Release</span>
            <span className="text-cyan-400 font-semibold">26: Pitch Bounce</span>
            <span className="text-rose-400 font-semibold">40: Bat/Pad Line</span>
            <span>60: Wickets / Keeper</span>
          </div>
        </div>
      </div>

      {/* Synchronized Protocol Cards */}
      <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* 1. Pitching */}
        <div className="rounded-xl border border-slate-800 bg-slate-950/80 p-3 space-y-1">
          <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 block font-bold">
            1. PITCHING
          </span>
          <div className="flex items-center gap-1.5 text-xs font-mono font-bold text-emerald-400">
            <CheckCircle2 className="h-3.5 w-3.5" />
            <span>{activeDelivery.pitchingLine}</span>
          </div>
          <p className="text-[10px] text-slate-500 font-mono">Pitched between stump lines</p>
        </div>

        {/* 2. Impact */}
        <div className="rounded-xl border border-slate-800 bg-slate-950/80 p-3 space-y-1">
          <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 block font-bold">
            2. IMPACT
          </span>
          <div className="flex items-center gap-1.5 text-xs font-mono font-bold text-emerald-400">
            <CheckCircle2 className="h-3.5 w-3.5" />
            <span>{activeDelivery.impactLine} (&lt; 3.0M)</span>
          </div>
          <p className="text-[10px] text-slate-500 font-mono">Impact distance: 2.14m from wickets</p>
        </div>

        {/* 3. Wickets Projection */}
        <div className="rounded-xl border border-slate-800 bg-slate-950/80 p-3 space-y-1">
          <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 block font-bold">
            3. WICKETS
          </span>
          <div
            className={`flex items-center gap-1.5 text-xs font-mono font-bold ${
              isHitting ? 'text-rose-400' : 'text-emerald-400'
            }`}
          >
            {isHitting ? <AlertTriangle className="h-3.5 w-3.5" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
            <span>{activeDelivery.wicketsOutcome}</span>
          </div>
          <p className="text-[10px] text-slate-500 font-mono">
            {isHitting
              ? 'Trajectory projected into middle stump timber'
              : `Ball passes ${activeDelivery.wicketsOutcome.toLowerCase()}`}
          </p>
        </div>
      </div>
    </div>
  );
};
