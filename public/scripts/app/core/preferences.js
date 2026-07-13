'use strict';

// Mineradio classic module: core/preferences.
function readBooleanPreference(key, fallback) {
  try {
    var raw = localStorage.getItem(key);
    if (raw == null) return !!fallback;
    return raw === '1';
  } catch (e) {
    return !!fallback;
  }
}

function saveBooleanPreference(key, on) {
  try { localStorage.setItem(key, on ? '1' : '0'); } catch (e) {}
}

function readableInkForHex(hex) {
  var c = hexToRgb(hex || '#00f5d4');
  var lum = (c.r * 0.299 + c.g * 0.587 + c.b * 0.114) / 255;
  return lum > 0.54 ? '#06100f' : '#f8fbff';
}

function __mineradioInitCorePreferences11() {
  try { playlistSourceFilter = localStorage.getItem(PLAYLIST_SOURCE_FILTER_STORE_KEY) || ''; }
  catch (e) { playlistSourceFilter = ''; }
}

function __mineradioInitCorePreferences17() {
  homeWeatherRadioState = { loading: false, loaded: false, city: localStorage.getItem(HOME_WEATHER_CITY_KEY) || '上海', weather: null, radio: null, error: '', updatedAt: 0 };
}
