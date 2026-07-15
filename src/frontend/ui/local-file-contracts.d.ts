interface CoverLoadOptions {
  trackToken?: number;
  deferHeavy?: boolean;
  delay?: number;
  timeout?: number;
  coverSource?: string;
  coverSourceKind?: 'url' | 'data';
  coverKey?: string;
  preserveTrackCoverUi?: boolean;
  colorMixDuration?: number;
  fromResolutionChange?: boolean;
  backgroundMediaRefresh?: string | boolean;
}

declare let firstPlayDone: boolean;
declare function finalizeListenSession(ended: boolean): void;
declare function cancelLocalBeatAnalysis(): void;
declare function cancelDjBeatAnalysisTimer(): void;
declare function resetDjBeatMapState(): void;
declare function resetBeatCameraSync(time: number): void;
declare function updateControlTrackInfo(song: PlaylistSong): void;
declare function suppressShelfPreviewForPlaybackSwitch(): void;
declare function tweenParticleAlpha(from: number, to: number, durationMs: number): void;
declare function bindPlaybackProgressEvents(element: HTMLAudioElement): void;
declare function applyVolumeToAudio(): void;
declare function updatePlaybackProgressUi(): void;
declare function withLyricFallback(lines: LyricLine[]): LyricLine[];
declare function playAudio(): Promise<boolean>;
declare function beginListenSession(song: PlaylistSong, context: unknown): void;
declare function prepareLocalBeatAnalysis(song: PlaylistSong, audioUrl: string): void;
declare function getCustomCoverForSong(song?: PlaylistSong | null): string;
declare function applyCoverDataUrl(dataUrl: string, options?: CoverLoadOptions): void;
declare function loadCoverFromUrl(url: string, options?: CoverLoadOptions): void;
declare function loadCoverFromFile(file: File, options?: CoverLoadOptions | null): void;
declare function loadVisualCoverForSong(song?: PlaylistSong | null, options?: CoverLoadOptions): void;
declare function setPlayIcon(playing: boolean): void;
