function handleHomeSleepTrackEnded(): boolean {
  if (!homeSleepState?.pendingAfterSong) return false;
  performHomeSleepClose('after-song');
  return true;
}

function handleHomeTileClick(index: number): void {
  var row = document.querySelector<HomeTileRow>('#home-tile-row');
  var item = row?._homeTiles?.[index];
  if (!item) return;
  switch (item.kind) {
    case 'weatherSong': playWeatherSong(item.index); break;
    case 'recent': playHomeRecent(item.record); break;
    case 'recentEmpty': break;
    case 'profile': openHomeInsight(); break;
    case 'song': playHomeSong(item.index); break;
    case 'login': showLoginModal({ source: 'home-tile' }); break;
    case 'local': openHomeLocalImport(); break;
    case 'guide': openHomeProductGuide(); break;
    case 'playlist': openHomePlaylist(item.index); break;
    case 'podcast': openHomePodcast(item.index); break;
    case 'podcastSearch': setSearchMode('podcast'); loadPodcastHot(); break;
    case 'library': openHomeLibrary(); break;
    default: runHomeSearch(item.query || item.title || '');
  }
}

function handlePlaybackUnavailable(song: PlaylistSong, data: PlaybackUnavailableResponse): void {
  hideLoading();
  forcePlaybackControlsInteractive();
  var provider = playbackLoginProvider(song);
  var category = data.reason || data.restriction?.category || '';
  showToast(playbackRestrictionMessage(song, data));
  if (category !== 'login_required') return;
  setTimeout(function(): void {
    var modal = document.getElementById('login-modal');
    if (!modal || modal.classList.contains('show')) return;
    openProviderLogin(provider);
  }, 520);
}
