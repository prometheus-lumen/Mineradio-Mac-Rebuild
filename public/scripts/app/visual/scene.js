'use strict';

// Mineradio classic module: visual/scene.
// stub: 兼容旧调用


// ============================================================
//  Resize / 快捷键
// ============================================================
function refreshMainRendererViewport(reason) {
  if (typeof camera !== 'undefined' && camera) {
    camera.aspect = Math.max(1, innerWidth) / Math.max(1, innerHeight);
    camera.updateProjectionMatrix();
  }
  applyRendererPowerMode();
  if (typeof requestStageLyricCameraSnap === 'function' && (desktopRuntimeState.fullscreen || document.fullscreenElement)) {
    requestStageLyricCameraSnap(reason === 'resize' ? 4 : 10);
  }
}

function scheduleMainRendererViewportRefresh(reason) {
  refreshMainRendererViewport(reason || 'sync');
  [48, 140, 320].forEach(function(delay){
    setTimeout(function(){ refreshMainRendererViewport(reason || 'sync'); }, delay);
  });
}

function __mineradioInitVisualScene26() {
  // ============================================================
  //  Three.js 场景
  // ============================================================
  scene = new THREE.Scene();

  scene.background = null;

  camera = new THREE.PerspectiveCamera(45, innerWidth / innerHeight, 0.1, 100);

  RENDER_DPR_CAP = 1.35;

  RENDER_PIXEL_BUDGET = 5200000;

  RENDER_MIN_DPR = 0.72;

  // 0 = display vsync. Keep visible playback high-refresh capable instead of capping 120Hz+ screens to 60/72.
  RENDER_VISIBLE_VSYNC = false;

  RENDER_ACTIVE_FPS = 60;

  RENDER_LARGE_FPS = 48;

  RENDER_HUGE_FPS = 36;

  RENDER_INTERACTION_FPS = 72;

  RENDER_INTERACTION_LARGE_FPS = 60;

  RENDER_INTERACTION_HUGE_FPS = 48;

  RENDER_INTERACTION_HOLD_MS = 900;

  renderInteractionBoostUntil = 0;

  renderInteractionReason = '';

  renderer = new THREE.WebGLRenderer({ antialias: false, alpha: true, powerPreference: 'high-performance' });

  renderer.setClearColor(0x000000, 0);

  renderer.setPixelRatio(getRenderPixelRatio());

  renderer.setSize(innerWidth, innerHeight);

  renderer.domElement.style.background = 'transparent';

  renderer.domElement.style.display = 'block';

  renderer.domElement.style.width = '100%';

  renderer.domElement.style.height = '100%';

  renderer.domElement.tabIndex = 0;

  document.getElementById('canvas-container').appendChild(renderer.domElement);
}
