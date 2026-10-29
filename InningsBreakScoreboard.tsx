import React, { useMemo, useState } from 'react';
import { Team } from '../../types/cricket';
import { ComputedInningsScorecard } from '../../engine/matchScoreboardEngine';
import { CountryFlag, TeamCrest } from '../common/CricketIdentity';
import { Target, X, Play } from 'lucide-react';

interface InningsBreakScoreboardProps {
  battingTeam: Team;
  bowlingTeam: Team;
  targetRuns: number;
  totalOvers?: number;
  innings1Scorecard?: ComputedInningsScorecard;
  onStartChase?: () => void;
  onClose?: () => void;
  isModal?: boolean;
}

export const InningsBreakScoreboard: React.FC<InningsBreakScoreboardProps> = ({
  battingTeam,
  bowlingTeam,
  targetRuns,
  totalOvers = 20,
  innings1Scorecard,
  onStartChase,
  onClose,
  isModal = false,
}) => {
  const [activeTab, setActiveTab] = useState<'scorecard' | 'bowling' | 'fow'>('scorecard');

  const firstInningsRuns = innings1Scorecard ? innings1Scorecard.runs : Math.max(0, targetRuns - 1);
  const firstInningsWickets = innings1Scorecard ? innings1Scorecard.wickets : 6;
  const firstInningsOvers = innings1Scorecard ? innings1Scorecard.oversFormatted : `${totalOvers}.0`;
  const firstInningsRR = innings1Scorecard
    ? innings1Scorecard.currentRunRate.toFixed(2)
    : (firstInningsRuns / Math.max(1, totalOvers)).toFixed(2);

  const effectiveTarget = innings1Scorecard ? innings1Scorecard.runs + 1 : targetRuns;
  const requiredRunRate = (effectiveTarget / Math.max(1, totalOvers)).toFixed(2);
  const totalBalls = totalOvers * 6;

  // Phase splits derived directly from authoritative overSummaries when available
  const phaseSplits = useMemo(() => {
    if (!innings1Scorecard) {
      return {
        pp: '52/1 (6.0)',
        mid: '74/2 (9.0)',
        death: `${Math.max(20, firstInningsRuns - 126)}/3 (5.0)`,
      };
    }

    const sumRange = (startOv: number, endOv: number) => {
      const overs = innings1Scorecard.overSummaries.filter(
        (o) => o.overNumber >= startOv && o.overNumber <= endOv
      );
      const r = overs.reduce((s, o) => s + o.runsInOver, 0);
      const w = overs.reduce((s, o) => s + o.wicketsInOver, 0);
      const b = overs.reduce((s, o) => s + o.legalBallsInOver, 0);
      return `${r}/${w} (${Math.floor(b / 6)}.${b % 6})`;
    };

    return {
      pp: sumRange(1, Math.min(6, totalOvers)),
      mid: totalOvers > 6 ? sumRange(7, Math.min(15, totalOvers)) : '—',
      death: totalOvers > 15 ? sumRange(16, totalOvers) : '—',
    };
  }, [innings1Scorecard, totalOvers, firstInningsRuns]);

  const battingPerformances = useMemo(() => {
    if (innings1Scorecard && innings1Scorecard.batters.length > 0) {
      return innings1Scorecard.batters.map((b) => ({
        player: b.player,
        runs: b.runs,
        balls: b.balls,
        fours: b.fours,
        sixes: b.sixes,
        sr: b.strikeRate,
        dismissal: b.dismissalText,
      }));
    }
    return battingTeam.squad.slice(0, 6).map((p, i) => ({
      player: p,
      runs: Math.max(4, Math.round(firstInningsRuns * (0.28 - i * 0.04))),
      balls: Math.max(4, Math.round(totalBalls * (0.24 - i * 0.03))),
      fours: Math.max(0, 4 - i),
      sixes: Math.max(0, 2 - Math.floor(i / 2)),
      sr: 145.0,
      dismissal: i < firstInningsWickets ? 'out' : 'not out',
    }));
  }, [innings1Scorecard, battingTeam, firstInningsRuns, totalBalls, firstInningsWickets]);

  const bowlingPerformances = useMemo(() => {
    if (innings1Scorecard && innings1Scorecard.bowlers.length > 0) {
      return innings1Scorecard.bowlers.map((bw) => ({
        player: bw.player,
        overs: bw.overs,
        maidens: bw.maidens,
        runs: bw.runsConceded,
        wickets: bw.wickets,
        econ: bw.economy.toFixed(2),
        dots: bw.dots,
      }));
    }
    return bowlingTeam.squad.slice(0, 5).map((p) => ({
      player: p,
      overs: '4.0',
      maidens: 0,
      runs: Math.round(firstInningsRuns / 5),
      wickets: 1,
      econ: ((firstInningsRuns / 5) / 4).toFixed(2),
      dots: 9,
    }));
  }, [innings1Scorecard, bowlingTeam, firstInningsRuns]);

  const fallOfWickets = useMemo(() => {
    if (innings1Scorecard) {
      return innings1Scorecard.fallOfWickets.map((f) => ({
        wicket: `${f.scoreAtDismissal}/${f.wicketNumber}`,
        batter: f.batter.name,
        over: f.oversAtDismissal,
      }));
    }
    return [];
  }, [innings1Scorecard]);

  const content = (
    <div className="relative rounded-3xl border border-cyan-500/40 bg-gradient-to-b from-[#030919]/95 via-[#05112c]/95 to-[#020612]/95 p-6 sm:p-8 shadow-2xl backdrop-blur-2xl text-slate-100 space-y-6 overflow-hidden animate-score-entry">
      {/* Top Eyebrow Header & Intermission Badge */}
      <div className="relative z-10 flex flex-wrap items-center justify-between gap-4 border-b border-cyan-500/20 pb-5">
        <div>
          <span className="text-xs font-mono font-bold tracking-widest text-cyan-400 uppercase block">
            INNINGS 1 CONCLUDED · OFFICIAL INTERVAL SCORECARD
          </span>
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black text-white tracking-tight mt-1">
            TARGET SET:{' '}
            <span className="text-cyan-400 font-mono tabular-nums">{effectiveTarget} RUNS</span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 font-mono mt-1 tabular-nums">
            {bowlingTeam.name} requires <strong className="text-white">{effectiveTarget}</strong> from{' '}
            <strong className="text-cyan-300">{totalBalls}</strong> legal deliveries at{' '}
            <strong className="text-amber-400">{requiredRunRate} RPO</strong>
          </p>
        </div>

        <div className="flex items-center gap-3">
          {onStartChase && (
            <button
              type="button"
              onClick={onStartChase}
              className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 via-sky-500 to-blue-600 px-5 py-2.5 text-xs sm:text-sm font-black text-slate-950 hover:opacity-95 transition-all cursor-pointer border border-cyan-300 whitespace-nowrap"
            >
              <Play className="h-4 w-4 fill-current" />
              <span>START 2ND INNINGS CHASE →</span>
            </button>
          )}

          {isModal && onClose && (
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-800 bg-slate-900/90 p-2 text-slate-400 hover:text-white transition-colors cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
          )}
        </div>
      </div>

      {/* Main Innings 1 Score Summary Hero Panel */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-center">
        <div className="md:col-span-7 rounded-2xl border border-cyan-500/30 bg-slate-950/70 p-5 space-y-3 shadow-lg">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <TeamCrest teamId={battingTeam.id} size={36} />
              <div>
                <div className="flex items-center gap-1.5">
                  <CountryFlag countryCode={battingTeam.id} size="sm" />
                  <span className="text-xs font-mono font-bold text-slate-400 uppercase">
                    1ST INNINGS BATTING
                  </span>
                </div>
                <h3 className="text-2xl font-black text-white">{battingTeam.name}</h3>
              </div>
            </div>

            <div className="text-right font-mono">
              <div className="text-3xl sm:text-4xl font-black text-cyan-300 tabular-nums leading-none">
                {firstInningsRuns}/{firstInningsWickets}
              </div>
              <span className="text-xs text-slate-400 mt-1 block tabular-nums">
                ({firstInningsOvers} OVERS · RR {firstInningsRR})
              </span>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-800/80 text-center font-mono text-xs tabular-nums">
            <div className="bg-slate-900/80 p-2 rounded-xl border border-slate-800">
              <span className="text-[10px] text-slate-500 block">POWERPLAY</span>
              <span className="font-bold text-emerald-400">{phaseSplits.pp}</span>
            </div>
            <div className="bg-slate-900/80 p-2 rounded-xl border border-slate-800">
              <span className="text-[10px] text-slate-500 block">MIDDLE OVERS</span>
              <span className="font-bold text-sky-400">{phaseSplits.mid}</span>
            </div>
            <div className="bg-slate-900/80 p-2 rounded-xl border border-slate-800">
              <span className="text-[10px] text-slate-500 block">DEATH OVERS</span>
              <span className="font-bold text-amber-400">{phaseSplits.death}</span>
            </div>
          </div>
        </div>

        <div className="md:col-span-5 rounded-2xl border border-amber-500/30 bg-gradient-to-b from-[#1c1404]/80 to-[#0b0802]/80 p-5 space-y-3 shadow-lg text-amber-200">
          <div className="flex items-center gap-2 text-xs font-mono font-bold text-amber-400 uppercase tracking-wider">
            <Target className="h-4 w-4" />
            <span>2ND INNINGS EQUATION</span>
          </div>

          <div className="flex items-baseline justify-between font-mono tabular-nums">
            <div>
              <span className="text-[10px] text-amber-300/80 block uppercase">Target to Win</span>
              <span className="text-3xl font-black text-white">{effectiveTarget}</span>
            </div>
            <div className="text-right">
              <span className="text-[10px] text-amber-300/80 block uppercase">Required Rate</span>
              <span className="text-2xl font-black text-amber-400">{requiredRunRate}</span>
            </div>
          </div>

          {innings1Scorecard && (
            <p className="text-xs text-slate-300 font-mono border-t border-amber-500/20 pt-2 tabular-nums">
              Extras in 1st Innings: {innings1Scorecard.extras.total} (wd {innings1Scorecard.extras.wides}, nb{' '}
              {innings1Scorecard.extras.noBalls}, b {innings1Scorecard.extras.byes}, lb{' '}
              {innings1Scorecard.extras.legByes})
            </p>
          )}
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex flex-wrap items-center gap-1.5 border-b border-cyan-500/20 pb-3 text-xs font-mono">
        <button
          type="button"
          onClick={() => setActiveTab('scorecard')}
          className={`rounded-xl px-4 py-2 font-bold transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'scorecard'
              ? 'bg-cyan-500 text-slate-950'
              : 'bg-slate-950 text-slate-400 hover:text-white'
          }`}
        >
          Batting Scorecard ({battingPerformances.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('bowling')}
          className={`rounded-xl px-4 py-2 font-bold transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'bowling'
              ? 'bg-cyan-500 text-slate-950'
              : 'bg-slate-950 text-slate-400 hover:text-white'
          }`}
        >
          Bowling Figures ({bowlingPerformances.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('fow')}
          className={`rounded-xl px-4 py-2 font-bold transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'fow'
              ? 'bg-cyan-500 text-slate-950'
              : 'bg-slate-950 text-slate-400 hover:text-white'
          }`}
        >
          Fall of Wickets ({fallOfWickets.length})
        </button>
      </div>

      {activeTab === 'scorecard' && (
        <div className="rounded-2xl border border-cyan-500/20 bg-slate-950/80 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead className="border-b border-slate-800 bg-slate-900/90 text-slate-400 uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="px-4 py-3">Batter</th>
                  <th className="px-4 py-3">Dismissal</th>
                  <th className="px-4 py-3 text-right">Runs</th>
                  <th className="px-4 py-3 text-right">Balls</th>
                  <th className="px-4 py-3 text-right">4s</th>
                  <th className="px-4 py-3 text-right">6s</th>
                  <th className="px-4 py-3 text-right">SR</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80 text-slate-200 tabular-nums">
                {battingPerformances.map((b, idx) => (
                  <tr key={b.player?.id || idx} className="hover:bg-cyan-500/5 transition-colors">
                    <td className="px-4 py-2.5 font-sans font-bold text-white whitespace-nowrap">
                      {b.player?.name || 'Batter'}
                    </td>
                    <td className="px-4 py-2.5 text-slate-400 text-[11px] truncate max-w-xs">
                      {b.dismissal}
                    </td>
                    <td className="px-4 py-2.5 text-right font-black text-cyan-300 text-sm">
                      {b.runs}
                    </td>
                    <td className="px-4 py-2.5 text-right text-slate-400">{b.balls}</td>
                    <td className="px-4 py-2.5 text-right text-slate-300">{b.fours}</td>
                    <td className="px-4 py-2.5 text-right text-slate-300">{b.sixes}</td>
                    <td className="px-4 py-2.5 text-right font-bold text-amber-300">
                      {b.sr.toFixed(1)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'bowling' && (
        <div className="rounded-2xl border border-cyan-500/20 bg-slate-950/80 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead className="border-b border-slate-800 bg-slate-900/90 text-slate-400 uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="px-4 py-3">Bowler</th>
                  <th className="px-4 py-3 text-right">Overs</th>
                  <th className="px-4 py-3 text-right">Maidens</th>
                  <th className="px-4 py-3 text-right">Runs</th>
                  <th className="px-4 py-3 text-right">Wickets</th>
                  <th className="px-4 py-3 text-right">Econ</th>
                  <th className="px-4 py-3 text-right">Dots</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80 text-slate-200 tabular-nums">
                {bowlingPerformances.map((b, idx) => (
                  <tr key={b.player?.id || idx} className="hover:bg-cyan-500/5 transition-colors">
                    <td className="px-4 py-2.5 font-sans font-bold text-white whitespace-nowrap">
                      {b.player?.name || 'Bowler'}
                    </td>
                    <td className="px-4 py-2.5 text-right text-slate-300">{b.overs}</td>
                    <td className="px-4 py-2.5 text-right text-slate-400">{b.maidens}</td>
                    <td className="px-4 py-2.5 text-right text-slate-300">{b.runs}</td>
                    <td className="px-4 py-2.5 text-right font-black text-rose-400 text-sm">
                      {b.wickets}
                    </td>
                    <td className="px-4 py-2.5 text-right font-bold text-emerald-400">{b.econ}</td>
                    <td className="px-4 py-2.5 text-right text-slate-400">{b.dots}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'fow' && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
          {fallOfWickets.length === 0 ? (
            <p className="col-span-full text-center text-xs font-mono text-slate-400 py-4">
              No wickets fell in the 1st innings!
            </p>
          ) : (
            fallOfWickets.map((f, idx) => (
              <div
                key={idx}
                className="rounded-xl border border-slate-800 bg-slate-950/80 p-3 space-y-1 font-mono text-xs tabular-nums"
              >
                <span className="text-[10px] text-rose-400 font-bold block">WICKET #{idx + 1}</span>
                <div className="text-base font-black text-white">{f.wicket}</div>
                <p className="text-[11px] font-sans text-slate-300 truncate">{f.batter}</p>
                <span className="text-[10px] text-slate-500 block">Over {f.over}</span>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );

  if (isModal) {
    return (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-3 sm:p-6 backdrop-blur-xl overflow-y-auto animate-in fade-in duration-200"
        onClick={(e) => {
          if (e.target === e.currentTarget && onClose) onClose();
        }}
      >
        <div className="relative w-full max-w-4xl max-h-[92vh] overflow-y-auto">{content}</div>
      </div>
    );
  }

  return content;
};
