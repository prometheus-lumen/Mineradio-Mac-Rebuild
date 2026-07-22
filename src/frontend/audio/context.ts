// Mineradio classic module: audio/audio-context.
const AUDIO_EFFECTS_STORE_KEY = 'mineradio.audio-effects.v1';
const AUDIO_EQ_FREQUENCIES = [60, 120, 250, 500, 1000, 2000, 4000, 8000];
const AUDIO_EQ_PRESETS: Record<string, number[]> = {
  '原声': [0, 0, 0, 0, 0, 0, 0, 0],
  '低音': [6, 5, 3, 1, 0, -1, -1, 0],
  '人声': [-2, -1, 0, 2, 4, 4, 2, 0],
  '明亮': [-1, -1, 0, 1, 2, 4, 5, 5],
  '夜间': [2, 2, 1, 0, -1, -1, 0, 1],
  '电影': [5, 3, 0, -1, 1, 3, 4, 3],
  'Chill': [3, 2, 0, -1, 0, 2, 3, 2],
  'Live': [2, 1, -1, 0, 3, 4, 3, 2],
  '心动声境': [5, 3, 0, -1, 1, 3, 5, 4],
  'Lo-fi': [2, 3, 2, 0, -1, -2, -4, -6],
  'Air': [-2, -1, 0, 0, 1, 3, 5, 6],
  'Focus': [-3, -2, -1, 1, 3, 4, 2, 0]
};
let preampNode: GainNode | null = null;
let eqNodes: BiquadFilterNode[] = [];
let limiterNode: DynamicsCompressorNode | null = null;
let audioEffectSettings = readAudioEffectSettings();

function readAudioEffectSettings(): AudioEffectSettings {
  var fallback: AudioEffectSettings = { enabled: false, preset: '原声', preamp: 0, bands: AUDIO_EQ_FREQUENCIES.map(function(){ return 0; }), outputDeviceId: '' };
  try {
    var saved = JSON.parse(localStorage.getItem(AUDIO_EFFECTS_STORE_KEY) || '{}');
    return {
      enabled: !!saved.enabled,
      preset: typeof saved.preset === 'string' ? saved.preset : fallback.preset,
      preamp: clampRange(Number(saved.preamp) || 0, -12, 12),
      bands: AUDIO_EQ_FREQUENCIES.map(function(_, index){ return clampRange(Number(saved.bands?.[index]) || 0, -12, 12); }),
      outputDeviceId: typeof saved.outputDeviceId === 'string' ? saved.outputDeviceId : ''
    };
  } catch (error) { return fallback; }
}

function saveAudioEffectSettings(): void {
  try { localStorage.setItem(AUDIO_EFFECTS_STORE_KEY, JSON.stringify(audioEffectSettings)); } catch (error) {}
}

function decibelsToGain(value: number): number { return Math.pow(10, value / 20); }

function applyAudioEffectSettings(): void {
  var now = audioCtx?.currentTime || 0;
  if (preampNode) preampNode.gain.setTargetAtTime(audioEffectSettings.enabled ? decibelsToGain(audioEffectSettings.preamp) : 1, now, .018);
  eqNodes.forEach(function(node, index){ node.gain.setTargetAtTime(audioEffectSettings.enabled ? audioEffectSettings.bands[index] : 0, now, .018); });
  updateAudioEffectUi();
}
function readSavedVolume(): number {
  try {
    var v = parseFloat(localStorage.getItem('apex-player-volume') || '');
    return isFinite(v) ? Math.max(0, Math.min(1, v)) : 1.0;
  } catch (e) {
    return 1.0;
  }
}

