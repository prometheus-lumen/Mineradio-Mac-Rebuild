'use strict';

interface FxDomElement extends HTMLElement {
  _bound?: boolean;
  _fxPanelOrganized?: boolean;
  _mineradioFxFabBound?: boolean;
  checked: boolean;
  disabled: boolean;
  files: FileList | null;
  placeholder: string;
  src: string;
  value: string;
}

function fxEl(id: string): FxDomElement | null {
  return document.getElementById(id) as FxDomElement | null;
}

function fxNodes(selector: string): NodeListOf<FxDomElement> {
  return document.querySelectorAll<FxDomElement>(selector);
}

// Mineradio classic module: ui/fx-panel.
function clonePackagedDefaultFxSnapshot(): Record<string, unknown> {
  return Object.assign({}, PACKAGED_DEFAULT_FX_SNAPSHOT);
}

function isDevelopmentLockedFx(key: string): boolean {
  return !!DEVELOPMENT_LOCKED_FX[key];
}

function placeFxFloatingPanel(pop: HTMLElement | null, anchor: Element | null, opts: { gap?: number; pad?: number } = {}): void {
  if (!pop || !anchor || !anchor.getBoundingClientRect) return;
  var gap = opts.gap == null ? 12 : opts.gap;
  var pad = opts.pad == null ? 14 : opts.pad;
  var rect = anchor.getBoundingClientRect();
  var vw = Math.max(320, window.innerWidth || document.documentElement.clientWidth || 320);
  var vh = Math.max(320, window.innerHeight || document.documentElement.clientHeight || 320);
  var pw = Math.min(pop.offsetWidth || pop.getBoundingClientRect().width || 330, vw - pad * 2);
  var ph = Math.min(pop.offsetHeight || pop.getBoundingClientRect().height || 260, vh - pad * 2);
  var left;
  var top;
  if (vw < 760) {
    left = Math.max(pad, Math.min(vw - pw - pad, rect.left + rect.width / 2 - pw / 2));
    top = rect.bottom + gap;
    if (top + ph > vh - pad) top = Math.max(pad, rect.top - ph - gap);
  } else {
    var roomRight = vw - rect.right - pad;
    var roomLeft = rect.left - pad;
    if (roomRight >= pw + gap || roomRight >= roomLeft) left = rect.right + gap;
    else left = rect.left - pw - gap;
    left = Math.max(pad, Math.min(vw - pw - pad, left));
    top = rect.top + rect.height / 2 - ph / 2;
    top = Math.max(pad, Math.min(vh - ph - pad, top));
  }
  pop.style.left = Math.round(left) + 'px';
  pop.style.top = Math.round(top) + 'px';
  pop.style.transform = 'none';
}

function liftFxFloatingPopups(): void {
  ['cover-color-pop', 'color-lab-pop', 'cover-color-loupe'].forEach(function(id){
    var el = fxEl(id);
    if (el && el.parentElement !== document.body) document.body.appendChild(el);
  });
}

function repositionFxFloatingPanels(): void {
  var colorPop = fxEl('color-lab-pop');
  if (colorPop && colorPop.classList.contains('show') && colorLabState.picker) {
    placeFxFloatingPanel(colorPop, colorLabState.picker.closest('.lyric-color-row') || colorLabState.picker, { gap: 12, pad: 14 });
  }
  var coverPop = fxEl('cover-color-pop');
  if (coverPop && coverPop.classList.contains('show')) {
    placeFxFloatingPanel(coverPop, fxEl('visual-tint-auto-btn') || fxEl('visual-tint-picker') || coverPop, { gap: 12, pad: 14 });
  }
}

function startColorMixTween(durationMs: number): void {
  if (colorMixTween) cancelAnimationFrame(colorMixTween.raf);
  durationMs = Math.max(1, durationMs || 1);
  var start = performance.now();
  uniforms.uColorMixT.value = 0;
  function step(now: number): void {
    var t = Math.min(1, (now - start) / durationMs);
    t = visualEase(t);
    uniforms.uColorMixT.value = t;
    if (t < 1) colorMixTween = { raf: requestAnimationFrame(step) };
    else colorMixTween = null;
  }
  colorMixTween = { raf: requestAnimationFrame(step) };
}

