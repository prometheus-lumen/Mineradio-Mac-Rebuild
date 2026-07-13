'use strict';

// Mineradio classic module: account/login.
function skipLoginAndFocusSearch() {
  closeLoginModal();
  setTimeout(function(){ runHomeSearch(''); }, 180);
}

async function searchAlternatePlatformSong(song) {
  var target = alternatePlaybackProvider(song);
  var artist = artistNameParts(song)[0] || '';
  var query = [song.name || song.title || '', song.artist || artist].filter(Boolean).join(' ').trim();
  if (!query) return null;
  var url = target === 'qq'
    ? '/api/qq/search?keywords=' + encodeURIComponent(query) + '&limit=8'
    : '/api/search?keywords=' + encodeURIComponent(query) + '&limit=12';
  var data = await apiJson(url);
  var list = data && (data.songs || data.result || []);
  for (var i = 0; i < list.length; i++) {
    if (isSameTitleArtist(song, list[i])) return cloneSong(list[i]);
  }
  return null;
}

function onUserBtnClick() {
  if (hasAnyPlatformLogin()) showUserModal();
  else showLoginModal();
}

async function refreshLoginStatus(force) {
  try {
    var info = await apiJson('/api/login/status?t=' + Date.now());
    loginStatusChecked = true;
    loginStatusCheckFailed = false;
    loginStatus = info || { loggedIn: false };
    if (loginStatus.loggedIn && !hasPlatformLogin(activeAccountProvider)) activeAccountProvider = 'netease';
    renderUserBtn();
    if (info && info.loggedIn) {
      homeDiscoverState.loaded = false;
      homeDiscoverState.loggedIn = true;
      refreshUserPlaylists(true);
      loadHomeDiscover(true);
      syncLikeStatusForSongs(playQueue.concat(playlist || []));
    } else {
      userPlaylists = qqPlaylists.slice();
      myPodcastCollections = [];
      myPodcastItems = {};
      likedSongMap = {};
      updateLikeButtons();
    }
    return info;
  } catch (e) {
    console.warn(e);
    loginStatusChecked = true;
    loginStatusCheckFailed = true;
    renderUserBtn();
    return null;
  }
}

function normalizeQQLoginStatus(info) {
  var fallback = { provider: 'qq', loggedIn: false, preview: false, nickname: 'QQ 音乐', userId: '', avatar: '', vipType: 0, vipLevel: 'none', isVip: false, isSvip: false, vipLabel: '', stale: false, playbackKeyReady: false };
  if (!info || !info.loggedIn) return Object.assign({}, fallback, info || {}, {
    provider: 'qq',
    loggedIn: false,
    nickname: info && info.nickname || fallback.nickname,
    userId: info && (info.userId || info.uin) || '',
    avatar: info && info.avatar || '',
    vipType: Number(info && (info.vipType || info.vip_type) || 0) || 0,
    vipLevel: info && (info.vipLevel || info.vip_level) || 'none',
    isVip: !!(info && (info.isVip || info.is_vip)),
    isSvip: !!(info && (info.isSvip || info.is_svip)),
    vipLabel: info && info.vipLabel || '',
    stale: !!(info && info.stale)
  });
  var userId = info.userId || info.uin || '';
  return Object.assign({}, fallback, info, {
    provider: 'qq',
    loggedIn: true,
    nickname: sanitizeQQDisplayName(info.nickname, userId) || fallback.nickname,
    userId: userId,
    avatar: info.avatar || '',
    vipType: Number(info.vipType || info.vip_type || 0) || 0,
    vipLevel: info.vipLevel || info.vip_level || 'none',
    isVip: !!(info.isVip || info.is_vip),
    isSvip: !!(info.isSvip || info.is_svip),
    vipLabel: info.vipLabel || '',
    playbackKeyReady: !!info.playbackKeyReady,
    stale: !!info.stale || !!(info.profileUnavailable && !(info.nickname && info.avatar))
  });
}

async function refreshQQLoginStatus() {
  try {
    var info = await apiJson('/api/qq/login/status?t=' + Date.now());
    var prevLogged = !!qqLoginStatus.loggedIn;
    qqLoginStatus = normalizeQQLoginStatus(info);
    if (!qqLoginStatus.loggedIn) {
      if (prevLogged || qqLoginWasLoggedIn) showToast(qqLoginStatus.stale ? 'QQ 音乐登录已失效' : 'QQ 音乐已掉登录');
      qqPlaylists = [];
      userPlaylists = userPlaylists.filter(function(pl){ return pl.provider !== 'qq'; });
      homeDiscoverState.loaded = false;
    } else if (!userPlaylists.some(function(pl){ return pl && pl.provider === 'qq'; })) {
      homeDiscoverState.loaded = false;
      homeDiscoverState.loggedIn = true;
      loadHomeDiscover(true);
      refreshUserPlaylists(true);
    } else if (qqLoginStatus.stale) {
      showToast('QQ 音乐登录状态可能已失效');
    }
    qqLoginWasLoggedIn = !!qqLoginStatus.loggedIn;
    if (!hasPlatformLogin(activeAccountProvider)) activeAccountProvider = firstLoggedProvider();
    renderUserBtn();
    return qqLoginStatus;
  } catch (e) {
    console.warn('QQ login status failed:', e);
    qqLoginStatus = normalizeQQLoginStatus(null);
    renderUserBtn();
    return qqLoginStatus;
  }
}

function startQQLoginStatusAutoRefresh() {
  if (qqLoginAutoRefreshTimer) clearInterval(qqLoginAutoRefreshTimer);
  qqLoginAutoRefreshTimer = setInterval(function(){
    refreshQQLoginStatus().catch(function(e){ console.warn('QQ login auto refresh failed:', e); });
  }, 45000);
}

