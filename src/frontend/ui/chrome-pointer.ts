function handleChromePointerMove(event: MouseEvent): void {
  var search = document.getElementById('search-area');
  var fxPanel = document.getElementById('fx-panel');
  var playlistPanel = document.getElementById('playlist-panel');
  if (!search || !fxPanel || !playlistPanel) return;
  var x = event.clientX;
  var y = event.clientY;
  var height = innerHeight;
  updateUserCapsuleAutoHideFromPointer(x, y);
  updateFxFabAutoHideFromPointer(x, y);
  updateFullscreenDiyPeekFromPointer(x, y);
  if (document.body.classList.contains('splash-active')) {
    updateShelfHoverCueFromPointer(null);
    updateShelfCardHoverSelection(null);
    setFocusZone(null);
    return;
  }
  if (immersiveMode) {
    handleImmersiveChromePointer(event, playlistPanel, x, y, height);
    return;
  }
  updateShelfHoverCueFromPointer(event);
  updateShelfCardHoverSelection(event);
  updateSearchPeek(search, x, y);
  updateFxPeek(fxPanel, x, y);
  var playlistState = updatePlaylistPeek(playlistPanel, x, y, height);
  updateChromeFocusZone(event, playlistPanel, playlistState.inTrigger, playlistState.inPanel, x, y, height);
}

function handleImmersiveChromePointer(event: MouseEvent, panel: HTMLElement, x: number, y: number, height: number): void {
  updateShelfHoverCueFromPointer(event);
  updateShelfCardHoverSelection(event);
  updateControlsAutoHideFromPointer(x, y);
  var open = panel.classList.contains('peek');
  var rect = panel.getBoundingClientRect();
  var inTrigger = isPlaylistEdgeTrigger(x, y, height);
  var inPanel = open && pointNearRect(x, y, rect, 18, 22, 22);
  if (inTrigger || inPanel) setPeek(panel, true, 'pl');
  else if (shouldClosePlaylistPanelFromPointer(open, x, rect)) setPeek(panel, false, 'pl');
  setShelfOrQueueFocus(event, panel, inTrigger, inPanel, x, y, height);
}

function updateSearchPeek(search: HTMLElement, x: number, y: number): void {
  var open = search.classList.contains('peek');
  var inPanel = open && pointNearRect(x, y, search.getBoundingClientRect(), 24, 22, 42);
  var uploadTipOpen = !!document.getElementById('upload-tip')?.classList.contains('show');
  if (y < 66 || inPanel || document.activeElement === $input || uploadTipOpen) setPeek(search, true, 'search');
  else if (open && !emptyHomeActive) setPeek(search, false, 'search');
}

function updateFxPeek(panel: HTMLElement, x: number, y: number): void {
  var open = panel.classList.contains('peek') || panel.classList.contains('show');
  var panelRect = panel.getBoundingClientRect();
  var fab = document.getElementById('fx-fab');
  var fabRect = fab?.getBoundingClientRect();
  var inPanel = open && pointNearRect(x, y, panelRect, 24, 24, 24);
  var inFab = !!fabRect && pointNearRect(x, y, fabRect, 18, 18, 18);
  var inBridge = !!fabRect && open && x >= Math.min(panelRect.left, fabRect.left) - 18 && x <= innerWidth
    && y >= panelRect.bottom - 10 && y <= fabRect.bottom + 18;
  if (!diyPlayerMode) inPanel = inFab = inBridge = false;
  if (inFab || inPanel || inBridge || isFxPanelClickHoldActive()) setPeek(panel, true, 'fx');
  else if (open) setPeek(panel, false, 'fx');
}

function updatePlaylistPeek(panel: HTMLElement, x: number, y: number, height: number): { inTrigger: boolean; inPanel: boolean } {
  var open = panel.classList.contains('peek');
  var rect = panel.getBoundingClientRect();
  var inTrigger = isPlaylistEdgeTrigger(x, y, height);
  var inPanel = open && pointNearRect(x, y, rect, 18, 22, 22);
  if (inTrigger || inPanel) setPeek(panel, true, 'pl');
  else if (shouldClosePlaylistPanelFromPointer(open, x, rect)) setPeek(panel, false, 'pl');
  return { inTrigger: inTrigger, inPanel: inPanel };
}

function updateChromeFocusZone(event: MouseEvent, panel: HTMLElement, inTrigger: boolean, inPanel: boolean, x: number, y: number, height: number): void {
  var canFocus = !!shelfManager?.canInteract?.();
  if (!canFocus && !shelfManager?.hasOpenContent?.()) shelfPinnedOpen = false;
  setShelfOrQueueFocus(event, panel, inTrigger, inPanel, x, y, height);
}

function setShelfOrQueueFocus(event: MouseEvent, panel: HTMLElement, inTrigger: boolean, inPanel: boolean, x: number, y: number, height: number): void {
  var canFocus = !!shelfManager?.canInteract?.();
  var rect = panel.getBoundingClientRect();
  var focus: string | null = null;
  if (isPlaylistPanelFocusActive(inTrigger, inPanel, panel, x, rect)) focus = 'queue';
  else if (shelfManager?.hasOpenContent?.()) focus = 'shelf-detail';
  else if (canFocus && isSideShelfFocusHit(event)) focus = 'shelf-side';
  else if (canFocus && shelfManager?.getMode?.() === 'stage' && y > height * 0.55) focus = 'shelf-stage';
  setFocusZone(focus, focus === 'queue');
}
