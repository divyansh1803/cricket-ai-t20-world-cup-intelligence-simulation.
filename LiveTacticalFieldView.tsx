import React, { useState, useMemo } from 'react';
import { Player, Team, BallEvent, Stadium } from '../../types/cricket';
import { CountryFlag, HIGH_RES_FLAG_URLS, PlayerCardAvatar } from '../common/CricketIdentity';
import { MomentumShiftIndicator } from './MomentumShiftIndicator';
import { cricketAudio } from '../../utils/audioSystem';
import {
  Shield,
  Zap,
  Target,
  Sparkles,
  Layers,
  Activity,
  Eye,
  Crosshair,
  TrendingUp,
  AlertTriangle,
  Info,
  Maximize2,
  Sliders,
  Gauge,
  RotateCcw,
} from 'lucide-react';

export type TacticalPreset =
  | 'BALANCED'
  | 'ATTACKING_POWERPLAY'
  | 'DEATH_OVERS_SHIELD'
  | 'SPIN_TRAP'
  | 'BOUNCER_ENFORCER';

export type DeliveryPredictionType =
  | 'WIDE_YORKER'
  | 'SLOWER_CUTTER'
  | 'RIB_BOUNCER'
  | 'INSWING_FULL'
  | 'GOOD_LENGTH_OFF';

interface FielderData {
  id: string;
  positionName: string;
  category: 'RING' | 'DEEP' | 'CLOSE_CATCHER';
  x: number; // percentage 0 - 100 on field (center is 50, 50)
  y: number; // percentage 0 - 100 on field (pitch center is ~50, 50; batter is at 50, 68; bowler at 50, 32)
  player?: Player;
  catchingRating: number;
  speedKmH: number;
  isHotZone?: boolean;
}

interface PredictedLandingZone {
  id: string;
  name: string;
  sector: 'OFF_SIDE' | 'LEG_SIDE' | 'STRAIGHT' | 'BEHIND';
  cx: number; // SVG center %
  cy: number; // SVG center %
  rx: number; // radius x %
  ry: number; // radius y %
  rotationDeg: number;
  probability: number; // e.g. 38%
  hazardLevel: 'SAFE_SINGLE' | 'CATCH_RISK' | 'BOUNDARY_DANGER';
  expectedRuns: number;
  shotDescription: string;
}

interface LiveTacticalFieldViewProps {
  teamA: Team;
  teamB: Team;
  striker: Player;
  nonStriker: Player;
  bowler: Player;
  currentOver?: string | number;
  runs: number;
  wickets: number;
  targetScore: number;
  lastBall: BallEvent | null;
  className?: string;
  stadium?: Stadium;
  history?: BallEvent[];
}

