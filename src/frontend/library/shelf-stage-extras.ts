function createShelfStageExtras(group: THREE.Group): ShelfStageExtras {
  var particleCount = 80;
  var geometry = new THREE.BufferGeometry();
  var positions = new Float32Array(particleCount * 3);
  var colors = new Float32Array(particleCount * 3);
  var randomValues = new Float32Array(particleCount);
  for (var index = 0; index < particleCount; index++) {
    positions[index * 3] = (Math.random() - 0.5) * 6;
    positions[index * 3 + 1] = (Math.random() - 0.5) * 1.2 + 0.3;
    positions[index * 3 + 2] = 1 + Math.random() * 1.5;
    colors[index * 3] = 0.56;
    colors[index * 3 + 1] = 0.91;
    colors[index * 3 + 2] = 1;
    randomValues[index] = Math.random();
  }
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('aColor', new THREE.BufferAttribute(colors, 3));
  geometry.setAttribute('aRand', new THREE.BufferAttribute(randomValues, 1));
  var material = new THREE.ShaderMaterial({
    uniforms: { uTime: uniforms.uTime, uPixel: uniforms.uPixel, uDotTex: uniforms.uDotTex },
    vertexShader: `precision highp float; uniform float uTime, uPixel; attribute vec3 aColor; attribute float aRand;
varying vec3 vC; varying float vA;
void main(){
  vec3 p = position;
  p.x += sin(uTime * 0.4 + aRand * 6.0) * 1.5;
  p.y += sin(uTime * 0.6 + aRand * 4.0) * 0.2;
  p.z += cos(uTime * 0.5 + aRand * 5.0) * 0.4;
  vC = aColor; vA = 0.4 + 0.4 * sin(uTime * 1.5 + aRand * 7.0);
  vec4 m = modelViewMatrix * vec4(p, 1.0);
  gl_PointSize = 4.0 * uPixel;
  gl_Position = projectionMatrix * m;
}`,
    fragmentShader: `precision highp float; uniform sampler2D uDotTex;
varying vec3 vC; varying float vA;
void main(){ vec4 t = texture2D(uDotTex, gl_PointCoord); if (t.a < 0.02) discard; gl_FragColor = vec4(vC, t.a * vA); }`,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending
  });
  var connectorParticles = new THREE.Points(geometry, material);
  connectorParticles.frustumCulled = false;
  connectorParticles.renderOrder = 49;
  connectorParticles.position.set(0, -2.2, 0);
  (group.parent || scene).add(connectorParticles);

  var mirrorGeometry = new THREE.PlaneGeometry(10, 1.8);
  var canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 64;
  var context = canvas.getContext('2d');
  if (!context) throw new Error('Shelf mirror canvas is unavailable');
  var gradient = context.createLinearGradient(0, 0, 0, 64);
  gradient.addColorStop(0, 'rgba(255,255,255,0.07)');
  gradient.addColorStop(1, 'rgba(255,255,255,0)');
  context.fillStyle = gradient;
  context.fillRect(0, 0, 256, 64);
  var mirrorTexture = new THREE.CanvasTexture(canvas);
  mirrorTexture.generateMipmaps = false;
  var mirrorMaterial = new THREE.MeshBasicMaterial({
    map: mirrorTexture,
    transparent: true,
    depthWrite: false,
    opacity: 0.55
  });
  var floorMirror = new THREE.Mesh(mirrorGeometry, mirrorMaterial);
  floorMirror.position.set(0, -2.85, 0.4);
  floorMirror.rotation.x = -Math.PI / 2;
  (group.parent || scene).add(floorMirror);
  return { connectorParticles: connectorParticles, floorMirror: floorMirror };
}

function disposeShelfStageExtras(
  connectorParticles: ShelfStageExtras['connectorParticles'] | null,
  floorMirror: ShelfStageExtras['floorMirror'] | null
): void {
  if (connectorParticles) {
    connectorParticles.parent?.remove(connectorParticles);
    connectorParticles.geometry.dispose();
    connectorParticles.material.dispose();
  }
  if (floorMirror) {
    floorMirror.parent?.remove(floorMirror);
    floorMirror.geometry.dispose();
    floorMirror.material.map?.dispose();
    floorMirror.material.dispose();
  }
}
