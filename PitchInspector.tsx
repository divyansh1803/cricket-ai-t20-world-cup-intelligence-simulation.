import React, { useState, useEffect, useRef } from 'react';
import {
  Compass,
  Sparkles,
  Droplets,
  Wind,
  Layers,
  Thermometer,
  Shield,
  Activity,
  ChevronRight,
  TrendingUp,
  MapPin,
  CheckCircle2,
  Gauge,
  Flame,
  Clock,
  Volume2,
  Play,
  Pause,
  Zap,
} from 'lucide-react';
import { VenueConditionsRadar } from './VenueConditionsRadar';
import { PitchIntelligenceView } from './PitchIntelligenceView';
import { BroadcastBallTrackingCanvas } from '../simulator/BroadcastBallTrackingCanvas';
import { BroadcastUltraEdgeCanvas } from '../simulator/BroadcastUltraEdgeCanvas';
import { VenueAdvancedFeatures } from './VenueAdvancedFeatures';
import { PitchWearForecast } from './PitchWearForecast';
import { VenuePhysicsParameters } from './VenuePhysicsParameters';
import { VenueBallPhysicsHub } from './VenueBallPhysicsHub';
import { SurfaceArOverlayModal } from './SurfaceArOverlayModal';
import { Camera } from 'lucide-react';
import { cricketAudio } from '../../utils/audioSystem';
import { triggerHaptic, HAPTIC_PATTERNS } from '../../utils/haptics';

interface PitchInspectorProps {
  stadiumName?: string;
  onApplyConditions?: (conditions: {
    pitchWear: number;
    grassCoverage: number;
    crackDensity: number;
    dewLevel: number;
    humidity: number;
    swingDeg: number;
    turnDeg: number;
    seamDeg: number;
    projectedPar: number;
    soilType?: string;
  }) => void;
}

interface SoilPreset {
  id: string;
  name: string;
  stadiumExample: string;
  color: string;
  borderColor: string;
  bgGradient: string;
  clayContent: string;
  drainageRate: string;
  bounceProfile: string;
  wear: number;
  grass: number;
  cracks: number;
  dew: number;
  humidity: number;
  description: string;
}

const SOIL_PRESETS: SoilPreset[] = [
  {
    id: 'hard-and-bouncy',
    name: 'Hard and Bouncy',
    stadiumExample: 'High Surface Hardness Profile',
    color: '#38bdf8',
    borderColor: 'border-sky-500/40',
    bgGradient: 'from-sky-950/40 via-slate-950 to-slate-950',
    clayContent: '72% Compacted Bulli Clay & Silica Sand',
    drainageRate: 'High Capacity Subterranean Vacuum',
    bounceProfile: 'Fierce Carry, Head-High Bouncers & Searing Pace',
    wear: 15,
    grass: 65,
    cracks: 10,
    dew: 15,
    humidity: 45,
    description: 'Rock-solid clay compaction provides highest bounce elasticity and pace carry. 145+ km/h pacers carry through to keeper at shoulder height.',
  },
  {
    id: 'dry-and-dusty',
    name: 'Dry and Dusty',
    stadiumExample: 'Low Moisture Surface Profile',
    color: '#a855f7',
    borderColor: 'border-purple-500/40',
    bgGradient: 'from-purple-950/40 via-slate-950 to-slate-950',
    clayContent: '85% Montmorillonite Heavy Soil',
    drainageRate: 'Moderate Clay Percolation',
    bounceProfile: 'Low Gripping Bounce & Severe Spin Deviations',
    wear: 75,
    grass: 15,
    cracks: 70,
    dew: 20,
    humidity: 40,
    description: 'Baked surface crust with extensive fissuring. High surface friction provides sharp grip and turn up to 4.5° off the footmarks.',
  },
  {
    id: 'grass-covered',
    name: 'Grass-Covered',
    stadiumExample: 'High Foliage Foliage Profile',
    color: '#10b981',
    borderColor: 'border-emerald-500/40',
    bgGradient: 'from-emerald-950/40 via-slate-950 to-slate-950',
    clayContent: '60% Loam & Dense Perennial Root Mesh',
    drainageRate: 'Natural Aeration Drainage',
    bounceProfile: 'Steep Spongy Bounce & Lateral Seam Movement',
    wear: 20,
    grass: 85,
    cracks: 12,
    dew: 40,
    humidity: 78,
    description: 'Dense live grass binding (8-10mm) exaggerates seam movement and late aerial swing while maintaining consistent steep carry.',
  },
  {
    id: 'moisture-retaining',
    name: 'Moisture-Retaining',
    stadiumExample: 'Heavy Subsurface Soil Profile',
    color: '#ef4444',
    borderColor: 'border-rose-500/40',
    bgGradient: 'from-rose-950/40 via-slate-950 to-slate-950',
    clayContent: '78% High Silt & Kaolinite',
    drainageRate: 'Controlled Subsurface Retention',
    bounceProfile: 'Two-Paced Holding Bounce & Heavy Evening Skid',
    wear: 35,
    grass: 45,
    cracks: 22,
    dew: 70,
    humidity: 82,
    description: 'High retained moisture causes ball to hold in surface during early overs, turning into a slick skid surface under evening dew.',
  },
  {
    id: 'balanced',
    name: 'Balanced Sporting Deck',
    stadiumExample: 'Equal Contest Sporting Profile',
    color: '#eab308',
    borderColor: 'border-amber-500/40',
    bgGradient: 'from-amber-950/40 via-slate-950 to-slate-950',
    clayContent: '68% Balanced Silt-Clay Matrix',
    drainageRate: 'Engineered Porous Base',
    bounceProfile: 'Even Pace, Consistent Bounce & Equal Contest',
    wear: 30,
    grass: 55,
    cracks: 18,
    dew: 35,
    humidity: 55,
    description: 'Moderate hardness and uniform grass binding. Delivers true carry, predictable bounce, and rewards disciplined bowling and stroke-play.',
  },
  {
    id: 'drop-in',
    name: 'Modular Drop-In Turf',
    stadiumExample: 'Engineered Modular Tray Profile',
    color: '#06b6d4',
    borderColor: 'border-cyan-500/40',
    bgGradient: 'from-cyan-950/40 via-slate-950 to-slate-950',
    clayContent: '70% Athelstone Loam in Steel Tray',
    drainageRate: 'Advanced Porous Geotextile Mesh',
    bounceProfile: 'Pristine Uniform Bounce & True Pace',
    wear: 25,
    grass: 70,
    cracks: 15,
    dew: 30,
    humidity: 50,
    description: 'Nurtured in external nurseries and craned into position. Provides uniform pace, true carry, and highly predictable wear progression.',
  },
];

