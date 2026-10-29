import React, { useMemo, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Droplets,
  Flame,
  Gauge,
  Shield,
  X,
} from 'lucide-react';
import { BallEvent, Player, Team } from '../../types/cricket';
import { ComputedInningsScorecard } from '../../engine/matchScoreboardEngine';
import { PlayerCardAvatar } from '../common/CricketIdentity';
import { cricketAudio } from '../../utils/audioSystem';

export interface BowlerSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  bowlingTeam: Team;
  eligibleBowlers: Player[];
  allAttackBowlers: Player[];
  activeScorecard: ComputedInningsScorecard;
  currentBowlerId?: string;
  previousOverBowlerId?: string | null;
  onSelectBowler: (bowlerId: string) => void;
}

interface BowlerStaminaForecastCard {
  player: Player;
  oversString: string;
  ballsBowled: number;
  runsConceded: number;
  wickets: number;
  economy: number;
  oversRestedSinceLastSpell: number;
  qualifiesForCoolDown: boolean;
  rawDepletedStaminaPct: number;
  coolDownRecoveryPct: number;
  effectiveStaminaPct: number;
  oversUntilCriticalFatigue: number;
  predictedCriticalMatchOver: number;
  fatigueStatus: 'Peak Fresh' | 'Cool-Down Recovered' | 'Moderate Load' | 'Critical Soon';
  isEligibleNow: boolean;
}

