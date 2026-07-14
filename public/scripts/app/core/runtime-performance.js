'use strict';

// Mineradio classic module: core/runtime-performance.
function markAppPerf(name) {
  try {
    var value = performance.now();
    appPerfMarks.push({ name: name, value: Math.round(value) });
    if (performance && performance.mark) performance.mark('mineradio:' + name);
    if (appPerfMarks.length <= 16) console.debug('[MineradioPerf]', name, Math.round(value) + 'ms');
  } catch (e) {}
}

function installStartupLongTaskObserver() {
  try {
    if (!('PerformanceObserver' in window)) return;
    var observer = new PerformanceObserver(function(list){
      list.getEntries().forEach(function(entry){
        if (entry.startTime > 15000) return;
        console.debug('[MineradioPerf] longtask', Math.round(entry.startTime) + 'ms', Math.round(entry.duration) + 'ms');
      });
    });
    observer.observe({ entryTypes: ['longtask'] });
    setTimeout(function(){ try { observer.disconnect(); } catch (e) {} }, 16000);
  } catch (e) {}
}

function isDeepBackgroundMode() {
  if (isLiveBackgroundKeepMode()) return false;
  return !!(document.hidden || desktopRuntimeState.minimized || desktopRuntimeState.visible === false);
}

function currentPerformanceBackgroundMode() {
  return normalizePerformanceBackgroundMode(fx && fx.performanceBackground, fx && fx.liveBackgroundKeep === true);
}

function isHiddenForBackgroundOptimization() {
  return !!(document.hidden && !isLiveBackgroundKeepMode());
}

function isVisibleBackgroundMode() {
  return false;
}

function updateRenderPowerClasses() {
  document.body.classList.toggle('render-deep-sleep', isDeepBackgroundMode());
  document.body.classList.toggle('render-background-eco', isVisibleBackgroundMode());
}

function markProtectedKey(map, key) {
  if (key) map[String(key)] = true;
}

function trimRuntimeCaches(reason, aggressive) {
  var protectedCovers = collectProtectedCoverUrls();
  var protectedBeats = collectProtectedBeatMapKeys();
  var dropped = 0;
  dropped += trimObjectCache(playlistCoverCache, aggressive ? 72 : 180, protectedCovers, function(rec){
    return rec && rec.loading;
  }, function(rec){
    if (!rec) return;
    if (rec.img) {
      rec.img.onload = null;
      rec.img.onerror = null;
      try { rec.img.removeAttribute('src'); } catch (e) {}
      rec.img = null;
    }
    if (rec.waiters) rec.waiters.length = 0;
  });
  dropped += trimCoverDepthCache(aggressive ? 4 : 10, collectProtectedCoverDepthIds());
  dropped += trimObjectCache(beatMapCache, aggressive ? 12 : 36, protectedBeats);
  dropped += trimObjectCache(djBeatMapCache, aggressive ? 4 : 12, protectedBeats);
  if (aggressive && typeof renderer !== 'undefined' && renderer && renderer.renderLists && renderer.renderLists.dispose) {
    try { renderer.renderLists.dispose(); } catch (e) {}
  }
  runtimePerfState.lastCacheTrimAt = performance.now();
  runtimePerfState.cacheTrimCount += 1;
  runtimePerfState.lastCacheTrimReason = reason || (aggressive ? 'deep' : 'active');
  collectRuntimePerfSnapshot(runtimePerfState.lastCacheTrimAt);
  return dropped;
}

function scheduleBackgroundCacheTrim() {
  if (!isDeepBackgroundMode()) return;
  if (backgroundCacheTrimTimer) clearTimeout(backgroundCacheTrimTimer);
  backgroundCacheTrimTimer = setTimeout(function(){
    backgroundCacheTrimTimer = 0;
    trimVisualCachesForBackground();
  }, 900);
}

