function renderSongSearchResults(songs: PlaylistSong[]): void {
  playlist = songs || [];
  $results.innerHTML = playlist.map(function(s, i){
    var vipTag = (s.fee === 1) ? '<span class="tag-vip">VIP</span>' : '';
    var sourceTag = songSourceTagHtml(s);
    var sourceClass = songProviderKey(s) + '-source';
    var thumb = songCoverSrc(s, 80);
    var imgTag = thumb
      ? '<img src="' + thumb + '" alt="" loading="lazy" data-fade-on-error="0.2">'
      : '<div style="width:40px;height:40px;border-radius:6px;background:rgba(255,255,255,0.06);flex-shrink:0"></div>';
    return '<div class="search-result ' + sourceClass + '">' +
      '<div style="display:flex;align-items:center;gap:12px;flex:1;min-width:0" data-action="playSearchResult" data-index="' + i + '">' +
        imgTag +
        '<div class="search-result-info">' +
          '<div class="search-result-title">' + escHtml(s.name) + sourceTag + vipTag + '</div>' +
          '<div class="search-result-meta">' + searchResultMetaHtml(s, i) + '</div>' +
        '</div>' +
      '</div>' +
      '<button class="song-action-btn' + (isSongLiked(s) ? ' liked' : '') + '" data-like-index="' + i + '" data-action="toggleLikeSearchResult" data-index="' + i + '" data-stop-propagation="true" title="' + (isSongLiked(s) ? '取消红心' : '红心喜欢') + '">' + heartIconSvg() + '</button>' +
      '<button class="song-action-btn" data-action="collectSearchResult" data-index="' + i + '" data-stop-propagation="true" title="收藏到歌单">' + playlistPlusIconSvg() + '</button>' +
      '<button class="add-btn" data-action="queueSearchResult" data-index="' + i + '" data-stop-propagation="true" title="下一首播放">+</button>' +
    '</div>';
  }).join('');
  $results.classList.add('show');
  syncLikeStatusForSongs(playlist);
  if (window.gsap) animateListItems($results, '.search-result', { x: 0, y: 6, stagger: 0.012, duration: 0.18, limit: 18 });
}

async function doSearch(q: string, opts: SearchOptions = {}): Promise<void> {
  q = String(q || '').trim();
  if (!q) {
    if (searchMode === 'podcast') loadPodcastHot();
    else renderSearchHistory();
    return;
  }
  if (searchMode === 'podcast') {
    doPodcastSearch(q);
    return;
  }
  var requestSeq = ++searchRequestSeq;
  try {
    var mode = searchMode;
    var songs = await fetchMusicSearchResults(q, mode);
    if (requestSeq !== searchRequestSeq || $input.value.trim() !== q) return;
    if (!songs.length) {
      playlist = [];
      searchLastResultQuery = '';
      $results.innerHTML = '<div class="search-empty">没有找到相关歌曲</div>';
      $results.classList.add('show');
      return;
    }
    searchLastResultQuery = searchResultKey(q, mode);
    rememberSearchQuery(q);
    renderSongSearchResults(songs);
    if (opts.autoPlayFirst) playSearchResult(0);
  } catch (err) {
    if (requestSeq !== searchRequestSeq) return;
    if (err instanceof DOMException && err.name === 'AbortError') return;
    console.error('Search:', err);
    $results.innerHTML = '<div class="search-empty">' + escHtml(err instanceof Error ? err.message : '搜索失败') + '</div>';
    $results.classList.add('show');
  }
}

function audioSilentFloor(): number {
  return targetVolume > 0.001 ? AUDIO_SILENCE_GAIN : 0;
}

function fadeOutAndPauseAudio(): Promise<boolean> {
  if (!audio || audio.paused) return Promise.resolve(false);
  var serial = ++audioFadeSerial;
  rampAudioOutputGain(0, AUDIO_FADE_OUT_MS);
  return new Promise<boolean>(function(resolve): void {
    setTimeout(function(){
      if (serial !== audioFadeSerial || !audio) {
        resolve(false);
        return;
      }
      try { audio.pause(); } catch (pauseErr) { console.warn('[TogglePlayPause]', pauseErr); }
      setAudioOutputGainImmediate(0);
      resolve(true);
    }, AUDIO_FADE_OUT_MS + 80);
  });
}

function queueSearchResult(i: number): void {
  var song = playlist[i]; if (!song) return;
  queueSongNext(song);
  showToast('已设为下一首: ' + song.name);
}

function playSearchResult(i: number): void {
  var song = playlist[i]; if (!song) return;
  homeForcedOpen = false;
  homeSuppressed = false;
  setHomeControlsLocked(false);
  if (!playQueue.length) { playQueue.unshift(cloneSong(song)); currentIdx = 0; }
  else {
    var matchIdx = -1;
    var targetKey = queueItemKey(song);
    for (var j = 0; j < playQueue.length; j++) if (queueItemKey(playQueue[j]) === targetKey) { matchIdx = j; break; }
    if (matchIdx >= 0) currentIdx = moveQueueIndexToTop(matchIdx);
    else { playQueue.unshift(cloneSong(song)); currentIdx = 0; }
  }
  $results.classList.remove('show');
  $input.value = ''; $input.blur();
  playQueueAt(currentIdx, { manual: true });
}
