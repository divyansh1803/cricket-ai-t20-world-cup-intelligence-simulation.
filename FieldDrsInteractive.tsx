import React, { useState, useEffect } from 'react';
import { BallEvent, Player } from '../../types/cricket';
import { cricketAudio } from '../../utils/audioSystem';
import { audioManager } from '../../services/AudioManager';
import {
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Play,
  RotateCcw,
  Volume2,
  Eye,
  Activity,
  Layers,
  ArrowRight,
} from 'lucide-react';
import { DrsFieldTelemetryView } from './DrsFieldTelemetryView';
import { BroadcastUltraEdgeCanvas } from './BroadcastUltraEdgeCanvas';
import { BroadcastBallTrackingCanvas } from './BroadcastBallTrackingCanvas';

interface FieldDrsInteractiveProps {
  ballEvent: BallEvent | null;
  striker: Player;
  bowler: Player;
  onTriggerBroadcastDrs?: () => void;
  onDrsResolved: (result: {
    finalVerdict: 'OUT' | 'NOT OUT' | "UMPIRE'S CALL";
    wasReversed: boolean;
    wicketDelta: number;
    explanation: string;
  }) => void;
  onDismiss?: () => void;
}

export const FieldDrsInteractive: React.FC<FieldDrsInteractiveProps> = ({
  ballEvent,
  striker,
  bowler,
  onTriggerBroadcastDrs,
  onDrsResolved,
  onDismiss,
}) => {
  // If no ball yet, don't show
  if (!ballEvent) return null;

  // Only show DRS prompt if there is an appealable situation (wicket, edge, lbw shout, or close call)
  const isAppealSituation =
    ballEvent.isWicket ||
    ballEvent.shot?.toLowerCase().includes('edge') ||
    ballEvent.commentary?.toLowerCase().includes('appeal') ||
    ballEvent.commentary?.toLowerCase().includes('lbw') ||
    ballEvent.commentary?.toLowerCase().includes('caught') ||
    ballEvent.commentary?.toLowerCase().includes('pad') ||
    ballEvent.commentary?.toLowerCase().includes('shout') ||
    ballEvent.commentary?.toLowerCase().includes('close');

  if (!isAppealSituation) return null;

  // Decide initial on-field decision from simulator ball event
  const isWicketEvent = ballEvent.isWicket;
  const appealType = ballEvent.shot?.toLowerCase().includes('edge') || ballEvent.commentary?.toLowerCase().includes('caught')
    ? 'CATCH'
    : 'LBW';

  const initialOnField = isWicketEvent ? 'OUT' : 'NOT OUT';

  const [isModalMode, setIsModalMode] = useState<boolean>(false);
  const [selectedDismissalOverride, setSelectedDismissalOverride] = useState<'LBW' | 'CATCH' | null>(null);

  const activeAppealType = selectedDismissalOverride || appealType;
  const [secondsLeft, setSecondsLeft] = useState<number>(15);
  const [isReviewOpen, setIsReviewOpen] = useState<boolean>(false);
  const [activeReviewTab, setActiveReviewTab] = useState<'ball_tracking' | 'ultra_edge' | 'wicket_impact'>(
    activeAppealType === 'CATCH' ? 'ultra_edge' : 'ball_tracking'
  );

  // Review replay animation stages:
  // 'idle' -> 'replaying' -> 'verdict' -> 'cinematic_banner'
  const [reviewStage, setReviewStage] = useState<'idle' | 'replaying' | 'verdict' | 'cinematic_banner'>('idle');
  const [ultraEdgeSpikeActive, setUltraEdgeSpikeActive] = useState<boolean>(isWicketEvent);
  const [ballTrackingHitting, setBallTrackingHitting] = useState<boolean>(isWicketEvent);
  const [verdictResult, setVerdictResult] = useState<'OUT' | 'NOT OUT' | "UMPIRE'S CALL" | null>(null);
  const [bannerText, setBannerText] = useState<'DECISION CONFIRMED' | 'DECISION REVERSED' | null>(null);

  // Countdown timer effect
  useEffect(() => {
    if (isReviewOpen || reviewStage !== 'idle') return;

    if (secondsLeft <= 0) {
      if (onDismiss) onDismiss();
      return;
    }

    const timer = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [secondsLeft, isReviewOpen, reviewStage, onDismiss]);

  // Start the DRS review
  const handleStartReview = () => {
    if (onTriggerBroadcastDrs) {
      onTriggerBroadcastDrs();
      return;
    }

    setIsReviewOpen(true);
    setReviewStage('replaying');
    
    // Trigger Third Umpire radio intro comms & tension heartbeat loop
    audioManager.playDrsRadioComms(
      appealType === 'CATCH' 
        ? "Third umpire to director: Roll UltraEdge through frame by frame please." 
        : "Third umpire to director: Rock and roll front foot please, then ball tracking."
    );
    audioManager.startDrsHeartbeatLoop();

    // After 1.5s of replay animation, calculate deterministic verdict from ballEvent
    setTimeout(() => {
      // Determine ground truth from ballEvent
      let finalVerdict: 'OUT' | 'NOT OUT' | "UMPIRE'S CALL";

      if (appealType === 'CATCH') {
        if (ballEvent.isWicket) {
          finalVerdict = 'OUT';
          setUltraEdgeSpikeActive(true);
          audioManager.playDrsUltraEdgeSpike(true);
        } else {
          finalVerdict = 'NOT OUT';
          setUltraEdgeSpikeActive(false);
          audioManager.playDrsUltraEdgeSpike(false);
        }
      } else {
        // LBW
        if (ballEvent.isWicket) {
          finalVerdict = 'OUT';
          setBallTrackingHitting(true);
          audioManager.playDrsBallTrackingRadar();
        } else {
          // If was not a wicket, could be umpire's call or missing
          const outcomes: Array<'NOT OUT' | "UMPIRE'S CALL"> = ['NOT OUT', "UMPIRE'S CALL"];
          finalVerdict = outcomes[ballEvent.runsScored % outcomes.length];
          setBallTrackingHitting(false);
          audioManager.playDrsBallTrackingRadar();
        }
      }

      setVerdictResult(finalVerdict);
      setReviewStage('verdict');
      
      // Stop heartbeat and announce decision reveal
      audioManager.playDrsDecisionReveal(finalVerdict === 'OUT');

      // Show cinematic confirmation / reversal banner
      setTimeout(() => {
        const reversed = initialOnField !== finalVerdict && finalVerdict !== "UMPIRE'S CALL";
        const banner = reversed ? 'DECISION REVERSED' : 'DECISION CONFIRMED';
        setBannerText(banner);
        setReviewStage('cinematic_banner');

        if (reversed) {
          audioManager.playCloseCallGasp('Decision Reversed');
        } else {
          audioManager.playBoundaryApplause();
        }
      }, 1600);
    }, 2000);
  };

  const handleApplyResult = () => {
    if (!verdictResult) return;

    const wasReversed = initialOnField !== verdictResult && verdictResult !== "UMPIRE'S CALL";
    let wicketDelta = 0;

    if (initialOnField === 'OUT' && verdictResult === 'NOT OUT') {
      // Overturned from Out to Not Out -> restore 1 wicket!
      wicketDelta = -1;
    } else if (initialOnField === 'NOT OUT' && verdictResult === 'OUT') {
      // Overturned from Not Out to Out -> add 1 wicket!
      wicketDelta = +1;
    }

    onDrsResolved({
      finalVerdict: verdictResult,
      wasReversed,
      wicketDelta,
      explanation: `${appealType} review: ${verdictResult}. ${
        wasReversed ? 'Original on-field call overturned by Third Umpire.' : 'On-field umpire call upheld.'
      }`,
    });

    setIsReviewOpen(false);
    setReviewStage('idle');
  };

  const containerClasses = isModalMode
    ? 'fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-md animate-in fade-in overflow-y-auto'
    : 'relative rounded-2xl border border-sky-500/40 bg-slate-950/95 p-4 sm:p-5 shadow-2xl backdrop-blur-md overflow-hidden space-y-4';

  const innerWrapperClasses = isModalMode
    ? 'relative w-full max-w-2xl rounded-3xl border border-sky-500/50 bg-slate-950 p-6 sm:p-7 shadow-2xl space-y-4'
    : 'space-y-4';

  return (
    <div className={containerClasses}>
      <div className={innerWrapperClasses}>
        {/* Field On-Field Call & Timer Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
        <div className="flex items-center gap-3">
          {/* Pulsing On-Field Call Badge */}
          <div
            className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-black tracking-wider uppercase shadow-md ${
              initialOnField === 'OUT'
                ? 'bg-rose-500/20 border border-rose-500/50 text-rose-400 animate-pulse'
                : 'bg-emerald-500/20 border border-emerald-500/50 text-emerald-400'
            }`}
          >
            {initialOnField === 'OUT' ? <XCircle className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
            <span>ON-FIELD: {initialOnField}</span>
          </div>

          <span className="text-xs font-mono text-slate-400">
            {appealType === 'CATCH' ? 'Caught Behind Appeal' : 'LBW Stumping Appeal'} · {bowler.name.split(' ')[0]} to {striker.name.split(' ')[0]}
          </span>
        </div>

        {/* 15-Second Countdown & Review Trigger Button */}
        {reviewStage === 'idle' && (
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 text-xs font-mono text-amber-400 font-bold">
              <span className="flex h-2 w-2 rounded-full bg-amber-400 animate-ping" />
              <span>DRS WINDOW: {secondsLeft}S</span>
            </div>

            <button
              onClick={handleStartReview}
              className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-sky-500 to-indigo-500 px-4 py-2 text-xs font-bold text-slate-950 hover:from-sky-400 hover:to-indigo-400 transition-all shadow-lg shadow-sky-500/25 cursor-pointer animate-bounce"
            >
              <Sparkles className="h-3.5 w-3.5 fill-current" />
              <span>REVIEW (DRS)</span>
            </button>
          </div>
        )}
      </div>

      {/* Review Viewport */}
      {isReviewOpen && (
        <div className="rounded-xl border border-slate-800 bg-slate-900/90 p-4 space-y-4 animate-in fade-in zoom-in-95 duration-200">
          {/* Review Options Navigation Tabs */}
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-3">
            <div className="flex items-center gap-1.5 text-xs font-mono">
              {activeAppealType !== 'CATCH' && (
                <button
                  onClick={() => setActiveReviewTab('ball_tracking')}
                  className={`rounded-lg px-3 py-1 font-bold transition-colors cursor-pointer ${
                    activeReviewTab === 'ball_tracking'
                      ? 'bg-sky-500 text-slate-950 shadow-md'
                      : 'bg-slate-950 text-slate-300 hover:text-white'
                  }`}
                >
                  1. Ball Tracking
                </button>
              )}

              <button
                onClick={() => setActiveReviewTab('ultra_edge')}
                className={`rounded-lg px-3 py-1 font-bold transition-colors cursor-pointer ${
                  activeReviewTab === 'ultra_edge'
                    ? 'bg-sky-500 text-slate-950 shadow-md'
                    : 'bg-slate-950 text-slate-300 hover:text-white'
                }`}
              >
                {activeAppealType === 'CATCH' ? '1. UltraEdge Snicko (Bat Check)' : '2. UltraEdge Snicko'}
              </button>

              {activeAppealType !== 'CATCH' && (
                <button
                  onClick={() => setActiveReviewTab('wicket_impact')}
                  className={`rounded-lg px-3 py-1 font-bold transition-colors cursor-pointer ${
                    activeReviewTab === 'wicket_impact'
                      ? 'bg-sky-500 text-slate-950 shadow-md'
                      : 'bg-slate-950 text-slate-300 hover:text-white'
                  }`}
                >
                  3. Wicket Impact
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono text-slate-500">APPEAL TYPE:</span>
              <button
                onClick={() => {
                  setSelectedDismissalOverride('LBW');
                  setActiveReviewTab('ball_tracking');
                  cricketAudio.playDrsTone();
                }}
                className={`rounded px-2 py-0.5 text-[10px] font-mono cursor-pointer ${
                  activeAppealType === 'LBW' ? 'bg-indigo-500 text-white font-bold' : 'bg-slate-900 text-slate-400 hover:text-white'
                }`}
              >
                LBW
              </button>
              <button
                onClick={() => {
                  setSelectedDismissalOverride('CATCH');
                  setActiveReviewTab('ultra_edge');
                  cricketAudio.playDrsTone();
                }}
                className={`rounded px-2 py-0.5 text-[10px] font-mono cursor-pointer ${
                  activeAppealType === 'CATCH' ? 'bg-indigo-500 text-white font-bold' : 'bg-slate-900 text-slate-400 hover:text-white'
                }`}
              >
                CATCH
              </button>

              <button
                onClick={() => setIsModalMode(!isModalMode)}
                className="ml-2 rounded px-2 py-0.5 text-[10px] font-mono bg-sky-500/10 border border-sky-500/30 text-sky-400 hover:bg-sky-500/20 cursor-pointer"
              >
                {isModalMode ? 'Inline View' : 'Fullscreen Broadcast'}
              </button>
            </div>
          </div>

          {/* Interactive Screen based on active review tab */}
          <div className="relative rounded-xl border border-slate-800 bg-slate-950 p-5 min-h-[180px] flex flex-col items-center justify-center overflow-hidden">
            {/* OPTION 1: Ball Tracking */}
            {activeReviewTab === 'ball_tracking' && (
              <div className="w-full animate-in fade-in duration-200">
                <DrsFieldTelemetryView
                  appealType="LBW"
                  strikerName={striker.name}
                  bowlerName={bowler.name}
                  isOut={ballTrackingHitting}
                  ballEvent={ballEvent}
                  deliverySpeed={ballEvent.speedKmh || 142.0}
                  deliveryType={ballEvent.deliveryType || 'Good Length Seamer'}
                />
              </div>
            )}

            {/* OPTION 2: UltraEdge */}
            {activeReviewTab === 'ultra_edge' && (
              <div className="w-full animate-in fade-in duration-200">
                <BroadcastUltraEdgeCanvas
                  isEdge={ultraEdgeSpikeActive}
                  strikerName={striker.name}
                  bowlerName={bowler.name}
                  appealType={activeAppealType}
                />
              </div>
            )}

            {/* OPTION 3: Wicket Impact */}
            {activeReviewTab === 'wicket_impact' && (
              <div className="w-full animate-in fade-in duration-200">
                <BroadcastBallTrackingCanvas
                  isOut={ballTrackingHitting}
                  strikerName={striker.name}
                  bowlerName={bowler.name}
                  delivery={{
                    speedKmh: ballEvent.speedKmh || 142.0,
                    wicketsOutcome: ballTrackingHitting ? 'HITTING' : 'MISSING (OFF)',
                    isOut: ballTrackingHitting,
                  }}
                />
              </div>
            )}
          </div>

          {/* Verdict Banner & Cinematic Animation */}
          {verdictResult && (
            <div className="rounded-xl border border-sky-500/40 bg-slate-950 p-4 text-center space-y-3 animate-in zoom-in-95 duration-300">
              <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest block">
                THIRD UMPIRE OFFICIAL PROTOCOL
              </span>

              <div
                className={`inline-block rounded-2xl px-6 py-3 border-2 font-black tracking-widest text-2xl sm:text-3xl shadow-xl ${
                  verdictResult === 'OUT'
                    ? 'border-rose-500 bg-rose-500/20 text-rose-400 shadow-rose-500/30'
                    : verdictResult === 'NOT OUT'
                    ? 'border-emerald-500 bg-emerald-500/20 text-emerald-400 shadow-emerald-500/30'
                    : 'border-amber-500 bg-amber-500/20 text-amber-400 shadow-amber-500/30'
                }`}
              >
                {verdictResult}
              </div>

              {/* Cinematic Reversal / Confirmation announcement */}
              {bannerText && (
                <div
                  className={`py-1.5 px-4 rounded-xl text-xs font-mono font-black uppercase tracking-wider animate-in fade-in duration-300 ${
                    bannerText === 'DECISION REVERSED'
                      ? 'bg-amber-500 text-slate-950 shadow-md'
                      : 'bg-sky-500 text-slate-950 shadow-md'
                  }`}
                >
                  ⚡ {bannerText}
                </div>
              )}

              <div className="pt-2">
                <button
                  onClick={handleApplyResult}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-sky-500 px-6 py-2.5 text-xs font-bold text-slate-950 hover:bg-sky-400 transition-colors shadow-lg shadow-sky-500/20 cursor-pointer"
                >
                  <span>Apply Decision & Resume Game</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}
      </div>
    </div>
  );
};
