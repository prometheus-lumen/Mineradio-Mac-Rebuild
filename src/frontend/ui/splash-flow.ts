function shouldShowEmptyHomeAfterSplash(): boolean {
  return shouldShowEmptyHomeCore(true);
}

function shouldForceEmptyHomeAfterSplash(): boolean {
  if (immersiveMode || shelfPinnedOpen || shelfManager?.hasOpenContent?.()) return false;
  if (playQueue.length || currentIdx >= 0 && !!playQueue[currentIdx] || playing) return false;
  return true;
}

function splashClamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function splashSmoothstep(edge0: number, edge1: number, value: number): number {
  var time = splashClamp01((value - edge0) / Math.max(0.0001, edge1 - edge0));
  return time * time * (3 - 2 * time);
}

function splashEaseOutCubic(value: number): number {
  var time = splashClamp01(value);
  return 1 - Math.pow(1 - time, 3);
}

function dismissSplash(): void {
  var splash = document.getElementById('splash');
  if (!splash || splash.classList.contains('hide') || splash.classList.contains('exiting')) return;
  var activeSplash = splash;
  markAppPerf('splash-dismiss');
  if (splashTimer) clearTimeout(splashTimer);
  splashTimer = null;
  splashReadyToEnter = false;
  splash.classList.remove('ready');
  if (shouldUseIdleWallpaperPreview(true)) activateHomeWallpaperPreview();
  revealIdleParticles(0, reduceSplashMotion ? 700 : 2400);
  document.body.classList.add('splash-revealing');
  splash.classList.add('exiting');
  var content = splash.querySelector<HTMLElement>('.splash-content');
  if (content) {
    content.style.transition = 'opacity 680ms cubic-bezier(.22,1,.36,1), transform 980ms cubic-bezier(.22,1,.36,1)';
    content.style.opacity = '0';
    content.style.transform = 'translateY(-14px) scale(.986)';
  }
  setTimeout(function(): void { finishSplashDismiss(activeSplash); }, 1180);
}

function finishSplashDismiss(splash: HTMLElement): void {
  splash.classList.add('hide');
  splashAnimating = false;
  document.body.classList.remove('splash-active', 'splash-revealing');
  markAppPerf('home-revealed');
  splash.style.display = 'none';
  requestAnimationFrame(function(): void {
    var homeShown = !!updateEmptyHomeVisibility({ forceLoad: true });
    if (!homeShown && shouldForceEmptyHomeAfterSplash()) {
      homeSuppressed = false;
      homeForcedOpen = true;
      homeShown = !!updateEmptyHomeVisibility({ forceLoad: true });
    }
    requestAnimationFrame(function(): void { startPostSplashGuides(homeShown); });
  });
}

function startPostSplashGuides(homeShown: boolean): void {
  var guideStarted = maybeRunStartupVisualGuide('splash');
  if (!guideStarted && (!hasAnyPlatformLogin() || !homeShown)) maybeRunStartupLoginGuide('splash');
  setTimeout(maybeShowUploadTipOnce, 5200);
}

function markSplashReadyToEnter(): void {
  var splash = document.getElementById('splash');
  if (!splash || splash.classList.contains('hide') || splash.classList.contains('exiting')) return;
  markAppPerf('splash-ready');
  splashReadyToEnter = true;
  splashTimer = null;
  splash.classList.add('ready');
  splash.setAttribute('role', 'button');
  splash.setAttribute('tabindex', '0');
  splash.setAttribute('aria-label', '点击进入 Mineradio');
}

function isMainSceneCoveredBySplash(): boolean {
  return document.body.classList.contains('splash-active') && !document.body.classList.contains('splash-revealing');
}
