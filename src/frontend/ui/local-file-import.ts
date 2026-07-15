function releaseCurrentLocalAudioUrl(): void {
  var song = currentLocalSong;
  var url = song?.localUrl || '';
  if (!url.startsWith('blob:')) return;
  if (audio && (audio.getAttribute('src') === url || audio.src === url)) {
    try {
      audio.pause();
      audio.removeAttribute('src');
      audio.load();
    } catch (error) {}
  }
  URL.revokeObjectURL(url);
  if (song) song.localUrl = '';
  if (localBeatAnalysis.audioUrl === url) localBeatAnalysis.audioUrl = '';
}

function classifyLocalFiles(files: FileList | File[]): { audio: File | null; image: File | null } {
  var audioFile: File | null = null;
  var imageFile: File | null = null;
  Array.from(files).forEach(function(file): void {
    if (file.type.startsWith('audio/') || /\.(mp3|flac|wav|ogg|m4a)$/i.test(file.name)) audioFile = file;
    else if (file.type.startsWith('image/') || /\.(jpg|jpeg|png|webp)$/i.test(file.name)) imageFile = file;
  });
  return { audio: audioFile, image: imageFile };
}

function handleFiles(files: FileList | File[]): void {
  var selected = classifyLocalFiles(files);
  var firstVisualPlay = false;
  if (selected.audio) firstVisualPlay = startLocalFilePlayback(selected.audio, !!selected.image);
  if (selected.image) {
    var options = selected.audio ? createLocalCoverOptions(trackSwitchToken, firstVisualPlay) : null;
    loadCoverFromFile(selected.image, options);
  }
  if (!selected.audio) updateCustomCoverButton();
}

function startLocalFilePlayback(file: File, hasImage: boolean): boolean {
  finalizeListenSession(false);
  if (localBeatAnalysis.active) cancelLocalBeatAnalysis();
  releaseCurrentLocalAudioUrl();
  var url = URL.createObjectURL(file);
  var title = file.name.replace(/\.[^.]+$/, '');
  var firstVisualPlay = !firstPlayDone;
  var token = ++trackSwitchToken;
  resetLocalPlaybackAnalysis();
  currentLocalSong = hydrateCustomCover({
    type: 'local', name: title, artist: '本地文件',
    localKey: [file.name, file.size || 0, file.lastModified || 0].join(':'),
    localUrl: url, duration: 0
  });
  var localSong = currentLocalSong;
  if (!localSong) return false;
  updateCustomCoverButton();
  updateLocalTrackUi(localSong, title, firstVisualPlay);
  configureLocalAudio(localSong, url);
  resetLocalLyrics();
  playAudio().then(function(ok): void {
    if (ok && currentLocalSong?.localUrl === url) beginListenSession(currentLocalSong, null);
  });
  setTimeout(function(): void {
    if (currentLocalSong?.localUrl === url) prepareLocalBeatAnalysis(currentLocalSong, url);
  }, 520);
  var customCover = getCustomCoverForSong(currentLocalSong);
  var coverOptions = createLocalCoverOptions(token, firstVisualPlay);
  if (customCover) applyCoverDataUrl(customCover, coverOptions);
  else if (!hasImage) loadCoverFromUrl('', coverOptions);
  return firstVisualPlay;
}

function resetLocalPlaybackAnalysis(): void {
  closeGsapModal(document.getElementById('local-beat-modal'));
  cancelBeatAnalysisTimer();
  cancelDjBeatAnalysisTimer();
  beatMapToken++;
  djBeatMapToken++;
  setDjModeActive(false, null);
  currentBeatMap = null;
  resetDjBeatMapState();
  beatMapNextIdx = 0;
  resetAudioVisualState();
  resetBeatCameraSync(0);
  currentIdx = -1;
}

function updateLocalTrackUi(song: PlaylistSong, title: string, firstVisualPlay: boolean): void {
  document.getElementById('hint')?.classList.add('hidden');
  setGuideText('thumb-title', title);
  setGuideText('thumb-artist', '本地文件');
  updateControlTrackInfo(song);
  document.getElementById('thumb-wrap')?.classList.add('visible');
  safeRenderQueuePanel('play-local-file');
  safeShelfRebuild('play-local-file', true);
  suppressShelfPreviewForPlaybackSwitch();
  if (firstVisualPlay) {
    firstPlayDone = true;
    tweenParticleAlpha(uniforms.uAlpha.value || 0, 1, 260);
  }
}

function configureLocalAudio(song: PlaylistSong, url: string): void {
  if (!audio) {
    audio = new Audio();
    audio.crossOrigin = 'anonymous';
  } else audio.pause();
  bindPlaybackProgressEvents(audio);
  applyVolumeToAudio();
  audio.src = url;
  updatePlaybackProgressUi();
  lyricSunEnergy = 0;
  lyricSunTarget = 0;
  lyricSunHold = 0;
  lyricSunAvg = 0;
  lyricSunPeak = 0.55;
  audio.onended = function(): void { finalizeListenSession(true); playing = false; setPlayIcon(false); };
  audio.onloadedmetadata = function(): void {
    if (currentLocalSong?.localUrl !== url) return;
    song.duration = audio && isFinite(audio.duration) ? audio.duration : 0;
    if (lyricSourceMode === 'custom') applyCustomLyricState(song, true);
  };
  audio.load();
}

function resetLocalLyrics(): void {
  setOriginalLyricsState(withLyricFallback([]), false, 'fallback');
  applyPreferredLyricsForCurrent(true);
  document.getElementById('trial-banner')?.classList.remove('show');
}

function createLocalCoverOptions(trackToken: number, deferHeavy: boolean): CoverLoadOptions {
  return { trackToken: trackToken, deferHeavy: deferHeavy, delay: deferHeavy ? 60 : 0, timeout: deferHeavy ? 300 : 180 };
}
