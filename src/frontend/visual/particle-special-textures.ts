function makeLaserDotTexture(): THREE.CanvasTexture {
  var cv = document.createElement('canvas'); cv.width = cv.height = 64;
  var ctx = cv.getContext('2d');
  if (!ctx) throw new Error('2D canvas is unavailable');
  var g = ctx.createRadialGradient(32, 32, 0, 32, 32, 31);
  g.addColorStop(0.00, 'rgba(255,255,255,1)');
  g.addColorStop(0.38, 'rgba(255,255,255,0.96)');
  g.addColorStop(0.58, 'rgba(255,255,255,0.42)');
  g.addColorStop(0.78, 'rgba(255,255,255,0.08)');
  g.addColorStop(1.00, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 64, 64);
  var tex = new THREE.CanvasTexture(cv);
  tex.minFilter = THREE.LinearFilter; tex.magFilter = THREE.LinearFilter;
  return tex;
}

function makeParticleClockTexture(): ParticleClockTexture {
  var cv = document.createElement('canvas');
  cv.width = 1024;
  cv.height = 256;
  var tex = new THREE.CanvasTexture(cv) as ParticleClockTexture;
  tex.minFilter = THREE.LinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.generateMipmaps = false;
  tex.wrapS = THREE.ClampToEdgeWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.userData = { canvas: cv, lastText: '', lastSecond: -1 };
  updateParticleClockTexture(tex, true);
  return tex;
}

function particleClockPad(n: number): string {
  n = Math.floor(Number(n) || 0);
  return n < 10 ? '0' + n : String(n);
}

function updateParticleClockTexture(tex: ParticleClockTexture, force = false): void {
  if (!tex || !tex.userData || !tex.userData.canvas) return;
  var second = Math.floor(Date.now() / 1000);
  if (!force && tex.userData.lastSecond === second) return;
  tex.userData.lastSecond = second;
  var now = new Date(second * 1000);
  var text = particleClockPad(now.getHours()) + ':' + particleClockPad(now.getMinutes()) + ':' + particleClockPad(now.getSeconds());
  if (!force && tex.userData.lastText === text) return;
  tex.userData.lastText = text;
  var cv = tex.userData.canvas;
  var ctx = cv.getContext('2d');
  if (!ctx) return;
  var W = cv.width, H = cv.height;
  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, W, H);
  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = '900 168px "JetBrains Mono","SF Mono","Menlo","Consolas",monospace';
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.shadowColor = 'rgba(220,245,255,0.78)';
  ctx.shadowBlur = 28;
  ctx.strokeStyle = 'rgba(255,255,255,0.66)';
  ctx.lineWidth = 7;
  ctx.strokeText(text, W / 2, H / 2 + 2);
  ctx.shadowBlur = 0;
  ctx.fillStyle = '#fff';
  ctx.fillText(text, W / 2, H / 2 + 2);
  ctx.restore();
  tex.needsUpdate = true;
}
