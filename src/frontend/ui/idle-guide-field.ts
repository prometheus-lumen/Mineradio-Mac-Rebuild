function updateIdleGuideMotion(guide: IdleGuideInteraction, deltaTime: number): void {
  if (!guide.dragging) {
    guide.rotX += guide.spinX * deltaTime;
    guide.rotY += guide.spinY * deltaTime;
    guide.spinX *= Math.pow(0.90, deltaTime * 60);
    guide.spinY *= Math.pow(0.90, deltaTime * 60);
    if (Math.abs(guide.spinX) < 0.01) guide.spinX = 0;
    if (Math.abs(guide.spinY) < 0.01) guide.spinY = 0;
  }
  guide.rotY += 0.012 * deltaTime;
  guide.angle += guide.spinY * deltaTime * 0.20 + 0.010 * deltaTime;
  guide.velocity = Math.hypot(guide.spinX, guide.spinY);
  guide.focus += ((guide.pointerActive ? 1 : 0) - guide.focus) * 0.10;
  guide.press += ((guide.dragging ? 1 : 0) - guide.press) * 0.16;
  guide.zoom += (guide.zoomTarget - guide.zoom) * 0.13;
  guide.zoomPulse *= Math.pow(0.84, deltaTime * 60);
  if (guide.zoomPulse < 0.002) guide.zoomPulse = 0;
  guide.tiltX += ((guide.pointerX - 0.5) * 0.26 - guide.tiltX) * 0.08;
  guide.tiltY += ((guide.pointerY - 0.5) * 0.18 - guide.tiltY) * 0.08;
}

function drawIdleGuideHalo(context: CanvasRenderingContext2D, guide: IdleGuideInteraction, time: number): number {
  var centerX = idleGuideW * 0.5;
  var centerY = idleGuideH * 0.5;
  var breathe = 0.5 + 0.5 * Math.sin(time * 0.72);
  var radius = Math.min(idleGuideW, idleGuideH) * ((0.36 + breathe * 0.035 + guide.press * 0.018) * guide.zoom);
  var halo = context.createRadialGradient(centerX, centerY, 0, centerX, centerY, radius);
  halo.addColorStop(0, 'rgba(255,255,255,' + (0.034 + breathe * 0.020 + guide.focus * 0.014 + guide.press * 0.018 + guide.zoomPulse * 0.018).toFixed(3) + ')');
  halo.addColorStop(0.44, 'rgba(255,255,255,' + (0.014 + guide.focus * 0.010).toFixed(3) + ')');
  halo.addColorStop(1, 'rgba(255,255,255,0)');
  context.fillStyle = halo;
  context.fillRect(0, 0, idleGuideW, idleGuideH);
  return breathe;
}

