function pickShelfCardAtScreen(
  cards: ShelfCard[],
  group: THREE.Group | null,
  screenX: number,
  screenY: number,
  padding = 72
): ShelfCardHit | null {
  if (!cards.length || !group || !group.visible) return null;
  var ordered = cards.slice().sort(function(left, right): number {
    return (right.mesh.renderOrder || 0) - (left.mesh.renderOrder || 0);
  });
  for (var index = 0; index < ordered.length; index++) {
    var uv = screenHitShelfCard(ordered[index], group, screenX, screenY, padding);
    if (uv) return { card: ordered[index], uv: uv, screenPick: true };
  }
  return null;
}

function screenHitShelfCard(
  card: ShelfCard,
  group: THREE.Group,
  screenX: number,
  screenY: number,
  padding = 28
): Point2D | null {
  if (!card.mesh.visible || !group.visible) return null;
  var parameters = card.mesh.geometry.parameters;
  var halfWidth = (parameters.width || 1.7) / 2;
  var halfHeight = (parameters.height || 0.85) / 2;
  var corners = [
    new THREE.Vector3(-halfWidth, -halfHeight, 0),
    new THREE.Vector3(halfWidth, -halfHeight, 0),
    new THREE.Vector3(halfWidth, halfHeight, 0),
    new THREE.Vector3(-halfWidth, halfHeight, 0)
  ];
  var minX = Infinity;
  var minY = Infinity;
  var maxX = -Infinity;
  var maxY = -Infinity;
  card.mesh.updateMatrixWorld(true);
  corners.forEach(function(corner): void {
    corner.applyMatrix4(card.mesh.matrixWorld).project(camera);
    var x = (corner.x + 1) * innerWidth / 2;
    var y = (1 - corner.y) * innerHeight / 2;
    minX = Math.min(minX, x);
    maxX = Math.max(maxX, x);
    minY = Math.min(minY, y);
    maxY = Math.max(maxY, y);
  });
  if (screenX < minX - padding || screenX > maxX + padding ||
      screenY < minY - padding || screenY > maxY + padding) return null;
  return {
    x: clampRange((screenX - minX) / Math.max(1, maxX - minX), 0, 1),
    y: 1 - clampRange((screenY - minY) / Math.max(1, maxY - minY), 0, 1)
  };
}

function raycastShelfCards(
  cards: ShelfCard[],
  group: THREE.Group | null,
  raycaster: THREE.Raycaster
): ShelfCardHit | null {
  if (!group?.visible || !cards.length) return null;
  var meshes = cards.filter(function(card): boolean { return card.mesh.visible; })
    .map(function(card): ShelfCard['mesh'] { return card.mesh; });
  var hits = raycaster.intersectObjects(meshes, false);
  if (!hits.length) return null;
  var card = cards.find(function(candidate): boolean { return candidate.mesh === hits[0].object; });
  return card ? { card: card, uv: hits[0].uv } : null;
}
