declare function closeTrackDetailModal(): void;
declare function closeLoginModal(): void;

interface GsapTimeline {
  kill(): void;
  fromTo(target: unknown, fromVars: object, toVars: object): GsapTimeline;
  to(target: unknown, vars: object): GsapTimeline;
}

interface GsapApi {
  killTweensOf(target: unknown, properties?: string): void;
  set(target: unknown, vars: object): void;
  fromTo(target: unknown, fromVars: object, toVars: object): GsapTimeline;
  to(target: unknown, vars: object): GsapTimeline;
  timeline(options?: object): GsapTimeline;
}

interface MineradioDesktopApi {
  close?: () => void;
  openNeteaseMusicLogin?: () => Promise<LoginApiResponse>;
  openQQMusicLogin?: () => Promise<LoginApiResponse>;
  openKugouMusicLogin?: () => Promise<LoginApiResponse>;
  clearNeteaseMusicLogin?: () => Promise<unknown>;
  clearQQMusicLogin?: () => Promise<unknown>;
  clearKugouMusicLogin?: () => Promise<unknown>;
  getMusicCacheInfo?: () => Promise<MusicCacheInfo>;
  openMusicCacheDirectory?: () => Promise<unknown>;
  clearMusicCache?: () => Promise<MusicCacheInfo>;
  isDesktop?: boolean;
  platform?: string;
  minimize?: () => unknown;
  toggleMaximize?: () => unknown;
  toggleFullscreen?: () => unknown;
  getState?: () => Promise<DesktopWindowState>;
  onStateChange?: (listener: (state: DesktopWindowState) => void) => void;
  onDesktopLyricsLockState?: (listener: (payload?: { locked?: boolean }) => void) => unknown;
  onDesktopLyricsEnabledState?: (listener: (payload?: { enabled?: boolean }) => void) => unknown;
  updateTouchBarLyrics?: (payload: DesktopOverlayPayload) => Promise<unknown>;
  updateDesktopLyrics?: (payload: DesktopOverlayPayload) => Promise<unknown>;
  setDesktopLyricsEnabled?: (enabled: boolean, payload: DesktopOverlayPayload) => Promise<unknown>;
  updateWallpaperMode?: (payload: DesktopOverlayPayload) => Promise<unknown>;
  setWallpaperMode?: (enabled: boolean, payload: DesktopOverlayPayload) => Promise<unknown>;
  setBackgroundKeepEnabled?: (enabled: boolean) => Promise<unknown>;
  exportJsonFile?: (payload: { defaultName: string; text: string }) => Promise<DesktopJsonFileResult>;
  importJsonFile?: () => Promise<DesktopJsonFileResult>;
  librarySnapshot?: () => Promise<LocalLibrarySnapshot>;
  libraryImportFiles?: (playlistId?: string | null) => Promise<LocalLibraryMutationResult>;
  libraryImportFolder?: () => Promise<LocalLibraryMutationResult>;
  libraryCreatePlaylist?: (name: string) => Promise<LocalLibraryMutationResult>;
  libraryRenamePlaylist?: (playlistId: string, name: string) => Promise<LocalLibraryMutationResult>;
  libraryDeletePlaylist?: (playlistId: string, cleanup: boolean) => Promise<LocalLibraryMutationResult>;
  libraryDeleteTrack?: (trackId: string) => Promise<LocalLibraryMutationResult>;
  librarySetHeart?: (trackId: string, liked: boolean) => Promise<LocalLibraryMutationResult>;
  libraryTogglePlaylistTrack?: (playlistId: string, trackId: string) => Promise<LocalLibraryMutationResult>;
  librarySaveQueue?: (trackIds: string[]) => Promise<LocalLibraryMutationResult>;
  libraryImportLxFile?: () => Promise<LocalLibraryMutationResult>;
  libraryImportRemotePlaylist?: (name: string, sourceUrl: string, source: string, songs: PlaylistSong[]) => Promise<LocalLibraryMutationResult>;
  exitFullscreenWindowed?: () => unknown;
}

interface MusicCacheInfo {
  bytes?: number;
  clearedBytes?: number;
  clearedFiles?: number;
  directory?: string;
  fileCount?: number;
  files?: number;
  ok?: boolean;
}

interface DesktopJsonFileResult {
  ok?: boolean;
  canceled?: boolean;
  text?: string;
  filePath?: string;
}

interface Window {
  gsap?: GsapApi;
  desktopWindow?: MineradioDesktopApi;
  __mineradioDesktopIpc?: DesktopOverlayIpcState;
  __mineradioBeatAnalysis?: () => Record<string, unknown>;
  MusicTempo?: unknown;
}

interface AudioEffectSettings {
  enabled: boolean;
  preset: string;
  preamp: number;
  bands: number[];
  outputDeviceId: string;
}

declare function apiJson<T = unknown>(
  url: string,
  options?: RequestInit & { timeoutMs?: number }
): Promise<T>;
declare function showToast(message: unknown): void;
declare function clampRange(value: number, min: number, max: number): number;
declare function escHtml(value: unknown): string;
declare function openGsapModal(mask: HTMLElement | null): void;
declare function closeGsapModal(mask: HTMLElement | null, afterClose?: () => void): void;
declare function bindBackdropClose(id: string, close: () => void): void;
declare function bindModalBackdropClose(): void;
declare function mineradioEventOptions(options?: boolean | AddEventListenerOptions): boolean | AddEventListenerOptions;
