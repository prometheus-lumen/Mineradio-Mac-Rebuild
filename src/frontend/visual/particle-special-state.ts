function __mineradioInitVisualParticleSpecial30(): void {
  HEXAGRAM_PRESET_INDEX = 7;

  PARTICLE_CLOCK_PRESET_INDEX = 8;

  STROBE_PRESET_INDEX = 9;

  hexagramGroup = new THREE.Group();

  hexagramOpacity = 0;

  hexagramGold = new THREE.Color('#ffd987');

  hexagramGoldHot = new THREE.Color('#fff3c8');

  hexagramCyan = new THREE.Color('#62e7ff');

  hexagramCyanHot = new THREE.Color('#d8fbff');

  hexagramLineGeometry = new THREE.BufferGeometry();

  hexagramLinePositions = [];

  hexagramLineColors = [];

  hexagramLineData = [];

  hexagramSparkPositions = [];

  hexagramSparkColors = [];

  hexagramSparkData = [];

  buildHexagramLayer();

  hexagramGroup.visible = false;

  scene.add(hexagramGroup);

  // ============================================================
  //  浮空粒子层 (独立 Points)
  //   v7.1: 速度大幅放慢, 改用 sin/cos 长周期漂移 (优雅而非乱飞)
  // ============================================================
  FLOAT_COUNT = 1300;

  floatGroup = null;

  floatPositionsArr = null, floatBaseArr = null, floatPhaseArr = null, floatColorArr = null;
}
