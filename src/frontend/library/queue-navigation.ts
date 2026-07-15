function nextTrack(): void {
  if (!playQueue.length) return;
  playToggleBusy = false;
  forcePlaybackControlsInteractive();
  currentIdx = playMode === 'shuffle'
    ? Math.floor(Math.random() * playQueue.length)
    : (currentIdx + 1) % playQueue.length;
  void playQueueAt(currentIdx).finally(forcePlaybackControlsInteractive);
}

function prevTrack(): void {
  if (!playQueue.length) return;
  playToggleBusy = false;
  forcePlaybackControlsInteractive();
  currentIdx = (currentIdx - 1 + playQueue.length) % playQueue.length;
  void playQueueAt(currentIdx).finally(forcePlaybackControlsInteractive);
}

function shuffleQueue(): void {
  for (let index = playQueue.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [playQueue[index], playQueue[swapIndex]] = [playQueue[swapIndex], playQueue[index]];
  }
  currentIdx = 0;
  safeRenderQueuePanel('shuffle-queue');
  showToast('队列已随机');
  safeShelfRebuild('shuffle-queue');
}

function clearQueue(): void {
  playQueue = [];
  currentIdx = -1;
  safeRenderQueuePanel('clear-queue');
  safeShelfRebuild('clear-queue');
  updateCustomCoverButton();
  updateCustomLyricControls();
  updateEmptyHomeVisibility({ forceLoad: false });
}

function removeFromQueue(index: number): void {
  if (index < 0 || index >= playQueue.length) return;
  playQueue.splice(index, 1);
  if (currentIdx >= playQueue.length) currentIdx = playQueue.length - 1;
  safeRenderQueuePanel('remove-queue-item');
  safeShelfRebuild('remove-queue-item');
  updateCustomCoverButton();
  updateCustomLyricControls();
  updateEmptyHomeVisibility({ forceLoad: false });
}

function playModeLabel(mode: PlayMode): string {
  return { loop: '顺序循环', shuffle: '随机播放', single: '单曲循环' }[mode];
}

function playModeIconMarkup(mode: PlayMode): string {
  if (mode === 'shuffle') {
    return '<path d="M16 3h5v5"/><path d="M4 20 21 3"/><path d="M21 16v5h-5"/><path d="M15 15l6 6"/><path d="M4 4l5 5"/>';
  }
  if (mode === 'single') {
    return '<path d="M17 2l4 4-4 4"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><path d="M7 22l-4-4 4-4"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/><path d="M12 9v6"/><path d="M10.5 10.5 12 9l1.5 1.5"/>';
  }
  return '<path d="M17 2l4 4-4 4"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><path d="M7 22l-4-4 4-4"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/>';
}

function updatePlayModeButton(animate = false): void {
  const label = playModeLabel(playMode);
  const chip = document.getElementById('play-mode-chip');
  const button = document.getElementById('play-mode-btn');
  const icon = document.getElementById('play-mode-icon');
  if (chip) chip.textContent = label;
  if (button) {
    button.dataset.mode = playMode;
    button.title = label;
    button.setAttribute('aria-label', label);
    button.classList.toggle('active', playMode !== 'loop');
  }
  if (icon) icon.innerHTML = playModeIconMarkup(playMode);
  if (!animate || !button) return;
  if (window.gsap) {
    window.gsap.killTweensOf(button);
    if (icon) window.gsap.killTweensOf(icon);
    window.gsap.timeline({ defaults: { overwrite: true } })
      .fromTo(button, { scale: 0.86, rotate: -8 }, { scale: 1.12, rotate: 4, duration: 0.16, ease: 'power2.out' })
      .to(button, { scale: 1, rotate: 0, duration: 0.34, ease: 'back.out(2.1)' });
    window.gsap.fromTo(button,
      { boxShadow: '0 0 0 0 rgba(255,63,85,.36)' },
      { boxShadow: '0 0 0 14px rgba(255,63,85,0)', duration: 0.58, ease: 'sine.out', overwrite: false,
        onComplete: () => window.gsap?.set(button, { clearProps: 'boxShadow' }) });
    if (icon) window.gsap.fromTo(icon, { y: 4, autoAlpha: 0.32, rotate: -22, scale: 0.74 },
      { y: 0, autoAlpha: 1, rotate: 0, scale: 1, duration: 0.42, ease: 'expo.out', overwrite: true });
  } else {
    button.classList.remove('mode-switching');
    void button.offsetWidth;
    button.classList.add('mode-switching');
    window.setTimeout(() => button.classList.remove('mode-switching'), 460);
  }
}

function cyclePlayMode(): void {
  const modes: PlayMode[] = ['loop', 'shuffle', 'single'];
  const index = modes.indexOf(playMode);
  playMode = modes[(index + 1) % modes.length] || 'loop';
  updatePlayModeButton(true);
  showToast(`播放模式: ${playModeLabel(playMode)}`);
}
