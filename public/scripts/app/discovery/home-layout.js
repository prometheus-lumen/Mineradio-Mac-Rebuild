'use strict';

// Mineradio classic module: discovery/home-layout.
function openHomeHeroMediaDb() {
  if (homeHeroMediaDbPromise) return homeHeroMediaDbPromise;
  homeHeroMediaDbPromise = new Promise(function(resolve, reject){
    if (!window.indexedDB) {
      reject(new Error('INDEXED_DB_UNAVAILABLE'));
      return;
    }
    var request = window.indexedDB.open(HOME_HERO_MEDIA_DB_NAME, 1);
    request.onupgradeneeded = function(){
      var db = request.result;
      if (!db.objectStoreNames.contains(HOME_HERO_MEDIA_STORE)) db.createObjectStore(HOME_HERO_MEDIA_STORE);
    };
    request.onsuccess = function(){ resolve(request.result); };
    request.onerror = function(){ reject(request.error || new Error('HOME_MEDIA_DB_OPEN_FAILED')); };
  });
  return homeHeroMediaDbPromise;
}

async function readHomeHeroMediaRecord() {
  var db = await openHomeHeroMediaDb();
  return new Promise(function(resolve, reject){
    var request = db.transaction(HOME_HERO_MEDIA_STORE, 'readonly').objectStore(HOME_HERO_MEDIA_STORE).get(HOME_HERO_MEDIA_KEY);
    request.onsuccess = function(){ resolve(request.result || null); };
    request.onerror = function(){ reject(request.error || new Error('HOME_MEDIA_READ_FAILED')); };
  });
}

async function writeHomeHeroMediaRecord(record) {
  var db = await openHomeHeroMediaDb();
  return new Promise(function(resolve, reject){
    var transaction = db.transaction(HOME_HERO_MEDIA_STORE, 'readwrite');
    transaction.objectStore(HOME_HERO_MEDIA_STORE).put(record, HOME_HERO_MEDIA_KEY);
    transaction.oncomplete = function(){ resolve(true); };
    transaction.onerror = function(){ reject(transaction.error || new Error('HOME_MEDIA_WRITE_FAILED')); };
    transaction.onabort = function(){ reject(transaction.error || new Error('HOME_MEDIA_WRITE_ABORTED')); };
  });
}

async function deleteHomeHeroMediaRecord() {
  var db = await openHomeHeroMediaDb();
  return new Promise(function(resolve, reject){
    var transaction = db.transaction(HOME_HERO_MEDIA_STORE, 'readwrite');
    transaction.objectStore(HOME_HERO_MEDIA_STORE).delete(HOME_HERO_MEDIA_KEY);
    transaction.oncomplete = function(){ resolve(true); };
    transaction.onerror = function(){ reject(transaction.error || new Error('HOME_MEDIA_DELETE_FAILED')); };
  });
}

