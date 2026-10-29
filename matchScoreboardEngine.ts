import { BallEvent, Player, Stadium, Team } from '../types/cricket';
import { CricketIntelligenceEngine, MatchContext } from './simulationEngine';

export interface BatterScorecardRow {
  battingPosition: number;
  player: Player;
  runs: number;
  balls: number;
  fours: number;
  sixes: number;
  dots: number;
  ones: number;
  twos: number;
  threes: number;
  strikeRate: number;
  isStriker: boolean;
  isNonStriker: boolean;
  isAtCrease: boolean;
  status: 'striker' | 'non_striker' | 'dismissed' | 'not_out' | 'yet_to_bat';
  dismissalText: string;
  wicketType?: BallEvent['wicketType'];
  dismissedByBowler?: string;
  fielderName?: string;
}

export interface BowlerScorecardRow {
  player: Player;
  overs: string;
  legalBalls: number;
  maidens: number;
  runsConceded: number;
  wickets: number;
  economy: number;
  dots: number;
  dotPercent: number;
  fours: number;
  sixes: number;
  wides: number;
  noBalls: number;
  strikeRate: number | null;
  isCurrentBowler: boolean;
  maxOversQuota: number;
  canBowlNextOver: boolean;
}

export interface ExtrasBreakdown {
  byes: number;
  legByes: number;
  wides: number;
  noBalls: number;
  penalty: number;
  total: number;
}

export interface PartnershipEntry {
  standNumber: number;
  batterA: Player;
  batterB: Player;
  batterARuns: number;
  batterABalls: number;
  batterBRuns: number;
  batterBBalls: number;
  extras: number;
  totalRuns: number;
  totalBalls: number;
  runRate: number;
  isUnbroken: boolean;
  endScore?: string;
  endOver?: string;
}

export interface FallOfWicketRecord {
  wicketNumber: number;
  scoreAtDismissal: number;
  oversAtDismissal: string;
  batter: Player;
  bowler: Player;
  batterRuns: number;
  batterBalls: number;
  dismissalType: string;
  wicketType?: BallEvent['wicketType'];
  deliverySpeedKmh: number;
  deliveryType: string;
  deliveryLength: string;
  partnershipRuns: number;
  partnershipBalls: number;
  bowlerFiguresAtDismissal: string;
  hawkeyeImpact: string;
}

export interface OverByOverRecord {
  overNumber: number; // 1-indexed (1..20)
  bowler: Player;
  deliveries: BallEvent[];
  legalBallsInOver: number;
  runsInOver: number;
  bowlerRunsInOver: number;
  wicketsInOver: number;
  extrasInOver: number;
  boundariesInOver: number;
  isMaiden: boolean;
  cumulativeRuns: number;
  cumulativeWickets: number;
  cumulativeOvers: string;
  cumulativeRunRate: number;
}

export interface AccountingVerification {
  isValid: boolean;
  teamTotal: number;
  battersRunsSum: number;
  extrasTotal: number;
  bowlersRunsConcededSum: number;
  byesAndLegByes: number;
  legalBallsTotal: number;
  bowlersLegalBallsSum: number;
  wicketsTotal: number;
  bowlerWicketsPlusRunOuts: number;
}

export interface ComputedInningsScorecard {
  inningsNumber: 1 | 2 | 3 | 4;
  isSuperOver: boolean;
  battingTeam: Team;
  bowlingTeam: Team;
  status: 'upcoming' | 'live' | 'completed';
  runs: number;
  wickets: number;
  legalBalls: number;
  maxOvers: number;
  maxBalls: number;
  maxWickets: number;
  oversFormatted: string;
  currentRunRate: number;
  targetRuns?: number;
  runsRequired: number;
  ballsRemaining: number;
  requiredRunRate: number;
  projectedScore: number;
  freeHitPending: boolean;
  strikerRow: BatterScorecardRow | null;
  nonStrikerRow: BatterScorecardRow | null;
  currentBowlerRow: BowlerScorecardRow | null;
  batters: BatterScorecardRow[];
  yetToBat: BatterScorecardRow[];
  bowlers: BowlerScorecardRow[];
  extras: ExtrasBreakdown;
  partnerships: PartnershipEntry[];
  activePartnership: PartnershipEntry | null;
  fallOfWickets: FallOfWicketRecord[];
  overSummaries: OverByOverRecord[];
  displayOverNumber: number;
  isDisplayOverComplete: boolean;
  currentOverDeliveries: BallEvent[];
  lastSixDeliveries: BallEvent[];
  accounting: AccountingVerification;
}

export interface InningsEngineState {
  inningsNumber: 1 | 2 | 3 | 4;
  isSuperOver: boolean;
  battingTeam: Team;
  bowlingTeam: Team;
  battingXI: Player[];
  bowlingXI: Player[];
  events: BallEvent[];
  seenEventIds: Record<string, true>;
  strikerId: string;
  nonStrikerId: string;
  currentBowlerId: string;
  previousOverBowlerId: string | null;
  nextBatterIndex: number; // index into battingXI for next incoming batter
  battedPlayerIds: string[]; // preserves order of appearance at crease
  runs: number;
  wickets: number;
  legalBalls: number;
  freeHitPending: boolean;
  maxOvers: number;
  maxWickets: number;
  targetRuns?: number;
  status: 'upcoming' | 'live' | 'completed';
  winProbHistory: number[];
}

const ROLE_BATTING_PRIORITY: Record<string, number> = {
  'Top-Order Batter': 1,
  'Wicketkeeper Batter': 2,
  'Middle-Order Batter': 3,
  'All-Rounder': 4,
  'Spin Bowler': 5,
  'Pace Bowler': 6,
};

/**
 * Builds an authentic 11-player batting order from a Team's squad (or custom selected IDs),
 * placing specialist top-order batters first, middle-order & all-rounders next, and tailenders at 8–11.
 */
export function buildOrderedPlayingXI(team: Team, customPlayerIds?: string[]): Player[] {
  const pool =
    customPlayerIds && customPlayerIds.length > 0
      ? customPlayerIds
          .map((id) => team.squad.find((p) => p.id === id))
          .filter((p): p is Player => Boolean(p))
      : [...team.squad];

  // Fill up to 11 if squad has 11+, or keep available squad if smaller
  const selected = pool.slice(0, 11);
  if (selected.length < 11) {
    for (const candidate of team.squad) {
      if (selected.length >= 11) break;
      if (!selected.some((s) => s.id === candidate.id)) {
        selected.push(candidate);
      }
    }
  }

  // If custom order wasn't explicitly sorted, sort into authentic cricket batting positions
  if (!customPlayerIds) {
    selected.sort((a, b) => {
      const prioA = ROLE_BATTING_PRIORITY[a.role] ?? 4;
      const prioB = ROLE_BATTING_PRIORITY[b.role] ?? 4;
      if (prioA !== prioB) return prioA - prioB;
      return (b.stats?.runs || 0) - (a.stats?.runs || 0);
    });
  }

  return selected;
}

