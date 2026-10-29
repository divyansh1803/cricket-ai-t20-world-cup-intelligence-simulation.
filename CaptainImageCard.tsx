import React, { useState } from 'react';
import { Team, Player } from '../../types/cricket';
import { CountryFlag, TeamCrest } from './CricketIdentity';
import { TEAM_LEADERSHIP_MAP, TeamLeadershipInfo } from './TeamDossierBanner';
import { toSafeAssetUrl } from '../../data/playerImageCatalog';
import { Crown, Sparkles, Trophy, Award, Zap, Activity } from 'lucide-react';
import { cricketAudio } from '../../utils/audioSystem';

export interface CaptainImageCardProps {
  team: Team;
  player?: Player;
  variant?: 'card' | 'compact' | 'hero' | 'banner';
  onInspect?: (player: Player) => void;
  className?: string;
  showDetails?: boolean;
}

// Tactical profiles for national captains
export const CAPTAIN_DOSSIERS: Record<string, {
  tacticalMindset: string;
  leadershipDna: number;
  tossPreference: string;
  careerCaptainWins: number;
  careerCaptainMatches: number;
  clutchRating: number;
  photoUrl: string;
  fallbackPhoto: string;
  quote: string;
}> = {
  aus: {
    tacticalMindset: 'Aggressive Pace Enforcer & Tactical Choke',
    leadershipDna: 98,
    tossPreference: 'Field First (68%)',
    careerCaptainWins: 42,
    careerCaptainMatches: 58,
    clutchRating: 99,
    photoUrl: '/players/pat_cummins.jpg',
    fallbackPhoto: '/players/pat cummins.webp',
    quote: 'Nothing silences a roaring stadium like relentless, surgical line and length under lights.'
  },
  ind: {
    tacticalMindset: 'High-Tempo Powerplay Aggression & Spin Strangles',
    leadershipDna: 97,
    tossPreference: 'Bat First (55%)',
    careerCaptainWins: 50,
    careerCaptainMatches: 65,
    clutchRating: 98,
    photoUrl: '/players/rohit_sharma.jpg',
    fallbackPhoto: '/players/rohit_captain.png',
    quote: 'Take the bowlers down in the first 6 overs. Play without fear and back your execution.'
  },
  wi: {
    tacticalMindset: 'Death-Overs Powerfinish & Boundary Blitz',
    leadershipDna: 91,
    tossPreference: 'Field First (65%)',
    careerCaptainWins: 24,
    careerCaptainMatches: 44,
    clutchRating: 93,
    photoUrl: '/players/rovman powell.jpg',
    fallbackPhoto: '/players/powell.jpg',
    quote: 'Give the boys freedom to clear the ropes. Calypso power cannot be contained.'
  },
  pak: {
    tacticalMindset: 'Grit-Anchor & Express Pace Shock Attack',
    leadershipDna: 92,
    tossPreference: 'Field First (60%)',
    careerCaptainWins: 38,
    careerCaptainMatches: 62,
    clutchRating: 94,
    photoUrl: '/players/mohammad_rizwan.jpg',
    fallbackPhoto: '/players/babar_azam.jpg',
    quote: 'Every ball is a battle of will and perseverance. Trust your preparation and fight till the 20th over.'
  },
  eng: {
    tacticalMindset: 'White-Ball Ultra Aggression & Matchup Flexibility',
    leadershipDna: 95,
    tossPreference: 'Field First (70%)',
    careerCaptainWins: 36,
    careerCaptainMatches: 54,
    clutchRating: 96,
    photoUrl: '/players/jos_buttler.jpg',
    fallbackPhoto: '/players/buttler.svg',
    quote: 'Keep foot on the gas at all stages. There is no such thing as an unwinnable chase.'
  },
  sa: {
    tacticalMindset: 'Front-Foot Positivity & Express Pace Enforcers',
    leadershipDna: 93,
    tossPreference: 'Bat First (52%)',
    careerCaptainWins: 28,
    careerCaptainMatches: 45,
    clutchRating: 93,
    photoUrl: '/players/aiden_markram.jpg',
    fallbackPhoto: '/players/markram.svg',
    quote: 'Protea fire burns brightest when under supreme pressure in knockout crunches.'
  },
  nz: {
    tacticalMindset: 'Calculated Field Placements & Defensive Strangles',
    leadershipDna: 92,
    tossPreference: 'Bat First (50%)',
    careerCaptainWins: 22,
    careerCaptainMatches: 38,
    clutchRating: 92,
    photoUrl: '/players/kane_williamson.jpg',
    fallbackPhoto: '/players/OIP (1).webp',
    quote: 'Discipline in execution, out-thinking the batter on every single delivery.'
  },
  sl: {
    tacticalMindset: 'Spin Web Suffocation & Island Resilience',
    leadershipDna: 89,
    tossPreference: 'Field First (58%)',
    careerCaptainWins: 18,
    careerCaptainMatches: 36,
    clutchRating: 88,
    photoUrl: '/players/charith_asalanka.webp',
    fallbackPhoto: '/players/dhanjaya de silva.webp',
    quote: 'Spin them into confusion and strike with composure in the death overs.'
  },
  ban: {
    tacticalMindset: 'Slow-Surface Squeeze & Tenacious Counterpunch',
    leadershipDna: 88,
    tossPreference: 'Bat First (54%)',
    careerCaptainWins: 16,
    careerCaptainMatches: 35,
    clutchRating: 86,
    photoUrl: '/players/najmul_hossain_shanto.jpg',
    fallbackPhoto: '/players/mehidy hasan miraz.jpg',
    quote: 'Never back down against top-ranked opposition. Roar with pride on every ball.'
  },
  afg: {
    tacticalMindset: 'Mystery Spin Choke & Fearless Strokeplay',
    leadershipDna: 96,
    tossPreference: 'Bat First (62%)',
    careerCaptainWins: 30,
    careerCaptainMatches: 48,
    clutchRating: 97,
    photoUrl: '/players/rashid_khan.jpg',
    fallbackPhoto: '/players/rashid.svg',
    quote: 'We play for the millions back home. Fear nobody, attack every moment with heart.'
  },
  ire: {
    tacticalMindset: 'Fearless Giant-Killing & Open Field Hitting',
    leadershipDna: 87,
    tossPreference: 'Field First (55%)',
    careerCaptainWins: 14,
    careerCaptainMatches: 34,
    clutchRating: 88,
    photoUrl: '/players/paul stirling.webp',
    fallbackPhoto: '/players/paul stirling.webp',
    quote: 'Back yourself to clear any ground against any bowling attack.'
  },
  zim: {
    tacticalMindset: 'All-Round Grit & Unrelenting Middle-Over Pressure',
    leadershipDna: 89,
    tossPreference: 'Field First (58%)',
    careerCaptainWins: 15,
    careerCaptainMatches: 36,
    clutchRating: 91,
    photoUrl: '/players/Sikandar Raza.webp',
    fallbackPhoto: '/players/Sikandar Raza.webp',
    quote: 'Passion, belief, and 100% commitment will beat talent every single day.'
  },
};

