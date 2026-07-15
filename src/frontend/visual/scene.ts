// Mineradio classic module: visual/scene.
// stub: 兼容旧调用


// ============================================================
//  Resize / 快捷键
// ============================================================
var RENDER_DPR_CAP: number;
var RENDER_PIXEL_BUDGET: number;
var RENDER_MIN_DPR: number;
var RENDER_VISIBLE_VSYNC: boolean;
var RENDER_ACTIVE_FPS: number;
var RENDER_LARGE_FPS: number;
var RENDER_HUGE_FPS: number;
var RENDER_INTERACTION_FPS: number;
var RENDER_INTERACTION_LARGE_FPS: number;
var RENDER_INTERACTION_HUGE_FPS: number;
var RENDER_INTERACTION_HOLD_MS: number;

function refreshMainRendererViewport(reason: string): void {
  if (typeof camera !== 'undefined' && camera) {
    camera.aspect = Math.max(1, innerWidth) / Math.max(1, innerHeight);
    camera.updateProjectionMatrix();
  }
  applyRendererPowerMode();
  if (typeof requestStageLyricCameraSnap === 'function' && (desktopRuntimeState.fullscreen || document.fullscreenElement)) {
    requestStageLyricCameraSnap(reason === 'resize' ? 4 : 10);
  }
}

function scheduleMainRendererViewportRefresh(reason = 'sync'): void {
  refreshMainRendererViewport(reason || 'sync');
  [48, 140, 320].forEach(function(delay){
    setTimeout(function(){ refreshMainRendererViewport(reason || 'sync'); }, delay);
  });
}

function __mineradioInitVisualScene26(): void {
  // ============================================================
  //  Three.js 场景
  // ============================================================
  scene = new THREE.Scene();

  scene.background = null;

  camera = new THREE.PerspectiveCamera(45, innerWidth / innerHeight, 0.1, 100);

  RENDER_DPR_CAP = 1.20;

  RENDER_PIXEL_BUDGET = 4200000;

  RENDER_MIN_DPR = 0.68;

  // false = use adaptive frame caps instead of following high-refresh displays.
  RENDER_VISIBLE_VSYNC = false;

  RENDER_ACTIVE_FPS = 40;

  RENDER_LARGE_FPS = 34;

  RENDER_HUGE_FPS = 28;

  RENDER_INTERACTION_FPS = 48;

  RENDER_INTERACTION_LARGE_FPS = 42;

  RENDER_INTERACTION_HUGE_FPS = 36;

  RENDER_INTERACTION_HOLD_MS = 450;

  renderInteractionBoostUntil = 0;

  renderInteractionReason = '';

  renderer = new THREE.WebGLRenderer({ antialias: false, alpha: true, powerPreference: 'low-power' });

  renderer.setClearColor(0x000000, 0);

  renderer.setPixelRatio(getRenderPixelRatio());

  renderer.setSize(innerWidth, innerHeight);

  renderer.domElement.style.background = 'transparent';

  renderer.domElement.style.display = 'block';

  renderer.domElement.style.width = '100%';

  renderer.domElement.style.height = '100%';

  renderer.domElement.tabIndex = 0;

  var canvasContainer = document.getElementById('canvas-container');
  if (!canvasContainer) throw new Error('Missing #canvas-container');
  canvasContainer.appendChild(renderer.domElement);
}
