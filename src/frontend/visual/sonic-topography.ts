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
var sonicTopographyRipples: SonicTopographyRipple[];
var sonicTopographyRippleIndex: number;
var sonicTopographyLastBeat: number;
var sonicTopographyLastSharp: number;
var sonicTopographyLastRippleAt: number;
var sonicTopographyBands: number[];
var sonicTopographyPointerBound: boolean;

const SONIC_TOPOGRAPHY_GRID_SIZE = 160;
const SONIC_TOPOGRAPHY_TERRAIN_SIZE = 168;
const SONIC_TOPOGRAPHY_SCENE_SCALE = 0.10;

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
  sonicTopographyRipples = Array.from({ length: 10 }, function() {
    return { pos: new THREE.Vector2(), time: -100, strength: 0, isActive: 0, rippleType: 0 };
  });
  sonicTopographyRippleIndex = 0;
  sonicTopographyLastBeat = 0;
  sonicTopographyLastSharp = 0;
  sonicTopographyLastRippleAt = -10;
  sonicTopographyBands = new Array(8).fill(0);
  sonicTopographyPointerBound = false;
  bindSonicTopographyPointerRipples();
}

function ensureSonicTopographyLayer(): void {
  if (sonicTopographyGroup) return;

  var spacing = SONIC_TOPOGRAPHY_TERRAIN_SIZE / SONIC_TOPOGRAPHY_GRID_SIZE;
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

  var count = SONIC_TOPOGRAPHY_GRID_SIZE * SONIC_TOPOGRAPHY_GRID_SIZE;
  sonicTopographyMesh = new THREE.InstancedMesh(geometry, sonicTopographyMaterial, count);
  sonicTopographyMesh.frustumCulled = false;
  sonicTopographyMesh.renderOrder = 2;
  var matrix = new THREE.Matrix4();
  var offset = SONIC_TOPOGRAPHY_TERRAIN_SIZE * 0.5;
  var index = 0;
  for (var x = 0; x < SONIC_TOPOGRAPHY_GRID_SIZE; x++) {
    for (var z = 0; z < SONIC_TOPOGRAPHY_GRID_SIZE; z++) {
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
  scene.add(sonicTopographyGroup);
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
  sonicTopographyGroup.rotation.y += dt * 0.15 * Math.max(0.05, Number(fx.speed) || 1);

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
  for (var i = 0; i < rawBands.length; i++) {
    var shaped = Math.pow(Math.min(1, rawBands[i] * (i < 2 ? 2.7 : (i < 5 ? 3.2 : 4.2))), i < 2 ? 0.72 : 0.82);
    sonicTopographyBands[i] += (shaped - sonicTopographyBands[i]) * response;
  }

  var u = sonicTopographyMaterial.uniforms;
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
  u.uAmplitude.value = Math.max(0.5, Math.min(2.8, fx.intensity * 1.45));
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
}
