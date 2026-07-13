'use strict';

// Mineradio classic module: visual/particle-special.
function makeLaserDotTexture() {
  var cv = document.createElement('canvas'); cv.width = cv.height = 64;
  var ctx = cv.getContext('2d');
  var g = ctx.createRadialGradient(32, 32, 0, 32, 32, 31);
  g.addColorStop(0.00, 'rgba(255,255,255,1)');
  g.addColorStop(0.38, 'rgba(255,255,255,0.96)');
  g.addColorStop(0.58, 'rgba(255,255,255,0.42)');
  g.addColorStop(0.78, 'rgba(255,255,255,0.08)');
  g.addColorStop(1.00, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 64, 64);
  var tex = new THREE.CanvasTexture(cv);
  tex.minFilter = THREE.LinearFilter; tex.magFilter = THREE.LinearFilter;
  return tex;
}

function makeParticleClockTexture() {
  var cv = document.createElement('canvas');
  cv.width = 1024;
  cv.height = 256;
  var tex = new THREE.CanvasTexture(cv);
  tex.minFilter = THREE.LinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.generateMipmaps = false;
  tex.wrapS = THREE.ClampToEdgeWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.userData = { canvas: cv, lastText: '', lastSecond: -1 };
  updateParticleClockTexture(tex, true);
  return tex;
}

function particleClockPad(n) {
  n = Math.floor(Number(n) || 0);
  return n < 10 ? '0' + n : String(n);
}

function updateParticleClockTexture(tex, force) {
  if (!tex || !tex.userData || !tex.userData.canvas) return;
  var second = Math.floor(Date.now() / 1000);
  if (!force && tex.userData.lastSecond === second) return;
  tex.userData.lastSecond = second;
  var now = new Date(second * 1000);
  var text = particleClockPad(now.getHours()) + ':' + particleClockPad(now.getMinutes()) + ':' + particleClockPad(now.getSeconds());
  if (!force && tex.userData.lastText === text) return;
  tex.userData.lastText = text;
  var cv = tex.userData.canvas;
  var ctx = cv.getContext('2d');
  var W = cv.width, H = cv.height;
  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, W, H);
  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = '900 168px "JetBrains Mono","SF Mono","Menlo","Consolas",monospace';
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.shadowColor = 'rgba(220,245,255,0.78)';
  ctx.shadowBlur = 28;
  ctx.strokeStyle = 'rgba(255,255,255,0.66)';
  ctx.lineWidth = 7;
  ctx.strokeText(text, W / 2, H / 2 + 2);
  ctx.shadowBlur = 0;
  ctx.fillStyle = '#fff';
  ctx.fillText(text, W / 2, H / 2 + 2);
  ctx.restore();
  tex.needsUpdate = true;
}

function laserBeamRand(seed) {
  var x = Math.sin(seed * 127.1 + 41.7) * 43758.5453123;
  return x - Math.floor(x);
}

function tintedLaserColor(index, strength) {
  var src = laserBeamPalette[index % laserBeamPalette.length];
  return new THREE.Color(
    Math.min(1, src.r * strength),
    Math.min(1, src.g * strength),
    Math.min(1, src.b * strength)
  );
}

function setLaserBeamVertex(i, x, y, z, color) {
  var p = i * 3;
  laserBeamPositions[p] = x;
  laserBeamPositions[p + 1] = y;
  laserBeamPositions[p + 2] = z;
  laserBeamColors[p] = color.r;
  laserBeamColors[p + 1] = color.g;
  laserBeamColors[p + 2] = color.b;
}

function buildLaserBeamGeometry() {
  var vi = 0;
  for (var i = 0; i < LASER_BEAM_COUNT; i++) {
    var def = laserBeamDefs[i];
    var a = def.angle;
    var color = tintedLaserColor(def.colorIndex, def.strength);
    var dirX = Math.cos(a), dirY = Math.sin(a);
    var nX = -dirY, nY = dirX;
    var inner = def.inner;
    var outer = def.outer;
    var innerW = def.innerW;
    var outerW = def.outerW;
    var z0 = def.z0;
    var z1 = def.z1;
    var ax = dirX * inner, ay = dirY * inner;
    var bx = dirX * outer, by = dirY * outer;
    var p0x = ax - nX * innerW, p0y = ay - nY * innerW;
    var p1x = ax + nX * innerW, p1y = ay + nY * innerW;
    var p2x = bx + nX * outerW, p2y = by + nY * outerW;
    var p3x = bx - nX * outerW, p3y = by - nY * outerW;
    setLaserBeamVertex(vi++, p0x, p0y, z0, color);
    setLaserBeamVertex(vi++, p1x, p1y, z0, color);
    setLaserBeamVertex(vi++, p2x, p2y, z1, color);
    setLaserBeamVertex(vi++, p0x, p0y, z0, color);
    setLaserBeamVertex(vi++, p2x, p2y, z1, color);
    setLaserBeamVertex(vi++, p3x, p3y, z1, color);
  }
  laserBeamGeometry.setAttribute('position', new THREE.BufferAttribute(laserBeamPositions, 3));
  laserBeamGeometry.setAttribute('color', new THREE.BufferAttribute(laserBeamColors, 3));
}

