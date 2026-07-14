'use strict';

// Mineradio classic module: lyrics/lyric-effects.
function requestStageLyricCameraSnap(frames) {
  if (typeof stageLyrics === 'undefined' || !stageLyrics) return;
  stageLyrics.snapCameraLockFrames = Math.max(stageLyrics.snapCameraLockFrames || 0, frames || 8);
}

function shouldAvoidStageLyricsForShelf() {
  if (!shelfManager || !shelfManager.getMode || shelfManager.getMode() !== 'side') return false;
  if (shelfAlwaysVisible()) return true;
  if (shelfPinnedOpen) return true;
  if (shelfManager.hasOpenContent && shelfManager.hasOpenContent()) return true;
  return !!(shelfVisibility > 0.24 || (shelfHoverCue && shelfHoverCue.value > 0.28));
}

function isCascadeLyricFlow() {
  var mode = fx && normalizeLyricFlowMode(fx.lyricFlowMode);
  return mode === 'cascade' || mode === 'cloud' || mode === 'network';
}

function resolvedLyricFlowMode(advance) {
  var selected = normalizeLyricFlowMode(fx && fx.lyricFlowMode);
  if (selected !== 'auto') return selected;
  if (advance && stageLyrics.autoFlowLinesRemaining > 0) stageLyrics.autoFlowLinesRemaining -= 1;
  if (!stageLyrics.autoFlowMode || stageLyrics.autoFlowLinesRemaining <= 0) {
    var previous = stageLyrics.autoFlowMode;
    var index = Math.floor(Math.random() * LYRIC_SCENE_MODES.length);
    if (LYRIC_SCENE_MODES[index] === previous) index = (index + 1) % LYRIC_SCENE_MODES.length;
    stageLyrics.autoFlowMode = LYRIC_SCENE_MODES[index];
    stageLyrics.autoFlowLinesRemaining = 2 + Math.floor(Math.random() * 2);
  }
  return stageLyrics.autoFlowMode;
}

function lyricWarpRadicalInverse(index, base) {
  var result = 0;
  var fraction = 1 / base;
  while (index > 0) {
    result += (index % base) * fraction;
    index = Math.floor(index / base);
    fraction /= base;
  }
  return result;
}

function nextLyricWarpAnchor(kind) {
  var exit = kind === 'exit';
  var indexKey = exit ? 'warpExitIndex' : 'warpEntryIndex';
  var offset = exit ? stageLyrics.warpExitOffset : stageLyrics.warpEntryOffset;
  stageLyrics[indexKey] = (stageLyrics[indexKey] || 0) + 1;
  var index = stageLyrics[indexKey];
  var cell = ((index - 1) * 5 + Math.floor(offset.x * 24)) % 24;
  var column = cell % 6;
  var row = Math.floor(cell / 6);
  return {
    x: (column + (lyricWarpRadicalInverse(index, 2) + offset.y) % 1) / 6,
    y: (row + (lyricWarpRadicalInverse(index, 3) + offset.x) % 1) / 4
  };
}

function resolveLyricWarpPosition(mesh, kind) {
  if (!mesh || !camera || !stageLyrics.group || !mesh.userData || !mesh.userData.lyric) return null;
  var positionKey = kind === 'exit' ? 'warpExitPosition' : 'warpEntryPosition';
  if (mesh.userData[positionKey]) return mesh.userData[positionKey];
  var anchor = kind === 'exit' ? mesh.userData.warpExitAnchor : mesh.userData.warpEntryAnchor;
  if (!anchor) return null;
  var data = mesh.userData.lyric;
  var baseZ = 1.48;
  var halfW = Math.max(0.2, (data.textWorldW || data.worldW || 5.4) * 0.5);
  var halfH = Math.max(0.08, (data.textWorldH || data.worldH || 0.8) * 0.58);
  stageLyrics.group.updateMatrixWorld(true);
  var center = new THREE.Vector3(0, 0, baseZ).applyMatrix4(stageLyrics.group.matrixWorld).project(camera);
  var basisX = new THREE.Vector3(1, 0, baseZ).applyMatrix4(stageLyrics.group.matrixWorld).project(camera);
  var basisY = new THREE.Vector3(0, 1, baseZ).applyMatrix4(stageLyrics.group.matrixWorld).project(camera);
  var extentX = Math.abs((basisX.x - center.x) * halfW) + Math.abs((basisY.x - center.x) * halfH);
  var extentY = Math.abs((basisX.y - center.y) * halfW) + Math.abs((basisY.y - center.y) * halfH);
  var finalScale = Math.min(1, 0.92 / Math.max(0.001, extentX), 0.88 / Math.max(0.001, extentY));
  finalScale = Math.max(0.72, finalScale);
  extentX *= finalScale;
  extentY *= finalScale;
  var rangeX = Math.max(0, 0.92 - extentX);
  var rangeY = Math.max(0, 0.88 - extentY);
  var targetX = (anchor.x * 2 - 1) * rangeX;
  var targetY = (anchor.y * 2 - 1) * rangeY;
  var ax = basisX.x - center.x;
  var ay = basisX.y - center.y;
  var bx = basisY.x - center.x;
  var by = basisY.y - center.y;
  var det = ax * by - ay * bx;
  if (Math.abs(det) < 0.00001) return null;
  var correctX = targetX - center.x;
  var correctY = targetY - center.y;
  var resolved = new THREE.Vector3(
    (correctX * by - correctY * bx) / det,
    (ax * correctY - ay * correctX) / det,
    baseZ
  );
  mesh.userData[positionKey] = resolved;
  mesh.userData.warpFinalScale = finalScale;
  return resolved;
}

function setStageLyricViewBasisFromCameraOrQuaternion(fallbackQuat) {
  if (fallbackQuat) {
    lyricCameraDir.set(0, 0, 1).applyQuaternion(fallbackQuat);
    lyricCameraRight.set(1, 0, 0).applyQuaternion(fallbackQuat);
    lyricCameraUp.set(0, 1, 0).applyQuaternion(fallbackQuat);
  } else if (camera) {
    camera.getWorldDirection(lyricCameraDir);
    lyricCameraRight.set(1, 0, 0).applyQuaternion(camera.quaternion);
    lyricCameraUp.set(0, 1, 0).applyQuaternion(camera.quaternion);
  } else {
    lyricCameraDir.set(0, 0, 1);
    lyricCameraRight.set(1, 0, 0);
    lyricCameraUp.set(0, 1, 0);
  }
  lyricCameraDir.normalize();
  lyricCameraRight.normalize();
  lyricCameraUp.normalize();
}

function stageLyricTargetQuaternion(baseQuat, tiltX, tiltY) {
  lyricTiltEuler.set((tiltX || 0) * Math.PI / 180, (tiltY || 0) * Math.PI / 180, 0, 'YXZ');
  lyricTiltQuat.setFromEuler(lyricTiltEuler);
  return lyricTargetQuat.copy(baseQuat || lyricBaseQuat).multiply(lyricTiltQuat);
}

function getStageLyricLockBounds() {
  var maxW = 0, maxH = 0;
  function take(mesh) {
    if (!mesh || !mesh.userData || !mesh.userData.lyric) return;
    var d = mesh.userData.lyric;
    var meshScale = Math.max(mesh.scale && isFinite(mesh.scale.x) ? mesh.scale.x : 1, mesh.scale && isFinite(mesh.scale.y) ? mesh.scale.y : 1);
    maxW = Math.max(maxW, (d.textWorldW || d.worldW || 6.1) * meshScale);
    maxH = Math.max(maxH, (d.textWorldH || d.worldH || 1.0) * meshScale);
  }
  take(stageLyrics.current);
  for (var i = 0; i < stageLyrics.outgoing.length; i++) take(stageLyrics.outgoing[i]);
  return { w: maxW || 5.4, h: maxH || 0.78 };
}

function createLyricsParticles() {
  if (stageLyrics.group) {
    ensureLyricStarRiver();
    return;
  }
  stageLyrics.group = new THREE.Group();
  stageLyrics.group.renderOrder = 38;
  scene.add(stageLyrics.group);
  ensureLyricStarRiver();
}

function ensureLyricNetworkLines() {
  if (!stageLyrics.group || stageLyrics.networkLines) return stageLyrics.networkLines;
  var geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(30), 3));
  geometry.setDrawRange(0, 0);
  var material = new THREE.LineBasicMaterial({
    color: lyricThreeColor(stageLyrics.palette.secondary, '#9cffdf', 0.42),
    transparent: true,
    opacity: 0,
    depthTest: false,
    depthWrite: false,
    blending: THREE.AdditiveBlending
  });
  var lines = new THREE.LineSegments(geometry, material);
  lines.renderOrder = 43;
  stageLyrics.group.add(lines);
  stageLyrics.networkLines = lines;
  return lines;
}

function updateLyricNetworkLines() {
  var selected = normalizeLyricFlowMode(fx && fx.lyricFlowMode);
  var active = selected === 'network' || (selected === 'auto' && stageLyrics.autoFlowMode === 'network');
  var lines = active ? ensureLyricNetworkLines() : stageLyrics.networkLines;
  if (!lines) return;
  var nodes = stageLyrics.outgoing.slice(-4);
  if (stageLyrics.current) nodes.push(stageLyrics.current);
  if (!active || nodes.length < 2) {
    lines.geometry.setDrawRange(0, 0);
    lines.material.opacity = 0;
    return;
  }
  var positions = lines.geometry.attributes.position.array;
  var cursor = 0;
  for (var i = 1; i < nodes.length && cursor + 5 < positions.length; i++) {
    positions[cursor++] = nodes[i - 1].position.x;
    positions[cursor++] = nodes[i - 1].position.y;
    positions[cursor++] = nodes[i - 1].position.z - 0.02;
    positions[cursor++] = nodes[i].position.x;
    positions[cursor++] = nodes[i].position.y;
    positions[cursor++] = nodes[i].position.z - 0.02;
  }
  lines.geometry.setDrawRange(0, cursor / 3);
  lines.geometry.attributes.position.needsUpdate = true;
  lines.material.color.copy(lyricThreeColor(stageLyrics.palette.secondary, '#9cffdf', 0.42));
  lines.material.opacity += (0.38 - lines.material.opacity) * 0.18;
}

