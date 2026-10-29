import React, { useState, useMemo, useRef } from 'react';
import { TEAMS } from '../../data/cricketData';
import { Team, Player } from '../../types/cricket';
import { CountryFlag, PlayerCardAvatar, getRealTeamLogoUrl } from '../common/CricketIdentity';
import { toSafeAssetUrl, resolvePlayerImageUrl } from '../../data/playerImageCatalog';
import { NeonPlayerAnalyticsModal } from '../players/NeonPlayerAnalyticsModal';
import { TeamIndiaAnalyticsDashboard } from '../players/TeamIndiaAnalyticsDashboard';
import { PlayerComparisonModal } from '../players/PlayerComparisonModal';
import { cricketAudio } from '../../utils/audioSystem';
import { triggerHaptic, HAPTIC_PATTERNS } from '../../utils/haptics';
import {
  ChevronLeft,
  ChevronRight,
  Target,
  Crown,
  Users,
  Shield,
  ArrowRight,
  Swords,
  Flame,
  Award,
  Sparkles,
} from 'lucide-react';

interface CommandersDashboardProps {
  onOpenSquad?: (team: Team) => void;
  className?: string;
}

export interface CommanderData {
  id: string;
  name: string;
  shortName: string;
  captain: string;
  firstName: string;
  lastName: string;
  role: string;
  subtitle: string;
  bio: string;
  matches: number;
  runs: string;
  sr: number;
  winRate: string;
  tacticalRating: string;
  iccTier: string;
  bigPhoto: string;
  carouselAvatar: string;
  quickStats: string;
  boardLogo: string;
  boardAcronym: string;
  boardFullName: string;
  coach: string;
  coachBio: string;
  tossRecord: string;
  clutchRating: number;
}