function renderUserBtn() {
  var btn = document.getElementById('user-btn');
  if (!btn) return;
  btn.classList.remove('multi-account');
  if (dualAccountMode && hasAnyPlatformLogin()) {
    activeAccountProvider = firstLoggedProvider();
    btn.classList.add('logged-in', 'multi-account');
    btn.classList.remove('logged-out');
    btn.title = '账号信息 · 双平台登录状态';
    btn.innerHTML = renderTopAccountPill('netease') + renderTopAccountPill('qq');
  } else if (hasAnyPlatformLogin()) {
    activeAccountProvider = firstLoggedProvider();
    var st = platformStatus(activeAccountProvider);
    var meta = platformMeta(activeAccountProvider);
    btn.classList.add('logged-in');
    btn.classList.remove('logged-out');
    btn.title = dualAccountMode ? '账号信息 · 已启用双平台展示' : ((st.nickname || meta.label) + ' · 账号信息');
    btn.innerHTML = '<img id="user-avatar" src="' + providerAvatarSrc(activeAccountProvider, st) + '">' +
                    '<span>' + escHtml(st.nickname || meta.label) + '</span>' +
                    providerVipBadge(activeAccountProvider, st, 'user-vip-tag');
  } else {
    btn.classList.remove('logged-in');
    btn.classList.add('logged-out');
    btn.title = '登录账号';
    btn.innerHTML = '<span class="login-word">登录</span>';
  }
  updatePlaybackQualityUi();
}

async function showLoginModal(opts) {
  opts = opts || {};
  if (opts.provider) loginProvider = opts.provider === 'qq' ? 'qq' : 'netease';
  var modal = document.getElementById('login-modal');
  openGsapModal(modal);
  updateLoginProviderUi();
  await refreshQr();
}

function closeLoginModal() {
  stopQrPoll();
  closeGsapModal(document.getElementById('login-modal'));
}

function setLoginProvider(provider, silent) {
  loginProvider = provider === 'qq' ? 'qq' : 'netease';
  updateLoginProviderUi();
  if (!silent && document.getElementById('login-modal').classList.contains('show')) refreshQr();
}

function updateLoginProviderUi() {
  var meta = platformMeta(loginProvider);
  var isQQ = loginProvider === 'qq';
  var title = document.getElementById('login-modal-title');
  var desc = document.getElementById('login-modal-desc');
  var shell = document.getElementById('qr-shell');
  var st = document.getElementById('qr-status');
  var refreshBtn = document.getElementById('refresh-qr-btn');
  var qqPanel = document.getElementById('qq-cookie-panel');
  var qqCookieToggle = document.getElementById('qq-cookie-toggle-btn');
  var qqCard = document.getElementById('qq-web-login-card');
  var neteaseBtn = document.getElementById('login-provider-netease');
  var qqBtn = document.getElementById('login-provider-qq');
  var canOpenNeteaseWeb = !!(window.desktopWindow && typeof window.desktopWindow.openNeteaseMusicLogin === 'function');
  if (neteaseBtn) neteaseBtn.classList.toggle('active', loginProvider === 'netease');
  if (qqBtn) qqBtn.classList.toggle('active', isQQ);
  if (title) title.textContent = '扫码登录' + meta.label;
  if (desc) desc.innerHTML = isQQ
    ? '打开 <b>QQ 音乐官方网页登录窗口</b> 扫码，成功后会自动同步账号会话。'
    : (canOpenNeteaseWeb
      ? '打开 <b>网易云音乐官方网页登录窗口</b> 扫码，避开接口二维码风控；成功后会自动同步账号会话。'
      : '使用 <b>网易云音乐 App</b> 扫码，可同步歌单、红心与播客。');
  if (shell) {
    shell.classList.toggle('web-login-preview', isQQ || canOpenNeteaseWeb);
    shell.classList.toggle('qq-preview', isQQ);
    shell.classList.toggle('netease-preview', !isQQ && canOpenNeteaseWeb);
  }
  if (qqPanel) qqPanel.classList.toggle('show', isQQ && qqManualCookieOpen);
  if (qqCookieToggle) {
    qqCookieToggle.classList.toggle('show', isQQ);
    qqCookieToggle.textContent = qqManualCookieOpen ? '收起导入' : '手动导入';
  }
  if (qqCard) {
    qqCard.disabled = isQQ ? !!qqWebLoginBusy : !!neteaseWebLoginBusy;
    var cardMark = qqCard.querySelector('b');
    var cardLabel = qqCard.querySelector('span');
    if (cardMark) cardMark.textContent = isQQ ? 'QQ' : 'NE';
    if (cardLabel) cardLabel.textContent = isQQ
      ? (qqWebLoginBusy ? '等待扫码确认' : '打开官方扫码窗口')
      : (neteaseWebLoginBusy ? '等待扫码确认' : '打开官方登录窗口');
  }
  if (st) {
    st.className = isQQ ? 'preview' : '';
    st.textContent = isQQ
      ? (qqLoginStatus.loggedIn ? ('已保存 QQ 音乐会话 · ' + (qqLoginStatus.nickname || '')) : '点击“扫码登录”打开 QQ 音乐官方窗口')
      : (canOpenNeteaseWeb ? '点击“网页登录”打开网易云官方窗口' : '正在生成二维码…');
  }
  if (refreshBtn) {
    refreshBtn.disabled = isQQ ? !!qqWebLoginBusy : !!neteaseWebLoginBusy;
    refreshBtn.textContent = isQQ ? (qqWebLoginBusy ? '等待扫码…' : '扫码登录') : (canOpenNeteaseWeb ? (neteaseWebLoginBusy ? '等待扫码…' : '网页登录') : '刷新二维码');
    refreshBtn.onclick = isQQ ? openQQWebLogin : (canOpenNeteaseWeb ? openNeteaseWebLogin : refreshQr);
  }
}

async function refreshQr() {
  stopQrPoll();
  updateLoginProviderUi();
  if (loginProvider === 'qq') {
    qrKey = null;
    var qqStatus = document.getElementById('qr-status');
    var qqImg = document.getElementById('qr-img');
    if (qqImg) qqImg.src = '';
    var info = await refreshQQLoginStatus();
    if (qqStatus) {
      qqStatus.textContent = info && info.loggedIn ? ('已保存 QQ 音乐会话 · ' + (info.nickname || '')) : '点击“扫码登录”打开 QQ 音乐官方窗口';
      qqStatus.className = 'preview';
    }
    return;
  }
  if (window.desktopWindow && typeof window.desktopWindow.openNeteaseMusicLogin === 'function') {
    qrKey = null;
    var neImg = document.getElementById('qr-img');
    var neStatus = document.getElementById('qr-status');
    if (neImg) neImg.src = '';
    if (neStatus) {
      neStatus.textContent = loginStatus.loggedIn ? ('已保存网易云会话 · ' + (loginStatus.nickname || '')) : '点击“网页登录”打开网易云官方窗口';
      neStatus.className = 'preview';
    }
    return;
  }
  try {
    var k = await apiJson('/api/login/qr/key');
    if (!k.key) throw new Error('获取 key 失败');
    qrKey = k.key;
    var q = await apiJson('/api/login/qr/create?key=' + encodeURIComponent(qrKey));
    if (!q.img) throw new Error('生成二维码失败');
    document.getElementById('qr-img').src = q.img;
    document.getElementById('qr-status').textContent = '请使用网易云音乐 App 扫码';
    startQrPoll();
  } catch (e) {
    document.getElementById('qr-status').textContent = '出错: ' + e.message;
    document.getElementById('qr-status').className = 'fail';
  }
}

