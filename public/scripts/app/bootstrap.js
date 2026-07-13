'use strict';

// Mineradio classic module: bootstrap.
function __mineradioInitBootstrap52() {
  // ============================================================
  //  启动
  // ============================================================
  applyDiyMode(diyPlayerMode, { save: false });

  bindFxPanel();

  applySavedLyricPaletteState();

  bindQualityControl();

  bindVolumeControls();

  initControlGlassSurface();

  bindPlayerControlAnimations();

  scheduleUiWarmTask(function(){
    updateControlGlassDisplacementMap();
    updateSearchBoxGlassDisplacementMap();
    updateSearchPillGlassDisplacementMap();
    try {
      if (renderer && renderer.compile && scene && camera) renderer.compile(scene, camera);
    } catch (e) {}
  }, 900);

  applyUserCapsuleAutoHideState();

  applyFxFabAutoHideState();

  applyControlsAutoHidePreference();

  setShelfMode(fx.shelf);

  applyStartupStarfieldPreset();

  applyPlaylistPanelPinState(false);

  if (fx.floatLayer) createFloatLayer();

  if (fx.particleLyrics) createLyricsParticles();

  if (fx.backCover) createBackCoverLayer();

  initIdleGuideCanvas();

  startupLoginStatusPromise = Promise.all([refreshLoginStatus(), refreshQQLoginStatus(), refreshKugouLoginStatus()]);

  startQQLoginStatusAutoRefresh();

  if (startupLoginStatusPromise && startupLoginStatusPromise.then) {
    startupLoginStatusPromise.then(function(){
      if (hasAnyPlatformLogin()) {
        refreshUserPlaylists(true);
        loadHomeDiscover(true);
      }
      if (document.body.classList.contains('splash-active')) return;
      var homeShown = updateEmptyHomeVisibility({ forceLoad: hasAnyPlatformLogin() });
      if (!hasAnyPlatformLogin()) maybeRunStartupLoginGuide('status');
      else if (!homeShown) maybeRunStartupLoginGuide('status');
    });
  }

  collectNameInput = document.getElementById('collect-new-name');

  if (collectNameInput) {
    collectNameInput.addEventListener('keydown', function(e){
      if (e.key === 'Enter') {
        e.preventDefault();
        createPlaylistFromCollect();
      }
    });
  }

  customLyricInput = document.getElementById('custom-lyric-input');

  if (customLyricInput) {
    customLyricInput.addEventListener('keydown', function(e){
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        saveCustomLyricForCurrent();
      }
    });
  }

  safeRenderQueuePanel('startup');

  updateCustomCoverButton();

  updateCustomLyricControls();

  updateLikeButtons();

  // ============================================================
  //  主循环
  // ============================================================
  prevTime = performance.now();

  renderPerfState = {
    mode: 'vsync',
    fps: 0,
    frames: 0,
    skipped: 0,
    longFrames: 0,
    lastRenderAt: 0,
    lastSampleAt: performance.now()
  };

  window.__mineradioPerf = renderPerfState;

  splashWarmRenderLast = 0;

  animationLoopTimer = 0;

  animationFramePending = false;

  animate();

  playlistPanelDetailState = { key: '', loading: false, playlist: null, tracks: [], token: 0, renderLimit: PLAYLIST_DETAIL_INITIAL_RENDER, query: '' };

  document.getElementById('pl-list').addEventListener('click', function(e){
    var clearSearch = e.target && e.target.closest ? e.target.closest('[data-pl-detail-search-clear]') : null;
    if (clearSearch) {
      e.preventDefault();
      e.stopPropagation();
      playlistPanelDetailState.query = '';
      playlistPanelDetailState.renderLimit = PLAYLIST_DETAIL_INITIAL_RENDER;
      renderPlaylistPanelDetailState();
      requestAnimationFrame(function(){
        var input = document.querySelector('[data-pl-detail-search]');
        if (input) input.focus();
      });
      return;
    }
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

  document.getElementById('pl-list').addEventListener('input', function(e){
    var input = e.target && e.target.matches && e.target.matches('[data-pl-detail-search]') ? e.target : null;
    if (!input) return;
    if (e.isComposing || input._mineradioComposing) return;
    var panel = document.getElementById('playlist-panel');
    var keepTop = panel ? panel.scrollTop : 0;
    playlistPanelDetailState.query = input.value || '';
    playlistPanelDetailState.renderLimit = PLAYLIST_DETAIL_INITIAL_RENDER;
    renderPlaylistPanelDetailState();
    if (panel) panel.scrollTop = keepTop;
    requestAnimationFrame(function(){
      var nextInput = document.querySelector('[data-pl-detail-search]');
      if (!nextInput) return;
      nextInput.focus();
      var end = nextInput.value.length;
      try { nextInput.setSelectionRange(end, end); } catch (err) {}
    });
  });

  document.getElementById('pl-list').addEventListener('compositionstart', function(e){
    var input = e.target && e.target.matches && e.target.matches('[data-pl-detail-search]') ? e.target : null;
    if (input) input._mineradioComposing = true;
  });

  document.getElementById('pl-list').addEventListener('compositionend', function(e){
    var input = e.target && e.target.matches && e.target.matches('[data-pl-detail-search]') ? e.target : null;
    if (!input) return;
    input._mineradioComposing = false;
    input.dispatchEvent(new Event('input', { bubbles: true }));
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

  baseCheckQr = checkQr;

  checkQr = async function() {
    if (loginProvider === 'qq') {
      if (!qrKey) return;
      var qqSt = document.getElementById('qr-status');
      try {
        var qqResult = await apiJson('/api/qq/login/qr/check?key=' + encodeURIComponent(qrKey) + '&t=' + Date.now());
        if (qqResult.code === 800) {
          if (qqSt) { qqSt.textContent = 'QQ 二维码已过期，请刷新'; qqSt.className = 'fail'; }
          stopQrPoll();
        } else if (qqResult.code === 801) {
          if (qqSt) { qqSt.textContent = '请使用 QQ 音乐 App 扫码'; qqSt.className = ''; }
        } else if (qqResult.code === 802) {
          if (qqSt) { qqSt.textContent = '已扫码，请在手机确认…'; qqSt.className = 'scan'; }
        } else if (qqResult.code === 803 && qqResult.loggedIn) {
          stopQrPoll();
          qqLoginStatus = normalizeQQLoginStatus(qqResult);
          activeAccountProvider = 'qq';
          qqManualCookieOpen = false;
          if (qqSt) { qqSt.textContent = 'QQ 音乐登录成功，正在同步歌单…'; qqSt.className = 'scan'; }
          renderUserBtn();
          await refreshUserPlaylists(true);
          setTimeout(function(){ closeLoginModal(); showToast('QQ 音乐已登录'); }, 420);
        }
      } catch (e) {
        if (qqSt) { qqSt.textContent = e && e.message ? e.message : 'QQ 登录失败'; qqSt.className = 'fail'; }
        stopQrPoll();
      }
      return;
    }
    if (loginProvider !== 'kugou') return baseCheckQr();
    if (!qrKey) return;
    var st = document.getElementById('qr-status');
    try {
      var r = await apiJson('/api/kugou/login/qr/check?key=' + encodeURIComponent(qrKey) + '&t=' + Date.now());
      if (r.code === 800) {
        if (st) { st.textContent = 'Kugou QR expired, refresh and try again'; st.className = 'fail'; }
        stopQrPoll();
      } else if (r.code === 801) {
        if (st) { st.textContent = 'Use Kugou Music App to scan'; st.className = ''; }
      } else if (r.code === 802) {
        if (st) { st.textContent = 'Scanned. Confirm login on your phone'; st.className = 'scan'; }
      } else if (r.code === 803 && r.loggedIn) {
        stopQrPoll();
        kugouLoginStatus = normalizeKugouLoginStatus(r);
        activeAccountProvider = 'kugou';
        qqManualCookieOpen = false;
        if (st) { st.textContent = 'Kugou login success, syncing playlists...'; st.className = 'scan'; }
        renderUserBtn();
        await refreshUserPlaylists(true);
        setTimeout(function(){
          closeLoginModal();
          showToast('Kugou synced: ' + (kugouLoginStatus.nickname || kugouLoginStatus.userId || ''));
        }, 420);
      } else if (r.code === 803) {
        if (st) { st.textContent = r.message || 'Kugou login confirmed but token missing'; st.className = 'fail'; }
        stopQrPoll();
      }
    } catch (e) {
      console.warn(e);
    }
  };
}

function bootstrapMineradio() {
  __mineradioInitCoreAppState01();
  __mineradioInitCoreConstants02();
  __mineradioInitCoreAppState03();
  __mineradioInitCoreConstants04();
  __mineradioInitCoreAppState05();
  __mineradioInitCoreConstants06();
  __mineradioInitCoreAppState07();
  __mineradioInitCoreConstants08();
  __mineradioInitCoreAppState09();
  __mineradioInitCoreConstants10();
  __mineradioInitCorePreferences11();
  __mineradioInitCoreConstants12();
  __mineradioInitCoreAppState13();
  __mineradioInitCoreConstants14();
  __mineradioInitCoreAppState15();
  __mineradioInitCoreConstants16();
  __mineradioInitCorePreferences17();
  __mineradioInitCoreAppState18();
  __mineradioInitCoreConstants19();
  __mineradioInitCoreAppState20();
  __mineradioInitCoreConstants21();
  __mineradioInitCoreAppState22();
  __mineradioInitAudioRealtimeAnalysis23();
  __mineradioInitUiFxState24();
  __mineradioInitCoreRuntimePerformance25();
  __mineradioInitVisualScene26();
  __mineradioInitVisualCamera27();
  __mineradioInitVisualPointerControls28();
  __mineradioInitVisualParticlesBase29();
  __mineradioInitVisualParticleSpecial30();
  __mineradioInitVisualSkullParticles31();
  __mineradioInitLyricsLyricEffects32();
  __mineradioInitVisualAmbientParticles33();
  __mineradioInitVisualCoverDepth34();
  __mineradioInitAudioOfflineAnalysis35();
  __mineradioInitLibraryShelfState36();
  __mineradioInitLibraryShelfInteractions37();
  __mineradioInitDiscoveryHomeData38();
  __mineradioInitAccountLikes39();
  __mineradioInitDiscoverySearch40();
  __mineradioInitAudioPlayback41();
  __mineradioInitLibraryPlaylistPanel42();
  __mineradioInitVisualCoverMedia43();
  __mineradioInitUiFxPanel44();
  __mineradioInitUiFxArchives45();
  __mineradioInitUiFxPanel46();
  __mineradioInitAccountLogin47();
  __mineradioInitUiGuides48();
  __mineradioInitUiGesture49();
  __mineradioInitUiChrome50();
  __mineradioInitUiSplash51();
  __mineradioInitBootstrap52();
}
