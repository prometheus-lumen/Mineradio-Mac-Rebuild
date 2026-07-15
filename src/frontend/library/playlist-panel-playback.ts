function playLoadedPlaylistPanelDetail(startIndex = 0): void {
  var st = playlistPanelDetailState;
  if (!st || !st.key || st.loading) return;
  var tracks = st.tracks || [];
  if (!tracks.length) {
    showToast('歌单暂无可播放歌曲');
    return;
  }
  var parts = st.key.split(':');
  var provider: MusicProvider = parts[0] === 'qq' ? 'qq' : 'netease';
  var pid = parts.slice(1).join(':');
  if (parts[0] === 'kugou') provider = 'kugou';
  if (provider === 'kugou') primeAudioForUserGesture();
  playQueue = tracks.map(function(track){
    var song = cloneSong(track);
    song.provider = provider;
    song.source = provider;
    return song;
  });
  var title = st.playlist && st.playlist.name || '';
  if (isLikedPlaylistContext(playlistPanelProviderId(provider, pid), title, st.playlist || undefined)) markSongsLiked(playQueue, true);
  syncLikeStatusForSongs(playQueue);
  startIndex = Math.max(0, Math.min(tracks.length - 1, Number(startIndex) || 0));
  currentIdx = startIndex;
  homeForcedOpen = false;
  homeSuppressed = false;
  updateEmptyHomeVisibility();
  safeRenderQueuePanel('playlist-panel-detail-play');
  safeSwitchPlaylistTab('queue', 'playlist-panel-detail-play');
  safeShelfRebuild('playlist-panel-detail-play', true);
  forcePlaybackControlsInteractive();
  playQueueAt(startIndex, { manual: true }).catch(function(e){ console.warn('[PlaylistPanelDetailPlay]', e); });
}

function setProgressVisual(percent: number): void {
  percent = clampRange(percent || 0, 0, 100);
  var fill = document.getElementById('progress-fill');
  var thumb = document.getElementById('progress-thumb');
  if (fill) fill.style.width = percent + '%';
  if (thumb) thumb.style.left = percent + '%';
}

function shouldClosePlaylistPanelFromPointer(ppOn: boolean, ex: number, ppRect: DOMRect): boolean {
  if (!ppOn) return false;
  if (isSecondaryLeftDisplaySeamGuardActive() && ex < SECONDARY_PLAYLIST_SEAM_CLOSE_X) return true;
  return ex > ppRect.right + playlistPanelExitPadding();
}

