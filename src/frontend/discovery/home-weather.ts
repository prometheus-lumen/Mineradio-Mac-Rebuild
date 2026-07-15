function homeWeatherRadioUrl(opts: HomeWeatherOptions = {}): string {
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

async function loadHomeWeatherRadio(force = false, opts: HomeWeatherOptions = {}): Promise<HomeWeatherRadioState> {
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
      var data = await apiJson<HomeWeatherApiResponse>(homeWeatherRadioUrl(opts), { timeoutMs: 14000 });
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

function scheduleHomeWeatherLoad(delay = 760, opts: HomeWeatherOptions = {}): void {
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

function prewarmHomeWeatherRadio(): void {
  if (homeWeatherPrewarmStarted) return;
  homeWeatherPrewarmStarted = true;
  locateWeatherRadio({ silent: true, startup: true, prewarm: true });
}

function weatherRadioContext(): Record<string, unknown> {
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

async function startWeatherRadio(opts: HomeWeatherOptions = {}): Promise<void> {
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
  playQueue = radio.songs.map(function(song: PlaylistSong): PlaylistSong {
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

function locateWeatherRadio(opts: HomeWeatherOptions = {}): void {
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
  function useBrowserLocation(): Promise<GeolocationPosition> {
    if (!navigator.geolocation) return Promise.reject(new Error('GEOLOCATION_UNAVAILABLE'));
    return new Promise<GeolocationPosition>(function(resolve, reject): void {
      navigator.geolocation.getCurrentPosition(resolve, reject, {
        enableHighAccuracy: true,
        timeout: 8000,
        maximumAge: 120000
      });
    });
  }
  function useCoordinates(pos: GeolocationPosition): void {
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
  function useIpFallback(): void {
    if (locationSettled || ipFallbackStarted) return;
    ipFallbackStarted = true;
    if (geoFallbackTimer) {
      clearTimeout(geoFallbackTimer);
      geoFallbackTimer = 0;
    }
    apiJson<IpLocationResponse>('/api/weather/ip-location?t=' + Date.now()).then(function(data): void {
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

function changeWeatherCity(): void {
  var city = window.prompt('输入城市名', homeWeatherRadioState.city || '上海');
  city = String(city || '').trim();
  if (!city) return;
  homeWeatherRadioState.city = city;
  localStorage.setItem(HOME_WEATHER_CITY_KEY, city);
  homeWeatherRadioState.loaded = false;
  loadHomeWeatherRadio(true, { city: city });
}

function locateHomeWeather(): void { locateWeatherRadio(); }

function changeHomeWeatherCity(): void { changeWeatherCity(); }

async function waitForHomeDiscoverIdle(timeout = 2200): Promise<void> {
  var started = Date.now();
  while (homeDiscoverState.loading && Date.now() - started < (timeout || 2200)) {
    await new Promise<void>(function(resolve): void { setTimeout(resolve, 80); });
  }
}

