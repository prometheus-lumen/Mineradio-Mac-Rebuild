function tickCurrentStageLyric(mesh: THREE.Object3D, data: StageLyricData, a: number, lyricSceneMode: string, cascadeLine: boolean, frame: StageLyricFrameContext): boolean {
  var dt = frame.dt, t = frame.t, glowDrive = frame.glowDrive;
  var lyricGlowStrength = frame.lyricGlowStrength;
  var shelfDetailLyricProfile = frame.shelfDetailLyricProfile;
  var shelfDetailOpen = frame.shelfDetailOpen, skullMouthLyrics = frame.skullMouthLyrics;
  var opacity = 0;
  var warpLine = lyricSceneMode === 'warp';
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
  } else if (lyricSceneMode === 'rise') {
    mesh.userData.skullMouthMeshLocked = false;
    var riseEntry = 1 - a;
    mesh.position.x += ((Math.sin(t * 0.72 + seed) * 0.16) - mesh.position.x) * 0.20;
    mesh.position.y += ((0.22 - riseEntry * 1.42) - mesh.position.y) * 0.34;
    mesh.position.z += ((1.50 - riseEntry * 0.34) - mesh.position.z) * 0.24;
    mesh.scale.setScalar(0.70 + a * 0.32 + Math.sin(a * Math.PI) * 0.12);
    mesh.rotation.z = Math.sin(seed * 6.4) * riseEntry * 0.12;
  } else if (lyricSceneMode === 'rush') {
    mesh.userData.skullMouthMeshLocked = false;
    var rushEntry = 1 - a;
    mesh.position.x += ((Math.sin(seed * 8.3) * rushEntry * 0.42) - mesh.position.x) * 0.30;
    mesh.position.y += ((0.18 + Math.cos(seed * 5.1) * rushEntry * 0.24) - mesh.position.y) * 0.28;
    mesh.position.z += ((1.52 - rushEntry * 3.10) - mesh.position.z) * 0.38;
    mesh.scale.setScalar(0.28 + a * 0.74 + Math.sin(a * Math.PI) * 0.16);
    mesh.rotation.z = Math.sin(seed * 4.7) * rushEntry * 0.18;
  } else if (lyricSceneMode === 'zigzag') {
    mesh.userData.skullMouthMeshLocked = false;
    var zigzagPhase = t * 3.15 + seed;
    var zigzagEntry = 1 - a;
    mesh.position.x += ((Math.sin(zigzagPhase) * (0.58 + zigzagEntry * 0.52)) - mesh.position.x) * 0.32;
    mesh.position.y += ((0.18 + Math.cos(zigzagPhase * 1.55) * 0.20) - mesh.position.y) * 0.25;
    mesh.position.z += ((1.48 + Math.abs(Math.sin(zigzagPhase)) * 0.20) - mesh.position.z) * 0.22;
    mesh.scale.setScalar(0.90 + a * 0.08 + Math.abs(Math.sin(zigzagPhase)) * 0.08);
    mesh.rotation.z = Math.cos(zigzagPhase) * 0.16;
  } else if (lyricSceneMode === 'impact') {
    mesh.userData.skullMouthMeshLocked = false;
    var impactBeat = Math.max(beatPulse, stageLyrics.beatGlow * 0.72);
    var impactEntry = Math.sin(a * Math.PI);
    mesh.position.x += (0 - mesh.position.x) * 0.34;
    mesh.position.y += ((0.18 + impactBeat * 0.16 - impactEntry * 0.10) - mesh.position.y) * 0.30;
    mesh.position.z += ((1.50 + impactBeat * 0.30) - mesh.position.z) * 0.28;
    mesh.scale.setScalar(0.74 + a * 0.26 + impactEntry * 0.24 + impactBeat * 0.24);
    mesh.rotation.z = Math.sin(t * 6.2 + seed) * impactBeat * 0.055;
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
    var arr = pos.array as Float32Array, base = data.basePositions;
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
