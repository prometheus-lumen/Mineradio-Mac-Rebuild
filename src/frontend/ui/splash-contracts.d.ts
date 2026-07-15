interface SplashDustParticle {
  x: number; y: number; vx: number; vy: number; r: number; a: number; p: number;
}

interface SplashStreak {
  x: number; y: number; len: number; width: number; speed: number; angle: number;
  phase: number; color: string; delay: number; alpha: number;
}

interface SplashShard {
  ox: number; oy: number; w: number; h: number; skew: number;
  phase: number; color: string; alpha: number;
}

interface SplashGlUniforms {
  position: number;
  resolution: WebGLUniformLocation | null;
  time: WebGLUniformLocation | null;
}

declare let splashAnimating: boolean;
declare let splashCanvas: HTMLCanvasElement | null;
declare let splashCtx: CanvasRenderingContext2D | null;
declare let splashGl: WebGLRenderingContext | null;
declare let splashGlProgram: WebGLProgram | null;
declare let splashGlBuffer: WebGLBuffer | null;
declare let splashGlUniforms: SplashGlUniforms | null;
declare let splashW: number;
declare let splashH: number;
declare let splashDust: SplashDustParticle[];
declare let splashStreaks: SplashStreak[];
declare let splashShards: SplashShard[];
declare let splashPixelRatio: number;
declare let splashStartedAt: number;
declare let splashSoundPlayed: boolean;
declare let splashAudioCtx: AudioContext | null;
declare let splashSoundFallbackArmed: boolean;
declare let splashTimer: ReturnType<typeof setTimeout> | null;
declare let splashReadyToEnter: boolean;

declare function shouldShowEmptyHomeCore(force?: boolean): boolean;
declare function shouldUseIdleWallpaperPreview(force?: boolean): boolean;
declare function activateHomeWallpaperPreview(options?: { instant?: boolean; skipTransition?: boolean }): void;
declare function revealIdleParticles(delayMs: number, durationMs: number): void;
declare function prewarmHomeWallpaperPreview(): void;
declare function prewarmHomeWeatherRadio(): void;
declare function initMineradioSplashWebgl(canvas: HTMLCanvasElement): boolean;
declare function drawMineradioSplash(): void;
declare function drawMineradioSplashWebgl(elapsed: number): void;