function updateLyricHighlightControls(): void {
  var picker = fxEl('lyric-highlight-picker');
  var value = fxEl('lyric-highlight-value');
  var autoBtn = fxEl('lyric-highlight-auto-btn');
  var color = normalizeHexColor(fx.lyricHighlightColor);
  if (picker) picker.value = color;
  if (value) value.textContent = fx.lyricHighlightMode === 'custom' ? color.toUpperCase() : '跟随歌词';
  if (autoBtn) autoBtn.classList.toggle('active', fx.lyricHighlightMode !== 'custom');
}

function updateLyricGlowControls(): void {
  var row = fxEl('lyric-glow-row');
  var picker = fxEl('lyric-glow-picker');
  var value = fxEl('lyric-glow-value');
  var linkBtn = fxEl('lyric-glow-link-btn');
  var linked = fx.lyricGlowLinked !== false;
  var color = normalizeHexColor(fx.lyricGlowColor || '#9db8cf');
  if (picker) picker.value = color;
  if (row) row.classList.toggle('linked', linked);
  if (value) value.textContent = linked ? '跟随高亮' : color.toUpperCase();
  if (linkBtn) {
    linkBtn.classList.toggle('active', linked);
    linkBtn.textContent = linked ? '链接' : '独立';
    linkBtn.title = linked ? '点击后单独设置溢光颜色' : '点击后让溢光跟随高亮';
  }
}

function applyUiAccentColor(): void {
  var color = normalizeHexColor(fx.uiAccentColor || '#00f5d4', '#00f5d4');
  var rgb = hexToRgb(color);
  var root = document.documentElement;
  root.style.setProperty('--fc-accent', color);
  root.style.setProperty('--fc-accent-hov', color);
  root.style.setProperty('--fc-accent-rgb', rgb.r + ',' + rgb.g + ',' + rgb.b);
  root.style.setProperty('--glass-border', 'rgba(' + rgb.r + ',' + rgb.g + ',' + rgb.b + ',.30)');
  root.style.setProperty('--glass-shadow-focus', '0 24px 72px rgba(0,0,0,.34),0 0 0 1px rgba(' + rgb.r + ',' + rgb.g + ',' + rgb.b + ',.13),0 0 42px rgba(' + rgb.r + ',' + rgb.g + ',' + rgb.b + ',.075),inset 0 1px 0 rgba(255,255,255,.20)');
}

function updateUiAccentControls(): void {
  applyUiAccentColor();
  var color = normalizeHexColor(fx.uiAccentColor || '#00f5d4', '#00f5d4');
  var picker = fxEl('ui-accent-picker');
  var value = fxEl('ui-accent-value');
  if (picker) picker.value = color;
  if (value) value.textContent = color.toUpperCase();
}

function setUiAccentColor(color: string, silent = false): void {
  fx.uiAccentColor = normalizeHexColor(color || '#00f5d4', '#00f5d4');
  updateUiAccentControls();
  if (shelfManager && shelfManager.refreshTheme) shelfManager.refreshTheme();
  saveLyricLayout();
  if (!silent) showToast('界面高亮: ' + fx.uiAccentColor.toUpperCase());
}

function resetUiAccentColor(): void {
  setUiAccentColor(fxDefaults.uiAccentColor || '#00f5d4');
}

function toggleLyricGlowLink(e?: Event): void {
  if (e && e.stopPropagation) e.stopPropagation();
  setLyricGlowLinked(fx.lyricGlowLinked === false);
}

function setLyricGlowCustom(color: string, silent = false): void {
  fx.lyricGlowLinked = false;
  fx.lyricGlowColor = normalizeHexColor(color || '#9db8cf');
  setStageLyricPalette(fx.lyricColorMode === 'custom' ? lyricPaletteFromHex(fx.lyricColor) : (stageLyrics.coverPalette || stageLyrics.palette));
  updateLyricGlowControls();
  saveLyricLayout();
  pushDesktopLyricsState(true);
  if (!silent) showToast('溢光颜色: ' + fx.lyricGlowColor.toUpperCase());
}

function setLyricHighlightAuto(): void {
  fx.lyricHighlightMode = 'auto';
  setStageLyricPalette(fx.lyricColorMode === 'custom' ? lyricPaletteFromHex(fx.lyricColor) : (stageLyrics.coverPalette || stageLyrics.palette));
  updateLyricHighlightControls();
  updateLyricGlowControls();
  saveLyricLayout();
  pushDesktopLyricsState(true);
  showToast('高亮颜色: 跟随歌词');
}

