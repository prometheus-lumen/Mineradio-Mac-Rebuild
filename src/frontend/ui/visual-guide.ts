function activeVisualGuideSteps(): VisualGuideStep[] {
  return diyPlayerMode ? visualGuideStepsDiy : visualGuideSteps;
}

function visualGuideWasSeen(): boolean {
  try {
    return localStorage.getItem(VISUAL_GUIDE_SEEN_STORE_KEY) === '1';
  } catch (error) {
    return true;
  }
}

function markVisualGuideSeen(): void {
  try {
    localStorage.setItem(VISUAL_GUIDE_SEEN_STORE_KEY, '1');
  } catch (error) {}
}

function maybeRunStartupVisualGuide(source: string): boolean {
  if (visualGuideWasSeen() || visualGuideActive || immersiveMode || playing) return false;
  if (source !== 'manual' && !hasAnyPlatformLogin()) return false;
  if (source !== 'manual') markVisualGuideSeen();
  setTimeout(function(): void {
    if (!visualGuideWasSeen() || source === 'manual') {
      startVisualGuide({ source: source || 'startup' });
    }
  }, source === 'splash' ? 3600 : 1400);
  return true;
}

function startVisualGuide(options: VisualGuideOptions = {}): void {
  if (document.body.classList.contains('splash-active')) {
    setTimeout(function(): void { startVisualGuide(options); }, 700);
    return;
  }
  if (immersiveMode) setImmersiveMode(false);
  closeMiniQueue();
  closeUploadTip(false);
  visualGuideActive = true;
  document.body.classList.add('visual-guide-active');
  visualGuideStep = 0;
  visualGuideState = {
    bottomWasVisible: elementHasClass('bottom-bar', 'visible'),
    searchWasPeek: elementHasClass('search-area', 'peek'),
    fxWasPeek: elementHasClass('fx-panel', 'peek'),
    plWasPeek: elementHasClass('playlist-panel', 'peek'),
    mode: diyPlayerMode ? 'diy' : 'simple',
    manual: !!options.manual
  };
  var guide = document.getElementById('visual-guide');
  if (guide) {
    guide.classList.add('show');
    guide.setAttribute('aria-hidden', 'false');
  }
  if (!visualGuideResizeBound) {
    visualGuideResizeBound = true;
    window.addEventListener('resize', positionVisualGuideStep);
    window.addEventListener('scroll', positionVisualGuideStep, true);
  }
  showVisualGuideStep(0);
}

function elementHasClass(id: string, className: string): boolean {
  var element = document.getElementById(id);
  return !!element && element.classList.contains(className);
}

function prepareVisualGuideStep(step: VisualGuideStep): void {
  var search = document.getElementById('search-area');
  var bottom = document.getElementById('bottom-bar');
  var fxPanel = document.getElementById('fx-panel');
  var playlistPanel = document.getElementById('playlist-panel');
  setShelfGuideCueActive(step.target === 'shelf');
  if (step.selector === '#search-box') setPeek(search, true, 'search');
  if (step.selector === '#playlist-panel') setPeek(playlistPanel, true, 'pl');
  else if (playlistPanel && !visualGuideState.plWasPeek) setPeek(playlistPanel, false, 'pl');
  if (step.selector === '#fx-panel') setPeek(fxPanel, true, 'fx');
  else if (fxPanel && !visualGuideState.fxWasPeek) setPeek(fxPanel, false, 'fx');
  if (step.selector && VISUAL_GUIDE_BOTTOM_TARGETS.has(step.selector)) {
    if (bottom) bottom.classList.add('visible');
    revealBottomControls(1500);
  }
}

var VISUAL_GUIDE_BOTTOM_TARGETS = new Set([
  '#bottom-bar', '#mini-queue-btn', '#immersive-btn', '#quality-control'
]);

function scheduleVisualGuidePositioning(): void {
  requestAnimationFrame(positionVisualGuideStep);
  setTimeout(positionVisualGuideStep, 180);
  setTimeout(positionVisualGuideStep, 620);
}

