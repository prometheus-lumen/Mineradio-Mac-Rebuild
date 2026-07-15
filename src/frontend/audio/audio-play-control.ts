function pauseCurrentAudioForTrackSwitch(): void {
  playToggleBusy = false;
  if (!audio) return;
  if (audioGesturePrimeActive) {
    playing = false;
    setPlayIcon(false);
    return;
  }
  try {
    audioFadeSerial++;
    clearAudioFadeTimers();
    audio.onended = null;
    audio.pause();
  } catch (error) {}
  playing = false;
  setPlayIcon(false);
  syncPlaybackStateFromAudioEvent('track-switch');
}

function syncPlaybackStateFromAudioEvent(reason: string): void {
  var active = !!audio?.src && !audio.paused && !audio.ended;
  playing = active;
  setPlayIcon(active);
  if (!active) hideLoading();
  if (reason === 'play' || reason === 'playing') switchPlaybackVisualToEmily();
  forcePlaybackControlsInteractive();
}

function isPlaybackRecursionError(error: unknown): boolean {
  var message = error instanceof Error ? error.message : String(error || '');
  return error instanceof RangeError || /maximum call stack size exceeded/i.test(message);
}

function safePlaybackStep<T>(label: string, task: () => T): T | null {
  try { return task(); }
  catch (error) { console.warn('[PlaybackSetupStep]', label, error); return null; }
}

function playbackFailureToastText(error: unknown): string {
  if (isPlaybackRecursionError(error)) return '播放准备异常，已保持播放器可操作';
  return '播放失败: ' + (error instanceof Error ? error.message : String(error));
}

function scheduleAudioResumePosition(media: HTMLAudioElement, seconds: number, token: number): void {
  var targetSeconds = Math.max(0, Number(seconds) || 0);
  if (targetSeconds < 0.35) return;
  var applied = false;
  function applyResume(): void {
    if (applied || token !== trackSwitchToken) return;
    var duration = Number(media.duration) || 0;
    var target = duration > 0 ? Math.min(targetSeconds, Math.max(0, duration - 0.45)) : targetSeconds;
    try {
      media.currentTime = target;
      applied = true;
      syncBeatMapPlaybackCursor(target, true);
      syncPodcastDjMapCursor(target, true);
      updatePlaybackProgressUi();
    } catch (error) {}
  }
  media.addEventListener('loadedmetadata', applyResume, { once: true });
  media.addEventListener('canplay', applyResume, { once: true });
  setTimeout(applyResume, 520);
  applyResume();
}

async function attemptAudioPlay(options: PlaybackAttemptOptions = {}): Promise<boolean> {
  try {
    if (!audio) return false;
    var media = audio;
    if (!audioReady) initAudio();
    if (options.fade !== false) preparePlaybackFadeIn();
    if (options.manual) {
      var playRequest = media.play();
      await resumeAudioAnalysis();
      await playRequest;
    } else {
      await resumeAudioAnalysis();
      await media.play();
    }
    if (audioGesturePrimeActive) {
      audioGesturePrimeActive = false;
      media.loop = false;
      media.muted = false;
    }
    await resumeAudioAnalysis();
    switchPlaybackVisualToEmily();
    playing = true;
    setPlayIcon(true);
    if (options.fade !== false) startPlaybackFadeIn(); else restorePlaybackGain();
    forcePlaybackControlsInteractive();
    hideLoading();
    return true;
  } catch (error) {
    return handleAudioPlayFailure(error, options);
  }
}

async function handleAudioPlayFailure(error: unknown, options: PlaybackAttemptOptions): Promise<boolean> {
  var mediaError = audio?.error || null;
  if (options.manual && !options.transientRetry && error instanceof Error && error.name === 'AbortError'
    && audio && await waitForAudioCanPlay(audio, 900)) {
    return attemptAudioPlay({ manual: true, silent: options.silent, fade: false, transientRetry: true });
  }
  clearAudioGesturePrime();
  console.warn('Audio play failed:', {
    name: error instanceof Error ? error.name : '', message: error instanceof Error ? error.message : String(error),
    mediaCode: mediaError?.code, mediaMessage: mediaError?.message
  });
  restorePlaybackGain();
  playing = false;
  setPlayIcon(false);
  hideLoading();
  forcePlaybackControlsInteractive();
  if (!options.silent) showToast(audioPlaybackFailureMessage(error, mediaError, !!options.manual));
  return false;
}

function waitForAudioCanPlay(media: HTMLAudioElement, timeoutMs = 900): Promise<boolean> {
  return new Promise(function(resolve): void {
    if (media.readyState >= 2) { resolve(true); return; }
    var settled = false;
    var timer: ReturnType<typeof setTimeout> | null = null;
    function finish(ready: boolean): void {
      if (settled) return;
      settled = true;
      if (timer) clearTimeout(timer);
      media.removeEventListener('canplay', onCanPlay);
      media.removeEventListener('error', onError);
      resolve(ready);
    }
    function onCanPlay(): void { finish(true); }
    function onError(): void { finish(false); }
    media.addEventListener('canplay', onCanPlay, { once: true });
    media.addEventListener('error', onError, { once: true });
    timer = setTimeout(function(): void { finish(media.readyState >= 2); }, Math.max(120, timeoutMs));
  });
}

function audioPlaybackFailureMessage(error: unknown, mediaError: MediaError | null, manual: boolean): string {
  var name = error instanceof Error ? error.name : '';
  var code = mediaError?.code || 0;
  if (name === 'NotAllowedError') return manual ? '系统仍未允许播放，请再点击一次播放按钮' : '播放被系统拦截，请点击播放按钮';
  if (code === MediaError.MEDIA_ERR_NETWORK) return '音频地址连接失败，请稍后重试';
  if (code === MediaError.MEDIA_ERR_DECODE) return '音频解码失败，请尝试其他音质';
  if (code === MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED || name === 'NotSupportedError') return '当前音频格式或地址不可用';
  return manual ? '播放启动失败，请重新选择歌曲' : '歌曲已载入，请点击播放按钮';
}

async function playAudio(options: PlaybackAttemptOptions = {}): Promise<boolean> {
  return attemptAudioPlay({ manual: !!options.manual, silent: !!options.silent });
}

async function togglePlay(): Promise<void> {
  if (playToggleBusy) return;
  playToggleBusy = true;
  try {
    forcePlaybackControlsInteractive();
    if ((!audio || !audio.src) && playQueue.length && currentIdx >= 0) {
      await playQueueAt(currentIdx, { manual: true });
      return;
    }
    if (!audio) return;
    if (audio.paused || audio.ended) await attemptAudioPlay({ manual: true });
    else await pausePlaybackFromToggle();
  } catch (error) {
    console.warn('[TogglePlay]', error);
    playing = !!audio && !audio.paused;
    setPlayIcon(playing);
    hideLoading();
    forcePlaybackControlsInteractive();
    if (!audio?.src) showToast('播放控制失败');
  } finally {
    playToggleBusy = false;
  }
}

async function pausePlaybackFromToggle(): Promise<void> {
  var paused = await fadeOutAndPauseAudio();
  if (!paused && audio && !audio.paused) return;
  playing = false;
  setPlayIcon(false);
  hideLoading();
  safePlaybackStep('listen-stats-pause', function(): void { updateListenStatsTick(true); });
  forcePlaybackControlsInteractive();
  safePlaybackStep('sync-pause-state', function(): void { syncPlaybackStateFromAudioEvent('manual-pause'); });
  safePlaybackStep('pause-controls-hide', function(): void { scheduleControlsHide(520); });
}