// ============================================================
//  音频上下文 & 频谱分析
// ============================================================
function initAudio(): void {
  if (audioReady) return;
  var AudioContextCtor = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextCtor || !audio) throw new Error('Web Audio is unavailable');
  audioCtx = new AudioContextCtor();
  source = audioCtx.createMediaElementSource(audio);
  analyser = audioCtx.createAnalyser();
  beatAnalyser = audioCtx.createAnalyser();
  gainNode = audioCtx.createGain();
  preampNode = audioCtx.createGain();
  eqNodes = AUDIO_EQ_FREQUENCIES.map(function(frequency, index){
    var node = audioCtx!.createBiquadFilter();
    node.type = index === 0 ? 'lowshelf' : (index === AUDIO_EQ_FREQUENCIES.length - 1 ? 'highshelf' : 'peaking');
    node.frequency.value = frequency;
    node.Q.value = 1.1;
    return node;
  });
  limiterNode = audioCtx.createDynamicsCompressor();
  limiterNode.threshold.value = -1;
  limiterNode.knee.value = 0;
  limiterNode.ratio.value = 20;
  limiterNode.attack.value = .003;
  limiterNode.release.value = .12;
  analyser.fftSize = FFT_SIZE;
  analyser.smoothingTimeConstant = 0.58;
  beatAnalyser.fftSize = BEAT_FFT_SIZE;
  beatAnalyser.smoothingTimeConstant = 0.10;
  source.connect(preampNode);
  var tail: AudioNode = preampNode;
  eqNodes.forEach(function(node){ tail.connect(node); tail = node; });
  tail.connect(limiterNode);
  limiterNode.connect(analyser);
  limiterNode.connect(beatAnalyser);
  analyser.connect(gainNode);
  gainNode.connect(audioCtx.destination);
  applyAudioEffectSettings();
  void applyAudioOutputDevice(audioEffectSettings.outputDeviceId, true);
  applyVolumeToAudio();
  frequencyData.fill(0);
  beatFrequencyData.fill(0);
  beatTimeDomainData.fill(128);
  resetRealtimeBeatEngine();
  audioReady = true;
  void refreshAudioOutputDevices();
}

function resumeAudioAnalysis(): Promise<void> {
  if (audioCtx && audioCtx.state === 'suspended') return audioCtx.resume().catch(function(e){ console.warn('audio context resume failed:', e); });
  return Promise.resolve();
}

function ensureUiSfxContext(): AudioContext | null {
  var AudioContextCtor = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextCtor) return null;
  if (!uiSfxCtx || uiSfxCtx.state === 'closed') uiSfxCtx = new AudioContextCtor();
  if (uiSfxCtx.state === 'suspended' && uiSfxCtx.resume) uiSfxCtx.resume().catch(function(){});
  return uiSfxCtx;
}

function clearAudioFadeTimers(): void {
  if (audioFadeTimer) {
    clearTimeout(audioFadeTimer);
    audioFadeTimer = null;
  }
  if (audioElementFadeFrame) {
    cancelAnimationFrame(audioElementFadeFrame);
    audioElementFadeFrame = 0;
  }
}

function currentAudioOutputGain(): number {
  if (gainNode && gainNode.gain && isFinite(gainNode.gain.value)) return clampRange(Number(gainNode.gain.value), 0, 1);
  if (audio && isFinite(audio.volume)) return clampRange(Number(audio.volume), 0, 1);
  return clampRange(targetVolume, 0, 1);
}

function normalizeAudioFadeTarget(value: unknown): number {
  var normalized = clampRange(Number(value) || 0, 0, 1);
  return normalized <= 0.001 ? audioSilentFloor() : normalized;
}

function holdAudioOutputGain(now: number): number {
  var current = currentAudioOutputGain();
  if (!gainNode || !audioCtx || !gainNode.gain) return current;
  var param = gainNode.gain;
  try {
    if (typeof param.cancelAndHoldAtTime === 'function') {
      param.cancelAndHoldAtTime(now);
      return currentAudioOutputGain();
    }
    param.cancelScheduledValues(now);
    param.setValueAtTime(current, now);
  } catch (e) {
    try {
      param.cancelScheduledValues(now);
      param.setValueAtTime(current, now);
    } catch (_) {}
  }
  return current;
}

