function updateControlTrackInfo(song?: PlaylistSong): void {
  song = song || {};
  var title = document.getElementById('control-title');
  var artist = document.getElementById('control-artist');
  var sourceBadge = document.getElementById('control-source');
  if (title) title.textContent = song.name || '';
  if (artist) artist.textContent = song.artist || '';
  if (sourceBadge) {
    var displaySource = songDisplaySource(song);
    sourceBadge.className = 'control-source-badge control-pill ' + displaySource.className;
    sourceBadge.textContent = displaySource.label;
    sourceBadge.title = '播放源：' + displaySource.label;
    sourceBadge.setAttribute('aria-label', '播放源：' + displaySource.label);
    sourceBadge.hidden = !song.name;
  }
}

function showAIDepthChip(text?: string): void {
  var label = document.getElementById('ai-depth-text');
  var chip = document.getElementById('ai-depth-chip');
  if (label) label.textContent = text || 'AI 深度估计…';
  if (chip) chip.classList.add('show');
}

function hideAIDepthChip(): void {
  document.getElementById('ai-depth-chip')?.classList.remove('show');
}

function __mineradioInitVisualCoverDepth34(): void {
  // 颜色渐变 tween (切歌时旧封面→新封面)
  colorMixTween = null;

  // 粒子整体透明度 tween (启动 fade-in)
  alphaTween = null;

  floatAlphaTween = null;

  IDLE_PARTICLE_ALPHA = 0;

  // 加载形态 tween (uLoading 0..1)
  loadingTween = null;

  loadingShownAt = 0;

  loadingHideTimer = null;

  coverDepthTween = null;
}
