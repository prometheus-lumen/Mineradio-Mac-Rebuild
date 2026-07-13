'use strict';

// Mineradio classic module: core/app-state.
var audio, audioCtx, source, analyser, gainNode, audioReady, audioGesturePrimeActive, uiSfxCtx;

var frequencyData, timeDomainData, mid, audioEnergy, prevEnergy, smoothMid, smoothTreb, smoothEnergy;

var midPeak, energyPeak, lastStrongDrop, playlist, playQueue, currentIdx, playing, playToggleBusy;

var searchMode, podcastResults, podcastPrograms, podcastCurrentRadio, loginStatus, qqLoginStatus, kugouLoginStatus, qqLoginAutoRefreshTimer;

var qqLoginWasLoggedIn, kugouLoginWasLoggedIn, loginProvider, activeAccountProvider, dualAccountMode, qqCookieBusy, neteaseWebLoginBusy, qqWebLoginBusy;

var kugouWebLoginBusy, qqManualCookieOpen, loginStatusChecked, loginStatusCheckFailed, qrPollTimer, qrKey, volumeTween, trackSwitchToken;

var audioFadeTimer, audioElementFadeFrame, audioFadeSerial, userPlaylists, qqPlaylists, kugouPlaylists, myPodcastCollections, myPodcastItems;

var playlistSourceFilter, hotkeyCaptureState, hotkeyGlobalStatus, diyPlayerMode, customBackgroundMediaMap, globalBackgroundMedia, playbackQuality, qqPlaybackQualityCeiling;

var currentLocalSong, likedSongMap, likeBusyMap, likeStatusToken, collectTargetSong, collectBusy, uploadTipTimer, uploadTipAttempts;

var emptyHomeActive, homeForcedOpen, homeSuppressed, homeCardLayoutState, homeCardSettingsState, homeHeroMediaDbPromise, homeHeroMediaObjectUrl, homeHeroMediaReady;

var homeHeroMediaLoading, homeCardDragActive, homeWeatherRadioState, homeWeatherToken, homeWeatherLoadTimer, homeWeatherLoadPromise, homeWeatherStartupLocateDone, homeWeatherPrewarmStarted;

var homeWeatherSilentPrewarmActive, weatherRadioStartBusy, activeRadioContext, homeClockTimer, homeSleepState, listenStatsState, listenSession, appPerfMarks;

var queueViewTab, playMode, miniQueueOpen, miniQueueRenderSeq, queueRenderSeq, playlistRenderSeq, queuePanelDirty, playlistPanelRenderLimit;

var playlistPanelLazyBound, smoothWheelScrollBound, aiDepthPipeline, aiDepthReady, aiDepthBusy, aiDepthFailUntil, aiDepthLastRunAt, aiDepthMinGapMs;

var updatePreviewState, targetVolume, lastNonZeroVolume, volumeCloseTimer, emptyHomeStartEl, homeWallpaperPrewarmStarted, trackDetailSeq, detailArtistSongs;

var searchTimer, searchRequestSeq, searchLastResultQuery, $input, $results, $loading, searchBoxEl, firstPlayDone;

var sourceFallbackNoticeTimer, controlGlassState, playlistPanelDetailState, podcastListEl, progressDragState, progressBar, playbackProgressIdleSynced, dropOv;

var dragCount, presetMeta, presetIcons, presetDisplayOrder, hadStoredUserFxArchives, userFxArchives, userFxArchiveEditing, homeWaveTrackState;

var fxPanelTab, globalHotkeyListenerBound, startupLoginGuideShown, loginGuideAnimating, loginGuideRaf, idleGuideCanvas, idleGuideCtx, idleGuideW;

var idleGuideH, idleGuideDpr, idleGuideTrails, idleGuideStartedAt, idleGuideVisible, idleGuideLastFrameAt, idleGuideDelayTimer, idleGuideInteraction;

var gestureVideo, gestureHands, gestureStream, gestureFrameRaf, gestureFrameBusy, gestureFrameCount, gestureLastFrameErrorAt, gestureActive;

var gestureStartPromise, gestureStartToken, gestureLastStopAt, handLmSmooth, handLmLastSeen, pinchState, gestureRotation, gestureGrip;