/**
 * Returns the specialist bowling attack (Pacers, Spinners, All-Rounders) from a Playing XI,
 * ensuring at least 5 bowlers are available for 20-over rotation.
 */
export function getBowlingAttackPool(bowlingXI: Player[]): Player[] {
  const specialists = bowlingXI.filter(
    (p) =>
      p.role === 'Pace Bowler' ||
      p.role === 'Spin Bowler' ||
      p.role === 'All-Rounder'
  );

  // Order: Opening Pacers first, then Spinners & All-Rounders
  specialists.sort((a, b) => {
    const aPace = a.role === 'Pace Bowler' ? 0 : a.role === 'All-Rounder' ? 1 : 2;
    const bPace = b.role === 'Pace Bowler' ? 0 : b.role === 'All-Rounder' ? 1 : 2;
    if (aPace !== bPace) return aPace - bPace;
    return b.rating - a.rating;
  });

  if (specialists.length >= 5) return specialists;

  const extras = bowlingXI
    .filter((p) => !specialists.some((s) => s.id === p.id) && !p.role.includes('Wicketkeeper'))
    .sort((a, b) => (b.stats?.wickets || 0) - (a.stats?.wickets || 0));

  return [...specialists, ...extras].slice(0, Math.min(6, bowlingXI.length));
}

/**
 * Selects the optimal next bowler at the start of a new over, obeying cricket rules:
 * 1. Cannot bowl two consecutive overs (`id !== previousBowlerId`)
 * 2. Cannot exceed max overs quota (`Math.ceil(maxOvers / 5)`, i.e. 4 overs = 24 legal balls in T20)
 */
export function selectNextOverBowler(
  bowlingXI: Player[],
  events: BallEvent[],
  previousBowlerId: string | null,
  overNumberZeroIndexed: number,
  maxOvers: number
): Player {
  const pool = getBowlingAttackPool(bowlingXI);
  const maxLegalBallsPerBowler = maxOvers <= 1 ? 6 : Math.ceil(maxOvers / 5) * 6;

  const legalBallsByBowler: Record<string, number> = {};
  events.forEach((ev) => {
    const isLegal = ev.isLegalDelivery ?? (ev.outcome !== 'WD' && ev.outcome !== 'NB');
    if (isLegal && ev.bowler?.id) {
      legalBallsByBowler[ev.bowler.id] = (legalBallsByBowler[ev.bowler.id] || 0) + 1;
    }
  });

  const eligible = pool.filter(
    (b) =>
      b.id !== previousBowlerId &&
      (legalBallsByBowler[b.id] || 0) < maxLegalBallsPerBowler
  );

  if (eligible.length === 0) {
    // Fallback if squad has fewer than 5 players in custom data: pick any non-consecutive player
    const fallback = bowlingXI.find((b) => b.id !== previousBowlerId) || pool[0] || bowlingXI[0];
    return fallback;
  }

  // Phase-aware selection: Powerplay (0-5) & Death (15-19) prefer Pacers; Middle (6-14) prefers Spinners/All-Rounders
  const isPowerplay = overNumberZeroIndexed < 6;
  const isDeath = overNumberZeroIndexed >= Math.max(1, maxOvers - 5);

  if (isPowerplay || isDeath) {
    const pacers = eligible.filter(
      (b) => b.role === 'Pace Bowler' || b.bowlingStyle.toLowerCase().includes('fast')
    );
    if (pacers.length > 0) {
      return pacers[overNumberZeroIndexed % pacers.length];
    }
  } else {
    const spinners = eligible.filter(
      (b) =>
        b.role === 'Spin Bowler' ||
        b.bowlingStyle.toLowerCase().includes('spin') ||
        b.role === 'All-Rounder'
    );
    if (spinners.length > 0) {
      return spinners[overNumberZeroIndexed % spinners.length];
    }
  }

  return eligible[overNumberZeroIndexed % eligible.length];
}

/**
 * Creates a fresh, empty InningsEngineState ready for ball 0.1 (or upcoming).
 */
export function createInitialInningsState(params: {
  inningsNumber: 1 | 2 | 3 | 4;
  battingTeam: Team;
  bowlingTeam: Team;
  battingXI?: Player[];
  bowlingXI?: Player[];
  maxOvers?: number;
  targetRuns?: number;
  status?: 'upcoming' | 'live' | 'completed';
}): InningsEngineState {
  const isSuperOver = params.inningsNumber >= 3 || (params.maxOvers ?? 20) === 1;
  const maxOvers = params.maxOvers ?? (isSuperOver ? 1 : 20);
  const maxWickets = isSuperOver ? 2 : Math.max(1, (params.battingXI?.length || params.battingTeam.squad.length) - 1);

  const battingXI =
    params.battingXI && params.battingXI.length >= 2
      ? params.battingXI
      : buildOrderedPlayingXI(params.battingTeam);
  const bowlingXI =
    params.bowlingXI && params.bowlingXI.length >= 2
      ? params.bowlingXI
      : buildOrderedPlayingXI(params.bowlingTeam);

  const openerStriker = battingXI[0];
  const openerNonStriker = battingXI[1] || battingXI[0];
  const openingBowler = selectNextOverBowler(bowlingXI, [], null, 0, maxOvers);

  return {
    inningsNumber: params.inningsNumber,
    isSuperOver,
    battingTeam: params.battingTeam,
    bowlingTeam: params.bowlingTeam,
    battingXI,
    bowlingXI,
    events: [],
    seenEventIds: {},
    strikerId: openerStriker.id,
    nonStrikerId: openerNonStriker.id,
    currentBowlerId: openingBowler.id,
    previousOverBowlerId: null,
    nextBatterIndex: 2,
    battedPlayerIds: [openerStriker.id, openerNonStriker.id],
    runs: 0,
    wickets: 0,
    legalBalls: 0,
    freeHitPending: false,
    maxOvers,
    maxWickets: Math.min(10, maxWickets),
    targetRuns: params.targetRuns,
    status: params.status ?? 'live',
    winProbHistory: [50],
  };
}

