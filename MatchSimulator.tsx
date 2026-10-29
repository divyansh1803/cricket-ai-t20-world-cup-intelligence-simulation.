import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useGame } from '../../context/GameContext';
import { TEAMS, STADIUMS } from '../../data/cricketData';
import {
  Team,
  Stadium,
  BallEvent,
  Player,
  SimulatorEventState,
  DrsBallTrackingOutcome,
} from '../../types/cricket';
import { CricketIntelligenceEngine } from '../../engine/simulationEngine';
import {
  InningsEngineState,
  buildOrderedPlayingXI,
  createInitialInningsState,
  simulateSingleInningsDelivery,
  simulateInningsToCompletion,
  computeInningsScorecard,
  overturnDismissalInInningsState,
  markDrsUpheldInInningsState,
  convertDeliveryToWicketInInningsState,
} from '../../engine/matchScoreboardEngine';
import { cricketAudio } from '../../utils/audioSystem';
import { audioManager } from '../../services/AudioManager';
import { getTeamFlagUrl, TeamFlag } from '../common/CricketIdentity';
import { StadiumPhoto } from '../common/StadiumPhoto';
import { MatchCeremonyModal, TossDecisionResult } from './MatchCeremonyModal';
import { MatchCelebrationOverlay } from '../common/MatchCelebrationOverlay';
import { DrsBroadcastModal } from './DrsBroadcastModal';
import { BroadcastBallTrackingCanvas } from './BroadcastBallTrackingCanvas';
import { WhyTeamWonReport } from './WhyTeamWonReport';
import { MatchSummaryDashboard } from './MatchSummaryDashboard';
import { InningsBreakScoreboard } from './InningsBreakScoreboard';
import { PitchInspector } from '../common/PitchInspector';
import { FieldDrsInteractive } from './FieldDrsInteractive';
import { DrsFieldTelemetryView } from './DrsFieldTelemetryView';
import { Stadium3DGround } from './Stadium3DGround';
import { LiveTacticalFieldView } from './LiveTacticalFieldView';
import { MatchMomentumOverlay } from './MatchMomentumOverlay';
import { MomentumShiftIndicator } from './MomentumShiftIndicator';
import { DrsConfidenceMatrix } from './DrsConfidenceMatrix';
import { UmpireDecisionVisualizer } from './UmpireDecisionVisualizer';
import { PlayerFatigueAnalysis } from './PlayerFatigueAnalysis';
import { RivalryHeadToHead } from './RivalryHeadToHead';
import { BattingTimingVisualizer } from './BattingTimingVisualizer';
import { ShotDecisionAdvisor, ShotDecisionAdvisorHUD } from './ShotDecisionAdvisor';
import {
  InGameWicketProbabilityOverlay,
  calculateBatterPressure,
  calculateBowlerPrecision,
} from './InGameWicketProbabilityOverlay';
import { WagonWheel360 } from '../common/WagonWheel360';
import { ShotMapPitch, mapBallEventsToPitchDeliveries } from '../common/ShotMapPitch';
import { useDynamicCommentary } from '../../hooks/useDynamicCommentary';
import { StrategyInsightsPanel } from './StrategyInsightsPanel';
import { AIFieldingStrategyCoach } from './AIFieldingStrategyCoach';
import { InteractiveMatchGuideModal } from './InteractiveMatchGuideModal';
import { FallOfWicketsModal } from './FallOfWicketsModal';
import { LiveBroadcastScoreboard } from './LiveBroadcastScoreboard';
import { LiveTelecastSuite } from './LiveTelecastSuite';
import { CompleteMatchScorecard } from './CompleteMatchScorecard';
import { PlayingXISelectorModal } from './PlayingXISelectorModal';
import { WinProbabilityD3Chart } from './WinProbabilityD3Chart';
import { TacticalDecisionEnginePanel } from './TacticalDecisionEnginePanel';
import { MatchEventTimeline } from './MatchEventTimeline';
import { SimulatorPitchShotHeatmap } from './SimulatorPitchShotHeatmap';
import { ProMatchAnalysisTenSuite } from '../analytics/ProMatchAnalysisTenSuite';
import {
  WeatherPitchConditionsModule,
  SimulatorSurfaceCondition,
  computeSurfaceConditionAiOutcomes,
} from './WeatherPitchConditionsModule';
import {
  MatchSimulatorProvider,
  MatchSimulatorContextValue,
} from '../../context/MatchSimulatorContext';
import { triggerHaptic, HAPTIC_PATTERNS } from '../../utils/haptics';
import {
  Play,
  Pause,
  RotateCcw,
  FastForward,
  TrendingUp,
  Sparkles,
  Shield,
  HelpCircle,
  Trophy,
  Swords,
  Clock,
  Tv,
  Radio,
  Users,
  Droplets,
} from 'lucide-react';

interface EngineSnapshot {
  innings1: InningsEngineState;
  innings2: InningsEngineState;
  superOver1: InningsEngineState | null;
  superOver2: InningsEngineState | null;
  liveInningsNumber: 1 | 2 | 3 | 4;
}

function deriveConditionFromStadium(s: Stadium): SimulatorSurfaceCondition {
  const pitch = (s.pitchType || '').toLowerCase();
  if (pitch.includes('spin') || pitch.includes('slow') || pitch.includes('dry')) {
    return 'dusty';
  }
  if (pitch.includes('pace') || pitch.includes('seam') || pitch.includes('green')) {
    return 'damp';
  }
  return 'batting_paradise';
}

