'use strict';

// Mineradio classic module: library/playlist-panel.
function playlistSourceKey(pl) {
  return pl && pl.provider === 'qq' ? 'qq' : (pl && pl.provider === 'kugou' ? 'kugou' : 'netease');
}

function playlistCoverSrc(pl, size) {
  if (!pl || !pl.cover) return '';
  var url = playlistSourceKey(pl) === 'netease' ? coverUrlWithSize(pl.cover, size) : pl.cover;
  return coverProxySrc(url);
}

function availablePlaylistSources() {
  var sources = [
    { key: 'netease', label: '网易云', loggedIn: !!(loginStatus && loginStatus.loggedIn) },
    { key: 'qq', label: 'QQ 音乐', loggedIn: !!(qqLoginStatus && qqLoginStatus.loggedIn) },
    { key: 'kugou', label: '酷狗音乐', loggedIn: !!(kugouLoginStatus && kugouLoginStatus.loggedIn) }
  ];
  return sources.filter(function(source){
    return source.loggedIn || userPlaylists.some(function(pl){ return playlistSourceKey(pl) === source.key; });
  });
}

function normalizePlaylistSourceFilter() {
  var sources = availablePlaylistSources();
  if (!sources.length) return '';
  if (!sources.some(function(source){ return source.key === playlistSourceFilter; })) playlistSourceFilter = sources[0].key;
  return playlistSourceFilter;
}

function getFilteredUserPlaylists() {
  var source = normalizePlaylistSourceFilter();
  return source ? userPlaylists.filter(function(pl){ return playlistSourceKey(pl) === source; }) : [];
}

function renderPlaylistSourceFilter() {
  var el = document.getElementById('playlist-source-filter');
  if (!el) return;
  var sources = availablePlaylistSources();
  var active = normalizePlaylistSourceFilter();
  el.style.display = sources.length ? '' : 'none';
  el.innerHTML = sources.map(function(source){
    return '<button type="button" role="tab" aria-selected="' + (source.key === active ? 'true' : 'false') + '" class="' + (source.key === active ? 'active' : '') + '" data-playlist-source="' + source.key + '" onclick="setPlaylistSourceFilter(\'' + source.key + '\')">' + source.label + '</button>';
  }).join('');
}

function setPlaylistSourceFilter(source) {
  if (!availablePlaylistSources().some(function(item){ return item.key === source; })) return;
  playlistSourceFilter = source;
  try { localStorage.setItem(PLAYLIST_SOURCE_FILTER_STORE_KEY, source); } catch (e) {}
  playlistPanelDetailState = { key: '', loading: false, playlist: null, tracks: [], token: (playlistPanelDetailState.token || 0) + 1, renderLimit: PLAYLIST_DETAIL_INITIAL_RENDER };
  resetPlaylistPanelRenderLimit();
  renderUserPlaylistsList({ animate: true, reset: true });
}

function collapsePlaylistPanelDetail() {
  if (!playlistPanelDetailState || !playlistPanelDetailState.key) return;
  playlistPanelDetailState = {
    key: '',
    loading: false,
    playlist: null,
    tracks: [],
    token: (playlistPanelDetailState.token || 0) + 1,
    renderLimit: PLAYLIST_DETAIL_INITIAL_RENDER
  };
  renderUserPlaylistsList({ animate: true });
  requestAnimationFrame(function(){ scrollPlaylistPanelToTop(); });
  showToast('已收起歌单歌曲');
}

function isPlaylistPanelVisibleForRender() {
  var panel = document.getElementById('playlist-panel');
  var panelOpen = panel && (panel.classList.contains('show') || panel.classList.contains('peek') || panel.classList.contains('pinned'));
  return !!(panelOpen || miniQueueOpen);
}

function isNoLyricText(text) {
  var compact = String(text || '').replace(/\s+/g, '').replace(/[，,。.!！?？、~～]/g, '');
  return !compact ||
    compact === '纯音乐请欣赏' ||
    compact === '暂无歌词' ||
    compact === '暂无歌词敬请期待' ||
    compact === '此歌曲为没有填词的纯音乐请您欣赏';
}

// ============================================================
//  播放列表面板
// ============================================================
function animateListItems(container, selector, opts) {
  if (!container || !window.gsap) return;
  opts = opts || {};
  var items = Array.prototype.slice.call(container.querySelectorAll(selector));
  if (!items.length) return;
  var limit = opts.limit || 18;
  var targets = items.slice(0, limit);
  window.gsap.killTweensOf(targets);
  window.gsap.fromTo(targets, {
    autoAlpha: 0,
    y: opts.y == null ? 8 : opts.y,
    x: opts.x == null ? -6 : opts.x
  }, {
    autoAlpha: 1,
    y: 0,
    x: 0,
    duration: opts.duration || 0.22,
    stagger: opts.stagger || 0.012,
    ease: opts.ease || 'power2.out',
    force3D: true,
    overwrite: true
  });
}