function startQrPoll() { if (qrPollTimer) clearInterval(qrPollTimer); qrPollTimer = setInterval(checkQr, 2000); }

function stopQrPoll() { if (qrPollTimer) { clearInterval(qrPollTimer); qrPollTimer = null; } }

function toggleQQCookiePanel() {
  qqManualCookieOpen = !qqManualCookieOpen;
  updateLoginProviderUi();
}

function openProviderWebLogin() {
  if (loginProvider === 'qq') return openQQWebLogin();
  return openNeteaseWebLogin();
}

async function openNeteaseWebLogin() {
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
    var info = await apiJson('/api/login/cookie', {
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
  } catch (e) {
    neteaseWebLoginBusy = false;
    updateLoginProviderUi();
    if (statusEl) { statusEl.textContent = e && e.message ? e.message : '网易云登录失败'; statusEl.className = 'fail'; }
  } finally {
    if (neteaseWebLoginBusy) {
      neteaseWebLoginBusy = false;
      updateLoginProviderUi();
    }
  }
}

async function openQQWebLogin() {
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
    var info = await apiJson('/api/qq/login/cookie', {
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
    var qqPlaybackReady = !!info.playbackKeyReady;
    if (!qqPlaybackReady) throw new Error('未获得 QQ 音乐播放授权，原登录未被覆盖');
    if (statusEl) { statusEl.textContent = 'QQ 音乐会话已保存'; statusEl.className = 'scan'; }
    setTimeout(function(){
      closeLoginModal();
      showToast('QQ 音乐已登录: ' + (info.nickname || info.userId || ''));
    }, 420);
  } catch (e) {
    qqWebLoginBusy = false;
    updateLoginProviderUi();
    if (statusEl) { statusEl.textContent = e && e.message ? e.message : 'QQ 登录失败'; statusEl.className = 'fail'; }
  } finally {
    if (qqWebLoginBusy) {
      qqWebLoginBusy = false;
      updateLoginProviderUi();
    }
  }
}

async function submitQQCookieLogin() {
  if (qqCookieBusy) return;
  var input = document.getElementById('qq-cookie-input');
  var statusEl = document.getElementById('qr-status');
  var saveBtn = document.getElementById('qq-cookie-save-btn');
  var cookie = input ? input.value.trim() : '';
  if (!cookie) {
    if (statusEl) { statusEl.textContent = '先粘贴 QQ 音乐 cookie'; statusEl.className = 'fail'; }
    return;
  }
  qqCookieBusy = true;
  if (saveBtn) saveBtn.classList.add('busy');
  if (statusEl) { statusEl.textContent = '正在保存 QQ 会话…'; statusEl.className = 'preview'; }
  try {
    var info = await apiJson('/api/qq/login/cookie', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cookie: cookie })
    });
    if (!info || !info.loggedIn) throw new Error((info && (info.message || info.error)) || 'QQ 会话不可用');
    qqLoginStatus = info;
    activeAccountProvider = 'qq';
    if (input) input.value = '';
    renderUserBtn();
    refreshUserPlaylists(true);
    var manualQQPlaybackReady = !!info.playbackKeyReady;
    if (!manualQQPlaybackReady) throw new Error('未检测到 QQ 音乐播放授权，普通 QQ Cookie 不会覆盖现有会话');
    if (statusEl) { statusEl.textContent = 'QQ 音乐会话已保存'; statusEl.className = 'scan'; }
    setTimeout(function(){
      closeLoginModal();
      showToast('QQ 音乐已登录: ' + (info.nickname || info.userId || ''));
    }, 420);
  } catch (e) {
    if (statusEl) { statusEl.textContent = e && e.message ? e.message : 'QQ 会话保存失败'; statusEl.className = 'fail'; }
  } finally {
    qqCookieBusy = false;
    if (saveBtn) saveBtn.classList.remove('busy');
  }
}

async function checkQr() {
  if (!qrKey) return;
  try {
    var r = await apiJson('/api/login/qr/check?key=' + encodeURIComponent(qrKey));
    var $st = document.getElementById('qr-status');
    if (r.code === 800) { $st.textContent = '二维码已过期, 请刷新'; $st.className = 'fail'; stopQrPoll(); }
    else if (r.code === 801) { $st.textContent = '请在 App 中扫码'; $st.className = ''; }
    else if (r.code === 802) { $st.textContent = '已扫码, 请在手机确认…'; $st.className = 'scan'; }
    else if (r.code === 803 && (r.loggedIn || r.hasCookie)) {
      $st.textContent = r.pendingProfile ? '登录成功，正在同步账号资料…' : '登录成功！'; $st.className = 'scan';
      stopQrPoll();
      loginStatus = r.loggedIn ? r : Object.assign({}, r, { loggedIn: true, pendingProfile: true, nickname: r.nickname || '网易云用户' });
      activeAccountProvider = 'netease';
      renderUserBtn();
      setTimeout(async function(){
        var fresh = await refreshLoginStatus(true);
        if (!fresh || !fresh.loggedIn) {
          loginStatus = Object.assign({}, loginStatus, { loggedIn: true, pendingProfile: true });
          renderUserBtn();
          fresh = loginStatus;
        }
        closeLoginModal();
        showToast('欢迎 ' + (fresh && fresh.nickname ? fresh.nickname : ''));
      }, r.pendingProfile ? 1200 : 500);
    } else if (r.code === 803) {
      $st.textContent = '扫码已确认，但没有拿到登录凭证，请刷新二维码重试'; $st.className = 'fail';
      stopQrPoll();
    }
  } catch (e) { console.warn(e); }
}

