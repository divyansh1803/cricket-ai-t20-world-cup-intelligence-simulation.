import React, { useState } from 'react';
import { Zap, Sparkles, TrendingUp, TrendingDown, RotateCcw, ArrowRight, ShieldCheck, Check } from 'lucide-react';
import { Team } from '../../types/cricket';
import { CountryFlag } from '../common/CricketIdentity';
import { cricketAudio } from '../../utils/audioSystem';

export interface WhatIfScenario {
  id: string;
  title: string;
  matchDescription: string;
  underdogId: string;
  favoriteId: string;
  targetMatchId: string;
  winnerOverride: string;
  rippleEffects: {
    qualificationSwing: string;
    bracketRealignment: string;
    championOddsChange: string;
    narrative: string;
  };
}

interface WhatIfModeExplorerProps {
  onApplyScenario: (matchId: string, winnerId: string) => void;
  onResetScenarios: () => void;
  currentMatchesCount: number;
}

export const WHAT_IF_PRESETS: WhatIfScenario[] = [
  {
    id: 'upset_pak_ind',
    title: 'High-Voltage Shock: Pakistan Defeats India',
    matchDescription: 'India vs Pakistan at Nassau County',
    underdogId: 'pk',
    favoriteId: 'ind',
    targetMatchId: 'm3',
    winnerOverride: 'pk',
    rippleEffects: {
      qualificationSwing: 'Pakistan +48% semifinal odds; India drops from 98% to 76%',
      bracketRealignment: 'Pakistan claims Group 1 Seed #1; India drops to Seed #2 and faces South Africa in Trinidad',
      championOddsChange: 'Pakistan champion probability jumps from 14% to 28%',
      narrative: 'A masterclass opening spell throws Group 1 into complete turmoil, forcing India to win remaining matches with huge NRR.',
    },
  },
  {
    id: 'upset_afg_aus',
    title: 'Historic Upset: Afghanistan Overcomes Australia',
    matchDescription: 'Australia vs Afghanistan at St Lucia',
    underdogId: 'afg',
    favoriteId: 'aus',
    targetMatchId: 'm4',
    winnerOverride: 'afg',
    rippleEffects: {
      qualificationSwing: 'Afghanistan +54% qualification probability; Australia qualification odds drop to 58%',
      bracketRealignment: 'Afghanistan enters top 2 contention; Australia faces must-win showdown vs Pakistan',
      championOddsChange: 'Afghanistan title odds rise to 12%; Australia slides from 28% to 19%',
      narrative: 'Rashid Khan takes 4 wickets in the middle overs, defending 148 runs and triggering a massive group shakeup.',
    },
  },
  {
    id: 'upset_wi_eng',
    title: 'Caribbean Fireworks: West Indies Defeats England',
    matchDescription: 'England vs West Indies at Barbados',
    underdogId: 'wi',
    favoriteId: 'eng',
    targetMatchId: 'm10',
    winnerOverride: 'wi',
    rippleEffects: {
      qualificationSwing: 'West Indies +42% qualification odds; England placed on elimination alert',
      bracketRealignment: 'West Indies claims Group 2 Seed #2; England relies on NRR tiebreakers',
      championOddsChange: 'West Indies surges to 16% title probability',
      narrative: 'Death overs boundary flurry knocks England out of the top 2 qualifying bracket, realigning the semifinals.',
    },
  },
];

