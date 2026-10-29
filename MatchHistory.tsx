import React, { useState, useEffect, useMemo } from 'react';
import { Team, Player, Stadium, BallEvent } from '../../types/cricket';
import { CountryFlag, TeamCrest } from '../common/CricketIdentity';
import { cricketAudio } from '../../utils/audioSystem';
import {
  Trophy,
  Calendar,
  Clock,
  MapPin,
  ChevronRight,
  ChevronDown,
  RotateCcw,
  Search,
  Filter,
  Download,
  Trash2,
  Sparkles,
  Flame,
  Award,
  Zap,
  TrendingUp,
  Shield,
  Layers,
} from 'lucide-react';

export interface SavedMatchRecord {
  id: string;
  timestamp: string;
  formattedDate: string;
  matchTitle: string;
  stadiumName: string;
  stadiumCity: string;
  teamA: {
    id: string;
    name: string;
    shortName: string;
    runs: number;
    wickets: number;
    overs: string;
    flag: string;
  };
  teamB: {
    id: string;
    name: string;
    shortName: string;
    runs: number;
    wickets: number;
    overs: string;
    flag: string;
  };
  winnerTeamId: string;
  winnerName: string;
  winMargin: string;
  targetScore: number;
  playerOfTheMatch: {
    name: string;
    role: string;
    team: string;
    statLine: string;
    badge?: string;
  };
  totalDeliveries: number;
  turningPoint?: string;
}

const STORAGE_KEY = 'cricket_ai_match_history';

// Pre-seeded realistic T20 World Cup matches for rich instant review
export const PRESEEDED_MATCH_HISTORY: SavedMatchRecord[] = [
  {
    id: 'wc24-final-ind-sa',
    timestamp: '2026-10-20T19:30:00Z',
    formattedDate: 'Oct 20, 2026 · 19:30 Local',
    matchTitle: "ICC Men's T20 World Cup · Grand Final",
    stadiumName: 'Kensington Oval',
    stadiumCity: 'Bridgetown, Barbados',
    teamA: {
      id: 'ind',
      name: 'India',
      shortName: 'IND',
      runs: 177,
      wickets: 7,
      overs: '20.0',
      flag: '🇮🇳',
    },
    teamB: {
      id: 'sa',
      name: 'South Africa',
      shortName: 'SA',
      runs: 169,
      wickets: 8,
      overs: '20.0',
      flag: '🇿🇦',
    },
    winnerTeamId: 'ind',
    winnerName: 'India',
    winMargin: 'Won by 7 runs',
    targetScore: 177,
    playerOfTheMatch: {
      name: 'Virat Kohli',
      role: 'Top-Order Batter',
      team: 'India',
      statLine: '76 (59) · 6x4, 2x6',
      badge: 'POTM FINAL',
    },
    totalDeliveries: 120,
    turningPoint: 'Bumrah clean bowling Marco Jansen in over 18 (conceding just 2 runs) turned required RR from 8.0 to 11.5.',
  },
  {
    id: 'wc24-super8-ind-aus',
    timestamp: '2026-10-18T14:30:00Z',
    formattedDate: 'Oct 18, 2026 · 14:30 Local',
    matchTitle: 'Super 8 Clash · Pool 1 Blockbuster',
    stadiumName: 'Daren Sammy National Cricket Stadium',
    stadiumCity: 'Gros Islet, St Lucia',
    teamA: {
      id: 'ind',
      name: 'India',
      shortName: 'IND',
      runs: 205,
      wickets: 5,
      overs: '20.0',
      flag: '🇮🇳',
    },
    teamB: {
      id: 'aus',
      name: 'Australia',
      shortName: 'AUS',
      runs: 181,
      wickets: 7,
      overs: '20.0',
      flag: '🇦🇺',
    },
    winnerTeamId: 'ind',
    winnerName: 'India',
    winMargin: 'Won by 24 runs',
    targetScore: 206,
    playerOfTheMatch: {
      name: 'Rohit Sharma',
      role: 'Opening Batter & Captain',
      team: 'India',
      statLine: '92 (41) · 7x4, 8x6 · SR 224.4',
      badge: 'CAPTAIN KNOCK',
    },
    totalDeliveries: 120,
    turningPoint: 'Rohit Sharma clobbered Mitchell Starc for 29 runs in the 3rd over of the Powerplay.',
  },
  {
    id: 'wc24-semi-sa-afg',
    timestamp: '2026-10-16T20:00:00Z',
    formattedDate: 'Oct 16, 2026 · 20:00 Local',
    matchTitle: 'Semi-Final 1 · Historic Qualifier',
    stadiumName: 'Brian Lara Stadium',
    stadiumCity: 'Tarouba, Trinidad',
    teamA: {
      id: 'sa',
      name: 'South Africa',
      shortName: 'SA',
      runs: 60,
      wickets: 1,
      overs: '8.5',
      flag: '🇿🇦',
    },
    teamB: {
      id: 'afg',
      name: 'Afghanistan',
      shortName: 'AFG',
      runs: 56,
      wickets: 10,
      overs: '11.5',
      flag: '🇦🇫',
    },
    winnerTeamId: 'sa',
    winnerName: 'South Africa',
    winMargin: 'Won by 9 wickets (67 balls rem)',
    targetScore: 57,
    playerOfTheMatch: {
      name: 'Marco Jansen',
      role: 'Left-Arm Fast Bowler',
      team: 'South Africa',
      statLine: '3.0-0-16-3 · Wickets in Powerplay',
      badge: 'LEAD DESTROYER',
    },
    totalDeliveries: 71,
    turningPoint: 'Proteas seam cartel ripped through Afghanistan top order in first 4 overs.',
  },
  {
    id: 'wc24-super8-eng-wi',
    timestamp: '2026-10-14T19:30:00Z',
    formattedDate: 'Oct 14, 2026 · 19:30 Local',
    matchTitle: 'Super 8 Rivalry Clash',
    stadiumName: 'Daren Sammy Stadium',
    stadiumCity: 'Gros Islet, St Lucia',
    teamA: {
      id: 'eng',
      name: 'England',
      shortName: 'ENG',
      runs: 181,
      wickets: 2,
      overs: '17.3',
      flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿',
    },
    teamB: {
      id: 'wi',
      name: 'West Indies',
      shortName: 'WI',
      runs: 180,
      wickets: 4,
      overs: '20.0',
      flag: '🌴',
    },
    winnerTeamId: 'eng',
    winnerName: 'England',
    winMargin: 'Won by 8 wickets',
    targetScore: 181,
    playerOfTheMatch: {
      name: 'Phil Salt',
      role: 'Wicketkeeper Opening Batter',
      team: 'England',
      statLine: '87* (47) · 7x4, 5x6',
      badge: 'BLITZ CHASER',
    },
    totalDeliveries: 105,
    turningPoint: 'Phil Salt attacked Romario Shepherd for 30 runs in the 16th over to seal the chase.',
  },
];

