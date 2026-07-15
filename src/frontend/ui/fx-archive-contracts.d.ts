type FxArchiveSnapshot = Partial<FxSettings> & {
  visualPresetSchema: string;
  preset: number;
};

interface UserFxArchiveSlot {
  name: string;
  createdAt: number;
  savedAt: number;
  snapshot: FxArchiveSnapshot | null;
}

interface UserFxArchiveExportPayload {
  type: string;
  schema: number;
  exportedAt: number;
  name: string;
  savedAt: number;
  snapshot: FxArchiveSnapshot | null;
}

interface ArchiveDropGrid extends HTMLElement {
  _archiveDropBound?: boolean;
}

declare let hadStoredUserFxArchives: boolean;
declare let userFxArchives: UserFxArchiveSlot[];
declare let userFxArchiveEditing: number;

declare function applyCoverParticleResolution(value: number, options: { reload: boolean }): void;
declare function setParticleLyricsSilently(enabled: boolean): void;
declare function destroyBackCoverLayer(): void;
declare function queueAIDepthForCurrentCover(force: boolean): void;
declare function setCamMode(mode: string): void;
declare function updateFxInputs(): void;
declare function applyDesktopLyricsState(force: boolean): void;
declare function applyWallpaperModeState(force: boolean): void;
declare function formatUserArchiveTime(timestamp: number): string;
