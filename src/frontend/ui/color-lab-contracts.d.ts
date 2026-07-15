interface HsvColor {
  h: number;
  s: number;
  v: number;
}

interface ColorLabPicker extends HTMLInputElement {
  _colorLabBound?: boolean;
  _colorLabOpenedAt?: number;
}

interface ColorLabRow extends HTMLElement {
  _colorLabRowBound?: boolean;
}

interface ColorLabState {
  picker: ColorLabPicker | null;
  id: string;
  h: number;
  s: number;
  v: number;
  dragging: boolean;
}

interface ColorLabPreset {
  name: string;
  color: string;
}

declare let colorLabState: ColorLabState;
declare function setUiAccentColor(color: string, silent?: boolean): void;
declare function setHomeAccentColor(color: string, silent?: boolean): void;
declare function setHomeIconColor(color: string, silent?: boolean): void;
declare function setCustomBackgroundColor(color: string, save: boolean, silent: boolean): void;
declare function setShelfAccentColor(color: string, silent?: boolean): void;
