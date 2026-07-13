'use strict';

// Mineradio classic module: library/shelf-interactions.
function shouldUseWallpaperSafeShelfCamera() {
  return !!(fx && Number(fx.preset) === 5);
}

function shouldUseSkullSafeShelfCamera() {
  return !!(fx && Number(fx.preset) === SKULL_PRESET_INDEX);
}

function shouldDimWallpaperForShelf() {
  if (!shouldUseWallpaperSafeShelfCamera()) return false;
  if (!shelfManager || !shelfManager.getMode || shelfManager.getMode() !== 'side') return false;
  if (shelfPinnedOpen) return true;
  return !!(shelfManager.hasOpenContent && shelfManager.hasOpenContent());
}

function shouldOffsetLyricsForShelfDetail() {
  if (!shelfManager || !shelfManager.getMode || shelfManager.getMode() !== 'side') return false;
  return !!(shelfManager.hasOpenContent && shelfManager.hasOpenContent());
}

function isBottomControlsSuppressedForShelf() {
  var shelfContentOpen = false;
  try {
    shelfContentOpen = !!(typeof shelfManager !== 'undefined' && shelfManager && shelfManager.hasOpenContent && shelfManager.hasOpenContent());
  } catch (e) {}
  return !!(shelfPinnedOpen || shelfContentOpen || (controlsShelfSuppressUntil && performance.now() < controlsShelfSuppressUntil));
}

function suppressBottomControlsForShelf(duration) {
  controlsShelfSuppressUntil = performance.now() + (duration == null ? 900 : duration);
  controlsHovering = false;
  if (controlsHideTimer) {
    clearTimeout(controlsHideTimer);
    controlsHideTimer = null;
  }
  document.body.classList.remove('controls-handle-awake');
  if (miniQueueOpen) closeMiniQueue();
  var bar = document.getElementById('bottom-bar');
  if (bar) {
    bar.classList.remove('visible', 'soft-hidden');
    bar.style.pointerEvents = '';
  }
  updateControlsChromeState();
}

function isSkullShelfCompositionActive() {
  if (!(fx && fx.preset === SKULL_PRESET_INDEX)) return false;
  if (!shelfManager || !shelfManager.getMode || shelfManager.getMode() !== 'side') return false;
  if (shelfPinnedOpen || shelfVisibility > 0.18) return true;
  return !!(shelfManager.hasOpenContent && shelfManager.hasOpenContent());
}

function shelfDefaultAngleForCameraMode(mode) {
  return normalizeShelfCameraMode(mode) === 'static' ? -15 : 0;
}

function applyShelfCameraDefaultAngle(force) {
  if (!fx) return;
  fx.shelfCameraMode = normalizeShelfCameraMode(fx.shelfCameraMode || fxDefaults.shelfCameraMode);
  if (force || fx.shelfAngleYManual !== true) {
    fx.shelfAngleYManual = false;
    fx.shelfAngleY = shelfDefaultAngleForCameraMode(fx.shelfCameraMode);
  } else {
    fx.shelfAngleY = Math.round(clampRange(Number(fx.shelfAngleY) || 0, -30, 30));
  }
}

function normalizedShelfNumber(key, fallback, min, max) {
  var value = fx && fx[key] != null ? Number(fx[key]) : fallback;
  if (!isFinite(value)) value = fallback;
  return clampRange(value, min, max);
}

function shelfSettings() {
  var angleDeg = fx && fx.shelfAngleYManual === true
    ? normalizedShelfNumber('shelfAngleY', shelfDefaultAngleForCameraMode(fx.shelfCameraMode), -30, 30)
    : shelfDefaultAngleForCameraMode(fx && fx.shelfCameraMode);
  return {
    size: normalizedShelfNumber('shelfSize', fxDefaults.shelfSize, 0.65, 1.45),
    x: normalizedShelfNumber('shelfOffsetX', fxDefaults.shelfOffsetX, -1.2, 1.2),
    y: normalizedShelfNumber('shelfOffsetY', fxDefaults.shelfOffsetY, -0.9, 0.9),
    z: normalizedShelfNumber('shelfOffsetZ', fxDefaults.shelfOffsetZ, -0.9, 0.9),
    angle: angleDeg * Math.PI / 180,
    opacity: normalizedShelfNumber('shelfOpacity', fxDefaults.shelfOpacity, 0.25, 1),
    bgOpacity: normalizedShelfNumber('shelfBgOpacity', fxDefaults.shelfBgOpacity, 0.25, 0.98),
    accent: normalizeHexColor((fx && fx.shelfAccentColor) || fxDefaults.shelfAccentColor, fxDefaults.shelfAccentColor)
  };
}

