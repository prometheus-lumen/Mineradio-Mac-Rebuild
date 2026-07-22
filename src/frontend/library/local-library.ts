// Mineradio classic module: library/local-library.
// Local audio is copied into the Tauri app-data directory. The browser keeps only stable library IDs.
const LOCAL_LIBRARY_STORE_KEY = 'mineradio.local-library.v1';
const LOCAL_LIBRARY_MIGRATION_KEY = 'mineradio.local-library.v2.migration-seen';
let localQueueSaveTimer: ReturnType<typeof setTimeout> | null = null;
let pendingDeletePlaylistId = '';
let pendingRenamePlaylistId = '';
let localLibrarySearchQuery = '';

function localLibraryApi(): MineradioDesktopApi | null {
  var api = getDesktopWindowApi();
  return api && api.librarySnapshot ? api : null;
}

function localSongKey(song: PlaylistSong): string {
  return String(song.libraryId || song.localKey || '');
}

function notifyLocalLibraryChanged(): void {
  window.dispatchEvent(new CustomEvent('mineradio:local-library-changed'));
}

function applyLocalLibrarySnapshot(snapshot: LocalLibrarySnapshot): void {
  localLibraryState.songs = Array.isArray(snapshot.songs) ? snapshot.songs : [];
  localLibraryState.playlists = Array.isArray(snapshot.playlists) ? snapshot.playlists : [];
  if (!localLibraryState.activePlaylistId) localLibraryState.activePlaylistId = 'all';
  var valid = localLibraryState.activePlaylistId === 'all' || localLibraryState.activePlaylistId === 'heart'
    || localLibraryState.playlists.some(function(item){ return item.id === localLibraryState.activePlaylistId; });
  if (!valid) localLibraryState.activePlaylistId = 'all';
  restoreManagedQueue(snapshot.queue || []);
  renderLocalLibrary();
  notifyLocalLibraryChanged();
}

async function refreshLocalLibrary(): Promise<void> {
  var api = localLibraryApi();
  if (!api?.librarySnapshot) return;
  try {
    applyLocalLibrarySnapshot(await api.librarySnapshot());
  } catch (error) {
    console.warn('[LocalLibrarySnapshot]', error);
    showToast('本地音乐库读取失败');
  }
}

function restoreManagedQueue(trackIds: string[]): void {
  if (playQueue.length || !trackIds.length) return;
  var tracks = new Map(localLibraryState.songs.map(function(song){ return [localSongKey(song), song] as const; }));
  var restored = trackIds.map(function(id){ return tracks.get(id); }).filter(Boolean) as PlaylistSong[];
  var skipped = trackIds.length - restored.length;
  if (skipped > 0) showToast('播放队列已恢复，跳过 ' + skipped + ' 首已删除歌曲');
  if (!restored.length) return;
  playQueue = restored.map(cloneSong);
  currentIdx = -1;
  safeRenderQueuePanel('local-library-queue-restore');
}

function persistManagedQueue(): void {
  if (localQueueSaveTimer) clearTimeout(localQueueSaveTimer);
  localQueueSaveTimer = setTimeout(function(): void {
    localQueueSaveTimer = null;
    var ids = playQueue.map(localSongKey).filter(Boolean);
    void localLibraryApi()?.librarySaveQueue?.(ids).catch(function(error){ console.warn('[LocalQueueSave]', error); });
  }, 180);
}

function migrateLegacyLocalLibraryNotice(): void {
  if (localStorage.getItem(LOCAL_LIBRARY_MIGRATION_KEY)) return;
  var legacy: { songs?: PlaylistSong[] } = {};
  try { legacy = JSON.parse(localStorage.getItem(LOCAL_LIBRARY_STORE_KEY) || '{}'); } catch (error) {}
  localStorage.setItem(LOCAL_LIBRARY_MIGRATION_KEY, '1');
  localStorage.removeItem('mineradio-lx-sources-v1');
  if (Array.isArray(legacy.songs) && legacy.songs.some(function(song){ return song?.source === 'local'; })) {
    showToast('旧版只保存了文件名，请重新导入一次；之后重启无需再导入');
  }
}