function setActiveAccountProvider(provider) {
  provider = provider === 'qq' ? 'qq' : 'netease';
  if (!hasPlatformLogin(provider)) {
    openProviderLogin(provider);
    return;
  }
  activeAccountProvider = provider;
  dualAccountMode = false;
  renderUserBtn();
  updateUserModalUi();
}

function enableDualAccountView() {
  if (!hasPlatformLogin('netease') && !hasPlatformLogin('qq')) {
    openProviderLogin('netease');
    return;
  }
  if (!hasPlatformLogin('netease')) {
    openProviderLogin('netease');
    return;
  }
  if (!hasPlatformLogin('qq')) {
    openProviderLogin('qq');
    return;
  }
  dualAccountMode = true;
  renderUserBtn();
  updateUserModalUi();
  showToast('已启用全部账号展示');
}

function requestDualLoginMode() {
  enableDualAccountView();
}

function openProviderLogin(provider) {
  provider = provider === 'qq' ? 'qq' : 'netease';
  closeUserModal();
  loginProvider = provider;
  showLoginModal({ provider: provider });
}

async function logoutActiveAccount() {
  if (activeAccountProvider === 'qq') {
    try { await apiJson('/api/qq/logout'); } catch (e) {}
    try {
      if (window.desktopWindow && typeof window.desktopWindow.clearQQMusicLogin === 'function') {
        await window.desktopWindow.clearQQMusicLogin();
      }
    } catch (e) {}
    qqLoginStatus = { provider: 'qq', loggedIn: false, preview: false, nickname: 'QQ 音乐', userId: '', avatar: '', vipType: 0 };
    qqPlaylists = [];
    userPlaylists = userPlaylists.filter(function(pl){ return pl.provider !== 'qq'; });
    dualAccountMode = false;
    activeAccountProvider = firstLoggedProvider();
    renderUserBtn();
    if (hasAnyPlatformLogin()) updateUserModalUi();
    else closeUserModal();
    showToast('已退出 QQ 音乐');
    return;
  }
  doLogout();
}

async function doLogout() {
  await apiJson('/api/logout');
  try {
    if (window.desktopWindow && typeof window.desktopWindow.clearNeteaseMusicLogin === 'function') {
      await window.desktopWindow.clearNeteaseMusicLogin();
    }
  } catch (e) {}
  loginStatus = { loggedIn: false };
  if (!hasPlatformLogin('netease') || !hasPlatformLogin('qq')) dualAccountMode = false;
  activeAccountProvider = firstLoggedProvider();
  userPlaylists = qqPlaylists.slice();
  myPodcastCollections = [];
  myPodcastItems = {};
  likedSongMap = {};
  closeCollectModal();
  updateLikeButtons();
  safeRenderQueuePanel('logout', { scrollCurrent: miniQueueOpen });
  renderUserBtn();
  safeShelfRebuild('logout');
  closeUserModal();
  showToast('已退出登录');
}

function onUserBtnClick() {
  if (hasAnyPlatformLogin()) showUserModal();
  else showLoginModal();
}

async function refreshLoginStatus(force) {
  try {
    var info = await apiJson('/api/login/status?t=' + Date.now());
    loginStatusChecked = true;
    loginStatusCheckFailed = false;
    loginStatus = info || { loggedIn: false };
    if (loginStatus.loggedIn && !hasPlatformLogin(activeAccountProvider)) activeAccountProvider = 'netease';
    renderUserBtn();
    if (info && info.loggedIn) {
      homeDiscoverState.loaded = false;
      homeDiscoverState.loggedIn = true;
      refreshUserPlaylists(true);
      loadHomeDiscover(true);
      syncLikeStatusForSongs(playQueue.concat(playlist || []));
    } else {
      userPlaylists = qqPlaylists.concat(kugouPlaylists);
      myPodcastCollections = [];
      myPodcastItems = {};
      likedSongMap = {};
      updateLikeButtons();
    }
    return info;
  } catch (e) {
    console.warn(e);
    loginStatusChecked = true;
    loginStatusCheckFailed = true;
    renderUserBtn();
    return null;
  }
}

function normalizeQQLoginStatus(info) {
  var fallback = { provider: 'qq', loggedIn: false, preview: false, nickname: 'QQ 音乐', userId: '', avatar: '', vipType: 0, vipLevel: 'none', isVip: false, isSvip: false, vipLabel: '', stale: false, playbackKeyReady: false };
  if (!info || !info.loggedIn) return Object.assign({}, fallback, info || {}, {
    provider: 'qq',
    loggedIn: false,
    nickname: info && info.nickname || fallback.nickname,
    userId: info && (info.userId || info.uin) || '',
    avatar: info && info.avatar || '',
    vipType: Number(info && (info.vipType || info.vip_type) || 0) || 0,
    vipLevel: info && (info.vipLevel || info.vip_level) || 'none',
    isVip: !!(info && (info.isVip || info.is_vip)),
    isSvip: !!(info && (info.isSvip || info.is_svip)),
    vipLabel: info && info.vipLabel || '',
    stale: !!(info && info.stale)
  });
  return Object.assign({}, fallback, info, {
    provider: 'qq',
    loggedIn: true,
    nickname: info.nickname || fallback.nickname,
    userId: info.userId || info.uin || '',
    avatar: info.avatar || '',
    vipType: Number(info.vipType || info.vip_type || 0) || 0,
    vipLevel: info.vipLevel || info.vip_level || 'none',
    isVip: !!(info.isVip || info.is_vip),
    isSvip: !!(info.isSvip || info.is_svip),
    vipLabel: info.vipLabel || '',
    playbackKeyReady: !!info.playbackKeyReady,
    stale: !!info.stale || !!(info.profileUnavailable && !(info.nickname && info.avatar))
  });
}