function setAudioOutputGainImmediate(value: unknown): void {
  var target = normalizeAudioFadeTarget(value);
  clearAudioFadeTimers();
  if (gainNode && audioCtx) {
    var now = audioCtx.currentTime || 0;
    gainNode.gain.cancelScheduledValues(now);
    gainNode.gain.setValueAtTime(target, now);
  } else if (audio) {
    audio.volume = target;
  }
}

function rampAudioOutputGain(value: unknown, durationMs: unknown): void {
  var target = normalizeAudioFadeTarget(value);
  var duration = Math.max(0, Number(durationMs) || 0);
  clearAudioFadeTimers();
  var serial = audioFadeSerial;
  if (gainNode && audioCtx) {
    var now = audioCtx.currentTime || 0;
    holdAudioOutputGain(now);
    if (duration <= 0) {
      gainNode.gain.setValueAtTime(target, now);
      return;
    }
    gainNode.gain.linearRampToValueAtTime(target, now + duration / 1000);
    return;
  }
  if (!audio) return;
  var from = currentAudioOutputGain();
  var started = performance.now();
  function tickAudioFade(nowMs: number): void {
    if (serial !== audioFadeSerial || !audio) return;
    var t = duration ? clampRange((nowMs - started) / duration, 0, 1) : 1;
    var eased = 1 - Math.pow(1 - t, 3);
    audio.volume = from + (target - from) * eased;
    if (t < 1) audioElementFadeFrame = requestAnimationFrame(tickAudioFade);
    else audioElementFadeFrame = 0;
  }
  audioElementFadeFrame = requestAnimationFrame(tickAudioFade);
}

function applyVolumeToAudio(): void {
  if (audio) {
    audio.muted = false;
    audio.volume = gainNode ? 1 : targetVolume;
  }
  if (gainNode && audioCtx) {
    var now = audioCtx.currentTime || 0;
    gainNode.gain.cancelScheduledValues(now);
    gainNode.gain.setTargetAtTime(targetVolume, now, 0.025);
  }
}

function updateVolumeUi(): void {
  const slider = document.getElementById('volume-slider') as HTMLInputElement | null;
  var value = document.getElementById('volume-value');
  var icon = document.getElementById('volume-icon');
  var wrap = document.getElementById('volume-control');
  var pct = Math.round(targetVolume * 100);
  if (slider && Math.abs(parseFloat(slider.value) - targetVolume) > 0.001) slider.value = String(targetVolume);
  if (value) value.textContent = pct + '%';
  if (wrap) wrap.classList.toggle('muted', targetVolume <= 0.01);
  if (icon) {
    icon.innerHTML = targetVolume <= 0.01
      ? '<polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><line x1="17" y1="9" x2="22" y2="14"/><line x1="22" y1="9" x2="17" y2="14"/>'
      : targetVolume < 0.45
        ? '<polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15 10.5a2 2 0 0 1 0 3"/>'
        : '<polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15 9.5a4 4 0 0 1 0 5"/><path d="M18 7a7 7 0 0 1 0 10"/>';
  }
}

function setVolume(value: unknown, silent = false): void {
  var next = Math.max(0, Math.min(1, Number(value) || 0));
  targetVolume = next;
  if (next > 0.01) lastNonZeroVolume = next;
  try { localStorage.setItem('apex-player-volume', String(next)); } catch (e) {}
  applyVolumeToAudio();
  updateVolumeUi();
  if (!silent) showToast('音量 ' + Math.round(next * 100) + '%');
}

function adjustVolumeByKeyboard(delta: unknown): void {
  var step = Number(delta) || 0;
  if (!step) return;
  setVolume(clampRange(targetVolume + step, 0, 1), false);
}

function toggleVolumePanel(e?: Event): void {
  if (e) e.stopPropagation();
  var wrap = document.getElementById('volume-control');
  if (volumeCloseTimer) { clearTimeout(volumeCloseTimer); volumeCloseTimer = null; }
  if (wrap) wrap.classList.toggle('open');
}