function restoreLocalLibraryState(): void {
  if (localLibraryState.loaded) return;
  localLibraryState.loaded = true;
  migrateLegacyLocalLibraryNotice();
  void refreshLocalLibrary();
}

async function runLibraryMutation(task: Promise<LocalLibraryMutationResult> | undefined, success: string): Promise<void> {
  if (!task) { showToast('此功能仅支持桌面应用'); return; }
  showLoading();
  try {
    var result = await task;
    if (result.canceled) return;
    if (!result.ok) throw new Error(result.error || 'LOCAL_LIBRARY_OPERATION_FAILED');
    var reachedLimit = result.errors?.some(function(item){ return item.error === 'LOCAL_TRACK_LIMIT_REACHED'; });
    if (!result.added && !result.reused && result.errors?.length) {
      throw new Error(reachedLimit ? '本地音乐库最多保存 2000 首歌曲' : '没有可导入的音频；支持 MP3、FLAC、M4A、AAC、OGG 和 WAV');
    }
    await refreshLocalLibrary();
    showToast(success
      + (typeof result.added === 'number' ? ' · 新增 ' + result.added + ' 首' : '')
      + (result.errors?.length ? (reachedLimit ? ' · 已达到 2000 首上限' : ' · 跳过 ' + result.errors.length + ' 个不支持或损坏的文件') : ''));
  } catch (error) {
    console.warn('[LocalLibraryMutation]', error);
    var message = error instanceof Error ? error.message : String(error);
    showToast(message.includes('PLAYLIST_NAME_DUPLICATE') ? '歌单名称已存在，请换一个名称' : '操作失败: ' + message);
  } finally {
    hideLoading();
  }
}

function importLocalLibraryFiles(): void {
  restoreLocalLibraryState();
  showToast('支持 MP3、FLAC、M4A/AAC、OGG 和 WAV，可一次选择多个文件');
  var target = localLibraryState.playlists.find(function(item){ return item.id === localLibraryState.activePlaylistId && item.kind === 'custom'; });
  void runLibraryMutation(localLibraryApi()?.libraryImportFiles?.(target?.id || null), '本地文件已保存');
}

function importLocalLibraryFolder(): void {
  restoreLocalLibraryState();
  void runLibraryMutation(localLibraryApi()?.libraryImportFolder?.(), '文件夹已导入');
}

function addLocalLibraryFiles(files: FileList | File[]): void {
  if (Array.from(files).some(function(file){ return file.type.startsWith('audio/') || /\.(mp3|flac|wav|ogg|m4a|aac)$/i.test(file.name); })) {
    showToast('临时播放不会保存；请使用主页“导入文件”永久保存');
  }
}

function localLibraryPlaylistSongs(id: string): PlaylistSong[] {
  if (id === 'all') return localLibraryState.songs;
  if (id === 'heart') return localLibraryState.songs.filter(function(song){ return !!song.localHeart; });
  var playlist = localLibraryState.playlists.find(function(item){ return item.id === id; });
  if (!playlist) return [];
  var songs = new Map(localLibraryState.songs.map(function(song){ return [localSongKey(song), song] as const; }));
  return playlist.songKeys.map(function(key){ return songs.get(key); }).filter(Boolean) as PlaylistSong[];
}

function openLocalLibrary(): void {
  restoreLocalLibraryState();
  document.getElementById('local-library-modal')?.classList.add('show');
  renderLocalLibrary();
}

function openLocalLibraryForSong(song: PlaylistSong): void {
  restoreLocalLibraryState();
  if (!localSongKey(song)) { showToast('请先导入或收藏这首歌曲'); return; }
  localLibraryState.activePlaylistId = localLibraryState.playlists.find(function(item){ return item.kind === 'custom'; })?.id || 'all';
  openLocalLibrary();
}

function closeLocalLibrary(): void { document.getElementById('local-library-modal')?.classList.remove('show'); }
function openLocalPlaylist(id: string): void { localLibraryState.activePlaylistId = id || 'all'; localLibrarySearchQuery = ''; renderLocalLibrary(); }

