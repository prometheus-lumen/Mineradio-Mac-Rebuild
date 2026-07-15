function normalizeShelfCameraMode(value: unknown): string {
  return String(value || '') === 'static' ? 'static' : 'dynamic';
}

function normalizeShelfPresence(value: unknown): string {
  return String(value || '') === 'always' ? 'always' : 'auto';
}

function normalizeLyricFontKey(value: unknown): string {
  var normalized = String(value || 'sans');
  return /^(sans|hei|song|bold-song|stone-song|kai-song|serif-en|gothic|editorial|humanist|round|mono|display)$/.test(normalized) ? normalized : 'sans';
}

function lyricFontStackForKey(key: string): string {
  key = normalizeLyricFontKey(key);
  if (key === 'hei') return '"Noto Sans SC","Microsoft YaHei",SimHei,"PingFang SC",sans-serif';
  if (key === 'song') return '"Noto Serif SC","Source Han Serif SC",SimSun,"Songti SC",serif';
  if (key === 'bold-song') return '"Source Han Serif SC Heavy","Source Han Serif SC","Noto Serif SC Black","Noto Serif SC","STZhongsong","SimSun",serif';
  if (key === 'stone-song') return '"FZYaSongS-B-GB","FZCuSong-B09S","Source Han Serif SC Heavy","Noto Serif SC Black","STZhongsong","SimSun",serif';
  if (key === 'kai-song') return '"Kaiti SC","STKaiti","KaiTi","Source Han Serif SC","Noto Serif SC",serif';
  if (key === 'serif-en') return 'Georgia,"Times New Roman","Noto Serif SC","Source Han Serif SC",serif';
  if (key === 'gothic') return '"UnifrakturCook","UnifrakturMaguntia","Old English Text MT","Blackletter","Cinzel Decorative","Noto Serif SC",serif';
  if (key === 'editorial') return '"Didot","Bodoni 72","Libre Baskerville",Georgia,"Noto Serif SC",serif';
  if (key === 'humanist') return '"Avenir Next","Segoe UI","Inter","Noto Sans SC","PingFang SC",sans-serif';
  if (key === 'round') return '"HarmonyOS Sans SC","Microsoft YaHei UI","PingFang SC","Noto Sans SC",sans-serif';
  if (key === 'mono') return '"JetBrains Mono",Consolas,"Noto Sans SC","Microsoft YaHei",monospace';
  if (key === 'display') return '"Alibaba PuHuiTi","Noto Sans SC","PingFang SC","Microsoft YaHei",sans-serif';
  return 'Inter,"Noto Sans SC","PingFang SC","Microsoft YaHei",Arial,sans-serif';
}

function lyricFontWeightValue(): number {
  if (normalizeLyricFontKey(fx && fx.lyricFont) === 'stone-song') return 900;
  return Math.round(clampRange(Number(fx && fx.lyricWeight) || 900, 500, 900) / 50) * 50;
}

function lyricFontCss(fontSize: number): string {
  return lyricFontWeightValue() + ' ' + fontSize + 'px ' + lyricFontStackForKey(fx && fx.lyricFont);
}

function lyricLetterSpacingPx(fontSize: number): number {
  return clampRange(Number(fx && fx.lyricLetterSpacing) || 0, -0.04, 0.18) * Math.max(1, fontSize || 1);
}

function lyricLineHeightFactor(): number {
  return clampRange(Number(fx && fx.lyricLineHeight) || 1, 0.86, 1.35);
}

function measureTextWithLetterSpacing(ctx: CanvasRenderingContext2D, text: string, spacing: number): number {
  text = String(text || '');
  spacing = Number(spacing) || 0;
  if (!spacing || text.length < 2) return ctx.measureText(text).width;
  var chars = Array.from(text);
  var w = 0;
  for (var i = 0; i < chars.length; i++) {
    w += ctx.measureText(chars[i]).width;
    if (i < chars.length - 1) w += spacing;
  }
  return Math.max(1, w);
}

function lyricMeasureText(ctx: CanvasRenderingContext2D, text: string, fontSize: number): number {
  return measureTextWithLetterSpacing(ctx, text, lyricLetterSpacingPx(fontSize));
}