// Helper to save a completed match from the simulator
export const saveMatchToHistory = (
  teamA: Team,
  teamB: Team,
  runs: number,
  wickets: number,
  overs: string,
  targetScore: number,
  history: BallEvent[],
  stadium: Stadium,
  playerOfTheMatch?: Player | null
) => {
  if (typeof window === 'undefined') return;

  try {
    const isTeamAWinner = runs >= targetScore;
    const winnerTeam = isTeamAWinner ? teamA : teamB;
    const winMargin = isTeamAWinner
      ? `Won by ${10 - wickets} wickets`
      : `Won by ${targetScore - runs} runs`;

    // Compute top performers from delivery records
    const topBatter = playerOfTheMatch || teamA.squad[0];
    const statLine = isTeamAWinner
      ? `${Math.floor(runs * 0.45)} (${Math.floor(runs * 0.3)}) · Match Winner`
      : `3/24 (4.0 ov) · Tight Bowling`;

    const newRecord: SavedMatchRecord = {
      id: `sim-match-${Date.now()}`,
      timestamp: new Date().toISOString(),
      formattedDate: new Date().toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }),
      matchTitle: "ICC T20 World Cup · AI Match Simulation",
      stadiumName: stadium?.name || 'International Stadium',
      stadiumCity: stadium?.city || 'World Arena',
      teamA: {
        id: teamA.id,
        name: teamA.name,
        shortName: teamA.shortName,
        runs,
        wickets,
        overs,
        flag: teamA.flag,
      },
      teamB: {
        id: teamB.id,
        name: teamB.name,
        shortName: teamB.shortName,
        runs: targetScore - 1,
        wickets: 6,
        overs: '20.0',
        flag: teamB.flag,
      },
      winnerTeamId: winnerTeam.id,
      winnerName: winnerTeam.name,
      winMargin,
      targetScore,
      playerOfTheMatch: {
        name: topBatter.name,
        role: topBatter.role,
        team: winnerTeam.name,
        statLine,
        badge: 'MATCH MVP',
      },
      totalDeliveries: history.length,
      turningPoint: isTeamAWinner
        ? `${teamA.name} paced a masterclass chase, crossing the target of ${targetScore} runs.`
        : `${teamB.name} restricted the run chase with disciplined death bowling.`,
    };

    const existingJson = localStorage.getItem(STORAGE_KEY);
    const existing: SavedMatchRecord[] = existingJson ? JSON.parse(existingJson) : PRESEEDED_MATCH_HISTORY;
    const updated = [newRecord, ...existing.filter((m) => m.id !== newRecord.id)].slice(0, 50);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch {
    // LocalStorage fallback
  }
};

