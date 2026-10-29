import React from 'react';
import { useGame } from '../../context/GameContext';
import {
  Cpu,
  Play,
  TrendingUp,
  Zap,
  HelpCircle,
  Trophy,
  Shield,
  Layers,
  Sparkles,
  Swords,
  Flame,
} from 'lucide-react';

export const ArenaHub: React.FC = () => {
  const { setActiveView } = useGame();

  const arenaCards = [
    {
      id: 'cricket_lab',
      title: 'Cricket AI Lab (Signature)',
      tagline: 'Futuristic command room: Coaches, Team Chemistry, Decision IQ, and Multiverse alternate realities.',
      difficulty: 'Tactical Command',
      xpReward: '+300 XP',
      icon: <Cpu className="h-6 w-6 text-purple-400" />,
      borderHover: 'hover:border-purple-500/60',
      action: () => setActiveView('cricket_lab'),
      badge: 'Signature Laboratory',
    },
    {
      id: 'battle_cards',
      title: 'Battle Cards & Weaknesses',
      tagline: 'Head-to-head Batter vs Bowler duels with technical vulnerability exploitation.',
      difficulty: 'Scout Duels',
      xpReward: '+180 XP',
      icon: <Swords className="h-6 w-6 text-rose-400" />,
      borderHover: 'hover:border-rose-500/60',
      action: () => setActiveView('battle_cards'),
      badge: 'Matchup Engine',
    },
    {
      id: 'rivalries',
      title: 'Rivalry Heat & Stadium DNA',
      tagline: 'Explore India vs Pakistan, The Ashes, venue personality radar, and situational XIs.',
      difficulty: 'World Explorer',
      xpReward: '+150 XP',
      icon: <Flame className="h-6 w-6 text-amber-400" />,
      borderHover: 'hover:border-amber-500/60',
      action: () => setActiveView('rivalries'),
      badge: 'Atmosphere',
    },
    {
      id: 'you_vs_ai',
      title: 'You vs AI Coach',
      tagline: 'Make real-time strategic calls in high-pressure T20 situations.',
      difficulty: 'Grandmaster',
      xpReward: '+250 XP',
      icon: <Cpu className="h-6 w-6 text-sky-400" />,
      borderHover: 'hover:border-sky-500/60',
      action: () => setActiveView('you_vs_ai'),
      badge: 'Signature Mode',
    },
    {
      id: 'simulator',
      title: 'T20 Match Simulator',
      tagline: 'Ball-by-ball engine with live win probability, speeds, and tactical field control.',
      difficulty: 'Full Control',
      xpReward: '+100 XP / Over',
      icon: <Play className="h-6 w-6 text-emerald-400" />,
      borderHover: 'hover:border-emerald-500/60',
      action: () => setActiveView('simulator'),
      badge: 'Live Engine',
    },
    {
      id: 'whatif',
      title: 'AI What-If Lab',
      tagline: 'Test what happens if Bumrah is rested, dew increases, or pitch turns 4 degrees.',
      difficulty: 'Analyst',
      xpReward: '+150 XP',
      icon: <Zap className="h-6 w-6 text-purple-400" />,
      borderHover: 'hover:border-purple-500/60',
      action: () => setActiveView('whatif'),
      badge: 'Experiment Lab',
    },
    {
      id: 'predictions',
      title: 'Monte Carlo Predictor',
      tagline: 'Run 5,000 matches between any two squads with factor contribution breakdown.',
      difficulty: 'Strategic',
      xpReward: '+120 XP',
      icon: <TrendingUp className="h-6 w-6 text-indigo-400" />,
      borderHover: 'hover:border-indigo-500/60',
      action: () => setActiveView('predictions'),
      badge: '82% Confidence',
    },
    {
      id: 'tournament',
      title: 'Tournament Predictor',
      tagline: 'Interactive knockout bracket from Super 8 to Finals with trophy presentation.',
      difficulty: 'Tournament',
      xpReward: '+500 XP',
      icon: <Trophy className="h-6 w-6 text-amber-400" />,
      borderHover: 'hover:border-amber-500/60',
      action: () => setActiveView('tournament'),
      badge: 'Championship',
    },
    {
      id: 'fantasy',
      title: 'AI Fantasy XI Builder',
      tagline: 'Pick 11 players across teams, get balance score, and let AI optimize your squad.',
      difficulty: 'Squad Builder',
      xpReward: '+200 XP',
      icon: <Layers className="h-6 w-6 text-rose-400" />,
      borderHover: 'hover:border-rose-500/60',
      action: () => setActiveView('fantasy'),
      badge: 'Optimization',
    },
    {
      id: 'games',
      title: 'Cricket Quiz & Guess Player',
      tagline: 'Test rules, history, and player recognition under a 15-second countdown.',
      difficulty: 'Trivia & Scouting',
      xpReward: '+150 XP',
      icon: <HelpCircle className="h-6 w-6 text-cyan-400" />,
      borderHover: 'hover:border-cyan-500/60',
      action: () => setActiveView('games'),
      badge: 'Interactive Games',
    },
  ];

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-sky-400">
            <Sparkles className="h-3.5 w-3.5" />
            <span>CRICKET AI GAMING CENTER</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight mt-1">
            Cricket AI Arena
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-xl">
            Choose your challenge: test strategic instincts against the AI Coach, simulate matches, predict brackets, or explore scenarios.
          </p>
        </div>

        <div className="flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-900/80 px-4 py-2.5 text-xs text-slate-300">
          <Shield className="h-4 w-4 text-sky-400" />
          <span>7 Active Game Modes Available</span>
        </div>
      </div>

      {/* Grid of Arena Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {arenaCards.map((card) => (
          <div
            key={card.id}
            onClick={card.action}
            className={`group rounded-2xl border border-slate-800 bg-slate-900/60 p-6 transition-all duration-200 cursor-pointer flex flex-col justify-between ${card.borderHover} hover:bg-slate-900/90 hover:shadow-xl`}
          >
            <div>
              <div className="flex items-start justify-between mb-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-950 border border-slate-800 group-hover:scale-105 transition-transform">
                  {card.icon}
                </div>
                <span className="rounded-md bg-slate-800/80 px-2 py-0.5 text-[10px] font-mono text-slate-300">
                  {card.badge}
                </span>
              </div>

              <h2 className="text-base font-bold text-white group-hover:text-sky-300 transition-colors">
                {card.title}
              </h2>
              <p className="mt-2 text-xs text-slate-400 leading-relaxed">
                {card.tagline}
              </p>
            </div>

            <div className="mt-6 flex items-center justify-between border-t border-slate-800/80 pt-3 text-xs font-mono text-slate-500">
              <span>{card.difficulty}</span>
              <span className="text-sky-400 font-semibold group-hover:translate-x-1 transition-transform">
                {card.xpReward} · Enter →
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
