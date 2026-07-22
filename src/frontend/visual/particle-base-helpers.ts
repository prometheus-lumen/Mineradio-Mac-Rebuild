function makeDotTexture(): THREE.CanvasTexture {
  var cv = document.createElement('canvas'); cv.width = cv.height = 64;
  var ctx = cv.getContext('2d');
  if (!ctx) throw new Error('2D canvas is unavailable');
  var g = ctx.createRadialGradient(32, 32, 0, 32, 32, 31);
  g.addColorStop(0.00, 'rgba(255,255,255,0.96)');
  g.addColorStop(0.42, 'rgba(255,255,255,0.78)');
  g.addColorStop(0.72, 'rgba(255,255,255,0.22)');
  g.addColorStop(1.00, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 64, 64);
  var tex = new THREE.CanvasTexture(cv);
  tex.minFilter = THREE.LinearFilter; tex.magFilter = THREE.LinearFilter;
  return tex;
}

function tweenParticleAlpha(from: number, to: number, durationMs: number): void {
  if (alphaTween) cancelAnimationFrame(alphaTween.raf);
  var start = performance.now();
  function step(now: number): void {
    var t = Math.min(1, (now - start) / durationMs);
    t = t * t * (3 - 2 * t);
    uniforms.uAlpha.value = from + (to - from) * t;
    if (t < 1) alphaTween = { raf: requestAnimationFrame(step) };
    else alphaTween = null;
  }
  alphaTween = { raf: requestAnimationFrame(step) };
}

function revealIdleParticles(_target?: number, _durationMs?: number): void {
  if (!uniforms || !uniforms.uFloatAlpha) return;
  if (floatAlphaTween) { cancelAnimationFrame(floatAlphaTween.raf); floatAlphaTween = null; }
  uniforms.uFloatAlpha.value = 0;
  if (floatGroup) destroyFloatLayer();
}

function activeBackgroundImageForParticles(song?: PlaylistSong): string {
  if (!fx || fx.backgroundImageAsAlbumParticles !== true || Number(fx.preset) !== 0) return '';
  var media = effectiveBackgroundMedia(song || currentCoverSong());
  return media && media.type === 'image' && media.src ? media.src : '';
}

function setParticleLyricsSilently(on: boolean): void {
  fx.particleLyrics = !!on;
  if (fx.particleLyrics) createLyricsParticles();
  else clearStageLyrics();
  lyricsVisible = fx.particleLyrics;
}