export const WhatIfModeExplorer: React.FC<WhatIfModeExplorerProps> = ({
  onApplyScenario,
  onResetScenarios,
}) => {
  const [selectedScenarioId, setSelectedScenarioId] = useState<string>('upset_pak_ind');
  const [appliedScenarioId, setAppliedScenarioId] = useState<string | null>(null);

  const activeScenario =
    WHAT_IF_PRESETS.find((s) => s.id === selectedScenarioId) || WHAT_IF_PRESETS[0];

  const handleApply = (scenario: WhatIfScenario) => {
    setAppliedScenarioId(scenario.id);
    onApplyScenario(scenario.targetMatchId, scenario.winnerOverride);
    cricketAudio.playBatHit();
  };

  const handleReset = () => {
    setAppliedScenarioId(null);
    onResetScenarios();
    cricketAudio.playBoundary();
  };

  return (
    <div className="rounded-3xl border border-purple-500/40 bg-slate-950/90 p-6 sm:p-7 space-y-6 shadow-2xl backdrop-blur-md">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-purple-500/20 pb-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-purple-400 font-bold">
            <Zap className="h-4 w-4" />
            <span>WHAT-IF? TOURNAMENT REALITY SIMULATOR</span>
          </div>
          <h3 className="text-xl font-black text-white mt-0.5">
            Single Match Chain Reaction Lab
          </h3>
          <p className="text-xs text-slate-400">
            Alter a single match result and watch the entire points table, NRR, and semifinal matrix automatically recalculate.
          </p>
        </div>

        <button
          onClick={handleReset}
          className="flex items-center gap-1.5 rounded-xl border border-slate-800 bg-slate-900 px-3.5 py-2 text-xs font-mono font-bold text-slate-300 hover:text-white transition-colors cursor-pointer"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          <span>Reset to Baseline</span>
        </button>
      </div>

      {/* Preset Chips */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {WHAT_IF_PRESETS.map((scenario) => {
          const isSelected = selectedScenarioId === scenario.id;
          const isApplied = appliedScenarioId === scenario.id;

          return (
            <button
              key={scenario.id}
              onClick={() => {
                setSelectedScenarioId(scenario.id);
                handleApply(scenario);
              }}
              className={`rounded-2xl border p-4 text-left transition-all cursor-pointer ${
                isSelected
                  ? 'border-purple-400 bg-purple-950/40 shadow-xl shadow-purple-500/20'
                  : 'border-slate-800 bg-slate-900/60 hover:border-slate-700'
              }`}
            >
              <div className="flex items-center justify-between text-xs font-mono mb-2">
                <span className="text-purple-300 font-bold">SCENARIO</span>
                {isApplied && (
                  <span className="flex items-center gap-1 text-emerald-400 font-bold text-[10px]">
                    <Check className="h-3 w-3" /> ACTIVE
                  </span>
                )}
              </div>
              <h4 className="text-sm font-bold text-white mb-1">{scenario.title}</h4>
              <p className="text-xs text-slate-400 font-mono">{scenario.matchDescription}</p>
            </button>
          );
        })}
      </div>

      {/* Chain Reaction Impact Breakdown Card */}
      <div className="rounded-2xl border border-purple-500/30 bg-purple-950/20 p-5 space-y-4">
        <div className="flex items-center justify-between text-xs">
          <span className="font-mono font-bold text-purple-300 uppercase tracking-wider">
            AUTOMATIC RECALCULATION DELTAS
          </span>
          <span className="text-xs font-mono text-emerald-400">INSTANT TOURNAMENT PROPAGATION</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs font-mono">
          <div className="rounded-xl border border-slate-800 bg-slate-950 p-3 space-y-1">
            <span className="text-[10px] text-slate-500 block uppercase">QUALIFICATION SWING</span>
            <p className="font-bold text-sky-400">{activeScenario.rippleEffects.qualificationSwing}</p>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-950 p-3 space-y-1">
            <span className="text-[10px] text-slate-500 block uppercase">SEMIFINAL REALIGNMENT</span>
            <p className="font-bold text-amber-400">{activeScenario.rippleEffects.bracketRealignment}</p>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-950 p-3 space-y-1">
            <span className="text-[10px] text-slate-500 block uppercase">CHAMPION PROBABILITY</span>
            <p className="font-bold text-purple-400">{activeScenario.rippleEffects.championOddsChange}</p>
          </div>
        </div>

        <p className="text-xs text-slate-300 leading-relaxed font-sans">
          💡 <strong className="text-white">AI Analysis:</strong> {activeScenario.rippleEffects.narrative}
        </p>
      </div>
    </div>
  );
};
