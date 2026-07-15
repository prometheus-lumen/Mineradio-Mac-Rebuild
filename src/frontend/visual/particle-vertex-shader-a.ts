const PARTICLE_VERTEX_SHADER_A = `
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
  
`;
