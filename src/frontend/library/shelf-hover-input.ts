function isPortraitShelfViewport(): boolean {
  return innerHeight > innerWidth * 1.08;
}

function shelfWheelZoneWidth(): number {
  const portrait = isPortraitShelfViewport();
  const ratioWidth = innerWidth * (portrait ? 0.24 : 0.18);
  return Math.min(portrait ? 280 : 360, Math.max(shelfHotZoneWidth(), ratioWidth));
}

function isShelfClickZone(event: ShelfPointerPosition): boolean {
  const edge = shelfPinnedOpen ? Math.min(390, Math.max(210, innerWidth * 0.22)) : shelfHotZoneWidth();
  return event.clientX > innerWidth - edge && event.clientY > 130 && event.clientY < innerHeight - 150;
}

function isShelfWheelZone(event: ShelfPointerPosition): boolean {
  const edge = shelfWheelZoneWidth();
  return event.clientX > innerWidth - edge && event.clientY > 116 && event.clientY < innerHeight - 116;
}

function canUseSideShelfWithoutPinnedOpen(): boolean {
  return shelfAlwaysVisible();
}

function shelfAutoHiddenInputReady(): boolean {
  if (shelfPinnedOpen || shelfAlwaysVisible() || shelfManager?.hasOpenContent?.()) return true;
  return Boolean(shelfHoverCue.guide || shelfHoverCue.zoneActive || shelfHoverCue.value > 0.18 || shelfVisibility > 0.16);
}

function canShowShelfHoverCueAt(event?: ShelfPointerPosition | null): boolean {
  if (!event || !shelfHoverCue.guide || document.body.classList.contains('splash-active')) return false;
  if (visualGuideActive || emptyHomeActive || homeForcedOpen) return false;
  if (shelfManager?.getMode?.() !== 'side' || shelfPinnedOpen || shelfManager.hasOpenContent?.()) return false;
  if (isPointerOverUi(event)) return false;
  return isShelfClickZone(event) || shelfPreviewIsVisible() && isShelfPreviewUseZone(event);
}

function updateShelfHoverCueFromPointer(event?: ShelfPointerPosition | null): void {
  if (!event) {
    if (!shelfHoverCue.guide) shelfHoverCue.target = 0;
    shelfHoverCue.zoneActive = false;
    shelfHoverCue.enteredAt = 0;
    return;
  }
  const inZone = canShowShelfHoverCueAt(event);
  if (inZone && !shelfHoverCue.zoneActive) {
    shelfHoverCue.zoneActive = true;
    shelfHoverCue.enteredAt = performance.now();
  } else if (!inZone) {
    shelfHoverCue.zoneActive = false;
    shelfHoverCue.enteredAt = 0;
  }
  if (!shelfHoverCue.guide) shelfHoverCue.target = inZone ? 1 : 0;
  shelfHoverCue.x = event.clientX;
  shelfHoverCue.y = event.clientY;
  shelfHoverCue.lastAt = performance.now();
}

function tickShelfHoverCue(deltaTime: number): number {
  if (!shelfHoverCue.guide && shelfHoverCue.zoneActive) {
    if (canShowShelfHoverCueAt({ clientX: shelfHoverCue.x, clientY: shelfHoverCue.y })) {
      if (performance.now() - shelfHoverCue.enteredAt > 260) shelfHoverCue.target = 1;
    } else {
      shelfHoverCue.zoneActive = false;
      shelfHoverCue.enteredAt = 0;
      shelfHoverCue.target = 0;
    }
  }
  if (!shelfHoverCue.guide && !shelfHoverCue.zoneActive && performance.now() - shelfHoverCue.lastAt > 650) {
    shelfHoverCue.target = 0;
  }
  const target = shelfHoverCue.guide ? 1 : shelfHoverCue.target;
  const rate = target > shelfHoverCue.value ? 0.12 : 0.10;
  shelfHoverCue.value += (target - shelfHoverCue.value) * Math.min(1, rate * Math.max(1, deltaTime * 60));
  if (shelfHoverCue.value < 0.006 && !target) shelfHoverCue.value = 0;
  return shelfHoverCue.value;
}