function createLocalPlaylist(): void {
  pendingRenamePlaylistId = '';
  var modal = document.getElementById('local-playlist-name-modal');
  var input = document.getElementById('local-playlist-name-input') as HTMLInputElement | null;
  var title = document.getElementById('local-playlist-name-title');
  var submit = document.getElementById('local-playlist-name-submit');
  if (title) title.textContent = '新建歌单';
  if (submit) submit.textContent = '创建';
  if (input) input.value = '';
  modal?.classList.add('show');
  setTimeout(function(){ input?.focus(); }, 50);
}

function renameLocalPlaylist(id: string): void {
  var playlist = localLibraryState.playlists.find(function(item){ return item.id === id; });
  if (!playlist) return;
  pendingRenamePlaylistId = id;
  var input = document.getElementById('local-playlist-name-input') as HTMLInputElement | null;
  var title = document.getElementById('local-playlist-name-title');
  var submit = document.getElementById('local-playlist-name-submit');
  if (title) title.textContent = '重命名歌单';
  if (submit) submit.textContent = '保存';
  if (input) { input.value = playlist.name; input.select(); }
  document.getElementById('local-playlist-name-modal')?.classList.add('show');
  setTimeout(function(){ input?.focus(); input?.select(); }, 50);
}

function closeLocalPlaylistNameModal(): void { pendingRenamePlaylistId = ''; document.getElementById('local-playlist-name-modal')?.classList.remove('show'); }

function confirmCreateLocalPlaylist(): void {
  var input = document.getElementById('local-playlist-name-input') as HTMLInputElement | null;
  var name = input?.value.trim() || '';
  if (!name) { showToast('请输入歌单名称'); input?.focus(); return; }
  var renameId = pendingRenamePlaylistId;
  closeLocalPlaylistNameModal();
  void runLibraryMutation(renameId
    ? localLibraryApi()?.libraryRenamePlaylist?.(renameId, name)
    : localLibraryApi()?.libraryCreatePlaylist?.(name), renameId ? '歌单已重命名' : '歌单已创建');
}

function deleteLocalPlaylist(id: string): void {
  var playlist = localLibraryState.playlists.find(function(item){ return item.id === id; });
  if (!playlist) return;
  pendingDeletePlaylistId = id;
  var name = document.getElementById('local-playlist-delete-name');
  if (name) name.textContent = playlist.name;
  document.getElementById('local-playlist-delete-modal')?.classList.add('show');
}

function closeLocalPlaylistDeleteModal(): void { pendingDeletePlaylistId = ''; document.getElementById('local-playlist-delete-modal')?.classList.remove('show'); }
function confirmDeleteLocalPlaylistOnly(): void { confirmDeleteLocalPlaylist(false); }
function confirmDeleteLocalPlaylistCleanup(): void { confirmDeleteLocalPlaylist(true); }
function confirmDeleteLocalPlaylist(cleanup: boolean): void {
  var id = pendingDeletePlaylistId;
  closeLocalPlaylistDeleteModal();
  if (id) void runLibraryMutation(localLibraryApi()?.libraryDeletePlaylist?.(id, cleanup), cleanup ? '歌单及孤立文件已清理' : '歌单已删除');
}

function toggleLocalLibrarySong(key: string): void {
  var playlist = localLibraryState.playlists.find(function(item){ return item.id === localLibraryState.activePlaylistId; });
  if (!playlist || playlist.kind !== 'custom') { showToast('请先打开一个自定义歌单'); return; }
  void runLibraryMutation(localLibraryApi()?.libraryTogglePlaylistTrack?.(playlist.id, key), '歌单已更新');
}

function toggleLocalHeart(key: string): void {
  var song = localLibraryState.songs.find(function(item){ return localSongKey(item) === key; });
  if (!song) return;
  song.localHeart = !song.localHeart;
  var changedSong = song;
  renderLocalLibrary();
  notifyLocalLibraryChanged();
  void localLibraryApi()?.librarySetHeart?.(key, !!song.localHeart).catch(function(error){
    changedSong.localHeart = !changedSong.localHeart;
    renderLocalLibrary();
    console.warn('[LocalHeart]', error);
  });
}

