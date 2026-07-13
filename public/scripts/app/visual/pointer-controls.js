'use strict';

// Mineradio classic module: visual/pointer-controls.
function isPointerOverUi(e) {
  if (!e) return false;
  var el = document.elementFromPoint(e.clientX, e.clientY);
  return !!(el && el.closest && el.closest(UI_HIT_SELECTOR));
}

function particleLocalPointFromNdc(ndcX, ndcY, out) {
  particlePointerNdc.set(ndcX, ndcY);
  particlePointerRay.setFromCamera(particlePointerNdc, camera);
  if (particles) {
    particles.updateMatrixWorld(true);
    particles.getWorldPosition(particlePointerPlanePoint);
    particles.getWorldQuaternion(particlePointerQuat);
    particlePointerPlaneNormal.set(0, 0, 1).applyQuaternion(particlePointerQuat).normalize();
    if (Math.abs(particlePointerPlaneNormal.dot(particlePointerRay.ray.direction)) < 0.16) return false;
    particlePointerPlane.setFromNormalAndCoplanarPoint(particlePointerPlaneNormal, particlePointerPlanePoint);
    if (particlePointerRay.ray.intersectPlane(particlePointerPlane, particlePointerWorldHit)) {
      out.copy(particlePointerWorldHit);
      particles.worldToLocal(out);
      return isFinite(out.x) && isFinite(out.y) && Math.abs(out.x) < 8.5 && Math.abs(out.y) < 8.5;
    }
  }
  particlePointerPlaneNormal.set(0, 0, 1);
  particlePointerPlane.set(particlePointerPlaneNormal, 0);
  if (particlePointerRay.ray.intersectPlane(particlePointerPlane, particlePointerWorldHit)) {
    out.copy(particlePointerWorldHit);
    return isFinite(out.x) && isFinite(out.y) && Math.abs(out.x) < 8.5 && Math.abs(out.y) < 8.5;
  }
  return false;
}

function queueParticlePointerFrame(clientX, clientY) {
  var mx = (clientX / innerWidth) * 2 - 1;
  var my = -(clientY / innerHeight) * 2 + 1;
  pointerTarget.x = mx; pointerTarget.y = my;
  particlePointerFrame.ndcX = mx;
  particlePointerFrame.ndcY = my;
  particlePointerFrame.dirty = true;
}

function updateParticlePointerFrame() {
  if (!particlePointerFrame.dirty) return;
  particlePointerFrame.dirty = false;
  if (particleLocalPointFromNdc(particlePointerFrame.ndcX, particlePointerFrame.ndcY, particlePointerLocalHit)) {
    mouseWorld.x = particlePointerLocalHit.x;
    mouseWorld.y = particlePointerLocalHit.y;
    mouseActive = true;
  } else {
    mouseWorld.set(-999, -999, 0);
    mouseActive = false;
  }
}

function beginParticlePointerDrag(e) {
  if (e.button === 2) return;
  if (isPointerOverUi(e)) return;
  markRenderInteraction('canvas-drag', 1200);
  idleGuidePointerDown(e);
  orbit.rotating = true; orbit.last.x = e.clientX; orbit.last.y = e.clientY;
  particlePointerSpin.active = true;
  particlePointerSpin.lastX = e.clientX;
  particlePointerSpin.lastY = e.clientY;
  particlePointerSpin.lastT = performance.now();
  if (typeof particleSpin !== 'undefined') particleSpin.vx = particleSpin.vy = 0;
  mouseDownAt.x = e.clientX; mouseDownAt.y = e.clientY;
  mouseDownAt.t = performance.now(); mouseDownAt.hadDrag = false;
}

function bindSmoothWheelScroll(scroller) {
  if (!scroller || scroller.__smoothWheelBound) return;
  scroller.__smoothWheelBound = true;
  var targetTop = scroller.scrollTop;
  var tween = null;
  scroller.__syncSmoothWheelTarget = function(top){
    if (tween) {
      tween.kill();
      tween = null;
    }
    targetTop = isFinite(top) ? top : scroller.scrollTop;
  };
  scroller.addEventListener('wheel', function(e){
    if (!window.gsap || e.ctrlKey) return;
    var max = Math.max(0, scroller.scrollHeight - scroller.clientHeight);
    if (max <= 0 || Math.abs(e.deltaY) <= Math.abs(e.deltaX)) return;
    var delta = e.deltaY;
    if (e.deltaMode === 1) delta *= 18;
    else if (e.deltaMode === 2) delta *= scroller.clientHeight;
    var current = tween ? targetTop : scroller.scrollTop;
    var next = Math.max(0, Math.min(max, current + delta));
    if (next === current && ((delta < 0 && scroller.scrollTop <= 0) || (delta > 0 && scroller.scrollTop >= max - 1))) {
      targetTop = scroller.scrollTop;
      return;
    }
    e.preventDefault();
    targetTop = next;
    if (tween) tween.kill();
    tween = window.gsap.to(scroller, {
      scrollTop: targetTop,
      duration: 0.24,
      ease: 'power2.out',
      overwrite: true,
      onComplete: function(){
        tween = null;
        targetTop = scroller.scrollTop;
      }
    });
  }, { passive: false });
  scroller.addEventListener('scroll', function(){
    if (!tween) targetTop = scroller.scrollTop;
  }, { passive: true });
}

