function readCustomCoverMap(): Record<string, string> {
  try {
    var raw = localStorage.getItem(CUSTOM_COVER_STORE_KEY);
    var parsed = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch (e) {
    return {};
  }
}

function saveCustomCoverMap(): boolean {
  try {
    localStorage.setItem(CUSTOM_COVER_STORE_KEY, JSON.stringify(customCoverMap || {}));
    return true;
  } catch (e) {
    console.warn('custom cover save failed:', e);
    return false;
  }
}

function effectiveBackgroundMedia(song?: PlaylistSong | null): BackgroundMedia | null {
  return normalizeCustomBackgroundMedia(globalBackgroundMedia) || getCustomBackgroundMediaForSong(song || currentCoverSong());
}

function isInlineCoverSrc(src: unknown): boolean {
  return typeof src === 'string' && (/^data:image\//i.test(src) || /^blob:/i.test(src));
}

function isProxyableCoverUrl(url: unknown): boolean {
  return /^https?:\/\//i.test(String(url || ''));
}

function coverProxySrc(url?: string | null, cacheBust?: boolean): string {
  if (!url) return '';
  if (isInlineCoverSrc(url)) return url;
  if (!isProxyableCoverUrl(url)) return '';
  return '/api/cover?url=' + encodeURIComponent(url) + (cacheBust ? '&v=' + Date.now() : '');
}

function coverUrlWithSize(url?: string | null, size?: number): string {
  if (!url || isInlineCoverSrc(url) || !/^https?:\/\//i.test(url)) return url || '';
  if (!size) return url;
  var param = 'param=' + size + 'y' + size;
  if (/[?&]param=\d+y\d+/i.test(url)) return url.replace(/([?&])param=\d+y\d+/i, '$1' + param);
  return url + (url.indexOf('?') >= 0 ? '&' : '?') + param;
}

function songCustomCoverKey(song?: PlaylistSong | null): string {
  if (!song) return '';
  if (song.customCoverKey) return String(song.customCoverKey);
  if (song.provider === 'qq' || song.source === 'qq' || song.type === 'qq') return 'qq:' + (song.mid || song.songmid || song.id || (song.name + '|' + song.artist));
  if (song.localKey) return 'local:' + song.localKey;
  if (song.type === 'podcast' && song.programId) return 'podcast:' + song.programId;
  if (song.id != null && song.id !== '') return 'id:' + song.id;
  var title = String(song.name || song.title || '').trim();
  var artist = String(song.artist || '').trim();
  return (title || artist) ? ('meta:' + (title + '|' + artist).slice(0, 220)) : '';
}

function getCustomCoverForSong(song?: PlaylistSong | null): string {
  if (!song) return '';
  if (song.customCover) return String(song.customCover);
  var key = songCustomCoverKey(song);
  return key && customCoverMap[key] ? customCoverMap[key] : '';
}

function hydrateCustomCover(song: PlaylistSong): PlaylistSong {
  var custom = getCustomCoverForSong(song);
  if (custom) song.customCover = custom;
  return song;
}

function songCoverSrc(song: PlaylistSong | null | undefined, size?: number): string {
  var custom = getCustomCoverForSong(song);
  if (custom) return custom;
  if (!song || !song.cover) return '';
  var src = coverUrlWithSize(song.cover, size);
  var provider = song.provider || song.source || song.type || '';
  return provider === 'netease' ? coverProxySrc(src) : src;
}

function currentCoverSong(): PlaylistSong | null {
  if (currentIdx >= 0 && playQueue[currentIdx]) return playQueue[currentIdx];
  return currentLocalSong || null;
}

function setCustomCoverForCurrent(dataUrl: string, opts?: CoverLoadOptions): void {
  if (!dataUrl) return;
  var song = currentCoverSong();
  var saved = false;
  var hasKey = false;
  if (song) {
    var key = songCustomCoverKey(song);
    song.customCover = dataUrl;
    if (key) {
      hasKey = true;
      customCoverMap[key] = dataUrl;
      saved = saveCustomCoverMap();
      for (var i = 0; i < playQueue.length; i++) {
        if (songCustomCoverKey(playQueue[i]) === key) playQueue[i].customCover = dataUrl;
      }
      if (currentLocalSong && songCustomCoverKey(currentLocalSong) === key) currentLocalSong.customCover = dataUrl;
    }
  }
  loadVisualCoverForSong(song, opts);
  safeRenderQueuePanel('custom-cover-apply', { scrollCurrent: miniQueueOpen });
  safeShelfRebuild('custom-cover-apply');
  updateCustomCoverButton();
  showToast(song ? (!hasKey ? '封面已应用' : (saved ? '封面已保存' : '封面已应用，存储空间不足')) : '已应用临时封面');
}

function updateCustomCoverButton(): void {
  var btn = document.getElementById('clear-cover-btn');
  var hasCover = !!getCustomCoverForSong(currentCoverSong());
  var area = document.getElementById('search-area');
  if (area) area.classList.toggle('has-cover-action', hasCover);
  if (!btn) return;
  btn.classList.toggle('has-cover', hasCover);
  btn.title = hasCover ? '取消自定义封面' : '当前没有自定义封面';
  btn.setAttribute('aria-label', btn.title);
}

function clearCustomCoverForCurrent(): void {
  var song = currentCoverSong();
  if (!song) {
    showToast('先播放或选择一首歌');
    updateCustomCoverButton();
    return;
  }
  var custom = getCustomCoverForSong(song);
  if (!custom) {
    showToast('当前没有自定义封面');
    updateCustomCoverButton();
    return;
  }
  var key = songCustomCoverKey(song);
  if (key && customCoverMap[key]) {
    delete customCoverMap[key];
    saveCustomCoverMap();
  }
  delete playlistCoverCache[custom];
  delete song.customCover;
  if (key) {
    for (var i = 0; i < playQueue.length; i++) {
      if (songCustomCoverKey(playQueue[i]) === key) delete playQueue[i].customCover;
    }
  }
  if (key && currentLocalSong && songCustomCoverKey(currentLocalSong) === key) delete currentLocalSong.customCover;
  loadVisualCoverForSong(song, { trackToken: trackSwitchToken, deferHeavy: true, delay: 260, timeout: 1200 });
  safeRenderQueuePanel('custom-cover-clear', { scrollCurrent: miniQueueOpen });
  safeShelfRebuild('custom-cover-clear');
  updateCustomCoverButton();
  showToast('已恢复默认封面');
}
