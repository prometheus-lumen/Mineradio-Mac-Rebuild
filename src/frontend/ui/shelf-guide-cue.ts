function drawShelfGuideCue(context: CanvasRenderingContext2D, time: number, strength: number): void {
  var opacity = Math.max(0, Math.min(1, strength == null ? shelfHoverCue.value : strength));
  if (opacity <= 0.01) return;
  var rect = shelfCueRect();
  var center = shelfCueCenter();
  var pulse = 0.5 + 0.5 * Math.sin(time * 1.55);
  var floatY = Math.sin(time * 0.92) * 8 * opacity;
  context.save();
  context.globalCompositeOperation = 'lighter';
  var glow = context.createLinearGradient(rect.left, 0, rect.right, 0);
  glow.addColorStop(0, 'rgba(255,255,255,0)');
  glow.addColorStop(0.58, 'rgba(255,255,255,' + (0.010 * opacity).toFixed(3) + ')');
  glow.addColorStop(0.82, 'rgba(244,210,138,' + (0.024 * opacity + pulse * 0.012 * opacity).toFixed(3) + ')');
  glow.addColorStop(1, 'rgba(255,255,255,' + (0.035 * opacity).toFixed(3) + ')');
  context.fillStyle = glow;
  context.fillRect(rect.left, rect.top - 26, rect.width + 18, rect.height + 52);

  var haloX = center.x + rect.width * 0.18;
  var haloY = center.y + floatY;
  var halo = context.createRadialGradient(haloX, haloY, 0, haloX, haloY, rect.width * 0.62);
  halo.addColorStop(0, 'rgba(244,210,138,' + (0.070 * opacity + pulse * 0.026 * opacity).toFixed(3) + ')');
  halo.addColorStop(0.45, 'rgba(255,255,255,' + (0.020 * opacity).toFixed(3) + ')');
  halo.addColorStop(1, 'rgba(255,255,255,0)');
  context.fillStyle = halo;
  context.fillRect(rect.left, rect.top - 40, rect.width, rect.height + 80);

  for (var index = 0; index < 10; index++) {
    var seed = index * 19.17;
    var phase = (time * (0.10 + (index % 4) * 0.014) + index * 0.113) % 1;
    var x = rect.left + rect.width * (0.45 + (index % 4) * 0.13) + Math.sin(time * 0.44 + seed) * 12;
    var y = rect.top + rect.height * (0.18 + ((index * 0.137 + Math.sin(seed)) % 0.64)) + floatY * (0.42 + (index % 3) * 0.10);
    var alpha = (0.035 + Math.sin(Math.PI * phase) * 0.050) * opacity;
    if (alpha <= 0) continue;
    context.beginPath();
    context.arc(x, y, 0.9 + (index % 3) * 0.26 + pulse * 0.18, 0, Math.PI * 2);
    context.fillStyle = 'rgba(244,210,138,' + alpha.toFixed(3) + ')';
    context.fill();
  }
  context.restore();
}
