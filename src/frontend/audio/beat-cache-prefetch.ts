function cancelBeatPrefetchTimer(): void {
  if (!beatPrefetchTimer) return;
  clearTimeout(beatPrefetchTimer);
  beatPrefetchTimer = null;
}

function beatMapSongKey(song: PlaylistSong | null | undefined): string {
  if (!song) return '';
  if (song.type === 'local' && song.localKey) return 'local:' + song.localKey;
  var provider = songProviderKey(song);
  if (provider === 'qq') return 'qq:' + String(song.mid || song.songmid || song.id || ((song.name || '') + '|' + (song.artist || '')));
  if (provider === 'kugou') return 'kugou:' + String(song.hash || song.id || ((song.name || '') + '|' + (song.artist || '')));
  return song.id !== undefined && song.id !== '' ? 'song:' + song.id : '';
}

function localBeatDiskKey(localKey: string, mode: string): string {
  return localKey ? 'local:' + localKey + ':' + (mode === 'dj' ? 'dj' : 'mr') : '';
}

function updateBeatDiskCacheStatus(data: unknown): void {
  if (!data || typeof data !== 'object') return;
  var record = data as BeatCacheApiResponse;
  beatDiskCacheStatus.checked = true;
  beatDiskCacheStatus.enabled = !!record.enabled || record.mode === 'disk';
  beatDiskCacheStatus.mode = record.mode || (beatDiskCacheStatus.enabled ? 'disk' : 'memory-only');
  beatDiskCacheStatus.reason = record.reason || '';
  if (!beatDiskCacheStatus.enabled && !beatDiskCacheNoticeLogged) {
    beatDiskCacheNoticeLogged = true;
    console.log('节拍磁盘缓存不可用，已降级为本次运行内存缓存:', beatDiskCacheStatus.reason || 'unknown');
  }
}

function beatPrefetchLimitForCurrentLoad(): number {
  var quality = normalizePerformanceQuality(fx.performanceQuality);
  if (quality === 'eco') return 0;
  if (quality === 'balanced') return 1;
  if (fx.preset === PARTICLE_CLOCK_PRESET_INDEX && !isRenderInteractionActive()) return 1;
  return BEAT_PREFETCH_LIMIT;
}

function beatPrefetchDelayForCurrentLoad(delayMs = 1800): number {
  var wait = delayMs;
  var quality = normalizePerformanceQuality(fx.performanceQuality);
  var interacting = isRenderInteractionActive();
  if (quality === 'eco') return Math.max(wait, 9000);
  if (quality === 'balanced') wait = Math.max(wait, 5200);
  if (fx.preset === PARTICLE_CLOCK_PRESET_INDEX && !interacting) wait = Math.max(wait, 6500);
  var tier = getRenderLoadTier();
  if (tier >= 2) wait = Math.max(wait, 6200);
  else if (tier >= 1) wait = Math.max(wait, 4200);
  if (interacting) wait = Math.max(wait, 2400);
  return wait;
}

async function ensureBeatDiskCacheStatus(): Promise<BeatDiskCacheStatus> {
  if (beatDiskCacheStatus.checked) return beatDiskCacheStatus;
  try {
    updateBeatDiskCacheStatus(await apiJson<BeatCacheApiResponse>('/api/beatmap/cache/status?t=' + Date.now()));
  } catch (error) {
    updateBeatDiskCacheStatus({ enabled: false, mode: 'memory-only', reason: 'STATUS_FAILED' });
  }
  return beatDiskCacheStatus;
}

async function readBeatDiskCache(key: string): Promise<BeatMap | null> {
  if (!key || beatMapCache[key]) return beatMapCache[key] || null;
  if (!(await ensureBeatDiskCacheStatus()).enabled) return null;
  try {
    var response = await apiJson<BeatCacheApiResponse>('/api/beatmap/cache?key=' + encodeURIComponent(key) + '&t=' + Date.now());
    if (response.enabled === false) updateBeatDiskCacheStatus(response);
    if (!response.hit || !response.map) return null;
    var map = unpackLocalBeatMap(response.map);
    if (!map) return null;
    beatMapCache[key] = map;
    return map;
  } catch (error) {
    console.warn('beat disk cache read failed:', error);
    return null;
  }
}

