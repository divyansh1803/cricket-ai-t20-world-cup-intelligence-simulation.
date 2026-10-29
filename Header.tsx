import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useGame, AppNavView } from '../../context/GameContext';
import { cricketAudio } from '../../utils/audioSystem';
import { triggerHaptic, HAPTIC_PATTERNS, isVibrationSupported, HapticIntensity } from '../../utils/haptics';
import {
  Volume2,
  VolumeX,
  Sparkles,
  Trophy,
  Flame,
  Film,
  Home,
  Radio,
  Calendar,
  TrendingUp,
  Swords,
  Users,
  Shield,
  Activity,
  Gamepad2,
  Tv,
  Clock,
  Settings,
  Smartphone,
  X,
} from 'lucide-react';

export const Header: React.FC = () => {
  const {
    activeView,
    setActiveView,
    profile,
    soundEnabled,
    toggleSound,
    hapticsEnabled,
    setHapticsEnabled,
    hapticIntensity,
    setHapticIntensity,
    isBroadcastMode,
    toggleBroadcastMode,
    matchDurationSeconds,
    isSimMatchRunning,
    setAskAiOpen,
    setShowIntro,
  } = useGame();

  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const settingsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (settingsRef.current && !settingsRef.current.contains(event.target as Node)) {
        setIsSettingsOpen(false);
      }
    };
    if (isSettingsOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isSettingsOpen]);

  const formattedMatchClock = useMemo(() => {
    const hrs = Math.floor(matchDurationSeconds / 3600);
    const mins = Math.floor((matchDurationSeconds % 3600) / 60);
    const secs = matchDurationSeconds % 60;
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }, [matchDurationSeconds]);

  const navLinks: { view: AppNavView; label: string; icon: React.FC<{ className?: string }> }[] = [
    { view: 'home', label: 'Home', icon: Home },
    { view: 'championship', label: 'Champions', icon: Trophy },
    { view: 'simulator', label: 'Live Match', icon: Radio },
    { view: 'cricket_lab', label: 'AI Lab', icon: Sparkles },
    { view: 'tournament', label: 'Tournament', icon: Calendar },
    { view: 'predictions', label: 'Predictor', icon: TrendingUp },
    { view: 'battle_cards', label: 'Battles', icon: Swords },
    { view: 'rivalries', label: 'Rivalries', icon: Flame },
    { view: 'players', label: 'Universe', icon: Users },
    { view: 'commanders', label: 'Commanders', icon: Shield },
    { view: 'intelligence', label: 'Player DNA', icon: Activity },
    { view: 'games', label: 'Games', icon: Gamepad2 },
  ];

  const deviceSupportsVibrate = isVibrationSupported();

  return (
    <header className="sticky top-0 z-40 w-full border-b border-cyan-500/20 bg-slate-950/95 backdrop-blur-xl shadow-lg shadow-black/40 transition-all duration-300">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-3 px-4 sm:px-6">
        {/* Zone 1: Brand Wordmark & Persistent Match Duration Clock */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={() => setActiveView('home')}
            className="group flex items-center gap-2.5 text-left transition-opacity hover:opacity-90 cursor-pointer"
          >
            <div className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-500 to-blue-700 shadow-md shadow-cyan-500/20">
              <Radio className="h-5 w-5 text-white" />
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <span className="text-lg sm:text-xl font-black tracking-tight text-white">
                  CRICKET <span className="text-cyan-400 drop-shadow-[0_0_14px_rgba(6,182,212,0.7)]">AI</span>
                </span>
                {isBroadcastMode && (
                  <span className="text-[11px] font-mono font-bold text-cyan-300 tracking-wide">
                    · TV BROADCAST FEED
                  </span>
                )}
              </div>
            </div>
          </button>

          {/* Persistent Match Duration Digital Clock */}
          <button
            type="button"
            onClick={() => setActiveView('simulator')}
            title={
              isSimMatchRunning
                ? 'Live Match Duration Timer Running — Click to open Live Simulator'
                : 'Elapsed Match Simulation Clock — Linked to MatchSimulator Start/Pause'
            }
            className={`flex items-center gap-2 rounded-xl border px-2.5 py-1.5 text-xs font-mono transition-all cursor-pointer ${
              isSimMatchRunning
                ? 'border-emerald-500/50 bg-emerald-950/40 text-emerald-300 shadow-sm shadow-emerald-500/20'
                : 'border-slate-800 bg-slate-900/80 text-slate-300 hover:border-cyan-500/40 hover:text-white'
            }`}
          >
            <Clock className={`h-3.5 w-3.5 ${isSimMatchRunning ? 'text-emerald-400 animate-spin' : 'text-cyan-400'}`} />
            <span className="hidden md:inline text-[10px] text-slate-400 font-semibold">MATCH TIME</span>
            <span className="font-bold tabular-nums tracking-wider">{formattedMatchClock}</span>
            {isSimMatchRunning && (
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" aria-label="Simulation running" />
            )}
          </button>
        </div>

        {/* Zone 2: Navigation Links (Hidden in Broadcast Mode to maximize scoreboard visibility) */}
        {!isBroadcastMode && (
          <nav className="hidden 2xl:flex items-center justify-center gap-1 text-xs font-semibold overflow-x-auto scrollbar-none">
            {navLinks.map((link) => {
              const Icon = link.icon;
              const isActive = activeView === link.view || (link.view === 'arena' && activeView === 'you_vs_ai');
              return (
                <button
                  key={link.view}
                  type="button"
                  onClick={() => {
                    cricketAudio.playUiClick();
                    setActiveView(link.view);
                  }}
                  className={`relative h-8 inline-flex items-center justify-center gap-1.5 px-2.5 rounded-xl border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    isActive
                      ? 'text-cyan-300 font-bold bg-cyan-500/15 border-cyan-400/40'
                      : 'text-slate-400 hover:text-white hover:bg-slate-900/80 border-transparent'
                  }`}
                >
                  <Icon className={`h-3.5 w-3.5 shrink-0 ${isActive ? 'text-cyan-400' : 'text-slate-400'}`} />
                  <span>{link.label}</span>
                </button>
              );
            })}
          </nav>
        )}

        {/* Zone 3: Primary Actions, Broadcast Mode Toggle & App Settings */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Broadcast Mode Toggle Button */}
          <button
            type="button"
            onClick={toggleBroadcastMode}
            title="Toggle TV Broadcast Mode — Hides non-essential navigation and analytics panels to maximize central scoreboard visibility"
            className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
              isBroadcastMode
                ? 'bg-gradient-to-r from-cyan-400 to-sky-500 text-slate-950 shadow-md shadow-cyan-500/30 ring-1 ring-cyan-300'
                : 'border border-cyan-500/40 bg-cyan-950/40 text-cyan-300 hover:bg-cyan-500/20 hover:text-white'
            }`}
          >
            <Tv className="h-3.5 w-3.5" />
            <span>{isBroadcastMode ? 'Exit Broadcast' : 'Broadcast Mode'}</span>
          </button>

          {!isBroadcastMode && (
            <>
              {/* Replay Cinematic Intro button */}
              <button
                onClick={() => setShowIntro(true)}
                title="Play Cinematic Stadium Intro"
                className="hidden lg:flex h-9 w-9 items-center justify-center rounded-xl border border-slate-800 bg-slate-900/80 text-slate-400 hover:text-cyan-400 hover:border-cyan-500/40 transition-colors cursor-pointer"
              >
                <Film className="h-4 w-4" />
              </button>

              {/* Audio toggle button */}
              <button
                onClick={toggleSound}
                title={soundEnabled ? 'Sound FX Enabled (Click to Mute)' : 'Sound Muted (Click to Enable)'}
                aria-label="Toggle Sound"
                className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-800 bg-slate-900/80 text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
              >
                {soundEnabled ? <Volume2 className="h-4 w-4 text-cyan-400" /> : <VolumeX className="h-4 w-4" />}
              </button>
            </>
          )}

          {/* Global App Settings Panel (Haptic Feedback, Intensity, Audio & Display) */}
          <div className="relative" ref={settingsRef}>
            <button
              type="button"
              onClick={() => {
                setIsSettingsOpen((prev) => !prev);
                triggerHaptic(HAPTIC_PATTERNS.TAP);
              }}
              aria-label="App Settings"
              title="App Settings — Haptic Feedback, Intensity & Broadcast Preferences"
              className={`flex h-9 w-9 items-center justify-center rounded-xl border transition-colors cursor-pointer ${
                isSettingsOpen
                  ? 'border-cyan-400 bg-cyan-500/20 text-cyan-300'
                  : 'border-slate-800 bg-slate-900/80 text-slate-400 hover:text-white hover:border-slate-700'
              }`}
            >
              <Settings className="h-4 w-4" />
            </button>

            {isSettingsOpen && (
              <div className="absolute right-0 mt-2 w-80 rounded-2xl border border-slate-700/90 bg-slate-950/98 p-4 shadow-2xl backdrop-blur-xl z-50 space-y-4 animate-in fade-in duration-150">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
                  <div className="flex items-center gap-2">
                    <Settings className="h-4 w-4 text-cyan-400" />
                    <h3 className="text-xs font-bold text-white">App & Match Settings</h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsSettingsOpen(false)}
                    className="rounded-lg p-1 text-slate-400 hover:text-white cursor-pointer"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>

                {/* Global Haptic Feedback Toggle */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Smartphone className="h-4 w-4 text-cyan-400" />
                      <div>
                        <span className="text-xs font-semibold text-white block">Haptic Feedback</span>
                        <span className="text-[11px] text-slate-400 block">
                          Physical vibration cues for wickets, milestones & boundaries
                        </span>
                      </div>
                    </div>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={hapticsEnabled}
                      onClick={() => setHapticsEnabled(!hapticsEnabled)}
                      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors cursor-pointer ${
                        hapticsEnabled ? 'bg-cyan-500' : 'bg-slate-800'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          hapticsEnabled ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>

                  {/* Haptic Intensity Selector */}
                  {hapticsEnabled && (
                    <div className="space-y-2 pt-1">
                      <div className="flex items-center justify-between text-[11px] text-slate-400">
                        <span>Vibration Intensity</span>
                        <span className="font-mono text-cyan-300 capitalize">{hapticIntensity}</span>
                      </div>
                      <div className="grid grid-cols-3 gap-1.5 p-1 rounded-xl bg-slate-900 border border-slate-800">
                        {(['light', 'medium', 'strong'] as HapticIntensity[]).map((level) => (
                          <button
                            key={level}
                            type="button"
                            onClick={() => setHapticIntensity(level)}
                            className={`rounded-lg py-1.5 text-xs font-semibold capitalize transition-all cursor-pointer ${
                              hapticIntensity === level
                                ? 'bg-cyan-500 text-slate-950 font-bold'
                                : 'text-slate-400 hover:text-white'
                            }`}
                          >
                            {level}
                          </button>
                        ))}
                      </div>

                      <div className="flex items-center justify-between pt-1">
                        <span className="text-[11px] text-slate-500">
                          {deviceSupportsVibrate ? 'Navigator Vibration API Ready' : 'Desktop Browser (Simulated)'}
                        </span>
                        <button
                          type="button"
                          onClick={() => triggerHaptic(HAPTIC_PATTERNS.WICKET)}
                          className="rounded-lg border border-cyan-500/40 bg-cyan-950/50 px-2.5 py-1 text-[11px] font-semibold text-cyan-300 hover:bg-cyan-500/20 cursor-pointer"
                        >
                          Test Wicket Pulse
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Audio FX & Broadcast Mode Quick Controls */}
                <div className="border-t border-slate-800 pt-3 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-slate-200">Stadium Audio & Commentary FX</span>
                    <button
                      type="button"
                      onClick={toggleSound}
                      className={`rounded-lg px-2.5 py-1 text-xs font-semibold cursor-pointer ${
                        soundEnabled
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                          : 'bg-slate-900 text-slate-400 border border-slate-800'
                      }`}
                    >
                      {soundEnabled ? 'Enabled' : 'Muted'}
                    </button>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-slate-200">TV Broadcast Layout</span>
                    <button
                      type="button"
                      onClick={toggleBroadcastMode}
                      className={`rounded-lg px-2.5 py-1 text-xs font-semibold cursor-pointer ${
                        isBroadcastMode
                          ? 'bg-cyan-500 text-slate-950 font-bold'
                          : 'bg-slate-900 text-slate-400 border border-slate-800 hover:text-white'
                      }`}
                    >
                      {isBroadcastMode ? 'Active' : 'Off'}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {!isBroadcastMode && (
            <>
              {/* Gamification Level & XP */}
              <div className="hidden lg:flex items-center gap-2 text-xs text-slate-300 px-2">
                <div className="flex items-center gap-1 text-amber-400 font-bold">
                  <Flame className="h-3.5 w-3.5" />
                  <span className="tabular-nums">{profile.streakDays}d</span>
                </div>
                <span className="text-slate-600">·</span>
                <span className="font-mono text-slate-200 tabular-nums">Lvl {profile.level}</span>
              </div>

              {/* Ask AI Trigger */}
              <button
                onClick={() => setAskAiOpen(true)}
                className="hidden sm:flex items-center gap-1.5 rounded-xl border border-cyan-500/40 bg-cyan-500/10 px-3 py-1.5 text-xs font-semibold text-cyan-300 hover:bg-cyan-500/20 transition-all whitespace-nowrap cursor-pointer"
              >
                <Sparkles className="h-3.5 w-3.5 text-cyan-400" />
                <span className="hidden md:inline">Ask AI</span>
              </button>

              {/* Primary CTA */}
              <button
                onClick={() => setActiveView('simulator')}
                className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 px-3.5 py-1.5 text-xs font-bold text-slate-950 hover:from-cyan-400 hover:to-blue-400 transition-all whitespace-nowrap cursor-pointer shadow-md shadow-cyan-500/25"
              >
                <Radio className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Live Center</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Zone 4: Aligned Desktop/Tablet/Mobile Navigation Bar (Hidden in Broadcast Mode) */}
      {!isBroadcastMode && (
        <div className="2xl:hidden border-t border-slate-800/80 bg-slate-950/95">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 py-2 overflow-x-auto scrollbar-none flex items-center xl:justify-between gap-1.5">
            {navLinks.map((link) => {
              const Icon = link.icon;
              const isActive = activeView === link.view || (link.view === 'arena' && activeView === 'you_vs_ai');
              return (
                <button
                  key={link.view}
                  type="button"
                  onClick={() => {
                    cricketAudio.playUiClick();
                    setActiveView(link.view);
                  }}
                  className={`h-8 inline-flex items-center justify-center gap-1.5 px-2.5 text-xs font-semibold rounded-xl border shrink-0 whitespace-nowrap transition-colors cursor-pointer ${
                    isActive
                      ? 'bg-cyan-500 text-slate-950 border-cyan-400 font-bold'
                      : 'bg-slate-900/90 text-slate-400 hover:text-white hover:bg-slate-800 border-slate-800'
                  }`}
                >
                  <Icon className="h-3.5 w-3.5 shrink-0" />
                  <span>{link.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </header>
  );
};