function deleteLocalLibrarySong(key: string): void {
  if (!window.confirm('从音乐库和所有歌单中删除这首歌曲？托管的本地文件也会被清理。')) return;
  void runLibraryMutation(localLibraryApi()?.libraryDeleteTrack?.(key), '歌曲已删除');
}

function playLocalLibrarySong(key: string): void {
  var songs = localLibraryPlaylistSongs(localLibraryState.activePlaylistId || 'all');
  var index = songs.findIndex(function(song){ return localSongKey(song) === key; });
  if (index >= 0) playLocalSongList(songs, index);
}

function playLocalLibrarySelection(): void { playLocalSongList(localLibraryPlaylistSongs(localLibraryState.activePlaylistId || 'all'), 0); }

function playLocalHeartMode(): void {
  var songs = localLibraryPlaylistSongs('heart').filter(function(song){ return song.playable !== false; });
  if (!songs.length) { showToast('先给可播放歌曲点亮心动'); return; }
  for (var i = songs.length - 1; i > 0; i -= 1) {
    var swap = Math.floor(Math.random() * (i + 1));
    var value = songs[i]; songs[i] = songs[swap]; songs[swap] = value;
  }
  playLocalSongList(songs, 0);
}

function playLocalSongList(songs: PlaylistSong[], startIndex: number): void {
  var playable = songs.filter(function(song){ return song.playable !== false; });
  if (!playable.length) { showToast('这个歌单没有可播放的歌曲'); return; }
  var requested = songs[startIndex];
  playQueue = playable.map(cloneSong);
  currentIdx = Math.max(0, requested ? playable.findIndex(function(song){ return localSongKey(song) === localSongKey(requested); }) : 0);
  if (currentIdx < 0) currentIdx = 0;
  homeForcedOpen = false; homeSuppressed = false; updateEmptyHomeVisibility();
  safeRenderQueuePanel('local-library-play'); safeShelfRebuild('local-library-play', true);
  persistManagedQueue();
  void playQueueAt(currentIdx, { manual: true }); closeLocalLibrary();
}

function resolveLocalLibraryPlaybackSource(session: QueueTrackSession, _options: PlayQueueOptions): Promise<QueuePlaybackSource | null> {
  var url = String(session.song.localUrl || (session.song.libraryId ? '/api/local-media/' + encodeURIComponent(String(session.song.libraryId)) : ''));
  if (!url) { showToast('本地媒体记录已失效'); return Promise.resolve(null); }
  releaseCurrentLocalAudioUrl();
  currentLocalSong = session.song;
  configureLocalLibraryAudio(session, url);
  return Promise.resolve({ data: { url: url }, provider: 'local', requestedQuality: 'standard' as PlaybackQuality, isQQ: false, isKugou: false, proxyAudioUrl: url, earlyPlayback: null });
}

function configureLocalLibraryAudio(session: QueueTrackSession, url: string): void {
  var preserveGesturePlayback = audioGesturePrimeActive;
  if (!audio) { audio = new Audio(); audio.crossOrigin = 'anonymous'; }
  else if (!preserveGesturePlayback) audio.pause();
  bindPlaybackProgressEvents(audio); applyVolumeToAudio(); audio.loop = false; audio.src = url;
  if (!preserveGesturePlayback) audio.load();
  audio.onloadedmetadata = function(){ if (session.token === trackSwitchToken && audio) session.song.duration = isFinite(audio.duration) ? audio.duration : 0; };
  audio.onerror = function(){
    if (session.token !== trackSwitchToken || !audio?.error) return;
    var isM4a = /\.m4a$/i.test(String(session.song.originalName || session.song.name || ''));
    var message = audio.error.code === MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED
      ? (isM4a ? '这个 M4A 的封装或编码无法被当前系统解码；通常 AAC、ALAC 编码可以播放' : '当前系统无法解码这个音频文件')
      : '本地音频读取失败（错误码 ' + audio.error.code + '）';
    showToast(message);
  };
  audio.onended = function(){ if (session.token !== trackSwitchToken) return; finalizeListenSession(true); if (playMode === 'single') void playQueueAt(currentIdx, { autoRepeat: true }); else nextTrack(); };
  updatePlaybackProgressUi();
}

