import React, { useMemo, useState } from 'react';
import { Player } from '../../types/cricket';
import {
  ComputedInningsScorecard,
  FallOfWicketRecord,
} from '../../engine/matchScoreboardEngine';
import { getDeliveryChipStyle } from './LiveBroadcastScoreboard';
import { CountryFlag, PlayerCardAvatar, TeamCrest } from '../common/CricketIdentity';
import { cricketAudio } from '../../utils/audioSystem';
import {
  Award,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  ClipboardList,
  Flame,
  Layers,
  ShieldAlert,
  TrendingUp,
  Users,
  Zap,
} from 'lucide-react';

export interface CompleteMatchScorecardProps {
  activeScorecard: ComputedInningsScorecard;
  innings1Scorecard: ComputedInningsScorecard;
  innings2Scorecard: ComputedInningsScorecard;
  superOver1Scorecard?: ComputedInningsScorecard | null;
  superOver2Scorecard?: ComputedInningsScorecard | null;
  selectedInningsTab: 1 | 2 | 3 | 4;
  onSelectInningsTab: (inn: 1 | 2 | 3 | 4) => void;
  focusSection?: 'scorecard' | 'overs';
  onInspectPlayer?: (player: Player) => void;
  onSelectWicket?: (wicket: FallOfWicketRecord) => void;
}

