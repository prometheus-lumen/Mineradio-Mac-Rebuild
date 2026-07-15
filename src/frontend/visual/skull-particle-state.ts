function __mineradioInitVisualSkullParticles31(): void {
  // ============================================================
  //  安魂 — 3D 粒子建模层
  // ============================================================
  SKULL_PRESET_INDEX = 6;

  SKULL_MODEL_BASE_ROTATION_X = -0.26;

  SKULL_MODEL_BASE_ROTATION_Y = 0.00;

  SKULL_MODEL_SCALE = 2.34;

  SKULL_MODEL_BASE_POSITION = { x: 0, y: 0.22, z: 0.10 };

  skullAmpPulse = 0;

  skullBeatFlash = 0;

  skullJawOpen = 0;

  skullCameraBlend = 0;

  skullWheelZoom = 0;

  skullWheelZoomTarget = 0;

  skullCameraTargetPos = new THREE.Vector3();

  skullCameraTargetLook = new THREE.Vector3();

  skullCameraBasePos = new THREE.Vector3();

  skullCameraBaseLook = new THREE.Vector3();

  skullCameraShelfPos = new THREE.Vector3();

  skullCameraShelfLook = new THREE.Vector3();

  skullCameraMixedLook = new THREE.Vector3();

  skullShelfCameraMix = 0;

  skullLyricMouthLocal = new THREE.Vector3(0.025, -0.72, 0.62);

  skullLyricMouthTarget = new THREE.Vector3();

  skullLyricMouthForward = new THREE.Vector3();

  skullLyricMouthQuat = new THREE.Quaternion();

  skullLyricReadableQuat = new THREE.Quaternion();

  skullParticleGroup = null;

  skullParticleOpacity = 0;

  skullParticleAsset = { data: null, promise: null, failed: false };

  skullBaseColors = {
    boneA: new THREE.Color('#b8ae98'),
    boneB: new THREE.Color('#fff4d8'),
    shadow: new THREE.Color('#100d0d'),
    light: new THREE.Color('#ffe3a0'),
    neutralBoneA: new THREE.Color('#9fb7c8'),
    neutralBoneB: new THREE.Color('#eef9ff'),
    neutralShadow: new THREE.Color('#070b12'),
    neutralLight: new THREE.Color('#d6f3ff')
  };

  skullTintScratch = {
    tint: new THREE.Color(),
    soft: new THREE.Color(),
    bright: new THREE.Color(),
    dark: new THREE.Color(),
    boneA: new THREE.Color(),
    boneB: new THREE.Color(),
    shadow: new THREE.Color(),
    light: new THREE.Color()
  };

  // ============================================================
  //  封面背面粒子层 (v7.2)
  //   - 独立 Points, 放在 z=-1.5 (主封面平面背面)
  //   - 颜色取自封面镜像 UV
  //   - 慢呼吸 + 小幅 noise 漂移
  //   - 跟主粒子同步旋转 (在主循环里赋值)
  //   - 视角转到背面才能看到 — 不需要手动控制 visible
  // ============================================================
  BACK_COVER_COUNT = 3000;

  backCoverGroup = null;

  backCoverColorArr = null;
}
