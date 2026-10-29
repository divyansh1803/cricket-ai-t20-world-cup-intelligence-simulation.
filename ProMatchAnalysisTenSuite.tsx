import React, { useMemo, useState } from 'react';
import {
  Activity,
  Award,
  BarChart3,
  Compass,
  Crosshair,
  Flame,
  Gauge,
  GitBranch,
  Layers,
  Shield,
  Sparkles,
  Swords,
  Target,
  TrendingUp,
  Zap,
} from 'lucide-react';
import { BallEvent, Player, Stadium, Team } from '../../types/cricket';
import { STADIUMS, TEAMS } from '../../data/cricketData';
import { CountryFlag, TeamCrest, TeamFlag } from '../common/CricketIdentity';
import { cricketAudio } from '../../utils/audioSystem';
import { MatchAnalytics } from '../MatchAnalytics';

export type MatchAnalysisCategoryFilter =
  | 'all'
  | 'stamina_weather_shots'
  | 'wpa_turning'
  | 'phases_worm'
  | 'pitch_matchups'
  | 'execution_discipline';

export interface ProMatchAnalysisTenSuiteProps {
  teamA?: Team;
  teamB?: Team;
  stadium?: Stadium;
  innings1Events?: BallEvent[];
  innings2Events?: BallEvent[];
  targetRuns?: number | null;
  dewActive?: boolean;
  embeddedMode?: boolean;
  activeBowler?: Player;
  onInspectPlayer?: (player: Player) => void;
}

interface WpaLeaderEntry {
  player: Player;
  teamId: string;
  roleTag: 'BAT' | 'BOWL' | 'ALL';
  netWpaPct: number;
  avgLeverage: number;
  clutchBalls: number;
  headlineStat: string;
}

interface PhaseSplitRow {
  phaseId: 'pp' | 'mid' | 'death';
  label: string;
  oversSpan: string;
  teamARuns: number;
  teamAWickets: number;
  teamARR: number;
  teamADotPct: number;
  teamABndPct: number;
  teamBRuns: number;
  teamBWickets: number;
  teamBRR: number;
  teamBDotPct: number;
  teamBBndPct: number;
  edgeTeamId: string;
  edgeSummary: string;
}

interface DotPressurePoint {
  consecutiveDots: string;
  ballsObserved: number;
  falseShotPct: number;
  wicketHazardPct: number;
  releaseBoundaryPct: number;
  singleEscapePct: number;
}

interface ExpectedRunsRow {
  player: Player;
  teamId: string;
  discipline: 'Batting xR' | 'Bowling xR';
  balls: number;
  actualRuns: number;
  expectedRuns: number;
  alphaDelta: number;
  expectedWickets: number;
  actualWickets: number;
}

interface PartnershipMatrixRow {
  standOrder: number;
  pairNames: string;
  handCombo: 'LHB + RHB' | 'RHB + RHB' | 'LHB + LHB';
  runs: number;
  balls: number;
  runRate: number;
  rotationPct: number;
  boundarySharePct: number;
  controlIndex: number;
}

interface LengthLineCell {
  lengthIdx: number;
  lineIdx: number;
  lengthLabel: string;
  lineLabel: string;
  balls: number;
  runs: number;
  economy: number;
  dismissalPct: number;
  wickets: number;
}

interface SpeedBandRow {
  bandLabel: string;
  velocitySpan: string;
  balls: number;
  runs: number;
  strikeRate: number;
  dismissals: number;
  dotPct: number;
  falseShotPct: number;
}

interface WormOverPoint {
  over: number;
  inn1CumRuns: number;
  inn1WicketInOver: boolean;
  inn2CumRuns: number | null;
  inn2WicketInOver: boolean;
  venueParCumRuns: number;
  chaseRrr: number | null;
}

interface FieldingExtrasAudit {
  teamAInnerRingSaves: number;
  teamABoundarySaves: number;
  teamACatchEfficiencyPct: number;
  teamAWidesNoBalls: number;
  teamAFreeHitCost: number;
  teamANetFieldingSwing: number;
  teamBInnerRingSaves: number;
  teamBBoundarySaves: number;
  teamBCatchEfficiencyPct: number;
  teamBWidesNoBalls: number;
  teamBFreeHitCost: number;
  teamBNetFieldingSwing: number;
}

interface TurningPointItem {
  rank: number;
  overBallLabel: string;
  actorName: string;
  opponentName: string;
  teamId: string;
  eventTitle: string;
  wpaSwingPct: number;
  clutchPressureIdx: number;
  verdict: string;
}

const LENGTH_LABELS = ['Bouncer', 'Short of Length', 'Good Length', 'Full', 'Yorker'] as const;
const LINE_LABELS = ['Wide Off', '4th–5th Stump', 'Off Stump', 'Middle & Leg', 'Down Leg'] as const;

