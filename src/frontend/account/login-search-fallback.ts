// Mineradio classic module: account/login.
function skipLoginAndFocusSearch(): void {
  closeLoginModal();
  setTimeout(function(){ runHomeSearch(''); }, 180);
}

async function searchAlternatePlatformSong(song: PlaylistSong): Promise<PlaylistSong | null> {
  var target = alternatePlaybackProvider(song);
  var artist = artistNameParts(song)[0] || '';
  var query = [song.name || song.title || '', song.artist || artist].filter(Boolean).join(' ').trim();
  if (!query) return null;
  var url = target === 'qq'
    ? '/api/qq/search?keywords=' + encodeURIComponent(query) + '&limit=8'
    : '/api/search?keywords=' + encodeURIComponent(query) + '&limit=12';
  var data = await apiJson<LoginApiResponse>(url);
  var list = data.songs || data.result?.songs || [];
  for (var i = 0; i < list.length; i++) {
    if (isSameTitleArtist(song, list[i])) return cloneSong(list[i]);
  }
  return null;
}
