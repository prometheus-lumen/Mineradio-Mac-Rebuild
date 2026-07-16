var fxDefaults: FxSettings;
var fx: FxSettings;
var PACKAGED_DEFAULT_USER_FX_ARCHIVE_NAME: string;
var PACKAGED_DEFAULT_USER_FX_ARCHIVE_EXPORTED_AT: number;
var PACKAGED_DEFAULT_USER_FX_ARCHIVE_SAVED_AT: number;
var PACKAGED_DEFAULT_FX_SNAPSHOT: Readonly<Partial<FxSettings>>;
var DEVELOPMENT_LOCKED_FX: Record<string, boolean>;
var CURSOR_HIDE_DELAY: number;
var IMMERSIVE_CURSOR_HIDE_DELAY: number;

// Mineradio classic module: ui/fx-state.
function applyIconAccentColors(): void {
  var homeColor = normalizeHexColor(fx.homeIconColor || fxDefaults.homeIconColor || '#f4d28a', '#f4d28a');
  var visualColor = normalizeHexColor(fx.visualIconColor || fxDefaults.visualIconColor || '#7fd8ff', '#7fd8ff');
  var homeRgb = hexToRgb(homeColor);
  var visualRgb = hexToRgb(visualColor);
  var root = document.documentElement;
  root.style.setProperty('--home-icon-color', homeColor);
  root.style.setProperty('--home-icon-rgb', homeRgb.r + ',' + homeRgb.g + ',' + homeRgb.b);
  root.style.setProperty('--visual-icon-color', visualColor);
  root.style.setProperty('--visual-icon-rgb', visualRgb.r + ',' + visualRgb.g + ',' + visualRgb.b);
}

function updateIconAccentControls(): void {
  applyIconAccentColors();
  var homeColor = normalizeHexColor(fx.homeIconColor || fxDefaults.homeIconColor || '#f4d28a', '#f4d28a');
  var visualColor = normalizeHexColor(fx.visualIconColor || fxDefaults.visualIconColor || '#7fd8ff', '#7fd8ff');
  var homePicker = document.getElementById('home-icon-picker') as HTMLInputElement | null;
  var homeValue = document.getElementById('home-icon-value');
  var visualPicker = document.getElementById('visual-icon-picker') as HTMLInputElement | null;
  var visualValue = document.getElementById('visual-icon-value');
  if (homePicker) homePicker.value = homeColor;
  if (homeValue) homeValue.textContent = homeColor.toUpperCase();
  if (visualPicker) visualPicker.value = visualColor;
  if (visualValue) visualValue.textContent = visualColor.toUpperCase();
}

function setVisualIconColor(color: unknown, silent = false): void {
  fx.visualIconColor = normalizeHexColor(color || fxDefaults.visualIconColor || '#7fd8ff', '#7fd8ff');
  updateIconAccentControls();
  saveLyricLayout();
  if (!silent) showToast('视觉图标: ' + fx.visualIconColor.toUpperCase());
}

function resetVisualIconColor(): void {
  setVisualIconColor(fxDefaults.visualIconColor || '#7fd8ff');
}

