import React, { useMemo, useState } from 'react';
import { BallEvent, Player, Team } from '../../types/cricket';
import {
  ComputedInningsScorecard,
  getBowlingAttackPool,
} from '../../engine/matchScoreboardEngine';
import { useOptionalMatchSimulator } from '../../context/MatchSimulatorContext';
import { CountryFlag, PlayerCardAvatar, TeamCrest, TeamFlag } from '../common/CricketIdentity';
import { cricketAudio } from '../../utils/audioSystem';
import { BowlerSelectorModal } from './BowlerSelectorModal';
import {
  Activity,
  BarChart3,
  ClipboardList,
  Gauge,
  Layers,
  Radio,
  Trophy,
  Zap,
} from 'lucide-react';

export interface LiveBroadcastScoreboardProps {
  activeScorecard?: ComputedInningsScorecard;
  innings1Scorecard?: ComputedInningsScorecard;
  innings2Scorecard?: ComputedInningsScorecard;
  superOver1Scorecard?: ComputedInningsScorecard | null;
  superOver2Scorecard?: ComputedInningsScorecard | null;
  selectedInningsTab?: 1 | 2 | 3 | 4;
  liveInningsNumber?: 1 | 2 | 3 | 4;
  onSelectInningsTab?: (inn: 1 | 2 | 3 | 4) => void;
  activeMainTab?: 'arena' | 'scorecard' | 'overs' | 'analysis';
  onChangeMainTab?: (tab: 'arena' | 'scorecard' | 'overs' | 'analysis') => void;
  tossSummary?: string | null;
  venueLabel?: string;
  lastBall?: BallEvent | null;
  matchResultBanner?: {
    headline: string;
    subtext: string;
    winnerTeam?: Team | null;
    isTied?: boolean;
  } | null;
  bowlingXI?: Player[];
  previousOverBowlerId?: string | null;
  onSelectBowler?: (bowlerId: string) => void;
  onInspectPlayer?: (player: Player) => void;
  onStartSecondInnings?: () => void;
  onQuickFinishFirstInnings?: () => void;
  onStartSuperOver?: () => void;
}

export function getDeliveryChipStyle(ball: BallEvent): {
  label: string;
  chipClass: string;
  tooltip: string;
  isHighlight: 'SIX' | 'FOUR' | 'WICKET' | 'EXTRA' | null;
} {
  const token =
    ball.displayToken ||
    (ball.isWicket
      ? 'W'
      : ball.outcome === 'WD'
      ? 'WD'
      : ball.outcome === 'NB'
      ? 'NB'
      : ball.runsScored === 0
      ? '•'
      : String(ball.runsScored));

  const overTag = `${ball.overNumber}.${ball.ballInOver}`;

  if (ball.isWicket) {
    return {
      label: 'W',
      chipClass:
        'bg-rose-600 text-white border-rose-300 font-bold shadow-[0_0_12px_rgba(225,29,72,0.55)]',
      tooltip: `${overTag} · Wicket (${ball.wicketType || 'Out'}) — ${ball.dismissedPlayer?.name || ball.batter?.name}`,
      isHighlight: 'WICKET',
    };
  }

  if (ball.drsReviewResult === 'OVERTURNED') {
    return {
      label: token,
      chipClass:
        'bg-emerald-500/25 text-emerald-200 border-emerald-400 font-bold ring-1 ring-emerald-400/50',
      tooltip: `${overTag} · DRS Overturned (Not Out)`,
      isHighlight: null,
    };
  }

  if (ball.extraType === 'noBall' || ball.outcome === 'NB') {
    return {
      label: token,
      chipClass:
        'bg-amber-500/25 text-amber-200 border-amber-400 font-bold px-1.5',
      tooltip: `${overTag} · No-Ball (${ball.runsScored} total runs) — Free Hit triggered`,
      isHighlight: 'EXTRA',
    };
  }

  if (ball.extraType === 'wide' || ball.outcome === 'WD') {
    return {
      label: token,
      chipClass: 'bg-amber-500/20 text-amber-300 border-amber-500/60 font-bold px-1.5',
      tooltip: `${overTag} · Wide (${ball.extraRuns || 1} extra run${(ball.extraRuns || 1) > 1 ? 's' : ''})`,
      isHighlight: 'EXTRA',
    };
  }

  if (
    ball.extraType === 'bye' ||
    ball.extraType === 'legBye' ||
    ball.outcome === 'B' ||
    ball.outcome === 'LB'
  ) {
    return {
      label: token,
      chipClass: 'bg-teal-500/20 text-teal-200 border-teal-400/50 font-bold px-1.5',
      tooltip: `${overTag} · ${ball.extraType === 'bye' ? 'Byes' : 'Leg-Byes'} (${ball.extraRuns || ball.runsScored})`,
      isHighlight: 'EXTRA',
    };
  }

  const batRuns = ball.batterRuns ?? ball.runsScored;
  if (batRuns === 6) {
    return {
      label: '6',
      chipClass:
        'bg-violet-600 text-white border-violet-300 font-bold shadow-[0_0_12px_rgba(139,92,246,0.55)]',
      tooltip: `${overTag} · Six by ${ball.batter?.name} (${ball.speedKmh} km/h)`,
      isHighlight: 'SIX',
    };
  }

  if (batRuns === 4) {
    return {
      label: '4',
      chipClass:
        'bg-emerald-500 text-slate-950 border-emerald-200 font-bold shadow-[0_0_10px_rgba(16,185,129,0.5)]',
      tooltip: `${overTag} · Four by ${ball.batter?.name} (${ball.speedKmh} km/h)`,
      isHighlight: 'FOUR',
    };
  }

  if (batRuns === 0) {
    return {
      label: '•',
      chipClass: 'bg-slate-900/90 text-slate-400 border-slate-700/90 font-semibold',
      tooltip: `${overTag} · Dot ball (${ball.bowler?.name} to ${ball.batter?.name}, ${ball.speedKmh} km/h)`,
      isHighlight: null,
    };
  }

  return {
    label: String(batRuns),
    chipClass: 'bg-sky-500/20 text-sky-200 border-sky-400/50 font-bold',
    tooltip: `${overTag} · ${batRuns} run${batRuns > 1 ? 's' : ''} by ${ball.batter?.name}`,
    isHighlight: null,
  };
}

