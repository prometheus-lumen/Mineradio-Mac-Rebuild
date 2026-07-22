function applyCustomBackground(): void {
  var color = normalizeHexColor(fx.backgroundColor || '#000000', '#000000');
  syncCurrentCustomBackgroundMedia();
  var media = effectiveBackgroundMedia();
  var hasVideo = !!(media && media.type === 'video');
  var hasImage = !!(media && media.type === 'image' && media.src);
  var imageAsAlbumParticles = hasImage && fx.backgroundImageAsAlbumParticles === true && Number(fx.preset) === 0;
  var showImage = hasImage && !imageAsAlbumParticles;
  var opacity = clampRange(fx.backgroundOpacity == null ? 1 : Number(fx.backgroundOpacity), 0, 1);
  var customColor = fx.backgroundColorMode === 'custom' || !!fx.backgroundColorCustom;
  var override = hasVideo || showImage || customColor || opacity < 1;
  var root = document.documentElement;
  var layer = document.getElementById('custom-bg');
  var video = document.querySelector<HTMLVideoElement>('#custom-bg-video');
  var mediaKey = hasVideo && media ? (media.id ? ('id:' + media.id) : ('src:' + String(media.src || '').slice(0, 220))) : '';
  root.style.setProperty('--custom-bg-color', color);
  document.body.classList.toggle('custom-background-override', override);
  document.body.classList.toggle('custom-background-flat', override && !hasVideo && !showImage);
  document.body.classList.toggle('custom-background-video', hasVideo);
  if (layer) {
    layer.style.setProperty('--custom-bg-image', showImage && media && media.src ? 'url(' + JSON.stringify(media.src) + ')' : 'none');
    layer.style.setProperty('--custom-bg-image-opacity', showImage ? opacity.toFixed(3) : '0');
    layer.style.setProperty('--custom-bg-video-opacity', hasVideo ? opacity.toFixed(3) : '0');
    layer.style.setProperty('--custom-bg-overlay-opacity', hasVideo || showImage ? '0.18' : '0');
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
  if (!media) return;
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
  var activeVideo = video;
  function setVideoSrc(src: string): void {
    if (token !== customBgApplyToken || !src) return;
    if (customBgObjectUrl && customBgObjectUrl !== src) { URL.revokeObjectURL(customBgObjectUrl); customBgObjectUrl = ''; }
    if (activeVideo.getAttribute('src') !== src) {
      activeVideo.setAttribute('src', src);
      activeVideo.load();
    }
    activeVideo.dataset.mediaKey = mediaKey;
    activeVideo.muted = true;
    activeVideo.loop = true;
    activeVideo.playsInline = true;
    var p = activeVideo.play();
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

function updateCustomBackgroundControls(): void {
  syncCurrentCustomBackgroundMedia();
  applyCustomBackground();
  var color = normalizeHexColor(fx.backgroundColor || '#000000', '#000000');
  var picker = document.querySelector<HTMLInputElement>('#bg-color-picker');
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
  var particleToggle = document.getElementById('t-backgroundImageAsAlbumParticles');
  if (particleToggle) particleToggle.classList.toggle('on', fx.backgroundImageAsAlbumParticles === true);
  applyBackgroundMediaHint();
}
