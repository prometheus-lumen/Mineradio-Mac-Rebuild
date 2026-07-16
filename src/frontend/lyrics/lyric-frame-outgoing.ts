function tickOutgoingStageLyric(mesh: THREE.Object3D, data: StageLyricData, a: number, lyricSceneMode: string, cascadeLine: boolean, stackIndex: number, frame: StageLyricFrameContext): boolean {
  var dt = frame.dt, t = frame.t;
  var lyricGlowStrength = frame.lyricGlowStrength;
  var shelfDetailLyricProfile = frame.shelfDetailLyricProfile;
  var shelfDetailOpen = frame.shelfDetailOpen;
  var opacity = 0;
  var warpLine = lyricSceneMode === 'warp';
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
  } else if (lyricSceneMode === 'rise') {
    mesh.position.y += dt * 3.2;
    mesh.position.z -= dt * 0.55;
    mesh.scale.setScalar(Math.max(0.70, 1 - a * 0.22));
  } else if (lyricSceneMode === 'rush') {
    mesh.position.z += dt * 4.8;
    mesh.scale.setScalar(1 + a * 0.48);
  } else if (lyricSceneMode === 'zigzag') {
    mesh.position.x += exitSide * dt * 3.8;
    mesh.position.y += Math.sin(t * 9.2 + exitSeed) * dt * 1.8;
    mesh.rotation.z += exitSide * dt * 1.15;
  } else if (lyricSceneMode === 'impact') {
    mesh.position.z -= dt * 3.4;
    mesh.position.y -= dt * 0.65;
    mesh.scale.setScalar(Math.max(0.62, 1 - a * 0.36));
  } else {
    modeExit = false;
  }
  if (modeExit) {
    if (lyricSceneMode !== 'depth' && lyricSceneMode !== 'pulse' && lyricSceneMode !== 'stretch' && lyricSceneMode !== 'rise' && lyricSceneMode !== 'rush' && lyricSceneMode !== 'impact') mesh.scale.setScalar(0.98 - a * 0.07);
    return a < 1;
  }
  mesh.position.z -= dt * 0.26;
  mesh.position.y += dt * 0.08;
  mesh.scale.setScalar(0.98 - a * 0.06);
  return a < 1;
}
