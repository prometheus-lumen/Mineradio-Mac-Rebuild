'use strict';

// Mineradio classic module: visual/particles-base.
// ============================================================
//  粒子点纹理 (干净圆点, 无 glow)
// ============================================================
function makeDotTexture() {
  var cv = document.createElement('canvas'); cv.width = cv.height = 64;
  var ctx = cv.getContext('2d');
  var g = ctx.createRadialGradient(32, 32, 0, 32, 32, 31);
  g.addColorStop(0.00, 'rgba(255,255,255,0.96)');
  g.addColorStop(0.42, 'rgba(255,255,255,0.78)');
  g.addColorStop(0.72, 'rgba(255,255,255,0.22)');
  g.addColorStop(1.00, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 64, 64);
  var tex = new THREE.CanvasTexture(cv);
  tex.minFilter = THREE.LinearFilter; tex.magFilter = THREE.LinearFilter;
  return tex;
}

function tweenParticleAlpha(from, to, durationMs) {
  if (alphaTween) cancelAnimationFrame(alphaTween.raf);
  var start = performance.now();
  function step(now) {
    var t = Math.min(1, (now - start) / durationMs);
    t = t * t * (3 - 2 * t);
    uniforms.uAlpha.value = from + (to - from) * t;
    if (t < 1) alphaTween = { raf: requestAnimationFrame(step) };
    else alphaTween = null;
  }
  alphaTween = { raf: requestAnimationFrame(step) };
}

function revealIdleParticles(target, durationMs) {
  if (!uniforms || !uniforms.uFloatAlpha) return;
  if (floatAlphaTween) { cancelAnimationFrame(floatAlphaTween.raf); floatAlphaTween = null; }
  uniforms.uFloatAlpha.value = 0;
  if (floatGroup) destroyFloatLayer();
  return;
  var next = typeof target === 'number' ? target : IDLE_PARTICLE_ALPHA;
  var from = uniforms.uFloatAlpha.value || 0;
  if (from >= next - 0.01) return;
  tweenFloatAlpha(from, next, durationMs || 1800);
}

function activeBackgroundImageForParticles(song) {
  var media = effectiveBackgroundMedia(song || currentCoverSong());
  return media && media.type === 'image' && media.src ? media.src : '';
}

function setParticleLyricsSilently(on) {
  fx.particleLyrics = !!on;
  if (fx.particleLyrics) createLyricsParticles();
  else clearStageLyrics();
  lyricsVisible = fx.particleLyrics;
}

