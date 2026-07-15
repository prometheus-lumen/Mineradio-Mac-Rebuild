function buildShelfContentRow(
  song: PlaylistSong,
  index: number,
  group: THREE.Group
): ShelfContentRow {
  var canvas = document.createElement('canvas');
  canvas.width = 800;
  canvas.height = 104;
  var texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.generateMipmaps = false;
  var material = new THREE.MeshBasicMaterial({
    map: texture,
    transparent: true,
    opacity: 0.96,
    depthWrite: false,
    depthTest: false,
    side: THREE.DoubleSide
  });
  var geometry = new THREE.PlaneGeometry(2.50, 0.36, 1, 1);
  var mesh = new THREE.Mesh(geometry, material);
  mesh.renderOrder = 240 + index;
  group.add(mesh);
  return {
    canvas: canvas,
    texture: texture,
    mesh: mesh,
    song: song,
    index: index,
    fxPulse: 0
  };
}

function disposeShelfContentRows(rows: ShelfContentRow[]): void {
  while (rows.length) {
    var row = rows.pop();
    if (!row) continue;
    row.mesh.parent?.remove(row.mesh);
    row.mesh.material.map?.dispose();
    row.mesh.material.dispose();
    row.mesh.geometry.dispose();
  }
}

function pulseShelfContentRow(row: ShelfContentRow | undefined, amount = 1, decay = 0.36): void {
  if (!row) return;
  pulseObjectValue(row as unknown as Record<string, number>, 'fxPulse', amount, decay);
}
