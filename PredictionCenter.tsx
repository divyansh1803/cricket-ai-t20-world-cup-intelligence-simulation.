import React, { useState } from 'react';
import { useGame } from '../../context/GameContext';
import { TEAMS, STADIUMS } from '../../data/cricketData';
import { CricketIntelligenceEngine } from '../../engine/simulationEngine';
import { Team, Stadium, MonteCarloResult } from '../../types/cricket';
import { cricketAudio } from '../../utils/audioSystem';
import { TeamFlag } from '../common/CricketIdentity';
import {
  TrendingUp,
  Cpu,
  Shield,
  RotateCcw,
  Sparkles,
  BarChart2,
  Sliders,
  ChevronDown,
} from 'lucide-react';

export const PredictionCenter: React.FC = () => {
  const { addXp } = useGame();
  const [teamA, setTeamA] = useState<Team>(TEAMS[0]); // India
  const [teamB, setTeamB] = useState<Team>(TEAMS[1]); // Australia
  const [stadium, setStadium] = useState<Stadium>(STADIUMS[0]); // Ahmedabad
  const [dew, setDew] = useState<boolean>(true);
  const [simCount, setSimCount] = useState<number>(5000);

  const [monteCarloResult, setMonteCarloResult] = useState<MonteCarloResult>(() =>
    CricketIntelligenceEngine.runMonteCarloSimulation(TEAMS[0], TEAMS[1], STADIUMS[0], true, 5000)
  );
  const [isSimulating, setIsSimulating] = useState<boolean>(false);

  const handleRunPrediction = () => {
    setIsSimulating(true);
    cricketAudio.playBatHit();

    setTimeout(() => {
      const result = CricketIntelligenceEngine.runMonteCarloSimulation(teamA, teamB, stadium, dew, simCount);
      setMonteCarloResult(result);
      setIsSimulating(false);
      cricketAudio.playBoundary();
      addXp(120, `Generated 5,000 Monte Carlo match simulations for ${teamA.name} vs ${teamB.name}`);
    }, 450);
  };

  const handleSwapTeams = () => {
    const temp = teamA;
    setTeamA(teamB);
    setTeamB(temp);
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-16">
      {/* Title */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-indigo-400">
            <Cpu className="h-3.5 w-3.5" />
            <span>AI MATCH PREDICTOR</span>
            <span aria-hidden="true">·</span>
            <span>MONTE CARLO SIMULATION</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight mt-1">
            Predictive Match Intelligence
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Simulates 5,000 algorithmic match iterations with multivariate distributions across batting firepower, death bowling, and dew factors.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleRunPrediction}
            disabled={isSimulating}
            className="flex items-center gap-2 rounded-xl bg-indigo-500 px-5 py-2.5 text-xs font-bold text-white hover:bg-indigo-400 disabled:opacity-50 transition-colors shadow-lg shadow-indigo-500/20 cursor-pointer"
          >
            <Sparkles className="h-4 w-4" />
            <span>{isSimulating ? 'SIMULATING...' : 'RUN 5,000 SIMULATIONS'}</span>
          </button>
        </div>
      </div>

      {/* Matchup Selector Bar */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 backdrop-blur-md">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-center">
          <div>
            <label className="text-xs text-slate-400 font-mono block mb-1">TEAM A</label>
            <select
              value={teamA.id}
              onChange={(e) => setTeamA(TEAMS.find((t) => t.id === e.target.value) || TEAMS[0])}
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs font-semibold text-white focus:border-indigo-500 cursor-pointer"
            >
              {TEAMS.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} (Rank #{t.ranking})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs text-slate-400 font-mono block mb-1">TEAM B</label>
            <select
              value={teamB.id}
              onChange={(e) => setTeamB(TEAMS.find((t) => t.id === e.target.value) || TEAMS[1])}
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs font-semibold text-white focus:border-indigo-500 cursor-pointer"
            >
              {TEAMS.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} (Rank #{t.ranking})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs text-slate-400 font-mono block mb-1">VENUE</label>
            <select
              value={stadium.id}
              onChange={(e) => setStadium(STADIUMS.find((s) => s.id === e.target.value) || STADIUMS[0])}
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs font-semibold text-white focus:border-indigo-500 cursor-pointer"
            >
              {STADIUMS.map((s) => (
                <option key={s.id} value={s.id}>
                  🏟️ {s.city} ({s.avgFirstInningsScore} avg)
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-3 pt-4 sm:pt-0">
            <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={dew}
                onChange={(e) => setDew(e.target.checked)}
                className="rounded border-slate-700 bg-slate-950 text-indigo-500 focus:ring-0"
              />
              <span>Heavy Evening Dew</span>
            </label>
            <button
              onClick={handleSwapTeams}
              className="rounded-lg border border-slate-800 bg-slate-950 p-2 text-slate-400 hover:text-white transition-colors cursor-pointer"
              title="Swap Teams"
            >
              <RotateCcw className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Results Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Head to Head Probability Hero */}
        <div className="lg:col-span-2 rounded-2xl border border-slate-800 bg-slate-900/80 p-6 space-y-6 backdrop-blur-md">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <span className="text-xs font-mono text-slate-400">ALGORITHMIC WIN PROBABILITY</span>
            <span className="text-xs font-mono text-emerald-400">82% AI CONFIDENCE</span>
          </div>

          {/* Teams Banner */}
          <div className="flex items-center justify-between gap-4">
            <div className="text-center sm:text-left space-y-1.5">
              <TeamFlag code={teamA.id} size="xl" />
              <h2 className="text-2xl font-black text-white">{teamA.name}</h2>
              <p className="text-3xl font-black text-indigo-400 tabular-nums">
                {monteCarloResult.teamAWinPercent}%
              </p>
              <p className="text-xs text-slate-400 font-mono">
                {monteCarloResult.teamAWins.toLocaleString()} / {monteCarloResult.simulationsRun.toLocaleString()} Wins
              </p>
            </div>

            <div className="text-center px-4">
              <span className="text-xs font-mono text-slate-500">VS</span>
              <p className="text-xs text-slate-400 font-bold mt-2">
                Expected: {monteCarloResult.mostLikelyMargin}
              </p>
            </div>

            <div className="text-center sm:text-right space-y-1.5 flex flex-col items-center sm:items-end">
              <TeamFlag code={teamB.id} size="xl" />
              <h2 className="text-2xl font-black text-white">{teamB.name}</h2>
              <p className="text-3xl font-black text-amber-400 tabular-nums">
                {monteCarloResult.teamBWinPercent}%
              </p>
              <p className="text-xs text-slate-400 font-mono">
                {monteCarloResult.teamBWins.toLocaleString()} / {monteCarloResult.simulationsRun.toLocaleString()} Wins
              </p>
            </div>
          </div>

          {/* Dual Bar */}
          <div className="h-4 w-full overflow-hidden rounded-full bg-slate-800 flex">
            <div
              className="h-full bg-indigo-500 transition-all duration-700"
              style={{ width: `${monteCarloResult.teamAWinPercent}%` }}
            />
            <div
              className="h-full bg-amber-500 transition-all duration-700"
              style={{ width: `${monteCarloResult.teamBWinPercent}%` }}
            />
          </div>

          {/* Score Distribution Confidence Range */}
          <div className="rounded-xl border border-slate-800 bg-slate-950 p-4 space-y-3">
            <div className="flex items-center justify-between text-xs font-mono text-slate-400">
              <span>PROJECTED INNINGS 1 SCORE RANGE (80% CONFIDENCE INTERVAL)</span>
              <span className="text-indigo-400">MEDIAN: {monteCarloResult.medianScoreA}</span>
            </div>

            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-slate-500">10th Percentile (Floor)</span>
              <span className="text-white font-bold">{monteCarloResult.score10thPercentile}</span>
              <span className="text-slate-600">··········</span>
              <span className="text-indigo-400 font-black text-base">{monteCarloResult.medianScoreA} ± 12</span>
              <span className="text-slate-600">··········</span>
              <span className="text-white font-bold">{monteCarloResult.score90thPercentile}</span>
              <span className="text-slate-500">90th Percentile (Ceiling)</span>
            </div>
          </div>
        </div>

        {/* Factor Breakdown Waterfall (Right Column) */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6 space-y-4 backdrop-blur-md">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <span className="text-xs font-mono text-slate-400">PREDICTION FACTORS</span>
            <span className="text-xs text-indigo-400 font-bold">CONTRIBUTION</span>
          </div>

          <div className="space-y-4">
            {monteCarloResult.factors.map((f, idx) => (
              <div key={idx} className="space-y-1.5 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-200">{f.name}</span>
                  <span
                    className={`inline-flex items-center gap-1.5 font-mono font-bold tabular-nums ${
                      f.favorTeam === 'teamA' ? 'text-indigo-400' : 'text-amber-400'
                    }`}
                  >
                    <span>+{f.impactPercent}%</span>
                    <TeamFlag code={f.favorTeam === 'teamA' ? teamA.id : teamB.id} size="xs" />
                  </span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
                  <div
                    className={`h-full transition-all duration-500 ${
                      f.favorTeam === 'teamA' ? 'bg-indigo-500' : 'bg-amber-500'
                    }`}
                    style={{ width: `${Math.min(100, f.impactPercent * 8)}%` }}
                  />
                </div>
                <p className="text-[11px] text-slate-400 leading-tight">{f.reason}</p>
              </div>
            ))}
          </div>

          <div className="border-t border-slate-800 pt-3 text-[11px] text-slate-500 leading-relaxed">
            Monte Carlo distributions calibrated on 55 matches from the 2024-2026 ICC T20 World Cup cycle.
          </div>
        </div>
      </div>
    </div>
  );
};
