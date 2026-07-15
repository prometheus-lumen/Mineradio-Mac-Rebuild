function preparePlaybackFadeIn(): void {
  audioFadeSerial++;
  setAudioOutputGainImmediate(0);
}

function startPlaybackFadeIn(): void {
  audioFadeSerial++;
  if (targetVolume <= 0.001) setAudioOutputGainImmediate(0);
  else rampAudioOutputGain(targetVolume, AUDIO_FADE_IN_MS);
}

function restorePlaybackGain(): void {
  audioFadeSerial++;
  setAudioOutputGainImmediate(targetVolume);
}

function playbackRestrictionMessage(song: PlaylistSong, data: PlaybackUnavailableResponse): string {
  var restriction = data.restriction || {};
  var category = data.reason || restriction.category || '';
  var provider = playbackProviderLabel(song);
  var message = data.message || restriction.message || '';
  if (!message) {
    if (category === 'login_required') message = provider + '需要登录后再尝试播放';
    else if (category === 'vip_required') message = provider + '歌曲需要会员权限';
    else if (category === 'paid_required') message = provider + '歌曲需要购买或更高权限';
    else if (category === 'trial_only') message = provider + '仅返回试听片段';
    else if (category === 'copyright_unavailable') message = provider + '版权暂不可播';
    else message = provider + '没有返回可播放地址';
  }
  if (category === 'login_required') return message + ' · 正在打开登录';
  if (category === 'copyright_unavailable' || category === 'url_unavailable') return message + ' · 可以试试另一个平台版本';
  return message;
}

function qqPlaybackRetryQualities(requested: unknown, resolved: unknown): PlaybackQuality[] {
  var requestedQuality = normalizePlaybackQuality(requested || playbackQuality);
  var resolvedLevel = String(resolved || '').toLowerCase();
  var pool: PlaybackQuality[] = [];
  if (/^(jymaster|hires|lossless)$/.test(requestedQuality) || /^(hires|lossless)$/.test(resolvedLevel)) pool = ['exhigh', 'standard'];
  else if (requestedQuality === 'exhigh' || resolvedLevel === 'exhigh') pool = ['standard'];
  return pool.filter(function(quality): boolean { return quality !== requestedQuality; });
}

async function retryQQPlaybackWithCompatibleQuality(
  song: PlaylistSong,
  index: number,
  token: number,
  options: PlayQueueOptions,
  data: PlaybackUnavailableResponse,
  requested: PlaybackQuality
): Promise<boolean> {
  var tried = options.qqQualityTried ? options.qqQualityTried.slice() : [];
  [requested, data.level].forEach(function(value): void {
    var quality = normalizePlaybackQuality(value || '');
    if (!tried.includes(quality)) tried.push(quality);
  });
  var candidates = qqPlaybackRetryQualities(requested, data.level).filter(function(quality): boolean { return !tried.includes(quality); });
  if (!candidates.length || token !== trackSwitchToken) return false;
  var next = candidates[0];
  if (!next) return false;
  var resolved = normalizePlaybackQuality(data.level);
  if (resolved === 'hires' || resolved === 'lossless') qqPlaybackQualityCeiling = next;
  showSourceFallbackNotice('QQ 音质自动兼容', '当前音质启动失败，正在切到 ' + playbackQualityLabel(next) + '。');
  await playQueueAt(index, Object.assign({}, options, { qualityOverride: next, qqQualityTried: tried }));
  return true;
}

function closeSourceFallbackNotice(): void {
  if (sourceFallbackNoticeTimer) clearTimeout(sourceFallbackNoticeTimer);
  sourceFallbackNoticeTimer = null;
  document.getElementById('source-fallback-notice')?.classList.remove('show');
}

function showSourceFallbackNotice(title: string, body: string): void {
  var notice = document.getElementById('source-fallback-notice');
  if (!notice) return;
  setGuideText('source-fallback-title', title || '自动换源');
  setGuideText('source-fallback-body', body || '');
  notice.classList.add('show');
  if (sourceFallbackNoticeTimer) clearTimeout(sourceFallbackNoticeTimer);
  sourceFallbackNoticeTimer = setTimeout(closeSourceFallbackNotice, 5000);
}

function isSameTitleArtist(sourceSong: PlaylistSong | null, candidate: PlaylistSong | null): boolean {
  if (!sourceSong || !candidate) return false;
  if (normalizeMatchText(sourceSong.name || sourceSong.title) !== normalizeMatchText(candidate.name || candidate.title)) return false;
  var sourceArtists = artistNameParts(sourceSong);
  var candidateArtists = artistNameParts(candidate);
  return sourceArtists.length > 0 && candidateArtists.length > 0
    && sourceArtists.some(function(name): boolean { return candidateArtists.includes(name); });
}

async function tryAutoPlaybackFallback(
  song: PlaylistSong,
  data: PlaybackUnavailableResponse,
  index: number,
  token: number,
  options: PlayQueueOptions = {}
): Promise<boolean> {
  if ((options.fallbackDepth || 0) > 0) {
    skipFailedQueueItem(index, token, '自动换源后的版本仍不可播，正在播放下一首。');
    return true;
  }
  if (song.type === 'local' || song.type === 'podcast' || song.source === 'podcast') return false;
  var category = data.reason || data.restriction?.category || '';
  var fromLabel = playbackProviderLabel(song);
  var targetLabel = alternatePlaybackProvider(song) === 'qq' ? 'QQ 音乐' : '网易云';
  showSourceFallbackNotice('正在自动换源', fromLabel + ' 当前不可播，正在查找 ' + targetLabel + ' 的同名同歌手版本。');
  try {
    var alternate = await searchAlternatePlatformSong(song);
    if (token !== trackSwitchToken) return true;
    if (!alternate) {
      if (category === 'login_required') return false;
      skipFailedQueueItem(index, token, '没有找到同名同歌手的 ' + targetLabel + ' 版本，正在播放下一首。');
      return true;
    }
    alternate.autoFallbackFrom = songProviderKey(song);
    playQueue[index] = hydrateCustomCover(alternate);
    safeRenderQueuePanel('source-fallback', { scrollCurrent: miniQueueOpen });
    safeShelfRebuild('source-fallback');
    showSourceFallbackNotice('已自动切换音源', (song.name || '当前歌曲') + ' 已从 ' + fromLabel + ' 切到 ' + targetLabel + '。');
    await playQueueAt(index, { fallbackDepth: 1 });
    return true;
  } catch (error) {
    if (token !== trackSwitchToken) return true;
    skipFailedQueueItem(index, token, '自动换源搜索失败，正在播放下一首。');
    return true;
  }
}
