import React, { createContext, useContext, useState, useEffect } from 'react';
import { UserProfile, Player, Stadium } from '../types/cricket';
import { cricketAudio } from '../utils/audioSystem';
import {
  HapticIntensity,
  getHapticSettings,
  saveHapticSettings,
  triggerHaptic,
  HAPTIC_PATTERNS,
} from '../utils/haptics';

export type AppNavView =
  | 'home'
  | 'arena'
  | 'you_vs_ai'
  | 'simulator'
  | 'predictions'
  | 'whatif'
  | 'players'
  | 'intelligence'
  | 'fantasy'
  | 'tournament'
  | 'games'
  | 'cricket_lab'
  | 'battle_cards'
  | 'rivalries'
  | 'commanders'
  | 'championship';

interface NotificationItem {
  id: string;
  title: string;
  message: string;
  xpGain?: number;
}

interface GameContextType {
  activeView: AppNavView;
  setActiveView: (view: AppNavView) => void;
  profile: UserProfile;
  addXp: (amount: number, reason: string) => void;
  recordPrediction: (wasCorrect: boolean) => void;
  recordAiBattle: (userWon: boolean) => void;
  soundEnabled: boolean;
  toggleSound: () => void;
  hapticsEnabled: boolean;
  setHapticsEnabled: (enabled: boolean) => void;
  hapticIntensity: HapticIntensity;
  setHapticIntensity: (intensity: HapticIntensity) => void;
  isBroadcastMode: boolean;
  setBroadcastMode: (active: boolean) => void;
  toggleBroadcastMode: () => void;
  matchDurationSeconds: number;
  isSimMatchRunning: boolean;
  setSimMatchRunning: (running: boolean) => void;
  resetMatchDuration: () => void;
  activeNotification: NotificationItem | null;
  dismissNotification: () => void;
  isAskAiOpen: boolean;
  setAskAiOpen: (open: boolean) => void;
  selectedPlayerId: string | null;
  setSelectedPlayerId: (id: string | null) => void;
  activeModalPlayer: Player | null;
  setActiveModalPlayer: (player: Player | null) => void;
  activeModalStadium: Stadium | null;
  setActiveModalStadium: (stadium: Stadium | null) => void;
  showIntro: boolean;
  setShowIntro: (show: boolean) => void;
  simTeamAId: string;
  setSimTeamAId: (id: string) => void;
  simTeamBId: string;
  setSimTeamBId: (id: string) => void;
  simStadiumId: string;
  setSimStadiumId: (id: string) => void;
  launchSimMatch: (teamAId: string, teamBId: string, stadiumId?: string) => void;
}

const INITIAL_PROFILE: UserProfile = {
  level: 12,
  xp: 8420,
  nextLevelXp: 10000,
  rankTitle: 'Cricket Strategist',
  predictionAccuracy: 78,
  predictionsMade: 45,
  aiBattlesWon: 34,
  aiBattlesTotal: 41,
  streakDays: 6,
  favoriteTeamId: 'ind',
  badges: [
    { id: 'b1', name: 'Power Hitter', description: 'Scored 18+ runs in a single death over simulation', unlocked: true, icon: '🔥' },
    { id: 'b2', name: 'Ice Man', description: 'Defended fewer than 8 runs in the 20th over', unlocked: true, icon: '🧊' },
    { id: 'b3', name: 'AI Slayer', description: 'Beat the AI Coach in 30 strategic decision challenges', unlocked: true, icon: '👑' },
    { id: 'b4', name: 'Death Master', description: 'Sub-7.0 economy in simulated death overs', unlocked: false, icon: '⚡' },
    { id: 'b5', name: 'Master Analyst', description: 'Run 100 Monte Carlo tournament forecasts', unlocked: false, icon: '📊' },
  ],
};

const GameContext = createContext<GameContextType | undefined>(undefined);

