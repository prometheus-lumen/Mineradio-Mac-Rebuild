type PerformanceBackgroundMode = 'auto' | 'keep' | 'release';
type PerformanceQuality = 'eco' | 'balanced' | 'high' | 'ultra' | 'auto';

interface DesktopWindowState {
  isMinimized?: boolean;
  isVisible?: boolean;
  isFocused?: boolean;
  isFullScreen?: boolean;
  isNativeFullScreen?: boolean;
  isHtmlFullScreen?: boolean;
  isWindowFullScreen?: boolean;
}

interface RuntimePerfState {
  lastCacheTrimAt: number;
  cacheTrimCount: number;
  lastCacheTrimReason: string;
  lastHeapSampleAt: number;
  heapMB: number;
  cacheCounts: Record<string, number>;
}

interface RenderPerfState {
  mode: string;
  fps: number;
  frames: number;
  skipped: number;
  longFrames: number;
  lastRenderAt: number;
  lastSampleAt: number;
}

interface AppPerfMark {
  name: string;
  value: number;
}

interface MineradioDesktopApi {
  onStateChange?: (callback: (state: DesktopWindowState) => void) => void;
  getState?: () => Promise<DesktopWindowState>;
}

interface Window {
  __mineradioPerfSnapshot?: typeof collectRuntimePerfSnapshot;
  __mineradioPerf?: RenderPerfState;
  __mineradioDebugLoading?: boolean;
}

declare let appPerfMarks: AppPerfMark[];
declare var renderPerfState: RenderPerfState;
declare let playing: boolean;
declare let coverDepthCache: Record<string, CoverDepthCacheEntry>;

declare function collectProtectedCoverUrls(): Record<string, boolean>;
declare function collectProtectedBeatMapKeys(): Record<string, boolean>;
declare function collectProtectedCoverDepthIds(): Record<string, boolean>;
declare function trimCoverDepthCache(keep: number, protectedIds: Record<string, boolean>): number;
declare function collectRuntimePerfSnapshot(now?: number): unknown;
declare function wakeAnimationLoop(): void;
declare function syncDesktopOverlayState(): void;
declare function recoverVisualsAfterBackground(reason: string): void;
declare function getParticleClockIdleRenderFps(): number;
declare function normalizePerformanceQuality(value: unknown): PerformanceQuality;
declare function saveLyricLayout(): void;