function updateLaserBeamLayer(dt) {
  if (!laserBeamGroup || !laserBeamMaterial || !laserCoreMaterial || !laserSparkMaterial || !laserBallMaterial) return;
  var active = false;
  var target = active ? 1 : 0;
  laserBeamOpacity += (target - laserBeamOpacity) * Math.min(1, dt * (active ? 8.5 : 12));
  laserBeamGroup.visible = laserBeamOpacity > 0.012;
  if (!laserBeamGroup.visible) return;
  var flash = Math.min(1.5, uniforms.uBeat.value * 1.45 + uniforms.uBass.value * 0.42 + uniforms.uTreble.value * 0.34 + uniforms.uBurstAmt.value * 0.70);
  laserBeamMesh.visible = false;
  laserCoreLines.visible = false;
  laserBeamMaterial.opacity = 0;
  laserCoreMaterial.opacity = 0;
  laserSparkMaterial.opacity = laserBeamOpacity * (0.62 + flash * 0.56);
  laserSparkMaterial.size = 0.18 + flash * 0.070;
  laserBallMaterial.opacity = laserBeamOpacity * (0.62 + flash * 0.16);
  laserBallMaterial.size = 0.025 + flash * 0.0025;
  var tLaser = uniforms.uTime.value;
  for (var i = 0; i < LASER_SPARK_COUNT; i++) {
    var d = i * 4;
    var beam = laserSparkData[d] | 0;
    var def = laserBeamDefs[beam];
    var lane = laserSparkData[d + 1];
    var seedA = laserSparkData[d + 2];
    var seedB = laserSparkData[d + 3];
    var strobeWave = Math.sin(tLaser * def.strobeRate + def.strobePhase + seedB * 0.65) * 0.5 + 0.5;
    var beamGate = Math.max(0, (strobeWave - def.duty) / Math.max(0.001, 1 - def.duty));
    beamGate = Math.pow(beamGate, 2.6);
    beamGate = Math.max(beamGate, flash * def.beatResponse * (0.42 + seedA * 0.35));
    var a = def.angle + def.wobble + Math.sin(tLaser * (0.12 + def.drift) + seedA * 6.283) * (0.012 + Math.abs(def.wobble));
    var dirX = Math.cos(a), dirY = Math.sin(a);
    var nX = -dirY, nY = dirX;
    var flow = (lane + tLaser * (def.sparkSpeed + seedA * 0.030) + seedB * 0.24) % 1;
    var rayT = Math.pow(flow, 0.90);
    var radius = 1.22 + rayT * (9.5 + def.outer * 0.64);
    var cross = (seedB - 0.5) * (def.sparkSpread * 0.54 + rayT * def.outerW * 0.42) + Math.sin(tLaser * (1.35 + seedA + def.drift) + seedB * 8.0) * (0.020 + def.outerW * 0.030);
    var p = i * 3;
    laserSparkPositions[p] = dirX * radius + nX * cross;
    laserSparkPositions[p + 1] = dirY * radius + nY * cross;
    laserSparkPositions[p + 2] = 0.96 + (seedA - 0.5) * (0.55 + rayT * 0.78) + Math.sin(tLaser * 1.2 + seedA * 10.0) * 0.10;
    var trail = Math.pow(Math.max(0, Math.sin(flow * Math.PI * 9.0 - tLaser * (4.8 + seedA * 2.0) + seedB * 6.283)), 3.0);
    var edgePop = Math.pow(1.0 - Math.abs(flow - 0.5) * 2.0, 0.65);
    var brightness = beamGate * (0.18 + trail * 1.35 + edgePop * 0.36) * def.strength;
    var sparkColorIndex = def.colorIndex + (i % 5);
    var sparkColor = laserBeamPalette[sparkColorIndex % laserBeamPalette.length];
    laserSparkColors[p] = sparkColor.r * brightness;
    laserSparkColors[p + 1] = sparkColor.g * brightness;
    laserSparkColors[p + 2] = sparkColor.b * brightness;
  }
  laserSparkGeometry.attributes.position.needsUpdate = true;
  laserSparkGeometry.attributes.color.needsUpdate = true;
  laserBeamGroup.rotation.copy(particles.rotation);
  laserBeamGroup.rotation.z += uniforms.uTime.value * 0.08;
  laserBallPoints.rotation.y = tLaser * 0.18;
  laserBallPoints.rotation.x = Math.sin(tLaser * 0.13) * 0.06;
  var pulseScale = 1 + flash * 0.055;
  laserBeamGroup.scale.set(pulseScale, pulseScale, 1);
}

