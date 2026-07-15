function handleShelfWheel(event: WheelEvent): void {
  if (isPointerOverUi(event) || !shelfManager || shelfManager.getMode?.() === 'off') return;
  markRenderInteraction('shelf-wheel', 900);
  const raycaster = raycasterFromPointerEvent(event);
  if (shelfManager.hasOpenContent?.() && handleShelfContentWheel(event, raycaster)) return;
  const mode = shelfManager.getMode?.();
  const canScroll = Boolean(shelfManager.canInteract?.());
  const previewActive = shelfAutoHiddenInputReady();
  const padding = mode === 'side' && !shelfPinnedOpen && shelfAlwaysVisible() ? 18 : undefined;
  const cardHit = canScroll ? pointerCardHit(raycaster, event, padding) : null;
  let inShelfArea = false;
  if (canScroll && event.shiftKey && (mode !== 'side' || shelfPinnedOpen || previewActive || shelfAlwaysVisible())) {
    inShelfArea = true;
  } else if (canScroll && mode === 'side') {
    if (shelfPinnedOpen) inShelfArea = isShelfWheelZone(event) || Boolean(cardHit);
    else if (shelfAlwaysVisible()) inShelfArea = Boolean(cardHit);
    else if (previewActive) inShelfArea = isShelfWheelZone(event) || Boolean(cardHit);
  } else if (canScroll && mode === 'stage' && cardHit) {
    inShelfArea = true;
  }
  if (!inShelfArea) return;
  event.preventDefault();
  event.stopImmediatePropagation();
  const step = consumeShelfWheelStep(event, 'shelf');
  if (step) shelfManager.scrollBy?.(step);
}

function handleShelfContentWheel(event: WheelEvent, raycaster: THREE.Raycaster): boolean {
  const contentList = shelfManager?.getContentList?.();
  if (!contentList) return false;
  const rowHit = contentList.raycastRows(raycaster);
  const panelHit = !rowHit ? contentList.raycastPanel?.(raycaster) : null;
  const screenHit = !rowHit && !panelHit && Boolean(contentList.screenContainsPanel?.(event.clientX, event.clientY));
  if (!rowHit && !panelHit && !screenHit) return false;
  event.preventDefault();
  event.stopImmediatePropagation();
  const step = consumeShelfWheelStep(event, 'detail');
  if (step) contentList.scrollBy(step);
  return true;
}
