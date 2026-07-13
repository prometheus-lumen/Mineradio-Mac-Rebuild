'use strict';

// Mineradio classic module: discovery/home-actions.
function homeCardLabel(id) {
  return HOME_CARD_LABELS[id] || id;
}

function setHomeCardOrderFromDom() {
  var grid = document.getElementById('home-card-grid');
  if (!grid) return;
  var state = readHomeCardLayout();
  state.order = Array.prototype.map.call(grid.querySelectorAll('.home-card[data-home-card]'), function(card){
    return card.getAttribute('data-home-card');
  }).filter(function(id){ return HOME_CARD_DEFAULT_ORDER.indexOf(id) >= 0; });
  HOME_CARD_DEFAULT_ORDER.forEach(function(id){ if (state.order.indexOf(id) < 0) state.order.push(id); });
  saveHomeCardLayout();
  applyHomeCardLayout();
}

function closeHomeCardMenu() {
  var menu = document.getElementById('home-card-menu');
  if (menu) {
    menu.classList.remove('show');
    menu.removeAttribute('data-card-id');
  }
}

function showHomeCardMenu(card, x, y) {
  var id = card && card.getAttribute && card.getAttribute('data-home-card');
  if (!id) return;
  closeHomeRestoreMenu();
  closeHomeSettingsMenu();
  var menu = document.getElementById('home-card-menu');
  if (!menu) return;
  menu.setAttribute('data-card-id', id);
  menu.innerHTML = '<button class="danger" type="button" data-home-card-delete="1">删除</button>';
  placeFloatingPanel(menu, x, y);
}

function toggleHomeHeroSide() {
  var state = readHomeCardLayout();
  state.heroSide = 'left';
  saveHomeCardLayout();
  applyHomeCardLayout();
  closeHomeCardMenu();
}

function homeCardRows(grid, dragged) {
  var cards = Array.prototype.filter.call(grid.querySelectorAll('.home-card[data-home-card]:not(.home-card-hidden)'), function(card){
    return card !== dragged;
  }).map(function(card){
    var rect = card.getBoundingClientRect();
    return { card: card, rect: rect };
  }).sort(function(a, b){
    return Math.abs(a.rect.top - b.rect.top) > 8 ? a.rect.top - b.rect.top : a.rect.left - b.rect.left;
  });
  var rows = [];
  cards.forEach(function(item){
    var row = rows[rows.length - 1];
    if (!row || Math.abs(row.top - item.rect.top) > 8) {
      row = { top: item.rect.top, bottom: item.rect.bottom, cards: [] };
      rows.push(row);
    }
    row.bottom = Math.max(row.bottom, item.rect.bottom);
    row.cards.push(item);
  });
  return rows;
}

function homeCardInsertBefore(grid, x, y, dragged) {
  var rows = homeCardRows(grid, dragged);
  if (!rows.length) return null;
  for (var r = 0; r < rows.length; r++) {
    var row = rows[r];
    if (y <= row.bottom) {
      for (var i = 0; i < row.cards.length; i++) {
        var item = row.cards[i];
        if (x < item.rect.left + item.rect.width / 2) return item.card;
      }
      return rows[r + 1] && rows[r + 1].cards[0] ? rows[r + 1].cards[0].card : null;
    }
  }
  return null;
}