function buildHexagramLayer() {
  var triR = 2.74;
  var up = [];
  var down = [];
  for (var i = 0; i < 3; i++) {
    var au = Math.PI * 0.5 + i * Math.PI * 2 / 3;
    var ad = -Math.PI * 0.5 + i * Math.PI * 2 / 3;
    up.push({ x: Math.cos(au) * triR, y: Math.sin(au) * triR });
    down.push({ x: Math.cos(ad) * triR, y: Math.sin(ad) * triR });
  }
  for (var e = 0; e < 3; e++) {
    var u0 = up[e], u1 = up[(e + 1) % 3];
    var d0 = down[e], d1 = down[(e + 1) % 3];
    for (var s = 0; s < 34; s++) {
      var a = s / 34, b = (s + 0.68) / 34;
      var ugA = hexagramGoldHot.clone().lerp(hexagramCyan, Math.max(0, Math.min(1, (u0.x + (u1.x - u0.x) * a + 2.4) / 4.8)));
      var ugB = hexagramGoldHot.clone().lerp(hexagramCyanHot, Math.max(0, Math.min(1, (u0.x + (u1.x - u0.x) * b + 2.4) / 4.8)));
      var dgA = hexagramCyan.clone().lerp(hexagramGoldHot, Math.max(0, Math.min(1, (d0.x + (d1.x - d0.x) * a + 2.3) / 4.6)));
      var dgB = hexagramCyanHot.clone().lerp(hexagramGold, Math.max(0, Math.min(1, (d0.x + (d1.x - d0.x) * b + 2.3) / 4.6)));
      pushHexSegment(u0.x + (u1.x - u0.x) * a, u0.y + (u1.y - u0.y) * a, u0.x + (u1.x - u0.x) * b, u0.y + (u1.y - u0.y) * b, ugA, ugB, s * 0.21 + e, 0.006, 1);
      pushHexSegment(d0.x + (d1.x - d0.x) * a, d0.y + (d1.y - d0.y) * a, d0.x + (d1.x - d0.x) * b, d0.y + (d1.y - d0.y) * b, dgA, dgB, s * 0.17 + e + 3.0, 0.006, 1);
    }
  }
  var hex = [];
  for (var hi = 0; hi < 6; hi++) {
    var ha = Math.PI * 0.5 + hi * Math.PI / 3;
    hex.push({ x: Math.cos(ha) * 1.34, y: Math.sin(ha) * 1.34 });
  }
  hex.push(hex[0]);
  pushHexPolyline(hex, hexagramGoldHot, hexagramCyanHot, 2.0, 0.004, 0.8);
  for (var spoke = 0; spoke < 6; spoke++) {
    var sa = Math.PI * 0.5 + spoke * Math.PI / 3;
    var sc = spoke % 2 ? hexagramCyanHot : hexagramGoldHot;
    pushHexSegment(Math.cos(sa) * 0.24, Math.sin(sa) * 0.24, Math.cos(sa) * 2.82, Math.sin(sa) * 2.82, sc, sc, spoke * 0.41, 0.002, 0.8);
  }
  for (var ri = 0; ri < 17; ri++) {
    var ringR = 1.18 + ri * 0.185;
    var segs = ri < 7 ? 104 : 150;
    for (var rs = 0; rs < segs; rs++) {
      if ((rs + ri * 3) % (ri < 6 ? 7 : 5) === 0) continue;
      var t0 = rs / segs * Math.PI * 2;
      var t1 = (rs + (ri < 7 ? 0.54 : 0.38)) / segs * Math.PI * 2;
      var wob0 = Math.sin(t0 * 5 + ri) * (ri > 10 ? 0.022 : 0.004);
      var wob1 = Math.sin(t1 * 5 + ri) * (ri > 10 ? 0.022 : 0.004);
      var c0 = hexagramGold.clone().lerp(hexagramCyan, 0.5 + 0.5 * Math.sin(t0 + ri * 0.35));
      var c1 = hexagramGoldHot.clone().lerp(hexagramCyanHot, 0.5 + 0.5 * Math.sin(t1 + ri * 0.35));
      pushHexSegment(Math.cos(t0) * (ringR + wob0), Math.sin(t0) * (ringR + wob0), Math.cos(t1) * (ringR + wob1), Math.sin(t1) * (ringR + wob1), c0, c1, ri * 0.31 + rs * 0.03, ri < 9 ? 0.0015 : 0.008, ri < 9 ? 0.5 : 0.9);
    }
  }
  var allVertices = up.concat(down);
  allVertices.forEach(function(v, idx){
    var hot = idx % 2 ? hexagramCyanHot : hexagramGoldHot;
    pushHexSpark(v.x, v.y, 0.34, hot, idx * 0.7, 0.28, 1);
    pushHexSegment(v.x - 0.52, v.y, v.x + 0.52, v.y, hot, hot, idx, 0.0, 1.2);
    pushHexSegment(v.x, v.y - 0.52, v.x, v.y + 0.52, hot, hot, idx + 0.2, 0.0, 1.2);
    pushHexSegment(v.x - 0.31, v.y - 0.31, v.x + 0.31, v.y + 0.31, hot, hot, idx + 0.4, 0.0, 1.1);
    pushHexSegment(v.x - 0.31, v.y + 0.31, v.x + 0.31, v.y - 0.31, hot, hot, idx + 0.6, 0.0, 1.1);
  });
  pushHexSpark(0, 0, 0.46, hexagramGoldHot, 5.0, 0.42, 2);
  pushHexSegment(-0.62, 0, 0.62, 0, hexagramGoldHot, hexagramGoldHot, 5.2, 0, 1.4);
  pushHexSegment(0, -0.62, 0, 0.62, hexagramGoldHot, hexagramGoldHot, 5.4, 0, 1.4);
  pushHexSegment(-0.42, -0.42, 0.42, 0.42, hexagramGoldHot, hexagramGoldHot, 5.6, 0, 1.2);
  pushHexSegment(-0.42, 0.42, 0.42, -0.42, hexagramGoldHot, hexagramGoldHot, 5.8, 0, 1.2);
  for (var pi = 0; pi < 1500; pi++) {
    var seed = laserBeamRand(pi * 1.37 + 8.0);
    var outer = seed > 0.36;
    var pa = laserBeamRand(pi + 2.1) * Math.PI * 2;
    var pr = outer ? (3.00 + Math.pow(laserBeamRand(pi + 4.4), 0.55) * 2.55) : (0.28 + Math.pow(laserBeamRand(pi + 6.7), 0.72) * 2.72);
    var py = Math.sin(pa * (outer ? 0.92 : 1.0) + seed * 2.2) * pr * (outer ? 0.70 : 0.82);
    var px = Math.cos(pa) * pr;
    var pc = hexagramGold.clone().lerp(hexagramCyan, laserBeamRand(pi + 12.5));
    pushHexSpark(px, py, -0.10 + laserBeamRand(pi + 7.2) * 0.30, pc, seed * 6.28, outer ? 0.080 : 0.058, 0);
  }
  hexagramLineGeometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(hexagramLinePositions), 3));
  hexagramLineGeometry.setAttribute('color', new THREE.BufferAttribute(new Float32Array(hexagramLineColors), 3));
  var sparkGeo = new THREE.BufferGeometry();
  sparkGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(hexagramSparkPositions), 3));
  sparkGeo.setAttribute('color', new THREE.BufferAttribute(new Float32Array(hexagramSparkColors), 3));
  hexagramGroup.userData.lineBase = new Float32Array(hexagramLinePositions);
  hexagramGroup.userData.lineData = new Float32Array(hexagramLineData);
  hexagramGroup.userData.sparkBase = new Float32Array(hexagramSparkPositions);
  hexagramGroup.userData.sparkData = new Float32Array(hexagramSparkData);
  var lineMat = new THREE.LineBasicMaterial({ transparent:true, opacity:0, depthWrite:false, depthTest:false, blending:THREE.AdditiveBlending, vertexColors:true });
  var lines = new THREE.LineSegments(hexagramLineGeometry, lineMat);
  lines.frustumCulled = false;
  lines.renderOrder = 7;
  hexagramGroup.add(lines);
  var sparkMat = new THREE.PointsMaterial({ map:laserDotTexture, transparent:true, opacity:0, depthWrite:false, depthTest:false, blending:THREE.AdditiveBlending, vertexColors:true, size:0.055, sizeAttenuation:true });
  var sparks = new THREE.Points(sparkGeo, sparkMat);
  sparks.frustumCulled = false;
  sparks.renderOrder = 8;
  hexagramGroup.add(sparks);
}

