interface HomeSleepState {
  active: boolean;
  endsAt: number;
  waitCurrent: boolean;
  pendingAfterSong?: boolean;
  minutes: number;
}

interface HomeTile {
  kind: string;
  index?: number;
  record?: HomeListenRecord;
  query?: string;
  title?: string;
  sub?: string;
  cover?: string;
  tone?: string;
  song?: PlaylistSong;
}

interface HomeTileRow extends HTMLElement {
  _homeTiles?: HomeTile[];
}

interface PlaybackRestriction {
  category?: string;
  message?: string;
}

interface PlaybackUnavailableResponse {
  reason?: string;
  restriction?: PlaybackRestriction;
  message?: string;
  level?: string;
  quality?: string;
  br?: number;
  url?: string;
  trial?: boolean;
  loggedIn?: boolean;
  vipLevel?: string;
  [key: string]: unknown;
}

declare let homeSleepState: HomeSleepState;

declare function performHomeSleepClose(reason: string): void;
declare function padHomeTime(value: number): string;
declare function playWeatherSong(index?: number): Promise<void>;
declare function playHomeRecent(record?: HomeListenRecord | null): Promise<void>;
declare function openHomeInsight(): void;
declare function playHomeSong(index?: number): void;
declare function openHomeLocalImport(): void;
declare function openHomeProductGuide(): void;
declare function openHomePlaylist(index?: number): void;
declare function openHomePodcast(index?: number): void;
declare function setSearchMode(mode: string): void;
declare function loadPodcastHot(): void;
declare function openHomeLibrary(): void;
declare function runHomeSearch(query: string, mode?: string): void;
declare function playbackLoginProvider(song: PlaylistSong): MusicProvider;
declare function playbackRestrictionMessage(song: PlaylistSong, data: PlaybackUnavailableResponse): string;
declare function openProviderLogin(provider: MusicProvider): void;
