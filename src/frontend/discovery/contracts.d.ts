interface PodcastItem extends PlaylistSong {
  type?: string;
  cover?: string;
  djName?: string;
  programCount?: number;
  subCount?: number;
  duration?: number;
  radioName?: string;
  radioId?: string | number;
}

interface PodcastListResponse {
  podcasts?: PodcastItem[];
}

interface PodcastProgramsResponse {
  error?: string;
  radio?: PodcastItem;
  programs?: PodcastItem[];
}

type SearchMode = 'song' | 'netease' | 'qq' | 'podcast';

interface SearchArtistHint {
  titles: string[];
  artists: string[];
}

interface MusicSearchResponse {
  songs?: PlaylistSong[];
}

interface TrackComment {
  user?: { avatar?: string; nickname?: string };
  likedCount?: number;
  time?: number;
  content?: string;
}

interface ArtistDetailResponse {
  error?: string;
  artist?: { name?: string; avatar?: string };
  songs?: PlaylistSong[];
}

interface CommentResponse {
  error?: string;
  comments?: TrackComment[];
}

interface SearchOptions {
  autoPlayFirst?: boolean;
}

declare let podcastResults: PodcastItem[];
declare let podcastPrograms: PodcastItem[];
declare let podcastCurrentRadio: PodcastItem | null;
declare let playlist: PlaylistSong[];
declare let searchRequestSeq: number;
declare let searchMode: SearchMode;
declare let $results: HTMLElement;
declare let $input: HTMLInputElement;
declare let $loading: HTMLElement | null;
declare let searchTimer: number | null;
declare let searchLastResultQuery: string;
declare let searchBoxEl: HTMLElement | null;

interface HTMLInputElement {
  _mineradioComposing?: boolean;
}

declare function searchThumbHtml(cover?: string): string;
declare function animateListItems(
  container: Element,
  selector: string,
  options: ListAnimationOptions
): void;
declare function queueSongNext(song: PlaylistSong): void;
declare function playSearchResult(index: number): void;
declare function coverUrlWithSize(url: string, size: number): string;
declare function animateVisiblePanelList(
  container: Element | null,
  selector: string,
  panel: SmoothScroller | null,
  activeSelector?: string,
  options?: SmoothScrollOptions
): void;
