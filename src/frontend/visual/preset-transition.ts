function triggerPresetParticleTransition(fromPreset: number, toPreset: number): void {
  if (!uniforms) return;
  presetTransition.active = true;
  presetTransition.start = uniforms.uTime.value;
  presetTransition.duration = toPreset === 5 ? 0.30 : (toPreset === HEXAGRAM_PRESET_INDEX || toPreset === PARTICLE_CLOCK_PRESET_INDEX ? 0.42 : 0.24);
  presetTransition.from = fromPreset;
  presetTransition.to = toPreset;
  var newVisual = toPreset >= 4;
  var wallpaperFlow = toPreset === 5 || toPreset === HEXAGRAM_PRESET_INDEX || toPreset === PARTICLE_CLOCK_PRESET_INDEX;
  var clockFlow = toPreset === PARTICLE_CLOCK_PRESET_INDEX;
  uniforms.uScatter.value = Math.max(uniforms.uScatter.value, fx.scatter + (newVisual ? (toPreset === HEXAGRAM_PRESET_INDEX ? 0.006 : (clockFlow ? 0.004 : (wallpaperFlow ? 0.008 : 0.024))) : 0.12));
  uniforms.uBurstAmt.value = Math.max(uniforms.uBurstAmt.value, toPreset === HEXAGRAM_PRESET_INDEX ? 0.20 : (clockFlow ? 0.12 : (wallpaperFlow ? 0.05 : 0.15)));
  camPunch = Math.max(camPunch, toPreset === HEXAGRAM_PRESET_INDEX ? 0.10 : (clockFlow ? 0.035 : (wallpaperFlow ? 0.04 : 0.12)));
  for (var i = 0; i < 3; i++) {
    triggerRipple((Math.random() - 0.5) * 3.4, (Math.random() - 0.5) * 3.4, 0.58 + Math.random() * 0.32);
  }
  var card = document.querySelector<HTMLElement>('.preset-card[data-preset="' + toPreset + '"]');
  if (card) {
    card.classList.remove('switching');
    void card.offsetWidth;
    card.classList.add('switching');
    var activeCard = card;
    setTimeout(function() { activeCard.classList.remove('switching'); }, 760);
  }
}

function tickPresetTransition(): void {
  if (!uniforms) return;
  if (!presetTransition.active) return;
  var raw = (uniforms.uTime.value - presetTransition.start) / presetTransition.duration;
  var t = Math.max(0, Math.min(1, raw));
  var wave = Math.sin(t * Math.PI);
  var newVisual = presetTransition.to >= 4;
  var wallpaperFlow = presetTransition.to === 5 || presetTransition.to === HEXAGRAM_PRESET_INDEX || presetTransition.to === PARTICLE_CLOCK_PRESET_INDEX;
  var clockFlow = presetTransition.to === PARTICLE_CLOCK_PRESET_INDEX;
  uniforms.uScatter.value = Math.max(uniforms.uScatter.value, fx.scatter + wave * (newVisual ? (presetTransition.to === HEXAGRAM_PRESET_INDEX ? 0.010 : (clockFlow ? 0.005 : (wallpaperFlow ? 0.008 : 0.026))) : 0.16));
  uniforms.uBurstAmt.value = Math.max(uniforms.uBurstAmt.value, wave * (presetTransition.to === HEXAGRAM_PRESET_INDEX ? 0.20 : (clockFlow ? 0.11 : (wallpaperFlow ? 0.045 : (newVisual ? 0.12 : 0.15)))));
  uniforms.uPointScale.value = fx.point * (1 + wave * (presetTransition.to === HEXAGRAM_PRESET_INDEX ? 0.032 : (clockFlow ? 0.012 : (wallpaperFlow ? 0.016 : 0.048))));
  if (raw >= 1) {
    presetTransition.active = false;
    syncFxUniforms();
  }
}

function setPreset(p: number, opts: PresetOptions = {}): void {
  if (!uniforms) return;
  p = Math.max(0, Math.min(presetMeta.length - 1, Number(p) || 0));
  var prev = fx.preset;
  var changed = prev !== p;
  fx.preset = p;
  if (changed && prev === SKULL_PRESET_INDEX && p !== SKULL_PRESET_INDEX) clearSkullPresetResidue();
  if (p === SKULL_PRESET_INDEX) loadSkullParticleAsset();
  uniforms.uPreset.value = p;
  syncStrobePresetState(changed && !opts.skipTransition);
  refreshPresetGrid();
  if (changed && !opts.skipTransition) triggerPresetParticleTransition(prev, p);
  // 每个预设对应的相机基线 (改 userOrbit)
  if (changed && !opts.preserveCamera) {
    if (p === 1)      { orbit.userRadius = 6.2; orbit.userPhi = 0.03; orbit.userTheta = 0.0; orbit.baselineRadius = 6.2; orbit.baselinePhi = 0.03; }
    else if (p === 2) { orbit.userRadius = 7.0; orbit.userPhi = 0.15; orbit.userTheta = 0.0; orbit.baselineRadius = 7.0; orbit.baselinePhi = 0.15; }
    else if (p === 3) { orbit.userRadius = 8.0; orbit.userPhi = 0.05; orbit.userTheta = 0.0; orbit.baselineRadius = 8.0; orbit.baselinePhi = 0.05; }
    else if (p === 4) { orbit.userRadius = 6.5; orbit.userPhi = 0.04; orbit.userTheta = 0.0; orbit.baselineRadius = 6.5; orbit.baselinePhi = 0.04; }
    else if (p === 5) { orbit.userRadius = 9.4; orbit.userPhi = 0.34; orbit.userTheta = -0.52; orbit.baselineRadius = 9.4; orbit.baselinePhi = 0.34; }
    else if (p === 6) { orbit.userRadius = 7.4; orbit.userPhi = 0.10; orbit.userTheta = 0.18; orbit.baselineRadius = 7.4; orbit.baselinePhi = 0.10; }
    else if (p === HEXAGRAM_PRESET_INDEX) { orbit.userRadius = 7.6; orbit.userPhi = 0.08; orbit.userTheta = 0.0; orbit.baselineRadius = 7.6; orbit.baselinePhi = 0.08; }
    else if (p === PARTICLE_CLOCK_PRESET_INDEX) { orbit.userRadius = 7.6; orbit.userPhi = 0.02; orbit.userTheta = 0.0; orbit.baselineRadius = 7.6; orbit.baselinePhi = 0.02; }
    else              { orbit.userRadius = 6.6; orbit.userPhi = 0.08; orbit.userTheta = 0.0; orbit.baselineRadius = 6.6; orbit.baselinePhi = 0.08; }
    orbit.baselineTheta = p === 5 ? -0.52 : (p === 6 ? 0.18 : 0.0);
  }
  if (changed && !opts.silent) showToast('视觉预设: ' + presetMeta[p].name);
  var shouldCommitPlaybackPreset = !!opts.commitPlaybackPreset || !opts.noSave;
  if (shouldCommitPlaybackPreset) {
    playbackVisualPreset = p;
    startupVisualPreviewActive = false;
  }
  if (!opts.noSave) {
    saveLyricLayout();
  }
}
