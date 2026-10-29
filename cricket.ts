export type PlayerRole = 'Top-Order Batter' | 'Middle-Order Batter' | 'Wicketkeeper Batter' | 'All-Rounder' | 'Pace Bowler' | 'Spin Bowler';

export interface PlayerStats {
  matches: number;
  runs: number;
  average: number;
  strikeRate: number;
  boundaryPercent: number;
  dotBallPercent: number;
  wickets: number;
  economy: number;
  bowlingAverage: number;
  powerplaySR: number;
  middleSR: number;
  deathSR: number;
  paceSR: number;
  spinSR: number;
  chasingAvg: number;
  impactScore: number;
}

export interface ShotZoneStats {
  zone: string;
  runs: number;
  strikeRate: number;
  boundaryPercent: number;
  dismissals: number;
}

export interface PlayerDNA {
  pressureScore: number; // 1-100
  aggression: number; // 1-100
  consistency: number; // 1-100
  chaseAbility: number; // 1-100
  finishingAbility: number; // 1-100
  powerplayIndex: number; // 1-100
  middleOversIndex: number; // 1-100
  deathOversIndex: number; // 1-100
  spinMatchup: number; // 1-100
  paceMatchup: number; // 1-100
  riskProfile: 'Conservative' | 'Calculated' | 'Aggressive' | 'High Risk';
}

export interface HiddenWeakness {
  factor: string;
  threatLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  insight: string;
}

export interface Coach {
  id: string;
  name: string;
  teamId: string;
  countryCode: string;
  tacticalProfile: {
    aggression: number; // 1-100
    spinDependency: number;
    youthUsage: number;
    chasingStrategy: number;
    bowlingRotation: number;
  };
  coachingPhilosophy: string;
  signatureDirective: string;
}

export interface StadiumDNA {
  pace: number;
  spin: number;
  boundaries: number;
  dew: number;
  chase: number;
  powerplay: number;
}

export interface TeamChemistry {
  overall: number; // 1-100
  battingBalance: number;
  bowlingBalance: number;
  roleCoverage: number;
  leftRightBalance: number;
  experienceBalance: number;
  finishingDepth: number;
  keySynergies: string[];
  tacticalGaps: string[];
}

export interface BattleCard {
  batterId: string;
  bowlerId: string;
  historicalBalls: number;
  historicalRuns: number;
  historicalDismissals: number;
  historicalSR: number;
  batterEdgePercent: number;
  bowlerEdgePercent: number;
  phaseMatchup: string;
  predictedOutcome: string;
  weaknessExploited: string;
}

export interface MatchMvpBadge {
  id: string;
  title: string;
  category: 'batting' | 'bowling' | 'allround' | 'clutch';
  icon: string;
  description: string;
  matchContext: string;
  glowColor: string;
  tier: 'Diamond' | 'Platinum' | 'Gold';
}

export interface Player {
  id: string;
  stableId?: string;
  name: string;
  country: string;
  countryCode: string; // ISO e.g. 'IN', 'AU', 'ZA', 'GB-ENG'
  jerseyNumber?: number;
  imageUrl?: string;
  role: PlayerRole;
  age: number;
  battingHand: 'Right-hand' | 'Left-hand';
  bowlingStyle: string;
  rating: number; // 1-100
  formRating: number; // 1-100
  isKeyPlayer?: boolean;
  avatarSeed: string;
  dna?: PlayerDNA;
  weaknesses?: HiddenWeakness[];
  stats: PlayerStats;
  shotZones: ShotZoneStats[];
  aiStrengths: string[];
  aiWeakness: string;
  mvpBadges?: MatchMvpBadge[];
}

export interface Team {
  id: string;
  name: string;
  shortName: string;
  flag: string;
  primaryColor: string;
  accentColor: string;
  ranking: number;
  worldCupTitles: number;
  ratings: {
    overall: number;
    batting: number;
    bowling: number;
    fielding: number;
    powerplay: number;
    middleOvers: number;
    deathOvers: number;
  };
  recentForm: ('W' | 'L')[];
  squad: Player[];
}

export interface Stadium {
  id: string;
  name: string;
  city: string;
  country: string;
  capacity: number;
  boundarySizeMeters: { straight: number; square: number };
  avgFirstInningsScore: number;
  chasingWinPercent: number;
  paceWicketPercent: number;
  spinWicketPercent: number;
  dewFactor: 'Low' | 'Moderate' | 'Heavy';
  pitchType: 'Pace & Bounce' | 'True Batting' | 'Slow & Turning' | 'Dry Spin-Friendly';
  elevation: string;
  highestScore?: string;
  lowestScore?: string;
  paceSpinAdvantage?: string;
  image?: string;
  imageUrl?: string;
  weather?: { temp: string; condition: string; humidity: string; wind: string; dew: string };
  venueDna?: { batting: number; bowling: number; pace: number; spin: number };
  recentMatches?: { match: string; date: string; winner: string; score: string }[];
  teamRecords?: { team: string; teamId: string; played: number; won: number; winRate: number }[];
  playerRecords?: { name: string; role: string; stat: string }[];
}

