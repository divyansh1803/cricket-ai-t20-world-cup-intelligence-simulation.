import React, { useRef, useEffect, useState, useCallback } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  Volume2,
  VolumeX,
  Target,
  Activity,
  CheckCircle2,
  AlertTriangle,
  Sliders,
  ChevronLeft,
  ChevronRight,
  Eye,
} from 'lucide-react';
import { cricketAudio } from '../../utils/audioSystem';
import { audioManager } from '../../services/AudioManager';

export interface BallTrackingDeliveryData {
  speedKmh: number;
  pitchX: number; // 0-400 coordinate space
  pitchY: number;
  impactX: number;
  impactY: number;
  targetStumpX: number; // 200 = Middle, 190 = Off, 210 = Leg
  bounceHeightMeters: number;
  seamDeviation: number; // degrees
  pitchingLine: 'IN LINE' | 'OUTSIDE OFF' | 'OUTSIDE LEG';
  impactLine: 'IN LINE' | 'OUTSIDE OFF';
  wicketsOutcome: 'HITTING' | 'MISSING (OFF)' | 'MISSING (HEIGHT)' | 'CLIPPING BAIL';
  isOut: boolean;
  bowlerType?: string;
  description?: string;
}

export interface BroadcastBallTrackingProps {
  delivery?: Partial<BallTrackingDeliveryData>;
  strikerName?: string;
  bowlerName?: string;
  isOut?: boolean;
  initialFrame?: number;
  onFrameScrub?: (frame: number) => void;
  className?: string;
}

