function playlistPlusIconSvg(): string {
  return '<svg width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 6h10"/><path d="M4 11h10"/><path d="M4 16h7"/><path d="M18 14v6"/><path d="M15 17h6"/></svg>';
}

function artistCollectTrayIconSvg(): string {
  return '<svg fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v9"/><path d="M7.5 9.5h9"/><path d="M4.5 12.5v6h15v-6"/></svg>';
}

function artistNextPlusIconSvg(): string {
  return '<svg fill="none" stroke="currentColor" stroke-width="2.25" stroke-linecap="round" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5.5v13"/><path d="M5.5 12h13"/></svg>';
}

function songActionHtml(kind: string, source: string, index: number, song: PlaylistSong): string {
  var liked = isSongLiked(song);
  if (kind === 'like') {
    return '<button class="song-action-btn' + (liked ? ' liked' : '') + '" title="' + (liked ? '取消红心' : '红心喜欢') + '" onclick="event.stopPropagation();toggleLike' + source + '(' + index + ')">' + heartIconSvg() + '</button>';
  }
  return '<button class="song-action-btn" title="收藏到歌单" onclick="event.stopPropagation();collect' + source + '(' + index + ')">' + playlistPlusIconSvg() + '</button>';
}

function openCollectModal(song: PlaylistSong): void {
  if (!isCloudSong(song)) {
    showToast(songProviderKey(song) === 'qq' ? 'QQ 音乐收藏到歌单待登录接口接入' : '本地文件暂不支持收藏到网易云歌单');
    return;
  }
  if (!ensureLoggedInForAction()) return;
  collectTargetSong = song;
  renderCollectModal();
  openGsapModal(document.getElementById('collect-modal'));
  refreshUserPlaylists(true).then(function(){ renderCollectModal(); }).catch(function(){ renderCollectModal(); });
}

function openCollectModalForCurrent(): void {
  var song = currentCoverSong();
  if (song) openCollectModal(song);
  else showToast('先播放或选择一首歌');
}

function collectSearchResult(i: number): void { if (playlist[i]) openCollectModal(playlist[i]); }

function collectQueueIndex(i: number): void { if (playQueue[i]) openCollectModal(playQueue[i]); }

function collectDetailSong(song: PlaylistSong): void { openCollectModal(song); }

function closeCollectModal(): void {
  closeGsapModal(document.getElementById('collect-modal'), function(){
    collectTargetSong = null;
    var input = document.querySelector<HTMLInputElement>('#collect-new-name');
    if (input) input.value = '';
  });
}

function renderCollectModal(): void {
  var current = document.getElementById('collect-current');
  var list = document.getElementById('collect-list');
  if (!current || !list) return;
  var song = collectTargetSong || {};
  var cover = songCoverSrc(song, 80);
  current.innerHTML = (cover ? '<img src="' + cover + '" alt="">' : '<div class="cover-placeholder"></div>') +
    '<div style="min-width:0"><div class="collect-title">' + escHtml(song.name || '当前歌曲') + '</div><div class="collect-sub">' + escHtml(song.artist || '') + '</div></div>';
  if (!loginStatus.loggedIn) {
    list.innerHTML = '<div class="collect-empty">登录后显示你的歌单</div>';
    return;
  }
  if (!userPlaylists.length) {
    list.innerHTML = miniQueueSkeleton();
    return;
  }
  var mine = userPlaylists.filter(function(pl){ return !pl.subscribed; });
  if (!mine.length) {
    list.innerHTML = '<div class="collect-empty">还没有可写入的歌单，可以先新建一个</div>';
    return;
  }
  list.innerHTML = mine.map(function(pl){
    var thumb = pl.cover ? coverUrlWithSize(pl.cover, 80) : '';
    return '<div class="collect-item" data-collect-pid="' + escHtml(String(pl.id || '')) + '" onclick="addCollectTargetToPlaylist(this.getAttribute(\'data-collect-pid\'))">' +
      (thumb ? '<img src="' + thumb + '" alt="">' : '<div class="cover-placeholder"></div>') +
      '<div style="min-width:0"><div class="collect-title">' + escHtml(pl.name || '') + '</div><div class="collect-sub">' + (pl.trackCount || 0) + ' 首</div></div>' +
    '</div>';
  }).join('');
  if (window.gsap) animateListItems(list, '.collect-item', { x: 0, y: 6, stagger: 0.012, duration: 0.18, limit: 18 });
}

function setCollectBusyPid(pid: string | number, busy: boolean): void {
  var list = document.getElementById('collect-list');
  if (!list) return;
  list.querySelectorAll('.collect-item').forEach(function(item){
    item.classList.toggle('busy', !!busy && item.getAttribute('data-collect-pid') === String(pid));
  });
}

async function createPlaylistFromCollect(): Promise<void> {
  if (!ensureLoggedInForAction()) return;
  var input = document.querySelector<HTMLInputElement>('#collect-new-name');
  var name = input ? input.value.trim() : '';
  if (!name) { showToast('先输入歌单名称'); return; }
  try {
    var r = await apiJson<CollectionMutationResponse>('/api/playlist/create?name=' + encodeURIComponent(name));
    if (r && r.error) throw new Error(r.error);
    if (input) input.value = '';
    showToast('歌单已创建');
    await refreshUserPlaylists(true);
    renderCollectModal();
    var created = r && r.playlist;
    var pid = created && created.id;
    if (pid && collectTargetSong) addCollectTargetToPlaylist(pid);
  } catch (err) {
    showToast('创建歌单失败');
  }
}

function collectResultMessage(r: CollectionMutationResponse | null): string {
  if (!r) return '收藏失败';
  var msg = r.error || r.message || r.msg || '';
  if (msg === 'LOGIN_REQUIRED') return '登录后可同步到网易云';
  if (/exist|重复|已存在|already/i.test(String(msg))) return '歌曲已在歌单中';
  return msg ? ('收藏失败: ' + msg) : '收藏失败';
}

async function addCollectTargetToPlaylist(pid: string | number): Promise<void> {
  if (collectBusy || !collectTargetSong || !pid) return;
  collectBusy = true;
  setCollectBusyPid(pid, true);
  updateLikeButtons();
  showToast('正在收藏到歌单...');
  try {
    var songId = String(collectTargetSong.id || '');
    var r = await apiJson<CollectionMutationResponse>('/api/playlist/add-song', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pid: pid, id: songId })
    });
    if (!(r && r.success)) throw new Error(collectResultMessage(r));
    showToast('已收藏到歌单');
    closeCollectModal();
    refreshUserPlaylists(true);
    setTimeout(function(){
      verifySongInPlaylist(pid, songId).then(function(ok){
        if (!ok) console.warn('collect submitted but verify did not find song yet:', pid, songId);
      });
    }, 900);
  } catch (error) {
    showToast(error instanceof Error ? error.message : '收藏失败');
  } finally {
    collectBusy = false;
    setCollectBusyPid(pid, false);
    updateLikeButtons();
  }
}

function cloneSong(song: PlaylistSong): PlaylistSong { return hydrateCustomCover(Object.assign({}, song)); }
