function readSavedPlaybackVisualPreset(): number {
  try {
    var raw: unknown = JSON.parse(localStorage.getItem(LYRIC_LAYOUT_STORE_KEY) || '{}');
    if (!raw || typeof raw !== 'object') return fxDefaults.preset;
    var record = raw as Record<string, unknown>;
    if (!Object.prototype.hasOwnProperty.call(record, 'preset')) return fxDefaults.preset;
    var preset = clampRange(Number(record.preset) || 0, 0, VISUAL_PRESET_MAX_INDEX);
    return preset === 3 && record.visualPresetSchema !== VISUAL_PRESET_SCHEMA ? 5 : preset;
  } catch (error) {
    return fxDefaults.preset;
  }
}

function renderQualityProfile(): RenderQualityProfile {
  var quality = normalizePerformanceQuality(fx.performanceQuality);
  if (quality === 'eco') return { cap: 0.85, min: 0.50, budget: 1800000 };
  if (quality === 'balanced') return { cap: 1, min: 0.58, budget: 2800000 };
  if (quality === 'ultra') return { cap: 1.40, min: 0.75, budget: 5800000 };
  return { cap: RENDER_DPR_CAP, min: RENDER_MIN_DPR, budget: RENDER_PIXEL_BUDGET };
}

function hasActivePlaybackControls(): boolean {
  return playing || !!audio && !audio.paused || currentIdx >= 0 && !!playQueue[currentIdx];
}

function forcePlaybackControlsInteractive(): void {
  if (!hasActivePlaybackControls()) return;
  try {
    document.body.classList.remove('home-controls-locked');
    var bar = document.getElementById('bottom-bar');
    if (bar) {
      bar.style.pointerEvents = '';
      if (!controlsAutoHide) bar.classList.add('visible');
      if (!controlsAutoHide) bar.classList.remove('soft-hidden');
    }
    ['play-btn', 'prev-btn', 'next-btn', 'mini-queue-btn', 'heart-btn', 'play-mode-btn', 'collect-btn'].forEach(function(id): void {
      var button = document.querySelector<HTMLButtonElement>('#' + id);
      if (!button) return;
      button.disabled = false;
      button.classList.remove('busy');
    });
    updateControlsChromeState();
    if (bar?.classList.contains('visible') && controlsAutoHide && !controlsHovering) scheduleControlsHide(220);
  } catch (error) {
    console.warn('[PlaybackControlsRestore]', error);
  }
}

function normalizePerformanceQuality(value: unknown): PerformanceQuality {
  var normalized = String(value || '');
  return /^(eco|balanced|high|ultra)$/.test(normalized) ? normalized as PerformanceQuality : fxDefaults.performanceQuality;
}

function normalizePlaybackQuality(value: unknown): PlaybackQuality {
  var normalized = String(value || '').toLowerCase();
  if (/^(jymaster|master|svip)$/.test(normalized)) return 'jymaster';
  if (/^(hires|hi-res|highres|highest)$/.test(normalized)) return 'hires';
  if (/^(lossless|flac|sq)$/.test(normalized)) return 'lossless';
  if (/^(exhigh|high|320k|hq)$/.test(normalized)) return 'exhigh';
  if (/^(standard|normal|std)$/.test(normalized)) return 'standard';
  return 'hires';
}

function playbackQualityLabel(value: unknown): string {
  return { jymaster: '超清母带', hires: '高清臻音', lossless: '无损', exhigh: '极高', standard: '标准' }[normalizePlaybackQuality(value)];
}

function playbackQualityShortLabel(value: unknown): string {
  return { jymaster: '母带', hires: '臻音', lossless: 'SQ', exhigh: 'HQ', standard: 'STD' }[normalizePlaybackQuality(value)];
}

function playbackQualityRank(value: unknown): number {
  return { jymaster: 5, hires: 4, lossless: 3, exhigh: 2, standard: 1 }[normalizePlaybackQuality(value)];
}

function playbackQualityWasDowngraded(requested: unknown, resolved: unknown): boolean {
  return playbackQualityRank(resolved) < playbackQualityRank(requested);
}

function playbackBitrateLabel(value: unknown): string {
  var bitrate = Number(value) || 0;
  if (!bitrate) return '';
  if (bitrate >= 1000000) return (bitrate / 1000000).toFixed(bitrate >= 2000000 ? 1 : 2).replace(/\.0+$/, '') + ' Mbps';
  return Math.round(bitrate / 1000) + ' kbps';
}

function playbackResolvedQualityText(data: { level?: unknown; quality?: unknown; br?: unknown } = {}): string {
  var label = playbackQualityLabel(data.level || data.quality || playbackQuality);
  var bitrate = playbackBitrateLabel(data.br);
  return bitrate ? label + ' · ' + bitrate : label;
}

