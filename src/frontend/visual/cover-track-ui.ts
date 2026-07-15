function setAlbumBackground(src: string): void {
  var bg = document.getElementById('album-bg');
  if (!bg) return;
  if (!src) {
    bg.classList.remove('visible');
    bg.style.backgroundImage = '';
    return;
  }
  bg.style.backgroundImage = "url(" + src + ")";
  bg.classList.add('visible');
}

function makeSquareCoverCanvas(img: HTMLImageElement, size = 512, crop?: CoverCropRect): HTMLCanvasElement {
  size = size || 512;
  var cv = document.createElement('canvas');
  cv.width = cv.height = size;
  var cx = cv.getContext('2d');
  if (!cx) return cv;
  cx.clearRect(0, 0, size, size);
  var iw = img.naturalWidth || img.width;
  var ih = img.naturalHeight || img.height;
  if (crop) {
    cx.drawImage(img, crop.sx, crop.sy, crop.sSize, crop.sSize, 0, 0, size, size);
  } else {
    var s = Math.min(iw, ih);
    cx.drawImage(img, (iw - s) / 2, (ih - s) / 2, s, s, 0, 0, size, size);
  }
  return cv;
}

function coverCanvasToDataUrl(cv: HTMLCanvasElement): string {
  try {
    var webp = cv.toDataURL('image/webp', 0.88);
    if (/^data:image\/webp/i.test(webp)) return webp;
  } catch (e) {}
  return cv.toDataURL('image/jpeg', 0.88);
}

function applyCoverDataUrl(dataUrl: string, opts: CoverLoadOptions = {}): void {
  opts = opts || {};
  if (!dataUrl) return;
  var img = new Image();
  img.decoding = 'async';
  img.onload = function() {
    if (!coverApplyStillCurrent(opts)) return;
    var cv = makeSquareCoverCanvas(img, coverTextureSizeForResolution(fx.coverResolution));
    setAlbumBackground(dataUrl);
    applyCoverCanvas(cv, dataUrl, Object.assign({}, opts, { coverSourceKind: 'data', coverSource: dataUrl }));
  };
  img.src = dataUrl;
}

function trackCoverUiSrc(song?: PlaylistSong | null): string {
  song = song || currentCoverSong();
  if (!song) return '';
  var custom = getCustomCoverForSong(song);
  if (custom) return custom;
  return song.cover ? coverUrlWithSize(song.cover, 400) : '';
}

function syncTrackCoverUi(song?: PlaylistSong | null): void {
  var src = trackCoverUiSrc(song);
  var thumb = document.querySelector<HTMLImageElement>('#thumb-cover');
  if (src) {
    if (thumb) thumb.src = src;
    setControlCoverSrc(src);
  } else {
    if (thumb) thumb.removeAttribute('src');
    setControlCoverSrc('');
  }
  shelfManager?.onCoverChange?.(src);
}

function loadVisualCoverForSong(song?: PlaylistSong | null, opts: CoverLoadOptions = {}): void {
  song = song || currentCoverSong();
  var bgImage = activeBackgroundImageForParticles(song || undefined);
  if (bgImage) {
    syncTrackCoverUi(song);
    applyCoverDataUrl(bgImage, Object.assign({}, opts, {
      preserveTrackCoverUi: true,
      coverKey: 'background-image|' + bgImage.slice(0, 180)
    }));
    return;
  }
  var customCover = getCustomCoverForSong(song);
  if (customCover) applyCoverDataUrl(customCover, opts);
  else loadCoverFromUrl(song && song.cover ? coverUrlWithSize(song.cover, 400) : '', opts);
}

function reloadCurrentVisualCoverForBackground(reason?: string): void {
  var song = currentCoverSong();
  if (!song && currentIdx < 0) {
    var bgImage = activeBackgroundImageForParticles(song || undefined);
    if (bgImage) applyCoverDataUrl(bgImage, { coverKey: 'background-image|' + bgImage.slice(0, 180) });
    else loadCoverFromUrl('');
    return;
  }
  loadVisualCoverForSong(song, {
    trackToken: trackSwitchToken,
    deferHeavy: true,
    delay: 280,
    timeout: 1200,
    backgroundMediaRefresh: reason || true
  });
}
