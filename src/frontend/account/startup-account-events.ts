function bindStartupAccountEvents(): void {
  podcastListEl = document.getElementById('podcast-list');

  if (podcastListEl) {
    podcastListEl.addEventListener('click', function(e) {
      var target = e.target as Element;
      if (target.closest('[data-podcast-back]')) {
        renderMyPodcastCollections({ animate: true });
        return;
      }
      var radioCard = target.closest('[data-podcast-radio-id]');
      if (radioCard) {
        loadPodcastRadioIntoQueue(radioCard.getAttribute('data-podcast-radio-id') || '', true, radioCard.getAttribute('data-podcast-title') || '');
        return;
      }
      var card = target.closest('[data-podcast-key]');
      if (!card) return;
      openMyPodcastCollection(card.getAttribute('data-podcast-key') || '', card.getAttribute('data-podcast-title') || '');
    });
  }

  baseCheckQr = checkQr;

  checkQr = async function() {
    if (loginProvider === 'qq') {
      if (!qrKey) return;
      var qqSt = document.getElementById('qr-status');
      try {
        var qqResult = await apiJson<QrCheckResponse>('/api/qq/login/qr/check?key=' + encodeURIComponent(qrKey) + '&t=' + Date.now());
        if (qqResult.code === 800) {
          if (qqSt) { qqSt.textContent = 'QQ 二维码已过期，请刷新'; qqSt.className = 'fail'; }
          stopQrPoll();
        } else if (qqResult.code === 801) {
          if (qqSt) { qqSt.textContent = '请使用 QQ 音乐 App 扫码'; qqSt.className = ''; }
        } else if (qqResult.code === 802) {
          if (qqSt) { qqSt.textContent = '已扫码，请在手机确认…'; qqSt.className = 'scan'; }
        } else if (qqResult.code === 803 && qqResult.loggedIn) {
          stopQrPoll();
          qqLoginStatus = normalizeQQLoginStatus(qqResult);
          activeAccountProvider = 'qq';
          qqManualCookieOpen = false;
          if (qqSt) { qqSt.textContent = 'QQ 音乐登录成功，正在同步歌单…'; qqSt.className = 'scan'; }
          renderUserBtn();
          await refreshUserPlaylists(true);
          setTimeout(function(){ closeLoginModal(); showToast('QQ 音乐已登录'); }, 420);
        }
      } catch (error) {
        if (qqSt) { qqSt.textContent = error instanceof Error ? error.message : 'QQ 登录失败'; qqSt.className = 'fail'; }
        stopQrPoll();
      }
      return;
    }
    if (loginProvider !== 'kugou') return baseCheckQr();
    if (!qrKey) return;
    var st = document.getElementById('qr-status');
    try {
      var r = await apiJson<QrCheckResponse>('/api/kugou/login/qr/check?key=' + encodeURIComponent(qrKey) + '&t=' + Date.now());
      if (r.code === 800) {
        if (st) { st.textContent = 'Kugou QR expired, refresh and try again'; st.className = 'fail'; }
        stopQrPoll();
      } else if (r.code === 801) {
        if (st) { st.textContent = 'Use Kugou Music App to scan'; st.className = ''; }
      } else if (r.code === 802) {
        if (st) { st.textContent = 'Scanned. Confirm login on your phone'; st.className = 'scan'; }
      } else if (r.code === 803 && r.loggedIn) {
        stopQrPoll();
        kugouLoginStatus = normalizeKugouLoginStatus(r);
        activeAccountProvider = 'kugou';
        qqManualCookieOpen = false;
        if (st) { st.textContent = 'Kugou login success, syncing playlists...'; st.className = 'scan'; }
        renderUserBtn();
        await refreshUserPlaylists(true);
        setTimeout(function(){
          closeLoginModal();
          showToast('Kugou synced: ' + (kugouLoginStatus.nickname || kugouLoginStatus.userId || ''));
        }, 420);
      } else if (r.code === 803) {
        if (st) { st.textContent = r.message || 'Kugou login confirmed but token missing'; st.className = 'fail'; }
        stopQrPoll();
      }
    } catch (e) {
      console.warn(e);
    }
  };
}
