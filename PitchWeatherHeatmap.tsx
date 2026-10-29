import React, { useState, useMemo } from 'react';
import { CloudRain, Droplets, Thermometer, ArrowDownRight, Zap, Info, ShieldAlert } from 'lucide-react';

interface PitchWeatherHeatmapProps {
  temperature?: number;
  humidity?: number;
  dewLevel?: number;
}

interface PitchZoneSpeedDrop {
  zoneName: string;
  lengthRange: string;
  nominalSpeedKmh: number;
  frictionDropKmh: number;
  postBounceSpeedKmh: number;
  skidFactor: 'Extreme Skid' | 'Moderate Friction' | 'Heavy Sponge Drag';
  color: string;
  riskNotice: string;
}

export const PitchWeatherHeatmap: React.FC<PitchWeatherHeatmapProps> = ({
  temperature = 28,
  humidity: initialHumidity = 78,
  dewLevel: initialDew = 65,
}) => {
  const [precipitationProb, setPrecipitationProb] = useState<number>(45); // 0-100%
  const [humidity, setHumidity] = useState<number>(initialHumidity);
  const [surfaceMoisture, setSurfaceMoisture] = useState<number>(initialDew);

  // Calculate speed drop-off across pitch zones based on moisture & humidity
  const zones: PitchZoneSpeedDrop[] = useMemo(() => {
    // Moisture index from 0 to 1
    const moisture = (precipitationProb * 0.5 + humidity * 0.3 + surfaceMoisture * 0.2) / 100;

    return [
      {
        zoneName: 'Full Yorker / Blockhole',
        lengthRange: '0.0m - 3.0m from stumps',
        nominalSpeedKmh: 142,
        frictionDropKmh: Number((moisture * 4.2 + 2.1).toFixed(1)),
        postBounceSpeedKmh: Number((142 - (moisture * 4.2 + 2.1)).toFixed(1)),
        skidFactor: moisture > 0.6 ? 'Extreme Skid' : 'Moderate Friction',
        color: '#06b6d4',
        riskNotice: 'Wet turf causes leather to slide without grabbing seam, reducing reaction time for batters.',
      },
      {
        zoneName: 'Good Length Corridor (Primary Seam Zone)',
        lengthRange: '4.0m - 7.0m from stumps',
        nominalSpeedKmh: 140,
        frictionDropKmh: Number((moisture * 9.8 + 5.2).toFixed(1)),
        postBounceSpeedKmh: Number((140 - (moisture * 9.8 + 5.2)).toFixed(1)),
        skidFactor: moisture > 0.7 ? 'Heavy Sponge Drag' : 'Moderate Friction',
        color: '#38bdf8',
        riskNotice: 'Highest energy dissipation zone; soggy clay absorbs seam shock, lowering bounce height by 14cm.',
      },
      {
        zoneName: 'Back of Length / Hip Height',
        lengthRange: '7.0m - 10.0m from stumps',
        nominalSpeedKmh: 138,
        frictionDropKmh: Number((moisture * 7.5 + 4.1).toFixed(1)),
        postBounceSpeedKmh: Number((138 - (moisture * 7.5 + 4.1)).toFixed(1)),
        skidFactor: 'Moderate Friction',
        color: '#f59e0b',
        riskNotice: 'Ball sticks slightly in damp grass before kicking into midriff; high edge hazard.',
      },
      {
        zoneName: 'Short Bouncer Territory',
        lengthRange: '10.0m - 14.0m from stumps',
        nominalSpeedKmh: 136,
        frictionDropKmh: Number((moisture * 5.6 + 3.4).toFixed(1)),
        postBounceSpeedKmh: Number((136 - (moisture * 5.6 + 3.4)).toFixed(1)),
        skidFactor: moisture > 0.5 ? 'Moderate Friction' : 'Heavy Sponge Drag',
        color: '#ef4444',
        riskNotice: 'Moisture dampens vertical rebound, keeping bouncers at chest rather than helmet level.',
      },
    ];
  }, [precipitationProb, humidity, surfaceMoisture]);

  return (
    <div className="rounded-2xl border border-cyan-500/30 bg-slate-950/80 p-5 backdrop-blur-xl shadow-2xl space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-cyan-500/20 pb-3">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono font-bold text-cyan-400 uppercase tracking-wider">
            <CloudRain className="h-4 w-4 animate-pulse" />
            <span>PRECIPITATION & HUMIDITY SPEED DROP-OFF HEATMAP</span>
          </div>
          <h3 className="text-base font-black text-white mt-0.5">
            Zone-by-Zone Pitch Friction Drag & Ball Velocity Dissipation
          </h3>
        </div>

        <div className="flex items-center gap-2 text-xs font-mono px-3 py-1.5 rounded-xl border border-cyan-500/30 bg-cyan-950/40 text-cyan-300">
          <Zap className="h-3.5 w-3.5 text-cyan-400" />
          <span>Reynolds Fluid Dynamic Aerodynamics</span>
        </div>
      </div>

      {/* Moisture Tuning Sliders */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs font-mono">
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-3 space-y-1.5">
          <div className="flex justify-between">
            <span className="text-slate-400 flex items-center gap-1">
              <CloudRain className="h-3.5 w-3.5 text-sky-400" />
              <span>Precipitation / Rain Forecast</span>
            </span>
            <strong className="text-sky-400">{precipitationProb}%</strong>
          </div>
          <input
            type="range"
            min="0"
            max="100"
            value={precipitationProb}
            onChange={(e) => setPrecipitationProb(Number(e.target.value))}
            className="w-full accent-sky-400 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
          />
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-3 space-y-1.5">
          <div className="flex justify-between">
            <span className="text-slate-400 flex items-center gap-1">
              <Droplets className="h-3.5 w-3.5 text-cyan-400" />
              <span>Ambient Relative Humidity</span>
            </span>
            <strong className="text-cyan-400">{humidity}%</strong>
          </div>
          <input
            type="range"
            min="20"
            max="95"
            value={humidity}
            onChange={(e) => setHumidity(Number(e.target.value))}
            className="w-full accent-cyan-400 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
          />
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-3 space-y-1.5">
          <div className="flex justify-between">
            <span className="text-slate-400 flex items-center gap-1">
              <Thermometer className="h-3.5 w-3.5 text-emerald-400" />
              <span>Surface Condensation Index</span>
            </span>
            <strong className="text-emerald-400">{surfaceMoisture}%</strong>
          </div>
          <input
            type="range"
            min="0"
            max="100"
            value={surfaceMoisture}
            onChange={(e) => setSurfaceMoisture(Number(e.target.value))}
            className="w-full accent-emerald-400 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
          />
        </div>
      </div>

      {/* 22-Yard Pitch Heatmap Visualization Grid */}
      <div className="space-y-3 font-mono text-xs">
        <span className="text-slate-400 font-bold block uppercase text-[10px]">
          22-YARD STRIP IMPACT ZONE HEATMAP (BOWLER RELEASE 22M → STUMPS 0M)
        </span>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {zones.map((zone, idx) => {
            const dropPercent = Math.round((zone.frictionDropKmh / zone.nominalSpeedKmh) * 100);
            return (
              <div
                key={idx}
                className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4 space-y-3 flex flex-col justify-between transition-transform hover:scale-[1.02]"
              >
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span
                      className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                      style={{
                        backgroundColor: `${zone.color}22`,
                        color: zone.color,
                        border: `1px solid ${zone.color}44`,
                      }}
                    >
                      ZONE {idx + 1}
                    </span>
                    <span className="text-[10px] text-slate-400">{zone.lengthRange}</span>
                  </div>

                  <h4 className="text-sm font-bold text-white mt-1">{zone.zoneName}</h4>
                  <p className="text-[11px] text-slate-300 font-sans mt-1 leading-relaxed">
                    {zone.riskNotice}
                  </p>
                </div>

                {/* Speed Telemetry */}
                <div className="space-y-2 border-t border-slate-800/80 pt-3">
                  <div className="flex justify-between text-[11px]">
                    <span className="text-slate-400">Release Velocity:</span>
                    <span className="text-white font-bold">{zone.nominalSpeedKmh} km/h</span>
                  </div>
                  <div className="flex justify-between text-[11px]">
                    <span className="text-rose-400 font-bold flex items-center gap-1">
                      <ArrowDownRight className="h-3 w-3" />
                      <span>Speed Loss (Drag):</span>
                    </span>
                    <span className="text-rose-400 font-black">-{zone.frictionDropKmh} km/h ({dropPercent}%)</span>
                  </div>
                  <div className="flex justify-between text-xs pt-1 border-t border-slate-800">
                    <span className="text-emerald-400 font-bold">Batter Arrival:</span>
                    <span className="text-emerald-300 font-black">{zone.postBounceSpeedKmh} km/h</span>
                  </div>

                  {/* Visual Drop-off Heat Bar */}
                  <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-emerald-400 via-amber-400 to-rose-500"
                      style={{ width: `${Math.min(100, dropPercent * 9)}%` }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
