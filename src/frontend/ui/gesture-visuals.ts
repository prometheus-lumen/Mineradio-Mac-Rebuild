function drawHandSkeleton(landmarks: HandLandmark[], isPinch: boolean, openness: number, isFist: boolean): void {
  if (!handCanvasCtx) return;
  var context = handCanvasCtx;
  context.clearRect(0, 0, innerWidth, innerHeight);
  var palm = palmCenter(landmarks);
  var palmX = palm.x * innerWidth;
  var palmY = palm.y * innerHeight;
  var normalizedOpenness = clampRange(openness, 0, 1);
  var primary = isFist ? 'rgba(244,210,138,0.92)' : (isPinch ? 'rgba(156,255,223,0.95)' : 'rgba(226,247,255,0.92)');
  var soft = isFist ? 'rgba(244,210,138,0.18)' : (isPinch ? 'rgba(156,255,223,0.20)' : 'rgba(143,233,255,0.18)');
  context.save();
  context.globalCompositeOperation = 'lighter';
  drawHandPalmAura(context, palmX, palmY, normalizedOpenness, isFist, primary, soft);
  [4, 8, 12, 16, 20].forEach(function(index): void {
    var point = landmarks[index];
    if (point) drawHandFingerBeam(context, point, index, palmX, palmY, normalizedOpenness, isFist, primary);
  });
  context.beginPath();
  context.arc(palmX, palmY, isFist ? 7.2 : 5.4, 0, Math.PI * 2);
  context.fillStyle = 'rgba(255,255,255,' + (isFist ? 0.82 : 0.62).toFixed(3) + ')';
  context.fill();
  if (isPinch) drawPinchLink(context, landmarks);
  context.restore();
}

function drawHandPalmAura(context: CanvasRenderingContext2D, x: number, y: number, openness: number, isFist: boolean, primary: string, soft: string): void {
  var coreRadius = 26 + openness * 34;
  var aura = context.createRadialGradient(x, y, 0, x, y, coreRadius * 2.15);
  aura.addColorStop(0, isFist ? 'rgba(244,210,138,0.26)' : 'rgba(255,255,255,0.22)');
  aura.addColorStop(0.28, soft);
  aura.addColorStop(1, 'rgba(255,255,255,0)');
  context.fillStyle = aura;
  context.beginPath();
  context.arc(x, y, coreRadius * 2.15, 0, Math.PI * 2);
  context.fill();
  context.lineCap = 'round';
  context.lineJoin = 'round';
  var ringRadius = 34 + openness * 48;
  for (var ring = 0; ring < 3; ring++) {
    var alpha = 0.18 - ring * 0.045 + (isFist ? 0.08 : 0);
    context.strokeStyle = replaceRgbaAlpha(primary, alpha);
    context.lineWidth = 1.2 + ring * 0.55;
    context.beginPath();
    context.arc(x, y, ringRadius + ring * 13 + Math.sin(uniforms.uTime.value * 1.5 + ring) * 2, 0, Math.PI * 2);
    context.stroke();
  }
}

function drawHandFingerBeam(context: CanvasRenderingContext2D, point: HandLandmark, index: number, palmX: number, palmY: number, openness: number, isFist: boolean, primary: string): void {
  var x = point.x * innerWidth;
  var y = point.y * innerHeight;
  var deltaX = x - palmX;
  var deltaY = y - palmY;
  var alpha = clampRange(0.26 - Math.hypot(deltaX, deltaY) / 720, 0.045, 0.18) * (0.55 + openness * 0.45);
  var gradient = context.createLinearGradient(palmX, palmY, x, y);
  gradient.addColorStop(0, 'rgba(255,255,255,' + (alpha * 0.20).toFixed(3) + ')');
  gradient.addColorStop(0.65, 'rgba(255,255,255,' + (alpha * 0.42).toFixed(3) + ')');
  gradient.addColorStop(1, replaceRgbaAlpha(primary, Math.min(0.72, alpha + 0.14)));
  context.strokeStyle = gradient;
  context.lineWidth = index === 8 || index === 4 ? 1.7 : 1.05;
  context.beginPath();
  context.moveTo(palmX, palmY);
  context.quadraticCurveTo(palmX + deltaX * 0.42 - deltaY * 0.05, palmY + deltaY * 0.42 + deltaX * 0.05, x, y);
  context.stroke();
  var dotRadius = (index === 8 || index === 4 ? 4.2 : 3) + (isFist ? 0.8 : 0);
  var dot = context.createRadialGradient(x, y, 0, x, y, dotRadius * 4.2);
  dot.addColorStop(0, 'rgba(255,255,255,0.92)');
  dot.addColorStop(0.32, primary);
  dot.addColorStop(1, 'rgba(255,255,255,0)');
  context.fillStyle = dot;
  context.beginPath();
  context.arc(x, y, dotRadius * 4.2, 0, Math.PI * 2);
  context.fill();
}

function drawPinchLink(context: CanvasRenderingContext2D, landmarks: HandLandmark[]): void {
  var thumb = landmarks[4];
  var finger = landmarks[8];
  if (!thumb || !finger) return;
  context.strokeStyle = 'rgba(220,255,241,0.88)';
  context.lineWidth = 2;
  context.shadowColor = 'rgba(126,226,168,0.82)';
  context.shadowBlur = 20;
  context.beginPath();
  context.moveTo(thumb.x * innerWidth, thumb.y * innerHeight);
  context.lineTo(finger.x * innerWidth, finger.y * innerHeight);
  context.stroke();
}

function replaceRgbaAlpha(color: string, alpha: number): string {
  return color.replace(/0\.\d+\)$/, alpha.toFixed(3) + ')');
}

function tickGestureRotation(deltaTime: number): void {
  if (Math.abs(particleSpin.vx) > 0.0001 || Math.abs(particleSpin.vy) > 0.0001) {
    gestureRotation.x += particleSpin.vx * deltaTime;
    gestureRotation.y += particleSpin.vy * deltaTime;
    rebaseParticleRotationIfNeeded();
  }
  particleSpin.vx *= Math.pow(particleSpin.damping, deltaTime * 60);
  particleSpin.vy *= Math.pow(particleSpin.damping, deltaTime * 60);
  if (Math.abs(particleSpin.vx) < 0.01) particleSpin.vx = 0;
  if (Math.abs(particleSpin.vy) < 0.01) particleSpin.vy = 0;
  gestureGrip.value += (gestureGrip.target - gestureGrip.value) * (gestureGrip.target > gestureGrip.value ? 0.18 : 0.10);
  gestureGrip.pulse *= Math.pow(0.84, deltaTime * 60);
  if (uniforms.uGestureGrip) uniforms.uGestureGrip.value = clampRange(gestureGrip.value + gestureGrip.pulse * 0.16, 0, 1);
  if (gestureActive && handLmSmooth && performance.now() - handLmLastSeen > 200) {
    uniforms.uHandActive.value *= 0.94;
    gestureGrip.target *= 0.92;
    if (uniforms.uHandActive.value < 0.02) uniforms.uHandActive.value = 0;
  }
}

function showGestureHUD(label: string, progress: number, detail: string): void {
  var hud = document.getElementById('gesture-hud');
  if (!hud) return;
  setGuideText('gesture-label', label || '待命');
  setGuideText('gesture-confirm', detail || '将手放进摄像头视野');
  var fill = document.getElementById('gesture-fill');
  if (fill) fill.style.width = clampRange(progress, 0, 1) * 100 + '%';
  hud.classList.add('show');
}

function showGestureCursor(): void {}

function hideGestureCursor(): void {}
