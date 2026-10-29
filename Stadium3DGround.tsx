import React, { useState, useEffect, useRef } from 'react';
import { Player, Team, Stadium, BallEvent } from '../../types/cricket';
import { cricketAudio } from '../../utils/audioSystem';
import { audioManager } from '../../services/AudioManager';
import { StadiumAudioVisualizer } from './StadiumAudioVisualizer';
import { SmartStadiumLighting, TimeOfDay } from './SmartStadiumLighting';
import { TeamFlag } from '../common/CricketIdentity';
import {
  Camera,
  Eye,
  Sparkles,
  Zap,
  Shield,
  Activity,
  Flame,
  Volume2,
  Compass,
  Move,
  RotateCcw,
  Sun,
  Moon,
  ChevronRight,
  Maximize2,
  X,
  Target,
  TrendingUp,
  TrendingDown,
} from 'lucide-react';
import { ShotDecisionAdvisorHUD, ShotDecisionAdvisor } from './ShotDecisionAdvisor';
import { MomentumShiftIndicator } from './MomentumShiftIndicator';
import { CricketIntelligenceEngine } from '../../engine/simulationEngine';
import {
  InGameWicketProbabilityOverlay,
  calculateBatterPressure,
  calculateBowlerPrecision,
} from './InGameWicketProbabilityOverlay';
import {
  BattingAggressionSetting,
  ShotTrajectoryArcData,
  computeShotTrajectoryArcs,
} from '../../utils/shotTrajectoryArcs';

export type CameraMode = 'broadcast' | 'top_view' | 'batter_view' | 'bowler_view' | 'fielding_view' | 'tactical_view';

export type TacticalPreset = 'BALANCED' | 'ATTACK' | 'DEFENSIVE' | 'DEATH_OVERS' | 'PROTECT_SIX' | 'WICKET_HUNT';

interface FielderPosition {
  id: string;
  name: string;
  role: string;
  x: number; // Percentage -50 to +50 from pitch center
  y: number; // Percentage -50 to +50 from pitch center
  isHighlighted?: boolean;
}

interface Stadium3DGroundProps {
  teamA: Team;
  teamB: Team;
  stadium: Stadium;
  striker: Player;
  nonStriker: Player;
  bowler: Player;
  runs: number;
  wickets: number;
  overs: string;
  targetScore: number;
  currentCRR: number | string;
  requiredRR: number | string;
  lastBall: BallEvent | null;
  history: BallEvent[];
  isMatchActive: boolean;
  battingAggression?: BattingAggressionSetting;
  onTriggerDrs?: () => void;
  onSimulateBall?: (userIntent?: { deliveryType?: string; shotType?: string }) => void;
}