function smoothScrollToItem(scroller, item, opts) {
  if (!scroller || !item) return;
  opts = opts || {};
  var target = item.offsetTop - Math.max(0, (scroller.clientHeight - item.offsetHeight) * (opts.align == null ? 0.42 : opts.align));
  target = Math.max(0, Math.min(target, Math.max(0, scroller.scrollHeight - scroller.clientHeight)));
  if (window.gsap) {
    if (typeof scroller.__syncSmoothWheelTarget === 'function') scroller.__syncSmoothWheelTarget(target);
    window.gsap.killTweensOf(scroller);
    window.gsap.to(scroller, { scrollTop: target, duration: opts.duration || 0.30, ease: opts.ease || 'power2.out', overwrite: true });
  } else if (scroller.scrollTo) {
    scroller.scrollTo({ top: target, behavior: 'smooth' });
  } else {
    scroller.scrollTop = target;
  }
}

function animateVisiblePanelList(listEl, selector, scroller, activeSelector, opts) {
  if (!listEl) return;
  opts = opts || {};
  requestAnimationFrame(function(){
    animateListItems(listEl, selector, { x: -8, y: 6, stagger: 0.01, duration: 0.20, limit: 16 });
    var active = activeSelector ? listEl.querySelector(activeSelector) : null;
    if (active && scroller && opts.scrollActive !== false) smoothScrollToItem(scroller, active, { duration: 0.32 });
  });
}

function guardPlaylistPanelOpen(ms) {
  playlistPanelOpenGuardUntil = performance.now() + (ms || 1400);
  if (peekTimers && peekTimers.pl) {
    clearTimeout(peekTimers.pl);
    peekTimers.pl = null;
  }
}

function togglePlaylistPanel(force) {
  var el = document.getElementById('playlist-panel');
  if (force === false) el.classList.remove('show');
  else if (force === true) {
    guardPlaylistPanelOpen(1400);
    el.classList.add('show');
  }
  else {
    el.classList.toggle('show');
    if (el.classList.contains('show')) guardPlaylistPanelOpen(1400);
  }
  if (el.classList.contains('show')) {
    if (window.gsap) window.gsap.fromTo(el, { x: -12, autoAlpha: 0.92 }, { x: 0, autoAlpha: 1, duration: 0.22, ease: 'power2.out', overwrite: true });
    scheduleUiWarmTask(function(){
      flushDeferredQueuePanel('playlist-panel-open');
      if (!playQueue.length && queueViewTab === 'queue') switchPlaylistTab('playlists');
      if (playQueue.length && currentIdx >= 0 && queueViewTab !== 'queue') switchPlaylistTab('queue');
      if (queueViewTab === 'queue') animateVisiblePanelList(document.getElementById('queue-list'), '.queue-item', el, '.queue-item.now', { scrollActive: false });
      else if (queueViewTab === 'playlists') animateVisiblePanelList(document.getElementById('pl-list'), '.pl-card', el);
      else animateVisiblePanelList(document.getElementById('podcast-list'), '.pl-card', el);
    }, 180);
  }
}

function applyPlaylistPanelPinState(openPanel) {
  var panel = document.getElementById('playlist-panel');
  var btn = document.getElementById('playlist-pin-btn');
  if (panel) {
    panel.classList.toggle('pinned', !!playlistPanelPinned);
    if (playlistPanelPinned || openPanel) {
      panel.dataset.preserveTabOnOpen = '1';
      setPeek(panel, true, 'pl');
    }
  }
  if (btn) {
    btn.classList.toggle('active', !!playlistPanelPinned);
    btn.title = playlistPanelPinned ? '取消常开歌单' : '常开歌单';
  }
}

function setPlaylistPanelPinned(on, silent) {
  playlistPanelPinned = !!on;
  saveBooleanPreference(PLAYLIST_PANEL_PIN_STORE_KEY, playlistPanelPinned);
  applyPlaylistPanelPinState(playlistPanelPinned);
  if (!silent) showToast(playlistPanelPinned ? '左侧歌单已常开' : '左侧歌单已恢复自动隐藏');
}

function togglePlaylistPanelPinned() {
  setPlaylistPanelPinned(!playlistPanelPinned);
}

function scrollPlaylistPanelToCurrent() {
  var panel = document.getElementById('playlist-panel');
  var list = document.getElementById('queue-list');
  if (!panel || !list || queueViewTab !== 'queue') return;
  var now = performance.now();
  if (panel.__lastCurrentScrollAt && now - panel.__lastCurrentScrollAt < 650) return;
  panel.__lastCurrentScrollAt = now;
  requestAnimationFrame(function(){
    smoothScrollToItem(panel, list.querySelector('.queue-item.now'), { duration: 0.28, align: 0.34 });
  });
}

function switchPlaylistTab(tab) {
  tab = tab === 'podcasts' ? 'podcasts' : (tab === 'playlists' ? 'playlists' : 'queue');
  queueViewTab = tab;
  document.getElementById('tab-queue').classList.toggle('active', tab === 'queue');
  document.getElementById('tab-pl').classList.toggle('active', tab === 'playlists');
  var podcastTab = document.getElementById('tab-podcast');
  if (podcastTab) podcastTab.classList.toggle('active', tab === 'podcasts');
  document.getElementById('queue-pane').style.display = tab === 'queue' ? '' : 'none';
  document.getElementById('pl-pane').style.display = tab === 'playlists' ? '' : 'none';
  var podcastPane = document.getElementById('podcast-pane');
  if (podcastPane) podcastPane.style.display = tab === 'podcasts' ? '' : 'none';
  if (tab === 'playlists' || tab === 'podcasts') refreshUserPlaylists();
  if (tab === 'queue') animateVisiblePanelList(document.getElementById('queue-list'), '.queue-item', document.getElementById('playlist-panel'), '.queue-item.now');
  if (tab === 'playlists') animateVisiblePanelList(document.getElementById('pl-list'), '.pl-card', document.getElementById('playlist-panel'));
  if (tab === 'podcasts') animateVisiblePanelList(document.getElementById('podcast-list'), '.pl-card', document.getElementById('playlist-panel'));
}

