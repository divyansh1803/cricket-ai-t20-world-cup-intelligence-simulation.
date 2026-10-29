import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Trophy,
  Sparkles,
  Flame,
  Award,
  Shield,
  Star,
  Activity,
  Zap,
  Volume2,
  VolumeX,
  Play,
  Pause,
  ChevronRight,
  ChevronLeft,
  RotateCcw,
  Sliders,
  Share2,
  Download,
  Users,
  Compass,
  TrendingUp,
  BarChart3,
  CheckCircle2,
  Crown,
  Eye,
  Maximize2,
  X,
  HelpCircle,
  Clock,
  MapPin,
  Calendar,
  Radio,
} from 'lucide-react';
import { cricketAudio } from '../../utils/audioSystem';
import { triggerHaptic, HAPTIC_PATTERNS } from '../../utils/haptics';
import { CountryFlag, TeamCrest } from '../common/CricketIdentity';
import { TEAMS } from '../../data/cricketData';
import { Team, Player } from '../../types/cricket';
import { useGame } from '../../context/GameContext';
import { NeonPlayerAnalyticsModal } from '../players/NeonPlayerAnalyticsModal';
import { PlayerComparisonModal } from '../players/PlayerComparisonModal';
import { ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, LineChart, Line, XAxis, YAxis, Tooltip as RechartsTooltip, AreaChart, Area } from 'recharts';

// =========================================================================
// DATA STRUCTURES: CHAMPIONS SQUAD (INDIA T20 WORLD CUP SQUAD)
// =========================================================================
export interface ChampionPlayer {
  id: string;
  name: string;
  role: string;
  jersey: number;
  photoUrl: string;
  runs: number;
  wickets: number;
  strikeRate: number;
  economy: number;
  rating: number; // 0-100
  badge?: 'MVP' | 'POTM_FINAL' | 'TOP_WICKET' | 'TOP_RUNS' | 'CLUTCH_CATCH' | 'LEADER';
  badgeTitle?: string;
  highlightStat: string;
  finalPerformance: string;
  aiBio: string;
}

export const CHAMPION_SQUAD: ChampionPlayer[] = [
  {
    id: 'rohit',
    name: 'Rohit Sharma',
    role: 'Captain & Opening Batter',
    jersey: 45,
    photoUrl: '/players/rohit_sharma.jpg',
    runs: 257,
    wickets: 0,
    strikeRate: 156.7,
    economy: 0,
    rating: 96,
    badge: 'LEADER',
    badgeTitle: 'World Champion Captain',
    highlightStat: '92 (41) vs Australia in Super 8s',
    finalPerformance: '9 (5) · Masterminded bowling rotation',
    aiBio: 'Selfless aggressive opening assault that defined India’s high-tempo campaign, capped with flawless tactical death over management.',
  },
  {
    id: 'vkohli',
    name: 'Virat Kohli',
    role: 'Top-Order Anchor',
    jersey: 18,
    photoUrl: '/players/virat_kohli.jpg',
    runs: 151,
    wickets: 0,
    strikeRate: 112.7,
    economy: 0,
    rating: 97,
    badge: 'POTM_FINAL',
    badgeTitle: 'Final Player of the Match',
    highlightStat: '76 (59) in Final under extreme collapse',
    finalPerformance: '76 (59) · 6x4, 2x6 · Salvaged innings from 34/3',
    aiBio: 'Stepped up on the grandest stage of all when the top order fell, pacing an immortal championship rescue knock.',
  },
  {
    id: 'bumrah',
    name: 'Jasprit Bumrah',
    role: 'Lead Fast Bowler',
    jersey: 93,
    photoUrl: '/players/jasprit_bumrah.jpg',
    runs: 4,
    wickets: 15,
    strikeRate: 0,
    economy: 4.17,
    rating: 99,
    badge: 'MVP',
    badgeTitle: 'Player of the Tournament',
    highlightStat: '15 Wickets · Econ 4.17 across entire WC',
    finalPerformance: '4-0-18-2 · Clean bowled Jansen in death overs',
    aiBio: 'Statistically the most dominant tournament ever bowled in modern T20 World Cup history with unplayable yorkers and cutters.',
  },
  {
    id: 'hardik',
    name: 'Hardik Pandya',
    role: 'Pace Bowling All-Rounder',
    jersey: 33,
    photoUrl: '/players/hardik_pandya.jpg',
    runs: 144,
    wickets: 11,
    strikeRate: 151.6,
    economy: 7.64,
    rating: 96,
    badge: 'CLUTCH_CATCH',
    badgeTitle: '20th Over Defense Hero',
    highlightStat: 'Defended 16 in Final over · 3/20',
    finalPerformance: '3-0-20-3 · Dismissed dangerous Klaasen & Miller',
    aiBio: 'Delivered the greatest redemption arc in cricket history, holding his nerve in the dying balls with tears of euphoria.',
  },
  {
    id: 'arshdeep',
    name: 'Arshdeep Singh',
    role: 'Left-Arm Fast Bowler',
    jersey: 2,
    photoUrl: '/players/arshdeep_singh.jpg',
    runs: 12,
    wickets: 17,
    strikeRate: 0,
    economy: 7.16,
    rating: 94,
    badge: 'TOP_WICKET',
    badgeTitle: 'Joint Leading Wicket-Taker',
    highlightStat: '17 Wickets in 8 matches',
    finalPerformance: '4-0-20-2 · Conceded just 4 runs in 19th over',
    aiBio: 'Bowled an unbelievable 19th over yielding only 4 singles, setting the stage for India’s glorious championship coronation.',
  },
  {
    id: 'sky',
    name: 'Suryakumar Yadav',
    role: 'Middle-Order Batter',
    jersey: 63,
    photoUrl: '/players/suryakumar_yadav.jpg',
    runs: 199,
    wickets: 0,
    strikeRate: 135.4,
    economy: 0,
    rating: 93,
    badge: 'CLUTCH_CATCH',
    badgeTitle: 'Catch of the Century',
    highlightStat: 'Crucial fifties vs USA & Afghanistan',
    finalPerformance: '3 (4) · Took iconic juggle catch on boundary rope',
    aiBio: 'Etched his name in eternal folklore with an acrobatic boundary tightrope catch on the first ball of the 20th over.',
  },
  {
    id: 'axar',
    name: 'Axar Patel',
    role: 'Spin Bowling All-Rounder',
    jersey: 20,
    photoUrl: '/players/axar_patel.jpg',
    runs: 92,
    wickets: 9,
    strikeRate: 139.4,
    economy: 7.81,
    rating: 92,
    badge: undefined,
    highlightStat: '47 (31) partnership with Kohli',
    finalPerformance: '47 (31) with bat · 3-0-49-1 with ball',
    aiBio: 'Promoted to number 5 under heavy duress, Axar counter-attacked fearlessly to transform 34/3 into an imposing total.',
  },
  {
    id: 'pant',
    name: 'Rishabh Pant',
    role: 'Wicketkeeper Batter',
    jersey: 17,
    photoUrl: '/players/rishabh_pant.jpg',
    runs: 171,
    wickets: 0,
    strikeRate: 127.6,
    economy: 0,
    rating: 91,
    badge: undefined,
    highlightStat: '14 Dismissals behind the stumps',
    finalPerformance: '0 (2) · 1 catch · Strategic knee-tape tactical pause',
    aiBio: 'Sensational comeback to international cricket, anchoring the middle order through challenging New York pitches.',
  },
  {
    id: 'kuldeep',
    name: 'Kuldeep Yadav',
    role: 'Left-Arm Wrist Spinner',
    jersey: 23,
    photoUrl: '/players/kuldeep_yadav.jpg',
    runs: 0,
    wickets: 10,
    strikeRate: 0,
    economy: 6.95,
    rating: 92,
    badge: undefined,
    highlightStat: '10 Wickets in Caribbean leg',
    finalPerformance: '4-0-45-0 · Key middle-overs pressure',
    aiBio: 'Bamboozled batters across the Caribbean Super 8s and Semifinal, ripping the heart out of England’s middle order.',
  },
  {
    id: 'dube',
    name: 'Shivam Dube',
    role: 'Power-Hitting All-Rounder',
    jersey: 25,
    photoUrl: '/players/shivam_dube.jpg',
    runs: 133,
    wickets: 0,
    strikeRate: 124.3,
    economy: 0,
    rating: 88,
    badge: undefined,
    highlightStat: '27 (16) death cameo in Final',
    finalPerformance: '27 (16) · 3x4, 1x6 · Vital late surge',
    aiBio: 'Stood tall in the death overs of the final to lift India from 150 to an ultimately match-winning 176.',
  },
  {
    id: 'jadeja',
    name: 'Ravindra Jadeja',
    role: 'All-Rounder',
    jersey: 8,
    photoUrl: '/players/ravindra_jadeja.jpg',
    runs: 35,
    wickets: 1,
    strikeRate: 110.0,
    economy: 7.2,
    rating: 87,
    badge: undefined,
    highlightStat: 'Elite fielding saving 25+ runs',
    finalPerformance: '2 (2) · 1-0-12-0 · Bullet boundary arm',
    aiBio: 'Invaluable fielding sentinel and veteran composure during the high-octane championship climax.',
  },
];

// =========================================================================
// CHAMPIONSHIP MOMENTS TIMELINE DATA
// =========================================================================
export interface ChampionshipMoment {
  id: string;
  over: string;
  title: string;
  subtitle: string;
  scoreState: string;
  description: string;
  heroPlayer: string;
  category: 'wicket' | 'boundary' | 'partnership' | 'clutch_over' | 'trophy';
  winProbIndia: number;
  highlightQuote: string;
}