/**
 * Formats official cricket dismissal notation (e.g. `c †Pant b Bumrah`, `lbw b Starc`, `run out (Jadeja)`).
 */
export function formatCricketDismissal(ball: BallEvent, bowlingXI: Player[]): string {
  const bowlerLast = ball.bowler?.name || 'Bowler';
  const fielder = ball.fielder;
  const isKeeper =
    fielder &&
    (fielder.role.includes('Wicketkeeper') ||
      bowlingXI.find((p) => p.id === fielder.id)?.role.includes('Wicketkeeper'));
  const fielderLabel = fielder ? `${isKeeper ? '†' : ''}${fielder.name}` : 'Fielder';

  switch (ball.wicketType) {
    case 'Bowled':
      return `b ${bowlerLast}`;
    case 'LBW':
      return `lbw b ${bowlerLast}`;
    case 'Stumped':
      return `st ${isKeeper ? fielderLabel : `†${fielderLabel}`} b ${bowlerLast}`;
    case 'Run Out':
      return `run out (${fielder ? fielder.name : 'Direct Hit'})`;
    case 'Caught':
    default:
      if (fielder && fielder.id === ball.bowler?.id) {
        return `c & b ${bowlerLast}`;
      }
      return `c ${fielderLabel} b ${bowlerLast}`;
  }
}

/**
 * Pure reducer that applies a single authoritative BallEvent to InningsEngineState.
 * Prevents duplicate event processing via seenEventIds and enforces all cricket laws:
 * - Legal balls vs Wides / No-Balls / Byes / Leg-Byes
 * - Strike rotation on odd physical runs completed
 * - Wicket batter replacement (striker or non-striker run-out)
 * - Over completion end swap & automatic bowler rotation
 * - Innings completion (all out, overs completed, or target reached)
 */
export function applyDeliveryToInningsState(
  prevState: InningsEngineState,
  event: BallEvent
): InningsEngineState {
  if (prevState.status === 'completed') {
    return prevState;
  }

  const eventKey = event.eventId || `legacy-${prevState.events.length}-${event.totalBalls}-${event.commentary}`;
  if (prevState.seenEventIds[eventKey]) {
    // Duplicate event guard: never apply the same delivery twice
    return prevState;
  }

  const isLegal = event.isLegalDelivery ?? (event.outcome !== 'WD' && event.outcome !== 'NB');
  const nextRuns = prevState.runs + (event.runsScored || 0);
  const nextWickets = prevState.wickets + (event.isWicket ? 1 : 0);
  const nextLegalBalls = prevState.legalBalls + (isLegal ? 1 : 0);

  let nextStrikerId = prevState.strikerId;
  let nextNonStrikerId = prevState.nonStrikerId;
  let nextBatterIdx = prevState.nextBatterIndex;
  const nextBattedIds = [...prevState.battedPlayerIds];

  // Physical runs completed between the wickets (determines crossing)
  const physicalRuns =
    event.physicalRunsCompleted !== undefined
      ? event.physicalRunsCompleted
      : event.extraType === 'wide'
      ? Math.max(0, (event.extraRuns || 1) - 1)
      : event.extraType === 'noBall'
      ? (event.batterRuns || 0) === 4 || (event.batterRuns || 0) === 6
        ? 0
        : event.batterRuns || 0
      : event.runsScored === 4 || event.runsScored === 6
      ? 0
      : event.runsScored || 0;

  if (physicalRuns % 2 === 1) {
    const tmp = nextStrikerId;
    nextStrikerId = nextNonStrikerId;
    nextNonStrikerId = tmp;
  }

  // Handle dismissal & incoming replacement batter
  if (event.isWicket && nextWickets < prevState.maxWickets) {
    const dismissedId = event.dismissedPlayer?.id || prevState.strikerId;
    const incomingBatter = prevState.battingXI[nextBatterIdx];
    if (incomingBatter) {
      nextBatterIdx += 1;
      if (!nextBattedIds.includes(incomingBatter.id)) {
        nextBattedIds.push(incomingBatter.id);
      }
      if (dismissedId === nextNonStrikerId) {
        nextNonStrikerId = incomingBatter.id;
      } else {
        nextStrikerId = incomingBatter.id;
      }
    }
  }

  // Check innings completion conditions
  const maxBalls = prevState.maxOvers * 6;
  const targetReached = prevState.targetRuns !== undefined && prevState.targetRuns > 0 && nextRuns >= prevState.targetRuns;
  const allOut = nextWickets >= prevState.maxWickets;
  const oversFinished = nextLegalBalls >= maxBalls;
  const isCompleted = targetReached || allOut || oversFinished;

  // Handle over completion (6th legal ball of the over)
  const isEndOfOver = isLegal && nextLegalBalls > 0 && nextLegalBalls % 6 === 0;
  let nextBowlerId = prevState.currentBowlerId;
  let nextPrevOverBowlerId = prevState.previousOverBowlerId;

  const updatedEvents = [...prevState.events, { ...event, eventId: eventKey }];

  if (isEndOfOver && !isCompleted) {
    // Batters swap ends at the end of the over
    const tmp = nextStrikerId;
    nextStrikerId = nextNonStrikerId;
    nextNonStrikerId = tmp;

    nextPrevOverBowlerId = prevState.currentBowlerId;
    const nextOverZeroIdx = Math.floor(nextLegalBalls / 6);
    const nextBowler = selectNextOverBowler(
      prevState.bowlingXI,
      updatedEvents,
      prevState.currentBowlerId,
      nextOverZeroIdx,
      prevState.maxOvers
    );
    nextBowlerId = nextBowler.id;
  }

  // Free hit carries onto next ball if No-Ball, or continues if a Wide is bowled on a Free Hit!
  const nextFreeHit =
    event.extraType === 'noBall'
      ? true
      : isLegal
      ? false
      : prevState.freeHitPending;

  return {
    ...prevState,
    events: updatedEvents,
    seenEventIds: {
      ...prevState.seenEventIds,
      [eventKey]: true,
    },
    strikerId: nextStrikerId,
    nonStrikerId: nextNonStrikerId,
    currentBowlerId: nextBowlerId,
    previousOverBowlerId: nextPrevOverBowlerId,
    nextBatterIndex: nextBatterIdx,
    battedPlayerIds: nextBattedIds,
    runs: nextRuns,
    wickets: nextWickets,
    legalBalls: nextLegalBalls,
    freeHitPending: nextFreeHit,
    status: isCompleted ? 'completed' : 'live',
    winProbHistory: [...prevState.winProbHistory, event.winProbA],
  };
}

