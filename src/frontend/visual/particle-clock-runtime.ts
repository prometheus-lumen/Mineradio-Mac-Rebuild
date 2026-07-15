function getParticleClockIdleRenderFps(): number {
  if (!(fx && fx.preset === PARTICLE_CLOCK_PRESET_INDEX)) return 0;
  if (typeof isRenderInteractionActive === 'function' && isRenderInteractionActive()) return 0;
  if (typeof playing !== 'undefined' && playing && typeof audio !== 'undefined' && audio && !audio.paused) return 0;
  if (presetTransition && presetTransition.active) return 36;
  var quality = normalizePerformanceQuality(fx && fx.performanceQuality);
  if (quality === 'eco') return 8;
  if (quality === 'balanced') return 10;
  if (quality === 'ultra') return 18;
  return 12;
}
