function registerGlobalHotkeys(): Promise<unknown> {
  var api = getDesktopWindowApi();
  if (!api || typeof api.configureGlobalHotkeys !== 'function') {
    hotkeyGlobalStatus = {};
    renderHotkeySettings();
    return Promise.resolve();
  }
  var duplicate = hotkeyDuplicateMap('global');
  var bindings: Array<{ action: string; accelerator: string }> = [];
  HOTKEY_ACTIONS.forEach(function(action) {
    var key = hotkeySettings.global[action.key];
    if (!key || duplicate[key] > 1) return;
    var accelerator = hotkeyToAccelerator(key);
    if (accelerator) bindings.push({ action: action.key, accelerator: accelerator });
  });
  return api.configureGlobalHotkeys(bindings).then(function(response) {
    var next: Record<string, GlobalHotkeyStatus> = {};
    (response && response.results || []).forEach(function(item) {
      next[item.action] = item;
    });
    hotkeyGlobalStatus = next;
    renderHotkeySettings();
  }).catch(function() {
    hotkeyGlobalStatus = {};
    renderHotkeySettings();
  });
}

function bindHotkeySettings(): void {
  ensureHotkeySettingsButton();
  ensureHotkeyModal();
  if (!globalHotkeyListenerBound) {
    var api = getDesktopWindowApi();
    if (api && typeof api.onGlobalHotkey === 'function') {
      globalHotkeyListenerBound = true;
      api.onGlobalHotkey(function(payload) {
        if (payload && payload.action) executeHotkeyAction(payload.action, 'global');
      });
    }
  }
  registerGlobalHotkeys();
}
