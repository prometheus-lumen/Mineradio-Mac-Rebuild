interface RealtimeBeatState {
  subFast: number;
  subSlow: number;
  lowFast: number;
  lowSlow: number;
  bodyFast: number;
  bodySlow: number;
  vocalFast: number;
  vocalSlow: number;
  snapFast: number;
  snapSlow: number;
  prevSub: number;
  prevLow: number;
  prevBody: number;
  prevVocal: number;
  prevSnap: number;
  prevRms: number;
  onsetAvg: number;
  onsetPeak: number;
  subPeak: number;
  lowPeak: number;
  bodyPeak: number;
  vocalPeak: number;
  snapPeak: number;
  lastHitAt: number;
  tempoGap: number;
  tempoConfidence: number;
  beatCount: number;
  primedFrames: number;
  warmupUntil: number;
  pulse: number;
  score: number;
  stats: Record<string, number>;
}

interface BeatDiskCacheStatus {
  checked: boolean;
  enabled: boolean;
  mode: string;
  reason: string;
}

interface BeatPrefetchState {
  keys: Record<string, boolean>;
  count: number;
}

type LocalBeatMode = 'mr' | 'dj';
type PackedBeatEvent = number[];

interface PackedLocalBeatMap {
  v: number;
  duration: number;
  gridStep: number;
  sectionSteps: number[];
  tempoSource: string;
  visualBeatCount: number;
  analyzedAt: number;
  partial: boolean;
  partialUntilSec: number;
  cameraBeats: PackedBeatEvent[];
  pulseBeats: PackedBeatEvent[];
}

interface LocalBeatCacheEntry {
  updatedAt: number;
  mr?: BeatMap;
  dj?: BeatMap;
}

declare let localBeatMapCache: Record<string, LocalBeatCacheEntry>;
declare let localBeatMapPrefs: Record<string, LocalBeatMode>;

interface BeatCacheApiResponse {
  enabled?: boolean;
  mode?: string;
  reason?: string;
  hit?: boolean;
  ok?: boolean;
  map?: unknown;
}

declare let playbackQuality: PlaybackQuality;
declare let qqPlaybackQualityCeiling: PlaybackQuality | '';
declare function normalizePlaybackQuality(value: unknown): PlaybackQuality;
declare function packLocalBeatMap(map: BeatMap): PackedLocalBeatMap | null;
declare function unpackLocalBeatMap(stored: unknown): BeatMap | null;
declare function setLocalBeatStatus(text: string, tone: string): void;
declare function djSongKey(song: PlaylistSong): string;
declare function maybeAnnounceDjMode(): void;
declare function cancelDjBeatAnalysisTimer(): void;
declare function resetDjBeatMapState(): void;
declare function analyzePodcastDjBeats(audioUrl: string, token: number, duration: number): Promise<BeatMap | null>;
declare function schedulePodcastDjAnalysis(songKey: string, audioUrl: string, token: number, duration: number): void;
declare function scheduleBeatAnalysis(
  songId: string | number,
  audioUrl: string,
  token: number,
  song: PlaylistSong
): void;
declare function analyzeAudioBeats(
  audioUrl: string,
  duration: number | null,
  token: number,
  options: BeatAnalysisOptions
): Promise<BeatMap | null>;

interface BeatAnalysisOptions {
  background?: boolean;
  prefetch?: boolean;
  skipMusicTempo?: boolean;
  song?: PlaylistSong | null;
}

interface BeatAnalysisJob {
  controller: AbortController | null;
  token: number;
  worker: Worker | null;
}

interface MusicTempoResult { ok?: boolean; tempo?: number; beats?: number[]; error?: string; }

declare let beatAnalysisActiveJob: BeatAnalysisJob | null;
declare let beatAnalysisQueueTail: Promise<unknown>;
declare let musicTempoLoadPromise: Promise<unknown> | null;
declare let musicTempoWorkerUrl: string | null;

interface BeatAnalysisConfig {
  delayMs: number;
  minPlaybackSec: number;
  idleTimeout: number;
  skipMusicTempoWhilePlaying: boolean;
}

interface CinemaDynamics {
  avg: number;
  lowAvg: number;
  peak: number;
  scale: number;
}

interface CinemaTrackProfile {
  scale: number;
  target: number;
  nameHint: number;
  frames: number;
  energyAvg: number;
  lowAvg: number;
  vocalAvg: number;
  melodyAvg: number;
  punchPeak: number;
  density: number;
}