function shelfAlwaysVisible() {
  return !!(fx && normalizeShelfPresence(fx.shelfPresence) === 'always');
}

function shouldUseShelfDynamicCamera(type) {
  if (!/^shelf-/.test(String(type || ''))) return true;
  return !(fx && normalizeShelfCameraMode(fx.shelfCameraMode) === 'static');
}

function shelfAccentHex() {
  return normalizeHexColor((fx && fx.shelfAccentColor) || fxDefaults.shelfAccentColor, fxDefaults.shelfAccentColor);
}

function shelfAccentRgba(alpha, fallback) {
  var rgb = hexToRgb(shelfAccentHex());
  if (!rgb) return fallback || 'rgba(244,210,138,' + alpha + ')';
  return 'rgba(' + rgb.r + ',' + rgb.g + ',' + rgb.b + ',' + alpha + ')';
}

// 0..1, 侧栏自动隐藏的整体透明度系数
function isPortraitShelfViewport() {
  return innerHeight > innerWidth * 1.08;
}

function shelfWheelZoneWidth() {
  var portrait = isPortraitShelfViewport();
  var ratioWidth = innerWidth * (portrait ? 0.24 : 0.18);
  return Math.min(portrait ? 280 : 360, Math.max(shelfHotZoneWidth(), ratioWidth));
}

function isShelfClickZone(e) {
  var edge = shelfPinnedOpen ? Math.min(390, Math.max(210, innerWidth * 0.22)) : shelfHotZoneWidth();
  return e.clientX > innerWidth - edge && e.clientY > 130 && e.clientY < innerHeight - 150;
}

function isShelfWheelZone(e) {
  var edge = shelfWheelZoneWidth();
  return e.clientX > innerWidth - edge && e.clientY > 116 && e.clientY < innerHeight - 116;
}

function canUseSideShelfWithoutPinnedOpen() {
  return !!shelfAlwaysVisible();
}

function shelfAutoHiddenInputReady() {
  if (shelfPinnedOpen || shelfAlwaysVisible()) return true;
  if (shelfManager && shelfManager.hasOpenContent && shelfManager.hasOpenContent()) return true;
  return !!(shelfHoverCue.guide || shelfHoverCue.zoneActive || shelfHoverCue.value > 0.18 || shelfVisibility > 0.16);
}

function canShowShelfHoverCueAt(e) {
  if (!e) return false;
  if (!shelfHoverCue.guide) return false;
  if (document.body.classList.contains('splash-active')) return false;
  if (visualGuideActive || emptyHomeActive || homeForcedOpen) return false;
  if (!shelfManager || !shelfManager.getMode || shelfManager.getMode() !== 'side') return false;
  if (shelfPinnedOpen) return false;
  if (shelfManager.hasOpenContent && shelfManager.hasOpenContent()) return false;
  if (isPointerOverUi(e)) return false;
  if (isShelfClickZone(e)) return true;
  return shelfPreviewIsVisible() && isShelfPreviewUseZone(e);
}

function updateShelfHoverCueFromPointer(e) {
  if (!e) {
    if (!shelfHoverCue.guide) shelfHoverCue.target = 0;
    shelfHoverCue.zoneActive = false;
    shelfHoverCue.enteredAt = 0;
    return;
  }
  var active = false;
  var inZone = canShowShelfHoverCueAt(e);
  if (inZone && !shelfHoverCue.zoneActive) {
    shelfHoverCue.zoneActive = true;
    shelfHoverCue.enteredAt = performance.now();
  } else if (!inZone) {
    shelfHoverCue.zoneActive = false;
    shelfHoverCue.enteredAt = 0;
  }
  active = inZone;
  if (!shelfHoverCue.guide) shelfHoverCue.target = active ? 1 : 0;
  shelfHoverCue.x = e.clientX;
  shelfHoverCue.y = e.clientY;
  shelfHoverCue.lastAt = performance.now();
}

