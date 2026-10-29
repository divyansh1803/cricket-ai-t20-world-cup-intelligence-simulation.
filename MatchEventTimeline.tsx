import React, { useMemo, useRef, useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Clock,
  Flame,
  RefreshCw,
  ShieldAlert,
  TrendingUp,
  User,
} from 'lucide-react';
import { BallEvent, Player, Stadium, Team } from '../../types/cricket';
import { cricketAudio } from '../../utils/audioSystem';

export type TimelineTurningPointCategory = 'wicket' | 'boundary_burst' | 'tactical_sub';
type CategoryFilter = 'all' | TimelineTurningPointCategory;

export interface MatchTimelineTurningPoint {
  id: string;
  inningsNumber: number;
  overBallLabel: string;
  ballOrder: number;
  category: TimelineTurningPointCategory;
  categoryLabel: string;
  headline: string;
  scoreSnapshot: string;
  winProbShiftPct: number;
  winProbAfterPct: number;
  involvedBatter?: Player;
  involvedBowler?: Player;
  insightSummary: string;
  tacticalContext: string;
  isProjectedPreMatch: boolean;
}

export interface MatchEventTimelineProps {
  innings1Events: BallEvent[];
  innings2Events: BallEvent[];
  teamA: Team;
  teamB: Team;
  stadium: Stadium;
  liveInningsNumber: 1 | 2 | 3 | 4;
  onInspectPlayer?: (player: Player) => void;
}

function buildTurningPointsFromLiveEvents(
  inningsEvents: BallEvent[],
  inningsNumber: number,
  battingTeam: Team,
  bowlingTeam: Team
): MatchTimelineTurningPoint[] {
  const points: MatchTimelineTurningPoint[] = [];
  let prevBowlerId: string | null = null;
  let consecutiveBoundaries = 0;

  inningsEvents.forEach((ev, idx) => {
    const overBall = `${ev.overNumber}.${ev.ballInOver}`;
    const order = inningsNumber * 1000 + idx;
    const shift = Number((ev.winProbDelta ?? 0).toFixed(1));
    const probAfter = Math.round(ev.winProbA ?? 50);

    // 1. Wickets
    if (ev.isWicket) {
      consecutiveBoundaries = 0;
      const dismissed = ev.dismissedPlayer || ev.batter;
      points.push({
        id: `live_wkt_${inningsNumber}_${idx}`,
        inningsNumber,
        overBallLabel: `Inn ${inningsNumber} · Ov ${overBall}`,
        ballOrder: order,
        category: 'wicket',
        categoryLabel: 'Wicket Breakthrough',
        headline: `${dismissed.name} ${ev.wicketType || 'Dismissed'} (${ev.bowler.name})`,
        scoreSnapshot: `${battingTeam.shortName} ${ev.scoreAtBall}`,
        winProbShiftPct: shift !== 0 ? shift : -8.4,
        winProbAfterPct: probAfter,
        involvedBatter: dismissed,
        involvedBowler: ev.bowler,
        insightSummary:
          ev.aiExplanation ||
          ev.commentary ||
          `${ev.bowler.name} breaks the partnership with a ${ev.speedKmh} km/h ${ev.length.toLowerCase()} delivery, forcing ${battingTeam.shortName} to rebuild.`,
        tacticalContext: `${ev.deliveryType} at ${ev.speedKmh} km/h · New batter exposed to fresh pressure`,
        isProjectedPreMatch: false,
      });
    } else if (ev.runsScored >= 4) {
      // 2. Boundary Bursts (Sixes, consecutive boundaries, or big win-prob swing >= 4.5%)
      consecutiveBoundaries += 1;
      if (ev.runsScored >= 6 || consecutiveBoundaries >= 2 || Math.abs(shift) >= 4.5) {
        points.push({
          id: `live_bdy_${inningsNumber}_${idx}`,
          inningsNumber,
          overBallLabel: `Inn ${inningsNumber} · Ov ${overBall}`,
          ballOrder: order,
          category: 'boundary_burst',
          categoryLabel: consecutiveBoundaries >= 2 ? 'Boundary Surge' : 'Maximum Impact',
          headline:
            consecutiveBoundaries >= 2
              ? `${ev.batter.name} Back-to-Back Boundaries (${ev.runsScored} Runs)`
              : `${ev.batter.name} Launches ${ev.runsScored} off ${ev.bowler.name}`,
          scoreSnapshot: `${battingTeam.shortName} ${ev.scoreAtBall}`,
          winProbShiftPct: shift !== 0 ? shift : ev.runsScored === 6 ? 6.2 : 4.6,
          winProbAfterPct: probAfter,
          involvedBatter: ev.batter,
          involvedBowler: ev.bowler,
          insightSummary:
            ev.commentary ||
            `${ev.batter.name} punishes ${ev.bowler.name}'s ${ev.length.toLowerCase()} ball (${ev.shot}) to accelerate the scoring rate.`,
          tacticalContext: `Shot: ${ev.shot} · Force field spread by ${bowlingTeam.shortName}`,
          isProjectedPreMatch: false,
        });
      }
    } else {
      consecutiveBoundaries = 0;
    }

    // 3. Tactical Bowling Changes / Phase Matchup Substitutions (at start of new over after Over 1)
    if (ev.ballInOver === 1 && prevBowlerId && ev.bowler.id !== prevBowlerId && ev.overNumber >= 2) {
      const isSpinSwitch = ev.bowler.role === 'Spin Bowler' || ev.bowler.bowlingStyle.toLowerCase().includes('spin');
      const isDeathEntry = ev.overNumber >= 15;
      if (isSpinSwitch || isDeathEntry || ev.overNumber === 6) {
        points.push({
          id: `live_tac_${inningsNumber}_${idx}`,
          inningsNumber,
          overBallLabel: `Inn ${inningsNumber} · Ov ${ev.overNumber}.1`,
          ballOrder: order - 0.5,
          category: 'tactical_sub',
          categoryLabel: isSpinSwitch
            ? 'Tactical Spin Change'
            : isDeathEntry
            ? 'Death Specialist Entry'
            : 'Post-Powerplay Switch',
          headline: `${bowlingTeam.shortName} Brings On ${ev.bowler.name}`,
          scoreSnapshot: `${battingTeam.shortName} ${ev.scoreAtBall}`,
          winProbShiftPct: shift !== 0 ? shift : isSpinSwitch ? -2.8 : -3.4,
          winProbAfterPct: probAfter,
          involvedBatter: ev.batter,
          involvedBowler: ev.bowler,
          insightSummary: `${bowlingTeam.shortName} deploys ${ev.bowler.name} (${ev.bowler.bowlingStyle}) against ${ev.batter.name} to disrupt pace rhythm and protect the boundary square.`,
          tacticalContext: `Matchup Shift · ${ev.bowler.name} Econ ${ev.bowler.stats.economy} vs ${ev.batter.name}`,
          isProjectedPreMatch: false,
        });
      }
    }

    prevBowlerId = ev.bowler.id;
  });

  return points;
}

