import React, { useState, useMemo, useEffect } from 'react';
import {
  Wind,
  Droplets,
  Thermometer,
  Gauge,
  Compass,
  Activity,
  Sparkles,
  CloudRain,
  Sun,
  Shield,
  Zap,
  Info,
  CheckCircle2,
  RefreshCw,
  Eye,
  Layers,
  ArrowUpRight,
  TrendingUp,
  Volume2,
  VolumeX,
  Mic,
  Camera,
  Play,
  Pause,
  Sliders,
} from 'lucide-react';
import { cricketAudio } from '../../utils/audioSystem';
import { triggerHaptic, HAPTIC_PATTERNS } from '../../utils/haptics';
import { SurfaceArOverlayModal } from './SurfaceArOverlayModal';
import { PitchD3AnalyticsSuite } from './PitchD3AnalyticsSuite';
import { AtmosphericIntelligencePanel } from './AtmosphericIntelligencePanel';
import { PitchWeatherHeatmap } from './PitchWeatherHeatmap';
import { PitchSurfaceWearVisualizer } from './PitchSurfaceWearVisualizer';
import { VenueClimateHistoricalOverlay } from './VenueClimateHistoricalOverlay';
import { VenueCinematicView } from './VenueCinematicView';
import { LandingZoneHeatmap } from './LandingZoneHeatmap';
import { StadiumAtmosphereVisualizer } from './StadiumAtmosphereVisualizer';
import { PitchSensorAndTossSuite } from './PitchSensorAndTossSuite';
import { DynamicSurfaceInteraction } from './DynamicSurfaceInteraction';
import { FieldingHeatmap } from './FieldingHeatmap';
import { PitchIntelligenceAdvancedSuite } from './PitchIntelligenceAdvancedSuite';
import { ResponsiveContainer, LineChart, Line, Tooltip as RechartsTooltip } from 'recharts';

export interface EnvironmentalSensorData {
  temperature: number; // °C
  humidity: number; // %
  windSpeed: number; // km/h
  windDirectionDeg: number; // 0-360 degrees
  windDirectionLabel: string; // N, NE, E, SE, S, SW, W, NW
  airPressure: number; // hPa
  airDensity: number; // kg/m³
  dewLevel: number; // 0-100%
  cloudCover: number; // 0-100%
  luxLevel: number; // Lux lighting
  pitchWear: number; // 0-100%
  grassCoverage: number; // 0-100%
}

export interface PitchIntelligenceProps {
  stadiumName?: string;
  initialTemperature?: number;
  initialHumidity?: number;
  initialWindSpeed?: number;
  initialWindDirectionDeg?: number;
  initialAirPressure?: number;
  initialPitchWear?: number;
  initialGrassCoverage?: number;
  initialDewLevel?: number;
  onApplyConditions?: (conditions: {
    swingImpactIndex: number;
    spinImpactIndex: number;
    compositeImpact: number;
    projectedPar: number;
    tossRecommendation: string;
  }) => void;
}

interface WeatherPreset {
  id: string;
  name: string;
  stadium: string;
  icon: string;
  temp: number;
  humidity: number;
  windSpeed: number;
  windDeg: number;
  windLabel: string;
  pressure: number;
  dew: number;
  cloud: number;
  pitchWear: number;
  grass: number;
  description: string;
}

const WEATHER_PRESETS: WeatherPreset[] = [
  {
    id: 'overcast-humid',
    name: 'Overcast and Humid',
    stadium: 'Atmospheric Scenario',
    icon: '🌧️',
    temp: 18,
    humidity: 88,
    windSpeed: 24,
    windDeg: 285,
    windLabel: 'WNW',
    pressure: 1016,
    dew: 30,
    cloud: 92,
    pitchWear: 25,
    grass: 78,
    description: 'High air density and heavy cloud layer create sustained boundary-layer separation. New ball hoops 2.6° laterally through the air.',
  },
  {
    id: 'warm-dewy',
    name: 'Warm and Dewy',
    stadium: 'Atmospheric Scenario',
    icon: '💧',
    temp: 31,
    humidity: 82,
    windSpeed: 14,
    windDeg: 220,
    windLabel: 'SW',
    pressure: 1008,
    dew: 85,
    cloud: 20,
    pitchWear: 35,
    grass: 45,
    description: 'Elevated evening humidity triggers heavy condensation on the grass. Wet leather skids on to the bat with reduced spin purchase.',
  },
  {
    id: 'hot-dry',
    name: 'Hot and Dry',
    stadium: 'Atmospheric Scenario',
    icon: '☀️',
    temp: 38,
    humidity: 32,
    windSpeed: 12,
    windDeg: 90,
    windLabel: 'E',
    pressure: 1006,
    dew: 10,
    cloud: 10,
    pitchWear: 80,
    grass: 15,
    description: 'Intense heat opens surface fissures. Finger spinners extract sharp grip up to 4.5° off the dusty, dry deck.',
  },
  {
    id: 'strong-crosswinds',
    name: 'Strong Crosswinds',
    stadium: 'Atmospheric Scenario',
    icon: '💨',
    temp: 26,
    humidity: 50,
    windSpeed: 38,
    windDeg: 240,
    windLabel: 'WSW',
    pressure: 1014,
    dew: 18,
    cloud: 25,
    pitchWear: 20,
    grass: 80,
    description: 'Roaring cross-breeze shears through the ground. Trajectories drift in flight, challenging batter judgment on horizontal shots.',
  },
  {
    id: 'cool-thin-air',
    name: 'Cool and Thin Air',
    stadium: 'Atmospheric Scenario',
    icon: '🏔️',
    temp: 15,
    humidity: 44,
    windSpeed: 20,
    windDeg: 340,
    windLabel: 'NNW',
    pressure: 865,
    dew: 25,
    cloud: 40,
    pitchWear: 25,
    grass: 65,
    description: 'Lower atmospheric density reduces aerodynamic drag. The ball travels further and seamers extract maximum zip off the deck.',
  },
];

