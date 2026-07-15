function getHotkeyDefaults(): HotkeySettings {
  var defaults: HotkeySettings = { local: {}, global: {} };
  HOTKEY_ACTIONS.forEach(function(action) {
    defaults.local[action.key] = action.local || '';
    defaults.global[action.key] = action.global || '';
  });
  return defaults;
}

function readHotkeySettings(): HotkeySettings {
  var defaults = getHotkeyDefaults();
  try {
    var raw = JSON.parse(localStorage.getItem(HOTKEY_SETTINGS_STORE_KEY) || '{}') as Partial<HotkeySettings>;
    return {
      local: Object.assign({}, defaults.local, raw.local || {}),
      global: Object.assign({}, defaults.global, raw.global || {})
    };
  } catch (_error) {
    return defaults;
  }
}

function saveHotkeySettings(): void {
  try {
    localStorage.setItem(HOTKEY_SETTINGS_STORE_KEY, JSON.stringify(hotkeySettings || getHotkeyDefaults()));
  } catch (_error) {
    // Storage can be unavailable in privacy-restricted contexts.
  }
}

function hotkeyActionMeta(actionKey: string): HotkeyActionDefinition | null {
  return HOTKEY_ACTIONS.find(function(action) { return action.key === actionKey; }) || null;
}

function isModifierKeyCode(code: string): boolean {
  return /^(ControlLeft|ControlRight|ShiftLeft|ShiftRight|AltLeft|AltRight|MetaLeft|MetaRight)$/i.test(code);
}

function normalizeHotkeyEvent(event: KeyboardEvent): string {
  if (!event || isModifierKeyCode(event.code || '')) return '';
  var modifiers: string[] = [];
  if (event.ctrlKey) modifiers.push('Ctrl');
  if (event.altKey) modifiers.push('Alt');
  if (event.shiftKey) modifiers.push('Shift');
  if (event.metaKey) modifiers.push('Meta');
  var code = event.code || '';
  if (!code && event.key) code = event.key.length === 1 ? 'Key' + event.key.toUpperCase() : event.key;
  return code ? modifiers.concat([code]).join('+') : '';
}

function hotkeyDisplayPart(part: string): string {
  var labels: Record<string, string> = {
    Ctrl: 'Ctrl', Alt: 'Alt', Shift: 'Shift', Meta: 'Win', Space: 'Space',
    ArrowLeft: 'Left', ArrowRight: 'Right', ArrowUp: 'Up', ArrowDown: 'Down'
  };
  if (labels[part]) return labels[part];
  if (/^Key[A-Z]$/.test(part)) return part.slice(3);
  if (/^Digit[0-9]$/.test(part)) return part.slice(5);
  if (/^Numpad[0-9]$/.test(part)) return 'Num' + part.slice(6);
  return part.replace(/^Equal$/, '=').replace(/^Minus$/, '-');
}

function formatHotkey(hotkey: string): string {
  var normalized = String(hotkey || '').trim();
  return normalized ? normalized.split('+').map(hotkeyDisplayPart).join(' + ') : '未设置';
}

function hotkeyToAccelerator(hotkey: string): string {
  var acceleratorLabels: Record<string, string> = {
    Ctrl: 'Control', Alt: 'Alt', Shift: 'Shift', Meta: 'Super', Space: 'Space',
    ArrowLeft: 'Left', ArrowRight: 'Right', ArrowUp: 'Up', ArrowDown: 'Down'
  };
  return String(hotkey || '').split('+').filter(Boolean).map(function(part) {
    if (acceleratorLabels[part]) return acceleratorLabels[part];
    if (/^Key[A-Z]$/.test(part)) return part.slice(3);
    if (/^Digit[0-9]$/.test(part)) return part.slice(5);
    return part;
  }).join('+');
}

function hotkeyDuplicateMap(scope: HotkeyScope): Record<string, number> {
  var duplicates: Record<string, number> = {};
  var source = hotkeySettings && hotkeySettings[scope] || {};
  Object.keys(source).forEach(function(action) {
    var key = String(source[action] || '').trim();
    if (key) duplicates[key] = (duplicates[key] || 0) + 1;
  });
  return duplicates;
}

function executeHotkeyAction(actionKey: string, _source: string): unknown {
  if (actionKey === 'togglePlay') return togglePlay();
  if (actionKey === 'prevTrack') return prevTrack();
  if (actionKey === 'nextTrack') return nextTrack();
  if (actionKey === 'toggleLike') return toggleLikeCurrent();
  if (actionKey === 'volumeUp') return adjustVolumeByKeyboard(0.05);
  if (actionKey === 'volumeDown') return adjustVolumeByKeyboard(-0.05);
  if (actionKey === 'toggleFullscreen') return toggleFullscreen();
  if (actionKey === 'toggleDesktopLyrics') return toggleFx('desktopLyrics');
}

function shouldSuppressDefaultConfiguredHotkey(event: KeyboardEvent): boolean {
  if (!hotkeySettings || !hotkeySettings.local) return false;
  var combo = normalizeHotkeyEvent(event);
  if (!combo) return false;
  return HOTKEY_ACTIONS.some(function(action) {
    return action.local === combo && hotkeySettings.local[action.key] !== combo;
  });
}
