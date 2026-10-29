import React, { useState } from 'react';
import { useGame } from '../../context/GameContext';
import { RIVALRIES, STADIUM_DNAS, SITUATIONAL_XI_PRESETS } from '../../data/cricketLabData';
import { STADIUMS, TEAMS } from '../../data/cricketData';
import { CountryFlag, TeamCrest, getTeamFlagUrl } from '../common/CricketIdentity';
import { StadiumPhoto } from '../common/StadiumPhoto';
import { resolveStadiumLandmarkCaption } from '../../data/stadiumImageCatalog';
import { VenueBallPhysicsHub } from '../common/VenueBallPhysicsHub';
import { cricketAudio } from '../../utils/audioSystem';
import { Flame, Compass, Sparkles, Swords, Layers, Shield } from 'lucide-react';

export const RivalriesView: React.FC = () => {
  const { addXp, setActiveView, setActiveModalStadium } = useGame();
  const [activeTab, setActiveTab] = useState<'rivalries' | 'stadiums' | 'situational_xi'>('rivalries');

  // Situational XI state
  const [selectedObjectiveIdx, setSelectedObjectiveIdx] = useState<number>(0);
  const activePreset = SITUATIONAL_XI_PRESETS[selectedObjectiveIdx];

  // Stadium DNA state
  const [selectedStadiumId, setSelectedStadiumId] = useState<string>('ahmedabad');
  const activeStadium = STADIUMS.find((s) => s.id === selectedStadiumId) || STADIUMS[0];
  const activeStadiumDna = STADIUM_DNAS[selectedStadiumId] || STADIUM_DNAS.ahmedabad;

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-16">
      {/* Title */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-rose-400 font-bold">
            <Flame className="h-4 w-4" />
            <span>CRICKET UNIVERSE INTELLIGENCE</span>
            <span aria-hidden="true">·</span>
            <span>RIVALRY HEAT & STADIUM DNA</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight mt-1">
            Rivalries, Stadium DNA & Situational XIs
          </h1>
          <p className="text-xs text-slate-400 mt-1 max-w-xl">
            Explore world cricket rivalries, venue personality ratings, and situation-specific optimal line-ups.
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-1 rounded-xl border border-slate-800 bg-slate-900 p-1 text-xs font-semibold">
          <button
            onClick={() => setActiveTab('rivalries')}
            className={`rounded-lg px-3.5 py-1.5 transition-colors cursor-pointer ${
              activeTab === 'rivalries' ? 'bg-rose-600 text-white font-bold' : 'text-slate-400 hover:text-white'
            }`}
          >
            Rivalry Heat
          </button>
          <button
            onClick={() => setActiveTab('stadiums')}
            className={`rounded-lg px-3.5 py-1.5 transition-colors cursor-pointer ${
              activeTab === 'stadiums' ? 'bg-rose-600 text-white font-bold' : 'text-slate-400 hover:text-white'
            }`}
          >
            Stadium DNA
          </button>
          <button
            onClick={() => setActiveTab('situational_xi')}
            className={`rounded-lg px-3.5 py-1.5 transition-colors cursor-pointer ${
              activeTab === 'situational_xi' ? 'bg-rose-600 text-white font-bold' : 'text-slate-400 hover:text-white'
            }`}
          >
            Situational Perfect XI
          </button>
        </div>
      </div>

      {/* --- TAB 1: RIVALRIES --- */}
      {activeTab === 'rivalries' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {RIVALRIES.map((riv) => (
              <div
                key={riv.id}
                className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6 space-y-4 backdrop-blur-md flex flex-col justify-between"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono text-rose-400 font-bold flex items-center gap-1">
                      <Flame className="h-3.5 w-3.5" />
                      <span>HEAT {riv.heatIndex}/100</span>
                    </span>
                    <span className="text-[10px] font-mono text-slate-500">HEAD-TO-HEAD</span>
                  </div>

                  <h2 className="text-lg font-bold text-white">{riv.title}</h2>
                  <p className="text-xs text-slate-400 leading-relaxed font-sans">{riv.subtitle}</p>

                  <div className="rounded-xl border border-slate-800 bg-slate-950 p-3 space-y-1.5 text-xs font-mono">
                    <div className="flex justify-between text-slate-300">
                      <span>Key Clash Battle:</span>
                      <span className="text-white font-bold">{riv.keyBattle}</span>
                    </div>
                    <div className="flex justify-between text-slate-400 text-[11px]">
                      <span>Tournament Record:</span>
                      <span className="text-sky-400 font-bold">
                        {Object.entries(riv.headToHead)
                          .map(([k, v]) => `${k.replace('Wins', '')}: ${v}`)
                          .join(' · ')}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-800">
                  <p className="text-[11px] text-slate-400 leading-tight">{riv.tensionFactor}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* --- TAB 2: STADIUM DNA --- */}
      {activeTab === 'stadiums' && (
        <div className="space-y-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Stadium List */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 space-y-2.5 backdrop-blur-md max-h-[680px] overflow-y-auto">
            <span className="text-xs font-mono text-slate-400 font-bold block mb-2">SELECT VENUE (16 ARENAS)</span>
            {STADIUMS.map((std) => (
              <button
                key={std.id}
                onClick={() => {
                  setSelectedStadiumId(std.id);
                  cricketAudio.playBatHit();
                }}
                className={`w-full p-2.5 rounded-xl border text-left transition-all cursor-pointer flex items-center gap-3 ${
                  selectedStadiumId === std.id
                    ? 'border-rose-500 bg-rose-500/15 text-white font-bold'
                    : 'border-slate-800 bg-slate-950 text-slate-300 hover:border-slate-700'
                }`}
              >
                <div className="h-11 w-16 shrink-0 rounded-lg overflow-hidden border border-slate-800 bg-slate-900">
                  <StadiumPhoto
                    stadium={std}
                    alt={`${std.name}, ${std.city}`}
                    className="h-full w-full"
                    imgClassName="h-full w-full object-cover"
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <span className="truncate">{std.name}</span>
                    <img
                      src={getTeamFlagUrl(std.country)}
                      alt={std.country}
                      referrerPolicy="no-referrer"
                      className="h-3 w-4.5 rounded-[2px] object-cover shrink-0 border border-white/20"
                    />
                  </div>
                  <div className="text-[10px] font-mono text-slate-400 truncate mt-0.5 tabular-nums">
                    {std.city}, {std.country} · {std.capacity.toLocaleString()} seats
                  </div>
                </div>
              </button>
            ))}
          </div>

          {/* Stadium DNA Personality Radar */}
          <div className="lg:col-span-2 rounded-2xl border border-slate-800 bg-slate-900/80 p-6 space-y-6 backdrop-blur-md">
            {/* Panoramic Stadium Banner */}
            <div className="relative h-52 sm:h-64 w-full rounded-2xl overflow-hidden border border-slate-800 bg-slate-950">
              <StadiumPhoto
                stadium={activeStadium}
                alt={`${activeStadium.name} — ${activeStadium.city}, ${activeStadium.country}`}
                eager
                className="h-full w-full"
                imgClassName="h-full w-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/60 to-transparent" />
              <div className="absolute top-3.5 left-4 right-4 flex flex-wrap items-center justify-between gap-2 text-xs font-mono text-slate-200">
                <span className="inline-flex items-center gap-1.5 rounded-lg bg-slate-950/80 backdrop-blur-md border border-white/10 px-3 py-1">
                  <img
                    src={getTeamFlagUrl(activeStadium.country)}
                    alt={activeStadium.country}
                    referrerPolicy="no-referrer"
                    className="h-3.5 w-5 rounded-[2px] object-cover border border-white/20"
                  />
                  <span>{activeStadium.city}, {activeStadium.country}</span>
                </span>
                <span className="rounded-lg bg-slate-950/80 backdrop-blur-md border border-white/10 px-3 py-1 tabular-nums">
                  {activeStadium.boundarySizeMeters.straight}m Straight · {activeStadium.boundarySizeMeters.square}m Square
                </span>
              </div>
              <div className="absolute bottom-3.5 left-4 right-4 flex flex-col sm:flex-row sm:items-end justify-between gap-2.5">
                <div>
                  <p className="text-xs font-mono text-rose-300">
                    {resolveStadiumLandmarkCaption(activeStadium)}
                  </p>
                  <h2 className="text-xl sm:text-2xl font-black text-white mt-0.5">{activeStadium.name}</h2>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    cricketAudio.playUiClick();
                    setActiveModalStadium(activeStadium);
                  }}
                  className="rounded-xl border border-white/20 bg-slate-950/85 backdrop-blur-md px-3.5 py-1.5 text-xs font-bold text-slate-100 hover:border-amber-400 hover:text-amber-300 transition-colors cursor-pointer whitespace-nowrap shrink-0"
                >
                  Architectural Angles →
                </button>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-4 text-xs font-mono tabular-nums">
              <span className="text-slate-300">
                Capacity {activeStadium.capacity.toLocaleString()} · Avg 1st Inn {activeStadium.avgFirstInningsScore} · {activeStadium.pitchType}
              </span>
              <span className="text-emerald-400 font-bold">CHASING WIN: {activeStadium.chasingWinPercent}%</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs font-mono">
              {[
                { label: 'PACE & BOUNCE', val: activeStadiumDna.pace, color: 'bg-sky-500' },
                { label: 'SPIN GRIP', val: activeStadiumDna.spin, color: 'bg-purple-500' },
                { label: 'BOUNDARY CLEARANCE', val: activeStadiumDna.boundaries, color: 'bg-amber-500' },
                { label: 'DEW SEVERITY', val: activeStadiumDna.dew, color: 'bg-blue-500' },
                { label: 'CHASE CONVERSION', val: activeStadiumDna.chase, color: 'bg-emerald-500' },
                { label: 'POWERPLAY RUN RATE', val: activeStadiumDna.powerplay, color: 'bg-rose-500' },
              ].map((m, idx) => (
                <div key={idx} className="rounded-xl border border-slate-800 bg-slate-950 p-3.5 space-y-2">
                  <div className="flex justify-between text-slate-400 text-[11px]">
                    <span>{m.label}</span>
                    <span className="text-white font-bold">{m.val}%</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-slate-800 overflow-hidden">
                    <div className={`h-full ${m.color}`} style={{ width: `${m.val}%` }} />
                  </div>
                </div>
              ))}
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-950 p-4 text-xs text-slate-300 leading-relaxed font-sans">
              <strong className="text-white block mb-1">AI Pitch Intelligence:</strong>
              {activeStadium.dewFactor === 'Heavy'
                ? 'Heavy evening dew slickens the outfield grass, reducing bowling grip efficiency by 24% and granting chasing teams a statistically significant advantage.'
                : 'Balanced surface provides even carry through to the wicketkeeper with minimal late seam movement.'}
            </div>
          </div>
          </div>

          <VenueBallPhysicsHub
            selectedStadiumId={selectedStadiumId}
            onSelectStadium={(id) => setSelectedStadiumId(id)}
          />
        </div>
      )}

      {/* --- TAB 3: SITUATIONAL PERFECT XI --- */}
      {activeTab === 'situational_xi' && (
        <div className="space-y-6">
          {/* Preset Buttons */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {SITUATIONAL_XI_PRESETS.map((preset, idx) => {
              const isSelected = selectedObjectiveIdx === idx;
              return (
                <button
                  key={idx}
                  onClick={() => {
                    setSelectedObjectiveIdx(idx);
                    cricketAudio.playBatHit();
                  }}
                  className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
                    isSelected
                      ? 'border-rose-500 bg-rose-500/15 text-white font-bold'
                      : 'border-slate-800 bg-slate-900/60 text-slate-300 hover:border-slate-700'
                  }`}
                >
                  <span className="text-xs block mb-1">{preset.objective}</span>
                  <span className="text-[10px] font-mono text-emerald-400">AI Score: {preset.aiScore}/100</span>
                </button>
              );
            })}
          </div>

          {/* Selected Preset Details */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6 space-y-5 backdrop-blur-md">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
              <div>
                <span className="text-xs font-mono text-rose-400 font-bold">ALGORITHMIC SPECIALIZED XI</span>
                <h2 className="text-lg font-bold text-white mt-0.5">{activePreset.objective}</h2>
                <p className="text-xs text-slate-400">{activePreset.tagline}</p>
              </div>
              <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3.5 py-1.5 text-emerald-400 text-xs font-bold font-mono">
                AI MATCH COMPATIBILITY: {activePreset.aiScore}/100
              </div>
            </div>

            <div className="space-y-2">
              <span className="text-xs font-mono text-slate-400 font-bold block">TACTICAL STRATEGY</span>
              <p className="text-xs text-slate-300 leading-relaxed font-sans">{activePreset.keyStrategy}</p>
            </div>

            <div className="space-y-3 pt-2">
              <span className="text-xs font-mono text-slate-400 font-bold block">SPECIALIZED PLAYING LINEUP:</span>
              <div className="flex flex-wrap gap-2">
                {activePreset.recommendedLineup.map((name, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-1.5 rounded-xl border border-slate-800 bg-slate-950 px-3 py-1.5 text-xs text-white font-mono"
                  >
                    <span className="text-slate-500 font-bold text-[10px]">#{idx + 1}</span>
                    <span>{name}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
