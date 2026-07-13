'use strict';

// Mineradio classic module: ui/chrome.
function readDiyModePreference() {
  try { return localStorage.getItem(DIY_MODE_STORE_KEY) === '1'; } catch (e) { return false; }
}

function saveDiyModePreference(on) {
  try { localStorage.setItem(DIY_MODE_STORE_KEY, on ? '1' : '0'); } catch (e) {}
}

function applyUserCapsuleAutoHideState() {
  document.body.classList.toggle('user-capsule-auto-hide', !!userCapsuleAutoHide);
  var btn = document.getElementById('user-capsule-hide-btn');
  if (btn) {
    btn.classList.toggle('on', !!userCapsuleAutoHide);
    btn.textContent = userCapsuleAutoHide ? '›' : '‹';
    btn.title = userCapsuleAutoHide ? '取消自动隐藏账号胶囊' : '自动隐藏账号胶囊';
  }
}

function toggleUserCapsuleAutoHide(e) {
  if (e && e.stopPropagation) e.stopPropagation();
  userCapsuleAutoHide = !userCapsuleAutoHide;
  saveBooleanPreference(USER_CAPSULE_AUTO_HIDE_STORE_KEY, userCapsuleAutoHide);
  applyUserCapsuleAutoHideState();
  showToast(userCapsuleAutoHide ? '账号胶囊已自动隐藏' : '账号胶囊已固定显示');
}

function updateUserCapsuleAutoHideFromPointer(x, y) {
  if (!userCapsuleAutoHide || immersiveMode) {
    document.body.classList.remove('user-capsule-peek');
    return;
  }
  var nearTopRight = x > innerWidth - 112 && y < 126;
  document.body.classList.toggle('user-capsule-peek', nearTopRight);
}

function applyFxFabAutoHideState(opts) {
  opts = opts || {};
  document.body.classList.toggle('fx-fab-auto-hide', !!fxFabAutoHide);
  if (!fxFabAutoHide) {
    document.body.classList.remove('fx-fab-peek');
    fxFabAutoHideRevealArmed = true;
  } else if (opts.forceHidden) {
    document.body.classList.remove('fx-fab-peek');
    fxFabAutoHideRevealArmed = false;
  }
  var btn = document.getElementById('fx-fab-hide-btn');
  if (btn) {
    btn.classList.toggle('on', !!fxFabAutoHide);
    btn.textContent = fxFabAutoHide ? '›' : '‹';
    btn.title = fxFabAutoHide ? '取消自动隐藏视觉控制台' : '自动隐藏视觉控制台';
  }
}

function toggleFxFabAutoHide(e) {
  if (e && e.stopPropagation) e.stopPropagation();
  fxFabAutoHide = !fxFabAutoHide;
  saveBooleanPreference(FX_FAB_AUTO_HIDE_STORE_KEY, fxFabAutoHide);
  applyFxFabAutoHideState({ forceHidden: fxFabAutoHide });
  showToast(fxFabAutoHide ? '视觉控制台按钮已自动隐藏' : '视觉控制台按钮已固定显示');
}

function updateFxFabAutoHideFromPointer(x, y) {
  if (!fxFabAutoHide || !diyPlayerMode || immersiveMode) {
    document.body.classList.remove('fx-fab-peek');
    fxFabAutoHideRevealArmed = true;
    return;
  }
  var panel = document.getElementById('fx-panel');
  var panelOpen = !!(panel && (panel.classList.contains('peek') || panel.classList.contains('show')));
  var nearBottomRight = x > innerWidth - 126 && y > innerHeight - 158;
  if (!nearBottomRight) fxFabAutoHideRevealArmed = true;
  document.body.classList.toggle('fx-fab-peek', panelOpen || isFxPanelClickHoldActive() || (nearBottomRight && fxFabAutoHideRevealArmed));
}

function layoutFullscreenDiyZone() {
  var width = innerWidth < 820 ? 104 : 128;
  var height = innerWidth < 720 ? 48 : 52;
  var left = innerWidth - 510;
  var top = 24;
  var anchor = document.querySelector('#top-right .top-account-pill') || document.getElementById('user-btn') || document.getElementById('top-right');
  if (anchor) {
    var rect = anchor.getBoundingClientRect();
    if (rect.width > 0 && rect.height > 0) {
      var gap = innerWidth < 820 ? 8 : 12;
      left = rect.left + rect.width / 2 - width / 2;
      top = rect.bottom + gap;
    }
  }
  left = Math.max(12, Math.min(innerWidth - width - 12, left));
  top = Math.max(8, Math.min(innerHeight - height - 8, top));
  document.documentElement.style.setProperty('--fullscreen-diy-left', left.toFixed(1) + 'px');
  document.documentElement.style.setProperty('--fullscreen-diy-top', top.toFixed(1) + 'px');
  document.documentElement.style.setProperty('--fullscreen-diy-width', width + 'px');
  return { left: left, top: top, width: width, height: height };
}

