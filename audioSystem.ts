export type AudioPriority = 'VICTORY' | 'CENTURY' | 'WICKET' | 'SIX' | 'FOUR' | 'COMMENTARY' | 'UI';

const PRIORITY_LEVELS: Record<AudioPriority, number> = {
  VICTORY: 7,
  CENTURY: 6,
  WICKET: 5,
  SIX: 4,
  FOUR: 3,
  COMMENTARY: 2,
  UI: 1,
};

export interface AudioSettings {
  masterMuted: boolean;
  masterVolume: number; // 0 to 1
  effectsVolume: number; // 0 to 1
  crowdVolume: number; // 0 to 1
}

class CentralizedAudioManager {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private analyser: AnalyserNode | null = null;
  private tenseHumOsc: OscillatorNode | null = null;
  private tenseHumGain: GainNode | null = null;
  private currentActivePriority: number = 0;
  private activeToneTimeout: NodeJS.Timeout | null = null;
  private acousticListeners: Set<(event: { type: 'SIX' | 'FOUR' | 'WICKET' | 'DOT' | 'TENSE'; intensity: number }) => void> = new Set();
  private settings: AudioSettings = {
    masterMuted: false,
    masterVolume: 0.8,
    effectsVolume: 0.8,
    crowdVolume: 0.6,
  };

  private settingsListeners: Set<(enabled: boolean) => void> = new Set();

