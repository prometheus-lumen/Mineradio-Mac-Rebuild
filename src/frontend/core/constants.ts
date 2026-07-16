// Core constants and their ordered compatibility initializers.
interface HotkeyActionDefinition {
  key: string;
  label: string;
  category: string;
  local: string;
  global: string;
}

var frequencyData: Uint8Array<ArrayBuffer>;
var timeDomainData: Uint8Array<ArrayBuffer>;
var beatFrequencyData: Uint8Array<ArrayBuffer>;
var beatTimeDomainData: Uint8Array<ArrayBuffer>;
var loginStatus: PlatformStatus;
var playlistPanelRenderLimit: number;
var LOCAL_BEAT_COMBOS: string[];
var HOTKEY_ACTIONS: HotkeyActionDefinition[];
var HOME_CARD_DEFAULT_ORDER: string[];
var HOME_CARD_LABELS: Record<string, string>;
var AUDIO_GESTURE_PRIME_SRC: string;
var CUSTOM_COVER_STORE_KEY: string;
var CUSTOM_BACKGROUND_MEDIA_STORE_KEY: string;
var GLOBAL_BACKGROUND_MEDIA_STORE_KEY: string;
var CUSTOM_LYRIC_STORE_KEY: string;
var CUSTOM_LYRIC_PREF_STORE_KEY: string;
var LYRIC_LAYOUT_STORE_KEY: string;
var VISUAL_PRESET_SCHEMA: string;
var PLAYBACK_QUALITY_STORE_KEY: string;
var UPLOAD_TIP_STORE_KEY: string;
var DIY_MODE_STORE_KEY: string;
var PLAYLIST_PANEL_PIN_STORE_KEY: string;
var PLAYLIST_SOURCE_FILTER_STORE_KEY: string;
var USER_CAPSULE_AUTO_HIDE_STORE_KEY: string;
var FX_FAB_AUTO_HIDE_STORE_KEY: string;
var CONTROLS_AUTO_HIDE_STORE_KEY: string;
var FREE_CAMERA_STORE_KEY: string;
var HOTKEY_SETTINGS_STORE_KEY: string;
var VISUAL_GUIDE_SEEN_STORE_KEY: string;
var LOCAL_BEATMAP_STORE_KEY: string;
var LOCAL_BEAT_PREF_STORE_KEY: string;
var HOME_CARD_LAYOUT_KEY: string;
var HOME_CARD_SETTINGS_KEY: string;
var HOME_HERO_MEDIA_DB_NAME: string;
var HOME_HERO_MEDIA_STORE: string;
var HOME_HERO_MEDIA_KEY: string;
var HOME_LISTEN_STATS_KEY: string;
var HOME_WEATHER_CITY_KEY: string;
var HOME_SLEEP_TIMER_KEY: string;
var FFT_SIZE: number;
var BEAT_FFT_SIZE: number;
var AUDIO_FADE_IN_MS: number;
var AUDIO_FADE_OUT_MS: number;
var AUDIO_SILENCE_GAIN: number;
var VISUAL_PRESET_MAX_INDEX: number;
var HOME_HERO_MEDIA_MAX_BYTES: number;
var PLAYLIST_PANEL_BATCH_SIZE: number;
var PLAYLIST_DETAIL_INITIAL_RENDER: number;
var PLAYLIST_DETAIL_BATCH_SIZE: number;

function __mineradioInitCoreConstants02() {
  AUDIO_GESTURE_PRIME_SRC = 'data:audio/wav;base64,UklGRrQBAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YZABAACAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA';
}

function __mineradioInitCoreConstants04() {
  FFT_SIZE = 2048;

  frequencyData = new Uint8Array(FFT_SIZE / 2);

  timeDomainData = new Uint8Array(FFT_SIZE);

  BEAT_FFT_SIZE = 2048;

  beatFrequencyData = new Uint8Array(BEAT_FFT_SIZE / 2);

  beatTimeDomainData = new Uint8Array(BEAT_FFT_SIZE);
}

function __mineradioInitCoreConstants06() {
  loginStatus = { loggedIn: false, vipType: 0, vipLevel: 'none', isVip: false, isSvip: false, vipLabel: '无VIP' };
}

function __mineradioInitCoreConstants08() {
  AUDIO_FADE_IN_MS = 460;

  AUDIO_FADE_OUT_MS = 420;

  AUDIO_SILENCE_GAIN = 0.0001;
}

