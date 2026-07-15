function handleChromeKeydown(event: KeyboardEvent): void {
  if (isTypingTarget(event.target)) return;
  if (handleConfiguredLocalHotkey(event) || shouldSuppressDefaultConfiguredHotkey(event)) return;
  switch (event.code) {
    case 'Space':
      event.preventDefault();
      if (!freeCamera?.active) togglePlay();
      break;
    case 'Home': event.preventDefault(); goHome(); break;
    case 'ArrowUp': event.preventDefault(); adjustVolumeByKeyboard(0.05); break;
    case 'ArrowDown': event.preventDefault(); adjustVolumeByKeyboard(-0.05); break;
    case 'ArrowRight': nextTrack(); break;
    case 'ArrowLeft': prevTrack(); break;
    case 'Escape': handleChromeEscape(event); break;
    case 'KeyL': if (!immersiveMode) toggleLyricsPanel(); break;
    case 'KeyP':
      if (!immersiveMode && diyPlayerMode) toggleFxPanel();
      else if (!immersiveMode) showToast('开启 DIY 玩家模式后可打开视觉控制台');
      break;
    case 'KeyI': toggleImmersiveMode(); break;
    case 'KeyF': toggleFullscreen(); break;
  }
}

function handleChromeEscape(event: KeyboardEvent): void {
  if (immersiveMode) {
    event.preventDefault();
    setImmersiveMode(false);
    return;
  }
  if (window.desktopWindow?.isDesktop && desktopFullscreenActive && !document.fullscreenElement && window.desktopWindow.exitFullscreenWindowed) {
    event.preventDefault();
    window.desktopWindow.exitFullscreenWindowed();
    return;
  }
  if (document.fullscreenElement) {
    event.preventDefault();
    void document.exitFullscreen();
    return;
  }
  if (closeVisibleChromeModal(event)) return;
  if (miniQueueOpen) {
    closeMiniQueue();
    return;
  }
  if (shelfManager?.hasOpenContent?.()) {
    safeShelfCloseContent('escape-key');
    return;
  }
  closeLoginModal();
  closeUserModal();
  toggleFxPanel(false);
  togglePlaylistPanel(false);
}

function closeVisibleChromeModal(event: KeyboardEvent): boolean {
  if (document.getElementById('local-beat-modal')?.classList.contains('show')) {
    event.preventDefault();
    if (localBeatAnalysis.active) cancelLocalBeatAnalysis();
    else closeLocalBeatModal();
    return true;
  }
  if (document.getElementById('custom-lyric-modal')?.classList.contains('show')) {
    event.preventDefault();
    closeCustomLyricModal();
    return true;
  }
  if (document.getElementById('track-detail-modal')?.classList.contains('show')) {
    event.preventDefault();
    closeTrackDetailModal();
    return true;
  }
  return false;
}
