// Mineradio classic module: account/providers.
function isCloudSong(song: PlaylistSong | null | undefined): boolean {
  if (!song || !song.id) return false;
  if (song.provider === 'qq' || song.source === 'qq' || song.type === 'qq') return false;
  if (song.type === 'local' || song.type === 'podcast' || song.source === 'podcast') return false;
  return !song.provider || song.provider === 'netease' || song.source === 'netease' || song.type === 'song';
}

function isKugouSong(song: PlaylistSong | null | undefined): boolean {
  return !!(song && (song.provider === 'kugou' || song.source === 'kugou' || song.type === 'kugou'));
}

function ensureLoggedInForAction(): boolean {
  if (loginStatus.loggedIn) return true;
  showToast('登录后可同步到网易云');
  showLoginModal();
  return false;
}

function ensureKugouLoggedInForAction(): boolean {
  if (kugouLoginStatus.loggedIn) return true;
  showToast('登录后可同步到酷狗“我喜欢”');
  showLoginModal({ provider: 'kugou' });
  return false;
}

function avatarSrc(url: string): string {
  if (!url) return '';
  return coverProxySrc(url, true);
}

function songProviderKey(song: PlaylistSong | null): MusicProvider {
  if (song && (song.provider === 'qq' || song.source === 'qq' || song.type === 'qq')) return 'qq';
  if (song && (song.provider === 'kugou' || song.source === 'kugou' || song.type === 'kugou')) return 'kugou';
  return 'netease';
}

function playbackProviderLabel(song: PlaylistSong | null): string {
  var provider = songProviderKey(song);
  return provider === 'qq' ? 'QQ 音乐' : (provider === 'kugou' ? '酷狗音乐' : '网易云');
}

function playbackLoginProvider(song: PlaylistSong | null): MusicProvider {
  var provider = songProviderKey(song);
  return provider === 'qq' || provider === 'kugou' ? provider : 'netease';
}

function alternatePlaybackProvider(song: PlaylistSong | null): MusicProvider {
  var provider = songProviderKey(song);
  return provider === 'qq' || provider === 'kugou' ? 'netease' : 'qq';
}

// ============================================================
//  登录系统
// ============================================================
