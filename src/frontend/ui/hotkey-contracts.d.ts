type HotkeyScope = 'local' | 'global';

interface HotkeySettings {
  local: Record<string, string>;
  global: Record<string, string>;
}

interface HotkeyCaptureState {
  action: string;
  scope: HotkeyScope;
}

interface GlobalHotkeyStatus {
  ok?: boolean;
  conflict?: { sourceName?: string };
}

interface GlobalHotkeyResult extends GlobalHotkeyStatus {
  action: string;
}

interface MineradioDesktopApi {
  configureGlobalHotkeys?: (
    bindings: Array<{ action: string; accelerator: string }>
  ) => Promise<{ results?: GlobalHotkeyResult[] }>;
  onGlobalHotkey?: (callback: (payload: { action?: string }) => void) => void;
}

declare let hotkeySettings: HotkeySettings;
declare let hotkeyCaptureState: HotkeyCaptureState | null;
declare let hotkeyGlobalStatus: Record<string, GlobalHotkeyStatus>;
declare let globalHotkeyListenerBound: boolean;

declare function togglePlay(): unknown;
declare function prevTrack(): unknown;
declare function nextTrack(): unknown;
declare function toggleLikeCurrent(): unknown;
declare function adjustVolumeByKeyboard(delta: number): unknown;
declare function toggleFullscreen(): unknown;
declare function toggleFx(key: string): unknown;