async function refreshQQLoginStatus() {
  try {
    var info = await apiJson('/api/qq/login/status?t=' + Date.now());
    var prevLogged = !!qqLoginStatus.loggedIn;
    qqLoginStatus = normalizeQQLoginStatus(info);
    if (!qqLoginStatus.loggedIn) {
      if (prevLogged || qqLoginWasLoggedIn) showToast(qqLoginStatus.stale ? 'QQ 音乐登录已失效' : 'QQ 音乐已掉登录');
      qqPlaylists = [];
      userPlaylists = userPlaylists.filter(function(pl){ return pl.provider !== 'qq'; });
      homeDiscoverState.loaded = false;
    } else if (!userPlaylists.some(function(pl){ return pl && pl.provider === 'qq'; })) {
      homeDiscoverState.loaded = false;
      homeDiscoverState.loggedIn = true;
      loadHomeDiscover(true);
      refreshUserPlaylists(true);
    } else if (qqLoginStatus.stale) {
      showToast('QQ 音乐登录状态可能已失效');
    }
    qqLoginWasLoggedIn = !!qqLoginStatus.loggedIn;
    if (!hasPlatformLogin(activeAccountProvider)) activeAccountProvider = firstLoggedProvider();
    renderUserBtn();
    return qqLoginStatus;
  } catch (e) {
    console.warn('QQ login status failed:', e);
    qqLoginStatus = normalizeQQLoginStatus(null);
    renderUserBtn();
    return qqLoginStatus;
  }
}

function startQQLoginStatusAutoRefresh() {
  if (qqLoginAutoRefreshTimer) clearInterval(qqLoginAutoRefreshTimer);
  qqLoginAutoRefreshTimer = setInterval(function(){
    refreshQQLoginStatus().catch(function(e){ console.warn('QQ login auto refresh failed:', e); });
  }, 45000);
}

function normalizeKugouLoginStatus(info) {
  var fallback = { provider: 'kugou', loggedIn: false, preview: true, nickname: '酷狗音乐', userId: '', avatar: '', vipType: 0, vipLevel: 'none', isVip: false, isSvip: false, vipLabel: '无 VIP', playbackKeyReady: false };
  if (!info || !info.loggedIn) return Object.assign({}, fallback, info || {}, {
    provider: 'kugou',
    loggedIn: false,
    nickname: info && info.nickname || fallback.nickname,
    userId: info && info.userId || '',
    avatar: info && info.avatar || '',
    vipType: Number(info && (info.vipType || info.vip_type) || 0) || 0,
    vipLevel: 'none',
    isVip: false,
    isSvip: false,
    vipLabel: '无 VIP',
    playbackKeyReady: false,
    preview: true
  });
  var vipType = Number(info.vipType || info.vip_type || info.viptype || 0) || 0;
  var isSvip = !!(info.isSvip || info.is_svip);
  var isVip = isSvip || !!(info.isVip || info.is_vip) || vipType > 0;
  return Object.assign({}, fallback, info, {
    provider: 'kugou',
    loggedIn: true,
    nickname: info.nickname || fallback.nickname,
    userId: info.userId || '',
    avatar: info.avatar || '',
    vipType: vipType,
    vipLevel: info.vipLevel || info.vip_level || (isSvip ? 'svip' : (isVip ? 'vip' : 'none')),
    isVip: isVip,
    isSvip: isSvip,
    vipLabel: isVip ? (info.vipLabel || 'Kugou VIP') : '无 VIP',
    playbackKeyReady: info.playbackKeyReady !== false,
    preview: false
  });
}

async function refreshKugouLoginStatus() {
  try {
    var info = await apiJson('/api/kugou/login/status?t=' + Date.now());
    var prevLogged = !!kugouLoginStatus.loggedIn;
    kugouLoginStatus = normalizeKugouLoginStatus(info);
    if (!kugouLoginStatus.loggedIn && (prevLogged || kugouLoginWasLoggedIn)) {
      kugouPlaylists = [];
      showToast('Kugou logged out');
    }
    if (kugouLoginStatus.loggedIn && !prevLogged) refreshUserPlaylists(true);
    kugouLoginWasLoggedIn = !!kugouLoginStatus.loggedIn;
    if (!hasPlatformLogin(activeAccountProvider)) activeAccountProvider = firstLoggedProvider();
    renderUserBtn();
    return kugouLoginStatus;
  } catch (e) {
    console.warn('Kugou login status failed:', e);
    kugouLoginStatus = normalizeKugouLoginStatus(null);
    renderUserBtn();
    return kugouLoginStatus;
  }
}

function renderUserBtn() {
  var btn = document.getElementById('user-btn');
  if (!btn) return;
  btn.classList.remove('multi-account');
  if (dualAccountMode && hasAnyPlatformLogin()) {
    activeAccountProvider = firstLoggedProvider();
    btn.classList.add('logged-in', 'multi-account');
    btn.classList.remove('logged-out');
    btn.title = '账号信息 · 双平台登录状态';
    btn.innerHTML = renderTopAccountPill('netease') + renderTopAccountPill('qq') + renderTopAccountPill('kugou');
  } else if (hasAnyPlatformLogin()) {
    activeAccountProvider = firstLoggedProvider();
    var st = platformStatus(activeAccountProvider);
    var meta = platformMeta(activeAccountProvider);
    btn.classList.add('logged-in');
    btn.classList.remove('logged-out');
    btn.title = dualAccountMode ? '账号信息 · 已启用双平台展示' : ((st.nickname || meta.label) + ' · 账号信息');
    btn.innerHTML = '<img id="user-avatar" src="' + providerAvatarSrc(activeAccountProvider, st) + '">' +
                    '<span>' + escHtml(st.nickname || meta.label) + '</span>' +
                    providerVipBadge(activeAccountProvider, st, 'user-vip-tag');
  } else {
    btn.classList.remove('logged-in');
    btn.classList.add('logged-out');
    btn.title = '登录账号';
    btn.innerHTML = '<span class="login-word">登录</span>';
  }
  updatePlaybackQualityUi();
}

async function showLoginModal(opts) {
  opts = opts || {};
  if (opts.provider) loginProvider = opts.provider === 'qq' || opts.provider === 'kugou' ? opts.provider : 'netease';
  var modal = document.getElementById('login-modal');
  openGsapModal(modal);
  updateLoginProviderUi();
  await refreshQr();
}

function closeLoginModal() {
  stopQrPoll();
  closeGsapModal(document.getElementById('login-modal'));
}

function setLoginProvider(provider, silent) {
  loginProvider = provider === 'qq' || provider === 'kugou' ? provider : 'netease';
  updateLoginProviderUi();
  if (!silent && document.getElementById('login-modal').classList.contains('show')) refreshQr();
}

