function eventClosest(event: Event, selector: string): HTMLElement | null {
  return event.target instanceof Element ? event.target.closest<HTMLElement>(selector) : null;
}

function renderUserPlaylistsList(opts: PlaylistPanelRenderOptions = {}): void {
  var $pl = document.getElementById('pl-list');
  if (!$pl) return;
  var seq = ++playlistRenderSeq;
  renderPlaylistSourceFilter();
  var filteredPlaylists = getFilteredUserPlaylists();
  if (!filteredPlaylists.length) {
    $pl.innerHTML = '<div style="text-align:center;padding:24px 0;color:rgba(255,255,255,.32);font-size:11.5px">未找到歌单</div>';
    return;
  }
  function playlistCardHtml(pl: AccountPlaylist): string {
    var provider: PlaylistPanelProvider = pl.provider === 'qq' ? 'qq' : (pl.provider === 'kugou' ? 'kugou' : 'netease');
    var providerLabel = provider === 'qq' ? 'QQ' : (provider === 'kugou' ? 'KG' : 'NE');
    var thumb = playlistCoverSrc(pl, 88);
    var imgTag = thumb ? '<img src="' + thumb + '" alt="" loading="lazy" decoding="async" data-fade-on-error="0.2">' : '<div style="width:44px;height:44px;border-radius:8px;background:rgba(255,255,255,.06);flex-shrink:0"></div>';
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
  function visibleGroupItems(items: AccountPlaylist[]): AccountPlaylist[] {
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

function __mineradioInitLibraryPlaylistPanel42(): void {
  document.addEventListener('click', function(e){
    if (miniQueueOpen && !eventClosest(e, '#bottom-bar')) closeMiniQueue();
  });

  bindSmoothQueueScrolling();

  bindPlaylistPanelLazyRender();

  bindModalBackdropClose();

  playlistPanelDetailState = { key: '', loading: false, playlist: null, tracks: [], token: 0, renderLimit: PLAYLIST_DETAIL_INITIAL_RENDER };

  var playlistList = document.getElementById('pl-list');
  playlistList?.addEventListener('click', function(e): void {
    var collapseDetail = eventClosest(e, '[data-pl-detail-collapse]');
    if (collapseDetail) {
      e.preventDefault();
      e.stopPropagation();
      collapsePlaylistPanelDetail();
      return;
    }
    var loadMore = eventClosest(e, '[data-pl-load-more]');
    if (loadMore) {
      e.preventDefault();
      e.stopPropagation();
      growPlaylistPanelRenderLimit();
      return;
    }
    var detailLoadMore = eventClosest(e, '[data-pl-detail-load-more]');
    if (detailLoadMore) {
      e.preventDefault();
      e.stopPropagation();
      growPlaylistPanelDetailRenderLimit();
      return;
    }
    var detailTop = eventClosest(e, '[data-pl-detail-top]');
    if (detailTop) {
      e.preventDefault();
      e.stopPropagation();
      scrollPlaylistPanelToTop();
      return;
    }
    var playDetail = eventClosest(e, '[data-pl-detail-play]');
    if (playDetail) {
      e.preventDefault();
      e.stopPropagation();
      playPlaylistPanelDetail();
      return;
    }
    var artist = eventClosest(e, '[data-pl-detail-artist]');
    if (artist) {
      e.preventDefault();
      e.stopPropagation();
      openPlaylistPanelDetailArtist(Number(artist.getAttribute('data-pl-detail-artist')));
      return;
    }
    var row = eventClosest(e, '[data-pl-detail-row]');
    if (row) {
      e.preventDefault();
      e.stopPropagation();
      playPlaylistPanelDetailTrack(Number(row.getAttribute('data-pl-detail-row')));
      return;
    }
    var card = eventClosest(e, '.pl-card');
    if (!card) return;
    var provider = card.getAttribute('data-playlist-provider') || 'netease';
    var pid = card.getAttribute('data-playlist-id') || '';
    openPlaylistPanelDetail(provider, pid, card.getAttribute('data-playlist-title') || '');
  });

  podcastListEl = document.getElementById('podcast-list');

  if (podcastListEl) {
    podcastListEl.addEventListener('click', function(e){
      if (eventClosest(e, '[data-podcast-back]')) {
        renderMyPodcastCollections({ animate: true });
        return;
      }
      var radioCard = eventClosest(e, '[data-podcast-radio-id]');
      if (radioCard) {
        var radioId = radioCard.getAttribute('data-podcast-radio-id');
        if (radioId) loadPodcastRadioIntoQueue(radioId, true, radioCard.getAttribute('data-podcast-title') || '');
        return;
      }
      var card = eventClosest(e, '[data-podcast-key]');
      if (!card) return;
      var podcastKey = card.getAttribute('data-podcast-key');
      if (podcastKey) openMyPodcastCollection(podcastKey, card.getAttribute('data-podcast-title') || '');
    });
  }

  // 进度条
  progressDragState = { active: false, lastParticleAt: 0 };

  var progress = document.getElementById('progress-bar');
  if (!progress) return;
  progressBar = progress;

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
