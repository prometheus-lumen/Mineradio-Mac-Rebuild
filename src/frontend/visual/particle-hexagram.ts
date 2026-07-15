function buildHexagramLayer(): void {
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

function updateHexagramLayer(dt: number): void {
  if (!hexagramGroup || !hexagramGroup.children || hexagramGroup.children.length < 2) return;
  var active = fx && fx.preset === HEXAGRAM_PRESET_INDEX;
  var target = active ? 1 : 0;
  hexagramOpacity += (target - hexagramOpacity) * Math.min(1, dt * (active ? 7.5 : 11));
  hexagramGroup.visible = hexagramOpacity > 0.012;
  if (!hexagramGroup.visible) return;
  var tHex = uniforms.uTime.value;
  var flash = Math.min(1.45, uniforms.uBeat.value * 1.15 + uniforms.uBass.value * 0.36 + uniforms.uTreble.value * 0.30 + uniforms.uBurstAmt.value * 0.60);
  var lineObj = hexagramGroup.children[0] as THREE.LineSegments<THREE.BufferGeometry, THREE.LineBasicMaterial>;
  var sparkObj = hexagramGroup.children[1] as THREE.Points<THREE.BufferGeometry, THREE.PointsMaterial>;
  lineObj.material.opacity = hexagramOpacity * (0.34 + flash * 0.13);
  sparkObj.material.opacity = hexagramOpacity * (0.64 + flash * 0.24);
  sparkObj.material.size = 0.060 + flash * 0.022;
  var lineAttr = lineObj.geometry.attributes.position as THREE.BufferAttribute;
  var lineArr = lineAttr.array as Float32Array;
  var base = hexagramGroup.userData.lineBase as Float32Array;
  var data = hexagramGroup.userData.lineData as Float32Array;
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
  var sparkAttr = sparkObj.geometry.attributes.position as THREE.BufferAttribute;
  var sparkArr = sparkAttr.array as Float32Array;
  var sparkBase = hexagramGroup.userData.sparkBase as Float32Array;
  var sparkData = hexagramGroup.userData.sparkData as Float32Array;
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