function openPlaylistPanelTab(tab, preserve) {
  tab = tab === 'podcasts' ? 'podcasts' : (tab === 'playlists' ? 'playlists' : 'queue');
  var panel = document.getElementById('playlist-panel');
  if (panel && panel.dataset && preserve !== false) panel.dataset.preserveTabOnOpen = '1';
  guardPlaylistPanelOpen(1400);
  switchPlaylistTab(tab);
  setPeek(panel, true, 'pl');
}

async function refreshUserPlaylists(force) {
  if (!loginStatus.loggedIn && !qqLoginStatus.loggedIn) {
    resetPlaylistPanelRenderLimit();
    document.getElementById('pl-list').innerHTML = '<div style="text-align:center;padding:24px 0;color:rgba(255,255,255,.32);font-size:11.5px">登录后显示个人歌单</div>';
    var podcastListLoggedOut = document.getElementById('podcast-list');
    if (podcastListLoggedOut) podcastListLoggedOut.innerHTML = '<div style="text-align:center;padding:14px 0;color:rgba(255,255,255,.28);font-size:11.5px">登录后显示我的播客</div>';
    return;
  }
  if (force) resetPlaylistPanelRenderLimit();
  var hasCachedQQPlaylists = userPlaylists.some(function(pl){ return pl && pl.provider === 'qq'; });
  var needsQQRefresh = qqLoginStatus.loggedIn && !hasCachedQQPlaylists;
  if (!force && !needsQQRefresh && (userPlaylists.length || myPodcastCollections.length)) {
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
      loginStatus.loggedIn ? apiJson('/api/user/playlists') : Promise.resolve({ playlists: [] }),
      loginStatus.loggedIn ? apiJson('/api/podcast/my') : Promise.resolve({ collections: [], loggedIn: false }),
      qqLoginStatus.loggedIn ? apiJson('/api/qq/user/playlists') : Promise.resolve({ playlists: [] })
    ]);
    var neteaseLists = (result[0].playlists || []).map(function(pl){ pl.provider = 'netease'; pl.source = 'netease'; return pl; });
    qqPlaylists = (result[2].playlists || []).map(function(pl){ pl.provider = 'qq'; pl.source = 'qq'; return pl; });
    userPlaylists = neteaseLists.concat(qqPlaylists);
    myPodcastCollections = result[1].collections || [];
    var animatePanel = isPlaylistPanelVisibleForRender();
    renderUserPlaylistsList({ animate: animatePanel, reset: true });
    renderMyPodcastCollections({ animate: animatePanel });
    if (emptyHomeActive) renderHomeDiscover();
    scheduleShelfRebuild('refresh-user-playlists', true);
  } catch (e) { console.warn(e); }
}

function playlistPanelKey(provider, id) {
  return (provider === 'qq' ? 'qq' : 'netease') + ':' + String(id || '');
}

function playlistPanelDetailHtml(pl, provider) {
  var key = playlistPanelKey(provider, pl && pl.id);
  if (playlistPanelDetailState.key !== key) return '';
  var tracks = playlistPanelDetailState.tracks || [];
  var loading = playlistPanelDetailState.loading;
  var playDisabled = loading || !tracks.length ? ' disabled aria-disabled="true"' : '';
  var cover = playlistCoverSrc(pl, 96);
  var img = cover ? '<img class="pl-detail-cover" src="' + escHtml(cover) + '" alt="" decoding="async" onerror="this.style.opacity=0.2">' : '<div class="pl-detail-cover"></div>';
  var renderLimit = loading ? 0 : Math.max(PLAYLIST_DETAIL_INITIAL_RENDER, playlistPanelDetailState.renderLimit || PLAYLIST_DETAIL_INITIAL_RENDER);
  renderLimit = Math.min(tracks.length, renderLimit);
  var visibleTracks = loading ? [] : tracks.slice(0, renderLimit);
  var rows = loading
    ? '<div class="pl-detail-row"><div style="width:34px;height:34px;border-radius:7px;background:rgba(255,255,255,.06)"></div><div style="flex:1;min-width:0"><div class="pl-detail-row-title">正在载入歌单</div><div class="pl-detail-row-artist">请稍候</div></div></div>'
    : visibleTracks.map(function(song, i){
        var thumb = songCoverSrc(song, 60);
        var imgTag = thumb ? '<img src="' + escHtml(thumb) + '" alt="" loading="lazy" decoding="async" onerror="this.style.opacity=0.2">' : '<div style="width:34px;height:34px;border-radius:7px;background:rgba(255,255,255,.06);flex:0 0 auto"></div>';
        return '<div class="pl-detail-row" data-pl-detail-row="' + i + '">' +
          imgTag +
          '<div style="flex:1;min-width:0"><div class="pl-detail-row-title">' + escHtml(song.name || '') + '</div>' +
          '<button type="button" class="pl-detail-row-artist" data-pl-detail-artist="' + i + '">' + escHtml(song.artist || '未知歌手') + '</button></div>' +
        '</div>';
      }).join('');
  if (!loading && !rows) rows = '<div style="text-align:center;padding:14px 0;color:rgba(255,255,255,.30);font-size:11.5px">歌单暂无可播放歌曲</div>';
  if (!loading && tracks.length > renderLimit) {
    rows += '<button type="button" class="fx-mini-btn ghost pl-detail-load-more" data-pl-detail-load-more="1">加载更多 ' + renderLimit + '/' + tracks.length + '</button>';
  } else if (!loading && tracks.length > PLAYLIST_DETAIL_INITIAL_RENDER) {
    rows += '<div class="pl-detail-progress">已显示全部 ' + tracks.length + ' 首</div>';
  }
  return '<div class="pl-inline-detail" data-pl-detail="' + escHtml(key) + '">' +
    '<div class="pl-detail-sticky">' +
      '<div class="pl-detail-head">' + img + '<div style="flex:1;min-width:0"><div class="pl-detail-title">' + escHtml(pl.name || '歌单详情') + '</div><div class="pl-detail-sub">' + escHtml((pl.trackCount || tracks.length || 0) + ' 首 · ' + (pl.creator || (provider === 'qq' ? 'QQ 音乐' : '网易云音乐'))) + '</div></div><div class="pl-detail-count">' + (loading ? '载入中' : (renderLimit + '/' + tracks.length)) + '</div></div>' +
      '<div class="pl-detail-actions"><button class="pl-detail-play" type="button" data-pl-detail-play="' + escHtml(key) + '"' + playDisabled + '><svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>播放歌单</button><button class="fx-mini-btn ghost pl-detail-collapse-btn" type="button" data-pl-detail-collapse="1">收起歌曲</button><button class="fx-mini-btn ghost pl-detail-top-btn" type="button" data-pl-detail-top="1">回到顶部</button></div>' +
    '</div>' +
    '<div class="pl-detail-list">' + rows + '</div>' +
  '</div>';
}