export const COMMANDERS_CATALOG: Record<string, CommanderData> = {
  ind: {
    id: 'ind',
    name: 'India',
    shortName: 'IND',
    captain: 'Rohit Sharma',
    firstName: 'Rohit',
    lastName: 'Sharma',
    role: 'Captain & Opener',
    subtitle: 'Captain & Opener · SR 140.9 · 4,231 Runs',
    bio: "ICC Men's T20 World Cup winning captain and prolific white-ball opener. Renowned for fearless powerplay shot-making, pull-shot mastery, and astute tactical field sets that stifle opposition momentum.",
    matches: 159,
    runs: '4,231',
    sr: 140.9,
    winRate: '73.8%',
    tacticalRating: '97/100',
    iccTier: 'Elite Commander',
    bigPhoto: '/players/rohit_sharma.jpg',
    carouselAvatar: '/players/rohit_sharma.jpg',
    quickStats: '4231r · 140.9 SR',
    boardLogo: '/logos/bcci.svg',
    boardAcronym: 'BCCI',
    boardFullName: 'India National Board',
    coach: 'Gautam Gambhir',
    coachBio: 'Two-time World Cup winner instilling aggressive winning mindset, tactical clarity, and high-performance execution.',
    tossRecord: '56% Toss Win Rate · Elects to Bat 62% in Knockouts',
    clutchRating: 98,
  },
  aus: {
    id: 'aus',
    name: 'Australia',
    shortName: 'AUS',
    captain: 'Mitchell Marsh',
    firstName: 'Mitchell',
    lastName: 'Marsh',
    role: 'Captain & All-Rounder',
    subtitle: 'Captain & All-Rounder · SR 135.8 · 1,432 Runs',
    bio: "Aggressive power-hitting all-rounder commanding Australia's white-ball resurgence. Known for ferocious back-foot boundary striking, tactical pace choking, and relentless competitive drive under lights.",
    matches: 68,
    runs: '1,432',
    sr: 135.8,
    winRate: '68.2%',
    tacticalRating: '94/100',
    iccTier: 'Elite Commander',
    bigPhoto: '/players/mitchell_marsh.jpg',
    carouselAvatar: '/players/mitchell_marsh.jpg',
    quickStats: '1432r · 135.8 SR',
    boardLogo: '/logos/aus.svg',
    boardAcronym: 'CRICKET AUSTRALIA',
    boardFullName: 'Australia National Board',
    coach: 'Andrew McDonald',
    coachBio: 'Pragmatic strategist emphasizing role clarity, aggressive field settings, and match-winning tactical execution.',
    tossRecord: '62% Toss Win Rate · Elects to Bowl First 68%',
    clutchRating: 95,
  },
  eng: {
    id: 'eng',
    name: 'England',
    shortName: 'ENG',
    captain: 'Jos Buttler',
    firstName: 'Jos',
    lastName: 'Buttler',
    role: 'Captain & Wicketkeeper',
    subtitle: 'Captain & Wicketkeeper · SR 146.3 · 3,364 Runs',
    bio: "Explosive 360-degree white-ball destructive opener. World Cup champion captain who transformed England's ultra-aggressive batting identity with fearless strokeplay and innovative ramps.",
    matches: 124,
    runs: '3,364',
    sr: 146.3,
    winRate: '62.5%',
    tacticalRating: '95/100',
    iccTier: 'Elite Commander',
    bigPhoto: '/players/jos_buttler.jpg',
    carouselAvatar: '/players/jos_buttler.jpg',
    quickStats: '3364r · 146.3 SR',
    boardLogo: '/logos/eng.svg',
    boardAcronym: 'ECB',
    boardFullName: 'England & Wales Cricket Board',
    coach: 'Brendon McCullum',
    coachBio: 'Revolutionary coach pioneering the fearless high-tempo ethos and psychological dominance.',
    tossRecord: '58% Toss Win Rate · Chases 70% of Matches',
    clutchRating: 96,
  },
  sa: {
    id: 'sa',
    name: 'South Africa',
    shortName: 'SA',
    captain: 'Aiden Markram',
    firstName: 'Aiden',
    lastName: 'Markram',
    role: 'Captain & Opener',
    subtitle: 'Captain & Opener · SR 145.2 · 1,280 Runs',
    bio: "Composed, technically immaculate leader who steered South Africa to their historic first-ever Men's T20 World Cup Final with disciplined strokeplay and inspirational tactical composure.",
    matches: 48,
    runs: '1,280',
    sr: 145.2,
    winRate: '65.4%',
    tacticalRating: '93/100',
    iccTier: 'Elite Commander',
    bigPhoto: '/players/aiden_markram.jpg',
    carouselAvatar: '/players/aiden_markram.jpg',
    quickStats: '1280r · 145.2 SR',
    boardLogo: '/logos/sa.svg',
    boardAcronym: 'CSA',
    boardFullName: 'Cricket South Africa',
    coach: 'Rob Walter',
    coachBio: 'High-performance coach building mental resilience and versatile pace-spin bowling combinations.',
    tossRecord: '52% Toss Win Rate · Prefers First-Innings Totals',
    clutchRating: 93,
  },
  pak: {
    id: 'pak',
    name: 'Pakistan',
    shortName: 'PAK',
    captain: 'Babar Azam',
    firstName: 'Babar',
    lastName: 'Azam',
    role: 'Captain & Anchor',
    subtitle: 'Captain & Anchor · SR 129.5 · 4,145 Runs',
    bio: 'Prolific accumulator and master of cover drives. World-class anchor who holds the batting order together with supreme consistency, elegant balance, and astute game awareness.',
    matches: 123,
    runs: '4,145',
    sr: 129.5,
    winRate: '61.2%',
    tacticalRating: '92/100',
    iccTier: 'Elite Commander',
    bigPhoto: '/players/babar_azam.jpg',
    carouselAvatar: '/players/babar_azam.jpg',
    quickStats: '4145r · 129.5 SR',
    boardLogo: '/logos/pak.svg',
    boardAcronym: 'PCB',
    boardFullName: 'Pakistan Cricket Board',
    coach: 'Gary Kirsten',
    coachBio: 'World Cup winning mentor specializing in batting mental fortitude and high-pressure tournament readiness.',
    tossRecord: '54% Toss Win Rate · Relies on Express Pace Strike',
    clutchRating: 92,
  },
  wi: {
    id: 'wi',
    name: 'West Indies',
    shortName: 'WI',
    captain: 'Rovman Powell',
    firstName: 'Rovman',
    lastName: 'Powell',
    role: 'Captain & Finisher',
    subtitle: 'Captain & Finisher · SR 143.6 · 1,512 Runs',
    bio: 'Powerhouse middle-order finisher renowned for towering maximums and revitalizing West Indian cricket with fearless swagger, boundary-clearing prowess, and unity.',
    matches: 77,
    runs: '1,512',
    sr: 143.6,
    winRate: '58.7%',
    tacticalRating: '91/100',
    iccTier: 'Elite Commander',
    bigPhoto: '/players/rovman powell.jpg',
    carouselAvatar: '/players/rovman powell.jpg',
    quickStats: '1512r · 143.6 SR',
    boardLogo: '/logos/wi.svg',
    boardAcronym: 'CWI',
    boardFullName: 'Cricket West Indies',
    coach: 'Daren Sammy',
    coachBio: 'Two-time T20 World Cup winning captain instilling championship belief, unity, and Caribbean flair.',
    tossRecord: '50% Toss Win Rate · Six-Hitting Rate 1 in every 5.8 balls',
    clutchRating: 94,
  },
  nz: {
    id: 'nz',
    name: 'New Zealand',
    shortName: 'NZ',
    captain: 'Mitchell Santner',
    firstName: 'Mitchell',
    lastName: 'Santner',
    role: 'Captain & Spinner',
    subtitle: 'Captain & Left-Arm Spinner · 112 Wkts · 724 Runs',
    bio: 'Cerebral spin wizard and composed captain known for ice-cool defense, deceptive arm-balls, and clinical field maneuvers under pressure in ICC tournaments.',
    matches: 98,
    runs: '724',
    sr: 124.8,
    winRate: '61.0%',
    tacticalRating: '92/100',
    iccTier: 'Elite Commander',
    bigPhoto: '/players/OIP (1).webp',
    carouselAvatar: '/players/OIP (1).webp',
    quickStats: '724r · 124.8 SR',
    boardLogo: '/logos/nz.svg',
    boardAcronym: 'NZC',
    boardFullName: 'New Zealand Cricket',
    coach: 'Gary Stead',
    coachBio: 'Long-standing tactician emphasizing discipline, boundary prevention, and tactical acumen.',
    tossRecord: '51% Toss Win Rate · Economical Spin Mastery',
    clutchRating: 91,
  },
  sl: {
    id: 'sl',
    name: 'Sri Lanka',
    shortName: 'SL',
    captain: 'Charith Asalanka',
    firstName: 'Charith',
    lastName: 'Asalanka',
    role: 'Captain & Batter',
    subtitle: 'Captain & Middle-Order Batter · SR 128.4 · 1,180 Runs',
    bio: "Left-handed dynamic strokeplayer spearheading Sri Lanka's resurgence with fearless counter-attacks, spin adaptability, and passionate leadership.",
    matches: 54,
    runs: '1,180',
    sr: 128.4,
    winRate: '54.5%',
    tacticalRating: '89/100',
    iccTier: 'Tactical Commander',
    bigPhoto: '/players/charith_asalanka.webp',
    carouselAvatar: '/players/charith_asalanka.webp',
    quickStats: '1180r · 128.4 SR',
    boardLogo: '/logos/sl.svg',
    boardAcronym: 'SLC',
    boardFullName: 'Sri Lanka Cricket',
    coach: 'Sanath Jayasuriya',
    coachBio: 'Legendary icon instilling fearless aggression and intent from ball one.',
    tossRecord: '48% Toss Win Rate · High Spin Choke Ability',
    clutchRating: 89,
  },
  ban: {
    id: 'ban',
    name: 'Bangladesh',
    shortName: 'BAN',
    captain: 'Najmul Hossain Shanto',
    firstName: 'Najmul',
    lastName: 'Shanto',
    role: 'Captain & Anchor',
    subtitle: 'Captain & Top-Order Batter · SR 112.5 · 945 Runs',
    bio: 'Resilient top-order anchor marshalling the Tigers with strategic patience, spin traps, and passionate on-field captaincy.',
    matches: 44,
    runs: '945',
    sr: 112.5,
    winRate: '48.2%',
    tacticalRating: '88/100',
    iccTier: 'Tactical Commander',
    bigPhoto: '/players/najmul_hossain_shanto.jpg',
    carouselAvatar: '/players/najmul_hossain_shanto.jpg',
    quickStats: '945r · 112.5 SR',
    boardLogo: '/logos/ban.svg',
    boardAcronym: 'BCB',
    boardFullName: 'Bangladesh Cricket Board',
    coach: 'Chandika Hathurusingha',
    coachBio: 'Methodical master planner focused on subcontinent conditions and tactical spin variations.',
    tossRecord: '46% Toss Win Rate · Slow Turning Pitch Specialists',
    clutchRating: 87,
  },
  afg: {
    id: 'afg',
    name: 'Afghanistan',
    shortName: 'AFG',
    captain: 'Rashid Khan',
    firstName: 'Rashid',
    lastName: 'Khan',
    role: 'Captain & Spin Maestro',
    subtitle: 'Captain & Leg-Spin Maestro · 150 Wkts · 465 Runs',
    bio: "Global T20 icon whose quick-arm googlies and unyielding passion turned Afghanistan into a formidable world cricket superpower.",
    matches: 92,
    runs: '465',
    sr: 130.2,
    winRate: '63.8%',
    tacticalRating: '96/100',
    iccTier: 'Elite Commander',
    bigPhoto: '/players/rashid_khan.jpg',
    carouselAvatar: '/players/rashid_khan.jpg',
    quickStats: '465r · 150 Wkts',
    boardLogo: '/logos/afg.svg',
    boardAcronym: 'ACB',
    boardFullName: 'Afghanistan Cricket Board',
    coach: 'Jonathan Trott',
    coachBio: 'Brings elite professionalism, mental toughness, and tactical discipline to the squad.',
    tossRecord: '59% Toss Win Rate · Defends Sub-160 Totals',
    clutchRating: 97,
  },
  ire: {
    id: 'ire',
    name: 'Ireland',
    shortName: 'IRE',
    captain: 'Paul Stirling',
    firstName: 'Paul',
    lastName: 'Stirling',
    role: 'Captain & Opener',
    subtitle: 'Captain & Powerplay Blaster · SR 135.6 · 3,589 Runs',
    bio: 'Veteran swashbuckling opener with over a decade of international dominance. Feared for ruthless boundary striking in the powerplay overs.',
    matches: 145,
    runs: '3,589',
    sr: 135.6,
    winRate: '45.2%',
    tacticalRating: '86/100',
    iccTier: 'Veteran Commander',
    bigPhoto: '/players/paul stirling.webp',
    carouselAvatar: '/players/paul stirling.webp',
    quickStats: '3589r · 135.6 SR',
    boardLogo: '/logos/cricket_ireland.webp',
    boardAcronym: 'CRICKET IRELAND',
    boardFullName: 'Cricket Ireland',
    coach: 'Heinrich Malan',
    coachBio: 'Cultivating modern pace-bowling depth and aggressive powerplay batting.',
    tossRecord: '47% Toss Win Rate · Powerplay Attack Focus',
    clutchRating: 86,
  },
  zim: {
    id: 'zim',
    name: 'Zimbabwe',
    shortName: 'ZIM',
    captain: 'Sikandar Raza',
    firstName: 'Sikandar',
    lastName: 'Raza',
    role: 'Captain & All-Rounder',
    subtitle: 'Captain & Match-Winner · SR 134.2 · 2,034 Runs',
    bio: 'Inspirational clutch all-rounder whose carrom balls and fearless strokeplay have orchestrated historic giant-killing victories across world tournaments.',
    matches: 91,
    runs: '2,034',
    sr: 134.2,
    winRate: '46.5%',
    tacticalRating: '88/100',
    iccTier: 'Clutch Commander',
    bigPhoto: '/players/Sikandar Raza.webp',
    carouselAvatar: '/players/Sikandar Raza.webp',
    quickStats: '2034r · 134.2 SR',
    boardLogo: '/logos/zimbabwe_cricket.webp',
    boardAcronym: 'ZIMBABWE CRICKET',
    boardFullName: 'Zimbabwe Cricket Board',
    coach: 'Justin Sammons',
    coachBio: 'Tactical coach cultivating youth talent and fearless attacking mindset.',
    tossRecord: '49% Toss Win Rate · Giant-Killer Execution',
    clutchRating: 90,
  },
};

