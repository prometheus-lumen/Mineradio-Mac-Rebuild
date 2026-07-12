(function () {
  var core = window.__TAURI__ && window.__TAURI__.core;
  var event = window.__TAURI__ && window.__TAURI__.event;
  if (!core || !event) return;
  var invoke = core.invoke;
  function call(command, args) { return invoke(command, args || {}); }
  function subscribe(name, callback) {
    if (typeof callback !== 'function') return function () {};
    var unlisten = null;
    event.listen(name, function (message) { callback(message.payload || {}); }).then(function (fn) { unlisten = fn; });
    return function () { if (unlisten) unlisten(); };
  }
  window.desktopWindow = {
    isDesktop: true,
    platform: navigator.userAgent.indexOf('Mac') >= 0 ? 'darwin' : (navigator.userAgent.indexOf('Windows') >= 0 ? 'win32' : 'linux'),
    arch: 'unknown',
    minimize: function () { return call('window_minimize'); },
    toggleMaximize: function () { return call('window_toggle_maximize'); },
    toggleFullscreen: function () { return call('window_toggle_fullscreen'); },
    exitFullscreenWindowed: function () { return call('window_exit_fullscreen_windowed'); },
    getState: function () { return call('window_get_state'); },
    setBackgroundKeepEnabled: function (enabled) { return Promise.resolve({ ok: true, backgroundThrottling: !enabled }); },
    close: function () { return call('window_close'); },
    startDrag: function () { return call('window_start_drag'); },
    openNeteaseMusicLogin: function () { return call('open_music_login', { service: 'netease' }); },
    clearNeteaseMusicLogin: function () { return call('clear_music_login', { service: 'netease' }); },
    openQQMusicLogin: function () { return call('open_music_login', { service: 'qq' }); },
    clearQQMusicLogin: function () { return call('clear_music_login', { service: 'qq' }); },
    openKugouMusicLogin: function () { return call('open_music_login', { service: 'kugou' }); },
    clearKugouMusicLogin: function () { return call('clear_music_login', { service: 'kugou' }); },
    openUpdateInstaller: function (filePath) { return call('open_update_installer', { filePath: filePath }); },
    restartApp: function () { return call('restart_app'); },
    onCheckForUpdates: function (callback) { return subscribe('mineradio-check-for-updates', callback); },
    requestCameraAccess: function () { return Promise.resolve({ ok: true, status: 'webview-managed' }); },
    configureGlobalHotkeys: function (bindings) { return call('configure_global_hotkeys', { bindings: bindings || [] }); },
    exportJsonFile: function (payload) { return call('export_json_file', { payload: payload || {} }); },
    importJsonFile: function () { return call('import_json_file'); },
    onGlobalHotkey: function (callback) { return subscribe('mineradio-global-hotkey', callback); },
    setDesktopLyricsEnabled: function (enabled, payload) { return call('set_desktop_lyrics_enabled', { enabled: !!enabled, payload: payload || {} }); },
    updateDesktopLyrics: function (payload) { return call('update_desktop_lyrics', { payload: payload || {} }); },
    updateTouchBarLyrics: function () { return Promise.resolve({ ok: true, supported: false }); },
    onDesktopLyricsLockState: function (callback) { return subscribe('mineradio-desktop-lyrics-lock-state', callback); },
    onDesktopLyricsEnabledState: function (callback) { return subscribe('mineradio-desktop-lyrics-enabled-state', callback); },
    setWallpaperMode: function (enabled, payload) { return call('set_wallpaper_mode', { enabled: !!enabled, payload: payload || {} }); },
    updateWallpaperMode: function (payload) { return call('update_wallpaper_mode', { payload: payload || {} }); },
    onStateChange: function (callback) { return subscribe('desktop-window-state', callback); }
  };
  window.desktopOverlay = {
    onLyricsState: function (callback) { return subscribe('mineradio-desktop-lyrics-state', callback); },
    onWallpaperState: function (callback) { return subscribe('mineradio-wallpaper-state', callback); },
    setLyricsDrag: function () { return Promise.resolve({ ok: true }); },
    setLyricsPointerCapture: function (active) { return call('set_lyrics_pointer_capture', { active: !!active }); },
    setLyricsHotBounds: function (bounds) { return call('set_lyrics_hot_bounds', { bounds: bounds || {} }); },
    setLyricsLockState: function (locked) { return call('set_lyrics_lock_state', { locked: !!locked }); },
    moveLyricsBy: function (dx, dy) { return call('move_lyrics_by', { dx: Number(dx) || 0, dy: Number(dy) || 0 }); },
    closeLyrics: function () { return call('set_desktop_lyrics_enabled', { enabled: false, payload: {} }); }
  };
  document.addEventListener('DOMContentLoaded', function () {
    document.documentElement.classList.add('desktop-shell-root');
    document.body.classList.add('desktop-shell');
    var titlebar = document.getElementById('desktop-titlebar');
    var dragRegion = document.querySelector('.desktop-drag-region');
    if (dragRegion) dragRegion.setAttribute('data-tauri-drag-region', '');
    if (titlebar) titlebar.setAttribute('data-tauri-drag-region', '');
    if (titlebar) {
      titlebar.addEventListener('mousedown', function (event) {
        if (event.button !== 0 || event.target.closest('button,.desktop-window-controls,.mac-window-controls')) return;
        event.preventDefault();
        call('window_start_drag').catch(function () {});
      });
      titlebar.addEventListener('dblclick', function (event) {
        if (event.target.closest('button,.desktop-window-controls,.mac-window-controls')) return;
        call('window_toggle_maximize').catch(function () {});
      });
    }
  });
})();
