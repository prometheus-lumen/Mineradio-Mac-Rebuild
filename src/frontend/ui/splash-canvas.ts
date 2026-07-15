function drawMineradioSplash(): void {
  if (!splashAnimating || !splashCanvas || !splashCtx && !splashGl) return;
  requestAnimationFrame(drawMineradioSplash);
  var elapsed = (performance.now() - splashStartedAt) / 1000;
  if (splashGl && splashGlProgram) {
    drawMineradioSplashWebgl(elapsed);
    return;
  }
  var context = splashCtx;
  if (!context) return;
  context.clearRect(0, 0, splashW, splashH);
  drawSplashBackdrop(context, elapsed);
  drawSplashDust(context, elapsed);
  context.save();
  context.globalCompositeOperation = 'lighter';
  drawSplashStreaks(context, elapsed);
  drawSplashLightSlit(context, elapsed);
  context.restore();
}

function drawSplashBackdrop(context: CanvasRenderingContext2D, elapsed: number): void {
  var background = context.createLinearGradient(0, 0, splashW, splashH);
  background.addColorStop(0, 'rgba(1,6,7,0.68)');
  background.addColorStop(0.45, 'rgba(10,9,12,0.74)');
  background.addColorStop(1, 'rgba(0,0,0,0.84)');
  context.fillStyle = background;
  context.fillRect(0, 0, splashW, splashH);
  context.save();
  context.globalAlpha = 0.22;
  context.fillStyle = 'rgba(255,255,255,0.035)';
  var offset = elapsed * 28 % 36;
  for (var y = -offset; y < splashH; y += 36) context.fillRect(0, y, splashW, 1);
  context.restore();
}

function drawSplashDust(context: CanvasRenderingContext2D, elapsed: number): void {
  splashDust.forEach(function(particle): void {
    particle.x += particle.vx;
    particle.y += particle.vy;
    particle.p += 0.018;
    if (particle.x < -10) particle.x = splashW + 10;
    if (particle.x > splashW + 10) particle.x = -10;
    if (particle.y < -10) particle.y = splashH + 10;
    if (particle.y > splashH + 10) particle.y = -10;
    var alpha = particle.a * (0.58 + Math.sin(particle.p + elapsed * 0.8) * 0.34);
    context.beginPath();
    context.arc(particle.x, particle.y, particle.r, 0, Math.PI * 2);
    context.fillStyle = 'rgba(255,255,255,' + Math.max(0, alpha) + ')';
    context.fill();
  });
}

function drawSplashStreaks(context: CanvasRenderingContext2D, elapsed: number): void {
  splashStreaks.forEach(function(streak): void {
    var travel = (elapsed * streak.speed * 240 + streak.x + Math.sin(elapsed * 0.8 + streak.phase) * 28) % (splashW + streak.len + 180);
    var x = travel - streak.len - 90;
    var y = streak.y + Math.sin(elapsed * 0.75 + streak.phase) * 18;
    var fade = splashSmoothstep(streak.delay * 0.55, streak.delay * 0.55 + 0.52, elapsed) * (1 - splashSmoothstep(3.52, 4.12, elapsed));
    if (fade <= 0) return;
    context.save();
    context.translate(x, y);
    context.rotate(streak.angle);
    var gradient = context.createLinearGradient(-streak.len * 0.5, 0, streak.len * 0.5, 0);
    gradient.addColorStop(0, streak.color + '0)');
    gradient.addColorStop(0.52, streak.color + (streak.alpha * fade).toFixed(3) + ')');
    gradient.addColorStop(1, 'rgba(255,255,255,0)');
    context.strokeStyle = gradient;
    context.lineWidth = streak.width;
    context.shadowColor = streak.color + (0.34 * fade).toFixed(3) + ')';
    context.shadowBlur = 18;
    context.beginPath();
    context.moveTo(-streak.len * 0.5, 0);
    context.lineTo(streak.len * 0.5, 0);
    context.stroke();
    context.restore();
  });
}

function drawSplashLightSlit(context: CanvasRenderingContext2D, elapsed: number): void {
  var lineProgress = splashEaseOutCubic((elapsed - 0.12) / 1.18);
  var exitFade = 1 - splashSmoothstep(3.58, 4.12, elapsed);
  if (lineProgress <= 0 || exitFade <= 0) return;
  var centerY = splashH * 0.5 + Math.sin(elapsed * 1.4) * 1.6;
  var width = splashW * (0.16 + lineProgress * 0.72);
  var left = splashW * 0.5 - width * 0.5;
  var right = splashW * 0.5 + width * 0.5;
  var coreAlpha = (0.34 + lineProgress * 0.58) * exitFade;
  var gradient = context.createLinearGradient(left, centerY, right, centerY);
  gradient.addColorStop(0, 'rgba(255,83,103,0)');
  gradient.addColorStop(0.18, 'rgba(255,83,103,' + (0.18 * exitFade).toFixed(3) + ')');
  gradient.addColorStop(0.50, 'rgba(255,255,255,' + coreAlpha.toFixed(3) + ')');
  gradient.addColorStop(0.68, 'rgba(244,210,138,' + (0.38 * exitFade).toFixed(3) + ')');
  gradient.addColorStop(0.84, 'rgba(122,215,194,' + (0.20 * exitFade).toFixed(3) + ')');
  gradient.addColorStop(1, 'rgba(122,215,194,0)');
  context.shadowColor = 'rgba(244,210,138,' + (0.48 * exitFade).toFixed(3) + ')';
  context.shadowBlur = 42 + lineProgress * 42;
  context.lineCap = 'round';
  context.strokeStyle = gradient;
  context.lineWidth = 1.4 + lineProgress * 2.2;
  context.beginPath();
  context.moveTo(left, centerY);
  context.lineTo(right, centerY);
  context.stroke();
  drawSplashIgnition(context, elapsed, centerY);
  drawSplashWave(context, elapsed, centerY, left, width, lineProgress, exitFade);
  drawSplashShards(context, elapsed, centerY, exitFade);
  drawSplashFlash(context, elapsed, centerY);
}

