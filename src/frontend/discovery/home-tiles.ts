function fallbackHomeTiles(): HomeTile[] {
  return [
    { kind: 'login', title: '登录同步歌单', sub: '网易云 / QQ 音乐' },
    { kind: 'search', title: '搜索一首歌', sub: '原唱优先', query: '' },
    { kind: 'local', title: '导入本地音乐', sub: '本地文件也能可视化' },
    { kind: 'podcastSearch', title: '搜索播客', sub: '长内容 / 电台' },
    { kind: 'guide', title: '看看视觉舞台', sub: '粒子 / 歌词 / 封面' }
  ];
}

function homeTileCover(item?: HomeTile | null): string {
  if (!item) return '';
  if ((item.kind === 'song' || item.kind === 'weatherSong') && item.song) return songCoverSrc(item.song, 220);
  return item.cover ? coverUrlWithSize(item.cover, 220) : '';
}

function homeToneForItem(item: HomeTile | null | undefined, index: number): string {
  if (!item || item.kind === 'weatherSong') return 'daily';
  if (item.kind === 'recent') return 'search';
  if (item.kind === 'recentEmpty' || item.kind === 'profile') return 'local';
  if (item.tone) return item.tone;
  if (item.kind === 'song') return index % 2 ? 'search' : 'daily';
  if (item.kind === 'playlist') return 'playlist';
  if (item.kind === 'podcast' || item.kind === 'podcastSearch') return 'podcast';
  if (item.kind === 'local') return 'local';
  if (item.kind === 'guide') return 'guide';
  if (item.kind === 'login') return 'library';
  if (item.kind === 'search') return 'search';
  return ['daily', 'playlist', 'local', 'guide', 'search'][index % 5] || 'daily';
}

function renderHomeMosaic(items: HomeTile[] = []): void {
  const cells = document.querySelectorAll<HTMLElement>('#home-mosaic .home-mosaic-cell');
  if (!cells.length) return;
  const covers = items.map(homeTileCover).filter(Boolean);
  cells.forEach((cell, index) => {
    const source = covers[index] || covers[(index + 1) % Math.max(1, covers.length)] || '';
    cell.style.backgroundImage = source ? `url("${cssImageUrl(source)}")` : '';
    cell.classList.toggle('has-cover', Boolean(source));
    cell.classList.toggle('home-skeleton', !source && homeDiscoverState.loading);
  });
}

function renderHomeTiles(): void {
  const row = document.getElementById('home-tile-row') as HomeTileRow | null;
  const title = document.getElementById('home-rail-title');
  if (!row) return;
  const history = Array.isArray(listenStatsState.history) ? listenStatsState.history.slice(0, 5) : [];
  const tiles: HomeTile[] = history.length
    ? history.map((record) => ({
      kind: 'recent',
      title: record.name || '继续听',
      sub: record.artist || record.source || '最近播放',
      cover: record.cover,
      record
    }))
    : [{ kind: 'recentEmpty', title: '暂无最近播放', sub: '播放一首歌后会出现在这里', cover: '' }];
  if (title) title.textContent = '最近播放';
  row.innerHTML = tiles.map((item, index) => {
    const cover = homeTileCover(item);
    const tone = homeToneForItem(item, index);
    const coverClass = `home-tile-cover${cover ? ' has-cover' : ''}`;
    const coverStyle = cover ? `background-image:url(&quot;${escHtml(cssImageUrl(cover))}&quot;)` : '';
    return `<button class="home-tile${!cover && homeDiscoverState.loading ? ' home-skeleton' : ''}" data-home-tone="${escHtml(tone)}" data-action="handleHomeTileClick" data-index="${index}" type="button">`
      + `<div class="${coverClass}" style="${coverStyle}"></div>`
      + `<div class="home-tile-title">${escHtml(item.title || '')}</div>`
      + `<div class="home-tile-sub">${escHtml(item.sub || '')}</div></button>`;
  }).join('');
  row._homeTiles = tiles;
  renderHomeMosaic(tiles);
}