var handCanvas, handCanvasCtx, peekTimers, secondaryPlaylistEdgeGuard, splashAnimating, splashCanvas, splashCtx, splashGl;

var splashGlProgram, splashGlBuffer, splashW, splashH, splashDust, splashStreaks, splashShards, splashPixelRatio;

var splashStartedAt, splashSoundPlayed, splashAudioCtx, splashSoundFallbackArmed, splashTimer, reduceSplashMotion, splashReadyToEnter, startupLoginStatusPromise;

var collectNameInput, prevTime, renderPerfState, splashWarmRenderLast, animationLoopTimer, animationFramePending, baseCheckQr;

function __mineradioInitCoreAppState01() {
  // ============================================================
  //  Global State
  // ============================================================
  audio = null, audioCtx = null, source = null, analyser = null, beatAnalyser = null, gainNode = null, audioReady = false;
}

function __mineradioInitCoreAppState03() {
  audioGesturePrimeActive = false;

  uiSfxCtx = null, lastShelfSelectSfxAt = 0;
}

function __mineradioInitCoreAppState05() {
  bass = 0, mid = 0, treble = 0, audioEnergy = 0, beatPulse = 0, prevEnergy = 0;

  lyricSunEnergy = 0, lyricSunTarget = 0, lyricSunHold = 0, lyricSunAvg = 0, lyricSunPeak = 0.55;

  smoothBass = 0, smoothMid = 0, smoothTreb = 0, smoothEnergy = 0;

  bassPeak = 0.12, midPeak = 0.10, treblePeak = 0.08, energyPeak = 0.10;

  beatOnsetFlag = false;

  // beat 上升沿瞬时标志,每帧消费一次
  lastStrongDrop = 0;

  // 用于 burst 预设的强 drop 时刻
  
  lyricsLines = [], lyricsVisible = false, lyricsHasNativeKaraoke = false, lyricsTimingSource = 'none';

  playlist = [], playQueue = [], currentIdx = -1, playing = false, playToggleBusy = false;

  searchMode = 'song', podcastResults = [], podcastPrograms = [], podcastCurrentRadio = null;
}

function __mineradioInitCoreAppState07() {
  qqLoginStatus = { provider: 'qq', loggedIn: false, preview: false, nickname: 'QQ 音乐', userId: '', avatar: '', vipType: 0 };

  kugouLoginStatus = { provider: 'kugou', loggedIn: false, preview: true, nickname: '酷狗音乐', userId: '', avatar: '', vipType: 0 };

  qqLoginAutoRefreshTimer = null;

  qqLoginWasLoggedIn = false;

  kugouLoginWasLoggedIn = false;

  loginProvider = 'netease';

  activeAccountProvider = 'netease';

  dualAccountMode = false;

  qqCookieBusy = false;

  neteaseWebLoginBusy = false;

  qqWebLoginBusy = false;

  kugouWebLoginBusy = false;

  qqManualCookieOpen = false;

  loginStatusChecked = false, loginStatusCheckFailed = false;

  qrPollTimer = null, qrKey = null;

  volumeTween = null, trackSwitchToken = 0;

  audioFadeTimer = null, audioElementFadeFrame = 0, audioFadeSerial = 0;
}

function __mineradioInitCoreAppState09() {
  userPlaylists = [], qqPlaylists = [], kugouPlaylists = [], myPodcastCollections = [], myPodcastItems = {}, playlistCoverCache = {};

  playlistSourceFilter = '';
}

