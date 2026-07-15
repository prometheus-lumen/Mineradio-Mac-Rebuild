const FREE_CAMERA_KEY_PATTERN = /^(KeyW|KeyA|KeyS|KeyD|KeyQ|KeyE|Space|ShiftLeft|ShiftRight|ControlLeft|ControlRight)$/;

function handleShelfKeyboard(event: KeyboardEvent): void {
  if (isTypingTarget(event.target)) return;
  markRenderInteraction('keyboard', 700);
  if (event.code === 'KeyK') {
    event.preventDefault();
    if (freeCamera && (freeCamera.active || freeCamera.locked)) resetFreeCameraToDefault();
    else {
      recenterCamera();
      showToast('镜头已回正');
    }
    return;
  }
  if (event.code === 'KeyR') {
    if (event.repeat) return;
    event.preventDefault();
    toggleFreeCamera();
    return;
  }
  if (freeCamera?.active && FREE_CAMERA_KEY_PATTERN.test(event.code)) {
    event.preventDefault();
    event.stopImmediatePropagation();
    freeCamera.keys[event.code] = true;
    return;
  }
  if (!shelfManager) return;
  if (event.code === 'BracketRight' || event.code === 'PageDown') shelfManager.next?.();
  else if (event.code === 'BracketLeft' || event.code === 'PageUp') shelfManager.prev?.();
}

function handleShelfKeyboardRelease(event: KeyboardEvent): void {
  if (freeCamera?.keys && FREE_CAMERA_KEY_PATTERN.test(event.code)) freeCamera.keys[event.code] = false;
}

function clearFreeCameraKeys(): void {
  if (freeCamera?.keys) freeCamera.keys = {};
}
