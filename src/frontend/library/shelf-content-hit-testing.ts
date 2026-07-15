interface ShelfScreenBounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

function raycastShelfContentRows(
  rows: ShelfContentRow[],
  raycaster: THREE.Raycaster
): ShelfRowHit | null {
  var meshes = rows.filter(function(row): boolean { return row.mesh.visible; })
    .map(function(row): ShelfContentRow['mesh'] { return row.mesh; });
  var hits = raycaster.intersectObjects(meshes, false);
  if (!hits.length) return null;
  var row = rows.find(function(candidate): boolean { return candidate.mesh === hits[0].object; });
  return row ? { row: row, uv: hits[0].uv } : null;
}

function pickShelfContentRowAtScreen(
  rows: ShelfContentRow[],
  open: boolean,
  screenX: number,
  screenY: number
): ShelfRowHit | null {
  if (!rows.length || !open) return null;
  var ordered = rows.filter(function(row): boolean { return row.mesh.visible; })
    .sort(function(left, right): number { return right.mesh.renderOrder - left.mesh.renderOrder; });
  for (var index = 0; index < ordered.length; index++) {
    var row = ordered[index];
    var bounds = shelfObjectScreenBounds(row.mesh, 2.50, 0.36);
    if (!shelfPointInBounds(bounds, screenX, screenY, 24, 16)) continue;
    return { row: row, uv: shelfBoundsUv(bounds, screenX, screenY), screenPick: true };
  }
  return null;
}

function raycastShelfContentPanel(
  panel: ShelfContentPanel | null,
  raycaster: THREE.Raycaster
): THREE.Intersection | null {
  if (!panel) return null;
  var hits = raycaster.intersectObject(panel.mesh, false);
  return hits.length ? hits[0] : null;
}

function screenContainsShelfContentPanel(
  panel: ShelfContentPanel | null,
  open: boolean,
  screenX: number,
  screenY: number
): boolean {
  if (!panel || !open) return false;
  return shelfPointInBounds(
    shelfObjectScreenBounds(panel.mesh, 2.62, 3.02), screenX, screenY, 42, 42
  );
}

function shelfContentRowActionAtScreen(
  row: ShelfContentRow,
  centerIndex: number,
  screenX: number,
  screenY: number
): ShelfRowAction | null {
  var song = row.song;
  if (!row.mesh.visible || Math.abs(row.index - Math.round(centerIndex)) >= 0.5) return null;
  if (!song?.id && song?.type !== 'podcast-radio') return null;
  var uv = shelfBoundsUv(shelfObjectScreenBounds(row.mesh, 2.50, 0.36), screenX, screenY);
  if (uv.x > 0.60 && uv.x < 0.68 && uv.y > 0.12 && uv.y < 0.88) return 'like';
  if (uv.x >= 0.68 && uv.x < 0.75 && uv.y > 0.12 && uv.y < 0.88) return 'collect';
  if (uv.x >= 0.75 && uv.x < 0.82 && uv.y > 0.12 && uv.y < 0.88) return 'next';
  if (uv.x >= 0.82 && uv.y > 0.10 && uv.y < 0.90) return 'play';
  return null;
}

function shelfObjectScreenBounds(
  mesh: THREE.Mesh<THREE.PlaneGeometry, THREE.Material>,
  fallbackWidth: number,
  fallbackHeight: number
): ShelfScreenBounds {
  var halfWidth = (mesh.geometry.parameters.width || fallbackWidth) / 2;
  var halfHeight = (mesh.geometry.parameters.height || fallbackHeight) / 2;
  var corners = [
    new THREE.Vector3(-halfWidth, -halfHeight, 0), new THREE.Vector3(halfWidth, -halfHeight, 0),
    new THREE.Vector3(halfWidth, halfHeight, 0), new THREE.Vector3(-halfWidth, halfHeight, 0)
  ];
  var bounds: ShelfScreenBounds = { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity };
  mesh.updateMatrixWorld(true);
  corners.forEach(function(corner): void {
    corner.applyMatrix4(mesh.matrixWorld).project(camera);
    var x = (corner.x + 1) * innerWidth / 2;
    var y = (1 - corner.y) * innerHeight / 2;
    bounds.minX = Math.min(bounds.minX, x);
    bounds.maxX = Math.max(bounds.maxX, x);
    bounds.minY = Math.min(bounds.minY, y);
    bounds.maxY = Math.max(bounds.maxY, y);
  });
  return bounds;
}

function shelfPointInBounds(
  bounds: ShelfScreenBounds,
  x: number,
  y: number,
  paddingX: number,
  paddingY: number
): boolean {
  return x >= bounds.minX - paddingX && x <= bounds.maxX + paddingX &&
    y >= bounds.minY - paddingY && y <= bounds.maxY + paddingY;
}

function shelfBoundsUv(bounds: ShelfScreenBounds, x: number, y: number): Point2D {
  return {
    x: clampRange((x - bounds.minX) / Math.max(1, bounds.maxX - bounds.minX), 0, 1),
    y: 1 - clampRange((y - bounds.minY) / Math.max(1, bounds.maxY - bounds.minY), 0, 1)
  };
}
