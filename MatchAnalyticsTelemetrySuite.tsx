import React, { useMemo, useState } from 'react';
import {
  Bar,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  Line,
  LineChart,
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ReferenceDot,
  ReferenceLine,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
  ZAxis,
} from 'recharts';
import {
  Activity,
  BarChart3,
  CloudRain,
  Crosshair,
  Droplets,
  Flame,
  Gauge,
  Layers,
  RotateCcw,
  Sun,
  Target,
  Thermometer,
  TrendingUp,
  Wind,
} from 'lucide-react';
import { BallEvent, Player, Stadium, Team } from '../../types/cricket';
import { STADIUMS, TEAMS } from '../../data/cricketData';
import { cricketAudio } from '../../utils/audioSystem';
import { BowlerStaminaTrendChart } from './BowlerStaminaTrendChart';

export interface MatchAnalyticsTelemetrySuiteProps {
  teamA?: Team;
  teamB?: Team;
  stadium?: Stadium;
  innings1Events?: BallEvent[];
  innings2Events?: BallEvent[];
  dewActive?: boolean;
  activeBowlerOverride?: Player;
}

type WeatherScenarioId = 'live_match' | 'clear_night' | 'heavy_dew' | 'overcast_humid' | 'dry_heat';
type AggressionPhaseFilter = 'all' | 'powerplay' | 'middle' | 'death';
type SuiteTabId =
  | 'all'
  | 'stamina_trend'
  | 'shot_selection'
  | 'weather_deviation'
  | 'bowler_impact'
  | 'pitch_ten';

interface BowlerStaminaSpellPoint {
  overInSpell: string;
  spellBall: number;
  staminaPct: number;
  economyRate: number;
  releaseSpeedKmh: number;
  isEconomySpikeMarker: boolean;
  markerNote?: string;
}

interface AggressionDistributionRow {
  setting: string;
  shortLabel: string;
  ballsSharePct: number;
  runsScored: number;
  strikeRate: number;
  boundaryPct: number;
  dismissalRiskPct: number;
  efficiencyIndex: number;
  isOptimalForPhase: boolean;
}

interface BowlerScatterPoint {
  id: string;
  name: string;
  teamShort: string;
  role: string;
  economy: number;
  strikeRate: number;
  wickets: number;
  oversBowled: number;
  fillHex: string;
}

const DARK_TOOLTIP_STYLE: React.CSSProperties = {
  backgroundColor: '#020617',
  border: '1px solid #334155',
  borderRadius: '12px',
  color: '#f8fafc',
  fontSize: '12px',
};

