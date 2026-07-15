function __mineradioInitUiChrome50(): void {
  window.addEventListener('resize', function(): void {
    scheduleMainRendererViewportRefresh('resize');
    var fullscreen = desktopRuntimeState.fullscreen || desktopFullscreenActive || !!document.fullscreenElement || document.body.classList.contains('desktop-fullscreen');
    if (fullscreen) layoutFullscreenDiyZone();
  });
  document.addEventListener('keydown', handleChromeKeydown);
  PEEK_HIDE_DELAY = 170;
  peekTimers = { search: null, fx: null, pl: null };
  secondaryPlaylistEdgeGuard = { enteredAt: 0, timer: null, x: 0, y: 0, H: 0 };
  SECONDARY_PLAYLIST_EDGE_MIN_X = 36;
  SECONDARY_PLAYLIST_EDGE_MAX_X = 96;
  SECONDARY_PLAYLIST_EDGE_DWELL_MS = 220;
  SECONDARY_PLAYLIST_SEAM_CLOSE_X = 28;
  window.addEventListener('mousemove', handleChromePointerMove);
}
