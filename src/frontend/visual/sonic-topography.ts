/*
 * Adapted from yin-yizhen/sonic-topography for personal non-commercial use.
 * Source: https://github.com/yin-yizhen/sonic-topography
 * License: Non-Commercial Learning License (see docs/licenses/sonic-topography.txt)
 */

interface SonicTopographyRipple {
  pos: THREE.Vector2;
  time: number;
  strength: number;
  isActive: number;
  rippleType: number;
}

var sonicTopographyGroup: THREE.Group | null;
var sonicTopographyMesh: THREE.InstancedMesh | null;
var sonicTopographyMaterial: THREE.ShaderMaterial | null;
var sonicTopographyFloatingMesh: THREE.InstancedMesh | null;
var sonicTopographyFloatingMaterial: THREE.MeshBasicMaterial | null;
var sonicTopographyRipples: SonicTopographyRipple[];
var sonicTopographyRippleIndex: number;
var sonicTopographyLastBeat: number;
var sonicTopographyLastSharp: number;
var sonicTopographyLastRippleAt: number;
var sonicTopographyBands: number[];
var sonicTopographyPointerBound: boolean;
var sonicTopographySettingsBound: boolean;
var sonicTopographyGridSize: number;
var sonicTopographyFloatingCount: number;
var sonicTopographyRebuildTimer: number;

const SONIC_TOPOGRAPHY_TERRAIN_SIZE = 168;
const SONIC_TOPOGRAPHY_SCENE_SCALE = 0.10;
const SONIC_TOPOGRAPHY_GRID_MIN = 96;
const SONIC_TOPOGRAPHY_GRID_MAX = 224;
const SONIC_TOPOGRAPHY_DEFAULT_BANDS = [90, 92, 50, 50, 50, 50, 50, 48];
const SONIC_TOPOGRAPHY_DEFAULT_ENABLED = [true, true, true, true, true, true, true, true];
const SONIC_TOPOGRAPHY_THEMES: Record<string, { background: string; fog: string; cool: string; warm: string; accent: string; glow: number }> = {
  'ink-wash': { background: '#FFFFFF', fog: '#FFFFFF', cool: '#000000', warm: '#000000', accent: '#A8BDC2', glow: 110 },
  'nocturnal': { background: '#03050A', fog: '#03050A', cool: '#004DFF', warm: '#FF331A', accent: '#33E6FF', glow: 100 },
  'neon-tokyo': { background: '#030105', fog: '#030105', cool: '#FF1A99', warm: '#1AFFCC', accent: '#FFFFFF', glow: 150 },
  'cyber-forest': { background: '#030503', fog: '#030503', cool: '#1AFF80', warm: '#CCFF1A', accent: '#99FF4D', glow: 130 },
  'minimal-monochrome': { background: '#050505', fog: '#050505', cool: '#E6E6E6', warm: '#FFFFFF', accent: '#FFFFFF', glow: 80 },
  'glacier-day': { background: '#D8E6EA', fog: '#E5EEF0', cool: '#2D8EA3', warm: '#D96F4D', accent: '#2F5963', glow: 82 },
  'koi-pond': { background: '#123A36', fog: '#0F2C2A', cool: '#55D6B2', warm: '#F2A65A', accent: '#C8EEE4', glow: 112 },
  'coral-reef': { background: '#40252A', fog: '#2F2024', cool: '#5FCAD0', warm: '#E8705F', accent: '#F0B7A4', glow: 108 },
  'moss-glass': { background: '#2E3A24', fog: '#24301E', cool: '#88C8A3', warm: '#D6C36D', accent: '#DDE8B3', glow: 98 },
  'blue-hour': { background: '#273C55', fog: '#1D3148', cool: '#8BC5E7', warm: '#F28C72', accent: '#CFE7F4', glow: 105 },
  'porcelain-teal': { background: '#DDE8E4', fog: '#EEF4F1', cool: '#24786F', warm: '#B85D4D', accent: '#4F706A', glow: 78 },
  'wine-signal': { background: '#3A2430', fog: '#2F202A', cool: '#83C5BE', warm: '#D95D73', accent: '#F0CBD3', glow: 106 },
  'daybreak-lime': { background: '#D9E7C8', fog: '#E6EFD9', cool: '#2A7C72', warm: '#C65B47', accent: '#5C6F42', glow: 80 },
};

