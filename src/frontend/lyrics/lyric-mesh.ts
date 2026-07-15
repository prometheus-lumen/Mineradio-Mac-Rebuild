function makeLyricShaderMaterial(mask: LyricMask, pal: LyricPalette): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      uMap: { value: mask.texture },
      uProgress: { value: 0 },
      uTextMin: { value: mask.textMin },
      uTextMax: { value: mask.textMax },
      uOpacity: { value: 0 },
      uBaseColor: { value: lyricThreeColor(pal.primary, '#d6f8ff', 0.38) },
      uHiColor: { value: lyricThreeColor(pal.highlight || pal.primary, '#fff0b8', 0.48) },
      uGlowColor: { value: lyricThreeColor(pal.glowColor || pal.secondary, '#9cffdf', 0.36) },
      uSolarColor: { value: lyricThreeColor(pal.highlight || pal.secondary || pal.primary, '#fff0b8', 0.50) },
      uFeather: { value: lyricsHasNativeKaraoke ? 0.030 : 0.055 },
      uSolar: { value: 0 },
    },
    vertexShader: 'varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }',
    fragmentShader: [
      'precision highp float;',
      'uniform sampler2D uMap;',
      'uniform float uProgress,uTextMin,uTextMax,uOpacity,uFeather,uSolar;',
      'uniform vec3 uBaseColor,uHiColor,uGlowColor,uSolarColor;',
      'varying vec2 vUv;',
      'void main(){',
      '  vec2 uv = gl_FrontFacing ? vUv : vec2(1.0 - vUv.x, vUv.y);',
      '  float mask = texture2D(uMap, uv).a;',
      '  if(mask < 0.01) discard;',
      '  float denom = max(0.001, uTextMax - uTextMin);',
      '  float p = clamp((uv.x - uTextMin) / denom, 0.0, 1.0);',
      '  float filled = 1.0 - smoothstep(uProgress, uProgress + uFeather, p);',
      '  float edge = 1.0 - smoothstep(0.0, uFeather * 2.8, abs(p - uProgress));',
      '  vec3 color = mix(uBaseColor, uHiColor, filled * 0.88);',
      '  color += uGlowColor * edge * 0.14;',
      '  vec3 solar = uSolarColor;',
      '  color = mix(color, color + solar * 0.34, uSolar * (0.25 + filled * 0.45));',
      '  color += solar * edge * uSolar * 0.22;',
      '  float lum = dot(color, vec3(0.299, 0.587, 0.114));',
      '  color += vec3(max(0.0, 0.30 - lum));',
      '  gl_FragColor = vec4(color, mask * uOpacity);',
      '}',
    ].join('\n'),
    transparent:true, depthWrite:false, depthTest:false, side:THREE.DoubleSide,
  });
}

