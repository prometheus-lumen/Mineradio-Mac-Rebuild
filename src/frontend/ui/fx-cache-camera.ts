function formatMusicCacheBytes(bytes: number | undefined): string {
  var value = Math.max(0, Number(bytes) || 0);
  if (value < 1024) return value + ' B';
  if (value < 1024 * 1024) return (value / 1024).toFixed(1) + ' KB';
  if (value < 1024 * 1024 * 1024) return (value / (1024 * 1024)).toFixed(1) + ' MB';
  return (value / (1024 * 1024 * 1024)).toFixed(1) + ' GB';
}

function renderMusicCacheInfo(info: MusicCacheInfo | null): void {
  var directory = fxEl('music-cache-directory');
  var summary = fxEl('music-cache-summary');
  if (directory) {
    directory.textContent = info && info.directory ? info.directory : '无法读取缓存目录';
    if (directory.parentElement) directory.parentElement.title = info && info.directory ? ('打开 ' + info.directory) : '无法读取缓存目录';
  }
  if (summary) {
    summary.textContent = info && info.ok
      ? formatMusicCacheBytes(info.bytes) + ' · ' + (Number(info.fileCount) || 0) + ' 个文件'
      : '缓存信息读取失败';
  }
}

async function refreshMusicCacheInfo(): Promise<void> {
  var api = window.desktopWindow;
  if (!api || typeof api.getMusicCacheInfo !== 'function') {
    renderMusicCacheInfo(null);
    return;
  }
  try {
    renderMusicCacheInfo(await api.getMusicCacheInfo());
  } catch (error) {
    console.warn('music cache info failed:', error);
    renderMusicCacheInfo(null);
  }
}

async function openMusicCacheDirectory(): Promise<void> {
  var api = window.desktopWindow;
  if (!api || typeof api.openMusicCacheDirectory !== 'function') {
    showToast('仅桌面版支持打开缓存目录');
    return;
  }
  try {
    await api.openMusicCacheDirectory();
  } catch (error) {
    console.warn('open music cache directory failed:', error);
    showToast('无法打开音乐缓存目录');
  }
}

async function confirmAndClearMusicCache(): Promise<void> {
  var api = window.desktopWindow;
  if (!api || typeof api.clearMusicCache !== 'function') {
    showToast('仅桌面版支持清除音乐缓存');
    return;
  }
  var confirmed = window.confirm(
    '确定要清除音乐缓存吗？\n\n仅会删除本地节拍分析缓存，不会删除账号登录信息、歌单、设置或更新文件。清除后，相关歌曲的节拍缓存需要重新生成。'
  );
  if (!confirmed) return;
  var button = fxEl('music-cache-clear-btn');
  if (button) {
    button.disabled = true;
    button.textContent = '正在清除…';
  }
  try {
    var result = await api.clearMusicCache();
    beatMapCache = {};
    djBeatMapCache = {};
    localBeatMapCache = {};
    try { localStorage.removeItem(LOCAL_BEATMAP_STORE_KEY); } catch (storageError) {}
    beatDiskCacheStatus = { checked:false, enabled:false, mode:'unknown', reason:'' };
    showToast('已清除 ' + (Number(result.clearedFiles) || 0) + ' 个音乐缓存文件（' + formatMusicCacheBytes(result.clearedBytes) + '）');
    await refreshMusicCacheInfo();
  } catch (error) {
    console.warn('clear music cache failed:', error);
    showToast('音乐缓存清除失败，请稍后重试');
  } finally {
    if (button) {
      button.disabled = false;
      button.textContent = '清除缓存';
    }
  }
}

async function setCamMode(m: string): Promise<boolean> {
  if (m === 'head') m = 'gesture'; // v8: 头部追踪已下线, 兼容旧设置
  if (m !== 'gesture') m = 'off';
  if (m === 'off') {
    gestureStartToken++;
    fx.cam = 'off';
    fxNodes('#cam-seg button').forEach(function(b){ b.classList.toggle('active', b.dataset.cam === 'off'); });
    stopGestureControl();
    saveLyricLayout();
    return true;
  }
  var ok = await startGestureControl();
  fx.cam = ok ? 'gesture' : 'off';
  fxNodes('#cam-seg button').forEach(function(b){ b.classList.toggle('active', b.dataset.cam === fx.cam); });
  saveLyricLayout();
  return ok;
}
