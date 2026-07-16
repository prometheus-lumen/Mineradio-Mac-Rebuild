function __mineradioInitUiSplash51(): void {
  document.body.classList.add('splash-active');
  splashAnimating = true;
  splashCanvas = null;
  splashCtx = null;
  splashGl = null;
  splashGlProgram = null;
  splashGlBuffer = null;
  splashGlUniforms = null;
  splashW = 0;
  splashH = 0;
  splashDust = [];
  splashStreaks = [];
  splashShards = [];
  splashPixelRatio = 1;
  splashStartedAt = performance.now();
  splashSoundPlayed = false;
  splashAudioCtx = null;
  splashSoundFallbackArmed = false;
  splashTimer = null;
  reduceSplashMotion = false;
  splashReadyToEnter = false;
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bindSplashEntry, { once: true });
  } else {
    bindSplashEntry();
  }
  try {
    initMineradioSplashCanvas();
  } catch (error) {
    console.warn('[Splash] Canvas initialization failed; continuing with CSS animation.', error);
  }
}

function initMineradioSplashCanvas(): void {
  var canvas = document.querySelector<HTMLCanvasElement>('#splash-canvas');
  if (!canvas) return;
  splashCanvas = canvas;
  var webglReady = false;
  if (!reduceSplashMotion) {
    try {
      webglReady = initMineradioSplashWebgl(canvas);
    } catch (error) {
      console.warn('[Splash] WebGL initialization failed; using 2D fallback.', error);
    }
  }
  if (webglReady) {
    splashCtx = null;
  } else {
    splashCtx = canvas.getContext('2d');
    if (!splashCtx) replaceSplashCanvasWith2dFallback(canvas);
  }
  resizeMineradioSplashCanvas();
  window.addEventListener('resize', resizeMineradioSplashCanvas);
  drawMineradioSplash();
}

function replaceSplashCanvasWith2dFallback(canvas: HTMLCanvasElement): void {
  var fallbackCanvas = canvas.cloneNode(false) as HTMLCanvasElement;
  canvas.replaceWith(fallbackCanvas);
  splashCanvas = fallbackCanvas;
  splashGl = null;
  splashGlProgram = null;
  splashGlBuffer = null;
  splashGlUniforms = null;
  splashCtx = fallbackCanvas.getContext('2d');
}

function resizeMineradioSplashCanvas(): void {
  if (!splashCanvas) return;
  splashPixelRatio = Math.min(1.6, Math.max(1, window.devicePixelRatio || 1));
  splashW = window.innerWidth;
  splashH = window.innerHeight;
  splashCanvas.width = Math.max(1, Math.floor(splashW * splashPixelRatio));
  splashCanvas.height = Math.max(1, Math.floor(splashH * splashPixelRatio));
  splashCtx?.setTransform(splashPixelRatio, 0, 0, splashPixelRatio, 0, 0);
  splashGl?.viewport(0, 0, splashCanvas.width, splashCanvas.height);
  createSplashCanvasParticles();
}

function createSplashCanvasParticles(): void {
  splashDust = [];
  splashStreaks = [];
  splashShards = [];
  var dustCount = reduceSplashMotion ? 28 : 84;
  for (var index = 0; index < dustCount; index++) {
    splashDust.push({
      x: Math.random() * splashW, y: Math.random() * splashH,
      vx: (Math.random() - 0.5) * 0.18, vy: (Math.random() - 0.5) * 0.11,
      r: Math.random() * 1.35 + 0.28, a: Math.random() * 0.105 + 0.025,
      p: Math.random() * Math.PI * 2
    });
  }
  var colors = ['rgba(244,210,138,', 'rgba(122,215,194,', 'rgba(255,83,103,', 'rgba(157,184,207,'];
  var streakCount = reduceSplashMotion ? 6 : 22;
  for (var streak = 0; streak < streakCount; streak++) {
    splashStreaks.push({
      x: Math.random() * splashW, y: splashH * (0.20 + Math.random() * 0.62),
      len: splashW * (0.12 + Math.random() * 0.24), width: 0.75 + Math.random() * 2.1,
      speed: splashW * (0.00028 + Math.random() * 0.00042), angle: (-10 + Math.random() * 20) * Math.PI / 180,
      phase: Math.random() * Math.PI * 2, color: colors[streak % colors.length] || colors[0],
      delay: Math.random() * 1.1, alpha: 0.18 + Math.random() * 0.36
    });
  }
  var shardCount = reduceSplashMotion ? 10 : 34;
  for (var shard = 0; shard < shardCount; shard++) {
    splashShards.push({
      ox: (Math.random() - 0.5) * splashW * 0.92, oy: (Math.random() - 0.5) * splashH * 0.22,
      w: 18 + Math.random() * 86, h: 1 + Math.random() * 5, skew: (Math.random() - 0.5) * 20,
      phase: Math.random() * Math.PI * 2, color: colors[shard % colors.length] || colors[0],
      alpha: 0.10 + Math.random() * 0.24
    });
  }
}

function bindSplashEntry(): void {
  var splash = document.getElementById('splash');
  if (!splash || splash.dataset.entryBound === 'true') return;
  splash.dataset.entryBound = 'true';
  function requestEntry(): void {
    try {
      playMineradioIntroSound();
    } catch (error) {
      console.warn('[Splash] Intro sound unavailable.', error);
    }
    if (!splashReadyToEnter) markSplashReadyToEnter();
    dismissSplash();
  }
  splash.addEventListener('click', requestEntry);
  document.addEventListener('keydown', function(event): void {
    if (!document.body.classList.contains('splash-active')) return;
    if (event.key === 'Enter' || event.code === 'Space') {
      event.preventDefault();
      requestEntry();
    }
  });
  if (reduceSplashMotion) {
    splash.classList.add('reduce-motion');
    splashTimer = setTimeout(markSplashReadyToEnter, 900);
  } else {
    splashTimer = setTimeout(markSplashReadyToEnter, 5000);
  }
  markAppPerf('dom-content-loaded');
  runOptionalSplashStartupTask('sound fallback', armSplashSoundFallback);
  runOptionalSplashStartupTask('wallpaper prewarm', prewarmHomeWallpaperPreview);
  runOptionalSplashStartupTask('weather prewarm', prewarmHomeWeatherRadio);
  runOptionalSplashStartupTask('intro sound', playMineradioIntroSound);
}

function runOptionalSplashStartupTask(label: string, task: () => void): void {
  queueMicrotask(function(): void {
    try {
      task();
    } catch (error) {
      console.warn('[Splash] Optional ' + label + ' failed.', error);
    }
  });
}