function initHomeCardCustomization() {
  var grid = document.getElementById('home-card-grid');
  if (!grid || grid._homeCustomizeBound) return;
  grid._homeCustomizeBound = true;
  var dragged = null;
  var dragMoved = false;
  var dragStartX = 0;
  var dragStartY = 0;
  var dragOffsetX = 0;
  var dragOffsetY = 0;
  var dragOriginRect = null;
  var dragPlaceholder = null;
  var dragOriginalParent = null;
  var dragOriginalNext = null;
  var activePointerId = null;
  function moveDraggedHomeCard(x, y) {
    if (!dragged) return;
    dragged.style.left = (x - dragOffsetX) + 'px';
    dragged.style.top = (y - dragOffsetY) + 'px';
  }
  function finishHomePointerDrag(save) {
    if (dragged) {
      dragged.classList.remove('home-card-dragging');
      dragged.style.transform = '';
      dragged.style.width = '';
      dragged.style.height = '';
      dragged.style.left = '';
      dragged.style.top = '';
      dragged.style.position = '';
      try { dragged.releasePointerCapture(activePointerId); } catch (err) {}
    }
    if (dragPlaceholder && dragPlaceholder.parentNode) {
      if (dragged) {
        if (save) dragPlaceholder.parentNode.insertBefore(dragged, dragPlaceholder);
        else if (dragOriginalParent) dragOriginalParent.insertBefore(dragged, dragOriginalNext);
      }
      dragPlaceholder.parentNode.removeChild(dragPlaceholder);
    }
    clearHomeDragTargets(grid);
    activePointerId = null;
    homeCardDragActive = false;
    if (save && dragMoved) {
      setHomeCardOrderFromDom();
      grid._homeDragSuppressClick = true;
      setTimeout(function(){ grid._homeDragSuppressClick = false; }, 140);
    }
    dragged = null;
    dragMoved = false;
    dragOriginRect = null;
    dragPlaceholder = null;
    dragOriginalParent = null;
    dragOriginalNext = null;
  }
  grid.addEventListener('pointerdown', function(e){
    if (e.button != null && e.button !== 0) return;
    var card = e.target && e.target.closest ? e.target.closest('.home-card[data-home-card]') : null;
    if (!card || card.classList.contains('home-card-hidden')) return;
    closeHomeCardMenu();
    closeHomeRestoreMenu();
    dragged = card;
    dragMoved = false;
    dragOriginalParent = card.parentNode;
    dragOriginalNext = card.nextSibling;
    dragStartX = e.clientX;
    dragStartY = e.clientY;
    dragOriginRect = card.getBoundingClientRect();
    dragOffsetX = e.clientX - dragOriginRect.left;
    dragOffsetY = e.clientY - dragOriginRect.top;
    activePointerId = e.pointerId;
    homeCardDragActive = true;
    try { card.setPointerCapture(activePointerId); } catch (err) {}
  });
  window.addEventListener('pointermove', function(e){
    if (!dragged) return;
    if (activePointerId != null && e.pointerId !== activePointerId) return;
    if (!dragMoved && Math.hypot(e.clientX - dragStartX, e.clientY - dragStartY) < 8) return;
    if (!dragMoved) {
      dragPlaceholder = document.createElement('div');
      dragPlaceholder.className = 'home-card-placeholder';
      dragPlaceholder.style.width = dragOriginRect.width + 'px';
      dragPlaceholder.style.height = dragOriginRect.height + 'px';
      dragOriginalParent.insertBefore(dragPlaceholder, dragged.nextSibling);
      dragged.classList.add('home-card-dragging');
      dragged.style.width = dragOriginRect.width + 'px';
      dragged.style.height = dragOriginRect.height + 'px';
      dragged.style.left = dragOriginRect.left + 'px';
      dragged.style.top = dragOriginRect.top + 'px';
      document.body.appendChild(dragged);
      try { dragged.setPointerCapture(activePointerId); } catch (err) {}
      dragMoved = true;
    }
    e.preventDefault();
    moveDraggedHomeCard(e.clientX, e.clientY);
    if (!dragPlaceholder) return;
    var before = homePlaceholderInsertBefore(grid, e.clientX, e.clientY, dragPlaceholder);
    if (before !== dragPlaceholder && before !== dragPlaceholder.nextSibling) {
      animateHomeCardFlip(grid, function(){ grid.insertBefore(dragPlaceholder, before); }, dragged);
    } else if (!before && dragPlaceholder.nextSibling) {
      animateHomeCardFlip(grid, function(){ grid.appendChild(dragPlaceholder); }, dragged);
    }
  });
  window.addEventListener('pointerup', function(e){
    if (!dragged) return;
    if (dragMoved) e.preventDefault();
    finishHomePointerDrag(true);
  });
  window.addEventListener('pointercancel', function(){
    finishHomePointerDrag(false);
  });
  window.addEventListener('blur', function(){
    if (dragged) finishHomePointerDrag(false);
  });
  grid.addEventListener('click', function(e){
    if (!grid._homeDragSuppressClick) return;
    e.preventDefault();
    e.stopPropagation();
  }, true);
  grid.addEventListener('mouseleave', function(){
    if (dragged && dragMoved) clearHomeDragTargets(grid);
  });
  grid.addEventListener('contextmenu', function(e){
    var card = e.target && e.target.closest ? e.target.closest('.home-card[data-home-card]') : null;
    if (!card || !grid.contains(card)) return;
    e.preventDefault();
    showHomeCardMenu(card, e.clientX, e.clientY);
  });
  var hero = document.querySelector('.home-hero[data-home-card="weather"]');
  if (hero && !hero._homeCardMenuBound) {
    hero._homeCardMenuBound = true;
    hero.addEventListener('contextmenu', function(e){
      e.preventDefault();
      showHomeCardMenu(hero, e.clientX, e.clientY);
    });
  }
  var menu = document.getElementById('home-card-menu');
  if (menu && !menu._homeCardMenuBound) {
    menu._homeCardMenuBound = true;
    menu.addEventListener('click', function(e){
      var del = e.target && e.target.closest ? e.target.closest('[data-home-card-delete]') : null;
      if (!del) return;
      e.preventDefault();
      e.stopPropagation();
      hideHomeCardById(menu.getAttribute('data-card-id'));
    });
  }
  var pop = document.getElementById('home-restore-pop');
  if (pop && !pop._homeRestoreBound) {
    pop._homeRestoreBound = true;
    pop.addEventListener('click', function(e){
      var restore = e.target && e.target.closest ? e.target.closest('[data-home-restore-id]') : null;
      var all = e.target && e.target.closest ? e.target.closest('[data-home-restore-all]') : null;
      if (!restore && !all) return;
      e.preventDefault();
      e.stopPropagation();
      if (all) restoreHomeCards();
      else restoreHomeCard(restore.getAttribute('data-home-restore-id'));
    });
  }
  var settingsPop = document.getElementById('home-settings-pop');
  if (settingsPop && !settingsPop._homeSettingsBound) {
    settingsPop._homeSettingsBound = true;
    settingsPop.addEventListener('pointerdown', function(e){ e.stopPropagation(); });
    settingsPop.addEventListener('click', function(e){ e.stopPropagation(); });
  }
  var heightEl = document.getElementById('home-height-range');
  if (heightEl && !heightEl._homeSettingsBound) {
    heightEl._homeSettingsBound = true;
    heightEl.addEventListener('input', function(){
      var state = readHomeCardSettings();
      state.height = Math.max(60, Math.min(96, Math.round(Number(heightEl.value) || 84)));
      saveHomeCardSettings();
      applyHomeCardSettings();
    });
  }
  var opacityEl = document.getElementById('home-opacity-range');
  if (opacityEl && !opacityEl._homeSettingsBound) {
    opacityEl._homeSettingsBound = true;
    opacityEl.addEventListener('input', function(){
      var state = readHomeCardSettings();
      state.opacity = Math.max(0, Math.min(100, Math.round(Number(opacityEl.value) || 0)));
      saveHomeCardSettings();
      applyHomeCardSettings();
    });
  }
  var calendarEl = document.getElementById('home-calendar-visible');
  if (calendarEl && !calendarEl._homeSettingsBound) {
    calendarEl._homeSettingsBound = true;
    calendarEl.addEventListener('change', function(){
      var state = readHomeCardSettings();
      state.showCalendar = !!calendarEl.checked;
      saveHomeCardSettings();
      applyHomeCardSettings();
      showToast(state.showCalendar ? '时间模块已恢复' : '时间模块已隐藏');
    });
  }
  var bgInput = document.getElementById('home-hero-bg-input');
  if (bgInput && !bgInput._homeSettingsBound) {
    bgInput._homeSettingsBound = true;
    bgInput.addEventListener('change', async function(){
      var file = bgInput.files && bgInput.files[0];
      bgInput.value = '';
      if (!file) return;
      var validation = validateHomeHeroMediaFile(file);
      if (!validation.ok) {
        showToast(validation.error);
        return;
      }
      try {
        await writeHomeHeroMediaRecord({
          blob: file,
          type: validation.type,
          name: String(file.name || ''),
          size: Number(file.size || 0),
          updatedAt: Date.now()
        });
        var state = readHomeCardSettings();
        state.heroBg = '';
        state.heroMediaType = validation.type;
        state.heroMediaName = String(file.name || '');
        homeHeroMediaReady = false;
        saveHomeCardSettings();
        applyHomeCardSettings();
        showToast(validation.type === 'video' ? '大卡片视频背景已更新' : '大卡片图片背景已更新');
      } catch (err) {
        showToast('背景保存失败，请检查磁盘空间');
      }
    });
  }
  document.addEventListener('click', function(){
    closeHomeCardMenu();
    closeHomeRestoreMenu();
    closeHomeSettingsMenu();
  });
  document.addEventListener('keydown', function(e){
    if (e.key === 'Escape') {
      closeHomeCardMenu();
      closeHomeRestoreMenu();
      closeHomeSettingsMenu();
    }
  });
  applyHomeCardLayout();
}