function localLibraryPlaylistMarkup(playlist: LocalLibraryPlaylist): string {
  var active = playlist.id === localLibraryState.activePlaylistId ? ' active' : '';
  var rename = '<button type="button" class="local-library-playlist-rename" data-action="renameLocalPlaylist" data-local-playlist-id="' + escHtml(playlist.id) + '" title="重命名" aria-label="重命名 ' + escHtml(playlist.name) + '" data-stop-propagation="true">✎</button>';
  return '<div class="local-library-playlist-wrap custom"><button type="button" class="local-library-playlist' + active + '" data-action="openLocalPlaylist" data-local-playlist-id="' + escHtml(playlist.id) + '"><span>' + escHtml(playlist.name) + '</span><small>' + playlist.songKeys.length + '</small></button>' + rename + '<button type="button" class="local-library-delete" data-action="deleteLocalPlaylist" data-local-playlist-id="' + escHtml(playlist.id) + '" data-stop-propagation="true">×</button></div>';
}

function localLibrarySearchText(song: PlaylistSong): string {
  return [song.name, song.artist, song.album, song.originalName]
    .map(function(value){ return String(value || '').toLocaleLowerCase(); })
    .join(' ');
}

function filterLocalLibraryRows(root: HTMLElement, query: string): void {
  localLibrarySearchQuery = query.trim().toLocaleLowerCase();
  var visible = 0;
  root.querySelectorAll<HTMLElement>('.local-library-row').forEach(function(row){
    var text = '';
    try { text = decodeURIComponent(String(row.dataset.localSearch || '')); } catch (error) {}
    var matches = !localLibrarySearchQuery || text.includes(localLibrarySearchQuery);
    row.style.display = matches ? '' : 'none';
    if (matches) visible += 1;
  });
  var empty = root.querySelector<HTMLElement>('.local-library-search-empty');
  if (empty) empty.style.display = localLibrarySearchQuery && visible === 0 ? '' : 'none';
}

