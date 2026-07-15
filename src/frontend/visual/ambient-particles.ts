var BASS_THRESHOLD: number;
var RIPPLE_COOLDOWN: number;

function createFloatLayer(): void {
  fx.floatLayer = false;
  if (uniforms?.uFloatAlpha) uniforms.uFloatAlpha.value = 0;
  if (floatGroup) destroyFloatLayer();
}

function destroyFloatLayer(): void {
  if (!floatGroup) return;
  scene.remove(floatGroup);
  floatGroup.geometry.dispose(); floatGroup.material.dispose();
  floatGroup = null;
}

function updateFloatLayer(_dt: number): void {
  // 漂移已在 shader 中完成, JS 不需要每帧改 buffer
}

function resetFloatColorsToIdle(): void {
  if (!floatGroup || !floatColorArr) return;
  for (var i = 0; i < FLOAT_COUNT; i++) {
    var white = 0.88 + (i % 17) / 17 * 0.12;
    floatColorArr[i*3] = white;
    floatColorArr[i*3+1] = white;
    floatColorArr[i*3+2] = white;
  }
  floatGroup.geometry.attributes.aColor.needsUpdate = true;
}

function triggerRipple(x: number, y: number, strength: number): void {
  var r = ripples[rippleIdx];
  r.x = x; r.y = y; r.age = 0; r.str = strength;
  rippleIdx = (rippleIdx + 1) % RIPPLE_MAX;
}

function updateRipples(dt: number): void {
  var isBassHit = bass > BASS_THRESHOLD && !lastBassRising;
  lastBassRising = bass > BASS_THRESHOLD * 0.75;
  var now = uniforms?.uTime?.value ?? 0;
  if (isBassHit && (now - lastRippleAt) > RIPPLE_COOLDOWN) {
    lastRippleAt = now;
    var count = 2 + (Math.random() < 0.5 ? 0 : 1);
    var used: Record<number, boolean> = {};
    for (var k = 0; k < count; k++) {
      var idx, tries = 0;
      do { idx = Math.floor(Math.random() * 9); tries++; } while (used[idx] && tries < 12);
      used[idx] = true;
      var reg = regions[idx];
      var jx = reg.x + (Math.random() - 0.5) * 0.7;
      var jy = reg.y + (Math.random() - 0.5) * 0.7;
      var str = 0.65 + bass * 1.4 + Math.random() * 0.25;
      triggerRipple(jx, jy, str);
    }
  }

  for (var i = 0; i < RIPPLE_MAX; i++) {
    var r = ripples[i];
    if (r.str > 0.005) {
      r.age += dt;
      if (r.age > 2.0) { r.str = 0; r.age = -10; }
    }
    var off = i * 4;
    rippleData[off]   = r.x;
    rippleData[off+1] = r.y;
    rippleData[off+2] = r.age;
    rippleData[off+3] = r.str;
  }
  rippleTex.needsUpdate = true;

  var active = 0;
  for (var i = 0; i < RIPPLE_MAX; i++) if (ripples[i].str > 0.005) active++;
  if (uniforms?.uRippleCount) uniforms.uRippleCount.value = active;
}

function __mineradioInitVisualAmbientParticles33(): void {
  // ============================================================
  //  涟漪触发系统 — 3×3 九宫格 + bass 上升沿
  // ============================================================
  rippleIdx = 0;

  lastRippleAt = 0;

  lastBassRising = false;

  BASS_THRESHOLD = 0.30;

  RIPPLE_COOLDOWN = 0.32;

  regions = [];

  for (var row = 0; row < 3; row++) for (var column = 0; column < 3; column++) {
    regions.push({
      x: (column / 2 - 0.5) * PLANE_SIZE * 0.72,
      y: (row / 2 - 0.5) * PLANE_SIZE * 0.72,
    });
  }
}
