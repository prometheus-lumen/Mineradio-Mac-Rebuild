function wakeBottomHandle(duration = 2000): void {
  document.body.classList.add('controls-handle-awake');
  if (controlsHandleDimTimer) clearTimeout(controlsHandleDimTimer);
  controlsHandleDimTimer = setTimeout(function(): void {
    controlsHandleDimTimer = null;
    document.body.classList.remove('controls-handle-awake');
  }, duration);
}

function toggleBottomControlsFromHandle(): void {
  var bar = document.getElementById('bottom-bar');
  if (!bar || document.body.classList.contains('home-controls-locked')) return;
  if (isBottomControlsSuppressedForShelf()) return;
  revealBottomControls(900);
}

function primeAudioForUserGesture(): boolean {
  try {
    if (audioGesturePrimeActive && audio && !audio.paused) return true;
    if (!audio) {
      audio = new Audio();
      audio.crossOrigin = 'anonymous';
    }
    audio.pause();
    audio.muted = true;
    audio.loop = true;
    audio.src = AUDIO_GESTURE_PRIME_SRC;
    audioGesturePrimeActive = true;
    if (!audioReady) initAudio();
    void resumeAudioAnalysis();
    void audio.play().catch(function(): void {});
    return true;
  } catch (error) {
    return false;
  }
}

function clearAudioGesturePrime(): void {
  if (!audioGesturePrimeActive || !audio) return;
  audioGesturePrimeActive = false;
  try {
    audio.loop = false;
    audio.pause();
    audio.removeAttribute('src');
    audio.load();
    audio.muted = false;
  } catch (error) {}
}