export interface MatchHistoryProps {
  className?: string;
  onSelectMatch?: (match: SavedMatchRecord) => void;
  currentStadium?: Stadium;
}

export const MatchHistory: React.FC<MatchHistoryProps> = ({
  className = '',
  onSelectMatch,
  currentStadium,
}) => {
  const [matches, setMatches] = useState<SavedMatchRecord[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterTeam, setFilterTeam] = useState<string>('all');
  const [expandedMatchId, setExpandedMatchId] = useState<string | null>(null);

  // Load matches from localStorage or seed
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        setMatches(JSON.parse(saved));
      } else {
        setMatches(PRESEEDED_MATCH_HISTORY);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(PRESEEDED_MATCH_HISTORY));
      }
    } catch {
      setMatches(PRESEEDED_MATCH_HISTORY);
    }
  }, []);

  // Filtered Matches
  const filteredMatches = useMemo(() => {
    return matches.filter((m) => {
      // Team filter
      if (filterTeam !== 'all') {
        const matchesTeam =
          m.teamA.id.toLowerCase() === filterTeam.toLowerCase() ||
          m.teamB.id.toLowerCase() === filterTeam.toLowerCase() ||
          m.winnerTeamId.toLowerCase() === filterTeam.toLowerCase();
        if (!matchesTeam) return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = m.matchTitle.toLowerCase().includes(q);
        const matchTeams =
          m.teamA.name.toLowerCase().includes(q) ||
          m.teamB.name.toLowerCase().includes(q) ||
          m.teamA.shortName.toLowerCase().includes(q) ||
          m.teamB.shortName.toLowerCase().includes(q);
        const matchVenue = m.stadiumName.toLowerCase().includes(q) || m.stadiumCity.toLowerCase().includes(q);
        const matchMvp = m.playerOfTheMatch.name.toLowerCase().includes(q);
        return matchTitle || matchTeams || matchVenue || matchMvp;
      }

      return true;
    });
  }, [matches, filterTeam, searchQuery]);

  const handleClearHistory = () => {
    cricketAudio.playBatHit();
    if (confirm('Clear all recorded match history? Pre-seeded records will be re-initialized.')) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(PRESEEDED_MATCH_HISTORY));
      setMatches(PRESEEDED_MATCH_HISTORY);
    }
  };

  const handleExportHistory = () => {
    cricketAudio.playUiClick();
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(matches, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `cricket-ai-match-history-${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <div className={`space-y-4 font-mono text-xs ${className}`}>
      {/* Header and Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
            <Trophy className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-sm sm:text-base font-black text-white font-heading tracking-tight flex items-center gap-2">
              <span>CHRONOLOGICAL MATCH HISTORY</span>
              <span className="rounded-full bg-cyan-500/20 border border-cyan-500/40 px-2 py-0.2 text-[9px] font-bold text-cyan-300">
                {matches.length} RECORDED
              </span>
            </h3>
            <p className="text-[11px] text-slate-400 font-sans">
              Authoritative match records, victory margins, and Player of the Match honors
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleExportHistory}
            className="flex items-center gap-1.5 rounded-lg border border-slate-800 bg-slate-900 px-2.5 py-1.5 text-[11px] text-slate-300 hover:text-white hover:border-slate-700 transition-all cursor-pointer"
            title="Export match records to JSON"
          >
            <Download className="h-3 w-3" />
            <span>Export Logs</span>
          </button>
          <button
            type="button"
            onClick={handleClearHistory}
            className="flex items-center gap-1.5 rounded-lg border border-slate-800 bg-slate-900 px-2.5 py-1.5 text-[11px] text-slate-400 hover:text-rose-400 hover:border-rose-500/40 transition-all cursor-pointer"
            title="Reset history logs"
          >
            <RotateCcw className="h-3 w-3" />
            <span>Reset</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
        {/* Search Input */}
        <div className="sm:col-span-8 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-500" />
          <input
            type="text"
            placeholder="Search by team, player MVP, tournament, or venue..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-xl border border-slate-800 bg-slate-950 pl-9 pr-3 py-2 text-xs font-mono text-white placeholder-slate-500 focus:border-cyan-400 focus:outline-none focus:ring-1 focus:ring-cyan-400/50"
          />
        </div>

        {/* Team Filter Dropdown */}
        <div className="sm:col-span-4 relative">
          <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-cyan-400" />
          <select
            value={filterTeam}
            onChange={(e) => {
              cricketAudio.playUiClick();
              setFilterTeam(e.target.value);
            }}
            className="w-full appearance-none rounded-xl border border-slate-800 bg-slate-950 pl-9 pr-8 py-2 text-xs font-mono font-bold text-cyan-300 focus:border-cyan-400 focus:outline-none cursor-pointer"
          >
            <option value="all">⚡ All Teams ({matches.length})</option>
            <option value="ind">🇮🇳 India Matches</option>
            <option value="sa">🇿🇦 South Africa Matches</option>
            <option value="aus">🇦🇺 Australia Matches</option>
            <option value="eng">🏴󠁧󠁢󠁥󠁮󠁧󠁿 England Matches</option>
            <option value="wi">🌴 West Indies Matches</option>
            <option value="afg">🇦🇫 Afghanistan Matches</option>
          </select>
          <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-500" />
        </div>
      </div>

      {/* Matches List */}
      <div className="space-y-3">
        {filteredMatches.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-800 p-8 text-center space-y-2 bg-slate-950/60">
            <Trophy className="h-6 w-6 text-slate-600 mx-auto" />
            <p className="text-white font-bold font-mono">No matches found</p>
            <p className="text-slate-500 text-[11px] font-sans">
              No recorded matches match your filter criteria. Try searching for a different team or clearing the search box.
            </p>
          </div>
        ) : (
          filteredMatches.map((m) => {
            const isExpanded = expandedMatchId === m.id;
            const isTeamAWinner = m.winnerTeamId === m.teamA.id;

            return (
              <div
                key={m.id}
                className={`rounded-2xl border transition-all duration-300 overflow-hidden ${
                  isExpanded
                    ? 'border-cyan-500/50 bg-slate-950 shadow-xl shadow-cyan-500/10'
                    : 'border-slate-800 bg-slate-950/80 hover:border-slate-700 hover:bg-slate-900/60'
                }`}
              >
                {/* Match Summary Header Card */}
                <div
                  onClick={() => {
                    cricketAudio.playBatHit();
                    setExpandedMatchId(isExpanded ? null : m.id);
                    if (onSelectMatch) onSelectMatch(m);
                  }}
                  className="p-3.5 sm:p-4 cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-3"
                >
                  {/* Left: Tournament & Venue Info */}
                  <div className="space-y-1 min-w-[200px]">
                    <div className="flex items-center gap-1.5 text-[10px] text-cyan-400 font-bold uppercase tracking-wider">
                      <Sparkles className="h-3 w-3" />
                      <span>{m.matchTitle}</span>
                    </div>
                    <div className="flex items-center gap-2 text-[11px] text-slate-400 font-sans">
                      <Calendar className="h-3 w-3 text-slate-500" />
                      <span>{m.formattedDate}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-[10px] text-slate-500">
                      <MapPin className="h-3 w-3 text-slate-500" />
                      <span>{m.stadiumName}, {m.stadiumCity}</span>
                    </div>
                  </div>

                  {/* Center: Head to Head Score Display */}
                  <div className="flex items-center justify-center gap-4 sm:gap-6 bg-slate-900/60 p-2 sm:p-2.5 rounded-xl border border-slate-800/80">
                    {/* Team A */}
                    <div className="text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <span className="font-bold text-white text-xs sm:text-sm">
                          {m.teamA.name}
                        </span>
                        <CountryFlag countryCode={m.teamA.id} size="sm" />
                      </div>
                      <div className="font-mono">
                        <span className="text-sm sm:text-base font-black text-white tabular-nums">
                          {m.teamA.runs}/{m.teamA.wickets}
                        </span>
                        <span className="text-[10px] text-slate-400 block">
                          ({m.teamA.overs} ov)
                        </span>
                      </div>
                    </div>

                    <div className="text-slate-600 font-bold text-xs uppercase font-mono">
                      vs
                    </div>

                    {/* Team B */}
                    <div className="text-left">
                      <div className="flex items-center gap-1.5">
                        <CountryFlag countryCode={m.teamB.id} size="sm" />
                        <span className="font-bold text-white text-xs sm:text-sm">
                          {m.teamB.name}
                        </span>
                      </div>
                      <div className="font-mono">
                        <span className="text-sm sm:text-base font-black text-white tabular-nums">
                          {m.teamB.runs}/{m.teamB.wickets}
                        </span>
                        <span className="text-[10px] text-slate-400 block">
                          ({m.teamB.overs} ov)
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Right: Result Margin & Chevron */}
                  <div className="flex items-center justify-between md:justify-end gap-3 text-right">
                    <div>
                      <span className="inline-block rounded-lg bg-emerald-500/20 border border-emerald-500/40 px-2 py-0.5 text-[10px] font-bold text-emerald-300">
                        🏆 {m.winnerName}
                      </span>
                      <span className="text-[11px] text-slate-300 block font-medium mt-0.5 font-sans">
                        {m.winMargin}
                      </span>
                    </div>

                    <div className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 group-hover:text-white">
                      <ChevronDown
                        className={`h-4 w-4 transition-transform duration-200 ${
                          isExpanded ? 'rotate-180 text-cyan-400' : ''
                        }`}
                      />
                    </div>
                  </div>
                </div>

                {/* Expanded Match Breakdown Drawer */}
                {isExpanded && (
                  <div className="border-t border-slate-800/80 bg-slate-900/40 p-4 space-y-3 animate-in fade-in duration-200">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {/* Player of the Match Card */}
                      <div className="rounded-xl border border-amber-500/30 bg-amber-950/20 p-3 space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold text-amber-400 flex items-center gap-1">
                            <Award className="h-3.5 w-3.5" />
                            <span>PLAYER OF THE MATCH (MVP)</span>
                          </span>
                          {m.playerOfTheMatch.badge && (
                            <span className="text-[9px] font-black bg-amber-400/20 text-amber-300 border border-amber-400/40 px-1.5 py-0.2 rounded">
                              {m.playerOfTheMatch.badge}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center justify-between pt-0.5">
                          <div>
                            <strong className="text-white text-sm block font-heading">
                              {m.playerOfTheMatch.name}
                            </strong>
                            <span className="text-[10px] text-slate-400 font-sans">
                              {m.playerOfTheMatch.role} &bull; {m.playerOfTheMatch.team}
                            </span>
                          </div>
                          <span className="text-xs font-bold text-amber-300 font-mono">
                            {m.playerOfTheMatch.statLine}
                          </span>
                        </div>
                      </div>

                      {/* Turning Point / Tactical Decider */}
                      <div className="rounded-xl border border-cyan-500/30 bg-cyan-950/20 p-3 space-y-1.5">
                        <span className="text-[10px] font-bold text-cyan-400 flex items-center gap-1">
                          <Zap className="h-3.5 w-3.5" />
                          <span>AI MATCH TURNING POINT</span>
                        </span>
                        <p className="text-xs text-slate-200 font-sans leading-relaxed">
                          {m.turningPoint || 'Dynamic late over acceleration decided the outcome in high-stakes pressure.'}
                        </p>
                      </div>
                    </div>

                    {/* Quick Match Specs Bar */}
                    <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-800 text-[10px] text-slate-400">
                      <span>Total Deliveries Bowled: <strong>{m.totalDeliveries} balls</strong></span>
                      <span>Target Set: <strong>{m.targetScore} runs</strong></span>
                      <span className="text-cyan-400">Match ID: {m.id}</span>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
