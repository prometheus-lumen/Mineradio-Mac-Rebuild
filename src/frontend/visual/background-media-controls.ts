function setCustomBackgroundColor(color: string, silent?: boolean, customFlag?: boolean): void {
  fx.backgroundColor = normalizeHexColor(color || '#000000', '#000000');
  fx.backgroundColorMode = customFlag === false ? 'cover' : 'custom';
  fx.backgroundColorCustom = customFlag !== false;
  updateCustomBackgroundControls();
  saveLyricLayout();
  if (!silent) showToast('背景颜色: ' + fx.backgroundColor.toUpperCase());
}

function setCustomBackgroundCoverMode(silent?: boolean): void {
  fx.backgroundColorMode = 'cover';
  fx.backgroundColorCustom = false;
  fx.backgroundColor = normalizeHexColor(fx.backgroundColor || fxDefaults.backgroundColor || '#000000', '#000000');
  updateCustomBackgroundControls();
  saveLyricLayout();
  if (!silent) showToast('\u80cc\u666f\u989c\u8272: \u5c01\u9762\u6e10\u53d8');
}

function resetCustomBackgroundColor(): void {
  setCustomBackgroundCoverMode(false);
}

function setCustomBackgroundOpacity(value: number, silent?: boolean): void {
  fx.backgroundOpacity = clampRange(Number(value), 0, 1);
  fx.backgroundColorMode = 'custom';
  fx.backgroundColorCustom = true;
  updateCustomBackgroundControls();
  saveLyricLayout();
  if (!silent) showToast('背景透明度: ' + Math.round(fx.backgroundOpacity * 100) + '%');
}

function setCustomBackgroundImage(src: string, silent?: boolean): void {
  var image = normalizeCustomBackgroundImage(src);
  var song = currentCoverSong();
  if (!song || !setCustomBackgroundMediaForSong(song, image ? { type: 'image', src: image } : null)) {
    if (!silent) showToast('请先播放或选中一首歌曲');
    return;
  }
  updateCustomBackgroundControls();
  reloadCurrentVisualCoverForBackground(image ? 'image' : 'clear');
  saveLyricLayout();
  if (!silent) showToast(image ? '已为当前歌曲应用背景粒子图' : '已清除当前歌曲背景图，恢复专辑粒子');
}

function clearCustomBackgroundImage(): void {
  setCustomBackgroundImage('');
}

function setCustomBackgroundMedia(media: unknown, silent?: boolean): void {
  var normalized = normalizeCustomBackgroundMedia(media);
  var song = currentCoverSong();
  if (!song || !setCustomBackgroundMediaForSong(song, normalized)) {
    if (!silent) showToast('请先播放或选中一首歌曲');
    return;
  }
  updateCustomBackgroundControls();
  reloadCurrentVisualCoverForBackground(normalized && normalized.type === 'image' ? 'image' : 'media-clear');
  saveLyricLayout();
  if (!silent) showToast(normalized ? (normalized.type === 'video' ? '已为当前歌曲应用背景视频，粒子使用专辑' : '已为当前歌曲应用背景粒子图') : '已清除当前歌曲背景媒体，恢复专辑粒子');
}

function setGlobalBackgroundMedia(media: unknown, silent?: boolean): void {
  globalBackgroundMedia = normalizeCustomBackgroundMedia(media);
  saveGlobalBackgroundMedia();
  updateCustomBackgroundControls();
  reloadCurrentVisualCoverForBackground(globalBackgroundMedia ? 'global-media' : 'global-clear');
  if (!silent) {
    showToast(globalBackgroundMedia
      ? (globalBackgroundMedia.type === 'video' ? '统一背景视频已生效' : '统一背景粒子图已生效')
      : '已清除统一背景媒体，恢复当前歌曲背景媒体');
  }
}

function clearGlobalBackgroundMedia(): void {
  setGlobalBackgroundMedia(null);
}