function buildPreMatchProjectedBlueprint(
  teamA: Team,
  teamB: Team,
  stadium: Stadium
): MatchTimelineTurningPoint[] {
  const openerA = teamA.squad[0];
  const middleA = teamA.squad[2] || teamA.squad[1] || openerA;
  const finisherA = teamA.squad[4] || middleA;
  const pacerB =
    teamB.squad.find((p) => p.role === 'Pace Bowler') || teamB.squad[teamB.squad.length - 1];
  const spinnerB =
    teamB.squad.find((p) => p.role === 'Spin Bowler') || teamB.squad[Math.min(3, teamB.squad.length - 1)];
  const openerB = teamB.squad[0];
  const pacerA =
    teamA.squad.find((p) => p.role === 'Pace Bowler') || teamA.squad[teamA.squad.length - 1];

  return [
    {
      id: 'proj_1',
      inningsNumber: 1,
      overBallLabel: 'Proj · Ov 2.4',
      ballOrder: 1,
      category: 'wicket',
      categoryLabel: 'New-Ball Strike Window',
      headline: `${pacerB.name} Targets ${openerA.name} Early`,
      scoreSnapshot: `${teamA.shortName} ~19/1`,
      winProbShiftPct: -7.8,
      winProbAfterPct: 45,
      involvedBatter: openerA,
      involvedBowler: pacerB,
      insightSummary: `Projected new-ball seam movement at ${stadium.name} (${stadium.paceWicketPercent}% pace wicket share) creates high LBW/edge threat in Overs 1–3.`,
      tacticalContext: `Simulated Pre-Match Key Window · ${stadium.pitchType}`,
      isProjectedPreMatch: true,
    },
    {
      id: 'proj_2',
      inningsNumber: 1,
      overBallLabel: 'Proj · Ov 5.2',
      ballOrder: 2,
      category: 'boundary_burst',
      categoryLabel: 'Powerplay Surge',
      headline: `${middleA.name} Powerplay Acceleration`,
      scoreSnapshot: `${teamA.shortName} ~54/1`,
      winProbShiftPct: 6.4,
      winProbAfterPct: 54,
      involvedBatter: middleA,
      involvedBowler: pacerB,
      insightSummary: `With only 2 fielders outside the 30-yard circle and ${stadium.boundarySizeMeters.square}m square boundaries, ${middleA.name} (SR ${middleA.stats.powerplaySR || middleA.stats.strikeRate}) projects a 14+ run over.`,
      tacticalContext: `Simulated Powerplay Boundary Window`,
      isProjectedPreMatch: true,
    },
    {
      id: 'proj_3',
      inningsNumber: 1,
      overBallLabel: 'Proj · Ov 7.1',
      ballOrder: 3,
      category: 'tactical_sub',
      categoryLabel: 'Tactical Matchup Switch',
      headline: `${teamB.shortName} Introduces ${spinnerB.name}`,
      scoreSnapshot: `${teamA.shortName} ~62/1`,
      winProbShiftPct: -4.1,
      winProbAfterPct: 50,
      involvedBatter: middleA,
      involvedBowler: spinnerB,
      insightSummary: `Post-powerplay tactical bowling change: ${spinnerB.name} (${spinnerB.bowlingStyle}) enters immediately at Over 7 to squeeze middle-over dot balls.`,
      tacticalContext: `Simulated Tactical Substitution / Bowling Change`,
      isProjectedPreMatch: true,
    },
    {
      id: 'proj_4',
      inningsNumber: 1,
      overBallLabel: 'Proj · Ov 17.5',
      ballOrder: 4,
      category: 'boundary_burst',
      categoryLabel: 'Death-Over Launch',
      headline: `${finisherA.name} Targets Par ${stadium.avgFirstInningsScore}+`,
      scoreSnapshot: `${teamA.shortName} ~162/4`,
      winProbShiftPct: 8.5,
      winProbAfterPct: 59,
      involvedBatter: finisherA,
      involvedBowler: pacerB,
      insightSummary: `Death-overs launch window against fuller yorker misses; ${stadium.dewFactor} evening dew reduces ball grip in the final 24 balls.`,
      tacticalContext: `Simulated Death-Overs Turning Point`,
      isProjectedPreMatch: true,
    },
    {
      id: 'proj_5',
      inningsNumber: 2,
      overBallLabel: 'Proj · Inn 2 Ov 14.2',
      ballOrder: 5,
      category: 'wicket',
      categoryLabel: 'Chase Hinge Breakthrough',
      headline: `${pacerA.name} Returning Strike Spell vs ${openerB.name}`,
      scoreSnapshot: `${teamB.shortName} ~128/4`,
      winProbShiftPct: 11.2,
      winProbAfterPct: 64,
      involvedBatter: openerB,
      involvedBowler: pacerA,
      insightSummary: `Captains hold 1–2 overs of ${pacerA.name} for Overs 14–16 to break the set chase partnership before ${stadium.chasingWinPercent}% venue chase advantage takes over.`,
      tacticalContext: `Simulated 2nd Innings Tactical Turning Point`,
      isProjectedPreMatch: true,
    },
  ];
}