const SONIC_TOPOGRAPHY_VERTEX_SHADER = `
  uniform float uTime;
  uniform float uSubBass;
  uniform float uBass;
  uniform float uLowMid;
  uniform float uMid;
  uniform float uHighMid;
  uniform float uSmoothness;
  uniform float uDensity;
  uniform float uEnergy;
  uniform float uAmplitude;

  struct Ripple {
    vec2 pos;
    float time;
    float strength;
    float isActive;
    float rippleType;
  };
  uniform Ripple uRipples[10];

  varying vec2 vUv;
  varying float vElevation;
  varying float vDistance;
  varying vec2 vRippleAnim;
  varying vec3 vNormal;
  varying float vRelativeY;
  varying vec2 vInstancePos;
  varying float vInstanceRandom;

  vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec2 mod289(vec2 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec3 permute(vec3 x) { return mod289(((x * 34.0) + 1.0) * x); }
  float snoise(vec2 v) {
    const vec4 C = vec4(0.211324865405187, 0.366025403784439, -0.577350269189626, 0.024390243902439);
    vec2 i = floor(v + dot(v, C.yy));
    vec2 x0 = v - i + dot(i, C.xx);
    vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
    vec4 x12 = x0.xyxy + C.xxzz;
    x12.xy -= i1;
    i = mod289(i);
    vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0)) + i.x + vec3(0.0, i1.x, 1.0));
    vec3 m = max(0.5 - vec3(dot(x0, x0), dot(x12.xy, x12.xy), dot(x12.zw, x12.zw)), 0.0);
    m = m * m;
    m = m * m;
    vec3 x = 2.0 * fract(p * C.www) - 1.0;
    vec3 h = abs(x) - 0.5;
    vec3 ox = floor(x + 0.5);
    vec3 a0 = x - ox;
    m *= 1.79284291400159 - 0.85373472095314 * (a0 * a0 + h * h);
    vec3 g;
    g.x = a0.x * x0.x + h.x * x0.y;
    g.yz = a0.yz * x12.xz + h.yz * x12.yw;
    return 130.0 * dot(m, g);
  }

  float random(vec2 st) {
    return fract(sin(dot(st.xy, vec2(12.9898, 78.233))) * 43758.5453123);
  }

  void main() {
    vUv = uv;
    vNormal = normal;

    vec4 instancePos = instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0);
    vec2 pos2D = instancePos.xz;
    vInstancePos = pos2D;
    float centerDist = length(pos2D);
    vDistance = centerDist;
    float rnd = random(pos2D);
    vInstanceRandom = rnd;

    vec2 movingPos = pos2D * 0.05 + vec2(uTime * 0.1, uTime * 0.05);
    float baseNoise = (snoise(movingPos) + 1.0) * 0.5;
    float wave = sin(pos2D.x * 0.15 + pos2D.y * 0.1 - uTime * 0.6) * 0.5 + 0.5;
    float globalFalloff = smoothstep(60.0, 30.0, centerDist);
    float idleElevation = mix(baseNoise, wave, uSmoothness * 0.5 + 0.2) * 0.8 * globalFalloff;

    float subRegion = smoothstep(25.0, 0.0, centerDist);
    float subLift = uSubBass * subRegion * 5.0;

    float bassNoise = snoise(pos2D * 0.1 - vec2(0.0, uTime * 0.2));
    float bassRegion = smoothstep(35.0, 5.0, centerDist + bassNoise * 5.0);
    float bassLift = uBass * bassRegion * smoothstep(0.0, 1.0, rnd + uDensity * 0.5) * 4.0;

    float lowMidNoise = snoise(pos2D * 0.05 + vec2(uTime * 0.1, 0.0));
    float lowMidLift = uLowMid * (lowMidNoise * 0.5 + 0.5) * 2.5;

    float riverFlow = sin(pos2D.x * 0.2 + pos2D.y * 0.2 + snoise(pos2D * 0.1) * 2.0 - uTime * 2.0);
    float midLift = uMid * max(0.0, riverFlow) * 3.0;

    float highMidRegion = smoothstep(10.0, 45.0, centerDist);
    float highMidLift = 0.0;
    if (fract(rnd * 13.3) > 0.8) {
      highMidLift = uHighMid * highMidRegion * fract(rnd * 7.7) * 2.5;
    }

    float audioElevation = subLift + bassLift + lowMidLift + midLift + highMidLift;
    if (rnd > 0.99) audioElevation += uEnergy * 5.0;
    audioElevation *= globalFalloff;
    audioElevation = max(0.0, audioElevation - 0.2) * uAmplitude;

    float elevation = idleElevation + audioElevation;
    float rippleElevation = 0.0;
    float rippleIntensityNormal = 0.0;
    float rippleIntensityWhite = 0.0;

    for (int i = 0; i < 10; i++) {
      if (uRipples[i].isActive > 0.0) {
        float dist = length(pos2D - uRipples[i].pos);
        float timeSince = uTime - uRipples[i].time;
        float curSpeed = 15.0;
        float curWidth = 3.0;
        float curFadeDist = 15.0;
        float elevationScale = 4.0;
        if (uRipples[i].rippleType > 0.5) {
          curSpeed = 20.0;
          curWidth = 1.0;
          curFadeDist = 8.0;
          elevationScale = 1.0;
        }
        float waveRadius = timeSince * curSpeed;
        float d = dist - waveRadius;
        float rippleWave = exp(-d * d / curWidth);
        float fade = exp(-waveRadius / curFadeDist);
        float rPulse = rippleWave * fade * uRipples[i].strength;
        rippleElevation += rPulse * elevationScale;
        if (uRipples[i].rippleType > 0.5) rippleIntensityWhite += rPulse;
        else rippleIntensityNormal += rPulse;
      }
    }

    elevation += rippleElevation;
    vRippleAnim = vec2(clamp(rippleIntensityNormal, 0.0, 1.0), clamp(rippleIntensityWhite, 0.0, 1.0));
    vElevation = elevation;

    float yPos = position.y + 0.5;
    vRelativeY = yPos;
    float totalHeight = 1.0 + elevation;
    vec3 pos = position;
    pos.y = -0.5 + yPos * totalHeight;

    vec4 worldPosition = modelMatrix * instanceMatrix * vec4(pos, 1.0);
    gl_Position = projectionMatrix * viewMatrix * worldPosition;
  }
`;