function tickShelfHoverCue(dt) {
  if (!shelfHoverCue.guide && shelfHoverCue.zoneActive) {
    var heldPointer = { clientX: shelfHoverCue.x, clientY: shelfHoverCue.y };
    if (canShowShelfHoverCueAt(heldPointer)) {
      if (performance.now() - shelfHoverCue.enteredAt > 260) shelfHoverCue.target = 1;
    } else {
      shelfHoverCue.zoneActive = false;
      shelfHoverCue.enteredAt = 0;
      shelfHoverCue.target = 0;
    }
  }
  if (!shelfHoverCue.guide && !shelfHoverCue.zoneActive && performance.now() - shelfHoverCue.lastAt > 650) shelfHoverCue.target = 0;
  var target = shelfHoverCue.guide ? 1 : shelfHoverCue.target;
  var rate = target > shelfHoverCue.value ? 0.12 : 0.10;
  shelfHoverCue.value += (target - shelfHoverCue.value) * Math.min(1, rate * Math.max(1, dt * 60));
  if (shelfHoverCue.value < 0.006 && !target) shelfHoverCue.value = 0;
  return shelfHoverCue.value;
}

// ============================================================
//  3D 卡片交互 - PSP 风格
//   - 滚轮: 滚动 center 卡 (一级或二级)
//   - 点击 center 卡: 打开内容框 (歌单) 或 播放 (队列)
//   - 点击两侧卡: 滚到那张
//   - ESC: 关闭内容框
// ============================================================
function raycasterFromPointerEvent(e) {
  var mx = (e.clientX / innerWidth) * 2 - 1;
  var my = -(e.clientY / innerHeight) * 2 + 1;
  var rc = new THREE.Raycaster();
  rc.setFromCamera(new THREE.Vector2(mx, my), camera);
  return rc;
}

function pointerCardHit(rc, e, screenPad) {
  if (!shelfManager) return null;
  return shelfManager.raycastCards(rc) || (shelfManager.pickCardAtScreen && shelfManager.pickCardAtScreen(e.clientX, e.clientY, screenPad));
}

function isSideShelfFocusHit(e) {
  if (!e || !shelfManager || !shelfManager.getMode || shelfManager.getMode() !== 'side') return false;
  if (shelfPinnedOpen) return true;
  if (shelfAlwaysVisible()) return !!pointerCardHit(raycasterFromPointerEvent(e), e, 18);
  if (!shelfAutoHiddenInputReady()) return false;
  if (shelfVisibility > 0.34 && (isShelfClickZone(e) || isShelfPreviewUseZone(e))) return true;
  return !!(shelfPreviewIsVisible() && pointerCardHit(raycasterFromPointerEvent(e), e, 24));
}

function isShelfPlaylistPlayHit(hit) {
  if (!hit || !hit.card || !hit.uv || !hit.card.item || hit.card.item.type !== 'playlist') return false;
  return hit.uv.x >= 0.49 && hit.uv.x <= 0.72 && hit.uv.y >= 0.13 && hit.uv.y <= 0.42;
}

function normalizedShelfWheelDelta(e) {
  var dx = Number(e && e.deltaX) || 0;
  var dy = Number(e && e.deltaY) || 0;
  if (e && e.deltaMode === 1) { dx *= 16; dy *= 16; }
  else if (e && e.deltaMode === 2) { dx *= innerHeight; dy *= innerHeight; }
  if (Math.abs(dx) > Math.abs(dy) * 1.15) return 0;
  return clampRange(dy, -140, 140);
}

function consumeShelfWheelStep(e, kind) {
  var delta = normalizedShelfWheelDelta(e);
  if (!delta) return 0;
  var now = performance.now();
  if (now - shelfWheelState.lastAt > 260) {
    shelfWheelState.shelfAcc = 0;
    shelfWheelState.detailAcc = 0;
  }
  shelfWheelState.lastAt = now;
  var isDetail = kind === 'detail';
  var accKey = isDetail ? 'detailAcc' : 'shelfAcc';
  var stepKey = isDetail ? 'detailStepAt' : 'shelfStepAt';
  var threshold = isDetail ? 62 : 74;
  var minInterval = isDetail ? 96 : 118;
  shelfWheelState[accKey] = clampRange(shelfWheelState[accKey] + delta, -threshold * 1.35, threshold * 1.35);
  if (Math.abs(shelfWheelState[accKey]) < threshold) return 0;
  if (now - shelfWheelState[stepKey] < minInterval) {
    shelfWheelState[accKey] *= 0.38;
    return 0;
  }
  var direction = shelfWheelState[accKey] > 0 ? 1 : -1;
  shelfWheelState[accKey] = 0;
  shelfWheelState[stepKey] = now;
  return direction;
}

