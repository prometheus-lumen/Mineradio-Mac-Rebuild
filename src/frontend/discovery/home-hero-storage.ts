function openHomeHeroMediaDb(): Promise<IDBDatabase> {
  if (homeHeroMediaDbPromise) return homeHeroMediaDbPromise;
  homeHeroMediaDbPromise = new Promise((resolve, reject) => {
    if (!window.indexedDB) {
      reject(new Error('INDEXED_DB_UNAVAILABLE'));
      return;
    }
    const request = window.indexedDB.open(HOME_HERO_MEDIA_DB_NAME, 1);
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(HOME_HERO_MEDIA_STORE)) {
        database.createObjectStore(HOME_HERO_MEDIA_STORE);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('HOME_MEDIA_DB_OPEN_FAILED'));
  });
  return homeHeroMediaDbPromise;
}

async function readHomeHeroMediaRecord(): Promise<HomeHeroMediaRecord | null> {
  const database = await openHomeHeroMediaDb();
  return new Promise((resolve, reject) => {
    const request = database.transaction(HOME_HERO_MEDIA_STORE, 'readonly')
      .objectStore(HOME_HERO_MEDIA_STORE).get(HOME_HERO_MEDIA_KEY);
    request.onsuccess = () => resolve((request.result as HomeHeroMediaRecord | undefined) || null);
    request.onerror = () => reject(request.error || new Error('HOME_MEDIA_READ_FAILED'));
  });
}

async function writeHomeHeroMediaRecord(record: HomeHeroMediaRecord): Promise<boolean> {
  const database = await openHomeHeroMediaDb();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(HOME_HERO_MEDIA_STORE, 'readwrite');
    transaction.objectStore(HOME_HERO_MEDIA_STORE).put(record, HOME_HERO_MEDIA_KEY);
    transaction.oncomplete = () => resolve(true);
    transaction.onerror = () => reject(transaction.error || new Error('HOME_MEDIA_WRITE_FAILED'));
    transaction.onabort = () => reject(transaction.error || new Error('HOME_MEDIA_WRITE_ABORTED'));
  });
}

async function deleteHomeHeroMediaRecord(): Promise<void> {
  const database = await openHomeHeroMediaDb();
  await new Promise<void>((resolve, reject) => {
    const transaction = database.transaction(HOME_HERO_MEDIA_STORE, 'readwrite');
    transaction.objectStore(HOME_HERO_MEDIA_STORE).delete(HOME_HERO_MEDIA_KEY);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error || new Error('HOME_MEDIA_DELETE_FAILED'));
    transaction.onabort = () => reject(transaction.error || new Error('HOME_MEDIA_DELETE_ABORTED'));
  });
}

function homeHeroMediaTypeForFile(file: File): '' | 'image' | 'video' {
  const mime = file.type.toLowerCase();
  const name = file.name.toLowerCase();
  if (/^video\//.test(mime) || /\.(mp4|webm|mov)$/.test(name)) return 'video';
  if (/^image\//.test(mime) || /\.(jpe?g|png|webp)$/.test(name)) return 'image';
  return '';
}

function validateHomeHeroMediaFile(file?: File | null): { ok: boolean; type?: 'image' | 'video'; error?: string } {
  if (!file) return { ok: false, error: '未选择文件' };
  const type = homeHeroMediaTypeForFile(file);
  if (!type) return { ok: false, error: '请选择 JPG、PNG、WebP、MP4、WebM 或 MOV 文件' };
  if (file.size > HOME_HERO_MEDIA_MAX_BYTES) return { ok: false, error: '背景文件不能超过 80MB' };
  return { ok: true, type };
}
