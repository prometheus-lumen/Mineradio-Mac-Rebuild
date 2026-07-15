function readBackgroundImageFile(file: File | null, globalTarget: boolean): void {
  if (!file || !/^image\//i.test(file.type || '')) {
    showToast('请选择图片文件');
    return;
  }
  var reader = new FileReader();
  reader.onload = function() {
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
      if (!cx) return;
      cx.drawImage(img, 0, 0, w, h);
      var out = '';
      try { out = cv.toDataURL('image/webp', 0.84); } catch (err) {}
      if (!/^data:image\/webp/i.test(out)) {
        try { out = cv.toDataURL('image/jpeg', 0.86); } catch (err2) { out = String(reader.result || ''); }
      }
      if (globalTarget) setGlobalBackgroundMedia({ type: 'image', src: out });
      else setCustomBackgroundImage(out);
    };
    img.onerror = function(){ showToast('背景图片读取失败'); };
    img.src = String(reader.result || '');
  };
  reader.onerror = function(){ showToast('背景图片读取失败'); };
  reader.readAsDataURL(file);
}

function readBackgroundVideoFile(file: File | null, globalTarget: boolean): void {
  if (!file || !/^video\//i.test(file.type || '')) {
    showToast('请选择视频文件');
    return;
  }
  var id = 'bg-video-' + Date.now() + '-' + Math.random().toString(16).slice(2);
  putCustomBackgroundBlob(id, file, { name: file.name || '', mime: file.type || '', size: file.size || 0 }).then(function(){
    var media: BackgroundMedia = { type: 'video', id: id, name: file.name || '', mime: file.type || '', size: file.size || 0 };
    if (globalTarget) setGlobalBackgroundMedia(media);
    else setCustomBackgroundMedia(media);
  }).catch(function(err){
    console.warn('background video store failed:', err);
    if ((file.size || 0) > 18 * 1024 * 1024) {
      showToast('视频较大，当前环境无法保存，请换小一点的视频');
      return;
    }
    var reader = new FileReader();
    reader.onload = function() {
      var media: BackgroundMedia = { type: 'video', src: String(reader.result || ''), name: file.name || '', mime: file.type || '', size: file.size || 0 };
      if (globalTarget) setGlobalBackgroundMedia(media);
      else setCustomBackgroundMedia(media);
    };
    reader.onerror = function(){ showToast('背景视频读取失败'); };
    reader.readAsDataURL(file);
  });
}

function readBackgroundMediaFile(file: File | null, globalTarget = false): void {
  if (!file) return;
  if (/^image\//i.test(file.type || '')) readBackgroundImageFile(file, globalTarget);
  else if (/^video\//i.test(file.type || '')) readBackgroundVideoFile(file, globalTarget);
  else showToast('请选择图片或视频文件');
}
