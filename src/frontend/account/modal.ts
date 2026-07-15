// Mineradio classic module: render/scene-frame.
function updateUserModalUi(): void {
  activeAccountProvider = firstLoggedProvider();
  var st = platformStatus(activeAccountProvider);
  var meta = platformMeta(activeAccountProvider);
  var chip = document.getElementById('account-provider-chip');
  var avatar = document.getElementById('user-modal-avatar') as HTMLImageElement | null;
  var name = document.getElementById('user-modal-name');
  var vipEl = document.getElementById('user-modal-vip');
  var hint = document.getElementById('account-hint');
  var logoutBtn = document.getElementById('account-logout-btn');
  var addNetease = document.getElementById('account-add-netease');
  var addQQ = document.getElementById('account-add-qq');
  var addKugou = document.getElementById('account-add-kugou');
  if (chip) {
    chip.className = 'account-provider-chip ' + activeAccountProvider;
    chip.innerHTML = '<span class="account-source-dot ' + meta.dot + '"></span><span>' + meta.label + '</span>';
  }
  if (avatar) avatar.src = providerAvatarSrc(activeAccountProvider, st);
  if (name) name.textContent = (st && st.nickname) || meta.label;
  if (vipEl) {
    if (activeAccountProvider === 'netease') {
      var neVipLevel = providerVipLevel('netease', st);
      var vipLabel = neVipLevel === 'svip' ? '网易云 SVIP' : (neVipLevel === 'vip' ? '网易云 VIP' : '普通用户');
      vipEl.textContent = 'UID: ' + ((st && st.userId) || '-') + '  ·  ' + vipLabel;
      vipEl.style.color = hasProviderVip('netease', st) ? 'rgba(244,210,138,0.86)' : 'rgba(255,255,255,0.5)';
    } else if (activeAccountProvider === 'kugou') {
      var kgVipLabel = hasProviderVip('kugou', st) ? '酷狗 VIP 会员' : '酷狗音乐会话';
      vipEl.textContent = 'UID: ' + ((st && st.userId) || '-') + '  ·  ' + kgVipLabel;
      vipEl.style.color = hasProviderVip('kugou', st) ? 'rgba(68,199,255,0.86)' : 'rgba(68,199,255,0.58)';
    } else {
      var qqVipLevel = providerVipLevel('qq', st);
      var qqVipLabel = qqVipLevel === 'svip' ? 'SVIP' : (qqVipLevel === 'vip' ? 'VIP' : '');
      vipEl.textContent = 'UID: ' + ((st && st.userId) || '-') + (qqVipLabel ? '  ·  ' + qqVipLabel : '');
      vipEl.style.color = hasProviderVip('qq', st) ? 'rgba(0,245,212,0.82)' : 'rgba(0,245,212,0.58)';
    }
  }
  ['netease','qq','kugou','both'].forEach(function(key){
    var btn = document.getElementById('user-provider-' + key);
    if (btn) btn.classList.toggle('active', key === 'both' ? dualAccountMode : (!dualAccountMode && activeAccountProvider === key));
  });
  if (addNetease) addNetease.style.display = hasPlatformLogin('netease') ? 'none' : '';
  if (addQQ) addQQ.textContent = hasPlatformLogin('qq') ? '查看 QQ 音乐' : '补登 QQ 音乐';
  if (addKugou) addKugou.textContent = hasPlatformLogin('kugou') ? '查看酷狗音乐' : '补登酷狗音乐';
  if (logoutBtn) logoutBtn.textContent = activeAccountProvider === 'qq' ? '退出 QQ 音乐' : (activeAccountProvider === 'kugou' ? '退出酷狗音乐' : '退出网易云');
  if (hint) hint.textContent = dualAccountMode
    ? '已显示全部登录平台。'
    : '可切换账号平台，或显示全部已登录平台。';
}

function showUserModal(): void {
  if (!hasAnyPlatformLogin()) {
    showLoginModal();
    return;
  }
  updateUserModalUi();
  var modal = document.getElementById('user-modal');
  if (modal) openGsapModal(modal);
}

function closeUserModal(): void { closeGsapModal(document.getElementById('user-modal')); }
