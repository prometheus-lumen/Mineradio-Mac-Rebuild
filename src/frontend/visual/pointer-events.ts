function __mineradioInitVisualPointerControls28(): void {
  // ============================================================
  //  指针 / 拖拽控制
  //   v7.1: 用 userOrbit 替代 targetOrbit; 加 drag 距离判断
  // ============================================================
  mouseWorld = new THREE.Vector3(-999, -999, 0);

  mouseActive = false;

  mouseDownAt = { x:0, y:0, t:0, hadDrag:false };

  particlePointerSpin = { active:false, lastX:0, lastY:0, lastT:0 };

  particlePointerRay = new THREE.Raycaster();

  particlePointerNdc = new THREE.Vector2();

  particlePointerPlane = new THREE.Plane();

  particlePointerPlanePoint = new THREE.Vector3();

  particlePointerPlaneNormal = new THREE.Vector3();

  particlePointerWorldHit = new THREE.Vector3();

  particlePointerLocalHit = new THREE.Vector3();

  particlePointerQuat = new THREE.Quaternion();

  particlePointerFrame = { dirty:false, ndcX:0, ndcY:0 };

  CLICK_THRESHOLD = 6;

  // 像素, 拖动 > 6px 视为 drag
  UI_HIT_SELECTOR = '#search-area,#top-right,#fullscreen-diy-zone,#fx-panel,#fx-fab,#fx-fab-hide-btn,#playlist-panel,#bottom-bar,#thumb-wrap,#empty-home,#visual-guide,#trial-banner,#source-fallback-notice,.modal-mask,#toast,#ai-depth-chip,#beat-chip,#drop-overlay';

  renderer.domElement.addEventListener('mousedown', function(e){
    beginParticlePointerDrag(e);
  });

  window.addEventListener('mousedown', function(e){
    if (!(fx && fx.preset === SKULL_PRESET_INDEX)) return;
    if (orbit.rotating || e.target === renderer.domElement) return;
    beginParticlePointerDrag(e);
  }, true);

  window.addEventListener('mousemove', function(e){
    updateControlsAutoHideFromPointer(e.clientX, e.clientY);
    idleGuidePointerMove(e);
    if (freeCamera && freeCamera.active) {
      markRenderInteraction('free-camera', 900);
      var mdx = e.movementX || 0;
      var mdy = e.movementY || 0;
      if ((!mdx && !mdy) && freeCameraPointer.seen) {
        mdx = e.clientX - freeCameraPointer.x;
        mdy = e.clientY - freeCameraPointer.y;
      }
      freeCameraPointer.x = e.clientX;
      freeCameraPointer.y = e.clientY;
      freeCameraPointer.seen = true;
      freeCamera.yaw -= mdx * 0.00125;
      freeCamera.pitch = clampRange(freeCamera.pitch - mdy * 0.00125, -Math.PI * 0.49, Math.PI * 0.49);
      return;
    }
    if (isPointerOverUi(e) && !orbit.rotating) { mouseActive = false; return; }
    if (orbit.rotating) {
      markRenderInteraction('canvas-drag', 900);
      unlockCenteredView();
      var dx = e.clientX - orbit.last.x, dy = e.clientY - orbit.last.y;
      if (particlePointerSpin.active) {
        var nowSpin = performance.now();
        var spinDt = Math.max(1 / 120, Math.min(0.08, (nowSpin - particlePointerSpin.lastT) / 1000 || 1 / 60));
        applyParticleSpinDrag(dx, dy, spinDt);
        particlePointerSpin.lastX = e.clientX;
        particlePointerSpin.lastY = e.clientY;
        particlePointerSpin.lastT = nowSpin;
      }
      orbit.last.x = e.clientX; orbit.last.y = e.clientY;
      // drag 距离判断
      var totalDx = e.clientX - mouseDownAt.x, totalDy = e.clientY - mouseDownAt.y;
      if (Math.sqrt(totalDx*totalDx + totalDy*totalDy) > CLICK_THRESHOLD) mouseDownAt.hadDrag = true;
      if (orbit.recentering) orbit.recentering = false;
    }
    queueParticlePointerFrame(e.clientX, e.clientY);
  });

  window.addEventListener('mouseup', function(){
    orbit.rotating = false;
    particlePointerSpin.active = false;
    idleGuidePointerUp();
  });

  renderer.domElement.addEventListener('mouseleave', function(){
    particlePointerFrame.dirty = false;
    mouseWorld.set(-999, -999, 0);
    mouseActive = false;
    idleGuidePointerLeave();
  });

  renderer.domElement.addEventListener('wheel', function(e){
    if (isPointerOverUi(e)) return;
    e.preventDefault();
    markRenderInteraction('canvas-wheel', 900);
    if (freeCamera && freeCamera.active) {
      freeCamera.fov = clampRange((freeCamera.fov || BASE_FOV) + e.deltaY * 0.018, 26, 72);
      saveFreeCameraState();
      return;
    }
    if (fx && fx.preset === SKULL_PRESET_INDEX && typeof skullWheelZoomTarget !== 'undefined') {
      skullWheelZoomTarget = clampRange(skullWheelZoomTarget + e.deltaY * 0.00155, -0.95, 1.28);
      return;
    }
    idleGuideWheel(e);
    unlockCenteredView();
    orbit.userRadius = Math.max(orbit.minRadius, Math.min(orbit.maxRadius, orbit.userRadius + e.deltaY * 0.005));
    if (orbit.recentering) orbit.recentering = false;
  }, { passive:false });

  // 双击屏幕回正 — 不命中卡片时
  renderer.domElement.addEventListener('dblclick', function(e){
    if (isPointerOverUi(e)) return;
    if (freeCamera && freeCamera.locked) {
      resetFreeCameraToDefault();
      resetSkullPresetView(false, { smooth:true, keepLyricLock:true });
      return;
    }
    if (shelfManager?.getMode && shelfManager.getMode() !== 'off') {
      var mx = (e.clientX / innerWidth) * 2 - 1;
      var my = -(e.clientY / innerHeight) * 2 + 1;
      var rc = new THREE.Raycaster();
      rc.setFromCamera(new THREE.Vector2(mx, my), camera);
      if (shelfManager.raycastCards?.(rc)) return;
    }
    recenterCamera();
  });

  dotTexture = makeDotTexture();

  laserDotTexture = makeLaserDotTexture();

  particleClockTex = makeParticleClockTexture();
}
