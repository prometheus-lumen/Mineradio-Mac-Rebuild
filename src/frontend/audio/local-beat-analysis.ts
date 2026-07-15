function prepareLocalBeatAnalysis(song: PlaylistSong, audioUrl: string): void {
  if (!song.localKey || !audioUrl) return;
  var preferred: LocalBeatMode = localBeatMapPrefs[song.localKey] === 'dj' ? 'dj' : 'mr';
  var alternate: LocalBeatMode = preferred === 'dj' ? 'mr' : 'dj';
  var cached = getLocalBeatEntry(song.localKey, preferred) || getLocalBeatEntry(song.localKey, alternate);
  if (cached) {
    applyLocalBeatMap(song, cached === getLocalBeatEntry(song.localKey, 'dj') ? 'dj' : 'mr', cached, true);
    return;
  }
  void loadLocalBeatMapFromDisk(song, audioUrl, preferred, trackSwitchToken);
}

async function loadLocalBeatMapFromDisk(song: PlaylistSong, audioUrl: string, preferred: LocalBeatMode, token: number): Promise<void> {
  try {
    var alternate: LocalBeatMode = preferred === 'dj' ? 'mr' : 'dj';
    var first = await readBeatDiskCache(localBeatDiskKey(song.localKey || '', preferred));
    var mode: LocalBeatMode = first ? preferred : alternate;
    var map = first || await readBeatDiskCache(localBeatDiskKey(song.localKey || '', alternate));
    if (!isCurrentLocalBeatRequest(song, token)) return;
    if (!map) {
      openLocalBeatModal(song, audioUrl);
      return;
    }
    storeLocalBeatEntry(song.localKey || '', mode, map, song, { skipDisk: true });
    applyLocalBeatMap(song, mode, map, true);
  } catch (error) {
    if (isCurrentLocalBeatRequest(song, token)) openLocalBeatModal(song, audioUrl);
  }
}

function isCurrentLocalBeatRequest(song: PlaylistSong, token: number): boolean {
  return token === trackSwitchToken && currentLocalSong?.localKey === song.localKey;
}

function openLocalBeatModal(song?: PlaylistSong, audioUrl?: string): void {
  if (immersiveMode) setImmersiveMode(false);
  localBeatAnalysis.song = song || currentLocalSong;
  localBeatAnalysis.audioUrl = audioUrl || audio?.src || '';
  localBeatAnalysis.mode = localBeatMapPrefs[localBeatAnalysis.song?.localKey || ''] === 'dj' ? 'dj' : 'mr';
  localBeatAnalysis.active = false;
  setLocalBeatStatus('', '');
  updateLocalBeatModal();
  openGsapModal(document.getElementById('local-beat-modal'));
}

function closeLocalBeatModal(): void {
  if (!localBeatAnalysis.active) closeGsapModal(document.getElementById('local-beat-modal'));
}

function selectLocalBeatMode(mode: string): void {
  if (localBeatAnalysis.active) return;
  localBeatAnalysis.mode = mode === 'dj' ? 'dj' : 'mr';
  updateLocalBeatModal();
}

function updateLocalBeatModal(): void {
  var song = localBeatAnalysis.song || currentLocalSong;
  var mode = localBeatAnalysis.mode;
  document.querySelector('#local-beat-modal .local-beat-modal')?.classList.toggle('analyzing', localBeatAnalysis.active);
  setGuideText('local-beat-title', song?.name || '本地歌曲');
  updateLocalBeatModalSubtitle(song);
  document.getElementById('local-beat-tab-mr')?.classList.toggle('active', mode === 'mr');
  document.getElementById('local-beat-tab-dj')?.classList.toggle('active', mode === 'dj');
  setGuideText('local-beat-desc', mode === 'dj'
    ? '适合 DJ、长混音或鼓点密集的本地音频，会使用更稳定的低频锁拍并进入 DJ 视觉驱动。'
    : '适合普通歌曲和日常播放，会沿用 Mineradio 电影视角的综合节奏分析。');
  var start = document.querySelector<HTMLButtonElement>('#local-beat-start-btn');
  if (start) {
    start.disabled = localBeatAnalysis.active;
    start.textContent = song?.localKey && getLocalBeatEntry(song.localKey, mode) ? '使用缓存' : '开始分析';
  }
  var cancel = document.getElementById('local-beat-cancel-btn');
  var later = document.getElementById('local-beat-later-btn');
  if (cancel) cancel.style.display = localBeatAnalysis.active ? '' : 'none';
  if (later) later.style.display = localBeatAnalysis.active ? 'none' : '';
}

function updateLocalBeatModalSubtitle(song: PlaylistSong | null): void {
  var cached: string[] = [];
  if (song?.localKey && getLocalBeatEntry(song.localKey, 'mr')) cached.push('MR 已缓存');
  if (song?.localKey && getLocalBeatEntry(song.localKey, 'dj')) cached.push('DJ 已缓存');
  setGuideText('local-beat-sub', cached.length ? cached.join(' / ') : '选择一种电影视角分析方式');
}

