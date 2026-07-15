function setPeek(element: HTMLElement | null, visible: boolean, key: PeekPanelKey): void {
  if (!element || !canChangePeekState(visible, key)) return;
  if (visible) showPeekPanel(element, key);
  else schedulePeekPanelHide(element, key);
}

function canChangePeekState(visible: boolean, key: PeekPanelKey): boolean {
  if (immersiveMode && visible && (key === 'search' || key === 'fx')) return false;
  if (visible && !diyPlayerMode && key === 'fx') return false;
  if (!visible && key === 'search' && emptyHomeActive && !immersiveMode) return false;
  if (!visible && key === 'pl' && playlistPanelPinned) return false;
  if (!visible && key === 'pl' && performance.now() < playlistPanelOpenGuardUntil) return false;
  return true;
}

function showPeekPanel(element: HTMLElement, key: PeekPanelKey): void {
  if (key === 'fx') document.body.classList.remove('fullscreen-diy-peek');
  if (key === 'pl') guardPlaylistPanelOpen(1400);
  var wasVisible = element.classList.contains('peek');
  clearPeekTimer(key);
  if (key === 'fx') element.classList.remove('closing');
  if (key === 'pl') preparePlaylistPanelTab(element, wasVisible);
  element.classList.add('peek');
  if (key === 'pl' && !wasVisible) warmPlaylistPanel(element);
  if (key === 'fx') document.getElementById('fx-fab')?.classList.add('active');
}

function preparePlaylistPanelTab(element: HTMLElement, wasVisible: boolean): void {
  if (wasVisible) return;
  var preserveTab = element.dataset.preserveTabOnOpen === '1';
  if (preserveTab) {
    delete element.dataset.preserveTabOnOpen;
    return;
  }
  if (!playQueue.length && queueViewTab === 'queue') switchPlaylistTab('playlists');
  else if (playQueue.length && currentIdx >= 0) {
    if (queueViewTab !== 'queue') switchPlaylistTab('queue');
    scrollPlaylistPanelToCurrent();
  }
}

function warmPlaylistPanel(element: HTMLElement): void {
  scheduleUiWarmTask(function(): void {
    flushDeferredQueuePanel('playlist-panel-peek');
    var queueList = document.getElementById('queue-list');
    if (queueViewTab === 'queue' && queueList) {
      animateVisiblePanelList(queueList, '.queue-item', element, '.queue-item.now', { scrollActive: false });
    }
  }, 180);
}

function schedulePeekPanelHide(element: HTMLElement, key: PeekPanelKey): void {
  if (key === 'fx' && isFxPanelClickHoldActive()) return;
  clearPeekTimer(key);
  peekTimers[key] = setTimeout(function(): void {
    if (key === 'fx' && isFxPanelClickHoldActive() || key === 'pl' && performance.now() < playlistPanelOpenGuardUntil) {
      peekTimers[key] = null;
      return;
    }
    element.classList.remove('peek');
    if (key === 'fx' && !element.classList.contains('show')) document.getElementById('fx-fab')?.classList.remove('active');
    peekTimers[key] = null;
  }, PEEK_HIDE_DELAY);
}

function clearPeekTimer(key: PeekPanelKey): void {
  var timer = peekTimers[key];
  if (timer) clearTimeout(timer);
  peekTimers[key] = null;
}

function uploadTipWasSeen(): boolean {
  try { return localStorage.getItem(UPLOAD_TIP_STORE_KEY) === '1'; }
  catch (error) { return true; }
}

function markUploadTipSeen(): void {
  try { localStorage.setItem(UPLOAD_TIP_STORE_KEY, '1'); }
  catch (error) {}
}

function closeUploadTip(manual: boolean): void {
  var tip = document.getElementById('upload-tip');
  if (uploadTipTimer) {
    clearTimeout(uploadTipTimer);
    uploadTipTimer = null;
  }
  if (manual) markUploadTipSeen();
  if (!tip?.classList.contains('show')) return;
  if (!window.gsap) {
    tip.classList.remove('show');
    return;
  }
  var activeTip = tip;
  window.gsap.killTweensOf(activeTip);
  window.gsap.to(activeTip, {
    autoAlpha: 0, y: -8, scale: 0.98, duration: 0.24, ease: 'power2.in', overwrite: true,
    onComplete: function(): void {
      activeTip.classList.remove('show');
      window.gsap?.set(activeTip, { clearProps: 'opacity,visibility,transform,filter' });
    }
  });
}

function maybeShowUploadTipOnce(): void {
  if (!diyPlayerMode || uploadTipWasSeen()) return;
  if (immersiveMode || document.body.classList.contains('splash-active') || loginGuideAnimating) {
    setTimeout(maybeShowUploadTipOnce, immersiveMode ? 1800 : 900);
    return;
  }
  if (hasBlockingUploadTipModal()) {
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
  animateUploadTip(tip);
  uploadTipTimer = setTimeout(function(): void {
    uploadTipTimer = null;
    closeUploadTip(false);
    setPeek(area, false, 'search');
  }, 6800);
}

function hasBlockingUploadTipModal(): boolean {
  return ['login-modal', 'user-modal', 'cover-crop-modal'].some(function(id): boolean {
    return !!document.getElementById(id)?.classList.contains('show');
  });
}

function animateUploadTip(tip: HTMLElement): void {
  if (!window.gsap) return;
  window.gsap.killTweensOf(tip);
  window.gsap.fromTo(tip, { autoAlpha: 0, y: -10, scale: 0.975 }, { autoAlpha: 1, y: 0, scale: 1, duration: 0.62, ease: 'expo.out', overwrite: true });
  var button = document.getElementById('upload-btn');
  if (button) window.gsap.fromTo(button,
    { scale: 1, boxShadow: '0 10px 32px rgba(0,0,0,.22)' },
    { scale: 1.07, boxShadow: '0 0 0 8px rgba(244,210,138,0),0 16px 46px rgba(244,210,138,.14)', duration: 0.58, ease: 'sine.inOut', yoyo: true, repeat: 3, overwrite: true }
  );
}