function playShelfSelectTick(direction, variant) {
  var nowMs = performance.now();
  var minGap = variant === 'row' ? 36 : 42;
  if (nowMs - lastShelfSelectSfxAt < minGap) return;
  var ctx = ensureUiSfxContext();
  if (!ctx) return;
  lastShelfSelectSfxAt = nowMs;
  var dir = direction < 0 ? -1 : 1;
  var pitch = dir > 0 ? 1.035 : 0.965;
  var rowScale = variant === 'row' ? 0.74 : 1.0;
  var volumeScale = 0.38 + Math.max(0, Math.min(1, targetVolume == null ? 0.65 : targetVolume)) * 0.62;
  var t = ctx.currentTime + 0.002;
  var out = ctx.createGain();
  out.gain.setValueAtTime(0.0001, t);
  out.gain.linearRampToValueAtTime(0.058 * rowScale * volumeScale, t + 0.002);
  out.gain.exponentialRampToValueAtTime(0.0001, t + 0.082);
  out.connect(ctx.destination);

  var sampleRate = ctx.sampleRate || 44100;
  var len = Math.max(1, Math.floor(sampleRate * 0.034));
  var buf = ctx.createBuffer(1, len, sampleRate);
  var data = buf.getChannelData(0);
  for (var i = 0; i < len; i++) {
    var e = Math.pow(1 - i / len, 4.2);
    data[i] = (Math.random() * 2 - 1) * e;
  }
  var noise = ctx.createBufferSource();
  noise.buffer = buf;
  var hp = ctx.createBiquadFilter();
  hp.type = 'highpass';
  hp.frequency.setValueAtTime(4200 * pitch, t);
  var bp = ctx.createBiquadFilter();
  bp.type = 'bandpass';
  bp.frequency.setValueAtTime(8400 * pitch, t);
  bp.Q.setValueAtTime(7.2, t);
  var ng = ctx.createGain();
  ng.gain.setValueAtTime(0.56, t);
  noise.connect(hp);
  hp.connect(bp);
  bp.connect(ng);
  ng.connect(out);
  noise.start(t);
  noise.stop(t + 0.040);

  function clickOsc(type, freq, delay, dur, gainValue, bend) {
    var osc = ctx.createOscillator();
    var g = ctx.createGain();
    var start = t + delay;
    var end = start + dur;
    osc.type = type;
    osc.frequency.setValueAtTime(freq * pitch, start);
    osc.frequency.exponentialRampToValueAtTime(freq * pitch * (bend || 0.72), end);
    g.gain.setValueAtTime(0.0001, start);
    g.gain.linearRampToValueAtTime(gainValue, start + 0.002);
    g.gain.exponentialRampToValueAtTime(0.0001, end);
    osc.connect(g);
    g.connect(out);
    osc.start(start);
    osc.stop(end + 0.004);
  }

  clickOsc('triangle', 720, 0.000, 0.030, 0.18, 0.70);
  clickOsc('square', 2180, 0.004, 0.022, 0.30, 0.86);
  clickOsc('triangle', 4200, 0.011, 0.018, 0.18, 0.94);
  clickOsc('square', 7100, 0.018, 0.012, 0.070, 0.98);
  setTimeout(function(){
    try { out.disconnect(); } catch (_) {}
  }, 160);
}

function setShelfMode(m) {
  m = /^(off|side|stage)$/.test(String(m || '')) ? m : fxDefaults.shelf;
  fx.shelf = m;
  document.querySelectorAll('#shelf-seg button').forEach(function(b){ b.classList.toggle('active', b.dataset.shelf === m); });
  if (shelfManager) shelfManager.setMode(m);
  // 舞台模式: 顶部搜索、底部控件让位
  var searchArea = document.getElementById('search-area');
  var bottomBar = document.getElementById('bottom-bar');
  if (searchArea) searchArea.classList.toggle('stage-mode', m === 'stage');
  if (bottomBar) bottomBar.classList.toggle('stage-mode', m === 'stage');
  saveLyricLayout();
}