function __mineradioInitUiFxState24(): void {
  // fx 状态: 预设 + 主滑块 + 开关 + 三态
  fxDefaults = {
    preset: 0,            // 0=emily cover, 1=tunnel, 2=orbit, 3=void, 4=vinyl, 5=wallpaper, 6=skull, 7=hexagram, 8=particle clock, 9=strobe, 10=topography
    intensity: 0.85,
    cinemaShake: 0.5,
    depth: 1.0,
    coverResolution: 1.55,
    point: 1.0, speed: 1.0, twist: 0.0, color: 1.10, scatter: 0.0, bgFade: 0.20,
    bloomStrength: 0.62,
    lyricGlowStrength: 0.28,
    lyricScale: 1.0,
    lyricOffsetX: 0,
    lyricOffsetY: 0,
    lyricOffsetZ: 0,
    lyricTiltX: 0,
    lyricTiltY: 0,
    lyricColorMode: 'auto',
    lyricColor: '#a9b8c8',
    lyricHighlightMode: 'auto',
    lyricHighlightColor: '#fac900',
    lyricGlowLinked: true,
    lyricGlowColor: '#008aff',
    lyricFont: 'hei',
    lyricLetterSpacing: 0,
    lyricLineHeight: 1.0,
    lyricWeight: 900,
    lyricFlowMode: 'single',
    visualTintMode: 'auto',
    visualTintColor: '#9db8cf',
    uiAccentColor: '#ffffff',
    homeAccentColor: '#ffffff',
    homeIconColor: '#ffffff',
    visualIconColor: '#ffffff',
    backgroundColorMode: 'cover',
    backgroundColor: '#000000',
    backgroundOpacity: 1,
    controlGlassChromaticOffset: 90,
    backgroundColorCustom: false,
    backgroundImage: '',
    backgroundMedia: null,
    strobeCustomBackground: false,
    strobeCustomBackgroundOpacity: 0.65,
    desktopLyrics: false,
    desktopLyricsSize: 1.0,
    desktopLyricsOpacity: 0.92,
    desktopLyricsY: 0.76,
    desktopLyricsClickThrough: false,
    desktopLyricsCinema: true,
    desktopLyricsHighlight: false,
    desktopLyricsFps: 60,
    wallpaperMode: false,
    wallpaperOpacity: 1,
    floatLayer: false, cinema: true, edge: false, aiDepth: false, bloom: false, lyricGlow: true,
    lyricGlowBeat: true,
    lyricGlowParticles: false,
    lyricCameraLock: false,
    particleLyrics: true,    // v7.2: 粒子歌词
    backCover: false,        // 旧的封面背面粒子层关闭；浮空粒子层会跟随封面翻转
    shelf: 'side',
    shelfCameraMode: 'static',
    shelfPresence: 'always',
    shelfShowPodcasts: false,
    shelfMergeCollections: false,
    shelfSize: 1,
    shelfOffsetX: 0,
    shelfOffsetY: 0,
    shelfOffsetZ: 0,
    shelfAngleY: -15,
    shelfAngleYManual: false,
    shelfOpacity: 1,
    shelfBgOpacity: 0.90,
    shelfAccentColor: '#ffffff',
    performanceBackground: 'auto',
    performanceQuality: 'high',
    liveBackgroundKeep: false,
    cam: 'off',
  };

  PACKAGED_DEFAULT_USER_FX_ARCHIVE_NAME = '默认测试';

  PACKAGED_DEFAULT_USER_FX_ARCHIVE_EXPORTED_AT = 1782276031784;

  PACKAGED_DEFAULT_USER_FX_ARCHIVE_SAVED_AT = 1782273019045;

  PACKAGED_DEFAULT_FX_SNAPSHOT = Object.freeze({
    visualPresetSchema: VISUAL_PRESET_SCHEMA,
    preset: 0,
    intensity: 0.85,
    cinemaShake: 0.5,
    depth: 1,
    coverResolution: 1.55,
    point: 1,
    speed: 1,
    twist: 0,
    color: 1.1,
    scatter: 0,
    bgFade: 0.2,
    bloomStrength: 0.62,
    lyricGlowStrength: 0.28,
    lyricScale: 1,
    lyricOffsetX: 0,
    lyricOffsetY: 0,
    lyricOffsetZ: 0,
    lyricTiltX: 0,
    lyricTiltY: 0,
    lyricCameraLock: false,
    lyricColorMode: 'auto',
    lyricColor: '#a9b8c8',
    lyricHighlightMode: 'auto',
    lyricHighlightColor: '#fac900',
    lyricGlowLinked: true,
    lyricGlowColor: '#008aff',
    lyricFont: 'hei',
    lyricLetterSpacing: 0,
    lyricLineHeight: 1,
    lyricWeight: 900,
    lyricFlowMode: 'single',
    visualTintMode: 'auto',
    visualTintColor: '#9db8cf',
    uiAccentColor: '#ffffff',
    homeAccentColor: '#ffffff',
    homeIconColor: '#ffffff',
    visualIconColor: '#ffffff',
    backgroundColorMode: 'cover',
    backgroundColor: '#000000',
    backgroundOpacity: 1,
    controlGlassChromaticOffset: 90,
    backgroundColorCustom: false,
    strobeCustomBackground: false,
    strobeCustomBackgroundOpacity: 0.65,
    floatLayer: false,
    cinema: true,
    edge: false,
    aiDepth: false,
    bloom: false,
    lyricGlow: true,
    lyricGlowBeat: true,
    lyricGlowParticles: false,
    desktopLyrics: false,
    desktopLyricsSize: 1,
    desktopLyricsOpacity: 0.92,
    desktopLyricsY: 0.76,
    desktopLyricsClickThrough: false,
    desktopLyricsCinema: true,
    desktopLyricsHighlight: false,
    desktopLyricsFps: 60,
    performanceBackground: 'auto',
    performanceQuality: 'high',
    liveBackgroundKeep: false,
    particleLyrics: true,
    backCover: false,
    shelf: 'side',
    shelfCameraMode: 'static',
    shelfPresence: 'always',
    shelfShowPodcasts: false,
    shelfMergeCollections: false,
    shelfSize: 1,
    shelfOffsetX: 0,
    shelfOffsetY: 0,
    shelfOffsetZ: 0,
    shelfAngleY: -15,
    shelfAngleYManual: false,
    shelfOpacity: 1,
    shelfBgOpacity: 0.9,
    shelfAccentColor: '#ffffff',
    cam: 'off'
  });

  DEVELOPMENT_LOCKED_FX = {
    wallpaperMode: true
  };

  playbackVisualPreset = readSavedPlaybackVisualPreset();

  startupVisualPreviewActive = false;

  fx = Object.assign({}, fxDefaults, readSavedLyricLayout());

  // 摄像头属于会话级权限能力：每次启动必须由用户主动开启，不能从布局或存档自动恢复。
  fx.cam = 'off';

  normalizeDevelopmentLockedFxState();

  legacyBackgroundMediaForMigration = normalizeCustomBackgroundMedia(fx.backgroundMedia || fx.backgroundImage);

  presetTransition = { active:false, start:-10, duration:0.92, from:0, to:0 };

  controlsAutoHide = readBooleanPreference(CONTROLS_AUTO_HIDE_STORE_KEY, false);

  controlsHovering = false;

  controlsHideTimer = null;

  controlsHandleDimTimer = null;

  controlsLastMoveAt = 0;

  controlsShelfSuppressUntil = 0;

  cursorHideTimer = null;

  CURSOR_HIDE_DELAY = 2500;

  IMMERSIVE_CURSOR_HIDE_DELAY = 5000;

  fxPanelPinned = false;

  fxPanelClickHoldUntil = 0;

  playlistPanelPinned = readBooleanPreference(PLAYLIST_PANEL_PIN_STORE_KEY, false);

  playlistPanelOpenGuardUntil = 0;

  userCapsuleAutoHide = readBooleanPreference(USER_CAPSULE_AUTO_HIDE_STORE_KEY, false);

  fxFabAutoHide = readBooleanPreference(FX_FAB_AUTO_HIDE_STORE_KEY, false);

  fxFabAutoHideRevealArmed = true;

  hotkeySettings = readHotkeySettings();

  immersiveMode = false;

  immersiveState = {
    shelfMode: null,
    shelfPinnedOpen: false,
    lyrics: true,
    controlsAutoHide: true,
    bottomVisible: false
  };

  // 鼠标 / 摄像头视差
  pointerParallax = { x:0, y:0 };

  pointerTarget = { x:0, y:0 };

  headParallax = { x:0, y:0, active:false };

  headNeutral = null;
}
