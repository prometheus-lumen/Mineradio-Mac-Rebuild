function scheduleQueueBeatPrefetch(
  fromIndex: number,
  delayMs?: number,
  state?: BeatPrefetchState
): void {
  cancelBeatPrefetchTimer();
  if (!playQueue.length || beatPrefetchBusy || localBeatAnalysis.active) return;
  const prefetchState = normalizeBeatPrefetchState(state);
  const prefetchLimit = beatPrefetchLimitForCurrentLoad();
  if (prefetchLimit <= 0 || prefetchState.count >= prefetchLimit) return;
  const token = beatMapToken;
  const sequence = ++beatPrefetchToken;
  const startIndex = Number.isFinite(fromIndex) ? fromIndex : currentIdx;
  const waitMs = beatPrefetchDelayForCurrentLoad(delayMs);
  beatPrefetchTimer = window.setTimeout(() => {
    beatPrefetchTimer = null;
    void runQueueBeatPrefetch(startIndex, token, sequence, prefetchState);
  }, waitMs);
}

async function waitForBeatPrefetchAvailability(token: number, sequence: number): Promise<void> {
  while (isRenderInteractionActive() && token === beatMapToken && sequence === beatPrefetchToken) {
    await yieldToIdle(isHiddenForBackgroundOptimization() ? 30 : 320);
  }
  while (beatMapBusy && token === beatMapToken && sequence === beatPrefetchToken) {
    await yieldToIdle(isHiddenForBackgroundOptimization() ? 30 : 240);
  }
}

async function runQueueBeatPrefetch(
  fromIndex: number,
  token: number,
  sequence: number,
  state?: BeatPrefetchState
): Promise<void> {
  if (token !== beatMapToken || sequence !== beatPrefetchToken || beatPrefetchBusy || !playQueue.length) return;
  if (audio?.paused) return;
  const prefetchState = normalizeBeatPrefetchState(state);
  const prefetchLimit = beatPrefetchLimitForCurrentLoad();
  if (prefetchLimit <= 0 || prefetchState.count >= prefetchLimit) return;
  const index = findNextBeatPrefetchIndex(fromIndex, prefetchState.keys);
  if (index < 0) return;
  const queuedSong = playQueue[index];
  if (!queuedSong) return;
  const song = hydrateCustomCover(queuedSong);
  const key = beatMapSongKey(song);
  if (!key) return;
  prefetchState.keys[key] = true;
  prefetchState.count += 1;
  beatPrefetchBusy = true;
  beatPrefetchLastKey = key;
  try {
    if (token !== beatMapToken || sequence !== beatPrefetchToken) return;
    const diskMap = await readBeatDiskCache(key);
    if (diskMap) {
      console.log('队列节奏磁盘缓存命中:', song.name || key, diskMap.visualBeatCount || 0);
      return;
    }
    const audioUrl = await fetchBeatPrefetchAudioUrl(song);
    if (token !== beatMapToken || sequence !== beatPrefetchToken || !audioUrl || beatMapCache[key]) return;
    await waitForBeatPrefetchAvailability(token, sequence);
    if (token !== beatMapToken || sequence !== beatPrefetchToken || beatMapCache[key]) return;
    const map = await analyzeAudioBeats(audioUrl, null, token, { background: true, prefetch: true, song });
    if (token !== beatMapToken || sequence !== beatPrefetchToken || !map) return;
    beatMapCache[key] = map;
    void writeBeatDiskCache(key, map, song, 'mr');
    console.log('队列节奏预热完成:', song.name || key, map.visualBeatCount || 0);
  } catch (error) {
    const message = error instanceof Error ? error.message : error;
    console.warn('queue beat prefetch failed:', message);
  } finally {
    beatPrefetchBusy = false;
    if (prefetchState.count < beatPrefetchLimitForCurrentLoad()
      && token === beatMapToken
      && sequence === beatPrefetchToken
      && playQueue.length
      && !audio?.paused) {
      scheduleQueueBeatPrefetch(index, 2600, prefetchState);
    }
  }
}