export const ProMatchAnalysisTenSuite: React.FC<ProMatchAnalysisTenSuiteProps> = ({
  teamA: propTeamA,
  teamB: propTeamB,
  stadium: propStadium,
  innings1Events = [],
  innings2Events = [],
  targetRuns = null,
  dewActive: propDew,
  embeddedMode = false,
  activeBowler,
  onInspectPlayer,
}) => {
  const [standaloneTeamAId, setStandaloneTeamAId] = useState<string>(TEAMS[0].id);
  const [standaloneTeamBId, setStandaloneTeamBId] = useState<string>(TEAMS[1].id);
  const [standaloneStadiumId, setStandaloneStadiumId] = useState<string>(STADIUMS[0].id);
  const [categoryFilter, setCategoryFilter] = useState<MatchAnalysisCategoryFilter>('all');
  const [matrixMetricMode, setMatrixMetricMode] = useState<'economy' | 'dismissal'>('economy');
  const [selectedMatrixCell, setSelectedMatrixCell] = useState<{ l: number; c: number }>({
    l: 2,
    c: 1,
  });
  const [selectedWormOver, setSelectedWormOver] = useState<number>(16);

  const teamA = useMemo(
    () => propTeamA || TEAMS.find((t) => t.id === standaloneTeamAId) || TEAMS[0],
    [propTeamA, standaloneTeamAId]
  );
  const teamB = useMemo(
    () =>
      propTeamB ||
      TEAMS.find((t) => t.id === standaloneTeamBId && t.id !== teamA.id) ||
      TEAMS.find((t) => t.id !== teamA.id) ||
      TEAMS[1],
    [propTeamB, standaloneTeamBId, teamA.id]
  );
  const stadium = useMemo(
    () => propStadium || STADIUMS.find((s) => s.id === standaloneStadiumId) || STADIUMS[0],
    [propStadium, standaloneStadiumId]
  );
  const dewActive = propDew ?? stadium.dewFactor !== 'Low';

  const combinedLiveEvents = useMemo(
    () => [...innings1Events, ...innings2Events],
    [innings1Events, innings2Events]
  );
  const hasLiveBallStream = combinedLiveEvents.length >= 6;

  // Deterministic matchup seed for structured analytical baseline when live overs are not yet complete
  const seed = useMemo(() => {
    const key = `${teamA.id}-${teamB.id}-${stadium.id}-${combinedLiveEvents.length}`;
    let h = 2166136261;
    for (let i = 0; i < key.length; i += 1) {
      h ^= key.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return Math.abs(h);
  }, [teamA.id, teamB.id, stadium.id, combinedLiveEvents.length]);

  // =========================================================================
  // 1. WIN PROBABILITY ADDED (WPA) & LEVERAGE INDEX LEDGER
  // =========================================================================
  const wpaLeaders = useMemo<WpaLeaderEntry[]>(() => {
    if (hasLiveBallStream) {
      const map = new Map<
        string,
        {
          player: Player;
          teamId: string;
          batWpa: number;
          bowlWpa: number;
          levSum: number;
          balls: number;
          runs: number;
          ballsFaced: number;
          wkts: number;
          runsConc: number;
        }
      >();

      const ensure = (p: Player, tId: string) => {
        let rec = map.get(p.id);
        if (!rec) {
          rec = {
            player: p,
            teamId: tId,
            batWpa: 0,
            bowlWpa: 0,
            levSum: 0,
            balls: 0,
            runs: 0,
            ballsFaced: 0,
            wkts: 0,
            runsConc: 0,
          };
          map.set(p.id, rec);
        }
        return rec;
      };

      const processEvents = (events: BallEvent[], batTeamId: string, bowlTeamId: string) => {
        events.forEach((ev) => {
          const overWeight = ev.overNumber >= 15 ? 1.85 : ev.overNumber < 6 ? 1.25 : 1.05;
          const closeness = 1 + (1 - Math.abs((ev.winProbA ?? 50) - 50) / 50) * 0.9;
          const leverage = Number((overWeight * closeness).toFixed(2));
          const delta =
            typeof ev.winProbDelta === 'number' && ev.winProbDelta !== 0
              ? ev.winProbDelta
              : ev.isWicket
              ? -8.4
              : (ev.runsScored - 1.35) * 1.15;

          const batRec = ensure(ev.batter, batTeamId);
          batRec.batWpa += delta;
          batRec.levSum += leverage;
          batRec.balls += 1;
          batRec.runs += ev.batterRuns ?? ev.runsScored;
          if (ev.extraType !== 'wide') batRec.ballsFaced += 1;

          const bowlRec = ensure(ev.bowler, bowlTeamId);
          bowlRec.bowlWpa -= delta;
          bowlRec.levSum += leverage;
          bowlRec.balls += 1;
          if (ev.isWicket && ev.wicketType !== 'Run Out') bowlRec.wkts += 1;
          bowlRec.runsConc += ev.bowlerRunsConceded ?? ev.runsScored;
        });
      };

      processEvents(innings1Events, teamA.id, teamB.id);
      processEvents(innings2Events, teamB.id, teamA.id);

      return Array.from(map.values())
        .map((r) => {
          const net = Number((r.batWpa + r.bowlWpa).toFixed(1));
          const roleTag: 'BAT' | 'BOWL' | 'ALL' =
            r.ballsFaced > 0 && r.runsConc > 0
              ? 'ALL'
              : r.ballsFaced >= r.balls * 0.5
              ? 'BAT'
              : 'BOWL';
          const headlineStat =
            roleTag === 'BAT'
              ? `${r.runs} (${r.ballsFaced}b)`
              : roleTag === 'BOWL'
              ? `${r.wkts}/${r.runsConc}`
              : `${r.runs}r · ${r.wkts}w`;
          return {
            player: r.player,
            teamId: r.teamId,
            roleTag,
            netWpaPct: net,
            avgLeverage: Number((r.levSum / Math.max(1, r.balls)).toFixed(2)),
            clutchBalls: r.balls,
            headlineStat,
          };
        })
        .sort((a, b) => Math.abs(b.netWpaPct) - Math.abs(a.netWpaPct))
        .slice(0, 6);
    }

    const candidates: { p: Player; tId: string }[] = [
      ...teamA.squad.slice(0, 4).map((p) => ({ p, tId: teamA.id })),
      ...teamB.squad.slice(0, 4).map((p) => ({ p, tId: teamB.id })),
    ];

    return candidates.slice(0, 6).map(({ p, tId }, idx) => {
      const isBowler = p.role.includes('Bowler');
      const baseImpact = ((p.stats.impactScore || 82) - 72) * 0.85;
      const sign = idx % 3 === 2 ? -1 : 1;
      const wpa = Number((sign * (8.4 + baseImpact * 0.65 + ((seed + idx * 7) % 60) / 10)).toFixed(1));
      const lev = Number((1.22 + ((seed + idx * 13) % 115) / 100).toFixed(2));
      return {
        player: p,
        teamId: tId,
        roleTag: p.role === 'All-Rounder' ? 'ALL' : isBowler ? 'BOWL' : 'BAT',
        netWpaPct: wpa,
        avgLeverage: lev,
        clutchBalls: 14 + ((seed + idx * 5) % 16),
        headlineStat: isBowler
          ? `${2 + (idx % 2)}/${22 + ((seed + idx * 3) % 11)} (4.0)`
          : `${38 + ((seed + idx * 11) % 36)} (${22 + ((seed + idx * 7) % 16)}b)`,
      };
    });
  }, [hasLiveBallStream, innings1Events, innings2Events, teamA, teamB, seed]);

  // =========================================================================
  // 2. PHASE-BY-PHASE EXECUTION SPLIT (PP 1-6, MIDDLE 7-15, DEATH 16-20)
  // =========================================================================
  const phaseSplits = useMemo<PhaseSplitRow[]>(() => {
    const computeFromEvents = (events: BallEvent[], minOv: number, maxOv: number) => {
      const slice = events.filter((e) => e.overNumber >= minOv && e.overNumber <= maxOv);
      const legal = slice.filter((e) => e.extraType !== 'wide' && e.extraType !== 'noBall').length;
      const runs = slice.reduce((s, e) => s + e.runsScored, 0);
      const wkts = slice.filter((e) => e.isWicket).length;
      const dots = slice.filter((e) => e.runsScored === 0).length;
      const bnds = slice.filter((e) => (e.batterRuns ?? e.runsScored) >= 4).length;
      const total = Math.max(1, slice.length);
      return {
        hasData: slice.length >= 3,
        runs,
        wkts,
        rr: legal > 0 ? Number(((runs / legal) * 6).toFixed(2)) : 0,
        dotPct: Math.round((dots / total) * 100),
        bndPct: Math.round((bnds / total) * 100),
      };
    };

    const defs: { id: 'pp' | 'mid' | 'death'; label: string; span: string; min: number; max: number; oversCount: number }[] = [
      { id: 'pp', label: 'Powerplay', span: 'Overs 1–6', min: 0, max: 5, oversCount: 6 },
      { id: 'mid', label: 'Middle Overs', span: 'Overs 7–15', min: 6, max: 14, oversCount: 9 },
      { id: 'death', label: 'Death Overs', span: 'Overs 16–20', min: 15, max: 19, oversCount: 5 },
    ];

    return defs.map((d, idx) => {
      const aLive = computeFromEvents(innings1Events, d.min, d.max);
      const bLive = computeFromEvents(innings2Events, d.min, d.max);

      const parFactor = (stadium.avgFirstInningsScore || 176) / 176;
      const aBaseRR =
        d.id === 'pp'
          ? Number(((8.2 + (teamA.ratings.powerplay - 80) * 0.08) * parFactor).toFixed(2))
          : d.id === 'mid'
          ? Number(((7.8 + (teamA.ratings.middleOvers - 80) * 0.07) * parFactor).toFixed(2))
          : Number(((11.1 + (teamA.ratings.deathOvers - 80) * 0.11) * parFactor).toFixed(2));

      const bBaseRR =
        d.id === 'pp'
          ? Number(((8.3 + (teamB.ratings.powerplay - 80) * 0.08) * parFactor).toFixed(2))
          : d.id === 'mid'
          ? Number(((7.9 + (teamB.ratings.middleOvers - 80) * 0.07) * parFactor).toFixed(2))
          : Number(
              (
                (11.3 + (teamB.ratings.deathOvers - 80) * 0.11 + (dewActive ? 0.45 : 0)) *
                parFactor
              ).toFixed(2)
            );

      const teamARR = aLive.hasData ? aLive.rr : aBaseRR;
      const teamARuns = aLive.hasData ? aLive.runs : Math.round(aBaseRR * d.oversCount);
      const teamAWickets = aLive.hasData ? aLive.wkts : idx === 0 ? 1 : idx === 1 ? 2 : 3;
      const teamADotPct = aLive.hasData ? aLive.dotPct : idx === 0 ? 38 : idx === 1 ? 31 : 24;
      const teamABndPct = aLive.hasData ? aLive.bndPct : idx === 0 ? 24 : idx === 1 ? 15 : 29;

      const teamBRR = bLive.hasData ? bLive.rr : bBaseRR;
      const teamBRuns = bLive.hasData ? bLive.runs : Math.round(bBaseRR * d.oversCount);
      const teamBWickets = bLive.hasData ? bLive.wkts : idx === 0 ? 1 : idx === 1 ? 3 : 2;
      const teamBDotPct = bLive.hasData ? bLive.dotPct : idx === 0 ? 36 : idx === 1 ? 33 : 22;
      const teamBBndPct = bLive.hasData ? bLive.bndPct : idx === 0 ? 25 : idx === 1 ? 14 : 31;

      const scoreA = teamARR - teamAWickets * 0.55;
      const scoreB = teamBRR - teamBWickets * 0.55;
      const edgeTeam = scoreA >= scoreB ? teamA : teamB;
      const diffRuns = Math.abs(teamARuns - teamBRuns);

      return {
        phaseId: d.id,
        label: d.label,
        oversSpan: d.span,
        teamARuns,
        teamAWickets,
        teamARR,
        teamADotPct,
        teamABndPct,
        teamBRuns,
        teamBWickets,
        teamBRR,
        teamBDotPct,
        teamBBndPct,
        edgeTeamId: edgeTeam.id,
        edgeSummary: `${edgeTeam.shortName} +${diffRuns}r (${Math.abs(teamARR - teamBRR).toFixed(
          2
        )} RPO swing)`,
      };
    });
  }, [innings1Events, innings2Events, teamA, teamB, stadium, dewActive]);

  // =========================================================================
  // 3. DOT-BALL PRESSURE BUILDUP & RELEASE-SHOT HAZARD CURVE
  // =========================================================================
  const dotPressureCurve = useMemo<DotPressurePoint[]>(() => {
    const spinBoost = stadium.spinWicketPercent >= 50 ? 2.8 : 0;
    return [
      {
        consecutiveDots: '0 Dots (Rotated)',
        ballsObserved: Math.max(28, Math.round(combinedLiveEvents.length * 0.42) || 96),
        falseShotPct: Number((13.4 + spinBoost * 0.4).toFixed(1)),
        wicketHazardPct: 3.1,
        releaseBoundaryPct: 16.8,
        singleEscapePct: 49.2,
      },
      {
        consecutiveDots: '1 Dot Ball',
        ballsObserved: Math.max(18, Math.round(combinedLiveEvents.length * 0.25) || 58),
        falseShotPct: Number((18.2 + spinBoost * 0.5).toFixed(1)),
        wicketHazardPct: 4.6,
        releaseBoundaryPct: 19.4,
        singleEscapePct: 44.5,
      },
      {
        consecutiveDots: '2 Consecutive Dots',
        ballsObserved: Math.max(12, Math.round(combinedLiveEvents.length * 0.16) || 37),
        falseShotPct: Number((25.7 + spinBoost * 0.7).toFixed(1)),
        wicketHazardPct: 7.4,
        releaseBoundaryPct: 24.2,
        singleEscapePct: 38.0,
      },
      {
        consecutiveDots: '3 Consecutive Dots',
        ballsObserved: Math.max(7, Math.round(combinedLiveEvents.length * 0.1) || 21),
        falseShotPct: Number((34.6 + spinBoost * 0.9).toFixed(1)),
        wicketHazardPct: 11.8,
        releaseBoundaryPct: 29.5,
        singleEscapePct: 30.4,
      },
      {
        consecutiveDots: '4+ Dots (Squeeze)',
        ballsObserved: Math.max(4, Math.round(combinedLiveEvents.length * 0.06) || 12),
        falseShotPct: Number((43.8 + spinBoost).toFixed(1)),
        wicketHazardPct: 17.6,
        releaseBoundaryPct: 33.1,
        singleEscapePct: 22.8,
      },
    ];
  }, [combinedLiveEvents.length, stadium.spinWicketPercent]);

  // =========================================================================
  // 4. EXPECTED RUNS (xR) & EXPECTED WICKETS (xW) EXECUTION AUDIT
  // =========================================================================
  const expectedRunsRows = useMemo<ExpectedRunsRow[]>(() => {
    const batters = [teamA.squad[0], teamA.squad[1], teamB.squad[0], teamB.squad[1]].filter(Boolean);
    const bowlers = [
      teamA.squad.find((p) => p.role.includes('Bowler')) || teamA.squad[4],
      teamB.squad.find((p) => p.role.includes('Bowler')) || teamB.squad[4],
    ].filter(Boolean);

    const rows: ExpectedRunsRow[] = batters.map((p, idx) => {
      const tId = idx < 2 ? teamA.id : teamB.id;
      const liveFaced = combinedLiveEvents.filter(
        (e) => e.batter.id === p.id && e.extraType !== 'wide'
      );
      if (liveFaced.length >= 4) {
        const actual = liveFaced.reduce((s, e) => s + (e.batterRuns ?? e.runsScored), 0);
        const xR = Number(
          liveFaced
            .reduce(
              (s, e) =>
                s +
                (e.length === 'Yorker'
                  ? 0.92
                  : e.length === 'Good Length'
                  ? 1.18
                  : e.length === 'Full'
                  ? 1.56
                  : 1.42),
              0
            )
            .toFixed(1)
        );
        return {
          player: p,
          teamId: tId,
          discipline: 'Batting xR',
          balls: liveFaced.length,
          actualRuns: actual,
          expectedRuns: xR,
          alphaDelta: Number((actual - xR).toFixed(1)),
          expectedWickets: Number((liveFaced.length * 0.048).toFixed(2)),
          actualWickets: liveFaced.filter((e) => e.isWicket).length,
        };
      }

      const balls = 21 + ((seed + idx * 9) % 15);
      const xR = Number((balls * (1.28 + ((idx * 5 + seed) % 18) / 100)).toFixed(1));
      const actual = Math.round(xR + (((p.stats.strikeRate || 142) - 136) / 10) * 1.9);
      return {
        player: p,
        teamId: tId,
        discipline: 'Batting xR',
        balls,
        actualRuns: actual,
        expectedRuns: xR,
        alphaDelta: Number((actual - xR).toFixed(1)),
        expectedWickets: Number((balls * 0.045).toFixed(2)),
        actualWickets: idx % 2,
      };
    });

    bowlers.forEach((p, idx) => {
      const tId = idx === 0 ? teamA.id : teamB.id;
      const liveBowled = combinedLiveEvents.filter((e) => e.bowler.id === p.id);
      if (liveBowled.length >= 6) {
        const actualConc = liveBowled.reduce(
          (s, e) => s + (e.bowlerRunsConceded ?? e.runsScored),
          0
        );
        const xR = Number((liveBowled.length * 1.38).toFixed(1));
        rows.push({
          player: p,
          teamId: tId,
          discipline: 'Bowling xR',
          balls: liveBowled.length,
          actualRuns: actualConc,
          expectedRuns: xR,
          alphaDelta: Number((xR - actualConc).toFixed(1)), // positive = saved runs vs xR
          expectedWickets: Number((liveBowled.length * 0.068).toFixed(2)),
          actualWickets: liveBowled.filter((e) => e.isWicket && e.wicketType !== 'Run Out').length,
        });
      } else {
        const balls = 24;
        const xR = Number((33.4 + ((seed + idx * 7) % 30) / 10).toFixed(1));
        const actualConc = Math.max(19, Math.round((p.stats.economy || 7.2) * 4));
        rows.push({
          player: p,
          teamId: tId,
          discipline: 'Bowling xR',
          balls,
          actualRuns: actualConc,
          expectedRuns: xR,
          alphaDelta: Number((xR - actualConc).toFixed(1)),
          expectedWickets: 1.72,
          actualWickets: 2 + (idx % 2),
        });
      }
    });

    return rows;
  }, [teamA, teamB, combinedLiveEvents, seed]);

  // =========================================================================
  // 5. PARTNERSHIP MOMENTUM & STRIKE-ROTATION MATRIX
  // =========================================================================
  const partnershipRows = useMemo<PartnershipMatrixRow[]>(() => {
    const p1 = teamA.squad[0];
    const p2 = teamA.squad[1];
    const p3 = teamA.squad[2];
    const q1 = teamB.squad[0];
    const q2 = teamB.squad[1];

    const comboOf = (a: Player, b: Player): PartnershipMatrixRow['handCombo'] => {
      if (a.battingHand !== b.battingHand) return 'LHB + RHB';
      return a.battingHand === 'Left-hand' ? 'LHB + LHB' : 'RHB + RHB';
    };

    return [
      {
        standOrder: 1,
        pairNames: `${p1.name.split(' ').pop()} & ${p2.name.split(' ').pop()} (${teamA.shortName})`,
        handCombo: comboOf(p1, p2),
        runs: 54 + (seed % 18),
        balls: 35 + (seed % 9),
        runRate: Number((((54 + (seed % 18)) / (35 + (seed % 9))) * 6).toFixed(2)),
        rotationPct: 48,
        boundarySharePct: 58,
        controlIndex: 86,
      },
      {
        standOrder: 2,
        pairNames: `${p2.name.split(' ').pop()} & ${p3.name.split(' ').pop()} (${teamA.shortName})`,
        handCombo: comboOf(p2, p3),
        runs: 68 + ((seed >> 2) % 21),
        balls: 44 + ((seed >> 3) % 10),
        runRate: Number((((68 + ((seed >> 2) % 21)) / (44 + ((seed >> 3) % 10))) * 6).toFixed(2)),
        rotationPct: 56,
        boundarySharePct: 46,
        controlIndex: 91,
      },
      {
        standOrder: 3,
        pairNames: `${q1.name.split(' ').pop()} & ${q2.name.split(' ').pop()} (${teamB.shortName})`,
        handCombo: comboOf(q1, q2),
        runs: 61 + ((seed >> 4) % 19),
        balls: 38 + ((seed >> 5) % 8),
        runRate: Number((((61 + ((seed >> 4) % 19)) / (38 + ((seed >> 5) % 8))) * 6).toFixed(2)),
        rotationPct: 44,
        boundarySharePct: 62,
        controlIndex: 83,
      },
    ];
  }, [teamA, teamB, seed]);

  // =========================================================================
  // 6. 25-CELL BOWLING LENGTH x LINE RUN-VALUE & DISMISSAL HEATMAP
  // =========================================================================
  const lengthLineCells = useMemo<LengthLineCell[]>(() => {
    const cells: LengthLineCell[] = [];
    const baseEconGrid: number[][] = [
      [10.4, 8.2, 7.6, 8.9, 11.6], // Bouncer
      [9.6, 7.4, 7.1, 8.5, 10.8], // Short of Length
      [8.4, 6.1, 6.4, 7.8, 10.2], // Good Length
      [9.8, 8.8, 9.4, 10.6, 12.1], // Full
      [7.9, 6.8, 6.5, 7.2, 9.4], // Yorker
    ];
    const baseWktGrid: number[][] = [
      [4.2, 6.8, 6.1, 5.4, 2.8],
      [4.8, 7.9, 7.2, 5.1, 2.4],
      [5.4, 11.4, 10.6, 6.8, 2.2],
      [4.6, 7.2, 8.4, 6.2, 3.1],
      [6.1, 8.9, 12.2, 9.6, 3.5],
    ];

    const paceBonus = stadium.paceWicketPercent >= 62 ? -0.45 : 0.15;

    for (let l = 0; l < 5; l += 1) {
      for (let c = 0; c < 5; c += 1) {
        const jitter = (((seed + l * 17 + c * 31) % 9) - 4) * 0.12;
        const econ = Number(Math.max(4.8, baseEconGrid[l][c] + paceBonus + jitter).toFixed(2));
        const dism = Number(
          Math.max(1.8, baseWktGrid[l][c] + (paceBonus < 0 ? 0.8 : 0) + jitter * 0.8).toFixed(1)
        );
        const balls = 8 + ((seed + l * 7 + c * 11) % 14);
        const runs = Math.round((econ / 6) * balls);
        const wickets = dism >= 9.5 ? 2 : dism >= 6.8 ? 1 : 0;
        cells.push({
          lengthIdx: l,
          lineIdx: c,
          lengthLabel: LENGTH_LABELS[l],
          lineLabel: LINE_LABELS[c],
          balls,
          runs,
          economy: econ,
          dismissalPct: dism,
          wickets,
        });
      }
    }
    return cells;
  }, [stadium.paceWicketPercent, seed]);

  // =========================================================================
  // 7. PACE SPEED-BAND & SPIN VELOCITY MATCHUP MATRIX
  // =========================================================================
  const speedBands = useMemo<SpeedBandRow[]>(() => {
    const spinFriendly = stadium.spinWicketPercent >= 50;
    return [
      {
        bandLabel: 'Spin & Flighted Craft',
        velocitySpan: '78–96 km/h',
        balls: 78,
        runs: spinFriendly ? 94 : 109,
        strikeRate: spinFriendly ? 120.5 : 139.7,
        dismissals: spinFriendly ? 5 : 3,
        dotPct: spinFriendly ? 39 : 31,
        falseShotPct: spinFriendly ? 24.6 : 18.2,
      },
      {
        bandLabel: 'Cutters & Pace-Off',
        velocitySpan: '112–129 km/h',
        balls: 42,
        runs: 56,
        strikeRate: 133.3,
        dismissals: 3,
        dotPct: 34,
        falseShotPct: 22.8,
      },
      {
        bandLabel: 'Fast-Medium Seam',
        velocitySpan: '130–141 km/h',
        balls: 74,
        runs: 112,
        strikeRate: 151.4,
        dismissals: 4,
        dotPct: 33,
        falseShotPct: 19.5,
      },
      {
        bandLabel: 'Express Thunderbolts',
        velocitySpan: '142–153 km/h',
        balls: 46,
        runs: 76,
        strikeRate: 165.2,
        dismissals: 4,
        dotPct: 37,
        falseShotPct: 26.4,
      },
    ];
  }, [stadium.spinWicketPercent]);

  // =========================================================================
  // 8. 20-OVER CHASE EQUATION, PAR WORM & RRR ESCALATION
  // =========================================================================
  const wormPoints = useMemo<WormOverPoint[]>(() => {
    const par20 = stadium.avgFirstInningsScore || 178;
    const pts: WormOverPoint[] = [];
    let c1 = 0;
    let c2 = 0;

    for (let ov = 1; ov <= 20; ov += 1) {
      const ovEvents1 = innings1Events.filter((e) => e.overNumber === ov - 1);
      const ovEvents2 = innings2Events.filter((e) => e.overNumber === ov - 1);

      if (ovEvents1.length > 0) {
        c1 += ovEvents1.reduce((s, e) => s + e.runsScored, 0);
      } else {
        const phaseMult = ov <= 6 ? 8.6 : ov <= 15 ? 8.1 : 11.4;
        c1 += Math.round(phaseMult + (((seed + ov * 5) % 5) - 2));
      }

      const hasLive2 = innings2Events.length > 0;
      let inn2Val: number | null = null;
      if (hasLive2) {
        const maxOv2 = Math.max(...innings2Events.map((e) => e.overNumber)) + 1;
        if (ov <= maxOv2) {
          c2 += ovEvents2.reduce((s, e) => s + e.runsScored, 0);
          inn2Val = c2;
        }
      } else {
        const chaseMult = ov <= 6 ? 8.9 : ov <= 15 ? 8.0 : 11.8;
        c2 += Math.round(chaseMult + (((seed + ov * 11) % 5) - 2));
        inn2Val = c2;
      }

      const parCum = Math.round(par20 * Math.pow(ov / 20, 1.07));
      const finalTarget = targetRuns || Math.max(par20 + 1, c1 + 1);
      const remOvers = Math.max(1, 20 - ov);
      const chaseRrr =
        inn2Val !== null && ov < 20
          ? Number((Math.max(0, finalTarget - inn2Val) / remOvers).toFixed(2))
          : null;

      pts.push({
        over: ov,
        inn1CumRuns: c1,
        inn1WicketInOver:
          ovEvents1.length > 0 ? ovEvents1.some((e) => e.isWicket) : ov === 4 || ov === 11 || ov === 18,
        inn2CumRuns: inn2Val,
        inn2WicketInOver:
          ovEvents2.length > 0
            ? ovEvents2.some((e) => e.isWicket)
            : inn2Val !== null && (ov === 5 || ov === 13 || ov === 17),
        venueParCumRuns: parCum,
        chaseRrr,
      });
    }
    return pts;
  }, [innings1Events, innings2Events, stadium.avgFirstInningsScore, targetRuns, seed]);

  // =========================================================================
  // 9. FIELDING CONTROL, BOUNDARY SAVES & EXTRAS DISCIPLINE AUDIT
  // =========================================================================
  const fieldingAudit = useMemo<FieldingExtrasAudit>(() => {
    const countExtras = (events: BallEvent[]) =>
      events.filter((e) => e.extraType === 'wide' || e.extraType === 'noBall').length;

    const aExtras = innings2Events.length >= 6 ? countExtras(innings2Events) : 5 + (seed % 5);
    const bExtras = innings1Events.length >= 6 ? countExtras(innings1Events) : 6 + ((seed >> 2) % 5);

    const aInner = Math.round(8 + (teamA.ratings.fielding - 78) * 0.35);
    const aRope = 6 + (seed % 4);
    const aFreeHitCost = Math.round(aExtras * 0.85);
    const aNet = aInner + aRope - (aExtras + aFreeHitCost);

    const bInner = Math.round(8 + (teamB.ratings.fielding - 78) * 0.35);
    const bRope = 5 + ((seed >> 3) % 4);
    const bFreeHitCost = Math.round(bExtras * 0.95);
    const bNet = bInner + bRope - (bExtras + bFreeHitCost);

    return {
      teamAInnerRingSaves: aInner,
      teamABoundarySaves: aRope,
      teamACatchEfficiencyPct: Math.min(98, 82 + Math.round((teamA.ratings.fielding - 75) * 0.7)),
      teamAWidesNoBalls: aExtras,
      teamAFreeHitCost: aFreeHitCost,
      teamANetFieldingSwing: aNet,
      teamBInnerRingSaves: bInner,
      teamBBoundarySaves: bRope,
      teamBCatchEfficiencyPct: Math.min(98, 81 + Math.round((teamB.ratings.fielding - 75) * 0.7)),
      teamBWidesNoBalls: bExtras,
      teamBFreeHitCost: bFreeHitCost,
      teamBNetFieldingSwing: bNet,
    };
  }, [innings1Events, innings2Events, teamA.ratings.fielding, teamB.ratings.fielding, seed]);

  // =========================================================================
  // 10. MATCH TURNING-POINT & CLUTCH PRESSURE INDEX (CPI)
  // =========================================================================
  const turningPoints = useMemo<TurningPointItem[]>(() => {
    if (combinedLiveEvents.length >= 10) {
      const sorted = [...combinedLiveEvents]
        .sort((a, b) => Math.abs(b.winProbDelta || 0) - Math.abs(a.winProbDelta || 0))
        .slice(0, 5);

      return sorted.map((ev, i) => {
        const swing =
          ev.winProbDelta && ev.winProbDelta !== 0
            ? ev.winProbDelta
            : ev.isWicket
            ? -11.4
            : ev.runsScored >= 6
            ? 8.8
            : 5.2;
        return {
          rank: i + 1,
          overBallLabel: `${ev.overNumber + 1}.${ev.ballInOver}`,
          actorName: ev.isWicket ? ev.bowler.name : ev.batter.name,
          opponentName: ev.isWicket ? ev.batter.name : ev.bowler.name,
          teamId: ev.isWicket ? teamB.id : teamA.id,
          eventTitle: ev.isWicket
            ? `WICKET (${ev.wicketType || 'Dismissed'})`
            : `${ev.runsScored} RUNS (${ev.shot})`,
          wpaSwingPct: Number(swing.toFixed(1)),
          clutchPressureIdx: Math.min(99, 74 + ev.overNumber * 1 + (ev.isWicket ? 9 : 5)),
          verdict: ev.commentary || 'High-leverage momentum shift altering required run rate.',
        };
      });
    }

    const aStar = teamA.squad[0];
    const aDeath = teamA.squad.find((p) => p.role.includes('Bowler')) || teamA.squad[4];
    const bStar = teamB.squad[0];
    const bSpin = teamB.squad.find((p) => p.role.includes('Spin')) || teamB.squad[3];
    const aFinisher = teamA.squad[3] || teamA.squad[2];

    return [
      {
        rank: 1,
        overBallLabel: '18.4',
        actorName: aDeath.name,
        opponentName: bStar.name,
        teamId: teamA.id,
        eventTitle: '144 km/h Reverse-Swing Blockhole Wicket',
        wpaSwingPct: 16.8,
        clutchPressureIdx: 96,
        verdict: 'Shattered set chase anchor right before the 19th over launchpad.',
      },
      {
        rank: 2,
        overBallLabel: '16.2',
        actorName: bStar.name,
        opponentName: aDeath.name,
        teamId: teamB.id,
        eventTitle: 'Back-to-Back Sixes Over Extra Cover (19-Run Over)',
        wpaSwingPct: -14.2,
        clutchPressureIdx: 92,
        verdict: 'Compressed Required Run Rate from 11.80 down to 9.25 RPO in four balls.',
      },
      {
        rank: 3,
        overBallLabel: '11.5',
        actorName: bSpin.name,
        opponentName: aStar.name,
        teamId: teamB.id,
        eventTitle: '87 km/h Footmark Rough Stumping Squeeze',
        wpaSwingPct: -11.6,
        clutchPressureIdx: 84,
        verdict: 'Followed 3 consecutive middle-over dots to force a low-percentage slog-sweep.',
      },
      {
        rank: 4,
        overBallLabel: '19.1',
        actorName: aFinisher.name,
        opponentName: bSpin.name,
        teamId: teamA.id,
        eventTitle: '94m Flat-Bat Six Off Wide Yorker',
        wpaSwingPct: 10.4,
        clutchPressureIdx: 94,
        verdict: 'Lifted 1st innings total +9 runs above venue historical par.',
      },
      {
        rank: 5,
        overBallLabel: '4.3',
        actorName: aStar.name,
        opponentName: bStar.name,
        teamId: teamA.id,
        eventTitle: 'Powerplay 18-Run Momentum Surge',
        wpaSwingPct: 8.7,
        clutchPressureIdx: 78,
        verdict: 'Forced defensive spread of both permitted boundary riders before Over 5.',
      },
    ];
  }, [combinedLiveEvents, teamA, teamB]);

  const activeMatrixCell =
    lengthLineCells.find(
      (c) => c.lengthIdx === selectedMatrixCell.l && c.lineIdx === selectedMatrixCell.c
    ) || lengthLineCells[11];

  const activeWormPoint =
    wormPoints.find((w) => w.over === selectedWormOver) || wormPoints[wormPoints.length - 1];

  const showSection = (group: MatchAnalysisCategoryFilter) =>
    categoryFilter === 'all' || categoryFilter === group;

  return (
    <section className="space-y-6">
      {/* =====================================================================
          HEADER & FILTER CONTROLS
          ===================================================================== */}
      <div className="rounded-2xl border border-slate-800 bg-slate-950/90 p-5 sm:p-6 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2 text-xs font-mono text-cyan-400">
              <BarChart3 className="h-3.5 w-3.5 shrink-0" />
              <span>PRO MATCH ANALYSIS ENGINE · 10 TACTICAL MODULES</span>
              <span aria-hidden="true">·</span>
              <span className={hasLiveBallStream ? 'text-emerald-300' : 'text-amber-300'}>
                {hasLiveBallStream
                  ? `LIVE BALL-BY-BALL TELEMETRY (${combinedLiveEvents.length} DELIVERIES)`
                  : 'STRUCTURED MATCHUP PROJECTION MODEL'}
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight flex flex-wrap items-center gap-2.5">
              <TeamFlag code={teamA.id} size="md" />
              <span>{teamA.name}</span>
              <span className="text-slate-500 text-base font-semibold">vs</span>
              <TeamFlag code={teamB.id} size="md" />
              <span>{teamB.name}</span>
              <span className="text-slate-600 text-base font-normal">·</span>
              <span className="text-sm sm:text-base font-semibold text-slate-300">
                {stadium.name}
              </span>
            </h2>
            <p className="text-xs text-slate-400">
              Comprehensive 10-point match intelligence covering WPA, phase execution, dot-ball hazard, Expected Runs (xR), partnership rotation, 25-zone length×line matrix, pace/spin bands, chase worm, fielding discipline, and clutch turning points.
            </p>
          </div>

          {!embeddedMode && !propTeamA && (
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <select
                value={teamA.id}
                aria-label="Analysis Team A"
                onChange={(e) => setStandaloneTeamAId(e.target.value)}
                className="rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100 font-semibold cursor-pointer"
              >
                {TEAMS.map((t) => (
                  <option key={t.id} value={t.id} disabled={t.id === teamB.id}>
                    {t.name}
                  </option>
                ))}
              </select>

              <select
                value={teamB.id}
                aria-label="Analysis Team B"
                onChange={(e) => setStandaloneTeamBId(e.target.value)}
                className="rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100 font-semibold cursor-pointer"
              >
                {TEAMS.map((t) => (
                  <option key={t.id} value={t.id} disabled={t.id === teamA.id}>
                    {t.name}
                  </option>
                ))}
              </select>

              <select
                value={stadium.id}
                aria-label="Analysis Venue"
                onChange={(e) => setStandaloneStadiumId(e.target.value)}
                className="rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100 font-semibold cursor-pointer max-w-[200px]"
              >
                {STADIUMS.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Category Filter Tabs */}
        <div
          role="tablist"
          aria-label="Match Analysis Module Filter"
          className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-800/80 text-xs font-mono"
        >
          {(
            [
              { id: 'all', label: 'All Match Analytics' },
              { id: 'stamina_weather_shots', label: 'Stamina, Shot Selection & Weather' },
              { id: 'wpa_turning', label: 'WPA & Turning Points (#1, #10)' },
              { id: 'phases_worm', label: 'Phases, Chase Worm & Stands (#2, #5, #8)' },
              { id: 'pitch_matchups', label: 'Length×Line & Speed Bands (#6, #7)' },
              { id: 'execution_discipline', label: 'Dot Hazard, xR & Fielding (#3, #4, #9)' },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={categoryFilter === tab.id}
              onClick={() => {
                cricketAudio.playUiClick();
                setCategoryFilter(tab.id);
              }}
              className={`rounded-xl px-3.5 py-2 font-bold transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                categoryFilter === tab.id
                  ? 'bg-cyan-400 text-slate-950'
                  : 'border border-slate-800 bg-slate-900/90 text-slate-200 hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* =====================================================================
          BOWLER STAMINA TREND, SHOT SELECTION & WEATHER PITCH TELEMETRY SUITE
          ===================================================================== */}
      {showSection('stamina_weather_shots') && (
        <MatchAnalytics
          teamA={teamA}
          teamB={teamB}
          stadium={stadium}
          innings1Events={innings1Events}
          innings2Events={innings2Events}
          dewActive={dewActive}
          activeBowlerOverride={activeBowler}
        />
      )}

      {/* =====================================================================
          MODULES #1 & #10: WPA LEDGER + CLUTCH TURNING POINTS
          ===================================================================== */}
      {showSection('wpa_turning') && (
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
          {/* MODULE 01: Win Probability Added (WPA) & Leverage Index */}
          <div className="xl:col-span-6 rounded-2xl border border-slate-800 bg-slate-950/90 p-5 space-y-4">
            <div className="flex items-start justify-between gap-3 border-b border-slate-800/80 pb-3">
              <div>
                <span className="text-[11px] font-mono text-cyan-400 font-bold block">
                  01 · WIN PROBABILITY ADDED &amp; LEVERAGE LEDGER
                </span>
                <h3 className="text-base font-bold text-white mt-0.5">
                  Player Net WPA (%) &amp; Match Leverage Index
                </h3>
              </div>
              <TrendingUp className="h-5 w-5 text-cyan-400 shrink-0" />
            </div>

            <div className="space-y-2.5">
              {wpaLeaders.map((item) => {
                const isPos = item.netWpaPct >= 0;
                const widthPct = Math.min(100, Math.max(12, Math.abs(item.netWpaPct) * 4.2));
                return (
                  <div
                    key={item.player.id}
                    onClick={() => onInspectPlayer?.(item.player)}
                    className={`rounded-xl border border-slate-800/90 bg-slate-900/65 p-3 space-y-2 ${
                      onInspectPlayer ? 'cursor-pointer hover:border-cyan-500/40 transition-colors' : ''
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 text-xs">
                      <div className="flex items-center gap-2 min-w-0">
                        <CountryFlag countryCode={item.player.countryCode} size="xs" />
                        <strong className="text-white truncate">{item.player.name}</strong>
                        <span className="text-slate-500">·</span>
                        <span className="font-mono text-[11px] text-slate-400">
                          {item.roleTag} · {item.headlineStat}
                        </span>
                      </div>
                      <div className="flex items-center gap-2.5 font-mono tabular-nums shrink-0">
                        <span className="text-[11px] text-slate-400">LI {item.avgLeverage}x</span>
                        <strong className={isPos ? 'text-emerald-400' : 'text-rose-400'}>
                          {isPos ? `+${item.netWpaPct}%` : `${item.netWpaPct}%`} WPA
                        </strong>
                      </div>
                    </div>

                    <div className="h-1.5 w-full rounded-full bg-slate-950 overflow-hidden">
                      <div
                        className={`h-full rounded-full ${
                          isPos ? 'bg-emerald-400' : 'bg-rose-500'
                        }`}
                        style={{ width: `${widthPct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* MODULE 10: Clutch Pressure Rating & Top 5 Turning Points */}
          <div className="xl:col-span-6 rounded-2xl border border-slate-800 bg-slate-950/90 p-5 space-y-4">
            <div className="flex items-start justify-between gap-3 border-b border-slate-800/80 pb-3">
              <div>
                <span className="text-[11px] font-mono text-amber-400 font-bold block">
                  10 · CLUTCH PRESSURE INDEX &amp; TURNING POINTS
                </span>
                <h3 className="text-base font-bold text-white mt-0.5">
                  Top 5 Match-Defining Deliveries &amp; Win% Swings
                </h3>
              </div>
              <Flame className="h-5 w-5 text-amber-400 shrink-0" />
            </div>

            <div className="space-y-2.5">
              {turningPoints.map((tp) => {
                const pos = tp.wpaSwingPct >= 0;
                return (
                  <div
                    key={`${tp.rank}-${tp.overBallLabel}`}
                    className="rounded-xl border border-slate-800/90 bg-slate-900/65 p-3 space-y-1.5"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="font-mono font-black text-amber-300 tabular-nums">
                          #{tp.rank} · Ov {tp.overBallLabel}
                        </span>
                        <TeamFlag code={tp.teamId} size="xs" />
                        <strong className="text-white truncate">{tp.eventTitle}</strong>
                      </div>
                      <div className="flex items-center gap-2 font-mono text-[11px] tabular-nums shrink-0">
                        <span className="text-cyan-300">CPI {tp.clutchPressureIdx}</span>
                        <strong className={pos ? 'text-emerald-400' : 'text-rose-400'}>
                          {pos ? `+${tp.wpaSwingPct}%` : `${tp.wpaSwingPct}%`}
                        </strong>
                      </div>
                    </div>

                    <p className="text-[11px] text-slate-300 leading-snug">
                      <span className="font-semibold text-slate-100">
                        {tp.actorName} vs {tp.opponentName}:
                      </span>{' '}
                      {tp.verdict}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          MODULES #2, #8, #5: PHASE EXECUTION + CHASE WORM + PARTNERSHIP MATRIX
          ===================================================================== */}
      {showSection('phases_worm') && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
            {/* MODULE 02: Phase-by-Phase Execution Split */}
            <div className="xl:col-span-6 rounded-2xl border border-slate-800 bg-slate-950/90 p-5 space-y-4">
              <div className="flex items-start justify-between gap-3 border-b border-slate-800/80 pb-3">
                <div>
                  <span className="text-[11px] font-mono text-emerald-400 font-bold block">
                    02 · TACTICAL PHASE EXECUTION SPLIT
                  </span>
                  <h3 className="text-base font-bold text-white mt-0.5">
                    Powerplay vs Middle Squeeze vs Death Overs
                  </h3>
                </div>
                <Layers className="h-5 w-5 text-emerald-400 shrink-0" />
              </div>

              <div className="space-y-3">
                {phaseSplits.map((ph) => (
                  <div
                    key={ph.phaseId}
                    className="rounded-xl border border-slate-800 bg-slate-900/70 p-3.5 space-y-2.5 tabular-nums"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                      <div>
                        <strong className="text-white">{ph.label}</strong>
                        <span className="text-slate-500 mx-1.5">·</span>
                        <span className="font-mono text-slate-400">{ph.oversSpan}</span>
                      </div>
                      <span className="font-mono text-[11px] font-bold text-cyan-300">
                        {ph.edgeSummary}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-xs font-mono">
                      <div className="rounded-lg border border-slate-800 bg-slate-950/80 p-2.5 space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="inline-flex items-center gap-1.5 font-bold text-slate-200">
                            <TeamFlag code={teamA.id} size="xs" />
                            <span>{teamA.shortName}</span>
                          </span>
                          <strong className="text-white text-sm">
                            {ph.teamARuns}/{ph.teamAWickets}
                          </strong>
                        </div>
                        <div className="flex items-center justify-between text-[10px] text-slate-400">
                          <span>RR {ph.teamARR}</span>
                          <span>Dots {ph.teamADotPct}%</span>
                          <span>Bnd {ph.teamABndPct}%</span>
                        </div>
                      </div>

                      <div className="rounded-lg border border-slate-800 bg-slate-950/80 p-2.5 space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="inline-flex items-center gap-1.5 font-bold text-slate-200">
                            <TeamFlag code={teamB.id} size="xs" />
                            <span>{teamB.shortName}</span>
                          </span>
                          <strong className="text-white text-sm">
                            {ph.teamBRuns}/{ph.teamBWickets}
                          </strong>
                        </div>
                        <div className="flex items-center justify-between text-[10px] text-slate-400">
                          <span>RR {ph.teamBRR}</span>
                          <span>Dots {ph.teamBDotPct}%</span>
                          <span>Bnd {ph.teamBBndPct}%</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* MODULE 08: 20-Over Chase Worm, Par Trajectory & RRR Escalation */}
            <div className="xl:col-span-6 rounded-2xl border border-slate-800 bg-slate-950/90 p-5 space-y-4">
              <div className="flex items-start justify-between gap-3 border-b border-slate-800/80 pb-3">
                <div>
                  <span className="text-[11px] font-mono text-sky-400 font-bold block">
                    08 · CHASE EQUATION, PAR WORM &amp; RRR ESCALATION
                  </span>
                  <h3 className="text-base font-bold text-white mt-0.5">
                    20-Over Cumulative Scoring Worm &amp; Wicket Markers
                  </h3>
                </div>
                <Activity className="h-5 w-5 text-sky-400 shrink-0" />
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono">
                <div className="flex flex-wrap items-center gap-3">
                  <span className="inline-flex items-center gap-1.5 text-cyan-300">
                    <span className="h-0.5 w-3.5 bg-cyan-400 inline-block" />
                    <span>1st Inn ({teamA.shortName})</span>
                  </span>
                  <span className="inline-flex items-center gap-1.5 text-amber-300">
                    <span className="h-0.5 w-3.5 bg-amber-400 inline-block" />
                    <span>2nd Inn ({teamB.shortName})</span>
                  </span>
                  <span className="inline-flex items-center gap-1.5 text-slate-400">
                    <span className="h-0.5 w-3.5 bg-slate-500 inline-block" />
                    <span>Venue Par ({stadium.avgFirstInningsScore})</span>
                  </span>
                </div>
                <span className="text-slate-400">Click chart over to inspect</span>
              </div>

              <svg
                viewBox="0 0 500 185"
                className="w-full h-auto rounded-xl border border-slate-800 bg-slate-900/70 p-2 select-none"
                role="img"
                aria-label="20-over cumulative scoring worm comparison"
              >
                {[0, 60, 120, 180, 220].map((val) => {
                  const y = 154 - (val / 230) * 130;
                  return (
                    <g key={val}>
                      <line
                        x1="36"
                        y1={y}
                        x2="484"
                        y2={y}
                        stroke="#1e293b"
                        strokeWidth="0.8"
                        strokeDasharray="3 3"
                      />
                      <text
                        x="30"
                        y={y + 3}
                        textAnchor="end"
                        fill="#64748b"
                        fontSize="7.5"
                        fontFamily="monospace"
                      >
                        {val}
                      </text>
                    </g>
                  );
                })}

                {/* Venue Par Dashed Curve */}
                <polyline
                  fill="none"
                  stroke="#64748b"
                  strokeWidth="1.4"
                  strokeDasharray="4 3"
                  points={wormPoints
                    .map((p) => {
                      const x = 40 + ((p.over - 1) / 19) * 440;
                      const y = 154 - (Math.min(230, p.venueParCumRuns) / 230) * 130;
                      return `${x},${y}`;
                    })
                    .join(' ')}
                />

                {/* 1st Innings Worm */}
                <polyline
                  fill="none"
                  stroke="#22d3ee"
                  strokeWidth="2.2"
                  points={wormPoints
                    .map((p) => {
                      const x = 40 + ((p.over - 1) / 19) * 440;
                      const y = 154 - (Math.min(230, p.inn1CumRuns) / 230) * 130;
                      return `${x},${y}`;
                    })
                    .join(' ')}
                />

                {/* 2nd Innings Worm */}
                <polyline
                  fill="none"
                  stroke="#fbbf24"
                  strokeWidth="2.2"
                  points={wormPoints
                    .filter((p) => p.inn2CumRuns !== null)
                    .map((p) => {
                      const x = 40 + ((p.over - 1) / 19) * 440;
                      const y = 154 - (Math.min(230, p.inn2CumRuns || 0) / 230) * 130;
                      return `${x},${y}`;
                    })
                    .join(' ')}
                />

                {/* Interactive Over Columns & Wicket Dots */}
                {wormPoints.map((p) => {
                  const x = 40 + ((p.over - 1) / 19) * 440;
                  const y1 = 154 - (Math.min(230, p.inn1CumRuns) / 230) * 130;
                  const y2 =
                    p.inn2CumRuns !== null
                      ? 154 - (Math.min(230, p.inn2CumRuns) / 230) * 130
                      : null;
                  const selected = p.over === selectedWormOver;

                  return (
                    <g
                      key={p.over}
                      onClick={() => {
                        cricketAudio.playUiClick();
                        setSelectedWormOver(p.over);
                      }}
                      className="cursor-pointer"
                    >
                      {selected && (
                        <line
                          x1={x}
                          y1="18"
                          x2={x}
                          y2="154"
                          stroke="#f8fafc"
                          strokeOpacity="0.55"
                          strokeWidth="1.1"
                        />
                      )}
                      <rect x={x - 10} y="16" width="20" height="145" fill="transparent" />
                      {p.inn1WicketInOver && (
                        <circle
                          cx={x}
                          cy={y1}
                          r="3.6"
                          fill="#f43f5e"
                          stroke="#ffffff"
                          strokeWidth="0.9"
                        />
                      )}
                      {p.inn2WicketInOver && y2 !== null && (
                        <circle
                          cx={x}
                          cy={y2}
                          r="3.6"
                          fill="#fb7185"
                          stroke="#fde047"
                          strokeWidth="0.9"
                        />
                      )}
                      {p.over % 2 === 0 && (
                        <text
                          x={x}
                          y="170"
                          textAnchor="middle"
                          fill={selected ? '#ffffff' : '#94a3b8'}
                          fontSize="7.5"
                          fontFamily="monospace"
                        >
                          Ov {p.over}
                        </text>
                      )}
                    </g>
                  );
                })}
              </svg>

              <div className="rounded-xl border border-slate-800 bg-slate-900/80 px-3.5 py-2.5 flex flex-wrap items-center justify-between gap-2 text-xs font-mono tabular-nums">
                <strong className="text-white">End of Over {activeWormPoint.over}:</strong>
                <span className="text-cyan-300">
                  {teamA.shortName}: <strong>{activeWormPoint.inn1CumRuns}</strong>
                </span>
                <span className="text-amber-300">
                  {teamB.shortName}:{' '}
                  <strong>
                    {activeWormPoint.inn2CumRuns !== null ? activeWormPoint.inn2CumRuns : 'Pending'}
                  </strong>
                </span>
                <span className="text-slate-300">
                  Venue Par: <strong>{activeWormPoint.venueParCumRuns}</strong>
                </span>
                {activeWormPoint.chaseRrr !== null && (
                  <span className="text-rose-300">
                    Chase RRR: <strong>{activeWormPoint.chaseRrr} RPO</strong>
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* MODULE 05: Partnership Momentum & Left-Right Hand Combination Matrix */}
          <div className="rounded-2xl border border-slate-800 bg-slate-950/90 p-5 space-y-4">
            <div className="flex items-start justify-between gap-3 border-b border-slate-800/80 pb-3">
              <div>
                <span className="text-[11px] font-mono text-teal-400 font-bold block">
                  05 · PARTNERSHIP MOMENTUM &amp; STRIKE-ROTATION MATRIX
                </span>
                <h3 className="text-base font-bold text-white mt-0.5">
                  Key Batting Stands, LHB–RHB Line Disruption &amp; Boundary Dependency
                </h3>
              </div>
              <GitBranch className="h-5 w-5 text-teal-400 shrink-0" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 tabular-nums">
              {partnershipRows.map((st) => (
                <div
                  key={st.standOrder}
                  className="rounded-xl border border-slate-800 bg-slate-900/70 p-4 space-y-2.5"
                >
                  <div className="flex items-center justify-between gap-2">
                    <strong className="text-xs text-white truncate">{st.pairNames}</strong>
                    <span className="text-[11px] font-mono text-teal-300 shrink-0">
                      {st.handCombo}
                    </span>
                  </div>

                  <div className="flex items-baseline justify-between font-mono">
                    <span className="text-xl font-black text-white">
                      {st.runs} <span className="text-xs font-normal text-slate-400">({st.balls}b)</span>
                    </span>
                    <span className="text-xs font-bold text-cyan-300">{st.runRate} RPO</span>
                  </div>

                  <div className="h-2 w-full rounded-full bg-slate-950 overflow-hidden flex">
                    <div
                      className="h-full bg-teal-400"
                      style={{ width: `${st.rotationPct}%` }}
                      title="1s & 2s Strike Rotation %"
                    />
                    <div
                      className="h-full bg-violet-500"
                      style={{ width: `${100 - st.rotationPct}%` }}
                      title="Boundary Scoring Share %"
                    />
                  </div>

                  <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
                    <span className="text-teal-300">Rotation {st.rotationPct}%</span>
                    <span className="text-violet-300">Boundaries {st.boundarySharePct}%</span>
                    <span>Ctrl {st.controlIndex}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          MODULES #6 & #7: 25-CELL LENGTHxLINE MATRIX + PACE/SPIN SPEED BANDS
          ===================================================================== */}
      {showSection('pitch_matchups') && (
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
          {/* MODULE 06: 25-Cell Bowling Length x Line Run-Value & Dismissal Heatmap */}
          <div className="xl:col-span-7 rounded-2xl border border-slate-800 bg-slate-950/90 p-5 space-y-4">
            <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-800/80 pb-3">
              <div>
                <span className="text-[11px] font-mono text-orange-400 font-bold block">
                  06 · 25-ZONE BOWLING LENGTH × LINE HEAT MATRIX
                </span>
                <h3 className="text-base font-bold text-white mt-0.5">
                  Economy Rate (RPO) &amp; Dismissal Threat (%) Across Pitch Corridors
                </h3>
              </div>

              <div className="inline-flex rounded-xl border border-slate-800 bg-slate-900 p-0.5 text-[11px] font-mono">
                <button
                  type="button"
                  onClick={() => setMatrixMetricMode('economy')}
                  className={`px-2.5 py-1 rounded-lg font-bold cursor-pointer whitespace-nowrap ${
                    matrixMetricMode === 'economy'
                      ? 'bg-cyan-400 text-slate-950'
                      : 'text-slate-300 hover:text-white'
                  }`}
                >
                  Economy RPO
                </button>
                <button
                  type="button"
                  onClick={() => setMatrixMetricMode('dismissal')}
                  className={`px-2.5 py-1 rounded-lg font-bold cursor-pointer whitespace-nowrap ${
                    matrixMetricMode === 'dismissal'
                      ? 'bg-rose-500 text-white'
                      : 'text-slate-300 hover:text-white'
                  }`}
                >
                  Wicket Threat %
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <div className="min-w-[460px] space-y-1.5 font-mono text-xs tabular-nums">
                {/* Column Headers */}
                <div className="grid grid-cols-6 gap-1.5 text-[10px] text-slate-400 pb-1">
                  <div className="text-left pl-1">LENGTH \ LINE</div>
                  {LINE_LABELS.map((ln) => (
                    <div key={ln} className="text-center truncate">
                      {ln}
                    </div>
                  ))}
                </div>

                {/* 5 Length Rows */}
                {LENGTH_LABELS.map((lenLabel, lIdx) => (
                  <div key={lenLabel} className="grid grid-cols-6 gap-1.5 items-center">
                    <div className="text-[11px] font-bold text-slate-300 truncate pr-1">
                      {lenLabel}
                    </div>
                    {LINE_LABELS.map((_, cIdx) => {
                      const cell = lengthLineCells.find(
                        (x) => x.lengthIdx === lIdx && x.lineIdx === cIdx
                      )!;
                      const isSel =
                        selectedMatrixCell.l === lIdx && selectedMatrixCell.c === cIdx;

                      let bgClass = 'bg-slate-900 border-slate-800 text-slate-200';
                      if (matrixMetricMode === 'economy') {
                        if (cell.economy <= 6.8)
                          bgClass = 'bg-emerald-950/75 border-emerald-500/45 text-emerald-200';
                        else if (cell.economy <= 8.6)
                          bgClass = 'bg-cyan-950/60 border-cyan-500/35 text-cyan-200';
                        else if (cell.economy <= 10.2)
                          bgClass = 'bg-amber-950/65 border-amber-500/40 text-amber-200';
                        else bgClass = 'bg-rose-950/75 border-rose-500/50 text-rose-200';
                      } else {
                        if (cell.dismissalPct >= 10)
                          bgClass = 'bg-rose-950/85 border-rose-400/65 text-rose-100';
                        else if (cell.dismissalPct >= 7)
                          bgClass = 'bg-orange-950/70 border-orange-500/45 text-orange-200';
                        else if (cell.dismissalPct >= 4.5)
                          bgClass = 'bg-slate-900 border-slate-700 text-slate-200';
                        else bgClass = 'bg-slate-950 border-slate-800/80 text-slate-400';
                      }

                      return (
                        <button
                          key={`${lIdx}-${cIdx}`}
                          type="button"
                          onClick={() => {
                            cricketAudio.playUiClick();
                            setSelectedMatrixCell({ l: lIdx, c: cIdx });
                          }}
                          className={`rounded-lg border py-2 px-1 text-center font-bold transition-all cursor-pointer ${bgClass} ${
                            isSel ? 'ring-2 ring-white' : ''
                          }`}
                        >
                          {matrixMetricMode === 'economy'
                            ? cell.economy.toFixed(1)
                            : `${cell.dismissalPct}%`}
                        </button>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-900/80 p-3 flex flex-wrap items-center justify-between gap-2 text-xs font-mono tabular-nums">
              <span className="text-white font-bold">
                {activeMatrixCell.lengthLabel} · {activeMatrixCell.lineLabel}
              </span>
              <span className="text-cyan-300">
                Economy: <strong>{activeMatrixCell.economy} RPO</strong>
              </span>
              <span className="text-rose-300">
                Wicket Threat: <strong>{activeMatrixCell.dismissalPct}%</strong>
              </span>
              <span className="text-slate-300">
                Sample: {activeMatrixCell.runs}r / {activeMatrixCell.balls}b ({activeMatrixCell.wickets}W)
              </span>
            </div>
          </div>

          {/* MODULE 07: Pace Speed-Band & Spin Matchup Matrix */}
          <div className="xl:col-span-5 rounded-2xl border border-slate-800 bg-slate-950/90 p-5 space-y-4">
            <div className="flex items-start justify-between gap-3 border-b border-slate-800/80 pb-3">
              <div>
                <span className="text-[11px] font-mono text-violet-400 font-bold block">
                  07 · PACE VELOCITY BANDS &amp; SPIN MATCHUP
                </span>
                <h3 className="text-base font-bold text-white mt-0.5">
                  Strike Rate, Dot % &amp; False-Shot Rate by Speed Tier
                </h3>
              </div>
              <Gauge className="h-5 w-5 text-violet-400 shrink-0" />
            </div>

            <div className="space-y-3 tabular-nums">
              {speedBands.map((band) => (
                <div
                  key={band.bandLabel}
                  className="rounded-xl border border-slate-800 bg-slate-900/70 p-3.5 space-y-2"
                >
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <div>
                      <strong className="text-white">{band.bandLabel}</strong>
                      <span className="text-slate-500 mx-1.5">·</span>
                      <span className="font-mono text-slate-400">{band.velocitySpan}</span>
                    </div>
                    <strong className="font-mono text-cyan-300">SR {band.strikeRate}</strong>
                  </div>

                  <div className="h-1.5 w-full rounded-full bg-slate-950 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-violet-500 to-cyan-400"
                      style={{ width: `${Math.min(100, (band.strikeRate / 185) * 100)}%` }}
                    />
                  </div>

                  <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
                    <span>
                      {band.runs}r / {band.balls}b
                    </span>
                    <span className="text-rose-300">{band.dismissals} Wickets</span>
                    <span>Dots {band.dotPct}%</span>
                    <span className="text-amber-300">False Shot {band.falseShotPct}%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          MODULES #3, #4, #9: DOT HAZARD + EXPECTED RUNS (xR) + FIELDING AUDIT
          ===================================================================== */}
      {showSection('execution_discipline') && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
            {/* MODULE 03: Dot-Ball Pressure Buildup & Release-Shot Hazard Curve */}
            <div className="xl:col-span-5 rounded-2xl border border-slate-800 bg-slate-950/90 p-5 space-y-4">
              <div className="flex items-start justify-between gap-3 border-b border-slate-800/80 pb-3">
                <div>
                  <span className="text-[11px] font-mono text-rose-400 font-bold block">
                    03 · DOT-BALL PRESSURE &amp; RELEASE HAZARD
                  </span>
                  <h3 className="text-base font-bold text-white mt-0.5">
                    Consecutive Dot Squeeze vs Next-Ball Dismissal Risk
                  </h3>
                </div>
                <Crosshair className="h-5 w-5 text-rose-400 shrink-0" />
              </div>

              <div className="space-y-2.5 tabular-nums">
                {dotPressureCurve.map((pt) => (
                  <div
                    key={pt.consecutiveDots}
                    className="rounded-xl border border-slate-800 bg-slate-900/70 p-3 space-y-1.5"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <strong className="text-white">{pt.consecutiveDots}</strong>
                      <span className="font-mono text-rose-400 font-bold">
                        Wicket Hazard {pt.wicketHazardPct}%
                      </span>
                    </div>

                    <div className="h-1.5 w-full rounded-full bg-slate-950 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-amber-400 to-rose-500"
                        style={{ width: `${Math.min(100, pt.falseShotPct * 2)}%` }}
                      />
                    </div>

                    <div className="flex items-center justify-between text-[10px] font-mono text-slate-400">
                      <span>False Shot {pt.falseShotPct}%</span>
                      <span className="text-cyan-300">Release 4/6: {pt.releaseBoundaryPct}%</span>
                      <span>1s Escape: {pt.singleEscapePct}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* MODULE 04: Expected Runs (xR) & Expected Wickets (xW) Execution Audit */}
            <div className="xl:col-span-7 rounded-2xl border border-slate-800 bg-slate-950/90 p-5 space-y-4">
              <div className="flex items-start justify-between gap-3 border-b border-slate-800/80 pb-3">
                <div>
                  <span className="text-[11px] font-mono text-cyan-400 font-bold block">
                    04 · EXPECTED RUNS (xR) &amp; EXPECTED WICKETS (xW) AUDIT
                  </span>
                  <h3 className="text-base font-bold text-white mt-0.5">
                    Shot-Making Alpha &amp; Bowling Runs-Saved vs Ball Difficulty Model
                  </h3>
                </div>
                <Target className="h-5 w-5 text-cyan-400 shrink-0" />
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs font-mono tabular-nums">
                  <thead>
                    <tr className="border-b border-slate-800 text-[10px] text-slate-400">
                      <th className="py-2 pr-3">PLAYER</th>
                      <th className="py-2 px-2">MODEL</th>
                      <th className="py-2 px-2 text-right">ACTUAL</th>
                      <th className="py-2 px-2 text-right">EXPECTED (xR)</th>
                      <th className="py-2 px-2 text-right">EXECUTION Δ</th>
                      <th className="py-2 pl-2 text-right">xW / WKTS</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/70">
                    {expectedRunsRows.map((r) => {
                      const pos = r.alphaDelta >= 0;
                      return (
                        <tr
                          key={`${r.player.id}-${r.discipline}`}
                          onClick={() => onInspectPlayer?.(r.player)}
                          className={
                            onInspectPlayer
                              ? 'hover:bg-slate-900/80 cursor-pointer transition-colors'
                              : ''
                          }
                        >
                          <td className="py-2.5 pr-3 font-sans font-semibold text-white">
                            <div className="flex items-center gap-2">
                              <TeamFlag code={r.teamId} size="xs" />
                              <span className="truncate">{r.player.name}</span>
                            </div>
                          </td>
                          <td className="py-2.5 px-2 text-[11px] text-slate-400">{r.discipline}</td>
                          <td className="py-2.5 px-2 text-right text-slate-100">
                            {r.actualRuns} ({r.balls}b)
                          </td>
                          <td className="py-2.5 px-2 text-right text-slate-300">
                            {r.expectedRuns}
                          </td>
                          <td
                            className={`py-2.5 px-2 text-right font-bold ${
                              pos ? 'text-emerald-400' : 'text-rose-400'
                            }`}
                          >
                            {pos ? `+${r.alphaDelta}` : r.alphaDelta} runs
                          </td>
                          <td className="py-2.5 pl-2 text-right text-cyan-300">
                            {r.expectedWickets} / {r.actualWickets}W
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* MODULE 09: Fielding Control, Boundary Saves & Extras Discipline Audit */}
          <div className="rounded-2xl border border-slate-800 bg-slate-950/90 p-5 space-y-4">
            <div className="flex items-start justify-between gap-3 border-b border-slate-800/80 pb-3">
              <div>
                <span className="text-[11px] font-mono text-emerald-400 font-bold block">
                  09 · FIELDING CONTROL, BOUNDARY SAVES &amp; EXTRAS TAX AUDIT
                </span>
                <h3 className="text-base font-bold text-white mt-0.5">
                  Hidden Runs Saved in the Ring/Rope vs Wides, No-Balls &amp; Free-Hit Leakage
                </h3>
              </div>
              <Shield className="h-5 w-5 text-emerald-400 shrink-0" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 font-mono text-xs tabular-nums">
              <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 font-sans font-bold text-sm text-white">
                    <TeamCrest teamId={teamA.id} size={24} />
                    <span>{teamA.name} Fielding &amp; Discipline</span>
                  </div>
                  <strong
                    className={
                      fieldingAudit.teamANetFieldingSwing >= 0
                        ? 'text-emerald-400'
                        : 'text-rose-400'
                    }
                  >
                    Net {fieldingAudit.teamANetFieldingSwing >= 0 ? '+' : ''}
                    {fieldingAudit.teamANetFieldingSwing} Runs
                  </strong>
                </div>

                <div className="grid grid-cols-3 gap-2 text-[11px]">
                  <div className="rounded-lg bg-slate-950/85 p-2 border border-slate-800">
                    <span className="text-slate-400 block text-[9px]">RING + ROPE SAVES</span>
                    <strong className="text-emerald-300">
                      +{fieldingAudit.teamAInnerRingSaves + fieldingAudit.teamABoundarySaves} runs
                    </strong>
                  </div>
                  <div className="rounded-lg bg-slate-950/85 p-2 border border-slate-800">
                    <span className="text-slate-400 block text-[9px]">CATCH EFFICIENCY</span>
                    <strong className="text-cyan-300">
                      {fieldingAudit.teamACatchEfficiencyPct}%
                    </strong>
                  </div>
                  <div className="rounded-lg bg-slate-950/85 p-2 border border-slate-800">
                    <span className="text-slate-400 block text-[9px]">EXTRAS + FREE HIT</span>
                    <strong className="text-rose-300">
                      -{fieldingAudit.teamAWidesNoBalls + fieldingAudit.teamAFreeHitCost} runs
                    </strong>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 font-sans font-bold text-sm text-white">
                    <TeamCrest teamId={teamB.id} size={24} />
                    <span>{teamB.name} Fielding &amp; Discipline</span>
                  </div>
                  <strong
                    className={
                      fieldingAudit.teamBNetFieldingSwing >= 0
                        ? 'text-emerald-400'
                        : 'text-rose-400'
                    }
                  >
                    Net {fieldingAudit.teamBNetFieldingSwing >= 0 ? '+' : ''}
                    {fieldingAudit.teamBNetFieldingSwing} Runs
                  </strong>
                </div>

                <div className="grid grid-cols-3 gap-2 text-[11px]">
                  <div className="rounded-lg bg-slate-950/85 p-2 border border-slate-800">
                    <span className="text-slate-400 block text-[9px]">RING + ROPE SAVES</span>
                    <strong className="text-emerald-300">
                      +{fieldingAudit.teamBInnerRingSaves + fieldingAudit.teamBBoundarySaves} runs
                    </strong>
                  </div>
                  <div className="rounded-lg bg-slate-950/85 p-2 border border-slate-800">
                    <span className="text-slate-400 block text-[9px]">CATCH EFFICIENCY</span>
                    <strong className="text-cyan-300">
                      {fieldingAudit.teamBCatchEfficiencyPct}%
                    </strong>
                  </div>
                  <div className="rounded-lg bg-slate-950/85 p-2 border border-slate-800">
                    <span className="text-slate-400 block text-[9px]">EXTRAS + FREE HIT</span>
                    <strong className="text-rose-300">
                      -{fieldingAudit.teamBWidesNoBalls + fieldingAudit.teamBFreeHitCost} runs
                    </strong>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
