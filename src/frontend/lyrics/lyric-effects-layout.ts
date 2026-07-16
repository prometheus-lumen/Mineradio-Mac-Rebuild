'use strict';

// Mineradio classic module: lyrics/lyric-effects.
function requestStageLyricCameraSnap(frames = 8): void {
  if (typeof stageLyrics === 'undefined' || !stageLyrics) return;
  stageLyrics.snapCameraLockFrames = Math.max(stageLyrics.snapCameraLockFrames || 0, frames || 8);
}

function shouldAvoidStageLyricsForShelf(): boolean {
  if (!shelfManager || !shelfManager.getMode || shelfManager.getMode() !== 'side') return false;
  if (shelfAlwaysVisible()) return true;
  if (shelfPinnedOpen) return true;
  if (shelfManager.hasOpenContent && shelfManager.hasOpenContent()) return true;
  return !!(shelfVisibility > 0.24 || (shelfHoverCue && shelfHoverCue.value > 0.28));
}

function isCascadeLyricFlow(): boolean {
  var mode = fx && normalizeLyricFlowMode(fx.lyricFlowMode);
  return mode === 'cascade' || mode === 'cloud' || mode === 'network';
}

function resolvedLyricFlowMode(advance = false): string {
  var selected = normalizeLyricFlowMode(fx && fx.lyricFlowMode);
  if (selected !== 'auto') return selected;
  if (advance && stageLyrics.autoFlowLinesRemaining > 0) stageLyrics.autoFlowLinesRemaining -= 1;
  if (!stageLyrics.autoFlowMode || stageLyrics.autoFlowLinesRemaining <= 0) {
    var previous = stageLyrics.autoFlowMode;
    if (!stageLyrics.autoFlowQueue.length) {
      stageLyrics.autoFlowQueue = LYRIC_SCENE_MODES.slice();
      for (var i = stageLyrics.autoFlowQueue.length - 1; i > 0; i--) {
        var swapIndex = Math.floor(Math.random() * (i + 1));
        var swapMode = stageLyrics.autoFlowQueue[i];
        stageLyrics.autoFlowQueue[i] = stageLyrics.autoFlowQueue[swapIndex];
        stageLyrics.autoFlowQueue[swapIndex] = swapMode;
      }
      if (stageLyrics.autoFlowQueue.length > 1 && stageLyrics.autoFlowQueue[stageLyrics.autoFlowQueue.length - 1] === previous) {
        var firstMode = stageLyrics.autoFlowQueue[0];
        stageLyrics.autoFlowQueue[0] = stageLyrics.autoFlowQueue[stageLyrics.autoFlowQueue.length - 1];
        stageLyrics.autoFlowQueue[stageLyrics.autoFlowQueue.length - 1] = firstMode;
      }
    }
    stageLyrics.autoFlowMode = stageLyrics.autoFlowQueue.pop() || 'float';
    stageLyrics.autoFlowLinesRemaining = 1;
  }
  return stageLyrics.autoFlowMode;
}

function lyricWarpRadicalInverse(index: number, base: number): number {
  var result = 0;
  var fraction = 1 / base;
  while (index > 0) {
    result += (index % base) * fraction;
    index = Math.floor(index / base);
    fraction /= base;
  }
  return result;
}

function nextLyricWarpAnchor(kind: 'entry' | 'exit'): { x: number; y: number } {
  var exit = kind === 'exit';
  var indexKey: 'warpExitIndex' | 'warpEntryIndex' = exit ? 'warpExitIndex' : 'warpEntryIndex';
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

function resolveLyricWarpPosition(mesh: THREE.Object3D | null, kind: 'entry' | 'exit'): THREE.Vector3 | null {
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

function setStageLyricViewBasisFromCameraOrQuaternion(fallbackQuat?: THREE.Quaternion | null): void {
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

function stageLyricTargetQuaternion(baseQuat: THREE.Quaternion | null, tiltX: number, tiltY: number): THREE.Quaternion {
  lyricTiltEuler.set((tiltX || 0) * Math.PI / 180, (tiltY || 0) * Math.PI / 180, 0, 'YXZ');
  lyricTiltQuat.setFromEuler(lyricTiltEuler);
  return lyricTargetQuat.copy(baseQuat || lyricBaseQuat).multiply(lyricTiltQuat);
}

function getStageLyricLockBounds(): { w: number; h: number } {
  var maxW = 0, maxH = 0;
  function take(mesh: THREE.Object3D | null | undefined): void {
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

function createLyricsParticles(): void {
  if (stageLyrics.group) {
    ensureLyricStarRiver();
    return;
  }
  stageLyrics.group = new THREE.Group();
  stageLyrics.group.renderOrder = 38;
  scene.add(stageLyrics.group);
  ensureLyricStarRiver();
}

function ensureLyricNetworkLines(): THREE.LineSegments<THREE.BufferGeometry, THREE.LineBasicMaterial> | null {
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

function updateLyricNetworkLines(): void {
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
  var positions = lines.geometry.attributes.position.array as Float32Array;
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