function updateShelfControlUi() {
  fx.shelfCameraMode = normalizeShelfCameraMode(fx.shelfCameraMode || fxDefaults.shelfCameraMode);
  fx.shelfPresence = normalizeShelfPresence(fx.shelfPresence || fxDefaults.shelfPresence);
  document.querySelectorAll('#shelf-camera-seg [data-shelf-camera]').forEach(function(btn){
    btn.classList.toggle('active', btn.getAttribute('data-shelf-camera') === fx.shelfCameraMode);
  });
  document.querySelectorAll('#shelf-presence-seg [data-shelf-presence]').forEach(function(btn){
    btn.classList.toggle('active', btn.getAttribute('data-shelf-presence') === fx.shelfPresence);
  });
  var color = shelfAccentHex();
  var picker = document.getElementById('shelf-accent-picker');
  var value = document.getElementById('shelf-accent-value');
  if (picker) picker.value = color;
  if (value) value.textContent = color.toUpperCase();
}

function refreshShelfVisuals(reason) {
  updateShelfControlUi();
  if (shelfManager && shelfManager.refreshTheme) shelfManager.refreshTheme();
  if (shelfManager && shelfManager.rebuild && reason === 'mode') shelfManager.rebuild(true);
}

function setShelfAccentColor(color, silent) {
  fx.shelfAccentColor = normalizeHexColor(color || fxDefaults.shelfAccentColor, fxDefaults.shelfAccentColor);
  refreshShelfVisuals('color');
  saveLyricLayout();
  if (!silent) showToast('歌单架颜色: ' + fx.shelfAccentColor.toUpperCase());
}

function resetShelfAccentColor() {
  setShelfAccentColor(fxDefaults.shelfAccentColor || '#f4d28a');
}

function shouldShowShelfHoverCue(value) {
  if (document.body.classList.contains('splash-active')) return false;
  if (!shelfHoverCue.guide && document.querySelector('.modal-mask.show')) return false;
  if (!shelfHoverCue.guide) {
    if (shelfPinnedOpen) return false;
    if (!shelfManager || !shelfManager.canInteract || !shelfManager.canInteract()) return false;
    if (shelfManager.hasOpenContent && shelfManager.hasOpenContent()) return false;
    if (!shelfManager.getMode || shelfManager.getMode() !== 'side') return false;
  }
  return shelfHoverCue.guide || shelfHoverCue.target > 0 || (value || shelfHoverCue.value) > 0.015;
}

