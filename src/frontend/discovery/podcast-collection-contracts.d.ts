interface PodcastCollection {
  key?: string;
  title?: string;
  cover?: string;
  count?: number;
  sub?: string;
  itemType?: string;
}

interface PodcastItemsResponse {
  loggedIn?: boolean;
  itemType?: string;
  items?: PlaylistSong[];
}

declare let myPodcastCollections: PodcastCollection[];
declare let myPodcastItems: Record<string, PlaylistSong[]>;
declare function renderMyPodcastRadioItems(key: string, title: string, items: PlaylistSong[]): void;
