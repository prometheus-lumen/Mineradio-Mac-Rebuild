function drawIdleGuideFrame(): void {
  if (!idleGuideCanvas || !idleGuideCtx) return;
  var context = idleGuideCtx;
  var now = performance.now();
  var deltaTime = Math.max(1 / 120, Math.min(0.05, (now - idleGuideLastFrameAt) / 1000 || 1 / 60));
  idleGuideLastFrameAt = now;
  var idleVisible = shouldShowIdleGuide();
  var shelfCueStrength = tickShelfHoverCue(deltaTime);
  var shelfCueVisible = shouldShowShelfHoverCue(shelfCueStrength);
  var visible = idleVisible || shelfCueVisible;
  setIdleGuideVisible(visible, idleVisible);
  if (!visible) {
    context.clearRect(0, 0, idleGuideW, idleGuideH);
    resetIdleGuideTrails();
    scheduleIdleGuideFrame(140);
    return;
  }
  var time = (now - idleGuideStartedAt) / 1000;
  if (!idleVisible) {
    context.clearRect(0, 0, idleGuideW, idleGuideH);
    resetIdleGuideTrails();
    context.globalCompositeOperation = 'lighter';
    drawShelfGuideCue(context, time, shelfCueStrength);
    context.globalCompositeOperation = 'source-over';
    scheduleIdleGuideFrame();
    return;
  }
  var guide = idleGuideInteraction;
  updateIdleGuideMotion(guide, deltaTime);
  context.clearRect(0, 0, idleGuideW, idleGuideH);
  context.globalCompositeOperation = 'lighter';
  var breathe = drawIdleGuideHalo(context, guide, time);
  var frame = drawIdleGuideParticleField(context, guide, time, breathe);
  drawIdleGuideConnections(context, frame.ringPoints, breathe, guide, frame.spinEnergy);
  drawIdleGuideOrbitAnchors(context, time, now, guide, frame);
  drawIdleGuideHandle(context, time, breathe, guide, frame);
  if (shelfCueVisible) drawShelfGuideCue(context, time, shelfCueStrength);
  context.globalCompositeOperation = 'source-over';
  scheduleIdleGuideFrame();
}

function initIdleGuideCanvas(): void {
  idleGuideCanvas = document.querySelector<HTMLCanvasElement>('#idle-guide-canvas');
  if (!idleGuideCanvas) return;
  idleGuideCtx = idleGuideCanvas.getContext('2d');
  if (!idleGuideCtx) return;
  idleGuideStartedAt = performance.now();
  resizeIdleGuideCanvas();
  window.addEventListener('resize', resizeIdleGuideCanvas);
  drawIdleGuideFrame();
}