function __mineradioInitCoreAppState13() {
  hotkeyCaptureState = null;

  hotkeyGlobalStatus = {};

  diyPlayerMode = readDiyModePreference();

  customCoverMap = readCustomCoverMap();

  customBackgroundMediaMap = readCustomBackgroundMediaMap();

  globalBackgroundMedia = readGlobalBackgroundMedia();

  customLyricMap = readCustomLyricMap();

  customLyricPrefs = readCustomLyricPrefs();

  localBeatMapCache = readLocalBeatMapCache();

  localBeatMapPrefs = readLocalBeatPrefs();

  playbackQuality = readPlaybackQualityPreference();

  qqPlaybackQualityCeiling = '';

  coverCropState = null, coverCropBound = false;

  currentLocalSong = null;

  lyricSourceMode = 'original';

  originalLyricsState = { lines: [], hasNativeKaraoke: false, timingSource: 'none' };

  localBeatAnalysis = { song:null, audioUrl:'', mode:'mr', active:false, token:0 };

  likedSongMap = {}, likeBusyMap = {}, likeStatusToken = 0;

  collectTargetSong = null, collectBusy = false;

  uploadTipTimer = null, uploadTipAttempts = 0;

  visualGuideActive = false, visualGuideStep = 0, visualGuideResizeBound = false;

  visualGuideState = { bottomWasVisible: false, searchWasPeek: false, manual: false };

  emptyHomeActive = false;

  homeForcedOpen = false;

  homeSuppressed = false;

  homeDiscoverState = { loading: false, loaded: false, loggedIn: false, mode: 'starter', songs: [], playlists: [], podcasts: [], error: '', updatedAt: 0 };

  homeDiscoverToken = 0;

  homeVisualPresetActive = false;

  homeVisualPrevPreset = 0;
}

function __mineradioInitCoreAppState15() {
  homeCardLayoutState = null;

  homeCardSettingsState = null;

  homeHeroMediaDbPromise = null;

  homeHeroMediaObjectUrl = '';

  homeHeroMediaReady = false;

  homeHeroMediaLoading = false;

  homeCardDragActive = false;
}

function __mineradioInitCoreAppState18() {
  homeWeatherToken = 0;

  homeWeatherLoadTimer = null;

  homeWeatherLoadPromise = null;

  homeWeatherStartupLocateDone = false;

  homeWeatherPrewarmStarted = false;

  homeWeatherSilentPrewarmActive = false;

  weatherRadioStartBusy = false;

  activeRadioContext = null;

  homeClockTimer = null;

  homeSleepState = readHomeSleepTimerState();

  listenStatsState = loadListenStatsState();

  listenSession = null;

  appPerfMarks = [];

  markAppPerf('script-start');

  installStartupLongTaskObserver();

  queueViewTab = 'queue', playMode = 'loop', miniQueueOpen = false;

  miniQueueRenderSeq = 0, queueRenderSeq = 0, playlistRenderSeq = 0;

  queuePanelDirty = false;
}

function __mineradioInitCoreAppState20() {
  playlistPanelLazyBound = false;
}

function __mineradioInitCoreAppState22() {
  smoothWheelScrollBound = false;

  coverProcessToken = 0, aiDepthPipeline = null, aiDepthReady = false, aiDepthBusy = false, aiDepthFailUntil = 0;

  coverDepthCache = Object.create(null), coverDepthCacheKeys = [];

  aiDepthLastRunAt = 0, aiDepthMinGapMs = 18000;

  updatePreviewState = {
    visible: false,
    open: false,
    status: 'idle',
    progress: 0,
    timer: null,
    pollTimer: null,
    downloadJobId: '',
    patchJobId: '',
    mode: 'installer',
    installerPath: '',
    installerOpened: false,
    cached: false,
    currentVersion: '2.0.0',
    version: '2.0.0',
    configured: false,
    preview: true,
    updateAvailable: false,
    releaseUrl: '',
    downloadUrl: '',
    patchAvailable: false,
    patchUrl: '',
    received: 0,
    total: 0,
    speedBps: 0,
    etaSeconds: 0,
    sourceLabel: '',
    attempt: 0,
    attempts: 0,
    errorReason: '',
    errorDetail: '',
    failedAttempts: [],
    message: '',
    restartRequired: false,
    restartStarted: false,
    patchFallbackTried: false,
    hero: '当前版本，更新检测已就绪。',
    notes: [
      '安装包文字对比修复',
      '安装目录可自由选择',
      '单实例与快捷方式修复'
    ]
  };

  targetVolume = readSavedVolume();

  lastNonZeroVolume = targetVolume > 0.01 ? targetVolume : 0.8;

  volumeCloseTimer = null;
}
