async function refreshUserPlaylists(force = false): Promise<void> {
  if (!loginStatus.loggedIn && !qqLoginStatus.loggedIn && !kugouLoginStatus.loggedIn) {
    resetPlaylistPanelRenderLimit();
    var loggedOutList = document.getElementById('pl-list');
    if (loggedOutList) loggedOutList.innerHTML = '<div style="text-align:center;padding:24px 0;color:rgba(255,255,255,.32);font-size:11.5px">登录后显示个人歌单</div>';
    var podcastListLoggedOut = document.getElementById('podcast-list');
    if (podcastListLoggedOut) podcastListLoggedOut.innerHTML = '<div style="text-align:center;padding:14px 0;color:rgba(255,255,255,.28);font-size:11.5px">登录后显示我的播客</div>';
    return;
  }
  if (force) resetPlaylistPanelRenderLimit();
  var hasCachedQQPlaylists = userPlaylists.some(function(pl){ return pl && pl.provider === 'qq'; });
  var hasCachedKugouPlaylists = userPlaylists.some(function(pl){ return pl && pl.provider === 'kugou'; });
  var needsQQRefresh = qqLoginStatus.loggedIn && !hasCachedQQPlaylists;
  var needsKugouRefresh = kugouLoginStatus.loggedIn && !hasCachedKugouPlaylists;
  if (!force && !needsQQRefresh && !needsKugouRefresh && (userPlaylists.length || myPodcastCollections.length)) {
    var cachedAnimate = isPlaylistPanelVisibleForRender();
    renderUserPlaylistsList({ animate: cachedAnimate });
    renderMyPodcastCollections({ animate: cachedAnimate });
    return;
  }
  var $pl = document.getElementById('pl-list');
  if ($pl) {
    $pl.innerHTML = miniQueueSkeleton();
    if (window.gsap) animateListItems($pl, '.mini-queue-skeleton', { x: 0, y: 6, stagger: 0.018, duration: 0.18, limit: 3 });
  }
  var $pod = document.getElementById('podcast-list');
  if ($pod) $pod.innerHTML = miniQueueSkeleton();
  try {
    var result = await Promise.all([
      loginStatus.loggedIn ? apiJson<PlaylistApiResponse>('/api/user/playlists') : Promise.resolve<PlaylistApiResponse>({ playlists: [] }),
      loginStatus.loggedIn ? apiJson<PlaylistApiResponse>('/api/podcast/my') : Promise.resolve<PlaylistApiResponse>({ collections: [], loggedIn: false }),
      qqLoginStatus.loggedIn ? apiJson<PlaylistApiResponse>('/api/qq/user/playlists') : Promise.resolve<PlaylistApiResponse>({ playlists: [] }),
      kugouLoginStatus.loggedIn ? apiJson<PlaylistApiResponse>('/api/kugou/user/playlists') : Promise.resolve<PlaylistApiResponse>({ playlists: [] })
    ]);
    var neteaseLists = (result[0].playlists || []).map(function(pl){ pl.provider = 'netease'; pl.source = 'netease'; return pl; });
    qqPlaylists = (result[2].playlists || []).map(function(pl){ pl.provider = 'qq'; pl.source = 'qq'; return pl; });
    kugouPlaylists = (result[3].playlists || []).map(function(pl){ pl.provider = 'kugou'; pl.source = 'kugou'; return pl; });
    userPlaylists = neteaseLists.concat(qqPlaylists, kugouPlaylists);
    myPodcastCollections = result[1].collections || [];
    var animatePanel = isPlaylistPanelVisibleForRender();
    renderUserPlaylistsList({ animate: animatePanel, reset: true });
    renderMyPodcastCollections({ animate: animatePanel });
    if (emptyHomeActive) renderHomeDiscover();
    scheduleShelfRebuild('refresh-user-playlists', true);
  } catch (e) { console.warn(e); }
}

function playlistPanelKey(provider: string, id?: string | number): string {
  var p = provider === 'qq' ? 'qq' : (provider === 'kugou' ? 'kugou' : 'netease');
  return p + ':' + String(id || '');
}