/**
 * Rebuilds InningsEngineState cleanly from its events list (used when DRS overturns a wicket,
 * ensuring 100% atomic consistency across batters, bowlers, wickets, partnerships, and FoW).
 */
export function overturnDismissalInInningsState(
  state: InningsEngineState,
  eventIndex: number,
  correctedWinProb: number,
  correctedDelta: number,
  wicketsOutcomeLabel: string
): InningsEngineState {
  if (eventIndex < 0 || eventIndex >= state.events.length) return state;

  const freshBase = createInitialInningsState({
    inningsNumber: state.inningsNumber,
    battingTeam: state.battingTeam,
    bowlingTeam: state.bowlingTeam,
    battingXI: state.battingXI,
    bowlingXI: state.bowlingXI,
    maxOvers: state.maxOvers,
    targetRuns: state.targetRuns,
    status: 'live',
  });

  let rebuilt = freshBase;
  state.events.forEach((ev, idx) => {
    if (idx === eventIndex) {
      const reprievedScore = rebuilt.runs + (ev.runsScored || 0);
      const reprievedWickets = rebuilt.wickets;
      const modifiedEvent: BallEvent = {
        ...ev,
        isWicket: false,
        wicketType: undefined,
        dismissedPlayer: undefined,
        outcome: (ev.runsScored || 0) === 0 ? '0' : ev.outcome,
        displayToken: (ev.runsScored || 0) === 0 ? '•' : ev.displayToken,
        drsReviewResult: 'OVERTURNED',
        scoreAtBall: `${reprievedScore}/${reprievedWickets}`,
        winProbA: correctedWinProb,
        winProbDelta: correctedDelta,
        commentary: `${ev.commentary} [DRS OVERTURNED — ${wicketsOutcomeLabel}, NOT OUT!]`,
      };
      rebuilt = applyDeliveryToInningsState(rebuilt, modifiedEvent);
    } else {
      rebuilt = applyDeliveryToInningsState(rebuilt, ev);
    }
  });

  return rebuilt;
}

/**
 * Marks a delivery's DRS review as UPHELD in InningsEngineState without duplicating events.
 */
export function markDrsUpheldInInningsState(
  state: InningsEngineState,
  eventIndex: number,
  verdictTag: string
): InningsEngineState {
  if (eventIndex < 0 || eventIndex >= state.events.length) return state;
  const updatedEvents = state.events.map((ev, idx) =>
    idx === eventIndex
      ? {
          ...ev,
          drsReviewResult: 'UPHELD' as const,
          commentary: ev.drsReviewResult
            ? ev.commentary
            : `${ev.commentary} [DRS UPHELD — ${verdictTag}]`,
        }
      : ev
  );
  return {
    ...state,
    events: updatedEvents,
  };
}

/**
 * Rebuilds InningsEngineState when a bowling team DRS appeal overturns NOT OUT -> OUT on the last ball.
 */
export function convertDeliveryToWicketInInningsState(
  state: InningsEngineState,
  eventIndex: number,
  explanation: string
): InningsEngineState {
  if (eventIndex < 0 || eventIndex >= state.events.length) return state;

  const freshBase = createInitialInningsState({
    inningsNumber: state.inningsNumber,
    battingTeam: state.battingTeam,
    bowlingTeam: state.bowlingTeam,
    battingXI: state.battingXI,
    bowlingXI: state.bowlingXI,
    maxOvers: state.maxOvers,
    targetRuns: state.targetRuns,
    status: 'live',
  });

  let rebuilt = freshBase;
  state.events.forEach((ev, idx) => {
    if (idx === eventIndex) {
      const wktsAfter = rebuilt.wickets + 1;
      const modifiedEvent: BallEvent = {
        ...ev,
        isWicket: true,
        wicketType: 'LBW',
        dismissedPlayer: ev.batter,
        outcome: 'W',
        displayToken: 'W',
        runsScored: 0,
        batterRuns: 0,
        extraRuns: 0,
        bowlerRunsConceded: 0,
        drsReviewResult: 'OVERTURNED',
        scoreAtBall: `${rebuilt.runs}/${wktsAfter}`,
        commentary: `${ev.commentary} [DRS OVERTURNED — OUT LBW! ${explanation}]`,
      };
      rebuilt = applyDeliveryToInningsState(rebuilt, modifiedEvent);
    } else {
      rebuilt = applyDeliveryToInningsState(rebuilt, ev);
    }
  });

  return rebuilt;
}

/**
 * Simulates one authoritative delivery for the given InningsEngineState and returns both
 * the new state and the generated BallEvent.
 */
export function simulateSingleInningsDelivery(
  inningsState: InningsEngineState,
  stadium: Stadium,
  dewActive: boolean,
  userTactics: MatchContext['userTactics']
): { nextInnings: InningsEngineState; event: BallEvent } {
  const striker =
    inningsState.battingXI.find((p) => p.id === inningsState.strikerId) || inningsState.battingXI[0];
  const nonStriker =
    inningsState.battingXI.find((p) => p.id === inningsState.nonStrikerId) || inningsState.battingXI[1] || striker;
  const bowler =
    inningsState.bowlingXI.find((p) => p.id === inningsState.currentBowlerId) || inningsState.bowlingXI[0];

  const prevProb =
    inningsState.winProbHistory[inningsState.winProbHistory.length - 1] ?? 50;

  const context: MatchContext = {
    teamA: inningsState.battingTeam,
    teamB: inningsState.bowlingTeam,
    stadium,
    targetRuns: inningsState.targetRuns,
    pitchFactor:
      stadium.pitchType === 'Pace & Bounce'
        ? 'Pace'
        : stadium.pitchType === 'Slow & Turning' || stadium.pitchType === 'Dry Spin-Friendly'
        ? 'Spin'
        : 'True',
    dewActive,
    userTactics,
  };

  const event = CricketIntelligenceEngine.simulateBall(
    inningsState.legalBalls,
    inningsState.runs,
    inningsState.wickets,
    inningsState.targetRuns ?? 0,
    bowler,
    striker,
    context,
    prevProb,
    {
      inningsNumber: inningsState.inningsNumber,
      totalOvers: inningsState.maxOvers,
      maxWickets: inningsState.maxWickets,
      nonStriker,
      bowlingXI: inningsState.bowlingXI,
      isFreeHit: inningsState.freeHitPending,
    }
  );

  const nextInnings = applyDeliveryToInningsState(inningsState, event);
  return { nextInnings, event };
}

