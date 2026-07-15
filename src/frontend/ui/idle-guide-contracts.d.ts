interface IdleGuideInteraction {
  angle: number;
  velocity: number;
  rotX: number;
  rotY: number;
  spinX: number;
  spinY: number;
  zoom: number;
  zoomTarget: number;
  zoomPulse: number;
  dragging: boolean;
  lastX: number;
  lastY: number;
  lastT: number;
  pointerX: number;
  pointerY: number;
  pointerActive: boolean;
  focus: number;
  press: number;
  tiltX: number;
  tiltY: number;
}

interface IdleGuideParticle {
  a: number;
  r: number;
  cx: number;
  cy: number;
  size: number;
  speed: number;
  phase: number;
  wobbleAmp: number;
  wobbleSpeed: number;
  oval: number;
  zAmp: number;
  driftX: number;
  driftY: number;
  layer: number;
  z: number;
  ring: boolean;
}

interface IdleGuideRotation {
  sx: number;
  cx: number;
  sy: number;
  cy: number;
}

interface IdleGuidePoint extends Point2D {
  z: number;
  scale: number;
}

interface IdleGuideTrailPoint extends Point2D {
  scale: number;
  alpha: number;
  t: number;
}

interface IdleGuideRingPoint extends IdleGuidePoint {
  alpha: number;
}

interface IdleGuideFieldFrame {
  ringPoints: IdleGuideRingPoint[];
  rotation: IdleGuideRotation;
  depth: number;
  spinEnergy: number;
}

declare let idleGuideCanvas: HTMLCanvasElement | null;
declare let idleGuideCtx: CanvasRenderingContext2D | null;
declare let idleGuideW: number;
declare let idleGuideH: number;
declare let idleGuideDpr: number;
declare let idleGuideParticles: IdleGuideParticle[];
declare let idleGuideTrails: IdleGuideTrailPoint[][];
declare let idleGuideStartedAt: number;
declare let idleGuideVisible: boolean;
declare let idleGuideLastFrameAt: number;
declare let idleGuideDelayTimer: ReturnType<typeof setTimeout> | null;
declare let idleGuideInteraction: IdleGuideInteraction;

declare function shouldHandleIdleGuidePointer(event: MouseEvent | WheelEvent): boolean;
declare function resetIdleGuideTrails(): void;
declare function drawIdleGuideFrame(): void;
declare function tickShelfHoverCue(deltaTime: number): number;
declare function shouldShowShelfHoverCue(strength: number): boolean;
