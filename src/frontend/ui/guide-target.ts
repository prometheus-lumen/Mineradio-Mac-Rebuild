function idleRoundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
  if (ctx.roundRect) {
    ctx.roundRect(x, y, w, h, r);
    return;
  }
  r = Math.min(r || 0, Math.abs(w) * 0.5, Math.abs(h) * 0.5);
  var x2 = x + w, y2 = y + h;
  ctx.moveTo(x + r, y);
  ctx.lineTo(x2 - r, y);
  ctx.quadraticCurveTo(x2, y, x2, y + r);
  ctx.lineTo(x2, y2 - r);
  ctx.quadraticCurveTo(x2, y2, x2 - r, y2);
  ctx.lineTo(x + r, y2);
  ctx.quadraticCurveTo(x, y2, x, y2 - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
}

function guideTargetRect(step: VisualGuideStep | null): ShelfCueRect | DOMRect {
  if (step && step.target === 'stage') {
    var stageW = Math.min(620, Math.max(260, innerWidth - 72));
    var stageH = Math.min(310, Math.max(178, innerHeight * 0.34));
    var stageLeft = innerWidth * 0.5 - stageW * 0.5;
    var stageTop = Math.max(116, innerHeight * 0.32 - stageH * 0.5);
    return { left: stageLeft, top: stageTop, width: stageW, height: stageH, right: stageLeft + stageW, bottom: stageTop + stageH };
  }
  if (step && step.target === 'shelf' && typeof shelfCueRect === 'function') {
    var shelfRect = shelfCueRect();
    var shelfLeft = shelfRect.left;
    var shelfTop = shelfRect.top - 26;
    var shelfRight = Math.min(innerWidth - 12, shelfRect.right + 18);
    var shelfBottom = shelfRect.bottom + 26;
    return { left: shelfLeft, top: shelfTop, width: shelfRight - shelfLeft, height: shelfBottom - shelfTop, right: shelfRight, bottom: shelfBottom };
  }
  if (step && step.selector === '#bottom-bar') {
    var bar = document.getElementById('bottom-bar');
    var progress = document.getElementById('progress-bar');
    var controls = document.getElementById('controls');
    if (bar) {
      var br = bar.getBoundingClientRect();
      var left = br.left, top = br.top, right = br.right, bottom = br.bottom;
      [progress, controls].forEach(function(el){
        if (!el) return;
        var r = el.getBoundingClientRect();
        if (r.width <= 0 || r.height <= 0) return;
        left = Math.min(left, r.left);
        top = Math.min(top, r.top);
        right = Math.max(right, r.right);
        bottom = Math.max(bottom, r.bottom);
      });
      return { left: left, top: top, width: right - left, height: bottom - top, right: right, bottom: bottom };
    }
  }
  var isFullscreenDiyStep = !!(step && step.selector === '#diy-mode-btn' && (desktopRuntimeState.fullscreen || desktopFullscreenActive || document.fullscreenElement || document.body.classList.contains('desktop-fullscreen')));
  var useFullscreenDiyTarget = isFullscreenDiyStep && !shouldSuppressFullscreenDiyPeek();
  if (useFullscreenDiyTarget) {
    layoutFullscreenDiyZone();
    document.body.classList.add('fullscreen-diy-peek');
  }
  var target = step && step.selector ? document.querySelector(useFullscreenDiyTarget ? '#fullscreen-diy-btn' : step.selector) : null;
  if (target) {
    var style = window.getComputedStyle(target);
    var rect = target.getBoundingClientRect();
    if (rect.width > 0 && rect.height > 0 && style.display !== 'none' && style.visibility !== 'hidden') return rect;
  }
  if (step && step.selector === '#diy-mode-btn') {
    var fallbackRight = Math.max(116, innerWidth - 26);
    var fallbackTop = 16;
    return { left: fallbackRight - 88, top: fallbackTop, width: 88, height: 38, right: fallbackRight, bottom: fallbackTop + 38 };
  }
  return { left: innerWidth * 0.5 - 120, top: innerHeight * 0.5 - 40, width: 240, height: 80, right: innerWidth * 0.5 + 120, bottom: innerHeight * 0.5 + 40 };
}
