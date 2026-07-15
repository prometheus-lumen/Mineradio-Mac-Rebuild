interface DesktopRuntimeState {
  desktop: boolean;
  minimized: boolean;
  visible: boolean;
  focused: boolean;
  fullscreen: boolean;
}

declare let scene: THREE.Scene;
declare let camera: THREE.PerspectiveCamera;
declare let renderer: THREE.WebGLRenderer;
declare let renderInteractionBoostUntil: number;
declare let renderInteractionReason: string;

declare function applyRendererPowerMode(): void;
declare function requestStageLyricCameraSnap(priority: number): void;
declare function getRenderPixelRatio(): number;
interface ShaderUniforms {
  uTime: { value: number };
  uPixel: { value: number };
  uFloatAlpha: { value: number };
  uRippleCount: { value: number };
  uVinylSpin: { value: number };
  uBass: { value: number };
  uMid: { value: number };
  uTreble: { value: number };
  uBeat: { value: number };
  uEnergy: { value: number };
  uMouseXY: { value: THREE.Vector2 };
  uMouseActive: { value: number };
  uParticleDim: { value: number };
  uBurstAmt: { value: number };
  uPreset: { value: number };
  uIntensity: { value: number };
  uDepth: { value: number };
  uPointScale: { value: number };
  uSpeed: { value: number };
  uTwist: { value: number };
  uColorBoost: { value: number };
  uScatter: { value: number };
  uCoverRes: { value: number };
  uBgFade: { value: number };
  uBloomStrength: { value: number };
  uEdgeEnabled: { value: number };
  uTintColor: { value: THREE.Color };
  uTintStrength: { value: number };
  uLoading: { value: number };
  uHasDepth: { value: number };
  uHasCover: { value: number };
  uAlpha: { value: number };
  uHandActive: { value: number };
  uHandXY: { value: THREE.Vector2 };
  uGestureGrip: { value: number };
  uAiBoost: { value: number };
  [key: string]: THREE.IUniform;
}

interface RenderPowerState {
  mode: string;
  width: number;
  height: number;
  pixelRatio: number;
}

interface RenderQualityProfile {
  budget: number;
  cap: number;
  min: number;
}

interface FxSettings {
  preset: number;
  intensity: number;
  speed: number;
  bloom: boolean;
  bloomStrength: number;
  shelf: string;
  backCover: boolean;
  scatter: number;
  point: number;
  depth: number;
  twist: number;
  color: number;
  coverResolution: number;
  bgFade: number;
  edge: boolean;
  visualTintColor: string;
  visualTintMode: 'auto' | 'custom';
  strobeCustomBackground: boolean;
  strobeCustomBackgroundOpacity: number;
  cinemaShake: number;
  lyricGlowStrength: number;
  lyricScale: number;
  lyricOffsetX: number;
  lyricOffsetY: number;
  lyricOffsetZ: number;
  lyricTiltX: number;
  lyricTiltY: number;
  lyricCameraLock: boolean;
  lyricColorMode: 'auto' | 'custom';
  lyricColor: string;
  lyricHighlightMode: 'auto' | 'custom';
  lyricHighlightColor: string;
  lyricGlowLinked: boolean;
  lyricGlowColor: string;
  lyricFont: string;
  lyricLetterSpacing: number;
  lyricLineHeight: number;
  lyricWeight: number;
  lyricFlowMode: string;
  lyricGlow: boolean;
  lyricGlowBeat: boolean;
  lyricGlowParticles: boolean;
  cinema: boolean;
  uiAccentColor: string;
  homeAccentColor: string;
  backgroundColorMode: 'cover' | 'custom';
  backgroundColor: string;
  backgroundOpacity: number;
  backgroundColorCustom: boolean;
  desktopLyricsSize: number;
  desktopLyricsOpacity: number;
  desktopLyricsY: number;
  desktopLyricsClickThrough: boolean;
  desktopLyricsCinema: boolean;
  desktopLyricsHighlight: boolean;
  desktopLyricsFps: number;
  wallpaperOpacity: number;
  shelfCameraMode: string;
  shelfPresence: string;
  shelfShowPodcasts: boolean;
  shelfMergeCollections: boolean;
  shelfSize: number;
  shelfOffsetX: number;
  shelfOffsetY: number;
  shelfOffsetZ: number;
  shelfAngleY: number;
  shelfAngleYManual: boolean;
  shelfOpacity: number;
  shelfBgOpacity: number;
  shelfAccentColor: string;
  aiDepth: boolean;
  controlGlassChromaticOffset: number;
  particleLyrics: boolean;
  wallpaperMode: boolean;
  homeIconColor: string;
  visualIconColor: string;
  performanceBackground: PerformanceBackgroundMode;
  liveBackgroundKeep: boolean;
  performanceQuality: PerformanceQuality;
  desktopLyrics: boolean;
  floatLayer: boolean;
  cam: string;
  backgroundMedia: BackgroundMedia | null;
  backgroundImage: string;
  [key: string]: unknown;
}

declare let uniforms: ShaderUniforms;
declare let controlGlassState: Record<string, string | undefined>;

declare function isDeepBackgroundMode(): boolean;
declare function renderQualityProfile(): RenderQualityProfile;
declare function scheduleBackgroundCacheTrim(): void;
declare function normalizeControlGlassChromaticOffset(value: number): number;
declare function updateSearchBoxGlassDisplacementMap(): void;
declare function updateSearchPillGlassDisplacementMap(): void;