export const MatchSimulator: React.FC = () => {
  const {
    addXp,
    recordPrediction,
    setActiveModalPlayer,
    simTeamAId,
    simTeamBId,
    simStadiumId,
    isBroadcastMode,
    toggleBroadcastMode,
    matchDurationSeconds,
    setSimMatchRunning,
    resetMatchDuration,
  } = useGame();

  // Match Configuration
  const initialTeamA = TEAMS.find((t) => t.id === simTeamAId) || TEAMS[0];
  const initialTeamB = TEAMS.find((t) => t.id === simTeamBId) || TEAMS[1];
  const initialStadium = STADIUMS.find((s) => s.id === simStadiumId) || STADIUMS[0];

  const [teamA, setTeamA] = useState<Team>(initialTeamA);
  const [teamB, setTeamB] = useState<Team>(initialTeamB);
  const [stadium, setStadium] = useState<Stadium>(initialStadium);
  const [surfaceCondition, setSurfaceCondition] = useState<SimulatorSurfaceCondition>(() =>
    deriveConditionFromStadium(initialStadium)
  );
  const [totalOvers, setTotalOvers] = useState<number>(20);
  const [dewActive, setDewActive] = useState<boolean>(true);
  const [matchStartMode, setMatchStartMode] = useState<'FULL_2_INNINGS' | 'CHASE_READY'>('FULL_2_INNINGS');

  // Playing XI Ordered Lineups
  const [playingXIA, setPlayingXIA] = useState<Player[]>(() => buildOrderedPlayingXI(initialTeamA));
  const [playingXIB, setPlayingXIB] = useState<Player[]>(() => buildOrderedPlayingXI(initialTeamB));
  const [showPlayingXIModal, setShowPlayingXIModal] = useState<boolean>(false);
  const [showLiveTelecast, setShowLiveTelecast] = useState<boolean>(true);

  // Sync external navigation selections
  useEffect(() => {
    if (simTeamAId) {
      const foundA = TEAMS.find((t) => t.id === simTeamAId);
      if (foundA) {
        setTeamA(foundA);
        setPlayingXIA(buildOrderedPlayingXI(foundA));
      }
    }
    if (simTeamBId) {
      const foundB = TEAMS.find((t) => t.id === simTeamBId);
      if (foundB) {
        setTeamB(foundB);
        setPlayingXIB(buildOrderedPlayingXI(foundB));
      }
    }
    if (simStadiumId) {
      const foundS = STADIUMS.find((s) => s.id === simStadiumId);
      if (foundS) {
        setStadium(foundS);
        setSurfaceCondition(deriveConditionFromStadium(foundS));
      }
    }
  }, [simTeamAId, simTeamBId, simStadiumId]);

  // Tactical User Controls
  const [battingAggression, setBattingAggression] = useState<
    'Anchor' | 'Balanced' | 'Aggressive' | 'Maximum Risk'
  >('Aggressive');
  const [bowlingLine, setBowlingLine] = useState<
    'Stump-to-stump' | 'Wide Yorker' | 'Hard Deck Bouncer' | 'Slower Variation'
  >('Wide Yorker');
  const [fieldPreset, setFieldPreset] = useState<
    'Aggressive Slips' | 'Balanced Ring' | 'Deep Boundary Defense'
  >('Balanced Ring');

  const userTactics = useMemo(
    () => ({
      battingAggression,
      bowlingLine,
      fieldPreset,
    }),
    [battingAggression, bowlingLine, fieldPreset]
  );

  // Authoritative Dual-Innings + Super Over Engine State
  const buildFreshEngineSnapshot = useCallback(
    (
      firstBatTeam: Team,
      secondBatTeam: Team,
      firstBatXI: Player[],
      secondBatXI: Player[],
      oversLimit: number
    ): EngineSnapshot => {
      const inn1 = createInitialInningsState({
        inningsNumber: 1,
        battingTeam: firstBatTeam,
        bowlingTeam: secondBatTeam,
        battingXI: firstBatXI,
        bowlingXI: secondBatXI,
        maxOvers: oversLimit,
        status: 'live',
      });
      const inn2 = createInitialInningsState({
        inningsNumber: 2,
        battingTeam: secondBatTeam,
        bowlingTeam: firstBatTeam,
        battingXI: secondBatXI,
        bowlingXI: firstBatXI,
        maxOvers: oversLimit,
        status: 'upcoming',
      });
      return {
        innings1: inn1,
        innings2: inn2,
        superOver1: null,
        superOver2: null,
        liveInningsNumber: 1,
      };
    },
    []
  );

  const [engineState, setEngineState] = useState<EngineSnapshot>(() =>
    buildFreshEngineSnapshot(
      initialTeamB,
      initialTeamA,
      buildOrderedPlayingXI(initialTeamB),
      buildOrderedPlayingXI(initialTeamA),
      20
    )
  );
  const engineRef = useRef<EngineSnapshot>(engineState);
  const isSteppingRef = useRef<boolean>(false);

  const commitEngineState = useCallback((next: EngineSnapshot) => {
    engineRef.current = next;
    setEngineState(next);
  }, []);

  // Keep pre-match preview innings synced when user changes teams, Playing XI, or overs prior to match start
  const [isMatchActive, setIsMatchActive] = useState<boolean>(false);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [tossSummary, setTossSummary] = useState<string | null>(null);
  const [selectedInningsTab, setSelectedInningsTab] = useState<1 | 2 | 3 | 4>(1);
  const [activeMainTab, setActiveMainTab] = useState<'arena' | 'scorecard' | 'overs' | 'analysis'>('arena');

  useEffect(() => {
    if (!isMatchActive) {
      const fresh = buildFreshEngineSnapshot(teamB, teamA, playingXIB, playingXIA, totalOvers);
      commitEngineState(fresh);
      setSelectedInningsTab(1);
    }
  }, [teamA, teamB, playingXIA, playingXIB, totalOvers, isMatchActive, buildFreshEngineSnapshot, commitEngineState]);

  // Ceremony & Celebrations State
  const [showCeremony, setShowCeremony] = useState<boolean>(false);
  const [activeCelebration, setActiveCelebration] = useState<
    'SIX' | 'FOUR' | 'WICKET' | 'FIFTY' | 'CENTURY' | 'VICTORY' | null
  >(null);

  // DRS & Modal States
  const [isDrsActive, setIsDrsActive] = useState<boolean>(false);
  const [drsOutcome, setDrsOutcome] = useState<string | null>(null);
  const [showBroadcastDrs, setShowBroadcastDrs] = useState<boolean>(false);
  const [showAiReportModal, setShowAiReportModal] = useState<boolean>(false);
  const [showInningsBreakModal, setShowInningsBreakModal] = useState<boolean>(false);
  const [postMatchTab, setPostMatchTab] = useState<'summary' | 'why_won' | 'pro_analysis'>('summary');
  const [pitchSubTab, setPitchSubTab] = useState<
    | 'pitch'
    | 'pitch_heatmap'
    | 'shot_advisor'
    | 'tactical'
    | 'drs_telemetry'
    | 'drs_matrix'
    | 'momentum'
    | 'umpire'
    | 'fatigue'
    | 'timing'
    | 'wagon'
    | 'shot_map'
    | 'inspector'
  >('pitch');
  const [simulatorShotZone, setSimulatorShotZone] = useState<string>('Cover');
  const [hudVibrationClass, setHudVibrationClass] = useState<string>('');
  const [showRivalryDashboard, setShowRivalryDashboard] = useState<boolean>(false);
  const [showVenueWcComparison, setShowVenueWcComparison] = useState<boolean>(false);
  const [showSimWicketRiskModal, setShowSimWicketRiskModal] = useState<boolean>(false);
  const [showInteractiveGuide, setShowInteractiveGuide] = useState<boolean>(false);
  const [selectedWicketModal, setSelectedWicketModal] = useState<any | null>(null);

  // Next Ball Prediction State
  const [userNextBallGuess, setUserNextBallGuess] = useState<
    'DOT' | 'RUNS' | 'BOUNDARY' | 'WICKET' | null
  >(null);
  const [predictionFeedback, setPredictionFeedback] = useState<string | null>(null);

  // Dynamic Broadcast Commentary Hook
  const {
    latestEntry,
    isVoiceActive,
    processBallEvent,
    clearCommentary,
  } = useDynamicCommentary({ enableVoice: true, enableAudioCues: true });

  // Formal Simulator Event State & DRS Ball-Tracking State Machine
  const [simulatorEventState, setSimulatorEventState] = useState<SimulatorEventState>('IDLE');
  const [drsReviewState, setDrsReviewState] = useState<
    'IDLE' | 'REVIEW_AVAILABLE' | 'REVIEWING' | 'OVERTURNED' | 'UPHELD'
  >('IDLE');
  const [drsSequencePhase, setDrsSequencePhase] = useState<
    'IDLE' | 'FRONT_FOOT' | 'ULTRA_EDGE' | 'BALL_TRACKING' | 'VERDICT'
  >('IDLE');
  const [activeBallTracking, setActiveBallTracking] = useState<DrsBallTrackingOutcome | null>(null);
  const [drsReviewsLeft, setDrsReviewsLeft] = useState<{ batting: number; bowling: number }>({
    batting: 2,
    bowling: 2,
  });
  const [drsTrackingSummary, setDrsTrackingSummary] = useState<{
    pitching: string;
    impact: string;
    wickets: string;
    verdict: 'NOT OUT' | 'OUT' | "UMPIRE'S CALL";
    explanation: string;
  } | null>(null);
  const [lastDismissalContext, setLastDismissalContext] = useState<{
    inningsNumber: 1 | 2 | 3 | 4;
    eventIndex: number;
    dismissedBatter: Player;
    bowler: Player;
    ballEvent: BallEvent;
    ballLabel: string;
    appealMode: 'LBW' | 'CAUGHT BEHIND';
    preBallWinProb: number;
    scoreAfterWicket: number;
    wicketsAfterWicket: number;
    legalBallsAfterWicket: number;
  } | null>(null);
  const [drsLedger, setDrsLedger] = useState<
    Array<{
      id: string;
      overLabel: string;
      batterName: string;
      bowlerName: string;
      appealType: 'LBW' | 'CAUGHT BEHIND';
      decision: 'UPHELD' | 'OVERTURNED';
      finalVerdict: 'OUT' | 'NOT OUT';
      isUmpiresCall: boolean;
      wickets: string;
      speedKmh: number;
    }>
  >([]);
  const drsPhaseTimersRef = useRef<NodeJS.Timeout[]>([]);
  const playTimerRef = useRef<NodeJS.Timeout | null>(null);
  const wasAutoplayRunningRef = useRef<boolean>(false);
  const [simSpeedMs, setSimSpeedMs] = useState<1100 | 600 | 300>(1100);
  const isPlayingRef = useRef<boolean>(isPlaying);

  useEffect(() => {
    isPlayingRef.current = isPlaying;
  }, [isPlaying]);

  // Milestone Notification System
  const [milestoneBadge, setMilestoneBadge] = useState<{
    title: string;
    subtext: string;
    icon: string;
  } | null>(null);

  // Compute deterministic Scorecards from authoritative InningsEngineStates
  const innings1Scorecard = useMemo(
    () => computeInningsScorecard(engineState.innings1),
    [engineState.innings1]
  );
  const innings2Scorecard = useMemo(
    () => computeInningsScorecard(engineState.innings2),
    [engineState.innings2]
  );
  const superOver1Scorecard = useMemo(
    () => (engineState.superOver1 ? computeInningsScorecard(engineState.superOver1) : null),
    [engineState.superOver1]
  );
  const superOver2Scorecard = useMemo(
    () => (engineState.superOver2 ? computeInningsScorecard(engineState.superOver2) : null),
    [engineState.superOver2]
  );

  const activeLiveInnings: InningsEngineState = useMemo(() => {
    if (engineState.liveInningsNumber === 4 && engineState.superOver2) return engineState.superOver2;
    if (engineState.liveInningsNumber === 3 && engineState.superOver1) return engineState.superOver1;
    if (engineState.liveInningsNumber === 2) return engineState.innings2;
    return engineState.innings1;
  }, [engineState]);

  const liveScorecard = useMemo(() => {
    if (engineState.liveInningsNumber === 4 && superOver2Scorecard) return superOver2Scorecard;
    if (engineState.liveInningsNumber === 3 && superOver1Scorecard) return superOver1Scorecard;
    if (engineState.liveInningsNumber === 2) return innings2Scorecard;
    return innings1Scorecard;
  }, [
    engineState.liveInningsNumber,
    innings1Scorecard,
    innings2Scorecard,
    superOver1Scorecard,
    superOver2Scorecard,
  ]);

  const displayedScorecard = useMemo(() => {
    if (selectedInningsTab === 4 && superOver2Scorecard) return superOver2Scorecard;
    if (selectedInningsTab === 3 && superOver1Scorecard) return superOver1Scorecard;
    if (selectedInningsTab === 2) return innings2Scorecard;
    return innings1Scorecard;
  }, [
    selectedInningsTab,
    innings1Scorecard,
    innings2Scorecard,
    superOver1Scorecard,
    superOver2Scorecard,
  ]);

  // Active live match references derived directly from authoritative liveScorecard
  const battingTeamLive = activeLiveInnings.battingTeam;
  const bowlingTeamLive = activeLiveInnings.bowlingTeam;
  const striker =
    liveScorecard.strikerRow?.player || activeLiveInnings.battingXI[0] || teamA.squad[0];
  const nonStriker =
    liveScorecard.nonStrikerRow?.player || activeLiveInnings.battingXI[1] || teamA.squad[1];
  const bowler =
    liveScorecard.currentBowlerRow?.player || activeLiveInnings.bowlingXI[0] || teamB.squad[0];

  const runs = liveScorecard.runs;
  const wickets = liveScorecard.wickets;
  const currentBallIndex = liveScorecard.legalBalls;
  const history = activeLiveInnings.events;
  const lastBall = history.length > 0 ? history[history.length - 1] : null;
  const targetScore =
    liveScorecard.targetRuns && liveScorecard.targetRuns > 0
      ? liveScorecard.targetRuns
      : innings1Scorecard.status === 'completed'
      ? innings1Scorecard.runs + 1
      : stadium.avgFirstInningsScore || 185;

  const oversDone = Math.floor(currentBallIndex / 6);
  const ballsInCurrentOver = currentBallIndex % 6;
  const currentRR = liveScorecard.currentRunRate.toFixed(2);
  const requiredRR =
    liveScorecard.targetRuns && liveScorecard.targetRuns > 0
      ? liveScorecard.requiredRunRate > 99
        ? '99.99'
        : liveScorecard.requiredRunRate.toFixed(2)
      : '0.00';

  const baseEngineWinProb =
    activeLiveInnings.winProbHistory[activeLiveInnings.winProbHistory.length - 1] ?? 50;

  const conditionAiOutcome = useMemo(
    () =>
      computeSurfaceConditionAiOutcomes({
        condition: surfaceCondition,
        stadium,
        baseWinProb: baseEngineWinProb,
        baseProjectedScore: liveScorecard.projectedScore,
        inningsNumber: engineState.liveInningsNumber,
        wickets,
        ballsRemaining: liveScorecard.ballsRemaining,
        striker,
        bowler,
        battingTeam: battingTeamLive,
        bowlingTeam: bowlingTeamLive,
      }),
    [
      surfaceCondition,
      stadium,
      baseEngineWinProb,
      liveScorecard.projectedScore,
      engineState.liveInningsNumber,
      wickets,
      liveScorecard.ballsRemaining,
      striker,
      bowler,
      battingTeamLive,
      bowlingTeamLive,
    ]
  );

  const effectiveStadium = conditionAiOutcome.effectiveStadium;
  const effectiveDew =
    surfaceCondition === 'dusty'
      ? false
      : surfaceCondition === 'damp'
      ? true
      : dewActive;

  const handleSurfaceConditionChange = useCallback((next: SimulatorSurfaceCondition) => {
    triggerHaptic(HAPTIC_PATTERNS.TAP);
    cricketAudio.playUiClick();
    setSurfaceCondition(next);
    if (next === 'damp') setDewActive(true);
    if (next === 'dusty') setDewActive(false);
  }, []);

  const currentWinProb =
    innings2Scorecard.status === 'completed' ||
    (engineState.superOver2 && engineState.superOver2.status === 'completed')
      ? baseEngineWinProb
      : conditionAiOutcome.metrics.adjustedWinProb;
  const currentMomentum = CricketIntelligenceEngine.calculateMomentum(history);

  // Determine Match Verdict & Tied / Super Over Status
  const matchResultBanner = useMemo(() => {
    if (!isMatchActive) return null;

    if (engineState.superOver2 && engineState.superOver2.status === 'completed' && superOver1Scorecard && superOver2Scorecard) {
      const soTarget = superOver1Scorecard.runs + 1;
      if (superOver2Scorecard.runs >= soTarget) {
        return {
          headline: `${superOver2Scorecard.battingTeam.name} Won via Super Over!`,
          subtext: `Super Over: ${superOver2Scorecard.battingTeam.name} ${superOver2Scorecard.runs}/${superOver2Scorecard.wickets} beat ${superOver1Scorecard.battingTeam.name} ${superOver1Scorecard.runs}/${superOver1Scorecard.wickets}`,
          winnerTeam: superOver2Scorecard.battingTeam,
          isTied: false,
        };
      }
      if (superOver2Scorecard.runs === superOver1Scorecard.runs) {
        return {
          headline: `Super Over Tied at ${superOver2Scorecard.runs} Runs Apiece!`,
          subtext: 'Launch another 1-Over Super Over decider to separate the sides.',
          winnerTeam: null,
          isTied: true,
        };
      }
      return {
        headline: `${superOver1Scorecard.battingTeam.name} Won via Super Over!`,
        subtext: `Defended ${superOver1Scorecard.runs} in the Super Over (${superOver2Scorecard.battingTeam.name} ${superOver2Scorecard.runs}/${superOver2Scorecard.wickets})`,
        winnerTeam: superOver1Scorecard.battingTeam,
        isTied: false,
      };
    }

    if (innings2Scorecard.status === 'completed') {
      const chaseTarget = innings1Scorecard.runs + 1;
      if (innings2Scorecard.runs >= chaseTarget) {
        const wktsInHand = Math.max(1, innings2Scorecard.maxWickets - innings2Scorecard.wickets);
        return {
          headline: `${innings2Scorecard.battingTeam.name} Won by ${wktsInHand} Wicket${wktsInHand > 1 ? 's' : ''}!`,
          subtext: `Chased ${chaseTarget} in ${innings2Scorecard.oversFormatted} overs (${innings2Scorecard.ballsRemaining} balls remaining)`,
          winnerTeam: innings2Scorecard.battingTeam,
          isTied: false,
        };
      }
      if (innings2Scorecard.runs === innings1Scorecard.runs) {
        return {
          headline: `Match Tied — Both Teams Finished on ${innings1Scorecard.runs}!`,
          subtext: `${innings1Scorecard.battingTeam.name} ${innings1Scorecard.runs}/${innings1Scorecard.wickets} · ${innings2Scorecard.battingTeam.name} ${innings2Scorecard.runs}/${innings2Scorecard.wickets}`,
          winnerTeam: null,
          isTied: true,
        };
      }
      const runMargin = innings1Scorecard.runs - innings2Scorecard.runs;
      return {
        headline: `${innings1Scorecard.battingTeam.name} Won by ${runMargin} Run${runMargin > 1 ? 's' : ''}!`,
        subtext: `Defended ${innings1Scorecard.runs}/${innings1Scorecard.wickets} (${innings2Scorecard.battingTeam.name} ${innings2Scorecard.runs}/${innings2Scorecard.wickets} in ${innings2Scorecard.oversFormatted} ov)`,
        winnerTeam: innings1Scorecard.battingTeam,
        isTied: false,
      };
    }

    return null;
  }, [
    isMatchActive,
    innings1Scorecard,
    innings2Scorecard,
    superOver1Scorecard,
    superOver2Scorecard,
    engineState.superOver2,
  ]);

  const isMatchOver = Boolean(matchResultBanner && !matchResultBanner.isTied);

  // Sync simulation start/stop state with persistent Header Match Duration clock
  useEffect(() => {
    setSimMatchRunning(isMatchActive && isPlaying && !isMatchOver);
    return () => {
      setSimMatchRunning(false);
    };
  }, [isMatchActive, isPlaying, isMatchOver, setSimMatchRunning]);

  const formattedMatchDuration = useMemo(() => {
    const h = Math.floor(matchDurationSeconds / 3600);
    const m = Math.floor((matchDurationSeconds % 3600) / 60);
    const s = matchDurationSeconds % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }, [matchDurationSeconds]);

  // Dynamically compute real Player of the Match across BOTH innings
  const computedPlayerOfTheMatch = useMemo<Player>(() => {
    const winner = matchResultBanner?.winnerTeam || innings2Scorecard.battingTeam;
    const playerPoints: Record<string, { player: Player; points: number }> = {};

    const registerCard = (card: typeof innings1Scorecard) => {
      card.batters.forEach((b) => {
        if (!playerPoints[b.player.id]) {
          playerPoints[b.player.id] = { player: b.player, points: 0 };
        }
        playerPoints[b.player.id].points +=
          b.runs * 1.45 + b.fours * 2 + b.sixes * 4.5 + (b.strikeRate >= 150 && b.balls >= 10 ? 15 : 0);
      });
      card.bowlers.forEach((bw) => {
        if (!playerPoints[bw.player.id]) {
          playerPoints[bw.player.id] = { player: bw.player, points: 0 };
        }
        playerPoints[bw.player.id].points +=
          bw.wickets * 28 + bw.maidens * 14 + bw.dots * 1.5 + (bw.legalBalls >= 12 && bw.economy <= 7 ? 16 : 0);
      });
    };

    registerCard(innings1Scorecard);
    registerCard(innings2Scorecard);
    if (superOver1Scorecard) registerCard(superOver1Scorecard);
    if (superOver2Scorecard) registerCard(superOver2Scorecard);

    Object.values(playerPoints).forEach((entry) => {
      if (winner.squad.some((p) => p.id === entry.player.id)) {
        entry.points *= 1.3;
      }
    });

    const sorted = Object.values(playerPoints).sort((a, b) => b.points - a.points);
    return sorted[0]?.player || winner.squad[0];
  }, [
    matchResultBanner,
    innings1Scorecard,
    innings2Scorecard,
    superOver1Scorecard,
    superOver2Scorecard,
  ]);

  const clearDrsPhaseTimers = useCallback(() => {
    drsPhaseTimersRef.current.forEach((timer) => clearTimeout(timer));
    drsPhaseTimersRef.current = [];
  }, []);

  useEffect(() => {
    return () => {
      clearDrsPhaseTimers();
      if (playTimerRef.current) clearTimeout(playTimerRef.current);
    };
  }, [clearDrsPhaseTimers]);

  // Helper to update a specific innings inside EngineSnapshot
  const updateSpecificInnings = useCallback(
    (inningsNum: 1 | 2 | 3 | 4, nextInningsState: InningsEngineState) => {
      const snap = engineRef.current;
      const updated: EngineSnapshot = {
        ...snap,
        innings1: inningsNum === 1 ? nextInningsState : snap.innings1,
        innings2: inningsNum === 2 ? nextInningsState : snap.innings2,
        superOver1: inningsNum === 3 ? nextInningsState : snap.superOver1,
        superOver2: inningsNum === 4 ? nextInningsState : snap.superOver2,
      };
      commitEngineState(updated);
    },
    [commitEngineState]
  );

  // Ceremony & Match Initialization
  const finalizeCeremonyAndStart = useCallback(
    (toss?: TossDecisionResult) => {
      setShowCeremony(false);
      let firstBatTeam = teamB;
      let secondBatTeam = teamA;
      let firstBatXI = playingXIB;
      let secondBatXI = playingXIA;

      if (matchStartMode === 'FULL_2_INNINGS' && toss) {
        const teamABatsFirst =
          (toss.winner.id === teamA.id && toss.electedTo === 'bat') ||
          (toss.winner.id === teamB.id && toss.electedTo === 'field');
        if (teamABatsFirst) {
          firstBatTeam = teamA;
          secondBatTeam = teamB;
          firstBatXI = playingXIA;
          secondBatXI = playingXIB;
        }
        setTossSummary(toss.summary);
      } else {
        setTossSummary(
          toss?.summary || `${teamA.name} won the toss and elected to field first`
        );
      }

      const baseSnap = buildFreshEngineSnapshot(
        firstBatTeam,
        secondBatTeam,
        firstBatXI,
        secondBatXI,
        totalOvers
      );

      if (matchStartMode === 'CHASE_READY') {
        // Simulate all of 1st Innings through the real ball-by-ball engine so zero values are hardcoded
        const completedInn1 = simulateInningsToCompletion(
          baseSnap.innings1,
          effectiveStadium,
          effectiveDew,
          userTactics
        );
        const liveInn2 = createInitialInningsState({
          inningsNumber: 2,
          battingTeam: secondBatTeam,
          bowlingTeam: firstBatTeam,
          battingXI: secondBatXI,
          bowlingXI: firstBatXI,
          maxOvers: totalOvers,
          targetRuns: completedInn1.runs + 1,
          status: 'live',
        });
        commitEngineState({
          innings1: completedInn1,
          innings2: liveInn2,
          superOver1: null,
          superOver2: null,
          liveInningsNumber: 2,
        });
        setSelectedInningsTab(2);
      } else {
        commitEngineState(baseSnap);
        setSelectedInningsTab(1);
      }

      setDrsReviewsLeft({ batting: 2, bowling: 2 });
      setIsMatchActive(true);
      setSimulatorEventState('LIVE_PLAY');
      setIsPlaying(true);
    },
    [
      teamA,
      teamB,
      playingXIA,
      playingXIB,
      totalOvers,
      matchStartMode,
      buildFreshEngineSnapshot,
      effectiveStadium,
      effectiveDew,
      userTactics,
      commitEngineState,
    ]
  );

  const handleStartMatch = () => {
    triggerHaptic(HAPTIC_PATTERNS.TAP);
    clearDrsPhaseTimers();
    resetMatchDuration();
    clearCommentary();
    setIsPlaying(false);
    setActiveCelebration(null);
    setSimulatorEventState('IDLE');
    setDrsReviewState('IDLE');
    setDrsSequencePhase('IDLE');
    setActiveBallTracking(null);
    setDrsReviewsLeft({ batting: 2, bowling: 2 });
    setDrsTrackingSummary(null);
    setLastDismissalContext(null);
    setDrsLedger([]);
    setActiveMainTab('arena');
    setShowCeremony(true);
  };

  const handleReset = () => {
    triggerHaptic(HAPTIC_PATTERNS.TAP);
    clearDrsPhaseTimers();
    if (playTimerRef.current) clearTimeout(playTimerRef.current);
    resetMatchDuration();
    setIsPlaying(false);
    setIsMatchActive(false);
    setShowCeremony(false);
    setShowInningsBreakModal(false);
    setActiveCelebration(null);
    setTossSummary(null);
    setSimulatorEventState('IDLE');
    setDrsReviewState('IDLE');
    setDrsSequencePhase('IDLE');
    setActiveBallTracking(null);
    setDrsReviewsLeft({ batting: 2, bowling: 2 });
    setDrsTrackingSummary(null);
    setLastDismissalContext(null);
    setDrsLedger([]);
    setMilestoneBadge(null);
    setPredictionFeedback(null);
    setUserNextBallGuess(null);
    clearCommentary();
    audioManager.stopDeathOversMusic();
    audioManager.stopDrsHeartbeatLoop();

    const fresh = buildFreshEngineSnapshot(teamB, teamA, playingXIB, playingXIA, totalOvers);
    commitEngineState(fresh);
    setSelectedInningsTab(1);
    setActiveMainTab('arena');
  };

  // Start 2nd Innings Chase after 1st Innings concludes
  const handleStartSecondInnings = useCallback(() => {
    triggerHaptic(HAPTIC_PATTERNS.TAP);
    cricketAudio.playUiClick();
    const snap = engineRef.current;
    const target = snap.innings1.runs + 1;
    const liveInn2 = createInitialInningsState({
      inningsNumber: 2,
      battingTeam: snap.innings2.battingTeam,
      bowlingTeam: snap.innings2.bowlingTeam,
      battingXI: snap.innings2.battingXI,
      bowlingXI: snap.innings2.bowlingXI,
      maxOvers: totalOvers,
      targetRuns: target,
      status: 'live',
    });
    commitEngineState({
      ...snap,
      innings2: liveInn2,
      liveInningsNumber: 2,
    });
    setSelectedInningsTab(2);
    setDrsReviewsLeft({ batting: 2, bowling: 2 });
    setShowInningsBreakModal(false);
    setSimulatorEventState('LIVE_PLAY');
    setDrsReviewState('IDLE');
    setLastDismissalContext(null);
    if (wasAutoplayRunningRef.current) {
      wasAutoplayRunningRef.current = false;
      setIsPlaying(true);
    }
  }, [totalOvers, commitEngineState]);

  // Quick-Sim remainder of 1st Innings using genuine ball-by-ball simulation
  const handleQuickFinishFirstInnings = useCallback(() => {
    if (isSteppingRef.current) return;
    triggerHaptic(HAPTIC_PATTERNS.OVER_COMPLETE);
    setIsPlaying(false);
    const snap = engineRef.current;
    if (snap.liveInningsNumber !== 1) return;

    const completedInn1 = simulateInningsToCompletion(
      snap.innings1,
      effectiveStadium,
      effectiveDew,
      userTactics
    );
    const updatedInn2: InningsEngineState = {
      ...snap.innings2,
      targetRuns: completedInn1.runs + 1,
    };
    commitEngineState({
      ...snap,
      innings1: completedInn1,
      innings2: updatedInn2,
      liveInningsNumber: 1,
    });
    setSimulatorEventState('INNINGS_BREAK');
    setShowInningsBreakModal(true);
  }, [effectiveStadium, effectiveDew, userTactics, commitEngineState]);

  // Launch 1-Over Super Over when regulation or previous Super Over is tied
  const handleStartSuperOver = useCallback(() => {
    triggerHaptic(HAPTIC_PATTERNS.TAP);
    cricketAudio.playTossCoin();
    setIsPlaying(false);
    const snap = engineRef.current;
    // Per ICC protocol, team that batted 2nd in regulation bats 1st in the Super Over
    const soFirstBat = snap.innings2.battingTeam;
    const soSecondBat = snap.innings1.battingTeam;
    const soFirstXI = snap.innings2.battingXI;
    const soSecondXI = snap.innings1.battingXI;

    const so1 = createInitialInningsState({
      inningsNumber: 3,
      battingTeam: soFirstBat,
      bowlingTeam: soSecondBat,
      battingXI: soFirstXI,
      bowlingXI: soSecondXI,
      maxOvers: 1,
      status: 'live',
    });
    const so2 = createInitialInningsState({
      inningsNumber: 4,
      battingTeam: soSecondBat,
      bowlingTeam: soFirstBat,
      battingXI: soSecondXI,
      bowlingXI: soFirstXI,
      maxOvers: 1,
      status: 'upcoming',
    });

    commitEngineState({
      ...snap,
      superOver1: so1,
      superOver2: so2,
      liveInningsNumber: 3,
    });
    setSelectedInningsTab(3);
    setDrsReviewsLeft({ batting: 1, bowling: 1 });
    setSimulatorEventState('LIVE_PLAY');
    setDrsReviewState('IDLE');
    setLastDismissalContext(null);
    setIsPlaying(true);
  }, [commitEngineState]);

  // Manual bowler selection at start of new over
  const handleSelectBowlerForOver = useCallback(
    (bowlerId: string) => {
      const snap = engineRef.current;
      const innNum = snap.liveInningsNumber;
      const targetInn =
        innNum === 4
          ? snap.superOver2
          : innNum === 3
          ? snap.superOver1
          : innNum === 2
          ? snap.innings2
          : snap.innings1;
      if (!targetInn || targetInn.status !== 'live') return;
      if (bowlerId === targetInn.previousOverBowlerId) return;

      cricketAudio.playUiClick();
      updateSpecificInnings(innNum, {
        ...targetInn,
        currentBowlerId: bowlerId,
      });
    },
    [updateSpecificInnings]
  );

  // =========================================================================
  // DRS RESOLUTION HANDLERS (ATOMICALLY SYNCED TO INNINGS ENGINE STATE)
  // =========================================================================
  const resolveDrsBallTrackingOutcome = (outcome: DrsBallTrackingOutcome) => {
    clearDrsPhaseTimers();
    triggerHaptic(HAPTIC_PATTERNS.DRS_DECISION);
    audioManager.playDrsDecisionReveal(outcome.finalVerdict === 'OUT');
    setActiveBallTracking(outcome);
    setDrsSequencePhase('VERDICT');

    if (outcome.decision === 'OVERTURNED' && lastDismissalContext) {
      const snap = engineRef.current;
      const targetInn =
        lastDismissalContext.inningsNumber === 4
          ? snap.superOver2
          : lastDismissalContext.inningsNumber === 3
          ? snap.superOver1
          : lastDismissalContext.inningsNumber === 2
          ? snap.innings2
          : snap.innings1;

      if (targetInn) {
        const reprievedWickets = Math.max(0, lastDismissalContext.wicketsAfterWicket - 1);
        const correctedWinProb = CricketIntelligenceEngine.calculateWinProbability(
          lastDismissalContext.scoreAfterWicket,
          reprievedWickets,
          lastDismissalContext.legalBallsAfterWicket,
          targetInn.maxOvers,
          targetInn.targetRuns ?? 0,
          targetInn.battingTeam,
          targetInn.bowlingTeam,
          effectiveStadium,
          effectiveDew
        );
        const correctedDelta =
          Math.round((correctedWinProb - lastDismissalContext.preBallWinProb) * 10) / 10;

        const rebuiltInnings = overturnDismissalInInningsState(
          targetInn,
          lastDismissalContext.eventIndex,
          correctedWinProb,
          correctedDelta,
          outcome.wickets
        );
        updateSpecificInnings(lastDismissalContext.inningsNumber, rebuiltInnings);
      }

      setSimulatorEventState('DRS_OVERTURNED');
      setDrsReviewState('OVERTURNED');
      setDrsOutcome(outcome.summaryText);
      setDrsTrackingSummary({
        pitching: outcome.pitching,
        impact: outcome.impact,
        wickets: outcome.wickets,
        verdict: 'NOT OUT',
        explanation: outcome.summaryText,
      });
      cricketAudio.playMilestoneFifty();
      addXp(
        150,
        `Successful DRS Review! Overturned dismissal of ${lastDismissalContext.dismissedBatter.name}`
      );
    } else {
      if (!outcome.retainReview) {
        setDrsReviewsLeft((prev) => ({ ...prev, batting: Math.max(0, prev.batting - 1) }));
      }
      if (lastDismissalContext) {
        const snap = engineRef.current;
        const targetInn =
          lastDismissalContext.inningsNumber === 4
            ? snap.superOver2
            : lastDismissalContext.inningsNumber === 3
            ? snap.superOver1
            : lastDismissalContext.inningsNumber === 2
            ? snap.innings2
            : snap.innings1;
        if (targetInn) {
          const verdictTag = outcome.isUmpiresCall ? "UMPIRE'S CALL · OUT" : 'THREE REDS · OUT';
          const marked = markDrsUpheldInInningsState(
            targetInn,
            lastDismissalContext.eventIndex,
            verdictTag
          );
          updateSpecificInnings(lastDismissalContext.inningsNumber, marked);
        }
      }

      setSimulatorEventState('DRS_UPHELD');
      setDrsReviewState('UPHELD');
      setDrsOutcome(outcome.summaryText);
      setDrsTrackingSummary({
        pitching: outcome.pitching,
        impact: outcome.impact,
        wickets: outcome.wickets,
        verdict: outcome.isUmpiresCall ? "UMPIRE'S CALL" : 'OUT',
        explanation: outcome.summaryText,
      });
      addXp(75, 'Completed Third Umpire DRS Ball-Tracking Protocol');
    }

    if (lastDismissalContext) {
      setDrsLedger((prev) => {
        const entryId = `drs-${lastDismissalContext.inningsNumber}-${lastDismissalContext.eventIndex}`;
        if (prev.some((item) => item.id === entryId)) return prev;
        return [
          {
            id: entryId,
            overLabel: lastDismissalContext.ballLabel,
            batterName: lastDismissalContext.dismissedBatter.name,
            bowlerName: lastDismissalContext.bowler.name,
            appealType: outcome.appealType,
            decision: outcome.decision,
            finalVerdict: outcome.finalVerdict,
            isUmpiresCall: outcome.isUmpiresCall,
            wickets: outcome.wickets,
            speedKmh: outcome.speedKmh,
          },
          ...prev,
        ];
      });
    }
  };

  const applyDrsBallTrackingOutcome = (verdictResult?: {
    wicketDelta: number;
    explanation: string;
    ballTrackingOutcome?: DrsBallTrackingOutcome;
  }) => {
    if (verdictResult?.ballTrackingOutcome) {
      resolveDrsBallTrackingOutcome(verdictResult.ballTrackingOutcome);
      return;
    }
    if (
      activeBallTracking &&
      lastDismissalContext &&
      (drsReviewState === 'REVIEWING' || simulatorEventState === 'DRS_REVIEW')
    ) {
      resolveDrsBallTrackingOutcome(activeBallTracking);
      return;
    }

    triggerHaptic(HAPTIC_PATTERNS.DRS_DECISION);

    if (verdictResult && verdictResult.wicketDelta > 0) {
      const snap = engineRef.current;
      const innNum = snap.liveInningsNumber;
      const targetInn =
        innNum === 4
          ? snap.superOver2
          : innNum === 3
          ? snap.superOver1
          : innNum === 2
          ? snap.innings2
          : snap.innings1;

      if (targetInn && targetInn.events.length > 0) {
        const rebuilt = convertDeliveryToWicketInInningsState(
          targetInn,
          targetInn.events.length - 1,
          verdictResult.explanation
        );
        updateSpecificInnings(innNum, rebuilt);
      }

      setSimulatorEventState('DRS_OVERTURNED');
      setDrsReviewState('OVERTURNED');
      setDrsOutcome(verdictResult.explanation);
      setDrsTrackingSummary({
        pitching: 'IN LINE',
        impact: 'IN LINE',
        wickets: 'HITTING',
        verdict: 'OUT',
        explanation: verdictResult.explanation,
      });
      addXp(150, verdictResult.explanation);
      return;
    }

    if (lastDismissalContext && (!verdictResult || verdictResult.wicketDelta <= 0)) {
      const generated = CricketIntelligenceEngine.simulateDrsBallTracking(
        lastDismissalContext.ballEvent,
        stadium,
        dewActive
      );
      resolveDrsBallTrackingOutcome(generated);
      return;
    }

    setDrsReviewsLeft((prev) => ({ ...prev, bowling: Math.max(0, prev.bowling - 1) }));
    const explanation =
      verdictResult?.explanation ||
      `APPEAL TURNED DOWN — Ball-tracking shows impact outside line / missing stumps. ${bowlingTeamLive.name} loses 1 review.`;
    setSimulatorEventState('DRS_UPHELD');
    setDrsReviewState('UPHELD');
    setDrsOutcome(explanation);
    setDrsTrackingSummary({
      pitching: 'IN LINE',
      impact: 'OUTSIDE OFF',
      wickets: 'MISSING (OFF)',
      verdict: 'NOT OUT',
      explanation,
    });
  };

  const initiateDismissalDrsReview = (openBroadcastModal = false) => {
    if (!lastDismissalContext) return;
    if (drsReviewsLeft.batting <= 0 && simulatorEventState !== 'DRS_REVIEW') return;

    clearDrsPhaseTimers();
    if (isPlaying) {
      wasAutoplayRunningRef.current = true;
      setIsPlaying(false);
    }

    cricketAudio.playDrsTone();
    triggerHaptic(HAPTIC_PATTERNS.TAP);

    const outcome =
      activeBallTracking ||
      CricketIntelligenceEngine.simulateDrsBallTracking(
        lastDismissalContext.ballEvent,
        stadium,
        dewActive
      );

    setActiveBallTracking(outcome);
    setSimulatorEventState('DRS_REVIEW');
    setDrsReviewState('REVIEWING');
    setIsDrsActive(true);

    if (openBroadcastModal) {
      setDrsSequencePhase('BALL_TRACKING');
      setDrsOutcome('Third Umpire 3D TV Broadcast Review active — scanning UltraEdge & Hawk-Eye...');
      setShowBroadcastDrs(true);
      return;
    }

    setDrsSequencePhase('FRONT_FOOT');
    setDrsOutcome(
      `Step 1/3: Checking front-foot popping crease for ${lastDismissalContext.bowler.name} (${outcome.speedKmh} km/h)...`
    );

    const t1 = setTimeout(() => {
      audioManager.playDrsUltraEdgeSpike(outcome.ultraEdge === 'SPIKE DETECTED (EDGE)');
      setDrsSequencePhase('ULTRA_EDGE');
      setDrsOutcome(
        outcome.ultraEdge === 'SPIKE DETECTED (EDGE)'
          ? 'Step 2/3: UltraEdge detects sharp acoustic spike as ball passes bat! Verifying trajectory...'
          : 'Step 2/3: UltraEdge flatline — no bat involved. Locking Hawk-Eye 3D ball-tracking...'
      );
    }, 650);

    const t2 = setTimeout(() => {
      audioManager.playDrsBallTrackingRadar();
      setDrsSequencePhase('BALL_TRACKING');
      setDrsOutcome(
        `Step 3/3: Simulating ball-tracking projection — Pitching ${outcome.pitching}, Impact ${outcome.impact}...`
      );
    }, 1350);

    const t3 = setTimeout(() => {
      resolveDrsBallTrackingOutcome(outcome);
    }, 3200);

    drsPhaseTimersRef.current = [t1, t2, t3];
  };

  const skipToDrsVerdict = () => {
    if (!activeBallTracking) return;
    clearDrsPhaseTimers();
    resolveDrsBallTrackingOutcome(activeBallTracking);
  };

  const resumeFromDrsEvent = useCallback(() => {
    clearDrsPhaseTimers();
    triggerHaptic(HAPTIC_PATTERNS.TAP);
    setSimulatorEventState(isMatchOver ? 'MATCH_COMPLETE' : 'LIVE_PLAY');
    setDrsReviewState('IDLE');
    setDrsSequencePhase('IDLE');
    setDrsTrackingSummary(null);
    setActiveBallTracking(null);
    setIsDrsActive(false);

    if (wasAutoplayRunningRef.current && !isMatchOver) {
      wasAutoplayRunningRef.current = false;
      setIsPlaying(true);
    }
  }, [clearDrsPhaseTimers, isMatchOver]);

  // =========================================================================
  // CORE BALL-BY-BALL AUTHORITATIVE STEPPER (ZERO STALE CLOSURES / DUPLICATES)
  // =========================================================================
  const handlePostInningsCompletion = useCallback(
    (snapAfter: EngineSnapshot, completedInnings: InningsEngineState) => {
      const wasRunning = isPlayingRef.current || wasAutoplayRunningRef.current;

      if (completedInnings.inningsNumber === 1) {
        wasAutoplayRunningRef.current = wasRunning;
        setIsPlaying(false);
        const updatedInn2: InningsEngineState = {
          ...snapAfter.innings2,
          targetRuns: completedInnings.runs + 1,
        };
        commitEngineState({
          ...snapAfter,
          innings1: completedInnings,
          innings2: updatedInn2,
          liveInningsNumber: 1,
        });
        setSimulatorEventState('INNINGS_BREAK');
        setShowInningsBreakModal(true);
        return;
      }

      if (completedInnings.inningsNumber === 3 && snapAfter.superOver2) {
        // Super Over 1 complete -> start Super Over 2 chase automatically, preserving autoplay
        const liveSo2 = createInitialInningsState({
          inningsNumber: 4,
          battingTeam: snapAfter.superOver2.battingTeam,
          bowlingTeam: snapAfter.superOver2.bowlingTeam,
          battingXI: snapAfter.superOver2.battingXI,
          bowlingXI: snapAfter.superOver2.bowlingXI,
          maxOvers: 1,
          targetRuns: completedInnings.runs + 1,
          status: 'live',
        });
        commitEngineState({
          ...snapAfter,
          superOver1: completedInnings,
          superOver2: liveSo2,
          liveInningsNumber: 4,
        });
        setSelectedInningsTab(4);
        setSimulatorEventState('LIVE_PLAY');
        setIsPlaying(wasRunning);
        return;
      }

      setIsPlaying(false);
      wasAutoplayRunningRef.current = false;

      // Innings 2 or Super Over 2 completed
      const oppRuns =
        completedInnings.inningsNumber === 4 && snapAfter.superOver1
          ? snapAfter.superOver1.runs
          : snapAfter.innings1.runs;

      if (completedInnings.runs === oppRuns) {
        setSimulatorEventState('SUPER_OVER_READY');
      } else {
        setSimulatorEventState('MATCH_COMPLETE');
        setActiveCelebration('VICTORY');
        audioManager.stopDeathOversMusic();
        audioManager.playVictory();
        triggerHaptic(HAPTIC_PATTERNS.VICTORY_FANFARE);
        setTimeout(() => {
          addXp(
            200,
            `Completed match simulation: ${snapAfter.innings1.battingTeam.name} vs ${snapAfter.innings2.battingTeam.name}`
          );
        }, 500);
      }
    },
    [commitEngineState, addXp]
  );

  const executeNextBall = useCallback(() => {
    if (
      isSteppingRef.current ||
      isMatchOver ||
      simulatorEventState === 'DRS_REVIEW' ||
      simulatorEventState === 'INNINGS_BREAK' ||
      simulatorEventState === 'SUPER_OVER_READY'
    ) {
      return;
    }

    isSteppingRef.current = true;
    try {
      const snap = engineRef.current;
      const innNum = snap.liveInningsNumber;
      const currentInn =
        innNum === 4
          ? snap.superOver2
          : innNum === 3
          ? snap.superOver1
          : innNum === 2
          ? snap.innings2
          : snap.innings1;

      if (!currentInn || currentInn.status === 'completed') return;

      // Clear any previous resolved DRS banner before bowling next ball
      if (
        drsReviewState === 'OVERTURNED' ||
        drsReviewState === 'UPHELD' ||
        drsReviewState === 'REVIEW_AVAILABLE' ||
        simulatorEventState === 'DISMISSAL_EVENT' ||
        simulatorEventState === 'DRS_OVERTURNED' ||
        simulatorEventState === 'DRS_UPHELD'
      ) {
        setSimulatorEventState('LIVE_PLAY');
        setDrsReviewState('IDLE');
        setDrsSequencePhase('IDLE');
        setDrsTrackingSummary(null);
        setActiveBallTracking(null);
      }

      const preBallRuns = currentInn.runs;
      const preBallWinProb =
        currentInn.winProbHistory[currentInn.winProbHistory.length - 1] ?? 50;
      const strikerBefore =
        currentInn.battingXI.find((p) => p.id === currentInn.strikerId) || currentInn.battingXI[0];
      const bowlerBefore =
        currentInn.bowlingXI.find((p) => p.id === currentInn.currentBowlerId) ||
        currentInn.bowlingXI[0];

      // Pre-ball batter runs for milestone check
      const strikerRunsBefore = currentInn.events
        .filter((e) => e.batter?.id === strikerBefore.id)
        .reduce((sum, e) => sum + (e.batterRuns ?? e.runsScored ?? 0), 0);
      const strikerBallsBefore = currentInn.events.filter(
        (e) => e.batter?.id === strikerBefore.id && e.extraType !== 'wide'
      ).length;

      const { nextInnings, event } = simulateSingleInningsDelivery(
        currentInn,
        effectiveStadium,
        effectiveDew,
        userTactics
      );

      // Enrich broadcast commentary and trigger synchronized sound cues
      const dynamicCommentary = processBallEvent(event, {
        runsNeeded: Math.max(0, (currentInn.targetRuns || 0) - nextInnings.runs),
        ballsRemaining: Math.max(0, currentInn.maxOvers * 6 - nextInnings.legalBalls),
        currentOver: Math.floor(nextInnings.legalBalls / 6),
        totalOvers: currentInn.maxOvers,
        wickets: nextInnings.wickets,
        battingTeam: currentInn.battingTeam.name,
        bowlingTeam: currentInn.bowlingTeam.name,
      });

      const updatedEvents = [...nextInnings.events];
      if (updatedEvents.length > 0) {
        updatedEvents[updatedEvents.length - 1] = {
          ...updatedEvents[updatedEvents.length - 1],
          commentary: dynamicCommentary.text,
        };
      }
      const finalizedInnings: InningsEngineState = {
        ...nextInnings,
        events: updatedEvents,
      };

      const nextSnap: EngineSnapshot = {
        ...snap,
        innings1: innNum === 1 ? finalizedInnings : snap.innings1,
        innings2: innNum === 2 ? finalizedInnings : snap.innings2,
        superOver1: innNum === 3 ? finalizedInnings : snap.superOver1,
        superOver2: innNum === 4 ? finalizedInnings : snap.superOver2,
      };
      commitEngineState(nextSnap);
      setSelectedInningsTab(innNum);

      // Audio & Haptics
      audioManager.handleMatchEvent(
        {
          runsScored: event.runsScored,
          isWicket: event.isWicket,
          outcome: event.outcome,
          shot: event.shot,
          strikerName: strikerBefore.name,
          bowlerName: bowlerBefore.name,
        },
        {
          currentOver: Math.floor(finalizedInnings.legalBalls / 6),
          totalOvers: finalizedInnings.maxOvers,
          runsNeeded: Math.max(0, (finalizedInnings.targetRuns || 0) - finalizedInnings.runs),
          wickets: finalizedInnings.wickets,
        }
      );

      const batRunsThisBall = event.batterRuns ?? event.runsScored;
      if (event.isWicket) {
        setActiveCelebration('WICKET');
        setHudVibrationClass('animate-hud-vibrate-wicket');
        triggerHaptic(HAPTIC_PATTERNS.WICKET);
        setTimeout(() => setHudVibrationClass(''), 700);
      } else if (batRunsThisBall === 6) {
        setActiveCelebration('SIX');
        setHudVibrationClass('animate-hud-vibrate-six');
        triggerHaptic(HAPTIC_PATTERNS.SIX);
        setTimeout(() => setHudVibrationClass(''), 600);
      } else if (batRunsThisBall === 4) {
        setActiveCelebration('FOUR');
        setHudVibrationClass('animate-hud-vibrate-four');
        triggerHaptic(HAPTIC_PATTERNS.FOUR);
        setTimeout(() => setHudVibrationClass(''), 450);
      } else {
        triggerHaptic(HAPTIC_PATTERNS.BALL_BOWLED);
      }

      // Evaluate Next Ball Prediction
      if (userNextBallGuess) {
        let isCorrect = false;
        if (userNextBallGuess === 'WICKET' && event.isWicket) isCorrect = true;
        else if (userNextBallGuess === 'BOUNDARY' && batRunsThisBall >= 4) isCorrect = true;
        else if (userNextBallGuess === 'DOT' && event.runsScored === 0 && !event.isWicket)
          isCorrect = true;
        else if (
          userNextBallGuess === 'RUNS' &&
          event.runsScored >= 1 &&
          event.runsScored <= 3 &&
          !event.isWicket
        ) {
          isCorrect = true;
        }

        recordPrediction(isCorrect);
        if (isCorrect) {
          addXp(50, `Correct Next-Ball Prediction: ${userNextBallGuess}!`);
          setPredictionFeedback(`Correct! +50 XP (${userNextBallGuess})`);
        } else {
          setPredictionFeedback(
            `Missed! Result was ${event.isWicket ? 'Wicket' : `${event.runsScored} run(s)`}`
          );
        }
        setUserNextBallGuess(null);
      }

      // Batter & Team Milestones
      const strikerRunsAfter = strikerRunsBefore + batRunsThisBall;
      if (!event.isWicket && strikerRunsBefore < 50 && strikerRunsAfter >= 50) {
        setMilestoneBadge({
          title: `FIFTY UP! ${strikerBefore.name} (${strikerRunsAfter}* off ${strikerBallsBefore + 1}b)`,
          subtext: `Clinical half-century for ${currentInn.battingTeam.name}!`,
          icon: '50',
        });
        cricketAudio.playMilestoneFifty();
        triggerHaptic(HAPTIC_PATTERNS.MILESTONE);
        setTimeout(() => setMilestoneBadge(null), 4500);
      } else if (!event.isWicket && strikerRunsBefore < 100 && strikerRunsAfter >= 100) {
        setMilestoneBadge({
          title: `CENTURY! ${strikerBefore.name} (${strikerRunsAfter}*)`,
          subtext: `Sensational T20 hundred under the floodlights!`,
          icon: '100',
        });
        cricketAudio.playVictory();
        triggerHaptic(HAPTIC_PATTERNS.MILESTONE);
        setTimeout(() => setMilestoneBadge(null), 5500);
      } else if (preBallRuns < 100 && finalizedInnings.runs >= 100) {
        setMilestoneBadge({
          title: `100 UP FOR ${currentInn.battingTeam.name.toUpperCase()}: ${finalizedInnings.runs}/${finalizedInnings.wickets}`,
          subtext: `Reached in ${Math.floor(finalizedInnings.legalBalls / 6)}.${
            finalizedInnings.legalBalls % 6
          } overs`,
          icon: '100',
        });
        triggerHaptic(HAPTIC_PATTERNS.MILESTONE);
        setTimeout(() => setMilestoneBadge(null), 4000);
      } else if (preBallRuns < 200 && finalizedInnings.runs >= 200) {
        setMilestoneBadge({
          title: `200 BREACHED BY ${currentInn.battingTeam.name.toUpperCase()}!`,
          subtext: `${finalizedInnings.runs}/${finalizedInnings.wickets} on the board!`,
          icon: '200',
        });
        triggerHaptic(HAPTIC_PATTERNS.MILESTONE);
        setTimeout(() => setMilestoneBadge(null), 4500);
      }

      // Dismissal -> Trigger DRS Review Event State if eligible (LBW / Caught / Stumped / Bowled, non-Run-Out)
      if (event.isWicket) {
        const ovLabel = `${Math.floor(finalizedInnings.legalBalls / 6)}.${
          finalizedInnings.legalBalls % 6
        }`;
        const isEdge =
          event.wicketType === 'Caught' &&
          (event.shot?.toLowerCase().includes('edge') ||
            event.fielder?.role?.includes('Wicketkeeper') ||
            event.commentary?.toLowerCase().includes('edge'));

        setActiveBallTracking(null);
        setDrsSequencePhase('IDLE');
        setLastDismissalContext({
          inningsNumber: innNum,
          eventIndex: finalizedInnings.events.length - 1,
          dismissedBatter: event.dismissedPlayer || strikerBefore,
          bowler: bowlerBefore,
          ballEvent: updatedEvents[updatedEvents.length - 1],
          ballLabel: ovLabel,
          appealMode: isEdge ? 'CAUGHT BEHIND' : 'LBW',
          preBallWinProb,
          scoreAfterWicket: finalizedInnings.runs,
          wicketsAfterWicket: finalizedInnings.wickets,
          legalBallsAfterWicket: finalizedInnings.legalBalls,
        });

        const isReviewable =
          (event.wicketType === 'LBW' || event.wicketType === 'Caught') &&
          drsReviewsLeft.batting > 0 &&
          finalizedInnings.status !== 'completed';

        if (isReviewable) {
          setSimulatorEventState('DISMISSAL_EVENT');
          setDrsReviewState('REVIEW_AVAILABLE');
          if (isPlayingRef.current) {
            wasAutoplayRunningRef.current = true;
            setIsPlaying(false);
          } else {
            wasAutoplayRunningRef.current = false;
          }
          return;
        }
      }

      if (finalizedInnings.status === 'completed') {
        handlePostInningsCompletion(nextSnap, finalizedInnings);
      } else {
        setSimulatorEventState('LIVE_PLAY');
      }
    } finally {
      isSteppingRef.current = false;
    }
  }, [
    isMatchOver,
    simulatorEventState,
    drsReviewState,
    stadium,
    dewActive,
    userTactics,
    processBallEvent,
    commitEngineState,
    userNextBallGuess,
    recordPrediction,
    addXp,
    drsReviewsLeft.batting,
    isPlaying,
    handlePostInningsCompletion,
  ]);

  // Fast-forward Remainder of Current Over (pure sequential loop — zero stale React closures)
  const handleFastForwardOver = useCallback(() => {
    if (
      isSteppingRef.current ||
      isMatchOver ||
      simulatorEventState === 'DRS_REVIEW' ||
      simulatorEventState === 'INNINGS_BREAK' ||
      simulatorEventState === 'SUPER_OVER_READY'
    ) {
      return;
    }

    isSteppingRef.current = true;
    try {
      triggerHaptic(HAPTIC_PATTERNS.OVER_COMPLETE);
      const snap = engineRef.current;
      const innNum = snap.liveInningsNumber;
      let working =
        innNum === 4
          ? snap.superOver2
          : innNum === 3
          ? snap.superOver1
          : innNum === 2
          ? snap.innings2
          : snap.innings1;

      if (!working || working.status === 'completed') return;

      const targetLegalBallBoundary = (Math.floor(working.legalBalls / 6) + 1) * 6;
      let safetyCount = 0;
      let lastGeneratedEvent: BallEvent | null = null;

      while (
        working.legalBalls < targetLegalBallBoundary &&
        working.status !== 'completed' &&
        safetyCount < 18
      ) {
        safetyCount += 1;
        const { nextInnings, event } = simulateSingleInningsDelivery(
          working,
          stadium,
          dewActive,
          userTactics
        );
        working = nextInnings;
        lastGeneratedEvent = event;
      }

      if (lastGeneratedEvent) {
        processBallEvent(lastGeneratedEvent, {
          runsNeeded: Math.max(0, (working.targetRuns || 0) - working.runs),
          ballsRemaining: Math.max(0, working.maxOvers * 6 - working.legalBalls),
          currentOver: Math.floor(working.legalBalls / 6),
          totalOvers: working.maxOvers,
          wickets: working.wickets,
          battingTeam: working.battingTeam.name,
          bowlingTeam: working.bowlingTeam.name,
        });
      }

      const nextSnap: EngineSnapshot = {
        ...snap,
        innings1: innNum === 1 ? working : snap.innings1,
        innings2: innNum === 2 ? working : snap.innings2,
        superOver1: innNum === 3 ? working : snap.superOver1,
        superOver2: innNum === 4 ? working : snap.superOver2,
      };
      commitEngineState(nextSnap);
      setSelectedInningsTab(innNum);

      if (working.status === 'completed') {
        handlePostInningsCompletion(nextSnap, working);
      } else {
        setSimulatorEventState('LIVE_PLAY');
      }
    } finally {
      isSteppingRef.current = false;
    }
  }, [
    isMatchOver,
    simulatorEventState,
    stadium,
    dewActive,
    userTactics,
    processBallEvent,
    commitEngineState,
    handlePostInningsCompletion,
  ]);

  const executeNextBallRef = useRef(executeNextBall);
  useEffect(() => {
    executeNextBallRef.current = executeNextBall;
  }, [executeNextBall]);

  // Auto-resume autoplay cleanly after reviewable dismissal window or DRS verdict, and across Innings Break
  useEffect(() => {
    if (!isMatchActive || isMatchOver) return;

    if (
      wasAutoplayRunningRef.current &&
      simulatorEventState === 'DISMISSAL_EVENT' &&
      drsReviewState === 'REVIEW_AVAILABLE'
    ) {
      const autoAcceptTimer = setTimeout(() => {
        resumeFromDrsEvent();
      }, 3200);
      return () => clearTimeout(autoAcceptTimer);
    }

    if (
      wasAutoplayRunningRef.current &&
      (simulatorEventState === 'DRS_OVERTURNED' || simulatorEventState === 'DRS_UPHELD')
    ) {
      const autoVerdictTimer = setTimeout(() => {
        resumeFromDrsEvent();
      }, 2500);
      return () => clearTimeout(autoVerdictTimer);
    }

    if (
      wasAutoplayRunningRef.current &&
      simulatorEventState === 'INNINGS_BREAK' &&
      innings2Scorecard.status === 'upcoming'
    ) {
      const autoSecondInningsTimer = setTimeout(() => {
        handleStartSecondInnings();
      }, 4200);
      return () => clearTimeout(autoSecondInningsTimer);
    }
  }, [
    isMatchActive,
    isMatchOver,
    simulatorEventState,
    drsReviewState,
    innings2Scorecard.status,
    handleStartSecondInnings,
    resumeFromDrsEvent,
  ]);

  // Auto-play timer — cleanly scheduled per delivery with zero mid-tick resets on tactical/state changes
  useEffect(() => {
    if (
      isPlaying &&
      isMatchActive &&
      !isMatchOver &&
      simulatorEventState !== 'DISMISSAL_EVENT' &&
      simulatorEventState !== 'DRS_REVIEW' &&
      simulatorEventState !== 'INNINGS_BREAK' &&
      simulatorEventState !== 'SUPER_OVER_READY'
    ) {
      playTimerRef.current = setTimeout(() => {
        executeNextBallRef.current();
      }, simSpeedMs);
    }
    return () => {
      if (playTimerRef.current) {
        clearTimeout(playTimerRef.current);
        playTimerRef.current = null;
      }
    };
  }, [
    isPlaying,
    isMatchActive,
    isMatchOver,
    simulatorEventState,
    simSpeedMs,
    engineState.innings1.events.length,
    engineState.innings2.events.length,
    engineState.superOver1?.events.length,
    engineState.superOver2?.events.length,
  ]);

  const triggerDrsReview = () => {
    if (
      lastDismissalContext &&
      (simulatorEventState === 'DISMISSAL_EVENT' ||
        simulatorEventState === 'DRS_REVIEW' ||
        drsReviewState === 'REVIEW_AVAILABLE' ||
        drsReviewState === 'REVIEWING')
    ) {
      initiateDismissalDrsReview(true);
      return;
    }

    if (isPlaying) {
      wasAutoplayRunningRef.current = true;
      setIsPlaying(false);
    } else {
      wasAutoplayRunningRef.current = false;
    }

    cricketAudio.playDrsTone();
    setShowBroadcastDrs(true);
    setIsDrsActive(true);
    setSimulatorEventState('DRS_REVIEW');
    setDrsReviewState('REVIEWING');
    setDrsOutcome('Scanning UltraEdge Spike & Ball Tracking...');
  };

  // Dismissal Probability Hazard Metrics
  const currentBatterPressure = useMemo(() => {
    return calculateBatterPressure(striker, history, parseFloat(String(requiredRR)) || 8.5);
  }, [striker, history, requiredRR]);

  const currentBowlerPrecision = useMemo(() => {
    return calculateBowlerPrecision(bowler, history);
  }, [bowler, history]);

  const currentSimWicketRisk = useMemo(() => {
    return Math.min(
      96,
      Math.max(12, Math.round(currentBatterPressure * 0.52 + currentBowlerPrecision * 0.48))
    );
  }, [currentBatterPressure, currentBowlerPrecision]);

  const simulatorContextValue = useMemo<MatchSimulatorContextValue>(
    () => ({
      runs: displayedScorecard.runs,
      wickets: displayedScorecard.wickets,
      maxWickets: displayedScorecard.maxWickets,
      overs: displayedScorecard.oversFormatted,
      maxOvers: displayedScorecard.maxOvers,
      legalBalls: displayedScorecard.legalBalls,
      target:
        displayedScorecard.targetRuns && displayedScorecard.targetRuns > 0
          ? displayedScorecard.targetRuns
          : innings1Scorecard.status === 'completed'
          ? innings1Scorecard.runs + 1
          : null,
      parTarget: conditionAiOutcome.metrics.adjustedParScore,
      runsRequired: displayedScorecard.runsRequired,
      ballsRemaining: displayedScorecard.ballsRemaining,
      currentRunRate: displayedScorecard.currentRunRate,
      requiredRunRate: displayedScorecard.requiredRunRate,
      projectedScore:
        selectedInningsTab === engineState.liveInningsNumber
          ? conditionAiOutcome.metrics.adjustedProjectedScore
          : displayedScorecard.projectedScore,
      winProbability: currentWinProb,
      activeScorecard: displayedScorecard,
      liveScorecard,
      innings1Scorecard,
      innings2Scorecard,
      superOver1Scorecard,
      superOver2Scorecard,
      selectedInningsTab,
      liveInningsNumber: engineState.liveInningsNumber,
      activeMainTab,
      isMatchActive,
      isPlaying,
      isMatchOver,
      simulatorEventState,
      stadium: effectiveStadium,
      dewActive: effectiveDew,
      tossSummary,
      venueLabel: `${stadium.name}, ${stadium.city} · ${conditionAiOutcome.metrics.label}`,
      lastBall,
      matchResultBanner,
      bowlingXI: activeLiveInnings.bowlingXI,
      previousOverBowlerId: activeLiveInnings.previousOverBowlerId,
      onSelectInningsTab: (inn) => setSelectedInningsTab(inn),
      onChangeMainTab: (tab) => setActiveMainTab(tab),
      onSelectBowler:
        selectedInningsTab === engineState.liveInningsNumber
          ? handleSelectBowlerForOver
          : undefined,
      onInspectPlayer: (p) => setActiveModalPlayer(p),
      onStartSecondInnings:
        simulatorEventState === 'INNINGS_BREAK' ||
        (innings1Scorecard.status === 'completed' && innings2Scorecard.status === 'upcoming')
          ? handleStartSecondInnings
          : undefined,
      onQuickFinishFirstInnings:
        isMatchActive &&
        engineState.liveInningsNumber === 1 &&
        innings1Scorecard.status === 'live'
          ? handleQuickFinishFirstInnings
          : undefined,
      onStartSuperOver: matchResultBanner?.isTied ? handleStartSuperOver : undefined,
    }),
    [
      conditionAiOutcome.metrics.adjustedParScore,
      conditionAiOutcome.metrics.adjustedProjectedScore,
      conditionAiOutcome.metrics.label,
      displayedScorecard,
      liveScorecard,
      innings1Scorecard,
      innings2Scorecard,
      superOver1Scorecard,
      superOver2Scorecard,
      selectedInningsTab,
      engineState.liveInningsNumber,
      activeMainTab,
      isMatchActive,
      isPlaying,
      isMatchOver,
      simulatorEventState,
      stadium.name,
      stadium.city,
      effectiveStadium,
      effectiveDew,
      tossSummary,
      lastBall,
      matchResultBanner,
      activeLiveInnings.bowlingXI,
      activeLiveInnings.previousOverBowlerId,
      currentWinProb,
      handleSelectBowlerForOver,
      setActiveModalPlayer,
      handleStartSecondInnings,
      handleQuickFinishFirstInnings,
      handleStartSuperOver,
    ]
  );

  return (
    <MatchSimulatorProvider value={simulatorContextValue}>
      <div className="max-w-7xl mx-auto space-y-6 pb-16">
      {/* =====================================================================
          1. TOP MATCH CONTROL BAR (TEAMS, VENUE, PLAYING XI, PLAY/PAUSE/RESET)
          ===================================================================== */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div className="flex items-center gap-4 min-w-0">
          <div className="relative hidden sm:block h-16 w-28 shrink-0 rounded-xl overflow-hidden border border-slate-700/80 bg-slate-900">
            <StadiumPhoto
              stadium={stadium}
              alt={`${stadium.name}, ${stadium.city}`}
              className="h-full w-full"
              imgClassName="h-full w-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/75 via-transparent to-transparent" />
            <span className="absolute bottom-1 left-1.5 right-1.5 text-[9px] font-mono font-bold text-slate-100 truncate">
              {stadium.city}
            </span>
          </div>

          <div className="min-w-0">
            <span className="text-xs font-mono font-bold tracking-wider text-cyan-400 uppercase block">
              IPL-STYLE TELEVISION BROADCAST SIMULATOR · REAL-TIME ENGINE
            </span>
            <h1 className="flex flex-wrap items-center gap-2.5 text-2xl sm:text-3xl font-black text-white tracking-tight mt-0.5">
              <TeamFlag code={teamA.id} size="lg" />
              <span>{teamA.name}</span>
              <span className="text-slate-500 font-semibold text-xl">vs</span>
              <TeamFlag code={teamB.id} size="lg" />
              <span>{teamB.name}</span>
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              {stadium.name}, {stadium.city} · {stadium.pitchType} ·{' '}
              {dewActive ? 'Evening Dew Active' : 'Dry Surface'} · {totalOvers} Overs Format
            </p>
          </div>
        </div>

        {!isMatchActive ? (
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={teamA.id}
              aria-label="Select Team A"
              onChange={(e) => {
                const found = TEAMS.find((t) => t.id === e.target.value) || TEAMS[0];
                setTeamA(found);
                setPlayingXIA(buildOrderedPlayingXI(found));
              }}
              className="rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-slate-200 focus:border-sky-500 focus:outline-none cursor-pointer"
            >
              {TEAMS.map((t) => (
                <option key={t.id} value={t.id} disabled={t.id === teamB.id}>
                  {t.name}
                </option>
              ))}
            </select>

            <select
              value={teamB.id}
              aria-label="Select Team B"
              onChange={(e) => {
                const found = TEAMS.find((t) => t.id === e.target.value) || TEAMS[1];
                setTeamB(found);
                setPlayingXIB(buildOrderedPlayingXI(found));
              }}
              className="rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-slate-200 focus:border-sky-500 focus:outline-none cursor-pointer"
            >
              {TEAMS.map((t) => (
                <option key={t.id} value={t.id} disabled={t.id === teamA.id}>
                  {t.name}
                </option>
              ))}
            </select>

            <select
              value={stadium.id}
              aria-label="Select Venue"
              onChange={(e) => {
                const nextS = STADIUMS.find((s) => s.id === e.target.value) || STADIUMS[0];
                setStadium(nextS);
                setSurfaceCondition(deriveConditionFromStadium(nextS));
              }}
              className="rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-slate-200 focus:border-sky-500 focus:outline-none cursor-pointer max-w-[200px]"
            >
              {STADIUMS.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} — {s.city}
                </option>
              ))}
            </select>

            <select
              value={totalOvers}
              aria-label="Select Match Overs"
              onChange={(e) => setTotalOvers(Number(e.target.value))}
              className="rounded-xl border border-slate-700 bg-slate-900 px-2.5 py-2 text-xs font-mono text-slate-200 focus:border-sky-500 focus:outline-none cursor-pointer"
            >
              <option value={20}>20 Overs</option>
              <option value={10}>10 Overs</option>
              <option value={5}>5 Overs</option>
              <option value={2}>2 Overs</option>
            </select>

            <select
              value={matchStartMode}
              aria-label="Select Simulation Mode"
              onChange={(e) =>
                setMatchStartMode(e.target.value as 'FULL_2_INNINGS' | 'CHASE_READY')
              }
              className="rounded-xl border border-slate-700 bg-slate-900 px-2.5 py-2 text-xs text-cyan-300 focus:border-sky-500 focus:outline-none cursor-pointer"
            >
              <option value="FULL_2_INNINGS">Full 2 Innings (Ball 0.1)</option>
              <option value="CHASE_READY">Live 2nd Inn Chase (Auto-Sim 1st)</option>
            </select>

            <button
              type="button"
              onClick={() => setDewActive((prev) => !prev)}
              className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                dewActive
                  ? 'border-cyan-500/50 bg-cyan-950/40 text-cyan-200'
                  : 'border-slate-700 bg-slate-900 text-slate-400 hover:text-white'
              }`}
              title="Toggle evening dew factor"
            >
              <Droplets className="h-3.5 w-3.5" />
              <span>{dewActive ? 'Dew On' : 'Dry Ball'}</span>
            </button>

            <button
              type="button"
              onClick={() => {
                cricketAudio.playUiClick();
                setShowPlayingXIModal(true);
              }}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-xs font-bold text-slate-200 hover:border-cyan-400 hover:text-white transition-colors cursor-pointer whitespace-nowrap"
            >
              <Users className="h-3.5 w-3.5 text-cyan-400" />
              <span>Playing XI</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setShowRivalryDashboard(!showRivalryDashboard);
                cricketAudio.playBatHit();
              }}
              className="inline-flex items-center gap-1.5 rounded-xl border border-cyan-500/40 bg-cyan-950/40 px-3 py-2 text-xs font-bold text-cyan-300 hover:bg-cyan-500/20 hover:text-white transition-colors cursor-pointer whitespace-nowrap"
            >
              <Swords className="h-3.5 w-3.5 text-rose-400" />
              <span>Rivalry H2H</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setShowInteractiveGuide(true);
                cricketAudio.playUiClick();
                triggerHaptic(HAPTIC_PATTERNS.TAP);
              }}
              className="inline-flex items-center gap-1.5 rounded-xl border border-cyan-500/40 bg-cyan-950/40 px-3 py-2 text-xs font-bold text-cyan-300 hover:bg-cyan-500/20 hover:text-white transition-colors cursor-pointer whitespace-nowrap"
            >
              <HelpCircle className="h-3.5 w-3.5 text-cyan-400" />
              <span>Guide</span>
            </button>

            <button
              type="button"
              onClick={() => {
                triggerHaptic(HAPTIC_PATTERNS.TAP);
                clearDrsPhaseTimers();
                resetMatchDuration();
                clearCommentary();
                const autoTossWinner = Math.random() < 0.5 ? teamA : teamB;
                const autoElectedTo: 'bat' | 'field' = Math.random() < 0.5 ? 'bat' : 'field';
                finalizeCeremonyAndStart({
                  winner: autoTossWinner,
                  electedTo: autoElectedTo,
                  summary: `${autoTossWinner.name} won the toss and elected to ${autoElectedTo} first`,
                });
              }}
              className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-400/50 bg-emerald-500/15 px-4 py-2 text-xs font-bold text-emerald-300 hover:bg-emerald-500/25 hover:text-white transition-colors cursor-pointer whitespace-nowrap"
              title="Instant Toss & Autoplay Simulation"
            >
              <Play className="h-3.5 w-3.5 fill-current" />
              <span>AUTOPLAY</span>
            </button>

            <button
              type="button"
              onClick={handleStartMatch}
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-5 py-2 text-xs font-black text-slate-950 hover:bg-emerald-400 transition-colors cursor-pointer whitespace-nowrap"
            >
              <Play className="h-4 w-4 fill-current" />
              <span>START MATCH</span>
            </button>
          </div>
        ) : (
          <div className="flex flex-wrap items-center gap-2">
            {/* Match Duration Tracker */}
            <div
              className="inline-flex items-center gap-1.5 rounded-xl border border-cyan-500/35 bg-slate-900/90 px-3 py-2 text-xs font-mono font-bold text-cyan-300"
              title="Total elapsed match duration linked to simulation engine"
            >
              <Clock className={`h-3.5 w-3.5 text-cyan-400 ${isPlaying ? 'animate-spin' : ''}`} />
              <span className="tabular-nums">{formattedMatchDuration}</span>
            </div>

            <button
              type="button"
              onClick={toggleBroadcastMode}
              className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold transition-colors cursor-pointer whitespace-nowrap ${
                isBroadcastMode
                  ? 'bg-gradient-to-r from-cyan-500 to-blue-500 text-slate-950 font-black'
                  : 'border border-cyan-500/40 bg-cyan-950/40 text-cyan-300 hover:bg-cyan-500/20'
              }`}
            >
              <Tv className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">
                {isBroadcastMode ? 'Exit Broadcast' : 'Broadcast Mode'}
              </span>
            </button>

            <button
              type="button"
              onClick={() => {
                setShowLiveTelecast((prev) => !prev);
                cricketAudio.playUiClick();
              }}
              className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold transition-colors cursor-pointer whitespace-nowrap ${
                showLiveTelecast || isBroadcastMode
                  ? 'bg-amber-400 text-slate-950 font-black'
                  : 'border border-amber-500/40 bg-amber-950/30 text-amber-300 hover:bg-amber-500/20'
              }`}
            >
              <Radio className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Live Telecast</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setShowInteractiveGuide(true);
                cricketAudio.playUiClick();
                triggerHaptic(HAPTIC_PATTERNS.TAP);
              }}
              className="inline-flex items-center gap-1.5 rounded-xl border border-cyan-500/40 bg-cyan-950/40 px-3 py-2 text-xs font-bold text-cyan-300 hover:bg-cyan-500/20 hover:text-white transition-colors cursor-pointer"
            >
              <HelpCircle className="h-3.5 w-3.5 text-cyan-400" />
              <span className="hidden sm:inline">Guide</span>
            </button>

            <button
              type="button"
              onClick={() => {
                triggerHaptic(HAPTIC_PATTERNS.TAP);
                if (
                  simulatorEventState === 'DISMISSAL_EVENT' ||
                  simulatorEventState === 'DRS_OVERTURNED' ||
                  simulatorEventState === 'DRS_UPHELD'
                ) {
                  setSimulatorEventState('LIVE_PLAY');
                  setDrsReviewState('IDLE');
                  setDrsTrackingSummary(null);
                  setActiveBallTracking(null);
                }
                setIsPlaying((prev) => {
                  const next = !prev;
                  wasAutoplayRunningRef.current = next;
                  return next;
                });
              }}
              disabled={
                isMatchOver ||
                simulatorEventState === 'DRS_REVIEW' ||
                simulatorEventState === 'INNINGS_BREAK' ||
                simulatorEventState === 'SUPER_OVER_READY'
              }
              className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-black transition-colors cursor-pointer whitespace-nowrap ${
                isPlaying
                  ? 'bg-amber-400 text-slate-950 hover:bg-amber-300'
                  : 'bg-emerald-500 text-slate-950 hover:bg-emerald-400 disabled:opacity-40'
              }`}
            >
              {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4 fill-current" />}
              <span>{isPlaying ? 'PAUSE' : 'AUTOPLAY'}</span>
            </button>

            <div
              role="group"
              aria-label="Autoplay speed"
              className="inline-flex items-center rounded-xl border border-slate-700 bg-slate-900 p-0.5 text-[11px] font-mono"
            >
              {(
                [
                  { ms: 1100, label: '1x' },
                  { ms: 600, label: '2x' },
                  { ms: 300, label: '4x' },
                ] as const
              ).map((spd) => (
                <button
                  key={spd.ms}
                  type="button"
                  onClick={() => setSimSpeedMs(spd.ms)}
                  className={`px-2 py-1 rounded-lg font-bold transition-colors cursor-pointer ${
                    simSpeedMs === spd.ms
                      ? 'bg-cyan-500 text-slate-950'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {spd.label}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={executeNextBall}
              disabled={
                isPlaying ||
                isMatchOver ||
                simulatorEventState === 'DRS_REVIEW' ||
                simulatorEventState === 'INNINGS_BREAK' ||
                simulatorEventState === 'SUPER_OVER_READY'
              }
              className="rounded-xl border border-slate-700 bg-slate-800 px-3.5 py-2 text-xs font-semibold text-slate-200 hover:text-white disabled:opacity-40 transition-colors cursor-pointer whitespace-nowrap"
            >
              NEXT BALL
            </button>

            <button
              type="button"
              onClick={handleFastForwardOver}
              disabled={
                isPlaying ||
                isMatchOver ||
                simulatorEventState === 'DRS_REVIEW' ||
                simulatorEventState === 'INNINGS_BREAK' ||
                simulatorEventState === 'SUPER_OVER_READY'
              }
              className="inline-flex items-center gap-1 rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-xs font-semibold text-slate-200 hover:text-white disabled:opacity-40 transition-colors cursor-pointer whitespace-nowrap"
            >
              <FastForward className="h-3.5 w-3.5" />
              <span>OVER</span>
            </button>

            <button
              type="button"
              onClick={() => setShowAiReportModal(true)}
              className="inline-flex items-center gap-1.5 rounded-xl border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs font-bold text-amber-300 hover:bg-amber-500/20 transition-colors cursor-pointer whitespace-nowrap"
            >
              <Trophy className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Why Won?</span>
            </button>

            <button
              type="button"
              onClick={handleReset}
              title="Restart match and clear all statistics"
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-800 bg-slate-900 px-3 py-2 text-xs font-semibold text-slate-300 hover:text-white transition-colors cursor-pointer"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Restart</span>
            </button>
          </div>
        )}
      </div>

      {/* Pre-Match Rivalry Head-to-Head Dashboard */}
      {showRivalryDashboard && (
        <div className="animate-in fade-in duration-300">
          <RivalryHeadToHead
            teamA={teamA}
            teamB={teamB}
            stadiumName={`${stadium.name}, ${stadium.city}`}
            onStartMatch={() => {
              setShowRivalryDashboard(false);
              handleStartMatch();
            }}
            onClose={() => setShowRivalryDashboard(false)}
          />
        </div>
      )}

      {/* =====================================================================
          2. PERSISTENT IPL-STYLE LIVE TELEVISION BROADCAST SCOREBOARD
          ===================================================================== */}
      <div className={`transition-transform duration-300 ${hudVibrationClass}`}>
        <LiveBroadcastScoreboard />
      </div>

      {/* =====================================================================
          2B. INTERACTIVE LIVE TELECAST STUDIO (4 CAMERAS, SPEED GUN & WORM)
          ===================================================================== */}
      {(showLiveTelecast || isBroadcastMode) && (
        <div className="animate-in fade-in duration-300">
          <LiveTelecastSuite matchDurationFormatted={formattedMatchDuration} />
        </div>
      )}

      {/* Milestone Notification Banner */}
      {milestoneBadge && (
        <div className="rounded-2xl border border-amber-400/80 bg-gradient-to-r from-amber-500/20 via-yellow-500/15 to-amber-500/20 p-4 shadow-xl backdrop-blur-xl animate-in fade-in duration-300 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-amber-400 text-slate-950 font-mono font-black text-sm shrink-0">
              {milestoneBadge.icon}
            </span>
            <div className="min-w-0">
              <h4 className="text-sm sm:text-base font-black text-amber-300 tracking-tight truncate">
                {milestoneBadge.title}
              </h4>
              <p className="text-xs text-white/90 font-mono mt-0.5 truncate">
                {milestoneBadge.subtext}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setMilestoneBadge(null)}
            className="text-slate-300 hover:text-white text-xs font-mono px-2.5 py-1 rounded-lg bg-slate-900/80 border border-slate-700 cursor-pointer shrink-0"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Interactive DRS Review Event State Engine & Live Simulated Ball-Tracking Panel */}
      {drsReviewState !== 'IDLE' && lastDismissalContext && (
        <div
          className={`rounded-2xl border p-4 sm:p-5 shadow-2xl backdrop-blur-xl animate-in fade-in duration-200 space-y-4 ${
            drsReviewState === 'OVERTURNED'
              ? 'border-emerald-400/75 bg-emerald-950/75'
              : drsReviewState === 'UPHELD'
              ? 'border-rose-500/65 bg-rose-950/70'
              : drsReviewState === 'REVIEWING'
              ? 'border-sky-400/80 bg-[#050f26]/95'
              : 'border-cyan-400/70 bg-slate-950/90'
          }`}
        >
          <div className="grid grid-cols-1 md:grid-cols-12 items-start md:items-center gap-3">
            <div className="md:col-span-7 min-w-0 space-y-1.5">
              <div className="flex flex-wrap items-center gap-2 text-[11px] font-mono">
                <span
                  className={`font-black tracking-wider ${
                    drsReviewState === 'OVERTURNED'
                      ? 'text-emerald-300'
                      : drsReviewState === 'UPHELD'
                      ? 'text-rose-300'
                      : drsReviewState === 'REVIEWING'
                      ? 'text-sky-300'
                      : 'text-amber-300'
                  }`}
                >
                  {drsReviewState === 'REVIEW_AVAILABLE' &&
                    `DISMISSAL EVENT · ON-FIELD CALL: OUT (${
                      lastDismissalContext.ballEvent.wicketType?.toUpperCase() ||
                      lastDismissalContext.appealMode
                    })`}
                  {drsReviewState === 'REVIEWING' &&
                    'EVENT STATE: DRS REVIEW · SIMULATING BALL TRACKING'}
                  {drsReviewState === 'OVERTURNED' && 'DRS VERDICT: DECISION OVERTURNED — NOT OUT!'}
                  {drsReviewState === 'UPHELD' &&
                    `DRS VERDICT: DECISION UPHELD — ${drsTrackingSummary?.verdict || 'OUT'}`}
                </span>
                <span className="text-slate-500" aria-hidden="true">
                  ·
                </span>
                <span className="inline-flex items-center gap-1.5 text-slate-300">
                  <TeamFlag code={battingTeamLive.id} size="xs" />
                  <span>
                    Reviews Left:{' '}
                    <strong className="text-amber-300 tabular-nums">{drsReviewsLeft.batting}</strong>
                  </span>
                </span>
              </div>

              <p className="text-xs sm:text-sm text-slate-100 font-sans leading-relaxed">
                {drsReviewState === 'REVIEW_AVAILABLE'
                  ? `${lastDismissalContext.dismissedBatter.name} adjudged OUT off ${lastDismissalContext.bowler.name} (${lastDismissalContext.ballLabel} ov, ${lastDismissalContext.ballEvent.speedKmh} km/h ${lastDismissalContext.ballEvent.length}). Initiate a DRS Review to run simulated Hawk-Eye ball tracking?`
                  : drsOutcome}
              </p>
            </div>

            <div className="md:col-span-5 flex flex-wrap items-center justify-start md:justify-end gap-2">
              {drsReviewState === 'REVIEW_AVAILABLE' && (
                <>
                  <button
                    type="button"
                    onClick={() => initiateDismissalDrsReview(false)}
                    className="rounded-xl bg-gradient-to-r from-cyan-400 to-sky-400 px-4 py-2 text-xs font-black text-slate-950 hover:from-cyan-300 hover:to-sky-300 transition-all cursor-pointer whitespace-nowrap"
                  >
                    Initiate DRS Review
                  </button>
                  <button
                    type="button"
                    onClick={() => initiateDismissalDrsReview(true)}
                    className="rounded-xl border border-cyan-500/50 bg-cyan-950/60 px-3 py-2 text-xs font-bold text-cyan-200 hover:bg-cyan-500/20 transition-colors cursor-pointer whitespace-nowrap"
                  >
                    3D TV Review
                  </button>
                  <button
                    type="button"
                    onClick={resumeFromDrsEvent}
                    className="rounded-xl border border-slate-700 bg-slate-900/80 px-3 py-2 text-xs font-medium text-slate-300 hover:text-white cursor-pointer whitespace-nowrap"
                  >
                    Accept Call
                  </button>
                </>
              )}

              {drsReviewState === 'REVIEWING' && (
                <>
                  <button
                    type="button"
                    onClick={skipToDrsVerdict}
                    className="rounded-xl bg-sky-400 px-3.5 py-2 text-xs font-black text-slate-950 hover:bg-sky-300 transition-colors cursor-pointer whitespace-nowrap"
                  >
                    Instant Verdict
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowBroadcastDrs(true)}
                    className="rounded-xl border border-sky-500/50 bg-sky-950/60 px-3 py-2 text-xs font-bold text-sky-200 hover:bg-sky-500/20 transition-colors cursor-pointer whitespace-nowrap"
                  >
                    Expand 3D TV
                  </button>
                </>
              )}

              {(drsReviewState === 'OVERTURNED' || drsReviewState === 'UPHELD') && (
                <button
                  type="button"
                  onClick={resumeFromDrsEvent}
                  className="rounded-xl bg-slate-900/95 border border-slate-700 hover:border-cyan-400/60 px-4 py-2 text-xs font-mono font-bold text-white hover:text-cyan-300 transition-colors cursor-pointer whitespace-nowrap"
                >
                  Continue Match →
                </button>
              )}
            </div>
          </div>

          {drsReviewState === 'REVIEWING' && activeBallTracking && (
            <div className="space-y-3 pt-2 border-t border-slate-800/80">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] font-mono">
                {[
                  { key: 'FRONT_FOOT', label: '1. Front Foot', value: activeBallTracking.frontFoot },
                  {
                    key: 'ULTRA_EDGE',
                    label: '2. UltraEdge',
                    value:
                      drsSequencePhase === 'FRONT_FOOT'
                        ? 'Scanning...'
                        : activeBallTracking.ultraEdge,
                  },
                  {
                    key: 'BALL_TRACKING',
                    label: '3. Ball Tracking',
                    value:
                      drsSequencePhase === 'BALL_TRACKING' || drsSequencePhase === 'VERDICT'
                        ? `${activeBallTracking.wickets}`
                        : 'Queued...',
                  },
                  { key: 'VERDICT', label: '4. Big Screen', value: 'Computing...' },
                ].map((phaseItem, i) => {
                  const phaseOrder = ['FRONT_FOOT', 'ULTRA_EDGE', 'BALL_TRACKING', 'VERDICT'];
                  const currentIdx = phaseOrder.indexOf(drsSequencePhase);
                  const isActive = currentIdx === i;
                  const isDone = currentIdx > i;
                  return (
                    <div
                      key={phaseItem.key}
                      className={`rounded-xl px-3 py-2 border transition-all ${
                        isActive
                          ? 'border-sky-400 bg-sky-500/15 text-sky-200'
                          : isDone
                          ? 'border-emerald-500/40 bg-emerald-950/40 text-emerald-300'
                          : 'border-slate-800 bg-slate-900/70 text-slate-500'
                      }`}
                    >
                      <span className="block text-[10px] opacity-80">{phaseItem.label}</span>
                      <strong className="block truncate text-xs mt-0.5">{phaseItem.value}</strong>
                    </div>
                  );
                })}
              </div>

              {(drsSequencePhase === 'BALL_TRACKING' || drsSequencePhase === 'ULTRA_EDGE') && (
                <div className="rounded-xl border border-slate-800 bg-slate-950/90 p-3">
                  <BroadcastBallTrackingCanvas
                    isOut={activeBallTracking.finalVerdict === 'OUT'}
                    strikerName={lastDismissalContext.dismissedBatter.name}
                    bowlerName={lastDismissalContext.bowler.name}
                    initialFrame={22}
                    delivery={{
                      speedKmh: activeBallTracking.speedKmh,
                      pitchX: activeBallTracking.pitchX,
                      pitchY: activeBallTracking.pitchY,
                      impactX: activeBallTracking.impactX,
                      impactY: activeBallTracking.impactY,
                      targetStumpX: activeBallTracking.targetStumpX,
                      bounceHeightMeters: Number(
                        (activeBallTracking.bounceHeightCm / 100).toFixed(2)
                      ),
                      seamDeviation: activeBallTracking.seamDeviationDeg,
                      pitchingLine: activeBallTracking.pitching,
                      impactLine:
                        activeBallTracking.impact === 'OUTSIDE OFF' ? 'OUTSIDE OFF' : 'IN LINE',
                      wicketsOutcome:
                        activeBallTracking.wickets === 'HITTING'
                          ? 'HITTING'
                          : activeBallTracking.wickets === "UMPIRE'S CALL"
                          ? 'CLIPPING BAIL'
                          : activeBallTracking.wickets === 'MISSING (HEIGHT)'
                          ? 'MISSING (HEIGHT)'
                          : 'MISSING (OFF)',
                      isOut: activeBallTracking.finalVerdict === 'OUT',
                    }}
                  />
                </div>
              )}
            </div>
          )}

          {(drsReviewState === 'OVERTURNED' || drsReviewState === 'UPHELD') &&
            drsTrackingSummary && (
              <div className="space-y-2.5 pt-2 border-t border-white/10">
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-[10px] font-mono">
                  <div className="rounded-lg bg-slate-950/85 border border-slate-800 px-2.5 py-1.5">
                    <span className="text-slate-400 block">ULTRAEDGE</span>
                    <strong className="text-slate-100">
                      {activeBallTracking?.ultraEdge || 'FLATLINE (NO BAT)'}
                    </strong>
                  </div>
                  <div className="rounded-lg bg-slate-950/85 border border-slate-800 px-2.5 py-1.5">
                    <span className="text-slate-400 block">PITCHING</span>
                    <strong className="text-cyan-300">{drsTrackingSummary.pitching}</strong>
                  </div>
                  <div className="rounded-lg bg-slate-950/85 border border-slate-800 px-2.5 py-1.5">
                    <span className="text-slate-400 block">IMPACT</span>
                    <strong
                      className={
                        drsTrackingSummary.impact === "UMPIRE'S CALL"
                          ? 'text-amber-300'
                          : 'text-cyan-300'
                      }
                    >
                      {drsTrackingSummary.impact}
                    </strong>
                  </div>
                  <div className="rounded-lg bg-slate-950/85 border border-slate-800 px-2.5 py-1.5">
                    <span className="text-slate-400 block">WICKETS</span>
                    <strong
                      className={
                        drsReviewState === 'OVERTURNED'
                          ? 'text-emerald-400'
                          : drsTrackingSummary.verdict === "UMPIRE'S CALL"
                          ? 'text-amber-300'
                          : 'text-rose-400'
                      }
                    >
                      {drsTrackingSummary.wickets}
                    </strong>
                  </div>
                  <div className="rounded-lg bg-slate-950/85 border border-slate-800 px-2.5 py-1.5">
                    <span className="text-slate-400 block">CARRY / OVERLAP</span>
                    <strong className="text-slate-200 tabular-nums">
                      {activeBallTracking
                        ? `${activeBallTracking.bounceHeightCm} cm · ${activeBallTracking.stumpOverlapPct}%`
                        : 'Verified'}
                    </strong>
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono text-slate-300">
                  <span>
                    {drsReviewState === 'OVERTURNED'
                      ? `Scoreboard Synchronized: Wicket reversed (${runs}/${wickets}) · ${lastDismissalContext.dismissedBatter.name} restored to crease · Review retained`
                      : activeBallTracking?.retainReview
                      ? `Scoreboard Confirmed: ${runs}/${wickets} stands · Umpire's Call (${battingTeamLive.name} retains review)`
                      : `Scoreboard Confirmed: ${runs}/${wickets} stands · 1 review deducted from ${battingTeamLive.name}`}
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowBroadcastDrs(true)}
                    className="text-cyan-300 hover:text-white underline underline-offset-4 cursor-pointer"
                  >
                    Replay 3D Hawk-Eye
                  </button>
                </div>
              </div>
            )}
        </div>
      )}

      {/* =====================================================================
          3. MAIN WORKSPACE: FULL SCORECARD TAB OR LIVE ARENA + INTELLIGENCE
          ===================================================================== */}
      {activeMainTab === 'analysis' ? (
        <ProMatchAnalysisTenSuite
          teamA={engineState.innings1.battingTeam}
          teamB={engineState.innings2.battingTeam}
          stadium={effectiveStadium}
          innings1Events={engineState.innings1.events}
          innings2Events={engineState.innings2.events}
          targetRuns={targetScore}
          dewActive={effectiveDew}
          embeddedMode={true}
          activeBowler={bowler}
          onInspectPlayer={(p) => setActiveModalPlayer(p)}
        />
      ) : activeMainTab === 'scorecard' || activeMainTab === 'overs' ? (
        <CompleteMatchScorecard
          activeScorecard={displayedScorecard}
          innings1Scorecard={innings1Scorecard}
          innings2Scorecard={innings2Scorecard}
          superOver1Scorecard={superOver1Scorecard}
          superOver2Scorecard={superOver2Scorecard}
          selectedInningsTab={selectedInningsTab}
          onSelectInningsTab={(inn) => setSelectedInningsTab(inn)}
          focusSection={activeMainTab}
          onInspectPlayer={(p) => setActiveModalPlayer(p)}
          onSelectWicket={(w) => {
            setSelectedWicketModal(w);
            cricketAudio.playBatHit();
          }}
        />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left 8 Cols (or Full 12 in Broadcast Mode): Live 3D Stadium & Tactical Suite */}
          <div
            className={`${
              isBroadcastMode ? 'lg:col-span-12' : 'lg:col-span-8'
            } min-w-0 space-y-5`}
          >
            {/* Compact Live Telemetry Strip: Fall of Wickets + Wicket Risk + Venue Benchmark */}
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-slate-800 bg-[#050C1C] px-4 py-2.5 text-xs font-mono">
              <div className="flex flex-wrap items-center gap-2 min-w-0">
                <span className="text-[10px] font-bold uppercase tracking-wider text-rose-400 whitespace-nowrap">
                  FoW ({liveScorecard.fallOfWickets.length}):
                </span>
                {liveScorecard.fallOfWickets.length === 0 ? (
                  <span className="text-slate-400 text-[11px]">
                    Opening stand unbroken ({runs} runs)
                  </span>
                ) : (
                  liveScorecard.fallOfWickets.slice(-4).map((w) => (
                    <button
                      key={`arena-fow-${w.wicketNumber}`}
                      type="button"
                      onClick={() => {
                        setSelectedWicketModal(w);
                        cricketAudio.playBatHit();
                      }}
                      className="rounded-lg border border-rose-500/35 bg-rose-950/30 px-2 py-0.5 text-[11px] font-bold text-rose-200 hover:bg-rose-900/50 transition-colors cursor-pointer tabular-nums whitespace-nowrap"
                    >
                      {w.scoreAtDismissal}/{w.wicketNumber} ({w.batter.name.split(' ').pop()}, {w.oversAtDismissal})
                    </button>
                  ))
                )}
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {innings1Scorecard.status === 'completed' && (
                  <button
                    type="button"
                    onClick={() => setShowInningsBreakModal(true)}
                    className="rounded-lg border border-cyan-500/40 bg-cyan-950/30 px-2.5 py-1 text-[10px] font-bold text-cyan-300 hover:text-white transition-colors cursor-pointer whitespace-nowrap"
                  >
                    1st Inn Summary
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setShowVenueWcComparison((prev) => !prev)}
                  className={`rounded-lg border px-2.5 py-1 text-[10px] font-bold transition-colors cursor-pointer whitespace-nowrap ${
                    showVenueWcComparison
                      ? 'border-amber-300 bg-amber-400 text-slate-950'
                      : 'border-slate-700 bg-slate-900 text-slate-300 hover:text-white'
                  }`}
                >
                  Venue Par
                </button>

                <button
                  type="button"
                  onClick={() => setShowSimWicketRiskModal((prev) => !prev)}
                  className={`rounded-lg border px-2.5 py-1 text-[10px] font-bold transition-colors cursor-pointer tabular-nums whitespace-nowrap ${
                    currentSimWicketRisk >= 68
                      ? 'border-rose-500/80 bg-rose-950/80 text-rose-300'
                      : 'border-slate-700 bg-slate-900 text-slate-300 hover:text-white'
                  }`}
                >
                  Wicket Risk {currentSimWicketRisk}%
                </button>
              </div>
            </div>

            {showVenueWcComparison && (
              <div className="rounded-2xl border border-amber-500/40 bg-slate-950/95 p-4 space-y-2.5 font-mono text-xs animate-in fade-in duration-200">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <span className="text-amber-400 font-bold uppercase text-[11px]">
                    {stadium.name} · HISTORICAL VENUE BENCHMARK
                  </span>
                  <span className="text-[10px] text-slate-400">Par Score Telemetry</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] tabular-nums">
                  <div className="rounded-lg bg-slate-900/80 p-2 border border-slate-800/80">
                    <span className="text-slate-500 block text-[9px]">1ST INNINGS PAR</span>
                    <strong className="text-white text-xs">
                      {stadium.avgFirstInningsScore || 178} Runs
                    </strong>
                  </div>
                  <div className="rounded-lg bg-slate-900/80 p-2 border border-slate-800/80">
                    <span className="text-slate-500 block text-[9px]">POWERPLAY PAR</span>
                    <strong className="text-emerald-400 text-xs">48/1 (8.0 RPO)</strong>
                  </div>
                  <div className="rounded-lg bg-slate-900/80 p-2 border border-slate-800/80">
                    <span className="text-slate-500 block text-[9px]">CHASING WIN %</span>
                    <strong className="text-amber-300 text-xs">
                      {stadium.chasingWinPercent || 58}%
                    </strong>
                  </div>
                  <div className="rounded-lg bg-slate-900/80 p-2 border border-slate-800/80">
                    <span className="text-slate-500 block text-[9px]">LIVE CRR</span>
                    <strong className="text-cyan-300 text-xs">{currentRR} RPO</strong>
                  </div>
                </div>
              </div>
            )}

            {/* Weather & Pitch Conditions Real-Time AI Module */}
            <WeatherPitchConditionsModule
              condition={surfaceCondition}
              onChangeCondition={handleSurfaceConditionChange}
              metrics={conditionAiOutcome.metrics}
              battingTeamShort={battingTeamLive.shortName}
            />

            {/* Interactive Horizontal Match Event Timeline (Wickets, Boundary Bursts, Tactical Switches) */}
            <MatchEventTimeline
              innings1Events={engineState.innings1.events}
              innings2Events={engineState.innings2.events}
              teamA={teamA}
              teamB={teamB}
              stadium={effectiveStadium}
              liveInningsNumber={engineState.liveInningsNumber}
              onInspectPlayer={(p) => setActiveModalPlayer(p)}
            />

            {/* Dynamic D3.js Win Probability Oscillation Line Chart */}
            <WinProbabilityD3Chart
              battingTeam={battingTeamLive}
              bowlingTeam={bowlingTeamLive}
              events={activeLiveInnings.events}
              winProbHistory={activeLiveInnings.winProbHistory}
              liveWinProb={currentWinProb}
              maxOvers={liveScorecard.maxOvers}
              inningsNumber={engineState.liveInningsNumber}
              conditionLabel={conditionAiOutcome.metrics.label}
            />

            {/* Secondary Tactical Decision Engine: Ball-by-Ball AI Win Probability Shifts (D3 Spline) */}
            <TacticalDecisionEnginePanel
              battingTeam={battingTeamLive}
              bowlingTeam={bowlingTeamLive}
              striker={striker}
              nonStriker={nonStriker}
              bowler={bowler}
              events={activeLiveInnings.events}
              winProbHistory={activeLiveInnings.winProbHistory}
              liveWinProb={currentWinProb}
              runs={runs}
              wickets={wickets}
              legalBalls={currentBallIndex}
              maxOvers={liveScorecard.maxOvers}
              targetRuns={targetScore}
              inningsNumber={engineState.liveInningsNumber}
              stadium={effectiveStadium}
              surfaceCondition={surfaceCondition}
              dewActive={effectiveDew}
              currentTactics={userTactics}
              onApplyTactics={(next) => {
                triggerHaptic(HAPTIC_PATTERNS.TAP);
                setBattingAggression(next.battingAggression);
                setBowlingLine(next.bowlingLine);
                setFieldPreset(next.fieldPreset);
              }}
            />

            {/* Pitch Ball-Landing Heatmap & Batter Shot Run Distribution */}
            {pitchSubTab !== 'pitch_heatmap' && (
              <SimulatorPitchShotHeatmap
                innings1Events={engineState.innings1.events}
                innings2Events={engineState.innings2.events}
                superOver1Events={engineState.superOver1?.events ?? []}
                superOver2Events={engineState.superOver2?.events ?? []}
                innings1BattingTeam={engineState.innings1.battingTeam}
                innings2BattingTeam={engineState.innings2.battingTeam}
                liveInningsNumber={engineState.liveInningsNumber}
                currentStriker={striker}
                currentNonStriker={nonStriker}
                currentBowler={bowler}
                activeBattingTeam={battingTeamLive}
                stadium={effectiveStadium}
                surfaceCondition={surfaceCondition}
                onInspectPlayer={(p) => setActiveModalPlayer(p)}
              />
            )}

            {/* Shot Decision Advisor HUD */}
            <ShotDecisionAdvisorHUD
              lastBall={lastBall}
              bowler={bowler}
              striker={striker}
              stadium={effectiveStadium}
              requiredRR={requiredRR}
              wickets={wickets}
              onOpenFullAdvisor={() => setPitchSubTab('shot_advisor')}
            />

            {/* Tactical Pitch Visualizer & Sub-Tabs */}
            <div className="relative rounded-2xl border border-slate-800 bg-gradient-to-b from-slate-950 to-slate-900 p-4 sm:p-6 overflow-hidden space-y-4">
              <div className="space-y-2.5 border-b border-slate-800/80 pb-3.5">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-xs font-mono font-bold text-slate-200 tracking-wide">
                    Tactical Arena &amp; Pitch Analytics Views
                  </span>
                  <span className="text-xs font-mono text-cyan-300 tabular-nums shrink-0">
                    {lastBall
                      ? `${lastBall.speedKmh} KM/H · ${lastBall.deliveryType}`
                      : 'Awaiting delivery'}
                  </span>
                </div>

                <div
                  role="tablist"
                  aria-label="Tactical Pitch Visualizer Views"
                  className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-7 gap-1.5 rounded-xl bg-slate-900/95 p-1.5 border border-slate-800 text-xs font-mono"
                >
                  {[
                    { id: 'pitch', label: '3D Stadium' },
                    { id: 'pitch_heatmap', label: 'Pitch Heatmap' },
                    { id: 'shot_advisor', label: 'Shot Advisor' },
                    { id: 'tactical', label: 'Tactical Field' },
                    { id: 'drs_telemetry', label: 'Hawk-Eye DRS' },
                    { id: 'momentum', label: 'Momentum' },
                    { id: 'drs_matrix', label: 'DRS Matrix' },
                    { id: 'umpire', label: 'Umpire Signals' },
                    { id: 'fatigue', label: 'Player Fatigue' },
                    { id: 'timing', label: 'Batting Timing' },
                    { id: 'wagon', label: '360° Wagon Wheel' },
                    { id: 'shot_map', label: 'Pitch Shot Map' },
                    { id: 'inspector', label: 'Pitch Physics' },
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      type="button"
                      role="tab"
                      aria-selected={pitchSubTab === tab.id}
                      onClick={() => {
                        cricketAudio.playUiClick();
                        setPitchSubTab(tab.id as any);
                      }}
                      className={`h-8 rounded-lg px-2 inline-flex items-center justify-center transition-colors cursor-pointer whitespace-nowrap truncate ${
                        pitchSubTab === tab.id
                          ? 'bg-sky-500 text-slate-950 font-bold'
                          : 'bg-slate-950/60 text-slate-400 hover:text-white hover:bg-slate-800/80'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>

              {pitchSubTab === 'pitch' && (
                <div className="space-y-4">
                  <Stadium3DGround
                    teamA={battingTeamLive}
                    teamB={bowlingTeamLive}
                    stadium={stadium}
                    striker={striker}
                    nonStriker={nonStriker}
                    bowler={bowler}
                    runs={runs}
                    wickets={wickets}
                    overs={liveScorecard.oversFormatted}
                    targetScore={targetScore}
                    currentCRR={currentRR}
                    requiredRR={requiredRR}
                    lastBall={lastBall}
                    history={history}
                    battingAggression={battingAggression}
                    isMatchActive={isMatchActive}
                    onTriggerDrs={triggerDrsReview}
                  />

                  {lastBall &&
                    !lastBall.isWicket &&
                    simulatorEventState === 'LIVE_PLAY' &&
                    !lastBall.drsReviewResult && (
                      <FieldDrsInteractive
                        ballEvent={lastBall}
                        striker={striker}
                        bowler={bowler}
                        onTriggerBroadcastDrs={triggerDrsReview}
                        onDrsResolved={(result) => {
                          applyDrsBallTrackingOutcome(result);
                        }}
                      />
                    )}

                  <div className="space-y-3">
                    {latestEntry && (
                      <div className="rounded-2xl border border-slate-800 bg-slate-950/95 p-4 shadow-xl space-y-2 animate-in fade-in duration-200">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <span
                              className={`rounded-lg px-2.5 py-0.5 text-[10px] font-mono font-black uppercase tracking-wider shrink-0 ${
                                latestEntry.eventType === 'WICKET'
                                  ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40'
                                  : latestEntry.eventType === 'SIX'
                                  ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40'
                                  : latestEntry.eventType === 'FOUR'
                                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                                  : 'bg-sky-500/20 text-sky-300 border border-sky-500/40'
                              }`}
                            >
                              {latestEntry.eventType}
                            </span>
                            <span className="text-xs font-mono font-bold text-sky-400 tabular-nums shrink-0">
                              OVER {latestEntry.over}
                            </span>
                            <span className="text-[11px] text-slate-500 font-mono truncate">
                              {latestEntry.bowlerName} to {latestEntry.strikerName}
                            </span>
                          </div>

                          {isVoiceActive && (
                            <span className="text-[10px] font-mono text-cyan-400 shrink-0">
                              AUDIO LIVE
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-100 font-sans leading-relaxed font-medium">
                          {latestEntry.text}
                        </p>
                      </div>
                    )}

                    <AIFieldingStrategyCoach
                      bowler={bowler}
                      striker={striker}
                      overs={parseFloat(liveScorecard.oversFormatted) || 0}
                      wickets={wickets}
                      history={history}
                      currentFieldPreset={fieldPreset}
                      currentBowlingLine={bowlingLine}
                      onApplyFieldShift={(rec) => {
                        triggerHaptic(HAPTIC_PATTERNS.TAP);
                        cricketAudio.playUiClick();
                        setFieldPreset(rec.recommendedFieldPreset);
                        setBowlingLine(rec.recommendedBowlingLine);
                      }}
                    />

                    <StrategyInsightsPanel
                      runs={runs}
                      wickets={wickets}
                      overs={parseFloat(liveScorecard.oversFormatted)}
                      totalOvers={liveScorecard.maxOvers}
                      targetScore={targetScore}
                      currentWinProb={currentWinProb}
                      striker={striker}
                      bowler={bowler}
                      battingTeam={battingTeamLive}
                      bowlingTeam={bowlingTeamLive}
                      currentBattingAggression={battingAggression}
                      currentBowlingLine={bowlingLine}
                      currentFieldPreset={fieldPreset}
                      onApplyStrategy={(strategy) => {
                        setBattingAggression(strategy.battingAggression as any);
                        setBowlingLine(strategy.bowlingLine as any);
                        setFieldPreset(strategy.fieldPreset as any);
                      }}
                    />
                  </div>
                </div>
              )}

              {pitchSubTab === 'shot_advisor' && (
                <div className="pt-1 animate-in fade-in duration-200">
                  <ShotDecisionAdvisor
                    initialSpeed={lastBall?.speedKmh || (bowler?.role?.includes('Spin') ? 88 : 142)}
                    initialBounce={
                      stadium?.pitchType === 'Pace & Bounce'
                        ? 92
                        : stadium?.pitchType === 'Slow & Turning'
                        ? 69
                        : 84
                    }
                    initialLength={lastBall?.length || 'Good Length'}
                    bowler={bowler}
                    striker={striker}
                    stadium={stadium}
                    requiredRR={parseFloat(String(requiredRR)) || 8.5}
                    wickets={wickets}
                    onApplyTactic={() => setPitchSubTab('pitch')}
                  />
                </div>
              )}

              {pitchSubTab === 'tactical' && (
                <div className="space-y-4">
                  <AIFieldingStrategyCoach
                    bowler={bowler}
                    striker={striker}
                    overs={parseFloat(liveScorecard.oversFormatted) || 0}
                    wickets={wickets}
                    history={history}
                    currentFieldPreset={fieldPreset}
                    currentBowlingLine={bowlingLine}
                    onApplyFieldShift={(rec) => {
                      triggerHaptic(HAPTIC_PATTERNS.TAP);
                      cricketAudio.playUiClick();
                      setFieldPreset(rec.recommendedFieldPreset);
                      setBowlingLine(rec.recommendedBowlingLine);
                    }}
                  />
                  <LiveTacticalFieldView
                    teamA={battingTeamLive}
                    teamB={bowlingTeamLive}
                    striker={striker}
                    nonStriker={nonStriker}
                    bowler={bowler}
                    currentOver={liveScorecard.oversFormatted}
                    runs={runs}
                    wickets={wickets}
                    targetScore={targetScore}
                    lastBall={lastBall}
                    stadium={stadium}
                    history={history}
                  />
                </div>
              )}

              {pitchSubTab === 'drs_telemetry' && (
                <div className="space-y-4 pt-1 animate-in fade-in duration-300">
                  <DrsFieldTelemetryView
                    appealType={lastBall?.isWicket ? 'LBW' : 'CAUGHT BEHIND'}
                    strikerName={striker.name}
                    bowlerName={bowler.name}
                    isOut={lastBall ? lastBall.isWicket : true}
                    deliverySpeed={lastBall?.speedKmh || 142.4}
                    deliveryType={lastBall?.deliveryType || 'Good Length Seamer'}
                    ballEvent={lastBall}
                    matchHistory={history}
                  />
                </div>
              )}

              {pitchSubTab === 'wagon' && (
                <div className="pt-1 animate-in fade-in duration-200">
                  <WagonWheel360 player={striker} deliveries={history} mode="full" />
                </div>
              )}

              {pitchSubTab === 'shot_map' && (
                <div className="pt-1 animate-in fade-in duration-200">
                  <ShotMapPitch
                    player={striker}
                    selectedZone={simulatorShotZone}
                    onSelectZone={setSimulatorShotZone}
                    initialHeatmapActive={true}
                    stadium={effectiveStadium}
                    matchDeliveries={
                      history.length > 0 ? mapBallEventsToPitchDeliveries(history) : undefined
                    }
                    allMatchDeliveries={(() => {
                      const cumulativeEvents = [
                        ...engineState.innings1.events,
                        ...engineState.innings2.events,
                        ...(engineState.superOver1?.events ?? []),
                        ...(engineState.superOver2?.events ?? []),
                      ];
                      return cumulativeEvents.length > 0
                        ? mapBallEventsToPitchDeliveries(cumulativeEvents)
                        : undefined;
                    })()}
                    totalMatchBallsSimulated={
                      engineState.innings1.events.length +
                      engineState.innings2.events.length +
                      (engineState.superOver1?.events.length ?? 0) +
                      (engineState.superOver2?.events.length ?? 0)
                    }
                    maxMatchBalls={Math.max(12, totalOvers * 12)}
                    inningsNumber={engineState.liveInningsNumber}
                    surfaceConditionOverride={surfaceCondition}
                    matchTimeSeconds={matchDurationSeconds}
                    timeOfDay={effectiveStadium.weather?.condition}
                  />
                </div>
              )}

              {pitchSubTab === 'pitch_heatmap' && (
                <div className="pt-1 animate-in fade-in duration-200">
                  <SimulatorPitchShotHeatmap
                    innings1Events={engineState.innings1.events}
                    innings2Events={engineState.innings2.events}
                    superOver1Events={engineState.superOver1?.events ?? []}
                    superOver2Events={engineState.superOver2?.events ?? []}
                    innings1BattingTeam={engineState.innings1.battingTeam}
                    innings2BattingTeam={engineState.innings2.battingTeam}
                    liveInningsNumber={engineState.liveInningsNumber}
                    currentStriker={striker}
                    currentNonStriker={nonStriker}
                    currentBowler={bowler}
                    activeBattingTeam={battingTeamLive}
                    stadium={effectiveStadium}
                    surfaceCondition={surfaceCondition}
                    onInspectPlayer={(p) => setActiveModalPlayer(p)}
                  />
                </div>
              )}

              {pitchSubTab === 'momentum' && (
                <div className="pt-2 space-y-4">
                  <MomentumShiftIndicator
                    history={history}
                    stadium={stadium}
                    currentRuns={runs}
                    currentWickets={wickets}
                    currentOvers={liveScorecard.oversFormatted}
                    targetScore={targetScore}
                    totalOvers={liveScorecard.maxOvers}
                    defaultExpanded={true}
                  />
                  <MatchMomentumOverlay
                    history={history}
                    teamAName={battingTeamLive.name}
                    teamBName={bowlingTeamLive.name}
                    currentOver={currentBallIndex / 6}
                    currentScore={runs}
                    target={targetScore}
                    isSecondInnings={engineState.liveInningsNumber >= 2}
                  />
                </div>
              )}

              {pitchSubTab === 'drs_matrix' && (
                <div className="pt-2">
                  <DrsConfidenceMatrix />
                </div>
              )}

              {pitchSubTab === 'umpire' && (
                <div className="pt-2">
                  <UmpireDecisionVisualizer
                    currentSignal={
                      lastBall?.isWicket
                        ? 'out'
                        : (lastBall?.batterRuns ?? lastBall?.runsScored) === 4
                        ? 'four'
                        : (lastBall?.batterRuns ?? lastBall?.runsScored) === 6
                        ? 'six'
                        : lastBall?.extraType === 'wide'
                        ? 'wide'
                        : 'not_out'
                    }
                  />
                </div>
              )}

              {pitchSubTab === 'fatigue' && (
                <div className="pt-2">
                  <PlayerFatigueAnalysis
                    currentOver={oversDone + 1}
                    striker={striker}
                    nonStriker={nonStriker}
                    currentBowler={bowler}
                  />
                </div>
              )}

              {pitchSubTab === 'timing' && (
                <div className="pt-2">
                  <BattingTimingVisualizer
                    batter={striker}
                    ballsFaced={liveScorecard.strikerRow?.balls || 0}
                  />
                </div>
              )}

              {pitchSubTab === 'inspector' && (
                <div className="pt-2">
                  <PitchInspector
                    stadiumName={`${stadium.name} (${stadium.city})`}
                    onApplyConditions={(cond) => {
                      if (cond.grassCoverage >= 55 || cond.dewLevel >= 65) {
                        handleSurfaceConditionChange('damp');
                      } else if (cond.pitchWear >= 50 || cond.turnDeg >= 3.2) {
                        handleSurfaceConditionChange('dusty');
                      } else {
                        handleSurfaceConditionChange('batting_paradise');
                      }
                    }}
                  />
                </div>
              )}
            </div>

            {/* Coach Strategy Adjustments */}
            <div className="rounded-xl border border-slate-800 bg-slate-950 p-4 space-y-4">
              <div className="flex items-center justify-between text-xs font-bold text-white">
                <span className="flex items-center gap-1.5">
                  <Shield className="h-4 w-4 text-sky-400" />
                  <span>Coach Strategy Adjustments</span>
                </span>
                <span className="text-xs text-slate-500 font-normal">
                  Real-time simulation parameters
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div>
                  <label className="text-slate-400 block mb-1">Batting Aggression</label>
                  <select
                    value={battingAggression}
                    onChange={(e) =>
                      setBattingAggression(e.target.value as typeof battingAggression)
                    }
                    className="w-full rounded-lg border border-slate-800 bg-slate-900 px-2.5 py-1.5 text-xs text-slate-200 focus:border-sky-500 cursor-pointer"
                  >
                    <option value="Anchor">Anchor (Preserve Wickets)</option>
                    <option value="Balanced">Balanced (Rotate Strike)</option>
                    <option value="Aggressive">Aggressive (Attack Boundaries)</option>
                    <option value="Maximum Risk">Maximum Risk (Assault)</option>
                  </select>
                </div>

                <div>
                  <label className="text-slate-400 block mb-1">Bowling Delivery Focus</label>
                  <select
                    value={bowlingLine}
                    onChange={(e) => setBowlingLine(e.target.value as typeof bowlingLine)}
                    className="w-full rounded-lg border border-slate-800 bg-slate-900 px-2.5 py-1.5 text-xs text-slate-200 focus:border-sky-500 cursor-pointer"
                  >
                    <option value="Wide Yorker">Wide Yorker Trap</option>
                    <option value="Hard Deck Bouncer">Hard Deck Bouncers</option>
                    <option value="Stump-to-stump">Stump-to-stump Seam</option>
                    <option value="Slower Variation">Back-of-Hand Variations</option>
                  </select>
                </div>

                <div>
                  <label className="text-slate-400 block mb-1">Tactical Field Preset</label>
                  <select
                    value={fieldPreset}
                    onChange={(e) => setFieldPreset(e.target.value as typeof fieldPreset)}
                    className="w-full rounded-lg border border-slate-800 bg-slate-900 px-2.5 py-1.5 text-xs text-slate-200 focus:border-sky-500 cursor-pointer"
                  >
                    <option value="Balanced Ring">Balanced Ring (Standard)</option>
                    <option value="Aggressive Slips">Aggressive Slips (Catching)</option>
                    <option value="Deep Boundary Defense">Deep Fence Defense (Save 4s)</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Right 4 Cols: Win Probability, Next Ball Predictor & DRS Monitor */}
          {!isBroadcastMode && (
            <div className="lg:col-span-4 min-w-0 space-y-6">
              {/* Win Probability & Momentum */}
              <div className="rounded-2xl border border-cyan-500/30 bg-gradient-to-b from-[#03091c]/90 to-[#020510]/95 p-5 space-y-4 backdrop-blur-xl shadow-xl">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-mono text-cyan-400 font-bold tracking-wider">
                    WIN PROBABILITY
                  </span>
                  <span className="text-[11px] font-mono text-slate-400 tabular-nums">
                    {conditionAiOutcome.metrics.label} · Par {conditionAiOutcome.metrics.adjustedParScore}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 items-center justify-between">
                  <div className="flex items-center gap-2 min-w-0">
                    <TeamFlag code={battingTeamLive.id} size="md" />
                    <span className="text-xs sm:text-sm font-bold text-white truncate">
                      {battingTeamLive.name}
                    </span>
                    <span className="text-lg font-black text-cyan-300 tabular-nums">
                      {currentWinProb}%
                    </span>
                  </div>
                  <div className="flex items-center justify-end gap-2 min-w-0">
                    <span className="text-lg font-black text-amber-400 tabular-nums">
                      {Math.round((100 - currentWinProb) * 10) / 10}%
                    </span>
                    <span className="text-xs sm:text-sm font-bold text-slate-300 truncate">
                      {bowlingTeamLive.name}
                    </span>
                    <TeamFlag code={bowlingTeamLive.id} size="md" />
                  </div>
                </div>

                <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-900 border border-slate-800 flex">
                  <div
                    className="h-full bg-gradient-to-r from-cyan-500 to-sky-400 transition-all duration-300"
                    style={{ width: `${currentWinProb}%` }}
                  />
                  <div
                    className="h-full bg-gradient-to-r from-amber-500 to-amber-400 transition-all duration-300"
                    style={{ width: `${100 - currentWinProb}%` }}
                  />
                </div>

                <div className="border-t border-cyan-500/15 pt-3 space-y-2">
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="text-slate-400">MOMENTUM INDEX</span>
                    <span className="inline-flex items-center gap-1.5 text-white font-bold">
                      <TeamFlag code={battingTeamLive.id} size="xs" />
                      <span className="tabular-nums text-cyan-300">{currentMomentum}%</span>
                    </span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-slate-900 border border-slate-800">
                    <div
                      className="h-full bg-gradient-to-r from-emerald-500 via-teal-400 to-cyan-400 transition-all duration-300"
                      style={{ width: `${currentMomentum}%` }}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => setPitchSubTab('momentum')}
                    className="w-full text-center text-[10px] font-mono text-cyan-400 hover:text-cyan-300 hover:underline pt-1 cursor-pointer"
                  >
                    View CRR vs RRR Momentum Vector →
                  </button>
                </div>

                {lastBall && lastBall.aiExplanation && (
                  <div className="rounded-xl border border-cyan-500/20 bg-cyan-950/20 p-3 space-y-1 text-xs">
                    <div className="flex items-center gap-1.5 font-bold text-cyan-300">
                      <TrendingUp className="h-3.5 w-3.5" />
                      <span>Win Probability Shift</span>
                    </div>
                    <p className="text-slate-300 leading-relaxed font-sans">
                      {lastBall.aiExplanation}
                    </p>
                    <p className="text-[11px] text-slate-400 font-mono pt-1 tabular-nums">
                      Delta:{' '}
                      {lastBall.winProbDelta > 0
                        ? `+${lastBall.winProbDelta}%`
                        : `${lastBall.winProbDelta}%`}
                    </p>
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => {
                    cricketAudio.playUiClick();
                    document
                      .getElementById('tactical-decision-engine-panel')
                      ?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                  }}
                  className="w-full rounded-xl border border-slate-800 bg-slate-950/80 px-3 py-2 text-[11px] font-semibold text-cyan-300 hover:border-cyan-500/40 hover:text-white transition-colors cursor-pointer whitespace-nowrap"
                >
                  Inspect Tactical Decision Engine D3 Spline ↓
                </button>
              </div>

              {/* Predict The Next Ball (+50 XP) */}
              <div className="rounded-2xl border border-cyan-500/30 bg-gradient-to-b from-[#03091c]/90 to-[#020510]/95 p-5 space-y-3 backdrop-blur-xl shadow-xl">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-white">
                    <Sparkles className="h-4 w-4 text-amber-400" />
                    <span>Predict The Next Ball</span>
                  </div>
                  <span className="text-xs font-mono font-bold text-amber-400">
                    +50 XP
                  </span>
                </div>

                <p className="text-xs text-slate-400 font-sans">
                  Pick the outcome of the next delivery to earn tactical XP.
                </p>

                <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                  {(['DOT', 'RUNS', 'BOUNDARY', 'WICKET'] as const).map((choice) => (
                    <button
                      key={choice}
                      type="button"
                      onClick={() => setUserNextBallGuess(choice)}
                      className={`rounded-xl border p-2.5 text-center font-bold transition-all cursor-pointer ${
                        userNextBallGuess === choice
                          ? 'border-cyan-400 bg-cyan-500/25 text-cyan-200'
                          : 'border-slate-800 bg-slate-950/80 text-slate-300 hover:border-cyan-500/40 hover:text-white'
                      }`}
                    >
                      {choice === 'BOUNDARY' ? 'FOUR / SIX' : choice}
                    </button>
                  ))}
                </div>

                {predictionFeedback && (
                  <p className="text-xs font-mono text-center text-cyan-300 pt-1 font-bold">
                    {predictionFeedback}
                  </p>
                )}
              </div>

              {/* DRS Review Engine Monitor */}
              <div className="rounded-2xl border border-cyan-500/30 bg-gradient-to-b from-[#03091c]/90 to-[#020510]/95 p-5 space-y-3.5 backdrop-blur-xl shadow-xl">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <span className="text-xs font-bold text-white block">DRS Review Engine</span>
                    <span className="text-[10px] font-mono text-cyan-400">
                      State: {simulatorEventState.replace(/_/g, ' ')}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      if (
                        simulatorEventState === 'DISMISSAL_EVENT' ||
                        drsReviewState === 'REVIEW_AVAILABLE'
                      ) {
                        initiateDismissalDrsReview(false);
                      } else {
                        triggerDrsReview();
                      }
                    }}
                    disabled={simulatorEventState === 'DRS_REVIEW'}
                    className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-all cursor-pointer disabled:opacity-40 whitespace-nowrap ${
                      simulatorEventState === 'DISMISSAL_EVENT'
                        ? 'bg-cyan-400 text-slate-950 hover:bg-cyan-300'
                        : 'bg-sky-500/20 border border-sky-500/40 text-sky-300 hover:bg-sky-500/30'
                    }`}
                  >
                    {simulatorEventState === 'DISMISSAL_EVENT'
                      ? 'Initiate Review'
                      : 'Trigger Review'}
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[11px] font-mono">
                  <div className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950/80 px-2.5 py-1.5">
                    <span className="inline-flex items-center gap-1.5 text-slate-300 truncate">
                      <TeamFlag code={battingTeamLive.id} size="xs" />
                      <span className="truncate">{battingTeamLive.name}</span>
                    </span>
                    <strong className="text-amber-300 tabular-nums">
                      {drsReviewsLeft.batting}/2
                    </strong>
                  </div>
                  <div className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950/80 px-2.5 py-1.5">
                    <span className="inline-flex items-center gap-1.5 text-slate-300 truncate">
                      <TeamFlag code={bowlingTeamLive.id} size="xs" />
                      <span className="truncate">{bowlingTeamLive.name}</span>
                    </span>
                    <strong className="text-cyan-300 tabular-nums">
                      {drsReviewsLeft.bowling}/2
                    </strong>
                  </div>
                </div>

                {isDrsActive || drsTrackingSummary ? (
                  <div className="rounded-xl border border-slate-800 bg-slate-950 p-3 space-y-2 text-xs">
                    <div className="flex items-center justify-between text-sky-400 font-mono text-[11px]">
                      <span>BALL TRACKING PROTOCOL</span>
                      <span
                        className={
                          drsReviewState === 'REVIEWING' ? 'text-rose-400' : 'text-emerald-400'
                        }
                      >
                        {drsReviewState === 'REVIEWING'
                          ? 'LIVE'
                          : drsTrackingSummary?.verdict || 'LOCKED'}
                      </span>
                    </div>
                    <p className="text-slate-200 text-[11px] leading-relaxed">{drsOutcome}</p>
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 leading-relaxed">
                    When an LBW or Caught dismissal occurs, play pauses so you can challenge the on-field decision via Hawk-Eye ball tracking.
                  </p>
                )}

                {drsLedger.length > 0 && (
                  <div className="space-y-1.5 pt-2 border-t border-slate-800/80">
                    <span className="text-[10px] font-mono font-semibold text-slate-400 block">
                      Match Review Ledger ({drsLedger.length})
                    </span>
                    <div className="space-y-1 max-h-28 overflow-y-auto pr-1">
                      {drsLedger.map((entry) => (
                        <div
                          key={entry.id}
                          className="flex items-center justify-between gap-2 rounded-lg bg-slate-950/80 border border-slate-800/80 px-2.5 py-1.5 text-[10px] font-mono"
                        >
                          <span className="text-slate-300 truncate">
                            {entry.overLabel} ov · {entry.batterName.split(' ').pop()} (
                            {entry.appealType})
                          </span>
                          <span
                            className={`shrink-0 font-bold ${
                              entry.decision === 'OVERTURNED'
                                ? 'text-emerald-400'
                                : entry.isUmpiresCall
                                ? 'text-amber-300'
                                : 'text-rose-400'
                            }`}
                          >
                            {entry.decision}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* =====================================================================
          4. POST-MATCH COMPREHENSIVE ANALYTICS SUITE
          ===================================================================== */}
      {isMatchOver && matchResultBanner?.winnerTeam && (
        <div className="space-y-6 animate-in fade-in duration-300">
          <div className="flex flex-wrap items-center justify-between gap-3 p-2 rounded-2xl border border-slate-800 bg-slate-950/80 backdrop-blur-xl">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setPostMatchTab('summary');
                  cricketAudio.playBatHit();
                }}
                className={`flex items-center gap-2 rounded-xl px-5 py-2.5 text-xs font-mono font-bold transition-all cursor-pointer ${
                  postMatchTab === 'summary'
                    ? 'bg-gradient-to-r from-emerald-500 to-teal-400 text-slate-950 font-black'
                    : 'text-slate-400 hover:text-white hover:bg-slate-900'
                }`}
              >
                <Trophy className="w-4 h-4" />
                <span>Match Summary Dashboard</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setPostMatchTab('why_won');
                  cricketAudio.playBatHit();
                }}
                className={`flex items-center gap-2 rounded-xl px-5 py-2.5 text-xs font-mono font-bold transition-all cursor-pointer whitespace-nowrap ${
                  postMatchTab === 'why_won'
                    ? 'bg-gradient-to-r from-amber-500 to-orange-400 text-slate-950 font-black'
                    : 'text-slate-400 hover:text-white hover:bg-slate-900'
                }`}
              >
                <Sparkles className="w-4 h-4" />
                <span>Why Did This Team Win?</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setPostMatchTab('pro_analysis');
                  cricketAudio.playBatHit();
                }}
                className={`flex items-center gap-2 rounded-xl px-5 py-2.5 text-xs font-mono font-bold transition-all cursor-pointer whitespace-nowrap ${
                  postMatchTab === 'pro_analysis'
                    ? 'bg-gradient-to-r from-cyan-400 to-sky-400 text-slate-950 font-black'
                    : 'text-slate-400 hover:text-white hover:bg-slate-900'
                }`}
              >
                <TrendingUp className="w-4 h-4" />
                <span>Pro Match Analysis (10 Modules)</span>
              </button>
            </div>

            <div className="text-xs font-mono text-slate-400 px-3">
              <span>
                Status: <strong className="text-emerald-400">{matchResultBanner.headline}</strong>
              </span>
            </div>
          </div>

          {postMatchTab === 'summary' ? (
            <MatchSummaryDashboard
              teamA={innings2Scorecard.battingTeam}
              teamB={innings1Scorecard.battingTeam}
              winningTeam={matchResultBanner.winnerTeam}
              losingTeam={
                matchResultBanner.winnerTeam.id === innings2Scorecard.battingTeam.id
                  ? innings1Scorecard.battingTeam
                  : innings2Scorecard.battingTeam
              }
              playerOfTheMatch={computedPlayerOfTheMatch}
              runs={innings2Scorecard.runs}
              wickets={innings2Scorecard.wickets}
              targetRuns={innings1Scorecard.runs + 1}
              totalOvers={totalOvers}
              history={engineState.innings2.events}
              innings1Scorecard={innings1Scorecard}
              innings2Scorecard={innings2Scorecard}
              superOver1Scorecard={superOver1Scorecard}
              superOver2Scorecard={superOver2Scorecard}
              resultHeadline={matchResultBanner.headline}
              onInspectPlayer={(p) => setActiveModalPlayer(p)}
              onRestartMatch={handleReset}
            />
          ) : postMatchTab === 'pro_analysis' ? (
            <ProMatchAnalysisTenSuite
              teamA={engineState.innings1.battingTeam}
              teamB={engineState.innings2.battingTeam}
              stadium={effectiveStadium}
              innings1Events={engineState.innings1.events}
              innings2Events={engineState.innings2.events}
              targetRuns={innings1Scorecard.runs + 1}
              dewActive={effectiveDew}
              embeddedMode={true}
              onInspectPlayer={(p) => setActiveModalPlayer(p)}
            />
          ) : (
            <WhyTeamWonReport
              winningTeam={matchResultBanner.winnerTeam}
              losingTeam={
                matchResultBanner.winnerTeam.id === innings2Scorecard.battingTeam.id
                  ? innings1Scorecard.battingTeam
                  : innings2Scorecard.battingTeam
              }
              playerOfTheMatch={computedPlayerOfTheMatch}
              runs={innings2Scorecard.runs}
              wickets={innings2Scorecard.wickets}
              targetRuns={innings1Scorecard.runs + 1}
              history={engineState.innings2.events}
            />
          )}
        </div>
      )}

      {/* =====================================================================
          5. MODALS & OVERLAYS
          ===================================================================== */}
      <PlayingXISelectorModal
        isOpen={showPlayingXIModal}
        onClose={() => setShowPlayingXIModal(false)}
        teamA={teamA}
        teamB={teamB}
        playingXIA={playingXIA}
        playingXIB={playingXIB}
        onUpdatePlayingXIA={setPlayingXIA}
        onUpdatePlayingXIB={setPlayingXIB}
        onResetDefaultOrders={() => {
          setPlayingXIA(buildOrderedPlayingXI(teamA));
          setPlayingXIB(buildOrderedPlayingXI(teamB));
        }}
      />

      <DrsBroadcastModal
        isOpen={showBroadcastDrs}
        onClose={() => {
          setShowBroadcastDrs(false);
          setIsDrsActive(false);
          audioManager.setDrsReviewActive(false);
          setSimulatorEventState((prev) =>
            prev === 'DRS_REVIEW'
              ? lastDismissalContext && lastBall?.isWicket && !lastBall?.drsReviewResult
                ? 'DISMISSAL_EVENT'
                : 'LIVE_PLAY'
              : prev
          );
          setDrsReviewState((prev) =>
            prev === 'REVIEWING'
              ? lastDismissalContext && lastBall?.isWicket && !lastBall?.drsReviewResult
                ? 'REVIEW_AVAILABLE'
                : 'IDLE'
              : prev
          );
        }}
        strikerName={lastDismissalContext?.dismissedBatter?.name || striker.name}
        bowlerName={lastDismissalContext?.bowler?.name || bowler.name}
        initialUmpireCall={
          lastBall?.isWicket ||
          drsReviewState === 'REVIEW_AVAILABLE' ||
          (drsReviewState === 'REVIEWING' && Boolean(lastDismissalContext))
            ? 'OUT'
            : 'NOT OUT'
        }
        appealType={
          activeBallTracking?.appealType ||
          lastDismissalContext?.appealMode ||
          (lastBall?.shot?.toLowerCase().includes('edge') ||
          lastBall?.commentary?.toLowerCase().includes('caught')
            ? 'CAUGHT BEHIND'
            : 'LBW')
        }
        ballTrackingOutcome={activeBallTracking}
        onVerdictApplied={(result) => {
          applyDrsBallTrackingOutcome(result);
        }}
      />

      {showAiReportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md overflow-y-auto animate-in fade-in duration-200">
          <div className="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <button
              type="button"
              onClick={() => setShowAiReportModal(false)}
              className="absolute top-4 right-4 z-20 flex h-8 w-8 items-center justify-center rounded-full border border-slate-800 bg-slate-900 text-slate-400 hover:text-white transition-colors cursor-pointer"
            >
              ✕
            </button>
            <WhyTeamWonReport
              winningTeam={matchResultBanner?.winnerTeam || battingTeamLive}
              losingTeam={
                matchResultBanner?.winnerTeam?.id === battingTeamLive.id
                  ? bowlingTeamLive
                  : battingTeamLive
              }
              playerOfTheMatch={computedPlayerOfTheMatch}
              runs={runs}
              wickets={wickets}
              targetRuns={targetScore}
              history={history}
            />
          </div>
        </div>
      )}

      {showCeremony && (
        <MatchCeremonyModal
          teamA={teamA}
          teamB={teamB}
          onCeremonyComplete={(toss) => finalizeCeremonyAndStart(toss)}
          onSkip={() => finalizeCeremonyAndStart()}
        />
      )}

      <MatchCelebrationOverlay
        currentEvent={activeCelebration}
        winnerName={matchResultBanner?.winnerTeam?.name || battingTeamLive.name}
        onDismiss={() => setActiveCelebration(null)}
      />

      {showInningsBreakModal && (
        <InningsBreakScoreboard
          battingTeam={innings1Scorecard.battingTeam}
          bowlingTeam={innings1Scorecard.bowlingTeam}
          targetRuns={innings1Scorecard.runs + 1}
          totalOvers={totalOvers}
          innings1Scorecard={innings1Scorecard}
          isModal={true}
          onClose={() => setShowInningsBreakModal(false)}
          onStartChase={
            innings2Scorecard.status === 'upcoming' ? handleStartSecondInnings : undefined
          }
        />
      )}

      {showSimWicketRiskModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200">
          <div className="relative w-full max-w-md">
            <InGameWicketProbabilityOverlay
              batter={striker}
              bowler={bowler}
              pressureIndex={currentBatterPressure}
              pitchPrecision={currentBowlerPrecision}
              currentOver={liveScorecard.oversFormatted}
              requiredRR={parseFloat(String(requiredRR)) || 8.5}
              recentBalls={history}
              onDismiss={() => setShowSimWicketRiskModal(false)}
            />
          </div>
        </div>
      )}

      <FallOfWicketsModal
        isOpen={!!selectedWicketModal}
        onClose={() => setSelectedWicketModal(null)}
        wicketDetail={selectedWicketModal}
        battingTeam={displayedScorecard.battingTeam}
        bowlingTeam={displayedScorecard.bowlingTeam}
      />

      <InteractiveMatchGuideModal
        isOpen={showInteractiveGuide}
        onClose={() => setShowInteractiveGuide(false)}
        onTryFeature={(tab) => {
          setActiveMainTab('arena');
          setPitchSubTab(tab as any);
          setShowInteractiveGuide(false);
        }}
      />
      </div>
    </MatchSimulatorProvider>
  );
};
