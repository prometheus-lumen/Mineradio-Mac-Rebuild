function lyricPaletteFromHex(hex: string): LyricPalette {
  var c = hexToRgb(hex);
  var hsl = rgbToHsl(c.r, c.g, c.b);
  var neutral = hsl.s < 0.035;
  var s = neutral ? 0 : clampRange(hsl.s * 1.08, 0.14, 0.92);
  var l = hsl.l;
  if (l < 0.11) l = 0.15 + l * 1.18;
  else if (l < 0.28) l = 0.21 + (l - 0.11) * 1.18;
  else l = clampRange(l, 0.30, 0.82);
  l = clampRange(l, 0.14, 0.84);
  var primary = hslToRgb(hsl.h, s, l);
  var secondary = hslToRgb((hsl.h + 0.055) % 1, neutral ? 0 : clampRange(s * 0.88, 0.12, 0.78), clampRange(l + (l < 0.38 ? 0.10 : -0.08), 0.18, 0.76));
  var highlight = hslToRgb((hsl.h + 0.018) % 1, neutral ? 0 : clampRange(s * 0.72, 0.10, 0.70), clampRange(l + 0.22, 0.38, 0.92));
  var darkText = l < 0.40;
  return {
    primary: rgbCss(primary),
    secondary: rgbCss(secondary),
    highlight: rgbCss(highlight),
    shadow: darkText ? 'rgba(0,6,10,0.46)' : 'rgba(248,253,255,0.34)',
    glow: rgbCss(primary, 0.26),
  };
}

function silverBlueLyricPalette(): LyricPalette {
  return {
    primary: '#d8f1ff',
    secondary: '#9db8cf',
    highlight: '#eef7ff',
    shadow: 'rgba(0,7,12,0.48)',
    glow: 'rgba(138,190,255,0.26)',
  };
}

function applyLyricPaletteToMesh(mesh: THREE.Object3D | null): void {
  if (!mesh || !mesh.userData || !mesh.userData.lyric) return;
  var pal = stageLyrics.palette || {};
  var data = mesh.userData.lyric;
  if (data.textMat && data.textMat.uniforms) {
    var u = data.textMat.uniforms;
    if (u.uBaseColor) u.uBaseColor.value.copy(lyricThreeColor(pal.primary, '#d6f8ff', 0.38));
    if (u.uHiColor) u.uHiColor.value.copy(lyricThreeColor(pal.highlight || pal.primary, '#fff0b8', 0.48));
    if (u.uGlowColor) u.uGlowColor.value.copy(lyricThreeColor(pal.glowColor || pal.secondary || pal.primary, '#9cffdf', 0.36));
    if (u.uSolarColor) u.uSolarColor.value.copy(lyricThreeColor(pal.highlight || pal.secondary || pal.primary, '#fff0b8', 0.50));
    if (u.uSolar && !isFinite(u.uSolar.value)) u.uSolar.value = 0;
    if (u.uOpacity && !isFinite(u.uOpacity.value)) u.uOpacity.value = 0;
    data.textMat.needsUpdate = true;
  }
  if (data.glowMat) data.glowMat.color.copy(lyricThreeColor(pal.glowColor || pal.secondary || pal.primary, '#9cffdf', 0.36));
  if (data.sparkMat) setLyricSparkColor(data, lyricThreeColor(pal.highlight || pal.secondary || pal.primary, '#fff0b8', 0.46));
  if (data.sunMat) data.sunMat.color.copy(lyricThreeColor(pal.highlight || pal.secondary || pal.primary, '#fff0b8', 0.50));
}

function effectiveLyricPalette(pal?: Partial<LyricPalette>): LyricPalette {
  var src = pal || stageLyrics.coverPalette || stageLyrics.palette || {};
  var out: LyricPalette = {
    primary: src.primary || '#d6f8ff',
    secondary: src.secondary || '#9cffdf',
    highlight: src.highlight || '#eef7ff',
    shadow: src.shadow || 'rgba(2,8,12,0.42)',
    glow: src.glow || 'rgba(143,233,255,0.34)'
  };
  if (fx.lyricHighlightMode === 'custom') {
    var hi = lyricPaletteFromHex(fx.lyricHighlightColor);
    out.highlight = hi.primary;
    if (fx.lyricGlowLinked !== false) {
      out.glowColor = hi.secondary || hi.primary;
      out.glow = hi.glow || out.glow;
    }
  }
  if (fx.lyricGlowLinked === false) {
    var glowPal = lyricPaletteFromHex(fx.lyricGlowColor || '#9db8cf');
    out.glowColor = glowPal.primary;
    out.glow = glowPal.glow || out.glow;
  }
  if (!out.glowColor) out.glowColor = out.secondary;
  return out;
}

function setStageLyricPalette(pal?: Partial<LyricPalette>): void {
  stageLyrics.palette = effectiveLyricPalette(pal);
  lyricSunColor.copy(lyricThreeColor(stageLyrics.palette.glowColor || stageLyrics.palette.secondary || stageLyrics.palette.primary, '#ffe6a4', 0.44));
  lyricSunHotColor.copy(lyricThreeColor(stageLyrics.palette.highlight || stageLyrics.palette.primary, '#fff4cc', 0.54));
  applyLyricPaletteToMesh(stageLyrics.current);
  stageLyrics.outgoing.forEach(applyLyricPaletteToMesh);
  syncSkullParticleColors();
}

