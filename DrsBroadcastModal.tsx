import React, { useState, useEffect, useRef } from 'react';
import { audioManager } from '../../services/AudioManager';
import { CheckCircle2, XCircle, Sparkles, AlertCircle, X, Play, Radio, Volume2, ChevronRight, Activity } from 'lucide-react';
import { DrsFieldTelemetryView } from './DrsFieldTelemetryView';
import { BroadcastUltraEdgeCanvas } from './BroadcastUltraEdgeCanvas';
import { BroadcastBallTrackingCanvas } from './BroadcastBallTrackingCanvas';
import { DrsBallTrackingOutcome } from '../../types/cricket';

interface DrsBroadcastModalProps {
  isOpen: boolean;
  onClose: () => void;
  strikerName: string;
  bowlerName: string;
  initialUmpireCall?: 'OUT' | 'NOT OUT';
  appealType?: 'LBW' | 'CAUGHT BEHIND' | 'CAUGHT';
  forcedOutcome?: 'OUT' | 'NOT OUT';
  ballTrackingOutcome?: DrsBallTrackingOutcome | null;
  onVerdictApplied?: (result: {
    finalVerdict: 'OUT' | 'NOT OUT';
    wasReversed: boolean;
    wicketDelta: number;
    explanation: string;
    ballTrackingOutcome?: DrsBallTrackingOutcome;
  }) => void;
}

