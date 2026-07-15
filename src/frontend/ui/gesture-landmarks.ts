function resizeHandCanvas(): void {
  if (!handCanvas || !handCanvasCtx) return;
  var dpr = Math.min(devicePixelRatio || 1, 2);
  handCanvas.width = innerWidth * dpr;
  handCanvas.height = innerHeight * dpr;
  handCanvas.style.width = innerWidth + 'px';
  handCanvas.style.height = innerHeight + 'px';
  handCanvasCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

function onHandLost(): void {
  pinchState.active = false;
  gestureGrip.target = 0;
  uniforms.uHandActive.value *= 0.9;
  if (uniforms.uHandActive.value < 0.02) uniforms.uHandActive.value = 0;
  if (performance.now() - handLmLastSeen <= 600) return;
  handLmSmooth = null;
  handCanvasCtx?.clearRect(0, 0, innerWidth, innerHeight);
  showGestureHUD('待命', 0, '把手放进视野');
}

function smoothLandmarks(landmarks: HandLandmark[]): HandLandmark[] {
  if (!handLmSmooth) {
    handLmSmooth = landmarks.map(function(point): HandLandmark {
      return { x: 1 - point.x, y: point.y, z: point.z || 0 };
    });
    return handLmSmooth;
  }
  for (var index = 0; index < 21; index++) {
    var source = landmarks[index];
    var target = handLmSmooth[index];
    if (!source || !target) continue;
    target.x += (1 - source.x - target.x) * HAND_SMOOTH_ALPHA;
    target.y += (source.y - target.y) * HAND_SMOOTH_ALPHA;
    target.z += ((source.z || 0) - target.z) * HAND_SMOOTH_ALPHA;
  }
  return handLmSmooth;
}

function palmCenter(landmarks: HandLandmark[]): Point2D {
  var indices = [0, 5, 9, 13, 17];
  var x = 0;
  var y = 0;
  indices.forEach(function(index): void {
    x += landmarks[index]?.x || 0;
    y += landmarks[index]?.y || 0;
  });
  return { x: x / indices.length, y: y / indices.length };
}

function handOpenness(landmarks: HandLandmark[], palm: Point2D): number {
  var first = landmarks[5];
  var last = landmarks[17];
  if (!first || !last) return 1;
  var span = Math.max(0.055, Math.hypot(first.x - last.x, first.y - last.y));
  var tips = [8, 12, 16, 20];
  var average = tips.reduce(function(total, index): number {
    var point = landmarks[index];
    return point ? total + Math.hypot(point.x - palm.x, point.y - palm.y) : total;
  }, 0) / tips.length;
  return clampRange((average / span - 0.62) / 0.78, 0, 1);
}

function processHandFrame(rawLandmarks: HandLandmark[]): void {
  handLmLastSeen = performance.now();
  var landmarks = smoothLandmarks(rawLandmarks);
  var palm = palmCenter(landmarks);
  var openness = handOpenness(landmarks, palm);
  gestureGrip.openness += (openness - gestureGrip.openness) * 0.28;
  var gripTarget = clampRange(1 - openness, 0, 1);
  gestureGrip.target = gripTarget > 0.55 ? gripTarget : 0;
  updateHandParticlePosition(palm, openness);
  var thumb = landmarks[4];
  var finger = landmarks[8];
  if (!thumb || !finger) return;
  var isPinch = Math.hypot(finger.x - thumb.x, finger.y - thumb.y) < 0.075 && openness > 0.28;
  var isFist = !isPinch && gripTarget > 0.68;
  updatePinchAndGrip(palm, openness, gripTarget, isPinch, isFist);
  drawHandSkeleton(landmarks, isPinch, openness, isFist);
}

function updateHandParticlePosition(palm: Point2D, openness: number): void {
  var ndcX = palm.x * 2 - 1;
  var ndcY = -(palm.y * 2 - 1);
  var localX = ndcX * PLANE_SIZE * 0.62;
  var localY = ndcY * PLANE_SIZE * 0.62;
  if (particleLocalPointFromNdc(ndcX, ndcY, particlePointerLocalHit)) {
    localX = particlePointerLocalHit.x;
    localY = particlePointerLocalHit.y;
  }
  var current = uniforms.uHandXY.value;
  current.x += (localX - current.x) * 0.48;
  current.y += (localY - current.y) * 0.48;
  var active = 0.44 + openness * 0.56;
  uniforms.uHandActive.value += (active - uniforms.uHandActive.value) * 0.26;
}

function updatePinchAndGrip(palm: Point2D, openness: number, gripTarget: number, isPinch: boolean, isFist: boolean): void {
  if (isPinch && !pinchState.active) {
    unlockCenteredView();
    pinchState = { active: true, lastX: palm.x, lastY: palm.y, lastT: performance.now() };
    particleSpin.vx = 0;
    particleSpin.vy = 0;
    gestureGrip.target = Math.min(0.34, gestureGrip.target);
    showGestureHUD('捏合拖动', 1, '移动手掌 -> 旋转封面');
  } else if (isPinch) {
    updateActivePinch(palm);
  } else if (pinchState.active) {
    pinchState.active = false;
    showGestureHUD('松开', 0.4, '可继续触碰或捏合');
  } else if (isFist) {
    if (gestureGrip.lastState !== 'fist') {
      gestureGrip.pulse = 1;
      uniforms.uBurstAmt.value = Math.max(uniforms.uBurstAmt.value, 0.26);
    }
    gestureGrip.lastState = 'fist';
    showGestureHUD('握拳收束', Math.max(0.55, gripTarget), '粒子向中心收缩');
  } else {
    if (gestureGrip.lastState === 'fist' && openness > 0.58) uniforms.uBurstAmt.value = Math.max(uniforms.uBurstAmt.value, 0.18);
    gestureGrip.lastState = openness > 0.62 ? 'open' : 'hover';
    showGestureHUD(openness > 0.62 ? '张开恢复' : '悬停', 0.30 + openness * 0.34, '手掌推开粒子 / 捏合旋转 / 握拳收束');
  }
}

function updateActivePinch(palm: Point2D): void {
  unlockCenteredView();
  var now = performance.now();
  var deltaTime = Math.max(1 / 120, Math.min(0.08, (now - pinchState.lastT) / 1000 || 1 / 60));
  var spinY = (palm.x - pinchState.lastX) * PARTICLE_HAND_SPIN_Y;
  var spinX = (palm.y - pinchState.lastY) * PARTICLE_HAND_SPIN_X;
  gestureRotation.y += spinY;
  gestureRotation.x += spinX;
  particleSpin.vy = clampParticleSpinVelocity(spinY / deltaTime * 0.48);
  particleSpin.vx = clampParticleSpinVelocity(spinX / deltaTime * 0.48);
  pinchState.lastX = palm.x;
  pinchState.lastY = palm.y;
  pinchState.lastT = now;
  gestureGrip.target = Math.min(0.34, gestureGrip.target);
  showGestureHUD('拖动中', 1, '松手后保留惯性');
}
