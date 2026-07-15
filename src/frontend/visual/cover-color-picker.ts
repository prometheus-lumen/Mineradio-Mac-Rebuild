function openCoverColorPicker(target = 'visualTint'): void {
  target = target || 'visualTint';
  var pop = document.getElementById('cover-color-pop');
  var art = document.getElementById('cover-color-art');
  var hint = document.getElementById('cover-color-hint');
  if (pop && pop.classList.contains('show') && coverColorPickerState.target === target) {
    closeCoverColorPicker();
    return;
  }
  var cv = currentCoverPickerCanvas();
  coverColorPickerState.target = target;
  coverColorPickerState.canvas = cv;
  if (!pop || !art) return;
  if (!cv) {
    setVisualTintAuto();
    closeCoverColorPicker();
    showToast('暂无封面，已切换为自动封面取色');
    return;
  }
  var imgSrc = '';
  try { imgSrc = cv.toDataURL('image/jpeg', 0.84); } catch (e) {}
  if (!imgSrc && currentCoverSource && currentCoverSource.src) imgSrc = currentCoverSource.src;
  art.style.backgroundImage = imgSrc ? 'url("' + cssImageUrl(imgSrc) + '")' : '';
  setCoverPickerPreview(fx.visualTintColor || (stageLyrics.coverPalette && stageLyrics.coverPalette.primary) || '#9db8cf');
  renderCoverPickerSwatches();
  if (hint) hint.textContent = '点击专辑封面任意位置取色，或使用下方推荐色。';
  pop.classList.add('show');
  placeFxFloatingPanel(pop, document.getElementById('visual-tint-auto-btn') || document.getElementById('visual-tint-picker') || art, { gap: 12, pad: 14 });
}

function closeCoverColorPicker(): void {
  var pop = document.getElementById('cover-color-pop');
  if (pop) pop.classList.remove('show');
  hideCoverColorLoupe();
}

function moveCoverColorLoupe(e: PointerEvent | MouseEvent): void {
  var cv = coverColorPickerState.canvas || currentCoverPickerCanvas();
  var loupe = document.getElementById('cover-color-loupe');
  var art = document.getElementById('cover-color-art');
  if (!cv || !loupe || !art) return;
  var rect = art.getBoundingClientRect();
  var x = clampRange((e.clientX - rect.left) / Math.max(1, rect.width), 0, 1);
  var y = clampRange((e.clientY - rect.top) / Math.max(1, rect.height), 0, 1);
  var imgSrc = '';
  try { imgSrc = cv.toDataURL('image/jpeg', 0.84); } catch (err) {}
  if (imgSrc) {
    loupe.style.backgroundImage = 'url("' + cssImageUrl(imgSrc) + '")';
    loupe.style.backgroundSize = '680% 680%';
    loupe.style.backgroundPosition = (x * 100).toFixed(2) + '% ' + (y * 100).toFixed(2) + '%';
  }
  loupe.style.left = Math.min(window.innerWidth - 128, e.clientX + 18) + 'px';
  loupe.style.top = Math.min(window.innerHeight - 128, e.clientY + 18) + 'px';
  loupe.classList.add('show');
}

function hideCoverColorLoupe(): void {
  var loupe = document.getElementById('cover-color-loupe');
  if (loupe) loupe.classList.remove('show');
}

function pickCoverColorFromArt(e: MouseEvent): void {
  var cv = coverColorPickerState.canvas || currentCoverPickerCanvas();
  if (!cv || !cv.getContext) return;
  var target = e.currentTarget;
  if (!(target instanceof HTMLElement)) return;
  var rect = target.getBoundingClientRect();
  var x = clampRange((e.clientX - rect.left) / Math.max(1, rect.width), 0, 1);
  var y = clampRange((e.clientY - rect.top) / Math.max(1, rect.height), 0, 1);
  var sx = Math.max(0, Math.min(cv.width - 1, Math.floor(x * cv.width)));
  var sy = Math.max(0, Math.min(cv.height - 1, Math.floor(y * cv.height)));
  try {
    var context = cv.getContext('2d');
    if (!context) return;
    var data = context.getImageData(sx, sy, 1, 1).data;
    applyCoverPickerColor(rgbToHexColor(data[0], data[1], data[2]));
  } catch (err) {
    showToast('封面取色不可用，已保留自动取色');
    setVisualTintAuto();
    closeCoverColorPicker();
  }
}

function applyBackgroundMediaHint() {
  [
    ['bg-image-value', 'bg-media-hint', '支持图片 / 视频上传'],
    ['global-bg-media-value', 'global-bg-media-hint', '全局优先 · 清除后回退']
  ].forEach(function(item){
    var value = document.getElementById(item[0]);
    if (value && !value.dataset.mediaHint) {
      value.dataset.mediaHint = '1';
      value.title = '支持图片 JPG / PNG / WebP 与视频 MP4 / WebM / MOV 上传';
    }
    var label = value && value.closest ? value.closest('.fx-color-row-label') : null;
    if (label && !document.getElementById(item[1])) {
      var hint = document.createElement('small');
      hint.id = item[1];
      hint.textContent = item[2];
      label.appendChild(hint);
    }
  });
}