interface DjModeState {
  active: boolean;
  songKey: string;
  startedAt: number;
  lastNoticeAt: number;
  tempoGap: number;
  tempoConfidence: number;
  sectionEnergy: number;
  sectionLow: number;
  sectionChange: number;
  visualPulse: number;
  lastBeatAt: number;
}

interface HomeWaveTrackState {
  bars: number;
  lastAt: number;
  smooth: number[];
}

declare let audio: HTMLAudioElement | null;
declare var djMode: DjModeState;
declare var currentDjBeatMap: BeatMap | null;
declare var currentBeatMap: BeatMap | null;
declare var djBeatMapNextIdx: number;
declare var djBeatPulseNextIdx: number;
declare var beatMapNextIdx: number;
declare var beatCam: BeatCameraState;
declare var rtBeat: RealtimeBeatState;
declare var cinemaTrackProfile: CinemaTrackProfile;
declare let scheduledBeatPulse: number;
declare let scheduledBeatFlag: boolean;
declare let emptyHomeActive: boolean;
declare let beatPulse: number;
declare let bass: number;
declare let smoothBass: number;
declare let smoothMid: number;
declare let audioEnergy: number;
declare let smoothEnergy: number;
declare let homeWaveTrackState: HomeWaveTrackState;
declare function beatEventTime(beat: BeatEventLike): number;
declare function yieldToPaint(): Promise<void>;
declare function yieldToIdle(timeout?: number): Promise<void>;
declare function scheduleAnalysisTask(task: () => void, timeout?: number): void;
declare function scheduleBeatCamera(beat: BeatEventLike | CameraBeatEvent, source: string): void;
declare function cameraDynamicsScale(value: number): number;
declare function updateHomeNowCover(force?: boolean): void;
declare function ensureHomeWaveTrackBars(): void;
declare function cancelBeatAnalysisTimer(): void;
declare function hideBeatChip(): void;
declare function showBeatChip(text: string): void;
declare function applyPodcastDjProfileFromMap(map: BeatMap): void;
declare function syncPodcastDjMapCursor(time: number, force?: boolean): void;
declare function notifyDesktopLyricsBeatMapReady(): void;
declare function scheduleVisualApply(task: () => void | Promise<void>, delayMs: number, timeoutMs: number): void;
declare function applyCinemaProfileFromBeatMap(map: BeatMap): void;
declare function writeBeatDiskCache(key: string, map: BeatMap, song: PlaylistSong, mode: string): Promise<boolean>;
declare function scheduleQueueBeatPrefetch(index: number, delayMs: number): void;
declare function syncBeatCameraToTime(time: number): void;
interface Window {
  webkitAudioContext?: typeof AudioContext;
}

interface HTMLAudioElement {
  _mineradioProgressBound?: boolean;
}

declare let sourceFallbackNoticeTimer: ReturnType<typeof setTimeout> | null;
declare function updatePlayModeButton(animate: boolean): void;
declare function syncPlaybackStateFromAudioEvent(reason: string): void;
declare function deactivateHomeWallpaperPreview(force: boolean): void;
declare function syncFxUniforms(): void;
declare let homeVisualPresetActive: boolean;
declare function artistNameParts(song: PlaylistSong): string[];
declare function searchAlternatePlatformSong(song: PlaylistSong): Promise<PlaylistSong | null>;
declare function skipFailedQueueItem(index: number, token: number, message: string): void;
declare let playToggleBusy: boolean;
declare function clearAudioFadeTimers(): void;
declare function updateListenStatsTick(force: boolean): void;
declare function fadeOutAndPauseAudio(): Promise<boolean>;

interface PlaybackAttemptOptions {
  manual?: boolean;
  silent?: boolean;
  fade?: boolean;
  transientRetry?: boolean;
}

declare let audioCtx: AudioContext | null;
declare let source: MediaElementAudioSourceNode | null;
declare let analyser: AnalyserNode | null;
declare let beatAnalyser: AnalyserNode | null;
declare let gainNode: GainNode | null;
declare let audioReady: boolean;
declare let uiSfxCtx: AudioContext | null;
declare let audioFadeTimer: ReturnType<typeof setTimeout> | null;
declare let audioElementFadeFrame: number;
declare let audioFadeSerial: number;
declare let targetVolume: number;
declare let lastNonZeroVolume: number;
declare let volumeCloseTimer: ReturnType<typeof setTimeout> | null;

declare function resetRealtimeBeatEngine(): void;
declare function audioSilentFloor(): number;