function renderLocalLibrary(): void {
  var root = document.getElementById('local-library-content'); if (!root) return;
  var active = localLibraryState.activePlaylistId || 'all';
  var songs = localLibraryPlaylistSongs(active);
  var currentPlaylist = localLibraryState.playlists.find(function(item){ return item.id === active; });
  var custom = currentPlaylist?.kind === 'custom';
  var playlistItems = '<button type="button" class="local-library-playlist' + (active === 'all' ? ' active' : '') + '" data-action="openLocalPlaylist" data-local-playlist-id="all"><span>全部歌曲</span><small>' + localLibraryState.songs.length + '</small></button>'
    + '<button type="button" class="local-library-playlist' + (active === 'heart' ? ' active' : '') + '" data-action="openLocalPlaylist" data-local-playlist-id="heart"><span>心动模式</span><small>' + localLibraryPlaylistSongs('heart').length + '</small></button>'
    + localLibraryState.playlists.map(localLibraryPlaylistMarkup).join('');
  var rows = songs.map(function(song){ var key = localSongKey(song); var inCustom = !!currentPlaylist?.songKeys.includes(key); return '<div class="local-library-row' + (song.playable === false ? ' unavailable' : '') + '" data-local-search="' + encodeURIComponent(localLibrarySearchText(song)) + '">'
    + '<button type="button" class="local-library-play" data-action="playLocalLibrarySong" data-local-song-key="' + escHtml(key) + '"' + (song.playable === false ? ' disabled' : '') + '>▶</button>'
    + '<div class="local-library-song"><strong>' + escHtml(song.name || '') + '</strong><small>' + escHtml(song.album || song.artist || '本地音乐') + (song.playable === false ? ' · 未找到可播放匹配' : '') + '</small></div>'
    + '<button type="button" class="local-library-heart' + (song.localHeart ? ' on' : '') + '" data-action="toggleLocalHeart" data-local-song-key="' + escHtml(key) + '">♥</button>'
    + (custom ? '<button type="button" class="local-library-add' + (inCustom ? ' on' : '') + '" data-action="toggleLocalLibrarySong" data-local-song-key="' + escHtml(key) + '">' + (inCustom ? '移除' : '添加') + '</button>' : '')
    + '<button type="button" class="local-library-delete" data-action="deleteLocalLibrarySong" data-local-song-key="' + escHtml(key) + '">×</button></div>'; }).join('') || '<div class="local-library-empty">从主页导入音乐文件、文件夹或歌单后，它们会显示在这里。</div>';
  root.innerHTML = '<aside class="local-library-sidebar"><div class="local-library-kicker">LOCAL LIBRARY</div>' + playlistItems + '<button type="button" class="local-library-new" data-action="createLocalPlaylist">+ 新建歌单</button></aside>'
    + '<section class="local-library-main"><div class="local-library-toolbar"><div><strong>' + escHtml(active === 'all' ? '本地音乐库' : (active === 'heart' ? '心动模式' : (currentPlaylist?.name || '本地歌单'))) + '</strong><small>' + songs.length + ' 首 · 已持久保存</small></div><div><button type="button" data-action="importLocalLibraryFiles">导入文件</button><button type="button" data-action="importLocalLibraryFolder">导入文件夹</button><button type="button" data-action="playLocalLibrarySelection">播放全部</button><button type="button" data-action="playLocalHeartMode">心动播放</button></div></div><label class="local-library-search"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7"></circle><path d="m20 20-4-4"></path></svg><input id="local-library-search-input" type="search" value="' + escHtml(localLibrarySearchQuery).replace(/"/g, '&quot;') + '" placeholder="搜索歌名、歌手、专辑或文件名" autocomplete="off" spellcheck="false" aria-label="搜索当前本地歌单"></label><div class="local-library-songs">' + rows + '<div class="local-library-search-empty" style="display:none">当前歌单中没有匹配的歌曲</div></div></section>';
  filterLocalLibraryRows(root, localLibrarySearchQuery);
}

function openPlaylistImportModal(): void { document.getElementById('playlist-import-modal')?.classList.add('show'); }
function closePlaylistImportModal(): void { document.getElementById('playlist-import-modal')?.classList.remove('show'); }

function importLxPlaylistFile(): void {
  void runLibraryMutation(localLibraryApi()?.libraryImportLxFile?.(), 'LX 歌单已导入');
  closePlaylistImportModal();
}

function sharedPlaylistInfo(url: string): { source: string; id: string; endpoint: string } | null {
  var id = (url.match(/[?&](?:id|playlistid|listid|pid)=([A-Za-z0-9_-]+)/i) || url.match(/\/(?:playlist|playsquare|playlist_detail)\/(\d+)/i) || [])[1] || '';
  if (!id) return null;
  if (/music\.163\.com|163cn\.tv/i.test(url)) return { source: 'netease', id: id, endpoint: '/api/playlist/tracks?id=' + encodeURIComponent(id) };
  if (/y\.qq\.com|c6\.y\.qq\.com|qq\.com/i.test(url)) return { source: 'qq', id: id, endpoint: '/api/qq/playlist/tracks?id=' + encodeURIComponent(id) };
  if (/kugou\.com|kg\.qq\.com/i.test(url)) return { source: 'kugou', id: id, endpoint: '/api/kugou/playlist/tracks?id=' + encodeURIComponent(id) };
  if (/kuwo\.cn/i.test(url)) return { source: 'kw', id: id, endpoint: '/api/import/playlist?source=kw&id=' + encodeURIComponent(id) };
  if (/migu\.cn/i.test(url)) return { source: 'mg', id: id, endpoint: '/api/import/playlist?source=mg&id=' + encodeURIComponent(id) };
  return null;
}

function importedDurationSeconds(song: PlaylistSong): number {
  var value = Number(song.duration || song.durationMs || song.dt) || 0;
  return value > 10_000 ? value / 1000 : value;
}

function importedArtistParts(song: PlaylistSong): string[] {
  var raw = String(song.artist || '');
  if (Array.isArray(song.artists)) raw += ' ' + song.artists.map(function(item){ return item.name || ''; }).join(' ');
  return raw.split(/\s*[/、,&]\s*|\s+feat\.?\s+/i).map(simpleSearchNorm).filter(Boolean);
}

function strictImportedMatch(original: PlaylistSong, candidate: PlaylistSong): boolean {
  if (!simpleSearchNorm(original.name) || simpleSearchNorm(original.name) !== simpleSearchNorm(candidate.name)) return false;
  var originalArtists = importedArtistParts(original);
  var candidateArtists = importedArtistParts(candidate);
  if (!originalArtists.some(function(name){ return candidateArtists.includes(name); })) return false;
  var originalDuration = importedDurationSeconds(original);
  var candidateDuration = importedDurationSeconds(candidate);
  return !originalDuration || !candidateDuration || Math.abs(originalDuration - candidateDuration) <= 5;
}

async function resolveImportedPlaylistMatches(source: string, songs: PlaylistSong[]): Promise<PlaylistSong[]> {
  if (source !== 'kw' && source !== 'mg') return songs;
  var result = new Array<PlaylistSong>(songs.length);
  var cursor = 0;
  async function worker(): Promise<void> {
    while (cursor < songs.length) {
      var index = cursor++;
      var original = songs[index];
      try {
        var query = String(original.name || '') + ' ' + String(original.artist || '');
        var responses = await Promise.all([
          apiJson<MusicSearchResponse>('/api/search?keywords=' + encodeURIComponent(query) + '&limit=8').catch(function(){ return { songs: [] }; }),
          apiJson<MusicSearchResponse>('/api/qq/search?keywords=' + encodeURIComponent(query) + '&limit=8').catch(function(){ return { songs: [] }; })
        ]);
        var candidates = (responses[0].songs || []).concat(responses[1].songs || []).filter(function(candidate){ return strictImportedMatch(original, candidate); });
        candidates.sort(function(a, b){ return Math.abs(importedDurationSeconds(original) - importedDurationSeconds(a)) - Math.abs(importedDurationSeconds(original) - importedDurationSeconds(b)); });
        result[index] = candidates[0] ? { ...candidates[0], importOriginal: original, importSource: source, playable: true } : { ...original, source: source, provider: source, playable: false };
      } catch (error) {
        result[index] = { ...original, source: source, provider: source, playable: false };
      }
    }
  }
  await Promise.all([worker(), worker(), worker(), worker()]);
  return result;
}

async function importSharedPlaylistLink(): Promise<void> {
  var input = document.getElementById('playlist-import-url') as HTMLInputElement | null;
  var url = input?.value.trim() || '';
  var info = sharedPlaylistInfo(url);
  if (!info) { showToast('无法识别这个歌单分享链接'); return; }
  showLoading();
  try {
    var response = await apiJson<PlaylistTracksResponse>(info.endpoint);
    if (response.error) throw new Error(response.error);
    var songs = await resolveImportedPlaylistMatches(info.source, response.tracks || []);
    if (!songs.length) throw new Error('歌单为空或需要登录');
    var name = response.playlist?.name || '导入歌单';
    await runLibraryMutation(localLibraryApi()?.libraryImportRemotePlaylist?.(name, url, info.source, songs), '分享歌单已导入');
    closePlaylistImportModal();
  } catch (error) {
    showToast('歌单导入失败: ' + (error instanceof Error ? error.message : String(error)));
  } finally { hideLoading(); }
}

function __mineradioInitLocalLibrary(): void {
  restoreLocalLibraryState();
  document.getElementById('local-playlist-name-input')?.addEventListener('keydown', function(event){ if ((event as KeyboardEvent).key === 'Enter') confirmCreateLocalPlaylist(); });
  document.getElementById('local-library-content')?.addEventListener('input', function(event){
    var target = event.target as HTMLInputElement | null;
    if (target?.id === 'local-library-search-input') filterLocalLibraryRows(event.currentTarget as HTMLElement, target.value);
  });
}