const SONIC_TOPOGRAPHY_FRAGMENT_SHADER = `
  uniform float uTime;
  uniform float uPresence;
  uniform float uBrilliance;
  uniform float uAir;
  uniform float uWarmth;
  uniform float uBrightness;
  uniform float uSharpness;
  uniform vec3 uBaseColor1;
  uniform vec3 uBaseColor2;
  uniform vec3 uFogColor;
  uniform vec3 uCoolCore;
  uniform vec3 uCoolEdge;
  uniform vec3 uWarmCore;
  uniform vec3 uWarmEdge;
  uniform vec3 uRippleColor;
  uniform float uGlowIntensity;

  varying vec2 vUv;
  varying float vElevation;
  varying float vDistance;
  varying vec2 vRippleAnim;
  varying vec3 vNormal;
  varying float vRelativeY;
  varying vec2 vInstancePos;
  varying float vInstanceRandom;

  void main() {
    bool isTop = vNormal.y > 0.5;
    float distFromTop = 1.0 - vRelativeY;
    float rnd = vInstanceRandom;
    float centerDist = length(vInstancePos);
    float normElevation = clamp(vElevation / 8.0, 0.0, 1.0);

    vec3 coolCore = uCoolCore;
    vec3 coolEdge = uCoolEdge;
    vec3 warmCore = uWarmCore;
    vec3 warmEdge = uWarmEdge;
    float warmBlend = smoothstep(0.0, 1.0, uWarmth * 1.5 + (0.5 - centerDist / 80.0));
    vec3 zoneCore = mix(coolCore, warmCore, warmBlend);
    vec3 zoneEdge = mix(coolEdge, warmEdge, warmBlend);
    vec3 targetGlow = mix(zoneCore, zoneEdge, fract(rnd * 11.0));
    float distFade = 1.0 - smoothstep(40.0, 75.0, centerDist);
    vec3 brightCool = mix(coolCore, vec3(1.0), 0.24);
    targetGlow = mix(targetGlow, brightCool, uBrightness * 0.6);
    vec3 currentGlow = mix(uBaseColor2, targetGlow, normElevation) * uGlowIntensity * distFade;
    currentGlow = mix(currentGlow, uRippleColor, vRippleAnim.x);
    currentGlow = mix(currentGlow, vec3(1.0), vRippleAnim.y);

    vec3 bodyColor = mix(uBaseColor1, uBaseColor2, vRelativeY * distFade);
    vec3 finalColor;
    if (isTop) {
      float topIntensity = smoothstep(0.0, 0.4, normElevation);
      float twinkleDistFalloff = smoothstep(60.0, 30.0, centerDist);
      float twinkleMultiplier = mix(twinkleDistFalloff, 1.0, smoothstep(0.01, 0.1, normElevation));
      bool isSparkleTarget = fract(rnd * 31.0) > 0.95;
      if (isSparkleTarget && normElevation < 0.1) topIntensity += uAir * 2.0 * twinkleMultiplier;
      finalColor = mix(uBaseColor2, currentGlow, topIntensity);
      float edgeX = smoothstep(0.05, 0.01, vUv.x) + smoothstep(0.95, 0.99, vUv.x);
      float edgeY = smoothstep(0.05, 0.01, vUv.y) + smoothstep(0.95, 0.99, vUv.y);
      float edge = min(edgeX + edgeY, 1.0);
      finalColor += currentGlow * edge * 0.8 * (topIntensity + 0.3);
      float flashChance = smoothstep(0.3, 1.0, uPresence);
      if (fract(rnd * 53.0) > 0.98 - flashChance * 0.1) {
        float flashSync = sin(uTime * 40.0 + rnd * 100.0) * 0.5 + 0.5;
        finalColor += mix(vec3(1.0), vec3(0.5, 1.0, 1.0), rnd) * flashSync * uPresence * (1.0 + uSharpness * 2.0) * twinkleMultiplier;
      }
      if (edge > 0.5 && fract(rnd * 89.0 + uTime * 2.0) > 0.98) {
        finalColor += vec3(1.0) * uBrilliance * 3.0 * twinkleMultiplier;
      }
    } else {
      float verticalFalloff = mix(1.0, 3.0, uSharpness);
      float sideGlow = smoothstep(0.5 / verticalFalloff, 0.0, distFromTop) * normElevation;
      if (normElevation < 0.02) sideGlow = 0.0;
      finalColor = mix(bodyColor, currentGlow, sideGlow * 1.5);
      float rimGlow = smoothstep(0.03, 0.0, distFromTop) * normElevation;
      finalColor += currentGlow * rimGlow;
    }

    finalColor += uRippleColor * vRippleAnim.x * 0.6;
    finalColor += vec3(1.0) * vRippleAnim.y * 1.2;
    float aerialFog = smoothstep(30.0, 65.0, vDistance);
    vec3 atmosphericColor = mix(uBaseColor1, uBaseColor2, 0.4);
    finalColor = mix(finalColor, atmosphericColor, aerialFog * 0.35);
    float alphaFade = 1.0 - smoothstep(55.0, 78.0, vDistance);
    finalColor = mix(finalColor, uFogColor, (1.0 - alphaFade) * 0.45);
    gl_FragColor = vec4(finalColor, alphaFade);
  }
`;

function initializeSonicTopographyState(): void {
  sonicTopographyGroup = null;
  sonicTopographyMesh = null;
  sonicTopographyMaterial = null;
  sonicTopographyFloatingMesh = null;
  sonicTopographyFloatingMaterial = null;
  sonicTopographyRipples = Array.from({ length: 10 }, function() {
    return { pos: new THREE.Vector2(), time: -100, strength: 0, isActive: 0, rippleType: 0 };
  });
  sonicTopographyRippleIndex = 0;
  sonicTopographyLastBeat = 0;
  sonicTopographyLastSharp = 0;
  sonicTopographyLastRippleAt = -10;
  sonicTopographyBands = new Array(8).fill(0);
  sonicTopographyPointerBound = false;
  sonicTopographySettingsBound = false;
  sonicTopographyGridSize = 0;
  sonicTopographyFloatingCount = 0;
  sonicTopographyRebuildTimer = 0;
  bindSonicTopographyPointerRipples();
}

