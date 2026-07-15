function playShelfSelectTick(direction: number, variant?: 'row' | 'card'): void {
  const now = performance.now();
  const minimumGap = variant === 'row' ? 36 : 42;
  if (now - lastShelfSelectSfxAt < minimumGap) return;
  const context = ensureUiSfxContext();
  if (!context) return;
  lastShelfSelectSfxAt = now;
  const pitch = direction < 0 ? 0.965 : 1.035;
  const rowScale = variant === 'row' ? 0.74 : 1;
  const volumeScale = 0.38 + clampRange(targetVolume ?? 0.65, 0, 1) * 0.62;
  const startTime = context.currentTime + 0.002;
  const output = context.createGain();
  output.gain.setValueAtTime(0.0001, startTime);
  output.gain.linearRampToValueAtTime(0.058 * rowScale * volumeScale, startTime + 0.002);
  output.gain.exponentialRampToValueAtTime(0.0001, startTime + 0.082);
  output.connect(context.destination);
  addShelfNoiseClick(context, output, startTime, pitch);
  addShelfToneClick(context, output, startTime, pitch, 'triangle', 720, 0, 0.030, 0.18, 0.70);
  addShelfToneClick(context, output, startTime, pitch, 'square', 2180, 0.004, 0.022, 0.30, 0.86);
  addShelfToneClick(context, output, startTime, pitch, 'triangle', 4200, 0.011, 0.018, 0.18, 0.94);
  addShelfToneClick(context, output, startTime, pitch, 'square', 7100, 0.018, 0.012, 0.070, 0.98);
  window.setTimeout(() => {
    try { output.disconnect(); } catch (error) {}
  }, 160);
}

function addShelfNoiseClick(
  context: AudioContext,
  output: GainNode,
  startTime: number,
  pitch: number
): void {
  const sampleRate = context.sampleRate || 44_100;
  const length = Math.max(1, Math.floor(sampleRate * 0.034));
  const buffer = context.createBuffer(1, length, sampleRate);
  const data = buffer.getChannelData(0);
  for (let index = 0; index < length; index += 1) {
    data[index] = (Math.random() * 2 - 1) * Math.pow(1 - index / length, 4.2);
  }
  const noise = context.createBufferSource();
  noise.buffer = buffer;
  const highPass = context.createBiquadFilter();
  highPass.type = 'highpass';
  highPass.frequency.setValueAtTime(4200 * pitch, startTime);
  const bandPass = context.createBiquadFilter();
  bandPass.type = 'bandpass';
  bandPass.frequency.setValueAtTime(8400 * pitch, startTime);
  bandPass.Q.setValueAtTime(7.2, startTime);
  const gain = context.createGain();
  gain.gain.setValueAtTime(0.56, startTime);
  noise.connect(highPass).connect(bandPass).connect(gain).connect(output);
  noise.start(startTime);
  noise.stop(startTime + 0.040);
}

function addShelfToneClick(
  context: AudioContext,
  output: GainNode,
  baseTime: number,
  pitch: number,
  type: OscillatorType,
  frequency: number,
  delay: number,
  duration: number,
  gainValue: number,
  bend: number
): void {
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  const start = baseTime + delay;
  const end = start + duration;
  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency * pitch, start);
  oscillator.frequency.exponentialRampToValueAtTime(frequency * pitch * bend, end);
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.linearRampToValueAtTime(gainValue, start + 0.002);
  gain.gain.exponentialRampToValueAtTime(0.0001, end);
  oscillator.connect(gain).connect(output);
  oscillator.start(start);
  oscillator.stop(end + 0.004);
}
