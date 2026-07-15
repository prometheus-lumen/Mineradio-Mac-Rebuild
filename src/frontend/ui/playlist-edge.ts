function isSecondaryLeftDisplaySeamGuardActive(): boolean {
  return !!window.desktopWindow?.isDesktop
    && desktopWindowState.isPrimaryDisplay === false
    && !!desktopWindowState.hasDisplayOnLeft;
}

function resetSecondaryPlaylistEdgeGuard(): void {
  if (secondaryPlaylistEdgeGuard.timer) {
    clearTimeout(secondaryPlaylistEdgeGuard.timer);
    secondaryPlaylistEdgeGuard.timer = null;
  }
  secondaryPlaylistEdgeGuard.enteredAt = 0;
}

function isSecondaryPlaylistSafeBandPoint(x: number, y: number, height: number): boolean {
  return y > 132 && y < height - 132 && x >= SECONDARY_PLAYLIST_EDGE_MIN_X && x < SECONDARY_PLAYLIST_EDGE_MAX_X;
}

function armSecondaryPlaylistEdgeDwell(): void {
  if (secondaryPlaylistEdgeGuard.timer) return;
  secondaryPlaylistEdgeGuard.timer = setTimeout(function(): void {
    secondaryPlaylistEdgeGuard.timer = null;
    if (!isSecondaryLeftDisplaySeamGuardActive()) return;
    var state = secondaryPlaylistEdgeGuard;
    if (!isSecondaryPlaylistSafeBandPoint(state.x, state.y, state.H)) return;
    setPeek(document.getElementById('playlist-panel'), true, 'pl');
  }, SECONDARY_PLAYLIST_EDGE_DWELL_MS);
}

function isPlaylistEdgeTrigger(x: number, y: number, height: number): boolean {
  if (y <= 132 || y >= height - 132) {
    resetSecondaryPlaylistEdgeGuard();
    return false;
  }
  if (!isSecondaryLeftDisplaySeamGuardActive()) return x >= 14 && x < 78;
  if (!isSecondaryPlaylistSafeBandPoint(x, y, height)) {
    resetSecondaryPlaylistEdgeGuard();
    return false;
  }
  secondaryPlaylistEdgeGuard.x = x;
  secondaryPlaylistEdgeGuard.y = y;
  secondaryPlaylistEdgeGuard.H = height;
  var now = performance.now();
  if (!secondaryPlaylistEdgeGuard.enteredAt) secondaryPlaylistEdgeGuard.enteredAt = now;
  armSecondaryPlaylistEdgeDwell();
  return now - secondaryPlaylistEdgeGuard.enteredAt >= SECONDARY_PLAYLIST_EDGE_DWELL_MS;
}

function playlistPanelExitPadding(): number {
  return isSecondaryLeftDisplaySeamGuardActive() ? 34 : 72;
}

function playlistPanelFocusPadding(): number {
  return isSecondaryLeftDisplaySeamGuardActive() ? 28 : 52;
}

function isPlaylistPanelFocusActive(
  inTrigger: boolean,
  inPanel: boolean,
  panel: HTMLElement | null,
  pointerX: number,
  panelRect: DOMRect
): boolean {
  if (isSecondaryLeftDisplaySeamGuardActive() && pointerX < SECONDARY_PLAYLIST_SEAM_CLOSE_X) return false;
  return inTrigger || inPanel || !!panel?.classList.contains('peek') && pointerX < panelRect.right + playlistPanelFocusPadding();
}
