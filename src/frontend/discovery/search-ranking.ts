function searchThumbHtml(src?: string): string {
  return src
    ? '<img src="' + coverUrlWithSize(src, 80) + '" alt="" loading="lazy" onerror="this.style.opacity=0.2">'
    : '<div style="width:40px;height:40px;border-radius:6px;background:rgba(255,255,255,0.06);flex-shrink:0"></div>';
}

function songSourceTagHtml(song: PlaylistSong): string {
  var key = songProviderKey(song);
  var label = key === 'qq' ? 'QQ' : (key === 'kugou' ? 'KG' : 'NE');
  return '<span class="tag-source ' + key + '">' + label + '</span>';
}

function searchResultMetaText(song: PlaylistSong): string {
  var bits: string[] = [];
  if (song.artist) bits.push(song.artist);
  if (song.album) bits.push(song.album);
  if (songProviderKey(song) === 'qq' && !song.playable) bits.push('QQ 播放需会话/授权');
  return bits.join('  ·  ') || songSourceLabel(song);
}

function searchResultMetaHtml(song: PlaylistSong, index: number): string {
  var artist = String(song.artist || '').trim();
  var bits: string[] = [];
  if (song.album) bits.push(song.album);
  if (songProviderKey(song) === 'qq' && !song.playable) bits.push('QQ 播放需会话/授权');
  var tail = bits.length ? (' · ' + escHtml(bits.join('  ·  '))) : '';
  if (!artist) return escHtml(searchResultMetaText(song));
  return '<button class="search-artist-link" type="button" onclick="event.stopPropagation();openSearchResultArtist(' + index + ')">' + escHtml(artist) + '</button>' + tail;
}

function openSearchResultArtist(index: number): void {
  var song = playlist && playlist[index];
  if (!song) return;
  openArtistDetailForSong(song);
}

function searchIntentPrefersQQ(q: string): boolean {
  q = String(q || '').toLowerCase();
  return /(^|\s)qq($|\s)|qq音乐|qq音樂|周杰伦|周杰倫|jay\s*chou|jay/.test(q);
}

