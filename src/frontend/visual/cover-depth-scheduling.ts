function queueAIDepthForCover(
  sourceCanvas: HTMLCanvasElement,
  edgeCanvas: HTMLCanvasElement,
  token: number,
  options: CoverLoadOptions = {},
  cacheSeed = '',
  force = false
): void {
  if (!fx.aiDepth || !sourceCanvas || !edgeCanvas) return;
  if (!force && isHiddenForBackgroundOptimization()) return;
  if (performance.now() < aiDepthFailUntil || aiDepthBusy) return;
  const now = performance.now();
  if (!force && now - aiDepthLastRunAt < aiDepthMinGapMs) return;
  aiDepthLastRunAt = now;
  scheduleVisualApply(async () => {
    if (!fx.aiDepth || token !== coverProcessToken || !coverApplyStillCurrent(options)) return;
    await yieldToIdle(force ? 900 : 2600);
    if (!fx.aiDepth || token !== coverProcessToken || !coverApplyStillCurrent(options)) return;
    const aiCanvas = await estimateAIDepth(sourceCanvas, token);
    if (!aiCanvas || token !== coverProcessToken || !coverApplyStillCurrent(options)) return;
    mergeAIDepthIntoEdgeTexture(edgeCanvas, aiCanvas);
    coverEdgeTex.image = edgeCanvas;
    coverEdgeTex.needsUpdate = true;
    setCoverDepthState(1, 1, 360);
    setCoverDepthCache(cacheSeed, edgeCanvas, true);
    showToast('AI 深度已后台增强');
  }, force ? 240 : 1800, force ? 1200 : 3000);
}

function queueAIDepthForCurrentCover(force = false): void {
  const sourceImage = coverTex?.image;
  const edgeImage = coverEdgeTex?.image;
  if (!(sourceImage instanceof HTMLCanvasElement) || !(edgeImage instanceof HTMLCanvasElement)) return;
  if (!uniforms.uHasCover.value || !uniforms.uHasDepth.value) return;
  queueAIDepthForCover(sourceImage, edgeImage, coverProcessToken, {}, '', force);
}
