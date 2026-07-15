interface PointerFrameState {
  dirty: boolean;
  ndcX: number;
  ndcY: number;
}

interface PointerSpinState {
  active: boolean;
  lastX: number;
  lastY: number;
  lastT: number;
}

interface MouseDownState extends Point2D {
  t: number;
  hadDrag: boolean;
}

interface ParticleSpinState {
  vx: number;
  vy: number;
  damping: number;
}

interface ProgressDragState {
  active: boolean;
  lastParticleAt: number;
}

interface FreeCameraState {
  active: boolean;
  locked: boolean;
  yaw: number;
  pitch: number;
  fov: number;
  keys: Record<string, boolean>;
  position: THREE.Vector3;
  roll: number;
  velocity: THREE.Vector3;
  resetTween: FreeCameraResetTween | null;
}

interface FreeCameraPose {
  position: THREE.Vector3;
  yaw: number;
  pitch: number;
  roll: number;
  fov: number;
}

interface FreeCameraResetTween {
  start: number;
  duration: number;
  from: FreeCameraPose;
  to: FreeCameraPose;
}

interface FreeCameraPointerState extends Point2D {
  seen: boolean;
}

interface SmoothScroller extends HTMLElement {
  __smoothWheelBound?: boolean;
  __syncSmoothWheelTarget?: (top: number) => void;
}

declare let particlePointerNdc: THREE.Vector2;
declare let particlePointerRay: THREE.Raycaster;
declare let particlePointerPlane: THREE.Plane;
declare let particlePointerPlanePoint: THREE.Vector3;
declare let particlePointerPlaneNormal: THREE.Vector3;
declare let particlePointerWorldHit: THREE.Vector3;
declare let particlePointerLocalHit: THREE.Vector3;
declare let particlePointerQuat: THREE.Quaternion;
declare let particlePointerFrame: PointerFrameState;
declare let particlePointerSpin: PointerSpinState;
declare let mouseDownAt: MouseDownState;
declare let particleSpin: ParticleSpinState;
declare let progressDragState: ProgressDragState;
declare let progressBar: HTMLElement;
declare let freeCamera: FreeCameraState | null;
declare let freeCameraPointer: FreeCameraPointerState;
declare let skullWheelZoomTarget: number;
declare let skullParticleGroup: THREE.Points<THREE.BufferGeometry, THREE.ShaderMaterial> | null;
declare let dotTexture: THREE.Texture;
declare let laserDotTexture: THREE.Texture;

declare function idleGuidePointerDown(event: MouseEvent): void;
declare function idleGuidePointerMove(event: MouseEvent): void;
declare function idleGuidePointerUp(): void;
declare function idleGuidePointerLeave(): void;
declare function idleGuideWheel(event: WheelEvent): boolean;
declare function updateControlsAutoHideFromPointer(x: number, y: number): void;
declare function getPlaybackDurationSeconds(): number;
declare function setProgressVisual(percent: number): void;
declare function syncBeatMapPlaybackCursor(time: number, force?: boolean): void;
declare function unlockCenteredView(): void;
declare function saveFreeCameraState(): void;
declare function resetFreeCameraToDefault(): void;
declare function resetSkullPresetView(force: boolean, options: { smooth: boolean; keepLyricLock: boolean }): void;
declare function recenterCamera(): void;
declare function toggleFreeCamera(): void;
declare function consumeFreeCameraKeyEvent(event: KeyboardEvent, isDown: boolean): void;
declare function getStageLyricLockBounds(): { w: number; h: number };
declare function makeDotTexture(): THREE.Texture;
declare function makeLaserDotTexture(): THREE.Texture;
declare function makeParticleClockTexture(): ParticleClockTexture;
