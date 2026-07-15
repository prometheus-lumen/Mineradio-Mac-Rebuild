interface ShelfPlaylistPanes {
  mine: AccountPlaylist[];
  fav: AccountPlaylist[];
}

function splitShelfPlaylists(): ShelfPlaylistPanes {
  var panes: ShelfPlaylistPanes = { mine: [], fav: [] };
  userPlaylists.forEach(function(playlist): void {
    (playlist.subscribed ? panes.fav : panes.mine).push(playlist);
  });
  return panes;
}

function shelfShowsPodcasts(): boolean {
  return !fx || fx.shelfShowPodcasts !== false;
}

function shelfMergesCollections(): boolean {
  return Boolean(fx && fx.shelfMergeCollections === true);
}

function activeShelfPlaylists(pane: 'mine' | 'fav'): AccountPlaylist[] {
  var panes = splitShelfPlaylists();
  if (shelfMergesCollections()) return panes.mine.concat(panes.fav);
  var source = pane === 'fav' ? panes.fav : panes.mine;
  if (!source.length && pane === 'mine' && panes.fav.length) return panes.fav;
  if (!source.length && pane === 'fav' && panes.mine.length) return panes.mine;
  return source;
}

function currentShelfItems(pane: 'mine' | 'fav'): ShelfCardItem[] {
  if (hasAnyPlatformLogin() && (userPlaylists.length || myPodcastCollections.length)) {
    var items = activeShelfPlaylists(pane).map(shelfItemFromPlaylist);
    if (shelfShowsPodcasts() && (pane === 'mine' || shelfMergesCollections())) {
      myPodcastCollections.forEach(function(collection): void {
        items.push({
          type: 'podcastCollection',
          title: collection.title,
          sub: (collection.count || 0) + ' items',
          cover: collection.cover || '',
          tag: '我的播客',
          podcastKey: collection.key,
          itemType: collection.itemType
        });
      });
    }
    if (items.length) return items;
  }
  return playQueue.map(function(song, index): ShelfCardItem {
    return {
      type: 'queue',
      title: song.name,
      sub: song.artist || '未知歌手',
      cover: songCoverSrc(song, 360),
      tag: index === currentIdx ? '正在播放' : '#' + (index + 1),
      queueIndex: index
    };
  });
}

function shelfItemFromPlaylist(playlist: AccountPlaylist): ShelfCardItem {
  var provider = playlist.provider === 'qq' ? 'qq' : 'netease';
  var sourceLabel = provider === 'qq' ? 'QQ' : 'NE';
  return {
    type: 'playlist',
    title: playlist.name,
    sub: sourceLabel + ' · ' + (playlist.trackCount || 0) + ' 首 · 播放 ' + compactCount(playlist.playCount || 0),
    cover: playlist.cover || '',
    tag: playlist.subscribed ? '收藏歌单' : '我的歌单',
    playlistId: (provider === 'qq' ? 'qq:' : '') + playlist.id,
    provider: provider
  };
}

function shelfItemsSignature(items: ShelfCardItem[], pane: 'mine' | 'fav'): string {
  if (hasAnyPlatformLogin() && (userPlaylists.length || myPodcastCollections.length)) {
    var samples = sampleShelfItems(items);
    return [
      'platform', pane, shelfMergesCollections() ? 1 : 0, shelfShowsPodcasts() ? 1 : 0,
      activeShelfPlaylists(pane).length, myPodcastCollections.length,
      samples.map(function(item): string {
        return [item.type || '', item.playlistId || '', item.podcastKey || '', item.title || '', item.sub || '', item.tag || ''].join('|');
      }).join('||')
    ].join('::');
  }
  var queueSamples = sampleShelfItems(items);
  return ['queue', items.length, currentIdx, queueSamples.map(function(item): string {
    return [item.type || '', item.playlistId || '', item.queueIndex ?? '', item.title || ''].join('|');
  }).join('||')].join('::');
}

function sampleShelfItems(items: ShelfCardItem[]): ShelfCardItem[] {
  return items.slice(0, 3).concat(items.slice(Math.max(3, items.length - 3)));
}
