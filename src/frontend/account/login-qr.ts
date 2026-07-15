async function refreshQr(): Promise<void> {
  stopQrPoll();
  qrKey = null;
  if (loginProvider === 'qq') {
    var info = await refreshQQLoginStatus();
    updateLoginProviderUi();
    if (!(info && info.loggedIn)) {
      var qqImg = document.getElementById('qr-img') as HTMLImageElement | null;
      if (qqImg) qqImg.src = '';
    }
    return;
  }
  if (loginProvider === 'kugou') {
    var kgInfo = await refreshKugouLoginStatus();
    updateLoginProviderUi();
    if (kgInfo && kgInfo.loggedIn) return;
    var kgImg = document.getElementById('qr-img') as HTMLImageElement | null;
    var kgStatus = document.getElementById('qr-status');
    if (kgImg) {
      kgImg.style.display = '';
      kgImg.src = '';
    }
    try {
      if (kgStatus) {
        kgStatus.style.display = '';
        kgStatus.textContent = '正在生成酷狗登录二维码...';
        kgStatus.className = 'preview';
      }
      var kgKey = await apiJson<QrKeyResponse>('/api/kugou/login/qr/key?t=' + Date.now());
      if (!kgKey || !kgKey.key || !kgKey.img) throw new Error((kgKey && (kgKey.message || kgKey.error)) || '酷狗二维码生成失败');
      qrKey = kgKey.key;
      if (kgImg) kgImg.src = kgKey.img;
      if (kgStatus) {
        kgStatus.textContent = '请使用酷狗音乐 App 扫码登录';
        kgStatus.className = '';
      }
      startQrPoll();
    } catch (error) {
      if (kgStatus) {
        kgStatus.textContent = '酷狗二维码生成失败: ' + (error instanceof Error ? error.message : String(error));
        kgStatus.className = 'fail';
      }
    }
    return;
  }
  var neInfo = await refreshLoginStatus(true);
  updateLoginProviderUi();
  if (neInfo && neInfo.loggedIn) return;
  try {
    var neKey = await apiJson<QrKeyResponse>('/api/login/qr/key?t=' + Date.now());
    if (!neKey.key) throw new Error('获取 key 失败');
    qrKey = neKey.key;
    var q = await apiJson<QrKeyResponse>('/api/login/qr/create?key=' + encodeURIComponent(qrKey || '') + '&t=' + Date.now());
    if (!q.img) throw new Error('生成二维码失败');
    var neImg = document.getElementById('qr-img') as HTMLImageElement | null;
    var neStatus = document.getElementById('qr-status');
    if (neImg) {
      neImg.style.display = '';
      neImg.src = q.img;
    }
    if (neStatus) {
      neStatus.style.display = '';
      neStatus.textContent = '请使用网易云音乐 App 扫码';
      neStatus.className = '';
    }
    startQrPoll();
  } catch (error) {
    var errStatus = document.getElementById('qr-status');
    if (errStatus) {
      errStatus.style.display = '';
      errStatus.textContent = '出错: ' + (error instanceof Error ? error.message : String(error));
      errStatus.className = 'fail';
    }
  }
}

function startQrPoll(): void { if (qrPollTimer) clearInterval(qrPollTimer); qrPollTimer = setInterval(checkQr, 2000); }

function stopQrPoll(): void { if (qrPollTimer) { clearInterval(qrPollTimer); qrPollTimer = null; } }

async function logoutLoginProvider(provider: MusicProvider): Promise<void> {
  provider = provider === 'qq' || provider === 'kugou' ? provider : 'netease';
  stopQrPoll();
  var statusEl = document.getElementById('qr-status');
  if (statusEl) {
    statusEl.style.display = '';
    statusEl.textContent = '正在退出' + platformMeta(provider).label + '...';
    statusEl.className = 'preview';
  }
  try {
    if (provider === 'kugou') {
      try { await apiJson('/api/kugou/logout'); } catch (e) {}
      try {
        if (window.desktopWindow && typeof window.desktopWindow.clearKugouMusicLogin === 'function') {
          await window.desktopWindow.clearKugouMusicLogin();
        }
      } catch (e) {}
      kugouLoginStatus = normalizeKugouLoginStatus(null);
      kugouPlaylists = [];
      userPlaylists = userPlaylists.filter(function(pl){ return pl.provider !== 'kugou'; });
    } else if (provider === 'qq') {
      try { await apiJson('/api/qq/logout'); } catch (e) {}
      try {
        if (window.desktopWindow && typeof window.desktopWindow.clearQQMusicLogin === 'function') {
          await window.desktopWindow.clearQQMusicLogin();
        }
      } catch (e) {}
      qqLoginStatus = normalizeQQLoginStatus(null);
      qqPlaylists = [];
      userPlaylists = userPlaylists.filter(function(pl){ return pl.provider !== 'qq'; });
    } else {
      await apiJson('/api/logout');
      try {
        if (window.desktopWindow && typeof window.desktopWindow.clearNeteaseMusicLogin === 'function') {
          await window.desktopWindow.clearNeteaseMusicLogin();
        }
      } catch (e) {}
      loginStatus = { loggedIn: false };
      myPodcastCollections = [];
      myPodcastItems = {};
      likedSongMap = {};
      userPlaylists = qqPlaylists.concat(kugouPlaylists);
      updateLikeButtons();
    }
    dualAccountMode = false;
    activeAccountProvider = firstLoggedProvider();
    renderUserBtn();
    safeRenderQueuePanel('login-modal-logout', { scrollCurrent: miniQueueOpen });
    safeShelfRebuild('login-modal-logout');
    showToast('已退出' + platformMeta(provider).label);
    await refreshQr();
  } catch (error) {
    if (statusEl) {
      statusEl.textContent = error instanceof Error ? error.message : '退出登录失败';
      statusEl.className = 'fail';
    }
  }
}

function toggleQQCookiePanel(): void {
  qqManualCookieOpen = !qqManualCookieOpen;
  updateLoginProviderUi();
}

function openProviderWebLogin(): Promise<void> {
  if (loginProvider === 'kugou') return openKugouWebLogin();
  if (loginProvider === 'qq') return openQQWebLogin();
  return openNeteaseWebLogin();
}

