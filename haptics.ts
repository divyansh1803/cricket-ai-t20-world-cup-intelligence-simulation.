/**
 * Haptic feedback utility using the HTML5 Navigator Vibration API
 * Provides physical haptic feedback on mobile devices for cricket simulation events,
 * wickets, milestones, boundaries & interactive controls with global user settings.
 */

export type HapticIntensity = 'light' | 'medium' | 'strong';

export interface HapticSettings {
  enabled: boolean;
  intensity: HapticIntensity;
}

const HAPTICS_STORAGE_KEY = 'cricket_ai_haptics_settings';

const DEFAULT_HAPTIC_SETTINGS: HapticSettings = {
  enabled: true,
  intensity: 'medium',
};

export const getHapticSettings = (): HapticSettings => {
  if (typeof window === 'undefined') return DEFAULT_HAPTIC_SETTINGS;
  try {
    const raw = localStorage.getItem(HAPTICS_STORAGE_KEY);
    if (!raw) return DEFAULT_HAPTIC_SETTINGS;
    const parsed = JSON.parse(raw);
    return {
      enabled: typeof parsed.enabled === 'boolean' ? parsed.enabled : true,
      intensity:
        parsed.intensity === 'light' || parsed.intensity === 'medium' || parsed.intensity === 'strong'
          ? parsed.intensity
          : 'medium',
    };
  } catch {
    return DEFAULT_HAPTIC_SETTINGS;
  }
};

export const saveHapticSettings = (partial: Partial<HapticSettings>): HapticSettings => {
  const next: HapticSettings = {
    ...getHapticSettings(),
    ...partial,
  };
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(HAPTICS_STORAGE_KEY, JSON.stringify(next));
    } catch {
      // Ignore storage quota errors
    }
  }
  return next;
};

export const isVibrationSupported = (): boolean => {
  return typeof window !== 'undefined' && typeof navigator !== 'undefined' && 'vibrate' in navigator;
};

const scalePattern = (
  pattern: number | number[] | readonly number[],
  intensity: HapticIntensity
): number | number[] => {
  const multiplier = intensity === 'light' ? 0.55 : intensity === 'strong' ? 1.45 : 1.0;
  if (typeof pattern === 'number') {
    return Math.max(10, Math.round(pattern * multiplier));
  }
  return pattern.map((val, idx) => {
    // Even indices are vibration durations, odd indices are pauses
    if (idx % 2 === 0) {
      return Math.max(10, Math.round(val * multiplier));
    }
    return val;
  });
};

export const triggerHaptic = (pattern: number | number[] | readonly number[] = 25) => {
  const settings = getHapticSettings();
  if (!settings.enabled) return;

  if (isVibrationSupported()) {
    try {
      const scaled = scalePattern(pattern, settings.intensity);
      navigator.vibrate(scaled);
    } catch {
      // Ignore vibration error if not supported/permitted on device
    }
  }
};

export const HAPTIC_PATTERNS = {
  TAP: 20,
  BALL_BOWLED: 30,
  FOUR: [35, 25, 45],
  SIX: [60, 30, 90],
  WICKET: [80, 40, 120, 50, 160],
  MILESTONE: [70, 35, 110, 40, 150],
  DRS_DECISION: [55, 35, 95, 35, 140],
  OVER_COMPLETE: [35, 25, 35],
  VICTORY_FANFARE: [100, 50, 150, 50, 250, 60, 320],
  SOUNDBOARD_ROAR: [70, 30, 100],
  SOUNDBOARD_FIREWORKS: [40, 30, 60, 30, 120],
  SOUNDBOARD_TROPHY: [90, 50, 180, 60, 300],
  SOUNDBOARD_CHAMPAGNE: [35, 25, 55],
  SOUNDBOARD_DRUMS: [40, 25, 40, 25, 80],
  SOUNDBOARD_LASER: [25, 20, 25, 20, 45],
} as const;
