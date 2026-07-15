function normalizeDevelopmentLockedFxState(): void {
  if (!fx) return;
  fx.wallpaperMode = false;
}

function pulseObjectValue(target: Record<string, number>, key: string, amount = 1, duration = 0.42): void {
  if (!target) return;
  target[key] = Math.max(target[key] || 0, amount || 1);
  if (window.gsap) {
    window.gsap.killTweensOf(target, key);
    var vars: Record<string, unknown> = { duration: duration, ease: 'power3.out' };
    vars[key] = 0;
    window.gsap.to(target, vars);
  } else {
    setTimeout(function(){ if (target) target[key] = 0; }, duration * 1000);
  }
}

function isLiveBackgroundKeepMode(): boolean {
  return currentPerformanceBackgroundMode() === 'keep';
}

function isBackgroundReleaseMode(): boolean {
  return currentPerformanceBackgroundMode() === 'release';
}

function syncElectronBackgroundThrottling(): void {
  if (!window.desktopWindow || typeof window.desktopWindow.setBackgroundKeepEnabled !== 'function') return;
  window.desktopWindow.setBackgroundKeepEnabled(isLiveBackgroundKeepMode()).catch(function(){});
}

function safeObjectKeys(obj: object | null | undefined): string[] {
  try { return obj ? Object.keys(obj) : []; } catch (e) { return []; }
}

function trimObjectCache<T>(cache: Record<string, T>, keep: number, protectedKeys?: Record<string, boolean>, skipRecord?: (record: T, key: string) => boolean, disposeRecord?: (record: T, key: string) => void): number {
  var keys = safeObjectKeys(cache);
  if (!cache || keys.length <= keep) return 0;
  var drop = keys.length - keep;
  var dropped = 0;
  for (var i = 0; i < keys.length && drop > 0; i++) {
    var key = keys[i];
    if (protectedKeys && protectedKeys[key]) continue;
    var rec = cache[key];
    if (skipRecord && skipRecord(rec, key)) continue;
    if (disposeRecord) {
      try { disposeRecord(rec, key); } catch (e) {}
    }
    delete cache[key];
    drop--;
    dropped++;
  }
  return dropped;
}

function trimVisualCachesForBackground(): void {
  if (!isDeepBackgroundMode()) return;
  trimRuntimeCaches('deep-background', true);
}
