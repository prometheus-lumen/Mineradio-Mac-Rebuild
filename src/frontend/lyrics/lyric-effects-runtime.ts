function tickLyricsParticles() {
  if (!fx.particleLyrics) {
    if (stageLyrics.current || stageLyrics.currentText || (stageLyrics.outgoing && stageLyrics.outgoing.length)) clearStageLyrics();
    return;
  }
  if (!playing || !audio || !lyricsLines.length) {
    if (stageLyrics.current) {
      stageLyrics.current.userData.state = 'out';
      stageLyrics.current.userData.age = 0;
      stageLyrics.outgoing.push(stageLyrics.current);
      stageLyrics.current = null;
      stageLyrics.currentIdx = -1;
      stageLyrics.currentText = '';
    }
    return;
  }
  var t = audio.currentTime;
  var newIdx = findLyricLineIndexAt(lyricsLines, t, stageLyrics.currentIdx);
  if (newIdx < 0) {
    var introText = currentLyricFallbackText();
    if (!introText) {
      clearStageLyrics();
      return;
    }
    var firstLine = lyricsLines[0];
    var introEnd = firstLine && firstLine.t > 0 ? firstLine.t : Math.min((audio && audio.duration) || 4.8, 4.8);
    if (stageLyrics.currentIdx !== -2 || stageLyrics.currentText !== introText) {
      stageLyrics.currentIdx = -2;
      showStageLine(introText, false, Math.max(0, introEnd - t));
    }
    if (stageLyrics.current) {
      var introLine = { t:0, text:introText, duration:Math.max(0.8, introEnd), charCount:Math.max(1, introText.length), fallback:true };
      updateLyricMeshProgress(stageLyrics.current, getLyricLineProgress(introLine, null, t));
    }
    return;
  }
  if (newIdx !== stageLyrics.currentIdx) {
    stageLyrics.currentIdx = newIdx;
    var line = lyricsLines[newIdx];
    var followingLine = lyricsLines[newIdx + 1];
    var displayDuration = followingLine && followingLine.t > line.t
      ? followingLine.t - t
      : Math.max(0, line.t + (line.duration || 4.8) - t);
    showStageLine(line.text || '', false, displayDuration);
  }
  if (stageLyrics.current) {
    var curLine = lyricsLines[newIdx] || { t:t };
    var nextLine = lyricsLines[newIdx + 1];
    var progress = getLyricLineProgress(curLine, nextLine, t);
    updateLyricMeshProgress(stageLyrics.current, progress);
  }
}

function disposeLyricsParticles() {
  clearStageLyrics();
  if (stageLyrics.networkLines) {
    if (stageLyrics.networkLines.parent) stageLyrics.networkLines.parent.remove(stageLyrics.networkLines);
    if (stageLyrics.networkLines.geometry) stageLyrics.networkLines.geometry.dispose();
    if (stageLyrics.networkLines.material) stageLyrics.networkLines.material.dispose();
    stageLyrics.networkLines = null;
  }
  if (stageLyrics.starRiver) {
    if (stageLyrics.starRiver.parent) stageLyrics.starRiver.parent.remove(stageLyrics.starRiver);
    if (stageLyrics.starRiver.geometry) stageLyrics.starRiver.geometry.dispose();
    if (stageLyrics.starRiver.material) stageLyrics.starRiver.material.dispose();
    stageLyrics.starRiver = null;
  }
  if (stageLyrics.group) {
    scene.remove(stageLyrics.group);
    stageLyrics.group = null;
  }
}