function shouldSuppressFullscreenDiyPeek() {
  var fxPanel = document.getElementById('fx-panel');
  var hotkeyModal = document.getElementById('hotkey-modal');
  var fxPanelOpen = !!(fxPanel && (fxPanel.classList.contains('peek') || fxPanel.classList.contains('show')));
  var hotkeyOpen = !!(hotkeyModal && hotkeyModal.classList.contains('show'));
  return !!(visualGuideActive || fxPanelOpen || hotkeyOpen);
}

function updateFullscreenDiyPeekFromPointer(x, y) {
  var isFullscreen = !!(desktopRuntimeState.fullscreen || desktopFullscreenActive || document.fullscreenElement || document.body.classList.contains('desktop-fullscreen'));
  if (!isFullscreen || immersiveMode || shouldSuppressFullscreenDiyPeek()) {
    document.body.classList.remove('fullscreen-diy-peek');
    return;
  }
  var rect = layoutFullscreenDiyZone();
  var anchor = document.querySelector('#top-right .top-account-pill') || document.getElementById('user-btn') || document.getElementById('top-right');
  var anchorRect = anchor ? anchor.getBoundingClientRect() : rect;
  var hitLeft = Math.min(rect.left, anchorRect.left) - 26;
  var hitRight = Math.max(rect.left + rect.width, anchorRect.right) + 26;
  var hitTop = Math.min(rect.top, anchorRect.top) - 18;
  var hitBottom = Math.max(rect.top + rect.height, anchorRect.bottom) + 16;
  var inDiyHotspot = x >= hitLeft && x <= hitRight && y >= hitTop && y <= hitBottom;
  var inMacWindowHotspot = document.body.classList.contains('desktop-mac') && x <= 172 && y <= 76;
  var active = inDiyHotspot || inMacWindowHotspot;
  document.body.classList.toggle('fullscreen-diy-peek', active);
}

function isDiyMode() {
  return !!diyPlayerMode;
}

function syncDiyModeButton() {
  ['diy-mode-btn', 'fullscreen-diy-btn'].forEach(function(id) {
    var btn = document.getElementById(id);
    if (!btn) return;
    btn.classList.toggle('on', diyPlayerMode);
    btn.setAttribute('aria-pressed', diyPlayerMode ? 'true' : 'false');
    btn.title = diyPlayerMode ? '关闭 DIY 玩家模式' : '开启 DIY 玩家模式';
    btn.setAttribute('aria-label', btn.title);
  });
}

function applyDiyMode(on, opts) {
  opts = opts || {};
  diyPlayerMode = !!on;
  document.documentElement.classList.toggle('diy-mode-preload', diyPlayerMode);
  document.documentElement.classList.toggle('simple-mode-preload', !diyPlayerMode);
  document.body.classList.toggle('diy-mode', diyPlayerMode);
  document.body.classList.toggle('simple-mode', !diyPlayerMode);
  syncDiyModeButton();
  if (opts.save) saveDiyModePreference(diyPlayerMode);
  if (!diyPlayerMode) {
    toggleFxPanel(false);
    togglePlaylistPanel(false);
    closeUploadTip(false);
    var quality = document.getElementById('quality-control');
    var volume = document.getElementById('volume-control');
    if (quality) quality.classList.remove('open');
    if (volume) volume.classList.remove('open');
  }
  if (opts.toast) showToast(diyPlayerMode ? 'DIY 玩家模式已开启' : '已切回简约模式');
  if (opts.animate && window.gsap) {
    ['diy-mode-btn', 'fullscreen-diy-btn'].forEach(function(id) {
      var btn = document.getElementById(id);
      if (btn) window.gsap.fromTo(btn, { scale: 0.94 }, { scale: 1, duration: 0.34, ease: 'back.out(1.8)', overwrite: true });
    });
  }
}

function toggleDiyMode() {
  applyDiyMode(!diyPlayerMode, { save: true, toast: true, animate: true });
  if (visualGuideActive) {
    visualGuideState.mode = diyPlayerMode ? 'diy' : 'simple';
    showVisualGuideStep(0);
  }
}

function alignBeatCameraCursorToTime(t) {
  if (!currentBeatMap) return;
  var beats = currentBeatMap.cameraBeats || currentBeatMap.beats || currentBeatMap.kicks || [];
  beatCam.nextIdx = 0;
  while (beatCam.nextIdx < beats.length) {
    var bt = typeof beats[beatCam.nextIdx] === 'number' ? beats[beatCam.nextIdx] : beats[beatCam.nextIdx].time;
    if (bt >= t + beatCam.lookahead) break;
    beatCam.nextIdx++;
  }
}

function setControlsHidden(hidden) {
  var bar = document.getElementById('bottom-bar');
  if (!bar) return;
  if (hidden && (controlsHovering || miniQueueOpen)) hidden = false;
  bar.classList.toggle('soft-hidden', !!hidden && controlsAutoHide && bar.classList.contains('visible'));
  bar.style.pointerEvents = '';
  updateControlsChromeState();
}

function scheduleControlsHide(delay) {
  if (controlsHideTimer) clearTimeout(controlsHideTimer);
  if (!controlsAutoHide) return;
  controlsHideTimer = setTimeout(function(){
    controlsHideTimer = null;
    if (!controlsHovering) setControlsHidden(true);
  }, delay == null ? 480 : delay);
}