function emitProgressDragParticles(x, y) {
  var now = performance.now();
  if (now - progressDragState.lastParticleAt < 46) return;
  progressDragState.lastParticleAt = now;
  for (var i = 0; i < 3; i++) {
    var dot = document.createElement('span');
    dot.className = 'progress-drag-particle';
    var dx = (Math.random() - 0.5) * 34;
    var dy = -10 - Math.random() * 28;
    dot.style.setProperty('--px', x + 'px');
    dot.style.setProperty('--py', y + 'px');
    dot.style.setProperty('--dx', dx + 'px');
    dot.style.setProperty('--dy', dy + 'px');
    document.body.appendChild(dot);
    setTimeout((function(el){ return function(){ if (el && el.parentNode) el.parentNode.removeChild(el); }; })(dot), 700);
  }
}

function seekFromProgressPointer(e, emitParticles) {
  var durationSec = getPlaybackDurationSeconds();
  if (!audio || !durationSec) return;
  var bar = document.getElementById('progress-bar');
  var rect = bar.getBoundingClientRect();
  var ratio = clampRange((e.clientX - rect.left) / rect.width, 0, 1);
  audio.currentTime = ratio * durationSec;
  setProgressVisual(ratio * 100);
  syncBeatMapPlaybackCursor(audio.currentTime);
  if (emitParticles) emitProgressDragParticles(e.clientX, rect.top + rect.height / 2);
}

function endProgressDrag(e) {
  if (!progressDragState.active) return;
  progressDragState.active = false;
  progressBar.classList.remove('is-dragging');
  try { progressBar.releasePointerCapture(e.pointerId); } catch (err) {}
}

function clampParticleSpinVelocity(v) {
  if (!isFinite(v)) return 0;
  return Math.max(-PARTICLE_SPIN_MAX, Math.min(PARTICLE_SPIN_MAX, v));
}

function applyParticleSpinDrag(dx, dy, dt) {
  var rx = dy * PARTICLE_POINTER_SPIN_X;
  var ry = dx * PARTICLE_POINTER_SPIN_Y;
  gestureRotation.x += rx;
  gestureRotation.y += ry;
  if (dt > 0) {
    particleSpin.vx = clampParticleSpinVelocity(rx / dt * 0.46);
    particleSpin.vy = clampParticleSpinVelocity(ry / dt * 0.46);
  }
}

function resetParticleRotationTarget(syncVisual) {
  gestureRotation.x = 0;
  gestureRotation.y = 0;
  particleSpin.vx = 0;
  particleSpin.vy = 0;
  if (syncVisual && particles) {
    particles.rotation.set(0, 0, 0);
    if (bloomParticles) bloomParticles.rotation.set(0, 0, 0);
    if (floatGroup) floatGroup.rotation.set(0, 0, 0);
    if (backCoverGroup) backCoverGroup.rotation.set(0, 0, 0);
  }
}

function rebaseParticleRotationAxis(axis) {
  var limit = Math.PI * 10;
  if (Math.abs(gestureRotation[axis]) < limit) return;
  var offset = Math.round(gestureRotation[axis] / (Math.PI * 2)) * Math.PI * 2;
  gestureRotation[axis] -= offset;
  if (particles) particles.rotation[axis] -= offset;
  if (bloomParticles) bloomParticles.rotation[axis] -= offset;
  if (floatGroup) floatGroup.rotation[axis] -= offset;
  if (backCoverGroup) backCoverGroup.rotation[axis] -= offset;
  if (skullParticleGroup) skullParticleGroup.rotation[axis] -= offset;
  if (stageLyrics.group) stageLyrics.group.rotation[axis] -= offset;
}

function rebaseParticleRotationIfNeeded() {
  rebaseParticleRotationAxis('x');
  rebaseParticleRotationAxis('y');
}

function __mineradioInitVisualPointerControls28() {
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
    if (shelfManager && shelfManager.getMode() !== 'off') {
      var mx = (e.clientX / innerWidth) * 2 - 1;
      var my = -(e.clientY / innerHeight) * 2 + 1;
      var rc = new THREE.Raycaster();
      rc.setFromCamera(new THREE.Vector2(mx, my), camera);
      if (shelfManager.raycastCards(rc)) return;
    }
    recenterCamera();
  });

  dotTexture = makeDotTexture();

  laserDotTexture = makeLaserDotTexture();

  particleClockTex = makeParticleClockTexture();
}