function simpleSearchNorm(text: unknown): string {
  return String(text || '').toLowerCase()
    .replace(/[（(【\[].*?[）)】\]]/g, '')
    .replace(/[\s·・,，。.!！?？'"“”‘’|\-_/]+/g, '');
}

function searchMentionsKnownArtist(q: string, artist?: string): boolean {
  var rawQ = String(q || '').toLowerCase();
  var rawArtist = String(artist || '').toLowerCase();
  if (!rawArtist) return false;
  if (/周杰伦|周杰倫|jay\s*chou/.test(rawQ) && /周杰伦|周杰倫|jay\s*chou/.test(rawArtist)) return true;
  var nq = simpleSearchNorm(q);
  var na = simpleSearchNorm(artist);
  return !!(na && na.length >= 2 && nq.indexOf(na) >= 0);
}

function canonicalOriginalArtistsForSearch(q: string, song: PlaylistSong): string[] {
  var qNorm = simpleSearchNorm(q);
  var titleNorm = simpleSearchNorm(song && song.name);
  var artists: string[] = [];
  SEARCH_ORIGINAL_ARTIST_HINTS.forEach(function(rule){
    var matched = (rule.titles || []).some(function(title){
      var nt = simpleSearchNorm(title);
      var titleMatches = !!(titleNorm && (titleNorm === nt || titleNorm.indexOf(nt) >= 0));
      return !!(nt && (qNorm.indexOf(nt) >= 0 || titleMatches));
    });
    if (matched) {
      (rule.artists || []).forEach(function(artist){
        if (artists.indexOf(artist) < 0) artists.push(artist);
      });
    }
  });
  return artists;
}

function songArtistMatchesAny(song: PlaylistSong, artists: string[]): boolean {
  var songArtist = simpleSearchNorm(song && song.artist);
  if (!songArtist || !artists || !artists.length) return false;
  return artists.some(function(artist){
    var na = simpleSearchNorm(artist);
    return !!(na && (songArtist.indexOf(na) >= 0 || na.indexOf(songArtist) >= 0));
  });
}

function scoreSongSearchResult(song: PlaylistSong, q: string, sourceIndex: number): number {
  var nq = simpleSearchNorm(q);
  var name = simpleSearchNorm(song && song.name);
  var artist = simpleSearchNorm(song && song.artist);
  var album = simpleSearchNorm(song && song.album);
  var raw = String(((song && song.name) || '') + ' ' + ((song && song.artist) || '') + ' ' + ((song && song.album) || '')).toLowerCase();
  var qAsksDerivative = /(live|现场|翻唱|cover|伴奏|instrumental|remix|dj|片段|demo|女声|男声|karaoke)/i.test(String(q || ''));
  var derivative = searchLooksLikeDerivative(raw);
  var artistMentioned = searchMentionsKnownArtist(q, song && song.artist);
  var originalArtists = canonicalOriginalArtistsForSearch(q, song);
  var originalArtistMatch = songArtistMatchesAny(song, originalArtists);
  var score = 0;
  if (name === nq) score += 90;
  else if (name.indexOf(nq) === 0) score += 55;
  else if (name.indexOf(nq) >= 0) score += 32;
  if (name && nq && nq.indexOf(name) >= 0) score += name.length >= 2 ? 68 : 18;
  if (originalArtistMatch && name && nq && (name === nq || nq.indexOf(name) >= 0 || name.indexOf(nq) >= 0)) score += 122;
  else if (!qAsksDerivative && originalArtists.length && name && nq && (name === nq || nq.indexOf(name) >= 0 || name.indexOf(nq) >= 0)) score -= 58;
  if (artistMentioned) score += 96;
  else if (artist && nq && nq.indexOf(artist) >= 0) score += 64;
  else if (artist && artist.indexOf(nq) >= 0) score += 22;
  if (artistMentioned && name && nq.indexOf(name) >= 0) score += 34;
  if (/周杰伦|周杰倫|jay\s*chou/i.test(String(q || '')) && !artistMentioned) score -= 28;
  if (album && nq && (album.indexOf(nq) >= 0 || nq.indexOf(album) >= 0)) score += 8;
  if (songProviderKey(song) === 'qq') score += searchIntentPrefersQQ(q) ? 48 : 4;
  if (song && song.playable === false) score -= 12;
  if (!qAsksDerivative) {
    if (derivative) score -= artistMentioned ? 76 : 96;
    if (/(live|现场)/i.test(raw)) score -= artistMentioned ? 28 : 42;
    if (originalArtists.length && searchLooksLikeSameTitleCover(song, nq, name, album, raw, originalArtistMatch, sourceIndex)) score -= 46;
  }
  score -= (sourceIndex || 0) * 0.75;
  return score;
}

function mergeSongSearchResults(neteaseSongs: PlaylistSong[], qqSongs: PlaylistSong[], limit: number, q: string): PlaylistSong[] {
  var out: PlaylistSong[] = [];
  var seen: Record<string, boolean> = {};
  function push(song: PlaylistSong, sourceIndex: number): void {
    if (!song || !song.name) return;
    var key = songProviderKey(song) + ':' + (song.mid || song.id || (song.name + '|' + song.artist));
    if (seen[key]) return;
    seen[key] = true;
    song._searchScore = scoreSongSearchResult(song, q, sourceIndex);
    out.push(song);
  }
  (neteaseSongs || []).forEach(function(song, i){ push(song, i); });
  (qqSongs || []).forEach(function(song, i){ push(song, i); });
  out.sort(function(a, b){ return (b._searchScore || 0) - (a._searchScore || 0); });
  return out.slice(0, limit);
}

async function fetchMusicSearchResults(q: string, mode: SearchMode): Promise<PlaylistSong[]> {
  if (mode === 'qq') {
    var qqOnly = await apiJson<MusicSearchResponse>('/api/qq/search?keywords=' + encodeURIComponent(q) + '&limit=12');
    return mergeSongSearchResults([], qqOnly.songs || [], 18, q);
  }
  if (mode === 'netease') {
    var neOnly = await apiJson<MusicSearchResponse>('/api/search?keywords=' + encodeURIComponent(q) + '&limit=18');
    return mergeSongSearchResults(neOnly.songs || [], [], 18, q);
  }
  var result = await Promise.all([
    apiJson<MusicSearchResponse>('/api/search?keywords=' + encodeURIComponent(q) + '&limit=14').catch(function(error): null { console.warn('Netease search failed:', error); return null; }),
    apiJson<MusicSearchResponse>('/api/qq/search?keywords=' + encodeURIComponent(q) + '&limit=12').catch(function(error): null { console.warn('QQ search failed:', error); return null; })
  ]);
  var neteaseSongs = result[0]?.songs || [];
  var qqSongs = result[1]?.songs || [];
  return mergeSongSearchResults(neteaseSongs, qqSongs, 18, q);
}

