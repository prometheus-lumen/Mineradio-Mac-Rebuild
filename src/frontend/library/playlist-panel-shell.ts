// Mineradio classic module: library/playlist-panel.
function playlistSourceKey(pl?: AccountPlaylist | null): PlaylistPanelProvider {
  return pl && pl.provider === 'qq' ? 'qq' : (pl && pl.provider === 'kugou' ? 'kugou' : 'netease');
}

function playlistCoverSrc(pl: AccountPlaylist | null, size: number): string {
  if (!pl || !pl.cover) return '';
  var url = playlistSourceKey(pl) === 'netease' ? coverUrlWithSize(pl.cover, size) : pl.cover;
  return coverProxySrc(url);
}

function availablePlaylistSources(): Array<{ key: PlaylistPanelProvider; label: string; loggedIn: boolean }> {
  var sources: Array<{ key: PlaylistPanelProvider; label: string; loggedIn: boolean }> = [
    { key: 'netease', label: '网易云', loggedIn: !!(loginStatus && loginStatus.loggedIn) },
    { key: 'qq', label: 'QQ 音乐', loggedIn: !!(qqLoginStatus && qqLoginStatus.loggedIn) },
    { key: 'kugou', label: '酷狗音乐', loggedIn: !!(kugouLoginStatus && kugouLoginStatus.loggedIn) }
  ];
  return sources.filter(function(source){
    return source.loggedIn || userPlaylists.some(function(pl){ return playlistSourceKey(pl) === source.key; });
  });
}

function normalizePlaylistSourceFilter(): string {
  var sources = availablePlaylistSources();
  if (!sources.length) return '';
  if (!sources.some(function(source){ return source.key === playlistSourceFilter; })) playlistSourceFilter = sources[0].key;
  return playlistSourceFilter;
}

function getFilteredUserPlaylists(): AccountPlaylist[] {
  var source = normalizePlaylistSourceFilter();
  return source ? userPlaylists.filter(function(pl){ return playlistSourceKey(pl) === source; }) : [];
}

function renderPlaylistSourceFilter(): void {
  var el = document.getElementById('playlist-source-filter');
  if (!el) return;
  var sources = availablePlaylistSources();
  var active = normalizePlaylistSourceFilter();
  el.style.display = sources.length ? '' : 'none';
  el.innerHTML = sources.map(function(source){
    return '<button type="button" role="tab" aria-selected="' + (source.key === active ? 'true' : 'false') + '" class="' + (source.key === active ? 'active' : '') + '" data-playlist-source="' + source.key + '" data-action="setPlaylistSourceFilter" data-value="' + source.key + '">' + source.label + '</button>';
  }).join('');
}

function setPlaylistSourceFilter(source: string): void {
  if (!availablePlaylistSources().some(function(item){ return item.key === source; })) return;
  playlistSourceFilter = source;
  try { localStorage.setItem(PLAYLIST_SOURCE_FILTER_STORE_KEY, source); } catch (e) {}
  playlistPanelDetailState = { key: '', loading: false, playlist: null, tracks: [], token: (playlistPanelDetailState.token || 0) + 1, renderLimit: PLAYLIST_DETAIL_INITIAL_RENDER };
  resetPlaylistPanelRenderLimit();
  renderUserPlaylistsList({ animate: true, reset: true });
}