export const MatchAnalyticsTelemetrySuite: React.FC<MatchAnalyticsTelemetrySuiteProps> = ({
  teamA = TEAMS[0],
  teamB = TEAMS[1],
  stadium = STADIUMS[0],
  innings1Events = [],
  innings2Events = [],
  dewActive = false,
  activeBowlerOverride,
}) => {
  const [activeSuiteTab, setActiveSuiteTab] = useState<SuiteTabId>('all');
  const [weatherScenario, setWeatherScenario] = useState<WeatherScenarioId>('live_match');
  const [aggressionPhase, setAggressionPhase] = useState<AggressionPhaseFilter>('all');

  const allEvents = useMemo(
    () => [...innings1Events, ...innings2Events],
    [innings1Events, innings2Events]
  );

  // Build available bowlers from match squads + live events
  const bowlerPool = useMemo<Player[]>(() => {
    const combinedSquad = [...teamA.squad, ...teamB.squad].filter(
      (p) =>
        p.role === 'Pace Bowler' ||
        p.role === 'Spin Bowler' ||
        p.role === 'All-Rounder' ||
        p.stats.wickets > 5
    );
    return combinedSquad.length > 0 ? combinedSquad.slice(0, 8) : [teamA.squad[1], teamB.squad[1]];
  }, [teamA, teamB]);

  const [selectedBowlerId, setSelectedBowlerId] = useState<string>(bowlerPool[0]?.id || 'bumrah');

  const activeBowler = useMemo(
    () => bowlerPool.find((b) => b.id === selectedBowlerId) || bowlerPool[0],
    [bowlerPool, selectedBowlerId]
  );

  /* =========================================================================
   * 1. BOWLER STAMINA TREND MULTI-LINE RECHARTS DATA (WITH ECONOMY DROP MARKERS)
   * ========================================================================= */
  const staminaTrendSeries = useMemo<BowlerStaminaSpellPoint[]>(() => {
    const isSpinner =
      activeBowler.role === 'Spin Bowler' ||
      activeBowler.bowlingStyle.toLowerCase().includes('spin');
    const baseEcon = activeBowler.stats.economy || (isSpinner ? 6.8 : 7.3);
    const baseSpeed = isSpinner ? 92.4 : 144.2;

    const liveBallsForBowler = allEvents.filter((e) => e.bowler.id === activeBowler.id);
    const totalPoints = 8; // 8 half-over / spell checkpoints across a 4-over spell (Balls 3..24)

    return Array.from({ length: totalPoints }, (_, idx) => {
      const spellBall = (idx + 1) * 3;
      const ovNum = Math.floor((spellBall - 1) / 6) + 1;
      const ballRem = ((spellBall - 1) % 6) + 1;

      const depletionPerStep = isSpinner ? 5.6 : 8.4;
      const nonlinearFatigue = idx >= 4 ? Math.pow(idx - 3, 1.38) * (isSpinner ? 1.8 : 2.9) : 0;
      const staminaPct = Math.max(
        26,
        Math.round(100 - idx * depletionPerStep - nonlinearFatigue)
      );

      // Compute live or calibrated economy rate at this spell checkpoint
      const sliceBalls = liveBallsForBowler.slice(0, spellBall);
      let economyRate: number;
      if (sliceBalls.length >= 3) {
        const runs = sliceBalls.reduce((s, b) => s + b.runsScored, 0);
        economyRate = Number(((runs / sliceBalls.length) * 6).toFixed(2));
      } else {
        const fatiguePenalty =
          staminaPct < 52
            ? 3.15
            : staminaPct < 68
            ? 1.75
            : staminaPct < 80
            ? 0.45
            : -0.25;
        economyRate = Number(Math.max(4.8, baseEcon + fatiguePenalty).toFixed(2));
      }

      const releaseSpeedKmh = Number(
        (baseSpeed - (100 - staminaPct) * (isSpinner ? 0.05 : 0.11)).toFixed(1)
      );

      // Mark key inflection points where stamina depletion triggers a significant economy deterioration
      const isFirstSpike = idx === 4; // ~64% stamina inflection
      const isCriticalSpike = idx === 6; // ~44% critical red-zone

      return {
        overInSpell: `Ov ${ovNum}.${ballRem}`,
        spellBall,
        staminaPct,
        economyRate,
        releaseSpeedKmh,
        isEconomySpikeMarker: isFirstSpike || isCriticalSpike,
        markerNote: isCriticalSpike
          ? `Critical <50% Stamina: Econ surges to ${economyRate}`
          : isFirstSpike
          ? `Inflection (${staminaPct}% Stamina): Control drops`
          : undefined,
      };
    });
  }, [activeBowler, allEvents]);

  const staminaSpikeMarkers = useMemo(
    () => staminaTrendSeries.filter((pt) => pt.isEconomySpikeMarker),
    [staminaTrendSeries]
  );

  /* =========================================================================
   * 2. SHOT SELECTION & BATTING AGGRESSION DISTRIBUTION BY PHASE
   * ========================================================================= */
  const shotSelectionRows = useMemo<AggressionDistributionRow[]>(() => {
    const phasePresets: Record<
      AggressionPhaseFilter,
      Array<Omit<AggressionDistributionRow, 'efficiencyIndex'>>
    > = {
      all: [
        {
          setting: 'Anchor (Defensive)',
          shortLabel: 'Anchor',
          ballsSharePct: 16,
          runsScored: 34,
          strikeRate: 106.3,
          boundaryPct: 9.4,
          dismissalRiskPct: 2.1,
          isOptimalForPhase: false,
        },
        {
          setting: 'Balanced Rotation',
          shortLabel: 'Balanced',
          ballsSharePct: 28,
          runsScored: 88,
          strikeRate: 135.4,
          boundaryPct: 16.8,
          dismissalRiskPct: 3.8,
          isOptimalForPhase: false,
        },
        {
          setting: 'Calculated Pierce',
          shortLabel: 'Calculated',
          ballsSharePct: 26,
          runsScored: 104,
          strikeRate: 162.5,
          boundaryPct: 24.2,
          dismissalRiskPct: 5.1,
          isOptimalForPhase: true,
        },
        {
          setting: 'Aggressive Attack',
          shortLabel: 'Aggressive',
          ballsSharePct: 20,
          runsScored: 92,
          strikeRate: 184.0,
          boundaryPct: 31.5,
          dismissalRiskPct: 8.6,
          isOptimalForPhase: false,
        },
        {
          setting: 'Maximum Risk Launch',
          shortLabel: 'Max Risk',
          ballsSharePct: 10,
          runsScored: 49,
          strikeRate: 204.2,
          boundaryPct: 39.2,
          dismissalRiskPct: 15.8,
          isOptimalForPhase: false,
        },
      ],
      powerplay: [
        {
          setting: 'Anchor (Defensive)',
          shortLabel: 'Anchor',
          ballsSharePct: 14,
          runsScored: 11,
          strikeRate: 98.0,
          boundaryPct: 8.5,
          dismissalRiskPct: 2.4,
          isOptimalForPhase: false,
        },
        {
          setting: 'Balanced Rotation',
          shortLabel: 'Balanced',
          ballsSharePct: 24,
          runsScored: 26,
          strikeRate: 131.0,
          boundaryPct: 17.2,
          dismissalRiskPct: 3.9,
          isOptimalForPhase: false,
        },
        {
          setting: 'Calculated Pierce',
          shortLabel: 'Calculated',
          ballsSharePct: 34,
          runsScored: 48,
          strikeRate: 171.4,
          boundaryPct: 28.6,
          dismissalRiskPct: 4.8,
          isOptimalForPhase: true,
        },
        {
          setting: 'Aggressive Attack',
          shortLabel: 'Aggressive',
          ballsSharePct: 20,
          runsScored: 31,
          strikeRate: 182.3,
          boundaryPct: 33.0,
          dismissalRiskPct: 9.4,
          isOptimalForPhase: false,
        },
        {
          setting: 'Maximum Risk Launch',
          shortLabel: 'Max Risk',
          ballsSharePct: 8,
          runsScored: 12,
          strikeRate: 176.0,
          boundaryPct: 35.0,
          dismissalRiskPct: 17.5,
          isOptimalForPhase: false,
        },
      ],
      middle: [
        {
          setting: 'Anchor (Defensive)',
          shortLabel: 'Anchor',
          ballsSharePct: 18,
          runsScored: 18,
          strikeRate: 105.8,
          boundaryPct: 8.2,
          dismissalRiskPct: 1.9,
          isOptimalForPhase: false,
        },
        {
          setting: 'Balanced Rotation',
          shortLabel: 'Balanced',
          ballsSharePct: 38,
          runsScored: 54,
          strikeRate: 142.1,
          boundaryPct: 17.6,
          dismissalRiskPct: 3.2,
          isOptimalForPhase: true,
        },
        {
          setting: 'Calculated Pierce',
          shortLabel: 'Calculated',
          ballsSharePct: 24,
          runsScored: 38,
          strikeRate: 158.3,
          boundaryPct: 22.4,
          dismissalRiskPct: 5.4,
          isOptimalForPhase: false,
        },
        {
          setting: 'Aggressive Attack',
          shortLabel: 'Aggressive',
          ballsSharePct: 14,
          runsScored: 24,
          strikeRate: 171.4,
          boundaryPct: 28.0,
          dismissalRiskPct: 9.8,
          isOptimalForPhase: false,
        },
        {
          setting: 'Maximum Risk Launch',
          shortLabel: 'Max Risk',
          ballsSharePct: 6,
          runsScored: 9,
          strikeRate: 163.6,
          boundaryPct: 31.0,
          dismissalRiskPct: 18.2,
          isOptimalForPhase: false,
        },
      ],
      death: [
        {
          setting: 'Anchor (Defensive)',
          shortLabel: 'Anchor',
          ballsSharePct: 6,
          runsScored: 5,
          strikeRate: 112.0,
          boundaryPct: 10.0,
          dismissalRiskPct: 3.1,
          isOptimalForPhase: false,
        },
        {
          setting: 'Balanced Rotation',
          shortLabel: 'Balanced',
          ballsSharePct: 14,
          runsScored: 16,
          strikeRate: 138.5,
          boundaryPct: 16.5,
          dismissalRiskPct: 4.5,
          isOptimalForPhase: false,
        },
        {
          setting: 'Calculated Pierce',
          shortLabel: 'Calculated',
          ballsSharePct: 22,
          runsScored: 32,
          strikeRate: 174.0,
          boundaryPct: 26.8,
          dismissalRiskPct: 6.2,
          isOptimalForPhase: false,
        },
        {
          setting: 'Aggressive Attack',
          shortLabel: 'Aggressive',
          ballsSharePct: 36,
          runsScored: 64,
          strikeRate: 213.3,
          boundaryPct: 38.4,
          dismissalRiskPct: 8.9,
          isOptimalForPhase: true,
        },
        {
          setting: 'Maximum Risk Launch',
          shortLabel: 'Max Risk',
          ballsSharePct: 22,
          runsScored: 41,
          strikeRate: 227.8,
          boundaryPct: 44.5,
          dismissalRiskPct: 16.4,
          isOptimalForPhase: false,
        },
      ],
    };

    return phasePresets[aggressionPhase].map((row) => ({
      ...row,
      efficiencyIndex: Math.min(
        99,
        Math.round(row.strikeRate * 0.46 - row.dismissalRiskPct * 1.65 + row.boundaryPct * 0.45)
      ),
    }));
  }, [aggressionPhase]);

  const optimalAggressionRow =
    shotSelectionRows.find((r) => r.isOptimalForPhase) || shotSelectionRows[2];

  /* =========================================================================
   * 3. WEATHER IMPACT ON PITCH WEAR RATES, DEVIATION & RADAR COMPARISON
   * ========================================================================= */
  const weatherTelemetry = useMemo(() => {
    const parsedTemp = parseInt(stadium.weather?.temp || '29', 10) || 29;
    const parsedHum = parseInt(stadium.weather?.humidity || '62', 10) || 62;
    const parsedWind = parseInt(stadium.weather?.wind || '16', 10) || 16;

    const scenarioConfigs: Record<
      WeatherScenarioId,
      { label: string; tempC: number; humidityPct: number; windKmh: number; dewPct: number; wearMult: number }
    > = {
      live_match: {
        label: 'Live Match Weather',
        tempC: parsedTemp,
        humidityPct: dewActive ? Math.max(74, parsedHum) : parsedHum,
        windKmh: parsedWind,
        dewPct: dewActive ? 72 : stadium.dewFactor === 'Heavy' ? 68 : stadium.dewFactor === 'Moderate' ? 42 : 18,
        wearMult: 1.0,
      },
      clear_night: {
        label: 'Clear Night',
        tempC: 24,
        humidityPct: 54,
        windKmh: 14,
        dewPct: 28,
        wearMult: 0.94,
      },
      heavy_dew: {
        label: 'Heavy Evening Dew',
        tempC: 25,
        humidityPct: 86,
        windKmh: 9,
        dewPct: 84,
        wearMult: 0.78,
      },
      overcast_humid: {
        label: 'Overcast & Humid',
        tempC: 21,
        humidityPct: 82,
        windKmh: 24,
        dewPct: 36,
        wearMult: 0.86,
      },
      dry_heat: {
        label: 'Dry Baking Heat',
        tempC: 37,
        humidityPct: 28,
        windKmh: 19,
        dewPct: 8,
        wearMult: 1.38,
      },
    };

    const cfg = scenarioConfigs[weatherScenario];

    const overSeries = [2, 5, 8, 11, 14, 17, 20].map((ov, i) => {
      const humAtOver = Math.min(96, Math.round(cfg.humidityPct + i * (cfg.dewPct > 55 ? 2.1 : 0.6)));
      const wearDeltaPct = Number(
        (2.4 * cfg.wearMult * (1 + i * 0.08) * (cfg.dewPct > 65 && ov > 12 ? 0.82 : 1)).toFixed(2)
      );
      const cumWearPct = Math.min(92, Math.round(14 + (i + 1) * wearDeltaPct * 3.1));

      const airSwingDeg = Number(
        Math.max(
          0.35,
          (1.65 + (humAtOver - 50) * 0.022 + cfg.windKmh * 0.018) * Math.max(0.28, 1 - ov / 24)
        ).toFixed(2)
      );
      const seamCutDeg = Number(
        Math.max(0.45, 0.95 + (cumWearPct / 100) * 1.15 - (cfg.dewPct > 65 && ov > 12 ? 0.28 : 0)).toFixed(2)
      );
      const spinTurnDeg = Number(
        Math.max(
          0.6,
          (1.2 + (cumWearPct / 100) * 2.85) * (cfg.dewPct > 70 && ov > 11 ? 0.72 : 1)
        ).toFixed(2)
      );
      const totalDeviationCm = Number(((airSwingDeg + Math.max(seamCutDeg, spinTurnDeg)) * 6.4).toFixed(1));

      return {
        overLabel: `Ov ${ov}`,
        over: ov,
        humidityPct: humAtOver,
        wearRateDelta: wearDeltaPct,
        cumulativeWearPct: cumWearPct,
        airSwingDeg,
        seamCutDeg,
        spinTurnDeg,
        totalDeviationCm,
      };
    });

    const latest = overSeries[overSeries.length - 1];

    // Radar chart comparing Current Weather Movement Probabilities vs Neutral Baseline (= 60)
    const radarData = [
      {
        axis: 'Air Swing',
        current: Math.min(98, Math.round(48 + cfg.humidityPct * 0.42 + cfg.windKmh * 0.45)),
        baseline: 60,
      },
      {
        axis: 'Seam Cut',
        current: Math.min(96, Math.round(52 + cfg.wearMult * 22 + (cfg.humidityPct > 70 ? 12 : 4))),
        baseline: 60,
      },
      {
        axis: 'Spin Grip',
        current: Math.min(98, Math.round(58 + cfg.wearMult * 28 - cfg.dewPct * 0.34)),
        baseline: 60,
      },
      {
        axis: 'Bounce Carry',
        current: Math.min(96, Math.round(64 + (cfg.tempC - 24) * 1.1 - cfg.humidityPct * 0.14)),
        baseline: 62,
      },
      {
        axis: 'Outfield Speed',
        current: Math.min(98, Math.round(62 + cfg.dewPct * 0.34)),
        baseline: 64,
      },
      {
        axis: 'Abrasion Rate',
        current: Math.min(98, Math.round(cfg.wearMult * 66)),
        baseline: 60,
      },
    ];

    return { cfg, overSeries, latest, radarData };
  }, [stadium, dewActive, weatherScenario]);

  /* =========================================================================
   * 4. BOWLER IMPACT SCATTER PLOT (ECONOMY VS STRIKE RATE, Z = WICKETS)
   * ========================================================================= */
  const bowlerScatterData = useMemo<BowlerScatterPoint[]>(() => {
    return bowlerPool.map((b, idx) => {
      const liveBalls = allEvents.filter((e) => e.bowler.id === b.id);
      const isTeamA = teamA.squad.some((p) => p.id === b.id);

      if (liveBalls.length >= 6) {
        const runs = liveBalls.reduce((s, ev) => s + ev.runsScored, 0);
        const wkts = liveBalls.filter((ev) => ev.isWicket).length;
        const econ = Number(((runs / liveBalls.length) * 6).toFixed(2));
        const sr = wkts > 0 ? Number((liveBalls.length / wkts).toFixed(1)) : 24.0;
        return {
          id: b.id,
          name: b.name,
          teamShort: isTeamA ? teamA.shortName : teamB.shortName,
          role: b.role,
          economy: econ,
          strikeRate: sr,
          wickets: Math.max(1, wkts),
          oversBowled: Number((liveBalls.length / 6).toFixed(1)),
          fillHex: isTeamA ? '#22d3ee' : '#f59e0b',
        };
      }

      const econ = Number((b.stats.economy || 7.2 + (idx % 3) * 0.45).toFixed(2));
      const wktsMatchEq = Math.max(1, Math.min(5, Math.round((b.stats.wickets || 42) / 22)));
      const sr = Number(
        (
          b.stats.bowlingAverage && b.stats.economy
            ? (b.stats.bowlingAverage / b.stats.economy) * 6
            : 16.4 + idx * 1.3
        ).toFixed(1)
      );

      return {
        id: b.id,
        name: b.name,
        teamShort: isTeamA ? teamA.shortName : teamB.shortName,
        role: b.role,
        economy: Math.max(5.4, Math.min(10.6, econ)),
        strikeRate: Math.max(11.5, Math.min(26.5, sr)),
        wickets: wktsMatchEq,
        oversBowled: 4.0,
        fillHex: isTeamA ? '#22d3ee' : '#f59e0b',
      };
    });
  }, [bowlerPool, allEvents, teamA, teamB]);

  /* =========================================================================
   * 5. 10-METRIC PITCH ANALYSIS MATRIX
   * ========================================================================= */
  const tenPitchMetrics = useMemo(
    () => [
      {
        idx: '01',
        title: 'Clegg Impact Hardness',
        value: `${Math.round(88 * weatherTelemetry.cfg.wearMult)} Gmax`,
        detail: `${stadium.pitchType} clay compaction`,
        accent: 'text-cyan-300',
      },
      {
        idx: '02',
        title: 'Topsoil Moisture (VWC)',
        value: `${Math.max(11, Math.round(weatherTelemetry.cfg.humidityPct * 0.36))}%`,
        detail: `Humidity ${weatherTelemetry.cfg.humidityPct}% RH`,
        accent: 'text-sky-300',
      },
      {
        idx: '03',
        title: 'Good-Length Bounce Carry',
        value: `${stadium.pitchType === 'Pace & Bounce' ? 94 : 78} cm`,
        detail: 'Stump-plane carry height',
        accent: 'text-emerald-300',
      },
      {
        idx: '04',
        title: 'Variable Bounce Hazard',
        value: `${Math.min(78, Math.round(weatherTelemetry.latest.cumulativeWearPct * 0.68))}%`,
        detail: 'Crack-induced height spread',
        accent: 'text-amber-300',
      },
      {
        idx: '05',
        title: 'New-Ball Seam Cut',
        value: `±${weatherTelemetry.latest.seamCutDeg}°`,
        detail: `${stadium.paceWicketPercent}% venue pace share`,
        accent: 'text-cyan-300',
      },
      {
        idx: '06',
        title: 'Footmark Spin Grip',
        value: `${weatherTelemetry.latest.spinTurnDeg}°`,
        detail: `${stadium.spinWicketPercent}% venue spin share`,
        accent: 'text-amber-300',
      },
      {
        idx: '07',
        title: 'Aerodynamic Swing Window',
        value: `${weatherTelemetry.overSeries[0].airSwingDeg}° (Ov 1–5)`,
        detail: `Wind ${weatherTelemetry.cfg.windKmh} km/h`,
        accent: 'text-sky-300',
      },
      {
        idx: '08',
        title: 'Cutter Surface Friction',
        value: `${(0.48 + weatherTelemetry.cfg.wearMult * 0.16).toFixed(2)} μ`,
        detail: 'Pace-off deceleration bite',
        accent: 'text-emerald-300',
      },
      {
        idx: '09',
        title: 'Outfield Turf Velocity',
        value: `${weatherTelemetry.cfg.dewPct > 55 ? 'Fast (+12%)' : 'True Par'}`,
        detail: `${stadium.boundarySizeMeters.straight}m / ${stadium.boundarySizeMeters.square}m ropes`,
        accent: 'text-slate-100',
      },
      {
        idx: '10',
        title: 'Evening Dew Skid Factor',
        value: `${weatherTelemetry.cfg.dewPct}%`,
        detail: `${stadium.chasingWinPercent}% historical chase win`,
        accent: 'text-rose-300',
      },
    ],
    [stadium, weatherTelemetry]
  );

  const showSection = (id: Exclude<SuiteTabId, 'all'>) =>
    activeSuiteTab === 'all' || activeSuiteTab === id;

  return (
    <section className="rounded-3xl border border-slate-800 bg-slate-950 p-5 sm:p-6 space-y-6 text-slate-100 font-sans">
      {/* Header & Sub-Navigation */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2 text-xs text-cyan-300 font-medium">
            <Activity className="h-3.5 w-3.5 text-cyan-400 shrink-0" />
            <span>Match Analytics Telemetry Suite</span>
            <span aria-hidden="true" className="text-slate-600">
              ·
            </span>
            <span className="text-slate-300">
              {teamA.shortName} vs {teamB.shortName} @ {stadium.name}
            </span>
          </div>
          <h3 className="text-xl sm:text-2xl font-black text-white tracking-tight">
            Stamina Depletion, Shot Aggression, Weather Deviation &amp; Bowler Impact
          </h3>
        </div>

        <div
          role="group"
          aria-label="Match Analytics Section Filter"
          className="flex flex-wrap items-center gap-1.5 rounded-xl border border-slate-800 bg-slate-900 p-1 text-xs"
        >
          {(
            [
              { id: 'all', label: 'All Telemetry' },
              { id: 'stamina_trend', label: 'Bowler Stamina Trend' },
              { id: 'shot_selection', label: 'Shot Selection' },
              { id: 'weather_deviation', label: 'Weather & Deviation' },
              { id: 'bowler_impact', label: 'Bowler Impact Scatter' },
              { id: 'pitch_ten', label: '10x Pitch Analysis' },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => {
                cricketAudio.playUiClick();
                setActiveSuiteTab(tab.id);
              }}
              className={`rounded-lg px-3 py-1.5 font-semibold transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                activeSuiteTab === tab.id
                  ? 'bg-cyan-400 text-slate-950 font-bold'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* =====================================================================
          1. BOWLER STAMINA TREND MULTI-LINE RECHARTS GRAPH
          ===================================================================== */}
      {showSection('stamina_trend') && (
        <BowlerStaminaTrendChart
          teamA={teamA}
          teamB={teamB}
          stadium={stadium}
          innings1Events={innings1Events}
          innings2Events={innings2Events}
          activeBowlerOverride={activeBowlerOverride}
        />
      )}

      {/* =====================================================================
          2. SHOT SELECTION & BATTING AGGRESSION DASHBOARD
          ===================================================================== */}
      {showSection('shot_selection') && (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4 sm:p-5 space-y-4">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-slate-800 pb-3.5">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-xs text-emerald-300 font-medium">
                <Target className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                <span>Batting Aggression Distribution vs. Runs Scored &amp; Phase Yield</span>
              </div>
              <h4 className="text-base sm:text-lg font-bold text-white">
                Shot Selection &amp; Aggression Efficiency Dashboard
              </h4>
              <p className="text-xs text-slate-300">
                Compares batting aggression settings against runs scored, strike rate, and wicket
                risk across match phases.
              </p>
            </div>

            <div className="inline-flex flex-wrap items-center rounded-xl border border-slate-800 bg-slate-950 p-1 text-xs">
              {(
                [
                  { id: 'all', label: 'All Phases' },
                  { id: 'powerplay', label: 'Powerplay (1–6)' },
                  { id: 'middle', label: 'Middle (7–15)' },
                  { id: 'death', label: 'Death (16–20)' },
                ] as const
              ).map((ph) => (
                <button
                  key={ph.id}
                  type="button"
                  onClick={() => {
                    cricketAudio.playUiClick();
                    setAggressionPhase(ph.id);
                  }}
                  className={`rounded-lg px-2.5 py-1.5 font-semibold transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                    aggressionPhase === ph.id
                      ? 'bg-emerald-400 text-slate-950 font-bold'
                      : 'text-slate-300 hover:text-white'
                  }`}
                >
                  {ph.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 items-stretch">
            <div className="xl:col-span-8 h-[285px] rounded-xl border border-slate-800 bg-slate-950/90 p-3">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart
                  data={shotSelectionRows}
                  margin={{ top: 14, right: 20, left: 0, bottom: 8 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.16)" />
                  <XAxis
                    dataKey="shortLabel"
                    stroke="#cbd5e1"
                    tick={{ fill: '#e2e8f0', fontSize: 11 }}
                  />
                  <YAxis
                    yAxisId="runs"
                    stroke="#34d399"
                    tick={{ fill: '#6ee7b7', fontSize: 11 }}
                  />
                  <YAxis
                    yAxisId="sr"
                    orientation="right"
                    stroke="#38bdf8"
                    tick={{ fill: '#7dd3fc', fontSize: 11 }}
                  />
                  <Tooltip contentStyle={DARK_TOOLTIP_STYLE} />
                  <Legend wrapperStyle={{ color: '#e2e8f0', fontSize: '12px' }} />

                  <Bar
                    yAxisId="runs"
                    dataKey="runsScored"
                    name="Runs Scored"
                    radius={[6, 6, 0, 0]}
                  >
                    {shotSelectionRows.map((entry) => (
                      <Cell
                        key={entry.shortLabel}
                        fill={entry.isOptimalForPhase ? '#10b981' : '#0284c7'}
                      />
                    ))}
                  </Bar>
                  <Bar
                    yAxisId="runs"
                    dataKey="ballsSharePct"
                    name="Selection Share (%)"
                    fill="#6366f1"
                    radius={[6, 6, 0, 0]}
                  />
                  <Line
                    yAxisId="sr"
                    type="monotone"
                    dataKey="strikeRate"
                    name="Strike Rate"
                    stroke="#fbbf24"
                    strokeWidth={2.6}
                    dot={{ r: 4, fill: '#fbbf24' }}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>

            <div className="xl:col-span-4 rounded-xl border border-slate-800 bg-slate-950 p-4 flex flex-col justify-between space-y-3">
              <div className="space-y-2">
                <span className="text-xs font-semibold text-emerald-300 block">
                  Optimal Phase Aggression Verdict
                </span>
                <h5 className="text-lg font-bold text-white">{optimalAggressionRow.setting}</h5>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Yields <strong className="text-emerald-300 font-mono">{optimalAggressionRow.runsScored} runs</strong>{' '}
                  at <strong className="text-sky-300 font-mono">{optimalAggressionRow.strikeRate} SR</strong>{' '}
                  while keeping dismissal hazard at{' '}
                  <strong className="text-amber-300 font-mono">
                    {optimalAggressionRow.dismissalRiskPct}%
                  </strong>
                  .
                </p>
              </div>

              <div className="space-y-2 border-t border-slate-800 pt-3 text-xs">
                {shotSelectionRows.map((r) => (
                  <div
                    key={r.shortLabel}
                    className="flex items-center justify-between text-slate-200"
                  >
                    <span className={r.isOptimalForPhase ? 'text-emerald-300 font-bold' : ''}>
                      {r.shortLabel} {r.isOptimalForPhase ? '★' : ''}
                    </span>
                    <span className="font-mono tabular-nums text-slate-300">
                      {r.runsScored}r · SR {r.strikeRate} · Risk {r.dismissalRiskPct}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          3. WEATHER IMPACT ON PITCH WEAR RATES, BALL DEVIATION & RADAR CHART
          ===================================================================== */}
      {showSection('weather_deviation') && (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4 sm:p-5 space-y-4">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-slate-800 pb-3.5">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-xs text-amber-300 font-medium">
                <CloudRain className="h-3.5 w-3.5 text-amber-400 shrink-0" />
                <span>Micro-Climate Pitch Wear Rates, Trajectory Deviation &amp; Weather Radar</span>
              </div>
              <h4 className="text-base sm:text-lg font-bold text-white">
                Weather Impact on Pitch Degradation &amp; Ball Movement
              </h4>
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              {(
                [
                  { id: 'live_match', label: 'Live Weather' },
                  { id: 'clear_night', label: 'Clear Night' },
                  { id: 'heavy_dew', label: 'Heavy Dew' },
                  { id: 'overcast_humid', label: 'Overcast & Humid' },
                  { id: 'dry_heat', label: 'Dry Heat' },
                ] as const
              ).map((sc) => (
                <button
                  key={sc.id}
                  type="button"
                  onClick={() => {
                    cricketAudio.playUiClick();
                    setWeatherScenario(sc.id);
                  }}
                  className={`rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                    weatherScenario === sc.id
                      ? 'bg-amber-400 text-slate-950 font-bold'
                      : 'border border-slate-700 bg-slate-950 text-slate-200 hover:text-white'
                  }`}
                >
                  {sc.label}
                </button>
              ))}
              {weatherScenario !== 'live_match' && (
                <button
                  type="button"
                  onClick={() => setWeatherScenario('live_match')}
                  className="inline-flex items-center gap-1 rounded-lg border border-slate-700 bg-slate-800 px-2.5 py-1.5 text-xs text-slate-200 hover:text-white cursor-pointer"
                >
                  <RotateCcw className="h-3 w-3" />
                  <span>Reset</span>
                </button>
              )}
            </div>
          </div>

          {/* 4 Meteorological & Deviation KPI Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
            <div className="rounded-xl border border-slate-800 bg-slate-950 p-3.5">
              <span className="text-slate-400 flex items-center gap-1.5">
                <Thermometer className="h-3.5 w-3.5 text-rose-400" />
                <span>Cumulative Pitch Wear</span>
              </span>
              <strong className="text-lg font-mono font-bold text-white tabular-nums mt-1 block">
                {weatherTelemetry.latest.cumulativeWearPct}% ({weatherTelemetry.cfg.wearMult}x)
              </strong>
              <span className="text-slate-400 font-mono">
                {weatherTelemetry.cfg.tempC}°C · {weatherTelemetry.cfg.humidityPct}% RH
              </span>
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-950 p-3.5">
              <span className="text-slate-400 flex items-center gap-1.5">
                <Wind className="h-3.5 w-3.5 text-sky-400" />
                <span>Aerodynamic Air Swing</span>
              </span>
              <strong className="text-lg font-mono font-bold text-sky-300 tabular-nums mt-1 block">
                {weatherTelemetry.overSeries[0].airSwingDeg}° → {weatherTelemetry.latest.airSwingDeg}°
              </strong>
              <span className="text-slate-400 font-mono">
                Wind {weatherTelemetry.cfg.windKmh} km/h
              </span>
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-950 p-3.5">
              <span className="text-slate-400 flex items-center gap-1.5">
                <Layers className="h-3.5 w-3.5 text-cyan-400" />
                <span>Deck Seam Deviation</span>
              </span>
              <strong className="text-lg font-mono font-bold text-cyan-300 tabular-nums mt-1 block">
                ±{weatherTelemetry.latest.seamCutDeg}°
              </strong>
              <span className="text-slate-400">Post-bounce fissure cut</span>
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-950 p-3.5">
              <span className="text-slate-400 flex items-center gap-1.5">
                <Droplets className="h-3.5 w-3.5 text-amber-400" />
                <span>Spin Turn &amp; Dew</span>
              </span>
              <strong className="text-lg font-mono font-bold text-amber-300 tabular-nums mt-1 block">
                {weatherTelemetry.latest.spinTurnDeg}° ({weatherTelemetry.cfg.dewPct}% Dew)
              </strong>
              <span className="text-slate-400">
                Total Drift {weatherTelemetry.latest.totalDeviationCm} cm
              </span>
            </div>
          </div>

          {/* 3-Chart Grid: Wear Rate Composed + Deviation Spectrum + Pitch Weather Impact Radar */}
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 items-stretch">
            <div className="xl:col-span-4 h-[265px] rounded-xl border border-slate-800 bg-slate-950/90 p-3 flex flex-col">
              <span className="text-xs font-semibold text-slate-200 mb-1">
                Pitch Wear Rate &amp; Humidity Trend
              </span>
              <div className="flex-1 min-h-0">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={weatherTelemetry.overSeries}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.14)" />
                    <XAxis dataKey="overLabel" tick={{ fill: '#cbd5e1', fontSize: 10 }} />
                    <YAxis yAxisId="left" tick={{ fill: '#fcd34d', fontSize: 10 }} />
                    <YAxis
                      yAxisId="right"
                      orientation="right"
                      tick={{ fill: '#7dd3fc', fontSize: 10 }}
                    />
                    <Tooltip contentStyle={DARK_TOOLTIP_STYLE} />
                    <Bar
                      yAxisId="right"
                      dataKey="wearRateDelta"
                      name="Wear Δ%/Ov"
                      fill="#f59e0b"
                      radius={[4, 4, 0, 0]}
                    />
                    <Line
                      yAxisId="left"
                      type="monotone"
                      dataKey="cumulativeWearPct"
                      name="Cum. Wear %"
                      stroke="#fb7185"
                      strokeWidth={2.4}
                    />
                    <Line
                      yAxisId="left"
                      type="monotone"
                      dataKey="humidityPct"
                      name="Humidity %"
                      stroke="#38bdf8"
                      strokeWidth={2}
                      strokeDasharray="4 3"
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="xl:col-span-4 h-[265px] rounded-xl border border-slate-800 bg-slate-950/90 p-3 flex flex-col">
              <span className="text-xs font-semibold text-slate-200 mb-1">
                Ball Deviation Spectrum (Swing, Seam, Spin °)
              </span>
              <div className="flex-1 min-h-0">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={weatherTelemetry.overSeries}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.14)" />
                    <XAxis dataKey="overLabel" tick={{ fill: '#cbd5e1', fontSize: 10 }} />
                    <YAxis tick={{ fill: '#cbd5e1', fontSize: 10 }} />
                    <Tooltip contentStyle={DARK_TOOLTIP_STYLE} />
                    <Legend wrapperStyle={{ color: '#e2e8f0', fontSize: '11px' }} />
                    <Line
                      type="monotone"
                      dataKey="airSwingDeg"
                      name="Air Swing (°)"
                      stroke="#38bdf8"
                      strokeWidth={2.3}
                    />
                    <Line
                      type="monotone"
                      dataKey="seamCutDeg"
                      name="Seam Cut (°)"
                      stroke="#34d399"
                      strokeWidth={2.3}
                    />
                    <Line
                      type="monotone"
                      dataKey="spinTurnDeg"
                      name="Spin Turn (°)"
                      stroke="#f59e0b"
                      strokeWidth={2.3}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="xl:col-span-4 h-[265px] rounded-xl border border-slate-800 bg-slate-950/90 p-3 flex flex-col">
              <span className="text-xs font-semibold text-slate-200 mb-1">
                Pitch Weather Impact Radar (vs. Baseline)
              </span>
              <div className="flex-1 min-h-0">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart data={weatherTelemetry.radarData}>
                    <PolarGrid stroke="rgba(148,163,184,0.22)" />
                    <PolarAngleAxis
                      dataKey="axis"
                      tick={{ fill: '#e2e8f0', fontSize: 10 }}
                    />
                    <PolarRadiusAxis
                      angle={30}
                      domain={[0, 100]}
                      tick={{ fill: '#94a3b8', fontSize: 9 }}
                    />
                    <Radar
                      name="Current Weather"
                      dataKey="current"
                      stroke="#22d3ee"
                      fill="#22d3ee"
                      fillOpacity={0.32}
                    />
                    <Radar
                      name="Neutral Baseline"
                      dataKey="baseline"
                      stroke="#94a3b8"
                      fill="#64748b"
                      fillOpacity={0.14}
                    />
                    <Legend wrapperStyle={{ color: '#e2e8f0', fontSize: '11px' }} />
                    <Tooltip contentStyle={DARK_TOOLTIP_STYLE} />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          4. BOWLER IMPACT SCATTER PLOT (ECONOMY VS STRIKE RATE, BUBBLE = WICKETS)
          ===================================================================== */}
      {showSection('bowler_impact') && (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4 sm:p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3.5">
            <div>
              <div className="flex items-center gap-2 text-xs text-cyan-300 font-medium">
                <Crosshair className="h-3.5 w-3.5 text-cyan-400 shrink-0" />
                <span>Economy Rate vs. Bowling Strike Rate (Bubble Size = Wickets)</span>
              </div>
              <h4 className="text-base sm:text-lg font-bold text-white mt-0.5">
                Bowler Impact Scatter Matrix
              </h4>
            </div>
            <div className="flex items-center gap-4 text-xs text-slate-200">
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-cyan-400" />
                <span>{teamA.shortName} Attack</span>
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
                <span>{teamB.shortName} Attack</span>
              </span>
            </div>
          </div>

          <div className="h-[280px] w-full rounded-xl border border-slate-800 bg-slate-950/90 p-3">
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart margin={{ top: 18, right: 24, bottom: 16, left: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.16)" />
                <XAxis
                  type="number"
                  dataKey="economy"
                  name="Economy Rate"
                  domain={[5, 11]}
                  stroke="#cbd5e1"
                  tick={{ fill: '#e2e8f0', fontSize: 11 }}
                  unit=" RPO"
                />
                <YAxis
                  type="number"
                  dataKey="strikeRate"
                  name="Strike Rate"
                  domain={[10, 28]}
                  stroke="#cbd5e1"
                  tick={{ fill: '#e2e8f0', fontSize: 11 }}
                  unit=" b/w"
                />
                <ZAxis type="number" dataKey="wickets" range={[110, 560]} name="Wickets" />
                <ReferenceLine x={7.5} stroke="rgba(56,189,248,0.35)" strokeDasharray="4 4" />
                <ReferenceLine y={18} stroke="rgba(52,211,153,0.35)" strokeDasharray="4 4" />
                <Tooltip
                  cursor={{ strokeDasharray: '3 3' }}
                  contentStyle={DARK_TOOLTIP_STYLE}
                  formatter={(value: any, name: any) => [value, name]}
                  labelFormatter={(_, payload) =>
                    payload && payload[0]?.payload
                      ? `${payload[0].payload.name} (${payload[0].payload.teamShort}) · ${payload[0].payload.wickets} Wkts`
                      : 'Bowler'
                  }
                />
                <Scatter name="Bowlers" data={bowlerScatterData}>
                  {bowlerScatterData.map((entry) => (
                    <Cell key={entry.id} fill={entry.fillHex} fillOpacity={0.85} />
                  ))}
                </Scatter>
              </ScatterChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* =====================================================================
          5. 10-FEATURE PITCH ANALYSIS DIAGNOSTIC MATRIX (HIGH-CONTRAST DARK MODE)
          ===================================================================== */}
      {showSection('pitch_ten') && (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4 sm:p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
            <div>
              <span className="text-xs text-emerald-300 font-medium block">
                Complete 10-Point Surface &amp; Atmospheric Audit
              </span>
              <h4 className="text-base sm:text-lg font-bold text-white">
                10-Metric Pitch Analysis ({stadium.name})
              </h4>
            </div>
            <span className="text-xs text-slate-300 font-mono tabular-nums">
              Par {stadium.avgFirstInningsScore} · {stadium.pitchType}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            {tenPitchMetrics.map((m) => (
              <div
                key={m.idx}
                className="rounded-xl border border-slate-800 bg-slate-950 p-3.5 space-y-1"
              >
                <div className="flex items-center justify-between text-[11px] text-slate-400">
                  <span className="font-mono">{m.idx}.</span>
                  <span className="truncate ml-1 text-slate-300 font-medium">{m.title}</span>
                </div>
                <strong className={`text-base font-mono font-bold tabular-nums block ${m.accent}`}>
                  {m.value}
                </strong>
                <p className="text-[11px] text-slate-300 truncate">{m.detail}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
};
