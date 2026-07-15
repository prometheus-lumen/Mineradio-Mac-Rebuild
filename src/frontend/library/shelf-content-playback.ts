function playShelfContentRow(
  row: ShelfContentRow,
  tracks: PlaylistSong[],
  playlistTitle: string
): void {
  pulseObjectValue(row as unknown as Record<string, number>, 'fxPulse', 1, 0.34);
  if (row.index < 0) return;
  if (row.song?.type === 'podcast-radio') {
    var radioId = row.song.id || String(row.song.radioId || '');
    loadPodcastRadioIntoQueue(
      radioId, true, row.song.name || playlistTitle
    );
    safeShelfCloseContent('content-play-podcast-radio');
    return;
  }
  var playIndex = tracks.slice(0, row.index + 1)
    .filter(function(song): boolean { return Boolean(song?.id); }).length - 1;
  var songs = tracks.filter(function(song): boolean { return Boolean(song?.id); })
    .map(function(song): PlaylistSong { return cloneSong(song); });
  if (!songs.length || playIndex < 0) return;
  playQueue = songs;
  currentIdx = playIndex;
  safeRenderQueuePanel('content-play-row');
  safeShelfRebuild('content-play-row');
  forcePlaybackControlsInteractive();
  playQueueAt(playIndex, { preserveHomeState: true }).catch(function(error): void {
    console.warn('[ContentPlayRow]', error);
  });
  safeShelfCloseContent('content-play-row');
}
