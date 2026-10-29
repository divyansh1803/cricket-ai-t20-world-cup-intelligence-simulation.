import React, { useState } from 'react';
import {
  Activity,
  Heart,
  TrendingDown,
  Zap,
  ShieldAlert,
  Flame,
  Clock,
  User,
  Gauge,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
} from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
  AreaChart,
  Area,
} from 'recharts';
import { Player } from '../../types/cricket';

export interface PlayerFatigueProps {
  currentOver?: number; // 0 to 20
  striker?: Player | null;
  nonStriker?: Player | null;
  currentBowler?: Player | null;
  ballsFacedByStriker?: number;
  oversBowledByBowler?: number;
}

export const PlayerFatigueAnalysis: React.FC<PlayerFatigueProps> = ({
  currentOver = 14,
  striker,
  nonStriker,
  currentBowler,
  ballsFacedByStriker = 38,
  oversBowledByBowler = 3.2,
}) => {
  const [selectedInningsOver, setSelectedInningsOver] = useState<number>(Math.min(20, Math.max(1, Math.round(currentOver))));
  const [selectedRoleFocus, setSelectedRoleFocus] = useState<'bowling' | 'batting' | 'combined'>('combined');

  // Bowler metrics drop-off as overs progress (historical decadal tracking)
  const bowlerFatigueData = [
    { over: 2, spell: 'Spell 1 (New Ball)', bowlingSpeedKmh: 144.5, accuracyPercent: 94, releaseConsistency: 96, fatigueIndex: 12 },
    { over: 6, spell: 'Powerplay Finish', bowlingSpeedKmh: 143.2, accuracyPercent: 91, releaseConsistency: 92, fatigueIndex: 26 },
    { over: 10, spell: 'Middle Overs (1)', bowlingSpeedKmh: 141.0, accuracyPercent: 86, releaseConsistency: 88, fatigueIndex: 44 },
    { over: 14, spell: 'Middle Overs (2)', bowlingSpeedKmh: 139.6, accuracyPercent: 81, releaseConsistency: 81, fatigueIndex: 59 },
    { over: 17, spell: 'Death Overs Prep', bowlingSpeedKmh: 137.8, accuracyPercent: 74, releaseConsistency: 73, fatigueIndex: 76 },
    { over: 20, spell: 'Death Over Climax', bowlingSpeedKmh: 136.2, accuracyPercent: 68, releaseConsistency: 66, fatigueIndex: 88 },
  ];

  // Batter metrics drop-off (reflexes, sprint speed, shot execution)
  const batterFatigueData = [
    { ballsFaced: 10, reflexMs: 380, boundaryConversion: 28, sprintSpeedMps: 7.8, fatigueIndex: 14 },
    { ballsFaced: 20, reflexMs: 395, boundaryConversion: 27, sprintSpeedMps: 7.5, fatigueIndex: 28 },
    { ballsFaced: 35, reflexMs: 420, boundaryConversion: 24, sprintSpeedMps: 7.1, fatigueIndex: 52 },
    { ballsFaced: 50, reflexMs: 450, boundaryConversion: 20, sprintSpeedMps: 6.6, fatigueIndex: 72 },
    { ballsFaced: 65, reflexMs: 485, boundaryConversion: 17, sprintSpeedMps: 6.2, fatigueIndex: 89 },
  ];

  // Dynamic status based on selected over
  const currentOverIndex = Math.min(20, Math.max(1, selectedInningsOver));
  const currentSpeedEstimate = (145 - currentOverIndex * 0.44).toFixed(1);
  const currentAccuracyEstimate = Math.max(62, Math.round(96 - currentOverIndex * 1.45));
  const currentReflexEstimate = Math.round(375 + currentOverIndex * 5.5);
  const fatiguePercentage = Math.min(95, Math.round((currentOverIndex / 20) * 85 + 10));

  const bowlerName = currentBowler?.name || 'Lead Fast Bowler';
  const strikerName = striker?.name || 'Active Batter (Innings Anchor)';

  return (
    <div className="rounded-2xl border border-cyan-500/30 bg-gradient-to-b from-[#03091c]/95 to-[#020510]/95 p-5 backdrop-blur-xl shadow-2xl space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-cyan-500/20 pb-3">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono font-bold text-cyan-400 uppercase tracking-wider">
            <Heart className="h-4 w-4 text-rose-400 animate-pulse" />
            <span>PLAYER FATIGUE TELEMETRY & ATHLETIC REFLEX DROP-OFF MATRIX</span>
          </div>
          <h3 className="text-base font-black text-white mt-0.5">
            Biomechanical Degradation: Bowling Accuracy vs Batting Neural Latency
          </h3>
        </div>

        <div className="flex items-center gap-2 text-xs font-mono">
          <span className="text-slate-400">Innings Phase:</span>
          <span className="px-2.5 py-1 rounded-xl bg-slate-900 border border-slate-800 text-cyan-300 font-bold">
            Over {selectedInningsOver} of 20
          </span>
        </div>
      </div>

      {/* Innings Progression Slider */}
      <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-4 space-y-2 font-mono text-xs">
        <div className="flex items-center justify-between">
          <span className="text-slate-300 font-bold flex items-center gap-1.5">
            <Clock className="h-4 w-4 text-cyan-400" />
            <span>SIMULATE INNINGS PROGRESSION OVER TIME</span>
          </span>
          <span className="text-cyan-400 font-bold">Over {selectedInningsOver}.0 ({selectedInningsOver * 6} Balls)</span>
        </div>
        <input
          type="range"
          min="1"
          max="20"
          value={selectedInningsOver}
          onChange={(e) => setSelectedInningsOver(Number(e.target.value))}
          className="w-full accent-cyan-400 cursor-pointer h-2 bg-slate-800 rounded-lg"
        />
        <div className="flex justify-between text-[10px] text-slate-500">
          <span>Overs 1-6 (Powerplay · Peak Energy)</span>
          <span>Overs 7-15 (Middle Phase · Aerobic Wear)</span>
          <span>Overs 16-20 (Death Climax · Severe Fatigue)</span>
        </div>
      </div>

      {/* Role View Filter */}
      <div className="flex items-center gap-2 text-xs font-mono">
        {[
          { id: 'combined', label: 'All Biometrics & Dynamic Duel' },
          { id: 'bowling', label: 'Bowling Accuracy & Release Drop' },
          { id: 'batting', label: 'Batting Reaction Time & Sprint' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setSelectedRoleFocus(tab.id as any)}
            className={`px-3 py-1.5 rounded-xl border transition-all cursor-pointer ${
              selectedRoleFocus === tab.id
                ? 'bg-cyan-500 text-slate-950 font-bold border-cyan-400 shadow-md shadow-cyan-500/20'
                : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Key Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs font-mono">
        {/* Metric 1: Bowling Speed */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-3.5 space-y-1">
          <span className="text-slate-400 text-[10px] uppercase block">Pace Release</span>
          <div className="flex items-baseline justify-between">
            <span className="text-xl font-black text-cyan-300">{currentSpeedEstimate} km/h</span>
            <span className="text-[10px] text-rose-400 font-bold">
              -{(currentOverIndex * 0.44).toFixed(1)} km/h
            </span>
          </div>
          <span className="text-[10px] text-slate-500 block truncate">
            {currentOverIndex > 15 ? 'Loss of steep hit-the-deck carry' : 'Peak zip and boundary carry'}
          </span>
        </div>

        {/* Metric 2: Yorker & Corridor Precision */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-3.5 space-y-1">
          <span className="text-slate-400 text-[10px] uppercase block">Corridor Accuracy</span>
          <div className="flex items-baseline justify-between">
            <span className="text-xl font-black text-emerald-400">{currentAccuracyEstimate}%</span>
            <span className="text-[10px] text-amber-400 font-bold">
              {currentAccuracyEstimate < 75 ? 'Low Slot Miss Risk' : 'High Discipline'}
            </span>
          </div>
          <span className="text-[10px] text-slate-500 block truncate">
            Yorker margin shifts from ±12cm to ±35cm
          </span>
        </div>

        {/* Metric 3: Batting Reflex Latency */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-3.5 space-y-1">
          <span className="text-slate-400 text-[10px] uppercase block">Batter Neural Reflex</span>
          <div className="flex items-baseline justify-between">
            <span className="text-xl font-black text-amber-300">{currentReflexEstimate} ms</span>
            <span className="text-[10px] text-rose-400 font-bold">
              +{Math.round(currentOverIndex * 5.5)} ms Lag
            </span>
          </div>
          <span className="text-[10px] text-slate-500 block truncate">
            {currentReflexEstimate > 440 ? 'Prone to top edges on bouncers' : 'Sharp bat-path acceleration'}
          </span>
        </div>

        {/* Metric 4: Cumulative Fatigue Index */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-3.5 space-y-1">
          <span className="text-slate-400 text-[10px] uppercase block">Cumulative Strain</span>
          <div className="flex items-baseline justify-between">
            <span className="text-xl font-black text-rose-400">{fatiguePercentage}%</span>
            <span
              className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                fatiguePercentage > 75
                  ? 'bg-rose-500/20 text-rose-300'
                  : fatiguePercentage > 45
                  ? 'bg-amber-500/20 text-amber-300'
                  : 'bg-emerald-500/20 text-emerald-300'
              }`}
            >
              {fatiguePercentage > 75 ? 'Critical' : fatiguePercentage > 45 ? 'Moderate' : 'Fresh'}
            </span>
          </div>
          <span className="text-[10px] text-slate-500 block truncate">
            Heart rate sustained at ~176 BPM
          </span>
        </div>
      </div>

      {/* Historical Fatigue Drop-off Charts */}
      <div className="rounded-xl border border-slate-800 bg-slate-950/80 p-4 space-y-3 font-mono text-xs">
        <div className="flex items-center justify-between border-b border-slate-800 pb-2">
          <span className="text-cyan-400 font-bold uppercase flex items-center gap-1.5">
            <Activity className="h-4 w-4" />
            <span>HISTORICAL INNINGS DROP-OFF CURVE (BOWLER PACE VS ACCURACY)</span>
          </span>
          <span className="text-slate-500 text-[10px]">T20 Decadal Benchmark</span>
        </div>

        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={bowlerFatigueData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="over" stroke="#64748b" tickFormatter={(v) => `Over ${v}`} />
              <YAxis yAxisId="left" stroke="#38bdf8" domain={[130, 150]} unit="km/h" />
              <YAxis yAxisId="right" orientation="right" stroke="#34d399" domain={[50, 100]} unit="%" />
              <Tooltip
                contentStyle={{ backgroundColor: '#090d16', borderColor: '#334155', borderRadius: '0.75rem' }}
                labelFormatter={(label) => `Innings Milestone: Over ${label}`}
              />
              <Legend />
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="bowlingSpeedKmh"
                name="Delivery Velocity (km/h)"
                stroke="#38bdf8"
                strokeWidth={2.5}
                dot={{ r: 4, fill: '#38bdf8' }}
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="accuracyPercent"
                name="Yorker/Corridor Accuracy (%)"
                stroke="#34d399"
                strokeWidth={2.5}
                dot={{ r: 4, fill: '#34d399' }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Tactical Coach Intelligence Note */}
      <div className="rounded-xl border border-cyan-500/20 bg-slate-900/60 p-4 space-y-2 text-xs font-mono">
        <div className="flex items-center justify-between text-white font-bold">
          <span className="flex items-center gap-1.5 text-cyan-300">
            <ShieldAlert className="h-4 w-4 text-amber-400" />
            <span>AI CAPTAIN BIO-STRATEGY RECOMMENDATION</span>
          </span>
          <span className="text-amber-400 text-[11px]">Over {selectedInningsOver} Tactical Protocol</span>
        </div>

        <p className="text-slate-300 font-sans leading-relaxed text-xs">
          {selectedInningsOver <= 6 ? (
            <>
              <strong>Powerplay High-Octane Window:</strong> Both fast bowler ({bowlerName}) and opening batter are operating with peak fast-twitch neuromuscular recruitment. Bowlers should commit to 5-6 full-length swing deliveries per over before seam degradation sets in.
            </>
          ) : selectedInningsOver <= 15 ? (
            <>
              <strong>Middle Overs Stamina Strain:</strong> Fast bowler stamina has dropped ~40%. Pace down from 144 to ~140 km/h. Introduce slow cutters and finger spin to relieve pacers. Batters have run ~1.8km in heat; exploit fatigue with quick bouncers targeting delayed 420ms pull reflexes.
            </>
          ) : (
            <>
              <strong>Death Climax Redline Alert:</strong> Bowler fatigue index exceeds 80%. Yorker accuracy drops from 94% to 68%, risking accidental full-tosses into the slot. Captain must rotate fielders from boundary sweeps to short-pitch positions to preserve sprint freshness.
            </>
          )}
        </p>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-2 border-t border-slate-800 text-[11px] text-slate-400">
          <div>Bowler Muscle Recovery: <strong className="text-cyan-400">{Math.max(20, 100 - selectedInningsOver * 4)}%</strong></div>
          <div>Batter Bat Speed: <strong className="text-emerald-400">{Math.max(118, Math.round(135 - selectedInningsOver * 0.75))} km/h</strong></div>
          <div>Injury Risk Score: <strong className={selectedInningsOver > 15 ? 'text-rose-400' : 'text-slate-300'}>{selectedInningsOver > 15 ? 'HIGH (Hamstring/Back)' : 'NORMAL'}</strong></div>
        </div>
      </div>
    </div>
  );
};