function __mineradioInitCoreConstants10() {
  CUSTOM_COVER_STORE_KEY = 'mineradio-custom-covers';

  CUSTOM_BACKGROUND_MEDIA_STORE_KEY = 'mineradio-custom-background-media-v1';

  GLOBAL_BACKGROUND_MEDIA_STORE_KEY = 'mineradio-global-background-media-v1';

  CUSTOM_LYRIC_STORE_KEY = 'mineradio-custom-lyrics-v1';

  CUSTOM_LYRIC_PREF_STORE_KEY = 'mineradio-custom-lyric-prefs-v1';

  LYRIC_LAYOUT_STORE_KEY = 'mineradio-lyric-layout-v1';

  VISUAL_PRESET_SCHEMA = 'laser-preset-v1';

  VISUAL_PRESET_MAX_INDEX = 10;

  PLAYBACK_QUALITY_STORE_KEY = 'mineradio-playback-quality-v1';

  UPLOAD_TIP_STORE_KEY = 'mineradio-upload-tip-seen';

  DIY_MODE_STORE_KEY = 'mineradio-diy-player-mode-v1';

  PLAYLIST_PANEL_PIN_STORE_KEY = 'mineradio-playlist-panel-pinned-v1';

  PLAYLIST_SOURCE_FILTER_STORE_KEY = 'mineradio-playlist-source-filter-v1';

  USER_CAPSULE_AUTO_HIDE_STORE_KEY = 'mineradio-user-capsule-auto-hide-v1';

  FX_FAB_AUTO_HIDE_STORE_KEY = 'mineradio-fx-fab-auto-hide-v1';

  CONTROLS_AUTO_HIDE_STORE_KEY = 'mineradio-controls-auto-hide-v1';

  FREE_CAMERA_STORE_KEY = 'mineradio-free-camera-v1';

  HOTKEY_SETTINGS_STORE_KEY = 'mineradio-hotkey-settings-v1';

  VISUAL_GUIDE_SEEN_STORE_KEY = 'mineradio-visual-guide-seen-v2';

  LOCAL_BEATMAP_STORE_KEY = 'mineradio-local-beatmaps-v1';

  LOCAL_BEAT_PREF_STORE_KEY = 'mineradio-local-beatmap-prefs-v1';

  LOCAL_BEAT_COMBOS = ['', 'downbeat', 'push', 'drop', 'rebound', 'accent'];
}

function __mineradioInitCoreConstants12() {
  HOTKEY_ACTIONS = [
    { key:'togglePlay', label:'播放 / 暂停', category:'播放', local:'Space', global:'Ctrl+Alt+Space' },
    { key:'prevTrack', label:'上一首', category:'播放', local:'ArrowLeft', global:'Ctrl+Alt+ArrowLeft' },
    { key:'nextTrack', label:'下一首', category:'播放', local:'ArrowRight', global:'Ctrl+Alt+ArrowRight' },
    { key:'volumeUp', label:'音量增加', category:'音量', local:'ArrowUp', global:'Ctrl+Alt+ArrowUp' },
    { key:'volumeDown', label:'音量降低', category:'音量', local:'ArrowDown', global:'Ctrl+Alt+ArrowDown' },
    { key:'toggleFullscreen', label:'全屏', category:'窗口', local:'KeyF', global:'Ctrl+Alt+KeyF' },
    { key:'toggleDesktopLyrics', label:'桌面歌词', category:'歌词', local:'Alt+KeyL', global:'Ctrl+Alt+KeyL' }
  ];
}

function __mineradioInitCoreConstants14() {
  HOME_CARD_LAYOUT_KEY = 'mineradio-home-card-layout-v1';

  HOME_CARD_SETTINGS_KEY = 'mineradio-home-card-settings-v1';

  HOME_HERO_MEDIA_DB_NAME = 'mineradio-home-media-v1';

  HOME_HERO_MEDIA_STORE = 'media';

  HOME_HERO_MEDIA_KEY = 'hero-background';

  HOME_HERO_MEDIA_MAX_BYTES = 80 * 1024 * 1024;

  HOME_CARD_DEFAULT_ORDER = ['library', 'daily', 'private', 'profile', 'more', 'recent'];

  HOME_CARD_LABELS = { weather: '左侧大卡片', library: '我的歌单', daily: '每日推荐', private: '私人电台', profile: '听歌画像', more: '常听歌手', recent: '最近听过' };
}

function __mineradioInitCoreConstants16() {
  HOME_LISTEN_STATS_KEY = 'mineradio-listen-stats-v1';

  HOME_WEATHER_CITY_KEY = 'mineradio-weather-city';

  HOME_SLEEP_TIMER_KEY = 'mineradio-home-sleep-timer-v1';
}

function __mineradioInitCoreConstants19() {
  PLAYLIST_PANEL_BATCH_SIZE = 28;

  playlistPanelRenderLimit = PLAYLIST_PANEL_BATCH_SIZE;
}

function __mineradioInitCoreConstants21() {
  PLAYLIST_DETAIL_INITIAL_RENDER = 64;

  PLAYLIST_DETAIL_BATCH_SIZE = 48;
}