export const CHAMPIONSHIP_MOMENTS: ChampionshipMoment[] = [
  {
    id: 'm1',
    over: 'Over 0.6',
    title: 'Kohli Triple-Boundary Blitz',
    subtitle: 'Setting Early Intent Against Jansen',
    scoreState: 'IND 15/0',
    description: 'Kohli took down Marco Jansen in the opening over, driving crisply through mid-off and clipping behind square for three sublime boundaries.',
    heroPlayer: 'Virat Kohli',
    category: 'boundary',
    winProbIndia: 62,
    highlightQuote: '“Textbook perfection from Kohli on the very first over of a World Cup final!”',
  },
  {
    id: 'm2',
    over: 'Over 13.3',
    title: 'Axar Patel’s Counter-Attacking 47',
    subtitle: 'The 72-Run Rescue Stand',
    scoreState: 'IND 106/4',
    description: 'Promoted to number 5 after an early 34/3 shock, Axar smote four towering sixes off Maharaj and Shamsi to shift momentum back to India.',
    heroPlayer: 'Axar Patel',
    category: 'partnership',
    winProbIndia: 68,
    highlightQuote: '“Axar has turned this final on its head with sheer fearless audacity!”',
  },
  {
    id: 'm3',
    over: 'Over 15.0',
    title: 'The Klaasen Storm (24 Runs in an Over)',
    subtitle: 'South Africa Surge to 30 Off 30 Balls',
    scoreState: 'SA 151/4 (Need 30 off 30)',
    description: 'Heinrich Klaasen blasted 24 runs off the 15th over, putting South Africa in near total control with a 96% AI win probability.',
    heroPlayer: 'Heinrich Klaasen',
    category: 'clutch_over',
    winProbIndia: 4,
    highlightQuote: '“South Africa have one hand on the trophy—India need an absolute miracle!”',
  },
  {
    id: 'm4',
    over: 'Over 16.1',
    title: 'Hardik Breaches Klaasen with Slower Ball',
    subtitle: 'The Golden Breakthrough',
    scoreState: 'SA 151/5 (Need 26 off 23)',
    description: 'Hardik was recalled into the attack and deceived Klaasen with a wide cutter outside off, inducing a thin edge to Rishabh Pant.',
    heroPlayer: 'Hardik Pandya',
    category: 'wicket',
    winProbIndia: 35,
    highlightQuote: '“Klaasen is gone! There is life yet in this Indian side! The roar in Barbados is deafening!”',
  },
  {
    id: 'm5',
    over: 'Over 17.4',
    title: 'Bumrah Castles Jansen with Dipping In-Seamer',
    subtitle: 'The 2-Run Squeeze',
    scoreState: 'SA 156/6 (Need 21 off 14)',
    description: 'Bumrah bowled the over of the tournament, jagging one sharply back between Marco Jansen’s bat and pad into the top of off stump.',
    heroPlayer: 'Jasprit Bumrah',
    category: 'wicket',
    winProbIndia: 74,
    highlightQuote: '“Timber! A peach from Jasprit Bumrah! He has ripped the game open!”',
  },
  {
    id: 'm6',
    over: 'Over 19.1',
    title: 'Suryakumar’s Boundary Tightrope Catch',
    subtitle: 'The Greatest Catch in Cricket History',
    scoreState: 'SA 161/7 (Need 16 off 5)',
    description: 'David Miller launched a full toss straight to long-off. Suryakumar Yadav caught it, threw it in the air as momentum took him over the ropes, and skipped back inside to complete the catch.',
    heroPlayer: 'Suryakumar Yadav',
    category: 'wicket',
    winProbIndia: 92,
    highlightQuote: '“HE HAS TAKEN IT! SURYAKUMAR YADAV HAS TAKEN THE CATCH OF HIS LIFE!”',
  },
  {
    id: 'm7',
    over: 'Over 20.0',
    title: 'INDIA CROWNED WORLD CHAMPIONS!',
    subtitle: 'Victory by 7 Runs · Ending the 11-Year Drought',
    scoreState: 'IND 176/7 beat SA 169/8 by 7 runs',
    description: 'Hardik defended 16 off the final over. As the final ball sailed to the boundary for a single, Rohit Sharma fell to his knees in tears and hammered the Barbados turf in ecstasy.',
    heroPlayer: 'Team India',
    category: 'trophy',
    winProbIndia: 100,
    highlightQuote: '“INDIA ARE CHAMPIONS OF THE WORLD! Rohit Sharma drops to the turf, the tricolor flies high in the Caribbean!”',
  },
];

// =========================================================================
// AI CHAMPIONSHIP INTELLIGENCE METRICS
// =========================================================================
export const RADAR_DATA = [
  { subject: 'Batting Power', A: 96, fullMark: 100 },
  { subject: 'Death Economy', A: 98, fullMark: 100 },
  { subject: 'Fielding Reflex', A: 94, fullMark: 100 },
  { subject: 'Pressure Clutch', A: 99, fullMark: 100 },
  { subject: 'Spin Mastery', A: 92, fullMark: 100 },
  { subject: 'Powerplay Dominance', A: 95, fullMark: 100 },
];

export const WIN_PROB_PROGRESSION = [
  { over: '0 ov', prob: 50 },
  { over: '2 ov', prob: 65 },
  { over: '5 ov', prob: 42 },
  { over: '10 ov', prob: 58 },
  { over: '15 ov (IND)', prob: 70 },
  { over: '20 ov (IND)', prob: 76 },
  { over: '25 ov', prob: 68 },
  { over: '30 ov', prob: 52 },
  { over: '35 ov (Klaasen 24r)', prob: 4 },
  { over: '36 ov (Hardik Wkt)', prob: 35 },
  { over: '38 ov (Bumrah Wkt)', prob: 74 },
  { over: '39 ov (Arshdeep 4r)', prob: 88 },
  { over: '39.1 ov (SKY Catch)', prob: 95 },
  { over: '40 ov (Victory)', prob: 100 },
];

export const ROAD_TO_GLORY_MATCHES = [
  { stage: 'Group Stage', opponent: 'Ireland', venue: 'New York', result: 'Won by 8 wickets', margin: '46 balls remaining', potm: 'Jasprit Bumrah' },
  { stage: 'Group Stage', opponent: 'Pakistan', venue: 'New York', result: 'Won by 6 runs', margin: 'Defended 119 in thriller', potm: 'Jasprit Bumrah' },
  { stage: 'Group Stage', opponent: 'USA', venue: 'New York', result: 'Won by 7 wickets', margin: 'Arshdeep 4/9 career best', potm: 'Arshdeep Singh' },
  { stage: 'Super 8s', opponent: 'Afghanistan', venue: 'Barbados', result: 'Won by 47 runs', margin: 'SKY 53 (28) & Bumrah 3/7', potm: 'Suryakumar Yadav' },
  { stage: 'Super 8s', opponent: 'Bangladesh', venue: 'Antigua', result: 'Won by 50 runs', margin: 'Hardik 50* (27) & Kuldeep 3/19', potm: 'Hardik Pandya' },
  { stage: 'Super 8s', opponent: 'Australia', venue: 'St Lucia', result: 'Won by 24 runs', margin: 'Rohit 92 (41) destruction', potm: 'Rohit Sharma' },
  { stage: 'Semifinal', opponent: 'England', venue: 'Guyana', result: 'Won by 68 runs', margin: 'Axar 3/23 & Kuldeep 3/19 spin choke', potm: 'Axar Patel' },
  { stage: 'THE FINAL', opponent: 'South Africa', venue: 'Barbados', result: 'WORLD CHAMPIONS', margin: 'Won by 7 runs · 176/7 vs 169/8', potm: 'Virat Kohli' },
];

