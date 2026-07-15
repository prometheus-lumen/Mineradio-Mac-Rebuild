function setActiveAccountProvider(provider: MusicProvider): void {
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

function enableDualAccountView(): void {
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

function requestDualLoginMode(): void {
  enableDualAccountView();
}

function openProviderLogin(provider: MusicProvider): void {
  provider = provider === 'qq' || provider === 'kugou' ? provider : 'netease';
  closeUserModal();
  loginProvider = provider;
  showLoginModal({ provider: provider });
}

async function logoutActiveAccount(): Promise<void> {
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

async function doLogout(): Promise<void> {
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
