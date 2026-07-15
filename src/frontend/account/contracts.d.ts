type MusicProvider = 'netease' | 'qq' | 'kugou';
type ProviderVipLevel = 'none' | 'vip' | 'svip';

interface PlatformStatus {
  loggedIn?: boolean;
  nickname?: string;
  userId?: string | number;
  avatar?: string;
  preview?: boolean;
  vipType?: number;
  vip_type?: number;
  vip?: number;
  vipLevel?: string;
  vip_level?: string;
  vipLabel?: string;
  isVip?: boolean;
  is_vip?: boolean;
  isSvip?: boolean;
  is_svip?: boolean;
  [key: string]: unknown;
}

interface LoginApiResponse extends PlatformStatus {
  ok?: boolean;
  cookie?: string;
  partial?: boolean;
  saved?: boolean;
  message?: string;
  error?: string;
  playbackKeyReady?: boolean;
  profileUnavailable?: boolean;
  stale?: boolean;
  uin?: string | number;
  code?: number;
  key?: string;
  img?: string;
  hasCookie?: boolean;
  pendingProfile?: boolean;
  songs?: PlaylistSong[];
  result?: { songs?: PlaylistSong[] };
}

interface QrKeyResponse { key?: string; img?: string; message?: string; error?: string; }

interface PlatformMeta {
  key: MusicProvider;
  short: string;
  dot: string;
  label: string;
  app: string;
}

declare let activeAccountProvider: MusicProvider;
declare let dualAccountMode: boolean;
declare let qqLoginStatus: PlatformStatus;

declare function firstLoggedProvider(): MusicProvider;
declare function platformStatus(provider: MusicProvider): PlatformStatus;
declare function platformMeta(provider: MusicProvider): PlatformMeta;
declare function providerAvatarSrc(provider: MusicProvider, status: PlatformStatus): string;
declare function providerVipLevel(provider: MusicProvider, status?: PlatformStatus): ProviderVipLevel;
declare function hasProviderVip(provider: MusicProvider, status?: PlatformStatus): boolean;
declare function hasPlatformLogin(provider: MusicProvider): boolean;
declare function hasAnyPlatformLogin(): boolean;
declare function showLoginModal(options?: { provider?: MusicProvider; guided?: boolean; source?: string }): void;
interface LikeCheckResponse {
  fileIds?: Record<string, number>;
  liked?: Record<string, boolean>;
}

interface LikeMutationResponse {
  error?: string;
  success?: boolean;
}

interface CollectionMutationResponse {
  error?: string;
  message?: string;
  msg?: string;
  success?: boolean;
  playlist?: { id?: string | number };
}

interface AccountPlaylist extends PlaylistMetadata {
  id?: string | number;
  name?: string;
  specialType?: number;
  subscribed?: boolean;
  cover?: string;
  trackCount?: number;
  playCount?: number;
  creator?: string;
  provider?: MusicProvider;
  source?: MusicProvider;
}

declare let likedSongMap: Record<string, boolean>;
declare let likeBusyMap: Record<string, boolean>;
declare let collectBusy: boolean;
declare let collectTargetSong: PlaylistSong | null;
declare let likeStatusToken: number;
declare let kugouLoginStatus: PlatformStatus;
declare let userPlaylists: AccountPlaylist[];
declare let miniQueueOpen: boolean;
declare let trackDetailSeq: number;
declare let detailArtistSongs: PlaylistSong[];

declare function currentCoverSong(): PlaylistSong | null;
declare function isCloudSong(song: PlaylistSong): boolean;
declare function isKugouSong(song: PlaylistSong): boolean;
declare function refreshSearchResultActionStates(): void;
declare function waitForKugouSync(delayMs: number): Promise<void>;
declare function songProviderKey(song: PlaylistSong | null): MusicProvider | 'local';
declare function ensureKugouLoggedInForAction(): boolean;
declare function ensureLoggedInForAction(): boolean;
declare function refreshUserPlaylists(force: boolean): Promise<unknown>;
declare function songCoverSrc(song: PlaylistSong | null | undefined, size: number): string;
declare function miniQueueSkeleton(): string;
declare function verifySongInPlaylist(pid: string | number, songId: string): Promise<boolean>;
declare function hydrateCustomCover(song: PlaylistSong): PlaylistSong;
declare function isSongLiked(song: PlaylistSong): boolean;
declare function heartIconSvg(): string;
declare function updateLikeButtons(): void;
declare function isHomeBlankDismissClick(event: MouseEvent): boolean;
declare function dismissHomePage(options?: { reason?: string; toast?: boolean }): void;