function ensureSonicTopographyLayer(): void {
  if (sonicTopographyGroup) return;
  var desiredGridSize = Math.round(SONIC_TOPOGRAPHY_GRID_MIN + (SONIC_TOPOGRAPHY_GRID_MAX - SONIC_TOPOGRAPHY_GRID_MIN) * clampRange(Number(fx.topographyTerrainDensity) || 0, 0, 100) / 100);
  var desiredFloatingCount = Math.round(clampRange(Number(fx.topographyFloatingCount) || 0, 0, 100));
  sonicTopographyGridSize = desiredGridSize;
  sonicTopographyFloatingCount = desiredFloatingCount;

  var spacing = SONIC_TOPOGRAPHY_TERRAIN_SIZE / sonicTopographyGridSize;
  var boxWidth = spacing * (0.9 / 1.05);
  var geometry = new THREE.BoxGeometry(boxWidth, 1, boxWidth);
  var terrainUniforms: Record<string, THREE.IUniform> = {
    uTime: { value: 0 },
    uSubBass: { value: 0 },
    uBass: { value: 0 },
    uLowMid: { value: 0 },
    uMid: { value: 0 },
    uHighMid: { value: 0 },
    uPresence: { value: 0 },
    uBrilliance: { value: 0 },
    uAir: { value: 0 },
    uWarmth: { value: 0 },
    uBrightness: { value: 0 },
    uSharpness: { value: 0 },
    uSmoothness: { value: 0.55 },
    uDensity: { value: 0.48 },
    uEnergy: { value: 0 },
    uAmplitude: { value: 1 },
    uRipples: { value: sonicTopographyRipples },
    uBaseColor1: { value: new THREE.Color(0.01, 0.02, 0.04) },
    uBaseColor2: { value: new THREE.Color(0.03, 0.05, 0.09) },
    uFogColor: { value: new THREE.Color(0.01, 0.02, 0.04) },
    uCoolCore: { value: new THREE.Color(0.0, 0.3, 1.0) },
    uCoolEdge: { value: new THREE.Color(0.6, 0.2, 1.0) },
    uWarmCore: { value: new THREE.Color(1.0, 0.2, 0.1) },
    uWarmEdge: { value: new THREE.Color(1.0, 0.6, 0.0) },
    uRippleColor: { value: new THREE.Color(0.2, 0.9, 1.0) },
    uGlowIntensity: { value: 1.0 },
  };
  sonicTopographyMaterial = new THREE.ShaderMaterial({
    uniforms: terrainUniforms,
    vertexShader: SONIC_TOPOGRAPHY_VERTEX_SHADER,
    fragmentShader: SONIC_TOPOGRAPHY_FRAGMENT_SHADER,
    transparent: true,
    depthWrite: true,
    side: THREE.FrontSide,
  });

  var count = sonicTopographyGridSize * sonicTopographyGridSize;
  sonicTopographyMesh = new THREE.InstancedMesh(geometry, sonicTopographyMaterial, count);
  sonicTopographyMesh.frustumCulled = false;
  sonicTopographyMesh.renderOrder = 2;
  var matrix = new THREE.Matrix4();
  var offset = SONIC_TOPOGRAPHY_TERRAIN_SIZE * 0.5;
  var index = 0;
  for (var x = 0; x < sonicTopographyGridSize; x++) {
    for (var z = 0; z < sonicTopographyGridSize; z++) {
      matrix.makeTranslation(x * spacing - offset, 0.5, z * spacing - offset);
      sonicTopographyMesh.setMatrixAt(index++, matrix);
    }
  }
  sonicTopographyMesh.instanceMatrix.needsUpdate = true;

  sonicTopographyGroup = new THREE.Group();
  sonicTopographyGroup.scale.setScalar(SONIC_TOPOGRAPHY_SCENE_SCALE);
  sonicTopographyGroup.position.y = -0.42;
  sonicTopographyGroup.visible = false;
  sonicTopographyGroup.add(sonicTopographyMesh);
  if (sonicTopographyFloatingCount > 0) {
    var floatingGeometry = new THREE.BoxGeometry(1, 1, 1);
    sonicTopographyFloatingMaterial = new THREE.MeshBasicMaterial({
      color: new THREE.Color(0.34, 0.86, 1),
      transparent: true,
      opacity: 0.82,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    sonicTopographyFloatingMesh = new THREE.InstancedMesh(floatingGeometry, sonicTopographyFloatingMaterial, sonicTopographyFloatingCount);
    sonicTopographyFloatingMesh.frustumCulled = false;
    sonicTopographyFloatingMesh.renderOrder = 3;
    sonicTopographyGroup.add(sonicTopographyFloatingMesh);
  }
  scene.add(sonicTopographyGroup);
}

function disposeSonicTopographyLayer(): void {
  if (sonicTopographyGroup) scene.remove(sonicTopographyGroup);
  if (sonicTopographyMesh) {
    sonicTopographyMesh.geometry.dispose();
    sonicTopographyMaterial?.dispose();
  }
  if (sonicTopographyFloatingMesh) {
    sonicTopographyFloatingMesh.geometry.dispose();
    sonicTopographyFloatingMaterial?.dispose();
  }
  sonicTopographyGroup = null;
  sonicTopographyMesh = null;
  sonicTopographyMaterial = null;
  sonicTopographyFloatingMesh = null;
  sonicTopographyFloatingMaterial = null;
}

function requestSonicTopographyRebuild(): void {
  if (sonicTopographyRebuildTimer) window.clearTimeout(sonicTopographyRebuildTimer);
  sonicTopographyRebuildTimer = window.setTimeout(function() {
    sonicTopographyRebuildTimer = 0;
    var wasActive = fx.preset === TOPOGRAPHY_PRESET_INDEX;
    var previousGridSize = sonicTopographyGridSize;
    var previousFloatingCount = sonicTopographyFloatingCount;
    disposeSonicTopographyLayer();
    if (!wasActive) return;
    try {
      ensureSonicTopographyLayer();
      if (sonicTopographyGroup) sonicTopographyGroup.visible = true;
    } catch (error) {
      console.error('sonic topography rebuild failed:', error);
      fx.topographyTerrainDensity = Math.round((previousGridSize - SONIC_TOPOGRAPHY_GRID_MIN) / (SONIC_TOPOGRAPHY_GRID_MAX - SONIC_TOPOGRAPHY_GRID_MIN) * 100);
      fx.topographyFloatingCount = previousFloatingCount;
      try {
        ensureSonicTopographyLayer();
        if (sonicTopographyGroup) sonicTopographyGroup.visible = true;
        syncSonicTopographySettingsUi();
        saveLyricLayout();
        showToast('当前密度无法稳定运行，已恢复上一次设置');
      } catch (fallbackError) {
        console.error('sonic topography fallback rebuild failed:', fallbackError);
        showToast('WebGL 地形恢复失败，请重新切换一次视觉预设');
      }
    }
  }, 320);
}

function sonicTopographyBandAverage(lowHz: number, highHz: number): number {
  if (!frequencyData || !frequencyData.length) return 0;
  var sampleRate = audioCtx?.sampleRate || 44100;
  var binHz = sampleRate / FFT_SIZE;
  var start = Math.max(0, Math.floor(lowHz / binHz));
  var end = Math.min(frequencyData.length, Math.max(start + 1, Math.ceil(highHz / binHz)));
  var sum = 0;
  for (var index = start; index < end; index++) sum += frequencyData[index] / 255;
  return sum / Math.max(1, end - start);
}

function addSonicTopographyRipple(strength: number, white: boolean, x?: number, z?: number): void {
  if (!sonicTopographyMaterial) return;
  var angle = Math.random() * Math.PI * 2;
  var distance = white ? 10 + Math.random() * 35 : Math.random() * 20;
  var ripple = sonicTopographyRipples[sonicTopographyRippleIndex];
  ripple.pos.set(
    typeof x === 'number' ? x : Math.cos(angle) * distance,
    typeof z === 'number' ? z : Math.sin(angle) * distance
  );
  ripple.time = sonicTopographyMaterial.uniforms.uTime.value;
  ripple.strength = Math.min(3, Math.max(0.2, strength));
  ripple.isActive = 1;
  ripple.rippleType = white ? 1 : 0;
  sonicTopographyRippleIndex = (sonicTopographyRippleIndex + 1) % sonicTopographyRipples.length;
}

function bindSonicTopographyPointerRipples(): void {
  if (sonicTopographyPointerBound || !renderer?.domElement) return;
  sonicTopographyPointerBound = true;
  renderer.domElement.addEventListener('click', function(event) {
    if (!(fx && fx.preset === TOPOGRAPHY_PRESET_INDEX) || !sonicTopographyGroup) return;
    if (mouseDownAt?.hadDrag || isPointerOverUi(event)) return;
    var ndc = new THREE.Vector2(
      (event.clientX / Math.max(1, innerWidth)) * 2 - 1,
      -(event.clientY / Math.max(1, innerHeight)) * 2 + 1
    );
    var raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(ndc, camera);
    var ground = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0.42);
    var hit = new THREE.Vector3();
    if (!raycaster.ray.intersectPlane(ground, hit)) return;
    sonicTopographyGroup.updateMatrixWorld(true);
    sonicTopographyGroup.worldToLocal(hit);
    if (Math.abs(hit.x) > 84 || Math.abs(hit.z) > 84) return;
    var heldMs = Math.max(0, performance.now() - (mouseDownAt?.t || performance.now()));
    addSonicTopographyRipple(Math.min(3, 0.2 + heldMs / 1000 * 2.8), false, hit.x, hit.z);
    markRenderInteraction('sonic-topography-ripple', 900);
  }, mineradioEventOptions());
}

function updateSonicTopographyLayer(dt: number): void {
  var active = !!(fx && fx.preset === TOPOGRAPHY_PRESET_INDEX);
  document.body.classList.toggle('sonic-topography-preset', active);
  if (!active) {
    if (sonicTopographyGroup) sonicTopographyGroup.visible = false;
    return;
  }

  ensureSonicTopographyLayer();
  if (!sonicTopographyGroup || !sonicTopographyMaterial) return;
  sonicTopographyGroup.visible = true;
  var motionSpeed = clampRange(Number(fx.topographyMotionSpeed), 0, 100) / 100;
  sonicTopographyGroup.rotation.y += dt * (0.025 + motionSpeed * 0.25);

  var rawBands = [
    sonicTopographyBandAverage(20, 60),
    sonicTopographyBandAverage(60, 250),
    sonicTopographyBandAverage(250, 500),
    sonicTopographyBandAverage(500, 2000),
    sonicTopographyBandAverage(2000, 4000),
    sonicTopographyBandAverage(4000, 6000),
    sonicTopographyBandAverage(6000, 12000),
    sonicTopographyBandAverage(12000, 20000),
  ];
  var response = Math.min(1, dt * 12);
  var bandGains = normalizeSonicTopographyBands(fx.topographyBands);
  var enabledBands = normalizeSonicTopographyEnabledBands(fx.topographyEnabledBands);
  for (var i = 0; i < rawBands.length; i++) {
    var gain = enabledBands[i] ? bandGains[i] / 50 : 0;
    var shaped = Math.pow(Math.min(1, rawBands[i] * gain * (i < 2 ? 2.7 : (i < 5 ? 3.2 : 4.2))), i < 2 ? 0.72 : 0.82);
    sonicTopographyBands[i] += (shaped - sonicTopographyBands[i]) * response;
  }

  var u = sonicTopographyMaterial.uniforms;
  applySonicTopographyThemeUniforms(u, dt);
  u.uTime.value += dt;
  u.uSubBass.value = Math.min(1.2, sonicTopographyBands[0] * 0.22 + beatPulse * 1.28);
  u.uBass.value = Math.min(1.15, sonicTopographyBands[1] * 0.20 + beatPulse * 1.15);
  u.uLowMid.value = sonicTopographyBands[2];
  u.uMid.value = sonicTopographyBands[3];
  u.uHighMid.value = sonicTopographyBands[4];
  u.uPresence.value = sonicTopographyBands[5];
  u.uBrilliance.value = sonicTopographyBands[6];
  u.uAir.value = sonicTopographyBands[7];
  u.uEnergy.value = Math.min(1, audioEnergy * 1.35);
  u.uAmplitude.value = 0.2 + clampRange(Number(fx.topographyAmplitude), 0, 100) / 100 * 2.6;
  var lowTotal = sonicTopographyBands[0] + sonicTopographyBands[1] + sonicTopographyBands[2] + sonicTopographyBands[3];
  var highTotal = sonicTopographyBands[5] + sonicTopographyBands[6] + sonicTopographyBands[7];
  u.uWarmth.value = lowTotal / Math.max(0.001, lowTotal + highTotal);
  u.uBrightness.value = highTotal / Math.max(0.001, lowTotal + highTotal);
  u.uSharpness.value = Math.min(1, sonicTopographyBands[5] * 0.45 + sonicTopographyBands[6] * 0.70 + sonicTopographyBands[7] * 0.85);
  u.uSmoothness.value = Math.max(0.12, 0.82 - u.uSharpness.value * 0.62);
  u.uDensity.value = Math.min(1, audioEnergy * 0.72 + sonicTopographyBands[3] * 0.38);

  var now = u.uTime.value;
  if (beatPulse > 0.18 && beatPulse > sonicTopographyLastBeat + 0.035 && now - sonicTopographyLastRippleAt > 0.18) {
    addSonicTopographyRipple(0.65 + beatPulse * 2.2, false);
    sonicTopographyLastRippleAt = now;
  }
  var sharp = u.uSharpness.value;
  if (sharp > 0.32 && sharp > sonicTopographyLastSharp + 0.07 && now - sonicTopographyLastRippleAt > 0.12) {
    addSonicTopographyRipple(0.45 + sharp * 1.7, true);
    sonicTopographyLastRippleAt = now;
  }
  sonicTopographyLastBeat = beatPulse;
  sonicTopographyLastSharp = sharp;
  updateSonicTopographyFloatingBlocks(u.uTime.value, dt);
}

function normalizeSonicTopographyThemeId(value: unknown): string {
  var id = String(value || 'nocturnal');
  return id === 'custom' || SONIC_TOPOGRAPHY_THEMES[id] ? id : 'nocturnal';
}

function applySonicTopographyTheme(themeId: string): void {
  var theme = SONIC_TOPOGRAPHY_THEMES[themeId];
  if (!theme) return;
  fx.topographyTheme = themeId;
  fx.topographyBackgroundColor = theme.background;
  fx.topographyFogColor = theme.fog;
  fx.topographyCoolColor = theme.cool;
  fx.topographyWarmColor = theme.warm;
  fx.topographyAccentColor = theme.accent;
  fx.topographyGlowIntensity = theme.glow;
}

function applySonicTopographyThemeUniforms(u: Record<string, THREE.IUniform>, dt: number): void {
  var background = normalizeHexColor(fx.topographyBackgroundColor, '#03050A');
  var fog = normalizeHexColor(fx.topographyFogColor, background);
  var cool = new THREE.Color(normalizeHexColor(fx.topographyCoolColor, '#004DFF'));
  var warm = new THREE.Color(normalizeHexColor(fx.topographyWarmColor, '#FF331A'));
  var base = new THREE.Color(background);
  var lerpSpeed = Math.min(1, dt * 5);
  u.uBaseColor1.value.lerp(base, lerpSpeed);
  u.uBaseColor2.value.lerp(base.clone().lerp(new THREE.Color(0xffffff), 0.12), lerpSpeed);
  u.uFogColor.value.lerp(new THREE.Color(fog), lerpSpeed);
  u.uCoolCore.value.lerp(cool, lerpSpeed);
  u.uCoolEdge.value.lerp(cool.clone().lerp(base, 0.35), lerpSpeed);
  u.uWarmCore.value.lerp(warm, lerpSpeed);
  u.uWarmEdge.value.lerp(warm.clone().lerp(base, 0.35), lerpSpeed);
  u.uRippleColor.value.lerp(new THREE.Color(normalizeHexColor(fx.topographyAccentColor, '#33E6FF')), lerpSpeed);
  u.uGlowIntensity.value += (clampRange(Number(fx.topographyGlowIntensity), 40, 220) / 100 - u.uGlowIntensity.value) * lerpSpeed;
  document.documentElement.style.setProperty('--topography-background', background);
  if (sonicTopographyFloatingMaterial) {
    sonicTopographyFloatingMaterial.color.lerp(new THREE.Color(normalizeHexColor(fx.topographyAccentColor, '#33E6FF')), lerpSpeed);
  }
}

function updateSonicTopographyFloatingBlocks(time: number, dt: number): void {
  if (!sonicTopographyFloatingMesh) return;
  var enabled = fx.topographyFloatingBlocks !== false;
  sonicTopographyFloatingMesh.visible = enabled;
  if (!enabled) return;
  var intensity = clampRange(Number(fx.topographyFloatingIntensity), 0, 100) / 100;
  var minScale = 0.12 + clampRange(Number(fx.topographyFloatingMinSize), 0, 100) / 100 * 0.63;
  var maxScale = 0.45 + clampRange(Number(fx.topographyFloatingMaxSize), 0, 100) / 100 * 2.75;
  var speed = 0.3 + clampRange(Number(fx.topographyFloatingSpeed), 0, 100) / 100 * 2.9;
  var pulse = clampRange(Math.max(beatPulse, smoothBass, audioEnergy * 0.75), 0, 1);
  var sizeMix = clampRange(pulse * (0.5 + intensity * 1.7), 0, 1);
  var matrix = new THREE.Matrix4();
  var quaternion = new THREE.Quaternion();
  var position = new THREE.Vector3();
  var scale = new THREE.Vector3();
  var euler = new THREE.Euler();
  var count = Math.max(1, sonicTopographyFloatingCount);
  for (var index = 0; index < sonicTopographyFloatingCount; index++) {
    var angle = index / count * Math.PI * 2 * 5 + Math.sin(index * 12.9898) * 0.7;
    var radius = 14 + ((index * 37) % 62);
    var baseHeight = 6 + ((index * 17) % 19);
    var baseScale = 0.75 + ((index * 11) % 9) * 0.05;
    var phase = index * 0.73;
    var rotationSpeed = 0.18 + ((index * 7) % 10) * 0.035;
    var orbit = angle + time * speed * 0.04;
    position.set(Math.cos(orbit) * radius, baseHeight + Math.sin(time * speed + phase) * (0.8 + intensity * 2.2), Math.sin(orbit) * radius);
    var visualScale = baseScale * (minScale + (maxScale - minScale) * sizeMix);
    scale.set(visualScale, visualScale * (1 + pulse * intensity * 1.5), visualScale);
    euler.set(time * rotationSpeed * speed + phase, time * rotationSpeed * 0.72 * speed + phase * 0.5, time * rotationSpeed * 0.43 * speed);
    quaternion.setFromEuler(euler);
    matrix.compose(position, quaternion, scale);
    sonicTopographyFloatingMesh.setMatrixAt(index, matrix);
  }
  sonicTopographyFloatingMesh.instanceMatrix.needsUpdate = true;
  if (sonicTopographyFloatingMaterial) {
    sonicTopographyFloatingMaterial.opacity += ((0.42 + intensity * 0.46 + pulse * 0.12) - sonicTopographyFloatingMaterial.opacity) * Math.min(1, dt * 8);
  }
}

function normalizeSonicTopographyBands(value: unknown): number[] {
  var source = Array.isArray(value) ? value : SONIC_TOPOGRAPHY_DEFAULT_BANDS;
  return SONIC_TOPOGRAPHY_DEFAULT_BANDS.map(function(fallback, index) {
    var numberValue = Number(source[index]);
    return Math.round(clampRange(isFinite(numberValue) ? numberValue : fallback, 0, 100));
  });
}

function normalizeSonicTopographyEnabledBands(value: unknown): boolean[] {
  var source = Array.isArray(value) ? value : SONIC_TOPOGRAPHY_DEFAULT_ENABLED;
  return SONIC_TOPOGRAPHY_DEFAULT_ENABLED.map(function(_, index) { return source[index] !== false; });
}

function syncSonicTopographySettingsUi(): void {
  if (!fx) return;
  fx.topographyBands = normalizeSonicTopographyBands(fx.topographyBands);
  fx.topographyEnabledBands = normalizeSonicTopographyEnabledBands(fx.topographyEnabledBands);
  for (var index = 0; index < 8; index++) {
    var input = document.querySelector<HTMLInputElement>('#topography-band-' + index);
    var row = document.querySelector<HTMLElement>('.topography-band[data-band="' + index + '"]');
    var toggle = row?.querySelector<HTMLElement>('button');
    if (input) {
      input.value = String(fx.topographyBands[index]);
      input.disabled = !fx.topographyEnabledBands[index];
      var output = input.parentElement?.querySelector('output');
      if (output) output.textContent = String(fx.topographyBands[index]);
    }
    row?.classList.toggle('disabled', !fx.topographyEnabledBands[index]);
    toggle?.setAttribute('aria-checked', fx.topographyEnabledBands[index] ? 'true' : 'false');
  }
  var sliderKeys: Array<[string, keyof FxSettings]> = [
    ['topography-glow-intensity', 'topographyGlowIntensity'],
    ['topography-motion-speed', 'topographyMotionSpeed'],
    ['topography-amplitude', 'topographyAmplitude'],
    ['topography-terrain-density', 'topographyTerrainDensity'],
    ['topography-floating-intensity', 'topographyFloatingIntensity'],
    ['topography-floating-min-size', 'topographyFloatingMinSize'],
    ['topography-floating-max-size', 'topographyFloatingMaxSize'],
    ['topography-floating-speed', 'topographyFloatingSpeed'],
    ['topography-floating-count', 'topographyFloatingCount'],
  ];
  sliderKeys.forEach(function(pair) {
    var input = document.querySelector<HTMLInputElement>('#' + pair[0]);
    if (!input) return;
    var value = Math.round(clampRange(Number(fx[pair[1]]), pair[1] === 'topographyGlowIntensity' ? 40 : 0, pair[1] === 'topographyGlowIntensity' ? 220 : 100));
    input.value = String(value);
    var output = input.parentElement?.querySelector('output');
    if (output) output.textContent = String(value);
  });
  var floatingToggle = document.getElementById('topography-floating-toggle');
  var floatingEnabled = fx.topographyFloatingBlocks !== false;
  floatingToggle?.classList.toggle('on', floatingEnabled);
  floatingToggle?.setAttribute('aria-checked', floatingEnabled ? 'true' : 'false');
  document.getElementById('topography-floating-controls')?.classList.toggle('disabled', !floatingEnabled);
  var themeSelect = document.querySelector<HTMLSelectElement>('#topography-theme');
  if (themeSelect) themeSelect.value = normalizeSonicTopographyThemeId(fx.topographyTheme);
  var colorKeys: Array<[string, keyof FxSettings, string]> = [
    ['topography-background-color', 'topographyBackgroundColor', '#03050A'],
    ['topography-fog-color', 'topographyFogColor', '#03050A'],
    ['topography-cool-color', 'topographyCoolColor', '#004DFF'],
    ['topography-warm-color', 'topographyWarmColor', '#FF331A'],
    ['topography-accent-color', 'topographyAccentColor', '#33E6FF'],
  ];
  colorKeys.forEach(function(pair) {
    var input = document.querySelector<HTMLInputElement>('#' + pair[0]);
    if (input) input.value = normalizeHexColor(fx[pair[1]], pair[2]);
  });
}

function toggleSonicTopographySettings(event?: Event): void {
  event?.preventDefault();
  event?.stopPropagation();
  if (event && event.stopImmediatePropagation) event.stopImmediatePropagation();
  var panel = document.getElementById('topography-settings');
  var button = document.querySelector('.preset-config-btn[data-config="topography"]');
  if (!panel) return;
  var open = !panel.classList.contains('open');
  panel.classList.toggle('open', open);
  button?.classList.toggle('active', open);
  button?.setAttribute('aria-expanded', open ? 'true' : 'false');
  syncSonicTopographySettingsUi();
  holdFxPanelAfterClick(3000);
  var activePanel = panel;
  if (open) requestAnimationFrame(function() { activePanel.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); });
}