function updateHomeNowCover(force) {
  var art = document.getElementById('home-now-cover-art');
  var title = document.getElementById('home-now-cover-title');
  var artist = document.getElementById('home-now-cover-artist');
  var kicker = document.getElementById('home-now-cover-kicker');
  if (!art && !title && !artist) return;
  var song = currentCoverSong();
  var cover = songCoverSrc(song, 420);
  var key = song ? ((typeof queueItemKey === 'function' && queueItemKey(song)) || song.localKey || song.id || song.mid || song.name || '') + '|' + cover : '';
  if (!force && key === homeNowCoverState.key) return;
  homeNowCoverState.key = key;
  if (art) {
    art.style.backgroundImage = cover ? 'url("' + cssImageUrl(cover) + '")' : '';
    art.classList.toggle('has-cover', !!cover);
  }
  if (kicker) kicker.textContent = song ? 'Now Playing' : 'Mineradio';
  if (title) title.textContent = song ? (song.name || song.title || '正在播放') : '暂无播放';
  if (artist) artist.textContent = song ? (song.artist || songSourceLabel(song) || '未知歌手') : '播放一首歌后显示专辑封面';
}

function padHomeTime(n) {
  n = Math.floor(Number(n) || 0);
  return n < 10 ? '0' + n : String(n);
}