export const Stadium3DGround: React.FC<Stadium3DGroundProps> = ({
  teamA,
  teamB,
  stadium,
  striker,
  nonStriker,
  bowler,
  runs,
  wickets,
  overs,
  targetScore,
  currentCRR,
  requiredRR,
  lastBall,
  history,
  isMatchActive,
  battingAggression = 'Balanced',
  onTriggerDrs,
  onSimulateBall,
}) => {
  // Camera Mode State
  const [cameraMode, setCameraMode] = useState<CameraMode>('broadcast');
  const [timeOfDay, setTimeOfDay] = useState<TimeOfDay>('night');
  const [tacticalPreset, setTacticalPreset] = useState<TacticalPreset>('BALANCED');
  const [arcFilterMode, setArcFilterMode] = useState<'all' | 'over' | 'boundaries' | 'latest' | 'off'>('all');
  const [hoveredArc, setHoveredArc] = useState<ShotTrajectoryArcData | null>(null);

  // Animation Stage: 'idle' | 'runup' | 'delivery' | 'shot' | 'travel' | 'impact'
  const [animationStage, setAnimationStage] = useState<'idle' | 'runup' | 'shot' | 'travel' | 'impact'>('idle');
  const [ballAnimProgress, setBallAnimProgress] = useState<number>(0);
  const [celebrationBanner, setCelebrationBanner] = useState<'SIX' | 'FOUR' | 'WICKET' | null>(null);
  const [showShotAdvisorModal, setShowShotAdvisorModal] = useState<boolean>(false);
  const [showMomentumModal, setShowMomentumModal] = useState<boolean>(false);
  const [isMomentumExpanded, setIsMomentumExpanded] = useState<boolean>(false);
  const [showWicketProbAlert, setShowWicketProbAlert] = useState<boolean>(false);

  // Dragging fielder state
  const [activeDraggingFielderId, setActiveDraggingFielderId] = useState<string | null>(null);
  const groundRef = useRef<HTMLDivElement>(null);

  // Fielders Default Coordinates (% relative to ground center -50 to +50)
  const defaultFielders: FielderPosition[] = [
    { id: 'f1', name: 'Wicketkeeper', role: 'Keeper', x: 0, y: 16 },
    { id: 'f2', name: 'First Slip', role: 'Slip', x: 8, y: 18 },
    { id: 'f3', name: 'Cover Point', role: 'Point', x: -28, y: 2 },
    { id: 'f4', name: 'Extra Cover', role: 'Cover', x: -24, y: -16 },
    { id: 'f5', name: 'Mid-Off', role: 'Mid-Off', x: -12, y: -26 },
    { id: 'f6', name: 'Mid-On', role: 'Mid-On', x: 12, y: -26 },
    { id: 'f7', name: 'Mid-Wicket', role: 'Mid-Wicket', x: 26, y: -12 },
    { id: 'f8', name: 'Square Leg', role: 'Square Leg', x: 28, y: 8 },
    { id: 'f9', name: 'Fine Leg', role: 'Fine Leg', x: 22, y: 34 },
  ];

  const [fielders, setFielders] = useState<FielderPosition[]>(defaultFielders);

  // Apply tactical field preset
  const applyPreset = (preset: TacticalPreset) => {
    setTacticalPreset(preset);
    cricketAudio.playBatHit();

    let newFielders = [...defaultFielders];
    switch (preset) {
      case 'ATTACK':
        newFielders = [
          { id: 'f1', name: 'Keeper', role: 'Keeper', x: 0, y: 16 },
          { id: 'f2', name: 'First Slip', role: 'Slip', x: 7, y: 18 },
          { id: 'f3', name: 'Second Slip', role: 'Slip', x: 14, y: 20 },
          { id: 'f4', name: 'Gully', role: 'Gully', x: 22, y: 15 },
          { id: 'f5', name: 'Silly Point', role: 'Catching', x: -14, y: 4 },
          { id: 'f6', name: 'Short Leg', role: 'Catching', x: 12, y: 6 },
          { id: 'f7', name: 'Mid-Off', role: 'Mid-Off', x: -15, y: -24 },
          { id: 'f8', name: 'Mid-On', role: 'Mid-On', x: 15, y: -24 },
          { id: 'f9', name: 'Deep Fine', role: 'Boundary', x: 30, y: 36 },
        ];
        break;

      case 'DEFENSIVE':
        newFielders = [
          { id: 'f1', name: 'Keeper', role: 'Keeper', x: 0, y: 18 },
          { id: 'f2', name: 'Deep Third', role: 'Fence', x: -34, y: 30 },
          { id: 'f3', name: 'Deep Point', role: 'Fence', x: -38, y: 4 },
          { id: 'f4', name: 'Sweeper Cover', role: 'Fence', x: -35, y: -25 },
          { id: 'f5', name: 'Long-Off', role: 'Fence', x: -18, y: -40 },
          { id: 'f6', name: 'Long-On', role: 'Fence', x: 18, y: -40 },
          { id: 'f7', name: 'Deep Mid-Wkt', role: 'Fence', x: 36, y: -22 },
          { id: 'f8', name: 'Deep Square', role: 'Fence', x: 38, y: 8 },
          { id: 'f9', name: 'Deep Fine', role: 'Fence', x: 26, y: 38 },
        ];
        break;

      case 'DEATH_OVERS':
        newFielders = [
          { id: 'f1', name: 'Keeper', role: 'Keeper', x: 0, y: 18 },
          { id: 'f2', name: 'Deep Point', role: 'Fence', x: -36, y: 6 },
          { id: 'f3', name: 'Extra Cover', role: 'Ring', x: -18, y: -10 },
          { id: 'f4', name: 'Long-Off', role: 'Fence', x: -16, y: -42 },
          { id: 'f5', name: 'Long-On', role: 'Fence', x: 16, y: -42 },
          { id: 'f6', name: 'Deep Mid-Wkt', role: 'Fence', x: 36, y: -24 },
          { id: 'f7', name: 'Deep Square', role: 'Fence', x: 38, y: 12 },
          { id: 'f8', name: 'Short Third', role: 'Ring', x: -18, y: 22 },
          { id: 'f9', name: 'Deep Fine', role: 'Fence', x: 24, y: 38 },
        ];
        break;

      case 'PROTECT_SIX':
        newFielders = [
          { id: 'f1', name: 'Keeper', role: 'Keeper', x: 0, y: 18 },
          { id: 'f2', name: 'Deep Cover', role: 'Fence', x: -38, y: -18 },
          { id: 'f3', name: 'Long-Off', role: 'Fence', x: -15, y: -42 },
          { id: 'f4', name: 'Straight Hit', role: 'Fence', x: 0, y: -44 },
          { id: 'f5', name: 'Long-On', role: 'Fence', x: 15, y: -42 },
          { id: 'f6', name: 'Deep Mid-Wkt', role: 'Fence', x: 36, y: -24 },
          { id: 'f7', name: 'Deep Square', role: 'Fence', x: 40, y: 6 },
          { id: 'f8', name: 'Deep Fine', role: 'Fence', x: 25, y: 38 },
          { id: 'f9', name: 'Ring Point', role: 'Ring', x: -22, y: 4 },
        ];
        break;

      case 'WICKET_HUNT':
        newFielders = [
          { id: 'f1', name: 'Keeper', role: 'Keeper', x: 0, y: 16 },
          { id: 'f2', name: 'Slip 1', role: 'Slip', x: 6, y: 18 },
          { id: 'f3', name: 'Slip 2', role: 'Slip', x: 12, y: 20 },
          { id: 'f4', name: 'Slip 3', role: 'Slip', x: 18, y: 22 },
          { id: 'f5', name: 'Leg Slip', role: 'Catching', x: -8, y: 18 },
          { id: 'f6', name: 'Short Cover', role: 'Catching', x: -16, y: -8 },
          { id: 'f7', name: 'Mid-Off', role: 'Ring', x: -14, y: -25 },
          { id: 'f8', name: 'Mid-On', role: 'Ring', x: 14, y: -25 },
          { id: 'f9', name: 'Deep Fine', role: 'Boundary', x: 28, y: 36 },
        ];
        break;

      default:
        newFielders = defaultFielders;
    }
    setFielders(newFielders);

    if (preset === 'DEATH_OVERS') {
      audioManager.startDeathOversMusic({ tempoBpm: 132, intensity: 1.0 });
    }
  };

  // Trajectory destination coordinates for current ball
  const ballTargetCoords = React.useMemo(() => {
    if (!lastBall) return { x: 0, y: -15, isBoundary: false, isSix: false };

    const shot = (lastBall.shot || '').toLowerCase();
    const runs = lastBall.runsScored;
    const isWicket = lastBall.isWicket;

    // Angle mapping based on shot direction
    if (runs === 6) {
      if (shot.includes('mid-wicket') || shot.includes('pull')) return { x: 38, y: -38, isBoundary: true, isSix: true };
      if (shot.includes('straight') || shot.includes('long-on')) return { x: 0, y: -45, isBoundary: true, isSix: true };
      if (shot.includes('cover') || shot.includes('long-off')) return { x: -35, y: -40, isBoundary: true, isSix: true };
      return { x: 25, y: -42, isBoundary: true, isSix: true };
    }

    if (runs === 4) {
      if (shot.includes('square') || shot.includes('cut')) return { x: 42, y: 6, isBoundary: true, isSix: false };
      if (shot.includes('cover') || shot.includes('drive')) return { x: -40, y: -18, isBoundary: true, isSix: false };
      if (shot.includes('fine') || shot.includes('flick')) return { x: 35, y: 36, isBoundary: true, isSix: false };
      return { x: -28, y: -38, isBoundary: true, isSix: false };
    }

    if (isWicket) {
      // Stumps impact or catch
      if (shot.includes('bowled') || shot.includes('lbw')) return { x: 0, y: 10, isBoundary: false, isSix: false, isWicket: true };
      return { x: -18, y: -15, isBoundary: false, isSix: false, isWicket: true };
    }

    if (runs === 1 || runs === 2 || runs === 3) {
      return { x: 22, y: -16, isBoundary: false, isSix: false };
    }

    // Dot ball
    return { x: -14, y: 2, isBoundary: false, isSix: false };
  }, [lastBall]);

  // Dynamic Shot Trajectory Arcs (color-coded by Shot Aggression + Resulting Distance)
  const allShotArcs = React.useMemo(() => {
    return computeShotTrajectoryArcs(history, {
      stadium,
      battingAggression,
      startX: 50,
      startY: 58,
      maxRadiusX: 45,
      maxRadiusY: 44,
    });
  }, [history, stadium, battingAggression]);

  const visibleShotArcs = React.useMemo(() => {
    if (arcFilterMode === 'off' || allShotArcs.length === 0) return [];
    if (arcFilterMode === 'latest') return allShotArcs.slice(-1);
    if (arcFilterMode === 'over') return allShotArcs.slice(-6);
    if (arcFilterMode === 'boundaries') {
      return allShotArcs.filter((a) => a.isBoundaryFour || a.isBoundarySix);
    }
    return allShotArcs.slice(-24);
  }, [allShotArcs, arcFilterMode]);

  const latestShotArc = allShotArcs.length > 0 ? allShotArcs[allShotArcs.length - 1] : null;

  // Ball Delivery Physical Animation Effect
  useEffect(() => {
    if (!lastBall) return;

    setAnimationStage('runup');
    setBallAnimProgress(0);

    // Auto camera switch & audio event triggers
    if (lastBall.outcome === '6') {
      setCelebrationBanner('SIX');
      setCameraMode('batter_view');
      audioManager.playSixRoar();
      setTimeout(() => {
        audioManager.announceBallEvent({
          runsScored: 6,
          isWicket: false,
          shot: lastBall.shot,
          strikerName: striker.name,
          bowlerName: bowler.name,
        });
      }, 700);
    } else if (lastBall.outcome === '4') {
      setCelebrationBanner('FOUR');
      audioManager.playBoundaryApplause();
      setTimeout(() => {
        audioManager.announceBallEvent({
          runsScored: 4,
          isWicket: false,
          shot: lastBall.shot,
          strikerName: striker.name,
          bowlerName: bowler.name,
        });
      }, 600);
    } else if (lastBall.isWicket) {
      setCelebrationBanner('WICKET');
      setCameraMode('bowler_view');
      audioManager.playWicketFall();
      setTimeout(() => {
        audioManager.announceBallEvent({
          runsScored: 0,
          isWicket: true,
          shot: lastBall.shot,
          strikerName: striker.name,
          bowlerName: bowler.name,
        });
      }, 750);
    } else if (lastBall.runsScored === 0) {
      const shotLower = (lastBall.shot || '').toLowerCase();
      if (shotLower.includes('edge') || shotLower.includes('beat') || shotLower.includes('leave') || Math.random() < 0.35) {
        audioManager.playCloseCallGasp('Beaten Outside Edge');
      }
    }

    // Death overs tension sound check
    const currentOverNum = parseFloat(overs) || 0;
    const reqRRNum = parseFloat(String(requiredRR)) || 0;
    const isDeathPhase = currentOverNum >= 16 || (currentOverNum >= 14 && reqRRNum >= 9.0);
    if (isDeathPhase && !audioManager.isDeathOversMusicPlaying()) {
      audioManager.startDeathOversMusic({ tempoBpm: 130, intensity: 1.0 });
    } else if (!isDeathPhase && audioManager.isDeathOversMusicPlaying() && tacticalPreset !== 'DEATH_OVERS') {
      audioManager.stopDeathOversMusic();
    }

    const t1 = setTimeout(() => {
      setAnimationStage('shot');
    }, 400);

    const t2 = setTimeout(() => {
      setAnimationStage('travel');
      // Highlight closest fielder
      setFielders((prev) =>
        prev.map((f) => {
          const dist = Math.hypot(f.x - ballTargetCoords.x, f.y - ballTargetCoords.y);
          return { ...f, isHighlighted: dist < 18 };
        })
      );
    }, 800);

    const t3 = setTimeout(() => {
      setAnimationStage('impact');
    }, 1400);

    const t4 = setTimeout(() => {
      setAnimationStage('idle');
      setCelebrationBanner(null);
      // Reset camera to broadcast after celebration
      if (lastBall.outcome === '6' || lastBall.isWicket) {
        setCameraMode('broadcast');
      }
    }, 3200);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
    };
  }, [lastBall, ballTargetCoords]);

  // Dynamic Momentum Color Gauge
  const momentumRatio = Math.max(0, Math.min(100, Math.round(50 + (runs - 150) * 0.4 - wickets * 5)));
  const momentumStatus = momentumRatio >= 65 ? 'batting' : momentumRatio <= 40 ? 'bowling' : 'critical';

  // Camera 3D Transform Styles
  const getCameraPerspectiveStyle = () => {
    switch (cameraMode) {
      case 'top_view':
        return { transform: 'rotateX(0deg) rotateZ(0deg) scale(1)' };
      case 'batter_view':
        return { transform: 'perspective(900px) rotateX(54deg) rotateZ(0deg) scale(1.15) translateY(-5%)' };
      case 'bowler_view':
        return { transform: 'perspective(900px) rotateX(54deg) rotateZ(180deg) scale(1.15) translateY(-5%)' };
      case 'fielding_view':
        return { transform: 'perspective(1000px) rotateX(46deg) rotateZ(-22deg) scale(1.08)' };
      case 'tactical_view':
        return { transform: 'perspective(800px) rotateX(25deg) scale(0.98)' };
      case 'broadcast':
      default:
        return { transform: 'perspective(1100px) rotateX(44deg) scale(1.04) translateY(2%)' };
    }
  };

  // AI Tactical Match Insight generator
  const currentAiInsight = React.useMemo(() => {
    if (!lastBall) return 'AI Match Model: Pitch offers 7.2° initial seam; target square boundaries.';
    if (lastBall.outcome === '6') return `AI Insight: Massive ${lastBall.shot} clears fence! Striker dominance in death overs.`;
    if (lastBall.outcome === '4') return `AI Insight: Field gap exploited at ${lastBall.shot}. Bowler adjusting length.`;
    if (lastBall.isWicket) return `AI Insight: Critical breakthrough! Required rate jumps past ${requiredRR}.`;
    if (lastBall.speedKmh > 145) return `AI Insight: Express pace (147.2 KM/H) jamming batter on back foot.`;
    return `AI Insight: Bowler mixing cutters; boundary probability at 28%.`;
  }, [lastBall, requiredRR]);

  // Real-time calculation of Batter Pressure Index & Bowler Pitch Precision
  const numRRR = React.useMemo(() => {
    return typeof requiredRR === 'string' ? parseFloat(requiredRR) || 8.5 : requiredRR;
  }, [requiredRR]);

  // Real-time calculation of Venue Historical Run Rate Par & Momentum Delta
  const venueHistoricalPar = React.useMemo(() => {
    const curve = CricketIntelligenceEngine.calculateVenueHistoricalRunRateCurve(stadium, 20);
    const parsedOver = Math.max(1, Math.min(20, Math.ceil(parseFloat(overs) || 1)));
    return curve[parsedOver - 1] || { historicalAvgRR: (stadium?.avgFirstInningsScore || 168) / 20 };
  }, [stadium, overs]);

  const numCRR = React.useMemo(() => {
    return typeof currentCRR === 'number' ? currentCRR : parseFloat(String(currentCRR)) || 0;
  }, [currentCRR]);

  const momentumDeltaRR = React.useMemo(() => {
    return Number((numCRR - venueHistoricalPar.historicalAvgRR).toFixed(2));
  }, [numCRR, venueHistoricalPar]);

  const currentPressureIndex = React.useMemo(() => {
    return calculateBatterPressure(striker, history, numRRR);
  }, [striker, history, numRRR]);

  const currentPitchPrecision = React.useMemo(() => {
    return calculateBowlerPrecision(bowler, history);
  }, [bowler, history]);

  const currentWicketRisk = React.useMemo(() => {
    return Math.min(96, Math.max(12, Math.round(currentPressureIndex * 0.52 + currentPitchPrecision * 0.48)));
  }, [currentPressureIndex, currentPitchPrecision]);

  // Trigger In-Game Wicket Probability Alert briefly when AI model identifies a high risk of dismissal
  useEffect(() => {
    if (!lastBall || lastBall.isWicket) return;

    // High risk of dismissal detected based on Pressure Index and Pitch Precision
    if (currentWicketRisk >= 68 && (lastBall.runsScored === 0 || numRRR > 10.0)) {
      setShowWicketProbAlert(true);
    }
  }, [lastBall, currentWicketRisk, numRRR]);

  return (
    <div className="relative w-full rounded-3xl border border-sky-500/40 bg-slate-950 overflow-hidden shadow-2xl select-none">
      {/* ========================================================================= */}
      {/* FLOATING TOP BROADCAST SCOREBOARD HUD                                     */}
      {/* ========================================================================= */}
      <div className="absolute top-4 inset-x-4 sm:inset-x-8 z-30 flex flex-wrap items-center justify-between gap-3 pointer-events-none">
        {/* Main Live Score Capsule */}
        <div className="pointer-events-auto flex items-center gap-3 sm:gap-4 rounded-2xl border border-slate-700/80 bg-slate-950/85 px-3 sm:px-4 py-2.5 backdrop-blur-md shadow-2xl">
          <div className="flex items-center gap-2">
            <span className="flex h-2.5 w-2.5 rounded-full bg-rose-500 animate-ping shrink-0" />
            <span className="text-[11px] sm:text-xs font-mono font-bold text-sky-400 uppercase tracking-widest truncate max-w-[140px] sm:max-w-none">
              {stadium.name.toUpperCase()}
            </span>
          </div>

          <div className="h-6 w-px bg-slate-800" />

          {/* Runs / Wickets animated */}
          <div className="flex items-center gap-2">
            <TeamFlag code={teamA.id} size="md" />
            <span className="text-xl sm:text-3xl font-black text-white font-mono tabular-nums tracking-tight">
              {runs}/{wickets}
            </span>
            <span className="text-[11px] sm:text-xs font-mono text-slate-400">({overs} ov)</span>
          </div>

          <div className="hidden md:flex items-center gap-3 text-xs font-mono border-l border-slate-800 pl-3">
            <div>
              <span className="text-[10px] text-slate-500 block">CRR</span>
              <span className="font-bold text-slate-200">{currentCRR}</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-500 block">REQ RR</span>
              <span className="font-bold text-amber-400">{requiredRR}</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-500 block">TARGET</span>
              <span className="font-bold text-white">{targetScore}</span>
            </div>
          </div>

          {/* Responsive Wicket Probability Quick Badge */}
          <button
            onClick={() => {
              setShowWicketProbAlert((prev) => !prev);
              cricketAudio.playBatHit();
            }}
            className={`flex items-center gap-1.5 rounded-xl border px-2 py-1 text-[10px] font-mono font-bold transition-all cursor-pointer shadow-sm ${
              currentWicketRisk >= 68
                ? 'border-rose-500/80 bg-rose-950/80 text-rose-300 animate-pulse shadow-rose-500/25'
                : 'border-slate-800 bg-slate-900/80 text-slate-300 hover:text-white'
            }`}
            title="Inspect In-Game Dismissal Probability Radar"
          >
            <span className={`h-1.5 w-1.5 rounded-full ${currentWicketRisk >= 68 ? 'bg-rose-500 animate-ping' : 'bg-slate-400'}`} />
            <span>HAZARD: <strong className={currentWicketRisk >= 68 ? 'text-rose-400' : 'text-slate-200'}>{currentWicketRisk}%</strong></span>
          </button>
        </div>

        {/* Floating Active Striker & Bowler Card */}
        <div className="pointer-events-auto hidden lg:flex items-center gap-3 rounded-2xl border border-slate-700/80 bg-slate-950/85 px-4 py-2 backdrop-blur-md shadow-2xl text-xs font-mono">
          <div>
            <div className="flex items-center gap-1.5 text-white font-bold">
              <span className="h-2 w-2 rounded-full bg-sky-400" />
              <span>{striker.name.split(' ')[0]} *</span>
              <span className="text-sky-400 tabular-nums">{Math.floor(runs * 0.44)} ({Math.floor(runs * 0.28)})</span>
            </div>
            <div className="text-[11px] text-slate-400">
              Bowler: <strong className="text-rose-400">{bowler.name.split(' ')[0]}</strong> · 2/24
            </div>
          </div>

          {/* In-Game Wicket Probability Alert HUD Trigger Button */}
          <button
            onClick={() => {
              setShowWicketProbAlert((prev) => !prev);
              cricketAudio.playBatHit();
            }}
            className={`flex items-center gap-1.5 rounded-xl border px-2.5 py-1 text-[11px] font-mono transition-all cursor-pointer shadow-md ${
              currentWicketRisk >= 68
                ? 'border-rose-500 bg-rose-950/90 text-rose-300 animate-pulse shadow-rose-500/30'
                : 'border-rose-500/40 bg-rose-950/50 text-rose-300 hover:bg-rose-900/60'
            }`}
            title="Inspect In-Game Wicket Probability Overlay"
          >
            <span className="h-2 w-2 rounded-full bg-rose-500 animate-ping" />
            <span>RADAR {currentWicketRisk}%</span>
          </button>

          {/* Quick DRS Trigger on Scoreboard */}
          {onTriggerDrs && (
            <button
              onClick={onTriggerDrs}
              className="ml-1 rounded-xl bg-gradient-to-r from-sky-500 to-indigo-500 px-3 py-1.5 text-xs font-black text-slate-950 hover:from-sky-400 hover:to-indigo-400 transition-all shadow-md cursor-pointer"
            >
              DRS
            </button>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SOUND-REACTIVE STADIUM ACOUSTICS VISUALIZER HUD                           */}
      {/* ========================================================================= */}
      <div className={`absolute left-4 sm:left-6 z-25 max-w-[260px] sm:max-w-xs pointer-events-auto transition-all duration-300 ${
        isMomentumExpanded ? 'top-[440px] opacity-40 hover:opacity-100' : 'top-20'
      }`}>
        <StadiumAudioVisualizer
          lastBallOutcome={lastBall?.outcome}
          isWicket={lastBall?.isWicket}
          isSix={lastBall?.outcome === '6' || ballTargetCoords.isSix}
          isFour={lastBall?.outcome === '4' || (ballTargetCoords.isBoundary && !ballTargetCoords.isSix)}
          isDeathOver={parseFloat(overs) >= 16}
          currentOver={parseFloat(overs)}
          requiredRR={parseFloat(String(requiredRR)) || 0}
        />
      </div>

      {/* ========================================================================= */}
      {/* FLOATING CAMERA & LIGHTING CONTROLS HUD                                   */}
      {/* ========================================================================= */}
      <div className="absolute top-20 right-4 z-30 flex flex-col items-end gap-2">
        {/* Camera Selector Pill */}
        <div className="flex flex-col gap-1 rounded-2xl border border-slate-800 bg-slate-950/90 p-1.5 shadow-2xl backdrop-blur-md text-[11px] font-mono">
          <div className="flex items-center justify-between px-2 py-1 text-[10px] text-slate-400 font-bold">
            <span className="flex items-center gap-1">
              <Camera className="h-3 w-3 text-sky-400" />
              <span>3D CAM</span>
            </span>
          </div>

          {[
            { id: 'broadcast', label: '🎥 Broadcast' },
            { id: 'top_view', label: '🎥 Top View' },
            { id: 'batter_view', label: '🎥 Batter' },
            { id: 'bowler_view', label: '🎥 Bowler' },
            { id: 'fielding_view', label: '🎥 Wide' },
            { id: 'tactical_view', label: '🎥 Tactical' },
          ].map((c) => (
            <button
              key={c.id}
              onClick={() => {
                setCameraMode(c.id as CameraMode);
                cricketAudio.playBatHit();
              }}
              className={`rounded-lg px-2.5 py-1 text-left transition-colors cursor-pointer ${
                cameraMode === c.id
                  ? 'bg-sky-500 text-slate-950 font-bold'
                  : 'text-slate-400 hover:text-white hover:bg-slate-900'
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>

        {/* Real-time Momentum Shift Quick-Trigger */}
        <button
          onClick={() => {
            cricketAudio.playBatHit();
            setShowMomentumModal(true);
          }}
          className={`flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-[11px] font-mono transition-all backdrop-blur-md shadow-xl cursor-pointer ${
            momentumDeltaRR >= 0
              ? 'border-emerald-500/40 bg-emerald-950/70 text-emerald-300 hover:border-emerald-400'
              : 'border-amber-500/40 bg-amber-950/70 text-amber-300 hover:border-amber-400'
          }`}
          title="Inspect real-time Momentum Shift dual-line chart"
        >
          <TrendingUp className={`h-3 w-3 ${momentumDeltaRR >= 0 ? 'text-emerald-400' : 'text-amber-400'} animate-pulse`} />
          <span className="font-bold">
            MOMENTUM: {momentumDeltaRR >= 0 ? `+${momentumDeltaRR}` : momentumDeltaRR} RPO
          </span>
        </button>

        {/* Day / Night Atmospheric Switch */}
        <button
          onClick={() => {
            const nextTod: TimeOfDay =
              timeOfDay === 'night'
                ? 'match_time'
                : timeOfDay === 'match_time'
                ? 'day'
                : 'night';
            setTimeOfDay(nextTod);
            cricketAudio.playBatHit();
          }}
          className="flex items-center gap-1.5 rounded-xl border border-slate-800 bg-slate-950/90 px-3 py-1.5 text-[11px] font-mono text-slate-300 hover:text-white backdrop-blur-md shadow-xl cursor-pointer"
        >
          {timeOfDay === 'night' ? (
            <Moon className="h-3 w-3 text-sky-400" />
          ) : timeOfDay === 'match_time' ? (
            <Activity className="h-3 w-3 text-emerald-400 animate-pulse" />
          ) : (
            <Sun className="h-3 w-3 text-amber-400" />
          )}
          <span>
            {timeOfDay === 'night'
              ? 'Night Floodlights'
              : timeOfDay === 'match_time'
              ? 'Match Time Auto Shift'
              : 'Day Sun'}
          </span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* 3D CRICKET STADIUM GROUND (CENTER CANVAS)                                  */}
      {/* ========================================================================= */}
      <div
        ref={groundRef}
        className="relative w-full h-[540px] sm:h-[620px] md:h-[680px] flex items-center justify-center overflow-hidden transition-all duration-700 ease-out"
        style={{
          background:
            timeOfDay === 'night'
              ? 'radial-gradient(circle at 50% 50%, #032115 0%, #02140d 45%, #050b14 85%, #02060d 100%)'
              : timeOfDay === 'golden_hour'
              ? 'radial-gradient(circle at 50% 50%, #173822 0%, #1f271d 45%, #181313 85%, #080608 100%)'
              : timeOfDay === 'dusk'
              ? 'radial-gradient(circle at 50% 50%, #07291a 0%, #0b1a2e 45%, #0d1322 85%, #03060f 100%)'
              : timeOfDay === 'match_time'
              ? (parseFloat(overs) < 6
                  ? 'radial-gradient(circle at 50% 50%, #0a472a 0%, #06301c 45%, #0a1f33 85%, #040d18 100%)'
                  : parseFloat(overs) < 13
                  ? 'radial-gradient(circle at 50% 50%, #173822 0%, #1f271d 45%, #181313 85%, #080608 100%)'
                  : parseFloat(overs) < 17
                  ? 'radial-gradient(circle at 50% 50%, #07291a 0%, #0b1a2e 45%, #0d1322 85%, #03060f 100%)'
                  : 'radial-gradient(circle at 50% 50%, #032115 0%, #02140d 45%, #050b14 85%, #02060d 100%)')
              : 'radial-gradient(circle at 50% 50%, #0a472a 0%, #06301c 45%, #0a1f33 85%, #040d18 100%)',
        }}
      >
        {/* Stadium Stands & Animated Crowd Tiered Rings */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-70">
          {/* Outer stadium concrete rim */}
          <div className="absolute inset-4 rounded-[48%] border-8 border-slate-800/80 shadow-[inset_0_0_80px_rgba(0,0,0,0.8)]" />

          {/* Crowd silhouettes dotting the stands */}
          <div className="absolute inset-6 rounded-[48%] border border-emerald-500/10 flex items-center justify-center">
            <div className="absolute top-4 inset-x-12 flex justify-around opacity-40 text-[9px] font-mono text-slate-500">
              <span>STAND A · KENSINGTON END</span>
              <span>STAND B · CLOCK TOWER</span>
            </div>
          </div>
        </div>

        {/* Dynamic Smart Stadium Lighting (Floodlight Towers, Kelvin Color Temp & Match FX) */}
        <SmartStadiumLighting
          timeOfDay={timeOfDay}
          onTimeOfDayChange={setTimeOfDay}
          lastBall={lastBall}
          matchOvers={overs}
          totalOvers={20}
          isMatchActive={isMatchActive}
          isDeathOvers={tacticalPreset === 'DEATH_OVERS'}
          activeCelebration={celebrationBanner}
          stadiumName={stadium.name}
          showControlDeck={true}
        />

        {/* ======================================================================= */}
        {/* 3D PERSPECTIVE GROUND STAGE CONTAINER                                   */}
        {/* ======================================================================= */}
        <div
          className="relative w-[340px] h-[340px] sm:w-[460px] sm:h-[460px] md:w-[540px] md:h-[540px] transition-transform duration-700 ease-out flex items-center justify-center"
          style={getCameraPerspectiveStyle()}
        >
          {/* 1. Outer Grass Oval with Alternating Mower Ring Cuts */}
          <div className="absolute inset-0 rounded-[48%] bg-gradient-to-b from-[#0a4d2e] via-[#073d24] to-[#042817] shadow-[0_20px_50px_rgba(0,0,0,0.8)] border border-emerald-500/30 overflow-hidden flex items-center justify-center">
            {/* Alternating Radial Cut Stripes */}
            <div className="absolute inset-0 opacity-20 pointer-events-none">
              {[0, 30, 60, 90, 120, 150].map((deg) => (
                <div
                  key={deg}
                  className="absolute inset-0 bg-emerald-300/10"
                  style={{ transform: `rotate(${deg}deg)` }}
                />
              ))}
            </div>

            {/* 2. Boundary Rope with Glowing Neon Cushions */}
            <div
              className={`absolute inset-3 rounded-[48%] border-2 transition-all duration-300 ${
                celebrationBanner === 'FOUR'
                  ? 'border-amber-400 shadow-[0_0_40px_#f59e0b]'
                  : celebrationBanner === 'SIX'
                  ? 'border-sky-400 shadow-[0_0_50px_#38bdf8]'
                  : 'border-white/40 shadow-inner'
              }`}
            />

            {/* Sound-Reactive Acoustic Shockwave Eruption (SIX, FOUR, WICKET) */}
            {celebrationBanner && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
                <div
                  className={`absolute rounded-full animate-ping ${
                    celebrationBanner === 'SIX'
                      ? 'w-64 h-64 border-4 border-amber-400 bg-amber-400/25 shadow-[0_0_80px_#f59e0b]'
                      : celebrationBanner === 'WICKET'
                      ? 'w-64 h-64 border-4 border-rose-500 bg-rose-500/25 shadow-[0_0_80px_#ef4444]'
                      : 'w-56 h-56 border-4 border-sky-400 bg-sky-400/25 shadow-[0_0_60px_#38bdf8]'
                  }`}
                />
              </div>
            )}

            {/* Tense Final Over Acoustic Aura (Overs 16-20) */}
            {parseFloat(overs) >= 16 && (
              <div className="absolute inset-2 rounded-[48%] border border-rose-500/35 animate-pulse pointer-events-none shadow-[inset_0_0_35px_rgba(244,63,94,0.18)]" />
            )}

            {/* 3. 30-Yard Inner Circle with White Markers */}
            <div className="absolute inset-16 sm:inset-22 md:inset-26 rounded-[48%] border border-dashed border-white/35 flex items-center justify-center pointer-events-none">
              <span className="absolute top-2 text-[8px] font-mono text-white/40 tracking-wider">
                30 YARD CIRCLE
              </span>
            </div>

            {/* 4. Center 22-Yard Pitch Strip */}
            <div className="relative w-12 h-36 sm:w-16 sm:h-48 md:w-20 md:h-56 rounded-md bg-gradient-to-b from-[#8a5d3b] via-[#9e6d45] to-[#8a5d3b] border border-amber-600/50 shadow-2xl flex flex-col justify-between p-1">
              {/* Bowling Crease (Top / Bowler End) */}
              <div className="border-b border-white/60 pb-0.5 text-center">
                <div className="h-0.5 w-full bg-white shadow-sm" />
                <div className="flex justify-center gap-1 mt-0.5">
                  <div className="h-2 w-0.5 bg-amber-200" />
                  <div className="h-2 w-0.5 bg-amber-200" />
                  <div className="h-2 w-0.5 bg-amber-200" />
                </div>
              </div>

              {/* Pitch Grass & Seam Lines */}
              <div className="flex-1 flex items-center justify-center">
                <div className="w-0.5 h-full bg-amber-500/30" />
              </div>

              {/* Popping Crease (Bottom / Striker End) */}
              <div className="border-t border-white/60 pt-0.5 text-center">
                <div className="flex justify-center gap-1 mb-0.5">
                  <div className={`h-2.5 w-0.5 transition-transform ${animationStage === 'impact' && lastBall?.isWicket ? 'rotate-45 bg-rose-400' : 'bg-amber-200'}`} />
                  <div className={`h-2.5 w-0.5 transition-transform ${animationStage === 'impact' && lastBall?.isWicket ? '-rotate-45 bg-rose-400' : 'bg-amber-200'}`} />
                  <div className={`h-2.5 w-0.5 transition-transform ${animationStage === 'impact' && lastBall?.isWicket ? 'scale-0' : 'bg-amber-200'}`} />
                </div>
                <div className="h-0.5 w-full bg-white shadow-sm" />
              </div>

              {/* Striker & Bowler On-Pitch Avatars */}
              <div className="absolute top-2 left-1/2 -translate-x-1/2 -translate-y-1/2">
                <span className="text-[8px] font-mono font-bold text-rose-300 bg-slate-950/80 px-1 rounded shadow">
                  {bowler.name.split(' ')[0]}
                </span>
              </div>
              <div className="absolute bottom-2 left-1/2 -translate-x-1/2 translate-y-1/2">
                <span className="text-[8px] font-mono font-bold text-sky-300 bg-slate-950/80 px-1 rounded shadow">
                  {striker.name.split(' ')[0]} *
                </span>
              </div>
            </div>

            {/* =================================================================== */}
            {/* DYNAMIC FIELDERS (DRAGGABLE & MOVE ON BALL HIT)                     */}
            {/* =================================================================== */}
            {fielders.map((fielder) => {
              // Convert % (-50 to +50) to px offset from center
              const topPercent = 50 + fielder.y;
              const leftPercent = 50 + fielder.x;

              return (
                <div
                  key={fielder.id}
                  style={{ top: `${topPercent}%`, left: `${leftPercent}%` }}
                  className={`absolute -translate-x-1/2 -translate-y-1/2 z-20 transition-all duration-500 cursor-grab active:cursor-grabbing group`}
                  onMouseDown={() => setActiveDraggingFielderId(fielder.id)}
                >
                  {/* Fielder Silhouette Node */}
                  <div
                    className={`relative flex flex-col items-center justify-center transition-all ${
                      fielder.isHighlighted
                        ? 'scale-125 drop-shadow-[0_0_12px_#38bdf8]'
                        : 'group-hover:scale-110'
                    }`}
                  >
                    {/* Ring highlight when ball approaches */}
                    {fielder.isHighlighted && (
                      <div className="absolute -inset-2 rounded-full border border-sky-400 animate-ping pointer-events-none" />
                    )}

                    {/* Fielder Dot Avatar */}
                    <div className="h-3.5 w-3.5 sm:h-4 sm:w-4 rounded-full bg-rose-500 border border-white shadow-lg flex items-center justify-center">
                      <div className="h-1.5 w-1.5 rounded-full bg-white" />
                    </div>

                    {/* Fielder Name Badge */}
                    <span className="mt-0.5 rounded bg-slate-950/90 border border-slate-700 px-1 py-0.2 text-[8px] font-mono text-white whitespace-nowrap opacity-90 group-hover:opacity-100">
                      {fielder.role}
                    </span>
                  </div>
                </div>
              );
            })}

            {/* =================================================================== */}
            {/* DYNAMIC COLOR-CODED SHOT TRAJECTORY ARCS (AGGRESSION × DISTANCE)    */}
            {/* =================================================================== */}
            {visibleShotArcs.length > 0 && (
              <svg
                viewBox="0 0 100 100"
                className="absolute inset-0 w-full h-full z-15 overflow-visible pointer-events-none"
                aria-label="Dynamic color-coded shot trajectory arcs"
              >
                <defs>
                  {visibleShotArcs.map((arc) => (
                    <linearGradient
                      key={`grad-${arc.id}`}
                      id={`sim-arc-grad-${arc.id}`}
                      x1={`${arc.startX}%`}
                      y1={`${arc.startY}%`}
                      x2={`${arc.endX}%`}
                      y2={`${arc.endY}%`}
                      gradientUnits="userSpaceOnUse"
                    >
                      <stop offset="0%" stopColor={arc.glowColor} stopOpacity="0.95" />
                      <stop offset="55%" stopColor={arc.strokeColor} stopOpacity="1" />
                      <stop offset="100%" stopColor={arc.tipColor} stopOpacity="1" />
                    </linearGradient>
                  ))}
                </defs>

                {visibleShotArcs.map((arc, idx) => {
                  const isInspected = hoveredArc?.id === arc.id;
                  const recencyAlpha = arc.isLatest
                    ? 1
                    : Math.max(0.38, 0.42 + ((idx + 1) / visibleShotArcs.length) * 0.48);

                  return (
                    <g
                      key={arc.id}
                      opacity={hoveredArc && !isInspected ? 0.22 : recencyAlpha}
                      className="transition-opacity duration-200"
                    >
                      {/* Ground-plane shadow line */}
                      <line
                        x1={arc.startX}
                        y1={arc.startY}
                        x2={arc.endX}
                        y2={arc.endY}
                        stroke="rgba(2, 6, 23, 0.55)"
                        strokeWidth={arc.isLatest ? 0.85 : 0.5}
                        strokeDasharray="1.6 1.4"
                      />

                      {/* Soft outer luminescence for latest or boundary arcs */}
                      {(arc.isLatest || arc.isBoundarySix || isInspected) && (
                        <path
                          d={`M ${arc.startX} ${arc.startY} Q ${arc.ctrlX} ${arc.ctrlY} ${arc.endX} ${arc.endY}`}
                          fill="none"
                          stroke={arc.strokeColor}
                          strokeWidth={arc.strokeWidth + 1.8}
                          strokeOpacity="0.28"
                          strokeLinecap="round"
                        />
                      )}

                      {/* Primary Parabolic Shot Trajectory Arc */}
                      <path
                        d={`M ${arc.startX} ${arc.startY} Q ${arc.ctrlX} ${arc.ctrlY} ${arc.endX} ${arc.endY}`}
                        fill="none"
                        stroke={`url(#sim-arc-grad-${arc.id})`}
                        strokeWidth={isInspected ? arc.strokeWidth + 0.7 : arc.strokeWidth}
                        strokeLinecap="round"
                        className="pointer-events-auto cursor-pointer"
                        onMouseEnter={() => setHoveredArc(arc)}
                        onMouseLeave={() => setHoveredArc(null)}
                      />

                      {/* Landing / Rope Impact Marker */}
                      <circle
                        cx={arc.endX}
                        cy={arc.endY}
                        r={arc.isBoundarySix ? 1.85 : arc.isBoundaryFour ? 1.5 : 1.15}
                        fill={arc.isWicket ? '#f43f5e' : arc.strokeColor}
                        stroke="#ffffff"
                        strokeWidth="0.32"
                        className="pointer-events-auto cursor-pointer"
                        onMouseEnter={() => setHoveredArc(arc)}
                        onMouseLeave={() => setHoveredArc(null)}
                      />

                      {/* Live Distance Callout on Latest Shot or Hovered Arc */}
                      {(arc.isLatest || isInspected) && (
                        <g pointerEvents="none">
                          <rect
                            x={Math.max(4, Math.min(82, arc.endX - 8))}
                            y={Math.max(3, arc.endY - 6.8)}
                            width="16"
                            height="4.6"
                            rx="1.2"
                            fill="rgba(2, 6, 23, 0.88)"
                            stroke={arc.strokeColor}
                            strokeWidth="0.35"
                          />
                          <text
                            x={Math.max(12, Math.min(90, arc.endX))}
                            y={Math.max(6.2, arc.endY - 3.6)}
                            textAnchor="middle"
                            fill="#f8fafc"
                            fontSize="2.35"
                            fontFamily="monospace"
                            fontWeight="bold"
                          >
                            {arc.distanceMeters}m·{arc.isWicket ? 'W' : `${arc.runs}r`}
                          </text>
                        </g>
                      )}
                    </g>
                  );
                })}
              </svg>
            )}

            {/* =================================================================== */}
            {/* LIVE BALL TRAJECTORY & FLYING PARTICLE                              */}
            {/* =================================================================== */}
            {animationStage !== 'idle' && (
              <div
                className="absolute z-25 pointer-events-none transition-all duration-700 ease-out"
                style={{
                  top: `${
                    animationStage === 'runup'
                      ? 35
                      : latestShotArc
                      ? latestShotArc.endY
                      : 50 + ballTargetCoords.y
                  }%`,
                  left: `${
                    animationStage === 'runup'
                      ? 50
                      : latestShotArc
                      ? latestShotArc.endX
                      : 50 + ballTargetCoords.x
                  }%`,
                }}
              >
                {/* 3D Ball with Aggression-Distance Color-Matched Glow */}
                <div className="relative flex items-center justify-center">
                  <div
                    style={{
                      backgroundColor: latestShotArc?.strokeColor || '#e11d48',
                      boxShadow: `0 0 16px ${latestShotArc?.strokeColor || '#e11d48'}`,
                    }}
                    className={`rounded-full border border-white transition-all ${
                      ballTargetCoords.isSix
                        ? 'h-5 w-5 scale-150 animate-bounce'
                        : 'h-3.5 w-3.5'
                    }`}
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ======================================================================= */}
        {/* IN-GAME WICKET PROBABILITY OVERLAY (TRIGGERED BRIEFLY ON HIGH RISK)     */}
        {/* ======================================================================= */}
        {showWicketProbAlert && (
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 pointer-events-auto px-4 w-full max-w-md">
            <InGameWicketProbabilityOverlay
              batter={striker}
              bowler={bowler}
              pressureIndex={currentPressureIndex}
              pitchPrecision={currentPitchPrecision}
              currentOver={overs}
              requiredRR={numRRR}
              recentBalls={history}
              onDismiss={() => setShowWicketProbAlert(false)}
            />
          </div>
        )}

        {/* ======================================================================= */}
        {/* CINEMATIC CELEBRATION OVERLAY (SIX / FOUR / WICKET)                    */}
        {/* ======================================================================= */}
        {celebrationBanner && (
          <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/50 backdrop-blur-xs animate-in zoom-in-75 duration-300 pointer-events-none">
            <div
              className={`rounded-3xl border-2 px-10 py-5 text-center shadow-2xl ${
                celebrationBanner === 'SIX'
                  ? 'border-amber-400 bg-amber-500/20 text-amber-300 shadow-amber-500/50'
                  : celebrationBanner === 'FOUR'
                  ? 'border-sky-400 bg-sky-500/20 text-sky-300 shadow-sky-500/50'
                  : 'border-rose-500 bg-rose-500/20 text-rose-400 shadow-rose-500/50'
              }`}
            >
              <span className="text-5xl sm:text-7xl font-black tracking-widest block drop-shadow-md">
                {celebrationBanner}!
              </span>
              <span className="text-xs sm:text-sm font-mono font-bold tracking-wider mt-1 block text-white">
                {celebrationBanner === 'SIX'
                  ? 'MASSIVE MAXIMUM INTO THE UPPER DECK!'
                  : celebrationBanner === 'FOUR'
                  ? 'RACES PAST THE ROPES FOR FOUR RUNS!'
                  : 'CLEAN TIMBER! WICKET HAS FALLEN!'}
              </span>
            </div>
          </div>
        )}

        {/* ======================================================================= */}
        {/* FLOATING AI MATCH INSIGHT PANEL                                         */}
        {/* ======================================================================= */}
        <div className="absolute bottom-18 left-4 sm:left-6 z-30 max-w-xs sm:max-w-sm rounded-2xl border border-sky-500/40 bg-slate-950/85 p-3.5 backdrop-blur-md shadow-2xl space-y-1">
          <div className="flex items-center justify-between text-[10px] font-mono font-bold text-sky-400">
            <span className="flex items-center gap-1.5">
              <Sparkles className="h-3 w-3" />
              <span>AI TACTICAL ENGINE</span>
            </span>
            <span className="text-slate-400">PITCH WEAR: 6.8°</span>
          </div>
          <p className="text-xs text-slate-200 font-sans leading-snug font-medium">
            {currentAiInsight}
          </p>
        </div>

        {/* ======================================================================= */}
        {/* REAL-TIME MOMENTUM SHIFT INDICATOR (DUAL-LINE RUN-RATE vs VENUE PAR)    */}
        {/* ======================================================================= */}
        <div className={`absolute top-4 left-4 z-30 transition-all duration-300 pointer-events-auto ${
          isMomentumExpanded ? 'w-[320px] sm:w-[460px] md:w-[500px] shadow-2xl' : 'max-w-[280px] sm:max-w-xs'
        }`}>
          <MomentumShiftIndicator
            history={history}
            stadium={stadium}
            currentRuns={runs}
            currentWickets={wickets}
            currentOvers={overs}
            targetScore={targetScore}
            totalOvers={20}
            isExpanded={isMomentumExpanded}
            onToggleExpand={setIsMomentumExpanded}
            onOpenModal={() => setShowMomentumModal(true)}
          />
        </div>

        {/* ======================================================================= */}
        {/* FLOATING SHOT DECISION ADVISOR HUD (DEFENSE vs ATTACK PROBABILITY)     */}
        {/* ======================================================================= */}
        <div className="absolute bottom-18 right-4 sm:right-6 z-30 max-w-[280px] sm:max-w-xs md:max-w-sm pointer-events-auto">
          <ShotDecisionAdvisorHUD
            lastBall={lastBall}
            bowler={bowler}
            striker={striker}
            stadium={stadium}
            requiredRR={requiredRR}
            wickets={wickets}
            onOpenFullAdvisor={() => setShowShotAdvisorModal(true)}
          />
        </div>

        {/* ======================================================================= */}
        {/* DYNAMIC MOMENTUM RIBBON (AROUND BOTTOM OF STADIUM)                      */}
        {/* ======================================================================= */}
        <div
          onClick={() => {
            cricketAudio.playBatHit();
            setShowMomentumModal(true);
          }}
          title="Click to view Venue Momentum Shift Dual-Line Chart"
          className="absolute bottom-4 inset-x-4 sm:inset-x-8 z-30 flex items-center justify-between gap-3 rounded-2xl border border-slate-800 bg-slate-950/90 px-4 py-2 text-xs font-mono backdrop-blur-md shadow-2xl cursor-pointer hover:border-cyan-500/50 hover:bg-slate-900/95 transition-all"
        >
          <div className="flex items-center gap-2">
            <Flame
              className={`h-4 w-4 ${
                momentumDeltaRR >= 0
                  ? 'text-emerald-400'
                  : 'text-amber-400'
              }`}
            />
            <span className="text-[11px] font-bold text-slate-300">VENUE MOMENTUM:</span>
            <span
              className={`text-[10px] px-2 py-0.5 rounded font-bold ${
                momentumDeltaRR >= 0
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                  : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
              }`}
            >
              {momentumDeltaRR >= 0 ? `+${momentumDeltaRR}` : momentumDeltaRR} RPO vs {stadium.name.split(' ')[0]} Par
            </span>
          </div>

          {/* Dynamic Gauge Bar */}
          <div className="flex-1 mx-2 h-2 rounded-full bg-slate-900 overflow-hidden flex shadow-inner">
            <div
              className={`h-full transition-all duration-500 ${
                momentumDeltaRR >= 0
                  ? 'bg-gradient-to-r from-cyan-500 to-emerald-400'
                  : 'bg-gradient-to-r from-amber-500 to-rose-500'
              }`}
              style={{ width: `${Math.max(10, Math.min(95, 50 + momentumDeltaRR * 12))}%` }}
            />
          </div>

          <span
            className={`font-bold text-[11px] flex items-center gap-1.5 ${
              momentumDeltaRR >= 0 ? 'text-emerald-400' : 'text-amber-400'
            }`}
          >
            {momentumDeltaRR >= 0
              ? '🔥 AHEAD OF VENUE PAR'
              : '⚠️ TRAILING VENUE PAR'}
            <ChevronRight className="h-3 w-3 text-slate-500" />
          </span>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SHOT TRAJECTORY ARCS LEGEND & FILTER STRIP (AGGRESSION × DISTANCE)        */}
      {/* ========================================================================= */}
      <div className="border-t border-slate-800/90 bg-[#040a17] px-3 sm:px-4 py-2.5 flex flex-wrap items-center justify-between gap-2.5 text-[11px] font-mono">
        <div className="flex flex-wrap items-center gap-3">
          <span className="font-bold text-slate-200 uppercase tracking-wider">
            Shot Arcs (Aggression × Distance):
          </span>
          <span className="inline-flex items-center gap-1 text-slate-300">
            <span className="h-2.5 w-2.5 rounded-full bg-[#14b8a6]" />
            <span>Dot (&lt;18m)</span>
          </span>
          <span className="inline-flex items-center gap-1 text-emerald-300 font-semibold">
            <span className="h-2.5 w-2.5 rounded-full bg-[#16a34a]" />
            <span>Single (Green)</span>
          </span>
          <span className="inline-flex items-center gap-1 text-amber-300">
            <span className="h-2.5 w-2.5 rounded-full bg-[#eab308]" />
            <span>2s/3s (42–64m)</span>
          </span>
          <span className="inline-flex items-center gap-1 text-orange-300">
            <span className="h-2.5 w-2.5 rounded-full bg-[#f97316]" />
            <span>Four (68–77m)</span>
          </span>
          <span className="inline-flex items-center gap-1 text-red-400 font-bold">
            <span className="h-2.5 w-2.5 rounded-full bg-[#991b1b] ring-1 ring-red-400/70" />
            <span>Six (Deep Red 80m+)</span>
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {(hoveredArc || latestShotArc) && (
            <span className="text-[10px] text-slate-300 tabular-nums mr-1">
              {(hoveredArc || latestShotArc)!.overLabel} ov ·{' '}
              <strong style={{ color: (hoveredArc || latestShotArc)!.strokeColor }}>
                {(hoveredArc || latestShotArc)!.distanceMeters}m
              </strong>{' '}
              · Agg {(hoveredArc || latestShotArc)!.aggressionScore}% (
              {(hoveredArc || latestShotArc)!.aggressionLabel})
            </span>
          )}
          <div
            role="group"
            aria-label="Shot trajectory arc filter"
            className="inline-flex items-center rounded-lg border border-slate-800 bg-slate-900 p-0.5 text-[10px]"
          >
            {(
              [
                { id: 'all', label: 'All Shots' },
                { id: 'over', label: 'Last 6' },
                { id: 'boundaries', label: '4s & 6s' },
                { id: 'latest', label: 'Latest' },
                { id: 'off', label: 'Hide' },
              ] as const
            ).map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setArcFilterMode(f.id)}
                className={`px-2 py-0.5 rounded font-bold transition-colors cursor-pointer ${
                  arcFilterMode === f.id
                    ? 'bg-cyan-500 text-slate-950'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* QUICK TACTICAL FIELD PRESET BUTTONS BAR                                   */}
      {/* ========================================================================= */}
      <div className="border-t border-slate-800 bg-slate-950/95 p-3 sm:p-4 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2">
          <Shield className="h-4 w-4 text-sky-400" />
          <span className="font-bold text-white font-mono">FIELD TACTICS:</span>
        </div>

        <div className="flex flex-wrap items-center gap-1.5 font-mono">
          {[
            { id: 'BALANCED', label: 'Balanced Ring' },
            { id: 'ATTACK', label: 'Attacking Slips' },
            { id: 'DEFENSIVE', label: 'Boundary Defense' },
            { id: 'DEATH_OVERS', label: 'Death Overs 16-20' },
            { id: 'PROTECT_SIX', label: 'Protect Sixes' },
            { id: 'WICKET_HUNT', label: 'Wicket Hunt' },
          ].map((preset) => (
            <button
              key={preset.id}
              onClick={() => applyPreset(preset.id as TacticalPreset)}
              className={`rounded-lg px-3 py-1.5 font-bold transition-all cursor-pointer ${
                tacticalPreset === preset.id
                  ? 'bg-sky-500 text-slate-950 shadow-md shadow-sky-500/25'
                  : 'bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-850'
              }`}
            >
              {preset.label}
            </button>
          ))}
        </div>

        {/* Reset Field */}
        <button
          onClick={() => applyPreset('BALANCED')}
          className="flex items-center gap-1 text-[11px] font-mono text-slate-500 hover:text-slate-300 cursor-pointer"
        >
          <RotateCcw className="h-3 w-3" />
          <span>Reset Field</span>
        </button>
      </div>

      {/* SHOT DECISION ADVISOR FULL MODAL OVERLAY */}
      {showShotAdvisorModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200">
          <div className="relative w-full max-w-4xl max-h-[92vh] overflow-y-auto rounded-3xl">
            <button
              onClick={() => setShowShotAdvisorModal(false)}
              className="absolute top-4 right-4 z-20 rounded-full bg-slate-900/90 border border-slate-700 p-2 text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
            <ShotDecisionAdvisor
              initialSpeed={lastBall?.speedKmh || (bowler?.role?.includes('Spin') ? 88 : 142)}
              initialBounce={stadium?.pitchType === 'Pace & Bounce' ? 92 : stadium?.pitchType === 'Slow & Turning' ? 69 : 84}
              initialLength={lastBall?.length || 'Good Length'}
              bowler={bowler}
              striker={striker}
              stadium={stadium}
              requiredRR={typeof requiredRR === 'string' ? parseFloat(requiredRR) || 8.5 : requiredRR}
              wickets={wickets}
              onApplyTactic={() => setShowShotAdvisorModal(false)}
            />
          </div>
        </div>
      )}

      {/* REAL-TIME MOMENTUM SHIFT ENGINE FULL MODAL OVERLAY */}
      {showMomentumModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200">
          <div className="relative w-full max-w-2xl max-h-[92vh] overflow-y-auto rounded-3xl border border-cyan-500/40 bg-slate-950 p-4 sm:p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
                  <TrendingUp className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-black text-white font-mono">
                    REAL-TIME MOMENTUM SHIFT ENGINE
                  </h3>
                  <p className="text-xs text-slate-400 font-sans">
                    Dual-line trajectory analysis: Live Run Rate vs Historical Match Averages for {stadium.name}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowMomentumModal(false)}
                className="rounded-xl border border-slate-800 bg-slate-900 p-2 text-slate-400 hover:text-white hover:border-slate-700 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <MomentumShiftIndicator
              history={history}
              stadium={stadium}
              currentRuns={runs}
              currentWickets={wickets}
              currentOvers={overs}
              targetScore={targetScore}
              totalOvers={20}
              defaultExpanded={true}
              isModal={true}
              onCloseModal={() => setShowMomentumModal(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
};
