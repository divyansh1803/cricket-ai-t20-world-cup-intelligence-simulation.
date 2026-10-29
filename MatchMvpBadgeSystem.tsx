import React, { useState } from 'react';
import {
  Award,
  Flame,
  Zap,
  Target,
  Shield,
  Trophy,
  Sparkles,
  Crown,
  Heart,
  ChevronRight,
  Info,
} from 'lucide-react';
import { Player, MatchMvpBadge, BallEvent } from '../../types/cricket';
import { cricketAudio } from '../../utils/audioSystem';

export const DEFAULT_MVP_BADGES: MatchMvpBadge[] = [
  {
    id: 'six_wkt_haul',
    title: '6-Wicket Haul',
    category: 'bowling',
    icon: '🎯',
    description: 'Decimated the batting order with 6+ wickets in a single match.',
    matchContext: '6/18 in 3.4 overs vs rival batting unit',
    glowColor: 'from-amber-400 via-yellow-500 to-amber-600',
    tier: 'Diamond',
  },
  {
    id: 'century_maker',
    title: 'Century Maker',
    category: 'batting',
    icon: '👑',
    description: 'Masterclass three-figure innings under extreme tournament pressure.',
    matchContext: '104* (52 balls) with 9 sixes and 8 boundaries',
    glowColor: 'from-cyan-400 via-sky-500 to-blue-600',
    tier: 'Diamond',
  },
  {
    id: 'finisher_200_sr',
    title: 'Finisher 200+ SR',
    category: 'clutch',
    icon: '⚡',
    description: 'Snatched victory from defeat with strike rate exceeding 200% in death overs.',
    matchContext: '38* off 14 balls needing 18 off the final over',
    glowColor: 'from-emerald-400 via-teal-500 to-cyan-500',
    tier: 'Platinum',
  },
  {
    id: 'death_maestro',
    title: 'Death Over Maestro',
    category: 'bowling',
    icon: '🛡️',
    description: 'Executed pinpoint yorkers and wide cutters conceding <6.0 RPO at the death.',
    matchContext: '12 runs conceded across overs 18 & 20 with 2 wickets',
    glowColor: 'from-purple-400 via-indigo-500 to-blue-500',
    tier: 'Platinum',
  },
  {
    id: 'hat_trick_hero',
    title: 'Hat-trick Hero',
    category: 'bowling',
    icon: '🎩',
    description: 'Sent the stadium into delirium with 3 wickets in 3 consecutive deliveries.',
    matchContext: 'Wickets on balls 19.2, 19.3, 19.4 to seal the tie',
    glowColor: 'from-rose-400 via-red-500 to-amber-500',
    tier: 'Diamond',
  },
  {
    id: 'powerplay_enforcer',
    title: 'Powerplay Enforcer',
    category: 'batting',
    icon: '🚀',
    description: 'Obliterated field restrictions with 45+ runs in the first 6 overs.',
    matchContext: '54/0 solo blitz in overs 1-6',
    glowColor: 'from-amber-400 via-orange-500 to-red-500',
    tier: 'Gold',
  },
  {
    id: 'clutch_run_chase',
    title: 'Chasing General',
    category: 'clutch',
    icon: '🏆',
    description: 'Undefeated in a high-voltage chase with 50+ runs at 160+ SR.',
    matchContext: 'Guided chase of 188 with calm boundary precision',
    glowColor: 'from-blue-400 via-cyan-500 to-teal-400',
    tier: 'Gold',
  },
];

export function getPlayerMvpBadges(player: Player, matchHistory?: BallEvent[]): MatchMvpBadge[] {
  // If player already has explicit badges, use them
  if (player.mvpBadges && player.mvpBadges.length > 0) {
    return player.mvpBadges;
  }

  // Derive contextual badges based on player stats or role
  const badges: MatchMvpBadge[] = [];

  if (player.role.includes('Bowler') || player.role === 'All-Rounder') {
    if (player.stats.wickets >= 4 || player.stats.economy < 7.2) {
      badges.push(DEFAULT_MVP_BADGES[3]); // Death Maestro
    }
    if (player.stats.bowlingAverage < 22 || player.rating >= 90) {
      badges.push(DEFAULT_MVP_BADGES[0]); // 6-Wicket Haul
    }
  }

  if (player.role.includes('Batter') || player.role === 'All-Rounder' || player.role === 'Wicketkeeper Batter') {
    if (player.stats.strikeRate >= 148 || player.stats.deathSR >= 180) {
      badges.push(DEFAULT_MVP_BADGES[2]); // Finisher 200+ SR
    }
    if (player.stats.average >= 45 || player.stats.runs >= 400 || player.rating >= 90) {
      badges.push(DEFAULT_MVP_BADGES[1]); // Century Maker
    }
    if (player.stats.powerplaySR >= 140) {
      badges.push(DEFAULT_MVP_BADGES[5]); // Powerplay Enforcer
    }
  }

  if (badges.length === 0) {
    badges.push(DEFAULT_MVP_BADGES[6]); // Chasing General
  }

  return badges;
}

interface MatchMvpBadgeSystemProps {
  player: Player;
  onBadgeClick?: (badge: MatchMvpBadge) => void;
  showAllCatalog?: boolean;
}

