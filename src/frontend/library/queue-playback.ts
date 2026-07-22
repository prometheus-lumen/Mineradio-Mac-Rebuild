async function playQueueAt(index: number, options: PlayQueueOptions = {}): Promise<void> {
  if (index < 0 || index >= playQueue.length) return;
  if (navigator.userActivation?.isActive) options.manual = true;
  if (options.manual) primeAudioForUserGesture();
  else if (audioGesturePrimeActive) clearAudioGesturePrime();
  markRenderInteraction('track-switch', 1500);
  let phase = 'start';
  let session: QueueTrackSession | null = null;
  try {
    session = prepareQueueTrackSession(index, options, (nextPhase) => { phase = nextPhase; });
    phase = 'source-url';
    const sourceSession = await resolveQueuePlaybackSource(session, options);
    if (!sourceSession) { clearAudioGesturePrime(); return; }
    phase = 'visual-prep';
    await prepareQueuePlaybackVisual(session, sourceSession);
    phase = 'audio-start';
    const started = await (sourceSession.earlyPlayback || playAudio({ silent: sourceSession.isQQ, manual: !!options.manual }));
    if (!started) {
      await handleQueuePlaybackStartFailure(session, sourceSession, options);
      return;
    }
    finishQueuePlaybackStart(session, () => { phase = 'session-begin'; });
  } catch (error) {
    handleQueuePlaybackError(error, phase, index, session?.token, options);
  }
}

async function handleQueuePlaybackStartFailure(
  session: QueueTrackSession,
  sourceSession: QueuePlaybackSource,
  options: PlayQueueOptions
): Promise<void> {
  const { song, index, token } = session;
  const { data, requestedQuality, isQQ, isKugou } = sourceSession;
  if (isQQ && await retryQQPlaybackWithCompatibleQuality(song, index, token, options, data, requestedQuality)) return;
  if (isKugou && !options.kugouPlaybackRetried && token === trackSwitchToken) {
    showSourceFallbackNotice('酷狗播放地址同步中', '首次启动未完成，正在自动重试。');
    await waitForKugouSync(700);
    if (token === trackSwitchToken) {
      await playQueueAt(index, { ...options, kugouPlaybackRetried: true });
    }
    return;
  }
  forcePlaybackControlsInteractive();
  if (options.manual) showToast('播放启动失败，请重新选择歌曲');
  else showSourceFallbackNotice('歌曲已载入', '点击播放器中间的播放按钮继续播放。');
}

function finishQueuePlaybackStart(session: QueueTrackSession, markSessionPhase: () => void): void {
  forcePlaybackControlsInteractive();
  markSessionPhase();
  safePlaybackStep('listen-session-begin', () => beginListenSession(session.song, session.context));
  if (session.song.type === 'podcast') {
    safePlaybackStep('podcast-lyrics', resetQueueLyrics);
  } else if (session.song.type !== 'local') {
    void fetchLyric(session.song, session.token);
  }
  safeRenderQueuePanel('play-queue-at');
  scheduleShelfRebuild('play-queue-at', true);
  safePlaybackStep('shelf-preview-suppress-end', suppressShelfPreviewForPlaybackSwitch);
}

function handleQueuePlaybackError(
  error: unknown,
  phase: string,
  index: number,
  token: number | undefined,
  options: PlayQueueOptions
): void {
  clearAudioGesturePrime();
  console.error('Play failed:', { phase, error }, error);
  hideLoading();
  forcePlaybackControlsInteractive();
  if (!isPlaybackRecursionError(error)
    && token !== undefined
    && token === trackSwitchToken
    && !options.manual
    && playQueue.length > 1) {
    skipFailedQueueItem(index, token, '当前歌曲加载失败，正在尝试队列里的下一首。');
    return;
  }
  showToast(playbackFailureToastText(error));
}
