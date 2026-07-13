'use strict';

// Mineradio classic module: discovery/home-data.
function isTypingTarget(target) {
  if (!target) return false;
  var tag = String(target.tagName || '').toUpperCase();
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true;
  return !!(target.isContentEditable || (target.closest && target.closest('[contenteditable="true"]')));
}

function cssImageUrl(url) {
  return String(url || '').replace(/\\/g, '\\\\').replace(/"/g, '%22');
}

function placeFloatingPanel(panel, x, y) {
  if (!panel) return;
  var home = document.getElementById('empty-home');
  var hostRect = home ? home.getBoundingClientRect() : { left: 0, top: 0, width: window.innerWidth, height: window.innerHeight };
  panel.style.left = '0px';
  panel.style.top = '0px';
  panel.classList.add('show');
  var rect = panel.getBoundingClientRect();
  var localX = x - hostRect.left;
  var localY = y - hostRect.top;
  var left = Math.min(Math.max(12, localX), Math.max(12, hostRect.width - rect.width - 12));
  var top = Math.min(Math.max(12, localY), Math.max(12, hostRect.height - rect.height - 12));
  panel.style.left = left + 'px';
  panel.style.top = top + 'px';
}

function readHomeSleepTimerState() {
  try {
    var raw = localStorage.getItem(HOME_SLEEP_TIMER_KEY);
    if (!raw) return { active:false, endsAt:0, waitCurrent:false, pendingAfterSong:false, minutes:30 };
    var data = JSON.parse(raw);
    return {
      active: !!data.active,
      endsAt: Number(data.endsAt) || 0,
      waitCurrent: !!data.waitCurrent,
      pendingAfterSong: !!data.pendingAfterSong,
      minutes: Math.max(1, Math.min(720, Number(data.minutes) || 30))
    };
  } catch (e) {
    return { active:false, endsAt:0, waitCurrent:false, pendingAfterSong:false, minutes:30 };
  }
}

function saveHomeSleepTimerState() {
  try { localStorage.setItem(HOME_SLEEP_TIMER_KEY, JSON.stringify(homeSleepState)); } catch (e) {}
}

function formatHomeSleepCountdown(ms) {
  var total = Math.max(0, Math.ceil(ms / 1000));
  var h = Math.floor(total / 3600);
  var m = Math.floor((total % 3600) / 60);
  var s = total % 60;
  return h > 0 ? (h + ':' + padHomeTime(m) + ':' + padHomeTime(s)) : (padHomeTime(m) + ':' + padHomeTime(s));
}

function shouldHomeSleepWaitForCurrentSong() {
  return !!(homeSleepState && homeSleepState.waitCurrent && audio && currentIdx >= 0 && isFinite(audio.duration) && audio.duration > 0 && audio.currentTime < audio.duration - 1.2);
}

function updateHomeClockAndSleep() {
  var now = new Date();
  var dateEl = document.getElementById('home-calendar-date');
  var yearEl = document.getElementById('home-calendar-year');
  var weekdayEl = document.getElementById('home-calendar-weekday');
  var timeEl = document.getElementById('home-calendar-time');
  var statusEl = document.getElementById('home-sleep-status');
  var iconEl = document.getElementById('home-sleep-icon');
  var countdownEl = document.getElementById('home-sleep-countdown');
  var enabledEl = document.getElementById('home-sleep-enabled');
  var inputEl = document.getElementById('home-sleep-minutes');
  var waitEl = document.getElementById('home-sleep-after-song');
  function setCountdownText(text, pending) {
    if (!countdownEl) return;
    countdownEl.textContent = text || '';
    countdownEl.classList.toggle('show', !!text);
    countdownEl.classList.toggle('pending', !!pending);
  }
  if (yearEl) yearEl.textContent = String(now.getFullYear());
  if (weekdayEl) weekdayEl.textContent = now.toLocaleDateString('en-US', { weekday:'short' }).toUpperCase();
  if (dateEl) dateEl.textContent = padHomeTime(now.getMonth() + 1) + '/' + padHomeTime(now.getDate());
  if (timeEl) timeEl.textContent = padHomeTime(now.getHours()) + ':' + padHomeTime(now.getMinutes());
  if (inputEl && document.activeElement !== inputEl) inputEl.value = String(homeSleepState.minutes || 30);
  if (enabledEl) enabledEl.checked = !!homeSleepState.active || !!homeSleepState.pendingAfterSong;
  if (waitEl && document.activeElement !== waitEl) waitEl.checked = !!homeSleepState.waitCurrent;
  if (iconEl) iconEl.classList.toggle('active', !!homeSleepState.active || !!homeSleepState.pendingAfterSong);
  if (statusEl) statusEl.classList.toggle('active', !!homeSleepState.active || !!homeSleepState.pendingAfterSong);
  if (homeSleepState.pendingAfterSong) {
    if (statusEl) statusEl.textContent = '等待本首歌播完后关闭';
    setCountdownText('播完后关闭', true);
    return;
  }
  if (!homeSleepState.active) {
    if (statusEl) statusEl.textContent = '定时关闭未开启';
    setCountdownText('', false);
    return;
  }
  var left = homeSleepState.endsAt - Date.now();
  if (left <= 0) {
    if (shouldHomeSleepWaitForCurrentSong()) {
      homeSleepState.active = false;
      homeSleepState.pendingAfterSong = true;
      saveHomeSleepTimerState();
      if (statusEl) statusEl.textContent = '等待本首歌播完后关闭';
      setCountdownText('播完后关闭', true);
      showToast('倒计时结束，本首歌播完后关闭');
      return;
    }
    performHomeSleepClose('timer');
    return;
  }
  var countdownText = formatHomeSleepCountdown(left);
  if (statusEl) statusEl.textContent = '将在 ' + countdownText + ' 后关闭';
  setCountdownText('剩余 ' + countdownText, false);
}

function ensureHomeClockTimer() {
  if (homeClockTimer) return;
  updateHomeClockAndSleep();
  homeClockTimer = setInterval(updateHomeClockAndSleep, 1000);
}

function startHomeSleepTimer() {
  var inputEl = document.getElementById('home-sleep-minutes');
  var waitEl = document.getElementById('home-sleep-after-song');
  var minutes = inputEl ? Number(inputEl.value) : 30;
  minutes = Math.max(1, Math.min(720, Math.round(minutes || 30)));
  homeSleepState = {
    active: true,
    endsAt: Date.now() + minutes * 60000,
    waitCurrent: !!(waitEl && waitEl.checked),
    pendingAfterSong: false,
    minutes: minutes
  };
  saveHomeSleepTimerState();
  updateHomeClockAndSleep();
  showToast('已开启定时关闭: ' + minutes + ' 分钟');
}

function cancelHomeSleepTimer(show) {
  homeSleepState.active = false;
  homeSleepState.endsAt = 0;
  homeSleepState.pendingAfterSong = false;
  saveHomeSleepTimerState();
  updateHomeClockAndSleep();
  if (show) showToast('已取消定时关闭');
}

function setHomeSleepEnabled(enabled, show) {
  if (enabled) startHomeSleepTimer();
  else cancelHomeSleepTimer(show);
}

function toggleHomeSleepPopover(e) {
  if (e && e.stopPropagation) e.stopPropagation();
  var pop = document.getElementById('home-sleep-popover');
  if (!pop) return;
  pop.classList.toggle('show');
}

function closeHomeSleepPopover() {
  var pop = document.getElementById('home-sleep-popover');
  if (pop) pop.classList.remove('show');
}

function performHomeSleepClose(reason) {
  homeSleepState.active = false;
  homeSleepState.pendingAfterSong = false;
  homeSleepState.endsAt = 0;
  saveHomeSleepTimerState();
  updateHomeClockAndSleep();
  showToast(reason === 'after-song' ? '本首歌已播完，正在关闭' : '定时关闭时间到');
  var api = window.desktopWindow;
  if (api && api.isDesktop && typeof api.close === 'function') {
    api.close();
    return true;
  }
  try { window.close(); return true; } catch (e) {}
  return false;
}

function bindHomeSleepControls() {
  ensureHomeClockTimer();
  var enabledEl = document.getElementById('home-sleep-enabled');
  var inputEl = document.getElementById('home-sleep-minutes');
  var waitEl = document.getElementById('home-sleep-after-song');
  if (enabledEl && !enabledEl._mineradioSleepBound) {
    enabledEl._mineradioSleepBound = true;
    enabledEl.addEventListener('change', function(e){
      if (e && e.stopPropagation) e.stopPropagation();
      setHomeSleepEnabled(!!enabledEl.checked, true);
    });
  }
  if (inputEl && !inputEl._mineradioSleepBound) {
    inputEl._mineradioSleepBound = true;
    inputEl.addEventListener('change', function(){
      var minutes = Math.max(1, Math.min(720, Math.round(Number(inputEl.value) || 30)));
      inputEl.value = String(minutes);
      homeSleepState.minutes = minutes;
      if (homeSleepState.active) homeSleepState.endsAt = Date.now() + minutes * 60000;
      saveHomeSleepTimerState();
      updateHomeClockAndSleep();
    });
  }
  if (waitEl && !waitEl._mineradioSleepBound) {
    waitEl._mineradioSleepBound = true;
    waitEl.addEventListener('change', function(e){
      if (e && e.stopPropagation) e.stopPropagation();
      homeSleepState.waitCurrent = !!waitEl.checked;
      saveHomeSleepTimerState();
      updateHomeClockAndSleep();
    });
  }
  var pop = document.getElementById('home-sleep-popover');
  if (pop && !pop._mineradioSleepBound) {
    pop._mineradioSleepBound = true;
    pop.addEventListener('pointerdown', function(e){ e.stopPropagation(); });
    pop.addEventListener('click', function(e){ e.stopPropagation(); });
  }
  if (!document._mineradioHomeSleepCloseBound) {
    document._mineradioHomeSleepCloseBound = true;
    document.addEventListener('click', function(e){
      var target = e && e.target;
      if (target && target.closest && target.closest('.home-sleep-trigger-wrap')) return;
      closeHomeSleepPopover();
    });
    document.addEventListener('keydown', function(e){
      if (e.key === 'Escape') closeHomeSleepPopover();
    });
  }
}

function loadListenStatsState() {
  try {
    var raw = localStorage.getItem(HOME_LISTEN_STATS_KEY);
    if (!raw) return { history: [], songs: {}, artists: {}, updatedAt: 0 };
    var data = JSON.parse(raw);
    return {
      history: Array.isArray(data.history) ? data.history.slice(0, 180) : [],
      songs: data.songs && typeof data.songs === 'object' ? data.songs : {},
      artists: data.artists && typeof data.artists === 'object' ? data.artists : {},
      updatedAt: Number(data.updatedAt) || 0,
    };
  } catch (e) {
    return { history: [], songs: {}, artists: {}, updatedAt: 0 };
  }
}

function saveListenStatsState() {
  try {
    listenStatsState.updatedAt = Date.now();
    localStorage.setItem(HOME_LISTEN_STATS_KEY, JSON.stringify(listenStatsState));
  } catch (e) {}
}

function listenSongSnapshot(song) {
  song = song || {};
  return {
    key: queueItemKey(song),
    id: song.id || '',
    mid: song.mid || song.songmid || '',
    mediaMid: song.mediaMid || song.media_mid || '',
    type: song.type || 'song',
    sourceKey: song.source || song.provider || '',
    name: song.name || song.title || '未知歌曲',
    artist: song.artist || '',
    cover: songCoverSrc(song, 220) || song.cover || '',
    source: songSourceLabel(song),
    provider: song.provider || song.source || song.type || '',
    duration: Number(song.duration) || 0,
  };
}

function beginListenSession(song, context) {
  if (!song) return;
  var snap = listenSongSnapshot(song);
  if (!snap.key) return;
  if (listenSession && listenSession.key !== snap.key) finalizeListenSession(false);
  listenSession = {
    key: snap.key,
    song: snap,
    context: context || activeRadioContext || null,
    startedAt: Date.now(),
    lastWallAt: Date.now(),
    lastAudioTime: audio && isFinite(audio.currentTime) ? audio.currentTime : 0,
    listenMs: 0,
    maxProgress: 0,
  };
}

function updateListenStatsTick(force) {
  if (!audio || !audio.duration || audio.paused) return;
  var song = currentCoverSong();
  if (!song) return;
  var key = queueItemKey(song);
  if (!listenSession || listenSession.key !== key) beginListenSession(song, activeRadioContext);
  if (!listenSession) return;
  var now = Date.now();
  var audioTime = isFinite(audio.currentTime) ? audio.currentTime : 0;
  var deltaByAudio = Math.max(0, audioTime - (listenSession.lastAudioTime || 0)) * 1000;
  var deltaByWall = Math.max(0, now - (listenSession.lastWallAt || now));
  var delta = deltaByAudio > 0 ? Math.min(deltaByAudio, deltaByWall || deltaByAudio, 4200) : 0;
  if (force && delta <= 0) delta = Math.min(deltaByWall, 1500);
  if (delta > 0 && delta < 8000) listenSession.listenMs += delta;
  listenSession.lastWallAt = now;
  listenSession.lastAudioTime = audioTime;
  listenSession.maxProgress = Math.max(listenSession.maxProgress || 0, audio.duration ? audioTime / audio.duration : 0);
}

function finalizeListenSession(completed) {
  if (!listenSession) return;
  updateListenStatsTick(true);
  var session = listenSession;
  listenSession = null;
  var effective = completed || session.listenMs >= 45000 || session.maxProgress >= 0.5 || (!audio || !audio.duration ? session.listenMs >= 30000 : false);
  if (!effective) return;
  var now = Date.now();
  var snap = session.song || {};
  var record = {
    key: session.key,
    id: snap.id || '',
    mid: snap.mid || '',
    mediaMid: snap.mediaMid || '',
    type: snap.type || 'song',
    sourceKey: snap.sourceKey || '',
    name: snap.name || '未知歌曲',
    artist: snap.artist || '',
    cover: snap.cover || '',
    source: snap.source || '',
    playedAt: now,
    listenMs: Math.round(session.listenMs),
    completed: !!completed,
    context: session.context || null,
  };
  listenStatsState.history = [record].concat((listenStatsState.history || []).filter(function(item){ return item && item.key !== record.key; })).slice(0, 180);
  var songStat = listenStatsState.songs[record.key] || { key: record.key, name: record.name, artist: record.artist, cover: record.cover, source: record.source, plays: 0, listenMs: 0, completed: 0, lastPlayedAt: 0 };
  songStat.name = record.name;
  songStat.artist = record.artist;
  songStat.cover = record.cover || songStat.cover || '';
  songStat.source = record.source || songStat.source || '';
  songStat.plays += 1;
  songStat.listenMs += record.listenMs;
  songStat.completed += completed ? 1 : 0;
  songStat.lastPlayedAt = now;
  listenStatsState.songs[record.key] = songStat;
  String(record.artist || '').split(/\s*\/\s*|\s*,\s*|、|&/).forEach(function(name){
    name = name.trim();
    if (!name) return;
    var artistStat = listenStatsState.artists[name] || { name: name, plays: 0, listenMs: 0, lastPlayedAt: 0 };
    artistStat.plays += 1;
    artistStat.listenMs += record.listenMs;
    artistStat.lastPlayedAt = now;
    listenStatsState.artists[name] = artistStat;
  });
  saveListenStatsState();
  if (emptyHomeActive) renderHomeDiscover();
}

function mostPlayedSong() {
  var list = Object.keys(listenStatsState.songs || {}).map(function(key){ return listenStatsState.songs[key]; });
  list.sort(function(a, b){ return (b.plays - a.plays) || (b.listenMs - a.listenMs) || (b.lastPlayedAt - a.lastPlayedAt); });
  return list[0] || null;
}

function topListenArtist() {
  var list = Object.keys(listenStatsState.artists || {}).map(function(key){ return listenStatsState.artists[key]; });
  list.sort(function(a, b){ return (b.plays - a.plays) || (b.listenMs - a.listenMs) || (b.lastPlayedAt - a.lastPlayedAt); });
  return list[0] || null;
}

async function loadHomeDiscover(force) {
  if (homeDiscoverState.loading) return;
  if (homeDiscoverState.loaded && !force) return;
  var token = ++homeDiscoverToken;
  homeDiscoverState.loading = true;
  homeDiscoverState.error = '';
  renderHomeDiscover();
  try {
    var data = await apiJson('/api/discover/home?t=' + Date.now());
    if (token !== homeDiscoverToken) return;
    homeDiscoverState.loggedIn = !!(data && data.loggedIn);
    homeDiscoverState.mode = data && data.mode || (homeDiscoverState.loggedIn ? 'member' : 'starter');
    homeDiscoverState.songs = homeDiscoverState.loggedIn ? (data && data.dailySongs || []).map(cloneSong) : [];
    homeDiscoverState.playlists = homeDiscoverState.loggedIn ? (data && data.playlists || []) : [];
    homeDiscoverState.podcasts = homeDiscoverState.loggedIn ? (data && data.podcasts || []) : [];
    homeDiscoverState.updatedAt = Number(data && data.updatedAt) || Date.now();
    homeDiscoverState.loaded = true;
  } catch (e) {
    console.warn('home discover failed:', e);
    if (token === homeDiscoverToken) homeDiscoverState.error = 'DISCOVER_FAILED';
  } finally {
    if (token === homeDiscoverToken) {
      homeDiscoverState.loading = false;
      renderHomeDiscover();
    }
  }
}

function homeWeatherRadioUrl(opts) {
  opts = opts || {};
  var params = [];
  if (opts.lat != null && opts.lon != null) {
    params.push('lat=' + encodeURIComponent(opts.lat));
    params.push('lon=' + encodeURIComponent(opts.lon));
    params.push('city=' + encodeURIComponent(opts.city || '当前位置'));
  } else {
    params.push('city=' + encodeURIComponent(opts.city || homeWeatherRadioState.city || '上海'));
  }
  params.push('timezone=' + encodeURIComponent(opts.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone || 'auto'));
  params.push('t=' + Date.now());
  return '/api/weather/radio?' + params.join('&');
}

async function loadHomeWeatherRadio(force, opts) {
  opts = opts || {};
  if (homeWeatherRadioState.loading && homeWeatherLoadPromise && opts.lat == null && opts.lon == null && !opts.city) {
    return homeWeatherLoadPromise;
  }
  if (homeWeatherRadioState.loading && !force) return homeWeatherRadioState;
  if (homeWeatherRadioState.loaded && !force && !opts.lat) return homeWeatherRadioState;
  var token = ++homeWeatherToken;
  homeWeatherRadioState.loading = true;
  homeWeatherRadioState.error = '';
  homeWeatherSilentPrewarmActive = !!opts.silentPrewarm;
  renderHomeDiscover();
  var loadPromise = (async function(){
    try {
      var data = await apiJson(homeWeatherRadioUrl(opts), { timeoutMs: 14000 });
      if (token !== homeWeatherToken) return homeWeatherRadioState;
      homeWeatherRadioState.weather = data && data.weather || null;
      homeWeatherRadioState.radio = data && data.radio || null;
      homeWeatherRadioState.loaded = true;
      homeWeatherRadioState.updatedAt = Date.now();
      if (homeWeatherRadioState.weather && homeWeatherRadioState.weather.location && homeWeatherRadioState.weather.location.name) {
        homeWeatherRadioState.city = homeWeatherRadioState.weather.location.name;
        localStorage.setItem(HOME_WEATHER_CITY_KEY, homeWeatherRadioState.city);
      } else if (opts.city) {
        homeWeatherRadioState.city = opts.city;
        localStorage.setItem(HOME_WEATHER_CITY_KEY, homeWeatherRadioState.city);
      }
    } catch (e) {
      console.warn('weather radio failed:', e);
      if (token === homeWeatherToken) homeWeatherRadioState.error = 'WEATHER_FAILED';
    } finally {
      if (token === homeWeatherToken) {
        homeWeatherRadioState.loading = false;
        homeWeatherSilentPrewarmActive = false;
        renderHomeDiscover();
      }
    }
    return homeWeatherRadioState;
  })();
  homeWeatherLoadPromise = loadPromise;
  try {
    return await loadPromise;
  } finally {
    if (homeWeatherLoadPromise === loadPromise) homeWeatherLoadPromise = null;
  }
}

function scheduleHomeWeatherLoad(delay, opts) {
  opts = opts || {};
  var forceLocate = !!opts.forceLocate;
  if (homeWeatherLoadTimer) {
    if (!forceLocate) return;
    clearTimeout(homeWeatherLoadTimer);
    homeWeatherLoadTimer = null;
  }
  homeWeatherLoadTimer = setTimeout(function(){
    homeWeatherLoadTimer = null;
    if (!emptyHomeActive) return;
    if (forceLocate) locateWeatherRadio({ silent: true, startup: true });
    else loadHomeWeatherRadio(false);
  }, delay || 760);
}

function prewarmHomeWeatherRadio() {
  if (homeWeatherPrewarmStarted) return;
  homeWeatherPrewarmStarted = true;
  locateWeatherRadio({ silent: true, startup: true, prewarm: true });
}

function weatherRadioContext() {
  var weather = homeWeatherRadioState.weather || {};
  var radio = homeWeatherRadioState.radio || {};
  return {
    type: 'weather-radio',
    provider: 'open-meteo',
    title: radio.title || '天气电台',
    location: weather.location && weather.location.name || homeWeatherRadioState.city || '',
    weather: weather.label || '',
    temperature: weather.temperature,
    mood: weather.mood && weather.mood.key || '',
  };
}

async function startWeatherRadio(opts) {
  opts = opts || {};
  if (weatherRadioStartBusy) return;
  weatherRadioStartBusy = true;
  try {
  if (!homeWeatherRadioState.loaded || !(homeWeatherRadioState.radio && homeWeatherRadioState.radio.songs && homeWeatherRadioState.radio.songs.length)) {
    showToast('正在生成天气电台');
    await loadHomeWeatherRadio(true);
  }
  var radio = homeWeatherRadioState.radio;
  if (!radio || !radio.songs || !radio.songs.length) {
    var seed = radio && radio.seedQueries && radio.seedQueries[0] || '雨天 R&B';
    showToast('天气队列暂时为空，先打开搜索');
    runHomeSearch(seed);
    return;
  }
  activeRadioContext = weatherRadioContext();
  playQueue = radio.songs.map(function(song){
    var cloned = cloneSong(song);
    cloned.radioContext = activeRadioContext;
    return cloned;
  });
  currentIdx = 0;
  homeForcedOpen = false;
  if (!opts.preserveHomeState) homeSuppressed = false;
  setHomeControlsLocked(false);
  safeRenderQueuePanel('weather-radio-start');
  safeShelfRebuild('weather-radio-start', true);
  forcePlaybackControlsInteractive();
  try {
    await playQueueAt(0, { context: activeRadioContext });
  } catch (e) {
    console.warn('[WeatherRadioStartPlay]', e);
    showToast('天气电台已载入，播放启动失败');
  }
  forcePlaybackControlsInteractive();
  showToast((radio.title || '天气电台') + ' · ' + playQueue.length + ' 首');
  } finally {
    weatherRadioStartBusy = false;
  }
}

function locateWeatherRadio(opts) {
  opts = opts || {};
  if (opts.startup && homeWeatherStartupLocateDone) return;
  if (opts.startup) homeWeatherStartupLocateDone = true;
  var silent = !!opts.silent;
  var prewarm = !!opts.prewarm;
  var previousWeatherCity = homeWeatherRadioState.city || '上海';
  homeWeatherToken++;
  homeWeatherRadioState.loading = true;
  homeWeatherRadioState.error = '';
  homeWeatherSilentPrewarmActive = prewarm;
  if (!prewarm) {
    homeWeatherRadioState.loaded = false;
    homeWeatherRadioState.weather = null;
    homeWeatherRadioState.radio = null;
    homeWeatherRadioState.city = '定位中';
  }
  renderHomeDiscover();
  var locationSettled = false;
  var ipFallbackStarted = false;
  var geoFallbackTimer = 0;
  function useBrowserLocation() {
    if (!navigator.geolocation) return Promise.reject(new Error('GEOLOCATION_UNAVAILABLE'));
    return new Promise(function(resolve, reject){
      navigator.geolocation.getCurrentPosition(resolve, reject, {
        enableHighAccuracy: true,
        timeout: 8000,
        maximumAge: 120000
      });
    });
  }
  function useCoordinates(pos) {
    if (locationSettled || !pos || !pos.coords) return;
    if (geoFallbackTimer) {
      clearTimeout(geoFallbackTimer);
      geoFallbackTimer = 0;
    }
    var lat = Number(pos.coords.latitude);
    var lon = Number(pos.coords.longitude);
    if (!isFinite(lat) || !isFinite(lon)) throw new Error('INVALID_GEOLOCATION');
    locationSettled = true;
    homeWeatherRadioState.city = '当前位置';
    renderHomeDiscover();
    if (!silent) showToast('已用系统定位更新天气');
    loadHomeWeatherRadio(true, {
      lat: lat,
      lon: lon,
      city: '当前位置',
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || '',
      silentPrewarm: prewarm,
    });
  }
  function useIpFallback() {
    if (locationSettled || ipFallbackStarted) return;
    ipFallbackStarted = true;
    if (geoFallbackTimer) {
      clearTimeout(geoFallbackTimer);
      geoFallbackTimer = 0;
    }
    apiJson('/api/weather/ip-location?t=' + Date.now()).then(function(data){
      var loc = data && data.location;
      if (!loc || !isFinite(Number(loc.latitude)) || !isFinite(Number(loc.longitude))) throw new Error(data && data.error || 'IP_LOCATION_FAILED');
      if (locationSettled) return;
      if (geoFallbackTimer) {
        clearTimeout(geoFallbackTimer);
        geoFallbackTimer = 0;
      }
      locationSettled = true;
      homeWeatherRadioState.city = loc.city || '当前位置';
      localStorage.setItem(HOME_WEATHER_CITY_KEY, homeWeatherRadioState.city);
      renderHomeDiscover();
      if (!silent) showToast('已用网络位置定位到 ' + (loc.city || '当前位置'));
      loadHomeWeatherRadio(true, {
        lat: loc.latitude,
        lon: loc.longitude,
        city: loc.city || '当前位置',
        timezone: loc.timezone || '',
        silentPrewarm: prewarm,
      });
    }).catch(function(e){
      console.warn('weather ip location failed:', e);
      if (locationSettled) return;
      homeWeatherRadioState.loading = false;
      homeWeatherSilentPrewarmActive = false;
      homeWeatherRadioState.error = 'LOCATION_FAILED';
      homeWeatherRadioState.city = previousWeatherCity;
      renderHomeDiscover();
      if (!silent) showToast('定位不可用，可以手动换城市');
    });
  }
  geoFallbackTimer = setTimeout(function(){
    if (!locationSettled) useIpFallback();
  }, prewarm ? 1800 : 3600);
  useBrowserLocation().then(useCoordinates).catch(function(e){
    console.warn('weather browser geolocation failed:', e);
    if (!locationSettled) {
      if (!silent) showToast('系统定位不可用，改用网络位置');
      useIpFallback();
    }
  });
}

function changeWeatherCity() {
  var city = window.prompt('输入城市名', homeWeatherRadioState.city || '上海');
  city = String(city || '').trim();
  if (!city) return;
  homeWeatherRadioState.city = city;
  localStorage.setItem(HOME_WEATHER_CITY_KEY, city);
  homeWeatherRadioState.loaded = false;
  loadHomeWeatherRadio(true, { city: city });
}

function locateHomeWeather() { locateWeatherRadio(); }

function changeHomeWeatherCity() { changeWeatherCity(); }

async function waitForHomeDiscoverIdle(timeout) {
  var started = Date.now();
  while (homeDiscoverState.loading && Date.now() - started < (timeout || 2200)) {
    await new Promise(function(resolve){ setTimeout(resolve, 80); });
  }
}

function isPointInsideRectWithPad(x, y, rect, pad) {
  if (!rect || rect.width <= 0 || rect.height <= 0) return false;
  pad = Number(pad) || 0;
  return x >= rect.left - pad && x <= rect.right + pad && y >= rect.top - pad && y <= rect.bottom + pad;
}

function songFromListenRecord(record) {
  if (!record) return null;
  var provider = record.sourceKey || '';
  if (!provider && record.type === 'qq') provider = 'qq';
  if (!provider) provider = record.mid ? 'qq' : 'netease';
  return {
    provider: provider,
    source: provider,
    type: record.type || (provider === 'qq' ? 'qq' : 'song'),
    id: record.id || record.mid || record.key || '',
    mid: record.mid || '',
    songmid: record.mid || '',
    mediaMid: record.mediaMid || '',
    name: record.name || '继续听',
    artist: record.artist || '',
    cover: record.cover || '',
  };
}

function currentQQArtistMid(song) {
  if (!song || songProviderKey(song) !== 'qq') return '';
  if (song.artistMid) return String(song.artistMid);
  if (song.singerMid) return String(song.singerMid);
  if (song.artistId && !/^\d+$/.test(String(song.artistId))) return String(song.artistId);
  var artists = song.artists || [];
  for (var i = 0; i < artists.length; i++) {
    if (artists[i] && artists[i].mid) return String(artists[i].mid);
    if (artists[i] && artists[i].id && !/^\d+$/.test(String(artists[i].id))) return String(artists[i].id);
  }
  return '';
}

function waitForKugouSync(delayMs) {
  return new Promise(function(resolve){ setTimeout(resolve, delayMs); });
}

async function verifySongInPlaylist(pid, songId) {
  songId = String(songId || '');
  if (!pid || !songId) return false;
  for (var attempt = 0; attempt < 3; attempt++) {
    if (attempt) {
      await new Promise(function(resolve){ setTimeout(resolve, attempt === 1 ? 360 : 820); });
    }
    try {
      var detail = await apiJson('/api/playlist/tracks?id=' + encodeURIComponent(pid));
      var tracks = (detail && detail.tracks) || [];
      for (var i = 0; i < tracks.length; i++) {
        if (String(tracks[i].id) === songId) return true;
      }
    } catch (e) {
      console.warn('collect verify failed:', e);
    }
  }
  return false;
}

function __mineradioInitDiscoveryHomeData38() {
  homeNowCoverState = { key: '' };

  setTimeout(bindHomeSleepControls, 0);

  emptyHomeStartEl = document.getElementById('empty-home');

  if (emptyHomeStartEl) {
    emptyHomeStartEl.addEventListener('click', function(e){
      var start = e.target && e.target.closest ? e.target.closest('[data-home-radio-start]') : null;
      if (!start || !emptyHomeStartEl.contains(start)) return;
      e.preventDefault();
      e.stopPropagation();
      startWeatherRadio();
    }, true);
  }

  homeWallpaperPrewarmStarted = false;
}
