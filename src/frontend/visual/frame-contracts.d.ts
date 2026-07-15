interface OrbitFocusState {
  active: boolean;
  type: string | null;
  theta: number;
  phi: number;
  radius: number;
  lookAt: THREE.Vector3;
}

interface OrbitState {
  centerLocked: boolean;
  rotating: boolean;
  recentering: boolean;
  last: Point2D;
  userRadius: number;
  minRadius: number;
  maxRadius: number;
  userPhi: number;
  userTheta: number;
  baselineRadius: number;
  baselinePhi: number;
  baselineTheta: number;
  focus: OrbitFocusState;
  lookAt: THREE.Vector3;
  theta: number;
  phi: number;
  radius: number;
  minPhi: number;
  maxPhi: number;
  cineTheta: number;
  cinePhi: number;
  cineRadius: number;
  glowFollowX: number;
  glowFollowY: number;
  glowFollowRoll: number;
  beatGlow: number;
}

interface FocusHoverState {
  wantType: string | null;
  pendingTimer: ReturnType<typeof setTimeout> | null;
  exitTimer: ReturnType<typeof setTimeout> | null;
}

declare let prevTime: number;
declare let splashWarmRenderLast: number;
declare let animationLoopTimer: number;
declare let animationFramePending: boolean;
declare let lyricSunEnergy: number;
declare let lyricSunTarget: number;
declare let lyricSunHold: number;
declare let lyricSunAvg: number;
declare let lyricSunPeak: number;
declare let mouseWorld: THREE.Vector3;
declare let mouseActive: boolean;
declare let particles: THREE.Points;
declare let bloomParticles: THREE.Points | null;
declare let backCoverGroup: THREE.Points | null;
declare let particleClockTex: ParticleClockTexture;
declare let orbit: OrbitState;
declare let gestureRotation: Point2D;
declare let focusHover: FocusHoverState;
declare let cinemaT: number;
declare let lastCamPunchAt: number;
declare let freeCameraDeferredSaveTimer: ReturnType<typeof setTimeout> | 0;

declare function animate(): void;
declare function updateParticleClockTexture(texture: ParticleClockTexture, force: boolean): void;
declare function isMainSceneCoveredBySplash(): boolean;
declare function updateParticlePointerFrame(): void;
declare function shouldDimWallpaperForShelf(): boolean;
declare function tickPresetTransition(): void;
declare function tickLyricsParticles(): void;
declare function updateStrobeFlash(now: number): void;
declare function updateCinema(dt: number): void;
declare function updateFreeCamera(dt: number): void;
declare function updateCamera(): void;
declare function applySkullCameraPose(dt: number): void;
declare function tickGestureRotation(dt: number): void;
declare function updateLaserBeamLayer(dt: number): void;
declare function updateHexagramLayer(dt: number): void;
declare function updateSkullParticleLayer(dt: number): void;
declare function updateStageLyrics3D(dt: number): void;
declare function tickDesktopOverlayState(now: number): void;
