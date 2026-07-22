// Mineradio classic module: core/app-state.
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

  localLibraryState = { songs: [], playlists: [], activePlaylistId: '', selectedSongKeys: {}, loaded: false };

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

  targetVolume = readSavedVolume();

  lastNonZeroVolume = targetVolume > 0.01 ? targetVolume : 0.8;

  volumeCloseTimer = null;
}
