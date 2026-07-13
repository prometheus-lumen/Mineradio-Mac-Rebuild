'use strict';

// Mineradio classic module: account/likes.
function isLikeSyncSong(song) {
  return isCloudSong(song) || (isKugouSong(song) && !!(song.hash || song.id));
}

function isSongLiked(song) {
  return !!(song && song.id && likedSongMap[String(song.id)]);
}

function updateLikeButtons(song) {
  song = song || currentCoverSong();
  var liked = isSongLiked(song);
  var busy = !!(song && song.id && likeBusyMap[String(song.id)]);
  var btn = document.getElementById('heart-btn');
  if (btn) {
    btn.classList.toggle('liked', liked);
    btn.classList.toggle('busy', busy);
    btn.title = liked ? '取消红心' : '红心喜欢';
  }
  var collectBtn = document.getElementById('collect-btn');
  if (collectBtn) collectBtn.classList.toggle('busy', collectBusy);
}

function heartIconSvg() {
  return '<svg class="heart-svg" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21.45c-.32 0-.62-.12-.86-.34l-1.23-1.12C5.54 16.03 2.25 13.05 2.25 8.9 2.25 5.48 4.88 2.9 8.28 2.9c1.7 0 3.35.72 4.52 1.96C13.97 3.62 15.62 2.9 17.32 2.9c3.4 0 6.03 2.58 6.03 6 0 4.15-3.29 7.13-7.66 11.09l-1.23 1.12c-.24.22-.54.34-.86.34z"/></svg>';
}

function syncLikeStatusForSongs(songs) {
  if (!songs || !songs.length) return;
  var neteaseIds = loginStatus.loggedIn
    ? songs.filter(isCloudSong).map(function(s){ return String(s.id); })
    : [];
  var kugouIds = kugouLoginStatus.loggedIn
    ? songs.filter(isKugouSong).map(function(s){ return String(s.hash || s.id || '').toUpperCase(); }).filter(Boolean)
    : [];
  if (!neteaseIds.length && !kugouIds.length) return;
  var token = ++likeStatusToken;
  var requests = [];
  if (neteaseIds.length) requests.push(
    apiJson('/api/song/like/check?ids=' + encodeURIComponent(neteaseIds.join(',')))
      .catch(function(err){ console.warn('netease like check failed:', err); return null; })
  );
  if (kugouIds.length) requests.push(
    apiJson('/api/kugou/song/like/check?ids=' + encodeURIComponent(kugouIds.join(',')))
      .then(function(r){
        if (r && r.fileIds) {
          songs.forEach(function(song){
            if (!isKugouSong(song)) return;
            var hash = String(song.hash || song.id || '').toUpperCase();
            if (r.fileIds[hash] != null) song.fileId = r.fileIds[hash];
          });
        }
        return r;
      })
      .catch(function(err){ console.warn('kugou like check failed:', err); return null; })
  );
  Promise.all(requests).then(function(responses){
    if (token < likeStatusToken - 3) return;
    responses.forEach(function(r){
      if (!r || !r.liked) return;
      Object.keys(r.liked).forEach(function(id){ likedSongMap[String(id)] = !!r.liked[id]; });
    });
    safeRenderQueuePanel('like-status-sync', { scrollCurrent: miniQueueOpen });
    if ($results && $results.classList.contains('show')) refreshSearchResultActionStates();
    updateLikeButtons();
  });
}

function syncLikeStatusForSong(song) {
  if (!isLikeSyncSong(song)) { updateLikeButtons(song); return; }
  syncLikeStatusForSongs([song]);
}

function isLikedPlaylistContext(id, title, meta) {
  var sid = String(id || '');
  var text = String(title || (meta && meta.name) || '').trim();
  var hit = userPlaylists.find(function(pl){ return String(pl.id || '') === sid; });
  if (hit) {
    if (Number(hit.specialType || 0) === 5) return true;
    text = text || hit.name || '';
  }
  return /我喜欢|喜欢的音乐|liked/i.test(text);
}

function markSongsLiked(songs, liked) {
  (songs || []).forEach(function(song){
    if (isLikeSyncSong(song)) likedSongMap[String(song.id)] = !!liked;
  });
}