export const LiveBroadcastScoreboard: React.FC<LiveBroadcastScoreboardProps> = (props) => {
  const simContext = useOptionalMatchSimulator();
  const [isBowlerModalOpen, setIsBowlerModalOpen] = useState(false);

  const activeScorecard = props.activeScorecard ?? simContext?.activeScorecard;
  const innings1Scorecard = props.innings1Scorecard ?? simContext?.innings1Scorecard;
  const innings2Scorecard = props.innings2Scorecard ?? simContext?.innings2Scorecard;
  const superOver1Scorecard =
    props.superOver1Scorecard !== undefined
      ? props.superOver1Scorecard
      : simContext?.superOver1Scorecard ?? null;
  const superOver2Scorecard =
    props.superOver2Scorecard !== undefined
      ? props.superOver2Scorecard
      : simContext?.superOver2Scorecard ?? null;

  const selectedInningsTab = props.selectedInningsTab ?? simContext?.selectedInningsTab ?? 1;
  const liveInningsNumber = props.liveInningsNumber ?? simContext?.liveInningsNumber ?? 1;
  const activeMainTab = props.activeMainTab ?? simContext?.activeMainTab ?? 'arena';
  const tossSummary =
    props.tossSummary !== undefined ? props.tossSummary : simContext?.tossSummary ?? null;
  const venueLabel = props.venueLabel ?? simContext?.venueLabel ?? '';
  const lastBall = props.lastBall !== undefined ? props.lastBall : simContext?.lastBall ?? null;
  const matchResultBanner =
    props.matchResultBanner !== undefined
      ? props.matchResultBanner
      : simContext?.matchResultBanner ?? null;
  const bowlingXI = props.bowlingXI ?? simContext?.bowlingXI ?? [];
  const previousOverBowlerId =
    props.previousOverBowlerId !== undefined
      ? props.previousOverBowlerId
      : simContext?.previousOverBowlerId ?? null;

  const onSelectInningsTab = props.onSelectInningsTab ?? simContext?.onSelectInningsTab;
  const onChangeMainTab = props.onChangeMainTab ?? simContext?.onChangeMainTab;
  const onSelectBowler = props.onSelectBowler ?? simContext?.onSelectBowler;
  const onInspectPlayer = props.onInspectPlayer ?? simContext?.onInspectPlayer;
  const onStartSecondInnings = props.onStartSecondInnings ?? simContext?.onStartSecondInnings;
  const onQuickFinishFirstInnings =
    props.onQuickFinishFirstInnings ?? simContext?.onQuickFinishFirstInnings;
  const onStartSuperOver = props.onStartSuperOver ?? simContext?.onStartSuperOver;

  if (!activeScorecard || !innings1Scorecard || !innings2Scorecard) {
    return null;
  }

  const {
    battingTeam,
    bowlingTeam,
    runs,
    wickets,
    maxWickets,
    legalBalls,
    maxOvers,
    oversFormatted,
    currentRunRate,
    targetRuns,
    runsRequired,
    ballsRemaining,
    requiredRunRate,
    projectedScore,
    freeHitPending,
    strikerRow,
    nonStrikerRow,
    currentBowlerRow,
    activePartnership,
    fallOfWickets,
    displayOverNumber,
    isDisplayOverComplete,
    currentOverDeliveries,
    lastSixDeliveries,
    extras,
    status,
    isSuperOver,
    inningsNumber,
  } = activeScorecard;

  const isViewingLiveInnings = selectedInningsTab === liveInningsNumber;
  const isMatchActive = simContext?.isMatchActive ?? true;
  const isPlaying = simContext?.isPlaying ?? false;
  const parTarget = simContext?.parTarget ?? 185;
  const winProbability = Math.min(
    99,
    Math.max(1, Math.round(simContext?.winProbability ?? 50))
  );

  const contextTarget =
    props.activeScorecard === undefined ? simContext?.target ?? null : null;

  // Authoritative chase target when batting 2nd (or target set once 1st innings completes)
  const chaseTarget =
    targetRuns && targetRuns > 0
      ? targetRuns
      : contextTarget && contextTarget > 0 && inningsNumber >= 2
      ? contextTarget
      : inningsNumber === 2 && innings1Scorecard.status === 'completed'
      ? innings1Scorecard.runs + 1
      : inningsNumber === 4 && superOver1Scorecard?.status === 'completed'
      ? superOver1Scorecard.runs + 1
      : null;

  const overZeroIdx = Math.floor(legalBalls / 6);
  const phaseLabel = isSuperOver
    ? 'Super Over Decider'
    : overZeroIdx < 6
    ? 'Powerplay · Overs 1–6'
    : overZeroIdx < 15
    ? 'Middle Overs · 7–15'
    : 'Death Overs · 16–20';

  const inningsTitleLabel =
    inningsNumber === 1
      ? '1st Innings'
      : inningsNumber === 2
      ? '2nd Innings Chase'
      : inningsNumber === 3
      ? 'Super Over · 1st Bat'
      : 'Super Over · Chase';

  const totalScheduledBalls = Math.max(1, maxOvers * 6);
  const oversProgressPct = Math.min(100, Math.round((legalBalls / totalScheduledBalls) * 100));
  const chaseProgressPct =
    chaseTarget && chaseTarget > 0
      ? Math.min(100, Math.round((runs / chaseTarget) * 100))
      : oversProgressPct;

  const isStartOfNewOver =
    status === 'live' &&
    legalBalls > 0 &&
    legalBalls % 6 === 0 &&
    legalBalls < maxOvers * 6 &&
    (!currentOverDeliveries.length || isDisplayOverComplete);

  const attackBowlerPool = useMemo(() => {
    const source = bowlingXI.length > 0 ? bowlingXI : bowlingTeam.squad;
    return getBowlingAttackPool(source);
  }, [bowlingXI, bowlingTeam.squad]);

  const rotationCandidates = useMemo(() => {
    const maxBallsPerBowler = maxOvers <= 1 ? 6 : Math.ceil(maxOvers / 5) * 6;
    return attackBowlerPool.filter((p) => {
      if (isStartOfNewOver && p.id === previousOverBowlerId) return false;
      const existing = activeScorecard.bowlers.find((b) => b.player.id === p.id);
      return (existing?.legalBalls || 0) < maxBallsPerBowler;
    });
  }, [
    attackBowlerPool,
    maxOvers,
    isStartOfNewOver,
    previousOverBowlerId,
    activeScorecard.bowlers,
  ]);

  // Eligible bowlers for manual captain override at start of new over
  const eligibleNextBowlers = useMemo(() => {
    if (!isStartOfNewOver || !onSelectBowler) return [];
    return rotationCandidates;
  }, [isStartOfNewOver, onSelectBowler, rotationCandidates]);

  // Empty remaining legal-ball placeholders in the current over
  const legalInDisplayedOver = currentOverDeliveries.filter(
    (d) => d.isLegalDelivery ?? (d.outcome !== 'WD' && d.outcome !== 'NB')
  ).length;
  const remainingDotsInOver = isDisplayOverComplete
    ? 0
    : Math.max(0, 6 - legalInDisplayedOver);

  const lastWicket =
    fallOfWickets.length > 0 ? fallOfWickets[fallOfWickets.length - 1] : null;

  // Broadcast highlight flash from latest simulated delivery
  const latestFlash = useMemo(() => {
    if (!lastBall || !isViewingLiveInnings) return null;
    if (lastBall.isWicket) {
      return {
        tag: `Wicket · ${lastBall.wicketType || 'Out'}`,
        detail: `${lastBall.dismissedPlayer?.name || lastBall.batter.name} dismissed (${lastBall.commentary})`,
        tone: 'border-rose-500/40 bg-rose-950/55 text-rose-100',
        accent: 'text-rose-300',
      };
    }
    if ((lastBall.batterRuns ?? lastBall.runsScored) === 6) {
      return {
        tag: 'Maximum Six',
        detail: `${lastBall.batter.name} launches ${lastBall.bowler.name} (${lastBall.speedKmh} km/h ${lastBall.length})`,
        tone: 'border-violet-400/40 bg-violet-950/50 text-violet-100',
        accent: 'text-violet-300',
      };
    }
    if ((lastBall.batterRuns ?? lastBall.runsScored) === 4) {
      return {
        tag: 'Boundary Four',
        detail: `${lastBall.batter.name} pierces the gap off ${lastBall.bowler.name} (${lastBall.speedKmh} km/h)`,
        tone: 'border-emerald-400/40 bg-emerald-950/50 text-emerald-100',
        accent: 'text-emerald-300',
      };
    }
    if (lastBall.extraType === 'noBall') {
      return {
        tag: 'No-Ball · Free Hit',
        detail: `${lastBall.runsScored} run${lastBall.runsScored > 1 ? 's' : ''} added — next legal delivery is a Free Hit`,
        tone: 'border-amber-400/40 bg-amber-950/50 text-amber-100',
        accent: 'text-amber-300',
      };
    }
    return null;
  }, [lastBall, isViewingLiveInnings]);

  const broadcastStatusLabel =
    status === 'completed'
      ? 'Innings Complete'
      : !isMatchActive
      ? 'Pre-Match Preview'
      : isPlaying
      ? 'Live Simulating'
      : 'Simulated Broadcast';

  return (
    <section
      aria-label="Live Broadcast Scoreboard"
      className="relative rounded-2xl border border-slate-800/90 bg-[#050B1A] shadow-2xl overflow-hidden"
    >
      {/* Team-Colored Broadcast Accent Hairline */}
      <div
        className="h-1 w-full"
        style={{
          background: `linear-gradient(90deg, ${battingTeam.primaryColor || '#0284c7'} 0%, ${
            battingTeam.accentColor || '#38bdf8'
          } 52%, ${bowlingTeam.primaryColor || '#f59e0b'} 100%)`,
        }}
      />

      {/* TOP BROADCAST RIBBON: Clean Unboxed Metadata · Innings Selector · View Tabs */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3 px-4 sm:px-6 py-2.5 bg-[#071024] border-b border-slate-800/80 text-xs">
        {/* Left: Clean Typographic Broadcast Metadata (Zero Static Pills) */}
        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-300 min-w-0">
          <span className="inline-flex items-center gap-1.5 font-semibold text-cyan-300 whitespace-nowrap shrink-0">
            <Radio className="h-3.5 w-3.5 text-cyan-400" />
            <span>{broadcastStatusLabel}</span>
          </span>
          <span className="text-slate-600" aria-hidden="true">
            ·
          </span>
          <span className="font-medium text-amber-300 whitespace-nowrap shrink-0">
            {phaseLabel}
          </span>
          {(tossSummary || venueLabel) && (
            <>
              <span className="text-slate-600 hidden sm:inline" aria-hidden="true">
                ·
              </span>
              <span className="text-slate-400 truncate hidden sm:inline">
                {tossSummary || venueLabel}
              </span>
            </>
          )}
          {freeHitPending && status === 'live' && (
            <>
              <span className="text-slate-600" aria-hidden="true">
                ·
              </span>
              <span className="inline-flex items-center gap-1 font-semibold text-amber-300 whitespace-nowrap shrink-0">
                <Zap className="h-3.5 w-3.5 text-amber-400" />
                <span>Free Hit Next Ball</span>
              </span>
            </>
          )}
        </div>

        {/* Right: Interactive Segmented Controls (Innings & View Mode) */}
        <div className="flex flex-wrap items-center justify-between sm:justify-end gap-2">
          {onSelectInningsTab && (
            <div
              role="tablist"
              aria-label="Select Innings"
              className="inline-flex items-center rounded-xl border border-slate-800 bg-slate-950/90 p-0.5 text-[11px]"
            >
              <button
                type="button"
                role="tab"
                aria-selected={selectedInningsTab === 1}
                onClick={() => {
                  cricketAudio.playUiClick();
                  onSelectInningsTab(1);
                }}
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg font-semibold transition-colors cursor-pointer whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 ${
                  selectedInningsTab === 1
                    ? 'bg-cyan-500 text-slate-950 font-bold'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                <span>1st:</span>
                <TeamFlag code={innings1Scorecard.battingTeam.id} size="xs" />
                <span className="font-mono tabular-nums">
                  {innings1Scorecard.runs}/{innings1Scorecard.wickets}
                </span>
              </button>

              <button
                type="button"
                role="tab"
                aria-selected={selectedInningsTab === 2}
                onClick={() => {
                  cricketAudio.playUiClick();
                  onSelectInningsTab(2);
                }}
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg font-semibold transition-colors cursor-pointer whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 ${
                  selectedInningsTab === 2
                    ? 'bg-cyan-500 text-slate-950 font-bold'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                <span>2nd:</span>
                <TeamFlag code={innings2Scorecard.battingTeam.id} size="xs" />
                <span className="font-mono tabular-nums">
                  {innings2Scorecard.status === 'upcoming'
                    ? chaseTarget || innings1Scorecard.status === 'completed'
                      ? `T:${innings1Scorecard.runs + 1}`
                      : 'Yet to Bat'
                    : `${innings2Scorecard.runs}/${innings2Scorecard.wickets}`}
                </span>
              </button>

              {superOver1Scorecard && (
                <button
                  type="button"
                  role="tab"
                  aria-selected={selectedInningsTab >= 3}
                  onClick={() => {
                    cricketAudio.playUiClick();
                    onSelectInningsTab(superOver2Scorecard && liveInningsNumber === 4 ? 4 : 3);
                  }}
                  className={`px-3 py-1 rounded-lg font-semibold transition-colors cursor-pointer whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 ${
                    selectedInningsTab >= 3
                      ? 'bg-amber-400 text-slate-950 font-bold'
                      : 'text-amber-300 hover:text-white'
                  }`}
                >
                  Super Over
                </button>
              )}
            </div>
          )}

          {onChangeMainTab && (
            <div
              role="tablist"
              aria-label="Scoreboard View Mode"
              className="inline-flex items-center rounded-xl border border-slate-800 bg-slate-950/90 p-0.5 text-[11px] font-semibold"
            >
              <button
                type="button"
                role="tab"
                aria-selected={activeMainTab === 'arena'}
                onClick={() => {
                  cricketAudio.playUiClick();
                  onChangeMainTab('arena');
                }}
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg transition-colors cursor-pointer whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 ${
                  activeMainTab === 'arena'
                    ? 'bg-sky-500 text-slate-950 font-bold'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                <Activity className="h-3.5 w-3.5" />
                <span>Live Arena</span>
              </button>

              <button
                type="button"
                role="tab"
                aria-selected={activeMainTab === 'scorecard'}
                onClick={() => {
                  cricketAudio.playUiClick();
                  onChangeMainTab('scorecard');
                }}
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg transition-colors cursor-pointer whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 ${
                  activeMainTab === 'scorecard'
                    ? 'bg-sky-500 text-slate-950 font-bold'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                <ClipboardList className="h-3.5 w-3.5" />
                <span>Scorecard</span>
              </button>

              <button
                type="button"
                role="tab"
                aria-selected={activeMainTab === 'overs'}
                onClick={() => {
                  cricketAudio.playUiClick();
                  onChangeMainTab('overs');
                }}
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg transition-colors cursor-pointer whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 ${
                  activeMainTab === 'overs'
                    ? 'bg-sky-500 text-slate-950 font-bold'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                <Layers className="h-3.5 w-3.5" />
                <span>Overs &amp; Stands</span>
              </button>

              <button
                type="button"
                role="tab"
                aria-selected={activeMainTab === 'analysis'}
                onClick={() => {
                  cricketAudio.playUiClick();
                  onChangeMainTab('analysis');
                }}
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg transition-colors cursor-pointer whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 ${
                  activeMainTab === 'analysis'
                    ? 'bg-sky-500 text-slate-950 font-bold'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                <BarChart3 className="h-3.5 w-3.5" />
                <span>Match Analysis</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* MAIN 3-ZONE TELEVISION SCOREBUG GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-slate-800/85">
        {/* =====================================================================
            ZONE 1 (4 COLS): REAL-TIME RUNS, WICKETS, OVERS & TARGET
            ===================================================================== */}
        <div className="lg:col-span-4 p-4 sm:p-6 flex flex-col justify-between gap-4 bg-gradient-to-br from-[#081530] via-[#060E22] to-[#040917]">
          {/* Team Identity + Primary Runs/Wickets & Overs Readout */}
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-slate-700/70 bg-slate-900/90 p-1.5 shrink-0">
                <TeamCrest teamId={battingTeam.id} size={34} />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 text-xs text-cyan-300 font-medium">
                  <CountryFlag countryCode={battingTeam.id} size="sm" />
                  <span className="truncate">{inningsTitleLabel}</span>
                </div>
                <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight truncate mt-0.5">
                  {battingTeam.name}
                </h2>
              </div>
            </div>

            {/* Real-Time Runs / Wickets + Overs + IPL Target Readout */}
            <div className="text-right shrink-0">
              <div
                aria-live="polite"
                className="flex items-baseline justify-end font-mono text-3xl sm:text-4xl font-black leading-none tabular-nums tracking-tight"
              >
                <span
                  key={`sb-runs-${inningsNumber}-${runs}`}
                  className="inline-block animate-score-flip text-white"
                >
                  {runs}
                </span>
                <span className="text-slate-500 mx-0.5">/</span>
                <span
                  key={`sb-wkts-${inningsNumber}-${wickets}`}
                  className={`inline-block animate-score-flip ${
                    wickets >= 5 ? 'text-rose-400' : 'text-cyan-300'
                  }`}
                >
                  {wickets}
                </span>
              </div>
              <div className="mt-1.5 flex items-center justify-end gap-2 font-mono text-xs font-semibold tabular-nums">
                <span className="text-slate-200">
                  {oversFormatted}{' '}
                  <span className="text-slate-500 font-normal">/ {maxOvers}.0 ov</span>
                </span>
                <span className="text-slate-700" aria-hidden="true">
                  ·
                </span>
                <span className="text-amber-300 font-bold">
                  {chaseTarget && chaseTarget > 0
                    ? `TGT ${chaseTarget}`
                    : status === 'completed'
                    ? `TGT ${runs + 1}`
                    : `PAR ${parTarget}`}
                </span>
              </div>
            </div>
          </div>

          {/* Real-Time Target, Chase Equation & 4-Column Telemetry Strip */}
          <div className="space-y-3 pt-3 border-t border-slate-800/80">
            {/* Dedicated Target & Progress Row */}
            {chaseTarget && chaseTarget > 0 ? (
              <div className="space-y-1.5">
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                  <span className="text-slate-300 font-medium">
                    Target{' '}
                    <strong className="font-mono text-sm text-amber-300 tabular-nums">
                      {chaseTarget}
                    </strong>
                  </span>
                  {runs >= chaseTarget ? (
                    <span className="font-semibold text-emerald-400 tabular-nums">
                      Target Reached ({maxWickets - wickets} wkts in hand)
                    </span>
                  ) : status === 'completed' && runs === chaseTarget - 1 ? (
                    <span className="font-semibold text-amber-300">
                      Scores Level · Match Tied
                    </span>
                  ) : status === 'completed' ? (
                    <span className="font-semibold text-rose-300 tabular-nums">
                      Short by {chaseTarget - 1 - runs} runs
                    </span>
                  ) : (
                    <span className="text-cyan-200 font-medium tabular-nums">
                      Need <strong className="font-mono text-white">{runsRequired}</strong> off{' '}
                      <strong className="font-mono text-white">{ballsRemaining}</strong>b
                    </span>
                  )}
                </div>

                {/* Subtle Chase Progress Hairline */}
                <div className="h-1.5 w-full rounded-full bg-slate-900 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-emerald-400 transition-all duration-300"
                    style={{ width: `${chaseProgressPct}%` }}
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-1.5">
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                  {status === 'completed' ? (
                    <span className="text-slate-300 font-medium">
                      Target Set{' '}
                      <strong className="font-mono text-sm text-amber-300 tabular-nums">
                        {runs + 1}
                      </strong>
                    </span>
                  ) : (
                    <span className="text-slate-300 font-medium">
                      Target Par{' '}
                      <strong className="font-mono text-amber-300 tabular-nums">
                        {parTarget}
                      </strong>{' '}
                      <span className="text-slate-500">·</span> Proj{' '}
                      <strong className="font-mono text-cyan-300 tabular-nums">
                        {projectedScore}
                      </strong>
                    </span>
                  )}
                  <span className="inline-flex items-center gap-1.5 font-mono text-slate-400 tabular-nums">
                    <span>vs</span>
                    <TeamFlag code={bowlingTeam.id} size="xs" />
                    <span>
                      · {legalBalls}/{maxOvers * 6}b
                    </span>
                  </span>
                </div>

                {/* Subtle Innings Overs Progress Hairline */}
                <div className="h-1.5 w-full rounded-full bg-slate-900 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-sky-500 to-cyan-300 transition-all duration-300"
                    style={{ width: `${oversProgressPct}%` }}
                  />
                </div>
              </div>
            )}

            {/* 4-Column Tabular Telemetry Row (Hairline Divided, No Nested Box Clutter) */}
            <div className="grid grid-cols-4 divide-x divide-slate-800/85 pt-2 border-t border-slate-800/70 text-center">
              <div className="pr-2">
                <span className="block text-[11px] text-slate-400">CRR</span>
                <strong className="font-mono text-xs sm:text-sm font-bold text-white tabular-nums">
                  {currentRunRate.toFixed(2)}
                </strong>
              </div>

              <div className="px-2">
                <span className="block text-[11px] text-slate-400">
                  {chaseTarget && chaseTarget > 0 ? 'RRR' : 'Target'}
                </span>
                <strong
                  className={`font-mono text-xs sm:text-sm font-bold tabular-nums ${
                    chaseTarget && chaseTarget > 0
                      ? requiredRunRate > 12
                        ? 'text-rose-400'
                        : 'text-amber-300'
                      : status === 'completed'
                      ? 'text-amber-300'
                      : 'text-cyan-300'
                  }`}
                >
                  {chaseTarget && chaseTarget > 0
                    ? requiredRunRate > 99
                      ? '—'
                      : requiredRunRate.toFixed(2)
                    : status === 'completed'
                    ? runs + 1
                    : projectedScore}
                </strong>
              </div>

              <div className="px-2">
                <span className="block text-[11px] text-slate-400">
                  {chaseTarget && chaseTarget > 0 ? 'Need' : 'Balls Left'}
                </span>
                <strong className="font-mono text-xs sm:text-sm font-bold text-slate-200 tabular-nums">
                  {chaseTarget && chaseTarget > 0 ? runsRequired : ballsRemaining}
                </strong>
              </div>

              <div className="pl-2">
                <span className="block text-[11px] text-slate-400">Extras</span>
                <strong className="font-mono text-xs sm:text-sm font-bold text-amber-300 tabular-nums">
                  {extras.total}
                </strong>
              </div>
            </div>

            {/* Simulated Win Probability Split */}
            {isViewingLiveInnings && (
              <div className="pt-1.5 space-y-1">
                <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono tabular-nums">
                  <span className="inline-flex items-center gap-1.5">
                    <span>Sim Win:</span>
                    <TeamFlag code={battingTeam.id} size="xs" />
                    <strong className="text-cyan-300">{winProbability}%</strong>
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <strong className="text-slate-300">{100 - winProbability}%</strong>
                    <TeamFlag code={bowlingTeam.id} size="xs" />
                  </span>
                </div>
                <div className="flex h-1 w-full overflow-hidden rounded-full bg-slate-800">
                  <div
                    className="h-full bg-cyan-400 transition-all duration-500"
                    style={{ width: `${winProbability}%` }}
                  />
                </div>
              </div>
            )}

            {/* Quick Innings Action Buttons when applicable */}
            {inningsNumber === 1 && status === 'live' && onQuickFinishFirstInnings && (
              <div className="pt-1 flex items-center justify-between gap-2">
                <span className="text-[11px] text-slate-400">Setting 1st Innings Target</span>
                <button
                  type="button"
                  onClick={onQuickFinishFirstInnings}
                  className="rounded-lg border border-cyan-500/40 bg-cyan-500/15 px-3 py-1.5 text-xs font-semibold text-cyan-200 hover:bg-cyan-500/25 transition-colors cursor-pointer whitespace-nowrap shrink-0"
                >
                  Sim Remainder of 1st Inn →
                </button>
              </div>
            )}

            {inningsNumber === 1 &&
              status === 'completed' &&
              innings2Scorecard.status !== 'completed' &&
              onStartSecondInnings && (
                <button
                  type="button"
                  onClick={onStartSecondInnings}
                  className="w-full rounded-xl bg-emerald-500 px-4 py-2 text-xs font-bold text-slate-950 hover:bg-emerald-400 transition-colors cursor-pointer whitespace-nowrap"
                >
                  Start 2nd Innings Chase (Target: {innings1Scorecard.runs + 1}) →
                </button>
              )}
          </div>
        </div>

        {/* =====================================================================
            ZONE 2 (4 COLS): BATTERS AT THE CREASE + PARTNERSHIP & LAST WICKET
            ===================================================================== */}
        <div className="lg:col-span-4 p-4 sm:p-6 flex flex-col justify-between gap-3 bg-[#060D1F]">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="font-semibold text-cyan-300">Batters at the Crease</span>
            <span className="font-mono tabular-nums">
              Stand:{' '}
              <strong className="text-white">
                {activePartnership
                  ? `${activePartnership.totalRuns} (${activePartnership.totalBalls})`
                  : '0 (0)'}
              </strong>
            </span>
          </div>

          {status === 'upcoming' ? (
            <div className="py-5 border-y border-slate-800/80 text-center space-y-1">
              <p className="text-xs font-semibold text-slate-200">
                {battingTeam.name} Innings Yet to Commence
              </p>
              <p className="text-xs text-slate-400">
                Openers: {activeScorecard.yetToBat[0]?.player.name} &{' '}
                {activeScorecard.yetToBat[1]?.player.name}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-800/80 border-y border-slate-800/80">
              {[strikerRow, nonStrikerRow]
                .filter((row): row is NonNullable<typeof row> => Boolean(row))
                .map((row, idx) => {
                  const isOnStrike = idx === 0 && row.isStriker;
                  return (
                    <div
                      key={`${row.player.id}-${idx}`}
                      onClick={() => onInspectPlayer && onInspectPlayer(row.player)}
                      className={`group flex items-center justify-between gap-3 py-2.5 px-2 transition-colors ${
                        onInspectPlayer ? 'cursor-pointer hover:bg-slate-900/60' : ''
                      } ${isOnStrike ? 'bg-cyan-950/20' : ''}`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <PlayerCardAvatar
                          playerId={row.player.id}
                          name={row.player.name}
                          countryCode={row.player.countryCode || battingTeam.id}
                          imageUrl={row.player.imageUrl}
                          size="sm"
                        />
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span className="font-mono text-[11px] text-slate-500 tabular-nums shrink-0">
                              #{row.battingPosition}
                            </span>
                            <span
                              className={`text-xs sm:text-sm font-bold truncate ${
                                isOnStrike ? 'text-white' : 'text-slate-200'
                              }`}
                            >
                              {row.player.name}
                              {isOnStrike ? ' *' : ''}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-[11px] font-mono text-slate-400 tabular-nums">
                            <span>
                              4s <strong className="text-slate-200">{row.fours}</strong>
                            </span>
                            <span className="text-slate-600" aria-hidden="true">
                              ·
                            </span>
                            <span>
                              6s <strong className="text-slate-200">{row.sixes}</strong>
                            </span>
                            <span className="text-slate-600" aria-hidden="true">
                              ·
                            </span>
                            <span>
                              SR{' '}
                              <strong className="text-cyan-300">
                                {row.strikeRate.toFixed(1)}
                              </strong>
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="text-right font-mono shrink-0 tabular-nums">
                        <span
                          key={`bat-${row.player.id}-${row.runs}`}
                          className={`text-base sm:text-lg font-bold inline-block animate-score-roll ${
                            isOnStrike ? 'text-cyan-300' : 'text-slate-200'
                          }`}
                        >
                          {row.runs}
                        </span>
                        <span className="text-xs text-slate-400 ml-1">({row.balls})</span>
                      </div>
                    </div>
                  );
                })}
            </div>
          )}

          {/* Footer: Last Wicket or Next Batter In */}
          <div className="flex items-center justify-between gap-2 text-xs text-slate-400">
            {lastWicket ? (
              <span className="truncate font-mono tabular-nums">
                Last Wkt:{' '}
                <strong className="text-rose-300 font-sans">
                  {lastWicket.batter.name.split(' ').pop()}
                </strong>{' '}
                <strong className="text-rose-300">
                  {lastWicket.batterRuns}({lastWicket.batterBalls})
                </strong>{' '}
                · {lastWicket.scoreAtDismissal}/{lastWicket.wicketNumber} (
                {lastWicket.oversAtDismissal} ov)
              </span>
            ) : (
              <span className="truncate">
                Unbroken Opening Stand ·{' '}
                {activeScorecard.yetToBat[0]
                  ? `Next: ${activeScorecard.yetToBat[0].player.name}`
                  : 'Full XI'}
              </span>
            )}
          </div>
        </div>

        {/* =====================================================================
            ZONE 3 (4 COLS): CURRENT BOWLER & BALL-BY-BALL OVER TRACKER
            ===================================================================== */}
        <div className="lg:col-span-4 p-4 sm:p-6 flex flex-col justify-between gap-3 bg-[#050B19]">
          <div className="flex items-center justify-between gap-2 text-xs text-slate-300">
            <span className="inline-flex items-center gap-1.5 font-semibold text-amber-300 min-w-0">
              <span className="whitespace-nowrap">Current Spell ·</span>
              <TeamFlag code={bowlingTeam.id} size="xs" />
              <span className="text-slate-100 truncate">{bowlingTeam.name}</span>
            </span>
            <div className="flex items-center gap-2 shrink-0">
              {currentBowlerRow && (
                <span className="font-mono tabular-nums text-slate-200 hidden sm:inline">
                  Econ{' '}
                  <strong className="text-emerald-300">
                    {currentBowlerRow.economy.toFixed(2)}
                  </strong>
                </span>
              )}
              {attackBowlerPool.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    cricketAudio.playUiClick();
                    setIsBowlerModalOpen(true);
                  }}
                  className="inline-flex items-center gap-1 rounded-lg border border-cyan-500/40 bg-cyan-950/50 px-2.5 py-1 text-[11px] font-semibold text-cyan-200 hover:bg-cyan-900/60 hover:text-white transition-colors cursor-pointer whitespace-nowrap shrink-0"
                >
                  <Gauge className="h-3 w-3 text-cyan-400 shrink-0" />
                  <span>Rotation &amp; Stamina</span>
                </button>
              )}
            </div>
          </div>

          {/* Current Bowler Row */}
          {currentBowlerRow ? (
            <div className="flex items-center justify-between gap-3 py-2.5 px-2 border-y border-slate-800/80">
              <div
                onClick={() => onInspectPlayer && onInspectPlayer(currentBowlerRow.player)}
                className={`flex items-center gap-2.5 min-w-0 ${
                  onInspectPlayer ? 'cursor-pointer group' : ''
                }`}
              >
                <PlayerCardAvatar
                  playerId={currentBowlerRow.player.id}
                  name={currentBowlerRow.player.name}
                  countryCode={currentBowlerRow.player.countryCode || bowlingTeam.id}
                  imageUrl={currentBowlerRow.player.imageUrl}
                  size="sm"
                />
                <div className="min-w-0">
                  <p className="text-xs sm:text-sm font-bold text-white truncate group-hover:text-cyan-300 transition-colors">
                    {currentBowlerRow.player.name}
                  </p>
                  <p className="text-[11px] text-slate-400 truncate">
                    {currentBowlerRow.player.bowlingStyle}
                    {currentBowlerRow.wides + currentBowlerRow.noBalls > 0
                      ? ` · ${currentBowlerRow.wides}wd / ${currentBowlerRow.noBalls}nb`
                      : ''}
                  </p>
                </div>
              </div>

              {/* Standard Cricket Notation: O - M - R - W */}
              <div className="text-right font-mono shrink-0 tabular-nums">
                <div className="text-sm sm:text-base font-bold text-amber-300">
                  {currentBowlerRow.overs}-{currentBowlerRow.maidens}-
                  {currentBowlerRow.runsConceded}-{currentBowlerRow.wickets}
                </div>
                <span className="block text-[10px] text-slate-500">O - M - R - W</span>
              </div>
            </div>
          ) : (
            <div className="py-4 border-y border-slate-800/80 text-xs text-slate-400 text-center">
              Awaiting opening spell
            </div>
          )}

          {/* Optional Captain Bowler Selector at Start of New Over */}
          {eligibleNextBowlers.length > 1 && onSelectBowler && (
            <div className="flex items-center justify-between gap-2 text-xs">
              <label
                htmlFor="scoreboard-next-bowler-select"
                className="text-amber-300 font-medium whitespace-nowrap"
              >
                New Over Bowler:
              </label>
              <select
                id="scoreboard-next-bowler-select"
                value={currentBowlerRow?.player.id || eligibleNextBowlers[0].id}
                onChange={(e) => onSelectBowler(e.target.value)}
                aria-label="Select bowler for next over"
                className="rounded-lg bg-slate-950 border border-slate-700 px-2.5 py-1 text-xs font-mono text-white focus:border-cyan-400 focus:outline-none cursor-pointer max-w-[195px]"
              >
                {eligibleNextBowlers.map((b) => {
                  const row = activeScorecard.bowlers.find((r) => r.player.id === b.id);
                  return (
                    <option key={b.id} value={b.id}>
                      {b.name} (
                      {row
                        ? `${row.overs}-${row.maidens}-${row.runsConceded}-${row.wickets}`
                        : '0.0-0-0-0'}
                      )
                    </option>
                  );
                })}
              </select>
            </div>
          )}

          {/* Ball-by-Ball Display: Current Over + Retained Last 6 Deliveries */}
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2 text-xs">
              <span className="font-medium text-slate-300 whitespace-nowrap">
                {isDisplayOverComplete
                  ? `Over ${displayOverNumber} Complete`
                  : `This Over (${displayOverNumber})`}
              </span>
              <span className="font-mono text-slate-400 tabular-nums">
                {currentOverDeliveries.reduce((s, d) => s + (d.runsScored || 0), 0)} runs
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              {currentOverDeliveries.map((ball, idx) => {
                const chip = getDeliveryChipStyle(ball);
                return (
                  <span
                    key={ball.eventId || `ov-${idx}`}
                    title={chip.tooltip}
                    className={`inline-flex h-6 min-w-6 items-center justify-center rounded-full border text-[11px] font-mono tabular-nums transition-transform duration-150 animate-score-roll ${chip.chipClass}`}
                  >
                    {chip.label}
                  </span>
                );
              })}

              {Array.from({ length: remainingDotsInOver }).map((_, idx) => (
                <span
                  key={`empty-${idx}`}
                  className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-dashed border-slate-800 bg-slate-950/50 text-[10px] font-mono text-slate-600"
                >
                  ·
                </span>
              ))}
            </div>

            {/* Retained Last 6 Deliveries Strip across over boundaries */}
            {lastSixDeliveries.length > 0 &&
              currentOverDeliveries.length < 6 &&
              legalBalls >= 6 && (
                <div className="flex items-center justify-between gap-2 pt-1 text-[11px] font-mono text-slate-400">
                  <span className="text-slate-500 whitespace-nowrap">Last 6:</span>
                  <div className="flex items-center gap-1">
                    {lastSixDeliveries.map((ball, idx) => {
                      const chip = getDeliveryChipStyle(ball);
                      return (
                        <span
                          key={`last6-${ball.eventId || idx}`}
                          title={chip.tooltip}
                          className={`inline-flex h-5 min-w-5 items-center justify-center rounded border text-[10px] font-mono tabular-nums px-1 ${chip.chipClass}`}
                        >
                          {chip.label}
                        </span>
                      );
                    })}
                  </div>
                </div>
              )}
          </div>
        </div>
      </div>

      {/* BROADCAST LOWER-THIRD EVENT CALLOUT OR MATCH VERDICT BANNER */}
      {matchResultBanner ? (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 sm:px-6 py-3 bg-gradient-to-r from-emerald-950/90 via-cyan-950/85 to-slate-950 border-t border-emerald-500/40 text-xs">
          <div className="flex items-center gap-3 min-w-0">
            <Trophy className="h-5 w-5 text-amber-300 shrink-0" />
            <div className="min-w-0">
              <p className="font-bold text-white text-sm truncate">
                {matchResultBanner.headline}
              </p>
              <p className="text-xs font-mono text-cyan-200 truncate tabular-nums">
                {matchResultBanner.subtext}
              </p>
            </div>
          </div>

          {matchResultBanner.isTied && onStartSuperOver && (
            <button
              type="button"
              onClick={onStartSuperOver}
              className="rounded-xl bg-amber-400 px-4 py-2 text-xs font-bold text-slate-950 hover:bg-amber-300 transition-colors cursor-pointer whitespace-nowrap shrink-0"
            >
              Launch 1-Over Super Over →
            </button>
          )}
        </div>
      ) : latestFlash ? (
        <div
          className={`flex flex-wrap items-center justify-between gap-2 px-4 sm:px-6 py-2 border-t text-xs animate-score-entry ${latestFlash.tone}`}
        >
          <div className="flex items-center gap-2 min-w-0">
            <span className={`font-semibold whitespace-nowrap shrink-0 ${latestFlash.accent}`}>
              {latestFlash.tag}
            </span>
            <span className="text-slate-500" aria-hidden="true">
              ·
            </span>
            <span className="truncate font-medium">{latestFlash.detail}</span>
          </div>
          {lastBall && (
            <span className="font-mono text-[11px] opacity-85 tabular-nums whitespace-nowrap shrink-0">
              {lastBall.overNumber}.{lastBall.ballInOver} ov · {lastBall.speedKmh} km/h
            </span>
          )}
        </div>
      ) : null}

      <BowlerSelectorModal
        isOpen={isBowlerModalOpen}
        onClose={() => setIsBowlerModalOpen(false)}
        bowlingTeam={bowlingTeam}
        eligibleBowlers={rotationCandidates}
        allAttackBowlers={attackBowlerPool}
        activeScorecard={activeScorecard}
        currentBowlerId={currentBowlerRow?.player.id}
        previousOverBowlerId={previousOverBowlerId}
        onSelectBowler={(bowlerId) => {
          if (onSelectBowler) {
            onSelectBowler(bowlerId);
          }
        }}
      />
    </section>
  );
};
