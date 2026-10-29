import React, { useState } from 'react';
import { useGame } from '../../context/GameContext';
import { TEAMS } from '../../data/cricketData';
import { BATTLE_CARDS } from '../../data/cricketLabData';
import { Player } from '../../types/cricket';
import { CountryFlag, PlayerCardAvatar } from '../common/CricketIdentity';
import { getPlayerWeaknesses } from '../../utils/playerAnalytics';
import { cricketAudio } from '../../utils/audioSystem';
import { Swords, AlertTriangle, ShieldCheck, Sparkles, TrendingUp } from 'lucide-react';

export const BattleCardsView: React.FC = () => {
  const allPlayers = TEAMS.flatMap((t) => t.squad);

  const [batterId, setBatterId] = useState<string>('sky');
  const [bowlerId, setBowlerId] = useState<string>('starc');

  const batter = allPlayers.find((p) => p.id === batterId) || allPlayers[0];
  const bowler = allPlayers.find((p) => p.id === bowlerId) || allPlayers[1];

  const matchedBattle = BATTLE_CARDS.find(
    (b) => b.batterId === batter.id && b.bowlerId === bowler.id
  ) || {
    batterId: batter.id,
    bowlerId: bowler.id,
    historicalBalls: 18,
    historicalRuns: 32,
    historicalDismissals: 1,
    historicalSR: 177.8,
    batterEdgePercent: batter.stats.strikeRate > 150 ? 62 : 45,
    bowlerEdgePercent: batter.stats.strikeRate > 150 ? 38 : 55,
    phaseMatchup: 'Middle & Death Overs',
    predictedOutcome: 'High boundary contention; aggressive front-foot execution',
    weaknessExploited: 'In-dipping ball on middle-and-leg threatens pad, but room outside off frees hands.',
  };

  const batterWeaknesses = getPlayerWeaknesses(batter);
  const bowlerWeaknesses = getPlayerWeaknesses(bowler);

  const handleSwap = () => {
    cricketAudio.playBatHit();
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-16">
      {/* Title */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-rose-400 font-bold">
            <Swords className="h-4 w-4" />
            <span>CRICKET BATTLE CARDS</span>
            <span aria-hidden="true">·</span>
            <span>BATTER VS BOWLER DUELS</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight mt-1">
            Head-to-Head Battle Cards
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Compare matchup metrics, historical head-to-head records, and exploited technical vulnerabilities.
          </p>
        </div>

        {/* Quick Matchup Presets */}
        <div className="flex items-center gap-2 text-xs font-mono">
          <span className="text-slate-500">Presets:</span>
          {BATTLE_CARDS.map((b, idx) => (
            <button
              key={idx}
              onClick={() => {
                setBatterId(b.batterId);
                setBowlerId(b.bowlerId);
                cricketAudio.playBatHit();
              }}
              className="rounded-lg border border-slate-800 bg-slate-900 px-2.5 py-1 text-slate-300 hover:border-sky-400 hover:text-white transition-colors cursor-pointer"
            >
              #{idx + 1}
            </button>
          ))}
        </div>
      </div>

      {/* Selectors */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="text-xs font-mono text-slate-400 block mb-1">SELECT BATTER</label>
          <select
            value={batterId}
            onChange={(e) => setBatterId(e.target.value)}
            className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2 text-xs font-bold text-white focus:border-sky-500 cursor-pointer"
          >
            {allPlayers.filter((p) => p.role.includes('Batter') || p.role.includes('All-Rounder')).map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} ({p.country} · {p.role})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-xs font-mono text-slate-400 block mb-1">SELECT BOWLER</label>
          <select
            value={bowlerId}
            onChange={(e) => setBowlerId(e.target.value)}
            className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2 text-xs font-bold text-white focus:border-rose-500 cursor-pointer"
          >
            {allPlayers.filter((p) => p.role.includes('Bowler') || p.role.includes('All-Rounder')).map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} ({p.country} · {p.role})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Main Battle Card Faceoff */}
      <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6 sm:p-8 space-y-6 backdrop-blur-md shadow-2xl">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
          {/* Batter Side */}
          <div className="rounded-2xl border border-slate-800 bg-slate-950 p-6 text-center space-y-4">
            <div className="mx-auto flex justify-center">
              <PlayerCardAvatar
                playerId={batter.id}
                name={batter.name}
                countryCode={batter.countryCode}
                jerseyNumber={batter.jerseyNumber || 18}
                size="lg"
              />
            </div>
            <div>
              <CountryFlag countryCode={batter.countryCode} size="sm" className="mx-auto mb-1" />
              <h2 className="text-lg font-black text-white">{batter.name}</h2>
              <p className="text-xs text-slate-400">{batter.role}</p>
              <p className="text-xs font-mono text-sky-400 font-bold mt-1">
                {batter.stats.strikeRate} SR · {batter.stats.average} Avg
              </p>
            </div>
            <div className="pt-2 border-t border-slate-900">
              <span className="text-[10px] font-mono text-slate-500 block">BATTER EDGE</span>
              <span className="text-2xl font-black text-sky-400 tabular-nums">{matchedBattle.batterEdgePercent}%</span>
            </div>
          </div>

          {/* Clash Centerpiece */}
          <div className="text-center space-y-4">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-rose-500/40 bg-rose-500/10 text-rose-400 shadow-lg shadow-rose-500/20">
              <Swords className="h-7 w-7" />
            </div>

            <div className="space-y-1">
              <span className="text-xs font-mono text-slate-500 block">HEAD-TO-HEAD HISTORY</span>
              <p className="text-sm font-bold text-white font-mono">
                {matchedBattle.historicalRuns} Runs off {matchedBattle.historicalBalls} Balls
              </p>
              <p className="text-xs text-slate-400 font-mono">
                Dismissals: <strong className="text-rose-400">{matchedBattle.historicalDismissals}</strong> · SR: <strong className="text-sky-400">{matchedBattle.historicalSR}</strong>
              </p>
            </div>

            <div className="rounded-xl border border-purple-500/30 bg-purple-500/10 p-3 text-xs text-slate-300 font-sans">
              <strong className="text-white block mb-0.5">Predicted Outcome:</strong>
              {matchedBattle.predictedOutcome}
            </div>
          </div>

          {/* Bowler Side */}
          <div className="rounded-2xl border border-slate-800 bg-slate-950 p-6 text-center space-y-4">
            <div className="mx-auto flex justify-center">
              <PlayerCardAvatar
                playerId={bowler.id}
                name={bowler.name}
                countryCode={bowler.countryCode}
                jerseyNumber={bowler.jerseyNumber || 18}
                size="lg"
              />
            </div>
            <div>
              <CountryFlag countryCode={bowler.countryCode} size="sm" className="mx-auto mb-1" />
              <h2 className="text-lg font-black text-white">{bowler.name}</h2>
              <p className="text-xs text-slate-400">{bowler.role}</p>
              <p className="text-xs font-mono text-rose-400 font-bold mt-1">
                {bowler.stats.economy} Econ · {bowler.rating} Rating
              </p>
            </div>
            <div className="pt-2 border-t border-slate-900">
              <span className="text-[10px] font-mono text-slate-500 block">BOWLER EDGE</span>
              <span className="text-2xl font-black text-rose-400 tabular-nums">{matchedBattle.bowlerEdgePercent}%</span>
            </div>
          </div>
        </div>

        {/* Tactical Vulnerability Exploited */}
        <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4 space-y-2 text-xs">
          <div className="flex items-center gap-2 font-bold text-white">
            <AlertTriangle className="h-4 w-4 text-amber-400" />
            <span>Technical Vulnerability in This Matchup:</span>
          </div>
          <p className="text-slate-300 leading-relaxed font-sans">{matchedBattle.weaknessExploited}</p>
        </div>
      </div>
    </div>
  );
};
