async function submitQQCookieLogin(): Promise<void> {
  if (qqCookieBusy) return;
  var input = document.getElementById('qq-cookie-input') as HTMLTextAreaElement | null;
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
    var info = await apiJson<LoginApiResponse>(isKugouCookie ? '/api/kugou/login/cookie' : '/api/qq/login/cookie', {
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
  } catch (error) {
    if (statusEl) { statusEl.textContent = error instanceof Error ? error.message : (isKugouCookie ? '酷狗会话保存失败' : 'QQ 会话保存失败'); statusEl.className = 'fail'; }
  } finally {
    qqCookieBusy = false;
    if (saveBtn) saveBtn.classList.remove('busy');
  }
}

let checkQr = async function checkNeteaseQr(): Promise<void> {
  if (!qrKey) return;
  try {
    var r = await apiJson<LoginApiResponse>('/api/login/qr/check?key=' + encodeURIComponent(qrKey));
    var $st = document.getElementById('qr-status');
    if (!$st) return;
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
  } catch (error) { console.warn(error); }
};

