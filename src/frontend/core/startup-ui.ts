function initializeStartupUi(): void {
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

  collectNameInput = document.querySelector<HTMLInputElement>('#collect-new-name');

  if (collectNameInput) {
    collectNameInput.addEventListener('keydown', function(e){
      if (e.key === 'Enter') {
        e.preventDefault();
        createPlaylistFromCollect();
      }
    }, mineradioEventOptions());
  }

  customLyricInput = document.querySelector<HTMLTextAreaElement>('#custom-lyric-input');

  if (customLyricInput) {
    customLyricInput.addEventListener('keydown', function(e){
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        saveCustomLyricForCurrent();
      }
    }, mineradioEventOptions());
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
}
