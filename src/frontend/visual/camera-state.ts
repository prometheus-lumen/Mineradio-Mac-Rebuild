function __mineradioInitVisualCamera27(): void {
  // ============================================================
  //  相机系统 v7.1 — 分离 user offset / cinema offset
  //   - userOrbit: 用户拖拽的目标 (永久保留, 不会被电影模式覆盖)
  //   - cinemaOffset: 电影模式的微偏移 (始终叠加, 即使用户在拖)
  //   - 最终 theta = userOrbit.theta + cinemaOffset.theta
  //   - 回正按钮 / 双击屏幕: 让 userOrbit 缓慢归零
  // ============================================================
  orbit = {
    userTheta: 0.0, userPhi: 0.08, userRadius: 6.6,
    cineTheta: 0.0, cinePhi: 0.0, cineRadius: 0.0,
    theta: 0.0, phi: 0.08, radius: 6.6,
    minPhi: -Math.PI*0.45, maxPhi: Math.PI*0.45,
    minRadius: 2.4, maxRadius: 14.0,
    baselineTheta: 0.0, baselinePhi: 0.08, baselineRadius: 6.6,
    rotating: false, last:{x:0,y:0},
    recentering: false,
    centerLocked: false,
    // v8: 镜头跟拍 (hover shelf / queue 时)
    lookAt: new THREE.Vector3(0,0,0),
    focus: {
      active: false,
      type: null,        // 'shelf-side' | 'shelf-stage' | 'queue'
      theta: 0.0, phi: 0.08, radius: 6.6,
      lookAt: new THREE.Vector3(0,0,0),
    },
    glowFollowX: 0,
    glowFollowY: 0,
    glowFollowRoll: 0,
    beatGlow: 0,
  };

  ZERO_VEC = new THREE.Vector3(0,0,0);

  BASE_FOV = 45;

  camPunch = 0;

  cinemaT = 0;

  freeCamera = readFreeCameraState();

  FREE_CAMERA_MOVE = new THREE.Vector3();

  FREE_CAMERA_TARGET_VEL = new THREE.Vector3();

  FREE_CAMERA_SHAKE_DIR = new THREE.Vector3();

  FREE_CAMERA_EULER = new THREE.Euler(0, 0, 0, 'YXZ');

  FREE_CAMERA_RESET_MAT = new THREE.Matrix4();

  FREE_CAMERA_RESET_QUAT = new THREE.Quaternion();

  FREE_CAMERA_UP = new THREE.Vector3(0, 1, 0);

  freeCameraPointer = { seen: false, x: 0, y: 0 };

  freeCameraDeferredSaveTimer = 0;

  window.addEventListener('beforeunload', flushPersistentVisualState);

  window.addEventListener('pagehide', flushPersistentVisualState);

  // 焦点跟拍 (hover 0.5s 后镜头移到目标)
  focusHover = { wantType: null, pendingTimer: null, exitTimer: null };

  // 电影镜头 v8: 振幅大幅减小, 节拍 punch 加冷却 + 强度门槛
  //   - cineTheta/Phi 是非常缓慢的低频漂移, 不再让人 motion sick
  //   - punch zoom 只在 真·强主拍 触发, 至少间隔 0.45s, 振幅 ×0.5
  lastCamPunchAt = -10;

  CAM_PUNCH_MIN_INTERVAL = 0.45;

  // 秒
  CAM_PUNCH_BEAT_THRESHOLD = 0.55;

  updateCamera();

  (function initControlsAutoHide() {
    var bar = document.getElementById('bottom-bar');
    var handle = document.getElementById('bottom-handle');
    if (!bar) return;
    function enterControls(){
      controlsHovering = true;
      wakeBottomHandle();
      setControlsHidden(false);
      if (controlsHideTimer) { clearTimeout(controlsHideTimer); controlsHideTimer = null; }
    }
    function leaveControls(){
      controlsHovering = false;
      scheduleControlsHide(70);
      wakeBottomHandle(900);
    }
    bar.addEventListener('mouseenter', enterControls);
    bar.addEventListener('mouseleave', leaveControls);
    if (handle) {
      handle.addEventListener('mouseenter', function(){
        controlsHovering = true;
        revealBottomControls(900);
      });
      handle.addEventListener('mouseleave', leaveControls);
      handle.addEventListener('click', function(e){ e.preventDefault(); e.stopPropagation(); toggleBottomControlsFromHandle(); });
    }
    updateControlsChromeState();
  })();

  ['mousemove', 'pointermove', 'mousedown', 'wheel', 'touchstart'].forEach(function(type){
    window.addEventListener(type, revealCursorForActivity, { passive:true, capture:true });
  });

  syncCursorAutoHideMode();
}
