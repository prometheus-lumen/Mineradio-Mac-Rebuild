function normalizePlaybackDurationSeconds(value: unknown): number {
  var duration = Number(value);
  if (!isFinite(duration) || duration <= 0) return 0;
  return duration > 1000 ? duration / 1000 : duration;
}

function playbackDurationFromSong(song: PlaylistSong | null | undefined): number {
  return song ? normalizePlaybackDurationSeconds(song.duration || song.durationMs || song.dt || 0) : 0;
}

function getPlaybackDurationSeconds(): number {
  if (audio && isFinite(audio.duration) && audio.duration > 0) return audio.duration;
  return playbackDurationFromSong(currentCoverSong());
}

function getPlaybackCurrentSeconds(): number {
  return audio && isFinite(audio.currentTime) && audio.currentTime > 0 ? audio.currentTime : 0;
}

function updatePlaybackProgressUi(): void {
  var duration = getPlaybackDurationSeconds();
  var current = Math.min(getPlaybackCurrentSeconds(), duration > 0 ? duration : Infinity);
  setProgressVisual(duration > 0 ? current / duration * 100 : 0);
  var display = document.getElementById('time-display');
  if (display) display.textContent = formatProgramTime(current) + ' / ' + (duration > 0 ? formatProgramTime(duration) : '0:00');
}

function bindPlaybackProgressEvents(audioElement: HTMLAudioElement): void {
  if (audioElement._mineradioProgressBound) return;
  audioElement._mineradioProgressBound = true;
  ['loadedmetadata', 'durationchange', 'timeupdate', 'seeked', 'play', 'pause', 'emptied'].forEach(function(name): void {
    audioElement.addEventListener(name, updatePlaybackProgressUi);
  });
  ['play', 'playing', 'pause', 'ended', 'emptied', 'abort', 'error'].forEach(function(name): void {
    audioElement.addEventListener(name, function(): void { syncPlaybackStateFromAudioEvent(name); });
  });
}

function setPerformanceQualityMode(mode: unknown, silent = false): void {
  var quality = normalizePerformanceQuality(mode);
  fx.performanceQuality = quality;
  updatePerformanceControls();
  applyRendererPowerMode();
  saveLyricLayout();
  if (!silent) {
    var label = quality === 'eco' ? '低' : quality === 'balanced' ? '中' : quality === 'ultra' ? '超高' : '高';
    showToast('画质档位: ' + label);
  }
}
