import { Howl, Howler } from 'howler';

// ===== Volume categories =====
export interface VolumeSettings {
  master: number;   // 0-1
  sfx: number;      // 0-1
  music: number;    // 0-1
  ambient: number;  // 0-1
  ui: number;       // 0-1
}

const DEFAULT_VOLUMES: VolumeSettings = {
  master: 0.8,
  sfx: 1.0,
  music: 0.4,
  ambient: 0.5,
  ui: 0.7,
};

// ===== Procedural sound via Web Audio API =====
// Since we don't have audio files, generate them programmatically
function getAudioContext(): AudioContext {
  // Howler exposes the AudioContext
  const ctx = Howler.ctx;
  if (!ctx) throw new Error('AudioContext not available');
  return ctx;
}

function createNoiseBuffer(ctx: AudioContext, duration: number, type: 'white' | 'pink' = 'white'): AudioBuffer {
  const sampleRate = ctx.sampleRate;
  const length = Math.floor(sampleRate * duration);
  const buffer = ctx.createBuffer(1, length, sampleRate);
  const data = buffer.getChannelData(0);
  if (type === 'white') {
    for (let i = 0; i < length; i++) data[i] = Math.random() * 2 - 1;
  } else {
    // Pink noise approximation
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
    for (let i = 0; i < length; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + white * 0.0555179; b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.96900 * b2 + white * 0.1538520; b3 = 0.86650 * b3 + white * 0.3104856;
      b4 = 0.55000 * b4 + white * 0.5329522; b5 = -0.7616 * b5 - white * 0.0168980;
      data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11;
      b6 = white * 0.115926;
    }
  }
  return buffer;
}

// ===== Procedural gunshot =====
function playGunshot(ctx: AudioContext, volume: number, pan = 0) {
  const now = ctx.currentTime;

  // Layer 1: Low-freq boom (body)
  const osc = ctx.createOscillator();
  const oscGain = ctx.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(150, now);
  osc.frequency.exponentialRampToValueAtTime(30, now + 0.15);
  oscGain.gain.setValueAtTime(volume * 0.7, now);
  oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

  // Layer 2: Noise burst (crack)
  const noiseBuffer = createNoiseBuffer(ctx, 0.08);
  const noise = ctx.createBufferSource();
  noise.buffer = noiseBuffer;
  const noiseGain = ctx.createGain();
  const noiseFilter = ctx.createBiquadFilter();
  noiseFilter.type = 'bandpass';
  noiseFilter.frequency.value = 3000;
  noiseFilter.Q.value = 0.7;
  noiseGain.gain.setValueAtTime(volume * 0.5, now);
  noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

  // Layer 3: Tail/reverb
  const tailBuffer = createNoiseBuffer(ctx, 0.3, 'pink');
  const tail = ctx.createBufferSource();
  tail.buffer = tailBuffer;
  const tailGain = ctx.createGain();
  const tailFilter = ctx.createBiquadFilter();
  tailFilter.type = 'lowpass';
  tailFilter.frequency.value = 1200;
  tailGain.gain.setValueAtTime(volume * 0.15, now + 0.02);
  tailGain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

  // Stereo panner
  const panner = ctx.createStereoPanner();
  panner.pan.value = Math.max(-1, Math.min(1, pan));

  // Connect
  osc.connect(oscGain).connect(panner).connect(ctx.destination);
  noise.connect(noiseFilter).connect(noiseGain).connect(panner);
  tail.connect(tailFilter).connect(tailGain).connect(panner);

  osc.start(now); osc.stop(now + 0.25);
  noise.start(now); noise.stop(now + 0.08);
  tail.start(now); tail.stop(now + 0.4);
}

// ===== Procedural impact =====
function playImpact(ctx: AudioContext, volume: number, isCrit: boolean) {
  const now = ctx.currentTime;
  const freq = isCrit ? 200 : 120;
  const dur = isCrit ? 0.15 : 0.1;

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'triangle';
  osc.frequency.setValueAtTime(freq, now);
  osc.frequency.exponentialRampToValueAtTime(40, now + dur);
  gain.gain.setValueAtTime(volume * 0.4, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + dur);

  const noise = ctx.createBufferSource();
  noise.buffer = createNoiseBuffer(ctx, 0.05);
  const noiseGain = ctx.createGain();
  const filter = ctx.createBiquadFilter();
  filter.type = 'highpass';
  filter.frequency.value = isCrit ? 4000 : 2000;
  noiseGain.gain.setValueAtTime(volume * 0.3, now);
  noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);

  osc.connect(gain).connect(ctx.destination);
  noise.connect(filter).connect(noiseGain).connect(ctx.destination);
  osc.start(now); osc.stop(now + dur + 0.01);
  noise.start(now); noise.stop(now + 0.06);
}

// ===== Procedural footstep =====
function playFootstep(ctx: AudioContext, volume: number) {
  const now = ctx.currentTime;

  const noise = ctx.createBufferSource();
  noise.buffer = createNoiseBuffer(ctx, 0.06);
  const gain = ctx.createGain();
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = 800 + Math.random() * 400;
  gain.gain.setValueAtTime(volume * 0.15, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

  // Sub thud
  const osc = ctx.createOscillator();
  const oscGain = ctx.createGain();
  osc.type = 'sine';
  osc.frequency.value = 60 + Math.random() * 20;
  oscGain.gain.setValueAtTime(volume * 0.08, now);
  oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);

  noise.connect(filter).connect(gain).connect(ctx.destination);
  osc.connect(oscGain).connect(ctx.destination);
  noise.start(now); noise.stop(now + 0.06);
  osc.start(now); osc.stop(now + 0.08);
}