async function writeBeatDiskCache(key: string, map: BeatMap, song: PlaylistSong, mode: string): Promise<boolean> {
  if (!key || !(await ensureBeatDiskCacheStatus()).enabled) return false;
  try {
    var packed = packLocalBeatMap(map);
    if (!packed) return false;
    var response = await apiJson<BeatCacheApiResponse>('/api/beatmap/cache', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key: key, mode: mode || 'mr', provider: songProviderKey(song), title: song.name, artist: song.artist, map: packed })
    });
    if (response.enabled === false) updateBeatDiskCacheStatus(response);
    return !!response.ok;
  } catch (error) {
    console.warn('beat disk cache write failed:', error);
    return false;
  }
}

function isBeatPrefetchCandidate(song: PlaylistSong | null | undefined): boolean {
  return !!song && !isPodcastSong(song) && song.type !== 'local' && !song.localUrl && !!beatMapSongKey(song);
}

function findNextBeatPrefetchIndex(fromIndex: number, seen: Record<string, boolean> = {}): number {
  for (var step = 1; step < playQueue.length; step++) {
    var index = (fromIndex + step + playQueue.length) % playQueue.length;
    if (index === currentIdx) continue;
    var song = playQueue[index];
    var key = beatMapSongKey(song);
    if (isBeatPrefetchCandidate(song) && key && !beatMapCache[key] && !seen[key]) return index;
  }
  return -1;
}

function normalizeBeatPrefetchState(state: unknown): BeatPrefetchState {
  var record = state && typeof state === 'object' ? state as Record<string, unknown> : {};
  var rawKeys = record.keys && typeof record.keys === 'object' ? record.keys as Record<string, boolean> : record as Record<string, boolean>;
  return { keys: Object.assign({}, rawKeys), count: Math.max(0, Number(record.count) || 0) };
}

async function fetchBeatPrefetchAudioUrl(song: PlaylistSong | null): Promise<string | null> {
  if (!song) return null;
  var provider = songProviderKey(song);
  var quality = normalizePlaybackQuality(playbackQuality);
  if (provider === 'netease' && quality === 'jymaster' && !hasProviderSvip('netease', loginStatus)) quality = 'hires';
  if (provider === 'qq' && qqPlaybackQualityCeiling && /^(jymaster|hires|lossless)$/.test(quality)) quality = qqPlaybackQualityCeiling;
  var qualityParam = '&quality=' + encodeURIComponent(quality);
  var response = await fetchBeatAudioSource(provider, song, qualityParam);
  if (!response.url || response.trial) return null;
  return '/api/audio?url=' + encodeURIComponent(response.url);
}

async function fetchBeatAudioSource(provider: string, song: PlaylistSong, qualityParam: string): Promise<{ url?: string; trial?: boolean }> {
  if (provider === 'qq') return apiJson('/api/qq/song/url?mid=' + encodeURIComponent(String(song.mid || song.songmid || song.id || '')) + '&mediaMid=' + encodeURIComponent(song.mediaMid || song.media_mid || '') + qualityParam);
  if (provider === 'kugou') return apiJson('/api/kugou/song/url?hash=' + encodeURIComponent(String(song.hash || song.id || '')) + '&albumAudioId=' + encodeURIComponent(String(song.albumAudioId || song.album_audio_id || '')) + '&albumId=' + encodeURIComponent(String(song.albumId || song.album_id || '')) + '&qualityHashes=' + encodeURIComponent(JSON.stringify(song.qualityHashes || {})) + qualityParam);
  return apiJson('/api/song/url?id=' + encodeURIComponent(String(song.id || '')) + qualityParam);
}

function showBeatChip(text: string): void {
  setGuideText('beat-text', text || '分析节奏…');
  document.getElementById('beat-chip')?.classList.add('show');
  if (localBeatAnalysis.active) setLocalBeatStatus(text || '分析中...', 'warn');
}

function hideBeatChip(): void {
  document.getElementById('beat-chip')?.classList.remove('show');
}
