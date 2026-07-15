function initializeBaseParticleResources(): void {
  PLANE_SIZE = 4.8;

  RIPPLE_MAX = 12;

  GRID_X = coverParticleGridForResolution(fx.coverResolution), GRID_Y = GRID_X;

  PCOUNT = GRID_X * GRID_Y;

  positions = null, uvs = null, aRand = null;

  coverResolutionReloadTimer = null;

  currentCoverSource = null;

  coverPickerCanvas = null;

  geo = buildCoverParticleGeometry(GRID_X);

  // 涟漪数据纹理 (1×N, RGBA: x, y, age, str)
  const initialRippleData = new Float32Array(RIPPLE_MAX * 4);
  rippleData = initialRippleData;

  rippleTex = new THREE.DataTexture(initialRippleData, 1, RIPPLE_MAX, THREE.RGBAFormat, THREE.FloatType);

  rippleTex.magFilter = THREE.NearestFilter;

  rippleTex.minFilter = THREE.NearestFilter;

  ripples = [];

  for (let index = 0; index < RIPPLE_MAX; index += 1) ripples.push({ x:0, y:0, age:-10, str:0 });

  // 封面纹理 + 边缘/深度纹理
  coverTex = new THREE.Texture();

  coverTex.minFilter = THREE.LinearFilter;

  coverTex.magFilter = THREE.LinearFilter;

  coverTex.wrapS = THREE.ClampToEdgeWrapping;

  coverTex.wrapT = THREE.ClampToEdgeWrapping;

  coverEdgeTex = new THREE.Texture();

  // R=depth, G=edge, B=fg-mask, A=lum
  coverEdgeTex.minFilter = THREE.LinearFilter;

  coverEdgeTex.magFilter = THREE.LinearFilter;

  // 初始 1×1 像素
  (function(){
    var c = document.createElement('canvas'); c.width = c.height = 4;
    var x = c.getContext('2d'); if (!x) return; x.fillStyle = '#1c1c28'; x.fillRect(0,0,4,4);
    coverTex.image = c; coverTex.needsUpdate = true;
    var d = document.createElement('canvas'); d.width = d.height = 4;
    var dx = d.getContext('2d'); if (!dx) return; dx.fillStyle = 'rgba(128,0,0,255)'; dx.fillRect(0,0,4,4);
    coverEdgeTex.image = d; coverEdgeTex.needsUpdate = true;
  })();

  // 前一首封面纹理 (用于切歌渐变)
  prevCoverTex = new THREE.Texture();

  prevCoverTex.minFilter = THREE.LinearFilter;

  prevCoverTex.magFilter = THREE.LinearFilter;

  (function(){
    var c = document.createElement('canvas'); c.width = c.height = 4;
    var x = c.getContext('2d'); if (!x) return; x.fillStyle = '#1c1c28'; x.fillRect(0,0,4,4);
    prevCoverTex.image = c; prevCoverTex.needsUpdate = true;
  })();

  uniforms = {
    uTime:       { value: 0 },
    uBass:       { value: 0 },
    uMid:        { value: 0 },
    uTreble:     { value: 0 },
    uBeat:       { value: 0 },
    uEnergy:     { value: 0 },
    uBurstAmt:   { value: 0 },          // 通用预设切换脉冲 0..1
    uVinylSpin:  { value: 0 },
    uPreset:     { value: 0 },
    uIntensity:  { value: 0.85 },
    uDepth:      { value: 1.0 },
    uPointScale: { value: 1.0 },
    uSpeed:      { value: 1.0 },
    uTwist:      { value: 0 },
    uColorBoost: { value: 1.1 },
    uScatter:    { value: 0 },
    uCoverRes:   { value: 1.0 },
    uBgFade:     { value: 0.20 },
    uBloomStrength:{ value: 0.62 },
    uBloomSize:  { value: 2.65 },
    uTintColor:  { value: new THREE.Color('#9db8cf') },
    uTintStrength:{ value: 0 },
    uCoverTex:   { value: coverTex },
    uPrevCoverTex:{ value: prevCoverTex },
    uColorMixT:  { value: 1.0 },        // 0=显示旧封面 → 1=显示新封面
    uEdgeTex:    { value: coverEdgeTex },
    uRippleTex:  { value: rippleTex },
    uClockTex:   { value: particleClockTex },
    uRippleCount:{ value: 0 },
    uDotTex:     { value: dotTexture },
    uHasCover:   { value: 0 },
    uHasDepth:   { value: 0 },
    uEdgeEnabled:{ value: 1 },
    uAiBoost:    { value: 0 },          // AI 深度增益, 当 AI 接管时升至 1
    uMouseXY:    { value: new THREE.Vector2(-999, -999) },
    uMouseActive:{ value: 0 },
    uHandXY:     { value: new THREE.Vector2(-999, -999) },
    uHandActive: { value: 0 },
    uGestureGrip:{ value: 0 },
    uPixel:      { value: renderer.getPixelRatio() },
    uAlpha:      { value: 0 },          // 整体粒子透明度 (启动 fade-in)
    uParticleDim:{ value: 1 },          // 覆盖层打开时只压低粒子背景, 不影响 3D 卡片
    uFloatAlpha: { value: 0 },          // 空场/浮空粒子透明度
    uLoading:    { value: 0 },          // 加载动画混合度 0..1 (1 = 完全聚成圆环)
  };

  installRenderPowerHooks();

  applyRendererPowerMode();
}