function revealBottomControls(delay) {
  if (document.body.classList.contains('home-controls-locked')) return;
  var bar = document.getElementById('bottom-bar');
  if (isBottomControlsSuppressedForShelf()) return;
  if (bar) bar.classList.add('visible');
  wakeBottomHandle();
  setControlsHidden(false);
  if (controlsAutoHide) scheduleControlsHide(delay == null ? 520 : delay);
}

function updateControlsChromeState() {
  var bar = document.getElementById('bottom-bar');
  var handle = document.getElementById('bottom-handle');
  var active = !!(bar && bar.classList.contains('visible') && !bar.classList.contains('soft-hidden'));
  document.body.classList.toggle('controls-visible', active);
  if (handle) handle.classList.toggle('active', active);
}

function updateControlsAutoHideFromPointer(x, y) {
  if (document.body.classList.contains('home-controls-locked')) return;
  if (isBottomControlsSuppressedForShelf()) return;
  var bar = document.getElementById('bottom-bar');
  if (!bar || !bar.classList.contains('visible')) return;
  if (!controlsAutoHide) { setControlsHidden(false); return; }
  if (diyPlayerMode) {
    var fxPanel = document.getElementById('fx-panel');
    var fxFab = document.getElementById('fx-fab');
    var fr = fxPanel ? fxPanel.getBoundingClientRect() : null;
    var br = fxFab ? fxFab.getBoundingClientRect() : null;
    var overFxPanel = fxPanel && (fxPanel.classList.contains('peek') || fxPanel.classList.contains('show')) && fr && x >= fr.left - 18 && x <= fr.right + 18 && y >= fr.top - 18 && y <= fr.bottom + 18;
    var overFxFab = br && x >= br.left - 18 && x <= br.right + 18 && y >= br.top - 18 && y <= br.bottom + 18;
    if (overFxPanel || overFxFab) {
      scheduleControlsHide(80);
      return;
    }
  }
  controlsLastMoveAt = performance.now();
  var rect = bar.getBoundingClientRect();
  var handle = document.getElementById('bottom-handle');
  var hr = handle ? handle.getBoundingClientRect() : null;
  var overHandle = hr && x >= hr.left - 18 && x <= hr.right + 18 && y >= hr.top - 12 && y <= hr.bottom + 14;
  var overBar = x >= rect.left - 18 && x <= rect.right + 18 && y >= rect.top - 18 && y <= rect.bottom + 14;
  var mini = document.getElementById('mini-queue-popover');
  var miniRect = mini ? mini.getBoundingClientRect() : null;
  var overMini = miniQueueOpen && miniRect && x >= miniRect.left - 16 && x <= miniRect.right + 16 && y >= miniRect.top - 16 && y <= miniRect.bottom + 16;
  if (overHandle) wakeBottomHandle();
  if (overBar || overMini || overHandle) revealBottomControls(overHandle ? 900 : 520);
  else scheduleControlsHide(70);
}

function toggleControlsAutoHide() {
  controlsAutoHide = !controlsAutoHide;
  saveBooleanPreference(CONTROLS_AUTO_HIDE_STORE_KEY, controlsAutoHide);
  var btn = document.getElementById('controls-hide-btn');
  if (btn) btn.classList.toggle('active', controlsAutoHide);
  setControlsHidden(false);
  if (controlsAutoHide) {
    scheduleControlsHide(520);
    showToast('控制条自动隐藏已开启');
  } else {
    if (controlsHideTimer) { clearTimeout(controlsHideTimer); controlsHideTimer = null; }
    showToast('控制条保持显示');
  }
}

function applyControlsAutoHidePreference() {
  var btn = document.getElementById('controls-hide-btn');
  if (btn) btn.classList.toggle('active', !!controlsAutoHide);
  if (!controlsAutoHide && controlsHideTimer) {
    clearTimeout(controlsHideTimer);
    controlsHideTimer = null;
  }
  setControlsHidden(false);
}

function isCursorAutoHideMode() {
  return !document.hidden;
}

function clearCursorAutoHideTimer() {
  if (cursorHideTimer) {
    clearTimeout(cursorHideTimer);
    cursorHideTimer = null;
  }
}

function setCursorHidden(hidden) {
  document.body.classList.toggle('cursor-hidden', !!hidden && isCursorAutoHideMode());
}

function currentCursorHideDelay() {
  return immersiveMode ? IMMERSIVE_CURSOR_HIDE_DELAY : CURSOR_HIDE_DELAY;
}

function scheduleCursorHide(delay) {
  clearCursorAutoHideTimer();
  if (!isCursorAutoHideMode()) {
    setCursorHidden(false);
    return;
  }
  cursorHideTimer = setTimeout(function(){
    cursorHideTimer = null;
    setCursorHidden(true);
  }, delay == null ? currentCursorHideDelay() : delay);
}

function revealCursorForActivity() {
  if (!isCursorAutoHideMode()) {
    clearCursorAutoHideTimer();
    setCursorHidden(false);
    return;
  }
  setCursorHidden(false);
  scheduleCursorHide();
}