  constructor() {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('cricket_ai_audio_settings');
      if (saved) {
        try {
          this.settings = { ...this.settings, ...JSON.parse(saved) };
        } catch {
          // fallback
        }
      }

      // Unlock Web Audio Context on the very first user gesture anywhere in the app
      const unlockOnce = () => {
        this.initContext();
        window.removeEventListener('pointerdown', unlockOnce);
        window.removeEventListener('keydown', unlockOnce);
        window.removeEventListener('touchstart', unlockOnce);
      };
      window.addEventListener('pointerdown', unlockOnce, { passive: true });
      window.addEventListener('keydown', unlockOnce, { passive: true });
      window.addEventListener('touchstart', unlockOnce, { passive: true });
    }
  }

  private initContext(): AudioContext | null {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
        this.masterGain = this.ctx.createGain();
        this.analyser = this.ctx.createAnalyser();
        this.analyser.fftSize = 64;
        this.analyser.smoothingTimeConstant = 0.8;
        this.masterGain.connect(this.analyser);
        this.analyser.connect(this.ctx.destination);
        this.updateMasterGain();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    this.updateMasterGain();
    return this.ctx;
  }

  private updateMasterGain() {
    if (this.masterGain && this.ctx) {
      const vol = this.settings.masterMuted ? 0 : Math.max(0.15, this.settings.masterVolume);
      this.masterGain.gain.cancelScheduledValues(this.ctx.currentTime);
      this.masterGain.gain.setValueAtTime(vol, this.ctx.currentTime);
    }
  }

  public subscribeSettings(listener: (enabled: boolean) => void): () => void {
    this.settingsListeners.add(listener);
    return () => {
      this.settingsListeners.delete(listener);
    };
  }

  private notifySettingsChanged() {
    const enabled = !this.settings.masterMuted;
    this.settingsListeners.forEach((fn) => {
      try {
        fn(enabled);
      } catch {
        // ignore
      }
    });
  }

  public getAudioOutputNode(): AudioNode | null {
    this.initContext();
    return this.masterGain || this.ctx?.destination || null;
  }

  public getAnalyser(): AnalyserNode | null {
    this.initContext();
    return this.analyser;
  }

  public getFrequencyData(array?: Uint8Array): Uint8Array {
    if (!this.analyser) return new Uint8Array(32);
    const data = array || new Uint8Array(this.analyser.frequencyBinCount);
    try {
      // Cast for compatibility with TS DOM definitions
      (this.analyser as unknown as { getByteFrequencyData: (arr: Uint8Array) => void }).getByteFrequencyData(data);
    } catch {
      // fallback
    }
    return data;
  }

  public subscribeAcoustic(listener: (event: { type: 'SIX' | 'FOUR' | 'WICKET' | 'DOT' | 'TENSE'; intensity: number }) => void): () => void {
    this.acousticListeners.add(listener);
    return () => {
      this.acousticListeners.delete(listener);
    };
  }

  private emitAcoustic(type: 'SIX' | 'FOUR' | 'WICKET' | 'DOT' | 'TENSE', intensity: number) {
    this.acousticListeners.forEach((listener) => {
      try {
        listener({ type, intensity });
      } catch {
        // Safe listener failure
      }
    });
  }

  public getSettings(): AudioSettings {
    return { ...this.settings };
  }

  public updateSettings(partial: Partial<AudioSettings>) {
    this.settings = { ...this.settings, ...partial };
    this.updateMasterGain();
    if (typeof partial.masterMuted === 'boolean') {
      try {
        audioManagerService.updateSettings({ masterMuted: partial.masterMuted });
      } catch {
        // ignore
      }
    }
    if (typeof window !== 'undefined') {
      localStorage.setItem('cricket_ai_audio_settings', JSON.stringify(this.settings));
    }
    this.notifySettingsChanged();
  }

  public setMuted(muted: boolean) {
    this.updateSettings({ masterMuted: muted });
  }

  public toggleMute(): boolean {
    const nextMuted = !this.settings.masterMuted;
    this.updateSettings({ masterMuted: nextMuted });
    if (!nextMuted) {
      this.playUiClick();
    }
    return !this.settings.masterMuted;
  }

  public isMuted(): boolean {
    return this.settings.masterMuted;
  }

  private canPlay(priority: AudioPriority): boolean {
    if (this.settings.masterMuted) return false;
    const reqLevel = PRIORITY_LEVELS[priority];
    // If higher priority is already playing, prevent lower priority
    if (reqLevel < this.currentActivePriority) {
      return false;
    }
    return true;
  }

  private lockPriority(priority: AudioPriority, durationMs: number) {
    this.currentActivePriority = PRIORITY_LEVELS[priority];
    if (this.activeToneTimeout) clearTimeout(this.activeToneTimeout);
    this.activeToneTimeout = setTimeout(() => {
      this.currentActivePriority = 0;
    }, durationMs);
  }

  private routeToOutput(node: AudioNode) {
    if (this.masterGain) {
      node.connect(this.masterGain);
    } else if (this.ctx) {
      node.connect(this.ctx.destination);
    }
  }

  // --- PROCEDURAL SOUND ENGINES ---

  public playUiClick() {
    if (!this.canPlay('UI')) return;
    const ctx = this.initContext();
    if (!ctx) return;

    const triggerTick = () => {
      try {
        const now = ctx.currentTime;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const vol = Math.max(0.18, this.settings.masterVolume * this.settings.effectsVolume * 0.24);

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(760, now);
        osc.frequency.exponentialRampToValueAtTime(410, now + 0.045);
        gain.gain.setValueAtTime(vol, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);

        osc.connect(gain);
        this.routeToOutput(gain);
        osc.start(now);
        osc.stop(now + 0.055);
      } catch {
        // Audio fallback
      }
    };

    if (ctx.state === 'suspended') {
      ctx.resume().then(triggerTick).catch(() => {});
    } else {
      triggerTick();
    }
  }

  public playBatHit() {
    if (!this.canPlay('FOUR')) return;
    const ctx = this.initContext();
    if (!ctx) return;

    const triggerHit = () => {
      try {
        const now = ctx.currentTime;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const vol = Math.max(0.24, this.settings.masterVolume * this.settings.effectsVolume * 0.36);

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(520, now);
        osc.frequency.exponentialRampToValueAtTime(125, now + 0.085);

        gain.gain.setValueAtTime(vol, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);

        osc.connect(gain);
        this.routeToOutput(gain);
        osc.start(now);
        osc.stop(now + 0.095);
        this.lockPriority('FOUR', 120);
        this.emitAcoustic('DOT', 0.4);
      } catch {
        // Audio fallback
      }
    };

    if (ctx.state === 'suspended') {
      ctx.resume().then(triggerHit).catch(() => {});
    } else {
      triggerHit();
    }
  }

  public playPitchImpactSound(
    deliveryCategory: 'seam' | 'spin',
    surfaceTrait: 'damp' | 'dry' | 'grassy' | 'cracked' = 'grassy',
    options?: { delaySec?: number; forceUnmute?: boolean }
  ) {
    if (options?.forceUnmute && this.settings.masterMuted) {
      this.setMuted(false);
    }
    if (this.settings.masterMuted) return;

    const ctx = this.initContext();
    if (!ctx) return;

    const scheduleImpact = () => {
      try {
        this.updateMasterGain();
        const now = ctx.currentTime;
        const delay = Math.max(0, options?.delaySec ?? 0);
        const impactAt = now + delay;
        const baseVol = Math.max(
          0.45,
          this.settings.masterVolume * this.settings.effectsVolume
        );

        // Optional subtle release air-whoosh when tracing from bowler's hand
        if (delay >= 0.12) {
          const whooshLen = Math.floor(ctx.sampleRate * 0.075);
          const whooshBuf = ctx.createBuffer(1, whooshLen, ctx.sampleRate);
          const wData = whooshBuf.getChannelData(0);
          for (let i = 0; i < whooshLen; i++) {
            const env = Math.sin((i / whooshLen) * Math.PI);
            wData[i] = (Math.random() * 2 - 1) * env * 0.35;
          }
          const whooshSrc = ctx.createBufferSource();
          whooshSrc.buffer = whooshBuf;
          const whooshFilter = ctx.createBiquadFilter();
          whooshFilter.type = 'bandpass';
          whooshFilter.frequency.setValueAtTime(deliveryCategory === 'seam' ? 980 : 1350, now);
          whooshFilter.Q.setValueAtTime(1.4, now);
          const whooshGain = ctx.createGain();
          whooshGain.gain.setValueAtTime(baseVol * 0.22, now);
          whooshGain.gain.exponentialRampToValueAtTime(0.001, now + 0.075);

          whooshSrc.connect(whooshFilter);
          whooshFilter.connect(whooshGain);
          this.routeToOutput(whooshGain);
          whooshSrc.start(now);
          whooshSrc.stop(now + 0.08);
        }

        if (deliveryCategory === 'seam') {
          // 1) Heavy Turf Sub-Mid Thump (audible on both laptop speakers & headphones)
          const thudOsc = ctx.createOscillator();
          const thudGain = ctx.createGain();
          const startFreq =
            surfaceTrait === 'damp' ? 185 : surfaceTrait === 'cracked' ? 245 : 215;
          const endFreq = surfaceTrait === 'damp' ? 50 : 62;

          thudOsc.type = 'triangle';
          thudOsc.frequency.setValueAtTime(startFreq, impactAt);
          thudOsc.frequency.exponentialRampToValueAtTime(endFreq, impactAt + 0.145);

          thudGain.gain.setValueAtTime(0.001, now);
          thudGain.gain.setValueAtTime(baseVol * 0.72, impactAt);
          thudGain.gain.exponentialRampToValueAtTime(0.001, impactAt + 0.16);

          thudOsc.connect(thudGain);
          this.routeToOutput(thudGain);
          thudOsc.start(impactAt);
          thudOsc.stop(impactAt + 0.17);

          // 2) Stump-Mic Compressed Clay Impact Noise Thump (Low-Pass 420Hz)
          const thumpSamples = Math.floor(ctx.sampleRate * 0.08);
          const thumpBuf = ctx.createBuffer(1, thumpSamples, ctx.sampleRate);
          const tChan = thumpBuf.getChannelData(0);
          for (let i = 0; i < thumpSamples; i++) {
            const env = Math.pow(1 - i / thumpSamples, 2.1);
            tChan[i] = (Math.random() * 2 - 1) * env;
          }
          const thumpSrc = ctx.createBufferSource();
          thumpSrc.buffer = thumpBuf;

          const lowpass = ctx.createBiquadFilter();
          lowpass.type = 'lowpass';
          lowpass.frequency.setValueAtTime(surfaceTrait === 'damp' ? 340 : 460, impactAt);
          lowpass.Q.setValueAtTime(2.4, impactAt);

          const noiseThumpGain = ctx.createGain();
          noiseThumpGain.gain.setValueAtTime(baseVol * 0.58, impactAt);
          noiseThumpGain.gain.exponentialRampToValueAtTime(0.001, impactAt + 0.08);

          thumpSrc.connect(lowpass);
          lowpass.connect(noiseThumpGain);
          this.routeToOutput(noiseThumpGain);
          thumpSrc.start(impactAt);
          thumpSrc.stop(impactAt + 0.085);

          // 3) Hard Leather Seam Smack Transient
          const smackOsc = ctx.createOscillator();
          const smackGain = ctx.createGain();
          smackOsc.type = 'sine';
          smackOsc.frequency.setValueAtTime(720, impactAt);
          smackOsc.frequency.exponentialRampToValueAtTime(165, impactAt + 0.038);
          smackGain.gain.setValueAtTime(baseVol * 0.34, impactAt);
          smackGain.gain.exponentialRampToValueAtTime(0.001, impactAt + 0.042);

          smackOsc.connect(smackGain);
          this.routeToOutput(smackGain);
          smackOsc.start(impactAt);
          smackOsc.stop(impactAt + 0.045);

          this.emitAcoustic('DOT', 0.55);
        } else {
          // 1) Abrasive Dry-Soil Multi-Grain Spin Crackle (3 rapid seam-rip impulses)
          const bufferSize = Math.floor(ctx.sampleRate * 0.145);
          const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
          const channel = noiseBuffer.getChannelData(0);
          const grainPeaks = [
            0,
            Math.floor(ctx.sampleRate * 0.028),
            Math.floor(ctx.sampleRate * 0.058),
          ];

          for (let i = 0; i < bufferSize; i++) {
            const globalDecay = Math.pow(1 - i / bufferSize, 1.35);
            let grainBoost = 0.25;
            for (const g of grainPeaks) {
              const dist = i - g;
              if (dist >= 0 && dist < ctx.sampleRate * 0.022) {
                grainBoost = Math.max(
                  grainBoost,
                  1 - dist / (ctx.sampleRate * 0.022)
                );
              }
            }
            const crackleSnap =
              Math.random() > 0.48 ? Math.random() * 2 - 1 : (Math.random() * 2 - 1) * 0.22;
            channel[i] = crackleSnap * grainBoost * globalDecay;
          }

          const noiseSource = ctx.createBufferSource();
          noiseSource.buffer = noiseBuffer;

          const bandpass = ctx.createBiquadFilter();
          bandpass.type = 'bandpass';
          bandpass.frequency.setValueAtTime(
            surfaceTrait === 'dry' || surfaceTrait === 'cracked' ? 2450 : 1950,
            impactAt
          );
          bandpass.Q.setValueAtTime(1.7, impactAt);

          const crackleGain = ctx.createGain();
          crackleGain.gain.setValueAtTime(baseVol * 0.74, impactAt);
          crackleGain.gain.exponentialRampToValueAtTime(0.001, impactAt + 0.145);

          noiseSource.connect(bandpass);
          bandpass.connect(crackleGain);
          this.routeToOutput(crackleGain);
          noiseSource.start(impactAt);
          noiseSource.stop(impactAt + 0.15);

          // 2) Rotational Cork & Seam Grip Zip (distinct spin bite inflection)
          const gripOsc = ctx.createOscillator();
          const gripGain = ctx.createGain();
          gripOsc.type = 'triangle';
          gripOsc.frequency.setValueAtTime(360, impactAt);
          gripOsc.frequency.exponentialRampToValueAtTime(680, impactAt + 0.032);
          gripOsc.frequency.exponentialRampToValueAtTime(250, impactAt + 0.085);

          gripGain.gain.setValueAtTime(baseVol * 0.32, impactAt);
          gripGain.gain.exponentialRampToValueAtTime(0.001, impactAt + 0.09);

          gripOsc.connect(gripGain);
          this.routeToOutput(gripGain);
          gripOsc.start(impactAt);
          gripOsc.stop(impactAt + 0.095);

          this.emitAcoustic('DOT', 0.5);
        }
      } catch {
        // Audio fallback
      }
    };

    if (ctx.state === 'suspended') {
      ctx.resume().then(scheduleImpact).catch(() => {});
    } else {
      scheduleImpact();
    }
  }

  private lastSliderTickMs = 0;

  public playSliderTick() {
    if (this.settings.masterMuted) return;
    const nowMs = Date.now();
    if (nowMs - this.lastSliderTickMs < 65) return;
    this.lastSliderTickMs = nowMs;

    const ctx = this.initContext();
    if (!ctx) return;

    const triggerDialTick = () => {
      try {
        const now = ctx.currentTime;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const vol = Math.max(0.1, this.settings.masterVolume * this.settings.effectsVolume * 0.16);
        osc.type = 'sine';
        osc.frequency.setValueAtTime(640, now);
        osc.frequency.exponentialRampToValueAtTime(340, now + 0.024);
        gain.gain.setValueAtTime(vol, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.028);
        osc.connect(gain);
        this.routeToOutput(gain);
        osc.start(now);
        osc.stop(now + 0.03);
      } catch {
        // Audio fallback
      }
    };

    if (ctx.state === 'suspended') {
      ctx.resume().then(triggerDialTick).catch(() => {});
    } else {
      triggerDialTick();
    }
  }

  public playPitchKeyTest(hardnessScore = 72, options?: { forceUnmute?: boolean }) {
    if (options?.forceUnmute && this.settings.masterMuted) {
      this.setMuted(false);
    }
    if (this.settings.masterMuted) return;

    const ctx = this.initContext();
    if (!ctx) return;

    const triggerKeyTap = () => {
      try {
        this.updateMasterGain();
        const now = ctx.currentTime;
        const baseVol = Math.max(0.42, this.settings.masterVolume * this.settings.effectsVolume);
        const clamped = Math.max(10, Math.min(100, hardnessScore));

        // Double tap like a commentator tapping a metal key into the 22-yard clay (0.00s and 0.16s)
        [0, 0.16].forEach((offset, idx) => {
          const tapTime = now + offset;
          const accent = idx === 1 ? 1.08 : 0.92;

          if (clamped >= 70) {
            // Rock-hard clay: crisp metallic ring + firm high-rebound knock
            const ringOsc1 = ctx.createOscillator();
            const ringOsc2 = ctx.createOscillator();
            const ringGain = ctx.createGain();
            ringOsc1.type = 'sine';
            ringOsc2.type = 'triangle';
            ringOsc1.frequency.setValueAtTime(2280 * accent, tapTime);
            ringOsc1.frequency.exponentialRampToValueAtTime(1680, tapTime + 0.11);
            ringOsc2.frequency.setValueAtTime(3420 * accent, tapTime);
            ringOsc2.frequency.exponentialRampToValueAtTime(2480, tapTime + 0.085);

            ringGain.gain.setValueAtTime(baseVol * 0.42, tapTime);
            ringGain.gain.exponentialRampToValueAtTime(0.001, tapTime + 0.12);

            ringOsc1.connect(ringGain);
            ringOsc2.connect(ringGain);
            this.routeToOutput(ringGain);
            ringOsc1.start(tapTime);
            ringOsc2.start(tapTime);
            ringOsc1.stop(tapTime + 0.125);
            ringOsc2.stop(tapTime + 0.09);

            const knockOsc = ctx.createOscillator();
            const knockGain = ctx.createGain();
            knockOsc.type = 'triangle';
            knockOsc.frequency.setValueAtTime(320, tapTime);
            knockOsc.frequency.exponentialRampToValueAtTime(115, tapTime + 0.065);
            knockGain.gain.setValueAtTime(baseVol * 0.56, tapTime);
            knockGain.gain.exponentialRampToValueAtTime(0.001, tapTime + 0.07);
            knockOsc.connect(knockGain);
            this.routeToOutput(knockGain);
            knockOsc.start(tapTime);
            knockOsc.stop(tapTime + 0.075);
          } else if (clamped >= 45) {
            // Balanced sporting deck: firm metallic-wood tap + medium turf thud
            const midOsc = ctx.createOscillator();
            const midGain = ctx.createGain();
            midOsc.type = 'triangle';
            midOsc.frequency.setValueAtTime(1320 * accent, tapTime);
            midOsc.frequency.exponentialRampToValueAtTime(420, tapTime + 0.075);
            midGain.gain.setValueAtTime(baseVol * 0.48, tapTime);
            midGain.gain.exponentialRampToValueAtTime(0.001, tapTime + 0.08);
            midOsc.connect(midGain);
            this.routeToOutput(midGain);
            midOsc.start(tapTime);
            midOsc.stop(tapTime + 0.085);

            const turfOsc = ctx.createOscillator();
            const turfGain = ctx.createGain();
            turfOsc.type = 'sine';
            turfOsc.frequency.setValueAtTime(210, tapTime);
            turfOsc.frequency.exponentialRampToValueAtTime(75, tapTime + 0.08);
            turfGain.gain.setValueAtTime(baseVol * 0.52, tapTime);
            turfGain.gain.exponentialRampToValueAtTime(0.001, tapTime + 0.085);
            turfOsc.connect(turfGain);
            this.routeToOutput(turfGain);
            turfOsc.start(tapTime);
            turfOsc.stop(tapTime + 0.09);
          } else {
            // Soft damp / dry crumbling surface: dull plug + loose soil crumble
            const plugOsc = ctx.createOscillator();
            const plugGain = ctx.createGain();
            plugOsc.type = 'sine';
            plugOsc.frequency.setValueAtTime(145, tapTime);
            plugOsc.frequency.exponentialRampToValueAtTime(48, tapTime + 0.11);
            plugGain.gain.setValueAtTime(baseVol * 0.62, tapTime);
            plugGain.gain.exponentialRampToValueAtTime(0.001, tapTime + 0.12);
            plugOsc.connect(plugGain);
            this.routeToOutput(plugGain);
            plugOsc.start(tapTime);
            plugOsc.stop(tapTime + 0.125);

            const grainLen = Math.floor(ctx.sampleRate * 0.09);
            const grainBuf = ctx.createBuffer(1, grainLen, ctx.sampleRate);
            const gData = grainBuf.getChannelData(0);
            for (let i = 0; i < grainLen; i++) {
              gData[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / grainLen, 1.8);
            }
            const grainSrc = ctx.createBufferSource();
            grainSrc.buffer = grainBuf;
            const bp = ctx.createBiquadFilter();
            bp.type = 'bandpass';
            bp.frequency.setValueAtTime(1650, tapTime);
            const gGain = ctx.createGain();
            gGain.gain.setValueAtTime(baseVol * 0.36, tapTime);
            gGain.gain.exponentialRampToValueAtTime(0.001, tapTime + 0.09);
            grainSrc.connect(bp);
            bp.connect(gGain);
            this.routeToOutput(gGain);
            grainSrc.start(tapTime);
            grainSrc.stop(tapTime + 0.095);
          }
        });

        this.emitAcoustic('DOT', 0.55);
      } catch {
        // Audio fallback
      }
    };

    if (ctx.state === 'suspended') {
      ctx.resume().then(triggerKeyTap).catch(() => {});
    } else {
      triggerKeyTap();
    }
  }

  public playSoilRollerSound(
    mode: 'heavy_roller' | 'sweep_broom' = 'heavy_roller',
    options?: { forceUnmute?: boolean }
  ) {
    if (options?.forceUnmute && this.settings.masterMuted) {
      this.setMuted(false);
    }
    if (this.settings.masterMuted) return;

    const ctx = this.initContext();
    if (!ctx) return;

    const triggerRoller = () => {
      try {
        this.updateMasterGain();
        const now = ctx.currentTime;
        const baseVol = Math.max(0.4, this.settings.masterVolume * this.settings.effectsVolume);

        if (mode === 'heavy_roller') {
          // Deep iron drum rumble + rolling clay texture + subtle mechanical clink
          const rumbleOsc = ctx.createOscillator();
          const rumbleGain = ctx.createGain();
          rumbleOsc.type = 'triangle';
          rumbleOsc.frequency.setValueAtTime(72, now);
          rumbleOsc.frequency.linearRampToValueAtTime(56, now + 0.35);
          rumbleOsc.frequency.linearRampToValueAtTime(64, now + 0.68);

          rumbleGain.gain.setValueAtTime(0.001, now);
          rumbleGain.gain.linearRampToValueAtTime(baseVol * 0.55, now + 0.08);
          rumbleGain.gain.exponentialRampToValueAtTime(0.001, now + 0.72);

          rumbleOsc.connect(rumbleGain);
          this.routeToOutput(rumbleGain);
          rumbleOsc.start(now);
          rumbleOsc.stop(now + 0.75);

          const rollSamples = Math.floor(ctx.sampleRate * 0.68);
          const rollBuf = ctx.createBuffer(1, rollSamples, ctx.sampleRate);
          const rChan = rollBuf.getChannelData(0);
          for (let i = 0; i < rollSamples; i++) {
            const env = Math.sin((i / rollSamples) * Math.PI);
            rChan[i] = (Math.random() * 2 - 1) * env * 0.65;
          }
          const rollSrc = ctx.createBufferSource();
          rollSrc.buffer = rollBuf;
          const lp = ctx.createBiquadFilter();
          lp.type = 'lowpass';
          lp.frequency.setValueAtTime(320, now);
          const rollGain = ctx.createGain();
          rollGain.gain.setValueAtTime(baseVol * 0.46, now);
          rollGain.gain.exponentialRampToValueAtTime(0.001, now + 0.68);

          rollSrc.connect(lp);
          lp.connect(rollGain);
          this.routeToOutput(rollGain);
          rollSrc.start(now);
          rollSrc.stop(now + 0.7);

          // Subtle steel axle clink
          const clinkOsc = ctx.createOscillator();
          const clinkGain = ctx.createGain();
          clinkOsc.type = 'sine';
          clinkOsc.frequency.setValueAtTime(1180, now + 0.22);
          clinkOsc.frequency.exponentialRampToValueAtTime(760, now + 0.31);
          clinkGain.gain.setValueAtTime(baseVol * 0.2, now + 0.22);
          clinkGain.gain.exponentialRampToValueAtTime(0.001, now + 0.32);
          clinkOsc.connect(clinkGain);
          this.routeToOutput(clinkGain);
          clinkOsc.start(now + 0.22);
          clinkOsc.stop(now + 0.33);
        } else {
          // Groundsman bristle broom double sweep across dry pitch dust
          [0, 0.22].forEach((offset, idx) => {
            const t = now + offset;
            const sweepSamples = Math.floor(ctx.sampleRate * 0.18);
            const sweepBuf = ctx.createBuffer(1, sweepSamples, ctx.sampleRate);
            const sChan = sweepBuf.getChannelData(0);
            for (let i = 0; i < sweepSamples; i++) {
              const env = Math.sin((i / sweepSamples) * Math.PI);
              sChan[i] = (Math.random() * 2 - 1) * env;
            }
            const sweepSrc = ctx.createBufferSource();
            sweepSrc.buffer = sweepBuf;
            const bp = ctx.createBiquadFilter();
            bp.type = 'bandpass';
            bp.frequency.setValueAtTime(idx === 0 ? 1650 : 2050, t);
            bp.frequency.linearRampToValueAtTime(idx === 0 ? 2450 : 2850, t + 0.17);
            bp.Q.setValueAtTime(1.6, t);
            const sGain = ctx.createGain();
            sGain.gain.setValueAtTime(baseVol * 0.44, t);
            sGain.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
            sweepSrc.connect(bp);
            bp.connect(sGain);
            this.routeToOutput(sGain);
            sweepSrc.start(t);
            sweepSrc.stop(t + 0.19);
          });
        }
        this.emitAcoustic('DOT', 0.45);
      } catch {
        // Audio fallback
      }
    };

    if (ctx.state === 'suspended') {
      ctx.resume().then(triggerRoller).catch(() => {});
    } else {
      triggerRoller();
    }
  }

  public playWindGustSound(windKmh = 24, options?: { forceUnmute?: boolean }) {
    if (options?.forceUnmute && this.settings.masterMuted) {
      this.setMuted(false);
    }
    if (this.settings.masterMuted) return;

    const ctx = this.initContext();
    if (!ctx) return;

    const triggerGust = () => {
      try {
        this.updateMasterGain();
        const now = ctx.currentTime;
        const speedNorm = Math.max(0.35, Math.min(1.2, windKmh / 35));
        const baseVol = Math.max(0.38, this.settings.masterVolume * this.settings.effectsVolume) * speedNorm;
        const gustLen = Math.floor(ctx.sampleRate * 0.68);
        const gustBuf = ctx.createBuffer(1, gustLen, ctx.sampleRate);
        const gData = gustBuf.getChannelData(0);
        for (let i = 0; i < gustLen; i++) {
          const env = Math.sin((i / gustLen) * Math.PI);
          gData[i] = (Math.random() * 2 - 1) * env;
        }
        const src = ctx.createBufferSource();
        src.buffer = gustBuf;
        const filter = ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(340, now);
        filter.frequency.exponentialRampToValueAtTime(520 + windKmh * 9, now + 0.34);
        filter.frequency.exponentialRampToValueAtTime(380, now + 0.67);
        filter.Q.setValueAtTime(2.6, now);

        const gain = ctx.createGain();
        gain.gain.setValueAtTime(baseVol * 0.56, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.68);

        src.connect(filter);
        filter.connect(gain);
        this.routeToOutput(gain);
        src.start(now);
        src.stop(now + 0.7);
      } catch {
        // Audio fallback
      }
    };

    if (ctx.state === 'suspended') {
      ctx.resume().then(triggerGust).catch(() => {});
    } else {
      triggerGust();
    }
  }

  public playRadarSweepPing(options?: { forceUnmute?: boolean }) {
    if (options?.forceUnmute && this.settings.masterMuted) {
      this.setMuted(false);
    }
    if (this.settings.masterMuted) return;

    const ctx = this.initContext();
    if (!ctx) return;

    const triggerRadar = () => {
      try {
        this.updateMasterGain();
        const now = ctx.currentTime;
        const baseVol = Math.max(0.34, this.settings.masterVolume * this.settings.effectsVolume);

        // Dual Hawk-Eye / LiDAR harmonic telemetry pings
        [
          { freq: 1180, offset: 0, dur: 0.16 },
          { freq: 1770, offset: 0.11, dur: 0.22 },
        ].forEach((ping) => {
          const t = now + ping.offset;
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(ping.freq, t);
          osc.frequency.exponentialRampToValueAtTime(ping.freq * 1.06, t + ping.dur);
          gain.gain.setValueAtTime(baseVol * 0.28, t);
          gain.gain.exponentialRampToValueAtTime(0.001, t + ping.dur);
          osc.connect(gain);
          this.routeToOutput(gain);
          osc.start(t);
          osc.stop(t + ping.dur + 0.01);
        });

        // Subtle laser scan sweep shimmer
        const sweepOsc = ctx.createOscillator();
        const sweepGain = ctx.createGain();
        sweepOsc.type = 'triangle';
        sweepOsc.frequency.setValueAtTime(520, now);
        sweepOsc.frequency.exponentialRampToValueAtTime(1960, now + 0.38);
        sweepGain.gain.setValueAtTime(baseVol * 0.14, now);
        sweepGain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
        sweepOsc.connect(sweepGain);
        this.routeToOutput(sweepGain);
        sweepOsc.start(now);
        sweepOsc.stop(now + 0.42);
      } catch {
        // Audio fallback
      }
    };

    if (ctx.state === 'suspended') {
      ctx.resume().then(triggerRadar).catch(() => {});
    } else {
      triggerRadar();
    }
  }

  public playStumpShatter(options?: { forceUnmute?: boolean; delaySec?: number }) {
    if (options?.forceUnmute && this.settings.masterMuted) {
      this.setMuted(false);
    }
    if (this.settings.masterMuted) return;

    const ctx = this.initContext();
    if (!ctx) return;

    const scheduleShatter = () => {
      try {
        this.updateMasterGain();
        const startAt = ctx.currentTime + Math.max(0, options?.delaySec ?? 0);
        const baseVol = Math.max(0.45, this.settings.masterVolume * this.settings.effectsVolume);

        // 1) Ash-wood stump timber crack
        const timberOsc = ctx.createOscillator();
        const timberGain = ctx.createGain();
        timberOsc.type = 'sawtooth';
        timberOsc.frequency.setValueAtTime(480, startAt);
        timberOsc.frequency.exponentialRampToValueAtTime(125, startAt + 0.11);
        timberGain.gain.setValueAtTime(baseVol * 0.52, startAt);
        timberGain.gain.exponentialRampToValueAtTime(0.001, startAt + 0.12);
        timberOsc.connect(timberGain);
        this.routeToOutput(timberGain);
        timberOsc.start(startAt);
        timberOsc.stop(startAt + 0.13);

        // 2) Stump-mic wood splinter noise snap
        const snapSamples = Math.floor(ctx.sampleRate * 0.085);
        const snapBuf = ctx.createBuffer(1, snapSamples, ctx.sampleRate);
        const sChan = snapBuf.getChannelData(0);
        for (let i = 0; i < snapSamples; i++) {
          sChan[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / snapSamples, 1.9);
        }
        const snapSrc = ctx.createBufferSource();
        snapSrc.buffer = snapBuf;
        const bp = ctx.createBiquadFilter();
        bp.type = 'bandpass';
        bp.frequency.setValueAtTime(1850, startAt);
        const snapGain = ctx.createGain();
        snapGain.gain.setValueAtTime(baseVol * 0.56, startAt);
        snapGain.gain.exponentialRampToValueAtTime(0.001, startAt + 0.085);
        snapSrc.connect(bp);
        bp.connect(snapGain);
        this.routeToOutput(snapGain);
        snapSrc.start(startAt);
        snapSrc.stop(startAt + 0.09);

        // 3) Flying wooden bails clattering (3 staggered wood-on-wood knocks)
        [
          { delay: 0.075, freq: 1080 },
          { delay: 0.165, freq: 1340 },
          { delay: 0.265, freq: 890 },
        ].forEach((bail) => {
          const bt = startAt + bail.delay;
          const bOsc = ctx.createOscillator();
          const bGain = ctx.createGain();
          bOsc.type = 'triangle';
          bOsc.frequency.setValueAtTime(bail.freq, bt);
          bOsc.frequency.exponentialRampToValueAtTime(bail.freq * 0.55, bt + 0.055);
          bGain.gain.setValueAtTime(baseVol * 0.36, bt);
          bGain.gain.exponentialRampToValueAtTime(0.001, bt + 0.06);
          bOsc.connect(bGain);
          this.routeToOutput(bGain);
          bOsc.start(bt);
          bOsc.stop(bt + 0.065);
        });

        this.emitAcoustic('WICKET', 0.85);
      } catch {
        // Audio fallback
      }
    };

    if (ctx.state === 'suspended') {
      ctx.resume().then(scheduleShatter).catch(() => {});
    } else {
      scheduleShatter();
    }
  }

  public playStumpClatter(
    wicketMode: 'bowled' | 'lbw' = 'bowled',
    options?: { forceUnmute?: boolean; delaySec?: number }
  ) {
    if (options?.forceUnmute && this.settings.masterMuted) {
      this.setMuted(false);
    }
    if (this.settings.masterMuted) return;

    const ctx = this.initContext();
    if (!ctx) return;

    const scheduleClatter = () => {
      try {
        this.updateMasterGain();
        const now = ctx.currentTime;
        const requestedDelay = Math.max(0, options?.delaySec ?? 0);
        const stumpHitAt =
          wicketMode === 'lbw'
            ? now + Math.max(0.065, requestedDelay)
            : now + requestedDelay;
        const baseVol = Math.max(0.5, this.settings.masterVolume * this.settings.effectsVolume);

        // Optional LBW front-pad knee-roll leather thud right before projected stump clatter
        if (wicketMode === 'lbw') {
          const padAt = Math.max(now, stumpHitAt - 0.065);
          const padOsc = ctx.createOscillator();
          const padGain = ctx.createGain();
          padOsc.type = 'triangle';
          padOsc.frequency.setValueAtTime(178, padAt);
          padOsc.frequency.exponentialRampToValueAtTime(56, padAt + 0.085);
          padGain.gain.setValueAtTime(baseVol * 0.68, padAt);
          padGain.gain.exponentialRampToValueAtTime(0.001, padAt + 0.095);
          padOsc.connect(padGain);
          this.routeToOutput(padGain);
          padOsc.start(padAt);
          padOsc.stop(padAt + 0.1);

          // Leather-on-pad canvas slap transient
          const slapLen = Math.floor(ctx.sampleRate * 0.045);
          const slapBuf = ctx.createBuffer(1, slapLen, ctx.sampleRate);
          const slapData = slapBuf.getChannelData(0);
          for (let i = 0; i < slapLen; i++) {
            slapData[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / slapLen, 2.2);
          }
          const slapSrc = ctx.createBufferSource();
          slapSrc.buffer = slapBuf;
          const slapBp = ctx.createBiquadFilter();
          slapBp.type = 'bandpass';
          slapBp.frequency.setValueAtTime(560, padAt);
          slapBp.Q.setValueAtTime(1.8, padAt);
          const slapGain = ctx.createGain();
          slapGain.gain.setValueAtTime(baseVol * 0.44, padAt);
          slapGain.gain.exponentialRampToValueAtTime(0.001, padAt + 0.05);
          slapSrc.connect(slapBp);
          slapBp.connect(slapGain);
          this.routeToOutput(slapGain);
          slapSrc.start(padAt);
          slapSrc.stop(padAt + 0.055);
        }

        // 1) Heavy English Ash Stump Hollow Timber Thwack (Dual Resonator)
        const stumpBodyOsc = ctx.createOscillator();
        const stumpCavityOsc = ctx.createOscillator();
        const stumpBodyGain = ctx.createGain();

        stumpBodyOsc.type = 'sawtooth';
        stumpBodyOsc.frequency.setValueAtTime(445, stumpHitAt);
        stumpBodyOsc.frequency.exponentialRampToValueAtTime(106, stumpHitAt + 0.135);

        stumpCavityOsc.type = 'triangle';
        stumpCavityOsc.frequency.setValueAtTime(242, stumpHitAt);
        stumpCavityOsc.frequency.exponentialRampToValueAtTime(88, stumpHitAt + 0.15);

        stumpBodyGain.gain.setValueAtTime(baseVol * 0.64, stumpHitAt);
        stumpBodyGain.gain.exponentialRampToValueAtTime(0.001, stumpHitAt + 0.16);

        stumpBodyOsc.connect(stumpBodyGain);
        stumpCavityOsc.connect(stumpBodyGain);
        this.routeToOutput(stumpBodyGain);
        stumpBodyOsc.start(stumpHitAt);
        stumpCavityOsc.start(stumpHitAt);
        stumpBodyOsc.stop(stumpHitAt + 0.165);
        stumpCavityOsc.stop(stumpHitAt + 0.165);

        // 2) Crisp Hardwood Impact Crack Noise Burst
        const crackSamples = Math.floor(ctx.sampleRate * 0.09);
        const crackBuf = ctx.createBuffer(1, crackSamples, ctx.sampleRate);
        const cChan = crackBuf.getChannelData(0);
        for (let i = 0; i < crackSamples; i++) {
          cChan[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / crackSamples, 1.75);
        }
        const crackSrc = ctx.createBufferSource();
        crackSrc.buffer = crackBuf;
        const crackBp = ctx.createBiquadFilter();
        crackBp.type = 'bandpass';
        crackBp.frequency.setValueAtTime(2120, stumpHitAt);
        crackBp.Q.setValueAtTime(2.0, stumpHitAt);
        const crackGain = ctx.createGain();
        crackGain.gain.setValueAtTime(baseVol * 0.66, stumpHitAt);
        crackGain.gain.exponentialRampToValueAtTime(0.001, stumpHitAt + 0.09);
        crackSrc.connect(crackBp);
        crackBp.connect(crackGain);
        this.routeToOutput(crackGain);
        crackSrc.start(stumpHitAt);
        crackSrc.stop(stumpHitAt + 0.095);

        // 3) 5-Stage Hardwood Bail & Adjacent Stump Clattering Cascade
        const clatterImpulses = [
          { offset: 0.038, woodFreq: 1180, clickFreq: 2350, amp: 0.52 },
          { offset: 0.096, woodFreq: 1490, clickFreq: 2680, amp: 0.48 },
          { offset: 0.168, woodFreq: 1270, clickFreq: 2150, amp: 0.42 },
          { offset: 0.252, woodFreq: 940, clickFreq: 1820, amp: 0.35 },
          { offset: 0.348, woodFreq: 780, clickFreq: 1560, amp: 0.28 },
        ];

        clatterImpulses.forEach((hit) => {
          const t = stumpHitAt + hit.offset;

          // Resonant turned-wood bail knock
          const wOsc = ctx.createOscillator();
          const wGain = ctx.createGain();
          wOsc.type = 'triangle';
          wOsc.frequency.setValueAtTime(hit.woodFreq, t);
          wOsc.frequency.exponentialRampToValueAtTime(hit.woodFreq * 0.54, t + 0.062);
          wGain.gain.setValueAtTime(baseVol * hit.amp, t);
          wGain.gain.exponentialRampToValueAtTime(0.001, t + 0.068);
          wOsc.connect(wGain);
          this.routeToOutput(wGain);
          wOsc.start(t);
          wOsc.stop(t + 0.072);

          // Wood-on-wood clatter transient click
          const kLen = Math.floor(ctx.sampleRate * 0.032);
          const kBuf = ctx.createBuffer(1, kLen, ctx.sampleRate);
          const kData = kBuf.getChannelData(0);
          for (let i = 0; i < kLen; i++) {
            kData[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / kLen, 2.4);
          }
          const kSrc = ctx.createBufferSource();
          kSrc.buffer = kBuf;
          const kBp = ctx.createBiquadFilter();
          kBp.type = 'bandpass';
          kBp.frequency.setValueAtTime(hit.clickFreq, t);
          kBp.Q.setValueAtTime(3.1, t);
          const kGain = ctx.createGain();
          kGain.gain.setValueAtTime(baseVol * hit.amp * 0.78, t);
          kGain.gain.exponentialRampToValueAtTime(0.001, t + 0.035);
          kSrc.connect(kBp);
          kBp.connect(kGain);
          this.routeToOutput(kGain);
          kSrc.start(t);
          kSrc.stop(t + 0.038);
        });

        // 4) Subtle Broadcast Stump-Cam Microphone Capsule Ring
        const micRingOsc = ctx.createOscillator();
        const micRingGain = ctx.createGain();
        micRingOsc.type = 'sine';
        micRingOsc.frequency.setValueAtTime(2760, stumpHitAt + 0.015);
        micRingOsc.frequency.exponentialRampToValueAtTime(2180, stumpHitAt + 0.19);
        micRingGain.gain.setValueAtTime(baseVol * 0.12, stumpHitAt + 0.015);
        micRingGain.gain.exponentialRampToValueAtTime(0.001, stumpHitAt + 0.2);
        micRingOsc.connect(micRingGain);
        this.routeToOutput(micRingGain);
        micRingOsc.start(stumpHitAt + 0.015);
        micRingOsc.stop(stumpHitAt + 0.21);

        this.lockPriority('WICKET', 520);
        this.emitAcoustic('WICKET', 0.96);
      } catch {
        // Audio fallback
      }
    };

    if (ctx.state === 'suspended') {
      ctx.resume().then(scheduleClatter).catch(() => {});
    } else {
      scheduleClatter();
    }
  }

  public playFullDeliverySequence(params: {
    category: 'seam' | 'spin';
    surfaceTrait?: 'damp' | 'dry' | 'grassy' | 'cracked';
    outcome?: string;
    speedKmh?: number;
    forceUnmute?: boolean;
    skipWicketResolution?: boolean;
  }) {
    const trait = params.surfaceTrait ?? 'grassy';
    const outcome = (params.outcome ?? '0').toUpperCase();

    // Stage 1 + 2: Release air-whoosh (0.00s) + Pitch impact Seam Thud / Spin Crackle (0.34s)
    this.playPitchImpactSound(params.category, trait, {
      delaySec: 0.34,
      forceUnmute: params.forceUnmute,
    });

    if (this.settings.masterMuted) return;
    const ctx = this.initContext();
    if (!ctx) return;

    // Stage 3: Post-bounce resolution at batter crease / keeper (~0.62s)
    const scheduleResolution = () => {
      try {
        const contactAt = ctx.currentTime + 0.62;
        const baseVol = Math.max(0.4, this.settings.masterVolume * this.settings.effectsVolume);

        if (outcome === 'W') {
          if (!params.skipWicketResolution) {
            this.playStumpShatter({ delaySec: 0.62 });
          }
          return;
        }

        if (outcome === '4' || outcome === '6') {
          // Sweet willow bat crack
          const crackOsc = ctx.createOscillator();
          const crackGain = ctx.createGain();
          crackOsc.type = 'triangle';
          crackOsc.frequency.setValueAtTime(outcome === '6' ? 640 : 540, contactAt);
          crackOsc.frequency.exponentialRampToValueAtTime(135, contactAt + 0.095);
          crackGain.gain.setValueAtTime(baseVol * 0.64, contactAt);
          crackGain.gain.exponentialRampToValueAtTime(0.001, contactAt + 0.1);
          crackOsc.connect(crackGain);
          this.routeToOutput(crackGain);
          crackOsc.start(contactAt);
          crackOsc.stop(contactAt + 0.11);

          // Celebratory boundary chord
          const notes = outcome === '6' ? [523.25, 659.25, 783.99, 1046.5] : [493.88, 659.25, 880];
          notes.forEach((freq, idx) => {
            const nt = contactAt + 0.07 + idx * 0.065;
            const nOsc = ctx.createOscillator();
            const nGain = ctx.createGain();
            nOsc.type = 'sine';
            nOsc.frequency.setValueAtTime(freq, nt);
            nGain.gain.setValueAtTime(baseVol * 0.24, nt);
            nGain.gain.exponentialRampToValueAtTime(0.001, nt + 0.26);
            nOsc.connect(nGain);
            this.routeToOutput(nGain);
            nOsc.start(nt);
            nOsc.stop(nt + 0.28);
          });
          this.emitAcoustic(outcome === '6' ? 'SIX' : 'FOUR', 0.8);
          return;
        }

        if (outcome === '1' || outcome === '2' || outcome === '3') {
          // Crisp bat placement tap
          const tapOsc = ctx.createOscillator();
          const tapGain = ctx.createGain();
          tapOsc.type = 'triangle';
          tapOsc.frequency.setValueAtTime(470, contactAt);
          tapOsc.frequency.exponentialRampToValueAtTime(150, contactAt + 0.07);
          tapGain.gain.setValueAtTime(baseVol * 0.44, contactAt);
          tapGain.gain.exponentialRampToValueAtTime(0.001, contactAt + 0.075);
          tapOsc.connect(tapGain);
          this.routeToOutput(tapGain);
          tapOsc.start(contactAt);
          tapOsc.stop(contactAt + 0.08);
          return;
        }

        // Dot ball / Wide: Cushioned leather-into-keeper-gloves pop
        const popOsc = ctx.createOscillator();
        const popGain = ctx.createGain();
        popOsc.type = 'sine';
        popOsc.frequency.setValueAtTime(285, contactAt);
        popOsc.frequency.exponentialRampToValueAtTime(88, contactAt + 0.085);
        popGain.gain.setValueAtTime(baseVol * 0.42, contactAt);
        popGain.gain.exponentialRampToValueAtTime(0.001, contactAt + 0.09);
        popOsc.connect(popGain);
        this.routeToOutput(popGain);
        popOsc.start(contactAt);
        popOsc.stop(contactAt + 0.095);
      } catch {
        // Audio fallback
      }
    };

    if (ctx.state === 'suspended') {
      ctx.resume().then(scheduleResolution).catch(() => {});
    } else {
      scheduleResolution();
    }
  }

  public playFour() {
    if (!this.canPlay('FOUR')) return;
    this.initContext();
    if (!this.ctx) return;

    try {
      const vol = this.settings.masterVolume * this.settings.effectsVolume * 0.25;
      [440, 554, 659].forEach((freq, idx) => {
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        const startTime = this.ctx.currentTime + idx * 0.08;

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, startTime);
        gain.gain.setValueAtTime(vol, startTime);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.3);

        osc.connect(gain);
        this.routeToOutput(gain);
        osc.start(startTime);
        osc.stop(startTime + 0.32);
      });
      this.lockPriority('FOUR', 450);
      this.emitAcoustic('FOUR', 0.85);
    } catch {
      // Audio fallback
    }
  }

  public playSix() {
    if (!this.canPlay('SIX')) return;
    this.initContext();
    if (!this.ctx) return;

    try {
      const vol = this.settings.masterVolume * this.settings.effectsVolume * 0.32;
      // Rising glorious pitch with resonant crowd chime
      [392, 523.25, 659.25, 783.99, 1046.5].forEach((freq, idx) => {
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        const startTime = this.ctx.currentTime + idx * 0.07;

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, startTime);
        gain.gain.setValueAtTime(vol, startTime);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.45);

        osc.connect(gain);
        this.routeToOutput(gain);
        osc.start(startTime);
        osc.stop(startTime + 0.48);
      });
      this.lockPriority('SIX', 650);
      this.emitAcoustic('SIX', 1.0);
    } catch {
      // Audio fallback
    }
  }

  public playWicket() {
    if (!this.canPlay('WICKET')) return;
    this.initContext();
    if (!this.ctx) return;

    try {
      const vol = this.settings.masterVolume * this.settings.effectsVolume * 0.35;
      // Stumps timber crack & tactical alarm tone
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(260, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(55, this.ctx.currentTime + 0.4);

      gain.gain.setValueAtTime(vol, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.4);

      osc.connect(gain);
      this.routeToOutput(gain);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.42);
      this.lockPriority('WICKET', 800);
      this.emitAcoustic('WICKET', 0.95);
    } catch {
      // Audio fallback
    }
  }

  // --- TENSE FINAL OVER ACOUSTIC DRONE ---
  public startTenseOverHum(intensity: number = 0.5) {
    if (this.settings.masterMuted) return;
    this.initContext();
    if (!this.ctx) return;

    try {
      if (this.tenseHumOsc) return; // already active

      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const targetVol = Math.min(0.25, 0.08 * intensity * this.settings.masterVolume * this.settings.crowdVolume);

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(54, this.ctx.currentTime); // 54Hz deep sub bass tension
      
      gain.gain.setValueAtTime(0.0001, this.ctx.currentTime);
      gain.gain.linearRampToValueAtTime(targetVol, this.ctx.currentTime + 0.6);

      osc.connect(gain);
      this.routeToOutput(gain);
      osc.start();

      this.tenseHumOsc = osc;
      this.tenseHumGain = gain;
      this.emitAcoustic('TENSE', intensity);
    } catch {
      // audio fallback
    }
  }

  public stopTenseOverHum() {
    if (!this.tenseHumOsc || !this.tenseHumGain || !this.ctx) return;
    try {
      const g = this.tenseHumGain;
      const o = this.tenseHumOsc;
      g.gain.linearRampToValueAtTime(0.0001, this.ctx.currentTime + 0.5);
      setTimeout(() => {
        try {
          o.stop();
          o.disconnect();
          g.disconnect();
        } catch {}
      }, 550);
    } catch {}
    this.tenseHumOsc = null;
    this.tenseHumGain = null;
  }

  public playMilestoneFifty() {
    if (!this.canPlay('CENTURY')) return;
    this.initContext();
    if (!this.ctx) return;

    try {
      const vol = this.settings.masterVolume * this.settings.effectsVolume * 0.3;
      [523.25, 659.25, 783.99, 1046.5].forEach((freq, idx) => {
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        const startTime = this.ctx.currentTime + idx * 0.09;
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, startTime);
        gain.gain.setValueAtTime(vol, startTime);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.5);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(startTime);
        osc.stop(startTime + 0.52);
      });
      this.lockPriority('CENTURY', 900);
    } catch {
      // Audio fallback
    }
  }

  public playVictory() {
    if (!this.canPlay('VICTORY')) return;
    this.initContext();
    if (!this.ctx) return;

    try {
      const vol = this.settings.masterVolume * this.settings.effectsVolume * 0.35;
      const chords = [523.25, 659.25, 783.99, 1046.5, 1318.5]; // C Major triumph
      chords.forEach((freq, idx) => {
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        const startTime = this.ctx.currentTime + idx * 0.14;

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, startTime);
        gain.gain.setValueAtTime(vol, startTime);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.7);

        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(startTime);
        osc.stop(startTime + 0.75);
      });
      this.lockPriority('VICTORY', 2000);
    } catch {
      // Audio fallback
    }
  }

  public playTossCoin() {
    if (!this.canPlay('UI')) return;
    this.initContext();
    if (!this.ctx) return;

    try {
      [900, 1100, 1300, 1100, 950].forEach((freq, idx) => {
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        const startTime = this.ctx.currentTime + idx * 0.05;
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, startTime);
        gain.gain.setValueAtTime(0.12, startTime);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.06);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(startTime);
        osc.stop(startTime + 0.07);
      });
    } catch {
      // Audio fallback
    }
  }

  public playDrsTone() {
    if (!this.canPlay('COMMENTARY')) return;
    this.initContext();
    if (!this.ctx) return;

    try {
      [800, 1000, 1200].forEach((freq, idx) => {
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        const startTime = this.ctx.currentTime + idx * 0.08;
        osc.type = 'square';
        osc.frequency.setValueAtTime(freq, startTime);
        gain.gain.setValueAtTime(0.08, startTime);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.06);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(startTime);
        osc.stop(startTime + 0.07);
      });
    } catch {
      // Audio fallback
    }
  }

  public playDrsScan() {
    this.playDrsTone();
  }

  // --- DELEGATIONS TO NEW AUDIOMANAGER SERVICE ---
  public playSixRoar(crowdSize = 80000) {
    audioManagerService.playSixRoar(crowdSize);
  }

  public playCloseCallGasp(context = 'Play & Miss') {
    audioManagerService.playCloseCallGasp(context);
  }

  public startDeathOversMusic(options?: { tempoBpm?: number; intensity?: number }) {
    audioManagerService.startDeathOversMusic(options);
  }

  public stopDeathOversMusic(fadeMs?: number) {
    audioManagerService.stopDeathOversMusic(fadeMs);
  }

  public isDeathOversMusicPlaying(): boolean {
    return audioManagerService.isDeathOversMusicPlaying();
  }

  public speakAiCommentary(phrase: string, options?: { rate?: number; pitch?: number; mood?: 'excited' | 'intense' | 'technical' }) {
    audioManagerService.speakAiCommentary(phrase, options);
  }

  public announceBallEvent(event: { runsScored: number; isWicket: boolean; shot?: string; bowlerName?: string; strikerName?: string }) {
    audioManagerService.announceBallEvent(event);
  }

  public playDrsHeartbeat() {
    audioManagerService.playDrsHeartbeat();
  }

  public startDrsHeartbeatLoop() {
    audioManagerService.startDrsHeartbeatLoop();
  }

  public stopDrsHeartbeatLoop() {
    audioManagerService.stopDrsHeartbeatLoop();
  }

  public playDrsUltraEdgeSpike(isSpike = true) {
    audioManagerService.playDrsUltraEdgeSpike(isSpike);
  }

  public playDrsBallTrackingRadar() {
    audioManagerService.playDrsBallTrackingRadar();
  }

  public playDrsRadioComms(phrase?: string) {
    audioManagerService.playDrsRadioComms(phrase);
  }

  public playDrsDecisionReveal(isOut: boolean) {
    audioManagerService.playDrsDecisionReveal(isOut);
  }

  // Alias helpers for compatibility
  public isEnabled(): boolean {
    return !this.settings.masterMuted;
  }
  public toggleSound(): boolean {
    return this.toggleMute();
  }
  public playBoundary() {
    this.playFour();
  }
}

import { audioManager as audioManagerService, AudioManagerService } from '../services/AudioManager';

export const cricketAudio = new CentralizedAudioManager();
export { audioManagerService as audioManager, AudioManagerService as AudioManager };