// ===== Procedural UI click =====
function playUIClick(ctx: AudioContext, volume: number) {
  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(1200, now);
  osc.frequency.exponentialRampToValueAtTime(800, now + 0.03);
  gain.gain.setValueAtTime(volume * 0.15, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);
  osc.connect(gain).connect(ctx.destination);
  osc.start(now); osc.stop(now + 0.05);
}

// ===== Procedural death sound =====
function playDeath(ctx: AudioContext, volume: number) {
  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(300, now);
  osc.frequency.exponentialRampToValueAtTime(40, now + 0.5);
  gain.gain.setValueAtTime(volume * 0.3, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);

  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(2000, now);
  filter.frequency.exponentialRampToValueAtTime(200, now + 0.5);

  osc.connect(filter).connect(gain).connect(ctx.destination);
  osc.start(now); osc.stop(now + 0.55);
}

// ===== Ambient drone =====
let ambientOsc: OscillatorNode | null = null;
let ambientGain: GainNode | null = null;
let ambientNoise: AudioBufferSourceNode | null = null;
let ambientNoiseGain: GainNode | null = null;

function startAmbient(ctx: AudioContext, volume: number) {
  if (ambientOsc) return;

  // Low drone
  ambientOsc = ctx.createOscillator();
  ambientGain = ctx.createGain();
  ambientOsc.type = 'sine';
  ambientOsc.frequency.value = 55;
  ambientGain.gain.value = volume * 0.04;
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = 200;
  ambientOsc.connect(filter).connect(ambientGain).connect(ctx.destination);
  ambientOsc.start();

  // Wind noise
  const windBuffer = createNoiseBuffer(ctx, 4, 'pink');
  ambientNoise = ctx.createBufferSource();
  ambientNoise.buffer = windBuffer;
  ambientNoise.loop = true;
  ambientNoiseGain = ctx.createGain();
  ambientNoiseGain.gain.value = volume * 0.02;
  const windFilter = ctx.createBiquadFilter();
  windFilter.type = 'bandpass';
  windFilter.frequency.value = 400;
  windFilter.Q.value = 0.3;
  ambientNoise.connect(windFilter).connect(ambientNoiseGain).connect(ctx.destination);
  ambientNoise.start();
}

function stopAmbient() {
  if (ambientOsc) { ambientOsc.stop(); ambientOsc = null; }
  if (ambientNoise) { ambientNoise.stop(); ambientNoise = null; }
  ambientGain = null;
  ambientNoiseGain = null;
}

function updateAmbientVolume(volume: number) {
  if (ambientGain) ambientGain.gain.value = volume * 0.04;
  if (ambientNoiseGain) ambientNoiseGain.gain.value = volume * 0.02;
}

// ===== Audio Manager =====
class AudioManager {
  private volumes: VolumeSettings = { ...DEFAULT_VOLUMES };
  private initialized = false;
  private footstepTimer = 0;

  init() {
    if (this.initialized) return;
    // Ensure AudioContext is resumed (browser requires user gesture)
    if (Howler.ctx && Howler.ctx.state === 'suspended') {
      Howler.ctx.resume();
    }
    this.initialized = true;
  }

  private getEffectiveVolume(category: keyof Omit<VolumeSettings, 'master'>): number {
    return this.volumes.master * this.volumes[category];
  }

  // ===== Public API =====

  setVolume(category: keyof VolumeSettings, value: number) {
    this.volumes[category] = Math.max(0, Math.min(1, value));
    Howler.volume(this.volumes.master);
    if (category === 'ambient' || category === 'master') {
      updateAmbientVolume(this.getEffectiveVolume('ambient'));
    }
  }

  getVolumes(): VolumeSettings { return { ...this.volumes }; }

  // --- Sound triggers ---

  playGunshot(pan = 0) {
    if (!this.initialized) return;
    try {
      const ctx = getAudioContext();
      playGunshot(ctx, this.getEffectiveVolume('sfx'), pan);
    } catch { /* no audio context yet */ }
  }

  playImpact(isCrit = false) {
    if (!this.initialized) return;
    try {
      const ctx = getAudioContext();
      playImpact(ctx, this.getEffectiveVolume('sfx'), isCrit);
    } catch {}
  }

  playFootstep() {
    if (!this.initialized) return;
    try {
      const ctx = getAudioContext();
      playFootstep(ctx, this.getEffectiveVolume('sfx'));
    } catch {}
  }

  playDeath() {
    if (!this.initialized) return;
    try {
      const ctx = getAudioContext();
      playDeath(ctx, this.getEffectiveVolume('sfx'));
    } catch {}
  }

  playUIClick() {
    if (!this.initialized) return;
    try {
      const ctx = getAudioContext();
      playUIClick(ctx, this.getEffectiveVolume('ui'));
    } catch {}
  }

  startAmbient() {
    if (!this.initialized) return;
    try {
      const ctx = getAudioContext();
      startAmbient(ctx, this.getEffectiveVolume('ambient'));
    } catch {}
  }

  stopAmbient() { stopAmbient(); }

  // Called every frame with movement speed (0 = idle)
  updateFootsteps(dt: number, moveSpeed: number, isSprinting: boolean) {
    if (moveSpeed < 0.5) { this.footstepTimer = 0; return; }
    const interval = isSprinting ? 0.28 : 0.4;
    this.footstepTimer += dt;
    if (this.footstepTimer >= interval) {
      this.footstepTimer -= interval;
      this.playFootstep();
    }
  }
}

// Singleton
export const audioManager = new AudioManager();
