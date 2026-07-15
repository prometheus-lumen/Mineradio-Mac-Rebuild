function buildLyricColorControls(): void {
  var grid = document.getElementById('lyric-color-grid');
  if (!grid) return;
  var html = '<button class="lyric-swatch auto" type="button" data-auto="1" onclick="setLyricColorAuto()" title="封面取色">AUTO</button>';
  html += lyricColorPresets.map(function(p, i){
    return '<button class="lyric-swatch" type="button" data-color="' + p.color + '" onclick="setLyricColorPreset(' + i + ')" title="' + escHtml(p.name) + '" style="--swatch:' + p.color + '"></button>';
  }).join('');
  grid.innerHTML = html;
}

function updateLyricColorControls(): void {
  var picker = document.querySelector<HTMLInputElement>('#lyric-color-picker');
  var value = document.getElementById('lyric-color-value');
  var autoBtn = document.getElementById('lyric-auto-btn');
  var color = normalizeHexColor(fx.lyricColor);
  if (picker) picker.value = color;
  if (value) value.textContent = fx.lyricColorMode === 'custom' ? color.toUpperCase() : '封面取色';
  if (autoBtn) autoBtn.classList.toggle('active', fx.lyricColorMode !== 'custom');
  document.querySelectorAll<HTMLElement>('.lyric-swatch').forEach(function(btn) {
    var isAuto = btn.dataset.auto === '1';
    var isColor = normalizeHexColor(btn.dataset.color || '') === color;
    btn.classList.toggle('active', isAuto ? fx.lyricColorMode !== 'custom' : (fx.lyricColorMode === 'custom' && isColor));
  });
}

function currentCoverPickerCanvas(): HTMLCanvasElement | null {
  if (coverPickerCanvas) return coverPickerCanvas;
  if (coverTex && coverTex.image && coverTex.image.getContext) return coverTex.image;
  return null;
}

function coverPickerSwatchColors(): string[] {
  var pal = stageLyrics.coverPalette || stageLyrics.palette || {};
  var list = [pal.primary, pal.secondary, pal.highlight, fx.visualTintColor, fx.uiAccentColor, fx.homeAccentColor]
    .map(function(c){ return normalizeHexColor(c || '', ''); })
    .filter(function(c){ return /^#[0-9a-f]{6}$/i.test(c); });
  var seen: Record<string, boolean> = {};
  return list.filter(function(c){
    if (seen[c]) return false;
    seen[c] = true;
    return true;
  }).slice(0, 5);
}

function setCoverPickerPreview(hex: string): void {
  var preview = document.getElementById('cover-color-preview');
  if (preview) preview.style.setProperty('--picked', normalizeHexColor(hex || '#9db8cf'));
}

function renderCoverPickerSwatches(): void {
  var wrap = document.getElementById('cover-color-swatches');
  if (!wrap) return;
  var colors = coverPickerSwatchColors();
  wrap.innerHTML = colors.map(function(c){
    return '<button type="button" style="--c:' + c + '" title="' + c.toUpperCase() + '" onclick="applyCoverPickerColor(\'' + c + '\')"></button>';
  }).join('');
}

function applyCoverPickerColor(hex: string): void {
  hex = normalizeHexColor(hex || '#9db8cf');
  setCoverPickerPreview(hex);
  if (coverColorPickerState.target === 'visualTint') {
    setVisualTintCustom(hex, true);
    showToast('视觉主色: ' + hex.toUpperCase());
  }
  closeCoverColorPicker();
}

function setLyricGlowLinked(linked: boolean, openPicker?: boolean): void {
  fx.lyricGlowLinked = linked !== false;
  if (!fx.lyricGlowLinked) fx.lyricGlowColor = normalizeHexColor(fx.lyricGlowColor || fx.lyricHighlightColor || '#9db8cf');
  setStageLyricPalette(fx.lyricColorMode === 'custom' ? lyricPaletteFromHex(fx.lyricColor) : (stageLyrics.coverPalette || stageLyrics.palette));
  updateLyricGlowControls();
  saveLyricLayout();
  if (openPicker) {
    setTimeout(function(){
      var picker = document.getElementById('lyric-glow-picker');
      if (picker) picker.click();
    }, 0);
  }
}

function setLyricColorAuto(): void {
  fx.lyricColorMode = 'auto';
  setStageLyricPalette(stageLyrics.coverPalette || stageLyrics.palette);
  updateLyricColorControls();
  updateLyricHighlightControls();
  updateLyricGlowControls();
  saveLyricLayout();
  pushDesktopLyricsState(true);
  showToast('歌词颜色: 封面取色');
}

function setLyricColorCustom(color: string, silent?: boolean): void {
  fx.lyricColorMode = 'custom';
  fx.lyricColor = normalizeHexColor(color);
  setStageLyricPalette(lyricPaletteFromHex(fx.lyricColor));
  updateLyricColorControls();
  updateLyricHighlightControls();
  updateLyricGlowControls();
  saveLyricLayout();
  pushDesktopLyricsState(true);
  if (!silent) showToast('歌词颜色: ' + fx.lyricColor.toUpperCase());
}

function setLyricColorPreset(i: number): void {
  var p = lyricColorPresets[i];
  if (!p) return;
  setLyricColorCustom(p.color);
}
