function safeRenderQueuePanel(reason: string, options: QueueRenderOptions = {}): boolean {
  if (!isPlaylistPanelVisibleForRender() && options.deferWhenHidden !== false) {
    queuePanelDirty = true;
    return true;
  }
  try {
    renderQueuePanel(options);
    queuePanelDirty = false;
    return true;
  } catch (error) {
    console.warn('[QueuePanelRender]', reason || 'unknown', error);
    return false;
  }
}

function flushDeferredQueuePanel(reason?: string): void {
  if (!queuePanelDirty) return;
  safeRenderQueuePanel(reason || 'flush-deferred-queue', {
    animate: false,
    scrollCurrent: miniQueueOpen,
    deferWhenHidden: false
  });
}

function queueItemKey(song?: PlaylistSong | null): string {
  if (!song) return '';
  if (song.provider === 'qq' || song.source === 'qq' || song.type === 'qq') {
    return `qq:${String(song.mid || song.songmid || song.id || `${song.name}|${song.artist}`)}`;
  }
  if (song.provider === 'kugou' || song.source === 'kugou' || song.type === 'kugou') {
    return `kugou:${String(song.hash || song.id || `${song.name}|${song.artist}`)}`;
  }
  if (song.type === 'podcast' && song.programId) return `podcast:${String(song.programId)}`;
  if (song.localKey) return `local:${song.localKey}`;
  if (song.id != null && song.id !== '') return `song:${String(song.id)}`;
  return `${String(song.name || '')}|${String(song.artist || '')}`;
}

function queueSong(song: PlaylistSong | null | undefined, options: QueueInsertOptions = {}): number {
  if (!song) return -1;
  let cloned = cloneSong(song);
  let insertAt = playQueue.length;
  if (options.position === 'next') {
    const key = queueItemKey(cloned);
    const existing = key ? playQueue.findIndex((item) => queueItemKey(item) === key) : -1;
    if (existing === currentIdx) return currentIdx;
    if (existing >= 0) {
      const [existingSong] = playQueue.splice(existing, 1);
      if (existingSong) cloned = existingSong;
      if (currentIdx >= 0 && existing < currentIdx) currentIdx -= 1;
    }
    const hasCurrent = currentIdx >= 0 && currentIdx < playQueue.length;
    insertAt = hasCurrent ? Math.min(playQueue.length, currentIdx + 1) : playQueue.length;
    playQueue.splice(insertAt, 0, cloned);
  } else {
    playQueue.push(cloned);
    insertAt = playQueue.length - 1;
  }
  safeRenderQueuePanel('queue-song');
  safeShelfRebuild('queue-song');
  persistManagedQueue();
  return insertAt;
}

function queueSongNext(song: PlaylistSong): number {
  return queueSong(song, { position: 'next' });
}

function queueDetailSongNext(song?: PlaylistSong | null): void {
  if (!song || song.type === 'podcast-radio') return;
  queueSongNext(song);
  showToast(`已设为下一首: ${song.name || ''}`);
}

function queueIndexNext(index: number): void {
  const normalizedIndex = Number(index);
  if (!Number.isFinite(normalizedIndex) || normalizedIndex < 0 || normalizedIndex >= playQueue.length) return;
  const song = playQueue[normalizedIndex];
  if (!song) return;
  queueSongNext(song);
  showToast(`已设为下一首: ${song.name || ''}`);
}

function openQueueArtist(index: number): void {
  const song = playQueue[index];
  if (song) openArtistDetailForSong(song);
}

function moveQueueIndexToTop(index: number): number {
  const normalizedIndex = Number(index);
  if (!Number.isFinite(normalizedIndex) || normalizedIndex < 0 || normalizedIndex >= playQueue.length) return -1;
  if (normalizedIndex === 0) return 0;
  const [item] = playQueue.splice(normalizedIndex, 1);
  if (!item) return -1;
  playQueue.unshift(item);
  if (currentIdx === normalizedIndex) currentIdx = 0;
  else if (currentIdx >= 0 && currentIdx < normalizedIndex) currentIdx += 1;
  return 0;
}

function markQueueItemPlaybackFailed(index: number): void {
  const song = playQueue[index];
  if (song) song._lastPlaybackFailAt = Date.now();
}

function nextUnblockedQueueIndex(index: number): number {
  const now = Date.now();
  for (let step = 1; step < playQueue.length; step += 1) {
    const nextIndex = (index + step) % playQueue.length;
    const failedAt = Number(playQueue[nextIndex]?._lastPlaybackFailAt) || 0;
    if (!failedAt || now - failedAt > 18_000) return nextIndex;
  }
  return -1;
}

function skipFailedQueueItem(index: number, token: number, message?: string): void {
  hideLoading();
  if (token !== trackSwitchToken) return;
  markQueueItemPlaybackFailed(index);
  if (playQueue.length <= 1) {
    showSourceFallbackNotice('没有可跳过的下一首', message || '当前歌曲不可播放，队列里没有其他歌曲。');
    return;
  }
  const nextIndex = nextUnblockedQueueIndex(index);
  if (nextIndex < 0) {
    showSourceFallbackNotice('队列暂时没有可播歌曲', '已尝试绕开受限歌曲，当前队列没有新的可播放项。');
    return;
  }
  showSourceFallbackNotice('已跳过受限歌曲', message || '未找到同名同歌手的另一个平台版本，正在播放下一首。');
  currentIdx = nextIndex;
  void playQueueAt(nextIndex, { fallbackDepth: 0 });
}
