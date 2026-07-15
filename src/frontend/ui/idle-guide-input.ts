function setIdleGuideVisible(show: boolean, interactive: boolean): void {
  document.body.classList.toggle('idle-guide-on', show);
  document.body.classList.toggle('idle-guide-interactive', interactive);
  if (!interactive) document.body.classList.remove('idle-guide-dragging');
  if (idleGuideVisible !== show) idleGuideVisible = show;
}

function shouldShowIdleGuide(): boolean {
  if (!IDLE_GUIDE_BACKGROUND_ENABLED || immersiveMode || playing || loginGuideAnimating) return false;
  if (document.body.classList.contains('splash-active')) return false;
  if (document.querySelector('.modal-mask.show')) return false;
  return uniforms.uHasCover.value <= 0.5;
}

function clampIdleGuideSpin(value: number): number {
  if (!isFinite(value)) return 0;
  return Math.max(-4.8, Math.min(4.8, value));
}

function updateIdleGuidePointer(event: MouseEvent | WheelEvent): void {
  idleGuideInteraction.pointerActive = true;
  idleGuideInteraction.pointerX = event.clientX / Math.max(1, idleGuideW || innerWidth);
  idleGuideInteraction.pointerY = event.clientY / Math.max(1, idleGuideH || innerHeight);
}

function idleGuidePointerDown(event: MouseEvent): void {
  if (!shouldHandleIdleGuidePointer(event)) return;
  idleGuideInteraction.dragging = true;
  updateIdleGuidePointer(event);
  idleGuideInteraction.lastX = event.clientX;
  idleGuideInteraction.lastY = event.clientY;
  idleGuideInteraction.lastT = performance.now();
  document.body.classList.add('idle-guide-dragging');
}

function idleGuidePointerMove(event: MouseEvent): void {
  if (!idleGuideCanvas) return;
  var canReact = shouldHandleIdleGuidePointer(event) || idleGuideInteraction.dragging;
  idleGuideInteraction.pointerActive = canReact;
  if (canReact) updateIdleGuidePointer(event);
  if (!idleGuideInteraction.dragging) return;
  var now = performance.now();
  var deltaTime = Math.max(1 / 120, Math.min(0.08, (now - idleGuideInteraction.lastT) / 1000 || 1 / 60));
  var rotationX = -(event.clientY - idleGuideInteraction.lastY) * 0.0032;
  var rotationY = (event.clientX - idleGuideInteraction.lastX) * 0.0034;
  idleGuideInteraction.rotX += rotationX;
  idleGuideInteraction.rotY += rotationY;
  idleGuideInteraction.angle += rotationY * 0.22;
  idleGuideInteraction.spinX = clampIdleGuideSpin(rotationX / deltaTime * 0.46);
  idleGuideInteraction.spinY = clampIdleGuideSpin(rotationY / deltaTime * 0.46);
  idleGuideInteraction.velocity = Math.hypot(idleGuideInteraction.spinX, idleGuideInteraction.spinY);
  idleGuideInteraction.lastX = event.clientX;
  idleGuideInteraction.lastY = event.clientY;
  idleGuideInteraction.lastT = now;
}

function idleGuidePointerUp(): void {
  if (!idleGuideInteraction.dragging) return;
  idleGuideInteraction.dragging = false;
  document.body.classList.remove('idle-guide-dragging');
}

function idleGuidePointerLeave(): void {
  if (!idleGuideInteraction.dragging) idleGuideInteraction.pointerActive = false;
}

function idleGuideWheel(event: WheelEvent): boolean {
  if (!shouldHandleIdleGuidePointer(event)) return false;
  updateIdleGuidePointer(event);
  var nextZoom = idleGuideInteraction.zoomTarget * Math.exp(-event.deltaY * 0.0012);
  idleGuideInteraction.zoomTarget = Math.max(0.58, Math.min(1.82, nextZoom));
  idleGuideInteraction.zoomPulse = Math.min(1, idleGuideInteraction.zoomPulse + Math.min(0.28, Math.abs(event.deltaY) * 0.0014));
  return true;
}

function resizeIdleGuideCanvas(): void {
  if (!idleGuideCanvas || !idleGuideCtx) return;
  idleGuideDpr = Math.min(window.devicePixelRatio || 1, 1.6);
  idleGuideW = window.innerWidth;
  idleGuideH = window.innerHeight;
  idleGuideCanvas.width = Math.max(1, Math.floor(idleGuideW * idleGuideDpr));
  idleGuideCanvas.height = Math.max(1, Math.floor(idleGuideH * idleGuideDpr));
  idleGuideCanvas.style.width = idleGuideW + 'px';
  idleGuideCanvas.style.height = idleGuideH + 'px';
  idleGuideCtx.setTransform(idleGuideDpr, 0, 0, idleGuideDpr, 0, 0);
  idleGuideParticles = [];
  resetIdleGuideTrails();
  if (!IDLE_GUIDE_BACKGROUND_ENABLED) return;
  createIdleGuideParticles();
}

function createIdleGuideParticles(): void {
  var minDimension = Math.min(idleGuideW, idleGuideH);
  var maxDimension = Math.max(idleGuideW, idleGuideH);
  var count = idleGuideW < 800 ? 150 : 240;
  for (var index = 0; index < count; index++) {
    var ring = index < count * 0.76;
    var angle = Math.random() * Math.PI * 2;
    var radius = ring
      ? minDimension * 0.035 + Math.pow(Math.random(), 0.58) * minDimension * 0.335
      : Math.pow(Math.random(), 0.82) * maxDimension * 0.58;
    var wobble = minDimension * (ring ? 0.012 + Math.random() * 0.035 : 0.010 + Math.random() * 0.055);
    idleGuideParticles.push({
      a: angle, r: radius, cx: ring ? 0.5 : Math.random(), cy: ring ? 0.5 : Math.random(),
      size: ring ? 0.30 + Math.random() * 0.62 : 0.18 + Math.random() * 0.44,
      speed: ((ring ? 0.018 : 0.010) + Math.random() * (ring ? 0.045 : 0.030)) * (Math.random() < 0.5 ? -1 : 1),
      phase: Math.random() * Math.PI * 2, wobbleAmp: wobble, wobbleSpeed: 0.18 + Math.random() * 0.76,
      oval: 0.56 + Math.random() * 0.36, zAmp: 0.34 + Math.random() * 0.82,
      driftX: (Math.random() * 2 - 1) * wobble * 0.75, driftY: (Math.random() * 2 - 1) * wobble * 0.75,
      layer: Math.random(), z: (Math.random() * 2 - 1) * (ring ? minDimension * 0.28 : maxDimension * 0.42), ring: ring
    });
  }
}
