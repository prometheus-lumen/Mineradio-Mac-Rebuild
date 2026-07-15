function __mineradioInitUiGesture49(): void {
  gestureVideo = null;
  gestureCamera = null;
  gestureHands = null;
  gestureStream = null;
  gestureFrameRaf = 0;
  gestureFrameBusy = false;
  gestureFrameCount = 0;
  gestureLastFrameErrorAt = 0;
  gestureActive = false;
  gestureStartPromise = null;
  gestureStartToken = 0;
  gestureLastStopAt = 0;
  handLmSmooth = null;
  handLmLastSeen = 0;
  pinchState = { active: false, lastX: 0, lastY: 0, lastT: 0 };
  particleSpin = { vx: 0, vy: 0, damping: 0.90 };
  gestureRotation = { x: 0, y: 0 };
  gestureGrip = { value: 0, target: 0, openness: 1, lastState: 'open', pulse: 0 };
  PARTICLE_POINTER_SPIN_X = 0.0032;
  PARTICLE_POINTER_SPIN_Y = 0.0034;
  PARTICLE_HAND_SPIN_X = 4.15;
  PARTICLE_HAND_SPIN_Y = 4.30;
  PARTICLE_SPIN_MAX = 6.2;
  handCanvas = null;
  handCanvasCtx = null;
  HAND_SMOOTH_ALPHA = 0.35;
  HAND_BONES = createHandBoneConnections();
  window.addEventListener('resize', resizeHandCanvas);
  window.addEventListener('pagehide', releaseCurrentLocalAudioUrl, { once: true });
}

function createHandBoneConnections(): Array<[number, number]> {
  return [
    [0, 1], [1, 2], [2, 3], [3, 4],
    [0, 5], [5, 6], [6, 7], [7, 8],
    [0, 9], [9, 10], [10, 11], [11, 12],
    [0, 13], [13, 14], [14, 15], [15, 16],
    [0, 17], [17, 18], [18, 19], [19, 20],
    [5, 9], [9, 13], [13, 17]
  ];
}
