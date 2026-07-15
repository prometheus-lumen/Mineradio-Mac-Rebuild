interface BackgroundMedia {
  type: 'image' | 'video';
  id?: string;
  src?: string;
  name?: string;
  mime?: string;
  size?: number;
}

interface BackgroundBlobMetadata {
  name?: string;
  mime?: string;
  size?: number;
}

declare let customBackgroundMediaMap: Record<string, BackgroundMedia>;
declare let globalBackgroundMedia: BackgroundMedia | null;
declare let legacyBackgroundMediaForMigration: BackgroundMedia | null;
declare let customBgApplyToken: number;
declare let customBgObjectUrl: string;

declare function songCustomCoverKey(song?: PlaylistSong | null): string;
declare function effectiveBackgroundMedia(song?: PlaylistSong | null): BackgroundMedia | null;
declare function reloadCurrentVisualCoverForBackground(reason: string): void;
declare function applyBackgroundMediaHint(): void;