export const PitchIntelligenceView: React.FC<PitchIntelligenceProps> = ({
  stadiumName = 'Narendra Modi Stadium, Ahmedabad',
  initialTemperature = 28,
  initialHumidity = 74,
  initialWindSpeed = 22,
  initialWindDirectionDeg = 240,
  initialAirPressure = 1012,
  initialPitchWear = 40,
  initialGrassCoverage = 55,
  initialDewLevel = 60,
  onApplyConditions,
}) => {
  // Environmental Sensor Controls
  const [temperature, setTemperature] = useState<number>(initialTemperature);
  const [humidity, setHumidity] = useState<number>(initialHumidity);
  const [windSpeed, setWindSpeed] = useState<number>(initialWindSpeed);
  const [windDirectionDeg, setWindDirectionDeg] = useState<number>(initialWindDirectionDeg);
  const [airPressure, setAirPressure] = useState<number>(initialAirPressure);
  const [pitchWear, setPitchWear] = useState<number>(initialPitchWear);
  const [grassCoverage, setGrassCoverage] = useState<number>(initialGrassCoverage);
  const [dewLevel, setDewLevel] = useState<number>(initialDewLevel);
  const [cloudCover, setCloudCover] = useState<number>(55);
  const [activePresetId, setActivePresetId] = useState<string>('wankhede-dew');
  const [isSpeakingPitchReport, setIsSpeakingPitchReport] = useState<boolean>(false);
  const [isListeningVoicePitch, setIsListeningVoicePitch] = useState<boolean>(false);
  const [pitchVoiceFeedback, setPitchVoiceFeedback] = useState<string | null>(null);

  // Time-lapse Day 1-5 slider & state
  const [matchDay, setMatchDay] = useState<number>(1);
  const [isTimeLapsePlaying, setIsTimeLapsePlaying] = useState<boolean>(false);
  const [showArModal, setShowArModal] = useState<boolean>(false);
  const [showFieldingHeatmap, setShowFieldingHeatmap] = useState<boolean>(true);
  const [showMoistureHardness, setShowMoistureHardness] = useState<boolean>(true);
  const [show3DCracksCanvas, setShow3DCracksCanvas] = useState<boolean>(true);

  const applyDayProgression = (day: number, playAudio = false) => {
    setMatchDay(day);
    switch (day) {
      case 1:
        setGrassCoverage(80);
        setPitchWear(14);
        if (playAudio) cricketAudio.playPitchImpactSound('seam', 'grassy', { delaySec: 0, forceUnmute: true });
        break;
      case 2:
        setGrassCoverage(64);
        setPitchWear(28);
        if (playAudio) cricketAudio.playPitchKeyTest(78, { forceUnmute: true });
        break;
      case 3:
        setGrassCoverage(45);
        setPitchWear(50);
        if (playAudio) cricketAudio.playPitchKeyTest(58, { forceUnmute: true });
        break;
      case 4:
        setGrassCoverage(25);
        setPitchWear(74);
        if (playAudio) cricketAudio.playPitchImpactSound('spin', 'dry', { delaySec: 0, forceUnmute: true });
        break;
      case 5:
      default:
        setGrassCoverage(12);
        setPitchWear(92);
        if (playAudio) cricketAudio.playPitchImpactSound('spin', 'cracked', { delaySec: 0, forceUnmute: true });
        break;
    }
  };

  useEffect(() => {
    let timer: NodeJS.Timeout | null = null;
    if (isTimeLapsePlaying) {
      timer = setInterval(() => {
        setMatchDay((prev) => {
          const nextDay = prev >= 5 ? 1 : prev + 1;
          applyDayProgression(nextDay, true);
          return nextDay;
        });
      }, 2200);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [isTimeLapsePlaying]);

  // Interactive View Subtab
  const [telemetryTab, setTelemetryTab] = useState<
    'atmospheric' | 'tactics' | 'crosswind' | 'trajectory' | 'weather_heatmap' | 'surface_evolution' | 'climate_history'
  >('atmospheric');

  // Convert wind degrees to cardinal direction
  const windDirectionLabel = useMemo(() => {
    const directions = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
    const idx = Math.round((windDirectionDeg % 360) / 22.5) % 16;
    return directions[idx];
  }, [windDirectionDeg]);

  // Calculated Air Density (kg/m³) using ideal gas approximation
  const airDensity = useMemo(() => {
    const tempKelvin = temperature + 273.15;
    // P in Pa, R_specific = 287.058 J/(kg·K)
    const density = (airPressure * 100) / (287.058 * tempKelvin);
    return Number(density.toFixed(3));
  }, [airPressure, temperature]);

  // -------------------------------------------------------------
  // CALCULATED RADIAL GAUGE METRICS: SWING & SPIN IMPACT INDEX
  // -------------------------------------------------------------
  // Aero Swing Potential (0-100)
  // Higher humidity + higher cloud cover + moderate temp + intact grass = higher swing
  const swingImpactIndex = useMemo(() => {
    const humidityFactor = (humidity / 100) * 45;
    const cloudFactor = (cloudCover / 100) * 20;
    const grassFactor = (grassCoverage / 100) * 25;
    const tempFactor = temperature <= 24 ? 10 : Math.max(0, 10 - (temperature - 24) * 0.8);
    const score = Math.min(99, Math.max(10, Math.round(humidityFactor + cloudFactor + grassFactor + tempFactor)));
    return score;
  }, [humidity, cloudCover, grassCoverage, temperature]);

  // Pitch Grip & Spin Impact (0-100)
  // Higher pitch wear + lower dew + dry surface + higher temp = higher turn
  const spinImpactIndex = useMemo(() => {
    const wearFactor = (pitchWear / 100) * 55;
    const dryFactor = (1 - dewLevel / 100) * 30;
    const tempFactor = (temperature / 40) * 15;
    const score = Math.min(99, Math.max(8, Math.round(wearFactor + dryFactor + tempFactor)));
    return score;
  }, [pitchWear, dewLevel, temperature]);

  // Seam Deviation Angle (degrees off pitch)
  const seamDeviationDeg = useMemo(() => {
    const deg = (grassCoverage / 100) * 1.8 + (1 - pitchWear / 100) * 0.6 + 0.3;
    return Number(deg.toFixed(1));
  }, [grassCoverage, pitchWear]);

  // Air Swing Deviation Angle (degrees in flight)
  const airSwingDeg = useMemo(() => {
    const deg = (swingImpactIndex / 100) * 2.8 + 0.4;
    return Number(deg.toFixed(1));
  }, [swingImpactIndex]);

  // Spin Turn Angle (degrees off deck)
  const spinTurnDeg = useMemo(() => {
    const deg = (spinImpactIndex / 100) * 4.4 + 0.6;
    return Number(deg.toFixed(1));
  }, [spinImpactIndex]);

  // COMPOSITE "SWING & SPIN IMPACT" INDEX (0 - 100)
  // Blends both bowling hazards into a single comprehensive stadium rating
  const compositeImpactIndex = useMemo(() => {
    // If conditions favor both swing and spin, rating can be lethal
    const raw = Math.round(swingImpactIndex * 0.52 + spinImpactIndex * 0.48);
    return Math.min(99, Math.max(15, raw));
  }, [swingImpactIndex, spinImpactIndex]);

  // Projected Par Score based on environmental friction
  const projectedParScore = useMemo(() => {
    let par = 175;
    if (compositeImpactIndex > 80) par -= 24;
    else if (compositeImpactIndex > 65) par -= 14;
    else if (compositeImpactIndex < 40) par += 20;

    // Dew gives chasing boost
    if (dewLevel > 70) par += 12;
    return par;
  }, [compositeImpactIndex, dewLevel]);

  // Assessment Classification
  const assessment = useMemo(() => {
    if (compositeImpactIndex >= 82) {
      return {
        level: 'EXTREME MULTI-THREAT',
        color: 'text-rose-400',
        bgColor: 'bg-rose-500/10 border-rose-500/30',
        needleColor: '#f43f5e',
        tactic: 'Win toss & BOWL FIRST. Pitch offers severe lateral movement early and violent grip later. Par score ~150-160.',
        favoredRole: 'Specialist Seamers & Mystery Spinners',
      };
    }
    if (swingImpactIndex > 72 && spinImpactIndex < 55) {
      return {
        level: 'PACE & SWING CORRIDOR',
        color: 'text-cyan-400',
        bgColor: 'bg-cyan-500/10 border-cyan-500/30',
        needleColor: '#06b6d4',
        tactic: 'Target full-length out-swing corridor in overs 1-6. Batters must guard front pad and leave on bounce.',
        favoredRole: 'Opening Swing Bowlers',
      };
    }
    if (spinImpactIndex > 70) {
      return {
        level: 'SPIN-DOMINATED DUST BOWL',
        color: 'text-amber-400',
        bgColor: 'bg-amber-500/10 border-amber-500/30',
        needleColor: '#f59e0b',
        tactic: 'Win toss & BAT FIRST before deteriorating. Deploy twin spinners in powerplay overs 4-6.',
        favoredRole: 'Wrist Spinners & Finger Spinners',
      };
    }
    if (dewLevel > 65) {
      return {
        level: 'DEW-HEAVY CHASER’S PARADISE',
        color: 'text-emerald-400',
        bgColor: 'bg-emerald-500/10 border-emerald-500/30',
        needleColor: '#10b981',
        tactic: 'Win toss & CHASE. The wet ball slips from bowlers’ fingers; wet outfield accelerates boundary speeds by +18%.',
        favoredRole: 'Power Hitters in 2nd Innings',
      };
    }
    return {
      level: 'BALANCED SPORTING CONTEST',
      color: 'text-sky-400',
      bgColor: 'bg-sky-500/10 border-sky-500/30',
      needleColor: '#38bdf8',
      tactic: 'True deck rewards aggressive stroke-makers and disciplined change-up seamers. Par score 180+.',
      favoredRole: 'All-Rounders & Explosive Openers',
    };
  }, [compositeImpactIndex, swingImpactIndex, spinImpactIndex, dewLevel]);

  // Apply Weather Preset with Contextual Atmospheric & Surface Audio
  const handleSelectPreset = (preset: WeatherPreset) => {
    setActivePresetId(preset.id);
    setTemperature(preset.temp);
    setHumidity(preset.humidity);
    setWindSpeed(preset.windSpeed);
    setWindDirectionDeg(preset.windDeg);
    setAirPressure(preset.pressure);
    setDewLevel(preset.dew);
    setCloudCover(preset.cloud);
    setPitchWear(preset.pitchWear);
    setGrassCoverage(preset.grass);

    if (preset.id === 'strong-crosswinds' || preset.id === 'overcast-humid') {
      cricketAudio.playWindGustSound(preset.windSpeed, { forceUnmute: true });
    } else if (preset.id === 'hot-dry') {
      cricketAudio.playPitchImpactSound('spin', 'dry', { delaySec: 0, forceUnmute: true });
    } else if (preset.id === 'warm-dewy') {
      cricketAudio.playPitchImpactSound('seam', 'damp', { delaySec: 0, forceUnmute: true });
    } else {
      cricketAudio.playPitchKeyTest(80, { forceUnmute: true });
    }
  };

  // Radial Gauge Math (Semi-circle arc 180° + 40° cushion: 140° to 400°)
  // Angle for 0 to 100 goes from -120° to +120° (240 degree span)
  const gaugeAngle = useMemo(() => {
    const minAngle = -120;
    const maxAngle = 120;
    const clamped = Math.min(100, Math.max(0, compositeImpactIndex));
    return minAngle + (clamped / 100) * (maxAngle - minAngle);
  }, [compositeImpactIndex]);

  // Voice-Powered Pitch Report Handler using SpeechSynthesis API
  const handlePlayVoicePitchReport = () => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      setPitchVoiceFeedback('Speech synthesis is not supported in this browser.');
      return;
    }

    if (isSpeakingPitchReport) {
      window.speechSynthesis.cancel();
      setIsSpeakingPitchReport(false);
      return;
    }

    const pitchReportText = `Pitch and atmospheric intelligence report for ${stadiumName}. Ambient temperature is ${temperature} degrees Celsius with relative humidity at ${humidity} percent and winds at ${windSpeed} kilometers per hour from the ${windDirectionLabel}. The surface wear index is currently ${pitchWear} percent. Seamers will extract ${airSwingDeg} degrees of aerial swing, while spinners will find sharp turn of ${spinTurnDeg} degrees off the deck. The projected first innings par score is ${projectedParScore} runs. Strategic recommendation: ${assessment.tactic}.`;

    const utterance = new SpeechSynthesisUtterance(pitchReportText);
    utterance.rate = 1.0;
    utterance.pitch = 1.05;
    utterance.onstart = () => setIsSpeakingPitchReport(true);
    utterance.onend = () => {
      setIsSpeakingPitchReport(false);
      setPitchVoiceFeedback(null);
    };
    utterance.onerror = () => {
      setIsSpeakingPitchReport(false);
      setPitchVoiceFeedback(null);
    };

    window.speechSynthesis.speak(utterance);
    cricketAudio.playBatHit();
  };

  // Speech Recognition listener for user asking: "What is the pitch condition?"
  const startListeningPitchQuery = () => {
    if (typeof window === 'undefined') return;

    if (isSpeakingPitchReport) {
      window.speechSynthesis.cancel();
      setIsSpeakingPitchReport(false);
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setPitchVoiceFeedback('Voice recognition not available; playing pitch condition readout directly.');
      handlePlayVoicePitchReport();
      return;
    }

    if (isListeningVoicePitch) {
      setIsListeningVoicePitch(false);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'en-US';

      recognition.onstart = () => {
        setIsListeningVoicePitch(true);
        setPitchVoiceFeedback('Listening... Ask: "What is the pitch condition?"');
        cricketAudio.playBatHit();
      };

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setIsListeningVoicePitch(false);
        setPitchVoiceFeedback(`Question received: "${transcript}" · Reading out pitch report`);
        handlePlayVoicePitchReport();
      };

      recognition.onerror = (err: any) => {
        console.warn('Pitch mic error:', err);
        setIsListeningVoicePitch(false);
        setPitchVoiceFeedback('Mic timed out. Playing pitch report directly.');
        handlePlayVoicePitchReport();
      };

      recognition.onend = () => {
        setIsListeningVoicePitch(false);
      };

      recognition.start();
    } catch {
      setIsListeningVoicePitch(false);
      handlePlayVoicePitchReport();
    }
  };

  return (
    <div className="relative rounded-3xl border border-cyan-500/30 bg-gradient-to-b from-slate-950 via-[#030d22] to-slate-950 p-5 sm:p-7 space-y-7 shadow-2xl backdrop-blur-xl overflow-hidden">
      {/* Background Stadium Glow Elements */}
      <div className="absolute top-0 right-1/4 -mt-16 h-72 w-72 rounded-full bg-cyan-500/10 blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-1/4 -mb-16 h-72 w-72 rounded-full bg-indigo-500/10 blur-3xl pointer-events-none" />

      {/* -------------------------------------------------------------
          HEADER: ATMOSPHERIC INTELLIGENCE TITLE & CURRENT STADIUM
          ------------------------------------------------------------- */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 border-b border-cyan-500/20 pb-5">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="flex h-2.5 w-2.5 rounded-full bg-cyan-400 animate-ping" />
            <span className="text-[11px] font-mono font-black uppercase tracking-wider text-cyan-400">
              REAL-TIME ATMOSPHERIC INTELLIGENCE · LIVE TELEMETRY
            </span>
            <span className="rounded-md bg-cyan-500/20 border border-cyan-400/40 px-2 py-0.5 text-[9px] font-mono text-cyan-300">
              CALIBRATED v4.8
            </span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight flex items-center gap-2.5">
            <span>{stadiumName}</span>
            <span className="text-sm font-normal text-slate-400 font-mono">
              ({temperature}°C · {humidity}% RH · {windSpeed} km/h {windDirectionLabel})
            </span>
          </h2>
          <p className="text-xs text-slate-400 max-w-2xl font-sans">
            Continuous environmental monitoring analyzing air density, boundary-layer turbulence, thermal dew condensation, and pitch friction matrix.
          </p>
        </div>

        {/* Action Controls & Voice-Powered Report */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Voice-Powered Pitch Report: Listen to user asking 'What is the pitch condition?' */}
          <button
            onClick={startListeningPitchQuery}
            className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-mono font-bold transition-all cursor-pointer ${
              isListeningVoicePitch
                ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/30 animate-pulse'
                : 'bg-slate-900 border border-cyan-500/40 text-cyan-300 hover:bg-cyan-500/20 hover:text-white'
            }`}
            title="Ask voice question: 'What is the pitch condition?'"
          >
            <Mic className={`h-3.5 w-3.5 ${isListeningVoicePitch ? 'text-white animate-bounce' : 'text-cyan-400'}`} />
            <span>{isListeningVoicePitch ? 'Listening: Ask Condition...' : '🎙️ Mic Question'}</span>
          </button>

          {/* Quick Voice Question Pill */}
          <button
            onClick={() => {
              setPitchVoiceFeedback('Question triggered: "What is the pitch condition?" · Reading out key findings...');
              handlePlayVoicePitchReport();
            }}
            className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-mono font-bold transition-all cursor-pointer ${
              isSpeakingPitchReport
                ? 'bg-cyan-500 text-slate-950 font-black shadow-lg shadow-cyan-500/30'
                : 'bg-cyan-950/40 border border-cyan-500/40 text-cyan-300 hover:bg-cyan-500/20 hover:text-white'
            }`}
            title="Read out pitch conditions using speech synthesis"
          >
            {isSpeakingPitchReport ? (
              <>
                <VolumeX className="h-3.5 w-3.5" />
                <span>Stop Pitch Report</span>
              </>
            ) : (
              <>
                <Volume2 className="h-3.5 w-3.5 text-cyan-400" />
                <span>Ask: "What is the pitch condition?"</span>
              </>
            )}
          </button>

          {/* Tactical Status Pill */}
          <div className={`rounded-2xl border px-3.5 py-1.5 text-right ${assessment.bgColor}`}>
            <span className="text-[9px] font-mono text-slate-400 block uppercase">Hazard Level</span>
            <span className={`text-xs font-mono font-black uppercase ${assessment.color}`}>
              {assessment.level}
            </span>
          </div>

          {/* Dedicated Soil Moisture & Pitch Hardness Toggle */}
          <button
            type="button"
            onClick={() => {
              cricketAudio.playUiClick();
              setShowMoistureHardness((prev) => !prev);
            }}
            className={`flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
              showMoistureHardness
                ? 'border-cyan-400 bg-cyan-400 text-slate-950 font-bold'
                : 'border-slate-700 bg-slate-900 text-slate-300 hover:text-white'
            }`}
            title="Toggle real-time Soil Moisture Evaporation & Pitch Hardness heatmap"
          >
            <Droplets className="h-3.5 w-3.5 shrink-0" />
            <span>Soil Moisture &amp; Hardness</span>
          </button>

          {/* Surface AR Overlay button */}
          <button
            onClick={() => {
              setShowArModal(true);
              cricketAudio.playBatHit();
              triggerHaptic(HAPTIC_PATTERNS.TAP);
            }}
            className="flex items-center gap-1.5 rounded-xl border-2 border-cyan-400 bg-gradient-to-r from-cyan-500/20 via-sky-500/30 to-cyan-500/20 px-3.5 py-1.5 text-xs font-mono font-black text-cyan-200 hover:bg-cyan-500/30 shadow-[0_0_20px_rgba(6,182,212,0.4)] transition-all cursor-pointer animate-pulse"
            title="Launch Augmented Reality Pitch Cam"
          >
            <Camera className="h-3.5 w-3.5 text-cyan-300" />
            <span>⚡ Surface AR Overlay</span>
          </button>

          {onApplyConditions && (
            <button
              onClick={() => {
                onApplyConditions({
                  swingImpactIndex,
                  spinImpactIndex,
                  compositeImpact: compositeImpactIndex,
                  projectedPar: projectedParScore,
                  tossRecommendation: assessment.tactic,
                });
                cricketAudio.playSix();
              }}
              className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 px-4 py-2 text-xs font-bold text-slate-950 hover:brightness-110 shadow-lg shadow-cyan-500/20 cursor-pointer transition-all"
            >
              <Zap className="h-4 w-4" />
              <span>Apply to Match Simulator</span>
            </button>
          )}
        </div>
      </div>

      {/* -------------------------------------------------------------
          TIME-LAPSE ANIMATION SLIDER: DAY 1 TO DAY 5 EVOLUTION
          ------------------------------------------------------------- */}
      <div className="rounded-2xl border border-cyan-500/30 bg-slate-900/90 p-4 space-y-3 shadow-md">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-2.5">
          <div className="flex items-center gap-2">
            <Sliders className="h-4 w-4 text-cyan-400" />
            <span className="text-xs font-mono font-bold text-white uppercase">
              Time-Lapse Pitch Wear Evolution · Day 1 to Day 5 Simulation
            </span>
          </div>

          <div className="flex items-center gap-2 text-xs font-mono">
            <button
              onClick={() => {
                setIsTimeLapsePlaying(!isTimeLapsePlaying);
                cricketAudio.playUiClick();
                triggerHaptic(HAPTIC_PATTERNS.TAP);
              }}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                isTimeLapsePlaying
                  ? 'bg-amber-500 text-slate-950 font-black animate-pulse'
                  : 'bg-cyan-500 text-slate-950 hover:bg-cyan-400'
              }`}
            >
              {isTimeLapsePlaying ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5 fill-current" />}
              <span>{isTimeLapsePlaying ? 'Pause Time-Lapse' : 'Play Time-Lapse'}</span>
            </button>
            <span className="text-cyan-300 font-black bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-800">
              DAY {matchDay} OF 5
            </span>
          </div>
        </div>

        {/* Day selection pills */}
        <div className="grid grid-cols-5 gap-2 font-mono text-xs">
          {[1, 2, 3, 4, 5].map((d) => (
            <button
              key={d}
              onClick={() => {
                applyDayProgression(d, true);
                triggerHaptic(HAPTIC_PATTERNS.TAP);
              }}
              className={`p-2 rounded-xl text-center border transition-all cursor-pointer ${
                matchDay === d
                  ? 'border-cyan-400 bg-cyan-500/25 text-white font-black shadow-md shadow-cyan-500/30 scale-102'
                  : 'border-slate-800 bg-slate-950/70 text-slate-400 hover:border-slate-700 hover:text-white'
              }`}
            >
              <span className="block font-bold">Day {d}</span>
              <span className="text-[10px] text-cyan-300 block opacity-80">
                {d === 1
                  ? 'Turf Seam'
                  : d === 2
                  ? 'Glaze Burn'
                  : d === 3
                  ? 'Footmarks'
                  : d === 4
                  ? 'Loam Cracks'
                  : 'Minefield Turn'}
              </span>
            </button>
          ))}
        </div>

        {/* Live Degradation Metrics Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 font-mono text-xs">
          <div className="bg-slate-950 p-2 rounded-lg border border-slate-800 text-slate-300">
            <span className="text-[10px] text-slate-400 block">Grass Coverage:</span>
            <strong className="text-emerald-400">{grassCoverage}%</strong>
          </div>
          <div className="bg-slate-950 p-2 rounded-lg border border-slate-800 text-slate-300">
            <span className="text-[10px] text-slate-400 block">Surface Cracks & Wear:</span>
            <strong className="text-amber-400">{pitchWear}%</strong>
          </div>
          <div className="bg-slate-950 p-2 rounded-lg border border-slate-800 text-slate-300">
            <span className="text-[10px] text-slate-400 block">Aerial Seam Deviation:</span>
            <strong className="text-sky-300">+{seamDeviationDeg}°</strong>
          </div>
          <div className="bg-slate-950 p-2 rounded-lg border border-slate-800 text-slate-300">
            <span className="text-[10px] text-slate-400 block">Off-Deck Spin Angle:</span>
            <strong className="text-rose-400">+{spinTurnDeg}°</strong>
          </div>
        </div>
      </div>

      {/* Voice Feedback Banner */}
      {pitchVoiceFeedback && (
        <div className="rounded-xl border border-cyan-500/40 bg-cyan-950/60 p-3 text-xs font-mono text-cyan-300 flex items-center justify-between shadow-lg shadow-cyan-500/10 animate-in fade-in duration-200">
          <span className="flex items-center gap-2">
            <Volume2 className="h-4 w-4 text-cyan-400 shrink-0 animate-pulse" />
            <span>{pitchVoiceFeedback}</span>
          </span>
          <button
            onClick={() => setPitchVoiceFeedback(null)}
            className="text-[10px] text-slate-400 hover:text-white px-2 py-0.5 rounded bg-slate-900 border border-slate-800"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* -------------------------------------------------------------
          WEATHER PRESET SELECTOR BAR
          ------------------------------------------------------------- */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs font-mono text-slate-400">
          <span className="flex items-center gap-1.5 font-bold text-cyan-300">
            <Compass className="h-3.5 w-3.5 text-cyan-400" />
            <span>GLOBAL CRICKET MICRO-CLIMATE PRESETS</span>
          </span>
          <span className="text-[11px] text-slate-500">Click to simulate real atmospheric conditions</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
          {WEATHER_PRESETS.map((p) => {
            const isSelected = activePresetId === p.id;
            return (
              <button
                key={p.id}
                onClick={() => handleSelectPreset(p)}
                className={`group rounded-2xl border p-3 text-left transition-all duration-200 cursor-pointer relative overflow-hidden flex flex-col justify-between ${
                  isSelected
                    ? 'border-cyan-400 bg-slate-900/90 shadow-lg shadow-cyan-500/20 ring-1 ring-cyan-400/50'
                    : 'border-slate-800 bg-slate-950/70 hover:border-slate-700 hover:bg-slate-900/50'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xl">{p.icon}</span>
                  <span className="text-[10px] font-mono text-slate-400 font-bold">
                    {p.temp}°C · {p.humidity}%
                  </span>
                </div>
                <div>
                  <h4 className={`text-xs font-bold truncate ${isSelected ? 'text-cyan-300' : 'text-slate-200'}`}>
                    {p.name}
                  </h4>
                  <p className="text-[10px] text-slate-500 truncate font-mono mt-0.5">{p.windSpeed} km/h {p.windLabel}</p>
                </div>
                {isSelected && (
                  <div className="absolute top-1.5 right-1.5 flex h-2 w-2 rounded-full bg-cyan-400" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* -------------------------------------------------------------
          MAIN TELEMETRY GRID: RADIAL GAUGE + REAL-TIME SENSORS
          ------------------------------------------------------------- */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* LEFT / CENTER: HIGH-TECH RADIAL GAUGE (SWING & SPIN IMPACT INDEX) */}
        <div className="lg:col-span-5 rounded-2xl border border-cyan-500/20 bg-slate-950/80 p-5 flex flex-col items-center justify-between shadow-inner relative overflow-hidden">
          <div className="w-full flex items-center justify-between border-b border-slate-800/80 pb-2.5 text-xs font-mono">
            <span className="font-bold text-slate-300 flex items-center gap-1.5">
              <Gauge className="h-4 w-4 text-cyan-400" />
              <span>SWING & SPIN IMPACT INDEX</span>
            </span>
            <span className="text-[10px] text-slate-500">AERODYNAMIC MATRIX</span>
          </div>

          {/* SVG RADIAL GAUGE COMPONENT */}
          <div className="relative my-4 flex items-center justify-center">
            <svg className="w-64 h-64 -rotate-90 transform" viewBox="0 0 240 240">
              {/* Outer Glow Halo Ring */}
              <circle
                cx="120"
                cy="120"
                r="95"
                fill="none"
                stroke="currentColor"
                strokeWidth="1"
                className="text-slate-800"
              />

              {/* Background Arc Track (240 degrees: circumference = 2 * PI * 85 = 534.07, 240 deg = 356) */}
              <circle
                cx="120"
                cy="120"
                r="85"
                fill="none"
                stroke="#1e293b"
                strokeWidth="14"
                strokeDasharray="356 534"
                strokeDashoffset="-89"
                strokeLinecap="round"
              />

              {/* Multi-Colored Segment Gradients */}
              <defs>
                <linearGradient id="gaugeGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#06b6d4" />
                  <stop offset="35%" stopColor="#10b981" />
                  <stop offset="70%" stopColor="#f59e0b" />
                  <stop offset="100%" stopColor="#f43f5e" />
                </linearGradient>
                <filter id="gaugeGlow" x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur stdDeviation="3" result="blur" />
                  <feComposite in="SourceGraphic" in2="blur" operator="over" />
                </filter>
              </defs>

              {/* Active Progress Arc */}
              <circle
                cx="120"
                cy="120"
                r="85"
                fill="none"
                stroke="url(#gaugeGradient)"
                strokeWidth="14"
                strokeDasharray="356 534"
                strokeDashoffset={356 - (compositeImpactIndex / 100) * 356 - 89}
                strokeLinecap="round"
                filter="url(#gaugeGlow)"
                className="transition-all duration-700 ease-out"
              />

              {/* Tick Marks around the gauge */}
              {[0, 20, 40, 60, 80, 100].map((tick) => {
                const angle = -120 + (tick / 100) * 240;
                const rad = (angle * Math.PI) / 180;
                const x1 = 120 + 72 * Math.cos(rad);
                const y1 = 120 + 72 * Math.sin(rad);
                const x2 = 120 + 64 * Math.cos(rad);
                const y2 = 120 + 64 * Math.sin(rad);
                return (
                  <line
                    key={tick}
                    x1={x1}
                    y1={y1}
                    x2={x2}
                    y2={y2}
                    stroke="#475569"
                    strokeWidth="1.5"
                  />
                );
              })}
            </svg>

            {/* NEEDLE POINTER (Rotated from Center) */}
            <div
              className="absolute h-24 w-1 origin-bottom transition-transform duration-700 ease-out"
              style={{
                transform: `rotate(${gaugeAngle}deg)`,
                bottom: '50%',
                left: 'calc(50% - 2px)',
              }}
            >
              <div
                className="h-full w-full rounded-t-full shadow-lg"
                style={{
                  backgroundColor: assessment.needleColor,
                  boxShadow: `0 0 12px ${assessment.needleColor}`,
                }}
              />
            </div>

            {/* Center Dial Hub */}
            <div className="absolute flex flex-col items-center justify-center text-center">
              <span className="text-[10px] font-mono uppercase text-slate-400 font-bold tracking-wider">
                IMPACT SCORE
              </span>
              <div className="flex items-baseline">
                <span className="text-4xl font-black text-white font-mono tracking-tighter">
                  {compositeImpactIndex}
                </span>
                <span className="text-xs font-mono text-cyan-400 ml-0.5">/100</span>
              </div>
              <span className={`text-[10px] font-mono font-bold uppercase mt-0.5 ${assessment.color}`}>
                {assessment.level.split(' ')[0]}
              </span>
            </div>
          </div>

          {/* DUAL SUB-GAUGES: SWING VS SPIN BREAKDOWN */}
          <div className="w-full grid grid-cols-2 gap-3 pt-2 border-t border-slate-800/80">
            {/* Aero Swing Metric */}
            <div className="rounded-xl border border-cyan-500/20 bg-slate-900/60 p-3 space-y-1.5">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-cyan-400 font-bold flex items-center gap-1">
                  <Wind className="h-3 w-3" />
                  <span>Air Swing</span>
                </span>
                <strong className="text-white">{swingImpactIndex}/100</strong>
              </div>
              <div className="h-2 rounded-full bg-slate-800 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 transition-all duration-500"
                  style={{ width: `${swingImpactIndex}%` }}
                />
              </div>
              <div className="flex justify-between text-[10px] font-mono text-slate-400">
                <span>Curve: ~{airSwingDeg}°</span>
                <span className="text-cyan-300 font-bold">
                  {swingImpactIndex > 70 ? 'Extreme Hooping' : swingImpactIndex > 45 ? 'Standard Arc' : 'Mild Drift'}
                </span>
              </div>
            </div>

            {/* Surface Grip & Turn Metric */}
            <div className="rounded-xl border border-amber-500/20 bg-slate-900/60 p-3 space-y-1.5">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-amber-400 font-bold flex items-center gap-1">
                  <Compass className="h-3 w-3" />
                  <span>Deck Turn</span>
                </span>
                <strong className="text-white">{spinImpactIndex}/100</strong>
              </div>
              <div className="h-2 rounded-full bg-slate-800 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-amber-500 to-rose-500 transition-all duration-500"
                  style={{ width: `${spinImpactIndex}%` }}
                />
              </div>
              <div className="flex justify-between text-[10px] font-mono text-slate-400">
                <span>Break: ~{spinTurnDeg}°</span>
                <span className="text-amber-300 font-bold">
                  {spinImpactIndex > 70 ? 'Sharp Turn' : spinImpactIndex > 45 ? 'Moderate Grip' : 'Slide-on'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT: REAL-TIME SIMULATED SENSOR CONTROLS & PHYSICAL METRICS */}
        <div className="lg:col-span-7 rounded-2xl border border-cyan-500/20 bg-slate-950/80 p-5 space-y-5 flex flex-col justify-between">
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
            <span className="text-xs font-mono font-bold text-slate-300 flex items-center gap-2">
              <Activity className="h-4 w-4 text-cyan-400" />
              <span>LIVE ENVIRONMENTAL SENSORS & MICRO-TUNING</span>
            </span>
            <div className="flex items-center gap-2 text-[10px] font-mono text-slate-400">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>SENSORS ACTIVE</span>
            </div>
          </div>

          {/* 6 Core Sensor Controls with Sliders */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-mono">
            {/* 1. Relative Humidity */}
            <div className="rounded-xl border border-slate-800/80 bg-slate-900/50 p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-slate-300 font-bold">
                  <Droplets className="h-3.5 w-3.5 text-cyan-400" />
                  <span>Humidity</span>
                </span>
                <span className="text-cyan-400 font-bold">{humidity}% RH</span>
              </div>
              <input
                type="range"
                min="20"
                max="95"
                value={humidity}
                onChange={(e) => {
                  setHumidity(Number(e.target.value));
                  setActivePresetId('custom');
                  cricketAudio.playSliderTick();
                }}
                className="w-full accent-cyan-400 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
              />
              <span className="text-[10px] text-slate-500 block truncate">
                {humidity > 75 ? 'Dense vapor layer assists swing' : 'Crisp dry air promotes ball preservation'}
              </span>
            </div>

            {/* 2. Temperature */}
            <div className="rounded-xl border border-slate-800/80 bg-slate-900/50 p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-slate-300 font-bold">
                  <Thermometer className="h-3.5 w-3.5 text-rose-400" />
                  <span>Temperature</span>
                </span>
                <span className="text-rose-400 font-bold">{temperature}°C ({Math.round(temperature * 1.8 + 32)}°F)</span>
              </div>
              <input
                type="range"
                min="10"
                max="45"
                value={temperature}
                onChange={(e) => {
                  setTemperature(Number(e.target.value));
                  setActivePresetId('custom');
                  cricketAudio.playSliderTick();
                }}
                className="w-full accent-rose-400 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
              />
              <span className="text-[10px] text-slate-500 block truncate">
                {temperature > 32 ? 'Surface baking opens fissures' : 'Cool deck preserves grass moisture'}
              </span>
            </div>

            {/* 3. Wind Speed & Direction */}
            <div className="rounded-xl border border-slate-800/80 bg-slate-900/50 p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-slate-300 font-bold">
                  <Wind className="h-3.5 w-3.5 text-emerald-400" />
                  <span>Wind Velocity</span>
                </span>
                <span className="text-emerald-400 font-bold">{windSpeed} km/h ({windDirectionLabel})</span>
              </div>
              <input
                type="range"
                min="4"
                max="50"
                value={windSpeed}
                onChange={(e) => {
                  setWindSpeed(Number(e.target.value));
                  setActivePresetId('custom');
                  cricketAudio.playSliderTick();
                }}
                className="w-full accent-emerald-400 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
              />
              <div className="flex items-center justify-between text-[10px] text-slate-400">
                <span>Vector: {windDirectionDeg}°</span>
                <button
                  onClick={() => {
                    setWindDirectionDeg((prev) => (prev + 45) % 360);
                    cricketAudio.playWindGustSound(windSpeed, { forceUnmute: true });
                  }}
                  className="text-cyan-400 hover:underline cursor-pointer"
                >
                  Rotate 45° ↻
                </button>
              </div>
            </div>

            {/* 4. Evening Dew Level */}
            <div className="rounded-xl border border-slate-800/80 bg-slate-900/50 p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-slate-300 font-bold">
                  <Sparkles className="h-3.5 w-3.5 text-sky-400" />
                  <span>Dew Index</span>
                </span>
                <span className="text-sky-400 font-bold">{dewLevel}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={dewLevel}
                onChange={(e) => {
                  setDewLevel(Number(e.target.value));
                  setActivePresetId('custom');
                  cricketAudio.playSliderTick();
                }}
                className="w-full accent-sky-400 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
              />
              <span className="text-[10px] text-slate-500 block truncate">
                {dewLevel > 60 ? 'Extreme skid; ball like bar of soap' : 'Dry ball seams maintain thumb grip'}
              </span>
            </div>

            {/* 5. Pitch Surface Wear */}
            <div className="rounded-xl border border-slate-800/80 bg-slate-900/50 p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-slate-300 font-bold">
                  <Layers className="h-3.5 w-3.5 text-amber-400" />
                  <span>Pitch Wear & Cracks</span>
                </span>
                <span className="text-amber-400 font-bold">{pitchWear}% Wear</span>
              </div>
              <input
                type="range"
                min="5"
                max="95"
                value={pitchWear}
                onChange={(e) => {
                  setPitchWear(Number(e.target.value));
                  setActivePresetId('custom');
                  cricketAudio.playSliderTick();
                }}
                className="w-full accent-amber-400 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
              />
              <span className="text-[10px] text-slate-500 block truncate">
                {pitchWear > 60 ? 'Puffing dust on impact; unpredictable bounce' : 'Compact virgin clay; consistent roll'}
              </span>
            </div>

            {/* 6. Grass Live Foliage Coverage */}
            <div className="rounded-xl border border-slate-800/80 bg-slate-900/50 p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-slate-300 font-bold">
                  <Sun className="h-3.5 w-3.5 text-lime-400" />
                  <span>Grass Foliage Cover</span>
                </span>
                <span className="text-lime-400 font-bold">{grassCoverage}% (6-8mm)</span>
              </div>
              <input
                type="range"
                min="5"
                max="95"
                value={grassCoverage}
                onChange={(e) => {
                  setGrassCoverage(Number(e.target.value));
                  setActivePresetId('custom');
                  cricketAudio.playSliderTick();
                }}
                className="w-full accent-lime-400 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
              />
              <span className="text-[10px] text-slate-500 block truncate">
                {grassCoverage > 60 ? 'Lateral seam bite & spongy steep carry' : 'Bald surface; direct soil engagement'}
              </span>
            </div>
          </div>

          {/* SENSOR BAROMETRIC READOUTS ROW */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-slate-800/80 text-[11px] font-mono">
            <div className="rounded-lg bg-slate-900 p-2 text-center">
              <span className="text-slate-500 block text-[9px]">AIR DENSITY</span>
              <span className="font-bold text-white">{airDensity} kg/m³</span>
            </div>
            <div className="rounded-lg bg-slate-900 p-2 text-center">
              <span className="text-slate-500 block text-[9px]">BAROMETER</span>
              <span className="font-bold text-cyan-300">{airPressure} hPa</span>
            </div>
            <div className="rounded-lg bg-slate-900 p-2 text-center">
              <span className="text-slate-500 block text-[9px]">SEAM CUT</span>
              <span className="font-bold text-emerald-400">±{seamDeviationDeg}° Off Pitch</span>
            </div>
            <div className="rounded-lg bg-slate-900 p-2 text-center">
              <span className="text-slate-500 block text-[9px]">PROJECTED PAR</span>
              <span className="font-bold text-amber-400">{projectedParScore} Runs</span>
            </div>
          </div>
        </div>
      </div>

      {/* -------------------------------------------------------------
          DYNAMIC SURFACE INTERACTION (22-YARD FRICTION μ & BOUNCE mm)
          + TOGGLEABLE FIELDING HEATMAP OVERLAY LAYER
          ------------------------------------------------------------- */}
      <DynamicSurfaceInteraction
        temperature={temperature}
        humidity={humidity}
        dewLevel={dewLevel}
        pitchWear={pitchWear}
        grassCoverage={grassCoverage}
        venueName={stadiumName}
        onChangeTemperature={(nextTemp) => {
          setTemperature(nextTemp);
          setActivePresetId('custom');
        }}
        onChangeHumidity={(nextHumidity) => {
          setHumidity(nextHumidity);
          setActivePresetId('custom');
        }}
        showFieldingHeatmap={showFieldingHeatmap}
        onToggleFieldingHeatmap={() => setShowFieldingHeatmap((prev) => !prev)}
      />

      {showFieldingHeatmap && <FieldingHeatmap venueName={stadiumName} />}

      {/* -------------------------------------------------------------
          SOIL SHEAR / MOISTURE CIRCULAR DIALS & 360° WIND ROSE RADAR
          ------------------------------------------------------------- */}
      <PitchD3AnalyticsSuite
        stadiumName={stadiumName}
        temperature={temperature}
        humidity={humidity}
        windSpeed={windSpeed}
        windDirectionDeg={windDirectionDeg}
        windDirectionLabel={windDirectionLabel}
        dewLevel={dewLevel}
        pitchWear={pitchWear}
        grassCoverage={grassCoverage}
        matchDay={matchDay}
        onSelectWindDirection={(deg) => {
          setWindDirectionDeg(deg);
          setActivePresetId('custom');
        }}
      />

      {/* -------------------------------------------------------------
          INTERACTIVE SUB-VIEWS: TACTICAL ENGINE & STADIUM CROSSWIND
          ------------------------------------------------------------- */}
      <div className="space-y-4">
        {/* Navigation Tabs */}
        <div className="flex flex-wrap items-center gap-2 border-b border-cyan-500/20 pb-2.5">
          {[
            { id: 'atmospheric', label: 'Atmospheric Intelligence & Radial Impact Gauge', icon: Activity },
            { id: 'tactics', label: 'AI Tactical Match Blueprint & Toss Calculus', icon: Shield },
            { id: 'weather_heatmap', label: 'Weather Impact Heatmap & Speed Loss', icon: CloudRain },
            { id: 'surface_evolution', label: 'Pitch Surface Wear & Evolution Engine', icon: Layers },
            { id: 'climate_history', label: '10-Yr Historic Climate & Scoring Timeline', icon: TrendingUp },
            { id: 'crosswind', label: 'Stadium Bowl Crosswind & Aerodynamics Vector', icon: Wind },
            { id: 'trajectory', label: 'Atmospheric Ball Trajectory & Seam Telemetry', icon: Compass },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = telemetryTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  setTelemetryTab(tab.id as any);
                  cricketAudio.playBatHit();
                }}
                className={`flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-mono font-bold transition-all cursor-pointer ${
                  isActive
                    ? 'bg-cyan-500 text-slate-950 font-black shadow-md shadow-cyan-500/30'
                    : 'text-slate-400 hover:text-white hover:bg-slate-900/80 border border-transparent'
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* TAB 0: ATMOSPHERIC INTELLIGENCE PANEL (CINEMATIC GLASSMORPHISM) */}
        {telemetryTab === 'atmospheric' && (
          <AtmosphericIntelligencePanel
            initialTemperature={temperature}
            initialHumidity={humidity}
            initialWindSpeed={windSpeed}
            initialWindDirectionDeg={windDirectionDeg}
            initialAirPressure={airPressure}
            initialDewLevel={dewLevel}
            pitchWear={pitchWear}
            grassCoverage={grassCoverage}
            stadiumName={stadiumName}
            onApplyConditions={onApplyConditions}
          />
        )}

        {/* TAB 1: AI TACTICAL MATCH BLUEPRINT */}
        {telemetryTab === 'tactics' && (
          <div className="rounded-2xl border border-cyan-500/20 bg-slate-950/70 p-5 space-y-4 animate-in fade-in duration-200">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 font-mono text-xs">
              {/* Toss Decision */}
              <div className="rounded-xl border border-cyan-500/30 bg-slate-900/80 p-4 space-y-2">
                <span className="text-[10px] text-cyan-400 font-bold uppercase block">
                  RECOMMENDED TOSS DECISION
                </span>
                <div className="text-lg font-black text-white">
                  {dewLevel > 55 ? 'BOWL FIRST (CHASE DEW)' : pitchWear > 60 ? 'BAT FIRST (AVOID TURNING MINEFIELD)' : 'BOWL FIRST (EXPLOIT NEW BALL)'}
                </div>
                <p className="text-xs text-slate-300 font-sans leading-relaxed">
                  {assessment.tactic}
                </p>
              </div>

              {/* Bowler Matchups */}
              <div className="rounded-xl border border-emerald-500/30 bg-slate-900/80 p-4 space-y-2">
                <span className="text-[10px] text-emerald-400 font-bold uppercase block">
                  LETHAL BOWLING ARSENAL
                </span>
                <div className="text-base font-bold text-white">
                  {assessment.favoredRole}
                </div>
                <ul className="text-xs text-slate-400 space-y-1 list-disc list-inside">
                  <li>Full corridor length (4.5m - 6.0m from stumps)</li>
                  <li>In-swinger trajectory deviation: ~{airSwingDeg}°</li>
                  <li>Off-break & leg-break grip: ~{spinTurnDeg}°</li>
                </ul>
              </div>

              {/* Batting Strategy */}
              <div className="rounded-xl border border-amber-500/30 bg-slate-900/80 p-4 space-y-2">
                <span className="text-[10px] text-amber-400 font-bold uppercase block">
                  BATTING PHASE GAMEPLAN
                </span>
                <div className="text-base font-bold text-white">
                  Target Par Score: {projectedParScore}
                </div>
                <p className="text-xs text-slate-300 font-sans leading-relaxed">
                  Powerplay overs 1-6 are highest risk. Batters should stand outside crease to negate late swing, then accelerate once ball loses shine after over 10.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: STADIUM BOWL CROSSWIND & AERODYNAMICS */}
        {telemetryTab === 'crosswind' && (
          <div className="rounded-2xl border border-cyan-500/20 bg-slate-950/70 p-5 space-y-4 animate-in fade-in duration-200">
            <div className="flex flex-col md:flex-row items-center gap-6">
              {/* Stadium Compass Visualizer */}
              <div className="relative h-48 w-48 shrink-0 rounded-full border-2 border-dashed border-cyan-500/40 bg-slate-900 flex items-center justify-center">
                {/* Cardinal markers */}
                <span className="absolute top-2 text-[10px] font-mono font-bold text-cyan-400">N</span>
                <span className="absolute bottom-2 text-[10px] font-mono font-bold text-slate-500">S</span>
                <span className="absolute right-2 text-[10px] font-mono font-bold text-slate-500">E</span>
                <span className="absolute left-2 text-[10px] font-mono font-bold text-slate-500">W</span>

                {/* Pitch Strip in Stadium center */}
                <div className="h-24 w-4 rounded bg-amber-700/60 border border-amber-500/80 relative">
                  <span className="absolute -top-3 text-[8px] font-mono text-slate-400">North</span>
                  <span className="absolute -bottom-3 text-[8px] font-mono text-slate-400">South</span>
                </div>

                {/* Rotating Wind Arrow */}
                <div
                  className="absolute h-36 w-1 origin-center transition-transform duration-500 pointer-events-none"
                  style={{ transform: `rotate(${windDirectionDeg}deg)` }}
                >
                  <div className="h-10 w-full bg-gradient-to-t from-transparent to-emerald-400 relative">
                    <div className="absolute top-0 -left-1.5 border-l-4 border-r-4 border-b-8 border-l-transparent border-r-transparent border-b-emerald-400" />
                  </div>
                </div>

                <div className="absolute bottom-3 rounded bg-slate-950/90 px-2 py-0.5 text-[9px] font-mono text-emerald-300">
                  {windSpeed} km/h {windDirectionLabel}
                </div>
              </div>

              {/* Crosswind Tactical Analysis */}
              <div className="space-y-3 font-mono text-xs flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-cyan-400 font-bold text-sm">STADIUM VENTURI WIND CHANNELING</span>
                  <span className="rounded bg-slate-800 px-2 py-0.5 text-[10px] text-slate-300">
                    Roof: OPEN
                  </span>
                </div>
                <p className="text-xs text-slate-300 font-sans leading-relaxed">
                  The {windDirectionLabel} wind at {windSpeed} km/h blows diagonally across the 22-yard strip. Bowlers running in from the Pavilion End gain natural inward tailwind assist, whereas the Media Centre End offers outward drift towards the slips.
                </p>
                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-2.5">
                    <span className="text-[10px] text-slate-500 block">RIGHT-HAND BATTER MATCHUP</span>
                    <strong className="text-emerald-400 text-xs">
                      {windSpeed > 20 ? 'Assisted Outswinger Corridor' : 'Standard Boundary Distance'}
                    </strong>
                  </div>
                  <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-2.5">
                    <span className="text-[10px] text-slate-500 block">DOWNWIND BOUNDARY CARRY</span>
                    <strong className="text-amber-400 text-xs">
                      +{Math.round((windSpeed / 10) * 1.8)} meters carry to square leg
                    </strong>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: ATMOSPHERIC BALL TRAJECTORY & SEAM TELEMETRY */}
        {telemetryTab === 'trajectory' && (
          <div className="rounded-2xl border border-cyan-500/20 bg-slate-950/70 p-5 space-y-4 animate-in fade-in duration-200">
            <span className="text-xs font-mono font-bold text-cyan-400 uppercase block">
              HAWK-EYE FLIGHT DRIFT & OFF-DECK SEAM DEVIATION MAP
            </span>

            {/* Trajectory Simulation Diagram */}
            <div className="relative h-32 w-full rounded-2xl border border-slate-800 bg-slate-900/90 overflow-hidden p-4 flex flex-col justify-between">
              <div className="flex justify-between text-[10px] font-mono text-slate-400">
                <span>BOWLER RELEASE POINT (22m)</span>
                <span className="text-cyan-400">Air Curve: {airSwingDeg}° In-Flight</span>
                <span className="text-amber-400">Seam Cut: {seamDeviationDeg}° On Pitch</span>
                <span>STRIKER STUMPS (0m)</span>
              </div>

              {/* Dynamic SVG Delivery Curve */}
              <svg className="w-full h-16" viewBox="0 0 600 60" preserveAspectRatio="none">
                {/* Straight baseline path */}
                <line x1="20" y1="30" x2="580" y2="30" stroke="#334155" strokeDasharray="4 4" strokeWidth="1" />

                {/* Simulated Air Swing Arc + Pitch Bounce Break */}
                <path
                  d={`M 20 30 Q 300 ${30 - airSwingDeg * 6} 420 30 L 580 ${30 + seamDeviationDeg * 7}`}
                  fill="none"
                  stroke="#06b6d4"
                  strokeWidth="3"
                  className="transition-all duration-500"
                />

                {/* Pitch Impact Point Circle */}
                <circle cx="420" cy="30" r="5" fill="#f59e0b" />
                <text x="400" y="52" fill="#f59e0b" fontSize="10" fontFamily="monospace">Pitch Bounce</text>

                {/* Release Ball */}
                <circle cx="20" cy="30" r="4" fill="#38bdf8" />
                {/* Final Ball at Stumps */}
                <circle cx="580" cy={30 + seamDeviationDeg * 7} r="4" fill="#ef4444" />
              </svg>

              <div className="flex justify-between text-[10px] font-mono text-slate-500">
                <span>Speed: 142 km/h</span>
                <span>Revolutions: 2,450 RPM</span>
                <span>Reynolds No: ~1.85 × 10⁵</span>
                <span>Carry: Thigh-Pad Height</span>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: WEATHER IMPACT HEATMAP */}
        {telemetryTab === 'weather_heatmap' && (
          <div className="animate-in fade-in duration-200">
            <PitchWeatherHeatmap
              temperature={temperature}
              humidity={humidity}
              dewLevel={dewLevel}
            />
          </div>
        )}

        {/* TAB 5: PITCH SURFACE WEAR & EVOLUTION ENGINE */}
        {telemetryTab === 'surface_evolution' && (
          <div className="animate-in fade-in duration-200">
            <PitchSurfaceWearVisualizer
              initialWear={pitchWear}
              onWearChanged={(newWear) => {
                setPitchWear((prev) => (prev !== newWear ? newWear : prev));
              }}
            />
          </div>
        )}

        {/* TAB 6: 10-YEAR HISTORIC CLIMATE OVERLAY */}
        {telemetryTab === 'climate_history' && (
          <div className="animate-in fade-in duration-200">
            <VenueClimateHistoricalOverlay
              stadiumName={stadiumName}
              currentTemp={temperature}
              currentHumidity={humidity}
              currentWindSpeed={windSpeed}
              currentAirPressure={airPressure}
            />
          </div>
        )}
      </div>

      {/* Soil Moisture & Pitch Hardness Heatmap, 3D Cracks & Dryness Canvas, Spin vs Seam Efficacy & Boundary Efficiency */}
      <PitchIntelligenceAdvancedSuite
        stadiumName={stadiumName}
        temperature={temperature}
        humidity={humidity}
        windSpeed={windSpeed}
        dewLevel={dewLevel}
        pitchWear={pitchWear}
        grassCoverage={grassCoverage}
        matchDay={matchDay}
        showMoistureHardness={showMoistureHardness}
        onToggleMoistureHardness={() => setShowMoistureHardness((prev) => !prev)}
        show3DCracksCanvas={show3DCracksCanvas}
        onToggle3DCracksCanvas={() => setShow3DCracksCanvas((prev) => !prev)}
      />

      {/* Pitch Degradation Forecast, Surface Sensors (kPa & CoR), Ball RPM Tracker & Toss Impact Analyzer */}
      <PitchSensorAndTossSuite
        stadiumName={stadiumName}
        temperature={temperature}
        humidity={humidity}
        windSpeed={windSpeed}
        dewLevel={dewLevel}
        pitchWear={pitchWear}
        grassCoverage={grassCoverage}
        matchDay={matchDay}
        onPitchAgeChange={(dayIdx, wearPct, grassPct) => {
          setMatchDay(dayIdx);
          setPitchWear(wearPct);
          setGrassCoverage(grassPct);
        }}
      />

      {/* Surface AR Overlay Modal */}
      <SurfaceArOverlayModal
        isOpen={showArModal}
        onClose={() => setShowArModal(false)}
        stadiumName={stadiumName}
        initialOvers={matchDay * 4}
        activeMatchDay={matchDay}
      />
    </div>
  );
};