function updateHexagramLayer(dt) {
  if (!hexagramGroup || !hexagramGroup.children || hexagramGroup.children.length < 2) return;
  var active = fx && fx.preset === HEXAGRAM_PRESET_INDEX;
  var target = active ? 1 : 0;
  hexagramOpacity += (target - hexagramOpacity) * Math.min(1, dt * (active ? 7.5 : 11));
  hexagramGroup.visible = hexagramOpacity > 0.012;
  if (!hexagramGroup.visible) return;
  var tHex = uniforms.uTime.value;
  var flash = Math.min(1.45, uniforms.uBeat.value * 1.15 + uniforms.uBass.value * 0.36 + uniforms.uTreble.value * 0.30 + uniforms.uBurstAmt.value * 0.60);
  var lineObj = hexagramGroup.children[0];
  var sparkObj = hexagramGroup.children[1];
  lineObj.material.opacity = hexagramOpacity * (0.34 + flash * 0.13);
  sparkObj.material.opacity = hexagramOpacity * (0.64 + flash * 0.24);
  sparkObj.material.size = 0.060 + flash * 0.022;
  var lineAttr = lineObj.geometry.attributes.position;
  var lineArr = lineAttr.array;
  var base = hexagramGroup.userData.lineBase;
  var data = hexagramGroup.userData.lineData;
  for (var i = 0; i < lineArr.length / 3; i++) {
    var lp = i * 3;
    var dp = i * 3;
    var phase = data[dp];
    var drift = data[dp + 1];
    var pulse = data[dp + 2];
    var breathe = Math.sin(tHex * (0.62 + pulse * 0.18) + phase) * drift + flash * 0.006 * pulse;
    var x = base[lp], y = base[lp + 1];
    var invLen = 1 / Math.max(0.001, Math.sqrt(x * x + y * y));
    lineArr[lp] = x + x * invLen * breathe;
    lineArr[lp + 1] = y + y * invLen * breathe;
    lineArr[lp + 2] = base[lp + 2] + Math.sin(tHex * 0.72 + phase) * 0.010 * pulse + flash * 0.012;
  }
  lineAttr.needsUpdate = true;
  var sparkAttr = sparkObj.geometry.attributes.position;
  var sparkArr = sparkAttr.array;
  var sparkBase = hexagramGroup.userData.sparkBase;
  var sparkData = hexagramGroup.userData.sparkData;
  for (var si = 0; si < sparkArr.length / 3; si++) {
    var sp = si * 3;
    var sd = si * 3;
    var kind = sparkData[sd + 2];
    var tw = Math.sin(tHex * (0.72 + kind * 0.42) + sparkData[sd]) * 0.5 + 0.5;
    var x0 = sparkBase[sp], y0 = sparkBase[sp + 1];
    var len = Math.max(0.001, Math.sqrt(x0 * x0 + y0 * y0));
    var driftAmt = (kind > 0.5 ? 0.012 : 0.034) * (0.35 + tw * 0.65) + flash * 0.010;
    sparkArr[sp] = x0 + x0 / len * driftAmt;
    sparkArr[sp + 1] = y0 + y0 / len * driftAmt;
    sparkArr[sp + 2] = sparkBase[sp + 2] + tw * (kind > 0.5 ? 0.036 : 0.12) + flash * 0.020;
  }
  sparkAttr.needsUpdate = true;
  hexagramGroup.rotation.copy(particles.rotation);
  hexagramGroup.rotation.z += tHex * 0.010;
  var scale = 1 + flash * 0.018;
  hexagramGroup.scale.set(scale, scale, 1);
}

