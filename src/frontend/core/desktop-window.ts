var desktopFullscreenActive = false;
var documentFullscreenActive = false;
var desktopWindowState: DesktopWindowState = {};

function toggleFullscreen(): void {
  var api = window.desktopWindow;
  if (api && api.isDesktop && typeof api.toggleFullscreen === 'function') {
    if (document.fullscreenElement && document.exitFullscreen) {
      document.exitFullscreen().catch(function(){});
      scheduleMainRendererViewportRefresh('document-fullscreen-exit');
      return;
    }
    api.toggleFullscreen();
    scheduleMainRendererViewportRefresh('desktop-fullscreen-toggle');
    return;
  }
  if (api && api.isDesktop && desktopFullscreenActive && !document.fullscreenElement && typeof api.exitFullscreenWindowed === 'function') {
    api.exitFullscreenWindowed();
    scheduleMainRendererViewportRefresh('desktop-fullscreen-exit');
    return;
  }
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen().catch(function(){
      if (api && api.isDesktop && typeof api.toggleFullscreen === 'function') api.toggleFullscreen();
      else showToast('全屏被浏览器拒绝');
    });
  } else {
    document.exitFullscreen();
    scheduleMainRendererViewportRefresh('document-fullscreen-exit');
  }
}

(function initDesktopWindowShell(){
  var api = window.desktopWindow;
  if (!api || !api.isDesktop) return;
  var desktopApi = api;

  document.documentElement.classList.add('desktop-shell-root');
  document.documentElement.classList.toggle('desktop-native-mac-controls-root', api.platform === 'darwin');
  document.body.classList.add('desktop-shell');
  document.body.classList.toggle('desktop-mac', api.platform === 'darwin');
  document.body.classList.toggle('desktop-native-mac-controls', api.platform === 'darwin');
  document.body.classList.remove('desktop-fullscreen');
  desktopFullscreenActive = false;
  syncCursorAutoHideMode();

  var maxBtn = document.querySelector('.desktop-native-window-btn[data-window-action="maximize"]');
  var maxActionBtns = Array.prototype.slice.call(document.querySelectorAll('[data-window-action="maximize"]'));
  var maxIcon = maxBtn && maxBtn.querySelector('.icon-maximize');
  var restoreIcon = maxBtn && maxBtn.querySelector('.icon-restore');
  var useMacFullscreenBehavior = api.platform === 'darwin';
  function applyState(state: DesktopWindowState): void {
    desktopWindowState = Object.assign(desktopWindowState, state || {});
    var isMaximized = !!desktopWindowState.isMaximized;
    var isFullScreen = !!desktopWindowState.isFullScreen || !!desktopWindowState.isNativeFullScreen || !!desktopWindowState.isHtmlFullScreen || !!desktopWindowState.isWindowFullScreen || !!document.fullscreenElement;
    var isExpanded = isMaximized || isFullScreen;
    var wasFullScreen = desktopFullscreenActive;
    desktopFullscreenActive = isFullScreen;
    document.body.classList.toggle('desktop-maximized', isMaximized);
    document.body.classList.toggle('desktop-fullscreen', isFullScreen);
    document.body.classList.toggle('desktop-window-expanded', isExpanded);
    desktopRuntimeState.fullscreen = isFullScreen;
    if (isFullScreen) layoutFullscreenDiyZone();
    if (isFullScreen !== wasFullScreen) {
      scheduleMainRendererViewportRefresh('desktop-shell-state');
      if (!isFullScreen) {
        document.body.classList.remove('fullscreen-diy-peek');
        setTimeout(function(){ clearPlayerControlFocusState('desktop-fullscreen-exit'); }, 80);
      }
    }
    syncCursorAutoHideMode();
    maxActionBtns.forEach(function(btn){
      btn.title = isExpanded ? '恢复' : (useMacFullscreenBehavior ? '全屏' : '最大化');
      btn.setAttribute('aria-label', btn.title);
    });
    if (maxIcon) (maxIcon as HTMLElement).style.display = isExpanded ? 'none' : '';
    if (restoreIcon) (restoreIcon as HTMLElement).style.display = isExpanded ? '' : 'none';
  }

  document.querySelectorAll('[data-window-action]').forEach(function(btn){
    btn.addEventListener('click', function(e){
      e.preventDefault();
      e.stopPropagation();
      var action = btn.getAttribute('data-window-action');
      if (action === 'minimize' && typeof desktopApi.minimize === 'function') desktopApi.minimize();
      if (action === 'maximize') {
        if (useMacFullscreenBehavior || desktopFullscreenActive || document.fullscreenElement) toggleFullscreen();
        else if (typeof desktopApi.toggleMaximize === 'function') desktopApi.toggleMaximize();
        else toggleFullscreen();
      }
      if (action === 'toggle-maximize' && typeof desktopApi.toggleMaximize === 'function') desktopApi.toggleMaximize();
      if (action === 'close' && typeof desktopApi.close === 'function') desktopApi.close();
    });
  });

  if (typeof api.onDesktopLyricsLockState === 'function') {
    api.onDesktopLyricsLockState(function(payload){
      var locked = !payload || payload.locked !== false;
      if (fx.desktopLyricsClickThrough === locked) return;
      fx.desktopLyricsClickThrough = locked;
      updateFxInputs();
      saveLyricLayout();
      pushDesktopLyricsState(true);
      showToast(locked ? '桌面歌词已锁定' : '桌面歌词可移动');
    });
  }
  if (typeof api.onDesktopLyricsEnabledState === 'function') {
    api.onDesktopLyricsEnabledState(function(payload){
      var enabled = !!(payload && payload.enabled);
      if (fx.desktopLyrics === enabled) return;
      fx.desktopLyrics = enabled;
      updateFxInputs();
      saveLyricLayout();
      showToast(enabled ? '桌面歌词已开启' : '桌面歌词已关闭');
    });
  }

  if (typeof api.onStateChange === 'function') api.onStateChange(applyState);
  if (typeof api.getState === 'function') {
    api.getState().then(applyState).catch(function(){ applyState({}); });
  } else {
    applyState({});
  }
  document.addEventListener('fullscreenchange', function(){
    var wasDocumentFullscreen = documentFullscreenActive;
    documentFullscreenActive = !!document.fullscreenElement;
    desktopWindowState.isHtmlFullScreen = documentFullscreenActive;
    if (wasDocumentFullscreen && !documentFullscreenActive && typeof desktopApi.exitFullscreenWindowed === 'function') {
      desktopApi.exitFullscreenWindowed();
    }
    applyState({});
  });
})();
applyDesktopLyricsState(false);
applyWallpaperModeState(false);
