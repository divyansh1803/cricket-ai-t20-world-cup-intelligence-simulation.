import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Sun,
  Moon,
  Sunset,
  Sunrise,
  Lightbulb,
  Zap,
  Gauge,
  Sliders,
  Sparkles,
  Activity,
  Layers,
  ChevronDown,
  ChevronUp,
  Volume2
} from 'lucide-react';
import { BallEvent } from '../../types/cricket';
import { audioManager } from '../../services/AudioManager';

export type TimeOfDay = 'day' | 'golden_hour' | 'dusk' | 'night' | 'live_auto' | 'match_time';

export type LightingFxState =
  | 'STABLE'
  | 'WICKET_FLICKER'
  | 'BOUNDARY_PULSE'
  | 'SIX_SUPERFLARE'
  | 'DRS_SPOTLIGHT'
  | 'DEATH_OVERS_TENSION'
  | 'VICTORY_SHOW';

export interface SmartStadiumLightingProps {
  timeOfDay?: TimeOfDay;
  onTimeOfDayChange?: (tod: TimeOfDay) => void;
  lastBall?: BallEvent | null;
  matchOvers?: number | string; // e.g. "14.2" or 14.2 - used to calculate progressive match time lighting shift
  totalOvers?: number; // default 20 for T20
  isMatchActive?: boolean;
  isDrsActive?: boolean;
  isDeathOvers?: boolean;
  activeCelebration?: 'SIX' | 'FOUR' | 'WICKET' | 'VICTORY' | null;
  stadiumName?: string;
  showControlDeck?: boolean;
  className?: string;
}

interface LightingPresetConfig {
  label: string;
  kelvin: number;
  lux: number;
  floodlightPower: number; // 0 to 100%
  baseColor: string;
  beamColor: string;
  hazeColor: string;
  fieldAmbientFilter: string;
  description: string;
}

const PRESET_CONFIGS: Record<Exclude<TimeOfDay, 'live_auto' | 'match_time'>, LightingPresetConfig> = {
  day: {
    label: 'Afternoon Sun',
    kelvin: 5600,
    lux: 4800,
    floodlightPower: 18,
    baseColor: '#fff9e6',
    beamColor: 'rgba(255, 248, 220, 0.12)',
    hazeColor: 'rgba(254, 240, 138, 0.08)',
    fieldAmbientFilter: 'brightness(1.12) saturate(1.08) contrast(1.02)',
    description: 'High solar luminance, high CRI 98, subtle daytime fill lamps',
  },
  golden_hour: {
    label: 'Golden Hour / Sunset',
    kelvin: 3200,
    lux: 2600,
    floodlightPower: 58,
    baseColor: '#ffb347',
    beamColor: 'rgba(255, 179, 71, 0.28)',
    hazeColor: 'rgba(249, 115, 22, 0.18)',
    fieldAmbientFilter: 'brightness(1.02) sepia(0.25) saturate(1.25) hue-rotate(-12deg)',
    description: 'Warm 3,200K sunset rays blending with warm incandescent floodlights',
  },
  dusk: {
    label: 'Twilight / Dusk',
    kelvin: 4400,
    lux: 2200,
    floodlightPower: 82,
    baseColor: '#a5b4fc',
    beamColor: 'rgba(165, 180, 252, 0.32)',
    hazeColor: 'rgba(99, 102, 241, 0.16)',
    fieldAmbientFilter: 'brightness(0.92) saturate(1.15) hue-rotate(6deg)',
    description: 'Indigo twilight transition with 82% floodlight bank ramp-up',
  },
  night: {
    label: 'Night LED Floodlights',
    kelvin: 6500,
    lux: 3400,
    floodlightPower: 100,
    baseColor: '#e0f2fe',
    beamColor: 'rgba(56, 189, 248, 0.38)',
    hazeColor: 'rgba(14, 165, 233, 0.16)',
    fieldAmbientFilter: 'brightness(0.98) saturate(1.18) contrast(1.06)',
    description: 'ICC Tier-1 Broadcast Grade A, 6,500K crisp cool-white LED matrix',
  },
};

/**
 * Calculates current time of day based on user local clock
 */
const getLiveTimeOfDay = (): Exclude<TimeOfDay, 'live_auto' | 'match_time'> => {
  const hour = new Date().getHours();
  if (hour >= 9 && hour < 16) return 'day';
  if (hour >= 16 && hour < 18) return 'golden_hour';
  if (hour >= 18 && hour < 20) return 'dusk';
  return 'night';
};