export const LiveTacticalFieldView: React.FC<LiveTacticalFieldViewProps> = ({
  teamA,
  teamB,
  striker,
  nonStriker,
  bowler,
  currentOver = '12.4',
  runs,
  wickets,
  targetScore,
  lastBall,
  className = '',
  stadium,
  history = [],
}) => {
  const [activePreset, setActivePreset] = useState<TacticalPreset>('BALANCED');
  const [deliveryIntent, setDeliveryIntent] = useState<DeliveryPredictionType>('WIDE_YORKER');
  const [selectedFielderId, setSelectedFielderId] = useState<string | null>(null);
  const [selectedZoneId, setSelectedZoneId] = useState<string | null>(null);
  const [showHeatmapOverlay, setShowHeatmapOverlay] = useState(true);
  const [showTrajectories, setShowTrajectories] = useState(true);
  const [showCatchRadius, setShowCatchRadius] = useState(true);
  const [showMomentumShift, setShowMomentumShift] = useState(false);
  const [showPitchCracks, setShowPitchCracks] = useState(true);
  const [showSpeedometer, setShowSpeedometer] = useState(true);
  const [forceSpinArcPreview, setForceSpinArcPreview] = useState(false);
  const [manualPitchWearPct, setManualPitchWearPct] = useState<number | null>(null);

  // Fielders from defending team squad
  const fieldersList = useMemo(() => {
    const squad = teamB.squad || [];
    // Ensure 11 fielders by mapping squad or fallback
    return squad;
  }, [teamB]);

  // Positions defined for each tactical preset
  // In our coordinate space:
  // Center of field is (50, 50)
  // Pitch is vertical: Bowler releases from (50, 35), Batter stands at (50, 65)
  // Top (y < 50) is behind bowler (Long-off, Long-on, Bowler end)
  // Bottom (y > 65) is behind batter (Third Man, Wicketkeeper, Fine Leg)
  // Left (x < 50) is Off-side for Right-handed batter
  // Right (x > 50) is Leg-side for Right-handed batter
  const fieldersByPreset: Record<TacticalPreset, Array<Omit<FielderData, 'player'>>> = useMemo(
    () => ({
      BALANCED: [
        { id: 'wk', positionName: 'Wicketkeeper', category: 'CLOSE_CATCHER', x: 50, y: 76, catchingRating: 94, speedKmH: 26 },
        { id: 'slip', positionName: 'First Slip', category: 'CLOSE_CATCHER', x: 44, y: 74, catchingRating: 91, speedKmH: 24 },
        { id: 'point', positionName: 'Backward Point', category: 'RING', x: 26, y: 64, catchingRating: 88, speedKmH: 31, isHotZone: true },
        { id: 'cover', positionName: 'Extra Cover', category: 'RING', x: 24, y: 48, catchingRating: 87, speedKmH: 30 },
        { id: 'midoff', positionName: 'Mid-Off', category: 'RING', x: 38, y: 35, catchingRating: 84, speedKmH: 28 },
        { id: 'midon', positionName: 'Mid-On', category: 'RING', x: 62, y: 35, catchingRating: 83, speedKmH: 29 },
        { id: 'midwicket', positionName: 'Mid-Wicket', category: 'RING', x: 74, y: 52, catchingRating: 86, speedKmH: 30 },
        { id: 'squareleg', positionName: 'Square Leg', category: 'RING', x: 75, y: 66, catchingRating: 82, speedKmH: 27 },
        { id: 'deepthird', positionName: 'Deep Third Man', category: 'DEEP', x: 18, y: 84, catchingRating: 80, speedKmH: 32 },
        { id: 'deepextra', positionName: 'Deep Extra Cover', category: 'DEEP', x: 12, y: 36, catchingRating: 89, speedKmH: 33 },
        { id: 'deepmidwicket', positionName: 'Deep Mid-Wicket', category: 'DEEP', x: 86, y: 40, catchingRating: 92, speedKmH: 34, isHotZone: true },
      ],
      ATTACKING_POWERPLAY: [
        { id: 'wk', positionName: 'Wicketkeeper', category: 'CLOSE_CATCHER', x: 50, y: 75, catchingRating: 95, speedKmH: 26 },
        { id: 'slip1', positionName: 'First Slip', category: 'CLOSE_CATCHER', x: 44, y: 73, catchingRating: 93, speedKmH: 25 },
        { id: 'slip2', positionName: 'Second Slip', category: 'CLOSE_CATCHER', x: 40, y: 72, catchingRating: 90, speedKmH: 24 },
        { id: 'gully', positionName: 'Gully', category: 'CLOSE_CATCHER', x: 34, y: 69, catchingRating: 89, speedKmH: 28, isHotZone: true },
        { id: 'point', positionName: 'Backward Point', category: 'RING', x: 25, y: 62, catchingRating: 88, speedKmH: 31 },
        { id: 'cover', positionName: 'Cover', category: 'RING', x: 28, y: 50, catchingRating: 86, speedKmH: 30 },
        { id: 'midoff', positionName: 'Mid-Off', category: 'RING', x: 39, y: 36, catchingRating: 84, speedKmH: 28 },
        { id: 'midon', positionName: 'Mid-On', category: 'RING', x: 61, y: 36, catchingRating: 83, speedKmH: 29 },
        { id: 'midwicket', positionName: 'Short Mid-Wicket', category: 'RING', x: 70, y: 56, catchingRating: 85, speedKmH: 29 },
        { id: 'squareleg', positionName: 'Square Leg', category: 'RING', x: 74, y: 68, catchingRating: 81, speedKmH: 27 },
        { id: 'deepfine', positionName: 'Fine Leg', category: 'DEEP', x: 82, y: 85, catchingRating: 84, speedKmH: 32 },
      ],
      DEATH_OVERS_SHIELD: [
        { id: 'wk', positionName: 'Wicketkeeper (Back)', category: 'CLOSE_CATCHER', x: 50, y: 79, catchingRating: 94, speedKmH: 26 },
        { id: 'point', positionName: 'Deep Backward Point', category: 'DEEP', x: 14, y: 72, catchingRating: 88, speedKmH: 33 },
        { id: 'deepcover', positionName: 'Deep Extra Cover', category: 'DEEP', x: 10, y: 44, catchingRating: 89, speedKmH: 34, isHotZone: true },
        { id: 'longoff', positionName: 'Long-Off', category: 'DEEP', x: 26, y: 16, catchingRating: 91, speedKmH: 33 },
        { id: 'longon', positionName: 'Long-On', category: 'DEEP', x: 74, y: 16, catchingRating: 90, speedKmH: 34, isHotZone: true },
        { id: 'cowcorner', positionName: 'Deep Mid-Wicket', category: 'DEEP', x: 88, y: 42, catchingRating: 93, speedKmH: 35, isHotZone: true },
        { id: 'cover_ring', positionName: 'Cover (Ring)', category: 'RING', x: 30, y: 52, catchingRating: 85, speedKmH: 29 },
        { id: 'midwicket_ring', positionName: 'Mid-Wicket (Ring)', category: 'RING', x: 68, y: 54, catchingRating: 86, speedKmH: 29 },
        { id: 'shortthird', positionName: 'Short Third Man', category: 'RING', x: 34, y: 75, catchingRating: 83, speedKmH: 28 },
        { id: 'shortfine', positionName: 'Short Fine Leg', category: 'RING', x: 66, y: 75, catchingRating: 82, speedKmH: 28 },
        { id: 'bowler_follow', positionName: 'Bowler (Follow Through)', category: 'RING', x: 50, y: 42, catchingRating: 81, speedKmH: 25 },
      ],
      SPIN_TRAP: [
        { id: 'wk', positionName: 'Wicketkeeper (Up)', category: 'CLOSE_CATCHER', x: 50, y: 72, catchingRating: 96, speedKmH: 26 },
        { id: 'slip', positionName: 'First Slip', category: 'CLOSE_CATCHER', x: 42, y: 71, catchingRating: 94, speedKmH: 25 },
        { id: 'sillypoint', positionName: 'Silly Point', category: 'CLOSE_CATCHER', x: 38, y: 62, catchingRating: 87, speedKmH: 26, isHotZone: true },
        { id: 'shortleg', positionName: 'Short Leg', category: 'CLOSE_CATCHER', x: 62, y: 63, catchingRating: 88, speedKmH: 27 },
        { id: 'cover', positionName: 'Extra Cover', category: 'RING', x: 26, y: 48, catchingRating: 85, speedKmH: 29 },
        { id: 'midoff', positionName: 'Mid-Off', category: 'RING', x: 39, y: 34, catchingRating: 83, speedKmH: 28 },
        { id: 'midon', positionName: 'Long-On', category: 'DEEP', x: 72, y: 18, catchingRating: 89, speedKmH: 33 },
        { id: 'deepmidwicket', positionName: 'Deep Mid-Wicket', category: 'DEEP', x: 86, y: 38, catchingRating: 91, speedKmH: 34, isHotZone: true },
        { id: 'squareleg', positionName: 'Backward Square Leg', category: 'RING', x: 74, y: 68, catchingRating: 82, speedKmH: 28 },
        { id: 'point', positionName: 'Point', category: 'RING', x: 24, y: 60, catchingRating: 86, speedKmH: 30 },
        { id: 'deepcover', positionName: 'Deep Cover', category: 'DEEP', x: 12, y: 40, catchingRating: 88, speedKmH: 32 },
      ],
      BOUNCER_ENFORCER: [
        { id: 'wk', positionName: 'Wicketkeeper (Deep)', category: 'CLOSE_CATCHER', x: 50, y: 78, catchingRating: 93, speedKmH: 26 },
        { id: 'deepsquare', positionName: 'Deep Square Leg', category: 'DEEP', x: 88, y: 68, catchingRating: 91, speedKmH: 34, isHotZone: true },
        { id: 'deepfine', positionName: 'Deep Fine Leg', category: 'DEEP', x: 82, y: 86, catchingRating: 89, speedKmH: 33, isHotZone: true },
        { id: 'deepmidwicket', positionName: 'Deep Mid-Wicket', category: 'DEEP', x: 86, y: 40, catchingRating: 92, speedKmH: 34 },
        { id: 'thirdman', positionName: 'Deep Third Man', category: 'DEEP', x: 14, y: 84, catchingRating: 88, speedKmH: 32 },
        { id: 'point', positionName: 'Backward Point', category: 'RING', x: 26, y: 64, catchingRating: 87, speedKmH: 30 },
        { id: 'cover', positionName: 'Cover', category: 'RING', x: 26, y: 48, catchingRating: 84, speedKmH: 29 },
        { id: 'midoff', positionName: 'Mid-Off', category: 'RING', x: 38, y: 35, catchingRating: 82, speedKmH: 28 },
        { id: 'midon', positionName: 'Mid-On', category: 'RING', x: 62, y: 35, catchingRating: 83, speedKmH: 29 },
        { id: 'legslip', positionName: 'Leg Slip', category: 'CLOSE_CATCHER', x: 58, y: 73, catchingRating: 88, speedKmH: 26 },
        { id: 'shortleg', positionName: 'Short Leg', category: 'CLOSE_CATCHER', x: 63, y: 64, catchingRating: 86, speedKmH: 26 },
      ],
    }),
    []
  );

  // Combine tactical positions with real players from teamB squad
  const activeFielders: FielderData[] = useMemo(() => {
    const positions = fieldersByPreset[activePreset];
    return positions.map((pos, idx) => ({
      ...pos,
      player: fieldersList[idx % fieldersList.length] || bowler,
    }));
  }, [activePreset, fieldersByPreset, fieldersList, bowler]);

  // Predicted landing zones calibrated to delivery type
  const predictedLandingZones: PredictedLandingZone[] = useMemo(() => {
    switch (deliveryIntent) {
      case 'WIDE_YORKER':
        return [
          {
            id: 'z-extracover',
            name: 'Deep Extra Cover Drive',
            sector: 'OFF_SIDE',
            cx: 18,
            cy: 42,
            rx: 9,
            ry: 6,
            rotationDeg: -28,
            probability: 38,
            hazardLevel: 'BOUNDARY_DANGER',
            expectedRuns: 3.4,
            shotDescription: 'Slices or carves hard outside off-stump toward vacant cover boundary.',
          },
          {
            id: 'z-thirdman',
            name: 'Thick Outside Edge / Third Man',
            sector: 'BEHIND',
            cx: 22,
            cy: 80,
            rx: 7,
            ry: 5,
            rotationDeg: -45,
            probability: 29,
            hazardLevel: 'CATCH_RISK',
            expectedRuns: 1.6,
            shotDescription: 'Defensive squirt or edge past backward point; high catch jeopardy.',
          },
          {
            id: 'z-longoff',
            name: 'Straight Long-Off Loft',
            sector: 'STRAIGHT',
            cx: 34,
            cy: 22,
            rx: 7,
            ry: 6,
            rotationDeg: -12,
            probability: 19,
            hazardLevel: 'SAFE_SINGLE',
            expectedRuns: 1.8,
            shotDescription: 'Lofted punch down the ground over mid-off.',
          },
          {
            id: 'z-midwicket',
            name: 'Across-the-line Drag',
            sector: 'LEG_SIDE',
            cx: 78,
            cy: 48,
            rx: 6,
            ry: 5,
            rotationDeg: 35,
            probability: 14,
            hazardLevel: 'CATCH_RISK',
            expectedRuns: 1.1,
            shotDescription: 'Top edge when attempting an ambitious drag swipe.',
          },
        ];

      case 'SLOWER_CUTTER':
        return [
          {
            id: 'z-cowcorner',
            name: 'Deep Mid-Wicket / Cow Corner',
            sector: 'LEG_SIDE',
            cx: 82,
            cy: 42,
            rx: 10,
            ry: 7,
            rotationDeg: 28,
            probability: 42,
            hazardLevel: 'BOUNDARY_DANGER',
            expectedRuns: 3.8,
            shotDescription: 'Through the shot early; high heave into cow corner wind pocket.',
          },
          {
            id: 'z-longon',
            name: 'Long-On High Catch Zone',
            sector: 'STRAIGHT',
            cx: 68,
            cy: 22,
            rx: 7,
            ry: 6,
            rotationDeg: 15,
            probability: 26,
            hazardLevel: 'CATCH_RISK',
            expectedRuns: 1.5,
            shotDescription: 'Miscequed off toe-end; hangs in the air near boundary rope.',
          },
          {
            id: 'z-coverring',
            name: 'Short Cover Soft Hand',
            sector: 'OFF_SIDE',
            cx: 28,
            cy: 50,
            rx: 6,
            ry: 5,
            rotationDeg: -15,
            probability: 20,
            hazardLevel: 'SAFE_SINGLE',
            expectedRuns: 1.0,
            shotDescription: 'Checked push in front of 30-yard ring.',
          },
          {
            id: 'z-squareleg',
            name: 'Deep Square Leg Pull',
            sector: 'LEG_SIDE',
            cx: 84,
            cy: 64,
            rx: 6,
            ry: 5,
            rotationDeg: 40,
            probability: 12,
            hazardLevel: 'CATCH_RISK',
            expectedRuns: 1.2,
            shotDescription: 'Rolling wrist swivel pull behind square.',
          },
        ];

      case 'RIB_BOUNCER':
        return [
          {
            id: 'z-fineleg',
            name: 'Fine Leg Top-Edge / Hook',
            sector: 'BEHIND',
            cx: 78,
            cy: 82,
            rx: 9,
            ry: 6,
            rotationDeg: 45,
            probability: 44,
            hazardLevel: 'BOUNDARY_DANGER',
            expectedRuns: 3.6,
            shotDescription: 'Steep bounce triggers instinct hook; sails high toward backward square.',
          },
          {
            id: 'z-deepsquare',
            name: 'Deep Square Leg Flat Pull',
            sector: 'LEG_SIDE',
            cx: 86,
            cy: 66,
            rx: 8,
            ry: 5,
            rotationDeg: 25,
            probability: 31,
            hazardLevel: 'CATCH_RISK',
            expectedRuns: 2.2,
            shotDescription: 'Aggressive swivel pull directly toward throat of boundary rider.',
          },
          {
            id: 'z-shortleg',
            name: 'Gloves / Short Leg Pop-Up',
            sector: 'LEG_SIDE',
            cx: 58,
            cy: 65,
            rx: 5,
            ry: 4,
            rotationDeg: 0,
            probability: 16,
            hazardLevel: 'CATCH_RISK',
            expectedRuns: 0.2,
            shotDescription: 'Fended off ribs; ballooning shoulder catch.',
          },
          {
            id: 'z-pointduck',
            name: 'Point Slash / Upper Cut',
            sector: 'OFF_SIDE',
            cx: 22,
            cy: 70,
            rx: 6,
            ry: 5,
            rotationDeg: -35,
            probability: 9,
            hazardLevel: 'SAFE_SINGLE',
            expectedRuns: 1.4,
            shotDescription: 'Deliberate ramp over slips.',
          },
        ];

      case 'INSWING_FULL':
        return [
          {
            id: 'z-midon',
            name: 'Mid-On On-Drive',
            sector: 'STRAIGHT',
            cx: 60,
            cy: 28,
            rx: 8,
            ry: 6,
            rotationDeg: 10,
            probability: 36,
            hazardLevel: 'SAFE_SINGLE',
            expectedRuns: 2.1,
            shotDescription: 'Textbook presentation of full bat face through mid-on.',
          },
          {
            id: 'z-midwicket',
            name: 'Mid-Wicket Wrist Whip',
            sector: 'LEG_SIDE',
            cx: 74,
            cy: 50,
            rx: 8,
            ry: 6,
            rotationDeg: 25,
            probability: 34,
            hazardLevel: 'BOUNDARY_DANGER',
            expectedRuns: 3.2,
            shotDescription: 'Whipped across the line through mid-wicket arc.',
          },
          {
            id: 'z-lbw',
            name: 'Pad Impact (LBW Zone)',
            sector: 'STRAIGHT',
            cx: 50,
            cy: 67,
            rx: 4,
            ry: 3,
            rotationDeg: 0,
            probability: 21,
            hazardLevel: 'CATCH_RISK',
            expectedRuns: 0.0,
            shotDescription: 'Beaten on inside edge; crash impact onto front pad.',
          },
          {
            id: 'z-cover',
            name: 'Squirted to Cover Point',
            sector: 'OFF_SIDE',
            cx: 28,
            cy: 56,
            rx: 6,
            ry: 4,
            rotationDeg: -20,
            probability: 9,
            hazardLevel: 'SAFE_SINGLE',
            expectedRuns: 1.0,
            shotDescription: 'Inside edge leading to squirt toward off side.',
          },
        ];

      case 'GOOD_LENGTH_OFF':
      default:
        return [
          {
            id: 'z-coverdrive',
            name: 'Cover Drive Piercing Ring',
            sector: 'OFF_SIDE',
            cx: 22,
            cy: 46,
            rx: 8,
            ry: 6,
            rotationDeg: -25,
            probability: 37,
            hazardLevel: 'BOUNDARY_DANGER',
            expectedRuns: 3.5,
            shotDescription: 'High elbow classical cover drive piercing gap between point and cover.',
          },
          {
            id: 'z-slipgully',
            name: 'Edge toward Slips & Gully',
            sector: 'OFF_SIDE',
            cx: 38,
            cy: 73,
            rx: 6,
            ry: 4,
            rotationDeg: -45,
            probability: 28,
            hazardLevel: 'CATCH_RISK',
            expectedRuns: 0.4,
            shotDescription: 'Seaming away 2.4 degrees, nibbling edge through cordon.',
          },
          {
            id: 'z-point',
            name: 'Backfoot Point Punch',
            sector: 'OFF_SIDE',
            cx: 24,
            cy: 62,
            rx: 6,
            ry: 5,
            rotationDeg: -30,
            probability: 22,
            hazardLevel: 'SAFE_SINGLE',
            expectedRuns: 1.3,
            shotDescription: 'Stood tall and patted to point for quick scamper single.',
          },
          {
            id: 'z-midoff',
            name: 'Mid-Off Check Push',
            sector: 'STRAIGHT',
            cx: 40,
            cy: 36,
            rx: 5,
            ry: 4,
            rotationDeg: -10,
            probability: 13,
            hazardLevel: 'SAFE_SINGLE',
            expectedRuns: 1.0,
            shotDescription: 'Controlled defensive block toward ring fielder.',
          },
        ];
    }
  }, [deliveryIntent]);

  // Selected fielder object
  const selectedFielder = useMemo(
    () => activeFielders.find((f) => f.id === selectedFielderId) || null,
    [activeFielders, selectedFielderId]
  );

  // Selected zone object
  const selectedZone = useMemo(
    () => predictedLandingZones.find((z) => z.id === selectedZoneId) || predictedLandingZones[0],
    [predictedLandingZones, selectedZoneId]
  );

  // Team flags with local official SVG assets
  const teamACode = teamA.shortName || teamA.id.toUpperCase();
  const teamBCode = teamB.shortName || teamB.id.toUpperCase();
  const teamAFlagUrl = HIGH_RES_FLAG_URLS[teamACode] || `/flags/${teamA.id.toLowerCase()}.svg`;
  const teamBFlagUrl = HIGH_RES_FLAG_URLS[teamBCode] || `/flags/${teamB.id.toLowerCase()}.svg`;

  // Detect spin bowler & pitch/delivery physics telemetry
  const isBowlerSpinner = useMemo(() => {
    const style = (bowler.bowlingStyle || '').toLowerCase();
    return (
      bowler.role === 'Spin Bowler' ||
      style.includes('spin') ||
      style.includes('orthodox') ||
      style.includes('legbreak') ||
      style.includes('offbreak') ||
      style.includes('chinaman')
    );
  }, [bowler]);

  const isSpinArcActive = isBowlerSpinner || forceSpinArcPreview;

  // Dynamic Pitch Wear % (0 - 100) derived from match deliveries + venue pitch type or manual preview
  const computedPitchWearPct = useMemo(() => {
    const parsedOver =
      typeof currentOver === 'number'
        ? currentOver
        : Number.parseFloat(String(currentOver || '12.4')) || 12.4;
    const ballProgressWear =
      history.length > 0
        ? Math.min(82, 16 + history.length * 0.48)
        : Math.min(78, 18 + parsedOver * 2.75);
    const pitchTypeBonus =
      stadium?.pitchType === 'Dry Spin-Friendly'
        ? 14
        : stadium?.pitchType === 'Slow & Turning'
        ? 11
        : stadium?.pitchType === 'Pace & Bounce'
        ? -4
        : 3;
    return Math.max(8, Math.min(96, Math.round(ballProgressWear + pitchTypeBonus)));
  }, [history.length, currentOver, stadium?.pitchType]);

  const effectivePitchWearPct =
    manualPitchWearPct !== null ? manualPitchWearPct : computedPitchWearPct;

  // Exact Release Speed (km/h) & Speedometer tier color
  const releaseSpeedKmh = useMemo(() => {
    if (lastBall?.speedKmh && !forceSpinArcPreview) {
      return Number(lastBall.speedKmh.toFixed(1));
    }
    if (isSpinArcActive) {
      const spinBase = deliveryIntent === 'SLOWER_CUTTER' ? 84.5 : 91.2;
      return Number(spinBase.toFixed(1));
    }
    const baseFast =
      bowler.role === 'Pace Bowler'
        ? 144.6
        : bowler.role === 'All-Rounder'
        ? 133.8
        : 128.4;
    const intentDelta =
      deliveryIntent === 'RIB_BOUNCER'
        ? 3.2
        : deliveryIntent === 'WIDE_YORKER'
        ? 1.4
        : deliveryIntent === 'SLOWER_CUTTER'
        ? -16.8
        : 0;
    return Number(Math.max(82, Math.min(156, baseFast + intentDelta)).toFixed(1));
  }, [lastBall?.speedKmh, forceSpinArcPreview, isSpinArcActive, bowler.role, deliveryIntent]);

  const speedometerProfile = useMemo(() => {
    if (releaseSpeedKmh >= 140) {
      return {
        tierLabel: 'EXTREME PACE',
        strokeHex: '#f43f5e',
        badgeBg: 'rgba(136,19,55,0.88)',
        textClass: 'text-rose-300',
        gaugeRatio: Math.min(1, (releaseSpeedKmh - 75) / 85),
      };
    }
    if (releaseSpeedKmh >= 125) {
      return {
        tierLabel: 'FAST-MEDIUM',
        strokeHex: '#f59e0b',
        badgeBg: 'rgba(120,53,15,0.88)',
        textClass: 'text-amber-300',
        gaugeRatio: Math.min(1, (releaseSpeedKmh - 75) / 85),
      };
    }
    return {
      tierLabel: isSpinArcActive ? 'FLIGHTED SPIN' : 'MEDIUM / CUTTER',
      strokeHex: '#10b981',
      badgeBg: 'rgba(6,78,59,0.88)',
      textClass: 'text-emerald-300',
      gaugeRatio: Math.max(0.18, Math.min(1, (releaseSpeedKmh - 75) / 85)),
    };
  }, [releaseSpeedKmh, isSpinArcActive]);

  // Bounce Height Indicator ('Low' | 'Normal' | 'Steep') calculated from bowler pace, intent & pitch wear
  const bounceTelemetry = useMemo(() => {
    let score = 50; // 0-36 Low, 37-67 Normal, 68+ Steep
    if (releaseSpeedKmh >= 142) score += 22;
    else if (releaseSpeedKmh >= 130) score += 9;
    else if (releaseSpeedKmh < 100) score -= 10;

    if (deliveryIntent === 'RIB_BOUNCER') score += 28;
    else if (deliveryIntent === 'WIDE_YORKER' || deliveryIntent === 'INSWING_FULL') score -= 24;
    else if (deliveryIntent === 'SLOWER_CUTTER') score -= 12;

    if (stadium?.pitchType === 'Pace & Bounce') score += 12;
    if (stadium?.pitchType === 'Slow & Turning') score -= 8;

    // High pitch wear causes scuffed low skidding on cutters/spinners, or rearing off cracks on short pace
    if (effectivePitchWearPct >= 65) {
      score += deliveryIntent === 'RIB_BOUNCER' && !isSpinArcActive ? 10 : -15;
    } else if (effectivePitchWearPct <= 25) {
      score += 6;
    }

    const clamped = Math.max(8, Math.min(96, score));
    if (clamped >= 68) {
      return {
        rating: 'Steep' as const,
        carryMeters: (1.36 + (clamped - 68) * 0.009).toFixed(2),
        impactZone: 'Chest / Rib-Cage Splice',
        toneClass: 'border-rose-500/40 bg-rose-950/45 text-rose-200',
        accentClass: 'text-rose-300',
        barColor: 'bg-rose-400',
        elevationPct: clamped,
        summary:
          'Hard deck velocity + steep release angle forces back-foot fending into short-leg / gully.',
      };
    }
    if (clamped <= 36) {
      return {
        rating: 'Low' as const,
        carryMeters: (0.44 + clamped * 0.006).toFixed(2),
        impactZone: 'Shin / Base of Stumps',
        toneClass: 'border-amber-500/40 bg-amber-950/45 text-amber-200',
        accentClass: 'text-amber-300',
        barColor: 'bg-amber-400',
        elevationPct: clamped,
        summary:
          'Abraded turf & fuller trajectory keep bounce skidding below knee-roll — prime LBW/bowled threat.',
      };
    }
    return {
      rating: 'Normal' as const,
      carryMeters: (0.88 + (clamped - 37) * 0.011).toFixed(2),
      impactZone: 'Top of Off-Stump / Waist',
      toneClass: 'border-emerald-500/40 bg-emerald-950/45 text-emerald-200',
      accentClass: 'text-emerald-300',
      barColor: 'bg-emerald-400',
      elevationPct: clamped,
      summary:
        'True waist-high carry through the crease enabling clean horizontal & straight-bat strokeplay.',
    };
  }, [releaseSpeedKmh, deliveryIntent, stadium?.pitchType, effectivePitchWearPct, isSpinArcActive]);

  const spinTurnDegrees = useMemo(() => {
    const wearBoost = effectivePitchWearPct * 0.042;
    const base = isBowlerSpinner ? 2.6 : 1.9;
    return (base + wearBoost).toFixed(1);
  }, [effectivePitchWearPct, isBowlerSpinner]);

  return (
    <div className={`relative w-full rounded-3xl border border-sky-500/30 bg-slate-950 p-4 sm:p-6 overflow-hidden shadow-2xl backdrop-blur-xl ${className}`}>
      {/* Background ambient lighting */}
      <div className="absolute -top-32 -left-32 w-80 h-80 rounded-full bg-sky-500/10 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-32 -right-32 w-80 h-80 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none" />

      {/* Header Bar: Matchup, High-Res National Flags, Tactics Title */}
      <div className="relative z-10 flex flex-wrap items-center justify-between gap-4 border-b border-slate-800/80 pb-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center -space-x-2">
            <div className="relative z-20 h-9 w-9 rounded-xl border border-white/20 overflow-hidden shadow-lg bg-slate-900">
              <CountryFlag countryCode={teamACode} size="md" className="w-full h-full object-cover" />
            </div>
            <div className="relative z-10 h-9 w-9 rounded-xl border border-white/20 overflow-hidden shadow-lg bg-slate-900">
              <CountryFlag countryCode={teamBCode} size="md" className="w-full h-full object-cover" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base sm:text-lg font-black tracking-tight text-white flex items-center gap-2">
                <Target className="h-4 w-4 text-sky-400" />
                Live Tactical Field & Landing Zones
              </h3>
              <span className="rounded-full bg-emerald-500/20 border border-emerald-500/40 px-2 py-0.5 text-[10px] font-mono font-bold text-emerald-300">
                AI TELEMETRY
              </span>
            </div>
            <p className="text-xs text-slate-400">
              {teamA.name} ({runs}/{wickets}) vs {teamB.name} · Defending Tactical Layout
            </p>
          </div>
        </div>

        {/* View Controls & Toggles */}
        <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
          <button
            onClick={() => setShowHeatmapOverlay(!showHeatmapOverlay)}
            className={`flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 border transition-colors cursor-pointer ${
              showHeatmapOverlay
                ? 'bg-sky-500/20 border-sky-500/50 text-sky-300'
                : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            <Layers className="h-3.5 w-3.5" />
            <span>Heatmap</span>
          </button>

          <button
            onClick={() => setShowTrajectories(!showTrajectories)}
            className={`flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 border transition-colors cursor-pointer ${
              showTrajectories
                ? 'bg-amber-500/20 border-amber-500/50 text-amber-300'
                : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            <TrendingUp className="h-3.5 w-3.5" />
            <span>Flight Trajectory</span>
          </button>

          <button
            onClick={() => setShowCatchRadius(!showCatchRadius)}
            className={`flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 border transition-colors cursor-pointer ${
              showCatchRadius
                ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300'
                : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            <Shield className="h-3.5 w-3.5" />
            <span>Catch Radius</span>
          </button>

          <button
            onClick={() => {
              cricketAudio.playBatHit();
              setShowMomentumShift((prev) => !prev);
            }}
            className={`flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 border transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
              showMomentumShift
                ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-300 font-bold'
                : 'bg-slate-900 border-slate-800 text-slate-300 hover:text-white'
            }`}
          >
            <TrendingUp className="h-3.5 w-3.5 text-cyan-400" />
            <span>Momentum Shift</span>
          </button>

          <button
            onClick={() => {
              cricketAudio.playUiClick();
              setShowPitchCracks((prev) => !prev);
            }}
            className={`flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 border transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
              showPitchCracks
                ? 'bg-amber-500/20 border-amber-500/50 text-amber-200 font-bold'
                : 'bg-slate-900 border-slate-800 text-slate-300 hover:text-white'
            }`}
          >
            <Layers className="h-3.5 w-3.5 text-amber-400" />
            <span>Cracks ({effectivePitchWearPct}%)</span>
          </button>

          <button
            onClick={() => {
              cricketAudio.playUiClick();
              setShowSpeedometer((prev) => !prev);
            }}
            className={`flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 border transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
              showSpeedometer
                ? 'bg-rose-500/20 border-rose-500/50 text-rose-200 font-bold'
                : 'bg-slate-900 border-slate-800 text-slate-300 hover:text-white'
            }`}
          >
            <Gauge className="h-3.5 w-3.5 text-rose-400" />
            <span>Speedometer</span>
          </button>

          <button
            onClick={() => {
              cricketAudio.playUiClick();
              setForceSpinArcPreview((prev) => !prev);
            }}
            className={`flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 border transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
              isSpinArcActive
                ? 'bg-violet-500/20 border-violet-400/50 text-violet-200 font-bold'
                : 'bg-slate-900 border-slate-800 text-slate-300 hover:text-white'
            }`}
          >
            <Sparkles className="h-3.5 w-3.5 text-violet-300" />
            <span>Spin Arc {isBowlerSpinner ? '(Auto)' : ''}</span>
          </button>
        </div>
      </div>

      {/* Preset Selectors & Bowler Delivery Intent */}
      <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 gap-3 pt-3 pb-2">
        {/* Tactical Preset Selector */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[11px] font-mono font-bold text-slate-400 flex items-center gap-1">
            <Sliders className="h-3 w-3 text-sky-400" />
            FIELDING CONFIGURATION PRESET
          </label>
          <div className="grid grid-cols-3 sm:grid-cols-5 gap-1.5">
            {[
              { id: 'BALANCED', label: 'Balanced' },
              { id: 'ATTACKING_POWERPLAY', label: 'Cordon' },
              { id: 'DEATH_OVERS_SHIELD', label: 'Death 5' },
              { id: 'SPIN_TRAP', label: 'Spin Trap' },
              { id: 'BOUNCER_ENFORCER', label: 'Bouncer' },
            ].map((preset) => (
              <button
                key={preset.id}
                onClick={() => {
                  setActivePreset(preset.id as TacticalPreset);
                  setSelectedFielderId(null);
                }}
                className={`rounded-lg py-1 px-1.5 text-center text-[10px] font-mono font-bold truncate transition-all cursor-pointer border ${
                  activePreset === preset.id
                    ? 'bg-sky-500 text-slate-950 border-sky-400 shadow-md shadow-sky-500/20 scale-[1.02]'
                    : 'bg-slate-900/90 border-slate-800 text-slate-400 hover:text-white hover:border-slate-700'
                }`}
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>

        {/* Bowler Delivery Intent */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[11px] font-mono font-bold text-slate-400 flex items-center gap-1">
            <Crosshair className="h-3 w-3 text-amber-400" />
            PROJECTED NEXT-BALL DELIVERY SPECS
          </label>
          <div className="grid grid-cols-3 sm:grid-cols-5 gap-1.5">
            {[
              { id: 'WIDE_YORKER', label: 'Wide Yorker' },
              { id: 'SLOWER_CUTTER', label: 'Slower Ball' },
              { id: 'RIB_BOUNCER', label: 'Rib Bouncer' },
              { id: 'INSWING_FULL', label: 'Inswing Full' },
              { id: 'GOOD_LENGTH_OFF', label: 'Seam Length' },
            ].map((del) => (
              <button
                key={del.id}
                onClick={() => {
                  setDeliveryIntent(del.id as DeliveryPredictionType);
                  setSelectedZoneId(null);
                }}
                className={`rounded-lg py-1 px-1.5 text-center text-[10px] font-mono font-bold truncate transition-all cursor-pointer border ${
                  deliveryIntent === del.id
                    ? 'bg-amber-400 text-slate-950 border-amber-300 shadow-md shadow-amber-500/20 scale-[1.02]'
                    : 'bg-slate-900/90 border-slate-800 text-slate-400 hover:text-white hover:border-slate-700'
                }`}
              >
                {del.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Field Visualization Container */}
      <div className="relative z-10 mt-3 grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* LEFT / CENTER: Interactive Ground SVG Field (8 Cols) */}
        <div className="lg:col-span-8 relative aspect-square w-full max-w-[620px] mx-auto rounded-3xl border border-slate-800 bg-radial from-slate-950 via-[#031d10] to-[#01120a] overflow-hidden shadow-2xl flex items-center justify-center p-3 select-none">
          {/* Ambient stadium lights inside ground */}
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(14,165,233,0.08),transparent_70%)] pointer-events-none" />

          {/* Real-time Momentum Shift Dual-Line Indicator Overlay on Tactical Canvas */}
          {showMomentumShift && (
            <div className="absolute inset-x-3 top-3 z-40 max-w-[460px] mx-auto pointer-events-auto animate-in fade-in zoom-in-95 duration-200">
              <MomentumShiftIndicator
                history={history}
                stadium={
                  stadium || {
                    id: 'venue-current',
                    name: 'International Cricket Stadium',
                    city: 'Melbourne',
                    country: 'Australia',
                    capacity: 85000,
                    boundarySizeMeters: { straight: 75, square: 68 },
                    avgFirstInningsScore: 172,
                    chasingWinPercent: 54,
                    paceWicketPercent: 62,
                    spinWicketPercent: 38,
                    dewFactor: 'Moderate',
                    pitchType: 'Pace & Bounce',
                    elevation: '32m',
                  }
                }
                currentRuns={runs}
                currentWickets={wickets}
                currentOvers={currentOver || '0.0'}
                targetScore={targetScore}
                totalOvers={20}
                defaultExpanded={true}
                isModal={false}
                onCloseModal={() => setShowMomentumShift(false)}
              />
            </div>
          )}

          {/* SVG Canvas (1000 x 1000 coordinate system) */}
          <svg
            viewBox="0 0 1000 1000"
            className="w-full h-full transition-all duration-500"
            style={{ filter: 'drop-shadow(0 10px 30px rgba(0,0,0,0.8))' }}
          >
            <defs>
              {/* Radial gradient for ground grass */}
              <radialGradient id="fieldGrassGrad" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#0b522e" />
                <stop offset="65%" stopColor="#073a20" />
                <stop offset="90%" stopColor="#042715" />
                <stop offset="100%" stopColor="#02170d" />
              </radialGradient>

              {/* Pitch strip gradient */}
              <linearGradient id="pitchStripGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#8d603a" />
                <stop offset="50%" stopColor="#b07d50" />
                <stop offset="100%" stopColor="#8d603a" />
              </linearGradient>

              {/* Zone Glowing Filter */}
              <filter id="glowFilter" x="-40%" y="-40%" width="180%" height="180%">
                <feGaussianBlur stdDeviation="8" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
              </filter>

              {/* Landing Zone Heatmap Gradients */}
              <radialGradient id="dangerZoneGrad">
                <stop offset="0%" stopColor="#f43f5e" stopOpacity="0.75" />
                <stop offset="60%" stopColor="#f43f5e" stopOpacity="0.35" />
                <stop offset="100%" stopColor="#f43f5e" stopOpacity="0.0" />
              </radialGradient>

              <radialGradient id="catchRiskGrad">
                <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.75" />
                <stop offset="60%" stopColor="#f59e0b" stopOpacity="0.35" />
                <stop offset="100%" stopColor="#f59e0b" stopOpacity="0.0" />
              </radialGradient>

              <radialGradient id="safeSingleGrad">
                <stop offset="0%" stopColor="#10b981" stopOpacity="0.75" />
                <stop offset="60%" stopColor="#10b981" stopOpacity="0.35" />
                <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
              </radialGradient>

              <clipPath id="pitchSurfaceClip">
                <rect x="460" y="330" width="80" height="340" rx="4" />
              </clipPath>
            </defs>

            {/* 1. OUTER GROUND OVAL (Boundary Rope) */}
            <ellipse
              cx="500"
              cy="500"
              rx="470"
              ry="470"
              fill="url(#fieldGrassGrad)"
              stroke="#22c55e"
              strokeWidth="4"
              strokeDasharray="16 8"
            />

            {/* Alternating Mower Ring Cuts for realism */}
            {[420, 360, 300, 240, 180, 120].map((r, i) => (
              <circle
                key={r}
                cx="500"
                cy="500"
                r={r}
                fill="none"
                stroke={i % 2 === 0 ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.1)'}
                strokeWidth="40"
              />
            ))}

            {/* Boundary Foam Cushions (Dots around the fence) */}
            {Array.from({ length: 36 }).map((_, i) => {
              const angle = (i * 10 * Math.PI) / 180;
              const bx = 500 + 472 * Math.cos(angle);
              const by = 500 + 472 * Math.sin(angle);
              return (
                <circle
                  key={i}
                  cx={bx}
                  cy={by}
                  r="3.5"
                  fill={i % 2 === 0 ? '#38bdf8' : '#fbbf24'}
                  opacity="0.8"
                />
              );
            })}

            {/* 2. 30-YARD INNER CIRCLE */}
            <ellipse
              cx="500"
              cy="500"
              rx="270"
              ry="270"
              fill="none"
              stroke="rgba(255,255,255,0.4)"
              strokeWidth="2.5"
              strokeDasharray="12 10"
            />
            {/* White disc markers on 30-yard ring */}
            {Array.from({ length: 16 }).map((_, i) => {
              const angle = (i * 22.5 * Math.PI) / 180;
              const mx = 500 + 270 * Math.cos(angle);
              const my = 500 + 270 * Math.sin(angle);
              return <circle key={i} cx={mx} cy={my} r="3" fill="#ffffff" opacity="0.7" />;
            })}
            <text
              x="500"
              y="222"
              textAnchor="middle"
              fill="rgba(255,255,255,0.35)"
              fontSize="12"
              fontFamily="monospace"
              fontWeight="bold"
              letterSpacing="2"
            >
              30-YARD RESTRICTION RING
            </text>

            {/* 3. CENTER 22-YARD PITCH STRIP */}
            {/* Pitch rectangle: 80 wide, 340 high (centered at x=500, y=500) */}
            <rect
              x="460"
              y="330"
              width="80"
              height="340"
              rx="4"
              fill="url(#pitchStripGrad)"
              stroke="#78350f"
              strokeWidth="2"
            />

            {/* Dynamic Cracks & Surface Debris Overlay (scales with effectivePitchWearPct) */}
            {showPitchCracks && (
              <g id="pitchCracksAndDebris" clipPath="url(#pitchSurfaceClip)" pointerEvents="none">
                {/* Rough bowler follow-through & landing footmarks */}
                <ellipse
                  cx="474"
                  cy="522"
                  rx={5 + effectivePitchWearPct * 0.06}
                  ry={12 + effectivePitchWearPct * 0.12}
                  fill="#451a03"
                  opacity={Math.min(0.65, 0.14 + effectivePitchWearPct * 0.005)}
                />
                <ellipse
                  cx="526"
                  cy="474"
                  rx={5 + effectivePitchWearPct * 0.05}
                  ry={11 + effectivePitchWearPct * 0.1}
                  fill="#451a03"
                  opacity={Math.min(0.6, 0.12 + effectivePitchWearPct * 0.0045)}
                />

                {/* Primary Good-Length & Full-Length Surface Fissure Cracks */}
                <path
                  d="M 488 492 L 496 514 L 491 536 L 501 558"
                  fill="none"
                  stroke="#291205"
                  strokeWidth={0.8 + effectivePitchWearPct * 0.022}
                  strokeLinecap="round"
                  opacity={Math.min(0.92, 0.18 + effectivePitchWearPct * 0.0075)}
                />
                {effectivePitchWearPct >= 25 && (
                  <path
                    d="M 514 456 L 507 480 L 515 504 L 508 525 M 496 514 L 481 524"
                    fill="none"
                    stroke="#3b1606"
                    strokeWidth={0.7 + effectivePitchWearPct * 0.018}
                    strokeLinecap="round"
                    opacity={Math.min(0.88, (effectivePitchWearPct - 15) * 0.01)}
                  />
                )}
                {effectivePitchWearPct >= 45 && (
                  <path
                    d="M 472 428 L 482 448 L 476 470 M 522 534 L 512 556 L 519 580 M 507 480 L 523 489"
                    fill="none"
                    stroke="#1c0a02"
                    strokeWidth={0.9 + effectivePitchWearPct * 0.018}
                    strokeLinecap="round"
                    opacity={Math.min(0.9, (effectivePitchWearPct - 35) * 0.012)}
                  />
                )}
                {effectivePitchWearPct >= 68 && (
                  <path
                    d="M 468 564 L 484 576 L 479 598 M 499 412 L 505 436 L 495 454"
                    fill="none"
                    stroke="#1c0a02"
                    strokeWidth={1.1 + effectivePitchWearPct * 0.016}
                    strokeLinecap="round"
                    opacity={Math.min(0.94, (effectivePitchWearPct - 55) * 0.015)}
                  />
                )}

                {/* Crumbled Clay & Dust Debris Flecks */}
                {[
                  { cx: 484, cy: 506, r: 1.4, minWear: 15 },
                  { cx: 511, cy: 538, r: 1.6, minWear: 22 },
                  { cx: 495, cy: 548, r: 1.8, minWear: 30 },
                  { cx: 477, cy: 531, r: 1.5, minWear: 38 },
                  { cx: 520, cy: 496, r: 1.7, minWear: 46 },
                  { cx: 503, cy: 571, r: 1.9, minWear: 55 },
                  { cx: 471, cy: 462, r: 1.5, minWear: 64 },
                  { cx: 525, cy: 562, r: 2.0, minWear: 72 },
                  { cx: 489, cy: 439, r: 1.6, minWear: 80 },
                ]
                  .filter((d) => effectivePitchWearPct >= d.minWear)
                  .map((debris, idx) => (
                    <circle
                      key={`debris-${idx}`}
                      cx={debris.cx}
                      cy={debris.cy}
                      r={debris.r}
                      fill="#451a03"
                      opacity={Math.min(0.85, 0.35 + effectivePitchWearPct * 0.005)}
                    />
                  ))}
              </g>
            )}

            {/* Speedometer Gauge Overlay at Top of Pitch (y=292, zero overlap with 30-yd label at y=222 or bowler at y=348) */}
            {showSpeedometer && (
              <g id="pitchSpeedometerOverlay" transform="translate(500, 294)" pointerEvents="none">
                <rect
                  x="-68"
                  y="-22"
                  width="136"
                  height="38"
                  rx="10"
                  fill="rgba(2,6,23,0.92)"
                  stroke={speedometerProfile.strokeHex}
                  strokeWidth="1.5"
                />
                {/* Semi-circular speedometer dial on left side of HUD */}
                <g transform="translate(-44, 2)">
                  <path
                    d="M -13 4 A 13 13 0 0 1 13 4"
                    fill="none"
                    stroke="rgba(148,163,184,0.28)"
                    strokeWidth="3.5"
                    strokeLinecap="round"
                  />
                  <path
                    d="M -13 4 A 13 13 0 0 1 13 4"
                    fill="none"
                    stroke={speedometerProfile.strokeHex}
                    strokeWidth="3.5"
                    strokeLinecap="round"
                    strokeDasharray="41"
                    strokeDashoffset={41 * (1 - speedometerProfile.gaugeRatio)}
                  />
                  <circle cx="0" cy="4" r="2.2" fill="#f8fafc" />
                </g>
                <text
                  x="12"
                  y="-4"
                  textAnchor="middle"
                  fill={speedometerProfile.strokeHex}
                  fontSize="11.5"
                  fontFamily="monospace"
                  fontWeight="bold"
                >
                  {releaseSpeedKmh.toFixed(1)} km/h
                </text>
                <text
                  x="12"
                  y="9"
                  textAnchor="middle"
                  fill="#cbd5e1"
                  fontSize="7.5"
                  fontFamily="monospace"
                  fontWeight="bold"
                  letterSpacing="0.6"
                >
                  {speedometerProfile.tierLabel}
                </text>
              </g>
            )}

            {/* Bowling Crease (Top end: y=370) */}
            <line x1="440" y1="370" x2="560" y2="370" stroke="#ffffff" strokeWidth="2.5" />
            {/* Bowling Stumps (Top) */}
            <circle cx="494" cy="368" r="2" fill="#fef08a" />
            <circle cx="500" cy="368" r="2" fill="#fef08a" />
            <circle cx="506" cy="368" r="2" fill="#fef08a" />

            {/* Batting Crease (Bottom end: y=630) */}
            <line x1="440" y1="630" x2="560" y2="630" stroke="#ffffff" strokeWidth="2.5" />
            {/* Batting Stumps (Bottom) */}
            <circle cx="494" cy="632" r="2" fill="#fef08a" />
            <circle cx="500" cy="632" r="2" fill="#fef08a" />
            <circle cx="506" cy="632" r="2" fill="#fef08a" />

            {/* Striker & Non-Striker Footprint Badges on Pitch */}
            <g transform="translate(500, 642)">
              <rect x="-35" y="-10" width="70" height="20" rx="10" fill="rgba(15,23,42,0.85)" stroke="#38bdf8" strokeWidth="1.5" />
              <text x="0" y="3.5" textAnchor="middle" fill="#38bdf8" fontSize="10" fontFamily="monospace" fontWeight="bold">
                {striker.name.split(' ')[0]}
              </text>
            </g>

            <g transform="translate(500, 348)">
              <rect x="-35" y="-10" width="70" height="20" rx="10" fill="rgba(15,23,42,0.85)" stroke="#f43f5e" strokeWidth="1.5" />
              <text x="0" y="3.5" textAnchor="middle" fill="#f43f5e" fontSize="10" fontFamily="monospace" fontWeight="bold">
                {bowler.name.split(' ')[0]}
              </text>
            </g>

            {/* 4. PREDICTED LANDING ZONES HEATMAP OVERLAYS */}
            {showHeatmapOverlay && (
              <g id="predictedLandingZones">
                {predictedLandingZones.map((zone) => {
                  const zx = zone.cx * 10;
                  const zy = zone.cy * 10;
                  const zrx = zone.rx * 10;
                  const zry = zone.ry * 10;
                  const isSelected = selectedZoneId === zone.id;

                  const fillGrad =
                    zone.hazardLevel === 'BOUNDARY_DANGER'
                      ? 'url(#dangerZoneGrad)'
                      : zone.hazardLevel === 'CATCH_RISK'
                      ? 'url(#catchRiskGrad)'
                      : 'url(#safeSingleGrad)';

                  const strokeColor =
                    zone.hazardLevel === 'BOUNDARY_DANGER'
                      ? '#f43f5e'
                      : zone.hazardLevel === 'CATCH_RISK'
                      ? '#f59e0b'
                      : '#10b981';

                  return (
                    <g
                      key={zone.id}
                      onClick={() => setSelectedZoneId(zone.id)}
                      className="cursor-pointer transition-transform hover:scale-105"
                    >
                      {/* Outer pulse ellipse */}
                      <ellipse
                        cx={zx}
                        cy={zy}
                        rx={zrx * 1.15}
                        ry={zry * 1.15}
                        transform={`rotate(${zone.rotationDeg} ${zx} ${zy})`}
                        fill={fillGrad}
                        opacity={isSelected ? 0.95 : 0.65}
                        filter="url(#glowFilter)"
                      />

                      {/* Main boundary ellipse */}
                      <ellipse
                        cx={zx}
                        cy={zy}
                        rx={zrx}
                        ry={zry}
                        transform={`rotate(${zone.rotationDeg} ${zx} ${zy})`}
                        fill="none"
                        stroke={strokeColor}
                        strokeWidth={isSelected ? '3.5' : '2'}
                        strokeDasharray={isSelected ? '6 4' : 'none'}
                      />

                      {/* Probability badge at zone center */}
                      <circle cx={zx} cy={zy} r={isSelected ? '22' : '18'} fill="rgba(15,23,42,0.9)" stroke={strokeColor} strokeWidth="2" />
                      <text
                        x={zx}
                        y={zy + 4}
                        textAnchor="middle"
                        fill="#ffffff"
                        fontSize={isSelected ? '12' : '10'}
                        fontFamily="monospace"
                        fontWeight="bold"
                      >
                        {zone.probability}%
                      </text>

                      {/* Text label underneath */}
                      <text
                        x={zx}
                        y={zy + 32}
                        textAnchor="middle"
                        fill={strokeColor}
                        fontSize="9"
                        fontFamily="monospace"
                        fontWeight="bold"
                        letterSpacing="0.5"
                      >
                        {zone.name.split(' ')[0]}
                      </text>
                    </g>
                  );
                })}
              </g>
            )}

            {/* 5. PROJECTED BALL FLIGHT TRAJECTORIES */}
            {showTrajectories && (
              <g id="flightTrajectories" pointerEvents="none">
                {predictedLandingZones.map((zone) => {
                  const targetX = zone.cx * 10;
                  const targetY = zone.cy * 10;
                  const isPrimary = zone.id === selectedZone.id;

                  // Quadratic curve from Striker (500, 630) to target, arcing through the air
                  const midX = (500 + targetX) / 2;
                  const midY = (630 + targetY) / 2 - (isPrimary ? 80 : 40);

                  const pathColor =
                    zone.hazardLevel === 'BOUNDARY_DANGER'
                      ? '#f43f5e'
                      : zone.hazardLevel === 'CATCH_RISK'
                      ? '#f59e0b'
                      : '#38bdf8';

                  return (
                    <g key={`traj-${zone.id}`}>
                      {/* Dotted flight line */}
                      <path
                        d={`M 500 630 Q ${midX} ${midY} ${targetX} ${targetY}`}
                        fill="none"
                        stroke={pathColor}
                        strokeWidth={isPrimary ? 3 : 1.5}
                        strokeDasharray={isPrimary ? '8 6' : '4 4'}
                        opacity={isPrimary ? 1 : 0.45}
                      />

                      {/* Moving pulse dot along the primary path */}
                      {isPrimary && (
                        <circle cx={targetX} cy={targetY} r="6" fill={pathColor} className="animate-ping" />
                      )}
                    </g>
                  );
                })}

                {/* Bowler release vector: Dotted curved spin trajectory vs Pace seam trajectory */}
                {isSpinArcActive ? (
                  <g id="spinCurvedTrajectory">
                    {/* Dotted curved aerial drift arc from release (496, 370) to rough landing spot (516, 548) */}
                    <path
                      d="M 496 370 Q 474 456 516 548"
                      fill="none"
                      stroke="#c084fc"
                      strokeWidth="3"
                      strokeDasharray="5 5"
                      strokeLinecap="round"
                      opacity="0.95"
                    />
                    {/* Sharp spin deviation off the pitch landing spot to batter crease (484, 628) */}
                    <path
                      d="M 516 548 L 484 628"
                      fill="none"
                      stroke="#fbbf24"
                      strokeWidth="3"
                      strokeDasharray="4 4"
                      strokeLinecap="round"
                    />
                    {/* Pitching spot spin bite ring */}
                    <circle cx="516" cy="548" r="7" fill="rgba(192,132,252,0.22)" stroke="#c084fc" strokeWidth="1.8" />
                    <circle cx="516" cy="548" r="3.5" fill="#fbbf24" />
                    {/* Non-overlapping Turn callout beside pitch */}
                    <g transform="translate(596, 548)">
                      <rect
                        x="-42"
                        y="-10"
                        width="84"
                        height="20"
                        rx="6"
                        fill="rgba(15,23,42,0.92)"
                        stroke="rgba(192,132,252,0.6)"
                        strokeWidth="1"
                      />
                      <text
                        x="0"
                        y="3.5"
                        textAnchor="middle"
                        fill="#e9d5ff"
                        fontSize="8.5"
                        fontFamily="monospace"
                        fontWeight="bold"
                      >
                        {spinTurnDegrees}° SPIN TURN
                      </text>
                    </g>
                  </g>
                ) : (
                  <g id="paceReleaseTrajectory">
                    <line
                      x1="500"
                      y1="370"
                      x2="500"
                      y2="546"
                      stroke="#f43f5e"
                      strokeWidth="2.5"
                      strokeDasharray="6 4"
                      opacity="0.85"
                    />
                    <line
                      x1="500"
                      y1="546"
                      x2={effectivePitchWearPct >= 50 ? '493' : '497'}
                      y2="628"
                      stroke="#fbbf24"
                      strokeWidth="2.2"
                      strokeDasharray="5 3"
                      opacity="0.9"
                    />
                    <circle cx="500" cy="546" r="4.5" fill="#fbbf24" stroke="#f43f5e" strokeWidth="2" />
                  </g>
                )}
              </g>
            )}

            {/* 6. CURRENT FIELDERS (11 on the pitch) */}
            <g id="fieldersGroup">
              {activeFielders.map((fielder) => {
                const fx = fielder.x * 10;
                const fy = fielder.y * 10;
                const isSelected = selectedFielderId === fielder.id;
                const radiusSize = fielder.category === 'CLOSE_CATCHER' ? 36 : fielder.category === 'RING' ? 44 : 52;

                return (
                  <g
                    key={fielder.id}
                    onClick={() => setSelectedFielderId(fielder.id)}
                    className="cursor-pointer transition-transform hover:scale-110"
                  >
                    {/* Catch radius circle if toggled */}
                    {showCatchRadius && (
                      <circle
                        cx={fx}
                        cy={fy}
                        r={radiusSize}
                        fill={fielder.isHotZone ? 'rgba(244,63,94,0.14)' : 'rgba(14,165,233,0.1)'}
                        stroke={fielder.isHotZone ? 'rgba(244,63,94,0.45)' : 'rgba(56,189,248,0.3)'}
                        strokeWidth="1.5"
                        strokeDasharray="4 4"
                      />
                    )}

                    {/* Fielder base glow on selection */}
                    {isSelected && (
                      <circle
                        cx={fx}
                        cy={fy}
                        r="24"
                        fill="none"
                        stroke="#38bdf8"
                        strokeWidth="3"
                        className="animate-pulse"
                      />
                    )}

                    {/* Outer marker pill */}
                    <circle
                      cx={fx}
                      cy={fy}
                      r="16"
                      fill="#0f172a"
                      stroke={fielder.isHotZone ? '#f43f5e' : '#38bdf8'}
                      strokeWidth={isSelected ? '3' : '2'}
                      filter="url(#glowFilter)"
                    />

                    {/* Fielder initial or jersey number */}
                    <text
                      x={fx}
                      y={fy + 4.5}
                      textAnchor="middle"
                      fill="#ffffff"
                      fontSize="11"
                      fontFamily="monospace"
                      fontWeight="black"
                    >
                      {fielder.player?.jerseyNumber || fielder.positionName.slice(0, 1)}
                    </text>

                    {/* Position Label Tag below fielder */}
                    <g transform={`translate(${fx}, ${fy + 25})`}>
                      <rect
                        x="-38"
                        y="-8"
                        width="76"
                        height="16"
                        rx="4"
                        fill="rgba(15,23,42,0.9)"
                        stroke={isSelected ? '#38bdf8' : 'rgba(255,255,255,0.15)'}
                        strokeWidth="1"
                      />
                      <text
                        x="0"
                        y="3.5"
                        textAnchor="middle"
                        fill={fielder.isHotZone ? '#fca5a5' : '#e2e8f0'}
                        fontSize="8"
                        fontFamily="monospace"
                        fontWeight="bold"
                      >
                        {fielder.positionName.length > 12 ? fielder.positionName.slice(0, 11) + '…' : fielder.positionName}
                      </text>
                    </g>
                  </g>
                );
              })}
            </g>

            {/* Compass Orientation Indicator */}
            <g transform="translate(930, 70)" pointerEvents="none">
              <circle cx="0" cy="0" r="22" fill="rgba(15,23,42,0.85)" stroke="rgba(255,255,255,0.2)" strokeWidth="1.5" />
              <text x="0" y="-8" textAnchor="middle" fill="#f43f5e" fontSize="10" fontFamily="monospace" fontWeight="bold">N</text>
              <line x1="0" y1="-14" x2="0" y2="14" stroke="#ffffff" strokeWidth="1.5" opacity="0.6" />
              <line x1="-14" y1="0" x2="14" y2="0" stroke="#ffffff" strokeWidth="1.5" opacity="0.6" />
              <text x="0" y="24" textAnchor="middle" fill="rgba(255,255,255,0.5)" fontSize="8" fontFamily="monospace">OFF</text>
            </g>
          </svg>
        </div>

        {/* RIGHT: Tactical Detail Panel (4 Cols) */}
        <div className="lg:col-span-4 space-y-4">
          {/* Active Batter vs Bowler Duel Card */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
              <span className="text-[11px] font-mono font-bold text-sky-400 flex items-center gap-1.5">
                <Activity className="h-3.5 w-3.5" />
                MIDDLE DUEL TELEMETRY
              </span>
              <span className="text-[10px] font-mono text-slate-400">Over {currentOver}</span>
            </div>

            {/* Striker mini profile */}
            <div className="flex items-center gap-3">
              <PlayerCardAvatar
                playerId={striker.id}
                name={striker.name}
                countryCode={striker.countryCode || teamACode}
                jerseyNumber={striker.jerseyNumber}
                imageUrl={striker.imageUrl}
                size="md"
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold text-white truncate">{striker.name}</span>
                  <span className="text-[10px] text-sky-400 font-mono">* (Bat)</span>
                </div>
                <p className="text-[11px] text-slate-400 font-mono truncate">{striker.role}</p>
                <div className="flex items-center gap-2 mt-1 text-[10px] font-mono text-slate-300">
                  <span className="bg-sky-500/10 text-sky-300 px-1.5 py-0.5 rounded border border-sky-500/20">
                    SR: {striker.stats?.strikeRate || 148.5}
                  </span>
                  <span className="text-slate-400">Tendency: 360° Slog</span>
                </div>
              </div>
            </div>

            {/* Bowler mini profile */}
            <div className="flex items-center gap-3 pt-2 border-t border-slate-800/60">
              <PlayerCardAvatar
                playerId={bowler.id}
                name={bowler.name}
                countryCode={bowler.countryCode || teamBCode}
                jerseyNumber={bowler.jerseyNumber}
                imageUrl={bowler.imageUrl}
                size="md"
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold text-white truncate">{bowler.name}</span>
                  <span className="text-[10px] text-rose-400 font-mono">(Bowl)</span>
                </div>
                <p className="text-[11px] text-slate-400 font-mono truncate">{bowler.bowlingStyle || bowler.role}</p>
                <div className="flex items-center gap-2 mt-1 text-[10px] font-mono text-slate-300">
                  <span className="bg-rose-500/10 text-rose-300 px-1.5 py-0.5 rounded border border-rose-500/20">
                    Econ: {bowler.stats?.economy || 7.42}
                  </span>
                  <span className="text-slate-300">Plan: {deliveryIntent.replace('_', ' ')}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Non-Overlapping Pitch Radar, Bounce Height Indicator & Surface Wear Card */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/95 p-4 space-y-3">
            <div className="flex items-center justify-between gap-2 border-b border-slate-800 pb-2.5">
              <span className="text-[11px] font-mono font-bold text-cyan-300 flex items-center gap-1.5">
                <Gauge className="h-3.5 w-3.5 text-cyan-400 shrink-0" />
                PITCH BOUNCE &amp; SURFACE RADAR
              </span>
              <span className="text-[11px] font-mono font-bold tabular-nums text-slate-200">
                {releaseSpeedKmh.toFixed(1)} km/h
              </span>
            </div>

            {/* Bounce Height Indicator (Low / Normal / Steep) */}
            <div className={`rounded-xl border p-3 space-y-2 ${bounceTelemetry.toneClass}`}>
              <div className="flex items-center justify-between gap-2">
                <div>
                  <span className="text-[10px] font-mono text-slate-300 block">
                    BOUNCE HEIGHT RATING
                  </span>
                  <div className="flex items-baseline gap-2">
                    <strong className={`text-base font-black ${bounceTelemetry.accentClass}`}>
                      {bounceTelemetry.rating} Bounce
                    </strong>
                    <span className="text-xs font-mono tabular-nums text-slate-200">
                      ({bounceTelemetry.carryMeters}m stump carry)
                    </span>
                  </div>
                </div>
                <span className="text-[11px] font-mono font-semibold text-slate-200 text-right">
                  {bounceTelemetry.impactZone}
                </span>
              </div>

              {/* 3-Tier Bounce Scale */}
              <div className="grid grid-cols-3 gap-1.5 pt-0.5 text-[10px] font-mono text-center">
                {(['Low', 'Normal', 'Steep'] as const).map((tier) => {
                  const active = bounceTelemetry.rating === tier;
                  return (
                    <div
                      key={tier}
                      className={`rounded-lg py-1 border font-bold ${
                        active
                          ? 'border-white/40 bg-slate-950/90 text-white'
                          : 'border-slate-800/80 bg-slate-950/40 text-slate-400'
                      }`}
                    >
                      {tier}
                    </div>
                  );
                })}
              </div>

              <p className="text-[11px] text-slate-200 leading-relaxed font-sans">
                {bounceTelemetry.summary}
              </p>
            </div>

            {/* Interactive Pitch Wear & Cracks Preview Slider */}
            <div className="space-y-1.5 pt-1">
              <div className="flex items-center justify-between text-[11px] font-mono">
                <span className="text-slate-200 font-semibold">
                  Pitch Wear &amp; Cracks: <strong className="text-amber-300 tabular-nums">{effectivePitchWearPct}%</strong>
                </span>
                {manualPitchWearPct !== null && (
                  <button
                    type="button"
                    onClick={() => setManualPitchWearPct(null)}
                    className="inline-flex items-center gap-1 text-[10px] text-cyan-300 hover:text-white cursor-pointer whitespace-nowrap"
                  >
                    <RotateCcw className="h-2.5 w-2.5" />
                    <span>Live ({computedPitchWearPct}%)</span>
                  </button>
                )}
              </div>
              <input
                type="range"
                min={5}
                max={95}
                value={effectivePitchWearPct}
                aria-label="Adjust simulated pitch wear percentage"
                onChange={(e) => setManualPitchWearPct(Number(e.target.value))}
                className="w-full accent-amber-400 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
              />
              <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 tabular-nums">
                <span>Fresh Deck (10%)</span>
                <span>Scuffed (50%)</span>
                <span>Cracked (90%)</span>
              </div>
            </div>
          </div>

          {/* Selected Predicted Landing Zone Breakdown */}
          <div className="rounded-2xl border border-amber-500/30 bg-gradient-to-b from-amber-500/10 via-slate-900 to-slate-950 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-mono font-bold text-amber-400 flex items-center gap-1.5">
                <Crosshair className="h-3.5 w-3.5" />
                PREDICTED LANDING ZONE
              </span>
              <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border ${
                selectedZone.hazardLevel === 'BOUNDARY_DANGER'
                  ? 'bg-rose-500/20 border-rose-500/40 text-rose-300'
                  : selectedZone.hazardLevel === 'CATCH_RISK'
                  ? 'bg-amber-500/20 border-amber-500/40 text-amber-300'
                  : 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
              }`}>
                {selectedZone.hazardLevel.replace('_', ' ')}
              </span>
            </div>

            <div className="space-y-1">
              <h4 className="text-sm font-black text-white">{selectedZone.name}</h4>
              <p className="text-xs text-slate-300 leading-relaxed font-sans">{selectedZone.shotDescription}</p>
            </div>

            {/* Metric Bars */}
            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-800">
              <div className="rounded-xl bg-slate-950/80 p-2.5 border border-slate-800">
                <span className="text-[10px] font-mono text-slate-400 block">LANDING CHANCE</span>
                <span className="text-lg font-black text-white tabular-nums">{selectedZone.probability}%</span>
              </div>
              <div className="rounded-xl bg-slate-950/80 p-2.5 border border-slate-800">
                <span className="text-[10px] font-mono text-slate-400 block">EXPECTED RUNS</span>
                <span className="text-lg font-black text-amber-300 tabular-nums">+{selectedZone.expectedRuns}</span>
              </div>
            </div>

            {/* Zone Selector Pills */}
            <div className="space-y-1.5 pt-1">
              <span className="text-[10px] font-mono text-slate-400 block">SELECT ALTERNATIVE SECTOR:</span>
              <div className="flex flex-wrap gap-1.5">
                {predictedLandingZones.map((z) => (
                  <button
                    key={z.id}
                    onClick={() => setSelectedZoneId(z.id)}
                    className={`rounded-lg px-2 py-1 text-[10px] font-mono transition-all cursor-pointer border ${
                      selectedZone.id === z.id
                        ? 'bg-amber-400 text-slate-950 font-bold border-amber-300 shadow'
                        : 'bg-slate-900 border-slate-800 text-slate-300 hover:text-white'
                    }`}
                  >
                    {z.name.split(' ')[0]} ({z.probability}%)
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Fielder Inspector Card (Shows selected fielder or default instructions) */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="text-[11px] font-mono font-bold text-sky-400 flex items-center gap-1.5">
                <Shield className="h-3.5 w-3.5" />
                FIELDER TELEMETRY INSPECTOR
              </span>
              <span className="text-[10px] font-mono text-slate-400">
                {selectedFielder ? 'Selected' : 'Click any fielder on ground'}
              </span>
            </div>

            {selectedFielder ? (
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  {selectedFielder.player ? (
                    <PlayerCardAvatar
                      playerId={selectedFielder.player.id}
                      name={selectedFielder.player.name}
                      countryCode={selectedFielder.player.countryCode || teamBCode}
                      jerseyNumber={selectedFielder.player.jerseyNumber}
                      imageUrl={selectedFielder.player.imageUrl}
                      size="md"
                    />
                  ) : (
                    <div className="h-14 w-14 rounded-2xl bg-slate-800 flex items-center justify-center font-mono font-bold text-white">
                      #{selectedFielder.id.toUpperCase().slice(0, 2)}
                    </div>
                  )}
                  <div>
                    <h5 className="text-sm font-bold text-white">{selectedFielder.player?.name || selectedFielder.positionName}</h5>
                    <p className="text-xs text-sky-400 font-mono font-semibold">{selectedFielder.positionName}</p>
                    <span className="text-[10px] font-mono text-slate-400 uppercase">
                      Category: {selectedFielder.category.replace('_', ' ')}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                  <div className="rounded-xl bg-slate-950 p-2.5 border border-slate-800">
                    <span className="text-[10px] text-slate-400 block">CATCHING INDEX</span>
                    <span className="text-base font-bold text-emerald-400">{selectedFielder.catchingRating}/100</span>
                  </div>
                  <div className="rounded-xl bg-slate-950 p-2.5 border border-slate-800">
                    <span className="text-[10px] text-slate-400 block">SPRINT SPEED</span>
                    <span className="text-base font-bold text-sky-400">{selectedFielder.speedKmH} KM/H</span>
                  </div>
                </div>

                {selectedFielder.isHotZone && (
                  <div className="flex items-center gap-2 rounded-xl bg-rose-500/10 border border-rose-500/30 p-2.5 text-xs text-rose-300 font-mono">
                    <AlertTriangle className="h-4 w-4 shrink-0 text-rose-400" />
                    <span>Designated Hot Zone: High probability aerial landing sector for current match state.</span>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-4 space-y-2">
                <Eye className="h-6 w-6 text-slate-600 mx-auto" />
                <p className="text-xs text-slate-400 font-mono">
                  Click on any fielder on the stadium oval above to view catching radius, sprint velocity, and hot-zone assignments.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
