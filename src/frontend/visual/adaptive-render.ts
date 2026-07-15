function getRenderLoadTier(): number {
  var cssPixels = Math.max(1, innerWidth * innerHeight);
  var renderPixels = (typeof getRenderPixelLoad === 'function') ? getRenderPixelLoad() : cssPixels;
  if (cssPixels >= 7200000 || renderPixels >= 5000000) return 2;
  if (cssPixels >= 3200000 || renderPixels >= 3600000) return 1;
  return 0;
}

function normalizePerformanceBackgroundMode(v: unknown, liveKeepFallback = false): PerformanceBackgroundMode {
  var value = String(v || '');
  if (value === 'keep' || liveKeepFallback === true) return 'keep';
  if (value === 'release') return 'release';
  return 'auto';
}

function updatePerformanceControls(): void {
  fx.performanceBackground = normalizePerformanceBackgroundMode(fx.performanceBackground, fx.liveBackgroundKeep === true);
  fx.liveBackgroundKeep = fx.performanceBackground === 'keep';
  fx.performanceQuality = normalizePerformanceQuality(fx.performanceQuality);
  document.querySelectorAll('#performance-background-seg [data-performance-background]').forEach(function(btn){
    btn.classList.toggle('active', btn.getAttribute('data-performance-background') === fx.performanceBackground);
  });
  document.querySelectorAll('#performance-quality-seg [data-performance-quality]').forEach(function(btn){
    btn.classList.toggle('active', btn.getAttribute('data-performance-quality') === fx.performanceQuality);
  });
  var liveBackgroundKeepToggle = document.getElementById('t-liveBackgroundKeep');
  if (liveBackgroundKeepToggle) liveBackgroundKeepToggle.classList.toggle('on', fx.liveBackgroundKeep === true);
}

function setPerformanceBackgroundMode(mode: unknown, silent = false): void {
  var next = normalizePerformanceBackgroundMode(mode, false);
  fx.performanceBackground = next;
  fx.liveBackgroundKeep = next === 'keep';
  updatePerformanceControls();
  saveLyricLayout();
  updateRenderPowerClasses();
  syncElectronBackgroundThrottling();
  applyRendererPowerMode();
  if (next === 'keep') recoverVisualsAfterBackground('performance-background-keep');
  else if (next === 'release' && isDeepBackgroundMode()) trimRuntimeCaches('performance-release', true);
  if (!silent) {
    showToast(next === 'keep' ? '后台策略: 保持运行' : (next === 'release' ? '后台策略: 停止并释放' : '后台策略: 自动优化'));
  }
}

function getAdaptiveRenderFps(): number {
  if (isDeepBackgroundMode()) return 1;
  var clockFps = getParticleClockIdleRenderFps();
  if (clockFps) return clockFps;
  if (RENDER_VISIBLE_VSYNC) return 0;
  var quality = normalizePerformanceQuality(fx && fx.performanceQuality);
  var tier = (typeof getRenderLoadTier === 'function') ? getRenderLoadTier() : 0;
  var interacting = typeof isRenderInteractionActive === 'function' && isRenderInteractionActive();
  var activePlayback = typeof playing !== 'undefined' && playing &&
    typeof audio !== 'undefined' && audio && !audio.paused;
  var homeActive = (typeof emptyHomeActive !== 'undefined' && emptyHomeActive) ||
    document.body.classList.contains('empty-home-active');

  // Paused scenes still need a small refresh rate for UI transitions, but rendering
  // them at playback speed wastes most of the WebKit graphics process budget.
  if (!activePlayback && !interacting) {
    if (quality === 'eco') return 8;
    if (quality === 'balanced') return 10;
    if (quality === 'ultra') return 18;
    return 12;
  }

  // Home overlays several large translucent cards over the moving WebGL scene.
  // A lower scene rate keeps those compositor passes from multiplying playback load.
  if (homeActive) {
    var homeFps = interacting
      ? (quality === 'eco' ? 12 : (quality === 'balanced' ? 16 : (quality === 'ultra' ? 24 : 18)))
      : (quality === 'eco' ? 8 : (quality === 'balanced' ? 10 : (quality === 'ultra' ? 18 : 12)));
    if (tier >= 2) return Math.min(homeFps, 12);
    if (tier >= 1) return Math.min(homeFps, 16);
    return homeFps;
  }

  var targetFps;
  if (interacting) {
    targetFps = quality === 'eco' ? 30 : (quality === 'balanced' ? 36 : (quality === 'ultra' ? 54 : RENDER_INTERACTION_FPS));
    if (tier >= 2) return Math.min(targetFps, RENDER_INTERACTION_HUGE_FPS);
    if (tier >= 1) return Math.min(targetFps, RENDER_INTERACTION_LARGE_FPS);
    return targetFps;
  }

  targetFps = quality === 'eco' ? 24 : (quality === 'balanced' ? 30 : (quality === 'ultra' ? 48 : RENDER_ACTIVE_FPS));
  if (tier >= 2) return Math.min(targetFps, RENDER_HUGE_FPS);
  if (tier >= 1) return Math.min(targetFps, RENDER_LARGE_FPS);
  return targetFps;
}

function shouldSkipAdaptiveRenderFrame(now: number): boolean {
  var fps = getAdaptiveRenderFps();
  renderPerfState.mode = fps ? (fps + 'fps') : 'vsync';
  if (!fps) {
    renderPerfState.lastRenderAt = now;
    return false;
  }
  var minGap = 1000 / fps;
  if (now - renderPerfState.lastRenderAt < minGap) {
    renderPerfState.skipped += 1;
    return true;
  }
  renderPerfState.lastRenderAt = now;
  return false;
}

function sampleRenderPerf(now: number, dt: number): void {
  renderPerfState.frames += 1;
  if (dt > 0.034) renderPerfState.longFrames += 1;
  if (now - renderPerfState.lastSampleAt >= 1000) {
    renderPerfState.fps = Math.round(renderPerfState.frames * 1000 / Math.max(1, now - renderPerfState.lastSampleAt));
    renderPerfState.frames = 0;
    renderPerfState.lastSampleAt = now;
  }
  maybeTrimRuntimeCaches(now);
}

function __mineradioInitCoreRuntimePerformance25(): void {
  desktopRuntimeState = {
    desktop: !!window.desktopWindow,
    minimized: false,
    visible: true,
    focused: true,
    fullscreen: false
  };

  renderPowerState = { mode: '', width: 0, height: 0, pixelRatio: 0 };

  backgroundCacheTrimTimer = 0;

  runtimePerfState = {
    lastCacheTrimAt: 0,
    cacheTrimCount: 0,
    lastCacheTrimReason: '',
    lastHeapSampleAt: 0,
    heapMB: 0,
    cacheCounts: {}
  };

  window.__mineradioPerfSnapshot = collectRuntimePerfSnapshot;
}