export const CaptainImageCard: React.FC<CaptainImageCardProps> = ({
  team,
  player,
  variant = 'card',
  onInspect,
  className = '',
  showDetails = true,
}) => {
  const teamKey = team.id.toLowerCase();
  const leadership: TeamLeadershipInfo = TEAM_LEADERSHIP_MAP[teamKey] || {
    captain: player?.name || team.squad[0]?.name || 'Captain',
    captainPhoto: player?.imageUrl || team.squad[0]?.imageUrl || `/players/${team.id}.svg`,
    coach: 'Head Coach',
    winRate: '55.0%',
    rankBadge: `ICC Rank #${team.ranking}`,
    boardEmblem: `/logos/${team.id}.svg`,
    slogan: 'NATION & PRIDE',
    boardAcronym: team.shortName,
    boardFullName: `${team.name.toUpperCase()} CRICKET`,
    slashes: ['#0078FF', '#FFFFFF', '#FF9933'],
    teamLabel: `TEAM ${team.name.toUpperCase()}`,
    batting: team.ratings.batting,
    bowling: team.ratings.bowling,
    fielding: team.ratings.fielding,
  };

  const dossier = CAPTAIN_DOSSIERS[teamKey] || {
    tacticalMindset: 'Balanced Leadership & Tactical Versatility',
    leadershipDna: 90,
    tossPreference: 'Field First (55%)',
    careerCaptainWins: 25,
    careerCaptainMatches: 45,
    clutchRating: 90,
    photoUrl: leadership.captainPhoto,
    fallbackPhoto: team.squad[0]?.imageUrl || '/players/suryakumar_yadav.jpg',
    quote: 'Leading from the front on every single ball.'
  };

  // Find player object if not directly passed
  const captainPlayer: Player = player ||
    team.squad.find(p => p.name.toLowerCase() === leadership.captain.toLowerCase() || p.id.toLowerCase() === teamKey) ||
    team.squad[0];

  // Image resolution logic with error handling
  const [photoSrc, setPhotoSrc] = useState<string>(dossier.photoUrl);
  const [hasError, setHasError] = useState(false);

  React.useEffect(() => {
    setPhotoSrc(dossier.photoUrl);
    setHasError(false);
  }, [dossier.photoUrl, teamKey]);

  const handleImageError = () => {
    if (!hasError && dossier.fallbackPhoto && photoSrc !== dossier.fallbackPhoto) {
      setPhotoSrc(dossier.fallbackPhoto);
      setHasError(true);
    } else if (photoSrc !== '/players/suryakumar_yadav.jpg') {
      setPhotoSrc('/players/suryakumar_yadav.jpg');
    }
  };

  const handleClick = () => {
    cricketAudio.playBatHit();
    if (onInspect && captainPlayer) {
      onInspect(captainPlayer);
    }
  };

  // ==========================================
  // VARIANT: COMPACT (Small Header / Pill style)
  // ==========================================
  if (variant === 'compact') {
    return (
      <div
        onClick={handleClick}
        className={`group relative flex items-center gap-3.5 p-2.5 rounded-2xl border border-amber-500/30 bg-gradient-to-r from-slate-900/95 via-slate-950 to-slate-900/90 hover:border-amber-400 hover:shadow-lg hover:shadow-amber-500/20 transition-all cursor-pointer ${className}`}
      >
        {/* Glow */}
        <div className="absolute -inset-0.5 rounded-2xl bg-gradient-to-r from-amber-500/20 to-cyan-500/20 opacity-0 group-hover:opacity-100 blur transition-all" />

        {/* Avatar with Captain Ring */}
        <div className="relative shrink-0 w-12 h-12 rounded-xl overflow-hidden border-2 border-amber-400/80 bg-slate-950 shadow-md">
          <img
            src={toSafeAssetUrl(photoSrc)}
            alt={leadership.captain}
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover object-top group-hover:scale-110 transition-transform duration-300"
            onError={handleImageError}
          />
          <div className="absolute top-0 right-0 w-4 h-4 rounded-bl-lg bg-amber-400 text-slate-950 font-black text-[9px] flex items-center justify-center font-mono shadow-sm">
            C
          </div>
        </div>

        {/* Information */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-mono font-bold text-amber-400 uppercase tracking-wider">
              NATIONAL SKIPPER
            </span>
            <CountryFlag countryCode={team.id} size="sm" />
          </div>
          <h4 className="text-sm font-black text-white truncate group-hover:text-amber-300 transition-colors">
            {leadership.captain}
          </h4>
          <span className="text-[10px] text-slate-400 font-mono block">
            {leadership.winRate} Win Rate · {dossier.leadershipDna}/100 DNA
          </span>
        </div>
      </div>
    );
  }

  // ==========================================
  // VARIANT: HERO (Spotlight / Preview Screen)
  // ==========================================
  if (variant === 'hero') {
    return (
      <div
        onClick={handleClick}
        className={`group relative overflow-hidden rounded-3xl border border-cyan-500/40 bg-gradient-to-b from-slate-900/95 via-slate-950 to-[#030712] p-5 shadow-2xl hover:border-cyan-400 hover:shadow-cyan-500/25 transition-all cursor-pointer ${className}`}
      >
        {/* Top ambient floodlight aura */}
        <div className="absolute -top-20 -left-20 w-60 h-60 rounded-full bg-cyan-500/20 blur-3xl pointer-events-none group-hover:bg-cyan-400/30 transition-all" />
        <div className="absolute -bottom-20 -right-20 w-60 h-60 rounded-full bg-amber-500/15 blur-3xl pointer-events-none" />

        {/* Header Tags */}
        <div className="relative z-10 flex items-center justify-between gap-2 mb-4">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black font-mono bg-amber-400/15 border border-amber-400/40 text-amber-300 tracking-wider">
              <Crown className="w-3.5 h-3.5 text-amber-400" />
              OFFICIAL SKIPPER
            </span>
            <span className="text-xs font-mono font-bold text-slate-400">{leadership.rankBadge}</span>
          </div>

          <div className="flex items-center gap-2">
            <CountryFlag countryCode={team.id} size="md" />
            <TeamCrest teamId={team.id} size={24} />
          </div>
        </div>

        {/* Central High-Impact Photo Showcase */}
        <div className="relative z-10 flex flex-col sm:flex-row items-center gap-5 my-2">
          {/* Captain Portrait Container */}
          <div className="relative shrink-0">
            {/* Pulsing neon stadium ring */}
            <div className="absolute -inset-2 rounded-2xl bg-gradient-to-r from-amber-400/40 via-cyan-400/40 to-blue-500/40 opacity-75 blur-md group-hover:opacity-100 transition-opacity" />
            <div className="relative w-36 h-44 sm:w-40 sm:h-48 rounded-2xl overflow-hidden border-2 border-amber-300/80 bg-slate-950 shadow-2xl flex items-center justify-center">
              <img
                src={toSafeAssetUrl(photoSrc)}
                alt={leadership.captain}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover object-top group-hover:scale-105 transition-transform duration-500"
                onError={handleImageError}
              />

              {/* Gold Captain Emblem */}
              <div className="absolute top-2 left-2 flex items-center gap-1 px-2 py-0.5 rounded-lg bg-amber-400 text-slate-950 font-black text-xs font-mono shadow-lg border border-amber-300">
                <Crown className="w-3 h-3" />
                CAPTAIN
              </div>

              {/* Jersey/Role Tag */}
              {captainPlayer && (
                <div className="absolute bottom-2 right-2 px-2 py-0.5 rounded-md bg-black/80 backdrop-blur-sm text-[10px] font-mono text-cyan-300 border border-cyan-500/40">
                  {captainPlayer.role}
                </div>
              )}
            </div>
          </div>

          {/* Captaincy Dossier Highlights */}
          <div className="flex-1 space-y-3 text-center sm:text-left">
            <div>
              <span className="text-[11px] font-mono font-bold tracking-widest text-cyan-400 uppercase block">
                {team.name.toUpperCase()} · T20 WORLD CUP LEADER
              </span>
              <h3 className="text-2xl sm:text-3xl font-black text-white tracking-tight mt-0.5 group-hover:text-amber-300 transition-colors">
                {leadership.captain}
              </h3>
              <p className="text-xs text-slate-400 italic font-sans mt-1 line-clamp-2">
                "{dossier.quote}"
              </p>
            </div>

            {/* Quick Stats Grid */}
            <div className="grid grid-cols-3 gap-2 pt-1">
              <div className="rounded-xl border border-slate-800 bg-slate-900/80 p-2 text-center">
                <span className="text-[9px] font-mono text-slate-400 block uppercase">WIN RATE</span>
                <span className="text-sm font-black font-mono text-emerald-400">{leadership.winRate}</span>
              </div>
              <div className="rounded-xl border border-slate-800 bg-slate-900/80 p-2 text-center">
                <span className="text-[9px] font-mono text-slate-400 block uppercase">LEADERSHIP DNA</span>
                <span className="text-sm font-black font-mono text-cyan-400">{dossier.leadershipDna}/100</span>
              </div>
              <div className="rounded-xl border border-slate-800 bg-slate-900/80 p-2 text-center">
                <span className="text-[9px] font-mono text-slate-400 block uppercase">CLUTCH INDEX</span>
                <span className="text-sm font-black font-mono text-amber-400">{dossier.clutchRating}%</span>
              </div>
            </div>

            {/* Tactical Style Pill */}
            <div className="text-[11px] font-mono text-slate-300 bg-slate-900/90 border border-slate-800 rounded-xl px-3 py-1.5 flex items-center gap-2">
              <Zap className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span className="truncate">Style: <strong className="text-white">{dossier.tacticalMindset}</strong></span>
            </div>
          </div>
        </div>

        {/* Footer Call to Action */}
        <div className="relative z-10 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs">
          <span className="text-slate-400 font-mono flex items-center gap-1.5">
            <Activity className="w-3.5 h-3.5 text-cyan-400" />
            Toss Pref: <strong className="text-white">{dossier.tossPreference}</strong>
          </span>

          <span className="text-cyan-400 group-hover:text-amber-300 font-mono font-bold flex items-center gap-1 transition-colors">
            360° Wagon Wheel & Analytics →
          </span>
        </div>
      </div>
    );
  }

  // ==========================================
  // VARIANT: STANDARD CARD (Default Grid Card)
  // ==========================================
  return (
    <div
      onClick={handleClick}
      className={`group relative overflow-hidden rounded-3xl border border-slate-800 hover:border-amber-400/80 bg-gradient-to-b from-slate-900/90 via-slate-950 to-[#040816] p-4 sm:p-5 transition-all duration-300 shadow-xl hover:shadow-2xl hover:shadow-amber-500/15 cursor-pointer flex flex-col justify-between ${className}`}
    >
      {/* Dynamic ambient team color glow */}
      <div
        className="absolute -top-16 -right-16 w-36 h-36 rounded-full blur-3xl opacity-30 group-hover:opacity-60 transition-opacity pointer-events-none"
        style={{ backgroundColor: leadership.slashes[0] || '#FF9933' }}
      />

      {/* Top Header Badge */}
      <div className="relative z-10 flex items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-xl bg-amber-400/20 border border-amber-400/50 flex items-center justify-center text-amber-400 font-black text-xs font-mono shadow-sm">
            C
          </div>
          <div>
            <span className="text-[10px] font-mono font-bold text-amber-400 uppercase tracking-wider block leading-none">
              NATIONAL CAPTAIN
            </span>
            <span className="text-xs font-bold text-white truncate max-w-[140px] block leading-tight mt-0.5">
              {team.name}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <CountryFlag countryCode={team.id} size="sm" />
          <TeamCrest teamId={team.id} size={22} />
        </div>
      </div>

      {/* Central Portrait & Key Metrics */}
      <div className="relative z-10 flex items-center gap-4 my-2">
        {/* Photo Container with Captain Halo */}
        <div className="relative shrink-0">
          <div className="absolute -inset-1 rounded-2xl bg-gradient-to-r from-amber-400/50 to-cyan-500/50 opacity-60 group-hover:opacity-100 blur-sm transition-opacity" />
          <div className="relative w-24 h-28 sm:w-28 sm:h-32 rounded-2xl overflow-hidden border-2 border-amber-400/90 bg-[#07132e] shadow-xl flex items-center justify-center">
            <img
              src={toSafeAssetUrl(photoSrc)}
              alt={leadership.captain}
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover object-top group-hover:scale-108 transition-transform duration-500"
              onError={handleImageError}
            />
            {/* Captaincy Golden Crown Badge */}
            <div className="absolute top-1.5 left-1.5 p-1 rounded-md bg-amber-400 text-slate-950 shadow-md">
              <Crown className="w-3 h-3" />
            </div>
          </div>
        </div>

        {/* Stats Column */}
        <div className="flex-1 min-w-0 space-y-2">
          <div>
            <h4 className="text-lg sm:text-xl font-black text-white tracking-tight truncate group-hover:text-amber-300 transition-colors">
              {leadership.captain}
            </h4>
            <span className="text-[11px] font-mono text-cyan-400 block truncate">
              {captainPlayer?.role || 'National Skipper'}
            </span>
          </div>

          <div className="space-y-1">
            <div className="flex items-center justify-between text-[11px] font-mono">
              <span className="text-slate-400">Win Rate:</span>
              <strong className="text-emerald-400">{leadership.winRate}</strong>
            </div>
            <div className="flex items-center justify-between text-[11px] font-mono">
              <span className="text-slate-400">Leadership:</span>
              <strong className="text-cyan-300">{dossier.leadershipDna}/100</strong>
            </div>
            <div className="flex items-center justify-between text-[11px] font-mono">
              <span className="text-slate-400">Captain Wins:</span>
              <strong className="text-amber-300">{dossier.careerCaptainWins} W</strong>
            </div>
          </div>
        </div>
      </div>

      {/* Mindset Tag & Trigger */}
      {showDetails && (
        <div className="relative z-10 mt-3 pt-2.5 border-t border-slate-800/80 space-y-2">
          <p className="text-[10px] font-mono text-slate-300 truncate bg-slate-900/60 rounded-lg px-2.5 py-1 border border-slate-800">
            🎯 {dossier.tacticalMindset}
          </p>

          <div className="flex items-center justify-between text-[11px] font-mono">
            <span className="text-slate-400">{dossier.tossPreference}</span>
            <span className="text-amber-400 group-hover:text-amber-300 font-bold flex items-center gap-1 transition-colors">
              View Wagon Wheel →
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
