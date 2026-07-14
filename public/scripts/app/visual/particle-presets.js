'use strict';

// Mineradio classic module: visual/particle-presets.
function applyStartupStarfieldPreset() {
  if (playing || currentIdx >= 0) return;
  startupVisualPreviewActive = true;
  var idlePreset = playbackVisualPreset === PARTICLE_CLOCK_PRESET_INDEX ? PARTICLE_CLOCK_PRESET_INDEX : 5;
  if (typeof setPreset === 'function' && fx.preset !== idlePreset) {
    setPreset(idlePreset, { silent: true, preserveCamera: false, skipTransition: true, noSave: true });
  } else if (typeof syncFxUniforms === 'function') {
    syncFxUniforms();
  }
}

function updateVisualTintControls() {
  var picker = document.getElementById('visual-tint-picker');
  var value = document.getElementById('visual-tint-value');
  var autoBtn = document.getElementById('visual-tint-auto-btn');
  var color = normalizeHexColor(fx.visualTintColor || '#9db8cf');
  document.documentElement.style.setProperty('--visual-tint', color);
  if (picker) picker.value = color;
  if (value) value.textContent = fx.visualTintMode === 'custom' ? color.toUpperCase() : '封面取色';
  if (autoBtn) autoBtn.classList.toggle('active', fx.visualTintMode !== 'custom');
}

// Measured from the 30 fps reference: light center, full decay time,
// decay exponent, outer field and mid-field luminance for every hit.
var STROBE_REFERENCE_PROFILES = [
  { x:1,   y:0,  duration:560,  exponent:2.52, edge:0.27, mid:0.72 },
  { x:78,  y:98, duration:637,  exponent:2.86, edge:0.27, mid:0.72 },
  { x:100, y:72, duration:590,  exponent:1.80, edge:0.38, mid:0.74 },
  { x:67,  y:98, duration:540,  exponent:1.80, edge:0.27, mid:0.72 },
  { x:49,  y:29, duration:1497, exponent:3.43, edge:0.69, mid:0.91 },
  { x:59,  y:66, duration:517,  exponent:1.80, edge:0.71, mid:0.92 },
  { x:49,  y:28, duration:563,  exponent:2.20, edge:0.71, mid:0.92 },
  { x:52,  y:33, duration:993,  exponent:1.93, edge:0.71, mid:0.92 },
  { x:50,  y:45, duration:893,  exponent:2.62, edge:0.71, mid:0.92 }
];

function resetStrobeFlash() {
  if (!strobeFlashState) return;
  strobeFlashState.active = false;
  var el = document.getElementById('strobe-bg');
  if (el) el.style.setProperty('--strobe-alpha', '0');
  document.documentElement.style.setProperty('--strobe-invert', '0');
}

function triggerStrobeFlash(strength, force) {
  if (!fx || fx.preset !== STROBE_PRESET_INDEX || !strobeFlashState) return;
  var now = performance.now();
  if (!force && now - strobeFlashState.lastTriggerAt < 220) return;
  var profile = STROBE_REFERENCE_PROFILES[strobeFlashState.sequence % STROBE_REFERENCE_PROFILES.length];
  var gradient = 'radial-gradient(ellipse 105% 78% at ' + profile.x + '% ' + profile.y + '%,rgba(255,255,255,1) 0%,rgba(248,248,248,.96) 18%,rgba(238,238,238,' + profile.mid.toFixed(3) + ') 54%,rgba(224,224,224,' + profile.edge.toFixed(3) + ') 100%)';
  var el = document.getElementById('strobe-bg');
  if (el) {
    el.style.setProperty('--strobe-gradient', gradient);
    el.style.setProperty('--strobe-alpha', '1');
  }
  document.documentElement.style.setProperty('--strobe-invert', '1');
  strobeFlashState.active = true;
  strobeFlashState.startedAt = now;
  strobeFlashState.duration = profile.duration;
  strobeFlashState.exponent = profile.exponent;
  strobeFlashState.peak = 1;
  strobeFlashState.lastTriggerAt = now;
  if (!force) strobeFlashState.sequence++;
}

function syncStrobePresetState(preview) {
  var active = !!(fx && fx.preset === STROBE_PRESET_INDEX);
  document.body.classList.toggle('strobe-preset', active);
  if (!active) {
    resetStrobeFlash();
    return;
  }
  if (preview) {
    strobeFlashState.sequence = 0;
    triggerStrobeFlash(0.52, true);
  }
}