function compactHomeCount(n) {
  n = Number(n) || 0;
  if (n >= 100000000) return (n / 100000000).toFixed(1).replace(/\.0$/, '') + '亿';
  if (n >= 10000) return Math.round(n / 10000) + '万';
  return n ? String(n) : '';
}

function homeListenSummary() {
  var recent = (listenStatsState.history || [])[0] || null;
  var topSong = mostPlayedSong();
  var topArtist = topListenArtist();
  var totalPlays = Object.keys(listenStatsState.songs || {}).reduce(function(sum, key){ return sum + ((listenStatsState.songs[key] && listenStatsState.songs[key].plays) || 0); }, 0);
  return { recent: recent, topSong: topSong, topArtist: topArtist, totalPlays: totalPlays };
}

function shouldShowEmptyHomeCore(ignoreSplash) {
  if (!ignoreSplash && document.body.classList.contains('splash-active')) return false;
  if (immersiveMode) return false;
  if (homeForcedOpen) return true;
  if (homeSuppressed) return false;
  if (shelfPinnedOpen) return false;
  if (shelfManager && shelfManager.hasOpenContent && shelfManager.hasOpenContent()) return false;
  if (playQueue && playQueue.length) return false;
  if (currentIdx >= 0 && playQueue[currentIdx]) return false;
  if (playing) return false;
  return true;
}

function shouldShowEmptyHome() {
  return shouldShowEmptyHomeCore(false);
}

