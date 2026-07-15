function openHomeInsight(): void {
  var summary = homeListenSummary();
  if (summary.topArtist && summary.topArtist.name) {
    runHomeSearch(summary.topArtist.name);
    return;
  }
  if (summary.topSong && summary.topSong.name) {
    runHomeSearch(summary.topSong.name);
    return;
  }
  showToast('播放几首歌后会生成听歌画像');
}

async function playWeatherSong(index = 0): Promise<void> {
  var radio = homeWeatherRadioState.radio;
  var songs = radio && radio.songs || [];
  if (!songs[index]) {
    startWeatherRadio();
    return;
  }
  activeRadioContext = weatherRadioContext();
  playQueue = songs.map(function(song){
    var cloned = cloneSong(song);
    cloned.radioContext = activeRadioContext;
    return cloned;
  });
  currentIdx = index;
  safeRenderQueuePanel('weather-radio-song');
  safeShelfRebuild('weather-radio-song', true);
  forcePlaybackControlsInteractive();
  await playQueueAt(index, { context: activeRadioContext });
}

function isHomeCardInternalDrag(e: DragEvent): boolean {
  return !!homeCardDragActive || !!(e && e.dataTransfer && Array.prototype.indexOf.call(e.dataTransfer.types || [], 'application/x-mineradio-home-card') >= 0);
}

function applyHomeAccentColor(): void {
  var color = normalizeHexColor(fx.homeAccentColor || '#00f5d4');
  var rgb = hexToRgb(color);
  document.documentElement.style.setProperty('--home-accent', color);
  document.documentElement.style.setProperty('--home-accent-rgb', rgb.r + ',' + rgb.g + ',' + rgb.b);
}

function updateHomeAccentControls(): void {
  applyHomeAccentColor();
  var color = normalizeHexColor(fx.homeAccentColor || '#00f5d4');
  var picker = document.querySelector<HTMLInputElement>('#home-accent-picker');
  var value = document.getElementById('home-accent-value');
  if (picker) picker.value = color;
  if (value) value.textContent = color.toUpperCase();
}

function setHomeAccentColor(color: string, silent = false): void {
  fx.homeAccentColor = normalizeHexColor(color || '#00f5d4');
  updateHomeAccentControls();
  saveLyricLayout();
  if (!silent) showToast('Home 填充: ' + fx.homeAccentColor.toUpperCase());
}

function resetHomeAccentColor(): void {
  setHomeAccentColor(fxDefaults.homeAccentColor || '#00f5d4');
}

function setHomeIconColor(color: string, silent = false): void {
  fx.homeIconColor = normalizeHexColor(color || fxDefaults.homeIconColor || '#f4d28a', '#f4d28a');
  updateIconAccentControls();
  saveLyricLayout();
  if (!silent) showToast('主页图标: ' + fx.homeIconColor.toUpperCase());
}

function resetHomeIconColor(): void {
  setHomeIconColor(fxDefaults.homeIconColor || '#f4d28a');
}

function ensureHomeWaveTrackBars(): void {
  var el = document.getElementById('home-wave-track');
  if (!el) return;
  var count = 24;
  if (homeWaveTrackState.bars === count && el.children.length === count) return;
  homeWaveTrackState.bars = count;
  homeWaveTrackState.smooth = new Array(count).fill(0);
  el.innerHTML = new Array(count + 1).join('<span></span>');
}