function loginProviderBusy(provider) {
  if (provider === 'qq') return !!qqWebLoginBusy;
  if (provider === 'kugou') return !!kugouWebLoginBusy;
  return !!neteaseWebLoginBusy;
}

function renderLoginAccountCard(provider) {
  var st = platformStatus(provider);
  var card = document.getElementById('login-account-card');
  var avatar = document.getElementById('login-account-avatar');
  var name = document.getElementById('login-account-name');
  var metaEl = document.getElementById('login-account-meta');
  if (!card) return !!(st && st.loggedIn);
  var loggedIn = !!(st && st.loggedIn);
  card.className = 'login-account-card' + (loggedIn ? ' show ' + provider : '');
  if (loggedIn) {
    var meta = platformMeta(provider);
    if (avatar) avatar.src = providerAvatarSrc(provider, st);
    if (name) name.textContent = st.nickname || meta.label;
    if (metaEl) {
      var membership = loginProviderVipText(provider, st);
      metaEl.textContent = 'UID: ' + (st.userId || '-') + (membership ? ' · ' + membership : '');
    }
  }
  return loggedIn;
}

function updateLoginProviderUi() {
  var meta = platformMeta(loginProvider);
  var isQQ = loginProvider === 'qq';
  var isKugou = loginProvider === 'kugou';
  var isLoggedIn = renderLoginAccountCard(loginProvider);
  var modal = document.querySelector('#login-modal .dual-login-modal');
  var title = document.getElementById('login-modal-title');
  var desc = document.getElementById('login-modal-desc');
  var shell = document.getElementById('qr-shell');
  var st = document.getElementById('qr-status');
  var refreshBtn = document.getElementById('refresh-qr-btn');
  var qqPanel = document.getElementById('qq-cookie-panel');
  var qqCookieInput = document.getElementById('qq-cookie-input');
  var qqCookieNote = document.querySelector('.qq-cookie-note');
  var qqCookieToggle = document.getElementById('qq-cookie-toggle-btn');
  var qqCard = document.getElementById('qq-web-login-card');
  var neteaseBtn = document.getElementById('login-provider-netease');
  var qqBtn = document.getElementById('login-provider-qq');
  var kugouBtn = document.getElementById('login-provider-kugou');
  if (modal) modal.classList.toggle('login-modal-logged-in', isLoggedIn);
  if (neteaseBtn) neteaseBtn.classList.toggle('active', loginProvider === 'netease');
  if (qqBtn) qqBtn.classList.toggle('active', isQQ);
  if (kugouBtn) kugouBtn.classList.toggle('active', isKugou);
  if (title) title.textContent = isLoggedIn ? (meta.label + '已登录') : ('扫码登录' + meta.label);
  if (desc) {
    desc.innerHTML = isLoggedIn
      ? '当前已保存 <b>' + meta.label + '</b> 登录会话，可继续同步歌单和会员信息；需要换号时请先退出登录。'
      : (isKugou
        ? '使用 <b>酷狗音乐 App</b> 扫码登录，成功后会同步账号信息和酷狗歌单。'
        : isQQ
        ? '打开 <b>QQ 音乐官方扫码窗口</b> 登录，成功后会自动同步账号会话和歌单。'
        : '使用 <b>网易云音乐 App</b> 扫码，可同步歌单、红心与播客。');
  }
  if (shell) {
    shell.classList.toggle('web-login-preview', isQQ && !isLoggedIn);
    shell.classList.toggle('qq-preview', isQQ && !isLoggedIn);
    shell.classList.remove('netease-preview');
  }
  if (qqPanel) qqPanel.classList.toggle('show', !isLoggedIn && (isQQ || isKugou) && qqManualCookieOpen);
  if (qqCookieToggle) {
    qqCookieToggle.classList.toggle('show', !isLoggedIn && (isQQ || isKugou));
    qqCookieToggle.textContent = qqManualCookieOpen ? '收起导入' : '手动导入';
  }
  if (qqCookieInput) qqCookieInput.placeholder = isKugou ? 'KuGoo=...; kg_mid=...; userid=...; token=...' : 'uin=...; qqmusic_key=...; qm_keyst=...';
  if (qqCookieNote) qqCookieNote.textContent = isKugou ? '从 kugou.com 的登录会话导入。' : '从 y.qq.com 的登录会话导入。';
  if (qqCard) {
    qqCard.style.display = (!isLoggedIn && isQQ) ? '' : 'none';
    qqCard.disabled = loginProviderBusy(loginProvider);
    var cardMark = qqCard.querySelector('b');
    var cardLabel = qqCard.querySelector('span');
    if (cardMark) cardMark.textContent = 'QQ';
    if (cardLabel) cardLabel.textContent = qqWebLoginBusy ? '等待扫码确认' : '打开官方扫码窗口';
    qqCard.onclick = openQQWebLogin;
  }
  if (st) {
    st.style.display = isLoggedIn ? 'none' : '';
    st.className = isQQ ? 'preview' : '';
    st.textContent = isQQ ? '点击二维码区域或下方按钮打开 QQ 音乐官方扫码窗口' : '正在生成二维码…';
  }
  if (refreshBtn) {
    refreshBtn.disabled = loginProviderBusy(loginProvider);
    refreshBtn.textContent = isLoggedIn
      ? ('退出' + meta.label)
      : (isQQ ? (qqWebLoginBusy ? '等待扫码…' : '扫码登录') : (loginProviderBusy(loginProvider) ? '等待登录…' : '刷新二维码'));
    refreshBtn.onclick = isLoggedIn ? function(){ logoutLoginProvider(loginProvider); } : (isQQ ? openQQWebLogin : refreshQr);
  }
}