function drawSplashIgnition(context: CanvasRenderingContext2D, elapsed: number, centerY: number): void {
  var ignition = Math.exp(-Math.pow((elapsed - 0.72) / 0.26, 2));
  if (ignition <= 0.018) return;
  var gradient = context.createLinearGradient(0, centerY, splashW, centerY);
  gradient.addColorStop(0, 'rgba(122,215,194,0)');
  gradient.addColorStop(0.46, 'rgba(122,215,194,' + (0.07 * ignition).toFixed(3) + ')');
  gradient.addColorStop(0.50, 'rgba(255,255,255,' + (0.16 * ignition).toFixed(3) + ')');
  gradient.addColorStop(0.54, 'rgba(255,83,103,' + (0.08 * ignition).toFixed(3) + ')');
  gradient.addColorStop(1, 'rgba(244,210,138,0)');
  context.fillStyle = gradient;
  context.fillRect(0, centerY - 48 * ignition, splashW, 96 * ignition);
}

function drawSplashWave(context: CanvasRenderingContext2D, elapsed: number, centerY: number, left: number, width: number, lineProgress: number, exitFade: number): void {
  var alpha = splashSmoothstep(0.72, 1.95, elapsed) * exitFade;
  if (alpha <= 0) return;
  context.shadowBlur = 20;
  context.strokeStyle = 'rgba(244,210,138,' + (0.22 * alpha).toFixed(3) + ')';
  context.lineWidth = 1;
  context.beginPath();
  for (var index = 0; index <= 82; index++) {
    var progress = index / 82;
    var edge = 1 - Math.abs(progress - 0.5) * 2;
    var amplitude = (4 + 18 * lineProgress) * Math.pow(Math.max(0, edge), 1.4) * alpha;
    var x = left + width * progress;
    var y = centerY + Math.sin(progress * 34 + elapsed * 8.2) * amplitude + Math.sin(progress * 87 - elapsed * 5.1) * amplitude * 0.18;
    if (index === 0) context.moveTo(x, y); else context.lineTo(x, y);
  }
  context.stroke();
}

function drawSplashShards(context: CanvasRenderingContext2D, elapsed: number, centerY: number, exitFade: number): void {
  var progress = splashSmoothstep(0.72, 2.45, elapsed) * exitFade;
  splashShards.forEach(function(shard): void {
    var x = splashW * 0.5 + shard.ox * (0.18 + progress * 0.82) + Math.sin(elapsed * 1.7 + shard.phase) * 22;
    var y = centerY + shard.oy * (0.20 + progress * 0.92);
    var alpha = shard.alpha * progress * (0.62 + Math.sin(elapsed * 5 + shard.phase) * 0.38);
    if (alpha <= 0) return;
    context.save();
    context.translate(x, y);
    context.rotate((-6 + shard.skew * 0.10) * Math.PI / 180);
    context.fillStyle = shard.color + alpha.toFixed(3) + ')';
    context.shadowColor = shard.color + Math.min(0.38, alpha * 1.2).toFixed(3) + ')';
    context.shadowBlur = 14;
    context.beginPath();
    context.moveTo(-shard.w * 0.5, -shard.h * 0.5);
    context.lineTo(shard.w * 0.5, -shard.h * 0.5);
    context.lineTo(shard.w * 0.5 + shard.skew, shard.h * 0.5);
    context.lineTo(-shard.w * 0.5 + shard.skew, shard.h * 0.5);
    context.closePath();
    context.fill();
    context.restore();
  });
}

function drawSplashFlash(context: CanvasRenderingContext2D, elapsed: number, centerY: number): void {
  var flash = Math.exp(-Math.pow((elapsed - 2.52) / 0.38, 2));
  if (flash <= 0.015) return;
  var gradient = context.createLinearGradient(0, centerY, splashW, centerY);
  gradient.addColorStop(0, 'rgba(255,83,103,0)');
  gradient.addColorStop(0.48, 'rgba(255,255,255,' + (0.20 * flash).toFixed(3) + ')');
  gradient.addColorStop(0.52, 'rgba(244,210,138,' + (0.24 * flash).toFixed(3) + ')');
  gradient.addColorStop(1, 'rgba(122,215,194,0)');
  context.fillStyle = gradient;
  context.fillRect(0, centerY - 46 * flash, splashW, 92 * flash);
}
