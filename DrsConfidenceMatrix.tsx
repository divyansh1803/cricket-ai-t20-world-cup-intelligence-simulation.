import React, { useState, useEffect, useRef } from 'react';
import {
  ShieldCheck,
  AlertCircle,
  Eye,
  Activity,
  RotateCcw,
  CheckCircle2,
  XCircle,
  Mic,
  MicOff,
  Volume2,
  Sparkles,
  Zap,
  Radio,
} from 'lucide-react';
import { cricketAudio } from '../../utils/audioSystem';

export interface DrsScenario {
  id: string;
  condition: string;
  pitching: 'In Line' | 'Outside Off' | 'Outside Leg';
  impact: 'In Line' | "Umpire's Call (< 2.5cm)" | 'Outside Off';
  wickets: 'Hitting Middle' | 'Hitting Off Stump' | 'Clipping Bails' | 'Missing Stumps';
  deviationMargin: string;
  snickometerStatus: 'Clear Spike' | 'Flat Waveform (No Edge)' | 'Micro-Friction Whisper';
  successProbability: number;
  recommendation: 'STRONG REVIEW (90%+)' | "CALCULATED GAMBLE (50-70%)" | 'BURNING A REVIEW (< 20%)';
  badgeColor: string;
}

const DEFAULT_SCENARIOS: DrsScenario[] = [
  {
    id: 'lbw_plumb',
    condition: 'Full Yorker Pitching In Line to Middle Stump',
    pitching: 'In Line',
    impact: 'In Line',
    wickets: 'Hitting Middle',
    deviationMargin: '±0.4° Seam Correction',
    snickometerStatus: 'Flat Waveform (No Edge)',
    successProbability: 96,
    recommendation: 'STRONG REVIEW (90%+)',
    badgeColor: 'border-emerald-500/40 bg-emerald-500/20 text-emerald-300',
  },
  {
    id: 'spin_glove_edge',
    condition: 'Turning Off-Break off Batter Glove to Slip',
    pitching: 'In Line',
    impact: 'Outside Off',
    wickets: 'Missing Stumps',
    deviationMargin: '±0.2° Acoustic Lag',
    snickometerStatus: 'Clear Spike',
    successProbability: 92,
    recommendation: 'STRONG REVIEW (90%+)',
    badgeColor: 'border-emerald-500/40 bg-emerald-500/20 text-emerald-300',
  },
  {
    id: 'clipping_leg_stump',
    condition: 'Good Length Nipper Clipping Outer Leg Bail',
    pitching: 'In Line',
    impact: "Umpire's Call (< 2.5cm)",
    wickets: 'Clipping Bails',
    deviationMargin: '±1.8° Hawk-Eye Parallax',
    snickometerStatus: 'Flat Waveform (No Edge)',
    successProbability: 58,
    recommendation: "CALCULATED GAMBLE (50-70%)",
    badgeColor: 'border-amber-500/40 bg-amber-500/20 text-amber-300',
  },
  {
    id: 'outside_leg_fatal',
    condition: 'In-Drifter Pitching Millimeters Outside Leg Stump',
    pitching: 'Outside Leg',
    impact: 'In Line',
    wickets: 'Hitting Middle',
    deviationMargin: '±0.3° Absolute Pitch Mark',
    snickometerStatus: 'Flat Waveform (No Edge)',
    successProbability: 0,
    recommendation: 'BURNING A REVIEW (< 20%)',
    badgeColor: 'border-rose-500/40 bg-rose-500/20 text-rose-300',
  },
  {
    id: 'bounced_over_stumps',
    condition: 'Back-of-Length Steep Bounce on Perth Deck',
    pitching: 'In Line',
    impact: 'In Line',
    wickets: 'Missing Stumps',
    deviationMargin: '±2.4cm Trajectory Height Error',
    snickometerStatus: 'Flat Waveform (No Edge)',
    successProbability: 14,
    recommendation: 'BURNING A REVIEW (< 20%)',
    badgeColor: 'border-rose-500/40 bg-rose-500/20 text-rose-300',
  },
];