async function refreshQr() {
  stopQrPoll();
  qrKey = null;
  if (loginProvider === 'qq') {
    var info = await refreshQQLoginStatus();
    updateLoginProviderUi();
    if (!(info && info.loggedIn)) {
      var qqImg = document.getElementById('qr-img');
      if (qqImg) qqImg.src = '';
    }
    return;
  }
  if (loginProvider === 'kugou') {
    var kgInfo = await refreshKugouLoginStatus();
    updateLoginProviderUi();
    if (kgInfo && kgInfo.loggedIn) return;
    var kgImg = document.getElementById('qr-img');
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
      var kgKey = await apiJson('/api/kugou/login/qr/key?t=' + Date.now());
      if (!kgKey || !kgKey.key || !kgKey.img) throw new Error((kgKey && (kgKey.message || kgKey.error)) || '酷狗二维码生成失败');
      qrKey = kgKey.key;
      if (kgImg) kgImg.src = kgKey.img;
      if (kgStatus) {
        kgStatus.textContent = '请使用酷狗音乐 App 扫码登录';
        kgStatus.className = '';
      }
      startQrPoll();
    } catch (e) {
      if (kgStatus) {
        kgStatus.textContent = '酷狗二维码生成失败: ' + (e && e.message ? e.message : e);
        kgStatus.className = 'fail';
      }
    }
    return;
  }
  var neInfo = await refreshLoginStatus(true);
  updateLoginProviderUi();
  if (neInfo && neInfo.loggedIn) return;
  try {
    var neKey = await apiJson('/api/login/qr/key?t=' + Date.now());
    if (!neKey.key) throw new Error('获取 key 失败');
    qrKey = neKey.key;
    var q = await apiJson('/api/login/qr/create?key=' + encodeURIComponent(qrKey) + '&t=' + Date.now());
    if (!q.img) throw new Error('生成二维码失败');
    var neImg = document.getElementById('qr-img');
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
  } catch (e) {
    var errStatus = document.getElementById('qr-status');
    if (errStatus) {
      errStatus.style.display = '';
      errStatus.textContent = '出错: ' + e.message;
      errStatus.className = 'fail';
    }
  }
}

function startQrPoll() { if (qrPollTimer) clearInterval(qrPollTimer); qrPollTimer = setInterval(checkQr, 2000); }

function stopQrPoll() { if (qrPollTimer) { clearInterval(qrPollTimer); qrPollTimer = null; } }

async function logoutLoginProvider(provider) {
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
  } catch (e) {
    if (statusEl) {
      statusEl.textContent = e && e.message ? e.message : '退出登录失败';
      statusEl.className = 'fail';
    }
  }
}

function toggleQQCookiePanel() {
  qqManualCookieOpen = !qqManualCookieOpen;
  updateLoginProviderUi();
}

function openProviderWebLogin() {
  if (loginProvider === 'kugou') return openKugouWebLogin();
  if (loginProvider === 'qq') return openQQWebLogin();
  return openNeteaseWebLogin();
}

async function openNeteaseWebLogin() {
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
    var info = await apiJson('/api/login/cookie', {
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
  } catch (e) {
    neteaseWebLoginBusy = false;
    updateLoginProviderUi();
    if (statusEl) { statusEl.textContent = e && e.message ? e.message : '网易云登录失败'; statusEl.className = 'fail'; }
  } finally {
    if (neteaseWebLoginBusy) {
      neteaseWebLoginBusy = false;
      updateLoginProviderUi();
    }
  }
}

async function openQQWebLogin() {
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
    var info = await apiJson('/api/qq/login/cookie', {
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
  } catch (e) {
    qqWebLoginBusy = false;
    updateLoginProviderUi();
    if (statusEl) { statusEl.textContent = e && e.message ? e.message : 'QQ 登录失败'; statusEl.className = 'fail'; }
  } finally {
    if (qqWebLoginBusy) {
      qqWebLoginBusy = false;
      updateLoginProviderUi();
    }
  }
}

async function openKugouWebLogin() {
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
      : await apiJson('/api/kugou/login/cookie', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ cookie: result.cookie || '' })
        });
    if (info && info.loggedIn && !info.saved) {
      try {
        var freshInfo = await apiJson('/api/kugou/login/status?t=' + Date.now());
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
  } catch (e) {
    kugouWebLoginBusy = false;
    updateLoginProviderUi();
    if (statusEl) { statusEl.textContent = e && e.message ? e.message : '酷狗登录失败'; statusEl.className = 'fail'; }
  } finally {
    if (kugouWebLoginBusy) {
      kugouWebLoginBusy = false;
      updateLoginProviderUi();
    }
  }
}

async function submitQQCookieLogin() {
  if (qqCookieBusy) return;
  var input = document.getElementById('qq-cookie-input');
  var statusEl = document.getElementById('qr-status');
  var saveBtn = document.getElementById('qq-cookie-save-btn');
  var cookie = input ? input.value.trim() : '';
  var isKugouCookie = loginProvider === 'kugou';
  if (!cookie) {
    if (statusEl) { statusEl.textContent = isKugouCookie ? '先粘贴酷狗音乐 cookie' : '先粘贴 QQ 音乐 cookie'; statusEl.className = 'fail'; }
    return;
  }
  qqCookieBusy = true;
  if (saveBtn) saveBtn.classList.add('busy');
  if (statusEl) { statusEl.textContent = isKugouCookie ? '正在保存酷狗会话…' : '正在保存 QQ 会话…'; statusEl.className = 'preview'; }
  try {
    var info = await apiJson(isKugouCookie ? '/api/kugou/login/cookie' : '/api/qq/login/cookie', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cookie: cookie })
    });
    if (!info || !info.loggedIn) throw new Error((info && (info.message || info.error)) || (isKugouCookie ? '酷狗会话不可用' : 'QQ 会话不可用'));
    if (isKugouCookie) {
      kugouLoginStatus = normalizeKugouLoginStatus(info);
      activeAccountProvider = 'kugou';
    } else {
      qqLoginStatus = info;
      activeAccountProvider = 'qq';
    }
    if (input) input.value = '';
    renderUserBtn();
    refreshUserPlaylists(true);
    var manualQQPlaybackReady = !!info.playbackKeyReady;
    if (statusEl) { statusEl.textContent = isKugouCookie ? '酷狗音乐会话已保存' : (manualQQPlaybackReady ? 'QQ 音乐会话已保存' : 'QQ 账号已同步，播放授权不完整，部分歌曲会自动换源'); statusEl.className = 'scan'; }
    setTimeout(function(){
      closeLoginModal();
      showToast(isKugouCookie ? ('酷狗音乐已同步: ' + (info.nickname || info.userId || '')) : ((manualQQPlaybackReady ? 'QQ 音乐已登录: ' : 'QQ 账号已同步: ') + (info.nickname || info.userId || '')));
    }, 420);
  } catch (e) {
    if (statusEl) { statusEl.textContent = e && e.message ? e.message : (isKugouCookie ? '酷狗会话保存失败' : 'QQ 会话保存失败'); statusEl.className = 'fail'; }
  } finally {
    qqCookieBusy = false;
    if (saveBtn) saveBtn.classList.remove('busy');
  }
}