export const PitchInspector: React.FC<PitchInspectorProps> = ({
  stadiumName = 'Narendra Modi Stadium, Ahmedabad',
  onApplyConditions,
}) => {
  // Active Soil Preset
  const [selectedSoilId, setSelectedSoilId] = useState<string>('hard-and-bouncy');

  // Micro-condition sliders
  const [pitchWear, setPitchWear] = useState<number>(35);
  const [grassCoverage, setGrassCoverage] = useState<number>(50);
  const [crackDensity, setCrackDensity] = useState<number>(20);
  const [dewLevel, setDewLevel] = useState<number>(65);
  const [humidity, setHumidity] = useState<number>(74);

  // Inspector Sub-views
  const [activeTab, setActiveTab] = useState<
    'arena-ball-physics' | 'venue-features' | 'wear-forecast' | 'physics-params' | 'atmospheric' | 'conditions' | 'physics' | 'subsurface' | 'boundaries' | 'bounce-sim'
  >('arena-ball-physics');

  // Surface AR Overlay modal state
  const [showArModal, setShowArModal] = useState<boolean>(false);

  // Interactive Bounce Simulator & Soundboard Animation State
  const [simLength, setSimLength] = useState<'Full' | 'Good Length' | 'Back of Length' | 'Bouncer'>('Good Length');
  const [simPaceKmh, setSimPaceKmh] = useState<number>(142);
  const [hawkeyeMode, setHawkeyeMode] = useState<'tracking' | 'ultraedge' | 'profile'>('tracking');
  const [hawkeyeIsOut, setHawkeyeIsOut] = useState<boolean>(true);
  const [ultraEdgeHasSpike, setUltraEdgeHasSpike] = useState<boolean>(true);

  const [stripAnimKey, setStripAnimKey] = useState<number>(1);
  const [arcAnimKey, setArcAnimKey] = useState<number>(1);
  const [isRollingPitch, setIsRollingPitch] = useState<boolean>(false);
  const [keyProbeActive, setKeyProbeActive] = useState<boolean>(false);
  const [windGustBoost, setWindGustBoost] = useState<boolean>(false);
  const [soundLabStatus, setSoundLabStatus] = useState<string | null>(null);
  const [showSpinComparisonArc, setShowSpinComparisonArc] = useState<boolean>(true);
  const [isAutoCyclingLengths, setIsAutoCyclingLengths] = useState<boolean>(false);

  const soundStatusTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (soundStatusTimerRef.current) {
        clearTimeout(soundStatusTimerRef.current);
      }
    };
  }, []);

  const flashSoundLabStatus = (label: string) => {
    setSoundLabStatus(label);
    if (soundStatusTimerRef.current) {
      clearTimeout(soundStatusTimerRef.current);
    }
    soundStatusTimerRef.current = setTimeout(() => {
      setSoundLabStatus(null);
    }, 2400);
  };

  // Real-time Physics Calculations
  const swingDeg = Number(((humidity / 100) * 1.8 + (grassCoverage / 100) * 1.2 + 0.4).toFixed(1));
  const seamDeg = Number(((grassCoverage / 100) * 1.9 + (1 - pitchWear / 100) * 0.7 + 0.2).toFixed(1));
  const turnDeg = Math.max(
    0.8,
    Number(((pitchWear / 100) * 3.4 + (crackDensity / 100) * 1.8 - (dewLevel / 100) * 1.6 + 1.2).toFixed(1))
  );

  const paceBounceRating = Math.round(
    92 - pitchWear * 0.3 - dewLevel * 0.15 + grassCoverage * 0.2
  );

  const simulatedHardnessScore = Math.max(
    18,
    Math.min(
      98,
      Math.round(90 - dewLevel * 0.42 - pitchWear * 0.18 + (100 - crackDensity) * 0.12)
    )
  );

  const currentSurfaceTrait: 'damp' | 'dry' | 'grassy' | 'cracked' =
    dewLevel >= 58
      ? 'damp'
      : crackDensity >= 52
      ? 'cracked'
      : pitchWear >= 55
      ? 'dry'
      : 'grassy';

  const basePar = 175;
  const dewBoost = (dewLevel / 100) * 18;
  const bowlerPenalty = grassCoverage * 0.12 + crackDensity * 0.14 + pitchWear * 0.1;
  const projectedPar = Math.round(basePar + dewBoost - bowlerPenalty);

  // Apply Preset with calibrated Key-Tap Surface Hardness Sound
  const handleSelectSoil = (preset: SoilPreset) => {
    setSelectedSoilId(preset.id);
    setPitchWear(preset.wear);
    setGrassCoverage(preset.grass);
    setCrackDensity(preset.cracks);
    setDewLevel(preset.dew);
    setHumidity(preset.humidity);
    setStripAnimKey((k) => k + 1);
    setArcAnimKey((k) => k + 1);

    const presetHardness = Math.max(
      20,
      Math.min(96, Math.round(90 - preset.dew * 0.42 - preset.wear * 0.18 + (100 - preset.cracks) * 0.12))
    );
    cricketAudio.playPitchKeyTest(presetHardness, { forceUnmute: true });
    flashSoundLabStatus(`${preset.name}: Key-Tap ${presetHardness}/100 Hardness`);
  };

  const getPitchRecommendation = () => {
    if (grassCoverage > 70 && dewLevel < 40) {
      return {
        type: 'Green Seamer · High Pace & Seam Movement',
        tactic: 'Win toss & BOWL FIRST. Target good length corridor with new ball. Batters must play close to body.',
        badgeColor: 'text-emerald-400 border-emerald-500/40 bg-emerald-500/10',
      };
    }
    if (pitchWear > 60 || crackDensity > 55) {
      return {
        type: 'Dry Raging Turner · Gripping Surface',
        tactic: 'Win toss & BAT FIRST before pitch deteriorates. Employ twin spinners from over 4 onwards.',
        badgeColor: 'text-amber-400 border-amber-500/40 bg-amber-500/10',
      };
    }
    if (dewLevel > 60) {
      return {
        type: 'Dew-Heavy Skidder · Chaser’s Paradise',
        tactic: 'Bowl cross-seam & wide yorkers. Chasing team has +14% statistical advantage due to wet ball slip.',
        badgeColor: 'text-sky-400 border-sky-500/40 bg-sky-500/10',
      };
    }
    return {
      type: 'True Sporting Deck · Balanced Contest',
      tactic: 'True bounce rewards clean stroke play. Fast bowlers must rely on change of pace in middle overs.',
      badgeColor: 'text-indigo-400 border-indigo-500/40 bg-indigo-500/10',
    };
  };

  const rec = getPitchRecommendation();
  const currentSoil = SOIL_PRESETS.find((p) => p.id === selectedSoilId) || SOIL_PRESETS[0];

  // Bounce Height Simulator Data
  const getSimBounceHeight = () => {
    const baseH = simLength === 'Full' ? 0.45 : simLength === 'Good Length' ? 1.05 : simLength === 'Back of Length' ? 1.55 : 2.15;
    const paceFactor = (simPaceKmh - 120) * 0.008;
    const turfFactor = (paceBounceRating - 70) * 0.005;
    return Number((baseH + paceFactor + turfFactor).toFixed(2));
  };
  const simBounceHeight = getSimBounceHeight();

  // Auto-cycle through Pitch Lengths in 22-Yard Vertical Arc cinema mode
  useEffect(() => {
    if (!isAutoCyclingLengths) return;
    const sequence: Array<'Full' | 'Good Length' | 'Back of Length' | 'Bouncer'> = [
      'Full',
      'Good Length',
      'Back of Length',
      'Bouncer',
    ];
    let step = 0;

    const triggerStep = (len: 'Full' | 'Good Length' | 'Back of Length' | 'Bouncer') => {
      setSimLength(len);
      setArcAnimKey((k) => k + 1);
      const estH =
        (len === 'Full' ? 0.45 : len === 'Good Length' ? 1.05 : len === 'Back of Length' ? 1.55 : 2.15) +
        (simPaceKmh - 120) * 0.008 +
        (paceBounceRating - 70) * 0.005;
      cricketAudio.playFullDeliverySequence({
        category: 'seam',
        surfaceTrait: currentSurfaceTrait,
        outcome: estH <= 0.71 ? 'W' : '0',
        speedKmh: simPaceKmh,
        forceUnmute: true,
      });
      flashSoundLabStatus(
        `${len} (${simPaceKmh} km/h): ${estH.toFixed(2)}m ${estH <= 0.71 ? '· Stumps Shattered!' : '· Keeper Carry'}`
      );
    };

    triggerStep(sequence[0]);
    step = 1;

    const timer = setInterval(() => {
      if (step >= sequence.length) {
        setIsAutoCyclingLengths(false);
        clearInterval(timer);
        return;
      }
      triggerStep(sequence[step]);
      step += 1;
    }, 1550);

    return () => clearInterval(timer);
  }, [isAutoCyclingLengths, simPaceKmh, paceBounceRating, currentSurfaceTrait]);

  const handleKeyTapTest = () => {
    setKeyProbeActive(true);
    setStripAnimKey((k) => k + 1);
    cricketAudio.playPitchKeyTest(simulatedHardnessScore, { forceUnmute: true });
    const mpa = (1.2 + (simulatedHardnessScore / 100) * 3.1).toFixed(1);
    const tier =
      simulatedHardnessScore >= 72
        ? 'Rock-Hard Metallic Ring'
        : simulatedHardnessScore >= 48
        ? 'Sporting Firm Knock'
        : 'Soft / Crumbling Plug';
    flashSoundLabStatus(`Key-Tap Test: ${simulatedHardnessScore}/100 (${mpa} MPa · ${tier})`);
    setTimeout(() => setKeyProbeActive(false), 850);
  };

  const handleHeavyRollerPass = () => {
    setIsRollingPitch(true);
    setCrackDensity((prev) => Math.max(4, prev - 10));
    setPitchWear((prev) => Math.max(6, prev - 6));
    setStripAnimKey((k) => k + 1);
    cricketAudio.playSoilRollerSound('heavy_roller', { forceUnmute: true });
    flashSoundLabStatus('Heavy Iron Roller Pass: Surface fissures compacted (-10% cracks)');
    setTimeout(() => setIsRollingPitch(false), 1200);
  };

  const handleSweepPitchBroom = () => {
    setPitchWear((prev) => Math.max(5, prev - 5));
    setStripAnimKey((k) => k + 1);
    cricketAudio.playSoilRollerSound('sweep_broom', { forceUnmute: true });
    flashSoundLabStatus('Groundsman Broom Sweep: Loose topsoil dust cleared (-5% wear)');
  };

  const handleWindGust = () => {
    setWindGustBoost(true);
    const gustKmh = Math.round(24 + humidity * 0.22);
    cricketAudio.playWindGustSound(gustKmh, { forceUnmute: true });
    flashSoundLabStatus(`Crosswind Gust (${gustKmh} km/h): Aerial swing +${swingDeg}° active`);
    setTimeout(() => setWindGustBoost(false), 1500);
  };

  const handleLaunchTestDelivery = (category: 'seam' | 'spin') => {
    setStripAnimKey((k) => k + 1);
    setArcAnimKey((k) => k + 1);
    const hitsStumps = category === 'seam' ? simBounceHeight <= 0.71 : turnDeg >= 2.6;
    cricketAudio.playFullDeliverySequence({
      category,
      surfaceTrait: currentSurfaceTrait,
      outcome: hitsStumps ? 'W' : '4',
      speedKmh: category === 'seam' ? simPaceKmh : 91,
      forceUnmute: true,
    });
    flashSoundLabStatus(
      category === 'seam'
        ? `Pace Test (${simPaceKmh} km/h): ${swingDeg}° Swing · ${seamDeg}° Seam`
        : `Spin Test (91 km/h): ${turnDeg}° Sharp Turn off ${currentSoil.name}`
    );
  };

  const handleApply = () => {
    cricketAudio.playRadarSweepPing({ forceUnmute: true });
    if (onApplyConditions) {
      onApplyConditions({
        pitchWear,
        grassCoverage,
        crackDensity,
        dewLevel,
        humidity,
        swingDeg,
        turnDeg,
        seamDeg,
        projectedPar,
        soilType: currentSoil.name,
      });
    }
  };

  return (
    <div className="rounded-3xl border border-cyan-500/30 bg-gradient-to-b from-[#020617] via-[#040f2b] to-[#020617] p-6 sm:p-7 space-y-6 backdrop-blur-2xl shadow-[0_20px_50px_rgba(0,0,0,0.8),0_0_40px_rgba(6,182,212,0.15)] text-slate-100 overflow-hidden">
      {/* 1. Header with Telemetry */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 border-b border-cyan-500/20 pb-5">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs font-mono text-cyan-400 font-bold tracking-wider">
            <Compass className="h-4 w-4 shrink-0" />
            <span>22-YARD PITCH PHYSICS INSPECTOR</span>
            {stadiumName && (
              <>
                <span className="text-slate-600">·</span>
                <span className="text-slate-300 inline-flex items-center gap-1 font-semibold">
                  <MapPin className="h-3.5 w-3.5 text-cyan-400 shrink-0" />
                  <span>{stadiumName}</span>
                </span>
              </>
            )}
          </div>
          <h3 className="text-xl sm:text-2xl font-black text-white tracking-tight mt-1">
            Surface Material Science & Stadium Atmospheric Dynamics
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            Analyze soil chemistry, subterranean moisture retention, boundary wind telemetry, and ball trajectory physics.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 items-stretch gap-2.5 shrink-0">
          <button
            type="button"
            onClick={() => {
              setShowArModal(true);
              cricketAudio.playBatHit();
              triggerHaptic(HAPTIC_PATTERNS.TAP);
            }}
            className="flex items-center justify-center gap-2 rounded-xl border border-cyan-400/60 bg-cyan-950/50 px-4 py-2.5 text-xs font-mono font-bold text-cyan-200 hover:bg-cyan-500/25 transition-colors cursor-pointer whitespace-nowrap"
            title="Launch Augmented Reality Pitch Cam"
          >
            <Camera className="h-4 w-4 text-cyan-300 shrink-0" />
            <span>Surface AR Cam</span>
          </button>
          <div className="rounded-xl border border-cyan-500/30 bg-slate-900/80 px-4 py-2 text-xs font-mono flex flex-col justify-center">
            <span className="text-[10px] text-cyan-300 block font-bold">PROJECTED PAR T20</span>
            <span className="text-base font-black text-cyan-200 tabular-nums">{projectedPar} RUNS</span>
          </div>
          <div className="rounded-xl border border-emerald-500/30 bg-slate-900/80 px-4 py-2 text-xs font-mono flex flex-col justify-center">
            <span className="text-[10px] text-emerald-300 block font-bold">PACE & CARRY</span>
            <span className="text-base font-black text-emerald-200 tabular-nums">{paceBounceRating}/100</span>
          </div>
        </div>
      </div>

      {/* 2. Soil Preset Grid (All 6 Geologies Aligned in Symmetrical Columns) */}
      <div className="space-y-2.5">
        <label className="text-xs font-mono font-bold text-slate-300 tracking-wider flex items-center gap-1.5">
          <Layers className="h-3.5 w-3.5 text-cyan-400 shrink-0" />
          <span>Official Soil Composition Preset</span>
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3 items-stretch">
          {SOIL_PRESETS.map((preset) => {
            const isSelected = selectedSoilId === preset.id;
            return (
              <button
                key={preset.id}
                type="button"
                onClick={() => handleSelectSoil(preset)}
                className={`h-full flex flex-col justify-between rounded-xl p-3.5 text-left transition-colors cursor-pointer border ${
                  isSelected
                    ? 'border-cyan-400 bg-cyan-950/50'
                    : 'border-slate-800 bg-slate-900/60 hover:border-slate-700 hover:bg-slate-900'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-1.5 min-h-[18px]">
                    <span
                      className="h-2.5 w-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: preset.color }}
                    />
                    {isSelected && (
                      <span className="text-[9px] font-mono text-cyan-300 font-bold">
                        ACTIVE
                      </span>
                    )}
                  </div>
                  <h4 className="text-xs font-black text-white truncate">{preset.name}</h4>
                  <p className="text-[10px] text-slate-400 truncate mt-0.5">{preset.stadiumExample}</p>
                </div>
                <div className="mt-2.5 pt-2 border-t border-slate-800/80 text-[10px] font-mono font-semibold tabular-nums" style={{ color: preset.color }}>
                  {preset.clayContent.split(' ')[0]} Clay
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2B. Interactive Broadcast Pitch Sound & Physics Playground Bar */}
      <div className="rounded-2xl border border-slate-800 bg-slate-950/90 p-3.5 space-y-2.5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-2.5">
          <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
            <Volume2 className="h-4 w-4 text-cyan-400 shrink-0" />
            <span className="font-bold text-white">Broadcast Stump-Mic &amp; Pitch Foley Lab</span>
            <span className="text-slate-600">·</span>
            <span className="text-[11px] text-slate-400 tabular-nums">
              Simulated Hardness: <strong className="text-cyan-300">{simulatedHardnessScore}/100</strong>
            </span>
            {soundLabStatus && (
              <span className="inline-flex items-center gap-1.5 rounded-lg border border-cyan-500/40 bg-cyan-950/50 px-2.5 py-1 text-[11px] font-bold text-cyan-200 tabular-nums">
                <span className="inline-flex items-end gap-0.5 h-3" aria-hidden="true">
                  <span className="w-0.5 h-2.5 bg-cyan-300 rounded-full animate-eq-bar-1" />
                  <span className="w-0.5 h-3 bg-cyan-300 rounded-full animate-eq-bar-2" />
                  <span className="w-0.5 h-2 bg-cyan-300 rounded-full animate-eq-bar-3" />
                  <span className="w-0.5 h-3 bg-cyan-300 rounded-full animate-eq-bar-4" />
                  <span className="w-0.5 h-2 bg-cyan-300 rounded-full animate-eq-bar-5" />
                </span>
                <span>{soundLabStatus}</span>
              </span>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-1.5 font-mono text-[11px]">
            <button
              type="button"
              onClick={handleKeyTapTest}
              className="h-8 px-3 rounded-lg border border-cyan-500/40 bg-cyan-950/40 text-cyan-200 hover:bg-cyan-500/20 font-bold transition-colors cursor-pointer inline-flex items-center gap-1.5 whitespace-nowrap"
              title="Perform TV broadcast metal key-tap hardness test on current soil"
            >
              <Gauge className="h-3.5 w-3.5 text-cyan-400 shrink-0" />
              <span>Key-Tap Test</span>
            </button>

            <button
              type="button"
              onClick={handleHeavyRollerPass}
              className="h-8 px-3 rounded-lg border border-amber-500/40 bg-amber-950/35 text-amber-200 hover:bg-amber-500/20 font-bold transition-colors cursor-pointer inline-flex items-center gap-1.5 whitespace-nowrap"
              title="Roll heavy iron cylinder across pitch to compact cracks and play roller rumble"
            >
              <Layers className="h-3.5 w-3.5 text-amber-400 shrink-0" />
              <span>Heavy Roller</span>
            </button>

            <button
              type="button"
              onClick={handleSweepPitchBroom}
              className="h-8 px-3 rounded-lg border border-slate-700 bg-slate-900 text-slate-200 hover:bg-slate-800 font-bold transition-colors cursor-pointer inline-flex items-center gap-1.5 whitespace-nowrap"
              title="Sweep loose pitch dust with groundsman bristle broom"
            >
              <Sparkles className="h-3.5 w-3.5 text-amber-300 shrink-0" />
              <span>Sweep Dust</span>
            </button>

            <button
              type="button"
              onClick={handleWindGust}
              className="h-8 px-3 rounded-lg border border-emerald-500/40 bg-emerald-950/35 text-emerald-200 hover:bg-emerald-500/20 font-bold transition-colors cursor-pointer inline-flex items-center gap-1.5 whitespace-nowrap"
              title="Simulate stadium crosswind gust with audio and drift vectors"
            >
              <Wind className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
              <span>Wind Gust</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTab('physics');
                handleLaunchTestDelivery('seam');
              }}
              className="h-8 px-3 rounded-lg border border-sky-400/50 bg-sky-500/20 text-sky-100 hover:bg-sky-500/30 font-bold transition-colors cursor-pointer inline-flex items-center gap-1.5 whitespace-nowrap"
              title="Bowl animated Pace delivery on 22-Yard Pitch Strip with Stump-Mic audio"
            >
              <Play className="h-3 w-3 text-sky-300 shrink-0" />
              <span>Bowl Pace</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTab('physics');
                handleLaunchTestDelivery('spin');
              }}
              className="h-8 px-3 rounded-lg border border-rose-400/50 bg-rose-500/20 text-rose-100 hover:bg-rose-500/30 font-bold transition-colors cursor-pointer inline-flex items-center gap-1.5 whitespace-nowrap"
              title="Bowl animated Spin delivery on 22-Yard Pitch Strip with Crackle audio"
            >
              <Zap className="h-3 w-3 text-rose-300 shrink-0" />
              <span>Bowl Spin</span>
            </button>
          </div>
        </div>
      </div>

      {/* 3. Section Navigation Tabs (Clean Symmetrical 2x5 Grid on Desktop) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2 border-b border-cyan-500/20 pb-4">
        {[
          { id: 'arena-ball-physics', label: '12-Arena Ball Physics', icon: Compass },
          { id: 'venue-features', label: '10+ Venue Intelligence', icon: MapPin },
          { id: 'physics-params', label: '10 Physics Parameters', icon: Gauge },
          { id: 'wear-forecast', label: '5-Day Wear Forecast', icon: Clock },
          { id: 'atmospheric', label: 'Atmospheric Gauges', icon: Gauge },
          { id: 'conditions', label: 'Conditions Radar', icon: Activity },
          { id: 'physics', label: '22-Yard Pitch Strip', icon: Compass },
          { id: 'subsurface', label: '4-Layer Core Slicer', icon: Layers },
          { id: 'boundaries', label: 'Boundary & Wind Map', icon: Wind },
          { id: 'bounce-sim', label: 'Hawk-Eye & Bounce Arc', icon: Sparkles },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => {
                setActiveTab(tab.id as any);
                if (tab.id === 'bounce-sim' || tab.id === 'conditions') {
                  cricketAudio.playRadarSweepPing();
                } else if (tab.id === 'boundaries') {
                  cricketAudio.playWindGustSound(22);
                } else if (tab.id === 'physics') {
                  setStripAnimKey((k) => k + 1);
                  cricketAudio.playPitchImpactSound('seam', currentSurfaceTrait, { delaySec: 0 });
                } else {
                  cricketAudio.playUiClick();
                }
              }}
              className={`w-full flex items-center gap-2 rounded-xl px-3 py-2.5 text-xs font-mono font-bold transition-colors cursor-pointer min-w-0 ${
                isActive
                  ? 'bg-cyan-500 text-slate-950 font-black'
                  : 'bg-slate-900/50 text-slate-300 hover:text-white hover:bg-slate-900 border border-slate-800/80'
              }`}
            >
              <Icon className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* =========================================================================
          TAB: 12-ARENA VENUE INTELLIGENCE & BALL PHYSICS ENGINE
          ========================================================================= */}
      {activeTab === 'arena-ball-physics' && (
        <div className="animate-in fade-in duration-300">
          <VenueBallPhysicsHub
            onApplyToSimulator={(payload) => {
              if (onApplyConditions) {
                onApplyConditions({
                  pitchWear,
                  grassCoverage,
                  crackDensity,
                  dewLevel,
                  humidity: payload.humidityPct,
                  swingDeg: payload.swingDeg,
                  turnDeg: payload.turnDeg,
                  seamDeg,
                  projectedPar: payload.projectedPar,
                  soilType: currentSoil.name,
                });
              }
            }}
          />
        </div>
      )}

      {/* =========================================================================
          TAB: 48-HOUR PITCH WEAR & 5-DAY MATCH FORECAST
          ========================================================================= */}
      {activeTab === 'wear-forecast' && (
        <div className="animate-in fade-in duration-300">
          <PitchWearForecast
            stadiumName={stadiumName || currentSoil.stadiumExample}
            initialDay={1}
            temperature={30}
            humidity={dewLevel > 30 ? dewLevel : 65}
          />
        </div>
      )}

      {/* =========================================================================
          TAB: 10+ STADIUM VENUE INTELLIGENCE SUITE
          ========================================================================= */}
      {activeTab === 'venue-features' && (
        <div className="animate-in fade-in duration-300">
          <VenueAdvancedFeatures />
        </div>
      )}

      {/* =========================================================================
          TAB: 10 INTERACTIVE PHYSICS PARAMETERS & VENUE COMPARISON MATRIX
          ========================================================================= */}
      {activeTab === 'physics-params' && (
        <div className="animate-in fade-in duration-300">
          <VenuePhysicsParameters />
        </div>
      )}

      {/* =========================================================================
          TAB: ATMOSPHERIC INTELLIGENCE & SWING-SPIN RADIAL GAUGE
          ========================================================================= */}
      {activeTab === 'atmospheric' && (
        <div className="space-y-6 animate-in fade-in duration-300">
          <PitchIntelligenceView
            stadiumName={stadiumName || currentSoil.stadiumExample}
            initialHumidity={humidity}
            initialPitchWear={pitchWear}
            initialGrassCoverage={grassCoverage}
            initialDewLevel={dewLevel}
            onApplyConditions={(data) => {
              if (onApplyConditions) {
                onApplyConditions({
                  pitchWear,
                  grassCoverage,
                  crackDensity,
                  dewLevel,
                  humidity,
                  swingDeg,
                  turnDeg,
                  seamDeg,
                  projectedPar: data.projectedPar,
                  soilType: currentSoil.name,
                });
              }
            }}
          />
        </div>
      )}

      {/* =========================================================================
          TAB 0: INTERACTIVE HIGH-TECH RADAR CONDITIONS PANEL
          ========================================================================= */}
      {activeTab === 'conditions' && (
        <div className="space-y-6 animate-in fade-in duration-300">
          <VenueConditionsRadar
            stadiumName={stadiumName || currentSoil.stadiumExample}
            initialHumidity={humidity}
            initialWindSpeed={54}
            initialDewLevel={dewLevel}
            initialPitchWear={pitchWear}
            initialGrassCoverage={grassCoverage}
          />
        </div>
      )}

      {/* =========================================================================
          TAB 1: 22-YARD PITCH STRIP & MICRO CONDITIONS
          ========================================================================= */}
      {activeTab === 'physics' && (
        <div className="space-y-6 animate-in fade-in duration-300">
          {/* Active Soil Dossier Card */}
          <div className="rounded-2xl border border-cyan-500/30 bg-gradient-to-r from-slate-950 via-[#03112c] to-slate-950 p-4 sm:p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="space-y-1 max-w-xl">
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-bold text-cyan-400 uppercase">
                  ACTIVE SOIL DYNAMICS · {currentSoil.name}
                </span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed font-sans">
                {currentSoil.description}
              </p>
              <div className="flex flex-wrap gap-3 text-[11px] font-mono text-slate-400 pt-1">
                <span>Clay: <strong className="text-white">{currentSoil.clayContent}</strong></span>
                <span>·</span>
                <span>Drainage: <strong className="text-emerald-400">{currentSoil.drainageRate}</strong></span>
                <span>·</span>
                <span>Bounce Profile: <strong className="text-cyan-300">{currentSoil.bounceProfile}</strong></span>
              </div>
            </div>

            <div className={`rounded-xl border px-3.5 py-2 text-xs font-mono font-bold shrink-0 ${rec.badgeColor}`}>
              <span>{rec.type}</span>
            </div>
          </div>

          {/* 22-Yard Interactive Animated Dual-Trajectory Pitch Strip */}
          <div className="relative rounded-2xl border border-cyan-500/30 bg-slate-950 p-5 overflow-hidden">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 mb-3 text-xs font-mono">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-bold text-white">
                  22-Yard Dual-Trajectory Surface Arena (Simulated)
                </span>
                <span className="text-slate-600">·</span>
                <span className="text-sky-300 tabular-nums">Swing {swingDeg}° / Seam {seamDeg}°</span>
                <span className="text-slate-600">·</span>
                <span className="text-amber-300 tabular-nums">Spin Turn {turnDeg}°</span>
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => handleLaunchTestDelivery('seam')}
                  className="h-7 px-2.5 rounded-lg border border-sky-500/40 bg-sky-950/40 text-[11px] font-bold text-sky-200 hover:bg-sky-500/20 cursor-pointer inline-flex items-center gap-1 whitespace-nowrap"
                >
                  <Play className="h-3 w-3 text-sky-400 shrink-0" />
                  <span>Replay Seam</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleLaunchTestDelivery('spin')}
                  className="h-7 px-2.5 rounded-lg border border-amber-500/40 bg-amber-950/40 text-[11px] font-bold text-amber-200 hover:bg-amber-500/20 cursor-pointer inline-flex items-center gap-1 whitespace-nowrap"
                >
                  <Play className="h-3 w-3 text-amber-400 shrink-0" />
                  <span>Replay Spin</span>
                </button>
                <button
                  type="button"
                  onClick={handleKeyTapTest}
                  className="h-7 px-2.5 rounded-lg border border-cyan-500/40 bg-cyan-950/40 text-[11px] font-bold text-cyan-200 hover:bg-cyan-500/20 cursor-pointer inline-flex items-center gap-1 whitespace-nowrap"
                >
                  <Gauge className="h-3 w-3 text-cyan-400 shrink-0" />
                  <span>Tap Surface</span>
                </button>
              </div>
            </div>

            {(() => {
              const clayFill =
                dewLevel >= 58
                  ? '#4a2916'
                  : grassCoverage >= 60
                  ? '#214226'
                  : pitchWear >= 55
                  ? '#8a582c'
                  : '#6d411d';

              const seamBounceX = Math.round(375 - grassCoverage * 0.35);
              const seamBounceY = Math.round(92 - swingDeg * 4);
              const seamEndY = Math.max(58, Math.min(168, Math.round(seamBounceY + seamDeg * 14)));
              const seamFullPath = `M 92 84 Q 235 ${Math.round(70 - swingDeg * 8)} ${seamBounceX} ${seamBounceY} L 592 ${seamEndY}`;

              const spinBounceX = Math.round(420 + pitchWear * 0.25);
              const spinBounceY = Math.round(148 + turnDeg * 2.5);
              const spinEndY = Math.max(66, Math.min(176, Math.round(spinBounceY - turnDeg * 13)));
              const spinFullPath = `M 92 152 Q 258 168 ${spinBounceX} ${spinBounceY} L 592 ${spinEndY}`;

              return (
                <div className="rounded-xl border border-slate-800 bg-[#03150e] p-2 overflow-hidden">
                  <svg
                    viewBox="0 0 680 232"
                    className="w-full h-auto block select-none"
                    role="img"
                    aria-label="Interactive 22-Yard Top-Down Pitch Physics Strip"
                  >
                    <defs>
                      <pattern
                        id="inspectorGrassBlades"
                        width="16"
                        height="16"
                        patternUnits="userSpaceOnUse"
                      >
                        <path
                          d="M 3 13 L 5 7 M 11 14 L 10 8 M 14 5 L 15 1"
                          stroke="#22c55e"
                          strokeWidth="1"
                          strokeLinecap="round"
                        />
                      </pattern>
                      <radialGradient id="inspectorDewGlow" cx="50%" cy="50%" r="55%">
                        <stop offset="0%" stopColor="#0ea5e9" stopOpacity="0.48" />
                        <stop offset="100%" stopColor="#0ea5e9" stopOpacity="0" />
                      </radialGradient>
                    </defs>

                    {/* Turf Outfield Apron */}
                    <rect x="0" y="0" width="680" height="232" rx="10" fill="#042215" />

                    {/* 22-Yard Clay Strip */}
                    <rect
                      x="54"
                      y="38"
                      width="572"
                      height="156"
                      rx="6"
                      fill={clayFill}
                      stroke="#b45309"
                      strokeWidth="1.6"
                    />

                    {/* Live Grass Blade Layer */}
                    <rect
                      x="56"
                      y="40"
                      width="568"
                      height="152"
                      rx="5"
                      fill="url(#inspectorGrassBlades)"
                      opacity={Number(((grassCoverage / 100) * 0.78).toFixed(2))}
                    />

                    {/* Dew Moisture Sheen */}
                    {dewLevel > 25 && (
                      <ellipse
                        cx="340"
                        cy="116"
                        rx="240"
                        ry="68"
                        fill="url(#inspectorDewGlow)"
                        opacity={Number(((dewLevel / 100) * 0.85).toFixed(2))}
                      />
                    )}

                    {/* Surface Cracks & Spinner Footmark Rough */}
                    {crackDensity > 15 && (
                      <g opacity={Number((0.25 + (crackDensity / 100) * 0.72).toFixed(2))}>
                        <ellipse cx="438" cy="154" rx="28" ry="13" fill="#3b1806" fillOpacity="0.55" />
                        <ellipse cx="422" cy="76" rx="22" ry="11" fill="#3b1806" fillOpacity="0.45" />
                        <path
                          d="M 270 72 L 292 84 L 312 78 M 368 128 L 392 142 L 414 134 M 468 88 L 494 98"
                          stroke="#261005"
                          strokeWidth="1.4"
                          fill="none"
                        />
                      </g>
                    )}

                    {/* Popping & Return Creases */}
                    <line x1="92" y1="38" x2="92" y2="194" stroke="#ffffff" strokeOpacity="0.82" strokeWidth="2" />
                    <line x1="588" y1="38" x2="588" y2="194" stroke="#ffffff" strokeOpacity="0.88" strokeWidth="2" />
                    <line x1="54" y1="62" x2="92" y2="62" stroke="#ffffff" strokeOpacity="0.45" strokeWidth="1" />
                    <line x1="54" y1="170" x2="92" y2="170" stroke="#ffffff" strokeOpacity="0.45" strokeWidth="1" />
                    <line x1="588" y1="62" x2="626" y2="62" stroke="#ffffff" strokeOpacity="0.45" strokeWidth="1" />
                    <line x1="588" y1="170" x2="626" y2="170" stroke="#ffffff" strokeOpacity="0.45" strokeWidth="1" />

                    {/* Length Zone Guides */}
                    <line x1="250" y1="40" x2="250" y2="192" stroke="#ffffff" strokeOpacity="0.16" strokeDasharray="3 4" />
                    <text x="250" y="31" textAnchor="middle" fill="#94a3b8" fontSize="8.5" fontFamily="monospace">
                      SHORT (8m+)
                    </text>
                    <line x1="395" y1="40" x2="395" y2="192" stroke="#38bdf8" strokeOpacity="0.28" strokeDasharray="3 4" />
                    <text x="395" y="31" textAnchor="middle" fill="#7dd3fc" fontSize="8.5" fontWeight="bold" fontFamily="monospace">
                      GOOD LENGTH (4–6m)
                    </text>
                    <line x1="505" y1="40" x2="505" y2="192" stroke="#ffffff" strokeOpacity="0.16" strokeDasharray="3 4" />
                    <text x="505" y="31" textAnchor="middle" fill="#94a3b8" fontSize="8.5" fontFamily="monospace">
                      FULL / YORKER
                    </text>

                    {/* Bowler & Striker Stumps */}
                    {[108, 116, 124].map((sy) => (
                      <g key={sy}>
                        <circle cx="74" cy={sy} r="2.6" fill="#fde047" />
                        <circle cx="604" cy={sy} r="3" fill="#fde047" stroke="#ca8a04" strokeWidth="0.7" />
                      </g>
                    ))}

                    {/* Crosswind Drift Streamlines */}
                    <g opacity={windGustBoost ? 0.92 : 0.38}>
                      <path
                        d="M 120 20 Q 340 12 560 22"
                        fill="none"
                        stroke="#34d399"
                        strokeWidth={windGustBoost ? 1.8 : 1}
                        className="animate-wind-stream"
                      />
                      <path
                        d="M 140 214 Q 340 206 545 216"
                        fill="none"
                        stroke="#34d399"
                        strokeWidth={windGustBoost ? 1.8 : 1}
                        className="animate-wind-stream"
                      />
                    </g>

                    {/* Animated Pace Swing + Seam Trajectory & Spin Drift + Turn Trajectory */}
                    <g key={`strip-trajectories-${stripAnimKey}`}>
                      {/* 1) Pace Trajectory (Sky Cyan) */}
                      <path
                        d={`M 92 84 Q 235 ${Math.round(70 - swingDeg * 8)} ${seamBounceX} ${seamBounceY}`}
                        pathLength={1}
                        fill="none"
                        stroke="#38bdf8"
                        strokeWidth="2.8"
                        strokeLinecap="round"
                        className="animate-shotmap-trace"
                      />
                      <circle
                        cx={seamBounceX}
                        cy={seamBounceY}
                        r="11"
                        fill="none"
                        stroke="#38bdf8"
                        strokeWidth="2"
                        className="animate-shotmap-ripple"
                      />
                      <path
                        d={`M ${seamBounceX} ${seamBounceY} L 592 ${seamEndY}`}
                        pathLength={1}
                        fill="none"
                        stroke="#22d3ee"
                        strokeWidth="2.4"
                        strokeLinecap="round"
                        className="animate-shotmap-postbounce"
                      />
                      <g>
                        <circle r="4.8" fill="#dc2626" stroke="#ffffff" strokeWidth="1.1" />
                        <animateMotion dur="0.68s" fill="freeze" path={seamFullPath} />
                      </g>

                      {/* 2) Spin Trajectory (Warm Amber / Rose) */}
                      <path
                        d={`M 92 152 Q 258 168 ${spinBounceX} ${spinBounceY}`}
                        pathLength={1}
                        fill="none"
                        stroke="#fbbf24"
                        strokeWidth="2.6"
                        strokeLinecap="round"
                        className="animate-shotmap-trace"
                      />
                      <circle
                        cx={spinBounceX}
                        cy={spinBounceY}
                        r="11"
                        fill="none"
                        stroke="#fbbf24"
                        strokeWidth="2"
                        className="animate-shotmap-ripple"
                      />
                      <path
                        d={`M ${spinBounceX} ${spinBounceY} L 592 ${spinEndY}`}
                        pathLength={1}
                        fill="none"
                        stroke="#fb7185"
                        strokeWidth="2.3"
                        strokeLinecap="round"
                        className="animate-shotmap-postbounce"
                      />
                      <g>
                        <circle r="4.5" fill="#f59e0b" stroke="#ffffff" strokeWidth="1" />
                        <animateMotion dur="0.82s" fill="freeze" path={spinFullPath} />
                      </g>
                    </g>

                    {/* Heavy Iron Roller Sweep Overlay */}
                    {isRollingPitch && (
                      <g className="animate-roller-sweep pointer-events-none">
                        <rect
                          x="60"
                          y="34"
                          width="36"
                          height="164"
                          rx="6"
                          fill="#475569"
                          stroke="#cbd5e1"
                          strokeWidth="1.8"
                        />
                        <line x1="78" y1="34" x2="78" y2="198" stroke="#94a3b8" strokeWidth="2" strokeDasharray="5 4" />
                      </g>
                    )}

                    {/* Key-Tap Penetrometer Probe Ring */}
                    {keyProbeActive && (
                      <g className="pointer-events-none">
                        <circle
                          cx="395"
                          cy="116"
                          r="16"
                          fill="none"
                          stroke="#22d3ee"
                          strokeWidth="2.5"
                          className="animate-key-probe-ring"
                        />
                        <circle cx="395" cy="116" r="4" fill="#fde047" />
                      </g>
                    )}
                  </svg>
                </div>
              );
            })()}

            {/* Tactical Recommendation Bar */}
            <div className="mt-4 rounded-xl border border-cyan-500/20 bg-slate-950/90 p-4 space-y-1">
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                <span className="font-bold text-white flex items-center gap-2">
                  <Shield className="h-4 w-4 text-cyan-400 shrink-0" />
                  <span>Tactical Pitch Assessment: {rec.type}</span>
                </span>
                <span className="font-mono text-slate-400 tabular-nums">Pace Carry: {paceBounceRating}/100</span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed font-sans">{rec.tactic}</p>
            </div>
          </div>

          {/* Micro-Condition Sliders Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 items-stretch text-xs font-mono">
            {/* Pitch Wear */}
            <div className="flex flex-col justify-between space-y-2 rounded-2xl border border-cyan-500/20 bg-slate-950/80 p-4">
              <div className="flex items-center justify-between gap-2">
                <span className="text-slate-400 font-bold">PITCH WEAR &amp; DUST</span>
                <span className="text-white font-bold tabular-nums shrink-0">{pitchWear}% · {pitchWear > 60 ? 'Dusty' : pitchWear > 30 ? 'Abrasive' : 'Pristine'}</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={pitchWear}
                onChange={(e) => {
                  setPitchWear(Number(e.target.value));
                  cricketAudio.playSliderTick();
                }}
                className="w-full accent-amber-400 cursor-pointer"
              />
              <span className="text-[10px] text-slate-500 block">Higher wear increases spin grip, puffing dust, and variable bounce</span>
            </div>

            {/* Grass Coverage */}
            <div className="flex flex-col justify-between space-y-2 rounded-2xl border border-cyan-500/20 bg-slate-950/80 p-4">
              <div className="flex items-center justify-between gap-2">
                <span className="text-slate-400 font-bold">LIVE GRASS COVERAGE</span>
                <span className="text-white font-bold tabular-nums shrink-0">{grassCoverage}% · {grassCoverage > 65 ? 'Green' : grassCoverage > 30 ? 'Trimmed' : 'Dry Bald'}</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={grassCoverage}
                onChange={(e) => {
                  setGrassCoverage(Number(e.target.value));
                  cricketAudio.playSliderTick();
                }}
                className="w-full accent-emerald-400 cursor-pointer"
              />
              <span className="text-[10px] text-slate-500 block">Live grass sustains seam deviation and maintains true bounce through 40 overs</span>
            </div>

            {/* Crack Density */}
            <div className="flex flex-col justify-between space-y-2 rounded-2xl border border-cyan-500/20 bg-slate-950/80 p-4">
              <div className="flex items-center justify-between gap-2">
                <span className="text-slate-400 font-bold">SURFACE CRACK FISSURES</span>
                <span className="text-white font-bold tabular-nums shrink-0">{crackDensity}% · {crackDensity > 50 ? 'Deep' : crackDensity > 20 ? 'Hairline' : 'Intact'}</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={crackDensity}
                onChange={(e) => {
                  setCrackDensity(Number(e.target.value));
                  cricketAudio.playSliderTick();
                }}
                className="w-full accent-rose-400 cursor-pointer"
              />
              <span className="text-[10px] text-slate-500 block">Cracks cause sudden shooting deliveries or exaggerated sideways kicks</span>
            </div>

            {/* Dew Factor */}
            <div className="flex flex-col justify-between space-y-2 rounded-2xl border border-cyan-500/20 bg-slate-950/80 p-4">
              <div className="flex items-center justify-between gap-2">
                <span className="text-slate-400 font-bold">DEW FACTOR (2ND INN)</span>
                <span className="text-white font-bold tabular-nums shrink-0">{dewLevel}% · {dewLevel > 60 ? 'Heavy' : dewLevel > 20 ? 'Light' : 'Dry'}</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={dewLevel}
                onChange={(e) => {
                  setDewLevel(Number(e.target.value));
                  cricketAudio.playSliderTick();
                }}
                className="w-full accent-cyan-400 cursor-pointer"
              />
              <span className="text-[10px] text-slate-500 block">Wet outfield impairs bowler grip, suppresses spin, and favors chasing batters (+14% win rate)</span>
            </div>

            {/* Humidity */}
            <div className="flex flex-col justify-between space-y-2 rounded-2xl border border-cyan-500/20 bg-slate-950/80 p-4">
              <div className="flex items-center justify-between gap-2">
                <span className="text-slate-400 font-bold">AIR HUMIDITY</span>
                <span className="text-white font-bold tabular-nums shrink-0">{humidity}% · {humidity > 70 ? 'Overcast' : 'Crisp'}</span>
              </div>
              <input
                type="range"
                min="20"
                max="95"
                value={humidity}
                onChange={(e) => {
                  setHumidity(Number(e.target.value));
                  cricketAudio.playSliderTick();
                }}
                className="w-full accent-indigo-400 cursor-pointer"
              />
              <span className="text-[10px] text-slate-500 block">Dense moisture air enhances laminar boundary layer, keeping ball swinging late</span>
            </div>

            {/* Apply Action */}
            <div className="rounded-2xl border border-cyan-500/40 bg-cyan-950/30 p-4 flex flex-col justify-between">
              <div>
                <span className="text-cyan-300 font-bold block mb-1">APPLY TURF CONDITIONS</span>
                <p className="text-[11px] text-slate-300 font-sans leading-relaxed">
                  Feed these real-time surface parameters into the AI Match Simulation Engine to alter ball speed, turn, and par score.
                </p>
              </div>
              {onApplyConditions ? (
                <button
                  type="button"
                  onClick={handleApply}
                  className="mt-3 w-full rounded-xl bg-cyan-500 py-2.5 px-4 text-xs font-mono font-black text-slate-950 hover:bg-cyan-400 transition-colors cursor-pointer text-center"
                >
                  Apply Conditions to Match Engine →
                </button>
              ) : (
                <span className="mt-3 block text-[11px] font-mono text-cyan-300">
                  Live telemetry synced ({projectedPar} Par)
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 2: SUBSURFACE 4-LAYER DEPTH CORE SLICER
          ========================================================================= */}
      {activeTab === 'subsurface' && (
        <div className="space-y-6 animate-in fade-in duration-300">
          <div className="rounded-2xl border border-cyan-500/30 bg-[#02071a] p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-cyan-500/20 pb-3">
              <div>
                <h4 className="text-base font-black text-white flex items-center gap-2">
                  <Layers className="h-4 w-4 text-cyan-400" />
                  <span>Subterranean Core Strata Analysis (0mm to 300mm Depth)</span>
                </h4>
                <p className="text-xs text-slate-400">
                  Inspect the physical layers that dictate pitch firmness, water infiltration speed, and vertical rebound.
                </p>
              </div>
              <span className="text-xs font-mono text-cyan-300 bg-cyan-500/10 border border-cyan-500/30 px-3 py-1 rounded-full">
                CORE SAMPLE #14: {currentSoil.name}
              </span>
            </div>

            {/* 4-Layer Interactive Diagram (Uniform Metric Column Alignment) */}
            <div className="space-y-3 pt-2">
              {/* Layer 1: Grass Canopy & Thatch (0 - 8mm) */}
              <div className="rounded-xl border border-emerald-500/40 bg-gradient-to-r from-emerald-950/60 to-slate-950 p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1 flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full bg-emerald-400 shrink-0" />
                    <span className="text-xs font-mono font-black text-emerald-300">
                      STRATUM 1: SURFACE CANOPY & THATCH LAYER (0 - 8mm)
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    Live rye grass blades mown to {Math.round(4 + (grassCoverage / 100) * 8)}mm height. Cushions ball impact and protects the underlying clay from baking in intense sun.
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-2.5 w-full md:w-64 text-xs font-mono tabular-nums shrink-0">
                  <div className="bg-slate-900/80 px-3 py-2 rounded-lg border border-slate-800 text-center">
                    <span className="text-slate-400 block text-[10px]">FRICTION COEFF</span>
                    <strong className="text-emerald-400">0.34 μ</strong>
                  </div>
                  <div className="bg-slate-900/80 px-3 py-2 rounded-lg border border-slate-800 text-center">
                    <span className="text-slate-400 block text-[10px]">LATERAL CUT</span>
                    <strong className="text-white font-bold">{seamDeg}°</strong>
                  </div>
                </div>
              </div>

              {/* Layer 2: Rolled Top Dressing & Root Porosity (8 - 60mm) */}
              <div className="rounded-xl border border-amber-500/40 bg-gradient-to-r from-amber-950/60 to-slate-950 p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1 flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full bg-amber-400 shrink-0" />
                    <span className="text-xs font-mono font-black text-amber-300">
                      STRATUM 2: COMPACTED ROOT SYSTEM & SILT MATRIX (8 - 60mm)
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    Heavy roller compaction (2.5 tonnes) interlocks root fiber with fine clay particles, eliminating sponginess and guaranteeing uniform bounce.
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-2.5 w-full md:w-64 text-xs font-mono tabular-nums shrink-0">
                  <div className="bg-slate-900/80 px-3 py-2 rounded-lg border border-slate-800 text-center">
                    <span className="text-slate-400 block text-[10px]">BULK DENSITY</span>
                    <strong className="text-amber-400">1.88 g/cm³</strong>
                  </div>
                  <div className="bg-slate-900/80 px-3 py-2 rounded-lg border border-slate-800 text-center">
                    <span className="text-slate-400 block text-[10px]">MOISTURE</span>
                    <strong className="text-white font-bold">{Math.round(18 + dewLevel * 0.12)}%</strong>
                  </div>
                </div>
              </div>

              {/* Layer 3: Heavy Base Clay Foundation (60 - 180mm) */}
              <div className="rounded-xl border border-rose-500/40 bg-gradient-to-r from-rose-950/60 to-slate-950 p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1 flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full bg-rose-400 shrink-0" />
                    <span className="text-xs font-mono font-black text-rose-300">
                      STRATUM 3: HEAVY SUB-BASE CLAY BED (60 - 180mm)
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    Contains {currentSoil.clayContent}. Provides the primary bedrock that reflects kinetic energy upward back into the cricket ball upon impact.
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-2.5 w-full md:w-64 text-xs font-mono tabular-nums shrink-0">
                  <div className="bg-slate-900/80 px-3 py-2 rounded-lg border border-slate-800 text-center">
                    <span className="text-slate-400 block text-[10px]">REBOUND RATIO</span>
                    <strong className="text-rose-400">0.78 COR</strong>
                  </div>
                  <div className="bg-slate-900/80 px-3 py-2 rounded-lg border border-slate-800 text-center">
                    <span className="text-slate-400 block text-[10px]">HARDNESS INDEX</span>
                    <strong className="text-white font-bold">{paceBounceRating}/100</strong>
                  </div>
                </div>
              </div>

              {/* Layer 4: Porous Geotextile & French Drainage (180 - 300mm) */}
              <div className="rounded-xl border border-sky-500/40 bg-gradient-to-r from-sky-950/60 to-slate-950 p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1 flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full bg-sky-400 shrink-0" />
                    <span className="text-xs font-mono font-black text-sky-300">
                      STRATUM 4: SUB-SURFACE GEOTEXTILE & GRAVEL DRAINAGE (180 - 300mm)
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    Perforated PVC pipes surrounded by washed gravel. Prevents waterlogging during heavy monsoon or tropical cloudbursts, evacuating water in 15 minutes.
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-2.5 w-full md:w-64 text-xs font-mono tabular-nums shrink-0">
                  <div className="bg-slate-900/80 px-3 py-2 rounded-lg border border-slate-800 text-center">
                    <span className="text-slate-400 block text-[10px]">INFILTRATION</span>
                    <strong className="text-sky-400">120 mm/hr</strong>
                  </div>
                  <div className="bg-slate-900/80 px-3 py-2 rounded-lg border border-slate-800 text-center">
                    <span className="text-slate-400 block text-[10px]">DRAIN STATUS</span>
                    <strong className="text-emerald-400 font-bold">100% CLEAR</strong>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 3: BOUNDARY DIMENSIONS & WIND VECTOR TELEMETRY
          ========================================================================= */}
      {activeTab === 'boundaries' && (
        <div className="space-y-6 animate-in fade-in duration-300">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
            {/* Visual Boundary Map (Left 2 cols — Responsive Non-Overlapping SVG Compass) */}
            <div className="lg:col-span-2 rounded-2xl border border-cyan-500/30 bg-[#020718] p-5 flex flex-col justify-between space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2 text-xs font-mono text-cyan-400 font-bold">
                  <Wind className="h-4 w-4 shrink-0" />
                  <span>SPATIAL BOUNDARY COMPASS & WIND ASSIST OVERLAY</span>
                </div>
                <span className="text-[11px] font-mono text-cyan-300 tabular-nums">
                  Wind: 22 km/h NE (+6.2 km/h Assist)
                </span>
              </div>

              <div className="w-full max-w-xl mx-auto">
                <svg
                  viewBox="0 0 520 330"
                  className="w-full h-auto block select-none"
                  role="img"
                  aria-label="Stadium Boundary Dimensions and Wind Vector Compass"
                >
                  <defs>
                    <radialGradient id="turfOvalGrad" cx="50%" cy="50%" r="50%">
                      <stop offset="0%" stopColor="#064e3b" stopOpacity="0.45" />
                      <stop offset="100%" stopColor="#041838" stopOpacity="0.65" />
                    </radialGradient>
                    <marker
                      id="windArrowHead"
                      viewBox="0 0 10 10"
                      refX="8"
                      refY="5"
                      markerWidth="6"
                      markerHeight="6"
                      orient="auto-start-reverse"
                    >
                      <path d="M 0 1 L 10 5 L 0 9 z" fill="#22d3ee" />
                    </marker>
                  </defs>

                  {/* Outer Boundary Cushion Oval */}
                  <ellipse
                    cx="260"
                    cy="165"
                    rx="170"
                    ry="132"
                    fill="url(#turfOvalGrad)"
                    stroke="#22d3ee"
                    strokeOpacity="0.45"
                    strokeWidth="2"
                    strokeDasharray="6 4"
                  />

                  {/* 30-Yard Fielding Circle */}
                  <ellipse
                    cx="260"
                    cy="165"
                    rx="95"
                    ry="74"
                    fill="#022c22"
                    fillOpacity="0.35"
                    stroke="#38bdf8"
                    strokeOpacity="0.35"
                    strokeWidth="1.25"
                  />

                  {/* Compass Crosshairs */}
                  <line x1="260" y1="33" x2="260" y2="297" stroke="#334155" strokeDasharray="3 4" />
                  <line x1="90" y1="165" x2="430" y2="165" stroke="#334155" strokeDasharray="3 4" />

                  {/* 22-Yard Pitch Strip */}
                  <rect
                    x="250"
                    y="133"
                    width="20"
                    height="64"
                    rx="3"
                    fill="#92400e"
                    stroke="#fbbf24"
                    strokeWidth="1.2"
                  />
                  <line x1="252" y1="141" x2="268" y2="141" stroke="#f8fafc" strokeWidth="1" />
                  <line x1="252" y1="189" x2="268" y2="189" stroke="#f8fafc" strokeWidth="1" />

                  {/* Wind Vector Arrow (SW -> NE towards Deep Mid-Wicket) */}
                  <line
                    x1="210"
                    y1="195"
                    x2="345"
                    y2="98"
                    stroke="#22d3ee"
                    strokeWidth="2.2"
                    markerEnd="url(#windArrowHead)"
                  />

                  {/* Top: Straight 78m */}
                  <rect x="208" y="8" width="104" height="22" rx="6" fill="#0f172a" stroke="#334155" />
                  <text x="260" y="23" textAnchor="middle" fill="#f8fafc" fontSize="10" fontFamily="monospace" fontWeight="bold">
                    Straight: 78m
                  </text>

                  {/* Bottom: Long-on 82m */}
                  <rect x="208" y="302" width="104" height="22" rx="6" fill="#0f172a" stroke="#334155" />
                  <text x="260" y="317" textAnchor="middle" fill="#f8fafc" fontSize="10" fontFamily="monospace" fontWeight="bold">
                    Long-on: 82m
                  </text>

                  {/* Left: Square Leg 64m */}
                  <rect x="6" y="154" width="106" height="22" rx="6" fill="#0f172a" stroke="#334155" />
                  <text x="59" y="169" textAnchor="middle" fill="#f8fafc" fontSize="10" fontFamily="monospace" fontWeight="bold">
                    Square Leg: 64m
                  </text>

                  {/* Right: Cover 68m */}
                  <rect x="408" y="154" width="106" height="22" rx="6" fill="#0f172a" stroke="#334155" />
                  <text x="461" y="169" textAnchor="middle" fill="#f8fafc" fontSize="10" fontFamily="monospace" fontWeight="bold">
                    Extra Cover: 68m
                  </text>

                  {/* Top-Left: Fine Leg 59m */}
                  <rect x="22" y="54" width="132" height="22" rx="6" fill="#0f172a" stroke="#f59e0b" strokeOpacity="0.6" />
                  <text x="88" y="69" textAnchor="middle" fill="#fbbf24" fontSize="10" fontFamily="monospace" fontWeight="bold">
                    Fine Leg: 59m (Short)
                  </text>

                  {/* Top-Right: Deep Mid-Wkt 74m */}
                  <rect x="352" y="54" width="154" height="22" rx="6" fill="#083344" stroke="#22d3ee" strokeOpacity="0.7" />
                  <text x="429" y="69" textAnchor="middle" fill="#67e8f9" fontSize="10" fontFamily="monospace" fontWeight="bold">
                    Deep Mid-Wkt: 74m (+Wind)
                  </text>
                </svg>
              </div>

              <p className="text-center text-xs text-slate-400">
                Prevailing tailwind (+6.2 km/h assist) towards Deep Mid-Wicket favors pull shots and slog-sweeps.
              </p>
            </div>

            {/* Boundary Sector Analysis (Right Col) */}
            <div className="rounded-2xl border border-cyan-500/20 bg-slate-950/80 p-5 space-y-4">
              <span className="text-xs font-mono font-bold text-cyan-400 uppercase tracking-wider block border-b border-cyan-500/20 pb-2">
                SECTOR SCORING DIFFICULTY INDEX
              </span>

              <div className="space-y-3 text-xs font-mono">
                <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800 space-y-1">
                  <div className="flex justify-between">
                    <span className="text-slate-300 font-bold">Fine Leg & Third Man</span>
                    <span className="text-emerald-400 font-bold">EASY (59m)</span>
                  </div>
                  <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-400" style={{ width: '85%' }} />
                  </div>
                  <span className="text-[10px] text-slate-500 block">Ramps & upper cuts clear ropes easily</span>
                </div>

                <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800 space-y-1">
                  <div className="flex justify-between">
                    <span className="text-slate-300 font-bold">Deep Mid-Wicket</span>
                    <span className="text-cyan-400 font-bold">WIND-ASSISTED</span>
                  </div>
                  <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                    <div className="h-full bg-cyan-400" style={{ width: '75%' }} />
                  </div>
                  <span className="text-[10px] text-slate-500 block">22 km/h tailwind adds ~7.5m carry</span>
                </div>

                <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800 space-y-1">
                  <div className="flex justify-between">
                    <span className="text-slate-300 font-bold">Straight Down Ground</span>
                    <span className="text-rose-400 font-bold">TOUGH (78-82m)</span>
                  </div>
                  <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                    <div className="h-full bg-rose-400" style={{ width: '38%' }} />
                  </div>
                  <span className="text-[10px] text-slate-500 block">Requires 105m+ monster hit to clear boundary cushions</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 4: INTERACTIVE BALL TRAJECTORY & BOUNCE SIMULATOR
          ========================================================================= */}
      {/* =========================================================================
          TAB 6: BROADCAST HAWKEYE DRS & BALL TRACKING TELEMETRY
          ========================================================================= */}
      {activeTab === 'bounce-sim' && (
        <div className="space-y-6 animate-in fade-in duration-300">
          <div className="rounded-2xl border border-cyan-500/30 bg-[#02071a] p-5 space-y-5">
            {/* Header with Mode Subtabs */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-cyan-500/20 pb-4">
              <div>
                <h4 className="text-base font-black text-white flex items-center gap-2">
                  <Activity className="h-4 w-4 text-cyan-400" />
                  <span>Broadcast-Grade DRS & Pitch Trajectory Studio</span>
                </h4>
                <p className="text-xs text-slate-400">
                  Inspect frame-by-frame Hawkeye ball tracking with 4 broadcast camera perspectives, impact points, and UltraEdge acoustics.
                </p>
              </div>

              {/* Sub-mode selector */}
              <div className="flex flex-wrap items-center gap-2">
                {[
                  { id: 'tracking', label: 'Hawkeye 3D Ball Tracking' },
                  { id: 'ultraedge', label: 'UltraEdge Snickometer' },
                  { id: 'profile', label: '22-Yard Vertical Arc' },
                ].map((mode) => (
                  <button
                    key={mode.id}
                    type="button"
                    onClick={() => {
                      setHawkeyeMode(mode.id as any);
                      if (mode.id === 'ultraedge') {
                        cricketAudio.playDrsUltraEdgeSpike(ultraEdgeHasSpike);
                      } else if (mode.id === 'profile') {
                        setArcAnimKey((k) => k + 1);
                        cricketAudio.playFullDeliverySequence({
                          category: 'seam',
                          surfaceTrait: currentSurfaceTrait,
                          outcome: simBounceHeight <= 0.71 ? 'W' : '0',
                          speedKmh: simPaceKmh,
                          forceUnmute: true,
                        });
                      } else {
                        cricketAudio.playRadarSweepPing();
                      }
                    }}
                    className={`rounded-xl px-3 py-1.5 text-xs font-mono font-bold transition-colors cursor-pointer whitespace-nowrap ${
                      hawkeyeMode === mode.id
                        ? 'bg-cyan-500 text-slate-950 font-black'
                        : 'bg-slate-900 border border-slate-700 text-slate-300 hover:text-white'
                    }`}
                  >
                    {mode.label}
                  </button>
                ))}
              </div>
            </div>

            {/* SUB-VIEW 1: HAWK-EYE 3D BALL TRACKING CANVAS */}
            {hawkeyeMode === 'tracking' && (
              <div className="space-y-4 animate-in fade-in duration-200">
                {/* Interactive Controls Bar */}
                <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-950/80 p-3 rounded-xl border border-cyan-500/20 text-xs font-mono">
                  <div className="flex items-center gap-3">
                    <span className="text-slate-400 font-bold">OUTCOME:</span>
                    <button
                      type="button"
                      onClick={() => {
                        setHawkeyeIsOut(true);
                        cricketAudio.playStumpShatter({ forceUnmute: true });
                      }}
                      className={`px-3 py-1 rounded-lg font-black transition-colors cursor-pointer ${
                        hawkeyeIsOut
                          ? 'bg-rose-500 text-slate-950'
                          : 'bg-slate-900 border border-slate-700 text-slate-400'
                      }`}
                    >
                      HITTING (OUT)
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setHawkeyeIsOut(false);
                        cricketAudio.playPitchImpactSound('seam', currentSurfaceTrait, {
                          delaySec: 0,
                          forceUnmute: true,
                        });
                      }}
                      className={`px-3 py-1 rounded-lg font-black transition-colors cursor-pointer ${
                        !hawkeyeIsOut
                          ? 'bg-emerald-500 text-slate-950'
                          : 'bg-slate-900 border border-slate-700 text-slate-400'
                      }`}
                    >
                      MISSING (NOT OUT)
                    </button>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-slate-400 font-bold">PACE:</span>
                    <input
                      type="range"
                      min="115"
                      max="155"
                      value={simPaceKmh}
                      onChange={(e) => {
                        setSimPaceKmh(Number(e.target.value));
                        cricketAudio.playSliderTick();
                      }}
                      className="w-24 accent-cyan-400 cursor-pointer"
                    />
                    <span className="text-cyan-300 font-bold tabular-nums">{simPaceKmh} KM/H</span>
                  </div>
                </div>

                {/* Broadcast Ball Tracking Canvas Engine */}
                <BroadcastBallTrackingCanvas
                  isOut={hawkeyeIsOut}
                  strikerName="Top Order Batter"
                  bowlerName={stadiumName ? `${stadiumName} Pace Bowler` : 'Express Seamer'}
                  delivery={{
                    speedKmh: simPaceKmh,
                    bounceHeightMeters: simBounceHeight,
                    seamDeviation: seamDeg > 1.2 ? -1.8 : 0.6,
                    pitchingLine: 'IN LINE',
                    impactLine: 'IN LINE',
                    wicketsOutcome: hawkeyeIsOut ? 'HITTING' : 'MISSING (OFF)',
                    isOut: hawkeyeIsOut,
                    bowlerType: `${currentSoil.name} Seam Corridor`,
                    description: `Release velocity ${simPaceKmh} km/h on ${currentSoil.name} surface with ${seamDeg}° seam deviation.`,
                  }}
                />
              </div>
            )}

            {/* SUB-VIEW 2: ULTRAEDGE SNICKOMETER CANVAS */}
            {hawkeyeMode === 'ultraedge' && (
              <div className="space-y-4 animate-in fade-in duration-200">
                <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-950/80 p-3 rounded-xl border border-cyan-500/20 text-xs font-mono">
                  <div className="flex items-center gap-3">
                    <span className="text-slate-400 font-bold">ACOUSTIC SPIKE:</span>
                    <button
                      type="button"
                      onClick={() => {
                        setUltraEdgeHasSpike(true);
                        cricketAudio.playBatHit();
                      }}
                      className={`px-3 py-1 rounded-lg font-black transition-colors cursor-pointer ${
                        ultraEdgeHasSpike
                          ? 'bg-rose-500 text-slate-950'
                          : 'bg-slate-900 border border-slate-700 text-slate-400'
                      }`}
                    >
                      SHARP SPIKE (BAT ON BALL)
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setUltraEdgeHasSpike(false);
                        cricketAudio.playUiClick();
                      }}
                      className={`px-3 py-1 rounded-lg font-black transition-colors cursor-pointer ${
                        !ultraEdgeHasSpike
                          ? 'bg-emerald-500 text-slate-950'
                          : 'bg-slate-900 border border-slate-700 text-slate-400'
                      }`}
                    >
                      FLATLINE (NO CONTACT)
                    </button>
                  </div>
                  <span className="text-slate-400 text-[11px]">
                    Frequency: 24.8 kHz · Directional Stump Microphone
                  </span>
                </div>

                <BroadcastUltraEdgeCanvas
                  isEdge={ultraEdgeHasSpike}
                  strikerName="Batter"
                  bowlerName="Pace Bowler"
                  appealType="CAUGHT BEHIND"
                />
              </div>
            )}

            {/* SUB-VIEW 3: 22-YARD VERTICAL PROFILE (ANIMATED BALL FLIGHT + SPIN LOOP + STUMP SHATTER) */}
            {hawkeyeMode === 'profile' && (
              <div className="space-y-4 animate-in fade-in duration-200">
                <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3 bg-slate-950/80 p-3 rounded-xl border border-cyan-500/20 text-xs font-mono">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-slate-400 font-bold mr-1">LENGTH:</span>
                    {(['Full', 'Good Length', 'Back of Length', 'Bouncer'] as const).map((len) => (
                      <button
                        key={len}
                        type="button"
                        onClick={() => {
                          setIsAutoCyclingLengths(false);
                          setSimLength(len);
                          setArcAnimKey((k) => k + 1);
                          const estH =
                            (len === 'Full'
                              ? 0.45
                              : len === 'Good Length'
                              ? 1.05
                              : len === 'Back of Length'
                              ? 1.55
                              : 2.15) +
                            (simPaceKmh - 120) * 0.008 +
                            (paceBounceRating - 70) * 0.005;
                          cricketAudio.playFullDeliverySequence({
                            category: 'seam',
                            surfaceTrait: currentSurfaceTrait,
                            outcome: estH <= 0.71 ? 'W' : '0',
                            speedKmh: simPaceKmh,
                            forceUnmute: true,
                          });
                        }}
                        className={`rounded-lg px-2.5 py-1.5 text-xs font-mono font-bold transition-colors cursor-pointer whitespace-nowrap ${
                          simLength === len
                            ? 'bg-cyan-500 text-slate-950 font-black'
                            : 'bg-slate-900 border border-slate-700 text-slate-300 hover:text-white'
                        }`}
                      >
                        {len}
                      </button>
                    ))}
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <div className="flex items-center gap-2 mr-1">
                      <span className="text-slate-400 font-bold">PACE:</span>
                      <input
                        type="range"
                        min="115"
                        max="155"
                        value={simPaceKmh}
                        onChange={(e) => {
                          setSimPaceKmh(Number(e.target.value));
                          cricketAudio.playSliderTick();
                        }}
                        className="w-24 accent-cyan-400 cursor-pointer"
                      />
                      <span className="text-cyan-300 font-bold tabular-nums">{simPaceKmh} KM/H</span>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        cricketAudio.playUiClick();
                        setShowSpinComparisonArc((prev) => !prev);
                      }}
                      className={`h-8 px-2.5 rounded-lg border text-[11px] font-bold cursor-pointer whitespace-nowrap ${
                        showSpinComparisonArc
                          ? 'border-amber-400/60 bg-amber-500/20 text-amber-200'
                          : 'border-slate-700 bg-slate-900 text-slate-400 hover:text-white'
                      }`}
                    >
                      {showSpinComparisonArc ? 'Spin Arc On' : 'Spin Arc Off'}
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setArcAnimKey((k) => k + 1);
                        cricketAudio.playFullDeliverySequence({
                          category: 'seam',
                          surfaceTrait: currentSurfaceTrait,
                          outcome: simBounceHeight <= 0.71 ? 'W' : '0',
                          speedKmh: simPaceKmh,
                          forceUnmute: true,
                        });
                      }}
                      className="h-8 px-2.5 rounded-lg border border-cyan-400/60 bg-cyan-500/20 text-[11px] font-bold text-cyan-100 hover:bg-cyan-500/30 cursor-pointer inline-flex items-center gap-1 whitespace-nowrap"
                    >
                      <Play className="h-3 w-3 text-cyan-300 shrink-0" />
                      <span>Launch Ball</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        if (isAutoCyclingLengths) {
                          setIsAutoCyclingLengths(false);
                          cricketAudio.playUiClick();
                        } else {
                          setIsAutoCyclingLengths(true);
                        }
                      }}
                      className={`h-8 px-2.5 rounded-lg border text-[11px] font-bold cursor-pointer inline-flex items-center gap-1 whitespace-nowrap ${
                        isAutoCyclingLengths
                          ? 'border-rose-400/70 bg-rose-500/25 text-rose-100'
                          : 'border-emerald-400/60 bg-emerald-500/20 text-emerald-100 hover:bg-emerald-500/30'
                      }`}
                    >
                      {isAutoCyclingLengths ? (
                        <>
                          <Pause className="h-3 w-3 text-rose-300 shrink-0" />
                          <span>Stop Cycle</span>
                        </>
                      ) : (
                        <>
                          <Play className="h-3 w-3 text-emerald-300 shrink-0" />
                          <span>Cycle All 4</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Unified Responsive SVG 22-Yard Pitch Elevation Visualizer */}
                <div className="rounded-2xl border border-cyan-500/30 bg-slate-950 p-4 overflow-hidden">
                  {(() => {
                    const releaseX = 76;
                    const releaseY = 64;
                    const pitchY = 198;
                    const stumpsX = 605;
                    const stumpTopY = 142; // 0.71m = 56px height above pitchY (198)
                    const pitchImpactX =
                      simLength === 'Full'
                        ? 485
                        : simLength === 'Good Length'
                        ? 395
                        : simLength === 'Back of Length'
                        ? 315
                        : 240;
                    const passStumpY = Math.max(
                      32,
                      Math.min(192, Math.round(pitchY - (simBounceHeight / 0.71) * 56))
                    );
                    const preBounceCtrlX = Math.round((releaseX + pitchImpactX) * 0.56);
                    const preBounceCtrlY = Math.round(releaseY + (pitchY - releaseY) * 0.35);
                    const postBounceCtrlX = Math.round((pitchImpactX + stumpsX) * 0.48);
                    const postBounceCtrlY = Math.min(pitchY - 12, passStumpY - 8);
                    const paceMotionPath = `M ${releaseX} ${releaseY} Q ${preBounceCtrlX} ${preBounceCtrlY} ${pitchImpactX} ${pitchY} Q ${postBounceCtrlX} ${postBounceCtrlY} ${stumpsX} ${passStumpY}`;

                    // Secondary Spin Flighted Loop Comparison Path (88 km/h loop & dip)
                    const spinImpactX = Math.min(520, pitchImpactX + 55);
                    const spinPassY = Math.min(190, passStumpY + 26);
                    const spinMotionPath = `M ${releaseX} ${releaseY + 8} Q ${Math.round((releaseX + spinImpactX) * 0.52)} 18 ${spinImpactX} ${pitchY} Q ${Math.round((spinImpactX + stumpsX) * 0.5)} ${Math.min(pitchY - 14, spinPassY - 14)} ${stumpsX} ${spinPassY}`;

                    const isShatteringStumps = simBounceHeight <= 0.71;

                    return (
                      <svg
                        viewBox="0 0 700 236"
                        className="w-full h-auto block select-none"
                        role="img"
                        aria-label="22-Yard Vertical Ball Bounce Trajectory Profile"
                      >
                        <defs>
                          <linearGradient id="bounceGradient" x1="0" y1="0" x2="1" y2="0">
                            <stop offset="0%" stopColor="#38bdf8" />
                            <stop offset="52%" stopColor="#f59e0b" />
                            <stop offset="100%" stopColor="#fb7185" />
                          </linearGradient>
                        </defs>

                        {/* Height Reference Lines */}
                        <line x1="46" y1={stumpTopY} x2="656" y2={stumpTopY} stroke="#334155" strokeDasharray="4 4" />
                        <text x="50" y={stumpTopY - 5} fill="#94a3b8" fontSize="9" fontFamily="monospace">
                          Bail Height (0.71m)
                        </text>

                        {/* 22-Yard Pitch Surface Bed */}
                        <rect x="46" y={pitchY} width="610" height="12" rx="3" fill="#78350f" stroke="#d97706" strokeWidth="1.2" />

                        {/* Yardage Tick Markers along 22 Yards */}
                        {[
                          { x: 76, label: '0 yd (Release)' },
                          { x: 240, label: '7 yd (Short)' },
                          { x: 395, label: '14 yd (Good)' },
                          { x: 485, label: '18 yd (Full)' },
                          { x: 605, label: '22 yd (Stumps)' },
                        ].map((tk) => (
                          <g key={tk.label}>
                            <line x1={tk.x} y1={pitchY} x2={tk.x} y2={pitchY + 12} stroke="#fcd34d" strokeOpacity="0.6" />
                            <text x={tk.x} y="226" textAnchor="middle" fill="#94a3b8" fontSize="9" fontFamily="monospace">
                              {tk.label}
                            </text>
                          </g>
                        ))}

                        {/* Optional Spin Flighted Loop Comparison Arc */}
                        {showSpinComparisonArc && (
                          <g key={`spin-arc-${arcAnimKey}-${simLength}`} opacity="0.72">
                            <path
                              d={spinMotionPath}
                              pathLength={1}
                              fill="none"
                              stroke="#fbbf24"
                              strokeWidth="2"
                              strokeDasharray="4 3"
                              className="animate-shotmap-trace"
                            />
                            <ellipse cx={spinImpactX} cy={pitchY} rx="7" ry="3" fill="#f59e0b" fillOpacity="0.45" />
                            <text x={spinImpactX} y={pitchY + 20} textAnchor="middle" fill="#fcd34d" fontSize="8" fontFamily="monospace">
                              SPIN LOOP (88k)
                            </text>
                            <g>
                              <circle r="4.2" fill="#f59e0b" stroke="#ffffff" strokeWidth="1" />
                              <animateMotion dur="0.92s" fill="freeze" path={spinMotionPath} />
                            </g>
                          </g>
                        )}

                        {/* Animated Primary Pace Trajectory Arc + Impact Particles + Flying Ball */}
                        <g key={`pace-arc-${arcAnimKey}-${simLength}-${simPaceKmh}`}>
                          <path
                            d={paceMotionPath}
                            pathLength={1}
                            fill="none"
                            stroke="url(#bounceGradient)"
                            strokeWidth="3.5"
                            strokeLinecap="round"
                            className="animate-shotmap-trace"
                          />

                          {/* Pitch Impact Ripple & Particles */}
                          <circle
                            cx={pitchImpactX}
                            cy={pitchY}
                            r="11"
                            fill="none"
                            stroke="#fbbf24"
                            strokeWidth="1.8"
                            className="animate-shotmap-ripple"
                          />
                          <circle
                            cx={pitchImpactX}
                            cy={pitchY}
                            r="2.2"
                            fill="#fde047"
                            className="animate-impact-particle animate-particle-nw"
                          />
                          <circle
                            cx={pitchImpactX}
                            cy={pitchY}
                            r="2.2"
                            fill="#38bdf8"
                            className="animate-impact-particle animate-particle-ne"
                          />
                          <circle
                            cx={pitchImpactX}
                            cy={pitchY}
                            r="2.4"
                            fill="#ffffff"
                            className="animate-impact-particle animate-particle-up"
                          />

                          {/* Traveling Leather Cricket Ball */}
                          <g>
                            <circle r="5.5" fill="#e11d48" stroke="#ffffff" strokeWidth="1.3" />
                            <animateMotion dur="0.68s" fill="freeze" path={paceMotionPath} />
                          </g>

                          {/* Flying Bails when Trajectory Shatters Stumps (<= 0.71m) */}
                          {isShatteringStumps && (
                            <g>
                              <rect
                                x={stumpsX - 8}
                                y={stumpTopY - 3}
                                width="8"
                                height="2.6"
                                rx="1"
                                fill="#fde047"
                                className="animate-bail-fly-left"
                              />
                              <rect
                                x={stumpsX + 1}
                                y={stumpTopY - 3}
                                width="8"
                                height="2.6"
                                rx="1"
                                fill="#fb7185"
                                className="animate-bail-fly-right"
                              />
                            </g>
                          )}
                        </g>

                        {/* Bowler Release Node */}
                        <circle cx={releaseX} cy={releaseY} r="17" fill="#082f49" stroke="#38bdf8" strokeWidth="1.75" />
                        <text x={releaseX} y={releaseY + 4} textAnchor="middle" fill="#7dd3fc" fontSize="10" fontFamily="monospace" fontWeight="bold">
                          {simPaceKmh}
                        </text>
                        <text x={releaseX} y={releaseY - 23} textAnchor="middle" fill="#94a3b8" fontSize="9" fontFamily="monospace">
                          KM/H RELEASE
                        </text>

                        {/* Pitch Impact Marker */}
                        <ellipse cx={pitchImpactX} cy={pitchY} rx="9" ry="4" fill="#f59e0b" fillOpacity="0.45" stroke="#fbbf24" />
                        <text x={pitchImpactX} y={pitchY - 10} textAnchor="middle" fill="#fcd34d" fontSize="9" fontFamily="monospace" fontWeight="bold">
                          {simLength.toUpperCase()}
                        </text>

                        {/* Striker Stumps (0.71m = 56px) */}
                        <rect x={stumpsX - 5} y={stumpTopY} width="2.5" height="56" rx="1" fill="#fbbf24" />
                        <rect x={stumpsX - 1} y={stumpTopY} width="2.5" height="56" rx="1" fill="#fbbf24" />
                        <rect x={stumpsX + 3} y={stumpTopY} width="2.5" height="56" rx="1" fill="#fbbf24" />
                        {!isShatteringStumps && (
                          <line x1={stumpsX - 6} y1={stumpTopY} x2={stumpsX + 6} y2={stumpTopY} stroke="#fef08a" strokeWidth="2" />
                        )}

                        {/* Ball Height at Stumps Marker & Non-Clipping Callout */}
                        <circle cx={stumpsX} cy={passStumpY} r="6" fill="#f43f5e" stroke="#ffffff" strokeWidth="1.5" />
                        <rect x={stumpsX + 12} y={passStumpY - 11} width="72" height="22" rx="6" fill="#020617" stroke="#f43f5e" strokeOpacity="0.8" />
                        <text x={stumpsX + 48} y={passStumpY + 4} textAnchor="middle" fill="#fda4af" fontSize="10" fontFamily="monospace" fontWeight="bold">
                          {simBounceHeight}m
                        </text>
                      </svg>
                    );
                  })()}
                </div>

                {/* Calculated Telemetry Stats */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
                  <div className="rounded-xl border border-slate-800 bg-slate-950 p-3 text-center">
                    <span className="text-[10px] text-slate-500 block">HEIGHT OVER STUMPS</span>
                    <strong className={`font-black text-sm ${simBounceHeight > 0.71 ? 'text-amber-400' : 'text-emerald-400'}`}>
                      {simBounceHeight} Meters ({simBounceHeight > 0.71 ? 'Overshot Stumps' : 'Hitting Stumps'})
                    </strong>
                  </div>
                  <div className="rounded-xl border border-slate-800 bg-slate-950 p-3 text-center">
                    <span className="text-[10px] text-slate-500 block">ESTIMATED FLIGHT TIME</span>
                    <strong className="text-cyan-300 font-black text-sm">
                      {((20.12 / ((simPaceKmh * 1000) / 3600)) * 1000).toFixed(0)} Milliseconds
                    </strong>
                  </div>
                  <div className="rounded-xl border border-slate-800 bg-slate-950 p-3 text-center">
                    <span className="text-[10px] text-slate-500 block">PITCH IMPACT DEVIATION</span>
                    <strong className="text-white font-black text-sm">
                      {seamDeg}° Seam · {turnDeg}° Turn
                    </strong>
                  </div>
                  <div className="rounded-xl border border-slate-800 bg-slate-950 p-3 text-center">
                    <span className="text-[10px] text-slate-500 block">DISMISSAL LIKELIHOOD</span>
                    <strong className="text-rose-400 font-black text-sm">
                      {simLength === 'Good Length' ? 'Very High (LBW / Edge)' : simLength === 'Bouncer' ? 'Catch at Deep Square' : 'Driven In Gap'}
                    </strong>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Surface AR Overlay Modal */}
      <SurfaceArOverlayModal
        isOpen={showArModal}
        onClose={() => setShowArModal(false)}
        stadiumName={stadiumName}
        initialOvers={12.0}
      />
    </div>
  );
};