export const BroadcastBallTrackingCanvas: React.FC<BroadcastBallTrackingProps> = ({
  delivery,
  strikerName = 'Batter',
  bowlerName = 'Bowler',
  isOut = true,
  initialFrame = 40,
  onFrameScrub,
  className = '',
}) => {
  // Merged delivery configuration
  const activeDelivery: BallTrackingDeliveryData = {
    speedKmh: delivery?.speedKmh || 142.4,
    pitchX: delivery?.pitchX ?? 202,
    pitchY: delivery?.pitchY ?? 158,
    impactX: delivery?.impactX ?? 199,
    impactY: delivery?.impactY ?? 92,
    targetStumpX: delivery?.targetStumpX ?? (isOut ? 200 : 224),
    bounceHeightMeters: delivery?.bounceHeightMeters ?? 0.62,
    seamDeviation: delivery?.seamDeviation ?? -1.8,
    pitchingLine: delivery?.pitchingLine || 'IN LINE',
    impactLine: delivery?.impactLine || 'IN LINE',
    wicketsOutcome: delivery?.wicketsOutcome || (isOut ? 'HITTING' : 'MISSING (OFF)'),
    isOut: isOut,
    bowlerType: delivery?.bowlerType || 'Right-Arm Fast Seam',
    description: delivery?.description || 'Good length delivery nipping back off the seam into the front pad.',
  };

  const TOTAL_FRAMES = 60;
  const BOUNCE_FRAME = 26;
  const IMPACT_FRAME = 40;

  const [currentFrame, setCurrentFrame] = useState<number>(initialFrame);
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(0.5);
  const [cameraAngle, setCameraAngle] = useState<'3d_pitch' | 'side_hawkeye' | 'stump_cam' | 'overhead'>('3d_pitch');
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const lastSoundTriggerRef = useRef<number>(-1);

  // Sound triggers on key frames
  useEffect(() => {
    if (!soundEnabled) return;
    if (currentFrame === BOUNCE_FRAME && lastSoundTriggerRef.current !== BOUNCE_FRAME) {
      cricketAudio.playBatHit();
      lastSoundTriggerRef.current = BOUNCE_FRAME;
    } else if (currentFrame === IMPACT_FRAME && lastSoundTriggerRef.current !== IMPACT_FRAME) {
      cricketAudio.playBatHit();
      lastSoundTriggerRef.current = IMPACT_FRAME;
    } else if (currentFrame >= TOTAL_FRAMES - 2 && lastSoundTriggerRef.current !== TOTAL_FRAMES) {
      if (activeDelivery.isOut && activeDelivery.wicketsOutcome === 'HITTING') {
        cricketAudio.playWicket();
      }
      lastSoundTriggerRef.current = TOTAL_FRAMES;
    } else if (Math.abs(currentFrame - BOUNCE_FRAME) > 2 && Math.abs(currentFrame - IMPACT_FRAME) > 2 && currentFrame < 55) {
      lastSoundTriggerRef.current = -1;
    }
  }, [currentFrame, soundEnabled, activeDelivery]);

  // Frame seek
  const seekFrame = useCallback(
    (frame: number) => {
      const clamped = Math.max(0, Math.min(TOTAL_FRAMES, Math.round(frame)));
      setCurrentFrame(clamped);
      if (onFrameScrub) onFrameScrub(clamped);
    },
    [onFrameScrub]
  );

  // Playback Loop
  useEffect(() => {
    if (!isPlaying) {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      return;
    }

    let lastTimestamp = performance.now();
    const frameIntervalMs = 33 / playbackSpeed;

    const loop = (timestamp: number) => {
      const elapsed = timestamp - lastTimestamp;
      if (elapsed >= frameIntervalMs) {
        lastTimestamp = timestamp;
        setCurrentFrame((prev) => {
          const next = (prev + 1) % (TOTAL_FRAMES + 1);
          if (onFrameScrub) onFrameScrub(next);
          return next;
        });
      }
      animFrameRef.current = requestAnimationFrame(loop);
    };

    animFrameRef.current = requestAnimationFrame(loop);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [isPlaying, playbackSpeed, onFrameScrub]);

  // -------------------------------------------------------------
  // CANVAS ENGINE: BROADCAST HAWK-EYE 3D RENDERER
  // -------------------------------------------------------------
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    // Clear background to deep midnight sports broadcast canvas
    ctx.fillStyle = '#020617';
    ctx.fillRect(0, 0, width, height);

    // Common telemetry progress
    const t = currentFrame / TOTAL_FRAMES;
    const isWicketsHit = currentFrame >= 56 && activeDelivery.wicketsOutcome === 'HITTING';

    // -----------------------------------------------------------
    // PERSPECTIVE 1: 3D PITCH ISOMETRIC VIEW
    // -----------------------------------------------------------
    if (cameraAngle === '3d_pitch') {
      // Perspective pitch coordinates:
      // Near end (Bowler): X: 120 to 360, Y: 290
      // Far end (Batter/Stumps): X: 200 to 280, Y: 45
      const nearLeftX = width * 0.22;
      const nearRightX = width * 0.78;
      const nearY = height * 0.90;

      const farLeftX = width * 0.42;
      const farRightX = width * 0.58;
      const farY = height * 0.14;

      // Infield turf backdrop polygon
      ctx.fillStyle = '#041d15';
      ctx.beginPath();
      ctx.moveTo(width * 0.05, height * 0.96);
      ctx.lineTo(width * 0.95, height * 0.96);
      ctx.lineTo(width * 0.75, height * 0.05);
      ctx.lineTo(width * 0.25, height * 0.05);
      ctx.closePath();
      ctx.fill();

      // Pitch Strip
      const pitchGrad = ctx.createLinearGradient(0, nearY, 0, farY);
      pitchGrad.addColorStop(0, '#5a3d31');
      pitchGrad.addColorStop(0.5, '#7c5a4d');
      pitchGrad.addColorStop(1, '#4e342e');

      ctx.fillStyle = pitchGrad;
      ctx.strokeStyle = '#06b6d4';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(nearLeftX, nearY);
      ctx.lineTo(nearRightX, nearY);
      ctx.lineTo(farRightX, farY);
      ctx.lineTo(farLeftX, farY);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Crease lines
      // Bowling crease
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(nearLeftX - 15, nearY - 15);
      ctx.lineTo(nearRightX + 15, nearY - 15);
      ctx.stroke();

      // Popping crease (far end)
      const popY = farY + (nearY - farY) * 0.16;
      const popLeftX = farLeftX - 12;
      const popRightX = farRightX + 12;
      ctx.beginPath();
      ctx.moveTo(popLeftX, popY);
      ctx.lineTo(popRightX, popY);
      ctx.stroke();

      // Stumps at far end
      const stumpCenterX = (farLeftX + farRightX) / 2;
      const stumpY = farY;
      const stumpHeight = 28;

      ctx.save();
      // 3 Stumps
      [-7, 0, 7].forEach((offset) => {
        ctx.fillStyle = isWicketsHit ? '#ef4444' : '#f59e0b';
        ctx.strokeStyle = '#78350f';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.roundRect(stumpCenterX + offset - 2, stumpY - stumpHeight, 4, stumpHeight, 1);
        ctx.fill();
        ctx.stroke();
      });

      // Bails
      ctx.fillStyle = isWicketsHit ? '#fca5a5' : '#fef08a';
      if (isWicketsHit) {
        // Flying bails on impact
        ctx.save();
        ctx.translate(stumpCenterX - 10, stumpY - stumpHeight - 16);
        ctx.rotate(-0.4);
        ctx.fillRect(-8, 0, 16, 3);
        ctx.restore();

        ctx.save();
        ctx.translate(stumpCenterX + 12, stumpY - stumpHeight - 14);
        ctx.rotate(0.35);
        ctx.fillRect(-8, 0, 16, 3);
        ctx.restore();
      } else {
        ctx.fillRect(stumpCenterX - 10, stumpY - stumpHeight - 3, 20, 3);
      }
      ctx.restore();

      // Pitch Bounce Marker & Dust Burst
      const scaleX = (x: number) => (x / 400) * width;
      const scaleY = (y: number) => (y / 320) * height;

      const mappedPitchX = scaleX(activeDelivery.pitchX);
      const mappedPitchY = scaleY(activeDelivery.pitchY);

      // Pitching ellipse
      ctx.save();
      ctx.strokeStyle = '#22d3ee';
      ctx.fillStyle = 'rgba(6, 182, 212, 0.4)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.ellipse(mappedPitchX, mappedPitchY, 14, 6, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Pitching HUD text
      ctx.fillStyle = '#38bdf8';
      ctx.font = 'bold 9px monospace';
      ctx.fillText(`PITCH: ${activeDelivery.pitchingLine}`, mappedPitchX + 18, mappedPitchY + 4);

      // Dust burst at bounce frame
      if (Math.abs(currentFrame - BOUNCE_FRAME) <= 3) {
        ctx.fillStyle = 'rgba(217, 119, 6, 0.6)';
        ctx.beginPath();
        ctx.arc(mappedPitchX, mappedPitchY, 18, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();

      // Pad Impact Marker
      const mappedImpactX = scaleX(activeDelivery.impactX);
      const mappedImpactY = scaleY(activeDelivery.impactY);

      ctx.save();
      ctx.strokeStyle = activeDelivery.isOut ? '#f43f5e' : '#10b981';
      ctx.fillStyle = activeDelivery.isOut ? 'rgba(244, 63, 94, 0.35)' : 'rgba(16, 185, 129, 0.35)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.ellipse(mappedImpactX, mappedImpactY, 16, 7, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = activeDelivery.isOut ? '#f43f5e' : '#10b981';
      ctx.font = 'bold 9px monospace';
      ctx.fillText(`IMPACT: ${activeDelivery.impactLine}`, mappedImpactX + 20, mappedImpactY + 4);
      ctx.restore();

      // 3D Laser Ball Trajectory Stream
      const mappedTargetX = scaleX(activeDelivery.targetStumpX);
      const mappedTargetY = stumpY;

      ctx.save();
      ctx.strokeStyle = activeDelivery.isOut ? 'rgba(244, 63, 94, 0.85)' : 'rgba(16, 185, 129, 0.85)';
      ctx.lineWidth = 3;
      ctx.shadowColor = activeDelivery.isOut ? '#f43f5e' : '#10b981';
      ctx.shadowBlur = 10;

      // Draw quadratic curved beam
      ctx.beginPath();
      ctx.moveTo((nearLeftX + nearRightX) / 2, nearY);
      ctx.quadraticCurveTo(
        (mappedPitchX + (nearLeftX + nearRightX) / 2) / 2,
        (nearY + mappedPitchY) / 2 - 20,
        mappedPitchX,
        mappedPitchY
      );
      ctx.quadraticCurveTo(
        (mappedPitchX + mappedImpactX) / 2,
        (mappedPitchY + mappedImpactY) / 2 - activeDelivery.bounceHeightMeters * 24,
        mappedImpactX,
        mappedImpactY
      );
      ctx.quadraticCurveTo(
        (mappedImpactX + mappedTargetX) / 2,
        (mappedImpactY + mappedTargetY) / 2 - 12,
        mappedTargetX,
        mappedTargetY
      );
      ctx.stroke();
      ctx.restore();

      // Current Animated Ball Position
      let ballCurX = (nearLeftX + nearRightX) / 2;
      let ballCurY = nearY;
      let ballAltitude = 0;
      let ballRadius = 12;

      if (t <= 0.43) {
        const subT = t / 0.43;
        ballCurX = (nearLeftX + nearRightX) / 2 + (mappedPitchX - (nearLeftX + nearRightX) / 2) * subT;
        ballCurY = nearY - (nearY - mappedPitchY) * subT;
        ballAltitude = Math.sin(subT * Math.PI) * 25;
        ballRadius = 14 - 4 * subT;
      } else if (t <= 0.67) {
        const subT = (t - 0.43) / 0.24;
        ballCurX = mappedPitchX + (mappedImpactX - mappedPitchX) * subT;
        ballCurY = mappedPitchY - (mappedPitchY - mappedImpactY) * subT;
        ballAltitude = Math.sin((subT * Math.PI) / 2) * (30 * activeDelivery.bounceHeightMeters);
        ballRadius = 10 - 2 * subT;
      } else {
        const subT = (t - 0.67) / 0.33;
        ballCurX = mappedImpactX + (mappedTargetX - mappedImpactX) * subT;
        ballCurY = mappedImpactY - (mappedImpactY - mappedTargetY) * subT;
        ballAltitude = 20 * (1 - subT);
        ballRadius = 8 - 2 * subT;
      }

      // Ball Shadow on Pitch
      ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
      ctx.beginPath();
      ctx.ellipse(ballCurX, ballCurY, ballRadius * 1.1, ballRadius * 0.45, 0, 0, Math.PI * 2);
      ctx.fill();

      // Elevated Red Cricket Ball
      const ballVisualY = ballCurY - ballAltitude;
      ctx.save();
      const ballGrad = ctx.createRadialGradient(ballCurX - 2, ballVisualY - 2, 2, ballCurX, ballVisualY, ballRadius);
      ballGrad.addColorStop(0, '#f87171');
      ballGrad.addColorStop(0.5, '#dc2626');
      ballGrad.addColorStop(1, '#991b1b');
      ctx.fillStyle = ballGrad;
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(ballCurX, ballVisualY, Math.max(3, ballRadius), 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Targeting reticle around ball
      ctx.strokeStyle = '#22d3ee';
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.arc(ballCurX, ballVisualY, Math.max(3, ballRadius) + 6, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    // -----------------------------------------------------------
    // PERSPECTIVE 2: SIDE HAWKEYE ARC (Height & Stumps)
    // -----------------------------------------------------------
    else if (cameraAngle === 'side_hawkeye') {
      const groundY = height * 0.78;

      // Ground Pitch Surface
      ctx.strokeStyle = '#06b6d4';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(30, groundY);
      ctx.lineTo(width - 30, groundY);
      ctx.stroke();

      ctx.fillStyle = '#64748b';
      ctx.font = '9px monospace';
      ctx.fillText('PITCH SURFACE (22 YARDS / 20.12M)', 40, groundY + 16);

      // Stumps Profile at Right Side
      const stumpX = width * 0.85;
      const stumpH = 80;
      ctx.fillStyle = isWicketsHit ? '#ef4444' : '#f59e0b';
      ctx.strokeStyle = '#78350f';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.roundRect(stumpX - 4, groundY - stumpH, 8, stumpH, 2);
      ctx.fill();
      ctx.stroke();

      // Bails on top
      ctx.fillStyle = '#fef08a';
      ctx.fillRect(stumpX - 8, groundY - stumpH - 4, 16, 4);

      // Height Marker Line at Top of Stumps (0.71m)
      ctx.strokeStyle = 'rgba(234, 179, 8, 0.4)';
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.moveTo(stumpX - 80, groundY - stumpH);
      ctx.lineTo(stumpX + 40, groundY - stumpH);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = '#fef08a';
      ctx.fillText('STUMPS: 0.71M', stumpX - 90, groundY - stumpH + 3);

      // Batter Impact Stance Line (2.14m from wickets)
      const impactLineX = stumpX - 90;
      ctx.strokeStyle = 'rgba(148, 163, 184, 0.5)';
      ctx.setLineDash([2, 2]);
      ctx.beginPath();
      ctx.moveTo(impactLineX, groundY - 120);
      ctx.lineTo(impactLineX, groundY);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = '#94a3b8';
      ctx.fillText('BATTER PAD (2.14M)', impactLineX - 45, groundY - 128);

      // Parabolic Delivery Trajectory Arc
      const releaseX = 50;
      const releaseY = groundY - 120;
      const bounceX = (releaseX + stumpX) * 0.46;
      const bounceY = groundY;
      const peakBounceH = activeDelivery.bounceHeightMeters * 75;
      const stumpTargetY = activeDelivery.isOut ? groundY - stumpH * 0.6 : groundY - stumpH - 24;

      ctx.save();
      ctx.strokeStyle = activeDelivery.isOut ? '#f43f5e' : '#10b981';
      ctx.lineWidth = 2.5;
      ctx.shadowColor = activeDelivery.isOut ? '#f43f5e' : '#10b981';
      ctx.shadowBlur = 8;

      ctx.beginPath();
      ctx.moveTo(releaseX, releaseY);
      ctx.quadraticCurveTo((releaseX + bounceX) / 2, groundY - 20, bounceX, bounceY);
      ctx.quadraticCurveTo(
        (bounceX + impactLineX) / 2,
        groundY - peakBounceH,
        impactLineX,
        groundY - peakBounceH * 0.8
      );
      ctx.quadraticCurveTo(
        (impactLineX + stumpX) / 2,
        groundY - peakBounceH * 0.6,
        stumpX,
        stumpTargetY
      );
      ctx.stroke();
      ctx.restore();

      // Ball animated on path
      const curX = releaseX + (stumpX - releaseX) * t;
      let curY = releaseY;
      if (t <= 0.43) {
        const st = t / 0.43;
        curY = releaseY + (bounceY - releaseY) * (st * st);
      } else {
        const st = (t - 0.43) / 0.57;
        curY = bounceY - Math.sin(st * Math.PI * 0.65) * peakBounceH;
      }

      ctx.fillStyle = '#ef4444';
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(curX, curY, 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }

    // -----------------------------------------------------------
    // PERSPECTIVE 3: STUMP CAM (Head-On Target Projection)
    // -----------------------------------------------------------
    else if (cameraAngle === 'stump_cam') {
      const centerX = width / 2;
      const groundY = height * 0.82;

      // Ground line
      ctx.strokeStyle = '#475569';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(40, groundY);
      ctx.lineTo(width - 40, groundY);
      ctx.stroke();

      // 3 Stumps (Head-On)
      const stumpW = 22;
      const stumpH = 140;
      const spacing = 36;

      [-spacing, 0, spacing].forEach((offset) => {
        ctx.fillStyle = isWicketsHit ? '#ef4444' : '#f59e0b';
        ctx.strokeStyle = '#78350f';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.roundRect(centerX + offset - stumpW / 2, groundY - stumpH, stumpW, stumpH, 4);
        ctx.fill();
        ctx.stroke();
      });

      // Bails on top
      ctx.fillStyle = isWicketsHit ? '#fca5a5' : '#fef08a';
      if (isWicketsHit) {
        ctx.save();
        ctx.translate(centerX - 35, groundY - stumpH - 30);
        ctx.rotate(-0.4);
        ctx.fillRect(-20, 0, 40, 6);
        ctx.restore();

        ctx.save();
        ctx.translate(centerX + 35, groundY - stumpH - 26);
        ctx.rotate(0.35);
        ctx.fillRect(-20, 0, 40, 6);
        ctx.restore();
      } else {
        ctx.fillRect(centerX - spacing - 8, groundY - stumpH - 8, spacing * 2 + 16, 6);
      }

      // Stump Zone Bounding Target Box
      ctx.strokeStyle = '#22d3ee';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.rect(centerX - spacing - 16, groundY - stumpH - 12, spacing * 2 + 32, stumpH + 12);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.fillStyle = '#22d3ee';
      ctx.font = 'bold 9px monospace';
      ctx.fillText('STUMP TARGET ZONE', centerX - 48, groundY - stumpH - 20);

      // Approaching ball coming towards camera
      const targetDeltaX = (activeDelivery.targetStumpX - 200) * 3;
      const ballProgressX = centerX + targetDeltaX;
      const ballTargetY = activeDelivery.isOut ? groundY - stumpH * 0.55 : groundY - stumpH - 30;

      const ballSize = Math.max(6, Math.round(t * 30));
      ctx.save();
      const ballGrad = ctx.createRadialGradient(ballProgressX - 4, ballTargetY - 4, 3, ballProgressX, ballTargetY, ballSize);
      ballGrad.addColorStop(0, '#f87171');
      ballGrad.addColorStop(0.5, '#dc2626');
      ballGrad.addColorStop(1, '#991b1b');
      ctx.fillStyle = ballGrad;
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.shadowColor = 'rgba(239, 68, 68, 0.8)';
      ctx.shadowBlur = 16;
      ctx.beginPath();
      ctx.arc(ballProgressX, ballTargetY, ballSize, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.restore();

      // Outcome label below stumps
      ctx.fillStyle = activeDelivery.isOut ? '#f43f5e' : '#10b981';
      ctx.font = 'black 14px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(activeDelivery.wicketsOutcome, centerX, groundY + 32);
      ctx.textAlign = 'left';
    }

    // -----------------------------------------------------------
    // PERSPECTIVE 4: OVERHEAD 2D RADAR TRACKER
    // -----------------------------------------------------------
    else if (cameraAngle === 'overhead') {
      const pitchW = 80;
      const pitchH = height * 0.82;
      const pitchLeft = (width - pitchW) / 2;
      const pitchTop = height * 0.09;

      ctx.fillStyle = '#1e293b';
      ctx.strokeStyle = '#06b6d4';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.roundRect(pitchLeft, pitchTop, pitchW, pitchH, 4);
      ctx.fill();
      ctx.stroke();

      // Creases
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(pitchLeft, pitchTop + 40);
      ctx.lineTo(pitchLeft + pitchW, pitchTop + 40);
      ctx.moveTo(pitchLeft, pitchTop + pitchH - 40);
      ctx.lineTo(pitchLeft + pitchW, pitchTop + pitchH - 40);
      ctx.stroke();

      // Stumps line
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(pitchLeft + pitchW * 0.35, pitchTop + 20);
      ctx.lineTo(pitchLeft + pitchW * 0.65, pitchTop + 20);
      ctx.stroke();

      // Lateral trajectory curve showing seam deviation
      const seamAnglePx = activeDelivery.seamDeviation * 8;
      ctx.save();
      ctx.strokeStyle = activeDelivery.isOut ? '#f43f5e' : '#10b981';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(width / 2, pitchTop + pitchH - 40);
      ctx.lineTo(width / 2, pitchTop + pitchH * 0.55);
      ctx.quadraticCurveTo(
        width / 2 + seamAnglePx * 0.5,
        pitchTop + pitchH * 0.35,
        width / 2 + seamAnglePx,
        pitchTop + 20
      );
      ctx.stroke();
      ctx.restore();

      // Ball overhead marker
      const ballY = pitchTop + pitchH - 40 - t * (pitchH - 60);
      const ballX = width / 2 + (t >= 0.45 ? (t - 0.45) * seamAnglePx * 1.8 : 0);
      ctx.fillStyle = '#ef4444';
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(ballX, ballY, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
  }, [currentFrame, cameraAngle, activeDelivery]);

  return (
    <div
      className={`rounded-3xl border border-cyan-500/40 bg-gradient-to-b from-[#020716] via-[#040e26] to-[#010512] p-4 sm:p-6 space-y-4 shadow-[0_0_50px_rgba(6,182,212,0.2)] text-slate-100 ${className}`}
    >
      {/* Broadcast Header & Camera Selector */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-cyan-500/20 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-cyan-500/20 border border-cyan-400 text-cyan-300">
            <Target className="h-4 w-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono font-black uppercase tracking-wider text-cyan-400">
                HAWK-EYE 3D BALL TRACKING
              </span>
              <span className="rounded bg-rose-500/20 border border-rose-500/40 px-1.5 py-0.2 text-[8px] font-mono font-bold text-rose-300">
                CALIBRATED 300 FPS
              </span>
            </div>
            <p className="text-xs font-mono text-slate-300">
              {strikerName} vs {bowlerName} · <strong className="text-white">{activeDelivery.speedKmh.toFixed(1)} km/h</strong>
            </p>
          </div>
        </div>

        {/* Camera Perspectives & Audio */}
        <div className="flex items-center gap-2">
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

          <div className="flex items-center gap-1 bg-slate-900 rounded-xl border border-slate-800 p-0.5 text-xs font-mono">
            {[
              { id: '3d_pitch', label: '🏟️ 3D Pitch' },
              { id: 'side_hawkeye', label: '📐 Side Arc' },
              { id: 'stump_cam', label: '🎯 Stump Cam' },
              { id: 'overhead', label: '🛰️ Overhead' },
            ].map((c) => (
              <button
                key={c.id}
                onClick={() => setCameraAngle(c.id as any)}
                className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                  cameraAngle === c.id
                    ? 'bg-cyan-500 text-slate-950 font-bold shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Canvas Area */}
      <div className="relative mx-auto w-full rounded-2xl border border-cyan-500/30 bg-slate-950 overflow-hidden shadow-inner flex items-center justify-center">
        <canvas
          ref={canvasRef}
          width={600}
          height={320}
          className="w-full h-auto max-h-[340px] object-contain"
        />

        {/* Telemetry Floating HUD */}
        <div className="absolute top-3 left-3 flex flex-col gap-1.5 pointer-events-none font-mono text-[10px]">
          <div className="rounded-lg bg-slate-950/90 border border-cyan-500/40 px-2 py-0.5 text-cyan-300">
            RELEASE SPEED: <strong className="text-white">{activeDelivery.speedKmh.toFixed(1)} KM/H</strong>
          </div>
          <div className="rounded-lg bg-slate-950/90 border border-slate-700 px-2 py-0.5 text-slate-300">
            SEAM CUT: <strong className="text-amber-400">{activeDelivery.seamDeviation > 0 ? `+${activeDelivery.seamDeviation}°` : `${activeDelivery.seamDeviation}°`}</strong>
          </div>
          <div className="rounded-lg bg-slate-950/90 border border-slate-700 px-2 py-0.5 text-slate-300">
            BOUNCE HEIGHT: <strong className="text-emerald-400">{activeDelivery.bounceHeightMeters.toFixed(2)}M</strong>
          </div>
        </div>

        {/* Frame index watermark */}
        <div className="absolute top-3 right-3 font-mono text-[10px] text-right pointer-events-none">
          <span className="text-slate-400 block">FRAME {currentFrame.toString().padStart(2, '0')} / {TOTAL_FRAMES}</span>
          <span className="text-cyan-400 font-bold block">{activeDelivery.bowlerType}</span>
        </div>
      </div>

      {/* Frame Scrubbing & Playback Bar */}
      <div className="rounded-2xl border border-slate-800 bg-slate-950/80 p-3 space-y-3 font-mono text-xs">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className="flex items-center gap-1.5 rounded-xl bg-cyan-500 px-3 py-1.5 text-xs font-black text-slate-950 hover:bg-cyan-400 transition-all cursor-pointer shadow-md shadow-cyan-500/20"
            >
              {isPlaying ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3 fill-current" />}
              <span>{isPlaying ? 'PAUSE' : 'PLAY LOOP'}</span>
            </button>

            <button
              onClick={() => seekFrame(0)}
              className="rounded-lg border border-slate-800 bg-slate-900 px-2 py-1.5 text-slate-300 hover:text-white cursor-pointer"
              title="Reset"
            >
              <RotateCcw className="h-3 w-3" />
            </button>

            <button
              onClick={() => {
                setIsPlaying(false);
                seekFrame(currentFrame - 1);
              }}
              className="rounded-lg border border-slate-800 bg-slate-900 px-2 py-1.5 text-slate-300 hover:text-white cursor-pointer"
              title="-1 Frame"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </button>

            <button
              onClick={() => {
                setIsPlaying(false);
                seekFrame(currentFrame + 1);
              }}
              className="rounded-lg border border-slate-800 bg-slate-900 px-2 py-1.5 text-slate-300 hover:text-white cursor-pointer"
              title="+1 Frame"
            >
              <ChevronRight className="h-3.5 w-3.5" />
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

          <div className="flex items-center gap-1.5 text-[10px]">
            <button
              onClick={() => {
                setIsPlaying(false);
                seekFrame(0);
              }}
              className="rounded px-2 py-1 bg-slate-900 border border-slate-800 text-slate-300 hover:text-white cursor-pointer"
            >
              Release (F0)
            </button>
            <button
              onClick={() => {
                setIsPlaying(false);
                seekFrame(BOUNCE_FRAME);
              }}
              className="rounded px-2 py-1 bg-slate-900 border border-slate-800 text-cyan-300 hover:text-white cursor-pointer"
            >
              Bounce (F{BOUNCE_FRAME})
            </button>
            <button
              onClick={() => {
                setIsPlaying(false);
                seekFrame(IMPACT_FRAME);
              }}
              className="rounded px-2 py-1 bg-cyan-950 border border-cyan-500/40 text-cyan-300 font-bold hover:text-white cursor-pointer"
            >
              Impact (F{IMPACT_FRAME})
            </button>
            <button
              onClick={() => {
                setIsPlaying(false);
                seekFrame(TOTAL_FRAMES);
              }}
              className="rounded px-2 py-1 bg-slate-900 border border-slate-800 text-slate-300 hover:text-white cursor-pointer"
            >
              Wickets (F{TOTAL_FRAMES})
            </button>
          </div>
        </div>

        {/* Scrub Slider */}
        <input
          type="range"
          min={0}
          max={TOTAL_FRAMES}
          value={currentFrame}
          onChange={(e) => {
            setIsPlaying(false);
            seekFrame(Number(e.target.value));
          }}
          className="w-full h-2 rounded-lg bg-slate-800 accent-cyan-400 cursor-pointer"
        />
      </div>

      {/* 3 Protocol Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
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

        {/* 3. Wickets */}
        <div className="rounded-xl border border-slate-800 bg-slate-950/80 p-3 space-y-1">
          <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 block font-bold">
            3. WICKETS
          </span>
          <div
            className={`flex items-center gap-1.5 text-xs font-mono font-bold ${
              activeDelivery.isOut ? 'text-rose-400' : 'text-emerald-400'
            }`}
          >
            {activeDelivery.isOut ? <AlertTriangle className="h-3.5 w-3.5" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
            <span>{activeDelivery.wicketsOutcome}</span>
          </div>
          <p className="text-[10px] text-slate-500 font-mono">
            {activeDelivery.isOut ? 'Trajectory projected into middle stump' : `Ball missing ${activeDelivery.wicketsOutcome}`}
          </p>
        </div>
      </div>
    </div>
  );
};