function toggleMute(): void {
  setVolume(targetVolume > 0.01 ? 0 : (lastNonZeroVolume || 0.8));
}

function bindVolumeControls(): void {
  const slider = document.getElementById('volume-slider') as HTMLInputElement | null;
  var btn = document.getElementById('volume-btn');
  var wrap = document.getElementById('volume-control');
  function keepVolumePanelOpen(): void {
    if (volumeCloseTimer) { clearTimeout(volumeCloseTimer); volumeCloseTimer = null; }
    if (wrap) wrap.classList.add('open');
  }
  function closeVolumePanelSoon(): void {
    if (volumeCloseTimer) clearTimeout(volumeCloseTimer);
    volumeCloseTimer = setTimeout(function(){
      volumeCloseTimer = null;
      if (wrap) wrap.classList.remove('open');
    }, 520);
  }
  if (wrap) {
    wrap.addEventListener('mouseenter', keepVolumePanelOpen);
    wrap.addEventListener('mouseleave', closeVolumePanelSoon);
  }
  if (slider) {
    slider.addEventListener('input', function(){ setVolume(slider.value, true); });
    slider.addEventListener('focus', keepVolumePanelOpen);
    slider.addEventListener('blur', closeVolumePanelSoon);
    slider.addEventListener('change', function(){ showToast('音量 ' + Math.round(targetVolume * 100) + '%'); });
  }
  if (btn) {
    btn.addEventListener('dblclick', function(e: MouseEvent){ e.stopPropagation(); toggleMute(); });
  }
  document.addEventListener('click', function(e: MouseEvent){
    if (!wrap) return;
    if (!wrap.contains(e.target as Node)) {
      if (volumeCloseTimer) { clearTimeout(volumeCloseTimer); volumeCloseTimer = null; }
      wrap.classList.remove('open');
    }
  });
  updateVolumeUi();
  applyVolumeToAudio();
  bindAudioEffectControls();
}

function audioBandLabel(frequency: number): string { return frequency >= 1000 ? (frequency / 1000) + 'k' : String(frequency); }

function renderAudioEffectControls(): void {
  var preset = document.getElementById('audio-eq-preset') as HTMLSelectElement | null;
  if (preset && !preset.options.length) {
    var presetSelect = preset;
    Object.keys(AUDIO_EQ_PRESETS).concat(['自定义']).forEach(function(name){ presetSelect.add(new Option(name, name)); });
  }
  var bands = document.getElementById('audio-eq-bands');
  if (bands && !bands.children.length) {
    bands.innerHTML = AUDIO_EQ_FREQUENCIES.map(function(frequency, index){
      return '<label class="audio-eq-band"><input type="range" min="-12" max="12" step="0.5" value="0" data-audio-eq-band="' + index + '" aria-label="' + frequency + ' Hz"><span>' + audioBandLabel(frequency) + '</span><output>0</output></label>';
    }).join('');
  }
  updateAudioEffectUi();
}

function updateAudioEffectUi(): void {
  var enabled = document.getElementById('audio-eq-enabled') as HTMLInputElement | null;
  var preset = document.getElementById('audio-eq-preset') as HTMLSelectElement | null;
  var preamp = document.getElementById('audio-preamp') as HTMLInputElement | null;
  var preampValue = document.getElementById('audio-preamp-value');
  if (enabled) enabled.checked = audioEffectSettings.enabled;
  if (preset) preset.value = audioEffectSettings.preset;
  if (preamp) preamp.value = String(audioEffectSettings.preamp);
  if (preampValue) preampValue.textContent = (audioEffectSettings.preamp > 0 ? '+' : '') + audioEffectSettings.preamp + ' dB';
  document.querySelectorAll<HTMLInputElement>('[data-audio-eq-band]').forEach(function(input){
    var index = Number(input.dataset.audioEqBand);
    input.value = String(audioEffectSettings.bands[index] || 0);
    var output = input.parentElement?.querySelector('output');
    if (output) output.textContent = (audioEffectSettings.bands[index] > 0 ? '+' : '') + audioEffectSettings.bands[index];
  });
}

