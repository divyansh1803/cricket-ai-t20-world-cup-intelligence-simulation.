import React, { useEffect, useRef, useState } from 'react';
import { Volume2, VolumeX, Activity, Radio, Sparkles, Zap, Flame, Mic, ShieldAlert, Disc3, ChevronDown, ChevronUp } from 'lucide-react';
import { audioManager, AcousticEventPayload } from '../../services/AudioManager';

interface StadiumAudioVisualizerProps {
  lastBallOutcome?: string;
  isWicket?: boolean;
  isSix?: boolean;
  isFour?: boolean;
  isDeathOver?: boolean;
  currentOver?: number;
  requiredRR?: number;
  className?: string;
}

export type VisualizerMode = 'spectrum' | 'radial_shockwave' | 'decibel_meter';

export const StadiumAudioVisualizer: React.FC<StadiumAudioVisualizerProps> = ({
  lastBallOutcome,
  isWicket,
  isSix,
  isFour,
  isDeathOver = false,
  currentOver = 18,
  requiredRR = 9.5,
  className = '',
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [mode, setMode] = useState<VisualizerMode>('spectrum');
  const [decibels, setDecibels] = useState<number>(76);
  const [peakDecibels, setPeakDecibels] = useState<number>(102);
  const [isErupting, setIsErupting] = useState<string | null>(null);
  const [activeEventLabel, setActiveEventLabel] = useState<string | null>(null);
  const [audioMuted, setAudioMuted] = useState<boolean>(audioManager.isMuted());
  const [isDeathMusicPlaying, setIsDeathMusicPlaying] = useState<boolean>(audioManager.isDeathOversMusicPlaying());
  const [showSoundSuite, setShowSoundSuite] = useState<boolean>(false);
  const [lastCommentaryText, setLastCommentaryText] = useState<string>('Broadcast feed connected');

  // Real-time audio frequency animation loop
  useEffect(() => {
    let animId: number;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const freqArray = new Uint8Array(32);

    const render = () => {
      // Get real audio frequency data from the new AudioManager service
      audioManager.getFrequencyData(freqArray);

      // Compute root-mean-square audio energy
      let sum = 0;
      for (let i = 0; i < freqArray.length; i++) {
        sum += freqArray[i];
      }
      const avg = sum / freqArray.length;

      // Realistic stadium decibels calculated from audio energy + match tension
      const baseDb = isDeathOver || isDeathMusicPlaying ? 86 : 74;
      const calculatedDb = Math.min(
        118,
        Math.round(baseDb + (avg / 255) * 36 + (isErupting ? 18 : 0))
      );
      setDecibels((prev) => Math.round(prev * 0.85 + calculatedDb * 0.15));
      setPeakDecibels((prev) => Math.max(prev, calculatedDb));

      // Canvas Rendering
      const width = canvas.width;
      const height = canvas.height;
      ctx.clearRect(0, 0, width, height);

      if (mode === 'spectrum') {
        const barCount = 28;
        const barWidth = width / barCount - 2;

        for (let i = 0; i < barCount; i++) {
          const rawVal = freqArray[i % freqArray.length];
          const boost = isErupting ? 1.6 : 1.0;
          const barHeight = Math.max(4, ((rawVal * boost) / 255) * (height - 8));
          const x = i * (barWidth + 2);
          const y = height - barHeight;

          const grad = ctx.createLinearGradient(0, height, 0, y);
          if (isErupting === 'SIX_ROAR' || isErupting === 'SIX') {
            grad.addColorStop(0, '#f59e0b');
            grad.addColorStop(0.6, '#fbbf24');
            grad.addColorStop(1, '#ffffff');
          } else if (isErupting === 'WICKET_FALL' || isErupting === 'WICKET') {
            grad.addColorStop(0, '#ef4444');
            grad.addColorStop(0.6, '#f87171');
            grad.addColorStop(1, '#ffffff');
          } else if (isErupting === 'CLOSE_CALL_GASP') {
            grad.addColorStop(0, '#8b5cf6');
            grad.addColorStop(0.6, '#a78bfa');
            grad.addColorStop(1, '#ffffff');
          } else if (isErupting === 'FOUR_APPLAUSE' || isErupting === 'FOUR') {
            grad.addColorStop(0, '#06b6d4');
            grad.addColorStop(0.7, '#38bdf8');
            grad.addColorStop(1, '#ffffff');
          } else if (isDeathOver || isDeathMusicPlaying) {
            grad.addColorStop(0, '#f97316');
            grad.addColorStop(1, '#eab308');
          } else {
            grad.addColorStop(0, '#10b981');
            grad.addColorStop(0.5, '#38bdf8');
            grad.addColorStop(1, '#818cf8');
          }

          ctx.fillStyle = grad;
          ctx.beginPath();
          ctx.roundRect(x, y, barWidth, barHeight, [3, 3, 0, 0]);
          ctx.fill();
        }
      } else if (mode === 'radial_shockwave') {
        const centerX = width / 2;
        const centerY = height / 2;
        const maxRadius = Math.min(width, height) / 2;

        const pulse = (Date.now() % 1200) / 1200;
        const rings = isErupting ? 5 : 3;

        for (let r = 0; r < rings; r++) {
          const ringPulse = (pulse + r / rings) % 1;
          const radius = ringPulse * maxRadius;
          const alpha = (1 - ringPulse) * (isErupting ? 0.9 : 0.4);

          ctx.beginPath();
          ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
          ctx.strokeStyle =
            isErupting === 'SIX_ROAR' || isErupting === 'SIX'
              ? `rgba(245, 158, 11, ${alpha})`
              : isErupting === 'WICKET_FALL' || isErupting === 'WICKET'
              ? `rgba(239, 68, 68, ${alpha})`
              : isErupting === 'CLOSE_CALL_GASP'
              ? `rgba(139, 92, 246, ${alpha})`
              : isErupting === 'FOUR_APPLAUSE' || isErupting === 'FOUR'
              ? `rgba(56, 189, 248, ${alpha})`
              : `rgba(16, 185, 129, ${alpha})`;
          ctx.lineWidth = isErupting ? 3 : 1.5;
          ctx.stroke();
        }
      }

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, [mode, isErupting, isDeathOver, isDeathMusicPlaying]);

  // Subscribe to new AudioManager Acoustic Events
  useEffect(() => {
    const unsubscribe = audioManager.subscribe((payload: AcousticEventPayload) => {
      setIsErupting(payload.type);
      setActiveEventLabel(payload.label);
      if (payload.dbEstimate) {
        setPeakDecibels((prev) => Math.max(prev, payload.dbEstimate));
      }

      if (payload.type === 'AI_COMMENTARY' && payload.metadata?.phrase) {
        setLastCommentaryText(String(payload.metadata.phrase));
      }

      const timeout = setTimeout(() => {
        setIsErupting(null);
        setActiveEventLabel(null);
      }, payload.type === 'SIX_ROAR' ? 2600 : payload.type === 'CLOSE_CALL_GASP' ? 1400 : 1800);

      return () => clearTimeout(timeout);
    });

    return () => unsubscribe();
  }, []);

  // Sync prop changes
  useEffect(() => {
    if (isSix || lastBallOutcome === '6') {
      setIsErupting('SIX_ROAR');
      setActiveEventLabel('STADIUM ROAR: 116 dB');
      const timer = setTimeout(() => {
        setIsErupting(null);
        setActiveEventLabel(null);
      }, 2500);
      return () => clearTimeout(timer);
    }
    if (isFour || lastBallOutcome === '4') {
      setIsErupting('FOUR_APPLAUSE');
      setActiveEventLabel('BOUNDARY APPLAUSE: 102 dB');
      const timer = setTimeout(() => {
        setIsErupting(null);
        setActiveEventLabel(null);
      }, 1800);
      return () => clearTimeout(timer);
    }
    if (isWicket) {
      setIsErupting('WICKET_FALL');
      setActiveEventLabel('WICKET SHOCK: 112 dB');
      const timer = setTimeout(() => {
        setIsErupting(null);
        setActiveEventLabel(null);
      }, 2200);
      return () => clearTimeout(timer);
    }
  }, [isSix, isFour, isWicket, lastBallOutcome]);

  // Sync death overs music with match state
  useEffect(() => {
    if ((isDeathOver || (currentOver >= 16 && requiredRR > 8)) && !audioMuted) {
      if (!isDeathMusicPlaying) {
        audioManager.startDeathOversMusic({ tempoBpm: 130, intensity: 1.0 });
        setIsDeathMusicPlaying(true);
      }
    }
  }, [isDeathOver, currentOver, requiredRR, audioMuted, isDeathMusicPlaying]);

  const toggleSound = () => {
    const nextUnmuted = audioManager.toggleMute();
    setAudioMuted(!nextUnmuted);
  };

  const toggleDeathOversMusic = () => {
    if (isDeathMusicPlaying) {
      audioManager.stopDeathOversMusic();
      setIsDeathMusicPlaying(false);
    } else {
      audioManager.startDeathOversMusic({ tempoBpm: 132, intensity: 1.0 });
      setIsDeathMusicPlaying(true);
    }
  };

  return (
    <div
      className={`relative rounded-2xl border transition-all duration-500 backdrop-blur-md shadow-2xl overflow-hidden ${
        isErupting === 'SIX_ROAR' || isErupting === 'SIX'
          ? 'border-amber-400 bg-amber-950/40 shadow-amber-500/25 ring-2 ring-amber-400/50'
          : isErupting === 'WICKET_FALL' || isErupting === 'WICKET'
          ? 'border-rose-500 bg-rose-950/40 shadow-rose-500/25 ring-2 ring-rose-500/50'
          : isErupting === 'CLOSE_CALL_GASP'
          ? 'border-purple-400 bg-purple-950/40 shadow-purple-500/25 ring-2 ring-purple-400/50'
          : isErupting === 'FOUR_APPLAUSE' || isErupting === 'FOUR'
          ? 'border-sky-400 bg-sky-950/40 shadow-sky-500/25 ring-2 ring-sky-400/50'
          : isDeathOver || isDeathMusicPlaying
          ? 'border-amber-600/60 bg-slate-950/85'
          : 'border-slate-800 bg-slate-950/85'
      } ${className}`}
    >
      {/* Visualizer Top Bar with Decibel Meter & Sound Controls */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-slate-800/80 bg-slate-900/60 text-xs">
        {/* Left: Sound-Reactive Status */}
        <div className="flex items-center gap-2">
          <div className="relative flex items-center justify-center">
            <span
              className={`h-2.5 w-2.5 rounded-full ${
                isErupting
                  ? 'bg-amber-400 animate-ping'
                  : isDeathOver || isDeathMusicPlaying
                  ? 'bg-rose-400 animate-pulse'
                  : 'bg-emerald-400'
              }`}
            />
            <span
              className={`absolute h-2.5 w-2.5 rounded-full ${
                isErupting ? 'bg-amber-400' : isDeathOver || isDeathMusicPlaying ? 'bg-rose-400' : 'bg-emerald-400'
              }`}
            />
          </div>

          <span className="font-mono font-bold text-[11px] text-white tracking-wide flex items-center gap-1.5">
            <Radio className="h-3 w-3 text-sky-400" />
            <span>AUDIOMANAGER HUD</span>
          </span>

          {/* Event Badge */}
          {activeEventLabel && (
            <span
              className={`rounded-full px-2 py-0.5 text-[9px] font-black uppercase tracking-wider animate-bounce ${
                isErupting === 'SIX_ROAR' || isErupting === 'SIX'
                  ? 'bg-amber-500 text-slate-950'
                  : isErupting === 'WICKET_FALL' || isErupting === 'WICKET'
                  ? 'bg-rose-600 text-white'
                  : isErupting === 'CLOSE_CALL_GASP'
                  ? 'bg-purple-500 text-white'
                  : 'bg-sky-500 text-slate-950'
              }`}
            >
              {activeEventLabel}
            </span>
          )}

          {isDeathMusicPlaying && !activeEventLabel && (
            <span className="rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/40 px-2 py-0.5 text-[9px] font-mono font-bold animate-pulse flex items-center gap-1">
              <Flame className="h-2.5 w-2.5 text-rose-400" />
              <span>DEATH OVERS OST</span>
            </span>
          )}
        </div>

        {/* Right: Mode Selector, Test Suite Toggle & Mute Toggle */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setMode('spectrum')}
            className={`rounded px-1.5 py-0.5 text-[10px] font-mono font-bold transition-colors cursor-pointer ${
              mode === 'spectrum' ? 'bg-sky-500 text-slate-950' : 'text-slate-400 hover:text-white'
            }`}
            title="Frequency Spectrum Bars"
          >
            EQ
          </button>
          <button
            onClick={() => setMode('radial_shockwave')}
            className={`rounded px-1.5 py-0.5 text-[10px] font-mono font-bold transition-colors cursor-pointer ${
              mode === 'radial_shockwave' ? 'bg-sky-500 text-slate-950' : 'text-slate-400 hover:text-white'
            }`}
            title="Radial Sonic Shockwaves"
          >
            RIPPLE
          </button>

          <button
            onClick={() => setShowSoundSuite(!showSoundSuite)}
            className={`flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[10px] font-mono font-bold border border-slate-700 transition-colors cursor-pointer ${
              showSoundSuite ? 'bg-indigo-600 text-white border-indigo-400' : 'bg-slate-800/80 text-slate-300 hover:text-white'
            }`}
            title="Toggle Stadium Sound FX Test Suite"
          >
            <span>SFX</span>
            {showSoundSuite ? <ChevronUp className="h-2.5 w-2.5" /> : <ChevronDown className="h-2.5 w-2.5" />}
          </button>

          <button
            onClick={toggleSound}
            className={`p-1 rounded-md text-slate-400 hover:text-white transition-colors cursor-pointer ${
              audioMuted ? 'text-rose-400' : 'text-emerald-400'
            }`}
            title={audioMuted ? 'Unmute Stadium Audio' : 'Mute Stadium Audio'}
          >
            {audioMuted ? <VolumeX className="h-3.5 w-3.5" /> : <Volume2 className="h-3.5 w-3.5" />}
          </button>
        </div>
      </div>

      {/* Visualizer Body: Canvas + Live Decibel Meter */}
      <div className="p-2.5 flex items-center gap-3">
        {/* Dynamic Frequency Canvas */}
        <div className="relative flex-1 h-14 bg-slate-950/90 rounded-xl border border-slate-800/80 p-1 overflow-hidden flex items-center justify-center">
          <canvas
            ref={canvasRef}
            width={280}
            height={48}
            className="w-full h-full object-contain"
          />

          {/* Eruption Fireworks / Shockwave Particle Flare */}
          {isErupting && (
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
              <div
                className={`w-full h-full animate-ping opacity-30 ${
                  isErupting === 'SIX_ROAR' || isErupting === 'SIX'
                    ? 'bg-amber-400'
                    : isErupting === 'WICKET_FALL' || isErupting === 'WICKET'
                    ? 'bg-rose-500'
                    : isErupting === 'CLOSE_CALL_GASP'
                    ? 'bg-purple-500'
                    : 'bg-sky-400'
                }`}
              />
            </div>
          )}
        </div>

        {/* Live Stadium Sound Decibels Meter */}
        <div className="w-28 flex flex-col justify-between py-0.5">
          <div className="flex items-center justify-between text-[10px] font-mono">
            <span className="text-slate-400">CROWD ROAR</span>
            <span
              className={`font-black tabular-nums ${
                decibels > 105
                  ? 'text-amber-400 animate-pulse'
                  : decibels > 90
                  ? 'text-sky-300'
                  : 'text-slate-300'
              }`}
            >
              {decibels} dB
            </span>
          </div>

          {/* Decibel Level Bar */}
          <div className="h-2 w-full bg-slate-900 rounded-full overflow-hidden border border-slate-800 flex shadow-inner my-1">
            <div
              className={`h-full transition-all duration-150 rounded-full ${
                decibels > 105
                  ? 'bg-gradient-to-r from-amber-500 to-rose-500'
                  : decibels > 90
                  ? 'bg-gradient-to-r from-emerald-500 to-amber-500'
                  : 'bg-emerald-500'
              }`}
              style={{ width: `${Math.min(100, ((decibels - 60) / 60) * 100)}%` }}
            />
          </div>

          <div className="flex items-center justify-between text-[9px] font-mono text-slate-500">
            <span>PEAK: {peakDecibels} dB</span>
            <span className="text-emerald-400">
              {decibels > 108 ? 'DEAFENING' : decibels > 95 ? 'ELECTRIFYING' : 'BUZZING'}
            </span>
          </div>
        </div>
      </div>

      {/* Broadcast Commentary Subtitle Ticker */}
      <div className="px-3 pb-2 pt-0.5 flex items-center gap-1.5 text-[10px] font-mono text-slate-400 border-t border-slate-850/40 bg-slate-950/60">
        <Mic className="h-3 w-3 text-sky-400 shrink-0" />
        <span className="truncate text-slate-300">
          <strong className="text-sky-400 font-semibold mr-1">AI COMM:</strong>
          {lastCommentaryText}
        </span>
      </div>

      {/* ========================================================================= */}
      {/* AUDIOMANAGER SOUND EVENT TEST DRAWER                                     */}
      {/* ========================================================================= */}
      {showSoundSuite && (
        <div className="p-2.5 border-t border-slate-800/80 bg-slate-950/95 space-y-2 animate-in slide-in-from-top-2 duration-200">
          <div className="flex items-center justify-between text-[10px] font-mono text-slate-400">
            <span className="font-bold text-sky-400 uppercase tracking-wider">Trigger Stadium Sound FX:</span>
            <span>Web Audio Engine</span>
          </div>

          <div className="grid grid-cols-2 gap-1.5 text-[10px] font-mono">
            {/* 1. Roar for a Six */}
            <button
              onClick={() => audioManager.playSixRoar()}
              className="flex items-center gap-1.5 rounded-lg border border-amber-500/30 bg-amber-500/10 px-2 py-1.5 text-amber-300 hover:bg-amber-500/20 hover:text-white transition-all cursor-pointer font-bold"
            >
              <span>💥</span>
              <span>Roar for Six</span>
            </button>

            {/* 2. Collective Gasp for Close Call */}
            <button
              onClick={() => audioManager.playCloseCallGasp('Beaten Outside Edge')}
              className="flex items-center gap-1.5 rounded-lg border border-purple-500/30 bg-purple-500/10 px-2 py-1.5 text-purple-300 hover:bg-purple-500/20 hover:text-white transition-all cursor-pointer font-bold"
            >
              <span>😱</span>
              <span>Close Call Gasp</span>
            </button>

            {/* 3. Death Overs Intense Synth Music */}
            <button
              onClick={toggleDeathOversMusic}
              className={`flex items-center gap-1.5 rounded-lg border px-2 py-1.5 transition-all cursor-pointer font-bold ${
                isDeathMusicPlaying
                  ? 'border-rose-500 bg-rose-500/20 text-rose-300 animate-pulse'
                  : 'border-orange-500/30 bg-orange-500/10 text-orange-300 hover:bg-orange-500/20'
              }`}
            >
              <Flame className="h-3 w-3" />
              <span>{isDeathMusicPlaying ? 'Stop Death OST' : 'Death Overs OST'}</span>
            </button>

            {/* 4. AI Commentary Broadcast Voice */}
            <button
              onClick={() =>
                audioManager.speakAiCommentary(
                  'What a majestic stroke! High, handsome, and into the second tier!',
                  { mood: 'excited' }
                )
              }
              className="flex items-center gap-1.5 rounded-lg border border-sky-500/30 bg-sky-500/10 px-2 py-1.5 text-sky-300 hover:bg-sky-500/20 hover:text-white transition-all cursor-pointer font-bold"
            >
              <Mic className="h-3 w-3" />
              <span>AI Commentary</span>
            </button>

            {/* 5. DRS UltraEdge Sound */}
            <button
              onClick={() => {
                audioManager.playDrsUltraEdgeSpike(true);
                audioManager.playDrsRadioComms("Clear spike on UltraEdge! There is bat on ball.");
              }}
              className="col-span-2 flex items-center justify-center gap-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-2 py-1.5 text-emerald-300 hover:bg-emerald-500/20 hover:text-white transition-all cursor-pointer font-bold"
            >
              <ShieldAlert className="h-3 w-3" />
              <span>DRS Suite (UltraEdge Spike + Radio Comms)</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
