import React, { createContext, useContext } from 'react';
import { BallEvent, Player, Stadium, SimulatorEventState, Team } from '../types/cricket';
import { ComputedInningsScorecard } from '../engine/matchScoreboardEngine';

export interface MatchResultBannerInfo {
  headline: string;
  subtext: string;
  winnerTeam?: Team | null;
  isTied?: boolean;
}

export interface MatchSimulatorContextValue {
  // Primary real-time scoreboard telemetry
  runs: number;
  wickets: number;
  maxWickets: number;
  overs: string;
  maxOvers: number;
  legalBalls: number;
  target: number | null;
  parTarget: number;
  runsRequired: number;
  ballsRemaining: number;
  currentRunRate: number;
  requiredRunRate: number;
  projectedScore: number;
  winProbability: number;

  // Authoritative innings scorecards
  activeScorecard: ComputedInningsScorecard;
  liveScorecard: ComputedInningsScorecard;
  innings1Scorecard: ComputedInningsScorecard;
  innings2Scorecard: ComputedInningsScorecard;
  superOver1Scorecard: ComputedInningsScorecard | null;
  superOver2Scorecard: ComputedInningsScorecard | null;

  // Match flow & view state
  selectedInningsTab: 1 | 2 | 3 | 4;
  liveInningsNumber: 1 | 2 | 3 | 4;
  activeMainTab: 'arena' | 'scorecard' | 'overs' | 'analysis';
  isMatchActive: boolean;
  isPlaying: boolean;
  isMatchOver: boolean;
  simulatorEventState: SimulatorEventState;
  stadium: Stadium;
  dewActive: boolean;
  tossSummary: string | null;
  venueLabel: string;
  lastBall: BallEvent | null;
  matchResultBanner: MatchResultBannerInfo | null;
  bowlingXI: Player[];
  previousOverBowlerId: string | null;

  // Interactive actions
  onSelectInningsTab: (inn: 1 | 2 | 3 | 4) => void;
  onChangeMainTab: (tab: 'arena' | 'scorecard' | 'overs' | 'analysis') => void;
  onSelectBowler?: (bowlerId: string) => void;
  onInspectPlayer?: (player: Player) => void;
  onStartSecondInnings?: () => void;
  onQuickFinishFirstInnings?: () => void;
  onStartSuperOver?: () => void;
}

export const MatchSimulatorContext = createContext<MatchSimulatorContextValue | null>(null);

export interface MatchSimulatorProviderProps {
  value: MatchSimulatorContextValue;
  children: React.ReactNode;
}

export const MatchSimulatorProvider: React.FC<MatchSimulatorProviderProps> = ({
  value,
  children,
}) => {
  return (
    <MatchSimulatorContext.Provider value={value}>
      {children}
    </MatchSimulatorContext.Provider>
  );
};

export function useMatchSimulator(): MatchSimulatorContextValue {
  const context = useContext(MatchSimulatorContext);
  if (!context) {
    throw new Error('useMatchSimulator must be used within a MatchSimulatorProvider');
  }
  return context;
}

export function useOptionalMatchSimulator(): MatchSimulatorContextValue | null {
  return useContext(MatchSimulatorContext);
}
