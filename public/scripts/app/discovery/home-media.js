'use strict';

// Mineradio classic module: discovery/home-media.
function normalizeCustomBackgroundImage(value) {
  var src = String(value || '').trim();
  if (!src) return '';
  if (/^data:image\/(png|jpe?g|webp);base64,/i.test(src)) return src;
  if (/^https?:\/\//i.test(src)) return src;
  return '';
}

function normalizeCustomBackgroundMedia(value) {
  if (!value) return null;
  if (typeof value === 'string') {
    var img = normalizeCustomBackgroundImage(value);
    if (img) return { type: 'image', src: img };
    if (/^data:video\/(mp4|webm|quicktime);base64,/i.test(value) || /^https?:\/\//i.test(value)) return { type: 'video', src: String(value) };
    return null;
  }
  if (typeof value !== 'object') return null;
  var type = value.type === 'video' ? 'video' : (value.type === 'image' ? 'image' : '');
  if (type === 'image') {
    var imageSrc = normalizeCustomBackgroundImage(value.src || value.url || '');
    return imageSrc ? { type: 'image', src: imageSrc } : null;
  }
  if (type === 'video') {
    var src = String(value.src || '').trim();
    var id = String(value.id || '').trim();
    if (!id && !/^data:video\/(mp4|webm|quicktime);base64,/i.test(src) && !/^https?:\/\//i.test(src)) return null;
    return {
      type: 'video',
      id: id,
      src: src,
      name: String(value.name || '').slice(0, 120),
      mime: String(value.mime || '').slice(0, 80),
      size: Math.max(0, Number(value.size) || 0)
    };
  }
  return null;
}

function customBackgroundMediaLabel(media) {
  media = normalizeCustomBackgroundMedia(media);
  if (!media) return '未设置';
  return media.type === 'video' ? '视频已设置' : '图片已设置';
}

function openCustomBackgroundDb() {
  return new Promise(function(resolve, reject){
    if (!window.indexedDB) { reject(new Error('indexedDB unavailable')); return; }
    var req = indexedDB.open(CUSTOM_BG_DB_NAME, 1);
    req.onupgradeneeded = function(){
      var db = req.result;
      if (!db.objectStoreNames.contains(CUSTOM_BG_STORE)) db.createObjectStore(CUSTOM_BG_STORE, { keyPath: 'id' });
    };
    req.onsuccess = function(){ resolve(req.result); };
    req.onerror = function(){ reject(req.error || new Error('indexedDB open failed')); };
  });
}

async function putCustomBackgroundBlob(id, blob, meta) {
  var db = await openCustomBackgroundDb();
  return new Promise(function(resolve, reject){
    var tx = db.transaction(CUSTOM_BG_STORE, 'readwrite');
    tx.objectStore(CUSTOM_BG_STORE).put(Object.assign({ id: id, blob: blob, savedAt: Date.now() }, meta || {}));
    tx.oncomplete = function(){ db.close(); resolve(); };
    tx.onerror = function(){ db.close(); reject(tx.error || new Error('indexedDB put failed')); };
  });
}

async function getCustomBackgroundBlob(id) {
  var db = await openCustomBackgroundDb();
  return new Promise(function(resolve, reject){
    var tx = db.transaction(CUSTOM_BG_STORE, 'readonly');
    var req = tx.objectStore(CUSTOM_BG_STORE).get(id);
    req.onsuccess = function(){ resolve(req.result && req.result.blob ? req.result.blob : null); };
    req.onerror = function(){ reject(req.error || new Error('indexedDB get failed')); };
    tx.oncomplete = function(){ db.close(); };
  });
}

function readCustomBackgroundMediaMap() {
  try {
    var raw = localStorage.getItem(CUSTOM_BACKGROUND_MEDIA_STORE_KEY);
    var parsed = raw ? JSON.parse(raw) : {};
    var out = {};
    if (!parsed || typeof parsed !== 'object') return out;
    Object.keys(parsed).forEach(function(key){
      var media = normalizeCustomBackgroundMedia(parsed[key]);
      if (media) out[key] = media;
    });
    return out;
  } catch (e) {
    return {};
  }
}

function saveCustomBackgroundMediaMap() {
  try {
    localStorage.setItem(CUSTOM_BACKGROUND_MEDIA_STORE_KEY, JSON.stringify(customBackgroundMediaMap || {}));
    return true;
  } catch (e) {
    console.warn('custom background media save failed:', e);
    return false;
  }
}

function readGlobalBackgroundMedia() {
  try {
    return normalizeCustomBackgroundMedia(JSON.parse(localStorage.getItem(GLOBAL_BACKGROUND_MEDIA_STORE_KEY) || 'null'));
  } catch (e) {
    return null;
  }
}

function saveGlobalBackgroundMedia() {
  try {
    if (globalBackgroundMedia) localStorage.setItem(GLOBAL_BACKGROUND_MEDIA_STORE_KEY, JSON.stringify(globalBackgroundMedia));
    else localStorage.removeItem(GLOBAL_BACKGROUND_MEDIA_STORE_KEY);
    return true;
  } catch (e) {
    console.warn('global background media save failed:', e);
    return false;
  }
}

function getCustomBackgroundMediaForSong(song) {
  var key = songCustomCoverKey(song);
  return key && customBackgroundMediaMap[key] ? normalizeCustomBackgroundMedia(customBackgroundMediaMap[key]) : null;
}

function syncCurrentCustomBackgroundMedia(song) {
  song = song || currentCoverSong();
  var media = getCustomBackgroundMediaForSong(song);
  if (!media && song && legacyBackgroundMediaForMigration) {
    var key = songCustomCoverKey(song);
    if (key) {
      customBackgroundMediaMap[key] = legacyBackgroundMediaForMigration;
      saveCustomBackgroundMediaMap();
      media = normalizeCustomBackgroundMedia(legacyBackgroundMediaForMigration);
    }
    legacyBackgroundMediaForMigration = null;
  }
  fx.backgroundMedia = media;
  fx.backgroundImage = media && media.type === 'image' ? media.src : '';
  return media;
}

function setCustomBackgroundMediaForSong(song, media) {
  var key = songCustomCoverKey(song);
  if (!key) return false;
  media = normalizeCustomBackgroundMedia(media);
  if (media) customBackgroundMediaMap[key] = media;
  else delete customBackgroundMediaMap[key];
  legacyBackgroundMediaForMigration = null;
  saveCustomBackgroundMediaMap();
  syncCurrentCustomBackgroundMedia(song);
  return true;
}

function setHomeArt(id, url, size) {
  var el = document.getElementById(id);
  if (!el) return;
  var src = url ? coverUrlWithSize(url, size || 260) : '';
  el.style.backgroundImage = src ? 'url("' + cssImageUrl(src) + '")' : '';
  el.classList.toggle('has-cover', !!src);
  el.classList.toggle('home-skeleton', !src && homeDiscoverState.loading);
}

function pickHomeHeroBackground(e) {
  if (e) {
    e.preventDefault();
    e.stopPropagation();
  }
  var input = document.getElementById('home-hero-bg-input');
  if (input) input.click();
}

async function clearHomeHeroBackground(e) {
  if (e) {
    e.preventDefault();
    e.stopPropagation();
  }
  var state = readHomeCardSettings();
  state.heroBg = '';
  state.heroMediaType = '';
  state.heroMediaName = '';
  try { await deleteHomeHeroMediaRecord(); } catch (err) {}
  homeHeroMediaReady = false;
  saveHomeCardSettings();
  applyHomeCardSettings();
  showToast('大卡片背景已清除');
}

function applyCustomBackground() {
  var color = normalizeHexColor(fx.backgroundColor || '#000000', '#000000');
  syncCurrentCustomBackgroundMedia();
  var media = effectiveBackgroundMedia();
  var hasVideo = !!(media && media.type === 'video');
  var opacity = clampRange(fx.backgroundOpacity == null ? 1 : Number(fx.backgroundOpacity), 0, 1);
  var customColor = fx.backgroundColorMode === 'custom' || !!fx.backgroundColorCustom;
  var override = hasVideo || customColor || opacity < 1;
  var root = document.documentElement;
  var layer = document.getElementById('custom-bg');
  var video = document.getElementById('custom-bg-video');
  var mediaKey = hasVideo ? (media.id ? ('id:' + media.id) : ('src:' + String(media.src || '').slice(0, 220))) : '';
  root.style.setProperty('--custom-bg-color', color);
  document.body.classList.toggle('custom-background-override', override);
  document.body.classList.toggle('custom-background-flat', override && !hasVideo);
  document.body.classList.toggle('custom-background-video', hasVideo);
  if (layer) {
    layer.style.setProperty('--custom-bg-image', 'none');
    layer.style.setProperty('--custom-bg-image-opacity', '0');
    layer.style.setProperty('--custom-bg-video-opacity', hasVideo ? opacity.toFixed(3) : '0');
    layer.style.setProperty('--custom-bg-overlay-opacity', hasVideo ? '0.18' : '0');
  }
  var token = ++customBgApplyToken;
  if (!video) return;
  if (!hasVideo) {
    video.pause();
    video.removeAttribute('src');
    delete video.dataset.mediaKey;
    video.load();
    if (customBgObjectUrl) { URL.revokeObjectURL(customBgObjectUrl); customBgObjectUrl = ''; }
    return;
  }
  video.muted = true;
  video.loop = true;
  video.playsInline = true;
  if (mediaKey && video.dataset.mediaKey === mediaKey && video.getAttribute('src')) {
    if (video.paused) {
      var existingPlay = video.play();
      if (existingPlay && existingPlay.catch) existingPlay.catch(function(){});
    }
    return;
  }
  function setVideoSrc(src) {
    if (token !== customBgApplyToken || !src) return;
    if (customBgObjectUrl && customBgObjectUrl !== src) { URL.revokeObjectURL(customBgObjectUrl); customBgObjectUrl = ''; }
    if (video.getAttribute('src') !== src) {
      video.setAttribute('src', src);
      video.load();
    }
    video.dataset.mediaKey = mediaKey;
    video.muted = true;
    video.loop = true;
    video.playsInline = true;
    var p = video.play();
    if (p && p.catch) p.catch(function(){});
  }
  if (media.src) {
    setVideoSrc(media.src);
  } else if (media.id) {
    getCustomBackgroundBlob(media.id).then(function(blob){
      if (token !== customBgApplyToken || !blob) return;
      if (customBgObjectUrl) URL.revokeObjectURL(customBgObjectUrl);
      customBgObjectUrl = URL.createObjectURL(blob);
      setVideoSrc(customBgObjectUrl);
    }).catch(function(err){ console.warn('background video load failed:', err); });
  }
}

function updateCustomBackgroundControls() {
  syncCurrentCustomBackgroundMedia();
  applyCustomBackground();
  var color = normalizeHexColor(fx.backgroundColor || '#000000', '#000000');
  var picker = document.getElementById('bg-color-picker');
  var value = document.getElementById('bg-color-value');
  var imageValue = document.getElementById('bg-image-value');
  var globalMediaValue = document.getElementById('global-bg-media-value');
  var customColor = fx.backgroundColorMode === 'custom' || !!fx.backgroundColorCustom;
  if (picker) picker.value = color;
  if (value) value.textContent = customColor ? color.toUpperCase() : '\u5c01\u9762\u6e10\u53d8';
  if (picker && picker.closest) {
    var row = picker.closest('.lyric-color-row');
    if (row) row.classList.toggle('bg-cover-mode', !customColor);
  }
  setRange('fx-bgopacity', fx.backgroundOpacity == null ? 1 : fx.backgroundOpacity);
  if (imageValue) imageValue.textContent = customBackgroundMediaLabel(fx.backgroundMedia || fx.backgroundImage);
  if (globalMediaValue) globalMediaValue.textContent = customBackgroundMediaLabel(globalBackgroundMedia);
  applyBackgroundMediaHint();
}

function setCustomBackgroundColor(color, silent, customFlag) {
  fx.backgroundColor = normalizeHexColor(color || '#000000', '#000000');
  fx.backgroundColorMode = customFlag === false ? 'cover' : 'custom';
  fx.backgroundColorCustom = customFlag !== false;
  updateCustomBackgroundControls();
  saveLyricLayout();
  if (!silent) showToast('背景颜色: ' + fx.backgroundColor.toUpperCase());
}

function setCustomBackgroundCoverMode(silent) {
  fx.backgroundColorMode = 'cover';
  fx.backgroundColorCustom = false;
  fx.backgroundColor = normalizeHexColor(fx.backgroundColor || fxDefaults.backgroundColor || '#000000', '#000000');
  updateCustomBackgroundControls();
  saveLyricLayout();
  if (!silent) showToast('\u80cc\u666f\u989c\u8272: \u5c01\u9762\u6e10\u53d8');
}

function resetCustomBackgroundColor() {
  setCustomBackgroundCoverMode(false);
}

function setCustomBackgroundOpacity(value, silent) {
  fx.backgroundOpacity = clampRange(Number(value), 0, 1);
  fx.backgroundColorMode = 'custom';
  fx.backgroundColorCustom = true;
  updateCustomBackgroundControls();
  saveLyricLayout();
  if (!silent) showToast('背景透明度: ' + Math.round(fx.backgroundOpacity * 100) + '%');
}

function setCustomBackgroundImage(src, silent) {
  var image = normalizeCustomBackgroundImage(src);
  var song = currentCoverSong();
  if (!song || !setCustomBackgroundMediaForSong(song, image ? { type: 'image', src: image } : null)) {
    if (!silent) showToast('请先播放或选中一首歌曲');
    return;
  }
  updateCustomBackgroundControls();
  reloadCurrentVisualCoverForBackground(image ? 'image' : 'clear');
  saveLyricLayout();
  if (!silent) showToast(image ? '已为当前歌曲应用背景粒子图' : '已清除当前歌曲背景图，恢复专辑粒子');
}

function clearCustomBackgroundImage() {
  setCustomBackgroundImage('');
}

function setCustomBackgroundMedia(media, silent) {
  media = normalizeCustomBackgroundMedia(media);
  var song = currentCoverSong();
  if (!song || !setCustomBackgroundMediaForSong(song, media)) {
    if (!silent) showToast('请先播放或选中一首歌曲');
    return;
  }
  updateCustomBackgroundControls();
  reloadCurrentVisualCoverForBackground(media && media.type === 'image' ? 'image' : 'media-clear');
  saveLyricLayout();
  if (!silent) showToast(media ? (media.type === 'video' ? '已为当前歌曲应用背景视频，粒子使用专辑' : '已为当前歌曲应用背景粒子图') : '已清除当前歌曲背景媒体，恢复专辑粒子');
}

function setGlobalBackgroundMedia(media, silent) {
  globalBackgroundMedia = normalizeCustomBackgroundMedia(media);
  saveGlobalBackgroundMedia();
  updateCustomBackgroundControls();
  reloadCurrentVisualCoverForBackground(globalBackgroundMedia ? 'global-media' : 'global-clear');
  if (!silent) {
    showToast(globalBackgroundMedia
      ? (globalBackgroundMedia.type === 'video' ? '统一背景视频已生效' : '统一背景粒子图已生效')
      : '已清除统一背景媒体，恢复当前歌曲背景媒体');
  }
}

function clearGlobalBackgroundMedia() {
  setGlobalBackgroundMedia(null);
}

function readBackgroundImageFile(file, globalTarget) {
  if (!file || !/^image\//i.test(file.type || '')) {
    showToast('请选择图片文件');
    return;
  }
  var reader = new FileReader();
  reader.onload = function(e) {
    var img = new Image();
    img.onload = function() {
      var maxSide = 2200;
      var iw = img.naturalWidth || img.width || 1;
      var ih = img.naturalHeight || img.height || 1;
      var scale = Math.min(1, maxSide / Math.max(iw, ih));
      var w = Math.max(1, Math.round(iw * scale));
      var h = Math.max(1, Math.round(ih * scale));
      var cv = document.createElement('canvas');
      cv.width = w; cv.height = h;
      var cx = cv.getContext('2d');
      cx.drawImage(img, 0, 0, w, h);
      var out = '';
      try { out = cv.toDataURL('image/webp', 0.84); } catch (err) {}
      if (!/^data:image\/webp/i.test(out)) {
        try { out = cv.toDataURL('image/jpeg', 0.86); } catch (err2) { out = String(e.target.result || ''); }
      }
      if (globalTarget) setGlobalBackgroundMedia({ type: 'image', src: out });
      else setCustomBackgroundImage(out);
    };
    img.onerror = function(){ showToast('背景图片读取失败'); };
    img.src = e.target.result;
  };
  reader.onerror = function(){ showToast('背景图片读取失败'); };
  reader.readAsDataURL(file);
}

function readBackgroundVideoFile(file, globalTarget) {
  if (!file || !/^video\//i.test(file.type || '')) {
    showToast('请选择视频文件');
    return;
  }
  var id = 'bg-video-' + Date.now() + '-' + Math.random().toString(16).slice(2);
  putCustomBackgroundBlob(id, file, { name: file.name || '', mime: file.type || '', size: file.size || 0 }).then(function(){
    var media = { type: 'video', id: id, name: file.name || '', mime: file.type || '', size: file.size || 0 };
    if (globalTarget) setGlobalBackgroundMedia(media);
    else setCustomBackgroundMedia(media);
  }).catch(function(err){
    console.warn('background video store failed:', err);
    if ((file.size || 0) > 18 * 1024 * 1024) {
      showToast('视频较大，当前环境无法保存，请换小一点的视频');
      return;
    }
    var reader = new FileReader();
    reader.onload = function(e){
      var media = { type: 'video', src: String(e.target.result || ''), name: file.name || '', mime: file.type || '', size: file.size || 0 };
      if (globalTarget) setGlobalBackgroundMedia(media);
      else setCustomBackgroundMedia(media);
    };
    reader.onerror = function(){ showToast('背景视频读取失败'); };
    reader.readAsDataURL(file);
  });
}

function readBackgroundMediaFile(file, globalTarget) {
  if (!file) return;
  if (/^image\//i.test(file.type || '')) readBackgroundImageFile(file, globalTarget);
  else if (/^video\//i.test(file.type || '')) readBackgroundVideoFile(file, globalTarget);
  else showToast('请选择图片或视频文件');
}