export const DrsConfidenceMatrix: React.FC = () => {
  const [selectedScenario, setSelectedScenario] = useState<DrsScenario>(DEFAULT_SCENARIOS[0]);
  const [customPitching, setCustomPitching] = useState<'In Line' | 'Outside Off' | 'Outside Leg'>('In Line');
  const [customImpact, setCustomImpact] = useState<'In Line' | "Umpire's Call (< 2.5cm)" | 'Outside Off'>('In Line');
  const [customWickets, setCustomWickets] = useState<'Hitting Middle' | 'Hitting Off Stump' | 'Clipping Bails' | 'Missing Stumps'>('Hitting Middle');
  const [customEdge, setCustomEdge] = useState<boolean>(false);

  // Microphone Voice Command State
  const [isListening, setIsListening] = useState<boolean>(false);
  const [lastTranscript, setLastTranscript] = useState<string>('');
  const [voiceFeedback, setVoiceFeedback] = useState<string | null>(null);
  const recognitionRef = useRef<any>(null);

  // Dynamic calculation for custom simulator
  const calculatedConfidence = (() => {
    if (customEdge) return 94;
    if (customPitching === 'Outside Leg') return 0; // Absolute rule 36.1.1: pitching outside leg = Not Out
    let score = 0;
    if (customPitching === 'In Line') score += 35;
    else if (customPitching === 'Outside Off') score += 20;

    if (customImpact === 'In Line') score += 35;
    else if (customImpact === "Umpire's Call (< 2.5cm)") score += 18;
    else score += 5;

    if (customWickets === 'Hitting Middle') score += 30;
    else if (customWickets === 'Hitting Off Stump') score += 25;
    else if (customWickets === 'Clipping Bails') score += 12;
    else score = 0;

    return Math.min(99, Math.max(0, score));
  })();

  // Speak announcement using Web Speech Synthesis
  const speakVoice = (text: string) => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.05;
      utterance.pitch = 1.0;
      window.speechSynthesis.speak(utterance);
    }
  };

  // Process voice command strings
  const executeVoiceCommand = (command: string) => {
    const lower = command.toLowerCase().trim();
    setLastTranscript(command);

    if (lower.includes('edge') || lower.includes('snicko') || lower.includes('snickometer') || lower.includes('ultra edge')) {
      setCustomEdge(true);
      setSelectedScenario(DEFAULT_SCENARIOS[1]);
      setVoiceFeedback('Voice Command: "Show me the edge" activated. Snickometer acoustic spike confirmed.');
      cricketAudio.playBatHit();
      speakVoice('Ultra Edge confirmed. Clear spike detected on acoustic microphone.');
    } else if (lower.includes('spin') || lower.includes('deviation') || lower.includes('turn')) {
      setSelectedScenario(DEFAULT_SCENARIOS[1]);
      setCustomPitching('In Line');
      setCustomImpact('Outside Off');
      setCustomWickets('Missing Stumps');
      setCustomEdge(true);
      setVoiceFeedback('Voice Command: "Analyze spin deviation" activated. Off-break spin drift calculated at 3.8 degrees.');
      cricketAudio.playDrsBallTrackingRadar();
      speakVoice('Analyzing spin deviation. Trajectory drifts 3.8 degrees past the outside edge.');
    } else if (lower.includes('review') || lower.includes('challenge') || lower.includes('lbw')) {
      setSelectedScenario(DEFAULT_SCENARIOS[0]);
      setCustomPitching('In Line');
      setCustomImpact('In Line');
      setCustomWickets('Hitting Middle');
      setCustomEdge(false);
      setVoiceFeedback('Voice Command: "Review" simulation initialized. Hawk-Eye ball tracking confirms 3 reds.');
      cricketAudio.playWicket();
      speakVoice('DRS Challenge engaged. Ball tracking shows pitching in line, impact in line, hitting middle stump.');
    } else if (lower.includes('outside leg')) {
      setSelectedScenario(DEFAULT_SCENARIOS[3]);
      setCustomPitching('Outside Leg');
      setVoiceFeedback('Voice Command: Pitching Outside Leg registered. Automatic Not Out under MCC Law 36.');
      cricketAudio.playDrsScan();
      speakVoice('Pitching outside leg stump. Decision stands as Not Out.');
    } else if (lower.includes('reset') || lower.includes('clear')) {
      setSelectedScenario(DEFAULT_SCENARIOS[0]);
      setCustomPitching('In Line');
      setCustomImpact('In Line');
      setCustomWickets('Hitting Middle');
      setCustomEdge(false);
      setVoiceFeedback('DRS Matrix reset to baseline default parameters.');
      cricketAudio.playBoundary();
    } else {
      setVoiceFeedback(`Heard: "${command}" · Supported commands: "Show me the edge", "Analyze spin deviation", "Review", "Outside leg"`);
    }
  };

  // Toggle Microphone Listener
  const toggleListening = () => {
    if (typeof window === 'undefined') return;

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setVoiceFeedback('Speech Recognition is not natively supported in this browser. Use the quick voice simulation buttons below.');
      return;
    }

    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'en-US';

      recognition.onstart = () => {
        setIsListening(true);
        cricketAudio.playBatHit();
        setVoiceFeedback('Listening... Say: "Show me the edge" or "Analyze spin deviation"');
      };

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        executeVoiceCommand(transcript);
        setIsListening(false);
      };

      recognition.onerror = (event: any) => {
        console.warn('Speech recognition error:', event.error);
        setIsListening(false);
        setVoiceFeedback(`Mic error (${event.error}). Try clicking the quick command buttons below.`);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (e) {
      console.error(e);
      setIsListening(false);
      setVoiceFeedback('Could not access microphone. Use the instant simulation buttons below.');
    }
  };

  return (
    <div className="rounded-2xl border border-cyan-500/30 bg-gradient-to-b from-[#03091c]/95 to-[#020510]/95 p-5 backdrop-blur-xl shadow-2xl space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-cyan-500/20 pb-3">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono font-bold text-cyan-400 uppercase tracking-wider">
            <Eye className="h-4 w-4 animate-pulse" />
            <span>DRS CONFIDENCE MATRIX & VOICE-ACTIVATED HAWK-EYE REVIEW</span>
          </div>
          <h3 className="text-base font-black text-white mt-0.5">
            Hawk-Eye Ball-Tracking Deviation Margins & Voice Trigger Telemetry
          </h3>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Microphone Voice Command Trigger Button */}
          <button
            onClick={toggleListening}
            className={`flex items-center gap-2 rounded-xl px-3.5 py-1.5 text-xs font-mono font-bold transition-all cursor-pointer ${
              isListening
                ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/30 animate-pulse'
                : 'bg-slate-900 border border-cyan-500/40 text-cyan-300 hover:bg-cyan-500/20 hover:text-white'
            }`}
            title="Click to speak DRS voice commands like 'Show me the edge' or 'Analyze spin deviation'"
          >
            {isListening ? (
              <>
                <Mic className="h-4 w-4 text-white animate-bounce" />
                <span>Listening for Command...</span>
              </>
            ) : (
              <>
                <Mic className="h-4 w-4 text-cyan-400" />
                <span>🎙️ Voice Review Command</span>
              </>
            )}
          </button>

          <div className="flex items-center gap-2 text-xs font-mono text-cyan-300 bg-cyan-950/40 border border-cyan-500/30 px-3 py-1.5 rounded-xl">
            <Activity className="h-3.5 w-3.5 text-cyan-400" />
            <span>ICC Protocol 3.2</span>
          </div>
        </div>
      </div>

      {/* Voice Recognition Command Bar & Quick Simulators */}
      <div className="rounded-xl border border-cyan-500/30 bg-slate-900/80 p-3.5 space-y-2 text-xs font-mono">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-slate-300">
            <Radio className="h-4 w-4 text-cyan-400 animate-pulse" />
            <span className="font-bold text-white uppercase text-[11px]">
              Microphone Voice Control for DRS:
            </span>
          </div>
          <span className="text-[10px] text-slate-400">
            Speak into your mic or click any quick command below:
          </span>
        </div>

        {/* Quick Voice Command Triggers */}
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <button
            onClick={() => executeVoiceCommand('Show me the edge')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-emerald-500/40 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20 font-bold cursor-pointer transition-all text-xs"
          >
            <Sparkles className="h-3.5 w-3.5 text-emerald-400" />
            <span>"Show me the edge"</span>
          </button>

          <button
            onClick={() => executeVoiceCommand('Analyze spin deviation')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-cyan-500/40 bg-cyan-500/10 text-cyan-300 hover:bg-cyan-500/20 font-bold cursor-pointer transition-all text-xs"
          >
            <Zap className="h-3.5 w-3.5 text-cyan-400" />
            <span>"Analyze spin deviation"</span>
          </button>

          <button
            onClick={() => executeVoiceCommand('Review lbw')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-amber-500/40 bg-amber-500/10 text-amber-300 hover:bg-amber-500/20 font-bold cursor-pointer transition-all text-xs"
          >
            <ShieldCheck className="h-3.5 w-3.5 text-amber-400" />
            <span>"Review LBW"</span>
          </button>

          <button
            onClick={() => executeVoiceCommand('Outside leg')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-rose-500/40 bg-rose-500/10 text-rose-300 hover:bg-rose-500/20 font-bold cursor-pointer transition-all text-xs"
          >
            <XCircle className="h-3.5 w-3.5 text-rose-400" />
            <span>"Outside leg"</span>
          </button>
        </div>

        {/* Live Voice Status Feedback */}
        {voiceFeedback && (
          <div className="rounded-lg bg-slate-950 p-2 border border-slate-800 text-[11px] text-cyan-300 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Volume2 className="h-3.5 w-3.5 text-cyan-400 shrink-0" />
              <span>{voiceFeedback}</span>
            </span>
            {lastTranscript && (
              <span className="text-slate-500 text-[10px]">Heard: "{lastTranscript}"</span>
            )}
          </div>
        )}
      </div>

      {/* Confidence Matrix Table */}
      <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950/80">
        <table className="w-full text-left text-xs font-mono">
          <thead className="bg-slate-900/90 text-slate-400 border-b border-slate-800 uppercase text-[10px]">
            <tr>
              <th className="p-3">Scenario / Condition</th>
              <th className="p-3">Pitching</th>
              <th className="p-3">Impact</th>
              <th className="p-3">Wickets Path</th>
              <th className="p-3">Deviation Margin</th>
              <th className="p-3">Challenge Prob</th>
              <th className="p-3">Call Recommendation</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/80 text-slate-200">
            {DEFAULT_SCENARIOS.map((sc) => {
              const isSelected = selectedScenario.id === sc.id;
              return (
                <tr
                  key={sc.id}
                  onClick={() => {
                    setSelectedScenario(sc);
                    cricketAudio.playBatHit();
                  }}
                  className={`transition-colors cursor-pointer hover:bg-slate-900/70 ${
                    isSelected ? 'bg-cyan-500/10 border-l-4 border-cyan-400' : ''
                  }`}
                >
                  <td className="p-3 font-bold text-white max-w-[200px]">
                    {sc.condition}
                  </td>
                  <td className="p-3">
                    <span
                      className={`px-2 py-0.5 rounded ${
                        sc.pitching === 'In Line'
                          ? 'bg-emerald-500/20 text-emerald-300'
                          : sc.pitching === 'Outside Leg'
                          ? 'bg-rose-500/20 text-rose-300 font-bold'
                          : 'bg-amber-500/20 text-amber-300'
                      }`}
                    >
                      {sc.pitching}
                    </span>
                  </td>
                  <td className="p-3">
                    <span
                      className={`px-2 py-0.5 rounded ${
                        sc.impact === 'In Line'
                          ? 'bg-emerald-500/20 text-emerald-300'
                          : 'bg-amber-500/20 text-amber-300'
                      }`}
                    >
                      {sc.impact}
                    </span>
                  </td>
                  <td className="p-3">
                    <span
                      className={`px-2 py-0.5 rounded ${
                        sc.wickets.includes('Hitting')
                          ? 'bg-emerald-500/20 text-emerald-300 font-bold'
                          : sc.wickets.includes('Clipping')
                          ? 'bg-amber-500/20 text-amber-300'
                          : 'bg-rose-500/20 text-rose-300'
                      }`}
                    >
                      {sc.wickets}
                    </span>
                  </td>
                  <td className="p-3 text-slate-400 text-[11px]">{sc.deviationMargin}</td>
                  <td className="p-3 font-black text-sm">
                    <span
                      className={
                        sc.successProbability >= 80
                          ? 'text-emerald-400'
                          : sc.successProbability >= 50
                          ? 'text-amber-400'
                          : 'text-rose-400'
                      }
                    >
                      {sc.successProbability}%
                    </span>
                  </td>
                  <td className="p-3">
                    <span className={`px-2.5 py-1 rounded-lg border text-[10px] font-bold ${sc.badgeColor}`}>
                      {sc.recommendation}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Dynamic DRS Interactive Calibration Sandbox */}
      <div className="rounded-xl border border-cyan-500/20 bg-slate-900/60 p-4 space-y-3">
        <div className="flex items-center justify-between border-b border-slate-800 pb-2">
          <span className="text-xs font-mono font-bold text-cyan-400 uppercase">
            CALCULATE CUSTOM DRS CHALLENGE PROBABILITY
          </span>
          <span className="text-xs font-mono text-slate-400">Interactive Simulator</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs font-mono">
          <div>
            <label className="text-slate-400 block mb-1">1. PITCHING</label>
            <select
              value={customPitching}
              onChange={(e) => setCustomPitching(e.target.value as any)}
              className="w-full rounded-lg border border-slate-800 bg-slate-950 p-2 text-white focus:border-cyan-400 cursor-pointer"
            >
              <option value="In Line">In Line (Leg to Off)</option>
              <option value="Outside Off">Outside Off Stump</option>
              <option value="Outside Leg">Outside Leg Stump (Not Out)</option>
            </select>
          </div>

          <div>
            <label className="text-slate-400 block mb-1">2. PAD IMPACT</label>
            <select
              value={customImpact}
              onChange={(e) => setCustomImpact(e.target.value as any)}
              className="w-full rounded-lg border border-slate-800 bg-slate-950 p-2 text-white focus:border-cyan-400 cursor-pointer"
            >
              <option value="In Line">In Line with Stumps</option>
              <option value="Umpire's Call (< 2.5cm)">Umpire's Call (&lt; 2.5cm margin)</option>
              <option value="Outside Off">Outside Off (Shot Offered?)</option>
            </select>
          </div>

          <div>
            <label className="text-slate-400 block mb-1">3. WICKETS PATH</label>
            <select
              value={customWickets}
              onChange={(e) => setCustomWickets(e.target.value as any)}
              className="w-full rounded-lg border border-slate-800 bg-slate-950 p-2 text-white focus:border-cyan-400 cursor-pointer"
            >
              <option value="Hitting Middle">Hitting Middle Stump (Full)</option>
              <option value="Hitting Off Stump">Hitting Off Stump</option>
              <option value="Clipping Bails">Clipping Bails (Umpire's Call)</option>
              <option value="Missing Stumps">Missing Stumps (Over/Wide)</option>
            </select>
          </div>

          <div>
            <label className="text-slate-400 block mb-1">4. ULTRAEDGE / SNICKO</label>
            <button
              onClick={() => {
                setCustomEdge((prev) => !prev);
                cricketAudio.playBatHit();
              }}
              className={`w-full rounded-lg border p-2 text-left font-bold transition-colors cursor-pointer ${
                customEdge
                  ? 'border-emerald-500 bg-emerald-500/20 text-emerald-300'
                  : 'border-slate-800 bg-slate-950 text-slate-400'
              }`}
            >
              {customEdge ? '⚡ Spike Detected (Caught Behind)' : 'Flat Wave (Pad First)'}
            </button>
          </div>
        </div>

        {/* Real-time Calculated Outcome */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-2 border-t border-slate-800 text-xs font-mono">
          <div className="flex items-center gap-3">
            <span className="text-slate-400">CALCULATED OVERTURN PROBABILITY:</span>
            <strong
              className={`text-xl font-black ${
                calculatedConfidence >= 80
                  ? 'text-emerald-400'
                  : calculatedConfidence >= 50
                  ? 'text-amber-400'
                  : 'text-rose-400'
              }`}
            >
              {calculatedConfidence}%
            </strong>
          </div>

          <div className="text-[11px] text-slate-300">
            {calculatedConfidence >= 80 ? (
              <span className="text-emerald-300 font-bold flex items-center gap-1">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                <span>SAFE TO CHALLENGE · High likelihood of 3 reds</span>
              </span>
            ) : calculatedConfidence >= 50 ? (
              <span className="text-amber-300 font-bold flex items-center gap-1">
                <AlertCircle className="h-3.5 w-3.5 text-amber-400" />
                <span>UMPIRE'S CALL RISK · Review retained but decision stands</span>
              </span>
            ) : (
              <span className="text-rose-400 font-bold flex items-center gap-1">
                <XCircle className="h-3.5 w-3.5 text-rose-400" />
                <span>BURNING A REVIEW · Missing conditions or pitching outside leg</span>
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
