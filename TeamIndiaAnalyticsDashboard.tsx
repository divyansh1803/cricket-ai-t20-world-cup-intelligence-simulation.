import React, { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Player } from '../../types/cricket';
import { TEAMS } from '../../data/cricketData';
import { CountryFlag, TeamCrest, getRealTeamLogoUrl } from '../common/CricketIdentity';
import { resolvePlayerImageUrl, toSafeAssetUrl } from '../../data/playerImageCatalog';
import { cricketAudio } from '../../utils/audioSystem';
import {
  Trophy,
  Target,
  Zap,
  Activity,
  Award,
  Crown,
  Clock,
  Sparkles,
  ChevronRight,
  Shield,
  Layers,
  Flame,
  CheckCircle2,
  TrendingUp,
  FileText,
  BarChart3,
  X,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';

interface TeamIndiaAnalyticsDashboardProps {
  onClose?: () => void;
  isModal?: boolean;
}

interface TeamIndiaPlayerProfile {
  id: string;
  name: string;
  role: string;
  badge: string;
  rating: number;
  photoUrl: string;
  signature: string;
  runs: number;
  balls: number;
  strikeRate: number;
  average: number;
  fours: number;
  sixes: number;
  longestSix: number;
  scoringBias: { off: number; leg: number };
  clutchChase: number;
  form: string[];
  zones: Array<{
    name: string;
    pct: number;
    runs: number;
    sr: number;
    color: string;
    angleDeg: number;
  }>;
  matchLogs: Array<{
    date: string;
    opponent: string;
    venue: string;
    runs: number;
    balls: number;
    sr: number;
    dismissal: string;
    result: string;
  }>;
}

const TOP_INDIA_PLAYERS: TeamIndiaPlayerProfile[] = [
  {
    id: 'rohit',
    name: 'Rohit Sharma',
    role: 'Captain & Opening Batter',
    badge: 'CAPTAIN',
    rating: 894,
    photoUrl: '/players/rohit_sharma.jpg',
    signature: 'Rohit Sharma',
    runs: 4231,
    balls: 3003,
    strikeRate: 140.9,
    average: 32.1,
    fours: 383,
    sixes: 205,
    longestSix: 98,
    scoringBias: { off: 42, leg: 58 },
    clutchChase: 92,
    form: ['92 (41)', '57 (39)', '23 (11)', '48 (28)', '121 (69)'],
    zones: [
      { name: 'Mid-Wicket', pct: 28, runs: 1184, sr: 165.2, color: '#06b6d4', angleDeg: 135 },
      { name: 'Cover Drive', pct: 22, runs: 930, sr: 148.6, color: '#3b82f6', angleDeg: 45 },
      { name: 'Square Leg', pct: 19, runs: 804, sr: 172.0, color: '#10b981', angleDeg: 160 },
      { name: 'Long On', pct: 14, runs: 592, sr: 154.2, color: '#f59e0b', angleDeg: 100 },
      { name: 'Third Man', pct: 10, runs: 423, sr: 132.8, color: '#8b5cf6', angleDeg: 315 },
      { name: 'Long Off', pct: 7, runs: 298, sr: 138.4, color: '#ec4899', angleDeg: 80 },
    ],
    matchLogs: [
      { date: '2024-06-24', opponent: 'Australia', venue: 'St Lucia', runs: 92, balls: 41, sr: 224.4, dismissal: 'b Starc', result: 'WON' },
      { date: '2024-06-27', opponent: 'England', venue: 'Guyana', runs: 57, balls: 39, sr: 146.2, dismissal: 'b Rashid', result: 'WON' },
      { date: '2024-06-29', opponent: 'South Africa', venue: 'Barbados', runs: 9, balls: 5, sr: 180.0, dismissal: 'c Klaasen b Maharaj', result: 'WON' },
      { date: '2024-06-22', opponent: 'Bangladesh', venue: 'Antigua', runs: 23, balls: 11, sr: 209.1, dismissal: 'c Jaker b Shakib', result: 'WON' },
      { date: '2024-06-20', opponent: 'Afghanistan', venue: 'Barbados', runs: 8, balls: 13, sr: 61.5, dismissal: 'c Rashid b Fazalhaq', result: 'WON' },
    ],
  },
  {
    id: 'vkohli',
    name: 'Virat Kohli',
    role: 'Top-Order Anchor & Finisher',
    badge: 'LEGEND',
    rating: 915,
    photoUrl: '/players/virat_kohli.jpg',
    signature: 'Virat Kohli',
    runs: 4188,
    balls: 3057,
    strikeRate: 137.0,
    average: 48.7,
    fours: 369,
    sixes: 124,
    longestSix: 94,
    scoringBias: { off: 54, leg: 46 },
    clutchChase: 99,
    form: ['76 (59)', '37 (28)', '24 (16)', '18 (15)', '82 (53)'],
    zones: [
      { name: 'Cover Drive', pct: 32, runs: 1340, sr: 148.2, color: '#3b82f6', angleDeg: 45 },
      { name: 'Mid-Wicket', pct: 24, runs: 1005, sr: 142.6, color: '#06b6d4', angleDeg: 135 },
      { name: 'Long On', pct: 18, runs: 754, sr: 156.4, color: '#f59e0b', angleDeg: 100 },
      { name: 'Long Off', pct: 13, runs: 544, sr: 138.0, color: '#ec4899', angleDeg: 80 },
      { name: 'Third Man', pct: 8, runs: 335, sr: 122.5, color: '#8b5cf6', angleDeg: 315 },
      { name: 'Square Leg', pct: 5, runs: 210, sr: 131.0, color: '#10b981', angleDeg: 160 },
    ],
    matchLogs: [
      { date: '2024-06-29', opponent: 'South Africa', venue: 'Barbados', runs: 76, balls: 59, sr: 128.8, dismissal: 'c Rabada b Jansen', result: 'WON' },
      { date: '2024-06-24', opponent: 'Australia', venue: 'St Lucia', runs: 0, balls: 5, sr: 0.0, dismissal: 'c David b Hazlewood', result: 'WON' },
      { date: '2024-06-22', opponent: 'Bangladesh', venue: 'Antigua', runs: 37, balls: 28, sr: 132.1, dismissal: 'b Tanzim', result: 'WON' },
      { date: '2024-06-20', opponent: 'Afghanistan', venue: 'Barbados', runs: 24, balls: 24, sr: 100.0, dismissal: 'c Nabi b Rashid', result: 'WON' },
      { date: '2024-06-12', opponent: 'USA', venue: 'New York', runs: 0, balls: 1, sr: 0.0, dismissal: 'c Netravalkar', result: 'WON' },
    ],
  },
  {
    id: 'bumrah',
    name: 'Jasprit Bumrah',
    role: 'Premier Strike Bowler',
    badge: 'BOWLING GENIUS',
    rating: 928,
    photoUrl: '/players/jasprit_bumrah.jpg',
    signature: 'Jasprit Bumrah',
    runs: 48,
    balls: 62,
    strikeRate: 77.4,
    average: 6.8,
    fours: 4,
    sixes: 1,
    longestSix: 82,
    scoringBias: { off: 35, leg: 65 },
    clutchChase: 98,
    form: ['2/18 (4.0)', '2/12 (4.0)', '3/7 (4.0)', '1/13 (4.0)', '2/22 (4.0)'],
    zones: [
      { name: 'Mid-Wicket', pct: 35, runs: 17, sr: 95.0, color: '#06b6d4', angleDeg: 135 },
      { name: 'Third Man', pct: 25, runs: 12, sr: 80.0, color: '#8b5cf6', angleDeg: 315 },
      { name: 'Cover', pct: 20, runs: 10, sr: 72.0, color: '#3b82f6', angleDeg: 45 },
      { name: 'Square Leg', pct: 20, runs: 9, sr: 70.0, color: '#10b981', angleDeg: 160 },
    ],
    matchLogs: [
      { date: '2024-06-29', opponent: 'South Africa', venue: 'Barbados', runs: 2, balls: 4, sr: 50.0, dismissal: 'not out', result: 'WON' },
      { date: '2024-06-27', opponent: 'England', venue: 'Guyana', runs: 0, balls: 0, sr: 0.0, dismissal: 'dnb', result: 'WON' },
      { date: '2024-06-24', opponent: 'Australia', venue: 'St Lucia', runs: 0, balls: 0, sr: 0.0, dismissal: 'dnb', result: 'WON' },
      { date: '2024-06-20', opponent: 'Afghanistan', venue: 'Barbados', runs: 0, balls: 0, sr: 0.0, dismissal: 'dnb', result: 'WON' },
      { date: '2024-06-09', opponent: 'Pakistan', venue: 'New York', runs: 0, balls: 1, sr: 0.0, dismissal: 'b Rauf', result: 'WON' },
    ],
  },
  {
    id: 'hardik',
    name: 'Hardik Pandya',
    role: 'Vice-Captain & Pace All-Rounder',
    badge: 'VICE-CAPTAIN',
    rating: 864,
    photoUrl: '/players/hardik_pandya.jpg',
    signature: 'Hardik Pandya',
    runs: 1641,
    balls: 1162,
    strikeRate: 141.2,
    average: 27.8,
    fours: 122,
    sixes: 81,
    longestSix: 102,
    scoringBias: { off: 38, leg: 62 },
    clutchChase: 94,
    form: ['20* (12) + 3/20', '23 (12) + 2/14', '50* (27) + 1/32', '32 (24) + 2/24', '46 (23)'],
    zones: [
      { name: 'Mid-Wicket', pct: 34, runs: 558, sr: 168.0, color: '#06b6d4', angleDeg: 135 },
      { name: 'Long On', pct: 26, runs: 427, sr: 175.5, color: '#f59e0b', angleDeg: 100 },
      { name: 'Cover Drive', pct: 16, runs: 263, sr: 135.0, color: '#3b82f6', angleDeg: 45 },
      { name: 'Square Leg', pct: 12, runs: 197, sr: 145.0, color: '#10b981', angleDeg: 160 },
      { name: 'Long Off', pct: 8, runs: 131, sr: 142.0, color: '#ec4899', angleDeg: 80 },
      { name: 'Third Man', pct: 4, runs: 65, sr: 110.0, color: '#8b5cf6', angleDeg: 315 },
    ],
    matchLogs: [
      { date: '2024-06-29', opponent: 'South Africa', venue: 'Barbados', runs: 5, balls: 2, sr: 250.0, dismissal: 'c Klaasen', result: 'WON' },
      { date: '2024-06-27', opponent: 'England', venue: 'Guyana', runs: 23, balls: 13, sr: 176.9, dismissal: 'c Brook b Jordan', result: 'WON' },
      { date: '2024-06-24', opponent: 'Australia', venue: 'St Lucia', runs: 27, balls: 17, sr: 158.8, dismissal: 'not out', result: 'WON' },
      { date: '2024-06-22', opponent: 'Bangladesh', venue: 'Antigua', runs: 50, balls: 27, sr: 185.2, dismissal: 'not out', result: 'WON' },
      { date: '2024-06-20', opponent: 'Afghanistan', venue: 'Barbados', runs: 32, balls: 24, sr: 133.3, dismissal: 'c Azmatullah b Naveen', result: 'WON' },
    ],
  },
];

export const TeamIndiaAnalyticsDashboard: React.FC<TeamIndiaAnalyticsDashboardProps> = ({
  onClose,
  isModal = false,
}) => {
  const [selectedPlayerId, setSelectedPlayerId] = useState<string>('rohit');
  const [activeTab, setActiveTab] = useState<'wagon' | 'form' | 'longevity' | 'phase' | 'logs'>('wagon');
  const [selectedZoneName, setSelectedZoneName] = useState<string>('Mid-Wicket');

  const allIndiaProfiles: TeamIndiaPlayerProfile[] = useMemo(() => {
    const indTeam = TEAMS.find((t) => t.id === 'ind') || TEAMS[0];
    const presetMap = new Map(TOP_INDIA_PLAYERS.map((p) => [p.id, p]));
    const fullList: TeamIndiaPlayerProfile[] = [...TOP_INDIA_PLAYERS];

    for (const sp of indTeam.squad) {
      if (presetMap.has(sp.id)) continue;
      const runs = Math.max(24, sp.stats.runs || 420);
      const sr = sp.stats.strikeRate || 138.5;
      const balls = Math.max(20, Math.round((runs / Math.max(80, sr)) * 100));
      const fours = Math.max(2, Math.round(runs * 0.085));
      const sixes = Math.max(1, Math.round(runs * 0.045));
      fullList.push({
        id: sp.id,
        name: sp.name,
        role: sp.role,
        badge: sp.isKeyPlayer ? 'STAR XI' : 'SQUAD',
        rating: Math.round(740 + (sp.rating - 80) * 9),
        photoUrl: resolvePlayerImageUrl(sp),
        signature: sp.name,
        runs: sp.stats.runs,
        balls,
        strikeRate: sr,
        average: sp.stats.average || 28.4,
        fours,
        sixes,
        longestSix: sp.role.includes('Bowler') ? 84 : 96,
        scoringBias: { off: 46, leg: 54 },
        clutchChase: Math.min(98, Math.max(82, sp.rating)),
        form: sp.stats.wickets > 10 && sp.stats.runs < 350
          ? ['3/19 (4.0)', '2/24 (4.0)', '2/17 (4.0)', '1/26 (4.0)', '3/21 (4.0)']
          : ['54 (31)', '42* (24)', '31 (19)', '68 (39)', '29 (17)'],
        zones: [
          { name: 'Mid-Wicket', pct: 29, runs: Math.round(runs * 0.29), sr: Number((sr * 1.12).toFixed(1)), color: '#06b6d4', angleDeg: 135 },
          { name: 'Cover Drive', pct: 24, runs: Math.round(runs * 0.24), sr: Number((sr * 1.04).toFixed(1)), color: '#3b82f6', angleDeg: 45 },
          { name: 'Square Leg', pct: 18, runs: Math.round(runs * 0.18), sr: Number((sr * 1.08).toFixed(1)), color: '#10b981', angleDeg: 160 },
          { name: 'Long On', pct: 14, runs: Math.round(runs * 0.14), sr: Number((sr * 1.02).toFixed(1)), color: '#f59e0b', angleDeg: 100 },
          { name: 'Third Man', pct: 9, runs: Math.round(runs * 0.09), sr: Number((sr * 0.92).toFixed(1)), color: '#8b5cf6', angleDeg: 315 },
          { name: 'Long Off', pct: 6, runs: Math.round(runs * 0.06), sr: Number((sr * 0.96).toFixed(1)), color: '#ec4899', angleDeg: 80 },
        ],
        matchLogs: [
          { date: '2024-06-29', opponent: 'South Africa', venue: 'Barbados', runs: 34, balls: 21, sr: 161.9, dismissal: 'not out', result: 'WON' },
          { date: '2024-06-27', opponent: 'England', venue: 'Guyana', runs: 47, balls: 32, sr: 146.9, dismissal: 'c Buttler b Archer', result: 'WON' },
          { date: '2024-06-24', opponent: 'Australia', venue: 'St Lucia', runs: 31, balls: 18, sr: 172.2, dismissal: 'c Warner b Starc', result: 'WON' },
          { date: '2024-06-22', opponent: 'Bangladesh', venue: 'Antigua', runs: 28, balls: 19, sr: 147.4, dismissal: 'not out', result: 'WON' },
          { date: '2024-06-20', opponent: 'Afghanistan', venue: 'Barbados', runs: 53, balls: 28, sr: 189.3, dismissal: 'c Nabi b Rashid', result: 'WON' },
        ],
      });
    }
    return fullList;
  }, []);

  const selectedPlayer = useMemo(
    () => allIndiaProfiles.find((p) => p.id === selectedPlayerId) || allIndiaProfiles[0],
    [allIndiaProfiles, selectedPlayerId]
  );

  const activeZone = useMemo(
    () => selectedPlayer.zones.find((z) => z.name === selectedZoneName) || selectedPlayer.zones[0],
    [selectedPlayer, selectedZoneName]
  );

  // Lock background scroll when opened as modal
  useEffect(() => {
    if (!isModal) return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && onClose) onClose();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isModal, onClose]);

  const longevityData = [
    { year: '2024', strikeRate: Math.round(selectedPlayer.strikeRate * 1.05), average: Math.round(selectedPlayer.average * 1.08) },
    { year: '2025', strikeRate: Math.round(selectedPlayer.strikeRate * 1.02), average: Math.round(selectedPlayer.average * 1.01) },
    { year: '2026', strikeRate: Math.round(selectedPlayer.strikeRate), average: Math.round(selectedPlayer.average) },
  ];

  const content = (
    <div className="relative rounded-3xl border border-cyan-500/40 bg-gradient-to-b from-[#020614]/98 via-[#040f2b]/95 to-[#01040e]/98 p-5 sm:p-7 md:p-8 shadow-[0_25px_70px_rgba(0,0,0,0.9),0_0_55px_rgba(6,182,212,0.22)] backdrop-blur-2xl text-slate-100 space-y-6 overflow-hidden select-none">
      
      {/* Background Stadium Atmosphere & Floodlights */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden select-none">
        <div className="absolute -top-32 left-1/4 h-80 w-96 rounded-full bg-cyan-500/15 blur-3xl animate-atmospheric-drift" />
        <div className="absolute top-1/2 -right-24 h-80 w-80 rounded-full bg-blue-600/15 blur-3xl" />
        <div className="absolute bottom-0 inset-x-0 h-40 bg-gradient-to-t from-[#01040e] to-transparent" />
      </div>

      {/* =========================================================================
          TOP PLAYER CARDS: Rohit Sharma, Virat Kohli, Jasprit Bumrah, Hardik Pandya
          ========================================================================= */}
      <div className="relative z-10 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CountryFlag countryCode="ind" size="md" />
            <span className="text-xs font-mono font-bold tracking-widest text-cyan-400 uppercase">
              TEAM INDIA FULL {allIndiaProfiles.length}-PLAYER SQUAD · ICC CHAMPIONS
            </span>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="rounded-xl border border-slate-800 bg-slate-900/90 p-2 text-slate-400 hover:text-white transition-colors cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 max-h-[290px] overflow-y-auto pr-1">
          {allIndiaProfiles.map((player) => {
            const isSelected = player.id === selectedPlayerId;
            return (
              <button
                key={player.id}
                onClick={() => {
                  setSelectedPlayerId(player.id);
                  cricketAudio.playBatHit();
                }}
                className={`relative rounded-2xl p-3 text-left transition-all duration-300 cursor-pointer overflow-hidden border ${
                  isSelected
                    ? 'border-cyan-400 bg-gradient-to-b from-[#08204d] to-[#030d24] shadow-[0_0_28px_rgba(6,182,212,0.5),inset_0_1px_0_rgba(255,255,255,0.2)] ring-1 ring-cyan-300'
                    : 'border-cyan-500/20 bg-[#03091e]/85 hover:border-cyan-400/60 hover:shadow-[0_0_20px_rgba(6,182,212,0.25)] hover:bg-[#051436]/85 text-slate-400 hover:text-white'
                }`}
              >
                {/* Active Indicator Strip */}
                {isSelected && (
                  <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-cyan-400 via-sky-300 to-blue-500 shadow-[0_0_12px_#22d3ee]" />
                )}

                {/* Top Badge & Flag */}
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[9px] font-mono font-black uppercase px-2 py-0.5 rounded-full bg-cyan-500/15 border border-cyan-400/50 text-cyan-300">
                    {player.badge}
                  </span>
                  <CountryFlag countryCode="ind" size="sm" />
                </div>

                {/* Portrait & Core Stats */}
                <div className="flex items-center gap-2.5">
                  <div
                    className={`relative h-11 w-11 rounded-xl overflow-hidden border-2 shrink-0 bg-slate-950 ${
                      isSelected ? 'border-cyan-300 shadow-[0_0_14px_rgba(6,182,212,0.6)]' : 'border-slate-700'
                    }`}
                  >
                    <img
                      src={toSafeAssetUrl(player.photoUrl)}
                      alt={player.name}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover object-top"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = '/players/rohit_sharma.jpg';
                      }}
                    />
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-xs font-bold text-white truncate">{player.name}</h4>
                    <p className="text-[10px] text-slate-400 font-mono truncate">{player.role}</p>
                    <span className="text-[10px] font-mono font-black text-amber-400 tabular-nums">
                      ICC {player.rating}
                    </span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* =========================================================================
          HERO PROFILE + TEAM MANAGEMENT PANEL (Two Top Columns)
          ========================================================================= */}
      <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        
        {/* HERO PROFILE: Portrait, Indian Flag Backdrop, Career Stats (7 Cols) */}
        <div className="lg:col-span-7 relative rounded-3xl border border-cyan-500/35 bg-gradient-to-r from-[#03091e]/90 via-[#05143a]/85 to-[#020718]/90 p-5 sm:p-6 shadow-xl overflow-hidden flex flex-col sm:flex-row items-center gap-6">
          {/* Subtle Tricolor Glow in background */}
          <div className="absolute inset-0 opacity-15 pointer-events-none bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-orange-500 via-transparent to-green-600" />

          {/* Large High-Quality Player Portrait with Cursive Signature */}
          <div className="relative w-44 h-52 sm:w-48 sm:h-56 rounded-2xl p-1 bg-gradient-to-b from-cyan-400 via-sky-600 to-blue-900 shadow-[0_0_30px_rgba(6,182,212,0.4)] shrink-0">
            <div className="relative w-full h-full rounded-[14px] overflow-hidden bg-slate-950 border border-white/20">
              <img
                src={toSafeAssetUrl(selectedPlayer.photoUrl)}
                alt={selectedPlayer.name}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover object-top"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = '/players/rohit_sharma.jpg';
                }}
              />
              <div className="absolute bottom-1 right-2 pointer-events-none">
                <span
                  className="text-xs sm:text-sm font-semibold tracking-wider text-cyan-200/90 drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)] italic"
                  style={{ fontFamily: "'Brush Script MT', 'Dancing Script', cursive" }}
                >
                  {selectedPlayer.signature}
                </span>
              </div>
              <div className="absolute top-2 left-2">
                <CountryFlag countryCode="ind" size="sm" />
              </div>
            </div>
          </div>

          {/* Stats & Leadership Profile */}
          <div className="space-y-3 flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-amber-400 text-slate-950 px-2.5 py-0.5 text-[10px] font-mono font-black shadow">
                🏅 {selectedPlayer.badge}
              </span>
              <span className="text-xs font-mono font-bold text-cyan-300">
                ICC Rank Rating: {selectedPlayer.rating}
              </span>
            </div>

            <div>
              <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight leading-none">
                {selectedPlayer.name}
              </h2>
              <p className="text-xs text-slate-400 font-mono mt-1">{selectedPlayer.role} · Team India</p>
            </div>

            {/* Core Stats Quad Grid */}
            <div className="grid grid-cols-3 gap-2 text-xs font-mono">
              <div className="bg-[#020718]/85 border border-cyan-500/25 p-2 rounded-xl text-center">
                <span className="text-[10px] text-slate-400 uppercase block">Total Runs</span>
                <span className="text-base font-black text-white">{selectedPlayer.runs.toLocaleString()}</span>
              </div>
              <div className="bg-[#020718]/85 border border-cyan-500/25 p-2 rounded-xl text-center">
                <span className="text-[10px] text-slate-400 uppercase block">Strike Rate</span>
                <span className="text-base font-black text-cyan-300">{selectedPlayer.strikeRate.toFixed(1)}</span>
              </div>
              <div className="bg-[#020718]/85 border border-cyan-500/25 p-2 rounded-xl text-center">
                <span className="text-[10px] text-slate-400 uppercase block">Bat Average</span>
                <span className="text-base font-black text-emerald-400">{selectedPlayer.average.toFixed(1)}</span>
              </div>
            </div>

            <div className="flex items-center gap-4 text-xs font-mono text-slate-300 pt-1">
              <span>Boundaries: <strong className="text-amber-400 font-bold">{selectedPlayer.fours}x 4s</strong> · <strong className="text-purple-400 font-bold">{selectedPlayer.sixes}x 6s</strong></span>
              <span>Longest: <strong className="text-cyan-300 font-bold">{selectedPlayer.longestSix}m</strong></span>
            </div>
          </div>
        </div>

        {/* TEAM MANAGEMENT PANEL: Official BCCI Logo, Coaches & Team Identity (5 Cols) */}
        <div className="lg:col-span-5 relative rounded-3xl border border-cyan-500/35 bg-gradient-to-b from-[#03091e]/90 to-[#020612]/95 p-5 sm:p-6 shadow-xl flex flex-col justify-between space-y-4">
          <div className="flex items-center justify-between border-b border-cyan-500/20 pb-3">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 flex items-center justify-center p-1 rounded-xl bg-amber-400/10 border border-amber-400/30 shadow-[0_0_15px_rgba(245,158,11,0.3)]">
                <img
                  src={toSafeAssetUrl(getRealTeamLogoUrl('ind') || '/logos/bcci.svg')}
                  alt="BCCI Emblem"
                  referrerPolicy="no-referrer"
                  className="h-full w-full object-contain"
                />
              </div>
              <div>
                <span className="text-[10px] font-mono font-bold text-cyan-400 uppercase block">GOVERNING BODY</span>
                <h3 className="text-sm font-black text-white">BCCI · BOARD OF CONTROL FOR CRICKET IN INDIA</h3>
              </div>
            </div>
            <CountryFlag countryCode="ind" size="md" />
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs font-mono">
            <div className="bg-[#020718]/85 border border-slate-800 p-2.5 rounded-xl">
              <span className="text-[10px] text-slate-500 uppercase block font-bold">Head Coach</span>
              <span className="font-bold text-white text-sm">Rahul Dravid</span>
              <span className="text-[10px] text-slate-400 block mt-0.5">T20 World Cup Champion</span>
            </div>
            <div className="bg-[#020718]/85 border border-slate-800 p-2.5 rounded-xl">
              <span className="text-[10px] text-slate-500 uppercase block font-bold">Bowling Coach</span>
              <span className="font-bold text-white text-sm">Paras Mhambrey</span>
              <span className="text-[10px] text-slate-400 block mt-0.5">Pace Precision Specialist</span>
            </div>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-cyan-500/15 text-xs font-mono">
            <div>
              <span className="text-slate-400">T20I Win Rate:</span>
              <strong className="text-emerald-400 font-bold ml-1.5">74.2% (Last 3 Years)</strong>
            </div>
            <div className="flex items-center gap-1.5 text-amber-300 font-bold">
              <Trophy className="h-3.5 w-3.5 text-amber-400" />
              <span>ICC RANK #1</span>
            </div>
          </div>
        </div>
      </div>

      {/* =========================================================================
          ANALYTICS NAVIGATION TABS: 360° Wagon Wheel, 5-Match Form, Longevity, etc.
          ========================================================================= */}
      <div className="relative z-10 flex flex-wrap items-center gap-1.5 border-b border-cyan-500/20 pb-3 text-xs font-mono">
        <button
          onClick={() => setActiveTab('wagon')}
          className={`flex items-center gap-1.5 rounded-xl px-4 py-2 font-bold transition-all cursor-pointer ${
            activeTab === 'wagon'
              ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/25'
              : 'bg-[#020718] text-slate-400 hover:text-white'
          }`}
        >
          <Target className="h-3.5 w-3.5" />
          <span>360° Wagon Wheel</span>
        </button>
        <button
          onClick={() => setActiveTab('form')}
          className={`flex items-center gap-1.5 rounded-xl px-4 py-2 font-bold transition-all cursor-pointer ${
            activeTab === 'form'
              ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/25'
              : 'bg-[#020718] text-slate-400 hover:text-white'
          }`}
        >
          <TrendingUp className="h-3.5 w-3.5" />
          <span>5-Match Form</span>
        </button>
        <button
          onClick={() => setActiveTab('longevity')}
          className={`flex items-center gap-1.5 rounded-xl px-4 py-2 font-bold transition-all cursor-pointer ${
            activeTab === 'longevity'
              ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/25'
              : 'bg-[#020718] text-slate-400 hover:text-white'
          }`}
        >
          <Clock className="h-3.5 w-3.5" />
          <span>Longevity (3-Yr SR)</span>
        </button>
        <button
          onClick={() => setActiveTab('phase')}
          className={`flex items-center gap-1.5 rounded-xl px-4 py-2 font-bold transition-all cursor-pointer ${
            activeTab === 'phase'
              ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/25'
              : 'bg-[#020718] text-slate-400 hover:text-white'
          }`}
        >
          <Zap className="h-3.5 w-3.5" />
          <span>Phase Performance</span>
        </button>
        <button
          onClick={() => setActiveTab('logs')}
          className={`flex items-center gap-1.5 rounded-xl px-4 py-2 font-bold transition-all cursor-pointer ${
            activeTab === 'logs'
              ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/25'
              : 'bg-[#020718] text-slate-400 hover:text-white'
          }`}
        >
          <FileText className="h-3.5 w-3.5" />
          <span>Match Logs</span>
        </button>
      </div>

      {/* =========================================================================
          TAB 1: 360° WAGON WHEEL & RIGHT ANALYTICS PANEL (Centerpiece)
          ========================================================================= */}
      {activeTab === 'wagon' && (
        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-6 items-center animate-in fade-in duration-300">
          
          {/* Circular Cricket Ground Wagon Wheel (7 Cols) */}
          <div className="lg:col-span-7 rounded-3xl border border-cyan-500/35 bg-[#020718]/90 p-5 shadow-2xl flex flex-col items-center justify-center relative overflow-hidden">
            <span className="text-[11px] font-mono font-bold text-cyan-400 uppercase tracking-wider mb-2">
              360° SCORING ZONE BREAKDOWN & BOUNDARY RAYS
            </span>

            {/* Circular SVG Cricket Field */}
            <div className="relative w-72 h-72 sm:w-84 sm:h-84 md:w-96 md:h-96">
              <svg viewBox="0 0 400 400" className="w-full h-full">
                {/* Outfield Grass Ring */}
                <circle cx="200" cy="200" r="185" fill="#042116" stroke="#065f46" strokeWidth="2" opacity="0.8" />
                {/* 30-Yard Circle */}
                <circle cx="200" cy="200" r="115" fill="none" stroke="#22d3ee" strokeWidth="1.5" strokeDasharray="5 4" opacity="0.6" />
                {/* Pitch Strip in center */}
                <rect x="194" y="170" width="12" height="60" fill="#92400e" stroke="#f59e0b" strokeWidth="1" rx="2" />
                <rect x="196" y="195" width="8" height="10" fill="#ffffff" opacity="0.3" />

                {/* Shot Trajectory Rays */}
                {selectedPlayer.zones.map((zone, idx) => {
                  const rad = (zone.angleDeg * Math.PI) / 180;
                  const endX = 200 + Math.cos(rad) * 175;
                  const endY = 200 + Math.sin(rad) * 175;
                  const isZoneActive = zone.name === selectedZoneName;

                  return (
                    <g key={idx} onClick={() => setSelectedZoneName(zone.name)} className="cursor-pointer group">
                      {/* Shot Ray Line */}
                      <line
                        x1="200"
                        y1="200"
                        x2={endX}
                        y2={endY}
                        stroke={zone.color}
                        strokeWidth={isZoneActive ? 3.5 : 1.8}
                        strokeDasharray={isZoneActive ? "" : "4 2"}
                        opacity={isZoneActive ? 1 : 0.6}
                      />
                      {/* Boundary Endpoint Marker */}
                      <circle
                        cx={endX}
                        cy={endY}
                        r={isZoneActive ? 7 : 4}
                        fill={zone.color}
                        stroke="#ffffff"
                        strokeWidth="1.5"
                        filter={isZoneActive ? "drop-shadow(0 0 6px currentColor)" : ""}
                      />
                    </g>
                  );
                })}

                {/* Stumps Marker in Center */}
                <circle cx="200" cy="200" r="4" fill="#f59e0b" />
              </svg>

              {/* Floating Interactive Sector Buttons Around Perimeter */}
              {selectedPlayer.zones.map((z, idx) => (
                <button
                  key={idx}
                  onClick={() => setSelectedZoneName(z.name)}
                  className={`absolute rounded-full px-2 py-0.5 text-[9px] sm:text-[10px] font-mono font-bold transition-all cursor-pointer ${
                    z.name === selectedZoneName
                      ? 'bg-cyan-400 text-slate-950 font-black shadow-[0_0_12px_rgba(34,211,238,0.8)] scale-110 z-20'
                      : 'bg-slate-950/85 border border-slate-700 text-slate-300 hover:text-white'
                  }`}
                  style={{
                    top: `${48 + Math.sin((z.angleDeg * Math.PI) / 180) * 40}%`,
                    left: `${46 + Math.cos((z.angleDeg * Math.PI) / 180) * 40}%`,
                  }}
                >
                  {z.name}: {z.pct}%
                </button>
              ))}
            </div>

            <div className="mt-3 flex items-center gap-4 text-xs font-mono text-slate-400">
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-cyan-400" />
                <span>Selected: <strong className="text-white">{activeZone.name}</strong></span>
              </span>
              <span>Volume: <strong className="text-cyan-300">{activeZone.pct}%</strong></span>
              <span>Runs: <strong className="text-white">{activeZone.runs}</strong></span>
            </div>
          </div>

          {/* Right Analytics Panel: Hawk-Eye Trajectory & Sector Inspector (5 Cols) */}
          <div className="lg:col-span-5 space-y-4">
            {/* Active Zone Inspector Card */}
            <div className="rounded-2xl border border-cyan-500/35 bg-[#03091e]/90 p-5 space-y-3 shadow-xl">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div>
                  <span className="text-[10px] font-mono text-cyan-400 uppercase font-bold block">
                    SECTOR INTELLIGENCE
                  </span>
                  <h4 className="text-lg font-black text-white">{activeZone.name}</h4>
                </div>
                <span className="text-2xl font-black font-mono text-cyan-300">{activeZone.pct}%</span>
              </div>

              <div className="space-y-2 text-xs font-mono">
                <div className="flex justify-between text-slate-300">
                  <span>Zone Strike Rate:</span>
                  <strong className="text-cyan-400 text-sm">{activeZone.sr.toFixed(1)}</strong>
                </div>
                <div className="flex justify-between text-slate-300">
                  <span>Runs Accumulated:</span>
                  <strong className="text-white">{activeZone.runs} runs</strong>
                </div>
                <div className="flex justify-between text-slate-300">
                  <span>Scoring Bias:</span>
                  <strong className="text-amber-400">
                    Off {selectedPlayer.scoringBias.off}% / Leg {selectedPlayer.scoringBias.leg}%
                  </strong>
                </div>
                <div className="flex justify-between text-slate-300">
                  <span>Clutch Chase Index:</span>
                  <strong className="text-emerald-400">{selectedPlayer.clutchChase} / 100</strong>
                </div>
              </div>
            </div>

            {/* Hawk-Eye Trajectory Telemetry Pod */}
            <div className="rounded-2xl border border-cyan-500/35 bg-[#03091e]/90 p-5 space-y-3 shadow-xl">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-bold text-cyan-400 uppercase tracking-wider">
                  HAWK-EYE TRAJECTORY TELEMETRY
                </span>
                <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800">
                  <span className="text-[10px] text-slate-400 block">LONG BOUNDARY</span>
                  <span className="text-base font-black text-white">{selectedPlayer.longestSix}m</span>
                </div>
                <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800">
                  <span className="text-[10px] text-slate-400 block">BOUNDARY FREQ</span>
                  <span className="text-base font-black text-amber-400">Every 4.2 balls</span>
                </div>
                <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800">
                  <span className="text-[10px] text-slate-400 block">POWERPLAY SR</span>
                  <span className="text-base font-black text-sky-400">144.2</span>
                </div>
                <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800">
                  <span className="text-[10px] text-slate-400 block">DEATH OVER SR</span>
                  <span className="text-base font-black text-rose-400">208.6</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: 5-Match Form */}
      {activeTab === 'form' && (
        <div className="grid grid-cols-1 sm:grid-cols-5 gap-3 animate-in fade-in duration-200">
          {selectedPlayer.form.map((entry, idx) => (
            <div key={idx} className="rounded-2xl border border-cyan-500/30 bg-[#03091e]/90 p-4 space-y-2 text-center font-mono">
              <span className="text-[10px] text-cyan-400 uppercase font-bold block">Match M{idx + 1}</span>
              <div className="text-xl font-black text-white">{entry}</div>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-bold border border-emerald-500/30">
                MATCH WINNER
              </span>
            </div>
          ))}
        </div>
      )}

      {/* TAB 3: Longevity */}
      {activeTab === 'longevity' && (
        <div className="rounded-2xl border border-cyan-500/30 bg-[#03091e]/90 p-5 space-y-4 animate-in fade-in duration-200">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-bold text-white flex items-center gap-2">
              <Clock className="h-4 w-4 text-cyan-400" />
              <span>3-Year Strike Rate & Average Evolution (2024 - 2026)</span>
            </h4>
          </div>
          <div className="h-60 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={longevityData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="year" stroke="#64748b" />
                <YAxis stroke="#64748b" />
                <Tooltip contentStyle={{ backgroundColor: '#020617', borderColor: '#06b6d4', borderRadius: '12px' }} />
                <Bar dataKey="strikeRate" fill="#06b6d4" name="Strike Rate" radius={[6, 6, 0, 0]} />
                <Bar dataKey="average" fill="#10b981" name="Average" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* TAB 4: Phase Performance */}
      {activeTab === 'phase' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 animate-in fade-in duration-200">
          <div className="rounded-2xl border border-cyan-500/30 bg-[#03091e]/90 p-5 space-y-3 font-mono">
            <span className="text-xs font-bold text-cyan-400 uppercase block">1. Powerplay (Overs 1-6)</span>
            <div className="text-2xl font-black text-white">SR 144.2</div>
            <p className="text-xs text-slate-400">High-tempo boundary exploitation over slips and covers.</p>
          </div>
          <div className="rounded-2xl border border-cyan-500/30 bg-[#03091e]/90 p-5 space-y-3 font-mono">
            <span className="text-xs font-bold text-sky-400 uppercase block">2. Middle Overs (Overs 7-15)</span>
            <div className="text-2xl font-black text-white">SR 136.8</div>
            <p className="text-xs text-slate-400">Strike rotation and calculated boundary hitting against spin.</p>
          </div>
          <div className="rounded-2xl border border-cyan-500/30 bg-[#03091e]/90 p-5 space-y-3 font-mono">
            <span className="text-xs font-bold text-rose-400 uppercase block">3. Death Overs (Overs 16-20)</span>
            <div className="text-2xl font-black text-white">SR 208.6</div>
            <p className="text-xs text-slate-400">Maximum execution over mid-wicket and fine leg boundary.</p>
          </div>
        </div>
      )}

      {/* TAB 5: Match Logs */}
      {activeTab === 'logs' && (
        <div className="rounded-2xl border border-cyan-500/30 bg-[#020718] overflow-hidden shadow-inner animate-in fade-in duration-200">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-[#03091e] border-b border-slate-800 text-slate-400 uppercase text-[11px]">
              <tr>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Opponent</th>
                <th className="px-4 py-3">Venue</th>
                <th className="px-4 py-3 text-right">Runs</th>
                <th className="px-4 py-3 text-right">Balls</th>
                <th className="px-4 py-3 text-right">SR</th>
                <th className="px-4 py-3">Dismissal</th>
                <th className="px-4 py-3 text-center">Result</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80 text-slate-200">
              {selectedPlayer.matchLogs.map((log, idx) => (
                <tr key={idx} className="hover:bg-cyan-500/5 transition-colors">
                  <td className="px-4 py-3 text-slate-400">{log.date}</td>
                  <td className="px-4 py-3 font-bold text-white">{log.opponent}</td>
                  <td className="px-4 py-3 text-slate-300">{log.venue}</td>
                  <td className="px-4 py-3 text-right font-black text-cyan-300">{log.runs}</td>
                  <td className="px-4 py-3 text-right text-slate-400">{log.balls}</td>
                  <td className="px-4 py-3 text-right text-amber-300 font-bold">{log.sr.toFixed(1)}</td>
                  <td className="px-4 py-3 text-slate-400 text-[11px]">{log.dismissal}</td>
                  <td className="px-4 py-3 text-center">
                    <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-bold text-[10px]">
                      {log.result}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* =========================================================================
          BOTTOM BAR: Player Analytics, Match Winner Badge, BCCI & Flag Branding
          ========================================================================= */}
      <div className="relative z-10 flex flex-wrap items-center justify-between gap-4 border-t border-cyan-500/20 pt-4 text-xs font-mono">
        <div className="flex items-center gap-3">
          <div className="h-6 w-9 rounded-md overflow-hidden border border-white/20 shadow">
            <CountryFlag countryCode="ind" size="sm" className="w-full h-full object-cover" />
          </div>
          <span className="font-bold text-white">TEAM INDIA · OFFICIAL PERFORMANCE DOSSIER</span>
          <span className="rounded-full bg-cyan-500/15 border border-cyan-400/40 px-2.5 py-0.5 text-[10px] font-bold text-cyan-300">
            T20 WORLD CHAMPIONS
          </span>
        </div>

        <div className="flex items-center gap-3">
          <div className="h-6 w-6 flex items-center justify-center">
            <img src="/logos/ind.svg" alt="BCCI" className="h-full w-full object-contain" />
          </div>
          <span className="text-slate-400 text-[11px]">BCCI APPROVED CRICKET INTELLIGENCE</span>
        </div>
      </div>
    </div>
  );

  if (isModal) {
    return createPortal(
      <div
        className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/85 p-2 sm:p-4 backdrop-blur-xl overflow-y-auto animate-in fade-in duration-200"
        onClick={(e) => {
          if (e.target === e.currentTarget && onClose) onClose();
        }}
      >
        <div className="relative w-full max-w-6xl max-h-[94vh] overflow-y-auto">
          {content}
        </div>
      </div>,
      document.body
    );
  }

  return content;
};