export const MatchEventTimeline: React.FC<MatchEventTimelineProps> = ({
  innings1Events,
  innings2Events,
  teamA,
  teamB,
  stadium,
  liveInningsNumber,
  onInspectPlayer,
}) => {
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('all');
  const [activePointId, setActivePointId] = useState<string | null>(null);

  const allTurningPoints = useMemo<MatchTimelineTurningPoint[]>(() => {
    const live1 = buildTurningPointsFromLiveEvents(innings1Events, 1, teamA, teamB);
    const live2 = buildTurningPointsFromLiveEvents(innings2Events, 2, teamB, teamA);
    const merged = [...live1, ...live2].sort((a, b) => a.ballOrder - b.ballOrder);

    if (merged.length > 0) {
      return merged;
    }
    return buildPreMatchProjectedBlueprint(teamA, teamB, stadium);
  }, [innings1Events, innings2Events, teamA, teamB, stadium]);

  const filteredPoints = useMemo(() => {
    if (categoryFilter === 'all') return allTurningPoints;
    return allTurningPoints.filter((p) => p.category === categoryFilter);
  }, [allTurningPoints, categoryFilter]);

  const inspectedPoint =
    filteredPoints.find((p) => p.id === activePointId) ||
    filteredPoints[filteredPoints.length - 1] ||
    allTurningPoints[0];

  const isPreMatchBlueprint = allTurningPoints[0]?.isProjectedPreMatch ?? false;

  const handleScrollAxis = (direction: 'left' | 'right') => {
    if (!scrollContainerRef.current) return;
    cricketAudio.playUiClick();
    scrollContainerRef.current.scrollBy({
      left: direction === 'left' ? -300 : 300,
      behavior: 'smooth',
    });
  };

  const getCategoryVisuals = (cat: TimelineTurningPointCategory) => {
    if (cat === 'wicket') {
      return {
        nodeBorder: 'border-rose-500/70',
        nodeActive: 'border-rose-400 bg-rose-950/35',
        accentText: 'text-rose-300',
        dotBg: 'bg-rose-500',
        Icon: ShieldAlert,
      };
    }
    if (cat === 'boundary_burst') {
      return {
        nodeBorder: 'border-emerald-500/60',
        nodeActive: 'border-emerald-400 bg-emerald-950/30',
        accentText: 'text-emerald-300',
        dotBg: 'bg-emerald-400',
        Icon: Flame,
      };
    }
    return {
      nodeBorder: 'border-cyan-500/60',
      nodeActive: 'border-cyan-400 bg-cyan-950/30',
      accentText: 'text-cyan-300',
      dotBg: 'bg-cyan-400',
      Icon: RefreshCw,
    };
  };

  return (
    <section className="rounded-2xl border border-slate-800/90 bg-[#050d1d] p-4 sm:p-5 space-y-4 font-sans">
      {/* Header & Category Filter Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-slate-800/80 pb-3.5">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-cyan-300">
            <Clock className="h-3.5 w-3.5 text-cyan-400 shrink-0" />
            <span>
              {isPreMatchBlueprint
                ? 'Simulated Pre-Match Turning-Point Blueprint (Live Feed Ready)'
                : `Live Match Turning-Point Stream · Innings ${liveInningsNumber}`}
            </span>
          </div>
          <h3 className="font-heading text-base sm:text-lg font-bold text-white tracking-tight">
            Match Event Timeline
          </h3>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <div
            role="group"
            aria-label="Filter Match Timeline Turning Points"
            className="inline-flex flex-wrap items-center rounded-xl border border-slate-800 bg-slate-950 p-1 text-xs"
          >
            {(
              [
                { id: 'all', label: `All (${allTurningPoints.length})` },
                {
                  id: 'wicket',
                  label: `Wickets (${allTurningPoints.filter((p) => p.category === 'wicket').length})`,
                },
                {
                  id: 'boundary_burst',
                  label: `Bursts (${allTurningPoints.filter((p) => p.category === 'boundary_burst').length})`,
                },
                {
                  id: 'tactical_sub',
                  label: `Tactical (${allTurningPoints.filter((p) => p.category === 'tactical_sub').length})`,
                },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  cricketAudio.playUiClick();
                  setCategoryFilter(tab.id);
                }}
                className={`rounded-lg px-2.5 py-1 font-semibold transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                  categoryFilter === tab.id
                    ? 'bg-cyan-400 text-slate-950 font-bold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="inline-flex items-center gap-1">
            <button
              type="button"
              onClick={() => handleScrollAxis('left')}
              aria-label="Scroll timeline left"
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-800 bg-slate-900 text-slate-300 hover:text-white transition-colors cursor-pointer"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => handleScrollAxis('right')}
              aria-label="Scroll timeline right"
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-800 bg-slate-900 text-slate-300 hover:text-white transition-colors cursor-pointer"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Horizontal Scrollable Axis */}
      {filteredPoints.length === 0 ? (
        <div className="rounded-xl border border-slate-800/80 bg-slate-950/75 p-5 text-center space-y-2">
          <p className="text-xs text-slate-300">
            No turning points recorded yet in this category for the current innings.
          </p>
          <button
            type="button"
            onClick={() => setCategoryFilter('all')}
            className="rounded-lg border border-cyan-500/40 bg-slate-900 px-3 py-1.5 text-xs font-semibold text-cyan-300 hover:text-white cursor-pointer whitespace-nowrap shrink-0"
          >
            Show All Turning Points
          </button>
        </div>
      ) : (
        <div className="relative">
          {/* Connecting Horizontal Axis Rail */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute left-4 right-4 top-[22px] h-px bg-gradient-to-r from-slate-800 via-cyan-500/40 to-slate-800"
          />

          <div
            ref={scrollContainerRef}
            className="flex items-stretch gap-3 overflow-x-auto pb-2 pt-1 scroll-smooth"
          >
            {filteredPoints.map((pt) => {
              const visuals = getCategoryVisuals(pt.category);
              const IconComp = visuals.Icon;
              const isSelected = inspectedPoint?.id === pt.id;
              const shiftPositive = pt.winProbShiftPct >= 0;

              return (
                <button
                  key={pt.id}
                  type="button"
                  onMouseEnter={() => setActivePointId(pt.id)}
                  onClick={() => {
                    cricketAudio.playUiClick();
                    setActivePointId(pt.id);
                  }}
                  className={`group relative min-w-[235px] max-w-[255px] shrink-0 text-left rounded-xl border p-3 transition-transform duration-150 hover:-translate-y-0.5 cursor-pointer ${
                    isSelected
                      ? visuals.nodeActive
                      : `${visuals.nodeBorder} bg-slate-950/90 hover:bg-slate-900/90`
                  }`}
                >
                  {/* Axis Anchor Node & Over Label */}
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="inline-flex items-center gap-1.5 text-[11px] font-mono font-bold text-white tabular-nums">
                      <span className={`h-2.5 w-2.5 rounded-full ${visuals.dotBg} shrink-0`} />
                      <span>{pt.overBallLabel}</span>
                    </span>

                    <span
                      className={`text-[11px] font-mono font-bold tabular-nums ${
                        shiftPositive ? 'text-emerald-300' : 'text-rose-300'
                      }`}
                    >
                      {shiftPositive ? `+${pt.winProbShiftPct}%` : `${pt.winProbShiftPct}%`} WP
                    </span>
                  </div>

                  {/* Category Kicker */}
                  <div className={`flex items-center gap-1 text-[11px] font-semibold ${visuals.accentText}`}>
                    <IconComp className="h-3 w-3 shrink-0" />
                    <span className="truncate">{pt.categoryLabel}</span>
                  </div>

                  {/* Headline */}
                  <p className="mt-1 text-xs font-bold text-white line-clamp-2 leading-snug">
                    {pt.headline}
                  </p>

                  {/* Score Snapshot */}
                  <div className="mt-2 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] font-mono text-slate-400 tabular-nums">
                    <span>{pt.scoreSnapshot}</span>
                    <span>Win: {pt.winProbAfterPct}%</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Hoverable / Active Turning Point Tactical Insight Panel */}
      {inspectedPoint && (
        <div className="rounded-xl border border-slate-800/90 bg-slate-950/95 p-3.5 flex flex-col lg:flex-row lg:items-center justify-between gap-3 text-xs">
          <div className="space-y-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <TrendingUp className="h-3.5 w-3.5 text-cyan-400 shrink-0" />
              <span className="font-mono font-bold text-cyan-300 tabular-nums">
                {inspectedPoint.overBallLabel}
              </span>
              <span aria-hidden="true" className="text-slate-600">
                ·
              </span>
              <strong className="text-white">{inspectedPoint.headline}</strong>
              <span aria-hidden="true" className="text-slate-600">
                ·
              </span>
              <span className="font-mono text-slate-300 tabular-nums">
                {inspectedPoint.scoreSnapshot}
              </span>
            </div>
            <p className="text-slate-300 leading-relaxed">{inspectedPoint.insightSummary}</p>
            <p className="text-[11px] text-slate-400">{inspectedPoint.tacticalContext}</p>
          </div>

          {onInspectPlayer && (inspectedPoint.involvedBatter || inspectedPoint.involvedBowler) && (
            <div className="flex flex-wrap items-center gap-2 shrink-0">
              {inspectedPoint.involvedBatter && (
                <button
                  type="button"
                  onClick={() => {
                    cricketAudio.playUiClick();
                    onInspectPlayer(inspectedPoint.involvedBatter!);
                  }}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs font-semibold text-slate-200 hover:border-cyan-400/60 hover:text-white transition-colors cursor-pointer whitespace-nowrap shrink-0"
                >
                  <User className="h-3.5 w-3.5 text-cyan-400 shrink-0" />
                  <span>{inspectedPoint.involvedBatter.name}</span>
                </button>
              )}
              {inspectedPoint.involvedBowler && (
                <button
                  type="button"
                  onClick={() => {
                    cricketAudio.playUiClick();
                    onInspectPlayer(inspectedPoint.involvedBowler!);
                  }}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs font-semibold text-slate-200 hover:border-amber-400/60 hover:text-white transition-colors cursor-pointer whitespace-nowrap shrink-0"
                >
                  <User className="h-3.5 w-3.5 text-amber-400 shrink-0" />
                  <span>{inspectedPoint.involvedBowler.name}</span>
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </section>
  );
};
