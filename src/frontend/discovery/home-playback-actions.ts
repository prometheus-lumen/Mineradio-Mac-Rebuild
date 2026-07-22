function playHomeSong(index = 0): void {
  homeForcedOpen = false;
  homeSuppressed = false;
  setHomeControlsLocked(false);
  var song = homeDiscoverState.songs[index];
  if (!song) {
    if (index > 0) playHomePrivateRadio();
    else playHomeDaily();
    return;
  }
  playQueue = homeDiscoverState.songs.map(cloneSong);
  currentIdx = Math.max(0, Math.min(playQueue.length - 1, index));
  safeRenderQueuePanel('home-song-card');
  safeShelfRebuild('home-song-card', true);
  forcePlaybackControlsInteractive();
  playQueueAt(currentIdx).catch(function(e){ console.warn('[HomeSongPlay]', e); });
}

function openHomePlaylist(index = 0): void {
  homeForcedOpen = false;
  homeSuppressed = false;
  setHomeControlsLocked(false);
  if (!hasAnyPlatformLogin() && !homeDiscoverState.loggedIn) {
    runHomeSearch('');
    return;
  }
  openPlaylistPanelTab('playlists', true);
  var item = homeDiscoverState.playlists[index];
  if (!item || !item.id) {
    openHomeLibrary();
    return;
  }
  loadPlaylistIntoQueueById(item.id, true, item.name || '');
}

function openHomePodcast(index = 0): void {
  homeForcedOpen = false;
  homeSuppressed = false;
  setHomeControlsLocked(false);
  openPlaylistPanelTab('podcasts', true);
  var item = homeDiscoverState.podcasts[index];
  if (!item || !item.id) {
    setSearchMode('podcast');
    loadPodcastHot();
    return;
  }
  loadPodcastRadioIntoQueue(item.id, true, item.name || '');
}

function openHomeThirdCard(): void {
  if (!hasAnyPlatformLogin() && !homeDiscoverState.loggedIn) {
    openHomeLocalImport();
    return;
  }
  openHomePodcast(0);
}

function openHomeLibrary(): void {
  if (localLibraryState && localLibraryState.songs && localLibraryState.songs.length) {
    openLocalLibrary();
    return;
  }
  if (!hasAnyPlatformLogin() && !homeDiscoverState.loggedIn) {
    openLocalLibrary();
    return;
  }
  homeSuppressed = false;
  setHomeControlsLocked(false);
  openPlaylistPanelTab('playlists', true);
  refreshUserPlaylists(true);
}

function goHome(): void {
  if (homeForcedOpen || emptyHomeActive) {
    dismissHomePage({ toast: true });
    showToast('已关闭 Home');
    return;
  }
  homeSuppressed = false;
  homeForcedOpen = true;
  setHomeControlsLocked(true);
  if (shelfManager && shelfManager.hasOpenContent && shelfManager.hasOpenContent()) safeShelfCloseContent('open-empty-home');
  if (typeof setShelfPinnedOpen === 'function') setShelfPinnedOpen(false, true);
  togglePlaylistPanel(false);
  setPeek(document.getElementById('playlist-panel'), false, 'pl');
  setPeek(document.getElementById('fx-panel'), false, 'fx');
  setPeek(document.getElementById('search-area'), true, 'search');
  if (typeof setFocusZone === 'function') setFocusZone(null, true);
  if (orbit && orbit.focus) orbit.focus.active = false;
  updateEmptyHomeVisibility({ forceLoad: true });
  showToast('已回到 Home');
}

function dismissHomePage(_opts: { reason?: string; toast?: boolean } = {}): void {
  homeForcedOpen = false;
  homeSuppressed = true;
  setHomeControlsLocked(false);
  updateEmptyHomeVisibility({ forceLoad: false });
  setPeek(document.getElementById('search-area'), false, 'search');
  if (typeof setFocusZone === 'function') setFocusZone(null, true);
}

function isPointNearHomeContent(x: number, y: number): boolean {
  var selectors = [
    '.home-card',
    '.home-tile',
    '.home-chip',
    '.home-sleep-trigger-wrap',
    '.home-card-menu',
    '.home-restore-pop',
    '.home-settings-pop',
    '.home-grid-restore'
  ];
  for (var i = 0; i < selectors.length; i++) {
    var nodes = document.querySelectorAll(selectors[i]);
    for (var j = 0; j < nodes.length; j++) {
      if (isPointInsideRectWithPad(x, y, nodes[j].getBoundingClientRect(), 12)) return true;
    }
  }
  return false;
}

function isHomeBlankDismissClick(e: MouseEvent): boolean {
  if (!emptyHomeActive || !e || e.defaultPrevented) return false;
  if (e.button != null && e.button !== 0) return false;
  if (e.ctrlKey || e.metaKey || e.altKey || e.shiftKey) return false;
  var target = e.target;
  if (!(target instanceof Element)) return false;
  var blockedSelector = [
    'button',
    'a',
    'input',
    'textarea',
    'select',
    '[contenteditable="true"]',
    '#desktop-titlebar',
    '#search-area',
    '#top-right',
    '#bottom-bar',
    '#bottom-handle',
    '.home-sleep-trigger-wrap',
    '#fx-fab',
    '#fx-fab-hide-btn',
    '#fx-panel',
    '#playlist-panel',
    '#mini-queue-popover',
    '#visual-guide',
    '#upload-tip',
    '#toast',
    '#trial-banner',
    '#source-fallback-notice',
    '.modal-mask',
    '.modal',
    '.track-detail-modal',
    '.cover-color-pop',
    '.color-lab-pop',
    '.home-card-menu',
    '.home-restore-pop',
    '.home-settings-pop'
  ].join(',');
  if (target.closest(blockedSelector)) return false;
  var x = e.clientX;
  var y = e.clientY;
  var home = document.getElementById('empty-home');
  if (!home) return false;
  var homeRect = home.getBoundingClientRect();
  if (!isPointInsideRectWithPad(x, y, homeRect, 0)) return false;
  if (isPointNearHomeContent(x, y)) return false;
  return true;
}

async function playHomeRecent(record?: HomeListenRecord | null): Promise<void> {
  record = record || homeListenSummary().recent;
  if (!record) {
    showToast('还没有听歌记录');
    return;
  }
  var song = songFromListenRecord(record);
  if (!song || (!song.id && !song.mid)) {
    runHomeSearch(record.name || '');
    return;
  }
  activeRadioContext = null;
  playQueue = [cloneSong(song)];
  currentIdx = 0;
  safeRenderQueuePanel('home-recent-song');
  safeShelfRebuild('home-recent-song', true);
  forcePlaybackControlsInteractive();
  await playQueueAt(0);
}