async function requestKugouLike(song, liked) {
  var payload = {
    hash: song.hash || song.id,
    name: song.name || '',
    albumId: song.albumId || song.album_id || 0,
    albumAudioId: song.albumAudioId || song.album_audio_id || 0,
    fileId: song.fileId || song.file_id || 0,
    like: liked
  };
  var lastError = null;
  for (var attempt = 0; attempt < 3; attempt++) {
    if (attempt) await waitForKugouSync(attempt * 650);
    try {
      var result = await apiJson('/api/kugou/song/like', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (result && !result.error && result.success !== false) return result;
      lastError = new Error(result && result.error || 'KUGOU_LIKE_FAILED');
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError || new Error('KUGOU_LIKE_FAILED');
}

async function toggleLikeSong(song) {
  var provider = songProviderKey(song);
  if (!isLikeSyncSong(song)) {
    showToast(provider === 'qq' ? 'QQ 音乐红心同步待登录接口接入' : '本地文件暂不支持红心同步');
    return;
  }
  if (provider === 'kugou') {
    if (!ensureKugouLoggedInForAction()) return;
  } else if (!ensureLoggedInForAction()) return;
  var id = String(song.id);
  if (likeBusyMap[id]) return;
  var next = !likedSongMap[id];
  likeBusyMap[id] = true;
  likedSongMap[id] = next;
  updateLikeButtons(song);
  safeRenderQueuePanel('like-toggle-optimistic', { scrollCurrent: miniQueueOpen });
  refreshSearchResultActionStates();
  try {
    var r = provider === 'kugou'
      ? await requestKugouLike(song, next)
      : await apiJson('/api/song/like?id=' + encodeURIComponent(id) + '&like=' + encodeURIComponent(String(next)));
    if (r && (r.error || r.success === false)) throw new Error(r.error || 'KUGOU_LIKE_FAILED');
    likedSongMap[id] = next;
    if (provider === 'kugou') {
      if (!next) {
        song.fileId = 0;
        song.file_id = 0;
      }
      setTimeout(function(){ refreshUserPlaylists(true).catch(function(){}); }, 700);
    }
    showToast(next ? (provider === 'kugou' ? '已加入酷狗“我喜欢”' : '已加入红心喜欢') : '已取消红心');
  } catch (err) {
    likedSongMap[id] = !next;
    console.warn('[KugouLike]', { hash: song.hash || song.id, liked: next, error: err });
    showToast(provider === 'kugou' ? '酷狗红心同步失败' : '红心操作失败');
  } finally {
    delete likeBusyMap[id];
    updateLikeButtons(song);
    safeRenderQueuePanel('like-toggle-final', { scrollCurrent: miniQueueOpen });
    refreshSearchResultActionStates();
  }
}

function toggleLikeCurrent() { toggleLikeSong(currentCoverSong()); }

function toggleLikeSearchResult(i) { if (playlist[i]) toggleLikeSong(playlist[i]); }

function toggleLikeQueueIndex(i) { if (playQueue[i]) toggleLikeSong(playQueue[i]); }

function toggleLikeDetailSong(song) { toggleLikeSong(song); }

function searchLooksLikeDerivative(text) {
  return /(翻唱|cover|伴奏|instrumental|remix|片段|demo|女声|男声|karaoke|完整版\s*cover|抖音版|dj版|合唱版|改编版|赵露思版|超燃|硬曲|剪辑|二创|tribute|made\s*famous\s*by)/i.test(String(text || ''));
}

function searchLooksLikeSameTitleCover(song, nq, name, album, raw, originalArtistMatch, sourceIndex) {
  if (!song || !nq || !name || originalArtistMatch) return false;
  var sameTitle = name === nq || nq.indexOf(name) >= 0 || name.indexOf(nq) === 0;
  if (!sameTitle) return false;
  var selfTitledSingle = !!(album && (album === name || album === nq || album.indexOf(name) >= 0 || name.indexOf(album) >= 0));
  return selfTitledSingle || searchLooksLikeDerivative(raw) || (sourceIndex || 0) > 0;
}

function __mineradioInitAccountLikes39() {
  document.addEventListener('click', function(e) {
    if (!isHomeBlankDismissClick(e)) return;
    e.preventDefault();
    e.stopPropagation();
    dismissHomePage({ reason: 'blank-click' });
  }, true);

  trackDetailSeq = 0;

  detailArtistSongs = [];
}
