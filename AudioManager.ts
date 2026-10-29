/**
 * AudioManager Service
 * 
 * Provides an intelligent, high-fidelity ambient stadium sound engine for Cricket AI:
 * - Roar for a Six (stadium-wide sub-bass rumble, multi-formant cheering crowd swell, air horns)
 * - Collective Gasp for a Close Call (sharp intake of breath, volume drop, nervous murmurs)
 * - Intense Music during Death Overs (procedural 130 BPM heartbeat synth tension score)
 * - AI Broadcast Commentary (television mic chimes, realistic Web Speech delivery & audio filtering)
 * - DRS Sound Suite (UltraEdge spikes, Hawkeye tracking radar pings, tension heartbeats, 3rd Umpire radio comms)
 */

export type MatchEventType = 
  | 'SIX_ROAR' 
  | 'CLOSE_CALL_GASP' 
  | 'FOUR_APPLAUSE' 
  | 'WICKET_FALL' 
  | 'DEATH_OVERS_TENSION' 
  | 'DRS_HEARTBEAT' 
  | 'DRS_ULTRAEDGE' 
  | 'DRS_BALL_TRACKING' 
  | 'DRS_RADIO_COMMS' 
  | 'DRS_DECISION' 
  | 'AI_COMMENTARY' 
  | 'BAT_HIT' 
  | 'BALL_BOWLED';

export interface AudioSettings {
  masterMuted: boolean;
  masterVolume: number; // 0 - 1
  crowdVolume: number;  // 0 - 1 (Roar, gasps, applause)
  musicVolume: number;  // 0 - 1 (Death overs synth soundtrack)
  commentaryVolume: number; // 0 - 1 (AI commentary voice)
  sfxVolume: number;    // 0 - 1 (Bat hits, DRS telemetry, UI)
  commentaryVoiceEnabled: boolean;
}

export interface AcousticEventPayload {
  type: MatchEventType;
  intensity: number; // 0 - 1
  label: string;
  dbEstimate: number; // e.g. 70 to 118 dB
  metadata?: Record<string, unknown>;
}

type AcousticListener = (payload: AcousticEventPayload) => void;

export class AudioManagerService {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private crowdGain: GainNode | null = null;
  private musicGain: GainNode | null = null;
  private commentaryGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private analyser: AnalyserNode | null = null;

  // Death overs music procedural synth engine state
  private deathOversTimer: NodeJS.Timeout | null = null;
  private deathOversStep = 0;
  private deathOversDroneOsc: OscillatorNode | null = null;
  private deathOversDroneGain: GainNode | null = null;
  private isDeathOversActive = false;

  // DRS audio state
  private drsHeartbeatInterval: NodeJS.Timeout | null = null;
  private isDrsReviewInProgress = false;

  public setDrsReviewActive(active: boolean) {
    this.isDrsReviewInProgress = active;
    if (active && this.speechSynth && this.speechSynth.speaking) {
      this.speechSynth.cancel();
    }
  }

  public isDrsReviewActive(): boolean {
    return this.isDrsReviewInProgress;
  }

  // Speech & Commentary state
  private speechSynth: SpeechSynthesis | null = null;
  private activeUtterance: SpeechSynthesisUtterance | null = null;
  private preferredVoice: SpeechSynthesisVoice | null = null;

  // Event subscribers
  private listeners: Set<AcousticListener> = new Set();

  private settings: AudioSettings = {
    masterMuted: false,
    masterVolume: 0.85,
    crowdVolume: 0.9,
    musicVolume: 0.75,
    commentaryVolume: 0.85,
    sfxVolume: 0.8,
    commentaryVoiceEnabled: true,
  };

