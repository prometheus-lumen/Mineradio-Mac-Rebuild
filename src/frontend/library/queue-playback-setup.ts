function prepareQueueTrackSession(
  index: number,
  options: PlayQueueOptions,
  markPhase: (phase: string) => void
): QueueTrackSession {
  markPhase('session-finalize');
  safePlaybackStep('session-finalize', () => finalizeListenSession(false));
  homeForcedOpen = false;
  if (!options.preserveHomeState) homeSuppressed = false;
  currentIdx = index;
  trackSwitchToken += 1;
  markPhase('cancel-previous-track');
  cancelBeatAnalysisTimer();
  cancelBeatPrefetchTimer();
  if (localBeatAnalysis.active) cancelLocalBeatAnalysis();
  closeGsapModal(document.getElementById('local-beat-modal'));
  beatMapToken += 1;
  const token = trackSwitchToken;
  const firstVisualPlay = !firstPlayDone;
  markPhase('track-setup');
  const queuedSong = playQueue[index];
  if (!queuedSong) throw new Error('播放队列项目不存在');
  const song = safePlaybackStep('hydrate-song', () => hydrateCustomCover(queuedSong)) || queuedSong;
  playQueue[index] = song;
  const context = options.context || song.radioContext || null;
  activeRadioContext = context;
  safeRenderQueuePanel('play-queue-at-switch', { scrollCurrent: miniQueueOpen });
  safePlaybackStep('shelf-preview-suppress', suppressShelfPreviewForPlaybackSwitch);
  pauseCurrentAudioForTrackSwitch();
  releaseCurrentLocalAudioUrl();
  const beatMapKey = safePlaybackStep('beatmap-key', () => beatMapSongKey(song)) || '';
  const podcastDjMode = Boolean(safePlaybackStep('podcast-mode', () => isPodcastSong(song)));
  safePlaybackStep('dj-mode', () => setDjModeActive(podcastDjMode, song));
  safePlaybackStep('visual-switch', switchPlaybackVisualToEmily);
  currentLocalSong = null;
  safePlaybackStep('cover-button', updateCustomCoverButton);
  safePlaybackStep('background-media', updateCustomBackgroundControls);
  safePlaybackStep('like-buttons', () => updateLikeButtons(song));
  safePlaybackStep('like-status', () => syncLikeStatusForSong(song));
  safePlaybackStep('cinema-track-profile', () => resetCinemaTrackProfile(song));
  safePlaybackStep('empty-home', () => {
    if (!options.preserveHomeState) updateEmptyHomeVisibility();
  });
  safePlaybackStep('track-ui', () => updateQueueTrackUi(song));
  markPhase('lyric-prep');
  safePlaybackStep('lyric-prep', resetQueueLyrics);
  markPhase('cover-load');
  safePlaybackStep('cover-load', () => loadVisualCoverForSong(song, {
    trackToken: token,
    deferHeavy: true,
    delay: firstVisualPlay ? 380 : 680,
    timeout: firstVisualPlay ? 1400 : 1900
  }));
  document.getElementById('trial-banner')?.classList.remove('show');
  safePlaybackStep('show-loading', showLoading);
  lyricSunEnergy = 0;
  lyricSunTarget = 0;
  lyricSunHold = 0;
  lyricSunAvg = 0;
  lyricSunPeak = 0.55;
  if (firstVisualPlay) {
    safePlaybackStep('first-visual-alpha', () => {
      firstPlayDone = true;
      tweenParticleAlpha(uniforms.uAlpha.value || 0, 1, 220);
    });
  }
  return { index, token, song, context, beatMapKey, podcastDjMode, firstVisualPlay };
}

function updateQueueTrackUi(song: PlaylistSong): void {
  document.getElementById('hint')?.classList.add('hidden');
  const title = document.getElementById('thumb-title');
  const artist = document.getElementById('thumb-artist');
  if (title) title.textContent = song.name || '';
  if (artist) artist.textContent = song.artist || '';
  updateControlTrackInfo(song);
  document.getElementById('thumb-wrap')?.classList.add('visible');
}

function resetQueueLyrics(): void {
  const initialLines = withLyricFallback([]);
  setOriginalLyricsState(initialLines, false, 'fallback');
  applyPreferredLyricsForCurrent(true);
}