function playlistPanelDetailMatches(): Array<{ song: PlaylistSong; index: number }> {
  var st = playlistPanelDetailState || {};
  var query = String(st.query || '').trim().toLocaleLowerCase();
  return (st.tracks || []).map(function(song, index){ return { song: song, index: index }; }).filter(function(item){
    if (!query) return true;
    var song = item.song || {};
    return [song.name, song.artist, song.album].some(function(value){
      return String(value || '').toLocaleLowerCase().indexOf(query) >= 0;
    });
  });
}

function playlistPanelDetailHtml(pl: AccountPlaylist, provider: PlaylistPanelProvider): string {
  var key = playlistPanelKey(provider, pl && pl.id);
  if (playlistPanelDetailState.key !== key) return '';
  var tracks = playlistPanelDetailState.tracks || [];
  var loading = playlistPanelDetailState.loading;
  var playDisabled = loading || !tracks.length ? ' disabled aria-disabled="true"' : '';
  var cover = playlistCoverSrc(pl, 96);
  var img = cover ? '<img class="pl-detail-cover" src="' + escHtml(cover) + '" alt="" decoding="async" data-fade-on-error="0.2">' : '<div class="pl-detail-cover"></div>';
  var query = String(playlistPanelDetailState.query || '');
  var matches = loading ? [] : playlistPanelDetailMatches();
  var renderLimit = loading ? 0 : Math.max(PLAYLIST_DETAIL_INITIAL_RENDER, playlistPanelDetailState.renderLimit || PLAYLIST_DETAIL_INITIAL_RENDER);
  renderLimit = Math.min(matches.length, renderLimit);
  var visibleTracks = loading ? [] : matches.slice(0, renderLimit);
  var rows = loading
    ? '<div class="pl-detail-row"><div style="width:34px;height:34px;border-radius:7px;background:rgba(255,255,255,.06)"></div><div style="flex:1;min-width:0"><div class="pl-detail-row-title">正在载入歌单</div><div class="pl-detail-row-artist">请稍候</div></div></div>'
    : visibleTracks.map(function(match){
        var song = match.song;
        var index = match.index;
        var thumb = songCoverSrc(song, 60);
        var imgTag = thumb ? '<img src="' + escHtml(thumb) + '" alt="" loading="lazy" decoding="async" data-fade-on-error="0.2">' : '<div style="width:34px;height:34px;border-radius:7px;background:rgba(255,255,255,.06);flex:0 0 auto"></div>';
        return '<div class="pl-detail-row" data-pl-detail-row="' + index + '">' +
          imgTag +
          '<div style="flex:1;min-width:0"><div class="pl-detail-row-title">' + escHtml(song.name || '') + '</div>' +
          '<button type="button" class="pl-detail-row-artist" data-pl-detail-artist="' + index + '">' + escHtml(song.artist || '未知歌手') + '</button></div>' +
        '</div>';
      }).join('');
  if (!loading && !rows) rows = query.trim()
    ? '<div class="pl-detail-empty">没有找到“' + escHtml(query.trim()) + '”</div>'
    : '<div class="pl-detail-empty">歌单暂无可播放歌曲</div>';
  if (!loading && matches.length > renderLimit) {
    rows += '<button type="button" class="fx-mini-btn ghost pl-detail-load-more" data-pl-detail-load-more="1">加载更多 ' + renderLimit + '/' + matches.length + '</button>';
  } else if (!loading && matches.length > PLAYLIST_DETAIL_INITIAL_RENDER) {
    rows += '<div class="pl-detail-progress">已显示全部 ' + matches.length + ' 首</div>';
  }
  var searchClear = query ? '<button type="button" class="pl-detail-search-clear" data-pl-detail-search-clear="1" aria-label="清空检索">×</button>' : '';
  return '<div class="pl-inline-detail" data-pl-detail="' + escHtml(key) + '">' +
    '<div class="pl-detail-sticky">' +
      '<div class="pl-detail-head">' + img + '<div style="flex:1;min-width:0"><div class="pl-detail-title">' + escHtml(pl.name || '歌单详情') + '</div><div class="pl-detail-sub">' + escHtml((pl.trackCount || tracks.length || 0) + ' 首 · ' + (pl.creator || (provider === 'qq' ? 'QQ Music' : (provider === 'kugou' ? 'Kugou' : 'Netease')))) + '</div></div><div class="pl-detail-count">' + (loading ? '载入中' : (query.trim() ? (matches.length + ' 条结果') : (renderLimit + '/' + tracks.length))) + '</div></div>' +
      '<div class="pl-detail-actions"><button class="pl-detail-play" type="button" data-pl-detail-play="' + escHtml(key) + '"' + playDisabled + '><svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>播放歌单</button><button class="fx-mini-btn ghost pl-detail-collapse-btn" type="button" data-pl-detail-collapse="1">收起歌曲</button><button class="fx-mini-btn ghost pl-detail-top-btn" type="button" data-pl-detail-top="1">回到顶部</button></div>' +
      '<label class="pl-detail-search"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m21 21-4.35-4.35m2.35-5.65a8 8 0 1 1-16 0 8 8 0 0 1 16 0Z"/></svg><input type="search" data-pl-detail-search="1" value="' + escHtml(query) + '" placeholder="搜索歌名、歌手或专辑" autocomplete="off" spellcheck="false" aria-label="检索歌单歌曲">' + searchClear + '</label>' +
    '</div>' +
    '<div class="pl-detail-list">' + rows + '</div>' +
  '</div>';
}