export const GameProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activeView, setActiveView] = useState<AppNavView>('home');
  const [profile, setProfile] = useState<UserProfile>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('cricket_user_profile');
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch {
          // fallback
        }
      }
    }
    return INITIAL_PROFILE;
  });

  const [soundEnabled, setSoundEnabled] = useState<boolean>(() => cricketAudio.isEnabled());

  // Global Haptic Feedback preferences
  const initialHaptics = getHapticSettings();
  const [hapticsEnabled, setHapticsEnabledState] = useState<boolean>(initialHaptics.enabled);
  const [hapticIntensity, setHapticIntensityState] = useState<HapticIntensity>(initialHaptics.intensity);

  // Global Broadcast Mode state (maximizes central scoreboard & hides non-essential UI)
  const [isBroadcastMode, setBroadcastMode] = useState<boolean>(false);

  // Real-time Match Duration Tracker linked to MatchSimulator start/stop states
  const [matchDurationSeconds, setMatchDurationSeconds] = useState<number>(0);
  const [isSimMatchRunning, setSimMatchRunning] = useState<boolean>(false);

  const [activeNotification, setActiveNotification] = useState<NotificationItem | null>(null);
  const [isAskAiOpen, setAskAiOpen] = useState<boolean>(false);
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>('sky');
  const [activeModalPlayer, setActiveModalPlayer] = useState<Player | null>(null);
  const [activeModalStadium, setActiveModalStadium] = useState<Stadium | null>(null);
  const [showIntro, setShowIntro] = useState<boolean>(false);
  const [simTeamAId, setSimTeamAId] = useState<string>('ind');
  const [simTeamBId, setSimTeamBId] = useState<string>('aus');
  const [simStadiumId, setSimStadiumId] = useState<string>('ahmedabad');

  useEffect(() => {
    if (!isSimMatchRunning) return;
    const timer = setInterval(() => {
      setMatchDurationSeconds((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [isSimMatchRunning]);

  const resetMatchDuration = () => {
    setMatchDurationSeconds(0);
    setSimMatchRunning(false);
  };

  const setHapticsEnabled = (enabled: boolean) => {
    saveHapticSettings({ enabled });
    setHapticsEnabledState(enabled);
    if (enabled) {
      triggerHaptic(HAPTIC_PATTERNS.TAP);
    }
  };

  const setHapticIntensity = (intensity: HapticIntensity) => {
    saveHapticSettings({ intensity });
    setHapticIntensityState(intensity);
    triggerHaptic(HAPTIC_PATTERNS.FOUR);
  };

  const toggleBroadcastMode = () => {
    setBroadcastMode((prev) => {
      const next = !prev;
      if (next && activeView !== 'simulator') {
        setActiveView('simulator');
      }
      return next;
    });
    cricketAudio.playUiClick();
    triggerHaptic(HAPTIC_PATTERNS.TAP);
  };

  const launchSimMatch = (teamAId: string, teamBId: string, stadiumId?: string) => {
    setSimTeamAId(teamAId);
    setSimTeamBId(teamBId);
    if (stadiumId) setSimStadiumId(stadiumId);
    setActiveView('simulator');
  };

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('cricket_user_profile', JSON.stringify(profile));
    }
  }, [profile]);

  useEffect(() => {
    return cricketAudio.subscribeSettings((enabled) => {
      setSoundEnabled(enabled);
    });
  }, []);

  const toggleSound = () => {
    const next = cricketAudio.toggleSound();
    setSoundEnabled(next);
  };

  const calculateRankTitle = (lvl: number): string => {
    if (lvl >= 25) return 'Cricket AI Grandmaster';
    if (lvl >= 20) return 'Chief Match Strategist';
    if (lvl >= 15) return 'Senior Tactical Coach';
    if (lvl >= 10) return 'Cricket Strategist';
    if (lvl >= 5) return 'Tactical Analyst';
    return 'Cricket Scout';
  };

  const addXp = (amount: number, reason: string) => {
    setProfile((prev) => {
      const newXp = prev.xp + amount;
      let newLevel = prev.level;
      let nextThreshold = prev.nextLevelXp;

      if (newXp >= prev.nextLevelXp) {
        newLevel += 1;
        nextThreshold = newLevel * 850 + 1500;
      }

      return {
        ...prev,
        xp: newXp,
        level: newLevel,
        nextLevelXp: nextThreshold,
        rankTitle: calculateRankTitle(newLevel),
      };
    });

    setActiveNotification({
      id: String(Date.now()),
      title: `+${amount} XP Awarded`,
      message: reason,
      xpGain: amount,
    });
  };

  const recordPrediction = (wasCorrect: boolean) => {
    setProfile((prev) => {
      const newTotal = prev.predictionsMade + 1;
      const prevCorrect = Math.round((prev.predictionAccuracy / 100) * prev.predictionsMade);
      const newCorrect = prevCorrect + (wasCorrect ? 1 : 0);
      const newAccuracy = Math.round((newCorrect / newTotal) * 100);

      return {
        ...prev,
        predictionsMade: newTotal,
        predictionAccuracy: newAccuracy,
      };
    });
  };

  const recordAiBattle = (userWon: boolean) => {
    setProfile((prev) => ({
      ...prev,
      aiBattlesTotal: prev.aiBattlesTotal + 1,
      aiBattlesWon: userWon ? prev.aiBattlesWon + 1 : prev.aiBattlesWon,
    }));
  };

  const dismissNotification = () => {
    setActiveNotification(null);
  };

  return (
    <GameContext.Provider
      value={{
        activeView,
        setActiveView,
        profile,
        addXp,
        recordPrediction,
        recordAiBattle,
        soundEnabled,
        toggleSound,
        hapticsEnabled,
        setHapticsEnabled,
        hapticIntensity,
        setHapticIntensity,
        isBroadcastMode,
        setBroadcastMode,
        toggleBroadcastMode,
        matchDurationSeconds,
        isSimMatchRunning,
        setSimMatchRunning,
        resetMatchDuration,
        activeNotification,
        dismissNotification,
        isAskAiOpen,
        setAskAiOpen,
        selectedPlayerId,
        setSelectedPlayerId,
        activeModalPlayer,
        setActiveModalPlayer,
        activeModalStadium,
        setActiveModalStadium,
        showIntro,
        setShowIntro,
        simTeamAId,
        setSimTeamAId,
        simTeamBId,
        setSimTeamBId,
        simStadiumId,
        setSimStadiumId,
        launchSimMatch,
      }}
    >
      {children}
    </GameContext.Provider>
  );
};

export const useGame = (): GameContextType => {
  const context = useContext(GameContext);
  if (!context) {
    throw new Error('useGame must be used within a GameProvider');
  }
  return context;
};
