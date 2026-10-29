import React, { useState, useMemo } from 'react';
import { Player, Team, BallEvent } from '../../types/cricket';
import { CountryFlag, PlayerCardAvatar } from '../common/CricketIdentity';
import { cricketAudio } from '../../utils/audioSystem';
import {
  Activity,
  Flame,
  Zap,
  Target,
  Shield,
  Award,
  ChevronRight,
  TrendingDown,
  TrendingUp,
  AlertCircle,
  Sparkles,
} from 'lucide-react';

export interface BowlerStatsComputed {
  bowler: Player;
  overs: string;
  legalBalls: number;
  maidens: number;
  runs: number;
  wickets: number;
  economy: number;
  dots: number;
  dotPercent: number;
  fours: number;
  sixes: number;
  wides: number;
  noBalls: number;
  strikeRate: number | null; // balls per wicket
  isCurrentBowler: boolean;
  wicketsList: Array<{
    batterName: string;
    wicketType?: string;
    over: string;
    speedKmh: number;
  }>;
}

export interface BowlingScorecardProps {
  history: BallEvent[];
  bowlingTeam: Team;
  currentBowler?: Player | null;
  className?: string;
  onInspectPlayer?: (player: Player) => void;
}

export const BowlingScorecard: React.FC<BowlingScorecardProps> = ({
  history,
  bowlingTeam,
  currentBowler,
  className = '',
  onInspectPlayer,
}) => {
  const [selectedBowlerId, setSelectedBowlerId] = useState<string | null>(null);

  // Authoritative calculations from delivery records
  const { bowlerFigures, totalExtras, overallOverSummary } = useMemo(() => {
    const bowlerMap = new Map<
      string,
      {
        player: Player;
        balls: BallEvent[];
      }
    >();

    // 1. Group deliveries by bowler
    history.forEach((ball) => {
      if (!ball.bowler) return;
      const id = ball.bowler.id || ball.bowler.name;
      if (!bowlerMap.has(id)) {
        bowlerMap.set(id, { player: ball.bowler, balls: [] });
      }
      bowlerMap.get(id)!.balls.push(ball);
    });

    // If history has no balls or fewer bowlers, include key bowling squad members
    if (bowlerMap.size === 0 && bowlingTeam.squad) {
      const bowlingSquad = bowlingTeam.squad.filter(
        (p) =>
          p.role.toLowerCase().includes('bowler') ||
          p.role.toLowerCase().includes('all-rounder')
      );
      (bowlingSquad.length > 0 ? bowlingSquad : bowlingTeam.squad.slice(5, 10)).forEach(
        (p) => {
          bowlerMap.set(p.id, { player: p, balls: [] });
        }
      );
    }

    let widesCount = 0;
    let noBallsCount = 0;
    let penaltyExtras = 0;

    history.forEach((b) => {
      if (b.outcome === 'WD') widesCount++;
      if (b.outcome === 'NB') noBallsCount++;
    });

    const lastBallBowlerId = history.length > 0 && history[history.length - 1].bowler
      ? history[history.length - 1].bowler.id || history[history.length - 1].bowler.name
      : null;

    const figures: BowlerStatsComputed[] = Array.from(bowlerMap.values()).map(
      ({ player, balls }) => {
        let legalBalls = 0;
        let runsConceded = 0;
        let wicketsTaken = 0;
        let dots = 0;
        let fours = 0;
        let sixes = 0;
        let bowlerWides = 0;
        let bowlerNoBalls = 0;
        const wicketsList: BowlerStatsComputed['wicketsList'] = [];

        // Track balls by over for maiden calculation
        const ballsByOver: { [over: number]: BallEvent[] } = {};

        balls.forEach((b) => {
          const isWide = b.outcome === 'WD';
          const isNoBall = b.outcome === 'NB';

          if (isWide) bowlerWides++;
          if (isNoBall) bowlerNoBalls++;

          if (!isWide && !isNoBall) {
            legalBalls++;
          }

          // Runs charged to bowler
          runsConceded += b.runsScored || 0;

          if (b.outcome === '0') dots++;
          if (b.outcome === '4') fours++;
          if (b.outcome === '6') sixes++;

          // Wickets credited to bowler (exclude run-outs)
          if (b.isWicket && b.wicketType !== 'Run Out') {
            wicketsTaken++;
            wicketsList.push({
              batterName: b.batter?.name || 'Batter',
              wicketType: b.wicketType || 'Dismissed',
              over: `${b.overNumber !== undefined ? b.overNumber : Math.floor((b.totalBalls || 0) / 6)}.${b.ballInOver || 1}`,
              speedKmh: b.speedKmh,
            });
          }

          const oNum = b.overNumber !== undefined ? b.overNumber : Math.floor((b.totalBalls || 0) / 6);
          if (!ballsByOver[oNum]) ballsByOver[oNum] = [];
          ballsByOver[oNum].push(b);
        });

        // Calculate maidens
        let maidens = 0;
        Object.values(ballsByOver).forEach((overBalls) => {
          const legalInOver = overBalls.filter(
            (b) => b.outcome !== 'WD' && b.outcome !== 'NB'
          ).length;
          const runsInOver = overBalls.reduce((acc, b) => acc + (b.runsScored || 0), 0);
          if (legalInOver >= 6 && runsInOver === 0) {
            maidens++;
          }
        });

        // Format overs
        const completedOvers = Math.floor(legalBalls / 6);
        const remainderBalls = legalBalls % 6;
        const oversStr = `${completedOvers}.${remainderBalls}`;

        // Economy
        const totalOversFraction = legalBalls > 0 ? legalBalls / 6 : 1;
        const economy = legalBalls > 0 ? Number((runsConceded / totalOversFraction).toFixed(2)) : 0;
        const dotPercent = legalBalls > 0 ? Math.round((dots / legalBalls) * 100) : 0;
        const strikeRate = wicketsTaken > 0 ? Number((legalBalls / wicketsTaken).toFixed(1)) : null;

        const isCurrent =
          (currentBowler && (currentBowler.id === player.id || currentBowler.name === player.name)) ||
          (lastBallBowlerId === player.id || lastBallBowlerId === player.name);

        return {
          bowler: player,
          overs: oversStr,
          legalBalls,
          maidens,
          runs: runsConceded,
          wickets: wicketsTaken,
          economy,
          dots,
          dotPercent,
          fours,
          sixes,
          wides: bowlerWides,
          noBalls: bowlerNoBalls,
          strikeRate,
          isCurrentBowler: Boolean(isCurrent),
          wicketsList,
        };
      }
    );

    // Sort: Bowlers with overs bowled first, then by wickets descending, then best economy
    figures.sort((a, b) => {
      if (a.legalBalls > 0 && b.legalBalls === 0) return -1;
      if (a.legalBalls === 0 && b.legalBalls > 0) return 1;
      if (b.wickets !== a.wickets) return b.wickets - a.wickets;
      return a.economy - b.economy;
    });

    const totalRunsConceded = figures.reduce((acc, f) => acc + f.runs, 0);
    const totalWicketsTaken = figures.reduce((acc, f) => acc + f.wickets, 0);
    const totalLegalBalls = figures.reduce((acc, f) => acc + f.legalBalls, 0);
    const teamOvers = `${Math.floor(totalLegalBalls / 6)}.${totalLegalBalls % 6}`;

    return {
      bowlerFigures: figures,
      totalExtras: {
        wides: widesCount,
        noBalls: noBallsCount,
        total: widesCount + noBallsCount + penaltyExtras,
      },
      overallOverSummary: {
        totalRuns: totalRunsConceded,
        totalWickets: totalWicketsTaken,
        totalOvers: teamOvers,
      },
    };
  }, [history, bowlingTeam, currentBowler]);

  const activeSelectedBowler = useMemo(() => {
    if (!selectedBowlerId) return null;
    return bowlerFigures.find((f) => f.bowler.id === selectedBowlerId || f.bowler.name === selectedBowlerId) || null;
  }, [bowlerFigures, selectedBowlerId]);

  return (
    <div className={`space-y-4 font-mono text-xs ${className}`}>
      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
        <div className="flex items-center gap-3">
          <CountryFlag countryCode={bowlingTeam.id} size="md" />
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm sm:text-base font-black text-white flex items-center gap-2 font-heading tracking-tight">
                <Target className="h-4 w-4 text-cyan-400" />
                <span>{bowlingTeam.name} · Official Bowling Card</span>
              </h3>
              <span className="rounded-full bg-cyan-500/15 border border-cyan-500/40 px-2 py-0.5 text-[9px] font-bold text-cyan-300">
                AUTHORITATIVE LOG
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-sans">
              Defending {overallOverSummary.totalRuns} Runs &bull; {overallOverSummary.totalWickets} Wickets Fallen ({overallOverSummary.totalOvers} Overs)
            </p>
          </div>
        </div>

        {/* Extras Summary Badge */}
        <div className="flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-900/90 px-3 py-1.5 text-[11px]">
          <span className="text-slate-400">EXTRAS:</span>
          <strong className="text-amber-400 font-black">{totalExtras.total}</strong>
          <span className="text-slate-500 text-[10px]">
            (wd {totalExtras.wides}, nb {totalExtras.noBalls})
          </span>
        </div>
      </div>

      {/* Main Bowling Scorecard Table */}
      <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-950 shadow-2xl">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-800 bg-slate-900/80 text-[10px] text-slate-400 font-bold uppercase tracking-wider">
              <th className="py-2.5 px-3 sm:px-4">BOWLER</th>
              <th className="py-2.5 px-2 text-center">O</th>
              <th className="py-2.5 px-2 text-center">M</th>
              <th className="py-2.5 px-2 text-center">R</th>
              <th className="py-2.5 px-2 text-center">W</th>
              <th className="py-2.5 px-2 text-center">ECON</th>
              <th className="py-2.5 px-2 text-center hidden md:table-cell">DOTS</th>
              <th className="py-2.5 px-2 text-center hidden sm:table-cell">WD</th>
              <th className="py-2.5 px-2 text-center hidden sm:table-cell">NB</th>
              <th className="py-2.5 px-3 text-right">SPELL</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 text-xs">
            {bowlerFigures.map((fig) => {
              const isSelected = selectedBowlerId === fig.bowler.id || selectedBowlerId === fig.bowler.name;

              // Economy styling
              const econColor =
                fig.economy === 0 && fig.legalBalls === 0
                  ? 'text-slate-500'
                  : fig.economy <= 6.0
                  ? 'text-emerald-400 font-bold'
                  : fig.economy <= 8.5
                  ? 'text-sky-300'
                  : 'text-amber-400 font-bold';

              return (
                <tr
                  key={fig.bowler.id || fig.bowler.name}
                  onClick={() => {
                    cricketAudio.playBatHit();
                    setSelectedBowlerId(isSelected ? null : fig.bowler.id || fig.bowler.name);
                    if (onInspectPlayer) onInspectPlayer(fig.bowler);
                  }}
                  className={`group transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-cyan-950/40 text-white'
                      : fig.isCurrentBowler
                      ? 'bg-slate-900/40 hover:bg-slate-900/80'
                      : 'hover:bg-slate-900/50'
                  }`}
                >
                  {/* Bowler Profile & Name */}
                  <td className="py-2.5 px-3 sm:px-4">
                    <div className="flex items-center gap-2.5">
                      <div className="relative">
                        <PlayerCardAvatar
                          playerId={fig.bowler.id}
                          name={fig.bowler.name}
                          countryCode={fig.bowler.countryCode || bowlingTeam.id}
                          jerseyNumber={fig.bowler.jerseyNumber}
                          imageUrl={fig.bowler.imageUrl}
                          size="sm"
                        />
                        {fig.isCurrentBowler && (
                          <span className="absolute -top-1 -right-1 flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75" />
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500" />
                          </span>
                        )}
                      </div>

                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-white group-hover:text-cyan-300 transition-colors">
                            {fig.bowler.name}
                          </span>
                          {fig.isCurrentBowler && (
                            <span className="rounded bg-cyan-500/20 text-cyan-300 border border-cyan-400/40 px-1 py-0.2 text-[8px] font-black uppercase tracking-wider">
                              BOWLING
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] text-slate-400 font-sans block truncate max-w-[120px] sm:max-w-none">
                          {fig.bowler.role}
                        </span>
                      </div>
                    </div>
                  </td>

                  {/* Overs (O) */}
                  <td className="py-2.5 px-2 text-center font-bold text-white tabular-nums font-mono">
                    {fig.overs}
                  </td>

                  {/* Maidens (M) */}
                  <td className="py-2.5 px-2 text-center text-slate-300 tabular-nums font-mono">
                    {fig.maidens}
                  </td>

                  {/* Runs (R) */}
                  <td className="py-2.5 px-2 text-center text-slate-100 font-bold tabular-nums font-mono">
                    {fig.runs}
                  </td>

                  {/* Wickets (W) */}
                  <td className="py-2.5 px-2 text-center font-black tabular-nums font-mono">
                    <span
                      className={`inline-block px-1.5 py-0.5 rounded ${
                        fig.wickets >= 3
                          ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                          : fig.wickets >= 1
                          ? 'bg-emerald-500/20 text-emerald-300'
                          : 'text-slate-400'
                      }`}
                    >
                      {fig.wickets}
                    </span>
                  </td>

                  {/* Economy (ECON) */}
                  <td className={`py-2.5 px-2 text-center tabular-nums font-mono ${econColor}`}>
                    {fig.legalBalls > 0 ? fig.economy.toFixed(2) : '-'}
                  </td>

                  {/* Dots */}
                  <td className="py-2.5 px-2 text-center text-slate-400 tabular-nums font-mono hidden md:table-cell">
                    {fig.dots} <span className="text-[9px] text-slate-600">({fig.dotPercent}%)</span>
                  </td>

                  {/* Wides (WD) */}
                  <td className="py-2.5 px-2 text-center text-slate-400 tabular-nums font-mono hidden sm:table-cell">
                    {fig.wides > 0 ? <strong className="text-amber-400">{fig.wides}</strong> : '0'}
                  </td>

                  {/* No-Balls (NB) */}
                  <td className="py-2.5 px-2 text-center text-slate-400 tabular-nums font-mono hidden sm:table-cell">
                    {fig.noBalls > 0 ? <strong className="text-amber-400">{fig.noBalls}</strong> : '0'}
                  </td>

                  {/* Spell Details Button */}
                  <td className="py-2.5 px-3 text-right">
                    <span className="inline-flex items-center gap-1 text-[10px] text-cyan-400 group-hover:text-cyan-300 font-bold">
                      <span>{fig.legalBalls > 0 ? `${fig.wickets}/${fig.runs}` : 'Reserve'}</span>
                      <ChevronRight className="h-3 w-3" />
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Selected Bowler Detail Drawer */}
      {activeSelectedBowler && (
        <div className="rounded-2xl border border-cyan-500/40 bg-slate-900/90 p-4 space-y-3 backdrop-blur-md shadow-2xl animate-in fade-in duration-200">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-2.5">
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 rounded-lg bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
                <Sparkles className="h-4 w-4" />
              </div>
              <div>
                <h4 className="font-bold text-white text-sm font-heading">
                  {activeSelectedBowler.bowler.name} &bull; Spell Breakdown
                </h4>
                <p className="text-[10px] text-slate-400">
                  {activeSelectedBowler.overs} Overs &bull; {activeSelectedBowler.wickets} Wkts &bull; {activeSelectedBowler.runs} Runs &bull; Econ {activeSelectedBowler.economy.toFixed(2)}
                </p>
              </div>
            </div>

            <button
              onClick={() => setSelectedBowlerId(null)}
              className="text-[10px] text-slate-400 hover:text-white underline cursor-pointer"
            >
              Close Breakdown
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-[10px]">
            <div className="rounded-xl border border-slate-800 bg-slate-950 p-2">
              <span className="text-slate-500 block">DOT BALL RATE</span>
              <strong className="text-white text-xs">{activeSelectedBowler.dotPercent}%</strong>
              <span className="text-[9px] text-slate-400 block">{activeSelectedBowler.dots} Dot Balls</span>
            </div>
            <div className="rounded-xl border border-slate-800 bg-slate-950 p-2">
              <span className="text-slate-500 block">BOUNDARIES CONCEDED</span>
              <strong className="text-amber-400 text-xs">
                {activeSelectedBowler.fours}x4, {activeSelectedBowler.sixes}x6
              </strong>
              <span className="text-[9px] text-slate-400 block">
                {activeSelectedBowler.fours * 4 + activeSelectedBowler.sixes * 6} Runs in Boundaries
              </span>
            </div>
            <div className="rounded-xl border border-slate-800 bg-slate-950 p-2">
              <span className="text-slate-500 block">EXTRAS LEAKED</span>
              <strong className="text-rose-400 text-xs">
                {activeSelectedBowler.wides + activeSelectedBowler.noBalls}
              </strong>
              <span className="text-[9px] text-slate-400 block">
                {activeSelectedBowler.wides} Wides &bull; {activeSelectedBowler.noBalls} No Balls
              </span>
            </div>
            <div className="rounded-xl border border-slate-800 bg-slate-950 p-2">
              <span className="text-slate-500 block">BOWLING STRIKE RATE</span>
              <strong className="text-emerald-400 text-xs">
                {activeSelectedBowler.strikeRate ? `${activeSelectedBowler.strikeRate} b/w` : 'N/A'}
              </strong>
              <span className="text-[9px] text-slate-400 block">
                {activeSelectedBowler.wickets} Dismissals
              </span>
            </div>
          </div>

          {/* Dismissals / Wickets Taken */}
          {activeSelectedBowler.wicketsList.length > 0 && (
            <div className="space-y-1.5 pt-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                DISMISSALS LOG ({activeSelectedBowler.wicketsList.length})
              </span>
              <div className="space-y-1">
                {activeSelectedBowler.wicketsList.map((w, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between rounded-lg border border-rose-500/30 bg-rose-950/20 px-3 py-1.5 text-[11px]"
                  >
                    <div className="flex items-center gap-2">
                      <span className="rounded bg-rose-600 text-white font-black px-1.5 py-0.2 text-[9px]">
                        W
                      </span>
                      <strong className="text-white">{w.batterName}</strong>
                      <span className="text-rose-300 font-sans">({w.wicketType})</span>
                    </div>
                    <span className="text-slate-400 font-mono text-[10px]">
                      Over {w.over} &bull; {w.speedKmh} km/h
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