function __mineradioInitLyricsLyricEffects32() {
  // ============================================================
  //  舞台歌词系统 v9 — Three.js 文字平面, 跟随专辑粒子 3D 运动
  // ============================================================
  stageLyrics = {
    group: null,
    current: null,
    outgoing: [],
    currentIdx: -1,
    currentText: '',
    highBloom: 0,
    beatGlow: 0,
    glowFollowX: 0,
    glowFollowY: 0,
    glowFollowRoll: 0,
    palette: {
      primary: '#d6f8ff',
      secondary: '#9cffdf',
      highlight: '#eef7ff',
      shadow: 'rgba(2,8,12,0.42)',
      glow: 'rgba(143,233,255,0.34)',
    },
    coverPalette: {
      primary: '#d6f8ff',
      secondary: '#9cffdf',
      highlight: '#eef7ff',
      shadow: 'rgba(2,8,12,0.42)',
      glow: 'rgba(143,233,255,0.34)',
    },
    starRiver: null,
    starRiverWidth: 4.2,
    starRiverHeight: 0.58,
    networkLines: null,
    lockFitScale: 1,
    snapCameraLockFrames: 0,
    autoFlowMode: 'float',
    autoFlowLinesRemaining: 0,
    autoFlowQueue: [],
    warpEntryIndex: 0,
    warpExitIndex: 0,
    warpEntryOffset: { x: Math.random(), y: Math.random() },
    warpExitOffset: { x: Math.random(), y: Math.random() },
  };

  lyricSunColor = new THREE.Color(0xffe6a4);

  lyricSunHotColor = new THREE.Color(0xfff4cc);

  lyricCameraDir = new THREE.Vector3();

  lyricCameraRight = new THREE.Vector3();

  lyricCameraUp = new THREE.Vector3();

  lyricCameraTarget = new THREE.Vector3();

  lyricLayoutBase = new THREE.Vector3();

  lyricLayoutTarget = new THREE.Vector3();

  lyricCoverWorldPos = new THREE.Vector3();

  lyricCoverWorldQuat = new THREE.Quaternion();

  lyricBaseEuler = new THREE.Euler(0, 0, 0, 'YXZ');

  lyricTiltEuler = new THREE.Euler(0, 0, 0, 'YXZ');

  lyricBaseQuat = new THREE.Quaternion();

  lyricTiltQuat = new THREE.Quaternion();

  lyricTargetQuat = new THREE.Quaternion();

  lyricViewportCorner = new THREE.Vector3();

  lyricViewportCenter = new THREE.Vector3();

  lyricViewportBasisX = new THREE.Vector3();

  lyricViewportBasisY = new THREE.Vector3();

  lyricViewportOffsetX = new THREE.Vector3(1, 0, 0);

  lyricViewportOffsetY = new THREE.Vector3(0, 1, 0);

  LYRIC_CAMERA_LOCK_MAX_SCALE = 0.80;

  LYRIC_SCENE_MODES = ['float', 'slant', 'cloud', 'network', 'geometry', 'scatter', 'stretch', 'orbit', 'wave', 'sweep', 'bounce', 'pendulum', 'depth', 'drift', 'pulse', 'glide', 'push', 'rise', 'rush', 'zigzag', 'impact'];

  // 兼容旧变量名以便其它代码不破坏
  lyricsParticles = null;

  lyricsGeo = null;

  // 三个 attribute: 源位置(随机扩散态), 目标位置(组成字), color, brightness
  lyricsAttrTargetA = null;

  lyricsAttrTargetB = null;

  lyricsAttrSeed = null;

  CUSTOM_BG_DB_NAME = 'mineradio-custom-background-v1';

  CUSTOM_BG_STORE = 'media';

  customBgObjectUrl = '';

  customBgApplyToken = 0;

  colorLabState = { picker: null, id: '', h: 0, s: 1, v: 1, dragging: false };

  COLOR_LAB_PRESETS = [
    { name: '极黑', color: '#000000' },
    { name: '极白', color: '#ffffff' },
    { name: '克莱因蓝', color: '#002fa7' },
    { name: '法拉利红', color: '#f00000' },
    { name: '香槟金', color: '#c8a96a' },
    { name: '孔雀绿', color: '#006b5b' },
    { name: '午夜紫', color: '#2b164f' },
    { name: '银雾', color: '#d9dde2' }
  ];

  window.addEventListener('resize', function(){
    requestAnimationFrame(repositionFxFloatingPanels);
  });

  STAGE_LYRIC_MAX_LINES = 1;

  lyricSunBloomTexture = null;
}
