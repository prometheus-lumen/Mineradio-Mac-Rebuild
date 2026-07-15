interface ListenSessionState {
  key: string;
  song: HomeListenSnapshot;
  context: unknown;
  startedAt: number;
  lastWallAt: number;
  lastAudioTime: number;
  listenMs: number;
  maxProgress: number;
}

declare let lastStrongDrop: number;
declare let qqLoginAutoRefreshTimer: number | null;
declare let qqLoginWasLoggedIn: boolean;
declare let kugouLoginWasLoggedIn: boolean;
declare let qqCookieBusy: boolean;
declare let neteaseWebLoginBusy: boolean;
declare let qqWebLoginBusy: boolean;
declare let kugouWebLoginBusy: boolean;
declare let qrPollTimer: number | null;
declare let volumeTween: unknown | null;
declare let qqPlaylists: AccountPlaylist[];
declare let kugouPlaylists: AccountPlaylist[];
declare let homeDiscoverToken: number;
declare let homeVisualPrevPreset: number;
declare let homeWeatherToken: number;
declare let homeWeatherLoadTimer: number | null;
declare let homeWeatherLoadPromise: Promise<HomeWeatherRadioState> | null;
declare let homeWeatherStartupLocateDone: boolean;
declare let homeWeatherPrewarmStarted: boolean;
declare let weatherRadioStartBusy: boolean;
declare let homeClockTimer: number | null;
declare let listenSession: ListenSessionState | null;
declare let playlistRenderSeq: number;
declare let playlistPanelLazyBound: boolean;

declare function readHomeSleepTimerState(): HomeSleepState;
declare function loadListenStatsState(): ListenStatsState;

interface Document {
  _mineradioHomeSleepCloseBound?: boolean;
}
