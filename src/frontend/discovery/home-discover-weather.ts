function renderHomeWeatherSummary(loggedOut: boolean): void {
  const weather = homeWeatherRadioState.weather;
  const radio = homeWeatherRadioState.radio;
  const location = weather?.location?.name || homeWeatherRadioState.city || '上海';
  const mood = weather?.mood || (radio ? { title: radio.title, tagline: radio.subtitle } : null);
  const loading = homeWeatherRadioState.loading && !homeWeatherSilentPrewarmActive;
  const title = document.getElementById('home-weather-title');
  const kicker = document.getElementById('home-weather-kicker');
  const subtitle = document.getElementById('home-subtitle');
  const metadata = document.getElementById('home-weather-meta');
  if (title) title.textContent = mood?.title || '今日天气提示';
  if (kicker) kicker.textContent = location ? `Weather Pulse · ${location}` : 'Weather Pulse';
  if (subtitle) {
    if (loading) subtitle.textContent = '正在读取天气，顺便给这个时段找一组合适的歌。';
    else if (weather && mood?.tagline) subtitle.textContent = `${mood.tagline}。天气电台会按当前气温、雨雪、湿度和时间挑歌。`;
    else if (homeWeatherRadioState.error) subtitle.textContent = '天气服务暂时没接上，先保留本地 Home 和搜索入口。';
    else subtitle.textContent = loggedOut
      ? '登录后也会把你的歌单、常听歌手和最近播放放在右侧。'
      : '天气、电台和你的最近播放会一起汇总在这里。';
  }
  if (!metadata) return;
  const values: string[] = [location];
  if (weather) {
    values.push(`${weather.label || ''} · ${Math.round(weather.temperature || 0)}°`);
    values.push(`体感 ${Math.round(weather.apparentTemperature || weather.temperature || 0)}°`);
    if (Number.isFinite(weather.humidity)) values.push(`湿度 ${Math.round(weather.humidity || 0)}%`);
    if (Number.isFinite(weather.windSpeed)) values.push(`风速 ${Math.round(weather.windSpeed || 0)}km/h`);
  } else if (homeWeatherRadioState.error) values.push('天气暂不可用');
  else if (loading) values.push('正在整理天气');
  metadata.innerHTML = values.map((text) => `<span class="home-weather-pill">${escHtml(text)}</span>`).join('');
}