function renderPlaylistPanelDetailState() {
  renderUserPlaylistsList();
}

function scrollPlaylistPanelToTop() {
  var panel = document.getElementById('playlist-panel');
  if (!panel) return;
  try { panel.scrollTo({ top: 0, behavior: 'smooth' }); }
  catch (e) { panel.scrollTop = 0; }
}

function scrollPlaylistPanelDetailIntoView(key) {
  var panel = document.getElementById('playlist-panel');
  if (!panel || !key) return;
  requestAnimationFrame(function(){
    var detail = null;
    Array.prototype.some.call(panel.querySelectorAll('[data-pl-detail]'), function(node){
      if (node.getAttribute('data-pl-detail') === key) {
        detail = node;
        return true;
      }
      return false;
    });
    if (!detail) return;
    var anchor = detail.previousElementSibling || detail;
    var top = Math.max(0, anchor.offsetTop - 10);
    try { panel.scrollTo({ top: top, behavior: 'smooth' }); }
    catch (e) { panel.scrollTop = top; }
  });
}

async function openPlaylistPanelDetail(provider, pid, title) {
  if (!pid) return;
  provider = provider === 'qq' ? 'qq' : 'netease';
  var key = playlistPanelKey(provider, pid);
  var pl = userPlaylists.find(function(item){ return playlistPanelKey(item.provider === 'qq' ? 'qq' : 'netease', item.id) === key; }) || { id: pid, provider: provider, name: title || '歌单详情' };
  if (playlistPanelDetailState.key === key && !playlistPanelDetailState.loading && playlistPanelDetailState.tracks.length) {
    playlistPanelDetailState.key = '';
    playlistPanelDetailState.tracks = [];
    playlistPanelDetailState.playlist = null;
    playlistPanelDetailState.renderLimit = PLAYLIST_DETAIL_INITIAL_RENDER;
    renderPlaylistPanelDetailState();
    return;
  }
  var token = ++playlistPanelDetailState.token;
  playlistPanelDetailState = { key: key, loading: true, playlist: pl, tracks: [], token: token, renderLimit: PLAYLIST_DETAIL_INITIAL_RENDER };
  renderPlaylistPanelDetailState();
  scrollPlaylistPanelDetailIntoView(key);
  try {
    var r = provider === 'qq'
      ? await apiJson('/api/qq/playlist/tracks?id=' + encodeURIComponent(pid))
      : await apiJson('/api/playlist/tracks?id=' + encodeURIComponent(pid));
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

function playLoadedPlaylistPanelDetail(startIndex) {
  var st = playlistPanelDetailState;
  if (!st || !st.key || st.loading) return;
  var tracks = st.tracks || [];
  if (!tracks.length) {
    showToast('歌单暂无可播放歌曲');
    return;
  }
  var parts = st.key.split(':');
  var provider = parts[0] === 'qq' ? 'qq' : 'netease';
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
  if (isLikedPlaylistContext(playlistPanelProviderId(provider, pid), title, st.playlist)) markSongsLiked(playQueue, true);
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

function playPlaylistPanelDetail() {
  playLoadedPlaylistPanelDetail(0);
}

function playPlaylistPanelDetailTrack(index) {
  playLoadedPlaylistPanelDetail(index);
}

function openPlaylistPanelDetailArtist(index) {
  var song = playlistPanelDetailState.tracks && playlistPanelDetailState.tracks[index];
  if (song) openArtistDetailForSong(song);
}

function growPlaylistPanelDetailRenderLimit(amount) {
  var st = playlistPanelDetailState;
  var total = st && st.tracks ? st.tracks.length : 0;
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

function maybeGrowPlaylistPanelDetailRenderLimit() {
  var panel = document.getElementById('playlist-panel');
  var st = playlistPanelDetailState;
  if (!panel || !st || st.loading || !st.key || !st.tracks || st.renderLimit >= st.tracks.length) return;
  if (panel.scrollTop + panel.clientHeight >= panel.scrollHeight - 240) {
    growPlaylistPanelDetailRenderLimit();
  }
}

function resetPlaylistPanelRenderLimit() {
  playlistPanelRenderLimit = PLAYLIST_PANEL_BATCH_SIZE;
}

function growPlaylistPanelRenderLimit() {
  var visiblePlaylists = getFilteredUserPlaylists();
  if (!visiblePlaylists.length) return;
  var next = Math.min(visiblePlaylists.length, (playlistPanelRenderLimit || PLAYLIST_PANEL_BATCH_SIZE) + PLAYLIST_PANEL_BATCH_SIZE);
  if (next <= playlistPanelRenderLimit) return;
  playlistPanelRenderLimit = next;
  renderUserPlaylistsList({ animate: true });
}

function bindPlaylistPanelLazyRender() {
  var panel = document.getElementById('playlist-panel');
  if (!panel || playlistPanelLazyBound) return;
  playlistPanelLazyBound = true;
  panel.addEventListener('scroll', function(){
    maybeGrowPlaylistPanelDetailRenderLimit();
    if (queueViewTab !== 'playlists' || playlistPanelRenderLimit >= getFilteredUserPlaylists().length) return;
    if (panel.scrollTop + panel.clientHeight >= panel.scrollHeight - 180) growPlaylistPanelRenderLimit();
  }, { passive: true });
}

function renderUserPlaylistsList(opts) {
  opts = opts || {};
  var $pl = document.getElementById('pl-list');
  var seq = ++playlistRenderSeq;
  if (!userPlaylists.length) {
    $pl.innerHTML = '<div style="text-align:center;padding:24px 0;color:rgba(255,255,255,.32);font-size:11.5px">未找到歌单</div>';
    return;
  }
  function playlistCardHtml(pl) {
    var provider = pl.provider === 'qq' ? 'qq' : 'netease';
    var providerLabel = provider === 'qq' ? 'QQ' : 'NE';
    var thumb = playlistCoverSrc(pl, 88);
    var imgTag = thumb ? '<img src="' + thumb + '" alt="" loading="lazy" decoding="async" onerror="this.style.opacity=0.2">' : '<div style="width:44px;height:44px;border-radius:8px;background:rgba(255,255,255,.06);flex-shrink:0"></div>';
    var key = playlistPanelKey(provider, pl.id);
    var expanded = playlistPanelDetailState.key === key ? ' expanded' : '';
    return '<div class="pl-card' + expanded + '" data-playlist-provider="' + provider + '" data-playlist-id="' + escHtml(String(pl.id || '')) + '" data-playlist-title="' + escHtml(pl.name || '') + '">' +
      imgTag +
      '<div style="flex:1;min-width:0"><div class="pl-name">' + escHtml(pl.name) + '<span class="tag-source ' + provider + '" style="margin-left:6px;vertical-align:1px">' + providerLabel + '</span></div><div class="pl-sub">' + pl.trackCount + ' 首 · ' + escHtml(pl.creator || '') + '</div></div>' +
    '</div>' + playlistPanelDetailHtml(pl, provider);
  }
  var groups = [
    { key:'netease', label:'网易云歌单', items:userPlaylists.filter(function(pl){ return pl.provider !== 'qq'; }) },
    { key:'qq', label:'QQ 音乐歌单', items:userPlaylists.filter(function(pl){ return pl.provider === 'qq'; }) }
  ];
  if (opts.reset) resetPlaylistPanelRenderLimit();
  playlistPanelRenderLimit = Math.max(PLAYLIST_PANEL_BATCH_SIZE, Math.min(userPlaylists.length, playlistPanelRenderLimit || PLAYLIST_PANEL_BATCH_SIZE));
  var renderedCount = 0;
  function visibleGroupItems(items) {
    var room = playlistPanelRenderLimit - renderedCount;
    if (room <= 0) return [];
    var visible = items.slice(0, room);
    renderedCount += visible.length;
    return visible;
  }
  $pl.innerHTML = groups.map(function(group){
    var items = visibleGroupItems(group.items);
    if (!items.length) return '';
    return '<div class="pl-section-label">' + group.label + '</div>' + items.map(playlistCardHtml).join('');
  }).join('') || '<div style="text-align:center;padding:24px 0;color:rgba(255,255,255,.32);font-size:11.5px">未找到歌单</div>';
  if (userPlaylists.length > renderedCount) {
    $pl.insertAdjacentHTML('beforeend', '<button type="button" class="fx-mini-btn ghost pl-load-more" data-pl-load-more="1">加载更多 ' + renderedCount + '/' + userPlaylists.length + '</button>');
  }
  if (opts.animate && seq === playlistRenderSeq) animateVisiblePanelList($pl, '.pl-card', document.getElementById('playlist-panel'));
}

function setProgressVisual(percent) {
  percent = clampRange(percent || 0, 0, 100);
  var fill = document.getElementById('progress-fill');
  var thumb = document.getElementById('progress-thumb');
  if (fill) fill.style.width = percent + '%';
  if (thumb) thumb.style.left = percent + '%';
}

function shouldClosePlaylistPanelFromPointer(ppOn, ex, ppRect) {
  if (!ppOn) return false;
  if (isSecondaryLeftDisplaySeamGuardActive() && ex < SECONDARY_PLAYLIST_SEAM_CLOSE_X) return true;
  return ex > ppRect.right + playlistPanelExitPadding();
}

async function refreshUserPlaylists(force) {
  if (!loginStatus.loggedIn && !qqLoginStatus.loggedIn && !kugouLoginStatus.loggedIn) {
    resetPlaylistPanelRenderLimit();
    document.getElementById('pl-list').innerHTML = '<div style="text-align:center;padding:24px 0;color:rgba(255,255,255,.32);font-size:11.5px">登录后显示个人歌单</div>';
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
      loginStatus.loggedIn ? apiJson('/api/user/playlists') : Promise.resolve({ playlists: [] }),
      loginStatus.loggedIn ? apiJson('/api/podcast/my') : Promise.resolve({ collections: [], loggedIn: false }),
      qqLoginStatus.loggedIn ? apiJson('/api/qq/user/playlists') : Promise.resolve({ playlists: [] }),
      kugouLoginStatus.loggedIn ? apiJson('/api/kugou/user/playlists') : Promise.resolve({ playlists: [] })
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

function playlistPanelKey(provider, id) {
  var p = provider === 'qq' ? 'qq' : (provider === 'kugou' ? 'kugou' : 'netease');
  return p + ':' + String(id || '');
}

function playlistPanelDetailMatches() {
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

function playlistPanelDetailHtml(pl, provider) {
  var key = playlistPanelKey(provider, pl && pl.id);
  if (playlistPanelDetailState.key !== key) return '';
  var tracks = playlistPanelDetailState.tracks || [];
  var loading = playlistPanelDetailState.loading;
  var playDisabled = loading || !tracks.length ? ' disabled aria-disabled="true"' : '';
  var cover = playlistCoverSrc(pl, 96);
  var img = cover ? '<img class="pl-detail-cover" src="' + escHtml(cover) + '" alt="" decoding="async" onerror="this.style.opacity=0.2">' : '<div class="pl-detail-cover"></div>';
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
        var imgTag = thumb ? '<img src="' + escHtml(thumb) + '" alt="" loading="lazy" decoding="async" onerror="this.style.opacity=0.2">' : '<div style="width:34px;height:34px;border-radius:7px;background:rgba(255,255,255,.06);flex:0 0 auto"></div>';
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

function renderPlaylistPanelDetailState() {
  renderUserPlaylistsList();
}

function scrollPlaylistPanelToTop() {
  var panel = document.getElementById('playlist-panel');
  if (!panel) return;
  try { panel.scrollTo({ top: 0, behavior: 'smooth' }); }
  catch (e) { panel.scrollTop = 0; }
}

function scrollPlaylistPanelDetailIntoView(key) {
  var panel = document.getElementById('playlist-panel');
  if (!panel || !key) return;
  requestAnimationFrame(function(){
    var detail = null;
    Array.prototype.some.call(panel.querySelectorAll('[data-pl-detail]'), function(node){
      if (node.getAttribute('data-pl-detail') === key) {
        detail = node;
        return true;
      }
      return false;
    });
    if (!detail) return;
    var anchor = detail.previousElementSibling || detail;
    var top = Math.max(0, anchor.offsetTop - 10);
    try { panel.scrollTo({ top: top, behavior: 'smooth' }); }
    catch (e) { panel.scrollTop = top; }
  });
}

async function openPlaylistPanelDetail(provider, pid, title) {
  if (!pid) return;
  provider = provider === 'qq' ? 'qq' : (provider === 'kugou' ? 'kugou' : 'netease');
  var key = playlistPanelKey(provider, pid);
  var pl = userPlaylists.find(function(item){ return playlistPanelKey(item.provider === 'qq' ? 'qq' : (item.provider === 'kugou' ? 'kugou' : 'netease'), item.id) === key; }) || { id: pid, provider: provider, name: title || 'Playlist Detail' };
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
    var r = provider === 'qq'
      ? await apiJson('/api/qq/playlist/tracks?id=' + encodeURIComponent(pid))
      : (provider === 'kugou'
        ? await apiJson('/api/kugou/playlist/tracks?id=' + encodeURIComponent(pid))
        : await apiJson('/api/playlist/tracks?id=' + encodeURIComponent(pid)));
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

function playPlaylistPanelDetail() {
  playLoadedPlaylistPanelDetail(0);
}

function playPlaylistPanelDetailTrack(index) {
  playLoadedPlaylistPanelDetail(index);
}

function openPlaylistPanelDetailArtist(index) {
  var song = playlistPanelDetailState.tracks && playlistPanelDetailState.tracks[index];
  if (song) openArtistDetailForSong(song);
}

function growPlaylistPanelDetailRenderLimit(amount) {
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

function maybeGrowPlaylistPanelDetailRenderLimit() {
  var panel = document.getElementById('playlist-panel');
  var st = playlistPanelDetailState;
  if (!panel || !st || st.loading || !st.key || !st.tracks || st.renderLimit >= playlistPanelDetailMatches().length) return;
  if (panel.scrollTop + panel.clientHeight >= panel.scrollHeight - 240) {
    growPlaylistPanelDetailRenderLimit();
  }
}

function resetPlaylistPanelRenderLimit() {
  playlistPanelRenderLimit = PLAYLIST_PANEL_BATCH_SIZE;
}

function growPlaylistPanelRenderLimit() {
  var visiblePlaylists = getFilteredUserPlaylists();
  if (!visiblePlaylists.length) return;
  var next = Math.min(visiblePlaylists.length, (playlistPanelRenderLimit || PLAYLIST_PANEL_BATCH_SIZE) + PLAYLIST_PANEL_BATCH_SIZE);
  if (next <= playlistPanelRenderLimit) return;
  playlistPanelRenderLimit = next;
  renderUserPlaylistsList({ animate: true });
}

function bindPlaylistPanelLazyRender() {
  var panel = document.getElementById('playlist-panel');
  if (!panel || playlistPanelLazyBound) return;
  playlistPanelLazyBound = true;
  panel.addEventListener('scroll', function(){
    maybeGrowPlaylistPanelDetailRenderLimit();
    if (queueViewTab !== 'playlists' || playlistPanelRenderLimit >= getFilteredUserPlaylists().length) return;
    if (panel.scrollTop + panel.clientHeight >= panel.scrollHeight - 180) growPlaylistPanelRenderLimit();
  }, { passive: true });
}

function renderUserPlaylistsList(opts) {
  opts = opts || {};
  var $pl = document.getElementById('pl-list');
  var seq = ++playlistRenderSeq;
  renderPlaylistSourceFilter();
  var filteredPlaylists = getFilteredUserPlaylists();
  if (!filteredPlaylists.length) {
    $pl.innerHTML = '<div style="text-align:center;padding:24px 0;color:rgba(255,255,255,.32);font-size:11.5px">未找到歌单</div>';
    return;
  }
  function playlistCardHtml(pl) {
    var provider = pl.provider === 'qq' ? 'qq' : (pl.provider === 'kugou' ? 'kugou' : 'netease');
    var providerLabel = provider === 'qq' ? 'QQ' : (provider === 'kugou' ? 'KG' : 'NE');
    var thumb = playlistCoverSrc(pl, 88);
    var imgTag = thumb ? '<img src="' + thumb + '" alt="" loading="lazy" decoding="async" onerror="this.style.opacity=0.2">' : '<div style="width:44px;height:44px;border-radius:8px;background:rgba(255,255,255,.06);flex-shrink:0"></div>';
    var key = playlistPanelKey(provider, pl.id);
    var expanded = playlistPanelDetailState.key === key ? ' expanded' : '';
    return '<div class="pl-card' + expanded + '" data-playlist-provider="' + provider + '" data-playlist-id="' + escHtml(String(pl.id || '')) + '" data-playlist-title="' + escHtml(pl.name || '') + '">' +
      imgTag +
      '<div style="flex:1;min-width:0"><div class="pl-name">' + escHtml(pl.name) + '<span class="tag-source ' + provider + '" style="margin-left:6px;vertical-align:1px">' + providerLabel + '</span></div><div class="pl-sub">' + pl.trackCount + ' 首 · ' + escHtml(pl.creator || '') + '</div></div>' +
    '</div>' + playlistPanelDetailHtml(pl, provider);
  }
  var groups = [
    { key:'netease', label:'网易云歌单', items:filteredPlaylists.filter(function(pl){ return playlistSourceKey(pl) === 'netease'; }) },
    { key:'qq', label:'QQ 音乐歌单', items:filteredPlaylists.filter(function(pl){ return playlistSourceKey(pl) === 'qq'; }) },
    { key:'kugou', label:'酷狗音乐歌单', items:filteredPlaylists.filter(function(pl){ return playlistSourceKey(pl) === 'kugou'; }) }
  ].filter(function(group){ return group.key === playlistSourceFilter; });
  if (opts.reset) resetPlaylistPanelRenderLimit();
  playlistPanelRenderLimit = Math.max(PLAYLIST_PANEL_BATCH_SIZE, Math.min(filteredPlaylists.length, playlistPanelRenderLimit || PLAYLIST_PANEL_BATCH_SIZE));
  var renderedCount = 0;
  function visibleGroupItems(items) {
    var room = playlistPanelRenderLimit - renderedCount;
    if (room <= 0) return [];
    var visible = items.slice(0, room);
    renderedCount += visible.length;
    return visible;
  }
  $pl.innerHTML = groups.map(function(group){
    var items = visibleGroupItems(group.items);
    if (!items.length) return '';
    return '<div class="pl-section-label">' + group.label + '</div>' + items.map(playlistCardHtml).join('');
  }).join('') || '<div style="text-align:center;padding:24px 0;color:rgba(255,255,255,.32);font-size:11.5px">未找到歌单</div>';
  if (filteredPlaylists.length > renderedCount) {
    $pl.insertAdjacentHTML('beforeend', '<button type="button" class="fx-mini-btn ghost pl-load-more" data-pl-load-more="1">加载更多 ' + renderedCount + '/' + filteredPlaylists.length + '</button>');
  }
  if (opts.animate && seq === playlistRenderSeq) animateVisiblePanelList($pl, '.pl-card', document.getElementById('playlist-panel'));
}

function __mineradioInitLibraryPlaylistPanel42() {
  document.addEventListener('click', function(e){
    if (miniQueueOpen && !(e.target && e.target.closest && e.target.closest('#bottom-bar'))) closeMiniQueue();
  });

  bindSmoothQueueScrolling();

  bindPlaylistPanelLazyRender();

  bindModalBackdropClose();

  playlistPanelDetailState = { key: '', loading: false, playlist: null, tracks: [], token: 0, renderLimit: PLAYLIST_DETAIL_INITIAL_RENDER };

  document.getElementById('pl-list').addEventListener('click', function(e){
    var collapseDetail = e.target && e.target.closest ? e.target.closest('[data-pl-detail-collapse]') : null;
    if (collapseDetail) {
      e.preventDefault();
      e.stopPropagation();
      collapsePlaylistPanelDetail();
      return;
    }
    var loadMore = e.target && e.target.closest ? e.target.closest('[data-pl-load-more]') : null;
    if (loadMore) {
      e.preventDefault();
      e.stopPropagation();
      growPlaylistPanelRenderLimit();
      return;
    }
    var detailLoadMore = e.target && e.target.closest ? e.target.closest('[data-pl-detail-load-more]') : null;
    if (detailLoadMore) {
      e.preventDefault();
      e.stopPropagation();
      growPlaylistPanelDetailRenderLimit();
      return;
    }
    var detailTop = e.target && e.target.closest ? e.target.closest('[data-pl-detail-top]') : null;
    if (detailTop) {
      e.preventDefault();
      e.stopPropagation();
      scrollPlaylistPanelToTop();
      return;
    }
    var playDetail = e.target && e.target.closest ? e.target.closest('[data-pl-detail-play]') : null;
    if (playDetail) {
      e.preventDefault();
      e.stopPropagation();
      playPlaylistPanelDetail();
      return;
    }
    var artist = e.target && e.target.closest ? e.target.closest('[data-pl-detail-artist]') : null;
    if (artist) {
      e.preventDefault();
      e.stopPropagation();
      openPlaylistPanelDetailArtist(Number(artist.getAttribute('data-pl-detail-artist')));
      return;
    }
    var row = e.target && e.target.closest ? e.target.closest('[data-pl-detail-row]') : null;
    if (row) {
      e.preventDefault();
      e.stopPropagation();
      playPlaylistPanelDetailTrack(Number(row.getAttribute('data-pl-detail-row')));
      return;
    }
    var card = e.target && e.target.closest ? e.target.closest('.pl-card') : null;
    if (!card) return;
    var provider = card.getAttribute('data-playlist-provider') || 'netease';
    var pid = card.getAttribute('data-playlist-id') || '';
    openPlaylistPanelDetail(provider, pid, card.getAttribute('data-playlist-title') || '');
  });

  podcastListEl = document.getElementById('podcast-list');

  if (podcastListEl) {
    podcastListEl.addEventListener('click', function(e){
      if (e.target && e.target.closest && e.target.closest('[data-podcast-back]')) {
        renderMyPodcastCollections({ animate: true });
        return;
      }
      var radioCard = e.target && e.target.closest ? e.target.closest('[data-podcast-radio-id]') : null;
      if (radioCard) {
        loadPodcastRadioIntoQueue(radioCard.getAttribute('data-podcast-radio-id'), true, radioCard.getAttribute('data-podcast-title') || '');
        return;
      }
      var card = e.target && e.target.closest ? e.target.closest('[data-podcast-key]') : null;
      if (!card) return;
      openMyPodcastCollection(card.getAttribute('data-podcast-key'), card.getAttribute('data-podcast-title') || '');
    });
  }

  // 进度条
  progressDragState = { active: false, lastParticleAt: 0 };

  progressBar = document.getElementById('progress-bar');

  progressBar.addEventListener('pointerdown', function(e){
    if (!audio || !audio.duration) return;
    progressDragState.active = true;
    progressBar.classList.add('is-dragging');
    try { progressBar.setPointerCapture(e.pointerId); } catch (err) {}
    seekFromProgressPointer(e, true);
  });

  progressBar.addEventListener('pointermove', function(e){
    if (!progressDragState.active) return;
    seekFromProgressPointer(e, true);
  });

  progressBar.addEventListener('pointerup', endProgressDrag);

  progressBar.addEventListener('pointercancel', endProgressDrag);

  progressBar.addEventListener('lostpointercapture', function(){ progressDragState.active = false; progressBar.classList.remove('is-dragging'); });

  playbackProgressIdleSynced = false;

  function schedulePlaybackProgressTick() {
    var delay = 500;
    if (!audio) {
      if (!playbackProgressIdleSynced) {
        updatePlaybackProgressUi();
        playbackProgressIdleSynced = true;
      }
      delay = 1000;
    } else {
      playbackProgressIdleSynced = false;
      if (!playing || audio.paused) {
        if (progressDragState.active) updatePlaybackProgressUi();
      } else {
        updateListenStatsTick(false);
        updatePlaybackProgressUi();
        if (audio.currentTime) updateLyricsHighlight();
        delay = 200;
      }
    }
    setTimeout(schedulePlaybackProgressTick, delay);
  }
  schedulePlaybackProgressTick();
}