function syncCursorAutoHideMode() {
  if (isCursorAutoHideMode()) revealCursorForActivity();
  else {
    clearCursorAutoHideTimer();
    setCursorHidden(false);
  }
}

// 每帧调用 — 按 beatMap 触发预演鼓点
function syncBeatMapPlaybackCursor(t, preserveVisualState) {
  if (djMode.active) {
    syncPodcastDjMapCursor(t, preserveVisualState);
    return;
  }
  t = isFinite(t) ? t : 0;
  beatMapNextIdx = 0;
  var pulseEvents = currentBeatMap && (currentBeatMap.pulseBeats || currentBeatMap.kicks);
  if (pulseEvents) {
    while (beatMapNextIdx < pulseEvents.length && beatEventTime(pulseEvents[beatMapNextIdx]) < t) beatMapNextIdx++;
  }
  if (preserveVisualState) alignBeatCameraCursorToTime(t);
  else syncBeatCameraToTime(t);
}

function syncPodcastDjMapCursor(t, preserveVisualState) {
  t = isFinite(t) ? t : 0;
  djBeatMapNextIdx = 0;
  djBeatPulseNextIdx = 0;
  if (currentDjBeatMap) {
    var beatEvents = currentDjBeatMap.cameraBeats || currentDjBeatMap.beats || currentDjBeatMap.kicks || [];
    var camSyncTime = Math.max(0, t - 0.025);
    while (djBeatMapNextIdx < beatEvents.length && beatEventTime(beatEvents[djBeatMapNextIdx]) < camSyncTime) djBeatMapNextIdx++;
    var pulseEvents = currentDjBeatMap.pulseBeats || currentDjBeatMap.kicks || [];
    var pulseSyncTime = Math.max(0, t - 0.035);
    while (djBeatPulseNextIdx < pulseEvents.length && beatEventTime(pulseEvents[djBeatPulseNextIdx]) < pulseSyncTime) djBeatPulseNextIdx++;
  }
  if (!preserveVisualState) resetBeatCameraSync(t);
}

function syncControlsAutoHideButton() {
  var btn = document.getElementById('controls-hide-btn');
  if (btn) btn.classList.toggle('active', controlsAutoHide);
  if (!controlsAutoHide && controlsHideTimer) {
    clearTimeout(controlsHideTimer);
    controlsHideTimer = null;
  }
}

function updateImmersiveButton() {
  var btn = document.getElementById('immersive-btn');
  if (!btn) return;
  btn.classList.toggle('active', immersiveMode);
  btn.setAttribute('aria-pressed', immersiveMode ? 'true' : 'false');
  btn.title = immersiveMode ? '退出全沉浸式' : '全沉浸式';
  btn.setAttribute('aria-label', btn.title);
}

function closeImmersiveInterference() {
  closeMiniQueue();
  toggleFxPanel(false);
  closeUploadTip(false);
  closeLoginModal();
  closeUserModal();
  closeCollectModal();
  closeCoverCropModal();
  closeCustomLyricModal();
  closeTrackDetailModal();
  if (!localBeatAnalysis.active) closeLocalBeatModal();
  ['search-area', 'fx-panel', 'trial-banner', 'ai-depth-chip', 'beat-chip'].forEach(function(id){
    var el = document.getElementById(id);
    if (el) el.classList.remove('peek', 'show', 'closing');
  });
  var fab = document.getElementById('fx-fab');
  if (fab) fab.classList.remove('active');
  document.body.classList.remove('login-guide-active');
  setFocusZone(null, true);
}

function setImmersiveMode(on) {
  on = !!on;
  if (immersiveMode === on) return;

  if (on) {
    immersiveState = {
      shelfMode: fx.shelf,
      shelfPinnedOpen: shelfPinnedOpen,
      lyrics: fx.particleLyrics,
      controlsAutoHide: controlsAutoHide,
      bottomVisible: !!(document.getElementById('bottom-bar') && document.getElementById('bottom-bar').classList.contains('visible'))
    };
    immersiveMode = true;
    document.body.classList.add('immersive-mode');
    var bottomBarEnter = document.getElementById('bottom-bar');
    if (bottomBarEnter) bottomBarEnter.classList.add('visible');
    closeImmersiveInterference();
    if (!fx.particleLyrics) setParticleLyricsSilently(true);
    controlsAutoHide = true;
    syncControlsAutoHideButton();
    updateImmersiveButton();
    syncCursorAutoHideMode();
    revealBottomControls(720);
    setTimeout(function(){
      if (immersiveMode && !controlsHovering) setControlsHidden(true);
    }, 980);
    return;
  }

  immersiveMode = false;
  document.body.classList.remove('immersive-mode');
  closeMiniQueue();
  if (immersiveState.shelfMode) setShelfMode(immersiveState.shelfMode);
  if (immersiveState.shelfMode === 'side' && immersiveState.shelfPinnedOpen) setShelfPinnedOpen(true, true);
  else setShelfPinnedOpen(false, true);
  if (immersiveState.lyrics === false) setParticleLyricsSilently(false);
  controlsAutoHide = immersiveState.controlsAutoHide !== false;
  syncControlsAutoHideButton();
  updateImmersiveButton();
  syncCursorAutoHideMode();
  var bottomBarExit = document.getElementById('bottom-bar');
  if (immersiveState.bottomVisible) revealBottomControls(900);
  else if (bottomBarExit) bottomBarExit.classList.remove('visible', 'soft-hidden');
  showToast('已退出全沉浸式');
}