function renderPlaylistPanelDetailState(): void {
  renderUserPlaylistsList();
}

function scrollPlaylistPanelToTop(): void {
  var panel = document.getElementById('playlist-panel');
  if (!panel) return;
  try { panel.scrollTo({ top: 0, behavior: 'smooth' }); }
  catch (e) { panel.scrollTop = 0; }
}

function scrollPlaylistPanelDetailIntoView(key: string): void {
  var panel = document.getElementById('playlist-panel');
  if (!panel || !key) return;
  var detailPanel = panel;
  requestAnimationFrame(function(){
    var detail = Array.from(detailPanel.querySelectorAll<HTMLElement>('[data-pl-detail]')).find(function(node): boolean {
      return node.dataset.plDetail === key;
    }) || null;
    if (!detail) return;
    var anchor = detail.previousElementSibling instanceof HTMLElement ? detail.previousElementSibling : detail;
    var top = Math.max(0, anchor.offsetTop - 10);
    try { detailPanel.scrollTo({ top: top, behavior: 'smooth' }); }
    catch (e) { detailPanel.scrollTop = top; }
  });
}

async function openPlaylistPanelDetail(provider: string, pid: string | number, title?: string): Promise<void> {
  if (!pid) return;
  var normalizedProvider: PlaylistPanelProvider = provider === 'qq' ? 'qq' : (provider === 'kugou' ? 'kugou' : 'netease');
  var key = playlistPanelKey(normalizedProvider, pid);
  var pl: AccountPlaylist = userPlaylists.find(function(item){ return playlistPanelKey(item.provider === 'qq' ? 'qq' : (item.provider === 'kugou' ? 'kugou' : 'netease'), item.id) === key; }) || { id: pid, provider: normalizedProvider, name: title || 'Playlist Detail' };
  provider = normalizedProvider;
  if (playlistPanelDetailState.key === key && !playlistPanelDetailState.loading && playlistPanelDetailState.tracks.length) {
    playlistPanelDetailState.key = '';
    playlistPanelDetailState.tracks = [];
    playlistPanelDetailState.playlist = null;
    playlistPanelDetailState.renderLimit = PLAYLIST_DETAIL_INITIAL_RENDER;
    renderPlaylistPanelDetailState();
    return;
  }
  var token = ++playlistPanelDetailState.token;
  playlistPanelDetailState = { key: key, loading: true, playlist: pl, tracks: [], token: token, renderLimit: PLAYLIST_DETAIL_INITIAL_RENDER, query: '' };
  renderPlaylistPanelDetailState();
  scrollPlaylistPanelDetailIntoView(key);
  try {
    var r: PlaylistTracksResponse = provider === 'qq'
      ? await apiJson<PlaylistTracksResponse>('/api/qq/playlist/tracks?id=' + encodeURIComponent(pid))
      : (provider === 'kugou'
        ? await apiJson<PlaylistTracksResponse>('/api/kugou/playlist/tracks?id=' + encodeURIComponent(pid))
        : await apiJson<PlaylistTracksResponse>('/api/playlist/tracks?id=' + encodeURIComponent(pid)));
    if (playlistPanelDetailState.token !== token) return;
    playlistPanelDetailState.loading = false;
    playlistPanelDetailState.tracks = (r && r.tracks || []).map(cloneSong);
    playlistPanelDetailState.renderLimit = Math.min(playlistPanelDetailState.tracks.length, PLAYLIST_DETAIL_INITIAL_RENDER);
    renderPlaylistPanelDetailState();
  } catch (e) {
    console.warn('[PlaylistPanelDetail]', pid, e);
    if (playlistPanelDetailState.token !== token) return;
    playlistPanelDetailState.loading = false;
    playlistPanelDetailState.tracks = [];
    playlistPanelDetailState.renderLimit = PLAYLIST_DETAIL_INITIAL_RENDER;
    renderPlaylistPanelDetailState();
    showToast('歌单详情加载失败');
  }
}