function shouldUseIdleWallpaperPreview(ignoreSplash) {
  if (!ignoreSplash && document.body.classList.contains('splash-active')) return false;
  if (immersiveMode || playing || (audio && !audio.paused)) return false;
  if (shelfPinnedOpen) return false;
  if (shelfManager && shelfManager.hasOpenContent && shelfManager.hasOpenContent()) return false;
  return true;
}

function setHomeControlsLocked(locked) {
  document.body.classList.toggle('home-controls-locked', !!locked);
  var bottom = document.getElementById('bottom-bar');
  if (bottom && locked && !hasActivePlaybackControls()) bottom.classList.add('soft-hidden');
  if (bottom && !locked) bottom.classList.remove('soft-hidden');
  if (locked) closeMiniQueue();
}

function openHomePlayerConsole() {
  setHomeControlsLocked(false);
  var bar = document.getElementById('bottom-bar');
  if (bar) {
    bar.classList.add('visible');
    bar.classList.remove('soft-hidden');
    bar.style.pointerEvents = '';
  }
  wakeBottomHandle(2800);
  setControlsHidden(false);
  forcePlaybackControlsInteractive();
  updateControlsChromeState();
  if (controlsAutoHide) scheduleControlsHide(1800);
  showToast('播放器控制台已展开');
}

function ensureHomeWallpaperParticles(opts) {
  opts = opts || {};
  if (uniforms && uniforms.uAlpha && opts.instant) {
    uniforms.uAlpha.value = 0.96;
  } else if (uniforms && uniforms.uAlpha && uniforms.uAlpha.value < 0.88) {
    tweenParticleAlpha(uniforms.uAlpha.value || 0, 0.96, 920);
  }
  if (uniforms && uniforms.uFloatAlpha) uniforms.uFloatAlpha.value = 0;
  if (floatGroup) destroyFloatLayer();
}

function activateHomeWallpaperPreview(opts) {
  opts = opts || {};
  document.body.classList.add('home-wallpaper-preview');
  ensureHomeWallpaperParticles(opts);
}

function prewarmHomeWallpaperPreview() {
  if (homeWallpaperPrewarmStarted) return;
  homeWallpaperPrewarmStarted = true;
  if (!shouldUseIdleWallpaperPreview(true)) return;
  scheduleVisualApply(function(){
    if (!shouldUseIdleWallpaperPreview(true)) return;
    activateHomeWallpaperPreview({ skipTransition: true, instant: true });
  }, 900, 2600);
}

function deactivateHomeWallpaperPreview(playback) {
  document.body.classList.remove('home-wallpaper-preview');
  if (!homeVisualPresetActive) return;
  homeVisualPresetActive = false;
  var nextPreset = typeof homeVisualPrevPreset === 'number' ? homeVisualPrevPreset : (fx && typeof fx.preset === 'number' ? fx.preset : 0);
  if (typeof setPreset === 'function' && fx.preset !== nextPreset) {
    setPreset(nextPreset, { silent: true, preserveCamera: false, skipTransition: false, noSave: true });
  }
}

function updateEmptyHomeVisibility(opts) {
  opts = opts || {};
  var show = shouldShowEmptyHome();
  emptyHomeActive = show;
  document.body.classList.toggle('empty-home-active', show);
  if (!show) setHomeControlsLocked(false);
  if (show) activateHomeWallpaperPreview();
  else deactivateHomeWallpaperPreview(false);
  if (show) {
    setPeek(document.getElementById('search-area'), true, 'search');
    renderHomeDiscover();
    scheduleHomeWeatherLoad(opts.forceLoad ? 900 : 2400, {
      forceLocate: !!opts.forceLoad && !homeWeatherStartupLocateDone
    });
    if (!hasAnyPlatformLogin()) {
      homeDiscoverState.loading = false;
      homeDiscoverState.loaded = true;
      homeDiscoverState.loggedIn = false;
      homeDiscoverState.mode = 'starter';
      homeDiscoverState.songs = [];
      homeDiscoverState.playlists = [];
      homeDiscoverState.podcasts = [];
      renderHomeDiscover();
    } else {
      renderHomeDiscover();
      scheduleVisualApply(function(){ loadHomeDiscover(!!opts.forceLoad); }, 220, 1200);
    }
  }
  return show;
}

