function raycasterFromPointerEvent(event: ShelfPointerPosition): THREE.Raycaster {
  const mouseX = event.clientX / innerWidth * 2 - 1;
  const mouseY = -(event.clientY / innerHeight) * 2 + 1;
  const raycaster = new THREE.Raycaster();
  raycaster.setFromCamera(new THREE.Vector2(mouseX, mouseY), camera);
  return raycaster;
}

function pointerCardHit(
  raycaster: THREE.Raycaster,
  event: ShelfPointerPosition,
  screenPadding?: number
): ShelfCardHit | null {
  if (!shelfManager) return null;
  return shelfManager.raycastCards?.(raycaster) as ShelfCardHit | null
    || shelfManager.pickCardAtScreen?.(event.clientX, event.clientY, screenPadding)
    || null;
}

function isSideShelfFocusHit(event?: ShelfPointerPosition | null): boolean {
  if (!event || shelfManager?.getMode?.() !== 'side') return false;
  if (shelfPinnedOpen) return true;
  if (shelfAlwaysVisible()) return Boolean(pointerCardHit(raycasterFromPointerEvent(event), event, 18));
  if (!shelfAutoHiddenInputReady()) return false;
  if (shelfVisibility > 0.34 && (isShelfClickZone(event) || isShelfPreviewUseZone(event))) return true;
  return shelfPreviewIsVisible() && Boolean(pointerCardHit(raycasterFromPointerEvent(event), event, 24));
}

function isShelfPlaylistPlayHit(hit?: ShelfCardHit | null): boolean {
  const { card, uv } = hit || {};
  return Boolean(card?.item?.type === 'playlist' && uv
    && uv.x >= 0.49 && uv.x <= 0.72 && uv.y >= 0.13 && uv.y <= 0.42);
}

function normalizedShelfWheelDelta(event: WheelEvent): number {
  let deltaX = Number(event.deltaX) || 0;
  let deltaY = Number(event.deltaY) || 0;
  if (event.deltaMode === WheelEvent.DOM_DELTA_LINE) {
    deltaX *= 16;
    deltaY *= 16;
  } else if (event.deltaMode === WheelEvent.DOM_DELTA_PAGE) {
    deltaX *= innerHeight;
    deltaY *= innerHeight;
  }
  if (Math.abs(deltaX) > Math.abs(deltaY) * 1.15) return 0;
  return clampRange(deltaY, -140, 140);
}

function consumeShelfWheelStep(event: WheelEvent, kind: 'detail' | 'shelf'): number {
  const delta = normalizedShelfWheelDelta(event);
  if (!delta) return 0;
  const now = performance.now();
  if (now - shelfWheelState.lastAt > 260) {
    shelfWheelState.shelfAcc = 0;
    shelfWheelState.detailAcc = 0;
  }
  shelfWheelState.lastAt = now;
  const accumulatorKey = kind === 'detail' ? 'detailAcc' : 'shelfAcc';
  const stepTimeKey = kind === 'detail' ? 'detailStepAt' : 'shelfStepAt';
  const threshold = kind === 'detail' ? 62 : 74;
  const minimumInterval = kind === 'detail' ? 96 : 118;
  shelfWheelState[accumulatorKey] = clampRange(
    shelfWheelState[accumulatorKey] + delta,
    -threshold * 1.35,
    threshold * 1.35
  );
  if (Math.abs(shelfWheelState[accumulatorKey]) < threshold) return 0;
  if (now - shelfWheelState[stepTimeKey] < minimumInterval) {
    shelfWheelState[accumulatorKey] *= 0.38;
    return 0;
  }
  const direction = shelfWheelState[accumulatorKey] > 0 ? 1 : -1;
  shelfWheelState[accumulatorKey] = 0;
  shelfWheelState[stepTimeKey] = now;
  return direction;
}