function ensureLyricStarRiver() {
  if (!stageLyrics.group || stageLyrics.starRiver) return stageLyrics.starRiver;
  var count = 420;
  var geo = new THREE.BufferGeometry();
  var seeds = new Float32Array(count);
  var lanes = new Float32Array(count);
  var depths = new Float32Array(count);
  for (var i = 0; i < count; i++) {
    seeds[i] = Math.random() * 1000;
    lanes[i] = Math.random();
    depths[i] = Math.random();
  }
  geo.setAttribute('seed', new THREE.BufferAttribute(seeds, 1));
  geo.setAttribute('lane', new THREE.BufferAttribute(lanes, 1));
  geo.setAttribute('depthSeed', new THREE.BufferAttribute(depths, 1));
  var mat = new THREE.ShaderMaterial({
    uniforms: {
      uMap: { value: dotTexture },
      uTime: uniforms.uTime,
      uPixel: uniforms.uPixel,
      uBass: uniforms.uBass,
      uBeat: uniforms.uBeat,
      uWidth: { value: stageLyrics.starRiverWidth || 4.2 },
      uHeight: { value: stageLyrics.starRiverHeight || 0.58 },
      uOpacity: { value: 0 },
      uColorA: { value: lyricThreeColor(stageLyrics.palette.secondary, '#9cffdf', 0.42) },
      uColorB: { value: lyricThreeColor(stageLyrics.palette.highlight, '#fff7d2', 0.44) }
    },
    vertexShader: [
      'precision highp float;',
      'attribute float seed,lane,depthSeed;',
      'uniform float uTime,uPixel,uBass,uBeat,uWidth,uHeight;',
      'varying float vSeed,vLane,vGlow;',
      'float hash(float n){return fract(sin(n)*43758.5453123);}',
      'void main(){',
      '  float laneBand = floor(lane * 5.0);',
      '  float laneLocal = fract(lane * 5.0);',
      '  float speed = 0.030 + hash(seed * 1.71) * 0.055 + laneBand * 0.005;',
      '  float flow = fract(hash(seed * 2.13) + uTime * speed);',
      '  float x = (flow - 0.5) * uWidth * (1.08 + hash(seed * 5.1) * 0.18);',
      '  float curve = sin(flow * 6.2831853 * (0.92 + hash(seed * 4.0) * 0.46) + seed * 0.071 + uTime * 0.34);',
      '  float breath = sin(uTime * (0.42 + hash(seed * 6.9) * 0.42) + seed * 0.093);',
      '  float y = (laneBand - 2.0) * uHeight * 0.135 + curve * uHeight * (0.20 + hash(seed * 9.0) * 0.18) + (laneLocal - 0.5) * uHeight * 0.16 + breath * uHeight * 0.10;',
      '  float z = -0.08 + (depthSeed - 0.5) * 0.44 + sin(uTime * (0.18 + hash(seed) * 0.24) + seed) * 0.08;',
      '  vec3 pos = vec3(x, y, z);',
      '  float edge = smoothstep(0.0, 0.18, flow) * (1.0 - smoothstep(0.82, 1.0, flow));',
      '  vSeed = seed;',
      '  vLane = lane;',
      '  vGlow = edge * (0.62 + 0.38 * sin(uTime * (0.9 + hash(seed * 8.0) * 0.7) + seed));',
      '  vec4 mv = modelViewMatrix * vec4(pos, 1.0);',
      '  float dist = max(0.45, -mv.z);',
      '  float size = (0.030 + hash(seed * 12.0) * 0.040 + vGlow * 0.024 + uBeat * 0.010) * (1.0 + uBass * 0.18);',
      '  gl_PointSize = clamp(size * uPixel * 120.0 / dist, 1.0, 7.2);',
      '  gl_Position = projectionMatrix * mv;',
      '}'
    ].join('\n'),
    fragmentShader: [
      'precision highp float;',
      'uniform sampler2D uMap;',
      'uniform vec3 uColorA,uColorB;',
      'uniform float uOpacity,uTime,uBeat;',
      'varying float vSeed,vLane,vGlow;',
      'void main(){',
      '  vec4 tex = texture2D(uMap, gl_PointCoord);',
      '  if(tex.a < 0.02) discard;',
      '  float tw = pow(0.5 + 0.5 * sin(uTime * (0.55 + fract(vSeed) * 0.35) + vSeed), 4.0);',
      '  vec3 col = mix(uColorA, uColorB, smoothstep(0.12, 0.92, vLane) * 0.45 + tw * 0.42 + vGlow * 0.26);',
      '  float alpha = tex.a * uOpacity * (0.20 + vGlow * 0.78 + tw * 0.32 + uBeat * 0.10);',
      '  gl_FragColor = vec4(col * (0.82 + vGlow * 0.72 + tw * 0.32), alpha);',
      '}'
    ].join('\n'),
    transparent: true,
    depthWrite: false,
    depthTest: false,
    blending: THREE.AdditiveBlending
  });
  var points = new THREE.Points(geo, mat);
  points.renderOrder = 45;
  points.frustumCulled = false;
  points.position.set(0, 0.20, 1.53);
  stageLyrics.group.add(points);
  stageLyrics.starRiver = points;
  return points;
}

function updateLyricStarRiver(dt) {
  var river = ensureLyricStarRiver();
  if (!river || !river.material || !river.material.uniforms) return;
  if (fx && fx.preset === SKULL_PRESET_INDEX) {
    river.visible = false;
    if (river.material.uniforms.uOpacity) river.material.uniforms.uOpacity.value = 0;
    return;
  }
  var u = river.material.uniforms;
  var data = stageLyrics.current && stageLyrics.current.userData ? stageLyrics.current.userData.lyric : null;
  var targetW = data ? clampRange((data.textWorldW || data.worldW || 4.2) * 1.12 + 0.80, 2.25, 7.20) : 3.4;
  var targetH = data ? clampRange((data.textWorldH || data.worldH || 0.58) * 1.85 + 0.18, 0.52, 1.35) : 0.58;
  stageLyrics.starRiverWidth += (targetW - stageLyrics.starRiverWidth) * Math.min(1, dt * 5.2);
  stageLyrics.starRiverHeight += (targetH - stageLyrics.starRiverHeight) * Math.min(1, dt * 4.6);
  u.uWidth.value = stageLyrics.starRiverWidth;
  u.uHeight.value = stageLyrics.starRiverHeight;
  var lyricGlowStrength = fx.lyricGlow ? Math.min(0.85, Math.max(0, fx.lyricGlowStrength)) : 0;
  var targetOpacity = (stageLyrics.current && fx.lyricGlowParticles)
    ? clampRange(0.22 + lyricGlowStrength * 0.58 + stageLyrics.highBloom * 0.16 + stageLyrics.beatGlow * 0.12, 0.16, 0.86)
    : 0;
  u.uOpacity.value += (targetOpacity - u.uOpacity.value) * (targetOpacity > u.uOpacity.value ? 0.10 : 0.055);
  u.uColorA.value.copy(lyricThreeColor(stageLyrics.palette.secondary || stageLyrics.palette.primary, '#9cffdf', 0.42));
  u.uColorB.value.copy(lyricThreeColor(stageLyrics.palette.highlight || stageLyrics.palette.primary, '#fff7d2', 0.46));
  river.visible = u.uOpacity.value > 0.01 || !!stageLyrics.current;
  var t = uniforms.uTime.value;
  river.position.y += ((0.18 + Math.sin(t * 0.44) * 0.035 + Math.sin(t * 0.91 + 1.7) * 0.018) - river.position.y) * 0.08;
  river.position.z += ((1.54 + Math.cos(t * 0.31) * 0.060) - river.position.z) * 0.08;
  river.rotation.z = Math.sin(t * 0.22) * 0.012;
}

function setLyricSparkOpacity(data, value) {
  if (!data || !data.sparkMat) return;
  value = clampRange(Number(value) || 0, 0, 1);
  if (data.sparkMat.uniforms && data.sparkMat.uniforms.uOpacity) data.sparkMat.uniforms.uOpacity.value = value;
  else data.sparkMat.opacity = value;
}

function getLyricSparkOpacity(data) {
  if (!data || !data.sparkMat) return 0;
  if (data.sparkMat.uniforms && data.sparkMat.uniforms.uOpacity) return Number(data.sparkMat.uniforms.uOpacity.value) || 0;
  return Number(data.sparkMat.opacity) || 0;
}

function setLyricSparkSize(data, value) {
  if (!data || !data.sparkMat) return;
  value = Math.max(0.002, Number(value) || 0.035);
  if (data.sparkMat.uniforms && data.sparkMat.uniforms.uSize) data.sparkMat.uniforms.uSize.value = value;
  else data.sparkMat.size = value;
}

function getLyricSparkSize(data) {
  if (!data || !data.sparkMat) return 0.035;
  if (data.sparkMat.uniforms && data.sparkMat.uniforms.uSize) return Number(data.sparkMat.uniforms.uSize.value) || 0.035;
  return Number(data.sparkMat.size) || 0.035;
}

