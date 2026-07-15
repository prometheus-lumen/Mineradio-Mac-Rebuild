function buildShelfCard(
  item: ShelfCardItem,
  index: number,
  group: THREE.Group,
  selectedIndex: number
): ShelfCard {
  var canvas = document.createElement('canvas');
  canvas.width = 720;
  canvas.height = 360;
  var context = canvas.getContext('2d');
  if (!context) throw new Error('Shelf card canvas is unavailable');

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
  var geometry = new THREE.PlaneGeometry(2.05, 1.025, 1, 1);
  var mesh = new THREE.Mesh(geometry, material);
  mesh.renderOrder = 50 + index;
  mesh.userData.action = shelfCardAction(item);
  group.add(mesh);

  return {
    canvas: canvas,
    ctx: context,
    texture: texture,
    mesh: mesh,
    item: item,
    index: index,
    isCenter: false,
    selected: index === selectedIndex,
    floatMix: 0,
    fxPulse: 0,
    dofBlur: 0,
    dofBucket: -1,
    drawKey: ''
  };
}

function shelfCardAction(item: ShelfCardItem): Record<string, unknown> {
  if (item.type === 'playlist') {
    return { kind: 'loadPlaylist', playlistId: item.playlistId, title: item.title };
  }
  if (item.type === 'podcastCollection') {
    return {
      kind: 'loadPlaylist',
      playlistId: 'podcast:' + item.podcastKey,
      title: item.title
    };
  }
  if (item.type === 'queue') return { kind: 'playQueue', index: item.queueIndex };
  return { kind: 'empty' };
}

function warmShelfTexture(texture: THREE.Texture): void {
  if (!renderer || typeof renderer.initTexture !== 'function') return;
  try {
    renderer.initTexture(texture);
  } catch {
    // Upload is an optimization; Three.js will retry on the next render.
  }
}

function disposeShelfCardGroup(group: THREE.Group): void {
  while (group.children.length) {
    var child = group.children[group.children.length - 1] as THREE.Mesh;
    group.remove(child);
    child.geometry?.dispose();
    var materials = Array.isArray(child.material) ? child.material : [child.material];
    materials.forEach(function(material): void {
      if (!material) return;
      var mappedMaterial = material as THREE.Material & { map?: THREE.Texture | null };
      mappedMaterial.map?.dispose();
      material.dispose();
    });
  }
}

function pulseShelfCard(card: ShelfCard | undefined, amount = 1): void {
  if (card) pulseObjectValue(card as unknown as Record<string, number>, 'fxPulse', amount, 0.46);
}

function applyShelfCardSelection(cards: ShelfCard[], index: number | null | undefined): number {
  var selectedIndex = index == null || index < 0 ? -1 : Math.round(index);
  cards.forEach(function(card): void {
    var selected = card.index === selectedIndex;
    if (card.selected === selected) return;
    card.selected = selected;
    drawCard(card, card.item);
  });
  return selectedIndex;
}

function activateShelfPlaylistCard(
  card: ShelfCard | undefined,
  contentList: ShelfContentList | null
): boolean {
  var action = card?.mesh.userData.action as Record<string, unknown> | undefined;
  if (action?.kind !== 'loadPlaylist' || !action.playlistId) return false;
  if (String(action.playlistId).startsWith('podcast:')) return false;
  pulseShelfCard(card, 1.05);
  if (contentList?.isOpen?.()) contentList.close?.();
  setShelfPinnedOpen(false, true);
  setFocusZone(null, true);
  loadPlaylistIntoQueueById(
    String(action.playlistId), true, String(action.title || card?.item.title || '')
  );
  return true;
}