export const MatchMvpBadgeSystem: React.FC<MatchMvpBadgeSystemProps> = ({
  player,
  onBadgeClick,
  showAllCatalog = false,
}) => {
  const [activeFilter, setActiveFilter] = useState<'all' | 'batting' | 'bowling' | 'clutch'>('all');
  const [selectedBadge, setSelectedBadge] = useState<MatchMvpBadge | null>(null);

  const playerBadges = getPlayerMvpBadges(player);
  const badgesToDisplay = showAllCatalog
    ? DEFAULT_MVP_BADGES
    : playerBadges;

  const filteredBadges = badgesToDisplay.filter((b) => {
    if (activeFilter === 'all') return true;
    return b.category === activeFilter;
  });

  return (
    <div className="rounded-2xl border border-cyan-500/30 bg-gradient-to-b from-[#03091c]/95 to-[#020510]/95 p-5 backdrop-blur-xl shadow-2xl space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-cyan-500/20 pb-3">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono font-bold text-cyan-400 uppercase tracking-wider">
            <Award className="h-4 w-4 animate-bounce text-amber-400" />
            <span>MATCH MVP BADGE SYSTEM · HALL OF DISTINCTION</span>
          </div>
          <h3 className="text-base font-black text-white mt-0.5 flex items-center gap-2">
            <span>{player.name}</span>
            <span className="text-xs font-mono text-slate-400 font-normal">
              ({playerBadges.length} Active Badges Unlocked)
            </span>
          </h3>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 rounded-xl border border-slate-800 bg-slate-900/90 p-1 text-xs font-mono">
          {[
            { id: 'all', label: 'All Feats' },
            { id: 'batting', label: 'Batting' },
            { id: 'bowling', label: 'Bowling' },
            { id: 'clutch', label: 'Clutch / Finish' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveFilter(tab.id as any)}
              className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                activeFilter === tab.id
                  ? 'bg-cyan-500 text-slate-950 font-bold shadow-md shadow-cyan-500/20'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Badges Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
        {filteredBadges.map((badge) => {
          const isPlayerEarned = playerBadges.some((pb) => pb.id === badge.id);
          const isSelected = selectedBadge?.id === badge.id;

          return (
            <div
              key={badge.id}
              onClick={() => {
                setSelectedBadge(badge);
                if (onBadgeClick) onBadgeClick(badge);
                cricketAudio.playBatHit();
              }}
              className={`group relative rounded-xl border p-3.5 transition-all cursor-pointer flex items-start gap-3 overflow-hidden ${
                isSelected
                  ? 'border-cyan-400 bg-cyan-950/40 shadow-xl shadow-cyan-500/20 scale-[1.02]'
                  : isPlayerEarned
                  ? 'border-slate-800 bg-slate-900/60 hover:border-slate-700 hover:bg-slate-900/90'
                  : 'border-slate-800/40 bg-slate-950/40 opacity-50 hover:opacity-80'
              }`}
            >
              {/* Radial gradient background accent */}
              <div
                className={`absolute top-0 right-0 -mr-6 -mt-6 h-20 w-20 rounded-full bg-gradient-to-br ${badge.glowColor} opacity-15 blur-xl group-hover:opacity-30 transition-opacity`}
              />

              {/* Badge Icon Hub */}
              <div
                className={`relative flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${badge.glowColor} shadow-lg text-2xl font-bold`}
              >
                <span>{badge.icon}</span>
                {/* Tier mini badge */}
                <span className="absolute -bottom-1 -right-1 text-[8px] font-mono font-black uppercase px-1 rounded bg-slate-950 text-amber-300 border border-amber-500/40">
                  {badge.tier[0]}
                </span>
              </div>

              {/* Badge Information */}
              <div className="flex-1 min-w-0 space-y-1">
                <div className="flex items-center justify-between gap-1">
                  <h4 className="text-xs font-bold text-white truncate group-hover:text-cyan-300 transition-colors">
                    {badge.title}
                  </h4>
                  <span
                    className={`text-[9px] font-mono font-bold uppercase px-1.5 py-0.5 rounded ${
                      badge.tier === 'Diamond'
                        ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                        : badge.tier === 'Platinum'
                        ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                        : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                    }`}
                  >
                    {badge.tier}
                  </span>
                </div>

                <p className="text-[11px] text-slate-400 line-clamp-2 font-sans leading-tight">
                  {badge.description}
                </p>

                <div className="text-[10px] font-mono text-cyan-400/90 truncate flex items-center gap-1 pt-0.5">
                  <Sparkles className="h-2.5 w-2.5 shrink-0" />
                  <span>{badge.matchContext}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Selected Badge Spotlight Banner */}
      {selectedBadge && (
        <div className="rounded-xl border border-cyan-500/30 bg-slate-900/90 p-4 space-y-2 text-xs font-mono animate-in fade-in duration-200">
          <div className="flex items-center justify-between text-white font-bold">
            <span className="flex items-center gap-2">
              <span className="text-xl">{selectedBadge.icon}</span>
              <span className="text-sm text-cyan-300">{selectedBadge.title} Distinction</span>
              <span className="px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 text-[10px]">
                Tier: {selectedBadge.tier}
              </span>
            </span>
            <button
              onClick={() => setSelectedBadge(null)}
              className="text-slate-400 hover:text-white cursor-pointer"
            >
              ✕
            </button>
          </div>
          <p className="text-slate-300 font-sans leading-relaxed text-xs">
            {selectedBadge.description} This badge triggers custom celebration visual effects and commentary audio overlays whenever this player achieves milestones during match simulation.
          </p>
          <div className="flex items-center gap-2 text-[11px] text-amber-300 pt-1 border-t border-slate-800">
            <strong>Historical Trigger:</strong> <span>{selectedBadge.matchContext}</span>
          </div>
        </div>
      )}
    </div>
  );
};