export type DeliveryOutcome = '0' | '1' | '2' | '3' | '4' | '6' | 'W' | 'NB' | 'WD' | 'B' | 'LB';

export type ExtraDeliveryType = 'wide' | 'noBall' | 'bye' | 'legBye';

export type SimulatorEventState =
  | 'IDLE'
  | 'LIVE_PLAY'
  | 'INNINGS_BREAK'
  | 'DISMISSAL_EVENT'
  | 'DRS_REVIEW'
  | 'DRS_UPHELD'
  | 'DRS_OVERTURNED'
  | 'SUPER_OVER_READY'
  | 'MATCH_COMPLETE';

export interface DrsBallTrackingOutcome {
  appealType: 'LBW' | 'CAUGHT BEHIND';
  frontFoot: 'FAIR DELIVERY';
  ultraEdge: 'FLATLINE (NO BAT)' | 'SPIKE DETECTED (EDGE)';
  pitching: 'IN LINE' | 'OUTSIDE OFF' | 'OUTSIDE LEG';
  impact: 'IN LINE' | "UMPIRE'S CALL" | 'OUTSIDE OFF';
  wickets: 'HITTING' | "UMPIRE'S CALL" | 'MISSING (HEIGHT)' | 'MISSING (LEG)' | 'MISSING (OFF)';
  decision: 'UPHELD' | 'OVERTURNED';
  finalVerdict: 'OUT' | 'NOT OUT';
  isUmpiresCall: boolean;
  retainReview: boolean;
  speedKmh: number;
  bounceHeightCm: number;
  seamDeviationDeg: number;
  stumpOverlapPct: number;
  pitchX: number;
  pitchY: number;
  impactX: number;
  impactY: number;
  targetStumpX: number;
  summaryText: string;
}

export interface BallEvent {
  eventId?: string;
  inningsNumber?: 1 | 2 | 3 | 4;
  overNumber: number;
  ballInOver: number;
  totalBalls: number;
  legalBallsAfter?: number;
  isLegalDelivery?: boolean;
  isFreeHit?: boolean;
  bowler: Player;
  batter: Player;
  nonStriker?: Player;
  dismissedPlayer?: Player;
  fielder?: Player;
  deliveryType: string;
  speedKmh: number;
  length: 'Yorker' | 'Full' | 'Good Length' | 'Short of Length' | 'Bouncer' | 'Slower Ball';
  shot: string;
  outcome: DeliveryOutcome;
  displayToken?: string;
  runsScored: number;
  batterRuns?: number;
  extraType?: ExtraDeliveryType | null;
  extraRuns?: number;
  bowlerRunsConceded?: number;
  physicalRunsCompleted?: number;
  isWicket: boolean;
  wicketType?: 'Bowled' | 'Caught' | 'LBW' | 'Run Out' | 'Stumped';
  drsReviewResult?: 'UPHELD' | 'OVERTURNED';
  scoreAtBall: string;
  commentary: string;
  winProbA: number;
  winProbDelta: number;
  momentumA: number;
  aiExplanation?: string;
}

export interface DecisionScenario {
  id: string;
  title: string;
  difficulty: 'Rookie' | 'Analyst' | 'Grandmaster';
  matchSituation: {
    battingTeam: string;
    bowlingTeam: string;
    score: string;
    overs: string;
    target: number;
    neededRuns: number;
    remainingBalls: number;
    currentCRR: number;
    requiredRR: number;
    striker: string;
    nonStriker: string;
    bowler: string;
    pitchState: string;
  };
  options: {
    id: string;
    label: string;
    tacticalIntent: string;
    riskLevel: 'Low' | 'Medium' | 'High' | 'Extreme';
    expectedRuns: number;
    winProbChange: number;
    aiCoachAgreement: boolean;
    explanation: string;
    outcomeNarrative: string;
  }[];
  aiCoachRecommendation: {
    optionId: string;
    targetRunsInOver: string;
    focalZone: string;
    tacticalReason: string;
  };
}

export interface MonteCarloResult {
  simulationsRun: number;
  teamAWins: number;
  teamBWins: number;
  teamAWinPercent: number;
  teamBWinPercent: number;
  medianScoreA: number;
  score10thPercentile: number;
  score90thPercentile: number;
  mostLikelyMargin: string;
  factors: {
    name: string;
    impactPercent: number;
    favorTeam: 'teamA' | 'teamB';
    reason: string;
  }[];
}

export interface UserProfile {
  level: number;
  xp: number;
  nextLevelXp: number;
  rankTitle: string;
  predictionAccuracy: number;
  predictionsMade: number;
  aiBattlesWon: number;
  aiBattlesTotal: number;
  streakDays: number;
  favoriteTeamId: string;
  badges: {
    id: string;
    name: string;
    description: string;
    unlocked: boolean;
    icon: string;
  }[];
}
