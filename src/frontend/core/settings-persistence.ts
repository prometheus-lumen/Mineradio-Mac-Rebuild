const SETTINGS_ENDPOINT = '/api/user-settings';
const SETTINGS_SAVE_DELAY_MS = 180;
const SETTINGS_MAX_ITEM_BYTES = 512 * 1024;
const SETTINGS_MAX_TOTAL_BYTES = 1536 * 1024;
const SETTINGS_EXCLUDED_KEYS = new Set([
  'mineradio-local-beatmaps-v1',
  'mineradio-custom-covers',
  'mineradio-custom-background-media-v1',
  'mineradio-global-background-media-v1',
]);

interface PersistedSettingsResponse {
  ok?: boolean;
  settings?: Record<string, string>;
}

let settingsPersistenceStarted = false;
let settingsSaveTimer: ReturnType<typeof setTimeout> | null = null;

function shouldPersistSetting(key: string, value: string): boolean {
  return (key.startsWith('mineradio-') || key === 'apex-player-volume')
    && !SETTINGS_EXCLUDED_KEYS.has(key)
    && value.length <= SETTINGS_MAX_ITEM_BYTES;
}

function capturePersistedSettings(): Record<string, string> {
  const settings: Record<string, string> = {};
  let totalBytes = 0;
  for (let index = 0; index < localStorage.length; index += 1) {
    const key = localStorage.key(index);
    if (!key) continue;
    const value = localStorage.getItem(key);
    if (value == null || !shouldPersistSetting(key, value)) continue;
    const itemBytes = key.length + value.length;
    if (totalBytes + itemBytes > SETTINGS_MAX_TOTAL_BYTES) continue;
    settings[key] = value;
    totalBytes += itemBytes;
  }
  return settings;
}

async function flushPersistedSettings(): Promise<void> {
  if (settingsSaveTimer) {
    clearTimeout(settingsSaveTimer);
    settingsSaveTimer = null;
  }
  try {
    await fetch(SETTINGS_ENDPOINT, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ settings: capturePersistedSettings() }),
    });
  } catch (error) {
    console.warn('[SettingsPersistenceSave]', error);
  }
}

function sendPersistedSettingsOnExit(): void {
  if (settingsSaveTimer) {
    clearTimeout(settingsSaveTimer);
    settingsSaveTimer = null;
  }
  const body = JSON.stringify({ settings: capturePersistedSettings() });
  if (!navigator.sendBeacon || !navigator.sendBeacon(
    SETTINGS_ENDPOINT,
    new Blob([body], { type: 'application/json' }),
  )) {
    void fetch(SETTINGS_ENDPOINT, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body,
      keepalive: body.length < 60 * 1024,
    });
  }
}

function schedulePersistedSettingsSave(): void {
  if (!settingsPersistenceStarted) return;
  if (settingsSaveTimer) clearTimeout(settingsSaveTimer);
  settingsSaveTimer = setTimeout(() => void flushPersistedSettings(), SETTINGS_SAVE_DELAY_MS);
}

export async function restorePersistedUserSettings(): Promise<void> {
  try {
    const response = await fetch(SETTINGS_ENDPOINT, { cache: 'no-store' });
    if (!response.ok) return;
    const payload = await response.json() as PersistedSettingsResponse;
    const settings = payload.settings && typeof payload.settings === 'object' ? payload.settings : {};
    Object.entries(settings).forEach(([key, value]) => {
      if (typeof value !== 'string' || !shouldPersistSetting(key, value)) return;
      if (localStorage.getItem(key) == null) localStorage.setItem(key, value);
    });
  } catch (error) {
    console.warn('[SettingsPersistenceRestore]', error);
  }
}

export function startUserSettingsPersistence(): void {
  if (settingsPersistenceStarted) return;
  settingsPersistenceStarted = true;
  const nativeSetItem = Storage.prototype.setItem;
  const nativeRemoveItem = Storage.prototype.removeItem;
  const nativeClear = Storage.prototype.clear;

  Storage.prototype.setItem = function(key: string, value: string): void {
    nativeSetItem.call(this, key, value);
    if (this === localStorage && shouldPersistSetting(String(key), String(value))) {
      schedulePersistedSettingsSave();
    }
  };
  Storage.prototype.removeItem = function(key: string): void {
    nativeRemoveItem.call(this, key);
    if (this === localStorage && (String(key).startsWith('mineradio-') || key === 'apex-player-volume')) {
      schedulePersistedSettingsSave();
    }
  };
  Storage.prototype.clear = function(): void {
    nativeClear.call(this);
    if (this === localStorage) schedulePersistedSettingsSave();
  };

  window.addEventListener('pagehide', sendPersistedSettingsOnExit, { once: true });
  schedulePersistedSettingsSave();
}
