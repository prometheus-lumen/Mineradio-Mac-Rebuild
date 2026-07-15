type PlaylistCoverCallback = (image: HTMLImageElement | null) => void;

interface PlaylistCoverRecord {
  loaded: boolean;
  loading: boolean;
  waiters: PlaylistCoverCallback[];
  img: HTMLImageElement | null;
  failed: boolean;
}

interface PlaylistSong {
  id?: string | number;
  name?: string;
  title?: string;
  artist?: string;
  album?: string;
  playable?: boolean;
  fee?: number;
  artists?: Array<{ id?: string | number; mid?: string; name?: string }>;
  _searchScore?: number;
  cover?: string;
  hash?: string;
  albumId?: string | number;
  album_id?: string | number;
  albumAudioId?: string | number;
  album_audio_id?: string | number;
  fileId?: string | number;
  file_id?: string | number;
  mid?: string;
  songmid?: string;
  mediaMid?: string;
  media_mid?: string;
  qqId?: string | number;
  duration?: number;
  durationMs?: number;
  dt?: number;
  type?: string;
  source?: string;
  provider?: string;
  programId?: string | number;
  localKey?: string;
  localUrl?: string;
  localBeatMode?: 'mr' | 'dj';
  qualityHashes?: Record<string, string>;
  autoFallbackFrom?: string;
  radioContext?: unknown;
  _lastPlaybackFailAt?: number;
  [key: string]: unknown;
}

interface PlaylistMetadata {
  name?: string;
  [key: string]: unknown;
}

interface PlaylistTracksResponse {
  error?: string;
  tracks?: PlaylistSong[];
  playlist?: PlaylistMetadata;
}

declare let playlistCoverCache: Record<string, PlaylistCoverRecord>;
declare let homeForcedOpen: boolean;
declare let homeSuppressed: boolean;
declare let playQueue: PlaylistSong[];
declare let currentIdx: number;
declare let playMode: PlayMode;
declare let queuePanelDirty: boolean;
declare let miniQueueRenderSeq: number;
declare let queueRenderSeq: number;
declare let smoothWheelScrollBound: boolean;

declare function isInlineCoverSrc(url: string): boolean;
declare function coverProxySrc(url: string, avatar?: boolean): string;
declare function updateEmptyHomeVisibility(options?: { forceLoad?: boolean }): unknown;
declare function showLoading(): void;
declare function hideLoading(): void;
declare function cloneSong(song: PlaylistSong): PlaylistSong;
declare function isLikedPlaylistContext(
  id: string | number,
  title: string,
  playlist?: PlaylistMetadata
): boolean;
declare function markSongsLiked(songs: PlaylistSong[], liked: boolean): void;
declare function syncLikeStatusForSongs(songs: PlaylistSong[]): void;
interface QueueRenderOptions {
  animate?: boolean;
  scrollCurrent?: boolean;
  deferWhenHidden?: boolean;
}

interface QueueInsertOptions {
  position?: 'next';
}

type PlayMode = 'loop' | 'shuffle' | 'single';

interface QueueTrackSession {
  index: number;
  token: number;
  song: PlaylistSong;
  context: unknown;
  beatMapKey: string;
  podcastDjMode: boolean;
  firstVisualPlay: boolean;
}

interface QueuePlaybackSource {
  data: PlaybackUnavailableResponse & { url: string };
  provider: MusicProvider | 'local';
  requestedQuality: PlaybackQuality;
  isQQ: boolean;
  isKugou: boolean;
  proxyAudioUrl: string;
  earlyPlayback: Promise<boolean> | null;
}

declare let activeRadioContext: unknown;

declare function safeRenderQueuePanel(reason: string, options?: QueueRenderOptions): boolean;
declare function safeSwitchPlaylistTab(tab: string, reason: string): void;
declare function safeShelfRebuild(reason: string, asyncCards?: boolean): boolean;
declare function forcePlaybackControlsInteractive(): void;
declare function primeAudioForUserGesture(): void;
declare function isPlaylistPanelVisibleForRender(): boolean;
declare function openArtistDetailForSong(song: PlaylistSong): void;
declare function renderQueuePanel(options?: QueueRenderOptions): void;
declare function smoothScrollToItem(
  container: SmoothScroller | null,
  item: HTMLElement | null,
  options?: SmoothScrollOptions
): void;
interface PlayQueueOptions {
  manual?: boolean;
  qualityOverride?: PlaybackQuality;
  qualitySwitch?: boolean;
  resumeAt?: number;
  preserveHomeState?: boolean;
  fallbackDepth?: number;
  qqQualityTried?: PlaybackQuality[];
  context?: unknown;
  autoRepeat?: boolean;
  kugouPlaybackRetried?: boolean;
}
declare function playQueueAt(index: number, options?: PlayQueueOptions): Promise<void>;