export const TWELVE_NATIONS_LIST = [
  'ind',
  'aus',
  'eng',
  'sa',
  'pak',
  'wi',
  'nz',
  'sl',
  'ban',
  'afg',
  'ire',
  'zim',
];

export const CommandersDashboard: React.FC<CommandersDashboardProps> = ({
  onOpenSquad,
  className = '',
}) => {
  const [selectedTeamId, setSelectedTeamId] = useState<string>('ind');
  const [showRoster, setShowRoster] = useState<boolean>(false);
  const carouselRef = useRef<HTMLDivElement>(null);

  // Modals
  const [wagonWheelPlayer, setWagonWheelPlayer] = useState<Player | null>(null);
  const [isTeamIndiaAnalyticsOpen, setIsTeamIndiaAnalyticsOpen] = useState(false);
  const [isCompareOpen, setIsCompareOpen] = useState(false);

  const activeCommander = COMMANDERS_CATALOG[selectedTeamId] || COMMANDERS_CATALOG.ind;

  const activeTeam: Team = useMemo(() => {
    return (
      TEAMS.find((t) => t.id === selectedTeamId) ||
      TEAMS[0]
    );
  }, [selectedTeamId]);

  const activeCaptainPlayer: Player = useMemo(() => {
    return (
      activeTeam.squad.find(
        (p) =>
          p.name.toLowerCase().includes(activeCommander.lastName.toLowerCase()) ||
          p.id.toLowerCase() === selectedTeamId ||
          p.id.toLowerCase().includes('captain')
      ) || activeTeam.squad[0]
    );
  }, [activeTeam, activeCommander]);

  const handleScrollLeft = () => {
    if (carouselRef.current) {
      carouselRef.current.scrollBy({ left: -260, behavior: 'smooth' });
    }
    triggerHaptic(HAPTIC_PATTERNS.TAP);
  };

  const handleScrollRight = () => {
    if (carouselRef.current) {
      carouselRef.current.scrollBy({ left: 260, behavior: 'smooth' });
    }
    triggerHaptic(HAPTIC_PATTERNS.TAP);
  };

  const handleSelectTeam = (id: string) => {
    setSelectedTeamId(id);
    cricketAudio.playBatHit();
    triggerHaptic(HAPTIC_PATTERNS.TAP);
  };

  const handleInspectWagonWheel = () => {
    if (selectedTeamId === 'ind') {
      setIsTeamIndiaAnalyticsOpen(true);
    } else {
      setWagonWheelPlayer(activeCaptainPlayer);
    }
    cricketAudio.playBatHit();
    triggerHaptic(HAPTIC_PATTERNS.TAP);
  };

  const handleToggleRoster = () => {
    setShowRoster((prev) => !prev);
    cricketAudio.playUiClick();
    triggerHaptic(HAPTIC_PATTERNS.TAP);
    if (onOpenSquad) {
      onOpenSquad(activeTeam);
    }
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* =========================================================================
          TOP NATIONS CAROUSEL (USING FULL COUNTRY NAMES & FLAGS - NO BARE SHORTFORMS)
          ========================================================================= */}
      <div className="relative group/carousel">
        {/* Left Arrow Button */}
        <button
          onClick={handleScrollLeft}
          className="absolute -left-2 sm:-left-3 top-1/2 -translate-y-1/2 z-20 h-9 w-9 rounded-full bg-[#030b1c]/95 border border-cyan-500/50 text-cyan-300 hover:text-white hover:bg-cyan-950 flex items-center justify-center transition-all cursor-pointer shadow-xl backdrop-blur-md"
          title="Previous nation"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>

        {/* Right Arrow Button */}
        <button
          onClick={handleScrollRight}
          className="absolute -right-2 sm:-right-3 top-1/2 -translate-y-1/2 z-20 h-9 w-9 rounded-full bg-[#030b1c]/95 border border-cyan-500/50 text-cyan-300 hover:text-white hover:bg-cyan-950 flex items-center justify-center transition-all cursor-pointer shadow-xl backdrop-blur-md"
          title="Next nation"
        >
          <ChevronRight className="h-5 w-5" />
        </button>

        {/* Scrollable Row */}
        <div
          ref={carouselRef}
          className="flex items-center gap-3.5 overflow-x-auto py-2 px-3 sm:px-4 scrollbar-none snap-x snap-mandatory"
          style={{ scrollBehavior: 'smooth' }}
        >
          {TWELVE_NATIONS_LIST.map((id) => {
            const data = COMMANDERS_CATALOG[id];
            if (!data) return null;
            const isSelected = id === selectedTeamId;

            return (
              <div
                key={id}
                onClick={() => handleSelectTeam(id)}
                className={`relative shrink-0 w-[180px] sm:w-[195px] rounded-2xl p-3 sm:p-3.5 transition-all duration-300 cursor-pointer snap-start ${
                  isSelected
                    ? 'border-2 border-cyan-400 bg-slate-900/95 shadow-[0_0_24px_rgba(6,182,212,0.45)] ring-1 ring-cyan-300'
                    : 'border border-slate-800/90 bg-[#071120]/90 hover:border-slate-700 hover:bg-slate-900/80'
                }`}
              >
                {/* Card Top: National Flag + Full Country Name (NO BARE AU/IND) */}
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <CountryFlag countryCode={data.id} size="md" className="rounded-xs shadow-xs shrink-0" />
                    <span className="text-xs font-bold text-white truncate">{data.name}</span>
                  </div>
                  <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-cyan-950/70 border border-cyan-500/30 text-[10px] font-bold text-cyan-300 shrink-0">
                    <CountryFlag countryCode={data.id} size="sm" className="w-3.5 h-2.5 rounded-[1px]" />
                    <span>{data.name}</span>
                  </div>
                </div>

                {/* Card Middle: Captain Avatar Squircle + Details */}
                <div className="flex items-center gap-2.5 mb-2">
                  <div className="relative w-10 h-10 rounded-xl overflow-hidden bg-slate-950 border border-slate-800 shrink-0 shadow-sm">
                    <img
                      src={toSafeAssetUrl(data.carouselAvatar)}
                      alt={data.captain}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover object-top"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = '/players/rohit_sharma.jpg';
                      }}
                    />
                  </div>
                  <div className="min-w-0">
                    <span className="text-[9px] font-mono font-bold text-amber-400 tracking-wider uppercase block leading-none">
                      CAPTAIN
                    </span>
                    <h4 className="text-xs font-bold text-white truncate mt-0.5">{data.captain}</h4>
                    <p className="text-[10px] font-mono text-slate-400 truncate mt-0.5">{data.quickStats}</p>
                  </div>
                </div>

                {/* Card Bottom: Win Rate */}
                <div className="flex items-center justify-between text-[11px] pt-1.5 border-t border-slate-800/60 font-mono">
                  <span className="text-slate-400">Win Rate</span>
                  <span className="font-bold text-emerald-400">{data.winRate}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* =========================================================================
          MAIN COMMANDER CARD (WITH ORIGINAL LOGOS & FULL NATION NAMES)
          ========================================================================= */}
      <div className="relative rounded-3xl border border-cyan-500/35 bg-gradient-to-b from-[#020b18] via-[#020914] to-[#010610] p-6 sm:p-8 lg:p-9 shadow-[0_0_50px_rgba(6,182,212,0.18)]">
        <div className="flex flex-col lg:flex-row items-center lg:items-stretch gap-6 lg:gap-8">
          {/* =====================================================================
              LEFT: Captain Photo Card with Cyan Neon Glow & Script Name
              ===================================================================== */}
          <div className="relative rounded-3xl border-[3px] border-cyan-400 bg-slate-950 shadow-[0_0_35px_rgba(6,182,212,0.45)] overflow-hidden w-full max-w-[280px] sm:max-w-[310px] aspect-[4/5] shrink-0 flex flex-col justify-between">
            {/* Top Left Floating Country Badge with Flag & Full Country Name */}
            <div className="absolute top-3.5 left-3.5 z-20 flex items-center gap-2 rounded-lg border border-white/25 bg-black/75 px-3 py-1.5 backdrop-blur-md text-xs font-bold text-white shadow-md">
              <CountryFlag countryCode={activeTeam.id} size="md" className="rounded-xs" />
              <span className="font-sans tracking-wide font-black">{activeCommander.name}</span>
            </div>

            {/* Main Portrait Photo */}
            <img
              src={toSafeAssetUrl(activeCommander.bigPhoto || resolvePlayerImageUrl(activeCaptainPlayer))}
              alt={activeCommander.captain}
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover object-top"
              onError={(e) => {
                (e.target as HTMLImageElement).src = toSafeAssetUrl(resolvePlayerImageUrl(activeCaptainPlayer));
              }}
            />

            {/* Gradient shade at bottom for text readability */}
            <div className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-black/85 via-black/40 to-transparent pointer-events-none" />

            {/* Script Name Overlay at bottom */}
            <div className="absolute inset-x-0 bottom-3.5 z-20 text-center pointer-events-none">
              <span className="font-serif italic text-white text-lg sm:text-xl font-bold tracking-wide drop-shadow-[0_2px_8px_rgba(0,0,0,0.9)]">
                {activeCommander.captain}
              </span>
            </div>
          </div>

          {/* =====================================================================
              CENTER: Captain Details & Bio & Stats & Action Buttons
              ===================================================================== */}
          <div className="flex-1 min-w-0 flex flex-col justify-between space-y-4">
            <div>
              {/* Badges Row */}
              <div className="flex flex-wrap items-center gap-2.5 mb-2.5">
                {/* Gold Ribbon Badge */}
                <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-400/50 bg-amber-500/10 px-3 py-1 text-xs font-mono font-bold text-amber-300 shadow-[0_0_12px_rgba(245,158,11,0.2)]">
                  <span>🏅</span>
                  <span>OFFICIAL TEAM CAPTAIN</span>
                </span>

                {/* Flag + Full Country Name Pill (NO BARE AU/IND) */}
                <span className="inline-flex items-center gap-2 rounded-full border border-cyan-500/40 bg-cyan-950/40 px-3.5 py-1 text-xs font-bold text-cyan-300">
                  <CountryFlag countryCode={activeCommander.id} size="sm" className="rounded-xs" />
                  <span>{activeCommander.name}</span>
                  <span className="text-slate-500">|</span>
                  <span className="font-normal text-slate-300">National Squad</span>
                </span>
              </div>

              {/* Main Heading: First Name in White, Last Name in Cyan */}
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight">
                {activeCommander.firstName}{' '}
                <span className="text-cyan-400 drop-shadow-[0_0_20px_rgba(34,211,238,0.5)]">
                  {activeCommander.lastName}
                </span>
              </h2>

              {/* Subtitle */}
              <p className="text-xs sm:text-sm font-semibold text-cyan-400 mt-1 tracking-wide font-sans">
                {activeCommander.subtitle}
              </p>

              {/* Bio */}
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed mt-3 max-w-2xl font-sans">
                {activeCommander.bio}
              </p>
            </div>

            {/* 3 Stat Boxes Row */}
            <div className="grid grid-cols-3 gap-3 max-w-xl">
              <div className="rounded-2xl border border-cyan-500/20 bg-[#051026]/90 p-3 sm:p-4 text-center shadow-inner">
                <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider block">
                  MATCHES
                </span>
                <span className="text-2xl sm:text-3xl font-black font-mono text-white mt-0.5 block">
                  {activeCommander.matches}
                </span>
                <span className="text-[10px] text-slate-400 font-sans block mt-0.5">T20I Caps</span>
              </div>

              <div className="rounded-2xl border border-cyan-500/20 bg-[#051026]/90 p-3 sm:p-4 text-center shadow-inner">
                <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider block">
                  CAREER RUNS
                </span>
                <span className="text-2xl sm:text-3xl font-black font-mono text-cyan-300 mt-0.5 block">
                  {activeCommander.runs}
                </span>
                <span className="text-[10px] text-slate-400 font-sans block mt-0.5">{activeCommander.sr} SR</span>
              </div>

              <div className="rounded-2xl border border-cyan-500/20 bg-[#051026]/90 p-3 sm:p-4 text-center shadow-inner">
                <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider block">
                  WIN RATE
                </span>
                <span className="text-2xl sm:text-3xl font-black font-mono text-emerald-400 mt-0.5 block">
                  {activeCommander.winRate}
                </span>
                <span className="text-[10px] text-slate-400 font-sans block mt-0.5">Conversion</span>
              </div>
            </div>

            {/* Badges Row (Tactical Rating & ICC Tier) */}
            <div className="flex flex-wrap items-center gap-3 max-w-xl">
              <div className="flex items-center gap-2 rounded-xl border border-cyan-500/30 bg-cyan-950/25 px-3.5 py-2 text-xs font-mono">
                <div className="flex items-center gap-1.5 text-cyan-400 font-bold">
                  <Target className="h-4 w-4" />
                  <span>Tactical Rating</span>
                </div>
                <span className="rounded bg-slate-900 border border-slate-700/80 px-2.5 py-0.5 font-bold text-white tabular-nums">
                  {activeCommander.tacticalRating}
                </span>
              </div>

              <div className="flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-950/20 px-3.5 py-2 text-xs font-mono">
                <div className="flex items-center gap-1.5 text-emerald-400 font-bold">
                  <Crown className="h-4 w-4" />
                  <span>ICC Tier</span>
                </div>
                <span className="rounded bg-slate-900 border border-slate-700/80 px-2.5 py-0.5 font-bold text-white">
                  {activeCommander.iccTier}
                </span>
              </div>

              {/* Compare Rival Captain Trigger */}
              <button
                onClick={() => setIsCompareOpen(true)}
                className="flex items-center gap-1.5 rounded-xl border border-amber-500/40 bg-amber-500/10 hover:bg-amber-500/20 px-3 py-2 text-xs font-mono font-bold text-amber-300 transition-colors cursor-pointer"
              >
                <Swords className="h-3.5 w-3.5 text-amber-400" />
                <span>Compare Rival Captain</span>
              </button>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 max-w-xl pt-1">
              <button
                onClick={handleInspectWagonWheel}
                className="flex-1 rounded-xl bg-cyan-400 px-5 py-3 text-xs sm:text-sm font-black text-slate-950 hover:bg-cyan-300 shadow-[0_0_20px_rgba(6,182,212,0.4)] hover:shadow-[0_0_30px_rgba(6,182,212,0.6)] transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <span className="h-2 w-2 rounded-full bg-slate-950" />
                <span>Inspect 360° Wagon Wheel →</span>
              </button>

              <button
                onClick={handleToggleRoster}
                className={`flex-1 rounded-xl border px-5 py-3 text-xs sm:text-sm font-bold transition-all cursor-pointer flex items-center justify-center gap-2 ${
                  showRoster
                    ? 'border-cyan-400 bg-cyan-500/20 text-white shadow-[0_0_15px_rgba(6,182,212,0.3)]'
                    : 'border-cyan-500/40 bg-cyan-950/30 text-cyan-200 hover:bg-cyan-500/15 hover:border-cyan-400'
                }`}
              >
                <Users className="h-4 w-4 text-cyan-400" />
                <span>{showRoster ? 'Hide Squad Roster ▲' : `View ${activeTeam.squad.length}-Player Squad →`}</span>
              </button>
            </div>
          </div>

          {/* =====================================================================
              RIGHT: Governing Body & Head Coach Card (Using Original National Logos)
              ===================================================================== */}
          <div className="rounded-2xl border border-cyan-500/25 bg-[#030d22] p-5 sm:p-6 text-center flex flex-col justify-between shrink-0 w-full lg:w-72 shadow-xl">
            <div>
              {/* Emblem Squircle with Blue Border */}
              <div className="relative mx-auto h-24 w-24 sm:h-28 sm:w-28 rounded-2xl bg-[#020716] border border-cyan-500/40 p-3 flex items-center justify-center shadow-inner">
                <img
                  src={toSafeAssetUrl(getRealTeamLogoUrl(activeTeam.id) || activeCommander.boardLogo)}
                  alt={`${activeCommander.boardAcronym} Official National Crest`}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-contain drop-shadow-[0_0_18px_rgba(6,182,212,0.45)]"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = `/logos/${activeTeam.id}.svg`;
                  }}
                />
              </div>

              {/* Governing Body Label & Title with Country Flag */}
              <span className="text-[10px] font-mono font-bold tracking-widest text-cyan-400 uppercase block mt-3">
                OFFICIAL GOVERNING BODY
              </span>
              <div className="flex items-center justify-center gap-2 mt-1">
                <CountryFlag countryCode={activeCommander.id} size="sm" className="rounded-xs" />
                <h3 className="text-xl sm:text-2xl font-black text-white">
                  {activeCommander.boardAcronym}
                </h3>
              </div>
              <p className="text-xs text-slate-300 mt-0.5 font-sans font-medium">
                {activeCommander.name} National Board
              </p>
            </div>

            {/* Head Coach Section at Bottom */}
            <div className="border-t border-slate-800/80 pt-4 mt-4 text-left">
              <div className="flex items-center gap-1.5 text-[11px] font-mono font-bold text-amber-400">
                <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 fill-none stroke-current stroke-2">
                  <polygon points="12 2 22 8.5 22 15.5 12 22 2 15.5 2 8.5 12 2" />
                </svg>
                <span>HEAD COACH</span>
              </div>
              <p className="text-sm font-bold text-white mt-1">{activeCommander.coach}</p>
              <p className="text-xs text-slate-400 leading-relaxed mt-1 line-clamp-3">
                {activeCommander.coachBio}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* =========================================================================
          EXPANDABLE 15-MAN SQUAD ROSTER (Revealed via 'View 15-Man Roster')
          ========================================================================= */}
      {showRoster && (
        <div className="rounded-3xl border border-cyan-500/30 bg-[#020b1c]/95 p-6 sm:p-7 space-y-4 animate-in fade-in duration-300">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2.5">
              <CountryFlag countryCode={activeTeam.id} size="md" className="rounded-xs" />
              <h3 className="text-base font-bold text-white">
                {activeTeam.name} · Official {activeTeam.squad.length}-Player Tournament Squad
              </h3>
            </div>
            <button
              onClick={() => setShowRoster(false)}
              className="text-xs font-mono text-slate-400 hover:text-white cursor-pointer"
            >
              Close Roster ✕
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3.5">
            {activeTeam.squad.map((player) => {
              const isCap =
                player.name.toLowerCase().includes(activeCommander.lastName.toLowerCase()) ||
                player.id === activeCaptainPlayer.id;

              return (
                <div
                  key={player.id}
                  onClick={() => {
                    setWagonWheelPlayer(player);
                    triggerHaptic(HAPTIC_PATTERNS.TAP);
                    cricketAudio.playBatHit();
                  }}
                  className={`group relative rounded-2xl p-3 border transition-all cursor-pointer flex flex-col justify-between ${
                    isCap
                      ? 'border-amber-400/60 bg-gradient-to-b from-[#0f244a] to-[#040e24] shadow-[0_0_15px_rgba(245,158,11,0.2)]'
                      : 'border-slate-800 bg-[#03091e]/90 hover:border-cyan-500/50 hover:bg-[#06143b]/90'
                  }`}
                >
                  <div>
                    <div className="flex items-start gap-2.5 mb-2">
                      <PlayerCardAvatar
                        playerId={player.id}
                        name={player.name}
                        countryCode={player.countryCode || activeTeam.id}
                        jerseyNumber={player.jerseyNumber}
                        size="sm"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-1">
                          <CountryFlag countryCode={activeTeam.id} size="sm" className="rounded-xs shrink-0" />
                          {isCap && (
                            <span className="rounded-full bg-amber-400 text-slate-950 px-1.5 py-0.5 text-[9px] font-mono font-black shrink-0">
                              CAP
                            </span>
                          )}
                        </div>
                        <h4 className="text-xs font-bold text-white group-hover:text-cyan-300 truncate mt-1">
                          {player.name}
                        </h4>
                        <span className="text-[10px] font-mono text-slate-400 block truncate">
                          {player.role}
                        </span>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-1.5 mt-2 pt-2 border-t border-slate-800/80 text-[10px] font-mono tabular-nums">
                      <div>
                        <span className="text-slate-500 block text-[9px]">
                          {player.stats.wickets > 5 && player.stats.runs < 350 ? 'WICKETS' : 'RUNS'}
                        </span>
                        <span className="font-bold text-white">
                          {player.stats.wickets > 5 && player.stats.runs < 350 ? player.stats.wickets : player.stats.runs}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-500 block text-[9px]">
                          {player.stats.wickets > 5 && player.stats.runs < 350 ? 'ECON' : 'SR'}
                        </span>
                        <span className="font-bold text-cyan-400">
                          {player.stats.wickets > 5 && player.stats.runs < 350
                            ? player.stats.economy.toFixed(1)
                            : player.stats.strikeRate.toFixed(1)}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="mt-2.5 pt-1.5 border-t border-slate-800/60 flex items-center justify-between text-[9px] font-mono text-slate-400 group-hover:text-cyan-300">
                    <span>360° Wagon Wheel</span>
                    <ArrowRight className="h-3 w-3 group-hover:translate-x-0.5 transition-transform" />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* =========================================================================
          MODALS: 360° Wagon Wheel, Team India Deep Analytics, Radar Compare
          ========================================================================= */}
      {/* 1. Neon Player 360° Analytics Modal */}
      {wagonWheelPlayer && (
        <NeonPlayerAnalyticsModal
          player={wagonWheelPlayer}
          onClose={() => setWagonWheelPlayer(null)}
        />
      )}

      {/* 2. Team India Deep Analytics Dashboard */}
      {isTeamIndiaAnalyticsOpen && (
        <TeamIndiaAnalyticsDashboard
          isModal={true}
          onClose={() => setIsTeamIndiaAnalyticsOpen(false)}
        />
      )}

      {/* 3. Captain Comparison Radar Modal */}
      {isCompareOpen && (
        <PlayerComparisonModal
          isOpen={isCompareOpen}
          onClose={() => setIsCompareOpen(false)}
          playerA={activeCaptainPlayer}
        />
      )}
    </div>
  );
};
