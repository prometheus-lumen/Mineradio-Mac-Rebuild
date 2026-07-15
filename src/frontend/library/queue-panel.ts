function bindSmoothQueueScrolling(): void {
  if (smoothWheelScrollBound) return;
  smoothWheelScrollBound = true;
  ['mini-queue-list', 'search-results', 'fx-panel', 'playlist-panel', 'track-detail-body']
    .forEach((id) => bindSmoothWheelScroll(document.getElementById(id)));
}

function miniQueueSkeleton(): string {
  return '<div class="mini-queue-skeleton"></div>'.repeat(3);
}

function setMiniQueueOpen(open: boolean): void {
  miniQueueOpen = Boolean(open);
  document.getElementById('mini-queue-popover')?.classList.toggle('show', miniQueueOpen);
  document.getElementById('mini-queue-btn')?.classList.toggle('active', miniQueueOpen);
  if (!miniQueueOpen) return;
  const sequence = ++miniQueueRenderSeq;
  requestAnimationFrame(() => {
    if (sequence !== miniQueueRenderSeq || !miniQueueOpen) return;
    renderMiniQueuePanel({ animate: true, scrollCurrent: true });
  });
  revealBottomControls(1300);
}

function toggleMiniQueue(event?: Event): void {
  event?.preventDefault();
  event?.stopPropagation();
  setMiniQueueOpen(!miniQueueOpen);
}

function closeMiniQueue(): void {
  setMiniQueueOpen(false);
}

function miniQueueItemMarkup(song: PlaylistSong, index: number): string {
  const thumbnail = songCoverSrc(song, 60);
  const image = thumbnail
    ? `<img src="${thumbnail}" alt="" loading="lazy" decoding="async" onerror="this.style.opacity=0.2">`
    : '<div class="mini-queue-cover"></div>';
  return `<div class="mini-queue-item${index === currentIdx ? ' now' : ''}" onclick="playQueueAt(${index},{manual:true})">`
    + image
    + `<div class="mini-queue-info"><div class="mini-queue-name">${escHtml(song.name)}</div>`
    + `<div class="mini-queue-sub">${escHtml(song.artist || '')}</div></div>`
    + `<button class="mini-queue-remove mini-queue-next" onclick="event.stopPropagation();queueIndexNext(${index})" title="下一首播放">下</button>`
    + `<button class="mini-queue-remove" onclick="event.stopPropagation();removeFromQueue(${index})" title="移除">×</button></div>`;
}

function renderMiniQueuePanel(options: QueueRenderOptions = {}): void {
  const list = document.getElementById('mini-queue-list');
  const count = document.getElementById('mini-queue-count');
  if (!list || !count) return;
  const total = playQueue.length;
  count.textContent = total
    ? `${total} 首${currentIdx >= 0 ? ` · 正在播放 ${currentIdx + 1}` : ''}`
    : '0 首';
  if (!miniQueueOpen && !options.animate && !options.scrollCurrent) return;
  if (!total) {
    list.innerHTML = '<div class="mini-queue-empty">队列为空，先搜索或打开歌单</div>';
    return;
  }
  list.innerHTML = playQueue.map(miniQueueItemMarkup).join('');
  if (!options.animate && !options.scrollCurrent) return;
  requestAnimationFrame(() => {
    if (options.animate) {
      animateListItems(list, '.mini-queue-item', { x: 0, y: 6, stagger: 0.01, duration: 0.20, limit: 16 });
    }
    if (options.scrollCurrent) {
      smoothScrollToItem(list, list.querySelector('.mini-queue-item.now'), { duration: 0.30, align: 0.42 });
    }
  });
}

function queueItemMarkup(song: PlaylistSong, index: number): string {
  const thumbnail = songCoverSrc(song, 60);
  const image = thumbnail
    ? `<img src="${thumbnail}" alt="" loading="lazy" decoding="async" onerror="this.style.opacity=0.2">`
    : '<div style="width:38px;height:38px;border-radius:6px;background:rgba(255,255,255,.06);flex-shrink:0"></div>';
  const liked = isSongLiked(song);
  return `<div class="queue-item${index === currentIdx ? ' now' : ''}" onclick="playQueueAt(${index},{manual:true})">`
    + image
    + `<div class="qi-info"><div class="qi-name">${escHtml(song.name)}</div><div class="qi-sub">`
    + `<button class="queue-artist-link" type="button" onclick="event.stopPropagation();openQueueArtist(${index})">${escHtml(song.artist || '未知歌手')}</button></div></div>`
    + '<div class="qi-act">'
    + `<button class="${liked ? 'liked' : ''}" onclick="event.stopPropagation();toggleLikeQueueIndex(${index})" title="${liked ? '取消红心' : '红心喜欢'}">${heartIconSvg()}</button>`
    + `<button class="queue-next" onclick="event.stopPropagation();queueIndexNext(${index})" title="下一首播放">下</button>`
    + `<button onclick="event.stopPropagation();collectQueueIndex(${index})" title="收藏到歌单">${playlistPlusIconSvg()}</button>`
    + `<button onclick="event.stopPropagation();removeFromQueue(${index})" title="移除">×</button></div></div>`;
}

function renderQueuePanel(options: QueueRenderOptions = {}): void {
  const list = document.getElementById('queue-list');
  if (!list) return;
  const sequence = ++queueRenderSeq;
  if (!playQueue.length) {
    list.innerHTML = '<div style="text-align:center;padding:24px 0;color:rgba(255,255,255,.32);font-size:11.5px">队列为空，搜索后点 + 设为下一首</div>';
    renderMiniQueuePanel();
    const panel = document.getElementById('playlist-panel');
    if (panel && (panel.classList.contains('show') || panel.classList.contains('peek')) && queueViewTab === 'queue') {
      switchPlaylistTab('playlists');
    }
    return;
  }
  list.innerHTML = playQueue.map(queueItemMarkup).join('');
  if (options.animate && sequence === queueRenderSeq) {
    animateVisiblePanelList(list, '.queue-item', document.getElementById('playlist-panel'), '.queue-item.now');
  }
  renderMiniQueuePanel({ scrollCurrent: miniQueueOpen });
}