async function checkQr() {
  if (!qrKey) return;
  try {
    var r = await apiJson('/api/login/qr/check?key=' + encodeURIComponent(qrKey));
    var $st = document.getElementById('qr-status');
    if (r.code === 800) { $st.textContent = '二维码已过期, 请刷新'; $st.className = 'fail'; stopQrPoll(); }
    else if (r.code === 801) { $st.textContent = '请在 App 中扫码'; $st.className = ''; }
    else if (r.code === 802) { $st.textContent = '已扫码, 请在手机确认…'; $st.className = 'scan'; }
    else if (r.code === 803 && (r.loggedIn || r.hasCookie)) {
      $st.textContent = r.pendingProfile ? '登录成功，正在同步账号资料…' : '登录成功！'; $st.className = 'scan';
      stopQrPoll();
      loginStatus = r.loggedIn ? r : Object.assign({}, r, { loggedIn: true, pendingProfile: true, nickname: r.nickname || '网易云用户' });
      activeAccountProvider = 'netease';
      renderUserBtn();
      setTimeout(async function(){
        var fresh = await refreshLoginStatus(true);
        if (!fresh || !fresh.loggedIn) {
          loginStatus = Object.assign({}, loginStatus, { loggedIn: true, pendingProfile: true });
          renderUserBtn();
          fresh = loginStatus;
        }
        closeLoginModal();
        showToast('欢迎 ' + (fresh && fresh.nickname ? fresh.nickname : ''));
      }, r.pendingProfile ? 1200 : 500);
    } else if (r.code === 803) {
      $st.textContent = '扫码已确认，但没有拿到登录凭证，请刷新二维码重试'; $st.className = 'fail';
      stopQrPoll();
    }
  } catch (e) { console.warn(e); }
}

function setActiveAccountProvider(provider) {
  provider = provider === 'qq' || provider === 'kugou' ? provider : 'netease';
  if (!hasPlatformLogin(provider)) {
    openProviderLogin(provider);
    return;
  }
  activeAccountProvider = provider;
  dualAccountMode = false;
  renderUserBtn();
  updateUserModalUi();
}

function enableDualAccountView() {
  if (!hasPlatformLogin('netease') && !hasPlatformLogin('qq') && !hasPlatformLogin('kugou')) {
    openProviderLogin('netease');
    return;
  }
  if (!hasPlatformLogin('netease')) {
    openProviderLogin('netease');
    return;
  }
  if (!hasPlatformLogin('qq') && !hasPlatformLogin('kugou')) {
    openProviderLogin('qq');
    return;
  }
  dualAccountMode = true;
  renderUserBtn();
  updateUserModalUi();
  showToast('已启用双平台账号展示');
}

function requestDualLoginMode() {
  enableDualAccountView();
}

function openProviderLogin(provider) {
  provider = provider === 'qq' || provider === 'kugou' ? provider : 'netease';
  closeUserModal();
  loginProvider = provider;
  showLoginModal({ provider: provider });
}

async function logoutActiveAccount() {
  if (activeAccountProvider === 'kugou') {
    try { await apiJson('/api/kugou/logout'); } catch (e) {}
    try {
      if (window.desktopWindow && typeof window.desktopWindow.clearKugouMusicLogin === 'function') {
        await window.desktopWindow.clearKugouMusicLogin();
      }
    } catch (e) {}
    kugouLoginStatus = { provider: 'kugou', loggedIn: false, preview: true, nickname: '酷狗音乐', userId: '', avatar: '', vipType: 0 };
    dualAccountMode = false;
    activeAccountProvider = firstLoggedProvider();
    renderUserBtn();
    if (hasAnyPlatformLogin()) updateUserModalUi();
    else closeUserModal();
    showToast('已退出酷狗音乐');
    return;
  }
  if (activeAccountProvider === 'qq') {
    try { await apiJson('/api/qq/logout'); } catch (e) {}
    try {
      if (window.desktopWindow && typeof window.desktopWindow.clearQQMusicLogin === 'function') {
        await window.desktopWindow.clearQQMusicLogin();
      }
    } catch (e) {}
    qqLoginStatus = { provider: 'qq', loggedIn: false, preview: false, nickname: 'QQ 音乐', userId: '', avatar: '', vipType: 0 };
    qqPlaylists = [];
    userPlaylists = userPlaylists.filter(function(pl){ return pl.provider !== 'qq'; });
    dualAccountMode = false;
    activeAccountProvider = firstLoggedProvider();
    renderUserBtn();
    if (hasAnyPlatformLogin()) updateUserModalUi();
    else closeUserModal();
    showToast('已退出 QQ 音乐');
    return;
  }
  doLogout();
}

async function doLogout() {
  await apiJson('/api/logout');
  try {
    if (window.desktopWindow && typeof window.desktopWindow.clearNeteaseMusicLogin === 'function') {
      await window.desktopWindow.clearNeteaseMusicLogin();
    }
  } catch (e) {}
  loginStatus = { loggedIn: false };
  if (!hasPlatformLogin('netease') || !hasPlatformLogin('qq') || !hasPlatformLogin('kugou')) dualAccountMode = false;
  activeAccountProvider = firstLoggedProvider();
  userPlaylists = qqPlaylists.concat(kugouPlaylists);
  myPodcastCollections = [];
  myPodcastItems = {};
  likedSongMap = {};
  closeCollectModal();
  updateLikeButtons();
  safeRenderQueuePanel('logout', { scrollCurrent: miniQueueOpen });
  renderUserBtn();
  safeShelfRebuild('logout');
  closeUserModal();
  showToast('已退出登录');
}

function __mineradioInitAccountLogin47() {
  startupLoginGuideShown = false;

  LOGIN_GUIDE_SEEN_STORE_KEY = 'mineradio-login-guide-seen-v1';

  loginGuideAnimating = false;

  loginGuideRaf = null;
}
