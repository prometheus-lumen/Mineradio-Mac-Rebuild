interface LyricApiResponse {
  yrc?: string;
  lyric?: string;
}

interface OriginalLyricsState {
  lines: LyricLine[];
  hasNativeKaraoke: boolean;
  timingSource: string;
}

interface StageLyricsState {
  autoFlowLinesRemaining: number;
  autoFlowMode: string;
  autoFlowQueue: string[];
  beatGlow: number;
  glowFollowRoll: number;
  glowFollowX: number;
  glowFollowY: number;
  group: THREE.Group | null;
  highBloom: number;
  lockFitScale: number;
  networkLines: THREE.LineSegments<THREE.BufferGeometry, THREE.LineBasicMaterial> | null;
  snapCameraLockFrames: number;
  starRiver: THREE.Points<THREE.BufferGeometry, THREE.ShaderMaterial> | null;
  starRiverHeight: number;
  starRiverWidth: number;
  currentIdx: number;
  currentText: string;
  current: THREE.Object3D | null;
  outgoing: THREE.Object3D[];
  palette: LyricPalette;
  coverPalette: LyricPalette;
  warpEntryIndex: number;
  warpExitIndex: number;
  warpEntryOffset: { x: number; y: number };
  warpExitOffset: { x: number; y: number };
}

interface LyricPalette {
  primary: string;
  secondary: string;
  highlight: string;
  shadow: string;
  glow: string;
  glowColor?: string;
}

interface LyricColorPreset {
  name: string;
  color: string;
}

interface CoverColorPickerState {
  target: string;
  canvas: HTMLCanvasElement | null;
}

declare let lyricSunColor: THREE.Color;
declare let lyricSunHotColor: THREE.Color;
declare let lyricCameraTarget: THREE.Vector3;
declare let lyricLayoutBase: THREE.Vector3;
declare let lyricLayoutTarget: THREE.Vector3;
declare let lyricCoverWorldPos: THREE.Vector3;
declare let lyricCoverWorldQuat: THREE.Quaternion;
declare let lyricBaseEuler: THREE.Euler;
declare let lyricTiltEuler: THREE.Euler;
declare let lyricBaseQuat: THREE.Quaternion;
declare let lyricTiltQuat: THREE.Quaternion;
declare let lyricTargetQuat: THREE.Quaternion;
declare let lyricsParticles: THREE.Points | null;
declare let lyricsGeo: THREE.BufferGeometry | null;
declare let lyricsAttrTargetA: THREE.BufferAttribute | null;
declare let lyricsAttrTargetB: THREE.BufferAttribute | null;
declare let lyricsAttrSeed: THREE.BufferAttribute | null;
declare let lyricColorPresets: LyricColorPreset[];
declare let coverPickerCanvas: HTMLCanvasElement | null;
declare let coverColorPickerState: CoverColorPickerState;

declare function setLyricSparkColor(data: Record<string, unknown>, color: THREE.Color): void;
declare function updateLyricHighlightControls(): void;
declare function updateLyricGlowControls(): void;
declare function closeCoverColorPicker(): void;
declare function setLyricHighlightCustom(color: string, silent?: boolean): void;
declare function setLyricGlowCustom(color: string, silent?: boolean): void;

declare let stageLyrics: StageLyricsState;
declare let lyricViewportCorner: THREE.Vector3;
declare let lyricViewportCenter: THREE.Vector3;
declare let lyricViewportBasisX: THREE.Vector3;
declare let lyricViewportBasisY: THREE.Vector3;
declare let lyricViewportOffsetX: THREE.Vector3;
declare let lyricViewportOffsetY: THREE.Vector3;
declare let lyricsHasNativeKaraoke: boolean;
declare let lyricsTimingSource: string;
declare let lyricsLines: LyricLine[];
declare let originalLyricsState: OriginalLyricsState;
declare let currentLocalSong: PlaylistSong | null;
declare let trackSwitchToken: number;
declare let lyricsVisible: boolean;

declare function showStageLine(text: string, redrawOnly?: boolean, displayDuration?: number): void;
declare function updateLyricMeshProgress(mesh: THREE.Object3D, progress: number): void;
declare function applyPreferredLyricsForCurrent(force: boolean): void;
declare function updateCustomLyricControls(): void;
declare function clearStageLyrics(): void;
declare function createLyricsParticles(): void;
declare function isNoLyricText(text: string): boolean;
type LyricSourceMode = 'original' | 'custom';

interface LyricSparkData {
  sparkMat?: {
    color?: THREE.Color;
    opacity?: number;
    size?: number;
    uniforms?: {
      uColor?: { value: THREE.Color };
      uOpacity?: { value: number };
      uSize?: { value: number };
    };
  };
}

interface StageLyricShaderMaterial {
  uniforms: {
    uOpacity: { value: number };
    uSolar?: { value: number };
  };
}

interface StageLyricFadeMaterial {
  color: THREE.Color;
  opacity: number;
}

interface StageLyricData extends LyricSparkData {
  basePositions?: Float32Array;
  glow?: THREE.Object3D;
  glowMat?: StageLyricFadeMaterial;
  readabilityMat?: { opacity: number };
  sparks?: THREE.Points<THREE.BufferGeometry, THREE.Material>;
  sun?: THREE.Object3D;
  sunMat?: StageLyricFadeMaterial;
  textMat?: StageLyricShaderMaterial;
}

interface CustomLyricEntry {
  text: string;
  updatedAt: number;
}

type CustomLyricMap = Record<string, CustomLyricEntry>;
type CustomLyricPreferences = Record<string, LyricSourceMode>;

declare let customLyricMap: CustomLyricMap;
declare let customLyricPrefs: CustomLyricPreferences;
declare let lyricSourceMode: LyricSourceMode;
declare let immersiveMode: boolean;

declare function songCustomCoverKey(song: PlaylistSong | null): string;
declare function finalizeLyricLineDurations(lines: LyricLine[]): LyricLine[];
declare function setImmersiveMode(enabled: boolean): void;
