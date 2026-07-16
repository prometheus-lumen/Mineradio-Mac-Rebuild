function renderUserBtn(): void {
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

async function showLoginModal(opts: { provider?: MusicProvider; guided?: boolean; source?: string } = {}): Promise<void> {
  opts = opts || {};
  if (opts.provider) loginProvider = opts.provider === 'qq' || opts.provider === 'kugou' ? opts.provider : 'netease';
  var modal = document.getElementById('login-modal');
  openGsapModal(modal);
  updateLoginProviderUi();
  await refreshQr();
}

function closeLoginModal(): void {
  stopQrPoll();
  closeGsapModal(document.getElementById('login-modal'));
}

function setLoginProvider(provider: MusicProvider, silent = false): void {
  loginProvider = provider === 'qq' || provider === 'kugou' ? provider : 'netease';
  updateLoginProviderUi();
  if (!silent && document.getElementById('login-modal')?.classList.contains('show')) void refreshQr();
}

function loginProviderBusy(provider: MusicProvider): boolean {
  if (provider === 'qq') return !!qqWebLoginBusy;
  if (provider === 'kugou') return !!kugouWebLoginBusy;
  return !!neteaseWebLoginBusy;
}

function renderLoginAccountCard(provider: MusicProvider): boolean {
  var st = platformStatus(provider);
  var card = document.getElementById('login-account-card');
  var avatar = document.getElementById('login-account-avatar') as HTMLImageElement | null;
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

function updateLoginProviderUi(): void {
  var meta = platformMeta(loginProvider);
  var isQQ = loginProvider === 'qq';
  var isKugou = loginProvider === 'kugou';
  var isLoggedIn = renderLoginAccountCard(loginProvider);
  var modal = document.querySelector('#login-modal .dual-login-modal');
  var title = document.getElementById('login-modal-title');
  var desc = document.getElementById('login-modal-desc');
  var shell = document.getElementById('qr-shell');
  var st = document.getElementById('qr-status');
  var refreshBtn = document.getElementById('refresh-qr-btn') as HTMLButtonElement | null;
  var qqPanel = document.getElementById('qq-cookie-panel');
  var qqCookieInput = document.getElementById('qq-cookie-input') as HTMLTextAreaElement | null;
  var qqCookieNote = document.querySelector('.qq-cookie-note');
  var qqCookieToggle = document.getElementById('qq-cookie-toggle-btn');
  var qqCard = document.getElementById('qq-web-login-card') as HTMLButtonElement | null;
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
