function updateShelfGroupLayout(
  group: THREE.Group,
  cards: ShelfCard[],
  mode: string,
  itemCount: number,
  contentOpen: boolean,
  deltaTime: number,
  connectorParticles: ShelfStageExtras['connectorParticles'] | null,
  floorMirror: ShelfStageExtras['floorMirror'] | null
): void {
  var pointerX = pointerParallax.x;
  var pointerY = pointerParallax.y;
  var appRevealed = !document.body.classList.contains('splash-active');
  var cueVisibility = tickShelfHoverCue(deltaTime);
  var targetVisibility = shelfTargetVisibility(
    appRevealed, mode, itemCount, contentOpen, cueVisibility
  );
  shelfVisibility += (targetVisibility - shelfVisibility) *
    (targetVisibility > shelfVisibility ? 0.22 : 0.18);
  if (shelfVisibility < 0.01 && targetVisibility === 0) shelfVisibility = 0;
  group.visible = appRevealed && (mode !== 'side' || shelfVisibility > 0) &&
    (itemCount > 0 || contentOpen);
  if (connectorParticles) connectorParticles.visible = group.visible && mode === 'stage';
  if (floorMirror) floorMirror.visible = group.visible && mode === 'stage';

  if (mode === 'side') {
    updateSideShelfGroup(group, cards, contentOpen, pointerX, pointerY);
    return;
  }
  group.renderOrder = 50;
  group.position.y = Math.sin(uniforms.uTime.value * 0.3) * 0.04;
  group.position.x = pointerX * 0.10;
  group.rotation.y = pointerX * 0.025;
  group.rotation.x = -pointerY * 0.012;
}

function shelfTargetVisibility(
  appRevealed: boolean,
  mode: string,
  itemCount: number,
  contentOpen: boolean,
  cueVisibility: number
): number {
  if (!appRevealed) return 0;
  if (mode !== 'side') return itemCount ? 1 : 0;
  if (!itemCount && !contentOpen) return 0;
  if (contentOpen || shelfPinnedOpen || shelfAlwaysVisible()) return 1;
  return cueVisibility > 0.01 ? Math.max(0.16, cueVisibility * 0.88) : 0;
}

function updateSideShelfGroup(
  group: THREE.Group,
  cards: ShelfCard[],
  contentOpen: boolean,
  pointerX: number,
  pointerY: number
): void {
  var passive = shelfAlwaysVisible() && !shelfPinnedOpen && !contentOpen;
  var liftedCard = passive && cards.some(function(card): boolean {
    return card.selected || card.floatMix > 0.025;
  });
  group.renderOrder = passive && !liftedCard ? 30 : 50;
  group.position.set(0, 0, 0);
  var bindToCover = shelfAlwaysVisible() && Boolean(particles?.rotation) && !contentOpen;
  if (bindToCover) {
    group.rotation.x += ((particles.rotation.x - pointerY * 0.010) - group.rotation.x) * 0.075;
    group.rotation.y += ((particles.rotation.y + pointerX * 0.018) - group.rotation.y) * 0.075;
    group.rotation.z += (particles.rotation.z - group.rotation.z) * 0.075;
    return;
  }
  group.rotation.y += (pointerX * 0.018 - group.rotation.y) * 0.045;
  group.rotation.x += (-pointerY * 0.010 - group.rotation.x) * 0.045;
  group.rotation.z += (0 - group.rotation.z) * 0.045;
}
