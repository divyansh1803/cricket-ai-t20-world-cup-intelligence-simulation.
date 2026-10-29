import React from 'react';
import { Shield, Sparkles, X, Activity, Compass, Wind, Award, Zap } from 'lucide-react';
import { BallEvent, Player, Team } from '../../types/cricket';
import { CountryFlag } from '../common/CricketIdentity';
import { cricketAudio } from '../../utils/audioSystem';

interface WicketDetailItem {
  wicketNumber: number;
  scoreAtDismissal: number;
  oversAtDismissal: string;
  batter: Player;
  bowler: Player;
  batterRuns: number;
  batterBalls: number;
  dismissalType: string;
  deliverySpeedKmh: number;
  deliveryType: string;
  deliveryLength: string;
  partnershipRuns: number;
  partnershipBalls: number;
  bowlerFiguresAtDismissal: string;
  hawkeyeImpact: string;
}

interface FallOfWicketsModalProps {
  isOpen: boolean;
  onClose: () => void;
  wicketDetail: WicketDetailItem | null;
  battingTeam: Team;
  bowlingTeam: Team;
}

export const FallOfWicketsModal: React.FC<FallOfWicketsModalProps> = ({
  isOpen,
  onClose,
  wicketDetail,
  battingTeam,
  bowlingTeam,
}) => {
  if (!isOpen || !wicketDetail) return null;

  const sr = wicketDetail.batterBalls > 0
    ? ((wicketDetail.batterRuns / wicketDetail.batterBalls) * 100).toFixed(1)
    : '0.0';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg rounded-3xl border border-rose-500/40 bg-gradient-to-b from-[#0f0407] via-[#080205] to-[#020510] p-6 sm:p-7 shadow-[0_25px_60px_rgba(244,63,94,0.25)] space-y-6 text-slate-100 overflow-hidden font-mono">
        {/* Subtle background red glow */}
        <div className="absolute -top-20 -right-20 h-48 w-48 rounded-full bg-rose-500/15 blur-3xl pointer-events-none" />

        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-rose-500/20 pb-4">
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-rose-500/20 border border-rose-500/50 text-rose-400 font-black text-sm">
              W{wicketDetail.wicketNumber}
            </span>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-rose-400 font-bold uppercase tracking-wider">
                  FALL OF WICKET #{wicketDetail.wicketNumber}
                </span>
                <span className="text-slate-600">·</span>
                <span className="text-[10px] text-slate-400">
                  {wicketDetail.scoreAtDismissal}/{wicketDetail.wicketNumber} ({wicketDetail.oversAtDismissal} ov)
                </span>
              </div>
              <h3 className="text-lg font-black text-white tracking-tight">
                {wicketDetail.batter.name} Dismissed
              </h3>
            </div>
          </div>

          <button
            onClick={() => {
              onClose();
              cricketAudio.playBatHit();
            }}
            className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-800 bg-slate-900 text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* How Out Banner */}
        <div className="rounded-2xl border border-rose-500/30 bg-rose-950/40 p-4 space-y-1">
          <span className="text-[10px] text-rose-400 uppercase font-bold tracking-wider block">
            OFFICIAL DISMISSAL RECORD
          </span>
          <p className="text-base font-black text-white">
            {wicketDetail.dismissalType}
          </p>
          <p className="text-xs text-slate-300">
            b {wicketDetail.bowler.name} · {wicketDetail.deliverySpeedKmh} KM/H {wicketDetail.deliveryType}
          </p>
        </div>

        {/* Batter Contribution & Bowler Figures Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          {/* Batter Stats Card */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-slate-400 text-[10px] uppercase font-bold">BATTER RECORD</span>
              <CountryFlag countryCode={battingTeam.id} size="sm" />
            </div>
            <div className="text-white font-black text-base">{wicketDetail.batter.name}</div>
            <div className="space-y-1 text-[11px] text-slate-300">
              <div className="flex justify-between">
                <span>Runs Scored:</span>
                <strong className="text-cyan-300">{wicketDetail.batterRuns} ({wicketDetail.batterBalls} balls)</strong>
              </div>
              <div className="flex justify-between">
                <span>Strike Rate:</span>
                <strong className="text-white">{sr}</strong>
              </div>
              <div className="flex justify-between">
                <span>Team Contribution:</span>
                <strong className="text-amber-300">
                  {Math.round((wicketDetail.batterRuns / Math.max(1, wicketDetail.scoreAtDismissal)) * 100)}%
                </strong>
              </div>
            </div>
          </div>

          {/* Bowler Figures Card */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-slate-400 text-[10px] uppercase font-bold">BOWLER AT DISMISSAL</span>
              <CountryFlag countryCode={bowlingTeam.id} size="sm" />
            </div>
            <div className="text-white font-black text-base">{wicketDetail.bowler.name}</div>
            <div className="space-y-1 text-[11px] text-slate-300">
              <div className="flex justify-between">
                <span>Bowler Spell:</span>
                <strong className="text-rose-400">{wicketDetail.bowlerFiguresAtDismissal}</strong>
              </div>
              <div className="flex justify-between">
                <span>Release Speed:</span>
                <strong className="text-white">{wicketDetail.deliverySpeedKmh} KM/H</strong>
              </div>
              <div className="flex justify-between">
                <span>Delivery Pitch:</span>
                <strong className="text-cyan-400">{wicketDetail.deliveryLength}</strong>
              </div>
            </div>
          </div>
        </div>

        {/* Partnership Broken Telemetry */}
        <div className="rounded-2xl border border-slate-800/90 bg-slate-950 p-4 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-400 text-[10px] uppercase font-bold">PARTNERSHIP BROKEN</span>
            <span className="text-emerald-400 font-bold">
              {wicketDetail.partnershipRuns} runs ({wicketDetail.partnershipBalls} balls)
            </span>
          </div>

          <div className="h-2 w-full bg-slate-900 rounded-full overflow-hidden flex border border-slate-800">
            <div
              className="bg-cyan-400 h-full"
              style={{
                width: `${Math.round(
                  (wicketDetail.batterRuns / Math.max(1, wicketDetail.partnershipRuns)) * 100
                )}%`,
              }}
            />
            <div
              className="bg-blue-600 h-full"
              style={{
                width: `${100 -
                  Math.round(
                    (wicketDetail.batterRuns / Math.max(1, wicketDetail.partnershipRuns)) * 100
                  )}%`,
              }}
            />
          </div>

          <div className="flex justify-between text-[10px] text-slate-400">
            <span>{wicketDetail.batter.name}: {wicketDetail.batterRuns}r</span>
            <span>Partner: {Math.max(0, wicketDetail.partnershipRuns - wicketDetail.batterRuns)}r</span>
          </div>
        </div>

        {/* Hawk-Eye Tracking Outcome */}
        <div className="rounded-xl border border-cyan-500/25 bg-cyan-950/30 p-3 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-cyan-400" />
            <span className="text-slate-300">Hawk-Eye Trajectory:</span>
          </div>
          <span className="text-cyan-300 font-bold">{wicketDetail.hawkeyeImpact}</span>
        </div>

        {/* Footer Button */}
        <div className="flex justify-end pt-1">
          <button
            onClick={() => {
              onClose();
              cricketAudio.playBatHit();
            }}
            className="px-5 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs font-bold text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            Close Detail
          </button>
        </div>
      </div>
    </div>
  );
};
