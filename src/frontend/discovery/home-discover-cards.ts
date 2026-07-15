function renderHomeDiscover(): void {
  initHomeCardCustomization();
  bindHomeSleepControls();
  updateHomeClockAndSleep();
  const loggedOut = !homeDiscoverState.loggedIn && !hasAnyPlatformLogin();
  renderHomeWeatherSummary(loggedOut);
  updateHomeNowCover();
  renderHomeRecommendationCards(loggedOut);
  renderHomeTiles();
}

function renderHomeRecommendationCards(loggedOut: boolean): void {
  const [daily, privateSong, librarySong] = homeDiscoverState.songs;
  const playlistItem = homeDiscoverState.playlists[0];
  const podcastItem = homeDiscoverState.podcasts[0];
  const summary = homeListenSummary();
  setText('home-weather-card-title', '我的歌单');
  setText('home-weather-card-sub', playlistItem
    ? `${playlistItem.trackCount ? `${playlistItem.trackCount} 首 · ` : ''}${playlistItem.creator || '打开左侧歌单库'}`
    : '打开左侧歌单库');
  setText('home-continue-title', summary.recent?.name || '继续听');
  setText('home-continue-sub', summary.recent
    ? summary.recent.artist || summary.recent.source || '最近播放'
    : '最近播放会出现在这里');
  setText('home-profile-title', '听歌画像');
  setText('home-profile-sub', summary.topArtist
    ? `常听 ${summary.topArtist.name} · ${summary.topArtist.plays} 次`
    : summary.totalPlays ? `${summary.totalPlays} 次有效播放` : '播放几首后生成偏好');
  if (loggedOut) renderLoggedOutRecommendationCards(summary);
  else renderMemberRecommendationCards(daily, privateSong, librarySong, playlistItem, podcastItem, summary);
}

function renderLoggedOutRecommendationCards(summary: HomeListenSummary): void {
  setText('home-daily-title', '每日推荐');
  setText('home-daily-sub', '登录后同步你的今日歌曲');
  setText('home-private-title', '私人电台');
  setText('home-private-sub', '登录后同步更多歌曲');
  setText('home-library-title', '常听歌手');
  setText('home-library-sub', '播放后会继续补全推荐');
  setHomeArt('home-weather-art', '', 280);
  setHomeArt('home-daily-art', '', 280);
  setHomeArt('home-private-art', '', 280);
  setHomeArt('home-continue-art', summary.recent?.cover || '', 280);
  setHomeArt('home-profile-art', summary.topSong?.cover || summary.recent?.cover || '', 280);
  setHomeArt('home-library-art', '', 280);
}

function renderMemberRecommendationCards(
  daily: PlaylistSong | undefined,
  privateSong: PlaylistSong | undefined,
  librarySong: PlaylistSong | undefined,
  playlistItem: HomePlaylistItem | undefined,
  podcastItem: HomePodcastItem | undefined,
  summary: HomeListenSummary
): void {
  setText('home-daily-title', '每日推荐');
  setText('home-daily-sub', daily
    ? `${daily.name || '今日歌曲'} · ${daily.artist || songSourceLabel(daily) || '点击播放'}`
    : '同步你的今日歌曲');
  setText('home-private-title', '私人电台');
  setText('home-private-sub', privateSong
    ? `${privateSong.name || '推荐歌曲'} · ${privateSong.artist || songSourceLabel(privateSong) || '点击播放'}`
    : `${homeDiscoverState.songs.length} 首 · 根据今日推荐与常听偏好`);
  setText('home-library-title', '常听歌手');
  setText('home-library-sub', librarySong
    ? `${librarySong.name || '推荐歌曲'} · ${librarySong.artist || songSourceLabel(librarySong) || '点击播放'}`
    : summary.topArtist ? `${summary.topArtist.name} · ${summary.topArtist.plays} 次` : '播放几首后生成你的偏好');
  setHomeArt('home-weather-art', userPlaylists[0]?.cover || playlistItem?.cover || daily?.cover || '', 280);
  setHomeArt('home-daily-art', daily?.cover || '', 280);
  setHomeArt('home-private-art', privateSong?.cover || daily?.cover || summary.recent?.cover || playlistItem?.cover || '', 280);
  setHomeArt('home-continue-art', summary.recent?.cover || playlistItem?.cover || '', 280);
  setHomeArt('home-profile-art', summary.topSong?.cover || podcastItem?.cover || '', 280);
  setHomeArt('home-library-art', librarySong?.cover || summary.topSong?.cover || summary.recent?.cover || podcastItem?.cover || '', 280);
}

function setText(id: string, text: string): void {
  const element = document.getElementById(id);
  if (element) element.textContent = text;
}