function runHomeSearch(query, mode) {
  homeForcedOpen = false;
  homeSuppressed = false;
  setHomeControlsLocked(false);
  updateEmptyHomeVisibility();
  if (mode) setSearchMode(mode);
  else if (searchMode === 'podcast') setSearchMode('song');
  var q = String(query || '').trim();
  var area = document.getElementById('search-area');
  if (area) setPeek(area, true, 'search');
  if ($input) {
    $input.value = q;
    $input.focus();
  }
  if (q) doSearch(q);
  else if (searchMode === 'podcast') loadPodcastHot();
  else renderSearchHistory();
}

function openHomeLocalImport() {
  homeForcedOpen = false;
  homeSuppressed = false;
  setHomeControlsLocked(false);
  updateEmptyHomeVisibility();
  var input = document.getElementById('file-input');
  if (input) input.click();
}

function openHomeProductGuide() {
  closeLoginModal();
  setTimeout(function(){ startVisualGuide({ manual: true, source: 'home' }); }, 160);
}

async function playHomeDaily() {
  homeForcedOpen = false;
  homeSuppressed = false;
  setHomeControlsLocked(false);
  if (!hasAnyPlatformLogin() && !homeDiscoverState.loggedIn) {
    showLoginModal({ source: 'home-daily' });
    return;
  }
  await waitForHomeDiscoverIdle();
  if (!homeDiscoverState.loaded || (!homeDiscoverState.songs.length && !homeDiscoverState.loading)) {
    await loadHomeDiscover(true);
  }
  if (!homeDiscoverState.songs.length) {
    runHomeSearch('每日推荐');
    return;
  }
  playQueue = homeDiscoverState.songs.map(cloneSong);
  currentIdx = 0;
  safeRenderQueuePanel('home-daily');
  safeShelfRebuild('home-daily', true);
  forcePlaybackControlsInteractive();
  playQueueAt(0).catch(function(e){ console.warn('[HomeDailyPlay]', e); });
}

async function playHomePrivateRadio() {
  homeForcedOpen = false;
  homeSuppressed = false;
  setHomeControlsLocked(false);
  if (!hasAnyPlatformLogin() && !homeDiscoverState.loggedIn) {
    showLoginModal({ source: 'home-private' });
    return;
  }
  await waitForHomeDiscoverIdle();
  if (!homeDiscoverState.loaded || ((!homeDiscoverState.playlists.length && !homeDiscoverState.songs.length) && !homeDiscoverState.loading)) {
    await loadHomeDiscover(true);
  }
  if (homeDiscoverState.songs.length) {
    playQueue = homeDiscoverState.songs.map(cloneSong);
    currentIdx = 0;
    safeRenderQueuePanel('home-private-radio');
    safeShelfRebuild('home-private-radio', true);
    forcePlaybackControlsInteractive();
    playQueueAt(0).catch(function(e){ console.warn('[HomePrivatePlay]', e); });
    return;
  }
  var item = homeDiscoverState.playlists[0];
  if (item && item.id) {
    await loadPlaylistIntoQueueById(item.id, true, item.name || '私人雷达');
    return;
  }
  openHomeLibrary();
}

