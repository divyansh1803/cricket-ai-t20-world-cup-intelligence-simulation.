import React from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
  ReferenceArea,
} from 'recharts';
import { TrendingUp, Zap, AlertTriangle, ShieldCheck, Activity } from 'lucide-react';
import { BallEvent } from '../../types/cricket';

interface MatchMomentumOverlayProps {
  history: BallEvent[];
  teamAName: string;
  teamBName: string;
  currentOver: number;
  currentScore: number;
  target?: number;
  isSecondInnings?: boolean;
}

interface OverMomentumPoint {
  over: number;
  crr: number; // Current Run Rate
  rrr: number; // Required Run Rate
  runsInOver: number;
  wicketsInOver: number;
  momentumScore: number; // 0-100%
  phase: 'powerplay' | 'middle' | 'death';
}

export const MatchMomentumOverlay: React.FC<MatchMomentumOverlayProps> = ({
  history,
  teamAName,
  teamBName,
  currentOver,
  currentScore,
  target = 186,
  isSecondInnings = true,
}) => {
  // Aggregate history by overs to compute CRR vs RRR progression
  const totalOvers = 20;

  // Build over-by-over points
  const data: OverMomentumPoint[] = [];

  // If match has history, group by over
  const ballsByOver: { [over: number]: BallEvent[] } = {};
  history.forEach((ball) => {
    const o = ball.overNumber !== undefined ? ball.overNumber : Math.floor((ball.totalBalls || 0) / 6);
    if (!ballsByOver[o]) ballsByOver[o] = [];
    ballsByOver[o].push(ball);
  });

  let runningRuns = 0;
  const maxOversToShow = Math.max(1, Math.min(totalOvers, Math.ceil(currentOver) || 6));

  for (let o = 1; o <= maxOversToShow; o++) {
    const overBalls = ballsByOver[o - 1] || [];
    const runsThisOver = overBalls.reduce((acc, b) => acc + (b.runsScored || 0), 0);
    const wktsThisOver = overBalls.filter((b) => b.isWicket).length;
    runningRuns += runsThisOver;

    const crr = Number((runningRuns / o).toFixed(2));

    const remainingOvers = Math.max(0.1, totalOvers - o);
    const runsNeeded = Math.max(0, target - runningRuns);
    const rrr = isSecondInnings ? Number((runsNeeded / remainingOvers).toFixed(2)) : Number((target / totalOvers).toFixed(2));

    // Momentum score: higher CRR compared to RRR yields higher momentum
    const ratio = rrr > 0 ? crr / rrr : 1;
    const momentum = Math.min(98, Math.max(12, Math.round(ratio * 50)));

    const phase = o <= 6 ? 'powerplay' : o <= 15 ? 'middle' : 'death';

    data.push({
      over: o,
      crr,
      rrr,
      runsInOver: runsThisOver,
      wicketsInOver: wktsThisOver,
      momentumScore: momentum,
      phase,
    });
  }

  // Fallback points if early in match
  if (data.length < 3) {
    const baselineCRR = currentOver > 0 ? currentScore / currentOver : 8.4;
    for (let o = data.length + 1; o <= 6; o++) {
      const remaining = totalOvers - o;
      const simRuns = Math.round(baselineCRR * o);
      data.push({
        over: o,
        crr: Number(baselineCRR.toFixed(2)),
        rrr: Number(((target - simRuns) / remaining).toFixed(2)),
        runsInOver: Math.round(baselineCRR),
        wicketsInOver: 0,
        momentumScore: 54,
        phase: o <= 6 ? 'powerplay' : 'middle',
      });
    }
  }

  const latest = data[data.length - 1];
  const isChasingAhead = latest ? latest.crr >= latest.rrr : true;
  const runRateDelta = latest ? Number((latest.crr - latest.rrr).toFixed(2)) : 0;

  return (
    <div className="rounded-2xl border border-cyan-500/30 bg-gradient-to-b from-[#03091c]/95 to-[#020510]/95 p-5 backdrop-blur-xl shadow-2xl space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-cyan-500/20 pb-3">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono font-bold text-cyan-400 uppercase tracking-wider">
            <Activity className="h-4 w-4 animate-pulse" />
            <span>MATCH MOMENTUM & RUN RATE VECTOR (RECHARTS DUAL-LINE)</span>
          </div>
          <h3 className="text-base font-black text-white mt-0.5">
            Current Innings Run Rate (CRR) vs Required Run Rate (RRR)
          </h3>
        </div>

        {/* Momentum Status Pill */}
        <div
          className={`px-3 py-1.5 rounded-xl border text-xs font-mono font-bold flex items-center gap-1.5 ${
            isChasingAhead
              ? 'border-emerald-500/40 bg-emerald-500/15 text-emerald-300'
              : 'border-rose-500/40 bg-rose-500/15 text-rose-300'
          }`}
        >
          {isChasingAhead ? (
            <>
              <ShieldCheck className="h-4 w-4 text-emerald-400" />
              <span>{teamAName} IN DRIVER'S SEAT (+{runRateDelta} RPO)</span>
            </>
          ) : (
            <>
              <AlertTriangle className="h-4 w-4 text-rose-400" />
              <span>PRESSURE BUILDING ({runRateDelta} RPO)</span>
            </>
          )}
        </div>
      </div>

      {/* Mini Telemetry Pills */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
        <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-2.5">
          <span className="text-[10px] text-slate-400 block">CURRENT RUN RATE (CRR)</span>
          <strong className="text-sm font-black text-cyan-400">{latest?.crr || '0.00'} rpo</strong>
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-2.5">
          <span className="text-[10px] text-slate-400 block">REQUIRED RUN RATE (RRR)</span>
          <strong className="text-sm font-black text-amber-400">{latest?.rrr || '0.00'} rpo</strong>
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-2.5">
          <span className="text-[10px] text-slate-400 block">CHASE TARGET</span>
          <strong className="text-sm font-black text-white">{target} Runs (20 Ov)</strong>
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-2.5">
          <span className="text-[10px] text-slate-400 block">CURRENT MOMENTUM INDEX</span>
          <strong className="text-sm font-black text-emerald-400">{latest?.momentumScore || 50}% Pace</strong>
        </div>
      </div>

      {/* Recharts Dual-Line Momentum Chart with Background Reference Zones */}
      <div className="h-64 w-full rounded-2xl border border-slate-800/80 bg-slate-950/70 p-2 pt-4">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
            <CartesianGrid stroke="#1e293b" strokeDasharray="3 3" />
            <XAxis
              dataKey="over"
              stroke="#64748b"
              tick={{ fontSize: 11, fill: '#94a3b8' }}
              tickFormatter={(v) => `Ov ${v}`}
            />
            <YAxis
              stroke="#64748b"
              tick={{ fontSize: 11, fill: '#94a3b8' }}
              domain={[4, (dataMax: number) => Math.max(14, Math.ceil(dataMax + 2))]}
            />
            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const pt = payload[0].payload as OverMomentumPoint;
                  return (
                    <div className="rounded-xl border border-cyan-500/40 bg-slate-950/95 p-3 text-xs font-mono space-y-1 shadow-xl">
                      <span className="text-slate-400 block font-bold">OVER {pt.over} TIMELINE:</span>
                      <div className="text-cyan-400 font-bold">Innings CRR: {pt.crr} rpo</div>
                      <div className="text-amber-400 font-bold">Required RRR: {pt.rrr} rpo</div>
                      <div className="text-slate-300">Runs in Over: {pt.runsInOver} runs</div>
                      {pt.wicketsInOver > 0 && (
                        <div className="text-rose-400 font-bold">Wickets: {pt.wicketsInOver} ❌</div>
                      )}
                      <div className="text-emerald-400 pt-1 border-t border-slate-800">
                        Momentum: {pt.momentumScore}% Favor
                      </div>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Legend
              wrapperStyle={{ fontSize: 12, fontFamily: 'monospace', paddingTop: 6 }}
              iconType="circle"
            />

            {/* Shaded Momentum Zones: Powerplay (Ov 1-6), Middle (Ov 7-15), Death (Ov 16-20) */}
            <ReferenceArea
              x1={1}
              x2={6}
              fill="rgba(6, 182, 212, 0.06)"
              strokeOpacity={0}
              label={{ value: 'POWERPLAY', fill: '#06b6d4', fontSize: 10, position: 'insideTopLeft' }}
            />
            <ReferenceArea
              x1={6}
              x2={15}
              fill="rgba(168, 85, 247, 0.04)"
              strokeOpacity={0}
              label={{ value: 'MIDDLE STRANGLE', fill: '#a855f7', fontSize: 10, position: 'insideTopLeft' }}
            />
            <ReferenceArea
              x1={15}
              x2={20}
              fill="rgba(244, 63, 94, 0.05)"
              strokeOpacity={0}
              label={{ value: 'DEATH CRUNCH', fill: '#f43f5e', fontSize: 10, position: 'insideTopLeft' }}
            />

            {/* Dual Lines */}
            <Line
              type="monotone"
              dataKey="crr"
              name="Innings Run Rate (CRR)"
              stroke="#06b6d4"
              strokeWidth={3}
              dot={{ fill: '#06b6d4', r: 4 }}
              activeDot={{ r: 6, fill: '#ffffff', stroke: '#06b6d4', strokeWidth: 2 }}
            />
            <Line
              type="monotone"
              dataKey="rrr"
              name="Required Run Rate (RRR)"
              stroke="#f59e0b"
              strokeWidth={2.5}
              strokeDasharray="4 4"
              dot={{ fill: '#f59e0b', r: 3 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Footer Info */}
      <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 pt-1">
        <span className="flex items-center gap-1.5">
          <Zap className="h-3 w-3 text-cyan-400" />
          <span>Dynamically recalculated on every ball delivery</span>
        </span>
        <span className="text-emerald-400 font-bold">
          {latest && latest.crr >= latest.rrr ? 'Momentum: BATTING COMMAND' : 'Momentum: DEFENDING CHOKE'}
        </span>
      </div>
    </div>
  );
};
