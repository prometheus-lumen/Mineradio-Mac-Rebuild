function playMineradioIntroSound(): void {
  if (splashSoundPlayed) return;
  try {
    var AudioContextApi = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextApi) return;
    var context = splashAudioCtx || new AudioContextApi();
    splashAudioCtx = context;
    if (context.state === 'suspended') {
      void context.resume().then(function(): void {
        if (!splashSoundPlayed) playMineradioIntroSound();
      }).catch(function(): void {});
      if (context.state === 'suspended') return;
    }
    splashSoundPlayed = true;
    buildSplashSound(context);
  } catch (error) {}
}

function buildSplashSound(context: AudioContext): void {
  var start = context.currentTime + 0.02;
  var master = context.createGain();
  master.gain.setValueAtTime(0.0001, start);
  master.gain.exponentialRampToValueAtTime(0.062, start + 0.16);
  master.gain.exponentialRampToValueAtTime(0.040, start + 3.35);
  master.gain.exponentialRampToValueAtTime(0.0001, start + 5.28);
  master.connect(context.destination);
  createSplashNoise(context, master, start);
  createSplashLowTone(context, master, start);
  createSplashSoftTone(context, master, start, 'triangle', 440, 660, 1.05, 0.72, 0.018);
  createSplashSoftTone(context, master, start, 'sine', 880, 1320, 2.10, 0.86, 0.013);
  createSplashSoftTone(context, master, start, 'triangle', 1180, 1760, 2.72, 0.52, 0.010);
  createSplashSoftTone(context, master, start, 'triangle', 660, 1180, 3.32, 0.82, 0.014);
  createSplashSoftTone(context, master, start, 'sine', 1760, 1040, 3.64, 0.46, 0.010);
}

function createSplashNoise(context: AudioContext, master: GainNode, start: number): void {
  var buffer = context.createBuffer(1, Math.floor(context.sampleRate * 2.45), context.sampleRate);
  var samples = buffer.getChannelData(0);
  for (var index = 0; index < samples.length; index++) {
    samples[index] = (Math.random() * 2 - 1) * Math.pow(1 - index / samples.length, 1.35);
  }
  var noise = context.createBufferSource();
  var gain = context.createGain();
  var filter = context.createBiquadFilter();
  noise.buffer = buffer;
  filter.type = 'bandpass';
  filter.frequency.setValueAtTime(720, start);
  filter.frequency.exponentialRampToValueAtTime(2400, start + 2.2);
  filter.Q.setValueAtTime(0.72, start);
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(0.020, start + 0.12);
  gain.gain.exponentialRampToValueAtTime(0.010, start + 1.60);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + 2.42);
  noise.connect(filter);
  filter.connect(gain);
  gain.connect(master);
  noise.start(start);
  noise.stop(start + 2.46);
}

function createSplashLowTone(context: AudioContext, master: GainNode, start: number): void {
  var oscillator = context.createOscillator();
  var gain = context.createGain();
  oscillator.type = 'sine';
  oscillator.frequency.setValueAtTime(86, start + 0.18);
  oscillator.frequency.exponentialRampToValueAtTime(43, start + 1.18);
  gain.gain.setValueAtTime(0.0001, start + 0.12);
  gain.gain.exponentialRampToValueAtTime(0.032, start + 0.30);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + 1.34);
  oscillator.connect(gain);
  gain.connect(master);
  oscillator.start(start + 0.12);
  oscillator.stop(start + 1.40);
}

function createSplashSoftTone(
  context: AudioContext, master: GainNode, start: number, type: OscillatorType,
  from: number, to: number, offset: number, duration: number, peak: number
): void {
  var oscillator = context.createOscillator();
  var gain = context.createGain();
  var filter = context.createBiquadFilter();
  oscillator.type = type;
  oscillator.frequency.setValueAtTime(from, start + offset);
  oscillator.frequency.exponentialRampToValueAtTime(to, start + offset + duration * 0.72);
  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(3400, start + offset);
  gain.gain.setValueAtTime(0.0001, start + offset);
  gain.gain.exponentialRampToValueAtTime(peak, start + offset + 0.08);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + offset + duration);
  oscillator.connect(filter);
  filter.connect(gain);
  gain.connect(master);
  oscillator.start(start + offset);
  oscillator.stop(start + offset + duration + 0.04);
}

function armSplashSoundFallback(): void {
  if (splashSoundFallbackArmed) return;
  splashSoundFallbackArmed = true;
  function unlock(): void {
    if (!splashSoundPlayed) playMineradioIntroSound();
    document.removeEventListener('pointerdown', unlock, true);
    document.removeEventListener('keydown', unlock, true);
  }
  document.addEventListener('pointerdown', unlock, true);
  document.addEventListener('keydown', unlock, true);
}