function playHomeSong(index) {
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

function openHomePlaylist(index) {
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

function openHomePodcast(index) {
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

function openHomeThirdCard() {
  if (!hasAnyPlatformLogin() && !homeDiscoverState.loggedIn) {
    openHomeLocalImport();
    return;
  }
  openHomePodcast(0);
}

function openHomeLibrary() {
  if (!hasAnyPlatformLogin() && !homeDiscoverState.loggedIn) {
    openHomeProductGuide();
    return;
  }
  homeSuppressed = false;
  setHomeControlsLocked(false);
  openPlaylistPanelTab('playlists', true);
  refreshUserPlaylists(true);
}

function goHome() {
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

function dismissHomePage(opts) {
  opts = opts || {};
  homeForcedOpen = false;
  homeSuppressed = true;
  setHomeControlsLocked(false);
  updateEmptyHomeVisibility({ forceLoad: false });
  setPeek(document.getElementById('search-area'), false, 'search');
  if (typeof setFocusZone === 'function') setFocusZone(null, true);
}

function isPointNearHomeContent(x, y) {
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

function isHomeBlankDismissClick(e) {
  if (!emptyHomeActive || !e || e.defaultPrevented) return false;
  if (e.button != null && e.button !== 0) return false;
  if (e.ctrlKey || e.metaKey || e.altKey || e.shiftKey) return false;
  var target = e.target;
  if (!target || !target.closest) return false;
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

async function playHomeRecent(record) {
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

function openHomeInsight() {
  var summary = homeListenSummary();
  if (summary.topArtist && summary.topArtist.name) {
    runHomeSearch(summary.topArtist.name);
    return;
  }
  if (summary.topSong && summary.topSong.name) {
    runHomeSearch(summary.topSong.name);
    return;
  }
  showToast('播放几首歌后会生成听歌画像');
}

async function playWeatherSong(index) {
  var radio = homeWeatherRadioState.radio;
  var songs = radio && radio.songs || [];
  if (!songs[index]) {
    startWeatherRadio();
    return;
  }
  activeRadioContext = weatherRadioContext();
  playQueue = songs.map(function(song){
    var cloned = cloneSong(song);
    cloned.radioContext = activeRadioContext;
    return cloned;
  });
  currentIdx = index;
  safeRenderQueuePanel('weather-radio-song');
  safeShelfRebuild('weather-radio-song', true);
  forcePlaybackControlsInteractive();
  await playQueueAt(index, { context: activeRadioContext });
}

function isHomeCardInternalDrag(e) {
  return !!homeCardDragActive || !!(e && e.dataTransfer && Array.prototype.indexOf.call(e.dataTransfer.types || [], 'application/x-mineradio-home-card') >= 0);
}

function applyHomeAccentColor() {
  var color = normalizeHexColor(fx.homeAccentColor || '#00f5d4');
  var rgb = hexToRgb(color);
  document.documentElement.style.setProperty('--home-accent', color);
  document.documentElement.style.setProperty('--home-accent-rgb', rgb.r + ',' + rgb.g + ',' + rgb.b);
}

function updateHomeAccentControls() {
  applyHomeAccentColor();
  var color = normalizeHexColor(fx.homeAccentColor || '#00f5d4');
  var picker = document.getElementById('home-accent-picker');
  var value = document.getElementById('home-accent-value');
  if (picker) picker.value = color;
  if (value) value.textContent = color.toUpperCase();
}

function setHomeAccentColor(color, silent) {
  fx.homeAccentColor = normalizeHexColor(color || '#00f5d4');
  updateHomeAccentControls();
  saveLyricLayout();
  if (!silent) showToast('Home 填充: ' + fx.homeAccentColor.toUpperCase());
}

function resetHomeAccentColor() {
  setHomeAccentColor(fxDefaults.homeAccentColor || '#00f5d4');
}

function setHomeIconColor(color, silent) {
  fx.homeIconColor = normalizeHexColor(color || fxDefaults.homeIconColor || '#f4d28a', '#f4d28a');
  updateIconAccentControls();
  saveLyricLayout();
  if (!silent) showToast('主页图标: ' + fx.homeIconColor.toUpperCase());
}

function resetHomeIconColor() {
  setHomeIconColor(fxDefaults.homeIconColor || '#f4d28a');
}

function ensureHomeWaveTrackBars() {
  var el = document.getElementById('home-wave-track');
  if (!el) return;
  var count = 24;
  if (homeWaveTrackState.bars === count && el.children.length === count) return;
  homeWaveTrackState.bars = count;
  homeWaveTrackState.smooth = new Array(count).fill(0);
  el.innerHTML = new Array(count + 1).join('<span></span>');
}