function toggleImmersiveMode() {
  setImmersiveMode(!immersiveMode);
}

function setPeek(el, on, key) {
  if (!el) return;
  if (immersiveMode && on && (key === 'search' || key === 'fx')) return;
  if (on && !diyPlayerMode && key === 'fx') return;
  if (!on && key === 'search' && emptyHomeActive && !immersiveMode) return;
  if (!on && key === 'pl' && playlistPanelPinned) return;
  if (!on && key === 'pl' && performance.now() < playlistPanelOpenGuardUntil) return;
  if (on && key === 'fx') document.body.classList.remove('fullscreen-diy-peek');
  if (on) {
    if (key === 'pl') guardPlaylistPanelOpen(1400);
    var wasPeek = el.classList.contains('peek');
    if (peekTimers[key]) { clearTimeout(peekTimers[key]); peekTimers[key] = null; }
    if (key === 'fx') el.classList.remove('closing');
    if (key === 'pl' && !wasPeek && !playQueue.length && queueViewTab === 'queue') switchPlaylistTab('playlists');
    if (key === 'pl' && !wasPeek && playQueue.length && currentIdx >= 0) {
      if (el.dataset && el.dataset.preserveTabOnOpen === '1') delete el.dataset.preserveTabOnOpen;
      else if (queueViewTab !== 'queue') switchPlaylistTab('queue');
      scrollPlaylistPanelToCurrent();
    } else if (key === 'pl' && el.dataset && el.dataset.preserveTabOnOpen === '1') {
      delete el.dataset.preserveTabOnOpen;
    }
    el.classList.add('peek');
    if (key === 'pl' && !wasPeek) {
      scheduleUiWarmTask(function(){
        flushDeferredQueuePanel('playlist-panel-peek');
        if (queueViewTab === 'queue') animateVisiblePanelList(document.getElementById('queue-list'), '.queue-item', el, '.queue-item.now', { scrollActive: false });
      }, 180);
    }
    if (key === 'fx') {
      var fabOn = document.getElementById('fx-fab');
      if (fabOn) fabOn.classList.add('active');
    }
  } else {
    if (key === 'fx' && isFxPanelClickHoldActive()) return;
    if (peekTimers[key]) clearTimeout(peekTimers[key]);
    peekTimers[key] = setTimeout(function(){
      if (key === 'fx' && isFxPanelClickHoldActive()) {
        peekTimers[key] = null;
        return;
      }
      if (key === 'pl' && performance.now() < playlistPanelOpenGuardUntil) {
        peekTimers[key] = null;
        return;
      }
      el.classList.remove('peek');
      if (key === 'fx') {
        var fabOff = document.getElementById('fx-fab');
        if (fabOff && !el.classList.contains('show')) fabOff.classList.remove('active');
      }
      peekTimers[key] = null;
    }, PEEK_HIDE_DELAY);
  }
}

function uploadTipWasSeen() {
  try { return localStorage.getItem(UPLOAD_TIP_STORE_KEY) === '1'; } catch (e) { return true; }
}

function markUploadTipSeen() {
  try { localStorage.setItem(UPLOAD_TIP_STORE_KEY, '1'); } catch (e) {}
}

function closeUploadTip(manual) {
  var tip = document.getElementById('upload-tip');
  if (uploadTipTimer) { clearTimeout(uploadTipTimer); uploadTipTimer = null; }
  if (manual) markUploadTipSeen();
  if (!tip || !tip.classList.contains('show')) return;
  if (window.gsap) {
    window.gsap.killTweensOf(tip);
    window.gsap.to(tip, {
      autoAlpha: 0,
      y: -8,
      scale: 0.98,
      duration: 0.24,
      ease: 'power2.in',
      overwrite: true,
      onComplete: function(){
        tip.classList.remove('show');
        window.gsap.set(tip, { clearProps: 'opacity,visibility,transform,filter' });
      }
    });
  } else {
    tip.classList.remove('show');
  }
}