function setLyricSparkColor(data, color) {
  if (!data || !data.sparkMat) return;
  if (data.sparkMat.uniforms && data.sparkMat.uniforms.uColor) data.sparkMat.uniforms.uColor.value.copy(color);
  else if (data.sparkMat.color) data.sparkMat.color.copy(color);
}

function showStageLine(text, redrawOnly) {
  createLyricsParticles();
  if (!stageLyrics.group) return;
  if (!text) { clearStageLyrics(); return; }
  var resolvedMode = resolvedLyricFlowMode(!redrawOnly);
  var cascadeMode = resolvedMode === 'cascade' || resolvedMode === 'cloud' || resolvedMode === 'network';
  var pushDirection = resolvedMode === 'push'
    ? (redrawOnly && stageLyrics.current ? (stageLyrics.current.userData.pushDirection || 1) : (Math.random() < 0.5 ? -1 : 1))
    : 0;
  if (redrawOnly && stageLyrics.current) {
    disposeLyricMesh(stageLyrics.current);
    stageLyrics.current = null;
  } else if (stageLyrics.current) {
    if (pushDirection) stageLyrics.current.userData.pushOutDirection = pushDirection;
    if (stageLyrics.current.userData.resolvedFlowMode === 'warp') {
      stageLyrics.current.userData.warpExitStartPosition = stageLyrics.current.position.clone();
      stageLyrics.current.userData.warpExitStartScale = stageLyrics.current.scale.x;
      stageLyrics.current.userData.warpExitStartRotation = stageLyrics.current.rotation.z;
    }
    stageLyrics.current.userData.state = cascadeMode ? 'cascade' : 'out';
    stageLyrics.current.userData.age = 0;
    stageLyrics.current.userData.cascadeLife = 0;
    stageLyrics.current.userData.flowMode = stageLyrics.current.userData.resolvedFlowMode || (cascadeMode ? 'cascade' : 'single');
    stageLyrics.outgoing.push(stageLyrics.current);
  }
  if (cascadeMode) {
    while (stageLyrics.outgoing.length > 5) disposeLyricMesh(stageLyrics.outgoing.shift());
  }
  stageLyrics.currentText = text;
  var mesh = buildLyricMesh(text, resolvedMode);
  mesh.userData.resolvedFlowMode = resolvedMode;
  mesh.userData.flowMode = resolvedMode;
  mesh.userData.pushDirection = pushDirection;
  if (resolvedMode === 'warp') {
    mesh.userData.warpEntryAnchor = nextLyricWarpAnchor('entry');
    mesh.userData.warpExitAnchor = nextLyricWarpAnchor('exit');
  }
  stageLyrics.group.add(mesh);
  stageLyrics.current = mesh;
}

function clearStageLyrics() {
  disposeLyricMesh(stageLyrics.current);
  stageLyrics.current = null;
  stageLyrics.currentIdx = -1;
  stageLyrics.currentText = '';
  while (stageLyrics.outgoing.length) disposeLyricMesh(stageLyrics.outgoing.pop());
  if (stageLyrics.networkLines) {
    stageLyrics.networkLines.geometry.setDrawRange(0, 0);
    stageLyrics.networkLines.material.opacity = 0;
  }
}