export const ChampionshipExperience: React.FC = () => {
  const { setActiveModalPlayer, setActiveView } = useGame();

  // Navigation Subtabs
  const [activeTab, setActiveTab] = useState<
    'victory_theatre' | 'champions_roster' | 'moments_timeline' | 'ai_intelligence' | 'trophy_room' | 'road_to_glory'
  >('victory_theatre');

  // Interactive States
  const [selectedPlayer, setSelectedPlayer] = useState<ChampionPlayer>(CHAMPION_SQUAD[2]); // Jasprit Bumrah
  const [selectedMoment, setSelectedMoment] = useState<ChampionshipMoment>(CHAMPIONSHIP_MOMENTS[5]); // SKY Catch
  const [isCelebrationMode, setIsCelebrationMode] = useState<boolean>(false);
  const [soundMuted, setSoundMuted] = useState<boolean>(false);
  const [trophyRotation, setTrophyRotation] = useState<number>(0);
  const [trophyLiftHeight, setTrophyLiftHeight] = useState<number>(0);
  const [comparePlayerA, setComparePlayerA] = useState<ChampionPlayer>(CHAMPION_SQUAD[0]); // Rohit
  const [comparePlayerB, setComparePlayerB] = useState<ChampionPlayer>(CHAMPION_SQUAD[1]); // Kohli
  const [showCompareModal, setShowCompareModal] = useState<boolean>(false);
  const [showPlayerNeonModal, setShowPlayerNeonModal] = useState<boolean>(false);
  const [posterMode, setPosterMode] = useState<boolean>(false);

  // Canvas ref for celebration fireworks & floating golden particles
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Auto trophy spin when idle
  useEffect(() => {
    const interval = setInterval(() => {
      setTrophyRotation((prev) => (prev + 1.2) % 360);
    }, 45);
    return () => clearInterval(interval);
  }, []);

  // Official Trophy Victory Audio provided by user
  const trophyAudioRef = useRef<HTMLAudioElement | null>(null);

  // Trigger Coordinated Celebration Mode using ONLY the user's provided official audio
  const triggerCelebrationMode = () => {
    setIsCelebrationMode(true);
    setTrophyLiftHeight(35);
    triggerHaptic(HAPTIC_PATTERNS.SOUNDBOARD_TROPHY);
    if (!soundMuted) {
      if (!trophyAudioRef.current) {
        trophyAudioRef.current = new Audio('/sounds/trophy_celebration.mp3');
      }
      trophyAudioRef.current.currentTime = 0;
      trophyAudioRef.current.play().catch(() => {});
    }
    // Auto-timeout celebration after 8.5 seconds
    setTimeout(() => {
      setIsCelebrationMode(false);
      setTrophyLiftHeight(0);
    }, 8500);
  };

  const handleSoundboardTrigger = (
    type: 'TROPHY' | 'ROAR' | 'FIREWORKS' | 'CHAMPAGNE' | 'DRUMS' | 'LASER'
  ) => {
    if (type === 'TROPHY') {
      triggerCelebrationMode();
    } else if (type === 'ROAR') {
      triggerHaptic(HAPTIC_PATTERNS.SOUNDBOARD_ROAR);
      if (!soundMuted) cricketAudio.playSixRoar(85000);
    } else if (type === 'FIREWORKS') {
      triggerHaptic(HAPTIC_PATTERNS.SOUNDBOARD_FIREWORKS);
      setIsCelebrationMode(true);
      if (!soundMuted) cricketAudio.playSix();
      setTimeout(() => setIsCelebrationMode(false), 4500);
    } else if (type === 'CHAMPAGNE') {
      triggerHaptic(HAPTIC_PATTERNS.SOUNDBOARD_CHAMPAGNE);
      setIsCelebrationMode(true);
      if (!soundMuted) cricketAudio.playFour();
      setTimeout(() => setIsCelebrationMode(false), 4000);
    } else if (type === 'DRUMS') {
      triggerHaptic(HAPTIC_PATTERNS.SOUNDBOARD_DRUMS);
      if (!soundMuted) cricketAudio.playBatHit();
    } else if (type === 'LASER') {
      triggerHaptic(HAPTIC_PATTERNS.SOUNDBOARD_LASER);
      setIsCelebrationMode(true);
      if (!soundMuted) cricketAudio.playUiClick();
      setTimeout(() => setIsCelebrationMode(false), 3000);
    }
  };

  // Fireworks and Golden Confetti Particle System
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize);

    interface Particle {
      x: number;
      y: number;
      vx: number;
      vy: number;
      size: number;
      color: string;
      alpha: number;
      decay: number;
      isGolden: boolean;
    }

    const particles: Particle[] = [];
    const colors = ['#F59E0B', '#FCD34D', '#38BDF8', '#06B6D4', '#FFFFFF', '#EC4899', '#10B981'];

    const spawnBurst = (x: number, y: number) => {
      const pCount = isCelebrationMode ? 80 : 25;
      for (let i = 0; i < pCount; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 6 + 1.5;
        particles.push({
          x,
          y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          size: Math.random() * 4 + 1.5,
          color: colors[Math.floor(Math.random() * colors.length)],
          alpha: 1,
          decay: Math.random() * 0.015 + 0.008,
          isGolden: Math.random() > 0.4,
        });
      }
    };

    let tick = 0;
    const render = () => {
      ctx.clearRect(0, 0, width, height);

      tick++;
      if (isCelebrationMode && tick % 24 === 0) {
        spawnBurst(width * 0.2 + Math.random() * (width * 0.6), height * 0.2 + Math.random() * (height * 0.4));
      } else if (!isCelebrationMode && tick % 90 === 0) {
        spawnBurst(width * 0.5 + (Math.random() - 0.5) * 400, height * 0.25);
      }

      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.04; // gravity
        p.alpha -= p.decay;

        if (p.alpha <= 0) {
          particles.splice(i, 1);
          continue;
        }

        ctx.save();
        ctx.globalAlpha = p.alpha;
        ctx.fillStyle = p.color;
        if (p.isGolden) {
          ctx.shadowBlur = 8;
          ctx.shadowColor = '#F59E0B';
        }
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      animId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', handleResize);
    };
  }, [isCelebrationMode]);

  return (
    <div className="relative min-h-screen text-slate-100 select-none space-y-8 pb-24 overflow-hidden">
      {/* Fullscreen Celebration Fireworks Canvas */}
      <canvas ref={canvasRef} className="fixed inset-0 pointer-events-none z-40" />

      {/* Floodlight Beam Sweeps Layer */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        {/* Left Sweeping Spotlight */}
        <div
          className={`absolute -top-32 -left-20 w-[600px] h-[900px] bg-gradient-to-br from-cyan-400/15 via-blue-600/5 to-transparent blur-3xl transform origin-top transition-transform duration-1000 ${
            isCelebrationMode ? 'rotate-12 scale-125' : 'rotate-3 scale-100'
          }`}
        />
        {/* Right Sweeping Spotlight */}
        <div
          className={`absolute -top-32 -right-20 w-[600px] h-[900px] bg-gradient-to-bl from-amber-400/20 via-orange-500/5 to-transparent blur-3xl transform origin-top transition-transform duration-1000 ${
            isCelebrationMode ? '-rotate-12 scale-125' : '-rotate-3 scale-100'
          }`}
        />
        {/* Center Ground Glow */}
        <div className="absolute bottom-0 inset-x-0 h-96 bg-gradient-to-t from-cyan-950/40 via-transparent to-transparent pointer-events-none" />
      </div>

      {/* Top Banner Navigation Pill */}
      <div className="relative z-20 flex flex-wrap items-center justify-between gap-3 border-b border-cyan-500/20 bg-slate-950/80 px-4 py-3 rounded-2xl backdrop-blur-xl shadow-2xl">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 shadow-lg shadow-amber-500/30 text-slate-950">
            <Trophy className="h-5 w-5 font-black" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold text-amber-400 uppercase tracking-widest">
                ICC T20 WORLD CUP 2024–2026
              </span>
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-ping" />
            </div>
            <h1 className="text-base sm:text-lg font-black text-white tracking-tight flex items-center gap-2">
              <span>CHAMPIONSHIP COMMAND EXPERIENCE</span>
              <span className="text-xs font-mono font-normal text-slate-400">· Undefeated 8-0 Triumph</span>
            </h1>
          </div>
        </div>

        {/* Global Action Buttons */}
        <div className="flex items-center gap-2 font-mono text-xs">
          {/* Sound Toggle */}
          <button
            onClick={() => {
              setSoundMuted((prev) => !prev);
              cricketAudio.playBatHit();
            }}
            className="flex items-center gap-1.5 rounded-xl border border-slate-800 bg-slate-900/80 px-3 py-1.5 text-slate-300 hover:text-white transition-all cursor-pointer"
            title="Toggle Celebration Sound FX"
          >
            {soundMuted ? <VolumeX className="h-3.5 w-3.5 text-rose-400" /> : <Volume2 className="h-3.5 w-3.5 text-cyan-400" />}
            <span className="hidden sm:inline">{soundMuted ? 'Muted' : 'Audio On'}</span>
          </button>

          {/* Celebration Mode Trigger Button */}
          <button
            onClick={triggerCelebrationMode}
            className={`flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 font-bold transition-all cursor-pointer shadow-lg ${
              isCelebrationMode
                ? 'bg-gradient-to-r from-amber-400 via-rose-500 to-amber-400 text-slate-950 animate-pulse shadow-amber-500/40'
                : 'border border-amber-500/50 bg-amber-500/20 text-amber-300 hover:bg-amber-500/30'
            }`}
          >
            <Sparkles className="h-3.5 w-3.5 text-amber-400" />
            <span>{isCelebrationMode ? 'CELEBRATION ACTIVE!' : 'Trigger Celebration Mode'}</span>
          </button>

          {/* Poster Share */}
          <button
            onClick={() => {
              setPosterMode(true);
              cricketAudio.playSix();
            }}
            className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 px-3.5 py-1.5 text-slate-950 font-bold hover:brightness-110 shadow-md shadow-cyan-500/20 transition-all cursor-pointer"
          >
            <Share2 className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Championship Poster</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* NAVIGATION SUB-TABS (BROADCAST COMMAND BAR)                              */}
      {/* ========================================================================= */}
      <div className="relative z-20 flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none font-mono text-xs">
        {[
          { id: 'victory_theatre', label: '🏆 Victory Theatre & 3D Trophy', icon: Trophy },
          { id: 'champions_roster', label: '🌟 Elite Champions XI Roster', icon: Users },
          { id: 'moments_timeline', label: '🔥 Championship Moments Timeline', icon: Clock },
          { id: 'ai_intelligence', label: '📊 AI Championship Intelligence', icon: BarChart3 },
          { id: 'trophy_room', label: '🏛️ Trophy Room & Medal Cabinet', icon: Award },
          { id: 'road_to_glory', label: '🚀 Road to Glory & Command Center', icon: Compass },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id as any);
                cricketAudio.playBatHit();
              }}
              className={`flex items-center gap-2 rounded-xl px-4 py-2 font-bold whitespace-nowrap transition-all cursor-pointer ${
                isActive
                  ? 'bg-gradient-to-r from-amber-400 to-amber-500 text-slate-950 shadow-lg shadow-amber-500/30 ring-1 ring-amber-300'
                  : 'bg-slate-900/80 border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-850'
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: CINEMATIC VICTORY EXPERIENCE & INTERACTIVE HERO STADIUM            */}
      {/* ========================================================================= */}
      {activeTab === 'victory_theatre' && (
        <div className="relative z-10 space-y-8 animate-in fade-in duration-300">
          {/* GRAND HERO STADIUM ARENA */}
          <div className="relative overflow-hidden rounded-3xl border-2 border-amber-500/50 bg-gradient-to-b from-[#0e1630] via-[#050b1a] to-[#02050e] p-6 sm:p-10 shadow-[0_0_60px_rgba(245,158,11,0.25)]">
            {/* Background Stadium Photo Overlay with Cinematic Blend */}
            <div className="absolute inset-0 opacity-20 pointer-events-none">
              <img
                src="/images/hero_cricket_stadium.jpg"
                alt="Championship Stadium Arena"
                className="w-full h-full object-cover mix-blend-screen scale-105"
              />
            </div>

            {/* Glowing Sunset Floodlight Ambience */}
            <div className="absolute top-0 inset-x-0 h-40 bg-gradient-to-b from-amber-500/15 via-rose-500/10 to-transparent pointer-events-none" />

            {/* TOP HOLOGRAPHIC CHIP: TOURNAMENT SUMMARY */}
            <div className="relative z-10 flex flex-wrap items-center justify-between gap-4 border-b border-amber-500/30 pb-4">
              <div className="flex items-center gap-2">
                <span className="flex h-3 w-3 rounded-full bg-emerald-400 animate-ping" />
                <span className="text-xs font-mono font-bold text-amber-300 uppercase tracking-widest">
                  OFFICIAL ICC T20 WORLD CUP GRAND FINAL · KENSINGTON OVAL, BARBADOS
                </span>
              </div>
              <div className="flex items-center gap-3 text-xs font-mono text-slate-300">
                <span>ATTENDANCE: <strong className="text-white">28,000 SELLOUT</strong></span>
                <span className="text-slate-600">·</span>
                <span>WIN MARGIN: <strong className="text-emerald-400">7 RUNS</strong></span>
              </div>
            </div>

            {/* MAIN CINEMATIC HERO GRID: ROHIT (LEFT) — 3D TROPHY (CENTER) — KOHLI (RIGHT) */}
            <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-6 items-center pt-6">
              {/* LEFT CELEBRATING PLAYER: CAPTAIN ROHIT SHARMA */}
              <div className="lg:col-span-3 flex flex-col items-center lg:items-start text-center lg:text-left space-y-3 order-2 lg:order-1">
                <div className="relative group">
                  <div className="absolute -inset-1 rounded-3xl bg-gradient-to-r from-cyan-500 to-blue-600 opacity-60 blur-lg group-hover:opacity-100 transition-all duration-500" />
                  <div className="relative h-64 w-52 sm:h-72 sm:w-60 rounded-3xl overflow-hidden border-2 border-cyan-400/60 bg-gradient-to-b from-slate-900 to-slate-950 p-2 shadow-2xl">
                    <img
                      src="/players/rohit_sharma.jpg"
                      alt="Rohit Sharma Celebrating"
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).src = '/players/rohit_captain.png';
                      }}
                      className="h-full w-full object-cover object-top rounded-2xl filter drop-shadow-[0_10px_20px_rgba(0,0,0,0.8)] transform group-hover:scale-105 transition-transform duration-500"
                    />
                    {/* Tricolor Ribbon on Card */}
                    <div className="absolute top-3 left-3 flex items-center gap-1.5 rounded-full bg-slate-950/80 border border-slate-700 px-2 py-0.5 text-[10px] font-mono text-white">
                      <CountryFlag countryCode="IND" size="xs" />
                      <span className="font-bold">ROHIT SHARMA (C)</span>
                    </div>
                    <div className="absolute bottom-3 inset-x-3 flex items-center justify-center gap-1.5 rounded-xl bg-slate-950/90 border border-cyan-500/40 py-1 font-mono text-[11px] text-cyan-300">
                      <strong>92 (41)</strong>
                      <span>vs</span>
                      <CountryFlag countryCode="AUS" size="xs" />
                      <span>· Super 8</span>
                    </div>
                  </div>
                </div>
                <div className="space-y-0.5">
                  <span className="text-[10px] font-mono uppercase text-cyan-400 font-bold block">
                    THE ARCHITECT OF AGGRESSION
                  </span>
                  <p className="text-xs text-slate-300 max-w-xs font-sans">
                    Led from the front with fearless strokeplay and unbreakable belief in his seamers.
                  </p>
                </div>
              </div>

              {/* CENTER 3D TROPHY & KINETIC TYPOGRAPHY */}
              <div className="lg:col-span-6 flex flex-col items-center justify-center text-center space-y-4 order-1 lg:order-2">
                {/* Headline: CHAMPIONS OF THE WORLD */}
                <div className="space-y-1">
                  <div className="inline-flex items-center gap-2 rounded-full border border-amber-400/40 bg-amber-400/10 px-4 py-1 text-xs font-mono font-bold text-amber-300 tracking-widest shadow-inner">
                    <Crown className="h-3.5 w-3.5 text-amber-400" />
                    <span>ICC T20 WORLD CHAMPIONS</span>
                  </div>
                  <h2 className="text-4xl sm:text-6xl md:text-7xl font-black font-sans tracking-tight text-transparent bg-clip-text bg-gradient-to-b from-white via-amber-200 to-amber-500 drop-shadow-[0_0_35px_rgba(245,158,11,0.6)]">
                    CHAMPIONS
                  </h2>
                  <h3 className="text-2xl sm:text-4xl md:text-5xl font-black font-sans tracking-wider text-white">
                    OF THE WORLD
                  </h3>
                </div>

                {/* 3D ROTATING TROPHY VISUALIZER (INTERACTIVE DRAG/LIFT) */}
                <div
                  className="relative h-64 w-64 sm:h-76 sm:w-76 flex items-center justify-center cursor-pointer group"
                  onClick={triggerCelebrationMode}
                  title="Click to Lift Trophy & Trigger Victory Light Show!"
                >
                  {/* Outer Golden Glow Aura */}
                  <div className="absolute h-60 w-60 rounded-full bg-radial from-amber-400/40 via-amber-500/15 to-transparent blur-3xl animate-pulse" />

                  {/* 3D Perspective Rotation SVG Trophy */}
                  <div
                    className="relative transition-transform duration-100 ease-out z-10"
                    style={{
                      transform: `perspective(700px) rotateY(${trophyRotation}deg) translateY(-${trophyLiftHeight}px)`,
                    }}
                  >
                    <svg
                      viewBox="0 0 240 280"
                      className="w-56 h-64 sm:w-64 sm:h-72 drop-shadow-[0_20px_40px_rgba(245,158,11,0.6)]"
                    >
                      <defs>
                        <linearGradient id="championshipGold" x1="0%" y1="0%" x2="100%" y2="100%">
                          <stop offset="0%" stopColor="#FFF9C4" />
                          <stop offset="25%" stopColor="#F59E0B" />
                          <stop offset="50%" stopColor="#D97706" />
                          <stop offset="75%" stopColor="#FCD34D" />
                          <stop offset="100%" stopColor="#78350F" />
                        </linearGradient>

                        <linearGradient id="championshipSilver" x1="0%" y1="0%" x2="100%" y2="0%">
                          <stop offset="0%" stopColor="#FFFFFF" />
                          <stop offset="45%" stopColor="#CBD5E1" />
                          <stop offset="100%" stopColor="#64748B" />
                        </linearGradient>

                        <radialGradient id="globeCenter" cx="50%" cy="50%" r="50%">
                          <stop offset="0%" stopColor="#38BDF8" />
                          <stop offset="60%" stopColor="#0284C7" />
                          <stop offset="100%" stopColor="#0C4A6E" />
                        </radialGradient>
                      </defs>

                      {/* Base Plinth */}
                      <path d="M 60 250 L 180 250 L 195 270 L 45 270 Z" fill="#1E293B" stroke="#F59E0B" strokeWidth="2.5" />
                      <rect x="75" y="240" width="90" height="12" rx="3" fill="url(#championshipGold)" />
                      <text x="120" y="264" fill="#FCD34D" fontSize="10" fontWeight="bold" fontFamily="monospace" textAnchor="middle">
                        ICC T20 WC 2024
                      </text>

                      {/* Central Column Stem */}
                      <path d="M 105 180 L 135 180 L 128 240 L 112 240 Z" fill="url(#championshipGold)" />

                      {/* Three Iconic Stumps / Pillars */}
                      <path d="M 85 110 L 95 110 L 105 190 L 95 190 Z" fill="url(#championshipSilver)" />
                      <path d="M 115 105 L 125 105 L 125 190 L 115 190 Z" fill="url(#championshipGold)" />
                      <path d="M 145 110 L 155 110 L 145 190 L 135 190 Z" fill="url(#championshipSilver)" />

                      {/* World Cricket Globe Sphere at Apex */}
                      <circle cx="120" cy="85" r="44" fill="url(#globeCenter)" stroke="#F59E0B" strokeWidth="2.5" />
                      {/* Seam Lattice on Globe */}
                      <ellipse cx="120" cy="85" rx="34" ry="44" fill="none" stroke="#FCD34D" strokeWidth="1.5" strokeDasharray="3 3" />
                      <ellipse cx="120" cy="85" rx="44" ry="18" fill="none" stroke="#FCD34D" strokeWidth="1.5" strokeDasharray="3 3" />
                      <line x1="76" y1="85" x2="164" y2="85" stroke="#FFF" strokeWidth="2" />

                      {/* Dual Sweeping Flying Handles */}
                      <path d="M 76 85 C 30 75 35 150 95 175" fill="none" stroke="url(#championshipGold)" strokeWidth="6" strokeLinecap="round" />
                      <path d="M 164 85 C 210 75 205 150 145 175" fill="none" stroke="url(#championshipGold)" strokeWidth="6" strokeLinecap="round" />
                    </svg>
                  </div>

                  {/* Lift Trophy Interactive Prompt */}
                  <div className="absolute -bottom-2 z-20 flex items-center gap-1.5 rounded-full bg-amber-500/20 border border-amber-400/50 px-3 py-1 text-[11px] font-mono text-amber-300 backdrop-blur-md shadow-lg group-hover:bg-amber-500 group-hover:text-slate-950 transition-all">
                    <Sparkles className="h-3.5 w-3.5" />
                    <span className="font-bold">TAP TROPHY TO CELEBRATE</span>
                  </div>
                </div>

                {/* DYNAMIC VICTORY SCOREBOARD POD */}
                <div className="w-full max-w-lg rounded-2xl border border-amber-500/40 bg-slate-950/90 p-4 backdrop-blur-md shadow-2xl space-y-2.5">
                  <div className="flex items-center justify-between text-xs font-mono border-b border-slate-800 pb-2">
                    <span className="text-amber-400 font-bold uppercase tracking-wider">OFFICIAL FINAL MATCH RESULT</span>
                    <span className="text-slate-400">29 JUNE 2024</span>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-left">
                    {/* India Innings */}
                    <div className="rounded-xl bg-slate-900/80 p-2.5 border border-cyan-500/30">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-white text-sm flex items-center gap-1.5">
                          <CountryFlag countryCode="IND" size="sm" />
                          <span>INDIA</span>
                        </span>
                        <span className="text-[10px] font-mono text-cyan-400 font-bold">1st Innings</span>
                      </div>
                      <div className="text-2xl font-black text-white font-mono mt-1">
                        176/7 <span className="text-xs font-normal text-slate-400">(20.0 ov)</span>
                      </div>
                      <span className="text-[10px] font-mono text-slate-400 block mt-0.5">
                        Kohli 76 (59) · Axar 47 (31)
                      </span>
                    </div>

                    {/* South Africa Innings */}
                    <div className="rounded-xl bg-slate-900/80 p-2.5 border border-slate-800">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-300 text-sm flex items-center gap-1.5">
                          <CountryFlag countryCode="SA" size="sm" />
                          <span>SOUTH AFRICA</span>
                        </span>
                        <span className="text-[10px] font-mono text-slate-400">Target 177</span>
                      </div>
                      <div className="text-2xl font-black text-slate-200 font-mono mt-1">
                        169/8 <span className="text-xs font-normal text-slate-400">(20.0 ov)</span>
                      </div>
                      <span className="text-[10px] font-mono text-slate-400 block mt-0.5">
                        Klaasen 52 (27) · Hardik 3/20
                      </span>
                    </div>
                  </div>

                  {/* Victory Margin Banner */}
                  <div className="rounded-xl bg-gradient-to-r from-emerald-500/20 via-cyan-500/20 to-emerald-500/20 border border-emerald-500/40 p-2 text-center text-xs font-mono font-bold text-emerald-300">
                    INDIA WON BY 7 RUNS · FIRST UNDEFEATED CHAMPIONS IN T20 WORLD CUP HISTORY
                  </div>
                </div>
              </div>

              {/* RIGHT CELEBRATING PLAYER: VIRAT KOHLI (FINAL POTM) */}
              <div className="lg:col-span-3 flex flex-col items-center lg:items-end text-center lg:text-right space-y-3 order-3">
                <div className="relative group">
                  <div className="absolute -inset-1 rounded-3xl bg-gradient-to-r from-amber-500 to-orange-600 opacity-60 blur-lg group-hover:opacity-100 transition-all duration-500" />
                  <div className="relative h-64 w-52 sm:h-72 sm:w-60 rounded-3xl overflow-hidden border-2 border-amber-400/60 bg-gradient-to-b from-slate-900 to-slate-950 p-2 shadow-2xl">
                    <img
                      src="/players/virat_kohli.jpg"
                      alt="Virat Kohli Final Player of the Match"
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).src = '/players/vkohli.svg';
                      }}
                      className="h-full w-full object-cover object-top rounded-2xl filter drop-shadow-[0_10px_20px_rgba(0,0,0,0.8)] transform group-hover:scale-105 transition-transform duration-500"
                    />
                    {/* Tricolor Ribbon on Card */}
                    <div className="absolute top-3 right-3 flex items-center gap-1.5 rounded-full bg-slate-950/80 border border-slate-700 px-2 py-0.5 text-[10px] font-mono text-white">
                      <span className="font-bold">VIRAT KOHLI (POTM)</span>
                      <CountryFlag countryCode="IND" size="xs" />
                    </div>
                    <div className="absolute bottom-3 inset-x-3 text-center rounded-xl bg-slate-950/90 border border-amber-500/40 py-1 font-mono text-[11px] text-amber-300">
                      <strong>76 (59)</strong> in Final · Match Rescue
                    </div>
                  </div>
                </div>
                <div className="space-y-0.5">
                  <span className="text-[10px] font-mono uppercase text-amber-400 font-bold block">
                    THE BIG-MATCH HERO
                  </span>
                  <p className="text-xs text-slate-300 max-w-xs font-sans">
                    Anchored the innings when disaster struck at 34/3, bowing out of T20Is with the ultimate silverware.
                  </p>
                </div>
              </div>
            </div>

            {/* ========================================================================= */}
            {/* VICTORY SOUNDBOARD & STADIUM ATMOSPHERICS CONSOLE                          */}
            {/* ========================================================================= */}
            <div className="rounded-3xl border border-amber-500/35 bg-gradient-to-r from-[#03091e]/98 via-[#04102e]/95 to-[#020718]/98 p-5 sm:p-7 shadow-[0_20px_50px_rgba(0,0,0,0.85),0_0_35px_rgba(245,158,11,0.2)] space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-amber-500/25 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="h-8 w-8 rounded-xl bg-amber-500/20 border border-amber-400/50 flex items-center justify-center text-amber-300 shadow-[0_0_15px_rgba(245,158,11,0.3)]">
                    <Volume2 className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="text-base sm:text-lg font-black text-white tracking-tight">
                      VICTORY SOUNDBOARD & STADIUM ATMOSPHERICS
                    </h3>
                    <p className="text-xs text-slate-400 font-sans">
                      Trigger high-fidelity crowd roars, pyro blasts, trophy fanfare, and rhythmic beats with tactile mobile vibration.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-[10px] font-mono text-amber-300 bg-amber-950/60 border border-amber-500/40 px-3 py-1 rounded-full self-start sm:self-auto">
                  <Sparkles className="h-3 w-3 animate-spin" />
                  <span>TACTILE HAPTIC FEEDBACK ACTIVE</span>
                </div>
              </div>

              {/* Soundboard Grid (6 High-Fidelity Launchpad Cards) */}
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                {/* 1. Lift Trophy & World Cup Clinch */}
                <button
                  onClick={() => handleSoundboardTrigger('TROPHY')}
                  className="group relative rounded-2xl border border-amber-400/60 bg-gradient-to-b from-amber-950/50 via-slate-900 to-slate-950 p-3.5 text-center transition-all duration-200 hover:scale-102 hover:border-amber-300 hover:shadow-[0_0_25px_rgba(245,158,11,0.4)] cursor-pointer active:scale-95 flex flex-col items-center justify-between min-h-[120px]"
                >
                  <div className="h-10 w-10 rounded-xl bg-amber-400/20 border border-amber-400/60 flex items-center justify-center text-amber-300 mb-2 group-hover:scale-110 transition-transform">
                    <Trophy className="h-5 w-5" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-white block leading-tight">
                      Lift Trophy
                    </span>
                    <span className="text-[10px] font-mono text-amber-400 block mt-0.5">
                      Official Audio
                    </span>
                  </div>
                  <span className="text-[9px] font-mono text-slate-500 uppercase mt-1">Tap Pad</span>
                </button>

                {/* 2. Stadium Crowd Roars */}
                <button
                  onClick={() => handleSoundboardTrigger('ROAR')}
                  className="group relative rounded-2xl border border-cyan-500/40 bg-gradient-to-b from-cyan-950/40 via-slate-900 to-slate-950 p-3.5 text-center transition-all duration-200 hover:scale-102 hover:border-cyan-300 hover:shadow-[0_0_25px_rgba(6,182,212,0.4)] cursor-pointer active:scale-95 flex flex-col items-center justify-between min-h-[120px]"
                >
                  <div className="h-10 w-10 rounded-xl bg-cyan-500/20 border border-cyan-400/60 flex items-center justify-center text-cyan-300 mb-2 group-hover:scale-110 transition-transform">
                    <Radio className="h-5 w-5" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-white block leading-tight">
                      Crowd Roar
                    </span>
                    <span className="text-[10px] font-mono text-cyan-300 block mt-0.5">
                      45,000 Fans
                    </span>
                  </div>
                  <span className="text-[9px] font-mono text-slate-500 uppercase mt-1">Tap Pad</span>
                </button>

                {/* 3. Grand Fireworks */}
                <button
                  onClick={() => handleSoundboardTrigger('FIREWORKS')}
                  className="group relative rounded-2xl border border-purple-500/40 bg-gradient-to-b from-purple-950/40 via-slate-900 to-slate-950 p-3.5 text-center transition-all duration-200 hover:scale-102 hover:border-purple-300 hover:shadow-[0_0_25px_rgba(168,85,247,0.4)] cursor-pointer active:scale-95 flex flex-col items-center justify-between min-h-[120px]"
                >
                  <div className="h-10 w-10 rounded-xl bg-purple-500/20 border border-purple-400/60 flex items-center justify-center text-purple-300 mb-2 group-hover:scale-110 transition-transform">
                    <Sparkles className="h-5 w-5" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-white block leading-tight">
                      Fireworks
                    </span>
                    <span className="text-[10px] font-mono text-purple-300 block mt-0.5">
                      Sky Rockets
                    </span>
                  </div>
                  <span className="text-[9px] font-mono text-slate-500 uppercase mt-1">Tap Pad</span>
                </button>

                {/* 4. Champagne Spray */}
                <button
                  onClick={() => handleSoundboardTrigger('CHAMPAGNE')}
                  className="group relative rounded-2xl border border-emerald-500/40 bg-gradient-to-b from-emerald-950/40 via-slate-900 to-slate-950 p-3.5 text-center transition-all duration-200 hover:scale-102 hover:border-emerald-300 hover:shadow-[0_0_25px_rgba(52,211,153,0.4)] cursor-pointer active:scale-95 flex flex-col items-center justify-between min-h-[120px]"
                >
                  <div className="h-10 w-10 rounded-xl bg-emerald-500/20 border border-emerald-400/60 flex items-center justify-center text-emerald-300 mb-2 group-hover:scale-110 transition-transform">
                    <Award className="h-5 w-5" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-white block leading-tight">
                      Champagne
                    </span>
                    <span className="text-[10px] font-mono text-emerald-300 block mt-0.5">
                      Podium Spray
                    </span>
                  </div>
                  <span className="text-[9px] font-mono text-slate-500 uppercase mt-1">Tap Pad</span>
                </button>

                {/* 5. Victory Dhol & Drums */}
                <button
                  onClick={() => handleSoundboardTrigger('DRUMS')}
                  className="group relative rounded-2xl border border-rose-500/40 bg-gradient-to-b from-rose-950/40 via-slate-900 to-slate-950 p-3.5 text-center transition-all duration-200 hover:scale-102 hover:border-rose-300 hover:shadow-[0_0_25px_rgba(244,63,94,0.4)] cursor-pointer active:scale-95 flex flex-col items-center justify-between min-h-[120px]"
                >
                  <div className="h-10 w-10 rounded-xl bg-rose-500/20 border border-rose-400/60 flex items-center justify-center text-rose-300 mb-2 group-hover:scale-110 transition-transform">
                    <Flame className="h-5 w-5" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-white block leading-tight">
                      Stadium Dhol
                    </span>
                    <span className="text-[10px] font-mono text-rose-300 block mt-0.5">
                      Victory Beats
                    </span>
                  </div>
                  <span className="text-[9px] font-mono text-slate-500 uppercase mt-1">Tap Pad</span>
                </button>

                {/* 6. Smart Floodlights & Pyro */}
                <button
                  onClick={() => handleSoundboardTrigger('LASER')}
                  className="group relative rounded-2xl border border-sky-500/40 bg-gradient-to-b from-sky-950/40 via-slate-900 to-slate-950 p-3.5 text-center transition-all duration-200 hover:scale-102 hover:border-sky-300 hover:shadow-[0_0_25px_rgba(56,189,248,0.4)] cursor-pointer active:scale-95 flex flex-col items-center justify-between min-h-[120px]"
                >
                  <div className="h-10 w-10 rounded-xl bg-sky-500/20 border border-sky-400/60 flex items-center justify-center text-sky-300 mb-2 group-hover:scale-110 transition-transform">
                    <Zap className="h-5 w-5" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-white block leading-tight">
                      Laser & Pyro
                    </span>
                    <span className="text-[10px] font-mono text-sky-300 block mt-0.5">
                      Floodlights
                    </span>
                  </div>
                  <span className="text-[9px] font-mono text-slate-500 uppercase mt-1">Tap Pad</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: UNIQUE CHAMPIONS ROSTER (ELITE PLAYING XI COLLECTION)              */}
      {/* ========================================================================= */}
      {activeTab === 'champions_roster' && (
        <div className="relative z-10 space-y-6 animate-in fade-in duration-300">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-cyan-500/20 pb-3">
            <div>
              <span className="text-xs font-mono font-bold text-cyan-400 uppercase tracking-widest block">
                ELITE CHAMPIONS XI COLLECTION
              </span>
              <h3 className="text-xl font-black text-white font-sans">
                The Undefeated World Cup Champions
              </h3>
            </div>
            <span className="text-xs font-mono text-slate-400">
              Click any champion to inspect detailed DNA analytics & profile
            </span>
          </div>

          {/* Roster Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {CHAMPION_SQUAD.map((player) => {
              const isSelected = selectedPlayer.id === player.id;
              return (
                <div
                  key={player.id}
                  onClick={() => {
                    setSelectedPlayer(player);
                    cricketAudio.playBatHit();
                  }}
                  className={`group relative rounded-2xl border p-4 transition-all duration-300 cursor-pointer overflow-hidden flex flex-col justify-between ${
                    isSelected
                      ? 'border-amber-400 bg-gradient-to-b from-[#131d3b] via-[#091124] to-[#040813] shadow-[0_0_30px_rgba(245,158,11,0.3)] ring-1 ring-amber-400'
                      : 'border-slate-800 bg-slate-950/80 hover:border-cyan-500/50 hover:bg-slate-900/90'
                  }`}
                >
                  {/* Top Badges & Jersey */}
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs">🇮🇳</span>
                      <span className="text-xs font-mono font-bold text-slate-400">#{player.jersey}</span>
                    </div>

                    {player.badge && (
                      <span
                        className={`text-[9px] font-mono font-black uppercase px-2 py-0.5 rounded-full border shadow-sm ${
                          player.badge === 'MVP'
                            ? 'bg-amber-500/20 text-amber-300 border-amber-500/50'
                            : player.badge === 'POTM_FINAL'
                            ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50'
                            : player.badge === 'LEADER'
                            ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50'
                            : 'bg-rose-500/20 text-rose-300 border-rose-500/50'
                        }`}
                      >
                        {player.badgeTitle || player.badge}
                      </span>
                    )}
                  </div>

                  {/* Player Image with Glow Spotlight */}
                  <div className="relative my-2 h-40 w-full flex items-center justify-center overflow-hidden rounded-xl bg-slate-900/60 border border-slate-800/80">
                    <div className="absolute inset-0 bg-radial from-amber-500/10 via-transparent to-transparent group-hover:scale-125 transition-transform duration-500" />
                    <img
                      src={player.photoUrl}
                      alt={player.name}
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).src = `/players/${player.id}.svg`;
                      }}
                      className="h-36 object-contain filter drop-shadow-[0_8px_16px_rgba(0,0,0,0.7)] group-hover:scale-110 transition-transform duration-300"
                    />

                    {/* Circular Performance Rating Gauge */}
                    <div className="absolute bottom-2 right-2 flex items-center gap-1 bg-slate-950/90 border border-amber-400/50 px-2 py-0.5 rounded-lg text-xs font-mono">
                      <Flame className="h-3 w-3 text-amber-400" />
                      <strong className="text-white font-bold">{player.rating}</strong>
                    </div>
                  </div>

                  {/* Name and Role */}
                  <div className="space-y-1">
                    <h4 className="text-sm font-black text-white group-hover:text-amber-300 transition-colors truncate">
                      {player.name}
                    </h4>
                    <p className="text-[11px] font-mono text-slate-400 truncate">{player.role}</p>
                  </div>

                  {/* Tournament Highlight Stat */}
                  <div className="mt-3 pt-2.5 border-t border-slate-800/80 space-y-1 text-xs font-mono">
                    <div className="flex justify-between text-[11px]">
                      <span className="text-slate-400">Tournament:</span>
                      <strong className="text-cyan-300">
                        {player.runs > 0 ? `${player.runs}r (SR ${player.strikeRate})` : `${player.wickets}w (Econ ${player.economy})`}
                      </strong>
                    </div>
                    <p className="text-[10px] text-amber-400/90 truncate font-mono">
                      {player.highlightStat}
                    </p>
                  </div>

                  {/* Open Profile CTA */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      // Find player object in TEAMS[0].squad
                      const fullP = TEAMS[0].squad.find((p) => p.id === player.id) || TEAMS[0].squad[0];
                      setActiveModalPlayer(fullP);
                      cricketAudio.playBatHit();
                    }}
                    className="mt-3 w-full rounded-xl border border-slate-700 bg-slate-900/90 py-1.5 text-center text-[10px] font-mono font-bold text-slate-300 hover:border-cyan-400 hover:text-white hover:bg-cyan-950/40 transition-all cursor-pointer"
                  >
                    View Complete Analytics →
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: CHAMPIONSHIP MOMENTS TIMELINE                                      */}
      {/* ========================================================================= */}
      {activeTab === 'moments_timeline' && (
        <div className="relative z-10 space-y-6 animate-in fade-in duration-300">
          <div className="flex items-center justify-between border-b border-cyan-500/20 pb-3">
            <div>
              <span className="text-xs font-mono font-bold text-cyan-400 uppercase tracking-widest block">
                DECISIVE MATCH TIMELINE
              </span>
              <h3 className="text-xl font-black text-white font-sans">
                The 7 Immortal Championship Moments
              </h3>
            </div>
            <span className="text-xs font-mono text-slate-400">Click a moment to inspect ball telemetry</span>
          </div>

          {/* Horizontal Timeline Scroll Bar */}
          <div className="flex items-center gap-3 overflow-x-auto pb-4 scrollbar-none font-mono">
            {CHAMPIONSHIP_MOMENTS.map((moment, idx) => {
              const isSelected = selectedMoment.id === moment.id;
              return (
                <button
                  key={moment.id}
                  onClick={() => {
                    setSelectedMoment(moment);
                    cricketAudio.playBatHit();
                  }}
                  className={`min-w-[240px] rounded-2xl border p-4 text-left transition-all duration-200 cursor-pointer relative overflow-hidden flex flex-col justify-between shrink-0 ${
                    isSelected
                      ? 'border-amber-400 bg-gradient-to-b from-[#19223e] to-[#090f1e] shadow-xl shadow-amber-500/20 ring-1 ring-amber-400'
                      : 'border-slate-800 bg-slate-950/80 hover:border-slate-700 hover:bg-slate-900/70'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="rounded-md bg-slate-900 px-2 py-0.5 text-[10px] font-bold text-amber-400 border border-slate-700">
                      {moment.over}
                    </span>
                    <span className="text-[10px] text-slate-400">#{idx + 1}</span>
                  </div>

                  <h4 className={`text-xs font-black line-clamp-2 ${isSelected ? 'text-white' : 'text-slate-300'}`}>
                    {moment.title}
                  </h4>

                  <div className="mt-3 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px]">
                    <span className="text-slate-400">{moment.scoreState}</span>
                    <span className="text-emerald-400 font-bold">{moment.winProbIndia}% Win</span>
                  </div>
                </button>
              );
            })}
          </div>

          {/* ACTIVE MOMENT DETAILED INSPECTOR PANEL */}
          <div className="rounded-3xl border border-cyan-500/30 bg-gradient-to-b from-slate-950 via-[#03091e] to-slate-950 p-6 sm:p-8 shadow-2xl backdrop-blur-xl grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
            <div className="lg:col-span-8 space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-xl bg-amber-500 px-3 py-1 text-xs font-mono font-black text-slate-950">
                  {selectedMoment.over}
                </span>
                <span className="rounded-xl border border-cyan-500/40 bg-cyan-950/40 px-3 py-1 text-xs font-mono font-bold text-cyan-300">
                  {selectedMoment.scoreState}
                </span>
                <span className="text-xs font-mono text-slate-400">
                  Hero: <strong className="text-white">{selectedMoment.heroPlayer}</strong>
                </span>
              </div>

              <h3 className="text-2xl sm:text-3xl font-black text-white font-sans tracking-tight">
                {selectedMoment.title}
              </h3>
              <p className="text-sm text-cyan-300 font-mono font-bold">
                {selectedMoment.subtitle}
              </p>

              <p className="text-sm text-slate-300 font-sans leading-relaxed">
                {selectedMoment.description}
              </p>

              {/* Broadcast Commentary Quote */}
              <div className="rounded-2xl border-l-4 border-amber-400 bg-slate-900/70 p-4 italic text-sm text-amber-200 font-serif">
                {selectedMoment.highlightQuote}
              </div>
            </div>

            {/* Right Win Probability Meter */}
            <div className="lg:col-span-4 rounded-2xl border border-slate-800 bg-slate-900/60 p-5 space-y-3 text-center">
              <span className="text-[10px] font-mono uppercase text-slate-400 block font-bold">
                AI WIN PROBABILITY AT THIS MOMENT
              </span>
              <div className="flex items-baseline justify-center gap-1 font-mono">
                <span className="text-5xl font-black text-white">{selectedMoment.winProbIndia}%</span>
                <span className="text-sm font-bold text-emerald-400">INDIA</span>
              </div>

              <div className="h-3 w-full rounded-full bg-slate-800 overflow-hidden flex shadow-inner">
                <div
                  className="h-full bg-gradient-to-r from-emerald-500 to-cyan-500 transition-all duration-700"
                  style={{ width: `${selectedMoment.winProbIndia}%` }}
                />
                <div
                  className="h-full bg-slate-700 transition-all duration-700"
                  style={{ width: `${100 - selectedMoment.winProbIndia}%` }}
                />
              </div>

              <p className="text-[11px] text-slate-400 font-mono pt-1">
                South Africa Probability: {100 - selectedMoment.winProbIndia}%
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: AI CHAMPIONSHIP INTELLIGENCE (RADAR, WIN PROB, MOMENTUM)           */}
      {/* ========================================================================= */}
      {activeTab === 'ai_intelligence' && (
        <div className="relative z-10 space-y-8 animate-in fade-in duration-300">
          <div className="border-b border-cyan-500/20 pb-3">
            <span className="text-xs font-mono font-bold text-cyan-400 uppercase tracking-widest block">
              TOURNAMENT ANALYTICS & STATISTICAL MASTERY
            </span>
            <h3 className="text-xl font-black text-white font-sans">
              AI Championship Intelligence Suite
            </h3>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* RADAR CHART: TEAM INDIA TOURNAMENT ATTRIBUTES */}
            <div className="lg:col-span-6 rounded-3xl border border-cyan-500/25 bg-slate-950/80 p-6 space-y-4 shadow-xl backdrop-blur-md">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2 text-xs font-mono">
                <span className="font-bold text-white flex items-center gap-1.5">
                  <Activity className="h-4 w-4 text-cyan-400" />
                  <span>TEAM ATTRIBUTES RADAR (OVERALL 96/100)</span>
                </span>
                <span className="text-emerald-400 font-bold">100% UNBEATEN</span>
              </div>

              <div className="h-72 w-full flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart cx="50%" cy="50%" outerRadius="75%" data={RADAR_DATA}>
                    <PolarGrid stroke="#334155" />
                    <PolarAngleAxis dataKey="subject" tick={{ fill: '#94A3B8', fontSize: 11, fontFamily: 'monospace' }} />
                    <PolarRadiusAxis angle={30} domain={[0, 100]} stroke="#475569" />
                    <Radar name="India 2024" dataKey="A" stroke="#38BDF8" fill="#38BDF8" fillOpacity={0.45} />
                  </RadarChart>
                </ResponsiveContainer>
              </div>

              <div className="grid grid-cols-3 gap-2 text-center text-xs font-mono pt-2 border-t border-slate-800">
                <div className="rounded-lg bg-slate-900/60 p-2 border border-slate-800">
                  <span className="text-[10px] text-slate-500 block">DEATH ECON</span>
                  <strong className="text-emerald-400">6.42 RPO</strong>
                </div>
                <div className="rounded-lg bg-slate-900/60 p-2 border border-slate-800">
                  <span className="text-[10px] text-slate-500 block">DOT BALL %</span>
                  <strong className="text-cyan-400">46.8%</strong>
                </div>
                <div className="rounded-lg bg-slate-900/60 p-2 border border-slate-800">
                  <span className="text-[10px] text-slate-500 block">BOUNDARIES/INN</span>
                  <strong className="text-amber-400">18.4</strong>
                </div>
              </div>
            </div>

            {/* WIN PROBABILITY DRAMA GRAPH (THE 30-OFF-30 TURNAROUND) */}
            <div className="lg:col-span-6 rounded-3xl border border-cyan-500/25 bg-slate-950/80 p-6 space-y-4 shadow-xl backdrop-blur-md">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2 text-xs font-mono">
                <span className="font-bold text-white flex items-center gap-1.5">
                  <TrendingUp className="h-4 w-4 text-amber-400" />
                  <span>FINAL WIN PROBABILITY PROGRESSION (%)</span>
                </span>
                <span className="text-rose-400 font-bold">4% Low Point at 15.0 ov</span>
              </div>

              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={WIN_PROB_PROGRESSION} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="probColor" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="5%" stopColor="#38BDF8" stopOpacity={0.6} />
                        <stop offset="95%" stopColor="#38BDF8" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="over" tick={{ fill: '#64748B', fontSize: 10, fontFamily: 'monospace' }} />
                    <YAxis domain={[0, 100]} tick={{ fill: '#64748B', fontSize: 10, fontFamily: 'monospace' }} />
                    <RechartsTooltip
                      contentStyle={{ backgroundColor: '#020617', borderColor: '#38BDF8', borderRadius: 12, fontSize: 12 }}
                      itemStyle={{ color: '#38BDF8' }}
                    />
                    <Area type="monotone" dataKey="prob" stroke="#38BDF8" strokeWidth={3} fillOpacity={1} fill="url(#probColor)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              <p className="text-xs text-slate-300 font-sans leading-relaxed text-center">
                South Africa required 30 off 30 balls with 6 wickets in hand. Bumrah, Arshdeep, and Hardik combined to concede only 22 runs in the last 5 overs.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 5: INTERACTIVE TROPHY ROOM & MEDAL CABINET                            */}
      {/* ========================================================================= */}
      {activeTab === 'trophy_room' && (
        <div className="relative z-10 space-y-8 animate-in fade-in duration-300">
          <div className="border-b border-cyan-500/20 pb-3">
            <span className="text-xs font-mono font-bold text-amber-400 uppercase tracking-widest block">
              CHAMPIONSHIP MEDALS & SILVERWARE ARCHIVE
            </span>
            <h3 className="text-xl font-black text-white font-sans">
              Interactive 3D Trophy Room & Medal Cabinet
            </h3>
          </div>

          {/* Trophy Cabinet Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Gold Trophy: 2024 ICC T20 World Cup */}
            <div className="rounded-3xl border-2 border-amber-400/80 bg-gradient-to-b from-amber-500/10 via-slate-950 to-slate-950 p-6 text-center space-y-4 shadow-2xl relative overflow-hidden">
              <div className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/20 border border-amber-400 px-3 py-1 text-xs font-mono font-bold text-amber-300">
                <Trophy className="h-3.5 w-3.5" />
                <span>GOLD · WORLD CHAMPIONS</span>
              </div>

              <div className="h-44 w-full flex items-center justify-center">
                <Trophy className="h-32 w-32 text-amber-400 drop-shadow-[0_0_24px_rgba(245,158,11,0.6)] animate-bounce" />
              </div>

              <h4 className="text-lg font-black text-white">ICC Men's T20 World Cup 2024</h4>
              <p className="text-xs text-slate-300 font-mono">
                Barbados · Defeated South Africa by 7 runs · Undefeated 8-0 record
              </p>
            </div>

            {/* Individual Medal: Player of the Tournament (Bumrah) */}
            <div className="rounded-3xl border border-cyan-500/40 bg-gradient-to-b from-cyan-500/10 via-slate-950 to-slate-950 p-6 text-center space-y-4 shadow-xl">
              <div className="inline-flex items-center gap-1.5 rounded-full bg-cyan-500/20 border border-cyan-400 px-3 py-1 text-xs font-mono font-bold text-cyan-300">
                <Award className="h-3.5 w-3.5" />
                <span>INDIVIDUAL GOLD</span>
              </div>

              <div className="h-44 w-full flex items-center justify-center">
                <Award className="h-32 w-32 text-cyan-400 drop-shadow-[0_0_24px_rgba(6,182,212,0.6)]" />
              </div>

              <h4 className="text-lg font-black text-white">ICC Player of the Tournament</h4>
              <p className="text-xs text-slate-300 font-mono">
                Jasprit Bumrah · 15 Wickets · Econ 4.17 · Lowest tournament economy in history
              </p>
            </div>

            {/* Individual Medal: Final Player of the Match (Kohli) */}
            <div className="rounded-3xl border border-purple-500/40 bg-gradient-to-b from-purple-500/10 via-slate-950 to-slate-950 p-6 text-center space-y-4 shadow-xl">
              <div className="inline-flex items-center gap-1.5 rounded-full bg-purple-500/20 border border-purple-400 px-3 py-1 text-xs font-mono font-bold text-purple-300">
                <Star className="h-3.5 w-3.5" />
                <span>FINAL PODIUM MEDAL</span>
              </div>

              <div className="h-44 w-full flex items-center justify-center">
                <Star className="h-32 w-32 text-purple-400 drop-shadow-[0_0_24px_rgba(168,85,247,0.6)]" />
              </div>

              <h4 className="text-lg font-black text-white">Player of the Match (Final)</h4>
              <p className="text-xs text-slate-300 font-mono">
                Virat Kohli · 76 (59) · Match-defining anchor innings under pressure
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 6: ROAD TO GLORY & COMMAND CENTER                                     */}
      {/* ========================================================================= */}
      {activeTab === 'road_to_glory' && (
        <div className="relative z-10 space-y-8 animate-in fade-in duration-300">
          <div className="border-b border-cyan-500/20 pb-3">
            <span className="text-xs font-mono font-bold text-cyan-400 uppercase tracking-widest block">
              THE 8-0 UNBEATEN CAMPAIGN
            </span>
            <h3 className="text-xl font-black text-white font-sans">
              Road to Glory & Captain's Command Center
            </h3>
          </div>

          {/* Road to Glory Match Table */}
          <div className="rounded-3xl border border-slate-800 bg-slate-950/80 p-5 backdrop-blur-md overflow-x-auto shadow-xl">
            <table className="w-full text-left text-xs font-mono">
              <thead>
                <tr className="border-b border-slate-800 text-slate-500 text-[10px]">
                  <th className="py-2.5 px-3">STAGE</th>
                  <th className="py-2.5 px-3">OPPONENT</th>
                  <th className="py-2.5 px-3">VENUE</th>
                  <th className="py-2.5 px-3">RESULT</th>
                  <th className="py-2.5 px-3">DECISIVE MARGIN</th>
                  <th className="py-2.5 px-3">POTM</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {ROAD_TO_GLORY_MATCHES.map((row, idx) => (
                  <tr key={idx} className={idx === 7 ? 'bg-amber-500/10 font-bold' : ''}>
                    <td className="py-3 px-3 text-cyan-400">{row.stage}</td>
                    <td className="py-3 px-3 text-white font-bold">{row.opponent}</td>
                    <td className="py-3 px-3 text-slate-400">{row.venue}</td>
                    <td className="py-3 px-3 text-emerald-400 font-black">{row.result}</td>
                    <td className="py-3 px-3 text-slate-300">{row.margin}</td>
                    <td className="py-3 px-3 text-amber-300 font-bold">{row.potm}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Captain's Command Center Quick Highlights */}
          <div className="rounded-3xl border border-amber-500/30 bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 p-6 space-y-4">
            <div className="flex items-center gap-2 text-xs font-mono font-bold text-amber-400">
              <Compass className="h-4 w-4" />
              <span>CAPTAIN’S COMMAND CENTER: ROHIT SHARMA</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs font-mono">
              <div className="rounded-xl border border-slate-800 bg-slate-950/80 p-4 space-y-1">
                <span className="text-slate-500 block text-[10px]">TACTICAL BOWLING CHANGES</span>
                <strong className="text-white text-sm">Hardik Over 17 & Bumrah Over 18</strong>
                <p className="text-slate-400 text-[11px] font-sans">
                  Switched pacers immediately after Klaasen’s onslaught, restricting boundaries and forcing the false stroke.
                </p>
              </div>

              <div className="rounded-xl border border-slate-800 bg-slate-950/80 p-4 space-y-1">
                <span className="text-slate-500 block text-[10px]">PINCH-HITTER PROMOTION</span>
                <strong className="text-white text-sm">Axar Patel at No. 5 (47 runs)</strong>
                <p className="text-slate-400 text-[11px] font-sans">
                  Neutralized left-arm spin threats and lifted India from 34/3 to match-winning 176.
                </p>
              </div>

              <div className="rounded-xl border border-slate-800 bg-slate-950/80 p-4 space-y-1">
                <span className="text-slate-500 block text-[10px]">WORLD CUP TOURNAMENT WIN RATE</span>
                <strong className="text-emerald-400 text-sm">100% (8 Matches, 8 Wins)</strong>
                <p className="text-slate-400 text-[11px] font-sans">
                  The only captain in modern T20 World Cup history to win every single match in a single campaign.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SCREENSHOT-READY CHAMPIONSHIP POSTER MODAL                                */}
      {/* ========================================================================= */}
      {posterMode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-in fade-in duration-200">
          <div className="relative w-full max-w-xl rounded-3xl border-2 border-amber-400 bg-gradient-to-b from-[#151c38] via-[#091124] to-[#030612] p-8 text-center space-y-6 shadow-2xl overflow-hidden">
            <button
              onClick={() => setPosterMode(false)}
              className="absolute top-4 right-4 rounded-full bg-slate-900 border border-slate-700 p-2 text-slate-400 hover:text-white transition-colors cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="space-y-1">
              <span className="text-xs font-mono font-bold text-amber-400 tracking-widest uppercase">
                OFFICIAL COMMEMORATIVE CHAMPIONSHIP POSTER
              </span>
              <h2 className="text-4xl font-black text-white font-sans">
                INDIA · WORLD CHAMPIONS
              </h2>
              <p className="text-xs text-cyan-300 font-mono">
                ICC Men's T20 World Cup · June 2024 · Kensington Oval, Barbados
              </p>
            </div>

            <div className="relative mx-auto h-48 w-48 flex items-center justify-center">
              <Trophy className="h-36 w-36 text-amber-400 drop-shadow-[0_0_30px_rgba(245,158,11,0.8)]" />
            </div>

            <div className="rounded-2xl border border-amber-500/40 bg-slate-950/80 p-4 font-mono text-xs text-slate-200 space-y-1">
              <p className="font-bold text-white text-sm">FINAL SCORE: INDIA 176/7 · SOUTH AFRICA 169/8</p>
              <p className="text-amber-400">WON BY 7 RUNS · UNDEFEATED 8-0 CAMPAIGN</p>
              <p className="text-[11px] text-slate-400">Player of the Match: Virat Kohli (76) · MVP: Jasprit Bumrah (15 Wkts, Econ 4.17)</p>
            </div>

            <p className="text-[11px] font-mono text-slate-500">
              Generated by Cricket AI Championship Engine · Ready for screenshot & sharing
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