function bindSonicTopographySettings(): void {
  if (sonicTopographySettingsBound) return;
  sonicTopographySettingsBound = true;
  for (let index = 0; index < 8; index++) {
    var input = document.querySelector<HTMLInputElement>('#topography-band-' + index);
    var toggle = document.querySelector<HTMLElement>('.topography-band[data-band="' + index + '"] button');
    if (input) {
      const bandInput = input;
      bandInput.addEventListener('input', function() {
      fx.topographyBands = normalizeSonicTopographyBands(fx.topographyBands);
      fx.topographyBands[index] = Math.round(clampRange(Number(bandInput.value), 0, 100));
      syncSonicTopographySettingsUi();
      saveLyricLayout();
      });
    }
    toggle?.addEventListener('click', function(event) {
      event.stopPropagation();
      fx.topographyEnabledBands = normalizeSonicTopographyEnabledBands(fx.topographyEnabledBands);
      fx.topographyEnabledBands[index] = !fx.topographyEnabledBands[index];
      syncSonicTopographySettingsUi();
      saveLyricLayout();
    });
  }
  var sliderKeys: Array<[string, keyof FxSettings, boolean]> = [
    ['topography-glow-intensity', 'topographyGlowIntensity', false],
    ['topography-motion-speed', 'topographyMotionSpeed', false],
    ['topography-amplitude', 'topographyAmplitude', false],
    ['topography-terrain-density', 'topographyTerrainDensity', true],
    ['topography-floating-intensity', 'topographyFloatingIntensity', false],
    ['topography-floating-min-size', 'topographyFloatingMinSize', false],
    ['topography-floating-max-size', 'topographyFloatingMaxSize', false],
    ['topography-floating-speed', 'topographyFloatingSpeed', false],
    ['topography-floating-count', 'topographyFloatingCount', true],
  ];
  sliderKeys.forEach(function(pair) {
    var input = document.querySelector<HTMLInputElement>('#' + pair[0]);
    if (input) {
      const settingInput = input;
      settingInput.addEventListener('input', function() {
        fx[pair[1]] = Math.round(clampRange(Number(settingInput.value), pair[1] === 'topographyGlowIntensity' ? 40 : 0, pair[1] === 'topographyGlowIntensity' ? 220 : 100));
        syncSonicTopographySettingsUi();
        saveLyricLayout();
      });
      if (pair[2]) settingInput.addEventListener('change', requestSonicTopographyRebuild);
    }
  });
  document.querySelector<HTMLSelectElement>('#topography-theme')?.addEventListener('change', function(event) {
    var select = event.currentTarget as HTMLSelectElement;
    if (select.value !== 'custom') applySonicTopographyTheme(select.value);
    else fx.topographyTheme = 'custom';
    syncSonicTopographySettingsUi();
    saveLyricLayout();
  });
  var colorKeys: Array<[string, keyof FxSettings, string]> = [
    ['topography-background-color', 'topographyBackgroundColor', '#03050A'],
    ['topography-fog-color', 'topographyFogColor', '#03050A'],
    ['topography-cool-color', 'topographyCoolColor', '#004DFF'],
    ['topography-warm-color', 'topographyWarmColor', '#FF331A'],
    ['topography-accent-color', 'topographyAccentColor', '#33E6FF'],
  ];
  colorKeys.forEach(function(pair) {
    document.querySelector<HTMLInputElement>('#' + pair[0])?.addEventListener('input', function(event) {
      fx.topographyTheme = 'custom';
      fx[pair[1]] = normalizeHexColor((event.currentTarget as HTMLInputElement).value, pair[2]);
      syncSonicTopographySettingsUi();
      saveLyricLayout();
    });
  });
  document.getElementById('topography-floating-toggle')?.addEventListener('click', function(event) {
    event.stopPropagation();
    fx.topographyFloatingBlocks = fx.topographyFloatingBlocks === false;
    syncSonicTopographySettingsUi();
    saveLyricLayout();
  });
  document.getElementById('topography-reset')?.addEventListener('click', function(event) {
    event.stopPropagation();
    fx.topographyBands = SONIC_TOPOGRAPHY_DEFAULT_BANDS.slice();
    fx.topographyEnabledBands = SONIC_TOPOGRAPHY_DEFAULT_ENABLED.slice();
    fx.topographyMotionSpeed = 50;
    fx.topographyAmplitude = 50;
    fx.topographyTerrainDensity = 46;
    fx.topographyFloatingBlocks = true;
    fx.topographyFloatingIntensity = 55;
    fx.topographyFloatingMinSize = 9;
    fx.topographyFloatingMaxSize = 26;
    fx.topographyFloatingSpeed = 77;
    fx.topographyFloatingCount = 80;
    applySonicTopographyTheme('nocturnal');
    syncSonicTopographySettingsUi();
    requestSonicTopographyRebuild();
    saveLyricLayout();
    showToast('地形参数已恢复默认');
  });
  syncSonicTopographySettingsUi();
}
