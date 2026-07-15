function rgbToHsv(r: number, g: number, b: number): HsvColor {
  r /= 255; g /= 255; b /= 255;
  var max = Math.max(r, g, b), min = Math.min(r, g, b);
  var d = max - min, h = 0;
  if (d) {
    if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
    else if (max === g) h = ((b - r) / d + 2) / 6;
    else h = ((r - g) / d + 4) / 6;
  }
  return { h: h, s: max === 0 ? 0 : d / max, v: max };
}

function hsvToHex(h: number, s: number, v: number): string {
  h = ((h % 1) + 1) % 1; s = clampRange(s, 0, 1); v = clampRange(v, 0, 1);
  var i = Math.floor(h * 6), f = h * 6 - i;
  var p = v * (1 - s), q = v * (1 - f * s), t = v * (1 - (1 - f) * s);
  var r, g, b;
  switch (i % 6) {
    case 0: r = v; g = t; b = p; break;
    case 1: r = q; g = v; b = p; break;
    case 2: r = p; g = v; b = t; break;
    case 3: r = p; g = q; b = v; break;
    case 4: r = t; g = p; b = v; break;
    default: r = v; g = p; b = q; break;
  }
  return rgbToHexColor(r * 255, g * 255, b * 255);
}

function applyColorLabValue(hex: string, silent?: boolean): void {
  hex = normalizeHexColor(hex || '#000000', '#000000');
  var id = colorLabState.id;
  if (id === 'ui-accent-picker') setUiAccentColor(hex, true);
  else if (id === 'visual-tint-picker') setVisualTintCustom(hex, true);
  else if (id === 'home-accent-picker') setHomeAccentColor(hex, true);
  else if (id === 'home-icon-picker') setHomeIconColor(hex, true);
  else if (id === 'visual-icon-picker') setVisualIconColor(hex, true);
  else if (id === 'bg-color-picker') setCustomBackgroundColor(hex, true, true);
  else if (id === 'shelf-accent-picker') setShelfAccentColor(hex, true);
  else if (id === 'lyric-color-picker') setLyricColorCustom(hex, true);
  else if (id === 'lyric-highlight-picker') setLyricHighlightCustom(hex, true);
  else if (id === 'lyric-glow-picker') setLyricGlowCustom(hex, true);
  if (!silent) showToast('颜色: ' + hex.toUpperCase());
}

function syncColorLabUi(hex: string): void {
  hex = normalizeHexColor(hex || '#000000', '#000000');
  var rgb = hexToRgb(hex);
  var hsv = rgbToHsv(rgb.r, rgb.g, rgb.b);
  colorLabState.h = hsv.h; colorLabState.s = hsv.s; colorLabState.v = hsv.v;
  var pop = document.getElementById('color-lab-pop');
  var sv = document.getElementById('color-lab-sv');
  var cursor = document.getElementById('color-lab-cursor');
  var hue = document.querySelector<HTMLInputElement>('#color-lab-hue');
  var hexInput = document.querySelector<HTMLInputElement>('#color-lab-hex');
  var preview = document.getElementById('color-lab-preview');
  var hueHex = hsvToHex(colorLabState.h, 1, 1);
  if (pop) {
    pop.style.setProperty('--lab-color', hex);
    pop.style.setProperty('--lab-hue', hueHex);
  }
  if (sv) sv.style.setProperty('--lab-hue', hueHex);
  if (cursor) { cursor.style.left = (colorLabState.s * 100).toFixed(2) + '%'; cursor.style.top = ((1 - colorLabState.v) * 100).toFixed(2) + '%'; }
  if (hue) hue.value = String(Math.round(colorLabState.h * 360));
  if (hexInput) hexInput.value = hex.toUpperCase();
  if (preview) preview.style.setProperty('--lab-color', hex);
}

function closeColorLab(): void {
  var pop = document.getElementById('color-lab-pop');
  if (pop) pop.classList.remove('show');
  colorLabState.picker = null;
  colorLabState.id = '';
}

function openColorLabForPicker(picker: ColorLabPicker | null): void {
  var pop = document.getElementById('color-lab-pop');
  if (!picker || !pop) return;
  if (pop.classList.contains('show') && colorLabState.picker === picker) {
    closeColorLab();
    return;
  }
  colorLabState.picker = picker;
  colorLabState.id = picker.id || '';
  var label = picker.closest('.lyric-color-row');
  var title = document.getElementById('color-lab-title');
  if (title) title.textContent = label ? (label.textContent || 'Color').replace(/#[0-9a-f]{6}/ig, '').trim().slice(0, 24) : 'Color';
  syncColorLabUi(picker.value || '#000000');
  var presets = document.getElementById('color-lab-presets');
  if (presets) {
    presets.innerHTML = COLOR_LAB_PRESETS.map(function(p){
      return '<button type="button" title="' + escHtml(p.name) + '" style="--c:' + p.color + '" data-color="' + p.color + '"></button>';
    }).join('');
  }
  pop.classList.add('show');
  placeFxFloatingPanel(pop, label || picker, { gap: 12, pad: 14 });
}

function updateColorLabFromSv(e: PointerEvent): void {
  var sv = document.getElementById('color-lab-sv');
  if (!sv) return;
  var rect = sv.getBoundingClientRect();
  colorLabState.s = clampRange((e.clientX - rect.left) / Math.max(1, rect.width), 0, 1);
  colorLabState.v = 1 - clampRange((e.clientY - rect.top) / Math.max(1, rect.height), 0, 1);
  var hex = hsvToHex(colorLabState.h, colorLabState.s, colorLabState.v);
  syncColorLabUi(hex);
  applyColorLabValue(hex, true);
}

function bindColorLabPicker(picker: ColorLabPicker | null): void {
  if (!picker || picker._colorLabBound) return;
  var boundPicker = picker;
  boundPicker._colorLabBound = true;
  boundPicker.setAttribute('aria-haspopup', 'dialog');
  boundPicker.setAttribute('data-color-lab-picker', '1');
  function openFromPickerEvent(e: Event): void {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    boundPicker._colorLabOpenedAt = Date.now();
    openColorLabForPicker(boundPicker);
  }
  boundPicker.addEventListener('pointerdown', openFromPickerEvent);
  boundPicker.addEventListener('mousedown', function(e){ e.preventDefault(); e.stopPropagation(); });
  boundPicker.addEventListener('click', function(e){
    e.preventDefault();
    e.stopPropagation();
    if (Date.now() - (boundPicker._colorLabOpenedAt || 0) < 260) return;
    openColorLabForPicker(boundPicker);
  });
  boundPicker.addEventListener('keydown', function(e){
    if (e.key === 'Enter' || e.key === ' ') openFromPickerEvent(e);
  });
}

function bindColorLabRows(): void {
  document.querySelectorAll<ColorLabRow>('.lyric-color-row').forEach(function(row) {
    if (!row || row._colorLabRowBound || row.classList.contains('linked')) return;
    var picker = row.querySelector<ColorLabPicker>('.lyric-color-picker');
    if (!picker) return;
    var rowPicker = picker;
    row._colorLabRowBound = true;
    row.addEventListener('pointerdown', function(e){
      if (!(e.target instanceof Element)) return;
      if (e.target.closest('button,.fx-mini-btn,input[type="range"],select,textarea')) return;
      e.preventDefault();
      e.stopPropagation();
      rowPicker._colorLabOpenedAt = Date.now();
      openColorLabForPicker(rowPicker);
    });
  });
}