function drawTextWithLetterSpacing(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  spacing: number,
  stroke: boolean
): void {
  text = String(text || '');
  spacing = Number(spacing) || 0;
  if (!spacing || text.length < 2) {
    if (stroke) ctx.strokeText(text, x, y);
    else ctx.fillText(text, x, y);
    return;
  }
  var chars = Array.from(text);
  var align = ctx.textAlign || 'left';
  var width = measureTextWithLetterSpacing(ctx, text, spacing);
  var start = x;
  if (align === 'center') start = x - width / 2;
  else if (align === 'right' || align === 'end') start = x - width;
  ctx.textAlign = 'left';
  var cursor = start;
  for (var i = 0; i < chars.length; i++) {
    if (stroke) ctx.strokeText(chars[i], cursor, y);
    else ctx.fillText(chars[i], cursor, y);
    cursor += ctx.measureText(chars[i]).width + (i < chars.length - 1 ? spacing : 0);
  }
  ctx.textAlign = align;
}

function lyricFillText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, fontSize: number): void {
  drawTextWithLetterSpacing(ctx, text, x, y, lyricLetterSpacingPx(fontSize), false);
}

function lyricStrokeText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, fontSize: number): void {
  drawTextWithLetterSpacing(ctx, text, x, y, lyricLetterSpacingPx(fontSize), true);
}

function wrapLyricText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  maxLines: number,
  fontSize: number
): string[] {
  text = String(text || '').trim();
  var useWords = /\s/.test(text) && /[A-Za-z0-9]/.test(text);
  var units = useWords ? text.split(/(\s+)/).filter(Boolean) : text.split('');
  var lines = [], line = '';
  for (var i = 0; i < units.length; i++) {
    var test = line + units[i];
    if (lyricMeasureText(ctx, test, fontSize) > maxWidth && line) {
      lines.push(line.trim());
      line = units[i].trimStart();
      if (lines.length >= maxLines) {
        var rest = units.slice(i).join('').trim();
        if (rest) lines[lines.length - 1] = lines[lines.length - 1].replace(/[.。,…，、\s]*$/, '') + '...';
        return lines;
      }
    } else {
      line = test;
    }
  }
  if (line && lines.length < maxLines) lines.push(line.trim());
  return lines.length ? lines : [''];
}

function updateLyricFontControls(): void {
  document.querySelectorAll<HTMLElement>('#lyric-font-grid button').forEach(function(btn) {
    btn.classList.toggle('active', btn.dataset.font === normalizeLyricFontKey(fx.lyricFont));
  });
}

function setLyricFont(key: string): void {
  fx.lyricFont = normalizeLyricFontKey(key);
  updateLyricFontControls();
  refreshCurrentLyricStyle();
  saveLyricLayout();
  pushDesktopLyricsState(true);
  showToast('歌词字体已切换');
}

function setShelfCameraMode(mode: string): void {
  fx.shelfCameraMode = normalizeShelfCameraMode(mode);
  applyShelfCameraDefaultAngle(true);
  setRange('fx-shelfangle', fx.shelfAngleY);
  updateShelfControlUi();
  if (fx.shelfCameraMode === 'static' && orbit && orbit.focus && /^shelf-/.test(String(orbit.focus.type || ''))) {
    setFocusZone(null, true);
  }
  saveLyricLayout();
  showToast(fx.shelfCameraMode === 'static' ? '3D歌单架: 静态镜头' : '3D歌单架: 动态镜头');
}

function setShelfPresence(mode: string): void {
  fx.shelfPresence = normalizeShelfPresence(mode);
  updateShelfControlUi();
  if (shelfManager && shelfManager.setMode) shelfManager.setMode(fx.shelf);
  if (fx.shelfPresence === 'auto' && !shelfPinnedOpen) {
    shelfHoverCue.target = 0;
  }
  saveLyricLayout();
  showToast(fx.shelfPresence === 'always' ? '3D歌单架: 常驻' : '3D歌单架: 自动隐藏');
}
