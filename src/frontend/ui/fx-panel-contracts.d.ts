type FxPanelTab = 'presets' | 'appearance' | 'lyrics' | 'motion' | 'advanced';

interface Document {
  _colorLabOutsideBound?: boolean;
}

declare let fxPanelTab: FxPanelTab;
declare function pushWallpaperState(force?: boolean): void;
