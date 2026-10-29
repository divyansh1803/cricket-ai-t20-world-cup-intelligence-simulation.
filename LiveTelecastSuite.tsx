import React, { useMemo, useState } from 'react';
import { useMatchSimulator } from '../../context/MatchSimulatorContext';
import { PlayerCardAvatar, TeamFlag } from '../common/CricketIdentity';
import { Tv, Video, Radio, Activity, TrendingUp, Users, Eye } from 'lucide-react';

interface LiveTelecastSuiteProps {
  matchDurationFormatted?: string;
}

type CameraAngle = 'broadcast' | 'spidercam' | 'stumpcam' | 'boundary';
type CommentaryFilter = 'all' | 'boundaries' | 'wickets';

export const LiveTelecastSuite: React.FC<LiveTelecastSuiteProps> = ({
  matchDurationFormatted = '00:00',
}) => {
  const {
    runs,
    wickets,
    overs,
    maxOvers,
    target,
    runsRequired,
    ballsRemaining,
    currentRunRate,
    requiredRunRate,
    projectedScore,
    winProbability,
    liveScorecard,
    innings1Scorecard,
    innings2Scorecard,
    liveInningsNumber,
    isPlaying,
    isMatchOver,
    stadium,
    dewActive,
    lastBall,
    onInspectPlayer,
  } = useMatchSimulator();

  const [cameraAngle, setCameraAngle] = useState<CameraAngle>('broadcast');
  const [commFilter, setCommFilter] = useState<CommentaryFilter>('all');
  const [showSpeedGunHud, setShowSpeedGunHud] = useState<boolean>(true);
  const [showWinBar, setShowWinBar] = useState<boolean>(true);

  const battingTeam = liveScorecard.battingTeam;
  const bowlingTeam = liveScorecard.bowlingTeam;
  const striker = liveScorecard.strikerRow;
  const nonStriker = liveScorecard.nonStrikerRow;
  const bowler = liveScorecard.currentBowlerRow;
  const partnership = liveScorecard.activePartnership;

  // Flatten all deliveries in current innings in reverse chronological order
  const allInningsDeliveries = useMemo(() => {
    const list = liveScorecard.overSummaries.flatMap((ov) => ov.deliveries);
    return [...list].reverse();
  }, [liveScorecard.overSummaries]);

  const filteredDeliveries = useMemo(() => {
    if (commFilter === 'boundaries') {
      return allInningsDeliveries.filter(
        (b) => b.outcome === '4' || b.outcome === '6' || (b.batterRuns ?? 0) >= 4
      );
    }
    if (commFilter === 'wickets') {
      return allInningsDeliveries.filter((b) => b.isWicket);
    }
    return allInningsDeliveries;
  }, [allInningsDeliveries, commFilter]);

  // Derived ball telemetry for broadcast speed gun
  const ballTelemetry = useMemo(() => {
    if (!lastBall) {
      return {
        speedKmh: 138.4,
        speedMph: '86.0',
        rpm: 2150,
        releaseHeightM: '2.04',
        seamAngleDeg: '14°',
        lengthLabel: 'Good Length',
        deliveryType: 'Stock Seam',
        shotLabel: 'Awaiting First Ball',
        outcomeBadge: 'READY',
      };
    }
    const isSpin =
      lastBall.bowler.role === 'Spin Bowler' ||
      lastBall.bowler.bowlingStyle.toLowerCase().includes('spin') ||
      lastBall.bowler.bowlingStyle.toLowerCase().includes('orthodox') ||
      lastBall.bowler.bowlingStyle.toLowerCase().includes('legbreak');
    const rpm = isSpin
      ? Math.round(2150 + (lastBall.speedKmh % 11) * 65)
      : Math.round(1320 + (lastBall.speedKmh % 13) * 40);
    const outcomeBadge = lastBall.isWicket
      ? 'WICKET'
      : lastBall.outcome === '6'
      ? 'MAXIMUM 6'
      : lastBall.outcome === '4'
      ? 'FOUR 4'
      : `${lastBall.runsScored} RUN${lastBall.runsScored === 1 ? '' : 'S'}`;

    return {
      speedKmh: lastBall.speedKmh,
      speedMph: (lastBall.speedKmh * 0.621371).toFixed(1),
      rpm,
      releaseHeightM: isSpin ? '1.96' : '2.08',
      seamAngleDeg: isSpin ? '34° Drift' : '12° Seam',
      lengthLabel: lastBall.length,
      deliveryType: lastBall.deliveryType,
      shotLabel: lastBall.shot,
      outcomeBadge,
    };
  }, [lastBall]);

  // Projected totals at standard run rates
  const remainingOversFloat = Math.max(0, (maxOvers * 6 - liveScorecard.legalBalls) / 6);
  const projAt8 = Math.round(runs + remainingOversFloat * 8);
  const projAt10 = Math.round(runs + remainingOversFloat * 10);
  const projAt12 = Math.round(runs + remainingOversFloat * 12);

  // Worm points for SVG comparison chart
  const wormData = useMemo(() => {
    const buildPoints = (summaries: typeof innings1Scorecard.overSummaries) => {
      const pts: { over: number; runs: number; wickets: number }[] = [{ over: 0, runs: 0, wickets: 0 }];
      summaries.forEach((ov) => {
        pts.push({
          over: ov.overNumber,
          runs: ov.cumulativeRuns,
          wickets: ov.wicketsInOver,
        });
      });
      return pts;
    };
    const inn1 = buildPoints(innings1Scorecard.overSummaries);
    const inn2 = buildPoints(innings2Scorecard.overSummaries);
    const maxY = Math.max(
      stadium.avgFirstInningsScore || 180,
      ...inn1.map((p) => p.runs),
      ...inn2.map((p) => p.runs),
      160
    );
    return { inn1, inn2, maxY };
  }, [innings1Scorecard.overSummaries, innings2Scorecard.overSummaries, stadium.avgFirstInningsScore]);

  return (
    <section
      aria-label="Simulated Live Telecast Studio"
      className="rounded-3xl border border-cyan-500/35 bg-[#040a17] p-4 sm:p-6 space-y-5 shadow-2xl"
    >
      {/* Top Broadcast Network Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-slate-800 pb-4">
        <div className="flex flex-wrap items-center gap-2.5 text-xs font-mono">
          <span className="inline-flex items-center gap-1.5 font-bold text-cyan-300">
            <Tv className="h-4 w-4 text-cyan-400" />
            <span>LIVE TELECAST STUDIO</span>
          </span>
          <span className="text-slate-600" aria-hidden="true">·</span>
          <span className="text-slate-300">
            {isMatchOver
              ? 'Full-Time Wrap'
              : isPlaying
              ? 'Simulated Feed Streaming'
              : 'Interactive Feed Ready'}
          </span>
          <span className="text-slate-600" aria-hidden="true">·</span>
          <span className="text-slate-400 tabular-nums">
            {stadium.name} · Clock {matchDurationFormatted}
          </span>
        </div>

        {/* Multi-Camera Switcher + HUD Toggles */}
        <div className="flex flex-wrap items-center gap-1.5">
          {(
            [
              { id: 'broadcast', label: 'Cam 1: Broadcast Main' },
              { id: 'spidercam', label: 'Cam 2: Spidercam 360°' },
              { id: 'stumpcam', label: 'Cam 3: Stump Mic & Crease' },
              { id: 'boundary', label: 'Cam 4: Boundary Rope' },
            ] as const
          ).map((cam) => (
            <button
              key={cam.id}
              type="button"
              onClick={() => setCameraAngle(cam.id)}
              className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[11px] font-mono font-bold transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                cameraAngle === cam.id
                  ? 'bg-cyan-400 text-slate-950'
                  : 'border border-slate-800 bg-slate-900 text-slate-300 hover:text-white'
              }`}
            >
              <Video className="h-3 w-3" />
              <span>{cam.label}</span>
            </button>
          ))}

          <button
            type="button"
            onClick={() => setShowSpeedGunHud((v) => !v)}
            className={`rounded-lg px-2.5 py-1.5 text-[11px] font-mono font-semibold transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
              showSpeedGunHud
                ? 'border border-amber-400/50 bg-amber-400/15 text-amber-300'
                : 'border border-slate-800 bg-slate-900 text-slate-400'
            }`}
          >
            Speed Gun
          </button>

          <button
            type="button"
            onClick={() => setShowWinBar((v) => !v)}
            className={`rounded-lg px-2.5 py-1.5 text-[11px] font-mono font-semibold transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
              showWinBar
                ? 'border border-emerald-400/50 bg-emerald-400/15 text-emerald-300'
                : 'border border-slate-800 bg-slate-900 text-slate-400'
            }`}
          >
            Win Predictor
          </button>
        </div>
      </div>

      {/* Main Broadcast Feed + Right Telemetry Rail */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
        {/* LEFT 7 COLS: Interactive Multi-Angle Broadcast Monitor */}
        <div className="lg:col-span-7 rounded-2xl border border-slate-800 bg-slate-950 p-4 flex flex-col justify-between space-y-4">
          {/* Camera Monitor Viewport */}
          <div className="relative rounded-xl border border-slate-800/90 bg-gradient-to-b from-[#07162c] via-[#07261f] to-[#051814] p-3 overflow-hidden">
            {/* Top Corner TV Network Bug */}
            <div className="flex items-center justify-between text-[11px] font-mono text-slate-200 mb-2">
              <div className="flex items-center gap-2">
                <TeamFlag code={battingTeam.id} size="xs" />
                <span className="font-bold text-white tabular-nums">
                  {battingTeam.shortName} {runs}/{wickets} ({overs})
                </span>
                {target !== null && (
                  <span className="text-amber-300 tabular-nums">
                    · Need {runsRequired} off {ballsRemaining}b
                  </span>
                )}
              </div>
              <span className="text-[10px] text-cyan-300 uppercase">
                {cameraAngle === 'broadcast'
                  ? 'End-On Sightscreen Feed'
                  : cameraAngle === 'spidercam'
                  ? 'Aerial Cable Feed · 42m'
                  : cameraAngle === 'stumpcam'
                  ? 'Middle-Stump Micro-Cam'
                  : `Boundary Rope · ${stadium.boundarySizeMeters.straight}m`}
              </span>
            </div>

            {/* Dynamic Multi-Angle SVG Feed */}
            <svg viewBox="0 0 520 220" className="w-full h-48 sm:h-56 select-none">
              {cameraAngle === 'broadcast' && (
                <>
                  {/* Stadium Floodlight Horizon & Outfield */}
                  <ellipse cx="260" cy="155" rx="245" ry="62" fill="#064e3b" opacity="0.55" />
                  <ellipse cx="260" cy="155" rx="165" ry="42" fill="none" stroke="#a7f3d0" strokeOpacity="0.25" strokeDasharray="4 4" />
                  {/* Perspective 22-Yard Pitch Strip */}
                  <polygon points="232,68 288,68 326,204 194,204" fill="#b48a54" opacity="0.88" />
                  <line x1="224" y1="84" x2="296" y2="84" stroke="#f8fafc" strokeWidth="1.5" />
                  <line x1="204" y1="184" x2="316" y2="184" stroke="#f8fafc" strokeWidth="2" />
                  {/* Stumps both ends */}
                  <rect x="255" y="54" width="10" height="16" fill="#fde68a" />
                  <rect x="252" y="168" width="16" height="20" fill="#fef3c7" />
                  {/* Pitch Length Zone & Ball Path */}
                  {(() => {
                    const pitchY =
                      lastBall?.length === 'Yorker'
                        ? 176
                        : lastBall?.length === 'Full'
                        ? 160
                        : lastBall?.length === 'Bouncer'
                        ? 118
                        : lastBall?.length === 'Short of Length'
                        ? 132
                        : 146;
                    const shotEndX =
                      lastBall?.outcome === '6'
                        ? 445
                        : lastBall?.outcome === '4'
                        ? 90
                        : lastBall?.isWicket
                        ? 260
                        : 375;
                    const shotEndY = lastBall?.outcome === '6' ? 38 : 138;
                    return (
                      <>
                        <path
                          d={`M 266 64 Q 262 110 258 ${pitchY}`}
                          fill="none"
                          stroke="#38bdf8"
                          strokeWidth="2.5"
                        />
                        <circle cx="258" cy={pitchY} r="4.5" fill="#fbbf24" />
                        <path
                          d={`M 258 ${pitchY} Q 315 ${Math.min(pitchY, shotEndY) - 18} ${shotEndX} ${shotEndY}`}
                          fill="none"
                          stroke={lastBall?.isWicket ? '#fb7185' : '#34d399'}
                          strokeWidth="2.5"
                          strokeDasharray={lastBall ? undefined : '4 4'}
                        />
                        <text x="16" y="210" fill="#cbd5e1" fontSize="10" fontFamily="monospace">
                          Pitch Map: {ballTelemetry.lengthLabel} · {ballTelemetry.deliveryType}
                        </text>
                      </>
                    );
                  })()}
                </>
              )}

              {cameraAngle === 'spidercam' && (
                <>
                  {/* Top-Down 360° Ground */}
                  <circle cx="260" cy="110" r="98" fill="#064e3b" opacity="0.65" stroke="#34d399" strokeWidth="1.5" />
                  <circle cx="260" cy="110" r="52" fill="none" stroke="#cbd5e1" strokeOpacity="0.4" strokeDasharray="4 3" />
                  <rect x="253" y="88" width="14" height="44" rx="2" fill="#c29b61" />
                  {/* Recent Innings Wagon Vectors */}
                  {allInningsDeliveries.slice(0, 14).map((b, idx) => {
                    const angle = ((idx * 47 + b.runsScored * 29) % 360) * (Math.PI / 180);
                    const dist = b.outcome === '6' ? 94 : b.outcome === '4' ? 88 : 28 + b.runsScored * 16;
                    const x2 = 260 + Math.cos(angle) * dist;
                    const y2 = 110 + Math.sin(angle) * dist;
                    const stroke = b.outcome === '6' ? '#fbbf24' : b.outcome === '4' ? '#38bdf8' : '#94a3b8';
                    return (
                      <line
                        key={b.eventId || idx}
                        x1="260"
                        y1="104"
                        x2={x2}
                        y2={y2}
                        stroke={stroke}
                        strokeWidth={b.runsScored >= 4 ? 2.2 : 1.2}
                        opacity={0.85}
                      />
                    );
                  })}
                  <text x="16" y="210" fill="#cbd5e1" fontSize="10" fontFamily="monospace">
                    Spidercam Live Wagon Vectors · Straight {stadium.boundarySizeMeters.straight}m / Square {stadium.boundarySizeMeters.square}m
                  </text>
                </>
              )}

              {cameraAngle === 'stumpcam' && (
                <>
                  {/* Close-up 3 Stumps + Bail Groove + UltraEdge Waveform */}
                  <rect x="226" y="54" width="10" height="126" rx="3" fill="#fde68a" />
                  <rect x="255" y="54" width="10" height="126" rx="3" fill="#fde68a" />
                  <rect x="284" y="54" width="10" height="126" rx="3" fill="#fde68a" />
                  <rect x="226" y="48" width="32" height="5" rx="2" fill="#f59e0b" />
                  <rect x="262" y="48" width="32" height="5" rx="2" fill="#f59e0b" />
                  <circle
                    cx={lastBall?.isWicket ? 260 : 212}
                    cy={lastBall?.length === 'Bouncer' ? 42 : 86}
                    r="9"
                    fill="#ef4444"
                    stroke="#ffffff"
                    strokeWidth="1.5"
                  />
                  {/* Stump Mic Audio Waveform */}
                  <polyline
                    fill="none"
                    stroke="#22d3ee"
                    strokeWidth="1.8"
                    points="24,195 60,195 85,193 110,196 135,190 155,198 178,162 186,208 194,172 204,196 240,195 310,195 360,194 420,195 496,195"
                  />
                  <text x="24" y="32" fill="#67e8f9" fontSize="10" fontFamily="monospace">
                    Stump Mic Active · Release {ballTelemetry.releaseHeightM}m · {ballTelemetry.seamAngleDeg}
                  </text>
                </>
              )}

              {cameraAngle === 'boundary' && (
                <>
                  {/* Panoramic Crowd Tiers & Boundary Rope Cushion */}
                  <rect x="12" y="24" width="496" height="68" rx="8" fill="#0f172a" stroke="#1e293b" />
                  <line x1="12" y1="148" x2="508" y2="148" stroke="#f59e0b" strokeWidth="4" />
                  <text x="24" y="54" fill="#f8fafc" fontSize="12" fontFamily="monospace" fontWeight="bold">
                    {stadium.name} · Capacity {stadium.capacity.toLocaleString()}
                  </text>
                  <text x="24" y="74" fill="#94a3b8" fontSize="10" fontFamily="monospace">
                    Dew State: {dewActive ? `${stadium.dewFactor} Evening Dew` : 'Dry Turf'} · Pitch: {stadium.pitchType}
                  </text>
                  <path
                    d="M 48 184 Q 250 64 452 146"
                    fill="none"
                    stroke="#34d399"
                    strokeWidth="2.5"
                  />
                  <text x="24" y="204" fill="#cbd5e1" fontSize="10" fontFamily="monospace">
                    Boundary Cushion Cam · Straight {stadium.boundarySizeMeters.straight}m · Square {stadium.boundarySizeMeters.square}m
                  </text>
                </>
              )}
            </svg>

            {/* Speed-Gun & Release Telemetry Overlay Strip */}
            {showSpeedGunHud && (
              <div className="mt-2 grid grid-cols-2 sm:grid-cols-4 gap-2 rounded-xl border border-slate-800 bg-slate-950/90 p-2.5 font-mono text-xs tabular-nums">
                <div>
                  <span className="text-[10px] text-slate-400 block">SPEED GUN</span>
                  <strong className="text-cyan-300 text-sm">
                    {ballTelemetry.speedKmh} km/h ({ballTelemetry.speedMph} mph)
                  </strong>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block">REV COUNTER</span>
                  <strong className="text-white text-sm">{ballTelemetry.rpm} RPM</strong>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block">DELIVERY / LENGTH</span>
                  <strong className="text-amber-300 text-xs truncate block">
                    {ballTelemetry.deliveryType} · {ballTelemetry.lengthLabel}
                  </strong>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block">SHOT & RESULT</span>
                  <strong className="text-emerald-400 text-xs truncate block">
                    {ballTelemetry.outcomeBadge} · {ballTelemetry.shotLabel}
                  </strong>
                </div>
              </div>
            )}
          </div>

          {/* Clickable Broadcast Lower-Third Player Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 font-mono text-xs tabular-nums">
            {striker && (
              <button
                type="button"
                onClick={() => onInspectPlayer && onInspectPlayer(striker.player)}
                className="flex items-center gap-2.5 rounded-xl border border-slate-800 bg-slate-900/80 p-2.5 text-left hover:border-cyan-400/60 transition-colors cursor-pointer"
              >
                <PlayerCardAvatar
                  playerId={striker.player.id}
                  name={striker.player.name}
                  countryCode={striker.player.countryCode}
                  imageUrl={striker.player.imageUrl}
                  size="sm"
                />
                <div className="min-w-0">
                  <span className="text-[10px] text-cyan-400 block">STRIKER *</span>
                  <strong className="text-white truncate block">{striker.player.name}</strong>
                  <span className="text-slate-300 text-[11px]">
                    {striker.runs} ({striker.balls}) · SR {striker.strikeRate.toFixed(1)}
                  </span>
                </div>
              </button>
            )}

            {nonStriker && (
              <button
                type="button"
                onClick={() => onInspectPlayer && onInspectPlayer(nonStriker.player)}
                className="flex items-center gap-2.5 rounded-xl border border-slate-800 bg-slate-900/80 p-2.5 text-left hover:border-cyan-400/60 transition-colors cursor-pointer"
              >
                <PlayerCardAvatar
                  playerId={nonStriker.player.id}
                  name={nonStriker.player.name}
                  countryCode={nonStriker.player.countryCode}
                  imageUrl={nonStriker.player.imageUrl}
                  size="sm"
                />
                <div className="min-w-0">
                  <span className="text-[10px] text-slate-400 block">NON-STRIKER</span>
                  <strong className="text-white truncate block">{nonStriker.player.name}</strong>
                  <span className="text-slate-300 text-[11px]">
                    {nonStriker.runs} ({nonStriker.balls}) · 4s:{nonStriker.fours} 6s:{nonStriker.sixes}
                  </span>
                </div>
              </button>
            )}

            {bowler && (
              <button
                type="button"
                onClick={() => onInspectPlayer && onInspectPlayer(bowler.player)}
                className="flex items-center gap-2.5 rounded-xl border border-slate-800 bg-slate-900/80 p-2.5 text-left hover:border-amber-400/60 transition-colors cursor-pointer"
              >
                <PlayerCardAvatar
                  playerId={bowler.player.id}
                  name={bowler.player.name}
                  countryCode={bowler.player.countryCode}
                  imageUrl={bowler.player.imageUrl}
                  size="sm"
                />
                <div className="min-w-0">
                  <span className="text-[10px] text-amber-400 block">BOWLER</span>
                  <strong className="text-white truncate block">{bowler.player.name}</strong>
                  <span className="text-slate-300 text-[11px]">
                    {bowler.wickets}/{bowler.runsConceded} ({bowler.overs}) · Econ {bowler.economy.toFixed(1)}
                  </span>
                </div>
              </button>
            )}
          </div>
        </div>

        {/* RIGHT 5 COLS: Broadcast Analytics, Score Worm, Partnership & Live Commentary */}
        <div className="lg:col-span-5 flex flex-col justify-between gap-4">
          {/* Win Predictor + Projected Score Table */}
          <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4 space-y-3 font-mono text-xs tabular-nums">
            {showWinBar && (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-cyan-300 font-bold">
                    {battingTeam.shortName} Win {Math.round(winProbability)}%
                  </span>
                  <span className="text-slate-400 text-[10px]">Modelled Win Index</span>
                  <span className="text-amber-300 font-bold">
                    {bowlingTeam.shortName} Win {Math.max(0, 100 - Math.round(winProbability))}%
                  </span>
                </div>
                <div className="h-2 rounded-full bg-slate-900 overflow-hidden flex">
                  <div
                    className="bg-cyan-400 transition-all duration-200"
                    style={{ width: `${Math.min(100, Math.max(0, winProbability))}%` }}
                  />
                  <div
                    className="bg-amber-400 transition-all duration-200"
                    style={{ width: `${Math.max(0, 100 - winProbability)}%` }}
                  />
                </div>
              </div>
            )}

            <div className="grid grid-cols-4 gap-2 pt-1">
              <div className="rounded-lg border border-slate-800 bg-slate-900/70 p-2">
                <span className="text-[9px] text-slate-400 block">CRR / RRR</span>
                <strong className="text-white">
                  {currentRunRate.toFixed(1)}
                  {liveInningsNumber === 2 ? ` / ${requiredRunRate.toFixed(1)}` : ''}
                </strong>
              </div>
              <div className="rounded-lg border border-slate-800 bg-slate-900/70 p-2">
                <span className="text-[9px] text-slate-400 block">PROJECTED</span>
                <strong className="text-cyan-300">{projectedScore}</strong>
              </div>
              <div className="rounded-lg border border-slate-800 bg-slate-900/70 p-2">
                <span className="text-[9px] text-slate-400 block">AT 10 RPO</span>
                <strong className="text-emerald-400">{projAt10}</strong>
              </div>
              <div className="rounded-lg border border-slate-800 bg-slate-900/70 p-2">
                <span className="text-[9px] text-slate-400 block">AT 8 / 12</span>
                <strong className="text-slate-200">
                  {projAt8}/{projAt12}
                </strong>
              </div>
            </div>

            {/* Active Partnership Bar */}
            {partnership && (
              <div className="border-t border-slate-800 pt-2.5 space-y-1">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-slate-400 flex items-center gap-1">
                    <Users className="h-3 w-3 text-cyan-400" />
                    <span>Partnership</span>
                  </span>
                  <strong className="text-white">
                    {partnership.totalRuns} runs ({partnership.totalBalls}b · RR {partnership.runRate.toFixed(1)})
                  </strong>
                </div>
                <div className="flex items-center justify-between text-[10px] text-slate-400">
                  <span>
                    {partnership.batterA.name.split(' ').pop()}: {partnership.batterARuns} ({partnership.batterABalls})
                  </span>
                  <span>Extras: {partnership.extras}</span>
                  <span>
                    {partnership.batterB.name.split(' ').pop()}: {partnership.batterBRuns} ({partnership.batterBBalls})
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Broadcast Innings Score Worm */}
          <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4 space-y-2">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="font-bold text-white flex items-center gap-1.5">
                <TrendingUp className="h-3.5 w-3.5 text-cyan-400" />
                <span>Innings Comparison Worm</span>
              </span>
              <div className="flex items-center gap-3 text-[10px]">
                <span className="text-cyan-300">1st Inn ({innings1Scorecard.battingTeam.shortName})</span>
                <span className="text-amber-300">2nd Inn ({innings2Scorecard.battingTeam.shortName})</span>
              </div>
            </div>
            <svg viewBox="0 0 320 88" className="w-full h-20">
              <line x1="24" y1="74" x2="308" y2="74" stroke="#1e293b" strokeWidth="1" />
              <line x1="24" y1="12" x2="24" y2="74" stroke="#1e293b" strokeWidth="1" />
              {(() => {
                const toPolyline = (pts: { over: number; runs: number }[]) =>
                  pts
                    .map((p) => {
                      const x = 24 + (p.over / Math.max(1, maxOvers)) * 280;
                      const y = 74 - (p.runs / wormData.maxY) * 60;
                      return `${x.toFixed(1)},${y.toFixed(1)}`;
                    })
                    .join(' ');
                return (
                  <>
                    <polyline
                      fill="none"
                      stroke="#38bdf8"
                      strokeWidth="2"
                      points={toPolyline(wormData.inn1)}
                    />
                    {wormData.inn2.length > 1 && (
                      <polyline
                        fill="none"
                        stroke="#fbbf24"
                        strokeWidth="2"
                        points={toPolyline(wormData.inn2)}
                      />
                    )}
                    {wormData.inn1
                      .filter((p) => p.wickets > 0)
                      .map((p) => (
                        <circle
                          key={`w1-${p.over}`}
                          cx={24 + (p.over / Math.max(1, maxOvers)) * 280}
                          cy={74 - (p.runs / wormData.maxY) * 60}
                          r="3"
                          fill="#fb7185"
                        />
                      ))}
                  </>
                );
              })()}
            </svg>
          </div>

          {/* Filterable Live Commentary Feed */}
          <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4 space-y-2.5 flex-1">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-mono font-bold text-white flex items-center gap-1.5">
                <Radio className="h-3.5 w-3.5 text-amber-400" />
                <span>Telecast Commentary</span>
              </span>
              <div className="flex items-center gap-1 text-[10px] font-mono">
                {(
                  [
                    { id: 'all', label: 'All' },
                    { id: 'boundaries', label: '4s & 6s' },
                    { id: 'wickets', label: 'Wickets' },
                  ] as const
                ).map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setCommFilter(f.id)}
                    className={`rounded-md px-2 py-0.5 font-bold cursor-pointer ${
                      commFilter === f.id
                        ? 'bg-cyan-400 text-slate-950'
                        : 'bg-slate-900 text-slate-400 hover:text-white'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="max-h-36 overflow-y-auto space-y-1.5 pr-1">
              {filteredDeliveries.length === 0 ? (
                <p className="text-xs text-slate-400 font-mono py-3">
                  {allInningsDeliveries.length === 0
                    ? 'Press AUTOPLAY or NEXT BALL to stream live ball-by-ball telecast commentary.'
                    : 'No deliveries match this filter yet in the current innings.'}
                </p>
              ) : (
                filteredDeliveries.slice(0, 8).map((b, i) => (
                  <div
                    key={b.eventId || `${b.overNumber}-${b.ballInOver}-${i}`}
                    className="flex items-start gap-2.5 border-b border-slate-900 pb-1.5 text-xs"
                  >
                    <span className="font-mono font-bold text-cyan-300 tabular-nums shrink-0">
                      {b.overNumber}.{b.ballInOver}
                    </span>
                    <span
                      className={`font-mono font-black px-1.5 rounded text-[10px] shrink-0 tabular-nums ${
                        b.isWicket
                          ? 'bg-rose-500/20 text-rose-300'
                          : b.outcome === '6'
                          ? 'bg-amber-400/20 text-amber-300'
                          : b.outcome === '4'
                          ? 'bg-emerald-400/20 text-emerald-300'
                          : 'bg-slate-800 text-slate-300'
                      }`}
                    >
                      {b.displayToken || b.outcome}
                    </span>
                    <p className="text-slate-300 leading-snug line-clamp-2">{b.commentary}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
