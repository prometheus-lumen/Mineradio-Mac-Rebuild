function drawIdleGuideConnections(
  context: CanvasRenderingContext2D,
  points: IdleGuideRingPoint[],
  breathe: number,
  guide: IdleGuideInteraction,
  spinEnergy: number
): void {
  context.lineWidth = 1;
  for (var index = 0; index < points.length; index += 3) {
    var first = points[index];
    var second = points[(index + 7) % points.length];
    if (!first || !second || Math.hypot(first.x - second.x, first.y - second.y) > Math.min(idleGuideW, idleGuideH) * 0.17) continue;
    context.strokeStyle = 'rgba(255,255,255,' + (0.018 + breathe * 0.020 + guide.focus * 0.012 + spinEnergy * 0.018).toFixed(3) + ')';
    context.beginPath();
    context.moveTo(first.x, first.y);
    context.lineTo(second.x, second.y);
    context.stroke();
  }
}

function drawIdleGuideOrbitAnchors(
  context: CanvasRenderingContext2D,
  time: number,
  now: number,
  guide: IdleGuideInteraction,
  frame: IdleGuideFieldFrame
): void {
  if (guide.focus <= 0.03 && frame.spinEnergy <= 0.05) return;
  var radius = Math.min(idleGuideW, idleGuideH) * (0.305 + guide.press * 0.018) * guide.zoom;
  var alpha = Math.min(0.68, 0.16 + guide.focus * 0.24 + frame.spinEnergy * 0.38);
  for (var index = 0; index < 4; index++) {
    var angle = guide.angle + time * 0.08 + index * 1.72 + (index === 2 ? 0.38 : 0);
    var point = projectIdleGuidePoint(
      Math.cos(angle) * radius,
      Math.sin(angle) * radius * 0.52,
      Math.sin(angle + index * 0.54) * radius * 0.48,
      frame.rotation,
      idleGuideW * 0.5,
      idleGuideH * 0.5,
      frame.depth
    );
    pushIdleGuideTrail(index, point, alpha, now);
    var trail = idleGuideTrails[index];
    if (trail) drawIdleGuideTrail(context, trail, now, alpha, frame.spinEnergy);
    context.beginPath();
    context.arc(point.x, point.y, (2.0 + frame.spinEnergy * 1.8 + (index === 0 ? guide.press * 1.8 : 0)) * point.scale, 0, Math.PI * 2);
    context.fillStyle = 'rgba(255,255,255,' + alpha.toFixed(3) + ')';
    context.fill();
  }
}

function drawIdleGuideHandle(
  context: CanvasRenderingContext2D,
  time: number,
  breathe: number,
  guide: IdleGuideInteraction,
  frame: IdleGuideFieldFrame
): void {
  if (guide.focus <= 0.03) return;
  var angle = guide.angle + time * 0.36;
  var radius = Math.min(idleGuideW, idleGuideH) * (0.315 + breathe * 0.012 + guide.press * 0.012) * guide.zoom;
  var point = projectIdleGuidePoint(
    Math.cos(angle) * radius,
    Math.sin(angle) * radius * 0.52,
    Math.sin(angle + 0.62) * radius * 0.48,
    frame.rotation,
    idleGuideW * 0.5,
    idleGuideH * 0.5,
    frame.depth
  );
  var glowRadius = 28 + guide.press * 12;
  var glow = context.createRadialGradient(point.x, point.y, 0, point.x, point.y, glowRadius);
  glow.addColorStop(0, 'rgba(255,255,255,' + (0.22 * guide.focus + 0.16 * guide.press).toFixed(3) + ')');
  glow.addColorStop(1, 'rgba(255,255,255,0)');
  context.fillStyle = glow;
  context.beginPath();
  context.arc(point.x, point.y, glowRadius, 0, Math.PI * 2);
  context.fill();
  context.beginPath();
  context.arc(point.x, point.y, 2.4 + guide.press * 1.6, 0, Math.PI * 2);
  context.fillStyle = 'rgba(255,255,255,' + (0.54 * guide.focus + 0.24 * guide.press).toFixed(3) + ')';
  context.fill();
}