function __mineradioInitLibraryShelfInteractions37() {
  renderer.domElement.addEventListener('click', function(e){
    if (!shelfManager || shelfManager.getMode() === 'off') return;
    if (document.body.classList.contains('splash-active')) return;
    if (isPointerOverUi(e)) return;
    if (mouseDownAt.hadDrag) { mouseDownAt.hadDrag = false; return; }
  
    var rc = raycasterFromPointerEvent(e);
    var mode = shelfManager.getMode();
    var canInteract = shelfManager.canInteract && shelfManager.canInteract();
  
    // 优先二级内容框
    if (shelfManager.hasOpenContent()) {
      var cl = shelfManager.getContentList && shelfManager.getContentList();
      if (cl) {
        var rowHit = cl.raycastRows(rc);
        if (!rowHit && cl.pickRowAtScreen) rowHit = cl.pickRowAtScreen(e.clientX, e.clientY);
        if (rowHit) {
          if (cl.pulseRow) cl.pulseRow(rowHit.row, 0.72);
          var selectedRow = Math.abs(rowHit.row.index - cl.getCenterIdx()) < 0.5;
          var rowIsPodcastRadio = !!(rowHit.row.song && rowHit.row.song.type === 'podcast-radio');
          var hitLikeButton = rowHit.uv && rowHit.uv.x > 0.61 && rowHit.uv.x < 0.68 && rowHit.uv.y > 0.20 && rowHit.uv.y < 0.82;
          var hitCollectButton = rowHit.uv && rowHit.uv.x >= 0.68 && rowHit.uv.x < 0.75 && rowHit.uv.y > 0.20 && rowHit.uv.y < 0.82;
          var hitNextButton = rowHit.uv && rowHit.uv.x >= 0.75 && rowHit.uv.x < 0.82 && rowHit.uv.y > 0.20 && rowHit.uv.y < 0.82;
          var hitPlayButton = rowHit.uv && rowHit.uv.x >= 0.82 && rowHit.uv.y > 0.20 && rowHit.uv.y < 0.82;
          var screenAction = (!rowHit.uv && cl.rowActionAtScreen) ? cl.rowActionAtScreen(rowHit.row, e.clientX, e.clientY) : null;
          hitLikeButton = hitLikeButton || screenAction === 'like';
          hitCollectButton = hitCollectButton || screenAction === 'collect';
          hitNextButton = hitNextButton || screenAction === 'next';
          hitPlayButton = hitPlayButton || screenAction === 'play';
          // 详情页支持直接点歌曲播放；红心/收藏按钮仍然保留原动作。
          if (selectedRow && !rowIsPodcastRadio && hitLikeButton) {
            toggleLikeDetailSong(rowHit.row.song);
          } else if (selectedRow && !rowIsPodcastRadio && hitCollectButton) {
            collectDetailSong(rowHit.row.song);
          } else if (selectedRow && !rowIsPodcastRadio && hitNextButton) {
            queueDetailSongNext(rowHit.row.song);
          } else if ((rowHit.row.song && rowHit.row.song.id) || rowIsPodcastRadio || (selectedRow && hitPlayButton)) {
            cl.playRow(rowHit.row);
          } else {
            // 滚到这行
            cl.scrollBy(rowHit.row.index - cl.getCenterIdx());
          }
          return;
        }
        var returnHit = shelfManager.raycastCards(rc);
        safeShelfCloseContent('shelf-card-return');
        if (mode === 'side') setShelfPinnedOpen(true, true);
        if (returnHit && returnHit.card) {
          shelfManager.scrollBy(returnHit.card.index - shelfManager.getCenterIdx());
        }
        return;
      }
    }
  
    // 一级卡片
    var hit = pointerCardHit(rc, e, mode === 'side' && !shelfPinnedOpen && shelfAlwaysVisible() ? 18 : undefined);
    if (mode === 'side' && !shelfPinnedOpen && !canUseSideShelfWithoutPinnedOpen()) return;
  
    if (hit) {
      if (mode === 'side') setShelfPinnedOpen(true, true);
      var idx = hit.card.index;
      if (Math.abs(idx - shelfManager.getCenterIdx()) < 0.5) {
        if (isShelfPlaylistPlayHit(hit) && shelfManager.playPlaylistAt && shelfManager.playPlaylistAt(idx)) return;
        shelfManager.openContent(idx);
      } else {
        shelfManager.scrollBy(idx - shelfManager.getCenterIdx());
      }
    } else if (mode === 'side' && shelfPinnedOpen) {
      setShelfPinnedOpen(false, true);
    }
  });

  renderer.domElement.addEventListener('contextmenu', function(e){
    if (document.body.classList.contains('splash-active')) return;
    if (isPointerOverUi(e)) return;
    e.preventDefault();
    e.stopPropagation();
    if (typeof suppressBottomControlsForShelf === 'function') suppressBottomControlsForShelf(980);
    if (!shelfManager) return;
    var mode = shelfManager.getMode && shelfManager.getMode();
    if (mode === 'off') {
      setShelfMode('side');
      mode = 'side';
    }
    if (mode !== 'side') return;
    if (shelfManager.hasOpenContent && shelfManager.hasOpenContent()) {
      var rc = raycasterFromPointerEvent(e);
      var cl = shelfManager.getContentList && shelfManager.getContentList();
      var rowHit = cl && cl.raycastRows ? cl.raycastRows(rc) : null;
      if (rowHit && rowHit.row && rowHit.row.song && rowHit.row.song.id && rowHit.row.song.type !== 'podcast-radio') {
        if (cl.pulseRow) cl.pulseRow(rowHit.row, 0.88);
        queueDetailSongNext(rowHit.row.song);
        return;
      }
      safeShelfCloseContent('shelf-context-toggle');
      setShelfPinnedOpen(true, true);
      return;
    }
    setShelfPinnedOpen(!shelfPinnedOpen, true);
    if (!shelfPinnedOpen && typeof setFocusZone === 'function') setFocusZone(null, true);
  });

  // 滚轮: 在真实卡片或右侧窄热区内滚卡片; 否则保留给封面粒子/视角
  //   side 模式: 常驻不再用半屏预览区接管滚轮
  //   stage 模式: 鼠标 y > 60% 屏幕高
  //   shift + wheel: 强制滚卡片
  wheelOverShelf = false;

  shelfWheelState = { shelfAcc: 0, detailAcc: 0, shelfStepAt: 0, detailStepAt: 0, lastAt: 0 };

  renderer.domElement.addEventListener('wheel', function(e){
    if (isPointerOverUi(e)) return;
    if (!shelfManager || shelfManager.getMode() === 'off') return;
    markRenderInteraction('shelf-wheel', 900);
    var rc = raycasterFromPointerEvent(e);
    // 二级框打开时, 只有真正命中详情行才接管滚轮
    if (shelfManager.hasOpenContent()) {
      var cl = shelfManager.getContentList();
      if (cl) {
        var rowHit = cl.raycastRows(rc);
        var panelHit = !rowHit && cl.raycastPanel ? cl.raycastPanel(rc) : null;
        var panelScreenHit = !rowHit && !panelHit && cl.screenContainsPanel ? cl.screenContainsPanel(e.clientX, e.clientY) : false;
        if (!rowHit && !panelHit && !panelScreenHit) return;
        e.preventDefault(); e.stopImmediatePropagation();
        var detailStep = consumeShelfWheelStep(e, 'detail');
        if (detailStep) cl.scrollBy(detailStep);
        return;
      }
    }
    var mode = shelfManager.getMode();
    var inShelfArea = false;
    var canScrollShelf = shelfManager.canInteract && shelfManager.canInteract();
    var shelfPreviewActive = shelfAutoHiddenInputReady();
    var cardWheelHit = canScrollShelf ? pointerCardHit(rc, e, mode === 'side' && !shelfPinnedOpen && shelfAlwaysVisible() ? 18 : undefined) : null;
    if (canScrollShelf && e.shiftKey && (mode !== 'side' || shelfPinnedOpen || shelfPreviewActive || shelfAlwaysVisible())) inShelfArea = true;
    else if (canScrollShelf && mode === 'side') {
      if (shelfPinnedOpen) inShelfArea = isShelfWheelZone(e) || !!cardWheelHit;
      else if (shelfAlwaysVisible()) inShelfArea = !!cardWheelHit;
      else if (shelfPreviewActive) inShelfArea = isShelfWheelZone(e) || !!cardWheelHit;
    }
    else if (canScrollShelf && mode === 'stage' && cardWheelHit) inShelfArea = true;
    if (inShelfArea) {
      e.preventDefault();
      e.stopImmediatePropagation();
      var shelfStep = consumeShelfWheelStep(e, 'shelf');
      if (shelfStep) shelfManager.scrollBy(shelfStep);
    }
  }, { passive: false, capture: true });

  document.addEventListener('keydown', function(e){
    consumeFreeCameraKeyEvent(e, true);
  }, true);

  document.addEventListener('keyup', function(e){
    consumeFreeCameraKeyEvent(e, false);
  }, true);

  document.addEventListener('keydown', function(e){
    if (isTypingTarget(e.target)) return;
    markRenderInteraction('keyboard', 700);
    if (e.code === 'KeyK') {
      e.preventDefault();
      if (freeCamera && (freeCamera.active || freeCamera.locked)) resetFreeCameraToDefault();
      else {
        recenterCamera();
        showToast('镜头已回正');
      }
      return;
    }
    if (e.code === 'KeyR') {
      if (e.repeat) return;
      e.preventDefault();
      toggleFreeCamera();
      return;
    }
    if (freeCamera && freeCamera.active) {
      if (/^(KeyW|KeyA|KeyS|KeyD|KeyQ|KeyE|Space|ShiftLeft|ShiftRight|ControlLeft|ControlRight)$/.test(e.code)) {
        e.preventDefault();
        e.stopImmediatePropagation();
        freeCamera.keys[e.code] = true;
        return;
      }
    }
    if (!shelfManager) return;
    if (e.code === 'BracketRight' || e.code === 'PageDown') shelfManager.next();
    else if (e.code === 'BracketLeft' || e.code === 'PageUp') shelfManager.prev();
  });

  document.addEventListener('keyup', function(e){
    if (!freeCamera || !freeCamera.keys) return;
    if (/^(KeyW|KeyA|KeyS|KeyD|KeyQ|KeyE|Space|ShiftLeft|ShiftRight|ControlLeft|ControlRight)$/.test(e.code)) {
      freeCamera.keys[e.code] = false;
    }
  });

  window.addEventListener('blur', function(){
    if (freeCamera && freeCamera.keys) freeCamera.keys = {};
  });
}
