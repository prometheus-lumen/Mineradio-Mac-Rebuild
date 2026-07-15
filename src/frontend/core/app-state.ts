// Mineradio classic module: core/app-state.
Object.assign(globalThis, {
  audio: undefined, audioCtx: undefined, source: undefined, analyser: undefined, gainNode: undefined, audioReady: undefined, audioGesturePrimeActive: undefined, uiSfxCtx: undefined,
  frequencyData: undefined, timeDomainData: undefined, mid: undefined, audioEnergy: undefined, prevEnergy: undefined, smoothMid: undefined, smoothTreb: undefined, smoothEnergy: undefined,
  midPeak: undefined, energyPeak: undefined, lastStrongDrop: undefined, playlist: undefined, playQueue: undefined, currentIdx: undefined, playing: undefined, playToggleBusy: undefined,
  searchMode: undefined, podcastResults: undefined, podcastPrograms: undefined, podcastCurrentRadio: undefined, loginStatus: undefined, qqLoginStatus: undefined, kugouLoginStatus: undefined, qqLoginAutoRefreshTimer: undefined,
  qqLoginWasLoggedIn: undefined, kugouLoginWasLoggedIn: undefined, loginProvider: undefined, activeAccountProvider: undefined, dualAccountMode: undefined, qqCookieBusy: undefined, neteaseWebLoginBusy: undefined, qqWebLoginBusy: undefined,
  kugouWebLoginBusy: undefined, qqManualCookieOpen: undefined, loginStatusChecked: undefined, loginStatusCheckFailed: undefined, qrPollTimer: undefined, qrKey: undefined, volumeTween: undefined, trackSwitchToken: undefined,
  audioFadeTimer: undefined, audioElementFadeFrame: undefined, audioFadeSerial: undefined, userPlaylists: undefined, qqPlaylists: undefined, kugouPlaylists: undefined, myPodcastCollections: undefined, myPodcastItems: undefined,
  playlistSourceFilter: undefined, hotkeyCaptureState: undefined, hotkeyGlobalStatus: undefined, diyPlayerMode: undefined, customBackgroundMediaMap: undefined, globalBackgroundMedia: undefined, playbackQuality: undefined, qqPlaybackQualityCeiling: undefined,
  currentLocalSong: undefined, likedSongMap: undefined, likeBusyMap: undefined, likeStatusToken: undefined, collectTargetSong: undefined, collectBusy: undefined, uploadTipTimer: undefined, uploadTipAttempts: undefined,
  emptyHomeActive: undefined, homeForcedOpen: undefined, homeSuppressed: undefined, homeCardLayoutState: undefined, homeCardSettingsState: undefined, homeHeroMediaDbPromise: undefined, homeHeroMediaObjectUrl: undefined, homeHeroMediaReady: undefined,
  homeHeroMediaLoading: undefined, homeCardDragActive: undefined, homeWeatherRadioState: undefined, homeWeatherToken: undefined, homeWeatherLoadTimer: undefined, homeWeatherLoadPromise: undefined, homeWeatherStartupLocateDone: undefined, homeWeatherPrewarmStarted: undefined,
  homeWeatherSilentPrewarmActive: undefined, weatherRadioStartBusy: undefined, activeRadioContext: undefined, homeClockTimer: undefined, homeSleepState: undefined, listenStatsState: undefined, listenSession: undefined, appPerfMarks: undefined,
  queueViewTab: undefined, playMode: undefined, miniQueueOpen: undefined, miniQueueRenderSeq: undefined, queueRenderSeq: undefined, playlistRenderSeq: undefined, queuePanelDirty: undefined, playlistPanelRenderLimit: undefined,
  playlistPanelLazyBound: undefined, smoothWheelScrollBound: undefined, aiDepthPipeline: undefined, aiDepthReady: undefined, aiDepthBusy: undefined, aiDepthFailUntil: undefined, aiDepthLastRunAt: undefined, aiDepthMinGapMs: undefined,
  updatePreviewState: undefined, targetVolume: undefined, lastNonZeroVolume: undefined, volumeCloseTimer: undefined, emptyHomeStartEl: undefined, homeWallpaperPrewarmStarted: undefined, trackDetailSeq: undefined, detailArtistSongs: undefined,
  searchTimer: undefined, searchRequestSeq: undefined, searchLastResultQuery: undefined, $input: undefined, $results: undefined, $loading: undefined, searchBoxEl: undefined, firstPlayDone: undefined,
  sourceFallbackNoticeTimer: undefined, controlGlassState: undefined, playlistPanelDetailState: undefined, podcastListEl: undefined, progressDragState: undefined, progressBar: undefined, playbackProgressIdleSynced: undefined, dropOv: undefined,
  dragCount: undefined, presetMeta: undefined, presetIcons: undefined, presetDisplayOrder: undefined, hadStoredUserFxArchives: undefined, userFxArchives: undefined, userFxArchiveEditing: undefined, homeWaveTrackState: undefined,
  strobeFlashState: undefined, fxPanelTab: undefined, globalHotkeyListenerBound: undefined, startupLoginGuideShown: undefined, loginGuideAnimating: undefined, loginGuideRaf: undefined, idleGuideCanvas: undefined, idleGuideCtx: undefined, idleGuideW: undefined,
  idleGuideH: undefined, idleGuideDpr: undefined, idleGuideTrails: undefined, idleGuideStartedAt: undefined, idleGuideVisible: undefined, idleGuideLastFrameAt: undefined, idleGuideDelayTimer: undefined, idleGuideInteraction: undefined,
  gestureVideo: undefined, gestureHands: undefined, gestureStream: undefined, gestureFrameRaf: undefined, gestureFrameBusy: undefined, gestureFrameCount: undefined, gestureLastFrameErrorAt: undefined, gestureActive: undefined,
  gestureStartPromise: undefined, gestureStartToken: undefined, gestureLastStopAt: undefined, handLmSmooth: undefined, handLmLastSeen: undefined, pinchState: undefined, gestureRotation: undefined, gestureGrip: undefined,
  handCanvas: undefined, handCanvasCtx: undefined, peekTimers: undefined, secondaryPlaylistEdgeGuard: undefined, splashAnimating: undefined, splashCanvas: undefined, splashCtx: undefined, splashGl: undefined,
  splashGlProgram: undefined, splashGlBuffer: undefined, splashW: undefined, splashH: undefined, splashDust: undefined, splashStreaks: undefined, splashShards: undefined, splashPixelRatio: undefined,
  splashStartedAt: undefined, splashSoundPlayed: undefined, splashAudioCtx: undefined, splashSoundFallbackArmed: undefined, splashTimer: undefined, reduceSplashMotion: undefined, splashReadyToEnter: undefined, startupLoginStatusPromise: undefined,
  collectNameInput: undefined, prevTime: undefined, renderPerfState: undefined, splashWarmRenderLast: undefined, animationLoopTimer: undefined, animationFramePending: undefined, baseCheckQr: undefined,
});

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

  strobeFlashState = { active:false, startedAt:0, duration:500, exponent:2.65, peak:1, lastTriggerAt:-1000, sequence:0 };

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
    currentVersion: '2.0.3',
    version: '2.0.3',
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
    notes: []
  };

  targetVolume = readSavedVolume();

  lastNonZeroVolume = targetVolume > 0.01 ? targetVolume : 0.8;

  volumeCloseTimer = null;
}