function updateStageLyrics3D(dt) {
  if (!stageLyrics.group) return;
  if (!fx.particleLyrics && !stageLyrics.current && (!stageLyrics.outgoing || !stageLyrics.outgoing.length)) return;
  if (!isFinite(stageLyrics.highBloom)) stageLyrics.highBloom = 0;
  if (!isFinite(stageLyrics.beatGlow)) stageLyrics.beatGlow = 0;
  if (!isFinite(stageLyrics.glowFollowX)) stageLyrics.glowFollowX = 0;
  if (!isFinite(stageLyrics.glowFollowY)) stageLyrics.glowFollowY = 0;
  if (!isFinite(stageLyrics.glowFollowRoll)) stageLyrics.glowFollowRoll = 0;
  var t = uniforms.uTime.value;
  var lyricGlowStrength = fx.lyricGlow ? Math.min(0.85, Math.max(0, fx.lyricGlowStrength)) : 0;
  var glowDrive = Math.min(1.7, Math.max(0, lyricGlowStrength / 0.50));
  var glowBreath = lyricGlowStrength > 0 ? (0.5 + 0.5 * Math.sin(t * 1.05)) : 0;
  var musicBloom = Math.max(lyricSunEnergy, beatPulse * 0.10);
  var beatGlowRaw = fx.lyricGlowBeat && lyricGlowStrength > 0
    ? Math.max(beatPulse * 1.22, beatCam.punch * 0.86 + beatCam.radiusKick * 1.85)
    : 0;
  stageLyrics.beatGlow += (beatGlowRaw - stageLyrics.beatGlow) * (beatGlowRaw > stageLyrics.beatGlow ? 0.32 : 0.10);
  if (!isFinite(stageLyrics.beatGlow)) stageLyrics.beatGlow = 0;
  var skullLyricPreset = !!(fx && fx.preset === SKULL_PRESET_INDEX);
  var solarBloom = lyricGlowStrength > 0 ? (0.18 + glowBreath * 0.16 + musicBloom * 0.90 + stageLyrics.beatGlow * 1.18 + Math.sin(t * 0.37 + 1.2) * 0.035) * glowDrive : 0;
  if (skullLyricPreset && lyricGlowStrength > 0) {
    solarBloom = (0.035 + glowBreath * 0.030 + musicBloom * 0.11 + Math.pow(Math.max(0, stageLyrics.beatGlow), 1.26) * 1.45 + Math.pow(Math.max(0, skullBeatFlash || 0), 1.08) * 1.18) * glowDrive;
  }
  solarBloom = Math.max(0, Math.min(1.45, solarBloom));
  stageLyrics.highBloom += (solarBloom - stageLyrics.highBloom) * (solarBloom > stageLyrics.highBloom ? (skullLyricPreset ? 0.22 : 0.075) : (skullLyricPreset ? 0.070 : 0.050));
  if (!isFinite(stageLyrics.highBloom)) stageLyrics.highBloom = 0;
  updateLyricStarRiver(dt);
  var followDrive = fx.lyricGlowBeat && lyricGlowStrength > 0 ? Math.min(1.35, stageLyrics.beatGlow) : 0;
  var followXTarget = followDrive * (beatCam.thetaKick * 34 + beatCam.rollKick * 8);
  var followYTarget = followDrive * (beatCam.phiKick * 42 - beatCam.radiusKick * 0.48);
  var followRollTarget = followDrive * (beatCam.rollKick * 22 + beatCam.thetaKick * 10);
  stageLyrics.glowFollowX += (followXTarget - stageLyrics.glowFollowX) * 0.26;
  stageLyrics.glowFollowY += (followYTarget - stageLyrics.glowFollowY) * 0.24;
  stageLyrics.glowFollowRoll += (followRollTarget - stageLyrics.glowFollowRoll) * 0.22;
  stageLyrics.glowFollowX *= 0.92;
  stageLyrics.glowFollowY *= 0.92;
  stageLyrics.glowFollowRoll *= 0.90;
  var layoutScale = clampRange(Number(fx.lyricScale) || 1, 0.35, 1.65);
  var layoutX = clampRange(Number(fx.lyricOffsetX) || 0, -2.0, 2.0);
  var layoutY = clampRange(Number(fx.lyricOffsetY) || 0, -1.2, 1.35);
  var layoutZ = clampRange(Number(fx.lyricOffsetZ) || 0, -1.6, 1.6);
  var layoutTiltX = clampRange(Number(fx.lyricTiltX) || 0, -42, 42);
  var layoutTiltY = clampRange(Number(fx.lyricTiltY) || 0, -42, 42);
  var skullMouthLyrics = !!(camera && fx && fx.preset === SKULL_PRESET_INDEX && skullParticleGroup && skullParticleGroup.visible);
  var shelfDetailOpen = !!(shelfManager && shelfManager.hasOpenContent && shelfManager.hasOpenContent());
  var skullShelfDetailOpen = !!(fx && fx.preset === SKULL_PRESET_INDEX && shelfDetailOpen);
  var normalShelfDetailOpen = !!(shelfDetailOpen && !skullShelfDetailOpen);
  stageLyrics.group.renderOrder = shelfDetailOpen ? 24 : 38;
  var shelfDetailLyricProfile = shelfDetailOpen ? {
    opacity: skullShelfDetailOpen ? 0.30 : 0.38,
    readability: skullShelfDetailOpen ? 0.20 : 0.26,
    bloom: skullShelfDetailOpen ? 0.20 : 0.24,
    glowCap: skullShelfDetailOpen ? 0.050 : 0.070,
    outgoing: skullShelfDetailOpen ? 0.34 : 0.42,
    easeDown: 0.34
  } : {
    opacity: 0.96,
    readability: 0.86,
    bloom: 1,
    glowCap: 1.0,
    outgoing: 1,
    easeDown: 0.16
  };
  var shelfLyricAvoid = shouldAvoidStageLyricsForShelf();
  var wallpaperLyricLock = shouldUseWallpaperLyricCameraLock();
  var wallpaperShelfLyrics = wallpaperLyricLock && shouldDimWallpaperForShelf();
  if (wallpaperLyricLock) {
    layoutScale *= wallpaperShelfLyrics ? 0.60 : 0.84;
    layoutX = clampRange(layoutX + (wallpaperShelfLyrics ? -1.34 : 0), -2.0, 2.0);
    layoutY = clampRange(layoutY + (wallpaperShelfLyrics ? -0.04 : 0.08), -1.2, 1.35);
    layoutZ = clampRange(layoutZ + (wallpaperShelfLyrics ? 1.02 : 1.15), -1.6, 1.6);
  } else if (!skullMouthLyrics && shelfLyricAvoid && fx.lyricCameraLock) {
    layoutScale *= 0.72;
    layoutX = clampRange(layoutX - 1.36, -2.0, 2.0);
    layoutY = clampRange(layoutY + 0.06, -1.2, 1.35);
    layoutZ = clampRange(layoutZ + 0.72, -1.6, 1.6);
  } else if (!skullMouthLyrics && shouldOffsetLyricsForShelfDetail()) {
    layoutScale *= normalShelfDetailOpen ? 0.56 : 0.70;
    layoutX = clampRange(layoutX - (normalShelfDetailOpen ? 1.78 : 1.58), -2.0, 2.0);
    layoutY = clampRange(layoutY + (normalShelfDetailOpen ? 0.18 : 0.08), -1.2, 1.35);
    layoutZ = clampRange(layoutZ + 0.84, -1.6, 1.6);
  }
  if (skullMouthLyrics) {
    layoutScale *= skullShelfDetailOpen ? 0.52 : (shelfLyricAvoid ? 0.58 : 0.66);
    if (shelfLyricAvoid && !skullShelfDetailOpen) {
      layoutX = clampRange(layoutX - 0.36, -2.0, 2.0);
      layoutY = clampRange(layoutY + 0.02, -1.2, 1.35);
      layoutZ = clampRange(layoutZ + 0.18, -1.6, 1.6);
    }
  }
  var lockBaseDistance = wallpaperShelfLyrics ? 5.58 : 4.85;
  var lockDistance = lockBaseDistance + layoutZ;
  var cameraLockedLyrics = (fx.lyricCameraLock || wallpaperLyricLock) && camera;
  var skullLyricEdgeGuard = !!(fx && fx.preset === SKULL_PRESET_INDEX && (orbit.centerLocked || orbit.recentering));
  var lockFit = (cameraLockedLyrics || skullLyricEdgeGuard || skullMouthLyrics) ? lyricCameraLockFit(layoutScale, layoutX, layoutY, skullMouthLyrics ? Math.max(2.2, 4.4 + layoutZ) : lockDistance) : 1;
  if (skullMouthLyrics) lockFit = Math.min(lockFit, 1.12);
  if (!isFinite(stageLyrics.lockFitScale)) stageLyrics.lockFitScale = 1;
  stageLyrics.lockFitScale += (lockFit - stageLyrics.lockFitScale) * (lockFit < stageLyrics.lockFitScale ? 0.18 : 0.10);
  stageLyrics.group.scale.setScalar(layoutScale * stageLyrics.lockFitScale);
  if (skullMouthLyrics) {
    stageLyrics.snapCameraLockFrames = 0;
    skullParticleGroup.updateMatrixWorld(true);
    skullLyricMouthTarget.copy(skullLyricMouthLocal).applyMatrix4(skullParticleGroup.matrixWorld);
    skullParticleGroup.getWorldQuaternion(skullLyricMouthQuat);
    skullLyricMouthForward.set(0, 0, 1).applyQuaternion(skullLyricMouthQuat);
    skullLyricMouthTarget.addScaledVector(skullLyricMouthForward, 0.020);
    skullLyricReadableQuat.copy(skullLyricMouthQuat);
    setStageLyricViewBasisFromCameraOrQuaternion(skullLyricMouthQuat);
    lyricLayoutTarget.copy(skullLyricMouthTarget);
    applyStageLyricLayoutOffset(lyricLayoutTarget, layoutX, layoutY, layoutZ);
    stageLyricTargetQuaternion(skullLyricReadableQuat, layoutTiltX, layoutTiltY);
    stageLyrics.group.userData = stageLyrics.group.userData || {};
    if (!stageLyrics.group.userData.skullMouthLocked) {
      stageLyrics.group.position.copy(lyricLayoutTarget);
      stageLyrics.group.quaternion.copy(lyricTargetQuat);
      stageLyrics.group.userData.skullMouthLocked = true;
    } else {
      stageLyrics.group.position.lerp(lyricLayoutTarget, 0.26);
      stageLyrics.group.quaternion.slerp(lyricTargetQuat, 0.30);
    }
  } else if (cameraLockedLyrics) {
    if (stageLyrics.group.userData) stageLyrics.group.userData.skullMouthLocked = false;
    setStageLyricViewBasisFromCameraOrQuaternion(null);
    lyricLayoutBase.copy(camera.position).addScaledVector(lyricCameraDir, lockBaseDistance);
    lyricCameraTarget.copy(lyricLayoutBase);
    applyStageLyricLayoutOffset(lyricCameraTarget, layoutX, layoutY, layoutZ);
    stageLyricTargetQuaternion(camera.quaternion, layoutTiltX, layoutTiltY);
    if (stageLyrics.snapCameraLockFrames > 0) {
      stageLyrics.group.position.copy(lyricCameraTarget);
      stageLyrics.group.quaternion.copy(lyricTargetQuat);
      stageLyrics.snapCameraLockFrames -= 1;
    } else {
      var lockPosEase = wallpaperLyricLock ? (wallpaperShelfLyrics ? 0.42 : 0.34) : 0.24;
      var lockQuatEase = wallpaperLyricLock ? (wallpaperShelfLyrics ? 0.44 : 0.36) : 0.22;
      stageLyrics.group.position.lerp(lyricCameraTarget, lockPosEase);
      stageLyrics.group.quaternion.slerp(lyricTargetQuat, lockQuatEase);
    }
  } else {
    if (stageLyrics.group.userData) stageLyrics.group.userData.skullMouthLocked = false;
    stageLyrics.snapCameraLockFrames = 0;
    if (particles) {
      particles.updateMatrixWorld(true);
      particles.getWorldPosition(lyricCoverWorldPos);
      particles.getWorldQuaternion(lyricCoverWorldQuat);
    } else {
      lyricCoverWorldPos.set(0, 0, 0);
      lyricCoverWorldQuat.identity();
    }
    setStageLyricViewBasisFromCameraOrQuaternion(lyricCoverWorldQuat);
    lyricLayoutBase.copy(lyricCoverWorldPos);
    lyricLayoutTarget.copy(lyricLayoutBase);
    applyStageLyricLayoutOffset(lyricLayoutTarget, layoutX, layoutY, layoutZ);
    stageLyrics.group.position.copy(lyricLayoutTarget);
    stageLyricTargetQuaternion(lyricCoverWorldQuat, layoutTiltX, layoutTiltY);
    stageLyrics.group.quaternion.copy(lyricTargetQuat);
  }
  function tickMesh(mesh, isCurrent, stackIndex) {
    if (!mesh) return false;
    mesh.userData.age += dt;
    var lyricSceneMode = mesh.userData.resolvedFlowMode || mesh.userData.flowMode || 'single';
    var cascadeLine = lyricSceneMode === 'cascade' || lyricSceneMode === 'cloud' || lyricSceneMode === 'network';
    if (cascadeLine) mesh.userData.cascadeLife = (mesh.userData.cascadeLife || 0) + dt * (0.76 + Math.min(0.62, stageLyrics.beatGlow * 0.18 + beatPulse * 0.24));
    var warpLine = lyricSceneMode === 'warp';
    var transitionDuration = warpLine ? (isCurrent ? 0.72 : 0.66) : (isCurrent ? 0.52 : 0.38);
    var a = Math.min(1, mesh.userData.age / transitionDuration);
    a = a * a * (3 - 2 * a);
    var data = mesh.userData.lyric || {};
    var followMix = isCurrent ? 1.0 : 0.64;
    var glowX = stageLyrics.glowFollowX * followMix;
    var glowY = stageLyrics.glowFollowY * followMix;
    var glowRoll = stageLyrics.glowFollowRoll * followMix;
    if (data.glow) {
      data.glow.position.set(glowX * 0.14, glowY * 0.12, -0.006);
      data.glow.rotation.z = glowRoll * 0.30;
    }
    if (data.sun) {
      data.sun.position.set(glowX * 0.42, 0.02 + glowY * 0.34, -0.035);
      data.sun.rotation.z = glowRoll * 0.36;
    }
    if (data.sparks) {
      data.sparks.position.set(glowX * 0.24, glowY * 0.22, 0.010);
      data.sparks.rotation.z = glowRoll * 0.22;
    }
    var opacity = 0;
    if (isCurrent) {
      var shelfDetailLyricDim = shelfDetailLyricProfile.bloom;
      var lyricOpacityTarget = shelfDetailLyricProfile.opacity;
      var currentOpacity = data.textMat ? data.textMat.uniforms.uOpacity.value : 0;
      var opacityEase = shelfDetailOpen && currentOpacity > lyricOpacityTarget ? shelfDetailLyricProfile.easeDown : 0.16;
      opacity = warpLine
        ? lyricOpacityTarget * a
        : clampRange(currentOpacity + (lyricOpacityTarget - currentOpacity) * opacityEase, 0, 1);
      if (data.textMat) data.textMat.uniforms.uOpacity.value = opacity;
      if (data.readabilityMat) {
        var readabilityTarget = opacity * shelfDetailLyricProfile.readability;
        var readabilityEase = shelfDetailOpen && data.readabilityMat.opacity > readabilityTarget ? 0.28 : 0.16;
        data.readabilityMat.opacity += (readabilityTarget - data.readabilityMat.opacity) * readabilityEase;
      }
      if (data.textMat && data.textMat.uniforms.uSolar) {
        var solarTarget = stageLyrics.highBloom * shelfDetailLyricDim;
        var solarEase = shelfDetailOpen && data.textMat.uniforms.uSolar.value > solarTarget ? 0.26 : 0.12;
        data.textMat.uniforms.uSolar.value += (solarTarget - data.textMat.uniforms.uSolar.value) * solarEase;
      }
      var solar = stageLyrics.highBloom * shelfDetailLyricDim;
      var warmth = Math.max(0, Math.min(1, solar * 1.10));
      if (data.glowMat) {
        var glowTarget = lyricGlowStrength > 0 ? Math.min(shelfDetailLyricProfile.glowCap, (0.075 + solar * 0.34 + stageLyrics.beatGlow * 0.16 * shelfDetailLyricDim) * Math.min(3.0, glowDrive)) : 0;
        data.glowMat.opacity += (glowTarget - data.glowMat.opacity) * (glowTarget > data.glowMat.opacity ? 0.095 : (shelfDetailOpen ? 0.20 : 0.055));
        data.glowMat.color.copy(lyricThreeColor(stageLyrics.palette.glowColor || stageLyrics.palette.secondary, '#9cffdf', 0.36)).lerp(lyricSunHotColor, warmth);
      }
      if (data.sparkMat) {
        var sparkTarget = lyricGlowStrength > 0 && fx.lyricGlowParticles && !shelfDetailOpen ? Math.min(0.42, (0.10 + solar * 0.14 + stageLyrics.beatGlow * 0.10) * Math.min(1.6, glowDrive)) : 0;
        var sparkOpacity = getLyricSparkOpacity(data);
        sparkOpacity += (sparkTarget - sparkOpacity) * (sparkTarget > sparkOpacity ? 0.13 : (shelfDetailOpen ? 0.22 : 0.075));
        setLyricSparkOpacity(data, sparkOpacity);
        var sparkSizeTarget = fx.lyricGlowParticles && !shelfDetailOpen ? (0.050 + solar * 0.016 + stageLyrics.beatGlow * 0.026 + bass * 0.008) : 0.035;
        setLyricSparkSize(data, getLyricSparkSize(data) + (sparkSizeTarget - getLyricSparkSize(data)) * 0.12);
        var sparkColor = lyricSunHotColor.clone().lerp(lyricSunColor, 0.22 + solar * 0.18);
        setLyricSparkColor(data, sparkColor);
      }
      var seed = mesh.userData.floatSeed || 0;
      if (data.sunMat) {
        var sunTarget = lyricGlowStrength > 0 && !shelfDetailOpen ? Math.min(0.88, (Math.pow(Math.min(1.35, solar), 1.08) * 0.28 + stageLyrics.beatGlow * 0.20) * Math.min(2.4, glowDrive)) : 0;
        data.sunMat.opacity += (sunTarget - data.sunMat.opacity) * (shelfDetailOpen ? 0.18 : 0.055);
        data.sunMat.color.copy(lyricSunColor).lerp(lyricSunHotColor, solar * 0.55);
      }
      if (data.sun) {
        var sunPulse = solar;
        var beatScale = fx.lyricGlowBeat ? stageLyrics.beatGlow * 0.24 : 0;
        data.sun.scale.set(0.82 + sunPulse * 0.36 + beatScale + Math.sin(t * 1.6) * sunPulse * 0.018, 0.60 + sunPulse * 0.34 + beatScale * 0.72 + Math.cos(t * 1.25) * sunPulse * 0.020, 1);
        data.sun.rotation.z += Math.sin(t * 0.32 + seed) * 0.010 * sunPulse;
      }
      var breathe = Math.sin(t * 0.92 + seed) * 0.050 + Math.sin(t * 0.41 + seed * 0.7) * 0.028;
      if (skullMouthLyrics) {
        var mouthMeshY = -0.070 + Math.sin(t * 0.50 + seed) * 0.018 + Math.sin(t * 1.12 + seed) * 0.006;
        var mouthMeshZ = 0.018 + Math.cos(t * 0.46 + seed) * 0.007;
        var mouthMeshScale = 1.08 + a * 0.040 + breathe * 0.12 + bass * 0.024 + beatPulse * 0.014;
        if (!mesh.userData.skullMouthMeshLocked) {
          mesh.position.set(0, mouthMeshY, mouthMeshZ);
          mesh.userData.skullMouthMeshLocked = true;
        } else {
          mesh.position.x += (0 - mesh.position.x) * 0.18;
          mesh.position.y += (mouthMeshY - mesh.position.y) * 0.16;
          mesh.position.z += (mouthMeshZ - mesh.position.z) * 0.18;
        }
        mesh.scale.setScalar(mouthMeshScale);
        mesh.rotation.z = Math.sin(t * 0.30 + seed) * 0.010;
      } else if (lyricSceneMode === 'warp') {
        mesh.userData.skullMouthMeshLocked = false;
        var warpEntry = resolveLyricWarpPosition(mesh, 'entry');
        var warpScale = mesh.userData.warpFinalScale || 1;
        var warpSpin = Math.sin(seed * 9.17) >= 0 ? 1 : -1;
        if (warpEntry) {
          mesh.position.x = warpEntry.x + Math.sin(a * Math.PI * 2.5) * (1 - a) * 0.16;
          mesh.position.y = warpEntry.y + Math.cos(a * Math.PI * 2.0) * (1 - a) * 0.11;
          mesh.position.z = warpEntry.z - Math.pow(1 - a, 2) * 4.4;
        }
        mesh.scale.setScalar(warpScale * (0.035 + a * 0.965));
        mesh.rotation.z = warpSpin * Math.pow(1 - a, 2) * 0.72;
        if (data.sun) {
          data.sun.scale.set(0.34 + a * 0.82, 0.10 + a * 0.58, 1);
          data.sun.rotation.z += warpSpin * dt * (2.8 - a * 2.1);
        }
      } else if (lyricSceneMode === 'slant') {
        mesh.userData.skullMouthMeshLocked = false;
        var slantSide = Math.sin(seed * 8.71) >= 0 ? 1 : -1;
        mesh.position.x += ((slantSide * (1.08 - a * 0.78) + Math.sin(t * 0.34 + seed) * 0.20) - mesh.position.x) * 0.20;
        mesh.position.y += ((0.18 + Math.cos(t * 0.48 + seed) * 0.06) - mesh.position.y) * 0.12;
        mesh.position.z += ((1.48 + Math.sin(t * 0.25 + seed) * 0.08) - mesh.position.z) * 0.10;
        mesh.scale.setScalar(0.98 + a * 0.08 + bass * 0.04);
        mesh.rotation.z = slantSide * (-0.22 + Math.sin(t * 0.40 + seed) * 0.045);
      } else if (lyricSceneMode === 'geometry') {
        mesh.userData.skullMouthMeshLocked = false;
        var geoPulse = 1 + Math.max(stageLyrics.beatGlow, beatPulse) * 0.09;
        mesh.position.x += ((Math.sin(t * 0.72 + seed) * 0.34) - mesh.position.x) * 0.15;
        mesh.position.y += ((0.18 + Math.cos(t * 0.92 + seed) * 0.18) - mesh.position.y) * 0.15;
        mesh.position.z += ((1.46 + Math.sin(t * 0.58 + seed) * 0.16) - mesh.position.z) * 0.13;
        mesh.scale.setScalar(geoPulse * (0.94 + a * 0.06));
        mesh.rotation.z = Math.sin(t * 0.72 + seed) * 0.16;
      } else if (lyricSceneMode === 'scatter') {
        mesh.userData.skullMouthMeshLocked = false;
        var scatterX = Math.sin(seed * 11.7) * 1.18;
        var scatterY = 0.16 + Math.cos(seed * 7.9) * 0.58;
        mesh.position.x += (scatterX - mesh.position.x) * 0.22;
        mesh.position.y += (scatterY - mesh.position.y) * 0.20;
        mesh.position.z += ((1.35 + Math.sin(seed * 5.3) * 0.32) - mesh.position.z) * 0.16;
        mesh.scale.setScalar(0.72 + a * 0.34 + beatPulse * 0.08);
        mesh.rotation.z = Math.sin(seed * 6.2) * 0.28;
      } else if (lyricSceneMode === 'stretch') {
        mesh.userData.skullMouthMeshLocked = false;
        var stretchBeat = Math.max(beatPulse, stageLyrics.beatGlow * 0.65);
        mesh.position.x += (0 - mesh.position.x) * 0.20;
        mesh.position.y += ((0.16 + Math.sin(t * 0.52 + seed) * 0.05) - mesh.position.y) * 0.16;
        mesh.position.z += ((1.52 + Math.cos(t * 0.34 + seed) * 0.05) - mesh.position.z) * 0.14;
        var stretchScale = 0.96 + a * 0.08 + stretchBeat * 0.08;
        mesh.scale.set(stretchScale * 1.08, stretchScale * 0.96, 1);
        mesh.rotation.z = 0;
      } else if (lyricSceneMode === 'orbit') {
        mesh.userData.skullMouthMeshLocked = false;
        var orbitPhase = t * 0.72 + seed;
        mesh.position.x += ((Math.sin(orbitPhase) * 1.15) - mesh.position.x) * 0.18;
        mesh.position.y += ((0.16 + Math.cos(orbitPhase) * 0.54) - mesh.position.y) * 0.18;
        mesh.position.z += ((1.46 + Math.sin(orbitPhase * 0.72) * 0.36) - mesh.position.z) * 0.16;
        mesh.scale.setScalar(0.78 + (Math.cos(orbitPhase) + 1) * 0.18 + beatPulse * 0.05);
        mesh.rotation.z = Math.sin(orbitPhase * 0.64) * 0.18;
      } else if (lyricSceneMode === 'wave') {
        mesh.userData.skullMouthMeshLocked = false;
        var wavePhase = t * 1.18 + seed;
        mesh.position.x += ((Math.sin(wavePhase) * 0.88) - mesh.position.x) * 0.21;
        mesh.position.y += ((0.16 + Math.sin(wavePhase * 1.42) * 0.50) - mesh.position.y) * 0.21;
        mesh.position.z += ((1.48 + Math.cos(wavePhase) * 0.18) - mesh.position.z) * 0.17;
        mesh.scale.setScalar(0.98 + Math.sin(wavePhase) * 0.08);
        mesh.rotation.z = Math.cos(wavePhase) * 0.18;
      } else if (lyricSceneMode === 'flip') {
        mesh.userData.skullMouthMeshLocked = false;
        var flipPhase = Math.sin(t * 1.35 + seed);
        mesh.position.x += (0 - mesh.position.x) * 0.22;
        mesh.position.y += ((0.16 + Math.cos(t * 0.68 + seed) * 0.08) - mesh.position.y) * 0.18;
        mesh.position.z += ((1.50 + Math.abs(flipPhase) * 0.18) - mesh.position.z) * 0.16;
        mesh.scale.setScalar(0.94 + Math.abs(flipPhase) * 0.08);
        mesh.rotation.y = flipPhase * 0.48;
        mesh.rotation.z = Math.sin(t * 0.44 + seed) * 0.04;
      } else if (lyricSceneMode === 'sweep') {
        mesh.userData.skullMouthMeshLocked = false;
        var sweepSide = Math.sin(seed * 4.13) >= 0 ? 1 : -1;
        var sweepX = sweepSide * (1.12 - a * 1.02);
        mesh.position.x += (sweepX - mesh.position.x) * 0.28;
        mesh.position.y += ((0.18 + sweepSide * 0.16) - mesh.position.y) * 0.22;
        mesh.position.z += ((1.54 - Math.abs(sweepX) * 0.16) - mesh.position.z) * 0.18;
        mesh.scale.setScalar(0.78 + a * 0.34 + beatPulse * 0.05);
        mesh.rotation.z = -sweepSide * (0.26 - a * 0.20);
      } else if (lyricSceneMode === 'bounce') {
        mesh.userData.skullMouthMeshLocked = false;
        var bouncePhase = Math.abs(Math.sin(t * 1.55 + seed));
        var bounceBeat = Math.max(bouncePhase * 0.72, beatPulse);
        mesh.position.x += ((Math.sin(t * 0.58 + seed) * 0.22) - mesh.position.x) * 0.18;
        mesh.position.y += ((-0.08 + bouncePhase * 0.58) - mesh.position.y) * 0.24;
        mesh.position.z += ((1.45 + bouncePhase * 0.18) - mesh.position.z) * 0.18;
        mesh.scale.setScalar(0.94 + bounceBeat * 0.10);
        mesh.rotation.z = Math.sin(t * 0.76 + seed) * 0.11;
      } else if (lyricSceneMode === 'pendulum') {
        mesh.userData.skullMouthMeshLocked = false;
        var pendulumPhase = Math.sin(t * 0.74 + seed);
        mesh.position.x += ((pendulumPhase * 0.94) - mesh.position.x) * 0.18;
        mesh.position.y += ((0.28 - Math.abs(pendulumPhase) * 0.18) - mesh.position.y) * 0.18;
        mesh.position.z += ((1.50 + Math.cos(t * 0.74 + seed) * 0.08) - mesh.position.z) * 0.13;
        mesh.scale.setScalar(0.98 + beatPulse * 0.04);
        mesh.rotation.z = pendulumPhase * 0.18;
      } else if (lyricSceneMode === 'depth') {
        mesh.userData.skullMouthMeshLocked = false;
        var depthPhase = 0.5 + 0.5 * Math.sin(t * 0.66 + seed);
        mesh.position.x += ((Math.sin(t * 0.31 + seed) * 0.16) - mesh.position.x) * 0.14;
        mesh.position.y += ((0.18 + Math.cos(t * 0.42 + seed) * 0.08) - mesh.position.y) * 0.14;
        mesh.position.z += ((1.18 + depthPhase * 0.62) - mesh.position.z) * 0.18;
        mesh.scale.setScalar(0.84 + depthPhase * 0.28);
        mesh.rotation.z = Math.sin(t * 0.28 + seed) * 0.04;
      } else if (lyricSceneMode === 'drift') {
        mesh.userData.skullMouthMeshLocked = false;
        var driftPhase = t * 0.36 + seed;
        mesh.position.x += ((Math.sin(driftPhase) * 1.05) - mesh.position.x) * 0.12;
        mesh.position.y += ((0.16 + Math.cos(driftPhase * 1.24) * 0.32) - mesh.position.y) * 0.12;
        mesh.position.z += ((1.48 + Math.sin(driftPhase * 0.72) * 0.12) - mesh.position.z) * 0.10;
        mesh.scale.setScalar(0.97 + Math.sin(driftPhase * 0.82) * 0.05);
        mesh.rotation.z = Math.cos(driftPhase) * 0.065;
      } else if (lyricSceneMode === 'pulse') {
        mesh.userData.skullMouthMeshLocked = false;
        var pulseDrive = Math.max(beatPulse, stageLyrics.beatGlow * 0.58);
        mesh.position.x += (0 - mesh.position.x) * 0.20;
        mesh.position.y += ((0.18 + pulseDrive * 0.09) - mesh.position.y) * 0.18;
        mesh.position.z += ((1.48 + pulseDrive * 0.14) - mesh.position.z) * 0.16;
        mesh.scale.setScalar(0.94 + pulseDrive * 0.22);
        mesh.rotation.z = Math.sin(t * 0.38 + seed) * 0.035;
      } else if (lyricSceneMode === 'glide') {
        mesh.userData.skullMouthMeshLocked = false;
        var glideSide = Math.sin(seed * 7.17) >= 0 ? 1 : -1;
        var glideProgress = 1 - a;
        mesh.position.x += ((glideSide * glideProgress * 1.25) - mesh.position.x) * 0.24;
        mesh.position.y += ((0.18 - glideProgress * 0.30) - mesh.position.y) * 0.22;
        mesh.position.z += ((1.50 - glideProgress * 0.10) - mesh.position.z) * 0.15;
        mesh.scale.setScalar(0.92 + a * 0.08);
        mesh.rotation.z = -glideSide * glideProgress * 0.12;
      } else if (lyricSceneMode === 'push') {
        mesh.userData.skullMouthMeshLocked = false;
        var pushSide = mesh.userData.pushDirection || 1;
        var pushEntry = (1 - a) * -pushSide;
        mesh.position.x += ((pushEntry * 1.20) - mesh.position.x) * 0.30;
        mesh.position.y += ((0.18 + pushEntry * 0.08) - mesh.position.y) * 0.24;
        mesh.position.z += ((1.50 - Math.abs(pushEntry) * 0.10) - mesh.position.z) * 0.20;
        mesh.scale.setScalar(0.92 + a * 0.08);
        mesh.rotation.z = pushEntry * 0.10;
      } else if (cascadeLine) {
        mesh.userData.skullMouthMeshLocked = false;
        var cBreath = Math.sin(t * 0.55 + seed) * 0.018 + Math.sin(t * 1.12 + seed) * 0.010;
        var cBeat = fx.lyricGlowBeat ? stageLyrics.beatGlow : 0;
        var sceneSpread = lyricSceneMode === 'cloud' ? 0.22 : (lyricSceneMode === 'network' ? 0.12 : 0);
        var currentY = 0.46 + cBreath + Math.cos(seed * 5.7) * sceneSpread;
        var currentZ = 1.50 + Math.cos(t * 0.36 + seed) * 0.032;
        var currentScale = 0.78 + a * 0.045 + bass * 0.020 + cBeat * 0.010;
        var currentX = sceneSpread ? Math.sin(seed * 9.3) * (lyricSceneMode === 'cloud' ? 0.72 : 0.48) : 0;
        mesh.position.x += (currentX - mesh.position.x) * 0.12;
        mesh.position.y += (currentY - mesh.position.y) * 0.18;
        mesh.position.z += (currentZ - mesh.position.z) * 0.14;
        mesh.scale.setScalar(currentScale);
        mesh.rotation.z = lyricSceneMode === 'cloud' ? Math.sin(seed * 4.9) * 0.055 : Math.sin(t * 0.25 + seed) * 0.010;
      } else if (lyricSceneMode === 'float') {
        mesh.userData.skullMouthMeshLocked = false;
        mesh.scale.setScalar(0.88 + a * 0.12 + breathe + bass * 0.05);
        mesh.position.x += ((Math.sin(t * 0.48 + seed) * 0.98) - mesh.position.x) * 0.11;
        mesh.position.y += ((0.18 + Math.sin(t * 0.62 + seed) * 0.48) - mesh.position.y) * 0.11;
        mesh.position.z += ((1.48 + Math.cos(t * 0.50 + seed) * 0.38) - mesh.position.z) * 0.11;
        mesh.rotation.z = Math.sin(t * 0.39 + seed) * 0.075;
      } else {
        mesh.userData.skullMouthMeshLocked = false;
        mesh.scale.setScalar(0.96 + a * 0.055 + breathe + bass * 0.038 + beatPulse * 0.014);
        mesh.position.y += ((0.18 + Math.sin(t * 0.55 + seed) * 0.055 + Math.sin(t * 1.35 + seed) * 0.014) - mesh.position.y) * 0.075;
        mesh.position.z += ((1.48 + Math.cos(t * 0.48 + seed) * 0.080) - mesh.position.z) * 0.080;
        mesh.rotation.z = Math.sin(t * 0.34 + seed) * 0.018;
      }
      if (data.sparks && data.sparkMat) data.sparks.visible = fx.lyricGlowParticles || getLyricSparkOpacity(data) > 0.015;
      if (data.sparks && data.basePositions) {
        var pos = data.sparks.geometry.attributes.position;
        var arr = pos.array, base = data.basePositions;
        data.sparks.rotation.z += ((fx.lyricGlowParticles ? 0.0009 : 0.00025) + stageLyrics.beatGlow * 0.0007) * (dt * 60);
        data.sparks.rotation.x = Math.sin(t * 0.12 + seed) * 0.012;
        for (var si = 0; si < arr.length / 3; si++) {
          var s = si * 12.989 + seed;
          var particleBeat = fx.lyricGlowParticles ? stageLyrics.beatGlow : 0;
          var dustBreath = fx.lyricGlowParticles ? (0.62 + 0.38 * Math.sin(t * (0.32 + (si % 7) * 0.025) + s)) : 0.18;
          var drift = fx.lyricGlowParticles ? 1 : 0.30;
          arr[si*3] = base[si*3] + Math.sin(t * (0.18 + (si % 5) * 0.025) + s) * (0.045 + bass * 0.030 + particleBeat * 0.052) * drift + Math.cos(t * 0.11 + s) * 0.018 * dustBreath;
          arr[si*3+1] = base[si*3+1] + Math.cos(t * (0.16 + (si % 6) * 0.024) + s) * (0.042 + mid * 0.026 + particleBeat * 0.046) * drift + Math.sin(t * 0.13 + s) * 0.016 * dustBreath;
          arr[si*3+2] = base[si*3+2] + Math.sin(t * (0.24 + (si % 4) * 0.035) + s) * (0.036 + particleBeat * 0.028) * drift;
        }
        pos.needsUpdate = true;
      }
      return true;
    }
    if (cascadeLine) {
      stackIndex = Math.max(1, stackIndex || 1);
      var life = mesh.userData.cascadeLife || mesh.userData.age || 0;
      var fade = clampRange(1 - life / 6.2, 0, 1);
      var slotFade = clampRange(1 - (stackIndex - 1) * 0.16, 0.26, 1);
      var cascadeOpacity = fade * slotFade * shelfDetailLyricProfile.outgoing;
      var cloudMode = lyricSceneMode === 'cloud';
      var networkMode = lyricSceneMode === 'network';
      var lineY = 0.46 - stackIndex * (cloudMode ? 0.30 : 0.39) - life * 0.018 + (cloudMode ? Math.cos((mesh.userData.floatSeed || 0) * 5.7) * 0.18 : 0);
      var lineZ = 1.50 - stackIndex * 0.045 - life * 0.026;
      var lineScale = Math.max(0.46, 0.74 - stackIndex * 0.050 - life * 0.010);
      var lineX = (cloudMode || networkMode) ? Math.sin((mesh.userData.floatSeed || 0) * 9.3 + stackIndex) * (cloudMode ? 0.76 : 0.48) : 0;
      mesh.position.x += (lineX - mesh.position.x) * 0.10;
      mesh.position.y += (lineY - mesh.position.y) * 0.16;
      mesh.position.z += (lineZ - mesh.position.z) * 0.13;
      mesh.scale.setScalar(lineScale);
      mesh.rotation.z = cloudMode ? Math.sin((mesh.userData.floatSeed || 0) * 4.9) * 0.055 : Math.sin(t * 0.20 + (mesh.userData.floatSeed || 0)) * 0.006;
      if (data.textMat) data.textMat.uniforms.uOpacity.value = cascadeOpacity;
      if (data.readabilityMat) data.readabilityMat.opacity = cascadeOpacity * (shelfDetailOpen ? shelfDetailLyricProfile.readability : 0.50);
      if (data.textMat && data.textMat.uniforms.uSolar) data.textMat.uniforms.uSolar.value *= shelfDetailOpen ? 0.76 : 0.90;
      if (data.glowMat) data.glowMat.opacity = lyricGlowStrength > 0 ? cascadeOpacity * (0.045 + Math.min(0.12, stageLyrics.beatGlow * 0.025)) * lyricGlowStrength : 0;
      if (data.sparkMat) {
        setLyricSparkOpacity(data, lyricGlowStrength > 0 && fx.lyricGlowParticles && !shelfDetailOpen ? cascadeOpacity * 0.10 * lyricGlowStrength : 0);
        setLyricSparkSize(data, 0.040 + cascadeOpacity * 0.014);
      }
      if (data.sunMat) data.sunMat.opacity = lyricGlowStrength > 0 && !shelfDetailOpen ? cascadeOpacity * 0.045 * lyricGlowStrength : 0;
      return cascadeOpacity > 0.025 && stackIndex <= 5;
    }
    opacity = (1 - a) * (warpLine ? 0.96 : 0.72) * shelfDetailLyricProfile.outgoing;
    if (data.textMat) data.textMat.uniforms.uOpacity.value = opacity;
    if (data.readabilityMat) data.readabilityMat.opacity = opacity * (shelfDetailOpen ? shelfDetailLyricProfile.readability : 0.58);
    if (data.textMat && data.textMat.uniforms.uSolar) data.textMat.uniforms.uSolar.value *= shelfDetailOpen ? 0.72 : 0.86;
    if (data.glowMat) data.glowMat.opacity = lyricGlowStrength > 0 ? (shelfDetailOpen ? Math.min(shelfDetailLyricProfile.glowCap * 0.40, opacity * 0.05 * lyricGlowStrength) : opacity * 0.08 * lyricGlowStrength) : 0;
    if (data.sparkMat) {
      var outgoingSpark = lyricGlowStrength > 0 && fx.lyricGlowParticles && !shelfDetailOpen ? Math.max(opacity * 0.24 * lyricGlowStrength, (1 - a) * 0.18 * lyricGlowStrength) : 0;
      setLyricSparkOpacity(data, outgoingSpark);
      setLyricSparkSize(data, 0.046 + (1 - a) * 0.020);
    }
    if (data.sunMat) data.sunMat.opacity = lyricGlowStrength > 0 && !shelfDetailOpen ? opacity * 0.08 * lyricGlowStrength : 0;
    if (lyricSceneMode === 'warp') {
      if (!mesh.userData.warpExitStartPosition) {
        mesh.userData.warpExitStartPosition = mesh.position.clone();
        mesh.userData.warpExitStartScale = mesh.scale.x;
        mesh.userData.warpExitStartRotation = mesh.rotation.z;
      }
      var warpExit = resolveLyricWarpPosition(mesh, 'exit');
      var warpStart = mesh.userData.warpExitStartPosition;
      var warpExitScale = mesh.userData.warpExitStartScale || mesh.userData.warpFinalScale || 1;
      var warpExitSpin = Math.sin((mesh.userData.floatSeed || 0) * 12.37) >= 0 ? 1 : -1;
      if (warpExit) {
        mesh.position.x = warpStart.x + (warpExit.x - warpStart.x) * a + Math.sin(a * Math.PI * 2) * (1 - a) * 0.12;
        mesh.position.y = warpStart.y + (warpExit.y - warpStart.y) * a + Math.cos(a * Math.PI * 2) * (1 - a) * 0.08;
        mesh.position.z = warpStart.z + (warpExit.z - warpStart.z) * a - a * a * 4.6;
      }
      mesh.scale.setScalar(Math.max(0.002, warpExitScale * (1 - a)));
      mesh.rotation.z = (mesh.userData.warpExitStartRotation || 0) + warpExitSpin * a * a * 0.86;
      return a < 1;
    }
    if (mesh.userData.pushOutDirection) {
      var pushOut = mesh.userData.pushOutDirection;
      mesh.position.x += pushOut * dt * (5.2 + a * 3.4);
      mesh.position.y += pushOut * dt * 0.42;
      mesh.position.z -= dt * 0.18;
      mesh.scale.setScalar(1 - a * 0.08);
      mesh.rotation.z += pushOut * dt * 0.72;
      return a < 1;
    }
    var exitSeed = mesh.userData.floatSeed || 0;
    var exitSide = Math.sin(exitSeed * 7.31) >= 0 ? 1 : -1;
    var modeExit = true;
    if (lyricSceneMode === 'float') {
      mesh.position.x += exitSide * dt * 0.72;
      mesh.position.y += dt * 1.05;
      mesh.rotation.z += exitSide * dt * 0.42;
    } else if (lyricSceneMode === 'slant' || lyricSceneMode === 'sweep' || lyricSceneMode === 'glide') {
      mesh.position.x += exitSide * dt * 3.2;
      mesh.position.y += exitSide * dt * 0.52;
      mesh.rotation.z += exitSide * dt * 0.82;
    } else if (lyricSceneMode === 'scatter') {
      mesh.position.x += exitSide * dt * 2.5;
      mesh.position.y += (Math.cos(exitSeed * 5.17) >= 0 ? 1 : -1) * dt * 1.7;
      mesh.position.z -= dt * 0.82;
      mesh.rotation.z += exitSide * dt * 1.05;
    } else if (lyricSceneMode === 'orbit' || lyricSceneMode === 'pendulum') {
      mesh.position.x += exitSide * dt * 2.25;
      mesh.position.y -= dt * 0.92;
      mesh.rotation.z += exitSide * dt * 0.92;
    } else if (lyricSceneMode === 'wave' || lyricSceneMode === 'bounce') {
      mesh.position.y += (lyricSceneMode === 'bounce' ? 1 : -1) * dt * 1.75;
      mesh.position.x += exitSide * dt * 0.82;
      mesh.rotation.z += exitSide * dt * 0.48;
    } else if (lyricSceneMode === 'flip') {
      mesh.position.z -= dt * 0.95;
      mesh.rotation.y += exitSide * dt * 1.4;
    } else if (lyricSceneMode === 'depth' || lyricSceneMode === 'pulse' || lyricSceneMode === 'stretch') {
      mesh.position.z -= dt * (lyricSceneMode === 'depth' ? 2.7 : 1.25);
      mesh.scale.setScalar(Math.max(0.76, 1 - a * (lyricSceneMode === 'pulse' ? 0.20 : 0.12)));
    } else if (lyricSceneMode === 'geometry') {
      mesh.position.x += exitSide * dt * 1.35;
      mesh.position.y += dt * 1.15;
      mesh.position.z -= dt * 0.72;
      mesh.rotation.z += exitSide * dt * 1.18;
    } else if (lyricSceneMode === 'drift') {
      mesh.position.x += exitSide * dt * 1.45;
      mesh.position.y += dt * 0.44;
      mesh.rotation.z += exitSide * dt * 0.32;
    } else {
      modeExit = false;
    }
    if (modeExit) {
      if (lyricSceneMode !== 'depth' && lyricSceneMode !== 'pulse' && lyricSceneMode !== 'stretch') mesh.scale.setScalar(0.98 - a * 0.07);
      return a < 1;
    }
    mesh.position.z -= dt * 0.26;
    mesh.position.y += dt * 0.08;
    mesh.scale.setScalar(0.98 - a * 0.06);
    return a < 1;
  }
  tickMesh(stageLyrics.current, true, 0);
  if (stageLyrics.current && !skullMouthLyrics && /^(auto|warp)$/.test(normalizeLyricFlowMode(fx.lyricFlowMode))) {
    constrainCurrentLyricToViewport(stageLyrics.current);
  }
  for (var i = stageLyrics.outgoing.length - 1; i >= 0; i--) {
    var stackIndex = stageLyrics.outgoing.length - i;
    if (!tickMesh(stageLyrics.outgoing[i], false, stackIndex)) {
      disposeLyricMesh(stageLyrics.outgoing[i]);
      stageLyrics.outgoing.splice(i, 1);
    }
  }
  updateLyricNetworkLines();
}

