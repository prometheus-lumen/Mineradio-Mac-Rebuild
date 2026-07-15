async function openNeteaseWebLogin(): Promise<void> {
  if (neteaseWebLoginBusy) return;
  var statusEl = document.getElementById('qr-status');
  var api = window.desktopWindow;
  if (!api || !api.isDesktop || typeof api.openNeteaseMusicLogin !== 'function') {
    if (statusEl) { statusEl.textContent = '当前环境不支持官方网页登录，正在尝试旧二维码…'; statusEl.className = 'fail'; }
    return refreshQr();
  }

  neteaseWebLoginBusy = true;
  updateLoginProviderUi();
  if (statusEl) { statusEl.textContent = '已打开网易云窗口，请在官方页面扫码登录…'; statusEl.className = 'preview'; }
  try {
    var result = await api.openNeteaseMusicLogin();
    if (!result || !result.ok || !result.cookie) {
      throw new Error((result && (result.message || result.error)) || '网易云登录未完成');
    }
    if (statusEl) { statusEl.textContent = '正在同步网易云会话…'; statusEl.className = 'preview'; }
    var info = await apiJson<LoginApiResponse>('/api/login/cookie', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cookie: result.cookie })
    });
    if (!info || !info.loggedIn) throw new Error((info && (info.message || info.error)) || '网易云会话不可用');
    loginStatus = info;
    activeAccountProvider = 'netease';
    renderUserBtn();
    refreshUserPlaylists(true);
    loadHomeDiscover(true);
    if (statusEl) { statusEl.textContent = '网易云会话已保存'; statusEl.className = 'scan'; }
    setTimeout(function(){
      closeLoginModal();
      showToast('网易云已登录: ' + (info.nickname || info.userId || ''));
    }, 420);
  } catch (error) {
    neteaseWebLoginBusy = false;
    updateLoginProviderUi();
    if (statusEl) { statusEl.textContent = error instanceof Error ? error.message : '网易云登录失败'; statusEl.className = 'fail'; }
  } finally {
    if (neteaseWebLoginBusy) {
      neteaseWebLoginBusy = false;
      updateLoginProviderUi();
    }
  }
}

async function openQQWebLogin(): Promise<void> {
  if (qqWebLoginBusy) return;
  var statusEl = document.getElementById('qr-status');
  var api = window.desktopWindow;
  if (!api || !api.isDesktop || typeof api.openQQMusicLogin !== 'function') {
    qqManualCookieOpen = true;
    updateLoginProviderUi();
    if (statusEl) { statusEl.textContent = '当前环境不支持自动网页登录，可先使用手动导入。'; statusEl.className = 'fail'; }
    return;
  }

  qqWebLoginBusy = true;
  updateLoginProviderUi();
  if (statusEl) { statusEl.textContent = '已打开 QQ 音乐窗口，请扫码并确认登录…'; statusEl.className = 'preview'; }
  try {
    var result = await api.openQQMusicLogin();
    if (!result || !result.ok || !result.cookie) {
      throw new Error((result && (result.message || result.error)) || 'QQ 登录未完成');
    }
    if (statusEl) { statusEl.textContent = '正在同步 QQ 音乐会话…'; statusEl.className = 'preview'; }
    var info = await apiJson<LoginApiResponse>('/api/qq/login/cookie', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cookie: result.cookie })
    });
    if (!info || !info.loggedIn) throw new Error((info && (info.message || info.error)) || 'QQ 会话不可用');
    qqLoginStatus = info;
    activeAccountProvider = 'qq';
    qqManualCookieOpen = false;
    renderUserBtn();
    refreshUserPlaylists(true);
    var qqPlaybackReady = !!info.playbackKeyReady && !result.partial;
    if (statusEl) { statusEl.textContent = qqPlaybackReady ? 'QQ 音乐会话已保存' : 'QQ 账号已同步，播放授权不完整，部分歌曲会自动换源'; statusEl.className = 'scan'; }
    setTimeout(function(){
      closeLoginModal();
      showToast((qqPlaybackReady ? 'QQ 音乐已登录: ' : 'QQ 账号已同步: ') + (info.nickname || info.userId || ''));
    }, 420);
  } catch (error) {
    qqWebLoginBusy = false;
    updateLoginProviderUi();
    if (statusEl) { statusEl.textContent = error instanceof Error ? error.message : 'QQ 登录失败'; statusEl.className = 'fail'; }
  } finally {
    if (qqWebLoginBusy) {
      qqWebLoginBusy = false;
      updateLoginProviderUi();
    }
  }
}

async function openKugouWebLogin(): Promise<void> {
  if (kugouWebLoginBusy) return;
  var statusEl = document.getElementById('qr-status');
  var api = window.desktopWindow;
  if (!api || !api.isDesktop || typeof api.openKugouMusicLogin !== 'function') {
    qqManualCookieOpen = true;
    updateLoginProviderUi();
    if (statusEl) { statusEl.textContent = '当前环境不支持自动网页登录，可先使用手动导入酷狗 cookie。'; statusEl.className = 'fail'; }
    return;
  }

  kugouWebLoginBusy = true;
  updateLoginProviderUi();
  if (statusEl) { statusEl.textContent = '已打开酷狗音乐窗口，请在官方页面完成登录…'; statusEl.className = 'preview'; }
  try {
    try { await apiJson('/api/kugou/logout'); } catch (_) {}
    try {
      if (typeof api.clearKugouMusicLogin === 'function') await api.clearKugouMusicLogin();
    } catch (_) {}
    kugouLoginStatus = normalizeKugouLoginStatus(null);
    kugouPlaylists = [];
    renderUserBtn();
    var result = await api.openKugouMusicLogin();
    if (!result || !result.ok) {
      throw new Error((result && (result.message || result.error)) || '酷狗登录未完成');
    }
    if (statusEl) { statusEl.textContent = '正在同步酷狗音乐会话…'; statusEl.className = 'preview'; }
    var info = result.loggedIn
      ? result
      : await apiJson<LoginApiResponse>('/api/kugou/login/cookie', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ cookie: result.cookie || '' })
        });
    if (info && info.loggedIn && !info.saved) {
      try {
        var freshInfo = await apiJson<LoginApiResponse>('/api/kugou/login/status?t=' + Date.now());
        if (freshInfo && freshInfo.loggedIn) info = freshInfo;
      } catch (_) {}
    }
    if (!info || !info.loggedIn) throw new Error((info && (info.message || info.error)) || '酷狗会话不可用');
    kugouLoginStatus = normalizeKugouLoginStatus(info);
    activeAccountProvider = 'kugou';
    qqManualCookieOpen = false;
    renderUserBtn();
    refreshUserPlaylists(true);
    if (statusEl) { statusEl.textContent = '酷狗音乐会话已保存'; statusEl.className = 'scan'; }
    setTimeout(function(){
      closeLoginModal();
      showToast('酷狗音乐已同步: ' + (info.nickname || info.userId || ''));
    }, 420);
  } catch (error) {
    kugouWebLoginBusy = false;
    updateLoginProviderUi();
    if (statusEl) { statusEl.textContent = error instanceof Error ? error.message : '酷狗登录失败'; statusEl.className = 'fail'; }
  } finally {
    if (kugouWebLoginBusy) {
      kugouWebLoginBusy = false;
      updateLoginProviderUi();
    }
  }
}

