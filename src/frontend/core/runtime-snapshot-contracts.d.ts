interface CoverSourceState {
  src?: string;
  kind?: 'url' | 'data';
}

interface LocalBeatAnalysisState {
  song: PlaylistSong | null;
  audioUrl: string;
  mode: 'mr' | 'dj';
  active: boolean;
  token: number;
}

interface Performance {
  memory?: { usedJSHeapSize?: number };
}

declare let currentCoverSource: CoverSourceState | null;
declare let localBeatAnalysis: LocalBeatAnalysisState;
declare let coverTex: THREE.Texture | null;
declare let coverDepthCacheKeys: string[];
declare function beatMapSongKey(song: PlaylistSong): string;
declare function coverDepthCacheId(value: string): string;