function maybeShowUploadTipOnce() {
  if (!diyPlayerMode) return;
  if (uploadTipWasSeen()) return;
  if (immersiveMode) {
    setTimeout(maybeShowUploadTipOnce, 1800);
    return;
  }
  if (document.body.classList.contains('splash-active') || loginGuideAnimating) {
    setTimeout(maybeShowUploadTipOnce, 900);
    return;
  }
  var loginModal = document.getElementById('login-modal');
  var userModal = document.getElementById('user-modal');
  var coverModal = document.getElementById('cover-crop-modal');
  var hasModal = (loginModal && loginModal.classList.contains('show')) ||
    (userModal && userModal.classList.contains('show')) ||
    (coverModal && coverModal.classList.contains('show'));
  if (hasModal) {
    uploadTipAttempts++;
    if (uploadTipAttempts < 18) setTimeout(maybeShowUploadTipOnce, 1800);
    return;
  }
  var area = document.getElementById('search-area');
  var tip = document.getElementById('upload-tip');
  if (!area || !tip) return;
  markUploadTipSeen();
  setPeek(area, true, 'search');
  tip.classList.add('show');
  if (window.gsap) {
    window.gsap.killTweensOf(tip);
    window.gsap.fromTo(tip,
      { autoAlpha: 0, y: -10, scale: 0.975 },
      { autoAlpha: 1, y: 0, scale: 1, duration: 0.62, ease: 'expo.out', overwrite: true }
    );
    var uploadBtn = document.getElementById('upload-btn');
    if (uploadBtn) {
      window.gsap.fromTo(uploadBtn,
        { scale: 1, boxShadow: '0 10px 32px rgba(0,0,0,.22)' },
        { scale: 1.07, boxShadow: '0 0 0 8px rgba(244,210,138,0),0 16px 46px rgba(244,210,138,.14)', duration: 0.58, ease: 'sine.inOut', yoyo: true, repeat: 3, overwrite: true }
      );
    }
  }
  uploadTipTimer = setTimeout(function(){
    uploadTipTimer = null;
    closeUploadTip(false);
    setPeek(area, false, 'search');
  }, 6800);
}

function isSecondaryLeftDisplaySeamGuardActive() {
  var state = (typeof desktopWindowState !== 'undefined' && desktopWindowState) ? desktopWindowState : {};
  return !!(window.desktopWindow && window.desktopWindow.isDesktop && state.isPrimaryDisplay === false && state.hasDisplayOnLeft);
}

function resetSecondaryPlaylistEdgeGuard() {
  if (secondaryPlaylistEdgeGuard.timer) {
    clearTimeout(secondaryPlaylistEdgeGuard.timer);
    secondaryPlaylistEdgeGuard.timer = null;
  }
  secondaryPlaylistEdgeGuard.enteredAt = 0;
}

function isSecondaryPlaylistSafeBandPoint(ex, ey, H) {
  return ey > 132 && ey < H - 132 && ex >= SECONDARY_PLAYLIST_EDGE_MIN_X && ex < SECONDARY_PLAYLIST_EDGE_MAX_X;
}

function armSecondaryPlaylistEdgeDwell() {
  if (secondaryPlaylistEdgeGuard.timer) return;
  secondaryPlaylistEdgeGuard.timer = setTimeout(function(){
    secondaryPlaylistEdgeGuard.timer = null;
    if (!isSecondaryLeftDisplaySeamGuardActive()) return;
    if (!isSecondaryPlaylistSafeBandPoint(secondaryPlaylistEdgeGuard.x, secondaryPlaylistEdgeGuard.y, secondaryPlaylistEdgeGuard.H)) return;
    var panel = document.getElementById('playlist-panel');
    if (panel) setPeek(panel, true, 'pl');
  }, SECONDARY_PLAYLIST_EDGE_DWELL_MS);
}

function isPlaylistEdgeTrigger(ex, ey, H) {
  var inVerticalBand = ey > 132 && ey < H - 132;
  if (!inVerticalBand) {
    resetSecondaryPlaylistEdgeGuard();
    return false;
  }
  if (!isSecondaryLeftDisplaySeamGuardActive()) {
    return ex >= 14 && ex < 78;
  }
  var inSafeBand = isSecondaryPlaylistSafeBandPoint(ex, ey, H);
  if (!inSafeBand) {
    resetSecondaryPlaylistEdgeGuard();
    return false;
  }
  secondaryPlaylistEdgeGuard.x = ex;
  secondaryPlaylistEdgeGuard.y = ey;
  secondaryPlaylistEdgeGuard.H = H;
  var now = performance.now();
  if (!secondaryPlaylistEdgeGuard.enteredAt) secondaryPlaylistEdgeGuard.enteredAt = now;
  armSecondaryPlaylistEdgeDwell();
  return now - secondaryPlaylistEdgeGuard.enteredAt >= SECONDARY_PLAYLIST_EDGE_DWELL_MS;
}

function playlistPanelExitPadding() {
  return isSecondaryLeftDisplaySeamGuardActive() ? 34 : 72;
}

function playlistPanelFocusPadding() {
  return isSecondaryLeftDisplaySeamGuardActive() ? 28 : 52;
}

function isPlaylistPanelFocusActive(inTrigger, inPanel, pp, ex, ppRect) {
  if (isSecondaryLeftDisplaySeamGuardActive() && ex < SECONDARY_PLAYLIST_SEAM_CLOSE_X) return false;
  return inTrigger || inPanel || (pp && pp.classList.contains('peek') && ex < ppRect.right + playlistPanelFocusPadding());
}

