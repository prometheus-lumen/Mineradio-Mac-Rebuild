declare let lyricCameraRight: THREE.Vector3;
declare let lyricCameraUp: THREE.Vector3;
declare let lyricCameraDir: THREE.Vector3;

declare function clonePackagedDefaultFxSnapshot(): Partial<FxSettings>;
declare function shelfDefaultAngleForCameraMode(mode: string): number;
declare function normalizeCustomBackgroundImage(value: unknown): string;
declare function normalizeLyricFlowMode(value: unknown): string;
declare function normalizeDesktopLyricsFps(value: unknown): number;
declare function normalizePerformanceBackgroundMode(
  value: unknown,
  legacyKeep?: boolean
): PerformanceBackgroundMode;
declare function pushDesktopLyricsState(force: boolean): void;
declare function refreshCurrentLyricStyle(): void;
declare function applyShelfCameraDefaultAngle(force: boolean): void;
declare function setRange(id: string, value: number): void;
declare function updateShelfControlUi(): void;
