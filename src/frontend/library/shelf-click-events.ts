function handleShelfCanvasClick(event: MouseEvent): void {
  if (!shelfManager || shelfManager.getMode?.() === 'off') return;
  if (document.body.classList.contains('splash-active') || isPointerOverUi(event)) return;
  if (mouseDownAt.hadDrag) {
    mouseDownAt.hadDrag = false;
    return;
  }
  const raycaster = raycasterFromPointerEvent(event);
  const mode = shelfManager.getMode?.();
  if (shelfManager.hasOpenContent?.() && handleShelfContentClick(event, raycaster, mode)) return;
  const padding = mode === 'side' && !shelfPinnedOpen && shelfAlwaysVisible() ? 18 : undefined;
  const hit = pointerCardHit(raycaster, event, padding);
  if (mode === 'side' && !shelfPinnedOpen && !canUseSideShelfWithoutPinnedOpen()) return;
  if (!hit) {
    if (mode === 'side' && shelfPinnedOpen) setShelfPinnedOpen(false, true);
    return;
  }
  if (mode === 'side') setShelfPinnedOpen(true, true);
  const centerIndex = shelfManager.getCenterIdx?.() || 0;
  const index = hit.card.index;
  if (Math.abs(index - centerIndex) < 0.5) {
    if (isShelfPlaylistPlayHit(hit) && shelfManager.playPlaylistAt?.(index)) return;
    shelfManager.openContent?.(index);
  } else {
    shelfManager.scrollBy?.(index - centerIndex);
  }
}

function handleShelfContentClick(
  event: MouseEvent,
  raycaster: THREE.Raycaster,
  mode?: string
): boolean {
  const contentList = shelfManager?.getContentList?.();
  if (!contentList) return false;
  const rowHit = contentList.raycastRows(raycaster) || contentList.pickRowAtScreen?.(event.clientX, event.clientY);
  if (rowHit) {
    handleShelfRowClick(event, contentList, rowHit);
    return true;
  }
  const returnHit = shelfManager?.raycastCards?.(raycaster);
  safeShelfCloseContent('shelf-card-return');
  if (mode === 'side') setShelfPinnedOpen(true, true);
  if (returnHit?.card) {
    shelfManager?.scrollBy?.(returnHit.card.index - (shelfManager.getCenterIdx?.() || 0));
  }
  return true;
}

function handleShelfRowClick(
  event: MouseEvent,
  contentList: ShelfContentList,
  hit: ShelfRowHit
): void {
  contentList.pulseRow?.(hit.row, 0.72);
  const song = hit.row.song;
  const selected = Math.abs(hit.row.index - contentList.getCenterIdx()) < 0.5;
  const podcastRadio = song?.type === 'podcast-radio';
  const screenAction = !hit.uv ? contentList.rowActionAtScreen?.(hit.row, event.clientX, event.clientY) : null;
  const like = Boolean(hit.uv && hit.uv.x > 0.61 && hit.uv.x < 0.68 && hit.uv.y > 0.20 && hit.uv.y < 0.82) || screenAction === 'like';
  const collect = Boolean(hit.uv && hit.uv.x >= 0.68 && hit.uv.x < 0.75 && hit.uv.y > 0.20 && hit.uv.y < 0.82) || screenAction === 'collect';
  const next = Boolean(hit.uv && hit.uv.x >= 0.75 && hit.uv.x < 0.82 && hit.uv.y > 0.20 && hit.uv.y < 0.82) || screenAction === 'next';
  const play = Boolean(hit.uv && hit.uv.x >= 0.82 && hit.uv.y > 0.20 && hit.uv.y < 0.82) || screenAction === 'play';
  if (selected && song && !podcastRadio && like) toggleLikeDetailSong(song);
  else if (selected && song && !podcastRadio && collect) collectDetailSong(song);
  else if (selected && song && !podcastRadio && next) queueDetailSongNext(song);
  else if (song?.id || podcastRadio || selected && play) contentList.playRow(hit.row);
  else contentList.scrollBy(hit.row.index - contentList.getCenterIdx());
}

function handleShelfContextMenu(event: MouseEvent): void {
  if (document.body.classList.contains('splash-active') || isPointerOverUi(event)) return;
  event.preventDefault();
  event.stopPropagation();
  suppressBottomControlsForShelf(980);
  if (!shelfManager) return;
  let mode = shelfManager.getMode?.();
  if (mode === 'off') {
    setShelfMode('side');
    mode = 'side';
  }
  if (mode !== 'side') return;
  if (shelfManager.hasOpenContent?.()) {
    const raycaster = raycasterFromPointerEvent(event);
    const contentList = shelfManager.getContentList?.();
    const rowHit = contentList?.raycastRows(raycaster);
    const song = rowHit?.row.song;
    if (rowHit && song?.id && song.type !== 'podcast-radio') {
      contentList?.pulseRow?.(rowHit.row, 0.88);
      queueDetailSongNext(song);
      return;
    }
    safeShelfCloseContent('shelf-context-toggle');
    setShelfPinnedOpen(true, true);
    return;
  }
  setShelfPinnedOpen(!shelfPinnedOpen, true);
  if (!shelfPinnedOpen) setFocusZone(null, true);
}
