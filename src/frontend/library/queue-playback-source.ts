function requestedQueuePlaybackQuality(
  provider: MusicProvider | 'local',
  override?: PlaybackQuality
): PlaybackQuality {
  let quality = normalizePlaybackQuality(override || playbackQuality);
  if (provider === 'netease' && quality === 'jymaster' && !hasProviderSvip('netease', loginStatus)) {
    quality = 'hires';
  }
  if (provider === 'qq' && qqPlaybackQualityCeiling
    && (quality === 'jymaster' || quality === 'hires' || quality === 'lossless')) {
    quality = qqPlaybackQualityCeiling;
  }
  return quality;
}

function playbackSourceUrl(song: PlaylistSong, provider: MusicProvider | 'local', quality: PlaybackQuality): string {
  const qualityParam = `&quality=${encodeURIComponent(quality)}`;
  if (provider === 'qq') {
    return `/api/qq/song/url?mid=${encodeURIComponent(String(song.mid || song.songmid || song.id || ''))}`
      + `&mediaMid=${encodeURIComponent(String(song.mediaMid || song.media_mid || ''))}${qualityParam}`;
  }
  if (provider === 'kugou') {
    return `/api/kugou/song/url?hash=${encodeURIComponent(String(song.hash || song.id || ''))}`
      + `&albumAudioId=${encodeURIComponent(String(song.albumAudioId || song.album_audio_id || ''))}`
      + `&albumId=${encodeURIComponent(String(song.albumId || song.album_id || ''))}`
      + `&qualityHashes=${encodeURIComponent(JSON.stringify(song.qualityHashes || {}))}${qualityParam}`;
  }
  return `/api/song/url?id=${encodeURIComponent(String(song.id || ''))}${qualityParam}`;
}

function showQueueTrialBanner(song: PlaylistSong, data: PlaybackUnavailableResponse): void {
  if (!data.trial) return;
  let text = '当前未登录 · 仅播放试听片段';
  if (data.loggedIn && data.vipLevel === 'svip') text = '此歌曲需要单曲、专辑购买或更高权限';
  else if (data.loggedIn && data.vipLevel === 'vip') text = '此歌曲需要 SVIP 或购买 · 当前仅播放试听片段';
  else if (data.loggedIn) text = '此歌曲需 VIP · 当前仅播放试听片段';
  const trialText = document.getElementById('trial-text');
  if (trialText) trialText.textContent = text;
  const loginButton = document.getElementById('trial-login-btn');
  if (loginButton) {
    loginButton.style.display = data.loggedIn ? 'none' : '';
    loginButton.onclick = () => openProviderLogin(playbackLoginProvider(song));
  }
  document.getElementById('trial-banner')?.classList.add('show');
}

async function resolveQueuePlaybackSource(
  session: QueueTrackSession,
  options: PlayQueueOptions
): Promise<QueuePlaybackSource | null> {
  const { song, token, index } = session;
  const provider = songProviderKey(song);
  const isQQ = provider === 'qq';
  const isKugou = provider === 'kugou';
  if (!isKugou && audioGesturePrimeActive) clearAudioGesturePrime();
  if (options.manual && isKugou) primeAudioForUserGesture();
  const requestedQuality = requestedQueuePlaybackQuality(provider, options.qualityOverride);
  const data = await apiJson<PlaybackUnavailableResponse>(playbackSourceUrl(song, provider, requestedQuality));
  if (token !== trackSwitchToken) {
    clearAudioGesturePrime();
    return null;
  }
  if (!data.url) {
    clearAudioGesturePrime();
    if (isQQ && await retryQQPlaybackWithCompatibleQuality(song, index, token, options, data, requestedQuality)) return null;
    if (await tryAutoPlaybackFallback(song, data, index, token, options)) return null;
    handlePlaybackUnavailable(song, data);
    return null;
  }
  const resolvedQualityText = playbackResolvedQualityText(data);
  if (provider === 'netease' && playbackQualityWasDowngraded(requestedQuality, data.level)) {
    showSourceFallbackNotice('网易云音质自动降级', `请求 ${playbackQualityLabel(requestedQuality)}，实际播放 ${resolvedQualityText}。`);
  } else if (options.qualitySwitch) {
    showSourceFallbackNotice('音质已切换', `实际播放: ${resolvedQualityText}。`);
  }
  showQueueTrialBanner(song, data);
  const playableData = data as PlaybackUnavailableResponse & { url: string };
  const proxyAudioUrl = `/api/audio?url=${encodeURIComponent(playableData.url)}`;
  configureQueueAudioElement(session, options, proxyAudioUrl);
  const earlyPlayback = options.manual && isKugou ? playAudio({ silent: isQQ, manual: true }) : null;
  return { data: playableData, provider, requestedQuality, isQQ, isKugou, proxyAudioUrl, earlyPlayback };
}

function configureQueueAudioElement(
  session: QueueTrackSession,
  options: PlayQueueOptions,
  proxyAudioUrl: string
): void {
  if (!audio) {
    audio = new Audio();
    audio.crossOrigin = 'anonymous';
  } else {
    audioFadeSerial += 1;
    clearAudioFadeTimers();
    if (!audioGesturePrimeActive) audio.pause();
  }
  const media = audio;
  const preserveGesturePlayback = audioGesturePrimeActive;
  bindPlaybackProgressEvents(media);
  applyVolumeToAudio();
  media.loop = false;
  media.src = proxyAudioUrl;
  updatePlaybackProgressUi();
  media.onended = () => {
    if (handleHomeSleepTrackEnded() || session.token !== trackSwitchToken) return;
    finalizeListenSession(true);
    if (playMode === 'single') window.setTimeout(() => void playQueueAt(currentIdx, { autoRepeat: true }), 0);
    else window.setTimeout(nextTrack, 0);
  };
  scheduleAudioResumePosition(media, options.resumeAt || 0, session.token);
  if (!preserveGesturePlayback) media.load();
}
