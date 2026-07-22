(function installMineradioDesktopBridge() {
  var tauri = window.__TAURI__;
  var internals = window.__TAURI_INTERNALS__;
  var core = tauri && tauri.core;
  var event = tauri && tauri.event;
  if (!core && internals && typeof internals.invoke === 'function') {
    core = { invoke: function (command, args) { return internals.invoke(command, args || {}); } };
  }
  if (!event && internals && typeof internals.invoke === 'function' && typeof internals.transformCallback === 'function') {
    event = {
      listen: function (name, callback) {
        var handlerId = internals.transformCallback(callback);
        return internals.invoke('plugin:event|listen', {
          event: name,
          target: { kind: 'Any' },
          handler: handlerId
        }).then(function (eventId) {
          return function () {
            internals.unregisterCallback(handlerId);
            return internals.invoke('plugin:event|unlisten', { event: name, eventId: eventId });
          };
        });
      }
    };
  }
  if (!core || !event) {
    setTimeout(installMineradioDesktopBridge, 0);
    return;
  }
  if (window.__mineradioDesktopBridgeInstalled) return;
  window.__mineradioDesktopBridgeInstalled = true;
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
    arch: navigator.userAgent.indexOf('Intel') >= 0 ? 'x64' : (navigator.userAgent.indexOf('ARM') >= 0 ? 'arm64' : 'unknown'),
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
    getMusicCacheInfo: function () { return call('get_music_cache_info'); },
    openMusicCacheDirectory: function () { return call('open_music_cache_directory'); },
    clearMusicCache: function () { return call('clear_music_cache'); },
    openUpdateInstaller: function (filePath) { return call('open_update_installer', { filePath: filePath }); },
    restartApp: function () { return call('restart_app'); },
    onCheckForUpdates: function (callback) { return subscribe('mineradio-check-for-updates', callback); },
    requestCameraAccess: function () { return Promise.resolve({ ok: true, status: 'webview-managed' }); },
    configureGlobalHotkeys: function (bindings) { return call('configure_global_hotkeys', { bindings: bindings || [] }); },
    exportJsonFile: function (payload) { return call('export_json_file', { payload: payload || {} }); },
    importJsonFile: function () { return call('import_json_file'); },
    librarySnapshot: function () { return call('library_snapshot'); },
    libraryImportFiles: function (playlistId) { return call('library_import_files', { playlistId: playlistId || null }); },
    libraryImportFolder: function () { return call('library_import_folder'); },
    libraryCreatePlaylist: function (name) { return call('library_create_playlist', { name: name }); },
    libraryRenamePlaylist: function (playlistId, name) { return call('library_rename_playlist', { playlistId: playlistId, name: name }); },
    libraryDeletePlaylist: function (playlistId, cleanup) { return call('library_delete_playlist', { playlistId: playlistId, cleanup: cleanup !== false }); },
    libraryDeleteTrack: function (trackId) { return call('library_delete_track', { trackId: trackId }); },
    librarySetHeart: function (trackId, liked) { return call('library_set_heart', { trackId: trackId, liked: !!liked }); },
    libraryTogglePlaylistTrack: function (playlistId, trackId) { return call('library_toggle_playlist_track', { playlistId: playlistId, trackId: trackId }); },
    librarySaveQueue: function (trackIds) { return call('library_save_queue', { trackIds: trackIds || [] }); },
    libraryImportLxFile: function () { return call('library_import_lx_file'); },
    libraryImportRemotePlaylist: function (name, sourceUrl, source, songs) { return call('library_import_remote_playlist', { name: name, sourceUrl: sourceUrl, source: source, songs: songs || [] }); },
    onGlobalHotkey: function (callback) { return subscribe('mineradio-global-hotkey', callback); },
    setDesktopLyricsEnabled: function (enabled, payload) { return call('set_desktop_lyrics_enabled', { enabled: !!enabled, payload: payload || {} }); },
    updateDesktopLyrics: function (payload) { return call('update_desktop_lyrics', { payload: payload || {} }); },
    updateTouchBarLyrics: function (payload) { return call('update_touch_bar_lyrics', { payload: payload || {} }); },
    onDesktopLyricsLockState: function (callback) { return subscribe('mineradio-desktop-lyrics-lock-state', callback); },
    onDesktopLyricsEnabledState: function (callback) { return subscribe('mineradio-desktop-lyrics-enabled-state', callback); },
    setWallpaperMode: function (enabled, payload) { return call('set_wallpaper_mode', { enabled: !!enabled, payload: payload || {} }); },
    updateWallpaperMode: function (payload) { return call('update_wallpaper_mode', { payload: payload || {} }); },
    onStateChange: function (callback) { return subscribe('desktop-window-state', callback); }
  };
  window.desktopOverlay = {
    onLyricsState: function (callback) { return subscribe('mineradio-desktop-lyrics-state', callback); },
    getLyricsState: function () { return call('get_desktop_lyrics_state'); },
    onWallpaperState: function (callback) { return subscribe('mineradio-wallpaper-state', callback); },
    setLyricsDrag: function () { return Promise.resolve({ ok: true }); },
    setLyricsPointerCapture: function (active) { return call('set_lyrics_pointer_capture', { active: !!active }); },
    setLyricsHotBounds: function (bounds) { return call('set_lyrics_hot_bounds', { bounds: bounds || {} }); },
    setLyricsLockState: function (locked) { return call('set_lyrics_lock_state', { locked: !!locked }); },
    moveLyricsBy: function (dx, dy) { return call('move_lyrics_by', { dx: Number(dx) || 0, dy: Number(dy) || 0 }); },
    closeLyrics: function () { return call('set_desktop_lyrics_enabled', { enabled: false, payload: {} }); }
  };
})();