function updateStrobeFlash(now) {
  if (!fx || fx.preset !== STROBE_PRESET_INDEX || !strobeFlashState) {
    if (document.body.classList.contains('strobe-preset')) syncStrobePresetState(false);
    return;
  }
  if (!document.body.classList.contains('strobe-preset')) syncStrobePresetState(false);
  if (beatOnsetFlag) {
    var strength = clampRange((Math.max(beatPulse, scheduledBeatPulse, smoothBass) - 0.12) / 0.62, 0, 1);
    triggerStrobeFlash(strength, false);
  }
  if (!strobeFlashState.active) return;
  var t = clampRange((now - strobeFlashState.startedAt) / strobeFlashState.duration, 0, 1);
  var alpha = Math.pow(1 - t, strobeFlashState.exponent) * strobeFlashState.peak;
  var el = document.getElementById('strobe-bg');
  if (el) el.style.setProperty('--strobe-alpha', alpha.toFixed(4));
  document.documentElement.style.setProperty('--strobe-invert', alpha.toFixed(4));
  if (t >= 1) resetStrobeFlash();
}

function setVisualTintAuto() {
  fx.visualTintMode = 'auto';
  updateVisualTintControls();
  syncFxUniforms();
  saveLyricLayout();
  showToast('视觉主色: 封面取色');
}

function resetVisualTintColor() {
  fx.visualTintMode = 'auto';
  fx.visualTintColor = normalizeHexColor(fxDefaults.visualTintColor || '#9db8cf');
  updateVisualTintControls();
  syncFxUniforms();
  saveLyricLayout();
  showToast('视觉主色已恢复默认');
}

function setVisualTintCustom(color, silent) {
  fx.visualTintMode = 'custom';
  fx.visualTintColor = normalizeHexColor(color || '#9db8cf');
  updateVisualTintControls();
  syncFxUniforms();
  saveLyricLayout();
  if (!silent) showToast('视觉主色: ' + fx.visualTintColor.toUpperCase());
}

function buildPresetGrid() {
  var grid = document.getElementById('preset-grid');
  if (!grid) return;
  var seen = {};
  var order = presetDisplayOrder.filter(function(id){
    var ok = id >= 0 && id < presetMeta.length && !seen[id];
    seen[id] = true;
    return ok;
  });
  presetMeta.forEach(function(_, id){
    if (!seen[id]) order.push(id);
  });
  grid.innerHTML = order.map(function(i){
    var p = presetMeta[i];
    var desc = p.descHtml || p.desc;
    return '<div class="preset-card" data-preset="' + i + '" onclick="setPreset(' + i + ')">' +
      '<div class="pc-icon">' + presetIcons[i] + '</div>' +
      '<div class="pc-name">' + p.name + '</div>' +
      '<div class="pc-desc">' + desc + '</div>' +
    '</div>';
  }).join('');
  refreshPresetGrid();
}

function refreshPresetGrid() {
  document.querySelectorAll('.preset-card').forEach(function(el){
    el.classList.toggle('active', Number(el.dataset.preset) === fx.preset);
  });
}

function triggerPresetParticleTransition(fromPreset, toPreset) {
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
  var card = document.querySelector('.preset-card[data-preset="' + toPreset + '"]');
  if (card) {
    card.classList.remove('switching');
    void card.offsetWidth;
    card.classList.add('switching');
    setTimeout(function(){ card.classList.remove('switching'); }, 760);
  }
}

function tickPresetTransition() {
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

function setPreset(p, opts) {
  opts = opts || {};
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

function syncFxUniforms() {
  uniforms.uPreset.value = fx.preset;
  uniforms.uIntensity.value = fx.intensity;
  uniforms.uDepth.value = fx.depth;
  uniforms.uPointScale.value = fx.point;
  uniforms.uSpeed.value = fx.speed;
  uniforms.uTwist.value = fx.twist;
  uniforms.uColorBoost.value = fx.color;
  uniforms.uScatter.value = fx.scatter;
  uniforms.uCoverRes.value = normalizeCoverResolution(fx.coverResolution);
  uniforms.uBgFade.value = fx.bgFade;
  uniforms.uBloomStrength.value = fx.bloom ? fx.bloomStrength : 0;
  if (bloomParticles) bloomParticles.visible = fx.preset !== HEXAGRAM_PRESET_INDEX && fx.preset !== STROBE_PRESET_INDEX && fx.bloom && fx.bloomStrength > 0.01;
  uniforms.uEdgeEnabled.value = fx.edge ? 1 : 0;
  if (uniforms.uTintColor) uniforms.uTintColor.value.set(normalizeHexColor(fx.visualTintColor || '#9db8cf'));
  if (uniforms.uTintStrength) uniforms.uTintStrength.value = fx.visualTintMode === 'custom' ? 0.42 : 0;
  syncSkullParticleColors();
}
