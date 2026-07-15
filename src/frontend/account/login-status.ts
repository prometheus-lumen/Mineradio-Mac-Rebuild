function onUserBtnClick(): void {
  if (hasAnyPlatformLogin()) showUserModal();
  else showLoginModal();
}

async function refreshLoginStatus(_force = false): Promise<LoginApiResponse | null> {
  try {
    var info = await apiJson<LoginApiResponse>('/api/login/status?t=' + Date.now());
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

function normalizeQQLoginStatus(info?: LoginApiResponse | null): PlatformStatus {
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

async function refreshQQLoginStatus(): Promise<PlatformStatus> {
  try {
    var info = await apiJson<LoginApiResponse>('/api/qq/login/status?t=' + Date.now());
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

function startQQLoginStatusAutoRefresh(): void {
  if (qqLoginAutoRefreshTimer) clearInterval(qqLoginAutoRefreshTimer);
  qqLoginAutoRefreshTimer = setInterval(function(){
    refreshQQLoginStatus().catch(function(e){ console.warn('QQ login auto refresh failed:', e); });
  }, 45000);
}

function normalizeKugouLoginStatus(info?: LoginApiResponse | null): PlatformStatus {
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

async function refreshKugouLoginStatus(): Promise<PlatformStatus> {
  try {
    var info = await apiJson<LoginApiResponse>('/api/kugou/login/status?t=' + Date.now());
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

