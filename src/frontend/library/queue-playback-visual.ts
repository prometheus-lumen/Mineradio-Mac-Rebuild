async function prepareQueuePlaybackVisual(
  session: QueueTrackSession,
  sourceSession: QueuePlaybackSource
): Promise<void> {
  try {
    currentBeatMap = null;
    beatMapNextIdx = 0;
    resetAudioVisualState();
    resetBeatCameraSync(0);
    cancelBeatAnalysisTimer();
    const beatToken = ++beatMapToken;
    if (session.podcastDjMode) {
      preparePodcastQueueVisual(session, sourceSession.data.url);
      return;
    }
    await prepareMusicQueueVisual(session, sourceSession.proxyAudioUrl, beatToken);
  } catch (error) {
    console.warn('[PlaybackVisualPrep]', session.song.name, error);
    currentBeatMap = null;
    beatMapNextIdx = 0;
    safePlaybackStep('visual-prep-hide-chip', hideBeatChip);
  }
}

function preparePodcastQueueVisual(session: QueueTrackSession, sourceUrl: string): void {
  const djToken = ++djBeatMapToken;
  cancelDjBeatAnalysisTimer();
  resetDjBeatMapState();
  currentBeatMap = null;
  beatMapNextIdx = 0;
  const key = djSongKey(session.song);
  const cachedMap = djBeatMapCache[key];
  if (cachedMap) {
    currentDjBeatMap = cachedMap;
    applyPodcastDjProfileFromMap(cachedMap);
    syncPodcastDjMapCursor(audio?.currentTime || 0, true);
    hideBeatChip();
    notifyDesktopLyricsBeatMapReady();
    console.log('podcast DJ beatmap 缓存命中:', cachedMap.cameraBeats?.length || 0, '个主拍');
  } else {
    showBeatChip('DJ 离线锁拍准备中…');
    let durationSeconds = Math.max(0, Number(session.song.duration) || 0);
    if (durationSeconds > 10_000) durationSeconds /= 1000;
    schedulePodcastDjAnalysis(key, sourceUrl, djToken, durationSeconds);
  }
  maybeAnnounceDjMode();
}

async function prepareMusicQueueVisual(
  session: QueueTrackSession,
  proxyAudioUrl: string,
  beatToken: number
): Promise<void> {
  const key = session.beatMapKey;
  const memoryMap = key ? beatMapCache[key] : null;
  if (memoryMap) {
    applyQueueBeatMap(memoryMap, 'beatmap 缓存命中:');
    scheduleQueueBeatPrefetch(session.index, 2600);
    return;
  }
  const diskMap = key ? await readBeatDiskCache(key) : null;
  if (diskMap) {
    applyQueueBeatMap(diskMap, 'beatmap 磁盘缓存命中:');
    scheduleQueueBeatPrefetch(session.index, 2600);
    return;
  }
  scheduleBeatAnalysis(key || session.song.id || '', proxyAudioUrl, beatToken, session.song);
}

function applyQueueBeatMap(map: BeatMap, logLabel: string): void {
  currentBeatMap = map;
  applyCinemaProfileFromBeatMap(map);
  syncBeatMapPlaybackCursor(audio?.currentTime || 0);
  notifyDesktopLyricsBeatMapReady();
  console.log(logLabel, map.kicks?.length || 0, '个鼓点');
}