function __mineradioInitVisualParticlesBase29() {
  // ============================================================
  //  主粒子系统
  //   - 5 个 preset, 每个预设走完全不同的 pos 计算
  //   - 共享: 封面色采样, 鼠标交互, 粒子大小限制
  // ============================================================
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
  rippleData = new Float32Array(RIPPLE_MAX * 4);

  rippleTex = new THREE.DataTexture(rippleData, 1, RIPPLE_MAX, THREE.RGBAFormat, THREE.FloatType);

  rippleTex.magFilter = THREE.NearestFilter;

  rippleTex.minFilter = THREE.NearestFilter;

  ripples = [];

  for (ri = 0; ri < RIPPLE_MAX; ri++) ripples.push({ x:0, y:0, age:-10, str:0 });

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
    var x = c.getContext('2d'); x.fillStyle = '#1c1c28'; x.fillRect(0,0,4,4);
    coverTex.image = c; coverTex.needsUpdate = true;
    var d = document.createElement('canvas'); d.width = d.height = 4;
    var dx = d.getContext('2d'); dx.fillStyle = 'rgba(128,0,0,255)'; dx.fillRect(0,0,4,4);
    coverEdgeTex.image = d; coverEdgeTex.needsUpdate = true;
  })();

  // 前一首封面纹理 (用于切歌渐变)
  prevCoverTex = new THREE.Texture();

  prevCoverTex.minFilter = THREE.LinearFilter;

  prevCoverTex.magFilter = THREE.LinearFilter;

  (function(){
    var c = document.createElement('canvas'); c.width = c.height = 4;
    var x = c.getContext('2d'); x.fillStyle = '#1c1c28'; x.fillRect(0,0,4,4);
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

  // ----- 顶点 Shader -----
  //   v7.1: 律动幅度 ×2.5, Tunnel 自旋, 虚空预设, 切歌颜色渐变
  vs = `
  precision highp float;
  uniform float uTime, uBass, uMid, uTreble, uBeat, uEnergy, uBurstAmt;
  uniform float uPreset, uIntensity, uDepth, uPointScale, uSpeed, uTwist;
  uniform float uVinylSpin;
  uniform float uColorBoost, uScatter, uCoverRes, uBgFade;
  uniform float uHasCover, uHasDepth, uEdgeEnabled, uAiBoost;
  uniform float uMouseActive, uPixel, uColorMixT, uLoading;
  uniform sampler2D uCoverTex, uPrevCoverTex, uEdgeTex, uRippleTex, uClockTex;
  uniform int uRippleCount;
  uniform vec2 uMouseXY, uHandXY;
  uniform float uHandActive, uGestureGrip;
  uniform vec3 uTintColor;
  uniform float uTintStrength;
  attribute vec2 aUv;
  attribute float aRand;
  varying vec3 vColor;
  varying float vBright, vRipple, vEdgeBoost, vAlpha, vSourceLum;
  
  #define PI 3.14159265359
  
  vec3 mod289(vec3 x){return x-floor(x*(1.0/289.0))*289.0;}
  vec4 mod289v(vec4 x){return x-floor(x*(1.0/289.0))*289.0;}
  vec4 perm(vec4 x){return mod289v(((x*34.0)+1.0)*x);}
  float snoise(vec3 v){
    const vec2 C=vec2(1.0/6.0,1.0/3.0);
    const vec4 D=vec4(0.0,0.5,1.0,2.0);
    vec3 i=floor(v+dot(v,C.yyy));
    vec3 x0=v-i+dot(i,C.xxx);
    vec3 g=step(x0.yzx,x0.xyz); vec3 l=1.0-g;
    vec3 i1=min(g.xyz,l.zxy); vec3 i2=max(g.xyz,l.zxy);
    vec3 x1=x0-i1+C.xxx;
    vec3 x2=x0-i2+C.yyy;
    vec3 x3=x0-D.yyy;
    i=mod289(i);
    vec4 p=perm(perm(perm(i.z+vec4(0.0,i1.z,i2.z,1.0))+i.y+vec4(0.0,i1.y,i2.y,1.0))+i.x+vec4(0.0,i1.x,i2.x,1.0));
    float n_=0.142857142857;
    vec3 ns=n_*D.wyz-D.xzx;
    vec4 j=p-49.0*floor(p*ns.z*ns.z);
    vec4 x_=floor(j*ns.z); vec4 y_=floor(j-7.0*x_);
    vec4 x=x_*ns.x+ns.yyyy; vec4 y=y_*ns.x+ns.yyyy;
    vec4 h=1.0-abs(x)-abs(y);
    vec4 b0=vec4(x.xy,y.xy); vec4 b1=vec4(x.zw,y.zw);
    vec4 s0=floor(b0)*2.0+1.0; vec4 s1=floor(b1)*2.0+1.0;
    vec4 sh=-step(h,vec4(0.0));
    vec4 a0=b0.xzyw+s0.xzyw*sh.xxyy; vec4 a1=b1.xzyw+s1.xzyw*sh.zzww;
    vec3 p0=vec3(a0.xy,h.x); vec3 p1=vec3(a0.zw,h.y); vec3 p2=vec3(a1.xy,h.z); vec3 p3=vec3(a1.zw,h.w);
    vec4 norm=inversesqrt(vec4(dot(p0,p0),dot(p1,p1),dot(p2,p2),dot(p3,p3)));
    p0*=norm.x; p1*=norm.y; p2*=norm.z; p3*=norm.w;
    vec4 m=max(0.6-vec4(dot(x0,x0),dot(x1,x1),dot(x2,x2),dot(x3,x3)),0.0);
    m=m*m;
    return 42.0*dot(m*m,vec4(dot(p0,x0),dot(p1,x1),dot(p2,x2),dot(p3,x3)));
  }
  
  float hash11(float p) {
    return fract(sin(p * 127.1) * 43758.5453123);
  }
  
  vec2 safeCoverUv(vec2 uv) {
    return clamp(uv, vec2(0.0012), vec2(0.9988));
  }
  
  vec3 sampleNewCoverColor(vec2 uv) {
    return texture2D(uCoverTex, safeCoverUv(uv)).rgb;
  }
  
  vec3 samplePrevCoverColor(vec2 uv) {
    return texture2D(uPrevCoverTex, safeCoverUv(uv)).rgb;
  }
  
  vec4 sampleEdgeColor(vec2 uv) {
    return texture2D(uEdgeTex, safeCoverUv(uv));
  }
  
  float rippleSumAt(vec2 p, out float maxAmp) {
    float sum = 0.0; maxAmp = 0.0;
    for (int ri = 0; ri < 12; ri++) {
      if (ri >= uRippleCount) break;
      float vCoord = (float(ri) + 0.5) / 12.0;
      vec4 rd = texture2D(uRippleTex, vec2(0.5, vCoord));
      float age = rd.z; float str = rd.w;
      if (str < 0.005 || age < 0.0 || age > 2.0) continue;
      float dx = p.x - rd.x, dy = p.y - rd.y;
      float dist = sqrt(dx*dx + dy*dy);
      float lifeN = age / 2.0;
      float fadeIn  = smoothstep(0.0, 0.06, age);
      float fadeOut = 1.0 - smoothstep(0.7, 1.0, lifeN);
      float env = fadeIn * fadeOut;
      // v7.1: 把幅度放大 — 中心凸起更高更宽
      float bulgeW = 0.55 + age * 0.80;
      float bulge  = exp(-dist*dist / (2.0 * bulgeW * bulgeW)) * (1.0 - smoothstep(0.0, 0.55, lifeN));
      float waveR  = age * 2.10;
      float ringW  = 0.40 + age * 0.22;
      float ring   = exp(-pow((dist - waveR) / ringW, 2.0));
      // v7.1: 提升整体幅度 ×2
      float local  = (bulge * 2.4 + ring * 1.30) * env * str;
      sum += local;
      maxAmp = max(maxAmp, abs(local));
    }
    return sum;
  }
  
  void main(){
    float t = uTime * uSpeed;
    vec3 pos;
    vec2 sampleUv = safeCoverUv(aUv);
    // 切歌颜色渐变: 在新旧封面间 mix
    vec3 newCol = sampleNewCoverColor(sampleUv);
    vec3 prevCol = samplePrevCoverColor(sampleUv);
    vec3 coverColor = mix(prevCol, newCol, clamp(uColorMixT, 0.0, 1.0));
    vec4 edge = sampleEdgeColor(sampleUv);
    float depthVal = edge.r;
    float edgeVal  = edge.g;
    float fgMask   = edge.b;
    float lumVal   = edge.a;
    float maxRippleAmp = 0.0;
    float rippleZ = 0.0;
  
    vec3 defaultColor = mix(
      vec3(0.36, 0.28, 0.72),
      mix(vec3(0.85, 0.55, 0.95), vec3(0.45, 0.78, 0.95), aUv.x),
      aUv.y
    );
    vColor = mix(defaultColor, coverColor, uHasCover);
    vAlpha = 1.0;
  
    // 律动强度的真实倍数 (放大 intensity 滑块的影响)
    float K = uIntensity * 1.6;   // 滑块 1.0 → K=1.6, 滑块 1.6 → K=2.56
  
    // ====================================================
    //  Preset 0: SILK — 丝绸 (xy 平面, z 涟漪)
    //  v7.1: 全部位移 ×2.5
    // ====================================================
    if (uPreset < 0.5) {
      pos = position;
      rippleZ = rippleSumAt(pos.xy, maxRippleAmp);
  
      float midN = snoise(vec3(pos.x*1.4, pos.y*1.4, t*0.55)) * 0.6
                 + snoise(vec3(pos.x*2.8+5.0, pos.y*2.8-3.0, t*0.85)) * 0.4;
      float midMask = 0.55 + 0.45 * snoise(vec3(pos.x*0.4, pos.y*0.4, t*0.18));
      float midDisp = midN * uMid * 0.55 * midMask * K;       // 0.20 → 0.55
  
      float trebleJ = snoise(vec3(pos.x*6.5, pos.y*6.5, t*3.5 + aRand*4.0)) * uTreble * 0.18 * K;  // 0.06→0.18
      float bassBreath = snoise(vec3(pos.x*0.35, pos.y*0.35, t*0.4)) * uBass * 0.42 * K;          // 0.14→0.42
  
      // AI 深度: 显著强化 (0.85 → 1.4)
      float depthZ = (depthVal - 0.5) * uAiBoost * uDepth * 1.40 * uHasDepth;
  
      pos.z = rippleZ * 1.30 + midDisp + trebleJ + bassBreath + depthZ;
    }
  
    // ====================================================
    //  Preset 1: TUNNEL — 隧道 + 自旋
    // ====================================================
    else if (uPreset < 1.5) {
      // v7.1: 整体自旋 — 整管缓慢绕 Z 轴
      float spin = t * 0.12;
      float angle = aUv.x * 2.0 * PI + spin;
      float flow = aUv.y - t * 0.08 * (1.0 + uBass * 0.55);
      flow = fract(flow);
      float zPos = (flow - 0.5) * 9.0;
      float baseR = 2.0 - uBass * 0.28 * K;                  // bass 收缩更明显
      float ripG  = sin(angle * 5.0 + zPos * 1.4 + t * 2.2) * 0.10 * (uMid + uTreble) * K;   // 0.04→0.10
      float r = baseR + ripG;
      pos.x = cos(angle) * r;
      pos.y = sin(angle) * r;
      pos.z = zPos;
  
      sampleUv = vec2(aUv.x, flow);
      sampleUv = safeCoverUv(sampleUv);
      newCol = sampleNewCoverColor(sampleUv);
      prevCol = samplePrevCoverColor(sampleUv);
      coverColor = mix(prevCol, newCol, clamp(uColorMixT, 0.0, 1.0));
      vColor = mix(defaultColor, coverColor, uHasCover);
  
      float depthFade = smoothstep(-4.5, 4.5, zPos);
      vColor *= 0.4 + depthFade * 0.7;
    }
  
    // ====================================================
    //  Preset 2: ORBIT — 星球 (保留自转)
    //  v7.1: 律动幅度加大
    // ====================================================
    else if (uPreset < 2.5) {
      float theta = aUv.x * 2.0 * PI;
      float phi   = (aUv.y - 0.5) * PI;
      float baseR = 2.2;
      float trebFlare = snoise(vec3(theta * 1.5, phi * 1.5, t * 0.7)) * uTreble * 0.85 * K;   // 0.40→0.85
      float bassExpand = uBass * 0.35 * K;                                                      // 0.18→0.35
      float r = baseR * (1.0 + bassExpand) + trebFlare;
  
      pos.x = r * cos(phi) * cos(theta);
      pos.y = r * sin(phi);
      pos.z = r * cos(phi) * sin(theta);
  
      float yaw = t * 0.18;
      float cy = cos(yaw), sy = sin(yaw);
      pos.xz = mat2(cy, -sy, sy, cy) * pos.xz;
    }
  
    // ====================================================
    //  Preset 3: VOID — 虚空 (无粒子, 适合自定义背景)
    // ====================================================
    else if (uPreset < 3.5) {
      pos = vec3((aUv.x - 0.5) * 0.01, (aUv.y - 0.5) * 0.01, -90.0);
      vAlpha = 0.0;
      vColor = vec3(0.0);
      maxRippleAmp = 0.0;
    }
  
    // ====================================================
    //  Preset 4: VINYL RECORD
    //  A real record layout: circular album cover in the center, black vinyl
    //  grooves outside, and a complete white particle rim.
    // ====================================================
    else if (uPreset < 4.5) {
      float bassDrive = smoothstep(0.08, 0.78, uBass + uBeat * 0.82);
      float highDrive = smoothstep(0.05, 0.46, uTreble);
      float hiResGuard = smoothstep(1.08, 1.55, uCoverRes);
      float edgeGuard = mix(1.0, 0.38, hiResGuard);
      float depthGuard = mix(1.0, 0.44, hiResGuard);
      float grooveGuard = mix(1.0, 0.48, hiResGuard);
      float beatGuard = mix(1.0, 0.36, hiResGuard);
  
      vec2 p = (aUv - 0.5) * 5.12;
      float spin = uVinylSpin;
      float cs = cos(spin), sn = sin(spin);
      vec2 rp = mat2(cs, -sn, sn, cs) * p;
      float d = length(p);
      float angle0 = atan(p.y, p.x);
      float recordR = 2.46;
      float coverR = 1.18;
      float recordAlpha = 1.0 - smoothstep(recordR - 0.02, recordR + 0.05, d);
      float coverMask = 1.0 - smoothstep(coverR - 0.012, coverR + 0.018, d);
      float border = exp(-pow((d - coverR) / 0.064, 2.0)) * edgeGuard;
      float outerRim = exp(-pow((d - (recordR - 0.050)) / 0.055, 2.0)) * edgeGuard;
      float vinylN = clamp((d - coverR) / max(0.001, recordR - coverR), 0.0, 1.0);
  
      pos = vec3(rp * (1.0 + bassDrive * 0.012 * beatGuard + uBeat * 0.026 * beatGuard), 0.0);
      vAlpha = recordAlpha;
  
      if (coverMask > 0.02) {
        vec2 coverUv = p / (coverR * 2.0) + 0.5;
        newCol = sampleNewCoverColor(coverUv);
        prevCol = samplePrevCoverColor(coverUv);
        coverColor = mix(prevCol, newCol, clamp(uColorMixT, 0.0, 1.0));
        if (hiResGuard > 0.001) {
          vec2 sx = vec2(0.0026, 0.0);
          vec2 sy = vec2(0.0, 0.0026);
          vec3 softNew = (sampleNewCoverColor(coverUv + sx) + sampleNewCoverColor(coverUv - sx) + sampleNewCoverColor(coverUv + sy) + sampleNewCoverColor(coverUv - sy)) * 0.25;
          vec3 softPrev = (samplePrevCoverColor(coverUv + sx) + samplePrevCoverColor(coverUv - sx) + samplePrevCoverColor(coverUv + sy) + samplePrevCoverColor(coverUv - sy)) * 0.25;
          coverColor = mix(coverColor, mix(softPrev, softNew, clamp(uColorMixT, 0.0, 1.0)), hiResGuard * 0.42);
        }
        vColor = mix(defaultColor, coverColor, uHasCover);
        float coverShade = 1.02 + 0.10 * (1.0 - smoothstep(0.0, coverR, d));
        vColor *= coverShade;
        vColor = mix(vColor, vec3(1.0), border * 0.54);
        pos.z = 0.040 + border * 0.026 * depthGuard + uBeat * 0.018 * beatGuard;
        maxRippleAmp = max(maxRippleAmp, border * 0.30 + bassDrive * 0.075 * beatGuard + uBeat * 0.075 * beatGuard);
      } else {
        float groove = 0.5 + 0.5 * sin((d - coverR) * mix(98.0, 58.0, hiResGuard));
        float fineGroove = 0.5 + 0.5 * sin((d - coverR) * mix(170.0, 92.0, hiResGuard) + aRand * 3.0);
        float tick = smoothstep(0.82, 0.995, hash11(floor((angle0 + PI) * 38.0) + floor(d * 72.0) * 2.1));
        vec3 vinyl = vec3(0.052, 0.054, 0.058) + vec3(0.052 * grooveGuard) * groove + vec3(0.026 * grooveGuard) * fineGroove;
        vinyl = mix(vinyl, coverColor * 0.32, 0.18 * (1.0 - vinylN));
        float whiteRing = max(border * 0.92, outerRim * 0.26);
        vColor = mix(vinyl, vec3(0.92, 0.94, 0.94), whiteRing);
        vColor = mix(vColor, vec3(1.0), tick * highDrive * (0.06 + border * 0.12) * grooveGuard);
        pos.z = groove * 0.010 * grooveGuard + border * 0.024 * depthGuard + bassDrive * vinylN * 0.016 * K * beatGuard + tick * highDrive * 0.010 * grooveGuard;
        maxRippleAmp = max(maxRippleAmp, border * 0.32 + outerRim * 0.12 + bassDrive * vinylN * 0.11 * beatGuard + tick * highDrive * 0.10 * grooveGuard + uBeat * vinylN * 0.08 * beatGuard);
      }
    }
  
    // ====================================================
    //  Preset 8: PARTICLE CLOCK — 秒级粒子时钟
    //  Canvas mask drives the digits; spare particles remain as fine star dust.
    // ====================================================
    else if (uPreset > 7.5) {
      float seed = hash11(aRand * 1777.0 + floor(aUv.x * 240.0) + floor(aUv.y * 180.0) * 3.1);
      float mask = texture2D(uClockTex, vec2(aUv.x, aUv.y)).r;
      float digit = smoothstep(0.035, 0.74, mask);
      float clockEdge = smoothstep(0.03, 0.18, mask) * (1.0 - smoothstep(0.78, 1.0, mask));
      float digitTwinkle = pow(0.5 + 0.5 * sin(t * (0.64 + seed * 0.82) + aRand * 16.0), 7.0);
      float dustTwinkle = pow(0.5 + 0.5 * sin(t * (0.38 + seed * 0.70) + aRand * 23.0), 6.0);
      float breath = sin(t * 0.52) * 0.5 + 0.5;
  
      vec3 textPos = vec3(
        (aUv.x - 0.5) * 10.15 + (seed - 0.5) * 0.022,
        (aUv.y - 0.5) * 2.74 + (hash11(aRand * 43.0) - 0.5) * 0.018,
        0.18 + clockEdge * 0.16 + digitTwinkle * 0.040 + breath * 0.018
      );
      textPos.x += sin(t * 0.18 + seed * 6.28) * 0.010;
      textPos.y += cos(t * 0.15 + seed * 5.31) * 0.008;
  
      float dustAngle = seed * PI * 2.0 + t * (0.010 + seed * 0.018);
      float dustRadius = mix(1.2, 12.4, pow(hash11(aRand * 307.0 + 5.0), 0.58));
      vec3 dustPos = vec3(
        cos(dustAngle) * dustRadius + (aUv.x - 0.5) * 9.2,
        sin(dustAngle * 0.78 + seed * 4.4) * dustRadius * 0.50 + (hash11(aRand * 79.0) - 0.5) * 4.2,
        mix(-15.5, 6.8, hash11(aRand * 601.0)) + sin(t * (0.05 + seed * 0.05) + seed * 9.0) * 0.38
      );
      pos = mix(dustPos, textPos, digit);
  
      vec3 ice = vec3(0.70, 0.92, 1.00);
      vec3 whiteHot = vec3(0.96, 1.00, 1.00);
      vec3 blueMist = vec3(0.34, 0.62, 0.88);
      vec2 clockColorUv = safeCoverUv(vec2(fract(aUv.x * 0.73 + 0.13), fract(aUv.y * 1.17 + 0.29)));
      vec3 clockCoverA = mix(samplePrevCoverColor(clockColorUv), sampleNewCoverColor(clockColorUv), clamp(uColorMixT, 0.0, 1.0));
      vec3 coverClock = mix(ice, mix(coverColor, clockCoverA, 0.58), clamp(uHasCover, 0.0, 1.0));
      float coverAvg = dot(coverClock, vec3(0.3333));
      coverClock = clamp(vec3(coverAvg) + (coverClock - vec3(coverAvg)) * 2.15, vec3(0.0), vec3(1.35));
      float coverLum = dot(coverClock, vec3(0.299, 0.587, 0.114));
      coverClock = mix(coverClock, whiteHot, clamp(0.24 - coverLum, 0.0, 0.24) * 1.25);
      coverClock = mix(coverClock, uTintColor, clamp(uTintStrength, 0.0, 1.0) * 0.50);
      vec3 dustCol = mix(blueMist, coverClock, 0.64 + seed * 0.24);
      dustCol = mix(dustCol, whiteHot, dustTwinkle * 0.18);
      vec3 digitCol = coverClock * (1.22 + mask * 0.34);
      digitCol = mix(digitCol, whiteHot, 0.10 + digitTwinkle * 0.09);
      digitCol = mix(digitCol, coverClock * 1.48 + vec3(0.10), clockEdge * 0.38);
      vColor = mix(dustCol, digitCol, digit);
      vAlpha = mix(0.022 + dustTwinkle * 0.18, 0.34 + mask * 0.78 + clockEdge * 0.18 + digitTwinkle * 0.08, digit);
      vAlpha *= 0.86 + breath * 0.10;
      maxRippleAmp = max(maxRippleAmp, digit * (0.16 + clockEdge * 0.32 + digitTwinkle * 0.10) + dustTwinkle * 0.040);
    }
  
    // ====================================================
    //  Preset 7: HEXAGRAM — 六芒星星阵
    //  Gold/cyan dotted triangles with circular orbital trails.
    // ====================================================
    else if (uPreset > 6.5) {
      float lane = aUv.y;
      float seed = hash11(aRand * 1447.0);
      float beatFlash = smoothstep(0.025, 0.68, uBeat);
      float bassFlash = smoothstep(0.08, 0.74, uBass);
      float highSpark = smoothstep(0.035, 0.48, uTreble);
      float flash = clamp(beatFlash * 0.76 + bassFlash * 0.30 + highSpark * 0.20 + uBurstAmt * 0.58, 0.0, 1.38);
      vec3 goldA = vec3(1.00, 0.82, 0.42);
      vec3 goldB = vec3(1.00, 0.94, 0.72);
      vec3 cyanA = vec3(0.34, 0.88, 1.00);
      vec3 cyanB = vec3(0.72, 1.00, 1.00);
  
      if (lane < 0.58) {
        float starLane = lane / 0.58;
        float triSet = step(0.5, starLane);
        float local = triSet < 0.5 ? starLane * 2.0 : (starLane - 0.5) * 2.0;
        float edgeId = floor(local * 3.0);
        float edgeT = fract(local * 3.0);
        float sideBand = floor(aUv.x * 9.0);
        float sideT = fract(aUv.x * 9.0);
        float triRot = triSet < 0.5 ? PI * 0.5 : -PI * 0.5;
        float edgeA = triRot + edgeId * PI * 2.0 / 3.0;
        float edgeB = triRot + (edgeId + 1.0) * PI * 2.0 / 3.0;
        float starR = 2.72 + bassFlash * 0.055 + sin(t * 0.42 + seed * 6.0) * 0.010;
        vec2 va = vec2(cos(edgeA), sin(edgeA)) * starR;
        vec2 vb = vec2(cos(edgeB), sin(edgeB)) * starR;
        vec2 base = mix(va, vb, edgeT);
        vec2 tangent = normalize(vb - va);
        vec2 normal = vec2(-tangent.y, tangent.x);
        float strand = (sideT - 0.5) * (0.030 + highSpark * 0.008);
        float shimmer = sin(edgeT * PI * 42.0 - t * (1.75 + seed * 0.46) + seed * 6.28);
        pos.xy = base + normal * (strand + shimmer * 0.0045) + tangent * ((seed - 0.5) * 0.012);
        pos.z = 0.18 + (seed - 0.5) * 0.20 + flash * 0.035;
        float vertexGlow = max(exp(-pow(edgeT / 0.022, 2.0)), exp(-pow((1.0 - edgeT) / 0.022, 2.0)));
        float midLineGlow = exp(-pow((edgeT - 0.5) / 0.030, 2.0)) * 0.32;
        float dotGate = smoothstep(0.05, 0.36, sideT) * (1.0 - smoothstep(0.64, 0.98, sideT));
        float dotted = 0.68 + pow(max(0.0, shimmer * 0.5 + 0.5), 6.0) * 0.32;
        vec3 edgeCol = mix(goldA, cyanA, smoothstep(-1.70, 1.70, pos.x + (triSet < 0.5 ? -0.28 : 0.34)));
        edgeCol = mix(edgeCol, goldB, vertexGlow * 0.54 + flash * 0.08);
        edgeCol = mix(edgeCol, cyanB, smoothstep(0.82, 1.00, pos.x / starR) * 0.36);
        vColor = edgeCol * (0.92 + dotted * 0.66 + vertexGlow * (2.10 + flash * 0.70) + midLineGlow);
        vAlpha = (0.36 + dotted * 0.42 + vertexGlow * 0.54 + midLineGlow * 0.16) * dotGate;
        maxRippleAmp = max(maxRippleAmp, vertexGlow * (0.60 + flash * 0.46) + dotted * highSpark * 0.10 + midLineGlow * 0.18);
      } else if (lane < 0.84) {
        float ringLane = (lane - 0.58) / 0.26;
        float ringId = floor(ringLane * 8.0);
        float ringLocal = fract(ringLane * 8.0);
        float theta = aUv.x * PI * 2.0 + t * (0.050 + ringId * 0.006) * (ringId < 4.0 ? 1.0 : -1.0);
        float r = 1.28 + ringId * 0.255 + ringLocal * 0.054 + sin(theta * 5.0 + t * 0.45 + seed * 4.0) * 0.008;
        float broken = smoothstep(0.18, 0.88, hash11(floor(aUv.x * (130.0 + ringId * 19.0)) + ringId * 41.3));
        float dash = pow(0.5 + 0.5 * sin(theta * (34.0 + ringId * 5.0) - t * (1.7 + ringId * 0.10)), 5.0);
        pos.xy = vec2(cos(theta), sin(theta)) * r;
        pos.z = -0.08 + ringId * 0.018 + (seed - 0.5) * 0.16;
        float cyanMix = smoothstep(0.06, 0.96, sin(theta + ringId * 0.44) * 0.5 + 0.5);
        vec3 ringCol = mix(goldA, cyanA, cyanMix);
        ringCol = mix(ringCol, goldB, dash * 0.25 + flash * 0.08);
        vColor = ringCol * (0.48 + dash * 0.82 + broken * 0.34 + flash * 0.16);
        vAlpha = (0.09 + dash * 0.32 + broken * 0.14) * (0.72 + highSpark * 0.18);
        maxRippleAmp = max(maxRippleAmp, dash * highSpark * 0.13 + flash * 0.11);
      } else if (lane < 0.955) {
        float q = (lane - 0.84) / 0.115;
        float theta = aUv.x * PI * 2.0 + sin(q * 6.0 + t * 0.22) * 0.16;
        float r = mix(3.15, 4.95, q) + snoise(vec3(theta * 0.45, q * 3.0, t * 0.045)) * 0.14;
        pos.xy = vec2(cos(theta), sin(theta * 0.97 + seed * 0.30)) * r;
        pos.z = -0.26 - q * 0.34 + (seed - 0.5) * 0.28;
        float waveDot = pow(0.5 + 0.5 * sin(theta * 42.0 + q * 16.0 - t * 1.25 + seed * 6.28), 4.0);
        vec3 outerCol = mix(goldA * 0.82, cyanA * 0.72, smoothstep(-0.60, 0.80, cos(theta - 0.40)));
        vColor = outerCol * (0.34 + waveDot * 0.50 + flash * 0.16);
        vAlpha = (0.055 + waveDot * 0.16) * (1.0 - smoothstep(0.84, 1.0, q));
        maxRippleAmp = max(maxRippleAmp, waveDot * 0.07 + flash * 0.08);
      } else {
        float q = (lane - 0.955) / 0.045;
        float dustSeed = hash11(seed * 991.0 + floor(aUv.x * 320.0));
        float angle = aUv.x * PI * 2.0 + t * (0.018 + dustSeed * 0.030);
        float r = mix(1.0, 5.3, pow(dustSeed, 0.68));
        pos = vec3(cos(angle) * r, sin(angle * 0.84 + dustSeed * 5.0) * r * 0.64, mix(-1.2, 0.65, q) + sin(t * 0.26 + dustSeed * 8.0) * 0.10);
        float twinkle = pow(0.5 + 0.5 * sin(t * (0.62 + dustSeed * 1.2) + aRand * 19.0), 8.0);
        vAlpha = (0.015 + twinkle * 0.13 + flash * 0.045) * smoothstep(0.03, 0.56, q);
        vColor = mix(goldA, cyanA, dustSeed) * (0.36 + twinkle * 0.64 + flash * 0.18);
        maxRippleAmp = max(maxRippleAmp, twinkle * (0.08 + highSpark * 0.15) + flash * 0.08);
      }
    }
  
    // ====================================================
    //  Legacy laser branch disabled: preset 7 is now HEXAGRAM.
    // ====================================================
    else if (uPreset > 99.5) {
      float lane = aUv.y;
      float seed = hash11(aRand * 1201.0);
      float beatFlash = smoothstep(0.020, 0.62, uBeat);
      float bassFlash = smoothstep(0.10, 0.82, uBass);
      float highSpark = smoothstep(0.045, 0.48, uTreble);
      float flash = clamp(beatFlash * 0.92 + bassFlash * 0.34 + uBurstAmt * 0.70, 0.0, 1.45);
  
      if (lane < 0.76) {
        float beamCount = 18.0;
        float beamId = floor(aUv.x * beamCount);
        float beamLocal = fract(aUv.x * beamCount);
        float beamSeed = hash11(beamId * 17.13 + seed * 7.9);
        float strandCount = 5.0;
        float strandId = floor(beamLocal * strandCount);
        float strandLocal = fract(beamLocal * strandCount);
        float strandSeed = hash11(beamId * 41.7 + strandId * 9.3 + seed * 3.1);
        float rayT = clamp(lane / 0.76, 0.0, 1.0);
        float spread = pow(rayT, 0.88);
        float angle = beamId / beamCount * PI * 2.0
          + (strandId - 2.0) * (0.010 + flash * 0.006)
          + t * (0.034 + beamSeed * 0.050)
          + sin(t * 0.16 + beamSeed * 6.2831) * 0.075;
        vec2 dir = vec2(cos(angle), sin(angle));
        vec2 normal = vec2(-dir.y, dir.x);
        float cross = (strandLocal - 0.5) * (0.10 + spread * 0.16);
        float radius = mix(1.32, 18.5 + beamSeed * 4.8, spread);
        float rayNoise = snoise(vec3(rayT * 1.5, beamSeed * 3.4, t * 0.12));
        float bend = (sin(rayT * 10.0 - t * (1.4 + beamSeed) + strandSeed * 6.0) * 0.020 + rayNoise * 0.030) * rayT;
        pos.xy = dir * radius + normal * (cross + bend);
        pos.z = 0.92 + (beamSeed - 0.5) * (0.72 + rayT * 0.88) + flash * (0.14 - rayT * 0.06);
  
        float core = exp(-pow((strandLocal - 0.50) / 0.17, 2.0));
        float shaft = smoothstep(0.0, 0.11, rayT) * (1.0 - smoothstep(0.96, 1.0, rayT));
        float pulse = pow(0.5 + 0.5 * sin(rayT * 26.0 - t * 4.4 + beamSeed * 6.2), 7.0);
        float originFlare = 1.0 - smoothstep(0.00, 0.16, rayT);
        float strobeFloor = 0.34 + beamSeed * 0.34;
        float strobeRaw = 0.5 + 0.5 * sin(t * (2.6 + beamSeed * 5.2) + beamSeed * 11.0 + strandSeed * 2.4);
        float strobeGate = pow(max(0.0, (strobeRaw - strobeFloor) / max(0.001, 1.0 - strobeFloor)), 2.8);
        strobeGate = max(strobeGate, flash * (0.18 + beamSeed * 0.42));
        vec3 cA = mix(vec3(0.00, 1.00, 0.92), vec3(1.00, 0.10, 0.70), step(0.32, beamSeed));
        vec3 cB = mix(vec3(0.38, 0.70, 1.0), vec3(1.0, 0.82, 0.12), step(0.66, beamSeed));
        vec3 laserCol = mix(cA, cB, pulse * 0.58 + highSpark * 0.24);
        vColor = laserCol * (0.80 + strobeGate * (1.15 + core * 1.85 + flash * 1.65 + originFlare * 1.15 + highSpark * 0.72));
        vAlpha = (0.006 + core * 0.13 + originFlare * 0.035 + pulse * 0.035) * shaft * strobeGate * (0.26 + flash * 0.34);
        maxRippleAmp = max(maxRippleAmp, core * (0.34 + flash * 0.60) + originFlare * 0.18 + pulse * highSpark * 0.20);
      } else if (lane < 0.98) {
        float q = (lane - 0.76) / 0.22;
        float band = floor(aUv.x * 46.0);
        float row = floor(q * 22.0);
        float tile = fract(aUv.x * 46.0);
        float tileSeed = hash11(band * 29.7 + seed * 11.3);
        float theta = aUv.x * PI * 2.0 + t * (0.16 + bassFlash * 0.10);
        float phi = (q - 0.5) * PI * 0.86;
        float ballR = 1.18 + bassFlash * 0.08 + sin(t * 0.54 + tileSeed * 6.0) * 0.012;
        float mosaic = step(0.46, hash11(row * 19.3 + band * 3.1));
        float facet = pow(0.5 + 0.5 * sin(tile * PI * 2.0 + tileSeed * 5.0), 3.8);
        pos.x = cos(theta) * cos(phi) * ballR;
        pos.y = sin(phi) * ballR;
        pos.z = sin(theta) * cos(phi) * ballR + 1.04;
        float silhouette = pow(abs(cos(phi)), 0.70);
        float equatorShade = 1.0 - smoothstep(0.10, 0.46, abs(q - 0.5));
        float flare = pow(max(0.0, cos(theta - t * 0.26)), 13.0) * (0.40 + flash * 0.52);
        float cutLine = smoothstep(0.88, 0.99, fract(row * 0.37 + band * 0.19 + tileSeed));
        vec3 baseMirror = mix(vec3(0.42, 0.50, 0.56), vec3(0.96, 0.98, 0.94), mosaic);
        vec3 coolFacet = mix(baseMirror, vec3(0.70, 0.92, 1.0), facet * 0.34);
        vColor = coolFacet * (0.62 + silhouette * 0.62 + equatorShade * 0.18 + facet * 0.42 + flare * 1.45 + cutLine * 0.28 + highSpark * 0.18);
        vAlpha = (0.06 + mosaic * 0.03 + facet * 0.055 + flare * 0.04 + cutLine * 0.025) * (0.34 + flash * 0.08);
        maxRippleAmp = max(maxRippleAmp, 0.02 + flash * 0.035 + flare * 0.035);
      } else {
        float q = (lane - 0.98) / 0.02;
        float dustSeed = hash11(seed * 991.0 + floor(aUv.x * 260.0));
        float drift = fract(aUv.x + t * (0.006 + dustSeed * 0.018) + dustSeed * 0.73);
        float angle = drift * PI * 2.0 + t * (0.10 + dustSeed * 0.14);
        float r = mix(2.0, 12.8, pow(dustSeed, 0.62));
        pos = vec3(cos(angle) * r, sin(angle * 0.84 + dustSeed * 5.0) * r * 0.56, mix(-16.0, 4.0, q) + sin(t * 0.30 + dustSeed * 9.0));
        float twinkle = pow(0.5 + 0.5 * sin(t * (0.72 + dustSeed * 1.4) + aRand * 20.0), 7.0);
        vAlpha = (0.012 + twinkle * 0.12 + flash * 0.045) * smoothstep(0.02, 0.42, q);
        vColor = mix(vec3(0.58, 0.92, 1.0), vec3(1.0, 0.74, 0.48), dustSeed) * (0.38 + twinkle * 0.54 + flash * 0.22);
        maxRippleAmp = max(maxRippleAmp, twinkle * (0.08 + highSpark * 0.18) + flash * 0.10);
      }
    }
  
    // ====================================================
    //  Preset 5: WALLPAPER PULSE
    //  Layered music-particle wallpaper: aurora ribbons, depth sparks,
    //  and cover-colored audio flow.
    // ====================================================
    else {
      float bassGlow = smoothstep(0.07, 0.78, uBass) * 0.34 + uBeat * 0.014;
      float midGlow = smoothstep(0.07, 0.62, uMid) * 0.42;
      float highGlow = smoothstep(0.04, 0.46, uTreble) * 0.46;
      float lane = aUv.y;
      float transition = clamp(uBurstAmt, 0.0, 1.0);
  
      if (lane < 0.80) {
        float laneWarp = snoise(vec3(aUv.x * 0.42, lane * 1.7, t * 0.026)) * 0.11 + (hash11(aRand * 73.1) - 0.5) * 0.045;
        float warpedLane = clamp(lane + laneWarp, 0.0, 0.80);
        float bandCoord = warpedLane / 0.80 * 5.65 + snoise(vec3(aUv.x * 0.82, lane * 2.25, t * 0.032)) * 0.62;
        float band = floor(bandCoord);
        float local = fract(bandCoord + hash11(band * 9.13 + aRand * 2.4) * 0.18);
        float bandN = clamp((band + 0.5) / 5.65, 0.0, 1.0);
        float seed = hash11(band * 19.17 + aRand * 31.0);
        float flow = fract(aUv.x + t * (0.0034 + bandN * 0.0038 + seed * 0.0022) + seed * 0.53);
        float arc = (flow - 0.5) * PI * (1.35 + bandN * 0.72 + seed * 0.24);
        float armCurve = sin(arc + bandN * 2.2 + seed * 5.3);
        float spiralRadius = 9.2 + bandN * 11.8 + seed * 6.0 + local * 2.9;
        float x = cos(arc * 0.72 + bandN * 0.92 + seed * 1.3) * spiralRadius + (flow - 0.5) * (13.5 + bandN * 9.5);
        float ribbonPhase = flow * PI * 2.0 * (0.55 + bandN * 0.24 + seed * 0.10) + t * (0.010 + bandN * 0.007) + seed * 5.7;
        float broadWave = sin(ribbonPhase) * 0.92;
        float fineWave = sin(ribbonPhase * (1.36 + seed * 0.62) - t * 0.044 + seed * 5.0) * 0.045;
        float yBase = (bandN - 0.5) * 13.2 + armCurve * (2.3 + bandN * 1.6) + (seed - 0.5) * 1.85 + snoise(vec3(bandN * 2.0, flow * 0.62, seed)) * 0.92;
        float ridgeCenter = 0.43 + (seed - 0.5) * 0.18;
        float ridge = exp(-pow((local - ridgeCenter) / (0.25 + seed * 0.04), 2.0));
        float softMask = smoothstep(0.010, 0.12, lane) * (1.0 - smoothstep(0.72, 0.81, lane));
        float ribbonNoise = snoise(vec3(flow * 1.18 + seed, bandN * 2.0, t * 0.018)) * 0.74;
        float zLayer = mix(-23.5, 15.5, bandN) + (seed - 0.5) * 6.0;
  
        pos.x = x + ribbonNoise * 1.40 + sin(t * 0.012 + seed * 8.0) * 0.22;
        pos.y = yBase + broadWave + fineWave + (local - 0.5) * (0.58 + ridge * 0.14);
        pos.z = zLayer + broadWave * 1.35 + ribbonNoise * 1.85;
  
        float pulseLine = 0.5 + 0.5 * sin(ribbonPhase * (1.7 + seed * 0.9) - t * 0.32 + seed * 6.0);
        vec3 aurora = mix(vec3(0.52, 0.86, 1.0), vec3(0.70, 0.58, 1.0), bandN);
        aurora = mix(aurora, vec3(0.96, 0.98, 0.92), bassGlow * 0.05);
        vAlpha = (0.18 + ridge * 0.78 + pulseLine * highGlow * 0.035 + bassGlow * 0.025) * softMask * (0.96 + transition * 0.02);
        vColor = mix(coverColor, aurora, 0.62 + ridge * 0.22) * (0.76 + ridge * 0.86 + pulseLine * highGlow * 0.05 + bassGlow * 0.04);
        maxRippleAmp = max(maxRippleAmp, ridge * (0.12 + midGlow * 0.05) + pulseLine * highGlow * 0.045 + bassGlow * 0.030);
      } else {
        float q = (lane - 0.80) / 0.20;
        float seed = hash11(aRand * 917.0 + floor(q * 130.0));
        float depth = mix(-32.0, 18.0, seed);
        float drift = fract(aUv.x + t * (0.0014 + seed * 0.0048) + seed * 0.63);
        float cluster = snoise(vec3(seed * 2.0, q * 3.2, t * 0.007));
        float x = (drift - 0.5) * (45.0 + seed * 22.0) + cluster * 3.4;
        float y = (hash11(aRand * 331.0 + seed * 5.0) - 0.5) * 22.0 + sin(t * (0.018 + seed * 0.028) + seed * 7.0) * 0.86;
        float z = depth + sin(t * (0.020 + seed * 0.032) + aRand * 8.0) * 1.05;
        float twinkle = pow(0.5 + 0.5 * sin(t * (0.24 + seed * 0.42) + aRand * 17.0), 5.0);
        float dust = smoothstep(0.22, 0.98, hash11(aRand * 661.0 + floor(q * 160.0)));
  
        pos = vec3(x, y, z);
        vAlpha = dust * (0.16 + twinkle * 0.46 + highGlow * 0.025 + bassGlow * 0.018) * (1.0 - q * 0.06);
        vColor = mix(coverColor, vec3(0.92, 0.97, 1.0), 0.62 + twinkle * 0.14) * (0.72 + twinkle * 0.62 + bassGlow * 0.025);
        maxRippleAmp = max(maxRippleAmp, twinkle * highGlow * 0.055 + dust * bassGlow * 0.030);
      }
  
      if (transition > 0.001) {
        float bloom = smoothstep(0.0, 1.0, transition);
        vec2 burstVec = pos.xy + vec2(hash11(aRand * 31.0) - 0.5, hash11(aRand * 47.0) - 0.5) * 0.75;
        vec2 burstDir = burstVec / max(length(burstVec), 0.001);
        pos.xy += burstDir * bloom * 0.026;
        pos.xy += vec2(snoise(vec3(aRand, t * 0.014, 1.0)), snoise(vec3(aRand, t * 0.014, 5.0))) * bloom * 0.06;
        pos.xy *= 1.0 + bloom * 0.014;
        pos.z += (hash11(aRand * 123.0) - 0.5) * bloom * 0.18;
        vAlpha *= 0.86 + bloom * 0.22;
        maxRippleAmp = max(maxRippleAmp, bloom * 0.10);
      }
    }
  
    // ====================================================
    //  鼠标交互 (仅 SILK)
    // ====================================================
    if (uMouseActive > 0.5 && uPreset < 0.5) {
      float mdx = pos.x - uMouseXY.x;
      float mdy = pos.y - uMouseXY.y;
      float md = sqrt(mdx*mdx + mdy*mdy);
      if (md < 1.0) {
        float push = (1.0 - md) * (1.0 - md);
        pos.z += push * 0.55;
      }
    }
  
    // ====================================================
    //  v8 手势遮挡 — uHandActive 是 0..1 平滑过渡, 大半径推开
    // ====================================================
    if (uHandActive > 0.01) {
      float hdx = pos.x - uHandXY.x;
      float hdy = pos.y - uHandXY.y;
      float hd = sqrt(hdx*hdx + hdy*hdy);
      float rad = 1.55;
      if (hd < rad) {
        float push = (rad - hd) / rad;
        push = push * push * uHandActive;
        pos.z += push * 1.10;
        vec2 outDir = vec2(hdx, hdy) / max(0.001, hd);
        pos.xy += outDir * push * 0.28;
      }
    }
    if (uGestureGrip > 0.001) {
      float grip = clamp(uGestureGrip, 0.0, 1.0);
      float gripWave = 0.5 + 0.5 * sin(uTime * 2.2 + aRand * 6.2831);
      pos.xy *= mix(1.0, 0.66 + gripWave * 0.035, grip);
      pos.z += grip * (0.18 + uBass * 0.22 + gripWave * 0.10);
    }
  
    // ====================================================
    //  通用: 离散感 / 扭曲
    // ====================================================
    if (uScatter > 0.001) {
      vec2 jdir = vec2(cos(aRand * 6.2831), sin(aRand * 6.2831));
      pos.xy += jdir * uScatter * (0.05 + uTreble * 0.10);
    }
    if (uTwist > 0.001 && uPreset < 0.5) {
      float ta = uTwist * pos.z * 0.6;
      float cs = cos(ta), sn = sin(ta);
      pos.xy = mat2(cs, -sn, sn, cs) * pos.xy;
    }
  
    // 颜色
    float vinylHiResGuard = smoothstep(1.08, 1.55, uCoverRes) * step(3.5, uPreset) * (1.0 - step(4.5, uPreset));
    float edgeBoost = uEdgeEnabled * edgeVal * mix(1.0, 0.42, vinylHiResGuard);
    vSourceLum = dot(max(vColor, vec3(0.0)), vec3(0.299, 0.587, 0.114));
    float blackParticleGuard = 1.0 - smoothstep(0.025, 0.115, vSourceLum);
    vEdgeBoost = edgeBoost * (uPreset > 3.5 ? 0.22 : 1.0) * (1.0 - blackParticleGuard);
    vColor = pow(max(vColor, vec3(0.0)), vec3(1.0 / max(0.35, uColorBoost)));
    float edgeColorMix = edgeBoost * (uPreset > 3.5 ? 0.20 : 0.50) * (1.0 - blackParticleGuard);
    vColor = mix(vColor, vColor + vec3(0.20), edgeColorMix);
    float tintLum = max(max(vColor.r, vColor.g), vColor.b);
    vec3 tintedColor = uTintColor * max(0.24, tintLum * 1.12);
    vColor = mix(vColor, tintedColor, clamp(uTintStrength, 0.0, 1.0) * (1.0 - blackParticleGuard));
  
    vBright = 0.82 + maxRippleAmp * 0.55 + uBass * 0.10 + edgeBoost * 0.30 + uEnergy * 0.05 + uBurstAmt * 0.40;
    if (uPreset > 6.5) {
      vBright = 1.04 + maxRippleAmp * 0.88 + uBass * 0.05 + uEnergy * 0.06 + uBeat * 0.58 + uBurstAmt * 0.24;
    } else if (uPreset > 99.5) {
      vBright = 1.02 + maxRippleAmp * 0.92 + uBass * 0.05 + uEnergy * 0.08 + uBeat * 0.72 + uBurstAmt * 0.22;
    } else if (uPreset > 4.5) {
      vBright = 0.94 + maxRippleAmp * 0.34 + uBass * 0.020 + uEnergy * 0.026 + uBurstAmt * 0.025;
    } else if (uPreset > 3.5) {
      vBright = 0.94 + maxRippleAmp * 0.64 + uBass * 0.08 + edgeBoost * 0.12 + uEnergy * 0.05 + uBeat * 0.16 + uBurstAmt * 0.16;
    }
    vRipple = clamp(maxRippleAmp * 1.5, 0.0, 1.0);
  
    if (uHasDepth > 0.5 && uPreset < 0.5) {
      float bgMul = mix(1.0, 0.55, uBgFade * (1.0 - fgMask));
      vBright *= bgMul;
    }
    vBright += uGestureGrip * 0.22;
    float loadingMistSize = 1.0;
  
    // 加载形态: 雾状微尘流，避免廉价旋转圆环
    if (uLoading > 0.001) {
      float mistSeed = hash11(aRand * 931.7);
      float mistLayer = floor(mistSeed * 4.0);
      float layerN = (mistLayer + 0.5) / 4.0;
      float mistAngle = aRand * 6.2831 + uTime * (0.16 + mistSeed * 0.18) + snoise(vec3(aRand * 2.1, uTime * 0.24, 2.0)) * 1.85;
      float mistR = mix(1.35, 3.15, sqrt(hash11(aRand * 127.3))) * (1.0 + sin(uTime * 0.42 + aRand * 7.0) * 0.13);
      vec2 mistCurl = vec2(
        snoise(vec3(aRand * 4.1, uTime * 0.32, 3.0)),
        snoise(vec3(aRand * 4.7, uTime * 0.30, 8.0))
      );
      float mistBreath = 0.5 + 0.5 * sin(uTime * (0.82 + mistSeed * 0.55) + aRand * 17.0);
      float mistRibbon = sin(mistAngle * (1.35 + layerN * 0.55) + uTime * 0.34 + mistSeed * 4.0);
      float glowPick = smoothstep(0.88, 0.997, hash11(aRand * 1501.0 + mistLayer * 17.0));
      float dustPick = 0.34 + glowPick * 0.66;
      vec3 mistPos = vec3(
        cos(mistAngle) * mistR * (1.24 + mistCurl.x * 0.16) + mistCurl.x * 0.72,
        sin(mistAngle * 0.82 + mistRibbon * 0.25) * mistR * (0.56 + layerN * 0.10) + mistCurl.y * 0.62,
        (layerN - 0.5) * 4.85 + mistCurl.x * 0.56 + mistBreath * 0.36 + mistRibbon * 0.24
      );
      vec3 mistCol = mix(vec3(0.62, 0.86, 0.84), vec3(0.36, 0.46, 0.78), mistSeed);
      mistCol = mix(mistCol, vec3(0.94, 1.0, 0.97), glowPick * (0.45 + mistBreath * 0.35));
      vColor = mix(vColor, mistCol, uLoading * 0.78);
      vBright = mix(vBright, 0.20 + mistBreath * 0.18 + abs(mistCurl.x) * 0.06 + glowPick * (0.72 + abs(mistRibbon) * 0.24), uLoading);
      vAlpha = mix(vAlpha, 0.08 + mistBreath * 0.11 + dustPick * 0.11 + glowPick * 0.30, uLoading);
      pos = mix(pos, mistPos, uLoading);
      loadingMistSize = 1.26 + mistBreath * 0.24 + abs(mistRibbon) * 0.14 + glowPick * 0.78;
    }
  
    vec4 mvPos = modelViewMatrix * vec4(pos, 1.0);
    float depthSize = 36.0 / max(0.5, -mvPos.z);
    float audioBoost = 1.0 + maxRippleAmp * 0.7 + edgeBoost * 0.55 + uBeat * 0.30 + uBurstAmt * 0.5;
    float sz = clamp(depthSize * audioBoost, 1.05, 4.95);
    if (uPreset > 6.5) {
      float hexDrive = uBeat * 0.62 + uBass * 0.18 + uTreble * 0.26 + uBurstAmt * 0.18;
      sz = clamp(depthSize * (1.04 + hexDrive * 0.72), 0.92, 4.60);
    } else if (uPreset > 99.5) {
      float laserDrive = uBeat * 0.80 + uBass * 0.22 + uTreble * 0.34 + uBurstAmt * 0.22;
      sz = clamp(depthSize * (1.45 + laserDrive * 1.35), 1.25, 10.80);
      float laserBallMask = step(0.76, aUv.y) * (1.0 - step(0.98, aUv.y));
      float laserRayMask = 1.0 - step(0.76, aUv.y);
      float laserBallSize = clamp(depthSize * (0.72 + laserDrive * 0.18), 0.72, 2.85);
      float laserRaySize = clamp(depthSize * (0.84 + laserDrive * 0.30), 0.82, 3.65);
      sz = mix(sz, laserRaySize, laserRayMask);
      sz = mix(sz, laserBallSize, laserBallMask);
    } else if (uPreset > 4.5) {
      float flowDrive = uBass * 0.070 + uMid * 0.046 + uTreble * 0.060 + uBurstAmt * 0.090 + uBeat * 0.055;
      sz = clamp(depthSize * (1.05 + flowDrive), 1.00, 5.45);
    } else if (uPreset > 3.5) {
      float ringDrive = uBass * 0.30 + uMid * 0.18 + uTreble * 0.22 + uBeat * 0.30;
      sz = clamp(depthSize * (0.90 + ringDrive * 0.62), 1.05, 3.90);
    }
    // 加载态下粒子稍大
    sz = mix(sz, sz * loadingMistSize, uLoading);
    gl_PointSize = sz * uPixel * uPointScale;
    gl_Position = projectionMatrix * mvPos;
  }
  `;

  // ----- 片元 Shader -----
  fs = `
  precision highp float;
  uniform sampler2D uDotTex;
  uniform float uAlpha, uPreset, uParticleDim;
  varying vec3 vColor;
  varying float vBright, vRipple, vEdgeBoost, vAlpha, vSourceLum;
  
  void main(){
    vec4 tex = texture2D(uDotTex, gl_PointCoord);
    float dotDist = length(gl_PointCoord - vec2(0.5)) * 2.0;
    if (uPreset > 6.5) {
      float crispDot = smoothstep(1.02, 0.42, dotDist);
      tex.a = min(tex.a, crispDot) * (0.78 + crispDot * 0.22);
    }
    if (tex.a < 0.02) discard;
    vec3 col = vColor * vBright;
    col = mix(col, col * 1.3 + vec3(0.05), vEdgeBoost * 0.35);
    col = mix(col, col * 1.2, vRipple * 0.4);
    float keepBlack = 1.0 - smoothstep(0.025, 0.115, vSourceLum);
    float nonBlack = 1.0 - keepBlack;
    float readableRim = smoothstep(0.44, 0.94, dotDist) * (1.0 - smoothstep(0.94, 1.08, dotDist)) * tex.a;
    float outLum = dot(col, vec3(0.299, 0.587, 0.114));
    float lightParticle = smoothstep(0.50, 0.82, outLum) * nonBlack;
    float darkParticle = (1.0 - smoothstep(0.20, 0.50, outLum)) * nonBlack;
    col = mix(col, vec3(0.0), readableRim * lightParticle * 0.38);
    col = mix(col, vec3(1.0), readableRim * darkParticle * 0.20);
    col = clamp(col, vec3(0.0), vec3(1.6));
    gl_FragColor = vec4(col, tex.a * uAlpha * uParticleDim * vAlpha);
  }
  `;

  material = new THREE.ShaderMaterial({
    uniforms: uniforms, vertexShader: vs, fragmentShader: fs,
    transparent: true, depthWrite: false, blending: THREE.NormalBlending,
  });

  bloomVs = vs
    .replace('uniform float uMouseActive, uPixel, uColorMixT, uLoading;', 'uniform float uMouseActive, uPixel, uColorMixT, uLoading, uBloomSize;')
    .replace('gl_PointSize = sz * uPixel * uPointScale;', 'gl_PointSize = sz * uPixel * uPointScale * uBloomSize;');

  bloomFs = `
  precision highp float;
  uniform sampler2D uDotTex;
  uniform float uAlpha, uBloomStrength, uPreset, uParticleDim;
  varying vec3 vColor;
  varying float vBright, vRipple, vEdgeBoost, vAlpha, vSourceLum;
  
  void main(){
    vec4 tex = texture2D(uDotTex, gl_PointCoord);
    if (tex.a < 0.01) discard;
    float soft = tex.a * tex.a;
    vec3 col = vColor * (0.55 + vBright * 0.62);
    col = mix(col, col + vec3(0.22, 0.18, 0.10), vEdgeBoost * 0.35);
    col = clamp(col, vec3(0.0), vec3(1.8));
    float pulse = 1.0 + vRipple * 0.65;
    float keepBlack = 1.0 - smoothstep(0.025, 0.115, vSourceLum);
    float bloomKeep = 1.0 - keepBlack * 0.92;
    gl_FragColor = vec4(col, soft * uAlpha * uBloomStrength * uParticleDim * pulse * 0.55 * vAlpha * bloomKeep);
  }
  `;

  bloomMaterial = new THREE.ShaderMaterial({
    uniforms: uniforms, vertexShader: bloomVs, fragmentShader: bloomFs,
    transparent: true, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending,
  });

  bloomParticles = new THREE.Points(geo, bloomMaterial);

  bloomParticles.frustumCulled = false;

  bloomParticles.renderOrder = 0;

  scene.add(bloomParticles);

  particles = new THREE.Points(geo, material);

  particles.frustumCulled = false;

  particles.renderOrder = 1;

  scene.add(particles);

  console.log('v7 shell loaded, JS pending');
}