  constructor() {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('cricket_ai_audio_manager_settings');
      if (saved) {
        try {
          this.settings = { ...this.settings, ...JSON.parse(saved) };
        } catch {
          // ignore
        }
      }

      if ('speechSynthesis' in window) {
        this.speechSynth = window.speechSynthesis;
        this.initVoice();
        if (window.speechSynthesis.onvoiceschanged !== undefined) {
          window.speechSynthesis.onvoiceschanged = () => this.initVoice();
        }
      }
    }
  }

  private initVoice() {
    if (!this.speechSynth) return;
    try {
      const voices = this.speechSynth.getVoices();
      // Look for natural sounding sports broadcast English voices
      const commentaryVoice = voices.find(v => 
        (v.lang.startsWith('en') && (v.name.includes('Natural') || v.name.includes('Daniel') || v.name.includes('George') || v.name.includes('Google') || v.name.includes('Arthur') || v.name.includes('Rishi')))
      ) || voices.find(v => v.lang.startsWith('en')) || voices[0] || null;

      this.preferredVoice = commentaryVoice;
    } catch {
      // safe fallback
    }
  }

  // --- AUDIO CONTEXT INITIALIZATION & ROUTING ---

  public initContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;

    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return null;

      this.ctx = new AudioCtx();

      // Master Analyser
      this.analyser = this.ctx.createAnalyser();
      this.analyser.fftSize = 64;
      this.analyser.smoothingTimeConstant = 0.8;

      // Master Gain
      this.masterGain = this.ctx.createGain();
      this.masterGain.connect(this.analyser);
      this.analyser.connect(this.ctx.destination);

      // Submix Busses
      this.crowdGain = this.ctx.createGain();
      this.crowdGain.connect(this.masterGain);

      this.musicGain = this.ctx.createGain();
      this.musicGain.connect(this.masterGain);

      this.commentaryGain = this.ctx.createGain();
      this.commentaryGain.connect(this.masterGain);

      this.sfxGain = this.ctx.createGain();
      this.sfxGain.connect(this.masterGain);

      this.updateBusGains();
    }

    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }

    return this.ctx;
  }

  private updateBusGains() {
    if (!this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;
    const mVol = this.settings.masterMuted ? 0 : this.settings.masterVolume;

    this.masterGain.gain.setValueAtTime(mVol, now);
    if (this.crowdGain) this.crowdGain.gain.setValueAtTime(this.settings.crowdVolume, now);
    if (this.musicGain) this.musicGain.gain.setValueAtTime(this.settings.musicVolume, now);
    if (this.commentaryGain) this.commentaryGain.gain.setValueAtTime(this.settings.commentaryVolume, now);
    if (this.sfxGain) this.sfxGain.gain.setValueAtTime(this.settings.sfxVolume, now);
  }

  // --- PUBLIC CONTROLS & GETTERS ---

  public getSettings(): AudioSettings {
    return { ...this.settings };
  }

  public updateSettings(partial: Partial<AudioSettings>) {
    this.settings = { ...this.settings, ...partial };
    this.updateBusGains();
    if (typeof window !== 'undefined') {
      localStorage.setItem('cricket_ai_audio_manager_settings', JSON.stringify(this.settings));
    }
  }

  public toggleMute(): boolean {
    const next = !this.settings.masterMuted;
    this.updateSettings({ masterMuted: next });
    if (!next) {
      this.playUiClick();
    }
    return next;
  }

  public isMuted(): boolean {
    return this.settings.masterMuted;
  }

  public getAnalyser(): AnalyserNode | null {
    this.initContext();
    return this.analyser;
  }

  public getFrequencyData(array?: Uint8Array): Uint8Array {
    if (!this.analyser) return new Uint8Array(32);
    const data = array || new Uint8Array(this.analyser.frequencyBinCount);
    try {
      (this.analyser as unknown as { getByteFrequencyData: (arr: Uint8Array) => void }).getByteFrequencyData(data);
    } catch {
      // fallback
    }
    return data;
  }

  public subscribe(listener: AcousticListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private emitEvent(type: MatchEventType, intensity: number, label: string, dbEstimate: number, metadata?: Record<string, unknown>) {
    const payload: AcousticEventPayload = { type, intensity, label, dbEstimate, metadata };
    this.listeners.forEach(fn => {
      try {
        fn(payload);
      } catch {
        // safe listener execution
      }
    });
  }

  // --- AMBIENT STADIUM SOUNDS ---

  /**
   * 1. ROAR FOR A SIX
   * Thunderous 80,000 capacity stadium eruption:
   * - Deep sub-bass stadium floor rumble (50Hz - 80Hz)
   * - Human vocal formant-filtered crowd cheer swell ("YEAAAHHH!!")
   * - Dual stadium air horn fanfare stabs
   * - Reverb reflection decay
   */
  public playSixRoar(crowdSize = 80000) {
    if (this.settings.masterMuted) return;
    const ctx = this.initContext();
    if (!ctx || !this.crowdGain) return;

    try {
      const now = ctx.currentTime;
      this.emitEvent('SIX_ROAR', 1.0, 'STADIUM ROAR: 116 dB', 116, { crowdSize });

      // Layer A: Stadium Sub-Bass Impact Rumble (45Hz -> 75Hz)
      const subOsc = ctx.createOscillator();
      const subGain = ctx.createGain();
      subOsc.type = 'sine';
      subOsc.frequency.setValueAtTime(45, now);
      subOsc.frequency.exponentialRampToValueAtTime(70, now + 0.3);
      subOsc.frequency.exponentialRampToValueAtTime(35, now + 1.8);

      subGain.gain.setValueAtTime(0.01, now);
      subGain.gain.linearRampToValueAtTime(0.35, now + 0.15);
      subGain.gain.exponentialRampToValueAtTime(0.001, now + 2.2);

      subOsc.connect(subGain);
      subGain.connect(this.crowdGain);
      subOsc.start(now);
      subOsc.stop(now + 2.25);

      // Layer B: Formant-Filtered Crowd Cheering (Simulating thousands cheering "WOOO-YEAAAH")
      const bufferSize = ctx.sampleRate * 2.8;
      const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const output = noiseBuffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        output[i] = Math.random() * 2 - 1; // white/pink noise base
      }

      const noiseSource = ctx.createBufferSource();
      noiseSource.buffer = noiseBuffer;

      // Bandpass formant filter 1 (750Hz chest resonance)
      const bandpass1 = ctx.createBiquadFilter();
      bandpass1.type = 'bandpass';
      bandpass1.frequency.setValueAtTime(650, now);
      bandpass1.frequency.exponentialRampToValueAtTime(1200, now + 0.6);
      bandpass1.Q.setValueAtTime(2.2, now);

      // Bandpass formant filter 2 (2400Hz vocal presence)
      const bandpass2 = ctx.createBiquadFilter();
      bandpass2.type = 'bandpass';
      bandpass2.frequency.setValueAtTime(1800, now);
      bandpass2.frequency.exponentialRampToValueAtTime(2800, now + 0.7);
      bandpass2.Q.setValueAtTime(1.8, now);

      const cheerGain = ctx.createGain();
      cheerGain.gain.setValueAtTime(0.01, now);
      cheerGain.gain.linearRampToValueAtTime(0.48, now + 0.25); // fast swell
      cheerGain.gain.setValueAtTime(0.42, now + 1.2);
      cheerGain.gain.exponentialRampToValueAtTime(0.001, now + 2.8);

      noiseSource.connect(bandpass1);
      noiseSource.connect(bandpass2);
      bandpass1.connect(cheerGain);
      bandpass2.connect(cheerGain);
      cheerGain.connect(this.crowdGain);

      noiseSource.start(now);
      noiseSource.stop(now + 2.85);

      // Layer C: Stadium Air Horn Stabs (Iconic T20 trumpet blast)
      const hornNotes = [587.33, 587.33, 880.0]; // D5, D5, A5
      hornNotes.forEach((freq, idx) => {
        const hornStart = now + 0.35 + idx * 0.16;
        const hornOsc = ctx.createOscillator();
        const hornFilter = ctx.createBiquadFilter();
        const hornG = ctx.createGain();

        hornOsc.type = 'sawtooth';
        hornOsc.frequency.setValueAtTime(freq, hornStart);

        hornFilter.type = 'lowpass';
        hornFilter.frequency.setValueAtTime(1800, hornStart);

        hornG.gain.setValueAtTime(0.001, hornStart);
        hornG.gain.linearRampToValueAtTime(0.09, hornStart + 0.02);
        hornG.gain.exponentialRampToValueAtTime(0.001, hornStart + 0.18);

        hornOsc.connect(hornFilter);
        hornFilter.connect(hornG);
        hornG.connect(this.crowdGain!);

        hornOsc.start(hornStart);
        hornOsc.stop(hornStart + 0.2);
      });

    } catch (e) {
      console.warn('Six roar audio fallback', e);
    }
  }

  /**
   * 2. COLLECTIVE GASP FOR A CLOSE CALL
   * Authentic crowd intake of breath when a ball whiskers past the outside edge:
   * - Downward swept breathy formant filter (1800Hz -> 320Hz)
   * - Sudden drop in ambient stadium noise
   * - Tense stunned murmur follow-up ("OOOOHHH!")
   */
  public playCloseCallGasp(eventContext = 'Play & Miss') {
    if (this.settings.masterMuted) return;
    const ctx = this.initContext();
    if (!ctx || !this.crowdGain) return;

    try {
      const now = ctx.currentTime;
      this.emitEvent('CLOSE_CALL_GASP', 0.85, 'COLLECTIVE GASP: 88 dB', 88, { context: eventContext });

      // Noise source for breath intake
      const bufferSize = Math.floor(ctx.sampleRate * 1.5);
      const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const output = noiseBuffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        output[i] = Math.random() * 2 - 1;
      }

      const noiseSource = ctx.createBufferSource();
      noiseSource.buffer = noiseBuffer;

      // Filter sweeps downward sharply: "SHH-OOOOH!"
      const gaspFilter = ctx.createBiquadFilter();
      gaspFilter.type = 'bandpass';
      gaspFilter.frequency.setValueAtTime(1600, now);
      gaspFilter.frequency.exponentialRampToValueAtTime(320, now + 0.45);
      gaspFilter.Q.setValueAtTime(3.5, now);

      const gaspGain = ctx.createGain();
      gaspGain.gain.setValueAtTime(0.001, now);
      gaspGain.gain.linearRampToValueAtTime(0.38, now + 0.12); // sharp intake
      gaspGain.gain.exponentialRampToValueAtTime(0.03, now + 0.55);
      gaspGain.gain.exponentialRampToValueAtTime(0.001, now + 1.4); // lingering murmur

      noiseSource.connect(gaspFilter);
      gaspFilter.connect(gaspGain);
      gaspGain.connect(this.crowdGain);

      noiseSource.start(now);
      noiseSource.stop(now + 1.45);

      // Low pitch acoustic sub-groan (130Hz)
      const murmurOsc = ctx.createOscillator();
      const murmurGain = ctx.createGain();
      murmurOsc.type = 'triangle';
      murmurOsc.frequency.setValueAtTime(140, now + 0.15);
      murmurOsc.frequency.exponentialRampToValueAtTime(95, now + 0.7);

      murmurGain.gain.setValueAtTime(0.001, now + 0.15);
      murmurGain.gain.linearRampToValueAtTime(0.12, now + 0.35);
      murmurGain.gain.exponentialRampToValueAtTime(0.001, now + 0.9);

      murmurOsc.connect(murmurGain);
      murmurGain.connect(this.crowdGain);
      murmurOsc.start(now + 0.15);
      murmurOsc.stop(now + 0.95);

    } catch (e) {
      console.warn('Gasp sound fallback', e);
    }
  }

  /**
   * 3. INTENSE MUSIC DURING DEATH OVERS
   * Procedural dynamic synth tension score:
   * - 130 BPM syncopated heartbeat sub-kick
   * - Tension minor drone (D-minor / C-minor) with resonant LFO filter
   * - Fast 16th ticking urgency shaker
   * - Rising arpeggio tension notes
   */
  public startDeathOversMusic(options: { tempoBpm?: number; intensity?: number } = {}) {
    if (this.isDeathOversActive) return;
    const ctx = this.initContext();
    if (!ctx || !this.musicGain) return;

    this.isDeathOversActive = true;
    const bpm = options.tempoBpm || 128;
    const stepDuration = 60 / bpm / 2; // 8th note steps (~234ms)
    this.deathOversStep = 0;

    this.emitEvent('DEATH_OVERS_TENSION', 0.9, 'DEATH OVERS TENSION SCORE', 82);

    try {
      const now = ctx.currentTime;

      // Background Tension Drone
      this.deathOversDroneOsc = ctx.createOscillator();
      this.deathOversDroneGain = ctx.createGain();
      const droneFilter = ctx.createBiquadFilter();

      this.deathOversDroneOsc.type = 'sawtooth';
      this.deathOversDroneOsc.frequency.setValueAtTime(73.42, now); // D2

      droneFilter.type = 'lowpass';
      droneFilter.frequency.setValueAtTime(180, now);

      this.deathOversDroneGain.gain.setValueAtTime(0.001, now);
      this.deathOversDroneGain.gain.linearRampToValueAtTime(0.12, now + 1.5);

      this.deathOversDroneOsc.connect(droneFilter);
      droneFilter.connect(this.deathOversDroneGain);
      this.deathOversDroneGain.connect(this.musicGain);

      this.deathOversDroneOsc.start(now);

      // Loop rhythm generator
      const playRhythmBeat = () => {
        if (!this.isDeathOversActive || !this.ctx || !this.musicGain) return;
        const curTime = this.ctx.currentTime;
        const step = this.deathOversStep % 16;

        // Heartbeat Kick on steps 0, 3, 8, 10
        if (step === 0 || step === 3 || step === 8 || step === 10) {
          const kickOsc = this.ctx.createOscillator();
          const kickG = this.ctx.createGain();
          kickOsc.type = 'sine';
          kickOsc.frequency.setValueAtTime(110, curTime);
          kickOsc.frequency.exponentialRampToValueAtTime(45, curTime + 0.12);

          kickG.gain.setValueAtTime(step === 0 || step === 8 ? 0.35 : 0.22, curTime);
          kickG.gain.exponentialRampToValueAtTime(0.001, curTime + 0.2);

          kickOsc.connect(kickG);
          kickG.connect(this.musicGain);
          kickOsc.start(curTime);
          kickOsc.stop(curTime + 0.22);
        }

        // Ticking tension hi-hat on every step
        const hatBuffer = this.ctx.createBuffer(1, Math.floor(this.ctx.sampleRate * 0.04), this.ctx.sampleRate);
        const hatData = hatBuffer.getChannelData(0);
        for (let i = 0; i < hatData.length; i++) hatData[i] = (Math.random() * 2 - 1) * 0.08;

        const hatSource = this.ctx.createBufferSource();
        hatSource.buffer = hatBuffer;
        const hatFilter = this.ctx.createBiquadFilter();
        hatFilter.type = 'highpass';
        hatFilter.frequency.setValueAtTime(6500, curTime);
        const hatG = this.ctx.createGain();
        hatG.gain.setValueAtTime(step % 2 === 0 ? 0.08 : 0.04, curTime);
        hatG.gain.exponentialRampToValueAtTime(0.001, curTime + 0.035);

        hatSource.connect(hatFilter);
        hatFilter.connect(hatG);
        hatG.connect(this.musicGain);
        hatSource.start(curTime);
        hatSource.stop(curTime + 0.04);

        // Synth arpeggiation note on specific steps (D minor scale: D3, F3, A3, C4, D4)
        const arpNotes = [146.83, 174.61, 220.0, 261.63, 293.66];
        if (step % 2 === 1) {
          const noteFreq = arpNotes[(step >> 1) % arpNotes.length];
          const arpOsc = this.ctx.createOscillator();
          const arpG = this.ctx.createGain();
          arpOsc.type = 'triangle';
          arpOsc.frequency.setValueAtTime(noteFreq, curTime);

          arpG.gain.setValueAtTime(0.07, curTime);
          arpG.gain.exponentialRampToValueAtTime(0.001, curTime + 0.16);

          arpOsc.connect(arpG);
          arpG.connect(this.musicGain);
          arpOsc.start(curTime);
          arpOsc.stop(curTime + 0.18);
        }

        this.deathOversStep++;
        this.deathOversTimer = setTimeout(playRhythmBeat, stepDuration * 1000);
      };

      playRhythmBeat();
    } catch (e) {
      console.warn('Death overs music init failed', e);
    }
  }

  public stopDeathOversMusic(fadeMs = 800) {
    if (!this.isDeathOversActive) return;
    this.isDeathOversActive = false;

    if (this.deathOversTimer) {
      clearTimeout(this.deathOversTimer);
      this.deathOversTimer = null;
    }

    if (this.deathOversDroneGain && this.ctx) {
      try {
        const now = this.ctx.currentTime;
        this.deathOversDroneGain.gain.linearRampToValueAtTime(0.001, now + fadeMs / 1000);
        setTimeout(() => {
          if (this.deathOversDroneOsc) {
            try { this.deathOversDroneOsc.stop(); } catch {}
            this.deathOversDroneOsc = null;
          }
          this.deathOversDroneGain = null;
        }, fadeMs);
      } catch {
        this.deathOversDroneOsc = null;
        this.deathOversDroneGain = null;
      }
    }
  }

  public isDeathOversMusicPlaying(): boolean {
    return this.isDeathOversActive;
  }

  // --- 4. AI COMMENTARY & BROADCAST AUDIO ---

  /**
   * Broadcast mic open television double-chime (880Hz -> 1320Hz)
   */
  public playBroadcastChime() {
    if (this.settings.masterMuted) return;
    const ctx = this.initContext();
    if (!ctx || !this.commentaryGain) return;

    try {
      const now = ctx.currentTime;
      [880, 1318.5].forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        const start = now + idx * 0.08;

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, start);

        g.gain.setValueAtTime(0.08, start);
        g.gain.exponentialRampToValueAtTime(0.001, start + 0.14);

        osc.connect(g);
        g.connect(this.commentaryGain!);
        osc.start(start);
        osc.stop(start + 0.16);
      });
    } catch {}
  }

  /**
   * AI Speech Commentary
   * Combines broadcast chime + speech synthesis with sports broadcaster cadence
   */
  public speakAiCommentary(phrase: string, options: { rate?: number; pitch?: number; mood?: 'excited' | 'intense' | 'technical'; onEnd?: () => void } = {}) {
    if (this.settings.masterMuted || !this.settings.commentaryVoiceEnabled) {
      if (options.onEnd) options.onEnd();
      return;
    }

    // If DRS review is active and this is not a technical DRS speech, suppress normal commentary
    if (this.isDrsReviewInProgress && options.mood !== 'technical') {
      if (options.onEnd) options.onEnd();
      return;
    }

    this.playBroadcastChime();
    this.emitEvent('AI_COMMENTARY', 0.85, `AI COMMENTARY: "${phrase.slice(0, 32)}..."`, 84, { phrase });

    if (typeof window === 'undefined' || !this.speechSynth) {
      if (options.onEnd) options.onEnd();
      return;
    }

    try {
      if (this.speechSynth.speaking) {
        this.speechSynth.cancel();
      }

      const utterance = new SpeechSynthesisUtterance(phrase);
      if (this.preferredVoice) {
        utterance.voice = this.preferredVoice;
      }

      // Broadcaster cadence: technical is measured and crisp (1.02), excited is faster (1.15)
      utterance.rate = options.rate || (options.mood === 'excited' ? 1.15 : options.mood === 'technical' ? 1.02 : 1.05);
      utterance.pitch = options.pitch || (options.mood === 'excited' ? 1.15 : options.mood === 'technical' ? 0.98 : 1.0);
      utterance.volume = this.settings.commentaryVolume * this.settings.masterVolume;

      let called = false;
      const wordsCount = phrase.split(/\s+/).filter(Boolean).length;
      // Speech estimation: average ~400ms per word + 900ms buffer
      const expectedDurationMs = Math.min(12000, Math.max(3200, wordsCount * 420 + 900));

      const finishOnce = () => {
        clearTimeout(fallbackTimer);
        if (!called) {
          called = true;
          if (options.onEnd) options.onEnd();
        }
      };

      const fallbackTimer = setTimeout(() => {
        finishOnce();
      }, expectedDurationMs);

      utterance.onend = finishOnce;
      utterance.onerror = finishOnce;

      this.activeUtterance = utterance;
      // Prevent V8/Chromium garbage collection from cancelling onend
      if (typeof window !== 'undefined') {
        (window as unknown as { __cricketUtterance?: SpeechSynthesisUtterance }).__cricketUtterance = utterance;
      }

      this.speechSynth.speak(utterance);
    } catch (e) {
      console.warn('Speech synthesis fallback', e);
      if (options.onEnd) options.onEnd();
    }
  }

  /**
   * Contextual Commentary Generator for ball events
   */
  public announceBallEvent(event: { runsScored: number; isWicket: boolean; shot?: string; bowlerName?: string; strikerName?: string }) {
    if (this.isDrsReviewInProgress) return;

    if (event.runsScored === 6) {
      const phrases = [
        `Huge maximum! Right out of the middle!`,
        `Six runs! Magnificent strike from ${event.strikerName || 'the batter'}!`,
        `Launched over the ropes! Tremendous power!`,
      ];
      this.speakAiCommentary(phrases[Math.floor(Math.random() * phrases.length)], { mood: 'excited' });
    } else if (event.isWicket) {
      const phrases = [
        `He's gone! Clean out! Massive breakthrough for ${event.bowlerName || 'the bowling side'}!`,
        `Edged and taken! Finger goes up straight away!`,
        `Timber! Stumps shattered, unplayable delivery!`,
      ];
      this.speakAiCommentary(phrases[Math.floor(Math.random() * phrases.length)], { mood: 'excited' });
    } else if (event.runsScored === 4) {
      const phrases = [
        `Crisp timing through the gap, races away for four!`,
        `Four runs! Sublime boundary stroke!`,
      ];
      this.speakAiCommentary(phrases[Math.floor(Math.random() * phrases.length)], { mood: 'technical' });
    }
  }

  // --- 5. DRS SOUND SUITE ---

  /**
   * Tension-building Heartbeat ("lub-dub... lub-dub...")
   */
  public playDrsHeartbeat() {
    if (this.settings.masterMuted) return;
    const ctx = this.initContext();
    if (!ctx || !this.sfxGain) return;

    try {
      const now = ctx.currentTime;
      this.emitEvent('DRS_HEARTBEAT', 0.75, 'DRS TENSION HEARTBEAT', 78);

      // Pulse 1: "Lub"
      const osc1 = ctx.createOscillator();
      const g1 = ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(65, now);
      osc1.frequency.exponentialRampToValueAtTime(40, now + 0.12);

      g1.gain.setValueAtTime(0.28, now);
      g1.gain.exponentialRampToValueAtTime(0.001, now + 0.14);

      osc1.connect(g1);
      g1.connect(this.sfxGain);
      osc1.start(now);
      osc1.stop(now + 0.16);

      // Pulse 2: "Dub" (offset by 130ms)
      const osc2 = ctx.createOscillator();
      const g2 = ctx.createGain();
      const t2 = now + 0.13;
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(55, t2);
      osc2.frequency.exponentialRampToValueAtTime(35, t2 + 0.16);

      g2.gain.setValueAtTime(0.22, t2);
      g2.gain.exponentialRampToValueAtTime(0.001, t2 + 0.18);

      osc2.connect(g2);
      g2.connect(this.sfxGain);
      osc2.start(t2);
      osc2.stop(t2 + 0.2);
    } catch {}
  }

  public startDrsHeartbeatLoop() {
    this.stopDrsHeartbeatLoop();
    this.playDrsHeartbeat();
    this.drsHeartbeatInterval = setInterval(() => {
      this.playDrsHeartbeat();
    }, 1100);
  }

  public stopDrsHeartbeatLoop() {
    if (this.drsHeartbeatInterval) {
      clearInterval(this.drsHeartbeatInterval);
      this.drsHeartbeatInterval = null;
    }
  }

  /**
   * UltraEdge / Snickometer Audio Spike
   * Sharp acoustic transient + high-frequency spike chirp
   */
  public playDrsUltraEdgeSpike(isSpike = true) {
    if (this.settings.masterMuted) return;
    const ctx = this.initContext();
    if (!ctx || !this.sfxGain) return;

    try {
      const now = ctx.currentTime;
      this.emitEvent('DRS_ULTRAEDGE', isSpike ? 0.95 : 0.4, isSpike ? 'ULTRAEDGE SPIKE DETECTED (94 dB)' : 'ULTRAEDGE FLATLINE', isSpike ? 94 : 65);

      if (isSpike) {
        // High frequency edge spike
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(1420, now);
        osc.frequency.exponentialRampToValueAtTime(2600, now + 0.04);
        osc.frequency.exponentialRampToValueAtTime(450, now + 0.14);

        g.gain.setValueAtTime(0.25, now);
        g.gain.exponentialRampToValueAtTime(0.001, now + 0.16);

        osc.connect(g);
        g.connect(this.sfxGain);
        osc.start(now);
        osc.stop(now + 0.18);

        // Sub wood click (bat impact)
        this.playBatHit();
      } else {
        // Flatline subtle murmur
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(440, now);
        g.gain.setValueAtTime(0.04, now);
        g.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
        osc.connect(g);
        g.connect(this.sfxGain);
        osc.start(now);
        osc.stop(now + 0.09);
      }
    } catch {}
  }

  /**
   * Hawk-Eye Ball Tracking Radar Telemetry
   * 3 ascending pitch radar chirps followed by definitive impact lock
   */
  public playDrsBallTrackingRadar() {
    if (this.settings.masterMuted) return;
    const ctx = this.initContext();
    if (!ctx || !this.sfxGain) return;

    try {
      const now = ctx.currentTime;
      this.emitEvent('DRS_BALL_TRACKING', 0.8, 'HAWKEYE RADAR TELEMETRY', 82);

      const trackingPitches = [640, 880, 1174.66, 1760]; // Pitching -> Impact -> Wickets Hitting
      trackingPitches.forEach((freq, idx) => {
        const start = now + idx * 0.14;
        const osc = ctx.createOscillator();
        const g = ctx.createGain();

        osc.type = idx === 3 ? 'triangle' : 'sine';
        osc.frequency.setValueAtTime(freq, start);

        g.gain.setValueAtTime(0.12, start);
        g.gain.exponentialRampToValueAtTime(0.001, start + 0.1);

        osc.connect(g);
        g.connect(this.sfxGain!);
        osc.start(start);
        osc.stop(start + 0.12);
      });
    } catch {}
  }

  /**
   * Third Umpire Radio Communications Squelch + Voice Comms
   */
  public playDrsRadioComms(phrase = 'Third umpire to director: Roll UltraEdge through frame by frame please.', onDone?: () => void) {
    if (this.settings.masterMuted) {
      if (onDone) onDone();
      return;
    }
    const ctx = this.initContext();
    if (!ctx || !this.sfxGain) {
      if (onDone) onDone();
      return;
    }

    try {
      const now = ctx.currentTime;
      this.emitEvent('DRS_RADIO_COMMS', 0.75, '3RD UMPIRE RADIO COMMS', 76, { phrase });

      // Radio walkie-talkie squelch chirp
      const noiseBuffer = ctx.createBuffer(1, Math.floor(ctx.sampleRate * 0.08), ctx.sampleRate);
      const data = noiseBuffer.getChannelData(0);
      for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * 0.2;

      const squelch = ctx.createBufferSource();
      squelch.buffer = noiseBuffer;
      const bFilter = ctx.createBiquadFilter();
      bFilter.type = 'bandpass';
      bFilter.frequency.setValueAtTime(2200, now);

      const squelchGain = ctx.createGain();
      squelchGain.gain.setValueAtTime(0.12, now);
      squelchGain.gain.exponentialRampToValueAtTime(0.001, now + 0.07);

      squelch.connect(bFilter);
      bFilter.connect(squelchGain);
      squelchGain.connect(this.sfxGain);
      squelch.start(now);
      squelch.stop(now + 0.08);

      // Accompany with voice commentary if enabled
      setTimeout(() => {
        this.speakAiCommentary(phrase, { rate: 1.05, pitch: 0.95, mood: 'technical', onEnd: onDone });
      }, 100);

    } catch {
      if (onDone) onDone();
    }
  }

  /**
   * DRS Final Verdict Screen Reveal
   */
  public playDrsDecisionReveal(isOut: boolean) {
    if (this.settings.masterMuted) return;
    this.stopDrsHeartbeatLoop();

    const ctx = this.initContext();
    if (!ctx || !this.masterGain) return;

    try {
      this.emitEvent('DRS_DECISION', 1.0, isOut ? 'DECISION: OUT (104 dB)' : 'DECISION: NOT OUT (100 dB)', 104, { isOut });

      if (isOut) {
        // Dramatic minor gong + crowd roar
        this.playWicketFall();
      } else {
        // Relief cheer & applause
        this.playBoundaryApplause();
      }
    } catch {}
  }

  // --- ADDITIONAL MATCH SFX ---

  public playBatHit() {
    if (this.settings.masterMuted) return;
    const ctx = this.initContext();
    if (!ctx || !this.sfxGain) return;

    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const g = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(320, now);
      osc.frequency.exponentialRampToValueAtTime(80, now + 0.05);

      g.gain.setValueAtTime(0.3, now);
      g.gain.exponentialRampToValueAtTime(0.001, now + 0.06);

      osc.connect(g);
      g.connect(this.sfxGain);
      osc.start(now);
      osc.stop(now + 0.07);
    } catch {}
  }

  public playBoundaryApplause() {
    if (this.settings.masterMuted) return;
    const ctx = this.initContext();
    if (!ctx || !this.crowdGain) return;

    try {
      const now = ctx.currentTime;
      this.emitEvent('FOUR_APPLAUSE', 0.8, 'BOUNDARY FOUR APPLAUSE (102 dB)', 102);

      // Rhythmic clapping & crowd cheering
      const bufferSize = ctx.sampleRate * 1.8;
      const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const output = noiseBuffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) output[i] = Math.random() * 2 - 1;

      const source = ctx.createBufferSource();
      source.buffer = noiseBuffer;

      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(1400, now);

      const g = ctx.createGain();
      g.gain.setValueAtTime(0.01, now);
      g.gain.linearRampToValueAtTime(0.28, now + 0.2);
      g.gain.exponentialRampToValueAtTime(0.001, now + 1.8);

      source.connect(filter);
      filter.connect(g);
      g.connect(this.crowdGain);
      source.start(now);
      source.stop(now + 1.85);
    } catch {}
  }

  public playWicketFall() {
    if (this.settings.masterMuted) return;
    const ctx = this.initContext();
    if (!ctx || !this.crowdGain) return;

    try {
      const now = ctx.currentTime;
      this.emitEvent('WICKET_FALL', 1.0, 'WICKET! STUMPS BROKEN (112 dB)', 112);

      // Stumps shattered wood clatter
      [180, 240, 420].forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        const t = now + idx * 0.03;

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(freq, t);
        osc.frequency.exponentialRampToValueAtTime(60, t + 0.1);

        g.gain.setValueAtTime(0.22, t);
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.12);

        osc.connect(g);
        g.connect(this.sfxGain!);
        osc.start(t);
        osc.stop(t + 0.14);
      });

      // Stunned roar & appeal
      this.playSixRoar(50000);
    } catch {}
  }

  public playUiClick() {
    if (this.settings.masterMuted) return;
    const ctx = this.initContext();
    if (!ctx || !this.sfxGain) return;

    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const g = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(720, now);
      g.gain.setValueAtTime(0.08, now);
      g.gain.exponentialRampToValueAtTime(0.001, now + 0.04);

      osc.connect(g);
      g.connect(this.sfxGain);
      osc.start(now);
      osc.stop(now + 0.05);
    } catch {}
  }

  public playVictory() {
    if (this.settings.masterMuted) return;
    const ctx = this.initContext();
    if (!ctx || !this.crowdGain) return;

    try {
      const now = ctx.currentTime;
      [523.25, 659.25, 783.99, 1046.5].forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        const start = now + idx * 0.12;

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, start);
        g.gain.setValueAtTime(0.2, start);
        g.gain.exponentialRampToValueAtTime(0.001, start + 0.7);

        osc.connect(g);
        g.connect(this.crowdGain!);
        osc.start(start);
        osc.stop(start + 0.75);
      });

      this.playSixRoar(90000);
    } catch {}
  }

  /**
   * Automated Event Handler:
   * Inspects ball outcome and match context, then triggers roar, gasp, death overs music, or DRS.
   */
  public handleMatchEvent(
    event: {
      runsScored: number;
      isWicket: boolean;
      outcome?: string;
      shot?: string;
      strikerName?: string;
      bowlerName?: string;
    },
    context: {
      currentOver: number;
      totalOvers: number;
      runsNeeded?: number;
      wickets: number;
      ballsRemaining?: number;
    }
  ) {
    this.playBatHit();

    // 1. Six -> Roar + AI Commentary
    if (event.runsScored === 6 || event.outcome === '6') {
      this.playSixRoar();
      setTimeout(() => {
        this.announceBallEvent(event);
      }, 700);
      return;
    }

    // 2. Wicket -> Stumps shatter + roar
    if (event.isWicket) {
      this.playWicketFall();
      setTimeout(() => {
        this.announceBallEvent(event);
      }, 700);
      return;
    }

    // 3. Four -> Boundary Applause
    if (event.runsScored === 4 || event.outcome === '4') {
      this.playBoundaryApplause();
      setTimeout(() => {
        this.announceBallEvent(event);
      }, 600);
      return;
    }

    // 4. Dot ball with close call indicators (e.g. beaten outside edge, play & miss)
    if (event.runsScored === 0 && !event.isWicket) {
      const shotLower = (event.shot || '').toLowerCase();
      const isPlayAndMiss = shotLower.includes('edge') || shotLower.includes('leave') || shotLower.includes('beat') || shotLower.includes('defend') || Math.random() < 0.35;
      if (isPlayAndMiss) {
        this.playCloseCallGasp('Beaten Outside Edge');
      }
    }

    // 5. Death overs detection (last 4 overs in T20 or last 10 overs in ODI, or tight chase)
    const oversLeft = context.totalOvers - context.currentOver;
    const isDeathOvers = oversLeft <= 4 || (context.runsNeeded !== undefined && context.runsNeeded > 0 && oversLeft <= 5);

    if (isDeathOvers && !this.isDeathOversActive) {
      this.startDeathOversMusic({ tempoBpm: 132, intensity: 1.0 });
    } else if (!isDeathOvers && this.isDeathOversActive) {
      this.stopDeathOversMusic();
    }
  }
}

// Singleton export
export const audioManager = new AudioManagerService();
export const AudioManager = audioManager;
