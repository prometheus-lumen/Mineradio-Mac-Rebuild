function isPointInsideRectWithPad(x: number, y: number, rect: DOMRect | null, pad = 0): boolean {
  if (!rect || rect.width <= 0 || rect.height <= 0) return false;
  pad = Number(pad) || 0;
  return x >= rect.left - pad && x <= rect.right + pad && y >= rect.top - pad && y <= rect.bottom + pad;
}

function songFromListenRecord(record?: HomeListenRecord | null): PlaylistSong | null {
  if (!record) return null;
  var provider = record.sourceKey || '';
  if (!provider && record.type === 'qq') provider = 'qq';
  if (!provider) provider = record.mid ? 'qq' : 'netease';
  return {
    provider: provider,
    source: provider,
    type: record.type || (provider === 'qq' ? 'qq' : 'song'),
    id: record.id || record.mid || record.key || '',
    mid: record.mid || '',
    songmid: record.mid || '',
    mediaMid: record.mediaMid || '',
    name: record.name || '继续听',
    artist: record.artist || '',
    cover: record.cover || '',
  };
}

function currentQQArtistMid(song?: PlaylistSong | null): string {
  if (!song || songProviderKey(song) !== 'qq') return '';
  if (song.artistMid) return String(song.artistMid);
  if (song.singerMid) return String(song.singerMid);
  if (song.artistId && !/^\d+$/.test(String(song.artistId))) return String(song.artistId);
  var artists = Array.isArray(song.artists) ? song.artists : [];
  for (var i = 0; i < artists.length; i++) {
    var artist = artists[i];
    if (!artist || typeof artist !== 'object') continue;
    if ('mid' in artist && artist.mid) return String(artist.mid);
    if ('id' in artist && artist.id && !/^\d+$/.test(String(artist.id))) return String(artist.id);
  }
  return '';
}

function waitForKugouSync(delayMs: number): Promise<void> {
  return new Promise<void>(function(resolve): void { setTimeout(resolve, delayMs); });
}

async function verifySongInPlaylist(pid: string | number, songId: string): Promise<boolean> {
  songId = String(songId || '');
  if (!pid || !songId) return false;
  for (var attempt = 0; attempt < 3; attempt++) {
    if (attempt) {
      await new Promise(function(resolve){ setTimeout(resolve, attempt === 1 ? 360 : 820); });
    }
    try {
      var detail = await apiJson<PlaylistTracksResponse>('/api/playlist/tracks?id=' + encodeURIComponent(pid));
      var tracks = (detail && detail.tracks) || [];
      for (var i = 0; i < tracks.length; i++) {
        if (String(tracks[i].id) === songId) return true;
      }
    } catch (e) {
      console.warn('collect verify failed:', e);
    }
  }
  return false;
}

function __mineradioInitDiscoveryHomeData38(): void {
  homeNowCoverState = { key: '' };

  setTimeout(bindHomeSleepControls, 0);

  emptyHomeStartEl = document.getElementById('empty-home');

  if (emptyHomeStartEl) {
    var homeStart = emptyHomeStartEl;
    homeStart.addEventListener('click', function(e: MouseEvent): void {
      var target = e.target;
      var start = target instanceof Element ? target.closest('[data-home-radio-start]') : null;
      if (!start || !homeStart.contains(start)) return;
      e.preventDefault();
      e.stopPropagation();
      startWeatherRadio();
    }, true);
  }

  homeWallpaperPrewarmStarted = false;
}