function homeHeroMediaTypeForFile(file) {
  var mime = String(file && file.type || '').toLowerCase();
  var name = String(file && file.name || '').toLowerCase();
  if (/^video\//.test(mime) || /\.(mp4|webm|mov)$/.test(name)) return 'video';
  if (/^image\//.test(mime) || /\.(jpe?g|png|webp)$/.test(name)) return 'image';
  return '';
}

function validateHomeHeroMediaFile(file) {
  if (!file) return { ok: false, error: '未选择文件' };
  var type = homeHeroMediaTypeForFile(file);
  if (!type) return { ok: false, error: '请选择 JPG、PNG、WebP、MP4、WebM 或 MOV 文件' };
  if (Number(file.size || 0) > HOME_HERO_MEDIA_MAX_BYTES) return { ok: false, error: '背景文件不能超过 80MB' };
  return { ok: true, type: type };
}

function resetHomeHeroMediaElements() {
  var hero = document.querySelector('.home-hero');
  var media = document.getElementById('home-hero-media');
  var image = document.getElementById('home-hero-media-image');
  var video = document.getElementById('home-hero-media-video');
  if (homeHeroMediaObjectUrl) {
    URL.revokeObjectURL(homeHeroMediaObjectUrl);
    homeHeroMediaObjectUrl = '';
  }
  if (image) image.style.backgroundImage = '';
  if (video) {
    video.pause();
    video.removeAttribute('src');
    video.load();
  }
  if (media) media.classList.remove('is-video');
  if (hero) hero.classList.remove('has-custom-bg');
}

function renderHomeHeroMediaRecord(record) {
  resetHomeHeroMediaElements();
  if (!record || (!record.blob && !record.src)) return;
  var hero = document.querySelector('.home-hero');
  var media = document.getElementById('home-hero-media');
  var image = document.getElementById('home-hero-media-image');
  var video = document.getElementById('home-hero-media-video');
  var type = record.type === 'video' ? 'video' : 'image';
  var src = record.src || URL.createObjectURL(record.blob);
  if (!record.src) homeHeroMediaObjectUrl = src;
  if (hero) hero.classList.add('has-custom-bg');
  if (media) media.classList.toggle('is-video', type === 'video');
  if (type === 'video' && video) {
    video.src = src;
    video.play().catch(function(){});
  } else if (image) {
    image.style.backgroundImage = 'url("' + cssImageUrl(src) + '")';
  }
}

async function applyHomeHeroMedia() {
  if (homeHeroMediaLoading) return;
  homeHeroMediaLoading = true;
  var state = readHomeCardSettings();
  try {
    var record = await readHomeHeroMediaRecord();
    if (!record && state.heroBg) {
      if (/^data:image\//i.test(state.heroBg)) {
        var response = await fetch(state.heroBg);
        var blob = await response.blob();
        record = { blob: blob, type: 'image', name: 'legacy-background', size: blob.size, updatedAt: Date.now() };
        await writeHomeHeroMediaRecord(record);
        state.heroBg = '';
        state.heroMediaType = 'image';
        state.heroMediaName = 'legacy-background';
        saveHomeCardSettings();
      } else {
        record = { src: state.heroBg, type: 'image' };
      }
    }
    renderHomeHeroMediaRecord(record);
    homeHeroMediaReady = true;
  } catch (e) {
    if (state.heroBg) renderHomeHeroMediaRecord({ src: state.heroBg, type: 'image' });
    else resetHomeHeroMediaElements();
    homeHeroMediaReady = true;
  } finally {
    homeHeroMediaLoading = false;
  }
}

function normalizeHomeCardSettings(raw) {
  raw = raw || {};
  return {
    height: Math.max(60, Math.min(96, Math.round(Number(raw.height) || 84))),
    opacity: Math.max(0, Math.min(100, Math.round(raw.opacity == null ? 54 : Number(raw.opacity) || 0))),
    showCalendar: raw.showCalendar !== false,
    heroBg: String(raw.heroBg || ''),
    heroMediaType: raw.heroMediaType === 'video' ? 'video' : (raw.heroMediaType === 'image' ? 'image' : ''),
    heroMediaName: String(raw.heroMediaName || '')
  };
}

function readHomeCardSettings() {
  if (homeCardSettingsState) return homeCardSettingsState;
  try {
    homeCardSettingsState = normalizeHomeCardSettings(JSON.parse(localStorage.getItem(HOME_CARD_SETTINGS_KEY) || '{}'));
  } catch (e) {
    homeCardSettingsState = normalizeHomeCardSettings(null);
  }
  return homeCardSettingsState;
}

function saveHomeCardSettings() {
  try { localStorage.setItem(HOME_CARD_SETTINGS_KEY, JSON.stringify(readHomeCardSettings())); } catch (e) {}
}

function applyHomeCardSettings() {
  var state = readHomeCardSettings();
  var root = document.documentElement;
  var empty = document.getElementById('empty-home');
  var hero = document.querySelector('.home-hero');
  var calendar = document.getElementById('home-calendar-card');
  var height = Math.max(60, Math.min(96, state.height || 84));
  var bottom = Math.max(18, Math.round(58 + (84 - height) * 4.2));
  root.style.setProperty('--home-custom-bottom', bottom + 'px');
  root.classList.toggle('home-height-compact', height <= 70);
  var transparency = Math.max(0, Math.min(100, state.opacity == null ? 54 : state.opacity));
  root.style.setProperty('--home-panel-alpha', ((100 - transparency) / 100).toFixed(2));
  root.style.setProperty('--home-hero-media-opacity', ((100 - transparency) / 100).toFixed(2));
  root.classList.toggle('home-panel-transparent', transparency >= 100);
  var heroVideo = document.getElementById('home-hero-media-video');
  if (heroVideo && heroVideo.getAttribute('src')) {
    if (transparency >= 100) heroVideo.pause();
    else heroVideo.play().catch(function(){});
  }
  if (empty) empty.classList.toggle('home-calendar-hidden', !state.showCalendar);
  if (calendar) calendar.classList.toggle('home-card-hidden', !state.showCalendar);
  if (hero && !homeHeroMediaReady && !homeHeroMediaLoading) applyHomeHeroMedia();
  syncHomeSettingsControls();
}

function syncHomeSettingsControls() {
  var state = readHomeCardSettings();
  var heightEl = document.getElementById('home-height-range');
  var heightValue = document.getElementById('home-height-value');
  var opacityEl = document.getElementById('home-opacity-range');
  var opacityValue = document.getElementById('home-opacity-value');
  var calendarEl = document.getElementById('home-calendar-visible');
  if (heightEl && document.activeElement !== heightEl) heightEl.value = String(state.height);
  if (heightValue) heightValue.textContent = state.height + '%';
  if (opacityEl && document.activeElement !== opacityEl) opacityEl.value = String(state.opacity);
  if (opacityValue) opacityValue.textContent = state.opacity + '%';
  if (calendarEl) calendarEl.checked = !!state.showCalendar;
}

function normalizeHomeCardLayout(raw) {
  var order = raw && Array.isArray(raw.order) ? raw.order.filter(function(id){ return HOME_CARD_DEFAULT_ORDER.indexOf(id) >= 0; }) : [];
  HOME_CARD_DEFAULT_ORDER.forEach(function(id){ if (order.indexOf(id) < 0) order.push(id); });
  var hiddenIds = HOME_CARD_DEFAULT_ORDER.concat(['weather']);
  var hidden = raw && Array.isArray(raw.hidden) ? raw.hidden.filter(function(id){ return hiddenIds.indexOf(id) >= 0; }) : [];
  var heroSide = 'left';
  return { order: order.slice(0, HOME_CARD_DEFAULT_ORDER.length), hidden: Array.from(new Set(hidden)), heroSide: heroSide };
}

function readHomeCardLayout() {
  if (homeCardLayoutState) return homeCardLayoutState;
  try {
    homeCardLayoutState = normalizeHomeCardLayout(JSON.parse(localStorage.getItem(HOME_CARD_LAYOUT_KEY) || '{}'));
  } catch (e) {
    homeCardLayoutState = normalizeHomeCardLayout(null);
  }
  return homeCardLayoutState;
}

function saveHomeCardLayout() {
  try { localStorage.setItem(HOME_CARD_LAYOUT_KEY, JSON.stringify(readHomeCardLayout())); } catch (e) {}
}

function applyHomeCardLayout() {
  var grid = document.getElementById('home-card-grid');
  if (!grid) return;
  var state = readHomeCardLayout();
  if (state.heroSide !== 'left') {
    state.heroSide = 'left';
    saveHomeCardLayout();
  }
  var hero = document.querySelector('.home-hero[data-home-card="weather"]');
  var shell = document.querySelector('.empty-home-shell');
  var cards = {};
  Array.prototype.forEach.call(grid.querySelectorAll('.home-card[data-home-card]'), function(card){
    cards[card.getAttribute('data-home-card')] = card;
    card.style.left = '';
    card.style.top = '';
    card.style.width = '';
    card.style.height = '';
    card.style.position = '';
  });
  state.order.forEach(function(id){
    if (cards[id]) grid.appendChild(cards[id]);
  });
  Object.keys(cards).forEach(function(id){
    cards[id].classList.toggle('home-card-hidden', state.hidden.indexOf(id) >= 0);
  });
  if (hero) hero.classList.toggle('home-card-hidden', state.hidden.indexOf('weather') >= 0);
  if (shell) shell.classList.toggle('home-hero-hidden', state.hidden.indexOf('weather') >= 0);
  if (shell) shell.classList.remove('home-hero-right');
  var restore = document.getElementById('home-card-restore-btn');
  if (restore) {
    var changedOrder = state.order.join('|') !== HOME_CARD_DEFAULT_ORDER.join('|');
    var changed = changedOrder || state.hidden.length > 0;
    restore.classList.toggle('show', changed);
    restore.textContent = state.hidden.length ? ('恢复模块 · ' + state.hidden.length) : '恢复布局';
  }
  renderHomeRestoreMenu();
  applyHomeCardSettings();
}

function closeHomeRestoreMenu() {
  var pop = document.getElementById('home-restore-pop');
  if (pop) pop.classList.remove('show');
}

function hideHomeCardById(id) {
  if (!id) return;
  var state = readHomeCardLayout();
  if (state.hidden.indexOf(id) < 0) state.hidden.push(id);
  saveHomeCardLayout();
  applyHomeCardLayout();
  closeHomeCardMenu();
  showToast('模块已删除，可在恢复模块里找回');
}

function restoreHomeCard(id) {
  if (!id) return;
  var state = readHomeCardLayout();
  state.hidden = (state.hidden || []).filter(function(item){ return item !== id; });
  if (state.order.indexOf(id) < 0) state.order.push(id);
  saveHomeCardLayout();
  applyHomeCardLayout();
  showToast('已恢复：' + homeCardLabel(id));
}

function restoreHomeCards() {
  homeCardLayoutState = { order: HOME_CARD_DEFAULT_ORDER.slice(), hidden: [], heroSide: 'left' };
  saveHomeCardLayout();
  applyHomeCardLayout();
  closeHomeRestoreMenu();
  showToast('Home 模块已恢复');
}

function renderHomeRestoreMenu() {
  var pop = document.getElementById('home-restore-pop');
  if (!pop) return;
  var state = readHomeCardLayout();
  var hiddenIds = HOME_CARD_DEFAULT_ORDER.concat(['weather']);
  var hidden = (state.hidden || []).filter(function(id){ return hiddenIds.indexOf(id) >= 0; });
  var html = '<div class="home-restore-title">可恢复模块</div>';
  if (hidden.length) {
    html += hidden.map(function(id){
      return '<button type="button" data-home-restore-id="' + escHtml(id) + '">' + escHtml(homeCardLabel(id)) + '</button>';
    }).join('');
  } else {
    html += '<div class="home-restore-empty">没有被删除的模块</div>';
  }
  html += '<button type="button" data-home-restore-all="1">全部恢复</button>';
  pop.innerHTML = html;
}

function toggleHomeRestoreMenu(e) {
  if (e) {
    e.preventDefault();
    e.stopPropagation();
  }
  closeHomeCardMenu();
  closeHomeSettingsMenu();
  renderHomeRestoreMenu();
  var pop = document.getElementById('home-restore-pop');
  var btn = document.getElementById('home-card-restore-btn');
  if (!pop || !btn) return;
  if (pop.classList.contains('show')) {
    closeHomeRestoreMenu();
    return;
  }
  pop.classList.add('show');
}

function closeHomeSettingsMenu() {
  var pop = document.getElementById('home-settings-pop');
  if (pop) pop.classList.remove('show');
}

function toggleHomeSettingsMenu(e) {
  if (e) {
    e.preventDefault();
    e.stopPropagation();
  }
  closeHomeCardMenu();
  closeHomeRestoreMenu();
  syncHomeSettingsControls();
  var pop = document.getElementById('home-settings-pop');
  if (!pop) return;
  pop.classList.toggle('show');
}

function homePlaceholderInsertBefore(grid, x, y, placeholder) {
  var items = Array.prototype.filter.call(grid.children, function(node){
    return node !== placeholder && !node.classList.contains('home-card-hidden') && (node.classList.contains('home-card') || node.classList.contains('home-card-placeholder'));
  }).map(function(node){
    var rect = node.getBoundingClientRect();
    return { node: node, rect: rect };
  }).sort(function(a, b){
    return Math.abs(a.rect.top - b.rect.top) > 8 ? a.rect.top - b.rect.top : a.rect.left - b.rect.left;
  });
  if (!items.length) return null;
  var rows = [];
  items.forEach(function(item){
    var row = rows[rows.length - 1];
    if (!row || Math.abs(row.top - item.rect.top) > 8) {
      row = { top: item.rect.top, bottom: item.rect.bottom, items: [] };
      rows.push(row);
    }
    row.bottom = Math.max(row.bottom, item.rect.bottom);
    row.items.push(item);
  });
  for (var r = 0; r < rows.length; r++) {
    var row = rows[r];
    if (y <= row.bottom) {
      for (var i = 0; i < row.items.length; i++) {
        var item = row.items[i];
        if (x < item.rect.left + item.rect.width / 2) return item.node;
      }
      return rows[r + 1] && rows[r + 1].items[0] ? rows[r + 1].items[0].node : null;
    }
  }
  return null;
}

function clearHomeDragTargets(grid) {
  Array.prototype.forEach.call((grid || document).querySelectorAll('.home-card-drag-target'), function(card){
    card.classList.remove('home-card-drag-target');
  });
}

function homeVisibleCards(grid) {
  return Array.prototype.filter.call(grid.querySelectorAll('.home-card[data-home-card]:not(.home-card-hidden)'), function(card){ return !!card; });
}

function animateHomeCardFlip(grid, mutator, dragged) {
  var cards = homeVisibleCards(grid);
  var first = new Map();
  cards.forEach(function(card){ first.set(card, card.getBoundingClientRect()); });
  mutator();
  var nextCards = homeVisibleCards(grid);
  nextCards.forEach(function(card){
    if (card === dragged) return;
    var from = first.get(card);
    if (!from) return;
    var to = card.getBoundingClientRect();
    var dx = from.left - to.left;
    var dy = from.top - to.top;
    if (Math.abs(dx) < .5 && Math.abs(dy) < .5) return;
    card.style.transition = 'none';
    card.style.transform = 'translate3d(' + dx + 'px,' + dy + 'px,0)';
    card.getBoundingClientRect();
    requestAnimationFrame(function(){
      card.style.transition = 'transform .28s cubic-bezier(.22,1,.36,1), border-color .22s, background .22s, box-shadow .22s';
      card.style.transform = '';
      window.setTimeout(function(){
        card.style.transition = '';
      }, 320);
    });
  });
}

function fallbackHomeTiles() {
  return [
    { kind: 'login', title: '登录同步歌单', sub: '网易云 / QQ 音乐' },
    { kind: 'search', title: '搜索一首歌', sub: '原唱优先', query: '' },
    { kind: 'local', title: '导入本地音乐', sub: '本地文件也能可视化' },
    { kind: 'podcastSearch', title: '搜索播客', sub: '长内容 / 电台' },
    { kind: 'guide', title: '看看视觉舞台', sub: '粒子 / 歌词 / 封面' },
  ];
}

function homeTileCover(item) {
  if (!item) return '';
  if (item.kind === 'song' || item.kind === 'weatherSong') return songCoverSrc(item.song, 220);
  return item.cover ? coverUrlWithSize(item.cover, 220) : '';
}

function homeToneForItem(item, index) {
  if (!item) return 'daily';
  if (item.kind === 'weatherSong') return 'daily';
  if (item.kind === 'recent') return 'search';
  if (item.kind === 'recentEmpty') return 'local';
  if (item.kind === 'profile') return 'local';
  if (item.tone) return item.tone;
  if (item.kind === 'song') return index % 2 ? 'search' : 'daily';
  if (item.kind === 'playlist') return 'playlist';
  if (item.kind === 'podcast' || item.kind === 'podcastSearch') return 'podcast';
  if (item.kind === 'local') return 'local';
  if (item.kind === 'guide') return 'guide';
  if (item.kind === 'login') return 'library';
  if (item.kind === 'search') return 'search';
  return ['daily', 'playlist', 'local', 'guide', 'search'][index % 5];
}

function renderHomeMosaic(items) {
  var cells = document.querySelectorAll('#home-mosaic .home-mosaic-cell');
  if (!cells.length) return;
  var covers = [];
  (items || []).forEach(function(item){
    var cover = homeTileCover(item);
    if (cover) covers.push(cover);
  });
  for (var i = 0; i < cells.length; i++) {
    var src = covers[i] || covers[(i + 1) % Math.max(1, covers.length)] || '';
    cells[i].style.backgroundImage = src ? 'url("' + cssImageUrl(src) + '")' : '';
    cells[i].classList.toggle('has-cover', !!src);
    cells[i].classList.toggle('home-skeleton', !src && homeDiscoverState.loading);
  }
}

function renderHomeTiles() {
  var row = document.getElementById('home-tile-row');
  var title = document.getElementById('home-rail-title');
  if (!row) return;
  var history = Array.isArray(listenStatsState.history) ? listenStatsState.history.slice(0, 5) : [];
  var tiles = history.map(function(record){
    return {
      kind: 'recent',
      title: record.name || '继续听',
      sub: record.artist || record.source || '最近播放',
      cover: record.cover,
      record: record,
    };
  });
  if (!tiles.length) {
    tiles = [{ kind: 'recentEmpty', title: '暂无最近播放', sub: '播放一首歌后会出现在这里', cover: '' }];
  }
  if (title) title.textContent = '最近播放';
  row.innerHTML = tiles.map(function(item, i){
    var cover = homeTileCover(item);
    var tone = homeToneForItem(item, i);
    var coverClass = 'home-tile-cover' + (cover ? ' has-cover' : '');
    return '<button class="home-tile' + (!cover && homeDiscoverState.loading ? ' home-skeleton' : '') + '" data-home-tone="' + escHtml(tone) + '" type="button" onclick="handleHomeTileClick(' + i + ')">' +
      '<div class="' + coverClass + '" style="' + (cover ? 'background-image:url(&quot;' + escHtml(cssImageUrl(cover)) + '&quot;)' : '') + '"></div>' +
      '<div class="home-tile-title">' + escHtml(item.title || '') + '</div>' +
      '<div class="home-tile-sub">' + escHtml(item.sub || '') + '</div>' +
    '</button>';
  }).join('');
  row._homeTiles = tiles;
  renderHomeMosaic(tiles);
}

function renderHomeDiscover() {
  initHomeCardCustomization();
  bindHomeSleepControls();
  updateHomeClockAndSleep();
  var sub = document.getElementById('home-subtitle');
  var loggedOutHome = !homeDiscoverState.loggedIn && !hasAnyPlatformLogin();
  var weather = homeWeatherRadioState.weather;
  var radio = homeWeatherRadioState.radio;
  var weatherLocation = weather && weather.location && weather.location.name || homeWeatherRadioState.city || '上海';
  var weatherTitle = document.getElementById('home-weather-title');
  var weatherKicker = document.getElementById('home-weather-kicker');
  var weatherMeta = document.getElementById('home-weather-meta');
  var mood = weather && weather.mood || radio && { title: radio.title, tagline: radio.subtitle } || null;
  var weatherLoadingVisible = homeWeatherRadioState.loading && !homeWeatherSilentPrewarmActive;
  if (weatherTitle) weatherTitle.textContent = mood && mood.title ? mood.title : '今日天气提示';
  if (weatherKicker) weatherKicker.textContent = weatherLocation ? ('Weather Pulse · ' + weatherLocation) : 'Weather Pulse';
  if (sub) {
    if (weatherLoadingVisible) sub.textContent = '正在读取天气，顺便给这个时段找一组合适的歌。';
    else if (weather && mood && mood.tagline) sub.textContent = mood.tagline + '。天气电台会按当前气温、雨雪、湿度和时间挑歌。';
    else if (homeWeatherRadioState.error) sub.textContent = '天气服务暂时没接上，先保留本地 Home 和搜索入口。';
    else sub.textContent = loggedOutHome ? '登录后也会把你的歌单、常听歌手和最近播放放在右侧。' : '天气、电台和你的最近播放会一起汇总在这里。';
  }
  if (weatherMeta) {
    var meta = [];
    if (weather) {
      meta.push(weatherLocation);
      meta.push(weather.label + ' · ' + Math.round(weather.temperature || 0) + '°');
      meta.push('体感 ' + Math.round(weather.apparentTemperature || weather.temperature || 0) + '°');
      if (isFinite(weather.humidity)) meta.push('湿度 ' + Math.round(weather.humidity) + '%');
      if (isFinite(weather.windSpeed)) meta.push('风速 ' + Math.round(weather.windSpeed) + 'km/h');
    } else {
      meta.push(weatherLocation);
      if (homeWeatherRadioState.error) meta.push('天气暂不可用');
      else if (weatherLoadingVisible) meta.push('正在整理天气');
    }
    weatherMeta.innerHTML = meta.map(function(text){ return '<span class="home-weather-pill">' + escHtml(text) + '</span>'; }).join('');
  }
  updateHomeNowCover();
  var daily = homeDiscoverState.songs[0] || null;
  var cardSongB = homeDiscoverState.songs[1] || null;
  var cardSongC = homeDiscoverState.songs[2] || null;
  var playlistItem = homeDiscoverState.playlists[0] || null;
  var podcastItem = homeDiscoverState.podcasts[0] || null;
  var summary = homeListenSummary();
  var weatherCardTitle = document.getElementById('home-weather-card-title');
  var weatherCardSub = document.getElementById('home-weather-card-sub');
  var dailyTitle = document.getElementById('home-daily-title');
  var dailySub = document.getElementById('home-daily-sub');
  var privateTitle = document.getElementById('home-private-title');
  var privateSub = document.getElementById('home-private-sub');
  var continueTitle = document.getElementById('home-continue-title');
  var continueSub = document.getElementById('home-continue-sub');
  var profileTitle = document.getElementById('home-profile-title');
  var profileSub = document.getElementById('home-profile-sub');
  var libTitle = document.getElementById('home-library-title');
  var libSub = document.getElementById('home-library-sub');
  if (weatherCardTitle) weatherCardTitle.textContent = '我的歌单';
  if (weatherCardSub) {
    weatherCardSub.textContent = playlistItem ? (((playlistItem.trackCount || 0) ? playlistItem.trackCount + ' 首 · ' : '') + (playlistItem.creator || '打开左侧歌单库')) : '打开左侧歌单库';
  }
  if (continueTitle) continueTitle.textContent = summary.recent ? summary.recent.name : '继续听';
  if (continueSub) continueSub.textContent = summary.recent ? (summary.recent.artist || summary.recent.source || '最近播放') : '最近播放会出现在这里';
  if (profileTitle) profileTitle.textContent = '听歌画像';
  if (profileSub) profileSub.textContent = summary.topArtist ? ('常听 ' + summary.topArtist.name + ' · ' + summary.topArtist.plays + ' 次') : (summary.totalPlays ? summary.totalPlays + ' 次有效播放' : '播放几首后生成偏好');
  if (loggedOutHome) {
    if (dailyTitle) dailyTitle.textContent = '每日推荐';
    if (dailySub) dailySub.textContent = '登录后同步你的今日歌曲';
    if (privateTitle) privateTitle.textContent = '私人电台';
    if (privateSub) privateSub.textContent = '登录后同步更多歌曲';
    if (libTitle) libTitle.textContent = '常听歌手';
    if (libSub) libSub.textContent = '播放后会继续补全推荐';
    setHomeArt('home-weather-art', '', 280);
    setHomeArt('home-daily-art', '', 280);
    setHomeArt('home-private-art', '', 280);
    setHomeArt('home-continue-art', summary.recent && summary.recent.cover, 280);
    setHomeArt('home-profile-art', summary.topSong && summary.topSong.cover || summary.recent && summary.recent.cover, 280);
    setHomeArt('home-library-art', '', 280);
  } else {
    if (dailyTitle) dailyTitle.textContent = '每日推荐';
    if (dailySub) dailySub.textContent = daily ? ((daily.name || '今日歌曲') + ' · ' + (daily.artist || songSourceLabel(daily) || '点击播放')) : '同步你的今日歌曲';
    if (privateTitle) privateTitle.textContent = '私人电台';
    if (privateSub) privateSub.textContent = cardSongB ? ((cardSongB.name || '推荐歌曲') + ' · ' + (cardSongB.artist || songSourceLabel(cardSongB) || '点击播放')) : (homeDiscoverState.songs.length + ' 首 · 根据今日推荐与常听偏好');
    if (libTitle) libTitle.textContent = '常听歌手';
    if (libSub) libSub.textContent = cardSongC ? ((cardSongC.name || '推荐歌曲') + ' · ' + (cardSongC.artist || songSourceLabel(cardSongC) || '点击播放')) : (summary.topArtist ? (summary.topArtist.name + ' · ' + summary.topArtist.plays + ' 次') : '播放几首后生成你的偏好');
    setHomeArt('home-weather-art', (userPlaylists[0] && userPlaylists[0].cover) || (playlistItem && playlistItem.cover) || daily && daily.cover, 280);
    setHomeArt('home-daily-art', daily && daily.cover, 280);
    setHomeArt('home-private-art', cardSongB && cardSongB.cover || daily && daily.cover || summary.recent && summary.recent.cover || playlistItem && playlistItem.cover, 280);
    setHomeArt('home-continue-art', summary.recent && summary.recent.cover || playlistItem && playlistItem.cover, 280);
    setHomeArt('home-profile-art', summary.topSong && summary.topSong.cover || podcastItem && podcastItem.cover, 280);
    setHomeArt('home-library-art', cardSongC && cardSongC.cover || summary.topSong && summary.topSong.cover || summary.recent && summary.recent.cover || podcastItem && podcastItem.cover, 280);
  }
  renderHomeTiles();
}
