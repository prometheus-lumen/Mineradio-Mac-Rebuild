function initializeBaseParticleMaterials(): void {
  vs = PARTICLE_VERTEX_SHADER_A + PARTICLE_VERTEX_SHADER_B + PARTICLE_VERTEX_SHADER_C;
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