export const DrsBroadcastModal: React.FC<DrsBroadcastModalProps> = ({
  isOpen,
  onClose,
  strikerName,
  bowlerName,
  initialUmpireCall = 'OUT',
  appealType = 'LBW',
  forcedOutcome,
  ballTrackingOutcome,
  onVerdictApplied,
}) => {
  const effectiveAppealType = ballTrackingOutcome?.appealType || appealType;
  const isCaughtAppeal = effectiveAppealType === 'CAUGHT BEHIND' || effectiveAppealType === 'CAUGHT';
  const showBallTrackingStep = !isCaughtAppeal || Boolean(ballTrackingOutcome);

  const [step, setStep] = useState<number>(0);

  // Derive verdict directly from simulated ball-tracking outcome when provided
  const resolvedOut = ballTrackingOutcome
    ? ballTrackingOutcome.finalVerdict === 'OUT'
    : forcedOutcome
    ? forcedOutcome === 'OUT'
    : initialUmpireCall === 'OUT';

  const ultraEdgeSpike = ballTrackingOutcome
    ? ballTrackingOutcome.ultraEdge === 'SPIKE DETECTED (EDGE)'
    : isCaughtAppeal
    ? resolvedOut
    : false;

  const isHittingStumps = ballTrackingOutcome
    ? ballTrackingOutcome.finalVerdict === 'OUT'
    : resolvedOut;

  const [umpireSubtitle, setUmpireSubtitle] = useState<string>('');
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);
  const verdictDispatchedRef = useRef<boolean>(false);

  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const stepSpeechActiveRef = useRef<number>(-1);

  const clearPendingTimeout = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  };

  // Robust step voice executor: waits for voice to finish speaking before advancing frame
  const runStepVoice = (phrase: string, onSpeechFinished: () => void) => {
    clearPendingTimeout();
    setUmpireSubtitle(phrase);
    setIsSpeaking(true);

    let completed = false;
    const finishStep = () => {
      if (completed) return;
      completed = true;
      clearPendingTimeout();
      setIsSpeaking(false);
      onSpeechFinished();
    };

    // Calculate natural fallback if speech synthesis is disabled or muted
    const words = phrase.split(/\s+/).filter(Boolean).length;
    const safetyDurationMs = Math.min(12000, Math.max(3800, words * 450 + 1200));

    timeoutRef.current = setTimeout(() => {
      finishStep();
    }, safetyDurationMs);

    audioManager.playDrsRadioComms(phrase, () => {
      // Small 650ms broadcast breathing room after umpire finishes speaking sentence
      timeoutRef.current = setTimeout(() => {
        finishStep();
      }, 650);
    });
  };

  // Helper to transition with audio sync
  const playStepWithVoiceSync = (currentStep: number) => {
    if (stepSpeechActiveRef.current === currentStep) return;
    stepSpeechActiveRef.current = currentStep;

    // STEP 0: Front foot check
    if (currentStep === 0) {
      const phrase = isCaughtAppeal
        ? `Third umpire to director: Checking front foot for ${strikerName}. Behind the line, fair delivery. Proceeding to UltraEdge.`
        : `Third umpire to director: Checking front foot for ${strikerName}. Fair delivery, behind the line. Let's check UltraEdge.`;

      runStepVoice(phrase, () => {
        setStep(1);
      });
    }

    // STEP 1: UltraEdge
    else if (currentStep === 1) {
      audioManager.playDrsUltraEdgeSpike(ultraEdgeSpike);

      let phrase = '';
      if (isCaughtAppeal) {
        if (ultraEdgeSpike) {
          phrase = `Director, roll through UltraEdge. Clear spike on the waveform as the ball passes the outside edge. Confirming trajectory on ball tracking.`;
        } else {
          phrase = `Director, rolling UltraEdge. Flat line as ball passes the bat, no edge detected. Verifying pad projection on Hawk-Eye ball tracking.`;
        }
      } else {
        phrase = `Checking UltraEdge for any inside edge. Flat line through, no bat involved. Taking you to Hawk-Eye ball tracking.`;
      }

      runStepVoice(phrase, () => {
        setStep(2);
      });
    }

    // STEP 2: Hawk-Eye Ball Tracking OR Final Decision (if Caught without tracking)
    else if (currentStep === 2) {
      if (!showBallTrackingStep) {
        triggerFinalDecision(ultraEdgeSpike);
      } else {
        audioManager.playDrsBallTrackingRadar();
        const phrase = ballTrackingOutcome
          ? `Hawk-Eye ball tracking locked: Pitching ${ballTrackingOutcome.pitching.toLowerCase()}, impact ${ballTrackingOutcome.impact.toLowerCase()}, wickets ${ballTrackingOutcome.wickets.toLowerCase()}. Ready for big screen verdict.`
          : isHittingStumps
          ? `Hawk-Eye tracking locked: Pitching in line, impact in line, wickets hitting middle stump. Stay with your original on-field call.`
          : `Hawk-Eye tracking locked: Pitching in line, impact in line, but wickets missing stumps. Overturning the on-field decision.`;

        runStepVoice(phrase, () => {
          setStep(3);
        });
      }
    }

    // STEP 3: Final Decision
    else if (currentStep === 3) {
      triggerFinalDecision(isCaughtAppeal && !ballTrackingOutcome ? ultraEdgeSpike : isHittingStumps);
    }
  };

  const triggerFinalDecision = (finalOutStatus: boolean) => {
    audioManager.playDrsDecisionReveal(finalOutStatus);
    const phrase = finalOutStatus
      ? `My final decision is OUT. Please signal OUT on the big screen now.`
      : `My decision is NOT OUT. Please signal NOT OUT on the big screen now.`;

    runStepVoice(phrase, () => {
      // Decision screen stays up until user clicks "Return to Match"
    });
  };

  useEffect(() => {
    if (!isOpen) {
      setStep(0);
      stepSpeechActiveRef.current = -1;
      verdictDispatchedRef.current = false;
      setUmpireSubtitle('');
      setIsSpeaking(false);
      clearPendingTimeout();
      audioManager.setDrsReviewActive(false);
      audioManager.stopDrsHeartbeatLoop();
      return;
    }

    // Lock DRS Audio & Heartbeat
    verdictDispatchedRef.current = false;
    audioManager.setDrsReviewActive(true);
    audioManager.startDrsHeartbeatLoop();
    setStep(0);
    stepSpeechActiveRef.current = -1;
    playStepWithVoiceSync(0);

    return () => {
      clearPendingTimeout();
      audioManager.setDrsReviewActive(false);
      audioManager.stopDrsHeartbeatLoop();
    };
  }, [isOpen]);

  // When step changes, run voice sync for that step
  useEffect(() => {
    if (isOpen && step > 0) {
      playStepWithVoiceSync(step);
    }
  }, [step, isOpen]);

  const handleReturnToMatch = () => {
    const finalOut = isCaughtAppeal && !ballTrackingOutcome ? ultraEdgeSpike : isHittingStumps;
    const finalVerdict = finalOut ? 'OUT' : 'NOT OUT';
    const wasReversed = initialUmpireCall !== finalVerdict;
    let wicketDelta = 0;

    if (initialUmpireCall === 'OUT' && finalVerdict === 'NOT OUT') {
      wicketDelta = -1;
    } else if (initialUmpireCall === 'NOT OUT' && finalVerdict === 'OUT') {
      wicketDelta = +1;
    }

    if (onVerdictApplied && !verdictDispatchedRef.current) {
      verdictDispatchedRef.current = true;
      onVerdictApplied({
        finalVerdict,
        wasReversed,
        wicketDelta,
        explanation:
          ballTrackingOutcome?.summaryText ||
          `${effectiveAppealType} review verdict: ${finalVerdict}. ${
            wasReversed ? 'Original on-field decision overturned.' : 'On-field decision confirmed.'
          }`,
        ballTrackingOutcome: ballTrackingOutcome || undefined,
      });
    }

    onClose();
  };

  if (!isOpen) return null;

  const finalStepIndex = showBallTrackingStep ? 3 : 2;
  const isFinalDecisionStep = step === finalStepIndex;
  const isFinalOut = isCaughtAppeal && !ballTrackingOutcome ? ultraEdgeSpike : isHittingStumps;

  const mappedWicketsOutcome: 'HITTING' | 'MISSING (OFF)' | 'MISSING (HEIGHT)' | 'CLIPPING BAIL' =
    ballTrackingOutcome
      ? ballTrackingOutcome.wickets === 'HITTING'
        ? 'HITTING'
        : ballTrackingOutcome.wickets === "UMPIRE'S CALL"
        ? 'CLIPPING BAIL'
        : ballTrackingOutcome.wickets === 'MISSING (HEIGHT)'
        ? 'MISSING (HEIGHT)'
        : 'MISSING (OFF)'
      : isHittingStumps
      ? 'HITTING'
      : 'MISSING (OFF)';

  // Manual step advance for user control
  const handleNextStep = () => {
    clearPendingTimeout();
    setIsSpeaking(false);
    if (!isFinalDecisionStep) {
      setStep((prev) => prev + 1);
    }
  };

  const handleSkipToDecision = () => {
    clearPendingTimeout();
    setIsSpeaking(false);
    setStep(finalStepIndex);
  };

  // Step labels array
  const stepLabels = showBallTrackingStep
    ? ['1. NO-BALL CHECK', '2. ULTRAEDGE (BAT)', '3. HAWK-EYE TRACKING', '4. FINAL DECISION']
    : ['1. NO-BALL CHECK', '2. ULTRAEDGE (BAT)', '3. FINAL DECISION'];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-3 sm:p-4 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-3xl rounded-3xl border border-sky-500/50 bg-[#070e20] p-5 sm:p-7 shadow-[0_0_50px_rgba(14,165,233,0.3)] space-y-5 overflow-hidden">
        {/* Top Watermark & Live Radio Indicator */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <span className="flex h-2.5 w-2.5 rounded-full bg-rose-500 animate-ping" />
            <span className="text-xs font-mono font-bold text-sky-400 tracking-wider">
              ICC DRS BROADCAST FEED · THIRD UMPIRE REVIEW
            </span>
          </div>

          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-800 bg-slate-900 text-slate-400 hover:text-white transition-colors cursor-pointer"
            title="Close DRS Review"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Header Matchup & Step Breadcrumbs */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="rounded-md bg-amber-500/20 border border-amber-500/40 px-2 py-0.5 text-[10px] font-mono font-bold text-amber-400 uppercase">
                {effectiveAppealType} APPEAL
              </span>
              <h3 className="text-lg sm:text-xl font-black text-white tracking-tight">
                REVIEW: {strikerName.toUpperCase()}
              </h3>
            </div>
            <p className="text-xs text-slate-400 font-mono mt-0.5">
              Bowler: <strong className="text-white">{bowlerName}</strong> · On-Field Call:{' '}
              <strong className={initialUmpireCall === 'OUT' ? 'text-rose-400' : 'text-emerald-400'}>
                {initialUmpireCall}
              </strong>
              {ballTrackingOutcome && (
                <>
                  {' '}· Speed: <strong className="text-cyan-300 tabular-nums">{ballTrackingOutcome.speedKmh} km/h</strong>
                </>
              )}
            </p>
          </div>

          {/* Stepper pills */}
          <div className="flex flex-wrap items-center gap-1.5 text-[11px] font-mono">
            {stepLabels.map((label, idx) => (
              <span
                key={idx}
                className={`rounded-lg px-2.5 py-1 transition-all ${
                  step === idx
                    ? 'bg-sky-500 text-slate-950 font-black shadow-md shadow-sky-500/30'
                    : step > idx
                    ? 'bg-emerald-950/80 border border-emerald-500/40 text-emerald-300'
                    : 'text-slate-500 bg-slate-900 border border-slate-800'
                }`}
              >
                {label}
              </span>
            ))}
          </div>
        </div>

        {/* Central Visual Broadcast Screen */}
        <div className="relative rounded-2xl border border-slate-800/90 bg-gradient-to-b from-slate-900/90 to-slate-950 p-6 min-h-[260px] flex flex-col justify-center items-center shadow-inner overflow-hidden">
          {/* STEP 0: Front foot check */}
          {step === 0 && (
            <div className="text-center space-y-3 animate-in fade-in duration-300 w-full">
              <span className="text-xs font-mono font-bold tracking-wider text-slate-400 uppercase block">
                CHECKING POPPING CREASE · FRONT FOOT NO-BALL
              </span>

              <div className="relative mx-auto h-28 w-80 rounded-xl border border-emerald-500/40 bg-slate-900/90 flex items-center justify-center overflow-hidden shadow-md">
                {/* Crease line */}
                <div className="absolute left-1/3 top-0 bottom-0 w-1.5 bg-white shadow-lg shadow-white/50" />
                {/* Bowling boot behind line */}
                <div className="h-10 w-24 rounded-lg bg-gradient-to-r from-slate-700 to-slate-600 border border-slate-400 ml-6 flex items-center justify-center text-[10px] font-mono font-bold text-slate-200">
                  BOOT
                </div>
                <span className="absolute bottom-1 right-2 text-[10px] font-mono font-bold text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-500/40 tabular-nums">
                  BEHIND LINE: 5.2 CM
                </span>
              </div>

              <p className="text-sm font-bold text-emerald-400 font-mono">
                ✓ FAIR DELIVERY CONFIRMED · FRONT FOOT CLEAR
              </p>
            </div>
          )}

          {/* STEP 1: UltraEdge Snickometer Canvas */}
          {step === 1 && (
            <div className="w-full space-y-4 animate-in fade-in duration-300">
              <BroadcastUltraEdgeCanvas
                isEdge={ultraEdgeSpike}
                strikerName={strikerName}
                bowlerName={bowlerName}
                appealType={effectiveAppealType}
              />
              <p className="text-sm font-bold font-mono text-center">
                {ultraEdgeSpike ? (
                  <span className="text-rose-400">
                    ⚠ SHARP SPIKE CONFIRMED · BAT ON BALL · PROCEEDING TO TRAJECTORY VERIFICATION
                  </span>
                ) : (
                  <span className="text-emerald-400">
                    ✓ FLATLINE ACROSS IMPACT · NO BAT CONTACT · PROCEEDING TO HAWK-EYE BALL TRACKING
                  </span>
                )}
              </p>
            </div>
          )}

          {/* STEP 2: Hawk-Eye Ball Tracking Canvas */}
          {showBallTrackingStep && step === 2 && (
            <div className="w-full space-y-3 animate-in fade-in duration-300">
              <BroadcastBallTrackingCanvas
                isOut={isHittingStumps}
                strikerName={strikerName}
                bowlerName={bowlerName}
                delivery={{
                  speedKmh: ballTrackingOutcome?.speedKmh || 142.4,
                  pitchX: ballTrackingOutcome?.pitchX ?? 202,
                  pitchY: ballTrackingOutcome?.pitchY ?? 158,
                  impactX: ballTrackingOutcome?.impactX ?? 199,
                  impactY: ballTrackingOutcome?.impactY ?? 92,
                  targetStumpX: ballTrackingOutcome?.targetStumpX ?? (isHittingStumps ? 200 : 224),
                  bounceHeightMeters: ballTrackingOutcome
                    ? Number((ballTrackingOutcome.bounceHeightCm / 100).toFixed(2))
                    : 0.62,
                  seamDeviation: ballTrackingOutcome?.seamDeviationDeg ?? -1.8,
                  pitchingLine: ballTrackingOutcome?.pitching || 'IN LINE',
                  impactLine: ballTrackingOutcome?.impact === 'OUTSIDE OFF' ? 'OUTSIDE OFF' : 'IN LINE',
                  wicketsOutcome: mappedWicketsOutcome,
                  isOut: isHittingStumps,
                }}
              />
            </div>
          )}

          {/* FINAL DECISION STAGE */}
          {isFinalDecisionStep && (
            <div className="text-center space-y-4 animate-in zoom-in-95 duration-400 w-full">
              <span className="text-xs font-mono font-bold text-slate-400 tracking-wider uppercase block">
                THIRD UMPIRE FINAL VERDICT ON BIG SCREEN
              </span>

              <div
                className={`inline-block rounded-3xl px-10 py-6 border-2 shadow-2xl ${
                  isFinalOut
                    ? ballTrackingOutcome?.isUmpiresCall
                      ? 'border-amber-400 bg-amber-500/20 text-amber-300 shadow-amber-500/40'
                      : 'border-rose-500 bg-rose-500/20 text-rose-400 shadow-rose-500/50'
                    : 'border-emerald-500 bg-emerald-500/20 text-emerald-400 shadow-emerald-500/50'
                }`}
              >
                <span className="text-5xl sm:text-6xl font-black tracking-widest block font-mono">
                  {isFinalOut ? 'OUT' : 'NOT OUT'}
                </span>
                <span className="text-xs font-mono font-bold tracking-wider mt-2 block">
                  {ballTrackingOutcome
                    ? `DECISION ${ballTrackingOutcome.decision}${
                        ballTrackingOutcome.isUmpiresCall ? " · UMPIRE'S CALL (REVIEW RETAINED)" : ''
                      } · WICKETS: ${ballTrackingOutcome.wickets}`
                    : isFinalOut
                    ? isCaughtAppeal
                      ? 'CAUGHT DISMISSAL CONFIRMED (ULTRAEDGE SPIKE)'
                      : 'LBW CONFIRMED (THREE REDS · HAWK-EYE HITTING)'
                    : isCaughtAppeal
                    ? 'DECISION OVERTURNED (FLATLINE · NO BAT)'
                    : 'DECISION OVERTURNED (BALL MISSING STUMPS)'}
                </span>
              </div>

              {ballTrackingOutcome && (
                <div className="grid grid-cols-3 gap-2 max-w-md mx-auto text-[10px] font-mono">
                  <div className="rounded-xl bg-slate-900/90 border border-slate-800 px-2.5 py-1.5">
                    <span className="text-slate-500 block">PITCHING</span>
                    <strong className="text-cyan-300">{ballTrackingOutcome.pitching}</strong>
                  </div>
                  <div className="rounded-xl bg-slate-900/90 border border-slate-800 px-2.5 py-1.5">
                    <span className="text-slate-500 block">IMPACT</span>
                    <strong
                      className={
                        ballTrackingOutcome.impact === "UMPIRE'S CALL" ? 'text-amber-300' : 'text-cyan-300'
                      }
                    >
                      {ballTrackingOutcome.impact}
                    </strong>
                  </div>
                  <div className="rounded-xl bg-slate-900/90 border border-slate-800 px-2.5 py-1.5">
                    <span className="text-slate-500 block">WICKETS</span>
                    <strong
                      className={
                        ballTrackingOutcome.decision === 'OVERTURNED'
                          ? 'text-emerald-400'
                          : ballTrackingOutcome.isUmpiresCall
                          ? 'text-amber-300'
                          : 'text-rose-400'
                      }
                    >
                      {ballTrackingOutcome.wickets}
                    </strong>
                  </div>
                </div>
              )}

              <p className="text-xs text-slate-300 font-mono max-w-lg mx-auto">
                {ballTrackingOutcome
                  ? ballTrackingOutcome.summaryText
                  : isFinalOut
                  ? 'All ICC review criteria satisfied. Original on-field dismissal stands.'
                  : 'Insufficient contact or ball missing wickets. Original decision overturned.'}
              </p>
            </div>
          )}
        </div>

        {/* Live TV Umpire Subtitle & Voice Bar */}
        <div className="rounded-xl border border-sky-500/30 bg-sky-950/30 px-4 py-2.5 flex items-center gap-3 text-xs font-mono text-sky-200 shadow-inner">
          <div className="flex items-center gap-1.5 shrink-0 text-sky-400 font-bold">
            <Radio className={`h-4 w-4 ${isSpeaking ? 'animate-pulse text-rose-400' : ''}`} />
            <span>3RD UMPIRE:</span>
          </div>
          <span className="truncate italic">{umpireSubtitle || 'Connecting audio broadcast comms...'}</span>
        </div>

        {/* Footer controls & Skip actions */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
          <div className="text-[11px] text-slate-500 font-mono">
            {showBallTrackingStep
              ? 'PROTOCOL: FRONT FOOT · ULTRAEDGE · HAWK-EYE 3D BALL TRACKING'
              : 'PROTOCOL: FRONT FOOT & ULTRAEDGE SNICKOMETER'}
          </div>

          <div className="flex items-center gap-2">
            {!isFinalDecisionStep && (
              <>
                <button
                  onClick={handleNextStep}
                  className="rounded-xl border border-slate-700 bg-slate-900 px-3.5 py-1.5 text-xs font-bold text-slate-300 hover:text-white hover:border-slate-600 transition-colors cursor-pointer flex items-center gap-1"
                >
                  <span>Next Frame</span>
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>

                <button
                  onClick={handleSkipToDecision}
                  className="rounded-xl border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs font-bold text-slate-400 hover:text-white transition-colors cursor-pointer"
                >
                  Skip to Verdict
                </button>
              </>
            )}

            <button
              onClick={handleReturnToMatch}
              className="rounded-xl bg-gradient-to-r from-sky-500 to-cyan-400 px-5 py-2 text-xs font-black text-slate-950 hover:from-sky-400 hover:to-cyan-300 shadow-md transition-all cursor-pointer"
            >
              Return To Match
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