function tickLyricsParticles() {
  if (!fx.particleLyrics) {
    if (stageLyrics.current || stageLyrics.currentText || (stageLyrics.outgoing && stageLyrics.outgoing.length)) clearStageLyrics();
    return;
  }
  if (!playing || !audio || !lyricsLines.length) {
    if (stageLyrics.current) {
      stageLyrics.current.userData.state = 'out';
      stageLyrics.current.userData.age = 0;
      stageLyrics.outgoing.push(stageLyrics.current);
      stageLyrics.current = null;
      stageLyrics.currentIdx = -1;
      stageLyrics.currentText = '';
    }
    return;
  }
  var t = audio.currentTime;
  var newIdx = findLyricLineIndexAt(lyricsLines, t, stageLyrics.currentIdx);
  if (newIdx < 0) {
    var introText = currentLyricFallbackText();
    if (!introText) {
      clearStageLyrics();
      return;
    }
    if (stageLyrics.currentIdx !== -2 || stageLyrics.currentText !== introText) {
      stageLyrics.currentIdx = -2;
      showStageLine(introText);
    }
    if (stageLyrics.current) {
      var firstLine = lyricsLines[0];
      var introEnd = firstLine && firstLine.t > 0 ? firstLine.t : Math.min((audio && audio.duration) || 4.8, 4.8);
      var introLine = { t:0, text:introText, duration:Math.max(0.8, introEnd), charCount:Math.max(1, introText.length), fallback:true };
      updateLyricMeshProgress(stageLyrics.current, getLyricLineProgress(introLine, null, t));
    }
    return;
  }
  if (newIdx !== stageLyrics.currentIdx) {
    stageLyrics.currentIdx = newIdx;
    showStageLine(lyricsLines[newIdx].text || '');
  }
  if (stageLyrics.current) {
    var curLine = lyricsLines[newIdx] || { t:t };
    var nextLine = lyricsLines[newIdx + 1];
    var progress = getLyricLineProgress(curLine, nextLine, t);
    updateLyricMeshProgress(stageLyrics.current, progress);
  }
}