function readPlaybackQualityPreference(): PlaybackQuality {
  try { return normalizePlaybackQuality(localStorage.getItem(PLAYBACK_QUALITY_STORE_KEY) || 'hires'); }
  catch (error) { return 'hires'; }
}

function savePlaybackQualityPreference(): void {
  try { localStorage.setItem(PLAYBACK_QUALITY_STORE_KEY, playbackQuality); }
  catch (error) {}
}

function updatePlaybackQualityUi(): void {
  var canUseSvip = hasProviderSvip('netease', loginStatus);
  var display: PlaybackQuality = playbackQuality === 'jymaster' && !canUseSvip ? 'hires' : playbackQuality;
  setGuideText('quality-btn-label', playbackQualityShortLabel(display));
  var button = document.getElementById('quality-btn');
  if (button) button.title = playbackQuality === 'jymaster' && !canUseSvip
    ? '音质: ' + playbackQualityLabel(display) + ' · 超清母带需网易云 SVIP'
    : '音质: ' + playbackQualityLabel(display);
  document.querySelectorAll<HTMLButtonElement>('.quality-option').forEach(function(option): void {
    var quality = normalizePlaybackQuality(option.dataset.quality);
    var locked = option.dataset.svip === '1' && !canUseSvip;
    option.classList.toggle('active', quality === display);
    option.classList.toggle('locked', locked);
    option.disabled = locked;
    option.title = locked ? '需要网易云 SVIP 账号' : playbackQualityLabel(quality);
  });
}

function setPlaybackQuality(value: unknown): void {
  var quality = normalizePlaybackQuality(value);
  if (quality === 'jymaster' && !hasProviderSvip('netease', loginStatus)) {
    showToast(hasPlatformLogin('netease') ? '超清母带需要网易云 SVIP' : '登录网易云 SVIP 后可用超清母带');
    if (!hasPlatformLogin('netease')) openProviderLogin('netease');
    return;
  }
  playbackQuality = quality;
  savePlaybackQualityPreference();
  updatePlaybackQualityUi();
  document.getElementById('quality-control')?.classList.remove('open');
  applyPlaybackQualityToCurrentTrack(quality);
}

function canReloadCurrentTrackForQuality(): boolean {
  var song = playQueue[currentIdx];
  if (!song || currentIdx < 0 || !audio?.src || audio.paused || audio.ended || song.type === 'local' || song.source === 'local') return false;
  return /^(netease|qq|kugou)$/.test(songProviderKey(song));
}

function applyPlaybackQualityToCurrentTrack(quality: PlaybackQuality): void {
  var label = playbackQualityLabel(quality);
  if (!canReloadCurrentTrackForQuality()) {
    showToast('音质偏好: ' + label + ' · 下次播放生效');
    return;
  }
  var resumeAt = audio && isFinite(audio.currentTime) ? audio.currentTime : 0;
  showToast('正在切换音质: ' + label);
  void playQueueAt(currentIdx, { qualityOverride: quality, qualitySwitch: true, resumeAt: resumeAt, preserveHomeState: true })
    .catch(function(error): void { console.warn('[QualitySwitch]', error); showToast('音质切换失败，已保留偏好'); })
    .finally(forcePlaybackControlsInteractive);
}

function toggleQualityPanel(event?: Event): void {
  event?.stopPropagation();
  document.getElementById('quality-control')?.classList.toggle('open');
}

function bindQualityControl(): void {
  var wrap = document.getElementById('quality-control');
  if (wrap) {
    var activeWrap = wrap;
    activeWrap.addEventListener('mouseenter', function(): void { activeWrap.classList.add('open'); });
    activeWrap.addEventListener('mouseleave', function(): void { setTimeout(function(): void { if (!activeWrap.matches(':hover')) activeWrap.classList.remove('open'); }, 260); });
  }
  document.addEventListener('click', function(event): void {
    if (wrap && event.target instanceof Node && !wrap.contains(event.target)) wrap.classList.remove('open');
  });
  updatePlaybackQualityUi();
}

function switchPlaybackVisualToEmily(): void {
  if (homeVisualPresetActive) {
    deactivateHomeWallpaperPreview(true);
    return;
  }
  document.body.classList.remove('home-wallpaper-preview');
  startupVisualPreviewActive = false;
  var target = typeof playbackVisualPreset === 'number' ? playbackVisualPreset : fxDefaults.preset;
  if (fx.preset !== target) setPreset(target, { silent: true, preserveCamera: false, noSave: true });
  else syncFxUniforms();
}
