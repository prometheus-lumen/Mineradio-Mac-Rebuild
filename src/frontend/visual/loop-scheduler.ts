function scheduleAnimationLoop(): void {
  if (animationFramePending || animationLoopTimer) return;
  if (isDeepBackgroundMode()) {
    animationLoopTimer = window.setTimeout(function() {
      animationLoopTimer = 0;
      animate();
    }, 1000);
    return;
  }
  if (typeof requestAnimationFrame === 'function') {
    animationFramePending = true;
    requestAnimationFrame(function() {
      animationFramePending = false;
      animate();
    });
    return;
  }
  animationLoopTimer = window.setTimeout(function() {
    animationLoopTimer = 0;
    animate();
  }, 16);
}

function wakeAnimationLoop(): void {
  if (animationLoopTimer) {
    clearTimeout(animationLoopTimer);
    animationLoopTimer = 0;
  }
  scheduleAnimationLoop();
}