function getParticleClockIdleRenderFps() {
  if (!(fx && fx.preset === PARTICLE_CLOCK_PRESET_INDEX)) return 0;
  if (typeof isRenderInteractionActive === 'function' && isRenderInteractionActive()) return 0;
  if (presetTransition && presetTransition.active) return 48;
  var quality = normalizePerformanceQuality(fx && fx.performanceQuality);
  if (quality === 'eco') return 24;
  if (quality === 'balanced') return 30;
  if (quality === 'ultra') return 48;
  return 36;
}

function __mineradioInitVisualParticleSpecial30() {
  // ============================================================
  //  旧镭射层已停用。保留空壳只为平滑清退旧运行态引用。
  // ============================================================
  LASER_BEAM_COUNT = 0;

  laserBeamGroup = new THREE.Group();

  laserBeamOpacity = 0;

  laserBeamGeometry = new THREE.BufferGeometry();

  laserBeamPositions = new Float32Array(LASER_BEAM_COUNT * 6 * 3);

  laserBeamColors = new Float32Array(LASER_BEAM_COUNT * 6 * 3);

  laserBeamPalette = [
    new THREE.Color('#18ffe6'),
    new THREE.Color('#52a8ff'),
    new THREE.Color('#ff3ea5'),
    new THREE.Color('#ffe86b'),
    new THREE.Color('#9b7cff')
  ];

  laserBeamDefs = [];

  for (lbi = 0; lbi < LASER_BEAM_COUNT; lbi++) {
    baseAngle = (lbi / LASER_BEAM_COUNT) * Math.PI * 2;
    clusterBend = Math.sin(lbi * 1.73) * 0.15 + Math.sin(lbi * 0.61 + 1.4) * 0.08;
    angleJitter = (laserBeamRand(lbi + 0.13) - 0.5) * 0.46;
    strength = 0.60 + laserBeamRand(lbi + 2.77) * 0.40;
    laserBeamDefs.push({
      angle: baseAngle + clusterBend + angleJitter,
      inner: 0.92 + laserBeamRand(lbi + 3.21) * 0.42,
      outer: 16.5 + laserBeamRand(lbi + 4.35) * 12.5 + (lbi % 7 === 0 ? 5.8 : 0),
      innerW: 0.016 + laserBeamRand(lbi + 5.49) * 0.050,
      outerW: 0.20 + laserBeamRand(lbi + 6.63) * 0.82,
      z0: 0.88 + laserBeamRand(lbi + 7.77) * 0.40,
      z1: -6.4 - laserBeamRand(lbi + 8.91) * 9.4,
      wobble: (laserBeamRand(lbi + 9.17) - 0.5) * 0.040,
      drift: 0.030 + laserBeamRand(lbi + 10.31) * 0.070,
      sparkSpread: 0.08 + laserBeamRand(lbi + 11.45) * 0.44,
      sparkSpeed: 0.020 + laserBeamRand(lbi + 12.59) * 0.066,
      strobeRate: 2.2 + laserBeamRand(lbi + 15.87) * 4.4,
      strobePhase: laserBeamRand(lbi + 16.91) * Math.PI * 2,
      duty: 0.38 + laserBeamRand(lbi + 17.05) * 0.32,
      beatResponse: 0.18 + laserBeamRand(lbi + 18.19) * 0.58,
      colorIndex: Math.floor(laserBeamRand(lbi + 13.73) * laserBeamPalette.length),
      strength: strength
    });
  }

  buildLaserBeamGeometry();

  laserBeamMaterial = new THREE.MeshBasicMaterial({
    transparent: true,
    opacity: 0,
    depthWrite: false,
    depthTest: false,
    blending: THREE.AdditiveBlending,
    vertexColors: true,
    side: THREE.DoubleSide
  });

  laserBeamMesh = new THREE.Mesh(laserBeamGeometry, laserBeamMaterial);

  laserBeamMesh.frustumCulled = false;

  laserBeamMesh.renderOrder = 3;

  laserBeamMesh.visible = false;

  laserBeamGroup.add(laserBeamMesh);

  laserCoreGeometry = new THREE.BufferGeometry();

  laserCorePositions = new Float32Array(LASER_BEAM_COUNT * 2 * 3);

  laserCoreColors = new Float32Array(LASER_BEAM_COUNT * 2 * 3);

  for (lci = 0; lci < LASER_BEAM_COUNT; lci++) {
    lcDef = laserBeamDefs[lci];
    lca = lcDef.angle + lcDef.wobble * 1.8;
    lcc = tintedLaserColor(lcDef.colorIndex + 2, Math.min(1, lcDef.strength + 0.18));
    lcDirX = Math.cos(lca), lcDirY = Math.sin(lca);
    lcInner = Math.max(0.84, lcDef.inner - 0.16);
    lcOuter = lcDef.outer + 2.0 + laserBeamRand(lci + 14.2) * 4.5;
    lcBase = lci * 6;
    laserCorePositions[lcBase] = lcDirX * lcInner;
    laserCorePositions[lcBase + 1] = lcDirY * lcInner;
    laserCorePositions[lcBase + 2] = lcDef.z0 + 0.13;
    laserCorePositions[lcBase + 3] = lcDirX * lcOuter;
    laserCorePositions[lcBase + 4] = lcDirY * lcOuter;
    laserCorePositions[lcBase + 5] = lcDef.z1 - 1.4;
    laserCoreColors[lcBase] = lcc.r;
    laserCoreColors[lcBase + 1] = lcc.g;
    laserCoreColors[lcBase + 2] = lcc.b;
    laserCoreColors[lcBase + 3] = lcc.r;
    laserCoreColors[lcBase + 4] = lcc.g;
    laserCoreColors[lcBase + 5] = lcc.b;
  }

  laserCoreGeometry.setAttribute('position', new THREE.BufferAttribute(laserCorePositions, 3));

  laserCoreGeometry.setAttribute('color', new THREE.BufferAttribute(laserCoreColors, 3));

  laserCoreMaterial = new THREE.LineBasicMaterial({
    transparent: true,
    opacity: 0,
    depthWrite: false,
    depthTest: false,
    blending: THREE.AdditiveBlending,
    vertexColors: true,
    linewidth: 1
  });

  laserCoreLines = new THREE.LineSegments(laserCoreGeometry, laserCoreMaterial);

  laserCoreLines.frustumCulled = false;

  laserCoreLines.renderOrder = 4;

  laserCoreLines.visible = false;

  laserBeamGroup.add(laserCoreLines);

  LASER_SPARKS_PER_BEAM = 0;

  LASER_SPARK_COUNT = LASER_BEAM_COUNT * LASER_SPARKS_PER_BEAM;

  laserSparkGeometry = new THREE.BufferGeometry();

  laserSparkPositions = new Float32Array(LASER_SPARK_COUNT * 3);

  laserSparkColors = new Float32Array(LASER_SPARK_COUNT * 3);

  laserSparkData = new Float32Array(LASER_SPARK_COUNT * 4);

  for (lsi = 0; lsi < LASER_SPARK_COUNT; lsi++) {
    beamIndex = Math.floor(lsi / LASER_SPARKS_PER_BEAM);
    sparkIndex = lsi % LASER_SPARKS_PER_BEAM;
    sparkDef = laserBeamDefs[beamIndex];
    sparkColor = tintedLaserColor(sparkDef.colorIndex + sparkIndex, Math.min(1, sparkDef.strength + 0.12));
    sp = lsi * 3;
    sd = lsi * 4;
    laserSparkData[sd] = beamIndex;
    laserSparkData[sd + 1] = (sparkIndex + 0.5) / LASER_SPARKS_PER_BEAM;
    laserSparkData[sd + 2] = Math.random();
    laserSparkData[sd + 3] = Math.random();
    laserSparkColors[sp] = sparkColor.r;
    laserSparkColors[sp + 1] = sparkColor.g;
    laserSparkColors[sp + 2] = sparkColor.b;
  }

  laserSparkGeometry.setAttribute('position', new THREE.BufferAttribute(laserSparkPositions, 3));

  laserSparkGeometry.setAttribute('color', new THREE.BufferAttribute(laserSparkColors, 3));

  laserSparkMaterial = new THREE.PointsMaterial({
    map: laserDotTexture,
    transparent: true,
    opacity: 0,
    depthWrite: false,
    depthTest: false,
    blending: THREE.AdditiveBlending,
    vertexColors: true,
    size: 0.18,
    sizeAttenuation: true
  });

  laserSparkParticles = new THREE.Points(laserSparkGeometry, laserSparkMaterial);

  laserSparkParticles.frustumCulled = false;

  laserSparkParticles.renderOrder = 5;

  laserBeamGroup.add(laserSparkParticles);

  LASER_BALL_COUNT = 0;

  laserBallGeometry = new THREE.BufferGeometry();

  laserBallPositions = new Float32Array(LASER_BALL_COUNT * 3);

  laserBallColors = new Float32Array(LASER_BALL_COUNT * 3);

  laserBallData = new Float32Array(LASER_BALL_COUNT * 3);

  laserBallColorA = new THREE.Color('#f8fbff');

  laserBallColorB = new THREE.Color('#98b8ca');

  laserBallColorC = new THREE.Color('#fff4bc');

  for (lpi = 0; lpi < LASER_BALL_COUNT; lpi++) {
    y = 1 - (lpi / (LASER_BALL_COUNT - 1)) * 2;
    r = Math.sqrt(Math.max(0, 1 - y * y));
    theta = lpi * Math.PI * (3 - Math.sqrt(5));
    facetSeed = laserBeamRand(lpi + 31.7);
    tileBand = Math.floor((y + 1) * 18);
    tileShard = Math.floor(((theta / (Math.PI * 2)) % 1) * 52);
    mirror = laserBeamRand(tileBand * 37.1 + tileShard * 5.3);
    radius = 1.12 + (mirror - 0.5) * 0.020;
    p = lpi * 3;
    laserBallPositions[p] = Math.cos(theta) * r * radius;
    laserBallPositions[p + 1] = y * radius;
    laserBallPositions[p + 2] = Math.sin(theta) * r * radius + 0.98;
    rim = Math.pow(Math.abs(r), 0.62);
    glint = mirror > 0.84 ? 1 : (mirror > 0.64 ? 0.58 : 0.24);
    col = laserBallColorB.clone().lerp(laserBallColorA, 0.34 + rim * 0.34 + glint * 0.28);
    if (facetSeed > 0.92) col.lerp(laserBallColorC, 0.32);
    laserBallColors[p] = col.r;
    laserBallColors[p + 1] = col.g;
    laserBallColors[p + 2] = col.b;
    laserBallData[p] = facetSeed;
    laserBallData[p + 1] = mirror;
    laserBallData[p + 2] = theta;
  }

  laserBallGeometry.setAttribute('position', new THREE.BufferAttribute(laserBallPositions, 3));

  laserBallGeometry.setAttribute('color', new THREE.BufferAttribute(laserBallColors, 3));

  laserBallMaterial = new THREE.PointsMaterial({
    map: laserDotTexture,
    transparent: true,
    opacity: 0,
    depthWrite: false,
    depthTest: true,
    blending: THREE.AdditiveBlending,
    vertexColors: true,
    size: 0.026,
    sizeAttenuation: true
  });

  laserBallPoints = new THREE.Points(laserBallGeometry, laserBallMaterial);

  laserBallPoints.frustumCulled = false;

  laserBallPoints.renderOrder = 6;

  laserBeamGroup.add(laserBallPoints);

  laserBeamGroup.visible = false;

  scene.add(laserBeamGroup);

  // ============================================================
  //  六芒星预设专用: 参考图同款星阵叠加层
  //  主粒子负责点阵密度, 这里补顶点星芒、同心轨迹和外圈波纹。
  // ============================================================
  HEXAGRAM_PRESET_INDEX = 7;

  PARTICLE_CLOCK_PRESET_INDEX = 8;

  hexagramGroup = new THREE.Group();

  hexagramOpacity = 0;

  hexagramGold = new THREE.Color('#ffd987');

  hexagramGoldHot = new THREE.Color('#fff3c8');

  hexagramCyan = new THREE.Color('#62e7ff');

  hexagramCyanHot = new THREE.Color('#d8fbff');

  hexagramLineGeometry = new THREE.BufferGeometry();

  hexagramLinePositions = [];

  hexagramLineColors = [];

  hexagramLineData = [];

  hexagramSparkPositions = [];

  hexagramSparkColors = [];

  hexagramSparkData = [];

  buildHexagramLayer();

  hexagramGroup.visible = false;

  scene.add(hexagramGroup);

  // ============================================================
  //  浮空粒子层 (独立 Points)
  //   v7.1: 速度大幅放慢, 改用 sin/cos 长周期漂移 (优雅而非乱飞)
  // ============================================================
  FLOAT_COUNT = 1300;

  floatGroup = null;

  floatPositionsArr = null, floatBaseArr = null, floatPhaseArr = null, floatColorArr = null;
}
