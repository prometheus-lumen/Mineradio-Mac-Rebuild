interface PlaylistPanelDetailState {
  key: string;
  loading: boolean;
  playlist: AccountPlaylist | null;
  tracks: PlaylistSong[];
  token: number;
  renderLimit: number;
  query?: string;
}

type PlaylistPanelProvider = MusicProvider;
type PlaylistPanelTab = 'queue' | 'playlists' | 'podcasts';

interface PlaylistPanelRenderOptions { animate?: boolean; reset?: boolean; }
interface ListAnimationOptions { x?: number; y?: number; limit?: number; duration?: number; stagger?: number; ease?: string; }
interface SmoothScrollOptions { align?: number; duration?: number; ease?: string; scrollActive?: boolean; }
interface PlaylistApiResponse { playlists?: AccountPlaylist[]; collections?: PodcastItem[]; loggedIn?: boolean; }

interface ComposingInputElement extends HTMLInputElement {
  _mineradioComposing?: boolean;
}

declare let playlistPanelDetailState: PlaylistPanelDetailState;
declare function renderPlaylistPanelDetailState(): void;
declare function collapsePlaylistPanelDetail(): void;
declare function growPlaylistPanelRenderLimit(): void;
declare function growPlaylistPanelDetailRenderLimit(amount?: number): boolean;
declare function scrollPlaylistPanelToTop(): void;
declare function playPlaylistPanelDetail(): void;
declare function openPlaylistPanelDetailArtist(index: number): void;
declare function playPlaylistPanelDetailTrack(index: number): void;
declare function openPlaylistPanelDetail(provider: string, id: string | number, title?: string): Promise<void>;

interface HTMLElement {
  __lastCurrentScrollAt?: number;
}

declare let playbackProgressIdleSynced: boolean;
