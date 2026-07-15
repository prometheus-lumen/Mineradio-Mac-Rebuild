interface HandLandmark {
  x: number;
  y: number;
  z: number;
}

interface GestureHandsResult {
  multiHandLandmarks?: HandLandmark[][];
}

interface GestureHandsInstance {
  setOptions(options: Record<string, number>): void;
  onResults(callback: (result: GestureHandsResult) => void): void;
  send(input: { image: HTMLVideoElement }): Promise<void>;
  close(): void;
}

interface GestureHandsConstructor {
  new (options: { locateFile: (file: string) => string }): GestureHandsInstance;
}

interface GestureCameraController {
  stop(): void;
}

interface CameraAccessResult {
  ok: boolean;
  status: string;
  error?: string;
}

interface PinchState {
  active: boolean;
  lastX: number;
  lastY: number;
  lastT: number;
}

interface GestureRotation extends Point2D {}

interface GestureGripState {
  value: number;
  target: number;
  openness: number;
  lastState: 'open' | 'hover' | 'fist';
  pulse: number;
}

interface MineradioDesktopApi {
  requestCameraAccess?: () => Promise<CameraAccessResult>;
}

declare let Hands: GestureHandsConstructor | undefined;
declare let gestureVideo: HTMLVideoElement | null;
declare let gestureHands: GestureHandsInstance | null;
declare let gestureCamera: GestureCameraController | null;
declare let gestureStream: MediaStream | null;
declare let gestureFrameRaf: number;
declare let gestureFrameBusy: boolean;
declare let gestureFrameCount: number;
declare let gestureLastFrameErrorAt: number;
declare let gestureActive: boolean;
declare let gestureStartPromise: Promise<boolean> | null;
declare let gestureStartToken: number;
declare let gestureLastStopAt: number;
declare let handLmSmooth: HandLandmark[] | null;
declare let handLmLastSeen: number;
declare let pinchState: PinchState;
declare let gestureGrip: GestureGripState;
declare let handCanvas: HTMLCanvasElement | null;
declare let handCanvasCtx: CanvasRenderingContext2D | null;

declare function loadScriptOnce(url: string): Promise<void>;
declare function particleLocalPointFromNdc(x: number, y: number, target: THREE.Vector3): boolean;
declare function clampParticleSpinVelocity(value: number): number;
declare function rebaseParticleRotationIfNeeded(): void;
declare function showGestureHUD(label: string, progress: number, detail: string): void;
declare function processHandFrame(landmarks: HandLandmark[]): void;
declare function onHandLost(): void;
declare function resizeHandCanvas(): void;
declare function drawHandSkeleton(landmarks: HandLandmark[], isPinch: boolean, openness: number, isFist: boolean): void;
