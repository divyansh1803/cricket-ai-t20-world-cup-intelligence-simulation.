import React, { useRef, useEffect, useState, useCallback } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  Volume2,
  VolumeX,
  ZoomIn,
  ZoomOut,
  Flame,
  Activity,
  ChevronLeft,
  ChevronRight,
  Eye,
  Shield,
  Zap,
} from 'lucide-react';
import { cricketAudio } from '../../utils/audioSystem';
import { audioManager } from '../../services/AudioManager';

export interface BroadcastUltraEdgeProps {
  isEdge: boolean;
  strikerName?: string;
  bowlerName?: string;
  appealType?: string;
  initialFrame?: number;
  onFrameScrub?: (frame: number) => void;
  className?: string;
}

export const BroadcastUltraEdgeCanvas: React.FC<BroadcastUltraEdgeProps> = ({
  isEdge = true,
  strikerName = 'Batter',
  bowlerName = 'Bowler',
  appealType = 'CAUGHT BEHIND',
  initialFrame = 40,
  onFrameScrub,
  className = '',
}) => {
  // Total frames in the high-speed recording: 0 to 80
  const TOTAL_FRAMES = 80;
  const IMPACT_FRAME = 40; // Frame where ball is adjacent to bat edge

  const [currentFrame, setCurrentFrame] = useState<number>(initialFrame);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isRockAndRoll, setIsRockAndRoll] = useState<boolean>(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(0.5);
  const [zoomLevel, setZoomLevel] = useState<number>(1.0); // 1.0, 1.5, 2.0
  const [showHotSpot, setShowHotSpot] = useState<boolean>(false);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);

  const waveformCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const highSpeedCameraCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const rockRollDirectionRef = useRef<number>(1);
  const animationFrameIdRef = useRef<number | null>(null);
  const lastSoundTriggerFrame = useRef<number>(-1);

  // Sound triggering on impact frame crossing
  useEffect(() => {
    if (!soundEnabled) return;
    if (Math.abs(currentFrame - IMPACT_FRAME) <= 1 && lastSoundTriggerFrame.current !== IMPACT_FRAME) {
      if (isEdge) {
        audioManager.playDrsUltraEdgeSpike(true);
      } else {
        cricketAudio.playBatHit();
      }
      lastSoundTriggerFrame.current = IMPACT_FRAME;
    } else if (Math.abs(currentFrame - IMPACT_FRAME) > 4) {
      lastSoundTriggerFrame.current = -1;
    }
  }, [currentFrame, soundEnabled, isEdge]);

  // Frame seek handler
  const seekFrame = useCallback(
    (frame: number) => {
      const clamped = Math.max(0, Math.min(TOTAL_FRAMES, Math.round(frame)));
      setCurrentFrame(clamped);
      if (onFrameScrub) onFrameScrub(clamped);
    },
    [onFrameScrub]
  );

  // Playback / Rock & Roll Animation Loop
  useEffect(() => {
    if (!isPlaying && !isRockAndRoll) {
      if (animationFrameIdRef.current) cancelAnimationFrame(animationFrameIdRef.current);
      return;
    }

    let lastTimestamp = performance.now();
    const frameIntervalMs = 33 / playbackSpeed; // ~30fps base

    const loop = (timestamp: number) => {
      const elapsed = timestamp - lastTimestamp;
      if (elapsed >= frameIntervalMs) {
        lastTimestamp = timestamp;

        setCurrentFrame((prev) => {
          let next = prev;
          if (isRockAndRoll) {
            // Rock and roll between frame 34 and 46
            const minRR = 34;
            const maxRR = 46;
            next = prev + rockRollDirectionRef.current;
            if (next >= maxRR) {
              next = maxRR;
              rockRollDirectionRef.current = -1;
            } else if (next <= minRR) {
              next = minRR;
              rockRollDirectionRef.current = 1;
            }
          } else {
            next = (prev + 1) % (TOTAL_FRAMES + 1);
          }

          if (onFrameScrub) onFrameScrub(next);
          return next;
        });
      }

      animationFrameIdRef.current = requestAnimationFrame(loop);
    };

    animationFrameIdRef.current = requestAnimationFrame(loop);
    return () => {
      if (animationFrameIdRef.current) cancelAnimationFrame(animationFrameIdRef.current);
    };
  }, [isPlaying, isRockAndRoll, playbackSpeed, onFrameScrub]);

  // -------------------------------------------------------------
  // CANVAS RENDERER 1: HIGH-SPEED CAMERA (BAT & BALL CONTACT)
  // -------------------------------------------------------------
  useEffect(() => {
    const canvas = highSpeedCameraCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    // Clear background
    ctx.fillStyle = showHotSpot ? '#0a0a0a' : '#030816';
    ctx.fillRect(0, 0, width, height);

    // Apply Zoom from Center
    ctx.save();
    ctx.translate(width / 2, height / 2);
    ctx.scale(zoomLevel, zoomLevel);
    ctx.translate(-width / 2, -height / 2);

    // Camera calibration crosshairs & grid
    ctx.strokeStyle = showHotSpot ? 'rgba(255,255,255,0.06)' : 'rgba(6,182,212,0.1)';
    ctx.lineWidth = 1;
    for (let x = 0; x < width; x += 40) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    for (let y = 0; y < height; y += 40) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    // Normalized progress across time (-1 at frame 0, 0 at impact, +1 at frame 80)
    const norm = (currentFrame - IMPACT_FRAME) / 40;

    // Bat Coordinates (Vertical willow bat angled slightly)
    const batCenterX = width * 0.44;
    const batTopY = height * 0.12;
    const batBottomY = height * 0.88;
    const batWidth = 28;

    // Draw Bat Handle & Blade
    ctx.save();
    // Handle
    ctx.fillStyle = showHotSpot ? '#1f2937' : '#f59e0b';
    ctx.fillRect(batCenterX - 4, batTopY - 45, 8, 45);
    // Grip rubber ridges
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1;
    for (let g = 0; g < 40; g += 5) {
      ctx.beginPath();
      ctx.moveTo(batCenterX - 4, batTopY - 45 + g);
      ctx.lineTo(batCenterX + 4, batTopY - 45 + g);
      ctx.stroke();
    }

    // Willow Blade (Gradient or Thermal HotSpot)
    if (showHotSpot) {
      // HotSpot Infrared mode: Deep matte gray bat
      ctx.fillStyle = '#262626';
      ctx.strokeStyle = '#525252';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(batCenterX - batWidth / 2, batTopY, batWidth, batBottomY - batTopY, 6);
      ctx.fill();
      ctx.stroke();

      // If Edge detected, draw thermal WHITE glowing heat bloom on the outside edge
      if (isEdge && currentFrame >= IMPACT_FRAME - 4) {
        const heatOpacity = Math.max(0, 1 - (currentFrame - IMPACT_FRAME) * 0.03);
        const grad = ctx.createRadialGradient(batCenterX + batWidth / 2 - 2, height * 0.52, 2, batCenterX + batWidth / 2 - 2, height * 0.52, 24);
        grad.addColorStop(0, `rgba(255, 255, 255, ${heatOpacity})`);
        grad.addColorStop(0.4, `rgba(255, 255, 255, ${heatOpacity * 0.8})`);
        grad.addColorStop(0.8, `rgba(244, 63, 94, ${heatOpacity * 0.4})`);
        grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(batCenterX + batWidth / 2 - 2, height * 0.52, 24, 0, Math.PI * 2);
        ctx.fill();
      }
    } else {
      // Broadcast UltraEdge standard mode: Rich wooden willow with branding
      const batGrad = ctx.createLinearGradient(batCenterX - batWidth / 2, 0, batCenterX + batWidth / 2, 0);
      batGrad.addColorStop(0, '#78350f');
      batGrad.addColorStop(0.4, '#d97706');
      batGrad.addColorStop(0.8, '#b45309');
      batGrad.addColorStop(1, '#451a03');

      ctx.fillStyle = batGrad;
      ctx.strokeStyle = '#06b6d4';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.roundRect(batCenterX - batWidth / 2, batTopY, batWidth, batBottomY - batTopY, 6);
      ctx.fill();
      ctx.stroke();

      // Bat face spine highlight
      ctx.strokeStyle = 'rgba(254, 243, 199, 0.4)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(batCenterX - 2, batTopY + 10);
      ctx.lineTo(batCenterX - 2, batBottomY - 10);
      ctx.stroke();
    }
    ctx.restore();

    // Ball Coordinates
    // Ball passes from top-right to bottom-right, closest at IMPACT_FRAME
    const ballRadius = 14;
    const closestDistX = isEdge ? batCenterX + batWidth / 2 + ballRadius : batCenterX + batWidth / 2 + ballRadius + 18;
    const ballStartX = closestDistX + 35;
    const ballEndX = closestDistX + (isEdge ? 28 : 55);

    // Interpolate ball position
    const ballX = norm <= 0 ? ballStartX - (ballStartX - closestDistX) * (1 + norm) : closestDistX + (ballEndX - closestDistX) * norm;
    const ballY = height * 0.52 + norm * (height * 0.38);

    // Ball Motion Trail (high-speed shutter blur)
    if (Math.abs(norm) < 0.8) {
      ctx.save();
      ctx.strokeStyle = showHotSpot ? 'rgba(255,255,255,0.15)' : 'rgba(239,68,68,0.25)';
      ctx.lineWidth = ballRadius * 1.8;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(ballX + norm * 8, ballY - norm * 24);
      ctx.lineTo(ballX, ballY);
      ctx.stroke();
      ctx.restore();
    }

    // Draw Cricket Ball
    ctx.save();
    if (showHotSpot) {
      // HotSpot mode: Inverted light gray ball
      ctx.fillStyle = '#e5e5e5';
      ctx.strokeStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(ballX, ballY, ballRadius, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    } else {
      // Standard Broadcast: Gloss red leather ball with white seam & reflection
      const ballGrad = ctx.createRadialGradient(ballX - 4, ballY - 4, 2, ballX, ballY, ballRadius);
      ballGrad.addColorStop(0, '#f87171');
      ballGrad.addColorStop(0.5, '#dc2626');
      ballGrad.addColorStop(1, '#7f1d1d');

      ctx.fillStyle = ballGrad;
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(ballX, ballY, ballRadius, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // White stitched seam
      ctx.save();
      ctx.translate(ballX, ballY);
      ctx.rotate(norm * 1.4);
      ctx.strokeStyle = '#fef08a';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(0, 0, ballRadius - 1, -Math.PI / 3, Math.PI / 3);
      ctx.stroke();
      ctx.restore();
    }
    ctx.restore();

    // Laser Distance Caliper & Edge Gap Marker
    const batEdgeX = batCenterX + batWidth / 2;
    const ballEdgeX = ballX - ballRadius;
    const currentGap = ballEdgeX - batEdgeX;

    // Draw measurement laser when within impact window
    if (Math.abs(currentFrame - IMPACT_FRAME) <= 6) {
      ctx.save();
      const isContact = isEdge && Math.abs(currentFrame - IMPACT_FRAME) <= 2;
      ctx.strokeStyle = isContact ? '#f43f5e' : '#10b981';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([2, 2]);

      // Horizontal measurement line between bat edge and ball edge
      ctx.beginPath();
      ctx.moveTo(batEdgeX, height * 0.52);
      ctx.lineTo(ballEdgeX, height * 0.52);
      ctx.stroke();

      // Laser end ticks
      ctx.setLineDash([]);
      ctx.beginPath();
      ctx.moveTo(batEdgeX, height * 0.52 - 6);
      ctx.lineTo(batEdgeX, height * 0.52 + 6);
      ctx.moveTo(ballEdgeX, height * 0.52 - 6);
      ctx.lineTo(ballEdgeX, height * 0.52 + 6);
      ctx.stroke();

      // Text label with millimeter gap
      ctx.fillStyle = isContact ? '#f43f5e' : '#10b981';
      ctx.font = 'bold 10px monospace';
      ctx.textAlign = 'center';
      if (isContact) {
        ctx.fillText('⚡ CONTACT DETECTED', (batEdgeX + ballEdgeX) / 2, height * 0.52 - 12);
      } else {
        const gapMm = Math.max(0.1, Number((currentGap / 4).toFixed(1)));
        ctx.fillText(`GAP: ${gapMm}mm`, (batEdgeX + ballEdgeX) / 2, height * 0.52 - 12);
      }
      ctx.restore();
    }

    ctx.restore(); // Restore Zoom

    // Broadcast Camera Overlays (Fixed non-zoomed HUD)
    ctx.fillStyle = 'rgba(2, 6, 23, 0.85)';
    ctx.strokeStyle = 'rgba(6, 182, 212, 0.4)';
    ctx.lineWidth = 1;

    // Camera Mode Badge (Top-Left)
    ctx.beginPath();
    ctx.roundRect(12, 12, 140, 24, 6);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#38bdf8';
    ctx.font = 'bold 9px monospace';
    ctx.textAlign = 'left';
    ctx.fillText('CAM 4: SLIP CRADLE (300 FPS)', 18, 28);

    // Frame Counter Watermark (Top-Right)
    ctx.beginPath();
    ctx.roundRect(width - 120, 12, 108, 24, 6);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = Math.abs(currentFrame - IMPACT_FRAME) <= 1 ? '#f43f5e' : '#94a3b8';
    ctx.font = 'bold 10px monospace';
    ctx.textAlign = 'right';
    ctx.fillText(`FR ${currentFrame.toString().padStart(2, '0')} / ${TOTAL_FRAMES}`, width - 20, 28);
  }, [currentFrame, isEdge, zoomLevel, showHotSpot]);

  // -------------------------------------------------------------
  // CANVAS RENDERER 2: ULTRAEDGE WAVEFORM OSCILLOGRAM
  // -------------------------------------------------------------
  useEffect(() => {
    const canvas = waveformCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const midY = height / 2;

    // Clear background
    ctx.fillStyle = '#020617';
    ctx.fillRect(0, 0, width, height);

    // Oscillogram grid
    ctx.strokeStyle = 'rgba(30, 41, 59, 0.8)';
    ctx.lineWidth = 1;
    for (let x = 0; x < width; x += 30) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    // Baseline
    ctx.strokeStyle = 'rgba(6, 182, 212, 0.25)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(0, midY);
    ctx.lineTo(width, midY);
    ctx.stroke();

    // Generate Audio Samples for the 80 frames
    // 0 to 80 frames mapped to 0 to width
    const points: { x: number; y: number }[] = [];
    const numSamples = 240;

    for (let i = 0; i <= numSamples; i++) {
      const x = (i / numSamples) * width;
      const frameAtPoint = (i / numSamples) * TOTAL_FRAMES;

      // Distance from impact frame (40)
      const distFromImpact = Math.abs(frameAtPoint - IMPACT_FRAME);

      // Base microphone white noise
      const noise = (Math.sin(i * 1.8) * Math.cos(i * 0.9) * 4) + (Math.sin(i * 4.2) * 2);

      let amplitude = noise;

      if (isEdge && distFromImpact <= 8) {
        // High frequency spike on contact
        const spikeDecay = Math.max(0, 1 - distFromImpact / 8);
        const highFreq = Math.sin(i * 12.5) * Math.cos(i * 7.2) * (height * 0.44) * spikeDecay;
        amplitude += highFreq;
      }

      points.push({ x, y: midY + amplitude });
    }

    // Draw Oscillogram Waveform Line
    ctx.save();
    ctx.strokeStyle = isEdge ? '#f43f5e' : '#10b981';
    ctx.lineWidth = 2;
    ctx.shadowColor = isEdge ? 'rgba(244, 63, 94, 0.6)' : 'rgba(16, 185, 129, 0.4)';
    ctx.shadowBlur = 8;

    ctx.beginPath();
    points.forEach((pt, idx) => {
      if (idx === 0) ctx.moveTo(pt.x, pt.y);
      else ctx.lineTo(pt.x, pt.y);
    });
    ctx.stroke();
    ctx.restore();

    // Vertical Playhead Marker (Synchronized with currentFrame)
    const playheadX = (currentFrame / TOTAL_FRAMES) * width;

    ctx.save();
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 2;
    ctx.shadowColor = '#06b6d4';
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.moveTo(playheadX, 0);
    ctx.lineTo(playheadX, height);
    ctx.stroke();

    // Top Playhead Diamond
    ctx.fillStyle = '#38bdf8';
    ctx.beginPath();
    ctx.moveTo(playheadX - 5, 0);
    ctx.lineTo(playheadX + 5, 0);
    ctx.lineTo(playheadX, 8);
    ctx.closePath();
    ctx.fill();

    // Impact Frame Reference Zone
    const impactX = (IMPACT_FRAME / TOTAL_FRAMES) * width;
    ctx.fillStyle = isEdge ? 'rgba(244, 63, 94, 0.12)' : 'rgba(16, 185, 129, 0.08)';
    ctx.fillRect(impactX - 16, 0, 32, height);

    ctx.strokeStyle = isEdge ? 'rgba(244, 63, 94, 0.4)' : 'rgba(16, 185, 129, 0.3)';
    ctx.lineWidth = 1;
    ctx.setLineDash([2, 2]);
    ctx.beginPath();
    ctx.moveTo(impactX, 0);
    ctx.lineTo(impactX, height);
    ctx.stroke();
    ctx.restore();

    // dB & Frequency Telemetry
    ctx.fillStyle = '#64748b';
    ctx.font = '9px monospace';
    ctx.textAlign = 'left';
    ctx.fillText('-18 dB STUMP MIC', 10, 16);

    ctx.textAlign = 'right';
    if (isEdge && Math.abs(currentFrame - IMPACT_FRAME) <= 3) {
      ctx.fillStyle = '#f43f5e';
      ctx.fillText('▲ SPIKE PEAK: 2.45 kHz (BAT CONTACT)', width - 10, 16);
    } else {
      ctx.fillStyle = '#10b981';
      ctx.fillText('FLATLINE (NO ACOUSTIC SPIKE)', width - 10, 16);
    }
  }, [currentFrame, isEdge]);

  return (
    <div
      className={`rounded-3xl border border-cyan-500/40 bg-gradient-to-b from-[#020716] via-[#040e26] to-[#010512] p-4 sm:p-6 space-y-4 shadow-[0_0_50px_rgba(6,182,212,0.2)] ${className}`}
    >
      {/* Broadcast Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-cyan-500/20 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-cyan-500/20 border border-cyan-400 text-cyan-300">
            <Activity className="h-4 w-4 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono font-black uppercase tracking-wider text-cyan-400">
                ULTRAEDGE ACOUSTIC SNICKOMETER
              </span>
              <span className="rounded bg-rose-500/20 border border-rose-500/40 px-1.5 py-0.2 text-[8px] font-mono font-bold text-rose-300">
                STUMP MIC 48 KHZ
              </span>
            </div>
            <p className="text-xs font-mono text-slate-300">
              {strikerName} vs {bowlerName} · <strong className="text-white">{appealType}</strong>
            </p>
          </div>
        </div>

        {/* View Controls: HotSpot Toggle, Zoom, Audio */}
        <div className="flex items-center gap-2">
          {/* HotSpot Infrared Toggle */}
          <button
            onClick={() => setShowHotSpot(!showHotSpot)}
            className={`flex items-center gap-1.5 rounded-xl px-2.5 py-1 text-xs font-mono font-bold transition-all cursor-pointer ${
              showHotSpot
                ? 'bg-rose-500 text-white shadow-md shadow-rose-500/30'
                : 'border border-slate-800 bg-slate-900 text-slate-400 hover:text-white'
            }`}
            title="Toggle Infrared Thermal HotSpot"
          >
            <Flame className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">HOTSPOT</span>
          </button>

          {/* Zoom Buttons */}
          <div className="flex items-center bg-slate-900 rounded-xl border border-slate-800 p-0.5">
            {[1.0, 1.5, 2.0].map((z) => (
              <button
                key={z}
                onClick={() => setZoomLevel(z)}
                className={`px-2 py-0.5 text-[10px] font-mono rounded-lg transition-colors cursor-pointer ${
                  zoomLevel === z ? 'bg-cyan-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
                }`}
              >
                {z}x
              </button>
            ))}
          </div>

          {/* Sound Toggle */}
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className={`p-1.5 rounded-xl border text-xs transition-colors cursor-pointer ${
              soundEnabled
                ? 'border-cyan-500/40 bg-cyan-500/15 text-cyan-300'
                : 'border-slate-800 bg-slate-900 text-slate-500'
            }`}
          >
            {soundEnabled ? <Volume2 className="h-3.5 w-3.5" /> : <VolumeX className="h-3.5 w-3.5" />}
          </button>
        </div>
      </div>

      {/* Main Dual-Screen Display: Camera Feed (Top) + Waveform (Bottom) */}
      <div className="space-y-2">
        {/* 1. High-Speed Camera Feed Canvas */}
        <div className="relative mx-auto w-full rounded-2xl border border-cyan-500/30 bg-slate-950 overflow-hidden shadow-inner flex items-center justify-center">
          <canvas
            ref={highSpeedCameraCanvasRef}
            width={580}
            height={220}
            className="w-full h-auto max-h-[260px] object-contain"
          />

          {/* Decision HUD Banner Overlay */}
          <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between pointer-events-none font-mono text-[10px]">
            <div className="rounded-lg bg-slate-950/90 border border-slate-800 px-2.5 py-1 text-slate-300 backdrop-blur-md">
              CAMERA PERSPECTIVE: <strong className="text-cyan-300">SIDE-EDGE MICRO ZOOM</strong>
            </div>

            <div
              className={`rounded-lg px-2.5 py-1 font-bold border backdrop-blur-md ${
                isEdge && Math.abs(currentFrame - IMPACT_FRAME) <= 3
                  ? 'bg-rose-500/20 border-rose-500/50 text-rose-400 animate-pulse'
                  : 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400'
              }`}
            >
              {isEdge && Math.abs(currentFrame - IMPACT_FRAME) <= 3 ? '⚠ BAT CONTACT CONFIRMED' : '✓ FLATLINE: NO CONTACT'}
            </div>
          </div>
        </div>

        {/* 2. Audio Oscillogram Waveform Canvas */}
        <div className="relative mx-auto w-full rounded-2xl border border-cyan-500/30 bg-slate-950 overflow-hidden shadow-inner">
          <canvas
            ref={waveformCanvasRef}
            width={580}
            height={90}
            className="w-full h-auto max-h-[100px] object-contain"
          />
        </div>
      </div>

      {/* Scrubbing & Replay Controls */}
      <div className="rounded-2xl border border-slate-800 bg-slate-950/80 p-3 space-y-3 font-mono text-xs">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            {/* Play / Pause */}
            <button
              onClick={() => {
                setIsRockAndRoll(false);
                setIsPlaying(!isPlaying);
              }}
              className="flex items-center gap-1.5 rounded-xl bg-cyan-500 px-3 py-1.5 text-xs font-black text-slate-950 hover:bg-cyan-400 transition-all cursor-pointer shadow-md shadow-cyan-500/20"
            >
              {isPlaying ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3 fill-current" />}
              <span>{isPlaying ? 'PAUSE' : 'PLAY'}</span>
            </button>

            {/* Rock & Roll Mode */}
            <button
              onClick={() => {
                setIsPlaying(false);
                setIsRockAndRoll(!isRockAndRoll);
              }}
              className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition-all cursor-pointer ${
                isRockAndRoll
                  ? 'bg-amber-400 text-slate-950 font-black shadow-md shadow-amber-400/30 animate-pulse'
                  : 'border border-slate-700 bg-slate-900 text-slate-300 hover:text-white'
              }`}
            >
              <Zap className="h-3 w-3" />
              <span>{isRockAndRoll ? 'STOP ROCK & ROLL' : 'ROCK & ROLL (F34-46)'}</span>
            </button>

            {/* Frame Step Backward */}
            <button
              onClick={() => {
                setIsPlaying(false);
                setIsRockAndRoll(false);
                seekFrame(currentFrame - 1);
              }}
              className="rounded-lg border border-slate-800 bg-slate-900 px-2 py-1.5 text-slate-300 hover:text-white cursor-pointer"
              title="-1 Frame"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </button>

            {/* Frame Step Forward */}
            <button
              onClick={() => {
                setIsPlaying(false);
                setIsRockAndRoll(false);
                seekFrame(currentFrame + 1);
              }}
              className="rounded-lg border border-slate-800 bg-slate-900 px-2 py-1.5 text-slate-300 hover:text-white cursor-pointer"
              title="+1 Frame"
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Quick Jump Hotkeys */}
          <div className="flex items-center gap-1.5 text-[10px]">
            <span className="text-slate-500">JUMP TO:</span>
            <button
              onClick={() => {
                setIsPlaying(false);
                setIsRockAndRoll(false);
                seekFrame(20);
              }}
              className="rounded px-2 py-1 bg-slate-900 border border-slate-800 text-slate-300 hover:text-white cursor-pointer"
            >
              Approach (F20)
            </button>
            <button
              onClick={() => {
                setIsPlaying(false);
                setIsRockAndRoll(false);
                seekFrame(IMPACT_FRAME);
              }}
              className="rounded px-2 py-1 bg-cyan-950 border border-cyan-500/40 text-cyan-300 font-bold hover:text-white cursor-pointer"
            >
              Impact (F40)
            </button>
            <button
              onClick={() => {
                setIsPlaying(false);
                setIsRockAndRoll(false);
                seekFrame(60);
              }}
              className="rounded px-2 py-1 bg-slate-900 border border-slate-800 text-slate-300 hover:text-white cursor-pointer"
            >
              Keeper (F60)
            </button>
          </div>
        </div>

        {/* Scrubbing Slider with Impact Markers */}
        <div className="space-y-1">
          <input
            type="range"
            min={0}
            max={TOTAL_FRAMES}
            value={currentFrame}
            onChange={(e) => {
              setIsPlaying(false);
              setIsRockAndRoll(false);
              seekFrame(Number(e.target.value));
            }}
            className="w-full h-2 rounded-lg bg-slate-800 accent-cyan-400 cursor-pointer"
          />

          <div className="flex justify-between text-[9px] text-slate-500">
            <span>Frame 00 (Ball Flight)</span>
            <span className="text-cyan-400 font-bold">Frame 40 (Edge Point)</span>
            <span>Frame 80 (To Glove)</span>
          </div>
        </div>
      </div>
    </div>
  );
};
