function sanitizeQQDisplayName(value: unknown, userId: unknown): string {
  var name = String(value || '').replace(/\s+/g, ' ').trim();
  if (!name) return '';
  var compact = name.replace(/\s+/g, '');
  var idDigits = String(userId || '').replace(/\D/g, '').replace(/^0+/, '');
  var nameDigits = compact.replace(/\D/g, '').replace(/^0+/, '');
  if (idDigits && nameDigits === idDigits && /^\D*\d+\D*$/.test(compact)) return '';
  if (/^QQ\s*\d{5,}$/i.test(name)) return '';
  if (/^(?=[a-f\d]{14,64}$)(?=.*[a-f])(?=.*\d)[a-f\d]+$/i.test(compact)) return '';
  if (/^(?:openid[:_-]?)?[A-Za-z\d_-]{24,}$/i.test(compact) && /\d/.test(compact)) return '';
  return name;
}

function playlistPanelProviderId(provider: MusicProvider, id: string | number): string | number {
  if (provider === 'qq') return 'qq:' + id;
  if (provider === 'kugou') return 'kugou:' + id;
  return id;
}

function platformMeta(provider: MusicProvider): PlatformMeta {
  if (provider === 'qq') return { key: 'qq', short: 'QQ', label: 'QQ 音乐', app: 'QQ 音乐 App', dot: 'qq' };
  if (provider === 'kugou') return { key: 'kugou', short: 'KG', label: '酷狗音乐', app: '酷狗音乐 App', dot: 'kugou' };
  return { key: 'netease', short: 'NE', label: '网易云音乐', app: '网易云音乐 App', dot: 'netease' };
}

function platformStatus(provider: MusicProvider): PlatformStatus {
  if (provider === 'qq') return qqLoginStatus;
  if (provider === 'kugou') return kugouLoginStatus;
  return loginStatus;
}

function providerVipType(provider: MusicProvider, status?: PlatformStatus): number {
  status = status || platformStatus(provider) || {};
  return Number(status.vipType || status.vip_type || status.vip || status.isVip || status.is_vip || 0) || 0;
}

function providerVipLevel(provider: MusicProvider, status?: PlatformStatus): ProviderVipLevel {
  status = status || platformStatus(provider) || {};
  var raw = String(status.vipLevel || status.vip_level || '').toLowerCase();
  if (raw === 'svip' || raw === 'vip' || raw === 'none') return raw;
  var vip = providerVipType(provider, status);
  if (provider === 'netease' || provider === 'qq') {
    if (status.isSvip || status.is_svip || vip >= 10) return 'svip';
    if (status.isVip || status.is_vip || vip > 0) return 'vip';
    return 'none';
  }
  return vip > 0 ? 'vip' : 'none';
}

function hasProviderVip(provider: MusicProvider, status?: PlatformStatus): boolean {
  return providerVipLevel(provider, status) !== 'none';
}

function hasProviderSvip(provider: MusicProvider, status?: PlatformStatus): boolean {
  return provider === 'netease' && providerVipLevel(provider, status) === 'svip';
}

function providerVipBadge(provider: MusicProvider, status?: PlatformStatus, idAttr = ''): string {
  if (!hasProviderVip(provider, status)) return '';
  var id = idAttr ? ' id="' + idAttr + '"' : '';
  var cls = 'top-account-vip' + (provider === 'qq' ? ' qq' : (provider === 'kugou' ? ' kugou' : ''));
  var level = providerVipLevel(provider, status);
  var label = provider === 'kugou' ? 'KG VIP' : (level === 'svip' ? 'SVIP' : 'VIP');
  return '<span' + id + ' class="' + cls + '">' + label + '</span>';
}

function hasPlatformLogin(provider: MusicProvider): boolean {
  var st = platformStatus(provider);
  return !!(st && st.loggedIn);
}

function hasAnyPlatformLogin(): boolean {
  return hasPlatformLogin('netease') || hasPlatformLogin('qq') || hasPlatformLogin('kugou');
}

function firstLoggedProvider(): MusicProvider {
  if (hasPlatformLogin(activeAccountProvider)) return activeAccountProvider;
  if (hasPlatformLogin('netease')) return 'netease';
  if (hasPlatformLogin('qq')) return 'qq';
  if (hasPlatformLogin('kugou')) return 'kugou';
  return 'netease';
}

function providerAvatarSrc(provider: MusicProvider, status?: PlatformStatus): string {
  status = status || platformStatus(provider) || {};
  if (status.avatar) return avatarSrc(status.avatar);
  var meta = platformMeta(provider);
  var fill = provider === 'qq' ? '#bfd66b' : (provider === 'kugou' ? '#44c7ff' : '#d95b67');
  var bg = provider === 'qq' ? '#11150b' : (provider === 'kugou' ? '#071520' : '#180b0f');
  var svg = '<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 96 96"><rect width="96" height="96" rx="48" fill="' + bg + '"/><circle cx="48" cy="48" r="34" fill="' + fill + '" opacity=".16"/><text x="48" y="56" text-anchor="middle" font-family="Arial, sans-serif" font-size="26" font-weight="700" fill="' + fill + '">' + meta.short + '</text></svg>';
  return 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(svg);
}

function renderTopAccountPill(provider: MusicProvider): string {
  var st = platformStatus(provider);
  if (!st || !st.loggedIn) return '';
  var meta = platformMeta(provider);
  var displayName = (provider === 'qq' && st.preview) ? '待接入' : (st.nickname || meta.label);
  var vipTag = providerVipBadge(provider, st);
  return '<span class="top-account-pill">' +
    '<img src="' + providerAvatarSrc(provider, st) + '" alt="">' +
    '<span class="top-account-name">' + escHtml(displayName) + '</span>' +
    vipTag +
  '</span>';
}

function loginProviderVipText(provider: MusicProvider, st: PlatformStatus): string {
  if (!st || !st.loggedIn) return '';
  if (provider === 'kugou') return hasProviderVip('kugou', st) ? (st.vipLabel || 'Kugou VIP') : '酷狗普通会话';
  if (provider === 'qq') {
    var qqLevel = providerVipLevel('qq', st);
    return qqLevel === 'svip' ? 'SVIP' : (qqLevel === 'vip' ? 'VIP' : '');
  }
  var level = providerVipLevel('netease', st);
  return level === 'svip' ? '网易云 SVIP' : (level === 'vip' ? '网易云 VIP' : '网易云普通用户');
}
