function applyStartupStarfieldPreset(): void {
  if (playing || currentIdx >= 0) return;
  startupVisualPreviewActive = true;
  var idlePreset = playbackVisualPreset === PARTICLE_CLOCK_PRESET_INDEX ? PARTICLE_CLOCK_PRESET_INDEX : 5;
  if (typeof setPreset === 'function' && fx.preset !== idlePreset) {
    setPreset(idlePreset, { silent: true, preserveCamera: false, skipTransition: true, noSave: true });
  } else if (typeof syncFxUniforms === 'function') {
    syncFxUniforms();
  }
}

function updateVisualTintControls(): void {
  var picker = document.querySelector<HTMLInputElement>('#visual-tint-picker');
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
var STROBE_REFERENCE_PROFILES: StrobeReferenceProfile[] = [
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

function resetStrobeFlash(): void {
  if (!strobeFlashState) return;
  strobeFlashState.active = false;
  var layer = document.getElementById('strobe-flash-layer');
  if (layer) layer.style.opacity = '0';
}

function syncStrobeBackgroundConfig(): void {
  var enabled = !!(fx && fx.strobeCustomBackground);
  var transparency = clampRange(fx && fx.strobeCustomBackgroundOpacity != null ? Number(fx.strobeCustomBackgroundOpacity) : 0.65, 0, 1);
  document.body.classList.toggle('strobe-custom-background', enabled);
  document.documentElement.style.setProperty('--strobe-custom-background-opacity', (1 - transparency).toFixed(3));
  var toggle = document.getElementById('strobe-background-toggle');
  var slider = document.querySelector<HTMLInputElement>('#fx-strobe-bg-opacity');
  var sliderRow = document.getElementById('strobe-opacity-slider');
  if (toggle) {
    toggle.classList.toggle('on', enabled);
    toggle.setAttribute('aria-checked', enabled ? 'true' : 'false');
  }
  if (slider) {
    slider.value = String(transparency);
    slider.disabled = !enabled;
    var output = slider.parentElement && slider.parentElement.querySelector('output');
    if (output) output.textContent = Math.round(transparency * 100) + '%';
  }
  if (sliderRow) sliderRow.classList.toggle('disabled', !enabled);
}

function toggleStrobeSettings(event?: Event): void {
  if (event) {
    event.preventDefault();
    event.stopPropagation();
    if (event.stopImmediatePropagation) event.stopImmediatePropagation();
  }
  var panel = document.getElementById('strobe-settings');
  var button = document.querySelector('.preset-config-btn[data-config="strobe"]');
  if (!panel) return;
  var open = !panel.classList.contains('open');
  panel.classList.toggle('open', open);
  if (button) {
    button.classList.toggle('active', open);
    button.setAttribute('aria-expanded', open ? 'true' : 'false');
  }
  syncStrobeBackgroundConfig();
  holdFxPanelAfterClick(2200);
  showToast(open ? '已打开闪光灯配置' : '已收起闪光灯配置');
  if (open) {
    var activePanel = panel;
    requestAnimationFrame(function() { activePanel.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); });
  }
}

function toggleStrobeCustomBackground(): void {
  fx.strobeCustomBackground = !fx.strobeCustomBackground;
  syncStrobeBackgroundConfig();
  saveLyricLayout();
  showToast(fx.strobeCustomBackground ? '闪光灯: 显示自定义背景' : '闪光灯: 隐藏自定义背景');
}

function triggerStrobeFlash(_strength: number, force: boolean): void {
  if (!fx || fx.preset !== STROBE_PRESET_INDEX || !strobeFlashState) return;
  var now = performance.now();
  if (!force && now - strobeFlashState.lastTriggerAt < 220) return;
  var profile = STROBE_REFERENCE_PROFILES[strobeFlashState.sequence % STROBE_REFERENCE_PROFILES.length];
  var gradient = 'radial-gradient(ellipse 105% 78% at ' + profile.x + '% ' + profile.y + '%,rgba(255,255,255,1) 0%,rgba(248,248,248,.96) 18%,rgba(238,238,238,' + profile.mid.toFixed(3) + ') 54%,rgba(224,224,224,' + profile.edge.toFixed(3) + ') 100%)';
  var layer = document.getElementById('strobe-flash-layer');
  if (layer) {
    layer.style.background = gradient;
    layer.style.opacity = '1';
  }
  strobeFlashState.active = true;
  strobeFlashState.startedAt = now;
  strobeFlashState.duration = profile.duration;
  strobeFlashState.exponent = profile.exponent;
  strobeFlashState.peak = 1;
  strobeFlashState.lastTriggerAt = now;
  if (!force) strobeFlashState.sequence++;
}

function syncStrobePresetState(preview: boolean): void {
  var active = !!(fx && fx.preset === STROBE_PRESET_INDEX);
  document.body.classList.toggle('strobe-preset', active);
  syncStrobeBackgroundConfig();
  if (!active) {
    resetStrobeFlash();
    return;
  }
  if (preview) {
    strobeFlashState.sequence = 0;
    triggerStrobeFlash(0.52, true);
  }
}

function updateStrobeFlash(now: number): void {
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
  var layer = document.getElementById('strobe-flash-layer');
  if (layer) layer.style.opacity = alpha.toFixed(4);
  if (t >= 1) resetStrobeFlash();
}

function setVisualTintAuto(): void {
  fx.visualTintMode = 'auto';
  updateVisualTintControls();
  syncFxUniforms();
  saveLyricLayout();
  showToast('视觉主色: 封面取色');
}

function resetVisualTintColor(): void {
  fx.visualTintMode = 'auto';
  fx.visualTintColor = normalizeHexColor(fxDefaults.visualTintColor || '#9db8cf');
  updateVisualTintControls();
  syncFxUniforms();
  saveLyricLayout();
  showToast('视觉主色已恢复默认');
}

function setVisualTintCustom(color: string, silent?: boolean): void {
  fx.visualTintMode = 'custom';
  fx.visualTintColor = normalizeHexColor(color || '#9db8cf');
  updateVisualTintControls();
  syncFxUniforms();
  saveLyricLayout();
  if (!silent) showToast('视觉主色: ' + fx.visualTintColor.toUpperCase());
}
