function updateImmersiveButton(): void {
  var button = document.getElementById('immersive-btn');
  if (!button) return;
  button.classList.toggle('active', immersiveMode);
  button.setAttribute('aria-pressed', immersiveMode ? 'true' : 'false');
  button.title = immersiveMode ? '退出全沉浸式' : '全沉浸式';
  button.setAttribute('aria-label', button.title);
}

function closeImmersiveInterference(): void {
  closeMiniQueue();
  toggleFxPanel(false);
  closeUploadTip(false);
  closeLoginModal();
  closeUserModal();
  closeCollectModal();
  closeCoverCropModal();
  closeCustomLyricModal();
  closeTrackDetailModal();
  if (!localBeatAnalysis.active) closeLocalBeatModal();
  ['search-area', 'fx-panel', 'trial-banner', 'ai-depth-chip', 'beat-chip'].forEach(function(id): void {
    document.getElementById(id)?.classList.remove('peek', 'show', 'closing');
  });
  document.getElementById('fx-fab')?.classList.remove('active');
  document.body.classList.remove('login-guide-active');
  setFocusZone(null, true);
}

function setImmersiveMode(enabled: boolean): void {
  if (immersiveMode === enabled) return;
  if (enabled) enterImmersiveMode();
  else exitImmersiveMode();
}

function enterImmersiveMode(): void {
  immersiveState = {
    shelfMode: fx.shelf,
    shelfPinnedOpen: shelfPinnedOpen,
    lyrics: fx.particleLyrics,
    controlsAutoHide: controlsAutoHide,
    bottomVisible: !!document.getElementById('bottom-bar')?.classList.contains('visible')
  };
  immersiveMode = true;
  document.body.classList.add('immersive-mode');
  document.getElementById('bottom-bar')?.classList.add('visible');
  closeImmersiveInterference();
  if (!fx.particleLyrics) setParticleLyricsSilently(true);
  controlsAutoHide = true;
  syncControlsAutoHideButton();
  updateImmersiveButton();
  syncCursorAutoHideMode();
  revealBottomControls(720);
  setTimeout(function(): void {
    if (immersiveMode && !controlsHovering) setControlsHidden(true);
  }, 980);
}

function exitImmersiveMode(): void {
  immersiveMode = false;
  document.body.classList.remove('immersive-mode');
  closeMiniQueue();
  if (immersiveState.shelfMode) setShelfMode(immersiveState.shelfMode);
  if (immersiveState.shelfMode === 'side' && immersiveState.shelfPinnedOpen) setShelfPinnedOpen(true, true);
  else setShelfPinnedOpen(false, true);
  if (!immersiveState.lyrics) setParticleLyricsSilently(false);
  controlsAutoHide = immersiveState.controlsAutoHide !== false;
  syncControlsAutoHideButton();
  updateImmersiveButton();
  syncCursorAutoHideMode();
  var bottomBar = document.getElementById('bottom-bar');
  if (immersiveState.bottomVisible) revealBottomControls(900);
  else bottomBar?.classList.remove('visible', 'soft-hidden');
  showToast('已退出全沉浸式');
}

function toggleImmersiveMode(): void {
  setImmersiveMode(!immersiveMode);
}