function lyricTextPaletteFromHsl(hsl: HslColor, avgL: number, chroma: number): LyricPalette {
  if (avgL < 0.16 || chroma < 0.08) {
    return silverBlueLyricPalette();
  }
  var hue = hsl.h;
  if (avgL < 0.30 && (hue < 0.06 || hue > 0.86 || (hue > 0.75 && hue < 0.86))) return silverBlueLyricPalette();
  if (avgL > 0.82 && chroma < 0.12) {
    return {
      primary: '#064b5b',
      secondary: '#168c88',
      highlight: '#315f68',
      shadow: 'rgba(255,255,255,0.48)',
      glow: 'rgba(143,233,255,0.14)',
    };
  }
  var lightText = avgL < 0.52;
  var s = Math.max(0.42, Math.min(0.78, hsl.s + 0.16));
  var c1 = hslToRgb(hsl.h, s, lightText ? 0.74 : 0.34);
  var c2 = hslToRgb((hsl.h + 0.08) % 1, Math.max(0.36, s - 0.10), lightText ? 0.62 : 0.46);
  return {
    primary: rgbCss(c1),
    secondary: rgbCss(c2),
    highlight: rgbCss(hslToRgb((hsl.h + 0.03) % 1, Math.max(0.28, s - 0.18), lightText ? 0.86 : 0.58)),
    shadow: lightText ? 'rgba(0,6,10,0.44)' : 'rgba(248,253,255,0.40)',
    glow: rgbCss(c1, lightText ? 0.24 : 0.14),
  };
}

function updateLyricPaletteFromCover(coverCanvas: HTMLCanvasElement | null): void {
  if (!coverCanvas) return;
  try {
    var ctx = coverCanvas.getContext('2d');
    if (!ctx) return;
    var img = ctx.getImageData(0, 0, coverCanvas.width, coverCanvas.height).data;
    var w = coverCanvas.width, h = coverCanvas.height;
    var sumR = 0, sumG = 0, sumB = 0, count = 0;
    var best = { score:-1, r:143, g:233, b:255 };
    for (var y = 0; y < h; y += 8) {
      for (var x = 0; x < w; x += 8) {
        var di = (y * w + x) * 4;
        var r = img[di], g = img[di+1], b = img[di+2], a = img[di+3] / 255;
        if (a < 0.5) continue;
        var lum = (r * 0.299 + g * 0.587 + b * 0.114) / 255;
        var maxC = Math.max(r, g, b), minC = Math.min(r, g, b);
        var chroma = (maxC - minC) / 255;
        var edgePenalty = Math.abs(lum - 0.5);
        var score = chroma * 1.6 + (0.5 - edgePenalty) * 0.45;
        sumR += r; sumG += g; sumB += b; count++;
        if (lum > 0.08 && lum < 0.92 && score > best.score) best = { score:score, r:r, g:g, b:b };
      }
    }
    if (!count) return;
    var avgL = (sumR / count * 0.299 + sumG / count * 0.587 + sumB / count * 0.114) / 255;
    var hsl = rgbToHsl(best.r, best.g, best.b);
    stageLyrics.coverPalette = lyricTextPaletteFromHsl(hsl, avgL, Math.max(0, best.score));
    if (fx.lyricColorMode !== 'custom') setStageLyricPalette(stageLyrics.coverPalette);
  } catch (e) {}
}

function cssColorToThreeColor(css: string | undefined, fallback?: string): THREE.Color {
  var c = new THREE.Color(fallback || '#d6f8ff');
  var value = String(css || fallback || '#d6f8ff').trim();
  try {
    if (/^#[0-9a-f]{3}$/i.test(value) || /^#[0-9a-f]{6}$/i.test(value)) {
      c.set(normalizeHexColor(value));
      return c;
    }
    var m = value.match(/^rgba?\(\s*([.\d]+)\s*,\s*([.\d]+)\s*,\s*([.\d]+)/i);
    if (m) {
      c.setRGB(
        Math.max(0, Math.min(255, parseFloat(m[1]))) / 255,
        Math.max(0, Math.min(255, parseFloat(m[2]))) / 255,
        Math.max(0, Math.min(255, parseFloat(m[3]))) / 255
      );
      return c;
    }
    c.setStyle(value);
  } catch (e) {
    try { c.set(normalizeHexColor(fallback || '#d6f8ff')); } catch (e2) {}
  }
  return c;
}

function lyricThreeColor(css: string | undefined, fallback?: string, minLum?: number): THREE.Color {
  var c = cssColorToThreeColor(css, fallback || '#d6f8ff');
  var lum = c.r * 0.299 + c.g * 0.587 + c.b * 0.114;
  var floor = minLum == null ? 0.34 : minLum;
  if (lum < floor) {
    var lift = floor - lum;
    c.r = Math.min(1, c.r + lift);
    c.g = Math.min(1, c.g + lift);
    c.b = Math.min(1, c.b + lift);
  }
  return c;
}

function applySavedLyricPaletteState(): void {
  if (!stageLyrics) return;
  setStageLyricPalette(fx.lyricColorMode === 'custom'
    ? lyricPaletteFromHex(fx.lyricColor)
    : (stageLyrics.coverPalette || stageLyrics.palette));
  updateLyricColorControls();
  updateLyricHighlightControls();
  updateLyricGlowControls();
}