export const BowlerSelectorModal: React.FC<BowlerSelectorModalProps> = ({
  isOpen,
  onClose,
  bowlingTeam,
  eligibleBowlers,
  allAttackBowlers,
  activeScorecard,
  currentBowlerId,
  previousOverBowlerId,
  onSelectBowler,
}) => {
  const [hydratedBonusIds, setHydratedBonusIds] = useState<Record<string, boolean>>({});

  const currentMatchOverNumber = Math.floor(activeScorecard.legalBalls / 6) + 1;
  const events: BallEvent[] = useMemo(
    () => (activeScorecard.overSummaries || []).flatMap((ov) => ov.deliveries),
    [activeScorecard.overSummaries]
  );

  const cards = useMemo<BowlerStaminaForecastCard[]>(() => {
    const pool = allAttackBowlers.length > 0 ? allAttackBowlers : eligibleBowlers;

    return pool.map((player) => {
      const row = activeScorecard.bowlers.find((r) => r.player.id === player.id);
      const ballsBowled = row ? row.legalBalls : 0;
      const oversString = row ? row.overs : '0.0';
      const runsConceded = row ? row.runsConceded : 0;
      const wickets = row ? row.wickets : 0;
      const economy = row ? row.economy : player.stats.economy || 7.2;

      const isSpinner =
        player.role === 'Spin Bowler' || player.bowlingStyle.toLowerCase().includes('spin');

      // Find the most recent over number bowled by this player
      const bowlerEvents = events.filter((e) => e.bowler.id === player.id);
      const lastBowledOver =
        bowlerEvents.length > 0
          ? Math.max(...bowlerEvents.map((e) => e.overNumber))
          : null;

      const oversRestedSinceLastSpell =
        lastBowledOver !== null
          ? Math.max(0, currentMatchOverNumber - 1 - lastBowledOver)
          : currentMatchOverNumber - 1;

      // Energy Drink / Cool-Down Mechanic: sitting out 2+ full overs after bowling (or manual cool-down drink) recovers +15% stamina
      const qualifiesForCoolDown =
        (ballsBowled > 0 && oversRestedSinceLastSpell >= 2) || Boolean(hydratedBonusIds[player.id]);

      const depletionPerBall = isSpinner ? 1.55 : 2.35;
      const rawDepletedStaminaPct = Math.max(
        28,
        Math.min(100, Math.round(100 - ballsBowled * depletionPerBall))
      );

      const coolDownRecoveryPct = qualifiesForCoolDown
        ? Math.min(15, 100 - rawDepletedStaminaPct)
        : 0;
      const effectiveStaminaPct = Math.min(100, rawDepletedStaminaPct + coolDownRecoveryPct);

      // Fatigue Forecast: estimate how many additional overs until bowler hits critical <50% stamina
      const drainPerOver = depletionPerBall * 6;
      const remainingBufferPct = Math.max(0, effectiveStaminaPct - 50);
      const oversUntilCriticalFatigue = Number((remainingBufferPct / drainPerOver).toFixed(1));
      const predictedCriticalMatchOver = Math.min(
        20,
        Math.max(
          currentMatchOverNumber,
          Math.round(currentMatchOverNumber + Math.max(1, oversUntilCriticalFatigue))
        )
      );

      let fatigueStatus: BowlerStaminaForecastCard['fatigueStatus'] = 'Moderate Load';
      if (coolDownRecoveryPct > 0) {
        fatigueStatus = 'Cool-Down Recovered';
      } else if (effectiveStaminaPct >= 86) {
        fatigueStatus = 'Peak Fresh';
      } else if (effectiveStaminaPct <= 58) {
        fatigueStatus = 'Critical Soon';
      }

      const isEligibleNow =
        eligibleBowlers.some((b) => b.id === player.id) &&
        player.id !== previousOverBowlerId &&
        ballsBowled < 24;

      return {
        player,
        oversString,
        ballsBowled,
        runsConceded,
        wickets,
        economy,
        oversRestedSinceLastSpell,
        qualifiesForCoolDown,
        rawDepletedStaminaPct,
        coolDownRecoveryPct,
        effectiveStaminaPct,
        oversUntilCriticalFatigue,
        predictedCriticalMatchOver,
        fatigueStatus,
        isEligibleNow,
      };
    });
  }, [
    allAttackBowlers,
    eligibleBowlers,
    activeScorecard.bowlers,
    events,
    currentMatchOverNumber,
    hydratedBonusIds,
    previousOverBowlerId,
  ]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md overflow-y-auto animate-in fade-in duration-150 font-sans">
      <div className="relative w-full max-w-4xl rounded-3xl border border-slate-800 bg-slate-950 p-5 sm:p-6 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto text-slate-100">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 border-b border-slate-800 pb-4">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2 text-xs text-cyan-300 font-medium">
              <Shield className="h-3.5 w-3.5 text-cyan-400 shrink-0" />
              <span>{bowlingTeam.name} Tactical Over Rotation</span>
              <span aria-hidden="true" className="text-slate-600">
                ·
              </span>
              <span className="text-sky-300">
                Fatigue Forecast &amp; +15% Energy Drink Cool-Down
              </span>
            </div>
            <h3 className="text-xl font-black text-white tracking-tight">
              Select Next Bowler &amp; Stamina Recovery Planner (Over {currentMatchOverNumber})
            </h3>
            <p className="text-xs text-slate-300">
              Bowlers who rest for 2+ overs recover +15% stamina (visualized in sky-blue on their
              stamina bar). Fatigue Forecast predicts when each bowler reaches critical (&lt;50%)
              stamina.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close Bowler Selector Modal"
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-800 bg-slate-900 text-slate-300 hover:text-white transition-colors cursor-pointer shrink-0"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Bowler Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {cards.map((c) => {
            const isCurrent = c.player.id === currentBowlerId;
            const baseWidth = c.rawDepletedStaminaPct;
            const blueRecoveryWidth = c.coolDownRecoveryPct;

            return (
              <div
                key={c.player.id}
                className={`rounded-2xl border p-4 space-y-3.5 transition-colors ${
                  isCurrent
                    ? 'border-cyan-400 bg-slate-900'
                    : c.isEligibleNow
                    ? 'border-slate-800 bg-slate-900/75 hover:border-slate-700'
                    : 'border-slate-800/60 bg-slate-950/70 opacity-75'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <PlayerCardAvatar
                      playerId={c.player.id}
                      name={c.player.name}
                      countryCode={c.player.countryCode || bowlingTeam.id}
                      imageUrl={c.player.imageUrl}
                      size="md"
                    />
                    <div className="min-w-0">
                      <h4 className="text-sm font-bold text-white truncate">{c.player.name}</h4>
                      <p className="text-xs text-slate-300 truncate">{c.player.bowlingStyle}</p>
                      <span className="text-[11px] font-mono text-amber-300 tabular-nums">
                        Figures: {c.oversString}-0-{c.runsConceded}-{c.wickets} · Econ{' '}
                        {c.economy.toFixed(2)}
                      </span>
                    </div>
                  </div>

                  <span
                    className={`text-[11px] font-semibold shrink-0 ${
                      c.coolDownRecoveryPct > 0
                        ? 'text-sky-300'
                        : c.effectiveStaminaPct <= 58
                        ? 'text-rose-300'
                        : 'text-emerald-300'
                    }`}
                  >
                    {c.fatigueStatus}
                  </span>
                </div>

                {/* Stamina Bar with Blue +15% Cool-Down Recovery Segment */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-300 flex items-center gap-1.5">
                      <Gauge className="h-3.5 w-3.5 text-cyan-400" />
                      <span>Spell Stamina</span>
                    </span>
                    <div className="flex items-center gap-2 font-mono tabular-nums">
                      <strong className="text-white">{c.effectiveStaminaPct}%</strong>
                      {c.coolDownRecoveryPct > 0 && (
                        <span className="text-sky-300 font-bold">
                          (+{c.coolDownRecoveryPct}% Cool-Down)
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="h-2.5 w-full rounded-full bg-slate-800 overflow-hidden flex">
                    <div
                      className={`h-full transition-all duration-300 ${
                        c.effectiveStaminaPct <= 52
                          ? 'bg-rose-500'
                          : c.effectiveStaminaPct <= 72
                          ? 'bg-amber-400'
                          : 'bg-emerald-500'
                      }`}
                      style={{ width: `${baseWidth}%` }}
                    />
                    {blueRecoveryWidth > 0 && (
                      <div
                        title="+15% Energy Drink / 2-Over Rest Stamina Recovery"
                        className="h-full bg-sky-400 shadow-[0_0_12px_rgba(56,189,248,0.85)] transition-all duration-300"
                        style={{ width: `${blueRecoveryWidth}%` }}
                      />
                    )}
                  </div>
                </div>

                {/* Fatigue Forecast Readout */}
                <div className="rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 flex items-center justify-between gap-2 text-xs">
                  <span className="text-slate-300 flex items-center gap-1.5">
                    {c.oversUntilCriticalFatigue <= 1.2 ? (
                      <AlertTriangle className="h-3.5 w-3.5 text-rose-400 shrink-0" />
                    ) : (
                      <Activity className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                    )}
                    <span>Fatigue Forecast:</span>
                  </span>
                  <span className="font-mono text-slate-200 tabular-nums">
                    {c.oversUntilCriticalFatigue <= 0.3
                      ? 'Critical (<50%) Active Now'
                      : `Critical in ~${c.oversUntilCriticalFatigue} ov (Est. Ov ${c.predictedCriticalMatchOver})`}
                  </span>
                </div>

                {/* Actions: Energy Drink Cool-Down & Select Bowler */}
                <div className="flex items-center justify-between gap-2 pt-1">
                  {c.ballsBowled > 0 && !c.qualifiesForCoolDown ? (
                    <button
                      type="button"
                      onClick={() => {
                        cricketAudio.playUiClick();
                        setHydratedBonusIds((prev) => ({ ...prev, [c.player.id]: true }));
                      }}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-sky-500/40 bg-sky-950/40 px-2.5 py-1.5 text-xs font-semibold text-sky-300 hover:bg-sky-500/20 hover:text-white transition-colors cursor-pointer whitespace-nowrap shrink-0"
                    >
                      <Droplets className="h-3.5 w-3.5 text-sky-400" />
                      <span>Energy Drink Break (+15%)</span>
                    </button>
                  ) : c.qualifiesForCoolDown ? (
                    <span className="inline-flex items-center gap-1 text-xs text-sky-300 font-medium">
                      <CheckCircle2 className="h-3.5 w-3.5 text-sky-400" />
                      <span>
                        {c.oversRestedSinceLastSpell >= 2
                          ? `Rested ${c.oversRestedSinceLastSpell} ov (+15% Blue Recovery)`
                          : 'Hydration Recovery Active'}
                      </span>
                    </span>
                  ) : (
                    <span className="text-xs text-slate-400">Fresh Unbowled Spell</span>
                  )}

                  <button
                    type="button"
                    disabled={!c.isEligibleNow}
                    onClick={() => {
                      cricketAudio.playBatHit();
                      onSelectBowler(c.player.id);
                      onClose();
                    }}
                    className={`rounded-xl px-3.5 py-1.5 text-xs font-bold transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                      isCurrent
                        ? 'bg-cyan-400 text-slate-950'
                        : c.isEligibleNow
                        ? 'bg-emerald-400 text-slate-950 hover:bg-emerald-300'
                        : 'border border-slate-800 bg-slate-900 text-slate-500 cursor-not-allowed'
                    }`}
                  >
                    {isCurrent
                      ? 'Active Bowler'
                      : c.ballsBowled >= 24
                      ? 'Quota Complete'
                      : c.player.id === previousOverBowlerId
                      ? 'Bowled Prev Over'
                      : 'Assign Next Over'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
