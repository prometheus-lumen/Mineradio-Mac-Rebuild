var TOUCHBAR_LYRIC_WIDTH = 300;
var TOUCHBAR_LYRIC_SCALE = 2;
var touchBarLyricCanvas: HTMLCanvasElement | null = null;
function touchBarLyricImageData(payload: DesktopOverlayPayload): string {
  if (!touchBarLyricCanvas) {
    touchBarLyricCanvas = document.createElement('canvas');
    touchBarLyricCanvas.width = TOUCHBAR_LYRIC_WIDTH * TOUCHBAR_LYRIC_SCALE;
    touchBarLyricCanvas.height = 30 * TOUCHBAR_LYRIC_SCALE;
  }
  var ctx = touchBarLyricCanvas.getContext('2d');
  if (!ctx) return '';
  var text = String(payload.text || payload.title || 'Mineradio').replace(/\s+/g, ' ').trim() || 'Mineradio';
  var colors = payload.colors || {};
  var progress = clampRange(Number(payload.progress) || 0, 0, 1);
  var sidePadding = 24;
  var maxWidth = touchBarLyricCanvas.width - sidePadding * 2;
  var fontSize = 40;
  var fontFamily = '-apple-system, BlinkMacSystemFont, "PingFang SC", "Helvetica Neue", sans-serif';
  ctx.clearRect(0, 0, touchBarLyricCanvas.width, touchBarLyricCanvas.height);
  ctx.font = '650 ' + fontSize + 'px ' + fontFamily;
  var measuredWidth = ctx.measureText(text).width;
  var isLong = measuredWidth > maxWidth;
  var scrollProgress = clampRange((progress - 0.12) / 0.76, 0, 1);
  scrollProgress = scrollProgress * scrollProgress * (3 - 2 * scrollProgress);
  var overflow = Math.max(0, measuredWidth - maxWidth);
  var x = isLong
    ? sidePadding - overflow * scrollProgress
    : (touchBarLyricCanvas.width - measuredWidth) / 2;
  var y = touchBarLyricCanvas.height / 2 + 1;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = colors.primary || '#d6f8ff';
  ctx.globalAlpha = 0.72;
  ctx.fillText(text, x, y);
  ctx.save();
  ctx.beginPath();
  var highlightEnd = Math.max(0, Math.min(touchBarLyricCanvas.width, x + measuredWidth * progress));
  ctx.rect(0, 0, highlightEnd, touchBarLyricCanvas.height);
  ctx.clip();
  ctx.globalAlpha = 1;
  ctx.fillStyle = colors.highlight || colors.secondary || '#fff0b8';
  ctx.fillText(text, x, y);
  ctx.restore();
  ctx.globalAlpha = 1;
  return touchBarLyricCanvas.toDataURL('image/png');
}
function pushTouchBarLyricsState(force = false): void {
  var api = getDesktopWindowApi();
  if (!api || api.platform !== 'darwin' || typeof api.updateTouchBarLyrics !== 'function') return;
  var sendApi = api;
  var now = performance.now();
  if (!force && now - desktopOverlayPushState.touchBarAt < 50) return;
  var payload = touchBarLyricsPayload();
  var colors = payload.colors || {};
  var key = payload.text + '|' + payload.title + '|' + payload.playing + '|' + payload.liked + '|' + Math.round((payload.progress || 0) * TOUCHBAR_LYRIC_WIDTH) + '|' + colors.primary + '|' + colors.secondary + '|' + colors.highlight;
  if (!force && key === desktopOverlayPushState.lastTouchBarKey) return;
  desktopOverlayPushState.touchBarAt = now;
  desktopOverlayPushState.lastTouchBarKey = key;
  queueDesktopOverlayIpc('touchBar', payload, function(next){
    return sendApi.updateTouchBarLyrics!(next);
  }, function(next){
    next.imageData = touchBarLyricImageData(next);
  }, 'touch bar lyrics update failed:');
}
function pushDesktopLyricsState(force = false): void {
  var api = getDesktopWindowApi();
  if (!api || typeof api.updateDesktopLyrics !== 'function') return;
  var sendApi = api;
  var now = performance.now();
  if (!force && now - desktopOverlayPushState.lyricsAt < desktopLyricsPushInterval()) return;
  var payload = desktopLyricsPayload(!!force);
  var colors = payload.colors || {};
  var motion = (payload.motion || {}) as DesktopOverlayPayload;
  var key = payload.enabled + '|' + payload.text + '|' + Math.round(Number(payload.progress) * 1000) + '|' + Math.round(Number(payload.progressSpan || 0) * 100) + '|' + payload.playing + '|' + payload.size + '|' + payload.opacity + '|' + payload.y + '|' + payload.clickThrough + '|' + payload.cinema + '|' + payload.highlightFollow + '|' + payload.frameRate + '|' + payload.fontFamily + '|' + payload.fontWeight + '|' + payload.letterSpacing + '|' + payload.lineHeight + '|' + payload.lyricScale + '|' + payload.feather + '|' + payload.beatMapKey + '|' + colors.primary + '|' + colors.secondary + '|' + colors.highlight + '|' + colors.glow + '|' + motion.lyricGlow + '|' + motion.lyricGlowBeat + '|' + Math.round(Number(motion.lyricGlowStrength || 0) * 100) + '|' + Math.round(Number(motion.highBloom || 0) * 100) + '|' + Math.round(Number(motion.beatGlow || 0) * 100) + '|' + Math.round(Number(motion.beatPulse || 0) * 100) + '|' + Math.round(Number(motion.bass || 0) * 100);
  if (!force && key === desktopOverlayPushState.lastLyricsKey && now - desktopOverlayPushState.lyricsAt < 900) return;
  desktopOverlayPushState.lyricsAt = now;
  desktopOverlayPushState.lastLyricsKey = key;
  queueDesktopOverlayIpc('lyrics', payload, function(next){
    return sendApi.updateDesktopLyrics!(next);
  }, null, 'desktop lyrics update failed:');
}
function applyDesktopLyricsState(force = false): void {
  var api = getDesktopWindowApi();
  if (!api) return;
  normalizeDevelopmentLockedFxState();
  var payload = desktopLyricsPayload(true);
  if (typeof api.setDesktopLyricsEnabled === 'function') {
    api.setDesktopLyricsEnabled(!!payload.enabled, payload).catch(function(error: unknown){ console.warn('desktop lyrics state failed:', error); });
  }
  pushDesktopLyricsState(!!force);
}
function pushWallpaperState(force = false): void {
  var api = getDesktopWindowApi();
  if (!api || typeof api.updateWallpaperMode !== 'function') return;
  var sendApi = api;
  var now = performance.now();
  if (!force && now - desktopOverlayPushState.wallpaperAt < 260) return;
  var payload = wallpaperPayload();
  var key = payload.enabled + '|' + payload.title + '|' + payload.artist + '|' + payload.cover + '|' + payload.playing + '|' + payload.preset + '|' + payload.opacity;
  if (!force && key === desktopOverlayPushState.lastWallpaperKey && now - desktopOverlayPushState.wallpaperAt < 1400) return;
  desktopOverlayPushState.wallpaperAt = now;
  desktopOverlayPushState.lastWallpaperKey = key;
  queueDesktopOverlayIpc('wallpaper', payload, function(next){
    return sendApi.updateWallpaperMode!(next);
  }, null, 'wallpaper update failed:');
}
function applyWallpaperModeState(force = false): void {
  var api = getDesktopWindowApi();
  if (!api) return;
  normalizeDevelopmentLockedFxState();
  var payload = wallpaperPayload();
  if (typeof api.setWallpaperMode === 'function') {
    api.setWallpaperMode(!!payload.enabled, payload).catch(function(error: unknown){ console.warn('wallpaper state failed:', error); });
  }
  pushWallpaperState(!!force);
}
function syncDesktopOverlayState(): void {
  if (fx.desktopLyrics) pushDesktopLyricsState(false);
  if (fx.wallpaperMode) pushWallpaperState(false);
}
var desktopOverlaySyncTick = { at: 0, mode: '' };
function tickDesktopOverlayState(now?: number): void {
  if (!fx || (!fx.desktopLyrics && !fx.wallpaperMode)) return;
  now = now || performance.now();
  var mode = (fx.desktopLyrics ? 'lyrics' : '') + '|' + (fx.wallpaperMode ? 'wallpaper' : '');
  if (mode !== desktopOverlaySyncTick.mode) {
    desktopOverlaySyncTick.mode = mode;
    desktopOverlaySyncTick.at = 0;
  }
  var minGap = fx.desktopLyrics
    ? Math.max(16, desktopLyricsPushInterval())
    : (fx.wallpaperMode ? 260 : 500);
  if (isDeepBackgroundMode()) minGap = Math.max(minGap, 1000);
  if (now - desktopOverlaySyncTick.at < minGap) return;
  desktopOverlaySyncTick.at = now;
  syncDesktopOverlayState();
}
function scheduleTouchBarLyricsSync(): void {
  var api = getDesktopWindowApi();
  var active = !!(api && api.platform === 'darwin' && playing && audio && !audio.paused);
  pushTouchBarLyricsState(false);
  setTimeout(scheduleTouchBarLyricsSync, active && !isDeepBackgroundMode() ? 125 : (api && api.platform === 'darwin' ? 750 : 2000));
}
scheduleTouchBarLyricsSync();

// 全屏