function showVisualGuideStep(index: number): void {
  var steps = activeVisualGuideSteps();
  visualGuideStep = Math.max(0, Math.min(steps.length - 1, index));
  var step = steps[visualGuideStep];
  if (!step) return;
  prepareVisualGuideStep(step);
  setGuideText('visual-guide-title', step.title);
  setGuideText('visual-guide-body', step.body);
  setGuideText('visual-guide-kicker', step.kicker);
  setGuideText('visual-guide-hint', visualGuideStep === steps.length - 1 ? '点击空白处完成引导' : '点击空白处也可以继续');
  setGuideText('visual-guide-progress', (visualGuideStep + 1) + ' / ' + steps.length);
  setGuideText('visual-guide-next', visualGuideStep === steps.length - 1 ? '完成' : '下一步');
  scheduleVisualGuidePositioning();
}

function setGuideText(id: string, text: string): void {
  var element = document.getElementById(id);
  if (element) element.textContent = text;
}

function positionVisualGuideStep(): void {
  if (!visualGuideActive) return;
  var guide = document.getElementById('visual-guide');
  var ring = document.getElementById('visual-guide-ring');
  var card = document.getElementById('visual-guide-card');
  var step = activeVisualGuideSteps()[visualGuideStep];
  if (!guide || !ring || !card || !step) return;
  var rect = guideTargetRect(step);
  ring.classList.toggle('shelf-target', step.target === 'shelf');
  var pad = step.target === 'shelf' ? 14 : (step.selector === '#bottom-bar' ? 10 : 8);
  var left = Math.max(12, rect.left - pad);
  var top = Math.max(12, rect.top - pad);
  ring.style.left = left + 'px';
  ring.style.top = top + 'px';
  ring.style.width = Math.max(44, Math.min(innerWidth - left - 12, rect.width + pad * 2)) + 'px';
  ring.style.height = Math.max(38, Math.min(innerHeight - top - 12, rect.height + pad * 2)) + 'px';
  ring.style.borderRadius = step.target === 'shelf' ? '28px' : (step.selector === '#bottom-bar' ? '20px' : '16px');
  var scrim = guide.querySelector<HTMLElement>('.visual-guide-scrim');
  if (scrim) {
    scrim.style.setProperty('--gx', ((rect.left + rect.width / 2) / Math.max(1, innerWidth) * 100).toFixed(2) + '%');
    scrim.style.setProperty('--gy', ((rect.top + rect.height / 2) / Math.max(1, innerHeight) * 100).toFixed(2) + '%');
  }
  var cardWidth = Math.min(326, innerWidth - 32);
  var cardHeight = card.offsetHeight || 170;
  var cardLeft = Math.max(16, Math.min(innerWidth - cardWidth - 16, rect.left + rect.width / 2 - cardWidth / 2));
  var below = rect.bottom + 18;
  card.style.left = cardLeft + 'px';
  card.style.top = (below + cardHeight < innerHeight - 16 ? below : Math.max(16, rect.top - cardHeight - 18)) + 'px';
}

function nextVisualGuideStep(): void {
  if (visualGuideStep >= activeVisualGuideSteps().length - 1) closeVisualGuide(true);
  else showVisualGuideStep(visualGuideStep + 1);
}

function closeVisualGuide(markSeen: boolean): void {
  var guide = document.getElementById('visual-guide');
  visualGuideActive = false;
  if (markSeen) markVisualGuideSeen();
  if (guide) {
    guide.classList.remove('show');
    guide.setAttribute('aria-hidden', 'true');
  }
  document.body.classList.remove('visual-guide-active', 'fullscreen-diy-peek');
  var search = document.getElementById('search-area');
  var bottom = document.getElementById('bottom-bar');
  var fxPanel = document.getElementById('fx-panel');
  var playlistPanel = document.getElementById('playlist-panel');
  setShelfGuideCueActive(false);
  if (search && !visualGuideState.searchWasPeek && document.activeElement !== $input) setPeek(search, false, 'search');
  if (fxPanel && !visualGuideState.fxWasPeek) setPeek(fxPanel, false, 'fx');
  if (playlistPanel && !visualGuideState.plWasPeek) setPeek(playlistPanel, false, 'pl');
  if (bottom && !visualGuideState.bottomWasVisible && !playing) bottom.classList.remove('visible', 'soft-hidden');
}
