function bindStartupPlaylistEvents(): void {
  playlistPanelDetailState = { key: '', loading: false, playlist: null, tracks: [], token: 0, renderLimit: PLAYLIST_DETAIL_INITIAL_RENDER, query: '' };
  var list = document.getElementById('pl-list');
  if (!list) return;

  list.addEventListener('click', function(e) {
    var target = e.target instanceof Element ? e.target : null;
    if (!target) return;
    var clearSearch = target.closest('[data-pl-detail-search-clear]');
    if (clearSearch) {
      e.preventDefault();
      e.stopPropagation();
      playlistPanelDetailState.query = '';
      playlistPanelDetailState.renderLimit = PLAYLIST_DETAIL_INITIAL_RENDER;
      renderPlaylistPanelDetailState();
      requestAnimationFrame(function(){
        var input = document.querySelector<HTMLInputElement>('[data-pl-detail-search]');
        if (input) input.focus();
      });
      return;
    }
    var collapseDetail = target.closest('[data-pl-detail-collapse]');
    if (collapseDetail) {
      e.preventDefault();
      e.stopPropagation();
      collapsePlaylistPanelDetail();
      return;
    }
    var loadMore = target.closest('[data-pl-load-more]');
    if (loadMore) {
      e.preventDefault();
      e.stopPropagation();
      growPlaylistPanelRenderLimit();
      return;
    }
    var detailLoadMore = target.closest('[data-pl-detail-load-more]');
    if (detailLoadMore) {
      e.preventDefault();
      e.stopPropagation();
      growPlaylistPanelDetailRenderLimit();
      return;
    }
    var detailTop = target.closest('[data-pl-detail-top]');
    if (detailTop) {
      e.preventDefault();
      e.stopPropagation();
      scrollPlaylistPanelToTop();
      return;
    }
    var playDetail = target.closest('[data-pl-detail-play]');
    if (playDetail) {
      e.preventDefault();
      e.stopPropagation();
      playPlaylistPanelDetail();
      return;
    }
    var artist = target.closest('[data-pl-detail-artist]');
    if (artist) {
      e.preventDefault();
      e.stopPropagation();
      openPlaylistPanelDetailArtist(Number(artist.getAttribute('data-pl-detail-artist')));
      return;
    }
    var row = target.closest('[data-pl-detail-row]');
    if (row) {
      e.preventDefault();
      e.stopPropagation();
      playPlaylistPanelDetailTrack(Number(row.getAttribute('data-pl-detail-row')));
      return;
    }
    var card = target.closest('.pl-card');
    if (!card) return;
    var provider = card.getAttribute('data-playlist-provider') || 'netease';
    var pid = card.getAttribute('data-playlist-id') || '';
    openPlaylistPanelDetail(provider, pid, card.getAttribute('data-playlist-title') || '');
  }, mineradioEventOptions());

  list.addEventListener('input', function(e) {
    var input = e.target instanceof HTMLInputElement && e.target.matches('[data-pl-detail-search]')
      ? e.target as ComposingInputElement
      : null;
    if (!input) return;
    if ((e as InputEvent).isComposing || input._mineradioComposing) return;
    var panel = document.getElementById('playlist-panel');
    var keepTop = panel ? panel.scrollTop : 0;
    playlistPanelDetailState.query = input.value || '';
    playlistPanelDetailState.renderLimit = PLAYLIST_DETAIL_INITIAL_RENDER;
    renderPlaylistPanelDetailState();
    if (panel) panel.scrollTop = keepTop;
    requestAnimationFrame(function(){
      var nextInput = document.querySelector<HTMLInputElement>('[data-pl-detail-search]');
      if (!nextInput) return;
      nextInput.focus();
      var end = nextInput.value.length;
      try { nextInput.setSelectionRange(end, end); } catch (err) {}
    });
  }, mineradioEventOptions());

  list.addEventListener('compositionstart', function(e) {
    var input = e.target instanceof HTMLInputElement && e.target.matches('[data-pl-detail-search]')
      ? e.target as ComposingInputElement
      : null;
    if (input) input._mineradioComposing = true;
  }, mineradioEventOptions());

  list.addEventListener('compositionend', function(e) {
    var input = e.target instanceof HTMLInputElement && e.target.matches('[data-pl-detail-search]')
      ? e.target as ComposingInputElement
      : null;
    if (!input) return;
    input._mineradioComposing = false;
    input.dispatchEvent(new Event('input', { bubbles: true }));
  }, mineradioEventOptions());
}