/**
 * Simulates an innings to completion from its current ball (used for "Quick Sim 1st Innings"
 * so Innings 1 has 100% genuine ball-by-ball authoritative statistics with zero hardcoded values).
 */
export function simulateInningsToCompletion(
  initialState: InningsEngineState,
  stadium: Stadium,
  dewActive: boolean,
  userTactics: MatchContext['userTactics']
): InningsEngineState {
  let current: InningsEngineState = {
    ...initialState,
    status: 'live' as InningsEngineState['status'],
  };
  let safetyCounter = 0;
  while (current.status !== 'completed' && safetyCounter < 220) {
    safetyCounter += 1;
    const { nextInnings } = simulateSingleInningsDelivery(current, stadium, dewActive, userTactics);
    current = nextInnings;
  }
  return current;
}

/**
 * Deterministically computes the entire IPL Broadcast & Official Scorecard from InningsEngineState.
 * Zero independent/random state — every number reconciles to the exact delivery ledger.
 */
export function computeInningsScorecard(state: InningsEngineState): ComputedInningsScorecard {
  const maxBalls = state.maxOvers * 6;

  // 1. Initialize Batter Accumulators for all 11 players in batting order
  const batterAcc = new Map<
    string,
    {
      player: Player;
      initialPosition: number;
      runs: number;
      balls: number;
      fours: number;
      sixes: number;
      dots: number;
      ones: number;
      twos: number;
      threes: number;
      isDismissed: boolean;
      dismissalText: string;
      wicketType?: BallEvent['wicketType'];
      dismissedByBowler?: string;
      fielderName?: string;
    }
  >();

  state.battingXI.forEach((p, idx) => {
    batterAcc.set(p.id, {
      player: p,
      initialPosition: idx + 1,
      runs: 0,
      balls: 0,
      fours: 0,
      sixes: 0,
      dots: 0,
      ones: 0,
      twos: 0,
      threes: 0,
      isDismissed: false,
      dismissalText: 'yet to bat',
    });
  });

  // 2. Initialize Bowler Accumulators
  const bowlerAcc = new Map<
    string,
    {
      player: Player;
      legalBalls: number;
      runsConceded: number;
      wickets: number;
      dots: number;
      fours: number;
      sixes: number;
      wides: number;
      noBalls: number;
      overBuckets: Map<number, { legalBalls: number; bowlerRuns: number }>;
    }
  >();

  const ensureBowler = (b: Player) => {
    if (!bowlerAcc.has(b.id)) {
      bowlerAcc.set(b.id, {
        player: b,
        legalBalls: 0,
        runsConceded: 0,
        wickets: 0,
        dots: 0,
        fours: 0,
        sixes: 0,
        wides: 0,
        noBalls: 0,
        overBuckets: new Map(),
      });
    }
    return bowlerAcc.get(b.id)!;
  };

  // Pre-seed current bowler so 0.0 overs still shows active bowler figures (0.0-0-0-0)
  const activeBowlerObj = state.bowlingXI.find((p) => p.id === state.currentBowlerId);
  if (activeBowlerObj && state.status !== 'upcoming') {
    ensureBowler(activeBowlerObj);
  }

  // 3. Extras, Partnerships, Fall of Wickets, and Over-by-Over Accumulators
  const extras: ExtrasBreakdown = {
    byes: 0,
    legByes: 0,
    wides: 0,
    noBalls: 0,
    penalty: 0,
    total: 0,
  };

  let runningTeamRuns = 0;
  let runningTeamWickets = 0;
  let runningLegalBalls = 0;
  let runOutCount = 0;

  const fallOfWickets: FallOfWicketRecord[] = [];
  const partnerships: PartnershipEntry[] = [];

  // Track active stand pair
  let standNumber = 1;
  let standBatterA = state.battingXI[0];
  let standBatterB = state.battingXI[1] || state.battingXI[0];
  let standARuns = 0;
  let standABalls = 0;
  let standBRuns = 0;
  let standBBalls = 0;
  let standExtras = 0;
  let standTotalRuns = 0;
  let standTotalBalls = 0;
  let simNextBatterCursor = 2;

  const overMap = new Map<number, { bowler: Player; deliveries: BallEvent[] }>();

  state.events.forEach((ev) => {
    const isLegal = ev.isLegalDelivery ?? (ev.outcome !== 'WD' && ev.outcome !== 'NB');
    const extraType =
      ev.extraType !== undefined
        ? ev.extraType
        : ev.outcome === 'WD'
        ? 'wide'
        : ev.outcome === 'NB'
        ? 'noBall'
        : ev.outcome === 'B'
        ? 'bye'
        : ev.outcome === 'LB'
        ? 'legBye'
        : null;

    const batRuns =
      ev.batterRuns !== undefined
        ? ev.batterRuns
        : extraType === 'wide' || extraType === 'bye' || extraType === 'legBye'
        ? 0
        : extraType === 'noBall'
        ? Math.max(0, (ev.runsScored || 1) - 1)
        : ev.runsScored || 0;

    const extRuns =
      ev.extraRuns !== undefined
        ? ev.extraRuns
        : extraType === 'wide' || extraType === 'bye' || extraType === 'legBye'
        ? ev.runsScored || 0
        : extraType === 'noBall'
        ? 1
        : 0;

    const totalDeliveryRuns = batRuns + extRuns;
    const bowlerConceded =
      ev.bowlerRunsConceded !== undefined
        ? ev.bowlerRunsConceded
        : extraType === 'bye' || extraType === 'legBye'
        ? 0
        : totalDeliveryRuns;

    const overIndexZero = Math.floor(runningLegalBalls / 6);
    if (!overMap.has(overIndexZero)) {
      overMap.set(overIndexZero, { bowler: ev.bowler, deliveries: [] });
    }
    overMap.get(overIndexZero)!.bowler = ev.bowler;
    overMap.get(overIndexZero)!.deliveries.push(ev);

    // Batter stats: Wides do NOT count as ball faced; Legal balls AND No-Balls DO count as ball faced
    const countsAsBallFaced = extraType !== 'wide';
    if (ev.batter) {
      if (!batterAcc.has(ev.batter.id)) {
        batterAcc.set(ev.batter.id, {
          player: ev.batter,
          initialPosition: batterAcc.size + 1,
          runs: 0,
          balls: 0,
          fours: 0,
          sixes: 0,
          dots: 0,
          ones: 0,
          twos: 0,
          threes: 0,
          isDismissed: false,
          dismissalText: 'not out',
        });
      }
      const bStat = batterAcc.get(ev.batter.id)!;
      bStat.runs += batRuns;
      if (countsAsBallFaced) {
        bStat.balls += 1;
        if (batRuns === 0 && !extraType) bStat.dots += 1;
      }
      if (batRuns === 4) bStat.fours += 1;
      if (batRuns === 6) bStat.sixes += 1;
      if (batRuns === 1) bStat.ones += 1;
      if (batRuns === 2) bStat.twos += 1;
      if (batRuns === 3) bStat.threes += 1;
    }

    // Extras accounting
    if (extraType === 'wide') extras.wides += extRuns;
    else if (extraType === 'noBall') extras.noBalls += extRuns;
    else if (extraType === 'bye') extras.byes += extRuns;
    else if (extraType === 'legBye') extras.legByes += extRuns;
    extras.total = extras.wides + extras.noBalls + extras.byes + extras.legByes + extras.penalty;

    // Partnership accounting
    if (ev.batter?.id === standBatterA?.id) {
      standARuns += batRuns;
      if (countsAsBallFaced) standABalls += 1;
    } else if (ev.batter?.id === standBatterB?.id) {
      standBRuns += batRuns;
      if (countsAsBallFaced) standBBalls += 1;
    }
    standExtras += extRuns;
    standTotalRuns += totalDeliveryRuns;
    if (isLegal) standTotalBalls += 1;

    // Bowler accounting
    if (ev.bowler) {
      const bw = ensureBowler(ev.bowler);
      if (isLegal) bw.legalBalls += 1;
      bw.runsConceded += bowlerConceded;
      if (isLegal && totalDeliveryRuns === 0) bw.dots += 1;
      if (batRuns === 4) bw.fours += 1;
      if (batRuns === 6) bw.sixes += 1;
      if (extraType === 'wide') bw.wides += extRuns;
      if (extraType === 'noBall') bw.noBalls += 1;
      if (ev.isWicket && ev.wicketType !== 'Run Out') {
        bw.wickets += 1;
      }

      if (!bw.overBuckets.has(overIndexZero)) {
        bw.overBuckets.set(overIndexZero, { legalBalls: 0, bowlerRuns: 0 });
      }
      const bucket = bw.overBuckets.get(overIndexZero)!;
      if (isLegal) bucket.legalBalls += 1;
      bucket.bowlerRuns += bowlerConceded;
    }

    runningTeamRuns += totalDeliveryRuns;
    if (isLegal) runningLegalBalls += 1;

    // Wicket & Fall of Wickets accounting
    if (ev.isWicket) {
      runningTeamWickets += 1;
      if (ev.wicketType === 'Run Out') runOutCount += 1;

      const dismissedTarget = ev.dismissedPlayer || ev.batter;
      const dismissalStr = formatCricketDismissal(ev, state.bowlingXI);
      if (dismissedTarget && batterAcc.has(dismissedTarget.id)) {
        const dStat = batterAcc.get(dismissedTarget.id)!;
        dStat.isDismissed = true;
        dStat.dismissalText = dismissalStr;
        dStat.wicketType = ev.wicketType;
        dStat.dismissedByBowler = ev.bowler?.name;
        dStat.fielderName = ev.fielder?.name;
      }

      const ovAtWicket = `${Math.floor(runningLegalBalls / 6)}.${runningLegalBalls % 6}`;
      const dStatSnap = dismissedTarget ? batterAcc.get(dismissedTarget.id) : null;
      const bwSnap = ev.bowler ? bowlerAcc.get(ev.bowler.id) : null;
      const bwOversSnap = bwSnap
        ? `${Math.floor(bwSnap.legalBalls / 6)}.${bwSnap.legalBalls % 6}-0-${bwSnap.runsConceded}-${bwSnap.wickets}`
        : '1.0-0-8-1';

      fallOfWickets.push({
        wicketNumber: runningTeamWickets,
        scoreAtDismissal: runningTeamRuns,
        oversAtDismissal: ovAtWicket,
        batter: dismissedTarget || state.battingXI[0],
        bowler: ev.bowler || state.bowlingXI[0],
        batterRuns: dStatSnap?.runs ?? 0,
        batterBalls: dStatSnap?.balls ?? 1,
        dismissalType: dismissalStr,
        wicketType: ev.wicketType,
        deliverySpeedKmh: ev.speedKmh || 140,
        deliveryType: ev.deliveryType || 'Good Length Delivery',
        deliveryLength: ev.length || 'Good Length',
        partnershipRuns: standTotalRuns,
        partnershipBalls: standTotalBalls,
        bowlerFiguresAtDismissal: bwOversSnap,
        hawkeyeImpact:
          ev.wicketType === 'LBW'
            ? 'Pitching in line, impact in line, hitting middle stump'
            : ev.wicketType === 'Bowled'
            ? 'Seam deviation clipping top of off-stump'
            : dismissalStr,
      });

      // Finalize completed partnership stand
      partnerships.push({
        standNumber,
        batterA: standBatterA,
        batterB: standBatterB,
        batterARuns: standARuns,
        batterABalls: standABalls,
        batterBRuns: standBRuns,
        batterBBalls: standBBalls,
        extras: standExtras,
        totalRuns: standTotalRuns,
        totalBalls: standTotalBalls,
        runRate: standTotalBalls > 0 ? Number(((standTotalRuns / standTotalBalls) * 6).toFixed(2)) : 0,
        isUnbroken: false,
        endScore: `${runningTeamRuns}/${runningTeamWickets}`,
        endOver: ovAtWicket,
      });

      // Open next partnership stand if innings continues
      const nextIncoming = state.battingXI[simNextBatterCursor];
      if (nextIncoming && runningTeamWickets < state.maxWickets) {
        simNextBatterCursor += 1;
        standNumber += 1;
        const survivor =
          dismissedTarget?.id === standBatterA?.id ? standBatterB : standBatterA;
        standBatterA = survivor;
        standBatterB = nextIncoming;
        standARuns = 0;
        standABalls = 0;
        standBRuns = 0;
        standBBalls = 0;
        standExtras = 0;
        standTotalRuns = 0;
        standTotalBalls = 0;
      }
    }
  });

  // Push current unbroken stand if innings has started and isn't all out
  if (
    state.status !== 'upcoming' &&
    runningTeamWickets < state.maxWickets &&
    (state.events.length > 0 || state.status === 'live')
  ) {
    partnerships.push({
      standNumber,
      batterA: standBatterA,
      batterB: standBatterB,
      batterARuns: standARuns,
      batterABalls: standABalls,
      batterBRuns: standBRuns,
      batterBBalls: standBBalls,
      extras: standExtras,
      totalRuns: standTotalRuns,
      totalBalls: standTotalBalls,
      runRate: standTotalBalls > 0 ? Number(((standTotalRuns / standTotalBalls) * 6).toFixed(2)) : 0,
      isUnbroken: true,
    });
  }

  // Build ordered Batter Rows (batted players in order of appearance, followed by Yet to Bat)
  const appearedSet = new Set(state.battedPlayerIds);
  state.events.forEach((e) => {
    if (e.batter?.id) appearedSet.add(e.batter.id);
    if (e.nonStriker?.id) appearedSet.add(e.nonStriker.id);
    if (e.dismissedPlayer?.id) appearedSet.add(e.dismissedPlayer.id);
  });

  const orderedIds: string[] = [];
  state.battedPlayerIds.forEach((id) => {
    if (batterAcc.has(id) && !orderedIds.includes(id)) orderedIds.push(id);
  });
  state.battingXI.forEach((p) => {
    if (!orderedIds.includes(p.id)) orderedIds.push(p.id);
  });

  const allBatterRows: BatterScorecardRow[] = orderedIds.map((id, idx) => {
    const raw = batterAcc.get(id)!;
    const isStriker = state.status !== 'upcoming' && !raw.isDismissed && state.strikerId === id;
    const isNonStriker = state.status !== 'upcoming' && !raw.isDismissed && state.nonStrikerId === id;
    const hasBatted = state.status !== 'upcoming' && appearedSet.has(id);

    let rowStatus: BatterScorecardRow['status'] = 'yet_to_bat';
    let dismissalText = 'yet to bat';

    if (raw.isDismissed) {
      rowStatus = 'dismissed';
      dismissalText = raw.dismissalText;
    } else if (state.status === 'completed' && hasBatted) {
      rowStatus = 'not_out';
      dismissalText = 'not out';
    } else if (isStriker) {
      rowStatus = 'striker';
      dismissalText = 'batting *';
    } else if (isNonStriker) {
      rowStatus = 'non_striker';
      dismissalText = 'batting';
    } else if (hasBatted) {
      rowStatus = 'not_out';
      dismissalText = 'not out';
    }

    const sr = raw.balls > 0 ? Number(((raw.runs / raw.balls) * 100).toFixed(1)) : 0;

    return {
      battingPosition: idx + 1,
      player: raw.player,
      runs: raw.runs,
      balls: raw.balls,
      fours: raw.fours,
      sixes: raw.sixes,
      dots: raw.dots,
      ones: raw.ones,
      twos: raw.twos,
      threes: raw.threes,
      strikeRate: sr,
      isStriker,
      isNonStriker,
      isAtCrease: isStriker || isNonStriker,
      status: rowStatus,
      dismissalText,
      wicketType: raw.wicketType,
      dismissedByBowler: raw.dismissedByBowler,
      fielderName: raw.fielderName,
    };
  });

  const batters = allBatterRows.filter((b) => b.status !== 'yet_to_bat');
  const yetToBat = allBatterRows.filter((b) => b.status === 'yet_to_bat');

  // Build Bowler Rows
  const maxQuotaOvers = state.maxOvers <= 1 ? 1 : Math.ceil(state.maxOvers / 5);
  const bowlers: BowlerScorecardRow[] = Array.from(bowlerAcc.values()).map((bw) => {
    let maidens = 0;
    bw.overBuckets.forEach((bucket) => {
      if (bucket.legalBalls >= 6 && bucket.bowlerRuns === 0) {
        maidens += 1;
      }
    });

    const oversStr = `${Math.floor(bw.legalBalls / 6)}.${bw.legalBalls % 6}`;
    const economy = bw.legalBalls > 0 ? Number(((bw.runsConceded / bw.legalBalls) * 6).toFixed(2)) : 0;
    const dotPercent = bw.legalBalls > 0 ? Math.round((bw.dots / bw.legalBalls) * 100) : 0;
    const strikeRate = bw.wickets > 0 ? Number((bw.legalBalls / bw.wickets).toFixed(1)) : null;
    const isCurrentBowler = state.status !== 'completed' && state.currentBowlerId === bw.player.id;
    const canBowlNextOver =
      bw.player.id !== state.previousOverBowlerId && bw.legalBalls < maxQuotaOvers * 6;

    return {
      player: bw.player,
      overs: oversStr,
      legalBalls: bw.legalBalls,
      maidens,
      runsConceded: bw.runsConceded,
      wickets: bw.wickets,
      economy,
      dots: bw.dots,
      dotPercent,
      fours: bw.fours,
      sixes: bw.sixes,
      wides: bw.wides,
      noBalls: bw.noBalls,
      strikeRate,
      isCurrentBowler,
      maxOversQuota: maxQuotaOvers,
      canBowlNextOver,
    };
  });

  // Build Over-by-Over Summary
  const overSummaries: OverByOverRecord[] = [];
  let cumRuns = 0;
  let cumWkts = 0;
  let cumLegal = 0;

  const sortedOverIndices = Array.from(overMap.keys()).sort((a, b) => a - b);
  sortedOverIndices.forEach((overIdx) => {
    const entry = overMap.get(overIdx)!;
    let legalInOver = 0;
    let runsInOver = 0;
    let bowlerRunsInOver = 0;
    let wktsInOver = 0;
    let extrasInOver = 0;
    let boundsInOver = 0;

    entry.deliveries.forEach((d) => {
      const legal = d.isLegalDelivery ?? (d.outcome !== 'WD' && d.outcome !== 'NB');
      if (legal) legalInOver += 1;
      runsInOver += d.runsScored || 0;
      const bConceded =
        d.bowlerRunsConceded !== undefined
          ? d.bowlerRunsConceded
          : d.extraType === 'bye' || d.extraType === 'legBye'
          ? 0
          : d.runsScored || 0;
      bowlerRunsInOver += bConceded;
      if (d.isWicket) wktsInOver += 1;
      if (d.extraRuns) extrasInOver += d.extraRuns;
      if ((d.batterRuns ?? d.runsScored) === 4 || (d.batterRuns ?? d.runsScored) === 6) {
        boundsInOver += 1;
      }
    });

    cumRuns += runsInOver;
    cumWkts += wktsInOver;
    cumLegal += legalInOver;

    const ovStr = `${Math.floor(cumLegal / 6)}.${cumLegal % 6}`;
    const crr = cumLegal > 0 ? Number(((cumRuns / cumLegal) * 6).toFixed(2)) : 0;

    overSummaries.push({
      overNumber: overIdx + 1,
      bowler: entry.bowler,
      deliveries: entry.deliveries,
      legalBallsInOver: legalInOver,
      runsInOver,
      bowlerRunsInOver,
      wicketsInOver: wktsInOver,
      extrasInOver,
      boundariesInOver: boundsInOver,
      isMaiden: legalInOver >= 6 && bowlerRunsInOver === 0,
      cumulativeRuns: cumRuns,
      cumulativeWickets: cumWkts,
      cumulativeOvers: ovStr,
      cumulativeRunRate: crr,
    });
  });

  // Current Over Display logic:
  // If we are mid-over (or at 0.0), show the active over's deliveries.
  // If an over JUST completed (runningLegalBalls > 0 && runningLegalBalls % 6 === 0) and no extra ball has started the next over yet,
  // check if there are any illegal balls already bowled in the new over; if not, display the just-completed over so the 6th ball stays visible!
  const activeOverZeroIdx = Math.floor(runningLegalBalls / 6);
  const newOverStarted = overMap.has(activeOverZeroIdx) && overMap.get(activeOverZeroIdx)!.deliveries.length > 0;
  let displayOverNumber = activeOverZeroIdx + 1;
  let isDisplayOverComplete = false;
  let currentOverDeliveries: BallEvent[] = [];

  if (newOverStarted) {
    displayOverNumber = activeOverZeroIdx + 1;
    currentOverDeliveries = overMap.get(activeOverZeroIdx)!.deliveries;
    isDisplayOverComplete = false;
  } else if (runningLegalBalls > 0 && runningLegalBalls % 6 === 0 && overMap.has(activeOverZeroIdx - 1)) {
    displayOverNumber = activeOverZeroIdx;
    currentOverDeliveries = overMap.get(activeOverZeroIdx - 1)!.deliveries;
    isDisplayOverComplete = true;
  } else {
    displayOverNumber = Math.min(state.maxOvers, activeOverZeroIdx + 1);
    currentOverDeliveries = [];
  }

  const oversFormatted = `${Math.floor(runningLegalBalls / 6)}.${runningLegalBalls % 6}`;
  const currentRunRate =
    runningLegalBalls > 0 ? Number(((runningTeamRuns / runningLegalBalls) * 6).toFixed(2)) : 0;
  const ballsRemaining = Math.max(0, maxBalls - runningLegalBalls);
  const runsRequired =
    state.targetRuns && state.targetRuns > 0 ? Math.max(0, state.targetRuns - runningTeamRuns) : 0;
  const requiredRunRate =
    state.targetRuns && state.targetRuns > 0
      ? ballsRemaining > 0
        ? Number(((runsRequired / ballsRemaining) * 6).toFixed(2))
        : runsRequired > 0
        ? 99.99
        : 0
      : 0;

  const projectedScore =
    runningLegalBalls > 0
      ? Math.round(runningTeamRuns + (ballsRemaining / 6) * Math.max(6.5, currentRunRate))
      : state.maxOvers === 1
      ? 12
      : 180;

  const strikerRow = allBatterRows.find((r) => r.isStriker) || batters[0] || allBatterRows[0] || null;
  const nonStrikerRow = allBatterRows.find((r) => r.isNonStriker) || batters[1] || allBatterRows[1] || null;
  const currentBowlerRow =
    bowlers.find((b) => b.isCurrentBowler) ||
    bowlers[bowlers.length - 1] ||
    null;

  // Mathematical Invariant Verification (Section I)
  const battersRunsSum = allBatterRows.reduce((sum, b) => sum + b.runs, 0);
  const bowlersRunsConcededSum = bowlers.reduce((sum, b) => sum + b.runsConceded, 0);
  const byesAndLegByes = extras.byes + extras.legByes;
  const bowlersLegalBallsSum = bowlers.reduce((sum, b) => sum + b.legalBalls, 0);
  const bowlersWicketsSum = bowlers.reduce((sum, b) => sum + b.wickets, 0);

  const isValid =
    battersRunsSum + extras.total === runningTeamRuns &&
    bowlersRunsConcededSum + byesAndLegByes === runningTeamRuns &&
    bowlersLegalBallsSum === runningLegalBalls &&
    bowlersWicketsSum + runOutCount === runningTeamWickets;

  return {
    inningsNumber: state.inningsNumber,
    isSuperOver: state.isSuperOver,
    battingTeam: state.battingTeam,
    bowlingTeam: state.bowlingTeam,
    status: state.status,
    runs: runningTeamRuns,
    wickets: runningTeamWickets,
    legalBalls: runningLegalBalls,
    maxOvers: state.maxOvers,
    maxBalls,
    maxWickets: state.maxWickets,
    oversFormatted,
    currentRunRate,
    targetRuns: state.targetRuns,
    runsRequired,
    ballsRemaining,
    requiredRunRate,
    projectedScore,
    freeHitPending: state.freeHitPending,
    strikerRow,
    nonStrikerRow,
    currentBowlerRow,
    batters,
    yetToBat,
    bowlers,
    extras,
    partnerships,
    activePartnership: partnerships.find((p) => p.isUnbroken) || partnerships[partnerships.length - 1] || null,
    fallOfWickets,
    overSummaries,
    displayOverNumber,
    isDisplayOverComplete,
    currentOverDeliveries,
    lastSixDeliveries: state.events.slice(-6),
    accounting: {
      isValid,
      teamTotal: runningTeamRuns,
      battersRunsSum,
      extrasTotal: extras.total,
      bowlersRunsConcededSum,
      byesAndLegByes,
      legalBallsTotal: runningLegalBalls,
      bowlersLegalBallsSum,
      wicketsTotal: runningTeamWickets,
      bowlerWicketsPlusRunOuts: bowlersWicketsSum + runOutCount,
    },
  };
}
