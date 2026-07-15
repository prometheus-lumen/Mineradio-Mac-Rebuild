interface HomeCardSettings {
  height: number;
  opacity: number;
  showCalendar: boolean;
  heroBg: string;
  heroMediaType: '' | 'image' | 'video';
  heroMediaName: string;
}

interface HomeHeroMediaRecord {
  blob?: Blob;
  src?: string;
  type: 'image' | 'video';
  name?: string;
  size?: number;
  updatedAt?: number;
}

interface HomeCardLayout {
  order: string[];
  hidden: string[];
  heroSide: 'left';
}

interface HomeDiscoverState {
  loading: boolean;
  loaded: boolean;
  loggedIn: boolean;
  mode: string;
  songs: PlaylistSong[];
  playlists: HomePlaylistItem[];
  podcasts: HomePodcastItem[];
  error: string;
  updatedAt: number;
}

interface HomePlaylistItem {
  id?: string | number;
  name?: string;
  cover?: string;
  creator?: string;
  trackCount?: number;
}

interface HomePodcastItem {
  id?: string | number;
  name?: string;
  cover?: string;
}

interface HomeListenRecord {
  key?: string;
  id?: string | number;
  mid?: string;
  mediaMid?: string;
  type?: string;
  sourceKey?: string;
  name?: string;
  artist?: string;
  source?: string;
  cover?: string;
  playedAt?: number;
  listenMs?: number;
  completed?: boolean;
  context?: unknown;
}

interface HomeListenHistoryRecord extends HomeListenRecord {
  key: string;
  name: string;
  artist: string;
  cover: string;
  source: string;
  listenMs: number;
}

interface HomeListenSnapshot extends PlaylistSong {
  key: string;
  sourceKey: string;
}

interface HomeDiscoverResponse {
  loggedIn?: boolean;
  mode?: string;
  dailySongs?: PlaylistSong[];
  playlists?: HomePlaylistItem[];
  podcasts?: HomePodcastItem[];
  updatedAt?: number;
}

interface HomeWeatherOptions {
  lat?: number;
  lon?: number;
  city?: string;
  timezone?: string;
  silentPrewarm?: boolean;
  forceLocate?: boolean;
  startup?: boolean;
  prewarm?: boolean;
  silent?: boolean;
  preserveHomeState?: boolean;
}

interface HomeWeatherApiResponse {
  weather?: HomeWeather;
  radio?: HomeWeatherRadio;
}

interface IpLocationResponse {
  location?: { latitude?: number; longitude?: number; city?: string; timezone?: string };
  error?: string;
}

interface HomeNowCoverState {
  key: string;
}

declare let homeNowCoverState: HomeNowCoverState;
declare let emptyHomeStartEl: HTMLElement | null;
declare let homeWallpaperPrewarmStarted: boolean;

interface HTMLElement {
  _homeCustomizeBound?: boolean;
  _homeDragSuppressClick?: boolean;
  _homeCardMenuBound?: boolean;
  _homeRestoreBound?: boolean;
  _homeSettingsBound?: boolean;
}

interface HomeSongStat {
  key: string;
  name: string;
  artist: string;
  cover: string;
  source: string;
  plays: number;
  listenMs: number;
  completed: number;
  lastPlayedAt: number;
}

interface HomeArtistStat {
  name: string;
  plays: number;
  listenMs: number;
  lastPlayedAt: number;
}

interface HomeListenArtist {
  name: string;
  plays: number;
}

interface HomeListenSummary {
  recent: HomeListenRecord | null;
  topArtist: HomeListenArtist | null;
  topSong: HomeSongStat | null;
  totalPlays: number;
}

interface ListenStatsState {
  history: HomeListenHistoryRecord[];
  songs: Record<string, HomeSongStat>;
  artists: Record<string, HomeArtistStat>;
  updatedAt: number;
  [key: string]: unknown;
}

declare let homeDiscoverState: HomeDiscoverState;
declare let homeHeroMediaReady: boolean;
declare let homeHeroMediaLoading: boolean;
declare let homeHeroMediaDbPromise: Promise<IDBDatabase> | null;
declare let homeHeroMediaObjectUrl: string;
declare let homeCardSettingsState: HomeCardSettings | null;
declare let homeCardLayoutState: HomeCardLayout | null;
declare let listenStatsState: ListenStatsState;
declare let homeWeatherSilentPrewarmActive: boolean;
declare function cssImageUrl(url: string): string;
declare function readHomeCardSettings(): HomeCardSettings;
declare function deleteHomeHeroMediaRecord(): Promise<void>;
declare function saveHomeCardSettings(): void;
declare function applyHomeCardSettings(): void;
declare function closeHomeCardMenu(): void;
declare function homeCardLabel(id: string): string;
declare function initHomeCardCustomization(): void;
declare function setHomeControlsLocked(locked: boolean): void;
declare function openPlaylistPanelTab(tab: string, preserve?: boolean): void;
declare function doSearch(query: string, options?: SearchOptions): Promise<void>;
declare function renderSearchHistory(): boolean;
declare function readHomeCardLayout(): HomeCardLayout;
declare function saveHomeCardLayout(): void;
declare function applyHomeCardLayout(): void;
declare function closeHomeRestoreMenu(): void;
declare function closeHomeSettingsMenu(): void;
declare function hideHomeCardById(id?: string | null): void;
declare function restoreHomeCard(id?: string | null): void;
declare function restoreHomeCards(): void;
declare function bindHomeSleepControls(): void;
declare function updateHomeClockAndSleep(): void;
declare function homeListenSummary(): HomeListenSummary;
declare function songSourceLabel(song: PlaylistSong): string;