function drawIdleGuideParticleField(
  context: CanvasRenderingContext2D,
  guide: IdleGuideInteraction,
  time: number,
  breathe: number
): IdleGuideFieldFrame {
  var centerX = idleGuideW * 0.5;
  var centerY = idleGuideH * 0.5;
  var pointerX = guide.pointerX * idleGuideW;
  var pointerY = guide.pointerY * idleGuideH;
  var spinEnergy = Math.min(1, guide.velocity / 1.5 + guide.press * 0.42);
  var rotation = {
    sx: Math.sin(guide.rotX), cx: Math.cos(guide.rotX),
    sy: Math.sin(guide.rotY), cy: Math.cos(guide.rotY)
  };
  var depth = Math.max(520, Math.min(idleGuideW, idleGuideH) * 0.92);
  var ringPoints: IdleGuideRingPoint[] = [];
  idleGuideParticles.forEach(function(particle): void {
    var angle = particle.a + time * particle.speed;
    var wanderAngle = particle.phase + time * particle.wobbleSpeed;
    var wobble = Math.sin(wanderAngle) * particle.wobbleAmp
      + Math.sin(time * (particle.wobbleSpeed * 0.57 + 0.11) + particle.phase * 1.7) * particle.wobbleAmp * 0.45;
    var point = particle.ring
      ? projectRingParticle(particle, angle, wanderAngle, wobble, guide, rotation, centerX, centerY, depth, breathe, pointerX, pointerY, time)
      : projectFieldParticle(particle, angle, wobble, guide.zoom, rotation, centerX, centerY, depth);
    if (particle.ring) ringPoints.push(point);
    var depthGlow = particle.ring ? 0.66 + point.scale * 0.20 : 1;
    var alpha = particle.ring
      ? (0.070 + breathe * 0.065 + Math.sin(time * (0.8 + particle.layer) + particle.phase) * 0.024 + spinEnergy * 0.032) * depthGlow
      : 0.034 + guide.focus * 0.010;
    context.beginPath();
    context.arc(point.x, point.y, particle.size * point.scale * Math.sqrt(guide.zoom) * (1 + spinEnergy * (particle.ring ? 0.24 : 0.08) + guide.zoomPulse * 0.12), 0, Math.PI * 2);
    context.fillStyle = 'rgba(255,255,255,' + Math.max(0, alpha).toFixed(3) + ')';
    context.fill();
  });
  return { ringPoints: ringPoints, rotation: rotation, depth: depth, spinEnergy: spinEnergy };
}

function projectRingParticle(
  particle: IdleGuideParticle, angle: number, wanderAngle: number, wobble: number,
  guide: IdleGuideInteraction, rotation: IdleGuideRotation, centerX: number, centerY: number,
  depth: number, breathe: number, pointerX: number, pointerY: number, time: number
): IdleGuideRingPoint {
  var radius = (particle.r + wobble + breathe * 12) * guide.zoom * (1 + guide.press * 0.030 + guide.zoomPulse * 0.018);
  var baseX = Math.cos(angle) * radius + Math.sin(wanderAngle * 0.73) * particle.wobbleAmp * 0.54 + particle.driftX;
  var baseY = Math.sin(angle + Math.sin(wanderAngle) * 0.10) * radius * particle.oval + Math.sin(time * 0.33 + particle.phase) * particle.wobbleAmp * 0.68 + particle.driftY;
  var baseZ = (Math.sin(angle * 0.84 + particle.phase * 0.31) * radius * particle.zAmp + particle.z * 0.54 + Math.cos(wanderAngle * 0.91) * particle.wobbleAmp) * guide.zoom;
  var point = projectIdleGuidePoint(baseX, baseY, baseZ, rotation, centerX, centerY, depth);
  point.x += guide.tiltX * point.z * 0.020;
  point.y += guide.tiltY * point.z * 0.018;
  var deltaX = pointerX - point.x;
  var deltaY = pointerY - point.y;
  var proximity = guide.focus * Math.max(0, 1 - Math.hypot(deltaX, deltaY) / 210);
  point.x += deltaX * proximity * 0.040;
  point.y += deltaY * proximity * 0.040;
  return Object.assign(point, { alpha: 0.08 + breathe * 0.04 + proximity * 0.08 });
}

function projectFieldParticle(
  particle: IdleGuideParticle, angle: number, wobble: number, zoom: number,
  rotation: IdleGuideRotation, centerX: number, centerY: number, depth: number
): IdleGuideRingPoint {
  var x = ((particle.cx - 0.5) * idleGuideW * 0.92 + Math.cos(angle) * (12 + particle.wobbleAmp * 0.28) + wobble * 0.28) * zoom;
  var y = ((particle.cy - 0.5) * idleGuideH * 0.72 + Math.sin(angle * 0.8 + particle.phase * 0.2) * (12 + particle.wobbleAmp * 0.24)) * zoom;
  var z = (particle.z + Math.sin(angle + particle.phase) * (32 + particle.wobbleAmp * 0.32)) * zoom;
  return Object.assign(projectIdleGuidePoint(x, y, z, rotation, centerX, centerY, depth * 1.16), { alpha: 0 });
}