function __mineradioInitUiChrome50() {
  window.addEventListener('resize', function(){
    scheduleMainRendererViewportRefresh('resize');
    if (desktopRuntimeState.fullscreen || desktopFullscreenActive || document.fullscreenElement || document.body.classList.contains('desktop-fullscreen')) layoutFullscreenDiyZone();
  });

  document.addEventListener('keydown', function(e){
    if (isTypingTarget(e.target)) return;
    if (handleConfiguredLocalHotkey(e)) return;
    if (shouldSuppressDefaultConfiguredHotkey(e)) return;
    if (e.code === 'Space') {
      if (freeCamera && freeCamera.active) { e.preventDefault(); return; }
      e.preventDefault(); togglePlay();
    }
    else if (e.code === 'Home') { e.preventDefault(); goHome(); }
    else if (e.code === 'ArrowUp') { e.preventDefault(); adjustVolumeByKeyboard(0.05); }
    else if (e.code === 'ArrowDown') { e.preventDefault(); adjustVolumeByKeyboard(-0.05); }
    else if (e.code === 'ArrowRight') nextTrack();
    else if (e.code === 'ArrowLeft')  prevTrack();
    else if (e.code === 'Escape')     {
      if (immersiveMode) {
        e.preventDefault();
        setImmersiveMode(false);
        return;
      }
      if (window.desktopWindow && window.desktopWindow.isDesktop && desktopFullscreenActive && !document.fullscreenElement && window.desktopWindow.exitFullscreenWindowed) {
        e.preventDefault();
        window.desktopWindow.exitFullscreenWindowed();
        return;
      }
      if (document.fullscreenElement) {
        e.preventDefault();
        document.exitFullscreen();
        return;
      }
      var localBeatModal = document.getElementById('local-beat-modal');
      if (localBeatModal && localBeatModal.classList.contains('show')) {
        e.preventDefault();
        if (localBeatAnalysis.active) cancelLocalBeatAnalysis();
        else closeLocalBeatModal();
        return;
      }
      var customLyricModal = document.getElementById('custom-lyric-modal');
      if (customLyricModal && customLyricModal.classList.contains('show')) {
        e.preventDefault();
        closeCustomLyricModal();
        return;
      }
      var trackDetailModal = document.getElementById('track-detail-modal');
      if (trackDetailModal && trackDetailModal.classList.contains('show')) {
        e.preventDefault();
        closeTrackDetailModal();
        return;
      }
      if (miniQueueOpen) { closeMiniQueue(); return; }
      if (shelfManager && shelfManager.hasOpenContent()) { safeShelfCloseContent('escape-key'); return; }
      closeLoginModal(); closeUserModal(); toggleFxPanel(false); togglePlaylistPanel(false);
    }
    else if (e.code === 'KeyL') { if (!immersiveMode) toggleLyricsPanel(); }
    else if (e.code === 'KeyP') {
      if (!immersiveMode && diyPlayerMode) toggleFxPanel();
      else if (!immersiveMode) showToast('开启 DIY 玩家模式后可打开视觉控制台');
    }
    else if (e.code === 'KeyI') toggleImmersiveMode();
    else if (e.code === 'KeyF') toggleFullscreen();
  });

  // ============================================================
  //  UI 半隐藏 v8 — 三个面板的触发/隐藏体验完全统一
  //   - 搜索栏 (顶部): y < 80 进入, y > 96 离开
  //   - 控制台 (右侧): x > w-48 进入, x < w-380 离开
  //   - 歌单 (左侧): x < 48 进入, x > 380 离开
  //   - 进入立即显示, 离开延迟 500ms (统一)
  // ============================================================
  PEEK_HIDE_DELAY = 170;

  peekTimers = { search:null, fx:null, pl:null };

  secondaryPlaylistEdgeGuard = { enteredAt:0, timer:null, x:0, y:0, H:0 };

  SECONDARY_PLAYLIST_EDGE_MIN_X = 36;

  SECONDARY_PLAYLIST_EDGE_MAX_X = 96;

  SECONDARY_PLAYLIST_EDGE_DWELL_MS = 220;

  SECONDARY_PLAYLIST_SEAM_CLOSE_X = 28;

  window.addEventListener('mousemove', function(e){
    var sa = document.getElementById('search-area');
    var fp = document.getElementById('fx-panel');
    var pp = document.getElementById('playlist-panel');
    var ex = e.clientX, ey = e.clientY, W = innerWidth, H = innerHeight;
    updateUserCapsuleAutoHideFromPointer(ex, ey);
    updateFxFabAutoHideFromPointer(ex, ey);
    updateFullscreenDiyPeekFromPointer(ex, ey);
    if (document.body.classList.contains('splash-active')) {
      updateShelfHoverCueFromPointer(null);
      updateShelfCardHoverSelection(null);
      setFocusZone(null);
      return;
    }
    if (immersiveMode) {
      updateShelfHoverCueFromPointer(e);
      updateShelfCardHoverSelection(e);
      updateControlsAutoHideFromPointer(ex, ey);
      var ppOnImm = pp.classList.contains('peek');
      var ppRectImm = pp.getBoundingClientRect();
      var inQueueTriggerImm = isPlaylistEdgeTrigger(ex, ey, H);
      var inQueuePanelImm = ppOnImm && ex >= ppRectImm.left - 18 && ex <= ppRectImm.right + 24 && ey >= ppRectImm.top - 22 && ey <= ppRectImm.bottom + 22;
      if (inQueueTriggerImm || inQueuePanelImm) setPeek(pp, true, 'pl');
      else if (shouldClosePlaylistPanelFromPointer(ppOnImm, ex, ppRectImm)) setPeek(pp, false, 'pl');
      var shelfCanFocusImm = !!(shelfManager && shelfManager.canInteract && shelfManager.canInteract());
      var newFocusImm = null;
      var queueFocusImm = isPlaylistPanelFocusActive(inQueueTriggerImm, inQueuePanelImm, pp, ex, ppRectImm);
      var shelfHoverFocusImm = !!(shelfCanFocusImm && isSideShelfFocusHit(e));
      if (queueFocusImm) newFocusImm = 'queue';
      else if (shelfManager && shelfManager.hasOpenContent && shelfManager.hasOpenContent()) newFocusImm = 'shelf-detail';
      else if (shelfHoverFocusImm) newFocusImm = 'shelf-side';
      else if (shelfCanFocusImm && shelfManager.getMode() === 'stage' && ey > H * 0.55) newFocusImm = 'shelf-stage';
      setFocusZone(newFocusImm, newFocusImm === 'queue');
      return;
    }
    updateShelfHoverCueFromPointer(e);
    updateShelfCardHoverSelection(e);
    // 搜索 (上): 顶部 48px 内进入; 已显示时鼠标在 280px 内保留
    var saOn = sa.classList.contains('peek');
    var saRect = sa.getBoundingClientRect();
    var searchFocused = document.activeElement === $input;
    var uploadTip = document.getElementById('upload-tip');
    var uploadTipOpen = !!(uploadTip && uploadTip.classList.contains('show'));
    var inSearchPanel = saOn && ex >= saRect.left - 24 && ex <= saRect.right + 24 && ey >= saRect.top - 22 && ey <= saRect.bottom + 42;
    if (ey < 66 || inSearchPanel || searchFocused || uploadTipOpen) setPeek(sa, true, 'search');
    else if (saOn && !emptyHomeActive) setPeek(sa, false, 'search');
    // 控制台: 右下角触发；一旦面板出现，就按真实面板矩形保留显示
    var fpOn = fp.classList.contains('peek') || fp.classList.contains('show');
    var fpRect = fp.getBoundingClientRect();
    var fab = document.getElementById('fx-fab');
    var fabRect = fab ? fab.getBoundingClientRect() : { left:W, right:W, top:H, bottom:H };
    var inFxPanel = fpOn && ex >= fpRect.left - 24 && ex <= fpRect.right + 24 && ey >= fpRect.top - 24 && ey <= fpRect.bottom + 24;
    var inFxFab = ex >= fabRect.left - 18 && ex <= fabRect.right + 18 && ey >= fabRect.top - 18 && ey <= fabRect.bottom + 18;
    var inFxBridge = fpOn && ex >= Math.min(fpRect.left, fabRect.left) - 18 && ex <= W && ey >= fpRect.bottom - 10 && ey <= fabRect.bottom + 18;
    if (!diyPlayerMode) inFxPanel = inFxFab = inFxBridge = false;
    if (inFxFab || inFxPanel || inFxBridge || isFxPanelClickHoldActive()) setPeek(fp, true, 'fx');
    else if (fpOn) setPeek(fp, false, 'fx');
    // 歌单/队列 DOM 面板只在左侧明确停留时出现，避免和右侧 3D 架抢焦点
    var ppOn = pp.classList.contains('peek');
    var ppRect = pp.getBoundingClientRect();
    var inQueueTrigger = isPlaylistEdgeTrigger(ex, ey, H);
    var inQueuePanel = ppOn && ex >= ppRect.left - 18 && ex <= ppRect.right + 24 && ey >= ppRect.top - 22 && ey <= ppRect.bottom + 22;
    if (inQueueTrigger || inQueuePanel) setPeek(pp, true, 'pl');
    else if (shouldClosePlaylistPanelFromPointer(ppOn, ex, ppRect)) setPeek(pp, false, 'pl');
  
    // v8: 镜头跟拍触发判断
    //   - 队列面板 peek 时 → queue focus
    //   - 3D shelf side 模式只在点击展开后 → shelf-side
    //   - 3D shelf stage 模式 + 鼠标在下 35% → shelf-stage
    var shelfCanFocus = !!(shelfManager && shelfManager.canInteract && shelfManager.canInteract());
    if (!shelfCanFocus && !(shelfManager && shelfManager.hasOpenContent && shelfManager.hasOpenContent())) {
      shelfPinnedOpen = false;
    }
  
    var newFocus = null;
    var queueFocusActive = isPlaylistPanelFocusActive(inQueueTrigger, inQueuePanel, pp, ex, ppRect);
    var shelfHoverFocus = !!(shelfCanFocus && isSideShelfFocusHit(e));
    if (queueFocusActive) {
      newFocus = 'queue';
    } else if (shelfManager && shelfManager.hasOpenContent && shelfManager.hasOpenContent()) {
      newFocus = 'shelf-detail';
    } else if (shelfHoverFocus) {
      newFocus = 'shelf-side';
    } else if (shelfCanFocus && shelfManager.getMode() === 'stage' && ey > H * 0.55) {
      newFocus = 'shelf-stage';
    }
    setFocusZone(newFocus, newFocus === 'queue');
  });
}
