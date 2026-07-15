function projectIdleGuidePoint(
  x: number,
  y: number,
  z: number,
  rotation: IdleGuideRotation,
  centerX: number,
  centerY: number,
  depth: number
): IdleGuidePoint {
  var rotatedX = x * rotation.cy + z * rotation.sy;
  var rotatedZ = -x * rotation.sy + z * rotation.cy;
  var rotatedY = y * rotation.cx - rotatedZ * rotation.sx;
  var projectedZ = y * rotation.sx + rotatedZ * rotation.cx;
  var scale = Math.max(0.52, Math.min(1.74, depth / (depth - projectedZ * 0.72)));
  return {
    x: centerX + rotatedX * scale,
    y: centerY + rotatedY * scale,
    z: projectedZ,
    scale: scale
  };
}

function resetIdleGuideTrails(): void {
  idleGuideTrails = [[], [], [], []];
}

function pushIdleGuideTrail(index: number, point: IdleGuidePoint, alpha: number, now: number): void {
  var trail = idleGuideTrails[index];
  if (!trail) {
    trail = [];
    idleGuideTrails[index] = trail;
  }
  var last = trail[trail.length - 1];
  var distance = last ? Math.hypot(point.x - last.x, point.y - last.y) : Infinity;
  if (!last || distance > 1.4 || now - last.t > 42) {
    trail.push({ x: point.x, y: point.y, scale: point.scale, alpha: alpha || 1, t: now });
  }
  while (trail.length > 26) trail.shift();
}

function drawIdleGuideTrail(
  context: CanvasRenderingContext2D,
  trail: IdleGuideTrailPoint[],
  now: number,
  alpha: number,
  energy: number
): void {
  while (trail.length && now - trail[0].t > 680) trail.shift();
  if (trail.length < 2) return;
  context.save();
  context.lineCap = 'round';
  context.lineJoin = 'round';
  for (var index = 1; index < trail.length; index++) {
    var previous = trail[index - 1];
    var current = trail[index];
    if (!previous || !current) continue;
    var age = (now - current.t) / 680;
    var order = index / Math.max(1, trail.length - 1);
    var fade = Math.max(0, 1 - age) * order;
    if (fade <= 0) continue;
    context.strokeStyle = 'rgba(255,255,255,' + (alpha * fade * (0.18 + energy * 0.24)).toFixed(3) + ')';
    context.lineWidth = (0.7 + current.scale * 0.9 + energy * 1.2) * fade;
    context.beginPath();
    context.moveTo(previous.x, previous.y);
    context.quadraticCurveTo(
      (previous.x + current.x) * 0.5,
      (previous.y + current.y) * 0.5,
      current.x,
      current.y
    );
    context.stroke();
  }
  context.restore();
}

function scheduleIdleGuideFrame(delayMs = 0): void {
  if (idleGuideDelayTimer) {
    clearTimeout(idleGuideDelayTimer);
    idleGuideDelayTimer = null;
  }
  if (delayMs > 0) {
    idleGuideDelayTimer = setTimeout(function(): void {
      idleGuideDelayTimer = null;
      requestAnimationFrame(drawIdleGuideFrame);
    }, delayMs);
    return;
  }
  requestAnimationFrame(drawIdleGuideFrame);
}
