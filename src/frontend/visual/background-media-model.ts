function normalizeCustomBackgroundImage(value: unknown): string {
  var src = String(value || '').trim();
  if (!src) return '';
  if (/^data:image\/(png|jpe?g|webp);base64,/i.test(src)) return src;
  if (/^https?:\/\//i.test(src)) return src;
  return '';
}

function normalizeCustomBackgroundMedia(value: unknown): BackgroundMedia | null {
  if (!value) return null;
  if (typeof value === 'string') {
    var img = normalizeCustomBackgroundImage(value);
    if (img) return { type: 'image', src: img };
    if (/^data:video\/(mp4|webm|quicktime);base64,/i.test(value) || /^https?:\/\//i.test(value)) return { type: 'video', src: String(value) };
    return null;
  }
  if (typeof value !== 'object') return null;
  var record = value as Record<string, unknown>;
  var type = record.type === 'video' ? 'video' : (record.type === 'image' ? 'image' : '');
  if (type === 'image') {
    var imageSrc = normalizeCustomBackgroundImage(record.src || record.url || '');
    return imageSrc ? { type: 'image', src: imageSrc } : null;
  }
  if (type === 'video') {
    var src = String(record.src || '').trim();
    var id = String(record.id || '').trim();
    if (!id && !/^data:video\/(mp4|webm|quicktime);base64,/i.test(src) && !/^https?:\/\//i.test(src)) return null;
    return {
      type: 'video',
      id: id,
      src: src,
      name: String(record.name || '').slice(0, 120),
      mime: String(record.mime || '').slice(0, 80),
      size: Math.max(0, Number(record.size) || 0)
    };
  }
  return null;
}

function customBackgroundMediaLabel(media: unknown): string {
  var normalized = normalizeCustomBackgroundMedia(media);
  if (!normalized) return '未设置';
  return normalized.type === 'video' ? '视频已设置' : '图片已设置';
}

function openCustomBackgroundDb(): Promise<IDBDatabase> {
  return new Promise<IDBDatabase>(function(resolve, reject) {
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

async function putCustomBackgroundBlob(id: string, blob: Blob, meta?: BackgroundBlobMetadata): Promise<void> {
  var db = await openCustomBackgroundDb();
  return new Promise<void>(function(resolve, reject) {
    var tx = db.transaction(CUSTOM_BG_STORE, 'readwrite');
    tx.objectStore(CUSTOM_BG_STORE).put(Object.assign({ id: id, blob: blob, savedAt: Date.now() }, meta || {}));
    tx.oncomplete = function(){ db.close(); resolve(); };
    tx.onerror = function(){ db.close(); reject(tx.error || new Error('indexedDB put failed')); };
  });
}

async function getCustomBackgroundBlob(id: string): Promise<Blob | null> {
  var db = await openCustomBackgroundDb();
  return new Promise<Blob | null>(function(resolve, reject) {
    var tx = db.transaction(CUSTOM_BG_STORE, 'readonly');
    var req = tx.objectStore(CUSTOM_BG_STORE).get(id);
    req.onsuccess = function(){ resolve(req.result && req.result.blob ? req.result.blob : null); };
    req.onerror = function(){ reject(req.error || new Error('indexedDB get failed')); };
    tx.oncomplete = function(){ db.close(); };
  });
}

function readCustomBackgroundMediaMap(): Record<string, BackgroundMedia> {
  try {
    var raw = localStorage.getItem(CUSTOM_BACKGROUND_MEDIA_STORE_KEY);
    var parsed = raw ? JSON.parse(raw) : {};
    var out: Record<string, BackgroundMedia> = {};
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

function saveCustomBackgroundMediaMap(): boolean {
  try {
    localStorage.setItem(CUSTOM_BACKGROUND_MEDIA_STORE_KEY, JSON.stringify(customBackgroundMediaMap || {}));
    return true;
  } catch (e) {
    console.warn('custom background media save failed:', e);
    return false;
  }
}

function readGlobalBackgroundMedia(): BackgroundMedia | null {
  try {
    return normalizeCustomBackgroundMedia(JSON.parse(localStorage.getItem(GLOBAL_BACKGROUND_MEDIA_STORE_KEY) || 'null'));
  } catch (e) {
    return null;
  }
}

function saveGlobalBackgroundMedia(): boolean {
  try {
    if (globalBackgroundMedia) localStorage.setItem(GLOBAL_BACKGROUND_MEDIA_STORE_KEY, JSON.stringify(globalBackgroundMedia));
    else localStorage.removeItem(GLOBAL_BACKGROUND_MEDIA_STORE_KEY);
    return true;
  } catch (e) {
    console.warn('global background media save failed:', e);
    return false;
  }
}

function getCustomBackgroundMediaForSong(song?: PlaylistSong | null): BackgroundMedia | null {
  var key = songCustomCoverKey(song);
  return key && customBackgroundMediaMap[key] ? normalizeCustomBackgroundMedia(customBackgroundMediaMap[key]) : null;
}

function syncCurrentCustomBackgroundMedia(song?: PlaylistSong | null): BackgroundMedia | null {
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
  fx.backgroundImage = media && media.type === 'image' ? (media.src || '') : '';
  return media;
}

function setCustomBackgroundMediaForSong(song: PlaylistSong, media: unknown): boolean {
  var key = songCustomCoverKey(song);
  if (!key) return false;
  var normalized = normalizeCustomBackgroundMedia(media);
  if (normalized) customBackgroundMediaMap[key] = normalized;
  else delete customBackgroundMediaMap[key];
  legacyBackgroundMediaForMigration = null;
  saveCustomBackgroundMediaMap();
  syncCurrentCustomBackgroundMedia(song);
  return true;
}