export const SmartStadiumLighting: React.FC<SmartStadiumLightingProps> = ({
  timeOfDay: controlledTimeOfDay = 'night',
  onTimeOfDayChange,
  lastBall,
  matchOvers,
  totalOvers = 20,
  isMatchActive = false,
  isDrsActive = false,
  isDeathOvers = false,
  activeCelebration,
  stadiumName = 'International Stadium',
  showControlDeck = true,
  className = '',
}) => {
  // Local state if uncontrolled
  const [internalTimeOfDay, setInternalTimeOfDay] = useState<TimeOfDay>(controlledTimeOfDay);
  const currentTimeOfDay = controlledTimeOfDay || internalTimeOfDay;

  const [activeFx, setActiveFx] = useState<LightingFxState>('STABLE');
  const [flickerIntensity, setFlickerIntensity] = useState<number>(1.0);
  const [isDirectorOpen, setIsDirectorOpen] = useState<boolean>(false);
  const [manualKelvinOverride, setManualKelvinOverride] = useState<number | null>(null);
  const [manualIntensityOverride, setManualIntensityOverride] = useState<number | null>(null);

  const fxTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const flickerIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Parse overs progression (0.0 to totalOvers) -> fraction 0.0 to 1.0
  const matchProgressionFraction = useMemo(() => {
    if (matchOvers === undefined || matchOvers === null) return 0.5;
    const numericOvers = typeof matchOvers === 'number' ? matchOvers : parseFloat(String(matchOvers)) || 0;
    return Math.min(1.0, Math.max(0, numericOvers / totalOvers));
  }, [matchOvers, totalOvers]);

  // Compute effective preset or interpolated match-time environment
  const effectiveTod: Exclude<TimeOfDay, 'live_auto' | 'match_time'> = useMemo(() => {
    if (currentTimeOfDay === 'live_auto') {
      return getLiveTimeOfDay();
    }
    if (currentTimeOfDay === 'match_time') {
      // Day-night match progression:
      // Overs 0 - 6 (Powerplay): late afternoon sun
      // Overs 7 - 14 (Middle overs): golden hour / sunset transition
      // Overs 15 - 18: dusk twilight ramp-up
      // Overs 19 - 20 (Death overs): full night LED floodlights
      if (matchProgressionFraction < 0.3) return 'day';
      if (matchProgressionFraction < 0.65) return 'golden_hour';
      if (matchProgressionFraction < 0.85) return 'dusk';
      return 'night';
    }
    return currentTimeOfDay as Exclude<TimeOfDay, 'live_auto' | 'match_time'>;
  }, [currentTimeOfDay, matchProgressionFraction]);

  const baseConfig = PRESET_CONFIGS[effectiveTod];

  // Progressive color temp & lux shifting based on match time if match_time mode is engaged
  const computedKelvin = useMemo(() => {
    if (currentTimeOfDay === 'match_time') {
      // Smooth gradient from 5600K (day) -> 3200K (golden hour) -> 4400K (dusk) -> 6500K (night LED)
      if (matchProgressionFraction < 0.35) {
        // Transition from 5600K towards 3200K
        const t = matchProgressionFraction / 0.35;
        return Math.round(5600 - t * (5600 - 3200));
      } else if (matchProgressionFraction < 0.7) {
        // Transition from 3200K towards 4400K
        const t = (matchProgressionFraction - 0.35) / 0.35;
        return Math.round(3200 + t * (4400 - 3200));
      } else {
        // Transition from 4400K towards 6500K
        const t = (matchProgressionFraction - 0.7) / 0.3;
        return Math.round(4400 + t * (6500 - 4400));
      }
    }
    return baseConfig.kelvin;
  }, [currentTimeOfDay, matchProgressionFraction, baseConfig.kelvin]);

  const effectiveKelvin = manualKelvinOverride ?? computedKelvin;
  const effectivePower = manualIntensityOverride ?? (
    currentTimeOfDay === 'match_time'
      ? Math.round(20 + matchProgressionFraction * 80) // 20% in day -> 100% in night
      : baseConfig.floodlightPower
  );

  // Handle Match Events Triggering Dynamic Lighting FX
  useEffect(() => {
    if (!lastBall) return;

    if (lastBall.outcome === 'W') {
      triggerWicketFlicker();
    } else if (lastBall.outcome === '4') {
      triggerBoundaryPulse();
    } else if (lastBall.outcome === '6') {
      triggerSixSuperflare();
    }
  }, [lastBall?.totalBalls, lastBall?.outcome]);

  // Handle DRS Mode
  useEffect(() => {
    if (isDrsActive) {
      setActiveFx('DRS_SPOTLIGHT');
    } else if (activeFx === 'DRS_SPOTLIGHT') {
      setActiveFx('STABLE');
    }
  }, [isDrsActive]);

  // Handle Death Overs
  useEffect(() => {
    if (isDeathOvers && !isDrsActive && activeFx === 'STABLE') {
      setActiveFx('DEATH_OVERS_TENSION');
    } else if (!isDeathOvers && activeFx === 'DEATH_OVERS_TENSION') {
      setActiveFx('STABLE');
    }
  }, [isDeathOvers, isDrsActive]);

  // Handle Celebrations
  useEffect(() => {
    if (activeCelebration === 'WICKET') {
      triggerWicketFlicker();
    } else if (activeCelebration === 'FOUR') {
      triggerBoundaryPulse();
    } else if (activeCelebration === 'SIX') {
      triggerSixSuperflare();
    } else if (activeCelebration === 'VICTORY') {
      triggerVictoryShow();
    }
  }, [activeCelebration]);

  // Clear FX helper
  const clearFxTimers = () => {
    if (fxTimeoutRef.current) clearTimeout(fxTimeoutRef.current);
    if (flickerIntervalRef.current) clearInterval(flickerIntervalRef.current);
    setFlickerIntensity(1.0);
  };

  /**
   * WICKET FLICKER FX
   * Simulates modern stadium lighting blackout, rapid high-voltage stroboscopic flash,
   * dramatic red electric surge, then crisp recovery!
   */
  const triggerWicketFlicker = () => {
    clearFxTimers();
    setActiveFx('WICKET_FLICKER');

    let step = 0;
    flickerIntervalRef.current = setInterval(() => {
      step++;
      // High frequency rapid voltage drop and strobe
      if (step < 6) {
        setFlickerIntensity(step % 2 === 0 ? 0.05 : 1.3);
      } else if (step < 12) {
        setFlickerIntensity(step % 2 === 0 ? 0.2 : 0.85);
      } else {
        setFlickerIntensity(1.0);
      }
    }, 110);

    fxTimeoutRef.current = setTimeout(() => {
      clearFxTimers();
      setActiveFx('STABLE');
    }, 2800);
  };

  /**
   * BOUNDARY PULSE FX
   * Pulsing emerald green beams and outfield perimeter waves!
   */
  const triggerBoundaryPulse = () => {
    clearFxTimers();
    setActiveFx('BOUNDARY_PULSE');
    setFlickerIntensity(1.0);

    fxTimeoutRef.current = setTimeout(() => {
      clearFxTimers();
      setActiveFx('STABLE');
    }, 2600);
  };

  /**
   * SIX SUPERFLARE FX
   * Blinding high-lux cyan-white surge and celebratory sweep
   */
  const triggerSixSuperflare = () => {
    clearFxTimers();
    setActiveFx('SIX_SUPERFLARE');
    setFlickerIntensity(1.4);

    fxTimeoutRef.current = setTimeout(() => {
      clearFxTimers();
      setActiveFx('STABLE');
    }, 3200);
  };

  /**
   * VICTORY SHOW FX
   */
  const triggerVictoryShow = () => {
    clearFxTimers();
    setActiveFx('VICTORY_SHOW');
    setFlickerIntensity(1.2);

    fxTimeoutRef.current = setTimeout(() => {
      clearFxTimers();
      setActiveFx('STABLE');
    }, 8000);
  };

  // Compute dynamic styling based on active state and flicker
  const lightingStyles = useMemo(() => {
    let lampGlowColor = baseConfig.baseColor;
    let beamGlow = baseConfig.beamColor;
    let ambientOverlay = 'transparent';
    let flareIntensity = (effectivePower / 100) * flickerIntensity;
    let isStrobing = false;
    let isPulsingGreen = false;

    switch (activeFx) {
      case 'WICKET_FLICKER':
        lampGlowColor = flickerIntensity < 0.3 ? '#ef4444' : '#ffffff';
        beamGlow = flickerIntensity < 0.3 ? 'rgba(239, 68, 68, 0.45)' : 'rgba(255, 255, 255, 0.7)';
        ambientOverlay = flickerIntensity < 0.3 ? 'rgba(220, 38, 38, 0.18)' : 'rgba(255, 255, 255, 0.08)';
        isStrobing = true;
        break;

      case 'BOUNDARY_PULSE':
        lampGlowColor = '#10b981';
        beamGlow = 'rgba(16, 185, 129, 0.55)';
        ambientOverlay = 'rgba(16, 185, 129, 0.15)';
        isPulsingGreen = true;
        break;

      case 'SIX_SUPERFLARE':
        lampGlowColor = '#38bdf8';
        beamGlow = 'rgba(56, 189, 248, 0.65)';
        ambientOverlay = 'rgba(56, 189, 248, 0.18)';
        break;

      case 'DRS_SPOTLIGHT':
        lampGlowColor = '#f59e0b';
        beamGlow = 'rgba(245, 158, 11, 0.45)';
        ambientOverlay = 'rgba(15, 23, 42, 0.4)'; // perimeter dimmed
        break;

      case 'DEATH_OVERS_TENSION':
        lampGlowColor = '#f97316';
        beamGlow = 'rgba(249, 115, 22, 0.35)';
        ambientOverlay = 'rgba(249, 115, 22, 0.08)';
        break;

      case 'VICTORY_SHOW':
        lampGlowColor = '#a855f7';
        beamGlow = 'rgba(168, 85, 247, 0.55)';
        ambientOverlay = 'rgba(168, 85, 247, 0.15)';
        break;

      default:
        // STABLE
        ambientOverlay = 'transparent';
        break;
    }

    return {
      lampGlowColor,
      beamGlow,
      ambientOverlay,
      flareIntensity,
      isStrobing,
      isPulsingGreen,
    };
  }, [baseConfig, activeFx, flickerIntensity, effectivePower]);

  const handleSelectTimeOfDay = (tod: TimeOfDay) => {
    setInternalTimeOfDay(tod);
    onTimeOfDayChange?.(tod);
    audioManager.playBatHit();
  };

  return (
    <div className={`smart-stadium-lighting pointer-events-none ${className}`}>
      {/* ========================================================================= */}
      {/* 1. ATMOSPHERIC AMBIENT TINT & KELVIN COLOR TEMPERATURE OVERLAY            */}
      {/* ========================================================================= */}
      <div
        className="absolute inset-0 pointer-events-none transition-all duration-700 z-10"
        style={{
          background: lightingStyles.ambientOverlay,
          backdropFilter:
            activeFx === 'WICKET_FLICKER' && flickerIntensity < 0.3
              ? 'brightness(0.6) saturate(1.8)'
              : undefined,
        }}
      />

      {/* Boundary Emerald Pulse Ripple Wave */}
      {lightingStyles.isPulsingGreen && (
        <div className="absolute inset-4 rounded-[48%] border-4 border-emerald-400/80 animate-ping pointer-events-none z-10 shadow-[0_0_80px_#10b981]" />
      )}

      {/* Six Shockwave Ring */}
      {activeFx === 'SIX_SUPERFLARE' && (
        <div className="absolute inset-2 rounded-[48%] border-8 border-sky-400/60 animate-pulse pointer-events-none z-10 shadow-[0_0_120px_#38bdf8]" />
      )}

      {/* DRS Pitch Spotlight Halo */}
      {activeFx === 'DRS_SPOTLIGHT' && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
          <div className="w-48 h-64 rounded-full bg-amber-400/20 blur-2xl animate-pulse shadow-[0_0_100px_#f59e0b]" />
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. FOUR HIGH-MAST PHYSICAL FLOODLIGHT TOWERS                              */}
      {/* ========================================================================= */}
      <div className="absolute inset-0 pointer-events-none z-20">
        {/* Tower 1: North-West Mast */}
        <FloodlightTower
          position="top-left"
          lampColor={lightingStyles.lampGlowColor}
          beamColor={lightingStyles.beamGlow}
          power={effectivePower}
          flicker={flickerIntensity}
          activeFx={activeFx}
          beamAngle={42}
        />

        {/* Tower 2: North-East Mast */}
        <FloodlightTower
          position="top-right"
          lampColor={lightingStyles.lampGlowColor}
          beamColor={lightingStyles.beamGlow}
          power={effectivePower}
          flicker={flickerIntensity}
          activeFx={activeFx}
          beamAngle={-42}
        />

        {/* Tower 3: South-West Mast */}
        <FloodlightTower
          position="bottom-left"
          lampColor={lightingStyles.lampGlowColor}
          beamColor={lightingStyles.beamGlow}
          power={effectivePower}
          flicker={flickerIntensity}
          activeFx={activeFx}
          beamAngle={138}
        />

        {/* Tower 4: South-East Mast */}
        <FloodlightTower
          position="bottom-right"
          lampColor={lightingStyles.lampGlowColor}
          beamColor={lightingStyles.beamGlow}
          power={effectivePower}
          flicker={flickerIntensity}
          activeFx={activeFx}
          beamAngle={-138}
        />
      </div>

      {/* ========================================================================= */}
      {/* 3. INTERACTIVE LIGHTING DIRECTOR DECK & TELEMETRY HUD                     */}
      {/* ========================================================================= */}
      {showControlDeck && (
        <div className="absolute top-3 right-3 pointer-events-auto z-30 flex flex-col items-end gap-1.5 font-sans">
          {/* Compact Telemetry Pill Button */}
          <div className="flex items-center gap-1 bg-slate-950/85 backdrop-blur-md border border-slate-800/90 rounded-xl p-1 shadow-2xl">
            {/* Quick Time of Day Dropdown / Toggles */}
            <div className="flex items-center gap-0.5 px-1">
              <button
                type="button"
                onClick={() => handleSelectTimeOfDay('day')}
                title="Afternoon Sunlight (5,600K)"
                className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                  effectiveTod === 'day'
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                <Sun className="h-3.5 w-3.5" />
              </button>

              <button
                type="button"
                onClick={() => handleSelectTimeOfDay('golden_hour')}
                title="Golden Hour / Sunset (3,200K)"
                className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                  effectiveTod === 'golden_hour'
                    ? 'bg-orange-500/20 text-orange-300 border border-orange-500/40 shadow-sm'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                <Sunset className="h-3.5 w-3.5" />
              </button>

              <button
                type="button"
                onClick={() => handleSelectTimeOfDay('dusk')}
                title="Twilight / Dusk (4,400K)"
                className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                  effectiveTod === 'dusk'
                    ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 shadow-sm'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                <Sunrise className="h-3.5 w-3.5" />
              </button>

              <button
                type="button"
                onClick={() => handleSelectTimeOfDay('night')}
                title="ICC Night LED Floodlights (6,500K)"
                className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                  effectiveTod === 'night' && currentTimeOfDay !== 'match_time'
                    ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40 shadow-sm'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                <Moon className="h-3.5 w-3.5" />
              </button>

              <button
                type="button"
                onClick={() => handleSelectTimeOfDay('match_time')}
                title="Dynamic Match Time Progression (Overs 0-20 Sun to Night Shift)"
                className={`p-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1 ${
                  currentTimeOfDay === 'match_time'
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                <Activity className="h-3.5 w-3.5 text-emerald-400" />
                <span className="text-[10px] font-mono font-bold hidden md:inline">AUTO MATCH</span>
              </button>
            </div>

            {/* Separator */}
            <div className="h-5 w-px bg-slate-800 mx-0.5" />

            {/* Live Status Badge */}
            <button
              type="button"
              onClick={() => setIsDirectorOpen(!isDirectorOpen)}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-900/90 hover:bg-slate-850 text-slate-200 text-xs font-mono transition-colors border border-slate-750 cursor-pointer"
            >
              <Lightbulb
                className={`h-3.5 w-3.5 ${
                  activeFx === 'WICKET_FLICKER'
                    ? 'text-red-400 animate-pulse'
                    : activeFx === 'BOUNDARY_PULSE'
                    ? 'text-emerald-400 animate-spin'
                    : activeFx === 'SIX_SUPERFLARE'
                    ? 'text-sky-300 animate-bounce'
                    : activeFx === 'DRS_SPOTLIGHT'
                    ? 'text-amber-400'
                    : 'text-sky-400'
                }`}
              />
              <span className="hidden sm:inline font-semibold">
                {activeFx === 'WICKET_FLICKER'
                  ? '⚡ WICKET FLICKER'
                  : activeFx === 'BOUNDARY_PULSE'
                  ? '🟢 EMERALD PULSE'
                  : activeFx === 'SIX_SUPERFLARE'
                  ? '💥 SIX FLARE'
                  : activeFx === 'DRS_SPOTLIGHT'
                  ? '🚨 DRS SPOTLIGHT'
                  : activeFx === 'DEATH_OVERS_TENSION'
                  ? '🔥 DEATH OVERS'
                  : `${effectiveKelvin}K · ${baseConfig.lux} LUX`}
              </span>
              <span className="text-[10px] text-slate-400 font-mono">
                {effectivePower}%
              </span>
              {isDirectorOpen ? (
                <ChevronUp className="h-3 w-3 text-slate-400" />
              ) : (
                <ChevronDown className="h-3 w-3 text-slate-400" />
              )}
            </button>
          </div>

          {/* Expandable Lighting Director Panel */}
          {isDirectorOpen && (
            <div className="w-80 rounded-2xl bg-slate-950/95 border border-slate-800/90 p-3.5 shadow-2xl backdrop-blur-xl animate-in fade-in zoom-in-95 duration-200 space-y-3">
              {/* Header */}
              <div className="flex items-center justify-between border-b border-slate-800/70 pb-2">
                <div className="flex items-center gap-2">
                  <div className="h-6 w-6 rounded-lg bg-sky-500/10 border border-sky-500/30 flex items-center justify-center text-sky-400">
                    <Sliders className="h-3.5 w-3.5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white tracking-wide">
                      SMART STADIUM LIGHTING
                    </h4>
                    <p className="text-[10px] text-slate-400 font-mono">
                      Dynamic Floodlight & Color Temp System
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    ONLINE
                  </span>
                </div>
              </div>

              {/* Real-time Telemetry Grid */}
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="p-2 rounded-xl bg-slate-900/80 border border-slate-800">
                  <div className="text-[9px] text-slate-400 uppercase font-mono">Color Temp</div>
                  <div className="text-xs font-bold text-sky-400 font-mono mt-0.5">
                    {effectiveKelvin} K
                  </div>
                  <div className="text-[8px] text-slate-500 truncate">
                    {effectiveKelvin >= 5500 ? 'Day/LED White' : 'Warm Halogen'}
                  </div>
                </div>

                <div className="p-2 rounded-xl bg-slate-900/80 border border-slate-800">
                  <div className="text-[9px] text-slate-400 uppercase font-mono">Luminance</div>
                  <div className="text-xs font-bold text-amber-300 font-mono mt-0.5">
                    {Math.round(baseConfig.lux * (effectivePower / 100))} LUX
                  </div>
                  <div className="text-[8px] text-slate-500 truncate">ICC Broadcast A</div>
                </div>

                <div className="p-2 rounded-xl bg-slate-900/80 border border-slate-800">
                  <div className="text-[9px] text-slate-400 uppercase font-mono">Bank Power</div>
                  <div className="text-xs font-bold text-emerald-400 font-mono mt-0.5">
                    {effectivePower}%
                  </div>
                  <div className="text-[8px] text-slate-500 truncate">48/48 Emitters</div>
                </div>
              </div>

              {/* Time of Day Presets */}
              <div className="space-y-1.5">
                <div className="text-[10px] font-mono text-slate-400 uppercase tracking-wider flex items-center justify-between">
                  <span>Atmospheric Environment</span>
                  <span className="text-[9px] text-slate-500">{baseConfig.label}</span>
                </div>
                <div className="grid grid-cols-2 gap-1.5">
                  {(
                    [
                      { id: 'day', label: 'Day Sun', k: '5,600K', icon: Sun },
                      { id: 'golden_hour', label: 'Sunset', k: '3,200K', icon: Sunset },
                      { id: 'dusk', label: 'Dusk', k: '4,400K', icon: Sunrise },
                      { id: 'night', label: 'Night LED', k: '6,500K', icon: Moon },
                      { id: 'match_time', label: 'Match Shift', k: 'Auto Ov.', icon: Activity },
                      { id: 'live_auto', label: 'Real Clock', k: 'Local', icon: Layers },
                    ] as const
                  ).map((item) => {
                    const IconComp = item.icon;
                    const isActive = currentTimeOfDay === item.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => handleSelectTimeOfDay(item.id)}
                        className={`flex items-center justify-between px-2.5 py-1.5 rounded-xl border text-xs font-medium transition-all cursor-pointer ${
                          isActive
                            ? 'bg-sky-500/15 border-sky-400/50 text-sky-200 shadow-[0_0_15px_rgba(56,189,248,0.2)]'
                            : 'bg-slate-900/60 border-slate-800/80 text-slate-400 hover:text-white hover:bg-slate-800/50'
                        }`}
                      >
                        <div className="flex items-center gap-1.5">
                          <IconComp className="h-3.5 w-3.5" />
                          <span>{item.label}</span>
                        </div>
                        <span className="text-[10px] font-mono opacity-60">{item.k}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Fine Sliders */}
              <div className="space-y-2 pt-1 border-t border-slate-850">
                <div className="space-y-1">
                  <div className="flex justify-between text-[10px] font-mono text-slate-400">
                    <span>Color Temperature</span>
                    <span className="text-sky-300">{effectiveKelvin} K</span>
                  </div>
                  <input
                    type="range"
                    min="2700"
                    max="7000"
                    step="100"
                    value={effectiveKelvin}
                    onChange={(e) => setManualKelvinOverride(Number(e.target.value))}
                    className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-sky-400"
                  />
                  <div className="flex justify-between text-[8px] font-mono text-slate-500">
                    <span>2,700K (Warm)</span>
                    <span>4,500K (Neutral)</span>
                    <span>7,000K (Cool LED)</span>
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between text-[10px] font-mono text-slate-400">
                    <span>Floodlight Intensity</span>
                    <span className="text-emerald-300">{effectivePower}%</span>
                  </div>
                  <input
                    type="range"
                    min="10"
                    max="100"
                    step="5"
                    value={effectivePower}
                    onChange={(e) => setManualIntensityOverride(Number(e.target.value))}
                    className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-400"
                  />
                </div>
              </div>

              {/* Match Event Lighting FX Preview Buttons */}
              <div className="space-y-1.5 pt-1 border-t border-slate-850">
                <div className="text-[10px] font-mono text-slate-400 uppercase tracking-wider flex items-center justify-between">
                  <span>Match Dynamic Effects</span>
                  <span className="text-[9px] text-amber-400">Live Triggers</span>
                </div>
                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      triggerWicketFlicker();
                      audioManager.playWicketFall();
                    }}
                    className="flex items-center gap-1.5 px-2 py-1.5 rounded-xl bg-red-950/40 hover:bg-red-900/60 border border-red-800/60 text-red-300 text-[11px] font-medium transition-all cursor-pointer active:scale-95"
                  >
                    <Zap className="h-3 w-3 text-red-400 animate-pulse" />
                    <span>Wicket Flicker</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      triggerBoundaryPulse();
                      audioManager.playBoundaryApplause();
                    }}
                    className="flex items-center gap-1.5 px-2 py-1.5 rounded-xl bg-emerald-950/40 hover:bg-emerald-900/60 border border-emerald-800/60 text-emerald-300 text-[11px] font-medium transition-all cursor-pointer active:scale-95"
                  >
                    <Activity className="h-3 w-3 text-emerald-400" />
                    <span>Boundary Pulse</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      triggerSixSuperflare();
                      audioManager.playSixRoar();
                    }}
                    className="flex items-center gap-1.5 px-2 py-1.5 rounded-xl bg-sky-950/40 hover:bg-sky-900/60 border border-sky-800/60 text-sky-300 text-[11px] font-medium transition-all cursor-pointer active:scale-95"
                  >
                    <Sparkles className="h-3 w-3 text-sky-400" />
                    <span>Six Superflare</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setActiveFx(activeFx === 'DRS_SPOTLIGHT' ? 'STABLE' : 'DRS_SPOTLIGHT');
                      audioManager.playDrsHeartbeat();
                    }}
                    className={`flex items-center gap-1.5 px-2 py-1.5 rounded-xl border text-[11px] font-medium transition-all cursor-pointer active:scale-95 ${
                      activeFx === 'DRS_SPOTLIGHT'
                        ? 'bg-amber-500/20 border-amber-400 text-amber-300'
                        : 'bg-amber-950/40 hover:bg-amber-900/60 border-amber-800/60 text-amber-300'
                    }`}
                  >
                    <Gauge className="h-3 w-3 text-amber-400" />
                    <span>DRS Spotlight</span>
                  </button>
                </div>
              </div>

              {/* Reset to Default */}
              <div className="pt-1 flex justify-between items-center text-[10px]">
                <button
                  type="button"
                  onClick={() => {
                    setManualKelvinOverride(null);
                    setManualIntensityOverride(null);
                    setActiveFx('STABLE');
                  }}
                  className="text-slate-400 hover:text-white transition-colors cursor-pointer"
                >
                  Reset Defaults
                </button>
                <span className="text-slate-500 font-mono">{stadiumName}</span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// =============================================================================
// SUBCOMPONENT: FLOODLIGHT TOWER
// =============================================================================

interface FloodlightTowerProps {
  position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  lampColor: string;
  beamColor: string;
  power: number;
  flicker: number;
  activeFx: LightingFxState;
  beamAngle: number;
}

const FloodlightTower: React.FC<FloodlightTowerProps> = ({
  position,
  lampColor,
  beamColor,
  power,
  flicker,
  activeFx,
  beamAngle,
}) => {
  const isTop = position.startsWith('top');
  const isLeft = position.endsWith('left');

  // Position coordinates in container
  const positionClasses = {
    'top-left': 'top-2 left-4',
    'top-right': 'top-2 right-4',
    'bottom-left': 'bottom-2 left-4',
    'bottom-right': 'bottom-2 right-4',
  }[position];

  const effectiveAlpha = Math.min(1.0, Math.max(0.05, (power / 100) * flicker));
  const isWicketFlicker = activeFx === 'WICKET_FLICKER';
  const isBoundaryPulse = activeFx === 'BOUNDARY_PULSE';

  return (
    <div
      className={`absolute ${positionClasses} pointer-events-none select-none z-20 flex flex-col items-center`}
      style={{
        opacity: effectiveAlpha,
        transition: isWicketFlicker ? 'none' : 'opacity 0.4s ease-out, filter 0.4s ease-out',
      }}
    >
      {/* 1. Volumetric Light Cone projecting onto the ground */}
      <div
        className="absolute pointer-events-none"
        style={{
          width: '280px',
          height: '280px',
          top: isTop ? '-20px' : '-220px',
          left: isLeft ? '-20px' : '-220px',
          background: `radial-gradient(ellipse at ${isLeft ? '20%' : '80%'} ${
            isTop ? '20%' : '80%'
          }, ${beamColor} 0%, rgba(0,0,0,0) 72%)`,
          filter: 'blur(28px)',
          transform: `rotate(${beamAngle}deg)`,
          opacity: effectiveAlpha * (power > 25 ? 0.95 : 0.4),
        }}
      />

      {/* 2. Boundary pulse emerald wave */}
      {isBoundaryPulse && (
        <div
          className="absolute -inset-4 rounded-full pointer-events-none animate-ping"
          style={{
            background: 'radial-gradient(circle, rgba(16, 185, 129, 0.45) 0%, rgba(0,0,0,0) 70%)',
          }}
        />
      )}

      {/* 3. Volumetric Lens Flare Halo */}
      <div
        className="absolute rounded-full pointer-events-none"
        style={{
          width: '72px',
          height: '72px',
          top: '-24px',
          left: '-24px',
          background: `radial-gradient(circle, ${lampColor} 0%, rgba(255,255,255,0.4) 30%, rgba(0,0,0,0) 75%)`,
          filter: 'blur(8px)',
          opacity: effectiveAlpha * 0.85,
        }}
      />

      {/* 4. Physical Floodlight Matrix Head (4x3 LED Projector Array) */}
      <div
        className="relative z-10 p-1 rounded-md bg-slate-950/95 border border-slate-700/80 shadow-[0_4px_20px_rgba(0,0,0,0.9)]"
        style={{
          boxShadow: `0 0 25px ${lampColor}`,
        }}
      >
        <div className="grid grid-cols-4 gap-0.5">
          {Array.from({ length: 12 }).map((_, i) => (
            <div
              key={i}
              className="w-1.5 h-1.5 rounded-full transition-colors duration-100"
              style={{
                backgroundColor: lampColor,
                boxShadow: `0 0 6px ${lampColor}`,
                opacity: effectiveAlpha,
              }}
            />
          ))}
        </div>
      </div>

      {/* 5. Steel Lattice Truss Mast Gantry */}
      <div className="w-1 h-7 bg-gradient-to-b from-slate-600 via-slate-800 to-slate-900 border-x border-slate-600/50 relative overflow-hidden">
        {/* Lattice Crossbraces */}
        <div className="absolute inset-0 opacity-40 bg-[linear-gradient(45deg,#fff_25%,transparent_25%),linear-gradient(-45deg,#fff_25%,transparent_25%)] bg-[size:4px_4px]" />
      </div>

      {/* 6. Concrete Foundation Block */}
      <div className="w-3.5 h-1 rounded-t-sm bg-slate-800 border-t border-slate-600/60 shadow-sm" />
    </div>
  );
};
