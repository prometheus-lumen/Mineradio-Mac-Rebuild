interface PresetTransitionState {
  active: boolean;
  start: number;
  duration: number;
  from: number;
  to: number;
}

interface ImmersiveState {
  shelfMode: string | null;
  shelfPinnedOpen: boolean;
  lyrics: boolean;
  controlsAutoHide: boolean;
  bottomVisible: boolean;
}

interface ParallaxPoint {
  x: number;
  y: number;
}

declare let playbackVisualPreset: number;
declare let startupVisualPreviewActive: boolean;
declare let presetTransition: PresetTransitionState;
declare let controlsAutoHide: boolean;
declare let controlsHovering: boolean;
declare let controlsHideTimer: ReturnType<typeof setTimeout> | null;
declare let controlsHandleDimTimer: ReturnType<typeof setTimeout> | null;
declare let controlsLastMoveAt: number;
declare let controlsShelfSuppressUntil: number;
declare let cursorHideTimer: ReturnType<typeof setTimeout> | null;
declare let fxPanelPinned: boolean;
declare let fxPanelClickHoldUntil: number;
declare let playlistPanelPinned: boolean;
declare let playlistPanelOpenGuardUntil: number;
declare let userCapsuleAutoHide: boolean;
declare let fxFabAutoHide: boolean;
declare let fxFabAutoHideRevealArmed: boolean;
declare let immersiveState: ImmersiveState;
declare let pointerParallax: ParallaxPoint;
declare let pointerTarget: ParallaxPoint;
declare let headParallax: ParallaxPoint & { active: boolean };
declare let headNeutral: ParallaxPoint | null;

declare function readSavedPlaybackVisualPreset(): number;
declare function readSavedLyricLayout(): Partial<FxSettings>;