function bindAudioEffectControls(): void {
  var root = document.querySelector('.audio-effects-settings') as HTMLElement | null;
  if (!root || root.dataset.bound === 'true') return;
  root.dataset.bound = 'true';
  renderAudioEffectControls();
  document.getElementById('audio-eq-enabled')?.addEventListener('change', function(event){
    audioEffectSettings.enabled = !!(event.target as HTMLInputElement).checked;
    saveAudioEffectSettings(); applyAudioEffectSettings();
  });
  document.getElementById('audio-eq-preset')?.addEventListener('change', function(event){
    var name = (event.target as HTMLSelectElement).value;
    var values = AUDIO_EQ_PRESETS[name];
    audioEffectSettings.preset = name;
    if (values) audioEffectSettings.bands = values.slice();
    saveAudioEffectSettings(); applyAudioEffectSettings();
  });
  document.getElementById('audio-preamp')?.addEventListener('input', function(event){
    audioEffectSettings.preamp = clampRange(Number((event.target as HTMLInputElement).value), -12, 12);
    saveAudioEffectSettings(); applyAudioEffectSettings();
  });
  root.addEventListener('input', function(event){
    var input = event.target as HTMLInputElement;
    if (input.dataset.audioEqBand == null) return;
    var index = Number(input.dataset.audioEqBand);
    audioEffectSettings.bands[index] = clampRange(Number(input.value), -12, 12);
    audioEffectSettings.preset = '自定义';
    saveAudioEffectSettings(); applyAudioEffectSettings();
  });
  document.getElementById('audio-output-device')?.addEventListener('change', function(event){
    void applyAudioOutputDevice((event.target as HTMLSelectElement).value, false);
  });
  void refreshAudioOutputDevices();
}

async function refreshAudioOutputDevices(): Promise<void> {
  var select = document.getElementById('audio-output-device') as HTMLSelectElement | null;
  var status = document.getElementById('audio-output-status');
  if (!select || !status) return;
  var context = audioCtx as (AudioContext & { setSinkId?: (id: string) => Promise<void> }) | null;
  if (!context?.setSinkId || !navigator.mediaDevices?.enumerateDevices) {
    select.disabled = true;
    status.textContent = '当前 WebView 不支持独立输出，跟随系统默认设备';
    return;
  }
  try {
    var devices = (await navigator.mediaDevices.enumerateDevices()).filter(function(device){ return device.kind === 'audiooutput'; });
    select.innerHTML = '<option value="">跟随系统默认</option>' + devices.map(function(device, index){ return '<option value="' + escHtml(device.deviceId) + '">' + escHtml(device.label || ('音频输出 ' + (index + 1))) + '</option>'; }).join('');
    select.value = devices.some(function(device){ return device.deviceId === audioEffectSettings.outputDeviceId; }) ? audioEffectSettings.outputDeviceId : '';
    select.disabled = false;
    status.textContent = devices.length ? '可独立选择输出设备' : '未发现可选择的输出设备';
  } catch (error) {
    select.disabled = true;
    status.textContent = '无法枚举输出设备，跟随系统默认';
  }
}

async function applyAudioOutputDevice(deviceId: string, silent: boolean): Promise<void> {
  var context = audioCtx as (AudioContext & { setSinkId?: (id: string) => Promise<void> }) | null;
  if (!context?.setSinkId) return;
  try {
    await context.setSinkId(deviceId || '');
    audioEffectSettings.outputDeviceId = deviceId;
    saveAudioEffectSettings();
    if (!silent) showToast(deviceId ? '输出设备已切换' : '已跟随系统默认输出');
  } catch (error) {
    audioEffectSettings.outputDeviceId = '';
    saveAudioEffectSettings();
    if (!silent) showToast('输出设备不可用，已恢复系统默认');
    await refreshAudioOutputDevices();
  }
}
