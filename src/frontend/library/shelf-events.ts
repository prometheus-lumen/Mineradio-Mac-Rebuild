function __mineradioInitLibraryShelfInteractions37(): void {
  renderer.domElement.addEventListener('click', handleShelfCanvasClick);
  renderer.domElement.addEventListener('contextmenu', handleShelfContextMenu);
  wheelOverShelf = false;
  shelfWheelState = { shelfAcc: 0, detailAcc: 0, shelfStepAt: 0, detailStepAt: 0, lastAt: 0 };
  renderer.domElement.addEventListener('wheel', handleShelfWheel, { passive: false, capture: true });
  document.addEventListener('keydown', (event) => consumeFreeCameraKeyEvent(event, true), true);
  document.addEventListener('keyup', (event) => consumeFreeCameraKeyEvent(event, false), true);
  document.addEventListener('keydown', handleShelfKeyboard);
  document.addEventListener('keyup', handleShelfKeyboardRelease);
  window.addEventListener('blur', clearFreeCameraKeys);
}
