function smoothPodcastDjMapHandoff(songKey: string, map: BeatMap | null, token: number): void {
  if (!map) return;
  showBeatChip('DJ 锁拍完成…');
  scheduleVisualApply(function(): void {
    if (token !== djBeatMapToken || !djMode.active || djMode.songKey !== songKey) return;
    djBeatMapCache[songKey] = map;
    currentDjBeatMap = map;
    applyPodcastDjProfileFromMap(map);
    syncPodcastDjMapCursor(audio?.currentTime || 0, true);
    notifyDesktopLyricsBeatMapReady();
    hideBeatChip();
    showToast('DJ 离线锁拍完成: ' + (map.visualBeatCount || 0) + ' 个主拍');
  }, 260, 360);
}

function smoothPodcastDjIntroHandoff(songKey: string, map: BeatMap | null, token: number): void {
  if (!map?.partial || currentDjBeatMap && !currentDjBeatMap.partial) return;
  scheduleVisualApply(function(): void {
    if (token !== djBeatMapToken || !djMode.active || djMode.songKey !== songKey) return;
    if (currentDjBeatMap && !currentDjBeatMap.partial) return;
    currentDjBeatMap = map;
    applyPodcastDjProfileFromMap(map);
    syncPodcastDjMapCursor(audio?.currentTime || 0, true);
    notifyDesktopLyricsBeatMapReady();
    showBeatChip('DJ 开头已锁拍，全曲继续分析…');
  }, 0, 240);
}

function smoothBeatMapHandoff(songId: string, map: BeatMap | null, token: number, song: PlaylistSong): void {
  if (!map) return;
  showBeatChip('节奏缓冲中…');
  var wait = Math.max(260, Math.min(720, 340 + (beatPulse + beatCam.punch) * 260));
  scheduleVisualApply(function(): void {
    if (token !== beatMapToken) return;
    beatMapCache[songId] = map;
    currentBeatMap = map;
    applyCinemaProfileFromBeatMap(map);
    syncBeatMapPlaybackCursor(audio?.currentTime || 0, true);
    hideBeatChip();
    notifyDesktopLyricsBeatMapReady();
    var beatCount = map.visualBeatCount || map.cameraBeats?.length || 0;
    showToast('节奏分析完成: ' + beatCount + ' 个视觉主拍');
    void writeBeatDiskCache(songId, map, song, 'mr');
    scheduleQueueBeatPrefetch(currentIdx, 1000);
  }, wait, 460);
}