export const CompleteMatchScorecard: React.FC<CompleteMatchScorecardProps> = ({
  activeScorecard,
  innings1Scorecard,
  innings2Scorecard,
  superOver1Scorecard,
  superOver2Scorecard,
  selectedInningsTab,
  onSelectInningsTab,
  focusSection = 'scorecard',
  onInspectPlayer,
  onSelectWicket,
}) => {
  const [reverseOversOrder, setReverseOversOrder] = useState<boolean>(true);
  const [expandedOverNum, setExpandedOverNum] = useState<number | null>(null);

  const inningsTabs = useMemo(() => {
    const list: Array<{
      id: 1 | 2 | 3 | 4;
      title: string;
      card: ComputedInningsScorecard;
    }> = [
      { id: 1, title: '1st Innings', card: innings1Scorecard },
      { id: 2, title: '2nd Innings', card: innings2Scorecard },
    ];
    if (superOver1Scorecard) {
      list.push({ id: 3, title: 'Super Over · 1st', card: superOver1Scorecard });
    }
    if (superOver2Scorecard) {
      list.push({ id: 4, title: 'Super Over · 2nd', card: superOver2Scorecard });
    }
    return list;
  }, [innings1Scorecard, innings2Scorecard, superOver1Scorecard, superOver2Scorecard]);

  // Compute Powerplay, Middle, and Death phase splits from overSummaries
  const phaseSummaries = useMemo(() => {
    if (activeScorecard.isSuperOver) {
      return [
        {
          label: 'SUPER OVER',
          span: 'Over 1',
          runs: activeScorecard.runs,
          wickets: activeScorecard.wickets,
          boundaries: activeScorecard.overSummaries.reduce((s, o) => s + o.boundariesInOver, 0),
          oversCount: activeScorecard.oversFormatted,
        },
      ];
    }

    const calcRange = (minOv: number, maxOv: number, label: string, span: string) => {
      const matching = activeScorecard.overSummaries.filter(
        (o) => o.overNumber >= minOv && o.overNumber <= maxOv
      );
      const runs = matching.reduce((s, o) => s + o.runsInOver, 0);
      const wickets = matching.reduce((s, o) => s + o.wicketsInOver, 0);
      const boundaries = matching.reduce((s, o) => s + o.boundariesInOver, 0);
      const legal = matching.reduce((s, o) => s + o.legalBallsInOver, 0);
      return {
        label,
        span,
        runs,
        wickets,
        boundaries,
        oversCount: `${Math.floor(legal / 6)}.${legal % 6}`,
      };
    };

    const ppEnd = Math.min(6, activeScorecard.maxOvers);
    const midEnd = Math.min(15, activeScorecard.maxOvers);

    const phases = [calcRange(1, ppEnd, 'POWERPLAY', `Overs 1–${ppEnd}`)];
    if (activeScorecard.maxOvers > 6) {
      phases.push(calcRange(7, midEnd, 'MIDDLE OVERS', `Overs 7–${midEnd}`));
    }
    if (activeScorecard.maxOvers > 15) {
      phases.push(calcRange(16, activeScorecard.maxOvers, 'DEATH OVERS', `Overs 16–${activeScorecard.maxOvers}`));
    }
    return phases;
  }, [activeScorecard]);

  const sortedOvers = useMemo(() => {
    const copy = [...activeScorecard.overSummaries];
    return reverseOversOrder ? copy.reverse() : copy;
  }, [activeScorecard.overSummaries, reverseOversOrder]);

  const {
    battingTeam,
    bowlingTeam,
    batters,
    yetToBat,
    bowlers,
    extras,
    runs,
    wickets,
    oversFormatted,
    currentRunRate,
    targetRuns,
    fallOfWickets,
    partnerships,
    accounting,
    status,
  } = activeScorecard;

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* =====================================================================
          1. BOTH INNINGS SUMMARY CARDS (SWITCH BETWEEN 1ST, 2ND & SUPER OVER)
          ===================================================================== */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {inningsTabs.map((tab) => {
          const isSelected = selectedInningsTab === tab.id;
          const c = tab.card;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => {
                cricketAudio.playUiClick();
                onSelectInningsTab(tab.id);
              }}
              className={`flex items-center justify-between gap-3 rounded-2xl border p-4 text-left transition-all cursor-pointer ${
                isSelected
                  ? 'border-cyan-400/70 bg-gradient-to-r from-[#081838] to-[#050E22] shadow-lg shadow-cyan-500/10'
                  : 'border-slate-800/90 bg-slate-950/75 hover:border-slate-700'
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-slate-900 p-1.5 shrink-0">
                  <TeamCrest teamId={c.battingTeam.id} size={28} />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <CountryFlag countryCode={c.battingTeam.id} size="sm" />
                    <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-cyan-300">
                      {tab.title} · {c.status.toUpperCase()}
                    </span>
                  </div>
                  <p className="text-sm sm:text-base font-black text-white truncate mt-0.5">
                    {c.battingTeam.name}
                  </p>
                </div>
              </div>

              <div className="text-right font-mono shrink-0">
                {c.status === 'upcoming' ? (
                  <span className="text-xs font-bold text-slate-500">Yet to Bat</span>
                ) : (
                  <>
                    <div className="text-xl sm:text-2xl font-black text-white tabular-nums leading-none">
                      {c.runs}/{c.wickets}
                    </div>
                    <span className="block text-[11px] text-slate-400 mt-1 tabular-nums">
                      ({c.oversFormatted} ov · RR {c.currentRunRate.toFixed(2)})
                    </span>
                  </>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {status === 'upcoming' ? (
        <div className="rounded-2xl border border-slate-800 bg-slate-950/85 p-8 text-center space-y-2">
          <ClipboardList className="h-8 w-8 text-cyan-400 mx-auto" />
          <h3 className="text-base font-bold text-white">
            {battingTeam.name} Innings Has Not Started Yet
          </h3>
          <p className="text-xs font-mono text-slate-400">
            Scheduled Batting XI: {yetToBat.map((b) => b.player.name).join(' · ')}
          </p>
        </div>
      ) : (
        <>
          {/* =====================================================================
              2. FULL BATTING & BOWLING SCORECARD SECTION
              ===================================================================== */}
          {focusSection === 'scorecard' && (
            <div className="space-y-6">
              {/* BATTING SCORECARD CARD */}
              <div className="rounded-2xl border border-slate-800 bg-[#050C1C] overflow-hidden shadow-xl">
                <div className="flex flex-wrap items-center justify-between gap-2 px-4 sm:px-5 py-3.5 bg-[#08132B] border-b border-slate-800">
                  <div className="flex items-center gap-2.5">
                    <CountryFlag countryCode={battingTeam.id} size="sm" />
                    <h3 className="text-sm font-black uppercase tracking-wider text-white">
                      {battingTeam.name} Batting
                    </h3>
                    {targetRuns && targetRuns > 0 && (
                      <span className="font-mono text-[11px] text-amber-300 tabular-nums">
                        · Target {targetRuns}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2 font-mono text-xs text-slate-300 tabular-nums">
                    <span className="font-bold text-cyan-300">
                      {runs}/{wickets}
                    </span>
                    <span className="text-slate-500">({oversFormatted} ov)</span>
                    {accounting.isValid && (
                      <span
                        title={`Reconciled: Batters (${accounting.battersRunsSum}) + Extras (${accounting.extrasTotal}) = ${accounting.teamTotal}`}
                        className="inline-flex items-center gap-1 text-[10px] text-emerald-400 font-semibold"
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        <span className="hidden sm:inline">Verified</span>
                      </span>
                    )}
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs font-mono">
                    <thead className="border-b border-slate-800/90 bg-slate-950/90 text-[10px] uppercase tracking-wider text-slate-400">
                      <tr>
                        <th className="py-2.5 pl-4 pr-2 w-10">#</th>
                        <th className="py-2.5 px-3">Batter</th>
                        <th className="py-2.5 px-3">Dismissal</th>
                        <th className="py-2.5 px-2.5 text-right">R</th>
                        <th className="py-2.5 px-2.5 text-right">B</th>
                        <th className="py-2.5 px-2.5 text-right">4s</th>
                        <th className="py-2.5 px-2.5 text-right">6s</th>
                        <th className="py-2.5 px-2.5 text-right hidden sm:table-cell">0s</th>
                        <th className="py-2.5 pl-2.5 pr-4 text-right">SR</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/70">
                      {batters.map((row) => (
                        <tr
                          key={row.player.id}
                          onClick={() => onInspectPlayer && onInspectPlayer(row.player)}
                          className={`transition-colors ${
                            onInspectPlayer ? 'cursor-pointer' : ''
                          } ${
                            row.isStriker
                              ? 'bg-cyan-950/25 hover:bg-cyan-950/35'
                              : row.isNonStriker
                              ? 'bg-slate-900/50 hover:bg-slate-900/80'
                              : 'hover:bg-slate-900/40'
                          }`}
                        >
                          <td className="py-2.5 pl-4 pr-2 text-slate-500 tabular-nums">
                            {row.battingPosition}
                          </td>
                          <td className="py-2.5 px-3 font-sans">
                            <div className="flex items-center gap-2.5 min-w-0">
                              <PlayerCardAvatar
                                playerId={row.player.id}
                                name={row.player.name}
                                countryCode={row.player.countryCode || battingTeam.id}
                                imageUrl={row.player.imageUrl}
                                size="sm"
                              />
                              <div className="min-w-0">
                                <span
                                  className={`font-bold text-xs sm:text-sm whitespace-nowrap ${
                                    row.isStriker
                                      ? 'text-cyan-300'
                                      : row.isNonStriker
                                      ? 'text-white'
                                      : 'text-slate-200'
                                  }`}
                                >
                                  {row.player.name}
                                  {row.isStriker ? ' *' : ''}
                                </span>
                                <span className="block text-[10px] font-mono text-slate-500">
                                  {row.player.role}
                                </span>
                              </div>
                            </div>
                          </td>
                          <td className="py-2.5 px-3 text-[11px] max-w-[230px] truncate">
                            <span
                              className={
                                row.status === 'striker' || row.status === 'non_striker'
                                  ? 'text-emerald-400 font-semibold'
                                  : row.status === 'not_out'
                                  ? 'text-cyan-300'
                                  : 'text-slate-400'
                              }
                            >
                              {row.dismissalText}
                            </span>
                          </td>
                          <td className="py-2.5 px-2.5 text-right font-black text-sm text-white tabular-nums">
                            {row.runs}
                          </td>
                          <td className="py-2.5 px-2.5 text-right text-slate-300 tabular-nums">
                            {row.balls}
                          </td>
                          <td className="py-2.5 px-2.5 text-right text-emerald-300 tabular-nums">
                            {row.fours}
                          </td>
                          <td className="py-2.5 px-2.5 text-right text-violet-300 font-bold tabular-nums">
                            {row.sixes}
                          </td>
                          <td className="py-2.5 px-2.5 text-right text-slate-500 tabular-nums hidden sm:table-cell">
                            {row.dots}
                          </td>
                          <td
                            className={`py-2.5 pl-2.5 pr-4 text-right font-bold tabular-nums ${
                              row.strikeRate >= 150
                                ? 'text-amber-300'
                                : row.strikeRate >= 120
                                ? 'text-cyan-300'
                                : 'text-slate-300'
                            }`}
                          >
                            {row.strikeRate.toFixed(1)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Extras + Total + Accounting Reconciliation Footer */}
                <div className="divide-y divide-slate-800/80 border-t border-slate-800 bg-slate-950/90 text-xs font-mono">
                  <div className="flex flex-wrap items-center justify-between gap-2 px-4 sm:px-5 py-2.5">
                    <span className="font-bold text-slate-300">Extras</span>
                    <div className="flex flex-wrap items-center gap-3 tabular-nums">
                      <span className="text-slate-400 text-[11px]">
                        (b {extras.byes}, lb {extras.legByes}, wd {extras.wides}, nb {extras.noBalls}, p{' '}
                        {extras.penalty})
                      </span>
                      <strong className="text-amber-300 text-sm font-black">{extras.total}</strong>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2 px-4 sm:px-5 py-3 bg-[#08132B]/70">
                    <div className="flex items-center gap-2">
                      <span className="font-black text-white text-sm">TOTAL</span>
                      <span className="text-slate-400 text-[11px] tabular-nums">
                        ({wickets} wkts, {oversFormatted} overs · Legal Balls: {accounting.legalBallsTotal})
                      </span>
                    </div>
                    <div className="flex items-baseline gap-3 tabular-nums">
                      <span className="text-xs text-cyan-300">RR {currentRunRate.toFixed(2)}</span>
                      <strong className="text-lg font-black text-white">
                        {runs}/{wickets}
                      </strong>
                    </div>
                  </div>

                  {yetToBat.length > 0 && (
                    <div className="px-4 sm:px-5 py-2.5 text-[11px] font-sans text-slate-400">
                      <span className="font-mono font-bold uppercase text-slate-500 mr-2">
                        {status === 'completed' ? 'Did Not Bat:' : 'Yet to Bat:'}
                      </span>
                      {yetToBat.map((b, i) => (
                        <React.Fragment key={b.player.id}>
                          <button
                            type="button"
                            onClick={() => onInspectPlayer && onInspectPlayer(b.player)}
                            className="text-slate-300 hover:text-cyan-300 transition-colors cursor-pointer"
                          >
                            #{b.battingPosition} {b.player.name}
                          </button>
                          {i < yetToBat.length - 1 && <span className="text-slate-600 mx-1.5">·</span>}
                        </React.Fragment>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* BOWLING FIGURES CARD */}
              <div className="rounded-2xl border border-slate-800 bg-[#050C1C] overflow-hidden shadow-xl">
                <div className="flex flex-wrap items-center justify-between gap-2 px-4 sm:px-5 py-3.5 bg-[#08132B] border-b border-slate-800">
                  <div className="flex items-center gap-2.5">
                    <CountryFlag countryCode={bowlingTeam.id} size="sm" />
                    <h3 className="text-sm font-black uppercase tracking-wider text-white">
                      {bowlingTeam.name} Bowling Figures
                    </h3>
                  </div>
                  <span className="font-mono text-[11px] text-slate-400 tabular-nums">
                    Byes/Leg-Byes Excluded from Bowler Runs: {accounting.byesAndLegByes}
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs font-mono">
                    <thead className="border-b border-slate-800/90 bg-slate-950/90 text-[10px] uppercase tracking-wider text-slate-400">
                      <tr>
                        <th className="py-2.5 pl-4 pr-3">Bowler</th>
                        <th className="py-2.5 px-2.5 text-right">O</th>
                        <th className="py-2.5 px-2.5 text-right hidden sm:table-cell">Balls</th>
                        <th className="py-2.5 px-2.5 text-right">M</th>
                        <th className="py-2.5 px-2.5 text-right">R</th>
                        <th className="py-2.5 px-2.5 text-right">W</th>
                        <th className="py-2.5 px-2.5 text-right">ECON</th>
                        <th className="py-2.5 px-2.5 text-right hidden md:table-cell">0s</th>
                        <th className="py-2.5 px-2.5 text-right hidden md:table-cell">4s</th>
                        <th className="py-2.5 px-2.5 text-right hidden md:table-cell">6s</th>
                        <th className="py-2.5 pl-2.5 pr-4 text-right">WD/NB</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/70">
                      {bowlers.map((bw) => (
                        <tr
                          key={bw.player.id}
                          onClick={() => onInspectPlayer && onInspectPlayer(bw.player)}
                          className={`transition-colors ${
                            onInspectPlayer ? 'cursor-pointer' : ''
                          } ${
                            bw.isCurrentBowler
                              ? 'bg-amber-950/20 hover:bg-amber-950/30'
                              : 'hover:bg-slate-900/40'
                          }`}
                        >
                          <td className="py-2.5 pl-4 pr-3 font-sans">
                            <div className="flex items-center gap-2.5 min-w-0">
                              <PlayerCardAvatar
                                playerId={bw.player.id}
                                name={bw.player.name}
                                countryCode={bw.player.countryCode || bowlingTeam.id}
                                imageUrl={bw.player.imageUrl}
                                size="sm"
                              />
                              <div className="min-w-0">
                                <span
                                  className={`font-bold text-xs sm:text-sm whitespace-nowrap ${
                                    bw.isCurrentBowler ? 'text-amber-300' : 'text-white'
                                  }`}
                                >
                                  {bw.player.name}
                                  {bw.isCurrentBowler ? ' •' : ''}
                                </span>
                                <span className="block text-[10px] font-mono text-slate-500">
                                  {bw.player.bowlingStyle}
                                </span>
                              </div>
                            </div>
                          </td>
                          <td className="py-2.5 px-2.5 text-right font-bold text-white tabular-nums">
                            {bw.overs}
                          </td>
                          <td className="py-2.5 px-2.5 text-right text-slate-400 tabular-nums hidden sm:table-cell">
                            {bw.legalBalls}
                          </td>
                          <td className="py-2.5 px-2.5 text-right text-slate-300 tabular-nums">
                            {bw.maidens}
                          </td>
                          <td className="py-2.5 px-2.5 text-right text-slate-200 font-semibold tabular-nums">
                            {bw.runsConceded}
                          </td>
                          <td className="py-2.5 px-2.5 text-right font-black text-sm text-rose-400 tabular-nums">
                            {bw.wickets}
                          </td>
                          <td
                            className={`py-2.5 px-2.5 text-right font-bold tabular-nums ${
                              bw.economy <= 7.0
                                ? 'text-emerald-400'
                                : bw.economy >= 10.5
                                ? 'text-rose-300'
                                : 'text-cyan-300'
                            }`}
                          >
                            {bw.economy.toFixed(2)}
                          </td>
                          <td className="py-2.5 px-2.5 text-right text-slate-400 tabular-nums hidden md:table-cell">
                            {bw.dots}
                          </td>
                          <td className="py-2.5 px-2.5 text-right text-slate-400 tabular-nums hidden md:table-cell">
                            {bw.fours}
                          </td>
                          <td className="py-2.5 px-2.5 text-right text-slate-400 tabular-nums hidden md:table-cell">
                            {bw.sixes}
                          </td>
                          <td className="py-2.5 pl-2.5 pr-4 text-right text-amber-300/90 tabular-nums">
                            {bw.wides}/{bw.noBalls}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* FALL OF WICKETS + PARTNERSHIPS DUAL GRID */}
              <div className="grid grid-cols-1 xl:grid-cols-12 gap-5">
                {/* Fall of Wickets */}
                <div className="xl:col-span-5 rounded-2xl border border-slate-800 bg-[#050C1C] p-4 sm:p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-rose-300 flex items-center gap-1.5">
                      <ShieldAlert className="h-3.5 w-3.5" />
                      <span>Fall of Wickets ({fallOfWickets.length})</span>
                    </h4>
                    <span className="text-[10px] font-mono text-slate-500">Click wicket for Hawk-Eye</span>
                  </div>

                  {fallOfWickets.length === 0 ? (
                    <p className="text-xs font-mono text-slate-400 py-4 text-center">
                      No wickets lost ({runs}/0 in {oversFormatted} ov)
                    </p>
                  ) : (
                    <div className="grid grid-cols-2 gap-2">
                      {fallOfWickets.map((fow) => (
                        <button
                          key={`fow-${fow.wicketNumber}-${fow.oversAtDismissal}`}
                          type="button"
                          onClick={() => onSelectWicket && onSelectWicket(fow)}
                          className="rounded-xl border border-rose-500/30 bg-rose-950/20 hover:bg-rose-950/40 p-2.5 text-left font-mono transition-colors cursor-pointer"
                        >
                          <div className="flex items-baseline justify-between">
                            <span className="text-sm font-black text-white tabular-nums">
                              {fow.scoreAtDismissal}/{fow.wicketNumber}
                            </span>
                            <span className="text-[10px] text-rose-300 tabular-nums">
                              {fow.oversAtDismissal} ov
                            </span>
                          </div>
                          <p className="text-[11px] font-sans font-semibold text-slate-200 truncate mt-0.5">
                            {fow.batter.name} ({fow.batterRuns})
                          </p>
                          <p className="text-[10px] text-slate-500 truncate">{fow.dismissalType}</p>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Partnerships Breakdown */}
                <div className="xl:col-span-7 rounded-2xl border border-slate-800 bg-[#050C1C] p-4 sm:p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-cyan-300 flex items-center gap-1.5">
                      <Users className="h-3.5 w-3.5" />
                      <span>Partnership Stands ({partnerships.length})</span>
                    </h4>
                    <span className="text-[10px] font-mono text-slate-500">Batters + Stand Extras</span>
                  </div>

                  <div className="space-y-2.5 max-h-80 overflow-y-auto pr-1">
                    {partnerships.map((stand) => {
                      const totalForBar = Math.max(1, stand.totalRuns);
                      const aPct = Math.round((stand.batterARuns / totalForBar) * 100);
                      const extPct = Math.round((stand.extras / totalForBar) * 100);
                      const bPct = Math.max(0, 100 - aPct - extPct);

                      return (
                        <div
                          key={`stand-${stand.standNumber}`}
                          className={`rounded-xl border p-3 space-y-2 font-mono text-xs ${
                            stand.isUnbroken
                              ? 'border-cyan-500/40 bg-cyan-950/15'
                              : 'border-slate-800/90 bg-slate-950/70'
                          }`}
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2 text-[11px]">
                            <span className="font-bold text-slate-300">
                              {stand.standNumber}
                              {stand.standNumber === 1
                                ? 'st'
                                : stand.standNumber === 2
                                ? 'nd'
                                : stand.standNumber === 3
                                ? 'rd'
                                : 'th'}{' '}
                              Wicket {stand.isUnbroken ? '· UNBROKEN *' : `(${stand.endScore}, ${stand.endOver} ov)`}
                            </span>
                            <span className="font-black text-white tabular-nums">
                              {stand.totalRuns} runs ({stand.totalBalls}b · RR {stand.runRate.toFixed(1)})
                            </span>
                          </div>

                          <div className="flex items-center justify-between text-[11px] font-sans">
                            <span className="text-cyan-200 font-semibold truncate">
                              {stand.batterA.name}{' '}
                              <strong className="font-mono tabular-nums">
                                {stand.batterARuns}({stand.batterABalls})
                              </strong>
                            </span>
                            {stand.extras > 0 && (
                              <span className="text-[10px] font-mono text-amber-300 shrink-0 mx-2">
                                Ext {stand.extras}
                              </span>
                            )}
                            <span className="text-sky-200 font-semibold truncate text-right">
                              <strong className="font-mono tabular-nums">
                                {stand.batterBRuns}({stand.batterBBalls})
                              </strong>{' '}
                              {stand.batterB.name}
                            </span>
                          </div>

                          <div className="flex h-2 w-full overflow-hidden rounded-full bg-slate-900">
                            <div
                              className="bg-cyan-400 transition-all duration-300"
                              style={{ width: `${aPct}%` }}
                            />
                            {stand.extras > 0 && (
                              <div
                                className="bg-amber-400 transition-all duration-300"
                                style={{ width: `${extPct}%` }}
                              />
                            )}
                            <div
                              className="bg-blue-500 transition-all duration-300"
                              style={{ width: `${bPct}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* =====================================================================
              3. OVER-BY-OVER TOTALS, PHASE SPLITS & BALL-BY-BALL LEDGER
              ===================================================================== */}
          <div className="rounded-2xl border border-slate-800 bg-[#050C1C] p-4 sm:p-5 space-y-4 shadow-xl">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Layers className="h-4 w-4 text-cyan-400" />
                <h3 className="text-sm font-black uppercase tracking-wider text-white">
                  Over-by-Over Totals & Ball Ledger ({activeScorecard.overSummaries.length} Overs)
                </h3>
              </div>

              <button
                type="button"
                onClick={() => setReverseOversOrder((prev) => !prev)}
                className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-1 text-[11px] font-mono font-semibold text-slate-300 hover:text-white transition-colors cursor-pointer whitespace-nowrap"
              >
                {reverseOversOrder ? 'Newest Over First ↓' : 'Chronological (Ov 1 → 20) ↑'}
              </button>
            </div>

            {/* Phase Summary Strip */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 font-mono">
              {phaseSummaries.map((p) => (
                <div
                  key={p.label}
                  className="rounded-xl border border-slate-800/90 bg-slate-950/80 px-3.5 py-2.5 flex items-center justify-between"
                >
                  <div>
                    <span className="block text-[10px] font-bold text-cyan-300">{p.label}</span>
                    <span className="text-[10px] text-slate-500">{p.span} ({p.oversCount} ov)</span>
                  </div>
                  <div className="text-right tabular-nums">
                    <strong className="text-base font-black text-white">
                      {p.runs}/{p.wickets}
                    </strong>
                    <span className="block text-[10px] text-emerald-400">
                      {p.boundaries} boundar{p.boundaries === 1 ? 'y' : 'ies'}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Over-by-Over Rows */}
            {sortedOvers.length === 0 ? (
              <p className="text-xs font-mono text-slate-400 text-center py-6">
                No deliveries bowled yet in this innings.
              </p>
            ) : (
              <div className="space-y-2 max-h-[460px] overflow-y-auto pr-1">
                {sortedOvers.map((ov) => {
                  const isExpanded = expandedOverNum === ov.overNumber;
                  return (
                    <div
                      key={`over-summary-${ov.overNumber}`}
                      className="rounded-xl border border-slate-800/90 bg-slate-950/80 overflow-hidden"
                    >
                      <div
                        onClick={() =>
                          setExpandedOverNum((prev) =>
                            prev === ov.overNumber ? null : ov.overNumber
                          )
                        }
                        className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 px-3.5 py-2.5 hover:bg-slate-900/60 transition-colors cursor-pointer"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <span className="inline-flex h-8 w-12 items-center justify-center rounded-lg border border-slate-700 bg-slate-900 font-mono text-xs font-black text-cyan-300 tabular-nums shrink-0">
                            OV {ov.overNumber}
                          </span>
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-white truncate">
                              {ov.bowler?.name || 'Bowler'}
                            </p>
                            <p className="text-[10px] font-mono text-slate-400 tabular-nums">
                              After Ov {ov.overNumber}:{' '}
                              <strong className="text-slate-200">
                                {ov.cumulativeRuns}/{ov.cumulativeWickets}
                              </strong>{' '}
                              (CRR {ov.cumulativeRunRate.toFixed(2)})
                            </p>
                          </div>
                        </div>

                        {/* Ball-by-Ball Chips in Over */}
                        <div className="flex flex-wrap items-center gap-1.5">
                          {ov.deliveries.map((d, idx) => {
                            const chip = getDeliveryChipStyle(d);
                            return (
                              <span
                                key={d.eventId || `${ov.overNumber}-${idx}`}
                                title={chip.tooltip}
                                className={`inline-flex h-6 min-w-6 items-center justify-center rounded-full border text-[10px] font-mono tabular-nums ${chip.chipClass}`}
                              >
                                {chip.label}
                              </span>
                            );
                          })}
                        </div>

                        {/* Over Total & Expand Icon */}
                        <div className="flex items-center justify-between sm:justify-end gap-3 font-mono shrink-0">
                          <div className="text-right tabular-nums">
                            <span
                              className={`text-xs font-black ${
                                ov.runsInOver >= 15
                                  ? 'text-amber-300'
                                  : ov.isMaiden
                                  ? 'text-emerald-400'
                                  : 'text-white'
                              }`}
                            >
                              {ov.isMaiden ? 'MAIDEN' : `${ov.runsInOver} runs`}
                            </span>
                            {ov.wicketsInOver > 0 && (
                              <span className="block text-[10px] font-bold text-rose-400">
                                {ov.wicketsInOver} wkt{ov.wicketsInOver > 1 ? 's' : ''}
                              </span>
                            )}
                          </div>
                          {isExpanded ? (
                            <ChevronUp className="h-4 w-4 text-slate-400" />
                          ) : (
                            <ChevronDown className="h-4 w-4 text-slate-500" />
                          )}
                        </div>
                      </div>

                      {/* Expandable Ball-by-Ball Commentary Lines */}
                      {isExpanded && (
                        <div className="border-t border-slate-800/80 bg-[#040916] px-4 py-2.5 space-y-1.5 text-xs">
                          {ov.deliveries.map((ball, bIdx) => {
                            const chip = getDeliveryChipStyle(ball);
                            return (
                              <div
                                key={`detail-${ball.eventId || bIdx}`}
                                className="flex items-start gap-2.5 py-1 border-b border-slate-900 last:border-b-0"
                              >
                                <span className="font-mono text-[11px] text-slate-500 tabular-nums w-8 shrink-0 pt-0.5">
                                  {ov.overNumber - 1}.{ball.ballInOver}
                                </span>
                                <span
                                  className={`inline-flex h-5 min-w-5 items-center justify-center rounded-full border text-[10px] font-mono tabular-nums shrink-0 ${chip.chipClass}`}
                                >
                                  {chip.label}
                                </span>
                                <p className="text-slate-300 text-[11px] leading-relaxed">
                                  <strong className="text-white">
                                    {ball.bowler?.name} to {ball.batter?.name}:
                                  </strong>{' '}
                                  {ball.commentary}
                                </p>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};
