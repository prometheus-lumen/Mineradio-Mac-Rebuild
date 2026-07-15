function getLocalBeatEntry(localKey: string, mode: LocalBeatMode): BeatMap | null {
  return localBeatMapCache[localKey]?.[mode] || null;
}

function storeLocalBeatEntry(
  localKey: string,
  mode: LocalBeatMode,
  map: BeatMap,
  song: PlaylistSong,
  options: { skipDisk?: boolean } = {}
): void {
  if (!localKey || !map) return;
  var entry = localBeatMapCache[localKey] || { updatedAt: 0 };
  entry[mode] = map;
  entry.updatedAt = Date.now();
  localBeatMapCache[localKey] = entry;
  localBeatMapPrefs[localKey] = mode;
  saveLocalBeatPrefs();
  saveLocalBeatMapCache();
  if (!options.skipDisk) void writeBeatDiskCache(localBeatDiskKey(localKey, mode), map, song, mode);
}

function setLocalBeatStatus(text: string, tone: string): void {
  var element = document.getElementById('local-beat-status');
  if (!element) return;
  element.textContent = text;
  element.classList.toggle('warn', tone === 'warn');
  element.classList.toggle('fail', tone === 'fail');
}

function localBeatVisualCount(map: BeatMap | null): number {
  return map ? map.visualBeatCount || map.cameraBeats?.length || map.beats?.length || 0 : 0;
}

function setLocalBeatPreference(localKey: string, mode: LocalBeatMode): void {
  if (!localKey) return;
  localBeatMapPrefs[localKey] = mode;
  saveLocalBeatPrefs();
}

function applyLocalBeatMap(song: PlaylistSong, mode: LocalBeatMode, map: BeatMap, fromCache: boolean): boolean {
  if (!song.localKey || !map) return false;
  song.localBeatMode = mode;
  setLocalBeatPreference(song.localKey, mode);
  if (mode === 'dj') applyLocalDjBeatMap(song, map);
  else applyLocalMrBeatMap(song, map);
  hideBeatChip();
  notifyDesktopLyricsBeatMapReady();
  if (fromCache) showToast((mode === 'dj' ? 'DJ' : 'MR') + ' 本地节奏缓存已载入');
  return true;
}

function applyLocalDjBeatMap(song: PlaylistSong, map: BeatMap): void {
  setDjModeActive(true, song);
  currentBeatMap = null;
  beatMapNextIdx = 0;
  currentDjBeatMap = map;
  djBeatMapCache[djSongKey(song)] = map;
  applyPodcastDjProfileFromMap(map);
  syncPodcastDjMapCursor(audio?.currentTime || 0, true);
  maybeAnnounceDjMode();
}

function applyLocalMrBeatMap(song: PlaylistSong, map: BeatMap): void {
  setDjModeActive(false, song);
  currentBeatMap = map;
  if (song.localKey) beatMapCache['local:' + song.localKey] = map;
  applyCinemaProfileFromBeatMap(map);
  syncBeatMapPlaybackCursor(audio?.currentTime || 0, true);
}
