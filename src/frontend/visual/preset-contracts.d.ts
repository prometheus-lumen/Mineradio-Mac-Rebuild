interface StrobeReferenceProfile {
  x: number;
  y: number;
  duration: number;
  exponent: number;
  edge: number;
  mid: number;
}

interface StrobeFlashState {
  active: boolean;
  startedAt: number;
  duration: number;
  exponent: number;
  peak: number;
  lastTriggerAt: number;
  sequence: number;
}

interface PresetMetadata {
  name: string;
  desc: string;
  descHtml?: string;
}

interface PresetOptions {
  silent?: boolean;
  preserveCamera?: boolean;
  skipTransition?: boolean;
  noSave?: boolean;
  commitPlaybackPreset?: boolean;
}

interface PresetGridElement extends HTMLElement {
  _strobeSettingsResizeBound?: boolean;
}

declare let strobeFlashState: StrobeFlashState;
declare let presetDisplayOrder: number[];
declare let presetMeta: PresetMetadata[];
declare let presetIcons: string[];
declare let camPunch: number;

declare function holdFxPanelAfterClick(durationMs: number): void;
declare function clearSkullPresetResidue(): void;
declare function loadSkullParticleAsset(): void;
declare function syncSkullParticleColors(): void;
declare function normalizeCoverResolution(value: number): number;
declare function triggerRipple(x: number, y: number, strength: number): void;