function setLyricHighlightCustom(color: string, silent = false): void {
  fx.lyricHighlightMode = 'custom';
  fx.lyricHighlightColor = normalizeHexColor(color);
  setStageLyricPalette(fx.lyricColorMode === 'custom' ? lyricPaletteFromHex(fx.lyricColor) : (stageLyrics.coverPalette || stageLyrics.palette));
  updateLyricHighlightControls();
  updateLyricGlowControls();
  saveLyricLayout();
  pushDesktopLyricsState(true);
  if (!silent) showToast('高亮颜色: ' + fx.lyricHighlightColor.toUpperCase());
}

function setRange(id: string, value: number): void {
  var el = fxEl(id);
  if (!el) return;
  if (id === 'fx-lyricglow') value = Math.min(0.85, Math.max(0, value));
  if (id === 'fx-coverres') value = normalizeCoverResolution(value);
  if (id === 'fx-glassaberration') value = normalizeControlGlassChromaticOffset(value);
  el.value = String(value);
  var out = el.parentElement?.querySelector('output');
  if (out) out.textContent = id === 'fx-coverres'
    ? coverParticleCountLabel(value)
    : (id === 'fx-lyricweight' || id === 'fx-glassaberration' || id === 'fx-lyrictiltx' || id === 'fx-lyrictilty' || id === 'fx-shelfangle' ? String(Math.round(Number(value) || 0)) : Number(value).toFixed(id === 'fx-lyricspacing' ? 3 : 2));
}

function updateDevelopmentFxControls(): void {
  [
    ['desktopLyrics', 't-desktopLyrics', '全屏幕置顶歌词'],
    ['desktopLyricsClickThrough', 't-desktopLyricsClickThrough', '悬浮歌词时，点击锁定与点击解锁会在原位动态替换'],
    ['desktopLyricsCinema', 't-desktopLyricsCinema', '桌面歌词绑定鼓点电影震动，基础漂浮始终保留'],
    ['desktopLyricsHighlight', 't-desktopLyricsHighlight', '桌面歌词按播放进度高亮'],
    ['wallpaperMode', 't-wallpaperMode', '开发中，暂不可用']
  ].forEach(function(item){
    var locked = isDevelopmentLockedFx(item[0]);
    var el = fxEl(item[1]);
    if (!el) return;
    el.classList.toggle('dev-locked', locked);
    if (locked) {
      el.classList.remove('on');
      el.setAttribute('aria-disabled', 'true');
      el.title = '开发中，暂不可用';
    } else {
      el.removeAttribute('aria-disabled');
      el.title = item[2];
    }
  });
  [
    ['desktopLyrics', 'fx-desktoplyricssize'],
    ['desktopLyrics', 'fx-desktoplyricsopacity'],
    ['desktopLyrics', 'fx-desktoplyricsy'],
    ['wallpaperMode', 'fx-wallpaperopacity']
  ].forEach(function(item){
    var locked = isDevelopmentLockedFx(item[0]);
    var input = fxEl(item[1]);
    if (!input) return;
    input.disabled = locked;
    var row = input.closest && input.closest('.fx-slider');
    if (row) row.classList.toggle('dev-locked', locked);
  });
}

function updateDesktopLyricsFpsControls(): void {
  var fps = normalizeDesktopLyricsFps(fx.desktopLyricsFps);
  fxNodes('#desktop-lyrics-fps-seg [data-desktop-lyrics-fps]').forEach(function(btn){
    btn.classList.toggle('active', normalizeDesktopLyricsFps(btn.getAttribute('data-desktop-lyrics-fps')) === fps);
  });
}

function updateLyricFlowControls(): void {
  var mode = normalizeLyricFlowMode(fx.lyricFlowMode);
  fxNodes('#lyric-flow-seg [data-lyric-flow]').forEach(function(btn){
    btn.classList.toggle('active', normalizeLyricFlowMode(btn.getAttribute('data-lyric-flow')) === mode);
  });
}

function setLyricFlowMode(mode: string | null, silent = false): void {
  var next = normalizeLyricFlowMode(mode);
  if (fx.lyricFlowMode === next) {
    updateLyricFlowControls();
    return;
  }
  fx.lyricFlowMode = next;
  if (next === 'auto') stageLyrics.autoFlowLinesRemaining = 0;
  clearStageLyrics();
  updateLyricFlowControls();
  saveLyricLayout();
  if (!silent) {
    var labels: Record<string, string> = { single:'单行', cascade:'纵向淡出', warp:'跃迁', auto:'幻变模式' };
    showToast('歌词效果: ' + (labels[next] || '单行'));
  }
}
