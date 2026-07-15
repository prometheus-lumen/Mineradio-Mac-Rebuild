interface LoginGuideParticle {
  sx: number;
  sy: number;
  tx: number;
  ty: number;
  radius: number;
  delay: number;
  hue: number;
  spin: number;
}

function setShelfGuideCueActive(enabled: boolean): void {
  shelfHoverCue.guide = enabled;
  if (!enabled) {
    shelfHoverCue.target = 0;
    return;
  }
  var center = shelfCueCenter();
  shelfHoverCue.target = 1;
  shelfHoverCue.value = Math.max(shelfHoverCue.value, 0.72);
  shelfHoverCue.x = center.x;
  shelfHoverCue.y = center.y;
  shelfHoverCue.lastAt = performance.now();
}

function runLoginGuideParticles(done?: () => void): void {
  var canvas = document.querySelector<HTMLCanvasElement>('#login-guide-canvas');
  if (!canvas || reduceSplashMotion) {
    if (done) setTimeout(done, 120);
    return;
  }
  if (loginGuideAnimating) {
    if (done) setTimeout(done, 720);
    return;
  }
  var context = canvas.getContext('2d');
  if (!context) {
    if (done) done();
    return;
  }
  var activeCanvas = canvas;
  var activeContext = context;
  loginGuideAnimating = true;
  document.body.classList.add('login-guide-active');
  var dpr = Math.min(window.devicePixelRatio || 1, 1.8);
  var width = window.innerWidth;
  var height = window.innerHeight;
  canvas.width = Math.floor(width * dpr);
  canvas.height = Math.floor(height * dpr);
  canvas.style.width = width + 'px';
  canvas.style.height = height + 'px';
  context.setTransform(dpr, 0, 0, dpr, 0, 0);
  var centerX = width * 0.5;
  var centerY = height * 0.5 - 10;
  var maxRadius = Math.max(width, height);
  var particles: LoginGuideParticle[] = [];
  for (var index = 0; index < 92; index++) {
    var angle = Math.random() * Math.PI * 2;
    var ring = maxRadius * (0.30 + Math.random() * 0.35);
    var arcBias = Math.random() < 0.42 ? Math.PI * 0.5 : 0;
    particles.push({
      sx: centerX + Math.cos(angle + arcBias) * ring + (Math.random() - 0.5) * 80,
      sy: centerY + Math.sin(angle) * ring * 0.72 + (Math.random() - 0.5) * 80,
      tx: centerX + (Math.random() - 0.5) * 172,
      ty: centerY + (Math.random() - 0.5) * 172,
      radius: 0.8 + Math.random() * 1.9,
      delay: Math.random() * 0.22,
      hue: Math.random(),
      spin: Math.random() * Math.PI * 2
    });
  }
  var started = performance.now();
  if (loginGuideRaf !== null) cancelAnimationFrame(loginGuideRaf);
  function draw(now: number): void {
    var progress = Math.min(1, (now - started) / 1050);
    activeContext.clearRect(0, 0, width, height);
    activeContext.globalCompositeOperation = 'lighter';
    drawLoginGuideHalo(activeContext, centerX, centerY, width, height, progress);
    particles.forEach(function(particle): void {
      drawLoginGuideParticle(activeContext, particle, progress);
    });
    if (progress < 1) loginGuideRaf = requestAnimationFrame(draw);
    else finishLoginGuideParticles(activeCanvas, activeContext, width, height, done);
  }
  loginGuideRaf = requestAnimationFrame(draw);
}

function drawLoginGuideHalo(context: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, progress: number): void {
  var pulse = Math.sin(Math.PI * progress);
  var halo = context.createRadialGradient(x, y, 0, x, y, Math.min(width, height) * 0.28);
  halo.addColorStop(0, 'rgba(255,255,255,' + (0.060 * pulse) + ')');
  halo.addColorStop(0.55, 'rgba(255,255,255,' + (0.026 * pulse) + ')');
  halo.addColorStop(1, 'rgba(0,0,0,0)');
  context.fillStyle = halo;
  context.fillRect(0, 0, width, height);
}

function drawLoginGuideParticle(context: CanvasRenderingContext2D, particle: LoginGuideParticle, progress: number): void {
  var localTime = Math.max(0, Math.min(1, (progress - particle.delay) / (1 - particle.delay)));
  var eased = 1 - Math.pow(1 - localTime, 3);
  var wobble = Math.sin(localTime * Math.PI * 2 + particle.spin) * (1 - localTime) * 18;
  var x = particle.sx + (particle.tx - particle.sx) * eased + Math.cos(particle.spin) * wobble;
  var y = particle.sy + (particle.ty - particle.sy) * eased + Math.sin(particle.spin) * wobble * 0.6;
  var alpha = Math.sin(Math.PI * localTime) * (0.18 + particle.hue * 0.18);
  if (alpha <= 0) return;
  context.beginPath();
  context.arc(x, y, particle.radius * (0.75 + localTime * 0.45), 0, Math.PI * 2);
  context.fillStyle = 'rgba(255,255,255,' + alpha + ')';
  context.fill();
  if (localTime <= 0.08 || localTime >= 0.92) return;
  var trailEase = Math.max(0, eased - 0.045);
  context.strokeStyle = 'rgba(255,255,255,' + (alpha * 0.20) + ')';
  context.lineWidth = 1;
  context.beginPath();
  context.moveTo(particle.sx + (particle.tx - particle.sx) * trailEase, particle.sy + (particle.ty - particle.sy) * trailEase);
  context.lineTo(x, y);
  context.stroke();
}

function finishLoginGuideParticles(canvas: HTMLCanvasElement, context: CanvasRenderingContext2D, width: number, height: number, done?: () => void): void {
  function finish(): void {
    context.clearRect(0, 0, width, height);
    document.body.classList.remove('login-guide-active');
    loginGuideAnimating = false;
    loginGuideRaf = null;
    if (done) done();
  }
  if (!window.gsap) {
    finish();
    return;
  }
  window.gsap.to(canvas, { opacity: 0, duration: 0.28, ease: 'power2.out', onComplete: function(): void {
    finish();
    window.gsap?.set(canvas, { clearProps: 'opacity' });
  }});
}

function maybeRunStartupLoginGuide(source: string): void {
  if (startupLoginGuideShown || loginGuideAnimating) return;
  if (source !== 'manual') {
    try { if (localStorage.getItem(LOGIN_GUIDE_SEEN_STORE_KEY) === '1') return; } catch (error) {}
  }
  if (visualGuideActive || document.body.classList.contains('splash-active') || immersiveMode) return;
  if (!loginStatusChecked || loginStatusCheckFailed || loginStatus.loggedIn || playing) return;
  if (elementHasClass('login-modal', 'show') || elementHasClass('user-modal', 'show')) return;
  startupLoginGuideShown = true;
  if (source !== 'manual') {
    try { localStorage.setItem(LOGIN_GUIDE_SEEN_STORE_KEY, '1'); } catch (error) {}
  }
  setTimeout(function(): void {
    if (loginStatus.loggedIn || playing || immersiveMode || document.body.classList.contains('splash-active')) return;
    runLoginGuideParticles(function(): void {
      showLoginModal({ guided: true, source: source || 'startup' });
    });
  }, source === 'splash' ? 6200 : 2600);
}