function playPlaylistPanelDetail(): void {
  playLoadedPlaylistPanelDetail(0);
}

function playPlaylistPanelDetailTrack(index: number): void {
  playLoadedPlaylistPanelDetail(index);
}

function openPlaylistPanelDetailArtist(index: number): void {
  var song = playlistPanelDetailState.tracks && playlistPanelDetailState.tracks[index];
  if (song) openArtistDetailForSong(song);
}

function growPlaylistPanelDetailRenderLimit(amount = PLAYLIST_DETAIL_BATCH_SIZE): boolean {
  var st = playlistPanelDetailState;
  var total = st && st.tracks ? playlistPanelDetailMatches().length : 0;
  if (!st || st.loading || !st.key || !total) return false;
  var current = Math.max(PLAYLIST_DETAIL_INITIAL_RENDER, st.renderLimit || PLAYLIST_DETAIL_INITIAL_RENDER);
  var next = Math.min(total, current + (amount || PLAYLIST_DETAIL_BATCH_SIZE));
  if (next <= current) return false;
  var panel = document.getElementById('playlist-panel');
  var keepTop = panel ? panel.scrollTop : 0;
  st.renderLimit = next;
  renderPlaylistPanelDetailState();
  if (panel) panel.scrollTop = keepTop;
  return true;
}

function maybeGrowPlaylistPanelDetailRenderLimit(): void {
  var panel = document.getElementById('playlist-panel');
  var st = playlistPanelDetailState;
  if (!panel || !st || st.loading || !st.key || !st.tracks || st.renderLimit >= playlistPanelDetailMatches().length) return;
  if (panel.scrollTop + panel.clientHeight >= panel.scrollHeight - 240) {
    growPlaylistPanelDetailRenderLimit();
  }
}

function resetPlaylistPanelRenderLimit(): void {
  playlistPanelRenderLimit = PLAYLIST_PANEL_BATCH_SIZE;
}

function growPlaylistPanelRenderLimit(): void {
  var visiblePlaylists = getFilteredUserPlaylists();
  if (!visiblePlaylists.length) return;
  var next = Math.min(visiblePlaylists.length, (playlistPanelRenderLimit || PLAYLIST_PANEL_BATCH_SIZE) + PLAYLIST_PANEL_BATCH_SIZE);
  if (next <= playlistPanelRenderLimit) return;
  playlistPanelRenderLimit = next;
  renderUserPlaylistsList({ animate: true });
}

function bindPlaylistPanelLazyRender(): void {
  var panel = document.getElementById('playlist-panel');
  if (!panel || playlistPanelLazyBound) return;
  playlistPanelLazyBound = true;
  var playlistPanel = panel;
  panel.addEventListener('scroll', function(){
    maybeGrowPlaylistPanelDetailRenderLimit();
    if (queueViewTab !== 'playlists' || playlistPanelRenderLimit >= getFilteredUserPlaylists().length) return;
    if (playlistPanel.scrollTop + playlistPanel.clientHeight >= playlistPanel.scrollHeight - 180) growPlaylistPanelRenderLimit();
  }, { passive: true });
}