function maybeTrimRuntimeCaches(now) {
  now = now || performance.now();
  var deep = isDeepBackgroundMode();
  var gap = deep ? (isBackgroundReleaseMode() ? 3600 : 7000) : 45000;
  if (!deep && now < 30000) return;
  if (now - runtimePerfState.lastCacheTrimAt < gap) return;
  trimRuntimeCaches(deep ? (isBackgroundReleaseMode() ? 'release-frame' : 'deep-frame') : 'active-frame', deep);
}

function updateDesktopRuntimeState(state) {
  state = state || {};
  var wasFullscreen = desktopRuntimeState.fullscreen;
  var wasDeep = isDeepBackgroundMode();
  desktopRuntimeState.desktop = !!window.desktopWindow;
  desktopRuntimeState.minimized = !!state.isMinimized;
  desktopRuntimeState.visible = state.isVisible !== false;
  desktopRuntimeState.focused = state.isFocused !== false;
  desktopRuntimeState.fullscreen = !!(state.isFullScreen || state.isNativeFullScreen || state.isHtmlFullScreen || state.isWindowFullScreen);
  updateRenderPowerClasses();
  applyRendererPowerMode();
  wakeAnimationLoop();
  if (fx && (fx.desktopLyrics || fx.wallpaperMode)) setTimeout(syncDesktopOverlayState, 0);
  if (wasDeep && !isDeepBackgroundMode()) recoverVisualsAfterBackground('desktop-runtime-state');
  if (desktopRuntimeState.fullscreen !== wasFullscreen) scheduleMainRendererViewportRefresh('desktop-runtime-state');
}

function installRenderPowerHooks() {
  updateRenderPowerClasses();
  syncElectronBackgroundThrottling();
  document.addEventListener('visibilitychange', function(){
    updateRenderPowerClasses();
    applyRendererPowerMode();
    wakeAnimationLoop();
    if (!isDeepBackgroundMode()) recoverVisualsAfterBackground('visibilitychange');
  });
  window.addEventListener('focus', function(){
    desktopRuntimeState.focused = true;
    updateRenderPowerClasses();
    applyRendererPowerMode();
    wakeAnimationLoop();
    if (!isDeepBackgroundMode()) recoverVisualsAfterBackground('focus');
  });
  window.addEventListener('blur', function(){
    desktopRuntimeState.focused = false;
    updateRenderPowerClasses();
    applyRendererPowerMode();
  });
  if (window.desktopWindow && typeof window.desktopWindow.onStateChange === 'function') {
    window.desktopWindow.onStateChange(updateDesktopRuntimeState);
    if (typeof window.desktopWindow.getState === 'function') {
      window.desktopWindow.getState().then(updateDesktopRuntimeState).catch(function(){});
    }
  }
}

function getRenderLoadTier() {
  var cssPixels = Math.max(1, innerWidth * innerHeight);
  var renderPixels = (typeof getRenderPixelLoad === 'function') ? getRenderPixelLoad() : cssPixels;
  if (cssPixels >= 7200000 || renderPixels >= 5000000) return 2;
  if (cssPixels >= 3200000 || renderPixels >= 3600000) return 1;
  return 0;
}

function normalizePerformanceBackgroundMode(v, liveKeepFallback) {
  var value = String(v || '');
  if (value === 'keep' || liveKeepFallback === true) return 'keep';
  if (value === 'release') return 'release';
  return 'auto';
}

function updatePerformanceControls() {
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

function setPerformanceBackgroundMode(mode, silent) {
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

function getAdaptiveRenderFps() {
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

function shouldSkipAdaptiveRenderFrame(now) {
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

function sampleRenderPerf(now, dt) {
  renderPerfState.frames += 1;
  if (dt > 0.034) renderPerfState.longFrames += 1;
  if (now - renderPerfState.lastSampleAt >= 1000) {
    renderPerfState.fps = Math.round(renderPerfState.frames * 1000 / Math.max(1, now - renderPerfState.lastSampleAt));
    renderPerfState.frames = 0;
    renderPerfState.lastSampleAt = now;
  }
  maybeTrimRuntimeCaches(now);
}

function __mineradioInitCoreRuntimePerformance25() {
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
