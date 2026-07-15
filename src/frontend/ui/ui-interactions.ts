function handleUserFxArchiveRenameKey(event: KeyboardEvent, index: number): void {
  if (event.key === 'Enter') {
    event.preventDefault();
    commitUserFxArchiveRename(index);
  } else if (event.key === 'Escape') {
    event.preventDefault();
    cancelUserFxArchiveRename();
  }
}

function handleLyricGlowRowClick(event: MouseEvent): void {
  if (fx.lyricGlowLinked === false) return;
  event.preventDefault();
  setLyricGlowLinked(false, true);
}

function handleConfiguredLocalHotkey(event: KeyboardEvent): boolean {
  if (!hotkeySettings.local || isTypingTarget(event.target)) return false;
  var hotkeyModal = document.getElementById('hotkey-modal');
  if (hotkeyCaptureState || hotkeyModal?.classList.contains('show')) return false;
  if (freeCamera?.active && /^(KeyW|KeyA|KeyS|KeyD|KeyQ|KeyE|Space|ShiftLeft|ShiftRight|ControlLeft|ControlRight)$/.test(event.code)) return false;
  var combo = normalizeHotkeyEvent(event);
  if (!combo) return false;
  var duplicates = hotkeyDuplicateMap('local');
  for (var index = 0; index < HOTKEY_ACTIONS.length; index++) {
    var action = HOTKEY_ACTIONS[index];
    if (!action || hotkeySettings.local[action.key] !== combo) continue;
    event.preventDefault();
    event.stopPropagation();
    if (event.repeat && !action.key.startsWith('volume')) return true;
    if ((duplicates[combo] || 0) > 1) return true;
    executeHotkeyAction(action.key, 'local');
    return true;
  }
  return false;
}

function shouldHandleIdleGuidePointer(event: MouseEvent | WheelEvent): boolean {
  return !!idleGuideCanvas && shouldShowIdleGuide() && !isPointerOverUi(event);
}

function handleVisualGuideSurfaceClick(event: MouseEvent): void {
  if (!visualGuideActive) return;
  if (event.target instanceof Element && event.target.closest('button')) return;
  event.preventDefault();
  nextVisualGuideStep();
}

function startHeadTracking(): void {}

function stopHeadTracking(): void {}