function disposeLyricsParticles() {
  clearStageLyrics();
  if (stageLyrics.networkLines) {
    if (stageLyrics.networkLines.parent) stageLyrics.networkLines.parent.remove(stageLyrics.networkLines);
    if (stageLyrics.networkLines.geometry) stageLyrics.networkLines.geometry.dispose();
    if (stageLyrics.networkLines.material) stageLyrics.networkLines.material.dispose();
    stageLyrics.networkLines = null;
  }
  if (stageLyrics.starRiver) {
    if (stageLyrics.starRiver.parent) stageLyrics.starRiver.parent.remove(stageLyrics.starRiver);
    if (stageLyrics.starRiver.geometry) stageLyrics.starRiver.geometry.dispose();
    if (stageLyrics.starRiver.material) stageLyrics.starRiver.material.dispose();
    stageLyrics.starRiver = null;
  }
  if (stageLyrics.group) {
    scene.remove(stageLyrics.group);
    stageLyrics.group = null;
  }
}

function __mineradioInitLyricsLyricEffects32() {
  // ============================================================
  //  舞台歌词系统 v9 — Three.js 文字平面, 跟随专辑粒子 3D 运动
  // ============================================================
  stageLyrics = {
    group: null,
    current: null,
    outgoing: [],
    currentIdx: -1,
    currentText: '',
    highBloom: 0,
    beatGlow: 0,
    glowFollowX: 0,
    glowFollowY: 0,
    glowFollowRoll: 0,
    palette: {
      primary: '#d6f8ff',
      secondary: '#9cffdf',
      highlight: '#eef7ff',
      shadow: 'rgba(2,8,12,0.42)',
      glow: 'rgba(143,233,255,0.34)',
    },
    coverPalette: {
      primary: '#d6f8ff',
      secondary: '#9cffdf',
      highlight: '#eef7ff',
      shadow: 'rgba(2,8,12,0.42)',
      glow: 'rgba(143,233,255,0.34)',
    },
    starRiver: null,
    starRiverWidth: 4.2,
    starRiverHeight: 0.58,
    networkLines: null,
    lockFitScale: 1,
    snapCameraLockFrames: 0,
    autoFlowMode: 'float',
    autoFlowLinesRemaining: 0,
    warpEntryIndex: 0,
    warpExitIndex: 0,
    warpEntryOffset: { x: Math.random(), y: Math.random() },
    warpExitOffset: { x: Math.random(), y: Math.random() },
  };

  lyricSunColor = new THREE.Color(0xffe6a4);

  lyricSunHotColor = new THREE.Color(0xfff4cc);

  lyricCameraDir = new THREE.Vector3();

  lyricCameraRight = new THREE.Vector3();

  lyricCameraUp = new THREE.Vector3();

  lyricCameraTarget = new THREE.Vector3();

  lyricLayoutBase = new THREE.Vector3();

  lyricLayoutTarget = new THREE.Vector3();

  lyricCoverWorldPos = new THREE.Vector3();

  lyricCoverWorldQuat = new THREE.Quaternion();

  lyricBaseEuler = new THREE.Euler(0, 0, 0, 'YXZ');

  lyricTiltEuler = new THREE.Euler(0, 0, 0, 'YXZ');

  lyricBaseQuat = new THREE.Quaternion();

  lyricTiltQuat = new THREE.Quaternion();

  lyricTargetQuat = new THREE.Quaternion();

  lyricViewportCorner = new THREE.Vector3();

  lyricViewportCenter = new THREE.Vector3();

  lyricViewportBasisX = new THREE.Vector3();

  lyricViewportBasisY = new THREE.Vector3();

  lyricViewportOffsetX = new THREE.Vector3(1, 0, 0);

  lyricViewportOffsetY = new THREE.Vector3(0, 1, 0);

  LYRIC_CAMERA_LOCK_MAX_SCALE = 0.80;

  LYRIC_SCENE_MODES = ['float', 'slant', 'cloud', 'network', 'geometry', 'scatter', 'stretch', 'orbit', 'wave', 'flip', 'sweep', 'bounce', 'pendulum', 'depth', 'drift', 'pulse', 'glide', 'push'];

  // 兼容旧变量名以便其它代码不破坏
  lyricsParticles = null;

  lyricsGeo = null;

  // 三个 attribute: 源位置(随机扩散态), 目标位置(组成字), color, brightness
  lyricsAttrTargetA = null;

  lyricsAttrTargetB = null;

  lyricsAttrSeed = null;

  CUSTOM_BG_DB_NAME = 'mineradio-custom-background-v1';

  CUSTOM_BG_STORE = 'media';

  customBgObjectUrl = '';

  customBgApplyToken = 0;

  colorLabState = { picker: null, id: '', h: 0, s: 1, v: 1, dragging: false };

  COLOR_LAB_PRESETS = [
    { name: '极黑', color: '#000000' },
    { name: '极白', color: '#ffffff' },
    { name: '克莱因蓝', color: '#002fa7' },
    { name: '法拉利红', color: '#f00000' },
    { name: '香槟金', color: '#c8a96a' },
    { name: '孔雀绿', color: '#006b5b' },
    { name: '午夜紫', color: '#2b164f' },
    { name: '银雾', color: '#d9dde2' }
  ];

  window.addEventListener('resize', function(){
    if (window.requestAnimationFrame) requestAnimationFrame(repositionFxFloatingPanels);
    else repositionFxFloatingPanels();
  });

  STAGE_LYRIC_MAX_LINES = 1;

  lyricSunBloomTexture = null;
}