function cancelLocalBeatAnalysis(): void {
  if (!localBeatAnalysis.active) {
    closeLocalBeatModal();
    return;
  }
  localBeatAnalysis.active = false;
  localBeatAnalysis.token++;
  beatMapToken++;
  djBeatMapToken++;
  djBeatMapBusy = false;
  cancelBeatAnalysisTimer();
  cancelDjBeatAnalysisTimer();
  hideBeatChip();
  if (localBeatAnalysis.mode === 'dj') setDjModeActive(false, localBeatAnalysis.song || currentLocalSong);
  setLocalBeatStatus('已取消分析', 'fail');
  updateLocalBeatModal();
}

async function startLocalBeatAnalysis(requestedMode?: string): Promise<void> {
  var song = localBeatAnalysis.song || currentLocalSong;
  var audioUrl = localBeatAnalysis.audioUrl || song?.localUrl || audio?.src || '';
  var mode: LocalBeatMode = (requestedMode || localBeatAnalysis.mode) === 'dj' ? 'dj' : 'mr';
  if (!song?.localKey || !audioUrl || localBeatAnalysis.active) return;
  var cached = getLocalBeatEntry(song.localKey, mode);
  if (cached) {
    applyLocalBeatMap(song, mode, cached, true);
    closeGsapModal(document.getElementById('local-beat-modal'));
    return;
  }
  localBeatAnalysis.active = true;
  localBeatAnalysis.mode = mode;
  var localToken = ++localBeatAnalysis.token;
  updateLocalBeatModal();
  setLocalBeatStatus((mode === 'dj' ? 'DJ' : 'MR') + ' 分析准备中...', 'warn');
  try {
    var map = mode === 'dj'
      ? await runLocalDjAnalysis(song, audioUrl, localToken)
      : await runLocalMrAnalysis(song, audioUrl, localToken);
    if (!map) return;
    storeLocalBeatEntry(song.localKey, mode, map, song);
    applyLocalBeatMap(song, mode, map, false);
    localBeatAnalysis.active = false;
    setLocalBeatStatus((mode === 'dj' ? 'DJ' : 'MR') + ' 分析完成: ' + localBeatVisualCount(map) + ' 个主拍', '');
    updateLocalBeatModal();
    showToast((mode === 'dj' ? 'DJ' : 'MR') + ' 本地节奏分析完成');
    setTimeout(function(): void { if (!localBeatAnalysis.active) closeGsapModal(document.getElementById('local-beat-modal')); }, 900);
  } catch (error) {
    console.warn('local beat analysis failed:', error);
    localBeatAnalysis.active = false;
    hideBeatChip();
    if (mode === 'dj') setDjModeActive(false, song);
    setLocalBeatStatus('分析失败，请换另一种模式重试', 'fail');
    updateLocalBeatModal();
    showToast('本地节奏分析失败');
  }
}

async function runLocalDjAnalysis(song: PlaylistSong, audioUrl: string, localToken: number): Promise<BeatMap | null> {
  setDjModeActive(true, song);
  djBeatMapToken++;
  resetDjBeatMapState();
  currentBeatMap = null;
  resetBeatCameraSync(audio?.currentTime || 0);
  var token = djBeatMapToken;
  var map = await analyzePodcastDjBeats(audioUrl, token, audio && isFinite(audio.duration) ? audio.duration : 0);
  return localToken === localBeatAnalysis.token && token === djBeatMapToken ? map : null;
}

async function runLocalMrAnalysis(song: PlaylistSong, audioUrl: string, localToken: number): Promise<BeatMap | null> {
  setDjModeActive(false, song);
  cancelBeatAnalysisTimer();
  beatMapToken++;
  currentBeatMap = null;
  beatMapNextIdx = 0;
  resetBeatCameraSync(audio?.currentTime || 0);
  var token = beatMapToken;
  var map = await analyzeAudioBeats(audioUrl, audio && isFinite(audio.duration) ? audio.duration : 0, token, { background: false, song: song });
  return localToken === localBeatAnalysis.token && token === beatMapToken ? map : null;
}

function applyBeatMapCacheForCurrent(songId: string, map: BeatMap, token: number, message?: string): boolean {
  if (!songId || !map || token !== beatMapToken) return false;
  beatMapCache[songId] = map;
  currentBeatMap = map;
  applyCinemaProfileFromBeatMap(map);
  syncBeatMapPlaybackCursor(audio?.currentTime || 0, true);
  hideBeatChip();
  notifyDesktopLyricsBeatMapReady();
  if (message) console.log(message, songId, map.visualBeatCount || 0);
  scheduleQueueBeatPrefetch(currentIdx, 1000);
  return true;
}