function buildLyricMesh(text: string, flowMode?: string): THREE.Group {
  text = String(text || '').replace(/\s+/g, ' ').trim();
  var mask = makeLyricMask(text);
  var pal = stageLyrics.palette;
  flowMode = String(flowMode || fx.lyricFlowMode || 'single');
  var cascadeMode = flowMode === 'cascade' || flowMode === 'cloud' || flowMode === 'network';
  var worldW = 6.10;
  var worldH = worldW * (mask.height / mask.width);
  var geo = new THREE.PlaneGeometry(worldW, worldH, 1, 1);
  var textWorldW = worldW * (mask.textWidth / mask.width);
  var textWorldH = worldH * ((mask.textHeight || mask.fontSize) / mask.height);
  var group = new THREE.Group();
  group.renderOrder = 42;
  group.position.set((Math.random() - 0.5) * 0.08, 0.20, 1.46);
  group.scale.setScalar(0.96);
  group.userData.age = 0;
  group.userData.state = 'in';
  group.userData.lastLyricProgress = -1;
  group.userData.floatSeed = Math.random() * 100;
  group.userData.flowMode = cascadeMode ? 'cascade' : 'single';
  group.userData.cascadeLife = 0;

  var sunMat = new THREE.MeshBasicMaterial({
    map:getLyricSunBloomTexture(), transparent:true, opacity:0,
    depthWrite:false, depthTest:false, side:THREE.DoubleSide,
    blending:THREE.AdditiveBlending, color:lyricThreeColor(pal.highlight || pal.secondary || pal.primary, '#ffe7a6', 0.50)
  });
  var sunWorldW = Math.max(textWorldW + worldH * 1.10, textWorldW * 1.18);
  sunWorldW = Math.min(worldW * 1.16, Math.max(worldH * 1.35, sunWorldW));
  var sunWorldH = Math.max(worldH * 1.02, Math.min(worldH * 1.54, worldH + textWorldW * 0.070));
  var sun = new THREE.Mesh(new THREE.PlaneGeometry(sunWorldW, sunWorldH, 1, 1), sunMat);
  sun.renderOrder = 40;
  sun.position.set(0, 0.02, -0.030);
  sun.scale.set(0.78, 0.58, 1);
  group.add(sun);

  var glowTex = makeLyricGlowTexture(text, mask.fontSize, mask.textWidth, mask.lines, mask.lineHeight, mask.fitScaleX);
  var glowMat = new THREE.MeshBasicMaterial({
    map: glowTex, transparent:true, opacity:0, depthWrite:false, depthTest:false,
    side:THREE.DoubleSide, blending:THREE.AdditiveBlending, color:lyricThreeColor(pal.secondary, '#9cffdf', 0.36)
  });
  var glowMeta = glowTex.userData || {};
  var glowWorldW = textWorldW * ((glowMeta.width || mask.width) / Math.max(1, glowMeta.textWidth || mask.textWidth));
  glowWorldW = Math.min(worldW * 1.10, Math.max(textWorldW + worldH * 0.38, glowWorldW));
  var glowWorldH = worldH * ((glowMeta.height || mask.height) / mask.height);
  glowWorldH = Math.min(worldH * 1.42, Math.max(worldH * 0.92, glowWorldH));
  var glow = new THREE.Mesh(new THREE.PlaneGeometry(glowWorldW, glowWorldH, 1, 1), glowMat);
  glow.renderOrder = 41;
  glow.scale.set(1.0, 1.06, 1);
  group.add(glow);

  var readabilityTex = makeLyricReadabilityTexture(mask);
  var readabilityMat = new THREE.MeshBasicMaterial({
    map: readabilityTex, transparent:true, opacity:0, depthWrite:false, depthTest:false,
    side:THREE.DoubleSide
  });
  var readability = new THREE.Mesh(new THREE.PlaneGeometry(worldW, worldH, 1, 1), readabilityMat);
  readability.renderOrder = 42;
  readability.position.set(0, 0, -0.012);
  group.add(readability);

  var textMat = makeLyricShaderMaterial(mask, pal);
  var textMesh = new THREE.Mesh(geo, textMat);
  textMesh.renderOrder = 43;
  group.add(textMesh);

  var sparkCount = 132;
  var pgeo = new THREE.BufferGeometry();
  var ppos = new Float32Array(sparkCount * 3);
  var pseed = new Float32Array(sparkCount);
  for (var i = 0; i < sparkCount; i++) {
    var angle = Math.random() * Math.PI * 2;
    var ring = 0.78 + Math.pow(Math.random(), 1.45) * 0.58;
    var rx = textWorldW * (0.50 + Math.random() * 0.22) + 0.10;
    var ry = worldH * (0.42 + Math.random() * 0.22) + 0.08;
    ppos[i*3] = Math.cos(angle) * rx * ring + (Math.random() - 0.5) * textWorldW * 0.12;
    ppos[i*3+1] = Math.sin(angle) * ry * ring + (Math.random() - 0.5) * worldH * 0.14;
    ppos[i*3+2] = (Math.random() - 0.5) * 0.24;
    pseed[i] = Math.random() * 1000;
  }
  pgeo.setAttribute('position', new THREE.BufferAttribute(ppos, 3));
  pgeo.setAttribute('seed', new THREE.BufferAttribute(pseed, 1));
  var pmat = new THREE.ShaderMaterial({
    uniforms: {
      uMap: { value: dotTexture },
      uSize: { value: 0.052 },
      uOpacity: { value: 0 },
      uColor: { value: lyricThreeColor(pal.highlight || pal.secondary || pal.primary, '#fff7d2', 0.30) },
      uPixel: uniforms.uPixel
    },
    vertexShader: [
      'attribute float seed;',
      'uniform float uSize;',
      'uniform float uPixel;',
      'varying float vSeed;',
      'void main(){',
      '  vSeed = seed;',
      '  vec4 mv = modelViewMatrix * vec4(position, 1.0);',
      '  float jitter = 0.58 + fract(sin(seed * 19.17) * 43758.5453) * 1.18;',
      '  float depth = clamp(2.2 / max(0.35, -mv.z), 0.54, 1.55);',
      '  gl_PointSize = uSize * jitter * depth * uPixel * 120.0;',
      '  gl_Position = projectionMatrix * mv;',
      '}'
    ].join('\n'),
    fragmentShader: [
      'precision highp float;',
      'uniform sampler2D uMap;',
      'uniform vec3 uColor;',
      'uniform float uOpacity;',
      'varying float vSeed;',
      'void main(){',
      '  vec4 tex = texture2D(uMap, gl_PointCoord);',
      '  float twinkle = 0.72 + fract(sin(vSeed * 7.31) * 91.7) * 0.28;',
      '  gl_FragColor = vec4(uColor * twinkle, tex.a * uOpacity);',
      '}'
    ].join('\n'),
    transparent:true, depthWrite:false, depthTest:false, blending:THREE.AdditiveBlending
  });
  var sparks = new THREE.Points(pgeo, pmat);
  sparks.renderOrder = 44;
  sparks.visible = !!fx.lyricGlowParticles;
  group.add(sparks);

  group.userData.lyric = {
    mask:mask, textMesh:textMesh, readability:readability, glow:glow, sparks:sparks, sun:sun,
    textMat:textMat, readabilityMat:readabilityMat, glowMat:glowMat, sparkMat:pmat, sunMat:sunMat,
    basePositions:ppos.slice ? ppos.slice(0) : new Float32Array(ppos),
    textWorldW:textWorldW, textWorldH:textWorldH, worldW:worldW, worldH:worldH
  };
  updateLyricMeshProgress(group, 0);
  return group;
}

function updateLyricMeshProgress(mesh: THREE.Object3D, progress: number): void {
  if (!mesh || !mesh.userData || !mesh.userData.lyric) return;
  progress = Math.max(0, Math.min(1, progress || 0));
  var d = mesh.userData.lyric;
  d.textMat.uniforms.uProgress.value = progress;
  mesh.userData.lastLyricProgress = progress;
}
