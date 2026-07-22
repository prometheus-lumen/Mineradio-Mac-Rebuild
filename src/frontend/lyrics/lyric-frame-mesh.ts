interface StageLyricDetailProfile { bloom: number; easeDown: number; glowCap: number; opacity: number; outgoing: number; readability: number; }
interface StageLyricFrameContext { dt: number; glowDrive: number; lyricGlowStrength: number; shelfDetailLyricProfile: StageLyricDetailProfile; shelfDetailOpen: boolean; skullMouthLyrics: boolean; t: number; }

function tickUpcomingStageLyric(mesh: THREE.Object3D | null, frame: StageLyricFrameContext): void {
  if (!mesh || !mesh.userData || !mesh.userData.lyric) return;
  mesh.userData.age = (mesh.userData.age || 0) + frame.dt;
  var data = mesh.userData.lyric as StageLyricData;
  var reveal = clampRange(mesh.userData.age / 0.42, 0, 1);
  reveal = reveal * reveal * (3 - 2 * reveal);
  var opacity = reveal * 0.42 * frame.shelfDetailLyricProfile.outgoing;
  var currentData = stageLyrics.current && stageLyrics.current.userData && stageLyrics.current.userData.lyric;
  var currentHalfH = currentData ? Math.max(0.16, (currentData.textWorldH || currentData.worldH || 0.8) * 0.40) : 0.32;
  var upcomingHalfH = Math.max(0.12, (data.textWorldH || data.worldH || 0.8) * 0.31);
  var targetY = 0.46 + currentHalfH + upcomingHalfH + 0.16;
  mesh.position.x += (0 - mesh.position.x) * 0.18;
  mesh.position.y += (targetY - mesh.position.y) * 0.20;
  mesh.position.z += (1.47 - mesh.position.z) * 0.16;
  mesh.scale.setScalar(0.62 + reveal * 0.04);
  mesh.rotation.set(0, 0, 0);
  if (data.textMat) data.textMat.uniforms.uOpacity.value = opacity;
  if (data.readabilityMat) data.readabilityMat.opacity = opacity * 0.46;
  if (data.glowMat) data.glowMat.opacity = frame.lyricGlowStrength > 0 ? opacity * 0.035 * frame.lyricGlowStrength : 0;
  if (data.sparkMat) setLyricSparkOpacity(data, 0);
  if (data.sparks) data.sparks.visible = false;
  if (data.sunMat) data.sunMat.opacity = 0;
}

function tickStageLyricMesh(mesh: THREE.Object3D | null, isCurrent: boolean, stackIndex: number, frame: StageLyricFrameContext): boolean {
  var dt = frame.dt;
  if (!mesh) return false;
  mesh.userData.age += dt;
  var lyricSceneMode = mesh.userData.resolvedFlowMode || mesh.userData.flowMode || 'single';
  var cascadeLine = lyricSceneMode === 'cascade' || lyricSceneMode === 'cloud' || lyricSceneMode === 'network';
  if (cascadeLine) mesh.userData.cascadeLife = (mesh.userData.cascadeLife || 0) + dt * (0.76 + Math.min(0.62, stageLyrics.beatGlow * 0.18 + beatPulse * 0.24));
  var warpLine = lyricSceneMode === 'warp';
  var autoFlowLine = fx && normalizeLyricFlowMode(fx.lyricFlowMode) === 'auto';
  var transitionDuration = warpLine ? (isCurrent ? (mesh.userData.warpEntryDuration || 0.72) : 0.66) : (isCurrent ? (autoFlowLine ? 0.68 : 0.52) : 0.38);
  var a = Math.min(1, mesh.userData.age / transitionDuration);
  a = a * a * (3 - 2 * a);
  var data = (mesh.userData.lyric || {}) as StageLyricData;
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
  if (isCurrent) return tickCurrentStageLyric(mesh, data, a, lyricSceneMode, cascadeLine, frame);
  return tickOutgoingStageLyric(mesh, data, a, lyricSceneMode, cascadeLine, stackIndex, frame);
}
