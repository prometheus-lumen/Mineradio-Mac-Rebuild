interface ShelfCardLayoutState {
  centerSmooth: number;
  visibleRadius: number;
  contentOpen: boolean;
  paneSwitchAt: number;
  paneSwitchDir: number;
  openCardIdx: number;
}

function placeShelfCard(card: ShelfCard, mode: string, state: ShelfCardLayoutState): void {
  var delta = card.index - state.centerSmooth;     // 正=下方, 负=上方
  var absD = Math.abs(delta);
  // 隐藏太远的卡 (>4 全隐藏)
  if (absD > state.visibleRadius + 0.5) { card.mesh.visible = false; return; }
  card.mesh.visible = true;
  card.mesh.renderOrder = 60 + Math.round((state.visibleRadius + 1 - Math.min(absD, state.visibleRadius + 1)) * 10);
  var parX = pointerParallax.x || 0;
  var parY = pointerParallax.y || 0;
  var parWeight = Math.max(0, 1 - absD * 0.16);
  var pulse = card.fxPulse || 0;
  var layout = shelfLayoutProfile();
  var shelfLook = shelfSettings();
  var nextDof = Math.max(0, Math.min(1, (absD - 0.45) / 3.2));
  var nextDofBucket = Math.round(nextDof * 5);
  if (card.dofBucket !== nextDofBucket) {
    card.dofBucket = nextDofBucket;
    card.dofBlur = nextDof;
    drawCard(card, card.item);
  }

  if (mode === 'side') {
    // 右侧 3D 架: 恢复更靠近、更斜切的打开姿态，让卡片有真正的前后层次。
    var detailOpenSide = state.contentOpen;
    var nowT = uniforms.uTime.value;
    var hoverBreath = (!shelfPinnedOpen && !detailOpenSide) ? shelfVisibility : 0;
    var passiveAlways = shelfAlwaysVisible() && !shelfPinnedOpen && !detailOpenSide;
    var liftTarget = card.selected && !detailOpenSide ? 1 : 0;
    var liftRate = liftTarget > (card.floatMix || 0) ? 0.20 : 0.13;
    card.floatMix = (card.floatMix || 0) + (liftTarget - (card.floatMix || 0)) * liftRate;
    if (!liftTarget && card.floatMix < 0.004) card.floatMix = 0;
    var lift = card.floatMix || 0;
    var sideLayer = Math.max(0, state.visibleRadius + 1 - Math.min(absD, state.visibleRadius + 1));
    card.mesh.renderOrder = passiveAlways
      ? (30 + Math.round(sideLayer * 1.1) + Math.round(lift * 96))
      : (60 + Math.round(sideLayer * 10) + Math.round(lift * 70));
    var breathPulse = hoverBreath * (0.5 + 0.5 * Math.sin(nowT * 1.22 + card.index * 0.74));
    var revealRaw = Math.max(0, Math.min(1, (nowT - shelfOpenAnimAt - absD * 0.035) / 0.62));
    var reveal = revealRaw * revealRaw * (3 - 2 * revealRaw);
    var entry = (1 - reveal) * (0.82 + absD * 0.075);
    var paneRaw = Math.max(0, Math.min(1, (nowT - state.paneSwitchAt - absD * 0.030) / 0.72));
    var paneEase = 1 - paneRaw * paneRaw * (3 - 2 * paneRaw);
    var wallpaperShelfPose = shouldUseWallpaperSafeShelfCamera();
    var skullShelfPose = shouldUseSkullSafeShelfCamera();
    var safeShelfPose = wallpaperShelfPose || skullShelfPose;
    var px = layout.sideX + absD * layout.sideXStep - (detailOpenSide ? layout.sideDetailShift : 0) + entry * layout.sideEntryX;
    var py = (layout.sideY || 0) - delta * layout.sideYStep + (1 - reveal) * (delta < 0 ? -0.18 : 0.18);
    var pz = layout.sideZ - absD * layout.sideZStep - (1 - reveal) * 0.20;
    px += paneEase * state.paneSwitchDir * 0.60;
    py += paneEase * (delta < 0 ? -0.16 : 0.16);
    pz -= paneEase * 0.22;
    px += parX * 0.060 * parWeight;
    py += parY * 0.046 * parWeight;
    pz += (parY * 0.026 - parX * 0.028) * parWeight;
    py += Math.sin(nowT * 0.92 + card.index * 0.64) * 0.052 * hoverBreath * Math.max(0.20, parWeight);
    pz += Math.cos(nowT * 0.78 + card.index * 0.52) * 0.030 * hoverBreath * parWeight;
    if (lift > 0.001) {
      px -= lift * (skullShelfPose ? 0.035 : (layout.portrait ? 0.065 : 0.145));
      py += lift * (skullShelfPose ? 0.045 : (layout.portrait ? 0.075 : 0.105));
      pz += lift * (skullShelfPose ? 0.080 : 0.220);
    }
    var scale = (absD < 0.5 ? 1.12 : Math.max(0.55, 1.04 - absD * 0.14)) * (0.88 + reveal * 0.12) * (1 + pulse * 0.056 + breathPulse * 0.026 + lift * (skullShelfPose ? 0.045 : 0.075)) * layout.sideScale;
    if (wallpaperShelfPose) scale *= 1.22;
    else if (skullShelfPose) scale *= 1.04;
    card.mesh.position.set(px, py, pz);
    if (skullShelfPose && camera) {
      card.mesh.quaternion.copy(camera.quaternion);
      card.mesh.rotateX(layout.sideRotX - delta * 0.008 - parY * 0.004 * parWeight);
      card.mesh.rotateY(layout.sideRotY + (1 - reveal) * 0.012 + parX * 0.006 * parWeight);
    } else {
      var safeRotY = wallpaperShelfPose ? 0.12 : layout.sideRotY;
      var safeEntryRotY = wallpaperShelfPose ? 0.05 : 0.16;
      card.mesh.rotation.y = (safeShelfPose ? safeRotY : layout.sideRotY) + (1 - reveal) * safeEntryRotY + parX * (safeShelfPose ? 0.014 : 0.038) * parWeight;
      var safeRotX = wallpaperShelfPose ? 0.020 : layout.sideRotX;
      card.mesh.rotation.x = -delta * (safeShelfPose ? safeRotX : layout.sideRotX) - parY * (safeShelfPose ? 0.010 : 0.024) * parWeight;
    }
    card.mesh.scale.setScalar(scale);
    var disabledByDetail = detailOpenSide;
    var opacity = absD < 0.5 ? 1.0 : Math.max(0.22, 1.0 - absD * 0.30);
    if (disabledByDetail) {
      opacity *= card.index === state.openCardIdx ? 0.16 : 0.08;
      card.mesh.material.color.setScalar(card.index === state.openCardIdx ? 0.42 : 0.25);
    } else {
      if (passiveAlways) opacity *= 0.92 + lift * 0.08;
      card.mesh.material.color.setScalar(passiveAlways ? (0.96 + lift * 0.04) : 1);
    }
    // v8: 自动隐藏 — shelf 不在 focus 区时整体淡化
    card.mesh.material.opacity = Math.min(1, opacity * (shelfVisibility != null ? shelfVisibility : 1) * reveal * (1 - paneEase * 0.24) + pulse * 0.10 * reveal + breathPulse * 0.035) * shelfLook.opacity;
    setShelfCardCenter(card, absD < 0.5);
  } else {
    // 舞台 PSP: 水平展开 + center 突出, dock 在底部
    var pxStage = (layout.stageX || 0) + delta * layout.stageXStep;
    var pyStage = layout.stageY;
    var pzStage = absD < 0.5 ? layout.stageZ : (layout.stageZ - Math.min(2.0, absD) * 0.55);
    var paneRawS = Math.max(0, Math.min(1, (uniforms.uTime.value - state.paneSwitchAt - absD * 0.030) / 0.72));
    var paneEaseS = 1 - paneRawS * paneRawS * (3 - 2 * paneRawS);
    pxStage += paneEaseS * state.paneSwitchDir * 0.80;
    pzStage -= paneEaseS * 0.28;
    pxStage += parX * 0.110 * parWeight;
    pyStage += parY * 0.060 * parWeight;
    pzStage += (parY * 0.040 - parX * 0.035) * parWeight;
    var scaleS = (absD < 0.5 ? 1.20 : Math.max(0.45, 1.0 - absD * 0.22)) * (1 + pulse * 0.060) * layout.stageScale;
    card.mesh.position.set(pxStage, pyStage, pzStage);
    card.mesh.rotation.y = -delta * 0.22 + parX * 0.050 * parWeight;
    card.mesh.rotation.x = 0.10 - absD * 0.04 - parY * 0.028 * parWeight;
    card.mesh.scale.setScalar(scaleS);
    var disabledStage = state.contentOpen;
    var opS = absD < 0.5 ? 1.0 : Math.max(0.18, 1.0 - absD * 0.32);
    if (disabledStage) {
      opS *= card.index === state.openCardIdx ? 0.16 : 0.08;
      card.mesh.material.color.setScalar(card.index === state.openCardIdx ? 0.42 : 0.25);
    } else {
      card.mesh.material.color.setScalar(1);
    }
    card.mesh.material.opacity = Math.min(1, opS * (shelfVisibility != null ? shelfVisibility : 1) * (1 - paneEaseS * 0.24) + pulse * 0.10) * shelfLook.opacity;
    setShelfCardCenter(card, absD < 0.5);
  }
}

function setShelfCardCenter(card: ShelfCard, isCenter: boolean): void {
  if (card.isCenter !== isCenter) {
    card.isCenter = isCenter;
    drawCard(card, card.item);
  } else {
    card.isCenter = isCenter;
  }
}

