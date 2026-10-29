import React, { useMemo, useState } from 'react';
import { useGame } from '../../context/GameContext';
import { DECISION_SCENARIOS } from '../../data/cricketData';
import { DecisionScenario } from '../../types/cricket';
import { cricketAudio } from '../../utils/audioSystem';
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  Trophy,
} from 'lucide-react';

type DifficultyFilter = 'All' | DecisionScenario['difficulty'];

export const YouVsAiMode: React.FC = () => {
  const { addXp, recordAiBattle, setActiveView } = useGame();
  const [difficultyFilter, setDifficultyFilter] = useState<DifficultyFilter>('All');
  const [activeScenarioId, setActiveScenarioId] = useState<string>(DECISION_SCENARIOS[0].id);
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);
  const [hasSimulated, setHasSimulated] = useState(false);
  const [userScore, setUserScore] = useState<number | null>(null);
  const [aiScore, setAiScore] = useState<number | null>(null);
  const [completedScores, setCompletedScores] = useState<Record<string, number>>({});

  const filteredScenarios = useMemo(() => {
    if (difficultyFilter === 'All') return DECISION_SCENARIOS;
    return DECISION_SCENARIOS.filter((s) => s.difficulty === difficultyFilter);
  }, [difficultyFilter]);

  const scenario = useMemo(() => {
    return (
      filteredScenarios.find((s) => s.id === activeScenarioId) ||
      filteredScenarios[0] ||
      DECISION_SCENARIOS[0]
    );
  }, [filteredScenarios, activeScenarioId]);

  const currentIdxInFiltered = Math.max(
    0,
    filteredScenarios.findIndex((s) => s.id === scenario.id)
  );

  const handleSelectOption = (optId: string) => {
    if (hasSimulated) return;
    cricketAudio.playUiClick();
    setSelectedOptionId(optId);
  };

  const handleSimulate = () => {
    if (!selectedOptionId) return;

    const chosenOption = scenario.options.find((o) => o.id === selectedOptionId);
    if (!chosenOption) return;

    cricketAudio.playBatHit();

    // Compute tactical decision quality score
    let score = 70;
    if (chosenOption.aiCoachAgreement) {
      score = 88 + Math.floor(Math.random() * 8); // 88 - 95
    } else if (chosenOption.riskLevel === 'Low' && scenario.matchSituation.requiredRR > 12) {
      score = 42 + Math.floor(Math.random() * 8); // penalty for timid play when high RRR
    } else if (chosenOption.winProbChange <= -15) {
      score = 48 + Math.floor(Math.random() * 10);
    } else {
      score = 65 + Math.floor(Math.random() * 12);
    }

    const aiCoachScore = 82;
    setUserScore(score);
    setAiScore(aiCoachScore);
    setHasSimulated(true);
    setCompletedScores((prev) => ({
      ...prev,
      [scenario.id]: Math.max(prev[scenario.id] ?? 0, score),
    }));

    const userBeatAi = score >= aiCoachScore;
    recordAiBattle(userBeatAi);

    if (userBeatAi) {
      setTimeout(() => {
        cricketAudio.playVictory();
        addXp(250, `You beat the AI Coach with an elite ${score}/100 tactical decision!`);
      }, 450);
    } else {
      setTimeout(() => {
        cricketAudio.playBoundary();
        addXp(100, `Completed scenario tactical simulation (${score}/100 quality).`);
      }, 450);
    }
  };

  const handleReset = () => {
    setSelectedOptionId(null);
    setHasSimulated(false);
    setUserScore(null);
    setAiScore(null);
  };

  const handleSwitchScenario = (targetId: string) => {
    cricketAudio.playUiClick();
    handleReset();
    setActiveScenarioId(targetId);
  };

  const handlePrevScenario = () => {
    if (filteredScenarios.length === 0) return;
    const prevIdx =
      (currentIdxInFiltered - 1 + filteredScenarios.length) % filteredScenarios.length;
    handleSwitchScenario(filteredScenarios[prevIdx].id);
  };

  const handleNextScenario = () => {
    if (filteredScenarios.length === 0) return;
    const nextIdx = (currentIdxInFiltered + 1) % filteredScenarios.length;
    handleSwitchScenario(filteredScenarios[nextIdx].id);
  };

  const chosenOption = scenario.options.find((o) => o.id === selectedOptionId);
  const completedCount = Object.keys(completedScores).length;

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-16 font-sans">
      {/* Title Banner */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2 text-xs text-sky-300 font-medium">
            <span>Tactical Gaming Arena</span>
            <span aria-hidden="true" className="text-slate-600">
              ·
            </span>
            <span>You vs AI Coach</span>
            <span aria-hidden="true" className="text-slate-600">
              ·
            </span>
            <span className="font-mono text-slate-300 tabular-nums">
              Scenario {currentIdxInFiltered + 1} of {filteredScenarios.length} ({completedCount}/
              {DECISION_SCENARIOS.length} Solved)
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            {scenario.title}
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handlePrevScenario}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs font-semibold text-slate-200 hover:text-white transition-colors cursor-pointer whitespace-nowrap shrink-0"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Prev</span>
          </button>

          <button
            type="button"
            onClick={handleNextScenario}
            className="inline-flex items-center gap-1.5 rounded-lg border border-sky-500/40 bg-slate-800 px-3.5 py-2 text-xs font-semibold text-white hover:bg-slate-700 transition-colors cursor-pointer whitespace-nowrap shrink-0"
          >
            <span>Next Scenario</span>
            <ArrowRight className="h-3.5 w-3.5 text-sky-400" />
          </button>

          <button
            type="button"
            onClick={() => setActiveView('arena')}
            className="rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-xs font-medium text-slate-300 hover:text-white transition-colors cursor-pointer whitespace-nowrap shrink-0"
          >
            Arena Menu
          </button>
        </div>
      </div>

      {/* Scenario Browser & Difficulty Filter Bar */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/75 p-4 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <span className="text-xs font-semibold text-slate-200">
            Select Tactical Challenge ({DECISION_SCENARIOS.length} Match Scenarios):
          </span>

          <div
            role="group"
            aria-label="Filter Scenarios by Difficulty"
            className="inline-flex flex-wrap items-center rounded-xl border border-slate-800 bg-slate-950 p-1 text-xs"
          >
            {(['All', 'Rookie', 'Analyst', 'Grandmaster'] as const).map((tier) => {
              const count =
                tier === 'All'
                  ? DECISION_SCENARIOS.length
                  : DECISION_SCENARIOS.filter((s) => s.difficulty === tier).length;
              const isActive = difficultyFilter === tier;
              return (
                <button
                  key={tier}
                  type="button"
                  onClick={() => {
                    cricketAudio.playUiClick();
                    setDifficultyFilter(tier);
                    const nextPool =
                      tier === 'All'
                        ? DECISION_SCENARIOS
                        : DECISION_SCENARIOS.filter((s) => s.difficulty === tier);
                    if (nextPool.length > 0 && !nextPool.some((s) => s.id === activeScenarioId)) {
                      handleReset();
                      setActiveScenarioId(nextPool[0].id);
                    }
                  }}
                  className={`rounded-lg px-2.5 py-1 font-semibold transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                    isActive
                      ? 'bg-sky-400 text-slate-950 font-bold'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {tier} ({count})
                </button>
              );
            })}
          </div>
        </div>

        {/* Horizontal Scrollable 12-Scenario Selector */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {filteredScenarios.map((item, idx) => {
            const isCurrent = item.id === scenario.id;
            const bestScore = completedScores[item.id];
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleSwitchScenario(item.id)}
                className={`inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-xs transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                  isCurrent
                    ? 'border-sky-400 bg-sky-500/15 text-white font-bold'
                    : 'border-slate-800 bg-slate-950/85 text-slate-300 hover:border-slate-700 hover:text-white'
                }`}
              >
                <span className="font-mono text-sky-400 tabular-nums">#{idx + 1}</span>
                <span className="max-w-[180px] truncate">
                  {item.matchSituation.battingTeam} vs {item.matchSituation.bowlingTeam}
                </span>
                <span className="text-[11px] text-slate-400">· {item.difficulty}</span>
                {bestScore !== undefined && (
                  <span className="inline-flex items-center gap-1 font-mono text-[11px] text-emerald-300 tabular-nums">
                    <CheckCircle2 className="h-3 w-3 shrink-0" />
                    <span>{bestScore}</span>
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Match Telemetry Dashboard */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/85 p-5 sm:p-6 backdrop-blur-md space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div>
            <div className="flex items-center gap-2 text-xs text-slate-300 font-medium">
              <span>
                {scenario.matchSituation.battingTeam} vs {scenario.matchSituation.bowlingTeam}
              </span>
              <span aria-hidden="true" className="text-slate-600">
                ·
              </span>
              <span className="text-amber-300">{scenario.difficulty} Tier</span>
            </div>
            <div className="text-xl sm:text-2xl font-black text-white mt-0.5 tabular-nums">
              {scenario.matchSituation.battingTeam} {scenario.matchSituation.score}{' '}
              <span className="text-sm font-normal text-slate-300 font-mono">
                ({scenario.matchSituation.overs} ov · CRR {scenario.matchSituation.currentCRR})
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-6 text-right">
            <div>
              <div className="text-xs text-slate-400">Target</div>
              <div className="text-lg font-bold font-mono text-white tabular-nums">
                {scenario.matchSituation.target}
              </div>
            </div>
            <div>
              <div className="text-xs text-slate-400">Equation</div>
              <div className="text-lg font-bold font-mono text-sky-300 tabular-nums">
                {scenario.matchSituation.neededRuns} off {scenario.matchSituation.remainingBalls}{' '}
                balls
              </div>
            </div>
            <div>
              <div className="text-xs text-slate-400">Req. Rate</div>
              <div className="text-lg font-bold font-mono text-amber-300 tabular-nums">
                {scenario.matchSituation.requiredRR}
              </div>
            </div>
          </div>
        </div>

        {/* Players in the Middle */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
          <div className="rounded-xl border border-slate-800 bg-slate-950 p-3.5">
            <span className="text-slate-400 block mb-1">On Strike</span>
            <span className="text-sm font-bold text-white">{scenario.matchSituation.striker}</span>
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-950 p-3.5">
            <span className="text-slate-400 block mb-1">Non-Striker</span>
            <span className="text-sm font-semibold text-slate-200">
              {scenario.matchSituation.nonStriker}
            </span>
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-950 p-3.5">
            <span className="text-slate-400 block mb-1">Bowler</span>
            <span className="text-sm font-bold text-rose-300">
              {scenario.matchSituation.bowler}
            </span>
          </div>
        </div>

        <div className="rounded-xl bg-slate-950/80 border border-slate-800 px-4 py-3 flex items-center gap-2.5 text-xs text-slate-200">
          <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0" />
          <span>Pitch &amp; Conditions: {scenario.matchSituation.pitchState}</span>
        </div>
      </div>

      {/* Decision Options */}
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-base font-bold text-white">
            What would you do? Choose your tactical command:
          </h2>
          <span className="text-xs text-slate-300">Select one strategy</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {scenario.options.map((opt) => {
            const isSelected = selectedOptionId === opt.id;
            const riskTone =
              opt.riskLevel === 'Low'
                ? 'text-emerald-300'
                : opt.riskLevel === 'Medium'
                ? 'text-amber-300'
                : 'text-rose-300';

            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => handleSelectOption(opt.id)}
                className={`group text-left rounded-2xl border p-5 transition-colors cursor-pointer flex flex-col justify-between ${
                  isSelected
                    ? 'border-sky-400 bg-sky-500/10'
                    : 'border-slate-800 bg-slate-900/70 hover:border-slate-700 hover:bg-slate-900'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <h3
                      className={`text-sm font-bold leading-snug ${
                        isSelected ? 'text-sky-300' : 'text-white'
                      }`}
                    >
                      {opt.label}
                    </h3>
                    <span className={`text-xs font-semibold shrink-0 ${riskTone}`}>
                      {opt.riskLevel} Risk
                    </span>
                  </div>

                  <p className="mt-2 text-xs text-slate-300 leading-relaxed">
                    {opt.tacticalIntent}
                  </p>
                </div>

                <div className="mt-4 flex items-center justify-between border-t border-slate-800/80 pt-2.5 text-xs">
                  <span className="font-mono text-slate-300 tabular-nums">
                    Exp. Runs: ~{opt.expectedRuns}
                  </span>
                  <span
                    className={
                      isSelected
                        ? 'text-sky-300 font-bold'
                        : 'text-slate-400 group-hover:text-slate-200'
                    }
                  >
                    {isSelected ? 'Selected ✓' : 'Select Strategy'}
                  </span>
                </div>
              </button>
            );
          })}
        </div>

        {/* Action Button */}
        {!hasSimulated ? (
          <div className="flex justify-end pt-2">
            <button
              type="button"
              onClick={handleSimulate}
              disabled={!selectedOptionId}
              className="inline-flex items-center gap-2 rounded-xl bg-sky-400 px-6 py-3.5 text-sm font-bold text-slate-950 hover:bg-sky-300 disabled:opacity-40 transition-colors cursor-pointer whitespace-nowrap shrink-0"
            >
              <Sparkles className="h-4 w-4" />
              <span>Simulate Decision</span>
            </button>
          </div>
        ) : (
          <div className="flex flex-wrap justify-end gap-2.5 pt-2">
            <button
              type="button"
              onClick={handleReset}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-800 px-5 py-3 text-xs font-semibold text-slate-200 hover:text-white transition-colors cursor-pointer whitespace-nowrap shrink-0"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>Try Another Strategy</span>
            </button>
            <button
              type="button"
              onClick={handleNextScenario}
              className="inline-flex items-center gap-2 rounded-xl bg-sky-400 px-5 py-3 text-xs font-bold text-slate-950 hover:bg-sky-300 transition-colors cursor-pointer whitespace-nowrap shrink-0"
            >
              <span>Next Scenario</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* Simulation Result & AI Coach Comparison */}
      {hasSimulated && chosenOption && userScore !== null && aiScore !== null && (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/95 p-6 space-y-6 animate-in fade-in duration-200">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <Trophy className="h-5 w-5 text-amber-400" />
                <h3 className="text-base font-bold text-white">
                  Simulation Outcome &amp; Decision Quality
                </h3>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                Evaluated against tournament win-probability leverage models
              </p>
            </div>

            {userScore >= aiScore ? (
              <div className="rounded-xl border border-emerald-500/35 bg-emerald-500/10 px-4 py-2 text-emerald-300 text-xs font-bold flex items-center gap-2">
                <ShieldCheck className="h-4 w-4" />
                <span>You Outperformed the AI Coach (+250 XP)</span>
              </div>
            ) : (
              <div className="rounded-xl border border-slate-700 bg-slate-950 px-4 py-2 text-slate-200 text-xs font-semibold">
                AI Coach Held Strategic Edge (+100 XP)
              </div>
            )}
          </div>

          {/* Scores Head to Head */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-slate-300">Your Decision Quality</span>
                <span className="text-xl font-black font-mono text-sky-300 tabular-nums">
                  {userScore}/100
                </span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-slate-800">
                <div
                  className="h-full bg-sky-400 transition-all duration-500"
                  style={{ width: `${userScore}%` }}
                />
              </div>
              <p className="mt-3 text-xs text-slate-200 leading-relaxed">
                {chosenOption.outcomeNarrative}
              </p>
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-slate-300">AI Coach Benchmark</span>
                <span className="text-xl font-black font-mono text-indigo-300 tabular-nums">
                  {aiScore}/100
                </span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-slate-800">
                <div
                  className="h-full bg-indigo-400 transition-all duration-500"
                  style={{ width: `${aiScore}%` }}
                />
              </div>
              <div className="mt-3 text-xs text-slate-300 space-y-1">
                <p>
                  <strong className="text-white">Target Runs:</strong>{' '}
                  {scenario.aiCoachRecommendation.targetRunsInOver}
                </p>
                <p>
                  <strong className="text-white">Focal Zone:</strong>{' '}
                  {scenario.aiCoachRecommendation.focalZone}
                </p>
              </div>
            </div>
          </div>

          {/* Detailed Tactical Explanation */}
          <div className="rounded-xl border border-slate-800 bg-slate-950 p-4 space-y-2">
            <div className="flex items-center gap-2 text-xs font-bold text-white">
              <TrendingUp className="h-4 w-4 text-sky-400" />
              <span>Tactical Explanation</span>
            </div>
            <p className="text-xs text-slate-200 leading-relaxed">{chosenOption.explanation}</p>
            <p className="text-xs text-slate-300 leading-relaxed border-t border-slate-800 pt-2">
              <strong className="text-white">AI Engine Reasoning:</strong>{' '}
              {scenario.aiCoachRecommendation.tacticalReason}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