function collapsePlaylistPanelDetail(): void {
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

function isPlaylistPanelVisibleForRender(): boolean {
  var panel = document.getElementById('playlist-panel');
  var panelOpen = panel && (panel.classList.contains('show') || panel.classList.contains('peek') || panel.classList.contains('pinned'));
  return !!(panelOpen || miniQueueOpen);
}

function isNoLyricText(text: string): boolean {
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
function animateListItems(container: Element | null, selector: string, opts: ListAnimationOptions = {}): void {
  if (!container || !window.gsap) return;
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

function smoothScrollToItem(scroller: SmoothScroller | null, item: HTMLElement | null, opts: SmoothScrollOptions = {}): void {
  if (!scroller || !item) return;
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

function animateVisiblePanelList(listEl: Element | null, selector: string, scroller: SmoothScroller | null, activeSelector?: string, opts: SmoothScrollOptions = {}): void {
  if (!listEl) return;
  requestAnimationFrame(function(){
    animateListItems(listEl, selector, { x: -8, y: 6, stagger: 0.01, duration: 0.20, limit: 16 });
    var active = activeSelector ? listEl.querySelector<HTMLElement>(activeSelector) : null;
    if (active && scroller && opts.scrollActive !== false) smoothScrollToItem(scroller, active, { duration: 0.32 });
  });
}

function guardPlaylistPanelOpen(ms = 1400): void {
  playlistPanelOpenGuardUntil = performance.now() + (ms || 1400);
  if (peekTimers && peekTimers.pl) {
    clearTimeout(peekTimers.pl);
    peekTimers.pl = null;
  }
}

function togglePlaylistPanel(force?: boolean): void {
  var el = document.getElementById('playlist-panel');
  if (!el) return;
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

function applyPlaylistPanelPinState(openPanel = false): void {
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

function setPlaylistPanelPinned(on: boolean, silent = false): void {
  playlistPanelPinned = !!on;
  saveBooleanPreference(PLAYLIST_PANEL_PIN_STORE_KEY, playlistPanelPinned);
  applyPlaylistPanelPinState(playlistPanelPinned);
  if (!silent) showToast(playlistPanelPinned ? '左侧歌单已常开' : '左侧歌单已恢复自动隐藏');
}

function togglePlaylistPanelPinned(): void {
  setPlaylistPanelPinned(!playlistPanelPinned);
}

function scrollPlaylistPanelToCurrent(): void {
  var panel = document.getElementById('playlist-panel');
  var list = document.getElementById('queue-list');
  if (!panel || !list || queueViewTab !== 'queue') return;
  var queueList = list;
  var now = performance.now();
  if (panel.__lastCurrentScrollAt && now - panel.__lastCurrentScrollAt < 650) return;
  panel.__lastCurrentScrollAt = now;
  requestAnimationFrame(function(){
    smoothScrollToItem(panel, queueList.querySelector<HTMLElement>('.queue-item.now'), { duration: 0.28, align: 0.34 });
  });
}

function switchPlaylistTab(tab: string): void {
  var nextTab: PlaylistPanelTab = tab === 'podcasts' ? 'podcasts' : (tab === 'playlists' ? 'playlists' : 'queue');
  queueViewTab = nextTab;
  document.getElementById('tab-queue')?.classList.toggle('active', nextTab === 'queue');
  document.getElementById('tab-pl')?.classList.toggle('active', nextTab === 'playlists');
  var podcastTab = document.getElementById('tab-podcast');
  if (podcastTab) podcastTab.classList.toggle('active', nextTab === 'podcasts');
  var queuePane = document.getElementById('queue-pane');
  var playlistPane = document.getElementById('pl-pane');
  if (queuePane) queuePane.style.display = nextTab === 'queue' ? '' : 'none';
  if (playlistPane) playlistPane.style.display = nextTab === 'playlists' ? '' : 'none';
  var podcastPane = document.getElementById('podcast-pane');
  if (podcastPane) podcastPane.style.display = nextTab === 'podcasts' ? '' : 'none';
  if (nextTab === 'playlists' || nextTab === 'podcasts') refreshUserPlaylists();
  var panel = document.getElementById('playlist-panel');
  if (nextTab === 'queue') animateVisiblePanelList(document.getElementById('queue-list'), '.queue-item', panel, '.queue-item.now');
  if (nextTab === 'playlists') animateVisiblePanelList(document.getElementById('pl-list'), '.pl-card', panel);
  if (nextTab === 'podcasts') animateVisiblePanelList(document.getElementById('podcast-list'), '.pl-card', panel);
}

function openPlaylistPanelTab(tab: string, preserve = true): void {
  tab = tab === 'podcasts' ? 'podcasts' : (tab === 'playlists' ? 'playlists' : 'queue');
  var panel = document.getElementById('playlist-panel');
  if (panel && panel.dataset && preserve !== false) panel.dataset.preserveTabOnOpen = '1';
  guardPlaylistPanelOpen(1400);
  switchPlaylistTab(tab);
  setPeek(panel, true, 'pl');
}
