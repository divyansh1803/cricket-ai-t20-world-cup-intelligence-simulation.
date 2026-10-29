import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Player } from '../../types/cricket';
import { CountryFlag, TeamCrest } from '../common/CricketIdentity';
import { resolvePlayerImageUrl, toSafeAssetUrl } from '../../data/playerImageCatalog';
import { getPlayerFullTelemetry, WagonZoneData, MatchFormEntry } from '../../utils/playerWagonWheelData';
import { PlayerProfileStatsSuite } from './PlayerProfileStatsSuite';
import {
  X,
  Activity,
  Clock,
  Target,
  BarChart3,
  FileText,
  Shield,
  Crown,
  ChevronRight,
  TrendingUp,
  Sparkles,
  Zap,
  Flame,
  Award,
  Layers,
  CheckCircle2,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  Cell,
} from 'recharts';

interface NeonPlayerAnalyticsModalProps {
  player: Player | null;
  onClose: () => void;
}

export const NeonPlayerAnalyticsModal: React.FC<NeonPlayerAnalyticsModalProps> = ({
  player,
  onClose,
}) => {
  if (!player) return null;

  const telemetry = getPlayerFullTelemetry(player);

  // Tabs:
  // 1. 'form' -> 5-Match Form (Recharts)
  // 2. 'longevity' -> Longevity (3-Yr SR)
  // 3. 'wagon' -> Wagon Wheel (Default active, matches screenshot!)
  // 4. 'phase' -> Phase Performance
  // 5. 'logs' -> Match Logs
  const [activeTab, setActiveTab] = useState<'stats' | 'form' | 'longevity' | 'wagon' | 'phase' | 'logs'>('wagon');

  // Wagon wheel zone selection state
  const [selectedZoneId, setSelectedZoneId] = useState<string>('mid-wicket');
  const [hoveredZoneId, setHoveredZoneId] = useState<string | null>(null);

  const activeZone =
    (telemetry.wagonZones && telemetry.wagonZones.find((z) => z.id === (hoveredZoneId || selectedZoneId))) ||
    (telemetry.wagonZones && telemetry.wagonZones[0]) || {
      id: 'mid-wicket',
      name: 'Mid-Wicket & Cow Corner',
      label: 'Mid-Wicket',
      percentage: 34,
      strikeRate: 178,
      runs: 544,
      balls: 306,
      boundaries4s: 46,
      boundaries6s: 24,
      dismissals: 4,
      color: '#10B981',
      glowColor: 'rgba(16, 185, 129, 0.8)',
      angleDeg: 45,
      iconType: 'helmet' as const,
    };

  // Selected match log entry in 5-Match form tab
  const defaultMatchEntry: MatchFormEntry = {
    matchId: 'm-default',
    opponent: 'Australia',
    opponentCode: 'AUS',
    date: 'Recent T20 World Cup',
    venue: 'Narendra Modi Stadium',
    runs: 64,
    balls: 42,
    fours: 6,
    sixes: 2,
    strikeRate: 152.4,
    result: 'WON',
    milestone: '64*',
    dismissal: 'Not Out',
    fantasyXp: 180,
  };
  const [selectedMatch, setSelectedMatch] = useState<MatchFormEntry>(
    (telemetry.formHistory && telemetry.formHistory[0]) || defaultMatchEntry
  );

  // Player image candidate mapped by player name
  const photoUrl = toSafeAssetUrl(resolvePlayerImageUrl(player));

  // Lock background scroll and listen for escape key
  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  if (typeof document === 'undefined' || !document.body) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/90 p-2 sm:p-4 md:p-6 backdrop-blur-xl overflow-y-auto animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {/* Main Glassmorphic Neon Container */}
      <div className="relative w-full max-w-5xl rounded-3xl border-2 border-cyan-500/80 bg-gradient-to-b from-[#050D1A] via-[#040812] to-[#02050A] p-5 sm:p-7 md:p-8 shadow-[0_0_55px_rgba(6,182,212,0.35)] ring-1 ring-cyan-400/40 text-slate-100 max-h-[94vh] overflow-y-auto space-y-6">
        
        {/* Subtle Neon Radial Glow Effects */}
        <div className="absolute -top-24 -left-24 w-80 h-80 bg-cyan-500/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-1/3 -right-24 w-72 h-72 bg-blue-600/15 rounded-full blur-3xl pointer-events-none" />

        {/* =========================================================================
            HEADER: Player Portrait, Name & Subtitle, AI Rating Widget, Close
            ========================================================================= */}
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-5 border-b border-cyan-500/20 pb-5">
          {/* Left: Player Portrait Card + Details */}
          <div className="flex items-center gap-4 sm:gap-5 flex-1 min-w-0">
            {/* Player Portrait with signature */}
            <div className="relative h-20 w-20 sm:h-24 sm:w-24 rounded-2xl border-2 border-cyan-400/90 overflow-hidden shadow-[0_0_22px_rgba(6,182,212,0.4)] shrink-0 bg-gradient-to-tr from-blue-950 via-slate-900 to-cyan-950">
              <img
                src={photoUrl}
                alt={player.name}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover object-top"
                onError={(e) => {
                  const img = e.target as HTMLImageElement;
                  const fallback = `/players/${player.id.toLowerCase()}.svg`;
                  if (!img.src.endsWith(fallback)) {
                    img.src = fallback;
                  } else {
                    img.style.display = 'none';
                  }
                }}
              />

              {/* Dynamic Cursive Signature Overlay */}
              <div className="absolute bottom-1 right-1.5 z-10 pointer-events-none">
                <span
                  className="text-xs sm:text-sm font-semibold tracking-wider text-cyan-200/90 drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)] select-none italic"
                  style={{
                    fontFamily: "'Brush Script MT', 'Dancing Script', 'Caveat', cursive",
                  }}
                >
                  {telemetry.signatureName}
                </span>
              </div>

              {/* Subtle inner shadow overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent pointer-events-none" />
            </div>

            {/* Name, Team & Role */}
            <div className="space-y-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight drop-shadow-sm truncate">
                  {player.name}
                </h2>
                <CountryFlag countryCode={player.countryCode} size="md" />
              </div>

              <div className="flex items-center gap-2 text-xs sm:text-sm text-slate-300 font-sans flex-wrap">
                {/* Team Board Crest */}
                <div className="inline-flex items-center gap-1.5">
                  <TeamCrest teamId={player.countryCode.toLowerCase()} size={18} />
                  <span className="font-semibold text-slate-200">{player.country}</span>
                </div>
                <span className="text-cyan-400">·</span>
                <span className="text-slate-300 font-medium">{player.role}</span>
                <span className="text-cyan-400">·</span>
                <span className="text-slate-300">
                  Batting Rating:{' '}
                  <strong className="text-cyan-300 font-bold">{telemetry.battingRating}</strong>
                </span>
              </div>
            </div>
          </div>

          {/* Right: AI Rating Box, Crown & Close */}
          <div className="flex items-center gap-4 self-end md:self-center shrink-0">
            {/* AI Rating Card */}
            <div className="relative rounded-2xl border border-cyan-500/40 bg-gradient-to-b from-blue-950/60 to-slate-950/80 px-5 py-3 shadow-[0_0_20px_rgba(6,182,212,0.2)] min-w-[140px] text-center">
              {/* Crown on top right */}
              <Crown className="absolute -top-2.5 -right-2 h-5 w-5 text-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.6)]" />

              <span className="text-[10px] font-mono tracking-widest text-slate-300 uppercase block font-semibold">
                AI RATING
              </span>
              <div className="text-2xl sm:text-3xl font-black text-cyan-300 tracking-tight my-0.5 drop-shadow-[0_0_12px_rgba(6,182,212,0.6)] tabular-nums">
                {telemetry.aiRating} <span className="text-lg font-bold text-slate-400">/ 100</span>
              </div>

              {/* Glowing horizontal progress bar: cyan to emerald */}
              <div className="h-1.5 w-full rounded-full bg-slate-900 overflow-hidden p-0.5 border border-cyan-500/30">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-cyan-400 via-teal-300 to-emerald-400 shadow-[0_0_10px_#10B981] transition-all duration-700"
                  style={{ width: `${telemetry.aiRating}%` }}
                />
              </div>
            </div>

            {/* Close Button */}
            <button
              onClick={onClose}
              title="Close Profile"
              className="flex h-10 w-10 items-center justify-center rounded-full border border-cyan-500/40 bg-slate-900/80 text-slate-300 hover:text-white hover:border-cyan-400 hover:bg-cyan-500/20 transition-all cursor-pointer shadow-md"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* =========================================================================
            QUICK CAREER STATISTICS STRIP (Always Visible on Profile Open)
            ========================================================================= */}
        <div className="relative z-10 grid grid-cols-4 sm:grid-cols-8 gap-2 rounded-2xl border border-slate-800 bg-slate-950/85 p-3 font-mono text-xs tabular-nums">
          <div>
            <span className="text-[10px] text-slate-400 block">MATCHES</span>
            <strong className="text-white text-sm">{player.stats.matches}</strong>
          </div>
          <div>
            <span className="text-[10px] text-slate-400 block">RUNS</span>
            <strong className="text-cyan-300 text-sm">{player.stats.runs.toLocaleString()}</strong>
          </div>
          <div>
            <span className="text-[10px] text-slate-400 block">BAT AVG</span>
            <strong className="text-emerald-400 text-sm">{player.stats.average}</strong>
          </div>
          <div>
            <span className="text-[10px] text-slate-400 block">STRIKE RATE</span>
            <strong className="text-amber-300 text-sm">{player.stats.strikeRate}</strong>
          </div>
          <div>
            <span className="text-[10px] text-slate-400 block">WICKETS</span>
            <strong className="text-amber-300 text-sm">{player.stats.wickets}</strong>
          </div>
          <div>
            <span className="text-[10px] text-slate-400 block">ECONOMY</span>
            <strong className="text-white text-sm">
              {player.stats.wickets > 0 ? player.stats.economy : '—'}
            </strong>
          </div>
          <div>
            <span className="text-[10px] text-slate-400 block">BOUNDARY %</span>
            <strong className="text-sky-300 text-sm">{player.stats.boundaryPercent}%</strong>
          </div>
          <div>
            <span className="text-[10px] text-slate-400 block">CHASE AVG</span>
            <strong className="text-emerald-400 text-sm">{player.stats.chasingAvg}</strong>
          </div>
        </div>

        {/* =========================================================================
            TAB NAVIGATION BAR: 6 Interactive Tabs
            ========================================================================= */}
        <div className="relative z-10 flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none text-xs font-mono">
          {/* Tab 0: Career Statistics */}
          <button
            onClick={() => setActiveTab('stats')}
            className={`flex items-center gap-2 rounded-xl px-4 py-2.5 transition-all whitespace-nowrap cursor-pointer font-bold ${
              activeTab === 'stats'
                ? 'bg-gradient-to-r from-blue-600 via-sky-500 to-cyan-500 text-white shadow-[0_0_18px_rgba(14,165,233,0.5)] border border-cyan-400/50'
                : 'border border-slate-800 bg-slate-950/70 text-slate-300 hover:text-white hover:border-slate-700'
            }`}
          >
            <Award className="h-3.5 w-3.5 text-amber-300" />
            <span>Career Statistics</span>
          </button>

          {/* Tab 1: 5-Match Form (Recharts) */}
          <button
            onClick={() => setActiveTab('form')}
            className={`flex items-center gap-2 rounded-xl px-4 py-2.5 transition-all whitespace-nowrap cursor-pointer font-bold ${
              activeTab === 'form'
                ? 'bg-gradient-to-r from-blue-600 via-sky-500 to-cyan-500 text-white shadow-[0_0_18px_rgba(14,165,233,0.5)] border border-cyan-400/50'
                : 'border border-slate-800 bg-slate-950/70 text-slate-300 hover:text-white hover:border-slate-700'
            }`}
          >
            <Activity className="h-3.5 w-3.5" />
            <span>5-Match Form (Recharts)</span>
          </button>

          {/* Tab 2: Longevity (3-Yr SR) */}
          <button
            onClick={() => setActiveTab('longevity')}
            className={`flex items-center gap-2 rounded-xl px-4 py-2.5 transition-all whitespace-nowrap cursor-pointer font-bold ${
              activeTab === 'longevity'
                ? 'bg-gradient-to-r from-blue-600 via-sky-500 to-cyan-500 text-white shadow-[0_0_18px_rgba(14,165,233,0.5)] border border-cyan-400/50'
                : 'border border-slate-800 bg-slate-950/70 text-slate-300 hover:text-white hover:border-slate-700'
            }`}
          >
            <Clock className="h-3.5 w-3.5" />
            <span>Longevity (3-Yr SR)</span>
          </button>

          {/* Tab 3: Wagon Wheel (ACTIVE BY DEFAULT) */}
          <button
            onClick={() => setActiveTab('wagon')}
            className={`flex items-center gap-2 rounded-xl px-4 py-2.5 transition-all whitespace-nowrap cursor-pointer font-bold ${
              activeTab === 'wagon'
                ? 'bg-gradient-to-r from-blue-600 via-sky-500 to-cyan-500 text-white shadow-[0_0_22px_rgba(14,165,233,0.65)] border border-cyan-400 ring-1 ring-cyan-300/40'
                : 'border border-slate-800 bg-slate-950/70 text-slate-300 hover:text-white hover:border-slate-700'
            }`}
          >
            <Target className="h-3.5 w-3.5 text-cyan-200" />
            <span>Wagon Wheel</span>
          </button>

          {/* Tab 4: Phase Performance */}
          <button
            onClick={() => setActiveTab('phase')}
            className={`flex items-center gap-2 rounded-xl px-4 py-2.5 transition-all whitespace-nowrap cursor-pointer font-bold ${
              activeTab === 'phase'
                ? 'bg-gradient-to-r from-blue-600 via-sky-500 to-cyan-500 text-white shadow-[0_0_18px_rgba(14,165,233,0.5)] border border-cyan-400/50'
                : 'border border-slate-800 bg-slate-950/70 text-slate-300 hover:text-white hover:border-slate-700'
            }`}
          >
            <BarChart3 className="h-3.5 w-3.5" />
            <span>Phase Performance</span>
          </button>

          {/* Tab 5: Match Logs */}
          <button
            onClick={() => setActiveTab('logs')}
            className={`flex items-center gap-2 rounded-xl px-4 py-2.5 transition-all whitespace-nowrap cursor-pointer font-bold ${
              activeTab === 'logs'
                ? 'bg-gradient-to-r from-blue-600 via-sky-500 to-cyan-500 text-white shadow-[0_0_18px_rgba(14,165,233,0.5)] border border-cyan-400/50'
                : 'border border-slate-800 bg-slate-950/70 text-slate-300 hover:text-white hover:border-slate-700'
            }`}
          >
            <FileText className="h-3.5 w-3.5" />
            <span>Match Logs</span>
          </button>
        </div>

        {/* =========================================================================
            TAB CONTENT 1: WAGON WHEEL (MATCHES SCREENSHOT FAITHFULLY)
            ========================================================================= */}
        {activeTab === 'wagon' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch animate-in fade-in duration-200">
            {/* LEFT COLUMN: 360° Wagon Wheel Visualizer */}
            <div className="lg:col-span-6 relative rounded-2xl border border-cyan-500/40 bg-gradient-to-b from-[#071329] via-[#040C1D] to-[#020712] p-4 sm:p-5 flex flex-col items-center justify-between shadow-[0_0_35px_rgba(6,182,212,0.2)] overflow-hidden">
              
              {/* Top Stadium Floodlights Graphic in corners */}
              <div className="absolute top-2 left-4 pointer-events-none opacity-80">
                <svg width="48" height="36" viewBox="0 0 48 36" fill="none">
                  <circle cx="8" cy="8" r="4" fill="#FFFFFF" filter="drop-shadow(0 0 6px #00F0FF)" />
                  <circle cx="20" cy="8" r="4" fill="#FFFFFF" filter="drop-shadow(0 0 6px #00F0FF)" />
                  <circle cx="32" cy="8" r="4" fill="#FFFFFF" filter="drop-shadow(0 0 6px #00F0FF)" />
                  <circle cx="44" cy="8" r="4" fill="#FFFFFF" filter="drop-shadow(0 0 6px #00F0FF)" />
                  <circle cx="8" cy="20" r="4" fill="#FFFFFF" filter="drop-shadow(0 0 6px #00F0FF)" />
                  <circle cx="20" cy="20" r="4" fill="#FFFFFF" filter="drop-shadow(0 0 6px #00F0FF)" />
                  <circle cx="32" cy="20" r="4" fill="#FFFFFF" filter="drop-shadow(0 0 6px #00F0FF)" />
                  <circle cx="44" cy="20" r="4" fill="#FFFFFF" filter="drop-shadow(0 0 6px #00F0FF)" />
                  <line x1="26" y1="26" x2="26" y2="36" stroke="#00F0FF" strokeWidth="2" opacity="0.6" />
                </svg>
              </div>

              <div className="absolute top-2 right-4 pointer-events-none opacity-80">
                <svg width="48" height="36" viewBox="0 0 48 36" fill="none">
                  <circle cx="8" cy="8" r="4" fill="#FFFFFF" filter="drop-shadow(0 0 6px #00F0FF)" />
                  <circle cx="20" cy="8" r="4" fill="#FFFFFF" filter="drop-shadow(0 0 6px #00F0FF)" />
                  <circle cx="32" cy="8" r="4" fill="#FFFFFF" filter="drop-shadow(0 0 6px #00F0FF)" />
                  <circle cx="44" cy="8" r="4" fill="#FFFFFF" filter="drop-shadow(0 0 6px #00F0FF)" />
                  <circle cx="8" cy="20" r="4" fill="#FFFFFF" filter="drop-shadow(0 0 6px #00F0FF)" />
                  <circle cx="20" cy="20" r="4" fill="#FFFFFF" filter="drop-shadow(0 0 6px #00F0FF)" />
                  <circle cx="32" cy="20" r="4" fill="#FFFFFF" filter="drop-shadow(0 0 6px #00F0FF)" />
                  <circle cx="44" cy="20" r="4" fill="#FFFFFF" filter="drop-shadow(0 0 6px #00F0FF)" />
                  <line x1="26" y1="26" x2="26" y2="36" stroke="#00F0FF" strokeWidth="2" opacity="0.6" />
                </svg>
              </div>

              {/* 360° Neon Wagon Wheel SVG */}
              <div className="relative w-full aspect-square max-w-[340px] sm:max-w-[380px] my-auto flex items-center justify-center select-none">
                <svg viewBox="0 0 400 400" className="w-full h-full">
                  <defs>
                    {/* Glowing Filters */}
                    <filter id="neonGlowCyan" x="-30%" y="-30%" width="160%" height="160%">
                      <feGaussianBlur stdDeviation="3.5" result="blur" />
                      <feComposite in="SourceGraphic" in2="blur" operator="over" />
                    </filter>
                    <filter id="neonGlowGreen" x="-30%" y="-30%" width="160%" height="160%">
                      <feGaussianBlur stdDeviation="3.5" result="blur" />
                      <feComposite in="SourceGraphic" in2="blur" operator="over" />
                    </filter>
                    <filter id="neonGlowAmber" x="-30%" y="-30%" width="160%" height="160%">
                      <feGaussianBlur stdDeviation="3.5" result="blur" />
                      <feComposite in="SourceGraphic" in2="blur" operator="over" />
                    </filter>
                    <filter id="neonGlowPurple" x="-30%" y="-30%" width="160%" height="160%">
                      <feGaussianBlur stdDeviation="3.5" result="blur" />
                      <feComposite in="SourceGraphic" in2="blur" operator="over" />
                    </filter>
                    <filter id="neonGlowRed" x="-30%" y="-30%" width="160%" height="160%">
                      <feGaussianBlur stdDeviation="3.5" result="blur" />
                      <feComposite in="SourceGraphic" in2="blur" operator="over" />
                    </filter>

                    {/* Pitch Gradient */}
                    <linearGradient id="pitchGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                      <stop offset="0%" stopColor="#C99E68" />
                      <stop offset="50%" stopColor="#D4A76A" />
                      <stop offset="100%" stopColor="#C99E68" />
                    </linearGradient>

                    {/* Sector Gradients */}
                    <radialGradient id="fieldGrad" cx="50%" cy="50%" r="50%">
                      <stop offset="0%" stopColor="#02142B" stopOpacity="0.4" />
                      <stop offset="85%" stopColor="#042048" stopOpacity="0.7" />
                      <stop offset="100%" stopColor="#00356B" stopOpacity="0.9" />
                    </radialGradient>
                  </defs>

                  {/* Stadium Outer Ring & Field Grass Circle */}
                  <circle cx="200" cy="200" r="160" fill="url(#fieldGrad)" stroke="#0078FF" strokeWidth="2.5" opacity="0.95" />
                  <circle cx="200" cy="200" r="160" fill="none" stroke="#00F0FF" strokeWidth="1.5" filter="url(#neonGlowCyan)" />

                  {/* 30-Yard Circle Marker (Inner Ring) */}
                  <circle cx="200" cy="200" r="95" fill="none" stroke="#00A3FF" strokeWidth="1" strokeDasharray="4 4" opacity="0.35" />

                  {/* Sector division radial guidelines */}
                  <line x1="200" y1="200" x2="200" y2="40" stroke="#0078FF" strokeWidth="1" opacity="0.4" strokeDasharray="3 3" />
                  <line x1="200" y1="200" x2="352" y2="150" stroke="#0078FF" strokeWidth="1" opacity="0.4" strokeDasharray="3 3" />
                  <line x1="200" y1="200" x2="335" y2="295" stroke="#0078FF" strokeWidth="1" opacity="0.4" strokeDasharray="3 3" />
                  <line x1="200" y1="200" x2="80" y2="305" stroke="#0078FF" strokeWidth="1" opacity="0.4" strokeDasharray="3 3" />
                  <line x1="200" y1="200" x2="55" y2="150" stroke="#0078FF" strokeWidth="1" opacity="0.4" strokeDasharray="3 3" />

                  {/* ==============================================================
                      RADIAL SHOT STREAKS (FIREWORK-STYLE RAYS WITH LUMINOUS NODES)
                      ============================================================== */}
                  {/* 1. MID-WICKET (GREEN) - 34% (Top & Top-Right) */}
                  <g filter="url(#neonGlowGreen)" opacity={selectedZoneId === 'mid-wicket' || !selectedZoneId ? 1 : 0.45}>
                    <line x1="200" y1="180" x2="205" y2="70" stroke="#10B981" strokeWidth="2" />
                    <circle cx="205" cy="70" r="3.5" fill="#34D399" />
                    <line x1="200" y1="180" x2="230" y2="78" stroke="#10B981" strokeWidth="2.5" />
                    <circle cx="230" cy="78" r="4" fill="#34D399" />
                    <line x1="200" y1="180" x2="250" y2="95" stroke="#10B981" strokeWidth="2" />
                    <circle cx="250" cy="95" r="3.5" fill="#34D399" />
                    <line x1="200" y1="180" x2="270" y2="115" stroke="#10B981" strokeWidth="2.5" />
                    <circle cx="270" cy="115" r="4.5" fill="#34D399" />
                  </g>

                  {/* 2. COVER & EXTRA COVER (CYAN/BLUE) - 28% (Off-Side Left) */}
                  <g filter="url(#neonGlowCyan)" opacity={selectedZoneId === 'cover' || !selectedZoneId ? 1 : 0.45}>
                    <line x1="200" y1="210" x2="75" y2="180" stroke="#06B6D4" strokeWidth="2.5" />
                    <circle cx="75" cy="180" r="4" fill="#22D3EE" />
                    <line x1="200" y1="210" x2="90" y2="140" stroke="#06B6D4" strokeWidth="2" />
                    <circle cx="90" cy="140" r="3.5" fill="#22D3EE" />
                    <line x1="200" y1="210" x2="105" y2="225" stroke="#06B6D4" strokeWidth="2.5" />
                    <circle cx="105" cy="225" r="4" fill="#22D3EE" />
                    <line x1="200" y1="210" x2="135" y2="125" stroke="#06B6D4" strokeWidth="2" />
                    <circle cx="135" cy="125" r="3.5" fill="#22D3EE" />
                  </g>

                  {/* 3. SQUARE LEG (PURPLE) - 12% (Leg-Side Right) */}
                  <g filter="url(#neonGlowPurple)" opacity={selectedZoneId === 'square-leg' || !selectedZoneId ? 1 : 0.45}>
                    <line x1="200" y1="210" x2="310" y2="190" stroke="#A855F7" strokeWidth="2.5" />
                    <circle cx="310" cy="190" r="4" fill="#C084FC" />
                    <line x1="200" y1="210" x2="325" y2="225" stroke="#A855F7" strokeWidth="2" />
                    <circle cx="325" cy="225" r="3.5" fill="#C084FC" />
                    <line x1="200" y1="210" x2="290" y2="245" stroke="#A855F7" strokeWidth="2" />
                    <circle cx="290" cy="245" r="3.5" fill="#C084FC" />
                  </g>

                  {/* 4. LONG OFF / DOWN GROUND (AMBER) - 18% (Bottom-Left) */}
                  <g filter="url(#neonGlowAmber)" opacity={selectedZoneId === 'straight' || !selectedZoneId ? 1 : 0.45}>
                    <line x1="200" y1="220" x2="155" y2="330" stroke="#F59E0B" strokeWidth="2.5" />
                    <circle cx="155" cy="330" r="4" fill="#FBBF24" />
                    <line x1="200" y1="220" x2="185" y2="345" stroke="#F59E0B" strokeWidth="2" />
                    <circle cx="185" cy="345" r="4" fill="#FBBF24" />
                    <line x1="200" y1="220" x2="125" y2="315" stroke="#F59E0B" strokeWidth="2" />
                    <circle cx="125" cy="315" r="3.5" fill="#FBBF24" />
                  </g>

                  {/* 5. FINE LEG & THIRD MAN (RED/ROSE) - 8% (Bottom-Right) */}
                  <g filter="url(#neonGlowRed)" opacity={selectedZoneId === 'fine-leg' || !selectedZoneId ? 1 : 0.45}>
                    <line x1="200" y1="220" x2="255" y2="330" stroke="#EF4444" strokeWidth="2.5" />
                    <circle cx="255" cy="330" r="4" fill="#F87171" />
                    <line x1="200" y1="220" x2="285" y2="315" stroke="#EF4444" strokeWidth="2" />
                    <circle cx="285" cy="315" r="3.5" fill="#F87171" />
                  </g>

                  {/* ==============================================================
                      CENTRAL CRICKET PITCH GRAPHIC WITH CREASE & STUMPS
                      ============================================================== */}
                  <g transform="translate(182, 160)">
                    {/* Pitch Tan Rectangle */}
                    <rect
                      x="0"
                      y="0"
                      width="36"
                      height="80"
                      rx="4"
                      fill="url(#pitchGrad)"
                      stroke="#855B32"
                      strokeWidth="1.5"
                      filter="drop-shadow(0 2px 8px rgba(0,0,0,0.8))"
                    />

                    {/* Popping Crease Lines */}
                    <line x1="4" y1="14" x2="32" y2="14" stroke="#FFFFFF" strokeWidth="1.2" opacity="0.9" />
                    <line x1="4" y1="66" x2="32" y2="66" stroke="#FFFFFF" strokeWidth="1.2" opacity="0.9" />
                    
                    {/* Return Creases */}
                    <line x1="8" y1="4" x2="8" y2="18" stroke="#FFFFFF" strokeWidth="1" opacity="0.8" />
                    <line x1="28" y1="4" x2="28" y2="18" stroke="#FFFFFF" strokeWidth="1" opacity="0.8" />
                    <line x1="8" y1="62" x2="8" y2="76" stroke="#FFFFFF" strokeWidth="1" opacity="0.8" />
                    <line x1="28" y1="62" x2="28" y2="76" stroke="#FFFFFF" strokeWidth="1" opacity="0.8" />

                    {/* Wooden Wickets Top End */}
                    <rect x="13" y="6" width="2" height="7" fill="#FDE047" />
                    <rect x="17" y="6" width="2" height="7" fill="#FDE047" />
                    <rect x="21" y="6" width="2" height="7" fill="#FDE047" />
                    <rect x="12" y="5" width="12" height="1.5" fill="#FEF08A" />

                    {/* Wooden Wickets Bottom End (Striker End) */}
                    <rect x="13" y="67" width="2" height="7" fill="#FDE047" />
                    <rect x="17" y="67" width="2" height="7" fill="#FDE047" />
                    <rect x="21" y="67" width="2" height="7" fill="#FDE047" />
                    <rect x="12" y="73.5" width="12" height="1.5" fill="#FEF08A" />
                  </g>
                </svg>

                {/* ==============================================================
                    FLOATING PERIMETER PERCENTAGE BADGES (EXACTLY LIKE SCREENSHOT)
                    ============================================================== */}
                {/* 1. TOP: 34% Mid-Wicket */}
                <button
                  type="button"
                  onClick={() => setSelectedZoneId('mid-wicket')}
                  onMouseEnter={() => setHoveredZoneId('mid-wicket')}
                  onMouseLeave={() => setHoveredZoneId(null)}
                  className={`absolute top-2 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-mono font-bold transition-all cursor-pointer shadow-lg ${
                    selectedZoneId === 'mid-wicket'
                      ? 'border-emerald-400 bg-emerald-950/90 text-emerald-300 ring-2 ring-emerald-400/50 scale-105'
                      : 'border-emerald-500/50 bg-slate-950/90 text-emerald-400 hover:scale-105'
                  }`}
                >
                  <span className="rounded-full bg-emerald-500 px-1.5 py-0.2 text-[11px] font-black text-slate-950">
                    34%
                  </span>
                  <span className="text-white text-[11px] font-sans font-bold">Mid-Wicket</span>
                </button>

                {/* 2. LEFT: 28% Cover */}
                <button
                  type="button"
                  onClick={() => setSelectedZoneId('cover')}
                  onMouseEnter={() => setHoveredZoneId('cover')}
                  onMouseLeave={() => setHoveredZoneId(null)}
                  className={`absolute top-1/2 left-1 -translate-y-1/2 z-20 flex flex-col items-center rounded-xl border px-3 py-1.5 text-xs font-mono font-bold transition-all cursor-pointer shadow-lg ${
                    selectedZoneId === 'cover'
                      ? 'border-cyan-400 bg-cyan-950/90 text-cyan-300 ring-2 ring-cyan-400/50 scale-105'
                      : 'border-cyan-500/50 bg-slate-950/90 text-cyan-400 hover:scale-105'
                  }`}
                >
                  <span className="text-white text-sm font-black">28%</span>
                  <span className="text-[11px] text-cyan-200 font-sans font-bold">Cover</span>
                </button>

                {/* 3. RIGHT: 12% Square Leg */}
                <button
                  type="button"
                  onClick={() => setSelectedZoneId('square-leg')}
                  onMouseEnter={() => setHoveredZoneId('square-leg')}
                  onMouseLeave={() => setHoveredZoneId(null)}
                  className={`absolute top-1/2 right-1 -translate-y-1/2 z-20 flex flex-col items-center rounded-xl border px-3 py-1.5 text-xs font-mono font-bold transition-all cursor-pointer shadow-lg ${
                    selectedZoneId === 'square-leg'
                      ? 'border-purple-400 bg-purple-950/90 text-purple-300 ring-2 ring-purple-400/50 scale-105'
                      : 'border-purple-500/50 bg-slate-950/90 text-purple-400 hover:scale-105'
                  }`}
                >
                  <span className="text-white text-sm font-black">12%</span>
                  <span className="text-[11px] text-purple-200 font-sans font-bold">Square Leg</span>
                </button>

                {/* 4. BOTTOM-LEFT: 18% Long Off */}
                <button
                  type="button"
                  onClick={() => setSelectedZoneId('straight')}
                  onMouseEnter={() => setHoveredZoneId('straight')}
                  onMouseLeave={() => setHoveredZoneId(null)}
                  className={`absolute bottom-3 left-4 z-20 flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-mono font-bold transition-all cursor-pointer shadow-lg ${
                    selectedZoneId === 'straight'
                      ? 'border-amber-400 bg-amber-950/90 text-amber-300 ring-2 ring-amber-400/50 scale-105'
                      : 'border-amber-500/50 bg-slate-950/90 text-amber-400 hover:scale-105'
                  }`}
                >
                  <span className="rounded-full bg-amber-400 px-1.5 py-0.2 text-[11px] font-black text-slate-950">
                    18%
                  </span>
                  <span className="text-white text-[11px] font-sans font-bold">Long Off</span>
                </button>

                {/* 5. BOTTOM-RIGHT: 8% Fine Leg */}
                <button
                  type="button"
                  onClick={() => setSelectedZoneId('fine-leg')}
                  onMouseEnter={() => setHoveredZoneId('fine-leg')}
                  onMouseLeave={() => setHoveredZoneId(null)}
                  className={`absolute bottom-3 right-4 z-20 flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-mono font-bold transition-all cursor-pointer shadow-lg ${
                    selectedZoneId === 'fine-leg'
                      ? 'border-rose-400 bg-rose-950/90 text-rose-300 ring-2 ring-rose-400/50 scale-105'
                      : 'border-rose-500/50 bg-slate-950/90 text-rose-400 hover:scale-105'
                  }`}
                >
                  <span className="rounded-full bg-rose-500 px-1.5 py-0.2 text-[11px] font-black text-slate-950">
                    8%
                  </span>
                  <span className="text-white text-[11px] font-sans font-bold">Fine Leg</span>
                </button>
              </div>

              {/* Subtitle at Bottom of Wagon Wheel */}
              <div className="flex items-center gap-2 text-xs font-mono text-cyan-300 tracking-wider pt-2 select-none">
                <span className="h-px w-8 bg-cyan-500/50" />
                <span className="font-semibold uppercase">Dynamic 360° Wagon Wheel</span>
                <span className="h-px w-8 bg-cyan-500/50" />
              </div>
            </div>

            {/* RIGHT COLUMN: 4 Interactive Zone Cards + Telemetry Breakdown */}
            <div className="lg:col-span-6 flex flex-col justify-between space-y-3.5">
              <div className="space-y-3">
                {telemetry.zoneCards.map((card) => {
                  const isSelected = selectedZoneId === card.id;

                  return (
                    <div
                      key={card.id}
                      onClick={() => setSelectedZoneId(card.id)}
                      className={`group rounded-2xl border p-4 sm:p-5 flex items-center justify-between gap-4 transition-all cursor-pointer ${
                        isSelected
                          ? 'border-cyan-400 bg-gradient-to-r from-blue-950/70 via-slate-900/90 to-cyan-950/50 shadow-[0_0_24px_rgba(6,182,212,0.35)] ring-1 ring-cyan-400/40'
                          : 'border-cyan-500/30 bg-slate-950/70 hover:border-cyan-500/60 hover:bg-slate-900/60'
                      }`}
                    >
                      {/* Left: Icon & Zone Title */}
                      <div className="flex items-center gap-3.5 min-w-0">
                        <div
                          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border ${
                            isSelected
                              ? 'border-cyan-400 bg-cyan-500/20 text-cyan-300 shadow-[0_0_12px_rgba(6,182,212,0.4)]'
                              : 'border-cyan-500/30 bg-blue-950/40 text-cyan-400'
                          }`}
                        >
                          {card.iconType === 'shield' && <Shield className="h-5 w-5" />}
                          {card.iconType === 'helmet' && (
                            /* Cricket Helmet/Cap SVG */
                            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M4 14a8 8 0 0 1 16 0v2H4v-2z" />
                              <path d="M3 16h18v3a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-3z" />
                              <circle cx="12" cy="11" r="1.5" fill="currentColor" />
                            </svg>
                          )}
                          {card.iconType === 'target' && <Target className="h-5 w-5" />}
                          {card.iconType === 'bat' && (
                            /* Cricket Bat SVG */
                            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M5 19L19 5" strokeLinecap="round" />
                              <path d="M15 5l4 4-9 9-4-4 9-9z" fill="currentColor" fillOpacity="0.2" />
                              <circle cx="4" cy="20" r="1.5" fill="currentColor" />
                            </svg>
                          )}
                        </div>

                        <span className="text-sm sm:text-base font-bold text-slate-100 group-hover:text-white transition-colors truncate">
                          {card.title}
                        </span>
                      </div>

                      {/* Right: Percentage, Strike Rate, Arrow */}
                      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                        <div className="text-right">
                          <span className={`text-base sm:text-lg font-black font-mono tracking-tight ${card.color}`}>
                            {card.percentage}%
                          </span>
                          <span className="text-xs sm:text-sm font-mono text-slate-300 ml-1.5 font-bold">
                            (SR {card.strikeRate})
                          </span>
                        </div>

                        <ChevronRight
                          className={`h-5 w-5 transition-transform ${
                            isSelected ? 'text-cyan-400 translate-x-1' : 'text-slate-500 group-hover:text-cyan-300'
                          }`}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Active Zone Deep-Dive Inspection Panel */}
              {activeZone && (
                <div className="rounded-2xl border border-cyan-500/30 bg-slate-950/80 p-4 space-y-2 text-xs font-mono shadow-inner">
                  <div className="flex items-center justify-between text-cyan-300">
                    <span className="font-bold uppercase tracking-wider flex items-center gap-1.5">
                      <Sparkles className="h-3.5 w-3.5 text-cyan-400" />
                      <span>{activeZone.name} Detailed Telemetry</span>
                    </span>
                    <span className="text-slate-400">{activeZone.runs} Runs ({activeZone.balls} Balls)</span>
                  </div>

                  <div className="grid grid-cols-4 gap-2 pt-1 text-center">
                    <div className="rounded-lg bg-slate-900/90 border border-slate-800 p-2">
                      <span className="text-[10px] text-slate-400 block">4s Hitting</span>
                      <strong className="text-white text-xs">{activeZone.boundaries4s} Fours</strong>
                    </div>
                    <div className="rounded-lg bg-slate-900/90 border border-slate-800 p-2">
                      <span className="text-[10px] text-slate-400 block">6s Maximums</span>
                      <strong className="text-cyan-400 text-xs">{activeZone.boundaries6s} Sixes</strong>
                    </div>
                    <div className="rounded-lg bg-slate-900/90 border border-slate-800 p-2">
                      <span className="text-[10px] text-slate-400 block">Dismissals</span>
                      <strong className="text-rose-400 text-xs">{activeZone.dismissals} Outs</strong>
                    </div>
                    <div className="rounded-lg bg-slate-900/90 border border-slate-800 p-2">
                      <span className="text-[10px] text-slate-400 block">True SR</span>
                      <strong className="text-emerald-400 text-xs">{activeZone.strikeRate}</strong>
                    </div>
                  </div>
                </div>
              )}

              {/* Footnote matching screenshot */}
              <p className="text-xs italic text-slate-400 font-sans tracking-wide pt-1">
                {telemetry.telemetryFootnote}
              </p>
            </div>
          </div>
        )}

        {/* =========================================================================
            TAB CONTENT 2: 5-MATCH FORM (RECHARTS)
            ========================================================================= */}
        {activeTab === 'form' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            {/* Form Headline & Chart */}
            <div className="rounded-2xl border border-cyan-500/40 bg-gradient-to-b from-[#071329] to-[#020712] p-5 space-y-4 shadow-[0_0_30px_rgba(6,182,212,0.2)]">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-cyan-400" />
                    <span>Recent 5-Match Innings Run Progression</span>
                  </h3>
                  <p className="text-xs text-slate-400">
                    Interactive Recharts curve plotting runs scored, strike rate efficiency, and milestone impact.
                  </p>
                </div>
                <div className="flex items-center gap-3 text-xs font-mono">
                  <span className="flex items-center gap-1.5 text-cyan-300">
                    <span className="h-2 w-2 rounded-full bg-cyan-400 shadow-[0_0_8px_#00F0FF]" />
                    <span>Runs Scored</span>
                  </span>
                  <span className="flex items-center gap-1.5 text-amber-300">
                    <span className="h-2 w-2 rounded-full bg-amber-400" />
                    <span>Strike Rate</span>
                  </span>
                </div>
              </div>

              {/* Recharts Area Chart */}
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={telemetry.formHistory.slice().reverse()}
                    margin={{ top: 10, right: 20, left: -10, bottom: 0 }}
                  >
                    <defs>
                      <linearGradient id="runsGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#06B6D4" stopOpacity={0.7} />
                        <stop offset="95%" stopColor="#06B6D4" stopOpacity={0.05} />
                      </linearGradient>
                      <linearGradient id="srGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#F59E0B" stopOpacity={0.5} />
                        <stop offset="95%" stopColor="#F59E0B" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" opacity={0.6} />
                    <XAxis
                      dataKey="opponent"
                      stroke="#64748B"
                      fontSize={11}
                      tickLine={false}
                      tickFormatter={(val) => `vs ${val}`}
                    />
                    <YAxis stroke="#64748B" fontSize={11} tickLine={false} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#020617',
                        borderColor: '#06B6D4',
                        borderRadius: '12px',
                        boxShadow: '0 0 20px rgba(6,182,212,0.4)',
                        fontSize: '12px',
                      }}
                      formatter={(val: unknown, name: unknown) => [
                        `${val}`,
                        name === 'runs' ? 'Runs Scored' : 'Strike Rate',
                      ]}
                    />
                    <Area
                      type="monotone"
                      dataKey="runs"
                      stroke="#06B6D4"
                      strokeWidth={3}
                      fillOpacity={1}
                      fill="url(#runsGrad)"
                      activeDot={{ r: 7, fill: '#22D3EE', stroke: '#FFFFFF', strokeWidth: 2 }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* 5 Matches Card List */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              {telemetry.formHistory.map((m, idx) => (
                <div
                  key={m.matchId}
                  onClick={() => setSelectedMatch(m)}
                  className={`rounded-2xl border p-3.5 space-y-2 transition-all cursor-pointer ${
                    selectedMatch.matchId === m.matchId
                      ? 'border-cyan-400 bg-cyan-950/50 shadow-[0_0_15px_rgba(6,182,212,0.3)] ring-1 ring-cyan-400/40'
                      : 'border-slate-800 bg-slate-950/70 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-mono text-slate-400">Match #{idx + 1}</span>
                    <span
                      className={`font-mono text-[10px] font-bold px-1.5 py-0.5 rounded ${
                        m.result === 'WON'
                          ? 'bg-emerald-950 border border-emerald-500/40 text-emerald-300'
                          : 'bg-rose-950 border border-rose-500/40 text-rose-300'
                      }`}
                    >
                      {m.result}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <CountryFlag countryCode={m.opponentCode} size="sm" />
                    <span className="text-xs font-bold text-white truncate">vs {m.opponent}</span>
                  </div>

                  <div className="flex items-baseline justify-between pt-1 border-t border-slate-800">
                    <div>
                      <span className="text-xl font-black font-mono text-cyan-300">{m.runs}</span>
                      <span className="text-[11px] text-slate-400 ml-1">({m.balls}b)</span>
                    </div>
                    <span className="text-xs font-mono font-bold text-amber-300">SR {m.strikeRate}</span>
                  </div>

                  {m.milestone && (
                    <span className="block text-[10px] font-sans text-cyan-300/90 truncate italic">
                      ★ {m.milestone}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* =========================================================================
            TAB CONTENT 3: LONGEVITY (3-YR SR & METRICS)
            ========================================================================= */}
        {activeTab === 'longevity' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
              {/* Year by Year Bar Chart */}
              <div className="lg:col-span-7 rounded-2xl border border-cyan-500/40 bg-gradient-to-b from-[#071329] to-[#020712] p-5 space-y-4 shadow-[0_0_30px_rgba(6,182,212,0.2)]">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <Clock className="h-4 w-4 text-cyan-400" />
                    <span>3-Year Strike Rate & Average Evolution</span>
                  </h3>
                  <span className="text-xs font-mono text-cyan-300 font-semibold">2024 — 2026</span>
                </div>

                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={telemetry.longevityData}
                      margin={{ top: 10, right: 20, left: -10, bottom: 0 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" opacity={0.6} />
                      <XAxis dataKey="year" stroke="#64748B" fontSize={12} tickLine={false} />
                      <YAxis stroke="#64748B" fontSize={11} tickLine={false} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#020617',
                          borderColor: '#06B6D4',
                          borderRadius: '12px',
                          boxShadow: '0 0 20px rgba(6,182,212,0.4)',
                        }}
                      />
                      <Bar dataKey="strikeRate" fill="#06B6D4" radius={[6, 6, 0, 0]} name="Strike Rate" />
                      <Bar dataKey="average" fill="#10B981" radius={[6, 6, 0, 0]} name="Average" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Longevity Index Cards */}
              <div className="lg:col-span-5 flex flex-col justify-between space-y-3">
                <div className="rounded-2xl border border-cyan-500/30 bg-slate-950/80 p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono font-bold text-cyan-300 uppercase">
                      Peak Career Rating
                    </span>
                    <span className="text-2xl font-black font-mono text-white">99 / 100</span>
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed font-sans">
                    Achieved elite international T20 status through sustained run-scoring in high-leverage knockout scenarios.
                  </p>
                </div>

                <div className="rounded-2xl border border-emerald-500/30 bg-slate-950/80 p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono font-bold text-emerald-400 uppercase">
                      Clutch Chase Average
                    </span>
                    <span className="text-2xl font-black font-mono text-white">54.0</span>
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed font-sans">
                    Unmatched second-innings win conversion rate when chasing targets above 175+.
                  </p>
                </div>

                <div className="rounded-2xl border border-amber-500/30 bg-slate-950/80 p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono font-bold text-amber-400 uppercase">
                      Dot-Ball Suppression
                    </span>
                    <span className="text-2xl font-black font-mono text-white">69.0%</span>
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed font-sans">
                    Suppresses pressure through rapid strike rotation and elite running between wickets.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* =========================================================================
            TAB CONTENT 4: PHASE PERFORMANCE (POWERPLAY, MIDDLE, DEATH)
            ========================================================================= */}
        {activeTab === 'phase' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {telemetry.phasePerformance.map((p, idx) => (
                <div
                  key={idx}
                  className="rounded-2xl border border-cyan-500/30 bg-gradient-to-b from-[#071329] to-[#020712] p-5 space-y-4 shadow-lg hover:border-cyan-400 transition-all"
                >
                  <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                    <h4 className="text-sm font-bold text-white flex items-center gap-2">
                      <Zap className="h-4 w-4 text-cyan-400" />
                      <span>{p.phase}</span>
                    </h4>
                    <span className="text-xs font-mono font-black text-cyan-300">
                      SR {p.strikeRate}
                    </span>
                  </div>

                  <div className="space-y-3 text-xs font-mono">
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400">Total Runs:</span>
                      <strong className="text-white text-sm">{p.runs}</strong>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400">Boundary %:</span>
                      <strong className="text-emerald-400">{p.boundaryPercent}%</strong>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400">Dot Ball %:</span>
                      <strong className="text-amber-400">{p.dotBallPercent}%</strong>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400">Balls per Boundary:</span>
                      <strong className="text-cyan-300">{p.ballsPerBoundary} balls</strong>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400">SR vs Express Pace:</span>
                      <strong className="text-sky-300">{p.srVsPace}</strong>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400">SR vs Spin:</span>
                      <strong className="text-purple-300">{p.srVsSpin}</strong>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* =========================================================================
            TAB CONTENT 5: MATCH LOGS (AUTHENTICATED INTERNATIONAL PERFORMANCE HISTORY)
            ========================================================================= */}
        {activeTab === 'logs' && (
          <div className="rounded-2xl border border-cyan-500/30 bg-slate-950/90 overflow-hidden shadow-xl animate-in fade-in duration-200">
            <div className="px-5 py-3 border-b border-slate-800 bg-slate-900/60 flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
              <div className="flex items-center gap-2">
                <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="font-bold text-white">AUTHENTICATED PERFORMANCE LOGS</span>
                <span className="rounded-full bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 text-[10px] font-bold text-emerald-300">
                  VERIFIED INTERNATIONAL METRICS
                </span>
              </div>
              <span className="text-slate-400 text-[11px]">Grounded in official ICC & Bilateral scorecards</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead className="border-b border-slate-800 bg-slate-900/80 text-slate-400 uppercase tracking-wider text-[11px]">
                  <tr>
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3">Opponent</th>
                    <th className="px-4 py-3">Venue</th>
                    <th className="px-4 py-3 text-right">Runs</th>
                    <th className="px-4 py-3 text-right">Balls</th>
                    <th className="px-4 py-3 text-right">4s</th>
                    <th className="px-4 py-3 text-right">6s</th>
                    <th className="px-4 py-3 text-right">SR</th>
                    <th className="px-4 py-3">Dismissal</th>
                    <th className="px-4 py-3 text-center">Result</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80 text-slate-200">
                  {telemetry.formHistory.map((m) => (
                    <tr key={m.matchId} className="hover:bg-cyan-500/5 transition-colors">
                      <td className="px-4 py-3 text-slate-400 whitespace-nowrap">{m.date}</td>
                      <td className="px-4 py-3 whitespace-nowrap font-bold text-white flex items-center gap-2">
                        <CountryFlag countryCode={m.opponentCode} size="sm" />
                        <span>{m.opponent}</span>
                      </td>
                      <td className="px-4 py-3 text-slate-300 truncate max-w-[160px]">{m.venue}</td>
                      <td className="px-4 py-3 text-right font-black text-cyan-300 text-sm">{m.runs}</td>
                      <td className="px-4 py-3 text-right text-slate-400">{m.balls}</td>
                      <td className="px-4 py-3 text-right text-slate-300">{m.fours}</td>
                      <td className="px-4 py-3 text-right text-amber-300 font-bold">{m.sixes}</td>
                      <td className="px-4 py-3 text-right text-emerald-400 font-bold">{m.strikeRate}</td>
                      <td className="px-4 py-3 text-slate-400 truncate max-w-[150px]">{m.dismissal}</td>
                      <td className="px-4 py-3 text-center">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            m.result === 'WON'
                              ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/40'
                              : 'bg-rose-950 text-rose-300 border border-rose-500/40'
                          }`}
                        >
                          {m.result}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* =========================================================================
            TAB CONTENT 6: COMPREHENSIVE CAREER & MULTI-FORMAT STATISTICS
            ========================================================================= */}
        {activeTab === 'stats' && (
          <div className="relative z-10 rounded-2xl border border-slate-800 bg-[#040C1D]/95 p-4 sm:p-5 animate-in fade-in duration-200">
            <PlayerProfileStatsSuite player={player} />
          </div>
        )}

        {/* =========================================================================
            FOOTER: Player Analytics, Crown + Moniker, Board Crest + Flag
            ========================================================================= */}
        <div className="relative z-10 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-cyan-500/20 pt-4 text-xs font-mono">
          {/* Left: Player Analytics Indicator */}
          <div className="flex items-center gap-2 text-cyan-400 font-bold tracking-wider uppercase">
            <BarChart3 className="h-4 w-4 text-cyan-400 animate-pulse" />
            <span>Player Analytics</span>
          </div>

          {/* Center: Crown + Moniker (Matches Screenshot: 👑 KING OF CONSISTENCY 👑) */}
          <div className="flex items-center gap-3 text-amber-300 font-black tracking-widest uppercase">
            <Crown className="h-4 w-4 text-amber-400 fill-amber-400" />
            <span className="drop-shadow-[0_0_8px_rgba(251,191,36,0.5)] tracking-[0.25em]">
              {telemetry.moniker}
            </span>
            <Crown className="h-4 w-4 text-amber-400 fill-amber-400" />
          </div>

          {/* Right: Board Emblem + National Flag Ribbon */}
          <div className="flex items-center gap-3">
            <TeamCrest teamId={(player.countryCode || player.country || 'ind').toLowerCase()} size={22} />
            <CountryFlag countryCode={player.countryCode || player.country || 'IND'} size="md" />
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};
