function placeShelfContentRow(
  row: ShelfContentRow,
  centerSmooth: number,
  visibleRadius: number,
  rowAnimAt: number,
  settle: number
): void {
  var delta = row.index - centerSmooth;
  var absD = Math.abs(delta);
  if (absD > visibleRadius + 0.5) { row.mesh.visible = false; return; }
  row.mesh.visible = true;
  row.mesh.renderOrder = 240 + Math.round((visibleRadius + 1 - Math.min(absD, visibleRadius + 1)) * 14);
  var nowT = uniforms.uTime.value;
  var revealRaw = Math.max(0, Math.min(1, (nowT - rowAnimAt - absD * 0.040) / 0.72));
  var reveal = revealRaw * revealRaw * (3 - 2 * revealRaw);
  var parX = pointerParallax.x || 0;
  var parY = pointerParallax.y || 0;
  var parWeight = Math.max(0, 1 - absD * 0.12);
  var pulse = row.fxPulse || 0;
  var layout = shelfLayoutProfile().detail;
  var shelfLook = shelfSettings();
  var skullDetail = shouldUseSkullSafeShelfCamera();
  var rowBaseX = skullDetail ? 0.22 : -0.04;
  var rowSpreadX = skullDetail ? 0.030 : 0.014;
  var rowIntroX = skullDetail ? 0.58 : 0.38;
  var rowCenterZ = skullDetail ? 0.62 : 0.62;
  var rowBackZ = skullDetail ? 0.58 : 0.58;
  var rowDepthStep = skullDetail ? 0.046 : 0.048;
  var px = rowBaseX + absD * rowSpreadX + (1 - reveal) * (rowIntroX + absD * rowSpreadX);
  var py = -delta * layout.rowStep + (1 - reveal) * (0.20 + (delta < 0 ? -0.10 : 0.10));
  var pz = (absD < 0.5 ? rowCenterZ : (rowBackZ - absD * rowDepthStep)) - (1 - reveal) * (skullDetail ? 0.10 : 0.16);
  px += settle * ((skullDetail ? 0.11 : 0.12) + absD * (skullDetail ? 0.010 : 0.012));
  py += settle * (delta < 0 ? -0.08 : 0.08);
  pz -= settle * (skullDetail ? 0.045 : 0.08);
  px += parX * (skullDetail ? 0.022 : 0.026) * parWeight;
  py += parY * (skullDetail ? 0.024 : 0.036) * parWeight;
  pz += (parY * (skullDetail ? 0.014 : 0.024) - parX * (skullDetail ? 0.010 : 0.020)) * parWeight;
  var scale = (absD < 0.5 ? 1.00 : Math.max(0.66, 0.94 - absD * 0.070)) * (0.90 + reveal * 0.10) * (1 + pulse * 0.052) * (1 - settle * 0.025) * layout.rowScale;
  row.mesh.position.set(px, py, pz);
  row.mesh.scale.setScalar(scale);
  var rowOpacityBase = Math.min(1, (absD < 0.5 ? 1.0 : Math.max(0.34, 1.0 - absD * 0.12)) * reveal + pulse * 0.14);
  var rowOpacityScale = absD < 0.5 ? Math.max(0.94, shelfLook.opacity) : shelfLook.opacity;
  row.mesh.material.opacity = Math.min(1, rowOpacityBase * rowOpacityScale);
  row.mesh.rotation.y = (skullDetail ? -0.070 : 0.10) + (1 - reveal) * (skullDetail ? 0.018 : 0.052) + parX * (skullDetail ? 0.010 : 0.018) * parWeight;
  row.mesh.rotation.x = (skullDetail ? 0.010 : 0) - delta * (skullDetail ? 0.010 : 0.022) - parY * (skullDetail ? 0.006 : 0.014) * parWeight;
}

